/* Botón para ocultar/mostrar el menú lateral. Recuerda la elección del usuario. */
(function () {
  var KEY = 'menuOculto';
  var app = document.querySelector('.app');
  var topbar = document.querySelector('.topbar');
  if (!app || !topbar) return;

  function saved() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function save(v) { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {} }

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'menu-toggle';
  btn.innerHTML = '<i class="fa-solid fa-bars"></i>';

  function apply(hidden) {
    app.classList.toggle('sidebar-hidden', hidden);
    btn.title = hidden ? 'Mostrar menú' : 'Ocultar menú';
    btn.setAttribute('aria-label', btn.title);
    btn.setAttribute('aria-expanded', String(!hidden));
  }

  btn.addEventListener('click', function () {
    var hidden = !app.classList.contains('sidebar-hidden');
    apply(hidden);
    save(hidden);
  });

  topbar.insertBefore(btn, topbar.firstChild);
  apply(saved());
})();
