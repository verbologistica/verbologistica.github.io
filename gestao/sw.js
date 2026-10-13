// Verbo Gestão — guarda a "casca" do app para abrir rápido e sem sinal
const VERSAO = 'vg-v17';
const ARQUIVOS = ['./', 'index.html', 'app.css?v=17', 'api.js?v=17', 'app.js?v=17', 'reembolsos.js?v=17', 'adiantamentos.js?v=17', 'compras.js?v=17', 'financeiro.js?v=17', 'cadastros.js?v=17', 'parceiros.js?v=17', 'equipamentos.js?v=17', 'modelos.js?v=17', 'rh.js?v=17', 'rh2.js?v=17', 'almox.js?v=17', 'manut.js?v=17', 'ssma.js?v=17', 'operacao.js?v=17', 'dp.js?v=17', 'qualidade.js?v=17', 'migracao.js?v=17', 'logo.png', 'favicon.png', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // dados do Supabase sempre ao vivo
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSAO).then(k => k.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
