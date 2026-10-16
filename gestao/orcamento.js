// Verbo Gestão — Orçamento e Contratos: Orçado × Realizado
// Orçado por conta do plano e mês; realizado puxado do sistema (contas a pagar/receber, folha, compras,
// manutenção, combustível, reembolsos), em regime de competência; comprometido = o que ainda vai virar despesa.
'use strict';

const veOrc = () => tem('administrador', 'diretoria', 'financeiro', 'aprovador');
const editaOrc = () => tem('administrador', 'diretoria', 'financeiro');
const MESES_ABR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_NOME = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const ESCOPO_ORC = { empresa: 'Empresa (todas as contas)', operacao: 'Operação (receitas e custos da frota)' };
const ST_ORC = { rascunho: ['Em elaboração', 'amarelo'], aprovado: ['Aprovado', 'verde'], encerrado: ['Encerrado', ''] };
const TIPOS_ESCOPO = { operacao: ['receita', 'deducao', 'custo'], empresa: ['receita', 'deducao', 'custo', 'despesa', 'financeiro', 'investimento'] };
const tagOrc = s => `<span class="tag ${ST_ORC[s]?.[1] || ''}">${ST_ORC[s]?.[0] || s}</span>`;
const brl0 = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const pct = (a, b) => b ? Math.round(a / b * 1000) / 10 : null;
const ehReceita = t => t === 'receita';
const fmtNumBR = v => v ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

// contas de lançamento do escopo + grupos (pais)
async function contasOrc(escopo) {
  const cs = (await contas()).filter(c => c.ativo !== false && !c.codigo.startsWith('8'));
  const tipos = TIPOS_ESCOPO[escopo] || TIPOS_ESCOPO.empresa;
  const folhas = cs.filter(c => c.aceita_lancamento && tipos.includes(c.tipo));
  const grupos = cs.filter(c => !c.aceita_lancamento && folhas.some(f => f.codigo.startsWith(c.codigo + '.')));
  return { folhas, grupos, todas: cs };
}
const grupoDe = (c, grupos) => grupos.filter(g => c.codigo.startsWith(g.codigo + '.')).sort((a, b) => b.codigo.length - a.codigo.length)[0];

// ===================== Lista =====================
rota('/orcamento', async tela => {
  if (!veOrc()) { tela.innerHTML = '<div class="cartao vazio">Sem acesso ao orçamento.</div>'; return; }
  const os = await api.listar('orcamentos', 'ativo=eq.true&select=*,cc:centros_custo(nome)&order=ano.desc,nome');
  const resumos = await Promise.all(os.map(o => api.rpc('orcamento_comparativo', { p_id: o.id }).catch(() => null)));
  const cs = porId(await contas());
  const mesAtual = new Date().getMonth() + 1, anoAtual = new Date().getFullYear();
  tela.innerHTML = `
    <div class="topo"><div><h1>Orçado × Realizado</h1><p class="sub">Orçamentos da empresa e da operação comparados com o que de fato aconteceu</p></div>
      ${editaOrc() ? '<a class="btn prim" href="#/orcamento/novo">+ Novo orçamento</a>' : ''}</div>
    <div class="cartao orc-ajuda"><b>Como funciona:</b> você define quanto espera gastar e faturar por conta do plano de contas, mês a mês.
      O <b>realizado</b> vem sozinho do sistema (contas a pagar e a receber — folha, manutenção, compras, combustível, aluguel, faturamento — e reembolsos aprovados),
      pela <b>competência</b> (mês a que a despesa se refere). O <b>comprometido</b> é o que já está contratado e ainda vai virar despesa: contas previstas, pedidos de compra sem nota e reembolsos aguardando aprovação.</div>
    ${os.length ? `<div class="grade orc-cards">${os.map((o, i) => { const r = resumos[i]; let orc = 0, rea = 0, orcR = 0, reaR = 0;
      if (r) for (const l of r.linhas) { const c = cs[l.conta_id]; if (!c) continue; const ate = o.ano < anoAtual ? 12 : o.ano > anoAtual ? 0 : mesAtual;
        if (l.mes > ate) continue; if (ehReceita(c.tipo)) { orcR += +l.orcado; reaR += +l.realizado; } else if (c.tipo !== 'investimento') { orc += +l.orcado; rea += +l.realizado; } }
      const p = pct(rea, orc);
      return `<a class="cartao orc-card" href="#/orcamento/ver/${o.id}"><div class="lado" style="justify-content:space-between"><b>${esc(o.nome)}</b>${tagOrc(o.status)}</div>
        <div class="muted">${o.ano} · ${esc(ESCOPO_ORC[o.escopo])}${o.cc ? ' · ' + esc(o.cc.nome) : ''}</div>
        <div class="orc-mini"><span>Custos e despesas até ${o.ano === anoAtual ? MESES_ABR[mesAtual - 1] : 'dez'}</span><b>${brl0(rea)} <span class="muted">de ${brl0(orc)}</span></b>
          <div class="orc-barra"><i style="width:${Math.min(p || 0, 100)}%" class="${p > 100 ? 'estouro' : p >= (r?.alerta || 90) ? 'alerta' : ''}"></i></div></div>
        ${orcR || reaR ? `<div class="orc-mini"><span>Faturamento</span><b>${brl0(reaR)} <span class="muted">de ${brl0(orcR)}</span></b></div>` : ''}</a>`; }).join('')}</div>`
      : `<div class="cartao vazio">Nenhum orçamento ainda.${editaOrc() ? ' Comece criando o da <b>Empresa</b> e o da <b>Operação</b>.' : ''}</div>`}`;
});

