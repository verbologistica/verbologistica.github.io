// Verbo Gestão — Painel Logístico · Status da frota (hora a hora)
// Situação atual (Creare + ajustes da torre), foto de qualquer data/hora, ocupação por período e exportação (imagem, PDF, HTML, Excel)
const PL_ATIV = ['Trânsito Vazio', 'Trânsito Carregado', 'No Horto', 'Na Fábrica', 'Aguardando Nota', 'Cadastro na Balança', 'Falta Cadastro Ticket LOG', 'Mobilização',
  'Sem Apontamento', 'Troca de Turno', 'Prancha', 'Corretiva', 'Preventiva', 'Inspeção', 'SOS', 'Sem Motorista', 'Sem Composição', 'Sem Cavalo'];
const PL_LOCAIS = ['Trajeto', 'Horto', 'Fábrica', 'Aguardando nota', 'P.A verbo', 'Posto Base', 'Posto Bracell', 'Lavador', 'Granfer', 'Aoki', 'Betel', 'Cemavi', 'Termac',
  'Creare', 'Desamarração', 'Estimulação', 'Instalação de rádio', 'Mobilização', 'Trânsito'];
const PL_ST = { disponivel: 'Disponível', manutencao: 'Manutenção', indisponivel: 'Indisponível' };
const PL_COR = { 'Trânsito Vazio': '#DDA936', 'Trânsito Carregado': '#2BB673', 'No Horto': '#6FCF97', 'Na Fábrica': '#56A8E8', 'Aguardando Nota': '#9AA5B1',
  'Cadastro na Balança': '#B39DDB', 'Falta Cadastro Ticket LOG': '#C5A3FF', 'Mobilização': '#4DD0E1', 'Troca de Turno': '#F5D76E', 'Prancha': '#A1887F',
  'Corretiva': '#F2994A', 'Preventiva': '#E2B93B', 'Inspeção': '#9B7BEA', 'SOS': '#EB5757', 'Sem Motorista': '#CFD8DC', 'Sem Composição': '#E57373',
  'Sem Cavalo': '#8D6E63', 'Sem Apontamento': '#EB5757', 'Outros / sem atividade': '#5F7A70' };
