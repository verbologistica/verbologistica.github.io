// Verbo Gestão — Painéis gerenciais (Financeiro e Compras): indicadores, gráficos mês a mês e alertas
'use strict';

// ---------- formatação ----------
const PN_MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const pnMes = iso => { const [a, m] = String(iso).split('-'); return PN_MES[Number(m) - 1] + '/' + a.slice(2); };
const pnDia = iso => { const [, m, d] = String(iso).split('-'); return d + '/' + m; };
const pnK = v => { const n = Number(v) || 0, a = Math.abs(n);
  return a >= 1e6 ? (n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi' : a >= 1e3 ? (n / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: a >= 1e5 ? 0 : 1 }) + ' mil' : n.toLocaleString('pt-BR', { maximumFractionDigits: 0 }); };
const pnBRLk = v => 'R$ ' + pnK(v);
const pnInt = v => (Number(v) || 0).toLocaleString('pt-BR');
// cores: séries comparadas (azul, laranja, verde-água) · série única na cor da marca · status reservados para alerta
const PN_COR = { s1: '#2a78d6', s2: '#eb6834', s3: '#1baf7a', marca: '#02654D', bom: '#0ca30c', atencao: '#fab219', serio: '#ec835a', critico: '#d03b3b', grade: '#e6eae8', eixo: '#c9d1cd', tinta2: '#52514e', mudo: '#7d8580' };

// ---------- tooltip único ----------
function pnTip() {
  let t = document.getElementById('pn-tip');
  if (!t) { t = document.createElement('div'); t.id = 'pn-tip'; t.className = 'pn-tip'; t.hidden = true; document.body.appendChild(t); }
  return t;
}
function pnLigarTips(raiz) {
  const t = pnTip();
  raiz.addEventListener('mousemove', e => {
    const alvo = e.target.closest('[data-tip]');
    if (!alvo || !raiz.contains(alvo)) { t.hidden = true; return; }
    t.innerHTML = alvo.getAttribute('data-tip'); t.hidden = false;
    const w = t.offsetWidth, h = t.offsetHeight; let x = e.clientX + 14, y = e.clientY - h - 10;
    if (x + w > innerWidth - 8) x = e.clientX - w - 14; if (y < 8) y = e.clientY + 16;
    t.style.left = x + 'px'; t.style.top = y + 'px';
    raiz.querySelectorAll('.pn-hov').forEach(el => el.classList.remove('pn-hov'));
    if (alvo.dataset.grupo) raiz.querySelectorAll(`[data-g="${alvo.dataset.grupo}"]`).forEach(el => el.classList.add('pn-hov'));
  });
  raiz.addEventListener('mouseleave', () => { t.hidden = true; raiz.querySelectorAll('.pn-hov').forEach(el => el.classList.remove('pn-hov')); });
}
const tipHtml = (tit, linhas) => esc(`<b>${esc(tit)}</b>` + linhas.map(([cor, rot, v]) => `<div class="pn-tl">${cor ? `<i style="background:${cor}"></i>` : ''}<span>${esc(rot)}</span><b>${esc(v)}</b></div>`).join(''));

// escala "redonda" para o eixo
function pnEscala(max, n = 4) {
  if (!(max > 0)) return { top: 1, passo: 1, ticks: [0, 1] };
  const bruto = max / n, p = Math.pow(10, Math.floor(Math.log10(bruto))), f = bruto / p;
  const passo = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  const top = Math.ceil(max / passo) * passo; const ticks = []; for (let v = 0; v <= top + passo / 2; v += passo) ticks.push(v);
  return { top, passo, ticks };
}
// barra com ponta arredondada (4px) e base reta
const pnBarra = (x, y, w, h, cor, extra = '') => {
  if (h <= 0) return '';
  const r = Math.min(4, w / 2, h);
  return `<path d="M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z" fill="${cor}" ${extra}/>`;
};

// ---------- colunas agrupadas por período ----------
// cats: rótulos do eixo · series: [{nome, cor, vals}] · fmt: valor no tooltip · cores por categoria (cats) quando ordinal
function pnColunas(W, { cats, series, fmt = brl, fmtEixo = pnBRLk, alt = 220, rotular = 'ultimo', coresCat = null }) {
  const H = alt, mL = 52, mR = 8, mT = 18, mB = 26, pw = Math.max(80, W - mL - mR), ph = H - mT - mB;
  const max = Math.max(0, ...series.flatMap(s => s.vals.map(v => Number(v) || 0)));
  const esc_ = pnEscala(max); const yv = v => mT + ph - (Math.max(0, v) / esc_.top) * ph;
  const banda = pw / cats.length, ns = series.length, gap = 2;
  const bw = Math.min(24, (banda * 0.7 - gap * (ns - 1)) / ns), grupoW = bw * ns + gap * (ns - 1);
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" class="pn-svg">`;
  esc_.ticks.forEach(t => { const y = yv(t); s += `<line x1="${mL}" x2="${W - mR}" y1="${y}" y2="${y}" stroke="${t === 0 ? PN_COR.eixo : PN_COR.grade}" stroke-width="1"/><text x="${mL - 6}" y="${y + 4}" text-anchor="end" class="pn-ax">${fmtEixo(t)}</text>`; });
  const passoRot = Math.ceil(cats.length / Math.max(1, Math.floor(pw / 46)));
  cats.forEach((c, i) => {
    const x0 = mL + banda * i + (banda - grupoW) / 2;
    series.forEach((se, k) => { const v = Number(se.vals[i]) || 0, y = yv(v);
      s += pnBarra(x0 + k * (bw + gap), y, bw, mT + ph - y, coresCat ? coresCat[i] : se.cor, `data-g="c${i}"`); });
    if (i % passoRot === 0 || i === cats.length - 1) s += `<text x="${mL + banda * i + banda / 2}" y="${H - 8}" text-anchor="middle" class="pn-ax">${esc(c)}</text>`;
    // rótulo seletivo: valor no topo da última coluna (ou da maior) de cada série única
    if (ns === 1 && ((rotular === 'ultimo' && i === cats.length - 1) || (rotular === 'todos'))) {
      const v = Number(series[0].vals[i]) || 0; if (v > 0) s += `<text x="${x0 + bw / 2}" y="${yv(v) - 5}" text-anchor="middle" class="pn-val">${fmtEixo(v)}</text>`;
    }
    const tip = tipHtml(c, series.map(se => [coresCat ? coresCat[i] : se.cor, se.nome, fmt(se.vals[i])]));
    s += `<rect x="${mL + banda * i}" y="${mT}" width="${banda}" height="${ph}" fill="transparent" data-tip="${tip}" data-grupo="c${i}"/>`;
  });
  return s + '</svg>';
}

// ---------- linha (uma série, com ponto em cada período e cruz no hover) ----------
function pnLinha(W, { cats, vals, nome, cor = PN_COR.s1, fmt = v => v, fmtEixo = pnK, alt = 200 }) {
  const H = alt, mL = 44, mR = 14, mT = 18, mB = 26, pw = Math.max(80, W - mL - mR), ph = H - mT - mB;
  const nums = vals.map(v => v == null ? null : Number(v)); const max = Math.max(0, ...nums.filter(v => v != null));
  const e = pnEscala(max); const yv = v => mT + ph - (v / e.top) * ph; const banda = pw / cats.length; const xv = i => mL + banda * i + banda / 2;
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" class="pn-svg">`;
  e.ticks.forEach(t => { const y = yv(t); s += `<line x1="${mL}" x2="${W - mR}" y1="${y}" y2="${y}" stroke="${t === 0 ? PN_COR.eixo : PN_COR.grade}"/><text x="${mL - 6}" y="${y + 4}" text-anchor="end" class="pn-ax">${fmtEixo(t)}</text>`; });
  let d = '', ultimo = null;
  nums.forEach((v, i) => { if (v == null) return; d += (d ? 'L' : 'M') + xv(i) + ',' + yv(v); ultimo = i; });
  s += `<path d="${d}" fill="none" stroke="${cor}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  const passoRot = Math.ceil(cats.length / Math.max(1, Math.floor(pw / 46)));
  nums.forEach((v, i) => {
    if (i % passoRot === 0 || i === cats.length - 1) s += `<text x="${xv(i)}" y="${H - 8}" text-anchor="middle" class="pn-ax">${esc(cats[i])}</text>`;
    s += `<line x1="${xv(i)}" x2="${xv(i)}" y1="${mT}" y2="${mT + ph}" class="pn-cruz" data-g="l${i}"/>`;
    if (v != null) s += `<circle cx="${xv(i)}" cy="${yv(v)}" r="4" fill="${cor}" stroke="#fff" stroke-width="2"/>`;
    s += `<rect x="${xv(i) - banda / 2}" y="${mT}" width="${banda}" height="${ph}" fill="transparent" data-tip="${tipHtml(cats[i], [[cor, nome, v == null ? '—' : fmt(v)]])}" data-grupo="l${i}"/>`;
  });
  if (ultimo != null) s += `<text x="${Math.min(xv(ultimo), W - mR - 2)}" y="${yv(nums[ultimo]) - 9}" text-anchor="end" class="pn-val">${fmt(nums[ultimo])}</text>`;
  return s + '</svg>';
}

// ---------- barras horizontais (HTML, responsivo) ----------
// itens: [{nome, valor, sub}] · comparar: [{nome, a, b}] com rótulos A/B
function pnBarrasH(itens, { cor = PN_COR.marca, fmt = brl, fmtCurto = pnBRLk, vazio = 'Sem dados no período.' } = {}) {
  if (!itens.length) return `<div class="pn-vazio">${vazio}</div>`;
  const max = Math.max(...itens.map(i => Math.abs(Number(i.valor) || 0)), 1);
  return `<div class="pn-bh">${itens.map(i => { const v = Number(i.valor) || 0, w = Math.max(0.5, 100 * Math.abs(v) / max), c = i.cor || (v < 0 ? PN_COR.critico : cor);
    return `<div class="pn-bh-l" data-tip="${tipHtml(i.nome, [[c, i.rot || 'Valor', fmt(v)], ...(i.sub ? [[null, i.sub, '']] : [])])}"><div class="pn-bh-n" title="${esc(i.nome)}">${esc(i.nome)}${v < 0 ? ' <span class="pn-neg">negativo</span>' : ''}</div>
      <div class="pn-bh-t"><span style="width:${w}%;background:${c}"></span></div><div class="pn-bh-v">${fmtCurto(v)}</div></div>`; }).join('')}</div>`;
}
function pnBarrasComp(itens, { rotA, rotB, fmt = brl, fmtCurto = pnBRLk } = {}) {
  if (!itens.length) return '<div class="pn-vazio">Sem dados no período.</div>';
  const max = Math.max(...itens.flatMap(i => [Number(i.a) || 0, Number(i.b) || 0]), 1);
  return `${pnLegenda([[PN_COR.s1, rotA], [PN_COR.s2, rotB]])}<div class="pn-bh">${itens.map(i => {
    const a = Number(i.a) || 0, b = Number(i.b) || 0, d = b ? (a - b) / b : null;
    return `<div class="pn-bh-l duplo" data-tip="${tipHtml(i.nome, [[PN_COR.s1, rotA, fmt(a)], [PN_COR.s2, rotB, fmt(b)], ...(d != null ? [[null, 'Variação', (d >= 0 ? '+' : '') + Math.round(d * 100) + '%']] : [])])}">
      <div class="pn-bh-n" title="${esc(i.nome)}">${esc(i.nome)}</div>
      <div class="pn-bh-tt"><div class="pn-bh-t"><span style="width:${Math.max(a ? 0.5 : 0, 100 * a / max)}%;background:${PN_COR.s1}"></span></div><div class="pn-bh-t"><span style="width:${Math.max(b ? 0.5 : 0, 100 * b / max)}%;background:${PN_COR.s2}"></span></div></div>
      <div class="pn-bh-v">${fmtCurto(a)}${d != null ? `<small class="${d > 0.05 ? 'pn-up' : d < -0.05 ? 'pn-down' : ''}">${Math.abs(d) < 0.005 ? '= igual' : (d >= 0 ? '▲ ' : '▼ ') + Math.abs(Math.round(d * 100)) + '%'}</small>` : ''}</div></div>`; }).join('')}</div>`;
}
const pnLegenda = itens => `<div class="pn-leg">${itens.map(([c, r]) => `<span><i style="background:${c}"></i>${esc(r)}</span>`).join('')}</div>`;

// ---------- mini tendência (sparkline) ----------
function pnSpark(vals, cor = PN_COR.marca) {
  const ns = vals.map(v => Number(v) || 0); if (ns.length < 2 || !ns.some(v => v)) return '';
  const W = 96, H = 26, max = Math.max(...ns), min = Math.min(0, ...ns), xv = i => 2 + (W - 4) * i / (ns.length - 1), yv = v => H - 3 - (H - 6) * (v - min) / ((max - min) || 1);
  return `<svg class="pn-spark" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="${ns.map((v, i) => (i ? 'L' : 'M') + xv(i) + ',' + yv(v)).join('')}" fill="none" stroke="${PN_COR.eixo}" stroke-width="1.5"/>
    <circle cx="${xv(ns.length - 1)}" cy="${yv(ns[ns.length - 1])}" r="3" fill="${cor}"/></svg>`;
}

// ---------- indicador (stat tile) ----------
// delta: {atual, ant, rot, bomSubir}
function pnKpi({ rot, valor, sub = '', delta = null, spark = null, link = null, nivel = '' }) {
  let dl = '';
  if (delta && delta.ant > 0) {
    const d = (delta.atual - delta.ant) / delta.ant, bom = delta.bomSubir ? d >= 0 : d <= 0;
    dl = `<span class="pn-delta ${Math.abs(d) < 0.005 ? '' : bom ? 'bom' : 'ruim'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(d * 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%</span> <span class="muted">${esc(delta.rot)}</span>`;
  } else if (delta) dl = `<span class="muted">${esc(delta.rot)}: sem base de comparação</span>`;
  const tag = link ? 'a' : 'div';
  return `<${tag} class="pn-kpi ${nivel}" ${link ? `href="${link}"` : ''}><div class="pn-kpi-r">${nivel === 'critico' ? '<span class="pn-st critico" aria-hidden="true">!</span>' : nivel === 'atencao' ? '<span class="pn-st atencao" aria-hidden="true">!</span>' : ''}${esc(rot)}</div>
    <div class="pn-kpi-v">${valor}</div><div class="pn-kpi-s${spark ? ' com-spark' : ''}">${dl || sub}</div>${spark || ''}</${tag}>`;
}

// ---------- alertas ----------
const PN_NIVEL = { critico: ['Crítico', 'critico'], atencao: ['Atenção', 'atencao'], info: ['Informativo', 'info'] };
function pnAlertas(lista, itens = {}) {
  if (!lista.length) return `<div class="cartao pn-alertas ok"><div class="pn-al-cab"><span class="pn-st bom" aria-hidden="true">✓</span><b>Nenhum alerta</b><span class="muted">Nada parado, vencido ou pendente fora do prazo.</span></div></div>`;
  const n = k => lista.filter(a => a.nivel === k).length;
  return `<div class="cartao pn-alertas"><div class="pn-al-cab"><h2>Alertas</h2><span class="pn-chip critico">${n('critico')} crítico(s)</span><span class="pn-chip atencao">${n('atencao')} de atenção</span>${n('info') ? `<span class="pn-chip info">${n('info')} informativo(s)</span>` : ''}</div>
    <ul class="pn-al">${lista.map(a => { const [rot, cls] = PN_NIVEL[a.nivel] || PN_NIVEL.info;
      return `<li class="${cls}"><span class="pn-st ${cls}" aria-hidden="true">${cls === 'info' ? 'i' : '!'}</span><div class="pn-al-t"><b>${esc(a.titulo)}</b><span class="pn-al-nv">${rot}</span>${a.detalhe ? `<div class="muted">${esc(a.detalhe)}</div>` : ''}</div>
        <div class="pn-al-n">${a.qtd != null ? `<b>${pnInt(a.qtd)}</b>` : ''}${a.valor != null ? `<span>${brl(a.valor)}</span>` : ''}</div>${pnAbrir(a, itens[a.titulo] || [])}</li>`; }).join('')}</ul></div>`;
}

// "Abrir" vai direto ao item; com vários itens, mostra a lista para escolher
let _pnAl = 0;
function pnAbrir(a, its) {
  if (its.length === 1) return `<a class="btn peq" href="${esc(its[0].link)}">Abrir</a>`;
  if (!its.length) return a.link ? `<a class="btn peq" href="${esc(a.link)}">Abrir</a>` : '';
  const id = 'pn-al-' + (++_pnAl);
  return `<button type="button" class="btn peq" data-al-itens="${id}" aria-expanded="false">Ver ${its.length} itens</button>
    <ul class="pn-al-itens" id="${id}" hidden>${its.map(i => `<li><a href="${esc(i.link)}"><span>${esc(i.rot)}</span><b>Abrir ›</b></a></li>`).join('')}${a.link ? `<li class="pn-al-lista"><a href="${esc(a.link)}">Ver a lista completa no menu ›</a></li>` : ''}</ul>`;
}
function pnLigarAlertas(raiz) {
  raiz.querySelectorAll('[data-al-itens]').forEach(b => b.onclick = () => { const ul = raiz.querySelector('#' + b.dataset.alItens); ul.hidden = !ul.hidden; b.setAttribute('aria-expanded', String(!ul.hidden)); b.classList.toggle('ativo', !ul.hidden); });
}

// ---------- cartão de gráfico com tabela de dados ----------
let _pnId = 0;
function pnCartao(tit, sub, corpoId, tabela, { largo = false } = {}) {
  return `<div class="cartao pn-card ${largo ? 'pn-largo' : ''}"><div class="pn-card-cab"><div><h2>${esc(tit)}</h2>${sub ? `<div class="muted pn-sub">${esc(sub)}</div>` : ''}</div>
    ${tabela ? `<button type="button" class="pn-tb" data-tb aria-expanded="false" title="Ver os números">Tabela</button>` : ''}</div>
    <div class="pn-corpo" id="${corpoId}"></div>${tabela ? `<div class="pn-tabela" hidden>${tabela}</div>` : ''}</div>`;
}
const pnTabela = (cab, linhas) => `<div class="tabela-wrap"><table><thead><tr>${cab.map((c, i) => `<th class="${i ? 'num' : ''}">${esc(c)}</th>`).join('')}</tr></thead><tbody>${linhas.map(l => `<tr>${l.map((c, i) => `<td class="${i ? 'num' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

// desenha os SVG na largura real e redesenha quando a tela muda de tamanho
function pnDesenhar(tela, graficos) {
  const desenhar = () => graficos.forEach(([id, fn]) => { const el = tela.querySelector('#' + id); if (el) el.innerHTML = fn(Math.max(240, el.clientWidth)); });
  desenhar();
  let t; const ro = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(desenhar, 120); });
  ro.observe(tela.querySelector('.pn-grade') || tela);
  const parar = () => { ro.disconnect(); removeEventListener('hashchange', parar); const tp = document.getElementById('pn-tip'); if (tp) tp.hidden = true; };
  addEventListener('hashchange', parar);
  pnLigarTips(tela);
  tela.querySelectorAll('[data-tb]').forEach(b => b.onclick = () => { const tb = b.closest('.pn-card').querySelector('.pn-tabela'); tb.hidden = !tb.hidden; b.setAttribute('aria-expanded', String(!tb.hidden)); b.classList.toggle('ativo', !tb.hidden); });
}
// meses: corta o começo vazio (empresa nova), mantendo no mínimo 3 meses
function pnCortarMeses(meses, chaves) {
  const i0 = meses.findIndex(m => chaves.some(k => Number(m[k]) > 0));
  return meses.slice(Math.max(0, Math.min(i0 < 0 ? meses.length - 3 : i0, meses.length - 3)));
}
const pnTopo = (tit, sub, dados) => `<div class="topo"><div><h1>${esc(tit)}</h1><p class="sub">${esc(sub)} · atualizado às ${new Date(dados.gerado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p></div>
  <div class="acoes"><button class="btn" id="pn-atualizar">Atualizar</button><button class="btn" onclick="print()">Imprimir</button></div></div>`;

// ===================== Painel do Financeiro =====================
rota('/financeiro/painel', async tela => {
  const [d, its] = await Promise.all([api.rpc('painel_financeiro'), api.rpc('painel_alertas_itens', { p_painel: 'financeiro' }).catch(() => ({}))]);
  const k = d.kpi, ms = pnCortarMeses(d.meses, ['pago', 'recebido', 'despesas', 'reembolsos', 'fundo']), cats = ms.map(m => pnMes(m.mes));
  const ult = arr => arr.slice(-6);
  const semanas = d.semanas.map((s, i) => ({ ...s, rot: i === 0 ? 'Vencidas' : pnDia(s.inicio) }));
  const AGING_COR = [PN_COR.atencao, PN_COR.serio, PN_COR.serio, PN_COR.critico, PN_COR.critico];
  const negativos = d.contas.filter(c => Number(c.saldo) < 0).length;
  tela.innerHTML = `${pnTopo('Painel do Financeiro', 'Caixa, contas a pagar e a receber, despesas e alertas do setor', d)}
    ${pnAlertas(d.alertas, its)}
    <div class="pn-kpis">
      ${pnKpi({ rot: 'Saldo em contas', valor: brl(k.saldo_contas), sub: negativos ? `${negativos} conta(s) negativa(s)` : 'bancos e caixa', nivel: Number(k.saldo_contas) < 0 ? 'critico' : '', link: '#/financeiro/projecao' })}
      ${pnKpi({ rot: 'Fundo Fixo', valor: brl(k.saldo_fundo), sub: `${k.adiant_aberto_qtd} adiantamento(s) em aberto · ${brl(k.adiant_aberto)}`, nivel: Number(k.saldo_fundo) < 2000 ? 'atencao' : '', link: '#/financeiro/fundo' })}
      ${pnKpi({ rot: 'Vencidas a pagar', valor: brl(k.vencidas_pagar), sub: `${k.vencidas_pagar_qtd} parcela(s) em atraso`, nivel: Number(k.vencidas_pagar) > 0 ? 'critico' : '', link: '#/financeiro/pagar' })}
      ${pnKpi({ rot: 'A pagar em 7 dias', valor: brl(k.pagar_7), sub: `${brl(k.pagar_30)} em 30 dias`, link: '#/financeiro/pagar' })}
      ${pnKpi({ rot: 'A receber em 30 dias', valor: brl(k.receber_30), sub: Number(k.vencidas_receber) ? `${brl(k.vencidas_receber)} vencido` : 'nada vencido', nivel: Number(k.vencidas_receber) > 0 ? 'atencao' : '', link: '#/financeiro/receber' })}
      ${pnKpi({ rot: 'Pago no mês', valor: brl(k.pago_mes), delta: { atual: Number(k.pago_mes), ant: Number(k.pago_ant_ate_dia), rot: 'vs mesmo período do mês anterior', bomSubir: false }, spark: pnSpark(ult(ms.map(m => m.pago))) })}
      ${pnKpi({ rot: 'Despesas lançadas no mês', valor: brl(k.despesas_mes), delta: { atual: Number(k.despesas_mes), ant: Number(k.despesas_ant), rot: 'vs mês anterior', bomSubir: false }, spark: pnSpark(ult(ms.map(m => m.despesas))) })}
      ${pnKpi({ rot: 'Juros e multas no mês', valor: brl(k.encargos_mes), sub: `${k.pagas_atraso_mes} parcela(s) paga(s) em atraso · ${brl(k.encargos_12m)} em 12 meses`, nivel: Number(k.encargos_mes) > 0 ? 'atencao' : '' })}
    </div>
    <div class="pn-grade">
      ${pnCartao('Pago × recebido por mês', 'Regime de caixa, com juros e multas', 'g-caixa', pnTabela(['Mês', 'Pago', 'Recebido', 'Diferença'], ms.map(m => [pnMes(m.mes), brl(m.pago), brl(m.recebido), brl(m.recebido - m.pago)])))}
      ${pnCartao('Próximas 8 semanas', 'A pagar × a receber em aberto, por semana de vencimento', 'g-semanas', pnTabela(['Semana', 'A pagar', 'A receber'], semanas.map((s, i) => [i === 0 ? 'Vencidas + semana atual' : 'Semana de ' + s.rot, brl(s.pagar), brl(s.receber)])))}
      ${pnCartao('Despesas lançadas por mês', 'Competência · contas a pagar (sem adiantamentos)', 'g-desp', pnTabela(['Mês', 'Despesas'], ms.map(m => [pnMes(m.mes), brl(m.despesas)])))}
      ${pnCartao('Vencidas a pagar por tempo de atraso', `${k.vencidas_pagar_qtd} parcela(s) · ${brl(k.vencidas_pagar)}`, 'g-aging', pnTabela(['Atraso', 'Parcelas', 'Valor'], d.aging.map(a => [esc(a.faixa), pnInt(a.qtd), brl(a.valor)])))}
      ${pnCartao('Despesas por categoria', 'Mês atual × mês anterior (competência)', 'g-cat', pnTabela(['Categoria', 'Mês atual', 'Mês anterior', '6 meses'], d.categorias.map(c => [esc(c.nome), brl(c.atual), brl(c.anterior), brl(c.total)])))}
      ${pnCartao('Despesas por centro de custo', 'Últimos 6 meses', 'g-cc', pnTabela(['Centro de custo', 'Mês atual', '6 meses'], d.centros.map(c => [esc(c.nome), brl(c.atual), brl(c.total)])))}
      ${pnCartao('Reembolsos e Fundo Fixo por mês', 'Reembolsos lançados e saídas do fundo (despesas e adiantamentos)', 'g-rf', pnTabela(['Mês', 'Reembolsos', 'Fundo Fixo'], ms.map(m => [pnMes(m.mes), brl(m.reembolsos), brl(m.fundo)])))}
      ${pnCartao('Maiores favorecidos', 'Pagos nos últimos 12 meses', 'g-forn', pnTabela(['Favorecido', 'Pagamentos', 'Total'], d.fornecedores.map(f => [esc(f.nome), pnInt(f.qtd), brl(f.total)])))}
      ${pnCartao('Juros e multas pagos por mês', 'Custo do atraso', 'g-enc', pnTabela(['Mês', 'Juros + multa'], ms.map(m => [pnMes(m.mes), brl(m.encargos)])))}
      ${pnCartao('Saldos das contas', 'Bancos, caixa e Fundo Fixo', 'g-contas', pnTabela(['Conta', 'Saldo'], d.contas.map(c => [esc(c.nome), brl(c.saldo)])))}
    </div>`;
  const hFix = (id, html) => [id, () => html];
  pnDesenhar(tela, [
    ['g-caixa', W => pnLegenda([[PN_COR.s1, 'Recebido'], [PN_COR.s2, 'Pago']]) + pnColunas(W, { cats, series: [{ nome: 'Recebido', cor: PN_COR.s1, vals: ms.map(m => m.recebido) }, { nome: 'Pago', cor: PN_COR.s2, vals: ms.map(m => m.pago) }] })],
    ['g-semanas', W => pnLegenda([[PN_COR.s1, 'A receber'], [PN_COR.s2, 'A pagar']]) + pnColunas(W, { cats: semanas.map(s => s.rot), series: [{ nome: 'A receber', cor: PN_COR.s1, vals: semanas.map(s => s.receber) }, { nome: 'A pagar', cor: PN_COR.s2, vals: semanas.map(s => s.pagar) }] })],
    ['g-desp', W => pnColunas(W, { cats, series: [{ nome: 'Despesas', cor: PN_COR.marca, vals: ms.map(m => m.despesas) }] })],
    ['g-aging', W => pnColunas(W, { cats: d.aging.map(a => a.faixa), series: [{ nome: 'Valor vencido', cor: PN_COR.critico, vals: d.aging.map(a => a.valor) }], coresCat: AGING_COR, rotular: 'todos' })],
    hFix('g-cat', pnBarrasComp(d.categorias.slice(0, 8).map(c => ({ nome: c.nome, a: c.atual, b: c.anterior })), { rotA: 'Mês atual', rotB: 'Mês anterior' })),
    hFix('g-cc', pnBarrasH(d.centros.map(c => ({ nome: c.nome, valor: c.total, rot: '6 meses', sub: c.atual ? 'Mês atual: ' + brl(c.atual) : '' })))),
    ['g-rf', W => pnLegenda([[PN_COR.s1, 'Reembolsos'], [PN_COR.s2, 'Fundo Fixo']]) + pnColunas(W, { cats, series: [{ nome: 'Reembolsos', cor: PN_COR.s1, vals: ms.map(m => m.reembolsos) }, { nome: 'Fundo Fixo', cor: PN_COR.s2, vals: ms.map(m => m.fundo) }] })],
    hFix('g-forn', pnBarrasH(d.fornecedores.map(f => ({ nome: f.nome, valor: f.total, rot: 'Pago', sub: f.qtd + ' pagamento(s)' })))),
    ['g-enc', W => pnColunas(W, { cats, series: [{ nome: 'Juros + multa', cor: PN_COR.s2, vals: ms.map(m => m.encargos) }], fmtEixo: v => 'R$ ' + pnK(v), alt: 180 })],
    hFix('g-contas', pnBarrasH(d.contas.map(c => ({ nome: c.nome, valor: c.saldo, rot: 'Saldo' })))),
  ]);
  pnLigarAlertas(tela);
  $('#pn-atualizar').onclick = () => navegar();
});

// ===================== Painel de Compras =====================
rota('/compras/painel', async tela => {
  const [d, its] = await Promise.all([api.rpc('painel_compras'), api.rpc('painel_alertas_itens', { p_painel: 'compras' }).catch(() => ({}))]);
  const k = d.kpi, ms = pnCortarMeses(d.meses, ['comprado', 'requisicoes', 'pedidos']), cats = ms.map(m => pnMes(m.mes));
  const FUNIL_COR = ['#86b6ef', '#6da7ec', '#5598e7', '#3987e5', '#2a78d6', '#1c5cab'];
  tela.innerHTML = `${pnTopo('Painel de Compras', 'Requisições, cotações, pedidos, fornecedores e alertas do setor', d)}
    ${pnAlertas(d.alertas, its)}
    <div class="pn-kpis">
      ${pnKpi({ rot: 'Requisições em aberto', valor: pnInt(k.req_abertas), sub: `${k.req_urgentes} urgente(s)`, nivel: k.req_urgentes > 0 ? 'atencao' : '', link: '#/compras/requisicoes' })}
      ${pnKpi({ rot: 'Comprado no mês', valor: brl(k.comprado_mes), delta: { atual: Number(k.comprado_mes), ant: Number(k.comprado_ant_ate_dia), rot: 'vs mesmo período do mês anterior', bomSubir: false }, spark: pnSpark(ms.slice(-6).map(m => m.comprado)) })}
      ${pnKpi({ rot: 'Pedidos a receber', valor: pnInt(k.a_receber), sub: brl(k.a_receber_valor), link: '#/compras/pedidos' })}
      ${pnKpi({ rot: 'Tempo médio requisição → pedido', valor: k.lead_time_90 != null ? Number(k.lead_time_90).toLocaleString('pt-BR') + ' dias' : '—', sub: 'últimos 90 dias' })}
      ${pnKpi({ rot: 'Economia nas cotações', valor: brl(k.economia_12m), sub: 'vencedora × maior proposta, 12 meses', nivel: '' })}
      ${pnKpi({ rot: 'Compras com 3+ orçamentos', valor: k.pct_3_orc != null ? k.pct_3_orc + '%' : '—', sub: 'das cotações aprovadas', nivel: k.pct_3_orc != null && k.pct_3_orc < 50 ? 'atencao' : '' })}
      ${pnKpi({ rot: 'Comprado em 12 meses', valor: brl(k.comprado_12m), sub: `${k.pedidos_12m} pedido(s) · ticket médio ${brl(k.pedidos_12m ? k.comprado_12m / k.pedidos_12m : 0)}` })}
    </div>
    <div class="pn-grade">
      ${pnCartao('Valor comprado por mês', 'Pedidos emitidos (sem cancelados)', 'g-comp', pnTabela(['Mês', 'Pedidos', 'Valor'], ms.map(m => [pnMes(m.mes), pnInt(m.pedidos), brl(m.comprado)])))}
      ${pnCartao('Requisições abertas × atendidas', 'Quantidade por mês', 'g-req', pnTabela(['Mês', 'Abertas', 'Atendidas'], ms.map(m => [pnMes(m.mes), pnInt(m.requisicoes), pnInt(m.atendidas)])))}
      ${pnCartao('Onde as requisições estão', 'Situação atual · quantidade e valor estimado', 'g-funil', pnTabela(['Etapa', 'Requisições', 'Valor estimado'], d.funil.map(f => [esc(f.etapa), pnInt(f.qtd), brl(f.valor)])))}
      ${pnCartao('Tempo médio requisição → pedido', 'Dias, por mês do pedido', 'g-lead', pnTabela(['Mês', 'Dias'], ms.map(m => [pnMes(m.mes), m.lead_time == null ? '—' : String(m.lead_time).replace('.', ',')])))}
      ${pnCartao('Economia nas cotações por mês', 'Vencedora × maior proposta', 'g-eco', pnTabela(['Mês', 'Economia'], ms.map(m => [pnMes(m.mes), brl(m.economia)])))}
      ${pnCartao('Compras por categoria', 'Últimos 12 meses', 'g-cat', pnTabela(['Categoria', 'Pedidos', 'Total'], d.categorias.map(c => [esc(c.nome), pnInt(c.qtd), brl(c.total)])))}
      ${pnCartao('Maiores fornecedores', 'Últimos 12 meses', 'g-forn', pnTabela(['Fornecedor', 'Pedidos', 'Total'], d.fornecedores.map(c => [esc(c.nome), pnInt(c.qtd), brl(c.total)])))}
      ${pnCartao('Compras por centro de custo', 'Últimos 12 meses', 'g-cc', pnTabela(['Centro de custo', 'Pedidos', 'Total'], d.centros.map(c => [esc(c.nome), pnInt(c.qtd), brl(c.total)])))}
    </div>`;
  const hFix = (id, html) => [id, () => html];
  pnDesenhar(tela, [
    ['g-comp', W => pnColunas(W, { cats, series: [{ nome: 'Comprado', cor: PN_COR.marca, vals: ms.map(m => m.comprado) }] })],
    ['g-req', W => pnLegenda([[PN_COR.s1, 'Abertas'], [PN_COR.s2, 'Atendidas']]) + pnColunas(W, { cats, series: [{ nome: 'Abertas', cor: PN_COR.s1, vals: ms.map(m => m.requisicoes) }, { nome: 'Atendidas', cor: PN_COR.s2, vals: ms.map(m => m.atendidas) }], fmt: pnInt, fmtEixo: pnK })],
    hFix('g-funil', pnBarrasH(d.funil.map((f, i) => ({ nome: f.etapa, valor: f.qtd, cor: FUNIL_COR[i], rot: 'Requisições', sub: 'Valor estimado: ' + brl(f.valor) })), { fmt: pnInt, fmtCurto: pnInt })),
    ['g-lead', W => pnLinha(W, { cats, vals: ms.map(m => m.lead_time), nome: 'Dias', cor: PN_COR.s1, fmt: v => Number(v).toLocaleString('pt-BR') + ' d' })],
    ['g-eco', W => pnColunas(W, { cats, series: [{ nome: 'Economia', cor: PN_COR.s3, vals: ms.map(m => m.economia) }] })],
    hFix('g-cat', pnBarrasH(d.categorias.map(c => ({ nome: c.nome, valor: c.total, rot: '12 meses', sub: c.qtd + ' pedido(s)' })))),
    hFix('g-forn', pnBarrasH(d.fornecedores.map(c => ({ nome: c.nome, valor: c.total, rot: '12 meses', sub: c.qtd + ' pedido(s)' })))),
    hFix('g-cc', pnBarrasH(d.centros.map(c => ({ nome: c.nome, valor: c.total, rot: '12 meses', sub: c.qtd + ' pedido(s)' })))),
  ]);
  pnLigarAlertas(tela);
  $('#pn-atualizar').onclick = () => navegar();
});
