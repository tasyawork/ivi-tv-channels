import {
  tvChannels, channelTelecasts, nowOnChannel, mskTime,
  channelThumb, telecastThumb, demoSchedule, collection, contentThumb, showEpisodes, showPoster,
} from "./ivi-api.js";

// Днём — шоу «Мама в 16», вечером — сериал «Холод» (реальные компиляции Иви).
const MAMA_IN_16 = 19549;
const HOLOD = 18274;

const id = new URLSearchParams(location.search).get("id");
const $ = (x) => document.getElementById(x);

// Случайные описания передач (реальных синопсисов по эфиру Иви почти нет).
const DESCS = [
  "Острое ток-шоу, где эксперты и зрители без купюр обсуждают самые громкие события недели.",
  "Документальный цикл о людях, чьи судьбы изменили ход истории родной страны.",
  "Кулинарный поединок: шеф-повара со всей страны готовят блюда из одного секретного продукта.",
  "Познавательная программа о науке и технологиях простым языком для всей семьи.",
  "Утреннее шоу с новостями, прогнозом погоды и живыми гостями в студии.",
  "Реалити о парах, которые проходят испытания на прочность вдали от привычной жизни.",
  "Классика отечественного кино и разбор любимых фильмов вместе с критиками и актёрами.",
  "Спортивная аналитика: разбор ключевых матчей тура, интервью с тренерами и звёздами.",
];
// Жанр показываем у каждой передачи. «реалити шоу» зарезервирован для карточек «есть на Иви».
const GENRES = ["новости", "сериал", "фильм", "спортивная трансляция", "мультфильм", "ток-шоу", "документальный фильм", "новости"];
// Иконка «в эфире» — точно из макета UJS.
const BCAST = '<svg class="oa-ic" viewBox="0 0 20 20" width="16" height="16" xmlns="http://www.w3.org/2000/svg"><path transform="translate(0.008 2.583)" fill="currentColor" d="M4.629 1.481C2.96 2.996 2.002 5.159 2.002 7.415C2.002 9.673 2.96 11.835 4.633 13.35L3.288 14.833C1.2 12.939 4.342e-05 10.236 0 7.415C0 4.597 1.196 1.895 3.284 0L4.629 1.481ZM16.697 0C18.785 1.894 19.984 4.597 19.984 7.418C19.984 10.236 18.789 12.938 16.701 14.833L15.356 13.352C17.026 11.836 17.983 9.674 17.983 7.418C17.983 5.16 17.025 2.998 15.352 1.483L16.697 0ZM13.829 2.811C15.197 3.956 15.981 5.635 15.981 7.418C15.981 9.2 15.196 10.882 13.824 12.029L12.541 10.493C14.37 8.965 14.371 5.876 12.543 4.346L13.829 2.811ZM7.443 4.34C5.614 5.868 5.614 8.957 7.442 10.487L6.155 12.023C4.787 10.877 4.003 9.198 4.003 7.415C4.003 5.632 4.789 3.951 6.161 2.804L7.443 4.34ZM10.002 5.413C11.108 5.413 12.003 6.309 12.003 7.415C12.003 8.521 11.108 9.416 10.002 9.416C8.895 9.416 8 8.521 8 7.415C8 6.309 8.895 5.413 10.002 5.413Z"/></svg>';
const ARROW_SVG = '<svg viewBox="0 0 12 32" width="11" height="29"><path fill="currentColor" d="M11.607 14.626C12.131 15.461 12.131 16.539 11.607 17.374L2.425 32L0 30.352L9.01 16L0 1.648L2.425 0L11.607 14.626Z"/></svg>';
// Замок у номера серии — точно из макета V8K (шоу «Мама в 16»).
const LOCK_SVG = '<svg class="ep-lock" viewBox="0 0 9 12" width="9" height="12" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M7.5 5.527V3C7.5 1.345 6.155 0 4.5 0C2.845 0 1.5 1.345 1.5 3V5.527C0.412 5.893 0 6.728 0 8.625C0 11.738 1.1 12 4.5 12C7.9 12 9 11.738 9 8.625C9 6.728 8.588 5.893 7.5 5.527ZM3 3C3 2.173 3.673 1.5 4.5 1.5C5.327 1.5 6 2.173 6 3V5.285C5.557 5.259 5.063 5.25 4.5 5.25C3.937 5.25 3.442 5.259 3 5.285V3ZM4.5 10.5C1.5 10.5 1.5 10.5 1.5 8.625C1.5 6.75 1.5 6.75 4.5 6.75C7.5 6.75 7.5 6.75 7.5 8.625C7.5 10.5 7.5 10.5 4.5 10.5ZM4.5 7.5C4.085 7.5 3.75 7.835 3.75 8.25C3.75 8.665 4.085 9 4.5 9C4.915 9 5.25 8.665 5.25 8.25C5.25 7.835 4.915 7.5 4.5 7.5Z"/></svg>';
const EP_DATE = "6 августа";

