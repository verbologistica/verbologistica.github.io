// ===================== Pedágio (Sem Parar) e adiantamentos do cliente =====================
// Pedágio: extrato do Sem Parar importado; cada passagem é ligada à viagem pelo ciclo do caminhão (chegada anterior → chegada).
// Reembolso pelo cliente = ida e volta das viagens. Passagem sem viagem e tarifas/multas/juros da conta = custo da Verbo.
// Adiantamentos do cliente: "pedágio" (mensal) e "aporte" (início das operações). Abatimento = quitação por compensação.
const TIPO_ADC = { aporte: ['Aporte (início das operações)', 'azul'], pedagio: ['Adiantamento de pedágio', 'amarelo'] };
const mesRot = m => new Date(m + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
const mesFim = m => { const [a, b] = m.split('-').map(Number); return new Date(Date.UTC(b === 12 ? a + 1 : a, b === 12 ? 0 : b, 1)).toISOString().slice(0, 10); };

// ---------- leitura do extrato do Sem Parar ----------
async function pedLerExtrato(arq) {
  await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
  const wb = XLSX.read(await arq.arrayBuffer(), { type: 'array' }), out = [];
  const hora = v => typeof v === 'number' ? new Date(Math.round(v % 1 * 86400) * 1000).toISOString().slice(11, 19) : String(v || '00:00:00').trim().padStart(8, '0').slice(0, 8);
  const dia = v => typeof v === 'number' ? new Date(Math.round((v - 25569) * 86400) * 1000).toISOString().slice(0, 10)
    : (m => m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null)(String(v || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/));
  for (const nome of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[nome], { header: 1, raw: true, defval: null });
    const hi = rows.slice(0, 10).findIndex(r => (r || []).map(vfNorm).includes('placa_veiculo'));
    if (hi < 0) continue;
    const h = rows[hi].map(vfNorm), c = k => h.indexOf(k);
    for (const r of rows.slice(hi + 1)) {
      const d = dia(r[c('data')]); if (!d) continue;
      const placa = r[c('placa_veiculo')];
      out.push({ fatura: r[c('numero_da_fatura')] == null ? null : String(r[c('numero_da_fatura')]), data_hora: `${d}T${hora(r[c('horario')])}`, placa: placa ? String(placa) : '',
        tipo_veiculo: r[c('tipo_do_veiculo')] || '', praca: r[c('descricao')] || '', sentido: r[c('sentido_da_praca')] || '', tipo_uso: r[c('tipo_de_uso')] || 'PASSAGENS',
        valor: vfNum(r[c('valor_r')]), dc: r[c('debito_credito')] || '' });
    }
  }
  if (!out.length) throw new Error('Não achei lançamentos no arquivo. Use o Excel de "Lançamentos" exportado do site do Sem Parar.');
  return out;
}

// lista das passagens do ciclo de uma viagem (ida vazia + volta carregada)
async function pedModal(vid) {
  const [v] = await api.listar('viagens', `id=eq.${vid}&select=numero,saida_em,chegada_em`);
  const ps = await api.listar('pedagio_passagens', `viagem_id=eq.${vid}&tipo_uso=eq.PASSAGENS&order=data_hora`);
  ps.sort((a, b) => (a.data_hora_ajustada || a.data_hora).localeCompare(b.data_hora_ajustada || b.data_hora));
  const sent = p => /LESTE/i.test(p.praca || '') ? 'carregado (leste)' : /OESTE/i.test(p.praca || '') ? 'vazio (oeste)' : '';
  const ok = ps.filter(p => !p.suspeita), tot = ok.reduce((a, p) => a + Number(p.valor), 0);
  modal(`<div><h2>Pedágios · ${esc(v?.numero || '')}</h2><p class="muted">Saída ${dataHoraBR(v?.saida_em) || '—'} · chegada ${dataHoraBR(v?.chegada_em) || '—'} · ${ok.filter(p => /OESTE/i.test(p.praca || '')).length} passagens na ida vazia e ${ok.filter(p => /LESTE/i.test(p.praca || '')).length} na volta carregada · <b>${brl(tot)}</b></p>
    <div class="tabela-wrap" style="max-height:60vh;overflow:auto"><table class="tabela compacta"><thead><tr><th>Data/hora</th><th>Praça</th><th>Sentido</th><th class="num">Valor</th><th>Observação</th></tr></thead><tbody>
    ${ps.map(p => `<tr${p.suspeita ? ' style="background:#FDECEA"' : p.data_hora_ajustada ? ' style="background:#FFF8E6"' : ''}><td class="nowrap">${dataHoraBR(p.data_hora_ajustada || p.data_hora)}</td><td>${esc(p.praca || '')}</td><td>${sent(p)}</td><td class="num">${brl(p.valor)}</td><td class="muted">${esc(p.observacao || '')}</td></tr>`).join('')}
    </tbody></table></div><div class="rodape"><button type="button" class="btn" data-fechar>Fechar</button></div></div>`);
}

