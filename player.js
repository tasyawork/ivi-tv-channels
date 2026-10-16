import {
  tvChannels, channelLogo, channelThumb, nowOnChannel, telecastThumb,
  mskTime, PLAYER_TABS, filterByTag, demoSchedule,
  collection, poster, accessLabel, contentThumb, isSportChannel, SPORT_PAYWALL_HTML,
} from "./ivi-api.js";

// Промо подписки «Матч Футбол» поверх плеера — для спортивных каналов.
(function setupSportPaywall() {
  const player = document.getElementById("player");
  if (player && !player.querySelector(".sport-paywall")) player.insertAdjacentHTML("beforeend", SPORT_PAYWALL_HTML);
})();

const params = new URLSearchParams(location.search);
const wantId = params.get("id");
let channels = [];
let channel = null;
let activeTab = 0; // индекс в PLAYER_TABS

const $ = (id) => document.getElementById(id);

// Кэш запроса «сейчас в эфире» по каналу (чтобы не дёргать API дважды).
const nowCache = new Map();
function loadNow(id) {
  if (!nowCache.has(id)) nowCache.set(id, nowOnChannel(id).catch(() => null));
  return nowCache.get(id);
}

// ---- Поповер канала при наведении ----
const pop = document.createElement("div");
pop.className = "chip-pop";
document.body.appendChild(pop);
let popTimer = null;

function renderPop(tc, loading) {
  if (loading) { pop.innerHTML = `<div class="pop-empty">Загрузка эфира…</div>`; return; }
  if (!tc) { pop.innerHTML = `<div class="pop-empty">Нет данных об эфире</div>`; return; }
  const thumb = telecastThumb(tc);
  const nowRow = `<div class="pop-row is-now">
    <span class="pop-dot"></span><span class="pop-time">${mskTime(tc.start)}</span>
    <span class="pop-title">${tc.title}</span></div>`;
  const next = demoSchedule(tc.end, tc.restrict ?? 16, 2).map((r) => `
    <div class="pop-row"><span class="pop-dot"></span><span class="pop-time">${r.time}</span>
    <span class="pop-title">${r.title}</span></div>`).join("");
  pop.innerHTML = `${thumb ? `<div class="pop-thumb"><img src="${thumb}" alt=""></div>` : ""}<div class="pop-list">${nowRow}${next}</div>`;
}

function showPop(chipEl, id) {
  clearTimeout(popTimer);
  const r = chipEl.getBoundingClientRect();
  pop.style.left = `${Math.round(r.left)}px`;
  pop.style.top = `${Math.round(r.bottom + 10)}px`;
  pop.dataset.id = String(id);
  pop.classList.add("is-visible");
  const cached = nowCache.get(id);
  renderPop(null, true);
  loadNow(id).then((tc) => { if (pop.dataset.id === String(id)) renderPop(tc, false); });
}
function hidePop() {
  popTimer = setTimeout(() => pop.classList.remove("is-visible"), 90);
}

// ---- Табы ----
const ptabs = $("ptabs");
ptabs.innerHTML = PLAYER_TABS.map(
  (t, i) => `<button class="ptab" data-i="${i}">${t.label}</button>`
).join("");
ptabs.addEventListener("click", (e) => {
  const b = e.target.closest(".ptab");
  if (!b) return;
  activeTab = +b.dataset.i;
  ptabs.querySelectorAll(".ptab").forEach((t) => t.classList.toggle("is-active", t === b));
  renderChips();
});

// ---- Чипсы каналов ----
function renderChips() {
  const tab = PLAYER_TABS[activeTab];
  const list = filterByTag(channels, tab.tag);
  $("chips").innerHTML = list
    .map((c) => `<a class="chip${c.id === channel.id ? " is-active" : ""}" href="player.html?id=${c.id}" data-id="${c.id}">
      <span class="chip-logo"><img loading="lazy" src="${channelThumb(c)}" alt=""></span>
      <span class="chip-body">
        <span class="chip-prog" data-chip="${c.id}">${c.title}</span>
        <span class="chip-bar"><span class="chip-bar-fill"></span></span>
      </span>
    </a>`).join("");
  requestAnimationFrame(() => {
    const act = document.querySelector(".chip.is-active");
    if (act) act.scrollIntoView({ inline: "center", block: "nearest" });
  });
  // реальная передача «сейчас» в первых чипсах
  list.slice(0, 16).forEach((c) => {
    loadNow(c.id).then((tc) => {
      const el = document.querySelector(`[data-chip="${c.id}"]`);
      if (el && tc) el.textContent = tc.title;
    });
  });
  // поповер по наведению на любой чипс
  $("chips").querySelectorAll(".chip").forEach((chipEl) => {
    const id = chipEl.dataset.id;
    chipEl.addEventListener("mouseenter", () => showPop(chipEl, id));
    chipEl.addEventListener("mouseleave", hidePop);
  });
}

