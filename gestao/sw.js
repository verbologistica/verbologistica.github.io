// Verbo Gestão — guarda a "casca" do app para abrir rápido e sem sinal
const VERSAO = 'vg-v19';
const ARQUIVOS = ['./', 'index.html', 'app.css?v=19', 'api.js?v=19', 'app.js?v=19', 'reembolsos.js?v=19', 'adiantamentos.js?v=19', 'compras.js?v=19', 'financeiro.js?v=19', 'cadastros.js?v=19', 'parceiros.js?v=19', 'equipamentos.js?v=19', 'modelos.js?v=19', 'rh.js?v=19', 'rh2.js?v=19', 'almox.js?v=19', 'manut.js?v=19', 'ssma.js?v=19', 'operacao.js?v=19', 'dp.js?v=19', 'qualidade.js?v=19', 'migracao.js?v=19', 'logo.png', 'favicon.png', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // dados do Supabase sempre ao vivo
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSAO).then(k => k.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
