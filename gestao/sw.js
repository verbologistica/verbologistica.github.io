// Verbo Gestão — guarda a "casca" do app para abrir rápido e sem sinal
const VERSAO = 'vg-v18';
const ARQUIVOS = ['./', 'index.html', 'app.css?v=18', 'api.js?v=18', 'app.js?v=18', 'reembolsos.js?v=18', 'adiantamentos.js?v=18', 'compras.js?v=18', 'financeiro.js?v=18', 'cadastros.js?v=18', 'parceiros.js?v=18', 'equipamentos.js?v=18', 'modelos.js?v=18', 'rh.js?v=18', 'rh2.js?v=18', 'almox.js?v=18', 'manut.js?v=18', 'ssma.js?v=18', 'operacao.js?v=18', 'dp.js?v=18', 'qualidade.js?v=18', 'migracao.js?v=18', 'logo.png', 'favicon.png', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // dados do Supabase sempre ao vivo
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSAO).then(k => k.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
