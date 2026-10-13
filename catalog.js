import {
  tvChannels, channelCover, channelThumb, HOME_TABS, TABS, filterByTag,
  collection, poster, accessLabel, contentThumb, nowOnChannel, telecastThumb,
  mskTime, demoSchedule,
} from "./ivi-api.js";

// ---- Табы категорий (визуальные) ----
// As is — 5 табов (HOME_TABS); Варианты 1 и 2 — полный список (TABS).
const getMode = () => document.documentElement.getAttribute("data-mode") || "asis";
const variant = () => document.documentElement.getAttribute("data-variant") || "asis";
const isV1like = () => ["v1", "v2", "v3"].includes(getMode());
const isV2like = () => getMode() === "v2" || getMode() === "v3"; // v3 = копия v2
// Вариант 2 прототипа (копия v4): data-copy="v4b". На ТВ онлайн — встроенный плеер.
const isV4b = () => document.documentElement.getAttribute("data-copy") === "v4b";
const tabList = () => (isV1like() ? TABS : HOME_TABS);
// Стрелка-шеврон для подсказок скролла подборок (макет JOP-0).
const ARROW_SVG = '<svg viewBox="0 0 12 32" width="11" height="29"><path fill="currentColor" d="M11.607 14.626C12.131 15.461 12.131 16.539 11.607 17.374L2.425 32L0 30.352L9.01 16L0 1.648L2.425 0L11.607 14.626Z"/></svg>';
const tabsEl = document.getElementById("tabs");
let v1Tab = 0; // активная категория (индекс в tabList())
let channels = []; // загруженные каналы (объявлено до renderTabs — нужно для v3-кластеров)
// v3 — в таб добавляем мини-кластер из двух обложек каналов категории (макет L58).
function tabThumbs(tag) {
  const list = (tag ? filterByTag(channels, tag) : channels).slice(0, 1);
  if (!list.length) return "";
  // Передний постер — реальный; задний всегда заглушка-«загрузка».
  return `<span class="tab-thumbs"><span class="tt-back tt-stub"></span><img class="tt-front" src="${channelThumb(list[0])}" alt=""></span>`;
}
// Вариант 4 — «живые» табы (макет): текст + 3D-иконка из ассетов макета в стеклянной пилюле.
const PA = "https://app.paper.design/file-assets/01M45XC9MW0NZTHRFA799G9DJ7/";
const V4_ICONS = [
  "7EVWJDB6PBT28KDSSC3PH96E1S.png", // Все каналы — комета
  "0RDPVAP149TBKN1HCEWFY22TMZ.png", // Развлекательное — сердце
  "2XC1VP5CCM1FV3BE4FZAMYSRXE.png", // Федеральные — глаза
  "1EYZ403CGV9K2JCKV0K6N3690X.png", // Детские — печенье
  "6B5AEQ8DSPK6GB6CK57HZKW888.png", // Спорт — огонь
  "7EVWJDB6PBT28KDSSC3PH96E1S.png", // Документальные — комета
  "2ERF6A2CP700JTDER437N3ZP1X.png", // Кино и сериалы — маска
  "32KXEE3KPBB0PJNHY4N6BF602N.png", // Музыкальные — кристалл
];
const v4Icon = (i) => `<span class="tab-emoji"><img src="${PA}${V4_ICONS[i % V4_ICONS.length]}" alt="" loading="lazy"></span>`;
function renderTabs() {
  const v4 = variant() === "v4";
  const v3 = getMode() === "v3" && variant() !== "v2" && !v4; // v2 и v4 — свои табы
  tabsEl.innerHTML = tabList()
    .map((t, i) => v4
      ? `<button class="tab${i === v1Tab ? " is-active" : ""}">${t.label}${v4Icon(i)}</button>`
      : `<button class="tab${i === v1Tab ? " is-active" : ""}">${t.label}${v3 ? tabThumbs(t.tag) : ""}</button>`)
    .join("");
}
renderTabs();
tabsEl.addEventListener("click", (e) => {
  const b = e.target.closest(".tab");
  if (!b) return;
  tabsEl.querySelectorAll(".tab").forEach((t) => t.classList.toggle("is-active", t === b));
  v1Tab = [...tabsEl.querySelectorAll(".tab")].indexOf(b);
  if (isV1like()) { renderV1(); document.querySelector(".phone-scroll")?.scrollTo({ top: 0 }); window.scrollTo({ top: 0 }); }
});
window.addEventListener("modechange", () => { v1Tab = 0; renderTabs(); });

// ---- Карточка канала (обложка + название + доступ) ----
function chCard(ch) {
  const paid = ch.is_paid;
  return `<a class="ch-card" href="player.html?id=${ch.id}">
    <div class="ch-cover"><img loading="lazy" src="${channelCover(ch, 360, 203)}" alt=""></div>
    <div class="ch-name">${ch.title}</div>
    <div class="ch-access${paid ? " sub" : ""}">${paid ? "Подписка" : "Бесплатно"}</div>
  </a>`;
}

function renderRail(id, tag, limit = 18) {
  const el = document.getElementById(id);
  if (!el) return;
  const list = filterByTag(channels, tag).slice(0, limit);
  el.innerHTML = list.length
    ? list.map(chCard).join("")
    : `<div class="grid-empty">В этой категории нет каналов</div>`;
}

// ---- Загрузка каналов ----
(async function init() {
  const rails = ["catFederal", "catEnt", "catMovies"];
  rails.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = Array.from({ length: 8 }, () => '<div class="ch-card"><div class="ch-cover is-loading"></div></div>').join("");
  });
  try {
    channels = await tvChannels();
    renderRail("catFederal", "федеральные каналы");
    renderRail("catEnt", "развлекательные каналы");
    renderRail("catMovies", "каналы с фильмами и сериалами");
    renderTabs(); // теперь есть каналы — наполняем мини-кластеры табов (v3)
    renderV1();
  } catch (err) {
    document.getElementById("catFederal").innerHTML = `<div class="grid-empty">Не удалось загрузить каналы: ${err.message}</div>`;
  }
})();

/* ============ Вариант 1: лента «ТВ онлайн», зависящая от вкладки ============ */
// «Все каналы» — обзорная лента; конкретная категория — hero-карусель +
// подкатегорийные двойные галереи (+ блок трансляций / галерея шоу).
const headingFor = (tag) => (TABS.find((t) => t.tag === tag) || {}).heading || "Каналы";

// Обзорная лента (вкладка «Все каналы»).
const OVERVIEW = [
  { kind: "gal", tag: "развлекательные каналы" },
  { kind: "gal", tag: "федеральные каналы" },
  { kind: "live" },
  { kind: "gal", tag: "каналы с фильмами и сериалами" },
  { kind: "show" },
  { kind: "gal", tag: "детские каналы" },
];

// Подкатегории для «проваливания» во вкладку: двойные галереи внутри категории.
const SUBCATS = {
  "федеральные каналы": ["Главные каналы", "Новости и аналитика", "Развлечения", "Для всей семьи"],
  "развлекательные каналы": ["Сериалы и шоу", "Юмор", "Реалити", "Лайфстайл"],
  "детские каналы": ["Для малышей", "Мультфильмы", "Познавательное", "Подросткам"],
  "спортивные каналы": ["Прямые трансляции", "Футбол", "Хоккей", "Единоборства"],
  "документальные и познавательные каналы": ["Наука и технологии", "История", "Природа", "Путешествия"],
  "каналы с фильмами и сериалами": ["Кино", "Сериалы", "Классика", "Зарубежное"],
  "музыкальные каналы": ["Хиты", "Клипы", "Ретро", "По жанрам"],
};

