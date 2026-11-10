// Verbo Gestão — Painel Logístico · Status da frota (hora a hora)
// Situação atual (Creare + ajustes da torre), foto de qualquer data/hora, ocupação por período e exportação (imagem, PDF, HTML, Excel)
const PL_ATIV = ['Trânsito Vazio', 'Trânsito Carregado', 'No Horto', 'Na Fábrica', 'Aguardando Nota', 'Cadastro na Balança', 'Falta Cadastro Ticket LOG', 'Mobilização',
  'Troca de Turno', 'Prancha', 'Corretiva', 'Preventiva', 'Inspeção', 'SOS', 'Sem Motorista', 'Sem Composição', 'Sem Cavalo'];
const PL_LOCAIS = ['Trajeto', 'Horto', 'Fábrica', 'Aguardando nota', 'P.A verbo', 'Posto Base', 'Posto Bracell', 'Lavador', 'Granfer', 'Aoki', 'Betel', 'Cemavi', 'Termac',
  'Creare', 'Desamarração', 'Estimulação', 'Instalação de rádio', 'Mobilização', 'Trânsito'];
const PL_ST = { disponivel: 'Disponível', manutencao: 'Manutenção', indisponivel: 'Indisponível' };
const PL_COR = { 'Trânsito Vazio': '#DDA936', 'Trânsito Carregado': '#2BB673', 'No Horto': '#6FCF97', 'Na Fábrica': '#56A8E8', 'Aguardando Nota': '#9AA5B1',
  'Cadastro na Balança': '#B39DDB', 'Falta Cadastro Ticket LOG': '#C5A3FF', 'Mobilização': '#4DD0E1', 'Troca de Turno': '#F5D76E', 'Prancha': '#A1887F',
  'Corretiva': '#F2994A', 'Preventiva': '#E2B93B', 'Inspeção': '#9B7BEA', 'SOS': '#EB5757', 'Sem Motorista': '#CFD8DC', 'Sem Composição': '#E57373',
  'Sem Cavalo': '#8D6E63', 'Outros / sem atividade': '#5F7A70' };
