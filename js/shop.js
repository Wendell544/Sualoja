/* =============================================================
   shop.js — vitrine: hero, rails, coleção, favoritos, sacola e modal.
   API pública preservada: render, hero, rails, grid, card, adCard, drawP,
   cartUI, footer, openFromHash e ACT.* (admin/login/exit vivem no admin.js).
   ============================================================= */
const S = { cat: 'Todos', q: '', srt: 'feat', n: 0, err: 0 }, PM = { p: null, i: 0, z: false, h: 0 };
let swp = 0;
const FAV = '__fav';
const pr = (p) => (p.promo > 0 && p.promo < p.price ? +p.promo : +p.price);
const born = (p) => Date.parse(p.created_at) || (+p.id > 1e11 ? +p.id : 0); // o schema não tem created_at: id = epoch em ms
const pct = (p) => Math.round((1 - pr(p) / p.price) * 100);
const pg = () => +DB.set.page || 12;
const WAH = () => wa('Olá! Vim pelo site e gostaria de ajuda.');
const waP = (p) => wa('Olá! Tenho interesse em: ' + p.title + ' (' + money(pr(p)) + ')');

const inst = (p) => {
  if (!p.installment) return '';
  const raw = String(p.installment).trim();
  if (/^\d+x?$/i.test(raw)) {
    const n = parseInt(raw.replace(/x/i, ''), 10);
    if (n > 1) return `${n}x de ${money(pr(p) / n)} sem juros`;
  }
  const m = /^\s*(\d+)\s*x?\s*(.*)$/i.exec(raw);
  if (m && +m[1] > 1) {
    let txt = m[2] ? m[2].trim() : '';
    if (txt.toLowerCase().startsWith('de ') || txt.toLowerCase() === 'vezes') txt = 'sem juros';
    return `${m[1]}x de ${money(pr(p) / m[1])} ${txt || 'sem juros'}`.trim();
  }
  return raw;
};

const lines = () => DB.cart.map((c) => ({ p: DB.prod.find((p) => p.id === c.id), qty: c.qty })).filter((l) => l.p);
const total = (L) => L.reduce((s, l) => s + pr(l.p) * l.qty, 0);

/* Favoritos: ids no localStorage (KEY.wish) */
const W = (() => {
  const v = Store.get(KEY.wish, []), ids = new Set(Array.isArray(v) ? v.map(Number).filter(Boolean) : []);
  return {
    has: (id) => ids.has(+id),
    list: () => DB.prod.filter((p) => ids.has(+p.id)),
    tog(id) {
      const on = !ids.has(+id);
      on ? ids.add(+id) : ids.delete(+id);
      Store.set(KEY.wish, [...ids]);
      return on;
    }
  };
})();

/* Categorias ativas com produto. Sem tabela de categorias, deriva dos produtos. */
const cats = () => {
  const has = new Set(DB.prod.map((p) => p.category));
  return (DB.categories.length ? DB.categories.filter((x) => x.on) : [...has].map((name) => ({ name }))).filter((x) => has.has(x.name));
};

/* Re-renderiza sem perder o foco do teclado (mesmo data-a + data-v). */
const keep = (root, fn) => {
  const a = document.activeElement, d = a && root.contains(a) && a.dataset;
  const k = d && d.a ? `[data-a="${d.a}"][data-v="${CSS.escape(d.v || '')}"]` : '';
  fn();
  if (k) (root.querySelector(k) || root).focus({ preventScroll: true });
};

const tcol = () => {
  const c = document.documentElement.dataset.theme === 'dark' ? '#12100e' : '#f6f2eb';
  document.querySelectorAll('meta[name=theme-color]').forEach((m) => (m.content = c));
};

/* Slot da logo: lido das variáveis CSS (--logo-src / --logo-text em css/style.css).
   Com url() em --logo-src vira imagem; sem ela, logo tipográfico. O texto sempre fica no HTML (acessível). */
