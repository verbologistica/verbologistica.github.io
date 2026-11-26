// ===================== Fechamento de viagens com o cliente =====================
// Períodos 06–20 (aberto no dia 21) e 21–05 (aberto no dia 06). O sistema abre sozinho e avisa (vf_gerar).
// Operação importa a planilha do cliente e confere → fecha e envia ao financeiro → financeiro decide divergências e valida.
// Viagem validada fica "Conferida" e travada; só muda por estorno (pedido pela operação, aprovado pelo financeiro/administrador).
const ST_VF = { aberto: ['Aguardando planilha do cliente', 'amarelo'], em_conferencia: ['Operação conferindo', 'azul'], no_financeiro: ['Com o financeiro', 'azul'], validado: ['Validado', 'verde'] };
const SIT_VFI = { ok: ['Confere', 'verde'], divergente: ['Divergência', 'vermelho'], sem_viagem: ['Não está no sistema', 'vermelho'], fora_planilha: ['Não veio na planilha', 'amarelo'] };
const vfOp = () => tem('administrador', 'operacao'), vfFin = () => tem('administrador', 'financeiro');
const vfPer = f => `${dataBR(f.periodo_ini)} a ${dataBR(f.periodo_fim)}`;
const vfAtrasado = f => ['aberto', 'em_conferencia'].includes(f.status) && f.prazo < hojeISO();

// ---------- leitura da planilha do cliente (nomes de coluna das abas MS e PR) ----------
const vfNorm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const VF_COLS = { ordem_busca: ['ordem_busca', 'ordem_de_busca'], nf: ['dcr_nota_fiscal', 'nota_fiscal', 'nf', 'numero_nf'],
  chegada: ['data_chegada_balanca_com_hora', 'data_chegada_balanca'], saida: ['data_saida_patio_com_hora', 'data_saida_patio'],
  tipo_conjunto: ['dcr_tipo_conjunto', 'tipo_de_conjunto', 'tipo_conjunto'], placa: ['dcr_equipamento_cavalo', 'equipamento_cavalo', 'placa', 'placa_cavalo'],
  peso_bruto: ['peso_bruto'], tara: ['tara'], peso_liquido: ['peso_liquido'], volume: ['vlr_volume', 'volume'], projeto: ['nom_projeto', 'projeto'], talhao: ['cd_talhao', 'talhao'],
  dist_total: ['vlr_distancia', 'distancia_total'], dist_asfalto: ['vlr_distancia_asfalto', 'distancia_asfalto'], dist_chao: ['vlr_distancia_chao', 'distancia_chao'],
  regiao: ['dcr_regiao', 'regional', 'regiao'], cte: ['cte', 'numero_cte', 'n_cte'], chave: ['chave_de_acesso', 'chave_acesso', 'chave_cte'], valor: ['valor_cte', 'valor_do_cte', 'valor_frete'] };
const VF_NUM = ['peso_bruto', 'tara', 'peso_liquido', 'volume', 'dist_total', 'dist_asfalto', 'dist_chao', 'valor'];
const vfNum = v => { if (v == null || v === '') return null; if (typeof v === 'number') return v; const s = String(v).trim().replace(/[^\d,.-]/g, '');
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s); return Number.isFinite(n) ? n : null; };
const vfData = v => { if (v == null || v === '') return null;
  if (typeof v === 'number') return new Date(Math.round((v - 25569) * 86400) * 1000).toISOString().slice(0, 19);   // número de série do Excel (hora local do cliente)
  const s = String(v).trim(), m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\D+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) { const a = m[3].length === 2 ? '20' + m[3] : m[3]; return `${a}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}T${(m[4] || '0').padStart(2, '0')}:${m[5] || '00'}:${m[6] || '00'}`; }
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.replace(' ', 'T').slice(0, 19) : null; };
async function vfLerPlanilha(arq) {
  await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
  const wb = XLSX.read(await arq.arrayBuffer(), { type: 'array' }), linhas = [], abas = [];
  for (const nome of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[nome], { header: 1, raw: true, defval: null });
    let hi = -1, mapa = null;
    for (let i = 0; i < Math.min(rows.length, 6) && hi < 0; i++) {
      const h = (rows[i] || []).map(vfNorm), m = {};
      for (const [k, al] of Object.entries(VF_COLS)) { const j = h.findIndex(x => al.includes(x)); if (j >= 0) m[k] = j; }
      if ((m.nf != null || m.chave != null) && Object.keys(m).length >= 4) { hi = i; mapa = m; }
    }
    if (hi < 0) continue;
    let n = 0;
    for (const r of rows.slice(hi + 1)) {
      const o = {}; for (const [k, j] of Object.entries(mapa)) o[k] = r[j];
      if ((o.nf == null || o.nf === '') && (o.chave == null || o.chave === '')) continue;
      for (const k of VF_NUM) o[k] = vfNum(o[k]);
      o.chegada = vfData(o.chegada); o.saida = vfData(o.saida);
      for (const k of ['ordem_busca', 'nf', 'tipo_conjunto', 'placa', 'projeto', 'talhao', 'regiao', 'cte', 'chave']) o[k] = o[k] == null ? null : String(o[k]).trim();
      o.aba = nome; linhas.push(o); n++;
    }
    abas.push(`${nome}: ${n}`);
  }
  if (!linhas.length) throw new Error('Não achei viagens na planilha. Confira se é o relatório do cliente (colunas de nota fiscal, chave de acesso, peso e valor do CT-e).');
  return { linhas, abas };
}

