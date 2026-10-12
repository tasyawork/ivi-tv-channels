// Глобальная оболочка прототипа: переключатель режимов (As is / Варианты 1-3)
// и переключатель устройства (Десктоп / Мобайл). Слой с настройками лежит
// ПОЗАДИ основного экрана: свайп/скролл вверх у верхнего края «отодвигает»
// основной экран вниз, открывая слой настроек.

const MODES = [
  { id: "asis", label: "As is", sub: "Как сейчас работает сервис" },
  { id: "v1", label: "Вариант 1", sub: "Гипотеза A", disabled: true },
  { id: "v2", label: "Вариант 2", sub: "Гипотеза B" },
  { id: "v3", label: "Вариант 3", sub: "Гипотеза C" },
  { id: "v4", label: "Вариант 4", sub: "Гипотеза D" },
];

// ---------- Навигация прототипа: старая (все варианты) / новая (только В4) ----------
const NAV_KEY = "ivi-proto-nav";
const getNav = () => { try { return localStorage.getItem(NAV_KEY) || "old"; } catch { return "old"; } };
// Какие режимы доступны при текущей навигации: старая — все; новая — только В4.
const navModes = () => (getNav() === "new" ? MODES.filter((m) => m.id === "v4") : MODES);

function renderModeTabs() {
  const group = document.querySelector(".mode-group");
  if (!group) return;
  const active = getMode();
  group.innerHTML = navModes()
    .map((m) => `<button class="seg mode-tab${m.disabled ? " is-disabled" : ""}${m.id === active ? " is-active" : ""}" data-mode="${m.id}"${m.disabled ? " disabled" : ""}>${m.label}</button>`)
    .join("");
  group.querySelectorAll(".mode-tab").forEach((t) =>
    t.addEventListener("click", () => {
      if (t.disabled || t.classList.contains("is-disabled")) return;
      setMode(t.dataset.mode); close();
    })
  );
}

// Новое меню (макет IBW) — в новой навигации показываем и на ТВ онлайн / Программе.
const PA = "https://app.paper.design/file-assets/01M45XC9MW0NZTHRFA799G9DJ7/";
function ensureNewNav() {
  if (document.querySelector(".mh-nav")) return;       // на новой главной уже есть
  const topbar = document.querySelector(".topbar");
  if (!topbar) return;                                  // вставляем только там, где была старая шапка
  const el = document.createElement("header");
  el.className = "mh-nav";
  el.innerHTML = `
    <a class="mh-nav-logo" href="main.html" aria-label="Иви"><img src="${PA}06CX82JTQBEJPQWZX8M5167B35.png" alt="Иви"></a>
    <div class="mh-nav-center">
      <button class="mh-nav-search" aria-label="Поиск"><svg viewBox="0 0 24 24" width="22" height="22"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M20 20l-4-4"/></svg></button>
      <nav class="mh-nav-pill">
        <a href="#">Фильмы</a>
        <a href="#">Сериалы</a>
        <a href="#">Шоу</a>
        <a href="index.html">ТВ</a>
        <a href="#" class="mh-nav-sport">Спорт <span class="mh-nav-badge">ЧМ<br>26</span></a>
      </nav>
    </div>
    <div class="mh-nav-right">
      <button class="mh-nav-icon" aria-label="Сохранённое"><svg viewBox="0 0 24 24" width="22" height="22"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z"/></svg></button>
      <button class="mh-nav-avatar" aria-label="Профиль"><img src="${PA}02DQY8ZFK9F15VN9EMCZVC3W53.svg" alt=""></button>
    </div>`;
  topbar.parentNode.insertBefore(el, topbar);
}

function setNav(nav) {
  try { localStorage.setItem(NAV_KEY, nav); } catch {}
  document.querySelectorAll(".nav-seg").forEach((b) => b.classList.toggle("is-active", b.dataset.nav === nav));
  renderModeTabs();
  // Новая навигация — всегда Вариант 4 (единственный доступный режим).
  if (nav === "new") setMode("v4");
  // Переход на соответствующую главную: новая — новая главная, старая — ТВ онлайн.
  const target = nav === "new" ? "main.html" : "index.html";
  if (!location.pathname.endsWith("/" + target) && !location.pathname.endsWith(target)) {
    location.href = target;
  }
}

