// Verbo Gestão — SSMA: ASO e toxicológico, acidentes e CAT, plano de ação, inspeções, DDS e extintores
'use strict';

const editaSSMA = () => tem('administrador', 'ssma');
const TIPO_EXAME = { admissional: 'Admissional', periodico: 'Periódico', retorno_trabalho: 'Retorno ao trabalho', mudanca_risco: 'Mudança de riscos', demissional: 'Demissional', monitoracao_pontual: 'Monitoração pontual', toxicologico: 'Toxicológico' };
const RES_EXAME = { apto: ['Apto', 'verde'], apto_restricao: ['Apto com restrição', 'amarelo'], inapto: ['Inapto', 'vermelho'], negativo: ['Negativo', 'verde'], positivo: ['Positivo', 'vermelho'], pendente: ['Pendente', 'azul'] };
const SIT_ASO = { em_dia: ['Em dia', 'verde'], vencendo: ['Vence em 30 dias', 'amarelo'], vencido: ['Vencido', 'vermelho'], sem_aso: ['Sem ASO', 'vermelho'], inapto: ['Inapto', 'vermelho'] };
const TIPO_ACI = { tipico: 'Acidente típico (no trabalho)', trajeto: 'Acidente de trajeto', transito: 'Acidente de trânsito em serviço', doenca_ocupacional: 'Doença ocupacional', quase_acidente: 'Quase-acidente (sem lesão)', ambiental: 'Incidente ambiental (vazamento, derrame)', dano_material: 'Dano material (sem vítima)' };
const GRAV_ACI = { sem_lesao: ['Sem lesão', ''], sem_afastamento: ['Sem afastamento', 'amarelo'], com_afastamento: ['Com afastamento', 'vermelho'], fatal: ['Fatal', 'vermelho'] };
const ST_ACI = { aberto: ['Aberto', 'amarelo'], em_investigacao: ['Em investigação', 'azul'], concluido: ['Concluído', 'verde'] };
const ST_ACAO = { aberta: ['Aberta', 'amarelo'], em_andamento: ['Em andamento', 'azul'], concluida: ['Concluída', 'verde'], cancelada: ['Cancelada', ''] };
const INSP_MODELOS = {
  'Área de trabalho': ['Piso limpo, seco e sem obstáculos', 'Iluminação adequada', 'Saídas de emergência livres e sinalizadas', 'Extintores sinalizados, desobstruídos e no prazo', 'Instalações elétricas sem fios expostos', 'Uso correto de EPI pelos colaboradores', 'Materiais armazenados com segurança'],
  'Oficina': ['Uso de EPI (botina, luva, óculos, protetor auricular)', 'Ferramentas em bom estado e guardadas', 'Macacos e cavaletes em bom estado (NR-11/NR-12)', 'Proteções de máquinas instaladas (NR-12)', 'Óleo usado em recipiente próprio e identificado (Conama 362)', 'Piso sem óleo/graxa', 'Extintores no prazo e desobstruídos', 'Valas/fossos sinalizados'],
  'Almoxarifado': ['Prateleiras firmes e sem excesso de peso', 'Produtos químicos com FISPQ/FDS disponível', 'Corredores livres', 'Empilhamento seguro', 'Extintores no prazo'],
  'Veículo': ['Extintor no prazo', 'Triângulo, macaco e chave de roda', 'Cinto de segurança', 'Pneus em bom estado', 'Kit de emergência / produtos perigosos (se aplicável)', 'Tacógrafo aferido', 'Cabine limpa e organizada'],
  'Carga e descarga': ['Área isolada e sinalizada', 'Veículo calçado e freado', 'Amarração adequada da carga', 'Uso de EPI', 'Trabalho em altura com proteção (NR-35)'],
  'Ambiental': ['Resíduos separados e identificados', 'Óleo usado destinado a coletor autorizado (com certificado)', 'Pneus inservíveis destinados a ponto de coleta', 'Sem vazamentos no pátio', 'Kit de contenção de derrames disponível'],
};
const AGENTES_EXT = ['Água (A)', 'PQS (BC)', 'PQS (ABC)', 'CO2 (BC)', 'Espuma (AB)', 'Outro'];
const colabsBasico = () => api.listar('v_colaboradores_basico', 'select=id,nome,cargo,motorista,setor&order=nome').catch(() => []);
const htmlTexto = t => esc(t || '').replace(/\n/g, '<br>');

Object.assign(LEI, {
  aso: ['Exames ocupacionais — NR-7 e CLT art. 168', [
    '<b>Admissional</b>: antes de o colaborador começar a trabalhar. <b>Periódico</b>: na periodicidade do PCMSO (em geral anual para quem está exposto a riscos; a cada 2 anos para os demais). <b>Retorno ao trabalho</b>: no 1º dia de volta após afastamento de 30 dias ou mais. <b>Mudança de riscos</b>: antes da mudança.',
    '<b>Demissional</b>: até 10 dias após o término do contrato. Pode ser dispensado se o último exame foi há menos de <b>135 dias</b> (grau de risco 1 e 2) ou <b>90 dias</b> (grau 3 e 4).',
    'Colaborador <b>inapto</b> não pode exercer a função. ASO com <b>restrição</b> deve ser respeitado pela liderança.',
    '<b>Motoristas</b>: exame toxicológico na admissão e no desligamento (CLT art. 168 §6º) e periódico a cada 2 anos e 6 meses para CNH C, D e E (CTB art. 148-A).',
    'O ASO informa só apto/inapto e restrições. Diagnóstico e prontuário são sigilosos e ficam com o médico do trabalho (LGPD: dado de saúde).']],
  cat: ['Acidente de trabalho e CAT — Lei 8.213/91', [
    'Todo acidente de trabalho (típico, de trajeto ou doença ocupacional) exige <b>CAT até o 1º dia útil seguinte</b>; em caso de <b>morte, imediatamente</b> (art. 22). Vale mesmo sem afastamento. A CAT é enviada pelo eSocial (evento S-2210).',
    'Se a empresa não emitir, o próprio acidentado, o sindicato, o médico ou qualquer autoridade podem emitir — e a empresa fica sujeita a multa.',
    'Afastamento por mais de 15 dias: a partir do 16º dia o INSS paga o benefício; o <b>FGTS continua sendo depositado</b> durante o afastamento acidentário (Lei 8.036, art. 15 §5º).',
    '<b>Estabilidade</b>: após o retorno de afastamento acidentário superior a 15 dias, o colaborador tem garantia de emprego por <b>12 meses</b> (art. 118). Não dispense nesse período sem orientação do jurídico.',
    'Investigue todo acidente e quase-acidente e registre as ações (NR-1, gerenciamento de riscos).']],
  prevencao: ['Prevenção — NR-1 (GRO/PGR)', [
    'A empresa deve identificar perigos, avaliar riscos e manter um <b>plano de ação</b> com responsáveis e prazos (PGR).',
    'Inspeções e DDS são registros de que a empresa orienta e fiscaliza: guarde as listas de presença assinadas.',
    'Recusa injustificada em cumprir normas de segurança ou usar EPI é ato faltoso (CLT art. 158).']],
  extintores: ['Extintores — NR-23 e Contran', [
    'Manter extintores adequados à classe de fogo, sinalizados, desobstruídos e dentro do prazo de <b>recarga</b> e de <b>teste hidrostático</b> (a cada 5 anos).',
    'Inspeção visual periódica (lacre, manômetro, mangueira) e registro. Caminhões, ônibus e veículos de carga devem portar extintor (Res. Contran 556/2015).']],
});

