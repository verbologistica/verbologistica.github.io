// Verbo Gestão — aplicativo (Fase 1)
'use strict';

// ===================== Utilidades =====================
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const hojeISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const dataBR = s => { if (!s) return ''; const [a, m, d] = String(s).slice(0, 10).split('-'); return `${d}/${m}/${a}`; };
const dataHoraBR = s => s ? new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
const somaDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const somaMeses = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10); };
const num = v => { if (v === '' || v == null) return null; let t = String(v).replace(/[R$\s]/g, ''); if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.'); else if (/^-?[1-9]\d{0,2}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, ''); const n = Number(t); return isNaN(n) ? null : n; };
const lista = ids => 'in.(' + ids.map(encodeURIComponent).join(',') + ')';
const nomeArquivo = n => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.-]+/g, '_').slice(-80);

// ===================== Ícones (traço único, cor do texto) =====================
const ICONES = {
  inicio: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  aprovar: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m8 12 3 3 5-6"/>',
  usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
  recibo: '<path d="M6 2.5h12v19l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
  dinheiro: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10v4M18 10v4"/>',
  mochila: '<path d="M5 10a7 7 0 0 1 14 0v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/><path d="M9 5V3h6v2"/><path d="M8.5 14h7v4h-7z"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  conversa: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z"/>',
  documento: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
  livro: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20v-3"/>',
  livro_ok: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20v-3"/><path d="m9 10 2 2 4-4"/>',
  carrinho: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.6 12.2a1 1 0 0 0 1 .8h9.7a1 1 0 0 0 1-.8L21 7H6"/>',
  grafico: '<path d="M3 21h18"/><path d="M7 17v-5M12 17V6M17 17v-8"/>',
  caixa: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
  carteira: '<path d="M19 7V5a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V6"/><circle cx="16.5" cy="13.5" r="1.2"/>',
  cartao: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
  receber: '<path d="M12 3v12m0 0-4-4m4 4 4-4"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  moedas: '<ellipse cx="9" cy="6.5" rx="6" ry="3"/><path d="M3 6.5v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/><path d="M9 14.5v2.5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5c0-1.7-2.7-3-6-3"/>',
  alerta: '<path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  tendencia: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  pizza: '<path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
  caminhao: '<path d="M2 6h11v10H2zM13 9h4l4 4v3h-8"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  monitor: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/><path d="m6 13 3-3 3 2 5-5"/>',
  rota: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h8a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h8"/>',
  prancheta: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M9 10h6M9 14h6M9 18h3"/>',
  cone: '<path d="M9.5 4h5l4 15h-13z"/><path d="M7.5 11h9M6 15.5h12M3 21h18"/>',
  doc_prazo: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h5"/><path d="M14 3v5h5v2"/><circle cx="17" cy="17" r="4"/><path d="M17 15v2l1.3 1"/>',
  combustivel: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/><path d="M3 21h12M4 10h10"/><path d="M14 8h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V8l-3-3"/>',
  chave: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
  maleta: '<rect x="2" y="8" width="20" height="12" rx="2"/><path d="M8 8V5h8v3M2 13h20M10 13v2h4v-2"/>',
  calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  calendario_ok: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/>',
  pneu: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><path d="M12 3v5.5M12 15.5V21M3 12h5.5M15.5 12H21"/>',
  checklist: '<path d="m3 6 2 2 3-3M3 13l2 2 3-3"/><path d="M11 7h10M11 14h10M11 20h10"/>',
  velocimetro: '<path d="M12 14l4-4"/><path d="M3.3 17a9 9 0 1 1 17.4 0"/><circle cx="12" cy="14" r="1.2"/>',
  queda: '<path d="m3 7 6 6 4-4 8 8"/><path d="M15 17h6v-6"/>',
  armazem: '<path d="M3 21V8l9-5 9 5v13"/><path d="M7 21v-8h10v8M7 17h10"/>',
  hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
  capacete: '<path d="M2 18h20v2.5H2z"/><path d="M4 18v-3a8 8 0 0 1 16 0v3"/><path d="M10 7V5h4v2"/>',
  etiqueta: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
  escudo_alerta: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="M12 8v5M12 16h.01"/>',
  pessoas: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2c2.2.6 3.5 2.7 3.5 5.8"/>',
  painel: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  cracha: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="11" r="2"/><path d="M5 16c.5-1.5 1.7-2.3 3-2.3s2.5.8 3 2.3M14 10h5M14 14h4"/>',
  admissao: '<circle cx="10" cy="8" r="4"/><path d="M3 21c0-4 3.1-7 7-7s7 3 7 7"/><path d="M19 7v6M16 10h6"/>',
  sair: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h8"/><path d="M10 12h11m0 0-3-3m3 3-3 3"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  balanca: '<path d="M12 3v18M7 21h10M5 7h14"/><path d="M5 7 2 14a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
  organograma: '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="2" y="16" width="6" height="5" rx="1"/><rect x="16" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M5 16v-4h14v4"/>',
  formatura: '<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5M22 9v6"/>',
  estrela: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"/>',
  medalha: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/>',
  termometro: '<path d="M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z"/>',
  busca: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  arquivo: '<rect x="2" y="4" width="20" height="5" rx="1"/><path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9M10 13h4"/>',
  calculadora: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8v4H8zM8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>',
  pasta_trabalho: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M9 7V4h6v3M2 13h20"/>',
  presente: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13"/><path d="M12 8c-2-4-6-4-6-1.5S9 8 12 8c3 0 6-.5 6-1.5S14 4 12 8z"/>',
  caderno: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 2v20M12 7h4M12 11h4"/>',
  saude: '<path d="M20.8 6.6a5 5 0 0 0-8.8-2.4 5 5 0 0 0-8.8 2.4C2.6 11 12 20 12 20s9.4-9 8.8-13.4z"/><path d="M3.5 12h4l2-3 3 6 2-3h6"/>',
  estetoscopio: '<path d="M5 3v6a5 5 0 0 0 10 0V3"/><path d="M10 14v2a5 5 0 0 0 10 0v-3"/><circle cx="20" cy="11" r="2"/>',
  alvo: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  megafone: '<path d="M3 11v3a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M17 9a4 4 0 0 1 0 6"/>',
  extintor: '<rect x="8" y="8" width="7" height="13" rx="2"/><path d="M11.5 8V5M11.5 5h4l2-2M9.5 5h2M8 12h7"/>',
  selo: '<path d="M12 2.5l2.4 1.7 2.9-.1.9 2.8 2.4 1.7-.9 2.8.9 2.8-2.4 1.7-.9 2.8-2.9-.1L12 21.5l-2.4-1.7-2.9.1-.9-2.8-2.4-1.7.9-2.8-.9-2.8 2.4-1.7.9-2.8 2.9.1z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  exclamacao: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5h.01"/>',
  ajustes: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  predio: '<rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
  lista: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  banco: '<path d="M3 21h18M5 21V10M10 21V10M14 21V10M19 21V10"/><path d="m2 10 10-6 10 6z"/>',
  grade: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  pasta: '<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
  escudo_usuario: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><circle cx="12" cy="10" r="2.5"/><path d="M8 16c.8-1.6 2.3-2.5 4-2.5s3.2.9 4 2.5"/>',
  historico: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  enviar: '<path d="M12 15V3m0 0-4 4m4-4 4 4"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  seta: '<path d="M5 12h14m0 0-5-5m5 5-5 5"/>',
  ok: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  copiar: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
  bandeira: '<path d="M5 21V4m0 0h11l-2 4 2 4H5"/>',
};
const ico = (nome, cls = '') => ICONES[nome] ? `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome]}</svg>` : '';

function aviso(msg, erro = false) {
  const el = $('#aviso');
  el.textContent = msg; el.className = 'aviso' + (erro ? ' erro' : ''); el.hidden = false;
  clearTimeout(aviso._t); aviso._t = setTimeout(() => (el.hidden = true), erro ? 6000 : 3000);
}
const falha = e => { console.error(e); aviso(e.message || String(e), true); };

function formDados(form) {
  const d = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') d[el.name] = el.checked;
    else if (el.type === 'radio') { if (el.checked) d[el.name] = el.value; }
    else if (el.type === 'file') d[el.name] = [...el.files];
    else d[el.name] = el.value.trim();
    // opção "Outro": o texto digitado vira o valor (ou vai em <campo>_outro quando a opção é um código)
    if (el.dataset.outroOk && (el.tagName === 'SELECT' ? el.selectedOptions[0]?.dataset.outro : el.checked)) {
      const txt = form.querySelector(`[data-outro-de="${CSS.escape(el.name)}"]`)?.value.trim();
      if (txt) { const op = el.selectedOptions?.[0]; if (op && op.value === op.textContent.trim()) d[el.name] = txt; else d[el.name + '_outro'] = txt; }
    }
  }
  return d;
}

// ===================== Opção "Outro" em qualquer lista: abre um campo para nomear =====================
const EH_OUTRO = /^(outro|outra|outros|outras)\b/i;
function prepararOutros(raiz = document) {
  for (const el of raiz.querySelectorAll('select:not([data-outro-ok]):not([data-sem-outro]), input[type=checkbox]:not([data-outro-ok]):not([data-sem-outro])')) {
    if (!el.name) continue;
    let op = null;
    if (el.tagName === 'SELECT') { op = [...el.options].find(o => EH_OUTRO.test(o.textContent.trim())); if (!op) continue; op.dataset.outro = '1'; }
    else if (!EH_OUTRO.test((el.closest('label')?.textContent || '').trim())) continue;
    el.dataset.outroOk = '1';
    const inp = document.createElement('input');
    const ref = 'o' + Math.random().toString(36).slice(2, 9); el.dataset.outroRef = ref; inp.dataset.outroId = ref;
    inp.className = 'campo-outro'; inp.dataset.outroDe = el.name; inp.placeholder = 'Qual? Escreva o nome'; inp.setAttribute('aria-label', 'Descreva a opção Outro');
    // valor já salvo que não está na lista: marca "Outro" e mostra o texto
    const salvo = el.dataset.valor;
    if (op && salvo && ![...el.options].some(o => o.value === salvo || o.textContent.trim() === salvo)) { op.selected = true; inp.value = salvo; }
    if (!op && el.dataset.valor) inp.value = el.dataset.valor;
    (el.closest('label.chip, label.check') || el).after(inp);
    sincOutro(el);
  }
}
function sincOutro(el) {
  const inp = (el.dataset.outroRef && document.querySelector(`[data-outro-id="${el.dataset.outroRef}"]`)) || (el.form ? el.form.querySelector(`[data-outro-de="${CSS.escape(el.name)}"]`) : el.parentElement?.querySelector(`[data-outro-de="${CSS.escape(el.name)}"]`));
  if (!inp) return;
  const on = el.tagName === 'SELECT' ? !!el.selectedOptions[0]?.dataset.outro : el.checked;
  inp.hidden = !on; inp.required = on && el.tagName === 'SELECT'; if (on && document.activeElement === el) setTimeout(() => inp.focus(), 0);
}
document.addEventListener('change', e => { if (e.target.dataset?.outroOk) sincOutro(e.target); });
let _outroPend = false;
new MutationObserver(() => { if (_outroPend) return; _outroPend = true; setTimeout(() => { _outroPend = false; prepararOutros(); }, 30); })
  .observe(document.documentElement, { childList: true, subtree: true });

async function ocupado(btn, fn) {
  if (btn) { btn.disabled = true; btn.dataset.t = btn.textContent; btn.textContent = 'Aguarde…'; }
  try { return await fn(); }
  finally { if (btn) { btn.disabled = false; btn.textContent = btn.dataset.t; } }
}

// Modal genérico: devolve uma Promise com os dados do formulário (ou null se cancelar)
function modal(html, { aoAbrir, validar } = {}) {
  // se já há uma janela aberta (ex.: cadastrar cargo novo de dentro de um formulário), abre outra por cima sem perder a de baixo
  const base = $('#modal'), empilhada = !base.hidden && !!base.innerHTML;
  const fundo = empilhada ? Object.assign(document.createElement('div'), { className: 'modal-fundo' }) : base;
  if (empilhada) { fundo.style.zIndex = 60 + $$('.modal-fundo').length; document.body.append(fundo); }
  fundo.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  fundo.hidden = false;
  return new Promise(resolve => {
    const fechar = v => { if (empilhada) fundo.remove(); else { fundo.hidden = true; fundo.innerHTML = ''; } resolve(v); };
    // só fecha se o clique COMEÇOU e TERMINOU no fundo escuro (selecionar texto e soltar fora não fecha mais)
    let desceuNoFundo = false;
    fundo.onmousedown = e => { desceuNoFundo = e.target === fundo; };
    fundo.ontouchstart = e => { desceuNoFundo = e.target === fundo; };
    fundo.onclick = e => {
      const sel = window.getSelection && String(window.getSelection() || '');
      if (desceuNoFundo && e.target === fundo && !sel) fechar(null);
      desceuNoFundo = false;
    };
    $$('[data-fechar]', fundo).forEach(b => (b.onclick = () => fechar(null)));
    const form = $('form', fundo);
    if (form) form.onsubmit = e => {
      e.preventDefault();
      const dados = { ...formDados(form), _acao: e.submitter?.value };
      const erro = validar?.(dados);
      if (erro) { aviso(erro, true); return; }
      fechar(dados);
    };
    if (aoAbrir) aoAbrir(fundo, fechar);
    setTimeout(() => $('input:not([type=hidden]),select,textarea', fundo)?.focus(), 50);
  });
}

async function confirmar(texto, { comMotivo = false, botao = 'Confirmar' } = {}) {
  const r = await modal(`<form><h2>${esc(texto)}</h2>
    ${comMotivo ? '<label class="campo">Motivo<textarea name="motivo" required></textarea></label>' : ''}
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">${esc(botao)}</button></div></form>`);
  return r ? (comMotivo ? r.motivo : true) : null;
}

// Observações com pendência "⚠️ VERIFICAR" (contas e reembolsos)
const temVerificar = o => (o || '').includes('VERIFICAR');
function blocoObservacao(o, podeEditar) {
  if (!o && !podeEditar) return '';
  return `<div class="largo ${temVerificar(o) ? 'alerta-obs' : ''}"><div class="${temVerificar(o) ? '' : 'muted'}"><b>Observações</b></div>
    <div style="white-space:pre-line">${o ? esc(o) : '<span class="muted">—</span>'}</div>
    ${podeEditar ? `<div class="acoes" style="margin-top:8px">${temVerificar(o) ? '<button type="button" class="btn ok peq" id="obs-ok">Marcar como verificado</button>' : ''}
      <button type="button" class="btn peq" id="obs-editar">${o ? 'Editar observação' : 'Incluir observação'}</button></div>` : ''}</div>`;
}
function ligarObservacao(tabela, id, atual) {
  $('#obs-editar')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Observação</h2><label class="campo">Texto<textarea name="obs" rows="5">${esc(atual || '')}</textarea></label>
      <p class="muted">Para deixar como pendência, comece com “⚠️ VERIFICAR:”.</p>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`);
    if (!r) return;
    try { await api.alterar(tabela, `id=eq.${id}`, { observacoes: r.obs || null }); aviso('Observação salva.'); navegar(); } catch (err) { falha(err); }
  });
  $('#obs-ok')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Marcar como verificado</h2><label class="campo">O que foi confirmado?<textarea name="txt" rows="4" required placeholder="Ex.: confirmado com o posto, o valor já inclui o abastecimento"></textarea></label>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn ok">Confirmar</button></div></form>`);
    if (!r) return;
    const antes = (atual || '').replace(/⚠️\s*VERIFICAR:?/g, 'Pendência:');
    const nova = `✔ Verificado em ${dataBR(hojeISO())} por ${estado.usuario.nome}: ${r.txt}\n(${antes})`;
    try { await api.alterar(tabela, `id=eq.${id}`, { observacoes: nova }); aviso('Marcado como verificado.'); navegar(); } catch (err) { falha(err); }
  });
}

// Reduz fotos grandes antes de enviar (celular)
async function prepararArquivo(f) {
  if (!f.type.startsWith('image/') || f.size < 600 * 1024) return f;
  try {
    const img = await createImageBitmap(f);
    const esc_ = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * esc_); c.height = Math.round(img.height * esc_);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.82));
    return new File([blob], f.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch { return f; }
}

async function anexar(entidade, id, arquivos, descricao = null) {
  for (const original of arquivos || []) {
    const f = await prepararArquivo(original);
    const caminho = `${entidade}/${id}/${Date.now()}-${nomeArquivo(f.name)}`;
    await api.enviarArquivo(caminho, f);
    await api.inserir('anexos', { entidade, entidade_id: id, caminho_arquivo: caminho, nome_original: original.name,
                                  tipo_mime: f.type || 'application/octet-stream', tamanho_bytes: f.size, enviado_por: estado.usuario.id, descricao });
  }
}

