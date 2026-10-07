import {
  tvChannels, channelThumb, channelCover, nowOnChannel, telecastThumb,
  mskTime, HOME_TABS, TABS, filterByTag, demoSchedule,
  collection, poster, accessLabel, contentThumb,
} from "./ivi-api.js";

const grid = document.getElementById("channelGrid");
const gridTitle = document.getElementById("gridTitle");
const tabsEl = document.getElementById("tabs");

let channels = [];
let day = 0; // 0 — сегодня, 1 — завтра
const getDevice = () => document.documentElement.getAttribute("data-device") || "desktop";
// As is — 5 табов; Вариант 1 — полный список (8).
const getMode = () => document.documentElement.getAttribute("data-mode") || "asis";
const isV1like = () => getMode() === "v1" || getMode() === "v2";
const tabList = () => (isV1like() ? TABS : HOME_TABS);
const defaultTab = () => (isV1like() ? 2 : 0); // «Федеральные»
let activeTab = defaultTab();
const nowCache = new Map();
const loadNow = (id) => {
  if (!nowCache.has(id)) nowCache.set(id, nowOnChannel(id).catch(() => null));
  return nowCache.get(id);
};

// ---- Дата: первый таб-дропдаун «Сегодня» (иконка слева, текст справа) ----
const CAL_ICON = '<svg viewBox="0 0 20 20" width="18" height="18"><path transform="translate(1 0)" fill="currentColor" d="M17 10C17.553 10 18 10.447 18 11L18 11.207C18 15.005 18 17.097 16.729 18.448C15.47 19.784 13.42 20 9 20C4.58 20 2.531 19.784 1.271 18.448C-0.001 17.097 0 15.005 0 11.207L0 11C0 10.447 0.447 10 1 10C1.553 10 2 10.447 2 11L2 11.207C2 14.386 1.999 16.304 2.728 17.077C3.462 17.857 5.416 18 9 18C12.584 18 14.539 17.857 15.273 17.077C16.001 16.304 16 14.386 16 11.207L16 11C16 10.447 16.447 10 17 10ZM13 0C13.553 0 14 0.447 14 1L14 2.274C16.745 2.768 17.799 4.112 17.958 7.706C17.972 8.044 17.847 8.376 17.615 8.618C17.383 8.861 17.056 9 16.719 9L1.281 9C0.944 9 0.617 8.861 0.385 8.618C0.152 8.376 0.027 8.044 0.042 7.708C0.201 4.112 1.255 2.768 4 2.275L4 1C4 0.447 4.447 0 5 0C5.553 0 6 0.447 6 1L6 2.063C6.881 2.016 7.871 2 9 2C10.129 2 11.119 2.016 12 2.063L12 1C12 0.447 12.447 0 13 0ZM9 4C7.8 4 6.815 4.019 6 4.066L6 5C6 5.553 5.553 6 5 6C4.447 6 4 5.553 4 5L4 4.319C2.434 4.695 2.177 5.471 2.08 7L15.92 7C15.823 5.471 15.566 4.695 14 4.319L14 5C14 5.553 13.553 6 13 6C12.447 6 12 5.553 12 5L12 4.066C11.185 4.019 10.2 4 9 4Z"/></svg>';
const WD_FULL = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
let activeDate = 0; // 0 — сегодня; диапазон -2..+7 (2 назад + неделя вперёд)
const dateLabel = (off) => {
  if (off === 0) return "Сегодня";
  if (off === 1) return "Завтра";
  if (off === -1) return "Вчера";
  const d = new Date(); d.setDate(d.getDate() + off);
  return WD_FULL[d.getDay()];
};
function dateTab() {
  if (!isV1like()) return "";
  const today = new Date();
  const items = Array.from({ length: 10 }, (_, i) => {
    const off = i - 2; const d = new Date(today); d.setDate(today.getDate() + off);
    return `<button class="td-item${off === activeDate ? " is-active" : ""}" data-off="${off}">
      <span class="td-day">${dateLabel(off)}</span><span class="td-num">${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}</span></button>`;
  }).join("");
  return `<div class="tab-date" tabindex="0">
    <span class="tab-date-btn">${CAL_ICON}<span class="tab-date-label">${dateLabel(activeDate)}</span><span class="tab-date-caret">▾</span></span>
    <div class="tab-date-menu">${items}</div>
  </div>`;
}

