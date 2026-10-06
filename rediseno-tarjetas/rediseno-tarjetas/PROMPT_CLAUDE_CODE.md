# Prompt para Claude Code — Rediseño del Módulo de Tarjetas

> Copia todo lo que está debajo de la línea en Claude Code, abierto en tu copia local del repositorio `WilGomezGit/tarjeta_corporativa`. Antes, copia en la raíz del repositorio la carpeta `rediseno-tarjetas/` de este paquete (o al menos `css/propuesta.css`, `index.html` y `Consumos/procesar_consumos.html`), porque son la referencia visual.

---

Vamos a rediseñar la interfaz de este repositorio (herramientas web estáticas del Módulo de Tarjetas de la Tesorería de Comfacauca: HTML + CSS + JavaScript plano, sin build). El objetivo es pasar de un estilo llamativo (foto de fondo, degradados, botones píldora, títulos en mayúsculas) a una **herramienta financiera sobria y profesional**, **sin cambiar ninguna lógica de procesamiento**.

## Referencia

- `rediseno-tarjetas/css/propuesta.css`: la hoja de estilos final (tokens en `:root` + componentes). Úsala tal cual como base.
- `rediseno-tarjetas/index.html`: maqueta aprobada del inicio.
- `rediseno-tarjetas/Consumos/procesar_consumos.html`: maqueta aprobada de una página de módulo. Su `<script>` final es SOLO de demostración: no lo copies.

## Reglas estrictas

1. **No toques la lógica.** No modifiques `Consumos/scripts.js`, `Consumos/comercios.js`, `Fibatch/scripts.js`, `SaldosPagina/scripts_bolsillos.js`, `ValidarArchivoPago/scripts.js`, `ValidarArchivosPersonalizacion/script.js` ni `Conciliacion/js/*.js`, salvo para cambiar **nombres de clases CSS** en el HTML que esos scripts generan (por ejemplo `summary-row`, `badge-success`, `toast-error`), y solo si hace falta para el nuevo estilo. Documenta cada cambio de ese tipo.
2. **Conserva todos los `id` y manejadores** que usan los scripts. Por módulo:
   - Consumos: `dropZone`, `fileInput`, `dataBody`, `summaryContainer`; `.drop-title`, `.drop-subtitle`; `processFile()`, `clearTable()`, `exportToCSV()`, `exportToExcel()`, `scrollToTop()`, `scrollToBottom()`.
   - Fibatch: `dropZone`, `fileInput`, `dataBody`, `totalValue`, `totalProcessedValue`; mismas funciones que Consumos.
   - SaldosPagina: `dropZone`, `fileInput`, `dataBody`, `loadingOverlay`; `processFile()`, `clearTable()`, `exportToFOSFEC()`, `exportToSUBFLIAR()`, `exportToVerification()`.
   - ValidarArchivoPago: `dropZone`, `fileInput`, `dataBody`, `summaryContainer`, `totalValue`, `duplicatesContainer`, `lastLineContainer`; mismas funciones que Consumos.
   - ValidarArchivosPersonalizacion: `dropZone`, `fileInput`, `output`, `processButton`, `clearButton`.
   - Conciliacion: `inputConsumos`, `inputContabilidad`, `inputTesoreria`, `btnProcesar`, `btnReiniciar`, `btnDescargar`, `buscarDocumento`, `buscarNombre`, `buscarTarjeta`, `resumenSection`, `resumen*` (todos), `resultadosSection`, `resultadosCount`, `tablaResultados` (con `th[data-sort]`), `tablaResultadosBody`, `inconsistenciasSection`, `tablaInconsistenciasBody`, `overlayProcesando`, `toastContainer`.
   Antes de editar cada página, busca con grep todos los `getElementById`, `querySelector` y `onclick` de su JS y verifica que siguen existiendo después.
3. **La zona de arrastrar y soltar debe seguir funcionando**: el script inline de cada página agrega/quita la clase `dragover`; en el nuevo CSS el estado se llama `.is-dragover`. Cambia el nombre de la clase en ese script inline o agrega `.dropzone.dragover` como alias en el CSS (prefiero el alias para no tocar JS).
4. Mantén el idioma: todo el texto en español (Colombia).

## Qué hacer

