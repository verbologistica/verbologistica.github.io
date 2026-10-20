// Verbo Gestão — Compras: requisição → cotação → aprovação da compra → pedido → documentos fiscais (NF/boleto → conta a pagar) + recebimento do produto (almoxarifado)
'use strict';

Object.assign(STATUS, {
  aguardando_cotacao: ['Aguardando cotação', 'amarelo'], em_cotacao: ['Em cotação', 'azul'], pedido_emitido: ['Pedido emitido', 'azul'],
  faturada: ['Faturada · aguardando entrega', 'azul'], entregue: ['Produto recebido · falta NF', 'amarelo'],
  recebida: ['Recebida', 'verde'], emitido: ['Emitido', 'azul'], faturado: ['Faturado · aguardando entrega', 'azul'], parcialmente_recebido: ['Recebido em parte', 'amarelo'],
  recebido: ['Faturado e recebido', 'verde'], conferido: ['Conferido', 'verde'], com_divergencia: ['Com divergência', 'vermelho'],
});
const URGENCIA = { baixa: 'Baixa', normal: 'Normal', alta: 'Alta (urgente)' };
const UNIDADES = ['un', 'pç', 'cx', 'kg', 'l', 'm', 'm²', 'par', 'jogo', 'serviço', 'mês'];
const ehComprador = () => tem('administrador', 'comprador');
const veCompras = () => veTudo() || tem('comprador', 'aprovador');
const minimoCot = v => (v <= 1000 ? 1 : v <= 5000 ? 2 : 3);   // espelha regras_cotacao (mínimo obrigatório)
const SELECT_REQ = 'select=*,cc:centros_custo(nome),solic:usuarios!requisicoes_solicitante_id_fkey(nome)';
const nomeForn = f => rotForn(f);

async function listarReq(consulta) {
  try { return await api.listar('requisicoes', `${SELECT_REQ}&${consulta}`); }
  catch { return api.listar('requisicoes', `select=*,cc:centros_custo(nome)&${consulta}`); }   // se o nome da relação mudar
}

function tabelaReq(linhas, comSolic = true) {
  if (!linhas.length) return '<div class="vazio">Nenhuma requisição.</div>';
  return `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nº</th><th>Data</th>${comSolic ? '<th>Solicitante</th>' : ''}<th>O que precisa</th><th>Urgência</th><th class="num">Estimado</th><th>Situação</th></tr></thead><tbody>
    ${linhas.map(r => `<tr class="clicavel" onclick="location.hash='#/compras/requisicoes/ver/${r.id}'"><td data-r="Nº" class="nowrap">${esc(r.numero)}</td>
      <td data-r="Data">${dataBR(r.criado_em)}</td>${comSolic ? `<td data-r="Solicitante">${esc(r.solic?.nome || '')}</td>` : ''}
      <td data-r="O que precisa">${esc(r.justificativa || '')}</td><td data-r="Urgência">${r.urgencia === 'alta' ? '<span class="tag vermelho">Urgente</span>' : esc(URGENCIA[r.urgencia] || '')}</td>
      <td data-r="Estimado" class="num">${brl(r.valor_estimado)}</td><td data-r="Situação">${tag(r.status)}</td></tr>`).join('')}
  </tbody></table></div>`;
}

// ---------- Requisições ----------
rota('/compras/requisicoes', async tela => {
  // todos consultam as requisições e o andamento; só quem abriu edita
  const todas = true;
  const sts = pLista('status', 'todas'), st = sts[0];
  const mapaF = { abertas: 'status=in.(rascunho,aguardando_cotacao,em_cotacao,aguardando_aprovacao,aprovada,pedido_emitido,faturada,entregue)', a_cotar: 'status=in.(aguardando_cotacao,em_cotacao)',
                   concluidas: 'status=in.(recebida,reprovada,cancelada)', todas: 'status=neq.cancelada' };
  const filtro = filtroOu(sts.map(s => mapaF[s] ?? mapaF.todas)) || mapaF.todas;
  const minhas = estado.params.get('minhas') === '1';
  const ls = await listarReq(`${filtro}${minhas ? '&solicitante_id=eq.' + estado.usuario.id : ''}&order=criado_em.desc&limit=500`);
  tela.innerHTML = `
    <div class="topo"><div><h1>${minhas ? 'Minhas requisições' : 'Requisições de compra'}</h1><p class="sub">Peça aqui o que precisa comprar. Compras cota, a compra é aprovada e o pedido é emitido.</p></div>
      <a class="btn prim" href="#/compras/requisicoes/nova">+ Nova requisição</a></div>
    <form class="filtros" id="filtros"><select name="status">${[['abertas', 'Em andamento'], ['a_cotar', 'A cotar'], ['concluidas', 'Concluídas'], ['todas', 'Todas']]
      .map(([v, t]) => `<option value="${v}" ${v === st ? 'selected' : ''}>${t}</option>`).join('')}</select>
      ${todas ? `<label class="check"><input type="checkbox" name="minhas" ${minhas ? 'checked' : ''}> Só as minhas</label>` : ''}<button class="btn">Filtrar</button></form>
    <div class="cartao">${tabelaReq(ls, !minhas)}</div>`;
  $('#filtros').onsubmit = e => { e.preventDefault(); const d = formDados(e.target);
    location.hash = '#/compras/requisicoes?status=' + d.status + (d.minhas ? '&minhas=1' : ''); };
});

// ---------- Nova / editar requisição ----------
rota('/compras/requisicoes/nova', tela => formRequisicao(tela));
rota('/compras/requisicoes/editar/:id', async (tela, id) => formRequisicao(tela, await api.um('requisicoes', `id=eq.${id}`)));

