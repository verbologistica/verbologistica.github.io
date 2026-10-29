// Verbo Gestão — Fundo Fixo e Adiantamentos (prestação de contas)
'use strict';

const FORMAS_DIN = ['Dinheiro', 'Pix', 'Transferência'];
const nomeAdt = a => a.colab?.nome || a.colaborador_nome || '—';
const adtVencido = a => ['pago', 'prestando_contas'].includes(a.status) && a.prazo_prestacao && a.prazo_prestacao < hojeISO();
const STATUS_ADT = { aguardando_aprovacao: ['Aguardando aprovação', 'amarelo'], aprovado: ['Aprovado · a entregar', 'azul'], pago: ['Entregue · aguardando prestação', 'azul'],
  prestando_contas: ['Prestando contas', 'amarelo'], acertado: ['Acertado', 'verde'], devolvido: ['Devolvido p/ correção', 'vermelho'],
  reprovado: ['Reprovado', 'vermelho'], cancelado: ['Cancelado', ''] };
const tagAdt = a => adtVencido(a) ? '<span class="tag vermelho">Prestação vencida</span>' : `<span class="tag ${STATUS_ADT[a.status]?.[1] || ''}">${STATUS_ADT[a.status]?.[0] || a.status}</span>`;
const dadosConta = c => c ? [c.titular, c.banco && `Banco ${c.banco}`, c.agencia && `Ag. ${c.agencia}`, c.conta && `Conta ${c.conta}`, c.chave_pix && `Pix ${c.chave_pix}`].filter(Boolean).join(' · ') : '';
const SELECT_ADT = 'select=*,colab:usuarios(nome)';
const difTxt = a => Number(a.valor_assumido_colaborador) > 0 ? `<div class="muted">Diferença de ${brl(a.valor_assumido_colaborador)} assumida pelo colaborador</div>`
  : Number(a.valor_complemento) > 0 ? `<div class="muted">Diferença de ${brl(a.valor_complemento)} ${a.diferenca_coberta_por === 'fundo_fixo' ? 'paga pelo Fundo Fixo' : a.diferenca_coberta_por === 'reembolso' ? 'enviada para reembolso ao colaborador' : 'em Contas a pagar'}</div>` : '';

function tabelaAdts(linhas, comNome = true) {
  if (!linhas.length) return '<div class="vazio">Nenhum adiantamento.</div>';
  return `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nº</th>${comNome ? '<th>Colaborador</th>' : ''}<th>Motivo</th><th class="num">Valor</th><th>Prestar contas até</th><th>Situação</th></tr></thead><tbody>
    ${linhas.map(a => `<tr class="clicavel" data-adt="${a.id}" onclick="location.hash='#/adiantamentos/ver/${a.id}'"${fAttr('colab', nomeAdt(a))}${fAttr('sit', _txt(tagAdt(a)))}${fAttr('data', a.data_entrega || a.data_saida || (a.criado_em || '').slice(0, 10))}${fAttr('valor', a.valor)}${fAttr('busca', [a.numero, nomeAdt(a), a.motivo].join(' '))}><td data-r="Nº" class="nowrap">${esc(a.numero)}</td>
      ${comNome ? `<td data-r="Colaborador">${esc(nomeAdt(a))}</td>` : ''}<td data-r="Motivo">${esc(a.motivo)}</td><td data-r="Valor" class="num">${brl(a.valor)}</td>
      <td data-r="Prestar contas até">${a.prazo_prestacao ? dataBR(a.prazo_prestacao) : '—'}</td><td data-r="Situação">${tagAdt(a)}</td></tr>`).join('')}
  </tbody></table></div>`;
}

// ---------- Meus adiantamentos ----------
rota('/adiantamentos', async tela => {
  const ls = await api.listar('adiantamentos', `${SELECT_ADT}&colaborador_id=eq.${estado.usuario.id}&status=neq.cancelado&order=criado_em.desc`);
  tela.innerHTML = `
    <div class="topo"><div><h1>Meus adiantamentos</h1><p class="sub">Dinheiro recebido antes da despesa: depois preste contas com os comprovantes</p></div>
      <a class="btn prim" href="#/adiantamentos/novo">+ Pedir adiantamento</a></div>
    <div class="cartao">${tabelaAdts(ls, false)}</div>`;
});

// ---------- Adiantamentos (Financeiro) ----------
rota('/financeiro/adiantamentos', async tela => {
  const sts = pLista('status', 'todos'), st = sts[0];
  const mapaF = { abertos: 'status=in.(aguardando_aprovacao,aprovado,pago,prestando_contas,devolvido)', acertados: 'status=eq.acertado', todos: 'status=neq.cancelado' };
  const filtro = filtroOu(sts.map(s => mapaF[s] ?? mapaF.todos)) || mapaF.todos;
  const ls = await api.listar('adiantamentos', `${SELECT_ADT}&${filtro}&order=criado_em.desc&limit=500`);
  const emAberto = ls.filter(a => ['pago', 'prestando_contas'].includes(a.status));
  tela.innerHTML = `
    <div class="topo"><div><h1>Adiantamentos</h1><p class="sub">${emAberto.length} com colaborador · ${brl(emAberto.reduce((s, a) => s + Number(a.valor), 0))} a prestar contas · ${ls.filter(adtVencido).length} vencido(s)</p></div>
      <div class="acoes">${editaFin() ? '<button class="btn" id="retro">Registrar adiantamento já entregue</button>' : ''}<a class="btn prim" href="#/adiantamentos/novo">+ Novo adiantamento</a></div></div>
    <form class="filtros" id="filtros"><select name="status">${[['abertos', 'Em andamento'], ['acertados', 'Acertados'], ['todos', 'Todos']].map(([v, t]) => `<option value="${v}" ${v === st ? 'selected' : ''}>${t}</option>`).join('')}</select><button class="btn">Filtrar</button></form>
    <div class="cartao">${tabelaAdts(ls)}</div>`;
  $('#filtros').onsubmit = e => { e.preventDefault(); location.hash = '#/financeiro/adiantamentos?status=' + formDados(e.target).status; };
  filtroLocal(tela, { itens: 'tbody tr[data-adt]', antes: '.cartao', campos: [{ k: 'colab', rotulo: 'Colaborador' }, { k: 'sit', rotulo: 'Situação' }], periodo: true, rotuloPeriodo: 'Entrega' });
  $('#retro')?.addEventListener('click', async () => {
    try { const id = await modalAdtRetroativo(); if (id) { aviso('Adiantamento registrado como entregue.'); location.hash = '#/adiantamentos/ver/' + id; } } catch (err) { falha(err); }
  });
});

