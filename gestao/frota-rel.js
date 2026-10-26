// Verbo Gestão — Relatório de pendências da frota: equipamentos com documentação / informação principal pendente
// × equipamentos completos. PDF no papel timbrado (vertical ou horizontal) e Excel.
'use strict';

const FR_SEM_PLACA = ['maquina'];
const FR_CRITERIOS = [
  'Cadastro do equipamento: código de frota, tipo, marca, modelo e ano de fabricação. Cada placa: RENAVAM, chassi e UF do registro.',
  'Veículo leve (carro, utilitário, motocicleta, caminhão): CRLV.',
  'Cavalo mecânico: CRLV, inspeção eletromecânica, certificado de tacógrafo e licenças de tráfego (Federal noturna, Federal diurna, Estadual MS e Estadual SP).',
  'Semirreboques (carreta, bitrem, tritrem, rodotrem): CRLV e inspeção eletromecânica de cada placa.',
  'Cada documento obrigatório precisa estar cadastrado, dentro da validade e com o arquivo anexado.',
  'Documentos que vencem em até 30 dias aparecem como aviso, sem tirar o equipamento de "completo".'];

async function dadosPendenciasFrota({ inativos = false, q = '' } = {}) {
  const [eqs, docs, anx] = await Promise.all([
    api.listar('equipamentos', `select=*,comps:veiculos(id,placa,codigo_frota,ordem,ativo,renavam,chassi,uf_registro,marca,ano_fabricacao,descricao_composicao)${inativos ? '' : '&ativo=eq.true'}&order=codigo_frota.asc.nullslast`),
    api.listar('equipamento_documentos', 'select=id,equipamento_id,veiculo_id,tipo,nome,tem_validade,vencimento&ativo=eq.true&substituido_em=is.null'),
    api.listar('anexos', 'select=entidade_id&entidade=eq.documento_equipamento&cancelado_em=is.null').catch(() => [])]);
  const comArq = new Set(anx.map(a => a.entidade_id));
  const hoje = hojeISO(), lim30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const ql = q.toLowerCase();
  const lista = eqs.filter(e => !ql || [e.codigo_frota, nomeTipoEq(e), e.marca, e.modelo, ...e.comps.map(c => c.placa + ' ' + (c.codigo_frota || ''))].join(' ').toLowerCase().includes(ql));
  return lista.map(e => {
    const cs = e.comps.filter(c => c.ativo).sort((a, b) => a.ordem - b.ordem);
    const ids = new Set(cs.map(c => c.id));
    const dEq = docs.filter(d => ids.has(d.veiculo_id) || (!d.veiculo_id && d.equipamento_id === e.id));
    const pend = [], avisos = [], okDocs = [];
    const add = (onde, txt) => pend.push(onde ? `${onde}: ${txt}` : txt);
    // informação principal
    if (!e.codigo_frota) add('', 'código de frota não informado');
    if (!e.tipo) add('', 'tipo do equipamento não definido');
    const marca = e.marca || cs.find(c => c.marca)?.marca;
    if (!marca) add('', 'marca não informada');
    if (!e.modelo) add('', 'modelo não informado');
    if (!e.ano_fabricacao && !cs.some(c => c.ano_fabricacao)) add('', 'ano de fabricação não informado');
    const semPlaca = FR_SEM_PLACA.includes(e.tipo);
    if (!cs.length && !semPlaca) add('', 'nenhuma placa vinculada');
    cs.forEach(c => {
      if (!c.renavam) add(c.placa, 'RENAVAM não informado');
      if (!c.chassi) add(c.placa, 'chassi não informado');
      if (!c.uf_registro) add(c.placa, 'UF do registro não informada');
    });
    // documentos obrigatórios do tipo
    const obr = situacaoObrigatorios(e.tipo, cs, dEq, comArq);
    const um = cs.length === 1;
    obr.forEach(o => { const onde = o.placa;
      if (o.st === 'falta') add(onde, `${o.tipo}: não cadastrado`);
      else if (o.st === 'vencido') add(onde, `${o.tipo}: vencido em ${dataBR(o.d.vencimento)}`);
      else if (o.st === 'sem_arquivo') add(onde, `${o.tipo}: sem arquivo anexado`);
      else { if (o.st === 'vence') avisos.push(`${onde}: ${o.tipo} vence em ${dataBR(o.d.vencimento)}`);
        okDocs.push(`${um ? '' : onde + ' '}${o.tipo}${o.d.tem_validade && o.d.vencimento ? ' até ' + dataBR(o.d.vencimento) : ''}`); } });
    const vencs = obr.filter(o => ['ok', 'vence'].includes(o.st) && o.d.tem_validade && o.d.vencimento).map(o => o.d.vencimento).sort();
    return { e, cs, pend, avisos, okDocs, completo: !pend.length, prox: vencs[0] || null,
      codigo: e.codigo_frota || '-', tipo: nomeTipoEq(e), marcaModelo: [marca, e.modelo].filter(Boolean).join(' ') || '-',
      placas: cs.map(c => c.placa).join(', ') || '-', situacao: e.ativo ? 'Ativo' : 'Desativado' };
  });
}

