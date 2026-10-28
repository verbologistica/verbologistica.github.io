// Verbo Gestão — Crachá do colaborador (RH)
// Padrão CR80 (54 × 85,6 mm, vertical), frente e verso na identidade da Verbo.
// Desenho em canvas a 600 dpi; PNG (frente/verso) e PDF para a gráfica (sangria de 3 mm + marcas de corte) ou no tamanho final.
'use strict';

const CR_W = 54, CR_H = 85.6, CR_SANGRIA = 3, CR_DPI = 600;
const CR_COR = { verde: '#02654D', verde2: '#014A39', escuro: '#0C1D18', ouro: '#DDA936', ouroClaro: '#FBF1DA', texto: '#0E1E2B', cinza: '#5A6A77' };
const CR_TIT = '"Archivo", "Inter Display", "Inter", system-ui, sans-serif';
const CR_TXT = '"Inter", system-ui, sans-serif';
const CR_PARTICULAS = ['da', 'de', 'do', 'das', 'dos', 'e', 'di', 'du'];

let _crAtivos = null;
async function crAtivos() {
  if (_crAtivos) return _crAtivos;
  const img = src => new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => erro(new Error('Não carregou ' + src)); i.src = src; });
  const [logo, marca] = await Promise.all([img('cracha-logo.png?v=1'), img('cracha-marca.png?v=1')]);
  try { await Promise.all(['800 40px Archivo', '700 40px Archivo', '700 20px Inter', '600 20px Inter', '500 20px Inter', '400 20px Inter'].map(f => document.fonts.load(f))); } catch { /* usa a fonte do sistema */ }
  return (_crAtivos = { logo, marca });
}

// "Ana Maria Rodrigues Santos" → "Ana Santos" (primeiro e último nome, sem partículas); o RH pode trocar
function nomeCrachaPadrao(c) {
  const base = String(c?.nome_social || c?.nome || '').trim().replace(/\s+/g, ' ');
  const ps = base.split(' ').filter(Boolean);
  if (ps.length <= 2) return base;
  const ult = [...ps].reverse().find(p => !CR_PARTICULAS.includes(p.toLowerCase())) || ps[ps.length - 1];
  return ps[0] + ' ' + ult;
}
const crCPFParcial = cpf => { const d = String(cpf || '').replace(/\D/g, ''); return d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : ''; };

