// Teste v2.2.0: „Copiază raportul” tradus în cele 8 limbi (textul raportului, nu doar eticheta butonului).
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require = createRequire(process.env.PW_ROOT || import.meta.url);
const {chromium} = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = 'file://' + path.join(HERE, '..', 'index.html');
let ok = 0, bad = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  ok   ' + n); } else { bad++; console.log('  FAIL ' + n + (x !== undefined ? '  → ' + JSON.stringify(x) : '')); } };
const html = fs.readFileSync(path.join(HERE, '..', 'index.html'), 'utf8');
// paritate: fiecare limbă are cele 8 chei rp*
const keys = ['rpTitle', 'rpCounts', 'rpStates', 'rpCors', 'rpWashed', 'rpNone', 'rpOn', 'rpMore'];
for (const k of keys) check('cheia ' + k + ' în 8 limbi', (html.match(new RegExp('^    "' + k + '": ', 'gm')) || []).length === 8);
const b = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox']});
const exp = {en: 'SURVEYOR REPORT', ro: 'RAPORT SURVEYOR', fr: 'RAPPORT SURVEYOR', it: 'REPORT SURVEYOR', es: 'INFORME SURVEYOR', pt: 'RELATÓRIO SURVEYOR', de: 'SURVEYOR-BERICHT', hu: 'SURVEYOR JELENTÉS'};
for (const [lang, title] of Object.entries(exp)) {
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript((l) => { try { localStorage.setItem('surveyor-lang', l); } catch (e) {} window.__clip = null; Object.defineProperty(navigator, 'clipboard', {value: {writeText: (t) => { window.__clip = t; return Promise.resolve(); }}, configurable: true}); }, lang);
  await p.goto(FILE); await p.waitForTimeout(200);
  await p.click('#tabPaste');
  await p.fill('#htmlPasteInput', '<a href="#nope">x</a><a href="#nope2">y</a>');
  await p.click('#checkPasteBtn');
  await p.waitForFunction(() => !document.getElementById('checkPasteBtn').disabled && !document.getElementById('copyReportBtn').disabled, null, {timeout: 20000}).catch(() => {});
  await p.waitForTimeout(300);
  await p.click('#copyReportBtn');
  await p.waitForTimeout(150);
  const clip = await p.evaluate(() => window.__clip);
  check(lang + ': titlul raportului tradus', typeof clip === 'string' && clip.startsWith(title), clip && clip.slice(0, 40));
  if (lang !== 'en') check(lang + ': fără „washed out”/„pages surveyed” englezești', !/washed out|pages surveyed|WASHED OUT|No washed-out/i.test(clip || ''), clip);
  check(lang + ': fără erori', errs.length === 0, errs);
  await ctx.close();
}
await b.close();
console.log(`\n${ok} reușite, ${bad} eșuate`);
process.exit(bad ? 1 : 0);
