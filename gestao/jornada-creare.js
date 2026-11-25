// Verbo Gestão — Controle de jornada pelos apontamentos do Creare (E09). Visão inicial, sem a escala.
// Regras (Lei 13.103/2015 e CLT art. 235-C; conferir com o jurídico): jornada de 8h + até 2h extras (4h com acordo coletivo),
// interjornada mínima de 11h, 30 min de pausa a cada 5h30 de direção, 1h de refeição. Tempo de espera conta como jornada (STF, ADI 5322).
'use strict';

const JC = {
  GRUPO: { deslocamento: 'direcao', fila_carregamento: 'espera', fila_descarga: 'espera', fila_balanca: 'espera', aguardando_documento: 'espera',
    carregamento: 'trabalho', amarracao: 'trabalho', descarga: 'trabalho', limpeza: 'trabalho', jornada: 'trabalho', abastecimento: 'trabalho',
    refeicao: 'refeicao', descanso: 'descanso', necessidades: 'necessidades', manutencao: 'manutencao', nao_apontado: 'sem', parada: 'outros', outros: 'outros' },
  NOME: { direcao: 'Direção', espera: 'Espera', trabalho: 'Trabalho', refeicao: 'Refeição', descanso: 'Descanso', necessidades: 'Necessidades', manutencao: 'Manutenção', sem: 'Sem apontamento', outros: 'Outros' },
  COR: { direcao: '#56A8E8', espera: '#E2B93B', trabalho: '#2BB673', refeicao: '#9AA5B1', descanso: '#78909C', necessidades: '#B0BEC5', manutencao: '#9B7BD8', sem: '#D64545', outros: '#8D6E63' },
  FIM_TURNO: [3101, 3102], INICIO_TURNO: [3111, 3112], QUEBRA_H: 4, DESCANSO_LONGO_H: 4
};
const jcH = h => { const m = Math.round((+h || 0) * 60); return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`; };
const jcHora = ts => new Date(ts).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '');
const jcNorm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

// monta as jornadas de cada motorista: uma nova começa depois de "fim de turno", de descanso longo (≥ 4h) ou de 4h sem nenhum apontamento dele
function jcJornadas(rows) {
  const porMot = {};
  rows.forEach(([mot, placa, frota, cod, cat, msg, ini, fim]) => {
    const i = new Date(ini).getTime(), f = Math.max(new Date(fim).getTime(), i);
    (porMot[jcNorm(mot)] ||= { nome: mot, ev: [] }).ev.push({ placa, frota, cod, cat, msg, i, f, g: JC.GRUPO[cat] || 'outros' });
  });
  const js = [];
  Object.values(porMot).forEach(({ nome, ev }) => {
    ev.sort((a, b) => a.i - b.i);
    let atual = null, fimAnterior = null;
    // registros curtos (< 1h, ex.: motorista que entra só para apontar "necessidades") aparecem, mas não contam como jornada anterior na interjornada
    const fecha = () => { if (atual && atual.ev.length) { atual.curto = (atual.fim - atual.ini) < 36e5; js.push(atual); if (!atual.curto) fimAnterior = atual.fim; } atual = null; };
    ev.forEach(e => {
      const longo = e.g === 'descanso' && (e.f - e.i) / 36e5 >= JC.DESCANSO_LONGO_H;
      if (atual && (e.i - atual.ultimoFim) / 36e5 >= JC.QUEBRA_H) fecha();
      if (longo || JC.FIM_TURNO.includes(e.cod)) { if (atual) { atual.fim = Math.max(atual.ultimoFim, e.i); atual.fimMarcado = JC.FIM_TURNO.includes(e.cod); fecha(); } return; }
      if (!atual) atual = { nome, ev: [], ini: e.i, fim: e.f, ultimoFim: e.f, fimAnterior };
      atual.ev.push(e); atual.fim = Math.max(atual.fim, e.f); atual.ultimoFim = Math.max(atual.ultimoFim, e.f);
    });
    fecha();
  });
  return js.map(jcMedir).sort((a, b) => b.ini - a.ini);
}
function jcMedir(j) {
  const t = {}; Object.keys(JC.NOME).forEach(k => (t[k] = 0));
  let dirCont = 0, dirMax = 0, pausa = 0;
  j.ev.forEach(e => {
    const h = Math.max(0, (Math.min(e.f, j.fim) - e.i) / 36e5); t[e.g] += h;
    if (e.g === 'direcao') { if (pausa >= 0.5) dirCont = 0; pausa = 0; dirCont += h; dirMax = Math.max(dirMax, dirCont); } else pausa += h;
  });
  const dur = (j.fim - j.ini) / 36e5, trab = Math.max(0, dur - t.refeicao - t.descanso), inter = j.fimAnterior ? (j.ini - j.fimAnterior) / 36e5 : null;
  const frotas = [...new Set(j.ev.map(e => e.frota))];
  const al = [];
  if (j.curto) return { ...j, t, dur, trab, inter, dirMax, frotas, al: [['medio', 'Registro curto (menos de 1h)']], aberta: false };
  if (trab > 12) al.push(['crit', `Jornada de ${jcH(trab)} (acima de 12h)`]); else if (trab > 10) al.push(['alto', `Jornada de ${jcH(trab)} (acima de 8h + 2h extras)`]);
  if (inter != null && inter < 11) al.push([inter < 8 ? 'crit' : 'alto', `Interjornada de ${jcH(inter)} (mínimo 11h)`]);
  if (dirMax > 5.5) al.push(['alto', `${jcH(dirMax)} de direção sem pausa de 30 min (máx. 5h30)`]);
  if (trab > 6 && t.refeicao < 1) al.push(['medio', t.refeicao ? `Refeição de ${jcH(t.refeicao)} (mínimo 1h)` : 'Sem refeição apontada']);
  if (t.sem >= 0.5) al.push(['medio', `${jcH(t.sem)} sem apontamento`]);
  return { ...j, t, dur, trab, inter, dirMax, frotas, al, aberta: Date.now() - j.ultimoFim < 15 * 60000 && !j.fimMarcado };
}

rota('/operacao/jornadas/creare', async tela => {
  const P = estado.params, hoje = hojeISO(), ini = P.get('ini') || somaDias(hoje, -6), fim = P.get('fim') || hoje, mot = P.get('mot') || '', soAl = P.get('alertas') === '1';
  let rows, cols;
  try { [rows, cols] = await Promise.all([api.rpc('jornada_creare', { p_ini: new Date(ini + 'T00:00:00-03:00').toISOString(), p_fim: new Date(fim + 'T23:59:59-03:00').toISOString() }),
    api.listar('v_colaboradores_basico', 'select=id,nome,cargo&order=nome').catch(() => [])]); } catch (err) { falha(err); return; }
  if (rows == null) { tela.innerHTML = '<div class="cartao vazio">Sem permissão para ver o controle de jornada.</div>'; return; }
  const iniTs = new Date(ini + 'T00:00:00-03:00').getTime();
  const todas = jcJornadas(rows).filter(j => j.ini >= iniTs);
  const mapa = new Map(cols.map(c => [jcNorm(c.nome), c]));
  const nomes = [...new Set(todas.map(j => j.nome))].sort((a, b) => a.localeCompare(b));
  const semCad = nomes.filter(n => !mapa.has(jcNorm(n)));
  const ls = todas.filter(j => (!mot || j.nome === mot) && (!soAl || j.al.length));
  const nAl = todas.filter(j => j.al.length).length, conta = tx => todas.filter(j => j.al.some(a => a[1].includes(tx))).length;
  const media = todas.length ? todas.reduce((s, j) => s + j.trab, 0) / todas.length : 0;
  const kpi = (n, r, cor = '') => `<div class="cartao kpi"${cor ? ` style="border-left:4px solid ${cor}"` : ''}><div class="n">${n}</div><div class="r">${r}</div></div>`;
  const barra = j => { const tot = Object.values(j.t).reduce((a, b) => a + b, 0) || 1;
    return `<div style="display:flex;height:8px;border-radius:4px;overflow:hidden;min-width:120px;background:#eef0f1">${Object.entries(j.t).filter(([, v]) => v > 0)
      .map(([k, v]) => `<i title="${JC.NOME[k]}: ${jcH(v)}" style="width:${(v / tot * 100).toFixed(1)}%;background:${JC.COR[k]}"></i>`).join('')}</div>`; };
  const corAl = { crit: 'vermelho', alto: 'amarelo', medio: '' };
  tela.innerHTML = `
    <div class="topo"><div><h1>Controle de jornada</h1><p class="sub">Montado automaticamente dos apontamentos dos motoristas no Creare · visão inicial, ainda sem a escala</p></div>
      <div class="acoes"><a class="btn" href="#/operacao/jornadas/km">Km por motorista</a><a class="btn" href="#/operacao/jornadas">Registro manual</a></div></div>
    <form class="filtros" id="jc-f"><label>De <input type="date" name="ini" value="${ini}"></label><label>Até <input type="date" name="fim" value="${fim}"></label>
      <select name="mot"><option value="">Todos os motoristas</option>${nomes.map(n => `<option ${n === mot ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
      <label class="check"><input type="checkbox" name="alertas" ${soAl ? 'checked' : ''}> Só com alerta</label><button class="btn prim">Ver</button></form>
    <div class="grade-kpi" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:12px">
      ${kpi(todas.length, `jornadas · ${nomes.length} motoristas`)}${kpi(nAl, 'com alerta', nAl ? '#D64545' : '#2BB673')}${kpi(jcH(media), 'jornada média (sem refeição e descanso)')}
      ${kpi(conta('Interjornada'), 'interjornada abaixo de 11h', conta('Interjornada') ? '#D64545' : '')}${kpi(conta('direção sem pausa'), 'direção acima de 5h30 sem pausa', conta('direção sem pausa') ? '#E2B93B' : '')}
      ${kpi(conta('Jornada de'), 'jornada acima de 10h', conta('Jornada de') ? '#E2B93B' : '')}</div>
    ${semCad.length ? `<div class="cartao" style="border-left:4px solid #E2B93B"><b>${semCad.length} de ${nomes.length} nomes do Creare não batem com o cadastro de colaboradores</b>
      <p class="muted" style="margin:4px 0 0">${semCad.map(esc).join(' · ')}</p><p class="muted" style="margin:4px 0 0">Corrija o nome no cadastro do colaborador ou no Creare para ficarem iguais; a jornada continua aparecendo aqui pelo nome do Creare.</p></div>` : ''}
    <div class="cartao">${ls.length ? `<div class="tabela-wrap"><table class="tabela compacta"><thead><tr><th>Motorista</th><th>Frota</th><th>Início</th><th>Fim</th>
      <th class="num">Jornada</th><th class="num">Direção</th><th class="num">Espera</th><th class="num">Refeição</th><th class="num">Interjornada</th><th>Composição</th><th>Alertas</th></tr></thead><tbody>
      ${ls.map((j, k) => `<tr data-j="${k}" style="cursor:pointer"><td><b>${esc(j.nome)}</b>${mapa.has(jcNorm(j.nome)) ? '' : ' <span class="tag amarelo" title="Nome não encontrado no cadastro">sem cadastro</span>'}</td>
        <td>${esc(j.frotas.join(', '))}</td><td class="nowrap">${jcHora(j.ini)}</td><td class="nowrap">${j.aberta ? '<span class="tag azul">em andamento</span>' : jcHora(j.fim)}</td>
        <td class="num"><b>${jcH(j.trab)}</b></td><td class="num">${jcH(j.t.direcao)}</td><td class="num">${jcH(j.t.espera)}</td><td class="num">${jcH(j.t.refeicao)}</td>
        <td class="num">${j.inter == null ? '—' : jcH(j.inter)}</td><td>${barra(j)}</td>
        <td>${j.al.length ? j.al.map(a => `<span class="tag ${corAl[a[0]]}" style="margin:1px">${esc(a[1])}</span>`).join(' ') : '<span class="tag verde">ok</span>'}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="vazio">Nenhuma jornada no período.</div>'}</div>
    <div class="cartao"><h2>Como é calculado</h2><ul class="muted" style="margin:0;padding-left:18px;line-height:1.55">
      <li>Cada jornada vai do primeiro ao último apontamento do motorista. Uma nova jornada começa depois de "fim de turno / troca", de descanso de 4h ou mais, ou de 4h sem nenhum apontamento dele.</li>
      <li><b>Jornada</b> = do início ao fim, menos refeição e descanso. Tempo de espera (filas, aguardando documento) conta como jornada.</li>
      <li>Alertas: jornada acima de 10h (8h + 2h extras) ou de 12h; interjornada abaixo de 11h; mais de 5h30 de direção sem pausa de 30 min; refeição abaixo de 1h em jornada acima de 6h; períodos sem apontamento.</li>
      <li>Referências: Lei 13.103/2015 e CLT art. 235-C. Confirmar com o jurídico, inclusive o que o acordo coletivo permite. Sem a escala, ainda não dá para comparar o planejado com o realizado.</li></ul>
      <p class="muted" style="margin-top:8px">${Object.entries(JC.COR).map(([k, c]) => `<span style="white-space:nowrap;margin-right:10px"><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${c};margin-right:4px"></i>${JC.NOME[k]}</span>`).join('')}</p></div>`;
  const f = $('#jc-f', tela);
  f.onsubmit = e => { e.preventDefault(); const d = formDados(f); location.hash = '#/operacao/jornadas/creare?' + new URLSearchParams({ ini: d.ini, fim: d.fim, ...(d.mot ? { mot: d.mot } : {}), ...(d.alertas ? { alertas: '1' } : {}) }); };
  $$('[data-j]', tela).forEach(tr => tr.onclick = () => { const j = ls[+tr.dataset.j];
    modal(`<div><h2>${esc(j.nome)} · ${jcHora(j.ini)} → ${j.aberta ? 'em andamento' : jcHora(j.fim)}</h2>
      <p class="muted">Jornada ${jcH(j.trab)} · direção ${jcH(j.t.direcao)} · espera ${jcH(j.t.espera)} · trabalho ${jcH(j.t.trabalho)} · refeição ${jcH(j.t.refeicao)} · descanso ${jcH(j.t.descanso)}${j.t.sem ? ' · sem apontamento ' + jcH(j.t.sem) : ''}</p>
      <div class="tabela-wrap" style="max-height:60vh;overflow:auto"><table class="tabela compacta"><thead><tr><th>Início</th><th>Fim</th><th class="num">Tempo</th><th>Apontamento</th><th>Frota</th></tr></thead><tbody>
      ${j.ev.map(e => `<tr><td class="nowrap">${jcHora(e.i)}</td><td class="nowrap">${jcHora(e.f)}</td><td class="num">${jcH((e.f - e.i) / 36e5)}</td>
        <td><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${JC.COR[e.g]};margin-right:5px"></i>${esc(e.msg || e.cat)} <span class="muted">${e.cod}</span></td><td>${esc(e.frota)}</td></tr>`).join('')}
      </tbody></table></div><div class="rodape"><button type="button" class="btn" data-fechar>Fechar</button></div></div>`); });
});
