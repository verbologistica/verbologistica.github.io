// Verbo Gestão — Manutenção › Checklists da OS (etapa 3) e pedido de cadastro de peça ao almoxarifado
// A manutenção (analista / coordenador) monta os checklists de recebimento e de liberação: itens com resposta
// Conforme/Não conforme/N.A., Sim/Não, texto livre, formatado (data, hora, km, valor, placa, CPF…) ou lista
// (personalizada ou com dados do sistema). Ao publicar, vira documento padrão na biblioteca de modelos (com versão).
// Na OS o checklist é preenchido no sistema ou no app do mecânico e é obrigatório para encerrar.
'use strict';

const MC_MOM = { recebimento: 'Recebimento', liberacao: 'Liberação' };
const MC_TIPOS = { conforme: 'Conforme / Não conforme / N.A.', sim_nao: 'Sim / Não', texto: 'Texto livre', formatado: 'Formatado (data, km, valor…)', lista: 'Lista suspensa' };
const MC_FMT = { data: 'Data', hora: 'Hora', data_hora: 'Data e hora', numero: 'Número', km: 'Km', moeda: 'Valor (R$)', placa: 'Placa', cpf: 'CPF', telefone: 'Telefone' };
const MC_FONTE = { personalizada: 'Lista personalizada (opções digitadas)', colaboradores: 'Colaboradores', motoristas: 'Motoristas', mecanicos: 'Mecânicos (setor Manutenção)',
  fornecedores: 'Fornecedores', equipamentos: 'Equipamentos (frotas)', componentes: 'Componentes da OS', pecas: 'Peças do almoxarifado' };
const MC_CLASSES = { cavalo: 'Cavalo / caminhão', reboque: 'Composição (carretas)', veiculo: 'Outros veículos' };
const MC_RESP = { c: 'Conforme', nc: 'Não conforme', na: 'N.A.', sim: 'Sim', nao: 'Não' };
const MC_UNID = ['un', 'pç', 'jg', 'kit', 'par', 'l', 'kg', 'm', 'cx'];
const MC_CAT = ['Peças', 'Pneus', 'Óleos e lubrificantes', 'Filtros', 'Ferramentas', 'EPI', 'Outro'];
const mcEdita = () => tem('administrador', 'manutencao');

(() => { if (document.getElementById('mc-css')) return; const s = document.createElement('style'); s.id = 'mc-css'; s.textContent = `
.mc-item { border:1px solid #E3E8EC; border-radius:10px; padding:10px 12px; margin:8px 0; background:#fff }
.mc-item.nc { border-color:#C62828; background:#FDF3F2 }
.mc-item .rot { font-weight:700 } .mc-item .aj { font-size:12px; color:#6B7378 }
.mc-sec { margin:16px 0 4px; font-size:13px; letter-spacing:.08em; text-transform:uppercase; color:#00684A }
.mc-resp { display:flex; gap:6px; flex-wrap:wrap; margin-top:6px } .mc-resp label { border:1px solid #CFD8DE; border-radius:999px; padding:6px 14px; cursor:pointer; background:#fff; font-weight:600 }
.mc-resp input { display:none } .mc-resp label:has(input:checked) { background:#00684A; color:#fff; border-color:#00684A }
.mc-resp label.r-nc:has(input:checked) { background:#C62828; border-color:#C62828 }
.mc-linha { display:grid; grid-template-columns: 32px 1fr auto; gap:10px; align-items:center; padding:8px 0; border-bottom:1px solid #EEF1F3 }
.mc-linha .n { color:#6B7378; font-size:12px; text-align:center }
.mc-chk { display:grid; grid-template-columns: 1fr auto; gap:10px; align-items:center; border-left:4px solid #00684A; padding:8px 12px; margin:8px 0; background:#F7FAF8; border-radius:6px }
.mc-chk.pend { border-left-color:#DDA936 }`; document.head.append(s); })();

// ---------- listas com dados do sistema (para os itens do tipo lista) ----------
async function mcFontes(itens) {
  const pedidas = new Set(itens.filter(i => i.tipo === 'lista' && i.fonte && i.fonte !== 'personalizada').map(i => i.fonte)), F = {};
  const pessoas = [...pedidas].some(f => ['colaboradores', 'motoristas', 'mecanicos'].includes(f)) ? await api.listar('v_colaboradores_basico', 'select=id,nome,matricula,cargo,setor&order=nome').catch(() => []) : [];
  const op = (lista, t) => lista.map(x => t(x)).filter(Boolean);
  for (const f of pedidas) {
    if (f === 'colaboradores') F[f] = op(pessoas, p => p.nome + (p.matricula ? ' · mat. ' + p.matricula : ''));
    else if (f === 'motoristas') F[f] = op(pessoas.filter(p => /motorista/i.test(p.cargo || '')), p => p.nome + (p.matricula ? ' · mat. ' + p.matricula : ''));
    else if (f === 'mecanicos') F[f] = op(pessoas.filter(p => /manuten/i.test(p.setor || '') || /mec[aâ]nic|eletricista|borracheir|soldador|lubrific/i.test(p.cargo || '')), p => p.nome + (p.matricula ? ' · mat. ' + p.matricula : ''));
    else if (f === 'fornecedores') F[f] = op(await api.listar('fornecedores', 'ativo=eq.true&select=razao_social,nome_fantasia&order=razao_social').catch(() => []), x => x.nome_fantasia || x.razao_social);
    else if (f === 'equipamentos') F[f] = op(await api.listar('equipamentos', 'ativo=eq.true&select=codigo_frota,tipo,tipo_outro,marca,modelo&order=codigo_frota').catch(() => []), x => rotuloEq(x));
    else if (f === 'componentes') F[f] = op(await moComponentes().catch(() => []), x => x.nome);
    else if (f === 'pecas') F[f] = op(await api.listar('almox_itens', 'ativo=eq.true&select=codigo,descricao&order=descricao').catch(() => []), x => x.codigo + ' · ' + x.descricao);
  }
  return F;
}
const mcOpcoes = (i, F) => i.fonte === 'personalizada' ? (i.opcoes || []) : (F[i.fonte] || []);
const mcTxt = (i, r) => { if (!r || r.v == null || r.v === '' || (Array.isArray(r.v) && !r.v.length)) return '';
  if (i.tipo === 'conforme' || i.tipo === 'sim_nao') return MC_RESP[r.v] || r.v;
  if (Array.isArray(r.v)) return r.v.join(', ');
  if (i.tipo === 'formatado') { if (i.formato === 'data') return dataBR(r.v); if (i.formato === 'data_hora') return dataHoraBR(r.v); if (i.formato === 'moeda') return brl(num(r.v)); if (i.formato === 'km') return kmBR(num(r.v)); }
  return String(r.v); };
