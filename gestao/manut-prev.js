// Verbo Gestão — Manutenção › Preventivas (etapa 4)
// Planos gerais (por tipo de equipamento) ou de um equipamento só, por km e/ou dias (o que vencer primeiro).
// Km rodado desde a última preventiva vem do Creare (cavalo: apontamentos dele; composição: do cavalo que a puxava
// em cada atrelamento); sem Creare, usa o hodômetro. Dias contam da última OS preventiva encerrada.
// Calendário com a previsão (média de km/dia dos últimos 30 dias) e inspeções de 90 dias pelos documentos.
'use strict';

const MP_SIT = { vencida: ['Vencida', 'vermelho'], proxima: ['Próxima', 'amarelo'], em_dia: ['Em dia', 'verde'], sem_base: ['Falta a última preventiva', 'azul'] };
const MP_TIPOS_EQ = [['cavalo_mecanico', 'Cavalo mecânico'], ['caminhao', 'Caminhão'], ['tritrem', 'Tritrem'], ['bitrem', 'Bitrem'], ['rodotrem', 'Rodotrem'], ['carreta', 'Carreta'],
  ['carro', 'Carro'], ['utilitario', 'Utilitário'], ['motocicleta', 'Moto']];
const MP_CLASSE = { cavalo: 'Cavalos / caminhões', reboque: 'Composições', veiculo: 'Outros veículos' };
const mpFonte = f => ({ creare: 'Creare', creare_parcial: 'Creare (desde 01/11)', hodometro: 'hodômetro' }[f] || 'sem km');
const mpDias = d => d ? Math.round((new Date(String(d).slice(0, 10) + 'T12:00:00') - new Date(hojeISO() + 'T12:00:00')) / 864e5) : null;
const mpKm = v => v == null ? '—' : Math.round(Number(v)).toLocaleString('pt-BR') + ' km';
const mpResumo = x => { const p = [];
  if (x.situacao === 'sem_base') return 'falta informar a última preventiva';
  if (x.km_restante != null) p.push(x.km_restante <= 0 ? `passou ${mpKm(-x.km_restante)}` : `faltam ${mpKm(x.km_restante)}`);
  if (x.proxima_em) { const d = mpDias(x.proxima_em); p.push(d < 0 ? `vencida há ${-d} dia(s)` : d === 0 ? 'vence hoje' : `em ${d} dia(s) (${dataBR(x.proxima_em)})`); }
  return p.join(' · ') || (MP_SIT[x.situacao]?.[0] || ''); };

(() => { if (document.getElementById('mp-css')) return; const s = document.createElement('style'); s.id = 'mp-css'; s.textContent = `
.mp-kpis { display:grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap:12px; margin-bottom:14px }
.mp-kpi { display:block; text-decoration:none; color:inherit; background:#fff; border:1px solid #E3E8EC; border-radius:12px; padding:14px 16px; border-top:4px solid #00684A }
.mp-kpi .n { font-size:28px; font-weight:800; line-height:1.1 } .mp-kpi .r { color:#6B7378; font-size:13px; margin-top:4px }
.mp-kpi.v { border-top-color:#C62828 } .mp-kpi.v .n { color:#C62828 } .mp-kpi.p { border-top-color:#DDA936 } .mp-kpi.p .n { color:#8A5A00 } .mp-kpi.b { border-top-color:#2B6CB0 }
.mp-abas { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px } .mp-abas a { padding:8px 16px; border-radius:999px; border:1px solid #CFD8DE; text-decoration:none; color:inherit; background:#fff; font-weight:600 }
.mp-abas a.on { background:#00684A; color:#fff; border-color:#00684A }
.mp-cal { display:grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap:4px }
.mp-cal .h { font-size:12px; font-weight:700; color:#6B7378; text-align:center; padding:4px 0; text-transform:uppercase }
.mp-cal .d { min-height:96px; background:#fff; border:1px solid #E3E8EC; border-radius:8px; padding:4px 5px; overflow:hidden }
.mp-cal .d.fora { background:#F4F6F7; color:#A0A8AD } .mp-cal .d.hoje { border:2px solid #00684A }
.mp-cal .d .dn { font-size:12px; font-weight:700; margin-bottom:2px }
.mp-ev { display:block; font-size:11px; line-height:1.25; border-radius:4px; padding:2px 4px; margin:2px 0; text-decoration:none; color:#10241C; background:#E3F1EB; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
.mp-ev.vencida { background:#FBE3E1; color:#8E1B1B } .mp-ev.proxima { background:#FBF1D9; color:#6B4A00 } .mp-ev.insp { background:#E4ECF7; color:#1E4A7A }
@media (max-width: 760px) { .mp-cal .d { min-height:64px } .mp-ev { font-size:10px } }`; document.head.append(s); })();

