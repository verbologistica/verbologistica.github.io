// Verbo Gestão — Operação › Frota › Abastecimentos
// Recebe o que os motoristas lançam no app (verbologistica.github.io) e o que a gestão lança aqui.
// Empresa → fatura do posto do mês (Contas a pagar) · Reembolso → aprovação · km → hodômetro (Manutenção)
'use strict';

const LINK_APP_MOT = 'https://verbologistica.github.io/';
const editaAbast = () => tem('administrador', 'operacao', 'financeiro', 'comprador');
const FORMA_AB = { faturado: ['Empresa', 'azul'], motorista: ['Reembolso', 'amarelo'], cartao: ['Cartão', ''] };
const ST_AB = { lancado: ['Lançado', ''], aguardando_fechamento: ['Na fatura do posto', 'azul'], aguardando_fatura: ['Na fatura do cartão', 'azul'],
  em_reembolso: ['Em reembolso', 'amarelo'], conferido: ['Fatura conferida', 'verde'], cancelado: ['Cancelado', ''] };
const ST_FAT = { em_conferencia: ['Em formação', 'azul'], com_divergencia: ['Com divergência', 'vermelho'], conferido: ['Conferida', 'verde'],
  aguardando_aprovacao: ['Aguardando aprovação', 'amarelo'], aprovado: ['Aprovada', 'verde'], pago: ['Paga', 'verde'], cancelado: ['Cancelada', ''] };
const ST_RMB_AB = { aguardando_aprovacao: 'aguardando aprovação', aprovado: 'aprovado (a pagar)', em_pagamento: 'em pagamento', pago: 'pago', devolvido: 'devolvido', reprovado: 'reprovado', cancelado: 'cancelado' };
const COMBUST = ['Diesel S10', 'Diesel S500', 'Gasolina comum', 'Gasolina aditivada', 'Etanol', 'GNV', 'ARLA 32'];
const lt = v => v == null ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' L';
const n2 = (v, d = 2) => v == null || isNaN(v) ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const brl3 = v => v == null ? '—' : 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const mesAb = iso => { const [a, m] = String(iso).split('-'); return ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(m) - 1] + '/' + a; };
const ddmm = iso => iso ? String(iso).slice(8, 10) + '/' + String(iso).slice(5, 7) : '';
const mesInteiro = f => String(f.periodo_inicio).slice(8) === '01' && somaDias(f.periodo_fim, 1).slice(8) === '01' && String(f.periodo_inicio).slice(0, 7) === String(f.periodo_fim).slice(0, 7);
const perAb = f => f.em_aberto ? `em aberto${f.primeiro_abast ? ` · ${ddmm(f.primeiro_abast)}${f.ultimo_abast !== f.primeiro_abast ? ' a ' + ddmm(f.ultimo_abast) : ''}` : ''}`
  : mesInteiro(f) ? mesAb(f.periodo_inicio) : `${ddmm(f.periodo_inicio)} a ${dataBR(f.periodo_fim)}`;
const vinculoAb = a => a.reembolso_numero
  ? `<a href="#/reembolsos/ver/${a.reembolso_id}" onclick="event.stopPropagation()">${esc(a.reembolso_numero)}</a> <span class="muted">${esc(ST_RMB_AB[a.reembolso_status] || a.reembolso_status || '')}${a.reembolso_custeio === 'adiantamento' ? ' · adiantamento' : ''}</span>`
  : a.fatura_numero ? `<a href="#/operacao/abastecimentos/fatura/${a.fechamento_id}" onclick="event.stopPropagation()">${esc(a.fatura_numero)}</a> <span class="muted">${esc(ST_FAT[a.fatura_status]?.[0] || '')}</span>` : '—';

function abasAbast(aba) {
  const p = estado.pendencias || {};
  return `<div class="abas">${[['lancamentos', 'Lançamentos'], ['painel', 'Consumo e custos'], ['faturas', `Faturas dos postos${p.faturas_postos ? ` (${p.faturas_postos})` : ''}`], ['app', 'App dos motoristas']]
    .map(([k, t]) => `<a href="#/operacao/abastecimentos${k === 'lancamentos' ? '' : '?aba=' + k}" class="${k === aba ? 'ativa' : ''}">${t}</a>`).join('')}</div>`;
}

