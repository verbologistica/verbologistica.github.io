// Verbo Gestão — Contas a pagar e Contas a receber
'use strict';

const FAIXAS = {
  vencidos: ['Vencidas', p => p.vencida],
  '1_vencidos': ['Vencidas', p => p.vencida],
  '2_hoje': ['Vencem hoje', p => p.vencimento === hojeISO()],
  '3_7_dias': ['Próximos 7 dias', p => p.vencimento > hojeISO() && p.vencimento <= somaDias(hojeISO(), 7)],
  '4_30_dias': ['Próximos 30 dias', p => p.vencimento > somaDias(hojeISO(), 7) && p.vencimento <= somaDias(hojeISO(), 30)],
};

// Textos e regras que mudam entre pagar e receber
const TIPO = {
  pagar: { titulo: 'Contas a pagar', novo: 'Nova conta a pagar', rota: '#/financeiro/pagar', pessoa: 'Favorecido', cadastro: 'Fornecedor',
           baixa: 'Registrar pagamento', baixaFeita: 'Pagamento registrado.', conta: 'Saiu de qual conta', feito: 'Pago', feitas: 'Pagas',
           legado: 'Compra anterior ao sistema (controlar só a quitação)', exemplo: 'Ex.: aluguel de outubro', tiposConta: ['custo', 'despesa', 'financeiro', 'investimento', 'deducao'] },
  receber: { titulo: 'Contas a receber', novo: 'Nova conta a receber', rota: '#/financeiro/receber', pessoa: 'Cliente', cadastro: 'Cliente',
           baixa: 'Registrar recebimento', baixaFeita: 'Recebimento registrado.', conta: 'Entrou em qual conta', feito: 'Recebido', feitas: 'Recebidas',
           legado: 'Venda anterior ao sistema (controlar só o recebimento)', exemplo: 'Ex.: frete São Paulo × Campinas, CT-e 123', tiposConta: ['receita', 'financeiro'] },
};
const FORMAS_BAIXA = ['Pix', 'Boleto', 'Transferência (TED/DOC)', 'Cartão', 'Débito automático', 'Cheque', 'Dinheiro'];
const clientes = f => cad('clientes', 'select=id,nome,nome_fantasia,documento,ativo,boleto,prazo_faturamento_dias&order=nome', f);

const ABAS_PAGAR = [['variaveis', 'Despesas variáveis'], ['fixas', 'Contas fixas mensais'], ['todas', 'Todas']];
const abasPagar = aba => `<div class="abas">${ABAS_PAGAR.map(([k, t]) => `<a href="#/financeiro/pagar?aba=${k}" class="${k === aba ? 'ativa' : ''}">${t}</a>`).join('')}</div>`;