// ---------- lista ----------
rota('/operacao/fechamentos', async tela => {
  await api.rpc('vf_gerar').catch(() => null);
  const et = estado.params.get('etapa') || '';
  let fs = await api.listar('viagem_fechamentos', 'select=*,cl:clientes(nome),tit:titulos(status,numero)&order=periodo_ini.desc,criado_em.desc&limit=200');
  const vs = fs.length ? await api.listar('viagens', `fechamento_id=in.(${fs.map(f => f.id).join(',')})&select=fechamento_id,valor_frete`).catch(() => []) : [];
  const tot = {}; vs.forEach(v => { const t = tot[v.fechamento_id] ||= { n: 0, v: 0 }; t.n++; t.v += Number(v.valor_frete || 0); });
  const cont = k => fs.filter(f => f.status === k).length;
  if (et) fs = fs.filter(f => et.split(',').includes(f.status));
  tela.innerHTML = `
    <div class="topo"><div><h1>Fechamento de viagens com o cliente</h1><p class="sub">Períodos de 06 a 20 e de 21 a 05 · o sistema abre o fechamento sozinho nos dias 21 e 06 e avisa a operação</p></div>
      <div class="acoes"><a class="btn" href="#/operacao/viagens">Viagens</a></div></div>
    <div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
      <a class="cartao kpi ${cont('aberto') ? 'alerta' : ''}" href="#/operacao/fechamentos?etapa=aberto"><div class="n">${cont('aberto')}</div><div class="r">aguardando a planilha do cliente</div></a>
      <a class="cartao kpi" href="#/operacao/fechamentos?etapa=em_conferencia"><div class="n">${cont('em_conferencia')}</div><div class="r">com a operação conferindo</div></a>
      <a class="cartao kpi ${cont('no_financeiro') ? 'alerta' : ''}" href="#/operacao/fechamentos?etapa=no_financeiro"><div class="n">${cont('no_financeiro')}</div><div class="r">com o financeiro para validar</div></a>
      <a class="cartao kpi" href="#/operacao/fechamentos?etapa=validado"><div class="n">${cont('validado')}</div><div class="r">validados</div></a></div>
    <div class="cartao" style="padding:10px 14px"><b>Como funciona:</b> <span class="tag amarelo">Aguardando planilha</span> → operação <b>importa a planilha do cliente</b> e confere →
      <span class="tag azul">Com o financeiro</span> → financeiro decide as divergências e <b>valida</b> → <span class="tag verde">Validado</span> (viagens ficam <b>Conferida</b> e travadas).
      <div class="muted" style="margin-top:4px">Peso, volume, projeto, talhão, distâncias e horário da balança vêm da planilha do cliente automaticamente. Diferença de valor de até R$ 0,05 é aceita sozinha.</div></div>
    <form class="filtros" id="filtros"><select name="etapa"><option value="">Todas as situações</option>${Object.entries(ST_VF).map(([k, [t]]) => `<option value="${k}" ${k === et ? 'selected' : ''}>${t}</option>`).join('')}</select><button class="btn">Filtrar</button></form>
    <div class="cartao">${fs.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Período</th><th>Cliente</th><th class="num">Viagens</th><th class="num">Frete</th><th>Prazo da operação</th><th>Situação</th></tr></thead><tbody>
      ${fs.map(f => `<tr class="clicavel" onclick="location.hash='#/operacao/fechamentos/ver/${f.id}'"><td data-r="Período"><b>${vfPer(f)}</b></td><td data-r="Cliente">${esc(f.cl?.nome || 'Sem cliente')}</td>
        <td data-r="Viagens" class="num">${tot[f.id]?.n || 0}</td><td data-r="Frete" class="num">${brl(tot[f.id]?.v || 0)}</td>
        <td data-r="Prazo">${dataBR(f.prazo)}${vfAtrasado(f) ? ' <span class="tag vermelho">atrasado</span>' : ''}</td><td data-r="Situação">${tagSt(ST_VF, f.status)}${f.status === 'validado' ? (f.tit?.status === 'pago' ? ' <span class="tag verde">recebido</span>' : f.fatura_numero ? ' <span class="tag azul">faturado</span>' : ' <span class="tag amarelo">a faturar</span>') : ''}</td></tr>`).join('')}</tbody></table></div>`
      : '<div class="vazio">Nenhum fechamento. O primeiro é aberto pelo sistema no dia 21 (período de 06 a 20) ou no dia 06 (período de 21 a 05).</div>'}</div>`;
  $('#filtros').onsubmit = e => { e.preventDefault(); const v = e.target.etapa.value; location.hash = '#/operacao/fechamentos' + (v ? '?etapa=' + v : ''); };
});

// ---------- detalhe ----------
const vfFmt = (campo, x) => x == null || x === '' ? '—' : campo === 'valor_frete' ? brl(x) : campo === 'chegada_em' ? dataHoraBR(x) : esc(String(x));
rota('/operacao/fechamentos/ver/:id', async (tela, id) => {
  const [f] = await api.listar('viagem_fechamentos', `id=eq.${id}&select=*,cl:clientes(nome,documento)`);
  if (!f) { tela.innerHTML = '<div class="cartao vazio">Fechamento não encontrado.</div>'; return; }
  const its = await api.listar('viagem_fechamento_itens', `fechamento_id=eq.${id}&order=linha.asc.nullslast,criado_em.asc`);
  const idsIt = [...new Set(its.map(i => i.viagem_id).filter(Boolean))];
  const vs = await api.listar('viagens', `or=(fechamento_id.eq.${id}${idsIt.length ? `,id.in.(${idsIt.join(',')})` : ''})&select=id,numero,nf_numero,cte_numero,cte_chave,saida_em,chegada_em,valor_frete,peso_t,status,equipamento_id,icms_valor,icms_aliquota,eq:equipamentos(codigo_frota)&order=chegada_em`);
  const V = Object.fromEntries(vs.map(v => [v.id, v]));
  const PED = {}; if (vs.length) (await api.listar('pedagio_passagens', `viagem_id=in.(${vs.map(v => v.id).join(',')})&suspeita=eq.false&select=viagem_id,valor,debito_credito`).catch(() => [])).forEach(p => { PED[p.viagem_id] = (PED[p.viagem_id] || 0) + (p.debito_credito === 'CR' ? -1 : 1) * Number(p.valor); });
  const aportes = f.cliente_id && tem('administrador', 'financeiro') ? await api.listar('v_cliente_adiantamentos', `cliente_id=eq.${f.cliente_id}&tipo=eq.aporte&cancelado_em=is.null&saldo=gt.0&order=data`).catch(() => []) : [];
  const tit = f.titulo_id ? (await api.listar('titulos', `id=eq.${f.titulo_id}&select=id,numero,status,valor_total,documento,parcelas:titulo_parcelas(vencimento,valor,valor_pago,status)`).catch(() => []))[0] : null;
  const op = vfOp(), fin = vfFin(), st = f.status, recebido = tit?.status === 'pago', val = await api.rpc('vf_pode_validar').catch(() => false) === true;
  const n = k => its.filter(i => i.situacao === k).length, pend = its.filter(i => i.situacao === 'divergente' && !i.decisao).length;
  const daPlanilha = its.filter(i => i.dados), somaCli = daPlanilha.reduce((a, i) => a + Number(i.dados.valor || 0), 0), pesoCli = daPlanilha.reduce((a, i) => a + Number(i.dados.peso_liquido || 0), 0);
  const somaSis = its.filter(i => i.viagem_id && i.situacao !== 'fora_planilha').reduce((a, i) => a + Number(V[i.viagem_id]?.valor_frete || 0), 0);
  const noFech = vs.filter(v => v.status !== 'entregue' || its.some(i => i.viagem_id === v.id));
  const casadas = [...new Set(its.filter(i => i.viagem_id && i.situacao !== 'fora_planilha').map(i => i.viagem_id))].map(k => V[k]).filter(Boolean), baseV = casadas.length ? casadas : noFech;
  const icmsTot = baseV.reduce((a, v) => a + Number(v.icms_valor || 0), 0), semIcms = baseV.filter(v => v.icms_valor == null).length, pedTot = baseV.reduce((a, v) => a + (PED[v.id] || 0), 0), freteTot = baseV.reduce((a, v) => a + Number(v.valor_frete || 0), 0);
  const passos = [['aberto', 'Planilha do cliente'], ['em_conferencia', 'Conferência da operação'], ['no_financeiro', 'Validação'], ['faturar', 'Faturamento'], ['receber', 'Recebimento']];
  const ix = st === 'validado' ? (recebido ? 5 : f.fatura_numero ? 4 : 3) : passos.findIndex(p => p[0] === st);
  const ult = k => [...(f.historico || [])].reverse().find(h => h.acao?.startsWith(k));
  tela.innerHTML = `
    <div class="topo"><div><h1>Fechamento ${vfPer(f)}</h1><p class="sub">${esc(f.cl?.nome || 'Sem cliente')} · prazo da operação ${dataBR(f.prazo)}${vfAtrasado(f) ? ' <span class="tag vermelho">atrasado</span>' : ''} · ${tagSt(ST_VF, st)}</p></div>
      <div class="acoes">${op && ['aberto', 'em_conferencia'].includes(st) ? `<button class="btn ${st === 'aberto' ? 'prim' : ''}" id="vf-imp">📥 ${st === 'aberto' ? 'Importar planilha do cliente' : 'Importar planilha de novo'}</button><input type="file" id="vf-arq" accept=".xlsx,.xls,.csv" hidden>` : ''}
        ${op && st === 'em_conferencia' ? '<button class="btn prim" id="vf-env">Fechar e enviar ao financeiro</button>' : ''}
        ${val && st === 'no_financeiro' ? '<button class="btn" id="vf-dev">Devolver à operação</button><button class="btn prim" id="vf-val">✓ Validar fechamento</button>' : ''}
        ${st === 'validado' && val ? '<button class="btn perigo" id="vf-est">Estornar fechamento</button>' : st === 'validado' && op ? '<button class="btn" id="vf-pest">Pedir estorno</button>' : ''}
        ${op || fin ? '<button class="btn" id="vf-xml">Importar XMLs dos CT-e</button><input type="file" id="vf-xmls" accept=".xml,text/xml" multiple hidden>' : ''}${st === 'validado' ? '<button class="btn prim" id="vf-pdfc" title="Só o essencial: viagens, CT-e, peso, valores, ICMS e pedágio. Sem a conferência interna.">PDF para o cliente</button>' : ''}${its.length ? '<button class="btn" id="vf-pdf" title="Uso interno: conferência linha a linha, diferenças e responsáveis">PDF da conferência (interno)</button>' : ''}<a class="btn" href="#/operacao/fechamentos">Voltar</a></div></div>
    <div class="cartao" style="display:flex;gap:6px;flex-wrap:wrap;padding:10px 14px">${passos.map(([k, t], i) => `<div style="flex:1;min-width:150px;padding:8px 10px;border-radius:8px;${i < ix ? 'background:#E8F4EC;color:#1E8E57' : i === ix ? 'background:#F6EFDC;font-weight:700' : 'background:#F3F4F5;color:#8A9095'}">${i < ix ? '✓ ' : i + 1 + '. '}${t}</div>`).join('')}</div>
    ${f.devolucao_motivo && st === 'em_conferencia' ? `<div class="cartao" style="border-left:5px solid #C62828"><b>Devolvido pelo financeiro:</b> ${esc(f.devolucao_motivo)}</div>` : ''}
    ${st === 'aberto' ? `<div class="cartao" style="border-left:5px solid #DDA936"><b>Próximo passo (operação):</b> importe o relatório que o cliente enviou (Excel). O sistema casa cada linha com a viagem pela <b>chave do CT-e</b> (depois pela nota fiscal e, por último, placa + data), confere todos os campos e atualiza peso, volume, projeto, talhão, distâncias e horário da balança.</div>` : ''}
    ${st === 'em_conferencia' && n('sem_viagem') ? `<div class="cartao" style="border-left:5px solid #C62828"><b>${n('sem_viagem')} viagem(ns) da planilha não estão no sistema.</b> Lance essas viagens (com o XML do CT-e) e importe a planilha de novo. Sem isso o fechamento não pode ser enviado ao financeiro.</div>` : ''}
    ${st === 'no_financeiro' && val ? `<div class="cartao" style="border-left:5px solid #DDA936"><b>Próximo passo (validação):</b> ${pend ? `decida as <b>${pend}</b> divergência(s) abaixo (aceitar o dado do cliente ou contestar) e valide.` : 'tudo decidido: valide o fechamento.'} Viagem contestada ou que não veio na planilha volta para o próximo fechamento.</div>` : ''}
    ${st === 'validado' ? `<div class="cartao" style="border-left:5px solid ${recebido ? '#1E8E57' : '#DDA936'}"><h2>Faturamento e recebimento</h2>
      ${tit ? `<div class="form"><div><div class="muted">Conta a receber</div><b><a href="#/financeiro/receber/ver/${tit.id}">${esc(tit.numero || '—')}</a></b> ${recebido ? '<span class="tag verde">Recebida</span>' : tit.status === 'parcialmente_pago' ? '<span class="tag amarelo">Recebida em parte</span>' : '<span class="tag azul">Receita prevista</span>'}</div>
        <div><div class="muted">Valor</div><b>${brl(tit.valor_total)}</b></div><div><div class="muted">Fatura / boleto</div><b>${esc(f.fatura_numero || 'ainda não faturado')}</b></div>
        <div><div class="muted">Vencimento</div><b>${dataBR(f.fatura_vencimento || tit.parcelas?.[0]?.vencimento) || '—'}</b></div></div>
        <p class="muted" style="margin:8px 0 0">${recebido ? 'Recebimento confirmado com comprovante: viagens <b>Recebida</b>.' : f.fatura_numero ? 'Próximo passo (financeiro): quando o cliente pagar, registre o recebimento <b>na conta a receber, com o comprovante</b>. Até lá o valor fica como receita prevista.' : 'Próximo passo (financeiro): registre o faturamento (nº da fatura/boleto e vencimento). O valor fica como receita prevista até o recebimento.'}</p>
        <div class="acoes" style="margin-top:8px">${fin && !recebido ? `<button class="btn ${f.fatura_numero ? '' : 'prim'}" id="vf-fat">${f.fatura_numero ? 'Corrigir faturamento' : 'Registrar faturamento'}</button>` : ''}${fin && f.fatura_numero && !recebido ? `<a class="btn prim" href="#/financeiro/receber/ver/${tit.id}">Registrar recebimento</a>` : ''}${fin && !recebido && aportes.length ? `<button class="btn" id="vf-aporte">Abater do aporte (saldo ${brl(aportes.reduce((a, x) => a + Number(x.saldo), 0))})</button>` : ''}</div>`
      : '<p class="muted">A conta a receber ainda não foi criada.</p>'}</div>` : ''}
    ${its.length ? `<div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">
      <div class="cartao kpi"><div class="n">${daPlanilha.length}</div><div class="r">viagens na planilha${f.planilha_nome ? ` <span class="muted">(${esc(f.planilha_nome)})</span>` : ''}</div></div>
      <div class="cartao kpi"><div class="n">${n('ok')}</div><div class="r">conferem</div></div>
      <div class="cartao kpi ${n('divergente') ? 'alerta' : ''}"><div class="n">${n('divergente')}</div><div class="r">com divergência${n('divergente') ? ` · ${pend} sem decisão` : ''}</div></div>
      <div class="cartao kpi ${n('sem_viagem') ? 'alerta' : ''}"><div class="n">${n('sem_viagem')}</div><div class="r">não estão no sistema</div></div>
      <div class="cartao kpi"><div class="n">${n('fora_planilha')}</div><div class="r">do sistema não vieram na planilha</div></div></div>
    <div class="cartao"><div class="form">
      <div><div class="muted">Valor pelo cliente</div><b>${brl(somaCli)}</b></div><div><div class="muted">Valor no sistema (viagens casadas)</div><b>${brl(somaSis)}</b></div>
      <div><div class="muted">Diferença</div><b style="color:${Math.abs(somaCli - somaSis) > 0.05 ? '#C62828' : '#1E8E57'}">${brl(somaCli - somaSis)}</b></div><div><div class="muted">Peso líquido (balança do cliente)</div><b>${pesoCli.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} t</b></div></div></div>` : ''}
    <div class="cartao"><h2>Composição do valor</h2><div class="form">
      <div><div class="muted">Valor dos CT-e (frete com ICMS)</div><b>${brl(freteTot)}</b></div><div><div class="muted">Frete sem ICMS</div><b>${brl(freteTot - icmsTot)}</b></div>
      <div><div class="muted">ICMS embutido</div><b>${brl(icmsTot)}</b>${semIcms ? ` <span class="tag amarelo" title="Importe os XMLs dos CT-e">${semIcms} sem XML</span>` : ''}</div><div><div class="muted">Pedágio (ida e volta, reembolso à parte)</div><b>${brl(pedTot)}</b></div></div>
      ${semIcms ? '<p class="muted" style="margin:6px 0 0">Para o rateio do ICMS, clique em <b>Importar XMLs dos CT-e</b> e selecione os XMLs das viagens (pode selecionar todos de uma vez).</p>' : ''}</div>
    <div class="cartao"><h2>${its.length ? 'Conferência linha a linha' : 'Viagens do período no sistema'}</h2>
      ${its.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Linha</th><th>Viagem</th><th>NF</th><th>CT-e</th><th>Placa</th><th>Saída</th><th>Chegada (balança)</th><th class="num">Peso líq.</th><th class="num">Valor cliente</th><th class="num">ICMS</th><th class="num">Pedágio</th><th>Situação</th><th>O que difere</th><th>Decisão</th></tr></thead><tbody>
        ${its.map(i => { const v = V[i.viagem_id], d = i.dados || {}, dvs = (i.divergencias || []);
          return `<tr><td data-r="Linha">${i.linha ?? '—'}</td><td data-r="Viagem">${v ? `<a href="#/operacao/viagens/ver/${v.id}"><b>${esc(v.numero)}</b></a> <span class="muted">${esc(v.eq?.codigo_frota || '')}</span>` : '—'}${i.casou_por ? `<div class="muted" style="font-size:11px">pela ${esc(i.casou_por)}</div>` : ''}</td>
            <td data-r="NF">${esc(d.nf || v?.nf_numero || '—')}</td><td data-r="CT-e">${esc(d.cte || v?.cte_numero || '—')}</td><td data-r="Placa">${esc(d.placa || '—')}</td>
            <td data-r="Saída">${v?.saida_em ? dataHoraBR(v.saida_em) : '—'}</td><td data-r="Chegada">${d.chegada ? dataHoraBR(d.chegada) : v?.chegada_em ? dataHoraBR(v.chegada_em) : '—'}</td><td data-r="Peso líq." class="num">${d.peso_liquido != null ? Number(d.peso_liquido).toLocaleString('pt-BR') + ' t' : '—'}</td>
            <td data-r="Valor cliente" class="num">${d.valor != null ? brl(d.valor) : '—'}</td><td data-r="ICMS" class="num">${v?.icms_valor != null ? brl(v.icms_valor) : '—'}</td><td data-r="Pedágio" class="num">${v && PED[v.id] ? `<a href="javascript:void 0" data-pedv="${v.id}">${brl(PED[v.id])}</a>` : '—'}</td><td data-r="Situação">${tagSt(SIT_VFI, i.situacao)}</td>
            <td data-r="O que difere">${dvs.length ? dvs.map(x => `<div${x.auto ? ' class="muted"' : ''}>${esc(x.rotulo)}: ${vfFmt(x.campo, x.sistema)} → <b>${vfFmt(x.campo, x.cliente)}</b>${x.auto ? ' <span class="tag">ajustado</span>' : ''}</div>`).join('') : '—'}</td>
            <td data-r="Decisão">${i.decisao ? `<span class="tag ${i.decisao === 'aceitar' ? 'verde' : 'vermelho'}">${i.decisao === 'aceitar' ? 'Aceito o dado do cliente' : 'Contestado'}</span>${i.decisao_obs ? `<div class="muted">${esc(i.decisao_obs)}</div>` : ''}${val && st === 'no_financeiro' ? ` <button class="btn peq" data-dec="${i.id}">Mudar</button>` : ''}`
              : i.situacao === 'divergente' && val && st === 'no_financeiro' ? `<button class="btn ok peq" data-ac="${i.id}">Aceitar</button> <button class="btn perigo peq" data-dec="${i.id}">Contestar</button>`
              : i.situacao === 'fora_planilha' ? '<span class="muted">vai para o próximo fechamento</span>' : '—'}</td></tr>`; }).join('')}</tbody></table></div>`
      : noFech.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Viagem</th><th>NF</th><th>CT-e</th><th>Saída</th><th>Chegada</th><th class="num">Frete</th><th class="num">ICMS</th><th class="num">Pedágio</th><th>Situação</th></tr></thead><tbody>
        ${noFech.map(v => `<tr class="clicavel" onclick="location.hash='#/operacao/viagens/ver/${v.id}'"><td data-r="Viagem"><b>${esc(v.numero)}</b> <span class="muted">${esc(v.eq?.codigo_frota || '')}</span></td><td data-r="NF">${esc(v.nf_numero || '—')}</td><td data-r="CT-e">${esc(v.cte_numero || '—')}</td>
          <td data-r="Saída">${dataHoraBR(v.saida_em) || '—'}</td><td data-r="Chegada">${dataHoraBR(v.chegada_em) || '—'}</td><td data-r="Frete" class="num">${brl(v.valor_frete || 0)}</td><td data-r="ICMS" class="num">${v.icms_valor != null ? brl(v.icms_valor) : '—'}</td><td data-r="Pedágio" class="num">${PED[v.id] ? `<a href="javascript:void 0" data-pedv="${v.id}" onclick="event.stopPropagation()">${brl(PED[v.id])}</a>` : '—'}</td><td data-r="Situação">${tagSt(ST_VIA, v.status)}</td></tr>`).join('')}</tbody></table></div>
        <p class="muted">Total: ${noFech.length} viagem(ns) · ${brl(noFech.reduce((a, v) => a + Number(v.valor_frete || 0), 0))}</p>` : '<div class="vazio">Nenhuma viagem neste fechamento.</div>'}</div>
    <div class="cartao"><h2>Histórico</h2>${(f.historico || []).length ? `<ul class="lista-simples">${[...f.historico].reverse().map(h => `<li><span><b>${esc(h.acao)}</b>${h.obs ? ` · ${esc(h.obs)}` : ''}<div class="muted">${dataHoraBR(h.em)}${h.nome ? ' · ' + esc(h.nome) : ''}</div></span></li>`).join('')}</ul>` : '<div class="muted">—</div>'}
      <div id="anx-vf" style="margin-top:8px"></div></div>`;
  htmlAnexos('viagem_fechamento', id).then(h => { const el = $('#anx-vf'); if (el) el.innerHTML = h; }).catch(() => {});

  // importar planilha
  $('#vf-imp')?.addEventListener('click', () => $('#vf-arq').click());
  $('#vf-arq')?.addEventListener('change', async ev => { const arq = ev.target.files[0]; ev.target.value = ''; if (!arq) return;
    try { const { linhas, abas } = await vfLerPlanilha(arq);
      const dts = linhas.map(l => l.chegada).filter(Boolean).sort(), fora = linhas.filter(l => l.chegada && (l.chegada.slice(0, 10) < f.periodo_ini || l.chegada.slice(0, 10) > f.periodo_fim)).length;
      const ok = await modal(`<form><h2>📥 Importar planilha do cliente</h2><p><b>${esc(arq.name)}</b> · ${linhas.length} viagem(ns) lida(s) <span class="muted">(${esc(abas.join(' · '))})</span></p>
        <p>Chegadas de ${dts.length ? dataHoraBR(dts[0]) : '—'} a ${dts.length ? dataHoraBR(dts.at(-1)) : '—'} · valor total ${brl(linhas.reduce((a, l) => a + Number(l.valor || 0), 0))} · peso líquido ${linhas.reduce((a, l) => a + Number(l.peso_liquido || 0), 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} t</p>
        ${fora ? `<p class="muted">⚠️ ${fora} linha(s) com chegada fora do período ${vfPer(f)}: o sistema procura a viagem mesmo assim.</p>` : ''}
        ${st === 'em_conferencia' ? '<p class="muted">A conferência anterior é substituída (fica guardada no backup).</p>' : ''}
        <p class="muted">O peso, volume, projeto, talhão, distâncias e horário da balança das viagens encontradas passam a ser os do cliente.</p>
        <div class="rodape"><button type="button" class="btn" data-fechar>Cancelar</button><button class="btn prim">Importar e conferir</button></div></form>`);
      if (!ok) return;
      const r = await api.rpc('vf_importar', { p_fid: id, p_linhas: linhas, p_arquivo: arq.name });
      await anexar('viagem_fechamento', id, [arq], 'Planilha do cliente').catch(() => {});
      aviso(`Conferido: ${r.ok} ok · ${r.divergente} com divergência · ${r.sem_viagem} fora do sistema · ${r.fora_planilha} fora da planilha.`); navegar();
    } catch (err) { falha(err); } });

  $('#vf-env')?.addEventListener('click', e => ocupado(e.target, async () => {
    if (n('sem_viagem')) return aviso('Lance as viagens que faltam no sistema e importe a planilha de novo antes de fechar.', true);
    if (!await confirmar(`Fechar a conferência e enviar ao financeiro?${n('fora_planilha') ? ` ${n('fora_planilha')} viagem(ns) que não vieram na planilha voltam para o próximo fechamento quando o financeiro validar.` : ''}`, { botao: 'Enviar ao financeiro' })) return;
    try { await api.rpc('vf_enviar', { p_fid: id }); aviso('Enviado ao financeiro.'); navegar(); } catch (err) { falha(err); } }));

  $$('[data-ac]', tela).forEach(b => b.onclick = () => ocupado(b, async () => { try { await api.rpc('vf_decidir', { p_item: b.dataset.ac, p_decisao: 'aceitar' }); navegar(); } catch (err) { falha(err); } }));
  $$('[data-dec]', tela).forEach(b => b.onclick = async () => {
    const r = await modal(`<form><h2>Decisão sobre a divergência</h2><div class="form">
      <label class="campo largo">Decisão<select name="dec"><option value="contestar">Contestar com o cliente (a viagem volta para o próximo fechamento)</option><option value="aceitar">Aceitar o dado do cliente (o sistema é corrigido)</option></select></label>
      <label class="campo largo">Motivo / observação<textarea name="obs" placeholder="Obrigatório para contestar"></textarea></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Cancelar</button><button class="btn prim">Salvar</button></div></form>`, { validar: d => d.dec === 'contestar' && !d.obs ? 'Informe o motivo da contestação.' : null });
    if (!r) return; try { await api.rpc('vf_decidir', { p_item: b.dataset.dec, p_decisao: r.dec, p_obs: r.obs || null }); navegar(); } catch (err) { falha(err); } });

  $('#vf-dev')?.addEventListener('click', async () => { const m = await confirmar('Devolver o fechamento à operação?', { comMotivo: true, botao: 'Devolver' }); if (!m) return;
    try { await api.rpc('vf_devolver', { p_fid: id, p_motivo: m }); aviso('Devolvido à operação.'); navegar(); } catch (err) { falha(err); } });
  $('#vf-val')?.addEventListener('click', e => ocupado(e.target, async () => {
    if (pend) return aviso(`Decida as ${pend} divergência(s) antes de validar.`, true);
    if (!await confirmar(`Validar o fechamento ${vfPer(f)}? As viagens aceitas ficam "Conferida" e travadas; contestadas e as que não vieram na planilha voltam para o próximo fechamento.`, { botao: 'Validar' })) return;
    try { const r = await api.rpc('vf_validar', { p_fid: id }); aviso(`Validado: ${r.conferidas} viagem(ns) conferida(s)${r.voltaram ? `, ${r.voltaram} voltaram para o próximo fechamento` : ''}.`); navegar(); } catch (err) { falha(err); } }));
  $('#vf-pest')?.addEventListener('click', async () => { const m = await confirmar('Pedir estorno deste fechamento ao financeiro?', { comMotivo: true, botao: 'Pedir estorno' }); if (!m) return;
    try { await api.rpc('vf_pedir_estorno', { p_fid: id, p_motivo: m }); aviso('Pedido de estorno enviado ao financeiro.'); navegar(); } catch (err) { falha(err); } });
  $('#vf-est')?.addEventListener('click', async () => { const m = await confirmar('Estornar o fechamento? As viagens voltam para "Em conferência" e o fechamento volta para a operação.', { comMotivo: true, botao: 'Estornar' }); if (!m) return;
    try { await api.rpc('vf_estornar', { p_fid: id, p_motivo: m }); aviso('Fechamento estornado.'); navegar(); } catch (err) { falha(err); } });
  $$('[data-pedv]', tela).forEach(a => a.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); pedModal(a.dataset.pedv); }));
  $('#vf-xml')?.addEventListener('click', () => $('#vf-xmls').click());
  $('#vf-xmls')?.addEventListener('change', async ev => { const fs = [...ev.target.files]; ev.target.value = ''; if (!fs.length) return; await importarXmlsCte(fs, id, $('#vf-xml')); navegar(); });
  $('#vf-aporte')?.addEventListener('click', e => ocupado(e.target, async () => {
    const tot = aportes.reduce((a, x) => a + Number(x.saldo), 0);
    if (!await confirmar(`Abater esta conta a receber do aporte do cliente (saldo ${brl(tot)})? A conta é quitada por compensação, sem nova entrada no caixa.`, { botao: 'Abater' })) return;
    try { let ab = 0; for (const a of aportes) { const t = await api.um('titulos', `id=eq.${tit.id}&select=status`); if (t.status === 'pago') break;
        ab += Number((await api.rpc('cliente_adiantamento_abater', { p_adiantamento: a.id, p_titulo: tit.id, p_valor: null })).abatido); }
      aviso(`Abatido ${brl(ab)} do aporte.`); navegar(); } catch (err) { falha(err); } }));
  $('#vf-fat')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Registrar faturamento</h2><p class="muted">${vfPer(f)} · ${brl(tit?.valor_total || 0)}</p><div class="form">
      <label class="campo">Nº da fatura / boleto<input name="numero" value="${esc(f.fatura_numero || '')}" required></label>
      <label class="campo">Vencimento<input type="date" name="venc" value="${f.fatura_vencimento || tit?.parcelas?.[0]?.vencimento || ''}" required></label>
      <label class="campo largo">Fatura / boleto (PDF)<input type="file" name="arquivos" accept="image/*,application/pdf" multiple></label></div>
      <p class="muted">As viagens passam para <b>Faturada</b>. O valor continua como receita prevista até o recebimento.</p>
      <div class="rodape"><button type="button" class="btn" data-fechar>Cancelar</button><button class="btn prim">Salvar</button></div></form>`);
    if (!r) return;
    try { await api.rpc('vf_faturar', { p_fid: id, p_numero: r.numero, p_vencimento: r.venc });
      if (r.arquivos?.length) { await anexar('viagem_fechamento', id, r.arquivos, 'Fatura/boleto').catch(() => {}); if (tit) await anexar('titulo', tit.id, r.arquivos, 'Fatura/boleto').catch(() => {}); }
      aviso('Faturamento registrado.'); navegar(); } catch (err) { falha(err); } });
  $('#vf-pdf')?.addEventListener('click', e => ocupado(e.target, () => vfPdf(f, its, V, { somaCli, somaSis, pesoCli, n, ult, PED, comp: { frete: freteTot, icms: icmsTot, semIcms, ped: pedTot } }).catch(falha)));
  $('#vf-pdfc')?.addEventListener('click', e => ocupado(e.target, () => vfPdfCliente(f, its, V, PED).catch(falha)));
});