// link (Drive, SharePoint, site…) guardado como anexo
async function anexarLinks(entidade, id, texto, descricao = null) {
  const urls = String(texto || '').split(/\s+/).map(u => u.trim()).filter(Boolean).map(u => /^https?:\/\//i.test(u) ? u : 'https://' + u);
  if (urls.length) await api.inserir('anexos', urls.map(u => ({ entidade, entidade_id: id, caminho_arquivo: u, nome_original: u.replace(/^https?:\/\//i, '').slice(0, 120),
    tipo_mime: 'text/uri-list', enviado_por: estado.usuario.id, descricao })));
  return urls.length;
}
const camposAnexoHtml = (nArq = 'arquivos', nLink = 'links') => `<label class="campo largo">Anexos (qualquer formato)<input type="file" name="${nArq}" multiple></label>
  <label class="campo largo">Links<input name="${nLink}" placeholder="Cole um ou mais links (Drive, SharePoint, site…), separados por espaço"></label>`;
async function salvarAnexosForm(entidade, id, d, nArq = 'arquivos', nLink = 'links') {
  if (d[nArq]?.length) await anexar(entidade, id, d[nArq]);
  if (d[nLink]) await anexarLinks(entidade, id, d[nLink]);
}
async function htmlAnexos(entidade, id) {
  const a = await api.listar('anexos', `entidade=eq.${entidade}&entidade_id=eq.${id}&cancelado_em=is.null&order=enviado_em`);
  if (!a.length) return '<span class="muted">Sem anexos</span>';
  return '<div class="anexos">' + a.map(x =>
    `<span class="anexo" data-arquivo="${esc(x.caminho_arquivo)}" title="${esc(x.descricao || x.caminho_arquivo)}">${/^https?:/.test(x.caminho_arquivo) ? '🔗' : x.tipo_mime?.includes('pdf') ? '📄' : x.tipo_mime?.startsWith('image/') ? '🖼️' : /sheet|excel|csv/.test(x.tipo_mime || '') ? '📊' : /presentation|powerpoint/.test(x.tipo_mime || '') ? '📽️' : '📎'} ${x.descricao ? `<b>${esc(x.descricao)}:</b> ` : ''}${esc(x.nome_original || 'arquivo')}</span>`).join('') + '</div>';
}

document.addEventListener('click', async e => {
  const a = e.target.closest('[data-arquivo]');
  if (!a) return;
  if (/^https?:\/\//i.test(a.dataset.arquivo)) { window.open(a.dataset.arquivo, '_blank', 'noopener'); return; }
  const janela = window.open('', '_blank');
  try { janela.location = await api.linkArquivo(a.dataset.arquivo); }
  catch (err) { janela?.close(); falha(err); }
});

// ===================== Estado e cadastros em memória =====================
const estado = { usuario: null, perfis: [], cache: {} };
const tem = (...p) => p.some(x => estado.perfis.includes(x));
const veTudo = () => tem('administrador', 'diretoria', 'financeiro');
const editaFin = () => tem('administrador', 'financeiro');

async function cad(tabela, consulta, forcar = false) {
  if (!forcar && estado.cache[tabela]) return estado.cache[tabela];
  estado.cache[tabela] = await api.listar(tabela, consulta);
  return estado.cache[tabela];
}
const contas = f => cad('plano_contas', 'select=id,codigo,nome,tipo,aceita_lancamento,ativo&order=codigo', f);
const centros = f => cad('centros_custo', 'select=id,codigo,nome,ativo&order=nome', f);
const usuarios = f => cad('usuarios', 'select=id,nome,email,ativo,centro_custo_id&order=nome', f);
// fornecedor com CNPJ, para distinguir lojas/franquias de mesma razão social
const rotForn = f => f ? [f.razao_social + (f.nome_fantasia && f.nome_fantasia !== f.razao_social ? ` (${f.nome_fantasia})` : ''), f.documento ? fmtDoc(f.documento) : ''].filter(Boolean).join(' · ') : '—';
const fornecedores = f => cad('fornecedores', 'select=id,razao_social,nome_fantasia,documento,ativo,boleto,prazo_faturamento_dias,conta_padrao_id,cobranca&order=razao_social', f);
const bancos = f => cad('contas_bancarias', 'select=id,nome,tipo,ativo&order=nome', f);
const veiculos = f => cad('veiculos', 'select=id,placa,modelo,ativo&order=placa', f);
const porId = arr => Object.fromEntries(arr.map(x => [x.id, x]));
// sou aprovador deste item (direto ou por aprovação conjunta)
const aprovoComo = id => !!id && (id === estado.usuario?.id || id === estado.usuario?.aprova_junto_de);
// sou um dos aprovadores do item (regra por valor: lista de supervisores, coordenadores, gestores ou validação)
const souAprovadorDe = a => !!a && (aprovoComo(a.aprovador_id) || (a.aprovadores || []).some(aprovoComo) || (!!a.perfil_aprovador && tem(a.perfil_aprovador)));
const REGRA_AP = { supervisor: 'supervisor do setor', coordenador: 'coordenador do setor', gestor: 'gestor', 'gestor+validacao': 'gestor, depois validação', validacao: 'validação acima do limite do gestor' };
const aguardandoTxt = (a, nomes) => { const l = a.aprovadores?.length ? a.aprovadores : a.aprovador_id ? [a.aprovador_id] : [];
  return (l.length ? l.map(i => nomes[i]?.nome || '—').join(' ou ') : 'perfil ' + (a.perfil_aprovador || '—')) + (REGRA_AP[a.regra] ? ` (${REGRA_AP[a.regra]})` : ''); };

const opcoes = (arr, valor, rotulo, sel, vazio = '') =>
  (vazio !== null ? `<option value="">${esc(vazio)}</option>` : '') +
  arr.map(x => `<option value="${esc(x.id)}" ${x.id === sel ? 'selected' : ''}>${esc(rotulo(x))}</option>`).join('');

async function opcoesContas(sel, tipos) {
  const cs = (await contas()).filter(c => c.ativo && (!tipos || tipos.includes(c.tipo)));
  let html = '<option value="">Selecione…</option>', grupo = '';
  for (const c of cs) {
    if (!c.aceita_lancamento) { if (grupo) html += '</optgroup>'; html += `<optgroup label="${esc(c.codigo + ' ' + c.nome)}">`; grupo = c.codigo; continue; }
    html += `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.codigo + ' ' + c.nome)}</option>`;
  }
  return html + (grupo ? '</optgroup>' : '');
}

// ===================== Status =====================
const STATUS = {
  rascunho: ['Rascunho', ''], aguardando_aprovacao: ['Aguardando aprovação', 'amarelo'], aprovado: ['Aprovado', 'azul'],
  aprovada: ['Aprovada', 'azul'], em_pagamento: ['Em pagamento', 'azul'], pago: ['Pago', 'verde'], paga: ['Paga', 'verde'],
  devolvido: ['Devolvido p/ correção', 'vermelho'], devolvida: ['Devolvida', 'vermelho'], reprovado: ['Reprovado', 'vermelho'],
  reprovada: ['Reprovada', 'vermelho'], cancelado: ['Cancelado', ''], cancelada: ['Cancelada', ''], aberto: ['Aberto', 'amarelo'],
  aberta: ['Aberta', 'amarelo'], previsto: ['Previsto', ''], prevista: ['Prevista', ''], parcialmente_pago: ['Pago em parte', 'azul'],
  pendente: ['Pendente', 'amarelo'],
};
const tag = (s, vencida) => vencida ? '<span class="tag vermelho">Vencida</span>'
  : `<span class="tag ${STATUS[s]?.[1] || ''}">${esc(STATUS[s]?.[0] || s)}</span>`;


// Frase do dia (segurança e produção) — muda todo dia, igual para todos
const FRASES_DIA = [
  ['Um grama de prevenção vale mais que um quilo de cura.', 'Benjamin Franklin', 'Pennsylvania Gazette, 1735'],
  ['Não podemos mudar a condição humana, mas podemos mudar as condições em que as pessoas trabalham.', 'James Reason', 'Human error: models and management, BMJ, 2000'],
  ['Pretendo fazer desta a empresa mais segura do país. Pretendo chegar a zero acidentes.', 'Paul O’Neill', 'ao assumir a presidência da Alcoa, 1987'],
  ['O que você não tem não pode vazar.', 'Trevor Kletz', 'pioneiro da segurança de processos, 1978'],
  ['Elimine o medo, para que todos possam trabalhar com eficácia pela empresa.', 'W. Edwards Deming', 'Out of the Crisis, 1982'],
  ['Melhore constantemente e para sempre o sistema de produção e de serviços.', 'W. Edwards Deming', 'Out of the Crisis, 1982'],
  ['Um sistema ruim vence uma boa pessoa todas as vezes.', 'W. Edwards Deming', ''],
  ['Eficiência é fazer as coisas direito; eficácia é fazer as coisas certas.', 'Peter Drucker', 'O Gerente Eficaz, 1966'],
  ['Não há nada tão inútil quanto fazer com grande eficiência aquilo que não deveria ser feito.', 'Peter Drucker', 'Harvard Business Review, 1963'],
  ['Os custos não existem para ser calculados. Os custos existem para ser reduzidos.', 'Taiichi Ohno', 'O Sistema Toyota de Produção, 1978'],
  ['Onde não há padrão, não pode haver melhoria.', 'Taiichi Ohno', 'criador do Sistema Toyota de Produção'],
  ['A qualidade começa e termina com educação.', 'Kaoru Ishikawa', ''],
  ['Somos aquilo que fazemos repetidamente. A excelência, portanto, não é um ato, mas um hábito.', 'Will Durant', 'A História da Filosofia, 1926'],
  ['A perfeição é alcançada não quando não há mais nada a acrescentar, mas quando não há mais nada a retirar.', 'Antoine de Saint-Exupéry', 'Terra dos Homens, 1939'],
  ['O fracasso é apenas a oportunidade de começar de novo, desta vez de forma mais inteligente.', 'Henry Ford', 'Minha Vida e Minha Obra, 1922'],
  ['Uma jornada de mil léguas começa com um único passo.', 'Lao-Tsé', 'Tao Te Ching, cap. 64'],
  ['Enquanto adiamos, a vida passa.', 'Sêneca', 'Cartas a Lucílio, I'],
  ['O tempo perdido nunca é encontrado novamente.', 'Benjamin Franklin', 'Almanaque do Pobre Ricardo, 1748'],
  ['Gênio é um por cento inspiração e noventa e nove por cento transpiração.', 'Thomas Edison', ''],
];
function fraseDoDia() { const d = new Date(), i = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 864e5); return FRASES_DIA[(i + d.getFullYear()) % FRASES_DIA.length]; }

// ===================== Roteamento e casca =====================
const ROTAS = {};
const rota = (padrao, fn) => (ROTAS[padrao] = fn);

// Catálogo de telas do menu: [rótulo, rota, perfis que podem ver (null = todos), ícone, pendência, subitem]
const P_FIN = ['administrador', 'diretoria', 'financeiro'];
const P_RH = ['administrador', 'rh', 'dp', 'diretoria'];
const P_ALM = ['administrador', 'almoxarifado', 'diretoria', 'comprador', 'manutencao'];
const P_MAN = ['administrador', 'manutencao', 'operacao', 'diretoria'];
const P_OP = ['administrador', 'operacao', 'diretoria'];
const P_SSMA = ['administrador', 'ssma', 'rh', 'dp', 'diretoria'];
// Setores agrupados pelo fluxo da empresa (títulos no menu)
const MENU_MACRO = { 'Operação': 'Operação', 'Controle Operacional': 'Operação', 'Manutenção': 'Operação', 'Almoxarifado e Patrimônio': 'Operação',
  'Compras': 'Suprimentos e finanças', 'Orçamento e Contratos': 'Suprimentos e finanças', 'Financeiro': 'Suprimentos e finanças',
  'RH': 'Pessoas e segurança', 'Departamento Pessoal': 'Pessoas e segurança', 'SSMA': 'Pessoas e segurança',
  'Qualidade': 'Gestão', 'Administrativo / Recepção': 'Gestão', 'Configurações': 'Sistema' };
const MENU = [
  // [nome, rota, perfis (null = todos), ícone, pendência, sub-item]  ·  ['grupo', nome, ícone]  ·  ['sub', título da seção]
  ['Início', '#/inicio', null, 'inicio'],
  ['Aprovações', '#/aprovacoes', null, 'aprovar', 'aprovar'],
  ['Planos de ação', '#/planos', null, 'bandeira', 'acoes_pendentes'],
  ['grupo', 'Meu espaço', 'usuario'],
  ['Meus reembolsos', '#/reembolsos', null, 'recibo', 'devolvidos', true],
  ['Meus adiantamentos', '#/adiantamentos', null, 'dinheiro', null, true],
  ['Meus itens', '#/meus-itens', null, 'mochila', null, true],
  ['Minha jornada', '#/operacao/jornada', [...P_OP, 'motorista'], 'relogio', null, true],
  ['Pesquisa de clima', '#/clima', null, 'conversa', 'pesquisa_aberta', true],
  ['Registrar não conformidade', '#/qualidade/nc/nova', null, 'documento', null, true],
  ['Chamados', '#/chamados', null, 'conversa', 'chamados_abertos', true],
  ['grupo', 'Biblioteca', 'livro'],
  ['Modelos de documentos', '#/modelos', null, 'documento', null, true],
  ['Apresentações', '#/apresentacoes', null, 'monitor', null, true],
  ['Documentos da qualidade', '#/qualidade/documentos', null, 'livro_ok', 'qual_docs_ler', true],
  ['grupo', 'Operação', 'caminhao'],
  ['Viagens', '#/operacao/viagens', [...P_OP, 'financeiro', 'manutencao'], 'rota', 'viagens_em_transito', true],
  ['Controle de jornada', '#/operacao/jornadas', [...P_OP, 'rh', 'dp'], 'prancheta', 'jornada_alertas', true],
  ['Ocorrências e multas', '#/operacao/ocorrencias', [...P_OP, 'rh', 'dp', 'financeiro'], 'cone', 'multas_indicar', true],
  ['grupo', 'Controle Operacional', 'monitor'],
  ['Painel do CCO', '#/operacao', [...P_OP, 'manutencao'], 'monitor', 'viagens_atrasadas', true],
  ['Abastecimentos', '#/operacao/abastecimentos', [...P_OP, 'financeiro', 'comprador', 'manutencao'], 'combustivel', 'abast_alertas', true],
  ['Equipamentos', '#/cadastros/equipamentos', [...P_FIN, 'operacao', 'manutencao'], 'caminhao', null, true],
  ['Atrelamentos cavalo × carreta', '#/frota/atrelamentos', [...P_FIN, 'operacao', 'manutencao'], 'rota', null, true],
  ['Controle de vencimentos', '#/frota/documentos', [...P_FIN, 'operacao', 'manutencao'], 'doc_prazo', 'docs_vencendo', true],
  ['Fechamentos do CCO', '#/fechamentos?setor=cco', ['administrador', 'fch:cco'], 'calendario_ok', 'fch_cco', true],
  ['grupo', 'Manutenção', 'chave'],
  ['Painel da manutenção', '#/manut', P_MAN, 'painel', 'manut_preventivas_vencidas', true],
  ['Ordens de serviço', '#/manut/os', [...P_MAN, 'almoxarifado', 'financeiro'], 'maleta', 'manut_os_abertas', true],
  ['Planos preventivos', '#/manut/preventivas', P_MAN, 'calendario_ok', 'manut_preventivas_proximas', true],
  ['Pneus', '#/manut/pneus', P_MAN, 'pneu', 'pneus_sulco_baixo', true],
  ['Checklist do veículo', '#/manut/checklist', [...P_MAN, 'motorista'], 'checklist', null, true],
  ['Km / horímetro', '#/manut/hodometro', [...P_MAN, 'motorista'], 'velocimetro', null, true],
  ['Custos da frota', '#/manut/custos', [...P_MAN, 'financeiro'], 'queda', null, true],
  ['Fechamentos da manutenção', '#/fechamentos?setor=manutencao', ['administrador', 'fch:manutencao'], 'calendario_ok', 'fch_manutencao', true],
  ['grupo', 'Almoxarifado e Patrimônio', 'armazem'],
  ['sub', 'Almoxarifado'],
  ['Painel do almoxarifado', '#/almox', P_ALM, 'painel', null, true],
  ['Itens e estoque', '#/almox/itens', P_ALM, 'caixa', 'almox_abaixo_minimo', true],
  ['Requisições de material', '#/almox/requisicoes', null, 'prancheta', 'almox_requisicoes_abertas', true],
  ['Compras a receber', '#/compras/pedidos?status=a_receber', ['administrador', 'almoxarifado'], 'caminhao', 'pedidos_a_receber_almox', true],
  ['Entrada de material', '#/almox/entrada', ['administrador', 'almoxarifado'], 'receber', null, true],
  ['Inventário', '#/almox/inventario', ['administrador', 'almoxarifado'], 'hash', null, true],
  ['EPI e uniformes', '#/almox/epi', [...P_ALM, 'rh', 'dp', 'ssma'], 'capacete', 'epi_troca', true],
  ['sub', 'Patrimônio'],
  ['Patrimônio', '#/patrimonio', [...P_ALM, 'rh', 'financeiro'], 'etiqueta', 'patrimonio_sem_termo', true],
  ['Avarias e responsabilização', '#/patrimonio/avarias', ['administrador', 'almoxarifado', 'rh', 'dp', 'diretoria'], 'escudo_alerta', 'patrimonio_avarias', true],
  ['grupo', 'Compras', 'carrinho'],
  ['Painel de compras', '#/compras/painel', [...P_FIN, 'comprador', 'aprovador'], 'painel', null, true],
  ['Requisições', '#/compras/requisicoes', null, 'carrinho', null, true],
  ['Cotações', '#/compras/cotacoes', [...P_FIN, 'comprador', 'aprovador'], 'grafico', 'requisicoes_a_cotar', true],
  ['Pedidos', '#/compras/pedidos', null, 'caixa', 'pedidos_sem_documento', true],
  ['Fechamentos para conferir', '#/fechamentos?etapa=em_compras', ['administrador', 'comprador'], 'checklist', 'fch_compras', true],
  ['Contratos de fornecedores', '#/fechamentos/contratos?setor=todos', ['administrador', 'comprador', 'diretoria', 'financeiro'], 'documento', null, true],
  ['grupo', 'Orçamento e Contratos', 'pizza'],
  ['Orçado × Realizado', '#/orcamento', ['administrador', 'diretoria', 'financeiro', 'aprovador'], 'tendencia', 'orcamento_alerta', true],
  ['grupo', 'Financeiro', 'carteira'],
  ['Painel do financeiro', '#/financeiro/painel', P_FIN, 'painel', null, true],
  ['Contas a pagar', '#/financeiro/pagar', [...P_FIN, 'comprador'], 'cartao', 'sem_comprovante', true],
  ['Contas a receber', '#/financeiro/receber', P_FIN, 'receber', null, true],
  ['Reembolsos', '#/financeiro/reembolsos', [...P_FIN, 'aprovador'], 'recibo', 'reembolsos_a_pagar', true],
  ['Adiantamentos', '#/financeiro/adiantamentos', P_FIN, 'dinheiro', 'prestacao_vencida', true],
  ['Fundo Fixo', '#/financeiro/fundo', P_FIN, 'moedas', null, true],
  ['A verificar', '#/financeiro/verificar', P_FIN, 'alerta', 'a_verificar', true],
  ['Projeção financeira', '#/financeiro/projecao', [...P_FIN, 'aprovador'], 'tendencia', null, true],
  ['grupo', 'RH', 'pessoas'],
  ['sub', 'Pessoas'],
  ['Painel do RH', '#/rh', P_RH, 'painel', null, true],
  ['Colaboradores', '#/rh/colaboradores', P_RH, 'pessoas', null, true],
  ['Admissões', '#/rh/admissoes', [...P_RH, 'ssma', 'almoxarifado', 'operacao', 'manutencao', 'qualidade'], 'admissao', 'admissao_etapas', true],
  ['Documentos dos colaboradores', '#/rh/documentos', P_RH, 'cracha', 'rh_docs_vencendo', true],
  ['Crachás', '#/rh/crachas', P_RH, 'cracha', null, true],
  ['Férias', '#/rh/ferias', P_RH, 'sol', 'ferias_vencendo', true],
  ['Ocorrências disciplinares', '#/rh/disciplinar', P_RH, 'balanca', null, true],
  ['Contratos de experiência', '#/rh/experiencia', [...P_RH, 'aprovador', 'diretoria'], 'calendario_ok', 'experiencia_decidir', true],
  ['Desligamentos', '#/rh/desligamentos', [...P_RH, 'ssma', 'almoxarifado', 'financeiro'], 'sair', 'desligamento_etapas', true],
  ['Organograma', '#/rh/organograma', P_RH, 'organograma', null, true],
  ['sub', 'Desenvolvimento'],
  ['Treinamentos', '#/rh/treinamentos', P_RH, 'formatura', 'treinamentos_pendentes', true],
  ['Avaliações', '#/rh/avaliacoes', [...P_RH, 'aprovador'], 'estrela', null, true],
  ['Promoções e cursos', '#/rh/desenvolvimento', P_RH, 'medalha', null, true],
  ['Pesquisas de clima', '#/rh/clima', P_RH, 'termometro', null, true],
  ['sub', 'Recrutamento'],
  ['Vagas e seleção', '#/rh/vagas', [...P_RH, 'aprovador'], 'busca', 'vagas_aprovar', true],
  ['Entrevistas', '#/rh/entrevistas', [...P_RH, 'aprovador', 'solicitante', 'operacao', 'manutencao', 'almoxarifado', 'ssma', 'qualidade', 'financeiro', 'comprador'], 'conversa', 'entrevistas_avaliar', true],
  ['Banco de talentos', '#/rh/talentos', P_RH, 'arquivo', null, true],
  ['grupo', 'Departamento Pessoal', 'calculadora'],
  ['Painel do DP', '#/dp', ['administrador', 'dp', 'diretoria'], 'painel', 'dp_a_importar', true],
  ['Descontos de multas', '#/dp/multas', ['administrador', 'dp', 'rh', 'diretoria'], 'cone', null, true],
  ['Folha do mês', '#/dp/folha', ['administrador', 'dp', 'rh', 'diretoria'], 'pasta_trabalho', 'dp_lancamentos_pendentes', true],
  ['Benefícios', '#/dp/beneficios', ['administrador', 'dp', 'rh'], 'presente', null, true],
  ['Rubricas da folha', '#/dp/rubricas', ['administrador', 'dp'], 'caderno', null, true],
  ['Fechamentos do DP', '#/fechamentos?setor=dp', ['administrador', 'fch:dp'], 'calendario_ok', 'fch_dp', true],
  ['grupo', 'SSMA', 'capacete'],
  ['Painel do SSMA', '#/ssma', P_SSMA, 'painel', 'cat_pendente', true],
  ['Liberação de motoristas', '#/ssma/integracoes', [...P_SSMA, 'operacao'], 'cracha', null, true],
  ['Desvios', '#/ssma/desvios', [...P_SSMA, 'operacao', 'manutencao'], 'escudo_alerta', null, true],
  ['Documentos e vencimentos', '#/ssma/documentos', P_SSMA, 'documento', null, true],
  ['Regras e metas', '#/ssma/parametros', P_SSMA, 'ajustes', null, true],
  ['Acidentes e CAT', '#/ssma/acidentes', [...P_SSMA, 'operacao', 'manutencao'], 'saude', 'acidentes_abertos', true],
  ['ASO e exames', '#/ssma/aso', P_SSMA, 'estetoscopio', 'aso_vencendo', true],
  ['Inspeções', '#/ssma/inspecoes', [...P_SSMA, 'operacao', 'manutencao'], 'busca', null, true],
  ['DDS', '#/ssma/dds', [...P_SSMA, 'operacao', 'manutencao'], 'megafone', null, true],
  ['Extintores', '#/ssma/extintores', [...P_SSMA, 'operacao', 'manutencao'], 'extintor', 'extintores_vencendo', true],
  ['Fechamentos do SSMA', '#/fechamentos?setor=ssma', ['administrador', 'fch:ssma'], 'calendario_ok', 'fch_ssma', true],
  ['grupo', 'Qualidade', 'selo'],
  ['Painel da qualidade', '#/qualidade', ['administrador', 'qualidade', 'diretoria'], 'painel', 'qual_auditorias_proximas', true],
  ['Não conformidades', '#/qualidade/nc', ['administrador', 'qualidade', 'diretoria'], 'exclamacao', 'qual_nc_abertas', true],
  ['Auditorias', '#/qualidade/auditorias', ['administrador', 'qualidade', 'diretoria'], 'busca', null, true],
  ['Indicadores', '#/qualidade/indicadores', ['administrador', 'qualidade', 'diretoria'], 'grafico', null, true],
  ['grupo', 'Administrativo / Recepção', 'predio'],
  ['Fechamentos do administrativo', '#/fechamentos?setor=administrativo', ['administrador', 'fch:administrativo'], 'calendario_ok', 'fch_administrativo', true],
  ['Contratos e contas de consumo', '#/fechamentos/contratos?setor=administrativo', ['administrador', 'fch:administrativo'], 'documento', null, true],
  ['grupo', 'Configurações', 'ajustes'],
  ['sub', 'Cadastros'],
  ['Fornecedores', '#/cadastros/fornecedores', [...P_FIN, 'comprador'], 'predio', null, true],
  ['Clientes', '#/cadastros/clientes', [...P_FIN, 'operacao'], 'pasta_trabalho', null, true],
  ['Plano de contas', '#/cadastros/plano_contas', P_FIN, 'lista', null, true],
  ['Centros de custo', '#/cadastros/centros_custo', P_FIN, 'alvo', null, true],
  ['Bancos e caixa', '#/cadastros/contas_bancarias', P_FIN, 'banco', null, true],
  ['Setores', '#/cadastros/setores', ['administrador', 'rh'], 'grade', null, true],
  ['Cargos e funções', '#/cadastros/cargos', P_RH, 'etiqueta', null, true],
  ['Tipos de documento do RH', '#/cadastros/rh_tipos_documento', ['administrador', 'rh'], 'pasta', null, true],
  ['sub', 'Sistema'],
  ['Feriados', '#/cadastros/feriados', [...P_RH, 'ssma', 'operacao', 'manutencao', 'almoxarifado', 'financeiro', 'qualidade', 'comprador', 'aprovador'], 'calendario', null, true],
  ['Dados da empresa', '#/cadastros/empresa', ['administrador'], 'predio', null, true],
  ['Usuários e perfis', '#/config/usuarios', ['administrador'], 'escudo_usuario', null, true],
  ['Regras de aprovação', '#/config/aprovacoes', ['administrador', 'diretoria'], 'aprovar', null, true],
  ['Auditoria', '#/config/auditoria', P_FIN, 'historico', null, true],
  ['Calendário do CRLV', '#/config/calendario_crlv', ['administrador'], 'calendario', 'calendario_crlv', true],
  ['Importar sistema anterior', '#/config/importar', ['administrador'], 'enviar', null, true],
];
// Telas permitidas: sem lista no cadastro, valem as telas dos perfis; com lista (acesso personalizado), valem exatamente
// as telas marcadas no cadastro do usuário, sem filtro automático pelo perfil. Administrador vê tudo.
function menuPara(perfis, menus) {
  const admin = perfis.includes('administrador');
  const lista = !admin && Array.isArray(menus) && menus.length ? menus : null;
  const SEMPRE = ['#/inicio'];   // a tela inicial aparece para todos
  const fch = i => Array.isArray(i[2]) && i[2].some(p => p.startsWith('fch:') && perfis.includes(p));   // responsável pelo fechamento do setor
  const ok = MENU.filter(i => i[0] === 'grupo' || i[0] === 'sub' || SEMPRE.includes(i[1]) || (lista ? lista.includes(i[1]) : (fch(i) || !i[2] || i[2].some(p => perfis.includes(p)))));
  const semSub = ok.filter((i, k) => i[0] !== 'sub' || (ok[k + 1] && !['sub', 'grupo'].includes(ok[k + 1][0])));
  return semSub.filter((i, k) => i[0] !== 'grupo' || (semSub[k + 1] && semSub[k + 1][0] !== 'grupo'));
}
function menu() {
  return menuPara([...estado.perfis, ...(estado.fch || []).map(c => 'fch:' + c)], estado.usuario?.menus).map(i => i[0] === 'grupo' ? ['grupo', i[1], true, i[2]] : i[0] === 'sub' ? ['sub', i[1]] : [i[0], i[1], true, i[3], i[4], i[5]]);
}
// Guias (abas) das telas: no acesso personalizado, o cadastro pode liberar só algumas ("#/tela::guia")
const GUIAS = {
  '#/rh/colaboradores': { rota: '#/rh/colaboradores/ver/', param: 'aba', itens: [['dados', 'Dados'], ['docs', 'Documentos'], ['deps', 'Dependentes'], ['admissao', 'Admissão'], ['ferias', 'Férias'], ['treinamentos', 'Treinamentos'],
    ['avaliacoes', 'Avaliações'], ['disciplinar', 'Disciplinar'], ['patrimonio', 'Patrimônio e EPI'], ['ssma', 'Saúde e segurança'], ['desligamento', 'Desligamento'], ['gerados', 'Documentos gerados']] },
  '#/rh/admissoes': { rota: '#/rh/admissoes', param: 'aba', itens: [['processos', 'Processos'], ['agenda', 'Agenda de treinamentos'], ['indicadores', 'Indicadores']] },
  '#/planos': { rota: '#/planos', param: 'ver', itens: [['minhas', 'No meu nome'], ['criadas', 'Que eu abri'], ['planos', 'Reuniões, auditorias e outros'], ['todas', 'Todas as ações']] },
  '#/financeiro/pagar': { rota: '#/financeiro/pagar', param: 'aba', itens: [['variaveis', 'Despesas variáveis'], ['fixas', 'Contas fixas mensais'], ['todas', 'Todas']] },
  '#/rh/treinamentos': { rota: '#/rh/treinamentos', param: 'aba', itens: [['matriz', 'Matriz de capacitação'], ['turmas', 'Turmas realizadas'], ['catalogo', 'Catálogo e obrigatoriedade']] },
  '#/rh/ferias': { rota: '#/rh/ferias', param: 'aba', itens: [['saldos', 'Saldos a programar'], ['programacao', 'Programação'], ['todos', 'Todos os períodos']] },
  '#/ssma/documentos': { rota: '#/ssma/documentos', param: 'aba', itens: [['vencimentos', 'Painel preditivo de vencimentos'], ['corporativos', 'Documentos corporativos']] },
  '#/operacao/abastecimentos': { rota: '#/operacao/abastecimentos', param: 'aba', itens: [['lancamentos', 'Lançamentos'], ['painel', 'Consumo e custos'], ['faturas', 'Faturas dos postos'], ['app', 'App dos motoristas']] },
};
function guiasLiberadas(menuHref) {
  const l = estado.usuario?.menus;
  if (estado.perfis?.includes('administrador') || !Array.isArray(l) || !l.length) return null;
  const g = l.filter(x => x.startsWith(menuHref + '::')).map(x => x.slice(menuHref.length + 2));
  return g.length ? g.filter(x => x !== '-') : null;   // nenhuma marcação = todas as guias
}
// esconde as guias não liberadas e, se a pessoa abriu uma delas, leva para a primeira liberada
function aplicarGuias(tela, telaAtual) {
  const [caminho, qs] = telaAtual.split('?');
  for (const [menuHref, g] of Object.entries(GUIAS)) {
    if (!(g.rota.endsWith('/') ? caminho.startsWith(g.rota) : caminho === g.rota)) continue;
    const ok = guiasLiberadas(menuHref); if (!ok) return false;
    const atual = new URLSearchParams(qs || '').get(g.param) || g.itens[0][0];
    $$('.abas a', tela).forEach(a => { const v = new URLSearchParams((a.getAttribute('href') || '').split('?')[1] || '').get(g.param); if (v && !ok.includes(v)) a.remove(); });
    if (!ok.includes(atual)) {
      if (!ok.length) { tela.innerHTML = '<div class="cartao vazio">Você não tem acesso às guias desta tela. Fale com o administrador.</div>'; return true; }
      const p = new URLSearchParams(qs || ''); p.set(g.param, ok[0]); location.replace(`${caminho}?${p}`); return true;
    }
    return false;
  }
  return false;
}
const telaPermitida = h => { const r = '#' + h; return !MENU.some(i => i[0] !== 'grupo' && i[0] !== 'sub' && i[1] === r) || menu().some(i => i[1] === r); };

// Menu lateral: grupos recolhíveis (abre um por vez), lembra o que estava aberto e
// não é redesenhado a cada clique — assim a rolagem do menu fica onde estava.
const menuAbertos = () => { try { return JSON.parse(localStorage.getItem('menuAbertos') || '[]'); } catch { return []; } };
const salvarMenuAbertos = l => { try { localStorage.setItem('menuAbertos', JSON.stringify(l)); } catch { /* ok */ } };
function htmlMenu(pend, melhor, celular = false) {
  const itens = menu(); const grupos = []; let atual = { nome: null, ic: '', itens: [] };
  for (const i of itens) { if (i[0] === 'grupo') { grupos.push(atual); atual = { nome: i[1], ic: i[3] || '', itens: [] }; } else atual.itens.push(i); }
  grupos.push(atual);
  const abertos = menuAbertos();
  const link = i => i[0] === 'sub' ? `<div class="mg-sub">${esc(i[1])}</div>`
    : `<a href="${i[1]}" class="${i[1] === melhor ? 'ativo' : ''} ${i[5] ? 'sub-item' : ''}" data-busca="${esc(i[0].toLowerCase())}"><span class="mi">${esc(i[0])}</span>${i[4] && pend[i[4]] ? `<span class="tag amarelo">${pend[i[4]]}</span>` : ''}</a>`;
  const busca = `<div class="menu-busca"><input type="search" placeholder="Buscar no menu…" aria-label="Buscar no menu" autocomplete="off"></div>`;
  const PESSOAIS = ['Meu espaço', 'Biblioteca'];
  const vis = grupos.filter(g => g.itens.some(i => i[0] !== 'sub'));
  let html = busca, abriuPessoal = false, fechouPessoal = false, ultMacro = null;
  vis.forEach(g => {
    const pessoal = PESSOAIS.includes(g.nome);
    if (pessoal && !abriuPessoal) { html += '<div class="menu-pessoal">'; abriuPessoal = true; }
    if (!pessoal && g.nome && abriuPessoal && !fechouPessoal) { html += '</div>'; fechouPessoal = true; }
    const mac = !pessoal && g.nome ? MENU_MACRO[g.nome] : null;
    if (mac && mac !== ultMacro) { html += `<div class="menu-rotulo">${esc(mac)}</div>`; ultMacro = mac; }
    html += grupoHtml(g);
  });
  if (abriuPessoal && !fechouPessoal) html += '</div>';
  return html;
  function grupoHtml(g) {
    if (!g.nome) return `<div class="menu-topo menu-destaque">${g.itens.map(link).join('')}</div>`;
    const temAtivo = g.itens.some(i => i[1] === melhor);
    const aberto = temAtivo || abertos.includes(g.nome);
    const soma = g.itens.reduce((x, i) => x + (i[4] && pend[i[4]] ? pend[i[4]] : 0), 0);
    return `<div class="mg ${aberto ? 'aberto' : ''}" data-g="${esc(g.nome)}">
      <button type="button" class="mg-tit" aria-expanded="${aberto}"><span class="mi">${esc(g.nome)}</span><span class="mg-dir">${soma && !aberto ? `<span class="tag amarelo">${soma}</span>` : ''}<span class="mg-seta"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></span></span></button>
      <div class="mg-itens">${g.itens.map(link).join('')}</div></div>`;
  }
}
function ligarMenu(raiz) {
  const bx = raiz.querySelector('.menu-busca input');
  if (bx) bx.oninput = () => {
    const q = bx.value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    raiz.querySelector('.menu').classList.toggle('buscando', !!q);
    raiz.querySelectorAll('.menu a[data-busca]').forEach(a => { const t = a.dataset.busca.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); a.classList.toggle('oculto', !!q && !t.includes(q)); });
    raiz.querySelectorAll('.mg').forEach(g => { const tem_ = !q || g.querySelector('a[data-busca]:not(.oculto)'); g.classList.toggle('oculto', !tem_); if (q) g.classList.toggle('achou', !!tem_); else g.classList.remove('achou'); });
  };
  raiz.querySelectorAll('.mg-tit').forEach(b => (b.onclick = () => {
    const g = b.closest('.mg'); const abrir = !g.classList.contains('aberto');
    // um grupo por vez (o da tela atual continua aberto)
    raiz.querySelectorAll('.mg.aberto').forEach(o => { if (o !== g && !o.querySelector('a.ativo')) { o.classList.remove('aberto'); o.querySelector('.mg-tit').setAttribute('aria-expanded', 'false'); } });
    g.classList.toggle('aberto', abrir); b.setAttribute('aria-expanded', String(abrir));
    salvarMenuAbertos(abrir ? [g.dataset.g] : []);
  }));
}
let _ultimoMelhor = null;
async function desenharCasca() {
  const pend = {};
  try { (await api.rpc('minhas_pendencias')).forEach(p => (pend[p.tipo] = Number(p.quantidade))); } catch {}
  try { pend.acoes_pendentes = (await api.rpc('minhas_acoes')).length; } catch {}
  pend.aprovar = (pend.aprovar || 0) + (pend.vagas_aprovar || 0);
  estado.pendencias = pend;
  const atual = location.hash || '#/inicio';
  let melhor = menu().filter(i => i[0] !== 'grupo' && (atual === i[1] || atual.startsWith(i[1] + '/') || atual.startsWith(i[1] + '?'))).sort((a, b) => b[1].length - a[1].length)[0]?.[1];
  // abrir um item (ver/novo/editar…) a partir de outro menu mantém o menu de onde veio — ex.: Financeiro › Reembolsos › abrir reembolso
  const grupoDoItem = r => { let g = null; for (const i of MENU) { if (i[0] === 'grupo') g = i[1]; else if (i[1] === r) return g; } return null; };
  if (_ultimoMelhor && atual !== melhor && (!melhor || (grupoDoItem(melhor) === 'Meu espaço' && grupoDoItem(_ultimoMelhor) !== 'Meu espaço'))) melhor = _ultimoMelhor;
  _ultimoMelhor = melhor;
  const ehMot = tem('motorista') && !veTudo() && !tem('comprador', 'aprovador');
  const casca = $('#app .casca');
  if (casca && casca.dataset.usuario === estado.usuario.id) {
    // já desenhada: atualiza só o menu e a barra de baixo, mantendo a rolagem do menu
    const lat = $('.lateral', casca), y = lat.scrollTop;
    $('.menu', lat).innerHTML = htmlMenu(pend, melhor); ligarMenu(lat); lat.scrollTop = y;
    const bb = $('#app .barra-baixo'); if (bb) bb.outerHTML = `<nav class="barra-baixo" aria-label="Menu rápido">
      <a href="#/inicio" class="${atual.startsWith('#/inicio') ? 'ativo' : ''}"><span class="ic">${ico('inicio')}</span>Início</a>
      <a href="#/reembolsos/novo" class="${atual.startsWith('#/reembolsos/novo') ? 'ativo' : ''}"><span class="ic">${ico('mais')}</span>Lançar</a>
      ${ehMot ? '' : `<a href="#/aprovacoes" class="${atual.startsWith('#/aprovacoes') ? 'ativo' : ''}"><span class="ic">${ico('aprovar')}</span>Aprovar${pend.aprovar ? ` (${pend.aprovar})` : ''}</a>`}
      <a href="#/reembolsos" class="${atual === '#/reembolsos' ? 'ativo' : ''}"><span class="ic">${ico('recibo')}</span>Meus</a>
      <a href="#/menu"><span class="ic">${ico('menu')}</span>Menu</a>
    </nav>`;
    if (!$('#tela').children.length) $('#tela').innerHTML = '<div class="carregando">Carregando…</div>';
    return;
  }
  $('#app').innerHTML = `
    <div class="casca" data-usuario="${estado.usuario.id}">
      <nav class="lateral" aria-label="Menu">
        <div class="marca"><img src="logo.png" alt="Verbo Logística"><div class="sistema">Gestão</div></div>
        <div class="menu">${htmlMenu(pend, melhor)}</div>
        <div class="usuario">${esc(estado.usuario.nome)}<br>
          <a href="#/perfil" style="color:#fff">Meu perfil</a> ·
          <a href="#" id="sair" style="color:#fff">Sair</a>
          <div><a href="#" id="instalar" class="lk-instalar" style="color:#DDA936">Instalar no celular</a></div></div>
      </nav>
      <main class="conteudo" id="tela"><div class="carregando">Carregando…</div></main>
    </div>
<nav class="barra-baixo" aria-label="Menu rápido">
      <a href="#/inicio" class="${atual.startsWith('#/inicio') ? 'ativo' : ''}"><span class="ic">${ico('inicio')}</span>Início</a>
      <a href="#/reembolsos/novo" class="${atual.startsWith('#/reembolsos/novo') ? 'ativo' : ''}"><span class="ic">${ico('mais')}</span>Lançar</a>
      ${ehMot ? '' : `<a href="#/aprovacoes" class="${atual.startsWith('#/aprovacoes') ? 'ativo' : ''}"><span class="ic">${ico('aprovar')}</span>Aprovar${pend.aprovar ? ` (${pend.aprovar})` : ''}</a>`}
      <a href="#/reembolsos" class="${atual === '#/reembolsos' ? 'ativo' : ''}"><span class="ic">${ico('recibo')}</span>Meus</a>
      <a href="#/menu"><span class="ic">${ico('menu')}</span>Menu</a>
    </nav>`;
  ligarMenu($('.lateral'));
  // deixa o item da tela atual visível no menu na primeira vez
  $('.lateral a.ativo')?.scrollIntoView({ block: 'nearest' });
  $('#sair').onclick = async e => { e.preventDefault(); await api.sair(); location.hash = ''; iniciar(); };
  $('#instalar').onclick = e => { e.preventDefault(); instalarApp(); };
  if (appInstalado()) $('#instalar').parentElement.hidden = true;
}

// Rolagem: ao voltar para uma tela, ela reabre onde estava; ao salvar/atualizar a mesma tela, não pula para o topo
const ROLAGEM = (() => { try { return JSON.parse(sessionStorage.getItem('rolagem') || '{}'); } catch { return {}; } })();
let _ultimaTela = null;
function guardarRolagem() { if (_ultimaTela) { ROLAGEM[_ultimaTela] = window.scrollY; try { sessionStorage.setItem('rolagem', JSON.stringify(ROLAGEM)); } catch { /* ok */ } } }
window.addEventListener('scroll', () => { clearTimeout(window._tRol); window._tRol = setTimeout(guardarRolagem, 150); }, { passive: true });
// Botão "← Voltar": aparece sempre que se chega a uma tela por um botão/link de outra tela (não pelo menu)
let _viaMenu = true, _voltando = false;
document.addEventListener('click', e => { if (e.target.closest('.menu a, .barra-baixo a, .menu-cel a')) _viaMenu = true; }, true);
const PILHA = (() => { try { return JSON.parse(sessionStorage.getItem('pilha') || '[]'); } catch { return []; } })();
const _base = h => (h || '').split('?')[0];
const _ehForm = h => /\/(novo|nova|editar)(\/|$|\?)/.test(h);
function atualizarPilha(h) {
  const topoP = PILHA[PILHA.length - 1], ant = PILHA[PILHA.length - 2];
  if (_viaMenu || !PILHA.length) { PILHA.length = 0; PILHA.push(h); }
  else if (_voltando || (ant && _base(ant) === _base(h))) { PILHA.pop(); PILHA[PILHA.length - 1] = h; }   // voltou
  else if (_base(topoP) === _base(h)) PILHA[PILHA.length - 1] = h;                                          // mesma tela (filtro, aba)
  else if (_ehForm(topoP) && !_ehForm(h)) PILHA[PILHA.length - 1] = h;                                      // saiu do formulário salvo: não volta para ele
  else PILHA.push(h);
  if (PILHA.length > 40) PILHA.splice(0, PILHA.length - 40);
  _viaMenu = false; _voltando = false;
  try { sessionStorage.setItem('pilha', JSON.stringify(PILHA)); } catch { /* ok */ }
}
function botaoVoltar(tela) {
  if (PILHA.length < 2 || $('.btn-voltar', tela) || /^#\/inicio/.test(location.hash)) return;
  const topo = $('.topo', tela) || tela.firstElementChild; if (!topo) return;
  // os "Voltar" fixos da própria tela dão lugar a este (que volta para onde você estava)
  $$('.topo .acoes a, .topo .acoes button', tela).forEach(b => { if (/^voltar$/i.test(b.textContent.trim())) b.hidden = true; });
  topo.insertAdjacentHTML('beforebegin', `<button type="button" class="btn-voltar" title="Voltar para a tela anterior">← Voltar</button>`);
  $('.btn-voltar', tela).onclick = () => { _voltando = true; location.hash = PILHA[PILHA.length - 2]; };
}

// ----- Atualização automática: quando sai versão nova, o sistema se atualiza sozinho num momento seguro
// (ao trocar de tela, com a aba em segundo plano ou parado) — nunca no meio de um formulário ou janela aberta.
const VERSAO_APP = Number(((document.querySelector('script[src*="app.js?v="]') || {}).src || '').match(/v=(\d+)/)?.[1] || 0);
let _novaVersao = false, _sujo = false, _ultimoToque = Date.now();
document.addEventListener('input', e => { if (e.target.closest('form, .modal-fundo')) _sujo = true; }, true);
['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(ev => document.addEventListener(ev, () => (_ultimoToque = Date.now()), { passive: true, capture: true }));
const _janelaAberta = () => [...document.querySelectorAll('.modal-fundo')].some(m => !m.hidden && m.innerHTML.trim());
const _digitando = () => document.activeElement?.matches?.('input:not([type=search]), textarea, select');
function tentarAtualizar() {
  if (!_novaVersao || _sujo || _janelaAberta() || _digitando()) return false;
  // proteção: não recarrega em sequência se a versão nova ainda não chegou ao navegador (cache da internet)
  try { const t = JSON.parse(sessionStorage.getItem('vg_tentou') || 'null'); if (t && t.alvo === _novaVersao && Date.now() - t.em < 10 * 60 * 1000) return false;
        sessionStorage.setItem('vg_tentou', JSON.stringify({ alvo: _novaVersao, em: Date.now() })); sessionStorage.setItem('vg_atualizado', String(VERSAO_APP)); } catch { return false; }
  guardarRolagem(); location.reload(); return true;
}
async function checarVersao() {
  if (_novaVersao || !VERSAO_APP) return tentarAtualizar();
  try {
    const t = await fetch('sw.js?t=' + Date.now(), { cache: 'no-store' }).then(r => r.text());
    const n = Number(t.match(/vg-v(\d+)/)?.[1] || 0);
    if (n > VERSAO_APP) { _novaVersao = n; navigator.serviceWorker?.getRegistration?.().then(g => g?.update()).catch(() => {}); tentarAtualizar(); }
  } catch { /* sem internet: tenta depois */ }
}
setInterval(checarVersao, 3 * 60 * 1000);
setInterval(() => { if (_novaVersao && Date.now() - _ultimoToque > 90 * 1000) tentarAtualizar(); }, 30 * 1000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checarVersao(); else tentarAtualizar(); });
window.addEventListener('focus', () => checarVersao());
setTimeout(() => { try { const a = Number(sessionStorage.getItem('vg_atualizado') || 0); if (a) { sessionStorage.removeItem('vg_atualizado'); if (VERSAO_APP > a) aviso('Sistema atualizado para a versão mais nova ✓'); } } catch { /* ok */ } }, 2500);

async function navegar() {
  if (!estado.usuario) return;
  _sujo = false;                      // trocou de tela / salvou: o que estava sendo digitado já foi tratado
  if (_novaVersao && tentarAtualizar()) return;
  guardarRolagem();
  const telaAtual = location.hash || '#/inicio';
  const mesmaRota = _ultimaTela && _ultimaTela.split('?')[0] === telaAtual.split('?')[0];
  _mesmaTela = !!mesmaRota;   // filtros da tela continuam quando ela é redesenhada
  // telas de apresentação (Início e painéis): fundo escuro da marca
  document.body.classList.toggle('tema-vx', /^#?\/(inicio|financeiro\/painel|compras\/painel|ssma)(\?|$)/.test(telaAtual.replace(/^#/, '')));
  const yAntes = window.scrollY;
  atualizarPilha(telaAtual);
  const [h, qs] = (location.hash || '#/inicio').slice(1).split('?');
  estado.params = new URLSearchParams(qs || '');
  if (!telaPermitida(h)) { aviso('Você não tem acesso a esta tela.', true); location.hash = '#/inicio'; return; }
  await desenharCasca();
  const tela = $('#tela');
  for (const padrao of Object.keys(ROTAS).sort((a, b) => a.includes(':') - b.includes(':'))) {   // rotas fixas antes das genéricas
    const re = new RegExp('^' + padrao.replace(/:(\w+)/g, '([^/]+)') + '$');
    const m = h.match(re);
    if (m) {
      // enquanto carrega, a tela antiga fica com a altura dela (evita o "pulo" para o topo)
      tela.style.minHeight = tela.offsetHeight + 'px';
      try { await ROTAS[padrao](tela, ...m.slice(1).map(decodeURIComponent)); if (aplicarGuias(tela, telaAtual)) { tela.style.minHeight = ''; _ultimaTela = telaAtual; return; } if (typeof ferramentasExportacao === 'function') ferramentasExportacao(tela); botaoVoltar(tela); }
      catch (e) { tela.innerHTML = `<div class="cartao erro-txt">Não foi possível abrir esta tela: ${esc(e.message)}</div>`; console.error(e); }
      tela.style.minHeight = '';
      const alvo = mesmaRota ? yAntes : (ROLAGEM[telaAtual] ?? 0);
      window.scrollTo(0, alvo);
      requestAnimationFrame(() => window.scrollTo(0, alvo));
      _ultimaTela = telaAtual;
      return;
    }
  }
  location.hash = '#/inicio';
}
window.addEventListener('hashchange', navegar);

// Menu completo no celular
rota('/menu', tela => {
  tela.innerHTML = `<div class="menu-cel"><div class="marca"><img src="logo.png" alt="Verbo Logística"><div class="sistema">Gestão</div></div>
    <div class="menu">${htmlMenu(estado.pendencias || {}, null, true)}
    <div class="menu-grupo" style="color:#fff">Conta</div><a href="#/perfil">👤 Meu perfil</a><a href="#" id="sair2">🚪 Sair</a></div></div>`;
  ligarMenu($('.menu-cel', tela));
  $('#sair2').onclick = async e => { e.preventDefault(); await api.sair(); location.hash = ''; iniciar(); };
});

// ===================== Login e primeiro acesso =====================

// ===================== Identidade visual (capa e início) =====================
const SVG_CHEVRON = `<svg aria-hidden="true" viewBox="0 0 560 336"><path fill="#02654D" d="M3,36 L2,40 L30,73 L40,87 L46,93 L52,102 L82,138 L130,201 L136,207 L138,211 L175,257 L213,308 L222,318 L226,325 L233,331 L241,334 L252,334 L263,328 L318,255 L324,249 L325,246 L333,237 L336,231 L343,223 L342,219 L332,218 L325,215 L322,215 L309,206 L303,200 L249,130 L203,66 L187,50 L184,49 L178,44 L156,35 L144,34 L139,32 L106,32 L105,33 L75,33 L74,34 L48,34 L47,35 L5,35Z"/><path fill="#DDA936" d="M558,2 L510,2 L509,3 L463,3 L462,4 L452,4 L451,5 L442,5 L433,8 L428,8 L423,11 L418,11 L405,17 L402,17 L391,23 L389,23 L380,29 L378,29 L363,38 L360,41 L358,41 L351,47 L341,53 L302,86 L271,117 L271,121 L327,191 L333,195 L343,199 L357,199 L363,196 L364,193 L384,166 L403,144 L464,82 L511,40 L516,37 L537,19 L557,5Z"/></svg>`;   // ícone oficial da Verbo (traçado do logotipo)
function svgMapa({ rotulos = true } = {}) {
  return `<svg class="mapa-svg" viewBox="0 0 1040 720" role="img" aria-label="Corredor operacional: Três Lagoas (MS), Guararapes (SP) e Lençóis Paulista (SP)">
    <defs>
      <radialGradient id="mg-sp" cx="65%" cy="62%" r="60%"><stop offset="0" stop-color="#0a6b52"/><stop offset="1" stop-color="#0b3f31"/></radialGradient>
      <filter id="mg-brilho" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <pattern id="mg-pontos" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="rgba(255,255,255,.07)"/></pattern>
    </defs>
    <rect width="1040" height="720" fill="url(#mg-pontos)"/>
    <polygon class="mapa-uf" fill="#0d3a2f" points="5,142 16,192 0,219 0,441 105,456 157,472 173,519 188,585 242,585 268,596 316,512 353,473 383,428 420,385 510,267 475,222 368,123 353,63 298,52 245,79 182,63 91,55 28,75"/>
    <polygon class="mapa-uf" fill="url(#mg-sp)" points="353,473 388,482 451,482 518,490 568,500 590,508 640,588 644,641 689,653 727,692 744,671 806,635 861,593 930,576 976,542 1014,494 975,468 897,491 834,461 854,386 839,339 794,291 755,276 686,283 622,267 510,267 420,385 383,428"/>
    <text class="mapa-uf-nome" x="70" y="140">MATO GROSSO DO SUL</text><text class="mapa-uf-nome" x="760" y="640">SÃO PAULO</text>
    <path class="mapa-rota-base" d="M457,332 C495,305 520,330 537,373 C565,440 615,468 674,480"/>
    <path class="mapa-rota" filter="url(#mg-brilho)" d="M457,332 C495,305 520,330 537,373 C565,440 615,468 674,480"/>
    <circle class="mapa-veiculo" r="7" fill="#fff"><animateMotion dur="5.5s" repeatCount="indefinite" path="M457,332 C495,305 520,330 537,373 C565,440 615,468 674,480"/></circle>
    ${[[457, 332, 'ouro'], [537, 373, 'branco'], [674, 480, 'ouro']].map(([x, y, c], i) => `<g class="mapa-ponto" style="animation-delay:${i * .6}s">
      <circle cx="${x}" cy="${y}" r="26" class="pulso" style="animation-delay:${i * .6}s"/><circle cx="${x}" cy="${y}" r="17" fill="none" stroke="#DDA936" stroke-opacity=".55" stroke-width="2"/>
      <circle cx="${x}" cy="${y}" r="10" fill="${c === 'ouro' ? '#DDA936' : '#fff'}" stroke="#0b3f31" stroke-width="3"/></g>`).join('')}
    ${rotulos ? `<g class="mapa-rotulo"><text x="420" y="290" text-anchor="end" class="r-tipo">ORIGEM</text><text x="420" y="318" text-anchor="end" class="r-nome">Três Lagoas <tspan class="r-uf">MS</tspan></text></g>
    <g class="mapa-rotulo"><text x="575" y="335" class="r-tipo">APOIO · ADMINISTRATIVO</text><text x="575" y="363" class="r-nome">Guararapes <tspan class="r-uf">SP</tspan></text></g>
    <g class="mapa-rotulo"><text x="706" y="455" class="r-tipo">DESTINO</text><text x="706" y="483" class="r-nome">Lençóis Paulista <tspan class="r-uf">SP</tspan></text></g>` : ''}
  </svg>`;
}
const ICONE = {
  olho: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  carta: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  cadeado: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  escudo: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
};
const ic = (n, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONE[n]}</svg>`;
function casaLogin(titulo, sub, corpo) {
  return `<div class="capa">
    <div class="capa-fundo" aria-hidden="true"></div><div class="capa-chevron" aria-hidden="true">${SVG_CHEVRON}</div>
    <section class="capa-hero">
      <img class="capa-logo" src="logo.png" alt="Verbo Logística">
      <div class="capa-eyebrow">Sistema de Gestão Integrada</div>
      <h1 class="capa-titulo">Mais que transporte,<br><em>movemos conquistas.</em></h1>
      <p class="capa-texto">Operação florestal, frota, pessoas e finanças conectadas em um só lugar — com segurança, controle e indicadores confiáveis.</p>
      <div class="capa-mapa"><div class="capa-mapa-tit"><span>Principal corredor operacional</span><span class="ao-vivo"><i></i>Operação ativa</span></div>${svgMapa()}</div>
      <ul class="capa-valores"><li>Segurança</li><li>Pessoas</li><li>Resultados</li><li>Sustentabilidade</li></ul>
    </section>
    <section class="capa-lado">
      <div class="capa-cartao">
        <div class="capa-cartao-topo"><span class="capa-v">${SVG_CHEVRON}</span><div><h2>${titulo}</h2><p>${sub}</p></div></div>
        ${corpo}
      </div>
      <p class="capa-meta">${ic('escudo')} <span><b>Zero acidentes.</b> Essa é a nossa meta.</span></p>
    </section>
    <footer class="capa-rodape">© ${new Date().getFullYear()} Verbo Logística · Logística que conecta pessoas, movimenta o Brasil.</footer>
  </div>`;
}

function telaLogin(msg = '') {
  const h = new Date().getHours(), sauda = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  $('#app').innerHTML = casaLogin(`${sauda}!`, 'Acesse com seu e-mail (ou CPF) e senha.', `
      <form id="f-login" class="capa-form" novalidate>
        <label class="capa-campo"><span>E-mail ou CPF</span><div class="capa-in">${ic('carta')}<input name="email" type="text" inputmode="email" autocapitalize="off" spellcheck="false" autocomplete="username" placeholder="seu.nome@empresa.com.br ou CPF" required></div></label>
        <label class="capa-campo"><span>Senha</span><div class="capa-in">${ic('cadeado')}<input name="senha" type="password" autocomplete="current-password" placeholder="••••••••" required>
          <button type="button" class="capa-olho" id="ver-senha" aria-label="Mostrar senha" title="Mostrar senha">${ic('olho')}</button></div></label>
        <div id="msg" class="${msg.startsWith('!') ? 'erro-txt' : 'muted'}" role="status">${esc(msg.replace(/^!/, ''))}</div>
        <button class="btn prim capa-entrar">Entrar <span aria-hidden="true">→</span></button>
        <button type="button" class="capa-link" id="primeiro">Primeiro acesso ou esqueci a senha</button>
      </form>`);
  $('#ver-senha').onclick = () => { const i = $('#f-login [name=senha]'); i.type = i.type === 'password' ? 'text' : 'password'; $('#ver-senha').classList.toggle('on', i.type === 'text'); i.focus(); };
  setTimeout(() => $('#f-login [name=email]')?.focus(), 50);
  const f = $('#f-login');
  f.onsubmit = async e => {
    e.preventDefault();
    const d = formDados(f);
    if (!d.email || !d.senha) { $('#msg').className = 'erro-txt'; $('#msg').textContent = 'Informe e-mail (ou CPF) e senha.'; return; }
    await ocupado(e.submitter, async () => {
      try { await api.entrar(loginDigitado(d.email), d.senha); await iniciar(); }
      catch (err) { $('#msg').className = 'erro-txt'; $('#msg').textContent = err.message; }
    });
  };
  $('#primeiro').onclick = async e => {
    const email = f.email.value.trim();
    if (!email) { $('#msg').className = 'erro-txt'; $('#msg').textContent = 'Digite seu e-mail acima e clique de novo.'; return; }
    if (ehLoginCPF(loginDigitado(email))) { $('#msg').className = 'muted'; $('#msg').textContent = 'Quem entra com CPF recebe o link de acesso pelo WhatsApp: peça ao administrador do sistema para enviar.'; return; }
    await ocupado(e.target, async () => {
      try { await api.enviarLink(email); $('#msg').className = 'muted';
            $('#msg').textContent = 'Enviamos um link para ' + email + '. Abra o e-mail e clique no link para criar sua senha.'; }
      catch (err) { $('#msg').className = 'erro-txt'; $('#msg').textContent = err.message; }
    });
  };
}

function telaNovaSenha() {
  $('#app').innerHTML = casaLogin('Crie sua senha', 'Defina a senha que você vai usar para entrar no sistema.', `
      <form id="f-senha" class="capa-form">
        <label class="capa-campo"><span>Nova senha</span><div class="capa-in">${ic('cadeado')}<input name="s1" type="password" minlength="8" autocomplete="new-password" required></div></label>
        <label class="capa-campo"><span>Repita a senha</span><div class="capa-in">${ic('cadeado')}<input name="s2" type="password" minlength="8" autocomplete="new-password" required></div></label>
        <div class="muted">Pelo menos 8 caracteres.</div><div id="msg" class="erro-txt"></div>
        <button class="btn prim capa-entrar">Salvar senha e entrar <span aria-hidden="true">→</span></button>
      </form>`);
  const f = $('#f-senha');
  f.onsubmit = async e => {
    e.preventDefault();
    const d = formDados(f);
    if (d.s1 !== d.s2) { $('#msg').textContent = 'As senhas não são iguais.'; return; }
    await ocupado(e.submitter, async () => {
      try { await api.definirSenha(d.s1); aviso('Senha criada.'); await iniciar(); }
      catch (err) { $('#msg').textContent = err.message; }
    });
  };
}

async function iniciar() {
  const ret = (await api.lerAcessoWhatsApp()) || api.lerRetornoDoEmail();
  if (ret?.erro) return telaLogin(ret.erro === 'link' ? '!Este link de acesso expirou ou já foi usado. Peça um novo ao administrador.' : '!O link expirou ou já foi usado. Peça um novo em "Primeiro acesso".');
  if (!api.sessao) return telaLogin();
  try {
    const u = await api.usuarioAtual();
    if (ret && ['recovery', 'invite', 'magiclink', 'signup'].includes(ret.tipo)) {
      estado.usuario = { id: u.id };
      if (ret.tipo !== 'magiclink' || !u.user_metadata?.senha_definida) return telaNovaSenha();
    }
    const [perfil] = await api.listar('usuarios', `id=eq.${u.id}&select=*`);
    if (!perfil) throw new Error('Usuário sem cadastro no sistema.');
    if (!perfil.ativo) { await api.sair(); return telaLogin('!Seu acesso está desativado. Fale com o administrador.'); }
    estado.usuario = perfil;
    estado.perfis = (await api.listar('usuario_perfis', `usuario_id=eq.${u.id}&select=perfil`)).map(p => p.perfil);
    // setores em que a pessoa faz ou aprova fechamento de contratos
    estado.fch = (await api.listar('setores_fechamento', 'select=codigo,aprovadores,lancadores&ativo=is.true').catch(() => []))
      .filter(s => [...s.aprovadores, ...s.lancadores].includes(u.id)).map(s => s.codigo);
    estado.cache = {};
    if (!location.hash || location.hash === '#') location.hash = '#/inicio';
    await navegar();
  } catch (e) {
    console.error(e);
    if (!api.sessao) return telaLogin('!Sua sessão expirou. Entre de novo.');
    $('#app').innerHTML = `<div class="login"><div class="cartao"><h2>Não foi possível carregar</h2><p>${esc(e.message)}</p>
      <div class="acoes"><button class="btn prim" onclick="location.reload()">Tentar de novo</button>
      <button class="btn" id="sair3">Sair</button></div></div></div>`;
    $('#sair3').onclick = async () => { await api.sair(); telaLogin(); };
  }
}

// ===================== Início =====================
rota('/inicio', async tela => {
  const p = estado.pendencias || {};
  const faixas = { '1_vencidos': 'Vencidos', '2_hoje': 'Vencem hoje', '3_7_dias': 'Próximos 7 dias', '4_30_dias': 'Próximos 30 dias', '5_depois': 'Depois de 30 dias' };
  let agenda = '';
  if (veTudo()) {
    const ag = await api.listar('v_agenda_vencimentos', 'order=faixa');
    const bloco = (tipo, titulo) => { const linhas = ag.filter(a => a.tipo === tipo);
      return `<div class="cartao"><h2>${titulo}</h2>${linhas.length ? `<table><tbody>${linhas.map(a =>
      `<tr class="clicavel" onclick="location.hash='#/financeiro/${tipo}?faixa=${a.faixa}'"><td>${a.faixa === '1_vencidos' ? '<span class="tag vermelho">Vencidos</span>' : esc(faixas[a.faixa])}</td>
       <td class="num">${a.quantidade} conta(s)</td><td class="num"><b>${brl(a.total)}</b></td></tr>`).join('')}</tbody></table>`
      : '<div class="vazio">Nada em aberto.</div>'}</div>`; };
    agenda = `<div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr))">${bloco('pagar', 'A pagar')}${bloco('receber', 'A receber')}</div>`;
  }
  // minhas requisições de compra em andamento (com a etapa de cada uma)
  const minhasReq = await api.listar('requisicoes', `solicitante_id=eq.${estado.usuario.id}&status=not.in.(recebida,cancelada,reprovada)&select=id,numero,justificativa,status,atualizado_em&order=atualizado_em.desc&limit=20`).catch(() => []);
  const ETAPA_REQ = { rascunho: [0, 'Rascunho — falta enviar para Compras'], devolvida: [0, 'Devolvida para você corrigir'], aguardando_cotacao: [1, 'Aguardando o Comprador cotar'],
    em_cotacao: [2, 'Em cotação'], aguardando_aprovacao: [3, 'Aguardando aprovação'], aprovada: [3, 'Aprovada — emitindo pedido'], pedido_emitido: [5, 'Pedido emitido — aguardando nota fiscal e entrega'], faturada: [6, 'Nota lançada — aguardando o produto chegar'], entregue: [6, 'Produto chegou — falta lançar a nota fiscal'] };
  const blocoMinhasReq = minhasReq.length ? `<div class="cartao" id="minhas-req"><div class="topo" style="margin:0 0 8px"><div><h2 style="margin:0">Minhas requisições de compra</h2>
      <p class="muted" style="margin:2px 0 0">${minhasReq.length} em andamento · toque para ver a linha do tempo completa</p></div><a class="btn peq" href="#/compras/requisicoes">Ver todas</a></div>
    <ul class="mr-lista">${minhasReq.map(r => { const [n, txt] = ETAPA_REQ[r.status] || [0, r.status];
      return `<li><a href="#/compras/requisicoes/ver/${r.id}"><span class="mr-num">${esc(r.numero || '')}</span><span class="mr-txt">${esc((r.justificativa || '').slice(0, 90))}${(r.justificativa || '').length > 90 ? '…' : ''}</span>
        <span class="mr-etapa ${r.status === 'devolvida' ? 'alerta' : ''}"><span class="mr-pontos">${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<i class="${i < n ? 'f' : i === n ? 'a' : ''}"></i>`).join('')}</span>${txt}</span></a></li>`; }).join('')}</ul></div>` : '';
  const agIni = (() => { const d = new Date(hojeISO() + 'T12:00'); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10); })();
  const [resGestao, minhasAcoes, diariasFechar, chamadosAb, minhaAgenda] = await Promise.all([api.rpc('resumo_gestao').catch(() => null), api.rpc('minhas_acoes').catch(() => []), api.rpc('diarias_a_fechar').catch(() => []), api.rpc('chamados_abertos').catch(() => []),
    api.rpc('minha_agenda', { p_ini: agIni, p_fim: somaDias(agIni, 13) }).catch(() => [])]);
  const hojeD = hojeISO(), fimMes = d => somaDias(somaMeses(d.slice(0, 7) + '-01', 1), -1);
  const dfPend = (diariasFechar || []).filter(x => fimMes(x.competencia) <= hojeD || Number(hojeD.slice(8)) >= 25);
  const blocoDiarias = dfPend.length ? `<div class="cartao" style="border-left:4px solid var(--ouro)"><h2>Diárias para fechar</h2><ul class="lista-simples">${dfPend.map(x => `<li class="clicavel" onclick="location.hash='#/financeiro/pagar/ver/${x.titulo_id}'"><span><b>${esc(x.fornecedor || '')}</b> · ${esc(x.descricao || '')}</span><span class="muted">previsto ${brl(x.valor)}</span></li>`).join('')}</ul></div>` : '';
  const blocoAcoes = htmlMinhasAcoes(minhasAcoes || []);
  const blocoAgenda = htmlMinhaAgenda(minhaAgenda || [], agIni);
  const blocoGestao = htmlResumoGestao(resGestao);
  const verAnt = estado.params?.get('avisos') === 'todos';
  const notifs = await api.listar('notificacoes', `usuario_id=eq.${estado.usuario.id}${verAnt ? '' : '&lida=eq.false'}&order=criado_em.desc&limit=${verAnt ? 40 : 30}`);
  const hh = new Date().getHours(), sauda = hh < 12 ? 'Bom dia' : hh < 18 ? 'Boa tarde' : 'Boa noite';
  const dataLonga = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  tela.innerHTML = `
    <section class="inicio-hero">
      <div class="ih-chevron" aria-hidden="true">${SVG_CHEVRON}</div><div class="ih-mapa" aria-hidden="true">${svgMapa({ rotulos: false })}</div>
      <div class="ih-conteudo">
        <div class="ih-data">${esc(dataLonga)}</div>
        <h1>${sauda}, ${esc(estado.usuario.nome.split(' ')[0])}!</h1>
        <p class="ih-resumo" id="ih-resumo">Mais que transporte, movemos conquistas.</p>
        ${(() => { const [f, a, o] = fraseDoDia(); return `<figure class="ih-frase"><blockquote>“${esc(f)}”</blockquote><figcaption>— <b>${esc(a)}</b>${o ? `, <cite>${esc(o)}</cite>` : ''}</figcaption></figure>`; })()}
      </div>
    </section>
    <div class="inicio-kpis ik-pend-w" hidden><section class="ik-sec ik-pend" id="ik-pend"></section></div>
    ${blocoAgenda || blocoAcoes ? `<div class="ini-duo">${blocoAgenda}${blocoAcoes}</div>` : ''}${blocoDiarias}${typeof htmlChamadosInicio === 'function' ? htmlChamadosInicio(chamadosAb) : ''}
    ${veTudo() || tem('administrador', 'comprador') ? '<section class="vx-ini" id="vx-ini"><div class="vx-ini-cab"><h2>Visão executiva</h2></div><div class="pn-vazio">Carregando indicadores…</div></section>' : ''}
    ${blocoGestao}
    <div class="inicio-kpis">
      <a class="cartao kpi ${minhasReq.some(r => r.status === 'devolvida') ? 'alerta' : ''}" href="#${minhasReq.length ? '/inicio' : '/compras/requisicoes'}" ${minhasReq.length ? 'onclick="event.preventDefault();document.getElementById(\'minhas-req\').scrollIntoView({behavior:\'smooth\'})"' : ''}><div class="n">${minhasReq.length}</div><div class="r">minha(s) requisição(ões) de compra em andamento</div></a>
      ${p.aprovar || veTudo() || tem('aprovador', 'financeiro') ? `<a class="cartao kpi ${p.aprovar ? 'alerta' : ''}" href="#/aprovacoes"><div class="n">${p.aprovar || 0}</div><div class="r">para você aprovar</div></a>` : ''}
      ${p.fch_aprovar ? `<a class="cartao kpi alerta" href="#/fechamentos?etapa=em_aprovacao"><div class="n">${p.fch_aprovar}</div><div class="r">fechamento(s) de contrato para você aprovar</div></a>` : ''}
      ${p.fch_compras ? `<a class="cartao kpi alerta" href="#/fechamentos?etapa=em_compras"><div class="n">${p.fch_compras}</div><div class="r">fechamento(s) de contrato para o Compras conferir</div></a>` : ''}
      ${(() => { const n = Object.keys(p).filter(k => /^fch_/.test(k) && !['fch_aprovar', 'fch_compras'].includes(k)).reduce((a, k) => a + p[k], 0);
        return n ? `<a class="cartao kpi alerta" href="#/fechamentos?etapa=pendente,devolvido"><div class="n">${n}</div><div class="r">fechamento(s) de contrato de meses anteriores para fazer</div></a>` : ''; })()}
      <a class="cartao kpi ${p.devolvidos ? 'alerta' : ''}" href="#/reembolsos"><div class="n">${p.devolvidos || 0}</div><div class="r">reembolsos devolvidos para correção</div></a>
      ${editaFin() ? `<a class="cartao kpi" href="#/financeiro/reembolsos?status=aprovado"><div class="n">${p.reembolsos_a_pagar || 0}</div><div class="r">reembolsos aprovados a pagar</div></a>` : ''}
      ${editaFin() ? `<a class="cartao kpi ${p.sem_comprovante ? 'alerta' : ''}" href="#/financeiro/pagar?status=semcomp"><div class="n">${p.sem_comprovante || 0}</div><div class="r">pagamentos sem comprovante</div></a>` : ''}
      ${tem('administrador', 'comprador') ? `<a class="cartao kpi ${p.requisicoes_a_cotar ? 'alerta' : ''}" href="#/compras/cotacoes"><div class="n">${p.requisicoes_a_cotar || 0}</div><div class="r">requisições para cotar</div></a>` : ''}
      ${p.pedidos_sem_documento ? `<a class="cartao kpi alerta" href="#/compras/pedidos?status=a_faturar"><div class="n">${p.pedidos_sem_documento}</div><div class="r">pedido(s) de compra sem nota fiscal/boleto lançados</div></a>` : ''}
      ${p.pedidos_a_receber_almox ? `<a class="cartao kpi alerta" href="#/compras/pedidos?status=a_receber"><div class="n">${p.pedidos_a_receber_almox}</div><div class="r">compra(s) aguardando chegada no almoxarifado</div></a>` : ''}
      ${p.orcamento_alerta ? `<a class="cartao kpi alerta" href="#/orcamento"><div class="n">${p.orcamento_alerta}</div><div class="r">conta(s) do orçamento estourada(s) ou perto do limite neste mês</div></a>` : ''}
      ${p.calendario_crlv ? `<a class="cartao kpi alerta" href="#/config/calendario_crlv"><div class="n">${p.calendario_crlv}</div><div class="r">calendário(s) do CRLV do próximo ano para conferir</div></a>` : ''}
      ${p.docs_vencendo ? `<a class="cartao kpi alerta" href="#/frota/documentos"><div class="n">${p.docs_vencendo}</div><div class="r">documento(s) de equipamentos vencidos ou vencendo em 30 dias</div></a>` : ''}
      ${p.pesquisa_aberta ? `<a class="cartao kpi alerta" href="#/clima"><div class="n">💬</div><div class="r">Pesquisa de clima aberta: responda de forma anônima</div></a>` : ''}
      ${tem('administrador', 'rh', 'dp') && p.ferias_vencendo ? `<a class="cartao kpi alerta" href="#/rh/ferias"><div class="n">${p.ferias_vencendo}</div><div class="r">período(s) de férias vencido(s) ou vencendo</div></a>` : ''}
      ${tem('administrador', 'rh', 'dp') && p.desligamentos_andamento ? `<a class="cartao kpi" href="#/rh/desligamentos"><div class="n">${p.desligamentos_andamento}</div><div class="r">desligamento(s) em andamento</div></a>` : ''}
      ${p.entrevistas_avaliar ? `<a class="cartao kpi alerta" href="#/rh/entrevistas"><div class="n">${p.entrevistas_avaliar}</div><div class="r">entrevista(s) de candidato para você avaliar</div></a>` : ''}
      ${p.vagas_aprovar ? `<a class="cartao kpi alerta" href="#/rh/vagas"><div class="n">${p.vagas_aprovar}</div><div class="r">requisição(ões) de vaga esperando você</div></a>` : ''}
      ${p.admissao_etapas ? `<a class="cartao kpi alerta" href="#/rh/admissoes"><div class="n">${p.admissao_etapas}</div><div class="r">etapa(s) de admissão com o seu setor</div></a>` : ''}
      ${p.admissao_conferir ? `<a class="cartao kpi alerta" href="#/rh/admissoes"><div class="n">${p.admissao_conferir}</div><div class="r">etapa(s) de admissão para o RH conferir</div></a>` : ''}
      ${p.experiencia_decidir ? `<a class="cartao kpi alerta" href="#/rh/experiencia"><div class="n">${p.experiencia_decidir}</div><div class="r">contrato(s) de experiência para você decidir</div></a>` : ''}
      ${p.experiencia_encerrar ? `<a class="cartao kpi alerta" href="#/rh/experiencia"><div class="n">${p.experiencia_encerrar}</div><div class="r">término(s) de experiência a iniciar</div></a>` : ''}
      ${p.desligamento_etapas ? `<a class="cartao kpi alerta" href="#/rh/desligamentos"><div class="n">${p.desligamento_etapas}</div><div class="r">etapa(s) de desligamento com o seu setor</div></a>` : ''}
      ${tem('administrador', 'rh', 'dp') && p.admissoes_andamento ? `<a class="cartao kpi" href="#/rh/admissoes"><div class="n">${p.admissoes_andamento}</div><div class="r">admissão(ões) em andamento</div></a>` : ''}
      ${tem('administrador', 'rh', 'dp') && p.rh_docs_vencendo ? `<a class="cartao kpi alerta" href="#/rh/documentos"><div class="n">${p.rh_docs_vencendo}</div><div class="r">documento(s) de colaboradores vencidos ou vencendo em 30 dias</div></a>` : ''}
      ${tem('administrador', 'rh', 'dp') && p.experiencia_vencendo ? `<a class="cartao kpi alerta" href="#/rh"><div class="n">${p.experiencia_vencendo}</div><div class="r">contrato(s) de experiência vencendo em 15 dias</div></a>` : ''}
      ${tem('administrador', 'almoxarifado') && p.almox_requisicoes_abertas ? `<a class="cartao kpi alerta" href="#/almox/requisicoes"><div class="n">${p.almox_requisicoes_abertas}</div><div class="r">requisição(ões) de material a atender</div></a>` : ''}
      ${tem('administrador', 'almoxarifado', 'comprador') && p.almox_abaixo_minimo ? `<a class="cartao kpi alerta" href="#/almox/itens?abaixo=1"><div class="n">${p.almox_abaixo_minimo}</div><div class="r">item(ns) do almoxarifado abaixo do mínimo</div></a>` : ''}
      ${tem('administrador', 'almoxarifado', 'rh') && p.patrimonio_sem_termo ? `<a class="cartao kpi alerta" href="#/patrimonio?sem_termo=1"><div class="n">${p.patrimonio_sem_termo}</div><div class="r">bem(ns) em uso sem termo de responsabilidade</div></a>` : ''}
      ${tem('administrador', 'manutencao') && p.manut_os_urgentes ? `<a class="cartao kpi alerta" href="#/manut/os?prioridade=urgente"><div class="n">${p.manut_os_urgentes}</div><div class="r">OS urgente(s) em aberto</div></a>` : ''}
      ${tem('administrador', 'manutencao', 'operacao') && p.manut_preventivas_vencidas ? `<a class="cartao kpi alerta" href="#/manut/preventivas"><div class="n">${p.manut_preventivas_vencidas}</div><div class="r">preventiva(s) vencida(s) sem OS</div></a>` : ''}
      ${tem('administrador', 'manutencao', 'operacao') && p.manut_parados ? `<a class="cartao kpi alerta" href="#/manut"><div class="n">${p.manut_parados}</div><div class="r">equipamento(s) parado(s) em manutenção</div></a>` : ''}
      ${tem('administrador', 'ssma', 'rh') && p.cat_pendente ? `<a class="cartao kpi alerta" href="#/ssma/acidentes"><div class="n">${p.cat_pendente}</div><div class="r">CAT pendente (prazo: 1º dia útil após o acidente)</div></a>` : ''}
      ${tem('administrador', 'ssma') && p.aso_vencendo ? `<a class="cartao kpi alerta" href="#/ssma/aso?sit=pendentes"><div class="n">${p.aso_vencendo}</div><div class="r">ASO vencido, vencendo ou faltando</div></a>` : ''}
      ${p.ssma_acoes_atrasadas ? `<a class="cartao kpi alerta" href="#/planos?ver=todas"><div class="n">${p.ssma_acoes_atrasadas}</div><div class="r">ação(ões) de segurança atrasada(s)</div></a>` : ''}
      ${tem('administrador', 'operacao') && p.multas_indicar ? `<a class="cartao kpi alerta" href="#/operacao/ocorrencias?tipo=multa"><div class="n">${p.multas_indicar}</div><div class="r">multa(s) com indicação do condutor / desconto pendente</div></a>` : ''}
      ${tem('administrador', 'operacao') && p.jornada_alertas ? `<a class="cartao kpi alerta" href="#/operacao/jornadas?alertas=1"><div class="n">${p.jornada_alertas}</div><div class="r">jornada(s) de motorista com alerta (Lei 13.103)</div></a>` : ''}
      ${p.abast_alertas ? `<a class="cartao kpi alerta" href="#/operacao/abastecimentos"><div class="n">${p.abast_alertas}</div><div class="r">abastecimento(s) com alerta para conferir</div></a>` : ''}
      ${p.faturas_postos ? `<a class="cartao kpi alerta" href="#/operacao/abastecimentos?aba=faturas"><div class="n">${p.faturas_postos}</div><div class="r">fatura(s) de posto para conferir</div></a>` : ''}
      ${tem('administrador', 'operacao') && p.viagens_atrasadas ? `<a class="cartao kpi alerta" href="#/operacao/viagens?status=em_transito"><div class="n">${p.viagens_atrasadas}</div><div class="r">viagem(ns) atrasada(s)</div></a>` : ''}
      ${tem('administrador', 'rh', 'dp') && (p.ocorrencias_responsabilizacao || p.manut_responsabilizacao || p.patrimonio_avarias) ? `<a class="cartao kpi alerta" href="#/operacao/ocorrencias"><div class="n">${(p.ocorrencias_responsabilizacao || 0) + (p.manut_responsabilizacao || 0) + (p.patrimonio_avarias || 0)}</div><div class="r">caso(s) de responsabilização por dano/multa em análise</div></a>` : ''}
      ${tem('administrador', 'dp') && p.dp_a_importar ? `<a class="cartao kpi alerta" href="#/dp/folha"><div class="n">${p.dp_a_importar}</div><div class="r">pendência(s) dos setores para a folha (descontos, suspensões)</div></a>` : ''}
      ${p.qual_docs_ler ? `<a class="cartao kpi alerta" href="#/qualidade/documentos?ler=1"><div class="n">${p.qual_docs_ler}</div><div class="r">documento(s) da qualidade para você ler</div></a>` : ''}
      ${p.qual_acoes_atrasadas ? `<a class="cartao kpi alerta" href="#/qualidade/nc"><div class="n">${p.qual_acoes_atrasadas}</div><div class="r">ação(ões) da qualidade atrasada(s)</div></a>` : ''}
      ${veTudo() && p.prestacao_vencida ? `<a class="cartao kpi alerta" href="#/financeiro/adiantamentos"><div class="n">${p.prestacao_vencida}</div><div class="r">prestação(ões) de contas vencida(s)</div></a>` : ''}
      ${veTudo() ? `<a class="cartao kpi ${p.a_verificar ? 'alerta' : ''}" href="#/financeiro/verificar"><div class="n">${p.a_verificar || 0}</div><div class="r">lançamentos a verificar</div></a>` : ''}
    </div>
    ${blocoMinhasReq}
    ${agenda}
    <div class="cartao"><div class="topo" style="margin:0 0 6px"><div><h2 style="margin:0">${verAnt ? 'Avisos (todos)' : 'Avisos pendentes'}</h2>
        <p class="muted" style="margin:2px 0 0">Só você vê os seus avisos. Os de aprovação, pagamento e cotação somem sozinhos quando o assunto é resolvido.</p></div>
        <div class="acoes">${notifs.some(n => !n.lida) ? '<button class="btn peq" id="lidas">Marcar todos como lidos</button>' : ''}<a class="btn peq" href="#/inicio${verAnt ? '' : '?avisos=todos'}">${verAnt ? 'Só pendentes' : 'Ver anteriores'}</a></div></div>
      ${notifs.length ? `<ul class="lista-simples">${notifs.map(n => `<li class="${n.lida ? '' : 'nao-lida'}"><span>${n.link ? `<a href="${esc(n.link)}">${esc(n.titulo)}</a>` : esc(n.titulo)}${n.corpo ? `<br><span class="muted">${esc(n.corpo)}</span>` : ''}${n.resolvida_em ? ` <span class="tag verde">resolvido</span>` : ''}</span>
        <span class="muted nowrap">${dataHoraBR(n.criado_em)}${!n.lida ? ` <button class="btn peq" data-lida="${n.id}" title="Marcar como lido">✓</button>` : ''}</span></li>`).join('')}</ul>`
        : `<div class="vazio">${verAnt ? 'Nenhum aviso.' : 'Nenhum aviso pendente.'}</div>`}</div>`;
  if (typeof vxInicio === 'function') vxInicio($('#vx-ini', tela));
  // painel do dia: indicadores agrupados por área, com ícone de traço e situação (ação necessária / em dia)
  const SECOES = [['fin', 'Financeiro e aprovações', 'carteira'], ['com', 'Compras', 'carrinho'], ['ope', 'Operação e frota', 'caminhao'], ['alm', 'Almoxarifado e patrimônio', 'armazem'],
    ['pes', 'Pessoas', 'pessoas'], ['seg', 'Segurança do trabalho', 'capacete'], ['qua', 'Qualidade', 'selo']];
  const secaoDe = h => /^#\/(compras|inicio)/.test(h) ? 'com' : /^#\/(almox|patrimonio)/.test(h) ? 'alm' : /^#\/(rh|dp|clima)/.test(h) ? 'pes'
    : /^#\/ssma/.test(h) ? 'seg' : /^#\/qualidade/.test(h) ? 'qua' : /^#\/(operacao|frota|manut|config)/.test(h) ? 'ope' : 'fin';
  const caixa = $('.inicio-kpis:not(.ik-pend-w)', tela), grupos = {}, pendentes = [];
  $$('.kpi', caixa).forEach(k => {
    const href = k.getAttribute('href') || '', base = href.split('?')[0];
    if (base && !telaPermitida(base.slice(1))) { k.remove(); return; }   // não mostra indicador de tela que a pessoa não pode abrir
    const item = MENU.filter(m => m[0] !== 'grupo' && m[0] !== 'sub' && (href === m[1] || base === m[1] || base.startsWith(m[1] + '/'))).sort((x, y) => y[1].length - x[1].length)[0];
    const nEl = k.querySelector('.n'), zero = nEl?.textContent.trim() === '0', alerta = k.classList.contains('alerta');
    const icone = /requisi[çc][ãa]o\(ões\) de compra/.test(k.innerText) ? 'carrinho' : /pesquisa de clima/i.test(k.innerText) ? 'conversa' : item?.[3] || 'painel';
    if (nEl && !/^\d+$/.test(nEl.textContent.trim())) nEl.innerHTML = ico('conversa');
    k.classList.toggle('zero', zero);
    k.insertAdjacentHTML('afterbegin', `<div class="k-topo"><span class="k-ic">${ico(icone)}</span><span class="k-st ${alerta ? 'acao' : zero ? 'ok' : 'neutro'}">${alerta ? 'Ação necessária' : zero ? 'Em dia' : 'Acompanhar'}</span></div>`);
    k.insertAdjacentHTML('beforeend', `<span class="k-ver">Ver detalhes ${ico('seta')}</span>`);
    // o que depende da pessoa (aprovar, fechar, corrigir, responder…) vai para o topo do Início
    if (alerta && !zero) pendentes.push(k); else (grupos[secaoDe(href)] ||= []).push(k);
  });
  // a aprovação em destaque (cartão escuro, como a faixa do topo)
  const kAprovar = $$('.kpi', caixa).find(k => k.getAttribute('href') === '#/aprovacoes');
  if (kAprovar && Number(p.aprovar)) kAprovar.classList.add('destaque');
  caixa.innerHTML = SECOES.filter(([c]) => grupos[c]?.length).map(([c, nome, ic]) => {
    const ks = grupos[c].sort((x, y) => (y.classList.contains('destaque') - x.classList.contains('destaque')) || (y.classList.contains('alerta') - x.classList.contains('alerta')) || (x.classList.contains('zero') - y.classList.contains('zero')));
    const nAcao = ks.filter(k => k.classList.contains('alerta')).length;
    return `<section class="ik-sec" data-sec="${c}"><header class="ik-tit"><span class="ik-ic">${ico(ic)}</span><h2>${nome}</h2>
      <span class="ik-cont ${nAcao ? 'acao' : ''}">${nAcao ? `${nAcao} ${nAcao > 1 ? 'pontos' : 'ponto'} de atenção` : 'em dia'}</span></header>
      <div class="ik-grade"></div></section>`; }).join('');
  for (const [c] of SECOES) if (grupos[c]?.length) { const g = $(`.ik-sec[data-sec="${c}"] .ik-grade`, caixa); grupos[c].forEach(k => g.append(k)); }
  { const sp = $('#ik-pend', tela);
    if (pendentes.length) {
      pendentes.sort((x, y) => (y.classList.contains('destaque') - x.classList.contains('destaque')));
      sp.innerHTML = `<header class="ik-tit"><span class="ik-ic">${ico('alerta')}</span><h2>Pendências com você</h2><span class="ik-cont acao">${pendentes.length} ${pendentes.length > 1 ? 'itens dependem' : 'item depende'} de você</span></header><div class="ik-grade"></div>`;
      pendentes.forEach(k => $('.ik-grade', sp).append(k)); sp.parentElement.hidden = false;
    } else sp.parentElement.remove(); }
  { const al = $$('.inicio-kpis .kpi.alerta', tela).length, ap = Number(p.aprovar || 0);
    const nAc = (minhasAcoes || []).length;
    const partes = [ap ? `<b>${ap}</b> item(ns) para aprovar` : '', nAc ? `<b>${nAc}</b> ação(ões) no seu nome` : '', al ? `<b>${al}</b> ponto(s) de atenção` : ''].filter(Boolean);
    $('#ih-resumo', tela).innerHTML = partes.length ? `Hoje você tem ${partes.join(' e ')}.` : 'Tudo em dia por aqui.'; }
  ligarMinhasAcoes(tela, minhasAcoes || []);
  ligarMinhaAgenda(tela, minhaAgenda || []);
  $$('[data-lida]', tela).forEach(b => b.onclick = async e => { e.preventDefault(); await api.alterar('notificacoes', `id=eq.${b.dataset.lida}`, { lida: true }); navegar(); });
  $('#lidas')?.addEventListener('click', async () => {
    await api.alterar('notificacoes', `usuario_id=eq.${estado.usuario.id}&lida=eq.false`, { lida: true }); navegar();
  });
});

// ===================== Início: minhas ações (plano de ação) =====================
const ST_ACAO_TXT = { aberta: ['Aberta', 'amarelo'], em_andamento: ['Em andamento', 'azul'], concluida: ['Concluída', 'verde'], cancelada: ['Cancelada', ''] };
function prazoTxt(prazo) {
  if (!prazo) return ['sem prazo', ''];
  const d = Math.round((new Date(prazo + 'T12:00') - new Date(hojeISO() + 'T12:00')) / 864e5);
  return d < 0 ? [`atrasada há ${-d} dia(s)`, 'atr'] : d === 0 ? ['vence hoje', 'hoje'] : d <= 3 ? [`vence em ${d} dia(s)`, 'perto'] : [`faltam ${d} dias`, ''];
}
function htmlMinhasAcoes(acs) {
  if (!acs.length) return '';
  const atr = acs.filter(a => a.prazo && a.prazo < hojeISO()).length;
  return `<div class="cartao minhas-acoes" id="minhas-acoes"><div class="topo" style="margin:0 0 8px"><div><h2 style="margin:0">${ico('bandeira')} Minhas ações pendentes</h2>
      <p class="muted" style="margin:2px 0 0">${acs.length} pendente(s)${atr ? ` · <b class="txt-verm">${atr} atrasada(s)</b>` : ''}</p></div><a class="btn peq" href="#/planos">Planos de ação</a></div>
    <ul class="ma-lista">${acs.map(a => { const [pt, pc] = prazoTxt(a.prazo); const [st, sc] = ST_ACAO_TXT[a.status] || [a.status, ''];
      return `<li class="${pc}"><div class="ma-txt"><b>${esc(a.descricao)}</b><span class="muted">${esc(a.origem)}${a.criado_por ? ' · por ' + esc(a.criado_por) : ''}</span></div>
        <div class="ma-prazo"><span>${a.prazo ? 'Prazo ' + dataBR(a.prazo) : 'Sem prazo'}</span><span class="ma-pt ${pc}">${pt}</span></div>
        <div class="ma-dir"><span class="tag ${sc}">${st}</span>${(pg => pg ? `<span class="ac-prog">${pg.enviaram}/${pg.total} enviaram</span>` : '')(progEntregas(a))}<button class="btn prim peq" data-acao="${a.modulo}:${a.id}">Abrir</button></div></li>`; }).join('')}</ul></div>`;
}
// ===================== Início: minha agenda (2 semanas) =====================
const AG_TIPO = { integracao_cliente: ['Integração no cliente', 'ag-ouro'], treinamento: ['Treinamento', 'ag-azul'], entrevista: ['Entrevista', 'ag-info'],
  reuniao: ['Reunião', 'ag-verde'], prazo_acao: ['Prazo de ação', 'ag-verm'], prazo_admissao: ['Prazo de admissão', 'ag-amar'] };
const agHora = iso => iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
const agDiaLocal = iso => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const agDia = e => String(e.inicio || '').length > 10 ? agDiaLocal(e.inicio) : String(e.inicio || '').slice(0, 10);
function htmlMinhaAgenda(evs, ini) {
  const hj = hojeISO(), dias = Array.from({ length: 14 }, (_, i) => somaDias(ini, i)), porDia = {};
  evs.forEach(e => (porDia[agDia(e)] ||= []).push(e));
  Object.values(porDia).forEach(l => l.sort((a, b) => (a.dia_todo - b.dia_todo) || String(a.inicio).localeCompare(String(b.inicio))));
  const prox = dias.filter(d => d >= hj && porDia[d]?.length);
  const nSem = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
  return `<div class="cartao ag-cartao" id="minha-agenda"><div class="topo" style="margin:0 0 8px"><div><h2 style="margin:0">${ico('calendario')} Minha agenda</h2>
      <p class="muted" style="margin:2px 0 0">Integrações, treinamentos, entrevistas, reuniões e prazos sob sua responsabilidade · 2 semanas</p></div></div>
    <div class="ag-grade">${nSem.map(n => `<span class="ag-sem">${n}</span>`).join('')}${dias.map(d => { const l = porDia[d] || [];
      return `<button type="button" class="ag-d${d === hj ? ' hoje' : ''}${d < hj ? ' passado' : ''}${l.length ? ' tem' : ''}" data-agdia="${d}" title="${l.map(e => esc(e.titulo)).join('\n')}">
        <b>${Number(d.slice(8))}</b><span class="ag-pts">${l.slice(0, 4).map(e => `<i class="${(AG_TIPO[e.tipo] || [])[1] || ''}"></i>`).join('')}</span></button>`; }).join('')}</div>
    <div class="ag-lista" id="ag-lista">${htmlListaAgenda(prox.length ? prox : [], porDia, hj)}</div>
    <div class="ag-leg">${Object.values(AG_TIPO).map(([t, c]) => `<span><i class="${c}"></i>${t}</span>`).join('')}</div></div>`;
}
function htmlListaAgenda(dias, porDia, hj) {
  if (!dias.length) return '<p class="muted ag-vazio">Nenhum compromisso nas próximas duas semanas.</p>';
  const rot = d => d === hj ? 'Hoje' : d === somaDias(hj, 1) ? 'Amanhã' : `${ferDiaSemanaCurto(d)} ${dataBR(d).slice(0, 5)}`;
  return dias.slice(0, 6).map(d => `<div class="ag-dia"><div class="ag-dia-t">${rot(d)}</div>${porDia[d].map(e => { const [t, c] = AG_TIPO[e.tipo] || [e.tipo, ''];
    return `<a class="ag-ev" href="${esc(e.link || '#/inicio')}"><span class="ag-h ${c}">${e.dia_todo ? '<small>dia</small>' : agHora(e.inicio)}</span><span class="ag-t"><b>${esc(e.titulo)}</b><span class="muted">${esc([t, e.papel, e.sub].filter(Boolean).join(' · '))}</span></span></a>`; }).join('')}</div>`).join('');
}
const ferDiaSemanaCurto = d => ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][new Date(d + 'T12:00').getDay()];
function ligarMinhaAgenda(tela, evs) {
  const porDia = {}; evs.forEach(e => (porDia[agDia(e)] ||= []).push(e));
  $$('[data-agdia]', tela).forEach(b => (b.onclick = () => { const d = b.dataset.agdia; $$('[data-agdia]', tela).forEach(x => x.classList.toggle('sel', x === b));
    $('#ag-lista', tela).innerHTML = porDia[d]?.length ? htmlListaAgenda([d], porDia, hojeISO()) : `<p class="muted ag-vazio">${dataBR(d)}: nenhum compromisso.</p>`; }));
}
const TAB_ACAO = { ssma: 'ssma_acoes', qual: 'qual_acoes', geral: 'acoes_gerais' };

// ===================== Seletor de pessoas (usuários, colaboradores do RH e externos) =====================
let _pessoasAcao = null;
async function pessoasAcao() {
  if (!_pessoasAcao) _pessoasAcao = await api.rpc('pessoas_para_acao').catch(async () =>
    (await usuarios().catch(() => [])).filter(u => u.ativo).map(u => ({ chave: 'u:' + u.id, usuario_id: u.id, nome: u.nome, email: u.email, info: 'usuário' })));
  return _pessoasAcao;
}
const pessoaRef = p => { const o = { nome: p.nome }; if (p.usuario_id) o.usuario_id = p.usuario_id; else if (p.colaborador_id) o.colaborador_id = p.colaborador_id; else if (p.fornecedor_id) o.fornecedor_id = p.fornecedor_id; else o.externo = true; if (p.email && !ehLoginCPF(p.email)) o.email = p.email; if (p.info && (p.fornecedor_id || !p.usuario_id && !p.colaborador_id)) o.info = p.info; return o; };
let _pessoasOrg = null;
async function pessoasOrg() { if (!_pessoasOrg) _pessoasOrg = await api.rpc('pessoas_org').catch(() => pessoasAcao()); return _pessoasOrg; }
const chaveSelPessoa = p => p.usuario_id ? 'u:' + p.usuario_id : p.colaborador_id ? 'c:' + p.colaborador_id : p.fornecedor_id ? 'f:' + p.fornecedor_id : 'x:' + semAcento(p.nome || '');
// ---------- instalar como aplicativo (Android: botão do navegador; iPhone: Adicionar à Tela de Início) ----------
let _evInstalar = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); _evInstalar = e; });
const appInstalado = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
async function instalarApp() {
  if (appInstalado()) return aviso('O Verbo Gestão já está aberto como aplicativo neste aparelho.');
  if (_evInstalar) { _evInstalar.prompt(); const r = await _evInstalar.userChoice.catch(() => null); _evInstalar = null; if (r?.outcome === 'accepted') aviso('Pronto! O ícone do Verbo Gestão foi para a tela inicial.'); return; }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const safari = ios && !/crios|fxios|edgios/i.test(navigator.userAgent);
  const url = location.origin + location.pathname;
  await modal(`<form><h2>Instalar o Verbo Gestão no celular</h2>
    ${ios ? `<ol class="passos-inst">${safari ? '' : '<li>No iPhone, a instalação só funciona pelo <b>Safari</b>: abra este endereço nele: <b>' + esc(url) + '</b></li>'}
        <li>Toque no botão <b>Compartilhar</b> (o quadrado com a seta para cima, na barra de baixo).</li><li>Role e toque em <b>Adicionar à Tela de Início</b>.</li><li>Toque em <b>Adicionar</b>. O ícone da Verbo aparece na tela inicial e abre como aplicativo.</li></ol>`
      : `<ol class="passos-inst"><li>Abra este endereço no <b>Google Chrome</b> do celular: <b>${esc(url)}</b></li><li>Toque no menu <b>⋮</b> (canto superior direito).</li>
        <li>Toque em <b>Instalar app</b> (ou <b>Adicionar à tela inicial › Instalar</b>).</li><li>Confirme. O ícone da Verbo aparece na tela inicial e abre como aplicativo.</li></ol>
        <p class="muted">Se aparecer "Abrir no app" do app de <b>Abastecimentos</b> da Verbo, toque em continuar no navegador e use o menu ⋮ › Instalar app. Os dois aplicativos podem ficar instalados juntos.</p>`}
    <p class="muted">Depois de instalado, o login fica salvo e as atualizações chegam sozinhas.</p>
    <div class="rodape"><button type="button" class="btn" data-copiar>Copiar endereço</button><button type="button" class="btn prim" data-fechar>Entendi</button></div></form>`,
    { aoAbrir: f => { $('[data-copiar]', f).onclick = () => navigator.clipboard?.writeText(url).then(() => aviso('Endereço copiado.')).catch(() => {}); } });
}
// RG com órgão/UF sem repetir a UF (ex.: 1493427806 · SSP/BA)
function fmtRG(rg, orgao, uf, sep = ' · ') { let o = String(orgao || '').trim().toUpperCase().replace(/[\s/\-.]+/g, ''); const u = String(uf || '').trim().toUpperCase();
  if (u && o.length > u.length && o.endsWith(u)) o = o.slice(0, -u.length); return [String(rg || '').trim(), [o, u].filter(Boolean).join('/')].filter(Boolean).join(sep); }
const nomesPessoas = l => (l || []).map(p => p.nome + (p.externo ? ' (externo)' : '')).join(', ');
const lerPessoas = v => { try { const a = JSON.parse(v || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } };
const htmlSelPessoas = (name, sel = [], ph = 'Buscar pessoa…', max = 0) => `<div class="selpes" data-selpes="${name}"${max ? ` data-max="${max}"` : ''}><input type="hidden" name="${name}" value="${esc(JSON.stringify(sel || []))}">
  <div class="selpes-chips"></div><input type="text" class="selpes-q" placeholder="${esc(ph)}" autocomplete="off"><div class="selpes-lista" hidden></div></div>`;
function ligarSelPessoas(raiz, pessoas) {
  $$('[data-selpes]', raiz).forEach(box => {
    if (box._ligado) return; box._ligado = true;
    const hid = $('input[type=hidden]', box), q = $('.selpes-q', box), lista = $('.selpes-lista', box), chips = $('.selpes-chips', box);
    let sel = lerPessoas(hid.value), achados = [];
    const gravar = () => { hid.value = JSON.stringify(sel); desenhar(); };
    const desenhar = () => { chips.innerHTML = sel.map((p, i) => `<span class="selpes-chip${p.externo ? ' ext' : ''}">${esc(p.nome)}${p.externo ? ' <small>externo</small>' : p.fornecedor_id ? ' <small>fornecedor</small>' : p.colaborador_id ? ' <small>RH</small>' : ''}<button type="button" data-tira="${i}" title="Tirar">✕</button></span>`).join(''); };
    const fechar = () => { lista.hidden = true; };
    const mostrar = () => {
      const t = q.value.trim(), ja = new Set(sel.map(chaveSelPessoa));
      achados = pessoas.filter(p => !ja.has(chaveSelPessoa(p)) && casaBusca(p.nome + ' ' + (p.info || '') + ' ' + (p.email || ''), t)).slice(0, 40);
      lista.innerHTML = achados.map((p, i) => `<div class="selpes-op" data-op="${i}"><b>${esc(p.nome)}</b><span class="muted">${esc(p.info || '')}</span></div>`).join('')
        + `<div class="selpes-op ext" data-ext>+ Pessoa externa${t ? `: <b>${esc(t)}</b>` : '…'}</div>`;
      lista.hidden = false;
    };
    const externo = async () => {
      const r = await modal(`<form><h2>Pessoa externa</h2><div class="form"><label class="campo largo">Nome *<input name="nome" required value="${esc(q.value.trim())}"></label>
        <label class="campo largo">Empresa / função<input name="info" placeholder="Ex.: Consultor, cliente Bracell"></label><label class="campo largo">E-mail<input type="email" name="email"></label></div>
        <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Incluir</button></div></form>`);
      if (!r?.nome) return;
      if (box.dataset.max === '1') sel = [];
      sel.push({ nome: r.nome + (r.info ? ' · ' + r.info : ''), externo: true, ...(r.email ? { email: r.email } : {}) }); q.value = ''; gravar(); fechar();
    };
    const escolher = i => { const p = achados[i]; if (!p) return; if (box.dataset.max === '1') sel = []; sel.push(pessoaRef(p)); q.value = ''; gravar(); if (box.dataset.max === '1') { fechar(); q.blur(); hid.dispatchEvent(new Event('change', { bubbles: true })); } else { mostrar(); q.focus(); } };
    q.addEventListener('focus', mostrar); q.addEventListener('input', mostrar);
    q.addEventListener('blur', () => setTimeout(fechar, 150));
    q.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); if (achados.length && q.value.trim()) escolher(0); else if (q.value.trim()) externo(); }
      else if (e.key === 'Escape') { e.stopPropagation(); fechar(); }
      else if (e.key === 'Backspace' && !q.value && sel.length) { sel.pop(); gravar(); }
    });
    lista.addEventListener('mousedown', e => { e.preventDefault(); const o = e.target.closest('[data-op]'); if (o) escolher(Number(o.dataset.op)); else if (e.target.closest('[data-ext]')) externo(); });
    chips.addEventListener('click', e => { const b = e.target.closest('[data-tira]'); if (b) { sel.splice(Number(b.dataset.tira), 1); gravar(); } });
    desenhar();
  });
}
const respsDaAcao = a => a.responsaveis?.length ? a.responsaveis : a.responsavel_id ? [{ usuario_id: a.responsavel_id, nome: a.responsavel || '' }] : [];
const ehRespAcao = a => (a.responsaveis_ids?.length ? a.responsaveis_ids : [a.responsavel_id]).includes(estado.usuario.id);
// ação com vários responsáveis: cada um envia a sua parte; só conclui quando todos enviarem
function progEntregas(a) {
  const ids = a.modulo === 'geral' ? (a.responsaveis_ids || []) : []; if (ids.length < 2) return null;
  const env = new Map((a.entregas || []).map(e => [e.usuario_id, e]));
  return { total: ids.length, enviaram: ids.filter(i => env.has(i)).length, env, minha: env.get(estado.usuario.id) };
}
const htmlRespsEntrega = (a, pg) => respsDaAcao(a).map(p => p.usuario_id && pg.env.has(p.usuario_id) ? `<span class="ac-p ok" title="Enviou">${esc(p.nome)}</span>` : `<span class="ac-p" title="${p.usuario_id ? 'Falta enviar' : 'Externo'}">${esc(p.nome)}</span>`).join(' ');
function htmlRepact(a) {
  const n = Number(a.repactuacoes || 0) || (a.prazo_original && a.prazo && a.prazo_original !== a.prazo ? 1 : 0);
  return n ? `<div class="muted" style="font-size:12px">repactuada${a.prazo_original && a.prazo_original !== a.prazo ? ' · orig. ' + dataBR(a.prazo_original) : Number(a.repactuacoes) > 1 ? ` (${a.repactuacoes}×)` : ''}</div>` : '';
}
async function repactuarAcao(a) {
  const r = await modal(`<form><h2>Repactuar prazo</h2><p class="muted">${esc(a.descricao)}</p><div class="form">
    <div><div class="muted">Prazo atual</div><b>${a.prazo ? dataBR(a.prazo) : 'sem prazo'}</b></div>
    <label class="campo">Novo prazo *<input type="date" name="prazo" required min="${hojeISO()}" value="${a.prazo && a.prazo > hojeISO() ? somaDias(a.prazo, 7) : somaDias(hojeISO(), 7)}"></label>
    <label class="campo largo">Motivo *<textarea name="motivo" rows="2" required placeholder="Por que o prazo foi postergado"></textarea></label></div>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Repactuar</button></div></form>`,
    { validar: d => d.prazo === a.prazo ? 'O novo prazo é igual ao atual.' : null });
  if (!r) return false;
  try { await api.rpc('repactuar_acao', { p_modulo: a.modulo, p_id: a.id, p_prazo: r.prazo, p_motivo: r.motivo }); aviso('Prazo repactuado para ' + dataBR(r.prazo) + '.'); return true; } catch (err) { falha(err); return false; }
}
async function devolverAcao(a) {
  const r = await modal(`<form><h2>Devolver ação</h2><p class="muted">${esc(a.descricao)}</p>
    ${a.evidencia ? `<div class="ma-det"><div class="muted">O que foi informado como feito</div><div style="white-space:pre-line">${esc(a.evidencia)}</div></div>` : ''}
    <div class="form">
      <div class="campo largo"><span>Motivo da devolução *</span>
        <label class="check"><input type="radio" name="tipo" value="mais_informacoes" checked> Pedir mais informações / evidência</label>
        <label class="check"><input type="radio" name="tipo" value="nao_atendeu"> Não atendeu ao pedido da ação</label></div>
      <label class="campo largo">O que falta ou o que precisa ser refeito *<textarea name="motivo" rows="3" required placeholder="Ex.: falta o modelo do kit com fotos e orçamento; o que foi enviado foi só a sugestão"></textarea></label>
      <label class="campo">Novo prazo (opcional)<input type="date" name="prazo" min="${hojeISO()}" value="${somaDias(hojeISO(), 7)}"></label>
      <p class="muted largo" style="margin:0">A ação volta para "Em andamento" e os responsáveis recebem o aviso com o seu comentário.</p></div>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn perigo">Devolver</button></div></form>`,
    { validar: d => !d.motivo?.trim() ? 'Explique o que falta ou por que não atendeu.' : null });
  if (!r) return false;
  try { await api.rpc('devolver_acao', { p_modulo: a.modulo, p_id: a.id, p_tipo: r.tipo, p_motivo: r.motivo.trim(), p_prazo: r.prazo || null });
    aviso('Ação devolvida aos responsáveis.'); return true; } catch (err) { falha(err); return false; }
}
async function abrirAcao(a) {
  const tabela = TAB_ACAO[a.modulo];
  const gestor = tem('administrador', 'diretoria');
  const podeEditar = a.modulo === 'geral' && (a.criado_por_id === estado.usuario.id || gestor);
  const ehResp = ehRespAcao(a);
  const linkMod = a.modulo === 'ssma' ? '' : a.modulo === 'qual' && a.nc_id && telaPermitida('/qualidade/nc') ? '#/qualidade/nc/ver/' + a.nc_id : '';
  const [pes, hist, devs] = await Promise.all([podeEditar ? pessoasAcao() : [],
    api.listar('acao_repactuacoes', `modulo=eq.${a.modulo}&acao_id=eq.${a.id}&order=criado_em&select=prazo_anterior,prazo_novo,motivo,criado_em,u:usuarios(nome)`).catch(() => []),
    api.listar('acao_devolucoes', `modulo=eq.${a.modulo}&acao_id=eq.${a.id}&order=criado_em&select=tipo,motivo,evidencia_anterior,criado_em,u:usuarios(nome)`).catch(() => [])]);
  // quem abriu a ação, a gestão e o SSMA/Qualidade nos seus módulos podem devolver uma ação concluída (o servidor confere o dono do plano)
  const podeDevolver = a.status === 'concluida' && (podeEditar || gestor || a.criado_por_id === estado.usuario.id || (a.modulo === 'ssma' && tem('ssma')) || (a.modulo === 'qual' && tem('qualidade')) || (!!a.plano_criado_por && a.plano_criado_por === estado.usuario.id));
  const [pt] = prazoTxt(a.prazo);
  const aberta = ['aberta', 'em_andamento'].includes(a.status);
  const pg = progEntregas(a);
  const podeForcar = !!pg && (gestor || a.criado_por_id === estado.usuario.id || (!!a.plano_criado_por && a.plano_criado_por === estado.usuario.id));
  const minhaParte = !!pg && ehResp && aberta;
  const podeRepact = aberta && (podeEditar || ehResp || gestor || (a.modulo === 'ssma' && tem('ssma')) || (a.modulo === 'qual' && tem('qualidade')));
  const nomesResp = nomesPessoas(a.responsaveis) || a.responsavel;
  const entAnx = { geral: 'acao_geral', ssma: 'ssma_acao', qual: 'qual_acao' }[a.modulo];
  const anxHtml = await htmlAnexos(entAnx, a.id).catch(() => '');
  const r = await modal(`<form><h2>Ação</h2>
    ${podeEditar ? `<div class="form">
        <label class="campo largo">O que fazer<textarea name="descricao" rows="2" required>${esc(a.descricao)}</textarea></label>
        <div class="campo largo">Responsável(is)${htmlSelPessoas('resp', respsDaAcao(a), 'Buscar colaborador, usuário ou incluir externo…')}</div>
        ${a.prazo ? `<div class="campo"><span>Prazo</span><b style="padding:8px 0">${dataBR(a.prazo)} <span class="muted">(${pt})</span></b></div>` : '<label class="campo">Prazo<input type="date" name="prazo"></label>'}</div>`
      : `<div class="ma-det"><p><b>${esc(a.descricao)}</b></p><p class="muted">${esc(a.origem)}${nomesResp ? ' · ' + esc(nomesResp) : ''}${a.criado_por ? ' · aberta por ' + esc(a.criado_por) : ''} · ${a.prazo ? 'prazo ' + dataBR(a.prazo) + ' (' + pt + ')' : 'sem prazo'}</p></div>`}
    ${podeRepact && a.prazo ? '<p style="margin:8px 0 0"><button type="button" class="btn peq" id="ac-repact">↻ Repactuar prazo</button></p>' : ''}
    ${devs.length ? `<div class="ac-dev"><div class="muted">Devoluções</div><ul class="ac-hist">${devs.map(d => `<li><span class="tag ${d.tipo === 'nao_atendeu' ? 'vermelho' : 'amarelo'}">${d.tipo === 'nao_atendeu' ? 'Não atendeu' : 'Faltam informações'}</span> ${esc(d.motivo)} <span class="muted">· ${esc(d.u?.nome || '')} em ${dataHoraBR(d.criado_em)}</span>${d.evidencia_anterior ? `<div class="muted" style="font-size:12px">O que tinha sido informado: ${esc(d.evidencia_anterior)}</div>` : ''}</li>`).join('')}</ul></div>` : ''}
    ${hist.length ? `<div style="margin-top:10px"><div class="muted">Repactuações</div><ul class="ac-hist">${hist.map(h => `<li>${h.prazo_anterior ? dataBR(h.prazo_anterior) : 'sem prazo'} → <b>${dataBR(h.prazo_novo)}</b> · ${esc(h.motivo)} <span class="muted">· ${esc(h.u?.nome || '')} em ${dataHoraBR(h.criado_em)}</span></li>`).join('')}</ul></div>` : ''}
    ${pg ? `<div class="ac-ent"><div><b>${pg.enviaram} de ${pg.total}</b> responsáveis enviaram a sua parte${aberta ? ' <span class="muted">· a ação só conclui quando todos enviarem</span>' : ''}</div>
      <ul class="ac-ent-l">${respsDaAcao(a).filter(p => p.usuario_id).map(p => { const e = pg.env.get(p.usuario_id); return `<li class="${e ? 'ok' : ''}"><b>${esc(p.nome)}</b> <span class="muted">· ${e ? 'enviou em ' + dataHoraBR(e.criado_em) : 'falta enviar'}</span>${e ? `<div class="ac-ent-t">${esc(e.evidencia)}</div>` : ''}</li>`; }).join('')}</ul></div>` : ''}
    <div class="form" style="margin-top:12px">
      <label class="campo">Situação<select name="status">${['aberta', 'em_andamento', ...(!pg || podeForcar || a.status === 'concluida' ? ['concluida'] : []), ...(podeEditar ? ['cancelada'] : [])].map(k => `<option value="${k}" ${k === a.status ? 'selected' : ''}>${ST_ACAO_TXT[k][0]}</option>`).join('')}</select></label>
      <label class="campo largo">${minhaParte ? 'O que você fez (a sua parte)' : 'O que foi feito'}<textarea name="evidencia" rows="3"${minhaParte ? ' placeholder="Descreva a sua parte e anexe o que for preciso"' : ''}>${esc(minhaParte ? pg.minha?.evidencia || '' : a.evidencia || '')}</textarea></label>
      <div class="campo largo"><span>Anexos da ação</span>${anxHtml}</div>
      ${podeEditar || ehResp || gestor ? camposAnexoHtml() : ''}</div>
    ${linkMod ? `<p class="muted"><a href="${linkMod}" data-fechar>Ver no módulo de ${a.modulo === 'ssma' ? 'Segurança' : 'Qualidade'}</a></p>` : ''}
    ${a.plano_id && !location.hash.startsWith('#/planos/ver/') ? `<p class="muted">Referência: <a href="#/planos/ver/${a.plano_id}" data-fechar>${esc(a.origem)}</a></p>` : ''}
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button>${podeDevolver ? '<button type="button" class="btn perigo" id="ac-devolver">↩ Devolver ação</button>' : ''}${podeEditar || ehResp || gestor ? `<button class="btn${aberta ? '' : ' prim'}" value="salvar">Salvar</button>${podeForcar && aberta ? '<button class="btn" value="forcar" title="Conclui mesmo sem a parte de todos">Concluir para todos</button>' : ''}${aberta && (!pg || ehResp) ? `<button class="btn ok" value="concluir">${!pg ? '✔ Concluir ação' : pg.minha ? '✔ Reenviar minha parte' : '✔ Enviar minha parte'}</button>` : ''}` : ''}</div></form>`,
    { aoAbrir: (f, fechar) => { if (podeEditar) { $('.modal', f).classList.add('modal-largo'); ligarSelPessoas(f, pes); }
        $('#ac-repact', f)?.addEventListener('click', async () => { if (await repactuarAcao(a)) { fechar(null); navegar(); } });
        $('#ac-devolver', f)?.addEventListener('click', async () => { if (await devolverAcao(a)) { fechar(null); navegar(); } }); },
      validar: d => (d._acao === 'concluir' || d._acao === 'forcar' || (d.status === 'concluida' && a.status !== 'concluida')) && !(pg?.enviaram && d._acao !== 'concluir') && !d.evidencia?.trim() && !d.arquivos?.length && !d.links?.trim() && (minhaParte || !anxHtml.includes('data-arquivo')) ? 'Para concluir, descreva o que foi feito ou anexe a evidência.'
        : podeEditar && !lerPessoas(d.resp).length ? 'Inclua pelo menos um responsável.' : null });
  if (!r) return false;
  if (pg) return salvarAcaoVarios(a, r, { tabela, entAnx, pg, podeEditar, minhaParte });
  if (r._acao === 'concluir') r.status = 'concluida';
  if (r.status === 'concluida' && !r.evidencia?.trim()) r.evidencia = 'Evidência em anexo' + (r.arquivos?.length ? ': ' + r.arquivos.map(f => f.name).join(', ') : r.links?.trim() ? ': ' + r.links.trim() : '.');
  const dados = { status: r.status, evidencia: r.evidencia?.trim() || null };
  if (podeEditar) Object.assign(dados, { descricao: r.descricao.trim(), responsaveis: lerPessoas(r.resp), ...(a.prazo ? {} : { prazo: r.prazo || null }) });
  try { await salvarAnexosForm(entAnx, a.id, r); await api.alterar(tabela, `id=eq.${a.id}`, dados); aviso(r.status === 'concluida' ? 'Ação concluída.' : 'Ação atualizada.'); return true; } catch (err) { falha(err); return false; }
}
// ação com vários responsáveis: "Enviar minha parte" registra só a entrega de quem enviou; quem abriu / dono do plano / diretoria pode concluir para todos
async function salvarAcaoVarios(a, r, { tabela, entAnx, pg, podeEditar, minhaParte }) {
  const ed = podeEditar ? { descricao: r.descricao.trim(), responsaveis: lerPessoas(r.resp), ...(a.prazo ? {} : { prazo: r.prazo || null }) } : {};
  const forca = r._acao === 'forcar' || (r.status === 'concluida' && a.status !== 'concluida');
  const faltam = respsDaAcao(a).filter(p => p.usuario_id && !pg.env.has(p.usuario_id)).map(p => p.nome);
  if (forca && faltam.length && !(await confirmar(`Concluir para todos sem a parte de ${faltam.join(', ')}?`, { botao: 'Concluir para todos' }))) return false;
  try {
    await salvarAnexosForm(entAnx, a.id, r);
    if (r._acao === 'concluir') {
      if (Object.keys(ed).length) await api.alterar(tabela, `id=eq.${a.id}`, ed);
      const ev = r.evidencia?.trim() || 'Evidência em anexo' + (r.arquivos?.length ? ': ' + r.arquivos.map(f => f.name).join(', ') : r.links?.trim() ? ': ' + r.links.trim() : '.');
      const x = await api.rpc('entregar_acao', { p_id: a.id, p_evidencia: ev });
      aviso(x.concluida ? 'Todos enviaram: ação concluída.' : `Sua parte foi enviada (${x.enviaram} de ${x.total}). Falta: ${x.faltam}.`);
      return true;
    }
    const dados = { ...ed, status: forca ? 'concluida' : r.status };
    const nota = r.evidencia?.trim();
    if (forca) dados.evidencia = [...[...pg.env.values()].map(e => `${e.nome}: ${e.evidencia}`),
      `${estado.usuario.nome} concluiu para todos${faltam.length ? ' (sem a parte de ' + faltam.join(', ') + ')' : ''}${nota && !minhaParte ? ': ' + nota : ''}`,
      ...(nota && minhaParte ? [`${estado.usuario.nome}: ${nota}`] : [])].join('\n\n');
    else if (!minhaParte) dados.evidencia = nota || null;
    await api.alterar(tabela, `id=eq.${a.id}`, dados);
    aviso(forca ? 'Ação concluída para todos.' : 'Ação atualizada.'); return true;
  } catch (err) { falha(err); return false; }
}
function ligarMinhasAcoes(tela, acs) {
  $$('[data-acao]', tela).forEach(b => (b.onclick = async () => {
    const [mod, id] = b.dataset.acao.split(':'); const a = acs.find(x => x.id === id && x.modulo === mod); if (!a) return;
    if (await abrirAcao(a)) navegar();
  }));
}

