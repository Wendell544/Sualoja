/* =============================================================
   app.js — eventos globais (delegação data-a), atalhos e boot.
   Também atende o admin.js: busca (fq), rascunho (pf-*), msearch,
   uploads (pf-file / mf-file / sf-file) e Ctrl+S.
   ============================================================= */
let pd = null;
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-a]');
  if (t) {
    const f = ACT[t.dataset.a];
    if (f) f(t.dataset.v, t, e);
    return;
  }
  // Fundo do modal fecha — só se o clique começou nele (arrastar texto não fecha).
  if (e.target.classList && e.target.classList.contains('md') && pd === e.target) ACT.close();
});

document.addEventListener('keydown', (e) => {
  const k = e.key, t = e.target, pm = !$('pm').classList.contains('hid');
  if (k === 'Escape') pm && PM.z ? ACT.pz() : ACT.close();
  if ((k === 'ArrowLeft' || k === 'ArrowRight') && pm && PM.p && PM.p.images.length > 1 && !/INPUT|TEXTAREA|SELECT/.test(t.tagName)) {
    e.preventDefault();
    ACT.pnav(k === 'ArrowLeft' ? -1 : 1);
  }
  if ((k === 'Enter' || k === ' ') && t.getAttribute && t.getAttribute('role') === 'button' && t.dataset.a) {
    e.preventDefault();
    t.click();
  }
  if (k === 'Enter' && t.id === 'pw') ACT.login();
  if (k === 'Enter' && t.classList && t.classList.contains('qi')) {
    t.blur();
    $('colecao').scrollIntoView({ behavior: smooth() });
  }
  if (A.ok && (e.ctrlKey || e.metaKey) && String(k).toLowerCase() === 's') {
    if (A.tab === 0) {
      e.preventDefault();
      if ($('pf-title')) saveP();
    } else if (A.tab === 3) {
      e.preventDefault();
      ACT.sset();
    }
  }
});

document.addEventListener('input', (e) => {
  const id = e.target.id || '';
  if (id === 'fq') {
    A.fq = e.target.value;
    A.pl = 20;
    plist();
  } else if (A.ok && A.tab === 0 && id.startsWith('pf-')) drs();
  else if (e.target.dataset && e.target.dataset.a === 'msearch') ACT.msearch(e.target.dataset.v, e.target);
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'pf-file') {
    upP([...t.files]);
    t.value = '';
  } else if (t.id === 'mf-file') {
    upM([...t.files]);
    t.value = '';
  } else if (t.id === 'sf-file') {
    upSet([...t.files]);
    t.value = '';
  }
});

/* Galeria: swipe troca a foto; com zoom ativo, o ponteiro move a ampliação. */
let sx = null, zq = 0, ze = null;
document.addEventListener('pointerdown', (e) => {
  pd = e.target;
  sx = !PM.z && e.pointerType !== 'mouse' && e.target.closest && e.target.closest('.pm-main') ? e.clientX : null;
}, true);
document.addEventListener('pointerup', (e) => {
  if (sx !== null && !PM.z && PM.p && PM.p.images.length > 1 && Math.abs(e.clientX - sx) > 50) {
    swp = 1;
    setTimeout(() => {
      swp = 0;
    }, 500);
    ACT.pnav(e.clientX < sx ? 1 : -1);
  }
  sx = null;
});
document.addEventListener('pointermove', (e) => {
  if (!PM.z || !e.target.closest || !e.target.closest('.pm-main')) return;
  ze = e;
  zq = zq || requestAnimationFrame(() => {
    zq = 0;
    zoomAt(ze);
  });
}, { passive: true });

/* Busca em tempo real (header + coleção sincronizados) */
let qt;
const onQ = (e) => {
  S.q = e.target.value;
  document.querySelectorAll('.qi').forEach((o) => {
    if (o !== e.target) o.value = S.q;
  });
  clearTimeout(qt);
  qt = setTimeout(() => {
    S.n = 0;
    grid();
    if (e.target.id === 'qh' && S.q.trim()) {
      const r = $('colecao').getBoundingClientRect();
      if (r.top > innerHeight * 0.5 || r.bottom < 0) $('colecao').scrollIntoView({ behavior: smooth() });
    }
  }, 160);
};
document.querySelectorAll('.qi').forEach((i) => i.addEventListener('input', onQ));

$('so').addEventListener('change', () => {
  S.srt = $('so').value;
  S.n = 0;
  Prefs.set({ srt: S.srt });
  grid();
});

addEventListener('pagehide', () => {
  if (A.ok && A.tab === 0) drsNow();
});
/* #p=id abre o produto; "voltar" (sem #p=) fecha o modal. */
addEventListener('hashchange', () => {
  if (/^#p=/.test(location.hash)) return openFromHash();
  if (!$('pm').classList.contains('hid')) {
    PM.h = 0;
    PM.z = false;
    modal('pm', 0);
  }
});

/* Header com borda após rolar + botão "voltar ao topo" após 400px (1 leitura por frame). */
let sq = 0;
const onS = () => {
  sq = 0;
  const y = scrollY;
  $('hd').classList.toggle('sc', y > 8);
  $('tt').classList.toggle('on', y > 400);
};
addEventListener('scroll', () => sq || (sq = requestAnimationFrame(onS)), { passive: true });
addEventListener('resize', debounce(() => railUI(), 150));

const pf = Prefs.get();
if (pf.theme) document.documentElement.dataset.theme = pf.theme;
tcol();
try {
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (Prefs.get().theme) return;
    document.documentElement.dataset.theme = e.matches ? 'dark' : 'light';
    tcol();
  });
} catch (e) {}
document.querySelectorAll('[data-i]').forEach((e) => (e.innerHTML = ic(e.dataset.i, +e.dataset.s || 20)));
onS();

// Failsafe: se por algum motivo o boot não terminar em 6s, libera a página.
setTimeout(() => document.documentElement.classList.remove('is-loading'), 6000);

(async () => {
  try {
    await loadFromSupabase();
    // Lista vazia: loja realmente vazia ou falha de rede? Uma consulta HEAD decide.
    if (!DB.prod.length) {
      const r = await SB.from('products').select('id', { count: 'exact', head: true });
      if (r.error) S.err = 1;
    }
  } catch (e) {
    console.error('Falha ao carregar a loja:', e);
    S.err = 1;
  }
  DB.set = { ...SET0, ...DB.set };
  DB.set.show = { ...SET0.show, ...(DB.set.show || {}) };
  S.cat = pf.cat || 'Todos';
  S.srt = ['feat', 'new', 'lo', 'hi'].includes(pf.srt) ? pf.srt : 'feat';
  $('so').value = S.srt;
  try {
    render();
  } catch (e) {
    console.error('Falha ao renderizar a loja:', e);
  } finally {
    document.documentElement.classList.remove('is-loading');
  }
  setTimeout(openFromHash, 60);
  try {
    const session = await Auth.getSession();
    if (session && session.user?.app_metadata?.role === 'admin') A.ok = true;
    await IMG.migrateLegacy();
  } catch (e) {}
})();

try {
  navigator.storage && navigator.storage.persist && navigator.storage.persist();
} catch (e) {}
