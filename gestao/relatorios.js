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
  $$('.filtro-local .flm', tela).forEach(m => { const v = $$('.flm-ops input:checked', m).map(c => c.value); if (v.length) filtros.push(`${m.dataset.rot}: ${v.join(', ')}`); });
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
// Papel timbrado da Verbo (mesma moldura dos documentos), em paisagem, gerado direto em PDF:
// imagens em alta resolução, cabeçalho e rodapé em todas as páginas e "Página x de y".
async function exportarPDF(table, titulo, subtitulo) {
  const tela = table.closest('#tela') || document;
  const R = coletarRelatorio(tela, table);
  // CNPJ que emite (dados do cadastro da empresa); com mais de um CNPJ, pergunta
  const es = await empresasL().catch(() => []);
  let E = es[0] || {};
  if (es.length > 1) {
    const r = await modal(`<form><h2>Relatório em PDF</h2><div class="form"><label class="campo largo">CNPJ que emite<select name="empresa">${es.map(e => `<option value="${e.id}">${esc(rotEmpresa(e))}</option>`).join('')}</select></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Gerar PDF</button></div></form>`);
    if (!r) return; E = es.find(e => e.id === r.empresa) || E;
  }
  await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
  const IMG = await imagensTimbrado(true);
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const W = 297, ML = 20, MR = W - 20, TOPO = 40, BASE = 182;
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const C = { texto: [37, 46, 53], cinza: [107, 115, 120], ouro: hex(REL_COR.ouro), verde: hex(REL_COR.verde), escuro: hex(REL_COR.escuro), claro: hex(REL_COR.claro), borda: hex(REL_COR.borda), zebra: hex(REL_COR.zebra) };
  const desenhadas = new Set();
  const moldura = () => { const pg = doc.getCurrentPageInfo().pageNumber; if (desenhadas.has(pg)) return; desenhadas.add(pg); molduraTimbrado(doc, E, IMG); };
  const agora = dataHoraBR(new Date().toISOString());
  const nomeRel = R.secao ? `${R.titulo} — ${R.secao}` : R.titulo;
  const totalGeral = R.kV >= 0 ? R.totais[R.kV] : null;

  moldura();
  // faixa de identificação (como "Correspondência oficial" do modelo)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...C.ouro);
  const rot = 'RELATÓRIO GERENCIAL'; let px = MR - [...rot].reduce((w, ch) => w + doc.getTextWidth(ch) + 1.5, 0) + 1.5;
  for (const ch of rot) { doc.text(ch, px, 36); px += doc.getTextWidth(ch) + 1.5; }
  let y = 44;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...C.texto);
  const tl = doc.splitTextToSize(nomeRel, 180); doc.text(tl, ML, y); y += tl.length * 6;
  const sub = R.subtitulo || subtitulo;
  if (sub) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...C.cinza); const sl = doc.splitTextToSize(sub, 180); doc.text(sl, ML, y); y += sl.length * 4.2; }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...C.cinza);
  doc.text(`Gerado em ${agora}`, MR, 44, { align: 'right' }); doc.text(`por ${estado.usuario?.nome || ''}`, MR, 48, { align: 'right' });
  y += 1;
  const fl = doc.splitTextToSize(R.filtros.length ? 'Filtros aplicados: ' + R.filtros.join(' · ') : 'Sem filtros — todos os registros da tela', MR - ML);
  doc.setFontSize(8); doc.text(fl, ML, y); y += fl.length * 3.8 + 3;
  doc.setDrawColor(...C.borda); doc.setLineWidth(0.2); doc.line(ML, y - 1.5, MR, y - 1.5); y += 2;

  // indicadores
  const kpis = R.kpis.length ? R.kpis.map(k => ({ v: k.valor, r: k.rotulo, alerta: k.alerta }))
    : [{ v: String(R.linhas.length), r: 'registro(s)' }, ...(totalGeral != null ? [{ v: brl(totalGeral), r: 'total · ' + R.nomeValor.toLowerCase(), destaque: true }] : [])];
  if (kpis.length) {
    const porLinha = Math.min(6, kpis.length), gap = 4, kw = (MR - ML - gap * (porLinha - 1)) / porLinha, kh = 15;
    kpis.forEach((k, i) => {
      const col = i % porLinha; if (i && !col) y += kh + gap;
      const x = ML + col * (kw + gap);
      doc.setFillColor(...(k.destaque ? C.escuro : [255, 255, 255])); doc.setDrawColor(...C.borda); doc.setLineWidth(0.2); doc.roundedRect(x, y, kw, kh, 1.5, 1.5, 'FD');
      doc.setFillColor(...(k.alerta ? [180, 35, 24] : k.destaque ? C.ouro : C.verde)); doc.rect(x, y, kw, 0.9, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...(k.destaque ? [255, 255, 255] : k.alerta ? [180, 35, 24] : C.escuro));
      doc.text(doc.splitTextToSize(k.v, kw - 6)[0], x + 3, y + 7);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...(k.destaque ? [201, 213, 209] : C.cinza));
      doc.text(doc.splitTextToSize(k.r.toUpperCase(), kw - 6)[0], x + 3, y + 11.8);
    });
    y += kh + 6;
  }

  // resumos por agrupamento (até 3, lado a lado, com barras)
  if (R.resumos.length && y < BASE - 45) {
    const nR = R.resumos.length, gap = 5, rw = (MR - ML - gap * (nR - 1)) / nR; let fim = y;
    R.resumos.forEach((rs, k) => {
      const max = Math.max(...rs.itens.map(i => R.kV >= 0 ? Math.abs(i.v) : i.n), 1);
      const tot = rs.itens.reduce((s, i) => s + (R.kV >= 0 ? i.v : i.n), 0) || 1;
      const cabe = Math.max(3, Math.floor((BASE - y - 10) / 4.6));
      const itens = rs.itens.length > cabe ? [...rs.itens.slice(0, cabe - 1), rs.itens.slice(cabe - 1).reduce((a, i) => ({ g: 'Outros', n: a.n + i.n, v: a.v + i.v }), { g: 'Outros', n: 0, v: 0 })] : rs.itens;
      const body = itens.map(i => { const b = R.kV >= 0 ? i.v : i.n; return [i.g, Math.min(100, Math.max(2, Math.abs(b) / max * 100)), String(i.n), ...(R.kV >= 0 ? [brl(i.v)] : []), (b / tot * 100).toFixed(1).replace('.', ',') + '%']; });
      doc.autoTable({ startY: y, margin: { left: ML + k * (rw + gap), right: W - (ML + k * (rw + gap) + rw), top: TOPO, bottom: 210 - BASE }, tableWidth: rw, pageBreak: 'avoid',
        head: [[{ content: 'Por ' + rs.nome.toLowerCase(), colSpan: R.kV >= 0 ? 5 : 4 }]], body, theme: 'plain',
        styles: { font: 'helvetica', fontSize: 7.5, textColor: C.texto, cellPadding: { top: 1.1, bottom: 1.1, left: 1.5, right: 1.5 }, overflow: 'ellipsize' },
        headStyles: { textColor: C.verde, fontStyle: 'bold', fontSize: 7.5, lineWidth: { bottom: 0.3 }, lineColor: C.verde },
        columnStyles: { 0: { cellWidth: rw * .34 }, 1: { cellWidth: rw * .22 }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right', textColor: C.cinza } },
        didParseCell: d => { if (d.section === 'body' && d.column.index === 1) d.cell.text = ['']; },
        didDrawCell: d => { if (d.section === 'body' && d.column.index === 1) { const pct = Number(d.row.raw[1]) / 100;
          doc.setFillColor(...C.verde); doc.roundedRect(d.cell.x + 1, d.cell.y + d.cell.height / 2 - 1.1, Math.max(0.8, (d.cell.width - 2) * pct), 2.2, 1, 1, 'F'); } },
        willDrawPage: moldura });
      fim = Math.max(fim, doc.lastAutoTable.finalY);
    });
    y = fim + 7;
  }

  // detalhamento
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...C.verde);
  if (y > BASE - 20) { doc.addPage(); moldura(); y = TOPO + 4; }
  doc.text(`DETALHAMENTO · ${R.linhas.length} REGISTRO(S)`, ML, y); y += 2.5;
  const colSt = {}; R.colunas.forEach((c, k) => { colSt[k] = c.tipo === 'moeda' ? { halign: 'right', cellWidth: 'wrap' } : c.tipo === 'data' ? { cellWidth: 'wrap' } : {}; });
  const temTotais = R.totais.some(t => t != null);
  doc.autoTable({ startY: y, margin: { left: ML, right: W - MR, top: TOPO, bottom: 210 - BASE },
    head: [R.colunas.map(c => c.nome.toUpperCase())], body: R.linhas.length ? R.linhas : [[{ content: 'Nenhum registro com os filtros aplicados.', colSpan: R.colunas.length, styles: { halign: 'center', textColor: C.cinza } }]],
    foot: temTotais && R.linhas.length ? [R.colunas.map((c, k) => k === 0 ? `Total · ${R.linhas.length} registro(s)` : R.totais[k] != null ? brl(R.totais[k]) : '')] : undefined,
    showFoot: 'lastPage', theme: 'grid',
    styles: { font: 'helvetica', fontSize: 7.8, textColor: C.texto, lineColor: [230, 236, 234], lineWidth: { bottom: 0.15 }, cellPadding: 1.8, valign: 'top' },
    headStyles: { fillColor: C.escuro, textColor: 255, fontStyle: 'bold', fontSize: 7, lineWidth: 0 },
    footStyles: { fillColor: C.claro, textColor: C.escuro, fontStyle: 'bold', lineWidth: { top: 0.4 }, lineColor: C.verde },
    alternateRowStyles: { fillColor: C.zebra }, columnStyles: colSt,
    didParseCell: d => { if (d.section !== 'body' && R.colunas[d.column.index]?.tipo === 'moeda') d.cell.styles.halign = 'right'; },
    willDrawPage: moldura });
  paginarTimbrado(doc, true);
  doc.save(`${nomeRel.replace(/[\\/:*?"<>|]/g, '')} ${hojeISO()}.pdf`);
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
    if (w.hasAttribute('data-rel-frota') && typeof relatorioPendenciasFrota === 'function') {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn peq'; b.textContent = '⬇ Pendências de documentação';
      b.title = 'Frotas com documentação ou informação principal pendente × frotas completas (PDF vertical ou horizontal, ou Excel)';
      b.onclick = e => { e.stopPropagation(); ocupado(b, async () => { try { await relatorioPendenciasFrota(); } catch (err) { falha(err); } }); };
      barra.prepend(b);
    }
    w.before(barra);
  });
}
