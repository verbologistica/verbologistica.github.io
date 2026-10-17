// Verbo Gestão — Manutenção / PCM: OS, preventivas, checklist pré-uso, hodômetro, pneus e custos da frota
'use strict';

const editaManut = () => tem('administrador', 'manutencao');
const TIPOS_OS = { preventiva: 'Preventiva', corretiva: 'Corretiva', preditiva: 'Preditiva', socorro: 'Socorro / guincho', reforma: 'Reforma', inspecao: 'Inspeção' };
const ST_OS = { aberta: ['Aberta', 'amarelo'], em_execucao: ['Em execução', 'azul'], aguardando_peca: ['Aguardando peça', 'vermelho'], aguardando_terceiro: ['Aguardando terceiro', 'vermelho'],
  concluida: ['Concluída', 'verde'], cancelada: ['Cancelada', ''] };
const PRIOR_OS = { baixa: ['Baixa', ''], normal: ['Normal', 'azul'], alta: ['Alta', 'amarelo'], urgente: ['Urgente', 'vermelho'] };
const CAUSAS_OS = { desgaste: 'Desgaste natural', defeito: 'Defeito / falha do componente', falta_manutencao: 'Falta de manutenção', mau_uso: 'Mau uso / operação incorreta', acidente: 'Acidente', vandalismo: 'Vandalismo / furto' };
const ITEM_OS = { peca_estoque: 'Peça do almoxarifado', peca_compra: 'Peça comprada fora', servico_terceiro: 'Serviço de terceiro', mao_obra: 'Mão de obra interna' };
const ST_PNEU = { estoque: ['Em estoque', 'azul'], montado: ['Montado', 'verde'], recapagem: ['Na recapagem', 'amarelo'], conserto: ['No conserto', 'amarelo'], sucata: ['Sucata', ''] };
const MOV_PNEU = { montagem: 'Montagem', desmontagem: 'Desmontagem', rodizio: 'Rodízio', inspecao: 'Inspeção (sulco/calibragem)', envio_recapagem: 'Envio para recapagem',
  retorno_recapagem: 'Retorno da recapagem', envio_conserto: 'Envio para conserto', retorno_conserto: 'Retorno do conserto', sucata: 'Sucatear' };
const CHECK_PADRAO = [['Freios (pedal, estacionamento, ar)', true], ['Pneus (sulco, calibragem, cortes, estepe)', true], ['Luzes (faróis, setas, freio, ré, placa)', true],
  ['Vazamentos (óleo, água, combustível, ar)', true], ['Níveis (óleo, água, Arla 32)', false], ['Direção e suspensão', true], ['Cinto, retrovisores, para-brisa e limpador', true],
  ['Tacógrafo funcionando', false], ['Extintor, triângulo, macaco e chave de roda', false], ['Engate, quinta roda, travas e lonas', true], ['Documentos do veículo (CRLV)', false]];
const tagSt = (m, k) => `<span class="tag ${m[k]?.[1] || ''}">${m[k]?.[0] || esc(k || '')}</span>`;
const nomeTipoOS = t => TIPOS_OS[t] || t;
const eqsAtivos = () => api.listar('equipamentos', 'select=id,codigo_frota,tipo,tipo_outro,marca,modelo,km_atual,horimetro,situacao,ativo&ativo=eq.true&order=codigo_frota');
const optEq = (eqs, sel) => eqs.map(e => `<option value="${e.id}" ${e.id === sel ? 'selected' : ''}>${esc(rotuloEq(e))}${e.km_atual != null ? ' · ' + Number(e.km_atual).toLocaleString('pt-BR') + ' km' : ''}</option>`).join('');
const kmBR = v => v == null ? '—' : Number(v).toLocaleString('pt-BR') + ' km';

Object.assign(LEI, {
  frota_conservacao: ['Conservação da frota — CTB e normas', [
    'Conduzir veículo em <b>mau estado de conservação</b>, comprometendo a segurança, é infração grave com retenção do veículo (CTB art. 230, XVIII). O proprietário responde pela manutenção.',
    'O <b>tacógrafo</b> é obrigatório para veículos de carga acima de 4.536 kg (CTB art. 105, II) e precisa de <b>verificação metrológica do Inmetro a cada 2 anos</b>; sem ela, é infração (art. 230, X).',
    'A profundidade mínima dos sulcos dos pneus é <b>1,6 mm</b> (Res. Contran 558/1980). Abaixo disso o veículo pode ser retido.',
    '<b>Óleo lubrificante usado</b> deve ir para coletor/rerrefinador autorizado pela ANP, guardando o certificado de coleta (Res. Conama 362/2005). <b>Pneus inservíveis</b> devem ir a ponto de coleta (Res. Conama 416/2009). Descarte irregular gera multa ambiental.',
    'Na oficina, máquinas e ferramentas seguem a NR-12; elevação de cargas e macacos, a NR-11; e os mecânicos devem usar EPI (NR-6).']],
  checklist_motorista: ['Checklist pré-uso — dever do motorista', [
    'É dever do motorista profissional <b>estar atento às condições de segurança do veículo</b> (CLT art. 235-B, I) e verificar o veículo antes de sair (CTB art. 27).',
    'Item <b>crítico reprovado</b> (freio, pneu, direção, luzes, engate): o veículo <b>não deve sair</b>. O sistema abre uma OS urgente e marca o equipamento como parado.',
    'O checklist protege o motorista: registra que o defeito foi comunicado antes da viagem.']],
});

// ===================== Painel =====================
rota('/manut', async tela => {
  const [prev, os, eqs, pend, pn] = await Promise.all([api.listar('v_manut_preventivas', 'order=situacao'), api.listar('manut_os', 'ativo=eq.true&status=not.in.(concluida,cancelada)&select=*,eq:equipamentos(codigo_frota,tipo,tipo_outro,marca,modelo)&order=criado_em.desc'),
    eqsAtivos(), api.rpc('pendencias_manut').catch(() => []), api.listar('pneus', 'ativo=eq.true&status=eq.montado&sulco_atual=lte.3&select=*,eq:equipamentos(codigo_frota)').catch(() => [])]);
  const p = Object.fromEntries(pend.map(x => [x.tipo, Number(x.quantidade)]));
  const venc = prev.filter(x => x.situacao !== 'em_dia').sort((a, b) => (a.situacao === 'vencida' ? 0 : 1) - (b.situacao === 'vencida' ? 0 : 1));
  const parados = eqs.filter(e => e.situacao === 'manutencao');
  tela.innerHTML = `
    <div class="topo"><div><h1>Manutenção</h1><p class="sub">Preventivas, ordens de serviço, pneus e custos da frota</p></div>
      <div class="acoes"><a class="btn prim" href="#/manut/os/nova">+ Nova OS</a><a class="btn" href="#/manut/checklist">Checklist</a></div></div>
    <div class="grade" style="margin-bottom:14px">
      <a class="cartao kpi ${p.manut_preventivas_vencidas ? 'alerta' : ''}" href="#/manut/preventivas"><div class="n">${p.manut_preventivas_vencidas || 0}</div><div class="r">preventivas vencidas sem OS</div></a>
      <a class="cartao kpi" href="#/manut/preventivas"><div class="n">${p.manut_preventivas_proximas || 0}</div><div class="r">preventivas próximas</div></a>
      <a class="cartao kpi ${p.manut_os_urgentes ? 'alerta' : ''}" href="#/manut/os"><div class="n">${os.length}</div><div class="r">OS em aberto${p.manut_os_urgentes ? ` (${p.manut_os_urgentes} urgente)` : ''}</div></a>
      <div class="cartao kpi ${parados.length ? 'alerta' : ''}"><div class="n">${parados.length} / ${eqs.length}</div><div class="r">equipamentos parados · disponibilidade ${eqs.length ? Math.round(100 * (eqs.length - parados.length) / eqs.length) : 100}%</div></div>
      <a class="cartao kpi ${pn.length ? 'alerta' : ''}" href="#/manut/pneus"><div class="n">${pn.length}</div><div class="r">pneus montados com sulco ≤ 3 mm</div></a>
      ${p.manut_responsabilizacao ? `<a class="cartao kpi alerta" href="#/manut/os?resp=1"><div class="n">${p.manut_responsabilizacao}</div><div class="r">danos em apuração de responsabilidade</div></a>` : ''}
    </div>
    <div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(340px,1fr))">
      <div class="cartao"><h2>Preventivas a fazer</h2>${venc.length ? `<ul class="lista-simples">${venc.map(v => `<li style="flex-wrap:wrap"><span><b>${esc(v.codigo_frota || '')}</b> · ${esc(v.plano)}
          <div class="muted">${[v.proxima_km != null && 'em ' + kmBR(v.proxima_km) + ' (atual ' + kmBR(v.km_atual) + ')', v.proxima_data && 'até ' + dataBR(v.proxima_data), v.proxima_horas != null && v.proxima_horas + ' h'].filter(Boolean).join(' · ')}</div></span>
          <span>${v.situacao === 'vencida' ? '<span class="tag vermelho">Vencida</span>' : '<span class="tag amarelo">Próxima</span>'}
          ${v.os_aberta_id ? `<a class="btn peq" href="#/manut/os/ver/${v.os_aberta_id}">Ver OS</a>` : editaManut() ? `<button class="btn peq prim" data-abrir="${v.id}">Abrir OS</button>` : ''}</span></li>`).join('')}</ul>` : '<div class="vazio">Nenhuma preventiva vencida ou próxima. 👍</div>'}</div>
      <div class="cartao"><h2>OS em aberto</h2>${os.length ? `<ul class="lista-simples">${os.slice(0, 15).map(o => `<li class="clicavel" onclick="location.hash='#/manut/os/ver/${o.id}'"><span><b>${esc(o.numero)}</b> ${esc(o.eq?.codigo_frota || '')} · ${esc(nomeTipoOS(o.tipo))}
          <div class="muted">${esc((o.problema || '').split('\n')[0].slice(0, 90))}</div></span><span>${tagSt(PRIOR_OS, o.prioridade)} ${tagSt(ST_OS, o.status)}</span></li>`).join('')}</ul>` : '<div class="vazio">Nenhuma OS em aberto.</div>'}</div>
      ${parados.length ? `<div class="cartao"><h2>Parados em manutenção</h2><ul class="lista-simples">${parados.map(e => `<li><span>${esc(rotuloEq(e))}</span><a class="btn peq" href="#/manut/os?eq=${e.id}">OS</a></li>`).join('')}</ul></div>` : ''}
    </div>
    ${avisoLei('frota_conservacao')}`;
  $$('[data-abrir]', tela).forEach(b => b.onclick = async () => { try { const id = await api.rpc('abrir_os_preventiva', { p_plano_equipamento: b.dataset.abrir }); location.hash = '#/manut/os/ver/' + id; } catch (err) { falha(err); } });
});

