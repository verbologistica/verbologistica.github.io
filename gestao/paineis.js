// Verbo Gestão — Painéis gerenciais (Financeiro, Compras e visão executiva do Início)
//   Visual de apresentação: fundo escuro da marca, destaques em dourado, gráficos de área, rosca e mapa de fornecedores.
'use strict';

// ---------- formatação ----------
const PN_MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const pnMes = iso => { const [a, m] = String(iso).split('-'); return PN_MES[Number(m) - 1] + '/' + a.slice(2); };
const pnDia = iso => { const [, m, d] = String(iso).split('-'); return d + '/' + m; };
const pnK = v => { const n = Number(v) || 0, a = Math.abs(n);
  return a >= 1e6 ? (n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi' : a >= 1e3 ? (n / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: a >= 1e5 ? 0 : 1 }) + ' mil' : n.toLocaleString('pt-BR', { maximumFractionDigits: 0 }); };
const pnBRLk = v => 'R$ ' + pnK(v);
const pnInt = v => (Number(v) || 0).toLocaleString('pt-BR');
const pnPct = v => (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';

// ---------- cores (validadas para o fundo escuro #10241D: faixa de luminosidade, daltonismo e contraste) ----------
// categóricas em ordem fixa: dourado, verde, azul, cobre, lilás · "Outros" em cinza · status reservados para alerta
const PN_CAT = ['#bb881a', '#19966e', '#3786c3', '#bd5833', '#a067ac'];
const PN_COR = { s1: '#19966e', s2: '#bb881a', s3: '#3786c3', marca: '#bb881a', outros: '#5d6f68',
  bom: '#3fbf94', atencao: '#e0a53a', serio: '#e07b4a', critico: '#e05a4f',
  grade: 'rgba(255,255,255,.07)', eixo: 'rgba(255,255,255,.22)', fundo: '#10241D' };

// ---------- tooltip único ----------
function pnTip() {
  let t = document.getElementById('pn-tip');
  if (!t) { t = document.createElement('div'); t.id = 'pn-tip'; t.className = 'pn-tip'; t.hidden = true; document.body.appendChild(t); }
  return t;
}
function pnLigarTips(raiz) {
  if (raiz._pnTips) return; raiz._pnTips = true;
  const t = pnTip();
  raiz.addEventListener('mousemove', e => {
    const alvo = e.target.closest('[data-tip]');
    if (!alvo || !raiz.contains(alvo)) { t.hidden = true; raiz.querySelectorAll('.pn-hov').forEach(el => el.classList.remove('pn-hov')); return; }
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
function pnColunas(W, { cats, series, fmt = brl, fmtEixo = pnBRLk, alt = 220, rotular = 'ultimo', coresCat = null }) {
  const H = alt, mL = 52, mR = 8, mT = 18, mB = 26, pw = Math.max(80, W - mL - mR), ph = H - mT - mB;
  const max = Math.max(0, ...series.flatMap(s => s.vals.map(v => Number(v) || 0)));
  const esc_ = pnEscala(max); const yv = v => mT + ph - (Math.max(0, v) / esc_.top) * ph;
  const banda = pw / cats.length, ns = series.length, gap = 2;
  const bw = Math.min(22, (banda * 0.62 - gap * (ns - 1)) / ns), grupoW = bw * ns + gap * (ns - 1);
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" class="pn-svg">`;
  esc_.ticks.forEach(t => { const y = yv(t); s += `<line x1="${mL}" x2="${W - mR}" y1="${y}" y2="${y}" stroke="${t === 0 ? PN_COR.eixo : PN_COR.grade}" stroke-width="1"/><text x="${mL - 8}" y="${y + 4}" text-anchor="end" class="pn-ax">${fmtEixo(t)}</text>`; });
  const passoRot = Math.ceil(cats.length / Math.max(1, Math.floor(pw / 46)));
  cats.forEach((c, i) => {
    const x0 = mL + banda * i + (banda - grupoW) / 2;
    series.forEach((se, k) => { const v = Number(se.vals[i]) || 0, y = yv(v);
      s += pnBarra(x0 + k * (bw + gap), y, bw, mT + ph - y, coresCat ? coresCat[i] : se.cor, `data-g="c${i}"`); });
    if (i % passoRot === 0 || i === cats.length - 1) s += `<text x="${mL + banda * i + banda / 2}" y="${H - 8}" text-anchor="middle" class="pn-ax">${esc(c)}</text>`;
    if (ns === 1 && ((rotular === 'ultimo' && i === cats.length - 1) || (rotular === 'todos'))) {
      const v = Number(series[0].vals[i]) || 0; if (v > 0) s += `<text x="${x0 + bw / 2}" y="${yv(v) - 6}" text-anchor="middle" class="pn-val">${fmtEixo(v)}</text>`;
    }
    const tip = tipHtml(c, series.map(se => [coresCat ? coresCat[i] : se.cor, se.nome, fmt(se.vals[i])]));
    s += `<rect x="${mL + banda * i}" y="${mT}" width="${banda}" height="${ph}" fill="transparent" data-tip="${tip}" data-grupo="c${i}"/>`;
  });
  return s + '</svg>';
}

// curva suave (monotônica: não "inventa" picos entre os pontos)
function pnCurva(pts) {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : '';
  const n = pts.length, dx = [], m = [], t = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i]; }
  t[0] = m[0]; t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : 3 * (dx[i - 1] + dx[i]) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) { const h = dx[i] / 3; d += `C${pts[i][0] + h},${pts[i][1] + t[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - t[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`; }
  return d;
}
// ---------- área (uma ou mais séries, um único eixo, cruz e tooltip no hover) ----------
let _pnGrad = 0;
function pnArea(W, { cats, series, fmt = brl, fmtEixo = pnBRLk, alt = 260 }) {
  const H = alt, mL = 54, mR = 16, mT = 22, mB = 28, pw = Math.max(80, W - mL - mR), ph = H - mT - mB;
  const max = Math.max(0, ...series.flatMap(s => s.vals.map(v => Number(v) || 0)));
  const e = pnEscala(max); const yv = v => mT + ph - (Math.max(0, Number(v) || 0) / e.top) * ph;
  const xv = i => cats.length === 1 ? mL + pw / 2 : mL + pw * i / (cats.length - 1);
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" class="pn-svg"><defs>`;
  const ids = series.map(se => { const id = 'pg' + (++_pnGrad); s += `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${se.cor}" stop-opacity=".38"/><stop offset="1" stop-color="${se.cor}" stop-opacity="0"/></linearGradient>`; return id; });
  s += '</defs>';
  e.ticks.forEach(t => { const y = yv(t); s += `<line x1="${mL}" x2="${W - mR}" y1="${y}" y2="${y}" stroke="${t === 0 ? PN_COR.eixo : PN_COR.grade}"/><text x="${mL - 8}" y="${y + 4}" text-anchor="end" class="pn-ax">${fmtEixo(t)}</text>`; });
  series.forEach((se, k) => {
    const pts = se.vals.map((v, i) => [xv(i), yv(v)]); const d = pnCurva(pts);
    if (pts.length > 1) s += `<path d="${d}L${pts[pts.length - 1][0]},${mT + ph}L${pts[0][0]},${mT + ph}Z" fill="url(#${ids[k]})"/>`;
    s += `<path d="${d}" fill="none" stroke="${se.cor}" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round" class="pn-linha"/>`;
  });
  const passoRot = Math.ceil(cats.length / Math.max(1, Math.floor(pw / 52)));
  const banda = cats.length > 1 ? pw / (cats.length - 1) : pw;
  cats.forEach((c, i) => {
    if (i % passoRot === 0 || i === cats.length - 1) s += `<text x="${xv(i)}" y="${H - 8}" text-anchor="${i === 0 && cats.length > 1 ? 'start' : i === cats.length - 1 && cats.length > 1 ? 'end' : 'middle'}" class="pn-ax">${esc(c)}</text>`;
    s += `<line x1="${xv(i)}" x2="${xv(i)}" y1="${mT}" y2="${mT + ph}" class="pn-cruz" data-g="a${i}"/>`;
    series.forEach(se => { s += `<circle cx="${xv(i)}" cy="${yv(se.vals[i])}" r="4.5" fill="${se.cor}" stroke="${PN_COR.fundo}" stroke-width="2" class="pn-pt" data-g="a${i}"/>`; });
    s += `<rect x="${xv(i) - banda / 2}" y="${mT}" width="${banda}" height="${ph}" fill="transparent" data-tip="${tipHtml(c, series.map(se => [se.cor, se.nome, fmt(se.vals[i])]))}" data-grupo="a${i}"/>`;
  });
  // rótulo seletivo: último valor de cada série
  const ul = cats.length - 1;
  if (ul >= 0) series.forEach(se => { const v = Number(se.vals[ul]) || 0; if (v) s += `<text x="${xv(ul) - 8}" y="${yv(v) - 10}" text-anchor="end" class="pn-val">${fmtEixo(v)}</text>`; });
  return s + '</svg>';
}

// ---------- linha simples ----------
function pnLinha(W, { cats, vals, nome, cor = PN_COR.s3, fmt = v => v, fmtEixo = pnK, alt = 200 }) {
  return pnArea(W, { cats, series: [{ nome, cor, vals: vals.map(v => v == null ? 0 : v) }], fmt, fmtEixo, alt });
}

// ---------- rosca (participação; até 5 fatias + "Outros") ----------
function pnRosca(itens, { fmt = brl, centroRot = 'Total', vazio = 'Sem dados no período.' } = {}) {
  const lim = itens.filter(i => Number(i.valor) > 0).sort((a, b) => b.valor - a.valor);
  if (!lim.length) return `<div class="pn-vazio">${vazio}</div>`;
  const top = lim.slice(0, 5), resto = lim.slice(5).reduce((a, i) => a + Number(i.valor), 0);
  const fat = top.map((i, k) => ({ ...i, cor: PN_CAT[k] })); if (resto > 0) fat.push({ nome: 'Outros', valor: resto, cor: PN_COR.outros });
  const total = fat.reduce((a, i) => a + Number(i.valor), 0);
  const R = 74, r = 50, C = 90; let ang = -Math.PI / 2, s = '';
  const pt = (rad, a) => [C + rad * Math.cos(a), C + rad * Math.sin(a)];
  fat.forEach((f, k) => {
    const frac = Number(f.valor) / total, a1 = ang, a2 = ang + Math.max(frac * 2 * Math.PI - (fat.length > 1 ? 0.035 : 0), 0.001); ang += frac * 2 * Math.PI;
    const g = a2 - a1 > Math.PI ? 1 : 0; const [x1, y1] = pt(R, a1), [x2, y2] = pt(R, a2), [x3, y3] = pt(r, a2), [x4, y4] = pt(r, a1);
    const d = frac >= 0.999 ? `M${C - R},${C}a${R},${R} 0 1,0 ${2 * R},0a${R},${R} 0 1,0 ${-2 * R},0M${C - r},${C}a${r},${r} 0 1,1 ${2 * r},0a${r},${r} 0 1,1 ${-2 * r},0`
      : `M${x1},${y1}A${R},${R} 0 ${g} 1 ${x2},${y2}L${x3},${y3}A${r},${r} 0 ${g} 0 ${x4},${y4}Z`;
    s += `<path d="${d}" fill="${f.cor}" fill-rule="evenodd" data-g="r${k}" data-tip="${tipHtml(f.nome, [[f.cor, 'Valor', fmt(f.valor)], [null, 'Participação', pnPct(100 * f.valor / total)]])}" data-grupo="r${k}"/>`;
  });
  return `<div class="pn-rosca"><svg viewBox="0 0 180 180" class="pn-svg pn-rosca-svg" role="img" aria-label="Participação por item">${s}
      <text x="90" y="86" text-anchor="middle" class="pn-rosca-r">${esc(centroRot)}</text><text x="90" y="106" text-anchor="middle" class="pn-rosca-v">${esc(pnBRLk(total))}</text></svg>
    <ul class="pn-rosca-leg">${fat.map((f, k) => `<li data-grupo="r${k}" data-tip="${tipHtml(f.nome, [[f.cor, 'Valor', fmt(f.valor)], [null, 'Participação', pnPct(100 * f.valor / total)]])}"><i style="background:${f.cor}"></i><span class="pn-rl-n" title="${esc(f.nome)}">${esc(f.nome)}</span><b>${pnPct(100 * f.valor / total)}</b><small>${esc(pnBRLk(f.valor))}</small></li>`).join('')}</ul></div>`;
}

// ---------- barras horizontais (HTML, responsivo) ----------
function pnBarrasH(itens, { cor = PN_COR.marca, fmt = brl, fmtCurto = pnBRLk, vazio = 'Sem dados no período.' } = {}) {
  if (!itens.length) return `<div class="pn-vazio">${vazio}</div>`;
  const max = Math.max(...itens.map(i => Math.abs(Number(i.valor) || 0)), 1);
  return `<div class="pn-bh">${itens.map(i => { const v = Number(i.valor) || 0, w = Math.max(0.5, 100 * Math.abs(v) / max), c = i.cor || (v < 0 ? PN_COR.critico : cor);
    return `<div class="pn-bh-l" data-tip="${tipHtml(i.nome, [[c, i.rot || 'Valor', fmt(v)], ...(i.sub ? [[null, i.sub, '']] : [])])}"><div class="pn-bh-n" title="${esc(i.nome)}">${esc(i.nome)}${v < 0 ? ' <span class="pn-neg">negativo</span>' : ''}</div>
      <div class="pn-bh-t"><span style="width:${w}%;background:${c}"></span></div><div class="pn-bh-v">${fmtCurto(v)}</div></div>`; }).join('')}</div>`;
}
const pnLegenda = itens => `<div class="pn-leg">${itens.map(([c, r]) => `<span><i style="background:${c}"></i>${esc(r)}</span>`).join('')}</div>`;

// ---------- indicador secundário ----------
function pnKpi({ rot, valor, sub = '', delta = null, link = null, nivel = '' }) {
  let dl = '';
  if (delta && delta.ant > 0) {
    const d = (delta.atual - delta.ant) / delta.ant, bom = delta.bomSubir ? d >= 0 : d <= 0;
    dl = `<span class="pn-delta ${Math.abs(d) < 0.005 ? '' : bom ? 'bom' : 'ruim'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(d * 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%</span> <span class="muted">${esc(delta.rot)}</span>`;
  } else if (delta) dl = `<span class="muted">${esc(delta.rot)}: sem base de comparação</span>`;
  const tag = link ? 'a' : 'div';
  return `<${tag} class="pn-kpi ${nivel}" ${link ? `href="${link}"` : ''}><div class="pn-kpi-r">${nivel === 'critico' || nivel === 'atencao' ? `<span class="pn-st ${nivel}" aria-hidden="true">!</span>` : ''}${esc(rot)}</div>
    <div class="pn-kpi-v">${valor}</div><div class="pn-kpi-s">${dl || sub}</div></${tag}>`;
}

// ---------- faixa de destaque (cabeçalho do painel) ----------
// kpis: [{ic, rot, valor, sub, link, nivel}]
function pnFaixa(kpis) {
  return `<div class="vx-faixa">${kpis.map(k => { const tag = k.link ? 'a' : 'div';
    return `<${tag} class="vx-fk ${k.nivel || ''}" ${k.link ? `href="${k.link}"` : ''}><span class="vx-fk-ic">${ico(k.ic || 'grafico')}</span><span class="vx-fk-t"><span class="vx-fk-r">${esc(k.rot)}</span>
      <span class="vx-fk-v">${k.valor}</span>${k.sub ? `<span class="vx-fk-s">${k.sub}</span>` : ''}</span></${tag}>`; }).join('')}</div>`;
}
const pnTopo = (tit, sub, dados) => `<section class="vx-topo"><div class="vx-tit"><div class="vx-kicker">Verbo Gestão · ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
    <h1>${esc(tit)}</h1><p>${esc(sub)} · atualizado às ${new Date(dados.gerado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p></div>
  <div class="acoes"><button class="btn" id="pn-atualizar">Atualizar</button><button class="btn" onclick="print()">Imprimir</button></div></section>`;

// ---------- alertas ----------
const PN_NIVEL = { critico: ['Crítico', 'critico'], atencao: ['Atenção', 'atencao'], info: ['Informativo', 'info'] };
function pnAlertas(lista, itens = {}) {
  if (!lista.length) return `<div class="cartao pn-alertas ok"><div class="pn-al-cab"><span class="pn-st bom" aria-hidden="true">✓</span><b>Nenhum alerta</b><span class="muted">Nada parado, vencido ou pendente fora do prazo.</span></div></div>`;
  const n = k => lista.filter(a => a.nivel === k).length;
  return `<details class="cartao pn-alertas" ${n('critico') ? 'open' : ''}><summary class="pn-al-cab"><h2>Alertas</h2><span class="pn-chip critico">${n('critico')} crítico(s)</span><span class="pn-chip atencao">${n('atencao')} de atenção</span>${n('info') ? `<span class="pn-chip info">${n('info')} informativo(s)</span>` : ''}<span class="pn-al-abrir muted">mostrar / esconder</span></summary>
    <ul class="pn-al">${lista.map(a => { const [rot, cls] = PN_NIVEL[a.nivel] || PN_NIVEL.info;
      return `<li class="${cls}"><span class="pn-st ${cls}" aria-hidden="true">${cls === 'info' ? 'i' : '!'}</span><div class="pn-al-t"><b>${esc(a.titulo)}</b><span class="pn-al-nv">${rot}</span>${a.detalhe ? `<div class="muted">${esc(a.detalhe)}</div>` : ''}</div>
        <div class="pn-al-n">${a.qtd != null ? `<b>${pnInt(a.qtd)}</b>` : ''}${a.valor != null ? `<span>${brl(a.valor)}</span>` : ''}</div>${pnAbrir(a, itens[a.titulo] || [])}</li>`; }).join('')}</ul></details>`;
}
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
function pnCartao(tit, sub, corpoId, tabela, { cls = '' } = {}) {
  return `<div class="cartao pn-card ${cls}"><div class="pn-card-cab"><div><h2>${esc(tit)}</h2>${sub ? `<div class="muted pn-sub">${esc(sub)}</div>` : ''}</div>
    ${tabela ? `<button type="button" class="pn-tb" data-tb aria-expanded="false" title="Ver os números">Tabela</button>` : ''}</div>
    <div class="pn-corpo" id="${corpoId}"></div>${tabela ? `<div class="pn-tabela" hidden>${tabela}</div>` : ''}</div>`;
}
const pnTabela = (cab, linhas) => `<div class="tabela-wrap"><table><thead><tr>${cab.map((c, i) => `<th class="${i ? 'num' : ''}">${esc(c)}</th>`).join('')}</tr></thead><tbody>${linhas.map(l => `<tr>${l.map((c, i) => `<td class="${i ? 'num' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

// desenha os SVG na largura real e redesenha quando a tela muda de tamanho
function pnDesenhar(tela, graficos) {
  const desenhar = () => graficos.forEach(([id, fn]) => { const el = tela.querySelector('#' + id); if (el) el.innerHTML = fn(Math.max(240, el.clientWidth)); });
  desenhar();
  let t; const ro = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(desenhar, 120); });
  ro.observe(tela.querySelector('.vx-grade') || tela);
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

// ===================== Mapa de fornecedores =====================
// pontos: fornecedores com compra efetivada ou contrato · tamanho = valor movimentado · cor = tipo de relação
const MAPA_TIPO = { contrato: ['Contrato / conta fixa', '#19966e'], compra: ['Compra efetivada', '#DDA936'], posto: ['Posto de combustível', '#3786c3'] };
const _carregarLeaflet = () => {
  if (!document.getElementById('leaflet-css')) document.head.insertAdjacentHTML('beforeend', '<link id="leaflet-css" rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">');
  return window.L ? Promise.resolve() : carregarScript('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js');
};
function pnMapaCartao(id, { tit = 'Onde a Verbo compra', sub = 'Fornecedores com compra efetivada ou contrato', cls = '' } = {}) {
  return `<div class="cartao pn-card vx-mapa-card ${cls}"><div class="pn-card-cab"><div><h2>${esc(tit)}</h2><div class="muted pn-sub">${esc(sub)}</div></div></div>
    <div class="vx-mapa" id="${id}"><div class="pn-vazio">Carregando mapa…</div></div>
    <div class="vx-mapa-rod">${Object.values(MAPA_TIPO).map(([r, c]) => `<span><i style="background:${c}"></i>${esc(r)}</span>`).join('')}<span class="muted" data-mapa-resumo></span></div></div>`;
}
async function pnMapa(el) {
  if (!el) return;
  let dados;
  try { [dados] = await Promise.all([api.rpc('mapa_fornecedores'), _carregarLeaflet()]); }
  catch (err) { el.innerHTML = `<div class="pn-vazio">Não foi possível carregar o mapa (${esc(err.message || 'sem conexão')}).</div>`; return; }
  const fs = dados?.fornecedores || [];
  const card = el.closest('.vx-mapa-card'), resumo = card?.querySelector('[data-mapa-resumo]');
  if (!document.body.contains(el)) return;
  el.innerHTML = '';
  const mapa = L.map(el, { zoomControl: true, attributionControl: true, scrollWheelZoom: false, worldCopyJump: false, minZoom: 3, maxZoom: 12 }).setView([-21.5, -50.5], 5);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { subdomains: 'abcd', maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>' }).addTo(mapa);
  el.addEventListener('click', () => mapa.scrollWheelZoom.enable(), { once: true });
  const tipo = f => f.contratos > 0 ? 'contrato' : f.abastecimentos > 0 && !f.pedidos ? 'posto' : 'compra';
  const valor = f => Math.max(Number(f.pago) || 0, Number(f.valor_pedidos) || 0, Number(f.valor_abast) || 0);
  const maxV = Math.max(1, ...fs.map(valor));
  const camada = L.layerGroup().addTo(mapa); const pontos = [];
  const porCidade = {};
  const desenhar = () => {
    camada.clearLayers(); pontos.length = 0; Object.keys(porCidade).forEach(k => delete porCidade[k]);
    fs.filter(f => f.lat != null).forEach(f => { (porCidade[f.lat + ',' + f.lng] ||= []).push(f); });
    Object.values(porCidade).forEach(lista => lista.forEach((f, i) => {
      // vários fornecedores na mesma cidade: espalha em volta do centro para todos aparecerem
      const n = lista.length, ang = 2 * Math.PI * i / n, raio = n > 1 ? 0.06 + 0.012 * n : 0;
      const lat = Number(f.lat) + raio * Math.sin(ang), lng = Number(f.lng) + raio * Math.cos(ang) * 1.1;
      const [rot, cor] = MAPA_TIPO[tipo(f)], v = valor(f);
      const m = L.circleMarker([lat, lng], { radius: 5 + 13 * Math.sqrt(v / maxV), color: cor, weight: 1.5, opacity: .95, fillColor: cor, fillOpacity: .55, className: 'vx-ponto' }).addTo(camada);
      const linhas = [f.pedidos ? `${f.pedidos} pedido(s) · ${brl(f.valor_pedidos)}` : '', Number(f.pago) ? `Pago: ${brl(f.pago)}` : '', f.contratos ? `${f.contratos} contrato(s) / conta(s) fixa(s)` : '',
        f.abastecimentos ? `${f.abastecimentos} abastecimento(s) · ${brl(f.valor_abast)}` : '', !f.pedidos && !Number(f.pago) && f.contas ? `${f.contas} conta(s) a pagar lançada(s)` : ''].filter(Boolean);
      m.bindTooltip(`<div class="vx-mt"><b>${esc(f.nome)}</b><span>${esc(f.cidade || '')}${f.uf ? '/' + esc(f.uf) : ''} · ${esc(rot)}</span>${linhas.map(l => `<div>${esc(l)}</div>`).join('')}</div>`, { className: 'vx-mapa-tip', direction: 'top', offset: [0, -6] });
      pontos.push([lat, lng]);
    }));
    if (pontos.length) mapa.fitBounds(pontos, { padding: [30, 30], maxZoom: 7 });
    const semCidade = fs.filter(f => !f.cidade || !f.uf).length, semGeo = fs.filter(f => f.cidade && f.uf && f.lat == null).length;
    if (resumo) resumo.textContent = `${fs.filter(f => f.lat != null).length} fornecedor(es) em ${Object.keys(porCidade).length} cidade(s)` + (semCidade ? ` · ${semCidade} sem cidade no cadastro` : '') + (semGeo ? ` · localizando ${semGeo}…` : '');
  };
  desenhar();
  setTimeout(() => mapa.invalidateSize(), 200);
  // cidades novas: localiza no OpenStreetMap (1 por segundo, no máximo 8 por vez) e guarda para todos
  const falta = [...new Map(fs.filter(f => f.cidade && f.uf && f.lat == null).map(f => [semAcento(f.cidade) + '|' + f.uf.toUpperCase(), f])).values()].slice(0, 8);
  for (const f of falta) {
    if (!document.body.contains(el)) return;
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&city=${encodeURIComponent(f.cidade)}&state=${encodeURIComponent(f.uf)}`, { headers: { 'Accept-Language': 'pt-BR' } }).then(x => x.json());
      if (r?.[0]) {
        const lat = Number(r[0].lat), lng = Number(r[0].lon);
        await api.rpc('salvar_geo_cidade', { p_cidade: f.cidade, p_uf: f.uf, p_lat: lat, p_lng: lng }).catch(() => {});
        fs.filter(x => x.cidade && semAcento(x.cidade) === semAcento(f.cidade) && (x.uf || '').toUpperCase() === f.uf.toUpperCase()).forEach(x => { x.lat = lat; x.lng = lng; });
        desenhar();
      }
    } catch { /* sem conexão com o serviço de mapas: tenta de novo na próxima vez */ }
    await new Promise(ok => setTimeout(ok, 1100));
  }
  if (resumo) desenhar();
}

// ===================== Painel do Financeiro =====================
rota('/financeiro/painel', async tela => {
  const [d, its] = await Promise.all([api.rpc('painel_financeiro'), api.rpc('painel_alertas_itens', { p_painel: 'financeiro' }).catch(() => ({}))]);
  const k = d.kpi, ms = pnCortarMeses(d.meses, ['pago', 'recebido', 'despesas', 'reembolsos', 'fundo']), cats = ms.map(m => pnMes(m.mes));
  const semanas = d.semanas.map((s, i) => ({ ...s, rot: i === 0 ? 'Vencidas' : pnDia(s.inicio) }));
  const AGING_COR = [PN_COR.atencao, PN_COR.serio, PN_COR.serio, PN_COR.critico, PN_COR.critico];
  const negativos = d.contas.filter(c => Number(c.saldo) < 0).length;
  const varPago = Number(k.pago_ant_ate_dia) > 0 ? (Number(k.pago_mes) - Number(k.pago_ant_ate_dia)) / Number(k.pago_ant_ate_dia) : null;
  tela.innerHTML = `${pnTopo('Financeiro', 'Caixa, contas a pagar e a receber, despesas e alertas', d)}
    ${pnFaixa([
      { ic: 'carteira', rot: 'Saldo em contas', valor: brl(k.saldo_contas), sub: negativos ? `${negativos} conta(s) negativa(s)` : 'bancos e caixa', link: '#/financeiro/projecao', nivel: Number(k.saldo_contas) < 0 ? 'critico' : '' },
      { ic: 'cartao', rot: 'A pagar em 30 dias', valor: brl(k.pagar_30), sub: `${brl(k.pagar_7)} nos próximos 7 dias`, link: '#/financeiro/pagar' },
      { ic: 'receber', rot: 'A receber em 30 dias', valor: brl(k.receber_30), sub: Number(k.vencidas_receber) ? `${brl(k.vencidas_receber)} vencido` : 'nada vencido', link: '#/financeiro/receber' },
      { ic: 'moedas', rot: 'Pago no mês', valor: brl(k.pago_mes), sub: varPago == null ? 'sem base de comparação' : `${varPago >= 0 ? '▲' : '▼'} ${Math.abs(Math.round(varPago * 100))}% vs mesmo período do mês anterior` }])}
    <div class="pn-kpis">
      ${pnKpi({ rot: 'Vencidas a pagar', valor: brl(k.vencidas_pagar), sub: `${k.vencidas_pagar_qtd} parcela(s) em atraso`, nivel: Number(k.vencidas_pagar) > 0 ? 'critico' : '', link: '#/financeiro/pagar' })}
      ${pnKpi({ rot: 'Fundo Fixo', valor: brl(k.saldo_fundo), sub: `${k.adiant_aberto_qtd} adiantamento(s) em aberto · ${brl(k.adiant_aberto)}`, nivel: Number(k.saldo_fundo) < 2000 ? 'atencao' : '', link: '#/financeiro/fundo' })}
      ${pnKpi({ rot: 'Despesas lançadas no mês', valor: brl(k.despesas_mes), delta: { atual: Number(k.despesas_mes), ant: Number(k.despesas_ant), rot: 'vs mês anterior', bomSubir: false } })}
      ${pnKpi({ rot: 'Juros e multas no mês', valor: brl(k.encargos_mes), sub: `${k.pagas_atraso_mes} paga(s) em atraso · ${brl(k.encargos_12m)} em 12 meses`, nivel: Number(k.encargos_mes) > 0 ? 'atencao' : '' })}
    </div>
    ${pnAlertas(d.alertas, its)}
    <div class="vx-grade">
      ${pnCartao('Fluxo de caixa mensal', 'Recebido × pago, com juros e multas', 'g-caixa', pnTabela(['Mês', 'Recebido', 'Pago', 'Diferença'], ms.map(m => [pnMes(m.mes), brl(m.recebido), brl(m.pago), brl(m.recebido - m.pago)])), { cls: 'vx-c8' })}
      ${pnCartao('Despesas por categoria', 'Últimos 6 meses', 'g-cat', pnTabela(['Categoria', 'Mês atual', 'Mês anterior', '6 meses'], d.categorias.map(c => [esc(c.nome), brl(c.atual), brl(c.anterior), brl(c.total)])), { cls: 'vx-c4' })}
      ${pnCartao('Maiores favorecidos', 'Pagos nos últimos 12 meses', 'g-forn', pnTabela(['Favorecido', 'Pagamentos', 'Total'], d.fornecedores.map(f => [esc(f.nome), pnInt(f.qtd), brl(f.total)])), { cls: 'vx-c4' })}
      ${pnMapaCartao('g-mapa', { cls: 'vx-c8' })}
      ${pnCartao('Próximas 8 semanas', 'A receber × a pagar em aberto, por semana de vencimento', 'g-semanas', pnTabela(['Semana', 'A receber', 'A pagar'], semanas.map((s, i) => [i === 0 ? 'Vencidas + semana atual' : 'Semana de ' + s.rot, brl(s.receber), brl(s.pagar)])), { cls: 'vx-c6' })}
      ${pnCartao('Vencidas a pagar por atraso', `${k.vencidas_pagar_qtd} parcela(s) · ${brl(k.vencidas_pagar)}`, 'g-aging', pnTabela(['Atraso', 'Parcelas', 'Valor'], d.aging.map(a => [esc(a.faixa), pnInt(a.qtd), brl(a.valor)])), { cls: 'vx-c6' })}
      ${pnCartao('Despesas lançadas por mês', 'Competência · contas a pagar', 'g-desp', pnTabela(['Mês', 'Despesas'], ms.map(m => [pnMes(m.mes), brl(m.despesas)])), { cls: 'vx-c4' })}
      ${pnCartao('Reembolsos e Fundo Fixo', 'Por mês', 'g-rf', pnTabela(['Mês', 'Reembolsos', 'Fundo Fixo'], ms.map(m => [pnMes(m.mes), brl(m.reembolsos), brl(m.fundo)])), { cls: 'vx-c4' })}
      ${pnCartao('Despesas por centro de custo', 'Últimos 6 meses', 'g-cc', pnTabela(['Centro de custo', 'Mês atual', '6 meses'], d.centros.map(c => [esc(c.nome), brl(c.atual), brl(c.total)])), { cls: 'vx-c4' })}
      ${pnCartao('Saldos das contas', 'Bancos, caixa e Fundo Fixo', 'g-contas', pnTabela(['Conta', 'Saldo'], d.contas.map(c => [esc(c.nome), brl(c.saldo)])), { cls: 'vx-c6' })}
      ${pnCartao('Juros e multas pagos', 'Custo do atraso, por mês', 'g-enc', pnTabela(['Mês', 'Juros + multa'], ms.map(m => [pnMes(m.mes), brl(m.encargos)])), { cls: 'vx-c6' })}
    </div>`;
  const hFix = (id, html) => [id, () => html];
  pnDesenhar(tela, [
    ['g-caixa', W => pnLegenda([[PN_COR.s1, 'Recebido'], [PN_COR.s2, 'Pago']]) + pnArea(W, { cats, series: [{ nome: 'Recebido', cor: PN_COR.s1, vals: ms.map(m => m.recebido) }, { nome: 'Pago', cor: PN_COR.s2, vals: ms.map(m => m.pago) }] })],
    hFix('g-cat', pnRosca(d.categorias.map(c => ({ nome: c.nome, valor: c.total })), { centroRot: '6 meses' })),
    hFix('g-forn', pnBarrasH(d.fornecedores.slice(0, 8).map(f => ({ nome: f.nome, valor: f.total, rot: 'Pago', sub: f.qtd + ' pagamento(s)' })))),
    ['g-semanas', W => pnLegenda([[PN_COR.s1, 'A receber'], [PN_COR.s2, 'A pagar']]) + pnColunas(W, { cats: semanas.map(s => s.rot), series: [{ nome: 'A receber', cor: PN_COR.s1, vals: semanas.map(s => s.receber) }, { nome: 'A pagar', cor: PN_COR.s2, vals: semanas.map(s => s.pagar) }] })],
    ['g-aging', W => pnColunas(W, { cats: d.aging.map(a => a.faixa), series: [{ nome: 'Valor vencido', cor: PN_COR.critico, vals: d.aging.map(a => a.valor) }], coresCat: AGING_COR, rotular: 'todos' })],
    ['g-desp', W => pnArea(W, { cats, series: [{ nome: 'Despesas', cor: PN_COR.marca, vals: ms.map(m => m.despesas) }], alt: 200 })],
    ['g-rf', W => pnLegenda([[PN_COR.s1, 'Reembolsos'], [PN_COR.s2, 'Fundo Fixo']]) + pnColunas(W, { cats, series: [{ nome: 'Reembolsos', cor: PN_COR.s1, vals: ms.map(m => m.reembolsos) }, { nome: 'Fundo Fixo', cor: PN_COR.s2, vals: ms.map(m => m.fundo) }], alt: 200 })],
    hFix('g-cc', pnRosca(d.centros.map(c => ({ nome: c.nome, valor: c.total })), { centroRot: '6 meses' })),
    hFix('g-contas', pnBarrasH(d.contas.map(c => ({ nome: c.nome, valor: c.saldo, rot: 'Saldo' })), { cor: PN_COR.s1 })),
    ['g-enc', W => pnColunas(W, { cats, series: [{ nome: 'Juros + multa', cor: PN_COR.serio, vals: ms.map(m => m.encargos) }], alt: 200 })],
  ]);
  pnMapa(tela.querySelector('#g-mapa'));
  pnLigarAlertas(tela);
  $('#pn-atualizar').onclick = () => navegar();
});

// ===================== Painel de Compras =====================
rota('/compras/painel', async tela => {
  const [d, its] = await Promise.all([api.rpc('painel_compras'), api.rpc('painel_alertas_itens', { p_painel: 'compras' }).catch(() => ({}))]);
  const k = d.kpi, ms = pnCortarMeses(d.meses, ['comprado', 'requisicoes', 'pedidos']), cats = ms.map(m => pnMes(m.mes));
  const varC = Number(k.comprado_ant_ate_dia) > 0 ? (Number(k.comprado_mes) - Number(k.comprado_ant_ate_dia)) / Number(k.comprado_ant_ate_dia) : null;
  tela.innerHTML = `${pnTopo('Compras', 'Requisições, cotações, pedidos, fornecedores e alertas', d)}
    ${pnFaixa([
      { ic: 'carrinho', rot: 'Comprado no mês', valor: brl(k.comprado_mes), sub: varC == null ? 'sem base de comparação' : `${varC >= 0 ? '▲' : '▼'} ${Math.abs(Math.round(varC * 100))}% vs mesmo período do mês anterior` },
      { ic: 'tendencia', rot: 'Comprado em 12 meses', valor: brl(k.comprado_12m), sub: `${k.pedidos_12m} pedido(s) · ticket médio ${brl(k.pedidos_12m ? k.comprado_12m / k.pedidos_12m : 0)}` },
      { ic: 'prancheta', rot: 'Requisições em aberto', valor: pnInt(k.req_abertas), sub: `${k.req_urgentes} urgente(s)`, link: '#/compras/requisicoes', nivel: k.req_urgentes > 0 ? 'atencao' : '' },
      { ic: 'caixa', rot: 'Pedidos a receber', valor: pnInt(k.a_receber), sub: brl(k.a_receber_valor), link: '#/compras/pedidos' }])}
    <div class="pn-kpis">
      ${pnKpi({ rot: 'Tempo médio requisição → pedido', valor: k.lead_time_90 != null ? Number(k.lead_time_90).toLocaleString('pt-BR') + ' dias' : '—', sub: 'últimos 90 dias' })}
      ${pnKpi({ rot: 'Economia nas cotações', valor: brl(k.economia_12m), sub: 'vencedora × maior proposta, 12 meses' })}
      ${pnKpi({ rot: 'Compras com 3+ orçamentos', valor: k.pct_3_orc != null ? k.pct_3_orc + '%' : '—', sub: 'das cotações aprovadas', nivel: k.pct_3_orc != null && k.pct_3_orc < 50 ? 'atencao' : '' })}
    </div>
    ${pnAlertas(d.alertas, its)}
    <div class="vx-grade">
      ${pnCartao('Valor comprado por mês', 'Pedidos emitidos (sem cancelados)', 'g-comp', pnTabela(['Mês', 'Pedidos', 'Valor'], ms.map(m => [pnMes(m.mes), pnInt(m.pedidos), brl(m.comprado)])), { cls: 'vx-c8' })}
      ${pnCartao('Compras por categoria', 'Últimos 12 meses', 'g-cat', pnTabela(['Categoria', 'Pedidos', 'Total'], d.categorias.map(c => [esc(c.nome), pnInt(c.qtd), brl(c.total)])), { cls: 'vx-c4' })}
      ${pnMapaCartao('g-mapa', { cls: 'vx-c8' })}
      ${pnCartao('Maiores fornecedores', 'Últimos 12 meses', 'g-forn', pnTabela(['Fornecedor', 'Pedidos', 'Total'], d.fornecedores.map(c => [esc(c.nome), pnInt(c.qtd), brl(c.total)])), { cls: 'vx-c4' })}
      ${pnCartao('Onde as requisições estão', 'Situação atual · quantidade', 'g-funil', pnTabela(['Etapa', 'Requisições', 'Valor estimado'], d.funil.map(f => [esc(f.etapa), pnInt(f.qtd), brl(f.valor)])), { cls: 'vx-c4' })}
      ${pnCartao('Requisições abertas × atendidas', 'Quantidade por mês', 'g-req', pnTabela(['Mês', 'Abertas', 'Atendidas'], ms.map(m => [pnMes(m.mes), pnInt(m.requisicoes), pnInt(m.atendidas)])), { cls: 'vx-c4' })}
      ${pnCartao('Compras por centro de custo', 'Últimos 12 meses', 'g-cc', pnTabela(['Centro de custo', 'Pedidos', 'Total'], d.centros.map(c => [esc(c.nome), pnInt(c.qtd), brl(c.total)])), { cls: 'vx-c4' })}
      ${pnCartao('Tempo médio requisição → pedido', 'Dias, por mês do pedido', 'g-lead', pnTabela(['Mês', 'Dias'], ms.map(m => [pnMes(m.mes), m.lead_time == null ? '—' : String(m.lead_time).replace('.', ',')])), { cls: 'vx-c6' })}
      ${pnCartao('Economia nas cotações por mês', 'Vencedora × maior proposta', 'g-eco', pnTabela(['Mês', 'Economia'], ms.map(m => [pnMes(m.mes), brl(m.economia)])), { cls: 'vx-c6' })}
    </div>`;
  const hFix = (id, html) => [id, () => html];
  pnDesenhar(tela, [
    ['g-comp', W => pnArea(W, { cats, series: [{ nome: 'Comprado', cor: PN_COR.marca, vals: ms.map(m => m.comprado) }] })],
    hFix('g-cat', pnRosca(d.categorias.map(c => ({ nome: c.nome, valor: c.total })), { centroRot: '12 meses' })),
    hFix('g-forn', pnBarrasH(d.fornecedores.slice(0, 8).map(c => ({ nome: c.nome, valor: c.total, rot: '12 meses', sub: c.qtd + ' pedido(s)' })))),
    hFix('g-funil', pnBarrasH(d.funil.map(f => ({ nome: f.etapa, valor: f.qtd, cor: PN_COR.s3, rot: 'Requisições', sub: 'Valor estimado: ' + brl(f.valor) })), { fmt: pnInt, fmtCurto: pnInt })),
    ['g-req', W => pnLegenda([[PN_COR.s3, 'Abertas'], [PN_COR.s1, 'Atendidas']]) + pnColunas(W, { cats, series: [{ nome: 'Abertas', cor: PN_COR.s3, vals: ms.map(m => m.requisicoes) }, { nome: 'Atendidas', cor: PN_COR.s1, vals: ms.map(m => m.atendidas) }], fmt: pnInt, fmtEixo: pnK, alt: 200 })],
    hFix('g-cc', pnRosca(d.centros.map(c => ({ nome: c.nome, valor: c.total })), { centroRot: '12 meses' })),
    ['g-lead', W => pnLinha(W, { cats, vals: ms.map(m => m.lead_time), nome: 'Dias', cor: PN_COR.s3, fmt: v => Number(v).toLocaleString('pt-BR') + ' d', alt: 200 })],
    ['g-eco', W => pnColunas(W, { cats, series: [{ nome: 'Economia', cor: PN_COR.s1, vals: ms.map(m => m.economia) }], alt: 200 })],
  ]);
  pnMapa(tela.querySelector('#g-mapa'));
  pnLigarAlertas(tela);
  $('#pn-atualizar').onclick = () => navegar();
});

// ===================== Visão executiva no Início =====================
// Financeiro/diretoria: caixa e contas · Compras: comprado e requisições · os dois: mapa dos fornecedores
async function vxInicio(caixa) {
  if (!caixa) return;
  const fin = veTudo(), comp = tem('administrador', 'comprador');
  if (!fin && !comp) { caixa.remove(); return; }
  try {
    const [f, c] = await Promise.all([fin ? api.rpc('painel_financeiro') : null, !fin && comp ? api.rpc('painel_compras') : null]);
    if (!document.body.contains(caixa)) return;
    let faixa, serie;
    if (f) {
      const k = f.kpi, ms = pnCortarMeses(f.meses, ['pago', 'recebido']).slice(-8);
      faixa = pnFaixa([
        { ic: 'carteira', rot: 'Saldo em contas', valor: brl(k.saldo_contas), sub: 'bancos e caixa', link: '#/financeiro/painel', nivel: Number(k.saldo_contas) < 0 ? 'critico' : '' },
        { ic: 'cartao', rot: 'A pagar em 30 dias', valor: brl(k.pagar_30), sub: Number(k.vencidas_pagar) ? `${brl(k.vencidas_pagar)} vencido` : 'nada vencido', link: '#/financeiro/pagar', nivel: Number(k.vencidas_pagar) > 0 ? 'critico' : '' },
        { ic: 'receber', rot: 'A receber em 30 dias', valor: brl(k.receber_30), sub: Number(k.vencidas_receber) ? `${brl(k.vencidas_receber)} vencido` : 'nada vencido', link: '#/financeiro/receber' },
        { ic: 'moedas', rot: 'Pago no mês', valor: brl(k.pago_mes), sub: `${brl(k.despesas_mes)} em despesas lançadas`, link: '#/financeiro/painel' }]);
      serie = { tit: 'Fluxo de caixa mensal', sub: 'Recebido × pago', leg: [[PN_COR.s1, 'Recebido'], [PN_COR.s2, 'Pago']], cats: ms.map(m => pnMes(m.mes)),
        series: [{ nome: 'Recebido', cor: PN_COR.s1, vals: ms.map(m => m.recebido) }, { nome: 'Pago', cor: PN_COR.s2, vals: ms.map(m => m.pago) }] };
    } else {
      const k = c.kpi, ms = pnCortarMeses(c.meses, ['comprado']).slice(-8);
      faixa = pnFaixa([
        { ic: 'carrinho', rot: 'Comprado no mês', valor: brl(k.comprado_mes), sub: `${brl(k.comprado_12m)} em 12 meses`, link: '#/compras/painel' },
        { ic: 'prancheta', rot: 'Requisições em aberto', valor: pnInt(k.req_abertas), sub: `${k.req_urgentes} urgente(s)`, link: '#/compras/requisicoes', nivel: k.req_urgentes > 0 ? 'atencao' : '' },
        { ic: 'caixa', rot: 'Pedidos a receber', valor: pnInt(k.a_receber), sub: brl(k.a_receber_valor), link: '#/compras/pedidos' },
        { ic: 'tendencia', rot: 'Economia nas cotações', valor: brl(k.economia_12m), sub: '12 meses', link: '#/compras/painel' }]);
      serie = { tit: 'Valor comprado por mês', sub: 'Pedidos emitidos', leg: null, cats: ms.map(m => pnMes(m.mes)), series: [{ nome: 'Comprado', cor: PN_COR.marca, vals: ms.map(m => m.comprado) }] };
    }
    caixa.innerHTML = `<div class="vx-ini-cab"><h2>Visão executiva</h2><a class="btn peq" href="${f ? '#/financeiro/painel' : '#/compras/painel'}">Abrir o painel completo</a></div>
      ${faixa}<div class="vx-grade">${pnCartao(serie.tit, serie.sub, 'vx-g-serie', '', { cls: 'vx-c6' })}${pnMapaCartao('vx-g-mapa', { cls: 'vx-c6' })}</div>`;
    pnDesenhar(caixa, [['vx-g-serie', W => (serie.leg ? pnLegenda(serie.leg) : '') + pnArea(W, { cats: serie.cats, series: serie.series, alt: 300 })]]);
    pnMapa(caixa.querySelector('#vx-g-mapa'));
  } catch (err) { console.error(err); caixa.remove(); }
}