async function listaTitulos(tela, tipo) {
  const T = TIPO[tipo];
  const aba = tipo === 'pagar' ? (estado.params.get('aba') || 'variaveis') : 'todas';
  if (tipo === 'pagar') await api.rpc('gerar_contas_fixas').catch(() => 0);   // lança os meses das contas fixas (não duplica)
  if (aba === 'fixas') return listaFixas(tela);
  const sts = pLista('status', 'todas'), st = sts.length === 1 ? sts[0] : 'varios';
  const faixas = pLista('faixa'), faixa = faixas[0] || '';
  // período (vencimento): padrão = mês atual; "tudo" = sem período; links de faixa (Início) abrem sem período
  const mesIni = hojeISO().slice(0, 8) + '01', mesFim = somaDias(somaMeses(mesIni, 1), -1);
  // padrão: todas as datas (nada some da lista); o período só vale quando escolhido
  const per = estado.params.get('de') && estado.params.get('ate') ? { de: estado.params.get('de'), ate: estado.params.get('ate') } : null;
  const fPer = per ? `&vencimento=gte.${per.de}&vencimento=lte.${per.ate}` : '';
  const fAba = aba === 'variaveis' ? '&origem=neq.recorrente' : '';
  const busca = (estado.params.get('q') || '').toLowerCase();
  const semComp = await api.listar('v_pagamentos_sem_comprovante', `select=parcela_id&tipo=eq.${tipo}`).catch(() => []);
  const semCompIds = new Set(semComp.map(x => x.parcela_id));
  const mapaSt = { abertas: 'status=in.(aberta,aprovada,prevista)', previsoes: 'status=eq.prevista', pagas: 'status=eq.paga', todas: 'status=neq.cancelada',
                     semcomp: semCompIds.size ? 'id=' + lista([...semCompIds]) : 'id=is.null' };
  const filtroSt = filtroOu(sts.map(s => mapaSt[s] ?? mapaSt.todas)) || mapaSt.todas;
  let ps = await api.listar('v_parcelas', `tipo=eq.${tipo}&${filtroSt}${fAba}${fPer}&order=vencimento,titulo_numero&limit=3000`);
  // resumo do período (todas as situações)
  const [rs, atrasAnt] = await Promise.all([
    api.listar('v_parcelas', `select=valor,valor_pago,total_pago,encargos,saldo,status,vencida&tipo=eq.${tipo}&status=neq.cancelada${fAba}${fPer}&limit=20000`).catch(() => []),
    per ? api.listar('v_parcelas', `select=saldo&tipo=eq.${tipo}&status=in.(aberta,aprovada)${fAba}&vencimento=lt.${per.de < hojeISO() ? per.de : hojeISO()}&limit=20000`).catch(() => []) : []]);
  const soma = (arr, k) => arr.reduce((x, p) => x + Number(p[k] || 0), 0);
  const R = { total: soma(rs, 'valor'), pago: soma(rs, 'total_pago'), enc: soma(rs, 'encargos'), pend: soma(rs.filter(p => ['aberta', 'aprovada'].includes(p.status)), 'saldo'),
    venc: soma(rs.filter(p => p.vencida), 'saldo'), prev: soma(rs.filter(p => p.status === 'prevista'), 'saldo'),
    nPend: rs.filter(p => ['aberta', 'aprovada'].includes(p.status)).length, nVenc: rs.filter(p => p.vencida).length, nPrev: rs.filter(p => p.status === 'prevista').length, nPago: rs.filter(p => Number(p.valor_pago) > 0).length };
  R.aVencer = R.pend - R.venc;
  const atrasTot = soma(atrasAnt, 'saldo');
  const [planoC, ccsT] = await Promise.all([contas().catch(() => []), centros().catch(() => [])]);
  const nomeConta = id => planoC.find(c => c.id === id)?.nome, nomeCC = id => ccsT.find(c => c.id === id)?.nome;
  const ORIG_T = { reembolso: 'Reembolso', adiantamento: 'Adiantamento', pedido: 'Pedido de compra', fechamento: 'Fechamento de fornecedor', fatura_cartao: 'Fatura de cartão', recorrente: 'Conta fixa', avulso: 'Lançamento avulso', legado: 'Anterior ao sistema', folha: 'Folha de pagamento' };
  const pessoas = porId(tipo === 'pagar' ? await fornecedores() : await clientes());
  const nome = p => (tipo === 'pagar' ? pessoas[p.fornecedor_id]?.razao_social : pessoas[p.cliente_id]?.nome) || p.favorecido_nome || '—';
  const pesBusca = p => { const x = pessoas[tipo === 'pagar' ? p.fornecedor_id : p.cliente_id]; return x ? [x.nome_fantasia, x.documento, x.documento && fmtDoc(x.documento)].filter(Boolean).join(' ') : ''; };
  if (faixas.some(f => FAIXAS[f])) ps = ps.filter(p => faixas.some(f => FAIXAS[f]?.[1](p)));
  if (busca) ps = ps.filter(p => casaBusca(nome(p) + ' ' + pesBusca(p) + ' ' + (p.descricao || '') + ' ' + p.titulo_numero + ' ' + (p.documento || ''), busca));
  const pagas = st === 'pagas' || st === 'semcomp';
  const podeSel = editaFin() && (st === 'abertas' || st === 'previsoes');
  const urlCom = mud => { const q = new URLSearchParams(estado.params); Object.entries(mud).forEach(([k, v]) => (v == null || v === '' ? q.delete(k) : q.set(k, v))); return T.rota + '?' + q.toString(); };
  const rotPer = per ? (per.de === mesIni && per.ate === mesFim ? 'este mês' : `${dataBR(per.de)} a ${dataBR(per.ate)}`) : 'todas as datas';
  const kR = (cls, n, rot, sub, st2) => `<a class="fr-k ${cls}" href="${urlCom({ status: st2, faixa: null })}"><span class="fr-r">${rot}</span><b>${brl(n)}</b>${sub ? `<span class="fr-s">${sub}</span>` : ''}</a>`;
  const blocoResumo = `<section class="cartao fin-resumo">
      <form class="fr-per" id="fr-per"><b>Resumo ${tipo === 'pagar' ? 'das contas a pagar' : 'das contas a receber'}</b><span class="muted">· vencimento: ${rotPer}</span>
        <span class="fr-campos"><label>de <input type="date" name="de" value="${per?.de || ''}"></label><label>até <input type="date" name="ate" value="${per?.ate || ''}"></label><button class="btn peq">Aplicar</button></span>
        <span class="fr-atalhos"><button type="button" class="btn peq" data-p="mes">Este mês</button><button type="button" class="btn peq" data-p="prox">Próximo mês</button><button type="button" class="btn peq" data-p="ant">Mês anterior</button><button type="button" class="btn peq" data-p="ano">Este ano</button><button type="button" class="btn peq" data-p="tudo">Todas as datas</button></span></form>
      <div class="fr-grade">
        ${kR('', R.total, tipo === 'pagar' ? 'Valor total (gasto)' : 'Valor total', `${rs.length} parcela(s)`, 'todas')}
        ${kR('ok', R.pago, T.feito, `${R.nPago} parcela(s)${R.enc > 0 ? ` · ${brl(R.enc)} de juros/multa` : R.enc < 0 ? ` · ${brl(-R.enc)} de desconto` : ''}`, 'pagas')}
        ${kR('pend', R.pend, tipo === 'pagar' ? 'Pendente a pagar' : 'Pendente a receber', `${R.nPend} parcela(s)`, 'abertas')}
        ${kR('', R.aVencer, 'A vencer', '', 'abertas')}
        ${kR(R.venc ? 'alerta' : '', R.venc, 'Vencido', `${R.nVenc} parcela(s)`, 'abertas')}
        ${kR('prev', R.prev, tipo === 'pagar' ? 'Previsões de gasto' : 'Receitas previstas', `${R.nPrev} parcela(s)`, 'previsoes')}
      </div>
      ${atrasTot > 0 ? `<p class="fr-aviso">${ico('alerta')} Há <b>${atrasAnt.length}</b> parcela(s) vencida(s) antes deste período (${brl(atrasTot)}). <a href="${urlCom({ periodo: 'tudo', de: null, ate: null, status: 'abertas', faixa: '1_vencidos' })}">Ver</a></p>` : ''}
    </section>`;
  const total = ps.reduce((s, p) => s + Number(pagas ? p.total_pago : p.saldo), 0);
  const colValor = pagas ? T.feito : 'Saldo';
  tela.innerHTML = `
    <div class="topo"><div><h1>${T.titulo}</h1><p class="sub">${ps.length} parcela(s) · ${brl(total)}${aba === 'variaveis' ? ' · sem as contas fixas mensais' : ''}</p></div>
      ${editaFin() ? `<div class="acoes"><a class="btn prim" href="${T.rota}/novo">+ ${T.novo}</a></div>` : ''}</div>
    ${tipo === 'pagar' ? abasPagar(aba) : ''}
    ${blocoResumo}
    <form class="filtros" id="filtros"><input type="hidden" name="aba" value="${tipo === 'pagar' ? aba : ''}">
      <input type="hidden" name="de" value="${per?.de || ''}"><input type="hidden" name="ate" value="${per?.ate || ''}"><input type="hidden" name="periodo" value="${per ? '' : 'tudo'}">
      <select name="status">${[['abertas', 'Em aberto'], ['previsoes', tipo === 'pagar' ? 'Previsões de gasto' : 'Receitas previstas'], ['pagas', T.feitas], ...(tipo === 'pagar' ? [['semcomp', 'Pagas sem comprovante']] : []), ['todas', 'Todas']].map(([v, t]) => `<option value="${v}" ${v === st ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <select name="faixa"><option value="">Qualquer vencimento</option>${Object.entries(FAIXAS).filter(([k]) => k !== 'vencidos').map(([k, [t]]) => `<option value="${k}" ${k === faixa ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <input name="q" placeholder="Buscar ${T.pessoa.toLowerCase()}, descrição ou nº do documento" value="${esc(estado.params.get('q') || '')}">
      <button class="btn">Filtrar</button></form>
    ${podeSel && ps.length ? `<div class="sel-barra" id="sel-barra" hidden><span id="sel-txt"></span>${st === 'abertas' ? '<button class="btn peq" id="virar-prev">Transformar em previsão</button>' : '<button class="btn ok peq" id="conf-prev">Confirmar como conta (nota/boleto chegou)</button>'}</div>` : ''}
    <div class="cartao">${ps.length ? `<div class="tabela-wrap"><table class="responsiva t-contas"><thead><tr>${podeSel ? '<th class="sel-cel"><input type="checkbox" id="sel-todos" aria-label="Selecionar todos"></th>' : ''}<th>Vencimento</th><th>${T.pessoa}</th><th>Descrição</th><th>Título</th><th>Nº documento</th><th class="num">Valor</th><th class="num">${colValor}</th><th>Situação</th></tr></thead><tbody>
      ${ps.map(p => `<tr class="clicavel" data-t="${p.titulo_id}"${fAttr('pessoa', nome(p))}${fAttr('tipo', ORIG_T[p.origem] || p.origem)}${fAttr('conta', nomeConta(p.conta_id))}${fAttr('cc', nomeCC(p.centro_custo_id))}${fAttr('sit', _txt(tagParcela(p, tipo)))}${fAttr('data', p.vencimento)}${fAttr('valor', pagas ? p.total_pago : p.saldo)}${fAttr('busca', [nome(p), pesBusca(p), p.documento, p.descricao, p.titulo_numero, p.observacoes].filter(Boolean).join(' '))}>${podeSel ? `<td class="sel-cel" data-r=""><input type="checkbox" class="sel-t" value="${p.titulo_id}" aria-label="Selecionar"></td>` : ''}<td data-r="Vencimento" class="nowrap">${dataBR(p.vencimento)}${Number(p.renegociacoes) ? `<div class="enc" title="Vencimento renegociado">renegociada · orig. ${dataBR(p.vencimento_original)}</div>` : ''}</td><td data-r="${T.pessoa}">${esc(nome(p))}</td>
        <td data-r="Descrição">${temVerificar(p.observacoes) ? '<span title="A verificar">⚠️</span> ' : ''}${esc(p.descricao || '')}</td><td data-r="Título" class="nowrap">${esc(p.titulo_numero)}${p.parcela > 1 ? ` <span class="muted">${p.parcela}ª</span>` : ''}</td>
        <td data-r="Nº documento">${p.documento ? esc(p.documento) : '<span class="muted">—</span>'}</td>
        <td data-r="Valor" class="num">${brl(p.valor)}${Number(p.encargos) ? `<div class="enc ${Number(p.encargos) > 0 ? 'mais' : 'menos'}" title="${esc(txtEncargos(p))}">${Number(p.encargos) > 0 ? '+' : '−'} ${brl(Math.abs(p.encargos))} ${Number(p.encargos) > 0 ? 'juros/multa' : 'desconto'}</div><div class="enc">${tipo === 'receber' ? 'recebido' : 'pago'} ${brl(p.total_pago)}</div>` : ''}</td><td data-r="${colValor}" class="num"><b>${brl(pagas ? p.total_pago : p.saldo)}</b></td><td data-r="Situação">${tagParcela(p, tipo)}${tipo === 'pagar' && semCompIds.has(p.id) ? ' <span class="tag amarelo">Sem comprovante</span>' : ''}</td></tr>`).join('')}
      </tbody><tfoot><tr><td colspan="${podeSel ? 7 : 6}">Total</td><td class="num">${brl(total)}</td><td></td></tr></tfoot></table></div>` : '<div class="vazio">Nenhuma conta encontrada.</div>'}</div>`;
  $('#filtros').onsubmit = e => { e.preventDefault(); const d = formDados(e.target);
    location.hash = T.rota + '?' + new URLSearchParams(Object.entries(d).filter(([, v]) => v)).toString(); };
  $$('tr[data-t]', tela).forEach(tr => (tr.onclick = e => { if (e.target.closest('.sel-cel')) return; location.hash = T.rota + '/ver/' + tr.dataset.t; }));
  // período do resumo
  $('#fr-per').onsubmit = e => { e.preventDefault(); const d = formDados(e.target); if (!d.de || !d.ate) return aviso('Informe as duas datas.', true);
    location.hash = urlCom({ de: d.de, ate: d.ate, periodo: null, faixa: null }); };
  $$('[data-p]', tela).forEach(b => (b.onclick = () => { const k = b.dataset.p;
    if (k === 'tudo') { location.hash = urlCom({ periodo: 'tudo', de: null, ate: null }); return; }
    const ini = k === 'ano' ? hojeISO().slice(0, 4) + '-01-01' : somaMeses(mesIni, k === 'prox' ? 1 : k === 'ant' ? -1 : 0);
    const fim = k === 'ano' ? hojeISO().slice(0, 4) + '-12-31' : somaDias(somaMeses(ini, 1), -1);
    location.hash = urlCom({ de: ini, ate: fim, periodo: null, faixa: null }); }));
  // seleção para transformar em previsão / confirmar previsão
  if (podeSel) {
    const sels = () => [...new Set($$('.sel-t:checked', tela).filter(c => !c.closest('tr').hidden).map(c => c.value))];
    const atualiza = () => { const n = sels().length; const b = $('#sel-barra'); if (!b) return; b.hidden = !n;
      $('#sel-txt').innerHTML = `<b>${n}</b> conta(s) selecionada(s)`; };
    $$('.sel-t', tela).forEach(c => (c.onchange = atualiza));
    $('#sel-todos')?.addEventListener('change', e => { $$('.sel-t', tela).filter(c => !c.closest('tr').hidden).forEach(c => (c.checked = e.target.checked)); atualiza(); });
    const acao = async (prev, botao) => { const ids = sels(); if (!ids.length) return;
      const motivo = await confirmar(prev ? `Transformar ${ids.length} conta(s) em previsão de gasto?` : `Confirmar ${ids.length} previsão(ões) como conta a ${tipo === 'pagar' ? 'pagar' : 'receber'}?`,
        { comMotivo: true, botao: prev ? 'Transformar em previsão' : 'Confirmar' });
      if (!motivo) return;
      await ocupado(botao, async () => { try { const n = await api.rpc('titulos_definir_previsao', { p_ids: ids, p_previsao: prev, p_motivo: motivo });
        aviso(prev ? `${n} conta(s) agora são previsão.` : `${n} previsão(ões) confirmada(s) como conta.`); navegar(); } catch (err) { falha(err); } }); };
    $('#virar-prev')?.addEventListener('click', e => acao(true, e.currentTarget));
    $('#conf-prev')?.addEventListener('click', e => acao(false, e.currentTarget));
  }
  filtroLocal(tela, { itens: 'tbody tr[data-t]', antes: $('#sel-barra', tela) || $$('.cartao', tela).at(-1), busca: false, periodo: false,
    campos: [{ k: 'pessoa', rotulo: T.pessoa }, { k: 'tipo', rotulo: 'Tipo' }, { k: 'conta', rotulo: 'Conta do plano' }, { k: 'cc', rotulo: 'Centro de custo' }, { k: 'sit', rotulo: 'Situação' }] });
}
const tagTitulo = (s, vencida, tipo) => tipo === 'receber' && ['paga', 'pago'].includes(s) ? '<span class="tag verde">Recebida</span>' : tag(s, vencida);
// parcela: "Paga/Recebida em atraso" quando o pagamento foi depois do vencimento
const tagParcela = (p, tipo) => p.paga_atraso ? `<span class="tag amarelo" title="${p.data_pagamento ? (tipo === 'receber' ? 'Recebida' : 'Paga') + ' em ' + dataBR(p.data_pagamento) : ''}">${tipo === 'receber' ? 'Recebida' : 'Paga'} em atraso</span>` : tagTitulo(p.status, p.vencida, tipo);
const txtEncargos = p => { const j = Number(p.juros || 0), m = Number(p.multa || 0), d = Number(p.desconto || 0);
  return [j ? 'juros ' + brl(j) : '', m ? 'multa ' + brl(m) : '', d ? 'desconto ' + brl(d) : ''].filter(Boolean).join(' · '); };

// ---------- Itens da nota/fatura (descrição, quantidade, valor unitário, desconto → total da linha) ----------
const itR = v => Math.round((Number(v) || 0) * 100) / 100;
const itV = v => v == null || v === '' ? '' : Number(v).toFixed(2).replace('.', ',');
// ícone de atenção (só contorno)
const IC_ATENCAO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>';
function htmlItensNota(itens = []) {
  const linha = (i = {}) => `<tr class="it-linha${i.atencao ? ' it-destaque' : ''}"><td data-r="Descrição"><div class="it-desc"><button type="button" class="it-atencao" data-it-at aria-pressed="${!!i.atencao}" title="Marcar este ponto para atenção">${IC_ATENCAO}</button><input data-it="descricao" value="${esc(i.descricao || '')}" placeholder="Produto ou serviço"></div></td>
    <td data-r="Qtd" class="num"><input data-it="quantidade" inputmode="decimal" value="${i.quantidade != null ? String(i.quantidade).replace('.', ',') : ''}" style="max-width:80px;text-align:right"></td>
    <td data-r="Valor unitário" class="num"><input data-it="valor_unitario" inputmode="decimal" value="${itV(i.valor_unitario)}" placeholder="0,00" style="max-width:110px;text-align:right"></td>
    <td data-r="Desconto (R$)" class="num"><input data-it="desconto" inputmode="decimal" value="${itV(i.desconto)}" placeholder="0,00" style="max-width:100px;text-align:right"></td>
    <td data-r="Total da linha" class="num nowrap" data-it-tot>—</td><td><button type="button" class="btn peq" data-it-del title="Tirar linha">✕</button></td></tr>`;
  return `<div class="largo it-nota"><div class="muted" style="margin-bottom:4px">Itens da nota / fatura <span class="muted">(opcional — o total de cada linha e a soma são calculados sozinhos)</span></div>
    <div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Descrição</th><th class="num">Qtd</th><th class="num">Valor unitário</th><th class="num">Desconto (R$)</th><th class="num">Total da linha</th><th></th></tr></thead>
      <tbody data-it-corpo>${(itens.length ? itens : [{}]).map(linha).join('')}</tbody>
      <tfoot><tr><td colspan="4" class="num"><b>Soma dos itens</b></td><td class="num nowrap"><b data-it-soma>—</b></td><td></td></tr></tfoot></table></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:6px"><button type="button" class="btn peq" data-it-add>+ Item</button><span data-it-status></span></div>
    <template data-it-modelo>${linha()}</template></div>`;
}
function ligarItensNota(raiz, campoValor) {
  const corpo = $('[data-it-corpo]', raiz); if (!corpo) return;
  const calc = () => {
    let soma = 0, tem_ = false;
    $$('.it-linha', corpo).forEach(l => {
      const g = k => num($(`[data-it="${k}"]`, l).value);
      const q = g('quantidade'), u = g('valor_unitario'), d = g('desconto') || 0;
      const t = q != null && u != null ? itR(q * u - d) : null;
      $('[data-it-tot]', l).textContent = t != null ? brl(t) : '—';
      if (t != null) { soma += t; tem_ = true; }
    });
    soma = itR(soma);
    $('[data-it-soma]', raiz).textContent = tem_ ? brl(soma) : '—';
    const v = num(campoValor?.value), st = $('[data-it-status]', raiz);
    if (!tem_) st.innerHTML = '';
    else if (v == null) st.innerHTML = `<span class="muted">Informe o valor total da nota para comparar.</span> <button type="button" class="btn peq" data-it-usar>Usar ${brl(soma)} como valor total</button>`;
    else if (Math.abs(itR(v) - soma) < 0.005) st.innerHTML = '<span class="tag verde">✓ Soma dos itens bate com o valor total</span>';
    else st.innerHTML = `<span class="tag vermelho">Não bate: soma dos itens ${brl(soma)} × valor total ${brl(v)} (diferença ${brl(itR(v - soma))})</span> <button type="button" class="btn peq" data-it-usar>Usar ${brl(soma)} como valor total</button>`;
    raiz._itSoma = tem_ ? soma : null;
  };
  raiz.addEventListener('input', e => { if (e.target.closest('.it-nota') || e.target === campoValor) calc(); });
  raiz.addEventListener('click', e => {
    if (e.target.closest('[data-it-add]')) { corpo.insertAdjacentHTML('beforeend', $('[data-it-modelo]', raiz).innerHTML); calc(); }
    const at = e.target.closest('[data-it-at]');
    if (at) { const on = at.getAttribute('aria-pressed') !== 'true'; at.setAttribute('aria-pressed', String(on)); at.closest('tr').classList.toggle('it-destaque', on); at.title = on ? 'Tirar a marcação de atenção' : 'Marcar este ponto para atenção'; }
    const del = e.target.closest('[data-it-del]'); if (del) { if ($$('.it-linha', corpo).length > 1) del.closest('tr').remove(); else $$('input', del.closest('tr')).forEach(i => (i.value = '')); calc(); }
    if (e.target.closest('[data-it-usar]') && campoValor) { campoValor.value = itV(raiz._itSoma); campoValor.dispatchEvent(new Event('input', { bubbles: true })); calc(); }
  });
  calc();
}
function lerItensNota(raiz) {
  return $$('[data-it-corpo] .it-linha', raiz).map(l => {
    const g = k => $(`[data-it="${k}"]`, l).value.trim();
    const q = num(g('quantidade')), u = num(g('valor_unitario')), d = num(g('desconto')) || 0;
    const atencao = $('[data-it-at]', l)?.getAttribute('aria-pressed') === 'true';
    return { descricao: g('descricao'), quantidade: q, valor_unitario: u, desconto: d, total: q != null && u != null ? itR(q * u - d) : null, ...(atencao ? { atencao: true } : {}) };
  }).filter(i => i.descricao || i.quantidade != null || i.valor_unitario != null);
}
function htmlItensVer(itens, editavel = false) {
  if (!itens?.length) return '';
  const soma = itR(itens.reduce((a, i) => a + Number(i.total || 0), 0));
  const nAt = itens.filter(i => i.atencao).length;
  return `<div class="largo"><div class="muted">Itens da nota / fatura${nAt ? ` <span class="it-aviso">${IC_ATENCAO} ${nAt} ponto(s) de atenção</span>` : ''}</div><div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Descrição</th><th class="num">Qtd</th><th class="num">Valor unitário</th><th class="num">Desconto</th><th class="num">Total</th></tr></thead><tbody>
    ${itens.map((i, k) => `<tr${i.atencao ? ' class="it-destaque"' : ''}><td data-r="Descrição">${editavel ? `<span class="it-desc"><button type="button" class="it-atencao" data-it-ver="${k}" aria-pressed="${!!i.atencao}" title="${i.atencao ? 'Tirar a marcação de atenção' : 'Marcar este ponto para atenção'}">${IC_ATENCAO}</button>${esc(i.descricao || '—')}</span>` : `${i.atencao ? `<span class="it-ic" title="Ponto de atenção">${IC_ATENCAO}</span> ` : ''}${esc(i.descricao || '—')}`}</td><td data-r="Qtd" class="num">${i.quantidade != null ? String(i.quantidade).replace('.', ',') : '—'}</td><td data-r="Valor unitário" class="num">${i.valor_unitario != null ? brl(i.valor_unitario) : '—'}</td>
      <td data-r="Desconto" class="num">${Number(i.desconto) ? brl(i.desconto) : '—'}</td><td data-r="Total" class="num"><b>${i.total != null ? brl(i.total) : '—'}</b></td></tr>`).join('')}</tbody>
    <tfoot><tr><td colspan="4" class="num"><b>Soma</b></td><td class="num"><b>${brl(soma)}</b></td></tr></tfoot></table></div></div>`;
}
const itensConferem = async (itens, valor) => {
  if (!itens.length) return true;
  if (itens.some(i => i.total == null)) { aviso('Itens da nota: preencha quantidade e valor unitário de cada linha (ou apague a linha).', true); return false; }
  const soma = itR(itens.reduce((a, i) => a + i.total, 0));
  if (Math.abs(soma - itR(valor)) < 0.005) return true;
  return confirmar(`A soma dos itens (${brl(soma)}) não bate com o valor total (${brl(valor)}). Salvar assim mesmo?`, { botao: 'Salvar assim mesmo' });
};

async function novoTitulo(tela, tipo) {
  const T = TIPO[tipo];
  if (!editaFin()) { tela.innerHTML = '<div class="cartao vazio">Sem permissão.</div>'; return; }
  const [pess, ccs] = await Promise.all([tipo === 'pagar' ? fornecedores(true) : clientes(true), centros()]);
  const rot = x => (tipo === 'pagar' ? x.razao_social : x.nome) + (x.nome_fantasia ? ` (${x.nome_fantasia})` : '') + (x.documento ? ' · ' + fmtDoc(x.documento) : '');
  tela.innerHTML = `
    <div class="topo"><div><h1>${T.novo}</h1><p class="sub">${tipo === 'pagar' ? 'Para compras anteriores ao sistema, marque a opção no fim do formulário.' : 'Fretes e outras receitas. Pode dividir em parcelas.'}</p></div></div>
    <form class="cartao form" id="f-tit">
      <label class="campo largo">${T.cadastro}<select name="pessoa_id">${opcoes(pess.filter(f => f.ativo), null, rot, null, 'Sem cadastro (digitar nome abaixo)')}</select></label>
      <label class="campo largo" id="campo-fav">Nome do ${T.pessoa.toLowerCase()}<input name="favorecido_nome" placeholder="${tipo === 'pagar' ? 'Quem vai receber' : 'Quem vai pagar'}"></label>
      <label class="campo largo">Descrição<input name="descricao" required placeholder="${T.exemplo}"></label>
      <label class="campo">Nº do documento (${tipo === 'pagar' ? 'NF, boleto' : 'NF, CT-e, fatura'})<input name="documento"></label>
      <label class="campo">Data de emissão<input type="date" name="data_emissao" value="${hojeISO()}" required></label>
      <label class="campo">Conta do plano<select name="conta_id" required>${await opcoesContas(null, T.tiposConta)}</select></label>
      <label class="campo">Centro de custo<select name="centro_custo_id">${opcoes(ccs.filter(c => c.ativo), null, c => c.nome, ccs.find(c => c.codigo === 'GERAL')?.id, null)}</select></label>
      <label class="campo">Valor total (R$)<input name="valor" inputmode="decimal" required placeholder="0,00"></label>
      <label class="campo">Nº de parcelas<input type="number" name="parcelas" min="1" max="60" value="1" required></label>
      <label class="campo">1º vencimento<input type="date" name="vencimento" value="${hojeISO()}" required></label>
      <label class="campo">Intervalo<select name="intervalo"><option value="mes">Mensal</option><option value="30">A cada 30 dias</option><option value="15">A cada 15 dias</option><option value="7">Semanal</option></select></label>
      <label class="check"><input type="checkbox" name="avista"> Pago/pagar à vista (vence na data de emissão)</label>
      <div class="largo" id="prazo-info"></div>
      ${tipo === 'pagar' ? htmlItensNota() : ''}
      <label class="campo largo">Observações<textarea name="observacoes" rows="2" placeholder="Informações para o Financeiro (condição combinada, referência, contrato…)"></textarea></label>
      <label class="check largo"><input type="checkbox" name="previsao"> ${tipo === 'pagar' ? 'Previsão de gasto' : 'Receita prevista'}</label>
      <label class="check largo"><input type="checkbox" name="legado"> ${T.legado}</label>
      <label class="campo largo">Anexos (${tipo === 'pagar' ? 'boleto, nota' : 'nota, CT-e, comprovante'})<input type="file" name="arquivos" accept="image/*,application/pdf" multiple></label>
      <div class="largo muted" id="previa"></div>
      <div class="largo acoes"><button class="btn prim">Salvar</button><a class="btn" href="${T.rota}">Cancelar</a></div>
    </form>`;
  const f = $('#f-tit');
  const venc = (d, i) => d.intervalo === 'mes' ? somaMeses(d.vencimento, i) : somaDias(d.vencimento, i * Number(d.intervalo));
  const plano = d => {
    const n = Math.max(1, parseInt(d.parcelas) || 1), v = num(d.valor) || 0;
    const base = Math.floor((v / n) * 100) / 100;
    return Array.from({ length: n }, (_, i) => ({ parcela: i + 1, vencimento: venc(d, i), valor: i === n - 1 ? Math.round((v - base * (n - 1)) * 100) / 100 : base }));
  };
  const prev = () => { const d = formDados(f); $('#campo-fav').hidden = !!d.pessoa_id;
    $('#previa').innerHTML = num(d.valor) ? plano(d).map(x => `${x.parcela}ª ${dataBR(x.vencimento)} · ${brl(x.valor)}`).join(' &nbsp;|&nbsp; ') : ''; };
  f.oninput = prev; prev();
  ligarItensNota(f, f.valor);
  // vencimento automático pelo prazo de faturamento do cadastro (editável em caso extraordinário)
  let vencManual = false;
  f.vencimento.addEventListener('input', () => { vencManual = true; });
  const prazoAuto = () => {
    const p = pess.find(x => x.id === f.pessoa_id.value);
    const info = $('#prazo-info');
    if (f.avista.checked) { f.vencimento.value = f.data_emissao.value; vencManual = false;
      info.innerHTML = '<span class="muted">À vista: vencimento = data de emissão.</span>'; }
    else if (p && p.prazo_faturamento_dias != null) {
      if (!vencManual) f.vencimento.value = somaDias(f.data_emissao.value, p.prazo_faturamento_dias);
      info.innerHTML = `<span class="muted">${p.prazo_faturamento_dias ? `Faturamento de <b>${p.prazo_faturamento_dias} dias</b>` : 'Fornecedor recebe <b>à vista</b>'} (do cadastro): vencimento calculado sozinho${vencManual ? ' — <b>alterado à mão</b> <button type="button" class="btn peq" id="volta-prazo">Voltar ao prazo</button>' : '. Mude a data só em caso extraordinário.'}</span>`;
      $('#volta-prazo')?.addEventListener('click', () => { vencManual = false; prazoAuto(); prev(); });
    } else info.innerHTML = p ? '<span class="muted">Este cadastro não tem prazo de faturamento: informe o vencimento (ou cadastre o prazo no fornecedor).</span>' : '';
    if (p?.cobranca === 'fixa_mensal') info.innerHTML += '<div class="cartao" style="border-left:4px solid var(--ouro);margin:8px 0 0;padding:10px">Este fornecedor tem <b>valor fixo mensal</b>: a conta de cada mês já é lançada sozinha em <a href="#/financeiro/pagar?aba=fixas">Contas fixas mensais</a>. Lance aqui só uma despesa extra (fora do contrato).</div>';
  };
  f.pessoa_id.addEventListener('change', () => { const p = pess.find(x => x.id === f.pessoa_id.value); vencManual = false;
    if (p?.conta_padrao_id && !f.conta_id.value) f.conta_id.value = p.conta_padrao_id;
    prazoAuto(); prev(); });
  f.data_emissao.addEventListener('change', () => { prazoAuto(); prev(); });
  f.avista.addEventListener('change', () => { prazoAuto(); prev(); });
  f.onsubmit = async e => {
    e.preventDefault();
    const d = formDados(f);
    if (!d.pessoa_id && !d.favorecido_nome) return aviso(`Escolha o ${T.cadastro.toLowerCase()} ou digite o nome.`, true);
    const v = num(d.valor); if (!v || v <= 0) return aviso('Informe o valor.', true);
    const itens = lerItensNota(f); if (!await itensConferem(itens, v)) return;
    await ocupado(e.submitter, async () => {
      try {
        const [t] = await api.inserir('titulos', { tipo, itens, observacoes: d.observacoes || null, origem: d.legado ? 'legado' : 'avulso',
          fornecedor_id: tipo === 'pagar' ? d.pessoa_id || null : null, cliente_id: tipo === 'receber' ? d.pessoa_id || null : null,
          favorecido_nome: d.pessoa_id ? null : d.favorecido_nome, descricao: d.descricao, documento: d.documento || null,
          data_emissao: d.data_emissao, competencia: d.data_emissao.slice(0, 8) + '01', conta_id: d.conta_id, centro_custo_id: d.centro_custo_id || null, valor_total: v, status: d.previsao ? 'previsto' : 'aberto' });
        await api.inserir('titulo_parcelas', plano(d).map(p => ({ ...p, titulo_id: t.id, status: d.previsao ? 'prevista' : 'aberta' })));
        await anexar('titulo', t.id, d.arquivos);
        aviso(`${d.previsao ? (tipo === 'pagar' ? 'Previsão de gasto' : 'Receita prevista') : tipo === 'pagar' ? 'Conta a pagar' : 'Conta a receber'} ${t.numero} criada.`);
        location.hash = T.rota + '/ver/' + t.id;
      } catch (err) { falha(err); }
    });
  };
}

async function verTitulo(tela, id, tipo) {
  const T = TIPO[tipo];
  const t = await api.um('titulos', `id=eq.${id}&select=*,conta:plano_contas(codigo,nome),cc:centros_custo(nome),forn:fornecedores(razao_social,documento,chave_pix,dados_bancarios,boleto,prazo_faturamento_dias),cli:clientes(nome,documento),colab:usuarios(nome,chave_pix)`);
  if (!t) { tela.innerHTML = '<div class="cartao vazio">Conta não encontrada ou sem acesso.</div>'; return; }
  if (t.tipo && t.tipo !== tipo) { location.hash = TIPO[t.tipo].rota + '/ver/' + id; return; }
  const ps = t.status !== 'cancelado' ? await api.listar('v_parcelas', `titulo_id=eq.${id}&order=parcela`).catch(() => api.listar('titulo_parcelas', `titulo_id=eq.${id}&order=parcela`))
    : await api.listar('titulo_parcelas', `titulo_id=eq.${id}&order=parcela`);
  const reneg = ps.length ? await api.listar('parcela_renegociacoes', `parcela_id=${lista(ps.map(p => p.id))}&order=criado_em&select=parcela_id,vencimento_anterior,vencimento_novo,motivo,criado_em,u:usuarios(nome)`).catch(() => []) : [];
  const encT = ps.reduce((x, p) => x + Number(p.encargos || 0), 0), pagoT = ps.reduce((x, p) => x + Number(p.total_pago ?? p.valor_pago ?? 0), 0);
  const baixas = veTudo() && ps.length ? await api.listar('baixas', `parcela_id=${lista(ps.map(p => p.id))}&cancelado_em=is.null&order=data_pagamento`) : [];
  const bs = await bancos();
  const semComp = new Set(baixas.length ? (await api.listar('v_pagamentos_sem_comprovante', `select=baixa_id&titulo_id=eq.${id}`)).map(x => x.baixa_id) : []);
  const compBaixa = {}; for (const b of baixas) compBaixa[b.id] = await htmlAnexos('baixa', b.id);
  const reembs = t.origem === 'reembolso' ? await api.listar('reembolsos', `titulo_id=eq.${id}&select=id,numero,data_despesa,descricao,valor&order=data_despesa`) : [];
  // compra: mostra se o produto já chegou no almoxarifado (documentos e recebimento são etapas separadas)
  let receb = null;
  if (t.origem === 'pedido' && t.origem_id) {
    const [ped, rs] = await Promise.all([api.um('pedidos', `id=eq.${t.origem_id}&select=id,numero,status`).catch(() => null),
      api.listar('recebimentos', `pedido_id=eq.${t.origem_id}&cancelado_em=is.null&status=neq.cancelado&order=data_recebimento`).catch(() => [])]);
    if (ped) receb = { ped, completo: rs.some(x => x.entrega_completa), parcial: rs.length > 0, data: rs.length ? rs[rs.length - 1].data_recebimento : null, div: rs.find(x => x.entrega_completa && x.divergencia)?.divergencia };
  }
  const ctD = t.origem === 'recorrente' && t.origem_id ? await api.um('contas_recorrentes', `id=eq.${t.origem_id}`).catch(() => null) : null;
  const ehDiaria = ctD?.tipo === 'diaria';
  const pessoa = t.forn?.razao_social || t.cli?.nome || t.colab?.nome || t.favorecido_nome || '—';
  const pix = t.forn?.chave_pix || t.colab?.chave_pix;
  const origens = { reembolso: 'Reembolso', avulso: 'Lançamento avulso', legado: tipo === 'pagar' ? 'Compra anterior ao sistema' : 'Venda anterior ao sistema', pedido: 'Pedido de compra', recorrente: 'Conta fixa mensal (contrato do fornecedor)', fechamento: 'Fatura do posto (abastecimentos)', adiantamento: 'Adiantamento', folha: 'Folha de pagamento' };
  tela.innerHTML = `
    <div class="topo"><div><h1>${esc(t.numero)} · ${esc(pessoa)}</h1><p class="sub">${tagTitulo(t.status, false, tipo)} · ${esc(t.descricao || '')}</p></div>
      <div class="acoes">${editaFin() && t.status !== 'cancelado' ? `<a class="btn prim" href="${T.rota}/editar/${id}">Editar</a>` : ''}${editaFin() && t.status === 'previsto' && t.origem !== 'fechamento' ? '<button class="btn ok" id="conf-prev">Confirmar como conta</button>' : ''}${editaFin() && ['aberto', 'aprovado'].includes(t.status) && !baixas.length ? '<button class="btn" id="virar-prev">Transformar em previsão</button>' : ''}${editaFin() && !['pago', 'cancelado'].includes(t.status) && !baixas.length ? '<button class="btn perigo" id="cancelar">Cancelar conta</button>' : ''}
        ${editaFin() && t.status !== 'cancelado' && baixas.length ? '<button class="btn perigo" id="estornar">Estornar pagamento</button>' : ''}
        <button class="btn" onclick="history.back()">Voltar</button></div></div>
    ${t.status === 'previsto' ? `<div class="cartao fr-aviso-prev">${ico('relogio')} <span><b>${tipo === 'pagar' ? 'Previsão de gasto' : 'Receita prevista'}</b></span></div>` : ''}
    ${ehDiaria ? cartaoDiarias(t, ctD, ps) : ''}
    ${tipo === 'pagar' && t.status !== 'cancelado' ? cartaoPagamento(t, ps) : ''}
    <div class="cartao"><div class="form">
      <div><div class="muted">${T.pessoa}</div><b>${esc(pessoa)}</b>${(t.cli?.documento || t.forn?.documento) ? `<div class="muted">${esc(fmtDoc(t.cli?.documento || t.forn?.documento))}</div>` : ''}${tipo === 'pagar' ? '' : t.forn ? (dadosPagamento(t.forn) ? `<div class="muted" style="white-space:pre-line">${esc(dadosPagamento(t.forn))}</div>` : '') : pix ? `<div class="muted">Pix: ${esc(pix)}</div>` : ''}</div>
      <div><div class="muted">Valor total</div><b>${brl(t.valor_total)}</b>${encT ? `<div class="enc ${encT > 0 ? 'mais' : 'menos'}">${encT > 0 ? '+' : '−'} ${brl(Math.abs(encT))} ${encT > 0 ? 'juros/multa' : 'desconto'} · ${tipo === 'receber' ? 'recebido' : 'pago'} ${brl(pagoT)}</div>` : ''}</div>
      <div><div class="muted">Documento</div><b>${esc(t.documento || '—')}</b></div>
      <div><div class="muted">Emissão</div><b>${dataBR(t.data_emissao)}</b></div>
      <div><div class="muted">Conta</div><b>${esc(t.conta ? t.conta.codigo + ' ' + t.conta.nome : '—')}</b></div>
      <div><div class="muted">Centro de custo</div><b>${esc(t.cc?.nome || '—')}</b></div>
      <div><div class="muted">Origem</div><b>${esc(origens[t.origem] || t.origem)}</b>${t.id_legado?.startsWith('planilha') ? '<div class="muted">Planilha de controle anterior</div>' : ''}</div>
      ${receb ? `<div><div class="muted">Pedido / recebimento do produto</div><a href="#/compras/pedidos/ver/${receb.ped.id}">${esc(receb.ped.numero)}</a> · ${receb.completo ? `<span class="tag ${receb.div ? 'vermelho' : 'verde'}">${receb.div ? 'Recebido com divergência' : 'Produto recebido'} em ${dataBR(receb.data)}</span>` : receb.parcial ? '<span class="tag amarelo">Recebido em parte</span>' : '<span class="tag amarelo">Produto ainda não chegou</span>'}</div>` : ''}
      ${htmlItensVer(t.itens, editaFin())}
      ${blocoObservacao(t.observacoes, editaFin())}
      <div class="largo"><div class="muted">Anexos</div>${await htmlAnexos('titulo', id)}
        ${editaFin() ? '<label class="campo" style="margin-top:8px">Incluir anexo<input type="file" id="mais" multiple></label>' : ''}</div>
    </div></div>
    ${reembs.length ? `<div class="cartao"><h2>Reembolsos deste pagamento</h2><table><tbody>${reembs.map(r => `<tr class="clicavel" onclick="location.hash='#/reembolsos/ver/${r.id}'"><td>${esc(r.numero)}</td><td>${dataBR(r.data_despesa)}</td><td>${esc(r.descricao || '')}</td><td class="num">${brl(r.valor)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    <div class="cartao"><h2>Parcelas</h2><div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Parcela</th><th>Vencimento</th><th class="num">Valor</th><th class="num">${T.feito}</th><th>Situação</th><th></th></tr></thead><tbody>
      ${ps.map(p => `<tr><td data-r="Parcela">${p.parcela}ª</td><td data-r="Vencimento">${dataBR(p.vencimento)}${reneg.some(x => x.parcela_id === p.id) ? `<div class="enc">renegociada · orig. ${dataBR(reneg.find(x => x.parcela_id === p.id).vencimento_anterior)}</div>` : ''}</td><td data-r="Valor" class="num">${brl(p.valor)}</td>
        <td data-r="${T.feito}" class="num">${brl(p.total_pago ?? p.valor_pago)}${Number(p.encargos) ? `<div class="enc">${esc(txtEncargos(p))}</div>` : ''}</td><td data-r="Situação">${tagParcela({ ...p, vencida: ['aberta', 'aprovada'].includes(p.status) && p.vencimento < hojeISO() }, tipo)}</td>
        <td>${editaFin() && ['aberta', 'aprovada'].includes(p.status) && t.status !== 'cancelado' ? `<button class="btn ok peq" data-baixa="${p.id}">${T.baixa}</button> <button class="btn peq" data-reneg="${p.id}" title="Acordo de novo prazo">Renegociar vencimento</button>` : ''}</td></tr>`).join('')}
    </tbody></table></div>
    ${reneg.length ? `<h3 style="margin:14px 0 6px">Renegociações de vencimento</h3><ul class="ac-hist">${reneg.map(x => `<li>${ps.length > 1 ? (ps.find(p => p.id === x.parcela_id)?.parcela || '') + 'ª · ' : ''}${dataBR(x.vencimento_anterior)} → <b>${dataBR(x.vencimento_novo)}</b> · ${esc(x.motivo)} <span class="muted">· ${esc(x.u?.nome || '')} em ${dataHoraBR(x.criado_em)}</span></li>`).join('')}</ul>` : ''}</div>
    ${baixas.length ? `<div class="cartao"><h2>${tipo === 'pagar' ? 'Pagamentos' : 'Recebimentos'}</h2><ul class="lista-simples">${baixas.map(b => `<li style="flex-wrap:wrap"><span>${dataBR(b.data_pagamento)} · ${esc(bs.find(x => x.id === b.conta_bancaria_id)?.nome || '')}${b.forma_pagamento ? ' · ' + esc(b.forma_pagamento) : ''}${b.observacao ? ' · ' + esc(b.observacao) : ''}</span><b>${brl(Number(b.valor) + Number(b.juros) + Number(b.multa) - Number(b.desconto))}${Number(b.juros) || Number(b.multa) || Number(b.desconto) ? `<span class="enc" style="font-weight:400"> (${brl(b.valor)}${Number(b.juros) ? ' + juros ' + brl(b.juros) : ''}${Number(b.multa) ? ' + multa ' + brl(b.multa) : ''}${Number(b.desconto) ? ' − desconto ' + brl(b.desconto) : ''})</span>` : ''}</b>
      <div style="flex-basis:100%">${tipo === 'pagar' && semComp.has(b.id) ? `<span class="tag amarelo">Comprovante pendente</span>
        ${editaFin() ? `<label class="btn peq" style="margin-left:6px">Anexar comprovante<input type="file" hidden accept="image/*,application/pdf" multiple data-comp="${b.id}"></label>
        <button class="btn peq" data-din="${b.id}">Foi em dinheiro</button>` : ''}` : `<span class="muted">Comprovante:</span> ${b.forma_pagamento === 'Dinheiro' && compBaixa[b.id].includes('Sem anexos') ? '<span class="muted">pagamento em dinheiro (sem comprovante)</span>' : compBaixa[b.id]}`}</div></li>`).join('')}</ul></div>` : ''}`;
  ligarObservacao('titulos', id, t.observacoes);
  // marcar/desmarcar ponto de atenção direto na conta
  $$('[data-it-ver]', tela).forEach(b => (b.onclick = async () => {
    const itens = (t.itens || []).map((x, k) => k === Number(b.dataset.itVer) ? { ...x, atencao: !x.atencao } : x).map(({ atencao, ...x }) => (atencao ? { ...x, atencao: true } : x));
    try { await api.alterar('titulos', `id=eq.${id}`, { itens }); navegar(); } catch (err) { falha(err); }
  }));
  $$('[data-copiar]', tela).forEach(b => (b.onclick = async () => { const v = b.dataset.copiar;
    try { await navigator.clipboard.writeText(v); } catch { const ta = document.createElement('textarea'); ta.value = v; document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
    aviso('Copiado: ' + (v.length > 40 ? v.slice(0, 40) + '…' : v)); }));
  const prevAcao = async (prev, botao) => {
    const motivo = await confirmar(prev ? 'Transformar esta conta em previsão de gasto?' : 'Confirmar esta previsão como conta (o documento chegou)?', { comMotivo: true, botao: prev ? 'Transformar em previsão' : 'Confirmar como conta' });
    if (!motivo) return;
    await ocupado(botao, async () => { try { await api.rpc('titulos_definir_previsao', { p_ids: [id], p_previsao: prev, p_motivo: motivo }); aviso(prev ? 'Agora é uma previsão.' : 'Previsão confirmada como conta.'); navegar(); } catch (err) { falha(err); } }); };
  $('#virar-prev')?.addEventListener('click', e => prevAcao(true, e.currentTarget));
  $('#conf-prev')?.addEventListener('click', e => prevAcao(false, e.currentTarget));
  $$('[data-comp]', tela).forEach(inp => inp.addEventListener('change', async e => {
    try { await anexar('baixa', inp.dataset.comp, [...e.target.files]); aviso('Comprovante anexado.'); navegar(); } catch (err) { falha(err); } }));
  $$('[data-din]', tela).forEach(b => b.addEventListener('click', async () => {
    if (!await confirmar('Este pagamento foi feito em dinheiro (sem comprovante)?', { botao: 'Sim, em dinheiro' })) return;
    try { await api.alterar('baixas', `id=eq.${b.dataset.din}`, { forma_pagamento: 'Dinheiro' }); aviso('Registrado como pagamento em dinheiro.'); navegar(); } catch (err) { falha(err); } }));
  $('#mais')?.addEventListener('change', async e => { try { await anexar('titulo', id, [...e.target.files]); aviso('Anexo incluído.'); navegar(); } catch (err) { falha(err); } });
  $('#estornar')?.addEventListener('click', async () => {
    const total = baixas.reduce((x, b) => x + Number(b.valor) + Number(b.juros) + Number(b.multa) - Number(b.desconto), 0);
    const r = await modal(`<form><h2>Estornar pagamento · ${esc(t.numero)}</h2>
      <div class="aviso-lei"><b>O que acontece</b><ul>
        <li>${baixas.length} ${tipo === 'pagar' ? 'pagamento(s)' : 'recebimento(s)'} de ${brl(total)} deixam de existir no extrato (se já conciliado, entra um lançamento de estorno).</li>
        <li>A conta ${esc(t.numero)} fica cancelada, com o motivo e quem estornou.</li>
        ${reembs.length ? `<li>${reembs.length} reembolso(s) deste pagamento: escolha abaixo se voltam para "aprovado" (para pagar de novo ou mudar a forma de custeio) ou se são cancelados.</li>` : ''}
      </ul>Use só quando o pagamento <b>não</b> aconteceu de verdade ou foi lançado por engano. Se o dinheiro saiu, registre a devolução em vez de estornar.</div>
      <div class="form">
        ${reembs.length ? `<label class="campo largo">Reembolsos<select name="dest"><option value="voltar">Voltar para aprovado (a pagar)</option><option value="cancelar">Cancelar os reembolsos</option></select></label>` : ''}
        <label class="campo largo">Motivo<textarea name="motivo" required></textarea></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn perigo">Estornar</button></div></form>`);
    if (!r) return;
    try { const x = await api.rpc('estornar_pagamento', { p_titulo: id, p_motivo: r.motivo, p_reembolsos: r.dest || 'voltar' });
          aviso(`Pagamento estornado (${brl(x.valor)})${x.reembolsos ? ` · ${x.reembolsos} reembolso(s) ${r.dest === 'cancelar' ? 'cancelado(s)' : 'de volta a aprovado'}` : ''}.`); navegar(); } catch (err) { falha(err); }
  });
  $('#cancelar')?.addEventListener('click', async () => {
    const motivo = await confirmar('Cancelar esta conta?', { comMotivo: true, botao: 'Cancelar conta' });
    if (!motivo) return;
    try {
      await api.alterar('titulo_parcelas', `titulo_id=eq.${id}&status=in.(aberta,aprovada,prevista)`, { status: 'cancelada' });
      await api.alterar('titulos', `id=eq.${id}`, { status: 'cancelado', cancelado_em: new Date().toISOString(), cancelado_por: estado.usuario.id, motivo_cancelamento: motivo });
      if (t.origem === 'reembolso') await api.alterar('reembolsos', `titulo_id=eq.${id}&status=eq.em_pagamento`, { status: 'aprovado', titulo_id: null });
      aviso('Conta cancelada.'); navegar();
    } catch (err) { falha(err); }
  });
  $$('[data-reneg]', tela).forEach(b => b.addEventListener('click', async () => {
    const p = ps.find(x => x.id === b.dataset.reneg); if (!p) return;
    const r = await modal(`<form><h2>Renegociar vencimento · ${esc(t.numero)}${ps.length > 1 ? ' · ' + p.parcela + 'ª parcela' : ''}</h2><div class="form">
      <div><div class="muted">Vencimento atual</div><b>${dataBR(p.vencimento)}</b>${p.vencimento < hojeISO() ? ' <span class="tag vermelho">vencida</span>' : ''}</div>
      <div><div class="muted">Valor em aberto</div><b>${brl(Number(p.valor) - Number(p.valor_pago || 0))}</b></div>
      <label class="campo">Novo vencimento *<input type="date" name="venc" required min="${hojeISO()}"></label>
      <label class="campo largo">Acordo / motivo *<textarea name="motivo" rows="2" required placeholder="Ex.: acordado com o fornecedor por telefone em 20/10, pagamento em 30/10 sem juros"></textarea></label>
      <label class="campo largo">Comprovante do acordo (e-mail, mensagem…)<input type="file" name="arquivos" multiple></label></div>
      <p class="muted">O vencimento original fica registrado no histórico. Se o acordo tiver juros ou multa, informe no momento do pagamento.</p>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Renegociar</button></div></form>`);
    if (!r) return;
    try { await api.rpc('renegociar_parcela', { p_parcela: p.id, p_vencimento: r.venc, p_motivo: r.motivo });
      if (r.arquivos?.length) await anexar('titulo', id, r.arquivos, 'Acordo de novo vencimento');
      aviso(`Vencimento renegociado para ${dataBR(r.venc)}.`); navegar(); } catch (err) { falha(err); }
  }));
  $$('[data-baixa]', tela).forEach(b => b.addEventListener('click', async () => {
    if (await modalBaixa(ps.find(x => x.id === b.dataset.baixa), tipo)) navegar();
  }));
}

// Dados para pagamento do favorecido (sem sair da conta): conta bancária, Pix, boleto da parcela, com botões de copiar
function cartaoPagamento(t, ps) {
  const f = t.forn, colab = t.colab;
  const contas = (Array.isArray(f?.dados_bancarios) && f.dados_bancarios.length ? f.dados_bancarios : Array.isArray(t.dados_pagamento) ? t.dados_pagamento : []).slice().sort((a, b) => (b.principal ? 1 : 0) - (a.principal ? 1 : 0));
  const prox = ps.find(p => ['aberta', 'aprovada'].includes(p.status)) || ps.find(p => p.status === 'prevista');
  const cp = (v, rot = 'Copiar') => v ? `<button type="button" class="btn peq dp-cp" data-copiar="${esc(String(v))}" title="${rot}">${ico('copiar')}<span>${rot}</span></button>` : '';
  const item = (rot, val, copiavel = val, extra = '') => val ? `<div class="dp-it"><span class="dp-r">${rot}</span><span class="dp-v">${esc(String(val))}${extra}</span>${copiavel ? cp(copiavel) : ''}</div>` : '';
  const nomeFav = f?.razao_social || colab?.nome || t.favorecido_nome;
  const docFav = f?.documento || (Array.isArray(t.dados_pagamento) ? t.dados_pagamento[0]?.titular_documento : null);
  let corpo = '';
  corpo += `<div class="dp-bloco"><h3>Favorecido</h3>${item('Nome', nomeFav)}${docFav ? item(docFav.replace(/\D/g, '').length > 11 ? 'CNPJ' : 'CPF', fmtDoc(docFav), docFav.replace(/\D/g, '')) : ''}
    ${f?.prazo_faturamento_dias != null ? item('Prazo', f.prazo_faturamento_dias ? f.prazo_faturamento_dias + ' dias (faturamento)' : 'À vista', '') : ''}</div>`;
  if (prox) {
    const saldo = Number(prox.valor) - Number(prox.valor_pago);
    corpo += `<div class="dp-bloco"><h3>${prox.status === 'prevista' ? 'Parcela prevista' : 'Parcela a pagar'}</h3>${item('Parcela', `${prox.parcela}ª de ${ps.filter(p => p.status !== 'cancelada').length}`, '')}
      ${item('Vencimento', dataBR(prox.vencimento), '', prox.vencimento < hojeISO() && prox.status !== 'prevista' ? ' <span class="tag vermelho">vencida</span>' : '')}
      ${item('Valor', brl(saldo), saldo.toFixed(2).replace('.', ','))}
      ${item('Linha digitável', prox.linha_digitavel, (prox.linha_digitavel || '').replace(/\s/g, ''))}${item('Pix copia e cola', prox.pix_copia_cola ? prox.pix_copia_cola.slice(0, 38) + (prox.pix_copia_cola.length > 38 ? '…' : '') : '', prox.pix_copia_cola)}</div>`;
  }
  const bancos = contas.filter(c => c.banco || c.conta || c.pix_chave);
  if (bancos.length) corpo += bancos.map((c, i) => `<div class="dp-bloco"><h3>${c.principal || bancos.length === 1 ? 'Conta para pagamento' : 'Outra conta'}${c.principal && bancos.length > 1 ? ' <span class="tag verde">principal</span>' : ''}</h3>
      ${item('Pix' + (c.pix_tipo ? ` (${c.pix_tipo})` : ''), c.pix_chave)}
      ${item('Banco', c.banco ? (typeof nomeBanco === 'function' ? nomeBanco(c.banco) : c.banco) : '', c.banco || '')}${item('Agência', c.agencia)}${item(c.tipo_conta ? 'Conta ' + c.tipo_conta.toLowerCase() : 'Conta', c.conta)}
      ${item('Titular', c.titular)}${c.titular_documento ? item('CPF/CNPJ do titular', fmtDoc(c.titular_documento), c.titular_documento.replace(/\D/g, '')) : ''}</div>`).join('');
  const pixAvulso = !bancos.some(c => c.pix_chave) && (f?.chave_pix || colab?.chave_pix);
  if (pixAvulso) corpo += `<div class="dp-bloco"><h3>Pix</h3>${item('Chave', pixAvulso)}</div>`;
  const nada = !bancos.length && !pixAvulso && !prox?.linha_digitavel && !prox?.pix_copia_cola;
  return `<div class="cartao dados-pag"><div class="dp-topo"><h2>${ico('carteira')} Dados para pagamento</h2>${f?.boleto ? '<span class="tag azul">Fornecedor emite boleto</span>' : ''}
      ${t.fornecedor_id ? `<a class="btn peq" href="#/cadastros/fornecedores/ver/${t.fornecedor_id}">Abrir cadastro</a>` : ''}</div>
    <div class="dp-grade">${corpo}</div>
    ${nada ? `<p class="muted" style="margin:6px 0 0">Sem dados bancários cadastrados.</p>` : ''}</div>`;
}

// Registrar pagamento/recebimento de uma parcela (usado na conta e na lista de contas fixas)
async function modalBaixa(p, tipo, titulo = '') {
  const T = TIPO[tipo]; const bs = await bancos();
  const saldo = Number(p.valor) - Number(p.valor_pago);
  const r = await modal(`<form><h2>${T.baixa} · ${titulo ? esc(titulo) + ' · ' : ''}${p.parcela}ª parcela</h2>
      <p class="muted">Vencimento ${dataBR(p.vencimento)} · ${brl(p.valor)}</p><div class="form">
      <label class="campo">Data<input type="date" name="data" value="${hojeISO()}" required></label>
      <label class="campo">Valor (R$)<input name="valor" inputmode="decimal" value="${saldo.toFixed(2).replace('.', ',')}" required></label>
      <label class="campo">${T.conta}<select name="conta" required>${opcoes(bs.filter(x => x.ativo), null, x => x.nome, bs.find(x => x.tipo === 'corrente')?.id, null)}</select></label>
      <label class="campo">Juros (R$)<input name="juros" inputmode="decimal" placeholder="0,00"></label>
      <label class="campo">Multa (R$)<input name="multa" inputmode="decimal" placeholder="0,00"></label>
      <label class="campo">Desconto (R$)<input name="desconto" inputmode="decimal" placeholder="0,00"></label>
      <label class="campo">Forma de pagamento<select name="forma" required><option value="">Selecione…</option>${FORMAS_BAIXA.map(f => `<option>${f}</option>`).join('')}</select></label>
      <label class="campo largo">Observação<input name="obs"></label>
      <label class="campo largo">Comprovante ${tipo === 'pagar' ? '(obrigatório, exceto dinheiro)' : ''}<input type="file" name="arquivos" accept="image/*,application/pdf" multiple></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn ok">Confirmar</button></div></form>`,
    { validar: d => !d.forma ? 'Informe a forma de pagamento.'
        : tipo === 'pagar' && d.forma !== 'Dinheiro' && !d.arquivos.length ? 'Anexe o comprovante do pagamento. Só pagamento em dinheiro dispensa comprovante.' : null });
  if (!r) return false;
  try {
    const baixaId = await api.rpc('registrar_baixa', { p_parcela: p.id, p_data: r.data, p_valor: num(r.valor), p_conta_bancaria: r.conta,
      p_juros: num(r.juros) || 0, p_multa: num(r.multa) || 0, p_desconto: num(r.desconto) || 0, p_obs: r.obs || null, p_forma: r.forma });
    await anexar('baixa', baixaId, r.arquivos);
    aviso(T.baixaFeita); return true;
  } catch (err) { falha(err); return false; }
}

// ---------- Contas fixas mensais ----------
async function listaFixas(tela) {
  const mes = estado.params.get('mes') || hojeISO().slice(0, 7);
  const ini = mes + '-01', fim = somaDias(somaMeses(ini, 1), -1);
  const [cts, ps, atras] = await Promise.all([
    api.listar('v_contas_fixas', 'order=fornecedor').catch(() => []),
    api.listar('v_parcelas', `tipo=eq.pagar&origem=eq.recorrente&vencimento=gte.${ini}&vencimento=lte.${fim}&status=neq.cancelada&order=vencimento`),
    api.listar('v_parcelas', `tipo=eq.pagar&origem=eq.recorrente&vencimento=lt.${ini}&status=in.(aberta,aprovada)&order=vencimento`)]);
  const forn = porId(await fornecedores());
  const nome = p => forn[p.fornecedor_id]?.nome_fantasia || forn[p.fornecedor_id]?.razao_social || p.favorecido_nome || '—';
  const ativos = cts.filter(c => c.ativo && (!c.fim || c.fim >= ini));
  const pagas = ps.filter(p => p.status === 'paga'), abertas = ps.filter(p => p.status !== 'paga');
  const linha = p => `<tr data-t="${p.titulo_id}"${fAttr('pessoa', nome(p))}${fAttr('valor', p.valor)}><td data-r="Vence" class="nowrap">${dataBR(p.vencimento)}</td><td data-r="Fornecedor"><b>${esc(nome(p))}</b><div class="muted">${esc(p.descricao || '')}</div></td>
    <td data-r="Valor" class="num"><b>${brl(p.valor)}</b></td><td data-r="Situação">${p.status === 'paga' ? '<span class="tag verde">Pago</span>' : tag(p.status, p.vencida)}</td>
    <td data-r="">${p.status === 'prevista' && /\(diárias\)/.test(p.descricao || '') ? `<button class="btn prim peq" data-fd="${p.titulo_id}">Fechar diárias</button>` : p.status !== 'paga' && editaFin() ? `<button class="btn ok peq" data-pagar="${p.id}">Confirmar pagamento</button>` : ''} <a class="btn peq" href="#/financeiro/pagar/ver/${p.titulo_id}">Abrir</a></td></tr>`;
  tela.innerHTML = `
    <div class="topo"><div><h1>Contas a pagar</h1><p class="sub">Fornecedores com valor fixo em data fixa: o sistema lança a conta de cada mês sozinho — aqui você só confirma o pagamento.</p></div>
      ${editaFin() ? '<div class="acoes"><a class="btn" href="#/cadastros/fornecedores">Cadastrar/alterar contrato fixo</a></div>' : ''}</div>
    ${abasPagar('fixas')}
    <form class="filtros" id="f-mes"><label class="fl-data">Mês<input type="month" name="mes" value="${mes}"></label>
      <button type="button" class="btn peq" data-m="-1">◀ Mês anterior</button><button type="button" class="btn peq" data-m="1">Próximo mês ▶</button></form>
    <div class="grade" style="margin-bottom:14px">
      <div class="cartao kpi"><div class="n">${brl(ps.reduce((a, p) => a + Number(p.valor), 0))}</div><div class="r">contas fixas de ${mesAb2(mes)} (${ps.length})</div></div>
      <div class="cartao kpi"><div class="n">${brl(pagas.reduce((a, p) => a + Number(p.valor_pago), 0))}</div><div class="r">já pago (${pagas.length})</div></div>
      <div class="cartao kpi ${abertas.some(p => p.vencida) ? 'alerta' : ''}"><div class="n">${brl(abertas.reduce((a, p) => a + Number(p.saldo), 0))}</div><div class="r">falta confirmar (${abertas.length})</div></div>
      <div class="cartao kpi"><div class="n">${brl(ativos.filter(c => c.tipo !== 'diaria').reduce((a, c) => a + Number(c.valor), 0))}</div><div class="r">${ativos.filter(c => c.tipo !== 'diaria').length} contrato(s) mensal(is) ativo(s)${ativos.some(c => c.tipo === 'diaria') ? ` + ${ativos.filter(c => c.tipo === 'diaria').length} por diária` : ''}</div></div></div>
    ${atras.length ? `<div class="cartao" style="border-left:4px solid var(--vermelho)"><h2>⚠️ Meses anteriores sem pagamento confirmado (${atras.length})</h2><div class="tabela-wrap"><table class="responsiva"><tbody>${atras.map(linha).join('')}</tbody></table></div>
      <p class="muted">Se já foi pago, confirme o pagamento com a data certa. Se o mês não era devido, abra a conta e cancele.</p></div>` : ''}
    <div class="cartao"><h2>${mesAb2(mes)}</h2>${ps.length ? `<div class="tabela-wrap"><table class="responsiva" id="t-fixas"><thead><tr><th>Vence</th><th>Fornecedor / serviço</th><th class="num">Valor</th><th>Situação</th><th></th></tr></thead><tbody>${ps.map(linha).join('')}</tbody></table></div>`
      : '<div class="vazio">Nenhuma conta fixa neste mês.</div>'}</div>
    <div class="cartao"><h2>Contratos fixos</h2>${cts.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Fornecedor</th><th>Serviço</th><th class="num">Valor</th><th>Dia</th><th>Desde</th><th>Até</th><th>Próximo vencimento</th></tr></thead><tbody>
      ${cts.map(c => `<tr class="clicavel" onclick="location.hash='#/cadastros/fornecedores/ver/${c.fornecedor_id}'"${c.ativo ? '' : ' style="opacity:.55"'}><td data-r="Fornecedor"><b>${esc(c.fornecedor)}</b></td><td data-r="Serviço">${esc(c.descricao)}</td><td data-r="Valor" class="num">${brl(c.valor)}${c.tipo === 'diaria' ? ` / diária${c.dias_semana?.length ? `<div class="muted">${c.dias_semana.map(d => DIAS_SEM[d]).join(', ')}</div>` : ''}` : ''}</td>
        <td data-r="Dia">dia ${c.dia_vencimento}</td><td data-r="Desde">${dataBR(c.inicio)}</td><td data-r="Até">${c.fim ? dataBR(c.fim) + (c.ativo ? '' : ' <span class="tag">Encerrado</span>') : '<span class="muted">sem prazo</span>'}</td><td data-r="Próximo vencimento">${dataBR(c.proximo_vencimento) || '—'}</td></tr>`).join('')}</tbody></table></div>`
      : '<div class="vazio">Nenhum contrato fixo. No cadastro do fornecedor, marque "Valor fixo mensal" e informe o valor e o dia do vencimento.</div>'}</div>`;
  $$('[data-fd]', tela).forEach(b => (b.onclick = () => fecharDiariasModal(b.dataset.fd)));
  $('#f-mes').onchange = e => { location.hash = '#/financeiro/pagar?aba=fixas&mes=' + e.target.value; };
  $$('[data-m]', tela).forEach(b => (b.onclick = () => { location.hash = '#/financeiro/pagar?aba=fixas&mes=' + somaMeses(ini, Number(b.dataset.m)).slice(0, 7); }));
  $$('[data-pagar]', tela).forEach(b => (b.onclick = async () => { const p = [...ps, ...atras].find(x => x.id === b.dataset.pagar);
    if (await modalBaixa(p, 'pagar', nome(p))) navegar(); }));
}
const mesAb2 = m => { const [a, mm] = m.split('-'); return ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'][+mm - 1] + ' de ' + a; };

// ---------- Editar lançamento ----------
async function editarTitulo(tela, id, tipo) {
  const T = TIPO[tipo];
  if (!editaFin()) { tela.innerHTML = '<div class="cartao vazio">Sem permissão.</div>'; return; }
  const t = await api.um('titulos', `id=eq.${id}`);
  if (!t || t.status === 'cancelado') { tela.innerHTML = '<div class="cartao vazio">Conta não encontrada ou cancelada.</div>'; return; }
  const [ps, pess, ccs] = await Promise.all([api.listar('titulo_parcelas', `titulo_id=eq.${id}&status=neq.cancelada&order=parcela`), tipo === 'pagar' ? fornecedores(true) : clientes(true), centros()]);
  const valorLivre = ['avulso', 'legado', 'recorrente', 'pedido'].includes(t.origem);
  const pessoaFixa = ['reembolso', 'adiantamento'].includes(t.origem);
  const rot = x => (tipo === 'pagar' ? x.razao_social : x.nome) + (x.nome_fantasia ? ` (${x.nome_fantasia})` : '') + (x.documento ? ' · ' + fmtDoc(x.documento) : '');
  const pid = tipo === 'pagar' ? t.fornecedor_id : t.cliente_id;
  tela.innerHTML = `
    <div class="topo"><div><h1>Editar ${esc(t.numero)}</h1><p class="sub">Corrija o que foi lançado errado. Tudo fica no histórico da conta, com o motivo.</p></div></div>
    <form class="cartao" id="f-ed"><div class="form">
      ${pessoaFixa ? '' : `<label class="campo largo">${T.cadastro}<select name="pessoa_id">${opcoes(pess.filter(f => f.ativo || f.id === pid), null, rot, pid, 'Sem cadastro (nome abaixo)')}</select></label>
      <label class="campo largo" id="ed-fav">Nome do ${T.pessoa.toLowerCase()}<input name="favorecido_nome" value="${esc(t.favorecido_nome || '')}"></label>`}
      <label class="campo largo">Descrição<input name="descricao" required value="${esc(t.descricao || '')}"></label>
      <label class="campo">Nº do documento<input name="documento" value="${esc(t.documento || '')}"></label>
      <label class="campo">Data de emissão<input type="date" name="data_emissao" required value="${t.data_emissao}"></label>
      <label class="campo">Conta do plano<select name="conta_id">${await opcoesContas(t.conta_id, T.tiposConta)}</select></label>
      <label class="campo">Centro de custo<select name="centro_custo_id">${opcoes(ccs.filter(c => c.ativo || c.id === t.centro_custo_id), null, c => c.nome, t.centro_custo_id, '—')}</select></label>
      ${tipo === 'pagar' ? `<input type="hidden" id="ed-total" value="${itV(t.valor_total)}">${htmlItensNota(t.itens || [])}` : ''}</div>
      <h2 style="margin-top:14px">Parcelas</h2>
      <div class="tabela-wrap"><table><thead><tr><th>Parcela</th><th>Vencimento</th><th class="num">Valor (R$)</th><th>Situação</th></tr></thead><tbody>
        ${ps.map(p => { const trava = p.status === 'paga' || Number(p.valor_pago) > 0;
          return `<tr data-p="${p.id}"><td>${p.parcela}ª</td><td><input type="date" name="v_${p.id}" value="${p.vencimento}" ${trava ? 'disabled' : ''}></td>
            <td class="num"><input name="x_${p.id}" inputmode="decimal" value="${Number(p.valor).toFixed(2).replace('.', ',')}" style="max-width:130px;text-align:right" ${trava || !valorLivre ? 'disabled' : ''}></td>
            <td>${trava ? '<span class="tag verde">Pago</span> <span class="muted">(estorne para mudar)</span>' : tag(p.status, p.vencimento < hojeISO())}</td></tr>`; }).join('')}
      </tbody></table></div>
      ${valorLivre ? '' : `<p class="muted">O valor desta conta vem do documento de origem (${esc(t.origem)}) — corrija lá; aqui só o vencimento e os dados da conta.</p>`}
      ${t.origem === 'recorrente' ? '<p class="muted">Conta fixa mensal: mudar aqui vale só para este mês. Para mudar todos os meses, altere o contrato no cadastro do fornecedor.</p>' : ''}
      <label class="campo largo" style="margin-top:10px">Motivo da correção *<textarea name="motivo" required rows="2" placeholder="Ex.: valor digitado errado; vencimento combinado com o fornecedor"></textarea></label>
      <div class="acoes"><button class="btn prim">Salvar correção</button><a class="btn" href="javascript:history.back()">Cancelar</a></div></form>`;
  const f = $('#f-ed');
  const favVis = () => { if (f.pessoa_id) $('#ed-fav').hidden = !!f.pessoa_id.value; };
  f.pessoa_id?.addEventListener('change', favVis); favVis();
  if (tipo === 'pagar') ligarItensNota(f, $('#ed-total'));
  f.onsubmit = async e => { e.preventDefault(); const d = formDados(f);
    const itens = tipo === 'pagar' ? lerItensNota(f) : null;
    const mudouItens = itens && JSON.stringify(itens) !== JSON.stringify(t.itens || []);
    const dados = { descricao: d.descricao, documento: d.documento || '', data_emissao: d.data_emissao, conta_id: d.conta_id || '', centro_custo_id: d.centro_custo_id || '' };
    if (!pessoaFixa) { dados.pessoa_id = d.pessoa_id || ''; dados.favorecido_nome = d.favorecido_nome || ''; }
    const parcelas = ps.filter(p => !(p.status === 'paga' || Number(p.valor_pago) > 0)).map(p => ({ id: p.id, vencimento: d['v_' + p.id], valor: valorLivre ? num(d['x_' + p.id]) : Number(p.valor) }));
    if (parcelas.some(p => !p.vencimento || !(p.valor > 0))) return aviso('Confira vencimentos e valores.', true);
    if (mudouItens && !await itensConferem(itens, ps.reduce((a, p) => a + (parcelas.find(x => x.id === p.id)?.valor ?? Number(p.valor)), 0))) return;
    await ocupado(e.submitter, async () => { try {
      if (mudouItens) await api.alterar('titulos', `id=eq.${id}`, { itens });
      let r;
      try { r = await api.rpc('editar_titulo', { p_id: id, p_dados: dados, p_parcelas: parcelas, p_motivo: d.motivo }); }
      catch (err) { if (mudouItens && /nada|nenhum/i.test(err.message || '')) r = { alteracoes: [] }; else throw err; }
      aviso('Conta corrigida: ' + [...(r.alteracoes || []), ...(mudouItens ? ['itens da nota'] : [])].join('; ')); location.hash = T.rota + '/ver/' + id;
    } catch (err) { falha(err); } }); };
}

// ---------- Projeção financeira (previsões de gasto × contas × pagamentos, mês a mês) ----------
rota('/financeiro/projecao', async tela => {
  const ini = (estado.params.get('de') || hojeISO().slice(0, 7)) + '-01';
  const nMeses = Math.min(24, Math.max(1, parseInt(estado.params.get('meses')) || 6));
  const cc = estado.params.get('cc') || '';
  const fim = somaDias(somaMeses(ini, nMeses), -1);
  const ccs = await centros().catch(() => []);
  let P;
  try { P = await api.rpc('projecao_financeira', { p_de: ini, p_ate: fim, p_cc: cc || null }); }
  catch (err) { tela.innerHTML = `<div class="cartao vazio">${esc(err.message || 'Sem acesso.')}</div>`; return; }
  const mesAtual = hojeISO().slice(0, 7) + '-01';
  const geral = !cc;
  // saldo projetado: parte do saldo de hoje e soma o que ainda vai entrar/sair (do mês atual em diante)
  let saldo = P.saldo_contas != null ? Number(P.saldo_contas) - Number(P.vencido_pagar) - Number(P.compras_atrasadas || 0) : null;   // recebíveis vencidos não entram (conservador)
  const linhas = P.meses.map(x => {
    const d = projDesp(x), r = projRec(x);
    let sp = null;
    if (saldo != null && x.m >= mesAtual) { saldo += Number(x.rec_aberto) + Number(x.rec_prevista) - Number(x.desp_aberto) - Number(x.desp_previsto) - Number(x.compras_sem_nota); sp = saldo; }
    return { ...x, d, r, sp };
  });
  // os vencidos de meses anteriores entram no saldo do mês atual (já descontados acima)
  const tot = k => linhas.reduce((a, x) => a + Number(x[k] || 0), 0);
  const maxV = Math.max(1, ...linhas.map(x => Math.max(x.d, Number(x.orcado_desp || 0))));
  const ccNome = cc ? ccs.find(c => c.id === cc)?.nome : null;
  const linkMes = m => `#/financeiro/pagar?aba=todas&status=todas&de=${m}&ate=${somaDias(somaMeses(m, 1), -1)}`;
  tela.innerHTML = `
    <div class="topo"><div><h1>Projeção financeira</h1>${ccNome ? `<p class="sub">${esc(ccNome)}</p>` : ''}</div>
      ${editaFin() ? '<div class="acoes"><a class="btn prim" href="#/financeiro/pagar/novo">+ Nova previsão / conta</a><a class="btn" href="#/financeiro/pagar?status=previsoes&periodo=tudo">Ver previsões</a></div>' : ''}</div>
    <form class="filtros" id="f-proj"><label class="fl-data">A partir de<input type="month" name="de" value="${ini.slice(0, 7)}"></label>
      <label class="fl-data">Meses<select name="meses">${[3, 6, 12, 18, 24].map(n => `<option ${n === nMeses ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      ${veTudo() ? `<select name="cc"><option value="">Empresa toda</option>${ccs.filter(c => c.ativo).map(c => `<option value="${c.id}" ${c.id === cc ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select>` : ''}
      <button class="btn">Ver</button></form>
    <div class="grade" style="margin-bottom:14px">
      ${P.saldo_contas != null ? `<div class="cartao kpi ${Number(P.saldo_contas) < 0 ? 'alerta' : ''}"><div class="n">${brl(P.saldo_contas)}</div><div class="r">saldo em contas hoje</div></div>` : ''}
      <div class="cartao kpi"><div class="n">${brl(tot('d'))}</div><div class="r">gastos projetados no período</div></div>
      <div class="cartao kpi"><div class="n">${brl(tot('desp_previsto'))}</div><div class="r">em previsões de gasto</div></div>
      <div class="cartao kpi ${Number(P.vencido_pagar) ? 'alerta' : ''}"><div class="n">${brl(P.vencido_pagar)}</div><div class="r">vencido a pagar</div></div>
      ${geral ? `<div class="cartao kpi"><div class="n">${brl(tot('r'))}</div><div class="r">receitas projetadas no período</div></div>
      <div class="cartao kpi ${tot('r') - tot('d') < 0 ? 'alerta' : ''}"><div class="n">${brl(tot('r') - tot('d'))}</div><div class="r">resultado projetado</div></div>` : ''}
    </div>
    <div class="cartao"><h2>Gastos por mês</h2>
      <div class="pj-graf">${linhas.map(x => `<a class="pj-col" href="${linkMes(x.m)}" title="${mesTxt(x.m, true)}: ${brl(x.d)}">
        <div class="pj-barra">${[['desp_pago', 'pg'], ['desp_aberto', 'ab'], ['desp_previsto', 'pv'], ['compras_sem_nota', 'cp']].map(([k, c]) => Number(x[k]) ? `<i class="${c}" style="height:${(100 * Number(x[k]) / maxV).toFixed(2)}%"></i>` : '').join('')}
          ${x.orcado_desp != null ? `<span class="pj-orc" style="bottom:${(100 * Number(x.orcado_desp) / maxV).toFixed(2)}%"></span>` : ''}</div>
        <span class="pj-v">${brl(x.d).replace(/,\d\d$/, '')}</span><span class="pj-m">${mesTxt(x.m)}</span></a>`).join('')}</div>
      <div class="pj-leg"><span><i class="pg"></i>Pago</span><span><i class="ab"></i>A pagar</span><span><i class="pv"></i>Previsões</span><span><i class="cp"></i>Compras sem nota</span><span><i class="orc"></i>Orçado</span></div></div>
    <div class="cartao"><h2>Mês a mês</h2><div class="tabela-wrap"><table class="pj-tab"><thead><tr><th>Mês</th><th class="num">Pago</th><th class="num">A pagar</th><th class="num">Previsões</th><th class="num">Compras sem nota</th><th class="num">Gastos projetados</th><th class="num">Orçado</th>
        ${geral ? '<th class="num">Recebido</th><th class="num">A receber</th><th class="num">Receita prevista</th><th class="num">Receitas projetadas</th><th class="num">Resultado</th>' : ''}${P.saldo_contas != null ? '<th class="num">Saldo projetado</th>' : ''}</tr></thead><tbody>
      ${linhas.map(x => `<tr class="clicavel" onclick="location.hash='${linkMes(x.m)}'"><td class="nowrap"><b>${mesTxt(x.m)}</b></td><td class="num">${brl(x.desp_pago)}</td><td class="num">${brl(x.desp_aberto)}</td><td class="num">${brl(x.desp_previsto)}</td><td class="num">${brl(x.compras_sem_nota)}</td>
        <td class="num"><b>${brl(x.d)}</b></td><td class="num ${x.orcado_desp != null && x.d > Number(x.orcado_desp) ? 'txt-verm' : 'muted'}">${x.orcado_desp != null ? brl(x.orcado_desp) : '—'}</td>
        ${geral ? `<td class="num">${brl(x.rec_recebido)}</td><td class="num">${brl(x.rec_aberto)}</td><td class="num">${brl(x.rec_prevista)}</td><td class="num"><b>${brl(x.r)}</b></td><td class="num ${x.r - x.d < 0 ? 'txt-verm' : 'txt-verde'}"><b>${brl(x.r - x.d)}</b></td>` : ''}
        ${P.saldo_contas != null ? `<td class="num ${x.sp != null && x.sp < 0 ? 'txt-verm' : ''}">${x.sp != null ? brl(x.sp) : '—'}</td>` : ''}</tr>`).join('')}
      </tbody><tfoot><tr><td>Total</td><td class="num">${brl(tot('desp_pago'))}</td><td class="num">${brl(tot('desp_aberto'))}</td><td class="num">${brl(tot('desp_previsto'))}</td><td class="num">${brl(tot('compras_sem_nota'))}</td><td class="num">${brl(tot('d'))}</td><td class="num">${linhas.some(x => x.orcado_desp != null) ? brl(tot('orcado_desp')) : '—'}</td>
        ${geral ? `<td class="num">${brl(tot('rec_recebido'))}</td><td class="num">${brl(tot('rec_aberto'))}</td><td class="num">${brl(tot('rec_prevista'))}</td><td class="num">${brl(tot('r'))}</td><td class="num">${brl(tot('r') - tot('d'))}</td>` : ''}${P.saldo_contas != null ? '<td></td>' : ''}</tr></tfoot></table></div>
      ${Number(P.atrasado_pagar) || Number(P.atrasado_receber) ? `<p class="muted">Antes de ${mesTxt(ini)} ainda há em aberto: ${brl(P.atrasado_pagar)} a pagar${geral ? ` e ${brl(P.atrasado_receber)} a receber` : ''} (vencidos).</p>` : ''}</div>`;
  $('#f-proj').onsubmit = e => { e.preventDefault(); const d = formDados(e.target);
    location.hash = '#/financeiro/projecao?' + new URLSearchParams(Object.entries({ de: d.de, meses: d.meses, cc: d.cc || (veTudo() ? '' : cc) }).filter(([, v]) => v)).toString(); };
});

rota('/financeiro/pagar', tela => listaTitulos(tela, 'pagar'));
rota('/financeiro/pagar/novo', tela => novoTitulo(tela, 'pagar'));
rota('/financeiro/pagar/ver/:id', (tela, id) => verTitulo(tela, id, 'pagar'));
rota('/financeiro/pagar/editar/:id', (tela, id) => editarTitulo(tela, id, 'pagar'));
rota('/financeiro/receber', tela => listaTitulos(tela, 'receber'));
rota('/financeiro/receber/novo', tela => novoTitulo(tela, 'receber'));
rota('/financeiro/receber/ver/:id', (tela, id) => verTitulo(tela, id, 'receber'));
rota('/financeiro/receber/editar/:id', (tela, id) => editarTitulo(tela, id, 'receber'));

// ---------- Lançamentos a verificar (contas e reembolsos) ----------
rota('/financeiro/verificar', async tela => {
  const [ts, rs] = await Promise.all([
    api.listar('titulos', 'select=id,numero,tipo,descricao,favorecido_nome,valor_total,observacoes,status&status=neq.cancelado&observacoes=like.*VERIFICAR*&order=numero'),
    api.listar('reembolsos', `${SELECT_REEMB}&status=neq.cancelado&observacoes=like.*VERIFICAR*&order=data_despesa`)]);
  const linha = (link, num_, quem, desc, valor, obs) => `<tr class="clicavel" onclick="location.hash='${link}'"><td data-r="Nº" class="nowrap">${esc(num_)}</td>
    <td data-r="Quem">${esc(quem)}</td><td data-r="Descrição">${esc(desc)}</td><td data-r="Valor" class="num">${brl(valor)}</td><td data-r="O que verificar"><span class="muted">${esc(obs.replace(/⚠️\s*VERIFICAR:?\s*/g, '').slice(0, 220))}</span></td></tr>`;
  const tabela = (cab, linhas) => linhas.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nº</th><th>${cab}</th><th>Descrição</th><th class="num">Valor</th><th>O que verificar</th></tr></thead><tbody>${linhas.join('')}</tbody></table></div>` : '<div class="vazio">Nada pendente.</div>';
  tela.innerHTML = `
    <div class="topo"><div><h1>A verificar</h1><p class="sub">${ts.length + rs.length} lançamento(s) com pendência de confirmação</p></div></div>
    <p class="muted">Abra o lançamento e use “Marcar como verificado” quando a dúvida estiver resolvida.</p>
    <div class="cartao"><h2>Contas a pagar e a receber (${ts.length})</h2>${tabela('Favorecido', ts.map(t => linha(TIPO[t.tipo].rota + '/ver/' + t.id, t.numero, t.favorecido_nome || '', t.descricao || '', t.valor_total, t.observacoes)))}</div>
    <div class="cartao"><h2>Reembolsos (${rs.length})</h2>${tabela('Colaborador', rs.map(r => linha('#/reembolsos/ver/' + r.id, r.numero, nomeColab(r), descrTxt(r), r.valor, r.observacoes)))}</div>`;
});

// ---------- Fornecedor por diária: fechamento do mês ----------
const DIAS_SEM = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
function diasDoContrato(ct, comp) {
  const ini = comp.slice(0, 7) + '-01', fim = somaDias(somaMeses(ini, 1), -1), dias = [];
  for (let d = ini > ct.inicio ? ini : ct.inicio; d <= fim && (!ct.fim || d <= ct.fim); d = somaDias(d, 1)) {
    const dow = new Date(d + 'T12:00:00').getDay();
    if (!ct.dias_semana?.length || ct.dias_semana.includes(dow)) dias.push(d);
  }
  return dias;
}
function cartaoDiarias(t, ct, ps) {
  const fd = t.fechamento_diarias, dias = diasDoContrato(ct, t.competencia), pago = ps.some(p => Number(p.valor_pago) > 0);
  const podeFechar = (editaFin() || ct.responsavel_id === estado.usuario.id) && t.status !== 'cancelado' && !pago;
  const regra = `${brl(ct.valor)} por diária${ct.dias_semana?.length ? ' · ' + ct.dias_semana.map(d => DIAS_SEM[d]).join(', ') : ' · todos os dias'}`;
  return `<div class="cartao" style="border-left:4px solid var(--ouro)"><div class="topo" style="margin:0 0 6px"><div><h2 style="margin:0">Diárias de ${mesBR2(t.competencia)}</h2><p class="muted" style="margin:2px 0 0">${regra}</p></div>
      ${podeFechar ? `<button class="btn ${fd ? '' : 'prim'}" id="fechar-diarias">${fd ? 'Refazer fechamento' : 'Fechar diárias do mês'}</button>` : ''}</div>
    ${fd ? `<div class="form"><div><div class="muted">Dias no mês</div><b>${fd.dias_mes}</b></div><div><div class="muted">Descontados</div><b>${fd.descontos.length}</b></div>
        <div><div class="muted">Extras</div><b>${fd.extras || 0}</b></div><div><div class="muted">Cobrados</div><b>${fd.dias_cobrados} × ${brl(fd.diaria)} = ${brl(t.valor_total)}</b></div>
        ${fd.descontos.length ? `<div class="largo"><div class="muted">Dias sem serviço</div>${fd.descontos.map(x => `${dataBR(x.dia)} — ${esc(x.motivo)}`).join('<br>')}</div>` : ''}
        ${fd.obs ? `<div class="largo"><div class="muted">Observação</div>${esc(fd.obs)}</div>` : ''}
        <div class="largo muted">Conferido por ${esc(fd.por)} em ${dataHoraBR(fd.em)}</div></div>`
      : `<p style="margin:0">Previsão: <b>${dias.length} diárias × ${brl(ct.valor)} = ${brl(dias.length * Number(ct.valor))}</b>. O valor final sai no fechamento: desmarque os dias sem serviço e informe extras, se houver.</p>`}</div>`;
}
const mesBR2 = iso => { const [a, m] = iso.split('-'); return `${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][+m - 1]}/${a}`; };
document.addEventListener('click', e => { const b = e.target.closest('#fechar-diarias'); if (b) { const id = (location.hash.match(/\/ver\/([^/?]+)/) || [])[1]; if (id) fecharDiariasModal(id); } });
async function fecharDiariasModal(tituloId) {
  const t = await api.um('titulos', `id=eq.${tituloId}`); if (!t) return;
  const ct = await api.um('contas_recorrentes', `id=eq.${t.origem_id}`); if (!ct) return aviso('Contrato não encontrado.', true);
  const dias = diasDoContrato(ct, t.competencia), fd = t.fechamento_diarias, desc = new Map((fd?.descontos || []).map(x => [x.dia, x.motivo]));
  const r = await modal(`<form><h2>Fechar diárias · ${mesBR2(t.competencia)}</h2>
    <p class="muted">${esc(t.descricao)} · ${brl(ct.valor)} por diária. Desmarque os dias em que o serviço <b>não</b> foi prestado e informe o motivo.</p>
    <div class="fd-grade" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;margin:8px 0">
      ${dias.map(d => `<label class="check" style="margin:0"><input type="checkbox" name="d_${d}" ${desc.has(d) ? '' : 'checked'}> ${DIAS_SEM[new Date(d + 'T12:00:00').getDay()]} ${dataBR(d).slice(0, 5)}</label>`).join('')}</div>
    <div id="fd-motivos"></div>
    <div class="form"><label class="campo">Diárias extras (fora da escala)<input name="extras" type="number" min="0" value="${fd?.extras || 0}"></label>
      <label class="campo largo">Observação${'' }<input name="obs" value="${esc(fd?.obs || '')}" placeholder="Obrigatória se houver diárias extras"></label></div>
    <p><b id="fd-tot"></b></p>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Confirmar fechamento</button></div></form>`, {
    aoAbrir: raiz => {
      const f = $('form', raiz);
      const sinc = () => {
        const off = dias.filter(d => !f['d_' + d].checked), box = $('#fd-motivos', raiz);
        const atuais = Object.fromEntries($$('input[name^=m_]', box).map(i => [i.name, i.value]));
        box.innerHTML = off.length ? `<div class="form">${off.map(d => `<label class="campo largo">Motivo — ${dataBR(d)}<input name="m_${d}" required value="${esc(atuais['m_' + d] ?? desc.get(d) ?? '')}" placeholder="Ex.: fornecedor não compareceu, feriado, chuva"></label>`).join('')}</div>` : '';
        const cob = dias.length - off.length + (parseInt(f.extras.value, 10) || 0);
        $('#fd-tot', raiz).textContent = `${cob} diária(s) × ${brl(ct.valor)} = ${brl(cob * Number(ct.valor))}`;
      };
      f.addEventListener('change', e => { if (e.target.name?.startsWith('d_')) sinc(); });
      f.extras.addEventListener('input', sinc); sinc();
    },
    validar: d => (parseInt(d.extras, 10) || 0) > 0 && !d.obs?.trim() ? 'Explique as diárias extras na observação.' : null });
  if (!r) return;
  const descontos = dias.filter(d => !r['d_' + d]).map(d => ({ dia: d, motivo: (r['m_' + d] || '').trim() }));
  try { const x = await api.rpc('fechar_diarias', { p_titulo: tituloId, p_descontos: descontos, p_extras: parseInt(r.extras, 10) || 0, p_obs: r.obs || null });
    aviso(`Diárias fechadas: ${x.cobrados} × ${brl(ct.valor)} = ${brl(x.valor)}.`); navegar(); } catch (err) { falha(err); }
}
