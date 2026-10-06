let data = []; // Variable para almacenar los datos procesados

function processFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
        alert('Por favor selecciona un archivo.');
        return;
    }

    // Validar el nombre del archivo
    const fileName = file.name;
    const isValid = validateFileName(fileName);

    if (!isValid) {
        alert('El archivo no corresponde con el formato esperado.\n' +
              'El nombre debe comenzar con "T636876" y tener el formato correcto.\n' +
              'Ejemplos: T636876811, T636876A01, T636876B15, T636876C20');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        processData(content);
    };
    reader.readAsText(file);
}

// Función para validar el nombre del archivo
function validateFileName(fileName) {
    const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, '');

    if (!nameWithoutExtension.startsWith('T636876')) {
        return false;
    }

    const suffix = nameWithoutExtension.substring(7);

    if (/^\d{3}$/.test(suffix)) {
        const month = parseInt(suffix.substring(0, 1));
        const day = parseInt(suffix.substring(1, 3));

        if (month < 1 || month > 9) return false;
        if (day < 1 || day > 31) return false;

        return true;
    }

    if (/^[ABC]\d{2}$/.test(suffix)) {
        const day = parseInt(suffix.substring(1, 3));

        if (day < 1 || day > 31) return false;

        return true;
    }

    return false;
}

