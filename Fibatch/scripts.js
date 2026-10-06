let data = []; // Variable para almacenar los datos procesados

function processFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
        alert('Por favor selecciona un archivo.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        processData(content);
    };
    reader.readAsText(file);
}

// Función para formatear el valor en pesos colombianos
function formatCOP(value) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

// Procesa el contenido del archivo FIBATCH
function processData(content) {
    data = []; // Limpiamos los datos anteriores
    const lines = content.split('\n');

    // Procesamos todas las líneas excepto las dos últimas (dependiendo del formato)
    for (let i = 0; i < lines.length - 2; i++) {
        const line = lines[i].trim();
        if (line !== '') {
            // Posiciones específicas para FIBATCH
            const documentNumber = line.substring(75, 94).trim();
            const value = parseFloat(
                line.substring(179, 194)
                    .replace(/^0+/, '')
                    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                    .trim()
                    .replace(/,/g, "")
            );
            const commerce = line.substring(489, 550).trim();

            if (!isNaN(value)) {
                data.push({ documentNumber, value, commerce });
            }
        }
    }

    // Mostramos los datos en la tabla
    renderTable();

    // Calculamos y mostramos el total del valor
    calculateTotal();
}

// ===== Tabla con búsqueda, orden y paginación =====
const viewState = { page: 1, size: 15, q: '', sort: { col: null, dir: 1 } };

function escapeHTML(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function getFilteredRows() {
    const q = viewState.q.trim().toLowerCase();
    let rows = data.map((item, i) => ({ item, n: i + 1 }));
    if (q) {
        rows = rows.filter(({ item }) =>
            [item.documentNumber, formatCOP(item.value), item.commerce].join(' ').toLowerCase().includes(q));
    }
    const { col, dir } = viewState.sort;
    if (col) {
        const key = {
            doc: r => r.item.documentNumber,
            value: r => r.item.value,
            commerce: r => r.item.commerce
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
    document.querySelectorAll('#fibTable thead th[data-sort]').forEach(th => {
        const active = th.dataset.sort === viewState.sort.col;
        th.classList.toggle('sorted-asc', active && viewState.sort.dir === 1);
        th.classList.toggle('sorted-desc', active && viewState.sort.dir === -1);
        th.setAttribute('aria-sort', active ? (viewState.sort.dir === 1 ? 'ascending' : 'descending') : 'none');
    });
}

// Dibuja la tabla con los datos procesados
function renderTable() {
    const tableBody = document.getElementById('dataBody');
    tableBody.innerHTML = '';

    const rows = getFilteredRows();
    const pages = Math.max(1, Math.ceil(rows.length / viewState.size));
    if (viewState.page > pages) viewState.page = pages;
    const start = (viewState.page - 1) * viewState.size;
    const pageRows = rows.slice(start, start + viewState.size);

    pageRows.forEach(({ item }) => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${escapeHTML(item.documentNumber)}</td>
            <td class="col-valor">${formatCOP(item.value)}</td>
            <td>${escapeHTML(item.commerce)}</td>
        `;
    });

    if (rows.length === 0 && data.length > 0) {
        tableBody.innerHTML = '<tr class="dt-empty"><td colspan="3">Sin resultados para la búsqueda.</td></tr>';
    }

    updateSortHeaders();
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

// Calcula el total y lo muestra en el pie de tabla y en el contenedor superior
function calculateTotal(rows) {
    const totalValue = data.reduce((acc, item) => acc + item.value, 0);
    document.getElementById('totalProcessedValue').textContent = formatCOP(totalValue);

    const foot = document.getElementById('dataFoot');
    if (!foot) return;
    if (data.length === 0) { foot.innerHTML = ''; return; }
    let html = `
        <tr class="total-row total-row--file">
            <td>TOTAL LOTE</td>
            <td class="col-valor">${formatCOP(totalValue)}</td>
            <td></td>
        </tr>`;
    if (rows && viewState.q.trim()) {
        const f = rows.reduce((acc, r) => acc + r.item.value, 0);
        html = `
        <tr class="total-row total-row--filter">
            <td>TOTAL FILTRADO (${rows.length})</td>
            <td class="col-valor">${formatCOP(f)}</td>
            <td></td>
        </tr>` + html;
    }
    foot.innerHTML = html;
}

function initTableControls() {
    const search = document.getElementById('dtSearch');
    const size = document.getElementById('dtSize');
    const pager = document.getElementById('dtPager');
    if (!search || !size || !pager) return;

    search.addEventListener('input', () => { viewState.q = search.value; viewState.page = 1; renderTable(); });
    size.addEventListener('change', () => { viewState.size = parseInt(size.value, 10); viewState.page = 1; renderTable(); });
    // Orden por columna: 1er clic ascendente, 2º descendente, 3º vuelve al orden original
    document.querySelector('#fibTable thead').addEventListener('click', (e) => {
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

// Limpia todo (tabla, totales, archivo y zona de drag & drop)
function clearTable() {
    // Limpiar los datos
    data = [];

    // Limpiar búsqueda, orden y página, y redibujar la tabla vacía
    viewState.page = 1;
    viewState.q = '';
    viewState.sort = { col: null, dir: 1 };
    const dtSearch = document.getElementById('dtSearch');
    if (dtSearch) dtSearch.value = '';
    renderTable();

    // Limpiar el total superior
    document.getElementById('totalProcessedValue').textContent = '$0,00';

    // Limpiar el input file
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';

    // Restaurar la zona de drag & drop
    const dropZone = document.getElementById('dropZone');
    if (dropZone) {
        dropZone.classList.remove('file-loaded', 'dragover');
        const dropTitle = dropZone.querySelector('.drop-title');
        const dropSubtitle = dropZone.querySelector('.drop-subtitle');
        if (dropTitle) dropTitle.innerHTML = 'Arrastra archivos aquí o haz clic para seleccionar';
        if (dropSubtitle) dropSubtitle.innerHTML = 'Formatos soportados: .txt';
    }
}

// Exportar a CSV
function exportToCSV() {
    if (data.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }

    const csvContent = "data:text/csv;charset=utf-8,"
        + "Número de Documento,Valor,Comercio\n"
        + data.map(item => {
            return `${item.documentNumber},${item.value},"${item.commerce}"`;
        }).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "fibatch.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Exportar a Excel
function exportToExcel() {
    if (data.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }

    const formattedData = data.map(item => ({
        "Número de Documento": item.documentNumber,
        "Valor": item.value,
        "Comercio": item.commerce
    }));

    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Datos");
    XLSX.writeFile(wb, "fibatch.xlsx");
}