const cssv = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const logoUI = () => {
  const t = cssv('--logo-text').replace(/^(["'])(.*)\1$/, '$2').trim(), n = t || (DB.set && DB.set.name) || SET0.name, img = /^url\(/i.test(cssv('--logo-src'));
  document.querySelectorAll('.logo').forEach((l) => {
    const sp = l.querySelector('span');
    l.classList.toggle('img', img);
    if (sp && sp.textContent !== n) sp.textContent = n;
    l.setAttribute('aria-label', n + ' — página inicial');
  });
};
/* Nome da loja (SET0.name ou settings.data.name no Supabase): título da aba, rodapé e pedido. */
const brand = () => {
  const s = DB.set, n = s.name || SET0.name;
  logoUI();
  if (!document.title.includes(n)) document.title = n + (s.kick ? ' — ' + s.kick : '');
};

function hero() {
  const s = DB.set, h = document.querySelector('.hero'), bg = s.hero_bg ? s.hero_bg.u || s.hero_bg : '';
  if (h) {
    let im = h.querySelector('.hero-bg');
    if (bg && typeof bg === 'string') {
      if (!im || im.dataset.u !== bg) {
        if (im) im.remove();
        const t = document.createElement('div');
        t.innerHTML = IMG.html({ u: bg }, { alt: '', eager: 1 }); // eager + fetchpriority=high (LCP)
        im = t.firstElementChild;
        im.className = 'hero-bg';
        im.dataset.u = bg;
        im.setAttribute('aria-hidden', 'true');
        const on = () => (/^data:/.test(im.src) ? (im.remove(), h.classList.remove('has-bg')) : im.classList.add('on'));
        im.complete && im.naturalWidth ? on() : im.addEventListener('load', on);
        h.prepend(im);
      }
      h.classList.add('has-bg');
    } else {
      if (im) im.remove();
      h.classList.remove('has-bg');
    }
  }
  const k = $('hk'), x = $('hx');
  k.textContent = s.kick || '';
  k.hidden = !s.kick;
  $('ht').innerHTML = esc(String(s.title || '').trim()).replace(/(\S+)$/, '<span class="gt">$1</span>');
  x.textContent = s.text || '';
  x.hidden = !s.text;
  $('hw').href = WAH();
}

const favB = (p, c = '') =>
  `<button class="fav${c}${W.has(p.id) ? ' on' : ''}" data-a="wish" data-v="${p.id}" aria-pressed="${W.has(p.id)}" aria-label="Favoritar ${esc(p.title)}">${ic('heart', 18)}</button>`;

const card = (p, h) => {
  h = typeof h === 'string' ? h : 'h3';
  const v = pr(p), off = v < p.price, un = p.available === false, i = inst(p), u = '#p=' + p.id, t = esc(p.title);
  const nw = !off && !un && Date.now() - born(p) < 30 * 864e5;
  const tg = (off ? `<span class="tag gold">−${pct(p)}%</span>` : '') + (un ? '<span class="tag un">Esgotado</span>' : '') +
    (nw ? '<span class="tag new">Novo</span>' : '') + (p.featured && !off && !nw && !un ? `<span class="tag st" title="Destaque">${ic('star', 12)}</span>` : '');
  return `<article class="cd${un ? ' un' : ''}">
<div class="cd-m"><a class="cd-i sk" href="${u}" data-a="open" data-v="${p.id}" tabindex="-1" aria-hidden="true">${IMG.html(p.images[0], { alt: p.title, s: 'card' })}</a>${tg ? `<div class="tags">${tg}</div>` : ''}${favB(p)}</div>
<p class="kick">${esc(p.category)}</p>
<${h} class="cd-t"><a href="${u}" data-a="open" data-v="${p.id}">${t}</a></${h}>
<div class="pr"><b>${money(v)}</b>${off ? `<s>${money(p.price)}</s>` : ''}</div>${i ? `<p class="ins">${esc(i)}</p>` : ''}
<div class="cd-a"><button class="b gold" data-a="add" data-v="${p.id}"${un ? ' disabled' : ''}>${ic('bag', 16)}${un ? 'Esgotado' : 'Adicionar'}</button><a class="q" target="_blank" rel="noopener" aria-label="Pedir ${t} pelo WhatsApp" href="${esc(waP(p))}">${ic('wa', 18)}</a></div>
</article>`;
};

const adCard = (a) => `<article class="ac${a.img ? '' : ' nb'}">${a.img ? `<div class="ac-i sk">${IMG.html(a.img, { alt: a.title || '' })}</div>` : ''}<div class="ac-b">${a.title ? `<h3 class="serif">${esc(a.title)}</h3>` : ''}${a.text ? `<p>${esc(a.text)}</p>` : ''}${a.btn ? `<a class="b ghost sm" target="_blank" rel="noopener" href="${esc(lk(a))}">${esc(a.btn)}</a>` : ''}</div></article>`;

const sec = (id, t, inner, c = '', d = '') =>
  `<section class="w sec" aria-labelledby="rt-${id}"><div class="sec-h"><div class="sec-t"><h2 class="serif h2" id="rt-${id}">${t}</h2>${d ? `<p>${d}</p>` : ''}</div><div class="rl-nav"><button class="q" data-a="rl" data-v="${id}:-1" aria-label="Anterior" aria-controls="rl-${id}">${ic('prev')}</button><button class="q" data-a="rl" data-v="${id}:1" aria-label="Próximo" aria-controls="rl-${id}">${ic('next')}</button></div></div><div class="rl-w"><div class="rl${c}" id="rl-${id}">${inner}</div></div></section>`;

/* Indicador de overflow dos rails: sombras nas bordas + setas desativadas nas pontas. */
const railUI = (root) =>
  (root || document).querySelectorAll('.rl,.fc').forEach((r) => {
    if (!r._u) {
      const w = r.parentNode, s = r.classList.contains('rl') && r.closest('.sec'), bs = s ? s.querySelectorAll('[data-a=rl]') : [];
      let q = 0;
      r._u = () => {
        const x = Math.abs(r.scrollLeft), m = r.scrollWidth - r.clientWidth - 4;
        w.classList.toggle('l', x > 4);
        w.classList.toggle('r', x < m);
        if (s) s.classList.toggle('nov', m <= 0);
        bs.forEach((b) => b.setAttribute('aria-disabled', b.dataset.v.endsWith('-1') ? x <= 4 : x >= m));
      };
      r.addEventListener('scroll', () => q || (q = requestAnimationFrame(() => { q = 0; r._u(); })), { passive: true });
    }
    requestAnimationFrame(r._u);
  });

function rails() {
  const s = DB.set.show || {}, P = DB.prod, o = [];
  if (s.cats) {
    const c = cats();
    const im = (x) => x.img || (P.find((p) => p.category === x.name && p.images[0]) || { images: [] }).images[0];
    if (c.length > 1) o.push(sec('cats', 'Compre por categoria', c.map((x) => `<button class="ct" data-a="cat" data-v="${esc(x.name)}"><span class="ct-i sk">${IMG.html(im(x), { alt: '', s: 'card' })}</span><span class="serif">${esc(x.name)}</span></button>`).join(''), ' rl-cats', 'Navegue pelas categorias da loja'));
  }
  const a = DB.ads.filter((x) => x.on);
  if (s.ads && a.length) o.push(sec('ads', 'Novidades e ofertas', a.map(adCard).join(''), ' rl-ads', 'Avisos e campanhas da loja'));
  if (s.feat) {
    const l = P.filter((p) => p.featured).slice(0, 12);
    if (l.length) o.push(sec('feat', 'Em destaque', l.map(card).join(''), '', 'Selecionados pela loja'));
  }
  if (s.best) {
    const l = Hist.top(24).map((id) => P.find((p) => p.id === id && p.available !== false)).filter(Boolean).slice(0, 8);
    if (l.length >= 3) o.push(sec('best', 'Mais vendidos', l.map(card).join(''), '', 'Os mais procurados por aqui'));
  }
  if (s.news && P.length > 8) o.push(sec('news', 'Lançamentos', [...P].sort((x, y) => born(y) - born(x)).slice(0, 8).map(card).join(''), '', 'Chegaram recentemente'));
  const r = $('rails');
  r.innerHTML = o.join('');
  IMG.hydrate(r);
  railUI(r);
}

/* Chips de filtro: Todos · categorias · Favoritos. Só re-renderiza se a lista mudar. */
const chips = () => {
  const e = $('fc'), c = cats(), n = W.list().length, k = c.map((x) => x.name).join('|') + '#' + n;
  e.hidden = S.err || !DB.prod.length;
  if (e.dataset.k !== k) {
    const b = (v, l) => `<button class="chip" data-a="cat" data-v="${esc(v)}">${l}</button>`;
    e.dataset.k = k;
    e.innerHTML = b('Todos', 'Todos') + c.map((x) => b(x.name, esc(x.name))).join('') + b(FAV, ic('heart', 14) + 'Favoritos' + (n ? `<span class="cn">${n}</span>` : ''));
  }
  e.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === S.cat));
  railUI(e.parentNode);
};

const box = (i, t, d, b = '') => `<div class="empty"><span class="ei">${ic(i, 24)}</span><h3>${t}</h3><p>${d}</p>${b}</div>`;
const none = () =>
  S.err ? box('alert', 'Não foi possível carregar a loja', 'Verifique sua conexão com a internet e tente novamente.', `<button class="b gold" data-a="retry">${ic('retry', 16)}Tentar novamente</button>`)
  : !DB.prod.length ? box('bag', 'Novidades a caminho', 'Estamos preparando a vitrine. Enquanto isso, fale com a gente pelo WhatsApp.', `<a class="b gold" target="_blank" rel="noopener" href="${esc(WAH())}">${ic('wa', 16)}Falar no WhatsApp</a>`)
  : S.cat === FAV && !S.q.trim() ? box('heart', 'Nenhum favorito ainda', 'Toque no coração de um produto para guardá-lo aqui.', '<button class="b ghost" data-a="cat" data-v="Todos">Ver todos os produtos</button>')
  : box('search', 'Nada encontrado', 'Tente outro termo de busca ou escolha outra categoria.', '<button class="b ghost" data-a="reset">Limpar filtros</button>');

function grid() {
  const t = nz(S.q.trim()), f = S.srt, fv = S.cat === FAV;
  if (!fv && S.cat !== 'Todos' && !cats().some((c) => c.name === S.cat)) S.cat = 'Todos';
  chips();
  const l = DB.prod.filter((p) => (fv ? W.has(p.id) : S.cat === 'Todos' || p.category === S.cat) && nz(p.title + ' ' + p.category).includes(t));
  l.sort((a, b) => (f === 'lo' ? pr(a) - pr(b) : f === 'hi' ? pr(b) - pr(a) : f === 'new' ? born(b) - born(a) : (b.featured ? 1 : 0) - (a.featured ? 1 : 0)));
  const m = l.slice(0, S.n || pg()), g = $('grid'), mo = $('more');
  $('cnt').textContent = S.err ? '' : l.length + (l.length === 1 ? ' produto' : ' produtos');
  g.innerHTML = m.length ? m.map(card).join('') : none();
  mo.classList.toggle('hid', l.length <= m.length);
  mo.textContent = 'Ver mais produtos (' + (l.length - m.length) + ')';
  IMG.hydrate(g);
}

/* Modal de produto ------------------------------------------- */
const alt = (p, i) => p.title + (p.images.length > 1 ? ` — foto ${i + 1} de ${p.images.length}` : '');
const gal = (p) => {
  const im = p.images, n = im.length;
  return `<div class="pm-main sk${PM.z ? ' zm' : ''}"><button class="pm-z" data-a="pz" aria-pressed="${PM.z}" aria-label="Ampliar foto">${IMG.html(im[PM.i], { alt: alt(p, PM.i), eager: 1, s: 'full' })}</button>${n > 1 ? `<button class="q pm-a pv" data-a="pnav" data-v="-1" aria-label="Foto anterior">${ic('prev')}</button><button class="q pm-a nx" data-a="pnav" data-v="1" aria-label="Próxima foto">${ic('next')}</button><span class="pm-c" aria-hidden="true">${PM.i + 1}/${n}</span>` : ''}</div>${n > 1 ? `<div class="pm-thumbs">${im.map((r, i) => `<button class="pm-th${i === PM.i ? ' on' : ''}" data-a="pimg" data-v="${i}" aria-label="Ver foto ${i + 1}"${i === PM.i ? ' aria-current="true"' : ''}>${IMG.html(r, { s: 'thumb', eager: 1 })}</button>`).join('')}</div>` : ''}`;
};

/* Troca só a foto (sem redesenhar o modal): mantém rolagem e foco. */
const drawG = () => {
  const g = $('pmb').querySelector('.pm-img'), p = PM.p;
  if (!g || !p) return;
  const m = g.querySelector('.pm-main'), z = m.querySelector('.pm-z'), c = m.querySelector('.pm-c');
  PM.z = false;
  m.classList.remove('zm');
  m.classList.add('sk');
  m.style.removeProperty('--zx');
  m.style.removeProperty('--zy');
  z.setAttribute('aria-pressed', 'false');
  z.setAttribute('aria-label', 'Ampliar foto');
  z.innerHTML = IMG.html(p.images[PM.i], { alt: alt(p, PM.i), eager: 1, s: 'full' });
  if (c) c.textContent = PM.i + 1 + '/' + p.images.length;
  g.querySelectorAll('.pm-th').forEach((b, i) => {
    b.classList.toggle('on', i === PM.i);
    if (i !== PM.i) return b.removeAttribute('aria-current');
    b.setAttribute('aria-current', 'true');
    b.parentNode.scrollTo({ left: b.offsetLeft - (b.parentNode.clientWidth - b.offsetWidth) / 2, behavior: smooth() });
  });
  IMG.hydrate(g);
};

/* Zoom: a origem acompanha o ponteiro (mouse ou dedo). */
const zoomAt = (e) => {
  const m = $('pmb').querySelector('.pm-main');
  if (!m || !e || !(e.clientX || e.clientY)) return;
  const r = m.getBoundingClientRect();
  m.style.setProperty('--zx', clamp(((e.clientX - r.left) / r.width) * 100, 0, 100) + '%');
  m.style.setProperty('--zy', clamp(((e.clientY - r.top) / r.height) * 100, 0, 100) + '%');
};

const related = (p) => {
  const ok = DB.prod.filter((x) => x.id !== p.id && x.available !== false), f = (a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
  return [...ok.filter((x) => x.category === p.category).sort(f), ...ok.filter((x) => x.category !== p.category).sort(f)].slice(0, 8);
};

function drawP() {
  const p = PM.p, v = pr(p), off = v < p.price, un = p.available === false, i = inst(p), rel = related(p), wl = esc(waP(p)), b = $('pmb');
  const add = (l) => `<button class="b gold" data-a="add" data-v="${p.id}"${un ? ' disabled' : ''}>${ic('bag', 18)}${un ? 'Esgotado' : l}</button>`;
  b.innerHTML = `<button class="q pm-x" data-a="close" aria-label="Fechar">${ic('x', 18)}</button>
<div class="pm-s">
<div class="pm-img">${gal(p)}</div>
<div class="pm-info">
<div class="pm-top"><p class="kick tg">${esc(p.category)}</p><div class="pm-tools">${favB(p, ' q')}<button class="q" data-a="share" data-v="${p.id}" aria-label="Compartilhar produto">${ic('share', 18)}</button></div></div>
<h2 class="pm-title" id="pm-t">${esc(p.title)}</h2>
<div class="pm-price"><b>${money(v)}</b>${off ? `<s>${money(p.price)}</s><span class="tag gold">−${pct(p)}%</span>` : ''}</div>${i ? `<p class="sm tm">${esc(i)}</p>` : ''}
${p.description ? `<p class="pm-desc">${esc(p.description)}</p>` : ''}${un ? `<p class="pm-un">${ic('alert', 18)}Produto esgotado no momento. Fale conosco para encomendar.</p>` : ''}
<div class="pm-act">${add('Adicionar à sacola')}<a class="b ghost" target="_blank" rel="noopener" href="${wl}">${ic('wa', 18)}WhatsApp</a></div>
<p class="pm-note">${ic('wa', 14)}Pedido finalizado pelo WhatsApp, direto com a loja.</p>
</div>
${rel.length ? `<section class="rel" aria-labelledby="rel-t"><h3 class="serif h3" id="rel-t">Você também pode gostar</h3><div class="rl-w"><div class="rl">${rel.map((x) => card(x, 'h4')).join('')}</div></div></section>` : ''}
<div class="pm-bar"><div class="pm-bp"><b>${money(v)}</b>${off ? `<s>${money(p.price)}</s>` : ''}</div>${add('Adicionar')}<a class="q" target="_blank" rel="noopener" href="${wl}" aria-label="Pedir pelo WhatsApp">${ic('wa')}</a></div>
</div>`;
  IMG.hydrate(b);
  railUI(b);
  // Re-hidrata no próximo frame: cobre imagens em cache que completam entre o innerHTML e o hydrate.
  requestAnimationFrame(() => PM.p && IMG.hydrate(b));
}

function cartUI() {
  const L = lines(), n = L.reduce((s, l) => s + l.qty, 0), b = $('bd'), cb = document.querySelector('[data-a=cart]');
  b.textContent = n;
  b.classList.toggle('hid', !n);
  if (cb) cb.setAttribute('aria-label', n ? `Abrir sacola, ${n} ${n === 1 ? 'item' : 'itens'}` : 'Abrir sacola');
  $('dq').textContent = n ? `(${n})` : '';
  $('cb').classList.toggle('hid', !n);
  $('sub').textContent = money(total(L));
  $('drw').classList.toggle('empty', !L.length);
  keep($('drw'), () => {
    $('ci').innerHTML = L.length
      ? L.map(({ p, qty }) => {
          const t = esc(p.title);
          return `<div class="ci"><span class="ci-i sk">${IMG.html(p.images[0], { s: 'thumb', alt: p.title, now: 1 })}</span><div class="ci-c"><div class="ci-r"><p class="ci-t">${t}</p><button class="q rm" data-a="rm" data-v="${p.id}" aria-label="Remover ${t}">${ic('trash', 16)}</button></div><p class="sm tm">${money(pr(p))} cada</p><div class="ci-r"><div class="stp" role="group" aria-label="Quantidade de ${t}"><button class="q" data-a="chg" data-v="${p.id}:-1" aria-label="Diminuir">${ic('minus', 16)}</button><span class="qn">${qty}</span><button class="q" data-a="chg" data-v="${p.id}:1" aria-label="Aumentar"${qty >= 99 ? ' disabled' : ''}>${ic('plus', 16)}</button></div><b class="ci-p">${money(pr(p) * qty)}</b></div></div></div>`;
        }).join('')
      : box('bag', 'Sua sacola está vazia', 'Explore a coleção e adicione os produtos que você amar.', '<button class="b gold" data-a="shop">Explorar produtos</button>');
  });
  IMG.hydrate($('ci'));
}

const wishUI = () => {
  const n = W.list().length, b = $('wb'), f = document.querySelector('[data-a=favs]');
  b.textContent = n;
  b.classList.toggle('hid', !n);
  if (f) f.setAttribute('aria-label', n ? `Ver favoritos, ${n}` : 'Ver favoritos');
};

function footer() {
  const s = DB.set, n = esc(s.name || SET0.name), ig = String(s.ig || '').replace(/^@/, '');
  const L = [`<a target="_blank" rel="noopener" href="${esc(WAH())}">${ic('wa', 16)}WhatsApp</a>`];
  if (/^[\w.]{1,30}$/.test(ig)) L.push(`<a target="_blank" rel="noopener" href="https://www.instagram.com/${ig}/">${ic('ig', 16)}@${ig}</a>`);
  if (okUrl(s.fb)) L.push(`<a target="_blank" rel="noopener" href="${esc(s.fb)}">${ic('fb', 16)}Facebook</a>`);
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email || '')) L.push(`<a href="mailto:${esc(s.email)}">${ic('mail', 16)}${esc(s.email)}</a>`);
  $('ft').innerHTML = `<div class="w ft-in"><div class="ft-a"><a href="#top" class="logo"><span>${n}</span></a>${s.about ? `<p class="tm">${esc(s.about)}</p>` : ''}${s.addr ? `<p class="sm tm">${esc(s.addr)}</p>` : ''}</div><div class="ft-c"><h2 class="kick tm">Atendimento</h2><nav class="ft-l" aria-label="Contato e redes sociais">${L.join('')}</nav></div></div><div class="w ft-b"><span>© ${new Date().getFullYear()} ${n}</span><button class="dots-btn" data-a="admin" tabindex="-1" aria-hidden="true">•••</button></div>`;
}

