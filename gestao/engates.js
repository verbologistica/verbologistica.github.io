// Verbo Gestão — Atrelamentos: qual cavalo mecânico puxa qual carreta, desde quando (cavalo e carreta são equipamentos separados)
'use strict';

const PAPEL_EQ = t => ['cavalo_mecanico', 'caminhao'].includes(t) ? 'cavalo' : ['carreta', 'bitrem', 'tritrem', 'rodotrem'].includes(t) ? 'carreta' : null;
const EG_CORES = ['#1f6f5c', '#c8902f', '#3b6fb6', '#a24d7a', '#5a8f2e', '#b5523b', '#4f5fa8', '#2f8f97', '#8a6d3b', '#6d4fa8', '#9c3d54', '#3d7a4f'];
const egDur = d => { d = Number(d) || 0; return d < 1 ? Math.max(1, Math.round(d * 24)) + ' h' : Math.round(d) + (Math.round(d) === 1 ? ' dia' : ' dias'); };
const egKm = n => n != null ? Number(n).toLocaleString('pt-BR') + ' km' : '';
const isoLocal = s => { const d = new Date(s); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

let _egEqs = null;
async function egEquipamentos(forcar) {
  if (!_egEqs || forcar) {
    const eqs = await api.listar('equipamentos', 'select=id,codigo_frota,tipo,tipo_outro,marca,modelo,situacao,ativo,comps:veiculos(placa,ordem,ativo)&order=codigo_frota.asc.nullslast');
    _egEqs = eqs.map(e => ({ ...e, papel: PAPEL_EQ(e.tipo), placas: (e.comps || []).filter(c => c.ativo).sort((a, b) => a.ordem - b.ordem).map(c => c.placa) }));
  }
  return _egEqs;
}
const egRot = e => `${e.codigo_frota || 'Sem código'} · ${e.placas.join(' · ') || 'sem placa'}`;

// ---------- Janela: atrelar (ou trocar) ----------
async function modalEngatar({ cavalo = '', carreta = '' } = {}) {
  if (!editaFrota()) return aviso('Somente Operação, Manutenção ou o Administrador registram atrelamentos.', true);
  const [eqs, abertos] = await Promise.all([egEquipamentos(true), api.listar('v_engates', 'ativo=eq.true&fim=is.null')]);
  const cavs = eqs.filter(e => e.papel === 'cavalo' && e.ativo), cars = eqs.filter(e => e.papel === 'carreta' && e.ativo);
  if (!cavs.length || !cars.length) return aviso('Cadastre pelo menos um cavalo mecânico e uma carreta (tipo Carreta, Bitrem, Tritrem ou Rodotrem) em Equipamentos.', true);
  const atualDe = id => abertos.find(a => a.cavalo_id === id || a.carreta_id === id);
  const op = (e, sel) => { const a = atualDe(e.id); const com = a ? (a.cavalo_id === e.id ? a.carreta_codigo : a.cavalo_codigo) : null;
    return `<option value="${e.id}" ${e.id === sel ? 'selected' : ''}>${esc(egRot(e))}${com ? ' — hoje com ' + esc(com) : ' — livre'}</option>`; };
  const r = await modal(`<form><h2>Atrelar cavalo e carreta</h2>
    <p class="muted">Se o cavalo ou a carreta estiverem com outro, o atrelamento anterior é encerrado automaticamente na mesma data e hora — nada se perde do histórico.</p>
    <div class="eg-par">
      <label class="campo">Cavalo mecânico *<select name="cavalo" required><option value="">Selecione…</option>${cavs.map(e => op(e, cavalo)).join('')}</select></label>
      <div class="eg-elo" aria-hidden="true">⟷</div>
      <label class="campo">Carreta *<select name="carreta" required><option value="">Selecione…</option>${cars.map(e => op(e, carreta)).join('')}</select></label></div>
    <div id="eg-aviso"></div>
    <div class="form">
      <label class="campo">Data e hora do atrelamento *<input type="datetime-local" name="quando" value="${agoraLocal()}" required></label>
      <label class="campo">Km do cavalo<input name="km" type="number" min="0" placeholder="Opcional"></label>
      <label class="campo largo">Motivo<input name="motivo" placeholder="Ex.: início de contrato, troca por manutenção da carreta"></label>
      <label class="campo largo">Observação<input name="obs"></label></div>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Registrar atrelamento</button></div></form>`, {
    aoAbrir: raiz => { const f = $('form', raiz);
      const sinc = () => { const ms = [];
        const a = atualDe(f.cavalo.value), b = atualDe(f.carreta.value);
        if (a && a === b) ms.push('Este cavalo já está com esta carreta.');
        else { if (a) ms.push(`O cavalo <b>${esc(a.cavalo_codigo)}</b> está com a carreta <b>${esc(a.carreta_codigo)}</b> desde ${dataHoraBR(a.inicio)}: esse atrelamento será encerrado.`);
               if (b) ms.push(`A carreta <b>${esc(b.carreta_codigo)}</b> está com o cavalo <b>${esc(b.cavalo_codigo)}</b> desde ${dataHoraBR(b.inicio)}: esse atrelamento será encerrado.`); }
        $('#eg-aviso', raiz).innerHTML = ms.length ? `<div class="conferencia" style="margin:6px 0 10px">${ms.join('<br>')}</div>` : ''; };
      f.cavalo.addEventListener('change', sinc); f.carreta.addEventListener('change', sinc); sinc(); },
    validar: d => !d.cavalo || !d.carreta ? 'Escolha o cavalo e a carreta.' : new Date(d.quando) > new Date(Date.now() + 864e5) ? 'A data não pode ser no futuro.' : null });
  if (!r) return false;
  try {
    await api.rpc('engatar', { p_cavalo: r.cavalo, p_carreta: r.carreta, p_data: new Date(r.quando).toISOString(), p_km: r.km ? Number(r.km) : null, p_motivo: r.motivo || null, p_obs: r.obs || null });
    aviso('Atrelamento registrado.'); navegar(); return true;
  } catch (err) { falha(err); return false; }
}

async function modalDesengatar(g) {
  const r = await modal(`<form><h2>Desatrelar ${esc(g.cavalo_codigo)} × ${esc(g.carreta_codigo)}</h2>
    <p class="muted">Atrelados desde ${dataHoraBR(g.inicio)}. O registro fica no histórico com a data de saída.</p>
    <div class="form"><label class="campo">Data e hora *<input type="datetime-local" name="quando" value="${agoraLocal()}" required></label>
      <label class="campo">Km do cavalo<input name="km" type="number" min="0" placeholder="Opcional"></label>
      <label class="campo largo">Motivo *<input name="motivo" required placeholder="Ex.: carreta para manutenção, cavalo parado"></label></div>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Desatrelar</button></div></form>`,
    { validar: d => !d.motivo ? 'Informe o motivo.' : new Date(d.quando) <= new Date(g.inicio) ? 'A data precisa ser depois do início do atrelamento.' : null });
  if (!r) return;
  try { await api.rpc('desengatar', { p_id: g.id, p_data: new Date(r.quando).toISOString(), p_km: r.km ? Number(r.km) : null, p_motivo: r.motivo }); aviso('Desatrelamento registrado.'); navegar(); }
  catch (err) { falha(err); }
}

async function modalCorrigirEngate(g) {
  const r = await modal(`<form><h2>Corrigir registro · ${esc(g.cavalo_codigo)} × ${esc(g.carreta_codigo)}</h2>
    <p class="muted">Use para acertar data ou km digitados errado. A correção fica registrada (quem, quando e o motivo).</p>
    <div class="form"><label class="campo">Início *<input type="datetime-local" name="inicio" value="${isoLocal(g.inicio)}" required></label>
      <label class="campo">Fim<input type="datetime-local" name="fim" value="${g.fim ? isoLocal(g.fim) : ''}"><span class="muted">Em branco = continua atrelado</span></label>
      <label class="campo">Km no início<input name="km_inicio" type="number" value="${g.km_inicio ?? ''}"></label>
      <label class="campo">Km no fim<input name="km_fim" type="number" value="${g.km_fim ?? ''}"></label>
      <label class="campo largo">Motivo da correção *<input name="motivo" required></label></div>
    <div class="rodape"><button type="submit" class="btn perigo" value="anular" formnovalidate>Anular registro (lançado por engano)</button>
      <button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim" value="salvar">Salvar correção</button></div></form>`,
    { validar: d => !d.motivo ? 'Informe o motivo.' : d._acao !== 'anular' && d.fim && d.fim <= d.inicio ? 'O fim precisa ser depois do início.' : null });
  if (!r) return;
  try {
    if (r._acao === 'anular') await api.rpc('anular_engate', { p_id: g.id, p_motivo: r.motivo });
    else await api.rpc('corrigir_engate', { p_id: g.id, p_inicio: new Date(r.inicio).toISOString(), p_fim: r.fim ? new Date(r.fim).toISOString() : null,
      p_km_inicio: r.km_inicio ? Number(r.km_inicio) : null, p_km_fim: r.km_fim ? Number(r.km_fim) : null, p_motivo: r.motivo });
    aviso(r._acao === 'anular' ? 'Registro anulado (continua visível em "mostrar anulados").' : 'Registro corrigido.'); navegar();
  } catch (err) { falha(err); }
}

// ---------- Linha do tempo (gráfico de barras por período) ----------
function egLinhaTempo(linhas, gs, de, ate, por, corDe) {
  const t0 = de.getTime(), t1 = ate.getTime(), span = Math.max(1, t1 - t0), pct = t => Math.min(100, Math.max(0, (t - t0) / span * 100));
  const dias = span / 864e5, ticks = [];
  const d = new Date(de); d.setHours(0, 0, 0, 0);
  if (dias <= 45) { while (d <= ate) { if (d >= de) ticks.push([d.getTime(), d.getDate() === 1 || ticks.length === 0 ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : String(d.getDate()).padStart(2, '0')]); d.setDate(d.getDate() + (dias <= 15 ? 1 : 7)); } }
  else { d.setDate(1); while (d <= ate) { if (d >= de) ticks.push([d.getTime(), d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })]); d.setMonth(d.getMonth() + 1); } }
  const agora = Date.now();
  return `<div class="eg-tl">
    <div class="eg-tl-eixo"><div class="eg-tl-nome"></div><div class="eg-tl-trilho">${ticks.map(([t, l]) => `<span class="eg-tick" style="left:${pct(t)}%">${esc(l)}</span>`).join('')}</div></div>
    ${linhas.map(l => { const meus = gs.filter(g => (por === 'carreta' ? g.carreta_id : g.cavalo_id) === l.id);
      return `<div class="eg-tl-linha"><div class="eg-tl-nome"><a href="#/cadastros/equipamentos/ver/${l.id}"><b>${esc(l.codigo_frota || 'Sem código')}</b></a><span class="muted mono">${esc(l.placas[0] || '')}</span></div>
        <div class="eg-tl-trilho">${ticks.map(([t]) => `<span class="eg-grade" style="left:${pct(t)}%"></span>`).join('')}
          ${agora >= t0 && agora <= t1 ? `<span class="eg-hoje" style="left:${pct(agora)}%" title="Agora"></span>` : ''}
          ${meus.map(g => { const a = new Date(g.inicio).getTime(), b = g.fim ? new Date(g.fim).getTime() : agora;
            if (b < t0 || a > t1) return '';
            const l0 = pct(a), w = Math.max(.6, pct(b) - l0), outro = por === 'carreta' ? g.cavalo_codigo : g.carreta_codigo, cor = corDe(por === 'carreta' ? g.cavalo_id : g.carreta_id);
            const tip = `${g.cavalo_codigo} × ${g.carreta_codigo}\n${dataHoraBR(g.inicio)} → ${g.fim ? dataHoraBR(g.fim) : 'atual'} (${egDur(g.dias)})${g.motivo_inicio ? '\nEntrada: ' + g.motivo_inicio : ''}${g.motivo_fim ? '\nSaída: ' + g.motivo_fim : ''}`;
            return `<button type="button" class="eg-barra ${g.fim ? '' : 'aberta'}" data-g="${g.id}" style="left:${l0}%;width:${w}%;--c:${cor}" title="${esc(tip)}"><span>${esc(outro || '')}</span></button>`; }).join('')}
        </div></div>`; }).join('') || '<div class="vazio">Nenhum equipamento.</div>'}
  </div>`;
}