// Función para formatear el valor en pesos colombianos
function formatCOP(value) {
    return '$' + value.toLocaleString('es-CO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Función para formatear la fecha de YYYYMMDD a YYYY-MM-DD
function formatDate(dateStr) {
    if (dateStr.length === 8) {
        return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    }
    return dateStr;
}

// Función para obtener el nombre del establecimiento
function getEstablecimiento(uniqueCode, tipoMovimiento) {
    if (uniqueCode === "00000000") {
        if (tipoMovimiento && tipoMovimiento.toUpperCase().includes("CARGOS")) return "DESCARGA TARJETA COMFACAUCA";
        else if (tipoMovimiento && tipoMovimiento.toUpperCase().includes("ABONO")) return "CARGA TARJETA COMFACAUCA";
        return "SIN COMERCIO";
    }

    let codigoLimpio = uniqueCode;
    if (codigoLimpio.startsWith("00")) codigoLimpio = codigoLimpio.substring(2);

    const nombre = comercios[codigoLimpio];
    return nombre || "NO ENCONTRADO";
}

// Un comercio está registrado si su código existe en comercios.js (o es carga/descarga de la tarjeta)
function isRegistrado(establecimiento) {
    return establecimiento !== 'NO ENCONTRADO' && establecimiento !== 'SIN COMERCIO';
}

function estadoLabel(item) {
    return item.registrado ? 'Registrado' : 'No registrado';
}

function processData(content) {
    data = [];
    const lines = content.split('\n');

    lines.forEach(line => {
        if (line.trim() !== '') {
            const cardNumber = line.substring(9, 26).trim();
            const rawValue = parseFloat(line.substring(124, 139).replace(/^0+/, '').trim().replace(/,/g, ""));
            const date = line.substring(158, 166).trim();
            const uniqueCode = line.substring(333, 341).trim();

            let tipoMovimiento = "";
            if (line.includes("CARGOS")) tipoMovimiento = "CARGOS";
            else if (line.includes("ABONO")) tipoMovimiento = "ABONO";

            if (!isNaN(rawValue)) {
                const establecimiento = getEstablecimiento(uniqueCode, tipoMovimiento);
                const formattedValue = formatCOP(rawValue);
                const formattedDate = formatDate(date);

                data.push({
                    cardNumber,
                    value: formattedValue,
                    rawValue,
                    date: formattedDate,
                    originalDate: date,
                    uniqueCode,
                    establecimiento,
                    tipoMovimiento,
                    registrado: isRegistrado(establecimiento)
                });
            }
        }
    });

    sortDataByDate();
    renderSummary(); // Mostrar el resumen
    renderTable();
    calculateTotal();
}

// Función para mostrar el resumen del archivo
function renderSummary() {
    const summaryContainer = document.getElementById('summaryContainer');

    const totalsByDate = {};
    let totalCargas = 0;
    let totalDescargas = 0;

    data.forEach(item => {
        if (!totalsByDate[item.date]) totalsByDate[item.date] = 0;
        totalsByDate[item.date] += item.rawValue;

        if (item.establecimiento === "CARGA TARJETA COMFACAUCA") totalCargas += item.rawValue;
        else if (item.establecimiento === "DESCARGA TARJETA COMFACAUCA") totalDescargas += item.rawValue;
    });

    const sortedDates = Object.keys(totalsByDate).sort();

    const totalArchivo = data.reduce((acc, item) => acc + item.rawValue, 0);
    const totalCargasDescargas = totalCargas + totalDescargas;
    const totalArchivoMenosCargas = totalArchivo - totalCargasDescargas;
    const totalRegistros = data.length;

    let summaryHTML = `
        <div class="summary-box">
            <h3>RESUMEN ARCHIVO CONSUMOS CARGADO</h3>
            <div class="summary-content">
    `;

    sortedDates.forEach(date => {
        summaryHTML += `
            <div class="summary-row">
                <span class="summary-label">TOTAL DÍA: ${date}</span>
                <span class="summary-value">${formatCOP(totalsByDate[date])}</span>
            </div>
        `;
    });

    summaryHTML += `
                <div class="summary-divider"></div>
                <div class="summary-row total-cargas">
                    <span class="summary-label">TOTAL CARGAS/DESCARGAS</span>
                    <span class="summary-value">${formatCOP(totalCargasDescargas)}</span>
                </div>
                <div class="summary-row total-archivo-menos">
                    <span class="summary-label">TOTAL ARCHIVO - CARGAS/DESCARGAS</span>
                    <span class="summary-value">${formatCOP(totalArchivoMenosCargas)}</span>
                </div>
                <div class="summary-row total-archivo">
                    <span class="summary-label">TOTAL ARCHIVO</span>
                    <span class="summary-value">${formatCOP(totalArchivo)}</span>
                </div>
                <div class="summary-row total-registros">
                    <span class="summary-label">TOTAL REGISTROS</span>
                    <span class="summary-value">${totalRegistros}</span>
                </div>
            </div>
        </div>
    `;

    summaryContainer.innerHTML = summaryHTML;
}

// Función para ordenar los datos por fecha y luego por establecimiento
function sortDataByDate() {
    data.sort((a, b) => {
        const dateA = `${a.originalDate.slice(0, 4)}${a.originalDate.slice(4, 6)}${a.originalDate.slice(6, 8)}`;
        const dateB = `${b.originalDate.slice(0, 4)}${b.originalDate.slice(4, 6)}${b.originalDate.slice(6, 8)}`;
        const dateCompare = parseInt(dateA) - parseInt(dateB);

        if (dateCompare !== 0) return dateCompare;

        const getPriority = (est) => {
            if (est === "CARGA TARJETA COMFACAUCA" || est === "DESCARGA TARJETA COMFACAUCA") return 1;
            return 0;
        };

        const priorityA = getPriority(a.establecimiento);
        const priorityB = getPriority(b.establecimiento);

        if (priorityA !== priorityB) return priorityA - priorityB;

        return a.establecimiento.localeCompare(b.establecimiento);
    });
}

// Función para mostrar los datos en la tabla
const viewState = { page: 1, size: 15, q: '', sort: { col: null, dir: 1 } };

function getFilteredRows() {
    const q = viewState.q.trim().toLowerCase();
    let rows = data.map((item, i) => ({ item, n: i + 1 }));
    if (q) {
        rows = rows.filter(({ item }) =>
            [item.cardNumber, item.value, item.date, item.uniqueCode, item.establecimiento, estadoLabel(item)]
                .join(' ').toLowerCase().includes(q));
    }
    const { col, dir } = viewState.sort;
    if (col) {
        const key = {
            n: r => r.n,
            card: r => r.item.cardNumber,
            value: r => r.item.rawValue,
            date: r => r.item.date,
            code: r => r.item.uniqueCode,
            est: r => r.item.establecimiento,
            state: r => estadoLabel(r.item)
        }[col];
        rows = rows.slice().sort((a, b) => {
            const x = key(a), y = key(b);
            const c = typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'es', { numeric: true });
            return (c || a.n - b.n) * dir;
        });
    }
    return rows;
}

function updateSortHeaders() {
    document.querySelectorAll('#dataTable thead th[data-sort]').forEach(th => {
        const active = th.dataset.sort === viewState.sort.col;
        th.classList.toggle('sorted-asc', active && viewState.sort.dir === 1);
        th.classList.toggle('sorted-desc', active && viewState.sort.dir === -1);
        th.setAttribute('aria-sort', active ? (viewState.sort.dir === 1 ? 'ascending' : 'descending') : 'none');
    });
}

function escapeHTML(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function estadoBadge(item) {
    return item.registrado
        ? '<span class="badge badge--ok"><i class="fa-solid fa-circle-check"></i>Registrado</span>'
        : '<span class="badge badge--err"><i class="fa-solid fa-circle-xmark"></i>No registrado</span>';
}

function renderTable() {
    const tableBody = document.getElementById('dataBody');
    tableBody.innerHTML = '';

    const rows = getFilteredRows();
    const pages = Math.max(1, Math.ceil(rows.length / viewState.size));
    if (viewState.page > pages) viewState.page = pages;
    const start = (viewState.page - 1) * viewState.size;
    const pageRows = rows.slice(start, start + viewState.size);

    pageRows.forEach(({ item, n }, idx) => {
        const row = tableBody.insertRow();
        row.className = item.registrado ? '' : 'row-unreg';
        row.innerHTML = `
            <td>${n}</td>
            <td>${escapeHTML(item.cardNumber)}</td>
            <td class="col-valor">${item.value}</td>
            <td>${item.date}</td>
            <td>${escapeHTML(item.uniqueCode)}</td>
            <td>${escapeHTML(item.establecimiento)}</td>
            <td class="col-estado">${estadoBadge(item)}</td>
        `;
        // Total del día cuando termina el día dentro del conjunto filtrado
        const next = rows[start + idx + 1];
        if (!viewState.sort.col && (!next || next.item.date !== item.date)) {
            const total = rows.filter(r => r.item.date === item.date).reduce((acc, r) => acc + r.item.rawValue, 0);
            const totalRow = tableBody.insertRow();
            totalRow.className = 'total-row';
            totalRow.innerHTML = `
                <td colspan="2">TOTAL DÍA: ${item.date}</td>
                <td class="col-valor">${formatCOP(total)}</td>
                <td colspan="4"></td>
            `;
        }
    });

    if (rows.length === 0 && data.length > 0) {
        tableBody.innerHTML = '<tr class="dt-empty"><td colspan="7">Sin resultados para la búsqueda.</td></tr>';
    }

    updateSortHeaders();
    renderUnregNotice();
    calculateTotal(rows);
    renderPager(rows.length, pages, start, pageRows.length);
}

function renderPager(totalRows, pages, start, shown) {
    const info = document.getElementById('dtInfo');
    const pager = document.getElementById('dtPager');
    if (!info || !pager) return;
    const filtered = viewState.q.trim() ? ` (filtrado de ${data.length})` : '';
    info.textContent = totalRows === 0
        ? 'Mostrando 0 registros'
        : `Mostrando ${start + 1} a ${start + shown} de ${totalRows} registros${filtered}`;

    const cur = viewState.page;
    const nums = new Set([1, pages, cur - 1, cur, cur + 1]);
    let html = `<button type="button" data-page="${cur - 1}" ${cur === 1 ? 'disabled' : ''}>Anterior</button>`;
    let last = 0;
    [...nums].filter(p => p >= 1 && p <= pages).sort((x, y) => x - y).forEach(p => {
        if (p - last > 1) html += '<span class="dt-gap">…</span>';
        html += `<button type="button" data-page="${p}" class="${p === cur ? 'is-active' : ''}">${p}</button>`;
        last = p;
    });
    html += `<button type="button" data-page="${cur + 1}" ${cur === pages ? 'disabled' : ''}>Siguiente</button>`;
    pager.innerHTML = totalRows === 0 ? '' : html;
}

// Total del archivo: siempre visible al pie de la tabla
function calculateTotal(rows) {
    const foot = document.getElementById('dataFoot');
    if (!foot) return;
    if (data.length === 0) { foot.innerHTML = ''; return; }
    const totalValue = data.reduce((acc, item) => acc + item.rawValue, 0);
    let html = `
        <tr class="total-row total-row--file">
            <td colspan="2">TOTAL ARCHIVO</td>
            <td class="col-valor">${formatCOP(totalValue)}</td>
            <td colspan="4"></td>
        </tr>`;
    if (rows && viewState.q.trim()) {
        const f = rows.reduce((acc, r) => acc + r.item.rawValue, 0);
        html = `
        <tr class="total-row total-row--filter">
            <td colspan="2">TOTAL FILTRADO (${rows.length})</td>
            <td class="col-valor">${formatCOP(f)}</td>
            <td colspan="4"></td>
        </tr>` + html;
    }
    foot.innerHTML = html;
}

// Aviso de comercios sin registrar, con las líneas listas para pegar en comercios.js
function renderUnregNotice() {
    const box = document.getElementById('unregNotice');
    if (!box) return;
    const codes = [...new Set(data.filter(i => !i.registrado).map(i => i.uniqueCode))];
    if (codes.length === 0) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    box.innerHTML = `
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span><b>${codes.length}</b> código(s) de comercio sin registrar. Agrégalos en <code>comercios.js</code>.</span>
        <button type="button" class="btn btn--secondary btn--sm" id="copyUnreg"><i class="fa-regular fa-copy"></i>Copiar líneas</button>`;
    document.getElementById('copyUnreg').addEventListener('click', async (e) => {
        const text = codes.map(c => `    "${c.replace(/^00/, '')}": "NOMBRE DEL COMERCIO",`).join('\n');
        try {
            await navigator.clipboard.writeText(text);
        } catch (_) {
            const ta = document.createElement('textarea');
            ta.value = text; document.body.appendChild(ta); ta.select();
            document.execCommand('copy'); document.body.removeChild(ta);
        }
        const btn = e.currentTarget, old = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i>Copiado';
        setTimeout(() => { btn.innerHTML = old; }, 1500);
    });
}

function initTableControls() {
    const search = document.getElementById('dtSearch');
    const size = document.getElementById('dtSize');
    const pager = document.getElementById('dtPager');
    if (!search || !size || !pager) return;

    search.addEventListener('input', () => { viewState.q = search.value; viewState.page = 1; renderTable(); });
    size.addEventListener('change', () => { viewState.size = parseInt(size.value, 10); viewState.page = 1; renderTable(); });
    // Orden por columna: 1er clic ascendente, 2º descendente, 3º vuelve al orden original
    document.querySelector('#dataTable thead').addEventListener('click', (e) => {
        const th = e.target.closest('th[data-sort]');
        if (!th) return;
        const col = th.dataset.sort, s = viewState.sort;
        if (s.col !== col) { s.col = col; s.dir = 1; }
        else if (s.dir === 1) { s.dir = -1; }
        else { s.col = null; s.dir = 1; }
        viewState.page = 1;
        renderTable();
    });
    pager.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-page]');
        if (!b || b.disabled) return;
        viewState.page = parseInt(b.dataset.page, 10);
        renderTable();
    });
}
document.addEventListener('DOMContentLoaded', initTableControls);

