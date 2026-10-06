# Módulo de Tarjetas · Tesorería Comfacauca (V2)

Aplicación web para el área de Tesorería de **Comfacauca** (Popayán, Cauca) que procesa, valida y concilia los archivos de la **tarjeta corporativa / tarjeta de subsidio**. Funciona completamente en el navegador: los archivos se leen de forma local y **no se envían a ningún servidor**.

## Módulos

| Sección | Página | Qué hace |
|---|---|---|
| **Procesar** | `Consumos` | Carga el `.txt` de consumos del banco, identifica cada establecimiento por su código único (`comercios.js`), marca si está **Registrado / No registrado**, totaliza por día y por archivo. |
| | `Fibatch` | Convierte el archivo FIBATCH en una tabla y calcula el valor total del lote (con botón para copiar el total). |
| | `SaldosPagina` | Genera los archivos de saldos por bolsillo: FOSFEC, Subsidio Familiar y verificación (con duplicados, sin enmascarar). |
| **Validar** | `ValidarArchivosPersonalizacion` | Revisa línea por línea el archivo de personalización antes de enviarlo. |
| | `ValidarArchivoPago` | Valida totales, duplicados (documento / tarjeta) y la última línea del archivo de pago de subsidio familiar. |
| **Conciliar** | `Conciliacion` | Compara Contabilidad, Tesorería y (opcional) Consumos para identificar diferencias de saldo de terceros. |

## Características

- Zonas de carga con **arrastrar y soltar**, que muestran el nombre y tamaño del archivo cargado.
- Tablas con **búsqueda, orden por columna y paginación**, y totales siempre visibles.
- Exportación a **CSV y Excel** (siempre con todos los datos, sin importar el filtro).
- Aviso de **comercios sin registrar** con las líneas listas para pegar en `Consumos/comercios.js`.
- Menú lateral que se puede **ocultar**, y fondo con la imagen institucional en mosaico.
- Diseño unificado en una sola hoja de estilos (`css/app.css`).

## Cómo usarlo

No requiere instalación ni compilación.

1. Descarga o clona el repositorio.
2. Abre `index.html` en el navegador (se recomienda servirlo con un servidor local para que el menú recuerde su estado):
   ```bash
   python -m http.server 8080
   ```
   y entra a <http://localhost:8080>.
3. Elige el módulo en el menú, arrastra el archivo y pulsa **Procesar**.

> Se necesita conexión a internet para cargar las fuentes (Google Fonts), los íconos (Font Awesome) y la librería SheetJS (exportar a Excel) desde sus CDN.

## Estructura

```
index.html                      Inicio con los módulos
css/
  app.css                       Estilos compartidos
  dropzone.js                   Zonas de carga (nombre del archivo y estado)
  datatable.js                  Tabla con búsqueda, orden y paginación
  layout.js                     Botón para ocultar el menú
imagen/                         Logo, favicon y fondo
Consumos/  Fibatch/  SaldosPagina/
ValidarArchivoPago/  ValidarArchivosPersonalizacion/  Conciliacion/
rediseno-tarjetas/              Maqueta del rediseño (referencia)
```

## Registrar un comercio nuevo

Cuando la página muestre **No registrado**, usa el botón **Copiar líneas** del aviso amarillo y pega el resultado en `Consumos/comercios.js`, cambiando `NOMBRE DEL COMERCIO` por el nombre real:

```js
"12345678": "NOMBRE DEL COMERCIO",
```

## Tecnologías

HTML, CSS y JavaScript puro · [SheetJS](https://sheetjs.com/) · [Font Awesome](https://fontawesome.com/) · Google Fonts (IBM Plex Sans, IBM Plex Mono, Source Sans 3).

## Autor

Creado por **Wilmar Andrés Gómez** · Popayán, Cauca.
