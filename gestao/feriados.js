// Verbo Gestão — Feriados (nacionais, SP, Guararapes e Lençóis Paulista)
// Feriado não trava nem estende nada: só conta quando alguém registra no processo que o dia foi respeitado
// (pelo cliente ou pela empresa). A operação segue 24 h; o calendário serve para todos estarem cientes.
'use strict';

const FER_ABR = { nacional: ['Nacional', 'azul'], estadual: ['Estadual SP', 'verde'], municipal: ['Municipal', 'amarelo'] };
const FER_TIPO = { feriado: 'Feriado', ponto_facultativo: 'Ponto facultativo' };
const ferRotulo = f => `${f.nome}${f.abrangencia === 'municipal' && f.cidade ? ' · ' + f.cidade : f.abrangencia === 'estadual' ? ' · SP' : ''}${f.tipo === 'ponto_facultativo' ? ' (ponto facultativo)' : ''}`;
const ferDiaSemana = d => new Date(d + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
const podeFeriados = () => tem('administrador', 'rh', 'dp');

// ===================== Cadastro =====================
rota('/cadastros/feriados', async tela => {
  const ano = Number(estado.params.get('ano')) || new Date().getFullYear();
  const fs = await api.listar('feriados', `ativo=eq.true&data=gte.${ano}-01-01&data=lte.${ano}-12-31&order=data,abrangencia`).catch(err => { falha(err); return []; });
  const anos = [ano - 1, ano, ano + 1];
  const hoje = hojeISO();
  tela.innerHTML = `<div class="topo"><div><h1>Feriados ${ano}</h1><p class="sub">Nacionais, estaduais (SP) e municipais (Guararapes e Lençóis Paulista). A operação segue 24 h: o calendário é para todos estarem cientes.
      Nos processos, feriado só altera prazo quando se registra que não houve expediente no dia (no cliente ou na Verbo).</p></div>
      <div class="acoes">${anos.map(a => `<a class="btn ${a === ano ? 'prim' : ''}" href="#/cadastros/feriados?ano=${a}">${a}</a>`).join('')}
        ${podeFeriados() ? `<button class="btn" id="fer-gerar">Gerar ${ano + 1}</button><button class="btn prim" id="fer-novo">+ Feriado</button>` : ''}</div></div>
    <div class="cartao" id="fer-lista">${fs.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Data</th><th>Feriado</th><th>Abrangência</th><th>Tipo</th><th>Fonte</th><th></th></tr></thead><tbody>
      ${fs.map(f => `<tr data-f${fAttr('abr', FER_ABR[f.abrangencia][0])}${fAttr('cidade', f.cidade || (f.abrangencia === 'nacional' ? 'Brasil' : 'SP'))}${fAttr('tipo', FER_TIPO[f.tipo])}${fAttr('busca', [f.nome, f.cidade, f.observacao].join(' '))} class="${f.data < hoje ? 'muted' : ''}">
        <td data-r="Data" class="nowrap"><b>${dataBR(f.data)}</b> <span class="muted">${ferDiaSemana(f.data)}</span></td>
        <td data-r="Feriado">${esc(f.nome)}${f.observacao ? `<div class="muted">${esc(f.observacao)}</div>` : ''}</td>
        <td data-r="Abrangência"><span class="tag ${FER_ABR[f.abrangencia][1]}">${FER_ABR[f.abrangencia][0]}</span>${f.cidade ? ' ' + esc(f.cidade) : ''}</td>
        <td data-r="Tipo">${FER_TIPO[f.tipo]}</td><td data-r="Fonte" class="muted">${esc(f.fonte || '')}</td>
        <td class="nowrap">${podeFeriados() ? `<button class="btn peq" data-ed="${f.id}">Editar</button><button class="btn peq perigo" data-del="${f.id}">Remover</button>` : ''}</td></tr>`).join('')}
      </tbody></table></div>` : `<div class="vazio">Nenhum feriado cadastrado em ${ano}.${podeFeriados() ? ` Use “Gerar ${ano}” a partir do ano anterior.` : ''}</div>`}</div>
    <p class="muted">Ponto facultativo (Carnaval, Corpus Christi nacional, vésperas) não é feriado para a iniciativa privada: depende de convenção coletiva ou do cliente.
      Os municipais do ano seguinte são gerados a partir do ano anterior e devem ser conferidos com as prefeituras.</p>`;
  filtroLocal(tela, { itens: 'tbody tr[data-f]', antes: '#fer-lista', campos: [{ k: 'abr', rotulo: 'Abrangência' }, { k: 'cidade', rotulo: 'Local' }, { k: 'tipo', rotulo: 'Tipo' }] });
  const form = async (f = {}) => {
    const r = await modal(`<form><h2>${f.id ? 'Editar' : 'Novo'} feriado</h2><div class="form">
      <label class="campo">Data *<input type="date" name="data" required value="${f.data || ''}"></label>
      <label class="campo largo">Nome *<input name="nome" required value="${esc(f.nome || '')}"></label>
      <label class="campo">Abrangência *<select name="abrangencia">${Object.entries(FER_ABR).map(([k, [t]]) => `<option value="${k}" ${k === (f.abrangencia || 'municipal') ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo" id="c-cid">Cidade<select name="cidade">${['Guararapes', 'Lençóis Paulista'].map(c => `<option ${c === f.cidade ? 'selected' : ''}>${c}</option>`).join('')}<option value="_outra" ${f.cidade && !['Guararapes', 'Lençóis Paulista'].includes(f.cidade) ? 'selected' : ''}>Outra…</option></select></label>
      <label class="campo" id="c-cid2" hidden>Outra cidade<input name="cidade2" value="${esc(f.cidade && !['Guararapes', 'Lençóis Paulista'].includes(f.cidade) ? f.cidade : '')}"></label>
      <label class="campo">Tipo<select name="tipo">${Object.entries(FER_TIPO).map(([k, t]) => `<option value="${k}" ${k === (f.tipo || 'feriado') ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo">Repetir nos próximos anos<select name="regra"><option value="fixo" ${f.regra === 'fixo' || !f.id ? 'selected' : ''}>Sim, mesma data</option><option value="" ${f.id && !f.regra ? 'selected' : ''}>Não (só este ano)</option>
        ${f.regra && f.regra.startsWith('pascoa') ? `<option value="${f.regra}" selected>Sim, data móvel (Páscoa)</option>` : ''}</select></label>
      <label class="campo largo">Fonte<input name="fonte" value="${esc(f.fonte || '')}" placeholder="Lei, decreto, edital…"></label>
      <label class="campo largo">Observação<input name="observacao" value="${esc(f.observacao || '')}"></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`,
      { aoAbrir: raiz => { const fm = $('form', raiz); const s = () => { const mun = fm.abrangencia.value === 'municipal'; $('#c-cid', raiz).hidden = !mun; $('#c-cid2', raiz).hidden = !mun || fm.cidade.value !== '_outra'; };
          fm.abrangencia.onchange = s; fm.cidade.onchange = s; s(); },
        validar: d => d.abrangencia === 'municipal' && d.cidade === '_outra' && !d.cidade2 ? 'Informe a cidade.' : null });
    if (!r) return;
    const mun = r.abrangencia === 'municipal';
    const dados = { data: r.data, nome: r.nome.trim(), abrangencia: r.abrangencia, uf: r.abrangencia === 'nacional' ? null : 'SP', cidade: mun ? (r.cidade === '_outra' ? r.cidade2.trim() : r.cidade) : null,
      tipo: r.tipo, regra: r.regra || null, fonte: r.fonte || null, observacao: r.observacao || null };
    try { if (f.id) await api.alterar('feriados', `id=eq.${f.id}`, dados); else await api.inserir('feriados', dados); aviso('Feriado salvo.'); navegar(); } catch (err) { falha(err); }
  };
  $('#fer-novo')?.addEventListener('click', () => form());
  $$('[data-ed]', tela).forEach(b => (b.onclick = () => form(fs.find(f => f.id === b.dataset.ed))));
  $$('[data-del]', tela).forEach(b => (b.onclick = async () => { if (!await confirmar('Remover este feriado do calendário?', { botao: 'Remover' })) return;
    try { await api.alterar('feriados', `id=eq.${b.dataset.del}`, { ativo: false }); navegar(); } catch (err) { falha(err); } }));
  $('#fer-gerar')?.addEventListener('click', async e => {
    await ocupado(e.currentTarget, async () => { try { const n = await api.rpc('gerar_feriados', { p_ano: ano + 1 }); aviso(n ? `${n} feriado(s) gerado(s) para ${ano + 1}. Confira os municipais.` : `Nada a gerar: ${ano + 1} já está cadastrado.`); location.hash = `#/cadastros/feriados?ano=${ano + 1}`; } catch (err) { falha(err); } }); });
});

// ===================== Início: próximos feriados =====================
{ const orig = ROTAS['/inicio'];
  if (orig) rota('/inicio', async (tela, ...a) => {
    await orig(tela, ...a);
    try {
      const ag = $('#minha-agenda', tela);
      if (ag) {   // feriados dentro da Minha agenda: marca o dia e lista na legenda
        const dias = $$('[data-agdia]', ag).map(b => b.dataset.agdia);
        const fs = await api.rpc('feriados_periodo', { p_ini: dias[0], p_fim: dias[dias.length - 1] }).catch(() => []);
        if (!document.body.contains(tela)) return;
        fs.forEach(f => { const b = $(`[data-agdia="${f.data}"]`, ag); if (!b) return; b.classList.add('fer'); b.title = `${ferRotulo(f)}${b.title ? '\n' + b.title : ''}`; });
        const prox = fs.filter(f => f.data >= hojeISO());
        if (prox.length) $('.ag-leg', ag)?.insertAdjacentHTML('beforebegin', `<div class="ag-fer">${ico('calendario')} ${prox.map(f => `<span><b>${dataBR(f.data).slice(0, 5)}</b> ${esc(ferRotulo(f))}</span>`).join(' · ')} <span class="muted">· a operação segue 24 h</span></div>`);
        $('.ag-leg', ag)?.insertAdjacentHTML('beforeend', '<span><i class="ag-fer-i"></i>Feriado</span>');
        return;
      }
      const fs = await api.rpc('feriados_periodo', { p_ini: hojeISO(), p_fim: somaDias(hojeISO(), 30) });
      if (!fs?.length || !document.body.contains(tela)) return;
      const alvo = $('.inicio-hero', tela) || tela.firstElementChild;
      alvo?.insertAdjacentHTML('afterend', `<div class="cartao fer-faixa"><b>📅 Próximos feriados</b> <span class="muted">(a operação segue 24 h)</span>
        <div class="fer-lista">${fs.map(f => `<span class="fer-item${f.data === hojeISO() ? ' hoje' : ''}"><b>${dataBR(f.data)}</b> ${ferDiaSemana(f.data)} · ${esc(ferRotulo(f))}</span>`).join('')}</div>
        ${telaPermitida('/cadastros/feriados') ? '<a class="btn peq" href="#/cadastros/feriados">Calendário</a>' : ''}</div>`);
    } catch {}
  }); }

// ===================== Processos (admissão / desligamento) =====================
// cartão com os feriados do período e os dias registrados "sem expediente" neste processo
const FER_POR = { cliente: 'no cliente', empresa: 'na Verbo' };
const FER_EFEITO = { cliente: 'o prazo de resposta do cliente e a data de integração são recalculados', empresa: 'os prazos internos das etapas são prorrogados em 1 dia útil' };
function htmlFeriadosProcesso(D, entidade, andamento, pode) {
  const fs = D.feriados || [], rs = D.respeitados || [];
  const fds = d => [0, 6].includes(new Date(d + 'T12:00').getDay());
  const dias = [...new Set([...fs.map(f => f.data).filter(d => !fds(d)), ...rs.map(r => r.data)])].sort();
  if (!dias.length && !(andamento && pode)) return '';
  const partes = entidade === 'admissao' ? ['cliente', 'empresa'] : ['empresa'];
  const linhas = dias.map(d => {
    const f = fs.filter(x => x.data === d), m = rs.filter(r => r.data === d);
    const cel = por => { const r = m.find(x => x.por === por);
      return `<td data-r="${por === 'cliente' ? 'Cliente' : 'Verbo'}">${r ? `<span class="tag vermelho">sem expediente</span>${r.ajustadas ? ` <span class="muted">${r.ajustadas} prazo(s) prorrogado(s)</span>` : ''}${r.obs ? `<div class="muted">${esc(r.obs)}</div>` : ''}
          ${andamento && pode ? ` <button class="btn peq" data-ferdel="${r.id}" title="Registrado por ${esc(r.quem || '')}">Desfazer</button>` : ''}`
        : `<span class="muted">expediente normal</span>${andamento && pode && f.length ? ` <button class="btn peq" data-ferreg="${d}" data-por="${por}">Registrar sem expediente</button>` : ''}`}</td>`; };
    return `<tr><td data-r="Data"><b>${dataBR(d)}</b> ${ferDiaSemana(d)}</td><td data-r="Ocorrência">${f.length ? f.map(x => esc(ferRotulo(x))).join(' / ') : '<i>dia sem expediente (fora do calendário)</i>'}</td>${partes.map(cel).join('')}</tr>`; }).join('');
  return `<div class="cartao"><div class="topo" style="margin:0 0 6px"><div><h2 style="margin:0">Calendário do processo · feriados e pontos facultativos</h2>
      <div class="muted">Por padrão, todo dia útil conta nos prazos. Registre <b>sem expediente</b> somente após confirmar que ${entidade === 'admissao' ? 'o cliente ou a Verbo' : 'a Verbo'} não funcionou no dia.
      ${partes.map(p => `Sem expediente ${FER_POR[p]}: ${FER_EFEITO[p]}.`).join(' ')}
      Prazos legais não são prorrogados (${entidade === 'admissao' ? 'eSocial S-2200: transmissão até o dia anterior ao início das atividades' : 'pagamento das verbas rescisórias em até 10 dias (CLT art. 477, § 6º), eSocial S-2299, guias e ASO demissional'}): antecipe.</div></div>
      ${andamento && pode ? '<button class="btn peq" data-ferreg="" data-por="">+ Registrar outro dia</button>' : ''}</div>
    ${linhas ? `<div class="tabela-rol"><table class="tabela compacta"><thead><tr><th>Data</th><th>Ocorrência</th>${partes.map(p => `<th>Expediente ${FER_POR[p]}</th>`).join('')}</tr></thead><tbody>${linhas}</tbody></table></div>`
      : '<p class="muted">Nenhum feriado ou ponto facultativo em dia útil no período do processo.</p>'}</div>`;
}
function ligarFeriadosProcesso(tela, entidade, id) {
  $$('[data-ferreg]', tela).forEach(b => (b.onclick = async () => {
    let data = b.dataset.ferreg, por = b.dataset.por, obs = null;
    if (!data || !por) {
      const r = await modal(`<form><h2>Registrar dia sem expediente</h2><div class="form">
        <label class="campo">Data *<input type="date" name="data" required></label>
        <label class="campo">Onde não houve expediente *<select name="por">${entidade === 'admissao' ? '<option value="cliente">No cliente</option>' : ''}<option value="empresa">Na Verbo Logística</option></select></label>
        <label class="campo largo">Motivo / observação<input name="obs" placeholder="Ex.: feriado municipal do cliente, emenda de feriado comunicada pelo cliente…"></label>
        <p class="muted largo">Se a data não estiver no calendário de feriados, informe o motivo.</p></div>
        <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Registrar</button></div></form>`);
      if (!r) return; data = r.data; por = r.por; obs = r.obs || null;
    } else if (!await confirmar(`Registrar que não houve expediente ${FER_POR[por]} em ${dataBR(data)}? Efeito: ${FER_EFEITO[por]}.`, { botao: 'Registrar' })) return;
    try { const x = await api.rpc('registrar_feriado_processo', { p_entidade: entidade, p_id: id, p_data: data, p_por: por, p_obs: obs });
      aviso(x.etapas_ajustadas ? `Registrado. ${x.etapas_ajustadas} prazo(s) interno(s) prorrogado(s) em 1 dia útil.` : 'Registrado.'); navegar(); } catch (err) { falha(err); } }));
  $$('[data-ferdel]', tela).forEach(b => (b.onclick = async () => { if (!await confirmar('Desfazer este registro? Os prazos voltam ao que eram.', { botao: 'Desfazer' })) return;
    try { await api.rpc('remover_feriado_processo', { p_reg: b.dataset.ferdel }); navegar(); } catch (err) { falha(err); } }));
}
// aviso de feriado ao escolher uma data (não bloqueia)
async function avisoFeriadoData(data) {
  if (!data) return '';
  const fs = await api.rpc('feriados_periodo', { p_ini: data, p_fim: data }).catch(() => []);
  return fs.length ? `📅 ${dataBR(data)} é ${fs.map(ferRotulo).join(' / ')}. Confirme se o cliente/instrutor trabalha nesse dia.` : '';
}