// Описание ленты для конкретной категории: hero + подкатегории,
// между ними — блок трансляций (спорт) или галерея шоу (развлечения/кино).
function categoryFeed(tag) {
  const subs = SUBCATS[tag] || [headingFor(tag)];
  const feed = [];
  subs.forEach((sub, i) => {
    feed.push({ kind: "gal", tag, sub, offset: i });
    if (tag === "спортивные каналы" && i === 0) feed.push({ kind: "live" });
    if (tag === "развлекательные каналы" && i === 1) feed.push({ kind: "topshows" });
    if (tag === "каналы с фильмами и сериалами" && i === 1) feed.push({ kind: "show" });
  });
  return feed;
}

// ---- Встроенный плеер ТВ онлайн (Вариант 2, макет ZU6) ----
// Берём тот же плеер, что на player.html, но переключение канала работает на месте,
// без перехода на страницу. Категория сверху фильтрует и чипсы, и галереи ниже.
const PLAYER_CONTROLS = `
  <div class="player-controls">
    <div class="pc-row">
      <button class="pc-btn" data-play aria-label="Пауза"><svg viewBox="0 0 20 20" width="20" height="20"><path fill="#fff" d="M6 3h3v14H6zM11 3h3v14h-3z"/></svg></button>
      <div class="pc-vol"><svg viewBox="0 0 18 18" width="18" height="18"><path fill="#fff" d="M9 1 4.5 4.5H1v9h3.5L9 17zM13 4.5a6 6 0 0 1 0 9" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg><span class="pc-vol-track"><span class="pc-vol-fill"></span></span></div>
      <span class="pc-time">21:24:35</span>
    </div>
    <div class="pc-seek"><span class="pc-seek-buf"></span><span class="pc-seek-fill"></span></div>
    <div class="pc-right">
      <button class="pc-btn pc-sm" aria-label="Качество"><svg viewBox="0 0 20 20" width="18" height="18"><path fill="#fff" d="M10 2l2 5 5 .5-4 3.5 1.3 5L10 18l-4.3 3 1.3-5-4-3.5 5-.5z"/></svg></button>
      <button class="pc-btn pc-sm" aria-label="Субтитры"><svg viewBox="0 0 20 20" width="18" height="18"><rect x="2" y="4" width="16" height="12" rx="2" fill="none" stroke="#fff" stroke-width="1.6"/><path fill="#fff" d="M5 9h4v1.5H5zM11 9h4v1.5h-4zM5 12h6v1.5H5z"/></svg></button>
      <button class="pc-btn pc-sm" aria-label="На весь экран"><svg viewBox="0 0 20 20" width="18" height="18"><path fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" d="M3 7V3h4M17 7V3h-4M3 13v4h4M17 13v4h-4"/></svg></button>
    </div>
  </div>`;

const PV_GENRES = ["Сериал", "Ток-шоу", "Новости", "Кино", "Шоу", "Спорт", "Мультфильм", "Реалити"];
let v4bPlayer = null; // { setChannelById } — переключение канала по клику из галерей (Вариант 2)

function fillPlayerBlock(el, tag) {
  if (!el) return;
  const list = tag ? filterByTag(channels, tag) : channels;
  if (!list.length) { el.innerHTML = ""; v4bPlayer = null; return; }
  let current = list[0];
  el.innerHTML = `
    <div class="watch">
      <div class="player">
        <img class="player-bg" alt="">
        <div class="player-top"><div class="player-title">—</div><div class="player-sub">Прямой эфир</div></div>
        ${PLAYER_CONTROLS}
      </div>
      <aside class="pv-side">
        <div class="pv-list"></div>
        <div class="pv-epg" hidden></div>
        <div class="pv-switch" role="tablist">
          <span class="pv-seg-ind" aria-hidden="true"></span>
          <button class="pv-seg is-active" data-view="channels">Каналы</button>
          <button class="pv-seg" data-view="epg">Телепрограмма</button>
        </div>
      </aside>
    </div>`;
  const bg = el.querySelector(".player-bg");
  const titleEl = el.querySelector(".player-title");
  const subEl = el.querySelector(".player-sub");
  const listEl = el.querySelector(".pv-list");
  const epgEl = el.querySelector(".pv-epg");
  const nowCache = new Map();
  const loadNow = (id) => { if (!nowCache.has(id)) nowCache.set(id, nowOnChannel(id).catch(() => null)); return nowCache.get(id); };

  // EPG выбранного канала (как в плеере player.html): «сейчас» + расписание.
  function renderEpg(tc) {
    const restrict = tc?.restrict ?? 16;
    const nowRow = tc
      ? `<div class="epg-row is-now"><span class="epg-time">${mskTime(tc.start)}</span><span class="epg-title">${tc.title}</span><span class="epg-underline"></span></div>`
      : "";
    const demo = demoSchedule(tc?.end, restrict, 14)
      .map((r, i) => `<div class="epg-row is-demo"><span class="epg-time">${r.time}</span><span class="epg-title">${r.title}</span>${i % 4 === 1 ? '<span class="epg-live">Смотреть сейчас</span>' : ""}</div>`)
      .join("");
    epgEl.innerHTML = nowRow + demo;
  }

  function setChannel(ch) {
    if (!ch) return;
    current = ch;
    // Сохраняем кадр/название для бесшовного PiP на странице телепрограммы.
    const savePip = (thumb, title) => { try { localStorage.setItem("v4bCurrentChannel", ch.id); localStorage.setItem("v4bCurrentThumb", thumb); localStorage.setItem("v4bCurrentTitle", title); } catch {} };
    listEl.querySelectorAll(".pv-ch").forEach((r) => r.classList.toggle("is-active", r.dataset.id === String(ch.id)));
    listEl.querySelector(".pv-ch.is-active")?.scrollIntoView({ block: "nearest" });
    bg.src = channelThumb(ch);
    titleEl.textContent = "Загрузка эфира…"; subEl.textContent = "Прямой эфир";
    savePip(channelThumb(ch), ch.title);
    renderEpg(null);
    loadNow(ch.id).then((tc) => {
      if (current.id !== ch.id) return;
      if (tc) {
        titleEl.textContent = tc.title;
        subEl.textContent = `${mskTime(tc.start)} в эфире · прямой эфир`;
        const t = telecastThumb(tc); if (t) bg.src = t;
      } else { titleEl.textContent = ch.title; subEl.textContent = "Прямой эфир"; }
      savePip(bg.src, titleEl.textContent);
      renderEpg(tc);
    });
  }

  // Переключатель «Каналы / Телепрограмма» (сегмент-свитч со скользящим индикатором).
  // Индикатор позиционируем по активному сегменту (ширины разные), чтобы всегда совпадал.
  const switchEl = el.querySelector(".pv-switch");
  const indEl = switchEl.querySelector(".pv-seg-ind");
  const moveInd = (seg) => { indEl.style.left = seg.offsetLeft + "px"; indEl.style.width = seg.offsetWidth + "px"; };
  switchEl.addEventListener("click", (e) => {
    const seg = e.target.closest(".pv-seg");
    if (!seg) return;
    const epg = seg.dataset.view === "epg";
    switchEl.querySelectorAll(".pv-seg").forEach((s) => s.classList.toggle("is-active", s === seg));
    listEl.hidden = epg;
    epgEl.hidden = !epg;
    moveInd(seg);
  });
  requestAnimationFrame(() => moveInd(switchEl.querySelector(".pv-seg.is-active")));
  // Правая панель — список каналов (макет 10W9): лого + название + передача + жанр.
  listEl.innerHTML = list.map((c, i) => `<a class="pv-ch${c.id === current.id ? " is-active" : ""}" href="player.html?id=${c.id}" data-id="${c.id}">
    <span class="pv-ch-logo"><img loading="lazy" src="${channelThumb(c)}" alt=""></span>
    <span class="pv-ch-text">
      <span class="pv-ch-name">${c.title}</span>
      <span class="pv-ch-prog" data-prog="${c.id}">${c.title}</span>
      <span class="pv-ch-genre">${PV_GENRES[i % PV_GENRES.length]}</span>
    </span>
  </a>`).join("");
  listEl.querySelectorAll(".pv-ch").forEach((row) => {
    row.addEventListener("click", (e) => { e.preventDefault(); const ch = list.find((c) => String(c.id) === row.dataset.id); if (ch) setChannel(ch); });
  });
  list.forEach((c) => loadNow(c.id).then((tc) => { if (!tc) return; const p = listEl.querySelector(`[data-prog="${c.id}"]`); if (p) p.textContent = tc.title; }));

  const playBtn = el.querySelector(".pc-btn[data-play]");
  playBtn?.addEventListener("click", () => {
    const paused = playBtn.classList.toggle("is-paused");
    playBtn.innerHTML = paused
      ? '<svg viewBox="0 0 20 20" width="20" height="20"><path fill="#fff" d="M5 3l12 7-12 7z"/></svg>'
      : '<svg viewBox="0 0 20 20" width="20" height="20"><path fill="#fff" d="M6 3h3v14H6zM11 3h3v14h-3z"/></svg>';
  });

  v4bPlayer = { setChannelById: (id) => { const ch = channels.find((c) => String(c.id) === String(id)); if (ch) setChannel(ch); } };
  setChannel(current);
}

