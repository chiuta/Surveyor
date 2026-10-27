# Jurnal de modificări

Format SemVer (MAJOR.MINOR.PATCH).

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