const render = () => {
  hero();
  rails();
  grid();
  cartUI();
  wishUI();
  footer();
  brand();
};
const pop = () => {
  const b = $('bd');
  b.classList.remove('pop');
  void b.offsetWidth;
  b.classList.add('pop');
};
const cartSave = () => {
  Store.set(KEY.cart, DB.cart);
  cartUI();
};

/* Ações (data-a) --------------------------------------------- */
ACT.cat = (c, t) => {
  S.cat = c;
  S.n = 0;
  Prefs.set({ cat: c });
  grid();
  const e = $('fc'), b = e.querySelector('[aria-pressed=true]');
  if (b) e.scrollTo({ left: b.offsetLeft - (e.clientWidth - b.offsetWidth) / 2, behavior: smooth() });
  if (!(t && t.closest && t.closest('#fc'))) $('colecao').scrollIntoView({ behavior: smooth() });
};
ACT.favs = () => ACT.cat(FAV);
ACT.reset = () => {
  S.q = '';
  document.querySelectorAll('.qi').forEach((i) => (i.value = ''));
  ACT.cat('Todos', $('fc'));
};
ACT.retry = () => location.reload();
ACT.more = () => {
  S.n = (S.n || pg()) + pg();
  grid();
};
ACT.rl = (v) => {
  const [i, d] = v.split(':'), e = $('rl-' + i);
  if (e) e.scrollBy({ left: d * e.clientWidth * 0.9, behavior: smooth() });
};
ACT.top = () => {
  scrollTo({ top: 0, behavior: smooth() });
  $('logo').focus({ preventScroll: true });
};
ACT.srch = () => {
  $('colecao').scrollIntoView({ behavior: smooth() });
  $('qm').focus({ preventScroll: true }); // ainda dentro do toque: o teclado abre no iOS
};
ACT.shop = () => {
  drawer(0);
  setTimeout(() => $('colecao').scrollIntoView({ behavior: smooth() }), 80);
};