// quebra o texto em linhas que caibam em "larg" (mm), com a fonte já definida no ctx
function crLinhas(ctx, texto, larg) {
  const pal = String(texto || '').split(/\s+/).filter(Boolean), ls = [];
  let atual = '';
  for (const p of pal) { const t = atual ? atual + ' ' + p : p; if (ctx.measureText(t).width <= larg || !atual) atual = t; else { ls.push(atual); atual = p; } }
  if (atual) ls.push(atual);
  return ls;
}
// maior tamanho (mm) entre max e min em que o texto cabe em até "maxL" linhas
function crAjustar(ctx, texto, { fonte, peso, max, min, larg, maxL, esp = 0, caixa = false }) {
  const t = caixa ? String(texto || '').toUpperCase() : String(texto || '');
  for (let s = max; s >= min - 1e-6; s -= 0.05) {
    ctx.font = `${peso} ${s}px ${fonte}`; ctx.letterSpacing = esp ? `${esp * s}px` : '0px';
    const ls = crLinhas(ctx, t, larg);
    if (ls.length <= maxL && ls.every(l => ctx.measureText(l).width <= larg)) return { s, ls };
  }
  // não coube nem no mínimo: reduz até caber (nunca corta)
  let s = min; ctx.font = `${peso} ${s}px ${fonte}`; ctx.letterSpacing = esp ? `${esp * s}px` : '0px';
  let ls = crLinhas(ctx, t, larg);
  while (s > 1.2 && (ls.length > maxL || ls.some(l => ctx.measureText(l).width > larg))) {
    s -= 0.05; ctx.font = `${peso} ${s}px ${fonte}`; ctx.letterSpacing = esp ? `${esp * s}px` : '0px'; ls = crLinhas(ctx, t, larg);
  }
  return { s, ls };
}
function crRet(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

// d = { nome, nomeCompleto, cargo, setor, matricula, admissao, cpf, foto (ImageBitmap|Image), ajuste {z,x,y}, empresa, emergencia, mostrarCPF }
// k = px por mm · b = sangria (mm)
function crDesenhar(ctx, lado, d, A, k, b = 0) {
  const W = CR_W, H = CR_H;
  ctx.save(); ctx.setTransform(k, 0, 0, k, b * k, b * k);
  ctx.textBaseline = 'alphabetic'; ctx.imageSmoothingQuality = 'high';
  if (lado === 'frente') crFrente(ctx, d, A, W, H, b); else crVerso(ctx, d, A, W, H, b);
  ctx.restore();
}

function crFrente(ctx, d, A, W, H, b) {
  ctx.fillStyle = '#fff'; ctx.fillRect(-b, -b, W + 2 * b, H + 2 * b);
  // faixa superior (mesma linguagem do papel timbrado: verde, faixa dourada em diagonal e painel escuro com a marca)
  const HH = 30, inc = 14 / 33;
  const g = ctx.createLinearGradient(0, -b, W, HH); g.addColorStop(0, '#037A5C'); g.addColorStop(1, CR_COR.verde);
  ctx.fillStyle = g; ctx.fillRect(-b, -b, W + 2 * b, HH + b);
  const xD = y => W - 10 - (y + b) * inc;            // borda da diagonal
  ctx.fillStyle = CR_COR.verde2; ctx.beginPath(); ctx.moveTo(xD(-b), -b); ctx.lineTo(W + b, -b); ctx.lineTo(W + b, HH); ctx.lineTo(xD(HH), HH); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.moveTo(xD(-b), -b); ctx.lineTo(W + b, -b); ctx.lineTo(W + b, HH); ctx.lineTo(xD(HH), HH); ctx.closePath(); ctx.clip();
  ctx.globalAlpha = 0.1; ctx.drawImage(A.marca, W - 25, 3, 36, 36 * A.marca.height / A.marca.width); ctx.restore();
  ctx.fillStyle = CR_COR.ouro; ctx.beginPath(); ctx.moveTo(xD(-b) - 2.6, -b); ctx.lineTo(xD(-b) - 0.9, -b); ctx.lineTo(xD(HH) - 0.9, HH); ctx.lineTo(xD(HH) - 2.6, HH); ctx.closePath(); ctx.fill();
  // logo (fora da área do furo do cordão, que fica no topo central)
  const lw = 27, lh = lw * A.logo.height / A.logo.width;
  ctx.drawImage(A.logo, 5, 8.6, lw, lh);

  // foto
  const fx = 12.5, fy = 20.5, fw = 29, fh = 34.5, borda = 1.2, r = 3.2;
  ctx.save(); ctx.shadowColor = 'rgba(12,29,24,.28)'; ctx.shadowBlur = 2.2; ctx.shadowOffsetY = 0.5;
  ctx.fillStyle = '#fff'; crRet(ctx, fx - borda, fy - borda, fw + 2 * borda, fh + 2 * borda, r + borda); ctx.fill(); ctx.restore();
  ctx.save(); crRet(ctx, fx, fy, fw, fh, r); ctx.clip();
  if (d.foto) {
    const iw = d.foto.width, ih = d.foto.height, aj = d.ajuste || {};
    const z = Math.max(1, Number(aj.z) || 1), ax = Math.max(-1, Math.min(1, Number(aj.x) || 0)), ay = Math.max(-1, Math.min(1, aj.y == null ? -0.35 : Number(aj.y)));
    const esc_ = Math.max(fw / iw, fh / ih) * z, dw = iw * esc_, dh = ih * esc_;
    ctx.drawImage(d.foto, fx - (dw - fw) * (0.5 + ax / 2), fy - (dh - fh) * (0.5 + ay / 2), dw, dh);
  } else {
    const gg = ctx.createLinearGradient(0, fy, 0, fy + fh); gg.addColorStop(0, '#E2F0EB'); gg.addColorStop(1, '#CFE3DB');
    ctx.fillStyle = gg; ctx.fillRect(fx, fy, fw, fh);
    ctx.fillStyle = 'rgba(2,101,77,.28)'; ctx.beginPath(); ctx.arc(fx + fw / 2, fy + 14, 6.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(fx + fw / 2, fy + fh + 3, 12.5, 13, 0, Math.PI, 0); ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = CR_COR.ouro; ctx.lineWidth = 0.3; crRet(ctx, fx - borda - 0.15, fy - borda - 0.15, fw + 2 * borda + 0.3, fh + 2 * borda + 0.3, r + borda + 0.15); ctx.stroke();

  // nome, cargo e setor — centralizados no espaço entre a foto e o rodapé, sem cortar
  const topo = fy + fh + borda + 2.2, base = 77.6, larg = W - 8;
  const temSetor = !!d.setor, gap1 = 2.2, hS = temSetor ? 3.5 : 0, gap2 = temSetor ? 1.5 : 0;
  let N, C, hN, hC;
  for (let f = 1; f >= 0.62; f -= 0.03) {   // reduz tudo junto até o bloco caber entre a foto e o rodapé
    N = crAjustar(ctx, d.nome, { fonte: CR_TIT, peso: 800, max: 5.6 * f, min: Math.min(3.2, 5.6 * f), larg, maxL: 2, esp: -0.005 });
    C = d.cargo ? crAjustar(ctx, d.cargo, { fonte: CR_TXT, peso: 600, max: 2.35 * Math.max(f, 0.8), min: 1.6, larg, maxL: 2, esp: 0.08, caixa: true }) : { s: 0, ls: [] };
    hN = N.ls.length * N.s * 1.06; hC = C.ls.length * C.s * 1.32;
    if (hN + gap1 + hC + gap2 + hS <= base - topo) break;
  }
  let y = topo + Math.max(0, (base - topo - (hN + gap1 + hC + gap2 + hS)) / 2);
  ctx.textAlign = 'center'; ctx.fillStyle = CR_COR.escuro;
  ctx.font = `800 ${N.s}px ${CR_TIT}`; ctx.letterSpacing = `${-0.005 * N.s}px`;
  N.ls.forEach((l, i) => ctx.fillText(l, W / 2, y + N.s * 0.82 + i * N.s * 1.06)); y += hN;
  ctx.fillStyle = CR_COR.ouro; crRet(ctx, W / 2 - 4, y + gap1 / 2 - 0.25, 8, 0.5, 0.25); ctx.fill(); y += gap1;
  if (C.ls.length) { ctx.fillStyle = CR_COR.verde; ctx.font = `600 ${C.s}px ${CR_TXT}`; ctx.letterSpacing = `${0.08 * C.s}px`;
    C.ls.forEach((l, i) => ctx.fillText(l, W / 2 + 0.04 * C.s, y + C.s * 0.86 + i * C.s * 1.32)); y += hC; }
  if (temSetor) {
    y += gap2; const S = crAjustar(ctx, d.setor, { fonte: CR_TXT, peso: 600, max: 1.85, min: 1.4, larg: larg - 6, maxL: 1, esp: 0.12, caixa: true });
    ctx.font = `600 ${S.s}px ${CR_TXT}`; ctx.letterSpacing = `${0.12 * S.s}px`;
    const tw = ctx.measureText(S.ls[0]).width, pw = tw + 5;
    ctx.fillStyle = CR_COR.ouroClaro; crRet(ctx, W / 2 - pw / 2, y, pw, hS, hS / 2); ctx.fill();
    ctx.fillStyle = '#7A5A12'; ctx.fillText(S.ls[0], W / 2 + 0.06 * S.s, y + hS / 2 + S.s * 0.36);
  }
  // rodapé
  const RY = 78.8;
  ctx.fillStyle = CR_COR.escuro; ctx.fillRect(-b, RY, W + 2 * b, H - RY + b);
  ctx.fillStyle = CR_COR.ouro; ctx.fillRect(-b, RY, W + 2 * b, 0.55);
  const rod = [d.matricula && 'MATRÍCULA ' + d.matricula, d.admissao && 'DESDE ' + d.admissao].filter(Boolean).join('   ·   ') || 'VERBO LOGÍSTICA';
  const R = crAjustar(ctx, rod, { fonte: CR_TXT, peso: 600, max: 1.75, min: 1.3, larg: W - 8, maxL: 1, esp: 0.14 });
  ctx.fillStyle = '#fff'; ctx.font = `600 ${R.s}px ${CR_TXT}`; ctx.letterSpacing = `${0.14 * R.s}px`;
  ctx.fillText(R.ls[0], W / 2, RY + 0.55 + (H - RY - 0.55) / 2 + R.s * 0.36 - 0.25);
  ctx.textAlign = 'left'; ctx.letterSpacing = '0px';
}

function crVerso(ctx, d, A, W, H, b) {
  const g = ctx.createLinearGradient(0, -b, W * 0.4, H + b); g.addColorStop(0, CR_COR.verde2); g.addColorStop(1, CR_COR.escuro);
  ctx.fillStyle = g; ctx.fillRect(-b, -b, W + 2 * b, H + 2 * b);
  ctx.save(); ctx.globalAlpha = 0.07; const mw = 74; ctx.drawImage(A.marca, -6, 36, mw, mw * A.marca.height / A.marca.width); ctx.restore();
  ctx.fillStyle = CR_COR.ouro; ctx.fillRect(-b, H - 1.5, W + 2 * b, 1.5 + b);
  const lw = 26, lh = lw * A.logo.height / A.logo.width;
  ctx.drawImage(A.logo, (W - lw) / 2, 8.6, lw, lh);
  let y = 8.6 + lh + 4.2;
  ctx.textAlign = 'center'; ctx.fillStyle = CR_COR.ouro; ctx.font = `700 1.7px ${CR_TXT}`; ctx.letterSpacing = '0.42px';
  ctx.fillText('IDENTIFICAÇÃO FUNCIONAL', W / 2 + 0.21, y); y += 1.6;
  ctx.fillStyle = 'rgba(221,169,54,.55)'; ctx.fillRect(W / 2 - 6, y, 12, 0.3); y += 3.6;
  ctx.textAlign = 'left';
  const X = 6, L = W - 12;
  const campo = (rot, val, { max = 2.5, linhas = 2 } = {}) => {
    if (!val) return;
    ctx.fillStyle = CR_COR.ouro; ctx.font = `600 1.45px ${CR_TXT}`; ctx.letterSpacing = '0.25px'; ctx.fillText(rot.toUpperCase(), X, y); y += 2.9;
    const V = crAjustar(ctx, val, { fonte: CR_TXT, peso: 600, max, min: 1.8, larg: L, maxL: linhas });
    ctx.fillStyle = '#fff'; ctx.font = `600 ${V.s}px ${CR_TXT}`; ctx.letterSpacing = '0px';
    V.ls.forEach((l, i) => ctx.fillText(l, X, y + i * V.s * 1.2)); y += (V.ls.length - 1) * V.s * 1.2 + 3.9;
  };
  const dupla = (r1, v1, r2, v2) => {
    if (!v1 && !v2) return; if (!v1 || !v2) return campo(v1 ? r1 : r2, v1 || v2);
    const meio = X + L / 2 + 1;
    ctx.fillStyle = CR_COR.ouro; ctx.font = `600 1.45px ${CR_TXT}`; ctx.letterSpacing = '0.25px'; ctx.fillText(r1.toUpperCase(), X, y); ctx.fillText(r2.toUpperCase(), meio, y); y += 2.9;
    ctx.fillStyle = '#fff'; ctx.letterSpacing = '0px';
    const a = crAjustar(ctx, v1, { fonte: CR_TXT, peso: 600, max: 2.5, min: 1.6, larg: L / 2 - 2, maxL: 1 }); ctx.font = `600 ${a.s}px ${CR_TXT}`; ctx.fillText(a.ls[0], X, y);
    const c = crAjustar(ctx, v2, { fonte: CR_TXT, peso: 600, max: 2.5, min: 1.6, larg: L / 2 - 2, maxL: 1 }); ctx.fillStyle = '#fff'; ctx.font = `600 ${c.s}px ${CR_TXT}`; ctx.fillText(c.ls[0], meio, y);
    y += 3.9;
  };
  campo('Nome', d.nomeCompleto, { max: 2.6, linhas: 2 });
  campo('Cargo', d.cargo, { max: 2.3, linhas: 2 });
  dupla('Matrícula', d.matricula, 'Admissão', d.admissao);
  if (d.mostrarCPF) campo('CPF', crCPFParcial(d.cpf), { max: 2.3, linhas: 1 });
  if (d.emergencia) campo('Em caso de emergência', d.emergencia, { max: 2.1, linhas: 2 });
  // aviso e devolução
  const E = d.empresa || {};
  const aviso = 'Crachá pessoal e intransferível. Uso obrigatório nas dependências da empresa e nas operações. Em caso de perda, comunique o RH imediatamente.';
  const dev = [E.razao_social || E.nome_fantasia || 'Verbo Logística', [E.telefone && fmtTel(E.telefone), E.site].filter(Boolean).join(' · ')].filter(Boolean);
  ctx.font = `400 1.6px ${CR_TXT}`; ctx.letterSpacing = '0px';
  const al = crLinhas(ctx, aviso, L);
  const hBloco = al.length * 2.15 + 2.6 + 2.6 + dev.length * 2.35;
  let yb = Math.max(y + 1, H - 4.6 - hBloco);
  ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(X, yb - 2.6, L, 0.25);
  ctx.fillStyle = 'rgba(255,255,255,.78)'; al.forEach((l, i) => ctx.fillText(l, X, yb + i * 2.15)); yb += al.length * 2.15 + 1.4;
  ctx.fillStyle = CR_COR.ouro; ctx.font = `600 1.4px ${CR_TXT}`; ctx.letterSpacing = '0.22px'; ctx.fillText('SE ENCONTRADO, DEVOLVA À', X, yb + 1.2); yb += 3.6;
  dev.forEach((t, i) => { const T = crAjustar(ctx, t, { fonte: CR_TXT, peso: i ? 400 : 700, max: i ? 1.6 : 1.9, min: 1.3, larg: L, maxL: 1 });
    ctx.fillStyle = i ? 'rgba(255,255,255,.8)' : '#fff'; ctx.font = `${i ? 400 : 700} ${T.s}px ${CR_TXT}`; ctx.letterSpacing = '0px'; ctx.fillText(T.ls[0], X, yb + i * 2.35); });
  ctx.textAlign = 'left'; ctx.letterSpacing = '0px';
}

// canvas pronto de um lado (dpi / sangria em mm)
function crCanvas(lado, d, A, { dpi = CR_DPI, sangria = 0 } = {}) {
  const k = dpi / 25.4, c = document.createElement('canvas');
  c.width = Math.round((CR_W + 2 * sangria) * k); c.height = Math.round((CR_H + 2 * sangria) * k);
  crDesenhar(c.getContext('2d'), lado, d, A, k, sangria);
  return c;
}

// ---------- dados do colaborador → crachá ----------
async function crFotoDe(caminho) {
  if (!caminho) return null;
  const url = await api.linkArquivo(caminho);
  const blob = await (await fetch(url)).blob();
  return await createImageBitmap(blob);
}
async function crDados(c, extra = {}) {
  const [cgs, ss, es] = await Promise.all([cargosL(), setoresL(), empresasL().catch(() => [])]);
  const emerg = [c.emergencia_nome, c.emergencia_parentesco && `(${c.emergencia_parentesco})`, c.emergencia_telefone && fmtTel(c.emergencia_telefone)].filter(Boolean).join(' ');
  return {
    nome: c.cracha_nome || nomeCrachaPadrao(c), nomeCompleto: c.nome_social || c.nome, cargo: cgs.find(x => x.id === c.cargo_id)?.nome || '', setor: ss.find(x => x.id === c.setor_id)?.nome || '',
    matricula: c.matricula || '', admissao: c.data_admissao ? dataBR(c.data_admissao) : '', cpf: c.cpf, mostrarCPF: true, emergencia: '', emergTexto: emerg,
    ajuste: c.cracha_ajuste || {}, empresa: es[0] || {}, foto: await crFotoDe(c.foto_cracha_caminho).catch(() => null), ...extra };
}
const crNomeArq = (d, lado) => `Crachá ${d.nome.replace(/[\\/:*?"<>|]/g, '')}${lado ? ' - ' + lado : ''}`;

async function crBaixarPNG(d, lado) {
  const A = await crAtivos(); const c = crCanvas(lado, d, A, { dpi: CR_DPI, sangria: 0 });
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  baixarArquivo(blob, crNomeArq(d, lado) + '.png');
}
// lista de crachás num só PDF: cada colaborador = página da frente + página do verso
async function crPDF(lista, { grafica = true } = {}) {
  await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  const A = await crAtivos();
  const M = grafica ? 10 : 0, B = grafica ? CR_SANGRIA : 0, PW = CR_W + 2 * M, PH = CR_H + 2 * M;
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: [PW, PH], orientation: 'portrait', compress: true });
  let primeira = true;
  for (const d of lista) for (const lado of ['frente', 'verso']) {
    if (!primeira) doc.addPage([PW, PH], 'portrait'); primeira = false;
    const c = crCanvas(lado, d, A, { dpi: CR_DPI, sangria: B });
    doc.addImage(c.toDataURL('image/png'), 'PNG', M - B, M - B, CR_W + 2 * B, CR_H + 2 * B, undefined, 'FAST');
    if (grafica) {
      doc.setDrawColor(0); doc.setLineWidth(0.12);
      const xs = [M, M + CR_W], ys = [M, M + CR_H];
      xs.forEach(x => { doc.line(x, 1.5, x, M - B - 1.5); doc.line(x, M + CR_H + B + 1.5, x, PH - 1.5); });
      ys.forEach(y => { doc.line(1.5, y, M - B - 1.5, y); doc.line(M + CR_W + B + 1.5, y, PW - 1.5, y); });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(4.2); doc.setTextColor(90);
      doc.text(`${d.nome} · ${lado} · CR80 54 x 85,6 mm · sangria 3 mm`, PW / 2, PH - 2.2, { align: 'center' });
    }
  }
  return doc;
}

// ===================== Tela: Crachás =====================
rota('/rh/crachas', async tela => {
  if (!editaRH()) { tela.innerHTML = '<div class="cartao vazio">Sem permissão.</div>'; return; }
  const cols = await api.listar('colaboradores', 'select=id,nome,nome_social,matricula,status,cargo_id,setor_id,foto_cracha_caminho,cracha_gerado_em&ativo=eq.true&status=neq.desligado&order=nome');
  const cgs = await cargosL(); const CG = Object.fromEntries(cgs.map(x => [x.id, x.nome]));
  const sel = estado.params.get('c') || '';
  tela.innerHTML = `<div class="topo"><div><h1>Crachás</h1><p class="sub">Crachá no padrão Verbo (CR80 · 54 × 85,6 mm, frente e verso), pronto para a gráfica. Usa a <b>foto do crachá</b> do cadastro do colaborador.</p></div></div>
    <div class="cr-grade">
      <div class="cartao cr-ctrl">
        <label class="campo">Colaborador<select id="cr-col"><option value="">Selecione…</option>${cols.map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.nome)}${c.matricula ? ' · ' + esc(c.matricula) : ''}${c.foto_cracha_caminho ? '' : ' (sem foto do crachá)'}</option>`).join('')}</select></label>
        <div id="cr-form"><p class="muted">Selecione o colaborador para montar o crachá.</p></div>
      </div>
      <div class="cartao cr-prev"><div class="cr-lados"><figure><canvas id="cr-f"></canvas><figcaption>Frente</figcaption></figure><figure><canvas id="cr-v"></canvas><figcaption>Verso</figcaption></figure></div>
        <p class="muted cr-dica">Arraste a foto na frente para enquadrar e use o zoom ao lado. A prévia é a versão em tela; os arquivos saem em 600 dpi.</p></div>
    </div>
    <div class="cartao"><div class="topo" style="margin:0 0 8px"><div><h2 style="margin:0">Lote para a gráfica</h2><div class="muted">Um PDF com frente e verso de cada colaborador marcado, com sangria e marcas de corte.</div></div>
      <button class="btn prim" id="cr-lote">⬇ PDF do lote</button></div>
      <div class="cr-lote-filtro"><input id="cr-busca" placeholder="Buscar colaborador…"><label class="check"><input type="checkbox" id="cr-so-novos"> Só quem nunca teve crachá gerado</label><button type="button" class="btn peq" id="cr-todos">Marcar todos visíveis</button><button type="button" class="btn peq" id="cr-nenhum">Desmarcar</button></div>
      <div class="cr-lote-lista">${cols.map(c => `<label class="check cr-li" data-nome="${esc(semAcento(c.nome))}" data-novo="${c.cracha_gerado_em ? '0' : '1'}"><input type="checkbox" value="${c.id}" ${c.foto_cracha_caminho ? '' : 'disabled'}>
        <span><b>${esc(c.nome)}</b> <span class="muted">${esc(CG[c.cargo_id] || '')}</span>${c.foto_cracha_caminho ? '' : ' <span class="tag amarelo">sem foto do crachá</span>'}${c.cracha_gerado_em ? ` <span class="tag verde">gerado em ${dataBR(c.cracha_gerado_em.slice(0, 10))}</span>` : ''}</span></label>`).join('')}</div></div>`;

  const A = await crAtivos().catch(err => { falha(err); return null; }); if (!A) return;
  const cvF = $('#cr-f'), cvV = $('#cr-v');
  const KP = 9;   // px por mm na prévia (multiplicado pela densidade da tela)
  const dens = Math.min(3, window.devicePixelRatio || 1);
  [cvF, cvV].forEach(cv => { cv.width = Math.round(CR_W * KP * dens); cv.height = Math.round(CR_H * KP * dens); cv.style.width = CR_W * KP + 'px'; cv.style.aspectRatio = `${CR_W} / ${CR_H}`; });
  let col = null, d = null;
  const desenhar = () => { if (!d) return; crDesenhar(cvF.getContext('2d'), 'frente', d, A, KP * dens); crDesenhar(cvV.getContext('2d'), 'verso', d, A, KP * dens); };
  const vazio = { nome: 'Nome do colaborador', nomeCompleto: 'Nome completo do colaborador', cargo: 'Cargo', setor: 'Setor', matricula: '0000', admissao: dataBR(hojeISO()), empresa: (await empresasL().catch(() => []))[0] || {}, mostrarCPF: false };
  d = vazio; desenhar(); d = null;

  const abrir = async id => {
    col = id ? await api.um('colaboradores', `id=eq.${id}&select=*`) : null;
    const box = $('#cr-form');
    if (!col) { box.innerHTML = '<p class="muted">Selecione o colaborador para montar o crachá.</p>'; d = vazio; desenhar(); d = null; return; }
    box.innerHTML = '<p class="muted">Carregando…</p>';
    d = await crDados(col);
    box.innerHTML = `${d.foto ? '' : `<div class="alerta-obs" style="margin-bottom:10px">Este colaborador ainda não tem a <b>foto do crachá</b>. Envie aqui ou no cadastro dele.</div>`}
      <div class="form" style="grid-template-columns:1fr">
        <label class="campo">Nome no crachá<input id="cr-nome" value="${esc(d.nome)}" maxlength="40"><small class="muted">Sugestão: primeiro e último nome. Nome completo vai no verso.</small></label>
        <label class="campo">Foto do crachá ${d.foto ? '(trocar)' : '*'}<input type="file" id="cr-foto" accept="image/*"></label>
        <label class="campo">Zoom da foto<input type="range" id="cr-zoom" min="1" max="3" step="0.01" value="${Number(d.ajuste.z) || 1}"></label>
        <div class="cr-acoes-foto"><button type="button" class="btn peq" id="cr-centro">Centralizar foto</button></div>
        <label class="check"><input type="checkbox" id="cr-cpf" checked> Mostrar CPF parcial no verso (***.456.789-**)</label>
        <label class="check"><input type="checkbox" id="cr-emerg" ${d.emergTexto ? '' : 'disabled'}> Mostrar contato de emergência no verso${d.emergTexto ? '' : ' <span class="muted">(não cadastrado)</span>'}</label>
      </div>
      <div class="cr-botoes">
        <button class="btn" id="cr-salvar">Salvar nome e enquadramento</button>
        <button class="btn prim" id="cr-pdf-g">⬇ PDF para a gráfica</button>
        <button class="btn" id="cr-pdf">⬇ PDF tamanho final</button>
        <button class="btn" id="cr-png-f">⬇ Imagem frente (PNG)</button>
        <button class="btn" id="cr-png-v">⬇ Imagem verso (PNG)</button>
      </div>
      <p class="muted" style="margin:8px 0 0">PDF para a gráfica: 54 × 85,6 mm com 3 mm de sangria e marcas de corte. Imagens em 600 dpi.</p>`;
    desenhar();
    $('#cr-nome').oninput = e => { d.nome = e.target.value.trim() || nomeCrachaPadrao(col); desenhar(); };
    $('#cr-zoom').oninput = e => { d.ajuste = { ...d.ajuste, z: Number(e.target.value) }; desenhar(); };
    $('#cr-centro').onclick = () => { d.ajuste = { z: 1, x: 0, y: -0.35 }; $('#cr-zoom').value = 1; desenhar(); };
    $('#cr-cpf').onchange = e => { d.mostrarCPF = e.target.checked; desenhar(); };
    $('#cr-emerg').onchange = e => { d.emergencia = e.target.checked ? d.emergTexto : ''; desenhar(); };
    $('#cr-foto').onchange = async e => { const f = e.target.files[0]; if (!f) return;
      try { aviso('Enviando foto…'); await salvarFotoColaborador(col.id, f, 'cracha'); col = await api.um('colaboradores', `id=eq.${col.id}&select=*`);
        d.foto = await crFotoDe(col.foto_cracha_caminho); d.ajuste = {}; $('#cr-zoom').value = 1; desenhar(); aviso('Foto do crachá salva no cadastro.'); } catch (err) { falha(err); } };
    $('#cr-salvar').onclick = e => ocupado(e.currentTarget, async () => { try {
      await api.alterar('colaboradores', `id=eq.${col.id}`, { cracha_nome: d.nome === nomeCrachaPadrao(col) ? null : d.nome, cracha_ajuste: d.ajuste }); aviso('Crachá salvo: nome e enquadramento ficam guardados.'); } catch (err) { falha(err); } });
    const exigeFoto = () => { if (!d.foto) { aviso('Envie a foto do crachá antes de gerar o arquivo.', true); return false; } return true; };
    $('#cr-pdf-g').onclick = e => exigeFoto() && ocupado(e.currentTarget, async () => { try { const doc = await crPDF([d], { grafica: true }); doc.save(crNomeArq(d, 'gráfica') + '.pdf');
      await api.alterar('colaboradores', `id=eq.${col.id}`, { cracha_gerado_em: new Date().toISOString(), cracha_nome: d.nome === nomeCrachaPadrao(col) ? null : d.nome, cracha_ajuste: d.ajuste }).catch(() => {}); } catch (err) { falha(err); } });
    $('#cr-pdf').onclick = e => exigeFoto() && ocupado(e.currentTarget, async () => { try { (await crPDF([d], { grafica: false })).save(crNomeArq(d) + '.pdf'); } catch (err) { falha(err); } });
    $('#cr-png-f').onclick = e => exigeFoto() && ocupado(e.currentTarget, async () => { try { await crBaixarPNG(d, 'frente'); } catch (err) { falha(err); } });
    $('#cr-png-v').onclick = e => exigeFoto() && ocupado(e.currentTarget, async () => { try { await crBaixarPNG(d, 'verso'); } catch (err) { falha(err); } });
  };
  $('#cr-col').onchange = e => { history.replaceState(null, '', '#/rh/crachas' + (e.target.value ? '?c=' + e.target.value : '')); abrir(e.target.value); };
  if (sel) abrir(sel);

  // arrastar a foto para enquadrar
  const FOTO = { x: 12.5, y: 20.5, w: 29, h: 34.5 };
  let arr = null;
  const ponto = ev => { const r = cvF.getBoundingClientRect(); return { x: (ev.clientX - r.left) / r.width * CR_W, y: (ev.clientY - r.top) / r.height * CR_H }; };
  cvF.addEventListener('pointerdown', ev => { if (!d?.foto) return; const p = ponto(ev);
    if (p.x < FOTO.x || p.x > FOTO.x + FOTO.w || p.y < FOTO.y || p.y > FOTO.y + FOTO.h) return;
    arr = { p, aj: { z: Number(d.ajuste.z) || 1, x: Number(d.ajuste.x) || 0, y: d.ajuste.y == null ? -0.35 : Number(d.ajuste.y) } }; cvF.setPointerCapture(ev.pointerId); ev.preventDefault(); });
  cvF.addEventListener('pointermove', ev => { if (!arr) return; const p = ponto(ev), f = d.foto;
    const esc_ = Math.max(FOTO.w / f.width, FOTO.h / f.height) * arr.aj.z, ex = f.width * esc_ - FOTO.w, ey = f.height * esc_ - FOTO.h;
    const nx = ex > 0.01 ? arr.aj.x - (p.x - arr.p.x) * 2 / ex : 0, ny = ey > 0.01 ? arr.aj.y - (p.y - arr.p.y) * 2 / ey : 0;
    d.ajuste = { z: arr.aj.z, x: Math.max(-1, Math.min(1, nx)), y: Math.max(-1, Math.min(1, ny)) }; desenhar(); });
  ['pointerup', 'pointercancel'].forEach(t => cvF.addEventListener(t, () => (arr = null)));
  cvF.addEventListener('wheel', ev => { if (!d?.foto) return; ev.preventDefault(); const z = Math.max(1, Math.min(3, (Number(d.ajuste.z) || 1) * (ev.deltaY < 0 ? 1.05 : 1 / 1.05)));
    d.ajuste = { ...d.ajuste, z }; const zr = $('#cr-zoom'); if (zr) zr.value = z; desenhar(); }, { passive: false });

  // lote
  const itens = $$('.cr-li', tela);
  const filtrar = () => { const q = semAcento($('#cr-busca').value), so = $('#cr-so-novos').checked; itens.forEach(li => (li.hidden = (q && !li.dataset.nome.includes(q)) || (so && li.dataset.novo !== '1'))); };
  $('#cr-busca').oninput = filtrar; $('#cr-so-novos').onchange = filtrar;
  $('#cr-todos').onclick = () => itens.filter(li => !li.hidden).forEach(li => { const c = $('input', li); if (!c.disabled) c.checked = true; });
  $('#cr-nenhum').onclick = () => itens.forEach(li => ($('input', li).checked = false));
  $('#cr-lote').onclick = e => ocupado(e.currentTarget, async () => {
    const ids = itens.map(li => $('input', li)).filter(c => c.checked).map(c => c.value);
    if (!ids.length) return aviso('Marque ao menos um colaborador (com foto do crachá).', true);
    try {
      const cs = await api.listar('colaboradores', `id=in.(${ids.join(',')})&select=*&order=nome`);
      const lista = []; for (const c of cs) lista.push(await crDados(c));
      (await crPDF(lista, { grafica: true })).save(`Crachás para a gráfica ${hojeISO()} (${lista.length}).pdf`);
      await api.alterar('colaboradores', `id=in.(${ids.join(',')})`, { cracha_gerado_em: new Date().toISOString() }).catch(() => {});
      aviso(`PDF com ${lista.length} crachá(s) gerado.`);
    } catch (err) { falha(err); }
  });
});

// ---------- fotos do colaborador (ficha de registro e crachá) ----------
async function prepFotoAlta(f, maxLado) {
  if (!f.type.startsWith('image/')) throw new Error('Envie uma imagem (JPG ou PNG).');
  const img = await createImageBitmap(f);
  const e_ = Math.min(1, maxLado / Math.max(img.width, img.height));
  if (e_ === 1 && f.type === 'image/jpeg' && f.size < 4 * 1048576) return f;
  const c = document.createElement('canvas'); c.width = Math.round(img.width * e_); c.height = Math.round(img.height * e_);
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.93));
  return new File([blob], (f.name || 'foto').replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
}
async function salvarFotoColaborador(id, arquivo, tipo) {
  const f = await prepFotoAlta(arquivo, tipo === 'cracha' ? 2600 : 1600);
  const caminho = `colaborador/${id}/foto-${tipo}-${Date.now()}.jpg`;
  await api.enviarArquivo(caminho, f);
  await api.inserir('anexos', { entidade: 'colaborador', entidade_id: id, caminho_arquivo: caminho, nome_original: arquivo.name || 'foto.jpg', tipo_mime: f.type, tamanho_bytes: f.size,
    enviado_por: estado.usuario.id, descricao: tipo === 'cracha' ? 'Foto do crachá' : 'Foto da ficha de registro' });
  await api.alterar('colaboradores', `id=eq.${id}`, tipo === 'cracha' ? { foto_cracha_caminho: caminho, cracha_ajuste: null } : { foto_caminho: caminho });
  return caminho;
}
async function htmlFotosColaborador(c, editavel) {
  const url = async p => p ? await api.linkArquivo(p).catch(() => '') : '';
  const [u1, u2] = await Promise.all([url(c?.foto_caminho), url(c?.foto_cracha_caminho)]);
  const caixa = (rot, sub, u, nome) => `<div class="cr-foto-box"><div class="cr-foto-th ${nome === 'foto_cracha' ? 'cr-th-cracha' : ''}">${u ? `<img src="${esc(u)}" alt="${esc(rot)}">` : '<span class="muted">Sem foto</span>'}</div>
    <div><b>${rot}</b><div class="muted">${sub}</div>${editavel ? `<label class="campo" style="margin-top:6px">${u ? 'Trocar' : 'Enviar'}<input type="file" name="_${nome}" accept="image/*"></label>` : ''}</div></div>`;
  return `<div class="cr-fotos">${caixa('Foto da ficha de registro', '3x4 formal, fundo claro. Fica no cadastro.', u1, 'foto_ficha')}${caixa('Foto do crachá', 'Foto que o colaborador escolheu para o crachá (de frente, rosto bem visível).', u2, 'foto_cracha')}</div>`;
}
