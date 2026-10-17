// Verbo Gestão — Departamento Pessoal: folha (lançamentos por competência), descontos com confirmação do jurídico,
// importação das pendências dos setores, benefícios e simulação de rescisão
'use strict';

const editaDP = () => tem('administrador', 'dp');
const ST_COMP = { aberta: ['Aberta', 'azul'], em_conferencia: ['Em conferência', 'amarelo'], fechada: ['Fechada', 'verde'], enviada: ['Enviada à contabilidade', 'verde'] };
const ST_LANC = { pendente: ['Pendente', 'amarelo'], aprovado: ['Aprovado', 'verde'], cancelado: ['Cancelado', ''] };
const ORIG_LANC = { manual: 'Manual', disciplinar: 'Disciplinar', patrimonio: 'Patrimônio', manutencao: 'Manutenção', operacao: 'Operação', jornada: 'Jornada', beneficio: 'Benefício', adiantamento: 'Adiantamento' };
const TIPOS_BENEF = ['Vale-transporte', 'Vale-refeição', 'Vale-alimentação', 'Plano de saúde', 'Plano odontológico', 'Seguro de vida', 'Outro'];
const mesBR = iso => { const [a, m] = iso.split('-'); return `${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][+m - 1]}/${a}`; };
const rubricasDP = f => cad('dp_rubricas', 'select=*&order=codigo', f);

Object.assign(LEI, {
  desconto_folha: ['Descontos no salário — CLT art. 462', [
    'É <b>proibido descontar</b> do salário, exceto: adiantamentos, descontos previstos em lei (INSS, IR, VT até 6%, pensão judicial, consignado) ou em convenção/acordo coletivo — art. 462 caput.',
    'Dano causado pelo colaborador: só com <b>dolo</b>, ou com <b>culpa</b> se houver acordo assinado (art. 462 §1º). Plano de saúde, seguro, farmácia: exigem <b>autorização prévia e por escrito</b> (Súmula 342 TST).',
    'Faltas <b>justificadas</b> (atestado, art. 473) não podem ser descontadas. Na rescisão, a compensação de dívidas do colaborador é limitada a <b>1 mês de remuneração</b> (art. 477 §5º).',
    'Desconto indevido gera devolução em dobro em ações trabalhistas e pode configurar dano moral. <b>Regra da empresa: todo desconto passa pelo jurídico antes de ir para a folha.</b>']],
  rescisao: ['Rescisão — prazos e verbas', [
    'Pagamento das verbas e entrega dos documentos em até <b>10 dias corridos</b> após o término do contrato (art. 477 §6º). Atraso gera multa de 1 salário (art. 477 §8º).',
    '<b>Aviso prévio</b>: 30 dias + 3 por ano completo, até 90 dias (Lei 12.506/2011). O aviso indenizado <b>projeta</b> o contrato para 13º e férias (OJ 82 SDI-1).',
    '<b>Sem justa causa</b>: saldo, aviso, 13º e férias proporcionais + 1/3, férias vencidas + 1/3, multa de 40% do FGTS e guias do seguro-desemprego. <b>Pedido de demissão</b>: sem multa nem saque do FGTS; o aviso não cumprido pode ser descontado.',
    '<b>Acordo (art. 484-A)</b>: metade do aviso indenizado, multa de 20% do FGTS, saque de 80% e sem seguro-desemprego. <b>Justa causa</b>: só saldo de salário e férias vencidas + 1/3.',
    'Os valores abaixo são uma <b>estimativa</b> para planejamento. INSS, IR e médias de variáveis são calculados pela contabilidade.']],
});

async function competenciaAtual(mes) { return api.rpc('dp_abrir_competencia', { p_mes: (mes || hojeISO().slice(0, 7)) + '-01' }); }

// ===================== Painel =====================
rota('/dp', async tela => {
  const [comps, pend, bens] = await Promise.all([api.listar('dp_competencias', 'order=competencia.desc&limit=12'), api.rpc('pendencias_dp').catch(() => []), api.listar('dp_beneficios', 'ativo=eq.true&select=id,tipo,valor_empresa,valor_colaborador').catch(() => [])]);
  const p = Object.fromEntries(pend.map(x => [x.tipo, Number(x.quantidade)]));
  const custo = bens.reduce((a, b) => a + Number(b.valor_empresa || 0), 0);
  tela.innerHTML = `
    <div class="topo"><div><h1>Departamento Pessoal</h1><p class="sub">Folha por competência, descontos com aval do jurídico, benefícios e rescisões</p></div>
      ${editaDP() ? `<a class="btn prim" href="#/dp/folha?c=${hojeISO().slice(0, 7)}">Folha de ${mesBR(hojeISO().slice(0, 7))}</a>` : ''}</div>
    <div class="grade" style="margin-bottom:14px">
      <a class="cartao kpi ${p.dp_a_importar ? 'alerta' : ''}" href="#/dp/folha?c=${hojeISO().slice(0, 7)}"><div class="n">${p.dp_a_importar || 0}</div><div class="r">pendência(s) dos setores para trazer à folha</div></a>
      <a class="cartao kpi ${p.dp_lancamentos_pendentes ? 'alerta' : ''}" href="#/dp/folha?c=${hojeISO().slice(0, 7)}"><div class="n">${p.dp_lancamentos_pendentes || 0}</div><div class="r">lançamento(s) aguardando aprovação</div></a>
      <a class="cartao kpi" href="#/dp/beneficios"><div class="n">${bens.length}</div><div class="r">benefícios ativos · ${brl(custo)}/mês</div></a>
    </div>
    <div class="cartao"><h2>Competências</h2>${comps.length ? `<ul class="lista-simples">${comps.map(c => `<li class="clicavel" onclick="location.hash='#/dp/folha?c=${c.competencia.slice(0, 7)}'"><span><b>${mesBR(c.competencia)}</b>${c.fechada_em ? ` <span class="muted">fechada em ${dataBR(c.fechada_em)}</span>` : ''}</span>${tagSt(ST_COMP, c.status)}</li>`).join('')}</ul>` : '<div class="vazio">Nenhuma competência aberta ainda.</div>'}</div>
    ${avisoLei('desconto_folha')}`;
});