// ---------- Режим прототипа ----------
const KEY = "ivi-proto-mode";
const getMode = () => { try { return localStorage.getItem(KEY) || "asis"; } catch { return "asis"; } };
function setMode(id) {
  try { localStorage.setItem(KEY, id); } catch {}
  // Варианты 1/2/3 используют единый макет Варианта 3 (data-mode="v3");
  // реальный выбор держим в data-variant — через него v2 получает свои отличия.
  document.documentElement.setAttribute("data-mode", id === "asis" ? "asis" : "v3");
  document.documentElement.setAttribute("data-variant", id);
  document.querySelectorAll(".mode-tab").forEach((t) =>
    t.classList.toggle("is-active", t.dataset.mode === id)
  );
  window.dispatchEvent(new CustomEvent("modechange", { detail: { mode: id } }));
}

// ---------- Устройство ----------
const DEVICE_KEY = "ivi-proto-device";
const getDevice = () => { try { return localStorage.getItem(DEVICE_KEY) || "desktop"; } catch { return "desktop"; } };
const PHONE_W = 430, PHONE_H = 932; // iPhone 15 Pro Max (pt)

function updatePhoneScale() {
  if (getDevice() === "mobile") {
    const s = Math.min(1, (window.innerHeight - 40) / PHONE_H);
    document.documentElement.style.setProperty("--phone-scale", s.toFixed(3));
  } else {
    document.documentElement.style.removeProperty("--phone-scale");
  }
}
function setDevice(d) {
  try { localStorage.setItem(DEVICE_KEY, d); } catch {}
  document.documentElement.setAttribute("data-device", d);
  document.querySelectorAll(".device-seg").forEach((b) =>
    b.classList.toggle("is-active", b.dataset.device === d)
  );
  updatePhoneScale();
  window.dispatchEvent(new CustomEvent("devicechange", { detail: { device: d } }));
}
window.addEventListener("resize", updatePhoneScale);

