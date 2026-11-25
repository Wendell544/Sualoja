/* =============================================================
   config.js — constantes, utilitários globais, ícones e Supabase.
   Carrega primeiro: storage, images, auth, shop, admin e app usam isto.
   ============================================================= */
const V = 12, PFX = 'loja_', KEY = {
  prod: PFX + 'products',
  cart: PFX + 'cart',
  ads: PFX + 'ads',
  cats: PFX + 'cats',
  set: PFX + 'settings',
  meta: PFX + 'meta',
  pref: PFX + 'prefs',
  draft: PFX + 'draft',
  pw: PFX + 'k2',
  lock: PFX + 'lock',
  hist: PFX + 'hist',
  adm: PFX + 'adm',
  chg: PFX + 'chg',
  pub: PFX + 'pub',
  log: PFX + 'log',
  wish: PFX + 'wish'
};

const SB_URL = 'https://ncrsodkpduroulzkpaky.supabase.co';
const SB_KEY = 'sb_publishable_OOejb1xfSYPHVD8Xf4F09g_YT_Sa5lu'; // chave pública (publishable): feita para o front

const GH_OWNER = 'Wendell544';
const GH_REPO = 'Sualoja';

const WAD = '5583996006884';
const CATS0 = ['Novidades', 'Promoções', 'Destaques', 'Mais Vendidos', 'Exclusivos'];

/* Padrões da loja. Qualquer chave salva em settings.data (Supabase) tem prioridade. */
const SET0 = {
  name: 'Sua Loja', // logo tipográfico, rodapé, título da aba e mensagem do pedido
  logo: null, // opcional: { light: 'https://…', dark: 'https://…' } troca o logo tipográfico por imagem
  kick: 'Qualidade que você sente',
  title: 'O melhor para você está aqui',
  text: 'Selecionamos produtos de qualidade para o seu dia a dia. Escolha o que ama e finalize no WhatsApp.',
  about: '',
  wa: WAD,
  email: '',
  addr: 'Brasil',
  ig: 'sualoja',
  fb: '',
  sec: 6,
  page: 12,
  mb: 5,
  hero_bg: null,
  show: { feat: 1, news: 1, cats: 1, ads: 1, best: 1 }
};

const ACT = {};
const $ = (i) => document.getElementById(i);
const money = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => '&#' + c.charCodeAt(0) + ';');
const nz = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const okUrl = (u) => /^https?:\/\//i.test(u || '');
const R = (r) => !r ? null : typeof r === 'string' ? { u: r } : r;
const uid = () => (uid.n = Math.max(Date.now(), (uid.n || 0) + 1));
const clamp = (n, a, b) => Math.min(b, Math.max(a, +n || 0));
const debounce = (fn, ms = 300) => {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
};
/* Rolagem suave só para quem não pediu movimento reduzido. */
const smooth = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

/* Toast: a região aria-live (#ts) nunca sai do DOM; só a visibilidade muda.
   k = 'ok' | 'er'. Sem k, o tipo é deduzido do texto (mensagens do admin). */
const toast = (t, k) => {
  const e = $('ts');
  if (!e) return;
  k = k || (/inválid|falh|erro|expirad|negad|permiss|não foi|esgotad|limite|aguarde|informe|use |deve|já existe|mova|cole |sem espaço/i.test(t) ? 'er' : 'ok');
  e.innerHTML = ic(k === 'er' ? 'alert' : 'check', 18) + '<span>' + esc(t) + '</span>';
  e.classList.toggle('er', k === 'er');
  e.classList.add('on');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => {
    e.classList.remove('on');
    toast.t = setTimeout(() => (e.textContent = ''), 400);
  }, 3200);
};

/* Overlays: trava a rolagem, deixa o fundo inerte (foco fica no diálogo)
   e devolve o foco para quem abriu quando tudo fecha. */
const lock = () => {
  const on = ['lg', 'pm', 'adm'].some((i) => !$(i).classList.contains('hid')) || $('drw').classList.contains('on');
  document.documentElement.classList.toggle('al', on);
  if (on === !!lock.on) return;
  lock.on = on;
  document.querySelectorAll('body>header,body>main,body>footer,#tt,.skip').forEach((e) => (e.inert = on));
  if (on) lock.f = document.activeElement;
  else if (lock.f && lock.f.isConnected && lock.f.focus) lock.f.focus({ preventScroll: true });
};