1. **CSS compartido.** Crea `css/app.css` en la raíz copiando `rediseno-tarjetas/css/propuesta.css`. Agrega al final una sección `/* Compatibilidad */` con alias para las clases que generan los scripts y que no quieras renombrar (por ejemplo `.summary-row`, `.summary-label`, `.summary-value`, `.styled-table`, `.badge-success/-danger/-warning/-secondary`, `.toast-info/-success/-error/-warning`, `.estado-correcto`, `.estado-incorrecto`, `.highlight`, `.success-message`, `.dropzone.dragover`, `.drop-zone`), estilizadas con los tokens del nuevo sistema.
2. **Marco común.** Cada página usa la estructura `.app > .sidebar + .main > .topbar + .content + .footer` de las maquetas. La barra lateral es idéntica en todas (rutas relativas: `css/…` e `imagen/…` desde la raíz, `../css/…` e `../imagen/…` desde cada carpeta de módulo, incluida `Conciliacion/`). Marca el enlace activo con `is-active` y `aria-current="page"`. Elimina el botón "Inicio" (`home-button`) y los botones flotantes "Subir / Ir al Final" (la barra lateral es fija y la tabla tiene encabezado fijo); si `scrollToTop`/`scrollToBottom` quedan sin uso, déjalas en el JS.
3. **Inicio (`index.html`).** Reemplázalo por la maqueta `rediseno-tarjetas/index.html` ajustando rutas a `css/app.css`.
4. **Páginas de módulo**, una por una, en este orden: Consumos → Fibatch → ValidarArchivoPago → SaldosPagina → ValidarArchivosPersonalizacion → Conciliacion. Para cada una:
   - Encabezado `.page-head` con título en tipo oración (no mayúsculas), una línea que explique qué hace, y las acciones a la derecha: limpiar = `btn btn--danger-ghost`, exportar = `btn btn--secondary`, procesar = `btn btn--primary` (una sola acción primaria por página).
   - Indicador de pasos `.steps` (Cargar archivo → Revisar → Exportar) cuando aplique.
   - Zona de carga `.dropzone` con los mismos `id`.
   - Resúmenes como `.kpis` / `.kpi` con montos en `.kpi__value` (IBM Plex Mono, cifras tabulares).
   - Tablas como `.card.table-card` > `.table-scroll` > `table.table`; columnas de dinero con clase `num` (alineadas a la derecha); estados con `.badge--ok/--warn/--err` + ícono + palabra.
   - Mensajes de validación como `.alert--ok/--err/--warn/--info`.
   - Overlays de carga como `.overlay > .overlay__box > .spinner` (manteniendo el `id` y el atributo `hidden` que usa el JS).
   - Toasts en `.toasts` con `.toast--ok/--err/--warn/--info`.
   - Quita el `<link>` a la hoja de estilos vieja del módulo y enlaza `../css/app.css`. Cambia las fuentes a IBM Plex Sans + IBM Plex Mono y actualiza Font Awesome a clases de la v6 (`fa-solid …`).
5. **Limpieza.** Cuando todas las páginas usen `css/app.css`, borra las hojas viejas (`styles.css` de la raíz y de cada módulo, `Conciliacion/css/styles.css`) y deja `imagen/fondo.jpg` sin referenciar (no la borres sin preguntarme).

## Sistema de diseño (resumen)

- Colores: barra lateral `#1e3a8a`; primario `#2563eb` (hover `#1d4ed8`); acento `#0e7490`; fondo `#f1f5f9`; superficie `#fff`; borde `#e2e8f0`; texto `#0f172a` / `#334155` / `#475569`. Estados: éxito `#047857` sobre `#ecfdf5`, error `#b91c1c` sobre `#fef2f2`, advertencia `#b45309` sobre `#fffbeb`, info `#1d4ed8` sobre `#eff6ff`. Todo texto ≥ 4.5:1.
- Tipografía: IBM Plex Sans 400/500/600 para la interfaz; IBM Plex Mono 500 con `tabular-nums` para montos, tarjetas, fechas y códigos. Título de página 24px/600; base 14px.
- Forma: radios 6px (controles), 10px (tarjetas), 999px (badges). Espaciado en múltiplos de 4px. Sombras discretas. Foco visible de 2px azul en todo control.
- Movimiento: solo transiciones de color de 150ms; nada de escalas, inclinaciones ni pulsos.
- Dinero en pesos colombianos con punto de miles: `$ 12.480.300`.

## Verificación (obligatoria antes de terminar)

1. Abre cada página con un servidor local (`python -m http.server`) y prueba con un archivo de ejemplo que ya tenga el repositorio o uno que yo te dé: cargar por clic y por arrastre, procesar, ver totales y tabla, buscar/ordenar (Conciliación), limpiar y exportar. Revisa la consola: cero errores.
2. Compara visualmente cada página con las maquetas (si tienes Playwright, toma capturas a 1280px y a 390px de ancho).
3. Confirma con grep que no quedan referencias a `home-button`, `scrollButton`, `fondo.jpg`, `Outfit` ni `Poppins`.
4. Al final, dame una tabla por página con: qué cambió, qué clases generadas por JS renombraste o aliasaste, y cualquier cosa que no pudiste probar.

Trabaja en una rama nueva `rediseno-v2` y haz un commit por página para que pueda revisar paso a paso. No hagas push hasta que yo lo apruebe.
