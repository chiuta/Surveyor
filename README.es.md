# Surveyor

[English](README.md) · [Română](README.ro.md) · [Français](README.fr.md) · [Italiano](README.it.md) · **Español** · [Português](README.pt.md) · [Deutsch](README.de.md) · [Magyar](README.hu.md)

**Versión:** 1.2.0 · **Última actualización:** 2026-10-19

Idiomas de la interfaz: **Română, English, Français, Italiano, Español, Português (PT), Deutsch, Magyar**

Verificador de enlaces para sitios web, en un único archivo HTML. La interfaz tiene **8 idiomas** (RO, EN, FR, IT, ES, PT, DE, HU); la documentación (este archivo) está en español.

**En línea:** https://chiuta.github.io/Surveyor/

![Captura de pantalla (ejecución en un sitio de prueba local)](screenshot.png)

## Qué es

Surveyor toma una página de inicio, lee los enlaces `<a href>` (y, opcionalmente, las imágenes `<img src>`), recorre las páginas del mismo origen y comprueba si cada dirección responde. Los resultados pueden filtrarse, copiarse como informe de texto o exportarse en CSV. No tiene servidor, analítica ni cookies, y no guarda nada entre visitas.

**Importante:** no es una herramienta «solo local». Para comprobar un enlace, tu navegador envía una solicitud a ese enlace, incluidos los sitios externos (véase «Privacidad y red»).

## Funciones

Verificadas en el código y en un navegador headless (Chromium/Playwright) sobre un sitio de prueba local:

- Dos modos: **Survey a live URL** (descarga la página de inicio y las páginas del mismo origen) y **Paste page HTML** (lee los enlaces del HTML pegado, con una URL base opcional para los enlaces relativos; respeta `<base href>`).
- Ajustes: número máximo de páginas (1–200, 25 por defecto), profundidad (1–10, 3 por defecto), comprobación de imágenes. Solo se recorren las páginas del mismo origen; los enlaces externos solo se comprueban, nunca se recorren.
- Cuatro estados: **Passable**, **Washed out**, **Uncertain**, **Skipped** (véase «Límites»). Filtros por estado, lista de las páginas que contienen cada enlace.
- Solicitud con tiempo de espera (9 s para las comprobaciones, 15 s para una página); ante 400/403/405/501 a `HEAD` se reintenta con `GET`.
- Botón **Stop**: detiene todas las solicitudes en curso; lo que no se ha comprobado aparece como «skipped / stopped».
- Límites: como máximo 4 comprobaciones en paralelo, con una pausa de 250 ms entre lotes; un máximo de 3000 direcciones distintas por ejecución; se muestran las primeras 500 filas (el CSV contiene todo).
- **Copy report** (texto) y **Export CSV**. En el CSV, las celdas que empiezan por `=`, `+`, `-`, `@`, TAB o CR llevan un apóstrofo como prefijo (evita la ejecución de fórmulas en Excel/Calc); el archivo tiene BOM UTF-8.
- Los enlaces `javascript:`, `data:`, `mailto:`, etc. aparecen como texto, no como enlaces en los que se pueda hacer clic.
- Las anclas dentro de la página (`#seccion`) se comprueban localmente frente a los atributos `id`/`name` del HTML leído o pegado — el único tipo de «enlace roto» detectable de forma fiable también en el modo Paste / `file://`.
- Tema claro a petición (preferencia del sistema) y estilo de impresión.
- Accesibilidad: pestañas con flechas/Inicio/Fin, `aria-selected`, barra de progreso con `role="progressbar"`, foco visible.

## Manual de uso

1. Abre la página (o `index.html` en local).
2. **Survey a live URL**: introduce la dirección `http(s)://…` de tu sitio y pulsa **Start survey**. Lo más fiable es que Surveyor se sirva desde el **mismo origen** que el sitio comprobado; de lo contrario, el sitio debe enviar cabeceras CORS (`Access-Control-Allow-Origin`), incluso en las respuestas de error. Si la página de inicio no puede leerse, verás un mensaje.
3. **Paste page HTML**: pega el código fuente de la página (Ver código fuente), rellena opcionalmente la URL base y pulsa **Check these links**.
4. Sigue el progreso; **Stop** interrumpe la ejecución.
5. Filtra por estado y abre «Referenced on N pages» para ver dónde hay que corregir el enlace.
6. **Copy report** copia un resumen de los enlaces «washed out»; **Export CSV** descarga todos los resultados.

## Privacidad y red

- **Almacenamiento:** ninguno. No usa `localStorage`, `sessionStorage`, IndexedDB ni cookies.
- **Hosts externos cargados por la página:** ninguno (sin CDN, fuentes ni scripts externos). La política CSP de la etiqueta `<meta>` permite el script solo mediante hash y las conexiones `http(s)`.
- **Lo que sí envía:** por cada dirección comprobada, tu navegador envía una solicitud `HEAD` (a veces `GET`) al host de esa dirección. Esto incluye los **sitios externos**: ven tu dirección IP y las cabeceras habituales del navegador (User-Agent). Las solicitudes se hacen con `referrerPolicy: no-referrer` (sin cabecera Referer) y, hacia terceros, sin cookies. Las solicitudes al sitio comprobado pueden incluir la cabecera `Origin` con el origen de la página donde está alojado Surveyor. En el modo «live URL» las páginas recorridas se descargan íntegramente.
- **Lo que NO ocurre:** ninguna llamada al autor ni a un servidor de la aplicación; los informes (Copy/CSV) permanecen en tu navegador hasta que los guardes o los pegues tú.
- **HTML recibido de terceros:** las páginas descargadas o pegadas se analizan con `DOMParser` (documento inerte: no se ejecutan scripts ni se cargan subrecursos). Las direcciones mostradas en los resultados se escapan, y solo las `http(s)` se convierten en enlaces (`rel="noopener noreferrer"`).

