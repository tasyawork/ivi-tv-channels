import { tvChannels, nowOnChannel, mskTime } from "./ivi-api.js";

const id = new URLSearchParams(location.search).get("id");
const $ = (x) => document.getElementById(x);

const DEMO = [
  "Новости", "Утро в эфире", "Доброе утро", "Вести", "Контрольная закупка",
  "Жить здорово", "Модный приговор", "Давай поженимся", "Пусть говорят",
  "Время покажет", "Поле чудес", "Вечерние новости", "Док-ток",
  "Большая игра", "На самом деле", "Подкаст.Лаб", "Сегодня вечером",
  "Тайны следствия", "Вести в 20:00", "Местное время", "О самом главном",
];
const AGES = [0, 6, 12, 16, 18];
const GRID = [
  "05:00", "07:00", "09:00", "09:30", "10:00", "11:00", "12:00", "13:30",
  "14:00", "16:00", "17:00", "18:30", "20:00", "21:00", "22:00", "23:30",
  "00:40", "01:30", "02:40", "03:30",
];

const dayMin = (t) => {
  let [h, m] = t.split(":").map(Number);
  let v = h * 60 + m;
  if (v < 5 * 60) v += 24 * 60; // раннее утро — в конец суток
  return v;
};

function fullDay(seed) {
  return GRID.map((t, i) => {
    const name = DEMO[(seed * 5 + i * 7) % DEMO.length];
    const age = AGES[(seed + i) % AGES.length];
    return { time: t, title: `${name}, ${age}+` };
  });
}

let channel = null;
let nowTc = null;
let activeDay = 0;

function renderList() {
  const seed = (channel.id % 97) + activeDay * 11;
  let rows = fullDay(seed);
  // Сегодня — вставляем реальную передачу «сейчас»
  if (activeDay === 0 && nowTc) {
    const nowT = mskTime(nowTc.start);
    const nm = dayMin(nowT);
    rows = rows.filter((r) => Math.abs(dayMin(r.time) - nm) > 25);
    rows.push({ time: nowT, title: nowTc.title, now: true });
    rows.sort((a, b) => dayMin(a.time) - dayMin(b.time));
  }
  $("fullEpg").innerHTML = rows
    .map((r) => `<div class="fe-row${r.now ? " is-now" : ""}">
      <span class="fe-dot"></span>
      <span class="fe-time">${r.time}</span>
      <span class="fe-title">${r.title}</span>
      ${r.now ? '<span class="fe-underline"></span>' : ""}
    </div>`).join("");
}

function buildDayTabs() {
  const names = ["сегодня", "завтра"];
  const wd = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
  const base = new Date();
  for (let i = 2; i < 4; i++) {
    const d = new Date(base.getTime() + i * 86400000);
    names.push(wd[d.getDay()]);
  }
  $("dayTabs").innerHTML = names
    .map((n, i) => `<button class="day-tab${i === 0 ? " is-active" : ""}" data-i="${i}">${n}</button>`)
    .join("");
  $("dayTabs").addEventListener("click", (e) => {
    const b = e.target.closest(".day-tab");
    if (!b) return;
    activeDay = +b.dataset.i;
    $("dayTabs").querySelectorAll(".day-tab").forEach((t) => t.classList.toggle("is-active", t === b));
    renderList();
  });
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
  let channels;
  try { channels = await tvChannels(); } catch (e) {
    $("schTitle").textContent = "Не удалось загрузить канал";
    return;
  }
  channel = channels.find((c) => String(c.id) === String(id)) || channels[0];
  document.title = `Иви — ${channel.title} · Телепрограмма`;
  $("schTitle").textContent = channel.title;
  $("schDesc").textContent = channel.description || "";
  if (!channel.description) $("schExpand").style.display = "none";
  renderList(); // покажем демо сразу
  try {
    nowTc = await nowOnChannel(channel.id);
    renderList();
  } catch {}
})();