// Вариант 2: клики по каналам в галереях переключают встроенный плеер, без перехода.
document.getElementById("v1Body")?.addEventListener("click", (e) => {
  if (!isV4b() || !v4bPlayer) return;
  const a = e.target.closest('a[href^="player.html"]');
  if (!a || a.closest(".v4b-player")) return;
  e.preventDefault();
  const id = new URLSearchParams((a.getAttribute("href").split("?")[1]) || "").get("id");
  if (id) { v4bPlayer.setChannelById(id); window.scrollTo({ top: 0, behavior: "smooth" }); }
});

let showSeq = 0;

function renderFeedSections(container, tab) {
  // В Варианте 2 блок «Любимые каналы» (fav) не показываем.
  let feed = tab.tag ? categoryFeed(tab.tag)
    : (getMode() === "v3" && !isV4b() ? [{ kind: "fav" }, ...OVERVIEW] : OVERVIEW);
  // Вариант 2 — в выбранной категории всегда подмешиваем рекомендации шоу 2-й галереей.
  if (isV4b() && tab.tag && !feed.some((b) => b.kind === "show")) {
    feed = [...feed];
    feed.splice(1, 0, { kind: "show" });
  }
  showSeq = 0;
  if (tileIO) tileIO.disconnect();
  container.innerHTML = feed.map((b) => {
    if (b.kind === "gal") {
      const heading = b.sub || headingFor(b.tag);
      return `<section class="gal" data-cat="${b.tag}" data-offset="${b.offset || 0}" data-heading="${heading}"></section>`;
    }
    if (b.kind === "live") return `<div class="live-block"></div>`;
    if (b.kind === "show") return `<section class="gal show-gal"></section>`;
    if (b.kind === "topshows") return `<div class="topshows"></div>`;
    if (b.kind === "fav") return `<section class="fav"></section>`;
    return "";
  }).join("");
  container.querySelectorAll(".fav").forEach(fillFavs);
  container.querySelectorAll(".gal[data-cat]").forEach(fillGallery);
  container.querySelectorAll(".live-block").forEach(fillLiveBlock);
  container.querySelectorAll(".show-gal").forEach(fillShowGal);
  container.querySelectorAll(".topshows").forEach(fillTopShows);
  tileIO = new IntersectionObserver((ents) => {
    ents.forEach((e) => {
      if (!e.isIntersecting) return;
      fillTile(e.target);
      tileIO.unobserve(e.target);
    });
  }, { rootMargin: "120px" });
  container.querySelectorAll(".gal-cell").forEach((c) => tileIO.observe(c));
  if (isV2like()) container.querySelectorAll(".gal[data-cat]").forEach(addScrollHint);
}

function renderV1() {
  const body = document.getElementById("v1Body");
  if (!body || !isV1like() || !channels.length) return;
  const tab = tabList()[v1Tab] || tabList()[0];
  if (isV4b()) {
    body.innerHTML = `<div class="v4b-player"></div><div id="v4bFeed"></div>`;
    fillPlayerBlock(body.querySelector(".v4b-player"), tab.tag);
    renderFeedSections(body.querySelector("#v4bFeed"), tab);
    // Возврат с «Программы передач» — плеер вырастает из PiP в полный размер.
    if (sessionStorage.getItem("v4bPipBack")) {
      sessionStorage.removeItem("v4bPipBack");
      requestAnimationFrame(playerGrowFromPip);
    }
  } else {
    renderFeedSections(body, tab);
  }
}

const PIP = { w: 320, h: 180, left: 24, bottom: 24 };

// Вариант 2 — при переходе в «Программу передач» плеер уезжает в PiP (левый нижний
// угол), затем открывается настоящая страница телепрограммы. Раздел не меняем.
function flipPlayerToPip() {
  const player = document.querySelector(".v4b-player .player");
  const wrap = document.querySelector(".v4b-player");
  if (!player || !wrap) return false;
  // Резервируем высоту блока, чтобы лента ниже не прыгнула, когда плеер станет fixed.
  wrap.style.minHeight = wrap.offsetHeight + "px";
  const first = player.getBoundingClientRect();
  wrap.classList.add("is-pip");
  const last = player.getBoundingClientRect();
  const dx = first.left - last.left, dy = first.top - last.top;
  const sx = first.width / last.width, sy = first.height / last.height;
  player.style.transition = "none";
  player.style.transformOrigin = "top left";
  player.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
  requestAnimationFrame(() => {
    player.style.transition = "transform .45s cubic-bezier(.33,1,.68,1)";
    player.style.transform = "";
  });
  return true;
}

