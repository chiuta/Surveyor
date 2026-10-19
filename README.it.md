# Surveyor

[English](README.md) · [Română](README.ro.md) · [Français](README.fr.md) · **Italiano** · [Español](README.es.md) · [Português](README.pt.md) · [Deutsch](README.de.md) · [Magyar](README.hu.md)

**Versione:** 1.1.0 · **Ultimo aggiornamento:** 2026-10-14

Verificatore di link per siti web, in un unico file HTML. L'interfaccia è in **inglese**; la documentazione (questo file) è in italiano.

**Online:** https://chiuta.github.io/Surveyor/

![Schermata (esecuzione su un sito di prova locale)](screenshot.png)

## Che cos'è

Surveyor prende una pagina iniziale, legge i link `<a href>` (e, facoltativamente, le immagini `<img src>`), percorre le pagine della stessa origine e verifica se ogni indirizzo risponde. I risultati possono essere filtrati, copiati come rapporto di testo o esportati in CSV. Non ha server, analytics né cookie e non salva nulla tra una visita e l'altra.

**Importante:** non è uno strumento «solo locale». Per verificare un link, il tuo browser invia una richiesta a quel link, compresi i siti esterni (vedi «Privacy e rete»).

## Funzioni

Verificate nel codice e in un browser headless (Chromium/Playwright) su un sito di prova locale:

- Due modalità: **Survey a live URL** (scarica la pagina iniziale e le pagine della stessa origine) e **Paste page HTML** (legge i link dall'HTML incollato, con un URL di base facoltativo per i link relativi; rispetta `<base href>`).
- Impostazioni: numero massimo di pagine (1–200, predefinito 25), profondità (1–10, predefinita 3), verifica delle immagini. Vengono percorse solo le pagine della stessa origine; i link esterni sono solo verificati, mai percorsi.
- Quattro stati: **Passable**, **Washed out**, **Uncertain**, **Skipped** (vedi «Limiti»). Filtri per stato, elenco delle pagine che contengono ciascun link.
- Richieste con timeout (9 s per le verifiche, 15 s per una pagina); su 400/403/405/501 a `HEAD` si riprova con `GET`.
- Pulsante **Stop**: interrompe tutte le richieste in corso; ciò che non è stato verificato compare come «skipped / stopped».
- Limiti: al massimo 4 verifiche in parallelo, con una pausa di 250 ms tra i lotti; al massimo 3000 indirizzi distinti per esecuzione; vengono mostrate le prime 500 righe (il CSV contiene tutto).
- **Copy report** (testo) ed **Export CSV**. Nel CSV, le celle che iniziano con `=`, `+`, `-`, `@`, TAB o CR sono precedute da un apostrofo (impedisce l'esecuzione di formule in Excel/Calc); il file ha un BOM UTF-8.
- I link `javascript:`, `data:`, `mailto:` ecc. compaiono come testo, non come link cliccabili.
- Le ancore nella pagina (`#sezione`) vengono verificate localmente rispetto agli attributi `id`/`name` dell'HTML letto o incollato — l'unico tipo di «link rotto» rilevabile in modo affidabile anche in modalità Paste / `file://`.
- Tema chiaro su richiesta (preferenza di sistema) e stile di stampa.
- Accessibilità: schede con frecce/Home/Fine, `aria-selected`, barra di avanzamento con `role="progressbar"`, focus visibile.

## Manuale d'uso

1. Apri la pagina (oppure `index.html` in locale).
2. **Survey a live URL**: inserisci l'indirizzo `http(s)://…` del tuo sito e premi **Start survey**. È più affidabile se Surveyor viene servito dalla **stessa origine** del sito verificato; altrimenti il sito deve inviare intestazioni CORS (`Access-Control-Allow-Origin`), anche sulle risposte di errore. Se la pagina iniziale non può essere letta, vedrai un messaggio.
3. **Paste page HTML**: incolla il sorgente della pagina (Visualizza sorgente), compila facoltativamente l'URL di base e premi **Check these links**.
4. Segui l'avanzamento; **Stop** interrompe l'esecuzione.
5. Filtra per stato e apri «Referenced on N pages» per vedere dove va corretto il link.
6. **Copy report** copia un riepilogo dei link «washed out»; **Export CSV** scarica tutti i risultati.

## Privacy e rete

- **Archiviazione:** nessuna. Non usa `localStorage`, `sessionStorage`, IndexedDB né cookie.
- **Host esterni caricati dalla pagina:** nessuno (niente CDN, font o script esterni). La policy CSP nel tag `<meta>` consente lo script solo tramite hash e le connessioni `http(s)`.
- **Che cosa invia comunque:** per ogni indirizzo verificato, il tuo browser invia una richiesta `HEAD` (a volte `GET`) all'host di quell'indirizzo. Ciò include i **siti esterni**: essi vedono il tuo indirizzo IP e le consuete intestazioni del browser (User-Agent). Le richieste vengono effettuate con `referrerPolicy: no-referrer` (senza intestazione Referer) e, verso terzi, senza cookie. Le richieste verso il sito verificato possono includere l'intestazione `Origin` con l'origine della pagina in cui è ospitato Surveyor. In modalità «live URL» le pagine percorse vengono scaricate per intero.
- **Che cosa NON avviene:** nessuna chiamata all'autore o a un server dell'applicazione; i rapporti (Copy/CSV) restano nel tuo browser finché non li salvi o li incolli tu.
- **HTML ricevuto da terzi:** le pagine scaricate o incollate vengono analizzate con `DOMParser` (documento inerte: nessuno script eseguito, nessuna risorsa secondaria caricata). Gli indirizzi mostrati nei risultati sono sottoposti a escape e solo quelli `http(s)` diventano link (`rel="noopener noreferrer"`).

### Etica e cortesia

Verifica solo siti tuoi o per i quali hai il permesso. Surveyor **non legge `robots.txt`** e non limita le richieste per host oltre ai 4 paralleli con pause; non è progettato per percorrere siti di terzi. Interrompi l'esecuzione se un server rallenta. Rispetta i termini dei siti verificati.

## Limiti e avvertenze

- **I link esterni non possono essere confermati.** Il browser nasconde lo stato HTTP delle risposte cross-origin (CORS): un link esterno che risponde, anche con un 404, compare come **Uncertain**. Surveyor trova soltanto host irraggiungibili (DNS, connessione rifiutata, timeout), non pagine morte su siti altrui. Può essere allettante leggere «Passable» = buono; per i link esterni quello stato non compare mai.
- **«Washed out» sui link esterni può essere un falso allarme:** estensioni/blocchi pubblicitari, VPN, firewall, contenuto misto (verifica di un sito `http://` da una pagina `https://`) appaiono come «unreachable». Ricontrolla prima di modificare le pagine.
- Se la lettura CORS è bloccata per un link su un'origine «interna», il risultato scende a «Uncertain» (non «Washed out») quando l'host risponde comunque.
- Legge solo HTML statico: i link generati da JavaScript (SPA), `srcset`, `<link>`, gli script, gli stili CSS, gli iframe e gli attributi `data-src` non vengono visti. `www.esempio.it` ed `esempio.it` sono origini diverse (la seconda è trattata come esterna).
- Le pagine più grandi di 5 MB (in base a `Content-Length`) non vengono percorse; limiti: 200 pagine, 3000 indirizzi.
- I risultati sono un'istantanea; un sito che risponde lentamente o con limitazione di frequenza può produrre «timed out».
- Progetto personale, offerto «così com'è», senza garanzie.

## Esecuzione locale / offline

Scarica `index.html` e aprilo nel browser. La pagina si avvia senza internet, ma la verifica dei link richiede la rete. Da `file://` la modalità «live URL» funziona solo con siti che consentono CORS.

## Licenza

MIT — vedi il file `LICENSE`. Dichiarata nell'intestazione del file `index.html` e nel piè di pagina.

## Cronologia / Changelog

- 1.1.0 — 2026-10-14: backup ed etichettatura dei dati (fff-kit).

- 1.0.0 — 2026-10-12: la versione e la data dell'ultimo aggiornamento sono mostrate nell'applicazione (prima versione numerata).

Giro 7:
- **Corretto il contatore «Pages surveyed»:** contava ogni richiesta di pagina (compresi 404, reindirizzamenti e alias come `/b` → `/b/`); ora conta solo le pagine effettivamente lette, una sola volta per URL finale (su un sito di prova con 3 pagine, 1 link rotto e 2 reindirizzamenti, mostrava 6; ora 3). Il limite «max pages» resta sul numero di richieste.
- **Nota esplicativa quando i risultati sono «unreadable»:** se Surveyor è aperto da `file://` (o i link della stessa origine non possono essere letti a causa di CORS), sotto il riepilogo compare una nota che dice che quei link sono «Uncertain», non rotti, e come ottenere stati reali (servirlo dal sito verificato / `http://localhost`).
- **Reindirizzamenti visibili:** i link che rispondono dopo un reindirizzamento mostrano «HTTP 200 · redirects to …» (anche nel CSV / Copy report).
- L'hash CSP dello script è stato ricalcolato. axe-core: 0 violazioni a 1280 e 360 px.
- **Ancore nella pagina verificate:** i link `#sezione` vengono confrontati con gli attributi `id`/`name` della pagina letta (modalità Paste e live); un'ancora mancante compare come «Washed out», di tipo «anchor». `#` e `#top` sono sempre validi; in modalità live viene verificato anche `altra-pagina#parte` se quella pagina è stata letta. Le ancore generate da JavaScript non vengono viste. I link `#…` senza URL di base non compaiono più come «unparseable».
- Tema chiaro automatico (`prefers-color-scheme: light`; quello scuro resta il predefinito) e stile di stampa (si stampa solo l'elenco dei risultati).
- L'hash CSP dello script è stato ricalcolato. axe-core: 0 violazioni a 1280 e 360 px, in entrambi i temi.

Giro 5:
- I link con solo frammento (`#top`, `pagina#sezione` verso la stessa pagina) non vengono più contati come percorsi (e nel giro 6 vengono verificati come ancore); le varianti con frammento diverso dello stesso URL vengono unite in un unico percorso.
- I link della stessa origine del sito verificato, ma le cui risposte non possono essere lette dalla pagina corrente (modalità Paste o `file://`, senza CORS), compaiono ora come «Uncertain — same site, status unreadable from this page (CORS/file://)», non come «cross-origin». Il limite resta: un 404 non può essere rilevato senza CORS o senza servire Surveyor dalla stessa origine.
- L'hash CSP dello script è stato ricalcolato. axe-core: 0 violazioni a 1280 e 360 px.

## Autore

Alexio — Alexandru-Ionuț Chiuță, contatto: alexio@trom.tf