const PL_PONTO_COR = { origem: '#8E44AD', apoio: '#FFFFFF', destino: '#2F80ED' };
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
.pl-l4 .pl-c h3{font-size:11.5px;letter-spacing:.6px;gap:6px}.pl-l4 .pl-c h3 svg{width:16px;height:16px}.pl-l4 .pl-c{padding:12px 10px 12px 14px}
.pl-l2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.pl-l4{display:grid;grid-template-columns:repeat(auto-fit,minmax(122px,1fr));gap:12px}
.pl-c h3{flex-wrap:wrap;overflow-wrap:anywhere;line-height:1.25}.pl-l4 .pl-c h3{letter-spacing:.3px}.pl-m span{overflow-wrap:anywhere;line-height:1.2;letter-spacing:.5px}
#pl-flutua{position:fixed;z-index:9999;pointer-events:none;background:#fff;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.28);max-width:min(340px,92vw)}#pl-flutua[hidden]{display:none}
.pl-cmp{display:grid;grid-template-columns:auto 1fr;gap:3px 8px;margin:6px 0;padding:6px 8px;background:#F3F6F4;border-radius:6px}.pl-cmp small{font-size:10px;color:#5F7A70;text-transform:uppercase;letter-spacing:.4px;align-self:center}
.pl-sel{display:inline-block;padding:1px 7px;border-radius:9px;font-size:10.5px;font-weight:700;color:#fff}.pl-sel.ok{background:#2BB673}.pl-sel.div{background:#F2994A}.pl-sel.nao{background:#EB5757}.pl-sel.na{background:#9AA5B1}
.pl-sa{display:flex;flex-wrap:wrap;align-items:center;gap:10px 22px;margin-top:14px;padding:12px 16px;border-radius:12px;background:rgba(235,87,87,.12);border:1px solid rgba(235,87,87,.35);font-size:13px;color:#EAF2EE}.pl-sa b{font-size:20px;color:#fff;margin-right:4px}.pl-sa h4{margin:0;font-size:12px;letter-spacing:2px;color:#F2A3A3}
.pl-l2x{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px}.pl-mini{display:flex;flex-direction:column;gap:8px}
.pl-m{display:flex;align-items:center;gap:10px;background:var(--pl-card);border:1px solid rgba(255,255,255,.07);border-left:3px solid var(--cor,#9FB8AE);border-radius:10px;padding:9px 12px;font-size:12px;font-weight:700;letter-spacing:1px}
.pl-m svg{width:17px;height:17px;color:var(--cor,#9FB8AE)}.pl-m span{flex:1}.pl-m b{font-size:20px}
.pl-visao h4{display:flex;align-items:center;gap:12px;margin:4px 0 12px;font-size:13px;letter-spacing:3px;color:var(--pl-ouro)}.pl-visao h4:after{content:"";flex:1;height:1px;background:rgba(221,169,54,.3)}
.pl-pct{font-size:12px;letter-spacing:2.5px;color:var(--pl-sub);border-top:1px solid rgba(255,255,255,.1);margin-top:10px;padding-top:8px;text-align:center}.pl-pct b{color:#fff;font-size:15px;letter-spacing:0;margin-right:4px}
.pl-mapa{height:340px;border-radius:12px;overflow:hidden;border:1px solid rgba(221,169,54,.25);background:#0E2520;margin-top:10px}.pl-sub{font-size:12px;color:var(--pl-sub);margin:4px 0 0 30px}
.pl-leg{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:11.5px;color:#DCE8E3;margin-top:8px}.pl-leg i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px;vertical-align:-1px}
.pl-donut{display:flex;align-items:center;gap:14px;margin-top:10px;flex-wrap:wrap}.pl-donut svg{width:150px;height:150px;flex:none}.pl-donut ul{list-style:none;margin:0;padding:0;font-size:12px;flex:1;min-width:140px}
.pl-donut li{display:flex;align-items:center;gap:6px;margin:3px 0}.pl-donut li i{width:10px;height:10px;border-radius:3px;flex:none}.pl-donut li b{margin-left:auto}
body.pl-largo .conteudo{max-width:none}.pl-abas{margin:4px 0 12px}
.pl-hub{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin:4px 0 12px}.pl-hub .pl-abas{margin:0;flex:1;min-width:0}
.pl-chk{display:flex;align-items:center;gap:8px;font-weight:600;margin:6px 0;cursor:pointer}.pl-chk input{width:18px;height:18px;min-height:0;margin:0;flex:none;accent-color:#0b6b4f}
.pl-gerando{position:fixed;inset:0;z-index:9999;background:rgba(6,20,16,.72);display:flex;align-items:center;justify-content:center}.pl-gerando div{background:#fff;border-radius:14px;padding:22px 28px;display:flex;flex-direction:column;gap:6px;min-width:260px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.3)}.pl-gerando b{font-size:17px}.pl-gerando span{color:#5F7A70}
.pl-cam{position:relative}.pl-cam svg{display:block;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}.pl-cam .pl-rot{position:absolute;top:40px;left:50%;transform:translateX(-50%)}
.pl-tt{padding:0;border-radius:10px;border:0;box-shadow:0 6px 18px rgba(0,0,0,.25)}.pl-dica{padding:9px 11px;font:12px/1.45 Arial,sans-serif;color:#1d2b27;min-width:220px;max-width:300px;white-space:normal}.pl-dica b{color:#0B1F19}.pl-dica svg{width:12px;height:12px;vertical-align:-2px;margin-right:4px}.pl-dica i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px}.pl-dica-ap{margin:5px 0;padding:5px 7px;background:#F3F6F4;border-left:3px solid #DDA936;border-radius:4px}.pl-dica-ap small{display:block;font-size:10px;color:#5F7A70;text-transform:uppercase;letter-spacing:.4px}.pl-dica-ap span{color:#5F7A70;font-size:11px}
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
    corretiva: at('Corretiva'), preventiva: at('Preventiva'), inspecao: at('Inspeção'), sos: at('SOS'), nota: at('Aguardando Nota'), semMot: at('Sem Motorista'), semComp: at('Sem Composição'), semCav: at('Sem Cavalo'), semApont: at('Sem Apontamento') };
  c.operando = c.carregado + c.vazio + c.horto + c.fabrica + c.semApont; void loc; return c;
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

function plHtml(fs, c, quando, per, sa = []) {
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
      <div class="pl-c" style="--cor:#DDA936"><h3>${PL_IC.pino}Corredor operacional</h3><div class="pl-sub">${PL_PONTOS.map(p => esc(p[0])).join(' · ')}</div>
        <div class="pl-mapa" id="pl-mapa"></div>
        <div class="pl-leg"><span><i style="background:#2BB673;border:2px solid #fff"></i>Ignição ligada</span><span><i style="background:#9AA5B1;border:2px solid #fff"></i>Ignição desligada</span><span><b style="color:#2BB673">━━</b> rastro carregado (indo descarregar)</span><span><b style="color:#56A8E8">┅┅</b> rastro vazio (indo carregar)</span></div>
        <div class="pl-per" id="pl-mapa-info"></div></div>
      <div class="pl-c" style="--cor:#DDA936;flex:1"><h3>${PL_IC.pizza}Ocupação da frota</h3><div class="pl-sub">${per ? 'Horas por atividade no período' : 'Distribuição por atividade'}</div>${plDonut(dist)}</div>
    </div></div>${plFaixaSA(fs, sa)}</div>`;
}
const plH = h => { const m = Math.round((+h || 0) * 60); return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`; };
const PL_SA_SIT = { em_aberto: ['Em aberto · aguardando apontamento', 'vermelho'], pendente: ['Encerrado · falta justificativa da torre', 'amarelo'], justificado: ['Justificado', 'verde'], curto: ['Curto', ''] };
function plFaixaSA(fs, sa) {
  const agora = fs.filter(f => f.posicao_em && plSemApont(f)).length, div = fs.filter(f => plConfere(f)[0] === 'div').length;
  const horas = sa.reduce((t, x) => t + (+x.horas || 0), 0), n = k => sa.filter(x => x.situacao === k).length;
  const carga = fs.filter(f => plCarga(f).al.length).length;
  return `<div class="pl-sa"><h4>APONTAMENTO MOTORISTA × TELEMETRIA</h4><span><b>${agora}</b>frota(s) sem apontamento agora</span><span><b>${div}</b>divergente(s)</span>${carga ? `<span><b>${carga}</b>carga apontada errada</span>` : ''}
    <span><b>${plH(horas)}</b>sem apontamento (≥ 15 min)</span><span><b>${n('em_aberto')}</b>em aberto</span><span><b>${n('pendente')}</b>encerrado(s) sem justificativa</span><span><b>${n('justificado')}</b>justificado(s)</span></div>`;
}

// ---------- mapa: ruas / satélite / escuro, caminhão por frota, cercas (KML) e rastro ----------
const PL_BASES = {
  'Ruas': ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'],
  'Satélite': ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
    'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],
  'Escuro': ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}']
};
const PL_RESP = { motorista: 'Motorista (não apontou)', creare: 'Problema no Creare / computador de bordo', outro: 'Outro motivo' };
const PL_CERCA_COR = { cerca: '#2F80ED', fazenda: '#2BB673', fabrica: '#56A8E8', posto: '#F2994A', apoio: '#DDA936', outro: '#9B7BEA' };
const plLigado = f => /LIGADO/i.test(f.estado || f.ignicao || '') && !/DESLIGADO/i.test(f.estado || f.ignicao || '');
const plAndando = f => /ANDANDO/i.test(f.estado || '') || (+f.vel || 0) > 3;
const plAtivTxt = t => { t = String(t || ''); return !t || /n[ãa]o apontado/i.test(t) ? null : /desloc.*vazio|vazio/i.test(t) ? 'Trânsito Vazio' : /desloc.*carreg|carregado/i.test(t) ? 'Trânsito Carregado' : /desloc|tr[aâ]nsito|viagem/i.test(t) ? 'Deslocamento'
  : /aguard.*nota|nota fiscal/i.test(t) ? 'Aguardando Nota' : /fila/i.test(t) ? 'Fila' : /carregamento|carregando/i.test(t) ? 'Carregando' : /descarga|descarreg/i.test(t) ? 'Descarga'
  : /manuten|corretiv|preventiv|mec[aâ]nic|pneu|socorro/i.test(t) ? 'Manutenção' : /parad|refei|almo|descanso|pernoite|turno/i.test(t) ? 'Parada' : null; };
const plSemApont = f => !String(f.apontamento || '').trim() || /n[ãa]o apontado/i.test(f.apontamento);
const plConfere = f => { if (!f.posicao_em) return ['na', 'Sem leitura'];
  if (plSemApont(f)) return ['nao', 'Não apontado'];
  const a = plAtivTxt(f.apontamento), t = plAtivTxt(f.grupo);
  return !a || !t ? ['na', 'Conferir'] : a === t || (a === 'Deslocamento' && /^Trânsito/.test(t)) || (t === 'Deslocamento' && /^Trânsito/.test(a)) ? ['ok', 'Confere'] : ['div', 'Divergente']; };
const plCorFrota = f => PL_COR[f.atividade] || '#5F7A70';
const plApont = f => { const a = (f.apontamento || '').trim().replace(/\s*-\s*$/, ''); return !a ? 'Sem apontamento' : /^\d+$/.test(a) ? `Código ${a} (sem descrição no Creare)` : a; };
// carga real (sequência carregamento → descarga do E09) × declarada pelo motorista (código terminado em 1 = vazio, 2 = carregado) e sentido pelo rastro
const plDistKm = (a, b) => { const r = Math.PI / 180, x = Math.sin((b[0] - a[0]) * r / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin((b[1] - a[1]) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
const plPonto = t => { const p = PL_PONTOS.find(x => x[3] === t); return p ? { nome: String(p[0]).split(/ \(| ·/)[0].trim(), ll: [p[1], p[2]] } : null; };
function plSentido(f, r) { const o = plPonto('origem'), d = plPonto('destino'); if (!o || !d || !r || r.length < 2 || f.lat == null) return null;
  const a = r[Math.max(0, r.length - 4)], b = [+f.lat, +f.lng], dv = plDistKm(b, o.ll) - plDistKm(a, o.ll); if (Math.abs(dv) < 3) return null;
  return dv < 0 ? { para: 'origem', nome: o.nome } : { para: 'destino', nome: d.nome }; }
function plCarga(f) { const c = f.carga || {}, real = c.carregado == null ? null : c.carregado ? 'carregado' : 'vazio', s = f.sentido, al = [];
  if (real && c.declarado && c.declarado !== real) al.push(`motorista apontando ${c.declarado.toUpperCase()}, mas ${real === 'carregado' ? 'carregou' : 'descarregou'} em ${dataHoraBR(c.op_em)}`);
  if (real && s && plAndando(f) && ((real === 'carregado') !== (s.para === 'destino'))) al.push(`${real} indo para ${s.nome}: conferir`);
  const txt = real ? `${real.toUpperCase()}${s && plAndando(f) ? ' → ' + s.nome : ''}` : '';
  return { real, txt, al, cor: real === 'carregado' ? '#2BB673' : real === 'vazio' ? '#56A8E8' : '#9AA5B1', desde: c.op_em ? `${c.op === 'carregamento' ? 'carregou' : 'descarregou'} em ${dataHoraBR(c.op_em)}` : '' }; }
const plMov = f => !(f.estado || f.ignicao) ? 'Sem leitura de ignição' : plLigado(f) ? (plAndando(f) ? `Ignição ligada · em movimento · ${Math.round(+f.vel || 0)} km/h` : 'Ignição ligada · parado') : 'Ignição desligada · parado';
// frente de caminhão (cabine, para-brisa, grade, faróis, para-choque) + selo de ignição
function plCaminhaoSvg(f, px = 38) {
  const cor = plCorFrota(f), on = plLigado(f), anda = plAndando(f);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 40 40">
    <circle cx="19" cy="21" r="16.5" fill="${cor}" stroke="#fff" stroke-width="2.5"/>
    <rect x="10" y="10" width="18" height="18" rx="3.2" fill="#fff"/>
    <rect x="12" y="12" width="14" height="6.6" rx="1.6" fill="#1F3A33"/>
    <rect x="15.2" y="20.2" width="7.6" height="4.6" rx=".9" fill="#1F3A33"/><path d="M16.4 21.6h5.2M16.4 23.4h5.2" stroke="#fff" stroke-width=".8"/>
    <circle cx="12.9" cy="22.5" r="1.5" fill="#F2C94C"/><circle cx="25.1" cy="22.5" r="1.5" fill="#F2C94C"/>
    <rect x="9" y="26" width="20" height="2.8" rx="1.1" fill="#1F3A33"/>
    <rect x="11" y="28.6" width="3.6" height="3.4" rx="1" fill="#1F3A33"/><rect x="23.4" y="28.6" width="3.6" height="3.4" rx="1" fill="#1F3A33"/>
    <circle cx="32" cy="8" r="6" fill="${on ? '#2BB673' : '#9AA5B1'}" stroke="#fff" stroke-width="2"/>
    ${anda ? '<path d="M29.6 5.4 34.8 8l-5.2 2.6z" fill="#fff"/>' : on ? '<circle cx="32" cy="8" r="2" fill="#fff"/>' : '<path d="M29.8 8h4.4" stroke="#fff" stroke-width="1.8"/>'}
  </svg>`;
}
// hora da última leitura do Creare (relé minuto a minuto na aba do Creare + coletas agendadas)
const plLeitura = l => { if (!l || !l.lido_em) return '<span class="muted">Leitura do Creare: —</span>';
  const d = new Date(l.lido_em), min = Math.round((Date.now() - d) / 60000), hm = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return min > 5 ? `<b style="color:#C0392B">⚠ Leitura do Creare: ${hm} (há ${min} min) — verifique se o Creare está logado no navegador do Claude</b>`
    : `<span class="muted">Leitura do Creare: <b>${hm}</b> · tela atualiza a cada 1 min</span>`; };
const plDica = f => `<div class="pl-dica"><b>${esc(f.codigo)}</b> · ${esc(f.placa || '')}${f.motorista ? `<div>${PL_IC.pessoa}${esc(f.motorista)}</div>` : ''}
  <div class="pl-cmp"><small>Apontamento motorista</small><span><b>${esc(plApont(f))}</b>${f.apont_desde ? ` <span class="muted">desde ${dataHoraBR(f.apont_desde)}</span>` : ''}</span>
    <small>Telemetria</small><span>${esc(f.grupo || '—')}</span><small>Confronto</small><span><span class="pl-sel ${plConfere(f)[0]}">${plConfere(f)[1]}</span></span></div>
  <div><i style="background:${plLigado(f) ? '#2BB673' : '#9AA5B1'}"></i>${esc(plMov(f))}</div>
  <div>Atividade no painel: <b>${esc(f.atividade || '—')}</b></div>
  ${(k => k.real ? `<div>Carga: <b style="color:${k.cor}">${esc(k.txt)}</b> <span class="muted">(${esc(k.desde)})</span></div>${k.al.map(a => `<div style="color:#F2994A"><b>⚠ ${esc(a)}</b></div>`).join('')}` : '')(plCarga(f))}
  ${f.endereco || f.local_creare ? `<div class="muted">${esc(f.endereco || f.local_creare)}</div>` : ''}${f.posicao_em ? `<div class="muted">Leitura ${dataHoraBR(f.posicao_em)}</div>` : ''}</div>`;

async function plRastros(modo, em, ini, fim) {
  const ate = modo === 'periodo' && fim ? new Date(fim) : modo === 'em' && em ? new Date(em) : new Date();
  const de = modo === 'periodo' && ini ? new Date(ini) : new Date(ate.getTime() - 12 * 36e5);
  const h = await api.listar('frota_status_hist', `em=gte.${de.toISOString()}&em=lte.${ate.toISOString()}&lat=not.is.null&select=em,equipamento_id,lat,lng&order=em&limit=5000`).catch(() => []);
  const r = {}; h.forEach(x => { const a = (r[x.equipamento_id] ||= []); const u = a[a.length - 1]; if (!u || u[0] !== +x.lat || u[1] !== +x.lng) a.push([+x.lat, +x.lng]); });
  return r;
}

function plKml(txt) {
  const x = new DOMParser().parseFromString(txt, 'text/xml'), out = [];
  [...x.getElementsByTagName('Placemark')].forEach(pm => {
    const nome = (pm.getElementsByTagName('name')[0]?.textContent || '').trim() || 'Cerca';
    const coords = el => el.textContent.trim().split(/\s+/).map(c => c.split(',').map(Number)).filter(c => c.length >= 2 && !isNaN(c[0]) && !isNaN(c[1])).map(([lo, la]) => [+la.toFixed(6), +lo.toFixed(6)]);
    const polys = [...pm.getElementsByTagName('outerBoundaryIs')].map(o => coords(o.getElementsByTagName('coordinates')[0])).filter(p => p.length > 2);
    const linhas = [...pm.getElementsByTagName('LineString')].map(o => coords(o.getElementsByTagName('coordinates')[0])).filter(p => p.length > 2);
    const pts = [...pm.getElementsByTagName('Point')].map(o => coords(o.getElementsByTagName('coordinates')[0])).filter(p => p.length);
    if (polys.length || linhas.length) out.push({ nome, poligonos: [...polys, ...linhas] });
    else if (pts.length) out.push({ nome, poligonos: [pts[0]] });
  });
  return out;
}

function plFlutua(html, ev) {
  let d = document.getElementById('pl-flutua'); if (!d) { d = document.createElement('div'); d.id = 'pl-flutua'; d.hidden = true; document.body.append(d); }
  if (html === false) { d.hidden = true; return; } if (html) { d.innerHTML = html; d.hidden = false; } if (!ev || d.hidden) return;
  const w = d.offsetWidth, h = d.offsetHeight, vw = innerWidth, vh = innerHeight;
  let x = ev.clientX + 16, y = ev.clientY - h - 12; if (x + w > vw - 8) x = ev.clientX - w - 16; if (x < 8) x = 8; if (y < 8) y = Math.min(ev.clientY + 18, vh - h - 8);
  d.style.left = x + 'px'; d.style.top = y + 'px';
}
async function plMapa(el, fs, cercas, rastros) {
  if (!window.L) { document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">'); await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'); }
  const m = L.map(el, { zoomControl: true, attributionControl: false });
  let guardado = 'Ruas'; try { guardado = localStorage.getItem('pl-base') || 'Ruas'; } catch (e) { }
  if (!PL_BASES[guardado]) guardado = 'Ruas';
  const bases = Object.fromEntries(Object.entries(PL_BASES).map(([n, us]) => [n, L.layerGroup(us.map(u => L.tileLayer(u, { maxZoom: 18, crossOrigin: 'anonymous' })))]));
  bases[guardado].addTo(m); m._plBase = guardado;
  m.on('baselayerchange', e => { m._plBase = e.name; try { localStorage.setItem('pl-base', e.name); } catch (er) { } });
  const gCercas = L.layerGroup(), gRastro = L.layerGroup(), gFrotas = L.layerGroup();
  (cercas || []).forEach(c => { const cor = c.cor || PL_CERCA_COR[c.tipo] || '#2F80ED';
    (c.poligonos || []).forEach(p => { if (p.length > 2) L.polygon(p, { color: cor, weight: 2, fillColor: cor, fillOpacity: .14 }).bindTooltip(esc(c.nome), { sticky: true }).addTo(gCercas);
      else if (p.length === 1) L.circleMarker(p[0], { radius: 6, color: '#fff', weight: 2, fillColor: cor, fillOpacity: 1 }).bindTooltip(esc(c.nome)).addTo(gCercas); }); });
  const pts = PL_PONTOS.map(p => [p[1], p[2]]);
  L.polyline(pts, { color: '#37474F', weight: 3, opacity: .75, dashArray: '8 8' }).addTo(m);
  PL_PONTOS.forEach(([n, la, lo, t]) => L.circleMarker([la, lo], { radius: 7, color: '#0B1F19', weight: 2, fillColor: PL_PONTO_COR[t] || '#fff', fillOpacity: 1 }).bindTooltip(n).addTo(m));
  const com = fs.filter(f => f.lat != null && f.lng != null), b = L.latLngBounds(pts);
  com.forEach(f => { const r = (rastros || {})[f.id], k = plCarga(f); if (r && r.length > 1) L.polyline(r, { color: k.real ? k.cor : plCorFrota(f), weight: 4, opacity: .85, dashArray: k.real === 'vazio' ? '7 7' : null }).addTo(gRastro); });
  com.forEach(f => {
    L.marker([f.lat, f.lng], { icon: L.divIcon({ className: 'pl-cam', html: plCaminhaoSvg(f) + `<span class="pl-rot">${esc(f.codigo)}${plAndando(f) ? ' · ' + Math.round(+f.vel || 0) + ' km/h' : ''}${(k => k.real ? `<em style="display:block;font-style:normal;color:${k.cor}">${k.al.length ? '⚠ ' : ''}${esc(k.txt)}</em>` : '')(plCarga(f))}</span>`, iconSize: [38, 38], iconAnchor: [19, 21] }) })
      .on('mouseover click', e => plFlutua(plDica(f), e.originalEvent)).on('mousemove', e => plFlutua(null, e.originalEvent)).on('mouseout', () => plFlutua(false)).addTo(gFrotas);
    b.extend([f.lat, f.lng]); });
  gCercas.addTo(m); gRastro.addTo(m); gFrotas.addTo(m);
  L.control.layers(bases, { 'Cercas': gCercas, 'Rastro (últimas horas)': gRastro, 'Frotas': gFrotas }, { position: 'topright', collapsed: true }).addTo(m);
  m.fitBounds(b.pad(0.12));
  m._pl = { fs: com, cercas: cercas || [], rastros: rastros || {}, grupos: { gCercas, gRastro, gFrotas } };
  const ult = com.map(f => f.posicao_em).filter(Boolean).sort().pop();
  $('#pl-mapa-info').textContent = (com.length ? `${com.length} frota(s) com posição da telemetria${ult ? ' · última leitura ' + dataHoraBR(ult) : ''}` : 'Ainda sem posição da telemetria para as frotas.')
    + ((cercas || []).length ? ` · ${cercas.length} cerca(s)` : '');
  return m;
}

// desenha o mapa exatamente como está na tela (camada, zoom e enquadramento) num canvas, com rótulos fixos para imagem/PDF
// mapa para imagem/PDF: enquadra todas as frotas e o corredor num tamanho fixo (independe do zoom/tamanho da tela);
// no mapa vão só o caminhão e o código; os detalhes saem na tabela ao lado (sem sobreposição)
async function plMapaImagem(m, escala = 2, W = 1000, H = 560) {
  const crs = L.CRS.EPSG3857, vis = m._pl.grupos, frotas = m.hasLayer(vis.gFrotas) ? m._pl.fs : [];
  const pts = [...PL_PONTOS.map(p => L.latLng(p[1], p[2])), ...frotas.map(f => L.latLng(f.lat, f.lng))];
  if (m.hasLayer(vis.gRastro)) frotas.forEach(f => (m._pl.rastros[f.id] || []).forEach(q => pts.push(L.latLng(q[0], q[1]))));
  const b = L.latLngBounds(pts); let z = 12;
  for (; z > 3; z--) { const a = crs.latLngToPoint(b.getNorthWest(), z), c = crs.latLngToPoint(b.getSouthEast(), z); if (c.x - a.x <= W - 140 && c.y - a.y <= H - 110) break; }
  const ctr = crs.latLngToPoint(b.getCenter(), z), o = L.point(ctr.x - W / 2, ctr.y - H / 2);
  const cv = document.createElement('canvas'); cv.width = W * escala; cv.height = H * escala;
  const g = cv.getContext('2d'); g.scale(escala, escala); g.fillStyle = '#dfe6e3'; g.fillRect(0, 0, W, H);
  const carrega = src => new Promise(ok => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; setTimeout(() => ok(null), 15000); });
  const n = 2 ** z, x0 = Math.floor(o.x / 256), x1 = Math.floor((o.x + W) / 256), y0 = Math.floor(o.y / 256), y1 = Math.floor((o.y + H) / 256);
  for (const u of PL_BASES[m._plBase] || PL_BASES.Ruas) {
    const ts = []; for (let x = x0; x <= x1; x++) for (let y = Math.max(0, y0); y <= Math.min(n - 1, y1); y++) ts.push({ x, y });
    const imgs = await Promise.all(ts.map(t => carrega(u.replace('{z}', z).replace('{y}', t.y).replace('{x}', ((t.x % n) + n) % n))));
    imgs.forEach((im, k) => { if (im) g.drawImage(im, ts[k].x * 256 - o.x, ts[k].y * 256 - o.y, 256, 256); });
  }
  const P = ll => { const p = crs.latLngToPoint(L.latLng(ll), z); return [p.x - o.x, p.y - o.y]; };
  const linha = (ps, cor, larg, tr = []) => { if (ps.length < 2) return; g.save(); g.setLineDash(tr); g.strokeStyle = cor; g.lineWidth = larg; g.lineJoin = g.lineCap = 'round'; g.beginPath(); ps.map(P).forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); g.restore(); };
  const rot = (txt, x, y, fundo, cor, fonte = '700 13px Arial') => { g.font = fonte; const w = g.measureText(txt).width + 12; g.save(); g.shadowColor = 'rgba(0,0,0,.3)'; g.shadowBlur = 4; g.fillStyle = fundo;
    g.beginPath(); g.roundRect ? g.roundRect(x - w / 2, y, w, 20, 6) : g.rect(x - w / 2, y, w, 20); g.fill(); g.restore(); g.fillStyle = cor; g.textAlign = 'center'; g.fillText(txt, x, y + 14.5); g.textAlign = 'left'; };
  if (m.hasLayer(vis.gCercas)) m._pl.cercas.forEach(c => { const cor = c.cor || PL_CERCA_COR[c.tipo] || '#2F80ED';
    (c.poligonos || []).forEach(p => { if (p.length > 2) { g.save(); g.beginPath(); p.map(P).forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.globalAlpha = .16; g.fillStyle = cor; g.fill(); g.globalAlpha = 1; g.strokeStyle = cor; g.lineWidth = 2; g.stroke(); g.restore(); } }); });
  linha(PL_PONTOS.map(p => [p[1], p[2]]), '#37474F', 3.5, [9, 8]);
  if (m.hasLayer(vis.gRastro)) frotas.forEach(f => { const k = plCarga(f); linha(m._pl.rastros[f.id] || [], k.real ? k.cor : plCorFrota(f), 5, k.real === 'vazio' ? [10, 8] : []); });
  PL_PONTOS.forEach(([nm, la, lo, t]) => { const [x, y] = P([la, lo]); g.beginPath(); g.arc(x, y, 8, 0, 7); g.fillStyle = PL_PONTO_COR[t] || '#fff'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = '#0B1F19'; g.stroke();
    g.font = '700 13px Arial'; g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,.95)'; g.strokeText(nm, x + 12, y - 10); g.fillStyle = '#0B1F19'; g.fillText(nm, x + 12, y - 10); });
  const usados = [];
  for (const f of frotas) {
    let [x, y] = P([f.lat, f.lng]);
    for (let k = 0; k < 6 && usados.some(([a, c]) => Math.abs(a - x) < 46 && Math.abs(c - y) < 46); k++) x += 48;   // afasta caminhões no mesmo ponto
    usados.push([x, y]);
    const im = await carrega('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(plCaminhaoSvg(f, 96))); if (im) g.drawImage(im, x - 24, y - 26, 48, 48);
    const cf = plConfere(f)[0];
    rot(f.codigo, x, y + 24, { ok: '#1E8E57', div: '#D9822B', nao: '#D64545', na: '#0B1F19' }[cf], '#fff');
    const k = plCarga(f); if (k.real) rot((k.al.length ? '⚠ ' : '') + k.txt, x, y + 46, k.cor, '#fff', '700 12px Arial');
  }
  g.font = '11px Arial'; const at = 'Mapa: Esri · Telemetria: Creare'; const aw = g.measureText(at).width; g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(W - aw - 10, H - 16, aw + 10, 16); g.fillStyle = '#333'; g.fillText(at, W - aw - 5, H - 5);
  return cv.toDataURL('image/png');
}
// tabela que acompanha o mapa na imagem/PDF
const plTabTratativa = (sa, rot) => { const td = 'padding:6px;background:transparent;color:#EAF2EE;border:0;vertical-align:top', th = 'padding:6px;background:transparent;color:#DDA936;border:0;text-align:left';
  const cor = { em_aberto: '#D64545', pendente: '#D9822B', justificado: '#1E8E57' };
  return `<div class="pl-visao" style="margin-top:18px"><h4>TRATATIVA DA TORRE · SEM APONTAMENTO ≥ 15 MIN <span style="color:#9FB8AE;font-weight:400">${esc(rot)}</span></h4>
    ${sa.length ? `<table style="width:100%;border-collapse:collapse;margin-top:8px;font:13px/1.35 Arial,sans-serif;color:#EAF2EE"><thead><tr style="font-size:11px;letter-spacing:1px"><th style="${th}">FROTA</th><th style="${th}">MOTORISTA</th><th style="${th}">PERÍODO</th><th style="${th}">TEMPO</th><th style="${th}">SITUAÇÃO</th><th style="${th}">TRATATIVA</th></tr></thead><tbody>
    ${sa.map(x => { const j = x.justificativa; return `<tr style="border-top:1px solid rgba(255,255,255,.12)"><td style="${td}"><b>${esc(x.codigo)}</b></td><td style="${td}">${esc(x.motorista || '—')}</td>
      <td style="${td}">${dataHoraBR(x.inicio)} → ${x.em_aberto ? 'em aberto' : dataHoraBR(x.fim)}</td><td style="${td}"><b>${plH(x.horas)}</b></td>
      <td style="${td}"><span style="background:${cor[x.situacao] || '#5F7A70'};color:#fff;border-radius:9px;padding:2px 8px;font-weight:700;font-size:11px;white-space:nowrap">${(PL_SA_SIT[x.situacao] || [x.situacao])[0]}</span></td>
      <td style="${td}">${j ? `<b>${esc(PL_RESP[j.responsabilidade] || j.responsabilidade)}</b> · ${esc(j.explicacao || '')}${j.contato_motorista ? ' · contato com o motorista' + (j.contato_em ? ' em ' + dataHoraBR(j.contato_em) : '') : ''}${j.chamado_creare ? ' · chamado Creare ' + esc(j.chamado_creare) : ''}` : '<span style="color:#F2994A">Sem justificativa da torre</span>'}</td></tr>`; }).join('')}</tbody></table>`
    : '<div style="color:#9FB8AE;margin-top:6px">Nenhum período sem apontamento de 15 min ou mais.</div>'}</div>`; };
const plTabMapa = fs => { const c = fs.filter(f => f.posicao_em); if (!c.length) return '';
  const cor = { ok: '#2BB673', div: '#F2994A', nao: '#EB5757', na: '#9AA5B1' };
  return `<table style="width:100%;border-collapse:collapse;margin-top:10px;font:13px/1.35 Arial,sans-serif;color:#EAF2EE"><thead><tr style="color:#DDA936;font-size:11px;letter-spacing:1px;text-align:left;background:transparent">
    <th style="padding:6px;background:transparent;color:#DDA936;border:0">FROTA</th><th style="padding:6px;background:transparent;color:#DDA936;border:0">MOTORISTA</th><th style="padding:6px;background:transparent;color:#DDA936;border:0">APONTAMENTO MOTORISTA</th><th style="padding:6px;background:transparent;color:#DDA936;border:0">TELEMETRIA</th><th style="padding:6px;background:transparent;color:#DDA936;border:0">CONFRONTO</th><th style="padding:6px;background:transparent;color:#DDA936;border:0">IGNIÇÃO / MOVIMENTO</th></tr></thead><tbody>
    ${c.map(f => { const [k, t] = plConfere(f); return `<tr style="border-top:1px solid rgba(255,255,255,.12)"><td style="padding:6px;background:transparent;color:#EAF2EE;border:0"><b>${esc(f.codigo)}</b><br><span style="color:#9FB8AE">${esc(f.placa || '')}</span></td><td style="padding:6px;background:transparent;color:#EAF2EE;border:0">${esc(f.motorista || '—')}</td>
      <td style="padding:6px;background:transparent;color:#EAF2EE;border:0"><b>${esc(plApont(f))}</b>${f.apont_desde ? `<br><span style="color:#9FB8AE">desde ${dataHoraBR(f.apont_desde)}</span>` : ''}</td><td style="padding:6px;background:transparent;color:#EAF2EE;border:0">${esc(f.grupo || '—')}</td>
      <td style="padding:6px;background:transparent;color:#EAF2EE;border:0"><span style="background:${cor[k]};color:#fff;border-radius:9px;padding:2px 8px;font-weight:700;font-size:11px;white-space:nowrap">${t}</span>${(q => q.real ? `<div style="margin-top:5px"><span style="background:${q.cor};color:#fff;border-radius:9px;padding:2px 8px;font-weight:700;font-size:11px;white-space:nowrap">${esc(q.txt)}</span></div>${q.al.map(x => `<div style="color:#F2994A;font-weight:700;margin-top:3px">⚠ ${esc(x)}</div>`).join('')}` : '')(plCarga(f))}</td><td style="padding:6px;background:transparent;color:#EAF2EE;border:0">${esc(plMov(f))}<br><span style="color:#9FB8AE">${esc(f.endereco || f.local_creare || '')}</span></td></tr>`; }).join('')}</tbody></table>`; };

// ---------- abas Cavalos e Carretas: situação montada de cadastros + engates + OS + motivo informado pela torre ----------
const PL_SIT = { operacao: ['Em operação', '#2BB673'], manutencao_atrelado: ['Manutenção · atrelado', '#F2994A'], manutencao: ['Manutenção', '#EB5757'],
  parado_sem_composicao: ['Parado · sem composição', '#E2B93B'], parado_sem_cavalo: ['Parada · sem cavalo', '#E2B93B'], parado: ['Parado', '#E2B93B'],
  aguardando: ['Aguardando chegada', '#56A8E8'], baixado: ['Baixado / vendido', '#9AA5B1'] };
const PL_MOTIVOS = ['Aguardando composição', 'Aguardando cavalo', 'Aguardando motorista', 'Aguardando documentação', 'Aguardando instalação (rastreador / rádio / computador de bordo)', 'Aguardando plotagem', 'Aguardando peça', 'Manutenção na base', 'Reserva', 'Outro'];
function plCompCalc(d, grupo) {
  const it = (d?.itens || []).filter(x => x.grupo === grupo), prev = +(d?.previsto || {})[grupo] || 0;
  const n = k => it.filter(x => x.situacao === k).length;
  const chegaram = it.filter(x => !['aguardando', 'baixado'].includes(x.situacao)).length, aguard = Math.max(prev - chegaram, n('aguardando'));
  const nome = grupo === 'cavalo' ? ['cavalo', 'cavalos', 'CV'] : ['carreta', 'carretas', 'Carretas'];
  const parados = it.filter(x => /^parado/.test(x.situacao)), porMotivo = parados.reduce((o, x) => { const k = x.motivo || 'Sem motivo informado'; o[k] = (o[k] || 0) + 1; return o; }, {});
  const partes = [n('manutencao_atrelado') && `${n('manutencao_atrelado')} ${grupo === 'cavalo' ? 'atrelados em carretas' : 'atreladas em cavalos'} e em manutenção (${it.filter(x => x.situacao === 'manutencao_atrelado').map(x => grupo === 'cavalo' ? x.codigo : x.par).join(', ')})`,
    n('manutencao') && `${n('manutencao')} em manutenção${grupo === 'cavalo' ? ' aguardando composição' : ''}`, parados.length && `${parados.length} ${grupo === 'cavalo' ? 'parados' : 'paradas'} (${Object.entries(porMotivo).map(([k, v]) => `${v} ${k.toLowerCase()}`).join('; ')})`,
    `${n('operacao')} em operação`].filter(Boolean);
  const resumo = `${nome[2]} - Chegaram ${chegaram} ${grupo === 'cavalo' ? 'dos' : 'das'} ${prev} ${grupo === 'cavalo' ? 'previstos' : 'previstas'}: ${partes.join(', ')}.${aguard ? ` Aguardando a chegada ${aguard === 1 ? 'do que falta' : `${grupo === 'cavalo' ? 'dos' : 'das'} ${aguard} que faltam`}.` : ''}`;
  return { it, prev, n, chegaram, aguard, nome, parados, porMotivo, resumo };
}
// cards de cavalos/carretas (aba e imagem/PDF do painel)
function plCompCards(c, grupo) {
  const { prev, n, chegaram, aguard, parados, porMotivo } = c;
  const card = (cor, t, v, sub = '') => `<div class="pl-c" style="--cor:${cor}"><h3>${t}</h3><div class="pl-n">${v}</div>${sub ? `<div class="pl-pct">${sub}</div>` : ''}</div>`;
  const pct = v => prev ? Math.round(v * 100 / prev) + '% do previsto' : '';
  return `<div class="pl-l4" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
      ${card('#DDA936', 'Previstos', prev)}${card('#2BB673', 'Chegaram', chegaram, pct(chegaram))}${card('#2BB673', 'Em operação', n('operacao'), pct(n('operacao')))}
      ${card('#F2994A', grupo === 'cavalo' ? 'Manutenção · atrelados' : 'Manutenção · atreladas', n('manutencao_atrelado'))}${card('#EB5757', grupo === 'cavalo' ? 'Manutenção · sem composição' : 'Manutenção', n('manutencao'))}
      ${card('#E2B93B', grupo === 'cavalo' ? 'Parados' : 'Paradas', parados.length, Object.entries(porMotivo).map(([k, v]) => `${v} · ${esc(k)}`).join('<br>'))}${card('#56A8E8', 'Aguardando chegada', aguard)}</div>`;
}
async function plComposicao(tela, grupo, ed) {
  let d; try { d = await api.rpc('painel_frota_composicao', {}); } catch (err) { falha(err); return; }
  const C = plCompCalc(d, grupo), { it, prev, n, chegaram, aguard, nome, parados, porMotivo, resumo } = C;
  void [chegaram, aguard, parados, porMotivo, prev];
  tela.innerHTML = `<div class="pl-wrap">
    <div class="topo"><div><h1>Painel logístico · ${nome[1][0].toUpperCase() + nome[1].slice(1)}</h1><p class="sub">Montado dos cadastros de equipamentos, engates e OS · motivo de parada informado pela torre</p></div>
      <div class="acoes"><button class="btn" id="pl-copiar">Copiar resumo</button><button class="btn" id="pl-xls">Excel</button></div></div>
    ${plAbas(grupo === 'cavalo' ? 'cavalos' : 'carretas')}
    <div class="pl-painel">${plCompCards(C, grupo)}
      <div class="pl-sa" style="background:rgba(221,169,54,.10);border-color:rgba(221,169,54,.35)"><span id="pl-resumo">${esc(resumo)}</span></div></div>
    <div class="cartao"><h2>${nome[1][0].toUpperCase() + nome[1].slice(1)} (${it.length} ${grupo === 'cavalo' ? 'cadastrados' : 'cadastradas'})</h2><div class="tabela-wrap"><table class="tabela compacta"><thead><tr><th>Frota</th><th>Placas</th><th>Modelo</th><th>Situação</th><th>${grupo === 'cavalo' ? 'Carreta atrelada' : 'Cavalo atrelado'}</th><th>OS aberta</th><th>Motivo (torre)</th>${ed ? '<th></th>' : ''}</tr></thead><tbody>
      ${it.map(x => `<tr><td data-r="Frota"><b>${esc(x.codigo || '—')}</b></td><td data-r="Placas">${esc(x.placas || '—')}</td><td data-r="Modelo">${esc(x.modelo || '')}</td>
        <td data-r="Situação"><span class="pl-sel" style="background:${(PL_SIT[x.situacao] || [])[1] || '#9AA5B1'}">${(PL_SIT[x.situacao] || [x.situacao])[0]}</span></td>
        <td data-r="Engate">${x.par ? `<b>${esc(x.par)}</b><div class="muted">desde ${dataBR ? dataBR(String(x.engate_desde).slice(0, 10)) : esc(x.engate_desde)}</div>` : '<span class="muted">—</span>'}</td>
        <td data-r="OS">${+x.os_abertas ? esc(x.os || x.os_abertas + ' OS') : x.situacao_cadastro === 'manutencao' ? '<span class="tag amarelo">Sem OS aberta</span>' : '—'}</td>
        <td data-r="Motivo">${x.motivo ? `${esc(x.motivo)}${x.motivo_obs ? `<div class="muted">${esc(x.motivo_obs)}</div>` : ''}<div class="muted">desde ${dataHoraBR(x.motivo_desde)}</div>` : /^parado/.test(x.situacao) ? '<span class="tag vermelho">Informar</span>' : ''}</td>
        ${ed ? `<td><button class="btn peq" data-mot="${x.id}">Motivo</button></td>` : ''}</tr>`).join('')}</tbody></table></div>
      <p class="muted">Regras: atrelado segue o conjunto (se um está em manutenção, os dois contam como manutenção · atrelado); OS aberta ou cadastro "Em manutenção" = manutenção; ${grupo === 'cavalo' ? 'cavalo' : 'carreta'} sem engate e sem manutenção = parado, com o motivo informado pela torre. "Sem OS aberta" indica manutenção marcada só no cadastro.</p></div></div>`;
  $('#pl-copiar').onclick = async () => { try { await navigator.clipboard.writeText(resumo); aviso('Resumo copiado.'); } catch (e) { aviso('Selecione o texto do resumo e copie.', true); } };
  $('#pl-xls').onclick = () => ocupado($('#pl-xls'), async () => { await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[resumo], [], ['Indicador', 'Quantidade'], ['Previstos', prev], ['Chegaram', chegaram], ['Em operação', n('operacao')], ['Manutenção · atrelados', n('manutencao_atrelado')], ['Manutenção', n('manutencao')], ['Parados', parados.length], ...Object.entries(porMotivo).map(([k, v]) => ['  ' + k, v]), ['Aguardando chegada', aguard]]), 'Resumo');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(it.map(x => ({ Frota: x.codigo, Placas: x.placas, Modelo: x.modelo, 'Situação': (PL_SIT[x.situacao] || [x.situacao])[0], Atrelado: x.par || '', 'Engate desde': x.engate_desde ? dataHoraBR(x.engate_desde) : '', 'OS aberta': x.os || '', Motivo: x.motivo || '', 'Obs. motivo': x.motivo_obs || '' }))), nome[1]);
    XLSX.writeFile(wb, `Painel ${nome[1]} ${hojeISO()}.xlsx`); });
  $$('[data-mot]', tela).forEach(b => b.onclick = async () => { const x = it.find(y => y.id === b.dataset.mot);
    const r = await modal(`<form><h2>Motivo · ${esc(x.codigo || x.placas)}</h2><p class="muted">Situação: ${(PL_SIT[x.situacao] || [x.situacao])[0]}</p><div class="form">
      <label class="campo largo">Motivo<select name="motivo"><option value="">— sem motivo (limpar) —</option>${PL_MOTIVOS.map(m => `<option ${m === x.motivo ? 'selected' : ''}>${m}</option>`).join('')}${x.motivo && !PL_MOTIVOS.includes(x.motivo) ? `<option selected>${esc(x.motivo)}</option>` : ''}</select></label>
      <label class="campo largo">Observação<textarea name="obs" rows="2">${esc(x.motivo_obs || '')}</textarea></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`);
    if (!r) return; try { await api.rpc('frota_motivo_salvar', { p_eq: x.id, p_motivo: r.motivo_outro || r.motivo, p_obs: r.obs }); aviso('Motivo salvo.'); navegar(); } catch (err) { falha(err); } });
}

// ---------- Central de painéis: todos os painéis num menu só, cada um na sua guia; exportação/envio de todos juntos ----------
const PL_HUB = [['logistico', 'Status da frota', '#/operacao/painel', 1], ['cavalos', 'Cavalos', '#/operacao/painel?aba=cavalos', 0], ['carretas', 'Carretas', '#/operacao/painel?aba=carretas', 0],
  ['viagens', 'Viagens e meta', '#/operacao/viagens/painel', 1], ['operacional', 'Gestão operacional', '#/operacao/gestao', 1], ['seguranca', 'Segurança na condução', '#/operacao/seguranca', 1]];
const plLargo = () => { document.body.classList.add('pl-largo'); window.addEventListener('hashchange', () => { if (!/^#\/operacao\/(painel|gestao|seguranca|viagens\/painel)/.test(location.hash)) document.body.classList.remove('pl-largo'); }, { once: true }); };
const plHubOk = k => k !== 'seguranca' || typeof ROTAS['/operacao/seguranca'] === 'function';
const plAbas = aba => { const k = { '': 'logistico' }[aba] ?? aba;
  return `<div class="pl-hub"><div class="abas pl-abas">${PL_HUB.filter(h => plHubOk(h[0])).map(([c, t, h]) => `<a href="${h}" class="${k === c ? 'ativa' : ''}">${t}</a>`).join('')}</div>
    <button type="button" class="btn prim" data-hubexp title="Gera todos os painéis de uma vez: um PDF, imagens ou envio pelo WhatsApp">Exportar / enviar painéis</button></div>`; };
document.addEventListener('click', e => { if (e.target.closest('[data-hubexp]')) plHubExportar(); });
const plEspera = (cond, ms = 60000) => new Promise((ok, er) => { const t0 = Date.now(); const f = () => cond() ? ok() : Date.now() - t0 > ms ? er(new Error('O painel demorou para carregar.')) : setTimeout(f, 300); f(); });
const plCanvasFile = (cv, nome) => new Promise(ok => cv.toBlob(b => ok(new File([b], nome.replace(/[\\/:*?"<>|]/g, '-') + '.png', { type: 'image/png' })), 'image/png'));
async function plHubExportar() {
  const hj = hojeISO(), d7 = new Date(Date.now() - 6 * 864e5).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }), qs = new URLSearchParams(location.hash.split('?')[1] || '');
  const ks = PL_HUB.filter(h => h[3] && plHubOk(h[0]));
  const r = await modal(`<form><h2>Exportar / enviar painéis</h2><p class="muted">Gera os painéis escolhidos, um depois do outro, e junta tudo no formato escolhido. O Status da frota sai com a situação de agora (com os cards de cavalos e carretas); os demais usam o período abaixo.</p><div class="form">
    <div class="campo largo"><span>Painéis</span>${ks.map(h => `<label class="pl-chk"><input type="checkbox" name="k_${h[0]}" checked> ${h[1]}</label>`).join('')}</div>
    <label class="campo">De<input type="date" name="de" value="${qs.get('de') || d7}" required></label><label class="campo">Até<input type="date" name="ate" value="${qs.get('ate') || hj}" required></label>
    <div class="campo largo"><span>Formato</span><label class="pl-chk"><input type="radio" name="fmt" value="whats" checked> Enviar pelo WhatsApp (imagens)</label><label class="pl-chk"><input type="radio" name="fmt" value="pdf"> PDF único (uma página por painel)</label><label class="pl-chk"><input type="radio" name="fmt" value="png"> Imagens PNG (arquivo .zip)</label></div></div>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Gerar</button></div></form>`);
  if (!r) return; const sel = ks.filter(h => r['k_' + h[0]]); if (!sel.length) return aviso('Escolha ao menos um painel.', true);
  const volta = location.hash, ov = document.createElement('div'); ov.className = 'pl-gerando'; document.body.append(ov); const imgs = [];
  try { for (const [i, [k, t, h]] of sel.entries()) { ov.innerHTML = `<div><b>Gerando ${i + 1} de ${sel.length}</b><span>${t}</span></div>`;
      window.PL_CAP = null; const url = k === 'logistico' ? h : `${h}?de=${r.de}&ate=${r.ate}`;
      if (location.hash === url) navegar(); else location.hash = url;
      await plEspera(() => window.PL_CAP && window.PL_CAP.k === k); await new Promise(ok => setTimeout(ok, k === 'logistico' ? 3000 : 800));
      imgs.push({ nome: window.PL_CAP.nome, cv: await window.PL_CAP.imagem() }); }
  } catch (err) { ov.remove(); location.hash = volta; return falha(err); }
  ov.remove(); location.hash = volta;
  const per = `${dataBR(r.de)} a ${dataBR(r.ate)}`, titulo = `Painéis Verbo · ${per}`;
  if (r.fmt === 'pdf') { await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'); let pdf;
    imgs.forEach(({ cv }, i) => { const f = [cv.width, cv.height], o = cv.width > cv.height ? 'landscape' : 'portrait';
      if (!i) pdf = new jspdf.jsPDF({ orientation: o, unit: 'px', format: f }); else pdf.addPage(f, o); pdf.addImage(cv.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, cv.width, cv.height); });
    pdf.save(titulo.replace(/\//g, '-') + '.pdf'); return; }
  const files = await Promise.all(imgs.map(x => plCanvasFile(x.cv, x.nome)));
  const zip = async () => { await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'); const z = new JSZip(); files.forEach(f => z.file(f.name, f));
    baixarArquivo(await z.generateAsync({ type: 'blob' }), titulo.replace(/\//g, '-') + '.zip'); };
  if (r.fmt === 'png') return zip();
  const pode = navigator.canShare && navigator.canShare({ files });
  const r2 = await modal(`<form><h2>Painéis prontos</h2><p>${files.length} ${files.length > 1 ? 'imagens geradas' : 'imagem gerada'}: ${imgs.map(x => esc(x.nome)).join(' · ')}.</p>
    <p class="muted">${pode ? 'Clique em Enviar e escolha o WhatsApp e o contato ou grupo na janela de compartilhamento.' : 'Este navegador não deixa o sistema entregar imagens direto ao WhatsApp. Vou baixar as imagens (.zip) e abrir o WhatsApp com a mensagem pronta; é só anexar as imagens.'}</p>
    <div class="rodape"><button type="button" class="btn" data-fechar>Fechar</button><button type="button" class="btn" value="zip">Só baixar</button><button class="btn prim" value="enviar">${pode ? 'Enviar' : 'Baixar e abrir o WhatsApp'}</button></div></form>`,
    { aoAbrir: m => { $$('button[value]', m).forEach(b => b.onclick = async e => { e.preventDefault();
      if (b.value === 'zip') return zip();
      if (pode) { try { await navigator.share({ files, title: titulo, text: titulo }); } catch (er) { if (er.name !== 'AbortError') falha(er); } return; }
      await zip(); window.open('https://wa.me/?text=' + encodeURIComponent(titulo + ' (imagens em anexo)'), '_blank', 'noopener'); }); } });
  void r2;
}
async function plCarregarPontos() {
  const ps = await api.listar('mapa_pontos', 'ativo=is.true&order=ordem,nome').catch(() => null);
  if (ps && ps.length) PL_PONTOS.splice(0, PL_PONTOS.length, ...ps.map(x => [x.nome, +x.lat, +x.lng, x.tipo, x.id]));
  return ps || [];
}
rota('/operacao/painel', async tela => {
  if (!document.getElementById('pl-css')) document.head.insertAdjacentHTML('beforeend', plCss);
  plLargo();
  const P = estado.params, modo = P.get('modo') || 'agora', em = P.get('em') || '', ini = P.get('de') || '', fim = P.get('ate') || '';
  const ed = tem('administrador', 'operacao'), aba = P.get('aba') || '';
  if (aba === 'cavalos' || aba === 'carretas') return plComposicao(tela, aba === 'cavalos' ? 'cavalo' : 'carreta', ed);
  const pontos = await plCarregarPontos();
  let fs, per = null, quando;
  try {
    if (modo === 'periodo' && ini && fim) {
      [fs, per] = await Promise.all([api.rpc('painel_logistico', { p_em: new Date(fim).toISOString() }), api.rpc('painel_logistico_periodo', { p_ini: new Date(ini).toISOString(), p_fim: new Date(fim).toISOString() })]);
      quando = `${dataHoraBR(new Date(ini).toISOString())} → ${dataHoraBR(new Date(fim).toISOString())}`;
    } else if (modo === 'em' && em) { fs = await api.rpc('painel_logistico', { p_em: new Date(em).toISOString() }); quando = dataHoraBR(new Date(em).toISOString()); }
    else { fs = await api.rpc('painel_logistico', {}); quando = dataHoraBR(new Date().toISOString()); }
  } catch (err) { falha(err); return; }
  fs = fs || []; const c = plConta(fs);
  const hoje0 = new Date(); hoje0.setHours(0, 0, 0, 0);
  const saIni = modo === 'periodo' && ini ? new Date(ini) : modo === 'em' && em ? new Date(new Date(em).setHours(0, 0, 0, 0)) : hoje0;
  const saFim = modo === 'periodo' && fim ? new Date(fim) : modo === 'em' && em ? new Date(em) : new Date();
  const saRot = `${dataHoraBR(saIni.toISOString())} → ${modo === 'agora' ? 'agora' : dataHoraBR(saFim.toISOString())}`;
  const [saTodos, carga, rastros] = await Promise.all([api.rpc('apontamentos_sem_registro', { p_ini: saIni.toISOString(), p_fim: saFim.toISOString() }).catch(() => []),
    modo === 'agora' ? api.rpc('frota_estado_carga', {}).catch(() => ({})) : Promise.resolve({}), plRastros(modo, em, ini, fim).catch(() => ({}))]);
  const sa = (saTodos || []).filter(x => x.exige !== false), saCurto = (saTodos || []).filter(x => x.exige === false);
  fs.forEach(f => { f.carga = (carga || {})[f.id]; f.sentido = plSentido(f, (rastros || {})[f.id]); });
  const leit = modo === 'agora' ? await api.rpc('tlm_leitura', {}).catch(() => null) : null;
  const agoraLocal = dtLocal(new Date().toISOString()), ontemLocal = dtLocal(new Date(Date.now() - 864e5).toISOString());
  tela.innerHTML = `<div class="pl-wrap">
    <div class="topo"><div><h1>Painel logístico</h1><p class="sub">Status da frota · telemetria Creare a cada minuto + ajustes da torre</p></div>
      <div class="acoes">${ed ? '<button class="btn" id="pl-pontos" title="Origem (fazenda), apoio e destino do mapa">Pontos do mapa</button>' : ''}<button class="btn" data-exp="png">Imagem (PNG)</button><button class="btn" data-exp="pdf">PDF</button><button class="btn" data-exp="html">HTML</button><button class="btn" data-exp="xlsx">Excel</button>${ed ? '<button class="btn" id="pl-kml" title="Importar cercas/áreas de um arquivo KML (Creare, Google Earth)">Cercas (KML)</button>' : ''}</div></div>
    ${plAbas('logistico')}
    <form class="filtros pl-barra" id="pl-f"><div class="pl-modo"><select name="modo"><option value="agora" ${modo === 'agora' ? 'selected' : ''}>Agora</option><option value="em" ${modo === 'em' ? 'selected' : ''}>Em uma data e hora</option><option value="periodo" ${modo === 'periodo' ? 'selected' : ''}>Período (de… até…)</option></select></div>
      <input type="datetime-local" name="em" value="${esc(em || agoraLocal)}" ${modo === 'em' ? '' : 'hidden'} aria-label="Data e hora">
      <input type="datetime-local" name="de" value="${esc(ini || ontemLocal)}" ${modo === 'periodo' ? '' : 'hidden'} aria-label="De"><input type="datetime-local" name="ate" value="${esc(fim || agoraLocal)}" ${modo === 'periodo' ? '' : 'hidden'} aria-label="Até">
      <button class="btn prim">Ver</button>${modo === 'agora' ? `<span id="pl-auto">${plLeitura(leit)}</span>` : ''}</form>
    ${plHtml(fs, c, quando, per, sa)}
    <div class="cartao"><h2>Tempo sem apontamento do motorista <span class="muted">· ${esc(saRot)}</span></h2>
      <p class="muted">Abre quando o motorista fica em "NÃO APONTADO" no Creare e fecha no próximo apontamento dele. A partir de 15 minutos a torre precisa justificar. Encerrado sem justificativa não some: fica "falta justificativa da torre" até ser justificado. Lacunas menores que 15 min (troca entre apontamentos) só somam no total.</p>
      ${sa.length ? `<div class="tabela-wrap"><table class="tabela compacta"><thead><tr><th>Frota</th><th>Motorista</th><th>Início</th><th>Fim</th><th>Tempo</th><th>Situação</th><th>Justificativa da torre</th>${ed ? '<th></th>' : ''}</tr></thead><tbody>
      ${sa.map((x, i) => { const j = x.justificativa; return `<tr><td data-r="Frota"><b>${esc(x.codigo)}</b> <span class="muted">${esc(x.placa || '')}</span></td><td data-r="Motorista">${esc(x.motorista || '—')}</td>
        <td data-r="Início">${dataHoraBR(x.inicio)}</td><td data-r="Fim">${x.em_aberto ? '<span class="tag vermelho">em aberto</span>' : dataHoraBR(x.fim)}</td><td data-r="Tempo"><b>${plH(x.horas)}</b></td><td data-r="Situação"><span class="tag ${(PL_SA_SIT[x.situacao] || [])[1] || ''}">${(PL_SA_SIT[x.situacao] || [x.situacao || ''])[0]}</span>${x.em_aberto && x.situacao === 'justificado' ? '<div class="muted">ainda em aberto</div>' : ''}</td>
        <td data-r="Justificativa">${j ? `<span class="tag ${j.responsabilidade === 'motorista' ? 'amarelo' : j.responsabilidade === 'creare' ? 'azul' : ''}">${PL_RESP[j.responsabilidade]}</span> ${esc(j.explicacao)}${j.chamado_creare ? `<div class="muted">Chamado Creare: ${esc(j.chamado_creare)}</div>` : ''}${j.contato_motorista ? `<div class="muted">Contato com o motorista${j.contato_em ? ' em ' + dataHoraBR(j.contato_em) : ''}</div>` : ''}` : '<span class="tag vermelho">Pendente</span>'}</td>
        ${ed ? `<td><button class="btn peq ${j ? '' : 'prim'}" data-just="${i}">${j ? 'Ver / editar' : 'Justificar'}</button></td>` : ''}</tr>`; }).join('')}
      </tbody><tfoot><tr><th colspan="4">Total</th><th>${plH(sa.reduce((t, x) => t + (+x.horas || 0), 0))}</th><th colspan="${ed ? 3 : 2}">${sa.filter(x => !x.justificativa).length} sem justificativa</th></tr></tfoot></table></div>`
      : '<div class="vazio">Nenhum período sem apontamento no intervalo.</div>'}
      <p class="muted">${saCurto.length ? `Mais ${saCurto.length} lacuna(s) curta(s) (&lt; 15 min) somando ${plH(saCurto.reduce((t, x) => t + (+x.horas || 0), 0))}, que não exigem justificativa. ` : ''}Base: relatório de apontamentos do Creare (E09, exato ao minuto, importado de hora em hora) + leitura ao vivo do "NÃO APONTADO" em curso.</p></div>
    ${per ? `<div class="cartao"><h2>Horas no período</h2><div class="tabela-wrap"><table class="tabela compacta"><thead><tr><th>Situação</th><th>Horas de frota</th><th>%</th></tr></thead><tbody>
      ${Object.entries(per.por_status || {}).map(([k, v]) => `<tr><td>${esc(PL_ST[k] || k)}</td><td>${v.toLocaleString('pt-BR')}</td><td>${plPct(v, per.horas_total)}%</td></tr>`).join('')}</tbody></table></div>
      <p class="muted">Base: ${per.fotos} foto(s) da frota no período (coletas do Creare e ajustes da torre). Cada foto vale até a seguinte.</p></div>` : ''}
    <div class="cartao"><h2>Frotas ${modo === 'agora' ? '' : '<span class="muted">(situação em ' + esc(modo === 'periodo' ? dataHoraBR(new Date(fim).toISOString()) : quando) + ')</span>'}</h2>
      <div class="tabela-wrap"><table class="tabela compacta pl-tab"><thead><tr><th>Frota</th><th>Placa</th><th>Status</th><th>Atividade</th><th>Local</th><th>Motorista</th><th>Observação</th><th>Apontamento motorista</th><th>Telemetria</th><th>Confronto</th><th>Ignição / posição</th>${ed && modo === 'agora' ? '<th></th>' : ''}</tr></thead><tbody>
      ${fs.map(f => `<tr><td data-r="Frota"><b>${esc(f.codigo)}</b><div class="muted">${esc(f.modelo || '')}</div></td><td data-r="Placa">${esc(f.placa || '')}</td>
        <td data-r="Status"><span class="tag ${f.status === 'disponivel' ? 'verde' : f.status === 'manutencao' ? 'vermelho' : 'amarelo'}">${PL_ST[f.status] || f.status}</span>${f.travado ? '<div class="pl-trava">🔒 torre</div>' : ''}</td>
        <td data-r="Atividade"><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${PL_COR[f.atividade] || '#5F7A70'};margin-right:5px"></span>${esc(f.atividade || '—')}</td>
        <td data-r="Local">${esc(f.local || '')}</td><td data-r="Motorista">${esc(f.motorista || '')}</td><td data-r="Observação">${esc(f.observacao || '')}</td>
        <td data-r="Apontamento motorista">${f.posicao_em ? `<b>${esc(plApont(f))}</b>${f.apont_desde ? `<div class="muted">desde ${dataHoraBR(f.apont_desde)}</div>` : ''}` : ''}</td>
        <td data-r="Telemetria">${esc(f.grupo || '')}</td><td data-r="Confronto">${f.posicao_em ? `<span class="pl-sel ${plConfere(f)[0]}">${plConfere(f)[1]}</span>` : ''}${(k => k.real ? `<div style="margin-top:4px"><span class="pl-sel" style="background:${k.cor}">${esc(k.txt)}</span></div>${k.al.map(a => `<div class="tag amarelo" style="margin-top:3px;white-space:normal">⚠ ${esc(a)}</div>`).join('')}` : '')(plCarga(f))}</td>
        <td data-r="Ignição / posição" class="muted">${f.posicao_em ? `<span style="color:${plLigado(f) ? '#1E8E57' : 'inherit'}">${esc(plMov(f))}</span>${f.endereco || f.local_creare ? '<br>' + esc(f.endereco || f.local_creare) : ''}<br>Leitura ${dataHoraBR(f.posicao_em)}` : ''}</td>
        ${ed && modo === 'agora' ? `<td><button class="btn peq" data-ed="${f.id}">Ajustar</button></td>` : ''}</tr>`).join('')}</tbody></table></div>
      <p class="muted">Sem a trava 🔒, a atividade acompanha o apontamento do motorista no Creare a cada coleta. Com a trava, vale o que a torre definiu até ela destravar.</p></div></div>`;
  const f = $('#pl-f');
  f.modo.onchange = () => { f.em.hidden = f.modo.value !== 'em'; f.de.hidden = f.ate.hidden = f.modo.value !== 'periodo'; };
  f.onsubmit = e => { e.preventDefault(); const d = formDados(f); const p = new URLSearchParams({ modo: d.modo });
    if (d.modo === 'em') p.set('em', d.em); if (d.modo === 'periodo') { p.set('de', d.de); p.set('ate', d.ate); } location.hash = '#/operacao/painel?' + p; };
  const cercas = await api.listar('mapa_cercas', 'ativo=is.true&select=id,nome,tipo,cor,poligonos').catch(() => []);
  let mapa = null; try { mapa = await plMapa($('#pl-mapa'), fs, cercas, rastros); } catch (e) { $('#pl-mapa-info').textContent = 'Não foi possível carregar o mapa.'; }
  if (modo === 'agora') { let t; const tick = () => { if (!location.hash.startsWith('#/operacao/painel') || (new URLSearchParams(location.hash.split('?')[1] || '').get('modo') || '').match(/em|periodo/)) return;
      if (!$('#modal').hidden || document.hidden) { t = setTimeout(tick, 60000); return; } navegar(); };   // não recarrega com janela aberta
    t = setTimeout(tick, 60000); window.addEventListener('hashchange', () => clearTimeout(t), { once: true }); }
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
  $('#pl-kml')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Importar cercas (KML)</h2><p class="muted">Exporte as cercas no Creare ou no Google Earth em KML e envie aqui. Cada área do arquivo vira uma cerca no mapa.</p><div class="form">
      <label class="campo largo">Arquivo KML<input type="file" name="arq" accept=".kml,application/vnd.google-earth.kml+xml" required></label>
      <label class="campo">Tipo<select name="tipo">${Object.keys(PL_CERCA_COR).map(t => `<option value="${t}">${{ cerca: 'Cerca', fazenda: 'Fazenda / horto', fabrica: 'Fábrica', posto: 'Posto', apoio: 'Apoio / base', outro: 'Outro' }[t]}</option>`).join('')}</select></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Importar</button></div></form>`);
    if (!r) return;
    const arq = (r.arq || [])[0]; if (!arq) return falha('Escolha o arquivo KML.');
    try { const itens = plKml(await arq.text()); if (!itens.length) return falha('Não encontrei áreas nem pontos nesse KML.');
      await api.inserir('mapa_cercas', itens.map(c => ({ nome: c.nome.slice(0, 120), tipo: r.tipo || 'cerca', poligonos: c.poligonos, origem: arq.name })));
      aviso(`${itens.length} cerca(s) importada(s).`); navegar(); } catch (err) { falha(err); } });
  $$('[data-just]', tela).forEach(b => b.onclick = async () => { const x = sa[+b.dataset.just], j = x.justificativa || {};
    const r = await modal(`<form><h2>Sem apontamento · ${esc(x.codigo)}</h2><p class="muted">${esc(x.motorista || 'Motorista não identificado')} · desde ${dataHoraBR(x.inicio)} · ${plH(x.horas)}${x.em_aberto ? ' (ainda em aberto)' : ''}</p><div class="form">
      <label class="campo largo">De quem é a responsabilidade? *<select name="responsabilidade" required><option value="">Escolha…</option>${Object.entries(PL_RESP).map(([k, t]) => `<option value="${k}" ${j.responsabilidade === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo">Houve contato com o motorista? *<select name="contato" required><option value="">Escolha…</option><option value="sim" ${j.contato_motorista ? 'selected' : ''}>Sim</option><option value="nao" ${j.id && !j.contato_motorista ? 'selected' : ''}>Não</option></select></label>
      <label class="campo">Quando foi o contato<input type="datetime-local" name="contato_em" value="${dtLocal(j.contato_em)}"></label>
      <label class="campo">Nº do chamado no Creare<input name="chamado_creare" value="${esc(j.chamado_creare || '')}" placeholder="Obrigatório se o problema for do Creare (ou envie o print)"></label>
      <label class="campo">Print do chamado / evidência<input type="file" name="arquivos" multiple accept="image/*,application/pdf"></label>
      <label class="campo largo">Explicação *<textarea name="explicacao" rows="3" required placeholder="O que aconteceu e o que foi feito">${esc(j.explicacao || '')}</textarea></label></div>
      ${j.id ? `<div id="pl-just-anx" class="muted">Carregando anexos…</div>` : ''}
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar justificativa</button></div></form>`, {
      aoAbrir: async el => { if (j.id) { const a = el.querySelector('#pl-just-anx'); try { a.innerHTML = await htmlAnexos('apont_justif', j.id); } catch (e) { a.textContent = ''; } } },
      validar: d => d.responsabilidade === 'creare' && !d.chamado_creare && !(d.arquivos || []).length && !j.chamado_creare ? 'Problema no Creare: informe o nº do chamado aberto ou envie o print.' : d.explicacao.length < 10 ? 'Escreva a explicação (mínimo 10 letras).' : null });
    if (!r) return;
    const dados = { equipamento_id: x.equipamento_id, inicio: x.inicio, motorista: x.motorista || null, responsabilidade: r.responsabilidade, contato_motorista: r.contato === 'sim',
      contato_em: r.contato_em ? new Date(r.contato_em).toISOString() : null, chamado_creare: r.chamado_creare || null, explicacao: r.explicacao };
    try { let id = j.id; if (id) await api.alterar('apontamento_justificativas', `id=eq.${id}`, dados); else [{ id }] = await api.inserir('apontamento_justificativas', dados);
      if (r.arquivos?.length) await anexar('apont_justif', id, r.arquivos, 'Chamado / evidência'); aviso('Justificativa salva.'); navegar(); } catch (err) { falha(err); } });
  $('#pl-pontos')?.addEventListener('click', async () => {
    const lin = (x = {}) => `<div class="pl-pt" style="display:grid;grid-template-columns:2fr 1fr 2fr auto;gap:8px;align-items:end;margin-bottom:8px" data-id="${x.id || ''}">
      <label class="campo">Nome<input name="nome" value="${esc(x.nome || '')}" placeholder="Ex.: Fazenda Santa Rita (Três Lagoas/MS)"></label>
      <label class="campo">Tipo<select name="tipo">${['origem', 'apoio', 'destino'].map(t => `<option value="${t}" ${x.tipo === t ? 'selected' : ''}>${{ origem: 'Origem (fazenda)', apoio: 'Apoio / base', destino: 'Destino (fábrica)' }[t]}</option>`).join('')}</select></label>
      <label class="campo">Coordenadas (lat, long)<input name="coord" value="${x.lat != null ? x.lat + ', ' + x.lng : ''}" placeholder="Cole do Google Maps: -20.78, -51.70"></label>
      <button type="button" class="btn peq" data-tirar title="Tirar do mapa">×</button></div>`;
    const r = await modal(`<form><h2>Pontos do mapa</h2><p class="muted">A origem deve ser a fazenda onde as frotas carregam. No Google Maps, clique com o botão direito no local e copie os números (latitude, longitude).</p>
      <div id="pl-pts">${pontos.map(lin).join('')}</div><button type="button" class="btn peq" id="pl-pt-mais">+ Ponto</button>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`, {
      aoAbrir: el => { el.querySelector('#pl-pt-mais').onclick = () => el.querySelector('#pl-pts').insertAdjacentHTML('beforeend', lin());
        el.querySelector('#pl-pts').addEventListener('click', e => { const b = e.target.closest('[data-tirar]'); if (b) { const d = b.closest('.pl-pt'); d.hidden = true; d.dataset.tirar = '1'; } }); } });
    if (!r) return;
    try { const ls = [...document.querySelectorAll('.pl-pt')]; let ordem = 0;
      for (const d of ls) { const id = d.dataset.id, nome = d.querySelector('[name=nome]').value.trim(), tipo = d.querySelector('[name=tipo]').value;
        const m = d.querySelector('[name=coord]').value.match(/(-?\d+(?:[.,]\d+)?)\s*[,; ]\s*(-?\d+(?:[.,]\d+)?)/);
        if (d.dataset.tirar) { if (id) await api.alterar('mapa_pontos', `id=eq.${id}`, { ativo: false }); continue; }
        if (!nome && !m) continue; if (!nome || !m) throw new Error(`Preencha nome e coordenadas de todos os pontos${nome ? ' (' + nome + ')' : ''}.`);
        const dados = { nome, tipo, lat: +m[1].replace(',', '.'), lng: +m[2].replace(',', '.'), ordem: ++ordem };
        if (Math.abs(dados.lat) > 90 || Math.abs(dados.lng) > 180) throw new Error(`Coordenadas inválidas em ${nome}.`);
        if (id) await api.alterar('mapa_pontos', `id=eq.${id}`, dados); else await api.inserir('mapa_pontos', dados); }
      aviso('Pontos do mapa salvos.'); navegar(); } catch (err) { falha(err); } });
  // exportações
  const nomeBase = `Painel logístico ${quando.replace(/[\/:]/g, '-').replace(/\s+/g, ' ')}`;
  const imagem = async () => { if (!window.html2canvas) await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    let foto = null; if (mapa) { try { foto = await plMapaImagem(mapa, 2, 1500, 620); } catch (e) { console.warn('mapa', e); } }
    let comp = ''; if (modo === 'agora') { try { const d = await api.rpc('painel_frota_composicao', {});
      comp = ['cavalo', 'carreta'].map(g => { const c = plCompCalc(d, g); return `<div class="pl-visao" style="margin-top:18px"><h4>${g === 'cavalo' ? 'CAVALOS' : 'CARRETAS'}</h4>${plCompCards(c, g)}
        <div class="pl-sa" style="background:rgba(221,169,54,.10);border-color:rgba(221,169,54,.35);margin-top:10px"><span>${esc(c.resumo)}</span></div></div>`; }).join(''); } catch (e) { console.warn('composição', e); } }
    return html2canvas($('#pl-painel'), { scale: 2.5, useCORS: true, backgroundColor: '#0B1F19', logging: false,
      windowWidth: 1700, width: 1600,
      onclone: d => { const pn = d.getElementById('pl-painel'); if (pn) { pn.style.width = '1600px'; pn.style.maxWidth = 'none'; }
        const el = d.getElementById('pl-mapa'); if (el && foto) { const card = el.closest('.pl-c'), gr = pn && pn.querySelector('.pl-grade');
          el.outerHTML = `<img src="${foto}" alt="Mapa" style="width:100%;height:auto;display:block;border-radius:12px;margin-top:10px">${plTabMapa(fs)}`;
          if (card && gr) { gr.after(card); card.style.marginTop = '16px'; } }
        if (pn && comp) pn.insertAdjacentHTML('beforeend', comp);
        if (pn) pn.insertAdjacentHTML('beforeend', plTabTratativa(sa, saRot)); } }); };
  window.PL_CAP = { k: 'logistico', nome: nomeBase, imagem };
  $$('[data-exp]', tela).forEach(b => b.onclick = () => ocupado(b, async () => { try {
    const t = b.dataset.exp;
    if (t === 'png') { const cv = await imagem(); cv.toBlob(bl => baixarArquivo(bl, nomeBase + '.png'), 'image/png'); }
    else if (t === 'pdf') { const cv = await imagem(); await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      const pdf = new jspdf.jsPDF({ orientation: 'landscape', unit: 'px', format: [cv.width, cv.height] }); pdf.addImage(cv.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, cv.width, cv.height); pdf.save(nomeBase + '.pdf'); }
    else if (t === 'html') { const cv = await imagem(); const img = cv.toDataURL('image/png');
      const linhas = fs.map(x => `<tr><td>${esc(x.codigo)}</td><td>${esc(x.placa || '')}</td><td>${PL_ST[x.status] || ''}</td><td>${esc(x.atividade || '')}</td><td>${esc(x.local || '')}</td><td>${esc(x.motorista || '')}</td><td>${x.posicao_em ? esc(plApont(x)) : ''}</td><td>${esc(x.grupo || '')}</td><td>${x.posicao_em ? plConfere(x)[1] : ''}</td><td>${x.posicao_em ? esc(plMov(x)) : ''}</td><td>${esc(x.observacao || '')}</td></tr>`).join('');
      baixarArquivo(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(nomeBase)}</title><style>body{margin:0;background:#0B1F19;color:#EAF2EE;font-family:Arial,sans-serif;padding:16px}img{max-width:100%;border-radius:12px;display:block;margin:0 auto 16px}table{border-collapse:collapse;width:100%;background:#fff;color:#1d2b27;font-size:13px}th,td{border:1px solid #d9e2de;padding:6px 8px;text-align:left}th{background:#02654D;color:#fff}</style></head><body><img src="${img}" alt="Painel logístico"><table><thead><tr><th>Frota</th><th>Placa</th><th>Status</th><th>Atividade</th><th>Local</th><th>Motorista</th><th>Apontamento motorista</th><th>Telemetria</th><th>Confronto</th><th>Ignição / movimento</th><th>Observação</th></tr></thead><tbody>${linhas}</tbody></table></body></html>`, nomeBase + '.html', 'text/html'); }
    else if (t === 'xlsx') { await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'); const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Painel logístico · status da frota'], [per ? 'Período' : 'Situação em', quando], [],
        ['Indicador', 'Frotas', '% da frota'], ...[['Total de frotas operacionais', c.total], ['Frotas disponíveis', c.disp], ['Em trânsito carregado', c.carregado], ['Em trânsito vazio', c.vazio], ['No horto', c.horto], ['Na fábrica', c.fabrica],
          ['Corretiva', c.corretiva], ['Preventiva', c.preventiva], ['Inspeção', c.inspecao], ['SOS', c.sos], ['Aguardando nota', c.nota], ['Sem motorista', c.semMot], ['Sem composição', c.semComp], ['Sem cavalo', c.semCav],
          ['Operando', c.operando], ['Manutenção', c.man], ['Disponível', c.disp], ['Indisponível', c.indisp]].map(([k, v]) => [k, v, plPct(v, c.total) / 100])]), 'Indicadores');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fs.map(x => ({ Frota: x.codigo, Placa: x.placa, Modelo: x.modelo, Status: PL_ST[x.status] || x.status, Atividade: x.atividade, Local: x.local, Motorista: x.motorista,
        'Observação': x.observacao, 'Apontamento motorista': x.apontamento, 'Telemetria': x.grupo, 'Confronto': x.posicao_em ? plConfere(x)[1] : '', 'Apontado em': x.apont_desde ? dataHoraBR(x.apont_desde) : '', 'Ignição / movimento': x.posicao_em ? plMov(x) : '', 'Velocidade (km/h)': x.vel, 'Endereço (Creare)': x.endereco || x.local_creare, Latitude: x.lat, Longitude: x.lng, 'Leitura': x.posicao_em ? dataHoraBR(x.posicao_em) : '', 'Travado pela torre': x.travado ? 'Sim' : '' }))), 'Frotas');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sa.length ? sa.map(x => ({ Frota: x.codigo, Placa: x.placa, Motorista: x.motorista, 'Início': dataHoraBR(x.inicio), Fim: x.em_aberto ? 'em aberto' : dataHoraBR(x.fim), Horas: +x.horas,
        Responsabilidade: x.justificativa ? PL_RESP[x.justificativa.responsabilidade] : 'PENDENTE', 'Contato com motorista': x.justificativa ? (x.justificativa.contato_motorista ? 'Sim' : 'Não') : '', 'Chamado Creare': x.justificativa?.chamado_creare || '', 'Explicação': x.justificativa?.explicacao || '' })) : [{ Aviso: 'Nenhum período sem apontamento' }]), 'Sem apontamento');
      if (per) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Atividade', 'Horas'], ...Object.entries(per.por_atividade || {}), [], ['Status', 'Horas'], ...Object.entries(per.por_status || {}).map(([k, v]) => [PL_ST[k] || k, v])]), 'Horas no período');
      if (per || modo === 'em') { const h = await api.listar('frota_status_hist', `em=gte.${new Date(per ? ini : em).toISOString()}&em=lte.${new Date(per ? fim : em).toISOString()}&order=em&select=em,status,atividade,local,motorista,observacao,lat,lng,apontamento,origem,eq:equipamentos(codigo_frota)`).catch(() => []);
        if (h.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(h.map(x => ({ 'Data/hora': dataHoraBR(x.em), Frota: x.eq?.codigo_frota, Status: PL_ST[x.status] || x.status, Atividade: x.atividade, Local: x.local, Motorista: x.motorista, 'Observação': x.observacao, Apontamento: x.apontamento, Origem: x.origem, Latitude: x.lat, Longitude: x.lng }))), 'Histórico'); }
      XLSX.writeFile(wb, nomeBase + '.xlsx'); }
  } catch (err) { falha(err); } }));
  void mapa;
});


// ---------- Painel de viagens: faturamento, meta (1 viagem por caminhão em operação por dia) e evolução diária ----------
rota('/operacao/viagens/painel', async tela => {
  if (!document.getElementById('pl-css')) document.head.insertAdjacentHTML('beforeend', plCss);
  const P = estado.params, hoje = hojeISO(), ini = P.get('de') || hoje.slice(0, 8) + '01', fim = P.get('ate') || hoje;
  const iniTs = new Date(ini + 'T00:00:00').toISOString(), fimTs = new Date(fim + 'T23:59:59').toISOString();
  const sel = 'select=id,numero,status,origem,destino,saida_prevista,saida_em,chegada_em,valor_frete,peso_t,nf_numero,cte_numero,eq:equipamentos(codigo_frota),m:colaboradores!viagens_motorista_id_fkey(nome),cl:clientes(nome)';
  let vs, dias;
  try {
    [vs, dias] = await Promise.all([
      api.listar('viagens', `ativo=eq.true&status=neq.cancelada&or=(and(status.eq.entregue,chegada_em.gte.${iniTs},chegada_em.lte.${fimTs}),and(status.in.(planejada,em_transito),or(saida_em.lte.${fimTs},saida_prevista.lte.${fimTs},saida_prevista.is.null)))&${sel}&order=chegada_em.desc.nullsfirst,saida_prevista.desc&limit=2000`),
      api.rpc('viagens_meta_dias', { p_ini: ini, p_fim: fim })]);
  } catch (err) { falha(err); return; }
  const diaBR = ts => ts ? new Date(ts).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }) : null;
  const feitas = vs.filter(v => v.status === 'entregue'), abertas = vs.filter(v => v.status !== 'entregue');
  const fat = feitas.reduce((t, v) => t + Number(v.valor_frete || 0), 0), fatAberto = abertas.reduce((t, v) => t + Number(v.valor_frete || 0), 0);
  const porDia = (dias || []).map(d => ({ ...d, feitas: feitas.filter(v => diaBR(v.chegada_em) === d.dia).length, fat: feitas.filter(v => diaBR(v.chegada_em) === d.dia).reduce((t, v) => t + Number(v.valor_frete || 0), 0) }));
  const ateHoje = porDia.filter(d => d.dia <= hoje);
  const metaAteHoje = ateHoje.reduce((t, d) => t + (+d.meta || 0), 0), metaPeriodo = porDia.reduce((t, d) => t + (+d.meta || 0), 0);
  const ating = metaAteHoje ? Math.round(feitas.length * 100 / metaAteHoje) : 0;
  const ticket = feitas.length ? fat / feitas.length : 0;
  let acum = 0, acumMeta = 0; ateHoje.forEach(d => { acum += d.feitas; acumMeta += +d.meta || 0; d.acum = acum; d.acumMeta = acumMeta; d.pct = acumMeta ? Math.round(acum * 100 / acumMeta) : 0; });
  // gráfico diário: barras = viagens realizadas, traço = meta do dia; linha = atingimento acumulado
  const W = 1100, H = 300, pl = 44, pr = 44, pt = 18, pb = 46, n = Math.max(porDia.length, 1), bw = (W - pl - pr) / n;
  const maxV = Math.max(1, ...porDia.map(d => Math.max(d.feitas, +d.meta || 0))), y = v => pt + (H - pt - pb) * (1 - v / maxV), yP = v => pt + (H - pt - pb) * (1 - Math.min(v, 150) / 150);
  const svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" role="img" aria-label="Viagens realizadas por dia contra a meta">
    ${[0, .5, 1].map(f => `<line x1="${pl}" x2="${W - pr}" y1="${y(maxV * f)}" y2="${y(maxV * f)}" stroke="rgba(255,255,255,.08)"/><text x="${pl - 8}" y="${y(maxV * f) + 4}" text-anchor="end" font-size="11" fill="#9FB8AE">${Math.round(maxV * f)}</text>`).join('')}
    <text x="${W - pr + 8}" y="${yP(100) + 4}" font-size="11" fill="#DDA936">100%</text><line x1="${pl}" x2="${W - pr}" y1="${yP(100)}" y2="${yP(100)}" stroke="rgba(221,169,54,.35)" stroke-dasharray="4 4"/>
    ${porDia.map((d, i) => { const x = pl + i * bw, ok = d.feitas >= (+d.meta || 0), fut = d.dia > hoje;
      return `<rect x="${x + bw * .18}" y="${y(d.feitas)}" width="${bw * .64}" height="${H - pb - y(d.feitas)}" rx="3" fill="${fut ? 'rgba(255,255,255,.08)' : ok ? '#2BB673' : '#EB5757'}"><title>${dataBR(d.dia)}: ${d.feitas} de ${d.meta} (meta) · ${brl(d.fat)}</title></rect>
        <line x1="${x + bw * .1}" x2="${x + bw * .9}" y1="${y(+d.meta || 0)}" y2="${y(+d.meta || 0)}" stroke="#F3F7F5" stroke-width="2.5"/>
        ${n <= 31 ? `<text x="${x + bw / 2}" y="${H - pb + 16}" text-anchor="middle" font-size="11" fill="#9FB8AE">${d.dia.slice(8)}</text>` : ''}`; }).join('')}
    <polyline fill="none" stroke="#DDA936" stroke-width="2.5" points="${ateHoje.map((d, i) => `${pl + i * bw + bw / 2},${yP(d.pct)}`).join(' ')}"/>
    ${ateHoje.map((d, i) => `<circle cx="${pl + i * bw + bw / 2}" cy="${yP(d.pct)}" r="3.5" fill="#DDA936"><title>${dataBR(d.dia)}: acumulado ${d.acum} de ${d.acumMeta} (${d.pct}%)</title></circle>`).join('')}
    <text x="${pl}" y="${H - 8}" font-size="11.5" fill="#DCE8E3">▮ realizadas no dia (verde = bateu a meta · vermelho = abaixo)   ━ meta do dia   ● atingimento acumulado (escala à direita)</text></svg>`;
  const porFrota = Object.values(feitas.reduce((o, v) => { const k = v.eq?.codigo_frota || '—'; (o[k] ||= { frota: k, n: 0, fat: 0 }); o[k].n++; o[k].fat += Number(v.valor_frete || 0); return o; }, {})).sort((a, b) => b.n - a.n);
  const diasMeta = ateHoje.length * (+((dias || [])[0]?.meta && 1) || 1);
  const card = (cor, t, v, sub = '') => `<div class="pl-c" style="--cor:${cor}"><h3>${t}</h3><div class="pl-n" style="font-size:clamp(22px,2vw,34px);white-space:nowrap;letter-spacing:-.5px">${v}</div>${sub ? `<div class="pl-pct" style="letter-spacing:.3px;text-transform:none">${sub}</div>` : ''}</div>`;
  plLargo();
  tela.innerHTML = `<div class="pl-wrap">
    <div class="topo"><div><h1>Painel de viagens</h1><p class="sub">Faturamento e meta · 1 viagem por caminhão em operação por dia · viagem conta no dia da entrega</p></div>
      <div class="acoes"><a class="btn" href="#/operacao/viagens">← Viagens</a><button class="btn" data-vexp="png">Imagem (PNG)</button><button class="btn" data-vexp="pdf">PDF</button><button class="btn" data-vexp="html">HTML</button><button class="btn" id="vp-xls">Excel</button></div></div>
    <form class="filtros pl-barra" id="vp-f"><label>De <input type="date" name="de" value="${ini}"></label><label>Até <input type="date" name="ate" value="${fim}"></label><button class="btn prim">Ver</button>
      <button type="button" class="btn" data-per="mes">Este mês</button><button type="button" class="btn" data-per="7">Últimos 7 dias</button></form>
    ${plAbas('viagens')}
    <div id="vp-exp"><div class="pl-painel">
      <div class="pl-topo" style="margin-bottom:14px"><img src="logo.png" alt="Verbo"><div class="pl-tit"><h1>PAINEL DE <b>VIAGENS</b></h1><p>FATURAMENTO E META · 1 VIAGEM POR CAMINHÃO/DIA</p></div>
        <div class="pl-hora"><small>PERÍODO</small>${dataBR(ini)} a ${dataBR(fim)}</div></div>
      <div class="pl-l4" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
        ${card('#2BB673', 'Faturamento realizado', brl(fat), `${feitas.length} viagem(ns) entregue(s)`)}${card('#56A8E8', 'Em aberto', brl(fatAberto), `${abertas.length} viagem(ns) programada(s) / em trânsito`)}
        ${card(ating >= 100 ? '#2BB673' : ating >= 80 ? '#DDA936' : '#EB5757', 'Atingimento da meta', ating + '%', `${feitas.length} de ${metaAteHoje} viagens até hoje`)}
        ${card('#DDA936', 'Meta do período', metaPeriodo, `${porDia.length} dia(s) · caminhões em operação × 1`)}${card('#9B7BEA', 'Ticket médio', brl(ticket), 'por viagem entregue')}</div>
      <div class="pl-c" style="--cor:#DDA936;margin-top:14px"><h3>${PL_IC.pizza}Evolução diária · realizado × meta</h3>${svg}</div></div>
    <div class="cartao"><h2>Por dia</h2><div class="tabela-wrap"><table class="tabela compacta"><thead><tr><th>Dia</th><th>Caminhões em operação</th><th>Meta</th><th>Realizadas</th><th>% do dia</th><th>Acumulado</th><th>Faturamento</th></tr></thead><tbody>
      ${porDia.map(d => `<tr${d.dia > hoje ? ' class="muted"' : ''}><td>${dataBR(d.dia)}</td><td>${d.caminhoes} <span class="muted" title="Fonte">${d.fonte === 'cadastro atual' ? '*' : ''}</span></td><td>${d.meta}</td><td><b>${d.feitas}</b></td>
        <td>${+d.meta ? `<span class="tag ${d.feitas >= d.meta ? 'verde' : 'vermelho'}">${Math.round(d.feitas * 100 / d.meta)}%</span>` : '—'}</td><td>${d.acum != null ? `${d.acum} / ${d.acumMeta} (${d.pct}%)` : ''}</td><td>${brl(d.fat)}</td></tr>`).join('')}</tbody></table></div>
      <p class="muted">* Dia sem histórico do Painel logístico: usa os cavalos atrelados e em operação hoje. A partir de agora o histórico é gravado a cada hora.</p></div>
    <div class="cartao"><h2>Por caminhão</h2>${porFrota.length ? `<div class="tabela-wrap"><table class="tabela compacta"><thead><tr><th>Frota</th><th>Viagens entregues</th><th>Faturamento</th></tr></thead><tbody>
      ${porFrota.map(f => `<tr><td><b>${esc(f.frota)}</b></td><td>${f.n}</td><td>${brl(f.fat)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Nenhuma viagem entregue no período.</div>'}</div>
    <div class="cartao"><h2>Viagens do período (${vs.length})</h2><div class="tabela-wrap"><table class="tabela compacta"><thead><tr><th>Viagem</th><th>Situação</th><th>Frota</th><th>Motorista</th><th>Origem → destino</th><th>Saída</th><th>Entrega</th><th>NF / CT-e</th><th>Valor</th></tr></thead><tbody>
      ${vs.map(v => `<tr class="clicavel" data-v="${v.id}"><td><b>${esc(v.numero)}</b></td><td><span class="tag ${(ST_VIA[v.status] || [])[1] || ''}">${(ST_VIA[v.status] || [v.status])[0]}</span></td><td>${esc(v.eq?.codigo_frota || '—')}</td><td>${esc(v.m?.nome || '—')}</td>
        <td>${esc(v.origem)} → ${esc(v.destino)}</td><td>${dataHoraBR(v.saida_em || v.saida_prevista) || '—'}${!v.saida_em && v.saida_prevista ? ' <span class="muted">(prev.)</span>' : ''}</td><td>${dataHoraBR(v.chegada_em) || '—'}</td>
        <td>${esc([v.nf_numero && 'NF ' + v.nf_numero, v.cte_numero && 'CT-e ' + v.cte_numero].filter(Boolean).join(' · ') || '—')}</td><td>${brl(v.valor_frete)}</td></tr>`).join('') || '<tr><td colspan="9" class="vazio">Nenhuma viagem no período.</td></tr>'}</tbody></table></div></div></div></div>`;
  void diasMeta;
  const f = $('#vp-f');
  f.onsubmit = e => { e.preventDefault(); location.hash = `#/operacao/viagens/painel?de=${f.de.value}&ate=${f.ate.value}`; };
  $$('[data-per]', f).forEach(b => b.onclick = () => { const h = hojeISO(); const de = b.dataset.per === 'mes' ? h.slice(0, 8) + '01' : new Date(Date.now() - 6 * 864e5).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
    location.hash = `#/operacao/viagens/painel?de=${de}&ate=${h}`; });
  $$('[data-v]', tela).forEach(tr => tr.onclick = () => { location.hash = '#/operacao/viagens/ver/' + tr.dataset.v; });
  const nomeV = `Painel de viagens ${dataBR(ini).replace(/\//g, '-')} a ${dataBR(fim).replace(/\//g, '-')}`;
  const imagemV = async () => { if (!window.html2canvas) await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    return html2canvas($('#vp-exp'), { scale: 2, useCORS: true, backgroundColor: '#F3F5F4', logging: false, windowWidth: 1700, width: 1600,
      onclone: d => { const el = d.getElementById('vp-exp'); if (!el) return; el.style.width = '1600px'; el.style.padding = '16px'; el.style.background = '#F3F5F4';
        el.querySelectorAll('.exportar,.hbar').forEach(x => x.remove());
        el.querySelectorAll('svg[viewBox]').forEach(sv => { const [, , w, h] = sv.getAttribute('viewBox').split(' ').map(Number); if (w > 300) { sv.setAttribute('width', 1520); sv.setAttribute('height', Math.round(1520 * h / w)); sv.style.width = '1520px'; sv.style.height = Math.round(1520 * h / w) + 'px'; } }); } }); };
  window.PL_CAP = { k: 'viagens', nome: nomeV, imagem: imagemV };
  $$('[data-vexp]', tela).forEach(b => b.onclick = () => ocupado(b, async () => { try { const t = b.dataset.vexp, cv = await imagemV();
    if (t === 'png') cv.toBlob(bl => baixarArquivo(bl, nomeV + '.png'), 'image/png');
    else if (t === 'pdf') { await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'); const pdf = new jspdf.jsPDF({ orientation: cv.width > cv.height ? 'landscape' : 'portrait', unit: 'px', format: [cv.width, cv.height] });
      pdf.addImage(cv.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, cv.width, cv.height); pdf.save(nomeV + '.pdf'); }
    else baixarArquivo(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(nomeV)}</title><style>body{margin:0;background:#F3F5F4;padding:16px}img{max-width:100%;display:block;margin:0 auto}</style></head><body><img src="${cv.toDataURL('image/png')}" alt="Painel de viagens"></body></html>`, nomeV + '.html', 'text/html');
  } catch (err) { falha(err); } }));
  $('#vp-xls').onclick = () => ocupado($('#vp-xls'), async () => { await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Painel de viagens', `${dataBR(ini)} a ${dataBR(fim)}`], [], ['Faturamento realizado', fat], ['Em aberto', fatAberto], ['Viagens entregues', feitas.length], ['Meta até hoje', metaAteHoje], ['Atingimento', ating / 100], ['Meta do período', metaPeriodo], ['Ticket médio', ticket]]), 'Resumo');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(porDia.map(d => ({ Dia: dataBR(d.dia), 'Caminhões em operação': d.caminhoes, Meta: d.meta, Realizadas: d.feitas, '% do dia': d.meta ? d.feitas / d.meta : '', 'Acumulado realizado': d.acum ?? '', 'Acumulado meta': d.acumMeta ?? '', Faturamento: d.fat }))), 'Por dia');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vs.map(v => ({ Viagem: v.numero, 'Situação': (ST_VIA[v.status] || [v.status])[0], Frota: v.eq?.codigo_frota, Motorista: v.m?.nome, Cliente: v.cl?.nome, Origem: v.origem, Destino: v.destino,
      'Saída': dataHoraBR(v.saida_em || v.saida_prevista), Entrega: dataHoraBR(v.chegada_em), NF: v.nf_numero, 'CT-e': v.cte_numero, 'Peso (t)': v.peso_t, Valor: Number(v.valor_frete || 0) }))), 'Viagens');
    XLSX.writeFile(wb, `Painel de viagens ${ini} a ${fim}.xlsx`); });
});


