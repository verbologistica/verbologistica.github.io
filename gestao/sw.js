// Verbo Gestão — guarda a "casca" do app para abrir rápido e sem sinal
const VERSAO = 'vg-v12';
const ARQUIVOS = ['./', 'index.html', 'app.css?v=12', 'api.js?v=12', 'app.js?v=12', 'reembolsos.js?v=12', 'adiantamentos.js?v=12', 'compras.js?v=12', 'financeiro.js?v=12', 'cadastros.js?v=12', 'parceiros.js?v=12', 'equipamentos.js?v=12', 'modelos.js?v=12', 'rh.js?v=12', 'migracao.js?v=12', 'logo.png', 'favicon.png', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // dados do Supabase sempre ao vivo
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSAO).then(k => k.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