// ===================== Lista + painel =====================
rota('/operacao/abastecimentos', async tela => {
  const aba = estado.params.get('aba') || 'lancamentos';
  const topo = `<div class="topo"><div><h1>⛽ Abastecimentos</h1><p class="sub">Operação › Frota · lançados pelos motoristas no app e pela gestão</p></div>
    <div class="acoes">${editaAbast() ? '<a class="btn prim" href="#/operacao/abastecimentos/novo">+ Lançar abastecimento</a>' : ''}<button class="btn" id="ab-link">📲 Link do app</button></div></div>${abasAbast(aba)}`;
  if (aba === 'faturas') return abaFaturas(tela, topo);
  if (aba === 'app') return abaApp(tela, topo);
  const de = estado.params.get('de') || somaDias(hojeISO(), -365);
  const ls = await api.listar('v_abastecimentos', `data=gte.${de}&order=data_hora.desc&limit=3000`);
  if (aba === 'painel') return abaPainel(tela, topo, ls.filter(a => a.status !== 'cancelado'));
  const ativos = ls.filter(a => a.status !== 'cancelado');
  const alertas = ativos.filter(a => a.alerta && !a.conferido_em);
  tela.innerHTML = `${topo}
    <div class="grade" id="ab-kpis" style="margin-bottom:14px"></div>
    ${alertas.length ? `<div class="cartao" style="border-left:4px solid var(--vermelho)"><h2>⚠️ ${alertas.length} lançamento(s) para conferir</h2><ul class="lista-simples">${alertas.slice(0, 8).map(a =>
      `<li class="clicavel" onclick="location.hash='#/operacao/abastecimentos/ver/${a.id}'"><span><b>${esc(a.numero)}</b> · ${dataBR(a.data)} · ${esc(a.placa || '')} · ${esc(a.motorista || '')} · ${brl(a.valor_total)}<div class="muted">${esc(a.alerta)}</div></span><span class="btn peq">Conferir</span></li>`).join('')}</ul></div>` : ''}
    <div class="cartao">${ls.length ? `<div class="tabela-wrap"><table class="responsiva" id="ab-tab"><thead><tr><th>Nº</th><th>Data</th><th>Motorista</th><th>Veículo</th><th>Posto</th><th class="num">Litros</th><th class="num">R$/L</th><th class="num">Valor</th><th class="num">Km</th><th class="num">km/L</th><th>Pagamento e vínculo</th></tr></thead><tbody>
      ${ls.map(a => `<tr class="clicavel" onclick="location.hash='#/operacao/abastecimentos/ver/${a.id}'"${fAttr('mot', a.motorista)}${fAttr('placa', a.placa)}${fAttr('posto', a.posto)}${fAttr('forma', FORMA_AB[a.forma_pagamento]?.[0])}${fAttr('sit', a.status === 'cancelado' ? 'Cancelado' : a.alerta && !a.conferido_em ? 'Com alerta' : ST_AB[a.status]?.[0])}${fAttr('origem', a.origem === 'app_motorista' ? 'App do motorista' : a.origem === 'planilha' ? 'Planilha (histórico)' : 'Sistema')}${fAttr('data', a.data)}${fAttr('valor', a.status === 'cancelado' ? 0 : a.valor_total)}${fAttr('busca', [a.numero, a.motorista, a.motorista_nome, a.placa, a.modelo, a.posto, a.observacao, a.reembolso_numero, a.fatura_numero].join(' '))} data-id="${a.id}"${a.status === 'cancelado' ? ' style="opacity:.5"' : ''}>
        <td data-r="Nº" class="mono" style="white-space:nowrap"><b>${esc(a.numero)}</b>${a.alerta && !a.conferido_em && a.status !== 'cancelado' ? ' <span title="' + esc(a.alerta) + '">⚠️</span>' : ''}</td><td data-r="Data" style="white-space:nowrap">${dataBR(a.data)}</td>
        <td data-r="Motorista"${a.motorista_nome && a.motorista && a.motorista_nome.toLowerCase() !== a.motorista.toLowerCase() ? ` title="No app: ${esc(a.motorista_nome)}"` : ''}>${esc(a.motorista || '—')}</td>
        <td data-r="Veículo" style="white-space:nowrap"><b class="mono">${esc(a.placa || '—')}</b>${a.modelo ? `<div class="muted">${esc(a.modelo)}</div>` : ''}</td><td data-r="Posto">${esc(a.posto || '—')}<div class="muted">${esc(a.combustivel || '')}</div></td>
        <td data-r="Litros" class="num">${n2(a.litros)}</td><td data-r="R$/L" class="num">${n2(a.preco_litro, 3)}</td><td data-r="Valor" class="num" style="white-space:nowrap"><b>${brl(a.valor_total)}</b></td>
        <td data-r="Km" class="num">${a.km != null ? a.km.toLocaleString('pt-BR') : '—'}</td><td data-r="km/L" class="num">${a.km_l != null ? n2(a.km_l) : '—'}</td>
        <td data-r="Pagamento">${a.status === 'cancelado' ? tagSt(ST_AB, 'cancelado') : tagSt(FORMA_AB, a.forma_pagamento)}<div style="font-size:12.5px;margin-top:3px">${vinculoAb(a)}</div></td></tr>`).join('')}</tbody></table></div>`
      : `<div class="vazio">Nenhum abastecimento ainda. Os lançamentos do app dos motoristas aparecem aqui sozinhos.</div>`}</div>`;
  const kpis = vis => {
    const v = vis.filter(a => a.status !== 'cancelado');
    const gasto = v.reduce((s, a) => s + Number(a.valor_total), 0), lit = v.reduce((s, a) => s + Number(a.litros), 0);
    const comKm = v.filter(a => a.km_rodado), km = comKm.reduce((s, a) => s + a.km_rodado, 0), litKm = comKm.reduce((s, a) => s + Number(a.litros), 0);
    const emp = v.filter(a => a.forma_pagamento === 'faturado').reduce((s, a) => s + Number(a.valor_total), 0), rmb = v.filter(a => a.forma_pagamento === 'motorista').reduce((s, a) => s + Number(a.valor_total), 0);
    $('#ab-kpis').innerHTML = `
      <div class="cartao kpi"><div class="n">${brl(gasto)}</div><div class="r">gasto em ${v.length} abastecimento(s)</div></div>
      <div class="cartao kpi"><div class="n">${n2(lit, 0)} L</div><div class="r">litros · média ${brl3(lit ? gasto / lit : null)}/L</div></div>
      <div class="cartao kpi"><div class="n">${litKm ? n2(km / litKm) : '—'}</div><div class="r">km/L médio${km ? ` · ${km.toLocaleString('pt-BR')} km rodados` : ''}</div></div>
      <div class="cartao kpi"><div class="n">${km ? brl(comKm.reduce((s, a) => s + Number(a.valor_total), 0) / km) : '—'}</div><div class="r">custo por km</div></div>
      <a class="cartao kpi" href="#/operacao/abastecimentos?aba=faturas"><div class="n">${brl(emp)}</div><div class="r">pago pela empresa (faturas dos postos)</div></a>
      <div class="cartao kpi"><div class="n">${brl(rmb)}</div><div class="r">pago pelos motoristas (reembolso)</div></div>`;
  };
  let fl = null;
  fl = filtroLocal(tela, { itens: '#ab-tab tbody tr', antes: '#ab-tab', periodo: true, campos: [{ k: 'mot', rotulo: 'Motorista' }, { k: 'placa', rotulo: 'Placa' }, { k: 'posto', rotulo: 'Posto' }, { k: 'forma', rotulo: 'Pagamento' }, { k: 'sit', rotulo: 'Situação' }, { k: 'origem', rotulo: 'Origem' }],
    aoMudar: () => kpis(fl ? fl.visiveis().map(tr => ls.find(a => a.id === tr.dataset.id)) : ls) });
  kpis(fl ? fl.visiveis().map(tr => ls.find(a => a.id === tr.dataset.id)) : ls);
  ligarLinkApp();
});

function ligarLinkApp() {
  $('#ab-link')?.addEventListener('click', () => modal(`<div><h2>📲 App dos motoristas</h2>
    <p>O motorista abre este link no celular, instala na tela inicial e lança cada abastecimento com a foto do cupom — funciona até sem internet.</p>
    <p style="font-size:18px"><b class="mono">${LINK_APP_MOT}</b></p>
    <p class="muted">É o mesmo link que eles já usam: nada muda para quem já instalou.</p>
    <div class="rodape"><button type="button" class="btn" id="cp-link">Copiar link</button><a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent('App de abastecimentos da Verbo: ' + LINK_APP_MOT)}">Enviar no WhatsApp</a><button type="button" class="btn prim" data-fechar>Fechar</button></div></div>`,
    { aoAbrir: f => { $('#cp-link', f).onclick = async () => { try { await navigator.clipboard.writeText(LINK_APP_MOT); aviso('Link copiado.'); } catch { aviso(LINK_APP_MOT); } }; } }));
}