const DEMO = [
  "Новости", "Утро в эфире", "Доброе утро", "Вести", "Контрольная закупка",
  "Жить здорово", "Модный приговор", "Давай поженимся", "Пусть говорят",
  "Время покажет", "Поле чудес", "Вечерние новости", "Док-ток",
  "Большая игра", "На самом деле", "Подкаст.Лаб", "Сегодня вечером",
];
const AGES = [0, 6, 12, 16, 18];
// Полный день — с первой программы в 00:00 и до вечера.
const GRID = [
  "00:00", "01:10", "02:30", "04:00", "05:30", "07:00", "08:30", "10:00",
  "11:30", "13:00", "14:30", "16:00", "17:30", "19:00", "20:30", "22:00", "23:30",
];
const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const pluralMin = (n) => {
  const a = n % 100, b = n % 10;
  if (a >= 11 && a <= 14) return "минут";
  if (b === 1) return "минута";
  if (b >= 2 && b <= 4) return "минуты";
  return "минут";
};

let channel = null;
let telecasts = [];
let covers = [];          // разные обложки из подборки Иви
let episodes = [];        // серии шоу «Мама в 16» (днём)
let seriesEps = [];       // серии сериала «Холод» (вечером)
let showCover = "";       // постер «Мама в 16» для обложки передачи (не дублирует кадр серии)
let seriesCover = "";     // постер «Холод» для обложки передачи
let realCover = "";
let activeDay = 0;
let firstRender = true;

// Полный день. «Сейчас» всегда середина дня (13:00) — без привязки к реальному времени.
// В каждом дне — 2 контента, доступных на Иви: днём шоу (13:00), вечером сериал (20:30).
function buildRows() {
  const seed = (channel.id % 97) + activeDay * 11;
  const nowI = GRID.indexOf("13:00");   // «сейчас» — середина дня
  const eveI = GRID.indexOf("20:30");   // вечером — сериал
  const rows = GRID.map((t, i) => ({
    time: t,
    title: `${DEMO[(seed * 5 + i * 7) % DEMO.length]}, ${AGES[(seed + i) % AGES.length]}+`,
    desc: DESCS[(seed + i) % DESCS.length],
    past: activeDay === 0 && i < nowI,
  }));
  // Днём — шоу «Мама в 16» (для сегодня ещё и «в эфире»).
  rows[nowI] = {
    ...rows[nowI], time: GRID[nowI], title: "Мама в 16, 16+",
    desc: "Реалити о юных мамах: как взрослеют вчерашние подростки, оказавшись с ребёнком на руках.",
    ivi: true, kind: "show", now: activeDay === 0, past: false,
    cover: showCover || null,
  };
  // Вечером — сериал «Холод», доступен на Иви.
  rows[eveI] = {
    ...rows[eveI], time: GRID[eveI], title: "Холод, 18+",
    desc: "Детективный сериал: следователь распутывает цепочку убийств в заснеженном северном городе.",
    ivi: true, kind: "series",
    cover: seriesCover || null,
  };
  return rows;
}

