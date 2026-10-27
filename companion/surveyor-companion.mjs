#!/usr/bin/env node
// Surveyor Companion — verifică de pe server (Node 18+) linkurile EXTERNE pe care Surveyor, rulând în browser, nu le poate confirma (CORS).
// Fără dependențe, fără rețea în afara adreselor din fișierul tău, fără telemetrie. Licență MIT.
//   node surveyor-companion.mjs links.txt                 (un URL pe linie; liniile care încep cu # sunt ignorate)
//   node surveyor-companion.mjs surveyor-report.csv       (CSV exportat din Surveyor: coloana „URL”)
//   node surveyor-companion.mjs links.txt --format csv --out rezultate.csv
// Stări: ok · moved (răspunde, dar printr-o redirecționare permanentă: actualizează linkul) · uncertain (401/403/429/999 etc.: probabil blocare de boți/limitare, de verificat manual) · broken (404/410/5xx/DNS/timeout) · skipped (nu e http/https)
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

export const VERSION = '2.1.0';
const HELP = `Surveyor Companion ${VERSION}
Utilizare: node surveyor-companion.mjs <fișier|-> [opțiuni]
  <fișier>           .txt (un URL pe linie) sau CSV exportat din Surveyor (coloana „URL”); „-” = stdin
  --format F         text (implicit) | csv | json
  --out FIȘIER       scrie rezultatul într-un fișier în loc de ecran
  --only-problems    afișează doar ce nu e „ok”
  --timeout MS       limită per cerere (implicit 10000)
  --concurrency N    cereri paralele (implicit 4, maxim 16)
  --delay MS         pauză minimă între cereri către aceeași gazdă (implicit 250)
  --max-redirects N  redirecționări urmărite (implicit 5)
  --user-agent S     User-Agent (implicit: SurveyorCompanion/${VERSION}, care se identifică onest)
Cod de ieșire: 0 = nimic stricat · 1 = cel puțin un link „broken” · 2 = utilizare greșită.
Nu citește robots.txt și nu este făcut pentru parcurgerea site-urilor străine: verifică doar adresele din fișierul tău. Folosește-l pentru site-uri proprii sau cu acordul titularului.`;

export function parseCsv(txt) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) { if (c === '"') { if (txt[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some((x) => x !== '')) rows.push(row); row = []; }
    else cell += c;
  }
  row.push(cell); if (row.some((x) => x !== '')) rows.push(row);
  return rows;
}

/** Întoarce [{url, referencedBy}] din text simplu sau din CSV-ul Surveyor; elimină duplicatele și fragmentele (#…). */
export function parseInput(text) {
  text = text.replace(/^﻿/, '');
  const lines = text.split(/\r?\n/);
  const first = (lines.find((l) => l.trim()) || '');
  const out = [], seen = new Set();
  const add = (u, ref) => { u = String(u || '').trim(); if (!u) return; let key = u; const h = key.indexOf('#'); if (h > 0) key = key.slice(0, h); if (seen.has(key)) return; seen.add(key); out.push({url: key, referencedBy: ref || ''}); };
  if (/^"?url"?\s*,/i.test(first)) {
    const rows = parseCsv(text), head = rows[0].map((h) => h.trim().toLowerCase());
    const iu = head.indexOf('url'), ir = head.findIndex((h) => h.startsWith('referenced'));
    rows.slice(1).forEach((r) => add(r[iu], ir >= 0 ? r[ir] : ''));
  } else lines.forEach((l) => { l = l.trim(); if (l && !l.startsWith('#')) add(l.split(/\s+/)[0]); });
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hostNext = new Map();
async function politeWait(host, delay) {
  const now = Date.now(), at = Math.max(now, hostNext.get(host) || 0);
  hostNext.set(host, at + delay);
  if (at > now) await sleep(at - now);
}
async function once(url, method, o) {
  const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), o.timeout);
  try {
    const headers = {'user-agent': o.userAgent, accept: '*/*'};
    if (method === 'GET') headers.range = 'bytes=0-0';
    const res = await fetch(url, {method, redirect: 'manual', signal: ctl.signal, headers});
    try { if (method === 'GET') await res.body?.cancel(); } catch { /* ignorat */ }
    return res;
  } finally { clearTimeout(tm); }
}
const errCode = (e) => (e && e.cause && (e.cause.code || e.cause.name)) || (e && e.name === 'AbortError' ? 'TIMEOUT' : (e && e.name) || 'ERROR');