// ===================== Ordens de serviço =====================
rota('/manut/os', async tela => {
  const sts = pLista('status', 'todas'), st = sts[0], eqs_ = pLista('eq'), eq = eqs_.length === 1 ? eqs_[0] : '', tipos = pLista('tipo'), tipo = tipos[0] || '', resp = estado.params.get('resp') === '1', priors = pLista('prioridade'), prior = priors[0] || '';
  let filtro = 'ativo=eq.true';
  if (!temTodos(sts)) filtro += '&' + filtroOu(sts.map(s => s === 'abertas' ? 'status=not.in.(concluida,cancelada)' : 'status=eq.' + s));
  if (eqs_.length) filtro += '&equipamento_id=in.(' + eqs_.join(',') + ')'; if (tipos.length) filtro += '&tipo=in.(' + tipos.map(encodeURIComponent).join(',') + ')'; if (resp) filtro += '&responsabilizacao=not.is.null'; if (priors.length) filtro += '&prioridade=in.(' + priors.join(',') + ')';
  const [os, eqs] = await Promise.all([api.listar('manut_os', `${filtro}&select=*,eq:equipamentos(codigo_frota,tipo,tipo_outro,marca,modelo),forn:fornecedores(razao_social)&order=criado_em.desc&limit=300`), eqsAtivos()]);
  const total = os.reduce((a, o) => a + Number(o.custo_total || 0), 0);
  tela.innerHTML = `
    <div class="topo"><div><h1>Ordens de serviço</h1><p class="sub">${os.length} OS · ${brl(total)}</p></div><a class="btn prim" href="#/manut/os/nova${eq ? '?eq=' + eq : ''}">+ Nova OS</a></div>
    <form class="filtros" id="filtros">
      <select name="status"><option value="abertas" ${st === 'abertas' ? 'selected' : ''}>Em aberto</option>${Object.entries(ST_OS).map(([k, [t]]) => `<option value="${k}" ${k === st ? 'selected' : ''}>${t}</option>`).join('')}<option value="todas" ${st === 'todas' ? 'selected' : ''}>Todas</option></select>
      <select name="eq"><option value="">Todos os equipamentos</option>${optEq(eqs, eq)}</select>
      <select name="tipo"><option value="">Todos os tipos</option>${Object.entries(TIPOS_OS).map(([k, t]) => `<option value="${k}" ${k === tipo ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <label class="check"><input type="checkbox" name="resp" ${resp ? 'checked' : ''}> Com apuração de responsabilidade</label><button class="btn">Filtrar</button></form>
    <div class="cartao">${os.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>OS</th><th>Equipamento</th><th>Tipo</th><th>Problema</th><th>Prioridade</th><th>Situação</th><th>Abertura</th><th class="num">Custo</th></tr></thead><tbody>
      ${os.map(o => `<tr class="clicavel" onclick="location.hash='#/manut/os/ver/${o.id}'"><td data-r="OS" class="mono"><b>${esc(o.numero)}</b></td><td data-r="Equipamento">${esc(o.eq ? rotuloEq(o.eq) : '')}${o.equipamento_parado && !['concluida', 'cancelada'].includes(o.status) ? ' <span class="tag vermelho">parado</span>' : ''}</td>
        <td data-r="Tipo">${esc(nomeTipoOS(o.tipo))}${o.oficina === 'externa' ? `<div class="muted">${esc(o.forn?.razao_social || 'oficina externa')}</div>` : ''}</td><td data-r="Problema">${esc((o.problema || '').split('\n')[0].slice(0, 80))}${o.responsabilizacao ? ' <span class="tag amarelo">apuração</span>' : ''}</td>
        <td data-r="Prioridade">${tagSt(PRIOR_OS, o.prioridade)}</td><td data-r="Situação">${tagSt(ST_OS, o.status)}</td><td data-r="Abertura">${dataBR(o.criado_em)}</td><td data-r="Custo" class="num">${brl(o.custo_total)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Nenhuma OS.</div>'}</div>`;
  $('#filtros').onsubmit = e => { e.preventDefault(); const d = formDados(e.target); location.hash = '#/manut/os?' + new URLSearchParams(Object.entries({ status: d.status, eq: d.eq, tipo: d.tipo, resp: d.resp ? '1' : '' }).filter(([, v]) => v)); };
});

async function formOS(tela, o = null) {
  const [eqs, fs, cs] = await Promise.all([eqsAtivos(), cad('fornecedores', 'select=id,razao_social,ativo&order=razao_social'), api.listar('v_colaboradores_basico', 'select=id,nome,cargo&order=nome').catch(() => [])]);
  const eqSel = o?.equipamento_id || estado.params.get('eq') || '';
  const comps = eqSel ? await api.listar('veiculos', `equipamento_id=eq.${eqSel}&ativo=eq.true&order=ordem`).catch(() => []) : [];
  const ed = editaManut();
  tela.innerHTML = `<div class="topo"><div><h1>${o ? 'Editar ' + esc(o.numero) : 'Nova ordem de serviço'}</h1><p class="sub">${ed ? 'Abra a OS, lance peças e serviços e conclua quando o equipamento for liberado' : 'Relate o problema: a manutenção vai avaliar'}</p></div></div>
    <form id="f-os" class="cartao"><div class="form">
      <label class="campo largo">Equipamento *<select name="equipamento_id" required><option value="">Selecione…</option>${optEq(eqs, eqSel)}</select></label>
      <label class="campo">Composição (placa)<select name="veiculo_id"><option value="">O conjunto / não se aplica</option>${comps.map(c => `<option value="${c.id}" ${c.id === o?.veiculo_id ? 'selected' : ''}>${esc((c.descricao_composicao || 'Composição ' + c.ordem) + ' · ' + c.placa)}</option>`).join('')}</select></label>
      <label class="campo">Tipo<select name="tipo" data-valor="${esc(o?.tipo || '')}">${Object.entries(TIPOS_OS).map(([k, t]) => `<option value="${k}" ${k === (o?.tipo || 'corretiva') ? 'selected' : ''}>${t}</option>`).join('')}<option value="Outro">Outro</option></select></label>
      <label class="campo">Prioridade<select name="prioridade">${Object.entries(PRIOR_OS).map(([k, [t]]) => `<option value="${k}" ${k === (o?.prioridade || 'normal') ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo largo">Problema relatado *<textarea name="problema" rows="3" required>${esc(o?.problema || '')}</textarea></label>
      <label class="campo">Km atual<input name="km" inputmode="numeric" value="${o?.km ?? ''}"></label><label class="campo">Horímetro<input name="horimetro" inputmode="decimal" value="${o?.horimetro ?? ''}"></label>
      <label class="check largo"><input type="checkbox" name="equipamento_parado" ${o?.equipamento_parado ? 'checked' : ''}> Equipamento parado (não pode operar até concluir)</label>
      ${ed ? `<label class="campo largo">Diagnóstico<textarea name="diagnostico" rows="2">${esc(o?.diagnostico || '')}</textarea></label>
      <label class="campo">Oficina<select name="oficina"><option value="interna">Interna</option><option value="externa" ${o?.oficina === 'externa' ? 'selected' : ''}>Externa (terceiro)</option></select></label>
      <label class="campo">Fornecedor / oficina<select name="fornecedor_id"><option value="">—</option>${fs.filter(f => f.ativo).map(f => `<option value="${f.id}" ${f.id === o?.fornecedor_id ? 'selected' : ''}>${esc(f.razao_social)}</option>`).join('')}</select></label>
      <label class="campo">Mecânico responsável<select name="mecanico_id"><option value="">—</option>${cs.map(c => `<option value="${c.id}" ${c.id === o?.mecanico_id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></label>
      <label class="campo">Previsão de liberação<input type="date" name="previsao" value="${o?.previsao || ''}"></label>
      <label class="campo">Causa provável<select name="causa" data-valor="${esc(o?.causa || '')}"><option value="">A definir</option>${Object.entries(CAUSAS_OS).map(([k, t]) => `<option value="${k}" ${k === o?.causa ? 'selected' : ''}>${t}</option>`).join('')}<option value="Outro">Outro</option></select></label>
      <label class="campo" id="b-resp">Colaborador envolvido<select name="colaborador_responsavel_id"><option value="">—</option>${cs.map(c => `<option value="${c.id}" ${c.id === o?.colaborador_responsavel_id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></label>
      <div class="largo" id="b-lei" hidden>${avisoLei('desconto_dano')}<p class="muted">Ao informar o colaborador, a OS entra em <b>apuração de responsabilidade</b>. Nenhum desconto é feito sem apuração, dolo ou culpa prevista em contrato e aprovação do jurídico.</p></div>` : ''}
      <label class="campo largo">Fotos / laudos<input type="file" name="arquivos" multiple accept="image/*,application/pdf"></label></div>
      <div class="acoes" style="margin-top:12px"><button class="btn prim">${o ? 'Salvar' : 'Abrir OS'}</button><a class="btn" href="javascript:history.back()">Cancelar</a></div></form>`;
  const f = $('#f-os');
  f.equipamento_id.onchange = async () => { const e = eqs.find(x => x.id === f.equipamento_id.value);
    if (e && !f.km.value && e.km_atual != null) f.km.placeholder = 'atual: ' + e.km_atual;
    const cps = e ? await api.listar('veiculos', `equipamento_id=eq.${e.id}&ativo=eq.true&order=ordem`).catch(() => []) : [];
    f.veiculo_id.innerHTML = `<option value="">O conjunto / não se aplica</option>${cps.map(c => `<option value="${c.id}">${esc((c.descricao_composicao || 'Composição ' + c.ordem) + ' · ' + c.placa)}</option>`).join('')}`; };
  const sCausa = () => { if ($('#b-lei')) $('#b-lei').hidden = !['mau_uso', 'acidente', 'vandalismo'].includes(f.causa.value); };
  f.causa?.addEventListener('change', sCausa); sCausa();
  f.onsubmit = async e => { e.preventDefault(); const d = formDados(f);
    const dados = { equipamento_id: d.equipamento_id, veiculo_id: d.veiculo_id || null, tipo: d.tipo || 'corretiva', prioridade: d.prioridade, problema: d.problema, km: d.km ? Number(soDigitos(d.km)) : null,
      horimetro: num(d.horimetro), equipamento_parado: !!d.equipamento_parado };
    if (ed) Object.assign(dados, { diagnostico: d.diagnostico || null, oficina: d.oficina, fornecedor_id: d.fornecedor_id || null, mecanico_id: d.mecanico_id || null, previsao: d.previsao || null,
      causa: d.causa || null, colaborador_responsavel_id: d.colaborador_responsavel_id || null });
    await ocupado(e.submitter, async () => { try {
      let id = o?.id; if (o) await api.alterar('manut_os', `id=eq.${id}`, dados); else [{ id }] = await api.inserir('manut_os', { ...dados, origem: ed ? 'manual' : 'solicitacao' });
      if (dados.km && !o) await api.inserir('hodometro_leituras', { equipamento_id: dados.equipamento_id, km: dados.km, origem: 'os', observacao: 'Abertura de OS' }).catch(() => {});
      if (d.arquivos?.length) await anexar('manut_os', id, d.arquivos);
      aviso(o ? 'OS salva.' : 'OS aberta.'); location.hash = '#/manut/os/ver/' + id;
    } catch (err) { falha(err); } }); };
}
rota('/manut/os/nova', tela => formOS(tela));
rota('/manut/os/editar/:id', async (tela, id) => formOS(tela, await api.um('manut_os', `id=eq.${id}`)));

rota('/manut/os/ver/:id', async (tela, id) => {
  const o = await api.um('manut_os', `id=eq.${id}&select=*,eq:equipamentos(id,codigo_frota,tipo,tipo_outro,marca,modelo,km_atual,horimetro),forn:fornecedores(razao_social),mec:colaboradores!manut_os_mecanico_id_fkey(nome),resp:colaboradores!manut_os_colaborador_responsavel_id_fkey(nome),solic:usuarios!manut_os_solicitante_id_fkey(nome)`);
  if (!o) { tela.innerHTML = '<div class="cartao vazio">OS não encontrada ou sem acesso.</div>'; return; }
  const [its, pecas, cs, fs, veic] = await Promise.all([api.listar('manut_os_itens', `os_id=eq.${id}&ativo=eq.true&select=*,colab:colaboradores(nome),forn:fornecedores(razao_social)&order=criado_em`),
    api.listar('almox_itens', 'ativo=eq.true&select=id,codigo,descricao,unidade,saldo,custo_medio&order=descricao').catch(() => []), api.listar('v_colaboradores_basico', 'select=id,nome&order=nome').catch(() => []),
    cad('fornecedores', 'select=id,razao_social,ativo&order=razao_social'), o.veiculo_id ? api.um('veiculos', `id=eq.${o.veiculo_id}`).catch(() => null) : null]);
  const ed = editaManut(), aberta = !['concluida', 'cancelada'].includes(o.status);
  const tot = t => its.filter(i => t.includes(i.tipo)).reduce((a, i) => a + Number(i.valor_total || 0), 0);
  tela.innerHTML = `
    <div class="topo"><div><h1>${esc(o.numero)} · ${esc(o.eq ? rotuloEq(o.eq) : '')}</h1><p class="sub">${tagSt(ST_OS, o.status)} ${tagSt(PRIOR_OS, o.prioridade)} · ${esc(nomeTipoOS(o.tipo))}${veic ? ' · placa ' + esc(veic.placa) : ''} · aberta em ${dataHoraBR(o.criado_em)} por ${esc(o.solic?.nome || '')}${o.origem === 'checklist' ? ' (checklist)' : o.origem === 'plano' ? ' (plano preventivo)' : ''}</p></div>
      <div class="acoes">${ed && aberta ? `${o.status === 'aberta' ? '<button class="btn" data-st="em_execucao">Iniciar</button>' : ''}${o.status !== 'aguardando_peca' ? '<button class="btn" data-st="aguardando_peca">Aguardando peça</button>' : ''}
        ${o.status !== 'aguardando_terceiro' ? '<button class="btn" data-st="aguardando_terceiro">Aguardando terceiro</button>' : ''}${o.status !== 'em_execucao' && o.status !== 'aberta' ? '<button class="btn" data-st="em_execucao">Retomar</button>' : ''}
        <button class="btn prim" id="concluir">Concluir</button><a class="btn" href="#/manut/os/editar/${id}">Editar</a><button class="btn perigo" id="cancelar">Cancelar</button>` : ''}
        <button class="btn" id="imprimir">Imprimir OS</button><a class="btn" href="#/manut/os">Voltar</a></div></div>
    ${o.equipamento_parado && aberta ? '<div class="cartao alerta-obs">⛔ <b>Equipamento parado</b>: não deve operar até a conclusão desta OS.</div>' : ''}
    <div class="cartao"><div class="form">
      <div class="largo"><div class="muted">Problema relatado</div><div style="white-space:pre-line"><b>${esc(o.problema)}</b></div></div>
      ${o.diagnostico ? `<div class="largo"><div class="muted">Diagnóstico</div><div style="white-space:pre-line">${esc(o.diagnostico)}</div></div>` : ''}
      ${o.solucao ? `<div class="largo"><div class="muted">Serviço executado</div><div style="white-space:pre-line">${esc(o.solucao)}</div></div>` : ''}
      ${[['Km / horímetro', [o.km != null && kmBR(o.km), o.horimetro != null && o.horimetro + ' h'].filter(Boolean).join(' · ')], ['Oficina', o.oficina === 'externa' ? 'Externa · ' + (o.forn?.razao_social || 'fornecedor a definir') : 'Interna'],
        ['Mecânico', o.mec?.nome], ['Previsão', dataBR(o.previsao)], ['Causa', CAUSAS_OS[o.causa] || o.causa], ['Início', o.iniciada_em && dataHoraBR(o.iniciada_em)], ['Conclusão', o.concluida_em && dataHoraBR(o.concluida_em)],
        ['Tempo parado', o.equipamento_parado ? (() => { const h = Math.round(((o.concluida_em ? new Date(o.concluida_em) : new Date()) - new Date(o.criado_em)) / 36e5); return h >= 48 ? Math.round(h / 24) + ' dias' : h + ' h'; })() : '']]
        .map(([k, v]) => `<div><div class="muted">${k}</div><b>${v ? esc(v) : '—'}</b></div>`).join('')}
      ${o.motivo_cancelamento ? `<div class="largo"><div class="muted">Motivo do cancelamento</div>${esc(o.motivo_cancelamento)}</div>` : ''}
      <div class="largo" id="anx-os"></div></div></div>
    <div class="cartao"><div class="topo" style="margin:0 0 8px"><h2 style="margin:0">Peças, serviços e mão de obra</h2>${ed && aberta ? '<button class="btn peq prim" id="add-item">+ Lançar</button>' : ''}</div>
      ${its.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Tipo</th><th>Descrição</th><th class="num">Qtd</th><th class="num">Unitário</th><th class="num">Total</th><th></th></tr></thead><tbody>
        ${its.map(i => `<tr><td data-r="Tipo">${ITEM_OS[i.tipo]}</td><td data-r="Descrição">${esc(i.descricao)}${i.colab ? ` <span class="muted">· ${esc(i.colab.nome)}</span>` : ''}${i.forn ? ` <span class="muted">· ${esc(i.forn.razao_social)}</span>` : ''}${i.documento ? ` <span class="muted">· ${esc(i.documento)}</span>` : ''}</td>
          <td data-r="Qtd" class="num">${Number(i.quantidade).toLocaleString('pt-BR')}</td><td data-r="Unitário" class="num">${brl(i.valor_unitario)}</td><td data-r="Total" class="num">${brl(i.valor_total)}</td>
          <td>${ed && aberta ? `<button class="btn peq perigo" data-rem="${i.id}">Remover</button>` : ''}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td colspan="4">Peças ${brl(tot(['peca_estoque', 'peca_compra']))} · Serviços ${brl(tot(['servico_terceiro']))} · Mão de obra ${brl(tot(['mao_obra']))}</td><td class="num"><b>${brl(o.custo_total)}</b></td><td></td></tr></tfoot></table></div>` : '<div class="vazio">Nada lançado.</div>'}
      <p class="muted">Peça do almoxarifado baixa o estoque na hora e fica no kardex com o número da OS. Remover a peça devolve ao estoque.</p></div>
    ${o.responsabilizacao ? `<div class="cartao ${o.responsabilizacao === 'em_analise' ? 'alerta-obs' : ''}"><h2>Apuração de responsabilidade</h2>
      <p>Colaborador: <b>${esc(o.resp?.nome || '—')}</b> · ${tagSt(RESP_PAT, o.responsabilizacao)} · ${esc(CULPA[o.culpa] || '')}${o.valor_prejuizo ? ' · prejuízo ' + brl(o.valor_prejuizo) : ''}</p>
      ${o.fundamentacao ? `<p style="white-space:pre-line">${esc(o.fundamentacao)}</p>` : ''}
      ${avisoLei('desconto_dano')}${(ed || tem('rh', 'dp')) ? '<button class="btn" id="decidir">Registrar decisão</button>' : ''}</div>` : ''}`;
  $('#anx-os').innerHTML = await htmlAnexos('manut_os', id);
  $$('[data-st]', tela).forEach(b => b.onclick = async () => { try { await api.alterar('manut_os', `id=eq.${id}`, { status: b.dataset.st }); navegar(); } catch (err) { falha(err); } });
  $('#cancelar')?.addEventListener('click', async () => { const m = await confirmar('Cancelar esta OS? Peças lançadas do estoque devem ser removidas antes.', { comMotivo: true, botao: 'Cancelar OS' }); if (!m) return;
    try { for (const i of its.filter(x => x.tipo === 'peca_estoque')) await api.alterar('manut_os_itens', `id=eq.${i.id}`, { ativo: false });
      await api.alterar('manut_os', `id=eq.${id}`, { status: 'cancelada', motivo_cancelamento: m }); delete estado.cache.almox_itens; navegar(); } catch (err) { falha(err); } });
  $('#concluir')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Concluir ${esc(o.numero)}</h2><div class="form">
      <label class="campo largo">Serviço executado *<textarea name="solucao" rows="4" required>${esc(o.solucao || '')}</textarea></label>
      <label class="campo">Km na liberação<input name="km" inputmode="numeric" placeholder="atual: ${o.eq?.km_atual ?? '—'}"></label><label class="campo">Horímetro<input name="horimetro" inputmode="decimal"></label>
      <label class="campo largo">Causa<select name="causa" data-valor="${esc(o.causa || '')}"><option value="">—</option>${Object.entries(CAUSAS_OS).map(([k, t]) => `<option value="${k}" ${k === o.causa ? 'selected' : ''}>${t}</option>`).join('')}<option value="Outro">Outro</option></select></label></div>
      ${!its.length ? '<p class="alerta-obs">Nenhuma peça ou serviço lançado. Se houve custo, lance antes de concluir.</p>' : ''}
      ${o.oficina === 'externa' && !o.fornecedor_id ? '<p class="alerta-obs">Oficina externa sem fornecedor: edite a OS e informe o fornecedor.</p>' : ''}
      <p class="muted">Se a OS veio de um plano preventivo, o plano é reiniciado a partir deste km e desta data.</p>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Concluir e liberar</button></div></form>`);
    if (!r) return;
    try { await api.rpc('concluir_os', { p_os: id, p_solucao: r.solucao, p_km: r.km ? Number(soDigitos(r.km)) : null, p_horimetro: num(r.horimetro), p_causa: r.causa || null }); aviso('OS concluída. Equipamento liberado.'); navegar(); } catch (err) { falha(err); } });
  $('#add-item')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Lançar na ${esc(o.numero)}</h2><div class="form">
      <label class="campo largo">Tipo<select name="tipo">${Object.entries(ITEM_OS).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></label>
      <label class="campo largo" id="b-peca">Peça do almoxarifado<select name="almox_item_id"><option value="">Selecione…</option>${pecas.map(p => `<option value="${p.id}" ${Number(p.saldo) <= 0 ? 'disabled' : ''}>${esc(p.codigo + ' · ' + p.descricao)} · estoque ${Number(p.saldo).toLocaleString('pt-BR')} ${esc(p.unidade)} · ${brl(p.custo_medio)}</option>`).join('')}</select></label>
      <label class="campo largo" id="b-desc">Descrição<input name="descricao" placeholder="Ex.: troca de embreagem, retífica do cabeçote"></label>
      <label class="campo">Quantidade / horas<input name="quantidade" inputmode="decimal" value="1"></label>
      <label class="campo" id="b-val">Valor unitário (R$)<input name="valor_unitario" inputmode="decimal"></label>
      <label class="campo" id="b-colab">Mecânico<select name="colaborador_id"><option value="">—</option>${cs.map(c => `<option value="${c.id}" ${c.id === o.mecanico_id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></label>
      <label class="campo" id="b-forn">Fornecedor<select name="fornecedor_id"><option value="">—</option>${fs.filter(f => f.ativo).map(f => `<option value="${f.id}" ${f.id === o.fornecedor_id ? 'selected' : ''}>${esc(f.razao_social)}</option>`).join('')}</select></label>
      <label class="campo" id="b-doc">Nota fiscal<input name="documento"></label></div>
      <p class="muted" id="m-pc">Peça comprada fora: lance também a conta a pagar no Financeiro (ou pelo pedido de compra) com a NF.</p>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Lançar</button></div></form>`,
      { aoAbrir: raiz => { const f = $('form', raiz); const s = () => { const t = f.tipo.value; $('#b-peca', raiz).hidden = t !== 'peca_estoque'; $('#b-desc', raiz).hidden = t === 'peca_estoque';
          $('#b-val', raiz).hidden = t === 'peca_estoque'; $('#b-colab', raiz).hidden = t !== 'mao_obra'; $('#b-forn', raiz).hidden = !['peca_compra', 'servico_terceiro'].includes(t); $('#b-doc', raiz).hidden = !['peca_compra', 'servico_terceiro'].includes(t);
          $('#m-pc', raiz).hidden = !['peca_compra', 'servico_terceiro'].includes(t); }; f.tipo.onchange = s; s(); },
        validar: d => d.tipo === 'peca_estoque' ? (!d.almox_item_id ? 'Escolha a peça.' : null) : (!d.descricao ? 'Descreva o item.' : !(num(d.valor_unitario) >= 0) ? 'Informe o valor.' : null) });
    if (!r) return;
    try { await api.inserir('manut_os_itens', { os_id: id, tipo: r.tipo, almox_item_id: r.tipo === 'peca_estoque' ? r.almox_item_id : null, descricao: r.tipo === 'peca_estoque' ? null : r.descricao,
        quantidade: num(r.quantidade) || 1, valor_unitario: r.tipo === 'peca_estoque' ? 0 : (num(r.valor_unitario) || 0), colaborador_id: r.tipo === 'mao_obra' ? (r.colaborador_id || null) : null,
        fornecedor_id: ['peca_compra', 'servico_terceiro'].includes(r.tipo) ? (r.fornecedor_id || null) : null, documento: r.documento || null });
      if (o.status === 'aberta') await api.alterar('manut_os', `id=eq.${id}`, { status: 'em_execucao' });
      delete estado.cache.almox_itens; navegar(); } catch (err) { falha(err); } });
  $$('[data-rem]', tela).forEach(b => b.onclick = async () => { if (!await confirmar('Remover este lançamento? Peça do estoque volta ao almoxarifado.')) return;
    try { await api.alterar('manut_os_itens', `id=eq.${b.dataset.rem}`, { ativo: false }); delete estado.cache.almox_itens; navegar(); } catch (err) { falha(err); } });
  $('#imprimir').onclick = async () => { const m = await modeloPorCodigo('MAN-OS-001'); if (!m) return aviso('Modelo da OS não encontrado.', true);
    await gerarDocumento(m, null, { os: { numero: o.numero, equipamento: o.eq ? rotuloEq(o.eq) + (veic ? ' · placa ' + veic.placa : '') : '', km: o.km != null ? kmBR(o.km) : '', horimetro: o.horimetro ?? '',
      tipo: nomeTipoOS(o.tipo), prioridade: PRIOR_OS[o.prioridade]?.[0], abertura: dataHoraBR(o.criado_em), oficina: o.oficina === 'externa' ? 'Externa — ' + (o.forn?.razao_social || '') : 'Interna',
      problema_html: esc(o.problema).replace(/\n/g, '<br>'), diagnostico_html: esc(o.diagnostico || '').replace(/\n/g, '<br>') || '<br><br><br>', solucao_html: esc(o.solucao || '').replace(/\n/g, '<br>') || '<br><br><br><br>',
      tabela_itens: `<table border="1" cellpadding="5" style="border-collapse:collapse;width:100%;font-size:12px"><tr><th>Tipo</th><th>Descrição</th><th>Qtd</th><th>Total</th></tr>${its.map(i => `<tr><td>${ITEM_OS[i.tipo]}</td><td>${esc(i.descricao)}</td><td>${Number(i.quantidade).toLocaleString('pt-BR')}</td><td>${brl(i.valor_total)}</td></tr>`).join('')}${'<tr><td>&nbsp;</td><td></td><td></td><td></td></tr>'.repeat(its.length ? 2 : 6)}</table>` } }); };
  $('#decidir')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Responsabilização · ${esc(o.numero)}</h2><p>${esc(o.resp?.nome || '')} · custo da OS ${brl(o.custo_total)}</p><div class="form">
      <label class="campo">Conclusão da apuração<select name="culpa">${Object.entries(CULPA).map(([k, t]) => `<option value="${k}" ${k === o.culpa ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo">Prejuízo comprovado (R$)<input name="valor" inputmode="decimal" value="${o.valor_prejuizo ?? o.custo_total ?? ''}"></label>
      <label class="campo">Decisão<select name="resp">${Object.entries(RESP_PAT).map(([k, [t]]) => `<option value="${k}" ${k === o.responsabilizacao ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo largo">Fundamentação (relato, provas, parecer)<textarea name="fund" rows="3">${esc(o.fundamentacao || '')}</textarea></label>
      <div class="largo" id="b-desc" hidden>${avisoLei('desconto_dano')}
        <label class="check"><input type="checkbox" name="termo"> Há cláusula/termo assinado prevendo desconto por culpa (necessário quando não há dolo)</label>
        <label class="check"><input type="checkbox" name="juridico"> O jurídico analisou e aprovou o desconto</label></div></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar decisão</button></div></form>`,
      { aoAbrir: raiz => { const f = $('form', raiz); const s = () => { $('#b-desc', raiz).hidden = f.resp.value !== 'desconto_encaminhado_dp'; }; f.resp.onchange = s; s(); },
        validar: d => { if (d.resp !== 'desconto_encaminhado_dp') return null;
          if (!['dolo', 'culpa'].includes(d.culpa)) return 'Só é possível descontar com dolo ou culpa apurados (art. 462 §1º).';
          if (d.culpa === 'culpa' && !d.termo) return 'Desconto por culpa exige acordo/termo assinado pelo colaborador (art. 462 §1º).';
          if (!d.juridico) return 'Confirme a aprovação do jurídico antes de encaminhar o desconto ao DP.';
          if (!(num(d.valor) > 0)) return 'Informe o prejuízo comprovado.'; if (!d.fund) return 'Registre a fundamentação.'; return null; } });
    if (!r) return;
    try { await api.alterar('manut_os', `id=eq.${id}`, { culpa: r.culpa, valor_prejuizo: num(r.valor), responsabilizacao: r.resp, fundamentacao: (r.fund || '') + (r.resp === 'desconto_encaminhado_dp' ? '\n[Aprovado pelo jurídico]' : '') || null });
      aviso('Decisão registrada.'); navegar(); } catch (err) { falha(err); } });
});

// ===================== Planos preventivos =====================
rota('/manut/preventivas', async tela => {
  const [planos, prev, eqs] = await Promise.all([api.listar('manut_planos', 'ativo=eq.true&order=nome'), api.listar('v_manut_preventivas', 'order=codigo_frota'), eqsAtivos()]);
  const ordem = { vencida: 0, proxima: 1, em_dia: 2 };
  tela.innerHTML = `
    <div class="topo"><div><h1>Planos preventivos</h1><p class="sub">Por km, horas de motor ou dias — o que vencer primeiro</p></div>${editaManut() ? '<button class="btn prim" id="novo-plano">+ Novo plano</button>' : ''}</div>
    <div class="cartao"><h2>Situação por equipamento</h2>${prev.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Equipamento</th><th>Plano</th><th>Última</th><th>Próxima</th><th>Situação</th><th></th></tr></thead><tbody>
      ${prev.sort((a, b) => ordem[a.situacao] - ordem[b.situacao]).map(v => `<tr><td data-r="Equipamento"><b>${esc(v.codigo_frota || '')}</b><div class="muted">${kmBR(v.km_atual)}</div></td><td data-r="Plano">${esc(v.plano)}</td>
        <td data-r="Última">${[v.ultima_data && dataBR(v.ultima_data), v.ultima_km != null && kmBR(v.ultima_km)].filter(Boolean).join(' · ') || '—'}</td>
        <td data-r="Próxima">${[v.proxima_km != null && kmBR(v.proxima_km), v.proxima_horas != null && v.proxima_horas + ' h', v.proxima_data && dataBR(v.proxima_data)].filter(Boolean).join(' · ')}</td>
        <td data-r="Situação">${{ vencida: '<span class="tag vermelho">Vencida</span>', proxima: '<span class="tag amarelo">Próxima</span>', em_dia: '<span class="tag verde">Em dia</span>' }[v.situacao]}</td>
        <td>${v.os_aberta_id ? `<a class="btn peq" href="#/manut/os/ver/${v.os_aberta_id}">Ver OS</a>` : editaManut() ? `<button class="btn peq ${v.situacao !== 'em_dia' ? 'prim' : ''}" data-abrir="${v.id}">Abrir OS</button> <button class="btn peq" data-ult="${v.id}">Ajustar última</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`
      : '<div class="vazio">Nenhum equipamento vinculado a planos. Abra um plano e vincule os equipamentos.</div>'}</div>
    <div class="cartao"><h2>Planos</h2><ul class="lista-simples">${planos.map(p => `<li style="flex-wrap:wrap"><span><b>${esc(p.nome)}</b> <span class="muted">· ${[p.intervalo_km && 'a cada ' + kmBR(p.intervalo_km), p.intervalo_horas && p.intervalo_horas + ' h', p.intervalo_dias && p.intervalo_dias + ' dias'].filter(Boolean).join(' ou ')}</span>
        <div class="muted">${esc(p.descricao || '')} · ${prev.filter(v => v.plano_id === p.id).length} equipamento(s)</div></span>
        ${editaManut() ? `<span><button class="btn peq" data-vinc="${p.id}">Equipamentos</button> <button class="btn peq" data-ed="${p.id}">Editar</button></span>` : ''}</li>`).join('')}</ul></div>
    ${avisoLei('frota_conservacao')}`;
  $('#novo-plano')?.addEventListener('click', () => formPlano());
  $$('[data-ed]', tela).forEach(b => b.onclick = () => formPlano(planos.find(p => p.id === b.dataset.ed)));
  $$('[data-abrir]', tela).forEach(b => b.onclick = async () => { try { const id = await api.rpc('abrir_os_preventiva', { p_plano_equipamento: b.dataset.abrir }); location.hash = '#/manut/os/ver/' + id; } catch (err) { falha(err); } });
  $$('[data-ult]', tela).forEach(b => b.onclick = async () => { const v = prev.find(x => x.id === b.dataset.ult);
    const r = await modal(`<form><h2>Última execução · ${esc(v.codigo_frota || '')} · ${esc(v.plano)}</h2><p class="muted">Use para registrar uma preventiva feita antes do sistema.</p><div class="form">
      <label class="campo">Data<input type="date" name="data" value="${v.ultima_data || ''}"></label><label class="campo">Km<input name="km" inputmode="numeric" value="${v.ultima_km ?? ''}"></label>
      <label class="campo">Horímetro<input name="h" inputmode="decimal" value="${v.ultima_horas ?? ''}"></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`);
    if (!r) return;
    try { await api.alterar('manut_plano_equipamentos', `id=eq.${v.id}`, { ultima_data: r.data || null, ultima_km: r.km ? Number(soDigitos(r.km)) : null, ultima_horas: num(r.h) }); navegar(); } catch (err) { falha(err); } });
  $$('[data-vinc]', tela).forEach(b => b.onclick = async () => { const p = planos.find(x => x.id === b.dataset.vinc);
    const vs = await api.listar('manut_plano_equipamentos', `plano_id=eq.${p.id}&select=*`);
    const aptos = eqs.filter(e => !p.tipos_equipamento?.length || p.tipos_equipamento.includes(e.tipo));
    const r = await modal(`<form><h2>Equipamentos · ${esc(p.nome)}</h2><p class="muted">${p.tipos_equipamento?.length ? 'Mostrando só os tipos do plano.' : 'Plano para qualquer tipo.'} Ao vincular, informe a última execução em “Ajustar última”.</p>
      <div style="max-height:50vh;overflow:auto">${aptos.map(e => `<label class="check" style="display:block"><input type="checkbox" name="e_${e.id}" ${vs.some(v => v.equipamento_id === e.id && v.ativo) ? 'checked' : ''}> ${esc(rotuloEq(e))}</label>`).join('') || '<p class="muted">Nenhum equipamento do tipo.</p>'}</div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`);
    if (!r) return;
    try { for (const e of aptos) { const quer = !!r['e_' + e.id], tem_ = vs.find(v => v.equipamento_id === e.id);
        if (quer && !tem_) await api.inserir('manut_plano_equipamentos', { plano_id: p.id, equipamento_id: e.id, ultima_km: e.km_atual, ultima_horas: e.horimetro, ultima_data: hojeISO() });
        else if (tem_ && tem_.ativo !== quer) await api.alterar('manut_plano_equipamentos', `id=eq.${tem_.id}`, { ativo: quer }); }
      aviso('Vínculos salvos.'); navegar(); } catch (err) { falha(err); } });
});
async function formPlano(p = null) {
  const r = await modal(`<form><h2>${p ? 'Editar plano' : 'Novo plano preventivo'}</h2><div class="form">
    <label class="campo largo">Nome *<input name="nome" required value="${esc(p?.nome || '')}"></label>
    <label class="campo largo">Descrição<input name="descricao" value="${esc(p?.descricao || '')}"></label>
    <label class="campo">A cada (km)<input name="km" inputmode="numeric" value="${p?.intervalo_km ?? ''}"></label><label class="campo">A cada (horas de motor)<input name="horas" inputmode="decimal" value="${p?.intervalo_horas ?? ''}"></label>
    <label class="campo">A cada (dias)<input name="dias" inputmode="numeric" value="${p?.intervalo_dias ?? ''}"></label>
    <label class="campo">Avisar antes (km)<input name="aviso_km" inputmode="numeric" value="${p?.aviso_km ?? 1000}"></label><label class="campo">Avisar antes (dias)<input name="aviso_dias" inputmode="numeric" value="${p?.aviso_dias ?? 15}"></label>
    <div class="largo"><div class="muted">Tipos de equipamento (nenhum = todos)</div>${Object.entries(TIPOS_EQ).map(([k, [t]]) => `<label class="check" style="display:inline-flex;margin-right:10px"><input type="checkbox" name="t_${k}" ${p?.tipos_equipamento?.includes(k) ? 'checked' : ''}> ${t}</label>`).join('')}</div>
    <label class="campo largo">Serviços (um por linha)<textarea name="servicos" rows="5">${esc(p?.servicos || '')}</textarea></label></div>
    <div class="rodape">${p ? '<button class="btn perigo" value="desativar">Desativar</button>' : ''}<button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim" value="salvar">Salvar</button></div></form>`,
    { validar: d => d._acao === 'desativar' || d.km || d.horas || d.dias ? null : 'Informe pelo menos um intervalo (km, horas ou dias).' });
  if (!r) return;
  try {
    if (r._acao === 'desativar') { await api.alterar('manut_planos', `id=eq.${p.id}`, { ativo: false }); return navegar(); }
    const dados = { nome: r.nome, descricao: r.descricao || null, intervalo_km: r.km ? Number(soDigitos(r.km)) : null, intervalo_horas: num(r.horas), intervalo_dias: r.dias ? Number(r.dias) : null,
      aviso_km: Number(soDigitos(r.aviso_km)) || 1000, aviso_dias: Number(r.aviso_dias) || 15, servicos: r.servicos || null, tipos_equipamento: Object.keys(TIPOS_EQ).filter(k => r['t_' + k]) };
    if (!dados.tipos_equipamento.length) dados.tipos_equipamento = null;
    if (p) await api.alterar('manut_planos', `id=eq.${p.id}`, dados); else await api.inserir('manut_planos', dados);
    aviso('Plano salvo.'); navegar();
  } catch (err) { falha(err); }
}

// ===================== Checklist pré-uso =====================
rota('/manut/checklist', async tela => {
  const [eqs, ult] = await Promise.all([eqsAtivos(), api.listar('manut_checklists', 'ativo=eq.true&select=*,eq:equipamentos(codigo_frota,tipo,tipo_outro,marca,modelo),u:usuarios(nome)&order=data_hora.desc&limit=50')]);
  tela.innerHTML = `
    <div class="topo"><div><h1>Checklist pré-uso</h1><p class="sub">Antes de sair: confira o veículo. Item crítico reprovado abre OS urgente.</p></div></div>
    ${avisoLei('checklist_motorista')}
    <form id="f-chk" class="cartao"><div class="form">
      <label class="campo largo">Equipamento *<select name="equipamento_id" required><option value="">Selecione…</option>${optEq(eqs)}</select></label>
      <label class="campo">Km no painel *<input name="km" inputmode="numeric" required></label><label class="campo">Horímetro<input name="horimetro" inputmode="decimal"></label></div>
      <table class="tabela-notas" style="margin-top:10px">${CHECK_PADRAO.map(([t, c], k) => `<tr><td><b>${esc(t)}</b>${c ? ' <span class="tag vermelho" title="Reprovado impede a saída">crítico</span>' : ''}</td>
        <td class="chk-op"><label><input type="radio" name="i${k}" value="1" checked> OK</label><label><input type="radio" name="i${k}" value="0"> Não OK</label></td>
        <td><input name="o${k}" placeholder="Observação"></td></tr>`).join('')}</table>
      <label class="campo" style="margin-top:8px">Observações gerais<input name="observacao"></label>
      <label class="campo">Fotos<input type="file" name="arquivos" multiple accept="image/*"></label>
      <div class="acoes" style="margin-top:10px"><button class="btn prim">Enviar checklist</button></div></form>
    <div class="cartao"><h2>Últimos checklists</h2>${ult.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Data</th><th>Equipamento</th><th>Motorista</th><th class="num">Km</th><th>Resultado</th></tr></thead><tbody>
      ${ult.map(c => `<tr><td data-r="Data">${dataHoraBR(c.data_hora)}</td><td data-r="Equipamento">${esc(c.eq ? rotuloEq(c.eq) : '')}</td><td data-r="Motorista">${esc(c.u?.nome || '')}</td><td data-r="Km" class="num">${kmBR(c.km)}</td>
        <td data-r="Resultado">${c.nao_conformes ? `<span class="tag ${c.bloqueante ? 'vermelho' : 'amarelo'}">${c.nao_conformes} não conforme(s)${c.bloqueante ? ' · bloqueado' : ''}</span>${c.os_id ? ` <a href="#/manut/os/ver/${c.os_id}">ver OS</a>` : ''}` : '<span class="tag verde">Aprovado</span>'}</td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Nenhum checklist ainda.</div>'}</div>`;
  $('#f-chk').onsubmit = async e => { e.preventDefault(); const d = formDados(e.target);
    const itens = CHECK_PADRAO.map(([t, c], k) => ({ item: t, critico: c, ok: d['i' + k] !== '0', obs: d['o' + k] || '' }));
    const nok = itens.filter(i => !i.ok);
    if (nok.some(i => !i.obs)) return aviso('Descreva o problema nos itens marcados como “Não OK”.', true);
    if (nok.some(i => i.critico) && !await confirmar('Há item CRÍTICO reprovado: o veículo ficará bloqueado e será aberta OS urgente. Confirmar?', { botao: 'Enviar' })) return;
    await ocupado(e.submitter, async () => { try {
      const [c] = await api.inserir('manut_checklists', { equipamento_id: d.equipamento_id, km: Number(soDigitos(d.km)), horimetro: num(d.horimetro), itens, observacao: d.observacao || null });
      if (d.arquivos?.length) await anexar('manut_checklist', c.id, d.arquivos);
      aviso(c.bloqueante ? 'Checklist enviado. NÃO saia com o veículo: a manutenção foi avisada.' : nok.length ? 'Checklist enviado. A manutenção vai avaliar os itens.' : 'Checklist aprovado. Boa viagem!', c.bloqueante); navegar();
    } catch (err) { falha(err); } }); };
});

// ===================== Hodômetro =====================
rota('/manut/hodometro', async tela => {
  const eqs_ = pLista('eq'), eq = eqs_.length === 1 ? eqs_[0] : '';
  const [eqs, ls] = await Promise.all([eqsAtivos(), api.listar('hodometro_leituras', `ativo=eq.true${eqs_.length ? '&equipamento_id=in.(' + eqs_.join(',') + ')' : ''}&select=*,e:equipamentos(codigo_frota)&order=data_hora.desc&limit=200`)]);
  tela.innerHTML = `<div class="topo"><div><h1>Km e horímetro</h1><p class="sub">A leitura alimenta as preventivas e o custo por km</p></div></div>
    <form id="f-hod" class="cartao"><div class="form">
      <label class="campo largo">Equipamento *<select name="equipamento_id" required><option value="">Selecione…</option>${optEq(eqs, eq)}</select></label>
      <label class="campo">Km<input name="km" inputmode="numeric"></label><label class="campo">Horímetro<input name="horimetro" inputmode="decimal"></label>
      <label class="campo">Data e hora<input type="datetime-local" name="quando"></label>
      ${editaManut() ? '<label class="check largo"><input type="checkbox" name="correcao"> Correção (troca de painel/hodômetro ou erro de digitação)</label>' : ''}
      <label class="campo largo">Observação<input name="observacao"></label></div>
      <div class="acoes"><button class="btn prim">Registrar leitura</button></div></form>
    <div class="cartao"><form class="filtros" id="filtros" style="margin:0 0 8px"><select name="eq"><option value="">Todos</option>${optEq(eqs, eq)}</select><button class="btn">Filtrar</button></form>
      ${ls.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Data</th><th>Equipamento</th><th class="num">Km</th><th class="num">Horímetro</th><th>Origem</th><th>Obs.</th></tr></thead><tbody>
      ${ls.map(l => `<tr><td data-r="Data">${dataHoraBR(l.data_hora)}</td><td data-r="Equipamento">${esc(l.e?.codigo_frota || '')}</td><td data-r="Km" class="num">${kmBR(l.km)}</td><td data-r="Horímetro" class="num">${l.horimetro ?? '—'}</td>
        <td data-r="Origem">${l.origem === 'correcao' ? '<span class="tag amarelo">correção</span>' : esc(l.origem)}</td><td data-r="Obs.">${esc(l.observacao || '')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Sem leituras.</div>'}</div>`;
  $('#filtros').onsubmit = e => { e.preventDefault(); location.hash = '#/manut/hodometro?eq=' + formDados(e.target).eq; };
  $('#f-hod').onsubmit = async e => { e.preventDefault(); const d = formDados(e.target);
    if (!d.km && !d.horimetro) return aviso('Informe o km ou o horímetro.', true);
    if (d.correcao && !d.observacao) return aviso('Correção exige o motivo na observação.', true);
    try { await api.inserir('hodometro_leituras', { equipamento_id: d.equipamento_id, km: d.km ? Number(soDigitos(d.km)) : null, horimetro: num(d.horimetro), data_hora: d.quando ? new Date(d.quando).toISOString() : undefined,
        origem: d.correcao ? 'correcao' : 'manual', observacao: d.observacao || null }); aviso('Leitura registrada.'); navegar(); } catch (err) { falha(err); } };
});

// ===================== Pneus =====================
rota('/manut/pneus', async tela => {
  const sts = pLista('status'), st = sts[0] || '', eqs_ = pLista('eq'), eq = eqs_.length === 1 ? eqs_[0] : '';
  const [ps, eqs] = await Promise.all([api.listar('pneus', `ativo=eq.true${sts.length ? '&status=in.(' + sts.join(',') + ')' : '&status=neq.sucata'}${eqs_.length ? '&equipamento_id=in.(' + eqs_.join(',') + ')' : ''}&select=*,e:equipamentos(codigo_frota),v:veiculos(placa)&order=numero_fogo`), eqsAtivos()]);
  const cpk = p => p.km_acumulado > 0 && p.custo ? (Number(p.custo) / p.km_acumulado * 1000) : null;
  tela.innerHTML = `
    <div class="topo"><div><h1>Pneus</h1><p class="sub">${ps.length} pneu(s) · controle por número de fogo</p></div>${editaManut() ? '<button class="btn prim" id="novo-pneu">+ Cadastrar pneu</button>' : ''}</div>
    <form class="filtros" id="filtros"><select name="status"><option value="">Ativos (sem sucata)</option>${Object.entries(ST_PNEU).map(([k, [t]]) => `<option value="${k}" ${k === st ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <select name="eq"><option value="">Todos os equipamentos</option>${optEq(eqs, eq)}</select><button class="btn">Filtrar</button></form>
    <div class="cartao">${ps.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Fogo</th><th>Pneu</th><th>Vida</th><th>Situação</th><th>Onde</th><th class="num">Sulco</th><th class="num">Km rodado</th><th class="num">Custo/1000 km</th><th></th></tr></thead><tbody>
      ${ps.map(p => `<tr><td data-r="Fogo" class="mono"><a href="#/manut/pneus/ver/${p.id}"><b>${esc(p.numero_fogo)}</b></a></td><td data-r="Pneu">${esc([p.marca, p.modelo, p.medida].filter(Boolean).join(' '))}</td>
        <td data-r="Vida">${p.vida ? p.vida + 'ª recapagem' : 'Novo'}</td><td data-r="Situação">${tagSt(ST_PNEU, p.status)}</td>
        <td data-r="Onde">${p.status === 'montado' ? `${esc(p.e?.codigo_frota || '')}${p.v ? ' · ' + esc(p.v.placa) : ''} · <b>${esc(p.posicao || '')}</b>` : '—'}</td>
        <td data-r="Sulco" class="num">${p.sulco_atual != null ? `<span class="tag ${p.sulco_atual <= 1.6 ? 'vermelho' : p.sulco_atual <= 3 ? 'amarelo' : 'verde'}">${String(p.sulco_atual).replace('.', ',')} mm</span>` : '—'}</td>
        <td data-r="Km" class="num">${kmBR(p.km_acumulado + (p.status === 'montado' && p.km_montagem != null && p.e ? 0 : 0))}</td><td data-r="Custo/1000 km" class="num">${cpk(p) ? brl(cpk(p)) : '—'}</td>
        <td>${editaManut() ? `<button class="btn peq" data-mov="${p.id}">Movimentar</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Nenhum pneu.</div>'}</div>
    ${avisoLei('frota_conservacao')}`;
  $('#filtros').onsubmit = e => { e.preventDefault(); const d = formDados(e.target); location.hash = '#/manut/pneus?' + new URLSearchParams(Object.entries(d).filter(([, v]) => v)); };
  $('#novo-pneu')?.addEventListener('click', () => formPneu());
  $$('[data-mov]', tela).forEach(b => b.onclick = () => movPneu(ps.find(p => p.id === b.dataset.mov), eqs));
});
async function formPneu(p = null) {
  const fs = await cad('fornecedores', 'select=id,razao_social,ativo&order=razao_social');
  const r = await modal(`<form><h2>${p ? 'Editar pneu ' + esc(p.numero_fogo) : 'Cadastrar pneu'}</h2><div class="form">
    <label class="campo">Número de fogo<input name="numero_fogo" value="${esc(p?.numero_fogo || '')}" placeholder="Vazio = automático"></label>
    <label class="campo">Marca<input name="marca" value="${esc(p?.marca || '')}"></label><label class="campo">Modelo<input name="modelo" value="${esc(p?.modelo || '')}"></label>
    <label class="campo">Medida<input name="medida" value="${esc(p?.medida || '')}" placeholder="295/80 R22.5"></label><label class="campo">DOT<input name="dot" value="${esc(p?.dot || '')}" placeholder="semana/ano, ex.: 2425"></label>
    <label class="campo">Banda<select name="tipo_banda" data-valor="${esc(p?.tipo_banda || '')}">${['', 'Lisa (direcional)', 'Borrachuda (tração)', 'Mista', 'Outro'].map(t => `<option ${t === p?.tipo_banda ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <label class="campo">Sulco inicial (mm)<input name="sulco_inicial" inputmode="decimal" value="${p?.sulco_inicial ?? ''}"></label>
    <label class="campo">Custo (R$)<input name="custo" inputmode="decimal" value="${p?.custo ?? ''}"></label>
    <label class="campo">Fornecedor<select name="fornecedor_id"><option value="">—</option>${fs.filter(f => f.ativo).map(f => `<option value="${f.id}" ${f.id === p?.fornecedor_id ? 'selected' : ''}>${esc(f.razao_social)}</option>`).join('')}</select></label>
    <label class="campo">Nota fiscal<input name="nota_fiscal" value="${esc(p?.nota_fiscal || '')}"></label><label class="campo">Data da compra<input type="date" name="data_compra" value="${p?.data_compra || ''}"></label>
    ${p ? '' : '<label class="campo">Quantidade (iguais)<input type="number" name="qtd" value="1" min="1" max="40"></label>'}</div>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`);
  if (!r) return;
  const dados = { marca: r.marca || null, modelo: r.modelo || null, medida: r.medida || null, dot: r.dot || null, tipo_banda: r.tipo_banda || null, sulco_inicial: num(r.sulco_inicial), custo: num(r.custo),
    fornecedor_id: r.fornecedor_id || null, nota_fiscal: r.nota_fiscal || null, data_compra: r.data_compra || null };
  try {
    if (p) await api.alterar('pneus', `id=eq.${p.id}`, { ...dados, numero_fogo: r.numero_fogo || p.numero_fogo });
    else { const n = Math.max(1, Number(r.qtd) || 1); await api.inserir('pneus', Array.from({ length: n }, (_, i) => ({ ...dados, numero_fogo: n === 1 ? (r.numero_fogo || null) : null }))); }
    aviso('Pneu(s) salvo(s).'); navegar();
  } catch (err) { falha(err.message.includes('duplicate') ? new Error('Já existe pneu com esse número de fogo.') : err); }
}
async function movPneu(p, eqs) {
  const permitidos = { estoque: ['montagem', 'inspecao', 'envio_recapagem', 'envio_conserto', 'sucata'], montado: ['rodizio', 'desmontagem', 'inspecao', 'envio_recapagem', 'envio_conserto', 'sucata'],
    recapagem: ['retorno_recapagem', 'sucata'], conserto: ['retorno_conserto', 'sucata'], sucata: [] }[p.status];
  if (!permitidos.length) return aviso('Pneu sucateado não tem movimentos.', true);
  const fs = await cad('fornecedores', 'select=id,razao_social,ativo&order=razao_social');
  const r = await modal(`<form><h2>Pneu ${esc(p.numero_fogo)}</h2><p class="muted">${tagSt(ST_PNEU, p.status)} ${p.status === 'montado' ? `${esc(p.e?.codigo_frota || '')} · ${esc(p.posicao || '')}` : ''}</p><div class="form">
    <label class="campo largo">Movimento<select name="tipo">${permitidos.map(k => `<option value="${k}">${MOV_PNEU[k]}</option>`).join('')}</select></label>
    <label class="campo largo" id="b-eq">Equipamento<select name="equipamento_id"><option value="">—</option>${optEq(eqs, p.equipamento_id)}</select></label>
    <label class="campo" id="b-comp">Composição (placa)<select name="veiculo_id"><option value="">—</option></select></label>
    <label class="campo" id="b-pos">Posição<input name="posicao" placeholder="Ex.: 1E, 2DI, 3EE, Estepe" value="${esc(p.posicao || '')}"></label>
    <label class="campo">Km do equipamento<input name="km" inputmode="numeric" placeholder="vazio = km atual"></label>
    <label class="campo">Sulco medido (mm)<input name="sulco" inputmode="decimal"></label><label class="campo">Calibragem (psi)<input name="psi" inputmode="numeric"></label>
    <label class="campo" id="b-custo">Custo (R$)<input name="custo" inputmode="decimal"></label>
    <label class="campo" id="b-forn">Fornecedor<select name="fornecedor_id"><option value="">—</option>${fs.filter(f => f.ativo).map(f => `<option value="${f.id}">${esc(f.razao_social)}</option>`).join('')}</select></label>
    <label class="campo largo">Motivo / observação<input name="motivo"></label></div>
    <p class="muted" id="m-suc" hidden>Pneu inservível deve ir para ponto de coleta (Res. Conama 416/2009). Guarde o comprovante de destinação.</p>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Registrar</button></div></form>`,
    { aoAbrir: raiz => { const f = $('form', raiz);
        const carrega = async () => { const cps = f.equipamento_id.value ? await api.listar('veiculos', `equipamento_id=eq.${f.equipamento_id.value}&ativo=eq.true&order=ordem`).catch(() => []) : [];
          f.veiculo_id.innerHTML = `<option value="">—</option>${cps.map(c => `<option value="${c.id}" ${c.id === p.veiculo_id ? 'selected' : ''}>${esc((c.descricao_composicao || 'Composição ' + c.ordem) + ' · ' + c.placa)}</option>`).join('')}`; };
        const s = () => { const t = f.tipo.value; $('#b-eq', raiz).hidden = !['montagem', 'rodizio'].includes(t); $('#b-comp', raiz).hidden = !['montagem', 'rodizio'].includes(t); $('#b-pos', raiz).hidden = !['montagem', 'rodizio'].includes(t);
          $('#b-custo', raiz).hidden = !['retorno_recapagem', 'retorno_conserto'].includes(t); $('#b-forn', raiz).hidden = !t.includes('recapagem') && !t.includes('conserto'); $('#m-suc', raiz).hidden = t !== 'sucata'; };
        f.tipo.onchange = s; f.equipamento_id.onchange = carrega; s(); carrega(); },
      validar: d => ['montagem', 'rodizio'].includes(d.tipo) && (!d.equipamento_id || !d.posicao) ? 'Informe o equipamento e a posição.' : d.tipo === 'sucata' && !d.motivo ? 'Informe o motivo do sucateamento.' : null });
  if (!r) return;
  try { await api.inserir('pneu_movimentos', { pneu_id: p.id, tipo: r.tipo, equipamento_id: ['montagem', 'rodizio'].includes(r.tipo) ? r.equipamento_id : null, veiculo_id: ['montagem', 'rodizio'].includes(r.tipo) ? (r.veiculo_id || null) : null,
      posicao: ['montagem', 'rodizio'].includes(r.tipo) ? r.posicao : null, km: r.km ? Number(soDigitos(r.km)) : null, sulco: num(r.sulco), calibragem_psi: r.psi ? Number(r.psi) : null, custo: num(r.custo),
      fornecedor_id: r.fornecedor_id || null, motivo: r.motivo || null });
    aviso('Movimento registrado.'); navegar(); } catch (err) { falha(err); }
}
rota('/manut/pneus/ver/:id', async (tela, id) => {
  const [p, ms] = await Promise.all([api.um('pneus', `id=eq.${id}&select=*,e:equipamentos(codigo_frota),forn:fornecedores(razao_social)`), api.listar('pneu_movimentos', `pneu_id=eq.${id}&ativo=eq.true&select=*,e:equipamentos(codigo_frota)&order=data.desc,criado_em.desc`)]);
  if (!p) { tela.innerHTML = '<div class="cartao vazio">Pneu não encontrado.</div>'; return; }
  tela.innerHTML = `<div class="topo"><div><h1>Pneu ${esc(p.numero_fogo)}</h1><p class="sub">${esc([p.marca, p.modelo, p.medida].filter(Boolean).join(' '))} · ${tagSt(ST_PNEU, p.status)} · ${p.vida ? p.vida + 'ª recapagem' : 'novo'}</p></div>
    <div class="acoes">${editaManut() ? '<button class="btn" id="editar">Editar</button>' : ''}<a class="btn" href="#/manut/pneus">Voltar</a></div></div>
    <div class="cartao"><div class="form">${[['DOT', p.dot], ['Banda', p.tipo_banda], ['Sulco', p.sulco_atual != null ? p.sulco_atual + ' mm (inicial ' + (p.sulco_inicial ?? '—') + ')' : ''], ['Km acumulado', kmBR(p.km_acumulado)],
      ['Custo total', p.custo ? brl(p.custo) : ''], ['Compra', [dataBR(p.data_compra), p.forn?.razao_social, p.nota_fiscal && 'NF ' + p.nota_fiscal].filter(Boolean).join(' · ')], ['Onde está', p.status === 'montado' ? (p.e?.codigo_frota || '') + ' · ' + (p.posicao || '') : ST_PNEU[p.status][0]]]
      .map(([k, v]) => `<div><div class="muted">${k}</div><b>${v ? esc(v) : '—'}</b></div>`).join('')}</div></div>
    <div class="cartao"><h2>Histórico</h2><ul class="lista-simples">${ms.map(m => `<li><span><b>${MOV_PNEU[m.tipo]}</b> <span class="muted">${dataBR(m.data)}${m.e ? ' · ' + esc(m.e.codigo_frota || '') : ''}${m.posicao ? ' · ' + esc(m.posicao) : ''}${m.km != null ? ' · ' + kmBR(m.km) : ''}${m.sulco != null ? ' · sulco ' + m.sulco + ' mm' : ''}${m.calibragem_psi ? ' · ' + m.calibragem_psi + ' psi' : ''}${m.motivo ? ' · ' + esc(m.motivo) : ''}</span></span><span>${m.custo ? brl(m.custo) : ''}</span></li>`).join('') || '<li class="muted">Sem movimentos.</li>'}</ul></div>`;
  $('#editar')?.addEventListener('click', () => formPneu(p));
});

// ===================== Custos =====================
rota('/manut/custos', async tela => {
  const ini = estado.params.get('ini') || somaDias(hojeISO(), -365).slice(0, 7), fim = estado.params.get('fim') || hojeISO().slice(0, 7);
  const cs = await api.listar('v_manut_custos_mes', `mes=gte.${ini}-01&mes=lte.${fim}-01&order=codigo_frota`);
  const por = {}; cs.forEach(c => { const x = por[c.equipamento_id] ||= { codigo: c.codigo_frota || '—', pecas: 0, servicos: 0, mao_obra: 0, pneus: 0, combustivel: 0, litros: 0, km: 0, os: 0, corr: 0 };
    x.pecas += +c.pecas; x.servicos += +c.servicos; x.mao_obra += +c.mao_obra; x.pneus += +c.pneus; x.combustivel += +c.combustivel; x.litros += +c.litros; x.km += +c.km_rodado; x.os += +c.qtd_os; x.corr += +c.qtd_corretivas; });
  const linhas = Object.values(por).map(x => ({ ...x, manut: x.pecas + x.servicos + x.mao_obra + x.pneus, total: x.pecas + x.servicos + x.mao_obra + x.pneus + x.combustivel })).sort((a, b) => b.total - a.total);
  const soma = k => linhas.reduce((a, x) => a + x[k], 0);
  tela.innerHTML = `<div class="topo"><div><h1>Custos da frota</h1><p class="sub">Manutenção (peças, serviços, mão de obra, pneus) e combustível por equipamento</p></div></div>
    <form class="filtros" id="filtros"><label class="muted" style="align-self:center">De</label><input type="month" name="ini" value="${ini}"><label class="muted" style="align-self:center">até</label><input type="month" name="fim" value="${fim}"><button class="btn">Filtrar</button></form>
    <div class="grade" style="margin-bottom:14px"><div class="cartao kpi"><div class="n">${brl(soma('manut'))}</div><div class="r">manutenção</div></div><div class="cartao kpi"><div class="n">${brl(soma('combustivel'))}</div><div class="r">combustível</div></div>
      <div class="cartao kpi"><div class="n">${soma('km') ? brl(soma('total') / soma('km')) : '—'}</div><div class="r">custo por km (frota)</div></div><div class="cartao kpi"><div class="n">${soma('os')}</div><div class="r">OS (${soma('corr')} corretivas)</div></div></div>
    <div class="cartao">${linhas.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Equipamento</th><th class="num">Peças</th><th class="num">Serviços</th><th class="num">Mão de obra</th><th class="num">Pneus</th><th class="num">Combustível</th><th class="num">Total</th><th class="num">Km</th><th class="num">R$/km</th><th class="num">km/l</th><th class="num">OS</th></tr></thead><tbody>
      ${linhas.map(x => `<tr><td data-r="Equipamento"><b>${esc(x.codigo)}</b></td><td data-r="Peças" class="num">${brl(x.pecas)}</td><td data-r="Serviços" class="num">${brl(x.servicos)}</td><td data-r="Mão de obra" class="num">${brl(x.mao_obra)}</td><td data-r="Pneus" class="num">${brl(x.pneus)}</td>
        <td data-r="Combustível" class="num">${brl(x.combustivel)}</td><td data-r="Total" class="num"><b>${brl(x.total)}</b></td><td data-r="Km" class="num">${x.km.toLocaleString('pt-BR')}</td><td data-r="R$/km" class="num">${x.km ? brl(x.total / x.km) : '—'}</td>
        <td data-r="km/l" class="num">${x.km && x.litros ? (x.km / x.litros).toFixed(2).replace('.', ',') : '—'}</td><td data-r="OS" class="num">${x.os}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td>Total</td><td class="num">${brl(soma('pecas'))}</td><td class="num">${brl(soma('servicos'))}</td><td class="num">${brl(soma('mao_obra'))}</td><td class="num">${brl(soma('pneus'))}</td><td class="num">${brl(soma('combustivel'))}</td><td class="num"><b>${brl(soma('total'))}</b></td><td class="num">${soma('km').toLocaleString('pt-BR')}</td><td></td><td></td><td class="num">${soma('os')}</td></tr></tfoot></table></div>` : '<div class="vazio">Sem custos no período.</div>'}
      <p class="muted">Km rodado vem das leituras de hodômetro (checklist, OS, lançamentos). Quanto mais leituras, mais preciso o custo por km.</p></div>`;
  $('#filtros').onsubmit = e => { e.preventDefault(); const d = formDados(e.target); location.hash = `#/manut/custos?ini=${d.ini}&fim=${d.fim}`; };
});