// ---------- planos para marcar na OS preventiva (com a sugestão do sistema) ----------
async function mpCarregarPlanos(box, eqId, sel, form) {
  if (!box) return;
  if (!eqId) { box.innerHTML = '<span class="muted">Selecione a frota.</span>'; box.dataset.n = 0; return; }
  box.innerHTML = '<span class="muted">Carregando planos…</span>';
  const L = await api.rpc('manut_prev_sugestao', { p_eq: eqId }).catch(() => []) || [];
  box.dataset.n = L.length;
  if (!L.length) { box.innerHTML = `<span class="muted">Este equipamento não está em nenhum plano preventivo. ${editaManut() ? '<a href="#/manut/planos">Cadastrar ou aplicar planos</a>' : ''}</span>`; return; }
  const marcado = x => sel ? sel.includes(x.id) : x.sugerido;
  box.innerHTML = L.map(x => `<label title="${esc(x.servicos || '')}"><input type="checkbox" name="pe_${x.id}" ${marcado(x) ? 'checked' : ''}>${x.sugerido ? '★ ' : ''}${esc(x.plano)} <span style="font-weight:400;opacity:.8">· ${esc(mpResumo(x))}</span></label>`).join('')
    + '<div class="muted" style="font-size:12px;width:100%">★ sugerido pelo sistema (vencido ou próximo). Marque tudo o que será feito nesta OS.</div>';
  if (form?.problema && !form.problema.value) { const n = L.filter(marcado).map(x => x.plano); if (n.length) form.problema.value = 'Preventiva: ' + n.join(' + '); }
}

