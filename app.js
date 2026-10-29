// PartyPress – birthday party printables. Offline: everything stays in this browser profile.
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Pro: two Microsoft Store add-ons (1-year pass and forever) ----------
const STORE_BILLING = 'https://store.microsoft.com/billing';
const SKU_YEAR = 'partypress_year', SKU_FOREVER = 'partypress_pro';
const PRO_IDS = [SKU_YEAR, SKU_FOREVER];
let STORE_URL = 'https://apps.microsoft.com/detail/9P5F2W1Z11CX';
let proAvailable = false; // limits apply only when the Store actually sells the add-ons
let isPro = false;
try { isPro = localStorage.getItem('partypress-pro') === '1'; } catch (_) {}
const unlocked = () => isPro || !proAvailable;
async function billing() {
  if (!('getDigitalGoodsService' in window)) return null;
  try { return await window.getDigitalGoodsService(STORE_BILLING); } catch (_) { return null; }
}
function setPro(v) {
  isPro = v;
  try { localStorage.setItem('partypress-pro', v ? '1' : '0'); } catch (_) {}
  const b = $('proBtn');
  b.textContent = v ? '★ Pro' : '★ Get Pro';
  b.classList.toggle('is-pro', v);
  b.hidden = !proAvailable && !v;
  renderUI();
}
async function checkPro() {
  const svc = await billing();
  if (!svc) return false;
  try {
    const details = await svc.getDetails(PRO_IDS).catch(() => []);
    proAvailable = details.length > 0;
    const list = await svc.listPurchases(); // an expired 1-year pass is no longer listed
    const owned = list.some((p) => PRO_IDS.includes(p.itemId));
    setPro(owned);
    return owned;
  } catch (_) { return isPro; }
}
function proMessage(text) { const m = $('proMsg'); m.hidden = !text; m.textContent = text || ''; }
async function openPro(reason) {
  proMessage(reason || '');
  const svc = await billing();
  $('restoreBtn').hidden = !svc;
  if (!svc) { $('buyYear').textContent = 'Get it on Microsoft Store'; $('buyForever').textContent = 'Get it on Microsoft Store'; }
  else {
    try {
      const ds = await svc.getDetails(PRO_IDS);
      const fmt = (d) => (d && d.price ? new Intl.NumberFormat(undefined, { style: 'currency', currency: d.price.currency }).format(Number(d.price.value)) : '');
      const y = ds.find((d) => d.itemId === SKU_YEAR), f = ds.find((d) => d.itemId === SKU_FOREVER);
      $('buyYear').textContent = y && fmt(y) ? `1 year – ${fmt(y)}` : 'Get 1 year';
      $('buyForever').textContent = f && fmt(f) ? `Forever – ${fmt(f)}` : 'Get forever';
    } catch (_) {}
  }
  if (!$('proDialog').open) $('proDialog').showModal();
}
async function buy(sku) {
  const svc = await billing();
  if (!svc) { window.open(STORE_URL, '_blank'); return; }
  const methods = [{ supportedMethods: STORE_BILLING, data: { sku } }];
  try {
    let req;
    try { req = new PaymentRequest(methods); }
    catch (_) { req = new PaymentRequest(methods, { total: { label: 'Total', amount: { currency: 'USD', value: '0' } } }); }
    const res = await req.show();
    await res.complete('success');
  } catch (e) {
    if (e && e.name === 'AbortError') return;
    proMessage('Purchase could not be completed: ' + (e.message || e));
    return;
  }
  if (await checkPro()) { proMessage('Thank you! Pro is unlocked. ★ Have a wonderful party!'); setTimeout(() => $('proDialog').close(), 1800); }
}
const needsPro = (why) => { if (unlocked()) return false; openPro(why); return true; };

