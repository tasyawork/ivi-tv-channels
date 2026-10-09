// Обёртка над публичным mobileapi Иви.
// Отвечает без токена, CORS открыт под запрашивающий origin.
const BASE = "https://api2.ivi.ru/mobileapi";
const COMMON = "app_version=870&country_place_id=41207";

async function call(path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${BASE}/${path}?${COMMON}${qs ? "&" + qs : ""}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(`ivi ${data.error.code}: ${data.error.message}`);
  return data.result;
}

// ---------- Изображения ----------
// Выбор нужного формата из массива {path/url, content_format} с фолбэком.
export function pick(arr, format) {
  const list = arr || [];
  const hit = list.find((x) => x.content_format === format);
  const chosen = hit || list[0] || {};
  return chosen.path || chosen.url || "";
}

// ---------- ТВ-каналы (реальные, живые) ----------
let _channelsCache = null;
export async function tvChannels() {
  if (_channelsCache) return _channelsCache;
  const r = await call("tvchannels/v7/", { from: 0, to: 99 });
  _channelsCache = r;
  return r;
}

export function channelLogo(ch) {
  return pick(ch.logo, "TVLogo-192x192") || pick(ch.logo, "TVLogo-scalable");
}
export function channelThumb(ch) {
  return pick(ch.thumbs, "TVThumb-1280x720");
}
// Фирменная цветная обложка канала, как на проде ivi.ru/tvplus:
// тот же TVThumb, но через ресайзер ivi (webp, нужный размер).
export function channelCover(ch, w = 672, h = 378) {
  const base = channelThumb(ch);
  return base ? `${base}/${w}x${h}/?q=85&mod=to_webp` : "";
}

// Список передач канала (живые данные): title, start, end, thumbs, restrict.
export async function channelTelecasts(id) {
  const r = await call("telecasts/v7/", { tvchannel: id });
  return (r && r[0] && r[0].telecasts) || [];
}

// Передача «сейчас в эфире» на канале (живые данные).
export async function nowOnChannel(id) {
  return (await channelTelecasts(id))[0] || null;
}

export function telecastThumb(tc) {
  return tc ? pick(tc.thumbs, "TVThumb-1066x600") : "";
}

// ---------- Контентные подборки (фильмы/сериалы) ----------
export function collection(hru, { from = 0, to = 19 } = {}) {
  return call("collection/catalog/v7/", {
    hru,
    sort: "relevance",
    fields: "id,title,hru,posters,thumbs,synopsis,object_type,content_paid_types,restrict",
    from,
    to,
  });
}
export function poster(item, format = "Posters-782x1200") {
  return pick(item.posters, format);
}
// Широкая (16:9) обложка контента для карточек-лент шоу.
// Приоритет — горизонтальный постер (Posters-3840x2160), затем thumb/портрет.
export function contentThumb(item, w = 640, h = 360) {
  const horiz = (item.posters || []).find((p) => p.content_format === "Posters-3840x2160");
  const base = (horiz && (horiz.path || horiz.url)) || pick(item.thumbs) || pick(item.posters);
  return base ? `${base}/${w}x${h}/?q=85&mod=to_webp` : "";
}
export function accessLabel(item) {
  const t = item.content_paid_types || [];
  return t.includes("AVOD") ? "Бесплатно" : "Подписка";
}

