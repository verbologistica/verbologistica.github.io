// Verbo Gestão — Biblioteca › Apresentações: monta slides no padrão Verbo, apresenta em tela cheia (com transições e mapa animado),
// gera PDF e baixa .pptx (mesmo núcleo do modelo PowerPoint: apresentacoes-core.js).

// ---------- imagens do padrão (geradas no navegador a partir da capa e do logo do site) ----------
let _vbA = null;
function vbImg(src) { return new Promise((ok, no) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = no; i.src = src; }); }
function vbCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
async function vboAssetsNav() {
  if (_vbA) return _vbA;
  const [capa, logo] = await Promise.all([vbImg('capa-base.webp'), vbImg('logo.png')]);
  // fundo da capa: foto + véu verde-escuro (mais fechado à esquerda) + brilho dourado
  let [c, x] = vbCanvas(1920, 1080); x.drawImage(capa, 0, 0, 1920, 1080);
  const g = x.createLinearGradient(0, 0, 1920, 0);
  for (let k = 0; k <= 10; k++) { const t = k / 10, a = 0.96 - 0.40 * Math.pow(t, 1.4); g.addColorStop(t, `rgba(${Math.round(5 - 2 * t)},${Math.round(22 + 38 * t)},${Math.round(17 + 29 * t)},${a.toFixed(3)})`); }
  x.fillStyle = g; x.fillRect(0, 0, 1920, 1080);
  const r = x.createRadialGradient(288, 108, 0, 288, 108, 864); r.addColorStop(0, 'rgba(221,169,54,.16)'); r.addColorStop(1, 'rgba(221,169,54,0)'); x.fillStyle = r; x.fillRect(0, 0, 1920, 1080);
  const fundo = c.toDataURL('image/jpeg', 0.86);
  // foto para "Texto e imagem": recorte do lado direito, um pouco mais clara
  [c, x] = vbCanvas(1215, 990); x.filter = 'brightness(1.25) contrast(1.08)'; x.drawImage(capa, 470, 60, 810, 660, 0, 0, 1215, 990);
  const foto = c.toDataURL('image/jpeg', 0.86);
  // logos: original (fundo escuro) e com o texto verde-escuro (fundo claro)
  [c, x] = vbCanvas(logo.naturalWidth, logo.naturalHeight); x.drawImage(logo, 0, 0); const logoClaro = c.toDataURL('image/png');
  const d = x.getImageData(0, 0, c.width, c.height); const p = d.data;
  for (let i = 0; i < p.length; i += 4) { const [R, G, B] = [p[i], p[i + 1], p[i + 2]];
    if ((R > 180 && G > 180 && B > 180) || (Math.abs(R - G) < 18 && Math.abs(G - B) < 18 && R > 60)) { p[i] = 12; p[i + 1] = 29; p[i + 2] = 24; } }
  x.putImageData(d, 0, 0); const logoEscuro = c.toDataURL('image/png');
  _vbA = { fundo, foto, logoClaro, logoEscuro, geo: typeof geoBR === 'function' ? geoBR() : [] };
  return _vbA;
}
async function vboIconePng(nome, cor = '#FFFFFF') {
  const i = await vbImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(vboSvgIcone(nome, cor)));
  const [c, x] = vbCanvas(256, 256); x.drawImage(i, 0, 0, 256, 256); return c.toDataURL('image/png');
}

// ---------- slide em HTML (palco 1333×750 px = 13,333×7,5 pol; 1 pol = 100 px) ----------
const VB_PT = 100 / 72;
const vbPos = (x, y, w, h) => `left:${(x * 100).toFixed(1)}px;top:${(y * 100).toFixed(1)}px;width:${(w * 100).toFixed(1)}px;height:${(h * 100).toFixed(1)}px`;
function vbT(html, o) {
  const jc = o.valign === 'middle' ? 'center' : o.valign === 'bottom' ? 'flex-end' : 'flex-start';
  return `<div class="vb-t${o.an ? ' an' : ''}${o.cls ? ' ' + o.cls : ''}"${o.m ? ` data-m="${o.m}"` : ''}${o.an ? ` data-e="${o.an[1] || 'fade'}"` : ''} style="${vbPos(o.x, o.y, o.w, o.h)};font-size:${(o.fs * VB_PT).toFixed(1)}px;color:#${o.cor};${o.bold ? 'font-weight:700;' : ''}text-align:${o.align || 'left'};justify-content:${jc};${o.ls ? `letter-spacing:${o.ls}px;` : ''}${o.an ? `--d:${o.an[0]}ms;` : ''}">${html}</div>`;
}
function vbForma(aneis, o) { // aneis em polegadas → <svg> posicionado no próprio retângulo (permite o "morph" por FLIP)
  const t = aneis.flat(); const x0 = Math.min(...t.map(p => p[0])), y0 = Math.min(...t.map(p => p[1])), x1 = Math.max(...t.map(p => p[0])), y1 = Math.max(...t.map(p => p[1]));
  const w = Math.max(x1 - x0, 0.01), h = Math.max(y1 - y0, 0.01);
  const d = aneis.map(a => 'M' + a.map(([x, y]) => ((x - x0) * 100).toFixed(1) + ',' + ((y - y0) * 100).toFixed(1)).join('L') + 'Z').join('');
  return `<svg class="vb-f${o.an ? ' an' : ''}"${o.m ? ` data-m="${o.m}"` : ''}${o.an ? ` data-e="${o.an[1] || 'fade'}" style="--d:${o.an[0]}ms;` : ' style="'}${vbPos(x0, y0, w, h)}" viewBox="0 0 ${(w * 100).toFixed(1)} ${(h * 100).toFixed(1)}" preserveAspectRatio="none"><path d="${d}" fill="${o.fill}"${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw || 1}" vector-effect="non-scaling-stroke"` : ''}/></svg>`;
}
function vbChevron(x, y, w, cv = '#' + VBO.verde) { const s = w / VBO_CHEVRON.vb[0];
  return vbForma([vboPontosPath(VBO_CHEVRON.verde).map(([a, b]) => [x + a * s, y + b * s])], { fill: cv, m: 'chevV' })
    + vbForma([vboPontosPath(VBO_CHEVRON.ouro).map(([a, b]) => [x + a * s, y + b * s])], { fill: '#' + VBO.ouro, m: 'chevG' }); }