// ---- EPG (реальное «сейчас» + демо) ----
function renderEpg(tc) {
  const restrict = tc?.restrict ?? 16;
  const nowRow = tc
    ? `<div class="epg-row is-now">
        <span class="epg-time">${mskTime(tc.start)}</span>
        <span class="epg-title">${tc.title}</span>
        <span class="epg-underline"></span>
      </div>`
    : "";
  const demo = demoSchedule(tc?.end, restrict, 15)
    .map((r, i) => {
      const live = i % 4 === 1;
      return `<div class="epg-row is-demo">
        <span class="epg-time">${r.time}</span>
        <span class="epg-title">${r.title}</span>
        ${live ? '<span class="epg-live">Смотреть сейчас</span>' : ""}
      </div>`;
    }).join("");
  $("epg").innerHTML = nowRow + demo;
}

// ---- Высота списка = высоте плеера ----
function syncEpgHeight() {
  const p = $("player"), e = document.querySelector(".epg");
  if (p && e) e.style.height = p.clientHeight + "px";
}

// ---- Полноэкранная «Программа передач канала» (мобайл, макет TCZ) ----
// Открывается поверх плеера по кнопке «Телепрограмма ›».
const TVP_WD = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const TVP_LIVE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none"/><path d="M16.9 7.1a7 7 0 010 9.8M7.1 16.9a7 7 0 010-9.8"/></svg>';
const TVP_GENRE = "Телекомедия, сезон 6";
let tvpOverlay = null;
function tvpDates() {
  const today = new Date();
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() + i);
    const dd = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = i === 0 ? `сегодня, ${dd}` : i === 1 ? `завтра, ${dd}` : `${TVP_WD[d.getDay()]}, ${dd}`;
    return `<button class="tvp-date${i === 0 ? " is-active" : ""}">${label}</button>`;
  }).join("");
}
function tvpRow(time, title, now) {
  return `<div class="tvp-row${now ? " is-now" : ""}">
    <span class="tvp-time">${time}</span>
    <div class="tvp-main"><div class="tvp-ttl">${title}</div><div class="tvp-sub">${TVP_GENRE}</div></div>
    ${now ? `<span class="tvp-live">${TVP_LIVE}</span>` : ""}
  </div>`;
}
function tvpRows(tc) {
  const restrict = tc?.restrict ?? 16;
  const now = tc ? tvpRow(mskTime(tc.start), tc.title, true) : "";
  const rest = demoSchedule(tc?.end, restrict, 12).map((r) => tvpRow(r.time, r.title, false)).join("");
  return now + rest;
}
function openTvProg() {
  if (!tvpOverlay) {
    tvpOverlay = document.createElement("div");
    tvpOverlay.className = "tvprog-overlay";
    tvpOverlay.innerHTML = `
      <div class="tvprog-sheet">
        <button class="tvprog-close" aria-label="Закрыть">✕</button>
        <h2 class="tvprog-title"></h2>
        <div class="tvprog-dates"></div>
        <div class="tvprog-list"></div>
        <div class="tvprog-about"><p class="tvprog-desc"></p><button class="tvprog-expand">Развернуть</button></div>
      </div>`;
    (document.querySelector(".page") || document.body).appendChild(tvpOverlay);
    tvpOverlay.addEventListener("click", (e) => {
      if (e.target === tvpOverlay || e.target.closest(".tvprog-close")) closeTvProg();
    });
    tvpOverlay.querySelector(".tvprog-dates").addEventListener("click", (e) => {
      const b = e.target.closest(".tvp-date"); if (!b) return;
      tvpOverlay.querySelectorAll(".tvp-date").forEach((x) => x.classList.toggle("is-active", x === b));
    });
    tvpOverlay.querySelector(".tvprog-expand").addEventListener("click", (e) => {
      const open = tvpOverlay.querySelector(".tvprog-desc").classList.toggle("is-expanded");
      e.target.textContent = open ? "Свернуть" : "Развернуть";
    });
  }
  tvpOverlay.querySelector(".tvprog-title").textContent = `Программа передач канала ${channel?.title || ""}`;
  tvpOverlay.querySelector(".tvprog-dates").innerHTML = tvpDates();
  tvpOverlay.querySelector(".tvprog-desc").textContent = $("chAbout")?.textContent || "";
  tvpOverlay.querySelector(".tvprog-list").innerHTML = "";
  loadNow(channel.id)
    .then((tc) => { tvpOverlay.querySelector(".tvprog-list").innerHTML = tvpRows(tc); })
    .catch(() => { tvpOverlay.querySelector(".tvprog-list").innerHTML = tvpRows(null); });
  tvpOverlay.classList.add("is-open");
}
function closeTvProg() { tvpOverlay?.classList.remove("is-open"); }

