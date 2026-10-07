import {
  tvChannels, channelThumb, channelCover, nowOnChannel, telecastThumb,
  mskTime, HOME_TABS, filterByTag, demoSchedule,
  collection, poster, accessLabel,
} from "./ivi-api.js";

const grid = document.getElementById("channelGrid");
const gridTitle = document.getElementById("gridTitle");
const tabsEl = document.getElementById("tabs");

let channels = [];
let activeTab = 0;
let day = 0; // 0 — сегодня, 1 — завтра
const getDevice = () => document.documentElement.getAttribute("data-device") || "desktop";
const nowCache = new Map();
const loadNow = (id) => {
  if (!nowCache.has(id)) nowCache.set(id, nowOnChannel(id).catch(() => null));
  return nowCache.get(id);
};

// ---- Табы категорий ----
tabsEl.innerHTML = HOME_TABS.map(
  (t, i) => `<button class="tab${i === 0 ? " is-active" : ""}" data-i="${i}">${t.label}</button>`
).join("");
tabsEl.addEventListener("click", (e) => {
  const b = e.target.closest(".tab");
  if (!b) return;
  activeTab = +b.dataset.i;
  tabsEl.querySelectorAll(".tab").forEach((t) => t.classList.toggle("is-active", t === b));
  renderTab();
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
const rowHtml = (t, title) =>
  `<div class="sched-row"><span class="sched-time">${t}</span><span class="sched-title">${title}</span></div>`;

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
      <div class="poster"><img class="poster-img-el" loading="lazy" src="${channelCover(ch)}" alt=""></div>
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

  if (day === 1) {
    schedEl.innerHTML = cardDemo(ch.id % 97, 5, 6).map((r) => rowHtml(r[0], r[1])).join("");
    return;
  }

  try {
    const tc = await loadNow(ch.id);
    if (day !== 0) return; // пока грузилось, переключили на завтра
    if (!tc) { schedEl.innerHTML = rowHtml("", "Нет данных об эфире"); return; }
    const restrict = tc.restrict ?? 16;
    const rows = [[mskTime(tc.start), tc.title], ...demoSchedule(tc.end, restrict, 4).map((r) => [r.time, r.title])];
    schedEl.innerHTML = rows.map((r) => rowHtml(r[0], r[1])).join("");
    // Обложка «сегодня» — кадр текущей передачи (как постер в макете),
    // чтобы не дублировать брендовую плашку из логотипа.
    const img = grid.querySelector(`.card[data-id="${ch.id}"] .poster-img-el`);
    const thumb = telecastThumb(tc);
    if (img && thumb) img.src = thumb;
  } catch {
    schedEl.innerHTML = rowHtml("", "Эфир недоступен");
  }
}

// Мобильная карточка канала: обложка + название + «Бесплатно/Подписка».
function mobileCard(ch) {
  const access = ch.is_paid ? "Подписка" : "Бесплатно";
  return `<a class="mcard" href="player.html?id=${ch.id}">
    <div class="mcard-cover"><img loading="lazy" src="${channelCover(ch, 300, 170)}" alt=""></div>
    <div class="mcard-name">${ch.title}</div>
    <div class="mcard-access">${access}</div>
  </a>`;
}

function renderTab() {
  const tab = HOME_TABS[activeTab];
  gridTitle.innerHTML = `${tab.heading} <span class="chev">›</span>`;
  const list = filterByTag(channels, tab.tag);
  if (!list.length) { grid.innerHTML = `<div class="grid-empty">В этой категории нет каналов</div>`; return; }
  if (getDevice() === "mobile") {
    grid.innerHTML = list.map(mobileCard).join("");
  } else {
    grid.innerHTML = list.map(channelCard).join("");
    list.forEach(fillCard);
  }
}

function applyDeviceTitle() {
  const t = document.querySelector(".page-title");
  if (t) t.textContent = getDevice() === "mobile" ? "ТВ онлайн" : "Программа передач на сегодня";
}
window.addEventListener("devicechange", () => {
  applyDeviceTitle();
  if (channels.length) renderTab();
});

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
applyDeviceTitle();

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

// ---- ТВ шоу: реальные постеры из подборки Иви ----
const showsRail = document.getElementById("showsRail");
showsRail.classList.add("rail-posters");
showsRail.innerHTML = Array.from({ length: 8 }, () => '<div class="poster-card is-loading"><span class="poster-img"></span></div>').join("");
collection("popular-now-tvshows", { to: 11 })
  .then((items) => {
    showsRail.innerHTML = items.map((it) => `
      <a class="poster-card" href="https://www.ivi.ru/watch/${it.hru || it.id}" target="_blank" rel="noopener">
        <span class="poster-img">${poster(it) ? `<img loading="lazy" src="${poster(it)}" alt="">` : ""}</span>
        <span class="poster-name">${it.title}</span>
        <span class="poster-access">${accessLabel(it)}</span>
      </a>`).join("");
  })
  .catch((err) => { showsRail.innerHTML = `<div class="reco-error">Не удалось загрузить: ${err.message}</div>`; });

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