// Обратная анимация: плеер появляется маленьким в левом нижнем углу и вырастает.
function playerGrowFromPip() {
  const player = document.querySelector(".v4b-player .player");
  if (!player) return;
  const full = player.getBoundingClientRect();
  if (!full.width) return;
  const top = window.innerHeight - PIP.bottom - PIP.h;
  const dx = PIP.left - full.left, dy = top - full.top;
  const sx = PIP.w / full.width, sy = PIP.h / full.height;
  player.style.transition = "none";
  player.style.transformOrigin = "top left";
  player.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
  requestAnimationFrame(() => {
    player.style.transition = "transform .5s cubic-bezier(.33,1,.68,1)";
    player.style.transform = "";
  });
}

// Вариант 2 — переключение секций ТВ онлайн / Программа передач.
document.querySelector(".section-switch")?.addEventListener("click", (e) => {
  if (!isV4b()) return;
  const item = e.target.closest(".sw-item");
  if (!item) return;
  const toProg = /программа/i.test(item.textContent);
  if (!toProg) return; // уже на ТВ онлайн
  e.preventDefault();
  const href = item.getAttribute("href") || "program.html";
  sessionStorage.setItem("v4bPipBack", "1"); // чтобы при возврате сыграть обратную анимацию
  if (flipPlayerToPip()) setTimeout(() => { location.href = href; }, 440);
  else location.href = href;
});

// Категорийная лента: заголовок + 2 строки плиток каналов (по 5), 16:9.
// offset «проворачивает» список, чтобы подгалереи одной категории отличались.
function fillGallery(sec) {
  const tag = sec.dataset.cat;
  const offset = +(sec.dataset.offset || 0);
  const heading = sec.dataset.heading || headingFor(tag);
  const base = filterByTag(channels, tag);
  if (!base.length) { sec.remove(); return; }
  // Вариант 2 — горизонтальный скролл в 2 этажа со ВСЕМИ каналами категории.
  const isV2 = isV2like();
  const MIN = 10;
  let list;
  if (base.length >= MIN) {
    // Крупная категория: каждая подгалерея показывает свой срез (ротация).
    const step = Math.max(5, Math.floor(base.length / 4));
    const k = (offset * step) % base.length;
    const rot = base.slice(k).concat(base.slice(0, k));
    list = isV2 ? rot : rot.slice(0, MIN);
  } else {
    // Малая категория (спорт/дети): добиваем плитками из общего пула.
    const pool = channels.filter((c) => !base.includes(c));
    const k = pool.length ? (offset * 7) % pool.length : 0;
    list = base.concat(pool.slice(k).concat(pool.slice(0, k))).slice(0, isV2 ? 16 : MIN);
  }
  sec.innerHTML = `
    <h2 class="gal-head">${heading} <span class="chev">›</span></h2>
    <div class="gal-grid">${list.map(galCell).join("")}</div>
    <div class="gal-less" aria-hidden="true"><span class="gal-more-arrow gal-arrow-left">${ARROW_SVG}</span></div>
    <div class="gal-more" aria-hidden="true"><span class="gal-more-arrow">${ARROW_SVG}</span></div>`;
}

// Плитка канала с мета-оверлеем при наведении (общая для галерей и «Любимых каналов»).
function galCell(ch) {
  return `
    <div class="gal-cell" data-id="${ch.id}" data-paid="${ch.is_paid ? 1 : 0}">
      <a class="gal-thumb" href="player.html?id=${ch.id}" title="${ch.title}">
        <img class="gal-img" loading="lazy" src="${channelThumb(ch)}" alt="${ch.title}">
        ${ch.is_paid ? '<span class="gal-pay" title="Платный канал">₽</span>' : ""}
        <span class="gal-left" hidden></span>
        <div class="gal-meta" aria-hidden="true">
          <div class="gm-top"><span class="gm-live"><i class="gm-dot"></i>в эфире</span><span class="gm-mins"></span></div>
          <div class="gm-name">${ch.title}</div>
          <div class="gm-prog"></div>
          <span class="gm-watch">${ch.is_paid ? "Купить подписку" : "Смотреть"}</span>
        </div>
      </a>
      <div class="gal-pop" aria-hidden="true"></div>
    </div>`;
}

// Подсказка-градиент справа с стрелкой: «есть ещё каналы правее» (только v2).
let tileIO = null;
function addScrollHint(sec) {
  const grid = sec.querySelector(".gal-grid");
  const more = sec.querySelector(".gal-more");
  const less = sec.querySelector(".gal-less");
  if (!grid || !more) return;
  more.querySelector(".gal-more-arrow").addEventListener("click", () => grid.scrollBy({ left: grid.clientWidth * 0.8, behavior: "smooth" }));
  less?.querySelector(".gal-more-arrow").addEventListener("click", () => grid.scrollBy({ left: -grid.clientWidth * 0.8, behavior: "smooth" }));
  const sync = () => {
    const cell = grid.querySelector(".gal-cell");
    if (cell) {
      const rows = sec.classList.contains("fav-gal") ? 1 : 2; // «Любимые каналы» — один этаж
      const sRect = sec.getBoundingClientRect(), cRect = cell.getBoundingClientRect();
      const top = (cRect.top - sRect.top) + "px", h = (cRect.height * rows + (rows === 2 ? 8 : 0)) + "px";
      more.style.top = top; more.style.height = h;
      if (less) { less.style.top = top; less.style.height = h; }
    }
    const scrollable = grid.scrollWidth > grid.clientWidth + 4;
    const atEnd = grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 4;
    more.classList.toggle("is-hidden", !scrollable || atEnd);
    if (less) less.classList.toggle("is-hidden", grid.scrollLeft <= 4);
  };
  sync();
  grid.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", sync);
  setTimeout(sync, 300);
}

// «Любимые каналы» — такая же подборка каналов, как галереи ниже, но ОДИН этаж
// с горизонтальным скроллом; мета-оверлей появляется при наведении на постер.
const FAV_LIMIT = 10;
function fillFavs(el) {
  // Необычные, не самые популярные каналы (пропускаем первые ~12 топовых).
  const pool = channels.slice(12);
  const list = (pool.length >= FAV_LIMIT ? pool : channels).slice(0, FAV_LIMIT);
  if (!list.length) { el.remove(); return; }
  el.classList.add("gal", "fav-gal");
  el.innerHTML = `
    <h2 class="gal-head">Любимые каналы <span class="chev">›</span></h2>
    <div class="gal-grid">${list.map(galCell).join("")}</div>
    <div class="gal-less" aria-hidden="true"><span class="gal-more-arrow gal-arrow-left">${ARROW_SVG}</span></div>
    <div class="gal-more" aria-hidden="true"><span class="gal-more-arrow">${ARROW_SVG}</span></div>`;
  addScrollHint(el);
}

// «Осталось N минут» до конца текущей передачи (ленивая подгрузка).
const pluralMin = (n) => {
  const a = n % 100, b = n % 10;
  if (a >= 11 && a <= 14) return "минут";
  if (b === 1) return "минута";
  if (b >= 2 && b <= 4) return "минуты";
  return "минут";
};
const nowCache = new Map();
const loadNow = (id) => {
  if (!nowCache.has(id)) nowCache.set(id, nowOnChannel(id).catch(() => null));
  return nowCache.get(id);
};