// ---------- settings ----------
const KINDS = {
  invite: { n: 'Invitations', d: '5 × 7 in, 2 per sheet' },
  banner: { n: 'Birthday banner', d: 'One letter on each flag' },
  toppers: { n: 'Cupcake toppers', d: '2 in circles, 20 per sheet' },
  tags: { n: 'Favor tags', d: '9 per sheet' },
  welcome: { n: 'Welcome sign', d: 'Full page', pro: true },
  food: { n: 'Food labels', d: 'Folded tent cards', pro: true },
  thanks: { n: 'Thank-you cards', d: '4 per sheet', pro: true },
  bottle: { n: 'Bottle labels', d: '7.5 × 2 in wraps', pro: true },
};
const DEFAULT_WORDS = {
  invite: "You're invited!\n{name} is turning {age}\n{date}\n{time}\n{place}\nRSVP {rsvp}",
  tags: 'Thank you\nfor coming!\n{name}',
  welcome: "Welcome to\n{name}'s\n{ageth} Birthday",
  thanks: 'Thank you!\nfor coming to my party\nand for my lovely gift\nLove, {name}',
};
const blank = () => ({ name: '', age: '', date: '', time: '', place: '', rsvp: '', theme: 'confetti', kind: 'invite', paper: 'letter', words: {}, banner: 'Happy Birthday {name}', foods: 'Pizza\nBirthday Cake\nFruit\nChips\nCookies\nLemonade\nWater\nGoodie Bags', photo: '' });
let S = blank();
function load() { try { const t = localStorage.getItem('partypress'); if (t) S = Object.assign(blank(), JSON.parse(t)); } catch (_) {} }
let saveTimer = 0;
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem('partypress', JSON.stringify(S)); } catch (_) { toast('Could not save – the photo may be too large'); } }, 300); }
const ordinal = (n) => { n = Number(n); if (!n && n !== 0) return ''; const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const nm = () => S.name.trim() || 'Mia';
const ag = () => (String(S.age).trim() === '' ? '5' : String(S.age).trim());
const fill = (t) => String(t || '').replace(/\{name\}/g, nm()).replace(/\{ageth\}/g, ordinal(ag())).replace(/\{age\}/g, ag()).replace(/\{date\}/g, S.date || 'Saturday, May 8').replace(/\{time\}/g, S.time || '2 – 5 pm').replace(/\{place\}/g, S.place || '12 Oak Street').replace(/\{rsvp\}/g, S.rsvp || 'to Mom by May 1');
const words = (k) => fill(S.words[k] != null ? S.words[k] : DEFAULT_WORDS[k]).split('\n').map((s) => s.trim()).filter(Boolean);

// ---------- art ----------
const FUN = "'Segoe Print', 'Comic Sans MS', 'Chalkboard SE', cursive";
const BOLD = "'Segoe UI Black', 'Arial Black', 'Segoe UI', sans-serif";
const SANS = "'Segoe UI', Arial, sans-serif";
const f1 = (n) => (Math.round(n * 10) / 10).toString();
const THEMES = {
  confetti: { name: 'Confetti', hd: '#f0386f', bg: '#fffdf8', ink: '#3b2f4a', c: ['#ff5d8f', '#ffc145', '#3ec1d3', '#7b61ff', '#6ddf8f'] },
  balloons: { name: 'Balloons', hd: '#e8508a', bg: '#fff8fb', ink: '#38304a', c: ['#ff7aa2', '#5aa9ff', '#ffd166', '#5ed3a8', '#b38cff'] },
  dino: { name: 'Dinosaurs', hd: '#3f8a2a', bg: '#f6fbef', ink: '#2e4025', c: ['#6cbf4a', '#f59e42', '#3aa0a8', '#9fd36f', '#e9604a'], pro: true },
  space: { name: 'Outer space', hd: '#ffcf4a', bg: '#141b3c', ink: '#ffffff', c: ['#ffcf4a', '#ff6b6b', '#6fd3ff', '#b48cff', '#ffffff'], pro: true },
  sea: { name: 'Under the sea', hd: '#1f8fb5', bg: '#effaff', ink: '#18465e', c: ['#2bb3d9', '#ff8a5b', '#ffd166', '#7fd8c7', '#9b7bff'], pro: true },
  daisy: { name: 'Daisies', hd: '#d9731c', bg: '#fffbea', ink: '#4a3b1f', c: ['#ffc93c', '#8bc34a', '#f7a8c4', '#ffffff', '#e9dcb8'], pro: true },
  rainbow: { name: 'Rainbow', hd: '#e85d84', bg: '#fff9f4', ink: '#5a3f52', c: ['#ff8fa3', '#ffb86b', '#ffe17a', '#9ee0a1', '#8ecbff', '#c3a6ff'], pro: true },
  disco: { name: 'Groovy disco', hd: '#ff4fb1', bg: '#2a1340', ink: '#fff4d6', c: ['#ff4fb1', '#ffb02e', '#c9c9dc', '#7a5cff', '#2fd6c3'], pro: true },
};
const th = () => THEMES[S.theme] || THEMES.confetti;
function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const star = (x, y, r, c, rot) => { let p = []; for (let i = 0; i < 10; i++) { const a = (i * 36 - 90 + (rot || 0)) * Math.PI / 180, rr = i % 2 ? r * 0.45 : r; p.push(f1(x + Math.cos(a) * rr) + ',' + f1(y + Math.sin(a) * rr)); } return `<polygon points="${p.join(' ')}" fill="${c}"/>`; };
const sparkle = (x, y, r, c) => `<path d="M${f1(x)},${f1(y - r)} Q${f1(x + r * 0.15)},${f1(y - r * 0.15)} ${f1(x + r)},${f1(y)} Q${f1(x + r * 0.15)},${f1(y + r * 0.15)} ${f1(x)},${f1(y + r)} Q${f1(x - r * 0.15)},${f1(y + r * 0.15)} ${f1(x - r)},${f1(y)} Q${f1(x - r * 0.15)},${f1(y - r * 0.15)} ${f1(x)},${f1(y - r)}Z" fill="${c}"/>`;
function balloon(x, y, s, c) {
  return `<path d="M${f1(x)},${f1(y + s * 1.05)} q${f1(-s * 0.25)},${f1(s * 0.5)} 0,${f1(s)} t0,${f1(s * 0.7)}" stroke="#9a8fa8" stroke-width="${f1(s * 0.04)}" fill="none"/>` +
    `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(s * 0.78)}" ry="${f1(s)}" fill="${c}"/><path d="M${f1(x - s * 0.12)},${f1(y + s * 1.08)} L${f1(x)},${f1(y + s * 0.96)} L${f1(x + s * 0.12)},${f1(y + s * 1.08)}Z" fill="${c}"/>` +
    `<ellipse cx="${f1(x - s * 0.3)}" cy="${f1(y - s * 0.4)}" rx="${f1(s * 0.14)}" ry="${f1(s * 0.26)}" fill="#fff" opacity=".45" transform="rotate(25 ${f1(x - s * 0.3)} ${f1(y - s * 0.4)})"/>`;
}
function dino(x, y, s, c, c2, flip) { // cute long-neck dino in a 100 × 70 box, centred on x,y
  const k = s / 50;
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${flip ? -k : k},${f1(k)}) translate(-50,-40)">` +
    `<path d="M22,42 Q5,46 0,62 Q14,56 28,54Z" fill="${c}"/>` +
    [30, 40, 50, 60].map((px, i) => `<path d="M${px - 6},${30 - (i === 1 || i === 2 ? 2 : 0)} L${px},${18 - (i === 1 || i === 2 ? 3 : 0)} L${px + 6},${30 - (i === 1 || i === 2 ? 2 : 0)}Z" fill="${c2}"/>`).join('') +
    `<ellipse cx="46" cy="44" rx="28" ry="16" fill="${c}"/>` +
    `<path d="M62,40 Q70,30 72,16 L84,14 Q82,32 72,48Z" fill="${c}"/><ellipse cx="82" cy="14" rx="13" ry="10" fill="${c}"/>` +
    `<rect x="30" y="52" width="9" height="16" rx="4" fill="${c}"/><rect x="54" y="52" width="9" height="16" rx="4" fill="${c}"/>` +
    `<circle cx="86" cy="11" r="2.4" fill="#2b2b2b"/><path d="M88,18 Q92,19 94,16" stroke="#2b2b2b" stroke-width="1.4" fill="none"/>` +
    `<circle cx="40" cy="44" r="3" fill="${c2}" opacity=".7"/><circle cx="52" cy="48" r="2.4" fill="${c2}" opacity=".7"/></g>`;
}
function rocket(x, y, s, c, c2, rot) {
  return `<g transform="translate(${f1(x)},${f1(y)}) rotate(${rot || 30}) scale(${f1(s / 50)})">` +
    `<path d="M-8,30 L0,52 L8,30Z" fill="#ffcf4a"/><path d="M-5,30 L0,42 L5,30Z" fill="#ff6b6b"/>` +
    `<path d="M-14,14 L-24,34 L-10,30Z" fill="${c2}"/><path d="M14,14 L24,34 L10,30Z" fill="${c2}"/>` +
    `<path d="M0,-40 Q18,-20 14,30 L-14,30 Q-18,-20 0,-40Z" fill="#f2f4ff"/><path d="M0,-40 Q10,-30 12,-18 L-12,-18 Q-10,-30 0,-40Z" fill="${c2}"/>` +
    `<circle cx="0" cy="0" r="8" fill="${c}" stroke="#c9cfe8" stroke-width="3"/></g>`;
}
const planet = (x, y, r, c, c2) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${c}"/><ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(r * 1.7)}" ry="${f1(r * 0.42)}" fill="none" stroke="${c2}" stroke-width="${f1(r * 0.18)}" transform="rotate(-18 ${f1(x)} ${f1(y)})"/><circle cx="${f1(x - r * 0.3)}" cy="${f1(y - r * 0.25)}" r="${f1(r * 0.18)}" fill="#fff" opacity=".25"/>`;
function fish(x, y, s, c, c2, flip) {
  const d = flip ? -1 : 1;
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${d},1)"><path d="M${f1(-s * 0.7)},0 L${f1(-s * 1.15)},${f1(-s * 0.42)} L${f1(-s * 1.15)},${f1(s * 0.42)}Z" fill="${c2}"/>` +
    `<ellipse cx="0" cy="0" rx="${f1(s * 0.8)}" ry="${f1(s * 0.5)}" fill="${c}"/><path d="M${f1(-s * 0.15)},${f1(-s * 0.47)} Q0,0 ${f1(-s * 0.15)},${f1(s * 0.47)}" stroke="${c2}" stroke-width="${f1(s * 0.12)}" fill="none"/>` +
    `<circle cx="${f1(s * 0.45)}" cy="${f1(-s * 0.1)}" r="${f1(s * 0.11)}" fill="#fff"/><circle cx="${f1(s * 0.48)}" cy="${f1(-s * 0.1)}" r="${f1(s * 0.06)}" fill="#18465e"/></g>`;
}
const bubble = (x, y, r, c) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="none" stroke="${c}" stroke-width="${f1(r * 0.18)}"/><circle cx="${f1(x - r * 0.35)}" cy="${f1(y - r * 0.35)}" r="${f1(r * 0.18)}" fill="${c}"/>`;
const weed = (x, y, s, c) => `<path d="M${f1(x)},${f1(y)} q${f1(-s * 0.2)},${f1(-s * 0.25)} 0,${f1(-s * 0.5)} t0,${f1(-s * 0.5)} t0,${f1(-s * 0.5)}" stroke="${c}" stroke-width="${f1(s * 0.12)}" fill="none" stroke-linecap="round"/>`;
function daisy(x, y, r, petal, edge, center) {
  let s = '';
  for (let i = 0; i < 12; i++) { const a = i * 30; s += `<ellipse cx="${f1(x)}" cy="${f1(y - r * 0.55)}" rx="${f1(r * 0.2)}" ry="${f1(r * 0.48)}" fill="${petal}" stroke="${edge}" stroke-width="${f1(r * 0.04)}" transform="rotate(${a} ${f1(x)} ${f1(y)})"/>`; }
  return s + `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 0.3)}" fill="${center}"/>`;
}
function rainbowArc(x, y, r, cs) { return cs.map((c, i) => `<path d="M${f1(x - r + i * r * 0.13)},${f1(y)} A${f1(r - i * r * 0.13)},${f1(r - i * r * 0.13)} 0 0 1 ${f1(x + r - i * r * 0.13)},${f1(y)}" fill="none" stroke="${c}" stroke-width="${f1(r * 0.13)}"/>`).join('') + cloud(x - r * 0.85, y, r * 0.38) + cloud(x + r * 0.85, y, r * 0.38); }
const cloud = (x, y, r) => `<g fill="#ffffff" stroke="#efe6ee" stroke-width="${f1(r * 0.05)}"><circle cx="${f1(x - r * 0.6)}" cy="${f1(y)}" r="${f1(r * 0.55)}"/><circle cx="${f1(x + r * 0.6)}" cy="${f1(y)}" r="${f1(r * 0.55)}"/><circle cx="${f1(x)}" cy="${f1(y - r * 0.3)}" r="${f1(r * 0.75)}"/></g>`;
function discoBall(x, y, r) {
  let s = `<line x1="${f1(x)}" y1="${f1(y - r * 2.2)}" x2="${f1(x)}" y2="${f1(y - r)}" stroke="#c9c9dc" stroke-width="${f1(r * 0.05)}"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="#9a9ab4"/>`;
  const n = 7, g = (2 * r) / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const cx = x - r + (i + 0.5) * g, cy = y - r + (j + 0.5) * g; if (Math.hypot(cx - x, cy - y) < r - g * 0.45) s += `<rect x="${f1(cx - g * 0.42)}" y="${f1(cy - g * 0.42)}" width="${f1(g * 0.84)}" height="${f1(g * 0.84)}" fill="${(i + j) % 3 ? '#d9d9ea' : '#ffffff'}" opacity="${(i * 7 + j * 3) % 5 ? 0.85 : 1}"/>`; }
  return s + sparkle(x + r * 0.9, y - r * 0.8, r * 0.35, '#fff');
}
const flower70 = (x, y, r, c, c2) => { let s = ''; for (let i = 0; i < 6; i++) { const a = i * 60 * Math.PI / 180; s += `<circle cx="${f1(x + Math.cos(a) * r * 0.55)}" cy="${f1(y + Math.sin(a) * r * 0.55)}" r="${f1(r * 0.45)}" fill="${c}"/>`; } return s + `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 0.35)}" fill="${c2}"/>`; };
function confettiBit(x, y, s, c, r) {
  const k = INT(r() * 4), a = INT(r() * 180);
  if (k === 0) return `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(s * 0.32)}" fill="${c}"/>`;
  if (k === 1) return `<rect x="${f1(x - s * 0.45)}" y="${f1(y - s * 0.16)}" width="${f1(s * 0.9)}" height="${f1(s * 0.32)}" rx="${f1(s * 0.08)}" fill="${c}" transform="rotate(${a} ${f1(x)} ${f1(y)})"/>`;
  if (k === 2) return star(x, y, s * 0.5, c, a);
  return `<path d="M${f1(x - s * 0.5)},${f1(y)} q${f1(s * 0.25)},${f1(-s * 0.4)} ${f1(s * 0.5)},0 t${f1(s * 0.5)},0" stroke="${c}" stroke-width="${f1(s * 0.16)}" fill="none" stroke-linecap="round" transform="rotate(${a} ${f1(x)} ${f1(y)})"/>`;
}
const INT = Math.floor;
// one motif for the current theme
function motif(i, x, y, s, r) {
  const T = th(), c = T.c, pick = (k) => c[(i + k) % c.length];
  switch (S.theme) {
    case 'balloons': return balloon(x, y, s * 0.45, pick(0));
    case 'dino': return dino(x, y, s * 0.5, pick(0) === c[1] ? c[0] : [c[0], c[2], c[3]][i % 3], c[1], i % 2);
    case 'space': return i % 3 === 0 ? rocket(x, y, s * 0.5, c[2], c[1], 20 + (i % 2) * 20) : i % 3 === 1 ? planet(x, y, s * 0.24, pick(1), c[0]) : star(x, y, s * 0.2, c[0], i * 10) + star(x + s * 0.3, y + s * 0.25, s * 0.09, '#fff');
    case 'sea': return i % 3 === 2 ? bubble(x, y, s * 0.14, c[0]) + bubble(x + s * 0.2, y - s * 0.25, s * 0.09, c[0]) + weed(x - s * 0.2, y + s * 0.45, s * 0.5, c[3]) : fish(x, y, s * 0.32, pick(1) === c[0] ? c[1] : pick(1), c[2], i % 2);
    case 'daisy': return daisy(x, y, s * 0.36, '#ffffff', '#e2cf9c', c[0]) + (i % 2 ? daisy(x + s * 0.32, y + s * 0.2, s * 0.18, c[2], c[2], c[0]) : '');
    case 'rainbow': return i % 2 ? rainbowArc(x, y + s * 0.15, s * 0.42, c) : cloud(x, y, s * 0.25) + star(x + s * 0.3, y - s * 0.25, s * 0.08, c[2]);
    case 'disco': return i % 2 ? discoBall(x, y, s * 0.24) : flower70(x, y, s * 0.28, pick(0) === c[2] ? c[0] : pick(0), c[1]);
    default: { let b = ''; for (let k = 0; k < 5; k++) b += confettiBit(x + (r() - 0.5) * s * 0.9, y + (r() - 0.5) * s * 0.9, s * 0.2, c[INT(r() * c.length)], r); return b; }
  }
}
// decorations around the edges of a box, kept out of the middle where the words go
function decorate(x, y, w, h, opt) {
  opt = opt || {};
  const u = Math.min(w, h), s = u * (opt.size || 0.24), r = rng((opt.seed || 7) * 9973 + INT(w) * 31 + INT(h)), pts = [];
  const inset = s * 0.5;
  pts.push([x + inset, y + inset], [x + w - inset, y + inset], [x + inset, y + h - inset], [x + w - inset, y + h - inset]);
  if (!opt.cornersOnly) {
    const nx = Math.max(0, INT(w / (s * 1.6)) - 1), ny = Math.max(0, INT(h / (s * 1.6)) - 1);
    for (let i = 1; i <= nx; i++) { if (opt.top !== false) pts.push([x + (w * i) / (nx + 1), y + inset * 0.9]); pts.push([x + (w * i) / (nx + 1), y + h - inset * 0.9]); }
    if (!opt.noSides) for (let j = 1; j <= ny; j++) { pts.push([x + inset * 0.8, y + (h * j) / (ny + 1)]); pts.push([x + w - inset * 0.8, y + (h * j) / (ny + 1)]); }
  }
  let b = '';
  pts.forEach(([px, py], i) => { b += motif(i + (opt.seed || 0), px + (r() - 0.5) * s * 0.25, py + (r() - 0.5) * s * 0.25, s * (0.85 + r() * 0.3), r); });
  if (S.theme === 'confetti' || S.theme === 'space' || S.theme === 'disco') for (let k = 0; k < (opt.cornersOnly ? 4 : 14); k++) { const px = x + r() * w, py = y + r() * h; const inMid = px > x + w * 0.18 && px < x + w * 0.82 && py > y + h * 0.18 && py < y + h * 0.82; if (!inMid) b += S.theme === 'confetti' ? confettiBit(px, py, s * 0.18, th().c[k % th().c.length], r) : star(px, py, s * 0.06, S.theme === 'space' ? '#ffffff' : th().c[1], k * 20); }
  return b;
}
const fitFs = (t, maxW, base, ratio) => Math.min(base, maxW / Math.max(1, String(t).length * (ratio || 0.55)));
const T = (x, y, s, size, o) => { o = o || {}; return `<text x="${f1(x)}" y="${f1(y)}" font-size="${f1(size)}" font-family="${o.font || SANS}" fill="${o.fill || th().ink}" text-anchor="${o.anchor || 'middle'}"${o.weight ? ` font-weight="${o.weight}"` : ''}${o.ls ? ` letter-spacing="${o.ls}"` : ''}${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw}" paint-order="stroke"` : ''}>${esc(s)}</text>`; };
const clipBox = (key, x, y, w, h, path) => `<clipPath id="c${key}">${path || `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}"/>`}</clipPath>`;
const cutBox = (x, y, w, h) => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="none" stroke="#b9b9b9" stroke-width=".6" stroke-dasharray="4 3"/>`;
function ageBadge(cx, cy, r) {
  const c = th().c;
  return `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" fill="${c[0]}"/><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r * 0.86)}" fill="none" stroke="#fff" stroke-width="${f1(r * 0.04)}" stroke-dasharray="${f1(r * 0.12)} ${f1(r * 0.1)}"/>` + T(cx, cy + r * 0.36, ag(), fitFs(ag(), r * 1.5, r * 1.05, 0.62), { font: BOLD, weight: 900, fill: '#fff' });
}
function lines(ls, cx, top, w, h, o) { // first line fun & big, the rest plain; centred in the area
  o = o || {};
  const base = o.base || h * 0.08, L = ls.map((t, i) => { const big = i === 0 && o.firstFun !== false; return { t, big, fs: big ? fitFs(t, w * 0.92, base * 1.7, 0.5) : fitFs(t, w * 0.92, base * (o.bigSecond && i === 1 ? 1.25 : 1), 0.5) }; });
  const total = L.reduce((a, l) => a + l.fs * (l.big ? 1.3 : 1.35), 0);
  let y = top + Math.max(0, (h - total) / 2);
  return L.map((l, i) => { y += l.fs * (l.big ? 1.15 : 1.25); const s = T(cx, y, l.t, l.fs, { font: l.big ? FUN : i === 1 && o.bigSecond ? BOLD : SANS, weight: i === 1 && o.bigSecond ? 900 : l.big ? 400 : 600, fill: l.big ? th().hd : th().ink }); y += l.fs * (l.big ? 0.15 : 0.1); return s; }).join('');
}