// Блок серий (макет V8K): днём — «Все выпуски шоу», вечером — «Все серии сериала».
// Кадры серий реальные (из компиляции Иви), иначе цветная заглушка.
// asc=true — серии по возрастанию (сериал), иначе по убыванию (шоу).
function renderSeries(eps, title, asc) {
  const list = eps && eps.length ? eps : Array.from({ length: 5 }, () => ({}));
  const n = list.length;
  const cards = list.map((it, i) => {
    const num = asc ? i + 1 : n - i;      // сериал — 1,2,3…; шоу — N…1
    const isNew = asc ? i === n - 1 : i === 0;  // «новая серия» — самая свежая
    const mins = it.duration ? Math.round(it.duration / 60) : (i === n - 1 ? 33 : 34);
    const href = it.id ? `https://www.ivi.ru/watch/${it.hru || it.id}` : "https://www.ivi.ru/";
    return `
    <a class="ep-card" href="${href}" target="_blank" rel="noopener">
      <div class="ep-poster">${it.still ? `<img loading="lazy" src="${it.still}" alt="">` : ""}<span class="ep-date">${it.date || EP_DATE}</span></div>
      <div class="ep-ttl"><span class="ep-num">Серия ${num}</span>${LOCK_SVG}</div>
      <div class="ep-sub">${isNew ? '<span class="ep-new">новая серия</span> ' : ""}${mins} мин</div>
    </a>`;
  }).join("");
  return `<div class="fe-series"><h3 class="fe-series-title">${title}</h3>` +
    `<div class="fe-series-wrap">` +
      `<span class="fe-ser-fade l"></span>` +
      `<button class="fe-ser-arrow fe-ser-left is-hidden" aria-label="Назад">${ARROW_SVG}</button>` +
      `<div class="fe-series-row">${cards}</div>` +
      `<button class="fe-ser-arrow fe-ser-right is-hidden" aria-label="Вперёд">${ARROW_SVG}</button>` +
      `<span class="fe-ser-fade r"></span>` +
    `</div></div>`;
}

// Стрелки + градиенты прокрутки серий: показываем ту сторону, в которую ещё можно скроллить.
function setupSeriesNav() {
  $("fullEpg").querySelectorAll(".fe-series-wrap").forEach((wrap) => {
    const row = wrap.querySelector(".fe-series-row");
    const left = wrap.querySelector(".fe-ser-left");
    const right = wrap.querySelector(".fe-ser-right");
    const fadeL = wrap.querySelector(".fe-ser-fade.l");
    const fadeR = wrap.querySelector(".fe-ser-fade.r");
    left.addEventListener("click", () => row.scrollBy({ left: -row.clientWidth * 0.8, behavior: "smooth" }));
    right.addEventListener("click", () => row.scrollBy({ left: row.clientWidth * 0.8, behavior: "smooth" }));
    const sync = () => {
      const atStart = row.scrollLeft <= 4;
      const atEnd = row.scrollLeft + row.clientWidth >= row.scrollWidth - 4;
      left.classList.toggle("is-hidden", atStart);
      right.classList.toggle("is-hidden", atEnd);
      fadeL.classList.toggle("is-on", !atStart);
      fadeR.classList.toggle("is-on", !atEnd);
    };
    row.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    sync();
  });
}

