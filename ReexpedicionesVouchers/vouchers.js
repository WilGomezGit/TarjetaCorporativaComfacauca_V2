// Organizar vouchers de re-expediciones: valida imágenes/PDF contra el Excel y genera un PDF con 4 por hoja.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Observaciones permitidas en el Excel (se comparan en mayúsculas y sin espacios repetidos)
const OBSERVACIONES_VALIDAS = ['COMFACAUCA EN LINEA', 'CORR.BCRIO'];

// ==== ESTADO GLOBAL ====
let archivosProcesados = [];
let datosExcel = null;
let pdfListo = false;

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const dropZoneExcel = document.getElementById('dropZoneExcel');
const fileExcel = document.getElementById('fileExcel');

function escapeHTML(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function setEstado(id, texto, tipo) {
    const el = document.getElementById(id);
    el.textContent = texto;
    el.className = 'file-status' + (tipo ? ' ' + tipo : '');
}

// ==== DRAG & DROP ====
function activarArrastre(zona, onDrop) {
    ['dragenter', 'dragover'].forEach(ev => zona.addEventListener(ev, (e) => {
        e.preventDefault();
        e.stopPropagation();
        zona.classList.add('dragover');
    }));
    ['dragleave', 'drop'].forEach(ev => zona.addEventListener(ev, (e) => {
        e.preventDefault();
        e.stopPropagation();
        zona.classList.remove('dragover');
    }));
    zona.addEventListener('drop', (e) => {
        if (e.dataTransfer.files.length > 0) onDrop(e.dataTransfer.files);
    });
}

activarArrastre(dropZone, (files) => {
    const dt = new DataTransfer();
    Array.from(files).forEach(f => dt.items.add(f));
    fileInput.files = dt.files;
    procesarArchivos();
});
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', procesarArchivos);

activarArrastre(dropZoneExcel, (files) => {
    const dt = new DataTransfer();
    dt.items.add(files[0]);
    fileExcel.files = dt.files;
    leerExcel(files[0]);
});
dropZoneExcel.addEventListener('click', () => fileExcel.click());
fileExcel.addEventListener('change', (e) => {
    if (e.target.files.length > 0) leerExcel(e.target.files[0]);
});

// ==== OVERLAY DE CARGA ====
function mostrarCarga(texto) {
    document.getElementById('loadingText').textContent = texto || 'Cargando archivo, por favor espera…';
    document.getElementById('loadingOverlay').hidden = false;
}

function ocultarCarga() {
    document.getElementById('loadingOverlay').hidden = true;
}

// ==== MENSAJES ====
function mostrarMensaje(html, tipo) {
    const el = document.getElementById('mensajeValidacion');
    const icono = { ok: 'fa-circle-check', err: 'fa-circle-xmark', warn: 'fa-triangle-exclamation' }[tipo];
    el.className = 'alert alert--' + tipo;
    el.innerHTML = `<i class="fa-solid ${icono}"></i><div>${html}</div>`;
    el.hidden = false;
}

function ocultarMensaje() {
    document.getElementById('mensajeValidacion').hidden = true;
}

function mostrarError(mensaje) {
    mostrarMensaje('<strong>Error:</strong> ' + escapeHTML(mensaje), 'err');
    bloquearDescarga();
}

function bloquearDescarga() {
    pdfListo = false;
    document.getElementById('btnDescargar').disabled = true;
}

// ==== LEER EXCEL (SOLO LEE Y GUARDA, SIN VALIDAR) ====
function leerExcel(file) {
    mostrarCarga();
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];

            // Matriz de filas (array de arrays)
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

            // Buscar la fila de encabezados (DOCUMENTO y OBSERVACIÓN)
            let headerRow = -1;
            let colDoc = -1;
            let colObs = -1;

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                for (let j = 0; j < row.length; j++) {
                    const cell = String(row[j]).toUpperCase();
                    if (cell.includes('DOCUMENTO')) colDoc = j;
                    if (cell.includes('OBSERVACIÓN') || cell.includes('OBSERVACION')) colObs = j;
                }
                if (colDoc !== -1 && colObs !== -1) {
                    headerRow = i;
                    break;
                }
            }

            if (headerRow === -1) {
                throw new Error('No se encontraron las columnas "DOCUMENTO" y "OBSERVACIÓN".');
            }

            datosExcel = [];
            for (let i = headerRow + 1; i < rows.length; i++) {
                const row = rows[i];
                const doc = String(row[colDoc] ?? '').trim();
                const obs = String(row[colObs] ?? '').trim().toUpperCase();
                if (doc) datosExcel.push({ documento: doc, observacion: obs, fila: i + 1 });
            }

            setEstado('estadoExcel', `${file.name} cargado correctamente (${datosExcel.length} filas)`, 'success');
            ocultarMensaje();
            document.getElementById('secPreview').hidden = true;
            bloquearDescarga();
        } catch (error) {
            console.error(error);
            datosExcel = null;
            setEstado('estadoExcel', 'Error al leer el Excel.', 'error');
            mostrarError('Error al leer el Excel: ' + error.message);
        } finally {
            ocultarCarga();
        }
    };
    reader.onerror = function () {
        ocultarCarga();
        mostrarError('No se pudo leer el archivo.');
    };
    reader.readAsArrayBuffer(file);
}