// ---------- Gestão operacional: tempos por apontamento do motorista (E09 do Creare), ciclos, vazio × carregado, não apontado ----------
const GO_CAT = { deslocamento: ['Deslocamento', '#56A8E8'], fila_carregamento: ['Fila do carregamento', '#E2B93B'], carregamento: ['Carregando', '#2BB673'], amarracao: ['Amarração', '#6FCF97'],
  aguardando_documento: ['Aguardando documento', '#F2994A'], fila_balanca: ['Fila balança', '#C5A3FF'], fila_descarga: ['Fila descarga', '#B39DDB'], descarga: ['Descarregando', '#4DD0E1'],
  limpeza: ['Limpeza carreta', '#A1887F'], manutencao: ['Manutenção', '#EB5757'], abastecimento: ['Abastecimento', '#9AA5B1'], refeicao: ['Refeição', '#CFD8DC'], descanso: ['Descanso', '#78909C'],
  necessidades: ['Necessidades', '#B0BEC5'], jornada: ['Jornada (turno, checklist)', '#90A4AE'], parada: ['Outras paradas', '#8D6E63'], nao_apontado: ['NÃO APONTADO', '#D64545'], outros: ['Outros', '#5F7A70'] };
const goH = h => { const m = Math.round((+h || 0) * 60); return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`; };
rota('/operacao/gestao', async tela => {
  if (!document.getElementById('pl-css')) document.head.insertAdjacentHTML('beforeend', plCss);
  plLargo();
  const P = estado.params, hoje = hojeISO(), ini = P.get('de') || new Date(Date.now() - 6 * 864e5).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }), fim = P.get('ate') || hoje;
  let g, ult;
  try { [g, ult] = await Promise.all([api.rpc('gestao_operacional', { p_ini: new Date(ini + 'T00:00:00').toISOString(), p_fim: new Date(fim + 'T23:59:59').toISOString() }),
    api.listar('creare_apontamentos', 'select=inicio,importado_em&order=inicio.desc&limit=1').catch(() => [])]); } catch (err) { falha(err); return; }
  g = g || {}; const op = g.operacoes || {}, pc = g.por_categoria || {}, tot = Object.values(pc).reduce((t, v) => t + +v, 0) || 0, de = g.deslocamento || {};
  const fila = (+pc.fila_carregamento || 0) + (+pc.fila_descarga || 0) + (+pc.fila_balanca || 0);
  const pctV = (+de.vazio_km + +de.carregado_km) ? Math.round(+de.vazio_km * 100 / (+de.vazio_km + +de.carregado_km)) : 0;
  const card = (cor, t, v, sub = '') => `<div class="pl-c" style="--cor:${cor}"><h3>${t}</h3><div class="pl-n" style="font-size:clamp(22px,2vw,34px);white-space:nowrap">${v}</div>${sub ? `<div class="pl-pct" style="text-transform:none;letter-spacing:.3px">${sub}</div>` : ''}</div>`;
  const cats = Object.entries(pc).sort((a, b) => b[1] - a[1]);
  const barras = cats.map(([k, v]) => `<div style="display:grid;grid-template-columns:190px 1fr 70px;gap:10px;align-items:center;margin:5px 0;font-size:12.5px;color:#DCE8E3">
    <span>${esc((GO_CAT[k] || [k])[0])}</span><span style="background:rgba(255,255,255,.06);border-radius:6px;height:14px;overflow:hidden"><i style="display:block;height:100%;width:${tot ? (v * 100 / cats[0][1]).toFixed(1) : 0}%;background:${(GO_CAT[k] || [0, '#5F7A70'])[1]}"></i></span>
    <b style="text-align:right">${goH(v)}</b></div>`).join('');
  const cl = (g.ciclos || {}).lista || [], et = {}; cl.forEach(c => Object.entries(c.etapas || {}).forEach(([k, v]) => { (et[k] ||= []).push(+v); }));
  const etapas = ['fila_carregamento', 'carregamento', 'amarracao', 'aguardando_documento', 'deslocamento_carregado', 'fila_balanca', 'fila_descarga', 'descarga', 'limpeza', 'deslocamento_vazio', 'manutencao', 'descanso', 'refeicao', 'nao_apontado']
    .filter(k => et[k]).map(k => [k, et[k].reduce((a, b) => a + b, 0) / cl.length]);
  const nomeEt = k => k === 'deslocamento_carregado' ? 'Deslocamento carregado' : k === 'deslocamento_vazio' ? 'Deslocamento vazio' : (GO_CAT[k] || [k])[0];
  tela.innerHTML = `<div class="pl-wrap">
    <div class="topo"><div><h1>Gestão operacional</h1><p class="sub">Tempos pelos apontamentos dos motoristas (relatório E09 do Creare) · ciclo, filas, vazio × carregado, não apontado</p></div>
      <div class="acoes"><button class="btn" data-gexp="png">Imagem (PNG)</button><button class="btn" data-gexp="pdf">PDF</button><button class="btn" id="go-xls">Excel</button></div></div>
    <form class="filtros pl-barra" id="go-f"><label>De <input type="date" name="de" value="${ini}"></label><label>Até <input type="date" name="ate" value="${fim}"></label><button class="btn prim">Ver</button>
      <button type="button" class="btn" data-per="1">Ontem</button><button type="button" class="btn" data-per="7">Últimos 7 dias</button><button type="button" class="btn" data-per="mes">Este mês</button>
      <span class="muted">${ult?.[0] ? 'Apontamentos até ' + dataHoraBR(ult[0].inicio) + ' · importado ' + dataHoraBR(ult[0].importado_em) : 'Sem apontamentos importados'}</span></form>
    ${plAbas('operacional')}
    <div id="go-exp"><div class="pl-painel">
      <div class="pl-topo" style="margin-bottom:14px"><img src="logo.png" alt="Verbo"><div class="pl-tit"><h1>GESTÃO <b>OPERACIONAL</b></h1><p>APONTAMENTOS DOS MOTORISTAS · CREARE</p></div><div class="pl-hora"><small>PERÍODO</small>${dataBR(ini)} a ${dataBR(fim)}</div></div>
      <div class="pl-l4" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr))">
        ${card('#4DD0E1', 'Viagens (descargas)', op.descargas || 0, `${op.viagens_sistema ?? 0} lançadas no sistema${(op.viagens_sistema ?? 0) !== (op.descargas || 0) ? ' · <b style="color:#F2994A">conferir</b>' : ' · confere'} · ${op.carregamentos || 0} carregamentos`)}
        ${card('#2BB673', 'Ciclo médio', goH((g.ciclos || {}).medio_h), `${(g.ciclos || {}).qtd || 0} ciclos completos (carga → próxima carga)`)}
        ${card('#E2B93B', 'Tempo em filas', goH(fila), 'carregamento + balança + descarga')}
        ${card('#F2994A', 'Aguardando documento', goH(pc.aguardando_documento), tot ? Math.round((+pc.aguardando_documento || 0) * 100 / tot) + '% do tempo apontado' : '')}
        ${card('#D64545', 'Não apontado', goH(pc.nao_apontado), tot ? Math.round((+pc.nao_apontado || 0) * 100 / tot) + '% do tempo' : '')}
        ${card('#56A8E8', 'Km vazio × carregado', `${Math.round(+de.vazio_km || 0).toLocaleString('pt-BR')} × ${Math.round(+de.carregado_km || 0).toLocaleString('pt-BR')}`, `${pctV}% rodado vazio`)}</div>
      <div class="pl-grade" style="margin-top:14px"><div class="pl-c" style="--cor:#DDA936"><h3>${PL_IC.pizza}Distribuição do tempo por apontamento</h3><div style="margin-top:10px">${barras || '<div class="muted">Sem dados no período.</div>'}</div></div>
        <div class="pl-c" style="--cor:#2BB673"><h3>${PL_IC.caminhao}Ciclo médio por etapa</h3><div style="margin-top:10px">${etapas.length ? etapas.map(([k, v]) => `<div style="display:flex;justify-content:space-between;font-size:13px;color:#DCE8E3;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.06)"><span>${esc(nomeEt(k))}</span><b>${goH(v)}</b></div>`).join('') + `<div style="display:flex;justify-content:space-between;font-size:14px;color:#fff;padding:8px 0"><span>Ciclo médio (carregamento a carregamento)</span><b>${goH((g.ciclos || {}).medio_h)}</b></div>` : '<div class="muted">Nenhum ciclo completo no período.</div>'}</div></div></div></div>
    <div class="cartao"><h2>Por frota</h2><div class="tabela-wrap"><table class="tabela compacta"><thead><tr><th>Frota</th><th>Horas apontadas</th><th>Produtivas</th><th>Não apontado</th><th>Aguardando documento</th><th>Filas</th><th>Manutenção</th><th>Km</th><th>Descargas</th></tr></thead><tbody>
      ${(g.por_frota || []).map(f => { const c = f.cat || {}; return `<tr><td><b>${esc(f.frota)}</b> <span class="muted">${esc(f.placa)}</span></td><td>${goH(f.horas)}</td><td>${goH(f.produtivo_h)}</td><td><span class="tag ${+f.nao_apontado_h > 1 ? 'vermelho' : ''}">${goH(f.nao_apontado_h)}</span></td>
        <td>${goH(c.aguardando_documento)}</td><td>${goH((+c.fila_carregamento || 0) + (+c.fila_descarga || 0) + (+c.fila_balanca || 0))}</td><td>${goH(c.manutencao)}</td><td>${Math.round(+f.km || 0).toLocaleString('pt-BR')}</td><td>${f.descargas}</td></tr>`; }).join('') || '<tr><td colspan="9" class="vazio">Sem dados.</td></tr>'}</tbody></table></div></div>
    <div class="cartao"><h2>Por motorista</h2><div class="tabela-wrap"><table class="tabela compacta"><thead><tr><th>Motorista</th><th>Horas apontadas</th><th>Produtivas</th><th>Vezes "não apontado"</th><th>Tempo não apontado</th><th>Apontamentos</th></tr></thead><tbody>
      ${(g.por_motorista || []).map(m => `<tr><td><b>${esc(m.motorista)}</b></td><td>${goH(m.horas)}</td><td>${goH(m.produtivo_h)}</td><td>${m.nao_apontado_n}</td><td><span class="tag ${+m.nao_apontado_h > 2 ? 'vermelho' : ''}">${goH(m.nao_apontado_h)}</span></td><td>${m.apontamentos}</td></tr>`).join('') || '<tr><td colspan="6" class="vazio">Sem dados.</td></tr>'}</tbody></table></div></div>
    <div class="cartao"><h2>Ciclos (${cl.length})</h2><div class="tabela-wrap"><table class="tabela compacta"><thead><tr><th>Frota</th><th>Início do carregamento</th><th>Próximo carregamento</th><th>Ciclo</th><th>Fila carreg.</th><th>Desl. carregado</th><th>Filas fábrica</th><th>Desl. vazio</th><th>Não apontado</th></tr></thead><tbody>
      ${cl.map(c => { const e = c.etapas || {}; return `<tr><td><b>${esc(c.frota)}</b></td><td>${dataHoraBR(c.inicio)}</td><td>${dataHoraBR(c.fim)}</td><td><b>${goH(c.horas)}</b></td><td>${goH(e.fila_carregamento)}</td><td>${goH(e.deslocamento_carregado)}</td><td>${goH((+e.fila_balanca || 0) + (+e.fila_descarga || 0))}</td><td>${goH(e.deslocamento_vazio)}</td><td>${goH(e.nao_apontado)}</td></tr>`; }).join('') || '<tr><td colspan="9" class="vazio">Nenhum ciclo completo.</td></tr>'}</tbody></table></div></div>
    <div class="cartao"><h2>Por dia</h2><div class="tabela-wrap"><table class="tabela compacta"><thead><tr><th>Dia</th><th>Deslocamento</th><th>Filas</th><th>Carregando</th><th>Descarregando</th><th>Aguardando documento</th><th>Manutenção</th><th>Não apontado</th><th>Descargas</th></tr></thead><tbody>
      ${(g.por_dia || []).map(d => { const c = d.cat || {}; return `<tr><td>${dataBR(d.dia)}</td><td>${goH(c.deslocamento)}</td><td>${goH((+c.fila_carregamento || 0) + (+c.fila_descarga || 0) + (+c.fila_balanca || 0))}</td><td>${goH(c.carregamento)}</td><td>${goH(c.descarga)}</td><td>${goH(c.aguardando_documento)}</td><td>${goH(c.manutencao)}</td><td>${goH(c.nao_apontado)}</td><td>${d.descargas}</td></tr>`; }).join('') || '<tr><td colspan="9" class="vazio">Sem dados.</td></tr>'}</tbody></table></div></div></div>
    <div class="cartao"><h2>Códigos de apontamento do Creare</h2><p class="muted">Cada código é agrupado numa categoria. Os códigos terminados em 1 e 2 são o mesmo apontamento; vazio ou carregado é calculado pela sequência (depois de carregar = carregado; depois de descarregar = vazio).</p>
      <div class="tabela-wrap"><table class="tabela compacta"><thead><tr><th>Código</th><th>Grupo</th><th>Mensagem</th><th>Categoria</th><th>Vezes</th><th>Horas no período</th></tr></thead><tbody>
      ${(g.eventos || []).map(e => `<tr><td>${e.codigo}</td><td>${esc(e.grupo || '')}</td><td>${esc(e.mensagem || '')}</td><td><span class="pl-sel" style="background:${(GO_CAT[e.categoria] || [0, '#5F7A70'])[1]}">${esc((GO_CAT[e.categoria] || [e.categoria])[0])}</span></td><td>${e.qtd}</td><td>${goH(e.horas)}</td></tr>`).join('')}</tbody></table></div></div></div>`;
  const f = $('#go-f'); f.onsubmit = e => { e.preventDefault(); location.hash = `#/operacao/gestao?de=${f.de.value}&ate=${f.ate.value}`; };
  const dia = d => new Date(Date.now() - d * 864e5).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  $$('[data-per]', f).forEach(b => b.onclick = () => { const p = b.dataset.per; const de = p === 'mes' ? hoje.slice(0, 8) + '01' : p === '1' ? dia(1) : dia(6), ate = p === '1' ? dia(1) : hoje; location.hash = `#/operacao/gestao?de=${de}&ate=${ate}`; });
  const nome = `Gestão operacional ${dataBR(ini).replace(/\//g, '-')} a ${dataBR(fim).replace(/\//g, '-')}`;
  const imagemG = async () => { if (!window.html2canvas) await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    return html2canvas($('#go-exp'), { scale: 2, useCORS: true, backgroundColor: '#F3F5F4', logging: false, windowWidth: 1700, width: 1600,
      onclone: d => { const el = d.getElementById('go-exp'); if (el) { el.style.width = '1600px'; el.style.padding = '16px'; el.querySelectorAll('.exportar,.hbar').forEach(x => x.remove()); } } }); };
  window.PL_CAP = { k: 'operacional', nome, imagem: imagemG };
  $$('[data-gexp]', tela).forEach(b => b.onclick = () => ocupado(b, async () => { try { const cv = await imagemG();
    if (b.dataset.gexp === 'png') cv.toBlob(bl => baixarArquivo(bl, nome + '.png'), 'image/png');
    else { await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'); const pdf = new jspdf.jsPDF({ orientation: 'portrait', unit: 'px', format: [cv.width, cv.height] }); pdf.addImage(cv.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, cv.width, cv.height); pdf.save(nome + '.pdf'); }
  } catch (err) { falha(err); } }));
  $('#go-xls').onclick = () => ocupado($('#go-xls'), async () => { await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cats.map(([k, v]) => ({ Apontamento: (GO_CAT[k] || [k])[0], Horas: +v }))), 'Tempo por apontamento');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((g.por_frota || []).map(x => ({ Frota: x.frota, Placa: x.placa, Horas: +x.horas, Produtivas: +x.produtivo_h, 'Não apontado (h)': +x.nao_apontado_h, Km: +x.km, Descargas: x.descargas, ...Object.fromEntries(Object.entries(x.cat || {}).map(([k, v]) => [(GO_CAT[k] || [k])[0], +v])) }))), 'Por frota');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((g.por_motorista || []).map(x => ({ Motorista: x.motorista, Horas: +x.horas, Produtivas: +x.produtivo_h, 'Vezes não apontado': x.nao_apontado_n, 'Não apontado (h)': +x.nao_apontado_h, Apontamentos: x.apontamentos }))), 'Por motorista');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cl.map(c => ({ Frota: c.frota, 'Início': dataHoraBR(c.inicio), 'Próximo carregamento': dataHoraBR(c.fim), 'Ciclo (h)': +c.horas, ...Object.fromEntries(Object.entries(c.etapas || {}).map(([k, v]) => [nomeEt(k), +v])) }))), 'Ciclos');
    const ap = await api.listar('creare_apontamentos', `inicio=gte.${new Date(ini + 'T00:00:00').toISOString()}&inicio=lte.${new Date(fim + 'T23:59:59').toISOString()}&order=placa,inicio&limit=20000`).catch(() => []);
    const evs = Object.fromEntries((g.eventos || []).map(e => [e.codigo, e]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ap.map(a => ({ Placa: a.placa, Motorista: a.motorista, 'Código': a.codigo, Mensagem: evs[a.codigo]?.mensagem, Categoria: (GO_CAT[evs[a.codigo]?.categoria] || [evs[a.codigo]?.categoria])[0], 'Início': dataHoraBR(a.inicio), Fim: dataHoraBR(a.fim), Minutos: +a.minutos, 'Distância (km)': +a.distancia_km, Carregado: a.carregado == null ? '' : a.carregado ? 'Sim' : 'Não', Latitude: +a.lat, Longitude: +a.lng }))), 'Apontamentos');
    XLSX.writeFile(wb, nome + '.xlsx'); });
});