// Единая подгрузка эфира для плитки: наполняет
//  • поповер-дропдаун (Вариант 1),
//  • мета-оверлей поверх постера (Вариант 2, техника как в референсе),
//  • угловой чип «осталось N минут».
async function fillTile(cell) {
  if (!cell || cell.dataset.ready || !cell.dataset.id) return; // шоу-плитки (v3) без канала пропускаем
  cell.dataset.ready = "1";
  const pop = cell.querySelector(".gal-pop");
  const prog = cell.querySelector(".gm-prog");
  const chip = cell.querySelector(".gal-left");
  const dim = (t) => `<div class="gal-pop-row"><span class="gp-t"></span><span class="gp-dot"></span><span class="gp-n gp-dim">${t}</span></div>`;
  if (pop) pop.innerHTML = dim("Загружаем эфир…");
  try {
    const tc = await loadNow(+cell.dataset.id);
    if (!tc) { if (pop) pop.innerHTML = dim("Нет данных об эфире"); if (prog) prog.innerHTML = '<div class="gm-row gm-dim">Нет данных об эфире</div>'; return; }
    const base = tc.end && new Date(tc.end) > new Date(tc.start) ? tc.end : tc.start;
    const next = demoSchedule(base, tc.restrict ?? 16, 3);
    const nowT = mskTime(tc.start);
    const rows = [[nowT, tc.title, true], ...next.map((r) => [r.time, r.title, false])];
    // Поповер (Вариант 1): время + пульсирующая точка у текущей.
    if (pop) pop.innerHTML = rows.map(([t, n, now]) =>
      `<div class="gal-pop-row${now ? " is-now" : ""}"><span class="gp-t">${t}</span><span class="gp-dot"></span><span class="gp-n">${n}</span></div>`).join("");
    // Угловой чип «осталось N минут» (Вариант 1). В мета-оверлее чип сверху не показываем.
    const min = tc.end ? Math.round((new Date(tc.end) - Date.now()) / 60000) : 0;
    const leftTxt = (min > 0 && min < 600) ? `ещё ${min} ${pluralMin(min)}` : "";
    if (chip && leftTxt) { chip.textContent = leftTxt; chip.hidden = false; }
    // Мета-оверлей: под названием текущей передачи — таймлайн, справа «ещё 5 минут».
    // Показываем 3 передачи: текущая + 2 следующие.
    if (prog) prog.innerHTML = `
      <div class="gm-row gm-now"><span class="gm-t">${nowT}</span><span class="gm-ttl">${tc.title}</span></div>
      <div class="gm-bar"><span class="gm-track"><span class="gm-fill"></span></span><span class="gm-barleft">ещё 5 минут</span></div>
      <div class="gm-row gm-next"><span class="gm-t">${next[0].time}</span><span class="gm-ttl">${next[0].title}</span></div>
      <div class="gm-row gm-next"><span class="gm-t">${next[1].time}</span><span class="gm-ttl">${next[1].title}</span></div>`;
  } catch {
    if (pop) pop.innerHTML = dim("Эфир недоступен");
  }
}
document.addEventListener("mouseover", (e) => {
  const cell = e.target.closest && e.target.closest("#v1Body .gal-cell");
  if (cell) fillTile(cell);
});
// Клик по кнопке «Смотреть» в оверлее канала (v2) — переход в плеер.
document.addEventListener("click", (e) => {
  const w = e.target.closest && e.target.closest("#v1Body .gm-watch");
  if (!w) return;
  const link = w.closest(".gal-cell")?.querySelector(".gal-thumb");
  if (link && link.href) { e.preventDefault(); window.location.href = link.href; }
});

// Hero-карусель: крупные билборды каналов с кнопкой «Смотреть» и боковыми превью.
const HERO_TITLE = {
  "спортивные каналы": "Спорт в прямом эфире",
  "развлекательные каналы": "Лучшее развлекательное ТВ",
  "федеральные каналы": "Главные каналы страны",
  "детские каналы": "Детское ТВ",
  "каналы с фильмами и сериалами": "Кино и сериалы нон-стоп",
};
function fillHero(el) {
  const tag = el.dataset.cat || null;
  const list = (tag ? filterByTag(channels, tag) : channels).slice(0, 6);
  if (!list.length) { el.remove(); return; }
  const kicker = tag ? (HERO_TITLE[tag] || headingFor(tag)) : "Смотрите прямо сейчас";
  el.innerHTML = `
    <button class="hero-nav hero-prev" aria-label="Назад">‹</button>
    <div class="hero-track">
      ${list.map((ch) => `
        <a class="hero-slide" href="player.html?id=${ch.id}">
          <img src="${channelThumb(ch)}" alt="${ch.title}">
          <div class="hero-grad"></div>
          <div class="hero-meta">
            <div class="hero-kicker">${kicker}</div>
            <div class="hero-name">${ch.title}</div>
            <span class="hero-btn">Смотреть</span>
          </div>
        </a>`).join("")}
    </div>
    <button class="hero-nav hero-next" aria-label="Вперёд">›</button>`;
  const track = el.querySelector(".hero-track");
  const step = () => track.clientWidth * 0.72;
  el.querySelector(".hero-prev").addEventListener("click", () => track.scrollBy({ left: -step(), behavior: "smooth" }));
  el.querySelector(".hero-next").addEventListener("click", () => track.scrollBy({ left: step(), behavior: "smooth" }));
}