// ---------- Tela ----------
rota('/frota/atrelamentos', async tela => {
  const p = estado.params, por = p.get('por') === 'carreta' ? 'carreta' : 'cavalo', periodo = p.get('periodo') || '90', anulados = p.get('anulados') === '1';
  const ate = p.get('ate') ? new Date(p.get('ate') + 'T23:59:59') : new Date();
  const de = p.get('de') ? new Date(p.get('de') + 'T00:00:00') : new Date(ate.getTime() - Number(periodo) * 864e5);
  const fCav = pLista('cavalo').filter(x => x !== 'todos'), fCar = pLista('carreta').filter(x => x !== 'todos');
  const [eqs, gsTodos] = await Promise.all([egEquipamentos(true), api.listar('v_engates', 'order=inicio.desc&limit=2000')]);
  const gs = gsTodos.filter(g => g.ativo);
  const cavs = eqs.filter(e => e.papel === 'cavalo' && e.ativo), cars = eqs.filter(e => e.papel === 'carreta' && e.ativo);
  const ordemCor = [...cars, ...cavs].map(e => e.id), corDe = id => EG_CORES[Math.max(0, ordemCor.indexOf(id)) % EG_CORES.length];
  const abertos = gs.filter(g => !g.fim), porCav = Object.fromEntries(abertos.map(g => [g.cavalo_id, g])), porCar = Object.fromEntries(abertos.map(g => [g.carreta_id, g]));
  const carLivres = cars.filter(c => !porCar[c.id]), cavLivres = cavs.filter(c => !porCav[c.id]);
  const trocas30 = gs.filter(g => Date.now() - new Date(g.inicio) < 30 * 864e5).length;
  const pode = editaFrota();
  const caixa = (e, papel) => e ? `<a class="eg-eq ${papel}" href="#/cadastros/equipamentos/ver/${e.id}" style="--c:${corDe(e.id)}">
      <span class="eg-eq-tipo">${papel === 'cavalo' ? 'Cavalo' : esc(nomeTipoEq(e))}</span><b>${esc(e.codigo_frota || 'Sem código')}</b>
      <span class="mono">${esc(e.placas.join(' · ') || '—')}</span>${e.modelo ? `<span class="muted">${esc([e.marca, e.modelo].filter(Boolean).join(' '))}</span>` : ''}</a>` : '';
  const quadro = cavs.map(c => { const g = porCav[c.id], k = g && eqs.find(e => e.id === g.carreta_id);
    return `<div class="eg-conj ${g ? '' : 'livre'}">${caixa(c, 'cavalo')}
      <div class="eg-liga">${g ? `<span class="eg-desde">desde ${dataBR(isoLocal(g.inicio).slice(0, 10))}</span><span class="eg-linha"></span><span class="eg-dur">${egDur(g.dias)}</span>` : '<span class="eg-linha tracejada"></span>'}</div>
      ${g ? caixa(k, 'carreta') : `<div class="eg-eq vazia">Sem carreta${pode ? `<button class="btn peq prim" data-atrelar-cav="${c.id}">Atrelar</button>` : ''}</div>`}
      ${g && pode ? `<div class="eg-conj-acoes"><button class="btn peq" data-atrelar-cav="${c.id}">Trocar carreta</button><button class="btn peq" data-desatrelar="${g.id}">Desatrelar</button></div>` : ''}</div>`; }).join('');
  // histórico filtrado
  const noPer = g => new Date(g.inicio) <= ate && (!g.fim || new Date(g.fim) >= de);
  const hist = (anulados ? gsTodos : gs).filter(g => noPer(g) && (!fCav.length || fCav.includes(g.cavalo_id)) && (!fCar.length || fCar.includes(g.carreta_id)));
  const linhasTl = (por === 'carreta' ? cars : cavs).filter(e => por === 'carreta' ? (!fCar.length || fCar.includes(e.id)) : (!fCav.length || fCav.includes(e.id)));
  const gsTl = gs.filter(g => (!fCav.length || fCav.includes(g.cavalo_id)) && (!fCar.length || fCar.includes(g.carreta_id)));
  const ymd = d => isoLocal(d).slice(0, 10);

  tela.innerHTML = `
    <div class="topo"><div><h1>Atrelamentos · cavalo × carreta</h1><p class="sub">Qual cavalo está com qual carreta, desde quando, e todo o histórico de trocas</p></div>
      <div class="acoes"><button class="btn" onclick="window.print()">Imprimir</button><a class="btn" href="#/cadastros/equipamentos">Equipamentos</a>
        ${pode ? '<button class="btn prim" id="eg-novo">+ Atrelar / trocar</button>' : ''}</div></div>
    <div class="og-kpis">
      <div class="og-kpi"><b>${abertos.length}<small class="muted"> / ${cavs.length}</small></b><span>cavalos atrelados</span></div>
      <div class="og-kpi ${cavLivres.length ? 'alerta' : ''}"><b>${cavLivres.length}</b><span>cavalo(s) sem carreta</span></div>
      <div class="og-kpi ${carLivres.length ? 'alerta' : ''}"><b>${carLivres.length}</b><span>carreta(s) sem cavalo</span></div>
      <div class="og-kpi"><b>${trocas30}</b><span>atrelamento(s) nos últimos 30 dias</span></div></div>
    ${!cavs.length || !cars.length ? `<div class="cartao alerta-obs">Para usar esta tela, cadastre em Equipamentos os cavalos (tipo <b>Cavalo mecânico</b>) e as carretas (tipo <b>Carreta</b>, <b>Bitrem</b>, <b>Tritrem</b> ou <b>Rodotrem</b>), cada um como um equipamento.</div>` : ''}
    <div class="cartao"><div class="topo" style="margin:0 0 10px"><h2 style="margin:0">Quadro atual</h2><span class="muted">Clique no equipamento para abrir o cadastro</span></div>
      <div class="eg-quadro">${quadro || '<div class="vazio">Nenhum cavalo mecânico cadastrado.</div>'}</div>
      ${carLivres.length ? `<h3 class="eg-sub">Carretas sem cavalo (${carLivres.length})</h3><div class="eg-livres">${carLivres.map(k => `<div class="eg-livre">${caixa(k, 'carreta')}
        ${pode ? `<button class="btn peq" data-atrelar-car="${k.id}">Atrelar a um cavalo</button>` : ''}</div>`).join('')}</div>` : ''}</div>
    <div class="cartao"><div class="topo" style="margin:0 0 6px;flex-wrap:wrap;gap:8px"><h2 style="margin:0">Linha do tempo</h2>
      <form class="filtros filtro-local" id="eg-f" style="margin:0">
        <select name="por" data-unico>${[['cavalo', 'Uma linha por cavalo'], ['carreta', 'Uma linha por carreta']].map(([v, t]) => `<option value="${v}" ${v === por ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <select name="periodo" data-unico>${[['30', 'Últimos 30 dias'], ['90', 'Últimos 90 dias'], ['180', 'Últimos 6 meses'], ['365', 'Último ano'], ['x', 'Escolher datas']].map(([v, t]) => `<option value="${v}" ${v === (p.get('de') ? 'x' : periodo) ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <span id="eg-datas" ${p.get('de') ? '' : 'hidden'}><input type="date" name="de" value="${ymd(de)}"> a <input type="date" name="ate" value="${ymd(ate)}"></span></form></div>
      <p class="muted" style="margin:0 0 8px">Cada barra é um período atrelado; a cor identifica ${por === 'carreta' ? 'o cavalo' : 'a carreta'}. Passe o mouse para ver os detalhes; clique para corrigir.</p>
      ${egLinhaTempo(linhasTl, gsTl, de, ate, por, corDe)}</div>
    <div class="cartao"><div class="topo" style="margin:0 0 8px;flex-wrap:wrap;gap:8px"><h2 style="margin:0">Histórico</h2>
      <form class="filtros" id="eg-h" style="margin:0">
        <select name="cavalo"><option value="todos">Todos os cavalos</option>${cavs.map(e => `<option value="${e.id}">${esc(egRot(e))}</option>`).join('')}</select>
        <select name="carreta"><option value="todos">Todas as carretas</option>${cars.map(e => `<option value="${e.id}">${esc(egRot(e))}</option>`).join('')}</select>
        <label class="check"><input type="checkbox" name="anulados" ${anulados ? 'checked' : ''}> Mostrar anulados</label></form></div>
      <form class="filtros filtro-local" id="eg-q" style="margin:0 0 10px"><label class="muted" style="align-self:center">Quem estava com quem em</label><input type="datetime-local" name="quando" required><button class="btn peq">Consultar</button></form>
      <div id="eg-na-data"></div>
      ${hist.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Cavalo</th><th>Carreta</th><th>Início</th><th>Fim</th><th>Duração</th><th>Motivo</th><th>Registrado por</th><th></th></tr></thead><tbody>
        ${hist.map(g => `<tr class="${g.ativo ? '' : 'anulado'}"><td data-r="Cavalo"><a href="#/cadastros/equipamentos/ver/${g.cavalo_id}"><b>${esc(g.cavalo_codigo || '—')}</b></a><div class="muted mono">${esc(g.cavalo_placas || '')}</div></td>
          <td data-r="Carreta"><span class="eg-pino" style="--c:${corDe(g.carreta_id)}"></span><a href="#/cadastros/equipamentos/ver/${g.carreta_id}"><b>${esc(g.carreta_codigo || '—')}</b></a><div class="muted mono">${esc(g.carreta_placas || '')}</div></td>
          <td data-r="Início" class="nowrap">${dataHoraBR(g.inicio)}${g.km_inicio != null ? `<div class="muted">${egKm(g.km_inicio)}</div>` : ''}</td>
          <td data-r="Fim" class="nowrap">${g.fim ? dataHoraBR(g.fim) : '<span class="tag verde">Atual</span>'}${g.km_fim != null ? `<div class="muted">${egKm(g.km_fim)}</div>` : ''}</td>
          <td data-r="Duração" class="nowrap">${egDur(g.dias)}${g.km_inicio != null && g.km_fim != null ? `<div class="muted">${egKm(g.km_fim - g.km_inicio)} rodados</div>` : ''}</td>
          <td data-r="Motivo"><span class="muted">${esc([g.motivo_inicio && 'Entrada: ' + g.motivo_inicio, g.motivo_fim && 'Saída: ' + g.motivo_fim, g.observacao].filter(Boolean).join(' · ') || '—')}</span>
            ${g.ativo ? '' : `<div><span class="tag vermelho">Anulado</span> <span class="muted">${esc(g.motivo_anulacao || '')}</span></div>`}</td>
          <td data-r="Registrado por">${esc(g.registrado_por || '—')}</td>
          <td class="nowrap">${pode && g.ativo ? `${g.fim ? '' : `<button class="btn peq" data-desatrelar="${g.id}">Desatrelar</button> `}<button class="btn peq" data-corrigir="${g.id}">Corrigir</button>` : ''}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="vazio">Nenhum atrelamento no período.</div>'}</div>`;

  const ir = mud => { const q = new URLSearchParams(location.hash.split('?')[1] || '');
    Object.entries(mud).forEach(([k, v]) => v == null || v === '' ? q.delete(k) : q.set(k, v)); location.hash = '#/frota/atrelamentos?' + q; };
  const fT = $('#eg-f');
  fT.por.onchange = () => ir({ por: fT.por.value === 'carreta' ? 'carreta' : null });
  fT.periodo.onchange = () => { if (fT.periodo.value === 'x') { $('#eg-datas').hidden = false; return; } ir({ periodo: fT.periodo.value, de: null, ate: null }); };
  fT.de.onchange = fT.ate.onchange = () => { if (fT.de.value && fT.ate.value) ir({ de: fT.de.value, ate: fT.ate.value }); };
  fT.onsubmit = e => e.preventDefault();
  const fH = $('#eg-h');
  fH.onsubmit = e => { e.preventDefault(); const d = formDados(fH); ir({ cavalo: d.cavalo === 'todos' ? null : d.cavalo, carreta: d.carreta === 'todos' ? null : d.carreta, anulados: d.anulados ? 1 : null }); };
  fH.anulados.onchange = () => fH.requestSubmit();
  $('#eg-q').onsubmit = async e => { e.preventDefault(); const q = new Date(formDados(e.target).quando).getTime();
    const ok = gs.filter(g => new Date(g.inicio).getTime() <= q && (!g.fim || new Date(g.fim).getTime() > q));
    $('#eg-na-data').innerHTML = `<div class="conferencia" style="margin-bottom:10px">Em ${dataHoraBR(new Date(q).toISOString())}: ${ok.length ? ok.map(g => `<b>${esc(g.cavalo_codigo)}</b> × <b>${esc(g.carreta_codigo)}</b>`).join(' · ') : 'nenhum atrelamento registrado'}</div>`; };
  $('#eg-novo')?.addEventListener('click', () => modalEngatar());
  $$('[data-atrelar-cav]', tela).forEach(b => b.addEventListener('click', () => modalEngatar({ cavalo: b.dataset.atrelarCav })));
  $$('[data-atrelar-car]', tela).forEach(b => b.addEventListener('click', () => modalEngatar({ carreta: b.dataset.atrelarCar })));
  $$('[data-desatrelar]', tela).forEach(b => b.addEventListener('click', () => modalDesengatar(gs.find(g => g.id === b.dataset.desatrelar))));
  $$('[data-corrigir]', tela).forEach(b => b.addEventListener('click', () => modalCorrigirEngate(gs.find(g => g.id === b.dataset.corrigir))));
  $$('.eg-barra', tela).forEach(b => b.addEventListener('click', () => { const g = gs.find(x => x.id === b.dataset.g); if (g && pode) modalCorrigirEngate(g); }));
});

// ---------- Bloco no cadastro do equipamento (cavalo ou carreta) ----------
async function htmlEngatesDoEquipamento(e) {
  const papel = PAPEL_EQ(e.tipo); if (!papel) return '';
  const gs = await api.listar('v_engates', `ativo=eq.true&${papel === 'cavalo' ? 'cavalo_id' : 'carreta_id'}=eq.${e.id}&order=inicio.desc&limit=50`).catch(() => []);
  const atual = gs.find(g => !g.fim), outro = g => papel === 'cavalo' ? [g.carreta_id, g.carreta_codigo, g.carreta_placas] : [g.cavalo_id, g.cavalo_codigo, g.cavalo_placas];
  const pode = editaFrota(), rotOutro = papel === 'cavalo' ? 'carreta' : 'cavalo';
  return `<div class="cartao" id="eg-bloco"><div class="topo" style="margin:0 0 8px"><h2 style="margin:0">Atrelamento</h2>
      <div class="acoes"><a class="btn peq" href="#/frota/atrelamentos?${papel}=${e.id}">Ver na linha do tempo</a>
        ${pode ? `<button class="btn peq prim" data-eg-atrelar="${papel}">${atual ? 'Trocar ' + rotOutro : 'Atrelar ' + (papel === 'cavalo' ? 'a uma carreta' : 'a um cavalo')}</button>${atual ? '<button class="btn peq" data-eg-solta>Desatrelar</button>' : ''}` : ''}</div></div>
    ${atual ? `<div class="eg-atual"><span class="eg-atual-l">Hoje com ${rotOutro === 'carreta' ? 'a carreta' : 'o cavalo'}</span>
        <a href="#/cadastros/equipamentos/ver/${outro(atual)[0]}"><b>${esc(outro(atual)[1] || '—')}</b></a> <span class="mono muted">${esc(outro(atual)[2] || '')}</span>
        <span class="muted">· desde ${dataHoraBR(atual.inicio)} (${egDur(atual.dias)})${atual.km_inicio != null ? ' · ' + egKm(atual.km_inicio) : ''}</span></div>`
      : `<div class="eg-atual vazio-l">Sem ${rotOutro} atrelad${rotOutro === 'carreta' ? 'a' : 'o'} no momento.</div>`}
    ${gs.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>${rotOutro === 'carreta' ? 'Carreta' : 'Cavalo'}</th><th>Início</th><th>Fim</th><th>Duração</th><th>Motivo</th></tr></thead><tbody>
      ${gs.map(g => `<tr><td data-r="${rotOutro}"><a href="#/cadastros/equipamentos/ver/${outro(g)[0]}"><b>${esc(outro(g)[1] || '—')}</b></a> <span class="mono muted">${esc(outro(g)[2] || '')}</span></td>
        <td data-r="Início" class="nowrap">${dataHoraBR(g.inicio)}</td><td data-r="Fim" class="nowrap">${g.fim ? dataHoraBR(g.fim) : '<span class="tag verde">Atual</span>'}</td>
        <td data-r="Duração">${egDur(g.dias)}</td><td data-r="Motivo" class="muted">${esc([g.motivo_inicio, g.motivo_fim && 'Saída: ' + g.motivo_fim].filter(Boolean).join(' · ') || '—')}</td></tr>`).join('')}</tbody></table></div>` : ''}</div>`;
}
function ligarEngatesDoEquipamento(raiz, e) {
  const b = $('[data-eg-atrelar]', raiz);
  b?.addEventListener('click', () => modalEngatar(b.dataset.egAtrelar === 'cavalo' ? { cavalo: e.id } : { carreta: e.id }));
  $('[data-eg-solta]', raiz)?.addEventListener('click', async () => {
    const papel = PAPEL_EQ(e.tipo);
    const [g] = await api.listar('v_engates', `ativo=eq.true&fim=is.null&${papel === 'cavalo' ? 'cavalo_id' : 'carreta_id'}=eq.${e.id}`);
    if (g) modalDesengatar(g);
  });
}