// ==== PROCESAR ARCHIVOS (IMÁGENES/PDF) - SOLO PROCESA, SIN VISTA PREVIA ====
async function procesarArchivos() {
    const files = fileInput.files;
    if (files.length === 0) return;

    mostrarCarga(`Procesando ${files.length} archivo(s)…`);
    archivosProcesados = [];
    const omitidos = [];

    try {
        for (let i = 0; i < files.length; i++) {
            const ok = await procesarArchivo(files[i]);
            if (!ok) omitidos.push(files[i].name);
        }
    } finally {
        ocultarCarga();
    }

    archivosProcesados.sort((a, b) => a.numero - b.numero);

    document.getElementById('secPreview').hidden = true;
    bloquearDescarga();

    if (omitidos.length > 0) {
        setEstado('estadoVouchers', `${archivosProcesados.length} voucher(s) cargado(s), ${omitidos.length} omitido(s)`, 'error');
        mostrarMensaje(
            '<strong>Archivos omitidos</strong> (no siguen el formato "1. 10299841.jpg" o no se pudieron leer):<br>' +
            omitidos.map(escapeHTML).join('<br>'), 'warn');
    } else {
        setEstado('estadoVouchers', `${archivosProcesados.length} voucher(s) cargado(s) correctamente`, 'success');
        ocultarMensaje();
    }
}

// ==== PROCESAR UN ARCHIVO INDIVIDUAL ====
async function procesarArchivo(file) {
    const nombreCompleto = file.name;
    const match = nombreCompleto.match(/^(\d+)\.\s*(\d+)/);
    if (!match) return false;

    const numero = parseInt(match[1], 10);
    const documento = match[2];

    const esPdf = file.type === 'application/pdf' || nombreCompleto.toLowerCase().endsWith('.pdf');
    const imgDataUrl = esPdf ? await convertirPDFaImagen(file) : await leerArchivoComoImagen(file);
    if (!imgDataUrl) return false;

    archivosProcesados.push({ numero, documento, imgDataUrl, fileName: nombreCompleto });
    return true;
}

// ==== RECORTE AUTOMÁTICO DE BORDES (BLANCOS Y NEGROS) ====
function recortarBordesAutomatico(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const data = ctx.getImageData(0, 0, width, height).data;

    let minX = width, minY = height, maxX = 0, maxY = 0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const esBlanco = r > 240 && g > 240 && b > 240;
            const esNegro = r < 15 && g < 15 && b < 15;

            if (!esBlanco && !esNegro) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    if (maxX <= minX || maxY <= minY) return canvas;

    const margen = 10;
    minX = Math.max(0, minX - margen);
    minY = Math.max(0, minY - margen);
    maxX = Math.min(width, maxX + margen);
    maxY = Math.min(height, maxY + margen);

    const recorteWidth = maxX - minX;
    const recorteHeight = maxY - minY;
    const nuevoCanvas = document.createElement('canvas');
    nuevoCanvas.width = recorteWidth;
    nuevoCanvas.height = recorteHeight;
    nuevoCanvas.getContext('2d').drawImage(canvas, minX, minY, recorteWidth, recorteHeight, 0, 0, recorteWidth, recorteHeight);

    return nuevoCanvas;
}