function renderList() {
  const rows = buildRows();
  $("fullEpg").innerHTML = rows.map((r, i) => {
    const blue = !!r.ivi;
    const genre = blue
      ? (r.kind === "series" ? "сериал" : "реалити шоу")
      : (GENRES[i % GENRES.length] === "реалити шоу" ? "новости" : GENRES[i % GENRES.length]);
    const cover = r.cover || covers[i % (covers.length || 1)] || realCover;
    // Прогресс «в эфире» — всегда середина эфира, без привязки к реальному времени.
    // По макету ZGQ — только прогресс-линия эфира, без пилюли «ещё N минут».
    const onPoster = r.now
      ? `<div class="fe-progline"><span class="fe-progfill" style="width:45%"></span></div>`
      : "";
    // Под Иви-контентом — лента серий: днём «Все выпуски шоу», вечером «Все серии сериала».
    const block = blue
      ? (r.kind === "series"
          ? renderSeries(seriesEps, "Все серии сериала на Иви", true)
          : renderSeries(episodes, "Все выпуски шоу на Иви"))
      : "";
    // По макету ZGQ у текущего эфира кнопка «В эфир» стоит ПОД описанием (в колонке
    // инфо, слева); у остальных Иви-передач кнопка «Смотреть на Иви» — справа.
    const watchBtn = blue ? `<a class="fe-watch" href="https://www.ivi.ru/" target="_blank" rel="noopener">${r.now ? "В эфир" : "Смотреть на Иви"}</a>` : "";
    return `<div class="fe-card${r.now ? " is-now" : ""}${r.past ? " is-past" : ""}">
      <div class="fe-timecol">
        <span class="fe-time">${r.time}</span>
        ${r.now ? `<span class="fe-onair">${BCAST} в эфире</span>` : ""}
      </div>
      <div class="fe-poster"><img loading="lazy" src="${cover}" alt="">${onPoster}</div>
      <div class="fe-info">
        <div class="fe-ttl">${r.title}</div>
        <div class="fe-genre">${genre}</div>
        <div class="fe-desc">${r.desc}</div>
        ${r.now ? watchBtn : ""}
      </div>
      ${r.now ? "" : watchBtn}
    </div>${block}`;
  }).join("");
  setupSeriesNav();
  // При первой загрузке прокручиваем к идущей сейчас передаче (прошедшее остаётся выше).
  if (firstRender && activeDay === 0) {
    const nowCard = $("fullEpg").querySelector(".fe-card.is-now");
    if (nowCard) {
      const y = nowCard.getBoundingClientRect().top + window.scrollY - 130;
      window.scrollTo(0, Math.max(0, y));
      firstRender = false;
    }
  }
}

function buildDayTabs() {
  const base = new Date();
  const wdFull = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
  const items = [];
  for (let off = -1; off <= 6; off++) {
    const d = new Date(base); d.setDate(base.getDate() + off);
    const dd = `${d.getDate()}.${d.getMonth() + 1}`;
    const name = off === -1 ? "вчера" : off === 0 ? "сегодня" : off === 1 ? "завтра" : wdFull[d.getDay()];
    items.push(`<button class="day-tab${off === 0 ? " is-active" : ""}" data-i="${off}">${name}&nbsp;&nbsp;${dd}</button>`);
  }
  $("dayTabs").innerHTML = items.join("");
  $("dayTabs").addEventListener("click", (e) => {
    const b = e.target.closest(".day-tab");
    if (!b) return;
    activeDay = +b.dataset.i;
    $("dayTabs").querySelectorAll(".day-tab").forEach((t) => t.classList.toggle("is-active", t === b));
    renderList();
  });
}

// Градиент под фильтрами — только когда шапка залипла у верха при скролле.
function setupStickyGradient() {
  const sticky = document.querySelector(".sched-sticky");
  if (!sticky) return;
  const update = () => sticky.classList.toggle("is-stuck", sticky.getBoundingClientRect().top <= 0.5);
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
}