const PL_PONTOS = [['Três Lagoas (MS)', -20.7849, -51.7007, 'origem'], ['Guararapes (SP)', -21.2608, -50.6453, 'apoio'], ['Lençóis Paulista (SP)', -22.5986, -48.8003, 'destino']];
const plIc = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const PL_IC = {
  caminhao: plIc('<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>'),
  ok: plIc('<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>'), arvore: plIc('<path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z"/><path d="M12 22v-3"/>'),
  fabrica: plIc('<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/>'),
  chave: plIc('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'),
  sol: plIc('<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>'),
  prancheta: plIc('<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>'),
  alerta: plIc('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>'),
  doc: plIc('<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>'),
  pessoa: plIc('<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>'), elo: plIc('<path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" x2="16" y1="12" y2="12"/>'),
  semcav: plIc('<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/><path d="m2 2 20 20"/>'),
  proibido: plIc('<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>'), pino: plIc('<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>'),
  pizza: plIc('<path d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z"/><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>')
};
const plCss = `<style id="pl-css">
.pl-wrap{--pl-fundo:#0B1F19;--pl-card:rgba(19,48,42,.78);--pl-borda:rgba(221,169,54,.22);--pl-ouro:#DDA936;--pl-verde:#2BB673;--pl-txt:#EAF2EE;--pl-sub:#9FB8AE}
.pl-barra{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px}.pl-barra .pl-modo{display:flex;gap:4px}.pl-barra input{max-width:200px}
.pl-painel{background:radial-gradient(circle at 85% 0%,#0F5C45 0,rgba(15,92,69,0) 45%),radial-gradient(circle at 10% 100%,#3a3a12 0,rgba(58,58,18,0) 40%),#0B1F19;color:var(--pl-txt);border-radius:16px;padding:22px 24px 26px;font-family:Inter,system-ui,sans-serif;min-width:0}
.pl-topo{display:flex;align-items:center;gap:18px;border-bottom:1px solid rgba(221,169,54,.25);padding-bottom:14px;margin-bottom:18px}.pl-topo img{height:46px}
.pl-tit{flex:1;min-width:0}.pl-tit h1{margin:0;font-size:30px;font-weight:300;letter-spacing:.2px;color:#fff;line-height:1.1}.pl-tit h1 b{font-weight:800}.pl-tit h1 em{font-style:normal;font-weight:800;color:var(--pl-ouro)}
.pl-tit p{margin:6px 0 0;font-size:11.5px;letter-spacing:4px;color:var(--pl-sub)}.pl-hora{border:1px solid rgba(221,169,54,.5);border-radius:12px;padding:10px 18px;font-size:22px;font-weight:700;color:#fff;white-space:nowrap;background:rgba(2,101,77,.25)}
.pl-hora small{display:block;font-size:10px;font-weight:600;letter-spacing:2px;color:var(--pl-ouro)}
.pl-grade{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:18px}.pl-col{display:flex;flex-direction:column;gap:14px;min-width:0}
.pl-c{position:relative;background:var(--pl-card);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:14px 16px;overflow:hidden;min-width:0}
.pl-c:before{content:"";position:absolute;left:0;top:10px;bottom:10px;width:4px;border-radius:0 4px 4px 0;background:var(--cor,#2BB673)}
.pl-c h3{display:flex;align-items:center;gap:10px;margin:0;font-size:13.5px;letter-spacing:1.6px;font-weight:700;color:#fff;text-transform:uppercase}.pl-c h3 svg{width:20px;height:20px;color:var(--cor,#2BB673);flex:none}
.pl-n{font-size:46px;font-weight:800;line-height:1;margin-top:12px;color:#fff}.pl-c.grande .pl-n{font-size:58px}
.pl-grupo{border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:12px;background:rgba(255,255,255,.02)}.pl-grupo>h4{margin:0 0 10px 4px;font-size:12.5px;letter-spacing:3px;color:var(--pl-ouro);font-weight:700}
.pl-l2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.pl-l4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.pl-l2x{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px}.pl-mini{display:flex;flex-direction:column;gap:8px}
.pl-m{display:flex;align-items:center;gap:10px;background:var(--pl-card);border:1px solid rgba(255,255,255,.07);border-left:3px solid var(--cor,#9FB8AE);border-radius:10px;padding:9px 12px;font-size:12px;font-weight:700;letter-spacing:1px}
.pl-m svg{width:17px;height:17px;color:var(--cor,#9FB8AE)}.pl-m span{flex:1}.pl-m b{font-size:20px}
.pl-visao h4{display:flex;align-items:center;gap:12px;margin:4px 0 12px;font-size:13px;letter-spacing:3px;color:var(--pl-ouro)}.pl-visao h4:after{content:"";flex:1;height:1px;background:rgba(221,169,54,.3)}
.pl-pct{font-size:12px;letter-spacing:2.5px;color:var(--pl-sub);border-top:1px solid rgba(255,255,255,.1);margin-top:10px;padding-top:8px;text-align:center}.pl-pct b{color:#fff;font-size:15px;letter-spacing:0;margin-right:4px}
.pl-mapa{height:300px;border-radius:12px;overflow:hidden;border:1px solid rgba(221,169,54,.25);background:#0E2520;margin-top:10px}.pl-sub{font-size:12px;color:var(--pl-sub);margin:4px 0 0 30px}
.pl-leg{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:11.5px;color:#DCE8E3;margin-top:8px}.pl-leg i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px;vertical-align:-1px}
.pl-donut{display:flex;align-items:center;gap:14px;margin-top:10px;flex-wrap:wrap}.pl-donut svg{width:150px;height:150px;flex:none}.pl-donut ul{list-style:none;margin:0;padding:0;font-size:12px;flex:1;min-width:140px}
.pl-donut li{display:flex;align-items:center;gap:6px;margin:3px 0}.pl-donut li i{width:10px;height:10px;border-radius:3px;flex:none}.pl-donut li b{margin-left:auto}
.pl-rot{background:#0B1F19;border:1px solid var(--pl-ouro);color:#fff;font-weight:700;font-size:11px;padding:2px 6px;border-radius:6px;white-space:nowrap}
.pl-per{font-size:12px;color:var(--pl-sub);margin-top:8px}
.pl-tab td .tag{white-space:nowrap}.pl-trava{font-size:11px;color:#8a6d1a}
@media (max-width:1100px){.pl-grade{grid-template-columns:1fr}.pl-l4{grid-template-columns:repeat(2,minmax(0,1fr))}.pl-l2x{grid-template-columns:1fr}}
@media (max-width:560px){.pl-topo{flex-wrap:wrap}.pl-tit h1{font-size:22px}.pl-n{font-size:38px}.pl-painel{padding:14px}}
</style>`;