// ---- Табы категорий ----
function renderTabs() {
  tabsEl.innerHTML = dateTab() + tabList()
    .map((t, i) => `<button class="tab${i === activeTab ? " is-active" : ""}" data-i="${i}">${t.label}</button>`)
    .join("");
}
renderTabs();
tabsEl.addEventListener("click", (e) => {
  const di = e.target.closest(".td-item");
  if (di) {
    activeDate = +di.dataset.off;
    const label = tabsEl.querySelector(".tab-date-label");
    if (label) label.textContent = dateLabel(activeDate);
    tabsEl.querySelectorAll(".td-item").forEach((b) => b.classList.toggle("is-active", b === di));
    day = activeDate === 0 ? 0 : 1;
    updateDayBtn?.();
    if (channels.length) renderTab();
    tabsEl.querySelector(".tab-date")?.blur();
    return;
  }
  const b = e.target.closest(".tab");
  if (!b) return;
  activeTab = +b.dataset.i;
  tabsEl.querySelectorAll(".tab").forEach((t) => t.classList.toggle("is-active", t === b));
  renderTab();
});
// Позиционируем fixed-меню дат под кнопкой при наведении/фокусе (меню не обрезается
// скроллом табов). Если даты уехали под скролл — всё равно открывается корректно.
function positionDateMenu(td) {
  const menu = td.querySelector(".tab-date-menu"), btn = td.querySelector(".tab-date-btn");
  if (!menu || !btn) return;
  const r = btn.getBoundingClientRect();
  menu.style.top = (r.bottom + 6) + "px";
  menu.style.left = r.left + "px";
}
tabsEl.addEventListener("mouseover", (e) => { const td = e.target.closest?.(".tab-date"); if (td) positionDateMenu(td); });
tabsEl.addEventListener("focusin", (e) => { const td = e.target.closest?.(".tab-date"); if (td) positionDateMenu(td); });

// Заголовок: As is — «на сегодня», Вариант 1 — без.
function applyModeTitle() {
  const t = document.querySelector(".page-title");
  if (t) t.textContent = isV1like() ? "Программа передач" : "Программа передач на сегодня";
}
applyModeTitle();

window.addEventListener("modechange", () => {
  activeTab = defaultTab();
  renderTabs();
  applyModeTitle();
  if (channels.length) renderTab();
});

