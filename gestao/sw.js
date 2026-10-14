// Verbo Gestão — guarda a "casca" do app para abrir rápido e sem sinal
const VERSAO = 'vg-v23';
const ARQUIVOS = ['./', 'index.html', 'app.css?v=23', 'api.js?v=23', 'app.js?v=23', 'reembolsos.js?v=23', 'adiantamentos.js?v=23', 'compras.js?v=23', 'financeiro.js?v=23', 'cadastros.js?v=23', 'parceiros.js?v=23', 'equipamentos.js?v=23', 'modelos.js?v=23', 'relatorios.js?v=23', 'rh.js?v=23', 'rh2.js?v=23', 'almox.js?v=23', 'manut.js?v=23', 'ssma.js?v=23', 'operacao.js?v=23', 'abastecimentos.js?v=23', 'dp.js?v=23', 'qualidade.js?v=23', 'migracao.js?v=23', 'logo.png', 'favicon.png', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // dados do Supabase sempre ao vivo
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSAO).then(k => k.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