// Función para limpiar la tabla y el archivo seleccionado (CORREGIDA)
function clearTable() {
    // Limpiar el array de datos
    data = [];

    // 1. Limpiar el input de archivo
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';

    // 2. Restablecer el texto y el estado de la zona de Drag & Drop
    const dropZone = document.getElementById('dropZone');
    if (dropZone) {
        dropZone.classList.remove('file-loaded', 'dragover');

        // Restaurar los textos originales
        const dropTitle = dropZone.querySelector('.drop-title');
        const dropSubtitle = dropZone.querySelector('.drop-subtitle');
        if (dropTitle) dropTitle.innerHTML = 'Arrastra archivos aquí o haz clic para seleccionar';
        if (dropSubtitle) dropSubtitle.innerHTML = 'Formatos soportados: .txt';
    }

    // 3. Limpiar el cuerpo de la tabla
    viewState.page = 1;
    viewState.q = '';
    viewState.sort = { col: null, dir: 1 };
    const dtSearch = document.getElementById('dtSearch');
    if (dtSearch) dtSearch.value = '';
    renderTable();

    // 4. Limpiar el resumen
    const summaryContainer = document.getElementById('summaryContainer');
    if (summaryContainer) summaryContainer.innerHTML = '';
}

// Función para exportar los datos a CSV
function exportToCSV() {
    if (data.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,"
        + "N°,No. de Tarjeta,Valor,Fecha,Código Único,Establecimiento,Estado\n";

    data.forEach((item, index) => {
        csvContent += `${index + 1},${item.cardNumber},${item.rawValue},${item.date},${item.uniqueCode},"${item.establecimiento}",${estadoLabel(item)}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Función para exportar los datos a Excel
function exportToExcel() {
    if (data.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data.map((item, index) => ({
        "N°": index + 1,
        "No. de Tarjeta": item.cardNumber,
        "Valor": item.rawValue,
        "Fecha": item.date,
        "Código Único": item.uniqueCode,
        "Establecimiento": item.establecimiento,
        "Estado": estadoLabel(item)
    })));
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'data.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