ACT.wish = (id, t) => {
  const p = DB.prod.find((x) => x.id == id);
  if (!p) return;
  const on = W.tog(p.id);
  document.querySelectorAll(`[data-a="wish"][data-v="${p.id}"]`).forEach((b) => {
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  });
  if (t) {
    t.classList.remove('pop');
    void t.offsetWidth;
    t.classList.add('pop');
  }
  wishUI();
  S.cat === FAV ? grid() : chips();
  toast(on ? 'Salvo nos favoritos.' : 'Removido dos favoritos.', 'ok');
};

ACT.open = (id, t, e) => {
  if (e && (e.metaKey || e.ctrlKey || e.shiftKey)) return; // deixa abrir em nova aba
  if (e) e.preventDefault();
  const p = DB.prod.find((x) => x.id == id);
  if (!p) return;
  const was = !$('pm').classList.contains('hid'), h = '#p=' + p.id, b = $('pmb');
  PM.p = p;
  PM.i = 0;
  PM.z = false;
  drawP();
  if (!was) modal('pm', 1);
  // #p=id no histórico: link compartilhável e o "voltar" do celular fecha o modal
  if (location.hash !== h) {
    if (was || PM.h) history.replaceState(null, '', h);
    else {
      history.pushState(null, '', h);
      PM.h = 1;
    }
  }
  b.focus({ preventScroll: true });
  requestAnimationFrame(() => PM.p && IMG.hydrate(b));
};