// ==== CONVERTIR PDF A IMAGEN (PRIMERA PÁGINA) ====
function convertirPDFaImagen(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async function (e) {
            try {
                const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(e.target.result) }).promise;
                const page = await pdf.getPage(1);
                const viewport = page.getViewport({ scale: 2 });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

                resolve(recortarBordesAutomatico(canvas).toDataURL('image/jpeg', 0.85));
            } catch (error) {
                console.error('Error al convertir PDF a imagen:', error);
                resolve('');
            }
        };
        reader.onerror = () => resolve('');
        reader.readAsArrayBuffer(file);
    });
}

// ==== LEER IMAGEN COMO DATAURL ====
function leerArchivoComoImagen(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.getContext('2d').drawImage(img, 0, 0);
                resolve(recortarBordesAutomatico(canvas).toDataURL('image/jpeg', 0.85));
            };
            img.onerror = () => resolve('');
            img.src = e.target.result;
        };
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
    });
}

// ==== VALIDAR Y PROCESAR ====
function validarYProcesar() {
    ocultarMensaje();

    if (archivosProcesados.length === 0) {
        mostrarError('No hay imágenes/PDF cargados.');
        return;
    }
    if (!datosExcel || datosExcel.length === 0) {
        mostrarError('No se ha cargado un archivo Excel válido.');
        return;
    }

    // 1. Documentos duplicados en el Excel
    const mapDocRows = {};
    datosExcel.forEach(item => {
        (mapDocRows[item.documento] = mapDocRows[item.documento] || []).push(item.fila);
    });
    const mensajesDuplicados = [];
    for (const doc in mapDocRows) {
        if (mapDocRows[doc].length > 1) {
            mensajesDuplicados.push(`Documento ${doc} repetido en filas: ${mapDocRows[doc].join(', ')}`);
        }
    }

    // 2. Mapa del Excel: documento -> observación
    const mapaExcel = {};
    datosExcel.forEach(item => { mapaExcel[item.documento] = item.observacion; });

    // 3. Validar cada voucher
    const errores = [];
    archivosProcesados.forEach(item => {
        const obs = mapaExcel[item.documento];
        if (obs === undefined) {
            errores.push(`Documento ${item.documento}: No existe en el Excel.`);
            return;
        }
        const obsNormalizada = obs.toUpperCase().replace(/\s+/g, ' ').trim();
        if (!OBSERVACIONES_VALIDAS.includes(obsNormalizada)) {
            errores.push(`Documento ${item.documento}: Observación "${obs}" no permitida.`);
        }
    });

    // 4. Mostrar errores o habilitar la descarga
    if (errores.length > 0) {
        mostrarMensaje('<strong>Errores de validación:</strong><br>' + errores.map(escapeHTML).join('<br>'), 'err');
        document.getElementById('secPreview').hidden = true;
        bloquearDescarga();
        return;
    }

    if (mensajesDuplicados.length > 0) {
        mostrarMensaje('<strong>Advertencia:</strong> existen documentos duplicados en el Excel:<br>' +
            mensajesDuplicados.map(escapeHTML).join('<br>') +
            '<br><br>La validación de los vouchers es correcta. Puedes descargar el PDF.', 'warn');
    } else {
        mostrarMensaje('<strong>Validación correcta.</strong> Todos los documentos coinciden. Ahora puedes descargar el PDF.', 'ok');
    }

    mostrarPrevisualizacion();
    pdfListo = true;
    document.getElementById('btnDescargar').disabled = false;
}

// ==== DESCARGAR PDF (SOLO SI YA SE VALIDÓ) ====
function descargarPDF() {
    if (!pdfListo) {
        mostrarError('Primero debes validar los documentos (pulsa "Validar y procesar").');
        return;
    }
    organizarDocumentos();
}