// ---------- importação em lote dos XMLs dos CT-e (fechamento e lista de viagens) ----------
// liga cada XML à viagem pela chave; não repete anexo já existente; relatório do que não é CT-e / não tem viagem
async function importarXmlsCte(fs, fechId = null, btn = null) {
  const lidos = [], erro = [], tipoXml = t => /<(proc)?EventoCTe|<eventoCTe/i.test(t) ? 'é um evento do CT-e (cancelamento, carta de correção…), não o CT-e' : /<(nfeProc|NFe)[\s>]/i.test(t) ? 'é XML de nota fiscal (NF-e), não de CT-e'
    : /<(mdfeProc|MDFe)[\s>]/i.test(t) ? 'é XML de MDF-e, não de CT-e' : null;
  await ocupado(btn, async () => {
    for (const arq of fs) { const t = await arq.text(); try { lidos.push({ arq, c: lerXmlCte(t) }); } catch (err) { erro.push([arq.name, tipoXml(t) || err.message]); } }
    const chaves = [...new Set(lidos.map(l => l.c.chave).filter(Boolean))], V2 = {};
    for (let i = 0; i < chaves.length; i += 40) (await api.listar('viagens', `cte_chave=in.(${chaves.slice(i, i + 40).join(',')})&select=id,numero,cte_chave,fechamento_id,icms_valor`).catch(() => [])).forEach(v => { V2[v.cte_chave] = v; });
    const ids = Object.values(V2).map(v => v.id), jaAnx = new Set();
    for (let i = 0; i < ids.length; i += 40) (await api.listar('anexos', `entidade=eq.viagem&entidade_id=in.(${ids.slice(i, i + 40).join(',')})&cancelado_em=is.null&select=entidade_id,nome_original`).catch(() => [])).forEach(a => jaAnx.add(a.entidade_id + '|' + a.nome_original));
    for (const l of lidos) { const v = V2[l.c.chave]; l.v = v;
      if (!v) { l.sit = 'sem'; continue; }
      const igual = v.icms_valor != null && Number(v.icms_valor) === Number(l.c.icms_valor), temAnx = jaAnx.has(v.id + '|' + l.arq.name);
      try { if (!igual) await api.rpc('vf_cte_xml', { p_viagem: v.id, p_dados: l.c });
        if (!temAnx) { await anexar('viagem', v.id, [l.arq], 'CT-e (XML)').catch(() => {}); jaAnx.add(v.id + '|' + l.arq.name); }
        l.sit = igual && temAnx ? 'ja' : !fechId || v.fechamento_id === fechId ? 'ok' : 'outro'; }
      catch (err) { l.sit = 'erro'; erro.push([l.arq.name, err.message]); } } });
  const g = k => lidos.filter(l => l.sit === k), li = (arr, f) => arr.length ? `<ul style="margin:4px 0 10px 18px">${arr.map(f).join('')}</ul>` : '';
  await modal(`<div><h2>Importação dos XMLs</h2><p class="muted">${fs.length} arquivo(s) lido(s)</p>
    <p><b>${g('ok').length}</b> ligados às viagens${fechId ? ' deste fechamento' : ''}${g('ja').length ? ` · <b>${g('ja').length}</b> já estavam importados (não foram repetidos)` : ''}</p>
    ${g('ok').length && !fechId ? li(g('ok'), l => `<li>${esc(l.v.numero)} · CT-e ${esc(l.c.numero || '')} · ICMS ${brl(l.c.icms_valor || 0)}</li>`) : ''}
    ${g('outro').length ? `<p><b>${g('outro').length}</b> ligados a viagens de <b>outro período</b> (já ficam prontos para o próximo fechamento):</p>${li(g('outro'), l => `<li>${esc(l.v.numero)} · CT-e ${esc(l.c.numero || '')}</li>`)}` : ''}
    ${g('sem').length ? `<p><b>${g('sem').length}</b> CT-e que <b>não têm viagem no sistema</b> (confira se a viagem foi lançada):</p>${li(g('sem'), l => `<li>CT-e ${esc(l.c.numero || '?')} · emissão ${l.c.emissao ? dataBR(l.c.emissao.slice(0, 10)) : '—'} · NF ${esc(l.c.nfs.join(', ') || '—')} · ${brl(l.c.valor || 0)}</li>`)}` : ''}
    ${erro.length ? `<p><b>${erro.length}</b> arquivo(s) que não são CT-e ou deram erro:</p>${li(erro, ([n, m]) => `<li>${esc(n)}: <span class="muted">${esc(m)}</span></li>`)}` : ''}
    <div class="rodape"><button type="button" class="btn prim" data-fechar>OK</button></div></div>`);
}