// Крупный спортивный блок — статичная вёрстка один-в-один с макетом (H5Z-0),
// изображения берём напрямую из макета, без реальных данных Иви.
const SB_CHIPS = [
  { t: "Активные<br>трасляции", b: "4QWS4H1PWT9Q2EZZG1509K5SCW.png", f: "6ZS9GRRAV6ZPW8E4J92H9RWSD0.png", active: true },
  { t: "Прошедшие<br>матчи", b: "5ZGVWQ1WZTDPTAE3J131DJ5DDW.png", f: "4S22NH4XBCAZF02P7KV9EZ9FW6.png" },
  { t: "Обзоры матчей", b: "2BGB6J8FZPJ4446PQ53JVRWAC0.png", f: "5RP6KCYZ5NHBHY0YCEJXJ7VWPB.png" },
  { t: "Лучшие моменты", b: "6NP09WCJCMTZN6VJ1B3TGPS3S2.png", f: "5GJ5KAEH15BB5MGACYBYE7VWH3.png" },
  { t: "Сетка матчей", b: "70JMF27X69683XGVBPQEPC2AKZ.png", f: "17BRTY9JY237M3Z5JDZH1QMMC0.png" },
];
// Контролы + подвал плеера (счёт и лого МАТЧ запечены в кадр) — общий кусок.
const SB_PLAYER_INNER = `
      <div class="sb-controls">
        <button class="sb-ctrl sb-pause" aria-label="Пауза"><svg viewBox="0 0 34 42" width="28" height="34"><path fill="#fff" d="M6.482 0.158C8.431-0.030 9.405-0.124 10.408 0.305C11.213 0.649 12.058 1.416 12.478 2.183C13.000 3.140 13.000 4.299 13.000 6.616L13.000 35.181C13.000 37.639 13.000 38.868 12.476 39.826C12.043 40.616 11.231 41.352 10.402 41.705C9.397 42.132 8.326 42.027 6.185 41.816C5.421 41.741 4.670 41.635 3.913 41.489C2.795 41.273 2.236 41.165 1.597 40.723C1.105 40.384 0.553 39.715 0.313 39.168C0.000 38.457 0.000 37.733 0.000 36.286L0.000 5.937C0.000 4.328 0.000 3.523 0.321 2.803C0.583 2.218 1.106 1.596 1.639 1.239C2.294 0.800 2.978 0.682 4.345 0.446C5.064 0.322 5.769 0.227 6.482 0.158ZM23.592 0.305C24.595-0.124 25.569-0.030 27.518 0.158C28.231 0.227 28.936 0.322 29.655 0.446C31.022 0.682 31.706 0.800 32.361 1.239C32.894 1.596 33.417 2.218 33.679 2.803C34.000 3.523 34.000 4.328 34.000 5.937L34.000 36.286C34.000 37.733 34.000 38.457 33.688 39.168C33.447 39.715 32.895 40.384 32.403 40.723C31.764 41.165 31.205 41.273 30.087 41.489C29.330 41.635 28.579 41.741 27.815 41.816C25.674 42.027 24.603 42.132 23.598 41.705C22.769 41.352 21.957 40.616 21.524 39.826C21.000 38.868 21.000 37.639 21.000 35.181L21.000 6.616C21.000 4.299 21.000 3.140 21.522 2.183C21.942 1.416 22.787 0.649 23.592 0.305Z"/></svg></button>
        <button class="sb-ctrl sb-mute" aria-label="Звук"><svg viewBox="0 0 20 18" width="20" height="18"><path fill="#fff" d="M7.367 0.719C7.827 0.258 8.451 0.000 9.102 0.000C10.024 0.000 10.970 0.546 11.254 1.583C11.577 2.765 12.000 5.062 12.000 9.000C12.000 12.938 11.577 15.235 11.254 16.417C10.970 17.454 10.024 18.000 9.102 18.000C8.451 18.000 7.827 17.742 7.367 17.281L4.746 14.660C4.599 14.513 4.409 14.415 4.203 14.381L2.690 14.129C1.890 13.995 1.061 13.512 0.688 12.609C0.367 11.831 0.000 10.594 0.000 9.000C0.000 7.406 0.367 6.169 0.688 5.391C1.061 4.488 1.890 4.005 2.690 3.871L4.203 3.619C4.409 3.585 4.599 3.487 4.746 3.340L7.367 0.719Z"/><path fill="#fff" d="M14.293 6.293C14.683 5.902 15.317 5.902 15.707 6.293L17.000 7.586L18.293 6.293C18.683 5.902 19.317 5.902 19.707 6.293C20.098 6.683 20.098 7.317 19.707 7.707L18.414 9.000L19.707 10.293C20.098 10.683 20.098 11.317 19.707 11.707C19.317 12.098 18.683 12.098 18.293 11.707L17.000 10.414L15.707 11.707C15.317 12.098 14.683 12.098 14.293 11.707C13.902 11.317 13.902 10.683 14.293 10.293L15.586 9.000L14.293 7.707C13.902 7.317 13.902 6.683 14.293 6.293Z"/></svg></button>
      </div>
      <div class="sb-foot">
        <span class="sb-flags">
          <img class="sb-flag sb-flag-a" src="${PA}33NS6THVVAF523QHQ5823M4W8W.png" alt="">
          <img class="sb-flag sb-flag-b" src="${PA}307PFE7S4129KTGSE6NF6CJ6NF.png" alt="">
        </span>
        <span class="sb-title">Норвегия — Англия</span>
        <span class="sb-online"><svg class="sb-bolt" viewBox="0 0 12.5 16" width="11" height="14"><path fill="#fff" d="M6.625 5.838L12.108 5.838C12.427 5.838 12.610 6.150 12.427 6.418L5.986 15.828C5.757 16.140 5.300 16.006 5.300 15.605L5.300 10.164L0.366 10.164C0.092 10.164-0.090 9.852 0.047 9.585L5.575 0.175C5.757-0.137 6.260-0.003 6.305 0.353L6.625 5.838Z"/></svg>720К онлайн</span>
      </div>`;

// Чипы спортивного блока в Варианте 3 (4 шт., вертикальная колонка, макет L58).
const SB_CHIPS_V3 = [
  { t: "Матчи в эфире", b: SB_CHIPS[0].b, f: SB_CHIPS[0].f, active: true },
  { t: "Обзоры матчей", b: SB_CHIPS[2].b, f: SB_CHIPS[2].f },
  { t: "Лучшие моменты", b: SB_CHIPS[3].b, f: SB_CHIPS[3].f },
];

