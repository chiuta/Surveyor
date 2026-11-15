# Jurnal de modificări

Format SemVer (MAJOR.MINOR.PATCH).

## 2.4.0 — 2026-11-15

- Nou: accesibilitate pe toate ecranele — butonul „Aa” (mărimea textului, contrast ridicat, fără animații, text lizibil, linkuri subliniate, citire cu voce), săgeata „Înapoi sus” și „Sari la conținut”; fereastra se potrivește mereu ecranului; zoom-ul cu lupă și „potrivire ecran” stau acum pe marginea din stânga (fff-kit 1.6.0).

## 2.3.10 — 2026-11-15

- Nou: texturi fractale hiper-detaliate (fff-texturi 1.1.2) — fundalul și suprafețele mari (carduri, panouri, antete, butoane; filele și dialogurile ascunse la încărcare, când se deschid) primesc un material generat local (WebGL2, fără rețea și fără imagini), care se repetă fără cusătură; culorile aplicației rămân ale ei. Se oprește din dialogul „Transparență” sau cu `?notex=1`.

## 2.3.5 — 2026-11-08

- Nou: coloana `Action` (acțiune recomandată: replace or remove / check manually / ignore / none) la sfârșitul exportului CSV, derivată din stare; coloanele existente nu se schimbă.

## 2.3.2 — 2026-11-03

Etapa 7 (audit axe): butonul A/B al motorului comun are acum numele accesibil „A/B — …”, care conține textul vizibil (regula label-content-name-mismatch).

## 2.3.1 — 2026-11-03

Etapa 4: motorul A/B comun («Ce variantă e mai bună?», clasament Elo, rezultat în plicul experiment/ab)

## 2.3.0 — 2026-11-02 (reîmprospătare kit)

- Nou (kit): **Sincronizare între dispozitive** (`FFF.sync`) — în dialogul «Transparență» (clic pe versiune → Copie de siguranță): conectezi două dispozitive direct (WebRTC, cod/QR, fără server și fără cont) și își schimbă datele aplicației; cea mai recentă valoare câștigă, secretele (chei API, parole) nu se trimit, ștergerile nu se propagă. Aplicarea trece prin importul kitului (confirmare, chei permise, rollback).
- Nou (kit): **Istoric local — «mașina timpului»** (`FFF.history`) — instantanee automate ale datelor (IndexedDB, fără secrete), diferență față de starea curentă și restaurare reversibilă; «Șterge datele aplicației» șterge și istoricul.
- Module adăugate: `qr`, `p2p`, `sync`, `history` (+~140 KB). Versiunea aplicației nu se schimbă.

## 2.3.0 — 2026-11-01

- Corectat: adaptorul «Trimite la…» nu mai aruncă eroare când kitul FFF lipsește (gardian pe fiecare bloc; găsit de testul «fără kit» din CI).

Nou: «Trimite la…» (fff-kit, modulul FFF.bridge) — după orice export de fișier (GPX, ICS, CSV, Markdown) apare butonul «Trimite la…» către aplicațiile compatibile, iar importul de fișiere al aplicației primește plicuri .fff.json trimise de ele, cu confirmare înainte de import. Fără rețea, fără telemetrie.

## 2.2.0 — 2026-10-27

Anterior: v2.1.0.

- Nou: textul raportului din „Copiază raportul” este tradus în cele 8 limbi (8 chei noi `rp*`); româna e acum completă. FR/IT/ES/PT/DE/HU sunt traduceri automate, nerevizuite de vorbitori nativi.
- Neschimbat intenționat: numele coloanelor din CSV rămân în engleză (format pentru mașini).
- Teste noi: `tests/report.test.mjs` (31 verificări).

## 2.1.0 — 2026-10-27

Anterior: v2.0.0.

- Nou: butonul „Exportă linkuri externe (.txt)” (8 limbi) pentru linkurile pe care CORS le face „incerte”.
- Nou: `companion/surveyor-companion.mjs`, verificator opțional în Node 18+, fără dependențe, pentru acele linkuri (experimental, testat doar local).
- Documentație: secțiune despre însoțitor și diferența față de Trade-Free-Link-Guardian; linii Stare/Offline.
- (Rezolvat în 2.2.0) textul „Copiază raportul” era în engleză.