// ===================== Planos de ação (todos) =====================
// Toda ação geral nasce de um PLANO (reunião, auditoria, visita…): é a referência dela.
const PERIOD_TXT = { semanal: 'semanal', quinzenal: 'quinzenal', mensal: 'mensal' };
const TIPOS_PLANO = { reuniao: 'Reunião', auditoria: 'Auditoria', inspecao: 'Inspeção', visita: 'Visita', indicador: 'Análise de indicador', projeto: 'Projeto', outro: 'Outro' };
const SETORES_PLANO = ['Diretoria', 'Financeiro', 'Compras', 'Operação', 'Manutenção', 'Almoxarifado', 'RH', 'DP', 'Segurança', 'Qualidade', 'Administrativo'];
const linhaAcaoHtml = (us, i) => `<tr data-linha="${i}"><td><input name="d_${i}" placeholder="O que fazer"></td>
  <td>${htmlSelPessoas('r_' + i, [], 'Responsável(is)…')}</td>
  <td><input type="date" name="p_${i}" value="${somaDias(hojeISO(), 7)}"></td>
  <td><label class="btn peq anx-linha" title="Anexar arquivos nesta ação">📎<span data-qt></span><input type="file" name="a_${i}" multiple hidden></label></td><td><button type="button" class="btn peq" data-tirar title="Tirar linha">✕</button></td></tr>`;
