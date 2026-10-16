import {
  tvChannels, channelThumb, channelCover, nowOnChannel, telecastThumb,
  mskTime, HOME_TABS, TABS, filterByTag, demoSchedule,
  collection, poster, accessLabel, contentThumb, isPaidChannel, RUBLE_SVG,
} from "./ivi-api.js";

// Угловой значок постера: платный канал — рубль (с тултипом), иначе лайк-сердечко.
const cornerBadge = (ch) => isPaidChannel(ch)
  ? `<span class="poster-like poster-paid" data-tip="Платный канал" aria-label="Платный канал">${RUBLE_SVG}</span>`
  : `<span class="poster-like${isFav(ch.id) ? " is-fav" : ""}" role="button" aria-label="Лайк канала" data-tip="Лайк канала">${HEART_SVG}</span>`;

const grid = document.getElementById("channelGrid");
const gridTitle = document.getElementById("gridTitle");
const tabsEl = document.getElementById("tabs");

// PiP «ТВ онлайн» — рисуем ПЕРВЫМ делом (до построения сетки каналов), чтобы окошко
// появлялось сразу, без задержки на прогрузку страницы. Крепим к <body> (а не к .page
// внутри .app-shell), чтобы оно было прибито к экрану и не уезжало при открытии
// контролов прототипа сверху.
(function setupV4bPip() {
  let mode = "asis", thumb = "", title = "";
  try {
    mode = localStorage.getItem("ivi-proto-mode") || "asis";
    thumb = localStorage.getItem("v4bCurrentThumb") || "";
    title = localStorage.getItem("v4bCurrentTitle") || "Прямой эфир";
  } catch {}
  if (!["v4b", "v4c", "v4d", "v4e", "v4f"].includes(mode) || !thumb) return;
  const pip = document.createElement("div");
  pip.className = "v4b-pip";
  pip.innerHTML = `<img class="v4b-pip-bg" src="${thumb}" alt=""><video class="v4b-pip-vid" muted loop autoplay playsinline preload="auto" src="assets/channel-preview.mov"></video><span class="v4b-pip-grad"></span>
    <span class="v4b-pip-title">${title}</span>
    <button class="v4b-pip-expand" aria-label="Скрыть">
      <svg viewBox="0 0 20 20" width="16" height="16"><path fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" d="M5 5l10 10M15 5l-10 10"/></svg>
    </button>`;
  document.body.appendChild(pip);
  pip.querySelector(".v4b-pip-expand").addEventListener("click", (e) => { e.stopPropagation(); pip.remove(); });
  pip.addEventListener("click", () => {
    try { sessionStorage.setItem("v4bPipBack", "1"); } catch {}
    location.href = "index.html";
  });
})();

let channels = [];
let day = 0; // 0 — сегодня, 1 — завтра
const getDevice = () => document.documentElement.getAttribute("data-device") || "desktop";
// As is — 5 табов; Вариант 1 — полный список (8).
const getMode = () => document.documentElement.getAttribute("data-mode") || "asis";
const variant = () => document.documentElement.getAttribute("data-variant") || "asis";
const isV1like = () => ["v1", "v2", "v3"].includes(getMode());
const isV4c = () => ["v4c", "v4d", "v4e", "v4f"].includes(document.documentElement.getAttribute("data-copy"));
const copy = () => document.documentElement.getAttribute("data-copy");
// Вариант 1 (v4e) — «Вся телепрограмма» открывается шторкой справа.
const isV4eOnly = () => copy() === "v4e";
// Вариант 2 (v4f) — без страницы «все каналы»: сразу программа одного канала,
// сверху фильтры (категория + дата) и лента каналов (как screenshot 18/19).
const isV4f = () => copy() === "v4f";
const isV4any = () => ["v4d", "v4e", "v4f"].includes(copy());
// В Вариантах после «Все каналы» добавляем «Мои каналы» (как в каталоге).
const MY_TAB = { label: "Мои каналы", tag: "__my", heading: "Мои каналы" };
// Вариант 3 (эмодзи-табы) — без «Мои каналы», как на ТВ онлайн.
const emojiTabs = () => document.documentElement.hasAttribute("data-emojitabs");
const tabList = () => (emojiTabs() ? TABS : isV4any() ? [TABS[0], MY_TAB, ...TABS.slice(1)] : isV1like() ? TABS : HOME_TABS);
// «Федеральные»: в Вариантах сместилась на индекс 3 (Все, Мои, Развлек., Федеральные).
const defaultTab = () => (emojiTabs() ? 2 : isV4any() ? 3 : isV1like() ? 2 : 0);
let activeTab = defaultTab();
const nowCache = new Map();
const loadNow = (id) => {
  if (!nowCache.has(id)) nowCache.set(id, nowOnChannel(id).catch(() => null));
  return nowCache.get(id);
};

