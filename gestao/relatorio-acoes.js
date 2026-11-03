// ===================== Anexos: baixar todos (.zip) e relatório das ações para a gestão =====================
const ENT_ACAO = { geral: 'acao_geral', ssma: 'ssma_acao', qual: 'qual_acao' };
const JSZIP_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
const PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const nomeSeguro = n => String(n || 'arquivo').replace(/[\\/:*?"<>|]+/g, '-').trim().slice(0, 120) || 'arquivo';
const tamTxt = b => !b ? '' : b < 1024 * 1024 ? Math.max(1, Math.round(b / 1024)) + ' KB' : (b / 1048576).toFixed(1).replace('.', ',') + ' MB';
const tipoTxt = x => /^https?:/.test(x.caminho_arquivo) ? 'Link' : /pdf/.test(x.tipo_mime || '') || /\.pdf$/i.test(x.nome_original) ? 'PDF'
  : /presentation|powerpoint/.test(x.tipo_mime || '') || /\.pptx?$/i.test(x.nome_original) ? 'Apresentação'
  : /wordprocessing|msword/.test(x.tipo_mime || '') || /\.docx?$/i.test(x.nome_original) ? 'Documento Word'
  : /sheet|excel|csv/.test(x.tipo_mime || '') || /\.(xlsx?|csv)$/i.test(x.nome_original) ? 'Planilha'
  : (x.tipo_mime || '').startsWith('image/') ? 'Imagem' : (x.tipo_mime || '').startsWith('video/') ? 'Vídeo' : 'Arquivo';

const anexosLista = (ent, id) => api.listar('anexos', `entidade=eq.${ent}&entidade_id=eq.${id}&cancelado_em=is.null&order=enviado_em`).catch(() => []);
async function blobAnexo(x) { const r = await fetch(await api.linkArquivo(x.caminho_arquivo)); if (!r.ok) throw new Error('Não foi possível baixar ' + x.nome_original); return r.blob(); }

// monta o .zip; pastas = grupos (uma por ação no relatório do plano)
async function zipAnexos(grupos) {
  await carregarScript(JSZIP_URL);
  const zip = new JSZip(); let n = 0; const falhas = [];
  for (const g of grupos) {
    const pasta = g.pasta ? zip.folder(nomeSeguro(g.pasta)) : zip, usados = new Set(), links = [];
    for (const x of g.anexos) {
      if (/^https?:/.test(x.caminho_arquivo)) { links.push(x.caminho_arquivo); continue; }
      try { let nome = nomeSeguro(x.nome_original), k = 2; while (usados.has(nome.toLowerCase())) nome = nome.replace(/(\.[^.]+)?$/, ` (${k++})$1`);
        usados.add(nome.toLowerCase()); pasta.file(nome, await blobAnexo(x)); n++; }
      catch { falhas.push(x.nome_original); }
    }
    if (links.length) pasta.file('Links.txt', links.join('\r\n'));
  }
  if (falhas.length) zip.file('LEIA-ME - arquivos que não baixaram.txt', falhas.join('\r\n'));
  return { blob: await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }), n, falhas };
}
async function baixarAnexosZip(ent, id, nome) {
  aviso('Preparando o .zip com os anexos…');
  const { blob, n, falhas } = await zipAnexos([{ anexos: await anexosLista(ent, id) }]);
  if (!n) return aviso('Nenhum arquivo para baixar (só links).', true);
  baixarArquivo(blob, nomeSeguro(nome || 'Anexos') + '.zip');
  if (falhas.length) aviso(`${falhas.length} arquivo(s) não baixaram: ${falhas.join(', ')}`, true);
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-zip]'); if (!b) return;
  e.preventDefault(); e.stopPropagation();
  const [ent, id] = b.dataset.zip.split('|');
  ocupado(b, () => baixarAnexosZip(ent, id, b.dataset.zipNome).catch(falha));
}, true);

