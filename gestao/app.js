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
const num = v => { if (v === '' || v == null) return null; let t = String(v).replace(/[R$\s]/g, ''); if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.'); const n = Number(t); return isNaN(n) ? null : n; };
const lista = ids => 'in.(' + ids.map(encodeURIComponent).join(',') + ')';
const nomeArquivo = n => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.-]+/g, '_').slice(-80);

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
  const inp = el.form ? el.form.querySelector(`[data-outro-de="${CSS.escape(el.name)}"]`) : el.parentElement?.querySelector(`[data-outro-de="${CSS.escape(el.name)}"]`);
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

async function htmlAnexos(entidade, id) {
  const a = await api.listar('anexos', `entidade=eq.${entidade}&entidade_id=eq.${id}&cancelado_em=is.null&order=enviado_em`);
  if (!a.length) return '<span class="muted">Sem anexos</span>';
  return '<div class="anexos">' + a.map(x =>
    `<span class="anexo" data-arquivo="${esc(x.caminho_arquivo)}" title="${esc(x.descricao || '')}">${x.tipo_mime?.includes('pdf') ? '📄' : x.tipo_mime?.startsWith('image/') ? '🖼️' : '📎'} ${x.descricao ? `<b>${esc(x.descricao)}:</b> ` : ''}${esc(x.nome_original || 'arquivo')}</span>`).join('') + '</div>';
}