// Кадры реального контента — для обложки во всплывающей карточке (не на самой странице).
let covers = [];
collection("popular-now-tvshows", { to: 30 })
  .then((items) => { covers = items.map((it) => contentThumb(it, 672, 378)).filter(Boolean); })
  .catch(() => {});

// ---- Дата: первый таб-дропдаун «Сегодня» (иконка слева, текст справа) ----
const CAL_ICON = '<svg viewBox="0 0 20 20" width="18" height="18"><path transform="translate(1 0)" fill="currentColor" d="M17 10C17.553 10 18 10.447 18 11L18 11.207C18 15.005 18 17.097 16.729 18.448C15.47 19.784 13.42 20 9 20C4.58 20 2.531 19.784 1.271 18.448C-0.001 17.097 0 15.005 0 11.207L0 11C0 10.447 0.447 10 1 10C1.553 10 2 10.447 2 11L2 11.207C2 14.386 1.999 16.304 2.728 17.077C3.462 17.857 5.416 18 9 18C12.584 18 14.539 17.857 15.273 17.077C16.001 16.304 16 14.386 16 11.207L16 11C16 10.447 16.447 10 17 10ZM13 0C13.553 0 14 0.447 14 1L14 2.274C16.745 2.768 17.799 4.112 17.958 7.706C17.972 8.044 17.847 8.376 17.615 8.618C17.383 8.861 17.056 9 16.719 9L1.281 9C0.944 9 0.617 8.861 0.385 8.618C0.152 8.376 0.027 8.044 0.042 7.708C0.201 4.112 1.255 2.768 4 2.275L4 1C4 0.447 4.447 0 5 0C5.553 0 6 0.447 6 1L6 2.063C6.881 2.016 7.871 2 9 2C10.129 2 11.119 2.016 12 2.063L12 1C12 0.447 12.447 0 13 0ZM9 4C7.8 4 6.815 4.019 6 4.066L6 5C6 5.553 5.553 6 5 6C4.447 6 4 5.553 4 5L4 4.319C2.434 4.695 2.177 5.471 2.08 7L15.92 7C15.823 5.471 15.566 4.695 14 4.319L14 5C14 5.553 13.553 6 13 6C12.447 6 12 5.553 12 5L12 4.066C11.185 4.019 10.2 4 9 4Z"/></svg>';
const WD_FULL = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
let activeDate = 0; // 0 — сегодня; диапазон -1..+7 (из прошедших только «Вчера»)
let nowMode = false; // фильтр «Сейчас» — только текущая передача + 2 следующие
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
  const nowItem = `<button class="td-item${nowMode ? " is-active" : ""}" data-off="now">
      <span class="td-day">Сейчас</span><span class="td-num">эфир</span></button>`;
  const items = nowItem + Array.from({ length: 9 }, (_, i) => {
    const off = i - 1; const d = new Date(today); d.setDate(today.getDate() + off);
    return `<button class="td-item${!nowMode && off === activeDate ? " is-active" : ""}" data-off="${off}">
      <span class="td-day">${dateLabel(off)}</span><span class="td-num">${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}</span></button>`;
  }).join("");
  return `<div class="tab-date" tabindex="0">
    <span class="tab-date-btn">${CAL_ICON}<span class="tab-date-label">${nowMode ? "Сейчас" : dateLabel(activeDate)}</span><span class="tab-date-caret"><svg viewBox="0 0 16 6" width="12" height="5"><path fill="currentColor" d="M16 1.593L8.978 5.733C8.376 6.088 7.624 6.088 7.022 5.733L0 1.593L0.978 0L8 4.141L15.023 0L16 1.593Z"/></svg></span></span>
    <div class="tab-date-menu">${items}</div>
  </div>`;
}

