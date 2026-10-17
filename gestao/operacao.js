// Verbo Gestão — Operação / CCO: viagens, jornada do motorista (Lei 13.103), ocorrências e multas
'use strict';

const editaOp = () => tem('administrador', 'operacao');
const ST_VIA = { planejada: ['Planejada', 'azul'], em_transito: ['Em trânsito', 'amarelo'], entregue: ['Entregue', 'verde'], cancelada: ['Cancelada', ''] };
const EV_JOR = { inicio_jornada: ['Início da jornada', '🟢'], direcao: ['Direção', '🚚'], descanso: ['Descanso', '☕'], refeicao: ['Refeição', '🍽️'], espera: ['Espera (carga/descarga)', '⏳'], trabalho: ['Outro trabalho', '🔧'], fim_jornada: ['Fim da jornada', '🔴'] };
const TIPO_OCO = { atraso: 'Atraso', avaria_carga: 'Avaria de carga', falta_carga: 'Falta de carga', quebra_veiculo: 'Quebra do veículo', sinistro: 'Sinistro / colisão', roubo: 'Roubo / furto', reclamacao_cliente: 'Reclamação do cliente', multa: 'Multa de trânsito' };
const ST_OCO = { aberta: ['Aberta', 'amarelo'], em_tratativa: ['Em tratativa', 'azul'], encerrada: ['Encerrada', 'verde'] };
const hh = h => { if (h == null) return '—'; const m = Math.round(Number(h) * 60); return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`; };
const dtLocal = iso => iso ? new Date(new Date(iso) - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : '';
const motoristas = () => api.listar('v_colaboradores_basico', 'select=id,nome,cargo,motorista,cnh_categoria,cnh_validade&order=nome').catch(() => []);
const alertasJornada = j => [j.max_direcao_continua > 5.5 && `direção contínua de ${hh(j.max_direcao_continua)} (máx. 5h30)`, j.horas_trabalho > 10 && `jornada de ${hh(j.horas_trabalho)} (máx. 8h + 2h extras, ou até 4h por convenção)`,
  j.interjornada_horas != null && j.interjornada_horas < 11 && `interjornada de ${hh(j.interjornada_horas)} (mín. 11h)`, j.encerrada && j.horas_refeicao < 1 && j.horas_trabalho > 6 && 'refeição menor que 1h',
  !j.encerrada && (Date.now() - new Date(j.inicio)) > 16 * 36e5 && 'jornada aberta há mais de 16h (esqueceu de encerrar?)'].filter(Boolean);

Object.assign(LEI, {
  jornada: ['Jornada do motorista — Lei 13.103/2015', [
    'Jornada de <b>8 horas</b>, com até <b>2 horas extras</b> (ou até 4 horas, se a convenção coletiva permitir) — CLT art. 235-C.',
    '<b>Direção</b>: no máximo <b>5h30 seguidas</b>; <b>30 minutos de descanso a cada 6 horas</b> de direção, que podem ser fracionados (CTB art. 67-C).',
    '<b>Refeição</b>: 1 hora, que pode coincidir com o descanso da direção. <b>Interjornada</b>: 11 horas a cada 24, podendo fracionar (8 horas seguidas + o restante no mesmo dia).',
    '<b>Tempo de espera</b> (carga, descarga, fiscalização) não conta como jornada nem hora extra, mas é <b>indenizado em 30% do salário-hora</b> (CLT art. 235-C §§8º e 9º).',
    'A empresa deve <b>controlar a jornada de forma fidedigna</b> (registro eletrônico, papeleta ou ficha) — art. 2º, V, da Lei 13.103. Este registro serve como prova.',
    'Descumprir o tempo de direção/descanso é infração do motorista e da empresa (CTB art. 230, XXIII) e risco grave de acidente.']],
  multa: ['Multas de trânsito', [
    'Recebida a notificação de autuação, a empresa tem <b>30 dias para indicar o condutor</b> (CTB art. 257 §7º). Sem indicação, a multa vai para a empresa e, por ser pessoa jurídica, é aplicada <b>multa adicional (NIC)</b> (art. 257 §8º).',
    'Descontar a multa do salário exige <b>culpa do motorista e previsão no contrato</b> (ou dolo) — CLT art. 462 §1º — e a <b>aprovação do jurídico</b>. Multa por falha do veículo (manutenção, documento, excesso de peso por ordem da empresa) é da empresa.',
    'Dê ao motorista a chance de se manifestar e guarde o comprovante da indicação.']],
});

// ===================== Painel do CCO =====================
rota('/operacao', async tela => {
  const [vs, st, js, ocs, pend] = await Promise.all([api.listar('viagens', 'ativo=eq.true&status=in.(planejada,em_transito)&select=*,cl:clientes(nome),eq:equipamentos(codigo_frota),m:colaboradores(nome)&order=saida_prevista.nullslast'),
    api.listar('v_motoristas_status', 'order=nome').catch(() => []), api.listar('v_jornadas', `inicio=gte.${somaDias(hojeISO(), -7)}&order=inicio.desc`).catch(() => []),
    api.listar('ocorrencias_operacionais', 'ativo=eq.true&status=neq.encerrada&select=*,m:colaboradores(nome)&order=data_hora.desc&limit=20').catch(() => []), api.rpc('pendencias_operacao').catch(() => [])]);
  const p = Object.fromEntries(pend.map(x => [x.tipo, Number(x.quantidade)]));
  const transito = vs.filter(v => v.status === 'em_transito'), plan = vs.filter(v => v.status === 'planejada');
  const alertas = js.map(j => ({ j, a: alertasJornada(j) })).filter(x => x.a.length);
  const ativos = st.filter(s => s.estado !== 'fim_jornada');
  tela.innerHTML = `
    <div class="topo"><div><h1>Operação · CCO</h1><p class="sub">Viagens, motoristas e ocorrências em tempo real</p></div>
      <div class="acoes">${editaOp() ? '<a class="btn prim" href="#/operacao/viagens/nova">+ Viagem</a>' : ''}<a class="btn" href="#/operacao/ocorrencias/nova">+ Ocorrência</a><a class="btn" href="#/operacao/jornada">Registrar jornada</a></div></div>
    <div class="grade" style="margin-bottom:14px">
      <a class="cartao kpi" href="#/operacao/viagens?status=em_transito"><div class="n">${transito.length}</div><div class="r">viagens em trânsito${p.viagens_atrasadas ? ` (${p.viagens_atrasadas} atrasada)` : ''}</div></a>
      <a class="cartao kpi" href="#/operacao/viagens?status=planejada"><div class="n">${plan.length}</div><div class="r">viagens programadas</div></a>
      <div class="cartao kpi"><div class="n">${ativos.length}</div><div class="r">motoristas em jornada</div></div>
      <a class="cartao kpi ${alertas.length ? 'alerta' : ''}" href="#/operacao/jornadas"><div class="n">${alertas.length}</div><div class="r">jornadas com alerta (7 dias)</div></a>
      <a class="cartao kpi ${p.multas_indicar ? 'alerta' : ''}" href="#/operacao/ocorrencias?tipo=multa"><div class="n">${p.multas_indicar || 0}</div><div class="r">multas para indicar condutor</div></a>
      <a class="cartao kpi ${p.ocorrencias_abertas ? 'alerta' : ''}" href="#/operacao/ocorrencias"><div class="n">${p.ocorrencias_abertas || 0}</div><div class="r">ocorrências abertas</div></a>
    </div>
    <div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(340px,1fr))">
      <div class="cartao"><h2>Em trânsito</h2>${transito.length ? `<ul class="lista-simples">${transito.map(v => `<li class="clicavel" onclick="location.hash='#/operacao/viagens/ver/${v.id}'"><span><b>${esc(v.numero)}</b> ${esc(v.eq?.codigo_frota || '')} · ${esc(v.m?.nome || '')}
        <div class="muted">${esc(v.origem)} → ${esc(v.destino)} · saiu ${dataHoraBR(v.saida_em)}</div></span>${v.chegada_prevista && new Date(v.chegada_prevista) < new Date() ? '<span class="tag vermelho">Atrasada</span>' : `<span class="muted">${v.chegada_prevista ? 'prev. ' + dataHoraBR(v.chegada_prevista) : ''}</span>`}</li>`).join('')}</ul>` : '<div class="vazio">Nenhuma viagem em trânsito.</div>'}</div>
      <div class="cartao"><h2>Motoristas agora</h2>${ativos.length ? `<ul class="lista-simples">${ativos.map(s => { const h = (Date.now() - new Date(s.desde)) / 36e5;
        return `<li><span><b>${esc(s.nome)}</b> ${EV_JOR[s.estado][1]} ${EV_JOR[s.estado][0]}<div class="muted">desde ${dataHoraBR(s.desde)}${s.viagem ? ' · ' + esc(s.viagem) : ''}</div></span>${s.estado === 'direcao' && h > 5.5 ? `<span class="tag vermelho">${hh(h)} dirigindo</span>` : `<span class="muted">${hh(h)}</span>`}</li>`; }).join('')}</ul>` : '<div class="vazio">Nenhum motorista com jornada aberta.</div>'}</div>
      ${alertas.length ? `<div class="cartao"><h2>Alertas de jornada</h2><ul class="lista-simples">${alertas.slice(0, 15).map(({ j, a }) => `<li><span><b>${esc(j.nome)}</b> · ${dataBR(j.inicio)}<div class="muted">${a.map(esc).join(' · ')}</div></span></li>`).join('')}</ul></div>` : ''}
      ${ocs.length ? `<div class="cartao"><h2>Ocorrências abertas</h2><ul class="lista-simples">${ocs.map(o => `<li class="clicavel" onclick="location.hash='#/operacao/ocorrencias/ver/${o.id}'"><span><b>${esc(o.numero)}</b> ${esc(TIPO_OCO[o.tipo] || o.tipo)}<div class="muted">${esc((o.descricao || '').slice(0, 80))}${o.m ? ' · ' + esc(o.m.nome) : ''}</div></span>${tagSt(ST_OCO, o.status)}</li>`).join('')}</ul></div>` : ''}
    </div>
    ${avisoLei('jornada')}`;
});

// ===================== Viagens =====================
rota('/operacao/viagens', async tela => {
  const sts = pLista('status', 'todas'), st = sts[0], q = (estado.params.get('q') || '').toLowerCase();
  const fV = temTodos(sts) ? '' : filtroOu(sts.map(s => s === 'abertas' ? 'status=in.(planejada,em_transito)' : 'status=eq.' + s));
  let vs = await api.listar('viagens', `ativo=eq.true${fV ? '&' + fV : ''}&select=*,cl:clientes(nome),eq:equipamentos(codigo_frota),m:colaboradores(nome)&order=saida_prevista.desc.nullslast,criado_em.desc&limit=400`);
  if (q) vs = vs.filter(v => [v.numero, v.origem, v.destino, v.cl?.nome, v.m?.nome, v.eq?.codigo_frota, v.documentos].join(' ').toLowerCase().includes(q));
  tela.innerHTML = `
    <div class="topo"><div><h1>Viagens</h1><p class="sub">${vs.length} viagem(ns) · frete ${brl(vs.reduce((a, v) => a + Number(v.valor_frete || 0), 0))}</p></div>${editaOp() ? '<a class="btn prim" href="#/operacao/viagens/nova">+ Nova viagem</a>' : ''}</div>
    <form class="filtros" id="filtros"><select name="status"><option value="abertas">Programadas e em trânsito</option>${Object.entries(ST_VIA).map(([k, [t]]) => `<option value="${k}" ${k === st ? 'selected' : ''}>${t}</option>`).join('')}<option value="todas" ${st === 'todas' ? 'selected' : ''}>Todas</option></select>
      <input name="q" value="${esc(estado.params.get('q') || '')}" placeholder="Nº, cliente, cidade, motorista, CT-e"><button class="btn">Filtrar</button></form>
    <div class="cartao">${vs.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nº</th><th>Cliente</th><th>Rota</th><th>Equipamento</th><th>Motorista</th><th>Saída</th><th>Chegada</th><th class="num">Km</th><th class="num">Frete</th><th>Situação</th></tr></thead><tbody>
      ${vs.map(v => `<tr class="clicavel" onclick="location.hash='#/operacao/viagens/ver/${v.id}'"><td data-r="Nº" class="mono"><b>${esc(v.numero)}</b></td><td data-r="Cliente">${esc(v.cl?.nome || '—')}</td><td data-r="Rota">${esc(v.origem)} → ${esc(v.destino)}</td>
        <td data-r="Equipamento">${esc(v.eq?.codigo_frota || '—')}</td><td data-r="Motorista">${esc(v.m?.nome || '—')}</td><td data-r="Saída">${dataHoraBR(v.saida_em || v.saida_prevista) || '—'}</td><td data-r="Chegada">${dataHoraBR(v.chegada_em || v.chegada_prevista) || '—'}</td>
        <td data-r="Km" class="num">${v.km_chegada && v.km_saida ? (v.km_chegada - v.km_saida).toLocaleString('pt-BR') : '—'}</td><td data-r="Frete" class="num">${v.valor_frete ? brl(v.valor_frete) : '—'}</td>
        <td data-r="Situação">${tagSt(ST_VIA, v.status)}${v.status === 'em_transito' && v.chegada_prevista && new Date(v.chegada_prevista) < new Date() ? ' <span class="tag vermelho">atrasada</span>' : ''}</td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Nenhuma viagem.</div>'}</div>`;
  $('#filtros').onsubmit = e => { e.preventDefault(); const d = formDados(e.target); location.hash = '#/operacao/viagens?' + new URLSearchParams(Object.entries(d).filter(([, v]) => v)); };
});
async function formViagem(tela, v = null) {
  if (!editaOp()) { tela.innerHTML = '<div class="cartao vazio">Sem permissão.</div>'; return; }
  const [cls, eqs, ms, ccs] = await Promise.all([cad('clientes', 'select=id,nome,ativo&order=nome', true).catch(() => []), api.listar('equipamentos', 'select=id,codigo_frota,tipo,tipo_outro,marca,modelo,situacao&ativo=eq.true&order=codigo_frota'), motoristas(), centros()]);
  const mot = ms.filter(m => m.motorista || m.id === v?.motorista_id);
  tela.innerHTML = `<div class="topo"><div><h1>${v ? 'Editar ' + esc(v.numero) : 'Nova viagem'}</h1><p class="sub">Programe a viagem; a saída e a chegada são registradas pelo CCO ou pelo motorista</p></div></div>
    <form id="f-via" class="cartao"><div class="form">
      <label class="campo largo">Cliente<select name="cliente_id"><option value="">—</option>${cls.filter(c => c.ativo).map(c => `<option value="${c.id}" ${c.id === v?.cliente_id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></label>
      <label class="campo">Origem *<input name="origem" required value="${esc(v?.origem || '')}"></label><label class="campo">Destino *<input name="destino" required value="${esc(v?.destino || '')}"></label>
      <label class="campo">Saída prevista<input type="datetime-local" name="saida_prevista" value="${dtLocal(v?.saida_prevista)}"></label><label class="campo">Chegada prevista<input type="datetime-local" name="chegada_prevista" value="${dtLocal(v?.chegada_prevista)}"></label>
      <label class="campo">Equipamento<select name="equipamento_id"><option value="">A definir</option>${eqs.map(e => `<option value="${e.id}" ${e.id === v?.equipamento_id ? 'selected' : ''} ${e.situacao === 'manutencao' ? 'disabled' : ''}>${esc(rotuloEq(e))}${e.situacao === 'manutencao' ? ' (em manutenção)' : ''}</option>`).join('')}</select></label>
      <label class="campo">Motorista<select name="motorista_id"><option value="">A definir</option>${mot.map(m => { const venc = m.cnh_validade && m.cnh_validade < hojeISO();
        return `<option value="${m.id}" ${m.id === v?.motorista_id ? 'selected' : ''} ${venc ? 'disabled' : ''}>${esc(m.nome)}${m.cnh_categoria ? ' · CNH ' + esc(m.cnh_categoria) : ''}${venc ? ' (CNH vencida)' : ''}</option>`; }).join('')}</select></label>
      <label class="campo largo">Carga<input name="carga" value="${esc(v?.carga || '')}" placeholder="Ex.: eucalipto em toras, celulose"></label>
      <label class="campo">Peso (t)<input name="peso_t" inputmode="decimal" value="${v?.peso_t ?? ''}"></label><label class="campo">Valor do frete (R$)<input name="valor_frete" inputmode="decimal" value="${v?.valor_frete ?? ''}"></label>
      <label class="campo">Documentos (CT-e, MDF-e, NF)<input name="documentos" value="${esc(v?.documentos || '')}"></label>
      <label class="campo">Centro de custo<select name="centro_custo_id">${opcoes(ccs.filter(c => c.ativo), null, c => c.nome, v?.centro_custo_id, '—')}</select></label>
      <label class="campo largo">Observações<textarea name="observacao" rows="2">${esc(v?.observacao || '')}</textarea></label></div>
      <p class="muted">Equipamentos em manutenção e motoristas com CNH vencida não aparecem para escolha. Ao iniciar a viagem, o sistema também confere o ASO do motorista.</p>
      <div class="acoes"><button class="btn prim">Salvar</button><a class="btn" href="javascript:history.back()">Cancelar</a></div></form>`;
  $('#f-via').onsubmit = async e => { e.preventDefault(); const d = formDados(e.target);
    const dados = { cliente_id: d.cliente_id || null, origem: d.origem, destino: d.destino, saida_prevista: d.saida_prevista ? new Date(d.saida_prevista).toISOString() : null, chegada_prevista: d.chegada_prevista ? new Date(d.chegada_prevista).toISOString() : null,
      equipamento_id: d.equipamento_id || null, motorista_id: d.motorista_id || null, carga: d.carga || null, peso_t: num(d.peso_t), valor_frete: num(d.valor_frete), documentos: d.documentos || null, centro_custo_id: d.centro_custo_id || null, observacao: d.observacao || null };
    await ocupado(e.submitter, async () => { try { let id = v?.id; if (v) await api.alterar('viagens', `id=eq.${id}`, dados); else [{ id }] = await api.inserir('viagens', dados);
      aviso('Viagem salva.'); location.hash = '#/operacao/viagens/ver/' + id; } catch (err) { falha(err); } }); };
}
rota('/operacao/viagens/nova', tela => formViagem(tela));
rota('/operacao/viagens/editar/:id', async (tela, id) => formViagem(tela, await api.um('viagens', `id=eq.${id}`)));
rota('/operacao/viagens/ver/:id', async (tela, id) => {
  const v = await api.um('viagens', `id=eq.${id}&select=*,cl:clientes(nome),eq:equipamentos(id,codigo_frota,tipo,tipo_outro,marca,modelo,km_atual),m:colaboradores(id,nome),cc:centros_custo(nome)`);
  if (!v) { tela.innerHTML = '<div class="cartao vazio">Viagem não encontrada.</div>'; return; }
  const [ocs, evs] = await Promise.all([api.listar('ocorrencias_operacionais', `viagem_id=eq.${id}&ativo=eq.true&order=data_hora`).catch(() => []), api.listar('jornada_eventos', `viagem_id=eq.${id}&ativo=eq.true&order=data_hora`).catch(() => [])]);
  const ed = editaOp(), souMot = v.motorista_id && v.motorista_id === await api.rpc('meu_colaborador').catch(() => null);
  tela.innerHTML = `
    <div class="topo"><div><h1>${esc(v.numero)} · ${esc(v.origem)} → ${esc(v.destino)}</h1><p class="sub">${tagSt(ST_VIA, v.status)} · ${esc(v.cl?.nome || 'sem cliente')}</p></div>
      <div class="acoes">${(ed || souMot) && v.status === 'planejada' ? '<button class="btn prim" id="via-sair">Iniciar viagem</button>' : ''}${(ed || souMot) && v.status === 'em_transito' ? '<button class="btn prim" id="chegar">Registrar entrega</button>' : ''}
        ${ed && ['planejada', 'em_transito'].includes(v.status) ? `<a class="btn" href="#/operacao/viagens/editar/${id}">Editar</a><button class="btn perigo" id="cancelar">Cancelar</button>` : ''}
        <button class="btn" id="ordem">Ordem de viagem</button><a class="btn" href="#/operacao/ocorrencias/nova?viagem=${id}">+ Ocorrência</a><a class="btn" href="#/operacao/viagens">Voltar</a></div></div>
    <div class="cartao"><div class="form">${[['Equipamento', v.eq && rotuloEq(v.eq)], ['Motorista', v.m?.nome], ['Saída prevista', dataHoraBR(v.saida_prevista)], ['Chegada prevista', dataHoraBR(v.chegada_prevista)],
      ['Saiu em', dataHoraBR(v.saida_em)], ['Chegou em', dataHoraBR(v.chegada_em)], ['Km', [v.km_saida != null && 'saída ' + v.km_saida.toLocaleString('pt-BR'), v.km_chegada != null && 'chegada ' + v.km_chegada.toLocaleString('pt-BR'), v.km_chegada && v.km_saida && '= ' + (v.km_chegada - v.km_saida).toLocaleString('pt-BR') + ' km'].filter(Boolean).join(' · ')],
      ['Carga', [v.carga, v.peso_t && v.peso_t + ' t'].filter(Boolean).join(' · ')], ['Documentos', v.documentos], ['Frete', v.valor_frete && brl(v.valor_frete)], ['Centro de custo', v.cc?.nome], ['Observações', v.observacao], ['Cancelamento', v.motivo_cancelamento]]
      .filter(([, x]) => x !== null && x !== undefined).map(([k, x]) => `<div><div class="muted">${k}</div><b>${x ? esc(x) : '—'}</b></div>`).join('')}<div class="largo" id="anx-via"></div></div></div>
    <div class="cartao"><h2>Ocorrências</h2>${ocs.length ? `<ul class="lista-simples">${ocs.map(o => `<li class="clicavel" onclick="location.hash='#/operacao/ocorrencias/ver/${o.id}'"><span><b>${esc(o.numero)}</b> ${esc(TIPO_OCO[o.tipo] || o.tipo)} · ${dataHoraBR(o.data_hora)}<div class="muted">${esc(o.descricao)}</div></span>${tagSt(ST_OCO, o.status)}</li>`).join('')}</ul>` : '<div class="vazio">Nenhuma ocorrência.</div>'}</div>
    <div class="cartao"><h2>Jornada registrada na viagem</h2>${evs.length ? `<ul class="lista-simples">${evs.map(e => `<li><span>${EV_JOR[e.tipo][1]} ${EV_JOR[e.tipo][0]}${e.local ? ' · ' + esc(e.local) : ''}</span><span class="muted">${dataHoraBR(e.data_hora)}</span></li>`).join('')}</ul>` : '<div class="vazio">O motorista ainda não registrou eventos vinculados a esta viagem.</div>'}</div>`;
  $('#anx-via').innerHTML = await htmlAnexos('viagem', id);
  $("#via-sair")?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Iniciar ${esc(v.numero)}</h2><div class="form"><label class="campo">Km de saída<input name="km" inputmode="numeric" value="${v.eq?.km_atual ?? ''}"></label><label class="campo">Saída<input type="datetime-local" name="quando" value="${dtLocal(new Date().toISOString())}"></label></div>
      <p class="muted">O sistema confere: equipamento sem OS que o pare, ASO do motorista e CNH válida. Lembre o motorista de fazer o checklist pré-uso.</p>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Iniciar</button></div></form>`);
    if (!r) return;
    try { await api.alterar('viagens', `id=eq.${id}`, { status: 'em_transito', km_saida: r.km ? Number(soDigitos(r.km)) : null, saida_em: r.quando ? new Date(r.quando).toISOString() : null }); aviso('Viagem iniciada.'); navegar(); } catch (err) { falha(err); } });
  $('#chegar')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Entrega de ${esc(v.numero)}</h2><div class="form"><label class="campo">Km de chegada<input name="km" inputmode="numeric"></label><label class="campo">Chegada<input type="datetime-local" name="quando" value="${dtLocal(new Date().toISOString())}"></label>
      <label class="campo largo">Canhoto / comprovante de entrega<input type="file" name="arquivos" multiple accept="image/*,application/pdf"></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Registrar entrega</button></div></form>`);
    if (!r) return;
    try { await api.alterar('viagens', `id=eq.${id}`, { status: 'entregue', km_chegada: r.km ? Number(soDigitos(r.km)) : null, chegada_em: r.quando ? new Date(r.quando).toISOString() : null });
      if (r.arquivos?.length) await anexar('viagem', id, r.arquivos); aviso('Entrega registrada.'); navegar(); } catch (err) { falha(err); } });
  $('#cancelar')?.addEventListener('click', async () => { const m = await confirmar('Cancelar esta viagem?', { comMotivo: true, botao: 'Cancelar viagem' }); if (!m) return;
    try { await api.alterar('viagens', `id=eq.${id}`, { status: 'cancelada', motivo_cancelamento: m }); navegar(); } catch (err) { falha(err); } });
  $('#ordem').onclick = async () => { const m = await modeloPorCodigo('OPE-VIA-001'); if (!m) return aviso('Modelo não encontrado.', true);
    await gerarDocumento(m, v.motorista_id, { viagem: { numero: v.numero, equipamento: v.eq ? rotuloEq(v.eq) : '', cliente: v.cl?.nome || '', origem: v.origem, destino: v.destino, saida: dataHoraBR(v.saida_prevista), chegada: dataHoraBR(v.chegada_prevista),
      carga: v.carga || '', peso: v.peso_t ? v.peso_t + ' t' : '', documentos: v.documentos || '', observacao: v.observacao || '' } }); };
});

// ===================== Jornada: registro =====================
rota('/operacao/jornada', async tela => {
  const meu = await api.rpc('meu_colaborador').catch(() => null);
  const cco = editaOp(), alvo = estado.params.get('colab') || (cco ? '' : meu) || '';
  const ms = cco ? (await motoristas()).filter(m => m.motorista) : [];
  if (!alvo && !cco) { tela.innerHTML = '<div class="cartao vazio">Seu usuário não está ligado a um cadastro de colaborador. Fale com o RH.</div>'; return; }
  const [evs, js, via] = alvo ? await Promise.all([api.listar('jornada_eventos', `colaborador_id=eq.${alvo}&ativo=eq.true&data_hora=gte.${somaDias(hojeISO(), -2)}&order=data_hora.desc`),
    api.listar('v_jornadas', `colaborador_id=eq.${alvo}&order=inicio.desc&limit=1`).catch(() => []), api.listar('viagens', `motorista_id=eq.${alvo}&status=eq.em_transito&ativo=eq.true&limit=1`).catch(() => [])]) : [[], [], []];
  const atual = evs[0]?.tipo, aberta = atual && atual !== 'fim_jornada', j = js[0];
  const desde = evs[0] ? (Date.now() - new Date(evs[0].data_hora)) / 36e5 : 0;
  const prox = !aberta ? ['inicio_jornada'] : ['direcao', 'descanso', 'refeicao', 'espera', 'trabalho', 'fim_jornada'].filter(t => t !== atual);
  const al = j && aberta ? alertasJornada(j) : [];
  tela.innerHTML = `
    <div class="topo"><div><h1>Jornada</h1><p class="sub">${cco ? 'Registro pelo CCO ou pelo motorista' : 'Registre cada mudança: é o seu controle de jornada'}</p></div></div>
    ${cco ? `<form class="filtros" id="f-alvo"><select name="colab"><option value="">Escolha o motorista…</option>${ms.map(m => `<option value="${m.id}" ${m.id === alvo ? 'selected' : ''}>${esc(m.nome)}</option>`).join('')}</select><button class="btn">Abrir</button></form>` : ''}
    ${alvo ? `<div class="cartao" style="text-align:center">
      <div style="font-size:42px">${aberta ? EV_JOR[atual][1] : '🛌'}</div>
      <h2 style="margin:4px 0">${aberta ? EV_JOR[atual][0] : 'Fora de jornada'}</h2>
      <p class="muted">${evs[0] ? 'desde ' + dataHoraBR(evs[0].data_hora) + ' · ' + hh(desde) : 'nenhum registro recente'}${via[0] ? ' · viagem ' + esc(via[0].numero) : ''}</p>
      ${atual === 'direcao' && desde >= 5 ? `<p class="alerta-obs">⚠️ ${desde >= 5.5 ? 'Você passou de 5h30 de direção contínua. <b>Pare para descansar agora.</b>' : 'Faltam ' + hh(5.5 - desde) + ' para o limite de 5h30 de direção contínua. Programe a parada.'}</p>` : ''}
      ${al.length ? `<p class="alerta-obs">${al.map(esc).join('<br>')}</p>` : ''}
      ${j && aberta ? `<p class="muted">Hoje: trabalho ${hh(j.horas_trabalho)} · direção ${hh(j.horas_direcao)} · refeição ${hh(j.horas_refeicao)} · descanso ${hh(j.horas_descanso)} · espera ${hh(j.horas_espera)}</p>` : ''}
      <div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:10px">${prox.map(t => `<button class="btn ${t === 'inicio_jornada' || t === 'direcao' ? 'prim' : t === 'fim_jornada' ? 'perigo' : ''}" data-ev="${t}" style="padding:14px">${EV_JOR[t][1]} ${EV_JOR[t][0]}</button>`).join('')}</div>
      ${cco ? '<p class="muted" style="margin-top:8px">Registro pelo CCO: você pode informar o horário (ajuste exige justificativa).</p>' : ''}</div>
    <div class="cartao"><h2>Últimos registros</h2>${evs.length ? `<ul class="lista-simples">${evs.map(e => `<li><span>${EV_JOR[e.tipo][1]} ${EV_JOR[e.tipo][0]}${e.local ? ' · ' + esc(e.local) : ''}${e.origem !== 'app' ? ` <span class="tag">${e.origem}</span>` : ''}${e.observacao ? `<div class="muted">${esc(e.observacao)}</div>` : ''}</span><span class="muted">${dataHoraBR(e.data_hora)}</span></li>`).join('')}</ul>` : '<div class="vazio">Sem registros nos últimos 2 dias.</div>'}</div>` : ''}
    ${avisoLei('jornada')}`;
  $('#f-alvo')?.addEventListener('submit', e => { e.preventDefault(); location.hash = '#/operacao/jornada?colab=' + formDados(e.target).colab; });
  $$('[data-ev]', tela).forEach(b => b.onclick = async () => {
    const t = b.dataset.ev; let dados = { colaborador_id: alvo, tipo: t, viagem_id: via[0]?.id || null, origem: cco && alvo !== meu ? 'cco' : 'app' };
    if (cco && alvo !== meu) {
      const padrao = dtLocal(new Date().toISOString());
      const r = await modal(`<form><h2>${EV_JOR[t][0]}</h2><div class="form"><label class="campo">Horário<input type="datetime-local" name="quando" value="${padrao}"></label><label class="campo">Local<input name="local"></label>
        <label class="campo largo">Justificativa (obrigatória se o horário for anterior a agora)<input name="obs"></label></div>
        <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Registrar</button></div></form>`);
      if (!r) return; const quando = r.quando === padrao ? new Date() : new Date(r.quando); const ajuste = Date.now() - quando > 10 * 6e4;
      dados = { ...dados, data_hora: quando.toISOString(), local: r.local || null, observacao: r.obs || null, origem: ajuste ? 'ajuste' : 'cco' };
    } else if (t === 'fim_jornada' && !await confirmar('Encerrar a jornada?', { botao: 'Encerrar' })) return;
    if (!dados.local && navigator.geolocation && !cco) await new Promise(res => navigator.geolocation.getCurrentPosition(p => { dados.latitude = +p.coords.latitude.toFixed(6); dados.longitude = +p.coords.longitude.toFixed(6); res(); }, res, { timeout: 4000 }));
    try { await api.inserir('jornada_eventos', dados); aviso(EV_JOR[t][0] + ' registrado.'); navegar(); } catch (err) { falha(err); } });
});

// ===================== Jornadas: relatório =====================
rota('/operacao/jornadas', async tela => {
  const ini = estado.params.get('ini') || somaDias(hojeISO(), -30), fim = estado.params.get('fim') || hojeISO(), colabs = pLista('colab'), colab = colabs[0] || '', soAl = estado.params.get('alertas') === '1';
  const [js, ms] = await Promise.all([api.listar('v_jornadas', `inicio=gte.${ini}&inicio=lte.${fim}T23:59:59${colabs.length ? '&colaborador_id=in.(' + colabs.join(',') + ')' : ''}&order=nome,inicio`), motoristas()]);
  const ls = js.map(j => ({ ...j, al: alertasJornada(j) })).filter(j => !soAl || j.al.length);
  const tot = k => ls.reduce((a, j) => a + Number(j[k] || 0), 0);
  tela.innerHTML = `<div class="topo"><div><h1>Controle de jornada</h1><p class="sub">${ls.length} jornada(s) · ${ls.filter(j => j.al.length).length} com alerta</p></div></div>
    <form class="filtros" id="filtros"><input type="date" name="ini" value="${ini}"><input type="date" name="fim" value="${fim}"><select name="colab"><option value="">Todos os motoristas</option>${ms.filter(m => m.motorista).map(m => `<option value="${m.id}" ${m.id === colab ? 'selected' : ''}>${esc(m.nome)}</option>`).join('')}</select>
      <label class="check"><input type="checkbox" name="alertas" ${soAl ? 'checked' : ''}> Só com alerta</label><button class="btn">Filtrar</button></form>
    <div class="cartao">${ls.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Motorista</th><th>Início</th><th>Fim</th><th class="num">Trabalho</th><th class="num">Direção</th><th class="num">Maior direção contínua</th><th class="num">Refeição</th><th class="num">Descanso</th><th class="num">Espera</th><th class="num">Interjornada</th><th>Alertas</th></tr></thead><tbody>
      ${ls.map(j => `<tr><td data-r="Motorista"><b>${esc(j.nome)}</b></td><td data-r="Início">${dataHoraBR(j.inicio)}</td><td data-r="Fim">${j.encerrada ? dataHoraBR(j.fim) : '<span class="tag amarelo">aberta</span>'}</td>
        <td data-r="Trabalho" class="num">${hh(j.horas_trabalho)}</td><td data-r="Direção" class="num">${hh(j.horas_direcao)}</td><td data-r="Direção contínua" class="num">${j.max_direcao_continua > 5.5 ? `<span class="tag vermelho">${hh(j.max_direcao_continua)}</span>` : hh(j.max_direcao_continua)}</td>
        <td data-r="Refeição" class="num">${hh(j.horas_refeicao)}</td><td data-r="Descanso" class="num">${hh(j.horas_descanso)}</td><td data-r="Espera" class="num">${hh(j.horas_espera)}</td>
        <td data-r="Interjornada" class="num">${j.interjornada_horas == null ? '—' : j.interjornada_horas < 11 ? `<span class="tag vermelho">${hh(j.interjornada_horas)}</span>` : hh(j.interjornada_horas)}</td>
        <td data-r="Alertas">${j.al.length ? j.al.map(a => `<div class="muted" style="color:#b42318">${esc(a)}</div>`).join('') : '<span class="tag verde">ok</span>'}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="3">Totais</td><td class="num">${hh(tot('horas_trabalho'))}</td><td class="num">${hh(tot('horas_direcao'))}</td><td></td><td class="num">${hh(tot('horas_refeicao'))}</td><td class="num">${hh(tot('horas_descanso'))}</td><td class="num">${hh(tot('horas_espera'))}</td><td></td><td></td></tr></tfoot></table></div>` : '<div class="vazio">Nenhuma jornada no período.</div>'}
      <p class="muted">Horas de espera são indenizadas em 30% do salário-hora (não são hora extra). O cálculo em folha será feito pelo DP.</p></div>
    ${avisoLei('jornada')}`;
  $('#filtros').onsubmit = e => { e.preventDefault(); const d = formDados(e.target); location.hash = '#/operacao/jornadas?' + new URLSearchParams(Object.entries({ ...d, alertas: d.alertas ? '1' : '' }).filter(([, v]) => v)); };
});

// ===================== Ocorrências e multas =====================
rota('/operacao/ocorrencias', async tela => {
  const tipos = pLista('tipo'), tipo = tipos[0] || '', sts = pLista('status', 'todas'), st = temTodos(sts) ? 'todas' : 'abertas';
  const os = await api.listar('ocorrencias_operacionais', `ativo=eq.true${tipos.length ? '&tipo=in.(' + tipos.join(',') + ')' : ''}${st === 'abertas' ? '&status=neq.encerrada' : ''}&select=*,m:colaboradores(nome),v:viagens(numero),eq:equipamentos(codigo_frota)&order=data_hora.desc&limit=300`);
  tela.innerHTML = `<div class="topo"><div><h1>Ocorrências e multas</h1><p class="sub">${os.length} registro(s) · ${brl(os.reduce((a, o) => a + Number(o.custo || o.valor_multa || 0), 0))}</p></div><a class="btn prim" href="#/operacao/ocorrencias/nova">+ Ocorrência</a></div>
    <form class="filtros" id="filtros"><select name="tipo"><option value="">Todos os tipos</option>${Object.entries(TIPO_OCO).map(([k, t]) => `<option value="${k}" ${k === tipo ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <select name="status"><option value="abertas">Em aberto</option><option value="todas" ${st === 'todas' ? 'selected' : ''}>Todas</option></select><button class="btn">Filtrar</button></form>
    <div class="cartao">${os.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nº</th><th>Data</th><th>Tipo</th><th>Descrição</th><th>Motorista</th><th>Viagem / equip.</th><th class="num">Valor</th><th>Situação</th></tr></thead><tbody>
      ${os.map(o => `<tr class="clicavel" onclick="location.hash='#/operacao/ocorrencias/ver/${o.id}'"><td data-r="Nº" class="mono"><b>${esc(o.numero)}</b></td><td data-r="Data">${dataHoraBR(o.data_hora)}</td><td data-r="Tipo">${esc(TIPO_OCO[o.tipo] || o.tipo)}</td>
        <td data-r="Descrição">${esc((o.descricao || '').slice(0, 80))}${o.tipo === 'multa' && !o.condutor_indicado && o.prazo_indicacao ? ` <span class="tag ${o.prazo_indicacao < hojeISO() ? 'vermelho' : 'amarelo'}">indicar até ${dataBR(o.prazo_indicacao)}</span>` : ''}${o.responsabilizacao === 'em_analise' ? ' <span class="tag amarelo">apuração</span>' : ''}</td>
        <td data-r="Motorista">${esc(o.m?.nome || '—')}</td><td data-r="Viagem">${esc([o.v?.numero, o.eq?.codigo_frota].filter(Boolean).join(' · ') || '—')}</td><td data-r="Valor" class="num">${o.valor_multa ? brl(o.valor_multa) : o.custo ? brl(o.custo) : '—'}</td><td data-r="Situação">${tagSt(ST_OCO, o.status)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Nenhuma ocorrência.</div>'}</div>`;
  $('#filtros').onsubmit = e => { e.preventDefault(); const d = formDados(e.target); location.hash = '#/operacao/ocorrencias?' + new URLSearchParams(Object.entries(d).filter(([, v]) => v)); };
});
rota('/operacao/ocorrencias/nova', async tela => {
  const vid = estado.params.get('viagem') || '';
  const [vs, eqs, ms, cls] = await Promise.all([api.listar('viagens', 'ativo=eq.true&select=id,numero,origem,destino,equipamento_id,motorista_id,cliente_id&order=criado_em.desc&limit=100').catch(() => []),
    api.listar('equipamentos', 'select=id,codigo_frota,tipo,tipo_outro,marca,modelo&ativo=eq.true&order=codigo_frota').catch(() => []), motoristas(), cad('clientes', 'select=id,nome,ativo&order=nome').catch(() => [])]);
  const v0 = vs.find(v => v.id === vid);
  tela.innerHTML = `<div class="topo"><div><h1>Nova ocorrência</h1><p class="sub">Atrasos, avarias, quebras, sinistros, reclamações e multas</p></div></div>
    <form id="f-oco" class="cartao"><div class="form">
      <label class="campo">Tipo *<select name="tipo" data-valor="">${Object.entries(TIPO_OCO).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}<option value="Outro">Outro</option></select></label>
      <label class="campo">Data e hora<input type="datetime-local" name="quando" value="${dtLocal(new Date().toISOString())}"></label>
      <label class="campo">Viagem<select name="viagem_id"><option value="">—</option>${vs.map(v => `<option value="${v.id}" ${v.id === vid ? 'selected' : ''}>${esc(v.numero + ' · ' + v.origem + ' → ' + v.destino)}</option>`).join('')}</select></label>
      <label class="campo">Equipamento<select name="equipamento_id"><option value="">—</option>${eqs.map(e => `<option value="${e.id}" ${e.id === v0?.equipamento_id ? 'selected' : ''}>${esc(rotuloEq(e))}</option>`).join('')}</select></label>
      <label class="campo">Motorista / colaborador<select name="colaborador_id"><option value="">—</option>${ms.map(m => `<option value="${m.id}" ${m.id === v0?.motorista_id ? 'selected' : ''}>${esc(m.nome)}</option>`).join('')}</select></label>
      <label class="campo">Cliente<select name="cliente_id"><option value="">—</option>${cls.filter(c => c.ativo).map(c => `<option value="${c.id}" ${c.id === v0?.cliente_id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></label>
      <label class="campo largo">Local<input name="local"></label>
      <label class="campo largo">Descrição *<textarea name="descricao" rows="3" required></textarea></label>
      <label class="campo" id="b-custo">Custo / prejuízo (R$)<input name="custo" inputmode="decimal"></label>
      <div class="largo form" id="b-multa" style="padding:0" hidden>
        <label class="campo">Auto de infração<input name="auto_infracao"></label><label class="campo">Órgão autuador<input name="orgao_autuador" placeholder="PRF, Detran-MS, DER…"></label>
        <label class="campo">Enquadramento (CTB)<input name="enquadramento" placeholder="Ex.: art. 218, I"></label><label class="campo">Pontos<input type="number" name="pontos"></label>
        <label class="campo">Valor da multa (R$)<input name="valor_multa" inputmode="decimal"></label><label class="campo">Notificação recebida em<input type="date" name="notificacao"></label>
        <label class="campo">Vencimento do boleto<input type="date" name="vencimento_multa"></label>
        <div class="largo">${avisoLei('multa')}</div></div>
      <label class="campo largo">Fotos, notificação, BO<input type="file" name="arquivos" multiple accept="image/*,application/pdf"></label></div>
      <div class="acoes"><button class="btn prim">Registrar</button><a class="btn" href="javascript:history.back()">Cancelar</a></div></form>`;
  const f = $('#f-oco'); const s = () => { $('#b-multa').hidden = f.tipo.value !== 'multa'; $('#b-custo').hidden = f.tipo.value === 'multa'; }; f.tipo.addEventListener('change', s); s();
  f.viagem_id.onchange = () => { const v = vs.find(x => x.id === f.viagem_id.value); if (!v) return; if (v.equipamento_id) f.equipamento_id.value = v.equipamento_id; if (v.motorista_id) f.colaborador_id.value = v.motorista_id; if (v.cliente_id) f.cliente_id.value = v.cliente_id; };
  f.onsubmit = async e => { e.preventDefault(); const d = formDados(f); const multa = d.tipo === 'multa';
    await ocupado(e.submitter, async () => { try {
      const [o] = await api.inserir('ocorrencias_operacionais', { tipo: d.tipo, data_hora: d.quando ? new Date(d.quando).toISOString() : undefined, viagem_id: d.viagem_id || null, equipamento_id: d.equipamento_id || null,
        colaborador_id: d.colaborador_id || null, cliente_id: d.cliente_id || null, local: d.local || null, descricao: d.descricao, custo: multa ? null : num(d.custo),
        ...(multa ? { auto_infracao: d.auto_infracao || null, orgao_autuador: d.orgao_autuador || null, enquadramento: d.enquadramento || null, pontos: d.pontos ? Number(d.pontos) : null, valor_multa: num(d.valor_multa),
          notificacao_recebida_em: d.notificacao || null, vencimento_multa: d.vencimento_multa || null } : {}) });
      if (d.arquivos?.length) await anexar('ocorrencia_operacional', o.id, d.arquivos);
      aviso(`Ocorrência ${o.numero} registrada.${o.prazo_indicacao ? ' Indicar condutor até ' + dataBR(o.prazo_indicacao) + '.' : ''}`); location.hash = editaOp() ? '#/operacao/ocorrencias/ver/' + o.id : '#/inicio';
    } catch (err) { falha(err); } }); };
});
rota('/operacao/ocorrencias/ver/:id', async (tela, id) => {
  const o = await api.um('ocorrencias_operacionais', `id=eq.${id}&select=*,m:colaboradores(nome),v:viagens(id,numero),eq:equipamentos(codigo_frota),cl:clientes(nome)`);
  if (!o) { tela.innerHTML = '<div class="cartao vazio">Ocorrência não encontrada.</div>'; return; }
  const ed = editaOp(), multa = o.tipo === 'multa';
  tela.innerHTML = `<div class="topo"><div><h1>${esc(o.numero)} · ${esc(TIPO_OCO[o.tipo] || o.tipo)}</h1><p class="sub">${dataHoraBR(o.data_hora)} · ${tagSt(ST_OCO, o.status)}</p></div>
      <div class="acoes">${ed && o.status !== 'encerrada' ? `${multa && !o.condutor_indicado ? '<button class="btn prim" id="indicar">Condutor indicado</button>' : ''}<button class="btn" id="tratar">Tratativa / encerrar</button>` : ''}<a class="btn" href="#/operacao/ocorrencias">Voltar</a></div></div>
    ${multa && !o.condutor_indicado && o.prazo_indicacao ? `<div class="cartao alerta-obs">⏰ Indicar o condutor até <b>${dataBR(o.prazo_indicacao)}</b>${o.prazo_indicacao < hojeISO() ? ' — <b>prazo vencido</b>: a empresa pode receber a multa adicional (NIC)' : ''}.</div>` : ''}
    <div class="cartao"><div class="form"><div class="largo"><div class="muted">Descrição</div><div style="white-space:pre-line"><b>${esc(o.descricao)}</b></div></div>
      ${[['Motorista', o.m?.nome], ['Viagem', o.v?.numero], ['Equipamento', o.eq?.codigo_frota], ['Cliente', o.cl?.nome], ['Local', o.local], ['Custo', o.custo && brl(o.custo)],
        ...(multa ? [['Auto de infração', o.auto_infracao], ['Órgão', o.orgao_autuador], ['Enquadramento', o.enquadramento], ['Pontos', o.pontos], ['Valor', o.valor_multa && brl(o.valor_multa)], ['Notificação', dataBR(o.notificacao_recebida_em)],
          ['Vencimento', dataBR(o.vencimento_multa)], ['Condutor indicado', o.condutor_indicado ? 'Sim' : 'Não']] : []), ['Solução', o.solucao]]
        .map(([k, v]) => `<div><div class="muted">${k}</div><b>${v ? esc(String(v)) : '—'}</b></div>`).join('')}<div class="largo" id="anx-oco"></div></div></div>
    ${o.responsabilizacao ? `<div class="cartao ${o.responsabilizacao === 'em_analise' ? 'alerta-obs' : ''}"><h2>Apuração de responsabilidade</h2>
      <p>${esc(o.m?.nome || '')} · ${tagSt(RESP_PAT, o.responsabilizacao)} · ${esc(CULPA[o.culpa] || '')}${o.valor_prejuizo ? ' · ' + brl(o.valor_prejuizo) : ''}</p>${o.fundamentacao ? `<p style="white-space:pre-line">${esc(o.fundamentacao)}</p>` : ''}
      ${avisoLei(multa ? 'multa' : 'desconto_dano')}${ed || tem('rh', 'dp') ? '<button class="btn" id="decidir">Registrar decisão</button>' : ''}</div>` : ''}`;
  $('#anx-oco').innerHTML = await htmlAnexos('ocorrencia_operacional', id);
  $('#indicar')?.addEventListener('click', async () => { if (!await confirmar('Confirmar que o condutor foi indicado ao órgão autuador? Anexe o comprovante.', { botao: 'Confirmar' })) return;
    try { await api.alterar('ocorrencias_operacionais', `id=eq.${id}`, { condutor_indicado: true, status: o.status === 'aberta' ? 'em_tratativa' : o.status }); navegar(); } catch (err) { falha(err); } });
  $('#tratar')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Tratativa · ${esc(o.numero)}</h2><div class="form"><label class="campo">Situação<select name="status">${Object.entries(ST_OCO).map(([k, [t]]) => `<option value="${k}" ${k === o.status ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo">Custo final (R$)<input name="custo" inputmode="decimal" value="${o.custo ?? ''}"></label><label class="campo largo">Como foi resolvido<textarea name="solucao" rows="3">${esc(o.solucao || '')}</textarea></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`, { validar: d => d.status === 'encerrada' && !d.solucao ? 'Descreva a solução para encerrar.' : null });
    if (!r) return;
    try { await api.alterar('ocorrencias_operacionais', `id=eq.${id}`, { status: r.status, custo: num(r.custo), solucao: r.solucao || null }); navegar(); } catch (err) { falha(err); } });
  $('#decidir')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Responsabilização · ${esc(o.numero)}</h2><div class="form">
      <label class="campo">Conclusão da apuração<select name="culpa">${Object.entries(CULPA).map(([k, t]) => `<option value="${k}" ${k === o.culpa ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo">Valor a descontar (R$)<input name="valor" inputmode="decimal" value="${o.valor_prejuizo ?? o.valor_multa ?? o.custo ?? ''}"></label>
      <label class="campo">Decisão<select name="resp">${Object.entries(RESP_PAT).map(([k, [t]]) => `<option value="${k}" ${k === o.responsabilizacao ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo largo">Fundamentação (versão do motorista, provas)<textarea name="fund" rows="3">${esc(o.fundamentacao || '')}</textarea></label>
      <div class="largo" id="b-desc" hidden>${avisoLei(multa ? 'multa' : 'desconto_dano')}
        <label class="check"><input type="checkbox" name="termo"> O contrato/termo assinado prevê o desconto por culpa (necessário quando não há dolo)</label>
        <label class="check"><input type="checkbox" name="ouvido"> O motorista foi ouvido e a versão dele está registrada</label>
        <label class="check"><input type="checkbox" name="juridico"> O jurídico analisou e aprovou o desconto</label></div></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar decisão</button></div></form>`,
      { aoAbrir: raiz => { const f = $('form', raiz); const s = () => { $('#b-desc', raiz).hidden = f.resp.value !== 'desconto_encaminhado_dp'; }; f.resp.onchange = s; s(); },
        validar: d => { if (d.resp !== 'desconto_encaminhado_dp') return null; if (!['dolo', 'culpa'].includes(d.culpa)) return 'Só é possível descontar com dolo ou culpa apurados (art. 462 §1º).';
          if (d.culpa === 'culpa' && !d.termo) return 'Desconto por culpa exige previsão no contrato/termo assinado (art. 462 §1º).'; if (!d.ouvido) return 'Ouça o motorista antes de decidir.';
          if (!d.juridico) return 'Confirme a aprovação do jurídico antes de encaminhar o desconto ao DP.'; if (!(num(d.valor) > 0)) return 'Informe o valor.'; if (!d.fund) return 'Registre a fundamentação.'; return null; } });
    if (!r) return;
    try { await api.alterar('ocorrencias_operacionais', `id=eq.${id}`, { culpa: r.culpa, valor_prejuizo: num(r.valor), responsabilizacao: r.resp, fundamentacao: r.fund + (r.resp === 'desconto_encaminhado_dp' ? '\n[Motorista ouvido · aprovado pelo jurídico]' : '') });
      aviso('Decisão registrada.'); navegar(); } catch (err) { falha(err); } });
});