function fillLiveBlock(el) {
  if (!el) return;
  const chip = (c) => `
    <div class="sb-chip${c.active ? " is-active" : ""}">
      <span class="sb-chip-txt">${c.t}</span>
      <span class="sb-chip-thumbs">
        <img class="sb-th-back" src="${PA}${c.b}" alt="">
        <img class="sb-th-front" src="${PA}${c.f}" alt="">
      </span>
    </div>`;
  // Вариант 3 — плеер слева, справа колонка: лого FIFA + 4 чипа (макет L58).
  if (getMode() === "v3") {
    el.innerHTML = `
      <div class="sb-backdrop" style="background-image:linear-gradient(180deg,#000 -27%,#0000 71%),url(${PA}5G4MKA7B61T87JGZFYQFJFJAM7.png)"></div>
      <div class="sb-player" style="background-image:linear-gradient(180deg,#0000 60%,#0000007a 100%),url(${PA}3GM6SA7B2XZR7GHEEAQEJ3ADH7.png)">${SB_PLAYER_INNER}</div>
      <div class="sb-side">
        <div class="sb-fifa-lg" style="background-image:url(${PA}5NCKFXXAC8PF1BV347GT8Q06TA.png)"></div>
        <div class="sb-chips-v">${SB_CHIPS_V3.map(chip).join("")}</div>
      </div>`;
    return;
  }
  el.innerHTML = `
    <div class="sb-backdrop" style="background-image:linear-gradient(180deg,#000 -27%,#0000 71%),url(${PA}5G4MKA7B61T87JGZFYQFJFJAM7.png)"></div>
    <div class="sb-top">
      <div class="sb-fifa" style="background-image:url(${PA}5NCKFXXAC8PF1BV347GT8Q06TA.png)"></div>
      <div class="sb-chips">${SB_CHIPS.map(chip).join("")}</div>
    </div>
    <div class="sb-player" style="background-image:linear-gradient(180deg,#0000 60%,#0000007a 100%),url(${PA}3GM6SA7B2XZR7GHEEAQEJ3ADH7.png)">
      <div class="sb-controls">
        <button class="sb-ctrl sb-pause" aria-label="Пауза"><svg viewBox="0 0 34 42" width="28" height="34"><path fill="#fff" d="M6.482 0.158C8.431-0.030 9.405-0.124 10.408 0.305C11.213 0.649 12.058 1.416 12.478 2.183C13.000 3.140 13.000 4.299 13.000 6.616L13.000 35.181C13.000 37.639 13.000 38.868 12.476 39.826C12.043 40.616 11.231 41.352 10.402 41.705C9.397 42.132 8.326 42.027 6.185 41.816C5.421 41.741 4.670 41.635 3.913 41.489C2.795 41.273 2.236 41.165 1.597 40.723C1.105 40.384 0.553 39.715 0.313 39.168C0.000 38.457 0.000 37.733 0.000 36.286L0.000 5.937C0.000 4.328 0.000 3.523 0.321 2.803C0.583 2.218 1.106 1.596 1.639 1.239C2.294 0.800 2.978 0.682 4.345 0.446C5.064 0.322 5.769 0.227 6.482 0.158ZM23.592 0.305C24.595-0.124 25.569-0.030 27.518 0.158C28.231 0.227 28.936 0.322 29.655 0.446C31.022 0.682 31.706 0.800 32.361 1.239C32.894 1.596 33.417 2.218 33.679 2.803C34.000 3.523 34.000 4.328 34.000 5.937L34.000 36.286C34.000 37.733 34.000 38.457 33.688 39.168C33.447 39.715 32.895 40.384 32.403 40.723C31.764 41.165 31.205 41.273 30.087 41.489C29.330 41.635 28.579 41.741 27.815 41.816C25.674 42.027 24.603 42.132 23.598 41.705C22.769 41.352 21.957 40.616 21.524 39.826C21.000 38.868 21.000 37.639 21.000 35.181L21.000 6.616C21.000 4.299 21.000 3.140 21.522 2.183C21.942 1.416 22.787 0.649 23.592 0.305Z"/></svg></button>
        <button class="sb-ctrl sb-mute" aria-label="Звук"><svg viewBox="0 0 20 18" width="20" height="18"><path fill="#fff" d="M7.367 0.719C7.827 0.258 8.451 0.000 9.102 0.000C10.024 0.000 10.970 0.546 11.254 1.583C11.577 2.765 12.000 5.062 12.000 9.000C12.000 12.938 11.577 15.235 11.254 16.417C10.970 17.454 10.024 18.000 9.102 18.000C8.451 18.000 7.827 17.742 7.367 17.281L4.746 14.660C4.599 14.513 4.409 14.415 4.203 14.381L2.690 14.129C1.890 13.995 1.061 13.512 0.688 12.609C0.367 11.831 0.000 10.594 0.000 9.000C0.000 7.406 0.367 6.169 0.688 5.391C1.061 4.488 1.890 4.005 2.690 3.871L4.203 3.619C4.409 3.585 4.599 3.487 4.746 3.340L7.367 0.719Z"/><path fill="#fff" d="M14.293 6.293C14.683 5.902 15.317 5.902 15.707 6.293L17.000 7.586L18.293 6.293C18.683 5.902 19.317 5.902 19.707 6.293C20.098 6.683 20.098 7.317 19.707 7.707L18.414 9.000L19.707 10.293C20.098 10.683 20.098 11.317 19.707 11.707C19.317 12.098 18.683 12.098 18.293 11.707L17.000 10.414L15.707 11.707C15.317 12.098 14.683 12.098 14.293 11.707C13.902 11.317 13.902 10.683 14.293 10.293L15.586 9.000L14.293 7.707C13.902 7.317 13.902 6.683 14.293 6.293Z"/></svg></button>
      </div>
      <div class="sb-foot">
        <span class="sb-flags">
          <img class="sb-flag sb-flag-a" src="${PA}33NS6THVVAF523QHQ5823M4W8W.png" alt="">
          <img class="sb-flag sb-flag-b" src="${PA}307PFE7S4129KTGSE6NF6CJ6NF.png" alt="">
        </span>
        <span class="sb-title">Норвегия — Англия</span>
        <span class="sb-online"><svg class="sb-bolt" viewBox="0 0 12.5 16" width="11" height="14"><path fill="#fff" d="M6.625 5.838L12.108 5.838C12.427 5.838 12.610 6.150 12.427 6.418L5.986 15.828C5.757 16.140 5.300 16.006 5.300 15.605L5.300 10.164L0.366 10.164C0.092 10.164-0.090 9.852 0.047 9.585L5.575 0.175C5.757-0.137 6.260-0.003 6.305 0.353L6.625 5.838Z"/></svg>720К онлайн</span>
      </div>
    </div>`;
}