ACT.pimg = (i) => {
  PM.i = +i;
  drawG();
};

ACT.pnav = (v) => {
  const n = PM.p.images.length;
  if (n < 2) return;
  PM.i = (PM.i + +v + n) % n;
  drawG();
};

ACT.pz = (v, t, e) => {
  if (swp) {
    swp = 0;
    return;
  }
  const m = $('pmb').querySelector('.pm-main'), z = m && m.querySelector('.pm-z');
  if (!z) return;
  PM.z = !PM.z;
  if (PM.z) zoomAt(e);
  else {
    m.style.removeProperty('--zx');
    m.style.removeProperty('--zy');
  }
  m.classList.toggle('zm', PM.z);
  z.setAttribute('aria-pressed', PM.z);
  z.setAttribute('aria-label', PM.z ? 'Reduzir foto' : 'Ampliar foto');
};

ACT.add = (id, t) => {
  const p = DB.prod.find((x) => x.id == id);
  if (!p || p.available === false) return toast('Produto esgotado no momento.', 'er');
  const c = DB.cart.find((x) => x.id === p.id);
  if (c) c.qty = Math.min(99, c.qty + 1);
  else DB.cart.push({ id: p.id, qty: 1 });
  Hist.bump(p.id);
  cartSave();
  pop();
  toast('"' + p.title + '" foi para a sacola.', 'ok');
  if (t && t.tagName === 'BUTTON' && !t.dataset.o) {
    t.dataset.o = t.innerHTML;
    t.innerHTML = ic('check', 18) + 'Adicionado';
    t.classList.add('ok');
    setTimeout(() => {
      t.innerHTML = t.dataset.o;
      t.classList.remove('ok');
      delete t.dataset.o;
    }, 1400);
  }
};
const say = (m) => ($('dl').textContent = m);
ACT.chg = (v) => {
  const [i, d] = v.split(':'), c = DB.cart.find((x) => x.id == i), p = DB.prod.find((x) => x.id == i);
  if (!c) return;
  c.qty = Math.min(99, c.qty + +d);
  if (c.qty < 1) DB.cart = DB.cart.filter((x) => x !== c);
  cartSave();
  if (p) say(c.qty < 1 ? p.title + ' removido da sacola.' : 'Quantidade de ' + p.title + ': ' + c.qty);
};
ACT.rm = (i) => {
  DB.cart = DB.cart.filter((x) => x.id != i);
  cartSave();
  say('Item removido da sacola.');
};
ACT.clr = () => {
  DB.cart = [];
  cartSave();
  say('Sacola esvaziada.');
};
ACT.cart = () => {
  $('ts').classList.remove('on');
  drawer(1);
};
ACT.close = () => {
  drawer(0);
  modal('lg', 0);
  modal('pm', 0);
  PM.z = false;
  if (/^#p=/.test(location.hash)) {
    if (PM.h) {
      PM.h = 0;
      history.back();
    } else history.replaceState(null, '', location.pathname + location.search);
  }
};

