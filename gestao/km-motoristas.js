// ===================== Km rodado por motorista (Creare) =====================
// Soma a distância dos apontamentos do Creare (E09) de cada motorista no período. Só leitura.
const KM_SEMID = /n[aã]o se identificou|sem identifica/i;
const kmF = n => Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
function kmPresets() {
  const h = hojeISO(), d = +h.slice(8, 10), ym = h.slice(0, 7), mesAnt = somaDias(ym + '-01', -1).slice(0, 7), mesSeg = somaDias(ym + '-28', 5).slice(0, 7);
  const perAtual = d >= 21 ? [ym + '-21', mesSeg + '-05'] : d <= 5 ? [mesAnt + '-21', ym + '-05'] : [ym + '-06', ym + '-20'];
  const perAnt = d >= 21 ? [ym + '-06', ym + '-20'] : d <= 5 ? [mesAnt + '-06', mesAnt + '-20'] : [mesAnt + '-21', ym + '-05'];
  return { atual: ['Período de fechamento atual', ...perAtual], anterior: ['Período de fechamento anterior', ...perAnt],
    mes: ['Mês atual', ym + '-01', h], mes_ant: ['Mês anterior', mesAnt + '-01', somaDias(ym + '-01', -1)] };
}
rota('/operacao/jornadas/km', async tela => {
  const P = estado.params, PR = kmPresets(), pre = P.get('per') || (P.get('ini') ? '' : 'atual');
  const ini = pre ? PR[pre][1] : P.get('ini'), fim = pre ? PR[pre][2] : P.get('fim') || hojeISO();
  let rows;
  try { rows = await api.rpc('km_motoristas', { p_ini: new Date(ini + 'T00:00:00-03:00').toISOString(), p_fim: new Date(fim + 'T23:59:59-03:00').toISOString() }); } catch (err) { falha(err); return; }
  if (rows == null) { tela.innerHTML = '<div class="cartao vazio">Sem permissão para ver o km por motorista.</div>'; return; }
  // rows: [motorista, frota, placa, dia, km, apontamentos]
  const M = new Map();
  for (const [nome, frota, placa, dia, km] of rows) {
    const m = M.get(nome) || { nome, km: 0, dias: new Map(), frotas: new Map(), semId: KM_SEMID.test(nome) }; M.set(nome, m);
    m.km += Number(km); m.dias.set(dia, (m.dias.get(dia) || 0) + Number(km));
    const fk = `${frota}${placa && placa !== frota ? ' · ' + placa : ''}`; m.frotas.set(fk, (m.frotas.get(fk) || 0) + Number(km));
  }
  const ms = [...M.values()].filter(m => m.km > 0.5).sort((a, b) => a.semId - b.semId || b.km - a.km);
  const ident = ms.filter(m => !m.semId), semId = ms.filter(m => m.semId).reduce((a, m) => a + m.km, 0);
  const total = ms.reduce((a, m) => a + m.km, 0), maior = Math.max(1, ...ident.map(m => m.km));
  const diasKm = m => [...m.dias.values()].filter(v => v > 0.5).length;
  const kpi = (n, r, cor = '') => `<div class="cartao kpi"${cor ? ` style="border-left:4px solid ${cor}"` : ''}><div class="n">${n}</div><div class="r">${r}</div></div>`;
  tela.innerHTML = `
    <div class="topo"><div><h1>Km rodado por motorista</h1><p class="sub">${dataBR(ini)} a ${dataBR(fim)} · distância dos apontamentos do Creare, pelo motorista identificado no caminhão</p></div>
      <div class="acoes"><a class="btn" href="#/operacao/jornadas/creare">Jornadas</a><button class="btn" id="km-pdf">PDF</button></div></div>
    <form class="filtros" id="km-f"><select name="per"><option value="">Datas escolhidas</option>${Object.entries(PR).map(([k, [t, a, b]]) => `<option value="${k}" ${k === pre ? 'selected' : ''}>${t} (${dataBR(a).slice(0, 5)} a ${dataBR(b).slice(0, 5)})</option>`).join('')}</select>
      <label>De <input type="date" name="ini" value="${ini}"></label><label>Até <input type="date" name="fim" value="${fim}"></label><button class="btn prim">Ver</button></form>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:12px">
      ${kpi(kmF(total) + ' km', 'rodados no período')}${kpi(ident.length, 'motoristas com km')}${kpi(kmF(ident.length ? ident.reduce((a, m) => a + m.km, 0) / ident.length : 0) + ' km', 'média por motorista')}
      ${kpi(kmF(semId) + ' km', 'sem motorista identificado', semId > 0.5 ? '#E2B93B' : '#2BB673')}</div>
    ${semId > 0.5 ? `<div class="cartao" style="border-left:4px solid #E2B93B"><b>${kmF(semId)} km sem motorista identificado.</b> <span class="muted">Esse km não entra na conta de ninguém. Oriente o motorista a se identificar no Creare ao assumir o caminhão.</span></div>` : ''}
    <div class="cartao">${ms.length ? `<div class="tabela-wrap"><table class="tabela compacta"><thead><tr><th>Motorista</th><th>Frota (km)</th><th class="num">Dias com km</th><th class="num">Média por dia</th><th class="num">Km no período</th><th></th></tr></thead><tbody>
      ${ms.map((m, k) => `<tr data-k="${k}" style="cursor:pointer${m.semId ? ';background:#FFF8E6' : ''}"><td><b>${esc(m.nome)}</b></td>
        <td>${[...m.frotas].sort((a, b) => b[1] - a[1]).map(([f, v]) => `<span class="nowrap">${esc(f)} <span class="muted">(${kmF(v)})</span></span>`).join('<br>')}</td>
        <td class="num">${diasKm(m)}</td><td class="num">${kmF(m.km / Math.max(1, diasKm(m)))}</td><td class="num"><b>${kmF(m.km)}</b></td>
        <td style="min-width:120px">${m.semId ? '' : `<div style="height:8px;border-radius:4px;background:#eef0f1"><i style="display:block;height:8px;border-radius:4px;width:${(m.km / maior * 100).toFixed(1)}%;background:#DDA936"></i></div>`}</td></tr>`).join('')}
      <tr style="background:#F6EFDC"><td><b>Total</b></td><td></td><td></td><td></td><td class="num"><b>${kmF(total)}</b></td><td></td></tr></tbody></table></div>` : '<div class="vazio">Nenhum km registrado no período.</div>'}</div>
    <div class="cartao"><h2>Como é calculado</h2><ul class="muted" style="margin:0;padding-left:18px;line-height:1.55">
      <li>Soma a distância de cada apontamento do Creare (E09), no nome do motorista que estava identificado no caminhão naquele momento. O apontamento entra no dia em que começou.</li>
      <li>Se o motorista não se identificar, o km vai para "Motorista não se identificou" e não conta para ninguém.</li>
      <li>Clique no motorista para ver o km dia a dia.</li></ul></div>`;
  const f = $('#km-f', tela);
  f.per.onchange = () => { if (f.per.value) { f.ini.value = PR[f.per.value][1]; f.fim.value = PR[f.per.value][2]; } };
  f.ini.oninput = f.fim.oninput = () => { f.per.value = ''; };
  f.onsubmit = e => { e.preventDefault(); const d = formDados(f); location.hash = '#/operacao/jornadas/km?' + new URLSearchParams(d.per ? { per: d.per } : { ini: d.ini, fim: d.fim }); };
  $$('[data-k]', tela).forEach(tr => tr.onclick = () => { const m = ms[+tr.dataset.k], dias = [...m.dias].sort((a, b) => a[0].localeCompare(b[0]));
    modal(`<div><h2>${esc(m.nome)} · ${kmF(m.km)} km</h2><p class="muted">${dataBR(ini)} a ${dataBR(fim)}</p>
      <div class="tabela-wrap" style="max-height:60vh;overflow:auto"><table class="tabela compacta"><thead><tr><th>Dia</th><th>Frota</th><th class="num">Km</th></tr></thead><tbody>
      ${dias.map(([d, v]) => `<tr><td>${dataBR(d)}</td><td>${esc([...new Set(rows.filter(r => r[0] === m.nome && r[3] === d && Number(r[4]) > 0.5).map(r => r[1]))].join(', ') || '—')}</td><td class="num">${kmF(v)}</td></tr>`).join('')}
      </tbody></table></div><div class="rodape"><button type="button" class="btn" data-fechar>Fechar</button></div></div>`); });
  $('#km-pdf').onclick = e => ocupado(e.target, () => kmPdf(ms, ini, fim, total, semId, diasKm).catch(falha));
});
async function kmPdf(ms, ini, fim, total, semId, diasKm) {
  await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
  const E = (await empresasL().catch(() => []))[0] || {}, IMG = await imagensTimbrado(false);
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
  const ML = 20, MR = 190, TOPO = 40, BASE = 268, C = { texto: [37, 46, 53], cinza: [107, 115, 120], escuro: [37, 46, 53], creme: [246, 239, 220], borda: [215, 219, 222] };
  const feitas = new Set(), moldura = () => { const pg = doc.getCurrentPageInfo().pageNumber; if (!feitas.has(pg)) { feitas.add(pg); molduraTimbrado(doc, E, IMG); } };
  moldura(); let y = 46;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...C.texto); doc.text('Km rodado por motorista', ML, y); y += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...C.cinza);
  doc.text(`${dataBR(ini)} a ${dataBR(fim)} · fonte: apontamentos do Creare · emitido em ${new Date().toLocaleString('pt-BR')}`, ML, y); y += 6;
  const body = ms.map(m => [m.nome, [...m.frotas].sort((a, b) => b[1] - a[1]).map(([f, v]) => `${f} (${kmF(v)})`).join('\n'), diasKm(m), kmF(m.km / Math.max(1, diasKm(m))), kmF(m.km)]);
  body.push(['Total', '', '', '', kmF(total)]);
  doc.autoTable({ startY: y, margin: { left: ML, right: 210 - MR, top: TOPO + 4, bottom: 297 - BASE }, theme: 'grid', head: [['Motorista', 'Frota (km)', 'Dias com km', 'Média por dia', 'Km no período']], body,
    styles: { font: 'helvetica', fontSize: 8.4, textColor: C.texto, lineColor: C.borda, lineWidth: 0.15, cellPadding: 1.6, valign: 'top' },
    headStyles: { fillColor: C.escuro, textColor: 255, fontStyle: 'bold', fontSize: 7.8 }, columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' } },
    didParseCell: c => { if (c.section === 'body' && c.row.index === body.length - 1) { c.cell.styles.fillColor = C.creme; c.cell.styles.fontStyle = 'bold'; } }, willDrawPage: moldura });
  y = doc.lastAutoTable.finalY + 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...C.cinza);
  const nota = doc.splitTextToSize(`Km somado pela distância de cada apontamento do Creare, no nome do motorista identificado no caminhão.${semId > 0.5 ? ` ${kmF(semId)} km ficaram sem motorista identificado e não entram na conta de ninguém.` : ''}`, MR - ML);
  if (y + nota.length * 4 > BASE) { doc.addPage(); moldura(); y = TOPO + 4; } doc.text(nota, ML, y);
  paginarTimbrado(doc, false);
  doc.save(`Km por motorista ${ini} a ${fim}.pdf`);
}