const plConta = fs => {
  const at = a => fs.filter(f => f.atividade === a).length, st = s => fs.filter(f => f.status === s).length;
  const loc = re => fs.filter(f => re.test(f.local || '')).length;
  const c = { total: fs.length, disp: st('disponivel'), man: st('manutencao'), indisp: st('indisponivel'), carregado: at('Trânsito Carregado'), vazio: at('Trânsito Vazio'),
    horto: fs.filter(f => f.atividade === 'No Horto' || (/horto/i.test(f.local || '') && !/tr[âa]nsito/i.test(f.atividade || ''))).length,
    fabrica: fs.filter(f => f.atividade === 'Na Fábrica' || (/f[áa]brica/i.test(f.local || '') && !/tr[âa]nsito/i.test(f.atividade || ''))).length,
    corretiva: at('Corretiva'), preventiva: at('Preventiva'), inspecao: at('Inspeção'), sos: at('SOS'), nota: at('Aguardando Nota'), semMot: at('Sem Motorista'), semComp: at('Sem Composição'), semCav: at('Sem Cavalo') };
  c.operando = c.carregado + c.vazio + c.horto + c.fabrica; void loc; return c;
};
const plPct = (n, t) => t ? Math.round(n / t * 100) : 0;
function plDonut(dist) {
  const it = Object.entries(dist).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]); const tot = it.reduce((s, [, v]) => s + v, 0);
  if (!tot) return '<div class="pl-per">Sem dados no período.</div>';
  let ang = -Math.PI / 2; const R = 60, r = 38, cx = 75, cy = 75;
  const arcos = it.map(([k, v]) => { const a = v / tot * Math.PI * 2, a2 = ang + a, g = a > Math.PI ? 1 : 0;
    const p = (rr, t) => `${(cx + rr * Math.cos(t)).toFixed(2)} ${(cy + rr * Math.sin(t)).toFixed(2)}`;
    const d = it.length === 1 ? `M ${cx - R} ${cy} A ${R} ${R} 0 1 1 ${cx + R} ${cy} A ${R} ${R} 0 1 1 ${cx - R} ${cy} M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy}`
      : `M ${p(R, ang)} A ${R} ${R} 0 ${g} 1 ${p(R, a2)} L ${p(r, a2)} A ${r} ${r} 0 ${g} 0 ${p(r, ang)} Z`;
    ang = a2; return `<path d="${d}" fill="${PL_COR[k] || '#5F7A70'}" fill-rule="evenodd" stroke="#0B1F19" stroke-width="1.5"/>`; }).join('');
  const fmt = v => Number.isInteger(v) ? v : v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  return `<div class="pl-donut"><svg viewBox="0 0 150 150">${arcos}<text x="75" y="72" text-anchor="middle" fill="#fff" font-size="22" font-weight="800">${fmt(tot)}</text><text x="75" y="90" text-anchor="middle" fill="#9FB8AE" font-size="9" letter-spacing="1">${Object.values(dist).some(v => !Number.isInteger(v)) ? 'HORAS' : 'FROTAS'}</text></svg>
    <ul>${it.map(([k, v]) => `<li><i style="background:${PL_COR[k] || '#5F7A70'}"></i>${esc(k)}<b>${fmt(v)}${Number.isInteger(tot) ? '' : ' h'} · ${plPct(v, tot)}%</b></li>`).join('')}</ul></div>`;
}