// ===================== Folha da competência =====================
rota('/dp/folha', async tela => {
  const mes = estado.params.get('c') || hojeISO().slice(0, 7);
  if (!editaDP() && !tem('rh', 'diretoria')) { tela.innerHTML = '<div class="cartao vazio">Sem permissão.</div>'; return; }
  let comp = (await api.listar('dp_competencias', `competencia=eq.${mes}-01`))[0];
  if (!comp && editaDP()) { await competenciaAtual(mes); comp = (await api.listar('dp_competencias', `competencia=eq.${mes}-01`))[0]; }
  if (!comp) { tela.innerHTML = '<div class="cartao vazio">Competência não aberta.</div>'; return; }
  const [ls, rubs, pend] = await Promise.all([api.listar('dp_lancamentos', `competencia_id=eq.${comp.id}&ativo=eq.true&select=*,c:colaboradores(nome,matricula,salario),r:dp_rubricas(codigo,nome,tipo,unidade,base_legal)&order=criado_em`),
    rubricasDP(), api.rpc('pendencias_dp').catch(() => [])]);
  const aImportar = Number(pend.find(x => x.tipo === 'dp_a_importar')?.quantidade || 0);
  const aberta = ['aberta', 'em_conferencia'].includes(comp.status), ed = editaDP() && aberta;
  const por = {}; ls.filter(l => l.status !== 'cancelado').forEach(l => { const x = por[l.colaborador_id] ||= { nome: l.c?.nome, mat: l.c?.matricula, sal: l.c?.salario, prov: 0, desc: 0 }; if (l.r.tipo === 'provento') x.prov += Number(l.valor || 0); if (l.r.tipo === 'desconto') x.desc += Number(l.valor || 0); });
  const ant = new Date(mes + '-15'); ant.setMonth(ant.getMonth() - 1); const prox = new Date(mes + '-15'); prox.setMonth(prox.getMonth() + 1);
  tela.innerHTML = `
    <div class="topo"><div><h1>Folha · ${mesBR(mes)}</h1><p class="sub">${tagSt(ST_COMP, comp.status)} · ${ls.filter(l => l.status !== 'cancelado').length} lançamento(s) · ${ls.filter(l => l.status === 'pendente').length} pendente(s)</p></div>
      <div class="acoes"><a class="btn" href="#/dp/folha?c=${ant.toISOString().slice(0, 7)}">◀ ${mesBR(ant.toISOString().slice(0, 7))}</a><a class="btn" href="#/dp/folha?c=${prox.toISOString().slice(0, 7)}">${mesBR(prox.toISOString().slice(0, 7))} ▶</a>
        ${ed ? `<button class="btn ${aImportar ? 'prim' : ''}" id="importar">Trazer pendências dos setores${aImportar ? ` (${aImportar})` : ''}</button><button class="btn" id="novo">+ Lançamento</button>
          <button class="btn" id="aprovar">Aprovar selecionados</button><button class="btn" id="fechar">Fechar competência</button>` : ''}
        ${editaDP() && comp.status === 'fechada' ? '<button class="btn prim" id="enviada">Marcar como enviada à contabilidade</button>' : ''}${tem('administrador') && !aberta ? '<button class="btn" id="reabrir">Reabrir</button>' : ''}</div></div>
    ${ls.some(l => l.r.tipo === 'desconto' && l.status === 'pendente' && !l.juridico_aprovado) ? '<div class="cartao alerta-obs">⚖️ Há descontos <b>sem confirmação do jurídico</b>. Eles só podem ser aprovados depois dessa confirmação.</div>' : ''}
    <div class="cartao"><h2>Lançamentos</h2>${ls.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>${ed ? '<input type="checkbox" id="todos">' : ''}</th><th>Colaborador</th><th>Rubrica</th><th class="num">Ref.</th><th class="num">Valor</th><th>Origem</th><th>Jurídico</th><th>Situação</th><th></th></tr></thead><tbody>
      ${ls.map(l => `<tr${l.status === 'cancelado' ? ' style="opacity:.5"' : ''}><td>${ed && l.status === 'pendente' ? `<input type="checkbox" class="sel" value="${l.id}">` : ''}</td><td data-r="Colaborador"><b>${esc(l.c?.nome || '')}</b></td>
        <td data-r="Rubrica"><span class="tag ${l.r.tipo === 'provento' ? 'verde' : l.r.tipo === 'desconto' ? 'vermelho' : ''}">${l.r.tipo === 'provento' ? '+' : l.r.tipo === 'desconto' ? '−' : 'i'}</span> ${esc(l.r.codigo + ' ' + l.r.nome)}${l.descricao ? `<div class="muted">${esc(l.descricao)}</div>` : ''}${l.parcelas ? `<div class="muted">parcela ${l.parcela}/${l.parcelas}</div>` : ''}</td>
        <td data-r="Ref." class="num">${l.referencia != null ? Number(l.referencia).toLocaleString('pt-BR') + ({ horas: 'h', dias: 'd', percentual: '%' }[l.r.unidade] || '') : '—'}</td><td data-r="Valor" class="num">${l.valor != null ? brl(l.valor) : '<span class="tag amarelo">calcular</span>'}</td>
        <td data-r="Origem">${ORIG_LANC[l.origem]}</td><td data-r="Jurídico">${l.r.tipo !== 'desconto' ? '<span class="muted">—</span>' : l.juridico_aprovado ? `<span class="tag verde" title="${esc(l.juridico_info || '')}">aprovado</span>` : '<span class="tag vermelho">pendente</span>'}</td>
        <td data-r="Situação">${tagSt(ST_LANC, l.status)}</td><td>${ed && l.status !== 'cancelado' ? `<button class="btn peq" data-ed="${l.id}">Abrir</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Nenhum lançamento. Use “Trazer pendências dos setores” ou “+ Lançamento”.</div>'}</div>
    ${Object.keys(por).length ? `<div class="cartao"><h2>Resumo por colaborador</h2><div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Colaborador</th><th>Matrícula</th><th class="num">Salário-base</th><th class="num">Proventos lançados</th><th class="num">Descontos lançados</th><th class="num">% descontos</th></tr></thead><tbody>
      ${Object.values(por).sort((a, b) => (a.nome || '').localeCompare(b.nome || '')).map(x => { const pct = x.sal ? 100 * x.desc / x.sal : null;
        return `<tr><td data-r="Colaborador"><b>${esc(x.nome || '')}</b></td><td data-r="Matrícula">${esc(x.mat || '')}</td><td data-r="Salário" class="num">${x.sal ? brl(x.sal) : '—'}</td><td data-r="Proventos" class="num">${brl(x.prov)}</td><td data-r="Descontos" class="num">${brl(x.desc)}</td>
        <td data-r="% descontos" class="num">${pct == null ? '—' : pct > 30 ? `<span class="tag vermelho" title="Descontos altos: confira com o jurídico (art. 462 e art. 82 CLT)">${pct.toFixed(0)}%</span>` : pct.toFixed(0) + '%'}</td></tr>`; }).join('')}</tbody></table></div>
      <p class="muted">Use ⬇ Excel para enviar a prévia à contabilidade. INSS, IRRF e FGTS são calculados pela contabilidade.</p></div>` : ''}
    ${avisoLei('desconto_folha')}`;
  $('#importar')?.addEventListener('click', async () => { try { const n = await api.rpc('dp_importar_pendencias', { p_comp: comp.id }); aviso(n ? `${n} lançamento(s) trazido(s). Revise e aprove.` : 'Nada novo para trazer.'); navegar(); } catch (err) { falha(err); } });
  $('#novo')?.addEventListener('click', () => formLancamento(comp, rubs));
  $$('[data-ed]', tela).forEach(b => b.onclick = () => formLancamento(comp, rubs, ls.find(l => l.id === b.dataset.ed)));
  $('#todos')?.addEventListener('change', e => $$('.sel', tela).forEach(c => (c.checked = e.target.checked)));
  $('#aprovar')?.addEventListener('click', async () => {
    const ids = $$('.sel:checked', tela).map(c => c.value); if (!ids.length) return aviso('Selecione os lançamentos.', true);
    const sel = ls.filter(l => ids.includes(l.id)), descs = sel.filter(l => l.r.tipo === 'desconto' && !l.juridico_aprovado);
    let jur = null;
    if (descs.length) {
      const r = await modal(`<form><h2>Aprovar ${sel.length} lançamento(s)</h2><p>${descs.length} desconto(s) ainda sem confirmação do jurídico:</p>
        <ul>${[...new Set(descs.map(d => d.r.codigo))].map(cod => { const d = descs.find(x => x.r.codigo === cod); return `<li><b>${esc(d.r.nome)}</b> (${descs.filter(x => x.r.codigo === cod).length}) — <span class="muted">${esc(d.r.base_legal || '')}</span></li>`; }).join('')}</ul>
        ${avisoLei('desconto_folha')}
        <label class="check"><input type="checkbox" name="ok" required> Confirmo que o jurídico analisou e aprovou estes descontos</label>
        <label class="campo">Quem aprovou / referência do parecer *<input name="info" required placeholder="Ex.: Dra. Fulana, e-mail de 12/10/2026"></label>
        <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Aprovar</button></div></form>`);
      if (!r) return; jur = r.info;
    } else if (!await confirmar(`Aprovar ${sel.length} lançamento(s)?`, { botao: 'Aprovar' })) return;
    try { for (const l of sel) await api.alterar('dp_lancamentos', `id=eq.${l.id}`, { status: 'aprovado', ...(l.r.tipo === 'desconto' && !l.juridico_aprovado ? { juridico_aprovado: true, juridico_info: jur } : {}) });
      aviso('Aprovado(s).'); navegar(); } catch (err) { falha(err); navegar(); } });
  $('#fechar')?.addEventListener('click', async () => { if (!await confirmar(`Fechar a folha de ${mesBR(mes)}? Depois disso os lançamentos não podem ser alterados.`, { botao: 'Fechar' })) return;
    try { await api.alterar('dp_competencias', `id=eq.${comp.id}`, { status: 'fechada' }); aviso('Competência fechada.'); navegar(); } catch (err) { falha(err); } });
  $('#enviada')?.addEventListener('click', async () => { try { await api.alterar('dp_competencias', `id=eq.${comp.id}`, { status: 'enviada' }); navegar(); } catch (err) { falha(err); } });
  $('#reabrir')?.addEventListener('click', async () => { const m = await confirmar('Reabrir a competência?', { comMotivo: true, botao: 'Reabrir' }); if (!m) return;
    try { await api.alterar('dp_competencias', `id=eq.${comp.id}`, { status: 'em_conferencia', observacao: 'Reaberta: ' + m }); navegar(); } catch (err) { falha(err); } });
});

async function formLancamento(comp, rubs, l = null) {
  const cs = await api.listar('colaboradores', 'select=id,nome,salario,status&ativo=eq.true&status=neq.candidato&order=nome').catch(() => []);
  const ativas = rubs.filter(r => r.ativo || r.id === l?.rubrica_id);
  const r = await modal(`<form><h2>${l ? 'Lançamento' : 'Novo lançamento'} · ${mesBR(comp.competencia)}</h2><div class="form">
    <label class="campo largo">Colaborador *<select name="colab" required ${l ? 'disabled' : ''}><option value="">Selecione…</option>${cs.map(c => `<option value="${c.id}" data-sal="${c.salario || ''}" ${c.id === l?.colaborador_id ? 'selected' : ''}>${esc(c.nome)}${c.status === 'desligado' ? ' (desligado)' : ''}</option>`).join('')}</select></label>
    <label class="campo largo">Rubrica *<select name="rub" required ${l ? 'disabled' : ''}><option value="">Selecione…</option>
      ${['provento', 'desconto', 'informativo'].map(t => `<optgroup label="${{ provento: 'Proventos', desconto: 'Descontos', informativo: 'Informativos' }[t]}">${ativas.filter(x => x.tipo === t).map(x => `<option value="${x.id}" ${x.id === l?.rubrica_id ? 'selected' : ''}>${esc(x.codigo + ' · ' + x.nome)}</option>`).join('')}</optgroup>`).join('')}</select></label>
    <label class="campo">Referência (h, dias, %)<input name="ref" inputmode="decimal" value="${l?.referencia ?? ''}"></label>
    <label class="campo">Valor (R$)<input name="valor" inputmode="decimal" value="${l?.valor ?? ''}"></label>
    ${l ? '' : '<label class="campo">Parcelas<input type="number" name="parcelas" value="1" min="1" max="24"></label>'}
    <label class="campo largo">Descrição<input name="descricao" value="${esc(l?.descricao || '')}"></label>
    <div class="largo" id="b-base"></div>
    <div class="largo" id="b-desc" hidden>${avisoLei('desconto_folha')}
      <label class="check"><input type="checkbox" name="jur" ${l?.juridico_aprovado ? 'checked' : ''}> O jurídico analisou e aprovou este desconto</label>
      <label class="campo">Quem aprovou / referência<input name="jur_info" value="${esc(l?.juridico_info || '')}"></label>
      <label class="check"><input type="checkbox" name="aut" ${l?.autorizacao_colaborador ? 'checked' : ''}> Há autorização escrita do colaborador (obrigatória para plano de saúde, consignado e similares)</label></div>
    ${l ? `<label class="campo">Situação<select name="status">${Object.entries(ST_LANC).map(([k, [t]]) => `<option value="${k}" ${k === l.status ? 'selected' : ''}>${t}</option>`).join('')}</select></label><label class="campo">Motivo (se cancelar)<input name="motivo"></label>` : ''}</div>
    <p class="muted" id="m-calc"></p>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`,
    { aoAbrir: raiz => { const f = $('form', raiz); const s = () => { const rb = rubs.find(x => x.id === f.rub.value); $('#b-desc', raiz).hidden = rb?.tipo !== 'desconto';
        $('#b-base', raiz).innerHTML = rb?.base_legal ? `<p class="${rb.tipo === 'desconto' ? 'alerta-obs' : 'muted'}">📖 <b>Base legal:</b> ${esc(rb.base_legal)}</p>` : '';
        const sal = Number(f.colab.selectedOptions[0]?.dataset.sal || 0), ref = num(f.ref.value);
        $('#m-calc', raiz).textContent = sal && ref && rb ? ({ horas: `Salário-hora (÷220): ${brl(sal / 220)} · ${rb.codigo === 'P001' ? 'com 50%: ' + brl(sal / 220 * 1.5 * ref) : rb.codigo === 'P002' ? 'com 100%: ' + brl(sal / 220 * 2 * ref) : rb.codigo === 'P005' ? '30%: ' + brl(sal / 220 * 0.3 * ref) : rb.codigo === 'P003' ? '20%: ' + brl(sal / 220 * 0.2 * ref) : brl(sal / 220 * ref)}`,
          dias: `Salário-dia (÷30): ${brl(sal / 30)} · × ${ref} = ${brl(sal / 30 * ref)}`, percentual: `${ref}% de ${brl(sal)} = ${brl(sal * ref / 100)}` }[rb.unidade] || '') : ''; };
      f.rub.onchange = s; f.colab.onchange = s; f.ref.oninput = s; s(); },
      validar: d => { const rb = rubs.find(x => x.id === (d.rub || l?.rubrica_id)); if (!d.ref && !d.valor) return 'Informe valor ou referência.';
        if (rb?.tipo === 'desconto' && d.status === 'aprovado' && !d.jur) return 'Desconto: confirme a aprovação do jurídico antes de aprovar.';
        if (d.jur && !d.jur_info) return 'Informe quem do jurídico aprovou.'; if (d.status === 'cancelado' && !d.motivo) return 'Informe o motivo do cancelamento.'; return null; } });
  if (!r) return;
  const base = { referencia: num(r.ref), valor: num(r.valor), descricao: r.descricao || null, juridico_aprovado: !!r.jur, juridico_info: r.jur_info || null, autorizacao_colaborador: !!r.aut };
  try {
    if (l) await api.alterar('dp_lancamentos', `id=eq.${l.id}`, { ...base, status: r.status, motivo_cancelamento: r.motivo || null });
    else { const n = Math.max(1, Number(r.parcelas) || 1); let mes = comp.competencia.slice(0, 7);
      for (let k = 1; k <= n; k++) { const cid = k === 1 ? comp.id : await competenciaAtual(mes);
        await api.inserir('dp_lancamentos', { ...base, competencia_id: cid, colaborador_id: r.colab, rubrica_id: r.rub, ...(n > 1 ? { parcela: k, parcelas: n } : {}) });
        const d = new Date(mes + '-15'); d.setMonth(d.getMonth() + 1); mes = d.toISOString().slice(0, 7); } }
    aviso('Lançamento salvo.'); navegar();
  } catch (err) { falha(err); }
}

// ===================== Benefícios =====================
rota('/dp/beneficios', async tela => {
  const bs = await api.listar('dp_beneficios', 'ativo=eq.true&select=*,c:colaboradores(nome),f:fornecedores(razao_social)&order=tipo');
  tela.innerHTML = `<div class="topo"><div><h1>Benefícios</h1><p class="sub">${bs.length} benefício(s) · empresa ${brl(bs.reduce((a, b) => a + Number(b.valor_empresa || 0), 0))}/mês · colaboradores ${brl(bs.reduce((a, b) => a + Number(b.valor_colaborador || 0), 0))}/mês</p></div>${editaDP() ? '<button class="btn prim" id="novo">+ Benefício</button>' : ''}</div>
    <div class="cartao">${bs.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Colaborador</th><th>Benefício</th><th>Fornecedor</th><th class="num">Empresa</th><th class="num">Desconto do colaborador</th><th>Vigência</th><th>Autorização</th><th></th></tr></thead><tbody>
      ${bs.map(b => `<tr><td data-r="Colaborador"><b>${esc(b.c?.nome || '')}</b></td><td data-r="Benefício">${esc(b.tipo)}${b.descricao ? `<div class="muted">${esc(b.descricao)}</div>` : ''}</td><td data-r="Fornecedor">${esc(b.f?.razao_social || '—')}</td>
        <td data-r="Empresa" class="num">${b.valor_empresa ? brl(b.valor_empresa) : '—'}</td><td data-r="Desconto" class="num">${b.valor_colaborador ? brl(b.valor_colaborador) : '—'}</td><td data-r="Vigência">${dataBR(b.inicio)}${b.fim ? ' a ' + dataBR(b.fim) : ''}</td>
        <td data-r="Autorização">${b.valor_colaborador ? (b.autorizacao_assinada ? '<span class="tag verde">assinada</span>' : '<span class="tag vermelho">falta</span>') : '—'}</td><td>${editaDP() ? `<button class="btn peq" data-ed="${b.id}">Editar</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Nenhum benefício cadastrado.</div>'}
      <p class="muted">A participação do colaborador vira desconto na folha ao “Trazer pendências dos setores” — e passa pela confirmação do jurídico.</p></div>
    ${avisoLei('desconto_folha')}`;
  $('#novo')?.addEventListener('click', () => formBeneficio());
  $$('[data-ed]', tela).forEach(b => b.onclick = () => formBeneficio(bs.find(x => x.id === b.dataset.ed)));
});
async function formBeneficio(b = null) {
  const [cs, fs] = await Promise.all([api.listar('colaboradores', 'select=id,nome,salario&ativo=eq.true&status=not.in.(candidato,desligado)&order=nome').catch(() => []), cad('fornecedores', 'select=id,razao_social,nome_fantasia,documento,ativo&order=razao_social')]);
  const r = await modal(`<form><h2>${b ? 'Editar benefício' : 'Novo benefício'}</h2><div class="form">
    <label class="campo largo">Colaborador *<select name="colab" required>${'<option value="">Selecione…</option>' + cs.map(c => `<option value="${c.id}" data-sal="${c.salario || ''}" ${c.id === b?.colaborador_id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></label>
    <label class="campo">Tipo<select name="tipo" data-valor="${esc(b?.tipo || '')}">${TIPOS_BENEF.map(t => `<option ${t === b?.tipo ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <label class="campo">Descrição / plano<input name="descricao" value="${esc(b?.descricao || '')}"></label>
    <label class="campo">Fornecedor<select name="forn"><option value="">—</option>${fs.filter(f => f.ativo).map(f => `<option value="${f.id}" ${f.id === b?.fornecedor_id ? 'selected' : ''}>${esc(rotForn(f))}</option>`).join('')}</select></label>
    <label class="campo">Custo da empresa (R$/mês)<input name="ve" inputmode="decimal" value="${b?.valor_empresa ?? ''}"></label><label class="campo">Desconto do colaborador (R$/mês)<input name="vc" inputmode="decimal" value="${b?.valor_colaborador ?? ''}"></label>
    <label class="campo">Início<input type="date" name="inicio" value="${b?.inicio || hojeISO()}"></label><label class="campo">Fim<input type="date" name="fim" value="${b?.fim || ''}"></label>
    <label class="check largo"><input type="checkbox" name="aut" ${b?.autorizacao_assinada ? 'checked' : ''}> Autorização de desconto assinada pelo colaborador</label></div>
    <p class="muted" id="m-vt"></p>
    <div class="rodape">${b ? '<button class="btn perigo" value="encerrar">Encerrar hoje</button>' : ''}<button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim" value="salvar">Salvar</button></div></form>`,
    { aoAbrir: raiz => { const f = $('form', raiz); const s = () => { const sal = Number(f.colab.selectedOptions[0]?.dataset.sal || 0);
        $('#m-vt', raiz).textContent = f.tipo.value === 'Vale-transporte' && sal ? `Limite de desconto do VT (6% do salário-base): ${brl(sal * 0.06)}.` : ['Vale-refeição', 'Vale-alimentação'].includes(f.tipo.value) ? 'PAT: a participação do colaborador é limitada a 20% do custo do benefício.' : ['Plano de saúde', 'Plano odontológico'].includes(f.tipo.value) ? 'Desconto de plano exige autorização prévia e escrita (Súmula 342 TST).' : ''; };
      f.tipo.onchange = s; f.colab.onchange = s; s(); } });
  if (!r) return;
  try {
    if (r._acao === 'encerrar') { await api.alterar('dp_beneficios', `id=eq.${b.id}`, { fim: hojeISO() }); return navegar(); }
    const dados = { colaborador_id: r.colab, tipo: r.tipo, descricao: r.descricao || null, fornecedor_id: r.forn || null, valor_empresa: num(r.ve), valor_colaborador: num(r.vc), inicio: r.inicio, fim: r.fim || null, autorizacao_assinada: !!r.aut };
    if (b) await api.alterar('dp_beneficios', `id=eq.${b.id}`, dados); else await api.inserir('dp_beneficios', dados);
    aviso('Benefício salvo.'); navegar();
  } catch (err) { falha(err); }
}

// ===================== Rubricas =====================
rota('/dp/rubricas', async tela => {
  const rs = await rubricasDP(true);
  tela.innerHTML = `<div class="topo"><div><h1>Rubricas da folha</h1><p class="sub">Cada rubrica traz a base legal que aparece antes de lançar</p></div>${editaDP() ? '<button class="btn prim" id="nova">+ Rubrica</button>' : ''}</div>
    <div class="cartao"><div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Código</th><th>Rubrica</th><th>Tipo</th><th>Incide</th><th>Base legal</th><th></th></tr></thead><tbody>
      ${rs.map(r => `<tr${r.ativo ? '' : ' style="opacity:.5"'}><td data-r="Código" class="mono">${esc(r.codigo)}</td><td data-r="Rubrica"><b>${esc(r.nome)}</b> <span class="muted">(${r.unidade})</span></td><td data-r="Tipo">${r.tipo}</td>
        <td data-r="Incide">${[r.incide_inss && 'INSS', r.incide_fgts && 'FGTS', r.incide_irrf && 'IRRF'].filter(Boolean).join(' · ') || '—'}</td><td data-r="Base legal" class="muted">${esc(r.base_legal || '')}</td><td>${editaDP() ? `<button class="btn peq" data-ed="${r.id}">Editar</button>` : ''}</td></tr>`).join('')}</tbody></table></div></div>`;
  const form = async (x = null) => {
    const r = await modal(`<form><h2>${x ? 'Editar rubrica' : 'Nova rubrica'}</h2><div class="form">
      <label class="campo">Código *<input name="codigo" required value="${esc(x?.codigo || '')}"></label><label class="campo largo">Nome *<input name="nome" required value="${esc(x?.nome || '')}"></label>
      <label class="campo">Tipo<select name="tipo">${['provento', 'desconto', 'informativo'].map(t => `<option ${t === x?.tipo ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo">Unidade<select name="unidade">${['valor', 'horas', 'dias', 'percentual', 'quantidade'].map(t => `<option ${t === (x?.unidade || 'valor') ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <div class="largo">${['inss', 'fgts', 'irrf'].map(k => `<label class="check" style="display:inline-flex;margin-right:12px"><input type="checkbox" name="${k}" ${x ? (x['incide_' + k] ? 'checked' : '') : 'checked'}> Incide ${k.toUpperCase()}</label>`).join('')}</div>
      <label class="campo largo">Base legal (aparece como aviso)<textarea name="base" rows="3">${esc(x?.base_legal || '')}</textarea></label>
      ${x ? `<label class="check"><input type="checkbox" name="ativo" ${x.ativo ? 'checked' : ''}> Ativa</label>` : ''}</div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`, { validar: d => d.tipo === 'desconto' && !d.base ? 'Desconto precisa da base legal.' : null });
    if (!r) return;
    const dados = { codigo: r.codigo, nome: r.nome, tipo: r.tipo, unidade: r.unidade, incide_inss: !!r.inss, incide_fgts: !!r.fgts, incide_irrf: !!r.irrf, base_legal: r.base || null, ...(x ? { ativo: !!r.ativo } : {}) };
    try { if (x) await api.alterar('dp_rubricas', `id=eq.${x.id}`, dados); else await api.inserir('dp_rubricas', dados); delete estado.cache.dp_rubricas; navegar(); } catch (err) { falha(err); } };
  $('#nova')?.addEventListener('click', () => form());
  $$('[data-ed]', tela).forEach(b => b.onclick = () => form(rs.find(x => x.id === b.dataset.ed)));
});

// ===================== Simulação de rescisão (na aba Desligamento) =====================
function mesesProporcionais(ini, fim) { // meses (do calendário) com 15 dias ou mais de trabalho no intervalo
  if (!ini || !fim || fim < ini) return 0; let n = 0, d = new Date(ini.slice(0, 7) + '-01T12:00:00'); const f = new Date(fim + 'T12:00:00'), i = new Date(ini + 'T12:00:00');
  while (d <= f) { const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0, 12); const de = i > d ? i : d, ate = f < ultimo ? f : ultimo;
    if (Math.round((ate - de) / 864e5) + 1 >= 15) n++; d = new Date(d.getFullYear(), d.getMonth() + 1, 1, 12); }
  return Math.min(12, n);
}
async function simularRescisao(c) {
  const ps = await api.listar('v_ferias_saldo', `colaborador_id=eq.${c.id}&order=inicio_aquisitivo`).catch(() => []);
  const r = await modal(`<form><h2>Simular rescisão · ${esc(c.nome)}</h2><div class="form">
    <label class="campo">Tipo<select name="tipo"><option value="sem_justa_causa">Dispensa sem justa causa</option><option value="pedido_demissao">Pedido de demissão</option><option value="acordo">Acordo (art. 484-A)</option><option value="justa_causa">Justa causa</option><option value="termino_experiencia">Término do contrato de experiência</option></select></label>
    <label class="campo">Último dia trabalhado<input type="date" name="data" value="${hojeISO()}"></label>
    <label class="campo">Aviso prévio<select name="aviso"><option value="indenizado">Indenizado</option><option value="trabalhado">Trabalhado</option><option value="dispensado">Dispensado / não se aplica</option></select></label>
    <label class="campo">Salário (R$)<input name="sal" inputmode="decimal" value="${c.salario ?? ''}"></label><label class="campo">Admissão<input type="date" name="adm" value="${c.data_admissao || ''}"></label>
    <label class="campo">Saldo do FGTS para fins rescisórios (R$)<input name="fgts" inputmode="decimal" placeholder="extrato da Caixa"></label>
    <label class="campo">Dias de férias vencidas<input type="number" name="fv" value="${ps.filter(p => p.fim_aquisitivo < hojeISO()).reduce((a, p) => a + Math.max(0, p.dias_direito - p.dias_gozados), 0)}"></label></div>
    <div id="res"></div>${avisoLei('rescisao')}
    <div class="rodape"><button type="button" class="btn" data-fechar>Fechar</button><button type="button" class="btn prim" id="calc">Calcular</button></div></form>`,
    { aoAbrir: raiz => { const f = $('form', raiz);
      const calc = () => { const t = f.tipo.value, sal = num(f.sal.value) || 0, data = f.data.value, adm = f.adm.value; if (!sal || !adm) { $('#res', raiz).innerHTML = '<p class="alerta-obs">Informe salário e admissão.</p>'; return; }
        const anos = Math.floor((new Date(data) - new Date(adm)) / (365.25 * 864e5));
        const diasAviso = Math.min(30 + 3 * anos, 90);
        const temAvisoInd = f.aviso.value === 'indenizado' && ['sem_justa_causa', 'acordo'].includes(t);
        const diasAvisoPago = temAvisoInd ? (t === 'acordo' ? Math.floor(diasAviso / 2) : diasAviso) : 0;
        const proj = temAvisoInd ? somaDias(data, diasAviso) : data;
        const dia = Number(data.slice(8, 10)), saldo = sal / 30 * dia;
        const inicioAno = proj.slice(0, 4) + '-01-01', m13 = t === 'justa_causa' ? 0 : mesesProporcionais(adm > inicioAno ? adm : inicioAno, proj);
        const per = ps.filter(p => p.fim_aquisitivo >= data).sort((a, b) => a.inicio_aquisitivo.localeCompare(b.inicio_aquisitivo))[0];
        const mFer = t === 'justa_causa' ? 0 : mesesProporcionais(per?.inicio_aquisitivo || adm, proj);
        const fv = Number(f.fv.value) || 0;
        const linhas = [['Saldo de salário (' + dia + ' dias)', saldo], diasAvisoPago && ['Aviso prévio indenizado (' + diasAvisoPago + ' dias' + (t === 'acordo' ? ', metade' : '') + ')', sal / 30 * diasAvisoPago],
          m13 && ['13º proporcional (' + m13 + '/12)', sal / 12 * m13], fv && ['Férias vencidas (' + fv + ' dias) + 1/3', sal / 30 * fv * 4 / 3], mFer && ['Férias proporcionais (' + mFer + '/12) + 1/3', sal / 12 * mFer * 4 / 3],
          t === 'pedido_demissao' && f.aviso.value === 'dispensado' && ['Desconto do aviso não cumprido (pode ser descontado — art. 487 §2º)', -sal]].filter(Boolean);
        const total = linhas.reduce((a, [, v]) => a + v, 0), fg = num(f.fgts.value) || 0;
        const multa = t === 'sem_justa_causa' ? fg * 0.4 : t === 'acordo' ? fg * 0.2 : 0;
        $('#res', raiz).innerHTML = `<table class="tabela-notas" style="margin:10px 0">${linhas.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="num">${brl(v)}</td></tr>`).join('')}
          <tr><td><b>Total bruto estimado (antes de INSS/IR)</b></td><td class="num"><b>${brl(total)}</b></td></tr>
          ${multa ? `<tr><td>Multa do FGTS (${t === 'acordo' ? '20%' : '40%'}) — depositada na conta do FGTS</td><td class="num">${brl(multa)}</td></tr>` : ''}</table>
          <p class="muted">Aviso: ${diasAviso} dias (${anos} ano(s) completo(s))${temAvisoInd ? ` · data projetada ${dataBR(proj)}` : ''} · prazo de pagamento: até ${dataBR(somaDias(data, 10))} (art. 477 §6º).
          ${t === 'pedido_demissao' ? ' Sem saque do FGTS e sem seguro-desemprego.' : t === 'acordo' ? ' Saque de 80% do FGTS, sem seguro-desemprego.' : t === 'sem_justa_causa' ? ' Saque do FGTS e guias do seguro-desemprego.' : t === 'justa_causa' ? ' Sem 13º e férias proporcionais, sem saque do FGTS.' : ' Término normal: sem aviso nem multa de 40%; saque do FGTS.'}</p>`; };
      $('#calc', raiz).onclick = calc; } });
}
if (typeof ABAS_RH_EXTRA !== 'undefined' && ABAS_RH_EXTRA.desligamento) {
  const deslAnterior = ABAS_RH_EXTRA.desligamento;
  ABAS_RH_EXTRA.desligamento = async (box, c, x) => {
    await deslAnterior(box, c, x);
    if (!tem('administrador', 'dp', 'rh')) return;
    box.insertAdjacentHTML('beforeend', '<div class="acoes" style="margin-top:10px"><button class="btn" id="sim-resc">🧮 Simular verbas rescisórias</button></div>');
    $('#sim-resc', box).onclick = () => simularRescisao(c);
  };
}