const modal = (id, on) => {
  const e = $(id);
  e.classList.toggle('hid', !on);
  lock();
  if (on && id !== 'pm') {
    setTimeout(() => (id === 'lg' ? ($('em').value ? $('pw') : $('em')) : e).focus({ preventScroll: true }), 50);
  }
};

const drawer = (on) => {
  $('drw').classList.toggle('on', !!on);
  $('ov').classList.toggle('hid', !on);
  const b = document.querySelector('[data-a=cart]');
  if (b) b.setAttribute('aria-expanded', !!on);
  lock();
  if (on) setTimeout(() => $('drw').focus({ preventScroll: true }), 50);
};

/* Ícones (traço 1.7, 24×24). Adicione aqui e use com ic('nome', tamanho). */
const IC = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
  bag: '<path d="M5 8h14l-1.2 12.1a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9z"/><path d="M9 8V7a3 3 0 0 1 6 0v1"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  wa: '<path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.7-5.2A8.5 8.5 0 1 1 21 11.5z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 .8c-1-.4-1.8-1.2-2.2-2.2l.8-1-1-2z"/>',
  star: '<path d="m12 2 3 6.5 7 .8-5.2 4.8 1.4 7L12 17.5 5.8 21l1.4-7L2 9.3l7-.8z"/>',
  heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  prev: '<path d="m15 18-6-6 6-6"/>',
  next: '<path d="m9 18 6-6-6-6"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/>',
  share: '<path d="M12 15V3M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  retry: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  ig: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
  fb: '<path d="M14 8h2.5V4.5H14A3.5 3.5 0 0 0 10.5 8v2.5H8V14h2.5v6.5H14V14h2.5l.5-3.5h-3V8.5a.5.5 0 0 1 .5-.5z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>'
};

const ic = (n, s = 20) =>
  '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
  (IC[n] || '') +
  '</svg>';

/* Imagem neutra para produto sem foto (tom quente + moldura dourada). */
const art = (h) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><defs><radialGradient id="g" cx="50%" cy="38%" r="80%"><stop offset="0" stop-color="hsl(' +
      h +
      ',16%,27%)"/><stop offset="1" stop-color="hsl(' +
      h +
      ',14%,10%)"/></radialGradient></defs><rect width="400" height="500" fill="url(#g)"/><g fill="none" stroke="#cda353" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" opacity=".7"><rect x="150" y="196" width="100" height="84" rx="8"/><circle cx="178" cy="224" r="9"/><path d="M156 274l31-27 24 20 16-12 21 19"/></g></svg>',
  );

/* Produtos de exemplo — usados só em localhost quando o banco não tem produtos. */
const seed = () => [
  ['Produto Especial', 'Novidades', 129.9, 99.9, '3x sem juros', 'Item selecionado com carinho para você.', 1, 200],
  ['Item Premium', 'Destaques', 189.9, 0, '4x sem juros', 'Qualidade superior em cada detalhe.', 1, 330],
  ['Kit Completo', 'Mais Vendidos', 249.9, 219.9, '5x sem juros', 'Conjunto completo com o melhor custo-benefício.', 0, 45],
  ['Edição Limitada', 'Exclusivos', 349.9, 0, '6x sem juros', 'Item exclusivo, poucas unidades disponíveis.', 0, 110],
  ['Oferta do Dia', 'Promoções', 89.9, 69.9, '2x sem juros', 'Aproveite o preço especial por tempo limitado.', 0, 25],
  ['Mais Vendido', 'Mais Vendidos', 159.9, 0, '4x sem juros', 'O favorito dos nossos clientes.', 1, 0],
  ['Novidade da Semana', 'Novidades', 199.9, 0, '4x sem juros', 'Chegou recentemente em nossa loja.', 0, 300],
  ['Combinação Perfeita', 'Destaques', 79.9, 0, '2x sem juros', 'Combinação que agrada todos os estilos.', 0, 250]
].map((a, i) => ({
  id: i + 1,
  title: a[0],
  category: a[1],
  price: a[2],
  promo: a[3] || null,
  installment: a[4],
  description: a[5],
  featured: !!a[6],
  available: true,
  images: [art(a[7])],
  created_at: new Date().toISOString()
}));

/* Se o CDN do supabase-js falhar, SB fica null e a loja mostra o estado de erro (com "Tentar novamente"). */
const SB = window.supabase ? supabase.createClient(SB_URL, SB_KEY) : null;