// ---- Табы категорий ----
// v3 — в табе мини-кластер обложек (как на «ТВ онлайн»): передний постер реальный,
// задний заглушкой, если каналов мало. Вид табов сохраняется и здесь.
function tabThumbs(tag) {
  const list = (tag ? filterByTag(channels, tag) : channels).slice(0, 1);
  if (!list.length) return "";
  // Передний постер — реальный; задний всегда заглушка-«загрузка».
  return `<span class="tab-thumbs"><span class="tt-back tt-stub"></span><img class="tt-front" src="${channelThumb(list[0])}" alt=""></span>`;
}
// Вариант 4 — табы один в один с экраном «ТВ онлайн»: пилюли с 3D-иконками из ассетов макета.
const PA = "https://app.paper.design/file-assets/01M45XC9MW0NZTHRFA799G9DJ7/";
const V4_ICONS = [
  "7EVWJDB6PBT28KDSSC3PH96E1S.png", "0RDPVAP149TBKN1HCEWFY22TMZ.png", "2XC1VP5CCM1FV3BE4FZAMYSRXE.png",
  "1EYZ403CGV9K2JCKV0K6N3690X.png", "6B5AEQ8DSPK6GB6CK57HZKW888.png", "7EVWJDB6PBT28KDSSC3PH96E1S.png",
  "2ERF6A2CP700JTDER437N3ZP1X.png", "32KXEE3KPBB0PJNHY4N6BF602N.png",
];
const v4Icon = (i) => `<span class="tab-emoji"><img src="${PA}${V4_ICONS[i % V4_ICONS.length]}" alt="" loading="lazy"></span>`;
function renderTabs() {
  const v4 = variant() === "v4" || document.documentElement.hasAttribute("data-emojitabs"); // Вариант 3 — тоже эмодзи-табы
  const v3 = getMode() === "v3" && variant() !== "v2" && !v4;
  tabsEl.innerHTML = dateTab() + tabList()
    .map((t, i) => v4
      ? `<button class="tab${i === activeTab ? " is-active" : ""}" data-i="${i}">${t.label}${v4Icon(i)}</button>`
      : `<button class="tab${i === activeTab ? " is-active" : ""}" data-i="${i}">${t.label}${v3 ? tabThumbs(t.tag) : ""}</button>`)
    .join("");
}
renderTabs();
tabsEl.addEventListener("click", (e) => {
  const di = e.target.closest(".td-item");
  if (di) {
    nowMode = di.dataset.off === "now";
    if (!nowMode) activeDate = +di.dataset.off;
    const label = tabsEl.querySelector(".tab-date-label");
    if (label) label.textContent = nowMode ? "Сейчас" : dateLabel(activeDate);
    tabsEl.querySelectorAll(".td-item").forEach((b) => b.classList.toggle("is-active", b === di));
    day = nowMode || activeDate === 0 ? 0 : 1;
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
// Правдоподобная сетка дня (по дейпартам) для будущих дней — реальные названия
// российского ТВ в соответствующее время. Детерминированно варьируем по каналу.
const DAY_SLOTS = [
  ["06:00", 6, ["Доброе утро", "Утро России", "Настроение", "Телеканал «Доброе утро»"]],
  ["09:25", 12, ["Жить здорово!", "О самом главном", "Чудо техники", "По секрету всему свету"]],
  ["10:30", 12, ["Модный приговор", "Судьба человека", "Доктор Мясников", "Тест на отцовство"]],
  ["12:00", 16, ["Давай поженимся!", "Андрей Малахов. Прямой эфир", "ДНК", "Понять. Простить"]],
  ["14:15", 16, ["Время покажет", "60 минут", "Место встречи", "Вести. Дежурная часть"]],
  ["17:00", 16, ["Мужское / Женское", "Малахов", "Жди меня", "Говорим и показываем"]],
  ["19:00", 16, ["Пусть говорят", "Поле чудес", "Привет, Андрей!", "Кто хочет стать миллионером?"]],
  ["21:00", 16, ["Время", "Вести недели", "Сегодня вечером", "Итоги недели"]],
  ["22:10", 18, ["Премьера сезона. Сериал", "Большое кино: детектив", "Вечерний Ургант", "Голос"]],
  ["00:20", 18, ["Подкаст.Лаб", "Док-ток", "Большая игра", "Ночные новости"]],
];
// Готовая сетка на будущий день для карточки канала. Поворачиваем пулы на индекс
// канала (idx), чтобы соседние каналы не совпадали и у каждого была своя сетка.
function futureDayRows(chId, idx, count) {
  const maxIvi = chId % 2 === 0 ? (chId % 3 === 0 ? 2 : 1) : 0;
  let iviCnt = 0;
  return DAY_SLOTS.slice(0, count).map(([t, age, pool], i) => {
    const r = { t, ttl: `${pool[(idx + i) % pool.length]}, ${age}+` };
    r.ivi = iviCnt < maxIvi && ((chId * 31 + i * 17) % 10 < 5);
    if (r.ivi) iviCnt++;
    return r;
  });
}
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
const rowHtml = (t, title, now = false, ivi = false, past = false) =>
  `<div class="sched-row${now ? " is-now" : ""}${past ? " is-past" : ""}"${ivi ? ' data-ivi="1"' : ""}>` +
  `<span class="sched-time">${t}</span>` +
  `<span class="sched-title${past ? " muted" : ""}">${title}</span>` +
  `${ivi ? '<span class="sched-ivi">есть на Иви</span>' : ""}</div>`;
// Две уже завершившиеся передачи перед текущей (демо, v3).
function pastRows(startISO, restrict) {
  const start = new Date(startISO);
  const t2 = new Date(start.getTime() - 30 * 60000);
  const t1 = new Date(t2.getTime() - 35 * 60000);
  const n1 = DEMO[(start.getMinutes() + 3) % DEMO.length];
  const n2 = DEMO[(start.getMinutes() + 9) % DEMO.length];
  return [[mskTime(t1.toISOString()), `${n1}, ${restrict}+`], [mskTime(t2.toISOString()), `${n2}, ${restrict}+`]];
}
const pluralMin = (n) => {
  const a = n % 100, b = n % 10;
  if (a >= 11 && a <= 14) return "минут";
  if (b === 1) return "минута";
  if (b >= 2 && b <= 4) return "минуты";
  return "минут";
};
const pluralHour = (n) => {
  const a = n % 100, b = n % 10;
  if (a >= 11 && a <= 14) return "часов";
  if (b === 1) return "час";
  if (b >= 2 && b <= 4) return "часа";
  return "часов";
};
const fmtLeft = (min) => {
  if (min >= 60) {
    const h = Math.floor(min / 60), m = min % 60;
    return `ещё ${h} ${pluralHour(h)}${m ? ` ${m} ${pluralMin(m)}` : ""}`;
  }
  return `ещё ${min} ${pluralMin(min)}`;
};
// Избранные каналы (общий ключ со страницей ТВ онлайн) — лайк на постере.
const FAV_KEY = "ivi-fav-channels";
const getFavs = () => { try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]").map(String); } catch { return []; } };
const isFav = (id) => getFavs().includes(String(id));
function toggleFav(id) {
  const favs = getFavs();
  const i = favs.indexOf(String(id));
  if (i >= 0) favs.splice(i, 1); else favs.unshift(String(id));
  try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch {}
  return i < 0;
}
const HEART_SVG = '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';

// ---- Карточка канала ----
const skeletonRows = () =>
  Array.from({ length: 5 }, () => rowHtml("—", "…")).join("");

function channelCard(ch) {
  const v4c = isV4c();
  // Вариант 3 (макет 1295): в большом постере — кадр текущей передачи (ставится в
  // fillCard), ниже — строка с лого и названием канала, затем расписание.
  const chanRow = v4c
    ? `<div class="card-chan"><span class="card-chan-logo"><img loading="lazy" src="${channelThumb(ch)}" alt=""></span><span class="card-chan-name">${ch.title}</span></div>`
    : "";
  return `<article class="card${v4c ? " card-v4c" : ""}" data-id="${ch.id}">
    <a class="card-body" href="index.html?ch=${ch.id}">
      <div class="poster">
        <img class="poster-img-el" loading="lazy" src="${channelCover(ch)}" alt="${ch.title}">
        <span class="poster-left" data-left="${ch.id}" hidden></span>
        ${v4c ? `<span class="v4c-pgrad"></span><span class="v4c-pt" data-pt="${ch.id}"></span><span class="v4c-pm" data-pm="${ch.id}" hidden></span>` : ""}
        ${cornerBadge(ch)}
        <div class="prog-line" data-prog="${ch.id}" hidden><span class="prog-fill"></span></div>
      </div>
      ${chanRow}
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
    // Будущий день — правдоподобная сетка по дейпартам (реальные названия + «есть на Иви»).
    const idx = channels.findIndex((c) => c.id === ch.id);
    const rows = futureDayRows(ch.id, idx < 0 ? 0 : idx, 8);
    schedEl.innerHTML = rows.map((r) => rowHtml(r.t, r.ttl, false, r.ivi, false)).join("");
    return;
  }

  try {
    const tc = await loadNow(ch.id);
    if (day !== 0) return; // пока грузилось, переключили на завтра
    if (!tc) { schedEl.innerHTML = rowHtml("", "Нет данных об эфире"); return; }
    const restrict = tc.restrict ?? 16;
    const upcoming = demoSchedule(tc.end, restrict, 6).map((r) => [r.time, r.title, false]);
    if (getMode() === "v3") {
      // «Сейчас» всегда середина дня (13:00) — без привязки к реальному времени.
      const PAST_T = ["12:25"];
      const UP_T = ["13:40", "14:25", "15:10", "16:05", "17:20", "18:40"];
      const nm = (k) => `${DEMO[(ch.id * 7 + k * 13) % DEMO.length]}, ${restrict}+`;
      // Фильтр «Сейчас» — только текущая передача + 2 следующие (без прошедших).
      const rows = nowMode ? [
        { t: "13:00", ttl: tc.title, now: true, past: false },
        ...UP_T.slice(0, 3).map((t, i) => ({ t, ttl: nm(i + 3), now: false, past: false })),
      ] : [
        ...PAST_T.map((t, i) => ({ t, ttl: nm(i + 1), now: false, past: true })),
        { t: "13:00", ttl: tc.title, now: true, past: false },
        ...UP_T.map((t, i) => ({ t, ttl: nm(i + 3), now: false, past: false })),
      ];
      // чип «есть на Иви» — максимум 1–2 на канал (у части каналов — ноль).
      const maxIvi = ch.id % 2 === 0 ? (ch.id % 3 === 0 ? 2 : 1) : 0;
      let iviCnt = 0;
      rows.forEach((r, i) => {
        r.ivi = !r.past && iviCnt < maxIvi && ((ch.id * 31 + i * 17) % 10 < 5);
        if (r.ivi) iviCnt++;
      });
      schedEl.innerHTML = rows.map((r) => rowHtml(r.t, r.ttl, r.now, r.ivi, r.past)).join("");
    } else {
      let rows = [[mskTime(tc.start), tc.title, true], ...upcoming];
      if (nowMode) rows = rows.slice(0, 4); // текущая + 3 следующие
      schedEl.innerHTML = rows.map((r) => rowHtml(r[0], r[1], r[2])).join("");
    }
    // Вариант 3 — в большом постере кадр передачи, которая сейчас в эфире (макет 1295).
    if (isV4c()) {
      const posterImg = grid.querySelector(`.card[data-id="${ch.id}"] .poster-img-el`);
      const still = telecastThumb(tc);
      if (posterImg && still) posterImg.src = still;
      // Название передачи слева снизу (как в PiP) + чипс «ещё N мин» справа снизу.
      const pt = grid.querySelector(`.v4c-pt[data-pt="${ch.id}"]`);
      if (pt) pt.textContent = tc.title;
      const pm = grid.querySelector(`.v4c-pm[data-pm="${ch.id}"]`);
      const min = tc.end ? Math.round((new Date(tc.end) - Date.now()) / 60000) : 0;
      if (pm && min > 0 && min < 600) { pm.textContent = fmtLeft(min); pm.hidden = false; }
    }
    // Вариант 3 — таймлайн под постером: середина эфира (без привязки к реальному времени).
    const line = grid.querySelector(`.prog-line[data-prog="${ch.id}"]`);
    if (line && getMode() === "v3" && tc.start && tc.end) {
      line.querySelector(".prog-fill").style.width = "45%";
      line.hidden = false;
    }
  } catch {
    schedEl.innerHTML = rowHtml("", "Эфир недоступен");
  }
}

function renderTab() {
  const tab = tabList()[activeTab];
  if (isV4f()) { renderV4f(tab); return; }
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

// ---- Поповер-превью передачи при наведении (только v3) ----
// Показываем сбоку от карточки: обложку (та же, что на постере) + описание (3 строки)
// + длительность + крупную кнопку «Смотреть на Иви».
const POP_DESC = "Сюжет разворачивается вокруг героев, чьи судьбы неожиданно переплетаются. Драматичные повороты, яркие характеры и финал, который держит до последней минуты.";
const POP_DUR = "1 ч 20 мин";
let pop, dim, raisedCard;
function schedPop() {
  if (pop) return pop;
  pop = document.createElement("div");
  pop.className = "sched-pop";
  document.body.appendChild(pop);
  return pop;
}
// Затемнение фона, пока открыт поповер (кроме карточки канала и самого поповера).
// Клик по затемнению закрывает карточку.
function schedDim() {
  if (!dim) {
    dim = document.createElement("div"); dim.className = "sched-dim";
    dim.addEventListener("click", hidePop);
    document.body.appendChild(dim);
  }
  return dim;
}
function hidePop() {
  if (pop) pop.classList.remove("is-open");
  if (dim) dim.classList.remove("is-open");
  if (raisedCard) { raisedCard.classList.remove("is-raised"); raisedCard = null; }
}
function showPop(row) {
  const card = row.closest(".card");
  schedDim().classList.add("is-open");
  if (raisedCard && raisedCard !== card) raisedCard.classList.remove("is-raised");
  if (card) { card.classList.add("is-raised"); raisedCard = card; }
  // Обложка поповера — кадр реального контента (не логотип канала), детерминированно по строке.
  const idx = [...grid.querySelectorAll(".sched-row")].indexOf(row);
  const cover = covers.length ? covers[(idx < 0 ? 0 : idx) % covers.length]
    : (card?.querySelector(".poster-img-el")?.src || "");
  const title = row.querySelector(".sched-title")?.textContent || "";
  // Кнопка «Смотреть на Иви» — только если контент есть на Иви; мета показываем всегда.
  const hasIvi = row.dataset.ivi === "1";
  const p = schedPop();
  // Кнопка снизу всегда: «Смотреть на Иви» (красная) для Иви-контента, иначе «О программе» (серая).
  const btn = hasIvi
    ? '<a class="sp-btn" href="https://www.ivi.ru/" target="_blank" rel="noopener">Смотреть на Иви</a>'
    : '<button class="sp-btn sp-btn-gray" type="button">О программе</button>';
  p.innerHTML = `
    <img class="sp-cover" src="${cover}" alt="">
    <div class="sp-body">
      <div class="sp-ttl">${title}</div>
      <div class="sp-desc">${POP_DESC}</div>
      <div class="sp-dur">${POP_DUR}</div>
      ${btn}
    </div>`;
  // По высоте — по центру экрана, по горизонтали — рядом с родительской карточкой
  // (справа, при нехватке места — слева).
  const cr = (card || row).getBoundingClientRect();
  const rowR = row.getBoundingClientRect();
  const W = 320, gap = 12;
  let left = cr.right + gap;
  if (left + W > window.innerWidth - 8) left = cr.left - W - gap;
  left = Math.max(8, left);
  p.style.left = left + "px";
  p.style.transform = "translateY(-50%)";
  p.classList.add("is-open");
  // По вертикали — по центру относительно СТРОКИ, по которой кликнули (а не всей карточки),
  // с подгоном, чтобы поповер не выходил за края экрана.
  const popH = p.offsetHeight || 360;
  let top = rowR.top + rowR.height / 2;
  top = Math.max(8 + popH / 2, Math.min(top, window.innerHeight - 8 - popH / 2));
  p.style.top = top + "px";
  // Перезапускаем анимацию появления на каждый показ (в т.ч. при смене передачи).
  p.style.animation = "none";
  void p.offsetWidth;
  p.style.animation = "";
}
const realRow = (r) => r && !["…", "—", ""].includes(r.querySelector(".sched-title")?.textContent.trim());
// Клик по сердечку на постере — добавить/убрать канал из избранного (не открывая канал).
grid.addEventListener("click", (e) => {
  const like = e.target.closest(".poster-like");
  if (!like) return;
  e.preventDefault(); e.stopPropagation();
  if (like.classList.contains("poster-paid")) return; // платный значок — не лайкаем
  const card = like.closest("[data-id]");
  if (card) like.classList.toggle("is-fav", toggleFav(card.dataset.id));
}, true);
// Тултип над значком (лайк / платный канал).
let likeTip = null;
function showLikeTip(el) {
  if (!likeTip) {
    likeTip = document.createElement("div");
    likeTip.className = "like-tip";
    likeTip.innerHTML = '<span class="like-tip-box"></span>';
    document.body.appendChild(likeTip);
  }
  likeTip.querySelector(".like-tip-box").textContent = el.dataset.tip || "Лайк канала";
  const r = el.getBoundingClientRect();
  likeTip.style.left = (r.left + r.width / 2) + "px";
  likeTip.style.top = r.top + "px";
  likeTip.classList.add("is-on");
}
const hideLikeTip = () => likeTip?.classList.remove("is-on");
grid.addEventListener("mouseover", (e) => { const l = e.target.closest(".poster-like"); if (l) showLikeTip(l); });
grid.addEventListener("mouseout", (e) => { const l = e.target.closest(".poster-like"); if (l && !l.contains(e.relatedTarget)) hideLikeTip(); });
// Поповер о передаче открывается по КЛИКУ (а не по наведению).
grid.addEventListener("click", (e) => {
  if (getMode() !== "v3") return;
  const row = e.target.closest?.(".sched-row");
  if (realRow(row)) { e.preventDefault(); showPop(row); }
});
window.addEventListener("keydown", (e) => { if (e.key === "Escape") hidePop(); });

// ---- Загрузка каналов ----
// Вариант 1: пришли из плеера — листаем к выбранному каналу и подсвечиваем его кнопку.
function scrollToSelectedChannel(id) {
  const card = grid.querySelector(`.card[data-id="${id}"]`);
  if (!card) return;
  card.querySelector(".allprog")?.classList.add("is-selected");
  // Сетка дорастает по мере загрузки постеров — повторяем прокрутку, чтобы попасть точно.
  const doScroll = () => card.scrollIntoView({ block: "center" });
  requestAnimationFrame(doScroll);
  setTimeout(doScroll, 400);
  setTimeout(doScroll, 1200);
}
(async function init() {
  grid.innerHTML = `<div class="grid-empty">Загружаем каналы Иви…</div>`;
  try {
    channels = await tvChannels();
    // Выбранный на плеере канал (Вариант 1): показываем «Все каналы», чтобы он точно был в списке.
    let seekCh = null;
    if (isV4eOnly()) { try { seekCh = localStorage.getItem("v4bCurrentChannel"); } catch {} }
    if (seekCh) activeTab = 0;
    renderTabs(); // теперь есть каналы — наполняем мини-кластеры табов (v3)
    renderTab();
    if (seekCh) scrollToSelectedChannel(seekCh);
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
  // Вариант 3 — «ТВ шоу» свёрстаны как телеканалы (2 этажа 16:9 со скроллом).
  // ponytail: без стрелок-подсказок (грид и так скроллится), добавить если попросят.
  if (getMode() === "v3") {
    el.innerHTML = `<h2 class="gal-head">ТВ шоу <span class="chev">›</span></h2>
      <div class="gal-grid">${Array.from({ length: 12 }, () => '<div class="gal-cell"><div class="gal-thumb"></div></div>').join("")}</div>`;
    Promise.all([
      collection("realiti-shou", { to: 20 }).catch(() => []),
      collection("popular-now-tvshows", { to: 30 }).catch(() => []),
    ]).then(([a, b]) => {
      const seen = new Set(), items = [];
      [...a, ...b].forEach((it) => { const k = it.id || it.hru; if (!seen.has(k)) { seen.add(k); items.push(it); } });
      el.querySelector(".gal-grid").innerHTML = items.slice(0, 16).map((it) => `
        <div class="gal-cell"><a class="gal-thumb" href="https://www.ivi.ru/watch/${it.hru || it.id}" target="_blank" rel="noopener" title="${it.title}">
          <img class="gal-img" loading="lazy" src="${contentThumb(it, 760, 428)}" alt="${it.title}"></a></div>`).join("");
    }).catch(() => {});
    return;
  }
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

// ---- Самое интересное — блок убран (без постеров) ----

// ---- Переключатель «Телепрограмма» ----
const toggle = document.getElementById("tvToggle");
toggle.addEventListener("click", () => {
  const on = toggle.classList.toggle("is-on");
  toggle.setAttribute("aria-checked", String(on));
});

// ---- Вариант 2: плавающий PiP-плеер поверх страницы телепрограммы ----
// ---- Видео-превью эфира при наведении на постер канала (единый элемент) ----
const pgVideo = document.createElement("video");
pgVideo.className = "pg-hover-video";
pgVideo.muted = true; pgVideo.loop = true; pgVideo.playsInline = true; pgVideo.preload = "auto";
pgVideo.src = "assets/channel-preview.mov";
grid.addEventListener("mouseover", (e) => {
  const poster = e.target.closest(".poster");
  if (!poster || poster.contains(pgVideo)) return;
  poster.appendChild(pgVideo);
  requestAnimationFrame(() => pgVideo.classList.add("is-on"));
  pgVideo.play().catch(() => {});
});
grid.addEventListener("mouseout", (e) => {
  const poster = e.target.closest(".poster");
  if (!poster || !poster.contains(pgVideo)) return;
  if (poster.contains(e.relatedTarget)) return;
  pgVideo.classList.remove("is-on");
  pgVideo.pause();
});

// ---- Вариант 2 (v4e): «Вся телепрограмма» открывает канал не отдельной страницей,
// а шторкой, выезжающей справа (iframe со schedule.html). ----
const isV4e = () => ["v4e", "v4f"].includes(document.documentElement.getAttribute("data-copy"));
let schDrawer, schDim, schFrame;
function openSchDrawer(id) {
  if (!schDrawer) {
    schDim = document.createElement("div");
    schDim.className = "sched-drawer-dim";
    schDim.addEventListener("click", closeSchDrawer);
    schDrawer = document.createElement("div");
    schDrawer.className = "sched-drawer";
    schDrawer.innerHTML = `<button class="sched-drawer-close" aria-label="Закрыть"><svg viewBox="0 0 20 20" width="20" height="20"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M4 4l12 12M16 4L4 16"/></svg></button><iframe class="sched-drawer-frame" title="Телепрограмма канала"></iframe>`;
    schFrame = schDrawer.querySelector(".sched-drawer-frame");
    schDrawer.querySelector(".sched-drawer-close").addEventListener("click", closeSchDrawer);
    document.body.append(schDim, schDrawer);
  }
  schFrame.src = `schedule.html?id=${id}&embed=1`;
  // Форсируем начальный кадр (шторка за правым краем), затем открываем — слайд-ин.
  schDrawer.classList.remove("is-open"); schDim.classList.remove("is-open");
  void schDrawer.offsetWidth;
  schDim.classList.add("is-open");
  schDrawer.classList.add("is-open");
  document.documentElement.style.overflow = "hidden";
}
function closeSchDrawer() {
  if (!schDrawer) return;
  schDrawer.classList.remove("is-open");
  schDim.classList.remove("is-open");
  document.documentElement.style.overflow = "";
}
// Вариант 1 (v4e): клик по «Вся телепрограмма» открывает канал шторкой справа.
grid.addEventListener("click", (e) => {
  // Вариант 3 (тот же экран) — канал открывается отдельной страницей, не шторкой.
  if (!isV4eOnly() || localStorage.getItem("ivi-proto-mode") === "v3") return;
  const a = e.target.closest(".allprog");
  if (!a) return;
  e.preventDefault();
  const id = new URLSearchParams((a.getAttribute("href").split("?")[1]) || "").get("id");
  if (id) openSchDrawer(id);
});
window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSchDrawer(); });

