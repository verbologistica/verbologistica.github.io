// Verbo Gestão — guarda a "casca" do app para abrir rápido e sem sinal
const VERSAO = 'vg-v22';
const ARQUIVOS = ['./', 'index.html', 'app.css?v=22', 'api.js?v=22', 'app.js?v=22', 'reembolsos.js?v=22', 'adiantamentos.js?v=22', 'compras.js?v=22', 'financeiro.js?v=22', 'cadastros.js?v=22', 'parceiros.js?v=22', 'equipamentos.js?v=22', 'modelos.js?v=22', 'relatorios.js?v=22', 'rh.js?v=22', 'rh2.js?v=22', 'almox.js?v=22', 'manut.js?v=22', 'ssma.js?v=22', 'operacao.js?v=22', 'abastecimentos.js?v=22', 'dp.js?v=22', 'qualidade.js?v=22', 'migracao.js?v=22', 'logo.png', 'favicon.png', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // dados do Supabase sempre ao vivo
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSAO).then(k => k.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