async function relatorioPendenciasFrota() {
  const inativos = estado.params.get('inativos') === '1', q = estado.params.get('q') || '';
  const es = await empresasL().catch(() => []);
  const r = await modal(`<form><h2>Relatório de pendências da frota</h2>
    <p class="muted" style="margin-top:0">Separa os equipamentos com documentação ou informação principal pendente dos que estão completos.</p><div class="form">
    <label class="campo largo">Conteúdo<select name="conteudo"><option value="ambos">Todos: com pendência e completos</option><option value="pend">Só os com pendência</option><option value="ok">Só os completos</option></select></label>
    <div class="campo largo"><span>Formato</span><div class="fr-op"><label class="check"><input type="radio" name="formato" value="pdf" checked> PDF</label><label class="check"><input type="radio" name="formato" value="xls"> Excel (XLSX)</label></div></div>
    <div class="campo largo" id="fr-ori"><span>Orientação do PDF</span><div class="fr-op"><label class="check"><input type="radio" name="orientacao" value="retrato" checked> Vertical (retrato)</label><label class="check"><input type="radio" name="orientacao" value="paisagem"> Horizontal (paisagem)</label></div></div>
    ${es.length > 1 ? `<label class="campo largo">CNPJ que emite<select name="empresa">${es.map(x => `<option value="${x.id}">${esc(rotEmpresa(x))}</option>`).join('')}</select></label>` : ''}
    <details class="largo"><summary class="muted">O que é verificado</summary><ul class="muted" style="margin:6px 0 0;padding-left:18px">${FR_CRITERIOS.map(c => `<li>${esc(c)}</li>`).join('')}</ul></details></div>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Gerar relatório</button></div></form>`,
  { aoAbrir: f => { const sync = () => ($('#fr-ori', f).hidden = $('[name=formato]:checked', f).value !== 'pdf'); $$('[name=formato]', f).forEach(i => (i.onchange = sync)); } });
  if (!r) return;
  const E = es.find(x => x.id === r.empresa) || es[0] || {};
  const todos = await dadosPendenciasFrota({ inativos, q });
  const filtros = [inativos ? 'Inclui equipamentos desativados' : 'Somente equipamentos ativos', q && `Busca: "${q}"`].filter(Boolean);
  const op = { conteudo: r.conteudo, filtros, E };
  r.formato === 'xls' ? await excelPendenciasFrota(todos, op) : await pdfPendenciasFrota(todos, { ...op, paisagem: r.orientacao === 'paisagem' });
}

function frResumo(todos) {
  const pend = todos.filter(x => !x.completo), ok = todos.filter(x => x.completo);
  const itens = pend.reduce((s, x) => s + x.pend.length, 0);
  const vencidos = todos.reduce((s, x) => s + x.pend.filter(p => / vencido em /.test(p)).length, 0);
  return { pend, ok, itens, vencidos, pct: todos.length ? Math.round(ok.length / todos.length * 100) : 0 };
}