// ---------- tela do pedágio ----------
// Período: mês, intervalo livre (de/até) ou um fechamento. Reembolsável = passagens das viagens com CHEGADA no período (ida e volta).
rota('/operacao/pedagios', async tela => {
  const P = estado.params, fech = P.get('fech') || '', de = P.get('de') || '', ate = P.get('ate') || '';
  const mes = (P.get('mes') || hojeISO().slice(0, 7)) + '-01'; let modo = fech ? 'fech' : de && ate ? 'per' : 'mes';
  await api.rpc('pedagio_vincular').catch(() => null);
  const fchs = await api.listar('viagem_fechamentos', 'select=id,periodo_ini,periodo_fim,cl:clientes(nome)&order=periodo_ini.desc&limit=60').catch(() => []);
  const F = fchs.find(x => x.id === fech); if (modo === 'fech' && !F) modo = 'mes';
  const fRot = x => `${dataBR(x.periodo_ini)} a ${dataBR(x.periodo_fim)}${x.cl?.nome ? ' · ' + x.cl.nome : ''}`;
  const iniD = modo === 'fech' ? F?.periodo_ini : modo === 'per' ? de : mes;
  const fimD = modo === 'fech' ? F?.periodo_fim : modo === 'per' ? ate : new Date(Date.parse(mesFim(mes) + 'T12:00:00Z') - 864e5).toISOString().slice(0, 10);
  const ini = new Date(iniD + 'T00:00:00-03:00').toISOString(), fim = new Date(Date.parse(fimD + 'T00:00:00-03:00') + 864e5).toISOString();
  const rot = modo === 'fech' ? 'fechamento ' + (F ? fRot(F) : '') : modo === 'per' ? `${dataBR(iniD)} a ${dataBR(fimD)}` : mesRot(mes);
  const SEL = 'select=*,v:viagens(id,numero,cliente_id,chegada_em,status,cl:clientes(nome))';
  const vids = (await api.listar('viagens', modo === 'fech' ? `fechamento_id=eq.${fech}&select=id` : `ativo=eq.true&status=neq.cancelada&chegada_em=gte.${ini}&chegada_em=lt.${fim}&select=id`).catch(() => [])).map(v => v.id);
  const psV = []; for (let k = 0; k < vids.length; k += 80) psV.push(...await api.listar('pedagio_passagens', `viagem_id=in.(${vids.slice(k, k + 80).join(',')})&${SEL}&order=data_hora&limit=5000`));
  const [psS, ads, cics] = await Promise.all([
    modo === 'fech' ? Promise.resolve([]) : api.listar('pedagio_passagens', `data_hora=gte.${ini}&data_hora=lt.${fim}&or=(viagem_id.is.null,tipo_uso.neq.PASSAGENS)&${SEL}&order=data_hora&limit=5000`),
    modo === 'mes' ? api.listar('v_cliente_adiantamentos', `tipo=eq.pedagio&competencia=eq.${mes}&cancelado_em=is.null`).catch(() => []) : Promise.resolve([]),
    api.rpc('pedagio_ciclos', modo === 'fech' ? { p_ini: new Date(F.periodo_ini + 'T00:00:00-03:00').toISOString(), p_fim: new Date(Date.parse(F.periodo_fim + 'T00:00:00-03:00') + 6 * 864e5).toISOString() } : { p_ini: ini, p_fim: fim }).catch(() => [])]);
  const ps = [...new Map([...psV, ...psS].map(p => [p.id, p])).values()];
  const tids = [...new Set(ps.map(p => p.reembolso_titulo_id).filter(Boolean))];
  const TIT = Object.fromEntries((tids.length ? await api.listar('titulos', `id=in.(${tids.join(',')})&select=id,numero,status,valor_total,descricao`).catch(() => []) : []).map(x => [x.id, x]));
  const emPedido = p => p.reembolso_titulo_id && TIT[p.reembolso_titulo_id] && TIT[p.reembolso_titulo_id].status !== 'cancelado';
  const CIC = Object.fromEntries((cics || []).map(c => [c.id, c])), hs = (cics || []).map(c => Number(c.horas)).filter(h => h > 0).sort((a, b) => a - b), medH = hs.length ? hs[Math.floor(hs.length / 2)] : 0;
  const deb = p => p.debito_credito === 'CR' ? -Number(p.valor) : Number(p.valor);
  const pass = ps.filter(p => p.tipo_uso === 'PASSAGENS'), reemb = pass.filter(p => p.viagem_id && !p.suspeita), susp = pass.filter(p => p.suspeita), corrig = pass.filter(p => p.data_hora_ajustada), semVia = pass.filter(p => !p.viagem_id), taxas = ps.filter(p => p.tipo_uso !== 'PASSAGENS');
  const soma = a => a.reduce((t, p) => t + deb(p), 0), totReemb = soma(reemb), totAd = ads.reduce((t, a) => t + Number(a.valor), 0);
  const porVia = new Map(); reemb.forEach(p => { const x = porVia.get(p.viagem_id) || { v: p.v, n: 0, s: 0, placa: p.placa }; x.n++; x.s += deb(p); porVia.set(p.viagem_id, x); });
  const porPlaca = new Map(); semVia.forEach(p => { const k = p.placa || '—', x = porPlaca.get(k) || { tipo: p.tipo_veiculo, n: 0, s: 0, ini: p.data_hora, fim: p.data_hora }; x.n++; x.s += deb(p); x.fim = p.data_hora; porPlaca.set(k, x); });
  const porTaxa = new Map(); taxas.forEach(p => porTaxa.set(p.tipo_uso, (porTaxa.get(p.tipo_uso) || 0) + deb(p)));
  const clientes = [...new Map(reemb.filter(p => p.v?.cliente_id).map(p => [p.v.cliente_id, p.v.cl?.nome])).entries()];
  const fin = tem('administrador', 'financeiro'), op = tem('administrador', 'operacao', 'financeiro');
  const kpi = (n, r, cor = '') => `<div class="cartao kpi"${cor ? ` style="border-left:4px solid ${cor}"` : ''}><div class="n">${n}</div><div class="r">${r}</div></div>`;
  const saldo = totAd - totReemb, ehF = modo === 'fech';
  // conciliação por fatura do Sem Parar (interno): todas as linhas das faturas que aparecem no período
  const fats = [...new Set(ps.map(p => p.fatura).filter(Boolean))], FL = [];
  for (let k = 0; k < fats.length; k += 20) FL.push(...await api.listar('pedagio_passagens', `fatura=in.(${fats.slice(k, k + 20).map(x => encodeURIComponent('"' + x + '"')).join(',')})&select=id,fatura,tipo_uso,valor,debito_credito,viagem_id,suspeita,reembolso_titulo_id,data_hora&limit=10000`).catch(() => []));
  const tids2 = [...new Set(FL.map(p => p.reembolso_titulo_id).filter(x => x && !TIT[x]))];
  if (tids2.length) (await api.listar('titulos', `id=in.(${tids2.join(',')})&select=id,numero,status,valor_total,descricao`).catch(() => [])).forEach(x => { TIT[x.id] = x; });
  const ENC = ['MULTA', 'JUROS E MORA', 'ATUALIZAÇÃO MONETÁRIA'];
  const conc = fats.map(fa => { const L = FL.filter(p => p.fatura === fa), s = f2 => L.filter(f2).reduce((a, p) => a + deb(p), 0), ps2 = p => p.tipo_uso === 'PASSAGENS';
    const ds = L.filter(ps2).map(p => p.data_hora).sort();
    return { fa, ini: ds[0], fim: ds[ds.length - 1], tot: s(() => true), ped: s(p => ps2(p) && p.viagem_id && !p.suspeita && emPedido(p)), pend: s(p => ps2(p) && p.viagem_id && !p.suspeita && !emPedido(p)),
      susp: s(p => ps2(p) && p.suspeita), sem: s(p => ps2(p) && !p.viagem_id), plano: s(p => !ps2(p) && !ENC.includes(p.tipo_uso) && p.tipo_uso !== 'OUTROS DÉBITOS'),
      enc: s(p => ENC.includes(p.tipo_uso)), outros: s(p => p.tipo_uso === 'OUTROS DÉBITOS'),
      pedidos: [...new Set(L.filter(p => ps2(p) && emPedido(p)).map(p => TIT[p.reembolso_titulo_id].numero))].join(', ') }; })
    .sort((a, b) => (a.fa === 'À Faturar') - (b.fa === 'À Faturar') || String(a.ini || '').localeCompare(String(b.ini || '')));
  const cs = k => conc.reduce((a, c) => a + c[k], 0);
  const blocoCli = ([cid, nome]) => { const rs = reemb.filter(p => p.v?.cliente_id === cid), pend = rs.filter(p => !emPedido(p)), gs = [...new Set(rs.filter(emPedido).map(p => p.reembolso_titulo_id))];
    return `<div style="padding:8px 0;border-bottom:1px solid #EEF0F1"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><b>${esc(nome || 'Cliente')}</b> · ${brl(soma(rs))} no período</div>
      ${gs.map(g => { const x = TIT[g]; return `<div style="margin:4px 0 0 12px">Já pedido: <a href="#/financeiro/receber/ver/${x.id}">${esc(x.numero || '')}</a> · ${esc(x.descricao || '')} · <b>${brl(soma(rs.filter(p => p.reembolso_titulo_id === g)))}</b> ${x.status === 'pago' ? '<span class="tag verde">Recebido</span>' : x.status === 'parcialmente_pago' ? '<span class="tag amarelo">Recebido em parte</span>' : '<span class="tag azul">Aguardando pagamento do cliente</span>'}</div>`; }).join('')}
      ${pend.length ? `<div style="margin:6px 0 0 12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">Ainda não pedido: <b>${brl(soma(pend))}</b> (${new Set(pend.map(p => p.viagem_id)).size} viagem(ns))
        ${fin ? `<button class="btn peq prim" data-reemb="${cid}">Gerar pedido de reembolso · ${esc(rot)}</button>` : '<span class="muted">o financeiro gera o pedido</span>'}</div>` : gs.length ? '' : ''}</div>`; };
  tela.innerHTML = `
    <div class="topo"><div><h1>Pedágios (Sem Parar)</h1><p class="sub">${esc(rot)} · reembolso pelo cliente = ida e volta das viagens que chegaram no período · o resto é custo da Verbo</p></div>
      <div class="acoes">${op ? '<button class="btn prim" id="ped-imp">📥 Importar extrato do Sem Parar</button><input type="file" id="ped-arq" accept=".xlsx,.xls" hidden>' : ''}<a class="btn" href="#/financeiro/adiantamentos-clientes">Adiantamentos do cliente</a></div></div>
    <form class="filtros" id="ped-f"><label>Mês <input type="month" name="mes" value="${mes.slice(0, 7)}"></label>
      <label>ou de <input type="date" name="de" value="${modo === 'per' ? de : ''}"></label><label>até <input type="date" name="ate" value="${modo === 'per' ? ate : ''}"></label>
      <label>ou fechamento <select name="fech"><option value="">—</option>${fchs.map(x => `<option value="${x.id}" ${x.id === fech ? 'selected' : ''}>${esc(fRot(x))}</option>`).join('')}</select></label><button class="btn prim">Ver</button></form>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-bottom:12px">
      ${kpi(brl(totReemb), `pedágio das viagens (reembolsável) · ${porVia.size} viagem(ns)`, '#1E8E57')}${modo === 'mes' ? kpi(brl(totAd), 'adiantamento de pedágio recebido no mês') + kpi(brl(Math.abs(saldo)), saldo >= 0 ? 'sobra do adiantamento' : 'falta (a pedir ao cliente)', saldo >= 0 ? '#2BB673' : '#D64545') : ''}
      ${kpi(brl(soma(susp)), `suspeitas (contestar com o Sem Parar) · ${susp.length}`, susp.length ? '#D64545' : '')}${ehF ? '' : kpi(brl(soma(semVia)), `passagens sem viagem (custo Verbo) · ${semVia.length}`, '#E2B93B') + kpi(brl(soma(taxas)), 'tarifas, multa e juros da conta (custo Verbo)', soma(taxas) > 0 ? '#E2B93B' : '')}</div>
    <div class="cartao"><h2>Reembolso pelo cliente · ${esc(rot)}</h2>
      ${clientes.length ? clientes.map(blocoCli).join('') : '<p class="muted">Nenhum pedágio ligado a viagens neste período.</p>'}
      <p class="muted" style="margin:8px 0 0">O pedido entra em Contas a receber como <b>aguardando pagamento do cliente</b> até entrar o adiantamento de pedágio; aí o financeiro abate do adiantamento. Cada passagem só entra em um pedido: se você gerar por fechamento e depois pelo mês, o mês traz só o que ainda não foi pedido. Gere depois de importar o extrato que cobre o período inteiro.</p></div>
    ${susp.length ? `<div class="cartao" style="border-left:5px solid #C62828"><h2>Contestar com o Sem Parar</h2><p class="muted">Mesma praça e sentido cobrados de novo no mesmo ciclo, sem passar no sentido contrário. Fora do reembolso do cliente.</p>
      <div class="tabela-wrap"><table class="tabela compacta"><thead><tr><th>Data/hora</th><th>Placa</th><th>Praça</th><th>Viagem</th><th class="num">Valor</th></tr></thead><tbody>${susp.map(p => `<tr><td>${dataHoraBR(p.data_hora)}</td><td>${esc(p.placa)}</td><td>${esc(p.praca || '')}</td><td>${esc(p.v?.numero || '')}</td><td class="num">${brl(deb(p))}</td></tr>`).join('')}</tbody></table></div></div>` : ''}
    <div class="cartao"><h2>Pedágio por viagem (ida e volta)</h2>${corrig.length ? `<p class="muted">${corrig.length} passagem(ns) de madrugada vieram no extrato com a <b>data do dia anterior</b>; o sistema corrigiu a data e ligou à viagem certa (o valor não muda). Clique na viagem para ver as passagens.</p>` : '<p class="muted">Clique na viagem para ver as passagens do ciclo.</p>'}${porVia.size ? `<div class="tabela-wrap"><table class="tabela compacta"><thead><tr><th>Viagem</th><th>Placa</th><th>Saída</th><th>Chegada</th><th class="num">Ciclo</th><th>Situação</th><th class="num">Passagens</th><th class="num">Valor</th><th>Pedido</th><th>Observação</th></tr></thead><tbody>
      ${[...porVia.entries()].sort((a, b) => (a[1].v?.chegada_em || '').localeCompare(b[1].v?.chegada_em || '')).map(([vid, x]) => { const c = CIC[vid] || {}, longo = medH && Number(c.horas) > medH * 1.5, pr = reemb.find(p => p.viagem_id === vid && emPedido(p));
        return `<tr class="clicavel" data-ped="${vid}"><td><b>${esc(x.v?.numero || '')}</b></td><td>${esc(x.placa)}</td><td>${dataHoraBR(c.saida) || '—'}</td><td>${dataHoraBR(x.v?.chegada_em) || '—'}</td>
          <td class="num">${c.horas != null ? String(c.horas).replace('.', ',') + ' h' : '—'}${longo ? ' <span class="tag amarelo">longo</span>' : ''}</td><td>${tagSt(ST_VIA, x.v?.status)}</td><td class="num">${x.n}</td><td class="num"><b>${brl(x.s)}</b></td>
          <td>${pr ? esc(TIT[pr.reembolso_titulo_id].numero || '') : '<span class="muted">—</span>'}</td>
          <td style="max-width:320px">${longo ? `<span class="muted">${esc([c.canceladas ? 'Viagem cancelada/excluída no período: ' + c.canceladas : 'Nenhuma viagem cancelada no período', c.creare ? 'Creare: ' + c.creare : ''].filter(Boolean).join(' · '))}</span>` : ''}</td></tr>`; }).join('')}
      <tr style="background:#F6EFDC"><td><b>Total</b></td><td></td><td></td><td></td><td></td><td></td><td class="num">${reemb.length}</td><td class="num"><b>${brl(totReemb)}</b></td><td></td><td></td></tr></tbody></table></div>` : '<div class="vazio">Nenhuma passagem ligada a viagem.</div>'}</div>
    <div class="cartao"${ehF ? ' hidden' : ''}><h2>Não reembolsável (custo da Verbo)</h2>
      ${porPlaca.size ? `<div class="tabela-wrap"><table class="tabela compacta"><thead><tr><th>Placa</th><th>Tipo</th><th>Período</th><th class="num">Passagens</th><th class="num">Valor</th></tr></thead><tbody>
        ${[...porPlaca].sort((a, b) => b[1].s - a[1].s).map(([k, x]) => `<tr><td><b>${esc(k)}</b></td><td>${esc(x.tipo || '—')}</td><td>${dataHoraBR(x.ini)} a ${dataHoraBR(x.fim)}</td><td class="num">${x.n}</td><td class="num">${brl(x.s)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Nenhuma passagem fora de viagem.</p>'}
      ${porTaxa.size ? `<p style="margin-top:8px"><b>Tarifas e encargos da conta:</b> ${[...porTaxa].map(([k, v]) => `${esc(k.toLowerCase())} ${brl(v)}`).join(' · ')}</p>` : ''}
      <p class="muted" style="margin:6px 0 0">Passagens de carros de apoio, de caminhões antes do início da operação ou fora de um ciclo de viagem (chegada anterior → chegada) não são cobradas do cliente. Se aparecer passagem de caminhão de viagem aqui, confira se a viagem foi lançada e entregue no sistema.</p></div>
    ${fin && conc.length ? `<div class="cartao"><h2>Conciliação por fatura do Sem Parar <span class="tag azul">interno</span></h2>
      <p class="muted">Cada fatura inteira (não só o período da tela), separada entre o que é repassado ao cliente e o que é custo da Verbo. O cliente paga por fechamento, abatendo do adiantamento; o Sem Parar é pago por fatura. O que liga os dois é cada passagem.</p>
      <div class="tabela-wrap"><table class="tabela compacta"><thead><tr><th>Fatura</th><th>Passagens de</th><th class="num">Total da fatura</th><th class="num">Cliente: já pedido</th><th>Pedido(s)</th><th class="num">Cliente: falta pedir</th><th class="num">Contestar (suspeitas)</th><th class="num">Custo Verbo: sem viagem</th><th class="num">Plano / tarifas</th><th class="num">Multa e juros (atraso)</th><th class="num">Saldo anterior (outros débitos)</th></tr></thead><tbody>
      ${conc.map(c => `<tr><td><b>${esc(c.fa)}</b>${c.fa === 'À Faturar' ? ' <span class="tag amarelo">ainda sem fatura</span>' : ''}</td><td class="nowrap">${c.ini ? dataBR(c.ini.slice(0, 10)) + ' a ' + dataBR(c.fim.slice(0, 10)) : '<span class="muted">só encargos</span>'}</td><td class="num"><b>${brl(c.tot)}</b></td>
        <td class="num">${c.ped ? brl(c.ped) : '—'}</td><td>${esc(c.pedidos || '')}</td><td class="num">${c.pend ? `<b style="color:#B7791F">${brl(c.pend)}</b>` : '—'}</td><td class="num">${c.susp ? `<b style="color:#C62828">${brl(c.susp)}</b>` : '—'}</td>
        <td class="num">${c.sem ? brl(c.sem) : '—'}</td><td class="num">${c.plano ? brl(c.plano) : '—'}</td><td class="num">${c.enc ? `<b style="color:#C62828">${brl(c.enc)}</b>` : '—'}</td><td class="num">${c.outros ? brl(c.outros) : '—'}</td></tr>`).join('')}
      <tr style="background:#F6EFDC"><td><b>Total</b></td><td></td><td class="num"><b>${brl(cs('tot'))}</b></td><td class="num">${brl(cs('ped'))}</td><td></td><td class="num">${brl(cs('pend'))}</td><td class="num">${brl(cs('susp'))}</td><td class="num">${brl(cs('sem'))}</td><td class="num">${brl(cs('plano'))}</td><td class="num">${brl(cs('enc'))}</td><td class="num">${brl(cs('outros'))}</td></tr></tbody></table></div>
      <p class="muted" style="margin:6px 0 0"><b>Cliente</b> = passagens de ida e volta das viagens (já pedido no reembolso ou ainda a pedir). <b>Custo da Verbo</b> = passagens sem viagem, plano e tarifas, e multa/juros por atraso. <b>Saldo anterior</b> = valor de fatura anterior cobrado de novo (confira se já foi pago, para não pagar duas vezes).${cs('enc') > 0 ? ` <b style="color:#C62828">Multa e juros por atraso: ${brl(cs('enc'))}, custo que não dá para repassar ao cliente.</b>` : ''}</p></div>` : ''}`;
  $$('[data-ped]', tela).forEach(tr => tr.onclick = () => pedModal(tr.dataset.ped));
  const fm = $('#ped-f');
  fm.onsubmit = e => { e.preventDefault(); const f = e.target;
    if (f.fech.value) return void (location.hash = '#/operacao/pedagios?fech=' + f.fech.value);
    if (f.de.value || f.ate.value) { if (!f.de.value || !f.ate.value || f.ate.value < f.de.value) return aviso('Informe o período completo (de / até).'); return void (location.hash = `#/operacao/pedagios?de=${f.de.value}&ate=${f.ate.value}`); }
    location.hash = '#/operacao/pedagios?mes=' + f.mes.value; };
  fm.mes.oninput = () => { fm.fech.value = ''; fm.de.value = ''; fm.ate.value = ''; };
  fm.de.oninput = fm.ate.oninput = () => { fm.fech.value = ''; };
  fm.fech.onchange = () => { fm.de.value = ''; fm.ate.value = ''; };
  $('#ped-imp')?.addEventListener('click', () => $('#ped-arq').click());
  $('#ped-arq')?.addEventListener('change', async ev => { const arq = ev.target.files[0]; ev.target.value = ''; if (!arq) return;
    try { const ls = await pedLerExtrato(arq);
      if (!await confirmar(`Importar ${ls.length} lançamento(s) do Sem Parar (${arq.name})? Lançamentos que já estão no sistema são ignorados.`, { botao: 'Importar' })) return;
      const r = await api.rpc('pedagio_importar', { p_linhas: ls, p_arquivo: arq.name });
      aviso(`${r.novas} lançamento(s) novos · ${r.repetidas} já estavam no sistema · ${r.ligadas} passagem(ns) ligadas a viagens.`); navegar(); } catch (err) { falha(err); } });
  $$('[data-reemb]', tela).forEach(b => b.onclick = () => ocupado(b, async () => {
    if (!await confirmar(`Gerar o pedido de reembolso de pedágio · ${rot}? Entram só as passagens que ainda não estão em outro pedido. Ele vai para Contas a receber como "aguardando pagamento do cliente".`, { botao: 'Gerar pedido' })) return;
    try { const id = await api.rpc('pedagio_pedir_reembolso_periodo', { p_cliente: b.dataset.reemb, p_ini: iniD, p_fim: fimD, p_fech: ehF ? fech : null }); aviso('Pedido de reembolso gerado.'); location.hash = '#/financeiro/receber/ver/' + id; } catch (err) { falha(err); } }));
});

// ---------- adiantamentos do cliente ----------
rota('/financeiro/adiantamentos-clientes', async tela => {
  const [ads, usos] = await Promise.all([api.listar('v_cliente_adiantamentos', 'order=data.desc,criado_em.desc'),
    api.listar('cliente_adiantamento_usos', 'select=*,t:titulos(id,numero,descricao),b:baixas(cancelado_em)&order=criado_em').catch(() => [])]);
  const fin = tem('administrador', 'financeiro'), ativos = ads.filter(a => !a.cancelado_em);
  const sd = t => ativos.filter(a => a.tipo === t).reduce((s, a) => s + Number(a.saldo), 0);
  const kpi = (n, r, cor = '') => `<div class="cartao kpi"${cor ? ` style="border-left:4px solid ${cor}"` : ''}><div class="n">${n}</div><div class="r">${r}</div></div>`;
  tela.innerHTML = `
    <div class="topo"><div><h1>Adiantamentos do cliente</h1><p class="sub">Dinheiro do cliente recebido antes: só vira receita quando é abatido de um fechamento ou de um pedido de reembolso</p></div>
      <div class="acoes">${fin ? '<button class="btn prim" id="adc-novo">+ Registrar adiantamento</button>' : ''}<a class="btn" href="#/operacao/pedagios">Pedágios</a></div></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:12px">
      ${kpi(brl(sd('aporte')), 'saldo de aporte (abate fechamentos de frete)', '#2F80ED')}${kpi(brl(sd('pedagio')), 'saldo de adiantamento de pedágio', '#DDA936')}</div>
    <div class="cartao">${ads.length ? `<div class="tabela-wrap"><table class="tabela compacta"><thead><tr><th>Data</th><th>Cliente</th><th>Tipo</th><th class="num">Recebido</th><th class="num">Abatido</th><th class="num">Saldo</th><th></th></tr></thead><tbody>
      ${ads.map((a, k) => `<tr${a.cancelado_em ? ' style="opacity:.5"' : ''}><td>${dataBR(a.data)}</td><td>${esc(a.cliente_nome)}</td><td>${tagSt(TIPO_ADC, a.tipo)}${a.competencia ? ' <span class="muted">' + mesRot(a.competencia) + '</span>' : ''}</td>
        <td class="num">${brl(a.valor)}</td><td class="num">${brl(a.usado)}</td><td class="num"><b>${brl(a.saldo)}</b></td>
        <td class="nowrap"><button class="btn peq" data-ext="${k}">Extrato</button>${fin && !a.cancelado_em && Number(a.saldo) > 0 ? ` <button class="btn peq prim" data-abt="${k}">Abater</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`
      : '<div class="vazio">Nenhum adiantamento registrado.</div>'}</div>
    <div class="cartao"><h2>Como funciona</h2><ul class="muted" style="margin:0;padding-left:18px;line-height:1.55">
      <li><b>Registrar:</b> o valor entra no caixa (com comprovante) e fica como saldo do cliente.</li>
      <li><b>Abater:</b> escolha a conta a receber do cliente (fechamento de viagens ou reembolso de pedágio). Ela é quitada por compensação, sem nova entrada no caixa, e o saldo diminui.</li>
      <li>O adiantamento de <b>pedágio</b> abate os pedidos de reembolso de pedágio; o <b>aporte</b> abate os fechamentos de frete. Se o fechamento for maior que o saldo, abate o que tiver e o resto segue como conta a receber.</li></ul></div>`;
  $('#adc-novo')?.addEventListener('click', async () => {
    const [cls, bs] = await Promise.all([api.listar('clientes', 'ativo=eq.true&select=id,nome,nome_fantasia&order=nome'), api.listar('contas_bancarias', 'ativo=eq.true&select=id,nome,tipo&order=nome')]);
    const r = await modal(`<form><h2>Registrar adiantamento do cliente</h2><div class="form">
      <label class="campo largo">Cliente<select name="cliente" required>${cls.map(c => `<option value="${c.id}">${esc(c.nome_fantasia || c.nome)}</option>`).join('')}</select></label>
      <label class="campo">Tipo<select name="tipo" required><option value="aporte">${TIPO_ADC.aporte[0]}</option><option value="pedagio">${TIPO_ADC.pedagio[0]}</option></select></label>
      <label class="campo" id="adc-comp" hidden>Mês do pedágio<input type="month" name="comp" value="${hojeISO().slice(0, 7)}"></label>
      <label class="campo">Data do recebimento<input type="date" name="data" value="${hojeISO()}" required></label>
      <label class="campo">Valor (R$)<input name="valor" inputmode="decimal" required></label>
      <label class="campo">Conta que recebeu<select name="conta" required>${bs.map(b => `<option value="${b.id}" ${b.tipo === 'corrente' ? 'selected' : ''}>${esc(b.nome)}</option>`).join('')}</select></label>
      <label class="campo">Forma<select name="forma" required><option value="">Selecione…</option>${FORMAS_BAIXA.map(f => `<option>${f}</option>`).join('')}</select></label>
      <label class="campo largo">Observação<input name="obs"></label>
      <label class="campo largo">Comprovante (obrigatório)<input type="file" name="arquivos" accept="image/*,application/pdf" multiple></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Cancelar</button><button class="btn prim">Registrar</button></div></form>`,
      { aoAbrir: f => { const t = $('[name=tipo]', f); t.onchange = () => { $('#adc-comp', f).hidden = t.value !== 'pedagio'; }; },
        validar: d => !d.arquivos.length ? 'Anexe o comprovante do recebimento.' : !(num(d.valor) > 0) ? 'Informe o valor.' : null });
    if (!r) return;
    try { const id = await api.rpc('cliente_adiantamento_registrar', { p_cliente: r.cliente, p_tipo: r.tipo, p_competencia: r.tipo === 'pedagio' ? r.comp + '-01' : null, p_data: r.data,
        p_valor: num(r.valor), p_conta: r.conta, p_forma: r.forma, p_obs: r.obs || null });
      await anexar('cliente_adiantamento', id, r.arquivos, 'Comprovante do adiantamento'); aviso('Adiantamento registrado.'); navegar(); } catch (err) { falha(err); } });
  $$('[data-ext]', tela).forEach(b => b.onclick = async () => { const a = ads[+b.dataset.ext], us = usos.filter(u => u.adiantamento_id === a.id && !u.b?.cancelado_em);
    const anx = await htmlAnexos('cliente_adiantamento', a.id).catch(() => '');
    modal(`<div><h2>${esc(a.cliente_nome)} · ${TIPO_ADC[a.tipo][0]}</h2><p class="muted">Recebido em ${dataBR(a.data)} · ${brl(a.valor)}${a.forma_pagamento ? ' · ' + esc(a.forma_pagamento) : ''}${a.observacao ? ' · ' + esc(a.observacao) : ''}</p>
      <div class="tabela-wrap"><table class="tabela compacta"><thead><tr><th>Data</th><th>Abatido em</th><th class="num">Valor</th></tr></thead><tbody>
      <tr><td>${dataBR(a.data)}</td><td><b>Recebimento</b></td><td class="num">${brl(a.valor)}</td></tr>
      ${us.map(u => `<tr><td>${dataBR(u.data)}</td><td><a href="#/financeiro/receber/ver/${u.t?.id}" data-fechar>${esc(u.t?.numero || '')}</a> ${esc(u.t?.descricao || '')}</td><td class="num">− ${brl(u.valor)}</td></tr>`).join('')}
      <tr style="background:#F6EFDC"><td></td><td><b>Saldo</b></td><td class="num"><b>${brl(a.saldo)}</b></td></tr></tbody></table></div><div>${anx}</div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Fechar</button></div></div>`); });
  $$('[data-abt]', tela).forEach(b => b.onclick = async () => { const a = ads[+b.dataset.abt];
    const ts = await api.listar('titulos', `tipo=eq.receber&cliente_id=eq.${a.cliente_id}&status=in.(previsto,aberto,aprovado,parcialmente_pago)&select=id,numero,descricao,valor_total,origem,parcelas:titulo_parcelas(valor,valor_pago,status)&order=data_emissao`);
    const aberto = t => (t.parcelas || []).filter(p => !['paga', 'cancelada'].includes(p.status)).reduce((s, p) => s + Number(p.valor) - Number(p.valor_pago), 0);
    const sug = ts.filter(t => a.tipo === 'pedagio' ? t.origem === 'pedagio' : t.origem !== 'pedagio');
    if (!ts.length) return aviso('Este cliente não tem conta a receber em aberto.', true);
    const r = await modal(`<form><h2>Abater do adiantamento</h2><p class="muted">${esc(a.cliente_nome)} · ${TIPO_ADC[a.tipo][0]} · saldo <b>${brl(a.saldo)}</b></p><div class="form">
      <label class="campo largo">Conta a receber<select name="titulo" required>${[...sug, ...ts.filter(t => !sug.includes(t))].map(t => `<option value="${t.id}">${esc(t.numero || '')} · ${esc(t.descricao || '')} · em aberto ${brl(aberto(t))}</option>`).join('')}</select></label>
      <label class="campo">Valor a abater (vazio = o máximo possível)<input name="valor" inputmode="decimal"></label></div>
      <p class="muted">A conta é quitada por compensação (sem nova entrada no caixa). Fechamento de viagens quitado passa as viagens para <b>Recebida</b>.</p>
      <div class="rodape"><button type="button" class="btn" data-fechar>Cancelar</button><button class="btn prim">Abater</button></div></form>`);
    if (!r) return;
    try { const x = await api.rpc('cliente_adiantamento_abater', { p_adiantamento: a.id, p_titulo: r.titulo, p_valor: r.valor ? num(r.valor) : null });
      aviso(`Abatido ${brl(x.abatido)}. Saldo do adiantamento: ${brl(x.saldo)}.`); navegar(); } catch (err) { falha(err); } });
});