// ---- Демо-расписание для «завтра» ----
const DEMO = [
  "Новости", "Утро в эфире", "Доброе утро", "Вести", "Контрольная закупка",
  "Жить здорово", "Модный приговор", "Давай поженимся", "Пусть говорят",
  "Время покажет", "Поле чудес", "Вечерние новости", "Док-ток",
  "Большая игра", "На самом деле", "Подкаст.Лаб", "Сегодня вечером",
];
function cardDemo(seed, count = 5, startH = 6) {
  const rows = [];
  let mins = startH * 60;
  for (let i = 0; i < count; i++) {
    const t = `${String(Math.floor(mins / 60) % 24).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
    const name = DEMO[(seed * 7 + i * 13) % DEMO.length];
    const age = [0, 6, 12, 16, 18][(seed + i) % 5];
    rows.push([t, `${name}, ${age}+`]);
    mins += 30 + ((seed + i * 17) % 60);
  }
  return rows;
}
const rowHtml = (t, title, now = false) =>
  `<div class="sched-row${now ? " is-now" : ""}"><span class="sched-time">${t}</span><span class="sched-title">${title}</span></div>`;
const pluralMin = (n) => {
  const a = n % 100, b = n % 10;
  if (a >= 11 && a <= 14) return "минут";
  if (b === 1) return "минута";
  if (b >= 2 && b <= 4) return "минуты";
  return "минут";
};

// ---- Карточка канала ----
const skeletonRows = () =>
  Array.from({ length: 5 }, () => rowHtml("—", "…")).join("");

function channelCard(ch) {
  return `<article class="card" data-id="${ch.id}">
    <a class="card-body" href="player.html?id=${ch.id}">
      <div class="card-head">
        <div class="card-logo"><img loading="lazy" src="${channelThumb(ch)}" alt=""></div>
        <div class="card-name">${ch.title}</div>
      </div>
      <div class="poster">
        <img class="poster-img-el" loading="lazy" src="${channelCover(ch)}" alt="">
        <span class="poster-left" data-left="${ch.id}" hidden></span>
      </div>
      <div class="sched" data-sched="${ch.id}">${skeletonRows()}</div>
    </a>
    <div class="card-foot"><a class="allprog" href="schedule.html?id=${ch.id}">Вся телепрограмма</a></div>
  </article>`;
}

// Заполнить расписание карточки: сегодня — реальная передача «сейчас» + демо;
// завтра — целиком демо. Обложка — фирменная (channelCover), как на проде.
async function fillCard(ch) {
  const schedEl = grid.querySelector(`[data-sched="${ch.id}"]`);
  if (!schedEl) return;

  const leftChip = grid.querySelector(`.poster-left[data-left="${ch.id}"]`);
  if (leftChip) leftChip.hidden = true; // сбрасываем (актуально только для «сейчас»)

  if (day === 1) {
    schedEl.innerHTML = cardDemo(ch.id % 97, 5, 6).map((r) => rowHtml(r[0], r[1])).join("");
    return;
  }

  try {
    const tc = await loadNow(ch.id);
    if (day !== 0) return; // пока грузилось, переключили на завтра
    if (!tc) { schedEl.innerHTML = rowHtml("", "Нет данных об эфире"); return; }
    const restrict = tc.restrict ?? 16;
    // Первая строка — текущая передача (выделяется белым/медиум).
    const rows = [[mskTime(tc.start), tc.title, true], ...demoSchedule(tc.end, restrict, 4).map((r) => [r.time, r.title, false])];
    schedEl.innerHTML = rows.map((r) => rowHtml(r[0], r[1], r[2])).join("");
    // Обложка «сегодня» — кадр текущей передачи (как постер в макете),
    // чтобы не дублировать брендовую плашку из логотипа.
    const img = grid.querySelector(`.card[data-id="${ch.id}"] .poster-img-el`);
    const thumb = telecastThumb(tc);
    if (img && thumb) img.src = thumb;
    // Чип «ещё N минут» до конца текущей передачи — в левом нижнем углу постера.
    if (leftChip && tc.end) {
      const min = Math.round((new Date(tc.end) - Date.now()) / 60000);
      if (min > 0 && min < 600) { leftChip.textContent = `ещё ${min} ${pluralMin(min)}`; leftChip.hidden = false; }
    }
  } catch {
    schedEl.innerHTML = rowHtml("", "Эфир недоступен");
  }
}

function renderTab() {
  const tab = tabList()[activeTab];
  gridTitle.innerHTML = `${tab.heading} <span class="chev">›</span>`;
  const list = filterByTag(channels, tab.tag);
  if (!list.length) { grid.innerHTML = `<div class="grid-empty">В этой категории нет каналов</div>`; return; }
  grid.innerHTML = list.map(channelCard).join("");
  list.forEach(fillCard);
}

// ---- Кнопка «Программа на сегодня / завтра» ----
const btnDay = document.querySelector(".btn-tomorrow");
const btnDayLabel = btnDay.querySelector("span");
function updateDayBtn() {
  btnDayLabel.textContent = day === 0 ? "Программа на сегодня" : "Программа на завтра";
}
btnDay.addEventListener("click", () => {
  day = day === 0 ? 1 : 0;
  updateDayBtn();
  renderTab();
});
updateDayBtn();

// ---- Загрузка каналов ----
(async function init() {
  grid.innerHTML = `<div class="grid-empty">Загружаем каналы Иви…</div>`;
  try {
    channels = await tvChannels();
    renderTab();
  } catch (err) {
    grid.innerHTML = `<div class="grid-empty">Не удалось загрузить каналы: ${err.message}</div>`;
  }
})();

// ---- ТВ шоу: галерея как в каталоге (крупные + мелкие карточки, мета, скролл) ----
const SHOW_STATUS = [
  { t: "новинка", c: "#21D468" }, { t: "сейчас смотрит 52к", c: "#21D468" },
  { t: "популярно", c: "#FF8A00" }, { t: "новые серии", c: "#21D468" },
  { t: "новинка", c: "#21D468" }, { t: "новые серии", c: "#21D468" },
];
const SHOW_GENRE = ["мистические", "звёзды", "музыка, развлекательные", "трудный выбор", "интриги", "реалити"];
const SHOW_SEASONS = ["1 сезон", "3 сезона", "1 сезон", "5 сезонов", "2 сезона", "2 сезона"];
const SHOW_DESC = [
  "Знаменитости участвуют в тайных заговорах в марокканском замке. Психологическое реалити-шоу.",
  "Звёздным парам предстоит экстремальная борьба за денежный приз на оживлённых улицах Поднебесной.",
  "Кто поёт — настоящая звезда или двойник? Киркоров, Бузова и другие селебрити в музыкальном шоу.",
  "Острое реалити-шоу о школьницах, столкнувшихся с неожиданной беременностью.",
  "Игровое реалити-шоу с высокими ставками. 12 звёздных пар борются за чемодан с 10 млн рублей.",
  "Экстрасенсы со всей страны сходятся в большом реванше за звание сильнейшего.",
];
const isPaidC = (it) => !!(it.content_paid_types && !it.content_paid_types.includes("AVOD"));
const showDescC = (it, i) => it.synopsis || SHOW_DESC[i % SHOW_DESC.length];
function showMetaLineC(i) {
  const s = SHOW_STATUS[i % SHOW_STATUS.length];
  return `<span class="sm-status" style="color:${s.c}"><i class="sm-sdot" style="background:${s.c}"></i>${s.t}</span><span class="sm-sep">·</span>${SHOW_GENRE[i % SHOW_GENRE.length]}<span class="sm-sep">·</span>${SHOW_SEASONS[i % SHOW_SEASONS.length]}`;
}
function showCardC(it, cls, w, h, i) {
  return `<a class="${cls} show-card" href="https://www.ivi.ru/watch/${it.hru || it.id}" target="_blank" rel="noopener" title="${it.title}">
    <img class="show-img" loading="lazy" src="${contentThumb(it, w, h)}" alt="${it.title}">
    <div class="show-ov" aria-hidden="true">
      <div class="sm-ttl">${it.title}</div>
      <div class="sm-desc">${showDescC(it, i)}</div>
      <div class="sm-meta">${showMetaLineC(i)}</div>
      <span class="sm-watch">${isPaidC(it) ? "Купить подписку" : "Смотреть"}</span>
    </div>
  </a>`;
}
function renderProgShows() {
  const el = document.getElementById("progShows");
  if (!el) return;
  const v2 = getMode() === "v2";
  const nBig = v2 ? 6 : 3, nSmall = v2 ? 12 : 5;
  el.innerHTML = `
    <h2 class="gal-head">ТВ шоу <span class="chev">›</span></h2>
    <div class="show-rows">
      <div class="show-hero">${Array.from({ length: nBig }, () => '<div class="show-big is-loading"></div>').join("")}</div>
      <div class="show-strip">${Array.from({ length: nSmall }, () => '<div class="show-small is-loading"></div>').join("")}</div>
    </div>`;
  Promise.all([
    collection("realiti-shou", { to: 20 }).catch(() => []),
    collection("popular-now-tvshows", { to: 30 }).catch(() => []),
  ]).then(([a, b]) => {
    const seen = new Set(), items = [];
    [...a, ...b].forEach((it) => { const k = it.id || it.hru; if (!seen.has(k)) { seen.add(k); items.push(it); } });
    if (!items.length) throw new Error("пусто");
    const big = items.slice(0, nBig), small = items.slice(nBig, nBig + nSmall);
    el.querySelector(".show-hero").innerHTML = big.map((it, i) => showCardC(it, "show-big", 760, 428, i)).join("");
    el.querySelector(".show-strip").innerHTML = small.map((it, i) => showCardC(it, "show-small", 480, 270, i + nBig)).join("");
  }).catch((err) => { el.querySelector(".show-hero").innerHTML = `<div class="reco-error">Не удалось загрузить: ${err.message}</div>`; });
}
renderProgShows();
window.addEventListener("modechange", renderProgShows);

// ---- Самое интересное (навигационные плитки) ----
const collections = ["Линия сборки", "Лучшие сериалы в подписке", "Хиты кинопроката", "Добрые мультфильмы", "Выбор Иви"];
document.getElementById("collectionsRail").innerHTML = collections
  .map((c) => `<div class="collection"><div class="collection-art"></div><div class="collection-cap">${c}</div></div>`)
  .join("");

// ---- Переключатель «Телепрограмма» ----
const toggle = document.getElementById("tvToggle");
toggle.addEventListener("click", () => {
  const on = toggle.classList.toggle("is-on");
  toggle.setAttribute("aria-checked", String(on));
});