// ---------- items ----------
const PAPER = { letter: [612, 792], a4: [595.3, 841.9] };
const svgPage = (W, H, body) => ({ w: W, h: H, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f1(W)} ${f1(H)}" width="${f1(W)}" height="${f1(H)}">${body}</svg>` });
function sheet(iw, ih, cols, rows, items, draw, land) {
  const [pw, ph] = PAPER[S.paper] || PAPER.letter, W = land ? ph : pw, H = land ? pw : ph, per = cols * rows, out = [];
  const x0 = (W - cols * iw) / 2, y0 = (H - rows * ih) / 2;
  for (let p = 0; p < Math.max(1, Math.ceil(items.length / per)); p++) {
    let b = `<rect width="${f1(W)}" height="${f1(H)}" fill="#fff"/>`;
    for (let k = 0; k < per; k++) { const it = items[p * per + k]; if (it === undefined) continue; const x = x0 + (k % cols) * iw, y = y0 + INT(k / cols) * ih; b += draw(it, x, y, iw, ih, `${p}_${k}`) + (it && it.noCut ? '' : cutBox(x, y, iw, ih)); }
    out.push(svgPage(W, H, b));
  }
  return out;
}
function photoCircle(cx, cy, r, key) {
  const c = th().c;
  return `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r * 1.07)}" fill="${c[1]}"/><clipPath id="p${key}"><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}"/></clipPath><image href="${S.photo}" x="${f1(cx - r)}" y="${f1(cy - r)}" width="${f1(2 * r)}" height="${f1(2 * r)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#p${key})"/>`;
}
function pages() {
  const t = th();
  const bgBox = (x, y, w, h, key, extra) => clipBox(key, x, y, w, h) + `<g clip-path="url(#c${key})"><rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="${t.bg}"/>${extra || ''}</g>`;
  switch (S.kind) {
    case 'invite': return sheet(360, 504, 2, 1, [1, 2], (_, x, y, w, h, key) => {
      const ls = words('invite');
      let b = bgBox(x, y, w, h, key, decorate(x, y, w, h, { seed: 3, size: 0.24, noSides: true, top: false }));
      const head = ls[0] || '', rest = ls.slice(1);
      b += T(x + w / 2, y + h * 0.2, head, fitFs(head, w * 0.62, h * 0.075, 0.5), { font: FUN, fill: t.hd });
      if (S.photo) { b += photoCircle(x + w / 2, y + h * 0.36, w * 0.17, key) + ageBadge(x + w / 2 + w * 0.17, y + h * 0.27, w * 0.075); }
      else b += ageBadge(x + w / 2, y + h * 0.35, w * 0.15);
      b += lines(rest, x + w / 2, y + h * 0.5, w * 0.74, h * 0.36, { firstFun: false, bigSecond: false, base: h * 0.042 });
      return b;
    }, true);
    case 'banner': {
      const txt = fill(S.banner || 'Happy Birthday').toUpperCase(), chars = [...txt].map((ch) => (ch === ' ' ? null : ch));
      const flags = []; chars.forEach((ch, i) => { if (ch === null) { if (flags.length && flags[flags.length - 1] !== '★') flags.push('★'); } else flags.push(ch); });
      window.__flags = flags.length;
      return sheet(360, 504, 2, 1, flags.map((ch, i) => ({ ch, i, noCut: true })), (f, x, y, w, h, key) => {
        const path = `<path d="M${f1(x + 6)},${f1(y + 6)} H${f1(x + w - 6)} V${f1(y + h * 0.8)} L${f1(x + w / 2)},${f1(y + h - 6)} L${f1(x + 6)},${f1(y + h * 0.8)}Z"/>`;
        const col = t.c[f.i % Math.min(4, t.c.length)];
        let b = clipBox(key, 0, 0, 0, 0, path) + `<g clip-path="url(#c${key})"><rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="${t.bg}"/><rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h * 0.1)}" fill="${col}"/>${decorate(x, y + h * 0.1, w, h * 0.78, { seed: f.i + 1, size: 0.22, cornersOnly: true })}</g>`;
        b += path.replace('/>', ` fill="none" stroke="#b9b9b9" stroke-width=".8" stroke-dasharray="5 3"/>`);
        b += `<circle cx="${f1(x + 30)}" cy="${f1(y + 26)}" r="5" fill="#fff" stroke="#999"/><circle cx="${f1(x + w - 30)}" cy="${f1(y + 26)}" r="5" fill="#fff" stroke="#999"/>`;
        if (f.ch === '★') b += star(x + w / 2, y + h * 0.48, w * 0.25, col);
        else b += T(x + w / 2, y + h * 0.62, f.ch, h * 0.42, { font: BOLD, weight: 900, fill: col, stroke: '#ffffff', sw: h * 0.012 });
        return b;
      }, true);
    }
    case 'toppers': {
      const items = Array.from({ length: 20 }, (_, i) => ({ k: i % 4, noCut: true }));
      return sheet(144, 144, 4, 5, items, (o, x, y, w, h, key) => {
        const k = o.k, cx = x + w / 2, cy = y + h / 2, r = w * 0.47, col = t.c[k % t.c.length];
        let b = clipBox(key, 0, 0, 0, 0, `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}"/>`) + `<g clip-path="url(#c${key})"><rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="${t.bg}"/>${k === 3 ? '' : decorate(x, y, w, h, { seed: k + 2, size: 0.3, cornersOnly: true })}</g>`;
        b += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" fill="none" stroke="${col}" stroke-width="5"/><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r + 3)}" fill="none" stroke="#bbb" stroke-width=".5" stroke-dasharray="3 2"/>`;
        if (k === 0) b += T(cx, cy + r * 0.38, ag(), fitFs(ag(), r * 1.4, r * 1.1, 0.62), { font: BOLD, weight: 900, fill: col === '#ffffff' ? t.c[0] : col, stroke: t.bg, sw: 3 });
        else if (k === 1) b += T(cx, cy + r * 0.15, nm(), fitFs(nm(), r * 1.5, r * 0.6, 0.5), { font: FUN, fill: t.ink, stroke: t.bg, sw: 3 });
        else if (k === 2) b += T(cx, cy - r * 0.05, 'Happy', r * 0.34, { font: FUN, fill: t.ink, stroke: t.bg, sw: 3 }) + T(cx, cy + r * 0.32, 'Birthday', r * 0.34, { font: FUN, fill: t.ink, stroke: t.bg, sw: 3 });
        else b += motif(k, cx, cy, r * 1.5, rng(k + 5));
        return b;
      });
    }
    case 'tags': return sheet(162, 252, 3, 3, Array.from({ length: 9 }, (_, i) => i), (i, x, y, w, h, key) => {
      const ls = words('tags');
      let b = bgBox(x, y, w, h, key, decorate(x, y, w, h, { seed: i + 9, size: 0.34, cornersOnly: true }));
      b += `<circle cx="${f1(x + w / 2)}" cy="${f1(y + 18)}" r="6" fill="#fff" stroke="#999"/>`;
      b += lines(ls, x + w / 2, y + h * 0.24, w * 0.8, h * 0.52, { base: h * 0.075 });
      return b;
    });
    case 'welcome': {
      const [W, H] = PAPER[S.paper] || PAPER.letter, m = 22, w = W - 2 * m, h = H - 2 * m;
      const ls = words('welcome');
      let b = `<rect width="${f1(W)}" height="${f1(H)}" fill="#fff"/>` + bgBox(m, m, w, h, 'w', decorate(m, m, w, h, { seed: 21, size: 0.24 }));
      b += ageBadge(W / 2, H * 0.3, w * 0.13);
      b += lines(ls, W / 2, H * 0.4, w * 0.7, H * 0.4, { base: H * 0.05, bigSecond: true });
      return [svgPage(W, H, b)];
    }
    case 'food': {
      const foods = String(S.foods || '').split('\n').map((s) => s.trim()).filter(Boolean);
      return sheet(252, 288, 2, 2, foods.length ? foods : ['Pizza'], (f, x, y, w, h, key) => {
        const half = h / 2;
        let b = bgBox(x, y + half, w, half, key, decorate(x, y + half, w, half, { seed: f.length, size: 0.36, cornersOnly: true }));
        b += `<line x1="${f1(x)}" y1="${f1(y + half)}" x2="${f1(x + w)}" y2="${f1(y + half)}" stroke="#c8c8c8" stroke-width=".5" stroke-dasharray="2 3"/>`;
        b += T(x + w / 2, y + half - 6, 'fold here – this half is the back', 6, { fill: '#aaa' });
        b += T(x + w / 2, y + half + half * 0.6, f, fitFs(f, w * 0.68, half * 0.3, 0.5), { font: FUN, fill: t.hd });
        return b;
      });
    }
    case 'thanks': return sheet(288, 378, 2, 2, [1, 2, 3, 4], (i, x, y, w, h, key) => {
      let b = bgBox(x, y, w, h, key, decorate(x, y, w, h, { seed: i + 30, size: 0.24, noSides: true, top: false }));
      b += lines(words('thanks'), x + w / 2, y + h * 0.18, w * 0.7, h * 0.64, { base: h * 0.06 });
      return b;
    });
    case 'bottle': return sheet(540, 144, 1, 5, [1, 2, 3, 4, 5], (i, x, y, w, h, key) => {
      const txt = `${nm()}'s ${ordinal(ag())} Birthday`;
      let b = bgBox(x, y, w, h, key, decorate(x, y, w * 0.2, h, { seed: i + 40, size: 0.55, cornersOnly: true }) + decorate(x + w * 0.8, y, w * 0.2, h, { seed: i + 41, size: 0.55, cornersOnly: true }));
      b += T(x + w / 2, y + h * 0.58, txt, fitFs(txt, w * 0.56, h * 0.3, 0.5), { font: FUN, fill: t.hd });
      return b;
    });
  }
  return [];
}

// ---------- UI ----------
let toastTimer = 0;
function toast(msg) { const el = $('toast'); el.textContent = msg; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 4500); }
let page = 0, ps = [];
function renderUI() {
  $('name').value = S.name; $('age').value = S.age; $('date').value = S.date; $('time').value = S.time; $('place').value = S.place; $('rsvp').value = S.rsvp; $('paper').value = S.paper;
  $('themes').innerHTML = Object.entries(THEMES).map(([k, t]) => `<button data-t="${k}" class="${S.theme === k ? 'on' : ''}"><span class="sw">${[t.bg, ...t.c.slice(0, 3)].map((c) => `<i style="background:${c}"></i>`).join('')}</span>${esc(t.name)}${t.pro && !unlocked() ? '<span class="badge">PRO</span>' : ''}</button>`).join('');
  $('kinds').innerHTML = Object.entries(KINDS).map(([k, v]) => `<button data-k="${k}" class="${S.kind === k ? 'on' : ''}" title="${esc(v.d)}">${esc(v.n)}${v.pro && !unlocked() ? ' ★' : ''}</button>`).join('');
  render();
}
function render() {
  const k = S.kind;
  $('optWords').hidden = !DEFAULT_WORDS[k];
  $('optPhoto').hidden = k !== 'invite';
  $('photoDel').hidden = !S.photo;
  $('optBanner').hidden = k !== 'banner';
  $('optFood').hidden = k !== 'food';
  if (DEFAULT_WORDS[k] && document.activeElement !== $('words')) $('words').value = S.words[k] != null ? S.words[k] : DEFAULT_WORDS[k];
  if (document.activeElement !== $('bannerText')) $('bannerText').value = S.banner;
  if (document.activeElement !== $('foods')) $('foods').value = S.foods;
  $('themes').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.t === S.theme));
  $('kinds').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.k === k));
  ps = pages();
  page = Math.max(0, Math.min(page, ps.length - 1));
  $('preview').innerHTML = ps[page].svg.replace(/ width="[\d.]+" height="[\d.]+"/, ' preserveAspectRatio="xMidYMid meet"').replace(/id="([^"]+)"/g, 'id="v$1"').replace(/url\(#([^)]+)\)/g, 'url(#v$1)');
  $('pgInfo').textContent = `Page ${page + 1} of ${ps.length}`;
  $('pgPrev').disabled = page === 0; $('pgNext').disabled = page >= ps.length - 1;
  const info = {
    invite: 'Two 5 × 7 in invitations on each sheet. Card stock looks best.',
    banner: `${window.__flags || 0} flags – cut them out, punch the two holes and string them on ribbon.`,
    toppers: '20 toppers per sheet. Cut out, then tape a toothpick to the back.',
    tags: 'Nine tags per sheet. Punch the hole and tie them to favor bags.',
    welcome: 'A full-page sign. Print it, or save it as a picture for a bigger print at a photo shop.',
    food: 'Tent cards: cut along the dashed lines and fold in the middle.',
    thanks: 'Four thank-you cards (4 × 5.25 in) on each sheet.',
    bottle: 'Five 7.5 × 2 in labels per sheet – wrap one around each bottle.',
  }[k];
  $('info').textContent = info;
}
let renderTimer = 0;
const soon = () => { clearTimeout(renderTimer); renderTimer = setTimeout(render, 150); };
function proProblem() {
  if (unlocked()) return '';
  if (th().pro) return `The ${th().name} theme is part of PartyPress Pro. Confetti and Balloons are free.`;
  if (KINDS[S.kind].pro) return `${KINDS[S.kind].n} are part of PartyPress Pro. Invitations, banner, cupcake toppers and favor tags are free.`;
  return '';
}
function printNow() {
  const why = proProblem(); if (why) { openPro(why); return; }
  const p0 = ps[0], land = p0.w > p0.h, paper = S.paper === 'a4' ? 'A4' : 'letter';
  let out = ps.map((p) => p.svg.replace(/ width="([\d.]+)" height="([\d.]+)"/, (_, w, h) => ` style="width:${(w / 72).toFixed(3)}in;height:${(h / 72).toFixed(3)}in;display:block;page-break-after:always"`));
  out = out.map((pg, i) => pg.replace(/id="([^"]+)"/g, `id="$1_p${i}"`).replace(/url\(#([^)]+)\)/g, `url(#$1_p${i})`));
  $('pageRule').textContent = `@page { size: ${paper} ${land ? 'landscape' : 'portrait'}; margin: 0; }`;
  $('printArea').innerHTML = out.join('');
  window.print();
  setTimeout(() => { $('pageRule').textContent = ''; $('printArea').innerHTML = ''; }, 1500);
}
async function savePicture() {
  if (needsPro('Saving high-resolution pictures for a print shop is part of PartyPress Pro. Printing at home is free.')) return;
  const why = proProblem(); if (why) { openPro(why); return; }
  const p = ps[page], wi = p.w / 72, hi = p.h / 72, dpi = 300;
  toast('Making your picture…');
  const img = new Image(), url = URL.createObjectURL(new Blob([p.svg], { type: 'image/svg+xml' }));
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const c = document.createElement('canvas'); c.width = Math.round(wi * dpi); c.height = Math.round(hi * dpi);
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  const name = `${nm().replace(/[\\/:*?"<>|&]+/g, '')}-${S.kind}-page${page + 1}.jpg`.toLowerCase();
  c.toBlob((bl) => { const a = document.createElement('a'); a.href = URL.createObjectURL(bl); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 60000); toast(`Saved ${name} to your Downloads folder`); }, 'image/jpeg', 0.93);
}
function shrinkPhoto(file) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const k = Math.min(1, 1200 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.85)); };
    img.onerror = () => { URL.revokeObjectURL(url); toast('That file is not a picture'); rej(new Error('bad image')); };
    img.src = url;
  });
}