// ---------- Novo adiantamento ----------
rota('/adiantamentos/novo', async tela => {
  const [listaPes, ccs, bs, saldos] = await Promise.all([editaFin() ? pessoasFin() : [], centros(),
    editaFin() ? api.listar('contas_bancarias', 'select=*&ativo=eq.true&order=nome').catch(() => []) : [],
    editaFin() ? api.listar('v_saldos_contas', 'select=id,saldo').catch(() => []) : []]);
  const fundoF = bs.find(b => b.tipo === 'fundo_fixo'), doFundo = estado.params.get('origem') === 'fundo';
  const ccPadrao = estado.usuario.centro_custo_id || ccs.find(c => c.codigo === 'GERAL')?.id;
  tela.innerHTML = `
    <div class="topo"><div><h1>${editaFin() ? 'Novo adiantamento' : 'Pedir adiantamento'}</h1><p class="sub">Depois de aprovado, o Financeiro entrega o valor. A prestação de contas vence ${5} dias após o retorno.</p></div></div>
    <form class="cartao form" id="f-adt">
      ${editaFin() ? htmlPessoaFin(listaPes, '') : ''}
      <label class="campo">Valor (R$)<input name="valor" inputmode="decimal" required placeholder="0,00"></label>
      ${editaFin() ? `<label class="campo">Sai de<select name="origem"><option value="">A definir na entrega</option>${bs.map(b => `<option value="${b.id}" ${doFundo && b.id === fundoF?.id ? 'selected' : ''}>${esc(b.nome)}${b.tipo === 'fundo_fixo' ? ` (saldo ${brl(saldos.find(x => x.id === b.id)?.saldo)})` : ''}</option>`).join('')}</select></label>
      <label class="check largo"><input type="checkbox" name="entregue" ${doFundo ? 'checked' : ''}> O dinheiro já foi entregue (lança agora no extrato da conta escolhida, sem passar por aprovação)</label>
      <div class="largo form" id="box-entregue" style="padding:0">
        <label class="campo">Data da entrega<input type="date" name="data_entrega" value="${hojeISO()}" max="${hojeISO()}"></label>
        <label class="campo">Forma<select name="forma">${FORMAS_DIN.map(x => `<option>${x}</option>`).join('')}</select></label>
        <label class="campo largo">Comprovante da entrega (obrigatório, exceto dinheiro)<input type="file" name="arquivos" accept="image/*,application/pdf" multiple></label></div>
      <p class="muted largo" id="dica-fundo" hidden>Saindo do Fundo Fixo, ao ser aprovado o adiantamento já é entregue e aparece no extrato do fundo.</p>` : ''}
      <label class="campo largo">Motivo<input name="motivo" required placeholder="Ex.: viagem Guararapes × Três Lagoas, combustível e alimentação"></label>
      <label class="campo">Data de saída<input type="date" name="data_saida" value="${hojeISO()}"></label>
      <label class="campo">Data de retorno<input type="date" name="data_retorno"></label>
      <label class="campo">Centro de custo<select name="cc">${opcoes(ccs.filter(c => c.ativo), null, c => c.nome, ccPadrao, null)}</select></label>
      <div class="largo acoes"><button class="btn prim">Enviar para aprovação</button><a class="btn" href="javascript:history.back()">Cancelar</a></div>
    </form>`;
  const f = $('#f-adt');
  ligarPessoaFin(f, listaPes);
  if (f.entregue) {
    const sinc = () => { const ent = f.entregue.checked; $('#box-entregue').hidden = !ent; f.origem.required = ent;
      $('#dica-fundo').hidden = ent || f.origem.value !== fundoF?.id;
      f.querySelector('.acoes .btn.prim').textContent = ent ? 'Registrar adiantamento entregue' : 'Enviar para aprovação'; };
    f.entregue.onchange = sinc; f.origem.onchange = sinc; sinc();
  }
  f.onsubmit = async e => {
    e.preventDefault();
    const d = formDados(f); const v = num(d.valor);
    if (!v || v <= 0) return aviso('Informe o valor.', true);
    if (editaFin() && !d.quem) return aviso('Escolha a pessoa que recebe o adiantamento.', true);
    const q = d.quem || 'u:' + estado.usuario.id;
    const ent = editaFin() && f.entregue?.checked;
    if (ent && !d.origem) return aviso('Informe de onde saiu o dinheiro.', true);
    if (ent && d.forma !== 'Dinheiro' && !d.arquivos?.length) return aviso('Anexe o comprovante da entrega. Só dinheiro dispensa comprovante.', true);
    await ocupado(e.submitter, async () => {
      try {
        const quemDados = await resolverPessoaFin(q, d.quem_nome, listaPes);
        if (ent) {
          const id = await api.rpc('registrar_adiantamento_entregue', { p_colaborador: quemDados.colaborador_id, p_pessoa: quemDados.colaborador_id ? null : quemDados.pessoa_sem_login_id,
            p_valor: v, p_motivo: d.motivo, p_data_entrega: d.data_entrega || hojeISO(), p_conta: d.origem, p_forma: d.forma, p_lancar_saida: true,
            p_prazo: null, p_cc: d.cc || null, p_obs: null });
          await anexar('adiantamento', id, d.arquivos);
          aviso('Adiantamento registrado como entregue' + (d.origem === fundoF?.id ? ' e lançado no Fundo Fixo.' : '.')); location.hash = '#/adiantamentos/ver/' + id; return;
        }
        const [a] = await api.inserir('adiantamentos', { ...quemDados, conta_prevista_id: d.origem || null,
          valor: v, motivo: d.motivo, data_saida: d.data_saida || null, data_retorno: d.data_retorno || null, centro_custo_id: d.cc || null, status: 'aguardando_aprovacao' });
        aviso(`Adiantamento ${a.numero} enviado para aprovação.`); location.hash = '#/adiantamentos/ver/' + a.id;
      } catch (err) { falha(err); }
    });
  };
});

