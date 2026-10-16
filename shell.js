// Глобальная оболочка прототипа: переключатель режимов (As is / Варианты 1-3)
// и переключатель устройства (Десктоп / Мобайл). Слой с настройками лежит
// ПОЗАДИ основного экрана: свайп/скролл вверх у верхнего края «отодвигает»
// основной экран вниз, открывая слой настроек.

// hidden — пока убраны из интерфейса (код оставляем, вернёмся позже).
// В интерфейсе остаются только две гипотезы на базе прежнего В4:
//   v4  → «Вариант 1» (прежний В4), v4b → «Вариант 2» (пока копия v4).
const MODES = [
  { id: "asis", label: "As is", sub: "Как сейчас работает сервис", hidden: true },
  { id: "v1", label: "Вариант 1", sub: "Гипотеза A", disabled: true, hidden: true },
  { id: "v2", label: "Вариант 2", sub: "Гипотеза B", hidden: true },
  { id: "v3", label: "Вариант 3", sub: "Гипотеза C", hidden: true },
  // Прежние гипотезы (v4 «Вариант 1», v4b/v4c) пока скрыты из интерфейса — код оставляем.
  { id: "v4", label: "Вариант 1", sub: "Гипотеза D", hidden: true },
  { id: "v4b", label: "Вариант 2 (архив)", sub: "Плеер + список каналов", hidden: true },
  { id: "v4c", label: "Одноряд «Сейчас в эфире»", sub: "", hidden: true },
  // В интерфейсе — только «Вариант 1» (бывший В3, макет) и «Вариант 2» (пока его дубль).
  { id: "v4d", label: "Вариант 1", sub: "Плеер + лента каналов (макет)" },
  { id: "v4e", label: "Вариант 2", sub: "Дубль Варианта 1 — для доработки" },
  { id: "v4f", label: "Вариант 3", sub: "Дубль Варианта 2 — для доработки" },
];
// v4b/v4c/v4d/v4e визуально на базе v4: отдаём им data-variant="v4", различаем через data-copy.
const variantAttr = (id) => (["v4b", "v4c", "v4d", "v4e", "v4f"].includes(id) ? "v4" : id);

// ---------- Навигация прототипа: старая / новая (меняет только шапку-навигацию) ----------
const NAV_KEY = "ivi-proto-nav";
const getNav = () => { try { return localStorage.getItem(NAV_KEY) || "old"; } catch { return "old"; } };
// В интерфейсе показываем только видимые варианты (прежние В1–В3 и As is скрыты).
const navModes = () => MODES.filter((m) => !m.hidden);

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
        <a href="index.html" class="is-current">ТВ</a>
        <a href="#" class="mh-nav-sport">Спорт <span class="mh-nav-badge">ЧМ<br>26</span></a>
      </nav>
    </div>
    <div class="mh-nav-right">
      <button class="mh-nav-avatar" aria-label="Профиль"><img src="${PA}65Q13X5PFWKCV8V00FB9GJ8GZY.png" alt=""></button>
    </div>`;
  topbar.parentNode.insertBefore(el, topbar);
}

function setNav(nav) {
  try { localStorage.setItem(NAV_KEY, nav); } catch {}
  document.querySelectorAll(".nav-seg").forEach((b) => b.classList.toggle("is-active", b.dataset.nav === nav));
  renderModeTabs();
  // Если текущий режим скрыт/недоступен — ставим «Вариант 1» (v4).
  if (!MODES.find((m) => m.id === getMode() && !m.disabled && !m.hidden)) setMode("v4d");
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
  document.documentElement.setAttribute("data-variant", variantAttr(id));
  document.documentElement.setAttribute("data-copy", id);
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
  document.documentElement.setAttribute("data-variant", variantAttr(getMode()));
  document.documentElement.setAttribute("data-copy", getMode());
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

  // Стартуем с сохранённого режима; если он скрыт/отключён (прежние В1–В3, As is) —
  // откатываемся на «Вариант 1» (v4).
  let startMode = getMode();
  if (!MODES.find((m) => m.id === startMode && !m.disabled && !m.hidden)) startMode = "v4d";
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
      { threshold: 0, rootMargin: "-16px 0px 0px 0px" } // = top у .tabs-bar
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
