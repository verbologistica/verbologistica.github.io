// Verbo Gestão — guarda a "casca" do app para abrir rápido e sem sinal
const VERSAO = 'vg-v15';
const ARQUIVOS = ['./', 'index.html', 'app.css?v=15', 'api.js?v=15', 'app.js?v=15', 'reembolsos.js?v=15', 'adiantamentos.js?v=15', 'compras.js?v=15', 'financeiro.js?v=15', 'cadastros.js?v=15', 'parceiros.js?v=15', 'equipamentos.js?v=15', 'modelos.js?v=15', 'rh.js?v=15', 'rh2.js?v=15', 'almox.js?v=15', 'manut.js?v=15', 'ssma.js?v=15', 'operacao.js?v=15', 'dp.js?v=15', 'qualidade.js?v=15', 'migracao.js?v=15', 'logo.png', 'favicon.png', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // dados do Supabase sempre ao vivo
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSAO).then(k => k.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