// ===================== Painel =====================
rota('/ssma', async tela => {
  const [pend, acs, cats, exts] = await Promise.all([api.rpc('pendencias_ssma').catch(() => []), api.listar('ssma_acoes', 'ativo=eq.true&status=in.(aberta,em_andamento)&select=*,u:usuarios(nome)&order=prazo').catch(() => []),
    api.listar('acidentes', 'ativo=eq.true&status=neq.concluido&select=*,c:colaboradores(nome)&order=data_hora.desc').catch(() => []), api.listar('ssma_extintores', 'ativo=eq.true&order=recarga_vencimento').catch(() => [])]);
  const p = Object.fromEntries(pend.map(x => [x.tipo, Number(x.quantidade)]));
  const ano = hojeISO().slice(0, 4);
  const doAno = await api.listar('acidentes', `ativo=eq.true&data_hora=gte.${ano}-01-01&select=id,gravidade,tipo,data_hora`).catch(() => []);
  const comAf = doAno.filter(a => a.gravidade === 'com_afastamento' || a.gravidade === 'fatal');
  const ultimo = comAf.map(a => a.data_hora).sort().pop();
  const diasSem = ultimo ? Math.floor((Date.now() - new Date(ultimo)) / 864e5) : null;
  tela.innerHTML = `
    <div class="topo"><div><h1>SSMA</h1><p class="sub">Saúde, segurança e meio ambiente</p></div>
      <div class="acoes"><a class="btn prim" href="#/ssma/acidentes/novo">Comunicar acidente</a><a class="btn" href="#/ssma/inspecoes/nova">+ Inspeção</a><a class="btn" href="#/ssma/dds/novo">+ DDS</a></div></div>
    <div class="grade" style="margin-bottom:14px">
      <div class="cartao kpi"><div class="n">${diasSem == null ? '—' : diasSem}</div><div class="r">${diasSem == null ? 'nenhum acidente com afastamento em ' + ano : 'dias sem acidente com afastamento'}</div></div>
      <a class="cartao kpi ${p.cat_pendente ? 'alerta' : ''}" href="#/ssma/acidentes"><div class="n">${p.cat_pendente || 0}</div><div class="r">CAT pendente</div></a>
      <a class="cartao kpi ${p.aso_vencendo ? 'alerta' : ''}" href="#/ssma/aso?sit=pendentes"><div class="n">${p.aso_vencendo || 0}</div><div class="r">ASO vencido, vencendo ou faltando</div></a>
      <a class="cartao kpi ${p.tox_vencendo ? 'alerta' : ''}" href="#/ssma/aso?sit=tox"><div class="n">${p.tox_vencendo || 0}</div><div class="r">motorista(s) com toxicológico a fazer</div></a>
      <a class="cartao kpi ${p.ssma_acoes_atrasadas ? 'alerta' : ''}" href="#/ssma/acoes"><div class="n">${p.ssma_acoes_atrasadas || 0}</div><div class="r">ações atrasadas (de ${acs.length} abertas)</div></a>
      <a class="cartao kpi ${p.extintores_vencendo ? 'alerta' : ''}" href="#/ssma/extintores"><div class="n">${p.extintores_vencendo || 0}</div><div class="r">extintor(es) vencendo em 30 dias</div></a>
      <div class="cartao kpi"><div class="n">${doAno.length}</div><div class="r">ocorrências em ${ano} (${doAno.filter(a => a.tipo === 'quase_acidente').length} quase-acidentes)</div></div>
    </div>
    <div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(340px,1fr))">
      <div class="cartao"><h2>Acidentes em aberto</h2>${cats.length ? `<ul class="lista-simples">${cats.map(a => `<li class="clicavel" onclick="location.hash='#/ssma/acidentes/ver/${a.id}'"><span><b>${esc(a.numero)}</b> ${esc(a.c?.nome || TIPO_ACI[a.tipo])}<div class="muted">${dataHoraBR(a.data_hora)} · ${esc(TIPO_ACI[a.tipo])}</div></span>
        <span>${a.cat_necessaria && !a.cat_numero ? `<span class="tag vermelho">CAT até ${dataBR(a.cat_prazo)}</span>` : ''} ${tagSt(ST_ACI, a.status)}</span></li>`).join('')}</ul>` : '<div class="vazio">Nenhum acidente em aberto.</div>'}</div>
      <div class="cartao"><h2>Plano de ação</h2>${acs.length ? `<ul class="lista-simples">${acs.slice(0, 12).map(a => `<li><span>${esc(a.descricao)}<div class="muted">${esc(a.u?.nome || 'sem responsável')}${a.prazo ? ' · prazo ' + dataBR(a.prazo) : ''}</div></span>${a.prazo && a.prazo < hojeISO() ? '<span class="tag vermelho">Atrasada</span>' : tagSt(ST_ACAO, a.status)}</li>`).join('')}</ul><a class="btn peq" href="#/ssma/acoes">Ver todas</a>` : '<div class="vazio">Nenhuma ação aberta.</div>'}</div>
    </div>
    ${avisoLei('cat', 'prevencao')}`;
});