function plHtml(fs, c, quando, per) {
  const card = (cor, ic, t, n, cls = '') => `<div class="pl-c ${cls}" style="--cor:${cor}"><h3>${PL_IC[ic]}${t}</h3><div class="pl-n">${n}</div></div>`;
  const mini = (cor, ic, t, n) => `<div class="pl-m" style="--cor:${cor}">${PL_IC[ic]}<span>${t}</span><b>${n}</b></div>`;
  const vg = (cor, ic, t, n) => `<div class="pl-c" style="--cor:${cor}"><h3>${PL_IC[ic]}${t}</h3><div class="pl-n">${n}</div><div class="pl-pct"><b>${plPct(n, c.total)}%</b> DA FROTA</div></div>`;
  const dist = per ? per.por_atividade || {} : fs.reduce((o, f) => { const k = f.atividade || 'Outros / sem atividade'; o[k] = (o[k] || 0) + 1; return o; }, {});
  return `<div class="pl-painel" id="pl-painel">
    <div class="pl-topo"><img src="logo.png" alt="Verbo"><div class="pl-tit"><h1>PAINEL <b>LOGÍSTICO</b> · <em>STATUS DA FROTA</em></h1><p>RITMO OPERACIONAL · ATUALIZAÇÃO AUTOMÁTICA</p></div>
      <div class="pl-hora"><small>${per ? 'PERÍODO' : 'SITUAÇÃO EM'}</small>${esc(quando)}</div></div>
    <div class="pl-grade"><div class="pl-col">
      <div class="pl-l2">${card('#DDA936', 'caminhao', 'Total de frotas operacionais', c.total, 'grande')}${card('#2BB673', 'ok', 'Frotas disponíveis', c.disp, 'grande')}</div>
      <div class="pl-l2x"><div class="pl-grupo"><h4>EM TRÂNSITO</h4><div class="pl-l2">${card('#2BB673', 'caminhao', 'Carregado', c.carregado)}${card('#DDA936', 'caminhao', 'Vazio', c.vazio)}</div></div>
        <div class="pl-l2">${card('#2BB673', 'arvore', 'No horto', c.horto)}${card('#56A8E8', 'fabrica', 'Na fábrica', c.fabrica)}</div></div>
      <div class="pl-l2x" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr)"><div class="pl-grupo"><h4>MANUTENÇÃO</h4><div class="pl-l4">${card('#F2994A', 'chave', 'Corretiva', c.corretiva)}${card('#E2B93B', 'sol', 'Preventiva', c.preventiva)}${card('#9B7BEA', 'prancheta', 'Inspeção', c.inspecao)}${card('#EB5757', 'alerta', 'SOS', c.sos)}</div></div>
        <div class="pl-mini">${mini('#56A8E8', 'doc', 'AGUARDANDO NOTA', c.nota)}${mini('#CFD8DC', 'pessoa', 'SEM MOTORISTA', c.semMot)}${mini('#E57373', 'elo', 'SEM COMPOSIÇÃO', c.semComp)}${mini('#A1887F', 'semcav', 'SEM CAVALO', c.semCav)}</div></div>
      <div class="pl-visao"><h4>VISÃO GERAL</h4><div class="pl-l4">${vg('#DDA936', 'caminhao', 'Operando', c.operando)}${vg('#EB5757', 'chave', 'Manutenção', c.man)}${vg('#2BB673', 'ok', 'Disponível', c.disp)}${vg('#F2994A', 'proibido', 'Indisponível', c.indisp)}</div></div>
    </div><div class="pl-col">
      <div class="pl-c" style="--cor:#DDA936"><h3>${PL_IC.pino}Corredor operacional</h3><div class="pl-sub">Três Lagoas (MS) · Guararapes (SP) · Lençóis Paulista (SP)</div>
        <div class="pl-mapa" id="pl-mapa"></div>
        <div class="pl-leg"><span><i style="background:#DDA936"></i>Origem</span><span><i style="background:#fff"></i>Apoio · administrativo</span><span><i style="background:#F2C94C"></i>Destino</span>
          <span><i style="background:#2BB673"></i>Carregado</span><span><i style="background:#DDA936;border:2px solid #fff"></i>Vazio</span><span><i style="background:#9FB8AE"></i>Outras</span></div>
        <div class="pl-per" id="pl-mapa-info"></div></div>
      <div class="pl-c" style="--cor:#DDA936;flex:1"><h3>${PL_IC.pizza}Ocupação da frota</h3><div class="pl-sub">${per ? 'Horas por atividade no período' : 'Distribuição por atividade'}</div>${plDonut(dist)}</div>
    </div></div></div>`;
}