const blocoAcoesHtml = us => `<h3 style="margin:14px 0 6px">Ações</h3>
  <div class="tabela-wrap"><table class="pl-linhas"><thead><tr><th>O que fazer</th><th style="width:36%">Responsável(is)</th><th style="width:150px">Prazo</th><th style="width:52px">Anexo</th><th style="width:44px"></th></tr></thead>
  <tbody>${[0, 1, 2].map(i => linhaAcaoHtml(us, i)).join('')}</tbody></table></div>
  <button type="button" class="btn peq" data-mais-linha style="margin-top:8px">+ Linha</button>`;
function ligarLinhasAcao(f, us) {
  let n = $$('tr[data-linha]', f).length;
  ligarSelPessoas(f, us);
  f.addEventListener('click', e => {
    if (e.target.closest('[data-mais-linha]')) { $('.pl-linhas tbody', f).insertAdjacentHTML('beforeend', linhaAcaoHtml(us, n++)); ligarSelPessoas(f, us); $$('.pl-linhas tbody tr', f).at(-1).querySelector('input').focus(); }
    const t = e.target.closest('[data-tirar]'); if (t) t.closest('tr').remove();
  });
  f.addEventListener('change', e => { if (e.target.matches('input[type=file][name^="a_"]')) { const q = e.target.files.length; e.target.closest('label').querySelector('[data-qt]').textContent = q ? ' ' + q : ''; } });
}
const lerLinhasAcao = d => Object.keys(d).filter(k => /^d_\d+$/.test(k) && String(d[k]).trim()).map(k => { const i = k.slice(2); return { descricao: String(d[k]).trim(), responsaveis: lerPessoas(d['r_' + i]), prazo: d['p_' + i] || null, _arq: d['a_' + i] || [] }; });
const validarLinhas = (d, obrigatoria) => { const ls = lerLinhasAcao(d); if (obrigatoria && !ls.length) return 'Inclua pelo menos uma ação.';
  return ls.some(l => !l.responsaveis.length) ? 'Inclua o responsável de cada ação.' : ls.some(l => !l.prazo) ? 'Informe o prazo de cada ação.' : null; };