function mcFmtErro(i, v) {
  if (i.tipo !== 'formatado' || !v) return null; const d = String(v).replace(/\D/g, '');
  if (i.formato === 'placa' && !/^[A-Z]{3}-?\d[A-Z0-9]\d{2}$/i.test(v)) return `"${i.rotulo}": placa inválida.`;
  if (i.formato === 'cpf' && d.length !== 11) return `"${i.rotulo}": CPF precisa de 11 dígitos.`;
  if (i.formato === 'telefone' && !(d.length === 10 || d.length === 11)) return `"${i.rotulo}": telefone com DDD.`;
  if (['numero', 'km', 'moeda'].includes(i.formato) && num(v) == null) return `"${i.rotulo}": número inválido.`;
  return null;
}

// ---------- campo de resposta de um item ----------
function mcCampo(i, r, F, so = false) {
  const id = i.id, v = r?.v ?? '', dis = so ? 'disabled' : '';
  let campo = '';
  if (i.tipo === 'conforme') campo = `<div class="mc-resp">${[['c', 'Conforme'], ['nc', 'Não conforme'], ['na', 'N.A.']].map(([k, t]) => `<label class="r-${k}"><input type="radio" name="v_${id}" value="${k}" ${v === k ? 'checked' : ''} ${dis}>${t}</label>`).join('')}</div>`;
  else if (i.tipo === 'sim_nao') campo = `<div class="mc-resp">${[['sim', 'Sim'], ['nao', 'Não']].map(([k, t]) => `<label><input type="radio" name="v_${id}" value="${k}" ${v === k ? 'checked' : ''} ${dis}>${t}</label>`).join('')}</div>`;
  else if (i.tipo === 'texto') campo = `<textarea name="v_${id}" rows="2" ${dis}>${esc(v)}</textarea>`;
  else if (i.tipo === 'lista') { const ops = mcOpcoes(i, F), sel = Array.isArray(v) ? v : [v];
    campo = i.multipla ? `<select name="v_${id}" multiple size="${Math.min(6, Math.max(3, ops.length))}" ${dis}>${ops.map(o => `<option ${sel.includes(o) ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select><span class="muted" style="font-size:12px">Ctrl/toque para marcar mais de um.</span>`
      : `<select name="v_${id}" ${dis}><option value="">Selecione…</option>${ops.map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`; }
  else { const f = i.formato, tp = { data: 'date', hora: 'time', data_hora: 'datetime-local' }[f] || 'text', im = ['numero', 'km', 'moeda'].includes(f) ? 'inputmode="decimal"' : ['cpf', 'telefone'].includes(f) ? 'inputmode="numeric"' : '';
    campo = `<input name="v_${id}" type="${tp}" ${im} value="${esc(v)}" ${f === 'placa' ? 'style="text-transform:uppercase" maxlength="8"' : ''} placeholder="${esc(MC_FMT[f] || '')}" ${dis}>`; }
  const precisaFoto = i.foto_obrigatoria || i.foto_nc;
  return `<div class="mc-item ${v === 'nc' ? 'nc' : ''}" data-item="${id}"><div class="rot">${esc(i.rotulo)}${i.obrigatorio ? ' <span style="color:#C62828">*</span>' : ''}</div>${i.ajuda ? `<div class="aj">${esc(i.ajuda)}</div>` : ''}
    <div style="margin-top:6px">${campo}</div>
    <label class="campo" style="margin-top:6px" data-obs="${id}"><span class="muted" style="font-size:12px">Observação${i.tipo === 'conforme' ? ' (obrigatória se não conforme)' : ''}</span><input name="obs_${id}" value="${esc(r?.obs || '')}" ${dis}></label>
    ${precisaFoto ? `<label class="campo" style="margin-top:6px"><span class="muted" style="font-size:12px">Foto${i.foto_obrigatoria ? ' (obrigatória)' : ' (obrigatória se não conforme)'}${r?.foto ? ' · <b style="color:#00684A">✓ já anexada</b>' : ''}</span>${so ? '' : `<input type="file" name="f_${id}" accept="image/*" capture="environment">`}</label>` : ''}</div>`;
}
function mcFormItens(itens, resp, F, so = false) {
  let h = '', sec = null;
  for (const i of itens) { if ((i.secao || '') !== sec) { sec = i.secao || ''; if (sec) h += `<div class="mc-sec">${esc(sec)}</div>`; } h += mcCampo(i, resp?.[i.id], F, so); }
  return h;
}
function mcColetar(form, itens, antes) {
  const R = {};
  for (const i of itens) {
    const el = form.elements['v_' + i.id]; let v = '';
    if (i.tipo === 'conforme' || i.tipo === 'sim_nao') v = form.querySelector(`[name="v_${i.id}"]:checked`)?.value || '';
    else if (el && el.multiple) v = [...el.selectedOptions].map(o => o.value);
    else if (el) v = el.value.trim();
    if (i.formato === 'placa' && v) v = v.toUpperCase();
    const obs = form.elements['obs_' + i.id]?.value.trim() || '', file = form.elements['f_' + i.id]?.files?.[0] || null;
    R[i.id] = { v, ...(obs ? { obs } : {}), ...(antes?.[i.id]?.foto ? { foto: antes[i.id].foto } : {}), _file: file };
  }
  return R;
}
function mcValidar(itens, R, concluir) {
  for (const i of itens) {
    const r = R[i.id], vazio = r.v === '' || (Array.isArray(r.v) && !r.v.length);
    const ef = mcFmtErro(i, r.v); if (ef) return ef;
    if (!concluir) continue;
    if (i.obrigatorio && vazio) return `Responda: "${i.rotulo}".`;
    if (r.v === 'nc' && !r.obs) return `"${i.rotulo}": descreva a não conformidade na observação.`;
    if (((r.v === 'nc' && i.foto_nc) || i.foto_obrigatoria) && !r.foto && !r._file) return `"${i.rotulo}": tire/anexe a foto.`;
  }
  return null;
}

// ===================== Cadastro dos checklists =====================
rota('/manut/checklists', async tela => {
  const ms = await api.listar('manut_chk_modelos', 'ativo=eq.true&order=momento,nome&select=*');
  const ed = mcEdita(), nItens = await api.listar('manut_chk_itens', 'ativo=eq.true&select=modelo_id').catch(() => []);
  const qt = id => nItens.filter(x => x.modelo_id === id).length;
  const sit = m => m.situacao === 'arquivado' ? '<span class="tag">Arquivado</span>' : m.versao ? `<span class="tag verde">Publicado · v${m.versao}</span>` : '<span class="tag amarelo">Rascunho</span>';
  tela.innerHTML = `<div class="topo"><div><h1>Checklists da OS</h1><p class="sub">Recebimento e liberação do equipamento. Quem cadastra: analista ou coordenador de manutenção. Ao publicar, o checklist passa a valer nas OS e vira documento padrão na biblioteca de modelos.</p></div>
    <div class="acoes">${ed ? '<a class="btn prim" href="#/manut/checklists/novo">+ Novo checklist</a>' : ''}<a class="btn" href="#/modelos">Biblioteca de modelos</a></div></div>
    ${['recebimento', 'liberacao'].map(mo => { const l = ms.filter(m => m.momento === mo);
      return `<div class="cartao"><h2>${MC_MOM[mo]}</h2>${l.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Código</th><th>Checklist</th><th>Aplica a</th><th>Tipos de OS</th><th class="num">Itens</th><th>Obrigatório</th><th>Situação</th><th></th></tr></thead><tbody>
        ${l.map(m => `<tr><td data-r="Código"><b>${esc(m.codigo || '')}</b></td><td data-r="Checklist">${esc(m.nome)}</td><td data-r="Aplica a">${(m.classes || []).map(c => MC_CLASSES[c] || c).join(', ')}</td>
          <td data-r="Tipos de OS">${(m.tipos_os || []).map(t => MO_TIPOS[t] || t).join(', ')}</td><td class="num" data-r="Itens">${qt(m.id)}</td><td data-r="Obrigatório">${m.obrigatorio ? 'Sim' : 'Não'}</td><td data-r="Situação">${sit(m)}</td>
          <td><a class="btn peq" href="#/manut/checklists/${m.id}">${ed ? 'Abrir / editar' : 'Ver'}</a></td></tr>`).join('')}</tbody></table></div>` : `<div class="vazio">Nenhum checklist de ${MC_MOM[mo].toLowerCase()} cadastrado.</div>`}</div>`; }).join('')}`;
});

rota('/manut/checklists/:id', async (tela, id) => {
  const novo = id === 'novo', ed = mcEdita();
  const m = novo ? { nome: '', momento: 'recebimento', classes: ['cavalo', 'reboque', 'veiculo'], tipos_os: ['corretiva', 'preventiva', 'preditiva', 'inspecao'], obrigatorio: true, versao: 0, situacao: 'rascunho' }
    : await api.um('manut_chk_modelos', `id=eq.${id}`);
  if (!m) { tela.innerHTML = '<div class="cartao vazio">Checklist não encontrado.</div>'; return; }
  const its = novo ? [] : await api.listar('manut_chk_itens', `modelo_id=eq.${id}&ativo=eq.true&order=ordem,criado_em`);
  const alterado = m.versao > 0 && (its.some(i => new Date(i.atualizado_em) > new Date(new Date(m.publicado_em).getTime() + 3000)) ||
    JSON.stringify(its.map(i => i.id)) !== JSON.stringify((m.itens_pub || []).map(i => i.id)));
  const resumo = i => [MC_TIPOS[i.tipo], i.tipo === 'formatado' && MC_FMT[i.formato], i.tipo === 'lista' && (i.fonte === 'personalizada' ? (i.opcoes || []).join(' / ') : MC_FONTE[i.fonte]), i.multipla && 'várias escolhas',
    i.obrigatorio ? 'obrigatório' : 'opcional', i.foto_nc && 'foto se NC', i.foto_obrigatoria && 'foto obrigatória'].filter(Boolean).join(' · ');
  tela.innerHTML = `<div class="topo"><div><h1>${novo ? 'Novo checklist' : esc(m.codigo + ' · ' + m.nome)}</h1>
      <p class="sub">${novo ? 'Preencha o cabeçalho, salve e depois inclua os itens.' : `${MC_MOM[m.momento]} · ${m.situacao === 'arquivado' ? 'arquivado' : m.versao ? `publicado na versão ${m.versao} em ${dataHoraBR(m.publicado_em)}` : 'rascunho (ainda não vale nas OS)'}${alterado ? ' · <span class="tag amarelo">há alterações não publicadas</span>' : ''}`}</p></div>
    <div class="acoes">${!novo ? `<button class="btn" id="mc-prev">Pré-visualizar</button><button class="btn" id="mc-pdf">⬇ PDF em branco</button>` : ''}
      ${ed && !novo && m.situacao !== 'arquivado' ? `<button class="btn prim" id="mc-pub">${m.versao ? 'Publicar alterações (v' + (m.versao + 1) + ')' : 'Publicar (v1)'}</button><button class="btn perigo" id="mc-arq">Arquivar</button>` : ''}
      ${ed && m.situacao === 'arquivado' ? '<button class="btn" id="mc-reat">Reativar</button>' : ''}<a class="btn" href="#/manut/checklists">Voltar</a></div></div>
    <form class="cartao" id="mc-cab"><h2>Cabeçalho</h2><div class="form">
      <label class="campo largo">Nome do checklist *<input name="nome" required value="${esc(m.nome)}" placeholder="Ex.: Recebimento de cavalo mecânico" ${ed ? '' : 'disabled'}></label>
      <div class="campo"><span>Momento *</span><div class="mo-chips">${Object.entries(MC_MOM).map(([k, t]) => `<label><input type="radio" name="momento" value="${k}" ${m.momento === k ? 'checked' : ''} ${ed ? '' : 'disabled'}>${t}</label>`).join('')}</div></div>
      <label class="campo"><span>Obrigatório para encerrar a OS</span><select name="obrigatorio" ${ed ? '' : 'disabled'}><option value="1" ${m.obrigatorio ? 'selected' : ''}>Sim</option><option value="0" ${m.obrigatorio ? '' : 'selected'}>Não</option></select></label>
      <div class="campo largo"><span>Aplica a *</span><div class="mo-chips">${Object.entries(MC_CLASSES).map(([k, t]) => `<label><input type="checkbox" name="cl_${k}" ${m.classes?.includes(k) ? 'checked' : ''} ${ed ? '' : 'disabled'}>${t}</label>`).join('')}</div></div>
      <div class="campo largo"><span>Tipos de OS *</span><div class="mo-chips">${Object.entries(MO_TIPOS).map(([k, t]) => `<label><input type="checkbox" name="tp_${k}" ${m.tipos_os?.includes(k) ? 'checked' : ''} ${ed ? '' : 'disabled'}>${t}</label>`).join('')}</div></div>
      <label class="campo largo">Descrição / instruções<textarea name="descricao" rows="2" ${ed ? '' : 'disabled'}>${esc(m.descricao || '')}</textarea></label></div>
      ${ed ? `<div class="acoes" style="margin-top:10px"><button class="btn prim">${novo ? 'Salvar e incluir itens' : 'Salvar cabeçalho'}</button></div>` : ''}
      ${!novo && m.versao ? '<p class="muted" style="margin-bottom:0">Cabeçalho (a que equipamentos e OS se aplica, obrigatório) vale na hora. Itens alterados só valem depois de publicar a nova versão; OS já preenchidas guardam a versão que usaram.</p>' : ''}</form>
    ${novo ? '' : `<div class="cartao"><div class="topo" style="margin:0 0 6px"><h2 style="margin:0">Itens (${its.length})</h2>${ed ? '<button class="btn peq prim" id="mc-add">+ Item</button>' : ''}</div>
      ${its.length ? its.map((i, k) => `${(i.secao || '') !== (its[k - 1]?.secao || '') && i.secao ? `<div class="mc-sec">${esc(i.secao)}</div>` : ''}<div class="mc-linha"><div class="n">${k + 1}</div>
        <div><b>${esc(i.rotulo)}</b><div class="muted" style="font-size:12px">${esc(resumo(i))}${i.ajuda ? ' · ' + esc(i.ajuda) : ''}</div></div>
        ${ed ? `<div class="acoes"><button class="btn peq" data-up="${k}" ${k ? '' : 'disabled'}>↑</button><button class="btn peq" data-dn="${k}" ${k < its.length - 1 ? '' : 'disabled'}>↓</button><button class="btn peq" data-ed="${i.id}">Editar</button><button class="btn peq perigo" data-rm="${i.id}">Retirar</button></div>` : '<div></div>'}</div>`).join('')
        : '<div class="vazio">Nenhum item. Inclua os pontos que o mecânico deve conferir.</div>'}</div>`}`;

  $('#mc-cab').onsubmit = async e => { e.preventDefault(); if (!ed) return; const d = formDados(e.target);
    const dados = { nome: d.nome, momento: d.momento, obrigatorio: d.obrigatorio === '1', descricao: d.descricao || null,
      classes: Object.keys(MC_CLASSES).filter(k => d['cl_' + k]), tipos_os: Object.keys(MO_TIPOS).filter(k => d['tp_' + k]) };
    if (!dados.classes.length) return aviso('Marque a que equipamentos se aplica.', true); if (!dados.tipos_os.length) return aviso('Marque ao menos um tipo de OS.', true);
    try { if (novo) { const [n] = await api.inserir('manut_chk_modelos', dados); location.hash = '#/manut/checklists/' + n.id; } else { await api.alterar('manut_chk_modelos', `id=eq.${id}`, dados); aviso('Cabeçalho salvo.'); navegar(); } } catch (err) { falha(err); } };
  if (novo) return;

  const secoes = [...new Set(its.map(i => i.secao).filter(Boolean))];
  const modalItem = async (i = null) => {
    const r = await modal(`<form><h2>${i ? 'Editar item' : 'Novo item'}</h2><div class="form">
      <label class="campo">Seção (agrupa os itens)<input name="secao" list="mc-secs" value="${esc(i?.secao || secoes[secoes.length - 1] || '')}" placeholder="Ex.: Cabine, Pneus, Freios"><datalist id="mc-secs">${secoes.map(s => `<option>${esc(s)}</option>`).join('')}</datalist></label>
      <label class="campo largo">O que conferir *<input name="rotulo" required value="${esc(i?.rotulo || '')}" placeholder="Ex.: Para-brisa sem trincas"></label>
      <label class="campo largo">Orientação para quem preenche<input name="ajuda" value="${esc(i?.ajuda || '')}"></label>
      <label class="campo">Tipo de resposta *<select name="tipo">${Object.entries(MC_TIPOS).map(([k, t]) => `<option value="${k}" ${(i?.tipo || 'conforme') === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo" id="b-fmt">Formato *<select name="formato"><option value="">Selecione…</option>${Object.entries(MC_FMT).map(([k, t]) => `<option value="${k}" ${i?.formato === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo" id="b-fon">De onde vem a lista *<select name="fonte"><option value="">Selecione…</option>${Object.entries(MC_FONTE).map(([k, t]) => `<option value="${k}" ${i?.fonte === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo largo" id="b-ops">Opções (uma por linha) *<textarea name="opcoes" rows="4">${esc((i?.opcoes || []).join('\n'))}</textarea></label>
      <label class="campo" id="b-mul"><span><input type="checkbox" name="multipla" ${i?.multipla ? 'checked' : ''}> Permite marcar mais de uma opção</span></label>
      <label class="campo"><span><input type="checkbox" name="obrigatorio" ${i ? (i.obrigatorio ? 'checked' : '') : 'checked'}> Resposta obrigatória</span></label>
      <label class="campo" id="b-fnc"><span><input type="checkbox" name="foto_nc" ${i?.foto_nc ? 'checked' : ''}> Exigir foto quando não conforme</span></label>
      <label class="campo"><span><input type="checkbox" name="foto_obrigatoria" ${i?.foto_obrigatoria ? 'checked' : ''}> Exigir foto sempre</span></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`,
      { aoAbrir: raiz => { const f = $('form', raiz), vis = () => { const t = f.tipo.value; $('#b-fmt', raiz).hidden = t !== 'formatado'; $('#b-fon', raiz).hidden = $('#b-mul', raiz).hidden = t !== 'lista';
          $('#b-ops', raiz).hidden = !(t === 'lista' && f.fonte.value === 'personalizada'); $('#b-fnc', raiz).hidden = t !== 'conforme'; }; f.onchange = vis; vis(); },
        validar: d => { if (d.tipo === 'formatado' && !d.formato) return 'Escolha o formato.'; if (d.tipo === 'lista' && !d.fonte) return 'Escolha de onde vem a lista.';
          if (d.tipo === 'lista' && d.fonte === 'personalizada' && d.opcoes.split('\n').map(x => x.trim()).filter(Boolean).length < 2) return 'Digite pelo menos 2 opções, uma por linha.'; return null; } });
    if (!r) return;
    const dados = { secao: r.secao || null, rotulo: r.rotulo, ajuda: r.ajuda || null, tipo: r.tipo, formato: r.tipo === 'formatado' ? r.formato : null, fonte: r.tipo === 'lista' ? r.fonte : null,
      opcoes: r.tipo === 'lista' && r.fonte === 'personalizada' ? [...new Set(r.opcoes.split('\n').map(x => x.trim()).filter(Boolean))] : null, multipla: r.tipo === 'lista' && !!r.multipla,
      obrigatorio: !!r.obrigatorio, foto_nc: r.tipo === 'conforme' && !!r.foto_nc, foto_obrigatoria: !!r.foto_obrigatoria };
    try { if (i) await api.alterar('manut_chk_itens', `id=eq.${i.id}`, dados);
      else await api.inserir('manut_chk_itens', { ...dados, modelo_id: id, ordem: (its.reduce((a, x) => Math.max(a, x.ordem || 0), 0)) + 10 });
      navegar(); } catch (err) { falha(err); } };
  $('#mc-add')?.addEventListener('click', () => modalItem());
  $$('[data-ed]', tela).forEach(b => b.onclick = () => modalItem(its.find(i => i.id === b.dataset.ed)));
  $$('[data-rm]', tela).forEach(b => b.onclick = async () => { if (!await confirmar('Retirar este item do checklist? OS já preenchidas não mudam.')) return;
    try { await api.alterar('manut_chk_itens', `id=eq.${b.dataset.rm}`, { ativo: false }); navegar(); } catch (err) { falha(err); } });
  const troca = async (a, b) => { try { const oa = its[a].ordem, ob = its[b].ordem === oa ? oa + 1 : its[b].ordem;
    await api.alterar('manut_chk_itens', `id=eq.${its[a].id}`, { ordem: ob }); await api.alterar('manut_chk_itens', `id=eq.${its[b].id}`, { ordem: oa }); navegar(); } catch (err) { falha(err); } };
  $$('[data-up]', tela).forEach(b => b.onclick = () => troca(+b.dataset.up, +b.dataset.up - 1));
  $$('[data-dn]', tela).forEach(b => b.onclick = () => troca(+b.dataset.dn, +b.dataset.dn + 1));
  $('#mc-pub')?.addEventListener('click', e => ocupado(e.target, async () => {
    if (!its.length) return aviso('Inclua os itens antes de publicar.', true);
    if (!await confirmar(`Publicar a versão ${m.versao + 1}? A partir de agora as OS novas usam esta versão e o documento padrão ${m.codigo} é atualizado na biblioteca de modelos.`, { botao: 'Publicar' })) return;
    try { const r = await api.rpc('manut_chk_publicar', { p_modelo: id }); aviso(`Publicado: versão ${r.versao}.`); navegar(); } catch (err) { falha(err); } }));
  $('#mc-arq')?.addEventListener('click', async () => { if (!await confirmar('Arquivar este checklist? Ele deixa de ser pedido nas OS novas; o que já foi preenchido continua guardado.', { botao: 'Arquivar' })) return;
    try { await api.rpc('manut_chk_arquivar', { p_modelo: id, p_reativar: false }); navegar(); } catch (err) { falha(err); } });
  $('#mc-reat')?.addEventListener('click', async () => { try { await api.rpc('manut_chk_arquivar', { p_modelo: id, p_reativar: true }); navegar(); } catch (err) { falha(err); } });
  $('#mc-prev')?.addEventListener('click', async () => { const F = await mcFontes(its);
    modal(`<div><h2>Pré-visualização · ${esc(m.nome)}</h2><p class="muted">Assim o mecânico vê o checklist (no sistema e no app).</p><form onsubmit="return false">${mcFormItens(its, {}, F)}</form><div class="rodape"><button class="btn prim" data-fechar>Fechar</button></div></div>`); });
  $('#mc-pdf')?.addEventListener('click', e => ocupado(e.target, () => mcPdf({ titulo: `Checklist de ${MC_MOM[m.momento].toLowerCase()} · ${m.nome}`, sub: `${m.codigo} · versão ${m.versao || 'rascunho'}`, branco: true }, its, {}).catch(falha)));
});

// ===================== PDF do checklist (papel timbrado) =====================
async function mcPdf(cab, itens, resp, extra = {}) {
  await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
  const E = (await empresasL().catch(() => []))[0] || {}, IMG = await imagensTimbrado(false);
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' }), ML = 18, MR = 192, TOPO = 40, BASE = 268;
  const C = { texto: [37, 46, 53], cinza: [107, 115, 120], verde: [0, 104, 74], borda: [215, 219, 222], verm: [198, 40, 40] };
  const feitas = new Set(), moldura = () => { const pg = doc.getCurrentPageInfo().pageNumber; if (!feitas.has(pg)) { feitas.add(pg); molduraTimbrado(doc, E, IMG); } };
  let y = 44; moldura();
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...C.texto); doc.text(cab.titulo, ML, y); y += 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...C.cinza); doc.text(cab.sub || '', ML, y); y += 5;
  const cabT = cab.branco ? [['Frota / placas:', '', 'Nº da OS:', ''], ['Data e hora:', '', 'Km:', '']] : (cab.linhas || []);
  if (cabT.length) { doc.autoTable({ startY: y, margin: { left: ML, right: 210 - MR }, theme: 'grid', body: cabT, styles: { fontSize: 8.5, cellPadding: 1.8, lineColor: C.borda, lineWidth: 0.15, textColor: C.texto },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 28 }, 2: { fontStyle: 'bold', cellWidth: 24 } } }); y = doc.lastAutoTable.finalY + 5; }
  const body = [], marcas = []; let sec = null;
  for (const i of itens) {
    if ((i.secao || '') !== sec) { sec = i.secao || ''; if (sec) body.push([{ content: sec.toUpperCase(), colSpan: 3, styles: { fillColor: [227, 241, 235], textColor: C.verde, fontStyle: 'bold' } }]); }
    const r = resp[i.id] || {};
    let txt = cab.branco ? ({ conforme: '( ) Conforme   ( ) Não conforme   ( ) N.A.', sim_nao: '( ) Sim   ( ) Não', lista: i.fonte === 'personalizada' ? (i.opcoes || []).map(o => '( ) ' + o).join('   ') : '' }[i.tipo] || '') : (mcTxt(i, r) || '—');
    if (!cab.branco && r.foto) txt += '\n(foto anexada à OS)';
    if (r.v === 'nc') marcas.push(body.length);
    body.push([i.rotulo + (i.obrigatorio ? ' *' : ''), txt, r.obs || '']);
  }
  doc.autoTable({ startY: y, margin: { left: ML, right: 210 - MR, top: TOPO + 4, bottom: 297 - BASE }, theme: 'grid', head: [['Item', 'Resposta', 'Observação']], body, willDrawPage: moldura,
    styles: { font: 'helvetica', fontSize: 8.5, textColor: C.texto, lineColor: C.borda, lineWidth: 0.15, cellPadding: 1.6, minCellHeight: cab.branco ? 7 : 0 }, headStyles: { fillColor: C.verde, textColor: 255 },
    columnStyles: { 0: { cellWidth: 70 }, 2: { cellWidth: 45 } },
    didParseCell: h => { if (h.section === 'body' && marcas.includes(h.row.index) && h.column.index === 1) { h.cell.styles.textColor = C.verm; h.cell.styles.fontStyle = 'bold'; } } });
  y = doc.lastAutoTable.finalY + 6;
  if (y + 40 > BASE) { doc.addPage(); moldura(); y = TOPO + 6; }
  doc.setFontSize(7.5); doc.setTextColor(...C.cinza); doc.text('* resposta obrigatória' + (cab.branco ? ' · item não conforme: descreva na observação.' : ''), ML, y); y += 8;
  const ass = (x, rot, nome, img) => { if (img) { try { doc.addImage(img, 'PNG', x, y, 70, 22); } catch (e) { } } doc.setDrawColor(...C.texto); doc.line(x, y + 24, x + 75, y + 24);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...C.texto); doc.text(nome || '', x, y + 28); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...C.cinza); doc.text(rot, x, y + 32); };
  ass(ML, extra.rotulo || 'Responsável pela manutenção', extra.nome, extra.assinatura); if (cab.branco) ass(ML + 95, 'Motorista / operação', '', null);
  paginarTimbrado(doc, false);
  doc.save(`${cab.titulo.replace(/[\\/:*?"<>|]/g, '')}${extra.arquivo ? ' ' + extra.arquivo : ''}.pdf`);
}

// ===================== Na OS: checklists e pedidos de cadastro =====================
async function mcSecaoOS(el, o, { ed, aberta, CO, cs, U, afet }) {
  if (!el) return;
  let L = []; try { L = await api.rpc('manut_chk_da_os', { p_os: o.id }); } catch (err) { el.innerHTML = `<p class="muted">Checklists: ${esc(err.message)}</p>`; return; }
  const peds = await api.listar('almox_pedidos_cadastro', `os_id=eq.${o.id}&ativo=eq.true&order=criado_em.desc&select=*,item:almox_itens(codigo,descricao)`).catch(() => []);
  const st = x => !x.chk ? `<span class="tag ${x.obrigatorio ? 'amarelo' : ''}">${x.obrigatorio ? 'pendente · obrigatório' : 'não preenchido'}</span>`
    : x.chk.situacao === 'concluido' ? `<span class="tag ${x.chk.nao_conformes ? 'vermelho' : 'verde'}">concluído${x.chk.nao_conformes ? ' · ' + x.chk.nao_conformes + ' não conforme(s)' : ''}</span>` : '<span class="tag amarelo">em preenchimento</span>';
  el.innerHTML = `<div class="topo" style="margin:0 0 6px"><h2 style="margin:0">Checklists</h2>${mcEdita() ? '<a class="btn peq" href="#/manut/checklists">Cadastrar checklists</a>' : ''}</div>
    ${L.length ? L.map((x, k) => `<div class="mc-chk ${x.chk?.situacao === 'concluido' ? '' : 'pend'}"><div><b>${MC_MOM[x.momento]}</b> · ${esc(x.nome)} <span class="muted">(${esc(x.codigo || '')} v${x.versao})</span> ${st(x)}
        ${x.chk?.situacao === 'concluido' ? `<div class="muted" style="font-size:12px">por ${esc(moColab(CO[x.chk.preenchido_por]) || '—')} em ${dataHoraBR(x.chk.concluido_em)}</div>` : ''}</div>
        <div class="acoes">${ed && aberta ? `<button class="btn peq ${x.chk ? '' : 'prim'}" data-chk="${k}">${!x.chk ? 'Preencher' : x.chk.situacao === 'concluido' ? 'Editar' : 'Continuar'}</button>` : ''}${x.chk ? `<button class="btn peq" data-chkpdf="${k}">⬇ PDF</button>` : ''}</div></div>`).join('')
      : '<p class="muted" style="margin:0">Nenhum checklist publicado para este tipo de OS e de equipamento.</p>'}
    ${peds.length ? `<h3 style="margin:14px 0 4px;font-size:14px">Pedidos de cadastro de peça</h3>${peds.map(p => `<div class="muted" style="font-size:13px">${esc(p.descricao)} · ${p.situacao === 'pendente' ? '<span class="tag amarelo">aguardando almoxarifado</span>'
      : p.situacao === 'aprovado' ? `<span class="tag verde">cadastrada: ${esc(p.item?.codigo || '')}</span>` : `<span class="tag vermelho">recusado</span> ${esc(p.motivo || '')}`}</div>`).join('')}` : ''}`;
  $$('[data-chk]', el).forEach(b => b.onclick = () => mcPreencher(o, L[+b.dataset.chk], cs));
  $$('[data-chkpdf]', el).forEach(b => b.onclick = e => ocupado(e.target, () => { const x = L[+b.dataset.chkpdf];
    return mcPdf({ titulo: `Checklist de ${MC_MOM[x.momento].toLowerCase()} · ${x.nome}`, sub: `${x.codigo} · versão ${x.versao} · ${x.chk.situacao === 'concluido' ? 'concluído em ' + dataHoraBR(x.chk.concluido_em) : 'em preenchimento'}`,
      linhas: [['Frota / placas:', `${o.eq?.codigo_frota || ''} · ${(afet || []).map(moUni).join(' / ')}`, 'Nº da OS:', o.numero || ''], ['Tipo de OS:', MO_TIPOS[o.tipo] || o.tipo, 'Km entrada:', o.km_entrada != null ? kmBR(o.km_entrada) : '—']] },
      x.itens, x.chk.respostas || {}, { nome: moColab(CO[x.chk.preenchido_por]), assinatura: x.chk.assinatura, rotulo: 'Preenchido por', arquivo: o.numero || '' }).catch(falha); }));
}

async function mcPreencher(o, x, cs) {
  const F = await mcFontes(x.itens), antes = x.chk?.respostas || {};
  let form = null, A = null;
  const meu = estado.usuario?.colaborador_id || '';
  const r = await modal(`<form><h2>${MC_MOM[x.momento]} · ${esc(x.nome)}</h2><p class="muted">${esc(o.numero || '')} · ${esc(o.eq?.codigo_frota || '')} · ${esc(x.codigo || '')} v${x.versao}. Itens com * são obrigatórios. Pode salvar e continuar depois.</p>
    ${mcFormItens(x.itens, antes, F)}
    <div class="cartao" style="margin-top:12px"><label class="campo">Quem preencheu *<select name="colab">${moOptColab(cs, x.chk?.preenchido_por || meu)}</select></label>
      <div class="campo"><span>Assinatura de quem preencheu ${x.chk?.assinatura ? '<span class="muted">(já assinada; assine de novo para trocar)</span>' : '*'}</span><canvas class="mo-ass" id="mc-ass"></canvas><button type="button" class="btn peq" id="mc-ass-l" style="margin-top:6px">Limpar</button></div></div>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn" value="rasc">Salvar e continuar depois</button><button class="btn prim" value="conc">Concluir checklist</button></div></form>`,
    { aoAbrir: raiz => { form = $('form', raiz); A = moAssinatura($('#mc-ass', raiz)); $('#mc-ass-l', raiz).onclick = () => A.limpar();
        form.addEventListener('change', ev => { const it = ev.target.closest('[data-item]'); if (it && ev.target.name?.startsWith('v_')) it.classList.toggle('nc', form.querySelector(`[name="${ev.target.name}"]:checked`)?.value === 'nc'); }); },
      validar: d => { const conc = d._acao === 'conc', R = mcColetar(form, x.itens, antes); const e = mcValidar(x.itens, R, conc); if (e) return e;
        if (conc && !d.colab) return 'Selecione quem preencheu.'; if (conc && A.vazia() && !x.chk?.assinatura) return 'Falta a assinatura de quem preencheu.'; return null; } });
  if (!r) return;
  const R = mcColetar(form, x.itens, antes), conc = r._acao === 'conc';
  try {
    aviso('Salvando…');
    for (const i of x.itens) { const f = R[i.id]._file; delete R[i.id]._file;
      if (f) { const p = await prepararArquivo(f), cam = `manut_os/${o.id}/${Date.now()}-chk-${nomeArquivo(f.name || 'foto.jpg')}`; await api.enviarArquivo(cam, p);
        await api.inserir('anexos', { entidade: 'manut_os', entidade_id: o.id, caminho_arquivo: cam, nome_original: f.name || 'foto.jpg', tipo_mime: p.type || 'image/jpeg', tamanho_bytes: p.size, enviado_por: estado.usuario.id, descricao: `Checklist ${x.codigo} · ${i.rotulo}`.slice(0, 200) });
        R[i.id].foto = cam; } }
    const res = await api.rpc('manut_chk_salvar', { p_os: o.id, p_modelo: x.modelo_id, p_resp: R, p_concluir: conc, p_assinatura: A && !A.vazia() ? A.png() : null, p_colab: r.colab || null });
    aviso(conc ? `Checklist concluído${res.nao_conformes ? ' com ' + res.nao_conformes + ' não conforme(s)' : ''}.` : 'Checklist salvo.'); navegar();
  } catch (err) { falha(err); }
}

async function mcPedirPeca(osId) {
  const r = await modal(`<form><h2>Pedir cadastro de peça</h2><p class="muted">O almoxarifado recebe o pedido, cadastra a peça (ou indica a que já existe) e você é avisado. Depois é só lançar na OS.</p><div class="form">
    <label class="campo largo">Descrição da peça *<input name="descricao" required placeholder="Ex.: Fueiro 1,20 m para carreta canavieira"></label>
    <label class="campo">Marca<input name="marca"></label><label class="campo">Código do fabricante / referência<input name="referencia"></label>
    <label class="campo">Unidade<select name="unidade">${MC_UNID.map(u => `<option>${u}</option>`).join('')}</select></label>
    <label class="campo">Categoria<select name="categoria">${MC_CAT.map(c => `<option>${c}</option>`).join('')}</select></label>
    <label class="campo largo">Onde é usada<input name="aplicacao" placeholder="Ex.: carretas Randon · eixo 2"></label>
    <label class="campo largo">Observação<textarea name="observacao" rows="2"></textarea></label></div>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Enviar ao almoxarifado</button></div></form>`, { validar: d => d.descricao.length < 3 ? 'Descreva a peça.' : null });
  if (!r) return false;
  try { await api.rpc('almox_pedir_cadastro', { d: { ...r, os_id: osId || '' } }); aviso('Pedido enviado ao almoxarifado.'); return true; } catch (err) { falha(err); return false; }
}

// ===================== Almoxarifado: pedidos de cadastro =====================
rota('/almox/pedidos-cadastro', async tela => {
  const qs = new URLSearchParams(location.hash.split('?')[1] || ''), sit = qs.get('sit') || 'pendente';
  const ps = await api.listar('almox_pedidos_cadastro', `ativo=eq.true${sit === 'todos' ? '' : '&situacao=eq.' + sit}&order=criado_em.desc&limit=300&select=*,item:almox_itens(codigo,descricao),os:manut_os(numero)`);
  const pessoas = await api.listar('v_colaboradores_basico', 'select=id,nome,matricula').catch(() => []), P = Object.fromEntries(pessoas.map(p => [p.id, p]));
  const ed = tem('administrador', 'almoxarifado');
  tela.innerHTML = `<div class="topo"><div><h1>Pedidos de cadastro de peça</h1><p class="sub">A manutenção só lança na OS peças cadastradas no almoxarifado. Quando a peça não existe, o mecânico ou a analista pede o cadastro aqui.</p></div>
    <div class="acoes">${[['pendente', 'Pendentes'], ['aprovado', 'Cadastrados'], ['recusado', 'Recusados'], ['todos', 'Todos']].map(([k, t]) => `<a class="btn ${k === sit ? 'prim' : ''}" href="#/almox/pedidos-cadastro?sit=${k}">${t}</a>`).join('')}</div></div>
    <div class="cartao">${ps.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Pedido em</th><th>Peça</th><th>Onde é usada</th><th>OS</th><th>Pedido por</th><th>Situação</th><th></th></tr></thead><tbody>
      ${ps.map(p => `<tr><td data-r="Pedido em">${dataHoraBR(p.criado_em)}</td><td data-r="Peça"><b>${esc(p.descricao)}</b><div class="muted" style="font-size:12px">${esc([p.marca, p.referencia && 'ref. ' + p.referencia, p.unidade, p.categoria].filter(Boolean).join(' · '))}${p.observacao ? '<br>' + esc(p.observacao) : ''}</div></td>
        <td data-r="Onde é usada">${esc(p.aplicacao || '—')}</td><td data-r="OS">${p.os_id ? `<a href="#/manut/os/ver/${p.os_id}">${esc(p.os?.numero || 'ver')}</a>` : '—'}</td><td data-r="Pedido por">${esc(P[p.solicitante_colab]?.nome || '—')}</td>
        <td data-r="Situação">${p.situacao === 'pendente' ? '<span class="tag amarelo">Pendente</span>' : p.situacao === 'aprovado' ? `<span class="tag verde">${esc(p.item?.codigo || '')}</span> ${esc(p.item?.descricao || '')}` : `<span class="tag vermelho">Recusado</span> ${esc(p.motivo || '')}`}</td>
        <td>${ed && p.situacao === 'pendente' ? `<div class="acoes"><button class="btn peq prim" data-cri="${p.id}">Cadastrar</button><button class="btn peq" data-vin="${p.id}">Já existe</button><button class="btn peq perigo" data-rec="${p.id}">Recusar</button></div>` : ''}</td></tr>`).join('')}</tbody></table></div>`
      : '<div class="vazio">Nenhum pedido nesta situação.</div>'}</div>`;
  const P0 = id => ps.find(p => p.id === id);
  $$('[data-cri]', tela).forEach(b => b.onclick = async () => { const p = P0(b.dataset.cri);
    const r = await modal(`<form><h2>Cadastrar peça no almoxarifado</h2><p class="muted">Confira e corrija os dados antes de cadastrar. O código ALM é gerado automaticamente.</p><div class="form">
      <label class="campo largo">Descrição *<input name="descricao" required value="${esc(p.descricao)}"></label>
      <label class="campo">Categoria<select name="categoria">${[...new Set([p.categoria, ...MC_CAT])].map(c => `<option ${c === p.categoria ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
      <label class="campo">Unidade<select name="unidade">${[...new Set([p.unidade, ...MC_UNID])].map(u => `<option ${u === p.unidade ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select></label>
      <label class="campo">Marca<input name="marca" value="${esc(p.marca || '')}"></label><label class="campo">Referência<input name="referencia" value="${esc(p.referencia || '')}"></label>
      <label class="campo">Estoque mínimo<input name="estoque_minimo" inputmode="decimal" value="0"></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Cadastrar</button></div></form>`);
    if (!r) return; try { await api.rpc('almox_decidir_cadastro', { p_id: p.id, p_acao: 'criar', d: { ...r, estoque_minimo: num(r.estoque_minimo) || 0 } }); delete estado.cache?.almox_itens; aviso('Peça cadastrada. A manutenção foi avisada.'); navegar(); } catch (err) { falha(err); } });
  $$('[data-vin]', tela).forEach(b => b.onclick = async () => { const p = P0(b.dataset.vin), its = await api.listar('almox_itens', 'ativo=eq.true&select=id,codigo,descricao&order=descricao');
    const r = await modal(`<form><h2>A peça já está cadastrada</h2><p class="muted">Pedido: <b>${esc(p.descricao)}</b></p><div class="form"><label class="campo largo">Buscar<input id="mc-q" placeholder="código ou nome"></label>
      <label class="campo largo">Item do almoxarifado *<select name="item_id" required size="8">${its.map(i => `<option value="${i.id}">${esc(i.codigo + ' · ' + i.descricao)}</option>`).join('')}</select></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Indicar este item</button></div></form>`,
      { aoAbrir: raiz => { $('#mc-q', raiz).oninput = e => { const q = e.target.value.toLowerCase(); [...$('select', raiz).options].forEach(o => o.hidden = q && !o.text.toLowerCase().includes(q)); }; } });
    if (!r) return; try { await api.rpc('almox_decidir_cadastro', { p_id: p.id, p_acao: 'vincular', d: { item_id: r.item_id } }); aviso('Pedido respondido com o item existente.'); navegar(); } catch (err) { falha(err); } });
  $$('[data-rec]', tela).forEach(b => b.onclick = async () => { const mot = await confirmar('Recusar o pedido de cadastro?', { comMotivo: true, botao: 'Recusar' }); if (!mot) return;
    try { await api.rpc('almox_decidir_cadastro', { p_id: b.dataset.rec, p_acao: 'recusar', d: { motivo: mot } }); navegar(); } catch (err) { falha(err); } });
});
