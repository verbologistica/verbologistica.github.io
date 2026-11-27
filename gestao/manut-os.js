// Verbo Gestão — Manutenção › Ordem de serviço completa (etapa 1)
// Abertura com previsão de liberação · unidades da composição afetadas · falhas por unidade com localização obrigatória
// (lado, eixo, interno/externo, barrote) · pneus com fogo/sulco/estado/recapagem · serviços em linhas (mecânico, início, fim)
// com as peças de cada linha · terceiro e inspeção · liberação com assinaturas · encerramento com checagem automática ·
// validação da analista · repactuação de prazo com justificativa · alerta piscando e sonoro de OS atrasada · PDF.
'use strict';

const MO_TIPOS = { corretiva: 'Corretiva', preventiva: 'Preventiva', preditiva: 'Preditiva', inspecao: 'Inspeção' };
const MO_VAL = { pendente: ['Aguardando validação', 'amarelo'], validada: ['Validada', 'verde'], devolvida: ['Devolvida para correção', 'vermelho'] };
const MO_COBR = { sem_cobranca: 'Sem cobrança', retrabalho: 'Cobrança por retrabalho', cliente: 'Cobrança é do cliente' };
let _moComp = null;
const moComponentes = async () => _moComp || (_moComp = await api.listar('manut_componentes', 'ativo=eq.true&order=ordem'));
const moClasse = t => ['carreta', 'bitrem', 'tritrem', 'rodotrem'].includes(t) ? 'reboque' : ['cavalo_mecanico', 'caminhao'].includes(t) ? 'cavalo' : 'veiculo';
const moEixos = cl => cl === 'reboque' ? 2 : cl === 'cavalo' ? 3 : 2;
const moLocal = s => s ? isoLocal(s) : '';
const moISO = v => v ? new Date(v).toISOString() : null;
const moDur = (a, b) => { if (!a || !b) return '—'; const m = Math.round((new Date(b) - new Date(a)) / 6e4); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + String(m % 60).padStart(2, '0') + ' min' : ''); };
const moLoc = f => [f.lado && (f.lado === 'esquerdo' ? 'Lado esquerdo' : 'Lado direito'), f.eixo && 'eixo ' + f.eixo, f.posicao, f.barrote && 'barrote ' + f.barrote].filter(Boolean).join(' · ');
const moUni = u => u ? `${u.descricao_composicao || 'Unidade ' + u.ordem} · ${u.placa}` : 'Conjunto';
const moColab = c => c ? `${c.nome}${c.matricula ? ' · mat. ' + c.matricula : ''}${c.cargo ? ' · ' + c.cargo : ''}` : '';
const moColabs = () => api.listar('v_colaboradores_basico', 'select=id,nome,matricula,cargo&order=nome').catch(() => []);
const moOptColab = (cs, sel = '') => `<option value="">Selecione…</option>${cs.map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(moColab(c))}</option>`).join('')}`;
const moPrazo = o => { if (!o.previsao_liberacao || ['concluida', 'cancelada'].includes(o.status)) return '';
  const h = (new Date(o.previsao_liberacao) - new Date()) / 36e5, t = Math.abs(h) < 48 ? Math.floor(Math.abs(h)) + ' h ' + String(Math.round(Math.abs(h) % 1 * 60)).padStart(2, '0') + ' min' : Math.round(Math.abs(h) / 24) + ' dias';
  return h < 0 ? `<span class="tag vermelho mo-pisca">atrasada há ${t}</span>` : `<span class="tag ${h < 2 ? 'amarelo' : 'azul'}">faltam ${t}</span>`; };

// estilos do módulo (alerta piscando, chips, desenho dos pneus, assinatura)
(() => { if (document.getElementById('mo-css')) return; const s = document.createElement('style'); s.id = 'mo-css'; s.textContent = `
@keyframes moPisca { 0%,100% { background:#C62828; color:#fff } 50% { background:#F6C343; color:#1F1606 } }
.mo-pisca { animation: moPisca 1s steps(1) infinite; }
#mo-alerta { position:fixed; left:0; right:0; top:0; z-index:90; padding:10px 16px; font-weight:700; animation: moPisca 1s steps(1) infinite; box-shadow:0 4px 14px rgba(0,0,0,.25); display:flex; gap:12px; flex-wrap:wrap; align-items:center }
#mo-alerta a { color:inherit; text-decoration:underline }
.mo-chips { display:flex; gap:6px; flex-wrap:wrap } .mo-chips label { border:1px solid #CFD8DE; border-radius:999px; padding:6px 12px; cursor:pointer; background:#fff }
.mo-chips input { display:none } .mo-chips label:has(input:checked) { background:#00684A; color:#fff; border-color:#00684A }
.mo-uni { border:1px solid #E3E8EC; border-radius:10px; padding:10px 12px; margin:8px 0 }
.mo-uni h3 { margin:0 0 6px; font-size:15px }
.mo-pn svg rect.r { cursor:pointer; fill:#2E3A36 } .mo-pn svg rect.r.s { fill:#DDA936 } .mo-pn svg rect.r:hover { fill:#00684A }
.mo-ass { border:1px dashed #9AA6AC; border-radius:8px; background:#fff; touch-action:none; width:100%; max-width:520px; height:160px; display:block }
.mo-ass-img { max-width:260px; max-height:90px; border-bottom:1px solid #333 }
.mo-linha { border-left:4px solid #00684A; padding:8px 12px; margin:8px 0; background:#F7FAF8; border-radius:6px }
.mo-err li { color:#C62828 } .mo-av li { color:#8A5A00 }`; document.head.append(s); })();

// ---------- desenho para escolher pneus (vista de cima, frente para cima) ----------
function moPneuSvg(classe, eixos, sel = []) {
  const W = 230, y0 = 34, dy = 46, H = y0 + eixos * dy + 10, r = [];
  for (let e = 1; e <= eixos; e++) {
    const y = y0 + (e - 1) * dy, simples = classe !== 'reboque' && e === 1;
    r.push(`<text x="${W / 2}" y="${y + 18}" text-anchor="middle" font-size="11" fill="#6B7378">eixo ${e}</text><line x1="62" x2="${W - 62}" y1="${y + 12}" y2="${y + 12}" stroke="#9AA6AC" stroke-width="4"/>`);
    const rodas = simples ? [['esquerdo', 'externo', 30], ['direito', 'externo', W - 50]] : [['esquerdo', 'externo', 8], ['esquerdo', 'interno', 34], ['direito', 'interno', W - 54], ['direito', 'externo', W - 28]];
    for (const [l, p, x] of rodas) { const k = `${l}|${e}|${p}`;
      r.push(`<rect class="r ${sel.includes(k) ? 's' : ''}" data-k="${k}" x="${x}" y="${y}" width="20" height="26" rx="4"><title>${l} · eixo ${e} · ${p}</title></rect>`); }
  }
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><text x="${W / 2}" y="14" text-anchor="middle" font-size="11" fill="#00684A">▲ frente</text>
    <rect x="${W / 2 - 18}" y="22" width="36" height="${H - 30}" rx="6" fill="#E8F4EC" stroke="#9AA6AC"/>${r.join('')}
    <text x="8" y="${H - 2}" font-size="10" fill="#6B7378">esquerdo</text><text x="${W - 8}" y="${H - 2}" text-anchor="end" font-size="10" fill="#6B7378">direito</text></svg>`;
}

// ---------- assinatura na tela ----------
function moAssinatura(cv) {
  const x = cv.getContext('2d'); let des = false, usou = false;
  const ajusta = () => { const r = cv.getBoundingClientRect(); cv.width = r.width * 2; cv.height = r.height * 2; x.scale(2, 2); x.lineWidth = 2.2; x.lineCap = 'round'; x.strokeStyle = '#10241C'; x.fillStyle = '#fff'; x.fillRect(0, 0, r.width, r.height); };
  ajusta();
  const p = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.onpointerdown = e => { des = true; usou = true; cv.setPointerCapture(e.pointerId); x.beginPath(); x.moveTo(...p(e)); };
  cv.onpointermove = e => { if (!des) return; x.lineTo(...p(e)); x.stroke(); };
  cv.onpointerup = () => { des = false; };
  return { limpar: () => { usou = false; ajusta(); }, vazia: () => !usou, png: () => cv.toDataURL('image/png') };
}

// ===================== Lista de OS =====================
rota('/manut/os', async tela => {
  const sts = pLista('status', 'abertas'), st = sts[0], eqs_ = pLista('eq'), tipos = pLista('tipo'), vals = pLista('validacao');
  let filtro = 'ativo=eq.true';
  if (!temTodos(sts)) filtro += '&' + filtroOu(sts.map(s => s === 'abertas' ? 'status=not.in.(concluida,cancelada)' : 'status=eq.' + s));
  if (eqs_.length) filtro += '&equipamento_id=in.(' + eqs_.join(',') + ')'; if (tipos.length) filtro += '&tipo=in.(' + tipos.join(',') + ')'; if (vals.length) filtro += '&validacao=in.(' + vals.join(',') + ')';
  const [os, eqs] = await Promise.all([api.listar('manut_os', `${filtro}&select=*,eq:equipamentos(codigo_frota,tipo,tipo_outro,marca,modelo),forn:fornecedores(razao_social)&order=aberta_em.desc.nullslast,criado_em.desc&limit=400`), eqsAtivos()]);
  const atr = os.filter(o => o.previsao_liberacao && !['concluida', 'cancelada'].includes(o.status) && new Date(o.previsao_liberacao) < new Date()).length;
  tela.innerHTML = `
    <div class="topo"><div><h1>Ordens de serviço</h1><p class="sub">${os.length} OS${atr ? ` · <b style="color:#C62828">${atr} atrasada(s)</b>` : ''}</p></div><div class="acoes"><button type="button" class="btn" id="mo-app">📲 App do mecânico</button>${editaManut() ? '<a class="btn prim" href="#/manut/os/nova">+ Nova OS</a>' : ''}</div></div>
    <form class="filtros" id="filtros">
      <select name="status"><option value="abertas" ${st === 'abertas' ? 'selected' : ''}>Em aberto</option>${Object.entries(ST_OS).map(([k, [t]]) => `<option value="${k}">${t}</option>`).join('')}<option value="todas">Todas</option></select>
      <select name="eq"><option value="">Todas as frotas</option>${optEq(eqs, '')}</select>
      <select name="tipo"><option value="">Todos os tipos</option>${Object.entries(MO_TIPOS).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select>
      <select name="validacao"><option value="">Qualquer validação</option>${Object.entries(MO_VAL).map(([k, [t]]) => `<option value="${k}">${t}</option>`).join('')}</select><button class="btn">Filtrar</button></form>
    <div class="cartao">${os.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>OS</th><th>Frota</th><th>Tipo</th><th>Problema</th><th>Abertura</th><th>Previsão de liberação</th><th>Situação</th><th>Validação</th><th class="num">Custo</th></tr></thead><tbody>
      ${os.map(o => `<tr class="clicavel" onclick="location.hash='#/manut/os/ver/${o.id}'"><td data-r="OS" class="mono"><b>${esc(o.numero || '')}</b></td><td data-r="Frota">${esc(o.eq?.codigo_frota || '')}${o.equipamento_parado && !['concluida', 'cancelada'].includes(o.status) ? ' <span class="tag vermelho">parado</span>' : ''}</td>
        <td data-r="Tipo">${esc(MO_TIPOS[o.tipo] || nomeTipoOS(o.tipo))}${o.atendimento === 'sos' ? ' <span class="tag vermelho">SOS</span>' : ''}${o.oficina === 'externa' ? `<div class="muted">${esc(o.forn?.razao_social || 'terceiro')}</div>` : ''}</td>
        <td data-r="Problema">${esc((o.problema || '').split('\n')[0].slice(0, 70))}</td><td data-r="Abertura">${dataHoraBR(o.aberta_em || o.criado_em)}</td>
        <td data-r="Previsão">${o.previsao_liberacao ? dataHoraBR(o.previsao_liberacao) + ' ' + moPrazo(o) : '—'}</td><td data-r="Situação">${tagSt(ST_OS, o.status)}</td>
        <td data-r="Validação">${o.validacao ? tagSt(MO_VAL, o.validacao) : '—'}</td><td data-r="Custo" class="num">${brl(Number(o.custo_total || 0) + Number(o.valor_terceiro || 0))}</td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Nenhuma OS.</div>'}</div>`;
  $('#filtros').onsubmit = e => { e.preventDefault(); const d = formDados(e.target); location.hash = '#/manut/os?' + new URLSearchParams(Object.entries(d).filter(([, v]) => v)); };
  $('#mo-app').onclick = () => { const L = 'https://verbologistica.github.io/mecanico/';
    modal(`<div><h2>📲 App do mecânico</h2><p>Os mecânicos abrem no celular, entram com a <b>matrícula</b> e os <b>4 últimos dígitos do CPF</b> (só quem é da manutenção) e veem apenas as OS em aberto.</p>
      <p style="font-size:18px"><b class="mono">${L}</b></p><p class="muted">No celular: abrir o link e "Adicionar à tela inicial" para virar um ícone.</p>
      <div class="rodape"><button type="button" class="btn" id="cp-mec">Copiar link</button><a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent('App do mecânico da Verbo: ' + L)}">Enviar no WhatsApp</a><button type="button" class="btn prim" data-fechar>Fechar</button></div></div>`,
      { aoAbrir: f => { $('#cp-mec', f).onclick = async () => { try { await navigator.clipboard.writeText(L); aviso('Link copiado.'); } catch { aviso(L); } }; } }); };
});

// ===================== Abertura / edição =====================
async function moForm(tela, o = null) {
  if (!editaManut()) { tela.innerHTML = '<div class="cartao vazio">Somente a manutenção abre e edita OS.</div>'; return; }
  const [eqs, fs] = await Promise.all([api.listar('equipamentos', 'select=id,codigo_frota,tipo,tipo_outro,marca,modelo,km_atual,comps:veiculos(id,placa,ordem,descricao_composicao,ativo)&ativo=eq.true&order=codigo_frota'),
    cad('fornecedores', 'select=id,razao_social,nome_fantasia,documento,ativo&order=razao_social')]);
  const eqSel = o?.equipamento_id || estado.params.get('eq') || '';
  const tipo = o?.tipo && MO_TIPOS[o.tipo] ? o.tipo : 'corretiva';
  tela.innerHTML = `<div class="topo"><div><h1>${o ? 'Editar abertura · ' + esc(o.numero) : 'Nova ordem de serviço'}</h1><p class="sub">Campos com * são obrigatórios. Depois de abrir, descreva o problema de cada unidade e lance os serviços.</p></div></div>
    <form id="f-mo"><div class="cartao"><h2>Equipamento</h2><div class="form">
      <label class="campo largo">Frota *<select name="equipamento_id" required><option value="">Selecione…</option>${eqs.map(e => `<option value="${e.id}" ${e.id === eqSel ? 'selected' : ''}>${esc(e.codigo_frota || '')} · ${esc(nomeTipoEq(e))} · ${esc((e.comps || []).filter(c => c.ativo).sort((a, b) => a.ordem - b.ordem).map(c => c.placa).join(' · '))}</option>`).join('')}</select></label>
      <div class="campo largo"><span>Unidades afetadas *</span><div id="mo-unis" class="mo-chips"></div></div></div></div>
    <div class="cartao"><h2>Atendimento</h2><div class="form">
      <div class="campo largo"><span>Tipo de serviço *</span><div class="mo-chips">${Object.entries(MO_TIPOS).map(([k, t]) => `<label><input type="radio" name="tipo" value="${k}" ${k === tipo ? 'checked' : ''}>${t}</label>`).join('')}</div></div>
      <div class="campo largo" id="b-atd"><span>Corretiva: onde foi o atendimento? *</span><div class="mo-chips"><label><input type="radio" name="atendimento" value="base" ${o?.atendimento !== 'sos' ? 'checked' : ''}>Na base</label><label><input type="radio" name="atendimento" value="sos" ${o?.atendimento === 'sos' ? 'checked' : ''}>SOS (socorro em campo)</label></div></div>
      <label class="campo" id="b-sos1">Km inicial do SOS<input name="km_sos_inicial" inputmode="numeric" value="${o?.km_sos_inicial ?? ''}" placeholder="o km final é pedido na liberação"></label>
      <label class="campo">Abertura (data e hora) *<input type="datetime-local" name="aberta_em" required value="${o ? moLocal(o.aberta_em || o.criado_em) : agoraLocal()}"></label>
      <label class="campo">Previsão de liberação *<input type="datetime-local" name="previsao_liberacao" required value="${moLocal(o?.previsao_liberacao)}"></label>
      <label class="campo" id="b-km">Km de entrada *<input name="km_entrada" inputmode="numeric" value="${o?.km_entrada ?? ''}"></label>
      <label class="campo">Prioridade<select name="prioridade">${Object.entries(PRIOR_OS).map(([k, [t]]) => `<option value="${k}" ${k === (o?.prioridade || 'normal') ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="check largo"><input type="checkbox" name="equipamento_parado" ${o ? (o.equipamento_parado ? 'checked' : '') : 'checked'}> Equipamento parado (conta na disponibilidade mecânica até a liberação)</label>
      <label class="campo largo">Relato geral do problema *<textarea name="problema" rows="2" required placeholder="O que foi relatado (o detalhe de cada unidade você lança depois)">${esc(o?.problema || '')}</textarea></label></div></div>
    <div class="cartao"><h2>Quem executa</h2><div class="form">
      <div class="campo largo"><div class="mo-chips"><label><input type="radio" name="oficina" value="interna" ${o?.oficina !== 'externa' ? 'checked' : ''}>Equipe própria</label><label><input type="radio" name="oficina" value="externa" ${o?.oficina === 'externa' ? 'checked' : ''}>Terceiro</label></div></div>
      <label class="campo largo" id="b-forn">Fornecedor (terceiro / empresa de inspeção)<select name="fornecedor_id"><option value="">Selecione…</option>${fs.filter(f => f.ativo).map(f => `<option value="${f.id}" ${f.id === o?.fornecedor_id ? 'selected' : ''}>${esc(rotForn(f))}</option>`).join('')}</select>
        <span class="muted" style="font-size:12px">Não encontrou? Peça ao financeiro para cadastrar o fornecedor (Cadastros › Fornecedores).</span></label></div></div>
    <div class="cartao"><div class="acoes"><button class="btn prim">${o ? 'Salvar' : 'Abrir OS'}</button><a class="btn" href="javascript:history.back()">Cancelar</a></div></div></form>`;
  const f = $('#f-mo');
  const unis = () => { const e = eqs.find(x => x.id === f.equipamento_id.value), cs = (e?.comps || []).filter(c => c.ativo).sort((a, b) => a.ordem - b.ordem);
    $('#mo-unis').innerHTML = cs.length ? (cs.length > 1 ? `<label><input type="checkbox" id="mo-todas">Todas</label>` : '') + cs.map(c => `<label><input type="checkbox" name="u_${c.id}" ${(o?.unidades || []).includes(c.id) || cs.length === 1 ? 'checked' : ''}>${esc(moUni(c))}</label>`).join('') : '<span class="muted">Selecione a frota.</span>';
    $('#mo-todas')?.addEventListener('change', ev => $$('#mo-unis input[name^=u_]').forEach(i => (i.checked = ev.target.checked)));
    const cl = moClasse(e?.tipo); $('#b-km').hidden = cl === 'reboque'; f.km_entrada.required = cl !== 'reboque' && !!e;
    if (e && cl !== 'reboque' && !f.km_entrada.value && e.km_atual != null) f.km_entrada.placeholder = 'último: ' + Number(e.km_atual).toLocaleString('pt-BR'); };
  const vis = () => { const t = f.querySelector('[name=tipo]:checked')?.value, sos = f.querySelector('[name=atendimento]:checked')?.value === 'sos', ext = f.querySelector('[name=oficina]:checked')?.value === 'externa';
    $('#b-atd').hidden = t !== 'corretiva'; $('#b-sos1').hidden = !(t === 'corretiva' && sos); $('#b-forn').hidden = !(ext || t === 'inspecao'); };
  f.equipamento_id.onchange = unis; f.addEventListener('change', vis); unis(); vis();
  f.onsubmit = async e => { e.preventDefault(); const d = formDados(f), eq = eqs.find(x => x.id === d.equipamento_id);
    const us = Object.keys(d).filter(k => k.startsWith('u_') && d[k]).map(k => k.slice(2));
    if (!us.length) return aviso('Marque ao menos uma unidade afetada.', true);
    if (new Date(d.previsao_liberacao) <= new Date(d.aberta_em)) return aviso('A previsão de liberação precisa ser depois da abertura.', true);
    const kmn = v => v ? Number(soDigitos(v)) : null, cl = moClasse(eq?.tipo);
    const dados = { equipamento_id: d.equipamento_id, unidades: us, veiculo_id: us.length === 1 ? us[0] : null, tipo: d.tipo, atendimento: d.tipo === 'corretiva' ? d.atendimento : null,
      km_sos_inicial: d.tipo === 'corretiva' && d.atendimento === 'sos' ? kmn(d.km_sos_inicial) : null,
      aberta_em: moISO(d.aberta_em), previsao_liberacao: moISO(d.previsao_liberacao), km_entrada: cl === 'reboque' ? null : kmn(d.km_entrada), km: cl === 'reboque' ? null : kmn(d.km_entrada),
      prioridade: d.prioridade, equipamento_parado: !!d.equipamento_parado, problema: d.problema, oficina: d.oficina || 'interna', fornecedor_id: d.fornecedor_id || null };
    await ocupado(e.submitter, async () => { try {
      let id = o?.id; if (o) await api.alterar('manut_os', `id=eq.${id}`, dados); else [{ id }] = await api.inserir('manut_os', { ...dados, origem: 'manual' });
      aviso(o ? 'OS salva.' : 'OS aberta. Agora descreva o problema de cada unidade.'); location.hash = '#/manut/os/ver/' + id;
    } catch (err) { falha(err); } }); };
}
rota('/manut/os/nova', tela => moForm(tela));
rota('/manut/os/editar/:id', async (tela, id) => moForm(tela, await api.um('manut_os', `id=eq.${id}`)));

// ===================== Ver / executar a OS =====================
rota('/manut/os/ver/:id', async (tela, id) => {
  const o = await api.um('manut_os', `id=eq.${id}&select=*,eq:equipamentos(id,codigo_frota,tipo,tipo_outro,marca,modelo,km_atual),forn:fornecedores(razao_social,documento)`);
  if (!o) { tela.innerHTML = '<div class="cartao vazio">OS não encontrada ou sem acesso.</div>'; return; }
  const [unis, fal, srv, its, comps, cs, prz, anx] = await Promise.all([
    api.listar('veiculos', `equipamento_id=eq.${o.equipamento_id}&order=ordem&select=id,placa,ordem,descricao_composicao,ativo`),
    api.listar('manut_os_falhas', `os_id=eq.${id}&ativo=eq.true&order=criado_em`), api.listar('manut_os_servicos', `os_id=eq.${id}&ativo=eq.true&order=inicio`),
    api.listar('manut_os_itens', `os_id=eq.${id}&ativo=eq.true&order=criado_em`), moComponentes(), moColabs(),
    api.listar('manut_os_prazos', `os_id=eq.${id}&order=em`).catch(() => []), api.listar('anexos', `entidade=eq.manut_os&entidade_id=eq.${id}&cancelado_em=is.null&select=descricao`).catch(() => [])]);
  const cl = moClasse(o.eq?.tipo), ed = editaManut(), aberta = !['concluida', 'cancelada'].includes(o.status), v2 = o.versao_os === 2 || !!o.previsao_liberacao;
  const C = Object.fromEntries(comps.map(c => [c.codigo, c])), U = Object.fromEntries(unis.map(u => [u.id, u])), CO = Object.fromEntries(cs.map(c => [c.id, c]));
  const afet = (o.unidades?.length ? o.unidades : unis.filter(u => u.ativo).map(u => u.id)).map(k => U[k]).filter(Boolean);
  const temAnx = d => anx.some(a => a.descricao === d);
  const pneuTxt = p => !p ? '<span class="tag amarelo">dados do pneu pendentes</span>' : `Retirado: fogo ${esc(p.fogo_ret || 'sem nº (' + (p.fogo_ret_just || '?') + ')')} · sulco ${esc(p.sulco_ret ? p.sulco_ret + ' mm' : 'sem info (' + (p.sulco_ret_just || '?') + ')')}<br>Aplicado: fogo ${esc(p.fogo_apl || 'sem nº (' + (p.fogo_apl_just || '?') + ')')} · sulco ${esc(p.sulco_apl ? p.sulco_apl + ' mm' : 'sem info (' + (p.sulco_apl_just || '?') + ')')} · ${p.estado_apl === 'reformado' ? 'reformado · ' + esc(p.recapagem || '?') + 'ª recapagem' : esc(p.estado_apl || '?')}`;
  const pecasDe = sid => its.filter(i => i.servico_id === sid);
  tela.innerHTML = `
    <div class="topo"><div><h1>${esc(o.numero || 'OS')} · ${esc(o.eq?.codigo_frota || '')}</h1>
      <p class="sub">${tagSt(ST_OS, o.status)} ${o.validacao ? tagSt(MO_VAL, o.validacao) : ''} · ${esc(MO_TIPOS[o.tipo] || nomeTipoOS(o.tipo))}${o.atendimento ? ' · ' + (o.atendimento === 'sos' ? '<b>SOS</b>' : 'na base') : ''} · ${o.oficina === 'externa' ? 'terceiro: ' + esc(o.forn?.razao_social || 'a definir') : 'equipe própria'}</p></div>
      <div class="acoes">${ed && aberta ? `<a class="btn" href="#/manut/os/editar/${id}">Editar abertura</a>${o.previsao_liberacao ? '<button class="btn" id="mo-prazo">Repactuar prazo</button>' : ''}<button class="btn" id="mo-lib">Liberação e assinaturas</button><button class="btn prim" id="mo-enc">Encerrar OS</button><button class="btn perigo" id="mo-canc">Cancelar</button>` : ''}
        ${ed && o.status === 'concluida' && o.validacao === 'pendente' ? '<button class="btn" id="mo-dev">Devolver para correção</button><button class="btn prim" id="mo-val">✓ Validar</button>' : ''}
        <button class="btn" id="mo-pdf">⬇ PDF da OS</button><a class="btn" href="#/manut/os">Voltar</a></div></div>
    ${o.validacao === 'devolvida' && aberta ? `<div class="cartao" style="border-left:5px solid #C62828"><b>Devolvida pela analista:</b> ${esc(o.devolucao_motivo || '')}</div>` : ''}
    ${o.previsao_liberacao && aberta && new Date(o.previsao_liberacao) < new Date() ? `<div class="cartao mo-pisca" style="font-weight:700">⏰ Previsão de liberação vencida (${dataHoraBR(o.previsao_liberacao)}). Libere o equipamento ou repactue o prazo com justificativa.</div>` : ''}
    <div class="cartao"><div class="form">
      ${[['Abertura', dataHoraBR(o.aberta_em || o.criado_em)], ['Previsão de liberação', o.previsao_liberacao ? dataHoraBR(o.previsao_liberacao) + ' ' + moPrazo(o) : '—'], ['Liberação', o.liberado_em ? dataHoraBR(o.liberado_em) : '—'],
        ['Tempo parado', moDur(o.aberta_em || o.criado_em, o.liberado_em || (aberta ? new Date().toISOString() : o.concluida_em))],
        ...(cl !== 'reboque' ? [['Km entrada / saída', [o.km_entrada != null && kmBR(o.km_entrada), o.km_saida != null && kmBR(o.km_saida)].filter(Boolean).join(' → ') || '—']] : []),
        ...(o.atendimento === 'sos' ? [['Km do SOS', o.km_sos_inicial != null ? `${kmBR(o.km_sos_inicial)} → ${o.km_sos_final != null ? kmBR(o.km_sos_final) : '?'}` : 'pendente']] : []),
        ['Unidades afetadas', afet.map(moUni).join(' / ') || '—'], ['Prioridade', PRIOR_OS[o.prioridade]?.[0] || '']].map(([k, v]) => `<div><div class="muted">${k}</div><b>${v}</b></div>`).join('')}
      <div class="largo"><div class="muted">Relato geral</div><div style="white-space:pre-line">${esc(o.problema || '')}</div></div></div></div>

    <div class="cartao"><h2>Problema de cada unidade</h2>${!v2 ? '<p class="muted">OS aberta antes do novo modelo.</p>' : ''}
      ${afet.map(u => { const ls = fal.filter(x => x.veiculo_id === u.id), ucl = afet.length === 1 && cl !== 'reboque' ? cl : moClasse(o.eq?.tipo);
        return `<div class="mo-uni"><div class="topo" style="margin:0"><h3>${esc(moUni(u))}</h3>${ed && aberta ? `<button class="btn peq prim" data-fal="${u.id}">+ Problema nesta unidade</button>` : ''}</div>
          ${ls.length ? ls.map(x => `<div class="mo-linha"><b>${esc(C[x.componente]?.nome || x.componente)}</b>${moLoc(x) ? ' · ' + esc(moLoc(x)) : ''}<div>${esc(x.descricao)}</div>
            ${C[x.componente]?.pneu ? `<div class="muted" style="margin-top:4px">${pneuTxt(x.pneu)}</div>` : ''}
            ${ed && aberta ? `<div class="acoes" style="margin-top:6px">${C[x.componente]?.pneu ? `<button class="btn peq" data-pneu="${x.id}">Dados do pneu</button>` : ''}<button class="btn peq perigo" data-falrem="${x.id}">Retirar</button></div>` : ''}</div>`).join('')
            : `<p class="muted" style="margin:4px 0">${o.tipo === 'corretiva' ? '<span class="tag amarelo">obrigatório</span> descreva o problema desta unidade.' : 'Nenhum problema lançado.'}</p>`}</div>`; }).join('')}</div>

    <div class="cartao"><div class="topo" style="margin:0 0 8px"><h2 style="margin:0">Serviços executados</h2>${ed && aberta ? '<button class="btn peq prim" id="mo-srv">+ Serviço</button>' : ''}</div>
      ${srv.length ? srv.map(s => { const ps = pecasDe(s.id), mec = CO[s.mecanico_id];
        return `<div class="mo-linha"><div class="topo" style="margin:0"><div><b>${esc(s.descricao)}</b>${s.falha_id ? ` <span class="muted">· ${esc(C[fal.find(f => f.id === s.falha_id)?.componente]?.nome || '')}</span>` : ''}
          <div class="muted">${s.executor === 'terceiro' ? 'Terceiro' + (s.mecanico_terceiro ? ': ' + esc(s.mecanico_terceiro) : '') : esc(moColab(mec) || 'mecânico?')} · ${dataHoraBR(s.inicio)} → ${s.fim ? dataHoraBR(s.fim) : '<span class="tag amarelo">em andamento</span>'} · <b>${moDur(s.inicio, s.fim)}</b></div></div>
          ${ed && aberta ? `<div class="acoes"><button class="btn peq" data-srved="${s.id}">${s.fim ? 'Editar' : 'Finalizar'}</button><button class="btn peq" data-peca="${s.id}">+ Peça</button><button class="btn peq perigo" data-srvrem="${s.id}">Retirar</button></div>` : ''}</div>
          ${ps.length ? `<table class="tabela compacta" style="margin-top:6px"><tbody>${ps.map(i => `<tr><td>${esc(i.descricao || '')}</td><td class="num">${Number(i.quantidade).toLocaleString('pt-BR')}</td><td class="num">${brl(i.valor_total)}</td><td>${ed && aberta ? `<button class="btn peq perigo" data-itrem="${i.id}">×</button>` : ''}</td></tr>`).join('')}</tbody></table>` : '<div class="muted" style="font-size:12px">Sem peças nesta linha.</div>'}</div>`; }).join('')
        : '<div class="vazio">Nenhum serviço lançado.</div>'}
      ${its.filter(i => !i.servico_id).length ? `<p class="muted">Lançamentos antigos sem linha de serviço: ${its.filter(i => !i.servico_id).map(i => esc(i.descricao || '')).join(', ')}</p>` : ''}</div>

    ${o.oficina === 'externa' || o.tipo === 'inspecao' ? `<div class="cartao"><h2>${o.tipo === 'inspecao' ? 'Inspeção' : 'Serviço de terceiro'}</h2><div class="form">
      <div><div class="muted">Fornecedor</div><b>${esc(o.forn?.razao_social || '—')}</b></div>
      ${o.oficina === 'externa' ? `<div><div class="muted">Valor total cobrado</div><b>${o.valor_terceiro ? brl(o.valor_terceiro) : '—'}</b></div><div><div class="muted">Orçamento do fornecedor</div><b>${temAnx('Orçamento do fornecedor') ? '✓ anexado' : '<span class="tag amarelo">falta anexar</span>'}</b></div>` : ''}
      ${o.tipo === 'inspecao' ? `<div><div class="muted">Laudo de inspeção</div><b>${temAnx('Laudo de inspeção') ? '✓ anexado' : '<span class="tag amarelo">falta anexar</span>'}</b></div><div><div class="muted">Cobrança</div><b>${esc(MO_COBR[o.inspecao_cobranca] || '—')}${o.inspecao_cobranca === 'retrabalho' ? ' · ' + brl(o.valor_retrabalho || 0) : ''}</b></div>` : ''}</div>
      ${ed && aberta ? '<div class="acoes" style="margin-top:8px"><button class="btn" id="mo-ter">Preencher / anexar</button></div>' : ''}</div>` : ''}

    <div class="cartao"><h2>Liberação</h2><div class="form">
      <div><div class="muted">Liberado por (manutenção)</div><b>${esc(moColab(CO[o.liberado_por]) || '—')}</b>${o.liberado_assinatura ? `<div><img class="mo-ass-img" src="${o.liberado_assinatura}" alt="assinatura"></div>` : ''}</div>
      <div><div class="muted">Recebido por (motorista / operação)</div><b>${esc(moColab(CO[o.recebido_por]) || '—')}</b>${o.recebido_assinatura ? `<div><img class="mo-ass-img" src="${o.recebido_assinatura}" alt="assinatura"></div>` : ''}</div></div>
      <p class="muted" style="margin-bottom:0">Checklists de recebimento e de liberação da frota: chegam na etapa 3 (a manutenção vai cadastrar os itens).</p></div>

    ${o.inconsistencias?.length || prz.length ? `<div class="cartao"><h2>Controle</h2>
      ${o.inconsistencias?.length ? `<p><b>Avisos da checagem automática</b> (para a analista conferir):</p><ul class="mo-av">${o.inconsistencias.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${prz.length ? `<p><b>Prazo repactuado</b></p><ul>${prz.map(p => `<li>${dataHoraBR(p.anterior)} → <b>${dataHoraBR(p.nova)}</b> em ${dataHoraBR(p.em)}: ${esc(p.justificativa)}</li>`).join('')}</ul>` : ''}</div>` : ''}
    <div class="cartao"><h2>Anexos</h2><div id="mo-anx"></div>${ed ? '<label class="campo" style="margin-top:8px">Anexar fotos ou documentos<input type="file" id="mo-anx-in" multiple></label>' : ''}</div>`;
  $('#mo-anx').innerHTML = await htmlAnexos('manut_os', id);
  $('#mo-anx-in')?.addEventListener('change', async ev => { try { await anexar('manut_os', id, [...ev.target.files]); navegar(); } catch (err) { falha(err); } });

  // + problema na unidade
  $$('[data-fal]', tela).forEach(b => b.onclick = async () => {
    const u = U[b.dataset.fal], ucl = u.descricao_composicao && /cavalo|caminh/i.test(u.descricao_composicao) ? 'cavalo' : cl, nEix = moEixos(ucl);
    const lista = comps.filter(c => c.aplica === 'todos' || c.aplica === (ucl === 'veiculo' ? 'cavalo' : ucl)), grupos = [...new Set(lista.map(c => c.grupo))];
    let selP = [];
    const r = await modal(`<form><h2>Problema · ${esc(moUni(u))}</h2><div class="form">
      <label class="campo largo">Componente *<select name="componente" required><option value="">Selecione…</option>${grupos.map(g => `<optgroup label="${esc(g)}">${lista.filter(c => c.grupo === g).map(c => `<option value="${c.codigo}">${esc(c.nome)}</option>`).join('')}</optgroup>`).join('')}</select></label>
      <div class="largo mo-pn" id="b-pn" hidden><div class="muted">Clique nos pneus com problema (pode marcar mais de um):</div><div id="pn-svg">${moPneuSvg(ucl, nEix)}</div><div id="pn-sel" class="muted"></div></div>
      <label class="campo" id="b-lado">Lado *<select name="lado"><option value="">—</option><option value="esquerdo">Esquerdo</option><option value="direito">Direito</option></select></label>
      <label class="campo" id="b-eixo">Eixo *<select name="eixo"><option value="">—</option>${Array.from({ length: nEix }, (_, i) => `<option>${i + 1}</option>`).join('')}</select></label>
      <label class="campo" id="b-pos">Interno / externo *<select name="posicao"><option value="">—</option><option value="interno">Interno</option><option value="externo">Externo</option></select></label>
      <label class="campo" id="b-bar">Barrote (da frente para trás) *<select name="barrote"><option value="">—</option>${Array.from({ length: 10 }, (_, i) => `<option value="${i + 1}">${i + 1}º barrote</option>`).join('')}</select></label>
      <label class="campo largo">Descrição do problema *<textarea name="descricao" rows="2" required></textarea></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Lançar</button></div></form>`,
      { aoAbrir: raiz => { const f = $('form', raiz); const vis = () => { const c = C[f.componente.value] || {};
          $('#b-pn', raiz).hidden = !c.pneu; $('#b-lado', raiz).hidden = !c.exige_lado || c.pneu; $('#b-eixo', raiz).hidden = !c.exige_eixo || c.pneu; $('#b-pos', raiz).hidden = !c.exige_posicao || c.pneu; $('#b-bar', raiz).hidden = !c.exige_barrote; };
          f.componente.onchange = vis; vis();
          $('#pn-svg', raiz).onclick = ev => { const k = ev.target.closest('rect.r')?.dataset.k; if (!k) return; selP = selP.includes(k) ? selP.filter(x => x !== k) : [...selP, k];
            $('#pn-svg', raiz).innerHTML = moPneuSvg(ucl, nEix, selP); $('#pn-sel', raiz).textContent = selP.map(x => x.split('|')).map(([l, e, p]) => `${l} · eixo ${e} · ${p}`).join(' | '); }; },
        validar: d => { const c = C[d.componente]; if (!c) return 'Escolha o componente.';
          if (c.pneu) return selP.length ? null : 'Marque no desenho qual(is) pneu(s).';
          if (c.exige_lado && !d.lado) return 'Informe o lado.'; if (c.exige_eixo && !d.eixo) return 'Informe o eixo.'; if (c.exige_posicao && !d.posicao) return 'Informe se é interno ou externo.';
          if (c.exige_barrote && !d.barrote) return 'Informe o barrote.'; return null; } });
    if (!r) return;
    const c = C[r.componente], base = { os_id: id, veiculo_id: u.id, componente: r.componente, descricao: r.descricao };
    const linhas = c.pneu ? selP.map(k => { const [l, e, p] = k.split('|'); return { ...base, lado: l, eixo: Number(e), posicao: p }; })
      : [{ ...base, lado: c.exige_lado ? r.lado : null, eixo: c.exige_eixo ? Number(r.eixo) : null, posicao: c.exige_posicao ? r.posicao : null, barrote: c.exige_barrote ? Number(r.barrote) : null }];
    try { await api.inserir('manut_os_falhas', linhas); if (o.status === 'aberta') await api.alterar('manut_os', `id=eq.${id}`, { status: 'em_execucao' }); navegar(); } catch (err) { falha(err); }
  });
  $$('[data-falrem]', tela).forEach(b => b.onclick = async () => { if (!await confirmar('Retirar este problema da OS?')) return; try { await api.alterar('manut_os_falhas', `id=eq.${b.dataset.falrem}`, { ativo: false }); navegar(); } catch (err) { falha(err); } });
  $$('[data-pneu]', tela).forEach(b => b.onclick = async () => { const x = fal.find(f => f.id === b.dataset.pneu), p = x.pneu || {};
    const blocoP = (k, rot, un = '') => `<label class="campo">${rot}<input name="${k}" value="${esc(p[k] || '')}" ${un ? 'inputmode="decimal"' : ''} placeholder="${un}"></label>
      <label class="check"><input type="checkbox" name="${k}_sem" ${p[k + '_just'] ? 'checked' : ''}> ${k.startsWith('fogo') ? 'Sem número de fogo' : 'Sem informação de sulco'}</label>
      <label class="campo largo" data-just="${k}">Justificativa *<input name="${k}_just" value="${esc(p[k + '_just'] || '')}"></label>`;
    const r = await modal(`<form><h2>Pneu · ${esc(moLoc(x))}</h2><p class="muted">Obrigatório para encerrar a OS. Sem o número de fogo ou o sulco, marque e justifique.</p>
      <h3>Pneu retirado</h3><div class="form">${blocoP('fogo_ret', 'Nº de fogo')}${blocoP('sulco_ret', 'Sulco (mm)', 'ex.: 4,5')}</div>
      <h3>Pneu aplicado</h3><div class="form">${blocoP('fogo_apl', 'Nº de fogo')}${blocoP('sulco_apl', 'Sulco (mm)', 'ex.: 16')}
        <label class="campo">Estado *<select name="estado_apl"><option value="">—</option><option value="novo" ${p.estado_apl === 'novo' ? 'selected' : ''}>Novo</option><option value="reformado" ${p.estado_apl === 'reformado' ? 'selected' : ''}>Reformado (recapado)</option></select></label>
        <label class="campo" id="b-rec">Recapagem *<select name="recapagem"><option value="">—</option>${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${String(p.recapagem) === String(n) ? 'selected' : ''}>${n}ª recapagem</option>`).join('')}</select></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`,
      { aoAbrir: raiz => { const f = $('form', raiz); const vis = () => { ['fogo_ret', 'sulco_ret', 'fogo_apl', 'sulco_apl'].forEach(k => { const sem = f[k + '_sem'].checked; $(`[data-just="${k}"]`, raiz).hidden = !sem; f[k].disabled = sem; });
          $('#b-rec', raiz).hidden = f.estado_apl.value !== 'reformado'; }; f.onchange = vis; vis(); },
        validar: d => { for (const k of ['fogo_ret', 'sulco_ret', 'fogo_apl', 'sulco_apl']) { if (d[k + '_sem'] ? !d[k + '_just'] : !d[k]) return 'Preencha ' + (k.startsWith('fogo') ? 'o nº de fogo' : 'o sulco') + (k.endsWith('ret') ? ' do retirado' : ' do aplicado') + ' ou marque e justifique.'; }
          if (!d.estado_apl) return 'Informe o estado do pneu aplicado.'; if (d.estado_apl === 'reformado' && !d.recapagem) return 'Informe a recapagem.'; return null; } });
    if (!r) return;
    const pn = {}; for (const k of ['fogo_ret', 'sulco_ret', 'fogo_apl', 'sulco_apl']) { if (r[k + '_sem']) pn[k + '_just'] = r[k + '_just']; else pn[k] = r[k]; }
    pn.estado_apl = r.estado_apl; if (r.estado_apl === 'reformado') pn.recapagem = r.recapagem;
    try { await api.alterar('manut_os_falhas', `id=eq.${x.id}`, { pneu: pn }); navegar(); } catch (err) { falha(err); } });

  // serviços
  const modalServico = async (s = null) => {
    const r = await modal(`<form><h2>${s ? 'Serviço' : 'Novo serviço'}</h2><div class="form">
      <label class="campo largo">Serviço realizado *<input name="descricao" required value="${esc(s?.descricao || '')}" placeholder="Ex.: troca do fueiro 2º barrote lado direito"></label>
      <label class="campo largo">Problema relacionado<select name="falha_id"><option value="">—</option>${fal.map(f => `<option value="${f.id}" ${f.id === s?.falha_id ? 'selected' : ''}>${esc(moUni(U[f.veiculo_id]) + ' · ' + (C[f.componente]?.nome || '') + (moLoc(f) ? ' · ' + moLoc(f) : ''))}</option>`).join('')}</select></label>
      <div class="campo largo"><div class="mo-chips"><label><input type="radio" name="executor" value="interno" ${(s?.executor || (o.oficina === 'externa' ? 'terceiro' : 'interno')) === 'interno' ? 'checked' : ''}>Mecânico próprio</label><label><input type="radio" name="executor" value="terceiro" ${(s?.executor || (o.oficina === 'externa' ? 'terceiro' : 'interno')) === 'terceiro' ? 'checked' : ''}>Terceiro</label></div></div>
      <label class="campo largo" id="b-mec">Mecânico (nome e matrícula) *<select name="mecanico_id">${moOptColab(cs, s?.mecanico_id || '')}</select><span class="muted" id="mec-info" style="font-size:12px"></span></label>
      <label class="campo largo" id="b-ter">Quem executou no terceiro<input name="mecanico_terceiro" value="${esc(s?.mecanico_terceiro || '')}"></label>
      <label class="campo">Início *<input type="datetime-local" name="inicio" required value="${s ? moLocal(s.inicio) : agoraLocal()}"></label>
      <label class="campo">Fim<input type="datetime-local" name="fim" value="${moLocal(s?.fim)}"></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`,
      { aoAbrir: raiz => { const f = $('form', raiz); const vis = () => { const t = f.querySelector('[name=executor]:checked').value; $('#b-mec', raiz).hidden = t !== 'interno'; $('#b-ter', raiz).hidden = t !== 'terceiro';
          const c = CO[f.mecanico_id.value]; $('#mec-info', raiz).textContent = c ? `Matrícula ${c.matricula || '—'} · ${c.cargo || 'função não cadastrada'}` : ''; }; f.onchange = vis; vis(); },
        validar: d => d.executor === 'interno' && !d.mecanico_id ? 'Selecione o mecânico.' : d.fim && new Date(d.fim) <= new Date(d.inicio) ? 'O fim precisa ser depois do início.' : null });
    if (!r) return;
    const dados = { descricao: r.descricao, falha_id: r.falha_id || null, executor: r.executor, mecanico_id: r.executor === 'interno' ? r.mecanico_id : null, mecanico_terceiro: r.executor === 'terceiro' ? r.mecanico_terceiro || null : null,
      inicio: moISO(r.inicio), fim: moISO(r.fim) };
    try { if (s) await api.alterar('manut_os_servicos', `id=eq.${s.id}`, dados); else await api.inserir('manut_os_servicos', { ...dados, os_id: id });
      if (o.status === 'aberta') await api.alterar('manut_os', `id=eq.${id}`, { status: 'em_execucao' }); navegar(); } catch (err) { falha(err); } };
  $('#mo-srv')?.addEventListener('click', () => modalServico());
  $$('[data-srved]', tela).forEach(b => b.onclick = () => modalServico(srv.find(s => s.id === b.dataset.srved)));
  $$('[data-srvrem]', tela).forEach(b => b.onclick = async () => { if (pecasDe(b.dataset.srvrem).length) return aviso('Retire as peças desta linha antes.', true);
    if (!await confirmar('Retirar este serviço?')) return; try { await api.alterar('manut_os_servicos', `id=eq.${b.dataset.srvrem}`, { ativo: false }); navegar(); } catch (err) { falha(err); } });
  $$('[data-peca]', tela).forEach(b => b.onclick = async () => {
    const pecas = await api.listar('almox_itens', 'ativo=eq.true&select=id,codigo,descricao,unidade,saldo,custo_medio&order=descricao').catch(() => []), P = Object.fromEntries(pecas.map(p => [p.id, p]));
    const r = await modal(`<form><h2>Peça aplicada</h2><p class="muted">${esc(srv.find(s => s.id === b.dataset.peca)?.descricao || '')}</p><div class="form">
      <div class="campo largo"><div class="mo-chips"><label><input type="radio" name="tipo" value="peca_estoque" checked>Do nosso almoxarifado</label><label><input type="radio" name="tipo" value="peca_terceiro">Peça do terceiro</label></div></div>
      <label class="campo largo">Peça (cadastro do almoxarifado) *<select name="almox_item_id" required><option value="">Selecione…</option>${pecas.map(p => `<option value="${p.id}">${esc(p.codigo + ' · ' + p.descricao)} · estoque ${Number(p.saldo).toLocaleString('pt-BR')} ${esc(p.unidade)}</option>`).join('')}</select>
        <span class="muted" style="font-size:12px">A peça precisa estar cadastrada no almoxarifado. Se não estiver, peça o cadastro ao almoxarifado antes de lançar.</span></label>
      <label class="campo">Quantidade *<input name="quantidade" inputmode="decimal" value="1"></label>
      <label class="campo" id="b-pv">Valor unitário cobrado pelo terceiro (R$) *<input name="valor_unitario" inputmode="decimal"></label>
      <div class="campo" id="b-pe"><span>Estado *</span><div class="mo-chips"><label><input type="radio" name="estado_peca" value="nova">Nova</label><label><input type="radio" name="estado_peca" value="usada">Usada</label></div></div></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Lançar</button></div></form>`,
      { aoAbrir: raiz => { const f = $('form', raiz); const vis = () => { const ter = f.querySelector('[name=tipo]:checked').value === 'peca_terceiro'; $('#b-pv', raiz).hidden = $('#b-pe', raiz).hidden = !ter; }; f.onchange = vis; vis(); },
        validar: d => { const p = P[d.almox_item_id], q = num(d.quantidade); if (!p) return 'Escolha a peça do cadastro.'; if (!(q > 0)) return 'Informe a quantidade.';
          if (d.tipo === 'peca_estoque' && Number(p.saldo) < q) return `Estoque insuficiente (${Number(p.saldo).toLocaleString('pt-BR')} ${p.unidade}). Se a peça veio do terceiro, marque "Peça do terceiro".`;
          if (d.tipo === 'peca_terceiro') { if (!(num(d.valor_unitario) > 0)) return 'Informe o valor cobrado pelo terceiro.'; if (!d.estado_peca) return 'Informe se a peça é nova ou usada.'; } return null; } });
    if (!r) return;
    try { await api.inserir('manut_os_itens', { os_id: id, servico_id: b.dataset.peca, tipo: r.tipo, almox_item_id: r.almox_item_id, quantidade: num(r.quantidade),
        valor_unitario: r.tipo === 'peca_terceiro' ? num(r.valor_unitario) : 0, estado_peca: r.tipo === 'peca_terceiro' ? r.estado_peca : null, fornecedor_id: r.tipo === 'peca_terceiro' ? o.fornecedor_id || null : null });
      delete estado.cache.almox_itens; navegar(); } catch (err) { falha(err); } });
  $$('[data-itrem]', tela).forEach(b => b.onclick = async () => { if (!await confirmar('Retirar esta peça? Peça do estoque volta ao almoxarifado.')) return;
    try { await api.alterar('manut_os_itens', `id=eq.${b.dataset.itrem}`, { ativo: false }); delete estado.cache.almox_itens; navegar(); } catch (err) { falha(err); } });

  // terceiro / inspeção
  $('#mo-ter')?.addEventListener('click', async () => {
    const fs = await cad('fornecedores', 'select=id,razao_social,nome_fantasia,documento,ativo&order=razao_social');
    const r = await modal(`<form><h2>${o.tipo === 'inspecao' ? 'Inspeção' : 'Serviço de terceiro'}</h2><div class="form">
      <label class="campo largo">Fornecedor *<select name="fornecedor_id" required><option value="">Selecione…</option>${fs.filter(f => f.ativo).map(f => `<option value="${f.id}" ${f.id === o.fornecedor_id ? 'selected' : ''}>${esc(rotForn(f))}</option>`).join('')}</select>
        <span class="muted" style="font-size:12px">Não encontrou? Peça ao financeiro para cadastrar.</span></label>
      ${o.oficina === 'externa' ? `<label class="campo">Valor total cobrado (R$) *<input name="valor_terceiro" inputmode="decimal" value="${o.valor_terceiro ?? ''}"></label>
        <label class="campo largo">Orçamento do fornecedor${temAnx('Orçamento do fornecedor') ? ' (já anexado; envie outro se mudou)' : ' *'}<input type="file" name="orcamento" accept="image/*,application/pdf"></label>` : ''}
      ${o.tipo === 'inspecao' ? `<label class="campo largo">Laudo de inspeção${temAnx('Laudo de inspeção') ? ' (já anexado)' : ' *'}<input type="file" name="laudo" accept="image/*,application/pdf"></label>
        <label class="campo">Cobrança *<select name="inspecao_cobranca"><option value="">—</option>${Object.entries(MO_COBR).map(([k, t]) => `<option value="${k}" ${k === o.inspecao_cobranca ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label class="campo" id="b-rv">Valor do retrabalho (R$)<input name="valor_retrabalho" inputmode="decimal" value="${o.valor_retrabalho ?? ''}"></label>
        <label class="campo largo" id="b-ro">Orçamento do retrabalho<input type="file" name="orc_retrabalho" accept="image/*,application/pdf"></label>` : ''}</div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`,
      { aoAbrir: raiz => { const f = $('form', raiz); const vis = () => { if (f.inspecao_cobranca) { const rt = f.inspecao_cobranca.value === 'retrabalho'; $('#b-rv', raiz).hidden = $('#b-ro', raiz).hidden = !rt; } }; f.onchange = vis; vis(); } });
    if (!r) return;
    try { await api.alterar('manut_os', `id=eq.${id}`, { fornecedor_id: r.fornecedor_id, ...(o.oficina === 'externa' ? { valor_terceiro: num(r.valor_terceiro) } : {}),
        ...(o.tipo === 'inspecao' ? { inspecao_cobranca: r.inspecao_cobranca || null, valor_retrabalho: r.inspecao_cobranca === 'retrabalho' ? num(r.valor_retrabalho) : null } : {}) });
      if (r.orcamento?.length) await anexar('manut_os', id, r.orcamento, 'Orçamento do fornecedor');
      if (r.laudo?.length) await anexar('manut_os', id, r.laudo, 'Laudo de inspeção');
      if (r.orc_retrabalho?.length) await anexar('manut_os', id, r.orc_retrabalho, 'Orçamento do retrabalho');
      navegar(); } catch (err) { falha(err); } });

  // liberação com assinaturas
  $('#mo-lib')?.addEventListener('click', async () => { let A1, A2;
    const r = await modal(`<form><h2>Liberação do equipamento</h2><div class="form">
      <label class="campo">Data e hora da liberação *<input type="datetime-local" name="liberado_em" required value="${o.liberado_em ? moLocal(o.liberado_em) : agoraLocal()}"></label>
      ${cl !== 'reboque' ? `<label class="campo">Km de saída *<input name="km_saida" inputmode="numeric" required value="${o.km_saida ?? ''}" placeholder="entrada: ${o.km_entrada ?? '—'}"></label>` : ''}
      ${o.atendimento === 'sos' ? `<label class="campo">Km inicial do SOS *<input name="km_sos_inicial" inputmode="numeric" required value="${o.km_sos_inicial ?? ''}"></label><label class="campo">Km final do SOS *<input name="km_sos_final" inputmode="numeric" required value="${o.km_sos_final ?? ''}"></label>` : ''}
      <label class="campo largo">Responsável pela manutenção *<select name="liberado_por" required>${moOptColab(cs, o.liberado_por || '')}</select><span class="muted" id="i1" style="font-size:12px"></span></label>
      <div class="largo"><div class="muted">Assinatura do responsável pela manutenção *</div><canvas class="mo-ass" id="a1"></canvas><button type="button" class="btn peq" id="l1">Limpar</button></div>
      <label class="campo largo">Quem recebeu o equipamento (motorista ou operação) *<select name="recebido_por" required>${moOptColab(cs, o.recebido_por || '')}</select><span class="muted" id="i2" style="font-size:12px"></span></label>
      <div class="largo"><div class="muted">Assinatura de quem recebeu *</div><canvas class="mo-ass" id="a2"></canvas><button type="button" class="btn peq" id="l2">Limpar</button></div></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar liberação</button></div></form>`,
      { aoAbrir: raiz => { A1 = moAssinatura($('#a1', raiz)); A2 = moAssinatura($('#a2', raiz)); $('#l1', raiz).onclick = () => A1.limpar(); $('#l2', raiz).onclick = () => A2.limpar();
          const f = $('form', raiz), inf = () => { const a = CO[f.liberado_por.value], b2 = CO[f.recebido_por.value]; $('#i1', raiz).textContent = a ? `Matrícula ${a.matricula || '—'} · ${a.cargo || ''}` : ''; $('#i2', raiz).textContent = b2 ? `Matrícula ${b2.matricula || '—'} · ${b2.cargo || ''}` : ''; };
          f.onchange = inf; inf(); },
        validar: d => A1.vazia() ? 'Falta a assinatura do responsável pela manutenção.' : A2.vazia() ? 'Falta a assinatura de quem recebeu.' : d.liberado_por === d.recebido_por ? 'Quem libera e quem recebe precisam ser pessoas diferentes.' : null });
    if (!r) return;
    const kmn = v => v ? Number(soDigitos(v)) : null;
    try { await api.alterar('manut_os', `id=eq.${id}`, { liberado_em: moISO(r.liberado_em), liberado_por: r.liberado_por, liberado_assinatura: A1.png(), recebido_por: r.recebido_por, recebido_assinatura: A2.png(), recebido_em: moISO(r.liberado_em),
        ...(cl !== 'reboque' ? { km_saida: kmn(r.km_saida) } : {}), ...(o.atendimento === 'sos' ? { km_sos_inicial: kmn(r.km_sos_inicial), km_sos_final: kmn(r.km_sos_final) } : {}) });
      aviso('Liberação registrada. Agora encerre a OS.'); navegar(); } catch (err) { falha(err); } });

  // encerrar
  $('#mo-enc')?.addEventListener('click', async () => { let c; try { c = await api.rpc('manut_os_checar', { p_os: id }); } catch (err) { return falha(err); }
    if (c.erros.length) return modal(`<div><h2>Ainda falta preencher</h2><ul class="mo-err">${c.erros.map(x => `<li>${esc(x)}</li>`).join('')}</ul><div class="rodape"><button class="btn prim" data-fechar>Entendi</button></div></div>`);
    const r = await modal(`<form><h2>Encerrar ${esc(o.numero)}</h2>${c.avisos.length ? `<p>A checagem encontrou pontos para a analista conferir:</p><ul class="mo-av">${c.avisos.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p>Tudo preenchido, sem inconsistências.</p>'}
      <p class="muted">A OS sai da lista dos mecânicos e vai para a validação da analista.</p><div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Encerrar</button></div></form>`);
    if (!r) return; try { await api.rpc('manut_os_encerrar', { p_os: id }); aviso('OS encerrada e enviada para validação.'); navegar(); } catch (err) { falha(err); } });
  $('#mo-val')?.addEventListener('click', async () => { if (!await confirmar(`Validar a ${o.numero}?${o.inconsistencias?.length ? ' Ela tem avisos da checagem: confira antes.' : ''}`, { botao: 'Validar' })) return;
    try { await api.rpc('manut_os_validar', { p_os: id, p_aprovar: true }); navegar(); } catch (err) { falha(err); } });
  $('#mo-dev')?.addEventListener('click', async () => { const m = await confirmar('Devolver para a manutenção corrigir o apontamento?', { comMotivo: true, botao: 'Devolver' }); if (!m) return;
    try { await api.rpc('manut_os_validar', { p_os: id, p_aprovar: false, p_motivo: m }); navegar(); } catch (err) { falha(err); } });
  $('#mo-prazo')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Repactuar prazo</h2><p class="muted">Previsão atual: ${dataHoraBR(o.previsao_liberacao)}</p><div class="form">
      <label class="campo">Nova previsão *<input type="datetime-local" name="nova" required></label><label class="campo largo">Justificativa *<textarea name="just" rows="2" required placeholder="Ex.: peça chega amanhã às 10h"></textarea></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`, { validar: d => new Date(d.nova) <= new Date() ? 'A nova previsão precisa ser no futuro.' : null });
    if (!r) return; try { await api.rpc('manut_os_repactuar', { p_os: id, p_nova: moISO(r.nova), p_justificativa: r.just }); moAlertaChecar(); navegar(); } catch (err) { falha(err); } });
  $('#mo-canc')?.addEventListener('click', async () => { const m = await confirmar('Cancelar esta OS? Retire antes as peças do estoque lançadas.', { comMotivo: true, botao: 'Cancelar OS' }); if (!m) return;
    try { await api.alterar('manut_os', `id=eq.${id}`, { status: 'cancelada', motivo_cancelamento: m }); navegar(); } catch (err) { falha(err); } });
  $('#mo-pdf').onclick = e => ocupado(e.target, () => moPdf(o, { unis, afet, fal, srv, its, C, U, CO, prz, cl }).catch(falha));
});

// ===================== PDF da OS (papel timbrado) =====================
async function moPdf(o, D) {
  await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
  const E = (await empresasL().catch(() => []))[0] || {}, IMG = await imagensTimbrado(false);
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' }), ML = 18, MR = 192, TOPO = 40, BASE = 268, W = MR - ML;
  const C = { texto: [37, 46, 53], cinza: [107, 115, 120], verde: [0, 104, 74], borda: [215, 219, 222], creme: [246, 239, 220] };
  const feitas = new Set(), moldura = () => { const pg = doc.getCurrentPageInfo().pageNumber; if (!feitas.has(pg)) { feitas.add(pg); molduraTimbrado(doc, E, IMG); } };
  let y = 44; const precisa = h => { if (y + h > BASE) { doc.addPage(); moldura(); y = TOPO + 4; } };
  const T = (txt, sz = 10, cor = C.texto, b = 'bold') => { doc.setFont('helvetica', b); doc.setFontSize(sz); doc.setTextColor(...cor); doc.text(txt, ML, y); };
  const sec = t => { precisa(14); doc.setFillColor(...C.verde); doc.rect(ML, y - 4, 1.6, 6, 'F'); T(t, 11, C.verde); y += 4; };
  const tab = (head, body, extra = {}) => { doc.autoTable({ startY: y, margin: { left: ML, right: 210 - MR, top: TOPO + 4, bottom: 297 - BASE }, theme: 'grid', head: [head], body, willDrawPage: moldura,
    styles: { font: 'helvetica', fontSize: 8, textColor: C.texto, lineColor: C.borda, lineWidth: 0.15, cellPadding: 1.4 }, headStyles: { fillColor: C.verde, textColor: 255, fontStyle: 'bold' }, ...extra }); y = doc.lastAutoTable.finalY + 6; };
  moldura();
  T(`Ordem de serviço ${o.numero || ''}`, 16); y += 6;
  T(`${o.eq?.codigo_frota || ''} · ${D.afet.map(moUni).join(' / ')} · ${MO_TIPOS[o.tipo] || o.tipo}${o.atendimento ? ' · ' + (o.atendimento === 'sos' ? 'SOS' : 'na base') : ''} · ${(ST_OS[o.status] || [o.status])[0]}${o.validacao ? ' · ' + MO_VAL[o.validacao][0] : ''}`, 9, C.cinza, 'normal'); y += 6;
  tab(['Abertura', 'Previsão de liberação', 'Liberação', 'Tempo parado', ...(D.cl !== 'reboque' ? ['Km entrada → saída'] : []), ...(o.atendimento === 'sos' ? ['Km SOS'] : [])],
    [[dataHoraBR(o.aberta_em || o.criado_em), dataHoraBR(o.previsao_liberacao) || '—', dataHoraBR(o.liberado_em) || '—', moDur(o.aberta_em || o.criado_em, o.liberado_em),
      ...(D.cl !== 'reboque' ? [`${o.km_entrada ?? '—'} → ${o.km_saida ?? '—'}`] : []), ...(o.atendimento === 'sos' ? [`${o.km_sos_inicial ?? '—'} → ${o.km_sos_final ?? '—'}`] : [])]], { styles: { fontSize: 8.5, halign: 'center', lineColor: C.borda, lineWidth: 0.15 } });
  sec('Relato e problemas por unidade');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...C.texto); const rl = doc.splitTextToSize(o.problema || '', W); precisa(rl.length * 4 + 4); doc.text(rl, ML, y); y += rl.length * 4 + 2;
  if (D.fal.length) tab(['Unidade', 'Componente', 'Localização', 'Problema'], D.fal.map(f => [moUni(D.U[f.veiculo_id]), D.C[f.componente]?.nome || f.componente, moLoc(f) || '—', f.descricao]));
  const pns = D.fal.filter(f => D.C[f.componente]?.pneu);
  if (pns.length) { sec('Pneus'); tab(['Posição', 'Retirado (fogo · sulco)', 'Aplicado (fogo · sulco)', 'Estado'], pns.map(f => { const p = f.pneu || {};
    return [moUni(D.U[f.veiculo_id]) + ' · ' + moLoc(f), `${p.fogo_ret || 'sem nº: ' + (p.fogo_ret_just || '—')} · ${p.sulco_ret ? p.sulco_ret + ' mm' : 'sem info: ' + (p.sulco_ret_just || '—')}`,
      `${p.fogo_apl || 'sem nº: ' + (p.fogo_apl_just || '—')} · ${p.sulco_apl ? p.sulco_apl + ' mm' : 'sem info: ' + (p.sulco_apl_just || '—')}`, p.estado_apl === 'reformado' ? `Reformado · ${p.recapagem}ª recapagem` : (p.estado_apl || '—')]; })); }
  sec('Serviços executados');
  if (D.srv.length) tab(['Serviço', 'Executado por', 'Início', 'Fim', 'Duração', 'Peças'], D.srv.map(s => [s.descricao, s.executor === 'terceiro' ? 'Terceiro' + (s.mecanico_terceiro ? ': ' + s.mecanico_terceiro : '') : moColab(D.CO[s.mecanico_id]),
    dataHoraBR(s.inicio), dataHoraBR(s.fim) || '—', moDur(s.inicio, s.fim), D.its.filter(i => i.servico_id === s.id).map(i => `${i.descricao} (${Number(i.quantidade).toLocaleString('pt-BR')}) ${brl(i.valor_total)}`).join('\n') || '—']));
  else { T('Nenhum serviço lançado.', 9, C.cinza, 'normal'); y += 6; }
  const tp = D.its.reduce((a, i) => a + Number(i.valor_total || 0), 0);
  if (tp || o.valor_terceiro) { tab(['Peças', ...(o.oficina === 'externa' ? ['Terceiro (' + (o.forn?.razao_social || '') + ')'] : []), 'Total'], [[brl(tp), ...(o.oficina === 'externa' ? [brl(o.valor_terceiro || 0)] : []), brl(tp + Number(o.valor_terceiro || 0))]], { styles: { halign: 'center', fontSize: 9, lineColor: C.borda, lineWidth: 0.15 } }); }
  if (o.tipo === 'inspecao') { sec('Inspeção'); tab(['Empresa', 'Cobrança', 'Valor do retrabalho'], [[o.forn?.razao_social || '—', MO_COBR[o.inspecao_cobranca] || '—', o.valor_retrabalho ? brl(o.valor_retrabalho) : '—']]); }
  if (D.prz.length) { sec('Prazo repactuado'); tab(['Em', 'De', 'Para', 'Justificativa'], D.prz.map(p => [dataHoraBR(p.em), dataHoraBR(p.anterior), dataHoraBR(p.nova), p.justificativa])); }
  sec('Liberação'); precisa(44);
  const ass = (x, rot, cid, img) => { if (img) { try { doc.addImage(img, 'PNG', x, y, 70, 22); } catch (e) { } } doc.setDrawColor(...C.texto); doc.line(x, y + 24, x + 75, y + 24);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...C.texto); doc.text(D.CO[cid]?.nome || '—', x, y + 28);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...C.cinza); doc.text(`${rot}${D.CO[cid]?.matricula ? ' · mat. ' + D.CO[cid].matricula : ''}${D.CO[cid]?.cargo ? ' · ' + D.CO[cid].cargo : ''}`, x, y + 32); };
  ass(ML, 'Responsável pela manutenção', o.liberado_por, o.liberado_assinatura); ass(ML + 95, 'Recebido por', o.recebido_por, o.recebido_assinatura); y += 38;
  if (o.inconsistencias?.length) { sec('Avisos da checagem'); tab(['Aviso'], o.inconsistencias.map(x => [x])); }
  paginarTimbrado(doc, false);
  doc.save(`OS ${o.numero || ''} ${o.eq?.codigo_frota || ''}.pdf`);
}

// ===================== Alerta de OS atrasada (pisca e apita) =====================
let _moAudio = null;
document.addEventListener('click', () => { if (!_moAudio) try { _moAudio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } }, { once: true, capture: true });
function moBip() { try { if (!_moAudio) return; const a = _moAudio; a.resume?.(); [0, 0.35, 0.7].forEach(t => { const o = a.createOscillator(), g = a.createGain(); o.type = 'square'; o.frequency.value = 880;
  g.gain.value = 0.08; o.connect(g); g.connect(a.destination); o.start(a.currentTime + t); o.stop(a.currentTime + t + 0.2); }); } catch (e) { } }
async function moAlertaChecar() {
  if (!estado.usuario || !tem('administrador', 'manutencao')) return;
  let xs = []; try { xs = await api.rpc('manut_os_atrasadas'); } catch (e) { return; }
  let el = document.getElementById('mo-alerta');
  if (!xs?.length) { el?.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'mo-alerta'; document.body.append(el); }
  const h = p => { const m = Math.round((Date.now() - new Date(p)) / 6e4); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h'; };
  el.innerHTML = `⏰ ${xs.length === 1 ? 'OS atrasada' : xs.length + ' OS atrasadas'}: ${xs.map(x => `<a href="#/manut/os/ver/${x.id}">${esc(x.numero)} · ${esc(x.frota || '')} (há ${h(x.previsao)})</a>`).join(' · ')} — libere ou repactue o prazo com justificativa.`;
  moBip();
}
setInterval(moAlertaChecar, 60000); setTimeout(moAlertaChecar, 8000);