async function salvarAcoesDoPlano(planoId, linhas, reuniaoId = null) {
  if (linhas.length) {
    const criadas = await api.inserir('acoes_gerais', linhas.map(({ _arq, ...l }) => ({ ...l, plano_id: planoId, ...(reuniaoId ? { reuniao_id: reuniaoId } : {}) })));
    for (let k = 0; k < linhas.length; k++) if (linhas[k]._arq?.length && criadas[k]) await anexar('acao_geral', criadas[k].id, linhas[k]._arq);
  }
  return linhas.some(l => l.responsaveis.some(p => p.usuario_id && p.usuario_id !== estado.usuario.id));
}
async function modalPlano(p = null) {
  const us = await pessoasAcao();
  const partIni = p?.participantes_lista?.length ? p.participantes_lista : String(p?.participantes || '').split(/[,;\n]+/).map(x => x.trim()).filter(Boolean).map(nome => ({ nome, externo: true }));
  const r = await modal(`<form><h2>${p ? 'Editar plano' : 'Novo plano de ação'}</h2><div class="form">
      <label class="campo">Origem<select name="tipo" required>${Object.entries(TIPOS_PLANO).map(([k, t]) => `<option value="${k}" ${k === (p?.tipo || 'reuniao') ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo"><span data-rot-data>${p?.recorrente ? 'Data da 1ª reunião' : 'Data'}</span><input type="date" name="data" value="${p?.data || hojeISO()}" required></label>
      <div class="campo largo" data-recorr ${(p?.tipo || 'reuniao') === 'reuniao' ? '' : 'hidden'}><label class="check"><input type="checkbox" name="recorrente" ${p?.recorrente ? 'checked' : ''}> Reunião ordinária (se repete): um plano só, com cada encontro registrado na sua data</label>
        <select name="periodicidade" style="max-width:220px;margin-top:6px" ${p?.recorrente ? '' : 'hidden'}>${[['semanal', 'Semanal'], ['quinzenal', 'Quinzenal'], ['mensal', 'Mensal']].map(([k, t]) => `<option value="${k}" ${k === (p?.periodicidade || 'semanal') ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <label class="campo">Setor<select name="setor"><option value="">—</option>${SETORES_PLANO.map(x => `<option ${x === p?.setor ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <label class="campo largo">Título / assunto<input name="titulo" required value="${esc(p?.titulo || '')}" placeholder="Ex.: Reunião de resultados de outubro; Auditoria interna ISO 9001"></label>
      <div class="campo largo">Participantes${htmlSelPessoas('participantes', partIni, 'Buscar colaborador, usuário ou incluir externo…')}</div>
      <label class="campo largo">Resumo / pauta<textarea name="descricao" rows="2">${esc(p?.descricao || '')}</textarea></label>
      ${camposAnexoHtml('arquivos_plano', 'links_plano')}</div>
    ${p ? '' : blocoAcoesHtml(us)}
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">${p ? 'Salvar' : 'Criar plano'}</button></div></form>`,
    { aoAbrir: f => { $('.modal', f).classList.add('modal-largo'); ligarSelPessoas(f, us); if (!p) ligarLinhasAcao(f, us);
        const fm = $('form', f), sinc = () => { const reu = fm.tipo.value === 'reuniao'; $('[data-recorr]', f).hidden = !reu; if (!reu) fm.recorrente.checked = false;
          fm.periodicidade.hidden = !fm.recorrente.checked; $('[data-rot-data]', f).textContent = fm.recorrente.checked ? 'Data da 1ª reunião' : 'Data'; };
        fm.tipo.addEventListener('change', sinc); fm.recorrente.addEventListener('change', sinc); }, validar: d => !d.titulo?.trim() ? 'Informe o título.' : p ? null : validarLinhas(d, true) });
  if (!r) return null;
  const recorr = r.tipo === 'reuniao' && !!r.recorrente;
  const dados = { tipo: r.tipo, data: r.data, setor: r.setor || null, titulo: r.titulo.trim(), participantes: nomesPessoas(lerPessoas(r.participantes)) || null, participantes_lista: lerPessoas(r.participantes), descricao: r.descricao?.trim() || null,
    recorrente: recorr, periodicidade: recorr ? r.periodicidade || 'semanal' : null };
  // reunião ordinária: o 1º encontro fica registrado na data do plano (e as ações sem reunião passam a apontar para ele)
  const primeiraReuniao = async planoId => {
    let [reu] = await api.listar('plano_reunioes', `plano_id=eq.${planoId}&data=eq.${r.data}`);
    if (!reu) [reu] = await api.inserir('plano_reunioes', { plano_id: planoId, data: r.data, participantes_lista: dados.participantes_lista, ata: dados.descricao });
    return reu.id;
  };
  try {
    if (p) { await api.alterar('planos', `id=eq.${p.id}`, dados); await salvarAnexosForm('plano', p.id, r, 'arquivos_plano', 'links_plano');
      if (recorr && !p.recorrente) { const rid = await primeiraReuniao(p.id); await api.alterar('acoes_gerais', `plano_id=eq.${p.id}&reuniao_id=is.null`, { reuniao_id: rid }).catch(() => {}); }
      aviso('Plano atualizado.'); return p.id; }
    const [np] = await api.inserir('planos', dados);
    await salvarAnexosForm('plano', np.id, r, 'arquivos_plano', 'links_plano');
    const avisou = await salvarAcoesDoPlano(np.id, lerLinhasAcao(r), recorr ? await primeiraReuniao(np.id) : null);
    aviso(`Plano ${np.numero} criado${avisou ? ' e responsáveis avisados' : ''}.`); return np.id;
  } catch (err) { falha(err); return null; }
}
// registrar (ou abrir) um encontro de reunião ordinária: data, participantes, ata e as ações novas que surgiram nele
async function modalReuniao(p, reus, acs, x = null) {
  const us = await pessoasAcao();
  const ult = reus[0];
  const partIni = x ? x.participantes_lista : ult?.participantes_lista?.length ? ult.participantes_lista : p.participantes_lista || [];
  const pend = acs.filter(a => ['aberta', 'em_andamento'].includes(a.status) && (!x || a.reuniao_id !== x.id));
  const podeEd = !x || x.criado_por === estado.usuario.id || p.criado_por === estado.usuario.id || tem('administrador', 'diretoria') || (x.participantes_lista || []).some(q => q.usuario_id === estado.usuario.id);
  const r = await modal(`<form><h2>${x ? 'Reunião de ' + dataBR(x.data) : 'Registrar reunião'}</h2><p class="muted">${esc(p.titulo)}</p><div class="form">
      <label class="campo">Data da reunião<input type="date" name="data" required value="${x?.data || hojeISO()}" ${x ? 'disabled' : ''}></label>
      <div class="campo largo">Participantes${htmlSelPessoas('participantes', partIni, 'Buscar colaborador, usuário ou incluir externo…')}</div>
      <label class="campo largo">Ata / assuntos tratados<textarea name="ata" rows="4" placeholder="O que foi discutido e decidido nesta reunião">${esc(x?.ata || '')}</textarea></label></div>
    ${!x && pend.length ? `<div class="ma-det" style="margin-top:10px"><b>${pend.length} ação(ões) em aberto de reuniões anteriores</b> — atualize na lista de ações do plano.<ul class="ac-hist">${pend.slice(0, 8).map(a => `<li>${esc(a.descricao)} <span class="muted">· ${esc(a.responsavel || '')}${a.prazo ? ' · prazo ' + dataBR(a.prazo) : ''}</span></li>`).join('')}${pend.length > 8 ? `<li class="muted">e mais ${pend.length - 8}…</li>` : ''}</ul></div>` : ''}
    ${x ? '' : blocoAcoesHtml(us).replace('<h3 style="margin:14px 0 6px">Ações</h3>', '<h3 style="margin:14px 0 6px">Ações novas desta reunião <span class="muted" style="font-weight:400;font-size:13px">(opcional)</span></h3>')}
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button>${x ? `<button type="button" class="btn" data-acoes-reu>+ Ações nesta reunião</button>` : ''}${podeEd ? `<button class="btn prim">${x ? 'Salvar' : 'Registrar reunião'}</button>` : ''}</div></form>`,
    { aoAbrir: (f, fechar) => { $('.modal', f).classList.add('modal-largo'); ligarSelPessoas(f, us); if (!x) ligarLinhasAcao(f, us);
        $('[data-acoes-reu]', f)?.addEventListener('click', async () => { fechar(null); if (await modalAcoesNoPlano(p.id, x.id)) navegar(); }); },
      validar: d => { if (!x && reus.some(q => q.data === d.data)) return `Já existe a reunião de ${dataBR(d.data)}: abra-a na lista de reuniões.`;
        return x ? null : validarLinhas(d, false); } });
  if (!r) return false;
  const dados = { participantes_lista: lerPessoas(r.participantes), ata: r.ata?.trim() || null };
  try {
    if (x) { await api.alterar('plano_reunioes', `id=eq.${x.id}`, dados); aviso('Reunião atualizada.'); return true; }
    const [nr] = await api.inserir('plano_reunioes', { plano_id: p.id, data: r.data, ...dados });
    const linhas = lerLinhasAcao(r);
    const avisou = await salvarAcoesDoPlano(p.id, linhas, nr.id);
    aviso(`Reunião de ${dataBR(r.data)} registrada${linhas.length ? ` com ${linhas.length} ação(ões)` : ''}${avisou ? ' · responsáveis avisados' : ''}.`); return true;
  } catch (err) { falha(err); return false; }
}
async function modalAcoesNoPlano(planoId, reuniaoIni = null) {
  const us = await pessoasAcao();
  let pid = planoId;
  let opPlanos = '';
  const plano = pid ? await api.um('planos', `id=eq.${pid}&select=recorrente`).catch(() => null) : null;
  const reus = plano?.recorrente ? await api.listar('plano_reunioes', `plano_id=eq.${pid}&ativo=eq.true&order=data.desc&select=id,data`).catch(() => []) : [];
  if (reus.length) opPlanos = `<label class="campo">Surgiu na reunião de<select name="reuniao">${reus.map((x, i) => `<option value="${x.id}" ${(reuniaoIni ? x.id === reuniaoIni : i === 0) ? 'selected' : ''}>${dataBR(x.data)}</option>`).join('')}</select></label>`;
  if (!pid) { const ps = await api.rpc('planos_lista').catch(() => []);
    opPlanos = `<label class="campo largo">Plano de origem (referência)<select name="plano" required><option value="">Escolha a reunião, auditoria…</option><option value="__novo">+ Criar novo plano</option>${ps.map(p => `<option value="${p.id}">${esc(p.recorrente ? p.titulo + ' (' + (PERIOD_TXT[p.periodicidade] || 'ordinária') + ')' : TIPOS_PLANO[p.tipo] + ' ' + dataBR(p.data) + ' · ' + p.titulo)}</option>`).join('')}</select></label>`; }
  const r = await modal(`<form><h2>Lançar ações</h2>${opPlanos ? `<div class="form">${opPlanos}</div>` : ''}${blocoAcoesHtml(us)}
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Lançar</button></div></form>`,
    { aoAbrir: f => { $('.modal', f).classList.add('modal-largo'); ligarLinhasAcao(f, us); }, validar: d => !pid && !d.plano ? 'Escolha o plano de origem da ação.' : d.plano === '__novo' ? null : validarLinhas(d, true) });
  if (!r) return null;
  if (r.plano === '__novo') return (await modalPlano()) ? 'novo' : null;
  pid = pid || r.plano;
  let reuniaoId = r.reuniao || null;
  if (!reuniaoId && !planoId) { const pl = await api.um('planos', `id=eq.${pid}&select=recorrente`).catch(() => null);   // plano escolhido na lista: usa a reunião mais recente
    if (pl?.recorrente) reuniaoId = (await api.listar('plano_reunioes', `plano_id=eq.${pid}&ativo=eq.true&order=data.desc&limit=1&select=id`).catch(() => []))[0]?.id || null; }
  try { const avisou = await salvarAcoesDoPlano(pid, lerLinhasAcao(r), reuniaoId); aviso(`Ações lançadas${avisou ? ' e responsáveis avisados' : ''}.`); return pid; } catch (err) { falha(err); return null; }
}
function tabelaAcoesHtml(acs, { mostrarResp = true, mostrarOrigem = true } = {}) {
  return `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Ação</th>${mostrarOrigem ? '<th>Referência</th>' : ''}${mostrarResp ? '<th>Responsável</th>' : ''}<th>Prazo</th><th>Situação</th><th></th></tr></thead><tbody>
    ${acs.map((a, i) => { const [pt, pc] = prazoTxt(a.prazo); const fim = ['concluida', 'cancelada'].includes(a.status); const [st, sc] = ST_ACAO_TXT[a.status] || [a.status, '']; const pg = progEntregas(a);
      return `<tr class="clicavel" data-i="${i}"${fAttr('origem', (a.origem || '').split(' · ')[0])}${fAttr('reun', a.reuniao_txt)}${fAttr('resp', a.responsavel)}${fAttr('sit', !fim && pc === 'atr' ? 'Atrasada' : st)}${fAttr('data', a.prazo)}${fAttr('busca', [a.descricao, a.origem, a.responsavel, a.evidencia].filter(Boolean).join(' '))}>
        <td data-r="Ação"><b>${esc(a.descricao)}</b>${a.reuniao_txt ? `<div class="pl-reu-tag">Reunião de ${esc(a.reuniao_txt)}</div>` : ''}${a.evidencia ? `<div class="muted">${esc(a.evidencia)}</div>` : ''}</td>
        ${mostrarOrigem ? `<td data-r="Referência">${a.plano_id ? `<a href="#/planos/ver/${a.plano_id}" data-ref>${esc(a.origem)}</a>` : esc(a.origem)}</td>` : ''}${mostrarResp ? `<td data-r="Responsável">${pg ? htmlRespsEntrega(a, pg) : esc(a.responsavel || '—')}</td>` : ''}
        <td data-r="Prazo" class="nowrap">${a.prazo ? dataBR(a.prazo) : '—'}${!fim && a.prazo ? `<div class="ma-pt ${pc}">${pt}</div>` : ''}${htmlRepact(a)}</td>
        <td data-r="Situação"><span class="tag ${!fim && pc === 'atr' ? 'vermelho' : sc}">${!fim && pc === 'atr' ? 'Atrasada' : st}</span>${pg && !fim ? `<div class="ac-prog">${pg.enviaram} de ${pg.total} enviaram${pg.minha ? ' · a sua já foi' : ''}</div>` : ''}</td>
        <td class="nowrap"><button class="btn peq" data-i="${i}">Abrir</button></td></tr>`; }).join('')}
  </tbody></table></div>`;
}
function ligarTabelaAcoes(tela, acs) {
  $$('tr[data-i]', tela).forEach(tr => (tr.onclick = async e => { if (e.target.closest('[data-ref]')) return; if (await abrirAcao(acs[Number(tr.dataset.i)])) navegar(); }));
}
rota('/planos', async tela => {
  const gestor = tem('administrador', 'diretoria');
  const ver = estado.params.get('ver') || 'minhas';
  const abertas = !temTodos(pLista('sit', 'todas'));
  const ABAS = [['minhas', 'No meu nome'], ['criadas', 'Que eu abri'], ['planos', 'Reuniões, auditorias e outros'], ['todas', 'Todas as ações']];
  const url = m => '#/planos?' + new URLSearchParams({ ver, ...m }).toString();
  const topo = (sub) => `<div class="topo"><div><h1>Planos de ação</h1><p class="sub">${sub}</p></div>
      <div class="acoes"><button class="btn" id="lancar-acoes">+ Ações em plano existente</button><button class="btn prim" id="novo-plano">+ Novo plano</button></div></div>
    <div class="abas">${ABAS.map(([k, t]) => `<a href="#/planos?ver=${k}" class="${k === ver ? 'ativa' : ''}">${t}</a>`).join('')}</div>`;
  if (ver === 'planos') {
    const ps = await api.rpc('planos_lista').catch(err => { falha(err); return []; });
    tela.innerHTML = `${topo(`${ps.length} plano(s)`)}
      <div class="cartao">${ps.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nº</th><th>Data</th><th>Origem</th><th>Título</th><th>Setor</th><th>Andamento</th></tr></thead><tbody>
        ${ps.map(p => { const pct = p.total ? Math.round(100 * p.concluidas / p.total) : 0;
          return `<tr class="clicavel" data-p="${p.id}"${fAttr('origem', p.recorrente ? 'Reunião ordinária' : TIPOS_PLANO[p.tipo])}${fAttr('setor', p.setor)}${fAttr('data', p.ultima_reuniao || p.data)}${fAttr('busca', [p.numero, p.titulo, p.setor, p.criado_por].filter(Boolean).join(' '))}>
          <td data-r="Nº" class="mono">${esc(p.numero || '')}</td><td data-r="Data" class="nowrap">${p.recorrente ? `${dataBR(p.ultima_reuniao || p.data)}<div class="muted">última de ${p.reunioes}</div>` : dataBR(p.data)}</td><td data-r="Origem">${esc(TIPOS_PLANO[p.tipo] || p.tipo)}${p.recorrente ? ` <span class="tag azul">${esc(PERIOD_TXT[p.periodicidade] || 'ordinária')}</span>` : ''}</td>
          <td data-r="Título"><b>${esc(p.titulo)}</b>${p.criado_por ? `<div class="muted">por ${esc(p.criado_por)}</div>` : ''}</td><td data-r="Setor">${esc(p.setor || '—')}</td>
          <td data-r="Andamento"><div class="pl-prog"><span style="width:${pct}%"></span></div><span class="muted">${p.concluidas}/${p.total} concluída(s)${p.atrasadas ? ` · <b class="txt-verm">${p.atrasadas} atrasada(s)</b>` : ''}</span></td></tr>`; }).join('')}
        </tbody></table></div>` : '<div class="vazio">Nenhum plano. Crie um a partir de uma reunião, auditoria ou visita.</div>'}</div>`;
    $$('tr[data-p]', tela).forEach(tr => (tr.onclick = () => (location.hash = '#/planos/ver/' + tr.dataset.p)));
    filtroLocal(tela, { itens: 'tbody tr[data-p]', antes: $$('.cartao', tela).at(-1), campos: [{ k: 'origem', rotulo: 'Origem' }, { k: 'setor', rotulo: 'Setor' }], periodo: true, rotuloPeriodo: 'Data' });
  } else {
    const escopo = ver;
    const acs = await api.rpc('planos_acao', { p_escopo: escopo, p_abertas: abertas }).catch(err => { falha(err); return []; });
    const atr = acs.filter(a => a.prazo && a.prazo < hojeISO() && ['aberta', 'em_andamento'].includes(a.status)).length;
    tela.innerHTML = `${topo(`${acs.length} ação(ões)${atr ? ` · <b class="txt-verm">${atr} atrasada(s)</b>` : ''}`)}
      <form class="filtros" id="f-pl"><select name="sit"><option value="todas">Todas</option><option value="abertas" ${abertas ? 'selected' : ''}>Em aberto</option></select></form>
      <div class="cartao">${acs.length ? tabelaAcoesHtml(acs, { mostrarResp: escopo !== 'minhas' }) : `<div class="vazio">${escopo === 'minhas' ? 'Nenhuma ação no seu nome.' : 'Nenhuma ação.'}</div>`}</div>`;
    $('#f-pl').onchange = e => { location.hash = url({ sit: e.target.value }); };
    ligarTabelaAcoes(tela, acs);
    filtroLocal(tela, { itens: 'tbody tr[data-i]', antes: $$('.cartao', tela).at(-1), campos: [{ k: 'origem', rotulo: 'Origem' }, ...(escopo === 'minhas' ? [] : [{ k: 'resp', rotulo: 'Responsável' }]), { k: 'sit', rotulo: 'Situação' }], periodo: true, rotuloPeriodo: 'Prazo' });
  }
  $('#novo-plano').onclick = async () => { const id = await modalPlano(); if (id) location.hash = '#/planos/ver/' + id; };
  $('#lancar-acoes').onclick = async () => { const id = await modalAcoesNoPlano(null); if (id && id !== 'novo') location.hash = '#/planos/ver/' + id; else if (id) navegar(); };
});
rota('/planos/ver/:id', async (tela, id) => {
  const p = await api.um('planos', `id=eq.${id}`).catch(() => null);
  if (!p) { tela.innerHTML = '<div class="cartao vazio">Plano não encontrado ou sem acesso.</div>'; return; }
  const [autor, linhas, reus] = await Promise.all([p.criado_por ? api.um('usuarios', `id=eq.${p.criado_por}&select=nome`).catch(() => null) : null,
    api.listar('acoes_gerais', `plano_id=eq.${id}&ativo=eq.true&select=id,descricao,prazo,prazo_original,status,evidencia,concluida_em,responsavel_id,responsaveis,responsaveis_ids,criado_por,criado_em,reuniao_id,u:usuarios!acoes_gerais_responsavel_id_fkey(nome),ent:acao_entregas(usuario_id,evidencia,criado_em,ativo,u:usuarios(nome))`).catch(() => []),
    p.recorrente ? api.listar('plano_reunioes', `plano_id=eq.${id}&ativo=eq.true&order=data.desc`).catch(() => []) : []]);
  const REU = porId(reus);
  p.autor = autor;
  const acs = linhas.map(a => ({ modulo: 'geral', id: a.id, descricao: a.descricao, prazo: a.prazo, status: a.status, evidencia: a.evidencia, concluida_em: a.concluida_em,
    responsavel_id: a.responsavel_id, responsaveis: a.responsaveis, responsaveis_ids: a.responsaveis_ids, prazo_original: a.prazo_original,
    responsavel: nomesPessoas(a.responsaveis) || a.u?.nome, criado_por_id: a.criado_por, plano_criado_por: p.criado_por, plano_id: id, reuniao_id: a.reuniao_id,
    entregas: (a.ent || []).filter(e => e.ativo).map(e => ({ usuario_id: e.usuario_id, nome: e.u?.nome, evidencia: e.evidencia, criado_em: e.criado_em })),
    reuniao_txt: REU[a.reuniao_id] ? dataBR(REU[a.reuniao_id].data) : null,
    origem: `${TIPOS_PLANO[p.tipo] || 'Plano'} ${dataBR(REU[a.reuniao_id]?.data || p.data)} · ${p.titulo}` }));
  acs.sort((x, y) => (['concluida', 'cancelada'].includes(x.status) - ['concluida', 'cancelada'].includes(y.status)) || String(x.prazo || '9').localeCompare(String(y.prazo || '9')));
  const vivas = acs.filter(a => a.status !== 'cancelada'), conc = vivas.filter(a => a.status === 'concluida').length;
  const atr = vivas.filter(a => ['aberta', 'em_andamento'].includes(a.status) && a.prazo && a.prazo < hojeISO()).length;
  const podeEditar = p.criado_por === estado.usuario.id || tem('administrador', 'diretoria');
  const pct = vivas.length ? Math.round(100 * conc / vivas.length) : 0;
  tela.innerHTML = `
    <div class="topo"><div><h1>${esc(p.titulo)}</h1><p class="sub">${esc(p.numero || '')} · ${p.recorrente
        ? `Reunião ${esc(PERIOD_TXT[p.periodicidade] || 'ordinária')} · desde ${dataBR(p.data)} · ${reus.length} reunião(ões) registrada(s)${reus[0] ? ' · última em ' + dataBR(reus[0].data) : ''}`
        : `${esc(TIPOS_PLANO[p.tipo] || p.tipo)} de ${dataBR(p.data)}`}${p.setor ? ' · ' + esc(p.setor) : ''}</p></div>
      <div class="acoes">${podeEditar ? '<button class="btn" id="ed-plano">Editar</button>' : ''}${p.recorrente ? '<button class="btn" id="mais-acoes">+ Ações</button><button class="btn prim" id="nova-reuniao">+ Registrar reunião</button>' : '<button class="btn prim" id="mais-acoes">+ Ações</button>'}</div></div>
    <div class="cartao pl-cab"><div class="form">
      <div><div class="muted">Andamento</div><div class="pl-prog grande"><span style="width:${pct}%"></span></div><b>${conc} de ${vivas.length} concluída(s)</b>${atr ? ` · <b class="txt-verm">${atr} atrasada(s)</b>` : ''}</div>
      <div><div class="muted">Aberto por</div><b>${esc(p.autor?.nome || '—')}</b></div>
      ${p.participantes_lista?.length || p.participantes ? `<div class="largo"><div class="muted">${p.recorrente ? 'Participantes fixos' : 'Participantes'}</div>${esc(nomesPessoas(p.participantes_lista) || p.participantes)}</div>` : ''}
      ${p.descricao ? `<div class="largo"><div class="muted">Resumo / pauta</div><div style="white-space:pre-line">${esc(p.descricao)}</div></div>` : ''}</div></div>
    <div class="cartao"><div class="topo" style="margin:0 0 8px"><h2 style="margin:0">Anexos do plano</h2><button class="btn peq" id="anx-plano">📎 Anexar</button></div><div id="pl-anx"></div></div>
    ${p.recorrente ? `<div class="cartao"><div class="topo" style="margin:0 0 8px"><div><h2 style="margin:0">Reuniões</h2><p class="muted" style="margin:2px 0 0">Cada encontro com a sua data, participantes e ata. As ações em aberto seguem para acompanhamento nas próximas reuniões.</p></div></div>
      ${reus.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Data</th><th>Participantes</th><th>Ata / assuntos</th><th class="num">Ações</th><th></th></tr></thead><tbody>
        ${reus.map(x => { const da = acs.filter(a => a.reuniao_id === x.id), ab = da.filter(a => ['aberta', 'em_andamento'].includes(a.status)).length;
          return `<tr><td data-r="Data" class="nowrap"><b>${dataBR(x.data)}</b></td><td data-r="Participantes">${esc(nomesPessoas(x.participantes_lista) || '—')}</td>
            <td data-r="Ata / assuntos"><div class="pl-ata">${esc(x.ata || '—')}</div></td><td data-r="Ações" class="num">${da.length}${ab ? `<div class="muted">${ab} em aberto</div>` : ''}</td>
            <td class="nowrap"><button class="btn peq" data-reu-ver="${x.id}">Ações</button> <button class="btn peq" data-reu-ed="${x.id}">Abrir</button></td></tr>`; }).join('')}</tbody></table></div>`
        : '<div class="vazio">Nenhuma reunião registrada.</div>'}</div>` : ''}
    <div class="cartao" id="pl-acoes"><h2>Ações deste plano</h2>${acs.length ? tabelaAcoesHtml(acs, { mostrarOrigem: false }) : '<div class="vazio">Nenhuma ação lançada.</div>'}</div>`;
  ligarTabelaAcoes(tela, acs);
  const fl = acs.length ? filtroLocal(tela, { itens: '#pl-acoes tbody tr[data-i]', antes: '#pl-acoes .tabela-wrap', busca: true,
    campos: [...(p.recorrente ? [{ k: 'reun', rotulo: 'Reunião' }] : []), { k: 'resp', rotulo: 'Responsável' }, { k: 'sit', rotulo: 'Situação' }] }) : null;
  $('#mais-acoes').onclick = async () => { if (await modalAcoesNoPlano(id)) navegar(); };
  $('#nova-reuniao')?.addEventListener('click', async () => { if (await modalReuniao(p, reus, acs)) navegar(); });
  $$('[data-reu-ed]', tela).forEach(b => (b.onclick = async () => { if (await modalReuniao(p, reus, acs, REU[b.dataset.reuEd])) navegar(); }));
  // "Ações" de uma reunião: filtra a tabela de ações por aquela data
  $$('[data-reu-ver]', tela).forEach(b => (b.onclick = () => {
    const txt = dataBR(REU[b.dataset.reuVer].data), m = $('#pl-acoes [data-flm="reun"]', tela);
    if (m) { $$('.flm-op input', m).forEach(c => { c.checked = c.value === txt; }); fl?.aplicar(); $('#pl-acoes .filtro-local', tela)?.classList.remove('fl-fechado'); }
    $('#pl-acoes', tela).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  $('#pl-anx').innerHTML = await htmlAnexos('plano', id).catch(() => '<span class="muted">—</span>');
  $('#anx-plano').onclick = async () => {
    const r = await modal(`<form><h2>Anexar no plano</h2><div class="form">${camposAnexoHtml()}<label class="campo largo">Descrição<input name="desc"></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Anexar</button></div></form>`,
      { validar: d => !d.arquivos?.length && !d.links ? 'Escolha um arquivo ou informe um link.' : null });
    if (!r) return;
    try { if (r.arquivos?.length) await anexar('plano', id, r.arquivos, r.desc || null); await anexarLinks('plano', id, r.links, r.desc || null); aviso('Anexado.'); navegar(); } catch (err) { falha(err); }
  };
  $('#ed-plano')?.addEventListener('click', async () => { if (await modalPlano(p)) navegar(); });
});

// ===================== Início: resumo financeiro da gestão =====================
const MESES_AB = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_EXT_RG = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const mesTxt = (m, ext = false) => { const [a, mm] = String(m).split('-'); return (ext ? MESES_EXT_RG : MESES_AB)[+mm - 1] + (ext ? ' de ' : '/') + (ext ? a : a.slice(2)); };
const projDesp = x => Number(x.desp_pago) + Number(x.desp_aberto) + Number(x.desp_previsto) + Number(x.compras_sem_nota);
const projRec = x => Number(x.rec_recebido) + Number(x.rec_aberto) + Number(x.rec_prevista);
function htmlResumoProj(proj, { titulo, sub, link, geral }) {
  if (!proj?.meses?.length) return '';
  const m0 = proj.meses[0];
  const k = (rot, v, cls = '', s = '') => `<div class="rg-k ${cls}"><span class="rg-r">${rot}</span><b>${brl(v)}</b>${s ? `<span class="rg-s">${s}</span>` : ''}</div>`;
  const orc = m0.orcado_desp != null ? Number(m0.orcado_desp) : null, gasto = Number(m0.desp_pago);
  const pct = orc ? Math.round(100 * projDesp(m0) / orc) : null;
  return `<section class="cartao resumo-gestao"><div class="rg-topo"><div><h2>${titulo}</h2><p class="muted">${mesTxt(m0.m, true)}</p></div>${link && telaPermitida(link.split('?')[0].slice(1)) ? `<a class="btn peq" href="${link}">Projeção completa ${ico('seta')}</a>` : ''}</div>
    <div class="rg-grade">
      ${k('Pago no mês', gasto, 'ok')}
      ${k('A pagar', m0.desp_aberto, '', Number(proj.vencido_pagar) ? `<b class="txt-verm">${brl(proj.vencido_pagar)} vencido</b>` : '')}
      ${k('Previsões', m0.desp_previsto, 'prev')}
      ${k('Compras sem nota', Number(m0.compras_sem_nota), 'prev')}
      ${geral ? k('Receitas', Number(m0.rec_aberto) + Number(m0.rec_prevista), 'rec', `recebido: ${brl(m0.rec_recebido)}`) : ''}
      ${geral && proj.saldo_contas != null ? k('Saldo bancário', proj.saldo_contas, Number(proj.saldo_contas) < 0 ? 'alerta' : '') : ''}
      ${orc != null ? k('Orçado', orc, pct > 100 ? 'alerta' : '', `${pct}% do orçado`) : ''}
    </div>
    <div class="tabela-wrap"><table class="rg-tab"><thead><tr><th>Mês</th><th class="num">Gastos projetados</th>${geral ? '<th class="num">Receitas projetadas</th><th class="num">Resultado</th>' : ''}<th class="num">Orçado</th></tr></thead><tbody>
      ${proj.meses.map(x => { const d = projDesp(x), r = projRec(x); return `<tr><td>${mesTxt(x.m)}</td><td class="num">${brl(d)}</td>${geral ? `<td class="num">${brl(r)}</td><td class="num ${r - d < 0 ? 'txt-verm' : 'txt-verde'}"><b>${brl(r - d)}</b></td>` : ''}<td class="num muted">${x.orcado_desp != null ? brl(x.orcado_desp) : '—'}</td></tr>`; }).join('')}
    </tbody></table></div></section>`;
}
function htmlResumoGestao(r) {
  if (!r) return '';
  let h = '';
  if (r.geral) h += htmlResumoProj(r.geral, { titulo: 'Resumo da gestão', link: '#/financeiro/projecao', geral: true });
  for (const c of r.setores || []) h += htmlResumoProj(c.proj, { titulo: `Gastos do setor · ${esc(c.nome)}`, link: '#/financeiro/projecao?cc=' + c.id, geral: false });
  return h;
}

// Filtros com vários valores: "a,b" na URL
const pLista = (k, padrao = '') => { const v = estado.params.get(k); return String(v == null || v === '' ? padrao : v).split(',').map(x => x.trim()).filter(Boolean); };
const temTodos = l => !l.length || l.some(v => /^(todos|todas)$/.test(v));
// junta filtros do banco de cada opção com "ou" ('' = sem filtro)
function filtroOu(partes) {
  partes = [...new Set(partes.map(p => String(p ?? '').replace(/^&+/, '')))];
  if (!partes.length || partes.includes('')) return '';
  if (partes.length === 1) return partes[0];
  const conv = p => { const cs = p.split('&').filter(Boolean).map(c => c.replace('=', '.')); return cs.length > 1 ? `and(${cs.join(',')})` : cs[0]; };
  return 'or=(' + partes.map(conv).join(',') + ')';
}
const semAcento = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
// busca tolerante: todas as palavras digitadas, em qualquer ordem, sem acento; números também casam sem pontuação (CNPJ/CPF)
function casaBusca(texto, termo) {
  const t = semAcento(termo); if (!t) return true;
  const base = semAcento(texto), dig = String(texto || '').replace(/\D/g, '');
  return t.split(/\s+/).every(p => base.includes(p) || (/\d/.test(p) && p.replace(/\D/g, '').length >= 3 && dig.includes(p.replace(/\D/g, ''))));
}

// ===================== Listas suspensas com busca digitando (todas as do sistema) =====================
// Cada <select> ganha um campo onde se digita parte do texto; a lista mostra só o que combina.
// O <select> original continua no formulário (valor, required, eventos change) — só fica invisível.
const _selDesc = { value: Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value'), selectedIndex: Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex') };
let _cbAberto = null;
function comboSelect(sel) {
  if (sel._cb || sel.multiple || sel.size > 1 || sel.hasAttribute('data-nativo') || sel.closest('.flm, .orc-grade')) return;
  sel._cb = true;
  const box = document.createElement('div'); box.className = 'cb';
  sel.before(box); box.append(sel); sel.classList.add('cb-sel'); sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');
  const inp = document.createElement('input'); inp.type = 'text'; inp.className = 'cb-in'; inp.autocomplete = 'off'; inp.spellcheck = false;
  inp.setAttribute('role', 'combobox'); inp.setAttribute('aria-expanded', 'false'); if (sel.getAttribute('aria-label')) inp.setAttribute('aria-label', sel.getAttribute('aria-label'));
  if (sel.id) { inp.id = sel.id + '__cb'; const lb = document.querySelector(`label[for="${sel.id}"]`); if (lb) lb.htmlFor = inp.id; }
  let lista = null;   // criada só quando abre (e removida ao fechar)
  box.append(inp);
  let ativo = -1, vis = [];
  const textoSel = () => sel.selectedIndex >= 0 ? sel.options[sel.selectedIndex].text : '';
  const sync = () => { if (_cbAberto !== api_) inp.value = textoSel(); inp.disabled = sel.disabled; box.classList.toggle('cb-semvalor', !sel.value);
    inp.placeholder = sel.options[0] && !sel.options[0].value ? sel.options[0].text : ''; box.hidden = sel.hidden; };
  for (const p of ['value', 'selectedIndex']) Object.defineProperty(sel, p, { configurable: true, get() { return _selDesc[p].get.call(this); }, set(v) { _selDesc[p].set.call(this, v); sync(); } });
  new MutationObserver(sync).observe(sel, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'hidden'] });
  sel.addEventListener('change', sync);
  sel.addEventListener('focus', () => inp.focus());
  const posicionar = () => { if (!lista) return; const r = inp.getBoundingClientRect(); const baixo = innerHeight - r.bottom, alto = Math.min(280, Math.max(baixo, r.top) - 12);
    lista.style.left = r.left + 'px'; lista.style.width = Math.max(r.width, 200) + 'px'; lista.style.maxHeight = alto + 'px';
    if (baixo < 200 && r.top > baixo) { lista.style.top = ''; lista.style.bottom = (innerHeight - r.top + 4) + 'px'; } else { lista.style.bottom = ''; lista.style.top = (r.bottom + 4) + 'px'; } };
  const desenhar = filtro => {
    const t = semAcento(filtro);
    vis = [...sel.options].map((o, i) => ({ o, i })).filter(({ o }) => !o.disabled || o.value === '' ).filter(({ o }) => !t || casaBusca(o.text + ' ' + (o.dataset.busca || ''), filtro));
    lista.innerHTML = vis.length ? vis.map(({ o, i }, k) => `<div class="cb-op ${i === sel.selectedIndex ? 'sel' : ''} ${o.value === '' ? 'cb-vazio' : ''}" data-k="${k}" role="option">${esc(o.text)}</div>`).join('')
      : '<div class="cb-nada">Nada encontrado</div>';
    ativo = t ? 0 : Math.max(0, vis.findIndex(v => v.i === sel.selectedIndex)); marcar(); };
  const marcar = () => { if (!lista) return; $$('.cb-op', lista).forEach((d, k) => d.classList.toggle('ativo', k === ativo)); lista.querySelector('.cb-op.ativo')?.scrollIntoView({ block: 'nearest' }); };
  const abrir = () => { if (sel.disabled) return; if (_cbAberto && _cbAberto !== api_) _cbAberto.fechar(); _cbAberto = api_;
    if (!lista) { lista = document.createElement('div'); lista.className = 'cb-lista'; lista.setAttribute('role', 'listbox'); document.body.append(lista);
      lista.addEventListener('mousedown', e => { e.preventDefault(); const d = e.target.closest('.cb-op'); if (d) escolher(Number(d.dataset.k)); }); }
    desenhar(''); posicionar(); inp.setAttribute('aria-expanded', 'true'); inp.select(); };
  const fechar = () => { lista?.remove(); lista = null; inp.setAttribute('aria-expanded', 'false'); if (_cbAberto === api_) _cbAberto = null; inp.value = textoSel(); };
  const escolher = k => { const v = vis[k]; if (!v) return; const mudou = sel.selectedIndex !== v.i; _selDesc.selectedIndex.set.call(sel, v.i); fechar(); sync();
    if (mudou) { sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); } };
  const api_ = { fechar, posicionar, get lista() { return lista; }, box };
  inp.addEventListener('focus', abrir);
  inp.addEventListener('mousedown', () => { if (!lista && document.activeElement === inp) abrir(); });
  inp.addEventListener('input', e => { e.stopPropagation(); if (!lista) abrir(); desenhar(inp.value); posicionar(); });
  inp.addEventListener('change', e => e.stopPropagation());
  inp.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!lista) abrir(); else { ativo = Math.min(vis.length - 1, ativo + 1); marcar(); } }
    else if (e.key === 'ArrowUp') { e.preventDefault(); ativo = Math.max(0, ativo - 1); marcar(); }
    else if (e.key === 'Enter') { if (lista) { e.preventDefault(); escolher(ativo); } }
    else if (e.key === 'Escape') { if (lista) { e.stopPropagation(); fechar(); } }
    else if (e.key === 'Tab') { if (lista && inp.value !== textoSel() && vis.length) escolher(ativo); else fechar(); }
  });
  inp.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== inp && _cbAberto === api_) fechar(); }, 120));
  sync();
}
// Filtros de cima das telas (formulário .filtros): viram lista de marcar vários itens.
// O valor vai para a URL separado por vírgula (ex.: status=abertos,pago) e cada tela junta os itens com "ou".
const _FORM_UNICO = ['f-alvo', 'f-mes', 'f-data', 'f-proj', 'f-pl'];
function podeMulti(sel) {
  const f = sel.closest('form.filtros'); if (!f || f.classList.contains('filtro-local') || !sel.name) return false;
  return !sel.hasAttribute('data-unico') && !_FORM_UNICO.includes(f.id) && sel.options.length > 2 && !sel.multiple;
}
const ehOpTodos = o => o.value === '' || /^(todos|todas)$/.test(o.value) || /^tod[oa]s\b/i.test(o.text.trim());
function multiFiltro(sel) {
  if (sel._cb) return; sel._cb = true;
  const nome = sel.name, ops = [...sel.options].map(o => ({ v: o.value, t: o.text.trim(), todos: ehOpTodos(o) }));
  const opTodos = ops.find(o => o.todos);
  const doUrl = estado.params?.get(nome);
  let marcados = doUrl != null && doUrl !== '' ? doUrl.split(',').filter(v => ops.some(o => o.v === v)) : [...sel.selectedOptions].map(o => o.value);
  if (!marcados.length && opTodos) marcados = [opTodos.v];
  const box = document.createElement('div'); box.className = 'flm flm-srv';
  box.innerHTML = `<input type="hidden" name="${esc(nome)}"><button type="button" class="flm-btn" aria-haspopup="true"><span class="flm-txt"></span></button>
    <div class="flm-pan" hidden>${ops.length > 7 ? '<input type="text" class="flm-q" placeholder="Digite para buscar…" autocomplete="off">' : ''}
      <div class="flm-ops">${ops.map(o => `<label class="flm-op ${o.todos ? 'flm-todos' : ''}"><input type="checkbox" value="${esc(o.v)}" ${marcados.includes(o.v) ? 'checked' : ''}><span>${esc(o.t)}</span></label>`).join('')}</div>
      <div class="flm-rod"><button type="button" class="btn peq" data-limpar>Limpar</button><button type="button" class="btn prim peq" data-aplicar>Aplicar</button></div></div>`;
  sel.replaceWith(box);
  const hid = $('input[type=hidden]', box), pan = $('.flm-pan', box), q = $('.flm-q', box);
  let inicial = '';
  const ler = () => $$('.flm-ops input:checked', box).map(c => c.value);
  const mostrar = () => { const v = ler(); const reais = v.filter(x => !ops.find(o => o.v === x)?.todos);
    hid.value = reais.length ? reais.join(',') : (opTodos ? opTodos.v : '');
    const txt = !reais.length ? (opTodos?.t || 'Todos') : reais.length === 1 ? ops.find(o => o.v === reais[0]).t : `${reais.length} selecionados: ` + reais.map(x => ops.find(o => o.v === x).t).join(', ');
    $('.flm-txt', box).textContent = txt; box.title = txt; box.classList.toggle('ativo', reais.length > 0); };
  mostrar(); inicial = hid.value;
  const enviar = () => { pan.hidden = true; if (hid.value !== inicial) { inicial = hid.value; const f = box.closest('form'); f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit', { cancelable: true })); } };
  $('.flm-btn', box).onclick = e => { e.stopPropagation(); const abrir = pan.hidden; $$('.flm-pan').forEach(p => { if (p !== pan) p.hidden = true; }); pan.hidden = !abrir; if (abrir && q) { q.value = ''; $$('.flm-op', box).forEach(o => (o.hidden = false)); q.focus(); } };
  pan.addEventListener('click', e => e.stopPropagation());
  pan.addEventListener('change', e => { e.stopPropagation(); const c = e.target; if (c.type !== 'checkbox') return;
    const ehT = ops.find(o => o.v === c.value)?.todos;
    if (ehT && c.checked) $$('.flm-ops input', box).forEach(x => { if (x !== c) x.checked = false; });
    else if (!ehT && c.checked) $$('.flm-ops input', box).forEach(x => { if (ops.find(o => o.v === x.value)?.todos) x.checked = false; });
    if (!ler().length && opTodos) $$('.flm-ops input', box).find(x => x.value === opTodos.v).checked = true;
    mostrar(); });
  q?.addEventListener('input', e => { e.stopPropagation(); const t = semAcento(q.value); $$('.flm-op', box).forEach(o => (o.hidden = !!t && !semAcento(o.textContent).includes(t))); });
  q?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); enviar(); } if (e.key === 'Escape') pan.hidden = true; });
  $('[data-limpar]', box).onclick = () => { $$('.flm-ops input', box).forEach(x => (x.checked = opTodos ? x.value === opTodos.v : false)); mostrar(); };
  $('[data-aplicar]', box).onclick = enviar;
  document.addEventListener('click', () => { if (!pan.hidden && box.isConnected) enviar(); });
}
// Barra de rolagem horizontal sempre à vista: tabelas largas ganham uma barra que fica presa no
// rodapé da tela enquanto a tabela aparece (não é preciso ir até o fim da lista para rolar de lado).
function barraRolagem(w) {
  if (w._hbar || w.closest('.modal, .cb-lista')) return; w._hbar = true;
  const bar = document.createElement('div'); bar.className = 'hbar'; bar.innerHTML = '<div></div>'; bar.setAttribute('aria-hidden', 'true');
  w.after(bar); w.classList.add('com-hbar');
  const miolo = bar.firstChild;
  const medir = () => { const larga = w.scrollWidth > w.clientWidth + 1; bar.hidden = !larga; w.classList.toggle('larga', larga);
    miolo.style.width = w.scrollWidth + 'px'; bar.style.width = w.clientWidth + 'px'; if (larga) bar.scrollLeft = w.scrollLeft; };
  bar.addEventListener('scroll', () => { if (Math.abs(w.scrollLeft - bar.scrollLeft) > 1) w.scrollLeft = bar.scrollLeft; });
  w.addEventListener('scroll', () => { if (Math.abs(bar.scrollLeft - w.scrollLeft) > 1) bar.scrollLeft = w.scrollLeft; });
  if (window.ResizeObserver) { const ro = new ResizeObserver(medir); ro.observe(w); const t = w.querySelector('table'); if (t) ro.observe(t); }
  medir(); setTimeout(medir, 300);
}
function barrasEm(raiz) { (raiz.matches?.('.tabela-wrap') ? [raiz] : $$('.tabela-wrap', raiz)).forEach(barraRolagem); }
function combosEm(raiz) { barrasEm(raiz); (raiz.matches?.('select') ? [raiz] : $$('select', raiz)).forEach(sel => (podeMulti(sel) ? multiFiltro(sel) : comboSelect(sel)));
  (raiz.matches?.('input[type=file]') ? [raiz] : $$('input[type=file]', raiz)).forEach(campoArquivo); }