// ----- Consumo e custos -----
function abaPainel(tela, topo, ls) {
  const meses = [...new Set(ls.map(a => a.data.slice(0, 7)))].sort().reverse();
  const mes = estado.params.get('mes') || '';
  const v = mes ? ls.filter(a => a.data.startsWith(mes)) : ls;
  const agrupa = (chave, rot) => {
    const m = new Map();
    for (const a of v) { const k = chave(a) || '—'; const g = m.get(k) || { k, rot: rot(a), n: 0, lit: 0, gasto: 0, km: 0, litKm: 0, gastoKm: 0, emp: 0, rmb: 0 };
      g.n++; g.lit += Number(a.litros); g.gasto += Number(a.valor_total); if (a.forma_pagamento === 'faturado') g.emp += Number(a.valor_total); else g.rmb += Number(a.valor_total);
      if (a.km_rodado) { g.km += a.km_rodado; g.litKm += Number(a.litros); g.gastoKm += Number(a.valor_total); } m.set(k, g); }
    return [...m.values()].sort((a, b) => b.gasto - a.gasto);
  };
  const max = arr => Math.max(1, ...arr.map(g => g.gasto));
  const barra = (x, mx, txt) => `<div class="barra-pct"><div style="width:${Math.max(2, Math.round(x / mx * 100))}%"></div><span>${txt}</span></div>`;
  const veic = agrupa(a => a.placa, a => [a.placa, a.modelo].filter(Boolean).join(' · ')), mot = agrupa(a => a.motorista, a => a.motorista), pos = agrupa(a => a.posto, a => a.posto);
  const comb = agrupa(a => a.combustivel, a => a.combustivel);
  const mVe = max(veic), mMo = max(mot), mPo = max(pos);
  tela.innerHTML = `${topo}
    <form class="filtros" id="f-mes"><select name="mes"><option value="">Últimos 12 meses</option>${meses.map(m => `<option value="${m}" ${m === mes ? 'selected' : ''}>${mesAb(m)}</option>`).join('')}</select></form>
    <div class="cartao"><h2>Por veículo</h2><div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Veículo</th><th>Gasto</th><th class="num">Abast.</th><th class="num">Litros</th><th class="num">Km rodados</th><th class="num">km/L</th><th class="num">R$/km</th></tr></thead><tbody>
      ${veic.map(g => `<tr><td data-r="Veículo"><b>${esc(g.rot)}</b></td><td data-r="Gasto">${barra(g.gasto, mVe, brl(g.gasto))}</td><td data-r="Abast." class="num">${g.n}</td><td data-r="Litros" class="num">${n2(g.lit)}</td>
        <td data-r="Km rodados" class="num">${g.km ? g.km.toLocaleString('pt-BR') : '—'}</td><td data-r="km/L" class="num"><b>${g.litKm ? n2(g.km / g.litKm) : '—'}</b></td><td data-r="R$/km" class="num">${g.km ? brl(g.gastoKm / g.km) : '—'}</td></tr>`).join('')}</tbody></table></div>
      <p class="muted">km/L = km rodados desde o abastecimento anterior do mesmo veículo ÷ litros abastecidos. Saltos de km acima de 3.000 (erro de digitação) ficam fora da conta.</p></div>
    <div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(460px,1fr))">
      <div class="cartao"><h2>Por motorista</h2><div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Motorista</th><th>Gasto</th><th class="num">Abast.</th><th class="num">Litros</th><th class="num">km/L</th><th class="num">Reembolso</th></tr></thead><tbody>
        ${mot.map(g => `<tr><td data-r="Motorista"><b>${esc(g.rot)}</b></td><td data-r="Gasto">${barra(g.gasto, mMo, brl(g.gasto))}</td><td data-r="Abast." class="num">${g.n}</td><td data-r="Litros" class="num">${n2(g.lit)}</td><td data-r="km/L" class="num">${g.litKm ? n2(g.km / g.litKm) : '—'}</td><td data-r="Reembolso" class="num">${g.rmb ? brl(g.rmb) : '—'}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="cartao"><h2>Por posto</h2><div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Posto</th><th>Gasto</th><th class="num">Abast.</th><th class="num">Litros</th><th class="num">Preço médio/L</th></tr></thead><tbody>
        ${pos.map(g => `<tr><td data-r="Posto"><b>${esc(g.rot)}</b></td><td data-r="Gasto">${barra(g.gasto, mPo, brl(g.gasto))}</td><td data-r="Abast." class="num">${g.n}</td><td data-r="Litros" class="num">${n2(g.lit)}</td><td data-r="Preço médio/L" class="num"><b>${brl3(g.gasto / g.lit)}</b></td></tr>`).join('')}</tbody></table></div></div>
    </div>
    <div class="cartao"><h2>Por combustível</h2><div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Combustível</th><th class="num">Abast.</th><th class="num">Litros</th><th class="num">Gasto</th><th class="num">Preço médio/L</th></tr></thead><tbody>
      ${comb.map(g => `<tr><td data-r="Combustível">${esc(g.rot || '—')}</td><td data-r="Abast." class="num">${g.n}</td><td data-r="Litros" class="num">${n2(g.lit)}</td><td data-r="Gasto" class="num">${brl(g.gasto)}</td><td data-r="Preço médio/L" class="num">${brl3(g.gasto / g.lit)}</td></tr>`).join('')}</tbody></table></div></div>`;
  $('#f-mes').onchange = e => { location.hash = '#/operacao/abastecimentos?aba=painel' + (e.target.value ? '&mes=' + e.target.value : ''); };
  ligarLinkApp();
}

// ----- Faturas dos postos -----
async function abaFaturas(tela, topo) {
  const fs = await api.listar('v_faturas_postos', 'order=periodo_inicio.desc,posto');
  const abertas = fs.filter(f => ['em_conferencia', 'com_divergencia'].includes(f.status));
  tela.innerHTML = `${topo}
    <div class="cartao" style="border-left:4px solid var(--ouro)"><p style="margin:0">Os abastecimentos "Empresa" vão somando na <b>fatura em aberto</b> de cada posto (já aparece em <b>Contas a pagar como prevista</b>).
      Quando o posto mandar o fechamento (ex.: semanal), clique em <b>🗓️ Fechar período do posto</b>: escolha as datas, marque os abastecimentos que o posto cobrou e informe a nota e o vencimento.
      Os marcados viram uma conta a pagar liberada; os desmarcados <b>ficam de fora</b>, em aberto, para o próximo fechamento.</p>
      ${editaAbast() || editaFin() ? '<div class="acoes" style="margin-top:10px"><a class="btn prim" href="#/operacao/abastecimentos/fechar">🗓️ Fechar período do posto</a></div>' : ''}</div>
    <div class="grade" style="margin-bottom:14px"><div class="cartao kpi"><div class="n">${abertas.length}</div><div class="r">fatura(s) em formação/conferência</div></div>
      <div class="cartao kpi"><div class="n">${brl(abertas.reduce((s, f) => s + Number(f.valor_lancado || 0), 0))}</div><div class="r">a pagar aos postos (lançado)</div></div></div>
    <div class="cartao">${fs.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nº</th><th>Posto</th><th>Período</th><th class="num">Abast.</th><th class="num">Litros</th><th class="num">Lançado</th><th class="num">Nota do posto</th><th class="num">Diferença</th><th>Vencimento</th><th>Conta a pagar</th><th>Situação</th></tr></thead><tbody>
      ${fs.map(f => `<tr class="clicavel" onclick="location.hash='#/operacao/abastecimentos/fatura/${f.id}'"${fAttr('posto', f.posto)}${fAttr('sit', ST_FAT[f.status]?.[0])}${fAttr('data', f.periodo_inicio)}${fAttr('valor', f.valor_nota || f.valor_lancado)}>
        <td data-r="Nº" class="mono"><b>${esc(f.numero)}</b></td><td data-r="Posto">${esc(f.posto)}</td><td data-r="Período">${perAb(f)}</td><td data-r="Abast." class="num">${f.qtd}</td><td data-r="Litros" class="num">${n2(f.litros)}</td>
        <td data-r="Lançado" class="num">${brl(f.valor_lancado)}</td><td data-r="Nota do posto" class="num">${f.valor_nota != null ? brl(f.valor_nota) + (f.numero_nota ? `<div class="muted">nº ${esc(f.numero_nota)}</div>` : '') : '—'}</td>
        <td data-r="Diferença" class="num">${f.valor_nota != null && Number(f.diferenca) ? `<b style="color:var(--vermelho)">${brl(f.diferenca)}</b>` : '—'}</td><td data-r="Vencimento">${dataBR(f.vencimento) || '—'}</td>
        <td data-r="Conta a pagar">${f.titulo_id ? `<a href="#/financeiro/pagar/ver/${f.titulo_id}" onclick="event.stopPropagation()">${esc(f.titulo_numero)}</a> <span class="muted">${esc(f.titulo_status || '')}</span>` : '—'}</td><td data-r="Situação">${tagSt(ST_FAT, f.status)}</td></tr>`).join('')}</tbody></table></div>`
      : '<div class="vazio">Nenhuma fatura de posto ainda.</div>'}</div>`;
  ligarLinkApp();
}

rota('/operacao/abastecimentos/fatura/:id', async (tela, id) => {
  const [f, itens] = await Promise.all([api.um('v_faturas_postos', `id=eq.${id}`), api.listar('v_abastecimentos', `fechamento_id=eq.${id}&order=data_hora`)]);
  if (!f) { tela.innerHTML = '<div class="cartao vazio">Fatura não encontrada.</div>'; return; }
  const ativos = itens.filter(a => a.status !== 'cancelado');
  const aberta = ['em_conferencia', 'com_divergencia'].includes(f.status), pode = editaAbast() || editaFin();
  tela.innerHTML = `
    <div class="topo"><div><h1>${esc(f.numero)} · ${esc(f.posto)} · ${perAb(f)}</h1><p class="sub">${tagSt(ST_FAT, f.status)} · ${ativos.length} abastecimento(s) · ${lt(ativos.reduce((s, a) => s + Number(a.litros), 0))}</p></div>
      <div class="acoes">${aberta && pode ? `<a class="btn prim" href="#/operacao/abastecimentos/fechar?posto=${f.fornecedor_id}">🗓️ Fechar período (escolher abastecimentos)</a><button class="btn" id="fat-nota">Fechar tudo com a nota</button>` : ''}${f.titulo_id ? `<a class="btn" href="#/financeiro/pagar/ver/${f.titulo_id}">Conta a pagar ${esc(f.titulo_numero)}</a>` : ''}<a class="btn" href="#/operacao/abastecimentos?aba=faturas">Voltar</a></div></div>
    <div class="grade" style="margin-bottom:14px">
      <div class="cartao kpi"><div class="n">${brl(f.valor_lancado)}</div><div class="r">lançado pelos motoristas</div></div>
      <div class="cartao kpi"><div class="n">${f.valor_nota != null ? brl(f.valor_nota) : '—'}</div><div class="r">nota do posto${f.numero_nota ? ' nº ' + esc(f.numero_nota) : ''}</div></div>
      <div class="cartao kpi ${f.valor_nota != null && Number(f.diferenca) ? 'alerta' : ''}"><div class="n">${f.valor_nota != null ? brl(f.diferenca) : '—'}</div><div class="r">diferença (nota − lançado)</div></div>
      <div class="cartao kpi"><div class="n">${dataBR(f.vencimento) || '—'}</div><div class="r">vencimento</div></div></div>
    <div class="cartao"><h2>Abastecimentos da fatura</h2><div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nº</th><th>Data</th><th>Placa</th><th>Motorista</th><th>Combustível</th><th class="num">Litros</th><th class="num">R$/L</th><th class="num">Valor</th><th>Situação</th></tr></thead><tbody>
      ${itens.map(a => `<tr class="clicavel" onclick="location.hash='#/operacao/abastecimentos/ver/${a.id}'"${a.status === 'cancelado' ? ' style="opacity:.5"' : ''}><td data-r="Nº" class="mono"><b>${esc(a.numero)}</b>${a.alerta && !a.conferido_em && a.status !== 'cancelado' ? ' ⚠️' : ''}</td><td data-r="Data">${dataBR(a.data)}</td><td data-r="Placa" class="mono">${esc(a.placa || '')}</td><td data-r="Motorista">${esc(a.motorista || '')}</td>
        <td data-r="Combustível">${esc(a.combustivel || '')}</td><td data-r="Litros" class="num">${n2(a.litros)}</td><td data-r="R$/L" class="num">${n2(a.preco_litro, 3)}</td><td data-r="Valor" class="num">${brl(a.valor_total)}</td><td data-r="Situação">${tagSt(ST_AB, a.status)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="5"><b>Total</b></td><td class="num"><b>${n2(ativos.reduce((s, a) => s + Number(a.litros), 0))}</b></td><td></td><td class="num"><b>${brl(ativos.reduce((s, a) => s + Number(a.valor_total), 0))}</b></td><td></td></tr></tfoot></table></div>
      ${aberta && ativos.some(a => a.alerta && !a.conferido_em) ? '<p class="muted">⚠️ Há lançamentos com alerta: confira-os (foto do cupom) antes de registrar a nota.</p>' : ''}</div>
    <div class="cartao"><div class="topo" style="margin:0"><h2 style="margin:0">Nota/fatura do posto</h2>${pode ? '<button class="btn" id="fat-anx">📎 Anexar na fatura e nos abastecimentos</button>' : ''}</div><div id="anx-fat"></div></div>`;
  $('#anx-fat').innerHTML = await htmlAnexos('fechamento', id);
  $('#fat-anx')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Anexar arquivo · ${esc(f.numero)}</h2><div class="form">
      <label class="campo largo">Arquivo(s) *<input type="file" name="arquivos" multiple required accept="image/*,application/pdf"></label>
      <label class="campo largo">Descrição<input name="desc" value="${f.numero_nota ? 'Fatura ' + esc(f.numero_nota) + ' do posto' : 'Fatura do posto'}"></label>
      <div class="campo largo"><label><input type="checkbox" name="todos" checked> Anexar também como comprovante nos ${ativos.length} abastecimento(s) da fatura</label></div></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Anexar</button></div></form>`);
    if (!r) return;
    const destinos = [['fechamento', id], ...(r.todos ? ativos.map(a => ['abastecimento', a.id]) : [])];
    try { await anexarEm(destinos, r.arquivos, r.desc || null); aviso(`Arquivo anexado em ${destinos.length} registro(s).`); navegar(); } catch (err) { falha(err); }
  });
  $('#fat-nota')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Nota/fatura do ${esc(f.posto)} · ${perAb(f)}</h2><p class="muted">Fecha <b>todos</b> os ${ativos.length} abastecimento(s) desta fatura em aberto. Para escolher período e quais entram, use <b>Fechar período</b>.</p><div class="form">
      <label class="campo">Nº da nota/fatura<input name="nota" value="${esc(f.numero_nota || '')}"></label>
      <label class="campo">Valor da nota (R$) *<input name="valor" inputmode="decimal" required value="${f.valor_nota != null ? n2(f.valor_nota) : n2(f.valor_lancado)}"></label>
      <label class="campo">Vencimento *<input type="date" name="venc" required value="${f.vencimento || ''}"></label>
      <label class="campo largo">Arquivo da nota/fatura<input type="file" name="arquivos" multiple accept="image/*,application/pdf"></label></div>
      <p class="muted">Lançado pelos motoristas: <b>${brl(f.valor_lancado)}</b>. Se a nota bater, a conta a pagar ${esc(f.titulo_numero || '')} é liberada para pagamento com esse valor e vencimento.</p>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Conferir</button></div></form>`);
    if (!r) return;
    try {
      if (r.arquivos?.length) await anexar('fechamento', id, r.arquivos);
      let res = await api.rpc('fatura_posto_registrar', { p_fec: id, p_numero_nota: r.nota || null, p_valor_nota: num(r.valor), p_vencimento: r.venc });
      if (!res.ok) {
        const d = await modal(`<form><h2>A nota não bate com o lançado</h2><p>Nota: <b>${brl(num(r.valor))}</b> · Lançado: <b>${brl(res.lancado)}</b> · Diferença: <b style="color:var(--vermelho)">${brl(res.diferenca)}</b></p>
          <p class="muted">Confira se falta algum abastecimento (o motorista esqueceu de lançar) ou se há lançamento a mais/errado. Você pode corrigir antes, ou aceitar a diferença explicando o motivo (ex.: desconto do posto).</p>
          <label class="campo">Motivo para aceitar a diferença<textarea name="motivo" required></textarea></label>
          <div class="rodape"><button type="button" class="btn" data-fechar>Corrigir antes</button><button class="btn prim">Aceitar diferença</button></div></form>`);
        if (!d) { aviso('Fatura marcada com divergência.'); return navegar(); }
        res = await api.rpc('fatura_posto_registrar', { p_fec: id, p_numero_nota: r.nota || null, p_valor_nota: num(r.valor), p_vencimento: r.venc, p_aceitar_diferenca: true, p_motivo: d.motivo });
      }
      aviso('Fatura conferida. A conta a pagar foi liberada.'); navegar();
    } catch (err) { falha(err); }
  });
});

// ----- Fechamento do posto por período, escolhendo os abastecimentos -----
rota('/operacao/abastecimentos/fechar', async tela => {
  if (!(editaAbast() || editaFin())) { tela.innerHTML = '<div class="cartao vazio">Sem permissão.</div>'; return; }
  const abertos = await api.listar('v_abastecimentos', 'forma_pagamento=eq.faturado&status=eq.aguardando_fechamento&order=data_hora');
  const postos = [...new Map(abertos.filter(a => a.posto_id).map(a => [a.posto_id, a.posto])).entries()].sort((x, y) => String(x[1]).localeCompare(String(y[1]), 'pt-BR'));
  if (!postos.length) { tela.innerHTML = '<div class="topo"><div><h1>🗓️ Fechar período do posto</h1></div><div class="acoes"><a class="btn" href="#/operacao/abastecimentos?aba=faturas">Voltar</a></div></div><div class="cartao vazio">Nenhum abastecimento "Empresa" em aberto para fechar.</div>'; return; }
  let posto = estado.params.get('posto'); if (!postos.some(p => p[0] === posto)) posto = postos[0][0];
  // semana anterior (segunda a domingo) como sugestão
  const h = new Date(hojeISO() + 'T12:00:00'), dw = (h.getDay() + 6) % 7;
  let ini = somaDias(hojeISO(), -dw - 7), fim = somaDias(ini, 6);
  const marcados = new Set(); let tocados = false;
  tela.innerHTML = `<div class="topo"><div><h1>🗓️ Fechar período do posto</h1><p class="sub">Escolha o período, marque o que o posto cobrou e informe a nota. O que ficar desmarcado continua em aberto para o próximo fechamento.</p></div>
      <div class="acoes"><a class="btn" href="#/operacao/abastecimentos?aba=faturas">Voltar</a></div></div>
    <form id="f-fech">
    <div class="cartao"><div class="form">
      <label class="campo largo">Posto *<select name="posto" id="fc-posto">${postos.map(([id, n]) => `<option value="${id}" ${id === posto ? 'selected' : ''}>${esc(n)} (${abertos.filter(a => a.posto_id === id).length} em aberto)</option>`).join('')}</select></label>
      <label class="campo">Período — de *<input type="date" name="ini" id="fc-ini" required value="${ini}"></label>
      <label class="campo">até *<input type="date" name="fim" id="fc-fim" required value="${fim}"></label></div>
      <div class="acoes" style="margin-top:6px"><button type="button" class="btn" data-sem="-1">◀ Semana anterior</button><button type="button" class="btn" data-sem="1">Próxima semana ▶</button>
        <button type="button" class="btn" id="fc-tudo">Marcar todos</button><button type="button" class="btn" id="fc-nada">Desmarcar todos</button></div></div>
    <div class="cartao"><h2>Abastecimentos em aberto deste posto</h2><p class="muted">Ao mudar o período, os do período são marcados automaticamente. Desmarque o que o posto <b>não</b> incluiu no fechamento (ele fica para o próximo).</p>
      <div id="fc-lista"></div></div>
    <div class="cartao"><h2>Nota/fatura do posto</h2><div class="form">
      <label class="campo">Nº da nota/fatura<input name="nota"></label>
      <label class="campo">Valor da nota (R$) *<input name="valor" id="fc-valor" inputmode="decimal" required></label>
      <label class="campo">Vencimento *<input type="date" name="venc" id="fc-venc" required></label>
      <label class="campo largo">Arquivo da nota/fatura / relatório do posto<input type="file" name="arquivos" multiple></label></div>
      <p class="muted" id="fc-resumo"></p>
      <div class="acoes"><button class="btn prim">Fechar período e liberar pagamento</button><a class="btn" href="#/operacao/abastecimentos?aba=faturas">Cancelar</a></div></div>
    </form>`;
  let prazo = 15, valorEditado = false, vencEditado = false;
  const doPosto = () => abertos.filter(a => a.posto_id === posto);
  const noPeriodo = a => a.data >= ini && a.data <= fim;
  const autoMarcar = () => { marcados.clear(); doPosto().filter(noPeriodo).forEach(a => marcados.add(a.id)); };
  const carregaPrazo = async () => { const f = await api.um('fornecedores', `id=eq.${posto}&select=prazo_faturamento_dias`).catch(() => null); prazo = f?.prazo_faturamento_dias ?? 15; };
  const desenhar = () => {
    const ls = doPosto(), sel = ls.filter(a => marcados.has(a.id)), fora = ls.filter(a => !marcados.has(a.id));
    const tot = sel.reduce((s, a) => s + Number(a.valor_total), 0), lit = sel.reduce((s, a) => s + Number(a.litros), 0);
    $('#fc-lista').innerHTML = ls.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th style="width:36px"></th><th>Nº</th><th>Data</th><th>Placa</th><th>Motorista</th><th>Combustível</th><th class="num">Litros</th><th class="num">R$/L</th><th class="num">Valor</th><th>Fatura em aberto</th></tr></thead><tbody>
      ${ls.map(a => `<tr style="${marcados.has(a.id) ? '' : 'opacity:.55'}"><td data-r="Entra?"><input type="checkbox" data-id="${a.id}" ${marcados.has(a.id) ? 'checked' : ''} style="width:20px;height:20px"></td>
        <td data-r="Nº" class="mono" style="white-space:nowrap"><a href="#/operacao/abastecimentos/ver/${a.id}">${esc(a.numero)}</a>${a.alerta && !a.conferido_em ? ' ⚠️' : ''}</td><td data-r="Data">${dataBR(a.data)}${noPeriodo(a) ? '' : ' <span class="tag">fora do período</span>'}</td>
        <td data-r="Placa" class="mono">${esc(a.placa || '')}</td><td data-r="Motorista">${esc(a.motorista || '')}</td><td data-r="Combustível">${esc(a.combustivel || '')}</td>
        <td data-r="Litros" class="num">${n2(a.litros)}</td><td data-r="R$/L" class="num">${n2(a.preco_litro, 3)}</td><td data-r="Valor" class="num">${brl(a.valor_total)}</td><td data-r="Fatura">${esc(a.fatura_numero || '')}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="6"><b>Entram no fechamento: ${sel.length}</b> · ficam de fora: ${fora.length}</td><td class="num"><b>${n2(lit)}</b></td><td></td><td class="num"><b>${brl(tot)}</b></td><td></td></tr></tfoot></table></div>`
      : '<div class="vazio">Nada em aberto neste posto.</div>';
    $$('#fc-lista input[type=checkbox]').forEach(c => c.onchange = () => { tocados = true; c.checked ? marcados.add(c.dataset.id) : marcados.delete(c.dataset.id); desenhar(); });
    if (!valorEditado) $('#fc-valor').value = n2(tot);
    if (!vencEditado) $('#fc-venc').value = somaDias(fim, prazo);
    $('#fc-resumo').innerHTML = `Marcados: <b>${sel.length}</b> abastecimento(s), <b>${lt(lit)}</b>, <b>${brl(tot)}</b>. ${fora.length ? `Ficam de fora (seguem em aberto): <b>${fora.length}</b> — ${brl(fora.reduce((s, a) => s + Number(a.valor_total), 0))}.` : ''}
      Vencimento sugerido: fim do período + ${prazo} dia(s) (prazo do posto).`;
  };
  const mudouPeriodo = () => { ini = $('#fc-ini').value; fim = $('#fc-fim').value; if (!ini || !fim) return; autoMarcar(); desenhar(); };
  $('#fc-ini').onchange = mudouPeriodo; $('#fc-fim').onchange = mudouPeriodo;
  $$('[data-sem]').forEach(b => b.onclick = () => { const n = Number(b.dataset.sem) * 7; $('#fc-ini').value = somaDias($('#fc-ini').value || ini, n); $('#fc-fim').value = somaDias($('#fc-fim').value || fim, n); mudouPeriodo(); });
  $('#fc-tudo').onclick = () => { doPosto().forEach(a => marcados.add(a.id)); desenhar(); };
  $('#fc-nada').onclick = () => { marcados.clear(); desenhar(); };
  $('#fc-posto').onchange = async e => { posto = e.target.value; await carregaPrazo(); autoMarcar(); desenhar(); };
  $('#fc-valor').oninput = () => { valorEditado = true; };
  $('#fc-venc').oninput = () => { vencEditado = true; };
  await carregaPrazo(); autoMarcar(); desenhar();
  $('#f-fech').onsubmit = async e => {
    e.preventDefault(); const d = formDados(e.target);
    const ids = doPosto().filter(a => marcados.has(a.id)).map(a => a.id), fora = doPosto().filter(a => !marcados.has(a.id)).map(a => a.id);
    if (!ids.length) return aviso('Marque ao menos um abastecimento que entrou no fechamento.', true);
    if (d.fim < d.ini) return aviso('O fim do período é antes do início.', true);
    const args = { p_forn: posto, p_ini: d.ini, p_fim: d.fim, p_ids: ids, p_numero_nota: d.nota || null, p_valor_nota: num(d.valor), p_vencimento: d.venc, p_fora: fora };
    await ocupado(e.submitter, async () => { try {
      let res = await api.rpc('fatura_posto_fechar', args);
      if (!res.ok) {
        const m = await modal(`<form><h2>A nota não bate com os marcados</h2><p>Nota: <b>${brl(num(d.valor))}</b> · Marcados: <b>${brl(res.lancado)}</b> · Diferença: <b style="color:var(--vermelho)">${brl(res.diferenca)}</b></p>
          <p class="muted">Confira se falta marcar algum abastecimento (ou se marcou algum que o posto não cobrou). Você pode voltar e ajustar, ou aceitar a diferença explicando o motivo (ex.: desconto do posto).</p>
          <label class="campo">Motivo para aceitar a diferença<textarea name="motivo" required></textarea></label>
          <div class="rodape"><button type="button" class="btn" data-fechar>Voltar e ajustar</button><button class="btn prim">Aceitar diferença e fechar</button></div></form>`);
        if (!m) return;
        res = await api.rpc('fatura_posto_fechar', { ...args, p_aceitar_diferenca: true, p_motivo: m.motivo });
      }
      if (d.arquivos?.length) await anexar('fechamento', res.fechamento, d.arquivos, 'Nota/fatura do posto');
      aviso(`Fechamento ${res.numero} registrado: conta a pagar liberada.${fora.length ? ` ${fora.length} abastecimento(s) ficaram em aberto para o próximo fechamento.` : ''}`);
      location.hash = '#/operacao/abastecimentos/fatura/' + res.fechamento;
    } catch (err) { falha(err); } });
  };
});

// ----- App dos motoristas: listas -----
async function abaApp(tela, topo) {
  const [cfg, cads] = await Promise.all([api.um('configuracoes', 'chave=eq.abastecimento_app'), api.rpc('app_abastecimento_cadastros')]);
  const v = cfg?.valor || { motoristas: [], veiculos: [], postos: [], ocultos: [] };
  const pode = editaAbast();
  tela.innerHTML = `${topo}
    <div class="cartao"><h2>📲 Link do app</h2><p>Os motoristas usam <b class="mono">${LINK_APP_MOT}</b> (o mesmo de antes). Cada lançamento chega aqui na hora — ou assim que o celular pegar sinal.</p>
      <ul><li><b>"Empresa"</b> → entra na fatura do posto do mês (Contas a pagar, prevista até a nota chegar).</li><li><b>"Eu paguei"</b> → vira reembolso aguardando aprovação, com a foto do cupom.</li>
      <li>Motorista, placa e posto são ligados aos cadastros; o que for novo é cadastrado sozinho (complete os dados depois).</li><li>O km vai para o hodômetro do equipamento (preventivas da Manutenção).</li></ul></div>
    <div class="cartao"><h2>O que aparece nas listas do app hoje</h2><div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">
      <div><b>Motoristas</b><ul class="lista-simples">${cads.motoristas.map(n => `<li>${esc(n)}</li>`).join('') || '<li class="muted">—</li>'}</ul></div>
      <div><b>Placas</b><ul class="lista-simples">${cads.veiculos.map(x => `<li class="mono">${esc(x.placa)} <span class="muted">${esc(x.modelo || '')}</span></li>`).join('') || '<li class="muted">—</li>'}</ul></div>
      <div><b>Postos</b><ul class="lista-simples">${cads.postos.map(n => `<li>${esc(n)}</li>`).join('') || '<li class="muted">—</li>'}</ul></div></div>
      <p class="muted">Entram sozinhos os nomes, placas e postos já usados. Abaixo você inclui novos antes do primeiro uso, ou esconde algum (ex.: motorista desligado, posto que não usa mais).</p></div>
    ${pode ? `<form class="cartao" id="f-app"><h2>Ajustar listas</h2><div class="form">
      <label class="campo">Incluir motoristas (um por linha)<textarea name="motoristas" rows="5">${esc((v.motoristas || []).join('\n'))}</textarea></label>
      <label class="campo">Incluir placas (PLACA modelo, uma por linha)<textarea name="veiculos" rows="5">${esc((v.veiculos || []).map(x => (x.placa + ' ' + (x.modelo || '')).trim()).join('\n'))}</textarea></label>
      <label class="campo">Incluir postos (um por linha)<textarea name="postos" rows="5">${esc((v.postos || []).join('\n'))}</textarea></label>
      <label class="campo">Esconder do app (nome, placa ou posto — um por linha)<textarea name="ocultos" rows="5">${esc((v.ocultos || []).join('\n'))}</textarea></label></div>
      <div class="acoes"><button class="btn prim">Salvar listas</button></div></form>` : ''}`;
  $('#f-app')?.addEventListener('submit', async e => {
    e.preventDefault(); const d = formDados(e.target); const linhas = t => String(t || '').split('\n').map(x => x.trim()).filter(Boolean);
    const valor = { motoristas: linhas(d.motoristas), postos: linhas(d.postos), ocultos: linhas(d.ocultos),
      veiculos: linhas(d.veiculos).map(l => { const [p, ...m] = l.split(/\s+/); return { placa: p.toUpperCase().replace(/[^A-Z0-9]/g, ''), modelo: m.join(' ') || null }; }).filter(x => /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(x.placa)) };
    await ocupado(e.submitter, async () => { try { await api.rpc('abastecimento_listas_app', { p_valor: valor }); aviso('Listas do app atualizadas.'); navegar(); } catch (err) { falha(err); } });
  });
  ligarLinkApp();
}

// ===================== Detalhe =====================
rota('/operacao/abastecimentos/ver/:id', async (tela, id) => {
  const a = await api.um('v_abastecimentos', `id=eq.${id}`);
  if (!a) { tela.innerHTML = '<div class="cartao vazio">Abastecimento não encontrado.</div>'; return; }
  const ed = editaAbast() && a.status !== 'cancelado';
  const anx = await api.listar('anexos', `entidade=eq.abastecimento&entidade_id=eq.${id}&cancelado_em=is.null&order=enviado_em`).catch(() => []);
  tela.innerHTML = `
    <div class="topo"><div><h1>${esc(a.numero)} · ${esc(a.placa || '')} · ${brl(a.valor_total)}</h1><p class="sub">${tagSt(FORMA_AB, a.forma_pagamento)} ${tagSt(ST_AB, a.status)} · ${a.origem === 'app_motorista' ? 'lançado no app do motorista' : a.origem === 'planilha' ? 'histórico da planilha do app' : 'lançado no sistema'}</p></div>
      <div class="acoes">${ed && a.alerta && !a.conferido_em ? '<button class="btn prim" id="ab-conf">Marcar como conferido</button>' : ''}${ed ? '<button class="btn" id="ab-cor">Corrigir</button><button class="btn perigo" id="ab-canc">Cancelar</button>' : ''}<a class="btn" href="#/operacao/abastecimentos">Voltar</a></div></div>
    ${a.alerta && a.status !== 'cancelado' ? `<div class="cartao" style="border-left:4px solid ${a.conferido_em ? 'var(--verde)' : 'var(--vermelho)'}"><b>${a.conferido_em ? '✔ Conferido' : '⚠️ Para conferir'}</b><p style="margin:.4em 0 0">${esc(a.alerta)}</p>${a.conferido_em ? `<p class="muted" style="margin:.4em 0 0">${esc(a.conferencia_obs || '')} · ${dataHoraBR(a.conferido_em)}</p>` : ''}</div>` : ''}
    <div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(340px,1fr))">
      <div class="cartao"><div class="form">${[['Data', dataHoraBR(a.data_hora)], ['Motorista', a.motorista + (a.motorista_nome && a.motorista_nome.toLowerCase() !== (a.motorista || '').toLowerCase() ? ` (no app: ${a.motorista_nome})` : '')],
        ['Veículo', [a.placa, a.modelo].filter(Boolean).join(' · ')], ['Posto', a.posto], ['Combustível', a.combustivel], ['Litros', lt(a.litros)], ['Preço por litro', brl3(a.preco_litro)], ['Valor', brl(a.valor_total)],
        ['Hodômetro', a.km != null ? a.km.toLocaleString('pt-BR') + ' km' : '—'], ['Desde o anterior', a.km_rodado ? `${a.km_rodado.toLocaleString('pt-BR')} km · ${n2(a.km_l)} km/L` : '—'],
        ['Observação do motorista', a.observacao], ['Registrado no celular', dataHoraBR(a.registrado_no_celular_em)], ['Cancelamento', a.motivo_cancelamento]]
        .filter(([, x]) => x !== null && x !== undefined && x !== '').map(([k, x]) => `<div><div class="muted">${k}</div><b>${esc(x)}</b></div>`).join('')}</div></div>
      <div class="cartao"><div class="topo" style="margin:0"><h2 style="margin:0">Comprovante</h2>${editaAbast() || editaFin() ? '<button class="btn" id="ab-anx">📎 Anexar comprovante</button>' : ''}</div><div id="ab-foto">${anx.length ? '' : '<div class="vazio">Sem comprovante.</div>'}</div>
        <h2 style="margin-top:16px">Para onde foi</h2>
        ${a.forma_pagamento === 'motorista' ? (a.reembolso_numero ? `<p>Reembolso <a href="#/reembolsos/ver/${a.reembolso_id}"><b>${esc(a.reembolso_numero)}</b></a> — ${esc(ST_RMB_AB[a.reembolso_status] || '')}${a.reembolso_custeio === 'adiantamento' ? ' (prestação de contas de adiantamento)' : ''}.</p>` : '<p class="muted">Sem reembolso.</p>')
          : a.fatura_numero ? `<p>Fatura do posto <a href="#/operacao/abastecimentos/fatura/${a.fechamento_id}"><b>${esc(a.fatura_numero)}</b></a> (${esc(ST_FAT[a.fatura_status]?.[0] || '')})${a.titulo_id ? ` · Conta a pagar <a href="#/financeiro/pagar/ver/${a.titulo_id}">${esc(a.titulo_numero)}</a> (${esc(a.titulo_status)})` : ''}.</p>` : '<p class="muted">—</p>'}
        ${a.equipamento_id ? `<p>Equipamento: <a href="#/cadastros/equipamentos/ver/${a.equipamento_id}">ver cadastro e hodômetro</a></p>` : ''}</div></div>
    ${a.historico ? `<div class="cartao"><h2>Histórico</h2><pre style="white-space:pre-wrap;margin:0;font-family:inherit">${esc(a.historico)}</pre></div>` : ''}`;
  // foto: do Storage mostra a imagem; do Google Drive (histórico) abre o link
  const box = $('#ab-foto');
  for (const x of anx) {
    if (/^https?:/.test(x.caminho_arquivo)) { box.insertAdjacentHTML('beforeend', `<p><a class="btn" target="_blank" rel="noopener" href="${esc(x.caminho_arquivo)}">🖼️ Ver foto do cupom (Google Drive)</a></p>`); continue; }
    if (!(x.tipo_mime || '').startsWith('image/')) { box.insertAdjacentHTML('beforeend', `<p><span class="anexo" data-arquivo="${esc(x.caminho_arquivo)}">${(x.tipo_mime || '').includes('pdf') ? '📄' : '📎'} ${x.descricao ? `<b>${esc(x.descricao)}:</b> ` : ''}${esc(x.nome_original || 'arquivo')}</span></p>`); continue; }
    try { const u = await api.linkArquivo(x.caminho_arquivo); box.insertAdjacentHTML('beforeend', `<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="Cupom" style="max-width:100%;max-height:420px;border-radius:8px;border:1px solid var(--borda)"></a>`); }
    catch { box.insertAdjacentHTML('beforeend', `<span class="anexo" data-arquivo="${esc(x.caminho_arquivo)}">🖼️ ${esc(x.nome_original || 'foto')}</span>`); }
  }
  $('#ab-conf')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Conferir ${esc(a.numero)}</h2><p class="muted">${esc(a.alerta)}</p><label class="campo">O que foi conferido?<textarea name="obs" required placeholder="Ex.: conferido no cupom, valor correto"></textarea></label>
      <p class="muted">Se algum dado estiver errado, use <b>Corrigir</b> em vez de só marcar como conferido.</p><div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Marcar como conferido</button></div></form>`);
    if (!r) return; try { await api.rpc('abastecimento_conferir', { p_ids: [id], p_obs: r.obs }); aviso('Conferido.'); navegar(); } catch (err) { falha(err); } });
  $('#ab-canc')?.addEventListener('click', async () => {
    const m = await confirmar(`Cancelar ${a.numero}?${a.reembolso_numero ? ` O reembolso ${a.reembolso_numero} também será cancelado.` : a.fatura_numero ? ` Ele sai da fatura ${a.fatura_numero}.` : ''}`, { comMotivo: true, botao: 'Cancelar abastecimento' });
    if (!m) return; try { await api.rpc('abastecimento_cancelar', { p_id: id, p_motivo: m }); aviso('Abastecimento cancelado.'); navegar(); } catch (err) { falha(err); } });
  $('#ab-cor')?.addEventListener('click', () => modalCorrigirAbast(a));
  $('#ab-anx')?.addEventListener('click', async () => {
    const irmaos = a.fechamento_id ? (await api.listar('v_abastecimentos', `fechamento_id=eq.${a.fechamento_id}&status=neq.cancelado&id=neq.${id}&order=data_hora`).catch(() => [])) : [];
    const r = await modal(`<form><h2>Anexar comprovante · ${esc(a.numero)}</h2><div class="form">
      <label class="campo largo">Arquivo(s) *<input type="file" name="arquivos" multiple required accept="image/*,application/pdf"></label>
      <label class="campo largo">Descrição<input name="desc" placeholder="Ex.: Fatura 11962 do posto"></label></div>
      ${irmaos.length ? `<div class="campo largo"><label><input type="checkbox" name="fat" value="1"> Anexar também na fatura ${esc(a.fatura_numero || '')}</label></div>
        <div class="campo largo"><div class="muted" style="margin:8px 0 4px">Replicar nos outros abastecimentos da fatura <button type="button" class="btn peq" id="anx-todos">Marcar todos</button></div>
        <div style="max-height:220px;overflow:auto;border:1px solid var(--borda);border-radius:8px;padding:6px 10px">${irmaos.map(x => `<label style="display:block"><input type="checkbox" name="irm_${x.id}" value="1"> <b class="mono">${esc(x.numero)}</b> · ${dataBR(x.data)} · ${esc(x.placa || '')} · ${brl(x.valor_total)}</label>`).join('')}</div></div>` : ''}
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Anexar</button></div></form>`, {
      aoAbrir: m => m.querySelector('#anx-todos')?.addEventListener('click', () => m.querySelectorAll('input[name^="irm_"],input[name="fat"]').forEach(c => c.checked = true)) });
    if (!r) return;
    const destinos = [['abastecimento', id], ...irmaos.filter(x => r['irm_' + x.id]).map(x => ['abastecimento', x.id])];
    if (r.fat && a.fechamento_id) destinos.push(['fechamento', a.fechamento_id]);
    try { await anexarEm(destinos, r.arquivos, r.desc || null); aviso(destinos.length > 1 ? `Comprovante anexado em ${destinos.length} registros.` : 'Comprovante anexado.'); navegar(); } catch (err) { falha(err); }
  });
});