// ---- «Сейчас в эфире»: один этаж, инфо видно сразу ----
function renderNowAir(channels) {
  const el = $("nowAir");
  const list = channels.slice(0, 10);
  el.innerHTML = `<h2 class="gal-head">Сейчас в эфире <span class="chev">›</span></h2>
    <div class="fav-row">${list.map((ch) => `
      <a class="fav-card" href="player.html?id=${ch.id}" data-id="${ch.id}">
        <div class="fav-thumb"><img class="fav-img" loading="lazy" src="${channelThumb(ch)}" alt=""><span class="fav-chip" hidden></span></div>
        <div class="fav-meta"><div class="fav-ch">${ch.title}</div><div class="fav-prog">В эфире</div></div>
      </a>`).join("")}</div>
    <div class="gal-less" aria-hidden="true"><span class="gal-more-arrow gal-arrow-left">${ARROW_SVG}</span></div>
    <div class="gal-more" aria-hidden="true"><span class="gal-more-arrow">${ARROW_SVG}</span></div>`;
  const row = el.querySelector(".fav-row");
  const more = el.querySelector(".gal-more"), less = el.querySelector(".gal-less");
  more.querySelector(".gal-more-arrow").addEventListener("click", () => row.scrollBy({ left: row.clientWidth * 0.8, behavior: "smooth" }));
  less.querySelector(".gal-more-arrow").addEventListener("click", () => row.scrollBy({ left: -row.clientWidth * 0.8, behavior: "smooth" }));
  const sync = () => {
    const t = row.querySelector(".fav-thumb");
    if (t) {
      const sR = el.getBoundingClientRect(), tR = t.getBoundingClientRect();
      more.style.top = less.style.top = (tR.top - sR.top) + "px";
      more.style.height = less.style.height = tR.height + "px";
    }
    const sc = row.scrollWidth > row.clientWidth + 4;
    more.classList.toggle("is-hidden", !sc || row.scrollLeft + row.clientWidth >= row.scrollWidth - 4);
    less.classList.toggle("is-hidden", row.scrollLeft <= 4);
  };
  sync(); row.addEventListener("scroll", sync, { passive: true }); window.addEventListener("resize", sync); setTimeout(sync, 400);
  el.querySelectorAll(".fav-card").forEach(fillNowTile);
}
async function fillNowTile(card) {
  const tc = await nowOnChannel(+card.dataset.id).catch(() => null);
  if (!tc) return;
  const shot = telecastThumb(tc);
  if (shot) card.querySelector(".fav-img").src = shot;
  const prog = card.querySelector(".fav-prog");
  if (prog && tc.title) prog.textContent = tc.title;
  const min = tc.end ? Math.round((new Date(tc.end) - Date.now()) / 60000) : 0;
  const chip = card.querySelector(".fav-chip");
  if (chip && min > 0 && min < 600) { chip.textContent = `ещё ${min} ${pluralMin(min)}`; chip.hidden = false; }
}

// ---- Закрыть ----
$("schClose").addEventListener("click", () => {
  if (history.length > 1) history.back();
  else location.href = "index.html";
});

// ---- Развернуть описание ----
$("schExpand").addEventListener("click", () => {
  const p = $("schDesc");
  const open = p.classList.toggle("is-expanded");
  $("schExpand").textContent = open ? "Свернуть" : "Развернуть";
});

// ---- Инициализация ----
(async function init() {
  buildDayTabs();
  setupStickyGradient();
  let channels;
  try { channels = await tvChannels(); } catch (e) {
    $("schTitle").textContent = "Не удалось загрузить канал";
    return;
  }
  channel = channels.find((c) => String(c.id) === String(id)) || channels[0];
  document.title = `Иви — ${channel.title} · Телепрограмма`;
  $("schTitle").textContent = channel.title;
  const logo = channelThumb(channel);
  if (logo) { $("schLogo").src = logo; $("schLogo").hidden = false; }
  realCover = channelThumb(channel);
  $("schDesc").textContent = channel.description || "";
  if (!channel.description) $("schExpand").style.display = "none";
  renderNowAir(channels);
  // Разные обложки для списка передач — из контентной подборки Иви.
  collection("popular-now-tvshows", { to: 30 })
    .then((items) => { covers = items.map((it) => contentThumb(it, 480, 270)).filter(Boolean); if (covers.length) renderList(); })
    .catch(() => {});
  // Реальные серии шоу «Мама в 16» (днём) и сериала «Холод» (вечером).
  showEpisodes(MAMA_IN_16, 8)
    .then((items) => { episodes = items; if (episodes.length) renderList(); })
    .catch(() => {});
  showEpisodes(HOLOD, 8)
    .then((items) => { seriesEps = items; if (seriesEps.length) renderList(); })
    .catch(() => {});
  // Постеры шоу/сериала для обложек передач (чтобы не дублировать кадр первой серии).
  showPoster(MAMA_IN_16).then((p) => { if (p) { showCover = p; renderList(); } }).catch(() => {});
  showPoster(HOLOD).then((p) => { if (p) { seriesCover = p; renderList(); } }).catch(() => {});
  renderList();
  try {
    telecasts = await channelTelecasts(channel.id);
    renderList();
  } catch {}
})();
