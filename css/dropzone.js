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
      const f = input.files && input.files[0];
      const key = f ? f.name + '|' + f.size + '|' + f.lastModified : null;
      if (key === current) return;
      current = key;
      if (f) {
        dz.classList.add('has-file');
        if (icon) icon.className = 'fa-solid fa-file-circle-check';
        if (title) { title.textContent = f.name; title.title = f.name; }
        if (hint) hint.textContent = fmtSize(f.size) + ' · haz clic o arrastra otro para reemplazar';
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