// ---------- Detalhe e prestação de contas ----------
rota('/adiantamentos/ver/:id', async (tela, id) => {
  const a = await api.um('adiantamentos', `${SELECT_ADT}&id=eq.${id}`);
  if (!a) { tela.innerHTML = '<div class="cartao vazio">Adiantamento não encontrado ou sem acesso.</div>'; return; }
  const [desp, devs, bs, saldos] = await Promise.all([
    api.listar('reembolsos', `${SELECT_REEMB}&adiantamento_id=eq.${id}&status=neq.cancelado&order=data_despesa`),
    api.listar('devolucoes_adiantamento', `adiantamento_id=eq.${id}&cancelado_em=is.null&order=data`).catch(() => []),
    api.listar('contas_bancarias', 'select=*&ativo=eq.true&order=nome').catch(() => []),
    api.listar('v_saldos_contas', 'select=id,saldo').catch(() => [])]);
  const aprovado = desp.filter(r => ['aprovado', 'pago'].includes(r.status)).reduce((s, r) => s + Number(r.valor), 0);
  const emAnalise = desp.filter(r => ['aguardando_aprovacao', 'devolvido'].includes(r.status)).reduce((s, r) => s + Number(r.valor), 0);
  const devolvido = Number(a.valor_devolvido || 0);
  const saldo = Number(a.valor) - aprovado - devolvido;
  const dono = a.colaborador_id === estado.usuario.id;
  const aberto = ['pago', 'prestando_contas'].includes(a.status);
  const fundo = bs.find(b => b.tipo === 'fundo_fixo');
  const editorAdt = await api.rpc('edita_adiantamento_entregue').catch(() => false);
  const anexosEntrega = await htmlAnexos('adiantamento', id);
  const saldoRmb = a.diferenca_coberta_por === 'reembolso' ? await api.um('reembolsos', `select=id,numero,status&acerto_adiantamento_id=eq.${id}&status=neq.cancelado`).catch(() => null) : null;
  const compDev = {}; for (const dv of devs) compDev[dv.id] = await htmlAnexos('devolucao', dv.id);
  tela.innerHTML = `
    <div class="topo"><div><h1>Adiantamento ${esc(a.numero)} · ${esc(nomeAdt(a))}</h1><p class="sub">${tagAdt(a)} · ${esc(a.motivo)}</p></div>
      <div class="acoes">
        ${editaFin() && a.status === 'aprovado' ? '<button class="btn ok" id="entregar">Registrar entrega</button>' : ''}
        ${aberto && (dono || editaFin()) ? `<a class="btn prim" href="#/reembolsos/novo?adt=${id}">+ Lançar despesa da prestação</a>` : ''}
        ${aberto && editaFin() ? '<button class="btn" id="vincular">Trazer despesas já lançadas</button>' : ''}
        ${editaFin() && aberto && saldo > 0.004 ? '<button class="btn" id="devolver">Registrar devolução</button>' : ''}
        ${editaFin() && aberto ? '<button class="btn ok" id="acertar">Fazer o acerto</button>' : ''}
        ${editorAdt && !['acertado', 'cancelado', 'reprovado'].includes(a.status) ? '<button class="btn" id="editar-adt">Editar adiantamento</button>' : ''}
        ${editorAdt && aberto ? '<button class="btn perigo" id="cancelar-entregue">Cancelar adiantamento</button>' : ''}
        ${(editaFin() || dono) && ['aguardando_aprovacao', 'aprovado', 'devolvido'].includes(a.status) ? '<button class="btn perigo" id="cancelar">Cancelar</button>' : ''}
        <button class="btn" onclick="history.back()">Voltar</button></div></div>
    <div class="grade" style="margin-bottom:16px">
      <div class="cartao kpi"><div class="n" style="font-size:22px">${brl(a.valor)}</div><div class="r">adiantado</div></div>
      <div class="cartao kpi"><div class="n" style="font-size:22px">${brl(aprovado)}</div><div class="r">comprovado e aprovado</div></div>
      <div class="cartao kpi ${emAnalise ? 'alerta' : ''}"><div class="n" style="font-size:22px">${brl(emAnalise)}</div><div class="r">em aprovação</div></div>
      <div class="cartao kpi"><div class="n" style="font-size:22px">${brl(devolvido)}</div><div class="r">devolvido</div></div>
      <div class="cartao kpi ${a.status !== 'acertado' && Math.abs(saldo) > 0.004 ? 'alerta' : ''}"><div class="n" style="font-size:22px">${brl(Math.abs(saldo))}</div>
        <div class="r">${a.status === 'acertado' ? (Number(a.valor_assumido_colaborador) > 0 ? 'assumido pelo colaborador' : 'acertado') : saldo > 0.004 ? 'a devolver ou comprovar' : saldo < -0.004 ? 'a complementar ao colaborador' : 'sem diferença'}</div></div>
    </div>
    <div class="cartao"><div class="form">
      <div><div class="muted">Saída / retorno</div><b>${a.data_saida ? dataBR(a.data_saida) : '—'}${a.data_retorno ? ' → ' + dataBR(a.data_retorno) : ''}</b></div>
      <div><div class="muted">Entregue</div><b>${a.data_entrega ? dataBR(a.data_entrega) + ' · ' + esc(a.forma_entrega || '') : '—'}</b>${a.conta_bancaria_id ? `<div class="muted">de ${esc(bs.find(b => b.id === a.conta_bancaria_id)?.nome || '')}</div>` : ''}</div>
      <div><div class="muted">Prestar contas até</div><b>${a.prazo_prestacao ? dataBR(a.prazo_prestacao) : '—'}</b></div>
      ${a.status === 'acertado' ? `<div><div class="muted">Acerto</div><b>${dataHoraBR(a.acertado_em)}</b>${difTxt(a)}${saldoRmb ? `<div><a href="#/reembolsos/ver/${saldoRmb.id}">${esc(saldoRmb.numero)}</a> · ${tag(saldoRmb.status)}</div>` : ''}</div>` : ''}
      <div class="largo"><div class="muted">Comprovante da entrega</div>${anexosEntrega}</div>
      ${a.diferenca_coberta_por === 'fundo_fixo' ? `<div class="largo"><div class="muted">Comprovante do pagamento da diferença</div>${await htmlAnexos('complemento', id)}</div>` : ''}
      ${blocoObservacao(a.observacoes, editaFin())}
    </div></div>
    <div class="cartao"><h2>Despesas da prestação de contas (${desp.length})</h2>${tabelaReembolsos(desp)}</div>
    ${devs.length ? `<div class="cartao"><h2>Devoluções</h2><ul class="lista-simples">${devs.map(dv => `<li style="flex-wrap:wrap"><span>${dataBR(dv.data)} · ${esc(dv.forma)} · ${dv.destino === 'fundo_fixo' ? 'Fundo Fixo' : 'Empresa'} · ${esc(bs.find(b => b.id === dv.conta_bancaria_id)?.nome || '')}${dv.dados_destino ? ' · ' + esc(dv.dados_destino) : ''}</span><b>${brl(dv.valor)}</b>
      <div style="flex-basis:100%"><span class="muted">Comprovante:</span> ${dv.forma === 'Dinheiro' && compDev[dv.id].includes('Sem anexos') ? '<span class="muted">em dinheiro</span>' : compDev[dv.id]}</div></li>`).join('')}</ul></div>` : ''}`;
  ligarLinhas(tela);
  ligarObservacao('adiantamentos', id, a.observacoes);

  // Despesas lançadas como reembolso (ou Fundo Fixo) que eram desta prestação de contas
  $('#vincular')?.addEventListener('click', async () => {
    const campo = a.colaborador_id ? `colaborador_id=eq.${a.colaborador_id}` : `pessoa_sem_login_id=eq.${a.pessoa_sem_login_id}`;
    const cands = (await api.listar('reembolsos', `${SELECT_REEMB}&${campo}&or=(adiantamento_id.is.null,adiantamento_id.neq.${id})&order=data_despesa`)).filter(custeioMutavel);
    if (!cands.length) return aviso('Não há despesas desta pessoa que possam ser trazidas para este adiantamento.');
    let sel = [];
    const r = await modal(`<form><h2>Trazer despesas para ${esc(a.numero)}</h2>
      <div class="aviso-lei">As despesas marcadas deixam de ser reembolso (ou Fundo Fixo) e passam a abater este adiantamento: <b>não</b> geram pagamento ao colaborador.
        Fica registrado no histórico de cada uma quem mudou, quando e o motivo.</div>
      <div class="tabela-wrap" style="max-height:45vh;overflow:auto"><table><thead><tr><th><input type="checkbox" id="vt"></th><th>Nº</th><th>Data</th><th>Descrição</th><th class="num">Valor</th><th>Hoje</th></tr></thead><tbody>
      ${cands.map(r => `<tr><td><input type="checkbox" value="${r.id}" class="vs"></td><td class="nowrap">${esc(r.numero)}</td><td>${dataBR(r.data_despesa)}</td><td>${esc(categoriaTxt(r))} · ${esc(descrTxt(r))}</td><td class="num">${brl(r.valor)}</td><td>${tag(r.status)} ${esc(CUSTEIO[r.forma_custeio || 'reembolso'])}</td></tr>`).join('')}
      </tbody></table></div>
      <p id="vsoma" class="muted">Nenhuma selecionada</p>
      <label class="campo">Motivo<textarea name="motivo" required placeholder="Ex.: despesas da viagem paga com este adiantamento"></textarea></label>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Trazer para a prestação</button></div></form>`, {
      aoAbrir: raiz => {
        const soma = () => { const m = $$('.vs:checked', raiz); sel = m.map(c => c.value); $('#vsoma', raiz).textContent = m.length ? `${m.length} selecionada(s) · ${brl(m.reduce((s, c) => s + Number(cands.find(x => x.id === c.value).valor), 0))}` : 'Nenhuma selecionada'; };
        $$('.vs', raiz).forEach(c => (c.onchange = soma));
        $('#vt', raiz).onchange = e => { $$('.vs', raiz).forEach(c => (c.checked = e.target.checked)); soma(); };
      },
      validar: () => !sel.length ? 'Marque ao menos uma despesa.' : null });
    if (!r) return;
    try { const res = await api.rpc('reclassificar_custeio', { p_ids: sel, p_custeio: 'adiantamento', p_adiantamento: id, p_motivo: r.motivo });
          aviso(`${res.alterados} despesa(s) trazida(s) para a prestação de contas.`); navegar(); } catch (err) { falha(err); }
  });

  const contaOpcoes = (sel, filtro = () => true) => bs.filter(filtro).map(b => `<option value="${b.id}" ${b.id === sel ? 'selected' : ''}>${esc(b.nome)}${b.tipo === 'fundo_fixo' ? ` (saldo ${brl(saldos.find(s => s.id === b.id)?.saldo)})` : ''}</option>`).join('');
  const exigeComprovante = d => d.forma !== 'Dinheiro' && !d.arquivos.length ? 'Anexe o comprovante. Só dinheiro dispensa comprovante.' : null;

  $('#entregar')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Entregar ${esc(a.numero)} · ${brl(a.valor)}</h2><div class="form">
      <label class="campo">Data<input type="date" name="data" value="${hojeISO()}" required></label>
      <label class="campo">Saiu de<select name="conta" required>${contaOpcoes(a.conta_prevista_id || fundo?.id)}</select></label>
      <label class="campo">Forma<select name="forma" required>${FORMAS_DIN.map(x => `<option>${x}</option>`).join('')}</select></label>
      <label class="campo largo">Observação<input name="obs"></label>
      <label class="campo largo">Comprovante (obrigatório, exceto dinheiro)<input type="file" name="arquivos" accept="image/*,application/pdf" multiple></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn ok">Confirmar entrega</button></div></form>`, { validar: exigeComprovante });
    if (!r) return;
    try { await api.rpc('entregar_adiantamento', { p_id: id, p_data: r.data, p_conta: r.conta, p_forma: r.forma, p_obs: r.obs || null });
          await anexar('adiantamento', id, r.arquivos); aviso('Entrega registrada.'); navegar(); } catch (err) { falha(err); }
  });

  $('#devolver')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Devolução de sobra · ${esc(a.numero)}</h2><div class="form">
      <label class="campo">Data<input type="date" name="data" value="${hojeISO()}" required></label>
      <label class="campo">Valor (R$)<input name="valor" inputmode="decimal" value="${saldo.toFixed(2).replace('.', ',')}" required></label>
      <label class="campo">Forma<select name="forma" required>${FORMAS_DIN.map(x => `<option>${x}</option>`).join('')}</select></label>
      <label class="campo">Quem recebe<select name="destino" required><option value="fundo_fixo">Responsável do Fundo Fixo</option><option value="empresa">Empresa (conta bancária)</option></select></label>
      <label class="campo">Conta que recebe<select name="conta" required>${contaOpcoes(fundo?.id)}</select></label>
      <label class="campo largo">Dados de quem recebe (conta ou chave Pix)<input name="dados" value="${esc(dadosConta(fundo))}"></label>
      <label class="campo largo">Observação<input name="obs"></label>
      <label class="campo largo">Comprovante (obrigatório, exceto dinheiro)<input type="file" name="arquivos" accept="image/*,application/pdf" multiple></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn ok">Registrar</button></div></form>`, {
      aoAbrir: raiz => {
        const f = $('form', raiz);
        const sinc = () => { const c = bs.find(b => b.id === f.conta.value); f.dados.value = dadosConta(c); };
        f.destino.onchange = () => { const alvo = f.destino.value === 'fundo_fixo' ? fundo : bs.find(b => b.tipo !== 'fundo_fixo');
          f.conta.innerHTML = contaOpcoes(alvo?.id, b => (f.destino.value === 'fundo_fixo') === (b.tipo === 'fundo_fixo')); sinc(); };
        f.conta.onchange = sinc;
      },
      validar: d => !(num(d.valor) > 0) ? 'Informe o valor devolvido.' : exigeComprovante(d) });
    if (!r) return;
    try {
      const devId = await api.rpc('registrar_devolucao', { p_adiantamento: id, p_data: r.data, p_valor: num(r.valor), p_forma: r.forma,
        p_destino: r.destino, p_conta: r.conta, p_dados: r.dados || null, p_obs: r.obs || null });
      await anexar('devolucao', devId, r.arquivos); aviso('Devolução registrada.'); navegar();
    } catch (err) { falha(err); }
  });

  $('#acertar')?.addEventListener('click', async () => {
    if (emAnalise > 0) return aviso('Ainda há despesas em aprovação. Aprove ou reprove antes do acerto.', true);
    if (saldo > 0.004) return aviso(`Falta ${brl(saldo)}: registre a devolução da sobra antes do acerto.`, true);
    if (saldo >= -0.004) {
      if (!await confirmar('Prestação de contas fecha sem diferença. Confirmar o acerto?', { botao: 'Fazer o acerto' })) return;
      try { await api.rpc('acertar_adiantamento', { p_id: id }); aviso('Adiantamento acertado.'); navegar(); } catch (err) { falha(err); }
      return;
    }
    // gastou a mais: o Financeiro decide quem cobre a diferença
    const dif = -saldo, doFundo = bs.find(b => b.id === a.conta_bancaria_id)?.tipo === 'fundo_fixo';
    const r = await modal(`<form><h2>Acerto · ${esc(a.numero)}</h2>
      <p>O colaborador gastou <b>${brl(dif)}</b> a mais do que recebeu. Quem cobre essa diferença?</p>
      <div class="form"><div class="largo">
        <label class="opcao"><input type="radio" name="quem" value="reembolso" checked>
          <span><b>Gerar reembolso ao colaborador</b> — a diferença vira um reembolso <b>já aprovado</b> e entra em Reembolsos › Aprovados a pagar (sem nova aprovação)</span></label>
        <label class="opcao"><input type="radio" name="quem" value="empresa">
          <span>${doFundo ? '<b>Pagar pelo Fundo Fixo</b> — a diferença sai do fundo agora' : '<b>A empresa paga</b> — vira uma conta a pagar ao colaborador'}</span></label>
        <label class="opcao"><input type="radio" name="quem" value="colaborador">
          <span><b>O colaborador assume</b> — nada é pago nem gerado; fica registrado no adiantamento</span></label></div>
        <div class="largo form" id="pg-fundo" style="padding:0">
          ${doFundo ? `<label class="campo">Data<input type="date" name="data" value="${hojeISO()}"></label>
            <label class="campo">Forma<select name="forma">${FORMAS_DIN.map(x => `<option>${x}</option>`).join('')}</select></label>
            <label class="campo largo">Comprovante (obrigatório, exceto dinheiro)<input type="file" name="arquivos" accept="image/*,application/pdf" multiple></label>`
          : `<label class="campo">Vencimento da conta a pagar<input type="date" name="venc" value="${hojeISO()}"></label>`}</div></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn ok">Fazer o acerto</button></div></form>`, {
      aoAbrir: raiz => { const sinc = () => { $('#pg-fundo', raiz).hidden = $('[name=quem]:checked', raiz).value !== 'empresa'; };
        $$('[name=quem]', raiz).forEach(x => (x.onchange = sinc)); sinc(); },
      validar: d => d.quem === 'empresa' && doFundo && d.forma !== 'Dinheiro' && !d.arquivos?.length ? 'Anexe o comprovante do pagamento. Só dinheiro dispensa comprovante.' : null });
    if (!r) return;
    try {
      const res = await api.rpc('acertar_adiantamento', { p_id: id, p_diferenca: r.quem, p_vencimento: r.venc || hojeISO(), p_forma: r.forma || null, p_data: r.data || hojeISO() });
      if (r.quem === 'empresa' && doFundo) await anexar('complemento', id, r.arquivos);
      aviso(r.quem === 'reembolso' ? `Acerto feito: ${brl(dif)} enviados para reembolso (${res.reembolso_numero}), já aprovado e pronto para pagar.` : r.quem === 'colaborador' ? 'Acerto feito: diferença assumida pelo colaborador.' : doFundo ? 'Acerto feito: diferença paga pelo Fundo Fixo.' : 'Acerto feito: diferença lançada em Contas a pagar.');
      navegar();
    } catch (err) { falha(err); }
  });

  $('#editar-adt')?.addEventListener('click', async () => {
    const ccs = await centros();
    const entregue = !!a.data_entrega;
    const r = await modal(`<form><h2>Editar ${esc(a.numero)}</h2><div class="form">
      <label class="campo">Valor (R$) *<input name="valor" inputmode="decimal" required value="${String(a.valor).replace('.', ',')}"></label>
      ${entregue ? `<label class="campo">Data da entrega<input type="date" name="data" value="${a.data_entrega}" max="${hojeISO()}"></label>
      <label class="campo">Saiu de<select name="conta">${contaOpcoes(a.conta_bancaria_id)}</select></label>
      <label class="campo">Forma<select name="forma">${FORMAS_DIN.map(x => `<option ${x === a.forma_entrega ? 'selected' : ''}>${x}</option>`).join('')}</select></label>` : ''}
      <label class="campo">Prestar contas até<input type="date" name="prazo" value="${a.prazo_prestacao || ''}"></label>
      <label class="campo">Centro de custo<select name="cc">${opcoes(ccs.filter(c => c.ativo || c.id === a.centro_custo_id), null, c => c.nome, a.centro_custo_id, null)}</select></label>
      <label class="campo largo">Motivo do adiantamento<input name="motivo" value="${esc(a.motivo || '')}"></label>
      <label class="campo largo">Por que está alterando? *<textarea name="just" rows="2" required placeholder="Fica registrado no histórico do adiantamento"></textarea></label>
      ${entregue ? '<p class="muted largo" style="margin:0">A saída do dinheiro no extrato da conta é ajustada junto.</p>' : ''}</div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar alterações</button></div></form>`,
      { validar: d => !(num(d.valor) > 0) ? 'Informe o valor.' : !d.just?.trim() ? 'Informe o motivo da alteração.' : null });
    if (!r) return;
    try { const res = await api.rpc('editar_adiantamento', { p_id: id, p_valor: num(r.valor), p_motivo: r.motivo, p_data_entrega: entregue ? r.data : null, p_conta: entregue ? r.conta : null,
            p_forma: entregue ? r.forma : null, p_prazo: r.prazo || null, p_cc: r.cc || null, p_justificativa: r.just });
          aviso('Adiantamento alterado: ' + res.alterado + '.'); navegar(); } catch (err) { falha(err); }
  });
  $('#cancelar-entregue')?.addEventListener('click', async () => {
    const motivo = await confirmar(`Cancelar ${a.numero}? O valor de ${brl(a.valor)} volta para ${bs.find(b => b.id === a.conta_bancaria_id)?.nome || 'a conta de onde saiu'}.`, { comMotivo: true, botao: 'Cancelar adiantamento' });
    if (!motivo) return;
    try { await api.rpc('cancelar_adiantamento', { p_id: id, p_motivo: motivo }); aviso('Adiantamento cancelado e valor devolvido à conta.'); navegar(); } catch (err) { falha(err); }
  });
  $('#cancelar')?.addEventListener('click', async () => {
    const motivo = await confirmar('Cancelar este adiantamento?', { comMotivo: true, botao: 'Cancelar adiantamento' });
    if (!motivo) return;
    try { await api.alterar('adiantamentos', `id=eq.${id}`, { status: 'cancelado', cancelado_em: new Date().toISOString(), cancelado_por: estado.usuario.id, motivo_cancelamento: motivo });
          aviso('Adiantamento cancelado.'); navegar(); } catch (err) { falha(err); }
  });
});