async function pdfPendenciasFrota(todos, { conteudo, filtros, E, paisagem }) {
  await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
  const IMG = await imagensTimbrado(paisagem);
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: paisagem ? 'landscape' : 'portrait' });
  const W = paisagem ? 297 : 210, H = paisagem ? 210 : 297, ML = 20, MR = W - 20, TOPO = 40, BASE = H - 28, LU = MR - ML;
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const C = { texto: [37, 46, 53], cinza: [107, 115, 120], ouro: hex(REL_COR.ouro), verde: hex(REL_COR.verde), escuro: hex(REL_COR.escuro), claro: hex(REL_COR.claro), borda: hex(REL_COR.borda), zebra: hex(REL_COR.zebra), verm: [180, 35, 24], amar: [154, 106, 0] };
  const feitas = new Set();
  const moldura = () => { const pg = doc.getCurrentPageInfo().pageNumber; if (feitas.has(pg)) return; feitas.add(pg); molduraTimbrado(doc, E, IMG); };
  const S = frResumo(todos);
  const titulo = 'Frota - documentação e cadastro principal';

  moldura();
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...C.ouro);
  const rot = 'RELATÓRIO GERENCIAL'; let px = MR - [...rot].reduce((w, ch) => w + doc.getTextWidth(ch) + 1.5, 0) + 1.5;
  for (const ch of rot) { doc.text(ch, px, 36); px += doc.getTextWidth(ch) + 1.5; }
  let y = 44;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(paisagem ? 15 : 14); doc.setTextColor(...C.texto);
  const tl = doc.splitTextToSize(titulo, LU - 55); doc.text(tl, ML, y); y += tl.length * 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...C.cinza);
  doc.text(doc.splitTextToSize('Equipamentos com documentação ou informação principal pendente e equipamentos completos', LU - 55), ML, y); y += paisagem ? 4.5 : 8.5;
  doc.setFontSize(8.5); doc.text(`Gerado em ${dataHoraBR(new Date().toISOString())}`, MR, 44, { align: 'right' }); doc.text(`por ${estado.usuario?.nome || ''}`, MR, 48, { align: 'right' });
  doc.setFontSize(8); const fl = doc.splitTextToSize('Filtros: ' + filtros.join(' · '), LU); doc.text(fl, ML, y); y += fl.length * 3.8 + 2;
  doc.setDrawColor(...C.borda); doc.setLineWidth(0.2); doc.line(ML, y - 1.5, MR, y - 1.5); y += 2;

  // indicadores
  const kpis = [{ v: String(todos.length), r: 'equipamentos' }, { v: String(S.ok.length), r: 'completos', bom: true }, { v: String(S.pend.length), r: 'com pendência', alerta: S.pend.length > 0 },
    { v: S.pct + '%', r: 'da frota completa', destaque: true }, { v: String(S.itens), r: 'itens pendentes', alerta: S.itens > 0 }, { v: String(S.vencidos), r: 'documentos vencidos', alerta: S.vencidos > 0 }];
  const porLinha = paisagem ? 6 : 3, gap = 4, kw = (LU - gap * (porLinha - 1)) / porLinha, kh = 15;
  kpis.forEach((k, i) => {
    const col = i % porLinha; if (i && !col) y += kh + gap;
    const x = ML + col * (kw + gap);
    doc.setFillColor(...(k.destaque ? C.escuro : [255, 255, 255])); doc.setDrawColor(...C.borda); doc.setLineWidth(0.2); doc.roundedRect(x, y, kw, kh, 1.5, 1.5, 'FD');
    doc.setFillColor(...(k.alerta ? C.verm : k.destaque ? C.ouro : C.verde)); doc.rect(x, y, kw, 0.9, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...(k.destaque ? [255, 255, 255] : k.alerta ? C.verm : C.escuro)); doc.text(k.v, x + 3, y + 7);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...(k.destaque ? [201, 213, 209] : C.cinza)); doc.text(k.r.toUpperCase(), x + 3, y + 11.8);
  });
  y += kh + 5;
  // barra de progresso
  doc.setFillColor(...C.claro); doc.roundedRect(ML, y, LU, 3, 1.5, 1.5, 'F');
  if (S.pct) { doc.setFillColor(...C.verde); doc.roundedRect(ML, y, Math.max(3, LU * S.pct / 100), 3, 1.5, 1.5, 'F'); }
  y += 8;
  // critérios
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...C.verde); doc.text('O QUE É VERIFICADO', ML, y); y += 3.6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.3); doc.setTextColor(...C.cinza);
  FR_CRITERIOS.forEach(c => { const l = doc.splitTextToSize('-  ' + c, LU); doc.text(l, ML, y); y += l.length * 3.3; });
  y += 4;

  const larg = paisagem ? { 0: 22, 1: 34, 2: 40, 3: 30 } : { 0: 17, 1: 25, 2: 28, 3: 22 };
  const fs = paisagem ? 7.8 : 7.2;
  const secao = (rotulo, cor, cab, linhas, vazio, colorir) => {
    if (y > BASE - 25) { doc.addPage(); moldura(); y = TOPO + 4; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...cor); doc.text(rotulo, ML, y); y += 2.5;
    doc.autoTable({ startY: y, margin: { left: ML, right: W - MR, top: TOPO, bottom: H - BASE }, theme: 'grid',
      head: [cab.map(c => c.toUpperCase())], body: linhas.length ? linhas : [[{ content: vazio, colSpan: cab.length, styles: { halign: 'center', textColor: C.cinza } }]],
      styles: { font: 'helvetica', fontSize: fs, textColor: C.texto, lineColor: [230, 236, 234], lineWidth: { bottom: 0.15 }, cellPadding: 1.6, valign: 'top' },
      headStyles: { fillColor: C.escuro, textColor: 255, fontStyle: 'bold', fontSize: fs - 0.8, lineWidth: 0 },
      alternateRowStyles: { fillColor: C.zebra }, rowPageBreak: 'avoid',
      columnStyles: Object.fromEntries(Object.entries(larg).map(([k, v]) => [k, { cellWidth: v }])),
      didParseCell: d => { if (d.section === 'body' && colorir) colorir(d); if (d.section === 'body' && d.column.index === 0) d.cell.styles.fontStyle = 'bold'; },
      willDrawPage: moldura });
    y = doc.lastAutoTable.finalY + 8;
  };
  if (conteudo !== 'ok') secao(`COM PENDÊNCIA · ${S.pend.length} EQUIPAMENTO(S) · ${S.itens} ITEM(NS)`, C.verm,
    ['Frota', 'Tipo', 'Marca / modelo', 'Placas', 'O que falta'],
    S.pend.map(x => [x.codigo, x.tipo, x.marcaModelo, x.placas.replace(/, /g, '\n'), x.pend.map(p => '- ' + p).join('\n') + (x.avisos.length ? '\n' + x.avisos.map(a => 'Aviso: ' + a).join('\n') : '')]),
    'Nenhum equipamento com pendência.');
  if (conteudo !== 'pend') secao(`COMPLETOS · ${S.ok.length} EQUIPAMENTO(S)`, C.verde,
    ['Frota', 'Tipo', 'Marca / modelo', 'Placas', 'Documentos em dia', 'Próx. vencimento'],
    S.ok.map(x => [x.codigo, x.tipo, x.marcaModelo, x.placas.replace(/, /g, '\n'), x.okDocs.join('\n') || '-', x.prox ? dataBR(x.prox) + (x.avisos.length ? '\n(vence em até 30 dias)' : '') : '-']),
    'Nenhum equipamento completo.', d => { if (d.column.index === 5 && /30 dias/.test(d.cell.raw)) d.cell.styles.textColor = C.amar; });
  paginarTimbrado(doc, paisagem);
  doc.save(`Pendencias da frota ${hojeISO()} ${paisagem ? 'horizontal' : 'vertical'}.pdf`);
}

