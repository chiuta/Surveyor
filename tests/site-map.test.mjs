// Teste v2.1.0: hartă a site-ului (graf de linkuri interne), adâncime de clic, pagini orfane, comparație între scanări,
// hreflang, text de link, export Sitemap XML.
// [fff-portable] axe-core: FFF_AXE / AXE_PATH, apoi pachetul `axe-core`.
import {createRequire as __fffCR} from 'node:module';
import {readFileSync as __fffRF} from 'node:fs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const __fffAxe = () => process.env.FFF_AXE || process.env.AXE_PATH || (() => { try { return __fffCR(import.meta.url).resolve('axe-core/axe.min.js'); } catch { return undefined; } })();
const APP = JSON.parse(__fffRF(new URL('../app.json', import.meta.url), 'utf8'));
const require = createRequire(process.env.PW_ROOT || import.meta.url);
const {chromium} = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = 'file://' + path.join(HERE, '..', 'index.html');
const AXE = __fffAxe();
let ok = 0, bad = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  ok   ' + n); } else { bad++; console.log('  FAIL ' + n + (x !== undefined ? '  → ' + JSON.stringify(x) : '')); } };
const TMP = fs.mkdtempSync(path.join(process.env.FFF_TMP || os.tmpdir(), 'surv2-'));
const S = 'https://site.test';