ACT.share = async (id, t) => {
  const p = DB.prod.find((x) => x.id == id);
  if (!p) return;
  const url = location.origin + location.pathname + '#p=' + p.id;
  if (navigator.share) {
    try {
      await navigator.share({ title: p.title, text: p.title + ' — ' + money(pr(p)), url });
      return;
    } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
  }
  let ok = false;
  try {
    await navigator.clipboard.writeText(url);
    ok = true;
  } catch (e) {
    const a = document.createElement('textarea');
    a.value = url;
    a.setAttribute('readonly', '');
    a.style.cssText = 'position:fixed;opacity:0';
    document.body.append(a);
    a.select();
    try {
      ok = document.execCommand('copy');
    } catch (_) {}
    a.remove();
    if (t && t.focus) t.focus({ preventScroll: true });
  }
  toast(ok ? 'Link copiado.' : 'Não foi possível copiar o link.', ok ? 'ok' : 'er');
};

ACT.theme = () => {
  const r = document.documentElement, cur = r.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  r.dataset.theme = cur === 'dark' ? 'light' : 'dark';
  Prefs.set({ theme: r.dataset.theme });
  tcol();
  // O reflow do tema pode reiniciar transições: re-hidrata o modal se estiver aberto.
  requestAnimationFrame(() => {
    if (!$('pm').classList.contains('hid')) IMG.hydrate($('pmb'));
  });
};

