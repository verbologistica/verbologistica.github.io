// Verbo Gestão — guarda a "casca" do app para abrir rápido e sem sinal
const VERSAO = 'vg-v16';
const ARQUIVOS = ['./', 'index.html', 'app.css?v=16', 'api.js?v=16', 'app.js?v=16', 'reembolsos.js?v=16', 'adiantamentos.js?v=16', 'compras.js?v=16', 'financeiro.js?v=16', 'cadastros.js?v=16', 'parceiros.js?v=16', 'equipamentos.js?v=16', 'modelos.js?v=16', 'rh.js?v=16', 'rh2.js?v=16', 'almox.js?v=16', 'manut.js?v=16', 'ssma.js?v=16', 'operacao.js?v=16', 'dp.js?v=16', 'qualidade.js?v=16', 'migracao.js?v=16', 'logo.png', 'favicon.png', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // dados do Supabase sempre ao vivo
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSAO).then(k => k.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