// ===================== ASO e toxicológico =====================
rota('/ssma/aso', async tela => {
  const sit = estado.params.get('sit') || '';
  let ls = await api.listar('v_aso_situacao', 'order=nome');
  if (sit === 'pendentes') ls = ls.filter(l => l.situacao !== 'em_dia'); else if (sit === 'tox') ls = ls.filter(l => l.motorista && (!l.tox_proximo || l.tox_proximo <= somaDias(hojeISO(), 30))); else if (sit) ls = ls.filter(l => l.situacao === sit);
  tela.innerHTML = `
    <div class="topo"><div><h1>ASO e exames</h1><p class="sub">${ls.length} colaborador(es)</p></div>${editaSSMA() || tem('rh') ? '<button class="btn prim" id="novo-ex">+ Registrar exame</button>' : ''}</div>
    <form class="filtros" id="filtros"><select name="sit"><option value="">Todos</option><option value="pendentes" ${sit === 'pendentes' ? 'selected' : ''}>Com pendência</option>${Object.entries(SIT_ASO).map(([k, [t]]) => `<option value="${k}" ${k === sit ? 'selected' : ''}>${t}</option>`).join('')}<option value="tox" ${sit === 'tox' ? 'selected' : ''}>Motoristas: toxicológico a fazer</option></select><button class="btn">Filtrar</button></form>
    <div class="cartao">${ls.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Colaborador</th><th>Último ASO</th><th>Resultado</th><th>Próximo</th><th>Situação</th><th>Toxicológico</th><th></th></tr></thead><tbody>
      ${ls.map(l => `<tr><td data-r="Colaborador"><b>${esc(l.nome)}</b><div class="muted">${esc(l.cargo || '')}${l.status === 'em_admissao' ? ' · em admissão' : ''}</div></td>
        <td data-r="Último ASO">${l.aso_data ? dataBR(l.aso_data) + ' · ' + esc(TIPO_EXAME[l.aso_tipo] || '') : '—'}</td><td data-r="Resultado">${l.aso_resultado ? tagSt(RES_EXAME, l.aso_resultado) : '—'}${l.restricoes ? `<div class="muted">${esc(l.restricoes)}</div>` : ''}</td>
        <td data-r="Próximo">${dataBR(l.aso_proximo) || '—'}</td><td data-r="Situação">${tagSt(SIT_ASO, l.situacao)}</td>
        <td data-r="Toxicológico">${l.motorista ? (l.tox_data ? `${dataBR(l.tox_data)} · próximo ${dataBR(l.tox_proximo)}${l.tox_proximo <= somaDias(hojeISO(), 30) ? ' <span class="tag vermelho">a fazer</span>' : ''}` : '<span class="tag vermelho">sem registro</span>') : '<span class="muted">não se aplica</span>'}</td>
        <td><button class="btn peq" data-hist="${l.colaborador_id}">Histórico</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Ninguém nesta situação.</div>'}</div>
    ${avisoLei('aso')}`;
  $('#filtros').onsubmit = e => { e.preventDefault(); location.hash = '#/ssma/aso?sit=' + formDados(e.target).sit; };
  $('#novo-ex')?.addEventListener('click', () => formExame());
  $$('[data-hist]', tela).forEach(b => b.onclick = () => historicoExames(b.dataset.hist));
});
async function formExame(colabId = null) {
  const [cs, fs] = await Promise.all([colabsBasico(), cad('fornecedores', 'select=id,razao_social,ativo&order=razao_social')]);
  const r = await modal(`<form><h2>Registrar exame</h2><div class="form">
    <label class="campo largo">Colaborador *<select name="colab" required><option value="">Selecione…</option>${cs.map(c => `<option value="${c.id}" ${c.id === colabId ? 'selected' : ''}>${esc(c.nome)}${c.cargo ? ' · ' + esc(c.cargo) : ''}</option>`).join('')}</select></label>
    <label class="campo">Tipo *<select name="tipo">${Object.entries(TIPO_EXAME).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></label>
    <label class="campo">Data do exame *<input type="date" name="data" required value="${hojeISO()}"></label>
    <label class="campo">Resultado<select name="resultado"></select></label>
    <label class="campo" id="b-val">Validade (meses)<input type="number" name="validade" placeholder="padrão: 12 (PCMSO)"></label>
    <label class="campo largo" id="b-rest">Restrições<input name="restricoes" placeholder="Ex.: não trabalhar em altura por 60 dias"></label>
    <label class="campo">Médico<input name="medico"></label><label class="campo">CRM<input name="crm"></label>
    <label class="campo">Clínica<select name="clinica_id"><option value="">—</option>${fs.filter(f => f.ativo).map(f => `<option value="${f.id}">${esc(f.razao_social)}</option>`).join('')}</select></label>
    <label class="campo">Custo (R$)<input name="custo" inputmode="decimal"></label>
    <label class="campo largo">Exames complementares<input name="compl" placeholder="Ex.: audiometria, acuidade visual, glicemia"></label>
    <label class="campo largo">ASO / laudo (arquivo)<input type="file" name="arquivos" accept="image/*,application/pdf"></label></div>
    <p class="muted">Registre só o resultado do ASO (apto/inapto e restrições). Não anote diagnósticos: eles são sigilosos.</p>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`,
    { aoAbrir: raiz => { const f = $('form', raiz); const s = () => { const tox = f.tipo.value === 'toxicologico';
        f.resultado.innerHTML = (tox ? ['negativo', 'positivo', 'pendente'] : ['apto', 'apto_restricao', 'inapto']).map(k => `<option value="${k}">${RES_EXAME[k][0]}</option>`).join('');
        f.validade.placeholder = tox ? 'padrão: 30 (CTB art. 148-A)' : 'padrão: 12 (PCMSO)'; $('#b-val', raiz).hidden = ['demissional', 'monitoracao_pontual'].includes(f.tipo.value); sr(); };
      const sr = () => { $('#b-rest', raiz).hidden = f.resultado.value !== 'apto_restricao'; };
      f.tipo.onchange = s; f.resultado.onchange = sr; s(); },
      validar: d => d.resultado === 'apto_restricao' && !d.restricoes ? 'Descreva as restrições.' : null });
  if (!r) return;
  try { const [x] = await api.inserir('exames_ocupacionais', { colaborador_id: r.colab, tipo: r.tipo, data_exame: r.data, resultado: r.resultado, restricoes: r.restricoes || null, validade_meses: r.validade ? Number(r.validade) : null,
      medico: r.medico || null, crm: r.crm || null, clinica_id: r.clinica_id || null, custo: num(r.custo), exames_complementares: r.compl || null });
    if (r.arquivos?.length) await anexar('exame_ocupacional', x.id, r.arquivos);
    aviso(r.resultado === 'inapto' ? 'Exame registrado. Colaborador INAPTO: não pode exercer a função. Avise o gestor e o RH.' : r.resultado === 'positivo' ? 'Registrado. Toxicológico positivo: o motorista não deve dirigir. Procure o RH e o jurídico antes de qualquer medida.' : 'Exame registrado.', ['inapto', 'positivo'].includes(r.resultado));
    navegar(); } catch (err) { falha(err); }
}
async function historicoExames(colabId) {
  const xs = await api.listar('exames_ocupacionais', `colaborador_id=eq.${colabId}&ativo=eq.true&select=*,cl:fornecedores(razao_social)&order=data_exame.desc`);
  const anx = {}; await Promise.all(xs.map(async x => (anx[x.id] = await htmlAnexos('exame_ocupacional', x.id))));
  await modal(`<form><h2>Histórico de exames</h2>${xs.length ? `<ul class="lista-simples">${xs.map(x => `<li style="flex-wrap:wrap"><span><b>${TIPO_EXAME[x.tipo]}</b> · ${dataBR(x.data_exame)} ${tagSt(RES_EXAME, x.resultado)}
      <div class="muted">${esc([x.restricoes, x.medico && 'Dr(a). ' + x.medico + (x.crm ? ' CRM ' + x.crm : ''), x.cl?.razao_social, x.proximo_exame && 'próximo ' + dataBR(x.proximo_exame)].filter(Boolean).join(' · '))}</div></span><span>${anx[x.id]}</span></li>`).join('')}</ul>` : '<p class="muted">Nenhum exame registrado.</p>'}
    <div class="rodape">${editaSSMA() || tem('rh') ? '<button class="btn" value="novo">+ Registrar exame</button><button class="btn" value="enc">Gerar encaminhamento</button>' : ''}<button type="button" class="btn prim" data-fechar>Fechar</button></div></form>`).then(async r => {
    if (r?._acao === 'novo') formExame(colabId);
    if (r?._acao === 'enc') { const m = await modeloPorCodigo('RH-FOR-001'); if (m) gerarDocumento(m, colabId); else aviso('Modelo de encaminhamento não encontrado.', true); } });
}

// ===================== Acidentes =====================
rota('/ssma/acidentes', async tela => {
  const st = estado.params.get('status') || '';
  const as = await api.listar('acidentes', `ativo=eq.true${st ? '&status=eq.' + st : ''}&select=*,c:colaboradores(nome)&order=data_hora.desc&limit=300`);
  tela.innerHTML = `
    <div class="topo"><div><h1>Acidentes e incidentes</h1><p class="sub">${as.length} registro(s)</p></div><a class="btn prim" href="#/ssma/acidentes/novo">Comunicar acidente</a></div>
    <form class="filtros" id="filtros"><select name="status"><option value="">Todos</option>${Object.entries(ST_ACI).map(([k, [t]]) => `<option value="${k}" ${k === st ? 'selected' : ''}>${t}</option>`).join('')}</select><button class="btn">Filtrar</button></form>
    <div class="cartao">${as.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nº</th><th>Data</th><th>Tipo</th><th>Acidentado</th><th>Gravidade</th><th>CAT</th><th>Situação</th></tr></thead><tbody>
      ${as.map(a => `<tr class="clicavel" onclick="location.hash='#/ssma/acidentes/ver/${a.id}'"><td data-r="Nº" class="mono"><b>${esc(a.numero)}</b></td><td data-r="Data">${dataHoraBR(a.data_hora)}</td><td data-r="Tipo">${esc(TIPO_ACI[a.tipo])}</td>
        <td data-r="Acidentado">${esc(a.c?.nome || '—')}</td><td data-r="Gravidade">${tagSt(GRAV_ACI, a.gravidade)}</td>
        <td data-r="CAT">${a.cat_necessaria ? (a.cat_numero ? '<span class="tag verde">' + esc(a.cat_numero) + '</span>' : `<span class="tag vermelho">pendente · até ${dataBR(a.cat_prazo)}</span>`) : '<span class="muted">não exige</span>'}</td>
        <td data-r="Situação">${tagSt(ST_ACI, a.status)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Nenhum registro.</div>'}</div>
    ${avisoLei('cat')}`;
  $('#filtros').onsubmit = e => { e.preventDefault(); location.hash = '#/ssma/acidentes?status=' + formDados(e.target).status; };
});
rota('/ssma/acidentes/novo', async tela => {
  const [cs, eqs] = await Promise.all([colabsBasico(), api.listar('equipamentos', 'select=id,codigo_frota,tipo,tipo_outro,marca,modelo&ativo=eq.true&order=codigo_frota').catch(() => [])]);
  tela.innerHTML = `<div class="topo"><div><h1>Comunicar acidente ou quase-acidente</h1><p class="sub">Comunique na hora. Quase-acidentes também: são eles que evitam o próximo acidente.</p></div></div>
    <div class="cartao alerta-obs">🚑 Se há ferido, <b>primeiro socorra</b> (SAMU 192 · Bombeiros 193). Depois registre aqui.</div>
    <form id="f-aci" class="cartao"><div class="form">
      <label class="campo">Data e hora *<input type="datetime-local" name="quando" required></label>
      <label class="campo largo">O que aconteceu? (tipo) *<select name="tipo" required>${Object.entries(TIPO_ACI).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></label>
      <label class="campo">Gravidade<select name="gravidade">${Object.entries(GRAV_ACI).map(([k, [t]]) => `<option value="${k}" ${k === 'sem_afastamento' ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo largo">Acidentado<select name="colaborador_id"><option value="">Ninguém se feriu / não se aplica</option>${cs.map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join('')}</select></label>
      <label class="campo largo">Local *<input name="local" required placeholder="Ex.: pátio, oficina, Rodovia BR-262 km 30"></label>
      <label class="campo">Equipamento / veículo envolvido<select name="equipamento_id"><option value="">—</option>${eqs.map(e => `<option value="${e.id}">${esc(rotuloEq(e))}</option>`).join('')}</select></label>
      <label class="campo largo">Descrição *<textarea name="descricao" rows="4" required placeholder="O que a pessoa fazia, o que aconteceu, como aconteceu"></textarea></label>
      <label class="campo">Parte do corpo atingida<input name="parte_corpo"></label><label class="campo">Natureza da lesão<input name="natureza_lesao" placeholder="corte, torção, fratura…"></label>
      <label class="campo">Agente causador<input name="agente_causador" placeholder="ferramenta, máquina, piso…"></label><label class="campo">Atendimento<input name="atendimento" placeholder="primeiros socorros, UPA, hospital…"></label>
      <label class="campo largo">Testemunhas<input name="testemunhas"></label>
      <label class="campo largo">Fotos, atestado, boletim de ocorrência<input type="file" name="arquivos" multiple accept="image/*,application/pdf"></label></div>
      <div id="b-cat"></div>
      <div class="acoes"><button class="btn prim">Comunicar</button><a class="btn" href="javascript:history.back()">Cancelar</a></div></form>
    ${avisoLei('cat')}`;
  const f = $('#f-aci'); const agora = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16); f.quando.value = agora;
  const s = () => { const precisa = f.colaborador_id.value && ['tipico', 'trajeto', 'doenca_ocupacional', 'transito'].includes(f.tipo.value) && f.gravidade.value !== 'sem_lesao';
    $('#b-cat').innerHTML = precisa ? `<p class="alerta-obs">📄 Este caso exige <b>CAT</b>${f.gravidade.value === 'fatal' ? ' <b>imediatamente</b>' : ' até o <b>1º dia útil seguinte</b>'} (Lei 8.213, art. 22). O SSMA/RH será avisado.</p>` : ''; };
  ['tipo', 'gravidade', 'colaborador_id'].forEach(n => f[n].addEventListener('change', s)); s();
  f.onsubmit = async e => { e.preventDefault(); const d = formDados(f);
    await ocupado(e.submitter, async () => { try {
      const [a] = await api.inserir('acidentes', { data_hora: new Date(d.quando).toISOString(), tipo: d.tipo, gravidade: d.gravidade, colaborador_id: d.colaborador_id || null, local: d.local, equipamento_id: d.equipamento_id || null,
        descricao: d.descricao, parte_corpo: d.parte_corpo || null, natureza_lesao: d.natureza_lesao || null, agente_causador: d.agente_causador || null, atendimento: d.atendimento || null, testemunhas: d.testemunhas || null });
      if (d.arquivos?.length) await anexar('acidente', a.id, d.arquivos);
      aviso(`Comunicado ${a.numero} registrado.${a.cat_necessaria ? ' CAT até ' + dataBR(a.cat_prazo) + '.' : ''}`); location.hash = editaSSMA() ? '#/ssma/acidentes/ver/' + a.id : '#/inicio';
    } catch (err) { falha(err); } }); };
});
rota('/ssma/acidentes/ver/:id', async (tela, id) => {
  const a = await api.um('acidentes', `id=eq.${id}&select=*,c:colaboradores(id,nome),e:equipamentos(codigo_frota,tipo,tipo_outro,marca,modelo)`);
  if (!a) { tela.innerHTML = '<div class="cartao vazio">Registro não encontrado.</div>'; return; }
  const [acs, us] = await Promise.all([api.listar('ssma_acoes', `origem=eq.acidente&origem_id=eq.${id}&ativo=eq.true&select=*,u:usuarios(nome)&order=prazo`), usuarios()]);
  const ed = editaSSMA();
  tela.innerHTML = `
    <div class="topo"><div><h1>${esc(a.numero)} · ${esc(TIPO_ACI[a.tipo])}</h1><p class="sub">${dataHoraBR(a.data_hora)} · ${tagSt(GRAV_ACI, a.gravidade)} ${tagSt(ST_ACI, a.status)}${a.c ? ' · ' + esc(a.c.nome) : ''}</p></div>
      <div class="acoes">${ed ? '<button class="btn prim" id="investigar">Investigação e CAT</button>' : ''}<button class="btn" id="relatorio">Relatório</button><a class="btn" href="#/ssma/acidentes">Voltar</a></div></div>
    ${a.cat_necessaria && !a.cat_numero ? `<div class="cartao alerta-obs">📄 <b>CAT pendente</b> — prazo: ${dataBR(a.cat_prazo)}${a.cat_prazo < hojeISO() ? ' (<b>vencido</b>)' : ''}. Emita pelo eSocial (S-2210) e registre o número em “Investigação e CAT”.</div>` : ''}
    <div class="cartao"><div class="form">
      <div class="largo"><div class="muted">Descrição</div><div style="white-space:pre-line"><b>${esc(a.descricao)}</b></div></div>
      ${[['Local', a.local], ['Equipamento', a.e && rotuloEq(a.e)], ['Lesão', [a.parte_corpo, a.natureza_lesao].filter(Boolean).join(' · ')], ['Agente causador', a.agente_causador], ['Atendimento', a.atendimento], ['Testemunhas', a.testemunhas],
        ['CAT', a.cat_necessaria ? (a.cat_numero ? a.cat_numero + ' em ' + dataBR(a.cat_emitida_em) : 'pendente') : 'não exige'], ['Afastamento', a.afastamento_dias ? a.afastamento_dias + ' dia(s) desde ' + dataBR(a.afastamento_inicio) + (a.beneficio_inss ? ' · ' + a.beneficio_inss : '') : ''],
        ['Retorno', dataBR(a.retorno_em)], ['Estabilidade', a.afastamento_dias > 15 && a.retorno_em ? 'até ' + dataBR(somaDias(a.retorno_em, 365)) + ' (art. 118)' : '']]
        .map(([k, v]) => `<div><div class="muted">${k}</div><b>${v ? esc(v) : '—'}</b></div>`).join('')}
      ${a.causas ? `<div class="largo"><div class="muted">Causas</div><div style="white-space:pre-line">${esc(a.causas)}</div></div>` : ''}
      ${a.licoes ? `<div class="largo"><div class="muted">Lições aprendidas</div><div style="white-space:pre-line">${esc(a.licoes)}</div></div>` : ''}
      <div class="largo" id="anx-aci"></div></div></div>
    <div class="cartao"><div class="topo" style="margin:0 0 8px"><h2 style="margin:0">Plano de ação</h2>${ed ? '<button class="btn peq prim" id="nova-acao">+ Ação</button>' : ''}</div>
      ${acs.length ? `<ul class="lista-simples">${acs.map(x => `<li><span>${esc(x.descricao)}<div class="muted">${esc(x.u?.nome || '')}${x.prazo ? ' · prazo ' + dataBR(x.prazo) : ''}${x.evidencia ? ' · ' + esc(x.evidencia) : ''}</div></span>${tagSt(ST_ACAO, x.status)}</li>`).join('')}</ul>` : '<div class="vazio">Nenhuma ação registrada.</div>'}</div>
    ${avisoLei('cat')}`;
  $('#anx-aci').innerHTML = await htmlAnexos('acidente', id);
  $('#nova-acao')?.addEventListener('click', () => formAcao('acidente', id, us));
  $('#investigar')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Investigação e CAT · ${esc(a.numero)}</h2><div class="form">
      <label class="campo">Gravidade<select name="gravidade">${Object.entries(GRAV_ACI).map(([k, [t]]) => `<option value="${k}" ${k === a.gravidade ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo">Situação<select name="status">${Object.entries(ST_ACI).map(([k, [t]]) => `<option value="${k}" ${k === a.status ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      ${a.cat_necessaria ? `<label class="campo">Nº da CAT<input name="cat_numero" value="${esc(a.cat_numero || '')}"></label><label class="campo">Emitida em<input type="date" name="cat_emitida_em" value="${a.cat_emitida_em || ''}"></label>` : ''}
      <label class="campo">Início do afastamento<input type="date" name="afastamento_inicio" value="${a.afastamento_inicio || ''}"></label><label class="campo">Dias de afastamento<input type="number" name="afastamento_dias" value="${a.afastamento_dias ?? ''}"></label>
      <label class="campo">Benefício INSS<input name="beneficio_inss" value="${esc(a.beneficio_inss || '')}" placeholder="Ex.: B91 (acidentário)"></label><label class="campo">Retorno ao trabalho<input type="date" name="retorno_em" value="${a.retorno_em || ''}"></label>
      <label class="campo largo">Causas (imediatas e básicas) — use os 5 porquês<textarea name="causas" rows="4">${esc(a.causas || '')}</textarea></label>
      <label class="campo largo">Lições aprendidas<textarea name="licoes" rows="2">${esc(a.licoes || '')}</textarea></label></div>
      <p class="muted">Afastamento de 30 dias ou mais exige ASO de retorno antes de voltar à função (NR-7). Retorno após mais de 15 dias de afastamento acidentário gera estabilidade de 12 meses.</p>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`);
    if (!r) return;
    try { await api.alterar('acidentes', `id=eq.${id}`, { gravidade: r.gravidade, status: r.status, cat_numero: r.cat_numero || null, cat_emitida_em: r.cat_emitida_em || null, afastamento_inicio: r.afastamento_inicio || null,
        afastamento_dias: r.afastamento_dias ? Number(r.afastamento_dias) : null, beneficio_inss: r.beneficio_inss || null, retorno_em: r.retorno_em || null, causas: r.causas || null, licoes: r.licoes || null });
      aviso('Salvo.'); navegar(); } catch (err) { falha(err); } });
  $('#relatorio').onclick = async () => { const m = await modeloPorCodigo('SSMA-ACI-001'); if (!m) return aviso('Modelo não encontrado.', true);
    await gerarDocumento(m, a.colaborador_id, { acidente: { numero: a.numero, data_hora: dataHoraBR(a.data_hora), tipo: TIPO_ACI[a.tipo], gravidade: GRAV_ACI[a.gravidade][0], local: a.local || '',
      descricao_html: htmlTexto(a.descricao), lesao: [a.parte_corpo, a.natureza_lesao].filter(Boolean).join(' · '), agente_causador: a.agente_causador || '', testemunhas: a.testemunhas || '',
      cat: a.cat_necessaria ? (a.cat_numero ? a.cat_numero + ' em ' + dataBR(a.cat_emitida_em) : 'pendente') : 'não exige', causas_html: htmlTexto(a.causas) || '<br><br><br>', licoes_html: htmlTexto(a.licoes) || '<br><br>',
      tabela_acoes: `<table border="1" cellpadding="5" style="border-collapse:collapse;width:100%;font-size:12px"><tr><th>Ação</th><th>Responsável</th><th>Prazo</th><th>Situação</th></tr>${acs.map(x => `<tr><td>${esc(x.descricao)}</td><td>${esc(x.u?.nome || '')}</td><td>${dataBR(x.prazo)}</td><td>${ST_ACAO[x.status][0]}</td></tr>`).join('') || '<tr><td>&nbsp;</td><td></td><td></td><td></td></tr>'.repeat(4)}</table>` } }); };
});
async function formAcao(origem, origemId, us, x = null) {
  const r = await modal(`<form><h2>${x ? 'Ação' : 'Nova ação'}</h2><div class="form">
    <label class="campo largo">O que fazer *<textarea name="descricao" rows="2" required>${esc(x?.descricao || '')}</textarea></label>
    <label class="campo">Responsável<select name="resp">${opcoes((us || []).filter(u => u.ativo), null, u => u.nome, x?.responsavel_id, '—')}</select></label>
    <label class="campo">Prazo<input type="date" name="prazo" value="${x?.prazo || somaDias(hojeISO(), 15)}"></label>
    ${x ? `<label class="campo">Situação<select name="status">${Object.entries(ST_ACAO).map(([k, [t]]) => `<option value="${k}" ${k === x.status ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <label class="campo largo">Evidência (o que foi feito)<input name="evidencia" value="${esc(x.evidencia || '')}"></label>` : ''}</div>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`,
    { validar: d => d.status === 'concluida' && !d.evidencia ? 'Descreva a evidência de que a ação foi feita.' : null });
  if (!r) return;
  try { const dados = { descricao: r.descricao, responsavel_id: r.resp || null, prazo: r.prazo || null };
    if (x) await api.alterar('ssma_acoes', `id=eq.${x.id}`, { ...dados, status: r.status, evidencia: r.evidencia || null }); else await api.inserir('ssma_acoes', { ...dados, origem, origem_id: origemId });
    aviso('Ação salva.'); navegar(); } catch (err) { falha(err); }
}
rota('/ssma/acoes', async tela => {
  const st = estado.params.get('status') || 'todas';
  const [as, us] = await Promise.all([api.listar('ssma_acoes', `ativo=eq.true${st === 'abertas' ? '&status=in.(aberta,em_andamento)' : ''}&select=*,u:usuarios(nome)&order=prazo.nullslast`), usuarios()]);
  const ORIG = { acidente: ['Acidente', '#/ssma/acidentes/ver/'], inspecao: ['Inspeção', '#/ssma/inspecoes/ver/'], dds: ['DDS', '#/ssma/dds'], avulsa: ['Avulsa', null] };
  tela.innerHTML = `<div class="topo"><div><h1>Plano de ação</h1><p class="sub">${as.length} ação(ões)</p></div>${editaSSMA() ? '<button class="btn prim" id="nova">+ Ação</button>' : ''}</div>
    <form class="filtros" id="filtros"><select name="status"><option value="abertas">Em aberto</option><option value="todas" ${st === 'todas' ? 'selected' : ''}>Todas</option></select><button class="btn">Filtrar</button></form>
    <div class="cartao">${as.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Ação</th><th>Origem</th><th>Responsável</th><th>Prazo</th><th>Situação</th><th></th></tr></thead><tbody>
      ${as.map(a => `<tr><td data-r="Ação">${esc(a.descricao)}${a.evidencia ? `<div class="muted">✔ ${esc(a.evidencia)}</div>` : ''}</td>
        <td data-r="Origem">${ORIG[a.origem][1] && a.origem_id ? `<a href="${ORIG[a.origem][1]}${a.origem === 'dds' ? '' : a.origem_id}">${ORIG[a.origem][0]}</a>` : ORIG[a.origem][0]}</td><td data-r="Responsável">${esc(a.u?.nome || '—')}</td>
        <td data-r="Prazo">${dataBR(a.prazo) || '—'}${a.prazo && a.prazo < hojeISO() && ['aberta', 'em_andamento'].includes(a.status) ? ' <span class="tag vermelho">atrasada</span>' : ''}</td><td data-r="Situação">${tagSt(ST_ACAO, a.status)}</td>
        <td>${editaSSMA() || a.responsavel_id === estado.usuario.id ? `<button class="btn peq" data-ed="${a.id}">Atualizar</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Nenhuma ação.</div>'}</div>`;
  $('#filtros').onsubmit = e => { e.preventDefault(); location.hash = '#/ssma/acoes?status=' + formDados(e.target).status; };
  $('#nova')?.addEventListener('click', () => formAcao('avulsa', null, us));
  $$('[data-ed]', tela).forEach(b => b.onclick = () => formAcao(null, null, us, as.find(x => x.id === b.dataset.ed)));
});

// ===================== Inspeções =====================
rota('/ssma/inspecoes', async tela => {
  const is = await api.listar('ssma_inspecoes', 'ativo=eq.true&select=*,u:usuarios(nome),e:equipamentos(codigo_frota)&order=data.desc&limit=200');
  tela.innerHTML = `<div class="topo"><div><h1>Inspeções de segurança</h1><p class="sub">${is.length} inspeção(ões)</p></div>${editaSSMA() ? '<a class="btn prim" href="#/ssma/inspecoes/nova">+ Nova inspeção</a>' : ''}</div>
    <div class="cartao">${is.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nº</th><th>Data</th><th>Tipo</th><th>Local</th><th>Inspetor</th><th class="num">Conformidade</th></tr></thead><tbody>
      ${is.map(i => { const tot = i.conformes + i.nao_conformes, pct = tot ? Math.round(100 * i.conformes / tot) : null;
        return `<tr class="clicavel" onclick="location.hash='#/ssma/inspecoes/ver/${i.id}'"><td data-r="Nº" class="mono"><b>${esc(i.numero)}</b></td><td data-r="Data">${dataBR(i.data)}</td><td data-r="Tipo">${esc(i.tipo)}</td>
        <td data-r="Local">${esc([i.local, i.e?.codigo_frota].filter(Boolean).join(' · ') || '—')}</td><td data-r="Inspetor">${esc(i.u?.nome || '')}</td>
        <td data-r="Conformidade" class="num">${pct == null ? '—' : `<span class="tag ${pct >= 90 ? 'verde' : pct >= 70 ? 'amarelo' : 'vermelho'}">${pct}%</span> <span class="muted">${i.nao_conformes} NC</span>`}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="vazio">Nenhuma inspeção.</div>'}</div>
    ${avisoLei('prevencao')}`;
});
rota('/ssma/inspecoes/nova', async tela => {
  if (!editaSSMA()) { tela.innerHTML = '<div class="cartao vazio">Sem permissão.</div>'; return; }
  const [ss, eqs] = await Promise.all([setoresL().catch(() => []), api.listar('equipamentos', 'select=id,codigo_frota,tipo,tipo_outro,marca,modelo&ativo=eq.true&order=codigo_frota').catch(() => [])]);
  tela.innerHTML = `<div class="topo"><div><h1>Nova inspeção</h1><p class="sub">Itens “Não conforme” viram ações no plano de ação, com prazo de 15 dias</p></div></div>
    <form id="f-ins" class="cartao"><div class="form">
      <label class="campo">Tipo<select name="tipo" data-sem-outro>${Object.keys(INSP_MODELOS).map(t => `<option>${t}</option>`).join('')}<option value="_livre">Outro (itens livres)</option></select></label>
      <label class="campo" id="b-tipo-livre" hidden>Nome do tipo<input name="tipo_livre"></label>
      <label class="campo">Data<input type="date" name="data" value="${hojeISO()}"></label>
      <label class="campo">Local<input name="local"></label>
      <label class="campo">Setor<select name="setor_id"><option value="">—</option>${ss.filter(s => s.ativo).map(s => `<option value="${s.id}">${esc(s.nome)}</option>`).join('')}</select></label>
      <label class="campo">Equipamento<select name="equipamento_id"><option value="">—</option>${eqs.map(e => `<option value="${e.id}">${esc(rotuloEq(e))}</option>`).join('')}</select></label></div>
      <table class="tabela-notas" style="margin-top:10px"><tbody id="itens"></tbody></table>
      <button type="button" class="btn peq" id="mais-item">+ Item</button>
      <label class="campo" style="margin-top:8px">Observações<textarea name="observacao" rows="2"></textarea></label>
      <label class="campo">Fotos<input type="file" name="arquivos" multiple accept="image/*"></label>
      <div class="acoes"><button class="btn prim">Salvar inspeção</button><a class="btn" href="#/ssma/inspecoes">Cancelar</a></div></form>`;
  const f = $('#f-ins'), tb = $('#itens'); let k = 0;
  const linha = (t = '') => `<tr><td><input name="it_${k}" value="${esc(t)}" placeholder="Item a verificar" style="min-width:220px"></td>
    <td class="chk-op"><label><input type="radio" name="c_${k}" value="1"> Conforme</label><label><input type="radio" name="c_${k}" value="0"> Não conforme</label><label><input type="radio" name="c_${k++}" value="" checked> N/A</label></td>
    <td><input name="o_${k - 1}" placeholder="Observação"></td></tr>`;
  const carregar = () => { const t = f.tipo.value; $('#b-tipo-livre').hidden = t !== '_livre'; k = 0; tb.innerHTML = (INSP_MODELOS[t] || ['', '', '']).map(linha).join(''); };
  f.tipo.onchange = carregar; carregar(); $('#mais-item').onclick = () => tb.insertAdjacentHTML('beforeend', linha());
  f.onsubmit = async e => { e.preventDefault(); const d = formDados(f);
    const itens = []; for (let i = 0; i < k; i++) if (d['it_' + i]) itens.push({ item: d['it_' + i], conforme: d['c_' + i] === '' || d['c_' + i] == null ? null : d['c_' + i] === '1', obs: d['o_' + i] || '' });
    if (!itens.length) return aviso('Inclua pelo menos um item.', true);
    if (itens.some(i => i.conforme === false && !i.obs)) return aviso('Descreva o problema nos itens não conformes.', true);
    await ocupado(e.submitter, async () => { try {
      const [x] = await api.inserir('ssma_inspecoes', { tipo: d.tipo === '_livre' ? (d.tipo_livre || 'Outro') : d.tipo, data: d.data, local: d.local || null, setor_id: d.setor_id || null, equipamento_id: d.equipamento_id || null, itens, observacao: d.observacao || null });
      if (d.arquivos?.length) await anexar('ssma_inspecao', x.id, d.arquivos);
      aviso(`Inspeção ${x.numero} salva${x.nao_conformes ? ` · ${x.nao_conformes} ação(ões) criada(s)` : ''}.`); location.hash = '#/ssma/inspecoes/ver/' + x.id;
    } catch (err) { falha(err); } }); };
});
rota('/ssma/inspecoes/ver/:id', async (tela, id) => {
  const i = await api.um('ssma_inspecoes', `id=eq.${id}&select=*,u:usuarios(nome),e:equipamentos(codigo_frota),s:setores(nome)`);
  if (!i) { tela.innerHTML = '<div class="cartao vazio">Inspeção não encontrada.</div>'; return; }
  const acs = await api.listar('ssma_acoes', `origem=eq.inspecao&origem_id=eq.${id}&ativo=eq.true&select=*,u:usuarios(nome)`);
  tela.innerHTML = `<div class="topo"><div><h1>${esc(i.numero)} · ${esc(i.tipo)}</h1><p class="sub">${esc([dataBR(i.data), i.local, i.s?.nome, i.e?.codigo_frota, i.u?.nome].filter(Boolean).join(' · '))}</p></div><a class="btn" href="#/ssma/inspecoes">Voltar</a></div>
    <div class="cartao"><ul class="lista-simples">${i.itens.map(x => `<li><span>${esc(x.item)}${x.obs ? `<div class="muted">${esc(x.obs)}</div>` : ''}</span>${x.conforme == null ? '<span class="tag">N/A</span>' : x.conforme ? '<span class="tag verde">Conforme</span>' : '<span class="tag vermelho">Não conforme</span>'}</li>`).join('')}</ul>
      ${i.observacao ? `<p style="white-space:pre-line">${esc(i.observacao)}</p>` : ''}<div id="anx-ins"></div></div>
    <div class="cartao"><h2>Ações geradas</h2>${acs.length ? `<ul class="lista-simples">${acs.map(a => `<li><span>${esc(a.descricao)}<div class="muted">${esc(a.u?.nome || '')} · prazo ${dataBR(a.prazo)}</div></span>${tagSt(ST_ACAO, a.status)}</li>`).join('')}</ul><a class="btn peq" href="#/ssma/acoes">Atualizar no plano de ação</a>` : '<div class="vazio">Nenhuma não conformidade. 👍</div>'}</div>`;
  $('#anx-ins').innerHTML = await htmlAnexos('ssma_inspecao', id);
});

// ===================== DDS =====================
rota('/ssma/dds', async tela => {
  const ds = await api.listar('ssma_dds', 'ativo=eq.true&select=*,ps:ssma_dds_participantes(count)&order=data.desc&limit=200');
  tela.innerHTML = `<div class="topo"><div><h1>DDS — Diálogo diário de segurança</h1><p class="sub">${ds.length} registro(s)</p></div>${editaSSMA() ? '<a class="btn prim" href="#/ssma/dds/novo">+ Novo DDS</a>' : ''}</div>
    <div class="cartao">${ds.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Data</th><th>Tema</th><th>Ministrante</th><th class="num">Participantes</th><th></th></tr></thead><tbody>
      ${ds.map(d => `<tr><td data-r="Data">${dataBR(d.data)}</td><td data-r="Tema"><b>${esc(d.tema)}</b></td><td data-r="Ministrante">${esc(d.ministrante || '')}</td><td data-r="Participantes" class="num">${d.ps?.[0]?.count ?? 0}</td>
        <td><button class="btn peq" data-lista="${d.id}">Lista de presença</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Nenhum DDS registrado.</div>'}</div>
    ${avisoLei('prevencao')}`;
  $$('[data-lista]', tela).forEach(b => b.onclick = () => listaDDS(ds.find(d => d.id === b.dataset.lista)));
});
async function listaDDS(d) {
  const ps = await api.listar('ssma_dds_participantes', `dds_id=eq.${d.id}&ativo=eq.true&select=c:colaboradores(nome,matricula)`);
  const m = await modeloPorCodigo('SSMA-DDS-001'); if (!m) return aviso('Modelo não encontrado.', true);
  await gerarDocumento(m, null, { dds: { data: dataBR(d.data), local: d.local || '', duracao: d.duracao_min || '', ministrante: d.ministrante || '', tema: d.tema, conteudo_html: htmlTexto(d.conteudo) || '',
    tabela_participantes: `<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;font-size:12px"><tr><th style="width:5%">#</th><th>Nome</th><th style="width:15%">Matrícula</th><th style="width:35%">Assinatura</th></tr>${ps.map((p, i) => `<tr><td>${i + 1}</td><td>${esc(p.c?.nome || '')}</td><td>${esc(p.c?.matricula || '')}</td><td></td></tr>`).join('')}${'<tr><td>&nbsp;</td><td></td><td></td><td></td></tr>'.repeat(Math.max(3, 15 - ps.length))}</table>` } });
}
rota('/ssma/dds/novo', async tela => {
  if (!editaSSMA()) { tela.innerHTML = '<div class="cartao vazio">Sem permissão.</div>'; return; }
  const cs = await colabsBasico();
  const setores = [...new Set(cs.map(c => c.setor).filter(Boolean))];
  tela.innerHTML = `<div class="topo"><div><h1>Novo DDS</h1><p class="sub">Registre o tema e quem participou. Depois gere a lista para assinatura.</p></div></div>
    <form id="f-dds" class="cartao"><div class="form">
      <label class="campo">Data<input type="date" name="data" value="${hojeISO()}"></label><label class="campo">Duração (min)<input type="number" name="duracao" value="15"></label>
      <label class="campo largo">Tema *<input name="tema" required list="temas-dds"><datalist id="temas-dds">${['Direção defensiva', 'Uso correto de EPI', 'Fadiga e sono ao volante', 'Amarração de carga', 'Ergonomia e levantamento de peso', 'Prevenção de incêndio', 'Trabalho em altura', 'Álcool e drogas', 'Celular ao volante', 'Descarte de resíduos'].map(t => `<option>${t}</option>`).join('')}</datalist></label>
      <label class="campo">Ministrante<input name="ministrante" value="${esc(estado.usuario.nome || '')}"></label><label class="campo">Local<input name="local"></label>
      <label class="campo largo">Conteúdo / pontos abordados<textarea name="conteudo" rows="4"></textarea></label></div>
      <h2 style="margin-top:12px">Participantes</h2>
      <div class="acoes" style="margin-bottom:6px">${setores.map(s => `<button type="button" class="btn peq" data-setor="${esc(s)}">+ ${esc(s)}</button>`).join('')}<button type="button" class="btn peq" id="todos">Marcar todos</button></div>
      <div class="grade" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:4px">${cs.map(c => `<label class="check"><input type="checkbox" name="p_${c.id}" data-setor="${esc(c.setor || '')}"> ${esc(c.nome)}</label>`).join('')}</div>
      <div class="acoes" style="margin-top:12px"><button class="btn prim">Salvar</button><a class="btn" href="#/ssma/dds">Cancelar</a></div></form>`;
  const f = $('#f-dds');
  $$('button[data-setor]', f).forEach(b => b.onclick = () => $$(`input[data-setor="${CSS.escape(b.dataset.setor)}"]`, f).forEach(i => (i.checked = true)));
  $('#todos').onclick = () => $$('input[type=checkbox]', f).forEach(i => (i.checked = true));
  f.onsubmit = async e => { e.preventDefault(); const d = formDados(f); const ids = cs.filter(c => d['p_' + c.id]).map(c => c.id);
    if (!ids.length) return aviso('Marque os participantes.', true);
    await ocupado(e.submitter, async () => { try {
      const [x] = await api.inserir('ssma_dds', { data: d.data, tema: d.tema, conteudo: d.conteudo || null, ministrante: d.ministrante || null, local: d.local || null, duracao_min: Number(d.duracao) || null });
      await api.inserir('ssma_dds_participantes', ids.map(id => ({ dds_id: x.id, colaborador_id: id })));
      aviso('DDS registrado.'); location.hash = '#/ssma/dds'; setTimeout(() => listaDDS(x), 400);
    } catch (err) { falha(err); } }); };
});

// ===================== Extintores =====================
rota('/ssma/extintores', async tela => {
  const xs = await api.listar('ssma_extintores', 'ativo=eq.true&select=*,e:equipamentos(codigo_frota)&order=identificacao');
  const lim = somaDias(hojeISO(), 30);
  const tagV = d => !d ? '—' : `${dataBR(d)} ${d < hojeISO() ? '<span class="tag vermelho">vencido</span>' : d <= lim ? '<span class="tag amarelo">vence logo</span>' : ''}`;
  tela.innerHTML = `<div class="topo"><div><h1>Extintores</h1><p class="sub">${xs.length} extintor(es)</p></div>${editaSSMA() || tem('manutencao') ? '<button class="btn prim" id="novo">+ Extintor</button>' : ''}</div>
    <div class="cartao">${xs.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Identificação</th><th>Agente / capacidade</th><th>Local</th><th>Recarga</th><th>Teste hidrostático</th><th>Última inspeção</th><th></th></tr></thead><tbody>
      ${xs.map(x => `<tr><td data-r="Identificação"><b>${esc(x.identificacao)}</b>${x.situacao !== 'ok' ? ` <span class="tag">${esc(x.situacao)}</span>` : ''}</td><td data-r="Agente">${esc([x.agente, x.capacidade].filter(Boolean).join(' · '))}</td>
        <td data-r="Local">${esc([x.local, x.e?.codigo_frota].filter(Boolean).join(' · ') || '—')}</td><td data-r="Recarga">${tagV(x.recarga_vencimento)}</td><td data-r="Teste hidrostático">${tagV(x.teste_hidrostatico_vencimento)}</td>
        <td data-r="Última inspeção">${dataBR(x.ultima_inspecao) || '—'}</td><td>${editaSSMA() ? `<button class="btn peq" data-insp="${x.id}">Inspecionado hoje</button> <button class="btn peq" data-ed="${x.id}">Editar</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Nenhum extintor cadastrado.</div>'}</div>
    ${avisoLei('extintores')}`;
  $('#novo')?.addEventListener('click', () => formExtintor());
  $$('[data-ed]', tela).forEach(b => b.onclick = () => formExtintor(xs.find(x => x.id === b.dataset.ed)));
  $$('[data-insp]', tela).forEach(b => b.onclick = async () => { try { await api.alterar('ssma_extintores', `id=eq.${b.dataset.insp}`, { ultima_inspecao: hojeISO() }); navegar(); } catch (err) { falha(err); } });
});
async function formExtintor(x = null) {
  const eqs = await api.listar('equipamentos', 'select=id,codigo_frota,tipo,tipo_outro,marca,modelo&ativo=eq.true&order=codigo_frota').catch(() => []);
  const r = await modal(`<form><h2>${x ? 'Editar extintor' : 'Novo extintor'}</h2><div class="form">
    <label class="campo">Identificação *<input name="identificacao" required value="${esc(x?.identificacao || '')}" placeholder="Ex.: EXT-01 ou nº do cilindro"></label>
    <label class="campo">Agente<select name="agente" data-valor="${esc(x?.agente || '')}">${AGENTES_EXT.map(a => `<option ${a === (x?.agente || 'PQS (BC)') ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
    <label class="campo">Capacidade<input name="capacidade" value="${esc(x?.capacidade || '')}" placeholder="6 kg"></label>
    <label class="campo">Local<input name="local" value="${esc(x?.local || '')}"></label>
    <label class="campo">Ou no veículo<select name="equipamento_id"><option value="">—</option>${eqs.map(e => `<option value="${e.id}" ${e.id === x?.equipamento_id ? 'selected' : ''}>${esc(rotuloEq(e))}</option>`).join('')}</select></label>
    <label class="campo">Vencimento da recarga<input type="date" name="recarga" value="${x?.recarga_vencimento || ''}"></label>
    <label class="campo">Vencimento do teste hidrostático<input type="date" name="teste" value="${x?.teste_hidrostatico_vencimento || ''}"></label>
    <label class="campo">Situação<select name="situacao">${[['ok', 'Em uso'], ['manutencao', 'Em manutenção'], ['baixado', 'Baixado']].map(([k, t]) => `<option value="${k}" ${k === (x?.situacao || 'ok') ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`);
  if (!r) return;
  const dados = { identificacao: r.identificacao, agente: r.agente, capacidade: r.capacidade || null, local: r.local || null, equipamento_id: r.equipamento_id || null, recarga_vencimento: r.recarga || null, teste_hidrostatico_vencimento: r.teste || null, situacao: r.situacao };
  try { if (x) await api.alterar('ssma_extintores', `id=eq.${x.id}`, dados); else await api.inserir('ssma_extintores', dados); aviso('Extintor salvo.'); navegar(); }
  catch (err) { falha(err.message.includes('duplicate') ? new Error('Já existe extintor com essa identificação.') : err); }
}

// ===================== Ficha do colaborador (RH) =====================
if (typeof ABAS_RH_EXTRA !== 'undefined') {
  ABAS_RH_EXTRA.ssma = async (box, c) => {
    const [xs, as, est] = await Promise.all([api.listar('exames_ocupacionais', `colaborador_id=eq.${c.id}&ativo=eq.true&order=data_exame.desc`).catch(() => []),
      api.listar('acidentes', `colaborador_id=eq.${c.id}&ativo=eq.true&order=data_hora.desc`).catch(() => []), api.listar('v_estabilidade_acidentaria', `colaborador_id=eq.${c.id}`).catch(() => [])]);
    box.innerHTML = `${est.length ? `<div class="alerta-obs" style="margin-bottom:10px">⚖️ <b>Estabilidade acidentária até ${dataBR(est[0].estavel_ate)}</b> (Lei 8.213, art. 118). Não dispense sem orientação do jurídico.</div>` : ''}
      <h2>Exames ocupacionais</h2>${xs.length ? `<ul class="lista-simples">${xs.map(x => `<li><span><b>${TIPO_EXAME[x.tipo]}</b> · ${dataBR(x.data_exame)}${x.restricoes ? ` <span class="muted">· ${esc(x.restricoes)}</span>` : ''}</span><span>${tagSt(RES_EXAME, x.resultado)}${x.proximo_exame ? ` <span class="muted">próximo ${dataBR(x.proximo_exame)}</span>` : ''}</span></li>`).join('')}</ul>` : '<p class="muted">Nenhum exame registrado.</p>'}
      <h2>Acidentes</h2>${as.length ? `<ul class="lista-simples">${as.map(a => `<li><span><a href="#/ssma/acidentes/ver/${a.id}"><b>${esc(a.numero)}</b></a> ${esc(TIPO_ACI[a.tipo])} · ${dataBR(a.data_hora)}</span>${tagSt(GRAV_ACI, a.gravidade)}</li>`).join('')}</ul>` : '<p class="muted">Nenhum acidente.</p>'}
      <div class="acoes">${editaSSMA() || tem('rh') ? '<button class="btn peq" id="aso-novo">+ Registrar exame</button>' : ''}<button class="btn peq" id="aso-enc">Encaminhamento para exame</button></div>`;
    $('#aso-novo', box)?.addEventListener('click', () => formExame(c.id));
    $('#aso-enc', box).onclick = async () => { const m = await modeloPorCodigo('RH-FOR-001'); if (m) gerarDocumento(m, c.id); };
  };
  // desligamento: alerta de estabilidade acidentária e dispensa do demissional
  const deslOriginal = ABAS_RH_EXTRA.desligamento;
  if (deslOriginal) ABAS_RH_EXTRA.desligamento = async (box, c, x) => {
    await deslOriginal(box, c, x);
    const [est, ult] = await Promise.all([api.listar('v_estabilidade_acidentaria', `colaborador_id=eq.${c.id}`).catch(() => []),
      api.listar('exames_ocupacionais', `colaborador_id=eq.${c.id}&ativo=eq.true&tipo=neq.toxicologico&order=data_exame.desc&limit=1`).catch(() => [])]);
    const dias = ult[0] ? Math.round((new Date(hojeISO()) - new Date(ult[0].data_exame)) / 864e5) : null;
    box.insertAdjacentHTML('afterbegin', `${est.length ? `<div class="alerta-obs" style="margin-bottom:10px">⛔ <b>Estabilidade acidentária até ${dataBR(est[0].estavel_ate)}</b> (Lei 8.213, art. 118). Dispensa sem justa causa neste período gera reintegração ou indenização. Consulte o jurídico.</div>` : ''}
      <div class="muted" style="margin-bottom:8px">🩺 Último exame clínico: ${ult[0] ? `${dataBR(ult[0].data_exame)} (${dias} dias). ${dias < 90 ? 'Demissional pode ser dispensado (menos de 90 dias).' : dias < 135 ? 'Demissional pode ser dispensado só se o grau de risco for 1 ou 2 (menos de 135 dias).' : 'Demissional obrigatório.'}` : 'nenhum registrado — demissional obrigatório.'}${x?.cargo?.motorista ? ' Motorista: toxicológico no desligamento (CLT art. 168 §6º).' : ''}</div>`);
  };
}