/* Síncrono de propósito: troca o href do <a target=_blank> dentro do próprio clique. */
ACT.fin = (v, a, e) => {
  const L = lines(), n = $('nm').value.trim(), d = $('addr').value.trim(), er = $('cerr');
  const m = !L.length ? 'Adicione ao menos um produto à sacola.' : !n ? 'Informe seu nome para continuar.' : !d ? 'Informe o endereço com cidade para a entrega.' : '';
  er.textContent = m;
  er.classList.toggle('hid', !m);
  if (m) {
    e.preventDefault();
    if (L.length) $(!n ? 'nm' : 'addr').focus();
    return;
  }
  a.href = wa([
    '🛍️ *Novo pedido · ' + (DB.set.name || SET0.name) + '*', '',
    '👤 *Cliente:* ' + n, '📍 *Entrega:* ' + d, '💳 *Pagamento:* ' + $('pay').value, '',
    '🧾 *Itens do pedido*',
    ...L.map(({ p, qty }, i) => i + 1 + '. ' + p.title + '\n    ' + qty + ' × ' + money(pr(p)) + ' = ' + money(pr(p) * qty) + (inst(p) ? '\n    ' + inst(p) : '')),
    '', '💰 *Total: ' + money(total(L)) + '*', '', 'Aguardo a confirmação. Obrigado!'
  ].join('\n'));
  toast('Pedido pronto! Abrindo o WhatsApp…', 'ok');
};

const openFromHash = () => {
  const m = /^#p=(\d+)/.exec(location.hash);
  if (m) {
    const p = DB.prod.find((x) => x.id == m[1]);
    if (p) ACT.open(p.id);
  }
};