// ---------- Segurança na condução: Creare (B02 velocidade, B15 condução ininterrupta, B19 parada com motor ligado) + GoAwake (fadiga) ----------
const SG_TIPO = { velocidade: ['Excesso de velocidade', '#EB5757'], conducao_continua: ['Condução sem pausa', '#F2994A'], motor_ligado: ['Parado com motor ligado', '#E2B93B'], fadiga: ['Câmera (GoAwake)', '#C5A3FF'], distracao: ['Distração (GoAwake)', '#B39DDB'] };
const sgH = s => { const m = Math.round((+s || 0) / 60); return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`; };
// fotos dos alertas da GoAwake: os links da GoAwake expiram, então a foto é copiada para os anexos do sistema (entidade seg_evento)
window.sgSalvarFotos = async (dias = 15) => {
  const ev = await api.listar('seguranca_eventos', `fonte=eq.goawake&inicio=gte.${new Date(Date.now() - dias * 864e5).toISOString()}&select=id,dados&limit=2000`);
  const ja = new Set((await api.listar('anexos', `entidade=eq.seg_evento&select=entidade_id&limit=10000`)).map(a => a.entidade_id));
  let n = 0, erros = 0;
  for (const e of ev.filter(x => !ja.has(x.id) && (x.dados?.fotos || []).length)) {
    const files = [];
    for (const [k, u] of e.dados.fotos.entries()) { try { const b = await fetch(u).then(r => { if (!r.ok) throw new Error(r.status); return r.blob(); });
      const bmp = await createImageBitmap(b), cv = document.createElement('canvas'), esc2 = Math.min(1, 960 / bmp.width); cv.width = Math.round(bmp.width * esc2); cv.height = Math.round(bmp.height * esc2);
      cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height); const j = await new Promise(ok => cv.toBlob(ok, 'image/jpeg', 0.8));
      files.push(new File([j], `goawake-${e.dados.id}-${k === 0 ? 'cabine' : 'frontal'}.jpg`, { type: 'image/jpeg' })); } catch (er) { erros++; } }
    if (files.length) { await anexar('seg_evento', e.id, files, 'Foto do alerta GoAwake'); n++; } }
  return { salvas: n, erros };
};
const sgAcao = a => !a ? '<span class="tag amarelo">Sem tratativa</span>' : /^v[áa]lid/i.test(a) ? '<span class="tag vermelho">Válida</span>' : /inv[áa]lid/i.test(a) ? '<span class="tag">Inválida</span>' : esc(a);
rota('/operacao/seguranca', async tela => {
  if (!document.getElementById('pl-css')) document.head.insertAdjacentHTML('beforeend', plCss);
  plLargo();
  const P = estado.params, hoje = hojeISO(), ini = P.get('de') || new Date(Date.now() - 6 * 864e5).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }), fim = P.get('ate') || hoje, tf = P.get('tipo') || '';
  let ev, ult;
  try { [ev, ult] = await Promise.all([api.listar('seguranca_eventos', `inicio=gte.${new Date(ini + 'T00:00:00').toISOString()}&inicio=lte.${new Date(fim + 'T23:59:59').toISOString()}&order=inicio.desc&limit=5000&select=*,eq:equipamentos(codigo_frota)`),
    api.listar('seguranca_eventos', 'select=importado_em&order=importado_em.desc&limit=1').catch(() => [])]); } catch (err) { falha(err); return; }
  ev = ev || []; const fr = e => e.eq?.codigo_frota || e.placa, de = t => ev.filter(e => e.tipo === t);
  const vel = de('velocidade'), cc = de('conducao_continua'), ml = de('motor_ligado'), fad = ev.filter(e => e.fonte === 'goawake'), fadVal = fad.filter(e => e.acao === 'Válido');
  const porCls = Object.entries(fadVal.reduce((o, e) => { const k = e.local || '—'; o[k] = (o[k] || 0) + 1; return o; }, {})).sort((a, b) => b[1] - a[1]);
  const fotos = {}; try { const ids = fad.map(e => e.id); if (ids.length) (await api.listar('anexos', `entidade=eq.seg_evento&cancelado_em=is.null&entidade_id=in.(${ids.join(',')})&select=entidade_id,caminho_arquivo,nome_original&order=nome_original`)).forEach(a => (fotos[a.entidade_id] ||= []).push(a.caminho_arquivo)); } catch (e) { }
  const galeria = fadVal.filter(e => fotos[e.id]).slice(0, 12);
  const links = {}; await Promise.all(galeria.map(async e => { try { links[e.id] = await api.linkArquivo(fotos[e.id][0]); } catch (er) { } }));
  const velVal = vel.filter(e => /^v[áa]lid/i.test(e.acao || '')).length, velInv = vel.filter(e => /inv[áa]lid/i.test(e.acao || '')).length;
  const mlS = ml.reduce((t, e) => t + (+e.duracao_s || 0), 0), ccExc = cc.reduce((t, e) => t + (+e.excesso_s || 0), 0);
  const card = (cor, t, v, sub = '') => `<div class="pl-c" style="--cor:${cor}"><h3>${t}</h3><div class="pl-n" style="font-size:clamp(22px,2vw,34px);white-space:nowrap">${v}</div>${sub ? `<div class="pl-pct" style="text-transform:none;letter-spacing:.3px">${sub}</div>` : ''}</div>`;
  const agrupa = k => Object.values(ev.reduce((o, e) => { const c = k(e) || '—'; const x = (o[c] ||= { nome: c, velocidade: 0, velMax: 0, conducao_continua: 0, ccExc: 0, motor_ligado: 0, mlS: 0, goawake: 0, total: 0 });
    if (e.fonte === 'goawake' && e.acao !== 'Válido') return o; x.total++; if (e.fonte === 'goawake') x.goawake++; else x[e.tipo] = (x[e.tipo] || 0) + 1; if (e.tipo === 'velocidade') x.velMax = Math.max(x.velMax, +e.valor || 0);
    if (e.tipo === 'conducao_continua') x.ccExc += +e.excesso_s || 0; if (e.tipo === 'motor_ligado') x.mlS += +e.duracao_s || 0; return o; }, {})).sort((a, b) => b.velocidade - a.velocidade || b.conducao_continua - a.conducao_continua || b.mlS - a.mlS);
  const porMot = agrupa(e => e.motorista), porFrota = agrupa(fr);
  const porVig = Object.entries(ml.reduce((o, e) => { const k = (e.local || '—').replace(/\s*\/\s*$/, ''); (o[k] ||= [0, 0]); o[k][0]++; o[k][1] += +e.duracao_s || 0; return o; }, {})).sort((a, b) => b[1][1] - a[1][1]);
  const dias = []; for (let d = new Date(ini + 'T12:00:00'); d <= new Date(fim + 'T12:00:00'); d.setDate(d.getDate() + 1)) dias.push(d.toLocaleDateString('sv-SE'));
  const porDia = dias.map(d => { const x = ev.filter(e => new Date(e.inicio).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }) === d); return { d, v: x.filter(e => e.tipo === 'velocidade').length, c: x.filter(e => e.tipo === 'conducao_continua').length, m: x.filter(e => e.tipo === 'motor_ligado').length, g: x.filter(e => e.fonte === 'goawake' && e.acao === 'Válido').length }; });
  const mx = Math.max(1, ...porDia.map(x => x.v + x.c + x.m + x.g)), W = 1100, H = 220, pl = 40, bw = (W - pl - 10) / Math.max(1, porDia.length);
  const graf = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">${porDia.map((x, i) => { let y = H - 28; return [['m', '#E2B93B'], ['c', '#F2994A'], ['v', '#EB5757'], ['g', '#C5A3FF']].map(([k, cor]) => { const h = x[k] * (H - 50) / mx; y -= h; return h ? `<rect x="${pl + i * bw + 3}" y="${y}" width="${bw - 6}" height="${h}" fill="${cor}" rx="2"><title>${dataBR(x.d)}: ${x[k]}</title></rect>` : ''; }).join('') + `<text x="${pl + i * bw + bw / 2}" y="${H - 12}" font-size="11" fill="#DCE8E3" text-anchor="middle">${x.d.slice(8)}/${x.d.slice(5, 7)}</text>${x.v + x.c + x.m + x.g ? `<text x="${pl + i * bw + bw / 2}" y="${y - 4}" font-size="11" fill="#fff" text-anchor="middle">${x.v + x.c + x.m + x.g}</text>` : ''}`; }).join('')}</svg>
    <div class="pl-leg"><span><i style="background:#EB5757"></i>Velocidade</span><span><i style="background:#F2994A"></i>Condução sem pausa</span><span><i style="background:#E2B93B"></i>Motor ligado parado</span><span><i style="background:#C5A3FF"></i>Câmera GoAwake (validados)</span></div>`;
  const lista = tf ? ev.filter(e => e.tipo === tf) : ev;
  tela.innerHTML = `<div class="pl-wrap">
    <div class="topo"><div><h1>Segurança na condução</h1><p class="sub">Infrações do Creare (velocidade, condução sem pausa, parada com motor ligado) e alertas de fadiga da GoAwake</p></div>
      <div class="acoes"><button class="btn" data-sexp="png">Imagem (PNG)</button><button class="btn" data-sexp="pdf">PDF</button><button class="btn" id="sg-xls">Excel</button></div></div>
    <form class="filtros pl-barra" id="sg-f"><label>De <input type="date" name="de" value="${ini}"></label><label>Até <input type="date" name="ate" value="${fim}"></label><button class="btn prim">Ver</button>
      <button type="button" class="btn" data-per="1">Ontem</button><button type="button" class="btn" data-per="7">Últimos 7 dias</button><button type="button" class="btn" data-per="mes">Este mês</button>
      <span class="muted">${ult?.[0] ? 'Importado do Creare em ' + dataHoraBR(ult[0].importado_em) : 'Ainda sem importação'}</span></form>
    ${plAbas('seguranca')}
    <div id="sg-exp"><div class="pl-painel">
      <div class="pl-topo" style="margin-bottom:14px"><img src="logo.png" alt="Verbo"><div class="pl-tit"><h1>SEGURANÇA NA <b>CONDUÇÃO</b></h1><p>CREARE · GOAWAKE</p></div><div class="pl-hora"><small>PERÍODO</small>${dataBR(ini)} a ${dataBR(fim)}</div></div>
      <div class="pl-l4" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
        ${card('#EB5757', 'Excesso de velocidade', vel.length, vel.length ? `máx. ${Math.max(...vel.map(e => +e.valor || 0))} km/h · ${velVal} válida(s) · ${velInv} inválida(s) · ${vel.length - velVal - velInv} sem tratativa` : 'nenhuma no período')}
        ${card('#F2994A', 'Condução sem pausa', cc.length, cc.length ? `${sgH(ccExc)} além do limite` : 'nenhuma no período')}
        ${card('#E2B93B', 'Parado com motor ligado', ml.length, ml.length ? `${sgH(mlS)} no total · média ${Math.round(mlS / ml.length / 60)} min` : 'nenhuma no período')}
        ${card('#C5A3FF', 'Câmera (GoAwake)', fadVal.length, fad.length ? `${porCls.map(([k, n]) => `${n} ${esc(k.toLowerCase())}`).join(' · ')}${fad.length - fadVal.length ? ` · ${fad.length - fadVal.length} invalidado(s) pela central` : ''}` : 'nenhum alerta no período')}</div>
      ${galeria.length ? `<div class="pl-c" style="--cor:#C5A3FF;margin-top:14px"><h3>${PL_IC.alerta}Alertas da câmera validados pela central (GoAwake)</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px;margin-top:10px">${galeria.map(e => `<div style="background:rgba(0,0,0,.25);border-radius:10px;overflow:hidden">
          ${links[e.id] ? `<img src="${esc(links[e.id])}" crossorigin="anonymous" alt="Foto do alerta" style="width:100%;aspect-ratio:4/3;object-fit:cover;display:block;cursor:zoom-in" data-sgfoto="${e.id}">` : ''}
          <div style="padding:8px 10px;font-size:12px;color:#DCE8E3"><span data-sgvideo="${e.id}" class="exportar" style="float:right;cursor:pointer;color:#C5A3FF" title="Assistir na GoAwake">▶ vídeo</span><b style="color:#fff">${esc(e.local || '')}</b> · ${esc(fr(e))}<br>${dataHoraBR(e.inicio)} · ${e.valor ?? '—'} km/h<br><span style="color:#9FB8AE">${esc(e.motorista || 'Motorista não identificado')}</span><br><span style="color:#C5A3FF">${esc(e.dados?.tratativa || '')}</span></div></div>`).join('')}</div></div>` : ''}
      <div class="pl-c" style="--cor:#DDA936;margin-top:14px"><h3>${PL_IC.alerta}Eventos por dia</h3>${graf}</div>
      <div class="pl-grade" style="margin-top:14px;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr)">
        <div class="pl-c" style="--cor:#EB5757"><h3>${PL_IC.pessoa}Motoristas</h3><table style="width:100%;border-collapse:collapse;font-size:13px;color:#EAF2EE;margin-top:8px"><thead><tr style="color:#DDA936;font-size:11px;text-align:left"><th style="padding:5px">MOTORISTA</th><th>VELOC.</th><th>MÁX.</th><th>SEM PAUSA</th><th>MOTOR LIGADO</th><th>FADIGA</th></tr></thead><tbody>
          ${porMot.map(x => `<tr style="border-top:1px solid rgba(255,255,255,.1)"><td style="padding:5px"><b>${esc(x.nome)}</b></td><td>${x.velocidade || '—'}</td><td>${x.velMax ? x.velMax + ' km/h' : '—'}</td><td>${x.conducao_continua ? `${x.conducao_continua} · +${sgH(x.ccExc)}` : '—'}</td><td>${x.motor_ligado ? `${x.motor_ligado} · ${sgH(x.mlS)}` : '—'}</td><td>${x.goawake || '—'}</td></tr>`).join('') || '<tr><td colspan="6" style="padding:6px;color:#9FB8AE">Sem eventos.</td></tr>'}</tbody></table></div>
        <div class="pl-c" style="--cor:#E2B93B"><h3>${PL_IC.chave}Motor ligado parado · apontamento no momento</h3><table style="width:100%;border-collapse:collapse;font-size:13px;color:#EAF2EE;margin-top:8px"><tbody>
          ${porVig.map(([k, [n, s]]) => `<tr style="border-top:1px solid rgba(255,255,255,.1)"><td style="padding:5px">${esc(k)}</td><td>${n}x</td><td><b>${sgH(s)}</b></td></tr>`).join('') || '<tr><td style="padding:6px;color:#9FB8AE">Sem eventos.</td></tr>'}</tbody></table>
          <p style="color:#9FB8AE;font-size:11.5px;margin:8px 0 0">Motor ligado com o caminhão parado acima do limite do Creare (10 min). Consumo e desgaste sem produzir.</p></div></div></div></div>
    <div class="cartao"><h2>Por frota</h2><div class="tabela-wrap"><table class="tabela compacta"><thead><tr><th>Frota</th><th>Velocidade</th><th>Máx.</th><th>Condução sem pausa</th><th>Motor ligado parado</th><th>Fadiga / distração</th><th>Total</th></tr></thead><tbody>
      ${porFrota.map(x => `<tr><td><b>${esc(x.nome)}</b></td><td>${x.velocidade}</td><td>${x.velMax ? x.velMax + ' km/h' : '—'}</td><td>${x.conducao_continua}${x.ccExc ? ' · +' + sgH(x.ccExc) : ''}</td><td>${x.motor_ligado}${x.mlS ? ' · ' + sgH(x.mlS) : ''}</td><td>${x.goawake}</td><td><b>${x.total}</b></td></tr>`).join('') || '<tr><td colspan="7" class="vazio">Sem eventos.</td></tr>'}</tbody></table></div></div>
    <div class="cartao"><h2>Eventos (${lista.length})</h2>
      <div class="filtros"><label>Tipo <select id="sg-tipo"><option value="">Todos</option>${Object.entries(SG_TIPO).map(([k, [t]]) => `<option value="${k}" ${tf === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
      <div class="tabela-wrap"><table class="tabela compacta"><thead><tr><th>Quando</th><th>Tipo</th><th>Frota</th><th>Motorista</th><th>Detalhe</th><th>Local / apontamento</th><th>Tratativa (Creare)</th></tr></thead><tbody>
      ${lista.slice(0, 500).map(e => `<tr><td>${dataHoraBR(e.inicio)}</td><td><span class="pl-sel" style="background:${(SG_TIPO[e.tipo] || [0, '#9AA5B1'])[1]}">${(SG_TIPO[e.tipo] || [e.tipo])[0]}</span></td><td><b>${esc(fr(e))}</b></td><td>${esc(e.motorista || '—')}</td>
        <td>${e.fonte === 'goawake' ? `<b>${esc(e.local || '')}</b> <span class="muted">(alerta original: ${esc(e.limite || '')})</span> · ${e.valor ?? '—'} km/h${e.dados?.tratativa ? `<div class="muted">Tratativa: ${esc(e.dados.tratativa)}${e.dados.comentario ? ' · ' + esc(e.dados.comentario) : ''}</div>` : ''}${fotos[e.id] ? ` <button type="button" class="btn peq" data-sgfoto="${e.id}">📷 Fotos</button>` : ''} <button type="button" class="btn peq" data-sgvideo="${e.id}" title="Os links de vídeo da GoAwake expiram em minutos: abre a Auditoria da GoAwake para assistir">▶ Vídeo (GoAwake)</button>${e.dados?.auditoria ? `<div class="muted">ID da auditoria GoAwake: ${e.dados.auditoria}</div>` : ''}` : e.tipo === 'velocidade' ? `<b>${e.valor} km/h</b> (limite ${esc(e.limite || '')}) · ${e.duracao_s}s` : e.tipo === 'conducao_continua' ? `${sgH(e.duracao_s)} dirigindo (limite ${esc(e.limite || '')}) · <b>+${sgH(e.excesso_s)}</b>` : e.tipo === 'motor_ligado' ? `<b>${sgH(e.duracao_s)}</b> parado ligado` : esc(e.limite || '')}</td>
        <td>${e.fonte === 'goawake' ? '' : esc(e.local || '')}${e.lat ? ` <a href="https://www.google.com/maps?q=${e.lat},${e.lng}" target="_blank" rel="noopener">mapa</a>` : ''}</td>
        <td>${e.tipo === 'motor_ligado' ? '<span class="muted">—</span>' : sgAcao(e.acao)}${e.acao_por ? `<div class="muted">${esc(e.acao_por)}${e.acao_em ? ' · ' + dataHoraBR(e.acao_em) : ''}</div>` : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="vazio">Nenhum evento.</td></tr>'}</tbody></table></div>
      <p class="muted">Fonte: relatórios B02, B15 e B19 do Creare, importados de hora em hora. A tratativa (válida/inválida) é a registrada pela central do Creare.</p></div></div>`;
  const f = $('#sg-f'), vai = (d1, d2, t = tf) => { location.hash = `#/operacao/seguranca?de=${d1}&ate=${d2}${t ? '&tipo=' + t : ''}`; };
  f.onsubmit = e => { e.preventDefault(); vai(f.de.value, f.ate.value); };
  const dia = d => new Date(Date.now() - d * 864e5).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  $$('[data-per]', f).forEach(b => b.onclick = () => { const p = b.dataset.per; vai(p === 'mes' ? hoje.slice(0, 8) + '01' : p === '1' ? dia(1) : dia(6), p === '1' ? dia(1) : hoje); });
  $('#sg-tipo').onchange = e => vai(ini, fim, e.target.value);
  $$('[data-sgvideo]', tela).forEach(b => b.onclick = async ev2 => { ev2.stopPropagation(); const e = ev.find(x => x.id === b.dataset.sgvideo); const ref = `${e.placa} · ${dataHoraBR(e.inicio)}${e.dados?.auditoria ? ' · ID da auditoria ' + e.dados.auditoria : ''}`;
    try { await navigator.clipboard.writeText(e.dados?.auditoria ? String(e.dados.auditoria) : ref); } catch (er) { }
    window.open('https://www.goawakecloud.com.br/#/pages/f/audit', '_blank', 'noopener');
    aviso(`Abrindo a Auditoria da GoAwake. Procure ${ref}${e.dados?.auditoria ? ' (ID já copiado)' : ''} e clique no alerta para ver o vídeo.`); });
  $$('[data-sgfoto]', tela).forEach(b => b.onclick = async () => { const e = ev.find(x => x.id === b.dataset.sgfoto); try { const us = await Promise.all((fotos[e.id] || []).map(c => api.linkArquivo(c)));
    modal(`<div><h2>${esc(e.local || 'Alerta')} · ${esc(fr(e))} · ${dataHoraBR(e.inicio)}</h2><p class="muted">${esc(e.motorista || 'Motorista não identificado')} · ${e.valor ?? '—'} km/h · alerta original: ${esc(e.limite || '')} · tratativa: ${esc(e.dados?.tratativa || '—')}${e.acao_por ? ' (' + esc(e.acao_por) + ')' : ''}</p>
      <div style="display:grid;gap:10px">${us.map(u => `<img src="${esc(u)}" alt="Foto" style="width:100%;border-radius:8px">`).join('')}</div><div class="rodape"><button type="button" class="btn" data-fechar>Fechar</button></div></div>`); } catch (err) { falha(err); } });
  const nome = `Segurança na condução ${dataBR(ini).replace(/\//g, '-')} a ${dataBR(fim).replace(/\//g, '-')}`;
  const imagemS = async () => { if (!window.html2canvas) await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    return html2canvas($('#sg-exp'), { scale: 2, useCORS: true, backgroundColor: '#F3F5F4', logging: false, windowWidth: 1700, width: 1600,
      onclone: d => { const el = d.getElementById('sg-exp'); if (!el) return; el.style.width = '1600px'; el.style.padding = '16px'; el.querySelectorAll('.exportar,.hbar').forEach(x => x.remove());
        el.querySelectorAll('svg[viewBox]').forEach(sv => { const [, , w, h] = sv.getAttribute('viewBox').split(' ').map(Number); if (w > 300) { sv.setAttribute('width', 1520); sv.setAttribute('height', Math.round(1520 * h / w)); sv.style.width = '1520px'; sv.style.height = Math.round(1520 * h / w) + 'px'; } }); } }); };
  window.PL_CAP = { k: 'seguranca', nome, imagem: imagemS };
  $$('[data-sexp]', tela).forEach(b => b.onclick = () => ocupado(b, async () => { try { const cv = await imagemS();
    if (b.dataset.sexp === 'png') cv.toBlob(bl => baixarArquivo(bl, nome + '.png'), 'image/png');
    else { await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'); const pdf = new jspdf.jsPDF({ orientation: 'portrait', unit: 'px', format: [cv.width, cv.height] }); pdf.addImage(cv.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, cv.width, cv.height); pdf.save(nome + '.pdf'); }
  } catch (err) { falha(err); } }));
  $('#sg-xls').onclick = () => ocupado($('#sg-xls'), async () => { await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(porMot.map(x => ({ Motorista: x.nome, 'Excesso de velocidade': x.velocidade, 'Velocidade máx. (km/h)': x.velMax || '', 'Condução sem pausa': x.conducao_continua, 'Tempo além do limite (h)': +(x.ccExc / 3600).toFixed(2), 'Motor ligado parado': x.motor_ligado, 'Horas motor ligado parado': +(x.mlS / 3600).toFixed(2), 'Fadiga / distração': x.goawake, Total: x.total }))), 'Motoristas');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ev.map(e => ({ Quando: dataHoraBR(e.inicio), Fim: e.fim ? dataHoraBR(e.fim) : '', Tipo: (SG_TIPO[e.tipo] || [e.tipo])[0], Fonte: e.fonte, Frota: fr(e), Placa: e.placa, Motorista: e.motorista, 'Duração (min)': e.duracao_s != null ? +(e.duracao_s / 60).toFixed(1) : '', 'Excesso (min)': e.excesso_s != null ? +(e.excesso_s / 60).toFixed(1) : '', Valor: e.valor, Limite: e.limite, 'Local / apontamento': e.local, 'Tratativa': e.acao, 'Tratado por': e.acao_por, 'Tratado em': e.acao_em ? dataHoraBR(e.acao_em) : '', Latitude: e.lat, Longitude: e.lng }))), 'Eventos');
    XLSX.writeFile(wb, nome + '.xlsx'); });
});