// site simulat; V schimbă între rulări
let V = 1;
const page = (title, body, head = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title>${head}</head><body>${body}</body></html>`;
function site(p) {
  const v1 = {
    '/': page('Home', `<a href="/about">About us</a> <a href="/products">Products</a> <a href="/contact?a=1&amp;b=2">Contact</a> <a href="https://ext.example/x">Partner</a> <a href="mailto:a@b.c">Mail</a> <a href="/blog">click here</a> <a href="/team"></a> <a href="/img"><img src="/logo.png" alt="Logo home"></a>`,
      `<link rel="alternate" hreflang="en" href="${S}/"><link rel="alternate" hreflang="ro" href="${S}/ro/"><link rel="alternate" hreflang="xx_YY" href="${S}/zz/">`),
    '/about': page('About', `<a href="/team">Meet the team</a> <a href="/products">Products</a>`, `<link rel="alternate" hreflang="en" href="${S}/">`),
    '/products': page('Products', `<a href="/products/a">Product A</a> <a href="/about">About</a>`),
    '/products/a': page('A', `<a href="/products/a/deep">Details of A</a> <a href="/">Home</a>`),
    '/products/a/deep': page('Deep', `<a href="/products/a/deep/x">Spec sheet</a>`),
    '/products/a/deep/x': page('X', `<p>leaf</p>`),
    '/contact': page('Contact', `<a href="/">Home</a>`),
    '/blog': page('Blog', `<p>blog</p>`),
    '/img': page('Img', `<p>img</p>`)
  };
  if (V === 2) {
    v1['/'] = page('Home', `<a href="/about">About us</a> <a href="/products">Products</a> <a href="/new">What is new</a> <a href="https://ext.example/x">Partner</a> <a href="/team">Team</a>`,
      `<link rel="alternate" hreflang="en" href="${S}/"><link rel="alternate" hreflang="ro" href="${S}/ro/"><link rel="alternate" hreflang="xx_YY" href="${S}/zz/">`);
    v1['/new'] = page('New', `<a href="/">Home</a>`);
    v1['/team'] = page('Team', `<a href="/about">About</a>`);
    delete v1['/contact'];
  }
  return v1[p] ? {status: 200, body: v1[p]} : {status: 404, body: 'nope'};
}
const SITEMAP = `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${S}/</loc></url><url><loc>${S}/about</loc></url><url><loc>${S}/products</loc></url><url><loc>${S}/orphan-one</loc></url><url><loc>${S}/orphan-two</loc></url></urlset>`;
const cors = {'access-control-allow-origin': '*'};
const b = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox']});
async function open(o = {}) {
  const ctx = await b.newContext({viewport: {width: o.w || 1280, height: 900}, acceptDownloads: true, locale: 'en-US', ...(o.bypass ? {bypassCSP: true} : {})});
  const net = [];
  await ctx.route(/^https?:/, (r) => {
    const u = new URL(r.request().url()); net.push(r.request().method() + ' ' + u.href);
    if (u.host === 'site.test') {
      if (u.pathname === '/sitemap.xml') return r.fulfill({status: 200, contentType: 'application/xml', headers: cors, body: SITEMAP});
      if (/\.(png|jpg)$/.test(u.pathname)) return r.fulfill({status: 200, contentType: 'image/png', headers: cors, body: ''});
      const s = site(u.pathname);
      return r.fulfill({status: s.status, contentType: 'text/html', headers: cors, body: r.request().method() === 'HEAD' ? '' : s.body});
    }
    if (u.host === 'ext.example') return r.fulfill({status: 200, contentType: 'text/html', body: 'ok'});
    r.abort();
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('console', (m) => { const t = m.text(); if (/Content Security Policy|Refused to/i.test(t)) errs.push('csp: ' + t); });
  await p.goto(FILE); await p.waitForTimeout(300);
  return {ctx, p, errs, net};
}
async function survey(p, o = {}) {
  await p.fill('#urlInput', S + '/');
  if (o.sitemap !== undefined) {
    if (!(await p.isVisible('#advPanel.open'))) await p.click('#advToggle');
    await p.setChecked('#sitemapInput', !!o.sitemap);
  }
  await p.fill('#maxDepthInput', '6');
  await p.click('#surveyBtn');
  await p.waitForFunction(() => !document.getElementById('surveyBtn').disabled && !document.getElementById('mapSection').hidden, null, {timeout: 40000});
  await p.waitForTimeout(150);
}
const txt = (p, sel) => p.evaluate((s) => document.querySelector(s).innerText, sel);
const dl = async (p, sel) => { const [d] = await Promise.all([p.waitForEvent('download'), p.click(sel)]); const f = path.join(TMP, d.suggestedFilename()); await d.saveAs(f); return {name: d.suggestedFilename(), text: fs.readFileSync(f, 'utf8'), path: f}; };

{
  const {ctx, p, errs, net} = await open();
  console.log('— pornire');
  check('versiune ' + APP.version, await p.evaluate((v) => document.querySelector('#app-version').textContent.includes(v), APP.version));
  check('harta ascunsă înainte de rulare', await p.evaluate(() => document.getElementById('mapSection').hidden));
  check('citirea sitemap.xml e opt-in (bifă dezactivată implicit)', await p.evaluate(() => !document.getElementById('sitemapInput').checked));
  check('fără pageerror/CSP', errs.length === 0, errs);

  console.log('— rulare fără sitemap: nicio cerere către sitemap.xml');
  await survey(p, {sitemap: false});
  check('nu s-a cerut sitemap.xml', !net.some((u) => /sitemap\.xml/.test(u)), net.filter((u) => /sitemap/.test(u)));
  check('mesaj „bifează sitemap” pentru orfane', /Tick “Read sitemap\.xml”/.test(await txt(p, '#orphBox')));
  check('fără statistică de orfane când sitemap nu s-a citit', !/Orphan candidates/.test(await txt(p, '#mapStats')));

  console.log('— rulare cu sitemap: graf, adâncime, orfane');
  await survey(p, {sitemap: true});
  check('s-a cerut sitemap.xml o singură dată', net.filter((u) => /sitemap\.xml/.test(u)).length === 1);
  const st = await txt(p, '#mapStats');
  check('9 pagini citite', /9\s*Pages read/.test(st), st);
  check('14 linkuri interne', /14\s*Internal links/.test(st), st);
  check('cea mai adâncă pagină: 4 clicuri; o pagină la 4+', /4\s*Deepest page/.test(st) && /1\s*Pages 4\+ clicks deep/.test(st), st);
  check('2 posibile pagini orfane', /2\s*Orphan candidates/.test(st), st);
  const kinds = await p.evaluate(() => ({
    all: document.querySelectorAll('#siteGraph .gn').length, broken: document.querySelectorAll('#siteGraph .n-broken').length,
    orphan: document.querySelectorAll('#siteGraph .n-orphan').length, start: document.querySelectorAll('#siteGraph .n-start').length,
    edges: document.querySelectorAll('#siteGraph .ge').length, unread: document.querySelectorAll('#siteGraph .n-unread').length
  }));
  check('12 noduri: 9 citite + /team surpat + 2 orfane', kinds.all === 12, kinds);
  check('un nod surpat (/team, 404), două orfane, un start', kinds.broken === 1 && kinds.orphan === 2 && kinds.start === 1, kinds);
  check('14 muchii desenate = linkuri interne', kinds.edges === 14, kinds);
  const orph = await txt(p, '#orphBox');
  check('orfane: cele două, nu paginile din sitemap legate', /orphan-one/.test(orph) && /orphan-two/.test(orph) && !/site\.test\/about/.test(orph), orph);
  await p.click('#mapSection .map-sub > summary');
  check('lista de pagini are rândul /products/a/deep/x la adâncime 4', await p.evaluate(() => [...document.querySelectorAll('#pgTable tbody tr')].some((tr) => /deep\/x$/.test(tr.cells[0].innerText) && tr.cells[1].innerText === '4')));

  console.log('— interacțiune');
  await p.click('#siteGraph .n-start');
  let info = await txt(p, '#nodeInfo');
  check('start: adâncime 0, 2 intrări, 1 extern', /Click depth: 0/.test(info) && /Linked from 2 pages/.test(info) && /external links/.test(info), info);
  check('nodul selectat marchează muchiile', await p.evaluate(() => document.querySelectorAll('#siteGraph .ge.hi').length >= 5 && document.getElementById('siteGraph').classList.contains('has-sel')));
  await p.focus('#siteGraph .n-broken');
  await p.keyboard.press('Enter');
  info = await txt(p, '#nodeInfo');
  check('Enter pe nodul surpat: stare „Washed out”, adâncime 1', /Washed out/.test(info) && /Click depth: 1/.test(info), info);
  await p.click('#nodeInfo button[data-go]');
  check('din panou se poate sări la un nod învecinat', (await txt(p, '#nodeInfo')) !== info);
  await p.click('#pgTable tbody tr:nth-child(1) button');
  check('din tabel se selectează nodul (start)', /Click depth: 0/.test(await txt(p, '#nodeInfo')));
  const w0 = await p.evaluate(() => +document.getElementById('siteGraph').getAttribute('viewBox').split(' ')[2]);
  await p.click('#zoomInBtn');
  const w1 = await p.evaluate(() => +document.getElementById('siteGraph').getAttribute('viewBox').split(' ')[2]);
  await p.click('#zoomResetBtn');
  const w2 = await p.evaluate(() => +document.getElementById('siteGraph').getAttribute('viewBox').split(' ')[2]);
  check('zoom in micșorează viewBox-ul, reset îl restabilește', w1 < w0 && Math.abs(w2 - w0) < 0.01, [w0, w1, w2]);

  console.log('— hreflang și text de link');
  const hr = await txt(p, '#hrefBox');
  check('cod hreflang invalid semnalat', /invalid language code “xx_YY”/.test(hr), hr);
  check('lipsa auto-referinței semnalată (/about)', /site\.test\/about: no hreflang entry pointing to itself/.test(hr), hr);
  check('lipsa legăturii de întoarcere semnalată', /site\.test\/about: lists https:\/\/site\.test\/ as “en” but that page does not link back/.test(hr), hr);
  check('pagina / cu auto-referință nu e semnalată pentru self', !/site\.test\/: no hreflang entry pointing to itself/.test(hr));
  const an = await txt(p, '#ancBox');
  check('link fără text semnalat (/team)', /link to https:\/\/site\.test\/team has no text/.test(an), an);
  check('text generic „click here” semnalat', /generic text “click here” for the link to https:\/\/site\.test\/blog/.test(an), an);
  check('imaginea cu alt nu e „fără text”', !/img/.test(an) || !/\/img has no text/.test(an));

  console.log('— export Sitemap XML');
  const sm = await dl(p, '#exportSitemapBtn');
  const locs = [...sm.text.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
  check('nume cu dată', /^surveyor-sitemap-\d{4}-\d\d-\d\d\.xml$/.test(sm.name), sm.name);
  check('9 pagini citite în XML, doar originea start', locs.length === 9 && locs.every((u) => u.startsWith(S + '/')), locs);
  check('& din URL e escapat (&amp;)', locs.some((u) => /contact\?a=1&amp;b=2/.test(u)) && !/&b=2/.test(sm.text.replace(/&amp;/g, '')), locs);
  check('XML valid: parsat de browser', await p.evaluate((x) => !new DOMParser().parseFromString(x, 'application/xml').querySelector('parsererror'), sm.text));
  check('nu inventează lastmod/priority', !/lastmod|<priority>|changefreq>\s*[a-z]/.test(sm.text.replace(/<!--[\s\S]*?-->/, '')));
  check('pagini orfane și nepreluate nu apar în XML', !/orphan|\/team/.test(sm.text));

  console.log('— salvare și comparație');
  const sc = await dl(p, '#exportScanBtn');
  const scan = JSON.parse(sc.text);
  check('scanare JSON: app, tip, pagini, linkuri, stări', scan.app === 'surveyor' && scan.kind === 'scan' && scan.pages.length === 9 && scan.links.length >= 11 && Object.keys(scan.status).length > 5, [scan.pages.length, scan.links.length]);
  V = 2;
  await survey(p, {sitemap: true});
  check('„Compară cu rularea anterioară” activ după a doua rulare', await p.evaluate(() => !document.getElementById('cmpPrevBtn').disabled));
  await p.click('#cmpPrevBtn');
  let cmp = await txt(p, '#cmpOut');
  check('pagini apărute: /new și /team', /Pages appeared \(2\)/.test(cmp) && /\+ https:\/\/site\.test\/new/.test(cmp) && /\+ https:\/\/site\.test\/team/.test(cmp), cmp);
  check('pagini dispărute: /contact și /blog și /img', /Pages gone/.test(cmp) && /− https:\/\/site\.test\/contact/.test(cmp), cmp);
  check('link dispărut: / → /contact', /Links gone[\s\S]*− https:\/\/site\.test\/ → https:\/\/site\.test\/contact/.test(cmp), cmp);
  check('link apărut: / → /new', /Links appeared[\s\S]*\+ https:\/\/site\.test\/ → https:\/\/site\.test\/new/.test(cmp), cmp);
  check('stare schimbată /team: Washed out → Passable', /https:\/\/site\.test\/team: Washed out → Passable/.test(cmp), cmp);
  check('linkurile paginilor noi nu sunt „apărute” (doar paginile comune)', !/\+ https:\/\/site\.test\/new → /.test(cmp));
  const csv = await dl(p, '#cmpCsvBtn');
  check('CSV comparație: antet și rânduri', /^﻿Change,Item,Detail/.test(csv.text) && /page appeared,https:\/\/site\.test\/new/.test(csv.text) && /link gone,/.test(csv.text), csv.text.slice(0, 200));
  console.log('— comparație cu fișier salvat');
  await p.setInputFiles('#cmpFileInput', sc.path);
  await p.waitForFunction(() => /saved scan of/.test(document.getElementById('cmpOut').innerText), null, {timeout: 5000});
  const cmp2 = await txt(p, '#cmpOut');
  check('baza = scanarea salvată, aceleași diferențe', /Baseline: saved scan of \d{4}-\d\d-\d\d \(9 pages\)/.test(cmp2) && /Pages appeared \(2\)/.test(cmp2), cmp2.slice(0, 200));
  const badf = path.join(TMP, 'bad.json'); fs.writeFileSync(badf, '{"app":"other"}');
  await p.setInputFiles('#cmpFileInput', badf);
  await p.waitForTimeout(300);
  check('fișier străin refuzat cu mesaj', await p.evaluate(() => [...document.querySelectorAll('.toast')].some((t) => /not a Surveyor scan/.test(t.textContent))));
  check('comparația anterioară rămâne', /Baseline: saved scan/.test(await txt(p, '#cmpOut')));
  const junk = path.join(TMP, 'junk.json'); fs.writeFileSync(junk, 'not json at all');
  await p.setInputFiles('#cmpFileInput', junk); await p.waitForTimeout(300);
  check('JSON invalid nu aruncă erori', errs.length === 0, errs);

  console.log('— rețea');
  check('cereri doar către site.test și ext.example', net.every((u) => /^(GET|HEAD) https:\/\/(site|ext)\.(test|example)\//.test(u)), net.filter((u) => !/^(GET|HEAD) https:\/\/(site|ext)\./.test(u)));
  check('fără pageerror/CSP după toate rulările', errs.length === 0, errs);

  console.log('— cele 8 limbi');
  for (const l of ['ro', 'fr', 'it', 'es', 'pt', 'de', 'hu', 'en']) {
    await p.selectOption('#langSelect', l); await p.waitForTimeout(80);
    const body = await p.evaluate(() => document.getElementById('mapSection').innerText);
    const raw = body.match(/\b(map[A-Z]\w+|node(?:In|Out|Ext|None|Depth)|cmp[A-Z]\w+|href[A-Z]\w+|anc[A-Z]\w+|orph[A-Z]\w+|ns[A-Z]\w+|zoom[A-Z]\w+|th[A-Z]\w+)\b/g);
    const h = await txt(p, '#mapSection summary');
    check(l + ': fără chei brute, titlu tradus, comparația se re-randează', !raw && h.length > 4 && (l === 'en' || h !== 'Site map and checks') && /\(\d+\)/.test(await txt(p, '#cmpOut')), [raw, h]);
  }
  await ctx.close();
}

console.log('— mod „lipește HTML”');
{
  V = 1;
  const {ctx, p, errs} = await open();
  await p.click('#tabPaste');
  await p.fill('#baseUrlInput', S + '/about');
  await p.fill('#htmlPasteInput', '<a href="/team">Team</a> <a href="/">here</a> <a href="/x"></a><link rel="alternate" hreflang="en" href="https://site.test/about">');
  await p.click('#checkPasteBtn');
  await p.waitForFunction(() => !document.getElementById('checkPasteBtn').disabled && !document.getElementById('mapSection').hidden, null, {timeout: 20000});
  const st = await txt(p, '#mapStats');
  check('hartă cu o pagină (cea lipită) și linkurile ei interne', /1\s*Pages read/.test(st) && /Internal links/.test(st), st);
  check('text generic și gol detectate în HTML lipit', /generic text “here”/.test(await txt(p, '#ancBox')) && /has no text/.test(await txt(p, '#ancBox')));
  check('hreflang cu auto-referință corectă: fără probleme', /No hreflang problems in 1 annotated pages/.test(await txt(p, '#hrefBox')), await txt(p, '#hrefBox'));
  check('fără erori', errs.length === 0, errs);
  await ctx.close();
  const c2 = await open();
  await c2.p.click('#tabPaste');
  await c2.p.fill('#htmlPasteInput', '<a href="https://ext.example/a">Out</a>');
  await c2.p.click('#checkPasteBtn');
  await c2.p.waitForFunction(() => !document.getElementById('checkPasteBtn').disabled, null, {timeout: 20000});
  check('fără URL de bază: harta rămâne ascunsă', await c2.p.evaluate(() => document.getElementById('mapSection').hidden));
  await c2.ctx.close();
}

console.log('— accesibilitate și mobil');
if (AXE) {
  V = 1;
  const {ctx, p} = await open({bypass: true});
  await survey(p, {sitemap: true});
  await p.click('#siteGraph .n-start');
  await p.waitForTimeout(600);
  await p.addScriptTag({path: AXE});
  const v = await p.evaluate(async () => (await axe.run(document, {runOnly: ['wcag2a', 'wcag2aa']})).violations.flatMap((x) => x.nodes.map((n) => x.id + ' ' + n.target.join(' '))));
  check('axe fără încălcări cu harta deschisă', v.length === 0, v);
  await ctx.close();
  const m = await open({w: 360});
  await survey(m.p, {sitemap: true});
  check('fără defilare orizontală la 360px', await m.p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), await m.p.evaluate(() => document.documentElement.scrollWidth));
  await m.ctx.close();
} else check('axe lipsă (omis)', true);

await b.close();
console.log('\n' + ok + ' ok, ' + bad + ' eșuate');
process.exit(bad ? 1 : 0);