// ===================== Campo de anexos (todos os formulários) =====================
// Os arquivos escolhidos ficam listados e se somam a cada escolha; clicar fora ou cancelar a janela não apaga nada.
// Cada arquivo pode ser tirado pelo ✕. Também aceita arrastar e soltar.
function campoArquivo(inp) {
  if (inp._fx || inp.hidden || !inp.name || !inp.closest('form') || inp.closest('label.btn')) return;
  inp._fx = true;
  const lab = inp.closest('label');
  if (lab) { const d = document.createElement('div'); d.className = lab.className; while (lab.firstChild) d.append(lab.firstChild); lab.replaceWith(d); }
  const obrig = inp.required; inp.required = false; inp.hidden = true;
  const pick = document.createElement('input'); pick.type = 'file'; pick.multiple = inp.multiple; if (inp.accept) pick.accept = inp.accept; pick.hidden = true;
  const box = document.createElement('div'); box.className = 'fx';
  box.innerHTML = `<button type="button" class="btn peq fx-add">📎 ${inp.multiple ? 'Adicionar arquivos' : 'Escolher arquivo'}</button><span class="fx-lista"><span class="muted fx-vazio">Nenhum arquivo escolhido · arraste para cá</span></span>`;
  inp.before(box); box.append(pick);
  let arq = [...(inp.files || [])];
  const gravar = () => {
    const dt = new DataTransfer(); arq.forEach(f => dt.items.add(f)); inp.files = dt.files;
    $('.fx-lista', box).innerHTML = arq.length ? arq.map((f, i) => `<span class="fx-item">${esc(f.name)} <small class="muted">${f.size > 1048576 ? (f.size / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(f.size / 1024)) + ' KB'}</small><button type="button" data-fx-tira="${i}" title="Tirar">✕</button></span>`).join('')
      : '<span class="muted fx-vazio">Nenhum arquivo escolhido · arraste para cá</span>';
    inp.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const somar = lista => { const novos = [...lista]; if (!novos.length) return; arq = inp.multiple ? [...arq, ...novos.filter(n => !arq.some(a => a.name === n.name && a.size === n.size))] : [novos[0]]; gravar(); };
  $('.fx-add', box).onclick = () => pick.click();
  pick.onchange = () => { somar(pick.files); pick.value = ''; };
  box.addEventListener('click', e => { const b = e.target.closest('[data-fx-tira]'); if (b) { arq.splice(Number(b.dataset.fxTira), 1); gravar(); } });
  box.addEventListener('dragover', e => { e.preventDefault(); box.classList.add('fx-sobre'); });
  box.addEventListener('dragleave', () => box.classList.remove('fx-sobre'));
  box.addEventListener('drop', e => { e.preventDefault(); box.classList.remove('fx-sobre'); somar(e.dataTransfer.files); });
  if (obrig) inp.form.addEventListener('submit', e => { if (inp.isConnected && !arq.length) { e.preventDefault(); e.stopImmediatePropagation(); aviso('Anexe o arquivo (obrigatório).', true); } }, true);
  if (arq.length) gravar();
}
new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1 && !n.classList?.contains('cb-lista')) combosEm(n);
  if (_cbAberto && !_cbAberto.box.isConnected) _cbAberto.fechar(); }).observe(document.documentElement, { childList: true, subtree: true });