// resumo automático do conteúdo (lido do próprio arquivo, sem enviar a lugar nenhum)
async function resumoArquivo(x, blob) {
  const t = tipoTxt(x), limpa = s => String(s || '').replace(/\s+/g, ' ').trim();
  if (x.descricao) return x.descricao;
  if (t === 'Link') return 'Link externo';
  if (!blob || blob.size > 30 * 1048576) return t;
  try {
    if (t === 'Apresentação' || t === 'Documento Word' || t === 'Planilha') {
      await carregarScript(JSZIP_URL); const z = await JSZip.loadAsync(blob);
      const txt = xml => [...xml.matchAll(/<(?:a|w):t[^>]*>([^<]*)<\/(?:a|w):t>/g)].map(m => m[1]).join(' ');
      if (t === 'Apresentação') {
        const sl = Object.keys(z.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f)).sort((a, b) => a.match(/\d+/)[0] - b.match(/\d+/)[0]);
        const tit = []; for (const f of sl.slice(0, 40)) { const xml = await z.file(f).async('string');
          const ti = xml.match(/<p:ph type="(?:ctrTitle|title)"[\s\S]*?<\/p:sp>/)?.[0]; const s = limpa(txt(ti || xml)).slice(0, 60); if (s && !tit.includes(s)) tit.push(s); }
        return `Apresentação com ${sl.length} slide(s)${tit.length ? '. Temas: ' + tit.slice(0, 6).join('; ') + (tit.length > 6 ? '…' : '') : ''}`;
      }
      if (t === 'Documento Word') { const s = limpa(txt(await z.file('word/document.xml')?.async('string') || ''));
        return `Documento com ~${s.split(' ').filter(Boolean).length} palavras${s ? '. Início: "' + s.slice(0, 220) + (s.length > 220 ? '…' : '') + '"' : ''}`; }
      const wb = await z.file('xl/workbook.xml')?.async('string') || ''; const abas = [...wb.matchAll(/<sheet [^>]*name="([^"]+)"/g)].map(m => m[1]);
      return `Planilha${abas.length ? ' com as abas: ' + abas.join(', ') : ''}`;
    }
    if (t === 'PDF') {
      await carregarScript(PDFJS_URL); pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_URL.replace('pdf.min.js', 'pdf.worker.min.js');
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
      const p1 = limpa((await (await pdf.getPage(1)).getTextContent()).items.map(i => i.str).join(' '));
      return `PDF com ${pdf.numPages} página(s)${p1 ? '. Início: "' + p1.slice(0, 220) + (p1.length > 220 ? '…' : '') + '"' : ' (digitalizado, sem texto)'}`;
    }
  } catch { /* arquivo protegido ou fora do padrão: fica só o tipo */ }
  return t;
}

