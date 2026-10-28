// Drag-and-drop каналов в ленте второго этажа фильтров (.v4d-strip) — только во вкладке
// «Мои каналы»: зажать постер (на тач-экране — долгое нажатие, мышью — просто потянуть)
// и двигать влево-вправо внутри ленты.
// Делегирование на document: ленты перерисовываются при смене категории.
const HOLD_MS = 350;   // сколько держать до начала перетаскивания
const SLOP = 8;        // сдвиг до срабатывания = это скролл, а не зажатие
const EDGE = 48;       // зона автопрокрутки у краёв ленты

let st = null; // { chip, strip, x0, y0, timer, dragging, grabDX, tx }

// ---- «Мои каналы»: перетаскивать можно только здесь ----
// Порядок ленты = лайкнутые (в своём порядке, новый лайк — первым), дальше «продолжить
// просмотр» — что смотрели от минуты (см. filterByTag("__my") в ivi-api.js).
const FAV_KEY = "ivi-fav-channels";
const WATCHED_KEY = "ivi-watched-channels";
const read = (k) => { try { return (JSON.parse(localStorage.getItem(k)) || []).map(String); } catch { return []; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const inMyChannels = () =>
  /^\s*Мои каналы/.test(document.querySelector("#tabs .tab.is-active")?.textContent || "");

// После перетаскивания: канал, поставленный перед любым лайкнутым, сам становится
// лайкнутым; порядок лайков = их порядок в ленте.
function save(strip) {
  const favs = new Set(read(FAV_KEY));
  const chips = [...strip.querySelectorAll(".v4d-chip")];
  const lastFav = chips.map((c) => favs.has(c.dataset.id)).lastIndexOf(true);
  const pos = chips.indexOf(st.chip);
  if (pos === 0 || pos < lastFav) favs.add(st.chip.dataset.id); // первым или перед лайкнутым → лайк
  const order = chips.map((c) => c.dataset.id).filter((id) => favs.has(id));
  // Лайкнутые каналы, которых нет в ленте (на всякий случай), сохраняем в конце.
  write(FAV_KEY, [...order, ...[...favs].filter((id) => !order.includes(id))]);
  chips.forEach((c) => c.querySelector(".v4d-chip-fav")?.classList.toggle("is-fav", favs.has(c.dataset.id)));
}

// «Продолжить просмотр»: канал, который смотрят в плеере минуту и дольше, попадает
// в начало списка просмотренных. Плеер пишет текущий канал в v4bCurrentChannel.
let watchId = null, watchFrom = 0;
setInterval(() => {
  const id = localStorage.getItem("v4bCurrentChannel");
  if (id !== watchId) { watchId = id; watchFrom = Date.now(); return; }
  if (!id || Date.now() - watchFrom < 60000) return;
  const w = read(WATCHED_KEY);
  if (w[0] !== id) write(WATCHED_KEY, [id, ...w.filter((x) => x !== id)].slice(0, 20));
}, 5000);

function cancel() {
  if (!st) return;
  clearTimeout(st.timer);
  if (st.dragging) {
    const { chip, strip } = st;
    chip.classList.remove("is-dragging");
    strip.classList.remove("is-sorting");
    chip.style.transform = "";
    save(strip);
    // Глушим клик, который придёт следом за отпусканием (иначе переключится канал).
    const kill = (e) => { e.stopPropagation(); e.preventDefault(); };
    document.addEventListener("click", kill, { capture: true, once: true });
    setTimeout(() => document.removeEventListener("click", kill, true), 0);
  }
  st = null;
}

// FLIP: соседи плавно доезжают на новые места после перестановки в DOM.
function flip(strip, mutate) {
  const chips = [...strip.querySelectorAll(".v4d-chip:not(.is-dragging)")];
  const before = new Map(chips.map((c) => [c, c.getBoundingClientRect().left]));
  mutate();
  chips.forEach((c) => {
    const dx = before.get(c) - c.getBoundingClientRect().left;
    if (!dx) return;
    c.style.transition = "none";
    c.style.transform = `translateX(${dx}px)`;
    requestAnimationFrame(() => { c.style.transition = "transform .18s ease"; c.style.transform = ""; });
  });
}

function startDrag() {
  const { chip, strip } = st;
  st.dragging = true;
  st.grabDX = st.x0 - chip.getBoundingClientRect().left;
  chip.classList.add("is-dragging");
  strip.classList.add("is-sorting");
  navigator.vibrate?.(15);
}

function move(x) {
  const { chip, strip } = st;
  // Держим постер под пальцем, но не даём выйти за края ленты.
  const sr = strip.getBoundingClientRect();
  const w = chip.offsetWidth;
  const left = Math.min(Math.max(x - st.grabDX, sr.left), sr.right - w);
  // Сосед, чью середину перешли, — меняемся местами.
  const center = left + w / 2;
  const target = [...strip.querySelectorAll(".v4d-chip:not(.is-dragging)")].find((c) => {
    const r = c.getBoundingClientRect(); return center > r.left && center < r.right;
  });
  if (target) {
    const r = target.getBoundingClientRect();
    const ref = center > r.left + r.width / 2 ? target.nextSibling : target;
    if (ref !== chip && ref !== chip.nextSibling) flip(strip, () => strip.insertBefore(chip, ref));
  }
  // Сдвиг относительно места постера в раскладке (без текущего transform).
  const layoutLeft = chip.getBoundingClientRect().left - (st.tx || 0);
  st.tx = left - layoutLeft;
  chip.style.transform = `translateX(${st.tx}px)`;
  // Автопрокрутка ленты, когда тянем к краю.
  if (x < sr.left + EDGE) strip.scrollLeft -= 8;
  else if (x > sr.right - EDGE) strip.scrollLeft += 8;
}

document.addEventListener("pointerdown", (e) => {
  if (e.button > 0) return;
  const chip = e.target.closest(".v4d-strip .v4d-chip");
  if (!chip || e.target.closest(".v4d-chip-fav") || !inMyChannels()) return;
  cancel();
  st = { chip, strip: chip.parentElement, x0: e.clientX, y0: e.clientY, dragging: false };
  st.timer = setTimeout(() => st && startDrag(), HOLD_MS);
});

document.addEventListener("pointermove", (e) => {
  if (!st) return;
  if (!st.dragging) {
    if (Math.hypot(e.clientX - st.x0, e.clientY - st.y0) <= SLOP) return;
    // Мышью тянут сразу, без удержания; на тач-экране сдвиг до удержания = скролл ленты.
    if (e.pointerType !== "mouse") { cancel(); return; }
    clearTimeout(st.timer);
    startDrag();
  }
  e.preventDefault();
  move(e.clientX);
});

document.addEventListener("pointerup", cancel);
document.addEventListener("pointercancel", cancel);
// На тач-экране во время перетаскивания не даём браузеру скроллить ленту/страницу.
document.addEventListener("touchmove", (e) => { if (st?.dragging) e.preventDefault(); }, { passive: false });
// Долгое нажатие не должно открывать контекстное меню / «сохранить картинку».
document.addEventListener("contextmenu", (e) => { if (e.target.closest(".v4d-strip .v4d-chip")) e.preventDefault(); });