/** Verifică o adresă: HEAD, apoi GET pe 400/403/405/501; urmărește manual redirecționările și reține dacă vreuna a fost permanentă. */
export async function checkUrl(input, o = {}) {
  o = {timeout: 10000, delay: 250, maxRedirects: 5, userAgent: `SurveyorCompanion/${VERSION} (link checker; personal use)`, ...o};
  let url = input, permanent = false; const chain = [];
  let u; try { u = new URL(url); } catch { return {url: input, status: 'skipped', code: null, detail: 'adresă neparsabilă', finalUrl: '', redirects: 0}; }
  if (!/^https?:$/.test(u.protocol)) return {url: input, status: 'skipped', code: null, detail: 'nu este http/https', finalUrl: '', redirects: 0};
  for (let hop = 0; hop <= o.maxRedirects; hop++) {
    const host = new URL(url).host;
    let res;
    try {
      await politeWait(host, o.delay);
      res = await once(url, 'HEAD', o);
      if ([400, 403, 405, 501].includes(res.status)) { await politeWait(host, o.delay); res = await once(url, 'GET', o); }
    } catch (e) {
      const c = errCode(e);
      return {url: input, status: 'broken', code: null, detail: c === 'TIMEOUT' ? 'timp depășit' : c === 'ENOTFOUND' ? 'gazdă inexistentă (DNS)' : 'nu s-a putut conecta (' + c + ')', finalUrl: url, redirects: chain.length};
    }
    const s = res.status;
    if (s >= 300 && s < 400 && res.headers.get('location')) {
      let next; try { next = new URL(res.headers.get('location'), url).href; } catch { return {url: input, status: 'broken', code: s, detail: 'Location invalid', finalUrl: url, redirects: chain.length}; }
      if (s === 301 || s === 308) permanent = true;
      chain.push(s + ' → ' + next);
      if (chain.length > o.maxRedirects) return {url: input, status: 'broken', code: s, detail: 'prea multe redirecționări (' + o.maxRedirects + ')', finalUrl: next, redirects: chain.length};
      if (chain.slice(0, -1).some((x) => x.endsWith('→ ' + next)) || next === input) return {url: input, status: 'broken', code: s, detail: 'buclă de redirecționări', finalUrl: next, redirects: chain.length};
      url = next; continue;
    }
    if (s >= 200 && s < 300) return {url: input, status: permanent ? 'moved' : 'ok', code: s, detail: permanent ? 'redirecționare permanentă: actualizează linkul' : (chain.length ? 'redirecționare temporară' : ''), finalUrl: url === input ? '' : url, redirects: chain.length};
    if ([401, 403, 429, 999].includes(s)) return {url: input, status: 'uncertain', code: s, detail: 'poate fi blocare de boți sau limitare de rată: verifică manual', finalUrl: url === input ? '' : url, redirects: chain.length};
    return {url: input, status: 'broken', code: s, detail: 'HTTP ' + s, finalUrl: url === input ? '' : url, redirects: chain.length};
  }
  return {url: input, status: 'broken', code: null, detail: 'prea multe redirecționări', finalUrl: url, redirects: chain.length};
}

export async function checkAll(items, o = {}) {
  const conc = Math.max(1, Math.min(16, o.concurrency || 4)), results = new Array(items.length); let i = 0;
  await Promise.all(Array.from({length: Math.min(conc, items.length)}, async () => {
    while (i < items.length) { const k = i++; results[k] = {...(await checkUrl(items[k].url, o)), referencedBy: items[k].referencedBy || ''}; if (o.onResult) o.onResult(results[k], k, items.length); }
  }));
  return results;
}

const csvCell = (v) => { let s = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
export function format(results, fmt, onlyProblems) {
  const list = onlyProblems ? results.filter((r) => r.status !== 'ok') : results;
  if (fmt === 'json') return JSON.stringify({tool: 'surveyor-companion', version: VERSION, generated: new Date().toISOString(), results: list}, null, 2) + '\n';
  if (fmt === 'csv') return '﻿' + [['URL', 'Status', 'Code', 'Detail', 'FinalURL', 'Redirects', 'ReferencedBy']].concat(list.map((r) => [r.url, r.status, r.code == null ? '' : r.code, r.detail, r.finalUrl, r.redirects, r.referencedBy])).map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
  const c = {}; results.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
  const lines = ['SURVEYOR COMPANION ' + VERSION + ' — ' + results.length + ' adrese: ' + ['ok', 'moved', 'uncertain', 'broken', 'skipped'].map((k) => (c[k] || 0) + ' ' + k).join(' · '), ''];
  list.forEach((r) => { lines.push('[' + r.status.toUpperCase() + '] ' + r.url + (r.code ? ' (HTTP ' + r.code + ')' : '') + (r.detail ? ' — ' + r.detail : '') + (r.finalUrl ? '\n    → ' + r.finalUrl : '') + (r.referencedBy ? '\n    pe: ' + r.referencedBy.split(' | ').slice(0, 5).join(', ') : '')); });
  return lines.join('\n') + '\n';
}

async function main(argv) {
  const o = {format: 'text'}; let file = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], nx = () => argv[++i];
    if (a === '-h' || a === '--help') { console.log(HELP); return 0; }
    else if (a === '--format') o.format = nx();
    else if (a === '--out') o.out = nx();
    else if (a === '--only-problems') o.onlyProblems = true;
    else if (a === '--timeout') o.timeout = Number(nx());
    else if (a === '--concurrency') o.concurrency = Number(nx());
    else if (a === '--delay') o.delay = Number(nx());
    else if (a === '--max-redirects') o.maxRedirects = Number(nx());
    else if (a === '--user-agent') o.userAgent = nx();
    else if (a.startsWith('--')) { console.error('Opțiune necunoscută: ' + a + '\n' + HELP); return 2; }
    else file = a;
  }
  if (!file || !['text', 'csv', 'json'].includes(o.format) || [o.timeout, o.concurrency, o.delay, o.maxRedirects].some((n) => n !== undefined && !(n >= 0))) { console.error(HELP); return 2; }
  const text = file === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(file, 'utf8');
  const items = parseInput(text);
  if (!items.length) { console.error('Nicio adresă de verificat în ' + file); return 2; }
  const results = await checkAll(items, o);
  const out = format(results, o.format, o.onlyProblems);
  if (o.out) fs.writeFileSync(o.out, out); else process.stdout.write(out);
  return results.some((r) => r.status === 'broken') ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(e && e.message || e); process.exit(2); });