// ---------- PDF da conferência (papel timbrado, paisagem) ----------
// PDF para o cliente: só o essencial. Frete (CT-e, ICMS incluído) e pedágio (reembolso à parte) em blocos separados, sem somar os dois.
async function vfPdfCliente(f, its, V, PED) {
  await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
  const E = (await empresasL().catch(() => []))[0] || {}, IMG = await imagensTimbrado(true);
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const ML = 20, MR = 277, TOPO = 40, BASE = 181, W = MR - ML;
  const C = { texto: [37, 46, 53], cinza: [107, 115, 120], escuro: [37, 46, 53], verde: [0, 104, 74], ouro: [176, 128, 20], borda: [215, 219, 222], creme: [246, 239, 220], verdeC: [232, 244, 236] };
  const feitas = new Set(), moldura = () => { const pg = doc.getCurrentPageInfo().pageNumber; if (!feitas.has(pg)) { feitas.add(pg); molduraTimbrado(doc, E, IMG); } };
  const rows = its.filter(i => i.viagem_id && V[i.viagem_id] && i.situacao !== 'fora_planilha' && i.situacao !== 'sem_viagem' && i.decisao !== 'contestar')
    .sort((a, b) => String((a.dados || {}).chegada || V[a.viagem_id].chegada_em).localeCompare(String((b.dados || {}).chegada || V[b.viagem_id].chegada_em)));
  const vs = [...new Map(rows.map(i => [i.viagem_id, i])).values()], ids = vs.map(i => i.viagem_id);
  const pp = ids.length ? await api.listar('pedagio_passagens', `viagem_id=in.(${ids.join(',')})&tipo_uso=eq.PASSAGENS&suspeita=eq.false&select=viagem_id,valor,debito_credito,reembolso_titulo_id`).catch(() => []) : [];
  const NP = {}, PV = {}; pp.forEach(p => { NP[p.viagem_id] = (NP[p.viagem_id] || 0) + 1; PV[p.viagem_id] = (PV[p.viagem_id] || 0) + (p.debito_credito === 'CR' ? -1 : 1) * Number(p.valor); });
  const tids = [...new Set(pp.map(p => p.reembolso_titulo_id).filter(Boolean))];
  const tits = tids.length ? (await api.listar('titulos', `id=in.(${tids.join(',')})&status=neq.cancelado&select=numero`).catch(() => [])).map(x => x.numero).filter(Boolean) : [];
  const val = id => PV[id] ?? PED?.[id] ?? 0;
  let tf = 0, ti = 0, tp = 0, tpeso = 0, tn = 0;
  const lin = vs.map((i, k) => { const v = V[i.viagem_id], d = i.dados || {}, fr = Number(v.valor_frete || 0), ic = v.icms_valor != null ? Number(v.icms_valor) : null, pd = val(v.id), ps = Number(d.peso_liquido ?? v.peso_t ?? 0);
    tf += fr; ti += ic || 0; tp += pd; tpeso += ps; tn += NP[v.id] || 0;
    return { k: k + 1, nf: d.nf || v.nf_numero || '-', cte: d.cte || v.cte_numero || '-', placa: d.placa || '-', saida: v.saida_em ? dataHoraBR(v.saida_em) : '-', cheg: d.chegada ? dataHoraBR(d.chegada) : v.chegada_em ? dataHoraBR(v.chegada_em) : '-', ps, fr, ic, pd, n: NP[v.id] || 0 }; });
  const n2 = (x, d = 3) => Number(x).toLocaleString('pt-BR', { maximumFractionDigits: d });
  const mg = { left: ML, right: 297 - MR, top: TOPO + 4, bottom: 210 - BASE }, base = { theme: 'grid', margin: mg, willDrawPage: moldura,
    styles: { font: 'helvetica', fontSize: 7.8, textColor: C.texto, lineColor: C.borda, lineWidth: 0.15, cellPadding: 1.3 }, footStyles: { fillColor: C.creme, textColor: C.texto, fontStyle: 'bold' } };
  let y = 44;
  const precisa = h => { if (y + h > BASE) { doc.addPage(); moldura(); y = TOPO + 4; } };
  const faixa = (num, titulo, sub, cor) => { precisa(22); doc.setFillColor(...cor); doc.rect(ML, y, 2.2, 10, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(...cor); doc.text(`${num}. ${titulo}`, ML + 5, y + 4.2);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.2); doc.setTextColor(...C.cinza); doc.text(sub, ML + 5, y + 8.8); y += 13; };
  moldura();
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...C.texto); doc.text(`Demonstrativo de fretes e pedágios · ${vfPer(f)}`, ML, y); y += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...C.cinza);
  doc.text(`${f.cl?.nome || ''}${f.cl?.documento ? ' · CNPJ ' + fmtCNPJ(f.cl.documento) : ''} · ${vs.length} viagens · emitido em ${new Date().toLocaleDateString('pt-BR')}`, ML, y); y += 6;
  // resumo: dois recebimentos distintos, lado a lado, sem total geral
  const bw = (W - 6) / 2, caixa = (x, cor, fundo, rot, valor, l1, l2) => { doc.setFillColor(...fundo); doc.setDrawColor(...cor); doc.setLineWidth(0.4); doc.roundedRect(x, y, bw, 25, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...cor); doc.text(rot, x + 4, y + 5.5);
    doc.setFontSize(15); doc.setTextColor(...C.texto); doc.text(valor, x + 4, y + 13);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.6); doc.setTextColor(...C.cinza); doc.text(l1, x + 4, y + 18.5); doc.text(l2, x + 4, y + 22.3); };
  caixa(ML, C.verde, C.verdeC, '1. FRETE · FATURA DOS CT-e', brl(tf), `ICMS embutido ${brl(ti)} · frete sem ICMS ${brl(tf - ti)} · ${n2(tpeso, 2)} t`, 'Cobrado na fatura de frete. O ICMS já está dentro do valor de cada CT-e.');
  caixa(ML + bw + 6, C.ouro, C.creme, '2. PEDÁGIO · REEMBOLSO À PARTE', brl(tp), `${tn} passagens (ida e volta) · NÃO incluso no valor do frete`, '');
  y += 31;
  faixa(1, 'Frete (fatura dos CT-e)', 'Valor de cada CT-e com o rateio do ICMS embutido. Este é o valor total do frete do período.', C.verde);
  doc.autoTable({ ...base, startY: y, headStyles: { fillColor: C.verde, textColor: 255, fontStyle: 'bold', fontSize: 7.6 },
    head: [['#', 'NF', 'CT-e', 'Placa', 'Saída', 'Chegada (balança)', 'Peso líq. (t)', 'Valor do CT-e', 'ICMS embutido', 'Frete sem ICMS']],
    body: lin.map(l => [l.k, l.nf, l.cte, l.placa, l.saida, l.cheg, n2(l.ps), brl(l.fr), l.ic != null ? brl(l.ic) : '-', l.ic != null ? brl(l.fr - l.ic) : '-']),
    foot: [['', '', '', '', '', 'Total do frete', n2(tpeso), brl(tf), brl(ti), brl(tf - ti)]], showFoot: 'lastPage',
    columnStyles: { 6: { halign: 'right' }, 7: { halign: 'right' }, 8: { halign: 'right' }, 9: { halign: 'right' } } });
  /* pedágio por viagem é controle interno: fica fora do relatório do cliente */
  if (false) { faixa(2, 'Pedágio · reembolso à parte (não faz parte do frete)', 'Passagens de ida (vazio) e volta (carregado) de cada viagem, conforme o extrato do Sem Parar. Cobrança separada da fatura de frete.', C.ouro);
  doc.autoTable({ ...base, startY: y, headStyles: { fillColor: C.ouro, textColor: 255, fontStyle: 'bold', fontSize: 7.6 },
    head: [['#', 'NF', 'CT-e', 'Placa', 'Chegada (balança)', 'Passagens', 'Valor do pedágio']],
    body: lin.map(l => [l.k, l.nf, l.cte, l.placa, l.cheg, l.n || '-', l.pd ? brl(l.pd) : '-']),
    foot: [['', '', '', '', 'Total do pedágio', tn, brl(tp)]], showFoot: 'lastPage', columnStyles: { 5: { halign: 'right' }, 6: { halign: 'right' } } }); }
  paginarTimbrado(doc, true);
  doc.save(`Demonstrativo de fretes e pedágios ${f.periodo_ini} a ${f.periodo_fim}.pdf`);
}