// ---- Вариант 2 (v4f): лента каналов (screenshot 18) + программа канала во фрейме ----
let v4fId = null, v4fFrame = null;
function v4fDayParam() { return nowMode ? "now" : String(activeDate); }
function loadV4fFrame() {
  if (!v4fFrame || v4fId == null) return;
  v4fFrame.src = `schedule.html?id=${v4fId}&embed=1&v4f=1&day=${v4fDayParam()}`;
}
function markV4fActive() {
  document.querySelectorAll(".v4f-strip .v4d-chip").forEach((c) => {
    const on = String(c.dataset.id) === String(v4fId);
    c.classList.toggle("is-active", on);
    if (on) c.scrollIntoView({ block: "nearest", inline: "nearest" });
  });
}
const V4F_ARROW = '<svg viewBox="0 0 12 32" width="11" height="29"><path fill="currentColor" d="M11.607 14.626C12.131 15.461 12.131 16.539 11.607 17.374L2.425 32L0 30.352L9.01 16L0 1.648L2.425 0L11.607 14.626Z"/></svg>';
let v4fSyncFades = null;
function setupV4f() {
  if (document.querySelector(".v4f-strip-wrap")) return;
  const wrap = document.createElement("div");
  wrap.className = "v4f-strip-wrap";
  wrap.innerHTML = `<div class="v4f-rail">
      <div class="v4d-strip v4f-strip"></div>
      <div class="v4d-strip-fade l is-hidden"><span class="v4d-strip-arrow is-left">${V4F_ARROW}</span></div>
      <div class="v4d-strip-fade r is-hidden"><span class="v4d-strip-arrow">${V4F_ARROW}</span></div>
    </div>
    <div class="v4f-epg"><iframe class="v4f-frame" title="Программа канала"></iframe></div>`;
  document.querySelector(".tabs-bar").after(wrap);
  v4fFrame = wrap.querySelector(".v4f-frame");
  const strip = wrap.querySelector(".v4f-strip");
  strip.addEventListener("click", (e) => {
    const chip = e.target.closest(".v4d-chip");
    if (!chip) return;
    v4fId = chip.dataset.id;
    markV4fActive();
    loadV4fFrame();
  });
  // Стрелки + градиенты по краям ленты каналов (как у ленты в каталоге).
  const fadeL = wrap.querySelector(".v4d-strip-fade.l"), fadeR = wrap.querySelector(".v4d-strip-fade.r");
  fadeR.querySelector(".v4d-strip-arrow").addEventListener("click", () => strip.scrollBy({ left: strip.clientWidth * 0.8, behavior: "smooth" }));
  fadeL.querySelector(".v4d-strip-arrow").addEventListener("click", () => strip.scrollBy({ left: -strip.clientWidth * 0.8, behavior: "smooth" }));
  const sync = () => {
    const scrollable = strip.scrollWidth > strip.clientWidth + 4;
    fadeR.classList.toggle("is-hidden", !scrollable || strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 4);
    fadeL.classList.toggle("is-hidden", strip.scrollLeft <= 4);
  };
  strip.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", sync);
  v4fSyncFades = sync;
  // Залипание ленты вплотную под категориями (учитываем 8px-зазор сверху у табов).
  const setRailTop = () => {
    const bar = document.querySelector(".tabs-bar");
    wrap.querySelector(".v4f-rail").style.top = ((bar ? Math.round(bar.getBoundingClientRect().height) : 62) + 8) + "px";
  };
  setRailTop(); window.addEventListener("resize", setRailTop);
}
function renderV4f(tab) {
  setupV4f();
  const strip = document.querySelector(".v4f-strip");
  const list = filterByTag(channels, tab.tag);
  strip.innerHTML = list.map((c) => `<button class="v4d-chip" data-id="${c.id}">
    <span class="v4d-chip-logo"><img loading="lazy" src="${channelThumb(c)}" alt=""></span>
    <span class="v4d-chip-text">
      <span class="v4d-chip-name" data-prog="${c.id}">${c.title}</span>
      <span class="v4d-chip-bar"><i style="width:35%"></i></span>
    </span>
  </button>`).join("");
  if (!list.some((c) => String(c.id) === String(v4fId))) v4fId = list[0]?.id ?? null;
  markV4fActive();
  loadV4fFrame();
  v4fSyncFades?.();
  list.forEach((c) => loadNow(c.id).then((tc) => {
    if (!tc) return;
    const p = strip.querySelector(`.v4d-chip-name[data-prog="${c.id}"]`);
    if (p) p.textContent = tc.title;
  }));
}
// Прокрутка к текущему эфиру: ждём, пока фрейм дорастёт до полной высоты (страница
// станет достаточно длинной), и только тогда центрируем эфир с 1 прошедшей сверху.
let v4fPendingNowTop = null;
function v4fTryScrollNow() {
  if (v4fPendingNowTop == null || !v4fFrame) return;
  const frameTop = v4fFrame.getBoundingClientRect().top + window.scrollY;
  const bar = document.querySelector(".tabs-bar");
  const headH = (bar ? Math.round(bar.getBoundingClientRect().height) : 62) + 150; // липкие табы + ~1 прошедшая карточка
  const target = Math.max(0, frameTop + v4fPendingNowTop - headH);
  const maxY = document.scrollingElement.scrollHeight - window.innerHeight;
  if (maxY >= target - 2) { window.scrollTo({ top: target, behavior: "auto" }); v4fPendingNowTop = null; }
}
// Высоту фрейма подгоняем под его контент (schedule.js шлёт scrollHeight).
window.addEventListener("message", (e) => {
  if (!e.data || !v4fFrame) return;
  if (e.data.v4fHeight) { v4fFrame.style.height = e.data.v4fHeight + "px"; v4fTryScrollNow(); }
  if (e.data.v4fNowTop != null) { v4fPendingNowTop = e.data.v4fNowTop; v4fTryScrollNow(); }
});