async function plMapa(el, fs) {
  if (!window.L) { document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">'); await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'); }
  const m = L.map(el, { zoomControl: true, attributionControl: false, preferCanvas: false });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { subdomains: 'abcd', maxZoom: 18, crossOrigin: true }).addTo(m);
  const pts = PL_PONTOS.map(p => [p[1], p[2]]);
  L.polyline(pts, { color: '#DDA936', weight: 3, opacity: .85, dashArray: '8 8' }).addTo(m);
  PL_PONTOS.forEach(([n, la, lo, t]) => L.circleMarker([la, lo], { radius: 7, color: '#0B1F19', weight: 2, fillColor: t === 'apoio' ? '#fff' : t === 'origem' ? '#DDA936' : '#F2C94C', fillOpacity: 1 }).bindTooltip(n).addTo(m));
  const com = fs.filter(f => f.lat != null && f.lng != null), b = L.latLngBounds(pts);
  com.forEach(f => { const cor = f.atividade === 'Trânsito Carregado' ? '#2BB673' : f.atividade === 'Trânsito Vazio' ? '#DDA936' : '#9FB8AE';
    const mk = L.circleMarker([f.lat, f.lng], { radius: 9, color: '#fff', weight: 2, fillColor: cor, fillOpacity: 1 }).addTo(m);
    mk.bindTooltip(`<b>${esc(f.codigo)}</b> ${esc(f.placa || '')}<br>${esc(f.atividade || '—')}${f.motorista ? '<br>' + esc(f.motorista) : ''}${f.local_creare ? '<br>' + esc(f.local_creare) : ''}${f.posicao_em ? '<br>' + dataHoraBR(f.posicao_em) : ''}`);
    L.marker([f.lat, f.lng], { icon: L.divIcon({ className: '', html: `<span class="pl-rot">${esc(f.codigo)}</span>`, iconAnchor: [-10, 10] }), interactive: false }).addTo(m);
    b.extend([f.lat, f.lng]); });
  m.fitBounds(b.pad(0.12));
  const ult = com.map(f => f.posicao_em).filter(Boolean).sort().pop();
  $('#pl-mapa-info').textContent = com.length ? `${com.length} frota(s) com posição da telemetria${ult ? ' · última leitura ' + dataHoraBR(ult) : ''}` : 'Ainda sem posição da telemetria para as frotas.';
  return m;
}