// ===================== Criar / editar =====================
rota('/orcamento/novo', tela => formOrcamento(tela, null));
rota('/orcamento/editar/:id', (tela, id) => formOrcamento(tela, id));

async function formOrcamento(tela, id) {
  if (!editaOrc()) { tela.innerHTML = '<div class="cartao vazio">Sem permissão.</div>'; return; }
  const o = id ? await api.um('orcamentos', `id=eq.${id}&select=*`) : { nome: '', ano: new Date().getFullYear(), escopo: 'empresa', centro_custo_id: null, observacoes: '' };
  if (!o) { tela.innerHTML = '<div class="cartao vazio">Orçamento não encontrado.</div>'; return; }
  const [linhas, ccs, outros] = await Promise.all([id ? api.listar('orcamento_linhas', `orcamento_id=eq.${id}&select=conta_id,mes,valor`) : [], centros(),
    api.listar('orcamentos', `ativo=eq.true&select=id,nome,ano${id ? '&id=neq.' + id : ''}&order=ano.desc`)]);
  const val = {}; for (const l of linhas) val[l.conta_id + ':' + l.mes] = Number(l.valor);
  let escopo = o.escopo;
  tela.innerHTML = `
    <div class="topo"><div><h1>${id ? 'Editar orçamento' : 'Novo orçamento'}</h1><p class="sub">Valores por conta do plano de contas, mês a mês</p></div>
      <div class="acoes"><a class="btn" href="${id ? '#/orcamento/ver/' + id : '#/orcamento'}">Cancelar</a></div></div>
    <form id="f-orc">
    <div class="cartao"><div class="form">
      <label class="campo">Nome<input name="nome" value="${esc(o.nome)}" required placeholder="Ex.: Orçamento Empresa 2027"></label>
      <label class="campo">Ano<input name="ano" type="number" min="2020" max="2100" value="${o.ano}" required></label>
      <label class="campo">Orçamento de<select name="escopo">${Object.entries(ESCOPO_ORC).map(([k, t]) => `<option value="${k}" ${k === o.escopo ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo">Centro de custo<select name="cc"><option value="">Todos (empresa inteira)</option>${ccs.filter(c => c.ativo !== false).map(c => `<option value="${c.id}" ${c.id === o.centro_custo_id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></label>
      <label class="campo largo">Observações<input name="obs" value="${esc(o.observacoes || '')}" placeholder="Premissas: nº de motoristas, km/mês, reajustes…"></label>
    </div></div>
    <div class="cartao"><div class="topo" style="margin:0 0 8px"><div><h2 style="margin:0">Valores orçados (R$)</h2>
      <p class="muted" style="margin:2px 0 0">Digite mês a mês, ou o <b>total do ano</b> para dividir igualmente. Dá para <b>colar direto do Excel</b> (Ctrl+V numa célula preenche para a direita e para baixo).</p></div>
      <div class="acoes">${outros.length ? `<select id="copiar-de"><option value="">Copiar valores de…</option>${outros.map(x => `<option value="${x.id}">${esc(x.nome)} (${x.ano})</option>`).join('')}</select>` : ''}
        <button type="button" class="btn peq" id="limpar">Zerar tudo</button></div></div>
      <div class="tabela-wrap orc-grade-wrap"><table class="orc-grade" id="grade"></table></div></div>
    <div class="acoes" style="margin:12px 0 30px"><button class="btn prim">Salvar orçamento</button></div></form>`;
  const f = $('#f-orc'), grade = $('#grade');
  const desenhar = async () => {
    const { folhas, grupos } = await contasOrc(escopo);
    const linhaTot = (rot, ids, cls) => `<tr class="${cls}"><td>${rot}</td>${MESES_ABR.map((_, m) => `<td class="num" data-tot-mes="${m + 1}" data-ids="${ids.join(',')}"></td>`).join('')}<td class="num" data-tot-ano data-ids="${ids.join(',')}"></td></tr>`;
    let html = `<thead><tr><th>Conta</th>${MESES_ABR.map(m => `<th class="num">${m}</th>`).join('')}<th class="num">Total do ano</th></tr></thead><tbody>`;
    for (const g of grupos.filter(g => !grupos.some(x => g.codigo.startsWith(x.codigo + '.')))) {
      const fs = folhas.filter(c => c.codigo.startsWith(g.codigo + '.'));
      html += `<tr class="orc-grupo"><td colspan="14"><b>${esc(g.codigo + ' ' + g.nome)}</b></td></tr>`;
      for (const c of fs) html += `<tr data-conta="${c.id}"><td class="orc-conta">${esc(c.codigo + ' ' + c.nome)}</td>${MESES_ABR.map((_, m) => `<td><input class="orc-v" data-c="${c.id}" data-m="${m + 1}" inputmode="decimal" value="${fmtNumBR(val[c.id + ':' + (m + 1)])}" aria-label="${esc(c.nome)} ${MESES_NOME[m]}"></td>`).join('')}
        <td><input class="orc-ano" data-c="${c.id}" inputmode="decimal" placeholder="total" aria-label="Total do ano ${esc(c.nome)}"></td></tr>`;
      html += linhaTot('Total ' + esc(g.nome), fs.map(c => c.id), 'orc-sub');
    }
    grade.innerHTML = html + '</tbody>';
    recalc();
  };
  const recalc = () => {
    for (const k of Object.keys(val)) if (!val[k]) delete val[k];
    $$('.orc-ano', grade).forEach(el => { if (document.activeElement !== el) { const t = MESES_ABR.reduce((s, _, m) => s + (val[el.dataset.c + ':' + (m + 1)] || 0), 0); el.value = fmtNumBR(t); } });
    $$('[data-tot-mes]', grade).forEach(td => { const ids = td.dataset.ids.split(','); td.textContent = brl0(ids.reduce((s, c) => s + (val[c + ':' + td.dataset.totMes] || 0), 0)); });
    $$('[data-tot-ano]', grade).forEach(td => { const ids = td.dataset.ids.split(','); let t = 0; for (const c of ids) for (let m = 1; m <= 12; m++) t += val[c + ':' + m] || 0; td.textContent = brl0(t); });
  };
  grade.addEventListener('change', e => {
    const el = e.target;
    if (el.classList.contains('orc-v')) { val[el.dataset.c + ':' + el.dataset.m] = num(el.value) || 0; el.value = fmtNumBR(val[el.dataset.c + ':' + el.dataset.m]); recalc(); }
    if (el.classList.contains('orc-ano')) {
      const t = num(el.value) || 0, base = Math.floor(t / 12 * 100) / 100;
      for (let m = 1; m <= 12; m++) { const v = m === 12 ? Math.round((t - base * 11) * 100) / 100 : base; val[el.dataset.c + ':' + m] = v;
        const inp = grade.querySelector(`.orc-v[data-c="${el.dataset.c}"][data-m="${m}"]`); if (inp) inp.value = fmtNumBR(v); }
      el.blur(); recalc();
    }
  });
  // colar do Excel: preenche a partir da célula para a direita e para baixo
  grade.addEventListener('paste', e => {
    const el = e.target; if (!el.classList.contains('orc-v')) return;
    const txt = (e.clipboardData || window.clipboardData).getData('text'); if (!/[\t\n]/.test(txt.trim())) return;
    e.preventDefault();
    const linhasTxt = txt.replace(/\r/g, '').split('\n').filter((l, i, a) => l !== '' || i < a.length - 1);
    const trs = $$('tr[data-conta]', grade); let ri = trs.indexOf(el.closest('tr')); const m0 = Number(el.dataset.m);
    for (const lt of linhasTxt) { const tr = trs[ri++]; if (!tr) break;
      lt.split('\t').forEach((cel, j) => { const m = m0 + j; if (m > 12) return; const inp = tr.querySelector(`.orc-v[data-m="${m}"]`); const v = num(cel.trim()) || 0; val[tr.dataset.conta + ':' + m] = v; inp.value = fmtNumBR(v); }); }
    recalc(); aviso('Valores colados.');
  });
  // Enter desce para a próxima linha
  grade.addEventListener('keydown', e => { if (e.key !== 'Enter' || !e.target.classList.contains('orc-v')) return; e.preventDefault(); e.target.dispatchEvent(new Event('change', { bubbles: true }));
    const trs = $$('tr[data-conta]', grade), i = trs.indexOf(e.target.closest('tr')); trs[i + 1]?.querySelector(`.orc-v[data-m="${e.target.dataset.m}"]`)?.focus(); });
  f.escopo.onchange = async () => { escopo = f.escopo.value; await desenhar(); };
  $('#limpar').onclick = async () => { if (!await confirmar('Zerar todos os valores deste orçamento?')) return; for (const k of Object.keys(val)) delete val[k]; await desenhar(); };
  $('#copiar-de')?.addEventListener('change', async e => {
    if (!e.target.value) return;
    const ls = await api.listar('orcamento_linhas', `orcamento_id=eq.${e.target.value}&select=conta_id,mes,valor`);
    const pctAj = num(prompt('Aplicar reajuste sobre os valores copiados? Informe o % (0 para copiar igual):', '0')) || 0;
    for (const l of ls) val[l.conta_id + ':' + l.mes] = Math.round(Number(l.valor) * (1 + pctAj / 100) * 100) / 100;
    e.target.value = ''; await desenhar(); aviso(`${ls.length} valor(es) copiados${pctAj ? ` com reajuste de ${pctAj}%` : ''}.`);
  });
  f.onsubmit = async e => {
    e.preventDefault(); const d = formDados(f);
    $$('.orc-v', grade).forEach(el => { val[el.dataset.c + ':' + el.dataset.m] = num(el.value) || 0; });
    const { folhas } = await contasOrc(escopo);
    const ls = [];
    for (const c of folhas) for (let m = 1; m <= 12; m++) ls.push({ conta_id: c.id, mes: m, valor: val[c.id + ':' + m] || 0 });
    if (!ls.some(x => x.valor)) return aviso('Preencha pelo menos um valor.', true);
    await ocupado(e.submitter, async () => { try {
      const nid = await api.rpc('orcamento_salvar', { p_id: id, p_nome: d.nome, p_ano: Number(d.ano), p_escopo: d.escopo, p_cc: d.cc || null, p_obs: d.obs || null, p_linhas: ls });
      aviso('Orçamento salvo.'); location.hash = '#/orcamento/ver/' + nid;
    } catch (err) { falha(err); } });
  };
  await desenhar();
}

// ===================== Comparativo =====================
rota('/orcamento/ver/:id', async (tela, id) => {
  if (!veOrc()) { tela.innerHTML = '<div class="cartao vazio">Sem acesso ao orçamento.</div>'; return; }
  let d;
  try { d = await api.rpc('orcamento_comparativo', { p_id: id }); } catch (err) { tela.innerHTML = `<div class="cartao vazio">${esc(err.message)}</div>`; return; }
  const o = d.orcamento, alerta = Number(d.alerta) || 90;
  const { folhas, grupos } = await contasOrc(o.escopo);
  const cc = o.centro_custo_id ? (await centros()).find(c => c.id === o.centro_custo_id) : null;
  const hoje = new Date(), anoAtual = hoje.getFullYear(), mesAtual = hoje.getMonth() + 1;
  const pIni = Number(estado.params.get('de')) || 1;
  const pFim = Number(estado.params.get('ate')) || (o.ano === anoAtual ? mesAtual : 12);
  const soMes = estado.params.get('mes');
  const [mi, mf] = soMes ? [Number(soMes), Number(soMes)] : [pIni, pFim];
  // soma por conta no período e por mês
  const porConta = {}, porMes = Array.from({ length: 12 }, () => ({ oR: 0, rR: 0, oD: 0, rD: 0 }));
  const tipoDe = porId(folhas);
  for (const l of d.linhas) {
    const c = tipoDe[l.conta_id]; if (!c) continue;
    const pm = porMes[l.mes - 1];
    if (ehReceita(c.tipo)) { pm.oR += +l.orcado; pm.rR += +l.realizado; } else if (c.tipo !== 'investimento') { pm.oD += +l.orcado; pm.rD += +l.realizado; }
    if (l.mes < mi || l.mes > mf) continue;
    const x = porConta[l.conta_id] ||= { o: 0, r: 0, c: 0 }; x.o += +l.orcado; x.r += +l.realizado; x.c += +l.comprometido;
  }
  const tot = { rec: { o: 0, r: 0 }, ded: { o: 0, r: 0 }, desp: { o: 0, r: 0, c: 0 }, inv: { o: 0, r: 0 } };
  for (const c of folhas) { const x = porConta[c.id]; if (!x) continue;
    const k = c.tipo === 'receita' ? 'rec' : c.tipo === 'deducao' ? 'ded' : c.tipo === 'investimento' ? 'inv' : 'desp';
    tot[k].o += x.o; tot[k].r += x.r; if (k === 'desp') tot.desp.c += x.c; }
  const resO = tot.rec.o - tot.ded.o - tot.desp.o, resR = tot.rec.r - tot.ded.r - tot.desp.r;
  const situ = (c, x) => { if (!x.o && !x.r) return ''; if (!x.o) return '<span class="tag vermelho">sem orçamento</span>';
    const p = pct(x.r, x.o);
    if (ehReceita(c.tipo)) return p >= 100 ? '<span class="tag verde">meta atingida</span>' : p >= alerta ? '<span class="tag amarelo">perto da meta</span>' : '<span class="tag vermelho">abaixo da meta</span>';
    return p > 100 ? '<span class="tag vermelho">estourou</span>' : p >= alerta ? '<span class="tag amarelo">atenção</span>' : '<span class="tag verde">dentro</span>'; };
  const barra = (c, x) => { const p = pct(x.r, x.o); if (p == null) return '';
    const ruim = ehReceita(c.tipo) ? p < alerta : p > 100, atencao = !ruim && (ehReceita(c.tipo) ? p < 100 : p >= alerta);
    return `<div class="orc-bw"><div class="orc-barra" title="${p}%"><i style="width:${Math.min(p, 100)}%" class="${ruim ? 'estouro' : atencao ? 'alerta' : ''}"></i></div><span class="orc-pct">${p.toLocaleString('pt-BR')}%</span></div>`; };
  // diferença = realizado − orçado: em receita, positivo é bom; em custo/despesa, positivo é estouro
  const difCls = (c, dif) => Math.abs(dif) < 0.005 ? '' : (ehReceita(c.tipo) ? dif > 0 : dif < 0) ? 'pos' : 'neg';
  const linha = (c, x) => { const dif = x.r - x.o; return `<tr class="clicavel" data-conta="${c.id}"><td class="orc-conta">${esc(c.codigo + ' ' + c.nome)}</td>
    <td class="num">${brl(x.o)}</td><td class="num"><b>${brl(x.r)}</b></td><td class="num orc-dif ${difCls(c, dif)}">${brl(dif)}</td>
    <td class="orc-col-barra">${barra(c, x)}</td><td class="num">${x.c ? brl(x.c) : '—'}</td><td>${situ(c, x)}</td></tr>`; };
  let corpo = '';
  for (const g of grupos.filter(g => !grupos.some(x => g.codigo.startsWith(x.codigo + '.')))) {
    const fs = folhas.filter(c => c.codigo.startsWith(g.codigo + '.'));
    const sub = fs.reduce((s, c) => { const x = porConta[c.id] || { o: 0, r: 0, c: 0 }; s.o += x.o; s.r += x.r; s.c += x.c; return s; }, { o: 0, r: 0, c: 0 });
    if (!sub.o && !sub.r && !sub.c && !estado.params.get('todas')) continue;
    corpo += `<tr class="orc-grupo"><td><b>${esc(g.codigo + ' ' + g.nome)}</b></td><td class="num"><b>${brl(sub.o)}</b></td><td class="num"><b>${brl(sub.r)}</b></td>
      <td class="num orc-dif ${difCls(fs[0] || {}, sub.r - sub.o)}"><b>${brl(sub.r - sub.o)}</b></td><td class="orc-col-barra">${barra(fs[0] || {}, sub)}</td><td class="num">${sub.c ? brl(sub.c) : '—'}</td><td></td></tr>`;
    corpo += fs.filter(c => porConta[c.id] && (porConta[c.id].o || porConta[c.id].r || porConta[c.id].c) || estado.params.get('todas')).map(c => linha(c, porConta[c.id] || { o: 0, r: 0, c: 0 })).join('');
  }
  const periodoTxt = soMes ? `${MESES_NOME[mi - 1]} de ${o.ano}` : mi === 1 && mf === 12 ? `Ano de ${o.ano}` : `${MESES_ABR[mi - 1]} a ${MESES_ABR[mf - 1]} de ${o.ano}`;
  const maxMes = Math.max(1, ...porMes.map(m => Math.max(m.oD, m.rD)));
  const temRec = false;
  const kpi = (rot, oo, rr, receita) => { const p = pct(rr, oo); const ruim = receita ? p != null && p < alerta : p != null && p > 100;
    return `<div class="cartao orc-kpi ${ruim ? 'ruim' : ''}"><div class="r">${rot}</div><div class="n">${brl0(rr)}</div><div class="muted">orçado ${brl0(oo)}${p != null ? ` · <b>${p.toLocaleString('pt-BR')}%</b>` : ''}</div></div>`; };
  tela.innerHTML = `
    <div class="topo"><div><h1>${esc(o.nome)}</h1><p class="sub">${tagOrc(o.status)} · ${esc(ESCOPO_ORC[o.escopo])}${cc ? ' · ' + esc(cc.nome) : ''} · <b>${periodoTxt}</b></p></div>
      <div class="acoes">${editaOrc() && o.status !== 'encerrado' ? `<a class="btn" href="#/orcamento/editar/${id}">Editar valores</a>` : ''}
        ${editaOrc() && o.status === 'rascunho' ? '<button class="btn ok" id="aprovar">Aprovar orçamento</button>' : ''}
        ${editaOrc() && o.status === 'aprovado' ? '<button class="btn" id="reabrir">Voltar para elaboração</button><button class="btn" id="encerrar">Encerrar</button>' : ''}
        ${editaOrc() && o.status === 'encerrado' ? '<button class="btn" id="reabrir">Reabrir</button>' : ''}
        ${editaOrc() ? '<button class="btn perigo" id="excluir">Excluir</button>' : ''}
        <a class="btn" href="#/orcamento">Voltar</a></div></div>
    <form class="filtros" id="filtros">
      <select name="tipo" aria-label="Tipo de período"><option value="acum" ${!soMes ? 'selected' : ''}>Período (acumulado)</option><option value="mes" ${soMes ? 'selected' : ''}>Um mês só</option></select>
      <select name="de" aria-label="De" ${soMes ? 'hidden' : ''}>${MESES_NOME.map((m, i) => `<option value="${i + 1}" ${i + 1 === pIni ? 'selected' : ''}>de ${m}</option>`).join('')}</select>
      <select name="ate" aria-label="Até" ${soMes ? 'hidden' : ''}>${MESES_NOME.map((m, i) => `<option value="${i + 1}" ${i + 1 === pFim ? 'selected' : ''}>até ${m}</option>`).join('')}</select>
      <select name="mes" aria-label="Mês" ${soMes ? '' : 'hidden'}>${MESES_NOME.map((m, i) => `<option value="${i + 1}" ${i + 1 === (Number(soMes) || (o.ano === anoAtual ? mesAtual : 1)) ? 'selected' : ''}>${m}</option>`).join('')}</select>
      <label class="check"><input type="checkbox" name="todas" ${estado.params.get('todas') ? 'checked' : ''}> Mostrar contas sem valores</label>
      <button class="btn">Filtrar</button></form>
    <div class="orc-kpis">
      ${tot.rec.o || tot.rec.r ? kpi('Faturamento', tot.rec.o, tot.rec.r, true) : ''}
      ${kpi('Custos e despesas', tot.desp.o + tot.ded.o, tot.desp.r + tot.ded.r, false)}
      ${tot.rec.o || tot.rec.r ? `<div class="cartao orc-kpi ${resR < resO ? 'ruim' : ''}"><div class="r">Resultado (faturamento − custos e despesas)</div><div class="n">${brl0(resR)}</div><div class="muted">orçado ${brl0(resO)}</div></div>` : ''}
      ${tot.desp.c ? `<div class="cartao orc-kpi"><div class="r">Comprometido (ainda vai virar despesa)</div><div class="n">${brl0(tot.desp.c)}</div><div class="muted">contas previstas, pedidos sem nota, reembolsos em aprovação</div></div>` : ''}
      ${tot.inv.o || tot.inv.r ? kpi('Investimentos', tot.inv.o, tot.inv.r, false) : ''}
    </div>
    ${d.sem_conta?.qtd ? `<div class="cartao alerta-obs">⚠️ <b>${d.sem_conta.qtd} lançamento(s) de ${o.ano} sem conta do plano</b> (${brl(d.sem_conta.valor)}) não entram no comparativo. <a href="#" id="ver-sem-conta">Ver quais são</a> e classifique cada um na conta certa.</div>` : ''}
    <div class="cartao"><h2>Custos e despesas mês a mês</h2>
      <div class="orc-graf">${porMes.map((m, i) => `<div class="orc-gm ${i + 1 >= mi && i + 1 <= mf ? 'sel' : ''}" title="${MESES_NOME[i]}: custos e despesas ${brl(m.rD)} de ${brl(m.oD)}${temRec ? ` · faturamento ${brl(m.rR)} de ${brl(m.oR)}` : ''}">
        <div class="orc-gb">${temRec ? `<i class="o rec" style="height:${m.oR / maxMes * 100}%"></i><i class="r rec" style="height:${m.rR / maxMes * 100}%"></i>` : ''}
          <i class="o" style="height:${m.oD / maxMes * 100}%"></i><i class="r ${m.rD > m.oD && m.oD ? 'estouro' : ''}" style="height:${m.rD / maxMes * 100}%"></i></div><span>${MESES_ABR[i]}</span></div>`).join('')}</div>
      <div class="orc-leg">${temRec ? '<span><i class="o rec"></i>Faturamento orçado</span><span><i class="r rec"></i>Faturamento realizado</span>' : ''}<span><i class="o"></i>Custos e despesas orçados</span><span><i class="r"></i>Custos e despesas realizados</span><span><i class="r estouro"></i>Acima do orçado</span></div></div>
    <div class="cartao"><h2>Por conta — ${periodoTxt}</h2><p class="muted" style="margin-top:-4px">Toque numa conta para ver mês a mês e os lançamentos que formam o realizado.</p>
      <div class="tabela-wrap"><table class="orc-comp"><thead><tr><th>Conta</th><th class="num">Orçado</th><th class="num">Realizado</th><th class="num" title="Realizado menos orçado">Diferença (real − orçado)</th><th>% do orçado</th><th class="num">Comprometido</th><th>Situação</th></tr></thead>
      <tbody>${corpo || '<tr><td colspan="7" class="vazio">Sem valores no período.</td></tr>'}</tbody>
      <tfoot>${tot.rec.o || tot.rec.r ? `<tr><td><b>Resultado</b></td><td class="num"><b>${brl(resO)}</b></td><td class="num"><b>${brl(resR)}</b></td><td class="num orc-dif ${resR >= resO ? 'pos' : 'neg'}"><b>${brl(resR - resO)}</b></td><td colspan="3"></td></tr>` : ''}</tfoot></table></div></div>
    ${o.observacoes ? `<div class="cartao"><div class="muted">Premissas / observações</div>${esc(o.observacoes)}</div>` : ''}`;

  const f = $('#filtros');
  f.tipo.onchange = () => { f.de.hidden = f.ate.hidden = f.tipo.value === 'mes'; f.mes.hidden = f.tipo.value !== 'mes'; };
  f.onsubmit = e => { e.preventDefault(); const x = formDados(f);
    const q = x.tipo === 'mes' ? `mes=${x.mes}` : `de=${Math.min(x.de, x.ate)}&ate=${Math.max(x.de, x.ate)}`;
    location.hash = `#/orcamento/ver/${id}?${q}${x.todas ? '&todas=1' : ''}`; };
  const acao = (sel, st, msg) => $(sel)?.addEventListener('click', async () => { if (!await confirmar(msg)) return; try { await api.rpc('orcamento_situacao', { p_id: id, p_status: st }); aviso('Pronto.'); navegar(); } catch (err) { falha(err); } });
  acao('#aprovar', 'aprovado', 'Aprovar este orçamento? Ele passa a valer para os alertas de estouro.');
  acao('#reabrir', 'rascunho', 'Voltar o orçamento para elaboração?');
  acao('#encerrar', 'encerrado', 'Encerrar este orçamento? Ele fica só para consulta.');
  $('#excluir')?.addEventListener('click', async () => { if (!await confirmar(`Excluir o orçamento "${o.nome}"? Os lançamentos do sistema não são afetados.`, { botao: 'Excluir' })) return;
    try { await api.rpc('orcamento_excluir', { p_id: id }); aviso('Orçamento excluído.'); location.hash = '#/orcamento'; } catch (err) { falha(err); } });
  $('#ver-sem-conta')?.addEventListener('click', e => { e.preventDefault(); detalheConta(o, null, 'Lançamentos sem conta do plano', 1, 12, d); });
  $$('tr[data-conta]', tela).forEach(tr => tr.onclick = () => { const c = tipoDe[tr.dataset.conta]; detalheConta(o, c, c.codigo + ' ' + c.nome, mi, mf, d); });
});