// ---------- Fundo Fixo ----------
rota('/financeiro/fundo', async tela => {
  const fundo = await api.um('contas_bancarias', 'tipo=eq.fundo_fixo&ativo=eq.true&select=*');
  if (!fundo) { tela.innerHTML = '<div class="cartao vazio">Fundo Fixo não cadastrado. Crie em Cadastros → Bancos e caixa com o tipo “fundo_fixo”.</div>'; return; }
  const de = estado.params.get('de') || '', ate = estado.params.get('ate') || '';
  const [movs, saldoV, adts, pendFundo, bs] = await Promise.all([
    api.listar('movimentos_bancarios', `conta_bancaria_id=eq.${fundo.id}&cancelado_em=is.null${de ? '&data=gte.' + de : ''}${ate ? '&data=lte.' + ate : ''}&order=data,criado_em&limit=2000`),
    api.um('v_saldos_contas', `id=eq.${fundo.id}`),
    api.listar('adiantamentos', `${SELECT_ADT}&conta_bancaria_id=eq.${fundo.id}&status=in.(pago,prestando_contas)&order=prazo_prestacao`),
    api.listar('reembolsos', `select=id,numero,valor,status&forma_custeio=eq.fundo_fixo&status=in.(aguardando_aprovacao,devolvido)`),
    api.listar('contas_bancarias', 'select=*&ativo=eq.true&order=nome')]);
  const saldo = Number(saldoV?.saldo || 0);
  // pessoa de cada movimento (quem fez a despesa / recebeu o adiantamento)
  const idsDe = ent => [...new Set(movs.filter(m => m.entidade === ent && m.entidade_id).map(m => m.entidade_id))];
  const [rmbP, adtP] = await Promise.all([
    idsDe('reembolso').length ? api.listar('reembolsos', `select=id,colaborador_nome,colab:usuarios(nome)&id=${lista(idsDe('reembolso'))}`).catch(() => []) : [],
    idsDe('adiantamento').length ? api.listar('adiantamentos', `select=id,colaborador_nome,colab:usuarios(nome)&id=${lista(idsDe('adiantamento'))}`).catch(() => []) : []]);
  const pessoaDe = {}; [...rmbP, ...adtP].forEach(x => { pessoaDe[x.id] = x.colab?.nome || x.colaborador_nome || ''; });
  const pessoaMov = m => pessoaDe[m.entidade_id] || (['transferencia', 'reposicao'].includes(m.origem) ? fundo.responsavel_nome || '' : '');
  const comColab = adts.reduce((s, a) => s + Number(a.valor), 0);
  const aAprovar = pendFundo.reduce((s, r) => s + Number(r.valor), 0);
  // com quem está cada despesa pendente
  const apsF = pendFundo.length ? await api.listar('aprovacoes', `select=entidade_id,aprovador_id,perfil_aprovador,aprovadores,regra&entidade=eq.reembolso&decisao=eq.pendente&entidade_id=${lista(pendFundo.map(r => r.id))}`).catch(() => []) : [];
  const nomesU = porId(await usuarios().catch(() => []));
  const comQuem = [...new Set([...apsF.map(x => aguardandoTxt(x, nomesU) + (souAprovadorDe(x) && ![x.aprovador_id, ...(x.aprovadores || [])].includes(estado.usuario.id) ? ' e você' : '')), ...pendFundo.filter(r => r.status === 'devolvido').map(() => 'quem lançou (devolvida p/ correção)')])];
  const minhas = apsF.some(souAprovadorDe);
  // indicadores do período (ou de todo o histórico, sem filtro)
  const soma = f => movs.filter(f).reduce((x, m) => x + Number(m.valor), 0);
  const depositado = soma(m => ['transferencia', 'reposicao'].includes(m.origem) || (m.origem === 'ajuste' && Number(m.valor) > 0));
  const gasto = -soma(m => ['despesa_fundo', 'baixa'].includes(m.origem));
  const adiantado = -soma(m => ['adiantamento', 'devolucao'].includes(m.origem));
  const periodoTxt = de || ate ? ` (${de ? dataBR(de) : 'início'} a ${ate ? dataBR(ate) : 'hoje'})` : '';
  // saldo linha a linha (quando o período vai até hoje): parte do saldo anterior ao período
  const comSaldo = !ate;
  let acum = saldo - movs.reduce((x, m) => x + Number(m.valor), 0);
  const ORIGEM = { transferencia: 'Transferência', reposicao: 'Reposição', despesa_fundo: 'Despesa', adiantamento: 'Adiantamento entregue', devolucao: 'Devolução', ajuste: 'Ajuste', baixa: 'Pagamento' };
  // despesa devolvida ao fundo (cancelada ou passou a ser reembolso/adiantamento) aparece como estorno, não como despesa
  const tipoMov = m => m.origem === 'despesa_fundo' && Number(m.valor) > 0 ? 'Estorno de despesa' : m.origem === 'baixa' && Number(m.valor) > 0 ? 'Estorno de pagamento' : (ORIGEM[m.origem] || m.origem);
  tela.innerHTML = `
    <div class="topo"><div><h1>Fundo Fixo</h1><p class="sub">Responsável: ${esc(fundo.responsavel_nome || '—')}${fundo.chave_pix ? ' · Pix ' + esc(fundo.chave_pix) : ''}</p></div>
      <div class="acoes">${editaFin() ? `<a class="btn prim" href="#/reembolsos/novo?custeio=fundo_fixo">+ Despesa paga pelo fundo</a>
        <a class="btn" href="#/adiantamentos/novo?origem=fundo">+ Adiantamento pelo fundo</a><button class="btn ok" id="repor">Repor o fundo</button>` : ''}</div></div>
    <div class="grade" style="margin-bottom:16px">
      <div class="cartao kpi"><div class="n">${brl(depositado)}</div><div class="r">total depositado no fundo${periodoTxt}</div></div>
      <div class="cartao kpi"><div class="n">${brl(gasto)}</div><div class="r">total gasto em despesas${periodoTxt}</div></div>
      <div class="cartao kpi"><div class="n">${brl(adiantado)}</div><div class="r">entregue em adiantamentos (líquido)${periodoTxt}</div></div>
      <div class="cartao kpi" style="border-top:3px solid var(--ouro)"><div class="n">${brl(saldo)}</div><div class="r">disponível no fundo hoje</div></div>
      <div class="cartao kpi ${adts.some(adtVencido) ? 'alerta' : ''}"><div class="n">${brl(comColab)}</div><div class="r">${adts.length} adiantamento(s) com colaboradores</div></div>
      <a class="cartao kpi ${aAprovar ? 'alerta' : ''}" href="${minhas ? '#/aprovacoes' : '#/financeiro/reembolsos?status=abertos'}"><div class="n">${brl(aAprovar)}</div><div class="r">${pendFundo.length} despesa(s) do fundo aguardando aprovação${comQuem.length ? `<div class="muted" style="margin-top:4px">com ${esc(comQuem.join(', '))}: ${esc(pendFundo.map(r => r.numero).join(', '))}</div>` : ''}</div></a>
    </div>
    ${adts.length ? `<div class="cartao"><h2>Adiantamentos em aberto</h2>${tabelaAdts(adts)}</div>` : ''}
    <div class="cartao"><div class="topo" style="margin:0 0 8px"><h2 style="margin:0">Extrato do fundo</h2>
      <form class="filtros" id="filtros" style="margin:0"><input type="date" name="de" value="${de}" aria-label="De"><input type="date" name="ate" value="${ate}" aria-label="Até"><button class="btn peq">Filtrar</button></form></div>
      ${movs.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Data</th><th>Tipo</th><th>Pessoa</th><th>Descrição</th><th class="num">Entrada</th><th class="num">Saída</th>${comSaldo ? '<th class="num">Saldo</th>' : ''}</tr></thead><tbody>
      ${movs.map(m => `<tr data-mov="1"${fAttr('tipo', tipoMov(m))}${fAttr('pessoa', pessoaMov(m) || '—')}${fAttr('data', m.data)}${fAttr('valor', m.valor)}${fAttr('busca', [m.descricao, pessoaMov(m)].filter(Boolean).join(' '))} ${m.entidade === 'reembolso' ? `class="clicavel" onclick="location.hash='#/reembolsos/ver/${m.entidade_id}'"` : m.entidade === 'adiantamento' ? `class="clicavel" onclick="location.hash='#/adiantamentos/ver/${m.entidade_id}'"` : ''}>
        <td data-r="Data" class="nowrap">${dataBR(m.data)}</td><td data-r="Tipo">${esc(tipoMov(m))}</td><td data-r="Pessoa">${esc(pessoaMov(m) || '—')}</td><td data-r="Descrição">${esc(m.descricao || '')}</td>
        <td data-r="Entrada" class="num">${m.valor > 0 ? brl(m.valor) : ''}</td><td data-r="Saída" class="num">${m.valor < 0 ? brl(-m.valor) : ''}</td>${comSaldo ? `<td data-r="Saldo" class="num"><b>${brl(acum += Number(m.valor))}</b></td>` : ''}</tr>`).join('')}
      </tbody><tfoot><tr><td colspan="4">Movimento do período</td><td class="num">${brl(movs.filter(m => m.valor > 0).reduce((s, m) => s + Number(m.valor), 0))}</td><td class="num">${brl(-movs.filter(m => m.valor < 0).reduce((s, m) => s + Number(m.valor), 0))}</td>${comSaldo ? `<td class="num">${brl(saldo)}</td>` : ''}</tr></tfoot></table></div>`
      : '<div class="vazio">Sem movimentos no período.</div>'}</div>`;
  $('#filtros').onsubmit = e => { e.preventDefault(); const d = formDados(e.target);
    location.hash = '#/financeiro/fundo?' + new URLSearchParams(Object.entries(d).filter(([, v]) => v)).toString(); };
  filtroLocal(tela, { itens: 'tbody tr[data-mov]', antes: $('.tabela-wrap', tela), campos: [{ k: 'pessoa', rotulo: 'Pessoa' }, { k: 'tipo', rotulo: 'Tipo' }] });
  $('#repor')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Repor o Fundo Fixo</h2><div class="form">
      <label class="campo">Data<input type="date" name="data" value="${hojeISO()}" required></label>
      <label class="campo">Valor (R$)<input name="valor" inputmode="decimal" required></label>
      <label class="campo">Saiu de<select name="conta" required>${bs.filter(b => b.tipo !== 'fundo_fixo').map(b => `<option value="${b.id}" ${b.tipo === 'corrente' ? 'selected' : ''}>${esc(b.nome)}</option>`).join('')}</select></label>
      <label class="campo">Forma<select name="forma">${FORMAS_DIN.map(x => `<option>${x}</option>`).join('')}</select></label>
      <label class="campo largo">Observação<input name="obs" placeholder="Ex.: reposição das despesas de 01 a 15/10"></label>
      <p class="muted largo">Gera uma conta a pagar já paga, em nome de ${esc(fundo.responsavel_nome || 'responsável do fundo')}, como a abertura do fundo.</p>
      <label class="campo largo">Comprovante (obrigatório, exceto dinheiro)<input type="file" name="arquivos" accept="image/*,application/pdf" multiple></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn ok">Repor</button></div></form>`,
      { validar: d => !(num(d.valor) > 0) ? 'Informe o valor.' : d.forma !== 'Dinheiro' && !d.arquivos.length ? 'Anexe o comprovante. Só dinheiro dispensa comprovante.' : null });
    if (!r) return;
    try { const res = await api.rpc('repor_fundo_conta', { p_data: r.data, p_valor: num(r.valor), p_conta_origem: r.conta, p_forma: r.forma, p_obs: r.obs || null });
          if (r.arquivos?.length) await anexarEm([['baixa', res.baixa_id], ['titulo', res.titulo_id], ['reposicao', res.movimento_id]], r.arquivos, 'Comprovante da reposição');
          aviso(`Reposição registrada · conta a pagar ${res.numero} (paga).`); navegar(); } catch (err) { falha(err); }
  });
});

