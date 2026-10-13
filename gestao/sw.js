// Verbo Gestão — guarda a "casca" do app para abrir rápido e sem sinal
const VERSAO = 'vg-v21';
const ARQUIVOS = ['./', 'index.html', 'app.css?v=21', 'api.js?v=21', 'app.js?v=21', 'reembolsos.js?v=21', 'adiantamentos.js?v=21', 'compras.js?v=21', 'financeiro.js?v=21', 'cadastros.js?v=21', 'parceiros.js?v=21', 'equipamentos.js?v=21', 'modelos.js?v=21', 'relatorios.js?v=21', 'rh.js?v=21', 'rh2.js?v=21', 'almox.js?v=21', 'manut.js?v=21', 'ssma.js?v=21', 'operacao.js?v=21', 'dp.js?v=21', 'qualidade.js?v=21', 'migracao.js?v=21', 'logo.png', 'favicon.png', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // dados do Supabase sempre ao vivo
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSAO).then(k => k.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
