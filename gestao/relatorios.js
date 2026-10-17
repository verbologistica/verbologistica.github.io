// Verbo Gestão — Relatórios (PDF e Excel) de qualquer tela
// Lê o que está na tela (título, cartões de indicadores, filtros aplicados e a tabela já filtrada)
// e gera um relatório com a identidade da Verbo: cabeçalho, indicadores, resumos por agrupamento
// com barras, tabela completa com totais, rodapé com quem gerou e paginação.
'use strict';

const REL_COR = { verde: '#02654D', escuro: '#0C1D18', ouro: '#DDA936', claro: '#E2F0EB', cinza: '#5A6A77', borda: '#D7DFE5', zebra: '#F6F9F8' };
const RE_MOEDA = /^-?R\$\s?-?[\d.]+,\d{2}$/;
const RE_DATA = /^\d{2}\/\d{2}\/\d{4}$/;
const txtCel = el => { if (!el) return ''; const tags = el.querySelectorAll('.tag');
  if (tags.length > 1 && !el.querySelector('a, b')) return [...tags].map(t => t.innerText.trim()).filter(Boolean).join(' · ');
  return (el.innerText || '').replace(/\s*\n\s*/g, ' · ').replace(/\s+/g, ' ').trim(); };
const moedaNum = v => { const n = Number(String(v).replace(/[^\d,-]/g, '').replace(',', '.')); return isNaN(n) ? 0 : n; };
const dataISOdeBR = v => { const [d, m, a] = v.split('/'); return new Date(Number(a), Number(m) - 1, Number(d)); };

// ---------- Coleta ----------
function coletarRelatorio(tela, table) {
  const titulo = $('h1', tela)?.innerText.trim() || 'Relatório';
  const h2 = table.closest('.cartao')?.querySelector('h2')?.innerText.trim();
  const secao = h2 && h2 !== titulo ? h2 : '';
  const subtitulo = $('.topo .sub', tela)?.innerText.trim() || '';

  // colunas úteis (sem caixa de seleção e sem coluna só de botões)
  const ths = $$('thead th', table);
  const linhasEl = $$('tbody tr', table).filter(tr => !tr.hidden);
  const usar = ths.map((th, i) => {
    if (th.querySelector('input[type=checkbox]')) return false;
    const rot = th.innerText.trim();
    const temTexto = linhasEl.some(tr => txtCel(tr.children[i]) && !tr.children[i]?.querySelector('input[type=checkbox]'));
    return !!(rot || temTexto) && !(linhasEl.length && linhasEl.every(tr => !txtCel(tr.children[i]) || tr.children[i]?.querySelector('button, input[type=checkbox]')));
  });
  const colunas = ths.map((th, i) => ({ i, nome: th.innerText.trim() || ' ' })).filter(c => usar[c.i]);
  const linhas = linhasEl.map(tr => colunas.map(c => txtCel(tr.children[c.i])));
  // tipo de cada coluna
  colunas.forEach((c, k) => {
    const vals = linhas.map(l => l[k]).filter(Boolean);
    const frac = re => vals.length ? vals.filter(v => re.test(v)).length / vals.length : 0;
    c.tipo = frac(RE_MOEDA) >= .8 ? 'moeda' : frac(RE_DATA) >= .8 ? 'data' : 'texto';
  });
  const totais = colunas.map((c, k) => c.tipo === 'moeda' ? linhas.reduce((s, l) => s + moedaNum(l[k]), 0) : null);

  // cartões de indicadores da tela
  const kpis = $$('.kpi', tela).filter(k => !k.closest('.modal') && !k.closest('[hidden]')).map(k => ({
    valor: ($('.n', k)?.innerText || '').trim(), rotulo: ($('.r', k)?.innerText || '').trim(), alerta: k.classList.contains('alerta') })).filter(k => k.valor);

  // filtros aplicados (da barra de filtros da tela e do formulário de busca)
  const filtros = [];
  $$('.filtro-local [data-fl]', tela).forEach(i => {
    if (!i.value) return;
    if (i.tagName === 'SELECT') filtros.push(i.selectedOptions[0].text);
    else if (i.type === 'date') filtros.push(`${i.dataset.fl === 'de' ? 'De' : 'Até'} ${dataBR(i.value)}`);
    else filtros.push(`Busca: “${i.value}”`);
  });
  $$('form.filtros', tela).forEach(f => [...f.elements].forEach(i => {
    if (!i.name || !i.value) return;
    if (i.tagName === 'SELECT') { if (i.selectedIndex > 0 || !/todos|qualquer/i.test(i.selectedOptions[0]?.text || '')) filtros.push(i.selectedOptions[0].text); }
    else if (i.type === 'date') filtros.push(`${/ate|fim/.test(i.name) ? 'Até' : 'De'} ${dataBR(i.value)}`);
    else if (i.type !== 'hidden') filtros.push(`Busca: “${i.value}”`);
  }));

  // resumos automáticos: colunas de texto com poucos valores diferentes (colaborador, categoria, situação…)
  const kValor = colunas.findIndex(c => c.tipo === 'moeda' && /valor|saldo|total|sa[ií]da/i.test(c.nome));
  const kV = kValor >= 0 ? kValor : colunas.findIndex(c => c.tipo === 'moeda');
  const resumos = [];
  if (linhas.length >= 3) {
    colunas.forEach((c, k) => {
      if (c.tipo !== 'texto' || /^n[ºo°]|descri|motivo|observa|t[ií]tulo$/i.test(c.nome)) return;
      const grupos = {};
      linhas.forEach(l => { const g = l[k] || '—'; (grupos[g] ||= { n: 0, v: 0 }); grupos[g].n++; if (kV >= 0) grupos[g].v += moedaNum(l[kV]); });
      const qtd = Object.keys(grupos).length;
      if (qtd < 2 || qtd > 15 || qtd > linhas.length * .7) return;
      resumos.push({ nome: c.nome, itens: Object.entries(grupos).map(([g, x]) => ({ g, ...x })).sort((a, b) => (b.v - a.v) || (b.n - a.n)) });
    });
  }
  return { titulo, secao, subtitulo, colunas, linhas, totais, kpis, filtros, resumos: resumos.slice(0, 3), kV,
           nomeValor: kV >= 0 ? colunas[kV].nome : '' };
}

