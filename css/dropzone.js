/* Muestra en cada drop zone el archivo cargado (nombre + tamaño) y la deja
   marcada en verde mientras haya un archivo seleccionado. Sincroniza por
   sondeo para cubrir "arrastrar y soltar", el selector y los botones Limpiar. */
(function () {
  function fmtSize(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  function findInput(dz) {
    return dz.querySelector('input[type=file]')
      || (dz.htmlFor && document.getElementById(dz.htmlFor))
      || (dz.parentElement && dz.parentElement.querySelector('input[type=file]'));
  }

  function init(dz) {
    const input = findInput(dz);
    if (!input) return;
    const icon = dz.querySelector('.dropzone__icon i');
    const title = dz.querySelector('.dropzone__title');
    const hint = dz.querySelector('.dropzone__hint');
    const orig = {
      icon: icon && icon.className,
      title: title && title.innerHTML,
      hint: hint && hint.textContent
    };
    let current = null;

    function sync() {
      const list = input.files ? Array.from(input.files) : [];
      const f = list[0];
      const key = list.length ? list.map(x => x.name + '|' + x.size + '|' + x.lastModified).join(';') : null;
      if (key === current) return;
      current = key;
      if (f) {
        dz.classList.add('has-file');
        if (icon) icon.className = 'fa-solid fa-file-circle-check';
        const total = list.reduce((a, x) => a + x.size, 0);
        const name = list.length > 1 ? list.length + ' archivos seleccionados' : f.name;
        if (title) { title.textContent = name; title.title = name; }
        if (hint) hint.textContent = fmtSize(total) + ' · haz clic o arrastra ' + (list.length > 1 ? 'otros' : 'otro') + ' para reemplazar';
      } else {
        dz.classList.remove('has-file');
        if (icon) icon.className = orig.icon;
        if (title) { title.innerHTML = orig.title; title.removeAttribute('title'); }
        if (hint) hint.textContent = orig.hint;
      }
    }

    input.addEventListener('change', sync);
    setInterval(sync, 250);
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.dropzone').forEach(init);
  });
})();