async function modalCorrigirAbast(a) {
  const [pess, cols, forn] = await Promise.all([api.listar('pessoas_sem_login', 'select=id,nome,usuario_id&order=nome').catch(() => []),
    api.listar('colaboradores', 'select=id,nome,usuario_id,pessoa_sem_login_id&ativo=eq.true&order=nome').catch(() => []),
    api.listar('fornecedores', 'select=id,razao_social,nome_fantasia,documento&ativo=eq.true&order=razao_social').catch(() => [])]);
  // uma lista de pessoas (colaborador do RH + pessoas sem login que não estão no RH)
  const pessoas = [...cols.map(c => ({ v: 'c:' + c.id, t: c.nome + ' (RH)', sel: c.id === a.colaborador_id })),
    ...pess.filter(p => !cols.some(c => c.pessoa_sem_login_id === p.id)).map(p => ({ v: 'p:' + p.id, t: p.nome, sel: !a.colaborador_id && p.id === a.pessoa_sem_login_id }))]
    .sort((x, y) => x.t.localeCompare(y.t, 'pt-BR'));
  const r = await modal(`<form><h2>Corrigir ${esc(a.numero)}</h2><div class="form">
    <label class="campo">Data<input type="date" name="data" value="${a.data}"></label>
    <label class="campo largo">Motorista (cadastro)<select name="pessoa">${pessoas.map(p => `<option value="${p.v}" ${p.sel ? 'selected' : ''}>${esc(p.t)}</option>`).join('')}</select>
      <span class="muted">No app: "${esc(a.motorista_nome || '')}". Ao trocar, os próximos lançamentos com esse nome também vão para a pessoa escolhida.</span></label>
    <label class="campo">Placa<input name="placa" value="${esc(a.placa || '')}"></label>
    <label class="campo">Posto<select name="posto_id"><option value="">${esc(a.posto || '—')} (como está)</option>${forn.map(f => `<option value="${f.id}" ${f.id === a.posto_id ? 'selected' : ''}>${esc(rotForn(f))}</option>`).join('')}</select></label>
    <label class="campo">Combustível<select name="combustivel">${[...new Set([a.combustivel, ...COMBUST].filter(Boolean))].map(c => `<option ${c === a.combustivel ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
    <label class="campo">Litros<input name="litros" inputmode="decimal" value="${n2(a.litros, 3)}"></label>
    <label class="campo">Valor (R$)<input name="valor" inputmode="decimal" value="${n2(a.valor_total)}"></label>
    <label class="campo">Hodômetro (km)<input name="km" inputmode="numeric" value="${a.km ?? ''}"></label>
    <label class="campo">Quem pagou<select name="forma"><option value="faturado" ${a.forma_pagamento === 'faturado' ? 'selected' : ''}>Empresa (fatura do posto)</option><option value="motorista" ${a.forma_pagamento === 'motorista' ? 'selected' : ''}>Motorista (reembolso)</option></select></label>
    <label class="campo largo">Motivo da correção *<textarea name="motivo" required placeholder="Ex.: valor conferido na foto do cupom"></textarea></label></div>
    <p class="muted">Trocar "quem pagou" move o lançamento: de Empresa para Reembolso, sai da fatura do posto e vira reembolso para aprovação; o contrário cancela o reembolso e entra na fatura. Tudo fica no histórico.</p>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar correção</button></div></form>`);
  if (!r) return;
  const d = {};
  if (r.data && r.data !== a.data) d.data = r.data;
  const [tp, pid] = String(r.pessoa || '').split(':');
  const atual = a.colaborador_id ? 'c:' + a.colaborador_id : a.pessoa_sem_login_id ? 'p:' + a.pessoa_sem_login_id : '';
  if (r.pessoa && r.pessoa !== atual) d.pessoa = tp === 'c' ? { colaborador_id: pid } : { pessoa_sem_login_id: pid };
  if (r.placa && r.placa.toUpperCase().replace(/[^A-Z0-9]/g, '') !== a.placa) d.placa = r.placa;
  if (r.posto_id && r.posto_id !== a.posto_id) d.posto_id = r.posto_id;
  if (r.combustivel !== a.combustivel) d.combustivel = r.combustivel;
  if (num(r.litros) !== Number(a.litros)) d.litros = num(r.litros);
  if (num(r.valor) !== Number(a.valor_total)) d.valor_total = num(r.valor);
  const km = r.km === '' ? null : Number(String(r.km).replace(/\D/g, '')); if (km !== a.km) d.km = km;
  if (r.forma !== a.forma_pagamento) d.forma_pagamento = r.forma;
  if (!Object.keys(d).length) return aviso('Nada foi alterado.', true);
  try { const res = await api.rpc('abastecimento_corrigir', { p_id: a.id, p_dados: d, p_motivo: r.motivo }); aviso('Corrigido: ' + (res.alteracoes || []).join('; ')); navegar(); } catch (err) { falha(err); }
}

// ===================== Lançamento manual (gestão) =====================
rota('/operacao/abastecimentos/novo', async tela => {
  if (!editaAbast()) { tela.innerHTML = '<div class="cartao vazio">Sem permissão.</div>'; return; }
  const cads = await api.rpc('app_abastecimento_cadastros').catch(() => ({ motoristas: [], veiculos: [], postos: [] }));
  tela.innerHTML = `<div class="topo"><div><h1>Lançar abastecimento</h1><p class="sub">Para quando o motorista não lançou no app (ex.: cupom entregue em papel)</p></div></div>
    <form class="cartao" id="f-ab"><div class="form">
      <label class="campo">Data *<input type="date" name="data" required value="${hojeISO()}"></label>
      <label class="campo largo">Motorista *<input name="motorista" required list="dl-mot" autocomplete="off"><datalist id="dl-mot">${cads.motoristas.map(n => `<option value="${esc(n)}">`).join('')}</datalist></label>
      <label class="campo">Placa *<input name="placa" required list="dl-pl" autocomplete="off"><datalist id="dl-pl">${cads.veiculos.map(v => `<option value="${esc(v.placa)}">${esc(v.modelo || '')}</option>`).join('')}</datalist></label>
      <label class="campo">Posto *<input name="posto" required list="dl-po" autocomplete="off"><datalist id="dl-po">${cads.postos.map(n => `<option value="${esc(n)}">`).join('')}</datalist></label>
      <label class="campo">Combustível<select name="combustivel">${COMBUST.map(c => `<option>${c}</option>`).join('')}</select></label>
      <label class="campo">Litros *<input name="litros" required inputmode="decimal"></label>
      <label class="campo">Valor (R$) *<input name="valor" required inputmode="decimal"></label>
      <label class="campo">Hodômetro (km)<input name="km" inputmode="numeric"></label>
      <label class="campo">Quem pagou *<select name="pagamento" required><option value="">—</option><option>Empresa</option><option value="Reembolso">Motorista (reembolso)</option></select></label>
      <label class="campo largo">Foto do cupom<input type="file" name="arquivos" accept="image/*,application/pdf"></label>
      <label class="campo largo">Observação<textarea name="obs" rows="2"></textarea></label></div>
      <div class="acoes"><button class="btn prim">Salvar</button><a class="btn" href="#/operacao/abastecimentos">Cancelar</a></div></form>`;
  $('#f-ab').onsubmit = async e => { e.preventDefault(); const d = formDados(e.target);
    const placa = d.placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(placa)) return aviso('Placa inválida (ABC1D23 ou ABC1234).', true);
    const litros = num(d.litros), valor = num(d.valor);
    if (!(litros > 0) || !(valor > 0)) return aviso('Informe litros e valor.', true);
    await ocupado(e.submitter, async () => { try {
      const [x] = await api.inserir('abastecimentos', { data_hora: new Date(d.data + 'T12:00:00').toISOString(), motorista_nome: d.motorista.trim(), placa, posto_nome: d.posto.trim(), combustivel: d.combustivel,
        litros, valor_total: valor, km: d.km ? Number(String(d.km).replace(/\D/g, '')) : null, observacao: d.obs || null, forma_pagamento: d.pagamento === 'Empresa' ? 'faturado' : 'motorista', origem: 'sistema' });
      if (d.arquivos?.length) {
        await anexar('abastecimento', x.id, d.arquivos);
        const ab = await api.um('abastecimentos', `id=eq.${x.id}&select=reembolso_id`);
        if (ab?.reembolso_id) await anexar('reembolso', ab.reembolso_id, d.arquivos);
      }
      aviso(`Abastecimento ${x.numero || ''} lançado.`); location.hash = '#/operacao/abastecimentos/ver/' + x.id;
    } catch (err) { falha(err); } }); };
});