async function vfPdf(f, its, V, S) {
  await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
  const E = (await empresasL().catch(() => []))[0] || {}, IMG = await imagensTimbrado(true);
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const ML = 20, MR = 277, TOPO = 40, BASE = 181, txt = s => String(s ?? '').replace(/→/g, '>').replace(/[✓✔]/g, '').replace(/⚠️?/g, '!');
  const C = { texto: [37, 46, 53], cinza: [107, 115, 120], escuro: [37, 46, 53], verm: [198, 40, 40], verde: [30, 142, 87], creme: [246, 239, 220], borda: [215, 219, 222] };
  const feitas = new Set(), moldura = () => { const pg = doc.getCurrentPageInfo().pageNumber; if (!feitas.has(pg)) { feitas.add(pg); molduraTimbrado(doc, E, IMG); } };
  let y = 44;
  const tabela = (head, body, opts = {}) => { doc.autoTable({ startY: y, margin: { left: ML, right: 297 - MR, top: TOPO + 4, bottom: 210 - BASE }, theme: 'grid', head: [head], body,
    styles: { font: 'helvetica', fontSize: 7.4, textColor: C.texto, lineColor: C.borda, lineWidth: 0.15, cellPadding: 1.2, valign: 'top' },
    headStyles: { fillColor: C.escuro, textColor: 255, fontStyle: 'bold', fontSize: 7.2, lineWidth: 0 }, willDrawPage: moldura, ...opts }); y = doc.lastAutoTable.finalY + 5; };
  const titulo = t => { if (y + 12 > BASE) { doc.addPage(); moldura(); y = TOPO + 4; } doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...C.texto); doc.text(t, ML, y); y += 4; };
  moldura();
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...C.texto); doc.text(`Conferência de viagens com o cliente · ${vfPer(f)}`, ML, y); y += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...C.cinza);
  doc.text(txt(`${f.cl?.nome || 'Sem cliente'}${f.cl?.documento ? ' · CNPJ ' + fmtCNPJ(f.cl.documento) : ''} · situação: ${ST_VF[f.status]?.[0] || f.status} · planilha: ${f.planilha_nome || '-'} · emitido em ${new Date().toLocaleString('pt-BR')}`), ML, y); y += 6;
  tabela(['Viagens na planilha', 'Conferem', 'Com divergência', 'Não estão no sistema', 'Não vieram na planilha', 'Valor pelo cliente', 'Valor no sistema', 'Diferença', 'Peso líquido'],
    [[its.filter(i => i.dados).length, S.n('ok'), S.n('divergente'), S.n('sem_viagem'), S.n('fora_planilha'), brl(S.somaCli), brl(S.somaSis), brl(S.somaCli - S.somaSis), S.pesoCli.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' t']],
    { styles: { font: 'helvetica', fontSize: 8.6, halign: 'center', textColor: C.texto, lineColor: C.borda, lineWidth: 0.15 }, headStyles: { fillColor: C.escuro, textColor: 255, fontStyle: 'bold', fontSize: 7, halign: 'center' } });
  titulo('Conferência linha a linha');
  if (S.comp) tabela(['Valor dos CT-e', 'Frete sem ICMS', 'ICMS embutido', 'Pedágio (ida e volta)'], [[brl(S.comp.frete), brl(S.comp.frete - S.comp.icms), brl(S.comp.icms) + (S.comp.semIcms ? ` (${S.comp.semIcms} sem XML)` : ''), brl(S.comp.ped)]],
    { styles: { font: 'helvetica', fontSize: 8.6, halign: 'center', textColor: C.texto, lineColor: C.borda, lineWidth: 0.15 }, headStyles: { fillColor: C.escuro, textColor: 255, fontStyle: 'bold', fontSize: 7, halign: 'center' } });
  tabela(['Linha', 'Viagem', 'NF', 'CT-e', 'Placa', 'Saída', 'Chegada (balança)', 'Peso líq. (t)', 'Valor cliente', 'Valor sistema', 'ICMS', 'Pedágio', 'Situação', 'Decisão'],
    its.map(i => { const v = V[i.viagem_id], d = i.dados || {};
      return [i.linha ?? '-', v ? `${v.numero}${v.eq?.codigo_frota ? ' · ' + v.eq.codigo_frota : ''}` : '-', d.nf || v?.nf_numero || '-', d.cte || v?.cte_numero || '-', d.placa || '-', v?.saida_em ? dataHoraBR(v.saida_em) : '-',
        d.chegada ? dataHoraBR(d.chegada) : v?.chegada_em ? dataHoraBR(v.chegada_em) : '-', d.peso_liquido != null ? Number(d.peso_liquido).toLocaleString('pt-BR') : '-',
        d.valor != null ? brl(d.valor) : '-', v ? brl(v.valor_frete || 0) : '-', v?.icms_valor != null ? brl(v.icms_valor) : '-', v && S.PED?.[v.id] ? brl(S.PED[v.id]) : '-', SIT_VFI[i.situacao]?.[0] || i.situacao,
        i.decisao ? (i.decisao === 'aceitar' ? 'Aceito' : 'Contestado') + (i.decisao_obs ? ': ' + i.decisao_obs : '') : i.situacao === 'fora_planilha' ? 'Próximo fechamento' : '-']; }),
    { didParseCell: c => { if (c.section !== 'body' || c.column.index !== 12) return; const s = its[c.row.index]?.situacao; c.cell.styles.fontStyle = 'bold'; c.cell.styles.textColor = s === 'ok' ? C.verde : s === 'fora_planilha' ? C.cinza : C.verm; } });
  const difs = its.flatMap(i => (i.divergencias || []).map(x => [V[i.viagem_id]?.numero || '-', txt(x.rotulo), txt(vfFmt(x.campo, x.sistema)).replace(/&[a-z#0-9]+;/g, ''), txt(vfFmt(x.campo, x.cliente)).replace(/&[a-z#0-9]+;/g, ''), x.auto ? 'Ajustado automaticamente' : i.decisao === 'aceitar' ? 'Aceito o dado do cliente' : i.decisao === 'contestar' ? 'Contestado' : 'Pendente']));
  if (difs.length) { titulo('Diferenças encontradas'); tabela(['Viagem', 'Campo', 'No sistema', 'Pelo cliente', 'Tratamento'], difs); }
  titulo('Responsáveis');
  const h1 = S.ult('Conferência fechada'), h2 = S.ult('Validado');
  tabela(['Etapa', 'Responsável', 'Data'], [['Conferência (operação)', h1?.nome || '-', h1 ? dataHoraBR(h1.em) : '-'], ['Validação (financeiro)', h2?.nome || '-', h2 ? dataHoraBR(h2.em) : '-']]);
  paginarTimbrado(doc, true);
  doc.save(`Conferência viagens ${f.periodo_ini} a ${f.periodo_fim}.pdf`);
}