// ---------- PDF ----------
async function exportarPDF(table, titulo, subtitulo) {
  const tela = table.closest('#tela') || document;
  const R = coletarRelatorio(tela, table);
  const ctx = await contextoDocumento(null).catch(() => ({ empresa: {} }));
  const emp = ctx.empresa || {};
  const logo = location.origin + location.pathname.replace(/[^/]*$/, '') + 'logo.png';
  const agora = dataHoraBR(new Date().toISOString());
  const nomeRel = R.secao ? `${R.titulo} — ${R.secao}` : R.titulo;
  const totalGeral = R.kV >= 0 ? R.totais[R.kV] : null;
  const temTotais = R.totais.some(t => t != null);

  const kpisHtml = [
    ...R.kpis.map(k => `<div class="kpi ${k.alerta ? 'alerta' : ''}"><div class="v">${esc(k.valor)}</div><div class="r">${esc(k.rotulo)}</div></div>`),
    ...(R.kpis.length ? [] : [`<div class="kpi"><div class="v">${R.linhas.length}</div><div class="r">registro(s)</div></div>`,
        totalGeral != null ? `<div class="kpi destaque"><div class="v">${brl(totalGeral)}</div><div class="r">total · ${esc(R.nomeValor.toLowerCase())}</div></div>` : ''])
  ].join('');

  const resumosHtml = R.resumos.map(rs => {
    const max = Math.max(...rs.itens.map(i => R.kV >= 0 ? Math.abs(i.v) : i.n), 1);
    const tot = rs.itens.reduce((s, i) => s + (R.kV >= 0 ? i.v : i.n), 0) || 1;
    return `<div class="resumo"><h3>Por ${esc(rs.nome.toLowerCase())}</h3><table><tbody>${rs.itens.map(i => {
      const base = R.kV >= 0 ? i.v : i.n;
      return `<tr><td class="g">${esc(i.g)}</td><td class="barra"><span style="width:${Math.max(2, Math.abs(base) / max * 100).toFixed(1)}%"></span></td>
        <td class="n">${i.n}</td>${R.kV >= 0 ? `<td class="m">${brl(i.v)}</td>` : ''}<td class="p">${(base / tot * 100).toFixed(1).replace('.', ',')}%</td></tr>`; }).join('')}
      </tbody></table></div>`;
  }).join('');

  const tabelaHtml = `<table class="dados"><thead><tr>${R.colunas.map(c => `<th class="${c.tipo}">${esc(c.nome)}</th>`).join('')}</tr></thead>
    <tbody>${R.linhas.map(l => `<tr>${l.map((v, k) => `<td class="${R.colunas[k].tipo}">${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody>
    ${temTotais ? `<tfoot><tr>${R.colunas.map((c, k) => `<td class="${c.tipo}">${k === 0 ? `Total · ${R.linhas.length} registro(s)` : R.totais[k] != null ? brl(R.totais[k]) : ''}</td>`).join('')}</tr></tfoot>` : ''}</table>`;

  const css = `
    @page { size: A4 landscape; margin: 12mm 12mm 16mm;
      @bottom-left { content: "${esc(emp.nome_fantasia || 'Verbo Logística').replace(/"/g, '')} · ${esc(nomeRel).replace(/"/g, '')}"; font: 8px Arial; color: #7a8892; }
      @bottom-right { content: "Página " counter(page) " de " counter(pages); font: 8px Arial; color: #7a8892; } }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: "Segoe UI", Arial, Helvetica, sans-serif; color: #0E1E2B; font-size: 10.5px; margin: 0; }
    .cab { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 0 0 10px; border-bottom: 3px solid ${REL_COR.verde}; position: relative; }
    .cab:after { content: ""; position: absolute; left: 0; bottom: -3px; width: 90px; height: 3px; background: ${REL_COR.ouro}; }
    .cab img { height: 42px; }
    .cab .emp { text-align: right; font-size: 9.5px; color: ${REL_COR.cinza}; line-height: 1.45; }
    .cab .emp b { color: #0E1E2B; font-size: 11px; }
    .tit { display: flex; justify-content: space-between; align-items: flex-end; margin: 16px 0 10px; gap: 20px; }
    .tit .eyebrow { font-size: 9px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: ${REL_COR.ouro}; }
    .tit h1 { font-size: 21px; margin: 2px 0 0; color: ${REL_COR.escuro}; letter-spacing: -.01em; }
    .tit .sub { color: ${REL_COR.cinza}; margin-top: 3px; }
    .tit .meta { text-align: right; font-size: 9.5px; color: ${REL_COR.cinza}; white-space: nowrap; }
    .tit .meta b { display: block; color: #0E1E2B; font-size: 11px; }
    .chips { margin: 0 0 12px; display: flex; flex-wrap: wrap; gap: 5px; align-items: center; font-size: 9.5px; color: ${REL_COR.cinza}; }
    .chips span.c { background: ${REL_COR.claro}; color: ${REL_COR.verde}; border-radius: 99px; padding: 2px 9px; font-weight: 600; }
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; margin-bottom: 14px; }
    .kpi { border: 1px solid ${REL_COR.borda}; border-radius: 8px; padding: 9px 11px; background: #fff; border-top: 3px solid ${REL_COR.verde}; break-inside: avoid; }
    .kpi .v { font-size: 16px; font-weight: 700; color: ${REL_COR.escuro}; font-variant-numeric: tabular-nums; }
    .kpi .r { font-size: 9px; color: ${REL_COR.cinza}; text-transform: uppercase; letter-spacing: .04em; margin-top: 2px; }
    .kpi.alerta { border-top-color: #b42318; } .kpi.alerta .v { color: #b42318; }
    .kpi.destaque { background: ${REL_COR.escuro}; border-color: ${REL_COR.escuro}; border-top-color: ${REL_COR.ouro}; } .kpi.destaque .v { color: #fff; } .kpi.destaque .r { color: #c9d5d1; }
    .resumos { display: grid; grid-template-columns: repeat(${Math.min(3, Math.max(1, R.resumos.length))}, 1fr); gap: 10px; margin-bottom: 14px; }
    .resumo { border: 1px solid ${REL_COR.borda}; border-radius: 8px; padding: 9px 11px; break-inside: avoid; }
    .resumo h3 { margin: 0 0 6px; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: ${REL_COR.verde}; }
    .resumo table { width: 100%; border-collapse: collapse; }
    .resumo td { padding: 3px 4px; border-bottom: 1px solid #eef2f1; font-size: 9.5px; vertical-align: middle; }
    .resumo td.g { max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .resumo td.barra { width: 32%; } .resumo td.barra span { display: block; height: 7px; border-radius: 4px; background: linear-gradient(90deg, ${REL_COR.verde}, #2f9b7e); }
    .resumo td.n, .resumo td.m, .resumo td.p { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .resumo td.p { color: ${REL_COR.cinza}; }
    h2.sec { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: ${REL_COR.verde}; margin: 4px 0 6px; }
    table.dados { width: 100%; border-collapse: collapse; font-size: 9.5px; }
    table.dados thead { display: table-header-group; }
    table.dados th { background: ${REL_COR.escuro}; color: #fff; text-align: left; padding: 6px 7px; font-size: 8.5px; text-transform: uppercase; letter-spacing: .05em; }
    table.dados th:first-child { border-top-left-radius: 6px; } table.dados th:last-child { border-top-right-radius: 6px; }
    table.dados td { padding: 5px 7px; border-bottom: 1px solid #e6ecea; vertical-align: top; }
    table.dados tbody tr:nth-child(even) td { background: ${REL_COR.zebra}; }
    table.dados tr { break-inside: avoid; }
    table.dados .moeda { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    table.dados .data { white-space: nowrap; }
    table.dados tfoot td { background: ${REL_COR.claro}; font-weight: 700; color: ${REL_COR.escuro}; border-top: 2px solid ${REL_COR.verde}; border-bottom: 0; }
    .vazio { padding: 30px; text-align: center; color: ${REL_COR.cinza}; border: 1px dashed ${REL_COR.borda}; border-radius: 8px; }
    .rod { margin-top: 14px; font-size: 8.5px; color: #8a979f; display: flex; justify-content: space-between; border-top: 1px solid #e6ecea; padding-top: 6px; }
    @media screen { body { margin: 24px auto; max-width: 1180px; padding: 0 16px; } }`;
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(nomeRel)} · ${dataBR(hojeISO())}</title><style>${css}</style></head><body>
    <div class="cab"><img src="${logo}" alt="">
      <div class="emp"><b>${esc(emp.razao_social || emp.nome_fantasia || 'Verbo Logística')}</b>${emp.cnpj ? '<br>CNPJ ' + esc(emp.cnpj) : ''}${emp.cidade ? '<br>' + esc([emp.cidade, emp.uf].filter(Boolean).join('/')) : ''}</div></div>
    <div class="tit"><div><div class="eyebrow">Relatório gerencial</div><h1>${esc(nomeRel)}</h1>${R.subtitulo || subtitulo ? `<div class="sub">${esc(R.subtitulo || subtitulo)}</div>` : ''}</div>
      <div class="meta">Gerado em<b>${agora}</b>por ${esc(estado.usuario.nome)}</div></div>
    <div class="chips">${R.filtros.length ? 'Filtros aplicados: ' + R.filtros.map(f => `<span class="c">${esc(f)}</span>`).join('') : '<span>Sem filtros — todos os registros da tela</span>'}</div>
    ${kpisHtml ? `<div class="kpis">${kpisHtml}</div>` : ''}
    ${resumosHtml ? `<div class="resumos">${resumosHtml}</div>` : ''}
    <h2 class="sec">Detalhamento · ${R.linhas.length} registro(s)</h2>
    ${R.linhas.length ? tabelaHtml : '<div class="vazio">Nenhum registro com os filtros aplicados.</div>'}
    <div class="rod"><span>Verbo Gestão · documento gerado pelo sistema</span><span>${agora} · ${esc(estado.usuario.nome)}</span></div>
    <script>window.onload=()=>setTimeout(()=>window.print(),400)<\/script></body></html>`;
  const w = window.open('', '_blank'); if (!w) return aviso('Libere as janelas pop-up para gerar o PDF.', true);
  w.document.write(html); w.document.close();
}

// ---------- Excel ----------
async function exportarExcel(table, titulo) {
  await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js');
  const tela = table.closest('#tela') || document;
  const R = coletarRelatorio(tela, table);
  const ctx = await contextoDocumento(null).catch(() => ({ empresa: {} }));
  const emp = ctx.empresa || {};
  const nomeRel = R.secao ? `${R.titulo} — ${R.secao}` : R.titulo;
  const wb = new ExcelJS.Workbook(); wb.creator = estado.usuario.nome; wb.created = new Date();
  const fill = c => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + c.replace('#', '') } });
  const borda = { top: { style: 'thin', color: { argb: 'FFD7DFE5' } }, bottom: { style: 'thin', color: { argb: 'FFD7DFE5' } }, left: { style: 'thin', color: { argb: 'FFD7DFE5' } }, right: { style: 'thin', color: { argb: 'FFD7DFE5' } } };
  const FMT_MOEDA = '"R$" #,##0.00;[Red]-"R$" #,##0.00';
  const ncol = Math.max(R.colunas.length, 4);
  let logoId = null;
  try { const b = await (await fetch('logo.png')).arrayBuffer(); logoId = wb.addImage({ buffer: b, extension: 'png' }); } catch { /* sem logo */ }

  // --- Aba principal
  const ws = wb.addWorksheet('Relatório', { views: [{ showGridLines: false }], pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 } });
  ws.mergeCells(1, 1, 3, 2); if (logoId != null) ws.addImage(logoId, { tl: { col: 0.15, row: 0.2 }, ext: { width: 150, height: 44 } });
  ws.mergeCells(1, 3, 1, ncol); ws.getCell(1, 3).value = nomeRel;
  ws.getCell(1, 3).font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF0C1D18' } };
  ws.mergeCells(2, 3, 2, ncol); ws.getCell(2, 3).value = [emp.razao_social || emp.nome_fantasia || 'Verbo Logística', emp.cnpj && 'CNPJ ' + emp.cnpj].filter(Boolean).join(' · ');
  ws.getCell(2, 3).font = { size: 10, color: { argb: 'FF5A6A77' } };
  ws.mergeCells(3, 3, 3, ncol); ws.getCell(3, 3).value = `Gerado em ${dataHoraBR(new Date().toISOString())} por ${estado.usuario.nome}${R.subtitulo ? ' · ' + R.subtitulo : ''}`;
  ws.getCell(3, 3).font = { size: 9, italic: true, color: { argb: 'FF5A6A77' } };
  ws.getRow(1).height = 24; ws.getRow(2).height = 16; ws.getRow(3).height = 16;
  for (let c = 1; c <= ncol; c++) ws.getCell(4, c).border = { bottom: { style: 'medium', color: { argb: 'FF02654D' } } };
  let lin = 6;
  ws.mergeCells(lin, 1, lin, ncol);
  ws.getCell(lin, 1).value = R.filtros.length ? 'Filtros aplicados: ' + R.filtros.join(' · ') : 'Sem filtros — todos os registros da tela';
  ws.getCell(lin, 1).font = { size: 9, color: { argb: 'FF02654D' }, bold: true };
  lin += 2;

  // indicadores em "cartões"
  const kpis = R.kpis.length ? R.kpis : [{ valor: String(R.linhas.length), rotulo: 'registro(s)' }, ...(R.kV >= 0 ? [{ valor: brl(R.totais[R.kV]), rotulo: 'total · ' + R.nomeValor.toLowerCase() }] : [])];
  const porLinha = Math.min(kpis.length, Math.max(2, Math.floor(ncol / 2)));
  for (let i = 0; i < kpis.length; i += porLinha) {
    kpis.slice(i, i + porLinha).forEach((k, j) => {
      const c = 1 + j * 2;
      ws.mergeCells(lin, c, lin, c + 1); ws.mergeCells(lin + 1, c, lin + 1, c + 1);
      const cv = ws.getCell(lin, c), cr = ws.getCell(lin + 1, c);
      const num = RE_MOEDA.test(k.valor) ? moedaNum(k.valor) : null;
      cv.value = num != null ? num : k.valor; if (num != null) cv.numFmt = FMT_MOEDA;
      cv.font = { size: 14, bold: true, color: { argb: k.alerta ? 'FFB42318' : 'FF0C1D18' } };
      cr.value = k.rotulo.toUpperCase(); cr.font = { size: 8, color: { argb: 'FF5A6A77' } };
      [cv, cr].forEach(x => { x.fill = fill('#F2F7F5'); x.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true }; });
      cv.border = { top: { style: 'thick', color: { argb: k.alerta ? 'FFB42318' : 'FF02654D' } } };
    });
    ws.getRow(lin).height = 24; ws.getRow(lin + 1).height = 18; lin += 3;
  }

  // tabela de dados
  const iniTab = lin;
  const cab = ws.getRow(lin); R.colunas.forEach((c, k) => { const x = cab.getCell(k + 1); x.value = c.nome.toUpperCase();
    x.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 }; x.fill = fill(REL_COR.escuro); x.alignment = { vertical: 'middle', horizontal: c.tipo === 'moeda' ? 'right' : 'left', wrapText: true }; x.border = borda; });
  cab.height = 22; lin++;
  R.linhas.forEach((l, n) => {
    const row = ws.getRow(lin);
    l.forEach((v, k) => {
      const x = row.getCell(k + 1), t = R.colunas[k].tipo;
      if (t === 'moeda' && v) { x.value = moedaNum(v); x.numFmt = FMT_MOEDA; x.alignment = { horizontal: 'right' }; }
      else if (t === 'data' && RE_DATA.test(v)) { x.value = dataISOdeBR(v); x.numFmt = 'dd/mm/yyyy'; }
      else x.value = v;
      x.border = borda; x.font = { size: 10 };
      if (n % 2) x.fill = fill(REL_COR.zebra);
      if (t === 'texto') x.alignment = { wrapText: v.length > 40, vertical: 'top' };
    });
    lin++;
  });
  if (R.totais.some(t => t != null) && R.linhas.length) {
    const row = ws.getRow(lin);
    R.colunas.forEach((c, k) => { const x = row.getCell(k + 1);
      if (k === 0) x.value = `TOTAL · ${R.linhas.length} registro(s)`;
      else if (R.totais[k] != null) { const L = ws.getColumn(k + 1).letter; x.value = { formula: `SUBTOTAL(9,${L}${iniTab + 1}:${L}${lin - 1})`, result: R.totais[k] }; x.numFmt = FMT_MOEDA; x.alignment = { horizontal: 'right' }; }
      x.font = { bold: true, color: { argb: 'FF0C1D18' } }; x.fill = fill(REL_COR.claro); x.border = { top: { style: 'medium', color: { argb: 'FF02654D' } } }; });
    lin++;
  }
  if (R.linhas.length) { ws.autoFilter = { from: { row: iniTab, column: 1 }, to: { row: iniTab + R.linhas.length, column: R.colunas.length } };
                         ws.views = [{ showGridLines: false, state: 'frozen', ySplit: iniTab }]; }
  R.colunas.forEach((c, k) => { const larg = Math.max(c.nome.length + 2, ...R.linhas.slice(0, 400).map(l => (l[k] || '').length * (c.tipo === 'texto' ? 1 : 1.1)));
    ws.getColumn(k + 1).width = Math.min(c.tipo === 'texto' ? 55 : 18, Math.max(c.tipo === 'moeda' ? 15 : 10, larg)); });
  for (let c = R.colunas.length + 1; c <= ncol; c++) ws.getColumn(c).width = 14;

  // --- Aba de resumos
  if (R.resumos.length) {
    const rs = wb.addWorksheet('Resumo', { views: [{ showGridLines: false }] });
    rs.getCell('A1').value = `${nomeRel} — resumo`; rs.getCell('A1').font = { size: 14, bold: true, color: { argb: 'FF0C1D18' } };
    let r = 3;
    R.resumos.forEach(g => {
      rs.getCell(r, 1).value = 'POR ' + g.nome.toUpperCase(); rs.getCell(r, 1).font = { bold: true, color: { argb: 'FF02654D' } }; r++;
      ['Agrupamento', 'Qtde', ...(R.kV >= 0 ? [R.nomeValor] : []), '% do total'].forEach((h, k) => { const x = rs.getCell(r, k + 1); x.value = h.toUpperCase();
        x.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 }; x.fill = fill(REL_COR.escuro); x.border = borda; });
      const ini = r + 1; r++;
      const tot = g.itens.reduce((s, i) => s + (R.kV >= 0 ? i.v : i.n), 0) || 1;
      g.itens.forEach((i, n) => {
        const vals = [i.g, i.n, ...(R.kV >= 0 ? [i.v] : []), (R.kV >= 0 ? i.v : i.n) / tot];
        vals.forEach((v, k) => { const x = rs.getCell(r, k + 1); x.value = v; x.border = borda; if (n % 2) x.fill = fill(REL_COR.zebra);
          if (R.kV >= 0 && k === 2) x.numFmt = FMT_MOEDA; if (k === vals.length - 1) x.numFmt = '0.0%'; });
        r++;
      });
      // barras de dados no valor
      const colV = R.kV >= 0 ? 'C' : 'B';
      rs.addConditionalFormatting({ ref: `${colV}${ini}:${colV}${r - 1}`, rules: [{ type: 'dataBar', cfvo: [{ type: 'min' }, { type: 'max' }], color: { argb: 'FF02654D' }, gradient: true }] });
      r += 2;
    });
    rs.getColumn(1).width = 42; rs.getColumn(2).width = 10; rs.getColumn(3).width = 18; rs.getColumn(4).width = 12;
  }

  const buf = await wb.xlsx.writeBuffer();
  baixarArquivo(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${nomeRel.replace(/[\\/:*?"<>|]/g, '')} ${hojeISO()}.xlsx`);
}

// Botões em cima de cada tabela (substitui a versão simples)
function ferramentasExportacao(tela) {
  $$('.tabela-wrap', tela).forEach(w => {
    if (w.previousElementSibling?.classList.contains('exportar') || w.closest('.modal') || w.closest('.resumo-gestao')) return;
    const t = $('table', w); if (!t || $$('tbody tr', t).length === 0) return;
    const barra = document.createElement('div'); barra.className = 'exportar';
    barra.innerHTML = '<button type="button" class="btn peq" data-x="xls" title="Planilha com indicadores, filtros, totais e resumo">⬇ Excel</button><button type="button" class="btn peq" data-x="pdf" title="Relatório pronto para imprimir ou salvar em PDF">⬇ PDF</button>';
    barra.onclick = async e => { const b = e.target.closest('[data-x]'); if (!b) return;
      await ocupado(b, async () => { try { b.dataset.x === 'xls' ? await exportarExcel(t) : await exportarPDF(t); } catch (err) { falha(err); } }); };
    w.before(barra);
  });
}