// PDF no padrão Verbo: ações, quem fez o quê, anexos com resumo e links (válidos por 30 dias) + pacote .zip
async function relatorioAcoes(acs, { titulo, subtitulo = '', plano = null } = {}) {
  const DIAS = 30, VAL = DIAS * 86400;
  const E = (await empresasL().catch(() => []))[0] || {};
  aviso('Montando o relatório: baixando e lendo os anexos…');
  const dados = [];
  for (const a of acs) {
    const ent = ENT_ACAO[a.modulo] || 'acao_geral', anx = await anexosLista(ent, a.id), itens = [];
    for (const x of anx) { let blob = null; if (!/^https?:/.test(x.caminho_arquivo)) blob = await blobAnexo(x).catch(() => null);
      itens.push({ x, blob, resumo: await resumoArquivo(x, blob), link: /^https?:/.test(x.caminho_arquivo) ? x.caminho_arquivo : await linkLongo(x.caminho_arquivo, VAL).catch(() => null) }); }
    dados.push({ a, itens });
  }
  // pacote com tudo, guardado no Storage para o link do relatório
  let linkZip = null; const comArq = dados.filter(d => d.itens.some(i => i.blob));
  if (comArq.length) {
    await carregarScript(JSZIP_URL); const zip = new JSZip();
    comArq.forEach((d, k) => { const pasta = acs.length > 1 ? zip.folder(nomeSeguro(`${String(k + 1).padStart(2, '0')} - ${d.a.descricao.slice(0, 60)}`)) : zip, usados = new Set();
      d.itens.filter(i => i.blob).forEach(i => { let nome = nomeSeguro(i.x.nome_original), c = 2; while (usados.has(nome.toLowerCase())) nome = nome.replace(/(\.[^.]+)?$/, ` (${c++})$1`); usados.add(nome.toLowerCase()); pasta.file(nome, i.blob); }); });
    const caminho = `relatorios/${Date.now()}-${nomeArquivo(nomeSeguro(titulo).slice(0, 60))}.zip`;
    try { await api.enviarArquivo(caminho, new File([await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })], 'anexos.zip', { type: 'application/zip' }));
      linkZip = await linkLongo(caminho, VAL); } catch (err) { console.warn('pacote zip', err); }
  }

  await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
  const IMG = await imagensTimbrado(false);
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, ML = 20, MR = 190, LU = MR - ML, TOPO = 42, BASE = 266;
  const C = { texto: [37, 46, 53], cinza: [107, 115, 120], ouro: [221, 169, 54], verde: [2, 101, 77], escuro: [12, 29, 24], linha: [214, 220, 224], claro: [226, 240, 235], verm: [180, 35, 24], azul: [32, 92, 160] };
  const feitas = new Set(); const moldura = () => { const pg = doc.getCurrentPageInfo().pageNumber; if (!feitas.has(pg)) { feitas.add(pg); molduraTimbrado(doc, E, IMG); } };
  const nova = () => { doc.addPage(); moldura(); y = TOPO + 2; };
  const cabe = h => { if (y + h > BASE) nova(); };
  const txt = (s, { tam = 9.5, cor = 'texto', neg = false, x = ML, larg = LU, esp = 4.6 } = {}) => {
    doc.setFont('helvetica', neg ? 'bold' : 'normal'); doc.setFontSize(tam); doc.setTextColor(...C[cor]);
    doc.splitTextToSize(String(s), larg).forEach(l => { cabe(esp); doc.text(l, x, y); y += esp; }); };
  moldura();
  let y = 44;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...C.ouro); doc.text('RELATÓRIO DE AÇÕES', MR, 37, { align: 'right' });
  doc.setFontSize(14); doc.setTextColor(...C.texto); doc.splitTextToSize(titulo, LU - 40).forEach(l => { doc.text(l, ML, y); y += 6; });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...C.cinza); doc.text(`Emitido em ${dataHoraBR(new Date().toISOString())}`, MR, 44, { align: 'right' }); doc.text(`por ${estado.usuario?.nome || ''}`, MR, 48, { align: 'right' });
  if (subtitulo) txt(subtitulo, { tam: 9, cor: 'cinza' });
  y += 1; doc.setDrawColor(...C.linha); doc.setLineWidth(0.2); doc.line(ML, y, MR, y); y += 5;
  // resumo
  const vivas = acs.filter(a => a.status !== 'cancelada'), conc = vivas.filter(a => a.status === 'concluida').length, atr = vivas.filter(a => ['aberta', 'em_andamento'].includes(a.status) && a.prazo && a.prazo < hojeISO()).length;
  const nArq = dados.reduce((s, d) => s + d.itens.length, 0);
  const kp = [[String(vivas.length), 'AÇÕES'], [String(conc), 'CONCLUÍDAS'], [String(atr), 'ATRASADAS'], [String(nArq), 'ANEXOS']], kw = (LU - 9) / 4;
  kp.forEach(([v, r], i) => { const x = ML + i * (kw + 3); doc.setFillColor(255, 255, 255); doc.setDrawColor(...C.linha); doc.roundedRect(x, y, kw, 13, 1.5, 1.5, 'FD');
    doc.setFillColor(...(i === 2 && atr ? C.verm : C.verde)); doc.rect(x, y, kw, 0.9, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...(i === 2 && atr ? C.verm : C.escuro)); doc.text(v, x + 3, y + 6.5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.8); doc.setTextColor(...C.cinza); doc.text(r, x + 3, y + 10.8); });
  y += 18;
  if (linkZip) { cabe(9); doc.setFillColor(...C.claro); doc.roundedRect(ML, y - 4, LU, 8, 1.5, 1.5, 'F'); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...C.verde);
    doc.textWithLink(`Baixar todos os anexos (.zip)  ›  link válido por ${DIAS} dias`, ML + 3, y + 1.2, { url: linkZip }); y += 9; }
  if (plano) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...C.azul); cabe(5);
    doc.textWithLink('Abrir no sistema Verbo Gestão (precisa de login)', ML, y, { url: `${location.origin}${location.pathname.replace(/index\.html$/, '')}#/planos/ver/${plano}` }); y += 7; }
  // cada ação
  dados.forEach(({ a, itens }, k) => {
    cabe(26); y += 2;
    doc.setFillColor(...C.escuro); doc.rect(ML, y - 4.6, LU, 7, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(255, 255, 255);
    doc.text(`${acs.length > 1 ? (k + 1) + '. ' : ''}${ST_ACAO_TXT[a.status]?.[0] || a.status}`.toUpperCase(), ML + 2.5, y);
    doc.setFont('helvetica', 'normal'); doc.text(a.prazo ? `Prazo ${dataBR(a.prazo)}${['aberta', 'em_andamento'].includes(a.status) && a.prazo < hojeISO() ? ' · ATRASADA' : ''}` : 'Sem prazo', MR - 2.5, y, { align: 'right' }); y += 7;
    txt(a.descricao, { tam: 10.5, neg: true, esp: 5 });
    txt([a.origem, nomesPessoas(a.responsaveis) || a.responsavel ? 'Responsável(is): ' + (nomesPessoas(a.responsaveis) || a.responsavel) : ''].filter(Boolean).join('  ·  '), { tam: 8.5, cor: 'cinza', esp: 4.2 });
    y += 1.5;
    const ents = (a.entregas || []).filter(e => e.evidencia);
    if (ents.length) { txt('O QUE CADA RESPONSÁVEL ENVIOU', { tam: 7.5, cor: 'verde', neg: true, esp: 4 });
      ents.forEach(e => { txt(`${e.nome || ''} · ${dataHoraBR(e.criado_em)}`, { tam: 8.5, neg: true, esp: 4.2 }); txt(e.evidencia, { tam: 9, x: ML + 3, larg: LU - 3, esp: 4.4 }); y += 1; }); }
    else if (a.evidencia) { txt('O QUE FOI FEITO', { tam: 7.5, cor: 'verde', neg: true, esp: 4 }); txt(a.evidencia, { tam: 9, esp: 4.4 }); }
    if (itens.length) {
      y += 1.5; cabe(16);
      doc.autoTable({ startY: y, margin: { left: ML, right: W - MR, top: TOPO + 2, bottom: 297 - BASE }, theme: 'grid',
        head: [['ARQUIVO', 'RESUMO', 'ENVIADO']], body: itens.map(i => [`${i.x.nome_original}\n${tipoTxt(i.x)}${i.x.tamanho_bytes ? ' · ' + tamTxt(i.x.tamanho_bytes) : ''}\n${i.link ? 'Baixar ›' : ''}`, i.resumo, dataBR(String(i.x.enviado_em || '').slice(0, 10))]),
        styles: { font: 'helvetica', fontSize: 8, textColor: C.texto, lineColor: [228, 234, 232], lineWidth: 0.15, cellPadding: 1.8, valign: 'top' },
        headStyles: { fillColor: C.verde, textColor: 255, fontStyle: 'bold', fontSize: 7.2 }, alternateRowStyles: { fillColor: [246, 249, 248] },
        columnStyles: { 0: { cellWidth: 58, fontStyle: 'bold' }, 1: { cellWidth: LU - 58 - 20 }, 2: { cellWidth: 20, halign: 'center' } }, rowPageBreak: 'avoid',
        willDrawPage: moldura,
        didDrawCell: d => { if (d.section !== 'body' || d.column.index !== 0) return; const it = itens[d.row.index]; if (!it?.link) return;
          const ls = d.cell.text, yl = d.cell.y + d.cell.padding('top') + (ls.length - 1) * (d.cell.styles.fontSize * 0.3528 * 1.15) + 2.6;
          doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...C.azul); doc.setFillColor(...(d.row.index % 2 ? [246, 249, 248] : [255, 255, 255]));
          doc.rect(d.cell.x + 1.5, yl - 3, 20, 3.8, 'F'); doc.textWithLink('Baixar ›', d.cell.x + d.cell.padding('left'), yl, { url: it.link }); } });
      y = doc.lastAutoTable.finalY + 4;
    } else { txt('Sem anexos.', { tam: 8.5, cor: 'cinza' }); }
    y += 3;
  });
  cabe(10); doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(...C.cinza);
  doc.splitTextToSize(`Os links de download valem por ${DIAS} dias a partir da emissão. Depois disso, gere o relatório de novo no sistema. Os resumos foram montados automaticamente a partir do conteúdo de cada arquivo.`, LU).forEach(l => { cabe(4); doc.text(l, ML, y); y += 3.6; });
  paginarTimbrado(doc, false);
  doc.save(`Relatorio de acoes - ${nomeSeguro(titulo).slice(0, 60)} ${hojeISO()}.pdf`);
}
async function linkLongo(caminho, segundos) {
  await api.garantir();
  const d = await api._fetch(SB_URL + '/storage/v1/object/sign/anexos/' + caminho, { method: 'POST',
    headers: { apikey: SB_KEY, Authorization: 'Bearer ' + api.sessao.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: segundos }) });
  return SB_URL + '/storage/v1' + d.signedURL;
}