// ===================== Adiantamento já entregue (registro retroativo) =====================
// Para dinheiro que o colaborador já recebeu antes do sistema (ou fora dele): entra direto como "entregue",
// sem aprovação, para que as despesas possam ser vinculadas como prestação de contas.
async function modalAdtRetroativo({ quem = '' } = {}) {
  const [listaPes, bs, ccs] = await Promise.all([pessoasFin(), api.listar('contas_bancarias', 'select=*&ativo=eq.true&order=nome'), centros()]);
  const r = await modal(`<form><h2>Registrar adiantamento já entregue</h2>
    <p class="muted">Use quando o dinheiro já foi entregue ao colaborador antes de existir no sistema. Ele entra como <b>entregue</b>, sem passar por aprovação, e fica registrado quem lançou.</p>
    <div class="form">
      <div class="largo">${htmlPessoaFin(listaPes, quem)}</div>
      <label class="campo">Valor entregue (R$)<input name="valor" inputmode="decimal" required placeholder="0,00"></label>
      <label class="campo">Data da entrega<input type="date" name="data" value="${hojeISO()}" required></label>
      <label class="campo largo">Motivo<input name="motivo" required placeholder="Ex.: viagem Guararapes × Três Lagoas"></label>
      <label class="campo">Saiu de<select name="conta" required>${bs.map(b => `<option value="${b.id}">${esc(b.nome)}</option>`).join('')}</select></label>
      <label class="campo">Forma<select name="forma" required>${FORMAS_DIN.map(x => `<option>${x}</option>`).join('')}</select></label>
      <label class="campo">Prestar contas até<input type="date" name="prazo"></label>
      <label class="campo">Centro de custo<select name="cc">${opcoes(ccs.filter(c => c.ativo), null, c => c.nome, ccs.find(c => c.codigo === 'GERAL')?.id, null)}</select></label>
      <label class="campo largo"><span><input type="checkbox" name="lancar" checked> Lançar a saída do dinheiro no extrato da conta escolhida</span>
        <span class="muted">Desmarque só se essa saída já estiver registrada no extrato (por exemplo, importada do banco ou lançada em Contas a pagar), para não contar duas vezes.</span></label>
      <label class="campo largo">Observação<input name="obs"></label>
      <label class="campo largo">Comprovante da entrega (obrigatório, exceto dinheiro)<input type="file" name="arquivos" accept="image/*,application/pdf" multiple></label>
    </div>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn ok">Registrar</button></div></form>`, {
    aoAbrir: raiz => ligarPessoaFin($('form', raiz), listaPes),
    validar: d => !d.quem ? 'Escolha o colaborador.' : !(num(d.valor) > 0) ? 'Informe o valor.' : d.forma !== 'Dinheiro' && !d.arquivos.length ? 'Anexe o comprovante da entrega. Só dinheiro dispensa comprovante.' : null });
  if (!r) return null;
  const pes = await resolverPessoaFin(r.quem, r.quem_nome, listaPes);
  const id = await api.rpc('registrar_adiantamento_entregue', {
    p_colaborador: pes.colaborador_id, p_pessoa: pes.colaborador_id ? null : pes.pessoa_sem_login_id,
    p_valor: num(r.valor), p_motivo: r.motivo, p_data_entrega: r.data, p_conta: r.conta, p_forma: r.forma,
    p_lancar_saida: !!r.lancar, p_prazo: r.prazo || null, p_cc: r.cc || null, p_obs: r.obs || null });
  if (r.arquivos?.length) await anexar('adiantamento', id, r.arquivos);
  return id;
}