document.addEventListener('click', async e => {
  const a = e.target.closest('[data-arquivo]');
  if (!a) return;
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
const fornecedores = f => cad('fornecedores', 'select=id,razao_social,nome_fantasia,documento,ativo,boleto,prazo_faturamento_dias,conta_padrao_id,cobranca&order=razao_social', f);
const bancos = f => cad('contas_bancarias', 'select=id,nome,tipo,ativo&order=nome', f);
const veiculos = f => cad('veiculos', 'select=id,placa,modelo,ativo&order=placa', f);
const porId = arr => Object.fromEntries(arr.map(x => [x.id, x]));

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
const MENU = [
  // [nome, rota, perfis (null = todos), ícone, pendência, sub-item]  ·  ['grupo', nome, ícone]  ·  ['sub', título da seção]
  ['Início', '#/inicio', null, '🏠'],
  ['Aprovações', '#/aprovacoes', null, '✅', 'aprovar'],
  ['grupo', 'Meu espaço', '👤'],
  ['Meus reembolsos', '#/reembolsos', null, '🧾', 'devolvidos', true],
  ['Meus adiantamentos', '#/adiantamentos', null, '💵', null, true],
  ['Meus itens', '#/meus-itens', null, '🎒', null, true],
  ['Minha jornada', '#/operacao/jornada', [...P_OP, 'motorista'], '⏱️', null, true],
  ['Pesquisa de clima', '#/clima', null, '💬', 'pesquisa_aberta', true],
  ['Registrar não conformidade', '#/qualidade/nc/nova', null, '📝', null, true],
  ['grupo', 'Biblioteca', '📚'],
  ['Modelos de documentos', '#/modelos', null, '📄', null, true],
  ['Documentos da qualidade', '#/qualidade/documentos', null, '📘', 'qual_docs_ler', true],
  ['grupo', 'Compras', '🛒'],
  ['Requisições', '#/compras/requisicoes', null, '🛒', null, true],
  ['Cotações', '#/compras/cotacoes', [...P_FIN, 'comprador', 'aprovador'], '📊', 'requisicoes_a_cotar', true],
  ['Pedidos', '#/compras/pedidos', null, '📦', 'pedidos_a_receber', true],
  ['grupo', 'Financeiro', '💰'],
  ['Contas a pagar', '#/financeiro/pagar', [...P_FIN, 'comprador'], '💳', 'sem_comprovante', true],
  ['Contas a receber', '#/financeiro/receber', P_FIN, '📥', null, true],
  ['Reembolsos', '#/financeiro/reembolsos', [...P_FIN, 'aprovador'], '💰', 'reembolsos_a_pagar', true],
  ['Adiantamentos', '#/financeiro/adiantamentos', P_FIN, '💵', 'prestacao_vencida', true],
  ['Fundo Fixo', '#/financeiro/fundo', P_FIN, '🪙', null, true],
  ['A verificar', '#/financeiro/verificar', P_FIN, '⚠️', 'a_verificar', true],
  ['grupo', 'Operação', '🚚'],
  ['sub', 'Transporte'],
  ['Painel do CCO', '#/operacao', [...P_OP, 'manutencao'], '📡', 'viagens_atrasadas', true],
  ['Viagens', '#/operacao/viagens', [...P_OP, 'financeiro', 'manutencao'], '🛣️', 'viagens_em_transito', true],
  ['Controle de jornada', '#/operacao/jornadas', [...P_OP, 'rh', 'dp'], '📋', 'jornada_alertas', true],
  ['Ocorrências e multas', '#/operacao/ocorrencias', [...P_OP, 'rh', 'dp', 'financeiro'], '🚧', 'multas_indicar', true],
  ['sub', 'Frota'],
  ['Equipamentos', '#/cadastros/equipamentos', [...P_FIN, 'operacao', 'manutencao'], '🚚', null, true],
  ['Documentos a vencer', '#/frota/documentos', [...P_FIN, 'operacao', 'manutencao'], '📑', 'docs_vencendo', true],
  ['Abastecimentos', '#/operacao/abastecimentos', [...P_OP, 'financeiro', 'comprador', 'manutencao'], '⛽', 'abast_alertas', true],
  ['grupo', 'Manutenção', '🛠️'],
  ['Painel da manutenção', '#/manut', P_MAN, '🛠️', 'manut_preventivas_vencidas', true],
  ['Ordens de serviço', '#/manut/os', [...P_MAN, 'almoxarifado', 'financeiro'], '🧰', 'manut_os_abertas', true],
  ['Planos preventivos', '#/manut/preventivas', P_MAN, '🗓️', 'manut_preventivas_proximas', true],
  ['Pneus', '#/manut/pneus', P_MAN, '🛞', 'pneus_sulco_baixo', true],
  ['Checklist do veículo', '#/manut/checklist', [...P_MAN, 'motorista'], '✔️', null, true],
  ['Km / horímetro', '#/manut/hodometro', [...P_MAN, 'motorista'], '🧭', null, true],
  ['Custos da frota', '#/manut/custos', [...P_MAN, 'financeiro'], '📉', null, true],
  ['grupo', 'Almoxarifado e Patrimônio', '📦'],
  ['sub', 'Almoxarifado'],
  ['Painel do almoxarifado', '#/almox', P_ALM, '🏬', null, true],
  ['Itens e estoque', '#/almox/itens', P_ALM, '📦', 'almox_abaixo_minimo', true],
  ['Requisições de material', '#/almox/requisicoes', null, '🧾', 'almox_requisicoes_abertas', true],
  ['Entrada de material', '#/almox/entrada', ['administrador', 'almoxarifado'], '📥', null, true],
  ['Inventário', '#/almox/inventario', ['administrador', 'almoxarifado'], '🔢', null, true],
  ['EPI e uniformes', '#/almox/epi', [...P_ALM, 'rh', 'dp', 'ssma'], '🦺', 'epi_troca', true],
  ['sub', 'Patrimônio'],
  ['Patrimônio', '#/patrimonio', [...P_ALM, 'rh', 'financeiro'], '🏷️', 'patrimonio_sem_termo', true],
  ['Avarias e responsabilização', '#/patrimonio/avarias', ['administrador', 'almoxarifado', 'rh', 'dp', 'diretoria'], '⚠️', 'patrimonio_avarias', true],
  ['grupo', 'RH', '👥'],
  ['sub', 'Pessoas'],
  ['Painel do RH', '#/rh', P_RH, '🧑‍💼', null, true],
  ['Colaboradores', '#/rh/colaboradores', P_RH, '👷', null, true],
  ['Admissões', '#/rh/admissoes', P_RH, '📝', 'admissoes_andamento', true],
  ['Documentos dos colaboradores', '#/rh/documentos', P_RH, '🪪', 'rh_docs_vencendo', true],
  ['Férias', '#/rh/ferias', P_RH, '🏖️', 'ferias_vencendo', true],
  ['Ocorrências disciplinares', '#/rh/disciplinar', P_RH, '⚖️', null, true],
  ['Desligamentos', '#/rh/desligamentos', P_RH, '🚪', 'desligamentos_andamento', true],
  ['Organograma', '#/rh/organograma', P_RH, '🏛️', null, true],
  ['sub', 'Desenvolvimento'],
  ['Treinamentos', '#/rh/treinamentos', P_RH, '🎓', 'treinamentos_pendentes', true],
  ['Avaliações', '#/rh/avaliacoes', [...P_RH, 'aprovador'], '📈', null, true],
  ['Promoções e cursos', '#/rh/desenvolvimento', P_RH, '🚀', null, true],
  ['Pesquisas de clima', '#/rh/clima', P_RH, '🌡️', null, true],
  ['sub', 'Recrutamento'],
  ['Vagas e seleção', '#/rh/recrutamento', P_RH, '🔍', 'vagas_abertas', true],
  ['Banco de talentos', '#/rh/talentos', P_RH, '🗃️', null, true],
  ['grupo', 'Departamento Pessoal', '🧮'],
  ['Painel do DP', '#/dp', ['administrador', 'dp', 'diretoria'], '🧮', 'dp_a_importar', true],
  ['Folha do mês', '#/dp/folha', ['administrador', 'dp', 'rh', 'diretoria'], '💼', 'dp_lancamentos_pendentes', true],
  ['Benefícios', '#/dp/beneficios', ['administrador', 'dp', 'rh'], '🎁', null, true],
  ['Rubricas da folha', '#/dp/rubricas', ['administrador', 'dp'], '📒', null, true],
  ['grupo', 'SSMA', '⛑️'],
  ['Painel do SSMA', '#/ssma', P_SSMA, '⛑️', 'cat_pendente', true],
  ['Acidentes e CAT', '#/ssma/acidentes', [...P_SSMA, 'operacao', 'manutencao'], '🚑', 'acidentes_abertos', true],
  ['ASO e exames', '#/ssma/aso', P_SSMA, '🩺', 'aso_vencendo', true],
  ['Plano de ação', '#/ssma/acoes', [...P_SSMA, 'operacao', 'manutencao', 'almoxarifado'], '🎯', 'ssma_acoes_atrasadas', true],
  ['Inspeções', '#/ssma/inspecoes', [...P_SSMA, 'operacao', 'manutencao'], '🔍', null, true],
  ['DDS', '#/ssma/dds', [...P_SSMA, 'operacao', 'manutencao'], '🗣️', null, true],
  ['Extintores', '#/ssma/extintores', [...P_SSMA, 'operacao', 'manutencao'], '🧯', 'extintores_vencendo', true],
  ['grupo', 'Qualidade', '🏅'],
  ['Painel da qualidade', '#/qualidade', ['administrador', 'qualidade', 'diretoria'], '🏅', 'qual_auditorias_proximas', true],
  ['Não conformidades', '#/qualidade/nc', ['administrador', 'qualidade', 'diretoria'], '❗', 'qual_nc_abertas', true],
  ['Auditorias', '#/qualidade/auditorias', ['administrador', 'qualidade', 'diretoria'], '🔎', null, true],
  ['Indicadores', '#/qualidade/indicadores', ['administrador', 'qualidade', 'diretoria'], '📊', null, true],
  ['grupo', 'Configurações', '⚙️'],
  ['sub', 'Cadastros'],
  ['Fornecedores', '#/cadastros/fornecedores', [...P_FIN, 'comprador'], '🏢', null, true],
  ['Clientes', '#/cadastros/clientes', [...P_FIN, 'operacao'], '🤝', null, true],
  ['Plano de contas', '#/cadastros/plano_contas', P_FIN, '📚', null, true],
  ['Centros de custo', '#/cadastros/centros_custo', P_FIN, '🎯', null, true],
  ['Bancos e caixa', '#/cadastros/contas_bancarias', P_FIN, '🏦', null, true],
  ['Setores', '#/cadastros/setores', ['administrador', 'rh'], '🧩', null, true],
  ['Cargos e funções', '#/cadastros/cargos', P_RH, '🏷️', null, true],
  ['Tipos de documento do RH', '#/cadastros/rh_tipos_documento', ['administrador', 'rh'], '🗂️', null, true],
  ['sub', 'Sistema'],
  ['Dados da empresa', '#/cadastros/empresa', ['administrador'], '🏢', null, true],
  ['Usuários e perfis', '#/config/usuarios', ['administrador'], '👥', null, true],
  ['Auditoria', '#/config/auditoria', P_FIN, '🔎', null, true],
  ['Calendário do CRLV', '#/config/calendario_crlv', ['administrador'], '📅', 'calendario_crlv', true],
  ['Importar sistema anterior', '#/config/importar', ['administrador'], '📦', null, true],
];
// Telas permitidas: o perfil libera; a lista do cadastro (se houver) restringe. Administrador vê tudo.
function menuPara(perfis, menus) {
  const admin = perfis.includes('administrador');
  const lista = !admin && Array.isArray(menus) && menus.length ? menus : null;
  const ok = MENU.filter(i => i[0] === 'grupo' || i[0] === 'sub' || ((!i[2] || i[2].some(p => perfis.includes(p))) && (!lista || lista.includes(i[1]))));
  const semSub = ok.filter((i, k) => i[0] !== 'sub' || (ok[k + 1] && !['sub', 'grupo'].includes(ok[k + 1][0])));
  return semSub.filter((i, k) => i[0] !== 'grupo' || (semSub[k + 1] && semSub[k + 1][0] !== 'grupo'));
}
function menu() {
  return menuPara(estado.perfis, estado.usuario?.menus).map(i => i[0] === 'grupo' ? ['grupo', i[1], true, i[2]] : i[0] === 'sub' ? ['sub', i[1]] : [i[0], i[1], true, i[3], i[4], i[5]]);
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
    : `<a href="${i[1]}" class="${i[1] === melhor ? 'ativo' : ''} ${i[5] ? 'sub-item' : ''}" data-busca="${esc(i[0].toLowerCase())}"><span class="mi"><span class="ic">${i[3] || ''}</span>${esc(i[0])}</span>${i[4] && pend[i[4]] ? `<span class="tag amarelo">${pend[i[4]]}</span>` : ''}</a>`;
  const busca = `<div class="menu-busca"><input type="search" placeholder="🔎 Buscar no menu…" aria-label="Buscar no menu" autocomplete="off"></div>`;
  return busca + grupos.filter(g => g.itens.some(i => i[0] !== 'sub')).map(g => {
    if (!g.nome) return `<div class="menu-topo">${g.itens.map(link).join('')}</div>`;
    const temAtivo = g.itens.some(i => i[1] === melhor);
    const aberto = temAtivo || abertos.includes(g.nome);
    const soma = g.itens.reduce((x, i) => x + (i[4] && pend[i[4]] ? pend[i[4]] : 0), 0);
    return `<div class="mg ${aberto ? 'aberto' : ''}" data-g="${esc(g.nome)}">
      <button type="button" class="mg-tit" aria-expanded="${aberto}"><span class="mi"><span class="ic">${g.ic}</span>${esc(g.nome)}</span><span class="mg-dir">${soma && !aberto ? `<span class="tag amarelo">${soma}</span>` : ''}<span class="mg-seta">▾</span></span></button>
      <div class="mg-itens">${g.itens.map(link).join('')}</div></div>`;
  }).join('');
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
async function desenharCasca() {
  const pend = {};
  try { (await api.rpc('minhas_pendencias')).forEach(p => (pend[p.tipo] = Number(p.quantidade))); } catch {}
  estado.pendencias = pend;
  const atual = location.hash || '#/inicio';
  const melhor = menu().filter(i => i[0] !== 'grupo' && (atual === i[1] || atual.startsWith(i[1] + '/') || atual.startsWith(i[1] + '?'))).sort((a, b) => b[1].length - a[1].length)[0]?.[1];
  const ehMot = tem('motorista') && !veTudo() && !tem('comprador', 'aprovador');
  const casca = $('#app .casca');
  if (casca && casca.dataset.usuario === estado.usuario.id) {
    // já desenhada: atualiza só o menu e a barra de baixo, mantendo a rolagem do menu
    const lat = $('.lateral', casca), y = lat.scrollTop;
    $('.menu', lat).innerHTML = htmlMenu(pend, melhor); ligarMenu(lat); lat.scrollTop = y;
    const bb = $('#app .barra-baixo'); if (bb) bb.outerHTML = `<nav class="barra-baixo" aria-label="Menu rápido">
      <a href="#/inicio" class="${atual.startsWith('#/inicio') ? 'ativo' : ''}"><span class="ic">🏠</span>Início</a>
      <a href="#/reembolsos/novo" class="${atual.startsWith('#/reembolsos/novo') ? 'ativo' : ''}"><span class="ic">➕</span>Lançar</a>
      ${ehMot ? '' : `<a href="#/aprovacoes" class="${atual.startsWith('#/aprovacoes') ? 'ativo' : ''}"><span class="ic">✅</span>Aprovar${pend.aprovar ? ` (${pend.aprovar})` : ''}</a>`}
      <a href="#/reembolsos" class="${atual === '#/reembolsos' ? 'ativo' : ''}"><span class="ic">🧾</span>Meus</a>
      <a href="#/menu"><span class="ic">☰</span>Menu</a>
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
          <a href="#" id="sair" style="color:#fff">Sair</a></div>
      </nav>
      <main class="conteudo" id="tela"><div class="carregando">Carregando…</div></main>
    </div>
<nav class="barra-baixo" aria-label="Menu rápido">
      <a href="#/inicio" class="${atual.startsWith('#/inicio') ? 'ativo' : ''}"><span class="ic">🏠</span>Início</a>
      <a href="#/reembolsos/novo" class="${atual.startsWith('#/reembolsos/novo') ? 'ativo' : ''}"><span class="ic">➕</span>Lançar</a>
      ${ehMot ? '' : `<a href="#/aprovacoes" class="${atual.startsWith('#/aprovacoes') ? 'ativo' : ''}"><span class="ic">✅</span>Aprovar${pend.aprovar ? ` (${pend.aprovar})` : ''}</a>`}
      <a href="#/reembolsos" class="${atual === '#/reembolsos' ? 'ativo' : ''}"><span class="ic">🧾</span>Meus</a>
      <a href="#/menu"><span class="ic">☰</span>Menu</a>
    </nav>`;
  ligarMenu($('.lateral'));
  // deixa o item da tela atual visível no menu na primeira vez
  $('.lateral a.ativo')?.scrollIntoView({ block: 'nearest' });
  $('#sair').onclick = async e => { e.preventDefault(); await api.sair(); location.hash = ''; iniciar(); };
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
  if (PILHA.length < 2 || $('.btn-voltar', tela)) return;
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
      try { await ROTAS[padrao](tela, ...m.slice(1).map(decodeURIComponent)); if (typeof ferramentasExportacao === 'function') ferramentasExportacao(tela); botaoVoltar(tela); }
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
function telaLogin(msg = '') {
  $('#app').innerHTML = `
    <div class="login"><div class="login-caixa">
      <img class="login-logo" src="logo.png" alt="Verbo Logística"><div class="login-sub">Sistema de Gestão</div>
      <div class="cartao"><h2>Entrar</h2>
      <form id="f-login" class="form" style="grid-template-columns:1fr">
        <label class="campo">E-mail<input name="email" type="email" autocomplete="username" required></label>
        <label class="campo">Senha<input name="senha" type="password" autocomplete="current-password" required></label>
        <div id="msg" class="${msg.startsWith('!') ? 'erro-txt' : 'muted'}">${esc(msg.replace(/^!/, ''))}</div>
        <button class="btn prim">Entrar</button>
        <button type="button" class="btn" id="primeiro">Primeiro acesso ou esqueci a senha</button>
      </form>
    </div></div></div>`;
  const f = $('#f-login');
  f.onsubmit = async e => {
    e.preventDefault();
    const d = formDados(f);
    await ocupado(e.submitter, async () => {
      try { await api.entrar(d.email, d.senha); await iniciar(); }
      catch (err) { $('#msg').className = 'erro-txt'; $('#msg').textContent = err.message; }
    });
  };
  $('#primeiro').onclick = async e => {
    const email = f.email.value.trim();
    if (!email) { $('#msg').className = 'erro-txt'; $('#msg').textContent = 'Digite seu e-mail acima e clique de novo.'; return; }
    await ocupado(e.target, async () => {
      try { await api.enviarLink(email); $('#msg').className = 'muted';
            $('#msg').textContent = 'Enviamos um link para ' + email + '. Abra o e-mail e clique no link para criar sua senha.'; }
      catch (err) { $('#msg').className = 'erro-txt'; $('#msg').textContent = err.message; }
    });
  };
}

function telaNovaSenha() {
  $('#app').innerHTML = `
    <div class="login"><div class="login-caixa">
      <img class="login-logo" src="logo.png" alt="Verbo Logística"><div class="login-sub">Sistema de Gestão</div>
      <div class="cartao"><h2>Crie sua senha</h2>
      <form id="f-senha" class="form" style="grid-template-columns:1fr">
        <label class="campo">Nova senha<input name="s1" type="password" minlength="8" autocomplete="new-password" required></label>
        <label class="campo">Repita a senha<input name="s2" type="password" minlength="8" autocomplete="new-password" required></label>
        <div class="muted">Pelo menos 8 caracteres.</div><div id="msg" class="erro-txt"></div>
        <button class="btn prim">Salvar senha e entrar</button>
      </form></div></div></div>`;
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
  const verAnt = estado.params?.get('avisos') === 'todos';
  const notifs = await api.listar('notificacoes', `usuario_id=eq.${estado.usuario.id}${verAnt ? '' : '&lida=eq.false'}&order=criado_em.desc&limit=${verAnt ? 40 : 30}`);
  tela.innerHTML = `
    <div class="topo"><div><h1>Olá, ${esc(estado.usuario.nome.split(' ')[0])}</h1><p class="sub">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>
      <div class="acoes"><a class="btn prim" href="#/reembolsos/novo">+ Lançar reembolso</a><a class="btn" href="#/compras/requisicoes/nova">+ Requisição de compra</a>${editaFin() ? '<a class="btn" href="#/financeiro/pagar/novo">+ Conta a pagar</a><a class="btn" href="#/financeiro/receber/novo">+ Conta a receber</a>' : ''}</div></div>
    <div class="grade" style="margin-bottom:16px">
      ${!tem('motorista') || veTudo() || tem('aprovador') ? `<a class="cartao kpi ${p.aprovar ? 'alerta' : ''}" href="#/aprovacoes"><div class="n">${p.aprovar || 0}</div><div class="r">para você aprovar</div></a>` : ''}
      <a class="cartao kpi ${p.devolvidos ? 'alerta' : ''}" href="#/reembolsos"><div class="n">${p.devolvidos || 0}</div><div class="r">reembolsos devolvidos para correção</div></a>
      ${editaFin() ? `<a class="cartao kpi" href="#/financeiro/reembolsos?status=aprovado"><div class="n">${p.reembolsos_a_pagar || 0}</div><div class="r">reembolsos aprovados a pagar</div></a>` : ''}
      ${editaFin() ? `<a class="cartao kpi ${p.sem_comprovante ? 'alerta' : ''}" href="#/financeiro/pagar?status=semcomp"><div class="n">${p.sem_comprovante || 0}</div><div class="r">pagamentos sem comprovante</div></a>` : ''}
      ${tem('administrador', 'comprador') ? `<a class="cartao kpi ${p.requisicoes_a_cotar ? 'alerta' : ''}" href="#/compras/cotacoes"><div class="n">${p.requisicoes_a_cotar || 0}</div><div class="r">requisições para cotar</div></a>` : ''}
      ${p.pedidos_a_receber ? `<a class="cartao kpi" href="#/compras/pedidos"><div class="n">${p.pedidos_a_receber}</div><div class="r">pedido(s) de compra a receber</div></a>` : ''}
      ${p.calendario_crlv ? `<a class="cartao kpi alerta" href="#/config/calendario_crlv"><div class="n">${p.calendario_crlv}</div><div class="r">calendário(s) do CRLV do próximo ano para conferir</div></a>` : ''}
      ${p.docs_vencendo ? `<a class="cartao kpi alerta" href="#/frota/documentos"><div class="n">${p.docs_vencendo}</div><div class="r">documento(s) de equipamentos vencidos ou vencendo em 30 dias</div></a>` : ''}
      ${p.pesquisa_aberta ? `<a class="cartao kpi alerta" href="#/clima"><div class="n">💬</div><div class="r">Pesquisa de clima aberta: responda de forma anônima</div></a>` : ''}
      ${tem('administrador', 'rh', 'dp') && p.ferias_vencendo ? `<a class="cartao kpi alerta" href="#/rh/ferias"><div class="n">${p.ferias_vencendo}</div><div class="r">período(s) de férias vencido(s) ou vencendo</div></a>` : ''}
      ${tem('administrador', 'rh', 'dp') && p.desligamentos_andamento ? `<a class="cartao kpi" href="#/rh/desligamentos"><div class="n">${p.desligamentos_andamento}</div><div class="r">desligamento(s) em andamento</div></a>` : ''}
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
      ${p.ssma_acoes_atrasadas ? `<a class="cartao kpi alerta" href="#/ssma/acoes"><div class="n">${p.ssma_acoes_atrasadas}</div><div class="r">ação(ões) de segurança atrasada(s)</div></a>` : ''}
      ${tem('administrador', 'operacao') && p.multas_indicar ? `<a class="cartao kpi alerta" href="#/operacao/ocorrencias?tipo=multa"><div class="n">${p.multas_indicar}</div><div class="r">multa(s) para indicar o condutor (prazo de 30 dias)</div></a>` : ''}
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
    ${agenda}
    <div class="cartao"><div class="topo" style="margin:0 0 6px"><div><h2 style="margin:0">${verAnt ? 'Avisos (todos)' : 'Avisos pendentes'}</h2>
        <p class="muted" style="margin:2px 0 0">Só você vê os seus avisos. Os de aprovação, pagamento e cotação somem sozinhos quando o assunto é resolvido.</p></div>
        <div class="acoes">${notifs.some(n => !n.lida) ? '<button class="btn peq" id="lidas">Marcar todos como lidos</button>' : ''}<a class="btn peq" href="#/inicio${verAnt ? '' : '?avisos=todos'}">${verAnt ? 'Só pendentes' : 'Ver anteriores'}</a></div></div>
      ${notifs.length ? `<ul class="lista-simples">${notifs.map(n => `<li class="${n.lida ? '' : 'nao-lida'}"><span>${n.link ? `<a href="${esc(n.link)}">${esc(n.titulo)}</a>` : esc(n.titulo)}${n.corpo ? `<br><span class="muted">${esc(n.corpo)}</span>` : ''}${n.resolvida_em ? ` <span class="tag verde">resolvido</span>` : ''}</span>
        <span class="muted nowrap">${dataHoraBR(n.criado_em)}${!n.lida ? ` <button class="btn peq" data-lida="${n.id}" title="Marcar como lido">✓</button>` : ''}</span></li>`).join('')}</ul>`
        : `<div class="vazio">${verAnt ? 'Nenhum aviso.' : 'Nenhum aviso pendente. 🎉'}</div>`}</div>`;
  $$('[data-lida]', tela).forEach(b => b.onclick = async e => { e.preventDefault(); await api.alterar('notificacoes', `id=eq.${b.dataset.lida}`, { lida: true }); navegar(); });
  $('#lidas')?.addEventListener('click', async () => {
    await api.alterar('notificacoes', `usuario_id=eq.${estado.usuario.id}&lida=eq.false`, { lida: true }); navegar();
  });
});

// ===================== Filtros na própria tela =====================
// Filtra cartões ou linhas já carregados, sem ir ao servidor. Cada item filtrável traz atributos
// data-f-<campo> (texto exibido), data-f-data (AAAA-MM-DD), data-f-valor (número) e data-f-busca (texto livre).
// campos: [{ k: 'colab', rotulo: 'Colaborador' }, …] — as opções saem dos próprios itens.
const _txt = h => String(h ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const fAttr = (k, v) => v == null || v === '' ? '' : ` data-f-${k}="${esc(String(v))}"`;
function filtroLocal(tela, { itens, antes, campos = [], busca = true, periodo = false, rotuloPeriodo = 'Data', aoMudar } = {}) {
  const els = () => $$(itens, tela);
  const todos = els();
  if (!todos.length) return null;
  const chave = 'filtro:' + location.hash.split('?')[0] + ':' + itens;
  let salvo = {}; try { salvo = JSON.parse(sessionStorage.getItem(chave) || '{}'); } catch { /* sem storage */ }
  const usados = campos.map(c => ({ ...c, valores: [...new Set(todos.map(e => e.dataset['f' + c.k[0].toUpperCase() + c.k.slice(1)]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')) }))
    .filter(c => c.valores.length > 1 || salvo[c.k]);
  const barra = document.createElement('div');
  barra.className = 'filtros filtro-local';
  barra.innerHTML = `
    ${busca ? `<input type="search" data-fl="q" placeholder="Buscar…" value="${esc(salvo.q || '')}" aria-label="Buscar">` : ''}
    ${usados.map(c => `<select data-fl="${c.k}" aria-label="${esc(c.rotulo)}"><option value="">${esc(c.rotulo)}: todos</option>${c.valores.map(v => `<option value="${esc(v)}" ${salvo[c.k] === v ? 'selected' : ''}>${esc(c.rotulo)}: ${esc(v)}</option>`).join('')}</select>`).join('')}
    ${periodo ? `<label class="fl-data">${esc(rotuloPeriodo)} de<input type="date" data-fl="de" value="${esc(salvo.de || '')}"></label><label class="fl-data">até<input type="date" data-fl="ate" value="${esc(salvo.ate || '')}"></label>` : ''}
    <button type="button" class="btn peq" data-fl-limpar>Limpar</button>
    <span class="muted filtro-resumo"></span>`;
  (typeof antes === 'string' ? $(antes, tela) : antes || todos[0].closest('.cartao') || todos[0]).before(barra);
  const aplicar = () => {
    const f = {}; $$('[data-fl]', barra).forEach(i => { if (i.value) f[i.dataset.fl] = i.value; });
    try { sessionStorage.setItem(chave, JSON.stringify(f)); } catch { /* ok */ }
    const q = (f.q || '').toLowerCase();
    let n = 0, total = 0; const lista = els();
    for (const e of lista) {
      const d = e.dataset;
      const ok = usados.every(c => !f[c.k] || d['f' + c.k[0].toUpperCase() + c.k.slice(1)] === f[c.k])
        && (!f.de || (d.fData || '') >= f.de) && (!f.ate || (d.fData || '9999') <= f.ate)
        && (!q || (d.fBusca || e.innerText).toLowerCase().includes(q));
      e.hidden = !ok;
      if (!ok) $$('input[type=checkbox]', e).forEach(c => { c.checked = false; });
      if (ok) { n++; total += Number(d.fValor || 0); }
    }
    const ativo = Object.keys(f).length > 0;
    $('.filtro-resumo', barra).innerHTML = ativo ? `<b>${n}</b> de ${lista.length} · ${brl(total)}` : `${lista.length} item(ns) · ${brl(total)}`;
    $$('table', tela).forEach(t => { if ($$('tbody tr', t).some(tr => lista.includes(tr))) { const tf = $('tfoot', t); if (tf) tf.hidden = ativo; } });
    aoMudar?.(n);
  };
  barra.addEventListener('input', aplicar); barra.addEventListener('change', aplicar);
  $('[data-fl-limpar]', barra).onclick = () => { $$('[data-fl]', barra).forEach(i => { i.value = ''; }); aplicar(); };
  aplicar();
  return { aplicar, visiveis: () => els().filter(e => !e.hidden) };
}