// Галерея шоу: иная вёрстка — ряд крупных широких карточек + ряд поменьше.
// Горизонтальные постеры (poster-horizontal) контента Иви.
const SHOW_GALS = [
  { title: "Главные шоу года", hru: "realiti-shou" },
  { title: "Популярные шоу на Иви", hru: "realiti-shou" },
];
// Демо-мета для шоу (реальных данных о статусе/жанре/сезонах нет).
const SHOW_STATUS = [
  { t: "новинка", c: "#21D468" },
  { t: "сейчас смотрит 52к", c: "#21D468" },
  { t: "популярно", c: "#FF8A00" },
  { t: "новые серии", c: "#21D468" },
  { t: "новинка", c: "#21D468" },
  { t: "новые серии", c: "#21D468" },
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
const isPaid = (it) => !!(it.content_paid_types && !it.content_paid_types.includes("AVOD"));
const showDesc = (it, i) => it.synopsis || SHOW_DESC[i % SHOW_DESC.length];
function showMetaLine(i) {
  const s = SHOW_STATUS[i % SHOW_STATUS.length];
  return `<span class="sm-status" style="color:${s.c}"><i class="sm-sdot" style="background:${s.c}"></i>${s.t}</span><span class="sm-sep">·</span>${SHOW_GENRE[i % SHOW_GENRE.length]}<span class="sm-sep">·</span>${SHOW_SEASONS[i % SHOW_SEASONS.length]}`;
}
// Карточка шоу: постер + оверлей «мета» при наведении (механика как у каналов, v2).
function showCard(it, cls, w, h, i) {
  return `<a class="${cls} show-card" href="https://www.ivi.ru/watch/${it.hru || it.id}" target="_blank" rel="noopener" title="${it.title}">
    <img class="show-img" loading="lazy" src="${contentThumb(it, w, h)}" alt="${it.title}">
    <div class="show-ov" aria-hidden="true">
      <div class="sm-ttl">${it.title}</div>
      <div class="sm-desc">${showDesc(it, i)}</div>
      <div class="sm-meta">${showMetaLine(i)}</div>
      <span class="sm-watch">${isPaid(it) ? "Купить подписку" : "Смотреть"}</span>
    </div>
  </a>`;
}
function fillShowGal(el) {
  if (!el) return;
  const g = SHOW_GALS[showSeq % SHOW_GALS.length]; showSeq++;
  // Вариант 3 — галерея шоу свёрстана как телеканалы (2 этажа 16:9 со скроллом).
  if (getMode() === "v3") return fillShowGalAsChannels(el, g.title);
  // Вариант 2 — ряды со скроллом вправо (больше постеров), v1 — сетка 3+5.
  const v2 = getMode() === "v2";
  const nBig = v2 ? 6 : 3, nSmall = v2 ? 12 : 5;
  el.innerHTML = `
    <h2 class="gal-head">${g.title} <span class="chev">›</span></h2>
    <div class="show-rows">
      <div class="show-hero">${Array.from({ length: nBig }, () => '<div class="show-big is-loading"></div>').join("")}</div>
      <div class="show-strip">${Array.from({ length: nSmall }, () => '<div class="show-small is-loading"></div>').join("")}</div>
    </div>
    <div class="gal-less" aria-hidden="true"><span class="gal-more-arrow gal-arrow-left">${ARROW_SVG}</span></div>
    <div class="gal-more" aria-hidden="true"><span class="gal-more-arrow">${ARROW_SVG}</span></div>`;
  if (v2) addShowScrollHint(el);
  Promise.all([
    collection("realiti-shou", { to: 20 }).catch(() => []),
    collection("popular-now-tvshows", { to: 30 }).catch(() => []),
  ]).then(([a, b]) => {
    const seen = new Set(), items = [];
    [...a, ...b].forEach((it) => { const k = it.id || it.hru; if (!seen.has(k)) { seen.add(k); items.push(it); } });
    if (!items.length) throw new Error("пусто");
    const big = items.slice(0, nBig), small = items.slice(nBig, nBig + nSmall);
    el.querySelector(".show-hero").innerHTML = big.map((it, i) => showCard(it, "show-big", 760, 428, i)).join("");
    el.querySelector(".show-strip").innerHTML = small.map((it, i) => showCard(it, "show-small", 480, 270, i + nBig)).join("");
    el.dispatchEvent(new CustomEvent("showloaded"));
  }).catch((err) => { el.querySelector(".show-hero").innerHTML = `<div class="reco-error">Не удалось загрузить: ${err.message}</div>`; });
}

// Вариант 3: шоу верстаются как телеканалы — та же .gal-grid (2 этажа 16:9 + скролл).
function fillShowGalAsChannels(el, title) {
  el.innerHTML = `
    <h2 class="gal-head">${title} <span class="chev">›</span></h2>
    <div class="gal-grid">${Array.from({ length: 12 }, () => '<div class="gal-cell"><div class="gal-thumb"></div></div>').join("")}</div>
    <div class="gal-less" aria-hidden="true"><span class="gal-more-arrow gal-arrow-left">${ARROW_SVG}</span></div>
    <div class="gal-more" aria-hidden="true"><span class="gal-more-arrow">${ARROW_SVG}</span></div>`;
  Promise.all([
    collection("realiti-shou", { to: 20 }).catch(() => []),
    collection("popular-now-tvshows", { to: 30 }).catch(() => []),
  ]).then(([a, b]) => {
    const seen = new Set(), items = [];
    [...a, ...b].forEach((it) => { const k = it.id || it.hru; if (!seen.has(k)) { seen.add(k); items.push(it); } });
    el.querySelector(".gal-grid").innerHTML = items.slice(0, 16).map((it) => `
      <div class="gal-cell">
        <a class="gal-thumb" href="https://www.ivi.ru/watch/${it.hru || it.id}" target="_blank" rel="noopener" title="${it.title}">
          <img class="gal-img" loading="lazy" src="${contentThumb(it, 760, 428)}" alt="${it.title}">
        </a>
      </div>`).join("");
    addScrollHint(el);
  }).catch((err) => { el.querySelector(".gal-grid").innerHTML = `<div class="reco-error">Не удалось загрузить: ${err.message}</div>`; });
}

// Градиенты-подсказки скролла для галереи шоу (как у каналов) — по рядам show-rows.
function addShowScrollHint(el) {
  const rows = el.querySelector(".show-rows");
  const more = el.querySelector(".gal-more"), less = el.querySelector(".gal-less");
  if (!rows || !more || rows.dataset.hint) return;
  rows.dataset.hint = "1";
  more.querySelector(".gal-more-arrow").addEventListener("click", () => rows.scrollBy({ left: rows.clientWidth * 0.8, behavior: "smooth" }));
  less?.querySelector(".gal-more-arrow").addEventListener("click", () => rows.scrollBy({ left: -rows.clientWidth * 0.8, behavior: "smooth" }));
  const sync = () => {
    const sRect = el.getBoundingClientRect(), rRect = rows.getBoundingClientRect();
    const top = (rRect.top - sRect.top) + "px", h = rRect.height + "px";
    more.style.top = top; more.style.height = h;
    if (less) { less.style.top = top; less.style.height = h; }
    const scrollable = rows.scrollWidth > rows.clientWidth + 4;
    more.classList.toggle("is-hidden", !scrollable || rows.scrollLeft + rows.clientWidth >= rows.scrollWidth - 4);
    if (less) less.classList.toggle("is-hidden", rows.scrollLeft <= 4);
  };
  sync();
  rows.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", sync);
  el.addEventListener("showloaded", sync);
  setTimeout(sync, 400);
}

// Мегаблок «Топовые шоу» (макет IV5-0) — заголовок на фоне, табы, сетка 2×3.
const TS_TABS = ["Смотрят больше всего", "Про отношения", "Соревновательные", "Развлекательные"];
function fillTopShows(el) {
  if (!el) return;
  el.innerHTML = `
    <div class="ts-bg"></div>
    <h2 class="ts-title">Топовые шоу</h2>
    <div class="ts-tabs">${TS_TABS.map((t, i) => `<button class="ts-tab${i === 0 ? " is-active" : ""}" data-label="${t}">${t}</button>`).join("")}</div>
    <div class="ts-grid">${Array.from({ length: 6 }, () => '<div class="ts-card is-loading"></div>').join("")}</div>`;
  el.querySelector(".ts-tabs").addEventListener("click", (e) => {
    const b = e.target.closest(".ts-tab"); if (!b) return;
    el.querySelectorAll(".ts-tab").forEach((t) => t.classList.toggle("is-active", t === b));
  });
  collection("realiti-shou", { to: 16 })
    .then((items) => {
      el.querySelector(".ts-grid").innerHTML = items.slice(0, 6).map((it) => `
        <a class="ts-card" href="https://www.ivi.ru/watch/${it.hru || it.id}" target="_blank" rel="noopener" title="${it.title}">
          <div class="ts-poster"><img loading="lazy" src="${contentThumb(it, 760, 428)}" alt="${it.title}"></div>
        </a>`).join("");
    })
    .catch(() => {});
}

window.addEventListener("modechange", () => { if (isV1like()) renderV1(); });

// ---- ТВ шоу (реальные постеры) ----
const shows = document.getElementById("catShows");
shows.innerHTML = Array.from({ length: 8 }, () => '<div class="poster-card is-loading"><span class="poster-img"></span></div>').join("");
collection("popular-now-tvshows", { to: 11 })
  .then((items) => {
    shows.innerHTML = items.map((it) => `
      <a class="poster-card" href="https://www.ivi.ru/watch/${it.hru || it.id}" target="_blank" rel="noopener">
        <span class="poster-img">${poster(it) ? `<img loading="lazy" src="${poster(it)}" alt="">` : ""}</span>
        <span class="poster-name">${it.title}</span>
        <span class="poster-access">${accessLabel(it)}</span>
      </a>`).join("");
  })
  .catch((err) => { shows.innerHTML = `<div class="reco-error">Не удалось загрузить: ${err.message}</div>`; });

// ---- Самое интересное — блок убран (без постеров) ----

// ---- Развернуть описание ----
document.getElementById("catSeoExpand").addEventListener("click", (e) => {
  const p = document.getElementById("catSeo");
  const open = p.classList.toggle("is-expanded");
  e.currentTarget.textContent = open ? "Свернуть" : "Развернуть";
});
