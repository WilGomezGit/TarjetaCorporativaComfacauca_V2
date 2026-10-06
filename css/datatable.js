/* Tabla con búsqueda, orden por columna y paginación (mismo estilo que Consumos y Fibatch).
   Uso:
     const dt = DataTableLite({
       head: '#miTabla thead', body: 'dataBody', foot: 'dataFoot',
       getData: () => data,
       rowHtml: (item, n) => '<td>…</td>',          // n = posición original (1-based)
       searchText: item => 'texto buscable',
       sorters: { clave: item => valor },            // clave = data-sort del <th>
       colspan: 4,
       footHtml: (all, rows, filtering) => '<tr>…</tr>'
     });
     dt.render();  // tras cargar o cambiar los datos
     dt.reset();   // al limpiar
   Requiere en el HTML: #dtSearch, #dtSize, #dtInfo, #dtPager. */
window.DataTableLite = function (opts) {
  const $ = id => document.getElementById(id);
  const state = { page: 1, size: 15, q: '', sort: { col: null, dir: 1 } };
  const headEl = document.querySelector(opts.head);

  function rowsFiltered() {
    const q = state.q.trim().toLowerCase();
    let rows = opts.getData().map((item, i) => ({ item, n: i + 1 }));
    if (q) rows = rows.filter(r => opts.searchText(r.item).toLowerCase().includes(q));
    const { col, dir } = state.sort;
    if (col && opts.sorters[col]) {
      const key = opts.sorters[col];
      rows = rows.slice().sort((a, b) => {
        const x = key(a.item), y = key(b.item);
        const c = typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'es', { numeric: true });
        return (c || a.n - b.n) * dir;
      });
    }
    return rows;
  }

  function sortHeaders() {
    headEl.querySelectorAll('th[data-sort]').forEach(th => {
      const on = th.dataset.sort === state.sort.col;
      th.classList.toggle('sorted-asc', on && state.sort.dir === 1);
      th.classList.toggle('sorted-desc', on && state.sort.dir === -1);
      th.setAttribute('aria-sort', on ? (state.sort.dir === 1 ? 'ascending' : 'descending') : 'none');
    });
  }

  function pager(total, pages, start, shown) {
    const all = opts.getData().length;
    $('dtInfo').textContent = total === 0
      ? 'Mostrando 0 registros'
      : `Mostrando ${start + 1} a ${start + shown} de ${total} registros${state.q.trim() ? ` (filtrado de ${all})` : ''}`;
    const cur = state.page;
    const nums = [...new Set([1, pages, cur - 1, cur, cur + 1])].filter(p => p >= 1 && p <= pages).sort((a, b) => a - b);
    let html = `<button type="button" data-page="${cur - 1}" ${cur === 1 ? 'disabled' : ''}>Anterior</button>`;
    let last = 0;
    nums.forEach(p => {
      if (p - last > 1) html += '<span class="dt-gap">…</span>';
      html += `<button type="button" data-page="${p}" class="${p === cur ? 'is-active' : ''}">${p}</button>`;
      last = p;
    });
    html += `<button type="button" data-page="${cur + 1}" ${cur === pages ? 'disabled' : ''}>Siguiente</button>`;
    $('dtPager').innerHTML = total === 0 ? '' : html;
  }

  function render() {
    const rows = rowsFiltered();
    const pages = Math.max(1, Math.ceil(rows.length / state.size));
    if (state.page > pages) state.page = pages;
    const start = (state.page - 1) * state.size;
    const pageRows = rows.slice(start, start + state.size);
    const all = opts.getData();

    let html = pageRows.map(r => `<tr>${opts.rowHtml(r.item, r.n)}</tr>`).join('');
    if (rows.length === 0 && all.length > 0) {
      html = `<tr class="dt-empty"><td colspan="${opts.colspan}">Sin resultados para la búsqueda.</td></tr>`;
    }
    $(opts.body).innerHTML = html;
    $(opts.foot).innerHTML = all.length === 0 ? '' : opts.footHtml(all, rows, !!state.q.trim());
    sortHeaders();
    pager(rows.length, pages, start, pageRows.length);
  }

  $('dtSearch').addEventListener('input', e => { state.q = e.target.value; state.page = 1; render(); });
  $('dtSize').addEventListener('change', e => { state.size = parseInt(e.target.value, 10); state.page = 1; render(); });
  $('dtPager').addEventListener('click', e => {
    const b = e.target.closest('button[data-page]');
    if (!b || b.disabled) return;
    state.page = parseInt(b.dataset.page, 10);
    render();
  });
  headEl.addEventListener('click', e => {
    const th = e.target.closest('th[data-sort]');
    if (!th) return;
    const s = state.sort, col = th.dataset.sort;
    if (s.col !== col) { s.col = col; s.dir = 1; }
    else if (s.dir === 1) { s.dir = -1; }
    else { s.col = null; s.dir = 1; }
    state.page = 1;
    render();
  });

  return {
    render,
    reset() {
      state.page = 1; state.q = ''; state.sort = { col: null, dir: 1 };
      $('dtSearch').value = '';
      render();
    },
    filtered: rowsFiltered
  };
};