async function formRequisicao(tela, r = null) {
  if (r && r.solicitante_id !== estado.usuario.id) { tela.innerHTML = '<div class="cartao vazio">Só quem abriu a requisição pode editá-la.</div>'; return; }
  if (r && !['rascunho', 'devolvida'].includes(r.status)) {
    tela.innerHTML = '<div class="cartao vazio">Esta requisição não pode mais ser alterada.</div>'; return;
  }
  const [ccs, itens] = await Promise.all([centros(), r ? api.listar('requisicao_itens', `requisicao_id=eq.${r.id}&order=id`) : []]);
  const ccPadrao = r?.centro_custo_id || estado.usuario.centro_custo_id || ccs.find(c => c.codigo === 'GERAL')?.id;
  const temAprov = r ? (await api.listar('anexos', `entidade=eq.requisicao&entidade_id=eq.${r.id}&descricao=eq.${encodeURIComponent('Aprovação do gestor')}&cancelado_em=is.null&select=id`).catch(() => [])).length > 0 : false;
  const linhaItem = (i = {}) => `<tr class="item">
      <td data-r="Descrição"><input name="i_desc" value="${esc(i.descricao || '')}" placeholder="Ex.: pneu 295/80 R22,5 liso" aria-label="Descrição"></td>
      <td data-r="Qtd."><input name="i_qtd" inputmode="decimal" value="${i.quantidade != null ? String(Number(i.quantidade)).replace('.', ',') : '1'}" aria-label="Quantidade" style="width:70px"></td>
      <td data-r="Unid."><select name="i_un" aria-label="Unidade">${UNIDADES.map(u => `<option ${u === (i.unidade || 'un') ? 'selected' : ''}>${u}</option>`).join('')}</select></td>
      <td data-r="Valor unit. estimado"><input name="i_val" inputmode="decimal" value="${i.valor_estimado ? Number(i.valor_estimado).toFixed(2).replace('.', ',') : ''}" placeholder="0,00" aria-label="Valor unitário estimado" style="width:110px"></td>
      <td data-r="Subtotal" class="num sub-item-v">—</td>
      <td><button type="button" class="btn peq perigo rem" aria-label="Remover item">✕</button></td></tr>`;
  tela.innerHTML = `
    <div class="topo"><div><h1>${r ? 'Editar requisição ' + esc(r.numero) : 'Nova requisição de compra'}</h1>
      <p class="sub">Descreva o que precisa e anexe a aprovação do gestor. O valor estimado define quantas cotações Compras precisa buscar (até R$ 1.000: 1 · até R$ 5.000: 2 · acima: 3).</p></div></div>
    <form class="cartao form" id="f-req">
      <label class="campo largo">Para que é a compra?<input name="justificativa" required value="${esc(r?.justificativa || '')}" placeholder="Ex.: troca dos pneus dianteiros do caminhão ABC-1D23"></label>
      <label class="campo">Centro de custo<select name="cc">${opcoes(ccs.filter(c => c.ativo), null, c => c.nome, ccPadrao, null)}</select></label>
      <label class="campo">Precisa até<input type="date" name="data_necessidade" value="${r?.data_necessidade || ''}"></label>
      <label class="campo">Urgência<select name="urgencia">${Object.entries(URGENCIA).map(([v, t]) => `<option value="${v}" ${v === (r?.urgencia || 'normal') ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <div class="largo"><b>Itens</b>
        <div class="tabela-wrap"><table class="responsiva itens-req"><thead><tr><th>Descrição</th><th>Qtd.</th><th>Unid.</th><th>Valor unit. estimado</th><th class="num">Subtotal</th><th></th></tr></thead>
        <tbody id="itens">${(itens.length ? itens : [{}]).map(linhaItem).join('')}</tbody></table></div>
        <button type="button" class="btn peq" id="mais-item" style="margin-top:8px">+ Item</button>
        <div class="conferencia" style="margin-top:10px">Total estimado: <b id="total-est">R$ 0,00</b> · <span id="min-cot" class="muted"></span></div></div>
      <label class="campo largo" style="border-left:4px solid var(--ouro);padding-left:10px">Aprovação do gestor — obrigatório para enviar a Compras
        <input type="file" name="arq_aprov" multiple>
        <span class="muted">Qualquer tipo de arquivo: print do WhatsApp, e-mail, PDF, foto do documento assinado, planilha…${temAprov ? ' <b>Já anexada</b> — inclua outra só se precisar.' : ''}</span></label>
      <label class="campo largo">Outros anexos (foto, link do produto, orçamento que você já tem)<input type="file" name="arquivos" multiple></label>
      ${r ? `<div class="largo">Anexos atuais: ${await htmlAnexos('requisicao', r.id)}</div>` : ''}
      <div class="largo acoes"><button class="btn prim" value="enviar">${r && r.status !== 'rascunho' && r.status !== 'devolvida' ? 'Salvar' : 'Enviar para Compras'}</button>
        ${!r || ['rascunho', 'devolvida'].includes(r.status) ? '<button class="btn" value="rascunho">Salvar rascunho</button>' : ''}<a class="btn" href="javascript:history.back()">Cancelar</a></div>
    </form>`;
  const f = $('#f-req'), corpo = $('#itens');
  const lerItens = () => $$('tr.item', corpo).map(tr => ({ descricao: $('[name=i_desc]', tr).value.trim(), quantidade: num($('[name=i_qtd]', tr).value) || 0,
    unidade: $('[name=i_un]', tr).value, valor_estimado: num($('[name=i_val]', tr).value) || 0, tr })).filter(i => i.descricao);
  const recalcular = () => {
    let total = 0;
    $$('tr.item', corpo).forEach(tr => { const q = num($('[name=i_qtd]', tr).value) || 0, v = num($('[name=i_val]', tr).value) || 0;
      total += q * v; $('.sub-item-v', tr).textContent = q * v ? brl(q * v) : '—'; });
    $('#total-est').textContent = brl(total);
    $('#min-cot').textContent = total ? `mínimo de ${minimoCot(total)} cotação(ões)` : 'informe os valores estimados, se souber';
    return total;
  };
  const ligar = () => { $$('.rem', corpo).forEach(b => (b.onclick = () => { if ($$('tr.item', corpo).length > 1) b.closest('tr').remove(); else $$('input', b.closest('tr')).forEach(i => (i.value = '')); recalcular(); }));
    $$('input', corpo).forEach(i => (i.oninput = recalcular)); };
  $('#mais-item').onclick = () => { corpo.insertAdjacentHTML('beforeend', linhaItem()); ligar(); $('tr.item:last-child [name=i_desc]', corpo).focus(); };
  ligar(); recalcular();
  f.onsubmit = async e => {
    e.preventDefault();
    const d = formDados(f), acao = e.submitter?.value || 'enviar';
    const its = lerItens();
    if (!its.length) return aviso('Inclua pelo menos um item.', true);
    if (its.some(i => !(i.quantidade > 0))) return aviso('Informe a quantidade de cada item.', true);
    const total = Math.round(its.reduce((s, i) => s + i.quantidade * i.valor_estimado, 0) * 100) / 100;
    const vaiEnviar = acao === 'enviar' && (!r || ['rascunho', 'devolvida'].includes(r.status));
    if (vaiEnviar && !temAprov && !d.arq_aprov.length) return aviso('Anexe a aprovação do gestor para enviar a requisição a Compras (ou salve como rascunho).', true);
    await ocupado(e.submitter, async () => {
      try {
        const dados = { justificativa: d.justificativa, centro_custo_id: d.cc || null, data_necessidade: d.data_necessidade || null, urgencia: d.urgencia, valor_estimado: total };
        let id = r?.id, numero = r?.numero;
        if (r) {
          // itens só podem ser trocados com a requisição em rascunho (ou por Compras)
          if (r.status === 'devolvida') await api.alterar('requisicoes', `id=eq.${id}`, { status: 'rascunho' });
          await api.alterar('requisicoes', `id=eq.${id}`, dados);
          await api.excluir('requisicao_itens', `requisicao_id=eq.${id}`);
        } else {
          const [nova] = await api.inserir('requisicoes', { ...dados, solicitante_id: estado.usuario.id, status: 'rascunho' });
          id = nova.id; numero = nova.numero;
        }
        await api.inserir('requisicao_itens', its.map(i => ({ requisicao_id: id, descricao: i.descricao, quantidade: i.quantidade, unidade: i.unidade, valor_estimado: i.valor_estimado })));
        await anexar('requisicao', id, d.arq_aprov, 'Aprovação do gestor');
        await anexar('requisicao', id, d.arquivos);
        if (vaiEnviar) {
          await api.alterar('requisicoes', `id=eq.${id}`, { status: 'aguardando_cotacao' });
          aviso(`Requisição ${numero} enviada para Compras.`);
        } else aviso('Requisição salva.');
        location.hash = '#/compras/requisicoes/ver/' + id;
      } catch (err) { falha(err); }
    });
  };
}

// ---------- Detalhe da requisição ----------
rota('/compras/requisicoes/ver/:id', async (tela, id) => {
  const [r] = await listarReq(`id=eq.${id}`);
  if (!r) { tela.innerHTML = '<div class="cartao vazio">Requisição não encontrada ou sem acesso.</div>'; return; }
  const [itens, cots, peds] = await Promise.all([
    api.listar('requisicao_itens', `requisicao_id=eq.${id}&order=id`),
    api.listar('cotacoes', `requisicao_id=eq.${id}&order=criado_em.desc`).catch(() => []),
    api.listar('pedidos', `requisicao_id=eq.${id}&order=criado_em.desc`).catch(() => [])]);
  const dono = r.solicitante_id === estado.usuario.id;
  const cot = cots.find(c => c.status !== 'cancelada');
  if (cots.length) { const nps = await api.listar('cotacao_propostas', `cotacao_id=${lista(cots.map(c => c.id))}&select=cotacao_id`).catch(() => []); cots.forEach(c => (c._props = nps.some(p => p.cotacao_id === c.id))); }
  const podeEditar = dono && ['rascunho', 'devolvida'].includes(r.status);   // só quem abriu edita
  tela.innerHTML = `
    <div class="topo"><div><h1>Requisição ${esc(r.numero)}</h1><p class="sub">${tag(r.status)} · ${esc(r.justificativa || '')}</p></div>
      <div class="acoes">
        ${ehComprador() && ['aguardando_cotacao', 'em_cotacao'].includes(r.status) ? `<button class="btn prim" id="cotar">${cot ? 'Abrir cotação' : 'Iniciar cotação'}</button>` : ''}
        ${dono && ['rascunho', 'devolvida'].includes(r.status) ? '<button class="btn prim" id="enviar">Enviar para Compras</button>' : ''}
        ${podeEditar ? `<a class="btn" href="#/compras/requisicoes/editar/${id}">Editar</a>` : ''}
        ${(dono || ehComprador()) && ['rascunho', 'devolvida', 'aguardando_cotacao', 'em_cotacao', 'aguardando_aprovacao'].includes(r.status) ? '<button class="btn perigo" id="cancelar">Cancelar</button>' : ''}
        ${(dono || ehComprador()) && ['rascunho', 'devolvida', 'aguardando_cotacao', 'cancelada'].includes(r.status) && !cots.some(c => c.status !== 'cancelada' && c._props) ? '<button class="btn perigo" id="excluir">Excluir</button>' : ''}
        ${itens.length && r.status !== 'cancelada' ? '<button class="btn" id="pdf-cot">⬇ PDF para cotação</button>' : ''}
        <button class="btn" onclick="history.back()">Voltar</button></div></div>
    <div class="cartao"><div class="form">
      <div><div class="muted">Solicitante</div><b>${esc(r.solic?.nome || '')}</b><div class="muted">${dataHoraBR(r.criado_em)}</div></div>
      <div><div class="muted">Centro de custo</div><b>${esc(r.cc?.nome || '—')}</b></div>
      <div><div class="muted">Precisa até</div><b>${r.data_necessidade ? dataBR(r.data_necessidade) : '—'}</b> ${r.urgencia === 'alta' ? '<span class="tag vermelho">Urgente</span>' : ''}</div>
      <div><div class="muted">Estimado</div><b>${brl(r.valor_estimado)}</b><div class="muted">mínimo de ${minimoCot(Number(r.valor_estimado))} cotação(ões)</div></div>
      ${r.motivo_cancelamento ? `<div class="largo alerta-obs"><b>Cancelada:</b> ${esc(r.motivo_cancelamento)}</div>` : ''}
      <div class="largo"><div class="muted">Anexos</div>${await htmlAnexos('requisicao', id)}</div>
    </div></div>
    <div class="cartao" id="lt-req"><h2>Acompanhamento</h2><div class="muted">Carregando etapas…</div></div>
    <div class="cartao"><h2>Itens</h2>${tabelaItens(itens.map(i => ({ ...i, valor: i.valor_estimado })), 'Valor unit. estimado')}</div>
    ${cots.length ? `<div class="cartao"><h2>Cotação</h2><ul class="lista-simples">${cots.map(c => `<li>${veCompras() ? `<a href="#/compras/cotacoes/ver/${c.id}">${esc(c.numero)}</a>` : esc(c.numero)} ${tag(c.status)}${c.comentario_aprovacao ? `<br><span class="muted">${esc(c.comentario_aprovacao)}</span>` : ''}</li>`).join('')}</ul></div>` : ''}
    ${peds.length ? `<div class="cartao"><h2>Pedido de compra</h2><ul class="lista-simples">${peds.map(p => `<li><a href="#/compras/pedidos/ver/${p.id}">${esc(p.numero)}</a> ${tag(p.status)}<b>${brl(p.valor_total)}</b></li>`).join('')}</ul></div>` : ''}`;
  linhaTempoReq(id, $('#lt-req'));
  $('#pdf-cot')?.addEventListener('click', e => ocupado(e.currentTarget, async () => { try { await pdfSolicitacaoCotacao(r, itens); } catch (err) { falha(err); } }));
  $('#cotar')?.addEventListener('click', async e => ocupado(e.target, async () => {
    try { const c = await api.rpc('abrir_cotacao', { p_requisicao: id }); location.hash = '#/compras/cotacoes/ver/' + c; } catch (err) { falha(err); }
  }));
  $('#enviar')?.addEventListener('click', async e => {
    const tem_ = (await api.listar('anexos', `entidade=eq.requisicao&entidade_id=eq.${id}&descricao=eq.${encodeURIComponent('Aprovação do gestor')}&cancelado_em=is.null&select=id`).catch(() => [])).length;
    let arqs = [];
    if (!tem_) {
      const m = await modal(`<form><h2>Aprovação do gestor</h2><p>Para enviar a Compras, anexe a aprovação do gestor (print, e-mail, PDF, foto… qualquer arquivo).</p>
        <label class="campo largo">Arquivo(s)<input type="file" name="arq" multiple required></label>
        <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Anexar e enviar</button></div></form>`, { validar: d => d.arq.length ? null : 'Escolha o arquivo.' });
      if (!m) return; arqs = m.arq;
    }
    await ocupado(e.target, async () => {
      try { await anexar('requisicao', id, arqs, 'Aprovação do gestor'); await api.alterar('requisicoes', `id=eq.${id}`, { status: 'aguardando_cotacao' }); aviso('Enviada para Compras.'); navegar(); } catch (err) { falha(err); }
    });
  });
  $('#cancelar')?.addEventListener('click', async () => {
    const motivo = await confirmar(`Cancelar esta requisição?${cot ? ' A cotação e a aprovação pendente também são canceladas.' : ''}`, { comMotivo: true, botao: 'Cancelar requisição' });
    if (!motivo) return;
    try { await api.rpc('cancelar_requisicao', { p_requisicao: id, p_motivo: motivo }); aviso('Requisição cancelada.'); navegar(); } catch (err) { falha(err); }
  });
  $('#excluir')?.addEventListener('click', async () => {
    if (!await confirmar(`Excluir a requisição ${r.numero}? Ela some da lista (só é possível porque ainda não foi cotada).`, { botao: 'Excluir requisição' })) return;
    try { await api.rpc('excluir_requisicao', { p_requisicao: id }); aviso(`Requisição ${r.numero} excluída.`); location.hash = '#/compras/requisicoes'; } catch (err) { falha(err); }
  });
});

function tabelaItens(itens, rotuloValor = 'Valor unit.') {
  if (!itens.length) return '<div class="vazio">Sem itens.</div>';
  const total = itens.reduce((s, i) => s + Number(i.quantidade) * Number(i.valor || 0), 0);
  return `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Descrição</th><th class="num">Qtd.</th><th>Unid.</th><th class="num">${rotuloValor}</th><th class="num">Subtotal</th></tr></thead><tbody>
    ${itens.map(i => `<tr><td data-r="Descrição">${esc(i.descricao)}</td><td data-r="Qtd." class="num">${Number(i.quantidade).toLocaleString('pt-BR')}</td><td data-r="Unid.">${esc(i.unidade)}</td>
      <td data-r="${rotuloValor}" class="num">${i.valor ? brl(i.valor) : '—'}</td><td data-r="Subtotal" class="num">${i.valor ? brl(Number(i.quantidade) * Number(i.valor)) : '—'}</td></tr>`).join('')}
  </tbody>${total ? `<tfoot><tr><td colspan="4">Total</td><td class="num"><b>${brl(total)}</b></td></tr></tfoot>` : ''}</table></div>`;
}

// ---------- Cotações ----------
rota('/compras/cotacoes', async tela => {
  const sts = pLista('status', 'todas'), st = sts[0];
  const mapaF = { abertas: 'status=in.(aberta,aguardando_aprovacao)', aprovadas: 'status=eq.aprovada', todas: 'status=neq.cancelada' };
  const filtro = filtroOu(sts.map(s => mapaF[s] ?? mapaF.todas)) || mapaF.todas;
  const [aCotar, cots] = await Promise.all([
    ehComprador() ? listarReq('status=eq.aguardando_cotacao&order=urgencia.desc,criado_em') : [],
    api.listar('cotacoes', `select=*,req:requisicoes(numero,justificativa,valor_estimado,urgencia),propostas:cotacao_propostas(valor_total,vencedora)&${filtro}&order=criado_em.desc&limit=300`)]);
  tela.innerHTML = `
    <div class="topo"><div><h1>Cotações</h1><p class="sub">Mínimo obrigatório: até R$ 1.000 → 1 cotação · até R$ 5.000 → 2 · acima de R$ 5.000 → 3 (pode incluir mais)</p></div></div>
    ${aCotar.length ? `<div class="cartao"><h2>Requisições aguardando cotação (${aCotar.length})</h2>${tabelaReq(aCotar)}</div>` : ''}
    <form class="filtros" id="filtros"><select name="status">${[['abertas', 'Em andamento'], ['aprovadas', 'Aprovadas'], ['todas', 'Todas']].map(([v, t]) => `<option value="${v}" ${v === st ? 'selected' : ''}>${t}</option>`).join('')}</select><button class="btn">Filtrar</button></form>
    <div class="cartao">${cots.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nº</th><th>Requisição</th><th>Para que</th><th>Propostas</th><th class="num">Escolhida</th><th>Situação</th></tr></thead><tbody>
      ${cots.map(c => { const venc = c.propostas.find(p => p.vencedora); const menor = c.propostas.length ? Math.min(...c.propostas.map(p => Number(p.valor_total))) : 0;
        const exig = minimoCot(Number(venc?.valor_total || menor || c.req?.valor_estimado || 0));
        return `<tr class="clicavel" onclick="location.hash='#/compras/cotacoes/ver/${c.id}'"><td data-r="Nº" class="nowrap">${esc(c.numero)}</td><td data-r="Requisição">${esc(c.req?.numero || '')}</td>
        <td data-r="Para que">${esc(c.req?.justificativa || '')}</td><td data-r="Propostas">${c.propostas.length} de ${exig} ${c.status === 'aberta' && c.propostas.length < exig ? '<span class="tag amarelo" title="Inclua mais orçamentos ou, se não houver outro fornecedor, informe o motivo ao enviar">faltam</span>' : ''}${c.justificativa_menos_orcamentos ? ' <span class="tag" title="' + esc(c.justificativa_menos_orcamentos) + '">justificado</span>' : ''}</td>
        <td data-r="Escolhida" class="num">${venc ? brl(venc.valor_total) : '—'}</td><td data-r="Situação">${tag(c.status)}</td></tr>`; }).join('')}
    </tbody></table></div>` : '<div class="vazio">Nenhuma cotação.</div>'}</div>`;
  $('#filtros').onsubmit = e => { e.preventDefault(); location.hash = '#/compras/cotacoes?status=' + formDados(e.target).status; };
});

rota('/compras/cotacoes/ver/:id', async (tela, id) => {
  const c = await api.um('cotacoes', `id=eq.${id}&select=*`);
  if (!c) { tela.innerHTML = '<div class="cartao vazio">Cotação não encontrada ou sem acesso.</div>'; return; }
  const [[r], itens, props, forns, aprs] = await Promise.all([
    listarReq(`id=eq.${c.requisicao_id}`),
    api.listar('requisicao_itens', `requisicao_id=eq.${c.requisicao_id}&order=id`),
    api.listar('cotacao_propostas', `cotacao_id=eq.${id}&order=valor_total`),
    fornecedores(true),
    api.listar('aprovacoes', `entidade=eq.cotacao&entidade_id=eq.${id}&order=solicitado_em`).catch(() => [])]);
  const fs = porId(forns);
  const menor = props.length ? Math.min(...props.map(p => Number(p.valor_total))) : 0;
  const venc = props.find(p => p.vencedora);
  const exig = minimoCot(Number(venc?.valor_total || menor || r?.valor_estimado || 0));
  const aberta = c.status === 'aberta' && ehComprador();
  const anx = {}; await Promise.all(props.map(async p => (anx[p.id] = await htmlAnexos('proposta', p.id))));
  const conta = c.conta_id ? (await contas()).find(x => x.id === c.conta_id) : null;
  const apPend = aprs.find(a => a.decisao === 'pendente');
  const souAprovador = apPend && (apPend.aprovador_id === estado.usuario.id || (apPend.perfil_aprovador && tem(apPend.perfil_aprovador))) && c.comprador_id !== estado.usuario.id;
  tela.innerHTML = `
    <div class="topo"><div><h1>Cotação ${esc(c.numero)}</h1><p class="sub">${tag(c.status)} · Requisição <a href="#/compras/requisicoes/ver/${c.requisicao_id}">${esc(r?.numero || '')}</a> · ${esc(r?.justificativa || '')}</p></div>
      <div class="acoes">${aberta ? '<button class="btn" id="nova-prop">+ Proposta</button><button class="btn prim" id="enviar">Enviar para aprovação</button>' : ''}
        ${souAprovador ? '<a class="btn prim" href="#/aprovacoes">Decidir em Aprovações</a>' : ''}
        ${ehComprador() && ['aberta', 'aguardando_aprovacao'].includes(c.status) ? '<button class="btn perigo" id="cancelar-cot">Cancelar compra</button>' : ''}
        <button class="btn" onclick="history.back()">Voltar</button></div></div>
    ${c.status === 'aguardando_aprovacao' && c.comprador_id === estado.usuario.id ? '<div class="cartao alerta-obs">Esta compra está com o aprovador. Quem cotou não aprova a própria compra; se foi um teste ou não vai mais acontecer, use <b>Cancelar compra</b>.</div>' : ''}
    ${c.status === 'aberta' && c.comentario_aprovacao ? `<div class="cartao alerta-obs"><b>Devolvida pelo aprovador:</b> ${esc(c.comentario_aprovacao)}</div>` : ''}
    <div class="grade" style="margin-bottom:16px">
      <div class="cartao kpi ${c.status === 'aberta' && props.length < exig ? 'alerta' : ''}"><div class="n">${props.length} / ${exig}</div><div class="r">propostas (mínimo obrigatório)${c.status === 'aberta' && props.length && props.length < exig ? '<br><span style="color:var(--texto)">Sem outro fornecedor possível? Envie para aprovação informando o motivo.</span>' : ''}</div></div>
      <div class="cartao kpi"><div class="n" style="font-size:22px">${brl(r?.valor_estimado)}</div><div class="r">estimado na requisição</div></div>
      <div class="cartao kpi"><div class="n" style="font-size:22px">${props.length ? brl(menor) : '—'}</div><div class="r">menor proposta</div></div>
      ${venc ? `<div class="cartao kpi"><div class="n" style="font-size:22px">${brl(venc.valor_total)}</div><div class="r">escolhida · ${esc(nomeForn(fs[venc.fornecedor_id]))}</div></div>` : ''}
    </div>
    <div class="cartao"><h2>Propostas</h2>
      ${props.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Fornecedor</th><th class="num">Valor total</th><th>Entrega</th><th>Pagamento</th><th>Validade</th><th>Orçamento</th><th></th></tr></thead><tbody>
        ${props.map(p => `<tr><td data-r="Fornecedor"><b>${esc(nomeForn(fs[p.fornecedor_id]))}</b>${p.vencedora ? ' <span class="tag verde">Escolhida</span>' : ''}${Number(p.valor_total) === menor ? ' <span class="tag azul">Menor preço</span>' : ''}
            ${p.itens_descricao ? `<div class="muted">${esc(p.itens_descricao)}</div>` : ''}${p.observacao ? `<div class="muted">${esc(p.observacao)}</div>` : ''}</td>
          <td data-r="Valor total" class="num"><b>${brl(p.valor_total)}</b></td><td data-r="Entrega">${p.prazo_entrega_dias != null ? p.prazo_entrega_dias + ' dia(s)' : '—'}</td>
          <td data-r="Pagamento">${esc(p.condicao_pagamento || '—')}</td><td data-r="Validade">${p.validade ? dataBR(p.validade) : '—'}</td><td data-r="Orçamento">${anx[p.id]}</td>
          <td>${aberta ? `<button class="btn peq" data-edit="${p.id}">Editar</button> <button class="btn peq perigo" data-del="${p.id}">Excluir</button>` : ''}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="vazio">Nenhuma proposta ainda. Clique em “+ Proposta” para incluir cada orçamento recebido.</div>'}
      ${c.justificativa_menos_orcamentos ? `<p class="alerta-obs" style="margin-top:10px"><b>⚠️ Menos orçamentos que o exigido (${props.length} de ${exig}):</b> ${esc(c.justificativa_menos_orcamentos)}</p>` : ''}
      ${c.justificativa_escolha ? `<p class="alerta-obs" style="margin-top:10px"><b>Por que não a mais barata:</b> ${esc(c.justificativa_escolha)}</p>` : ''}
      ${conta ? `<p class="muted">Conta do plano: ${esc(conta.codigo + ' ' + conta.nome)}</p>` : ''}</div>
    <div class="cartao"><h2>Itens pedidos</h2>${tabelaItens(itens.map(i => ({ ...i, valor: i.valor_estimado })), 'Valor unit. estimado')}</div>
    ${aprs.length ? `<div class="cartao"><h2>Aprovação</h2><ul class="lista-simples">${aprs.map(a => `<li><span>${tag(a.decisao)} ${a.comentario ? esc(a.comentario) : ''}</span><span class="muted">${dataHoraBR(a.decidido_em || a.solicitado_em)}</span></li>`).join('')}</ul></div>` : ''}`;

  $('#cancelar-cot')?.addEventListener('click', async () => {
    const motivo = await confirmar('Cancelar esta compra? A requisição, a cotação e a aprovação pendente são canceladas (o histórico fica guardado).', { comMotivo: true, botao: 'Cancelar compra' });
    if (!motivo) return;
    try { await api.rpc('cancelar_requisicao', { p_requisicao: c.requisicao_id, p_motivo: motivo }); aviso('Compra cancelada.'); navegar(); } catch (err) { falha(err); }
  });
  const formProposta = async (p = {}) => {
    const fsAtivos = forns.filter(f => f.ativo);
    return modal(`<form><h2>${p.id ? 'Editar proposta' : 'Nova proposta'}</h2><div class="form">
      <label class="campo largo">Fornecedor<select name="forn" required><option value="">Selecione…</option><option value="novo">+ Cadastrar novo fornecedor</option>
        ${fsAtivos.map(f => `<option value="${f.id}" ${f.id === p.fornecedor_id ? 'selected' : ''}>${esc(nomeForn(f))}</option>`).join('')}</select></label>
      <div class="largo form" id="novo-forn" hidden style="padding:0">
        <label class="campo">Razão social / nome<input name="nf_nome"></label><label class="campo">CNPJ ou CPF<input name="nf_doc"></label>
        <label class="campo">Telefone<input name="nf_tel"></label><label class="campo">E-mail<input name="nf_email" type="email"></label></div>
      <label class="campo">Valor total (R$)<input name="valor" inputmode="decimal" required value="${p.valor_total ? Number(p.valor_total).toFixed(2).replace('.', ',') : ''}"></label>
      <label class="campo">Prazo de entrega (dias)<input name="prazo" inputmode="numeric" value="${p.prazo_entrega_dias ?? ''}"></label>
      <label class="campo">Condição de pagamento<select name="cond"><option value="">Selecione…</option>${[...new Set([...CONDICOES_PAG, ...(p.condicao_pagamento ? [p.condicao_pagamento] : [])])].map(t => `<option ${t === p.condicao_pagamento ? 'selected' : ''}>${esc(t)}</option>`).join('')}<option value="__outra">Outra…</option></select></label>
      <label class="campo" id="cond-outra" hidden>Qual condição?<input name="cond_outra" placeholder="Ex.: Boleto 30/45/60 dias"></label>
      <label class="campo">Validade da proposta<input type="date" name="validade" value="${p.validade || ''}"></label>
      <label class="campo largo">O que está incluso (marca, modelo, frete)<input name="itens" value="${esc(p.itens_descricao || '')}"></label>
      <label class="campo largo">Observação<input name="obs" value="${esc(p.observacao || '')}"></label>
      <label class="campo largo">Orçamento (qualquer arquivo)${p.id ? '' : ' — obrigatório'}<input type="file" name="arquivos" multiple></label>
      ${p.id ? '' : '<label class="check largo"><input type="checkbox" name="verbal"> Orçamento por telefone/WhatsApp sem documento (explique na observação)</label>'}</div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`, {
      aoAbrir: raiz => { const f = $('form', raiz); f.forn.onchange = () => { $('#novo-forn', raiz).hidden = f.forn.value !== 'novo'; };
        f.cond.addEventListener('change', () => { $('#cond-outra', raiz).hidden = f.cond.value !== '__outra'; });
        f.nf_doc.addEventListener('input', async () => { f.nf_doc.value = mascaraDoc(f.nf_doc.value); const d = soDigitos(f.nf_doc.value);
          if (d.length === 14 && cnpjValido(d)) try { const r = await consultarCNPJ(d); f.nf_nome.value = r.razao_social || f.nf_nome.value;
            if (r.ddd_telefone_1 && !f.nf_tel.value) f.nf_tel.value = fmtTel(r.ddd_telefone_1); if (r.email && !f.nf_email.value) f.nf_email.value = r.email.toLowerCase(); } catch {} }); },
      validar: d => !d.forn ? 'Escolha o fornecedor.' : d.forn === 'novo' && !d.nf_nome ? 'Informe o nome do novo fornecedor.'
        : !(num(d.valor) > 0) ? 'Informe o valor total da proposta.'
        : !p.id && !d.arquivos.length && !(d.verbal && d.obs) ? 'Anexe o orçamento. Se foi verbal, marque a opção e explique na observação.' : null });
  };
  const salvarProposta = async (d, p = {}) => {
    let forn = d.forn;
    if (forn === 'novo') {
      const [nf] = await api.inserir('fornecedores', { razao_social: d.nf_nome, documento: soDigitos(d.nf_doc) || null, telefone: soDigitos(d.nf_tel) || null, email: d.nf_email || null });
      forn = nf.id; await fornecedores(true);
    }
    const dados = { fornecedor_id: forn, valor_total: num(d.valor), prazo_entrega_dias: d.prazo ? parseInt(d.prazo, 10) : null, condicao_pagamento: (d.cond === '__outra' ? d.cond_outra : d.cond) || null,
                    validade: d.validade || null, itens_descricao: d.itens || null, observacao: d.obs || null };
    let pid = p.id;
    if (pid) await api.alterar('cotacao_propostas', `id=eq.${pid}`, dados);
    else [{ id: pid }] = await api.inserir('cotacao_propostas', { ...dados, cotacao_id: id });
    await anexar('proposta', pid, d.arquivos);
  };
  $('#nova-prop')?.addEventListener('click', async () => {
    const d = await formProposta(); if (!d) return;
    try { await salvarProposta(d); aviso('Proposta incluída.'); navegar(); } catch (err) { falha(err); }
  });
  $$('[data-edit]', tela).forEach(b => b.addEventListener('click', async () => {
    const p = props.find(x => x.id === b.dataset.edit); const d = await formProposta(p); if (!d) return;
    try { await salvarProposta(d, p); aviso('Proposta alterada.'); navegar(); } catch (err) { falha(err); }
  }));
  $$('[data-del]', tela).forEach(b => b.addEventListener('click', async () => {
    if (!await confirmar('Excluir esta proposta?', { botao: 'Excluir' })) return;
    try { await api.excluir('cotacao_propostas', `id=eq.${b.dataset.del}`); aviso('Proposta excluída.'); navegar(); } catch (err) { falha(err); }
  }));
  $('#enviar')?.addEventListener('click', async () => {
    if (!props.length) return aviso('Inclua as propostas antes de enviar.', true);
    const maisBarata = props.find(p => Number(p.valor_total) === menor);
    const r2 = await modal(`<form><h2>Enviar compra para aprovação</h2>
      <p class="muted">A aprovação é da compra: o aprovador vê todas as propostas e a escolhida. Aprovada, o pedido de compra é emitido.</p>
      <div class="form"><div class="largo"><b>Proposta escolhida</b>${props.map(p => `<label class="opcao"><input type="radio" name="venc" value="${p.id}" ${(venc || maisBarata).id === p.id ? 'checked' : ''}>
          <span>${esc(nomeForn(fs[p.fornecedor_id]))} · <b>${brl(p.valor_total)}</b>${Number(p.valor_total) === menor ? ' <span class="tag azul">Menor preço</span>' : ''}</span></label>`).join('')}</div>
        <div class="largo conferencia" id="regra"></div>
        <label class="campo largo">Conta do plano de contas<select name="conta" required>${await opcoesContas(c.conta_id, ['custo', 'despesa', 'investimento'])}</select></label>
        <label class="campo largo" id="menos-campo">Por que há menos orçamentos que o exigido? *<textarea name="menos" rows="3" placeholder="Ex.: fornecedor exclusivo/representante único da marca; peça original só vendida pelo fabricante; não há outro fornecedor na região.">${esc(c.justificativa_menos_orcamentos || '')}</textarea>
          <span class="muted">Situação excepcional: a compra segue com os orçamentos disponíveis e o motivo vai em destaque para o aprovador.</span></label>
        <label class="campo largo" id="just-campo">Por que não a mais barata?<textarea name="just" rows="3">${esc(c.justificativa_escolha || '')}</textarea></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Enviar para aprovação</button></div></form>`, {
      aoAbrir: raiz => {
        const f = $('form', raiz);
        const sinc = () => { const p = props.find(x => x.id === f.venc.value); const ex = minimoCot(Number(p.valor_total));
          $('#regra', raiz).innerHTML = `Compra de <b>${brl(p.valor_total)}</b>: mínimo de <b>${ex}</b> cotação(ões) · esta tem <b>${props.length}</b> ${props.length < ex ? '<span class="tag amarelo">faltam ' + (ex - props.length) + ' — informe o motivo abaixo</span>' : '<span class="tag verde">ok</span>'}`;
          $('#menos-campo', raiz).hidden = props.length >= ex;
          $('#just-campo', raiz).hidden = Number(p.valor_total) <= menor; };
        $$('[name=venc]', raiz).forEach(x => (x.onchange = sinc)); sinc();
      },
      validar: d => { const p = props.find(x => x.id === d.venc); if (!p) return 'Escolha a proposta.';
        if (props.length < minimoCot(Number(p.valor_total)) && String(d.menos || '').trim().length < 15) return `Para compras de ${brl(p.valor_total)} são exigidas ${minimoCot(Number(p.valor_total))} cotações e esta tem ${props.length}. Explique o motivo (pelo menos uma frase).`;
        if (!d.conta) return 'Escolha a conta do plano de contas.';
        if (Number(p.valor_total) > menor && !d.just) return 'Explique por que não escolheu a mais barata.'; return null; } });
    if (!r2) return;
    try { await api.rpc('enviar_cotacao', { p_cotacao: id, p_vencedora: r2.venc, p_conta: r2.conta, p_justificativa: r2.just || null, p_justificativa_menos: props.length < minimoCot(Number(props.find(x => x.id === r2.venc)?.valor_total || 0)) ? r2.menos : null });
          aviso('Compra enviada para aprovação.'); navegar(); } catch (err) { falha(err); }
  });
});

// ---------- Cartões de compra na tela Aprovações ----------
async function cartoesCotacao(pend) {
  const meus = pend.filter(a => a.entidade === 'cotacao' && (a.aprovador_id === estado.usuario.id || (a.perfil_aprovador && tem(a.perfil_aprovador))));
  if (!meus.length) return { html: '', n: 0 };
  const ids = meus.map(a => a.entidade_id);
  const [cots, props, forns] = await Promise.all([
    api.listar('cotacoes', `select=*,req:requisicoes(id,numero,justificativa,urgencia,data_necessidade,solicitante_id)&id=${lista(ids)}`),
    api.listar('cotacao_propostas', `cotacao_id=${lista(ids)}&order=valor_total`), fornecedores()]);
  const cs = porId(cots), fs = porId(forns);
  const validos = meus.filter(a => cs[a.entidade_id]?.status === 'aguardando_aprovacao' && cs[a.entidade_id].comprador_id !== estado.usuario.id);
  const html = validos.map(a => { const c = cs[a.entidade_id]; const ps = props.filter(p => p.cotacao_id === c.id); const v = ps.find(p => p.vencedora) || {};
    const menor = Math.min(...ps.map(p => Number(p.valor_total)));
    return `<div class="cartao" data-ap="${a.id}">
      <div class="topo" style="margin-bottom:8px"><span><b>Compra ${esc(c.numero)}</b> · ${esc(nomeForn(fs[v.fornecedor_id]))}</span><b style="font-size:18px">${brl(v.valor_total)}</b></div>
      <p style="margin:4px 0 8px">${esc(c.req?.justificativa || '')} ${c.req?.urgencia === 'alta' ? '<span class="tag vermelho">Urgente</span>' : ''}</p>
      <ul class="lista-simples">${ps.map(p => `<li><span>${p.vencedora ? '✅ ' : ''}${esc(nomeForn(fs[p.fornecedor_id]))}${p.prazo_entrega_dias != null ? ` · ${p.prazo_entrega_dias} dia(s)` : ''}${p.condicao_pagamento ? ' · ' + esc(p.condicao_pagamento) : ''}</span>
        <b>${brl(p.valor_total)}${Number(p.valor_total) === menor ? ' <span class="tag azul">menor</span>' : ''}</b></li>`).join('')}</ul>
      ${c.justificativa_menos_orcamentos ? `<p class="alerta-obs"><b>⚠️ Só ${ps.length} orçamento(s) (exigido: ${minimoCot(Number(v.valor_total || 0))}). Motivo:</b> ${esc(c.justificativa_menos_orcamentos)}</p>` : ''}
      ${c.justificativa_escolha ? `<p class="alerta-obs"><b>Por que não a mais barata:</b> ${esc(c.justificativa_escolha)}</p>` : ''}
      <div class="acoes" style="margin-top:12px"><button class="btn ok peq" data-d="aprovado">Aprovar compra</button>
        <button class="btn peq" data-d="devolvido">Devolver p/ Compras</button><button class="btn perigo peq" data-d="reprovado">Reprovar</button>
        <a class="btn peq" href="#/compras/cotacoes/ver/${c.id}">Ver orçamentos</a></div></div>`; }).join('');
  return { html, n: validos.length };
}

// ---------- Pedidos ----------
// Duas etapas separadas, em qualquer ordem:
//   1) Documentos fiscais (NF, boleto…) → conta a pagar  — Comprador / Financeiro
//   2) Recebimento do produto (conferência)              — Almoxarifado / Patrimônio
const lancaDocFiscal = () => tem('administrador', 'comprador', 'financeiro');
const recebeProduto = () => tem('administrador', 'almoxarifado');
const tagDocPed = p => p.status === 'cancelado' ? '' : p.fat ? '<span class="tag verde">Lançados</span>' : '<span class="tag amarelo">Pendente</span>';
const tagEntregaPed = p => p.status === 'cancelado' ? '' : p.ent === 'completa' ? '<span class="tag verde">Recebido</span>'
  : p.ent === 'parcial' ? '<span class="tag amarelo">Em parte</span>' : '<span class="tag azul">Aguardando</span>';

rota('/compras/pedidos', async tela => {
  const soAlmox = tem('almoxarifado') && !tem('administrador', 'comprador', 'financeiro') && !veTudo();
  const sts = pLista('status', 'todos'), st = sts[0];
  const PRED_PED = { abertos: p => ['emitido', 'faturado', 'entregue', 'parcialmente_recebido'].includes(p.status), a_faturar: p => ['emitido', 'entregue', 'parcialmente_recebido'].includes(p.status) && !p.fat,
    a_receber: p => ['emitido', 'faturado', 'parcialmente_recebido'].includes(p.status) && p.ent !== 'completa', concluidos: p => p.status === 'recebido', todos: () => true };
  const filtroSt = 'status=neq.cancelado';
  const [ps0, forns] = await Promise.all([api.listar('pedidos', `select=*,req:requisicoes(numero,justificativa),fats:pedido_faturamentos(status),recs:recebimentos(entrega_completa,cancelado_em,status)&${filtroSt}&order=criado_em.desc&limit=500`), fornecedores()]);
  const ps = ps0.map(p => ({ ...p, fat: (p.fats || []).some(f => f.status === 'registrado'),
    ent: (() => { const v = (p.recs || []).filter(x => !x.cancelado_em && x.status !== 'cancelado'); return v.some(x => x.entrega_completa) ? 'completa' : v.length ? 'parcial' : 'pendente'; })() }))
    .filter(p => sts.some(s => (PRED_PED[s] || PRED_PED.todos)(p)));
  const fs = porId(forns);
  const opcoes = [['abertos', 'Em andamento'], ['a_faturar', 'Sem documentos fiscais'], ['a_receber', 'Aguardando entrega'], ['concluidos', 'Concluídos'], ['todos', 'Todos']];
  tela.innerHTML = `
    <div class="topo"><div><h1>Pedidos de compra</h1><p class="sub">${ps.length} pedido(s) · ${brl(ps.reduce((s, p) => s + Number(p.valor_total), 0))}</p></div></div>
    <p class="muted" style="margin:-6px 0 12px">Cada pedido tem duas etapas independentes: <b>documentos fiscais</b> (NF, boleto — Compras/Financeiro) e <b>recebimento do produto</b> (Almoxarifado/Patrimônio).</p>
    <form class="filtros" id="filtros"><select name="status">${opcoes.map(([v, t]) => `<option value="${v}" ${v === st ? 'selected' : ''}>${t}</option>`).join('')}</select><button class="btn">Filtrar</button></form>
    <div class="cartao">${ps.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nº</th><th>Emissão</th><th>Fornecedor</th><th>Para que</th><th>Previsão</th><th class="num">Valor</th><th>Documentos fiscais</th><th>Entrega</th></tr></thead><tbody>
      ${ps.map(p => `<tr class="clicavel" onclick="location.hash='#/compras/pedidos/ver/${p.id}'"><td data-r="Nº" class="nowrap">${esc(p.numero)}</td><td data-r="Emissão">${dataBR(p.criado_em)}</td>
        <td data-r="Fornecedor">${esc(nomeForn(fs[p.fornecedor_id]))}</td><td data-r="Para que">${esc(p.req?.justificativa || '')}</td>
        <td data-r="Previsão">${p.previsao_entrega ? dataBR(p.previsao_entrega) : '—'}${p.ent !== 'completa' && p.status !== 'cancelado' && p.previsao_entrega && p.previsao_entrega < hojeISO() ? ' <span class="tag vermelho">atrasado</span>' : ''}</td>
        <td data-r="Valor" class="num">${brl(p.valor_total)}</td><td data-r="Documentos">${p.status === 'cancelado' ? tag('cancelado') : tagDocPed(p)}</td><td data-r="Entrega">${tagEntregaPed(p)}</td></tr>`).join('')}
    </tbody></table></div>` : '<div class="vazio">Nenhum pedido.</div>'}</div>`;
  $('#filtros').onsubmit = e => { e.preventDefault(); location.hash = '#/compras/pedidos?status=' + formDados(e.target).status; };
});

rota('/compras/pedidos/ver/:id', async (tela, id) => {
  const p = await api.um('pedidos', `id=eq.${id}&select=*`);
  if (!p) { tela.innerHTML = '<div class="cartao vazio">Pedido não encontrado ou sem acesso.</div>'; return; }
  const [itens, recs, fats, forn, [r], cot] = await Promise.all([
    api.listar('pedido_itens', `pedido_id=eq.${id}&order=id`),
    api.listar('recebimentos', `pedido_id=eq.${id}&cancelado_em=is.null&select=*,quem:usuarios!recebimentos_recebido_por_fkey(nome)&order=criado_em`).catch(() => api.listar('recebimentos', `pedido_id=eq.${id}&cancelado_em=is.null&order=criado_em`)),
    api.listar('pedido_faturamentos', `pedido_id=eq.${id}&status=eq.registrado&select=*,quem:usuarios!pedido_faturamentos_registrado_por_fkey(nome)&order=criado_em`).catch(() => api.listar('pedido_faturamentos', `pedido_id=eq.${id}&status=eq.registrado&order=criado_em`).catch(() => [])),
    api.um('fornecedores', `id=eq.${p.fornecedor_id}&select=*`),
    p.requisicao_id ? listarReq(`id=eq.${p.requisicao_id}`).catch(() => [null]) : [null],
    p.cotacao_id ? api.um('cotacoes', `id=eq.${p.cotacao_id}&select=numero`).catch(() => null) : null]);
  const conta = p.conta_id ? (await contas()).find(x => x.id === p.conta_id) : null;
  const emps = await empresasL().catch(() => []);
  const empFat = emps.find(e => e.id === p.empresa_id) || emps[0] || null;
  const ativo = p.status !== 'cancelado';
  const fat = fats[0] || null;
  const recsV = recs.filter(x => x.status !== 'cancelado');
  const entregue = recsV.some(x => x.entrega_completa);
  const podeFaturar = ativo && !fat && lancaDocFiscal();
  const podeReceber = ativo && !entregue && recebeProduto();
  const anxF = fat ? await htmlAnexos('faturamento', fat.id) : '';
  const anxR = {}; await Promise.all(recsV.map(async x => (anxR[x.id] = await htmlAnexos('recebimento', x.id))));
  const parcelas = fat?.titulo_id && veTudo() ? await api.listar('titulo_parcelas', `titulo_id=eq.${fat.titulo_id}&order=parcela`).catch(() => []) : [];
  const situacao = !ativo ? tag('cancelado') : fat && entregue ? '<span class="tag verde">Concluído: faturado e recebido</span>'
    : `${fat ? '<span class="tag verde">Documentos lançados</span>' : '<span class="tag amarelo">Sem documentos fiscais</span>'} ${entregue ? '<span class="tag verde">Produto recebido</span>' : recsV.length ? '<span class="tag amarelo">Recebido em parte</span>' : '<span class="tag azul">Aguardando entrega</span>'}`;
  const etapa = (n, ok, titulo, quem) => `<div class="topo" style="margin:0 0 8px"><div><h2 style="margin:0">${ok ? '✅' : n === 1 ? '🧾' : '📦'} ${n}. ${titulo}</h2><p class="muted" style="margin:2px 0 0">${quem}</p></div>`;
  tela.innerHTML = `
    <div class="topo"><div><h1>Pedido ${esc(p.numero)}</h1><p class="sub">${situacao} · ${esc(nomeForn(forn))} · <b>${brl(p.valor_total)}</b></p></div>
      <div class="acoes"><button class="btn prim" id="imprimir">⬇ PDF do pedido</button>
        ${ehComprador() && ativo && !fat && !recsV.length ? '<button class="btn" id="editar-ped">Editar pedido</button><button class="btn" id="corrigir-ped">Corrigir fornecedor/valor</button><button class="btn perigo" id="cancelar">Cancelar compra</button>' : ''}
        <button class="btn" onclick="history.back()">Voltar</button></div></div>
    <div class="cartao"><div class="form">
      <div><div class="muted">Fornecedor</div><b>${esc(nomeForn(forn))}</b><div class="muted">${esc([forn?.telefone, forn?.email].filter(Boolean).join(' · '))}</div></div>
      <div><div class="muted">Faturar para</div><b>${esc(empFat ? empFat.razao_social : '—')}</b><div class="muted">${empFat?.cnpj ? 'CNPJ ' + fmtCNPJ(empFat.cnpj) : ''}</div></div>
      <div><div class="muted">Pagamento</div><b>${esc(p.condicao_pagamento || '—')}</b></div>
      ${p.entrega_local ? `<div><div class="muted">Local de entrega</div>${esc(p.entrega_local)}</div>` : ''}
      ${p.contato_fornecedor ? `<div><div class="muted">A/C (fornecedor)</div>${esc(p.contato_fornecedor)}</div>` : ''}
      ${p.observacoes ? `<div class="largo"><div class="muted">Observações do pedido</div>${esc(p.observacoes)}</div>` : ''}
      <div><div class="muted">Previsão de entrega</div><b>${p.previsao_entrega ? dataBR(p.previsao_entrega) : '—'}</b>${ativo && !entregue && p.previsao_entrega && p.previsao_entrega < hojeISO() ? ' <span class="tag vermelho">atrasado</span>' : ''}</div>
      <div><div class="muted">Origem</div>${r ? `Requisição <a href="#/compras/requisicoes/ver/${r.id}">${esc(r.numero)}</a> · ${esc(r.solic?.nome || '')}` : '—'}${cot && veCompras() ? `<br>Cotação <a href="#/compras/cotacoes/ver/${p.cotacao_id}">${esc(cot.numero)}</a>` : ''}</div>
      ${conta ? `<div><div class="muted">Conta do plano</div><b>${esc(conta.codigo + ' ' + conta.nome)}</b></div>` : ''}
      <div class="largo"><div class="muted">Para que</div>${esc(r?.justificativa || '—')}</div>
      ${p.motivo_cancelamento ? `<div class="largo alerta-obs"><b>Cancelado:</b> ${esc(p.motivo_cancelamento)}</div>` : ''}
    </div></div>
    <div class="cartao"><h2>Itens</h2>${tabelaItens(itens.map(i => ({ ...i, valor: i.valor_unitario })))}</div>
    ${ativo || fat ? `<div class="cartao" id="etapa-doc">${etapa(1, !!fat, 'Documentos fiscais (NF, boleto)', 'Compras ou Financeiro lança a nota e o boleto — gera a conta a pagar')}
      ${podeFaturar ? '<div class="acoes"><button class="btn ok" id="faturar">Lançar documentos fiscais</button></div>' : ''}</div>
      ${fat ? `<div class="form">
        <div><div class="muted">Documento</div><b>${esc(fat.tipo_documento)} ${esc(fat.numero_documento)}</b><div class="muted">emitido em ${dataBR(fat.data_emissao)}</div></div>
        <div><div class="muted">Valor</div><b>${brl(fat.valor)}</b>${Math.abs(Number(fat.valor) - Number(p.valor_total)) > 0.009 ? ` <span class="tag vermelho">pedido ${brl(p.valor_total)}</span>` : ''}</div>
        <div><div class="muted">Forma de pagamento</div><b>${esc(fat.forma_pagamento || '—')}</b></div>
        <div><div class="muted">Lançado por</div>${esc(fat.quem?.nome || '—')} · ${dataBR(fat.criado_em)}${fat.titulo_id && veTudo() ? `<br><a href="#/financeiro/pagar/ver/${fat.titulo_id}">ver conta a pagar</a>` : ''}</div>
        ${parcelas.length ? `<div class="largo"><div class="muted">Vencimento(s)</div>${parcelas.map(x => `${x.parcela}ª ${dataBR(x.vencimento)} · ${brl(x.valor)}${x.status === 'paga' ? ' <span class="tag verde">paga</span>' : ''}`).join(' &nbsp;|&nbsp; ')}</div>` : ''}
        ${fat.divergencia ? `<div class="largo alerta-obs">Divergência: ${esc(fat.divergencia)}</div>` : ''}
        ${fat.observacao ? `<div class="largo"><div class="muted">Observação</div>${esc(fat.observacao)}</div>` : ''}
        <div class="largo"><div class="muted">Arquivos</div>${anxF}</div>
        ${lancaDocFiscal() ? `<div class="largo"><button class="btn peq perigo" id="cancelar-fat">Cancelar este lançamento (corrigir)</button></div>` : ''}</div>`
      : `<div class="vazio" style="padding:10px 0">${entregue ? '⚠️ O produto já chegou e <b>ainda faltam a nota fiscal e o boleto</b>.' : 'Aguardando a nota fiscal / boleto do fornecedor.'}</div>`}</div>` : ''}
    ${ativo || recsV.length ? `<div class="cartao" id="etapa-rec">${etapa(2, entregue, 'Recebimento do produto', 'Almoxarifado / Patrimônio confere e confirma a chegada')}
      ${podeReceber ? `<div class="acoes"><button class="btn ok" id="receber">${recsV.length ? 'Confirmar o restante' : 'Confirmar recebimento'}</button></div>` : ''}</div>
      ${recsV.length ? `<ul class="lista-simples">${recsV.map(x => `<li style="flex-wrap:wrap"><span><b>${x.entrega_completa ? (x.status === 'com_divergencia' ? 'Recebido com divergência' : 'Recebido e conferido') : 'Recebido em parte'}</b>
          · chegou em ${dataBR(x.data_recebimento)}${x.quem?.nome ? ' · ' + esc(x.quem.nome) : ''}</span>
          ${recebeProduto() ? `<button class="btn peq" data-cancelar-rec="${x.id}">Cancelar</button>` : ''}
          ${x.divergencia ? `<div style="flex-basis:100%" class="alerta-obs">${x.entrega_completa ? 'Divergência' : 'Faltou'}: ${esc(x.divergencia)}</div>` : ''}
          ${x.observacao ? `<div style="flex-basis:100%" class="muted">${esc(x.observacao)}</div>` : ''}
          <div style="flex-basis:100%"><span class="muted">Fotos/arquivos:</span> ${anxR[x.id]}</div></li>`).join('')}</ul>
          ${entregue && recebeProduto() ? `<p style="margin-top:8px"><a class="btn peq" href="#/almox/entrada?pedido=${p.id}">📥 Dar entrada no estoque</a> <span class="muted">(se for material de estoque)</span></p>` : ''}`
      : `<div class="vazio" style="padding:10px 0">${fat ? 'Documentos já lançados — <b>aguardando o produto chegar</b>.' : 'Aguardando a entrega do fornecedor.'}${!recebeProduto() ? ' Quem confirma é o Almoxarifado/Patrimônio.' : ''}</div>`}</div>` : ''}`;

  $('#imprimir').onclick = () => imprimirPedido(p, forn, itens, r);
  $('#cancelar')?.addEventListener('click', async () => {
    const motivo = await confirmar('Cancelar a compra? O pedido, a cotação e a requisição são encerrados.', { comMotivo: true, botao: 'Cancelar compra' });
    if (!motivo) return;
    try { await api.rpc('cancelar_pedido', { p_pedido: id, p_motivo: motivo, p_refazer: false }); aviso('Compra cancelada.'); navegar(); } catch (err) { falha(err); }
  });
  $('#corrigir-ped')?.addEventListener('click', async () => {
    const motivo = await confirmar('Corrigir fornecedor ou valor? Este pedido é cancelado e a cotação volta aberta com as propostas: ajuste a proposta (ou cadastre a correta), escolha a vencedora e envie de novo para aprovação.',
      { comMotivo: true, botao: 'Voltar para a cotação' });
    if (!motivo) return;
    try { const x = await api.rpc('cancelar_pedido', { p_pedido: id, p_motivo: motivo, p_refazer: true }); aviso('Cotação reaberta. Corrija e envie para aprovação.'); location.hash = '#/compras/cotacoes/ver/' + x.cotacao; } catch (err) { falha(err); }
  });
  $('#editar-ped')?.addEventListener('click', async () => {
    const d = await modal(`<form><h2>Editar pedido ${esc(p.numero)}</h2><div class="form">
      <label class="campo largo">Faturar para (CNPJ)<select name="empresa_id">${emps.map(e => `<option value="${e.id}" ${e.id === empFat?.id ? 'selected' : ''}>${esc(rotEmpresa(e))}</option>`).join('')}</select></label>
      <label class="campo">Condição de pagamento<select name="cond">${[...new Set([...CONDICOES_PAG, ...(p.condicao_pagamento ? [p.condicao_pagamento] : [])])].map(t => `<option ${t === p.condicao_pagamento ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
      <label class="campo">Previsão de entrega<input type="date" name="prev" value="${p.previsao_entrega || ''}"></label>
      <label class="campo largo">Local de entrega<input name="local" value="${esc(p.entrega_local || '')}" placeholder="Em branco: endereço do CNPJ de faturamento"></label>
      <label class="campo largo">A/C no fornecedor (vendedor/contato)<input name="contato" value="${esc(p.contato_fornecedor || '')}"></label>
      <label class="campo largo">Observações (saem no PDF)<textarea name="obs" rows="2">${esc(p.observacoes || '')}</textarea></label>
      <div class="largo"><div class="muted">Valor unitário por item (opcional — deixe em branco se o fornecedor só passou o total)</div>
        ${itens.map(i => `<div class="lado" style="gap:8px;margin:4px 0"><span style="flex:1">${esc(i.descricao)} <span class="muted">· ${Number(i.quantidade).toLocaleString('pt-BR')} ${esc(i.unidade || '')}</span></span>
          <input name="vu_${i.id}" inputmode="decimal" style="width:130px" value="${Number(i.valor_unitario) > 0 ? Number(i.valor_unitario).toFixed(2).replace('.', ',') : ''}" placeholder="R$"></div>`).join('')}</div></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`,
      { validar: x => { const soma = itens.reduce((t, i) => t + (num(x['vu_' + i.id]) || 0) * Number(i.quantidade), 0);
          return soma > 0 && Math.abs(soma - Number(p.valor_total)) > 0.05 ? `A soma dos itens (${brl(soma)}) não fecha com o total do pedido (${brl(p.valor_total)}). Ajuste ou deixe em branco.` : null; } });
    if (!d) return;
    try {
      await api.alterar('pedidos', `id=eq.${id}`, { empresa_id: d.empresa_id || null, condicao_pagamento: d.cond || null, previsao_entrega: d.prev || null,
        entrega_local: d.local?.trim() || null, contato_fornecedor: d.contato?.trim() || null, observacoes: d.obs?.trim() || null });
      for (const i of itens) { const v = num(d['vu_' + i.id]) || 0; if (Math.abs(v - Number(i.valor_unitario || 0)) > 0.0001) await api.alterar('pedido_itens', `id=eq.${i.id}`, { valor_unitario: v }); }
      aviso('Pedido atualizado.'); navegar();
    } catch (err) { falha(err); }
  });
  $('#cancelar-fat')?.addEventListener('click', async () => {
    const motivo = await confirmar(`Cancelar o lançamento de ${fat.tipo_documento} ${fat.numero_documento}? A conta a pagar gerada também é cancelada (só é possível se ainda não foi paga).`, { comMotivo: true, botao: 'Cancelar lançamento' });
    if (!motivo) return;
    try { await api.rpc('cancelar_faturamento', { p_id: fat.id, p_motivo: motivo }); aviso('Lançamento cancelado. Lance os documentos corretos.'); navegar(); } catch (err) { falha(err); }
  });
  $$('[data-cancelar-rec]', tela).forEach(b => b.onclick = async () => {
    const motivo = await confirmar('Cancelar esta confirmação de recebimento?', { comMotivo: true, botao: 'Cancelar recebimento' });
    if (!motivo) return;
    try { await api.rpc('cancelar_recebimento', { p_id: b.dataset.cancelarRec, p_motivo: motivo }); aviso('Recebimento cancelado.'); navegar(); } catch (err) { falha(err); }
  });

  // ----- 1) Documentos fiscais → conta a pagar -----
  $('#faturar')?.addEventListener('click', async () => {
    const parcelasDe = (total, n, primeiro, intervalo) => {
      const base = Math.floor(total / n * 100) / 100; const ps = [];
      for (let k = 0; k < n; k++) ps.push({ vencimento: somaDias(primeiro, k * intervalo), valor: k === n - 1 ? Math.round((total - base * (n - 1)) * 100) / 100 : base });
      return ps;
    };
    const prazoForn = forn?.prazo_faturamento_dias;
    const prazo = prazoForn != null ? prazoForn : /(\d+)\s*d/i.test(p.condicao_pagamento || '') ? Number(p.condicao_pagamento.match(/(\d+)\s*d/i)[1]) : /vista/i.test(p.condicao_pagamento || '') ? 0 : 30;
    const parcP = parcelasCond(p.condicao_pagamento);
    const multi = parcP.length > 1;
    const venc1 = somaDias(hojeISO(), multi ? parcP[0] : prazo);
    const res = await modal(`<form><h2>Documentos fiscais do pedido ${esc(p.numero)}</h2>
      <p class="muted">Lance a nota fiscal, o boleto e os demais documentos da compra. A conta a pagar vai pronta para o Financeiro. ${entregue ? '<b>O produto já foi recebido pelo almoxarifado.</b>' : 'O recebimento do produto é confirmado depois, pelo Almoxarifado.'}</p><div class="form">
      <label class="campo">Tipo de documento<select name="tipo">${['NF', 'NFS-e', 'Cupom fiscal', 'Recibo', 'Fatura', 'Outro'].map(t => `<option ${t === 'NF' ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo">Nº do documento<input name="nf" required></label>
      <label class="campo">Data de emissão<input type="date" name="data" value="${hojeISO()}" required></label>
      <label class="campo">Valor do documento (R$)<input name="valor" inputmode="decimal" value="${Number(p.valor_total).toFixed(2).replace('.', ',')}" required></label>
      <label class="campo">Forma de pagamento<select name="forma" required><option value="">Selecione…</option>${['Boleto', 'Pix', 'Transferência (TED/DOC)', 'Cartão', 'Débito automático', 'Dinheiro'].map(t => `<option ${/boleto/i.test(p.condicao_pagamento || '') && t === 'Boleto' || /pix/i.test(p.condicao_pagamento || '') && t === 'Pix' ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="check"><input type="checkbox" name="avista" ${prazo === 0 ? 'checked' : ''}> Pago/pagar à vista</label>
      <div class="largo muted">${prazoForn != null ? `Prazo de faturamento do fornecedor: <b>${prazoForn ? prazoForn + ' dias' : 'à vista'}</b> — o vencimento já vem calculado a partir da emissão (altere só em caso extraordinário).` : `Fornecedor sem prazo no cadastro: vencimento pela condição do pedido (${esc(p.condicao_pagamento || '30 dias')}).`}</div>
      <div class="largo conferencia" id="conf"></div>
      <label class="campo largo" id="div-campo" hidden>O que mudou em relação ao pedido? (obrigatório)<textarea name="div" rows="2"></textarea></label>
      <label class="campo">Condição de pagamento<select name="cond" data-unico><option value="">Manual</option>${[...new Set([...CONDICOES_PAG, ...(p.condicao_pagamento ? [p.condicao_pagamento] : [])])].map(t => `<option ${t === p.condicao_pagamento ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
      <label class="campo">Parcelas<input name="n" inputmode="numeric" value="${multi ? parcP.length : 1}"></label>
      <label class="campo">1º vencimento<input type="date" name="venc" value="${venc1}"></label>
      <label class="campo">Intervalo (dias)<input name="int" inputmode="numeric" value="${multi ? parcP[1] - parcP[0] : 30}"></label>
      <div class="largo" id="parcelas"></div>
      <label class="campo largo" id="campo-linha">Linha digitável do boleto (opcional)<input name="linha" inputmode="numeric" placeholder="Só os números"></label>
      <label class="campo largo">Observação<input name="obs"></label>
      <label class="campo largo">Nota fiscal / recibo / cupom — obrigatório (qualquer arquivo)<input type="file" name="arquivos" multiple></label>
      <label class="campo largo" id="campo-boleto">Boleto (obrigatório quando a forma é boleto)<input type="file" name="boletos" multiple></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn ok">Lançar documentos</button></div></form>`, {
      aoAbrir: raiz => {
        const f = $('form', raiz);
        const sinc = () => {
          const v = num(f.valor.value) || 0, dif = Math.round((v - Number(p.valor_total)) * 100) / 100;
          $('#conf', raiz).innerHTML = `Pedido: <b>${brl(p.valor_total)}</b> · Documento: <b>${brl(v)}</b> ${Math.abs(dif) > 0.009 ? `<span class="tag vermelho">diferença ${brl(dif)}</span>` : '<span class="tag verde">confere</span>'}`;
          $('#div-campo', raiz).hidden = Math.abs(dif) <= 0.009;
          const n = Math.max(1, parseInt(f.n.value, 10) || 1);
          const ps = v > 0 && f.venc.value ? parcelasDe(v, n, f.venc.value, parseInt(f.int.value, 10) || 30) : [];
          $('#parcelas', raiz).innerHTML = ps.length ? '<div class="muted">Parcelas (pode ajustar):</div>' + ps.map((x, k) => `<div class="lado" style="gap:8px;margin:4px 0">
            <span class="nowrap">${k + 1}ª</span><input type="date" class="pv" value="${x.vencimento}" aria-label="Vencimento ${k + 1}"><input class="pval" inputmode="decimal" value="${x.valor.toFixed(2).replace('.', ',')}" aria-label="Valor ${k + 1}" style="width:120px"></div>`).join('') : '';
        };
        ['valor', 'n', 'venc', 'int'].forEach(k => f[k].addEventListener('input', sinc));
        f.cond.addEventListener('change', () => { const ps = parcelasCond(f.cond.value); if (!ps.length) return;
          f.n.value = ps.length; f.venc.value = somaDias(f.data.value, ps[0]); f.int.value = ps.length > 1 ? ps[1] - ps[0] : 30; f.avista.checked = ps[0] === 0; sinc(); });
        const forma = () => { const b = f.forma.value === 'Boleto'; $('#campo-linha', raiz).hidden = !b; $('#campo-boleto', raiz).hidden = !b; };
        f.forma.addEventListener('change', forma); forma();
        f.avista.addEventListener('change', () => { f.venc.value = f.avista.checked ? f.data.value : somaDias(f.data.value, prazo || 30); if (f.avista.checked) f.n.value = 1; sinc(); });
        f.data.addEventListener('change', () => { f.venc.value = somaDias(f.data.value, f.avista.checked ? 0 : prazo); sinc(); });
        sinc();
      },
      validar: d => {
        const v = num(d.valor);
        if (!d.nf) return 'Informe o número do documento.';
        if (!d.data) return 'Informe a data de emissão.';
        if (!(v > 0)) return 'Informe o valor do documento.';
        if (!d.forma) return 'Informe a forma de pagamento.';
        if (d.forma === 'Boleto' && !d.boletos.length) return 'Anexe o boleto.';
        if (Math.abs(v - Number(p.valor_total)) > 0.009 && !d.div) return 'O valor do documento é diferente do pedido: explique a divergência.';
        if (!d.arquivos.length) return 'Anexe a nota fiscal, o recibo ou o cupom.';
        const ps = $$('#parcelas .pv').map((el, k) => ({ vencimento: el.value, valor: num($$('#parcelas .pval')[k].value) || 0 }));
        if (ps.some(x => !x.vencimento || !(x.valor > 0))) return 'Confira as datas e os valores das parcelas.';
        if (Math.abs(ps.reduce((s, x) => s + x.valor, 0) - v) > 0.009) return `A soma das parcelas precisa dar ${brl(v)}.`;
        receber._parcelas = ps; return null;
      } });
    if (!res) return;
    try {
      const out = await api.rpc('registrar_faturamento', { p_pedido: id, p_data: res.data, p_tipo_doc: res.tipo, p_numero: res.nf, p_valor: num(res.valor),
        p_parcelas: receber._parcelas, p_forma: res.forma, p_linha_digitavel: res.forma === 'Boleto' ? res.linha || null : null, p_divergencia: res.div || null, p_obs: res.obs || null });
      await anexarEm([['faturamento', out.faturamento], ['titulo', out.titulo]], res.arquivos, res.tipo);
      if (res.forma === 'Boleto') await anexarEm([['faturamento', out.faturamento], ['titulo', out.titulo]], res.boletos, 'Boleto');
      aviso(entregue ? 'Documentos lançados. Pedido concluído: faturado e recebido.' : 'Documentos lançados e conta a pagar criada. Falta o Almoxarifado confirmar a chegada do produto.'); navegar();
    } catch (err) { falha(err); }
  });

  // ----- 2) Recebimento do produto (Almoxarifado / Patrimônio) -----
  $('#receber')?.addEventListener('click', async () => {
    const res = await modal(`<form><h2>Recebimento do pedido ${esc(p.numero)}</h2>
      <p class="muted">Confira o que chegou com o pedido (quantidade, modelo, estado da embalagem). ${fat ? `Documento já lançado: <b>${esc(fat.tipo_documento)} ${esc(fat.numero_documento)}</b>.` : 'A nota fiscal e o boleto são lançados por Compras/Financeiro — aqui é só a chegada do produto.'}</p>
      <div class="cartao" style="margin:8px 0"><b>${esc(nomeForn(forn))}</b><ul class="lista-simples">${itens.map(i => `<li><span>${esc(i.descricao)}</span><b>${Number(i.quantidade).toLocaleString('pt-BR')} ${esc(i.unidade)}</b></li>`).join('')}</ul></div>
      <div class="form">
      <label class="campo">Data em que chegou<input type="date" name="data" value="${hojeISO()}" max="${hojeISO()}" required></label>
      <label class="campo largo">Conferência<select name="conf">
        <option value="ok">Chegou tudo, conforme o pedido</option>
        <option value="div">Chegou tudo, mas com divergência (avaria, modelo diferente…)</option>
        <option value="parcial">Chegou só uma parte (faltam itens)</option></select></label>
      <label class="campo largo" id="campo-div" hidden><span id="rot-div">O que está diferente?</span><textarea name="div" rows="2"></textarea></label>
      <label class="campo largo">Observação (opcional)<input name="obs" placeholder="Ex.: guardado na prateleira B, entregue ao setor de TI"></label>
      <label class="campo largo">Fotos / canhoto assinado (opcional)<input type="file" name="fotos" multiple accept="image/*,application/pdf"></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn ok">Confirmar recebimento</button></div></form>`, {
      aoAbrir: raiz => { const f = $('form', raiz); const ajusta = () => { $('#campo-div', raiz).hidden = f.conf.value === 'ok'; $('#rot-div', raiz).textContent = f.conf.value === 'parcial' ? 'O que faltou chegar?' : 'O que está diferente?'; }; f.conf.onchange = ajusta; ajusta(); },
      validar: d => !d.data ? 'Informe a data.' : d.data > hojeISO() ? 'A data não pode ser futura.' : d.conf !== 'ok' && !d.div ? (d.conf === 'parcial' ? 'Informe o que faltou chegar.' : 'Descreva a divergência.') : null });
    if (!res) return;
    try {
      const out = await api.rpc('confirmar_recebimento', { p_pedido: id, p_data: res.data, p_completa: res.conf !== 'parcial', p_divergencia: res.conf === 'ok' ? null : res.div, p_obs: res.obs || null });
      if (res.fotos?.length) await anexarEm([['recebimento', out.recebimento]], res.fotos, 'Recebimento');
      aviso(res.conf === 'parcial' ? 'Recebimento parcial registrado. Quando o restante chegar, confirme de novo.'
        : fat ? 'Recebimento confirmado. Pedido concluído: faturado e recebido.' : 'Recebimento confirmado. Compras foi avisado de que faltam a nota e o boleto.'); navegar();
    } catch (err) { falha(err); }
  });
});
const receber = {};

// Um arquivo, vários vínculos (ex.: a NF fica no recebimento e na conta a pagar)
async function anexarEm(destinos, arquivos, descricao = null) {
  for (const original of arquivos || []) {
    const f = await prepararArquivo(original);
    const [ent0, id0] = destinos[0];
    const caminho = `${ent0}/${id0}/${Date.now()}-${nomeArquivo(f.name)}`;
    await api.enviarArquivo(caminho, f);
    await api.inserir('anexos', destinos.map(([entidade, entidade_id]) => ({ entidade, entidade_id, caminho_arquivo: caminho, nome_original: original.name,
      tipo_mime: f.type || 'application/octet-stream', tamanho_bytes: f.size, enviado_por: estado.usuario.id, descricao })));
  }
}

// ===================== Documentos no papel timbrado da Verbo (PDF) =====================
// Segue o modelo "Ofícios, comunicados, declarações e cartas": faixa verde com o logo no topo,
// "Correspondência oficial", nº do documento, destinatário, assunto, marca-d'água e rodapé institucional.
const _imgTimbrado = {};
async function imgDataUrl(nome) {
  if (_imgTimbrado[nome]) return _imgTimbrado[nome];
  const b = await (await fetch(nome + '?v=3')).blob();
  return (_imgTimbrado[nome] = await new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(b); }));
}
// Moldura do papel timbrado (cabeçalho, logo, marca-d'água, rodapé com dados do CNPJ) — retrato ou paisagem.
// Medidas do modelo "Ofícios, comunicados, declarações e cartas" (A4: faixa 30,7 mm; logo 53,9 × 14,8 mm a 20 mm da borda).
async function imagensTimbrado(paisagem = false) {
  const [cab, logo, marca, rod] = await Promise.all([paisagem ? 'doc-cabecalho-paisagem.jpg' : 'doc-cabecalho.jpg', 'doc-logo.png', 'doc-marca.png',
    paisagem ? 'doc-rodape-paisagem.jpg' : 'doc-rodape.jpg'].map(imgDataUrl));
  return { cab, logo, marca, rod, paisagem };
}
function molduraTimbrado(doc, E, I) {
  const W = I.paisagem ? 297 : 210, H = I.paisagem ? 210 : 297, ML = 20, MR = W - 20;
  const COR = { texto: [37, 46, 53], cinza: [107, 115, 120], ouro: [221, 169, 54] };
  const cor = c => doc.setTextColor(...COR[c]);
  const largEsp = (txt, esp) => [...txt].reduce((w, ch) => w + doc.getTextWidth(ch) + esp, 0) - esp;
  doc.addImage(I.marca, 'PNG', W - 113.7, H - 111, 137.6, 82.5, 'marca', 'NONE');
  doc.addImage(I.cab, 'JPEG', 0, 0, W, 30.7, 'cab' + W, 'NONE');
  doc.addImage(I.logo, 'PNG', ML, 7.95, 53.9, 14.8, 'logo', 'NONE');
  doc.addImage(I.rod, 'JPEG', 0, H - 5.7, W, 5.8, 'rod' + W, 'NONE');
  const nomeEmp = (E.nome_fantasia || E.razao_social || 'Verbo Logística').toUpperCase();
  const l1 = [E.cnpj ? 'CNPJ ' + fmtCNPJ(E.cnpj) : '', empresaEndereco(E)].filter(Boolean);
  const l2 = [E.site, E.email, E.telefone ? fmtTel(E.telefone) : ''].filter(Boolean);
  const y1 = H - 17.4, y2 = H - 13.7;
  let fs = 7.5; const larg = () => { doc.setFontSize(fs); doc.setFont('helvetica', 'normal'); return [l1, l2].map(l => l.reduce((w, t) => w + doc.getTextWidth(t) + 5.5, 0)); };
  doc.setFont('helvetica', 'bold'); doc.setFontSize(fs);
  while (fs > 5.5 && Math.max(larg()[0] + largEsp(nomeEmp, 0.9) + 3, larg()[1] + 22) > MR - ML) fs -= 0.5;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(fs); cor('texto');
  let x = ML; for (const ch of nomeEmp) { doc.text(ch, x, y1); x += doc.getTextWidth(ch) + 0.9; } x += 1.6;
  const parte = (t, y) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(fs); cor('ouro'); doc.text('|', x, y); x += 3; cor('cinza'); doc.text(t, x, y); x += doc.getTextWidth(t) + 2.5; };
  l1.forEach(t => parte(t, y1));
  x = ML; doc.setFont('helvetica', 'normal'); doc.setFontSize(fs); cor('cinza');
  l2.forEach((t, i) => { if (i === 0) { doc.text(t, x, y2); x += doc.getTextWidth(t) + 2.5; } else parte(t, y2); });
}
function paginarTimbrado(doc, paisagem = false) {
  const W = paisagem ? 297 : 210, H = paisagem ? 210 : 297, n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(37, 46, 53); doc.text(`Página ${i} de ${n}`, W - 20, H - 13.7, { align: 'right' }); }
}
const MESES_DOC = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
async function pdfTimbrado({ setor, numero, destinatario = [], assunto, corpo, assinatura = [], arquivo, empresa = null }) {
  const E = empresa || (await empresasL().catch(() => []))[0] || {};
  await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
  const IMG = await imagensTimbrado(false);
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, ML = 20, MR = 190, TOPO = 44, BASE = 268;
  const COR = { texto: [37, 46, 53], cinza: [107, 115, 120], ouro: [221, 169, 54], verde: [2, 101, 77], linha: [214, 220, 224] };
  const cor = c => doc.setTextColor(...COR[c]);
  // texto com letras espaçadas (desenha letra a letra; devolve a largura)
  const largEsp = (txt, esp) => [...txt].reduce((w, ch) => w + doc.getTextWidth(ch) + esp, 0) - esp;
  const espacado = (txt, x, y, opts = {}) => { const esp = opts.esp ?? 1.1; let px = opts.align === 'right' ? x - largEsp(txt, esp) : x;
    for (const ch of txt) { doc.text(ch, px, y); px += doc.getTextWidth(ch) + esp; } return largEsp(txt, esp); };
  const moldura = () => molduraTimbrado(doc, E, IMG);
  // ---- 1ª página: cabeçalho da correspondência
  moldura();
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); cor('ouro');
  const seT = (setor || '').trim(); doc.setFontSize(8); const wSet = doc.getTextWidth(seT);
  doc.setFontSize(7.5); espacado('CORRESPONDÊNCIA OFICIAL', MR - wSet - 4, 37, { align: 'right', esp: 1.5 });
  doc.setFontSize(8); cor('texto'); doc.text(seT, MR, 37, { align: 'right' });
  const hoje = new Date(); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); cor('cinza');
  doc.text(`${E.cidade || 'Birigui'}/${E.uf || 'SP'}, ${hoje.getDate()} de ${MESES_DOC[hoje.getMonth()]} de ${hoje.getFullYear()}`, MR, 46, { align: 'right' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); cor('ouro'); const wDoc = espacado('DOCUMENTO Nº', ML, 57, { esp: 1.3 });
  doc.setFontSize(9.5); cor('texto'); doc.text(numero, ML + wDoc + 4, 57);
  let y = 67;
  destinatario.forEach(([t, estilo]) => { doc.setFont('helvetica', estilo === 'b' ? 'bold' : 'normal'); doc.setFontSize(estilo === 'b' ? 11 : 10); cor(estilo === 'b' ? 'texto' : 'cinza'); doc.text(t, ML, y); y += 5.4; });
  y += 4; doc.setFont('helvetica', 'bold'); doc.setFontSize(11); cor('texto'); doc.text(`Assunto: ${assunto}`, ML, y);
  doc.setDrawColor(...COR.linha); doc.setLineWidth(0.2); doc.line(ML, y + 1.6, MR, y + 1.6); y += 10;
  // ---- corpo: parágrafos e tabelas, com quebra de página
  const novaPagina = () => { doc.addPage(); moldura(); y = TOPO; };
  const paragrafo = (txt, { negrito = false, espaco = 3.2 } = {}) => {
    doc.setFont('helvetica', negrito ? 'bold' : 'normal'); doc.setFontSize(10.5); cor('texto');
    const linhas = doc.splitTextToSize(txt, MR - ML);
    linhas.forEach((l, i) => { if (y > BASE) novaPagina(); const ultima = i === linhas.length - 1;
      doc.text(l, ML, y, ultima || negrito ? {} : { align: 'justify', maxWidth: MR - ML }); y += 5.5; });
    y += espaco;
  };
  for (const b of corpo) {
    if (typeof b === 'string') paragrafo(b);
    else if (b.negrito) paragrafo(b.negrito, { negrito: true, espaco: 1 });
    else if (b.lista) { b.lista.forEach(t => { if (y > BASE) novaPagina(); doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); cor('ouro'); doc.text('•', ML + 1, y); cor('texto');
        const ls = doc.splitTextToSize(t, MR - ML - 6); ls.forEach(l => { if (y > BASE) novaPagina(); doc.text(l, ML + 6, y); y += 5.2; }); }); y += 3; }
    else if (b.tabela) {
      doc.autoTable({ startY: y, head: [b.tabela.cab], body: b.tabela.linhas, margin: { left: ML, right: W - MR, top: TOPO, bottom: 297 - BASE + 2 },
        theme: 'grid', styles: { font: 'helvetica', fontSize: 9.5, textColor: COR.texto, lineColor: COR.linha, lineWidth: 0.15, cellPadding: 2.2, valign: 'middle' },
        headStyles: { fillColor: COR.verde, textColor: 255, fontStyle: 'bold' }, alternateRowStyles: { fillColor: [246, 249, 248] },
        columnStyles: b.tabela.colunas || {},
        willDrawPage: d => { if (d.pageNumber > 1) moldura(); } });
      y = doc.lastAutoTable.finalY + 7;
    }
  }
  // ---- assinatura
  if (y > BASE - 27) novaPagina();
  y += 1; paragrafo('Atenciosamente,', { espaco: 11 });
  doc.setDrawColor(...COR.texto); doc.setLineWidth(0.3); doc.line(ML, y, ML + 68, y); y += 5;
  assinatura.forEach(([t, estilo], i) => { doc.setFont('helvetica', estilo === 'b' ? 'bold' : 'normal'); doc.setFontSize(estilo === 'b' ? 11 : 10); cor(estilo === 'b' ? 'texto' : 'cinza'); doc.text(t, ML, y); y += 5.2; });
  // ---- "Página x de y"
  paginarTimbrado(doc, false);
  doc.save(arquivo);
}

// Solicitação de cotação (para mandar ao fornecedor) — qualquer pessoa pode baixar
async function pdfSolicitacaoCotacao(r, itens) {
  const em = await escolherEmissao({ titulo: `Solicitação de cotação ${r.numero}`, setor: 'Compras' });
  if (!em) return;
  const { empresa: E, resp } = em;
  const linhas = itens.map((i, k) => [String(k + 1), i.descricao || '', Number(i.quantidade || 0).toLocaleString('pt-BR'), i.unidade || '']);
  await pdfTimbrado({
    setor: 'Compras', numero: r.numero, arquivo: `Solicitacao de cotacao ${r.numero}.pdf`, empresa: E,
    destinatario: [['Ao(À) Fornecedor(a)'], ['Departamento Comercial', 'b'], ['A/C: responsável pelo orçamento']],
    assunto: `Solicitação de cotação — ${r.numero}`,
    corpo: [
      'Prezado(a) Senhor(a),',
      `Solicitamos a gentileza de nos enviar proposta comercial para o fornecimento dos itens relacionados abaixo, referentes à nossa solicitação de compra ${r.numero}.`,
      { tabela: { cab: ['Item', 'Descrição / especificação', 'Qtd.', 'Unid.'], linhas,
        colunas: { 0: { cellWidth: 13, halign: 'center' }, 2: { cellWidth: 22, halign: 'right' }, 3: { cellWidth: 20, halign: 'center' } } } },
      { negrito: 'Na proposta, pedimos informar:' },
      { lista: ['preço unitário e total de cada item;', 'prazo de entrega;', 'condição e forma de pagamento;', 'frete (CIF ou FOB) e impostos inclusos;', 'validade da proposta.'] },
      `Faturamento para ${E.razao_social}${E.cnpj ? ', CNPJ ' + fmtCNPJ(E.cnpj) : ''}. Local de entrega: ${empresaEndereco(E) || '—'}.${r.data_necessidade ? ` Precisamos dos itens até ${dataBR(r.data_necessidade)}${r.urgencia === 'alta' ? ' (urgente)' : ''}.` : ''}`,
      `Por gentileza, envie a proposta${resp.email ? ` para ${resp.email}` : ''} mencionando o número ${r.numero}. Ficamos à disposição para qualquer esclarecimento.`,
    ],
    assinatura: [[resp.nome || 'Compras', 'b'], [`${resp.cargo || 'Compras'} | ${(E.nome_fantasia || E.razao_social || '').toUpperCase()}`]],
  });
}

// Pedido de compra no papel timbrado (PDF para o fornecedor): dados do pedido + CNPJ de faturamento escolhido.
// Valor unitário só aparece se foi informado.
async function pdfPedido(p, forn, itens, r) {
  const podeSalvar = ehComprador() && p.status !== 'cancelado';
  const em = await escolherEmissao({ titulo: `PDF do pedido ${p.numero}`, setor: 'Compras', empresaId: p.empresa_id,
    extrasHtml: `<label class="campo largo">A/C no fornecedor<input name="contato" value="${esc(p.contato_fornecedor || '')}" placeholder="Nome do vendedor / contato"></label>
      <label class="campo">Previsão de entrega<input type="date" name="prev" value="${p.previsao_entrega || ''}"></label>
      <label class="campo largo">Local de entrega<input name="local" value="${esc(p.entrega_local || '')}" placeholder="Em branco: endereço do CNPJ de faturamento"></label>
      <label class="campo largo">Observações<textarea name="obs" rows="2">${esc(p.observacoes || '')}</textarea></label>` });
  if (!em) return;
  const { empresa: E, resp, dados: d } = em;
  const ped = { ...p, empresa_id: E.id, contato_fornecedor: d.contato?.trim() || null, previsao_entrega: d.prev || null, entrega_local: d.local?.trim() || null, observacoes: d.obs?.trim() || null };
  if (podeSalvar) await api.alterar('pedidos', `id=eq.${p.id}`, { empresa_id: ped.empresa_id, contato_fornecedor: ped.contato_fornecedor, previsao_entrega: ped.previsao_entrega,
    entrega_local: ped.entrega_local, observacoes: ped.observacoes }).catch(() => {});
  const comUnit = itens.some(i => Number(i.valor_unitario) > 0);
  const linhas = itens.map((i, k) => [String(k + 1), i.descricao || '', Number(i.quantidade || 0).toLocaleString('pt-BR'), i.unidade || '',
    ...(comUnit ? [Number(i.valor_unitario) > 0 ? brl(i.valor_unitario) : '—', Number(i.valor_unitario) > 0 ? brl(Number(i.quantidade) * Number(i.valor_unitario)) : '—'] : [])]);
  linhas.push([{ content: 'Total do pedido', colSpan: comUnit ? 5 : 3, styles: { fontStyle: 'bold', halign: 'left' } }, { content: brl(ped.valor_total), colSpan: 1, styles: { fontStyle: 'bold', halign: 'right' } }]);
  const cab = ['Item', 'Descrição', 'Qtd.', 'Unid.', ...(comUnit ? ['Valor unit.', 'Total'] : [])];
  const colunas = comUnit ? { 0: { cellWidth: 12, halign: 'center' }, 2: { cellWidth: 16, halign: 'right' }, 3: { cellWidth: 16, halign: 'center' }, 4: { cellWidth: 28, halign: 'right' }, 5: { cellWidth: 30, halign: 'right' } }
    : { 0: { cellWidth: 13, halign: 'center' }, 2: { cellWidth: 22, halign: 'right' }, 3: { cellWidth: 34, halign: 'center' } };
  const parc = parcelasCond(ped.condicao_pagamento);
  const vParc = parc.length > 1 ? parc.map((x, k) => { const base = Math.floor(Number(ped.valor_total) * 100 / parc.length) / 100; return k === parc.length - 1 ? Math.round((Number(ped.valor_total) - base * (parc.length - 1)) * 100) / 100 : base; }) : [];
  const fornL3 = [forn?.documento ? 'CNPJ ' + fmtDoc(forn.documento) : '', forn?.telefone ? 'Tel. ' + fmtTel(forn.telefone) : ''].filter(Boolean).join(' · ');
  await pdfTimbrado({
    setor: 'Compras', numero: ped.numero, arquivo: `Pedido de compra ${ped.numero}.pdf`, empresa: E,
    destinatario: [['Ao(À) Fornecedor(a)'], [forn?.razao_social || '—', 'b'], ...(fornL3 ? [[fornL3]] : []), ...(ped.contato_fornecedor ? [['A/C: ' + ped.contato_fornecedor]] : [])],
    assunto: `Pedido de compra — ${ped.numero}`,
    corpo: [
      'Prezado(a) Senhor(a),',
      `Confirmamos a compra dos itens relacionados abaixo${r?.justificativa ? ` (${r.justificativa})` : ''}, conforme proposta aprovada.`,
      { tabela: { cab, linhas, colunas } },
      { negrito: 'Condições' },
      { lista: [`Faturar para: ${E.razao_social}${E.cnpj ? ', CNPJ ' + fmtCNPJ(E.cnpj) : ''}${E.inscricao_estadual ? ', IE ' + E.inscricao_estadual : ''} — ${empresaEndereco(E) || '—'}.`,`Pagamento: ${ped.condicao_pagamento || '—'}${vParc.length ? ' — ' + vParc.map((v, k) => `${parc[k]} dias: ${brl(v)}`).join('; ') : ''}.`,
        `Previsão de entrega: ${ped.previsao_entrega ? dataBR(ped.previsao_entrega) : 'a combinar'}.`,
        `Local de entrega: ${ped.entrega_local || empresaEndereco(E) || '—'}.`,
        `Informar o número ${ped.numero} na nota fiscal e no boleto.`] },
      ...(ped.observacoes ? [{ negrito: 'Observações' }, ped.observacoes] : []),
      `Ficamos à disposição para qualquer esclarecimento${resp.email ? ` pelo e-mail ${resp.email}` : ''}.`,
    ],
    assinatura: [[resp.nome || 'Compras', 'b'], [`${resp.cargo || 'Compras'} | ${(E.nome_fantasia || E.razao_social || '').toUpperCase()}`]],
  });
  if (podeSalvar && typeof navegar === 'function') navegar();
}
function imprimirPedido(p, forn, itens, r) { return pdfPedido(p, forn, itens, r).catch(falha); }
// "Boleto 30/60/90 dias" -> [30,60,90]; "30 dias" -> [30]; à vista -> [0]
function parcelasCond(c) {
  c = String(c || ''); if (/vista/i.test(c)) return [0];
  const m = c.match(/\d+(\s*[\/,e]\s*\d+)*/); if (!m) return [];
  return m[0].split(/\s*[\/,e]\s*/).map(Number).filter(n => n >= 0);
}
const CONDICOES_PAG = ['À vista (Pix)', 'À vista (boleto)', 'Boleto 15 dias', 'Boleto 28 dias', 'Boleto 30 dias', 'Boleto 30/60 dias', 'Boleto 30/60/90 dias', 'Boleto 30/60/90/120 dias', 'Boleto 28/56/84 dias', 'Cartão de crédito', 'Transferência 30 dias'];

// ----- Linha do tempo da requisição (quem pediu acompanha cada etapa) -----
// Documentos fiscais e recebimento do produto são etapas separadas e podem acontecer em qualquer ordem.
const ETAPAS_REQ = [['criada', 'Criada'], ['compras', 'Enviada a Compras'], ['cotacao', 'Em cotação'], ['aprovacao', 'Aprovação'], ['pedido', 'Pedido emitido'],
  ['faturada', 'Documentos fiscais (NF/boleto)'], ['recebida', 'Produto recebido (almoxarifado)'], ['paga', 'Paga']];
async function linhaTempoReq(id, box) {
  if (!box) return;
  let d;
  let orcs = [];
  try { [d, orcs] = await Promise.all([api.rpc('requisicao_linha_tempo', { p_id: id }), api.rpc('requisicao_orcamentos', { p_id: id }).catch(() => [])]); }
  catch (err) { box.innerHTML = `<h2>Acompanhamento</h2><div class="muted">${esc(err.message)}</div>`; return; }
  // junta repetidos (mesma etapa em sequência, poucos segundos de diferença)
  const ev = []; for (const e of d.eventos || []) { const u = ev[ev.length - 1]; if (u && u.titulo === e.titulo && Math.abs(new Date(e.quando) - new Date(u.quando)) < 120000) continue; ev.push(e); }
  const encerrada = ['cancelada', 'reprovada'].includes(d.status);
  // a situação atual da requisição manda: só conta como concluída a etapa que de fato terminou
  const CONCLUIDO = { rascunho: -1, devolvida: -1, aguardando_cotacao: 1, em_cotacao: 1, aguardando_aprovacao: 2, aprovada: 3, pedido_emitido: 4, faturada: 4, entregue: 4, recebida: 4 };
  const linear = CONCLUIDO[d.status] ?? 0;
  const feitos = ETAPAS_REQ.map((_, i) => i <= 4 ? i <= Math.max(linear, 0) : false);
  if (linear >= 4) {
    feitos[5] = !!d.faturado || ev.some(e => e.etapa === 'faturamento');
    feitos[6] = d.entrega ? d.entrega === 'completa' : d.status === 'recebida';
    feitos[7] = !!d.pago;
  }
  const concluido = feitos.every(Boolean);
  const atual = encerrada || concluido ? -1 : feitos.findIndex(f => !f);
  const pend = [];
  if (linear >= 4 && !feitos[5]) pend.push('Compras/Financeiro lançar a nota fiscal e o boleto');
  if (linear >= 4 && !feitos[6]) pend.push(d.entrega === 'parcial' ? 'o restante do produto chegar (parte já foi recebida)' : 'o Almoxarifado confirmar a chegada do produto');
  if (linear >= 4 && feitos[5] && feitos[6] && !feitos[7]) pend.push('o pagamento ao fornecedor');
  const AGUARDANDO = { rascunho: 'aguardando envio para Compras', devolvida: 'devolvida para você corrigir', aguardando_cotacao: 'aguardando o Comprador iniciar a cotação',
    em_cotacao: 'Compras está cotando', aguardando_aprovacao: 'aguardando a decisão do aprovador', aprovada: 'aprovada, aguardando emissão do pedido' };
  const txtAguarda = linear >= 4 ? 'aguardando ' + pend.join(' e ') : AGUARDANDO[d.status] || '';
  const passos = ETAPAS_REQ.map(([k, t], i) => `<li class="${feitos[i] ? 'feito' : ''} ${i === atual ? 'atual' : ''}"><span class="pt"></span><span class="nm">${t}</span></li>`).join('');
  const quando = q => new Date(q).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  box.innerHTML = `<h2>Acompanhamento</h2>
    ${encerrada ? `<div class="alerta-obs" style="margin-bottom:10px"><b>${d.status === 'cancelada' ? 'Requisição cancelada' : 'Compra reprovada'}.</b> Veja o motivo abaixo.</div>`
      : `<ol class="etapas">${passos}</ol><p class="muted" style="margin:6px 0 12px">${concluido ? 'Processo <b>concluído</b> ✓' : `Etapa atual: <b>${ETAPAS_REQ[atual][1]}</b> — ${txtAguarda}`}</p>`}
    <ul class="linha-tempo">${ev.slice().reverse().map(e => `<li class="lt-${esc(e.etapa)}"><div class="lt-q">${quando(e.quando)}</div>
      <div class="lt-t"><b>${esc(e.titulo)}</b>${e.quem ? ` <span class="muted">· ${esc(e.quem)}</span>` : ''}${e.detalhe ? `<div class="muted">${esc(e.detalhe)}</div>` : ''}</div></li>`).join('')
      || '<li class="muted">Sem movimentações ainda.</li>'}</ul>
    ${orcs.length ? `<h3 class="lt-orc-tit">Orçamentos recebidos (${orcs.length})</h3>
      <div class="lt-orcs">${orcs.map(o => `<div class="lt-orc ${o.escolhida ? 'escolhido' : ''}">
        <div class="lt-orc-top"><b>${esc(o.fornecedor)}</b>${o.escolhida ? '<span class="tag verde">escolhido</span>' : o.proposta_vencedora && o.cotacao_status === 'aguardando_aprovacao' ? '<span class="tag amarelo">indicado por Compras</span>' : ''}</div>
        <div class="lt-orc-v">${brl(o.valor)}</div>
        <div class="muted">${esc([o.cotacao, o.prazo_dias != null ? `entrega em ${o.prazo_dias} dia(s)` : '', o.condicao, o.validade ? 'válido até ' + dataBR(o.validade) : ''].filter(Boolean).join(' · '))}</div>
        ${o.itens ? `<div class="muted" style="margin-top:4px">${esc(o.itens)}</div>` : ''}
        <div class="lt-orc-arq">${(o.anexos || []).length ? o.anexos.map(a => `<span class="anexo" data-arquivo="${esc(a.caminho)}" title="Baixar / abrir">${a.tipo?.includes('pdf') ? '📄' : a.tipo?.startsWith('image/') ? '🖼️' : '📎'} ${esc(a.nome || 'orçamento')}</span>`).join('') : '<span class="muted">sem arquivo anexado</span>'}</div>
      </div>`).join('')}</div>` : ''}`;
}
