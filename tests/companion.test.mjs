// Teste v2.1.0: butonul „Exportă linkuri externe” și companion/surveyor-companion.mjs (server local de test).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const require = createRequire(process.env.PW_ROOT || import.meta.url);
const {chromium} = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = 'file://' + path.join(HERE, '..', 'index.html');
let ok = 0, bad = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  ok   ' + n); } else { bad++; console.log('  FAIL ' + n + (x !== undefined ? '  → ' + JSON.stringify(x) : '')); } };
const TMP = fs.mkdtempSync(path.join(process.env.FFF_TMP || os.tmpdir(), 'surv21-'));

console.log('— companion');
const C = await import(pathToFileURL(path.join(HERE, '..', 'companion', 'surveyor-companion.mjs')).href);
const srv = http.createServer((q, r) => {
  const u = q.url;
  if (u === '/ok') { r.writeHead(200); r.end('x'); }
  else if (u === '/gone') { r.writeHead(404); r.end(); }
  else if (u === '/perm') { r.writeHead(301, {location: '/ok'}); r.end(); }
  else if (u === '/temp') { r.writeHead(302, {location: '/ok'}); r.end(); }
  else if (u === '/forbidden') { r.writeHead(403); r.end(); }
  else if (u === '/nohead') { if (q.method === 'HEAD') { r.writeHead(405); r.end(); } else { r.writeHead(200); r.end('x'); } }
  else if (u === '/loop') { r.writeHead(302, {location: '/loop'}); r.end(); }
  else if (u === '/slow') { setTimeout(() => { r.writeHead(200); r.end(); }, 1500); }
  else { r.writeHead(500); r.end(); }
});
await new Promise((res) => srv.listen(0, '127.0.0.1', res));
const B = 'http://127.0.0.1:' + srv.address().port;
const o = {timeout: 600, delay: 0};
const st = async (p) => (await C.checkUrl(B + p, o)).status;
check('200 → ok', await st('/ok') === 'ok');
check('404 → broken', await st('/gone') === 'broken');
check('301 → moved', await st('/perm') === 'moved');
check('302 → ok (redirecționare temporară)', await st('/temp') === 'ok');
check('403 → uncertain', await st('/forbidden') === 'uncertain');
check('HEAD 405 → reîncearcă cu GET → ok', await st('/nohead') === 'ok');
check('buclă → broken', await st('/loop') === 'broken');
check('timeout → broken', await st('/slow') === 'broken');
check('mailto → skipped', (await C.checkUrl('mailto:a@b.c', o)).status === 'skipped');
check('port închis → broken', (await C.checkUrl('http://127.0.0.1:1/', o)).status === 'broken');
const items = C.parseInput('# comentariu\n' + B + '/ok\n' + B + '/ok#frag\n\n' + B + '/gone  extra\n');
check('parseInput: comentarii, duplicate și fragmente', items.length === 2, items);
const csvIn = 'URL,Type,Status,Detail,Referenced by\r\n"' + B + '/ok",link,uncertain,x,"http://a | http://b"\r\n' + B + '/gone,link,uncertain,x,http://a\r\n';
const it2 = C.parseInput(csvIn);
check('parseInput: CSV Surveyor', it2.length === 2 && it2[0].referencedBy === 'http://a | http://b', it2);
const res = await C.checkAll(C.parseInput(B + '/ok\n' + B + '/gone\n' + B + '/perm'), {...o, concurrency: 2});
check('checkAll păstrează ordinea', res.map((r) => r.status).join() === 'ok,broken,moved', res.map((r) => r.status));
check('format csv neutralizează formulele', C.format([{url: '=1+1', status: 'ok', code: 200, detail: '', finalUrl: '', redirects: 0, referencedBy: ''}], 'csv').includes("'=1+1"));
check('format json valid', JSON.parse(C.format(res, 'json')).results.length === 3);
check('--only-problems', !C.format(res, 'text', true).includes('[OK]'));
const {spawnSync} = await import('node:child_process');
const f = path.join(TMP, 'l.txt'); fs.writeFileSync(f, B + '/ok\n' + B + '/gone\n');
const cli = spawnSync(process.execPath, [path.join(HERE, '..', 'companion', 'surveyor-companion.mjs'), f, '--timeout', '600', '--delay', '0'], {encoding: 'utf8'});
check('CLI: cod 1 când există broken', cli.status === 1 && /\[BROKEN\]/.test(cli.stdout), [cli.status, cli.stdout]);
check('CLI: cod 2 fără argumente', spawnSync(process.execPath, [path.join(HERE, '..', 'companion', 'surveyor-companion.mjs')]).status === 2);
srv.close();

console.log('— buton în aplicație');
const b = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox']});
const ctx = await b.newContext({acceptDownloads: true});
const S = 'https://site.test';
await ctx.route('**/*', (r) => {
  const u = new URL(r.request().url());
  if (u.protocol === 'file:') return r.continue();
  if (u.host === 'site.test') return r.fulfill({status: 200, contentType: 'text/html', headers: {'access-control-allow-origin': '*'}, body: r.request().method() === 'HEAD' ? '' : '<!doctype html><title>t</title><a href="/a">a</a> <a href="https://ext.example/x#f">e</a> <a href="https://ext.example/x">e2</a> <a href="mailto:a@b.c">m</a>'});
  if (u.host === 'ext.example') return r.fulfill({status: 200, contentType: 'text/html', body: 'ok'});
  r.abort();
});
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) errs.push(m.text()); });
await p.goto(FILE); await p.waitForTimeout(300);
check('butonul e ascuns înainte de rulare', await p.evaluate(() => !document.getElementById('exportExtBtn').offsetParent));
await p.fill('#urlInput', S + '/');
await p.click('#surveyBtn');
await p.waitForFunction(() => !document.getElementById('surveyBtn').disabled && !document.getElementById('mapSection').hidden, null, {timeout: 30000});
await p.waitForTimeout(200);
const [d] = await Promise.all([p.waitForEvent('download'), p.click('#exportExtBtn')]);
const fp = path.join(TMP, d.suggestedFilename()); await d.saveAs(fp);
const txt = fs.readFileSync(fp, 'utf8');
check('nume cu dată', /^surveyor-external-links-\d{4}-\d\d-\d\d\.txt$/.test(d.suggestedFilename()), d.suggestedFilename());
check('doar linkul extern, o singură dată, fără intern/mailto', txt.split('\n').filter((l) => l && l[0] !== '#').join('|') === 'https://ext.example/x', txt);
check('fișierul exportat este citit de companion', C.parseInput(txt).length === 1);
check('fără pageerror/CSP', errs.length === 0, errs);
await b.close();
console.log('\n' + ok + ' ok, ' + bad + ' eșuate');
process.exit(bad ? 1 : 0);