rota('/operacao/painel', async tela => {
  if (!document.getElementById('pl-css')) document.head.insertAdjacentHTML('beforeend', plCss);
  const P = estado.params, modo = P.get('modo') || 'agora', em = P.get('em') || '', ini = P.get('de') || '', fim = P.get('ate') || '';
  const ed = tem('administrador', 'operacao');
  let fs, per = null, quando;
  try {
    if (modo === 'periodo' && ini && fim) {
      [fs, per] = await Promise.all([api.rpc('painel_logistico', { p_em: new Date(fim).toISOString() }), api.rpc('painel_logistico_periodo', { p_ini: new Date(ini).toISOString(), p_fim: new Date(fim).toISOString() })]);
      quando = `${dataHoraBR(new Date(ini).toISOString())} → ${dataHoraBR(new Date(fim).toISOString())}`;
    } else if (modo === 'em' && em) { fs = await api.rpc('painel_logistico', { p_em: new Date(em).toISOString() }); quando = dataHoraBR(new Date(em).toISOString()); }
    else { fs = await api.rpc('painel_logistico', {}); quando = dataHoraBR(new Date().toISOString()); }
  } catch (err) { falha(err); return; }
  fs = fs || []; const c = plConta(fs);
  const agoraLocal = dtLocal(new Date().toISOString()), ontemLocal = dtLocal(new Date(Date.now() - 864e5).toISOString());
  tela.innerHTML = `<div class="pl-wrap">
    <div class="topo"><div><h1>Painel logístico</h1><p class="sub">Status da frota hora a hora · telemetria Creare + ajustes da torre</p></div>
      <div class="acoes"><button class="btn" data-exp="png">Imagem (PNG)</button><button class="btn" data-exp="pdf">PDF</button><button class="btn" data-exp="html">HTML</button><button class="btn" data-exp="xlsx">Excel</button></div></div>
    <form class="filtros pl-barra" id="pl-f"><div class="pl-modo"><select name="modo"><option value="agora" ${modo === 'agora' ? 'selected' : ''}>Agora</option><option value="em" ${modo === 'em' ? 'selected' : ''}>Em uma data e hora</option><option value="periodo" ${modo === 'periodo' ? 'selected' : ''}>Período (de… até…)</option></select></div>
      <input type="datetime-local" name="em" value="${esc(em || agoraLocal)}" ${modo === 'em' ? '' : 'hidden'} aria-label="Data e hora">
      <input type="datetime-local" name="de" value="${esc(ini || ontemLocal)}" ${modo === 'periodo' ? '' : 'hidden'} aria-label="De"><input type="datetime-local" name="ate" value="${esc(fim || agoraLocal)}" ${modo === 'periodo' ? '' : 'hidden'} aria-label="Até">
      <button class="btn prim">Ver</button>${modo === 'agora' ? '<span class="muted" id="pl-auto">Atualiza sozinho a cada 5 min</span>' : ''}</form>
    ${plHtml(fs, c, quando, per)}
    ${per ? `<div class="cartao"><h2>Horas no período</h2><div class="tabela-wrap"><table class="tabela compacta"><thead><tr><th>Situação</th><th>Horas de frota</th><th>%</th></tr></thead><tbody>
      ${Object.entries(per.por_status || {}).map(([k, v]) => `<tr><td>${esc(PL_ST[k] || k)}</td><td>${v.toLocaleString('pt-BR')}</td><td>${plPct(v, per.horas_total)}%</td></tr>`).join('')}</tbody></table></div>
      <p class="muted">Base: ${per.fotos} foto(s) da frota no período (coletas do Creare e ajustes da torre). Cada foto vale até a seguinte.</p></div>` : ''}
    <div class="cartao"><h2>Frotas ${modo === 'agora' ? '' : '<span class="muted">(situação em ' + esc(modo === 'periodo' ? dataHoraBR(new Date(fim).toISOString()) : quando) + ')</span>'}</h2>
      <div class="tabela-wrap"><table class="tabela compacta pl-tab"><thead><tr><th>Frota</th><th>Placa</th><th>Status</th><th>Atividade</th><th>Local</th><th>Motorista</th><th>Observação</th><th>Telemetria (Creare)</th>${ed && modo === 'agora' ? '<th></th>' : ''}</tr></thead><tbody>
      ${fs.map(f => `<tr><td data-r="Frota"><b>${esc(f.codigo)}</b><div class="muted">${esc(f.modelo || '')}</div></td><td data-r="Placa">${esc(f.placa || '')}</td>
        <td data-r="Status"><span class="tag ${f.status === 'disponivel' ? 'verde' : f.status === 'manutencao' ? 'vermelho' : 'amarelo'}">${PL_ST[f.status] || f.status}</span>${f.travado ? '<div class="pl-trava">🔒 torre</div>' : ''}</td>
        <td data-r="Atividade"><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${PL_COR[f.atividade] || '#5F7A70'};margin-right:5px"></span>${esc(f.atividade || '—')}</td>
        <td data-r="Local">${esc(f.local || '')}</td><td data-r="Motorista">${esc(f.motorista || '')}</td><td data-r="Observação">${esc(f.observacao || '')}</td>
        <td data-r="Telemetria" class="muted">${f.apontamento ? esc(f.apontamento) : ''}${f.local_creare ? '<br>' + esc(f.local_creare) : ''}${f.posicao_em ? '<br>' + dataHoraBR(f.posicao_em) : ''}</td>
        ${ed && modo === 'agora' ? `<td><button class="btn peq" data-ed="${f.id}">Ajustar</button></td>` : ''}</tr>`).join('')}</tbody></table></div>
      <p class="muted">Sem a trava 🔒, a atividade acompanha o apontamento do motorista no Creare a cada coleta. Com a trava, vale o que a torre definiu até ela destravar.</p></div></div>`;
  const f = $('#pl-f');
  f.modo.onchange = () => { f.em.hidden = f.modo.value !== 'em'; f.de.hidden = f.ate.hidden = f.modo.value !== 'periodo'; };
  f.onsubmit = e => { e.preventDefault(); const d = formDados(f); const p = new URLSearchParams({ modo: d.modo });
    if (d.modo === 'em') p.set('em', d.em); if (d.modo === 'periodo') { p.set('de', d.de); p.set('ate', d.ate); } location.hash = '#/operacao/painel?' + p; };
  let mapa = null; try { mapa = await plMapa($('#pl-mapa'), fs); } catch (e) { $('#pl-mapa-info').textContent = 'Não foi possível carregar o mapa.'; }
  if (modo === 'agora') { const t = setTimeout(() => { if (location.hash.startsWith('#/operacao/painel') && !(new URLSearchParams(location.hash.split('?')[1] || '').get('modo') || '').match(/em|periodo/)) navegar(); }, 300000);
    window.addEventListener('hashchange', () => clearTimeout(t), { once: true }); }
  $$('[data-ed]', tela).forEach(b => b.onclick = async () => { const x = fs.find(y => y.id === b.dataset.ed);
    const r = await modal(`<form><h2>Ajustar ${esc(x.codigo)} · ${esc(x.placa || '')}</h2><div class="form">
      <label class="campo">Status<select name="status">${Object.entries(PL_ST).map(([k, t]) => `<option value="${k}" ${k === x.status ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo">Atividade<select name="atividade"><option value="">—</option>${PL_ATIV.map(a => `<option ${a === x.atividade ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
      <label class="campo">Local<input name="local" list="pl-locais" value="${esc(x.local || '')}"><datalist id="pl-locais">${PL_LOCAIS.map(l => `<option value="${esc(l)}">`).join('')}</datalist></label>
      <label class="campo">Motorista<input name="motorista" value="${esc(x.motorista || '')}"></label>
      <label class="campo largo">Observação<textarea name="observacao" rows="2">${esc(x.observacao || '')}</textarea></label>
      <label class="check largo"><input type="checkbox" name="travado" ${x.travado ? 'checked' : ''}> 🔒 Travar: o apontamento do Creare não muda esta frota até destravar (use para manutenção, sem motorista, sem composição…)</label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`);
    if (!r) return;
    try { await api.rpc('frota_status_salvar', { p_eq: x.id, p: { status: r.status, atividade: r.atividade, local: r.local, motorista: r.motorista, observacao: r.observacao, travado: !!r.travado } });
      aviso('Frota atualizada.'); navegar(); } catch (err) { falha(err); } });
  // exportações
  const nomeBase = `Painel logístico ${quando.replace(/[\/:]/g, '-').replace(/\s+/g, ' ')}`;
  const imagem = async () => { if (!window.html2canvas) await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    return html2canvas($('#pl-painel'), { scale: 2.5, useCORS: true, backgroundColor: '#0B1F19', logging: false }); };
  $$('[data-exp]', tela).forEach(b => b.onclick = () => ocupado(b, async () => { try {
    const t = b.dataset.exp;
    if (t === 'png') { const cv = await imagem(); cv.toBlob(bl => baixarArquivo(bl, nomeBase + '.png'), 'image/png'); }
    else if (t === 'pdf') { const cv = await imagem(); await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      const pdf = new jspdf.jsPDF({ orientation: 'landscape', unit: 'px', format: [cv.width, cv.height] }); pdf.addImage(cv.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, cv.width, cv.height); pdf.save(nomeBase + '.pdf'); }
    else if (t === 'html') { const cv = await imagem(); const img = cv.toDataURL('image/png');
      const linhas = fs.map(x => `<tr><td>${esc(x.codigo)}</td><td>${esc(x.placa || '')}</td><td>${PL_ST[x.status] || ''}</td><td>${esc(x.atividade || '')}</td><td>${esc(x.local || '')}</td><td>${esc(x.motorista || '')}</td><td>${esc(x.observacao || '')}</td></tr>`).join('');
      baixarArquivo(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(nomeBase)}</title><style>body{margin:0;background:#0B1F19;color:#EAF2EE;font-family:Arial,sans-serif;padding:16px}img{max-width:100%;border-radius:12px;display:block;margin:0 auto 16px}table{border-collapse:collapse;width:100%;background:#fff;color:#1d2b27;font-size:13px}th,td{border:1px solid #d9e2de;padding:6px 8px;text-align:left}th{background:#02654D;color:#fff}</style></head><body><img src="${img}" alt="Painel logístico"><table><thead><tr><th>Frota</th><th>Placa</th><th>Status</th><th>Atividade</th><th>Local</th><th>Motorista</th><th>Observação</th></tr></thead><tbody>${linhas}</tbody></table></body></html>`, nomeBase + '.html', 'text/html'); }
    else if (t === 'xlsx') { await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'); const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Painel logístico · status da frota'], [per ? 'Período' : 'Situação em', quando], [],
        ['Indicador', 'Frotas', '% da frota'], ...[['Total de frotas operacionais', c.total], ['Frotas disponíveis', c.disp], ['Em trânsito carregado', c.carregado], ['Em trânsito vazio', c.vazio], ['No horto', c.horto], ['Na fábrica', c.fabrica],
          ['Corretiva', c.corretiva], ['Preventiva', c.preventiva], ['Inspeção', c.inspecao], ['SOS', c.sos], ['Aguardando nota', c.nota], ['Sem motorista', c.semMot], ['Sem composição', c.semComp], ['Sem cavalo', c.semCav],
          ['Operando', c.operando], ['Manutenção', c.man], ['Disponível', c.disp], ['Indisponível', c.indisp]].map(([k, v]) => [k, v, plPct(v, c.total) / 100])]), 'Indicadores');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fs.map(x => ({ Frota: x.codigo, Placa: x.placa, Modelo: x.modelo, Status: PL_ST[x.status] || x.status, Atividade: x.atividade, Local: x.local, Motorista: x.motorista,
        'Observação': x.observacao, 'Apontamento (Creare)': x.apontamento, 'Local (Creare)': x.local_creare, Latitude: x.lat, Longitude: x.lng, 'Leitura': x.posicao_em ? dataHoraBR(x.posicao_em) : '', 'Travado pela torre': x.travado ? 'Sim' : '' }))), 'Frotas');
      if (per) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Atividade', 'Horas'], ...Object.entries(per.por_atividade || {}), [], ['Status', 'Horas'], ...Object.entries(per.por_status || {}).map(([k, v]) => [PL_ST[k] || k, v])]), 'Horas no período');
      if (per || modo === 'em') { const h = await api.listar('frota_status_hist', `em=gte.${new Date(per ? ini : em).toISOString()}&em=lte.${new Date(per ? fim : em).toISOString()}&order=em&select=em,status,atividade,local,motorista,observacao,lat,lng,apontamento,origem,eq:equipamentos(codigo_frota)`).catch(() => []);
        if (h.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(h.map(x => ({ 'Data/hora': dataHoraBR(x.em), Frota: x.eq?.codigo_frota, Status: PL_ST[x.status] || x.status, Atividade: x.atividade, Local: x.local, Motorista: x.motorista, 'Observação': x.observacao, Apontamento: x.apontamento, Origem: x.origem, Latitude: x.lat, Longitude: x.lng }))), 'Histórico'); }
      XLSX.writeFile(wb, nomeBase + '.xlsx'); }
  } catch (err) { falha(err); } }));
  void mapa;
});