// ---------- wiring ----------
['name', 'age', 'date', 'time', 'place', 'rsvp'].forEach((id) => $(id).addEventListener('input', (e) => { S[id] = e.target.value; save(); soon(); }));
$('paper').onchange = (e) => { S.paper = e.target.value; save(); render(); };
$('themes').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; S.theme = b.dataset.t; save(); render(); if (th().pro && !unlocked()) toast('This theme is part of Pro – look around freely; printing it needs Pro.'); });
$('kinds').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; S.kind = b.dataset.k; page = 0; save(); render(); if (KINDS[S.kind].pro && !unlocked()) toast('This printable is part of Pro – you can preview it; printing it needs Pro.'); });
$('words').addEventListener('input', (e) => { S.words[S.kind] = e.target.value; save(); soon(); });
$('bannerText').addEventListener('input', (e) => { S.banner = e.target.value; save(); soon(); });
$('foods').addEventListener('input', (e) => { S.foods = e.target.value; save(); soon(); });
$('photoBtn').onclick = () => { const i = $('fileIn'); i.value = ''; i.onchange = async () => { if (i.files[0]) { S.photo = await shrinkPhoto(i.files[0]); save(); render(); } }; i.click(); };
$('photoDel').onclick = () => { S.photo = ''; save(); render(); };
$('pgPrev').onclick = () => { page -= 1; render(); };
$('pgNext').onclick = () => { page += 1; render(); };
$('printBtn').onclick = printNow; $('saveBtn').onclick = savePicture;
$('moreBtn').onclick = (e) => { e.stopPropagation(); $('menu').hidden = !$('menu').hidden; };
document.addEventListener('click', () => { $('menu').hidden = true; });
$('resetBtn').onclick = () => { if (!confirm('Clear the party details and start a new party?')) return; const keep = S.theme; S = blank(); S.theme = keep; save(); page = 0; renderUI(); };
$('proBtn').onclick = () => { if (!isPro) openPro(''); };
$('buyYear').onclick = () => buy(SKU_YEAR);
$('buyForever').onclick = () => buy(SKU_FOREVER);
$('restoreBtn').onclick = async () => { proMessage('Checking your purchases…'); proMessage((await checkPro()) ? 'Pro is unlocked. ★' : 'No active PartyPress purchase was found on this Microsoft account.'); };
$('closePro').onclick = () => $('proDialog').close();

load();
renderUI();
checkPro();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