### Ética y cortesía

Comprueba solo sitios propios o para los que tengas permiso. Surveyor **no lee `robots.txt`** y no limita las solicitudes por host más allá de los 4 paralelos con pausas; no está concebido para recorrer sitios de terceros. Detén la ejecución si un servidor se ralentiza. Respeta las condiciones de los sitios comprobados.

## Límites y advertencias

- **Los enlaces externos no pueden confirmarse.** El navegador oculta el estado HTTP de las respuestas cross-origin (CORS): un enlace externo que responde, incluso con un 404, aparece como **Uncertain**. Surveyor solo encuentra hosts inalcanzables (DNS, conexión rechazada, tiempo de espera agotado), no páginas muertas en sitios ajenos. Puede resultar tentador leer «Passable» = bueno; para los externos ese estado nunca aparece.
- **«Washed out» en enlaces externos puede ser una falsa alarma:** extensiones/bloqueadores de anuncios, VPN, cortafuegos, contenido mixto (comprobar un sitio `http://` desde una página `https://`) se ven igual que «unreachable». Vuelve a comprobar antes de modificar páginas.
- Si la lectura CORS está bloqueada para un enlace de origen «interno», el resultado baja a «Uncertain» (no «Washed out») cuando el host responde de todos modos.
- Lee solo HTML estático: los enlaces generados por JavaScript (SPA), `srcset`, `<link>`, los scripts, los estilos CSS, los iframes y los atributos `data-src` no se ven. `www.ejemplo.es` y `ejemplo.es` son orígenes distintos (el segundo se trata como externo).
- Las páginas de más de 5 MB (según `Content-Length`) no se recorren; límites: 200 páginas, 3000 direcciones.
- Los resultados son una instantánea; un sitio que responde con lentitud o con limitación de frecuencia puede producir «timed out».
- Proyecto personal, ofrecido «tal cual», sin garantías.

## Ejecución local / sin conexión

Descarga `index.html` y ábrelo en el navegador. La página arranca sin internet, pero la comprobación de enlaces requiere red. Desde `file://` el modo «live URL» solo funciona con sitios que permitan CORS.

## Licencia

MIT — véase el archivo `LICENSE`. Declarada en la cabecera del archivo `index.html` y en el pie de la página.

## Historial / Changelog

- 1.1.0 — 2026-10-14: copia de seguridad y etiquetado de datos (fff-kit).

- 1.0.0 — 2026-10-12: la versión y la fecha de la última actualización se muestran en la aplicación (primera versión numerada).

Ronda 7:
- **Corregido el contador «Pages surveyed»:** contaba cada solicitud de página (incluidos 404, redirecciones y alias como `/b` → `/b/`); ahora cuenta solo las páginas realmente leídas, una sola vez por URL final (en un sitio de prueba con 3 páginas, 1 enlace roto y 2 redirecciones, mostraba 6; ahora 3). El límite «max pages» sigue aplicándose al número de solicitudes.
- **Nota explicativa cuando los resultados son «unreadable»:** si Surveyor se abre desde `file://` (o los enlaces del mismo origen no pueden leerse por CORS), bajo el resumen aparece una nota que dice que esos enlaces son «Uncertain», no rotos, y cómo obtener estados reales (servirlo desde el sitio comprobado / `http://localhost`).
- **Redirecciones visibles:** los enlaces que responden tras una redirección muestran «HTTP 200 · redirects to …» (también en el CSV / Copy report).
- Se recalculó el hash CSP del script. axe-core: 0 infracciones a 1280 y 360 px.
- **Anclas dentro de la página comprobadas:** los enlaces `#seccion` se comparan con los atributos `id`/`name` de la página leída (modos Paste y live); un ancla ausente aparece como «Washed out», de tipo «anchor». `#` y `#top` son siempre válidos; en modo live también se comprueba `otra-pagina#parte` si esa página fue leída. Las anclas generadas por JavaScript no se ven. Los enlaces `#…` sin URL base ya no aparecen como «unparseable».
- Tema claro automático (`prefers-color-scheme: light`; el oscuro sigue siendo el predeterminado) y estilo de impresión (solo se imprime la lista de resultados).
- Se recalculó el hash CSP del script. axe-core: 0 infracciones a 1280 y 360 px, en ambos temas.

Ronda 5:
- Los enlaces solo con fragmento (`#top`, `pagina#seccion` hacia la misma página) ya no se cuentan como rutas (y en la ronda 6 se comprueban como anclas); las variantes con fragmento distinto de la misma URL se unen en una sola ruta.
- Los enlaces del mismo origen que el sitio comprobado, pero cuyas respuestas no pueden leerse desde la página actual (modo Paste o `file://`, sin CORS), aparecen ahora como «Uncertain — same site, status unreadable from this page (CORS/file://)», no como «cross-origin». El límite persiste: un 404 no puede detectarse sin CORS o sin servir Surveyor desde el mismo origen.
- Se recalculó el hash CSP del script. axe-core: 0 infracciones a 1280 y 360 px.

## Autor

Alexio — Alexandru-Ionuț Chiuță, contacto: alexio@trom.tf
