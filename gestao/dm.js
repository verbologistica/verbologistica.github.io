// Verbo Gestão — DM das frotas: disponibilidade mecânica acumulada, a partir dos apontamentos do Creare (E09)
// e das justificativas da torre. Tela + PDF no papel timbrado. Dados: rpc dm_frotas (script 157).
'use strict';

const DM_META = 0.96, DM_INI_PADRAO = '2026-11-05';
const DM_NOME = { deslocamento: 'Deslocamento', carregamento: 'Carregamento', amarracao: 'Amarração', aperto: 'Aperto / reaperto (amarração)', descarga: 'Descarga',
  limpeza: 'Limpeza de carreta', fila_carregamento: 'Fila de carregamento', fila_descarga: 'Fila de descarga', fila_balanca: 'Fila da balança', abastecimento: 'Abastecimento',
  aguardando_documento: 'Aguardando documento', descanso: 'Descanso', jornada: 'Início/fim de jornada, troca de turno', necessidades: 'Necessidades', refeicao: 'Refeição',
  outros: 'Outros', parada: 'Outras paradas', manutencao: 'Manutenção', atolado: 'Atolado / aguardando SOS' };
const DM_RESP = { sem: 'Sem justificativa da torre', creare: 'Justificado · problema Creare / computador de bordo', motorista: 'Justificado · motorista (não apontou)',
  outro: 'Justificado · outro motivo', lacuna: 'Sem registro no Creare (lacuna)' };
const DM_RESP_C = { creare: 'Creare (bordo)', motorista: 'Motorista', outro: 'Outro motivo' };
const DM_GRUPOS = ['Produtiva', 'Parada sem produção', 'Manutenção', 'Atolado', 'Sem apontamento'];
const DM_CORES = ['#252E35', '#DDA936', '#02654D', '#56A8E8', '#9B7BD8', '#EB5757', '#8D6E63', '#2BB673'];
const DM_CRITERIOS = [
  'DM = (horas do período − horas em manutenção) ÷ horas do período. Meta: 96%.',
  'Entram como manutenção: aguardando manutenção (2011/2012), corretiva (2072, 2401, 2402), preventiva (2411), socorro/SOS (2371, 2381, 2382) e borracharia (2431, 2432).',
  'Fora da DM: atolado / aguardando SOS (3061). Aperto / reaperto (3051/3052) é hora produtiva, por fazer parte da amarração da carga.',
  'Produtivas: deslocamento, carregamento, amarração, aperto/reaperto, descarga e limpeza. Paradas sem produção: filas (carregamento, descarga, balança), aguardando documento, início/fim de jornada e troca de turno, descanso, refeição, necessidades, abastecimento e outras.',
  'Sem apontamento (991/992): separado em justificado pela torre (Gestão operacional, por responsável) e sem justificativa; fica fora da DM e das produtivas.',
  'Período sem apontamento que a torre justificou marcando "caminhão em manutenção" conta como manutenção e sai de "sem apontamento"; o total de horas não muda e nada é contado duas vezes.',
  'Frotas: as que têm apontamento no Creare no período. Manutenção aberta conta até o momento em que o relatório é gerado.',
  'Limitação: sem ordens de serviço no período, início e fim da manutenção vêm dos apontamentos dos motoristas.'];

const dmF = (n, c = 1) => (+n || 0).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });
const dmP = n => n == null ? '—' : dmF(n * 100) + '%';
const dmGrupo = l => l.cl === 'manutencao' ? 'Manutenção' : l.cl === 'atolado' ? 'Atolado' : l.cl === 'nao_apontado' || l.cl === 'lacuna' ? 'Sem apontamento' : l.prod ? 'Produtiva' : 'Parada sem produção';
const dmTipo = l => l.cl === 'manutencao' ? (l.resp === 'torre' ? 'Manutenção informada pela torre (sem apontamento)' : 'Manutenção apontada no Creare') : l.cl === 'nao_apontado' ? (DM_RESP[l.resp] || l.resp) : l.cl === 'lacuna' ? DM_RESP.lacuna : (DM_NOME[l.cl] || l.cl);
const dmHoraSP = ts => new Date(ts).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '');
const dmDiaCurto = d => d.slice(8, 10) + '/' + d.slice(5, 7);
const dmNomeF = (frota, placa) => frota && frota !== placa ? `${frota} · ${placa}` : placa;

