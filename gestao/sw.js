// Verbo Gestão — guarda a "casca" do app para abrir rápido e sem sinal
const VERSAO = 'vg-v148';
const ARQUIVOS = ['./', 'index.html', 'app.css?v=24', 'api.js?v=24', 'app.js?v=24', 'reembolsos.js?v=24', 'adiantamentos.js?v=24', 'compras.js?v=24', 'financeiro.js?v=24', 'cadastros.js?v=24', 'parceiros.js?v=24', 'equipamentos.js?v=24', 'modelos.js?v=24', 'relatorios.js?v=24', 'rh.js?v=24', 'rh2.js?v=24', 'almox.js?v=24', 'manut.js?v=24', 'ssma.js?v=24', 'operacao.js?v=24', 'abastecimentos.js?v=24', 'dp.js?v=24', 'qualidade.js?v=24', 'orcamento.js?v=24', 'migracao.js?v=24', 'logo.png', 'favicon.png', 'manifest.webmanifest', 'capa-base.webp'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // dados do Supabase sempre ao vivo
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => { const c = r.clone(); caches.open(VERSAO).then(k => k.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