// ---------- Серии шоу-компиляции (реальные кадры эпизодов) ----------
// Для блока «Все выпуски шоу» на экране телепрограммы канала.
// fake=1 добавляет ещё не вышедшие серии; длительность — из localizations,
// дата выхода — из ivi_release_info (может отсутствовать).
const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря"];
function releaseDate(v) {
  const iso = (v.ivi_release_info || {}).date_interval_min;
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return m ? `${d} ${MONTHS[m - 1]}` : "";
}
// Горизонтальный постер шоу/сериала (16:9) — для обложки передачи,
// чтобы она не дублировала кадр первой серии в ленте.
export async function showPoster(id) {
  const r = await call("compilationinfo/v7/", { id, fields: "id,posters" });
  return pick((r || {}).posters, "Posters-3840x2160") || pick((r || {}).posters);
}
export async function showEpisodes(id, count = 8) {
  const r = await call("videofromcompilation/v7/", {
    id, fake: 1, from: 0, to: count - 1,
    fields: "id,hru,title,episode,season,thumbs,localizations,ivi_release_info",
  });
  return (r || []).map((v) => ({
    id: v.id, hru: v.hru, title: v.title, episode: v.episode,
    still: pick(v.thumbs, "Thumb-640x480"),
    duration: (v.localizations && v.localizations[0] && v.localizations[0].duration) || 0,
    date: releaseDate(v),
  }));
}

// ---------- Время ----------
// Время начала передачи из ISO (UTC) в МСК (UTC+3), формат HH:MM.
export function mskTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const msk = new Date(d.getTime() + 3 * 3600 * 1000);
  return `${String(msk.getUTCHours()).padStart(2, "0")}:${String(msk.getUTCMinutes()).padStart(2, "0")}`;
}

// ---------- Категории (теги каналов) ----------
// Полный список (8 категорий) — используется в плеере всегда и на главной в Варианте 1.
export const TABS = [
  { label: "Все каналы", tag: null, heading: "Все каналы" },
  { label: "Развлекательное", tag: "развлекательные каналы", heading: "Развлекательные каналы" },
  { label: "Федеральные", tag: "федеральные каналы", heading: "Федеральные каналы" },
  { label: "Детские", tag: "детские каналы", heading: "Детские каналы" },
  { label: "Спорт", tag: "спортивные каналы", heading: "Спортивные каналы" },
  { label: "Документальные", tag: "документальные и познавательные каналы", heading: "Документальные каналы" },
  { label: "Кино и сериалы", tag: "каналы с фильмами и сериалами", heading: "Каналы с фильмами и сериалами" },
  { label: "Музыкальные", tag: "музыкальные каналы", heading: "Музыкальные каналы" },
];
// Короткий список главной (As is) — 5 табов, как было изначально.
export const HOME_TABS = [
  { label: "ТВ-каналы", tag: "федеральные каналы", heading: "Федеральные каналы" },
  { label: "Развлекательное", tag: "развлекательные каналы", heading: "Развлекательные каналы" },
  { label: "Дети", tag: "детские каналы", heading: "Детские каналы" },
  { label: "Спорт", tag: "спортивные каналы", heading: "Спортивные каналы" },
  { label: "Документальное", tag: "документальные и познавательные каналы", heading: "Документальные каналы" },
];
export const PLAYER_TABS = TABS;

export function filterByTag(channels, tag) {
  if (!tag) return channels;
  return channels.filter((c) => (c.tags || []).includes(tag));
}

// ---------- Демо-продолжение расписания ----------
// Публичный API отдаёт только текущую передачу. Остальные строки — демо
// (правдоподобное продолжение от реального времени окончания).
const DEMO_POOL = [
  "Новости", "Пусть говорят", "Время покажет", "Большая игра", "Вечерние новости",
  "Модный приговор", "Жить здорово", "Поле чудес", "Давай поженимся",
  "Мужское / Женское", "Док-ток", "На самом деле", "Подкаст.Лаб",
];
export function demoSchedule(startIso, restrict = 16, count = 4) {
  const rows = [];
  let t = startIso ? new Date(startIso) : new Date();
  for (let i = 0; i < count; i++) {
    t = new Date(t.getTime() + (30 + ((i * 37) % 55)) * 60000);
    const name = DEMO_POOL[(i * 5 + 3) % DEMO_POOL.length];
    rows.push({ time: mskTime(t.toISOString()), title: `${name}, ${restrict}+`, demo: true });
  }
  return rows;
}