// ---------- na OS: planos executados e o que fazer ----------
async function mpSecaoOS(el, o, { ed, aberta }) {
  if (!el) return;
  const ps = await api.listar('manut_os_planos', `os_id=eq.${o.id}&ativo=eq.true&select=id,pe:manut_plano_equipamentos(id,ultima_em,plano:manut_planos(nome,servicos,meta_horas,intervalo_km,intervalo_dias))`).catch(() => []);
  el.hidden = false;
  el.innerHTML = `<div class="topo" style="margin:0 0 6px"><h2 style="margin:0">Plano preventivo</h2>${ed && aberta ? '<button class="btn peq" id="mp-alt">Alterar planos</button>' : ''}</div>
    ${ps.length ? ps.map(x => { const p = x.pe?.plano || {}; return `<div class="mo-linha"><b>${esc(p.nome || '')}</b> <span class="muted">· ${[p.intervalo_km && 'a cada ' + mpKm(p.intervalo_km), p.intervalo_dias && p.intervalo_dias + ' dias'].filter(Boolean).join(' ou ')}${p.meta_horas ? ' · meta de execução ' + String(p.meta_horas).replace('.', ',') + ' h' : ''}</span>
      ${p.servicos ? `<ul style="margin:6px 0 0 18px;padding:0">${p.servicos.split('\n').filter(Boolean).map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}</div>`; }).join('')
      : '<p style="margin:0"><span class="tag vermelho">obrigatório</span> escolha o(s) plano(s) preventivo(s) desta OS.</p>'}`;
  $('#mp-alt', el)?.addEventListener('click', async () => {
    let raiz = null;
    const r = await modal(`<form><h2>Planos desta OS</h2><div class="mo-chips" id="mp-box"></div><div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`,
      { aoAbrir: x => { raiz = x; mpCarregarPlanos($('#mp-box', x), o.equipamento_id, ps.map(p => p.pe?.id), null); } });
    if (!r) return;
    const pes = Object.keys(r).filter(k => k.startsWith('pe_') && r[k]).map(k => k.slice(3));
    try { await api.rpc('manut_os_definir_planos', { p_os: o.id, p_pes: pes }); aviso('Planos da OS atualizados.'); navegar(); } catch (err) { falha(err); }
  });
}

// ---------- informar a última preventiva (base do cálculo) ----------
async function mpInformarUltima(pes, rotulo) {
  const r = await modal(`<form><h2>Última preventiva</h2><p class="muted">${esc(rotulo)}. É a base para contar os km (Creare) e os dias até a próxima. Depois a própria OS preventiva encerrada atualiza.</p><div class="form">
    <label class="campo">Data da última preventiva *<input type="date" name="data" required max="${hojeISO()}"></label>
    <label class="campo">Km na última preventiva<input name="km" inputmode="numeric" placeholder="opcional (cavalo)"></label></div>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`);
  if (!r) return false;
  try { await api.alterar('manut_plano_equipamentos', `id=in.(${pes.join(',')})`, { ultima_em: new Date(r.data + 'T12:00:00').toISOString(), ultima_data: r.data, ...(r.km ? { ultima_km: Number(soDigitos(r.km)) } : {}) });
    aviso('Última preventiva registrada.'); return true; } catch (err) { falha(err); return false; }
}

// ===================== Painel: situação, calendário e inspeções =====================
rota('/manut/preventivas', async tela => {
  const ed = editaManut();
  const [L, I, planos] = await Promise.all([api.rpc('manut_prev_lista').catch(() => []), api.rpc('manut_inspecoes').catch(() => []), api.listar('manut_planos', 'ativo=eq.true&select=id,nome&order=nome')]);
  const lista = L || [], insp = I || [];
  const p = k => estado.params.get(k) || '', aba = p('aba') || 'situacao', fPl = p('plano'), fSit = p('sit'), fCl = p('cl'), fq = p('q').toLowerCase();
  const url = (o = {}) => '#/manut/preventivas?' + new URLSearchParams(Object.fromEntries(Object.entries({ aba, plano: fPl, sit: fSit, cl: fCl, q: fq, mes: p('mes'), ...o }).filter(([, v]) => v))).toString();
  const F = lista.filter(x => (!fPl || x.plano_id === fPl) && (!fSit || x.situacao === fSit) && (!fCl || x.classe === fCl) && (!fq || (x.codigo_frota || '').toLowerCase().includes(fq)));
  const n = s => lista.filter(x => x.situacao === s).length;
  const iS = x => !x.doc_id ? 'sem' : mpDias(x.vence) < 0 ? 'vencida' : mpDias(x.vence) <= 15 ? 'proxima' : 'em_dia';
  const nI = s => insp.filter(x => iS(x) === s).length;
  const kpis = `<div class="mp-kpis">
    <a class="mp-kpi v" href="${url({ aba: 'situacao', sit: 'vencida' })}"><div class="n">${n('vencida')}</div><div class="r">preventiva(s) vencida(s)</div></a>
    <a class="mp-kpi p" href="${url({ aba: 'situacao', sit: 'proxima' })}"><div class="n">${n('proxima')}</div><div class="r">próxima(s) do vencimento</div></a>
    <a class="mp-kpi b" href="${url({ aba: 'situacao', sit: 'sem_base' })}"><div class="n">${n('sem_base')}</div><div class="r">sem a última preventiva informada</div></a>
    <a class="mp-kpi" href="${url({ aba: 'situacao', sit: '' })}"><div class="n">${lista.filter(x => x.os_aberta_id).length}</div><div class="r">OS preventiva(s) em andamento</div></a>
    <a class="mp-kpi ${nI('vencida') ? 'v' : nI('proxima') ? 'p' : ''}" href="${url({ aba: 'inspecoes' })}"><div class="n">${nI('vencida') + nI('proxima')}</div><div class="r">inspeção(ões) de 90 dias vencida(s) ou em até 15 dias · ${nI('sem')} sem documento</div></a></div>`;
  const abas = `<div class="mp-abas">${[['situacao', 'Situação por equipamento'], ['calendario', 'Calendário'], ['inspecoes', 'Inspeções (90 dias)']].map(([k, t]) => `<a class="${aba === k ? 'on' : ''}" href="${url({ aba: k })}">${t}</a>`).join('')}</div>`;
  const filtros = `<form class="filtros" id="mp-f" style="margin:0 0 10px"><select name="plano"><option value="">Todos os planos</option>${planos.map(x => `<option value="${x.id}" ${x.id === fPl ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}</select>
    <select name="cl"><option value="">Todos os equipamentos</option>${Object.entries(MP_CLASSE).map(([k, t]) => `<option value="${k}" ${k === fCl ? 'selected' : ''}>${t}</option>`).join('')}</select>
    <select name="sit"><option value="">Todas as situações</option>${Object.entries(MP_SIT).map(([k, [t]]) => `<option value="${k}" ${k === fSit ? 'selected' : ''}>${t}</option>`).join('')}</select>
    <input name="q" placeholder="Frota" value="${esc(fq)}"><button class="btn">Filtrar</button></form>`;
  let corpo = '';
  if (aba === 'situacao') {
    const ord = { vencida: 0, proxima: 1, sem_base: 2, em_dia: 3 };
    const R = [...F].sort((a, b) => ord[a.situacao] - ord[b.situacao] || String(a.proxima_em || '9').localeCompare(String(b.proxima_em || '9')) || String(a.codigo_frota).localeCompare(String(b.codigo_frota)));
    corpo = `<div class="cartao">${filtros}${ed && R.some(x => x.situacao === 'sem_base') ? '<div class="acoes" style="margin-bottom:8px"><button class="btn" id="mp-lote">Informar a última preventiva dos marcados</button></div>' : ''}
      ${R.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr>${ed ? '<th><input type="checkbox" id="mp-todos"></th>' : ''}<th>Frota</th><th>Plano</th><th>Última preventiva</th><th class="num">Rodado desde</th><th>Intervalo</th><th>Próxima</th><th>Situação</th><th></th></tr></thead><tbody>
      ${R.map(x => `<tr>${ed ? `<td><input type="checkbox" data-sel="${x.id}"></td>` : ''}<td data-r="Frota"><b>${esc(x.codigo_frota || '')}</b><div class="muted" style="font-size:12px">${esc(MP_CLASSE[x.classe] || '')}</div></td><td data-r="Plano">${esc(x.plano)}</td>
        <td data-r="Última preventiva">${x.ultima_em ? dataHoraBR(x.ultima_em).slice(0, 10) : '—'}${x.ultima_os_id ? ` · <a href="#/manut/os/ver/${x.ultima_os_id}">OS</a>` : ''}${x.ultima_km != null ? `<div class="muted" style="font-size:12px">${mpKm(x.ultima_km)}</div>` : ''}</td>
        <td data-r="Rodado desde" class="num">${x.km_desde != null ? mpKm(x.km_desde) : '—'}<div class="muted" style="font-size:12px">${mpFonte(x.fonte_km)}${x.media_km_dia ? ' · ' + Math.round(x.media_km_dia).toLocaleString('pt-BR') + ' km/dia' : ''}</div></td>
        <td data-r="Intervalo">${[x.intervalo_km && mpKm(x.intervalo_km), x.intervalo_dias && x.intervalo_dias + ' dias'].filter(Boolean).join(' ou ')}</td>
        <td data-r="Próxima">${esc(mpResumo(x))}</td><td data-r="Situação">${tagSt(MP_SIT, x.situacao)}</td>
        <td>${x.os_aberta_id ? `<a class="btn peq" href="#/manut/os/ver/${x.os_aberta_id}">OS em andamento</a>` : ed ? `<div class="acoes"><a class="btn peq ${['vencida', 'proxima'].includes(x.situacao) ? 'prim' : ''}" href="#/manut/os/nova?eq=${x.equipamento_id}&tipo=preventiva&pe=${x.id}">Abrir OS</a>${x.situacao === 'sem_base' || !x.ultima_os_id ? `<button class="btn peq" data-ult="${x.id}">Informar última</button>` : ''}</div>` : ''}</td></tr>`).join('')}</tbody></table></div>`
        : `<div class="vazio">${lista.length ? 'Nada com esses filtros.' : `Nenhum equipamento em plano preventivo ainda. ${ed ? '<a href="#/manut/planos">Revise os planos e aplique aos equipamentos.</a>' : ''}`}</div>`}</div>`;
  } else if (aba === 'calendario') {
    const mes = p('mes') || hojeISO().slice(0, 7), [ano, mm] = mes.split('-').map(Number), ini = new Date(ano, mm - 1, 1), dias = new Date(ano, mm, 0).getDate();
    const ant = new Date(ano, mm - 2, 1), prox = new Date(ano, mm, 1), ym = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const ev = {}; const add = (d, h) => { (ev[d] ||= []).push(h); };
    for (const x of F) if (x.proxima_em && x.situacao !== 'sem_base') add(x.proxima_em < hojeISO() ? hojeISO() : x.proxima_em, `<a class="mp-ev ${x.situacao}" href="${x.os_aberta_id ? '#/manut/os/ver/' + x.os_aberta_id : `#/manut/os/nova?eq=${x.equipamento_id}&tipo=preventiva&pe=${x.id}`}" title="${esc(x.codigo_frota + ' · ' + x.plano + ' · ' + mpResumo(x))}">${esc(x.codigo_frota || '')} · ${esc(x.plano)}</a>`);
    for (const x of insp) if (x.doc_id && x.vence) add(x.vence < hojeISO() ? hojeISO() : x.vence, `<a class="mp-ev insp" href="#/manut/os/nova?eq=${x.equipamento_id}&tipo=inspecao" title="${esc('Inspeção · ' + (x.frota || '') + (x.placa ? ' · ' + x.placa : '') + ' · vence ' + dataBR(x.vence))}">🔍 ${esc(x.frota || '')}${x.placa ? ' · ' + esc(x.placa) : ''}</a>`);
    const cel = []; const pad = (ini.getDay() + 6) % 7;
    for (let k = 0; k < pad; k++) cel.push('<div class="d fora"></div>');
    for (let d = 1; d <= dias; d++) { const iso = `${mes}-${String(d).padStart(2, '0')}`; cel.push(`<div class="d ${iso === hojeISO() ? 'hoje' : ''}"><div class="dn">${d}</div>${(ev[iso] || []).join('')}</div>`); }
    const nomeMes = ini.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    corpo = `<div class="cartao">${filtros}<div class="topo" style="margin:0 0 8px"><h2 style="margin:0;text-transform:capitalize">${nomeMes}</h2><div class="acoes"><a class="btn peq" href="${url({ mes: ym(ant) })}">‹ Anterior</a><a class="btn peq" href="${url({ mes: hojeISO().slice(0, 7) })}">Hoje</a><a class="btn peq" href="${url({ mes: ym(prox) })}">Próximo ›</a></div></div>
      <p class="muted" style="margin-top:0">Data prevista = a que vier primeiro entre os dias do plano e os km (média de km/dia dos últimos 30 dias no Creare). Vencidas aparecem em hoje. <span class="mp-ev vencida" style="display:inline-block">vencida</span> <span class="mp-ev proxima" style="display:inline-block">próxima</span> <span class="mp-ev" style="display:inline-block">em dia</span> <span class="mp-ev insp" style="display:inline-block">inspeção</span></p>
      <div class="mp-cal">${['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map(d => `<div class="h">${d}</div>`).join('')}${cel.join('')}</div></div>`;
  } else {
    const R = insp.filter(x => (!fCl || x.classe === fCl) && (!fq || (x.frota || '').toLowerCase().includes(fq)));
    const tg = { sem: ['Sem documento', 'azul'], vencida: ['Vencida', 'vermelho'], proxima: ['Até 15 dias', 'amarelo'], em_dia: ['Em dia', 'verde'] };
    corpo = `<div class="cartao"><p class="muted" style="margin-top:0">Inspeções externas a cada 90 dias, calculadas pelos documentos do tipo "Inspeção" em Frota › Controle de vencimentos (vale o vencimento do documento; sem vencimento, 90 dias da inclusão). Ao renovar, inclua o novo documento lá.</p>
      ${R.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Frota</th><th>Placa</th><th>Documento</th><th>Vence</th><th class="num">Dias</th><th>Situação</th><th></th></tr></thead><tbody>
      ${R.sort((a, b) => ({ vencida: 0, sem: 1, proxima: 2, em_dia: 3 }[iS(a)] - { vencida: 0, sem: 1, proxima: 2, em_dia: 3 }[iS(b)]) || String(a.vence || '').localeCompare(String(b.vence || ''))).map(x => `<tr><td data-r="Frota"><b>${esc(x.frota || '')}</b><div class="muted" style="font-size:12px">${esc(MP_CLASSE[x.classe] || '')}</div></td>
        <td data-r="Placa">${esc(x.placa || '—')}</td><td data-r="Documento">${esc(x.doc || '—')}${x.numero ? ' · nº ' + esc(x.numero) : ''}</td><td data-r="Vence">${x.doc_id ? dataBR(x.vence) : '—'}</td>
        <td data-r="Dias" class="num">${x.doc_id ? mpDias(x.vence) : '—'}</td><td data-r="Situação">${tagSt(tg, iS(x))}</td>
        <td><div class="acoes">${x.os_aberta ? `<a class="btn peq" href="#/manut/os/ver/${x.os_aberta}">OS de inspeção aberta</a>` : ed ? `<a class="btn peq ${['vencida', 'proxima'].includes(iS(x)) ? 'prim' : ''}" href="#/manut/os/nova?eq=${x.equipamento_id}&tipo=inspecao">Abrir OS de inspeção</a>` : ''}<a class="btn peq" href="#/frota/documentos">Documentos</a></div></td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Nenhum cavalo ou composição ativo.</div>'}</div>`;
  }
  tela.innerHTML = `<div class="topo"><div><h1>Preventivas</h1><p class="sub">Km pelo Creare em tempo real (sem Creare, pelo hodômetro) e dias desde a última OS preventiva encerrada · o que vencer primeiro.</p></div>
    <div class="acoes"><a class="btn" href="#/manut/planos">Planos preventivos</a>${ed ? '<a class="btn prim" href="#/manut/os/nova?tipo=preventiva">+ OS preventiva</a>' : ''}</div></div>${kpis}${abas}${corpo}`;
  $('#mp-f')?.addEventListener('submit', e => { e.preventDefault(); const d = formDados(e.target); location.hash = url({ plano: d.plano, cl: d.cl, sit: d.sit, q: d.q }); });
  $('#mp-todos')?.addEventListener('change', e => $$('[data-sel]', tela).forEach(c => (c.checked = e.target.checked)));
  $$('[data-ult]', tela).forEach(b => b.onclick = async () => { const x = lista.find(y => y.id === b.dataset.ult); if (await mpInformarUltima([x.id], `${x.codigo_frota} · ${x.plano}`)) navegar(); });
  $('#mp-lote')?.addEventListener('click', async () => { const ids = $$('[data-sel]:checked', tela).map(c => c.dataset.sel); if (!ids.length) return aviso('Marque as linhas na tabela.', true);
    if (await mpInformarUltima(ids, `${ids.length} linha(s) marcada(s) — a mesma data para todas`)) navegar(); });
});

// ===================== Planos =====================
rota('/manut/planos', async tela => {
  const ed = editaManut();
  const [ps, pes, eqs] = await Promise.all([api.listar('manut_planos', 'select=*&order=ativo.desc,nome'), api.listar('manut_plano_equipamentos', 'ativo=eq.true&select=plano_id'), eqsAtivos()]);
  const qt = id => pes.filter(x => x.plano_id === id).length, E = Object.fromEntries(eqs.map(e => [e.id, e]));
  const tipos = p => p.equipamento_id ? 'Só ' + esc(E[p.equipamento_id]?.codigo_frota || 'equipamento') : (p.tipos_equipamento || []).map(t => MP_TIPOS_EQ.find(x => x[0] === t)?.[1] || t).join(', ') || 'Todos';
  tela.innerHTML = `<div class="topo"><div><h1>Planos preventivos</h1><p class="sub">Plano geral (por tipo de equipamento) ou de um equipamento só. Vence pelo que chegar primeiro: km ou dias.</p></div>
    <div class="acoes">${ed ? '<a class="btn prim" href="#/manut/planos/novo">+ Novo plano</a>' : ''}<a class="btn" href="#/manut/preventivas">Painel de preventivas</a></div></div>
    <div class="cartao">${ps.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Plano</th><th>Aplica a</th><th>Intervalo</th><th>Meta</th><th class="num">Equipamentos</th><th>Situação</th><th></th></tr></thead><tbody>
      ${ps.map(p => `<tr><td data-r="Plano"><b>${esc(p.nome)}</b>${p.descricao ? `<div class="muted" style="font-size:12px">${esc(p.descricao)}</div>` : ''}</td><td data-r="Aplica a">${tipos(p)}</td>
        <td data-r="Intervalo">${[p.intervalo_km && mpKm(p.intervalo_km), p.intervalo_dias && p.intervalo_dias + ' dias', p.intervalo_horas && p.intervalo_horas + ' h'].filter(Boolean).join(' ou ')}</td>
        <td data-r="Meta">${p.meta_horas ? String(p.meta_horas).replace('.', ',') + ' h' : '—'}</td><td data-r="Equipamentos" class="num">${qt(p.id)}</td>
        <td data-r="Situação">${!p.ativo ? '<span class="tag">Desativado</span>' : p.aplicar_auto || p.equipamento_id ? '<span class="tag verde">Aplicado</span>' : '<span class="tag amarelo">Revisar e aplicar</span>'}</td>
        <td><a class="btn peq" href="#/manut/planos/${p.id}">${ed ? 'Abrir / editar' : 'Ver'}</a></td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Nenhum plano.</div>'}</div>`;
});

rota('/manut/planos/:id', async (tela, id) => {
  const novo = id === 'novo', ed = editaManut();
  const [p0, eqs] = await Promise.all([novo ? null : api.um('manut_planos', `id=eq.${id}`), eqsAtivos()]);
  const p = p0 || { nome: '', tipos_equipamento: ['cavalo_mecanico'], aplicar_auto: true, aviso_km: 1000, aviso_dias: 15, ativo: true };
  if (!novo && !p0) { tela.innerHTML = '<div class="cartao vazio">Plano não encontrado.</div>'; return; }
  const [pes, sit] = novo ? [[], []] : await Promise.all([api.listar('manut_plano_equipamentos', `plano_id=eq.${id}&select=*&order=criado_em`), api.rpc('manut_prev_lista').catch(() => [])]);
  const E = Object.fromEntries(eqs.map(e => [e.id, e])), S = Object.fromEntries((sit || []).filter(x => x.plano_id === id).map(x => [x.id, x]));
  const dis = ed ? '' : 'disabled', so = !!p.equipamento_id;
  tela.innerHTML = `<div class="topo"><div><h1>${novo ? 'Novo plano preventivo' : esc(p.nome)}</h1><p class="sub">${novo ? 'Defina o intervalo e a que equipamentos se aplica.' : !p.ativo ? 'Plano desativado.' : p.aplicar_auto || so ? 'Aplicado aos equipamentos abaixo.' : 'Ainda não aplicado: revise e marque "aplicar a todos os equipamentos desses tipos".'}</p></div>
    <div class="acoes">${ed && !novo ? `<button class="btn ${p.ativo ? 'perigo' : ''}" id="mp-at">${p.ativo ? 'Desativar plano' : 'Reativar plano'}</button>` : ''}<a class="btn" href="#/manut/planos">Voltar</a></div></div>
    <form class="cartao" id="mp-form"><h2>Plano</h2><div class="form">
      <label class="campo largo">Nome *<input name="nome" required value="${esc(p.nome)}" placeholder="Ex.: Troca de óleo e filtros — cavalo" ${dis}></label>
      <label class="campo largo">Descrição<input name="descricao" value="${esc(p.descricao || '')}" ${dis}></label>
      <div class="campo largo"><span>Aplica a *</span><div class="mo-chips"><label><input type="radio" name="alc" value="geral" ${so ? '' : 'checked'} ${dis}>Plano geral (por tipo)</label><label><input type="radio" name="alc" value="um" ${so ? 'checked' : ''} ${dis}>Um equipamento só</label></div></div>
      <div class="campo largo" id="mp-b-tipos"><span>Tipos de equipamento *</span><div class="mo-chips">${MP_TIPOS_EQ.map(([k, t]) => `<label><input type="checkbox" name="t_${k}" ${(p.tipos_equipamento || []).includes(k) ? 'checked' : ''} ${dis}>${t}</label>`).join('')}</div>
        <label class="check" style="margin-top:6px"><input type="checkbox" name="aplicar_auto" ${p.aplicar_auto ? 'checked' : ''} ${dis}> Aplicar a todos os equipamentos desses tipos (os novos entram sozinhos)</label></div>
      <label class="campo largo" id="mp-b-eq">Equipamento *<select name="equipamento_id" ${dis}><option value="">Selecione…</option>${optEq(eqs, p.equipamento_id)}</select></label>
      <label class="campo">A cada (km)<input name="intervalo_km" inputmode="numeric" value="${p.intervalo_km ?? ''}" ${dis}></label>
      <label class="campo">A cada (dias)<input name="intervalo_dias" inputmode="numeric" value="${p.intervalo_dias ?? ''}" ${dis}></label>
      <label class="campo">Avisar quando faltar (km)<input name="aviso_km" inputmode="numeric" value="${p.aviso_km ?? 1000}" ${dis}></label>
      <label class="campo">Avisar quando faltar (dias)<input name="aviso_dias" inputmode="numeric" value="${p.aviso_dias ?? 15}" ${dis}></label>
      <label class="campo">Meta de tempo de execução (h)<input name="meta_horas" inputmode="decimal" value="${p.meta_horas != null ? String(p.meta_horas).replace('.', ',') : ''}" placeholder="ex.: 4" ${dis}></label>
      <label class="campo largo">O que fazer (um item por linha)<textarea name="servicos" rows="5" ${dis}>${esc(p.servicos || '')}</textarea></label></div>
      ${ed ? `<div class="acoes" style="margin-top:10px"><button class="btn prim">${novo ? 'Criar plano' : 'Salvar plano'}</button></div>` : ''}</form>
    ${novo ? '' : `<div class="cartao"><div class="topo" style="margin:0 0 6px"><h2 style="margin:0">Equipamentos no plano (${pes.filter(x => x.ativo).length})</h2>
      ${ed ? `<div class="acoes"><select id="mp-add-eq"><option value="">Incluir equipamento…</option>${eqs.filter(e => !pes.some(x => x.equipamento_id === e.id)).map(e => `<option value="${e.id}">${esc(rotuloEq(e))}</option>`).join('')}</select><button class="btn peq" id="mp-add">Incluir</button></div>` : ''}</div>
      ${pes.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Frota</th><th>Última preventiva</th><th>Intervalo deste equipamento</th><th>Situação</th><th></th></tr></thead><tbody>
      ${pes.map(x => { const s = S[x.id]; return `<tr style="${x.ativo ? '' : 'opacity:.55'}"><td data-r="Frota"><b>${esc(E[x.equipamento_id]?.codigo_frota || '—')}</b></td>
        <td data-r="Última preventiva">${x.ultima_em || x.ultima_data ? dataBR((x.ultima_em || x.ultima_data).slice(0, 10)) : '—'}${x.ultima_km != null ? ' · ' + mpKm(x.ultima_km) : ''}</td>
        <td data-r="Intervalo">${x.intervalo_km || x.intervalo_dias ? `<b>${[x.intervalo_km && mpKm(x.intervalo_km), x.intervalo_dias && x.intervalo_dias + ' dias'].filter(Boolean).join(' ou ')}</b> (ajustado)` : '<span class="muted">o do plano</span>'}</td>
        <td data-r="Situação">${!x.ativo ? '<span class="tag">Fora do plano</span>' : s ? tagSt(MP_SIT, s.situacao) + ' <span class="muted" style="font-size:12px">' + esc(mpResumo(s)) + '</span>' : '—'}</td>
        <td>${ed ? `<div class="acoes">${x.ativo ? `<button class="btn peq" data-ult="${x.id}">Informar última</button><button class="btn peq" data-int="${x.id}">Ajustar intervalo</button><button class="btn peq perigo" data-fora="${x.id}">Tirar do plano</button>` : `<button class="btn peq" data-volta="${x.id}">Incluir de novo</button>`}</div>` : ''}</td></tr>`; }).join('')}</tbody></table></div>`
        : '<div class="vazio">Nenhum equipamento. Marque "aplicar a todos" ou inclua manualmente.</div>'}</div>`}`;
  const f = $('#mp-form'), vis = () => { const um = f.querySelector('[name=alc]:checked')?.value === 'um'; $('#mp-b-tipos').hidden = um; $('#mp-b-eq').hidden = !um; };
  f.addEventListener('change', vis); vis();
  f.onsubmit = async e => { e.preventDefault(); if (!ed) return; const d = formDados(f), um = d.alc === 'um', nn = v => v ? Number(soDigitos(v)) : null;
    const dados = { nome: d.nome, descricao: d.descricao || null, equipamento_id: um ? d.equipamento_id || null : null, tipos_equipamento: um ? null : MP_TIPOS_EQ.map(x => x[0]).filter(k => d['t_' + k]),
      aplicar_auto: !um && !!d.aplicar_auto, intervalo_km: nn(d.intervalo_km), intervalo_dias: nn(d.intervalo_dias), aviso_km: nn(d.aviso_km) ?? 1000, aviso_dias: nn(d.aviso_dias) ?? 15, meta_horas: num(d.meta_horas), servicos: d.servicos || null };
    if (um && !dados.equipamento_id) return aviso('Escolha o equipamento.', true);
    if (!um && !dados.tipos_equipamento.length) return aviso('Marque ao menos um tipo de equipamento.', true);
    if (!dados.intervalo_km && !dados.intervalo_dias && !p.intervalo_horas) return aviso('Informe o intervalo em km e/ou em dias.', true);
    await ocupado(e.submitter, async () => { try { if (novo) { const [n] = await api.inserir('manut_planos', dados); location.hash = '#/manut/planos/' + n.id; } else { await api.alterar('manut_planos', `id=eq.${id}`, dados); aviso('Plano salvo.'); navegar(); } } catch (err) { falha(err); } }); };
  if (novo) return;
  $('#mp-at')?.addEventListener('click', async () => { if (p.ativo && !await confirmar('Desativar o plano? Ele sai do painel e das sugestões; o histórico continua.', { botao: 'Desativar' })) return;
    try { await api.alterar('manut_planos', `id=eq.${id}`, { ativo: !p.ativo }); navegar(); } catch (err) { falha(err); } });
  $('#mp-add')?.addEventListener('click', async () => { const eq = $('#mp-add-eq').value; if (!eq) return aviso('Escolha o equipamento.', true);
    try { await api.inserir('manut_plano_equipamentos', { plano_id: id, equipamento_id: eq }); navegar(); } catch (err) { falha(err); } });
  $$('[data-ult]', tela).forEach(b => b.onclick = async () => { const x = pes.find(y => y.id === b.dataset.ult); if (await mpInformarUltima([x.id], `${E[x.equipamento_id]?.codigo_frota || ''} · ${p.nome}`)) navegar(); });
  $$('[data-fora]', tela).forEach(b => b.onclick = async () => { if (!await confirmar('Tirar este equipamento do plano? Ele não volta sozinho; para voltar, use "Incluir de novo".', { botao: 'Tirar do plano' })) return;
    try { await api.alterar('manut_plano_equipamentos', `id=eq.${b.dataset.fora}`, { ativo: false }); navegar(); } catch (err) { falha(err); } });
  $$('[data-volta]', tela).forEach(b => b.onclick = async () => { try { await api.alterar('manut_plano_equipamentos', `id=eq.${b.dataset.volta}`, { ativo: true }); navegar(); } catch (err) { falha(err); } });
  $$('[data-int]', tela).forEach(b => b.onclick = async () => { const x = pes.find(y => y.id === b.dataset.int);
    const r = await modal(`<form><h2>Intervalo só deste equipamento</h2><p class="muted">Deixe em branco para usar o do plano (${[p.intervalo_km && mpKm(p.intervalo_km), p.intervalo_dias && p.intervalo_dias + ' dias'].filter(Boolean).join(' ou ')}).</p><div class="form">
      <label class="campo">A cada (km)<input name="km" inputmode="numeric" value="${x.intervalo_km ?? ''}"></label><label class="campo">A cada (dias)<input name="dias" inputmode="numeric" value="${x.intervalo_dias ?? ''}"></label>
      <label class="campo largo">Motivo do ajuste<input name="obs" value="${esc(x.observacao || '')}" placeholder="Ex.: opera em estrada de terra"></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`);
    if (!r) return; try { await api.alterar('manut_plano_equipamentos', `id=eq.${x.id}`, { intervalo_km: r.km ? Number(soDigitos(r.km)) : null, intervalo_dias: r.dias ? Number(soDigitos(r.dias)) : null, observacao: r.obs || null }); navegar(); } catch (err) { falha(err); } });
});
