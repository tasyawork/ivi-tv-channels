import {
  tvChannels, channelLogo, channelThumb, nowOnChannel, telecastThumb,
  mskTime, PLAYER_TABS, filterByTag, demoSchedule,
  collection, poster, accessLabel,
} from "./ivi-api.js";

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

// ---- Отрисовка выбранного канала ----
async function renderChannel() {
  const crumb = document.getElementById("crumbChannel");
  if (crumb) crumb.textContent = channel.title;
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
reco.innerHTML = Array.from({ length: 7 }, () => '<div class="poster-card is-loading"><span class="poster-img"></span></div>').join("");
collection("popular-now-tvshows", { to: 13 })
  .then((items) => {
    reco.innerHTML = items.map((it) => `
      <a class="poster-card" href="https://www.ivi.ru/watch/${it.hru || it.id}" target="_blank" rel="noopener">
        <span class="poster-img">${poster(it) ? `<img loading="lazy" src="${poster(it)}" alt="">` : ""}</span>
        <span class="poster-name">${it.title}</span>
        <span class="poster-access">${accessLabel(it)}</span>
      </a>`).join("");
  })
  .catch((err) => { reco.innerHTML = `<div class="reco-error">Не удалось загрузить данные Иви: ${err.message}</div>`; });
