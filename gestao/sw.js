// Verbo Gestão — guarda a "casca" do app para abrir rápido e sem sinal
const VERSAO = 'vg-v13';
const ARQUIVOS = ['./', 'index.html', 'app.css?v=13', 'api.js?v=13', 'app.js?v=13', 'reembolsos.js?v=13', 'adiantamentos.js?v=13', 'compras.js?v=13', 'financeiro.js?v=13', 'cadastros.js?v=13', 'parceiros.js?v=13', 'equipamentos.js?v=13', 'modelos.js?v=13', 'rh.js?v=13', 'rh2.js?v=13', 'migracao.js?v=13', 'logo.png', 'favicon.png', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // dados do Supabase sempre ao vivo
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSAO).then(k => k.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