async function excelPendenciasFrota(todos, { conteudo, filtros, E }) {
  await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js');
  const S = frResumo(todos);
  const wb = new ExcelJS.Workbook(); wb.creator = estado.usuario.nome; wb.created = new Date();
  const fill = c => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + c.replace('#', '') } });
  const fina = { style: 'thin', color: { argb: 'FFD7DFE5' } }, borda = { top: fina, bottom: fina, left: fina, right: fina };
  let logoId = null;
  try { const b = await (await fetch('logo.png')).arrayBuffer(); logoId = wb.addImage({ buffer: b, extension: 'png' }); } catch { /* sem logo */ }
  const cabecalho = (ws, nome, ncol) => {
    ws.mergeCells(1, 1, 3, 2); if (logoId != null) ws.addImage(logoId, { tl: { col: 0.15, row: 0.2 }, ext: { width: 150, height: 44 } });
    ws.mergeCells(1, 3, 1, ncol); ws.getCell(1, 3).value = nome; ws.getCell(1, 3).font = { size: 16, bold: true, color: { argb: 'FF0C1D18' } };
    ws.mergeCells(2, 3, 2, ncol); ws.getCell(2, 3).value = [E.razao_social || E.nome_fantasia || 'Verbo Logística', E.cnpj && 'CNPJ ' + fmtCNPJ(E.cnpj)].filter(Boolean).join(' · ');
    ws.getCell(2, 3).font = { size: 10, color: { argb: 'FF5A6A77' } };
    ws.mergeCells(3, 3, 3, ncol); ws.getCell(3, 3).value = `Gerado em ${dataHoraBR(new Date().toISOString())} por ${estado.usuario.nome} · ${filtros.join(' · ')}`;
    ws.getCell(3, 3).font = { size: 9, italic: true, color: { argb: 'FF5A6A77' } };
    ws.getRow(1).height = 24; ws.getRow(2).height = 16; ws.getRow(3).height = 16;
    for (let c = 1; c <= ncol; c++) ws.getCell(4, c).border = { bottom: { style: 'medium', color: { argb: 'FF02654D' } } };
  };
  const tabela = (ws, lin, cab, linhas, larguras, corLinha) => {
    const ini = lin, row = ws.getRow(lin);
    cab.forEach((h, k) => { const x = row.getCell(k + 1); x.value = h.toUpperCase(); x.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } }; x.fill = fill(REL_COR.escuro); x.border = borda; x.alignment = { vertical: 'middle', wrapText: true }; });
    row.height = 22; lin++;
    linhas.forEach((l, n) => { const r = ws.getRow(lin); l.forEach((v, k) => { const x = r.getCell(k + 1); x.value = v; x.border = borda; x.font = { size: 10, ...(k === 0 ? { bold: true } : {}) };
      x.alignment = { vertical: 'top', wrapText: true }; if (n % 2) x.fill = fill(REL_COR.zebra); });
      if (corLinha) corLinha(r, l); lin++; });
    larguras.forEach((w, k) => (ws.getColumn(k + 1).width = w));
    if (linhas.length) { ws.autoFilter = { from: { row: ini, column: 1 }, to: { row: ini + linhas.length, column: cab.length } }; ws.views = [{ showGridLines: false, state: 'frozen', ySplit: ini }]; }
    return lin;
  };
  const setup = { views: [{ showGridLines: false }], pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 } };

  // Resumo
  const rs = wb.addWorksheet('Resumo', setup); cabecalho(rs, 'Frota — documentação e cadastro principal', 6);
  let lin = 6;
  const kp = [[todos.length, 'EQUIPAMENTOS'], [S.ok.length, 'COMPLETOS'], [S.pend.length, 'COM PENDÊNCIA'], [S.pct / 100, 'DA FROTA COMPLETA'], [S.itens, 'ITENS PENDENTES'], [S.vencidos, 'DOCUMENTOS VENCIDOS']];
  kp.forEach(([v, r], j) => { const c = 1 + (j % 3) * 2, l = lin + Math.floor(j / 3) * 3;
    rs.mergeCells(l, c, l, c + 1); rs.mergeCells(l + 1, c, l + 1, c + 1);
    const cv = rs.getCell(l, c), cr = rs.getCell(l + 1, c); cv.value = v; if (j === 3) cv.numFmt = '0%';
    const alerta = (j === 2 || j >= 4) && v > 0;
    cv.font = { size: 14, bold: true, color: { argb: alerta ? 'FFB42318' : 'FF0C1D18' } }; cr.value = r; cr.font = { size: 8, color: { argb: 'FF5A6A77' } };
    [cv, cr].forEach(x => { x.fill = fill('#F2F7F5'); x.alignment = { vertical: 'middle', indent: 1 }; });
    cv.border = { top: { style: 'thick', color: { argb: alerta ? 'FFB42318' : 'FF02654D' } } }; rs.getRow(l).height = 24; });
  lin += 7;
  rs.getCell(lin, 1).value = 'O QUE É VERIFICADO'; rs.getCell(lin, 1).font = { bold: true, color: { argb: 'FF02654D' } }; lin++;
  FR_CRITERIOS.forEach(c => { rs.mergeCells(lin, 1, lin, 6); rs.getCell(lin, 1).value = '• ' + c; rs.getCell(lin, 1).font = { size: 10, color: { argb: 'FF5A6A77' } }; lin++; });
  for (let c = 1; c <= 6; c++) rs.getColumn(c).width = 16;

  if (conteudo !== 'ok') {
    const ws = wb.addWorksheet('Com pendência', setup); cabecalho(ws, `Com pendência — ${S.pend.length} equipamento(s)`, 7);
    tabela(ws, 6, ['Frota', 'Tipo', 'Marca / modelo', 'Placas', 'Situação', 'O que falta', 'Avisos'],
      S.pend.map(x => [x.codigo, x.tipo, x.marcaModelo, x.placas, x.situacao, x.pend.map(p => '• ' + p).join('\n'), x.avisos.join('\n')]), [12, 22, 26, 20, 16, 60, 34]);
    const it = wb.addWorksheet('Itens pendentes', setup); cabecalho(it, `Itens pendentes — ${S.itens} item(ns)`, 5);
    tabela(it, 6, ['Frota', 'Tipo', 'Placa', 'Pendência', 'Natureza'],
      S.pend.flatMap(x => x.pend.map(p => { const m = p.match(/^([A-Z0-9]{7}): (.*)$/); const txt = m ? m[2] : p;
        return [x.codigo, x.tipo, m ? m[1] : '-', txt, / vencido /.test(txt) ? 'Documento vencido' : /sem arquivo/.test(txt) ? 'Arquivo não anexado' : /não cadastrad/.test(txt) ? 'Documento não cadastrado' : 'Informação de cadastro']; })),
      [12, 22, 12, 52, 26], (r, l) => { if (l[4] === 'Documento vencido') r.getCell(5).font = { size: 10, bold: true, color: { argb: 'FFB42318' } }; });
  }
  if (conteudo !== 'pend') {
    const ws = wb.addWorksheet('Completos', setup); cabecalho(ws, `Completos — ${S.ok.length} equipamento(s)`, 7);
    tabela(ws, 6, ['Frota', 'Tipo', 'Marca / modelo', 'Placas', 'Situação', 'Documentos em dia', 'Próximo vencimento'],
      S.ok.map(x => [x.codigo, x.tipo, x.marcaModelo, x.placas, x.situacao, x.okDocs.join('\n'), x.prox ? new Date(x.prox + 'T12:00') : '-']), [12, 22, 26, 20, 16, 50, 18],
      r => { const c = r.getCell(7); if (c.value instanceof Date) c.numFmt = 'dd/mm/yyyy'; });
  }
  const buf = await wb.xlsx.writeBuffer();
  baixarArquivo(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `Pendencias da frota ${hojeISO()}.xlsx`);
}