async function detalheConta(o, c, titulo, mi, mf, d) {
  let itens = [];
  try { itens = await api.rpc('orcamento_detalhe', { p_id: o.id, p_conta: c?.id || null, p_mes_ini: mi, p_mes_fim: mf }); } catch (err) { return falha(err); }
  const mesas = c ? Array.from({ length: 12 }, (_, i) => { const ls = d.linhas.filter(l => l.conta_id === c.id && l.mes === i + 1);
    return { o: ls.reduce((s, l) => s + +l.orcado, 0), r: ls.reduce((s, l) => s + +l.realizado, 0), c: ls.reduce((s, l) => s + +l.comprometido, 0) }; }) : [];
  const link = x => x.origem === 'reembolso' ? `#/reembolsos/ver/${x.ref_id}` : x.origem === 'pedido' ? `#/compras/pedidos/ver/${x.ref_id}`
    : x.origem === 'titulo_receber' ? `#/financeiro/receber/ver/${x.ref_id}` : `#/financeiro/pagar/ver/${x.ref_id}`;
  const ORIG = { titulo_pagar: 'Conta a pagar', titulo_receber: 'Conta a receber', reembolso: 'Despesa de colaborador', pedido: 'Pedido de compra (sem nota)' };
  await modal(`<div><h2>${esc(titulo)}</h2>
    ${c ? `<div class="tabela-wrap"><table class="orc-meses"><thead><tr><th></th>${MESES_ABR.map(m => `<th class="num">${m}</th>`).join('')}<th class="num">Ano</th></tr></thead><tbody>
      ${[['Orçado', 'o'], ['Realizado', 'r'], ['Comprometido', 'c']].map(([rot, k]) => `<tr><td><b>${rot}</b></td>${mesas.map(m => `<td class="num">${m[k] ? brl0(m[k]) : '—'}</td>`).join('')}<td class="num"><b>${brl0(mesas.reduce((s, m) => s + m[k], 0))}</b></td></tr>`).join('')}
      <tr><td><b>Real − orçado</b></td>${mesas.map(m => { const df = m.r - m.o; const bom = ehReceita(c.tipo) ? df > 0 : df < 0; return `<td class="num orc-dif ${!df ? '' : bom ? 'pos' : 'neg'}">${m.o || m.r ? brl0(df) : '—'}</td>`; }).join('')}<td></td></tr>
    </tbody></table></div>` : ''}
    <h3 style="margin:14px 0 6px">Lançamentos ${mi === mf ? 'de ' + MESES_NOME[mi - 1] : mi === 1 && mf === 12 ? 'do ano' : `de ${MESES_ABR[mi - 1]} a ${MESES_ABR[mf - 1]}`} (${itens.length})</h3>
    ${itens.length ? `<div class="tabela-wrap" style="max-height:45vh;overflow:auto"><table><thead><tr><th>Data</th><th>Tipo</th><th>Documento</th><th>Descrição</th><th class="num">Valor</th><th></th></tr></thead><tbody>
      ${itens.map(x => `<tr><td class="nowrap">${dataBR(x.data)}</td><td>${ORIG[x.origem] || x.origem}</td><td><a href="${link(x)}" data-fechar>${esc(x.documento || 'abrir')}</a></td>
        <td>${esc(x.descricao || '')}</td><td class="num">${brl(x.valor)}</td><td>${x.natureza === 'comprometido' ? '<span class="tag amarelo">comprometido</span>' : ''}</td></tr>`).join('')}</tbody></table></div>`
      : '<div class="vazio">Nenhum lançamento nesse período.</div>'}
    <div class="rodape"><button type="button" class="btn" data-fechar>Fechar</button></div></div>`, { aoAbrir: raiz => $('.modal', raiz).classList.add('modal-largo') });
}