// ===================== Mudar a forma de custeio de despesas já lançadas =====================
const custeioMutavel = r => !['cancelado', 'reprovado', 'em_pagamento'].includes(r.status) && !(r.status === 'pago' && (r.forma_custeio || 'reembolso') !== 'fundo_fixo');
const chavePessoa = r => r.colaborador_id ? 'u:' + r.colaborador_id : r.pessoa_sem_login_id ? 'p:' + r.pessoa_sem_login_id : 'n:' + (r.colaborador_nome || '');

async function modalCusteio(regs) {
  const pessoas = [...new Set(regs.map(chavePessoa))];
  const umaPessoa = pessoas.length === 1 ? pessoas[0] : null;
  const total = regs.reduce((s, r) => s + Number(r.valor), 0);
  const carregarAdts = async () => {
    if (!umaPessoa || umaPessoa.startsWith('n:')) return [];
    const [t, idp] = [umaPessoa[0], umaPessoa.slice(2)];
    return api.listar('adiantamentos', `select=id,numero,valor,motivo,data_entrega,status&status=in.(pago,prestando_contas)&${t === 'u' ? 'colaborador_id' : 'pessoa_sem_login_id'}=eq.${idp}&order=data_entrega.desc`);
  };
  const adts = await carregarAdts();
  const atual = [...new Set(regs.map(r => r.forma_custeio || 'reembolso'))];
  const opAdt = () => adts.length ? adts.map(a => `<option value="${a.id}">${esc(a.numero)} · ${brl(a.valor)} · entregue ${a.data_entrega ? dataBR(a.data_entrega) : '—'} · ${esc(a.motivo)}</option>`).join('')
    : '<option value="">Nenhum adiantamento em aberto para esta pessoa</option>';
  const r = await modal(`<form><h2>Alterar forma de custeio</h2>
    <p>${regs.length} lançamento(s) · ${brl(total)} · hoje: <b>${atual.map(c => CUSTEIO[c]).join(', ')}</b></p>
    <div class="aviso-lei"><b>Como funciona</b><ul>
      <li><b>Reembolso</b>: o colaborador pagou do próprio bolso e a empresa devolve o valor (gera conta a pagar).</li>
      <li><b>Prestação de contas de adiantamento</b>: o colaborador recebeu o dinheiro antes; a despesa abate o adiantamento e <b>não</b> gera pagamento. A sobra é devolvida; a falta é acertada no fechamento do adiantamento.</li>
      <li><b>Fundo Fixo</b>: pago com o dinheiro do fundo; ao ser aprovado, sai do saldo do fundo.</li></ul>
      Fica registrado no histórico de cada lançamento quem mudou, quando e o motivo. Lançamentos já pagos como reembolso precisam ter o pagamento estornado antes (no lançamento: Ver pagamento › Estornar pagamento).</div>
    <div class="form">
      <label class="campo largo">Nova forma<select name="custeio" required>
        <option value="adiantamento">Prestação de contas de adiantamento</option><option value="reembolso">Reembolso</option><option value="fundo_fixo">Fundo Fixo</option></select></label>
      <label class="campo largo" id="c-adt">Adiantamento<select name="adt">${opAdt()}</select>
        ${umaPessoa && !umaPessoa.startsWith('n:') ? '<button type="button" class="btn peq" id="novo-adt" style="margin-top:6px">+ Registrar adiantamento já entregue</button>' : '<span class="muted">Selecione lançamentos de uma única pessoa para vincular a um adiantamento.</span>'}</label>
      <label class="campo largo">Motivo da alteração<textarea name="motivo" required placeholder="Ex.: despesas da viagem de 05/10, pagas com o adiantamento entregue em 03/10"></textarea></label>
    </div>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Alterar</button></div></form>`, {
    aoAbrir: (raiz, fechar) => {
      const f = $('form', raiz);
      const sinc = () => { $('#c-adt', raiz).hidden = f.custeio.value !== 'adiantamento'; };
      f.custeio.onchange = sinc; sinc();
      $('#novo-adt', raiz)?.addEventListener('click', () => fechar({ _novoAdt: true, motivo: f.motivo.value }));
    },
    validar: d => d.custeio === 'adiantamento' && !d.adt ? 'Escolha o adiantamento (ou registre o que já foi entregue).' : !d.motivo?.trim() ? 'Informe o motivo.' : null });
  if (!r) return false;
  if (r._novoAdt) {
    try { await modalAdtRetroativo({ quem: umaPessoa }); } catch (err) { falha(err); }
    return modalCusteio(regs);
  }
  const res = await api.rpc('reclassificar_custeio', { p_ids: regs.map(x => x.id), p_custeio: r.custeio, p_adiantamento: r.custeio === 'adiantamento' ? r.adt : null, p_motivo: r.motivo });
  aviso(`${res.alterados} lançamento(s) alterado(s) para ${CUSTEIO[r.custeio]}.`);
  return r.custeio === 'adiantamento' ? r.adt : true;
}