// Кликабельный заголовок «Телепрограмма ›» (мобайл) открывает оверлей.
(function setupTvProgHead() {
  const aside = document.querySelector(".epg");
  if (!aside || aside.querySelector(".epg-head")) return;
  const head = document.createElement("button");
  head.className = "epg-head";
  head.innerHTML = `Телепрограмма <span class="chev">›</span>`;
  head.addEventListener("click", openTvProg);
  aside.insertBefore(head, aside.firstChild);
})();

// ---- Отрисовка выбранного канала ----
async function renderChannel() {
  const crumb = document.getElementById("crumbChannel");
  if (crumb) crumb.textContent = channel.title;
  const pw = document.querySelector(".sport-paywall");
  if (pw) pw.hidden = !isSportChannel(channel);
  $("playerBg").src = channelThumb(channel);
  for (const id of ["chName", "chName2"]) $(id).textContent = channel.title;
  for (const id of ["chLogo", "chLogo2"]) $(id).innerHTML = `<img src="${channelThumb(channel)}" alt="">`;
  $("chAbout").textContent = channel.description || `Прямой эфир телеканала «${channel.title}» онлайн на Иви.`;

  $("playerTitle").textContent = "Загрузка эфира…";
  $("playerSub").textContent = "Прямой эфир";
  renderEpg(null);

  try {
    const tc = await loadNow(channel.id);
    if (tc) {
      $("playerTitle").textContent = tc.title;
      $("playerSub").textContent = `${mskTime(tc.start)} в эфире · прямой эфир`;
      $("chProg").textContent = tc.title.replace(/,\s*\d+\+$/, "");
      const desc = document.querySelector(".chmeta-desc");
      if (tc.description) desc.textContent = tc.description;
      const thumb = telecastThumb(tc);
      if (thumb) $("playerBg").src = thumb;
    } else {
      $("playerTitle").textContent = channel.title;
      $("playerSub").textContent = "Прямой эфир";
    }
    renderEpg(tc);
    syncEpgHeight();
  } catch {
    $("playerTitle").textContent = channel.title;
    renderEpg(null);
  }
}

// ---- Инициализация ----
(async function init() {
  try {
    channels = await tvChannels();
  } catch (err) {
    const crumb = document.getElementById("crumbChannel");
    if (crumb) crumb.textContent = "Ошибка загрузки";
    $("playerTitle").textContent = "Не удалось загрузить каналы: " + err.message;
    return;
  }
  channel = channels.find((c) => String(c.id) === String(wantId)) || channels[0];

  // если пришли по старой ссылке ?ch=<index> из главной
  const chIdx = params.get("ch");
  if (!wantId && chIdx != null && channels[+chIdx]) channel = channels[+chIdx];

  // активный таб = первый, где есть этот канал (после «Все каналы»)
  for (let i = 1; i < PLAYER_TABS.length; i++) {
    if (filterByTag(channels, PLAYER_TABS[i].tag).some((c) => c.id === channel.id)) { activeTab = i; break; }
  }
  ptabs.querySelectorAll(".ptab").forEach((t) => t.classList.toggle("is-active", +t.dataset.i === activeTab));

  renderChips();
  await renderChannel();
  new ResizeObserver(syncEpgHeight).observe($("player"));
  syncEpgHeight();
})();

// ---- «Вся телепрограмма» -> экран телепрограммы ----
document.querySelector(".epg-all").addEventListener("click", () => {
  if (channel) location.href = `schedule.html?id=${channel.id}`;
});

// ---- Пауза/воспроизведение ----
$("playBtn").addEventListener("click", (e) => {
  const b = e.currentTarget;
  const paused = b.classList.toggle("is-paused");
  b.innerHTML = paused
    ? '<svg viewBox="0 0 20 20" width="20" height="20"><path fill="#fff" d="M5 3l12 7-12 7z"/></svg>'
    : '<svg viewBox="0 0 20 20" width="20" height="20"><path fill="#fff" d="M6 3h3v14H6zM11 3h3v14h-3z"/></svg>';
});

// ---- Реальные данные Иви: ряд рекомендаций ----
const reco = $("reco");
reco.innerHTML = Array.from({ length: 10 }, () => '<a class="hp-card is-loading"><span class="hp-img"></span></a>').join("");
collection("popular-now-tvshows", { to: 19 })
  .then((items) => {
    reco.innerHTML = items.map((it) => `
      <a class="hp-card" href="https://www.ivi.ru/watch/${it.hru || it.id}" target="_blank" rel="noopener" title="${it.title}">
        <span class="hp-img">${contentThumb(it, 480, 270) ? `<img loading="lazy" src="${contentThumb(it, 480, 270)}" alt="${it.title}">` : ""}</span>
      </a>`).join("");
  })
  .catch((err) => { reco.innerHTML = `<div class="reco-error">Не удалось загрузить данные Иви: ${err.message}</div>`; });