addEventListener('scroll', e => { if (_cbAberto && !_cbAberto.lista?.contains(e.target)) _cbAberto.posicionar(); }, true);
addEventListener('resize', () => _cbAberto?.posicionar());
addEventListener('hashchange', () => _cbAberto?.fechar());

// ===================== Filtros na própria tela =====================
// Filtra cartões ou linhas já carregados, sem ir ao servidor. Cada item filtrável traz atributos
// data-f-<campo> (texto exibido), data-f-data (AAAA-MM-DD), data-f-valor (número) e data-f-busca (texto livre).
// campos: [{ k: 'colab', rotulo: 'Colaborador' }, …] — as opções saem dos próprios itens.
const _txt = h => String(h ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const fAttr = (k, v) => v == null || v === '' ? '' : ` data-f-${k}="${esc(String(v))}"`;
let _mesmaTela = false;
function filtroLocal(tela, { itens, antes, campos = [], busca = true, periodo = false, rotuloPeriodo = 'Data', aoMudar } = {}) {
  const els = () => $$(itens, tela);
  const todos = els();
  if (!todos.length) return null;
  const chave = 'filtro:' + location.hash.split('?')[0] + ':' + itens;
  // a tela abre mostrando tudo; mas quando a MESMA tela é redesenhada (ex.: depois de aprovar um item) o filtro escolhido continua
  let salvo = {};
  if (_mesmaTela) { try { salvo = JSON.parse(sessionStorage.getItem(chave) || '{}') || {}; } catch { salvo = {}; } }
  const usados = campos.map(c => ({ ...c, valores: [...new Set([...todos.map(e => e.dataset['f' + c.k[0].toUpperCase() + c.k.slice(1)]), ...(Array.isArray(salvo[c.k]) ? salvo[c.k] : [])].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')) }))
    .filter(c => c.valores.length > 1 || salvo[c.k]);
  const barra = document.createElement('div');
  barra.className = 'filtros filtro-local' + (Object.keys(salvo).some(k => k !== 'q' && salvo[k]) ? '' : ' fl-fechado');
  barra.innerHTML = `<button type="button" class="btn peq fl-toggle" data-fl-toggle>Filtros</button>
    ${busca ? `<input type="search" data-fl="q" placeholder="Buscar…" value="${esc(salvo.q || '')}" aria-label="Buscar">` : ''}
    ${usados.map(c => `<div class="flm" data-flm="${c.k}" data-rot="${esc(c.rotulo)}"><button type="button" class="flm-btn" aria-haspopup="true"><span class="flm-txt">${esc(c.rotulo)}: todos</span></button>
      <div class="flm-pan" hidden><input type="text" class="flm-q" placeholder="Digite para buscar…" autocomplete="off" aria-label="Buscar ${esc(c.rotulo)}">
        <div class="flm-ops">${c.valores.map(v => `<label class="flm-op"><input type="checkbox" value="${esc(v)}"${Array.isArray(salvo[c.k]) && salvo[c.k].includes(v) ? ' checked' : ''}><span>${esc(v)}</span></label>`).join('')}</div>
        <div class="flm-rod"><button type="button" class="btn peq" data-flm-todos>Marcar visíveis</button><button type="button" class="btn peq" data-flm-limpar>Limpar</button></div></div></div>`).join('')}
    ${periodo ? `<label class="fl-data">${esc(rotuloPeriodo)} de<input type="date" data-fl="de" value="${esc(salvo.de || '')}"></label><label class="fl-data">até<input type="date" data-fl="ate" value="${esc(salvo.ate || '')}"></label>` : ''}
    <button type="button" class="btn peq" data-fl-limpar>Limpar</button>
    <span class="muted filtro-resumo"></span>`;
  (typeof antes === 'string' ? $(antes, tela) : antes || todos[0].closest('.cartao') || todos[0]).before(barra);
  const aplicar = () => {
    const f = {}; $$('[data-fl]', barra).forEach(i => { if (i.value) f[i.dataset.fl] = i.value; });
    $$('.flm', barra).forEach(m => { const v = $$('.flm-ops input:checked', m).map(c => c.value); if (v.length) f[m.dataset.flm] = v;
      const rot = m.dataset.rot; $('.flm-txt', m).textContent = !v.length ? rot + ': todos' : v.length === 1 ? rot + ': ' + v[0] : `${rot}: ${v.length} selecionados`;
      m.classList.toggle('ativo', v.length > 0); });
    try { sessionStorage.setItem(chave, JSON.stringify(f)); } catch { /* ok */ }
    const q = (f.q || '').toLowerCase();
    let n = 0, total = 0; const lista = els();
    for (const e of lista) {
      const d = e.dataset;
      const ok = usados.every(c => !f[c.k] || f[c.k].includes(d['f' + c.k[0].toUpperCase() + c.k.slice(1)]))
        && (!f.de || (d.fData || '') >= f.de) && (!f.ate || (d.fData || '9999') <= f.ate)
        && (!q || casaBusca(d.fBusca || e.innerText, q));
      e.hidden = !ok;
      if (!ok) $$('input[type=checkbox]', e).forEach(c => { c.checked = false; });
      if (ok) { n++; total += Number(d.fValor || 0); }
    }
    const ativo = Object.keys(f).length > 0;
    const temV = lista.some(e => e.dataset.fValor != null);
    $('.filtro-resumo', barra).innerHTML = (ativo ? `<b>${n}</b> de ${lista.length}` : `${lista.length} item(ns)`) + (temV ? ` · ${brl(total)}` : '');
    $$('table', tela).forEach(t => { if ($$('tbody tr', t).some(tr => lista.includes(tr))) { const tf = $('tfoot', t); if (tf) tf.hidden = ativo; } });
    aoMudar?.(n);
  };
  barra.addEventListener('input', aplicar); barra.addEventListener('change', aplicar);
  $('[data-fl-toggle]', barra).onclick = () => barra.classList.toggle('fl-fechado');
  $('[data-fl-limpar]', barra).onclick = () => { $$('[data-fl]', barra).forEach(i => { i.value = ''; }); $$('.flm input', barra).forEach(i => { i.checked = false; i.value = i.type === 'text' ? '' : i.value; }); $$('.flm-op', barra).forEach(o => (o.hidden = false)); aplicar(); };
  // listas de seleção múltipla: abre/fecha, busca digitando, marcar visíveis / limpar
  $$('.flm', barra).forEach(m => {
    const pan = $('.flm-pan', m), q = $('.flm-q', m);
    $('.flm-btn', m).onclick = e => { e.stopPropagation(); const abrir = pan.hidden; $$('.flm-pan', barra).forEach(p => (p.hidden = true)); pan.hidden = !abrir; if (abrir) { q.value = ''; $$('.flm-op', m).forEach(o => (o.hidden = false)); q.focus(); } };
    q.addEventListener('input', e => { e.stopPropagation(); const t = semAcento(q.value); $$('.flm-op', m).forEach(o => (o.hidden = !!t && !casaBusca(o.textContent, q.value))); });
    q.addEventListener('keydown', e => { if (e.key === 'Escape') pan.hidden = true; if (e.key === 'Enter') { e.preventDefault(); const vis = $$('.flm-op', m).filter(o => !o.hidden); if (vis.length === 1) { const c = $('input', vis[0]); c.checked = !c.checked; aplicar(); } } });
    $('[data-flm-todos]', m).onclick = () => { $$('.flm-op', m).filter(o => !o.hidden).forEach(o => ($('input', o).checked = true)); aplicar(); };
    $('[data-flm-limpar]', m).onclick = () => { $$('.flm-op input', m).forEach(c => (c.checked = false)); aplicar(); };
    pan.addEventListener('click', e => e.stopPropagation());
  });
  if ($('.flm', barra)) document.addEventListener('click', () => $$('.flm-pan', barra).forEach(p => (p.hidden = true)));
  aplicar();
  return { aplicar, visiveis: () => els().filter(e => !e.hidden) };
}

// ===================== Atualização automática de versão =====================
// Quando sai uma versão nova (o ?v= do index.html muda), mostra uma faixa no topo
// e recarrega o sistema na próxima troca de tela, sem perder o que está sendo digitado.
(() => {
  const atual = ((document.querySelector('script[src*="app.js?v="]') || {}).src || '').match(/[?&]v=(\d+)/)?.[1];
  if (!atual) return;
  let nova = null, faixa = null;
  async function checar() {
    if (nova) return;
    try {
      const r = await fetch('index.html?_=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return;
      const v = (await r.text()).match(/app\.js\?v=(\d+)/)?.[1];
      if (v && v !== atual) { nova = v; mostrar(); }
    } catch { /* sem internet: tenta de novo depois */ }
  }
  function mostrar() {
    if (faixa) return;
    faixa = document.createElement('div');
    faixa.id = 'vg-nova-versao';
    faixa.setAttribute('role', 'status');
    faixa.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap;padding:10px 16px;background:#02654D;color:#fff;font:600 14px/1.3 system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.25)';
    faixa.innerHTML = '<span>Nova versão do sistema disponível.</span><button type="button" style="background:#fff;color:#02654D;border:0;border-radius:6px;padding:6px 14px;font:inherit;cursor:pointer">Atualizar</button>';
    faixa.querySelector('button').onclick = () => location.reload();
    document.body.appendChild(faixa);
  }
  // ao trocar de tela com versão nova pendente, recarrega já na tela escolhida
  window.addEventListener('hashchange', () => { if (nova) location.reload(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checar(); });
  window.addEventListener('focus', checar);
  setInterval(checar, 5 * 60 * 1000);
  setTimeout(checar, 30 * 1000);
})();