const vbBola = (x, y, d, o) => `<div class="vb-b${o.an ? ' an' : ''}"${o.m ? ` data-m="${o.m}"` : ''}${o.an ? ` data-e="${o.an[1] || 'zoom'}"` : ''} style="${vbPos(x - d / 2, y - d / 2, d, d)};background:${o.fill};${o.borda ? `box-shadow:0 0 0 ${o.borda};` : ''}${o.an ? `--d:${o.an[0]}ms;` : ''}"></div>`;
const vbCaixa = (x, y, w, h, o) => `<div class="vb-r${o.an ? ' an' : ''}"${o.an ? ` data-e="${o.an[1] || 'fade'}"` : ''} style="${vbPos(x, y, w, h)};background:${o.fill};border-radius:${o.raio ?? 12}px;${o.an ? `--d:${o.an[0]}ms;` : ''}"></div>`;
function vbParagrafos(texto, base) {
  const ls = String(texto || '').split('\n').filter(l => l.trim()); let html = '', lista = false;
  for (const l of ls) { const top = /^\s*[-•]\s+/.test(l); const t = esc(l.replace(/^\s*[-•]\s+/, ''));
    if (top && !lista) { html += '<ul>'; lista = true; } if (!top && lista) { html += '</ul>'; lista = false; }
    html += top ? `<li style="font-size:${((base - 2) * VB_PT).toFixed(1)}px">${t}</li>` : `<p>${t}</p>`; }
  return html + (lista ? '</ul>' : '');
}
const vbHex = c => '#' + c;
function vbMolde(tipo, s, n, A) { // fundo, logo, número e título conforme o layout
  const T = esc(s.titulo || '');
  if (tipo === 'capa') return `<div class="vb-bg" style="background:#0C1D18 url(${A.fundo}) center/cover"></div><img class="vb-logo" src="${A.logoClaro}" style="${vbPos(0.75, 0.6, 2.3, 2.3 * 123 / 418)}" alt="">`;
  const esc_ = tipo !== 'claro';
  return `<div class="vb-bg" style="background:${tipo === 'verde' ? vbHex(VBO.verde) : esc_ ? vbHex(VBO.esc) : '#fff'}"></div>
    <img class="vb-logo" src="${esc_ ? A.logoClaro : A.logoEscuro}" style="${vbPos(0.6, 6.93, 1.15, 1.15 * 123 / 418)}" alt="">
    ${tipo === 'secao' ? '' : vbT(String(n), { x: 12.2, y: 6.93, w: 0.53, h: 0.34, fs: 10, cor: esc_ ? VBO.suave : VBO.cinza, align: 'right' })}
    ${tipo === 'secao' || tipo === 'verde' || s.tipo === 'mapa' ? '' : vbT(T, { x: 0.6, y: 0.45, w: 12.13, h: 0.85, fs: 32, bold: true, cor: esc_ ? VBO.branco : VBO.texto })}`;
}
function vboSlideHtml(s, n, A) {
  let h = ''; const an = (d, e) => [d, e];
  switch (s.tipo) {
    case 'capa':
      h = vbMolde('capa', s, n, A) + vbChevron(8.4, 2.05, 4.35)
        + (s.rotulo ? vbT(esc(s.rotulo), { x: 0.75, y: 2.0, w: 7.4, h: 0.35, fs: 13, bold: true, cor: VBO.ouro, ls: 5, an: an(300) }) : '')
        + vbT(esc(s.titulo || ''), { x: 0.75, y: 2.45, w: 7.6, h: 1.95, fs: 44, bold: true, cor: VBO.branco, valign: 'bottom', an: an(500) })
        + vbT(esc(s.subtitulo || ''), { x: 0.75, y: 4.55, w: 7.4, h: 0.95, fs: 18, cor: VBO.suave, an: an(800) })
        + (s.rodape ? vbT(esc(s.rodape), { x: 0.75, y: 6.5, w: 8, h: 0.4, fs: 13, cor: VBO.suave, an: an(1100) }) : '');
      break;
    case 'agenda': {
      h = vbMolde('escuro', { ...s, titulo: s.titulo || 'Agenda' }, n, A) + vbChevron(0.75, 4.75, 2.6);
      const it = (s.itens || []).filter(Boolean).slice(0, 7); const rh = Math.min(0.95, 5.6 / Math.max(it.length, 1)); const y0 = (7.5 - rh * it.length) / 2;
      it.forEach((t, i) => { const y = y0 + i * rh, a = an(250 + i * 180);
        h += vbT(String(i + 1).padStart(2, '0'), { x: 5.3, y, w: 0.9, h: rh, fs: 26, bold: true, cor: VBO.ouro, valign: 'middle', an: a })
          + vbT(esc(t), { x: 6.3, y, w: 6.4, h: rh, fs: 22, cor: VBO.branco, valign: 'middle', an: a })
          + (i < it.length - 1 ? `<div class="vb-l an" data-e="fade" style="${vbPos(5.3, y + rh, 7.4, 0.01)};--d:${a[0]}ms"></div>` : ''); });
      break; }
    case 'secao':
      h = vbMolde('secao', s, n, A) + vbChevron(7.7, 1.75, 6.6)
        + (s.numero ? vbT(esc(s.numero), { x: 0.7, y: 0.9, w: 5, h: 2.1, fs: 130, bold: true, cor: VBO.ouro, valign: 'bottom', an: an(200, 'zoom') }) : '')
        + vbT(esc(s.titulo || ''), { x: 0.75, y: 3.15, w: 7.2, h: 1.5, fs: 40, bold: true, cor: VBO.branco })
        + (s.texto ? vbT(esc(s.texto), { x: 0.75, y: 4.75, w: 6.6, h: 1.2, fs: 18, cor: VBO.suave, an: an(700) }) : '');
      break;
    case 'conteudo': {
      h = vbMolde('claro', s, n, A); const img = s.imagem === 'foto' ? A.foto : s.imagem && String(s.imagem).startsWith('data:image') ? s.imagem : null;
      h += vbT(vbParagrafos(s.texto, 21), { x: 0.6, y: 1.65, w: img ? 6.1 : 12.13, h: 4.9, fs: 21, cor: VBO.texto, cls: 'vb-par', an: an(500) });
      if (img) { const ih = s.legenda ? 4.55 : 4.95;
        h += `<div class="vb-img an" data-e="fade" style="${vbPos(7.15, 1.65, 5.58, ih)};background-image:url(${img});--d:300ms"></div>`
          + (s.legenda ? vbT(esc(s.legenda), { x: 7.15, y: 6.3, w: 5.58, h: 0.35, fs: 11, cor: VBO.cinza, an: an(300) }) : ''); }
      break; }
    case 'cards': {
      h = vbMolde('claro', s, n, A); const it = (s.itens || []).slice(0, 4); const k = Math.max(it.length, 1), g = 0.3, cw = (12.13 - g * (k - 1)) / k;
      it.forEach((c, i) => { const x = 0.6 + i * (cw + g), y = 1.85, a = an(250 + i * 220, 'zoom');
        h += vbCaixa(x, y, cw, 4.2, { fill: vbHex(VBO.claro), an: a })
          + `<div class="vb-ic an" data-e="zoom" style="${vbPos(x + 0.35, y + 0.45, 0.95, 0.95)};--d:${a[0]}ms">${vboSvgIcone(c.icone || 'estrela', '#fff')}</div>`
          + vbT(esc(c.titulo || ''), { x: x + 0.35, y: y + 1.75, w: cw - 0.6, h: 0.5, fs: 18, bold: true, cor: VBO.texto, an: a })
          + vbT(esc(c.texto || ''), { x: x + 0.35, y: y + 2.35, w: cw - 0.6, h: 1.6, fs: 16, cor: VBO.cinza, an: a }); });
      break; }
    case 'numeros': {
      h = vbMolde('escuro', s, n, A); const it = (s.itens || []).slice(0, 4); const k = Math.max(it.length, 1), g = 0.3, cw = (12.13 - g * (k - 1)) / k;
      it.forEach((c, i) => { const x = 0.6 + i * (cw + g), y = 1.9, a = an(250 + i * 250, 'zoom');
        h += vbCaixa(x, y, cw, 3.9, { fill: vbHex(VBO.esc2), an: a })
          + vbT(esc(c.valor || ''), { x: x + 0.35, y: y + 0.55, w: cw - 0.7, h: 1.35, fs: k > 3 ? 50 : 58, bold: true, cor: VBO.ouro, valign: 'bottom', an: a })
          + vbT(esc(c.rotulo || ''), { x: x + 0.35, y: y + 2.1, w: cw - 0.7, h: 1.4, fs: 17, cor: VBO.branco, an: a }); });
      if (s.nota) h += vbT(esc(s.nota), { x: 0.6, y: 6.15, w: 12.13, h: 0.35, fs: 11, cor: VBO.suave });
      break; }
    case 'grafico': {
      h = vbMolde('claro', s, n, A); const lado = !!(s.destaque || s.texto); const cw = lado ? 8.15 : 12.13;
      h += `<div class="vb-graf" style="${vbPos(0.6, 1.55, cw, 5.05)}">${vbGraficoSvg(s.grafico || {}, cw * 100, 505)}</div>`;
      if (lado) h += vbCaixa(9.05, 1.55, 3.68, 5.05, { fill: vbHex(VBO.claro), an: an(600) })
        + (s.destaque ? vbT(esc(s.destaque), { x: 9.4, y: 1.95, w: 3.0, h: 1.1, fs: 48, bold: true, cor: VBO.verde, an: an(600) }) : '')
        + vbT(esc(s.texto || ''), { x: 9.4, y: s.destaque ? 3.2 : 1.95, w: 3.0, h: s.destaque ? 3.1 : 4.3, fs: 16, cor: VBO.texto, an: an(600) });
      break; }
    case 'mapa': {
      const pts = (s.pontos || []).filter(p => isFinite(Number(p.lat)) && isFinite(Number(p.lng)) && p.lat !== '' && p.lng !== '');
      const zoom = s._vista === 'zoom'; const G = vboGeoMapa(pts, zoom, A.geo); const ufs = new Set(pts.map(p => p.uf));
      h = vbMolde('escuro', s, n, A);
      h += G.estados.map(e => vbForma(e.aneis, { fill: e.ativo ? '#1C4F41' : vbHex(VBO.esc2), stroke: '#2E6152', sw: 0.8, m: 'uf-' + e.uf })).join('');
      const ord = G.pontos.map((p, i) => i).sort((a, b) => G.pontos[a].pos[0] - G.pontos[b].pos[0]);
      G.pontos.forEach((p, i) => { const k = ord.indexOf(i); const a = zoom ? null : an(500 + k * 110, 'zoom');
        h += vbBola(p.pos[0], p.pos[1], G.dh, { fill: 'rgba(221,169,54,.28)', m: 'ph' + i, an: a }) + vbBola(p.pos[0], p.pos[1], G.dp, { fill: vbHex(VBO.ouro), borda: '1px #0C1D18', m: 'pt' + i, an: a }); });
      h += `<div class="vb-bg vb-painel" data-m="painel" style="${vbPos(0, 0, 4.75, 6.8)};background:${vbHex(VBO.esc)}"></div>`;
      h += vbT(esc(s.titulo || ''), { x: 0.6, y: 0.45, w: 4.0, h: 0.85, fs: 32, bold: true, cor: VBO.branco });
      if (zoom) {
        G.rotulos.forEach((r, i) => { h += vbT(esc(pts[i].cidade), { x: r.x, y: r.y, w: r.w, h: r.h, fs: 12, bold: true, cor: VBO.branco, align: r.align, valign: 'middle', cls: 'vb-rot', an: an(300 + ord.indexOf(i) * 90) }); });
        const porUf = {}; pts.forEach(p => (porUf[p.uf] = porUf[p.uf] || []).push(p.cidade));
        h += vbT(Object.entries(porUf).map(([uf, cs]) => `<p><b style="color:#${VBO.ouro}">${esc(uf)}</b>&nbsp; ${esc(cs.join(', '))}</p>`).join(''), { x: 0.6, y: 1.6, w: 3.8, h: 4.9, fs: 14, cor: VBO.branco, cls: 'vb-par', an: an(300) });
      } else {
        if (s.texto) h += vbT(esc(s.texto), { x: 0.6, y: 1.6, w: 3.9, h: 1.5, fs: 16, cor: VBO.suave });
        h += vbT(`<b style="font-size:${(60 * VB_PT).toFixed(0)}px;color:#${VBO.ouro};line-height:1.05">${pts.length}</b>${pts.length === 1 ? 'cidade' : 'cidades'}`, { x: 0.6, y: 3.35, w: 1.9, h: 1.6, fs: 16, cor: VBO.branco, an: an(300) })
          + vbT(`<b style="font-size:${(60 * VB_PT).toFixed(0)}px;color:#${VBO.ouro};line-height:1.05">${ufs.size}</b>${ufs.size === 1 ? 'estado' : 'estados'}`, { x: 2.6, y: 3.35, w: 1.9, h: 1.6, fs: 16, cor: VBO.branco, an: an(450) });
      }
      break; }
    case 'etapas': {
      h = vbMolde('claro', s, n, A); const it = (s.itens || []).slice(0, 6); const k = Math.max(it.length, 1), g = 0.3, cw = (12.13 - g * (k - 1)) / k, yc = 2.75, d = 0.8;
      if (k > 1) h += `<div class="vb-l2" style="${vbPos(0.6 + cw / 2, yc - 0.015, (cw + g) * (k - 1), 0.03)}"></div>`;
      it.forEach((e, i) => { const x = 0.6 + i * (cw + g), cx = x + cw / 2, ult = i === k - 1, a = an(300 + i * 300, 'zoom'), b = an(450 + i * 300);
        h += vbCaixa(x, 3.55, cw, 2.75, { fill: vbHex(VBO.claro), an: b })
          + `<div class="vb-num an" data-e="zoom" style="${vbPos(cx - d / 2, yc - d / 2, d, d)};background:#${ult ? VBO.ouro : VBO.verde};color:#${ult ? VBO.esc : 'fff'};font-size:${(22 * VB_PT).toFixed(1)}px;--d:${a[0]}ms">${i + 1}</div>`
          + (e.quando ? vbT(esc(e.quando), { x, y: 1.8, w: cw, h: 0.4, fs: 14, bold: true, cor: '8A6A10', align: 'center', an: a }) : '')
          + vbT(esc(e.titulo || ''), { x: x + 0.3, y: 3.85, w: cw - 0.6, h: 0.5, fs: 19, bold: true, cor: VBO.texto, an: b })
          + vbT(esc(e.texto || ''), { x: x + 0.3, y: 4.45, w: cw - 0.6, h: 1.7, fs: 16, cor: VBO.cinza, an: b }); });
      break; }
    case 'tabela': {
      h = vbMolde('claro', s, n, A); const tb = s.tabela || {}; const cols = tb.colunas || []; const ls = (tb.linhas || []).slice(0, 8);
      if (cols.length) h += `<div class="vb-tab an" data-e="fade" style="${vbPos(0.6, 1.65, 12.13, 4.8)};--d:300ms"><table><colgroup>${cols.map((_, j) => `<col style="width:${cols.length < 2 ? 100 : j === 0 ? 36 : 64 / (cols.length - 1)}%">`).join('')}</colgroup>
        <thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${ls.map(l => `<tr>${cols.map((_, j) => `<td>${esc(String(l[j] ?? ''))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      if (s.nota) h += vbT(esc(s.nota), { x: 0.6, y: 6.45, w: 10, h: 0.3, fs: 11, cor: VBO.cinza });
      break; }
    case 'citacao':
      h = vbMolde('verde', s, n, A) + vbT('“', { x: 0.75, y: 0.35, w: 2, h: 2.2, fs: 200, bold: true, cor: VBO.ouro, an: an(200, 'zoom'), cls: 'vb-aspas' })
        + vbT(esc(s.texto || ''), { x: 1.6, y: 2.0, w: 10.2, h: 3.3, fs: 32, cor: VBO.branco, valign: 'middle', an: an(450) })
        + (s.autor ? vbT('— ' + esc(s.autor), { x: 1.6, y: 5.45, w: 8, h: 0.45, fs: 17, bold: true, cor: 'CFE6DD', an: an(800) }) : '')
        + vbChevron(10.75, 5.7, 1.85, vbHex(VBO.esc));
      break;
    case 'encerramento': {
      const ct = (s.contatos || []).filter(Boolean);
      h = vbMolde('capa', s, n, A) + vbChevron(8.0, 1.85, 4.9)
        + vbT(esc(s.titulo || 'Obrigado'), { x: 0.75, y: 2.45, w: 7.6, h: 1.95, fs: 54, bold: true, cor: VBO.branco, valign: 'bottom', an: an(300) })
        + vbT(esc(s.texto || ''), { x: 0.75, y: 4.55, w: 7.4, h: 0.95, fs: 18, cor: VBO.suave, an: an(550) })
        + (ct.length ? vbT(ct.map(c => `<p>${esc(c)}</p>`).join(''), { x: 0.75, y: 5.55, w: 7, h: 1.4, fs: 15, cor: VBO.branco, cls: 'vb-par vb-ct', an: an(800) }) : '');
      break; }
    default: h = vbMolde('claro', { titulo: 'Tipo de slide desconhecido' }, n, A);
  }
  return `<div class="vb-slide" data-tipo="${s.tipo}">${h}</div>`;
}
// gráfico em SVG (colunas, barras, linha, rosca) com a paleta Verbo
function vbGraficoSvg(gd, W, H) {
  const cats = gd.categorias || []; const ser = (gd.series || []).filter(x => (x.valores || []).length); if (!ser.length) return '';
  const cores = VBO.serie.map(c => '#' + c); const F = v => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const leg = (ser.length > 1 || gd.tipo === 'rosca') ? 34 : 0; const ft = 12 * VB_PT;
  const legenda = itens => `<g transform="translate(${W / 2},${H - 10})" text-anchor="middle">${(() => { const tot = itens.reduce((a, t) => a + t.length * 8 + 34, 0); let x = -tot / 2;
    return itens.map((t, i) => { const g = `<rect x="${x}" y="-12" width="12" height="12" rx="2" fill="${cores[i % cores.length]}"/><text x="${x + 18}" y="-2" text-anchor="start" font-size="${ft}" fill="#${VBO.cinza}">${esc(t)}</text>`; x += t.length * 8 + 34; return g; }).join(''); })()}</g>`;
  if (gd.tipo === 'rosca') {
    const vs = ser[0].valores.map(Number); const tot = vs.reduce((a, b) => a + b, 0) || 1; const cx = W / 2, cy = (H - leg) / 2, R = Math.min(cx, cy) - 10, r = R * 0.62; let ang = -Math.PI / 2;
    const arcos = vs.map((v, i) => { const a2 = ang + 2 * Math.PI * v / tot; const lg = a2 - ang > Math.PI ? 1 : 0; const p = (a, rr) => [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
      const [x1, y1] = p(ang, R), [x2, y2] = p(a2, R), [x3, y3] = p(a2, r), [x4, y4] = p(ang, r); const m = (ang + a2) / 2; const [lx, ly] = p(m, (R + r) / 2); ang = a2;
      return `<path d="M${x1},${y1}A${R},${R} 0 ${lg} 1 ${x2},${y2}L${x3},${y3}A${r},${r} 0 ${lg} 0 ${x4},${y4}Z" fill="${cores[i % cores.length]}"/>${v / tot > 0.05 ? `<text x="${lx}" y="${ly + 5}" text-anchor="middle" font-size="${ft}" font-weight="700" fill="#fff">${Math.round(v / tot * 100)}%</text>` : ''}`; }).join('');
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${arcos}${legenda(cats)}</svg>`;
  }
  const todos = ser.flatMap(s => s.valores.map(Number)); const max = Math.max(...todos, 0) * 1.15 || 1, min = Math.min(0, ...todos);
  const pl = gd.tipo === 'linha' ? 50 : 10, pr = 10, pt = 24, pb = 34 + leg; const iw = W - pl - pr, ih = H - pt - pb;
  if (gd.tipo === 'barras') {
    const bh = ih / Math.max(cats.length, 1); const gw = bh * 0.7 / ser.length; const lw = 90; const iw2 = iw - lw - 40;
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${cats.map((c, i) => `<text x="${pl + lw - 8}" y="${pt + i * bh + bh / 2 + 5}" text-anchor="end" font-size="${ft}" fill="#${VBO.cinza}">${esc(c)}</text>`
      + ser.map((s, j) => { const v = Number(s.valores[i] || 0); const w = (v - min) / (max - min) * iw2; const y = pt + i * bh + bh * 0.15 + j * gw;
        return `<rect x="${pl + lw}" y="${y}" width="${Math.max(w, 0)}" height="${gw - 2}" rx="2" fill="${cores[j]}"/><text x="${pl + lw + w + 6}" y="${y + gw / 2 + 4}" font-size="${11 * VB_PT}" fill="#${VBO.texto}">${F(v)}</text>`; }).join('')).join('')}${leg ? legenda(ser.map(s => s.nome || '')) : ''}</svg>`;
  }
  const Y = v => pt + ih - (v - min) / (max - min) * ih; const cwid = iw / Math.max(cats.length, 1);
  let g = [0, 0.25, 0.5, 0.75, 1].map(t => { const v = min + (max - min) * t; return `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="#${VBO.claro2}"/>${gd.tipo === 'linha' ? `<text x="${pl - 8}" y="${Y(v) + 4}" text-anchor="end" font-size="${11 * VB_PT}" fill="#${VBO.cinza}">${F(v)}</text>` : ''}`; }).join('');
  g += cats.map((c, i) => `<text x="${pl + cwid * i + cwid / 2}" y="${pt + ih + 22}" text-anchor="middle" font-size="${ft}" fill="#${VBO.cinza}">${esc(c)}</text>`).join('');
  if (gd.tipo === 'linha') g += ser.map((s, j) => { const pts = s.valores.map((v, i) => [pl + cwid * i + cwid / 2, Y(Number(v))]);
    return `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${cores[j]}" stroke-width="3.5" stroke-linejoin="round"/>${pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="${cores[j]}" stroke="#fff" stroke-width="2"/>`).join('')}`; }).join('');
  else { const gw = cwid * 0.72 / ser.length; g += cats.map((c, i) => ser.map((s, j) => { const v = Number(s.valores[i] || 0); const x = pl + cwid * i + cwid * 0.14 + j * gw;
    return `<rect x="${x + 1}" y="${Y(Math.max(v, 0))}" width="${gw - 2}" height="${Math.abs(Y(v) - Y(0))}" fill="${cores[j]}"/><text x="${x + gw / 2}" y="${Y(Math.max(v, 0)) - 6}" text-anchor="middle" font-size="${11 * VB_PT}" fill="#${VBO.texto}">${F(v)}</text>`; }).join('')).join(''); }
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${g}${leg ? legenda(ser.map(s => s.nome || '')) : ''}</svg>`;
}

// ---------- apresentar em tela cheia (transição "Transformar" por FLIP + entradas animadas) ----------
async function vboApresentar(deck, inicio = 0) {
  const A = await vboAssetsNav(); const planos = vboPlanos(deck);
  if (!planos.length) return aviso('A apresentação não tem slides.', true);
  const ov = document.createElement('div'); ov.className = 'vb-show';
  ov.innerHTML = '<div class="vb-palco"></div><div class="vb-hud"><button type="button" data-ant title="Anterior (←)">‹</button><span data-n></span><button type="button" data-prox title="Próximo (→)">›</button><button type="button" data-sair title="Sair (Esc)">✕</button></div><div class="vb-barra"><i></i></div>';
  document.body.appendChild(ov);
  const palco = ov.querySelector('.vb-palco'); let k = 1;
  const escala = () => { k = Math.min(innerWidth / 1333.33, innerHeight / 750); palco.style.transform = `translate(-50%,-50%) scale(${k})`; };
  escala();
  let i = -1, atual = null;
  const ir = n => {
    if (n < 0 || n >= planos.length || n === i) return;
    const tmp = document.createElement('div'); tmp.innerHTML = vboSlideHtml(planos[n], n + 1, A); const novo = tmp.firstElementChild;
    novo.classList.add('tocando'); palco.appendChild(novo);
    if (atual) {
      const velho = atual; const mv = new Map([...velho.querySelectorAll('[data-m]')].map(e => [e.dataset.m, e]));
      novo.querySelectorAll('[data-m]').forEach(e => { const o = mv.get(e.dataset.m); if (!o) return;
        const a = o.getBoundingClientRect(), b = e.getBoundingClientRect(); if (!b.width || !b.height) return;
        e.classList.remove('an'); e.classList.add('vb-morph'); e.style.transformOrigin = '0 0';
        e.style.transform = `translate(${(a.left - b.left) / k}px,${(a.top - b.top) / k}px) scale(${a.width / b.width},${a.height / b.height})`;
        o.style.visibility = 'hidden'; });
      novo.classList.add('entrando'); velho.classList.add('saindo');
      novo.getBoundingClientRect();
      requestAnimationFrame(() => novo.querySelectorAll('.vb-morph').forEach(e => { e.style.transition = 'transform 1.1s cubic-bezier(.65,0,.35,1)'; e.style.transform = ''; }));
      setTimeout(() => velho.remove(), 1200);
    }
    atual = novo; i = n;
    ov.querySelector('[data-n]').textContent = `${n + 1} / ${planos.length}`;
    ov.querySelector('.vb-barra i').style.width = ((n + 1) / planos.length * 100) + '%';
  };
  const sair = () => { document.removeEventListener('keydown', tecla); removeEventListener('resize', escala); document.removeEventListener('fullscreenchange', fs); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); ov.remove(); };
  const tecla = e => { if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); ir(i + 1); }
    else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); ir(i - 1); }
    else if (e.key === 'Home') ir(0); else if (e.key === 'End') ir(planos.length - 1); else if (e.key === 'Escape') sair(); };
  const fs = () => { if (!document.fullscreenElement) sair(); };
  document.addEventListener('keydown', tecla); addEventListener('resize', escala);
  palco.addEventListener('click', () => ir(i + 1));
  ov.querySelector('[data-ant]').onclick = () => ir(i - 1); ov.querySelector('[data-prox]').onclick = () => ir(i + 1); ov.querySelector('[data-sair]').onclick = sair;
  let t; ov.addEventListener('mousemove', () => { ov.classList.add('hud-on'); clearTimeout(t); t = setTimeout(() => ov.classList.remove('hud-on'), 1800); });
  try { await ov.requestFullscreen(); document.addEventListener('fullscreenchange', fs); } catch {}
  ir(Math.min(Math.max(inicio, 0), planos.length - 1));
}

// ---------- PDF (impressão do navegador: um slide por página) ----------
async function vboPdf(deck) {
  const A = await vboAssetsNav(); const planos = vboPlanos(deck);
  document.getElementById('vb-print')?.remove(); document.getElementById('vb-print-css')?.remove();
  const d = document.createElement('div'); d.id = 'vb-print';
  d.innerHTML = planos.map((s, i) => `<div class="vb-pg">${vboSlideHtml(s, i + 1, A)}</div>`).join('');
  document.body.appendChild(d);
  document.head.insertAdjacentHTML('beforeend', `<style id="vb-print-css">@media screen { #vb-print { position: fixed; left: -100000px; top: 0; } }
    @media print { @page { size: 13.333in 7.5in; margin: 0; } html, body { background: #fff !important; } body > *:not(#vb-print) { display: none !important; }
      #vb-print .vb-pg { width: 13.333in; height: 7.5in; position: relative; overflow: hidden; break-after: page; page-break-after: always; }
      #vb-print .vb-slide { transform: scale(.96); transform-origin: 0 0; } #vb-print * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }</style>`);
  await Promise.all([...d.querySelectorAll('img')].map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })));
  const limpar = () => { d.remove(); document.getElementById('vb-print-css')?.remove(); removeEventListener('afterprint', limpar); };
  addEventListener('afterprint', limpar);
  setTimeout(() => window.print(), 150);
}

// ---------- .pptx (mesmo gerador do modelo PowerPoint) ----------
async function vboBaixarPptx(deck, nome, guia = false) {
  aviso('Gerando o PowerPoint…');
  try {
    if (!window.JSZip) await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
    if (!window.PptxGenJS) await carregarScript('https://cdn.jsdelivr.net/npm/pptxgenjs@4.0.1/dist/pptxgen.bundle.js');
    const A = await vboAssetsNav(); const sem = u => String(u).replace(/^data:/, '');
    const nomes = new Set(['estrela']); (deck.slides || []).forEach(s => s.tipo === 'cards' && (s.itens || []).forEach(c => nomes.add(c.icone || 'estrela')));
    const icones = {}; for (const n of nomes) icones[n] = sem(await vboIconePng(n));
    const d2 = { ...deck, slides: (deck.slides || []).map(s => s.tipo === 'conteudo' && String(s.imagem || '').startsWith('data:') ? { ...s, imagem: sem(s.imagem) } : s) };
    const blob = await vboGerarPptx(d2, { PptxGenJS: window.PptxGenJS, JSZip: window.JSZip, geo: A.geo, guia, saida: 'blob',
      assets: { logoClaro: sem(A.logoClaro), logoEscuro: sem(A.logoEscuro), fundoCapa: sem(A.fundo), foto: sem(A.foto), icone: n => icones[n] || icones.estrela } });
    baixarArquivo(blob, (nome || 'Apresentação Verbo').replace(/[\\/:*?"<>|]+/g, '-') + '.pptx');
    aviso('PowerPoint gerado.');
  } catch (err) { falha(err); }
}

// ---------- coordenadas das cidades (cadastro geo_cidades + busca no OpenStreetMap) ----------
let _vbGeoCid = null;
const vbNorm = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
async function vbResolverCidades(linhas) { // ["Cidade - UF"] → pontos
  if (!_vbGeoCid) _vbGeoCid = await api.listar('geo_cidades', 'select=cidade,uf,lat,lng').catch(() => []);
  const out = [];
  for (const l of linhas) {
    const m = l.match(/^(.+?)\s*[-–/,]\s*([A-Za-z]{2})\s*$/); if (!m) { out.push({ cidade: l.trim(), uf: '', lat: '', lng: '', erro: 'use "Cidade - UF"' }); continue; }
    const cidade = m[1].trim(), uf = m[2].toUpperCase();
    let g = _vbGeoCid.find(c => vbNorm(c.cidade) === vbNorm(cidade) && c.uf === uf);
    if (!g) { try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&city=${encodeURIComponent(cidade)}&state=${encodeURIComponent(uf)}`, { headers: { 'Accept-Language': 'pt-BR' } }).then(x => x.json());
        if (r?.[0]) { g = { cidade, uf, lat: Number(r[0].lat), lng: Number(r[0].lon) }; _vbGeoCid.push(g); api.rpc('salvar_geo_cidade', { p_cidade: cidade, p_uf: uf, p_lat: g.lat, p_lng: g.lng }).catch(() => {}); }
        await new Promise(ok => setTimeout(ok, 1000));
      } catch {} }
    out.push(g ? { cidade, uf, lat: Number(g.lat), lng: Number(g.lng) } : { cidade, uf, lat: '', lng: '', erro: 'cidade não encontrada' });
  }
  return out;
}

// ---------- telas ----------
const VB_ICONE_TXT = { seguranca: 'Segurança', pessoas: 'Pessoas', resultados: 'Resultados', sustentabilidade: 'Sustentabilidade', caminhao: 'Caminhão', alvo: 'Meta', check: 'Concluído', relogio: 'Prazo',
  local: 'Local', engrenagem: 'Processo', ideia: 'Ideia', bandeira: 'Marco', grafico: 'Gráfico', parceria: 'Parceria', manutencao: 'Manutenção', combustivel: 'Combustível', capacete: 'EPI',
  premio: 'Prêmio', calendario: 'Calendário', dinheiro: 'Dinheiro', pacote: 'Carga', rota: 'Rota', alerta: 'Alerta', documento: 'Documento', escudo: 'Proteção', arvore: 'Floresta', fabrica: 'Fábrica', estrela: 'Destaque' };
const vbClone = o => JSON.parse(JSON.stringify(o));
const vbExemplo = tipo => vbClone(VBO_MODELO.slides.find(s => s.tipo === tipo) || { tipo });
const vbPodeEditar = a => a.criado_por === estado.usuario.id || tem('administrador', 'diretoria');
function vbMini(s, n, A, larg = 200) { return `<div class="vb-mini" style="width:${larg}px;height:${larg * 0.5625}px"><div style="transform:scale(${larg / 1333.33})">${vboSlideHtml(s, n, A)}</div></div>`; }

rota('/apresentacoes', async tela => {
  tela.innerHTML = '<div class="carregando">Carregando…</div>';
  const [A, lista] = await Promise.all([vboAssetsNav(), api.listar('apresentacoes', 'ativo=eq.true&order=atualizado_em.desc.nullslast,criado_em.desc&select=id,numero,titulo,criado_por,criado_em,atualizado_em,capa:deck->slides->0,u:usuarios!apresentacoes_criado_por_fkey(nome)').catch(err => { falha(err); return []; })]);
  tela.innerHTML = `<div class="topo"><div><h1>Apresentações</h1><p class="muted">Monte apresentações no padrão Verbo: transições, mapa animado, PDF e PowerPoint.</p></div>
      <div class="acoes"><button class="btn" id="vb-modelo">${ico('arquivo')} Baixar modelo PowerPoint</button><button class="btn prim" id="vb-nova">${ico('mais')} Nova apresentação</button></div></div>
    ${lista.length ? `<div class="vb-grade">${lista.map((a, i) => `<div class="cartao vb-card">
        <a href="#/apresentacoes/${a.id}" class="vb-card-img">${a.capa ? vbMini(a.capa, 1, A, 320) : '<div class="vb-mini vazio"></div>'}</a>
        <div class="vb-card-txt"><b>${esc(a.titulo)}</b><span class="muted">${esc(a.numero || '')} · ${esc(a.u?.nome || '')} · ${dataBR((a.atualizado_em || a.criado_em || '').slice(0, 10))}</span></div>
        <div class="vb-card-ac"><a class="btn peq" href="#/apresentacoes/${a.id}">${vbPodeEditar(a) ? 'Editar' : 'Abrir'}</a><button class="btn peq prim" data-ap="${i}">▶ Apresentar</button>
          <button class="btn peq" data-dup="${i}" title="Duplicar">${ico('copiar')}</button>${vbPodeEditar(a) ? `<button class="btn peq" data-arq="${i}" title="Arquivar">${ico('arquivo')}</button>` : ''}</div></div>`).join('')}</div>`
      : `<div class="cartao vazio">Nenhuma apresentação ainda. Clique em <b>Nova apresentação</b> para começar a partir do modelo Verbo.</div>`}`;
  const ajustar = () => $$('.vb-card-img .vb-mini', tela).forEach(m => { const w = m.clientWidth; m.style.height = (w * 0.5625) + 'px'; m.firstElementChild.style.transform = `scale(${w / 1333.33})`; });
  ajustar(); new ResizeObserver(ajustar).observe(tela.querySelector('.vb-grade') || tela);
  $('#vb-modelo', tela).onclick = () => vboBaixarPptx(VBO_MODELO, 'Modelo padrão Verbo', true);
  $('#vb-nova', tela).onclick = async () => {
    const r = await modal(`<form><h2>Nova apresentação</h2><div class="form">
      <label class="campo largo">Título *<input name="titulo" required placeholder="Ex.: Resultados do 3º trimestre"></label>
      <div class="campo largo"><span>Começar com</span>
        <label class="check"><input type="radio" name="base" value="basico" checked> Básico: capa, agenda, texto e imagem, encerramento</label>
        <label class="check"><input type="radio" name="base" value="modelo"> Modelo completo: um exemplo de cada tipo de slide</label></div></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Criar</button></div></form>`);
    if (!r) return;
    const slides = r.base === 'modelo' ? vbClone(VBO_MODELO.slides) : ['capa', 'agenda', 'conteudo', 'encerramento'].map(vbExemplo);
    slides[0].titulo = r.titulo.trim();
    try { const [n] = await api.inserir('apresentacoes', { titulo: r.titulo.trim(), deck: { titulo: r.titulo.trim(), slides } }); location.hash = '#/apresentacoes/' + n.id; } catch (err) { falha(err); }
  };
  const completo = async a => (await api.um('apresentacoes', `id=eq.${a.id}&select=id,titulo,deck`)) || null;
  $$('[data-ap]', tela).forEach(b => (b.onclick = async () => { const a = await completo(lista[b.dataset.ap]); if (a) vboApresentar(a.deck); }));
  $$('[data-dup]', tela).forEach(b => (b.onclick = async () => { const a = await completo(lista[b.dataset.dup]); if (!a) return;
    try { const [n] = await api.inserir('apresentacoes', { titulo: a.titulo + ' (cópia)', deck: { ...a.deck, titulo: a.titulo + ' (cópia)' } }); location.hash = '#/apresentacoes/' + n.id; } catch (err) { falha(err); } }));
  $$('[data-arq]', tela).forEach(b => (b.onclick = async () => { const a = lista[b.dataset.arq];
    if (!(await confirmar(`Arquivar "${a.titulo}"? Ela sai da lista (não é apagada).`, { botao: 'Arquivar' }))) return;
    try { await api.alterar('apresentacoes', `id=eq.${a.id}`, { ativo: false }); aviso('Apresentação arquivada.'); navegar(); } catch (err) { falha(err); } }));
});

rota('/apresentacoes/:id', async (tela, id) => {
  tela.innerHTML = '<div class="carregando">Carregando…</div>';
  const [A, ap] = await Promise.all([vboAssetsNav(), api.um('apresentacoes', `id=eq.${id}&select=*`).catch(() => null)]);
  if (!ap) { tela.innerHTML = '<div class="cartao vazio">Apresentação não encontrada ou sem acesso.</div>'; return; }
  const pode = vbPodeEditar(ap); const deck = ap.deck && Array.isArray(ap.deck.slides) ? ap.deck : { slides: [] }; let sel = 0;
  tela.innerHTML = `<div class="vb-ed">
    <div class="vb-ed-topo"><a class="btn peq" href="#/apresentacoes" title="Voltar">‹</a>
      <input class="vb-ed-tit" value="${esc(ap.titulo)}" ${pode ? '' : 'disabled'} aria-label="Título da apresentação"><span class="muted vb-ed-st" data-st>${pode ? '' : 'Somente leitura: duplique para editar'}</span>
      <div class="acoes"><button class="btn peq" data-pdf>${ico('documento')} PDF</button><button class="btn peq" data-pptx>${ico('arquivo')} PowerPoint</button><button class="btn prim" data-show>▶ Apresentar</button></div></div>
    <div class="vb-ed-corpo"><aside class="vb-ed-lista" data-lista></aside>
      <section class="vb-ed-centro"><div class="vb-ed-palco" data-palco></div>
        ${pode ? `<div class="vb-ed-ac"><button class="btn peq" data-mv="-1" title="Mover para cima">↑</button><button class="btn peq" data-mv="1" title="Mover para baixo">↓</button>
          <button class="btn peq" data-dupsl>${ico('copiar')} Duplicar slide</button><button class="btn peq perigo" data-delsl>Excluir slide</button><span class="muted" data-dica></span></div>` : ''}</section>
      <aside class="vb-ed-form" data-form></aside></div></div>`;
  const $l = $('[data-lista]', tela), $p = $('[data-palco]', tela), $f = $('[data-form]', tela), $st = $('[data-st]', tela);
  // salvar automático
  let tSalvar;
  const salvar = () => { if (!pode) return; $st.textContent = 'Salvando…'; clearTimeout(tSalvar);
    tSalvar = setTimeout(async () => { const titulo = $('.vb-ed-tit', tela).value.trim() || 'Sem título'; deck.titulo = titulo;
      try { await api.alterar('apresentacoes', `id=eq.${id}`, { titulo, deck }); $st.textContent = 'Salvo às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
      catch (err) { $st.textContent = 'Não salvou'; falha(err); } }, 900); };
  $('.vb-ed-tit', tela).oninput = salvar;
  const numero = i => { let n = 0; for (let k = 0; k <= i; k++) n += deck.slides[k].tipo === 'mapa' && deck.slides[k].zoom && (deck.slides[k].pontos || []).length ? 2 : 1; return n - (deck.slides[i].tipo === 'mapa' && deck.slides[i].zoom && (deck.slides[i].pontos || []).length ? 1 : 0); };
  const desenharPalco = () => { const s = deck.slides[sel]; if (!s) { $p.innerHTML = '<div class="vazio">Sem slides.</div>'; return; }
    const w = $p.clientWidth || 800; const zoom = s.tipo === 'mapa' && s.zoom && (s.pontos || []).length;
    $p.innerHTML = `<div class="vb-prev" style="height:${w * 0.5625}px"><div style="transform:scale(${w / 1333.33})">${vboSlideHtml({ ...s, _vista: 'brasil' }, numero(sel), A)}</div></div>`
      + (zoom ? `<p class="muted" style="margin:10px 0 6px">2º slide gerado automaticamente (zoom nas cidades):</p><div class="vb-prev" style="height:${w * 0.5625 * 0.5}px;width:50%"><div style="transform:scale(${w * 0.5 / 1333.33})">${vboSlideHtml({ ...s, _vista: 'zoom' }, numero(sel) + 1, A)}</div></div>` : ''); };
  const desenharLista = () => {
    $l.innerHTML = deck.slides.map((s, i) => `<button type="button" class="vb-th${i === sel ? ' sel' : ''}" data-i="${i}"><span class="vb-th-n">${i + 1}</span>${vbMini({ ...s, _vista: 'brasil' }, numero(i), A, 170)}<span class="vb-th-t">${esc(VBO_TIPOS[s.tipo]?.nome || s.tipo)}</span></button>`).join('')
      + (pode ? `<button type="button" class="btn peq vb-th-mais" data-novo>${ico('mais')} Slide</button>` : '');
    $$('[data-i]', $l).forEach(b => (b.onclick = () => { sel = Number(b.dataset.i); tudo(); }));
    $('[data-novo]', $l)?.addEventListener('click', novoSlide);
    $('.vb-th.sel', $l)?.scrollIntoView({ block: 'nearest' }); };
  const atualizarMini = () => { const b = $(`.vb-th[data-i="${sel}"]`, $l); if (b) b.querySelector('.vb-mini').outerHTML = vbMini({ ...deck.slides[sel], _vista: 'brasil' }, numero(sel), A, 170); };
  let tPrev; const mudou = () => { clearTimeout(tPrev); tPrev = setTimeout(() => { desenharPalco(); atualizarMini(); }, 200); salvar(); };
  const tudo = () => { desenharLista(); desenharPalco(); desenharForm(); };

  // formulário do slide selecionado
  function desenharForm() {
    const s = deck.slides[sel]; if (!s) { $f.innerHTML = ''; return; } const T = VBO_TIPOS[s.tipo] || { campos: [] }; const dis = pode ? '' : 'disabled';
    const linhaCard = (c, i) => `<div class="vb-rep" data-r="${i}"><div class="vb-rep-l"><label class="vb-icsel"><span class="vb-icprev">${vboSvgIcone(c.icone || 'estrela', '#02654D')}</span>
        <select data-k="icone" ${dis}>${Object.keys(VBO_ICONES).map(k => `<option value="${k}" ${k === (c.icone || 'estrela') ? 'selected' : ''}>${VB_ICONE_TXT[k] || k}</option>`).join('')}</select></label>
        <input data-k="titulo" value="${esc(c.titulo || '')}" placeholder="Título" ${dis}>${pode ? '<button type="button" class="btn peq" data-tira title="Tirar">✕</button>' : ''}</div>
      <textarea data-k="texto" rows="2" placeholder="Texto curto" ${dis}>${esc(c.texto || '')}</textarea></div>`;
    const linhaNum = (c, i) => `<div class="vb-rep" data-r="${i}"><div class="vb-rep-l"><input data-k="valor" value="${esc(c.valor || '')}" placeholder="Valor" style="max-width:110px" ${dis}><input data-k="rotulo" value="${esc(c.rotulo || '')}" placeholder="O que é" ${dis}>${pode ? '<button type="button" class="btn peq" data-tira title="Tirar">✕</button>' : ''}</div></div>`;
    const linhaEt = (c, i) => `<div class="vb-rep" data-r="${i}"><div class="vb-rep-l"><input data-k="quando" value="${esc(c.quando || '')}" placeholder="Quando" style="max-width:120px" ${dis}><input data-k="titulo" value="${esc(c.titulo || '')}" placeholder="Etapa" ${dis}>${pode ? '<button type="button" class="btn peq" data-tira title="Tirar">✕</button>' : ''}</div>
      <textarea data-k="texto" rows="2" placeholder="Descrição" ${dis}>${esc(c.texto || '')}</textarea></div>`;
    const rep = (k, linhas, fn, max) => `<div class="vb-reps" data-rep="${k}">${(s[k] || []).map(fn).join('')}${pode && (s[k] || []).length < max ? `<button type="button" class="btn peq" data-add="${k}">${ico('mais')} Adicionar</button>` : ''}</div>`;
    const campo = ([k, rot, tipo]) => {
      if (tipo === 'texto') return `<label class="campo">${rot}<textarea data-c="${k}" rows="${k === 'texto' && s.tipo === 'conteudo' ? 7 : 3}" ${dis}>${esc(s[k] || '')}</textarea></label>`;
      if (tipo === 'linhas') return `<label class="campo">${rot}<textarea data-c="${k}" data-linhas rows="5" ${dis}>${esc((s[k] || []).join('\n'))}</textarea></label>`;
      if (tipo === 'sim') return `<label class="check"><input type="checkbox" data-c="${k}" data-sim ${s[k] ? 'checked' : ''} ${dis}> ${rot}</label>`;
      if (tipo === 'imagem') { const pr = String(s.imagem || '').startsWith('data:');
        return `<div class="campo"><span>${rot}</span><select data-img ${dis}><option value="foto" ${s.imagem === 'foto' ? 'selected' : ''}>Foto padrão Verbo</option><option value="" ${!s.imagem ? 'selected' : ''}>Sem imagem (texto ocupa a largura)</option>${pr ? '<option value="propria" selected>Imagem enviada</option>' : ''}</select>
          ${pode ? '<label class="btn peq" style="margin-top:6px">Enviar imagem…<input type="file" accept="image/*" data-arqimg hidden></label>' : ''}</div>`; }
      if (tipo === 'cards') return `<div class="campo"><span>${rot}</span>${rep('itens', s.itens, linhaCard, 4)}</div>`;
      if (tipo === 'numeros') return `<div class="campo"><span>${rot}</span>${rep('itens', s.itens, linhaNum, 4)}</div>`;
      if (tipo === 'etapas') return `<div class="campo"><span>${rot}</span>${rep('itens', s.itens, linhaEt, 6)}</div>`;
      if (tipo === 'grafico') { const g = s.grafico || {};
        return `<label class="campo">Tipo de gráfico<select data-g="tipo" ${dis}>${[['colunas', 'Colunas'], ['barras', 'Barras'], ['linha', 'Linha'], ['rosca', 'Rosca']].map(([v, t]) => `<option value="${v}" ${v === (g.tipo || 'colunas') ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
          <label class="campo">Categorias (separe com ;)<input data-g="categorias" value="${esc((g.categorias || []).join('; '))}" ${dis}></label>
          <label class="campo">Séries (uma por linha: Nome: 10; 20; 30)<textarea data-g="series" rows="4" ${dis}>${esc((g.series || []).map(x => `${x.nome}: ${(x.valores || []).join('; ')}`).join('\n'))}</textarea></label>`; }
      if (tipo === 'tabela') { const t = s.tabela || {};
        return `<label class="campo">${rot}: 1ª linha = cabeçalho; separe as colunas com ; (ou cole do Excel)<textarea data-tab rows="7" ${dis}>${esc([t.colunas || [], ...(t.linhas || [])].map(l => l.join('; ')).join('\n'))}</textarea></label>`; }
      if (tipo === 'pontos') return `<label class="campo">${rot}: uma por linha, no formato Cidade - UF<textarea data-pontos rows="7" ${dis}>${esc((s.pontos || []).map(p => `${p.cidade} - ${p.uf}`).join('\n'))}</textarea></label>
          <div class="vb-pt-st muted" data-ptst>${(s.pontos || []).filter(p => p.erro).map(p => `⚠ ${esc(p.cidade)}: ${esc(p.erro)}`).join('<br>')}</div>
          ${pode ? '<button type="button" class="btn peq" data-ptforn>Usar cidades de contratos e compras</button>' : ''}`;
      return `<label class="campo">${rot}<input data-c="${k}" value="${esc(s[k] || '')}" ${dis}></label>`;
    };
    $f.innerHTML = `<div class="vb-form-tipo">${esc(T.nome || s.tipo)}</div><div class="form vb-form">${T.campos.map(campo).join('')}
      <label class="campo">Anotações do apresentador<textarea data-c="notas" rows="3" placeholder="Aparecem nas anotações do PowerPoint" ${dis}>${esc(s.notas || '')}</textarea></label></div>`;
    if (!pode) return;
    // campos simples
    $$('[data-c]', $f).forEach(el => el.addEventListener('input', () => { const k = el.dataset.c;
      s[k] = el.dataset.sim !== undefined ? el.checked : el.dataset.linhas !== undefined ? el.value.split('\n').map(x => x.trim()).filter(Boolean) : el.value;
      if (el.dataset.sim !== undefined) desenharPalco(); mudou(); }));
    // repetidores
    $$('[data-rep]', $f).forEach(box => { const k = box.dataset.rep;
      box.addEventListener('input', e => { const r = e.target.closest('[data-r]'); if (!r || !e.target.dataset.k) return; s[k][Number(r.dataset.r)][e.target.dataset.k] = e.target.value;
        if (e.target.dataset.k === 'icone') r.querySelector('.vb-icprev').innerHTML = vboSvgIcone(e.target.value, '#02654D'); mudou(); });
      box.addEventListener('change', e => { if (e.target.dataset.k === 'icone') e.target.dispatchEvent(new Event('input', { bubbles: true })); });
      box.addEventListener('click', e => { const t = e.target.closest('[data-tira]'); if (t) { s[k].splice(Number(t.closest('[data-r]').dataset.r), 1); desenharForm(); mudou(); }
        if (e.target.closest('[data-add]')) { const ex = vbExemplo(s.tipo).itens?.[0] || {}; (s[k] = s[k] || []).push(vbClone(ex)); desenharForm(); mudou(); } }); });
    // gráfico
    $$('[data-g]', $f).forEach(el => el.addEventListener('input', () => { const g = s.grafico = s.grafico || {}; const k = el.dataset.g;
      if (k === 'tipo') g.tipo = el.value;
      if (k === 'categorias') g.categorias = el.value.split(';').map(x => x.trim()).filter(Boolean);
      if (k === 'series') g.series = el.value.split('\n').filter(l => l.trim()).map(l => { const [n, v = ''] = l.includes(':') ? [l.slice(0, l.indexOf(':')), l.slice(l.indexOf(':') + 1)] : ['', l];
        return { nome: n.trim(), valores: v.split(';').map(x => Number(String(x).trim().replace(/\./g, '').replace(',', '.'))).filter(x => isFinite(x)) }; });
      mudou(); }));
    // tabela
    $('[data-tab]', $f)?.addEventListener('input', e => { const ls = e.target.value.split('\n').filter(l => l.trim()).map(l => l.split(l.includes('\t') ? '\t' : ';').map(x => x.trim()));
      s.tabela = { colunas: ls[0] || [], linhas: ls.slice(1) }; mudou(); });
    // imagem
    $('[data-img]', $f)?.addEventListener('change', e => { if (e.target.value !== 'propria') { s.imagem = e.target.value; desenharForm(); mudou(); } });
    $('[data-arqimg]', $f)?.addEventListener('change', async e => { const f = e.target.files[0]; if (!f) return;
      try { const im = await vbImg(URL.createObjectURL(f)); const k = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight)); const [c, x] = vbCanvas(Math.round(im.naturalWidth * k), Math.round(im.naturalHeight * k));
        x.drawImage(im, 0, 0, c.width, c.height); s.imagem = c.toDataURL('image/jpeg', 0.82); desenharForm(); mudou(); } catch { aviso('Não foi possível ler a imagem.', true); } });
    // mapa
    let tPt; $('[data-pontos]', $f)?.addEventListener('input', e => { clearTimeout(tPt); const v = e.target.value;
      tPt = setTimeout(async () => { $('[data-ptst]', $f).textContent = 'Localizando as cidades…';
        s.pontos = await vbResolverCidades(v.split('\n').map(x => x.trim()).filter(Boolean));
        const st = $('[data-ptst]', $f); if (st) st.innerHTML = s.pontos.filter(p => p.erro).map(p => `⚠ ${esc(p.cidade)}: ${esc(p.erro)}`).join('<br>') || `${s.pontos.length} cidade(s) no mapa.`;
        desenharPalco(); atualizarMini(); salvar(); }, 900); });
    $('[data-ptforn]', $f)?.addEventListener('click', async () => {
      const d = await api.rpc('mapa_fornecedores').catch(err => { falha(err); return null; }); if (!d) return;
      const vist = new Set(); s.pontos = (d.fornecedores || []).filter(f => f.lat && f.lng && f.cidade).filter(f => { const k = vbNorm(f.cidade) + f.uf; if (vist.has(k)) return false; vist.add(k); return true; })
        .map(f => ({ cidade: f.cidade, uf: f.uf, lat: Number(f.lat), lng: Number(f.lng) }));
      desenharForm(); desenharPalco(); atualizarMini(); salvar(); });
  }
  // novo slide, mover, duplicar, excluir
  async function novoSlide() {
    const r = await modal(`<form><h2>Novo slide</h2><div class="vb-tipos">${Object.entries(VBO_TIPOS).map(([k, t]) => `<label class="vb-tipo"><input type="radio" name="tipo" value="${k}" ${k === 'conteudo' ? 'checked' : ''}>${vbMini({ ...vbExemplo(k), _vista: 'brasil' }, '', A, 190)}<span>${esc(t.nome)}</span></label>`).join('')}</div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Incluir</button></div></form>`, { aoAbrir: f => $('.modal', f).classList.add('modal-largo') });
    if (!r) return; const s = vbExemplo(r.tipo); delete s.notas;
    deck.slides.splice(sel + 1, 0, s); sel++; tudo(); salvar();
  }
  if (pode) {
    $$('[data-mv]', tela).forEach(b => (b.onclick = () => { const j = sel + Number(b.dataset.mv); if (j < 0 || j >= deck.slides.length) return;
      [deck.slides[sel], deck.slides[j]] = [deck.slides[j], deck.slides[sel]]; sel = j; tudo(); salvar(); }));
    $('[data-dupsl]', tela).onclick = () => { deck.slides.splice(sel + 1, 0, vbClone(deck.slides[sel])); sel++; tudo(); salvar(); };
    $('[data-delsl]', tela).onclick = async () => { if (deck.slides.length < 2) return aviso('A apresentação precisa de pelo menos um slide.', true);
      if (!(await confirmar('Excluir este slide?', { botao: 'Excluir' }))) return; deck.slides.splice(sel, 1); sel = Math.max(0, sel - 1); tudo(); salvar(); };
  }
  $('[data-show]', tela).onclick = () => { let n = 0; for (let k = 0; k < sel; k++) n += deck.slides[k].tipo === 'mapa' && deck.slides[k].zoom && (deck.slides[k].pontos || []).length ? 2 : 1; vboApresentar(deck, n); };
  $('[data-pdf]', tela).onclick = () => vboPdf(deck);
  $('[data-pptx]', tela).onclick = () => vboBaixarPptx(deck, $('.vb-ed-tit', tela).value.trim() || ap.titulo);
  const ro = new ResizeObserver(() => desenharPalco()); ro.observe($p);
  tudo();
});