// ---------- Разметка ----------
function build() {
  const page = document.querySelector(".page");
  if (!page) return;
  document.documentElement.setAttribute("data-mode", getMode() === "asis" ? "asis" : "v3");
  document.documentElement.setAttribute("data-variant", getMode());
  document.documentElement.setAttribute("data-device", getDevice());
  document.documentElement.setAttribute("data-nav", getNav());
  if (getNav() === "new") ensureNewNav();

  const nav = getNav();
  const layer = document.createElement("div");
  layer.className = "mode-layer";
  layer.innerHTML = `
    <div class="mode-layer-inner">
      <div class="seg-group device-group">
        <button class="seg device-seg" data-device="desktop">Десктоп</button>
        <button class="seg device-seg is-disabled" data-device="mobile" disabled>Мобайл</button>
      </div>
      <div class="seg-group nav-group">
        <button class="seg nav-seg${nav === "old" ? " is-active" : ""}" data-nav="old">Старая навигация</button>
        <button class="seg nav-seg${nav === "new" ? " is-active" : ""}" data-nav="new">Новая</button>
      </div>
      <div class="seg-group mode-group"></div>
    </div>`;

  const shell = document.createElement("div");
  shell.className = "app-shell";
  if (page.classList.contains("phone")) shell.classList.add("shell-phone");
  page.parentNode.insertBefore(layer, page);
  page.parentNode.insertBefore(shell, page);
  shell.appendChild(page);

  layer.querySelectorAll(".nav-seg").forEach((b) =>
    b.addEventListener("click", () => { setNav(b.dataset.nav); close(); })
  );
  layer.querySelectorAll(".device-seg").forEach((b) =>
    b.addEventListener("click", () => {
      if (b.disabled || b.classList.contains("is-disabled")) return;
      setDevice(b.dataset.device); close();
    })
  );
  shell.addEventListener("click", (e) => {
    if (isOpen) { e.preventDefault(); e.stopPropagation(); close(); }
  }, true);

  // В новой навигации доступен только В4; в старой — сохранённый режим (не отключённый).
  let startMode = nav === "new" ? "v4" : getMode();
  if (MODES.find((m) => m.id === startMode)?.disabled) startMode = "asis";
  setMode(startMode);
  renderModeTabs();
  setDevice("desktop"); // мобайл временно скрыт

  // Градиент под табами показываем только когда они залипли у верха экрана.
  // Через сентинел + IntersectionObserver (надёжнее слушателя scroll).
  const tabsBar = document.querySelector(".tabs-bar");
  if (tabsBar && tabsBar.parentNode) {
    const sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    sentinel.style.cssText = "height:0;margin:0;padding:0;";
    tabsBar.parentNode.insertBefore(sentinel, tabsBar);
    new IntersectionObserver(
      ([e]) => tabsBar.classList.toggle("is-stuck", !e.isIntersecting),
      { threshold: 0 }
    ).observe(sentinel);
  }

  // Градиент-растворение по краям табов, когда их можно скроллить влево/вправо.
  // Оверлеи-градиенты на .tabs-bar (не маска на #tabs — та обрезала бы выпадающий
  // список дат, у которого position: fixed внутри #tabs).
  const tabsScroll = document.getElementById("tabs");
  if (tabsScroll && tabsBar) {
    const fadeL = document.createElement("div"); fadeL.className = "tabs-fade l";
    const fadeR = document.createElement("div"); fadeR.className = "tabs-fade r";
    tabsBar.append(fadeL, fadeR);
    const syncFade = () => {
      fadeL.classList.toggle("is-on", tabsScroll.scrollLeft > 2);
      fadeR.classList.toggle("is-on", tabsScroll.scrollLeft + tabsScroll.clientWidth < tabsScroll.scrollWidth - 2);
    };
    tabsScroll.addEventListener("scroll", syncFade, { passive: true });
    window.addEventListener("resize", syncFade);
    window.addEventListener("modechange", () => setTimeout(syncFade, 0));
    new MutationObserver(syncFade).observe(tabsScroll, { childList: true });
    syncFade();
  }
}

let isOpen = false;
function open() {
  if (isOpen) return;
  isOpen = true;
  document.documentElement.setAttribute("data-shell-open", "");
}
function close() {
  if (!isOpen) return;
  isOpen = false;
  document.documentElement.removeAttribute("data-shell-open");
  accUp = 0;
}

// ---------- Жест: свайп/скролл вверх, когда уже наверху ----------
let accUp = 0;
let accTimer = null;
const THRESHOLD = 90;
// В мобайле скроллится сам «телефон» (.page), в десктопе — окно.
function scroller() {
  return getDevice() === "mobile" ? document.querySelector(".phone-scroll") : null;
}
function atTop() {
  const s = scroller();
  if (s) return s.scrollTop <= 0;
  return (window.scrollY || document.documentElement.scrollTop || 0) <= 0;
}

window.addEventListener("wheel", (e) => {
  if (isOpen) {
    e.preventDefault();
    if (e.deltaY > 6) close();
    return;
  }
  if (atTop() && e.deltaY < 0) {
    accUp += -e.deltaY;
    clearTimeout(accTimer);
    accTimer = setTimeout(() => (accUp = 0), 220);
    if (accUp > THRESHOLD) { accUp = 0; open(); }
  } else {
    accUp = 0;
  }
}, { passive: false });

let touchStartY = null;
window.addEventListener("touchstart", (e) => {
  touchStartY = atTop() ? e.touches[0].clientY : null;
}, { passive: true });
window.addEventListener("touchmove", (e) => {
  if (touchStartY == null) return;
  const dy = e.touches[0].clientY - touchStartY;
  if (isOpen) { if (dy < -40) close(); return; }
  if (atTop() && dy > THRESHOLD) { touchStartY = null; open(); }
}, { passive: true });

window.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", build);
} else {
  build();
}