// ==== PREVISUALIZACIÓN ====
function mostrarPrevisualizacion() {
    const secPreview = document.getElementById('secPreview');
    const gridPreview = document.getElementById('gridPreview');
    gridPreview.innerHTML = '';

    const hojas = Math.ceil(archivosProcesados.length / 4);
    document.getElementById('previewNote').textContent =
        `${archivosProcesados.length} voucher(s) en ${hojas} hoja(s) tamaño carta, 4 por hoja.`;

    for (let i = 0; i < archivosProcesados.length; i += 4) {
        const grupo = archivosProcesados.slice(i, i + 4);
        const hojaDiv = document.createElement('div');
        hojaDiv.className = 'hoja-preview';

        grupo.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'item-preview';
            itemDiv.innerHTML = `
                <div class="item-header">${item.numero}. ${escapeHTML(item.documento)}</div>
                <img src="${item.imgDataUrl}" alt="${escapeHTML(item.fileName)}">
            `;
            hojaDiv.appendChild(itemDiv);
        });

        for (let j = grupo.length; j < 4; j++) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'item-preview empty';
            hojaDiv.appendChild(emptyDiv);
        }

        gridPreview.appendChild(hojaDiv);
    }

    secPreview.hidden = false;
}

// ==== GENERAR PDF FINAL ====
async function organizarDocumentos() {
    const boton = document.getElementById('btnDescargar');
    const textoOriginal = boton.innerHTML;
    boton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>Generando…';
    boton.disabled = true;

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

        const pageWidth = 216;
        const pageHeight = 279;
        const margin = 10;
        const gap = 2;
        const headerHeight = 8;

        const cellWidth = (pageWidth - 2 * margin - gap) / 2;
        const cellHeight = (pageHeight - 2 * margin - gap - headerHeight) / 2;

        // Pre-cargar imágenes para conocer sus dimensiones
        const imagenes = [];
        for (const item of archivosProcesados) {
            const img = new Image();
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = item.imgDataUrl;
            });
            imagenes.push(img);
        }

        for (let i = 0; i < archivosProcesados.length; i += 4) {
            const grupo = archivosProcesados.slice(i, i + 4);
            if (i > 0) doc.addPage();

            for (let j = 0; j < grupo.length; j++) {
                const item = grupo[j];
                const img = imagenes[i + j];

                const col = j % 2;
                const fila = Math.floor(j / 2);
                const x = margin + col * (cellWidth + gap);
                const y = margin + fila * (cellHeight + gap + headerHeight);

                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0);
                doc.text(`${item.numero}. ${item.documento}`, x + 2, y + 3);

                const ratio = Math.min((cellWidth - 4) / img.width, (cellHeight - headerHeight - 2) / img.height);
                const newWidth = img.width * ratio;
                const newHeight = img.height * ratio;
                const imgX = x + (cellWidth - newWidth) / 2;
                const imgY = y + headerHeight + (cellHeight - headerHeight - newHeight) / 2;

                doc.addImage(item.imgDataUrl, 'JPEG', imgX, imgY, newWidth, newHeight);
            }
        }

        doc.save('Vouchers_Reexpediciones.pdf');
    } catch (error) {
        console.error(error);
        mostrarError('No se pudo generar el PDF. Revisa la consola del navegador.');
    } finally {
        boton.innerHTML = textoOriginal;
        boton.disabled = !pdfListo;
    }
}

// ==== LIMPIAR TODO ====
function limpiarTodo() {
    archivosProcesados = [];
    datosExcel = null;
    bloquearDescarga();

    fileInput.value = '';
    fileExcel.value = '';
    dropZone.classList.remove('file-loaded', 'dragover');
    dropZoneExcel.classList.remove('file-loaded', 'dragover');
    setEstado('estadoVouchers', 'Sin cargar');
    setEstado('estadoExcel', 'Sin cargar');

    document.getElementById('secPreview').hidden = true;
    document.getElementById('gridPreview').innerHTML = '';
    ocultarMensaje();
}