function dmCalc(d) {
  const dias = d.dias || [], H = dias.reduce((t, x) => t + +x.h, 0);
  const linhas = [...(d.linhas || [])];
  const placas = [...new Map(linhas.map(l => [l.placa, l.frota])).entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  // horas do período sem nenhum registro no Creare: entram como "sem apontamento" (lacuna), nunca como produtivas
  placas.forEach(([placa, frota]) => dias.forEach(x => { const t = linhas.filter(l => l.placa === placa && l.dia === x.dia).reduce((s, l) => s + +l.h, 0);
    if (+x.h - t > 0.01) linhas.push({ placa, frota, dia: x.dia, cl: 'lacuna', prod: false, resp: 'lacuna', h: +x.h - t }); }));
  const fr = placas.map(([placa, frota]) => {
    const ls = linhas.filter(l => l.placa === placa), s = g => ls.filter(l => dmGrupo(l) === g).reduce((t, l) => t + +l.h, 0);
    const man = s('Manutenção'), at = s('Atolado'), sa = s('Sem apontamento'), par = s('Parada sem produção'), prod = s('Produtiva');
    const just = ls.filter(l => l.cl === 'nao_apontado' && l.resp !== 'sem').reduce((t, l) => t + +l.h, 0), torre = ls.filter(l => l.resp === 'torre').reduce((t, l) => t + +l.h, 0);
    const porDia = dias.map(x => { const m = ls.filter(l => l.dia === x.dia && l.cl === 'manutencao').reduce((t, l) => t + +l.h, 0); return { dia: x.dia, h: +x.h, man: m, dm: +x.h ? (+x.h - m) / +x.h : null }; });
    return { placa, frota: dmNomeF(frota, placa), H, man, at, sa, just, torre, par, prod, dm: H ? (H - man) / H : null, porDia };
  });
  const C = fr.reduce((c, f) => { ['H', 'man', 'at', 'sa', 'just', 'par', 'prod'].forEach(k => (c[k] += f[k])); return c; }, { H: 0, man: 0, at: 0, sa: 0, just: 0, par: 0, prod: 0 });
  C.dm = C.H ? (C.H - C.man) / C.H : null;
  const tipos = {};
  linhas.forEach(l => { const g = dmGrupo(l), t = dmTipo(l), k = g + '|' + t; (tipos[k] ||= { g, t, v: {} }); tipos[k].v[l.placa] = (tipos[k].v[l.placa] || 0) + +l.h; });
  const soma = x => Object.values(x.v).reduce((a, b) => a + b, 0);
  const tl = Object.values(tipos).sort((a, b) => DM_GRUPOS.indexOf(a.g) - DM_GRUPOS.indexOf(b.g) || soma(b) - soma(a));
  // destaques automáticos
  const dest = [];
  if (fr.length) dest.push(`<b>Horas produtivas</b>: ${fr.map(f => `${esc(f.frota)} com ${dmF(f.prod)} h (${dmP(f.H ? f.prod / f.H : 0)})`).join(' e ')}.`);
  const abaixo = fr.filter(f => f.dm != null && f.dm < DM_META);
  if (abaixo.length) dest.push(`<b>${abaixo.length === fr.length ? (fr.length > 1 ? 'As frotas ficaram' : 'A frota ficou') : abaixo.map(f => esc(f.frota)).join(' e ') + (abaixo.length > 1 ? ' ficaram' : ' ficou')} abaixo da meta de DM de 96%</b>: ${abaixo.map(f => `${esc(f.frota)} a ${dmF((DM_META - f.dm) * 100)} pontos`).join(' e ')}. Para atingir 96%, o período comportaria no máximo ${dmF(H * (1 - DM_META))} h de manutenção por frota.`);
  fr.forEach(f => {
    const pior = f.porDia.filter(x => x.dm != null).sort((a, b) => a.dm - b.dm)[0];
    const det = (d.detalhe || []).filter(x => x.placa === f.placa && x.cl === 'manutencao');
    const ult = det[det.length - 1], aberta = ult && Math.abs(new Date(ult.fim) - new Date(d.fim)) < 120000;
    let txt = `<b>${esc(f.frota)} – DM ${dmP(f.dm)}</b>`;
    if (pior && pior.dm < 1) txt += `: pior dia em ${dmDiaCurto(pior.dia)} (${dmF(pior.man)} h em manutenção)`;
    if (f.at > 0.05) txt += `; ${dmF(f.at)} h atolado/aguardando SOS (fora da DM)`;
    if (aberta) { const ini = det.slice().reverse().reduce((acc, x) => acc && Math.abs(new Date(acc.inicio) - new Date(x.fim)) < 120000 ? x : acc, ult);
      txt += `; está em <b>${esc((ult.mensagem || 'manutenção').toLowerCase())} desde ${dmHoraSP(ini.inicio)}</b>, ainda aberta (${dmF((new Date(d.fim) - new Date(ini.inicio)) / 36e5)} h até agora)`; }
    dest.push(txt + '.');
  });
  return { dias, H, fr, C, tl, dest, ini: d.ini, fim: d.fim, just: d.justificativas || [], det: d.detalhe || [] };
}

// gráfico de colunas: DM por dia e por frota, com rótulos e linha da meta
function dmSvg(R, W = 900, Hh = 330) {
  const ml = 46, mr = 66, mt = 40, mb = 30, pw = W - ml - mr, ph = Hh - mt - mb, n = R.dias.length || 1, k = R.fr.length || 1;
  const gw = pw / n, bw = Math.min(26, (gw - 8) / k), y = v => mt + ph * (1 - v / 1.15);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${Hh}" width="${W}" height="${Hh}" font-family="Helvetica,Arial,sans-serif"><rect width="${W}" height="${Hh}" fill="#fff"/>`;
  s += `<text x="${ml}" y="16" font-size="12" fill="#252E35">DM por dia (%) · ${dataBR(R.ini)} a ${dmHoraSP(R.fim)}</text>`;
  R.fr.forEach((f, i) => { const lx = W - mr - (R.fr.length - i) * 135; s += `<rect x="${lx}" y="7" width="12" height="10" fill="${DM_CORES[i % DM_CORES.length]}"/><text x="${lx + 16}" y="16" font-size="11" fill="#252E35">${esc(f.frota)}</text>`; });
  for (let v = 0; v <= 100; v += 20) s += `<line x1="${ml}" x2="${W - mr}" y1="${y(v / 100)}" y2="${y(v / 100)}" stroke="#E6EAEC"/><text x="${ml - 6}" y="${y(v / 100) + 4}" font-size="10" text-anchor="end" fill="#6B7378">${v}</text>`;
  R.dias.forEach((x, j) => {
    const gx = ml + j * gw + (gw - bw * k) / 2;
    R.fr.forEach((f, i) => { const v = f.porDia[j]?.dm; if (v == null) return; const bx = gx + i * bw, by = y(v);
      s += `<rect x="${bx}" y="${by}" width="${bw - 2}" height="${mt + ph - by}" fill="${DM_CORES[i % DM_CORES.length]}"><title>${esc(f.frota)} ${dmDiaCurto(x.dia)}: ${dmP(v)}</title></rect>`;
      const cor = v < DM_META ? '#C62828' : '#252E35', rot = Math.round(v * 100);
      s += bw - 2 >= 16 ? `<text x="${bx + (bw - 2) / 2}" y="${by - 4}" font-size="9" font-weight="bold" text-anchor="middle" fill="${cor}" stroke="#fff" stroke-width="3" paint-order="stroke">${rot}</text>`
        : `<text transform="translate(${bx + (bw - 2) / 2 + 3},${by - 3}) rotate(-90)" font-size="9" fill="${cor}">${rot}</text>`; });
    s += `<text x="${ml + j * gw + gw / 2}" y="${Hh - 10}" font-size="10" text-anchor="middle" fill="#252E35">${dmDiaCurto(x.dia)}</text>`;
  });
  s += `<line x1="${ml}" x2="${W - mr}" y1="${y(DM_META)}" y2="${y(DM_META)}" stroke="#C62828" stroke-width="1.6" stroke-dasharray="6 4"/>`;
  s += `<text x="${W - mr + 6}" y="${y(DM_META) + 4}" font-size="11" font-weight="bold" fill="#C62828">Meta 96%</text>`;
  s += `<line x1="${ml}" x2="${W - mr}" y1="${mt + ph}" y2="${mt + ph}" stroke="#252E35"/><text transform="translate(12,${mt + ph / 2}) rotate(-90)" font-size="10" text-anchor="middle" fill="#252E35">DM do dia (%)</text></svg>`;
  return s;
}
function dmPng(svg, W, H, esc2 = 2) {
  return new Promise((ok, erro) => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = W * esc2; c.height = H * esc2;
    const x = c.getContext('2d'); x.scale(esc2, esc2); x.drawImage(img, 0, 0, W, H); ok(c.toDataURL('image/png')); }; img.onerror = erro;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
}
const dmTitulo = R => `Disponibilidade Mecânica (DM) – ${R.fr.map(f => f.frota).join(' e ') || 'frotas'}`;
const dmPeriodo = R => `Período: ${dataBR(R.ini)} 00:00 a ${new Date(R.fim).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '')}`;
const dmArquivo = R => `DM ${R.fr.map(f => f.frota).join(' ')} ${dataBR(R.ini).slice(0, 5).replace('/', '-')} a ${new Date(R.fim).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).slice(0, 5).replace('/', '-')}`;

rota('/operacao/dm', async tela => {
  if (!document.getElementById('pl-css')) document.head.insertAdjacentHTML('beforeend', plCss);
  const P = estado.params, hoje = hojeISO(), ini = P.get('de') || DM_INI_PADRAO, fim = P.get('ate') || hoje;
  let d;
  try { d = await api.rpc('dm_frotas', { p_ini: new Date(ini + 'T00:00:00-03:00').toISOString(), p_fim: new Date(fim + 'T23:59:59-03:00').toISOString() }); } catch (err) { falha(err); return; }
  if (!d) { tela.innerHTML = '<div class="vazio">Sem permissão para ver este relatório.</div>'; return; }
  const R = dmCalc(d);
  const kpiCab = ['Frota', 'Horas do período', 'Manutenção', 'DM (meta 96%)', 'Atolado / ag. SOS', 'Sem apont.', 'Paradas sem produção', 'Horas produtivas', '% produtivo'];
  const kpiLin = f => [f.frota, dmF(f.H), dmF(f.man), dmP(f.dm), dmF(f.at), dmF(f.sa), dmF(f.par), dmF(f.prod), dmP(f.H ? f.prod / f.H : 0)];
  const tdDm = v => `<td class="num" style="font-weight:700;color:${v != null && v < DM_META ? '#C62828' : '#1E8E57'}">${dmP(v)}</td>`;
  const tabTipos = () => { let ant = null, h = '';
    R.tl.forEach(x => { if (x.g !== ant) { ant = x.g; const st = R.fr.map(f => R.tl.filter(y => y.g === x.g).reduce((t, y) => t + (y.v[f.placa] || 0), 0));
      h += `<tr style="background:#EEF0F1;font-weight:700"><td>${x.g}</td><td>Subtotal</td>${st.map(v => `<td class="num">${dmF(v)}</td>`).join('')}</tr>`; }
      h += `<tr><td></td><td>${esc(x.t)}</td>${R.fr.map(f => `<td class="num">${dmF(x.v[f.placa] || 0)}</td>`).join('')}</tr>`; });
    return `<table class="tabela compacta"><thead><tr><th>Grupo</th><th>Tipo de apontamento</th>${R.fr.map(f => `<th class="num">${esc(f.frota)} (h)</th>`).join('')}</tr></thead><tbody>${h}</tbody>
      <tfoot><tr><th colspan="2">Total</th>${R.fr.map(f => `<th class="num">${dmF(f.H)}</th>`).join('')}</tr></tfoot></table>`; };
  tela.innerHTML = `
    <div class="topo"><div><h1>DM das frotas</h1><p class="sub">Disponibilidade mecânica acumulada · apontamentos do Creare (E09) e justificativas da torre · meta 96%</p></div>
      <div class="acoes"><button class="btn prim" id="dm-pdf">Baixar PDF</button></div></div>
    <form class="filtros pl-barra" id="dm-f"><label>De <input type="date" name="de" value="${ini}"></label><label>Até <input type="date" name="ate" value="${fim}"></label><button class="btn prim">Ver</button>
      <button type="button" class="btn" data-per="acum">Acumulado desde 05/11</button><button type="button" class="btn" data-per="mes">Este mês</button></form>
    ${plAbas('dm')}
    ${R.fr.length ? `
    <div class="cartao"><h2>${esc(dmTitulo(R))}</h2><p class="muted" style="margin-top:-4px">${esc(dmPeriodo(R))}</p>
      <div style="overflow-x:auto"><table class="tabela compacta"><thead><tr>${kpiCab.map((c, i) => `<th${i ? ' class="num"' : ''}>${c}</th>`).join('')}</tr></thead><tbody>
      ${R.fr.map(f => { const l = kpiLin(f); return `<tr><td><b>${esc(l[0])}</b></td>${l.slice(1).map((v, i) => i === 2 ? tdDm(f.dm) : `<td class="num">${v}</td>`).join('')}</tr>`; }).join('')}
      ${R.fr.length > 1 ? `<tr style="font-weight:700;background:#F6EFDC"><td>Total da frota</td><td class="num">${dmF(R.C.H)}</td><td class="num">${dmF(R.C.man)}</td>${tdDm(R.C.dm)}<td class="num">${dmF(R.C.at)}</td><td class="num">${dmF(R.C.sa)}</td><td class="num">${dmF(R.C.par)}</td><td class="num">${dmF(R.C.prod)}</td><td class="num">${dmP(R.C.H ? R.C.prod / R.C.H : 0)}</td></tr>` : ''}
      </tbody></table></div></div>
    <div class="cartao"><div style="overflow-x:auto">${dmSvg(R).replace(/width="\d+" height="\d+"/, 'style="width:100%;min-width:640px;height:auto;display:block"')}</div></div>
    <div class="cartao"><h2>Destaques</h2><ul style="margin:0;padding-left:18px;line-height:1.6">${R.dest.map(t => `<li>${t}</li>`).join('')}</ul></div>
    <div class="cartao"><h2>Horas por tipo de apontamento</h2><div style="overflow-x:auto">${tabTipos()}</div></div>
    <div class="cartao"><h2>Sem apontamento: justificativas da torre</h2>
      <div style="overflow-x:auto"><table class="tabela compacta"><thead><tr><th>Frota</th><th class="num">Sem apontamento (h)</th><th class="num">Justificadas como manutenção → vão para Manutenção (h)</th><th class="num">Justificadas por outros motivos (h)</th><th class="num">Sem justificativa (h)</th></tr></thead><tbody>
      ${R.fr.map(f => `<tr><td><b>${esc(f.frota)}</b></td><td class="num">${dmF(f.sa + f.torre)}</td><td class="num">${dmF(f.torre)}</td><td class="num">${dmF(f.just)}</td><td class="num">${dmF(f.sa - f.just)}</td></tr>`).join('')}</tbody></table></div>
      ${R.just.length ? `<div style="overflow-x:auto;margin-top:10px"><table class="tabela compacta"><thead><tr><th>Frota</th><th>Início</th><th>Fim</th><th class="num">Horas</th><th>Responsável</th><th>Justificativa</th></tr></thead><tbody>
      ${R.just.map(x => `<tr><td>${esc(dmNomeF(x.frota, x.placa))}</td><td class="nowrap">${dmHoraSP(x.inicio)}</td><td class="nowrap">${dmHoraSP(x.fim)}</td><td class="num">${dmF(x.h)}</td><td>${esc(DM_RESP_C[x.resp] || x.resp || '')}${x.em_manutencao ? ' <span class="tag vermelho">→ manutenção</span>' : ''}</td><td>${esc(x.explicacao || '')}${x.chamado ? ` <span class="muted">· chamado Creare ${esc(x.chamado)}</span>` : ''}</td></tr>`).join('')}
      </tbody></table></div>` : '<p class="muted">Nenhuma justificativa no período.</p>'}</div>
    <div class="cartao"><h2>Critérios</h2><ul class="muted" style="margin:0;padding-left:18px;line-height:1.55">${DM_CRITERIOS.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>`
    : '<div class="cartao"><div class="vazio">Nenhuma frota com apontamento do Creare no período.</div></div>'}`;
  const f = $('#dm-f', tela);
  f.onsubmit = e => { e.preventDefault(); location.hash = `#/operacao/dm?de=${f.de.value}&ate=${f.ate.value}`; };
  $$('[data-per]', tela).forEach(b => b.onclick = () => { location.hash = `#/operacao/dm?de=${b.dataset.per === 'mes' ? hoje.slice(0, 8) + '01' : DM_INI_PADRAO}&ate=${hoje}`; });
  $('#dm-pdf', tela).onclick = () => R.fr.length ? ocupado($('#dm-pdf', tela), () => dmPdf(R)) : aviso('Nada para exportar no período.', true);
});

async function dmPdf(R) {
  await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
  const E = (await empresasL().catch(() => []))[0] || {}, IMG = await imagensTimbrado(false);
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
  const ML = 20, MR = 190, LU = 170, TOPO = 40, BASE = 268;
  const C = { texto: [37, 46, 53], cinza: [107, 115, 120], ouro: [221, 169, 54], escuro: [37, 46, 53], verm: [198, 40, 40], verde: [30, 142, 87], sub: [238, 240, 241], creme: [246, 239, 220], borda: [215, 219, 222] };
  const feitas = new Set(), moldura = () => { const pg = doc.getCurrentPageInfo().pageNumber; if (!feitas.has(pg)) { feitas.add(pg); molduraTimbrado(doc, E, IMG); } };
  const novaSeNec = h => { if (y + h > BASE) { doc.addPage(); moldura(); y = TOPO + 4; } };
  const tabela = (head, body, opts = {}) => { doc.autoTable({ startY: y, margin: { left: ML, right: 210 - MR, top: TOPO + 4, bottom: 297 - BASE }, theme: 'grid', head: [head], body,
    styles: { font: 'helvetica', fontSize: 7.8, textColor: C.texto, lineColor: C.borda, lineWidth: 0.15, cellPadding: 1.3, valign: 'top' },
    headStyles: { fillColor: C.escuro, textColor: 255, fontStyle: 'bold', fontSize: 7.4, lineWidth: 0 }, willDrawPage: moldura, ...opts }); y = doc.lastAutoTable.finalY + 5; };
  const titulo3 = t => { novaSeNec(12); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...C.texto); doc.text(t, ML, y); y += 4.5; };
  const paragrafo = (html, fs = 8.6) => { const t = html.replace(/−/g, '-').replace(/→/g, '>').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    doc.setFont('helvetica', 'normal'); doc.setFontSize(fs); doc.setTextColor(...C.texto); const l = doc.splitTextToSize(t, LU); novaSeNec(l.length * fs * 0.42); doc.text(l, ML, y); y += l.length * fs * 0.42 + 1.2; };
  moldura();
  let y = 46;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...C.texto); doc.text(dmTitulo(R), ML, y); y += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...C.cinza);
  doc.text(`${dmPeriodo(R)} · Guararapes/SP, ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}`, ML, y); y += 5;
  const lin = f => [f.frota, dmF(f.H), dmF(f.man), dmP(f.dm), dmF(f.at), dmF(f.sa), dmF(f.par), dmF(f.prod), dmP(f.H ? f.prod / f.H : 0)];
  const body = R.fr.map(lin); if (R.fr.length > 1) body.push(lin({ ...R.C, frota: 'Total da frota' }));
  tabela(['Frota', 'Horas do período', 'Manutenção', 'DM (meta 96%)', 'Atolado / ag. SOS', 'Sem apontam.', 'Paradas sem produção', 'Horas produtivas', '% produtivo'], body, {
    styles: { font: 'helvetica', fontSize: 8.6, textColor: C.texto, lineColor: C.borda, lineWidth: 0.15, cellPadding: 1.8, halign: 'center' }, headStyles: { fillColor: C.escuro, textColor: 255, fontStyle: 'bold', fontSize: 7.2, halign: 'center', valign: 'middle' },
    didParseCell: c => { if (c.section !== 'body') return; const f = c.row.index < R.fr.length ? R.fr[c.row.index] : R.C;
      if (c.column.index === 3) { c.cell.styles.fontStyle = 'bold'; c.cell.styles.fontSize = 10; c.cell.styles.textColor = f.dm != null && f.dm < DM_META ? C.verm : C.verde; }
      if (c.row.index === R.fr.length) { c.cell.styles.fillColor = C.creme; c.cell.styles.fontStyle = 'bold'; }
      if (c.column.index === 0) c.cell.styles.halign = 'left'; } });
  const svg = dmSvg(R, 900, 330), png = await dmPng(svg, 900, 330);
  novaSeNec(66); doc.addImage(png, 'PNG', ML, y, LU, LU * 330 / 900); y += LU * 330 / 900 + 5;
  titulo3('Destaques'); R.dest.forEach(t => paragrafo('• ' + t));
  y += 2; titulo3('Horas por tipo de apontamento');
  const tb = [], sub = []; let ant = null;
  R.tl.forEach(x => { if (x.g !== ant) { ant = x.g; sub.push(tb.length); tb.push([x.g, 'Subtotal', ...R.fr.map(f => dmF(R.tl.filter(z => z.g === x.g).reduce((t, z) => t + (z.v[f.placa] || 0), 0)))]); }
    tb.push(['', x.t, ...R.fr.map(f => dmF(x.v[f.placa] || 0))]); });
  tb.push(['Total', '', ...R.fr.map(f => dmF(f.H))]);
  tabela(['Grupo', 'Tipo de apontamento', ...R.fr.map(f => f.frota + ' (h)')], tb, { columnStyles: Object.fromEntries(R.fr.map((f, i) => [i + 2, { halign: 'right' }])),
    didParseCell: c => { if (c.section !== 'body') return; if (sub.includes(c.row.index)) { c.cell.styles.fontStyle = 'bold'; c.cell.styles.fillColor = C.sub; }
      if (c.row.index === tb.length - 1) { c.cell.styles.fontStyle = 'bold'; c.cell.styles.fillColor = C.creme; } } });
  titulo3('Sem apontamento: justificativas da torre');
  tabela(['Frota', 'Sem apontamento (h)', 'Justificadas como manutenção (vão para Manutenção) (h)', 'Justificadas por outros motivos (h)', 'Sem justificativa (h)'], R.fr.map(f => [f.frota, dmF(f.sa + f.torre), dmF(f.torre), dmF(f.just), dmF(f.sa - f.just)]),
    { columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } } });
  if (R.just.length) tabela(['Frota', 'Início', 'Fim', 'Horas', 'Responsável', 'Justificativa'],
    R.just.map(x => [dmNomeF(x.frota, x.placa), dmHoraSP(x.inicio), dmHoraSP(x.fim), dmF(x.h), (DM_RESP_C[x.resp] || x.resp || '') + (x.em_manutencao ? ' (conta como manutenção)' : ''), (x.explicacao || '') + (x.chamado ? ` Chamado Creare ${x.chamado}.` : '')]),
    { styles: { font: 'helvetica', fontSize: 7.3, textColor: C.texto, lineColor: C.borda, lineWidth: 0.15, cellPadding: 1.2, valign: 'top' }, columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 19 }, 2: { cellWidth: 19 }, 3: { cellWidth: 12, halign: 'right' }, 4: { cellWidth: 24 } }, rowPageBreak: 'avoid' });
  titulo3('Critérios'); DM_CRITERIOS.forEach(t => paragrafo(t, 8.2));
  y += 6; novaSeNec(12); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...C.texto); doc.text('Ana Maria Rodrigues Santos', ML, y); y += 4;
  doc.setFont('helvetica', 'normal'); doc.text('Supervisora de Qualidade e Performance', ML, y);
  paginarTimbrado(doc, false);
  doc.save(dmArquivo(R) + '.pdf');
}

if (typeof PL_HUB !== 'undefined' && !PL_HUB.some(h => h[0] === 'dm')) PL_HUB.push(['dm', 'DM das frotas', '#/operacao/dm', 0]);
