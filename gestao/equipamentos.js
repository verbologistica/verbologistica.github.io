// Verbo Gestão — Equipamentos (frota): conjunto + composições (placas), documentos com vencimento e CRLV pelo calendário do estado
'use strict';

const editaFrota = () => tem('administrador', 'operacao', 'manutencao');
// tipo: [rótulo, composições padrão, nomes das composições]
const TIPOS_EQ = {
  carro: ['Carro', 1, ['Veículo']], motocicleta: ['Motocicleta', 1, ['Motocicleta']], caminhao: ['Caminhão', 1, ['Caminhão']],
  cavalo_mecanico: ['Cavalo mecânico', 1, ['Cavalo mecânico']], carreta: ['Carreta (cavalo + semirreboque)', 2, ['Cavalo mecânico', 'Semirreboque']],
  bitrem: ['Bitrem', 3, ['Cavalo mecânico', '1º semirreboque', '2º semirreboque']],
  tritrem: ['Tritrem', 4, ['Cavalo mecânico', '1º semirreboque', '2º semirreboque', '3º semirreboque']],
  rodotrem: ['Rodotrem', 4, ['Cavalo mecânico', '1º semirreboque', 'Dolly', '2º semirreboque']],
  utilitario: ['Utilitário', 1, ['Utilitário']], maquina: ['Máquina / equipamento', 1, ['Máquina']], outro: ['Outro', 1, ['Composição']],
};
const SITUACOES_EQ = { operando: ['Operando', 'verde'], manutencao: ['Em manutenção', 'amarelo'], parado: ['Parado', ''], vendido: ['Vendido', ''], baixado: ['Baixado', ''] };
const DOC_TIPOS = [['CRLV', true], ['Seguro / apólice', true], ['Tacógrafo (aferição Inmetro)', true], ['ANTT / RNTRC', true], ['AET (autorização especial de trânsito)', true],
  ['CIV (inspeção veicular)', true], ['CIPP (produtos perigosos)', true], ['Licença ambiental', true], ['Laudo / inspeção', true],
  ['Nota fiscal de compra', false], ['Contrato de financiamento / leasing', false], ['Manual / garantia', false], ['Outro', false]];
const nomeTipoEq = e => e.tipo === 'outro' ? (e.tipo_outro || 'Outro') : (TIPOS_EQ[e.tipo]?.[0] || 'Tipo a definir');
const rotuloEq = e => [e.codigo_frota, nomeTipoEq(e), [e.marca, e.modelo].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
const diasAte = d => Math.round((new Date(d + 'T12:00:00') - new Date(hojeISO() + 'T12:00:00')) / 864e5);
function tagDoc(d) {
  if (d.substituido_em) return '<span class="tag">Substituído</span>';
  if (!d.tem_validade || !d.vencimento) return '<span class="tag">Sem validade</span>';
  const n = diasAte(d.vencimento);
  return n < 0 ? `<span class="tag vermelho">Vencido há ${-n} dia(s)</span>` : n <= 30 ? `<span class="tag amarelo">Vence em ${n} dia(s)</span>`
    : n <= 60 ? `<span class="tag azul">Vence em ${n} dias</span>` : '<span class="tag verde">Em dia</span>';
}

// ---------- Lista ----------
rota('/cadastros/equipamentos', async tela => {
  const inativos = estado.params.get('inativos') === '1', q = (estado.params.get('q') || '').toLowerCase();
  const [eqs, venc, soltas] = await Promise.all([
    api.listar('equipamentos', `select=*,comps:veiculos(placa,codigo_frota,ordem,ativo)${inativos ? '' : '&ativo=eq.true'}&order=codigo_frota.asc.nullslast`),
    api.listar('v_documentos_vencimento', 'select=equipamento_id,faixa').catch(() => []),
    api.listar('veiculos', 'select=id,placa,codigo_frota,descricao_composicao,modelo&equipamento_id=is.null&ativo=eq.true&order=placa').catch(() => [])]);
  const st = {}; venc.forEach(v => { (st[v.equipamento_id] ||= { vencido: 0, vence_30: 0 }); if (v.faixa in st[v.equipamento_id]) st[v.equipamento_id][v.faixa]++; });
  const lista_ = eqs.filter(e => !q || [e.codigo_frota, nomeTipoEq(e), e.marca, e.modelo, ...e.comps.map(c => c.placa + ' ' + (c.codigo_frota || ''))].join(' ').toLowerCase().includes(q));
  tela.innerHTML = `
    <div class="topo"><div><h1>Equipamentos</h1><p class="sub">${lista_.length} equipamento(s) · ${lista_.reduce((s, e) => s + e.comps.filter(c => c.ativo).length, 0)} placa(s)</p></div>
      <div class="acoes"><a class="btn" href="#/frota/documentos">Documentos a vencer</a><a class="btn" href="#/cadastros/equipamentos${inativos ? '' : '?inativos=1'}">${inativos ? 'Ocultar inativos' : 'Mostrar inativos'}</a>
        ${editaFrota() ? '<a class="btn prim" href="#/cadastros/equipamentos/novo">+ Novo equipamento</a>' : ''}</div></div>
    <form class="filtros" id="filtros"><input name="q" value="${esc(estado.params.get('q') || '')}" placeholder="Buscar por código de frota, placa, marca ou modelo" style="min-width:280px"><button class="btn">Buscar</button></form>
    <div class="cartao">${lista_.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Código de frota</th><th>Tipo</th><th>Marca / modelo</th><th>Placas</th><th>Situação</th><th>Documentos</th></tr></thead><tbody>
      ${lista_.map(e => { const s = st[e.id] || {}; const cs = e.comps.filter(c => c.ativo).sort((a, b) => a.ordem - b.ordem);
        return `<tr class="clicavel" onclick="location.hash='#/cadastros/equipamentos/ver/${e.id}'"><td data-r="Código" class="nowrap"><b>${esc(e.codigo_frota || '—')}</b></td>
        <td data-r="Tipo">${esc(nomeTipoEq(e))}${e.qtd_composicoes > 1 ? ` <span class="muted">(${e.qtd_composicoes} composições)</span>` : ''}${!e.tipo ? ' <span class="tag amarelo">Completar cadastro</span>' : ''}</td>
        <td data-r="Marca / modelo">${esc([e.marca, e.modelo].filter(Boolean).join(' ') || '—')}</td>
        <td data-r="Placas" class="mono">${cs.map(c => esc(c.placa)).join('<br>')}</td>
        <td data-r="Situação"><span class="tag ${SITUACOES_EQ[e.situacao]?.[1] || ''}">${esc(SITUACOES_EQ[e.situacao]?.[0] || e.situacao)}</span>${e.ativo ? '' : ' <span class="tag">Inativo</span>'}</td>
        <td data-r="Documentos">${s.vencido ? `<span class="tag vermelho">${s.vencido} vencido(s)</span> ` : ''}${s.vence_30 ? `<span class="tag amarelo">${s.vence_30} vencendo</span>` : ''}${!s.vencido && !s.vence_30 ? '<span class="muted">ok</span>' : ''}</td></tr>`; }).join('')}
    </tbody></table></div>` : '<div class="vazio">Nenhum equipamento cadastrado.</div>'}</div>
    ${soltas.length ? `<div class="cartao"><h2>Placas sem conjunto (${soltas.length})</h2><p class="muted">Desatreladas: paradas, em manutenção ou aguardando um conjunto. Os documentos continuam com elas.</p>
      <ul class="lista-simples">${soltas.map(v => `<li><span><a href="#/cadastros/placas/ver/${v.id}" class="mono"><b>${esc(v.placa)}</b></a> ${esc([v.descricao_composicao, v.codigo_frota && 'frota ' + v.codigo_frota].filter(Boolean).join(' · '))}</span>
        ${editaFrota() ? `<button class="btn peq" data-atrelar="${v.id}">Atrelar a um equipamento</button>` : ''}</li>`).join('')}</ul></div>` : ''}`;
  $$('[data-atrelar]', tela).forEach(b => b.addEventListener('click', () => modalTroca(soltas.find(v => v.id === b.dataset.atrelar), null)));
  $('#filtros').onsubmit = e => { e.preventDefault(); const v = formDados(e.target).q;
    location.hash = '#/cadastros/equipamentos?' + new URLSearchParams({ ...(v ? { q: v } : {}), ...(inativos ? { inativos: 1 } : {}) }); };
});
rota('/cadastros/veiculos', () => { location.hash = '#/cadastros/equipamentos'; });

// ---------- Formulário ----------
rota('/cadastros/equipamentos/novo', tela => formEquipamento(tela));
rota('/cadastros/equipamentos/editar/:id', async (tela, id) => formEquipamento(tela, await api.um('equipamentos', `id=eq.${id}&select=*`)));

async function formEquipamento(tela, e = null) {
  if (!editaFrota()) { tela.innerHTML = '<div class="cartao vazio">Sem permissão para editar equipamentos.</div>'; return; }
  const [ccs, users, comps] = await Promise.all([centros(), usuarios(),
    e ? api.listar('veiculos', `equipamento_id=eq.${e.id}&ativo=eq.true&order=ordem`) : []]);
  const tipoIni = e?.tipo || '';
  const linhaComp = (c = {}, i = 0, nomePadrao = '') => `<div class="cartao comp" style="margin:8px 0;padding:12px" data-id="${esc(c.id || '')}">
      <div class="topo" style="margin:0 0 6px"><b>Composição ${i + 1}</b></div><div class="form">
      <label class="campo">Descrição<input name="c_desc" value="${esc(c.descricao_composicao || nomePadrao)}"></label>
      <label class="campo">Placa *<input name="c_placa" value="${esc(c.placa || '')}" style="text-transform:uppercase" placeholder="ABC1D23"></label>
      <label class="campo">Código de frota<input name="c_cod" value="${esc(c.codigo_frota || '')}"></label>
      <label class="campo">Renavam<input name="c_renavam" value="${esc(c.renavam || '')}" inputmode="numeric"></label>
      <label class="campo">Chassi<input name="c_chassi" value="${esc(c.chassi || '')}" style="text-transform:uppercase"></label>
      <label class="campo">Marca<input name="c_marca" value="${esc(c.marca || '')}" placeholder="Se for diferente do conjunto"></label>
      <label class="campo">Ano fabricação / modelo<input name="c_ano" value="${esc([c.ano_fabricacao, c.ano_modelo].filter(Boolean).join('/'))}" placeholder="2022/2023"></label>
      <label class="campo">Estado do registro (UF)<select name="c_uf"><option value=""></option>${UFS.map(u => `<option ${u === c.uf_registro ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
      <label class="campo">Calendário do CRLV<select name="c_cat"><option value="caminhao" ${c.categoria_licenciamento === 'caminhao' ? 'selected' : ''}>Caminhão / cavalo mecânico</option>
        <option value="geral" ${c.categoria_licenciamento === 'geral' ? 'selected' : ''}>Demais (carro, moto, reboque, semirreboque)</option></select></label>
      <label class="campo">Capacidade<input name="c_cap" value="${esc(c.capacidade || '')}" placeholder="Ex.: 30 t, 60 m³"></label>
      ${c.id ? '' : `<label class="campo">No conjunto desde<input type="date" name="c_desde" value="${hojeISO()}"></label>`}</div></div>`;
  tela.innerHTML = `
    <div class="topo"><div><h1>${e ? 'Editar ' + esc(rotuloEq(e)) : 'Novo equipamento'}</h1>
      <p class="sub">Um equipamento é o conjunto que trabalha junto (ex.: um tritrem). Cada composição tem sua placa, código de frota e documentos.</p></div></div>
    <form id="f-eq">
      <div class="cartao"><h2>Equipamento</h2><div class="form">
        <label class="campo">Código de frota<input name="codigo_frota" value="${esc(e?.codigo_frota || '')}" placeholder="Ex.: TT-01"></label>
        <label class="campo">Tipo *<select name="tipo" data-sem-outro required><option value="">Selecione…</option>${Object.entries(TIPOS_EQ).map(([v, t]) => `<option value="${v}" ${v === tipoIni ? 'selected' : ''}>${t[0]}</option>`).join('')}</select></label>
        <label class="campo" id="campo-outro" ${tipoIni === 'outro' ? '' : 'hidden'}>Qual?<input name="tipo_outro" value="${esc(e?.tipo_outro || '')}" placeholder="Ex.: Prancha, Caminhão-munck"></label>
        <label class="campo">Nº de composições (placas)<input name="qtd" type="number" min="1" max="9" value="${e?.qtd_composicoes || 1}"></label>
        <label class="campo">Marca<input name="marca" value="${esc(e?.marca || '')}"></label>
        <label class="campo">Modelo<input name="modelo" value="${esc(e?.modelo || '')}"></label>
        <label class="campo">Ano fabricação<input name="ano_fabricacao" type="number" value="${e?.ano_fabricacao ?? ''}"></label>
        <label class="campo">Ano modelo<input name="ano_modelo" type="number" value="${e?.ano_modelo ?? ''}"></label>
        <label class="campo">Combustível<select name="combustivel"><option value=""></option>${['Diesel S10', 'Diesel S500', 'Gasolina', 'Etanol', 'Flex', 'GNV', 'Elétrico', 'Não se aplica'].map(o => `<option ${o === e?.combustivel ? 'selected' : ''}>${o}</option>`).join('')}</select></label>
        <label class="campo">Cor<input name="cor" value="${esc(e?.cor || '')}"></label>
        <label class="campo">Centro de custo<select name="centro_custo_id">${opcoes(ccs.filter(c => c.ativo), null, c => c.nome, e?.centro_custo_id, 'Nenhum')}</select></label>
        <label class="campo">Motorista principal<select name="motorista_padrao_id">${opcoes(users.filter(u => u.ativo), null, u => u.nome, e?.motorista_padrao_id, 'Nenhum')}</select></label>
        <label class="campo">Km atual<input name="km_atual" type="number" value="${e?.km_atual ?? ''}"></label>
        <label class="campo">Horímetro<input name="horimetro" inputmode="decimal" value="${e?.horimetro ?? ''}"></label>
        <label class="campo">Situação<select name="situacao">${Object.entries(SITUACOES_EQ).map(([v, t]) => `<option value="${v}" ${v === (e?.situacao || 'operando') ? 'selected' : ''}>${t[0]}</option>`).join('')}</select></label>
        <label class="campo largo">Observações<textarea name="observacoes" rows="2">${esc(e?.observacoes || '')}</textarea></label>
      </div></div>
      <div class="cartao"><h2>Composições</h2><p class="muted">Todas andam atreladas e formam um só equipamento, mas cada uma tem placa, código de frota e documentos próprios.</p>
        <div id="comps"></div></div>
      <div class="acoes"><button class="btn prim" value="salvar">Salvar</button>
        ${e ? `<button class="btn ${e.ativo ? 'perigo' : ''}" value="${e.ativo ? 'desativar' : 'ativar'}">${e.ativo ? 'Desativar' : 'Reativar'}</button>` : ''}
        <a class="btn" href="javascript:history.back()">Cancelar</a></div>
    </form>`;
  const f = $('#f-eq'), box = $('#comps');
  const lerComp = el => ({ id: el.dataset.id || null, ...Object.fromEntries($$('input,select', el).map(i => [i.name, i.value.trim()])) });
  const catPadrao = (tipo, nome) => ['caminhao', 'cavalo_mecanico'].includes(tipo) || /cavalo/i.test(nome || '') ? 'caminhao' : 'geral';
  const desenhar = (qtd, tipo, novoTipo = false) => {
    const atuais = $$('.comp', box).map(lerComp);
    const nomes = TIPOS_EQ[tipo]?.[2] || [];
    box.innerHTML = Array.from({ length: qtd }, (_, i) => {
      const a = atuais[i];
      const base = a ? { id: a.id, descricao_composicao: novoTipo ? nomes[i] || a.c_desc : a.c_desc, placa: a.c_placa, codigo_frota: a.c_cod, renavam: a.c_renavam, chassi: a.c_chassi, marca: a.c_marca,
                         ano_fabricacao: a.c_ano, uf_registro: a.c_uf, categoria_licenciamento: novoTipo ? catPadrao(tipo, nomes[i]) : a.c_cat, capacidade: a.c_cap }
        : (comps[i] || { categoria_licenciamento: catPadrao(tipo, nomes[i]) });
      return linhaComp(base, i, nomes[i] || (qtd > 1 ? `Composição ${i + 1}` : ''));
    }).join('');
  };
  desenhar(Math.max(Number(f.qtd.value) || 1, comps.length), tipoIni);
  f.tipo.onchange = () => { $('#campo-outro').hidden = f.tipo.value !== 'outro'; const q = TIPOS_EQ[f.tipo.value]?.[1] || 1; f.qtd.value = q; desenhar(q, f.tipo.value, true); };
  f.qtd.onchange = () => desenhar(Math.min(9, Math.max(1, Number(f.qtd.value) || 1)), f.tipo.value);

  f.onsubmit = async ev => {
    ev.preventDefault();
    const d = formDados(f), acao = ev.submitter?.value || 'salvar';
    if (d.tipo === 'outro' && !d.tipo_outro) return aviso('Informe qual é o tipo de equipamento.', true);
    const cs = $$('.comp', box).map(lerComp);
    if (cs.some(c => !c.c_placa)) return aviso('Informe a placa de todas as composições.', true);
    const placas = cs.map(c => c.c_placa.toUpperCase().replace(/[^A-Z0-9]/g, ''));
    if (new Set(placas).size !== placas.length) return aviso('Há placas repetidas nas composições.', true);
    const ano = v => { const [a, b] = String(v || '').split(/[/\- ]+/).map(Number); return [a || null, b || a || null]; };
    const dados = { codigo_frota: d.codigo_frota || null, tipo: d.tipo, tipo_outro: d.tipo === 'outro' ? d.tipo_outro : null, qtd_composicoes: cs.length,
      marca: d.marca || null, modelo: d.modelo || null, ano_fabricacao: d.ano_fabricacao ? Number(d.ano_fabricacao) : null, ano_modelo: d.ano_modelo ? Number(d.ano_modelo) : null,
      combustivel: d.combustivel || null, cor: d.cor || null, centro_custo_id: d.centro_custo_id || null, motorista_padrao_id: d.motorista_padrao_id || null,
      km_atual: d.km_atual ? Number(d.km_atual) : null, horimetro: num(d.horimetro), situacao: d.situacao, observacoes: d.observacoes || null };
    if (acao === 'desativar' || acao === 'ativar') dados.ativo = acao === 'ativar';
    await ocupado(ev.submitter, async () => {
      try {
        let id = e?.id;
        if (e) await api.alterar('equipamentos', `id=eq.${id}`, dados); else [{ id }] = await api.inserir('equipamentos', dados);
        const usados = new Set();
        for (const [i, c] of cs.entries()) {
          const [af, am] = ano(c.c_ano);
          const v = { equipamento_id: id, ordem: i + 1, descricao_composicao: c.c_desc || null, placa: c.c_placa, codigo_frota: c.c_cod || null, renavam: c.c_renavam || null,
            chassi: c.c_chassi ? c.c_chassi.toUpperCase() : null, marca: c.c_marca || dados.marca, ano_fabricacao: af, ano_modelo: am, uf_registro: c.c_uf || null,
            categoria_licenciamento: c.c_cat || 'geral', capacidade: c.c_cap || null, modelo: i === 0 ? dados.modelo : (c.c_desc || dados.modelo),
            combustivel: i === 0 ? dados.combustivel : null, centro_custo_id: dados.centro_custo_id, motorista_padrao_id: dados.motorista_padrao_id,
            ativo: dados.ativo ?? true };
          if (c.id) { await api.alterar('veiculos', `id=eq.${c.id}`, v); usados.add(c.id); }
          else { const [nv] = await api.inserir('veiculos', v); usados.add(nv.id);
                 if (c.c_desde && c.c_desde < hojeISO()) await api.rpc('ajustar_inicio_atrelamento', { p_veiculo: nv.id, p_inicio: new Date(c.c_desde + 'T00:00:00').toISOString() }); }
        }
        // composição retirada no cadastro: fica sem conjunto (com histórico), não é apagada
        for (const old of comps) if (!usados.has(old.id)) await api.rpc('atrelar_placa', { p_veiculo: old.id, p_equipamento: null, p_motivo: 'Retirada do conjunto no cadastro' });
        delete estado.cache.veiculos; aviso('Equipamento salvo.'); location.hash = '#/cadastros/equipamentos/ver/' + id;
      } catch (err) {
        falha(/veiculos_placa_key|duplicate.*placa/i.test(err.message) ? new Error('Essa placa já está cadastrada em outro equipamento.')
          : /codigo_uk|duplicate/i.test(err.message) ? new Error('Esse código de frota já está em uso.') : err);
      }
    });
  };
}

// ---------- Detalhe e documentos ----------
rota('/cadastros/equipamentos/ver/:id', async (tela, id) => {
  const e = await api.um('equipamentos', `id=eq.${id}&select=*`);
  if (!e) { tela.innerHTML = '<div class="cartao vazio">Equipamento não encontrado.</div>'; return; }
  const hist = estado.params.get('historico') === '1';
  const [comps, docs, ccs, users, hists] = await Promise.all([
    api.listar('veiculos', `equipamento_id=eq.${id}&ativo=eq.true&order=ordem`),
    api.listar('equipamento_documentos', `equipamento_id=eq.${id}&ativo=eq.true${hist ? '' : '&substituido_em=is.null'}&order=tipo,vencimento.desc`),
    centros(), usuarios(), api.listar('v_atrelamentos', `equipamento_id=eq.${id}&order=inicio.desc&limit=200`).catch(() => [])]);
  const anx = {}; await Promise.all(docs.map(async d => (anx[d.id] = await htmlAnexos('documento_equipamento', d.id))));
  const pode = editaFrota();
  const tabelaDocs = ds => ds.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Documento</th><th>Vencimento</th><th>Situação</th><th>Arquivo</th><th></th></tr></thead><tbody>
    ${ds.map(d => `<tr><td data-r="Documento"><b>${esc(d.nome)}</b><div class="muted">${esc(d.tipo)}${d.tipo === 'CRLV' ? ` · ${esc(d.uf || '')} · exercício ${d.exercicio || ''}` : ''}${d.numero ? ' · nº ' + esc(d.numero) : ''}</div>
      ${d.observacao ? `<div class="muted">${esc(d.observacao)}</div>` : ''}</td>
      <td data-r="Vencimento" class="nowrap">${d.vencimento ? dataBR(d.vencimento) : '—'}</td><td data-r="Situação">${tagDoc(d)}</td><td data-r="Arquivo">${anx[d.id]}</td>
      <td>${pode ? `<button class="btn peq perigo" data-rem="${d.id}">Remover</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Nenhum documento.</div>';
  const vencidos = docs.filter(d => !d.substituido_em && d.tem_validade && diasAte(d.vencimento) < 0).length;
  const vencendo = docs.filter(d => !d.substituido_em && d.tem_validade && diasAte(d.vencimento) >= 0 && diasAte(d.vencimento) <= 30).length;
  const semCrlv = comps.filter(c => !docs.some(d => d.veiculo_id === c.id && d.tipo === 'CRLV' && !d.substituido_em));
  tela.innerHTML = `
    <div class="topo"><div><h1>${esc(e.codigo_frota || 'Sem código')} · ${esc(nomeTipoEq(e))}</h1>
      <p class="sub">${esc([e.marca, e.modelo, e.ano_fabricacao && `${e.ano_fabricacao}/${e.ano_modelo || e.ano_fabricacao}`].filter(Boolean).join(' · '))}
        <span class="tag ${SITUACOES_EQ[e.situacao]?.[1] || ''}">${esc(SITUACOES_EQ[e.situacao]?.[0] || '')}</span>${e.ativo ? '' : ' <span class="tag">Inativo</span>'}</p></div>
      <div class="acoes">${pode ? `<button class="btn prim" id="novo-doc">+ Documento</button><a class="btn" href="#/cadastros/equipamentos/editar/${id}">Editar</a>` : ''}
        <a class="btn" href="#/manut/os?eq=${id}&status=todas">Manutenção (OS)</a><a class="btn" href="#/manut/pneus?eq=${id}">Pneus</a>
        <a class="btn" href="#/cadastros/equipamentos/ver/${id}${hist ? '' : '?historico=1'}">${hist ? 'Ocultar histórico' : 'Ver histórico de documentos'}</a>
        <a class="btn" href="#/cadastros/equipamentos">Voltar</a></div></div>
    ${!e.tipo ? '<div class="cartao alerta-obs">Cadastro incompleto: clique em Editar e informe o tipo, a marca e o código de frota.</div>' : ''}
    <div class="grade" style="margin-bottom:16px">
      <div class="cartao kpi"><div class="n">${comps.length}</div><div class="r">composição(ões) / placa(s)</div></div>
      <div class="cartao kpi ${vencidos ? 'alerta' : ''}"><div class="n">${vencidos}</div><div class="r">documento(s) vencido(s)</div></div>
      <div class="cartao kpi ${vencendo ? 'alerta' : ''}"><div class="n">${vencendo}</div><div class="r">vencendo em 30 dias</div></div>
      <div class="cartao kpi ${semCrlv.length ? 'alerta' : ''}"><div class="n">${semCrlv.length}</div><div class="r">placa(s) sem CRLV anexado</div></div>
    </div>
    <div class="cartao"><div class="form">
      <div><div class="muted">Centro de custo</div><b>${esc(ccs.find(c => c.id === e.centro_custo_id)?.nome || '—')}</b></div>
      <div><div class="muted">Motorista principal</div><b>${esc(users.find(u => u.id === e.motorista_padrao_id)?.nome || '—')}</b></div>
      <div><div class="muted">Combustível</div><b>${esc(e.combustivel || '—')}</b></div>
      <div><div class="muted">Km / horímetro</div><b>${e.km_atual != null ? Number(e.km_atual).toLocaleString('pt-BR') + ' km' : '—'}${e.horimetro != null ? ' · ' + e.horimetro + ' h' : ''}</b></div>
      ${e.observacoes ? `<div class="largo"><div class="muted">Observações</div><div style="white-space:pre-line">${esc(e.observacoes)}</div></div>` : ''}
    </div></div>
    ${comps.map(c => `<div class="cartao"><div class="topo" style="margin:0 0 8px"><div><h2 style="margin:0">${esc(c.descricao_composicao || 'Composição ' + c.ordem)} · <span class="mono">${esc(c.placa)}</span></h2>
        <div class="muted">${esc([c.codigo_frota && 'Frota ' + c.codigo_frota, c.renavam && 'Renavam ' + c.renavam, c.chassi && 'Chassi ' + c.chassi, c.uf_registro && 'Registro ' + c.uf_registro,
          c.categoria_licenciamento === 'caminhao' ? 'CRLV: calendário de caminhão' : 'CRLV: calendário geral', c.capacidade].filter(Boolean).join(' · '))}</div></div>
        <div class="acoes">${pode ? `<button class="btn peq" data-doc="${c.id}">+ Documento</button><button class="btn peq" data-trocar="${c.id}">Trocar / desatrelar</button>` : ''}
          <a class="btn peq" href="#/cadastros/placas/ver/${c.id}">Histórico da placa</a></div></div>
      ${tabelaDocs(docs.filter(d => d.veiculo_id === c.id))}</div>`).join('')}
    <div class="cartao"><div class="topo" style="margin:0 0 8px"><h2 style="margin:0">Documentos do conjunto</h2>${pode ? '<button class="btn peq" data-doc="">+ Documento do conjunto</button>' : ''}</div>
      ${tabelaDocs(docs.filter(d => !d.veiculo_id))}</div>
    <div class="cartao"><div class="topo" style="margin:0 0 8px"><h2 style="margin:0">Histórico de atrelamentos</h2>
        <form class="filtros" id="f-data" style="margin:0"><label class="muted" style="align-self:center">Composição em</label><input type="datetime-local" name="quando" required><button class="btn peq">Ver</button></form></div>
      <div id="na-data"></div>
      ${tabelaHistorico(hists, 'placa')}</div>`;

  const novoDoc = alvo => modalDocumento(comps, id, alvo);
  $('#novo-doc')?.addEventListener('click', () => novoDoc(''));
  $$('[data-trocar]', tela).forEach(b => b.addEventListener('click', () => modalTroca(comps.find(c => c.id === b.dataset.trocar), e)));
  $('#f-data').onsubmit = async ev => { ev.preventDefault(); const q = formDados(ev.target).quando;
    try { const r = await api.rpc('composicao_na_data', { p_equipamento: id, p_data: new Date(q).toISOString() });
      $('#na-data').innerHTML = `<div class="conferencia" style="margin-bottom:10px">Em ${dataHoraBR(new Date(q).toISOString())}: ${r.length ? r.map(x => `<b>${esc(x.descricao_composicao || 'Composição ' + x.ordem)}</b> <span class="mono">${esc(x.placa)}</span>`).join(' · ') : 'nenhuma placa registrada neste conjunto'}</div>`;
    } catch (err) { falha(err); } };
  $$('[data-doc]', tela).forEach(b => b.addEventListener('click', () => novoDoc(b.dataset.doc)));
  $$('[data-rem]', tela).forEach(b => b.addEventListener('click', async () => {
    const motivo = await confirmar('Remover este documento?', { comMotivo: true, botao: 'Remover' });
    if (!motivo) return;
    try { await api.alterar('equipamento_documentos', `id=eq.${b.dataset.rem}`, { ativo: false, observacao: 'Removido: ' + motivo }); aviso('Documento removido.'); navegar(); }
    catch (err) { falha(err); }
  }));
});

// ---------- Documentos a vencer ----------
rota('/frota/documentos', async tela => {
  const faixa = estado.params.get('faixa') || 'todos';
  const filtro = { vencidos: '&faixa=eq.vencido', proximos: '&faixa=in.(vencido,vence_30,vence_60)', todos: '' }[faixa] ?? '';
  const ds = await api.listar('v_documentos_vencimento', `select=*${filtro}&order=vencimento`);
  const n = f => ds.filter(d => d.faixa === f).length;
  tela.innerHTML = `
    <div class="topo"><div><h1>Documentos a vencer</h1><p class="sub">CRLV, seguros, aferições e demais documentos com validade de todos os equipamentos</p></div>
      <a class="btn" href="#/cadastros/equipamentos">Equipamentos</a></div>
    <div class="grade" style="margin-bottom:16px">
      <a class="cartao kpi ${n('vencido') ? 'alerta' : ''}" href="#/frota/documentos?faixa=vencidos"><div class="n">${n('vencido')}</div><div class="r">vencidos</div></a>
      <div class="cartao kpi ${n('vence_30') ? 'alerta' : ''}"><div class="n">${n('vence_30')}</div><div class="r">vencem em até 30 dias</div></div>
      <div class="cartao kpi"><div class="n">${n('vence_60')}</div><div class="r">vencem de 31 a 60 dias</div></div>
    </div>
    <form class="filtros" id="filtros"><select name="faixa">${[['proximos', 'Vencidos e próximos 60 dias'], ['vencidos', 'Só vencidos'], ['todos', 'Todos com validade']].map(([v, t]) => `<option value="${v}" ${v === faixa ? 'selected' : ''}>${t}</option>`).join('')}</select><button class="btn">Filtrar</button></form>
    <div class="cartao">${ds.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Equipamento</th><th>Placa</th><th>Documento</th><th>Vencimento</th><th>Situação</th></tr></thead><tbody>
      ${ds.map(d => `<tr class="clicavel" onclick="location.hash='${d.equipamento_id ? '#/cadastros/equipamentos/ver/' + d.equipamento_id : '#/cadastros/placas/ver/' + d.veiculo_id}'">
        <td data-r="Equipamento"><b>${esc(d.equipamento_id ? d.equipamento_codigo || 'Sem código' : 'Sem conjunto')}</b> <span class="muted">${esc(TIPOS_EQ[d.equipamento_tipo]?.[0] || '')}</span></td>
        <td data-r="Placa" class="mono">${esc(d.placa || 'Conjunto')}${d.descricao_composicao ? `<div class="muted">${esc(d.descricao_composicao)}</div>` : ''}</td>
        <td data-r="Documento">${esc(d.nome)}<div class="muted">${esc(d.tipo)}</div></td>
        <td data-r="Vencimento" class="nowrap">${dataBR(d.vencimento)}</td><td data-r="Situação">${tagDoc({ tem_validade: true, vencimento: d.vencimento })}</td></tr>`).join('')}
    </tbody></table></div>` : '<div class="vazio">Nenhum documento nesta situação. 🎉</div>'}</div>`;
  $('#filtros').onsubmit = ev => { ev.preventDefault(); location.hash = '#/frota/documentos?faixa=' + formDados(ev.target).faixa; };
});

// ---------- Anexar documento (equipamento ou placa) ----------
async function modalDocumento(comps, equipamentoId, alvo) {
    const anoAtual = new Date().getFullYear();
    const cal = await api.listar('v_calendario_crlv_status', 'select=uf,ano_confirmado').catch(() => []);
    const r = await modal(`<form><h2>Anexar documento</h2><div class="form">
      <label class="campo largo">De qual placa?<select name="alvo"><option value="">Conjunto (equipamento inteiro)</option>
        ${comps.map(c => `<option value="${c.id}" ${c.id === alvo ? 'selected' : ''}>${esc((c.descricao_composicao || 'Composição ' + c.ordem) + ' · ' + c.placa)}</option>`).join('')}</select></label>
      <label class="campo">Tipo de documento<select name="tipo" data-sem-outro>${DOC_TIPOS.map(([t]) => `<option>${esc(t)}</option>`).join('')}</select></label>
      <label class="campo">Nome do arquivo *<input name="nome" required placeholder="Ex.: CRLV 2026 cavalo"></label>
      <label class="campo">Número (opcional)<input name="numero"></label>
      <label class="check largo" id="campo-val"><input type="checkbox" name="validade"> Este documento tem prazo de validade</label>
      <div class="largo form" id="bloco-crlv" style="padding:0" hidden>
        <label class="campo">Estado que emitiu o CRLV *<select name="uf">${UFS.map(u => `<option>${u}</option>`).join('')}</select></label>
        <label class="campo">Exercício (ano do CRLV) *<input name="exercicio" type="number" value="${anoAtual}"></label>
        <div class="largo conferencia" id="crlv-calc"></div></div>
      <label class="campo" id="campo-venc" hidden>Vencimento<input type="date" name="vencimento"></label>
      <label class="campo largo">Observação<input name="observacao"></label>
      <label class="campo largo">Arquivo (PDF ou foto) *<input type="file" name="arquivos" accept="image/*,application/pdf" multiple></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar documento</button></div></form>`, {
      aoAbrir: raiz => {
        const f = $('form', raiz);
        const calc = async () => {
          const c = comps.find(x => x.id === f.alvo.value);
          if (f.tipo.value !== 'CRLV') return;
          if (!c) { $('#crlv-calc', raiz).innerHTML = '<span class="erro-txt">O CRLV é de uma placa: escolha a composição acima.</span>'; return; }
          try {
            const v = await api.rpc('vencimento_crlv', { p_uf: f.uf.value, p_categoria: c.categoria_licenciamento, p_placa: c.placa, p_exercicio: Number(f.exercicio.value) });
            if (v) { f.vencimento.value = v; $('#crlv-calc', raiz).innerHTML = `Placa final <b>${c.placa.replace(/\D/g, '').slice(-1)}</b> · ${c.categoria_licenciamento === 'caminhao' ? 'calendário de caminhão' : 'calendário geral'} de ${f.uf.value}: este CRLV vale até <b>${dataBR(v)}</b> (prazo do licenciamento ${Number(f.exercicio.value) + 1}). Se o Detran mudar a data, altere abaixo.`
              + (() => { const k = cal.find(x => x.uf === f.uf.value); return k && k.ano_confirmado < Number(f.exercicio.value) + 1
                  ? `<br><span class="erro-txt">Atenção: o calendário ${Number(f.exercicio.value) + 1} de ${f.uf.value} ainda não foi confirmado; a data foi estimada pela regra de ${k.ano_confirmado}.</span>` : ''; })(); }
            else { f.vencimento.value = ''; $('#crlv-calc', raiz).innerHTML = `<span class="erro-txt">Não há calendário de ${f.uf.value} cadastrado. Informe o vencimento abaixo (ou cadastre o estado em Configurações → Calendário do CRLV).</span>`; }
          } catch (err) { $('#crlv-calc', raiz).textContent = err.message; }
        };
        const sinc = () => {
          const crlv = f.tipo.value === 'CRLV';
          if (crlv) { f.validade.checked = true; const c = comps.find(x => x.id === f.alvo.value); if (c?.uf_registro) f.uf.value = c.uf_registro; }
          else f.validade.checked = DOC_TIPOS.find(t => t[0] === f.tipo.value)?.[1] ?? false;
          $('#campo-val', raiz).hidden = crlv; $('#bloco-crlv', raiz).hidden = !crlv; $('#campo-venc', raiz).hidden = !f.validade.checked;
          if (!f.nome.dataset.mexeu) { const c = comps.find(x => x.id === f.alvo.value); f.nome.value = `${f.tipo.value === 'Outro' ? '' : f.tipo.value.split(' (')[0]}${crlv ? ' ' + f.exercicio.value : ''}${c ? ' · ' + c.placa : ''}`.trim(); }
          calc();
        };
        f.nome.oninput = () => (f.nome.dataset.mexeu = 1);
        f.tipo.onchange = sinc; f.alvo.onchange = sinc; f.uf.onchange = calc; f.exercicio.oninput = () => { if (!f.nome.dataset.mexeu) sinc(); else calc(); };
        f.validade.onchange = () => { $('#campo-venc', raiz).hidden = !f.validade.checked; };
        if (alvo) f.tipo.value = 'CRLV';
        sinc();
      },
      validar: d => {
        if (d.tipo === 'CRLV' && !d.alvo) return 'O CRLV é de uma placa: escolha a composição.';
        if (d.tipo === 'CRLV' && (!d.uf || !d.exercicio)) return 'Informe o estado e o exercício do CRLV.';
        if ((d.validade || d.tipo === 'CRLV') && !d.vencimento) return 'Informe a data de vencimento.';
        if (!d.arquivos.length) return 'Anexe o arquivo do documento.';
        return null;
      } });
    if (!r) return;
    try {
      const crlv = r.tipo === 'CRLV';
      const [doc] = await api.inserir('equipamento_documentos', { equipamento_id: equipamentoId, veiculo_id: r.alvo || null, tipo: r.tipo, nome: r.nome, numero: r.numero || null,
        tem_validade: crlv || !!r.validade, vencimento: (crlv || r.validade) ? r.vencimento : null, uf: crlv ? r.uf : null, exercicio: crlv ? Number(r.exercicio) : null,
        observacao: r.observacao || null });
      await anexar('documento_equipamento', doc.id, r.arquivos);
      aviso('Documento salvo.'); navegar();
    } catch (err) { falha(err); }
  }

// ---------- Histórico de atrelamentos ----------
function tabelaHistorico(hs, foco) {
  if (!hs.length) return '<div class="vazio">Sem histórico ainda.</div>';
  return `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>${foco === 'placa' ? 'Placa' : 'Equipamento'}</th><th>Posição</th><th>Entrou</th><th>Saiu</th><th>Motivo</th></tr></thead><tbody>
    ${hs.map(h => `<tr><td data-r="${foco === 'placa' ? 'Placa' : 'Equipamento'}">${foco === 'placa' ? `<a class="mono" href="#/cadastros/placas/ver/${h.veiculo_id}">${esc(h.placa)}</a>`
        : `<a href="#/cadastros/equipamentos/ver/${h.equipamento_id}"><b>${esc(h.equipamento_codigo || 'Sem código')}</b></a> <span class="muted">${esc(h.equipamento_tipo === 'outro' ? h.tipo_outro || '' : TIPOS_EQ[h.equipamento_tipo]?.[0] || '')}</span>`}</td>
      <td data-r="Posição">${esc(h.descricao_composicao || (h.ordem ? 'Composição ' + h.ordem : '—'))}</td>
      <td data-r="Entrou" class="nowrap">${dataHoraBR(h.inicio)}${h.km_inicio != null ? `<div class="muted">${Number(h.km_inicio).toLocaleString('pt-BR')} km</div>` : ''}</td>
      <td data-r="Saiu" class="nowrap">${h.fim ? dataHoraBR(h.fim) : '<span class="tag verde">Atual</span>'}${h.km_fim != null ? `<div class="muted">${Number(h.km_fim).toLocaleString('pt-BR')} km</div>` : ''}</td>
      <td data-r="Motivo"><span class="muted">${esc([h.motivo_inicio && 'Entrada: ' + h.motivo_inicio, h.motivo_fim && 'Saída: ' + h.motivo_fim].filter(Boolean).join(' · ') || '—')}</span></td></tr>`).join('')}
  </tbody></table></div>`;
}
const agoraLocal = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

// Trocar / desatrelar / atrelar uma placa (eq = conjunto atual, ou nulo se a placa está solta)
async function modalTroca(placa, eq) {
  const [eqs, placas] = await Promise.all([
    api.listar('equipamentos', 'select=id,codigo_frota,tipo,tipo_outro,marca,modelo&ativo=eq.true&order=codigo_frota.asc.nullslast'),
    api.listar('veiculos', 'select=id,placa,codigo_frota,descricao_composicao,equipamento_id,ordem&ativo=eq.true&order=placa')]);
  const rotE = x => [x.codigo_frota || 'Sem código', nomeTipoEq(x), [x.marca, x.modelo].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
  const porE = porId(eqs);
  const outras = placas.filter(v => v.id !== placa.id && (!eq || v.equipamento_id !== eq.id));
  const r = await modal(`<form><h2>${eq ? 'Trocar atrelamento' : 'Atrelar placa'} · <span class="mono">${esc(placa.placa)}</span></h2>
    ${eq ? `<p class="muted">Hoje no conjunto <b>${esc(rotE(eq))}</b> como ${esc(placa.descricao_composicao || 'composição ' + placa.ordem)}.</p>` : '<p class="muted">Esta placa está sem conjunto.</p>'}
    <div class="form"><div class="largo">
      ${eq ? `<label class="opcao"><input type="radio" name="acao" value="substituir" checked> <span><b>Substituir por outra placa</b> — outra placa entra nesta posição</span></label>` : ''}
      <label class="opcao"><input type="radio" name="acao" value="mover" ${eq ? '' : 'checked'}> <span><b>${eq ? 'Mover para outro equipamento' : 'Atrelar a um equipamento'}</b></span></label>
      ${eq ? '<label class="opcao"><input type="radio" name="acao" value="desatrelar"> <span><b>Desatrelar</b> — fica sem conjunto (pátio, manutenção, venda…)</span></label>' : ''}</div>
      <div class="largo form" id="b-subst" style="padding:0">
        <label class="campo largo">Placa que entra no lugar<select name="outra"><option value="">Selecione…</option>
          ${outras.map(v => `<option value="${v.id}">${esc(v.placa)} · ${esc(v.descricao_composicao || '')} · ${v.equipamento_id ? 'hoje em ' + esc(rotE(porE[v.equipamento_id] || {})) : 'sem conjunto'}</option>`).join('')}</select></label>
        <div class="largo" id="b-destino-saida"></div></div>
      <div class="largo form" id="b-mover" style="padding:0">
        <label class="campo largo">Equipamento de destino<select name="destino"><option value="">Selecione…</option>
          ${eqs.filter(x => !eq || x.id !== eq.id).map(x => `<option value="${x.id}">${esc(rotE(x))}</option>`).join('')}</select></label>
        <label class="campo">Posição no conjunto<input name="descricao" value="${esc(placa.descricao_composicao || '')}" placeholder="Ex.: Cavalo mecânico"></label></div>
      <label class="campo">Data e hora da troca *<input type="datetime-local" name="quando" value="${agoraLocal()}" required></label>
      <label class="campo">Km do cavalo (opcional)<input name="km" type="number"></label>
      <label class="campo largo">Motivo *<input name="motivo" required placeholder="Ex.: cavalo foi para manutenção preventiva"></label></div>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Registrar troca</button></div></form>`, {
    aoAbrir: raiz => {
      const f = $('form', raiz);
      const sinc = () => {
        const a = $('[name=acao]:checked', raiz).value;
        $('#b-subst', raiz).hidden = a !== 'substituir'; $('#b-mover', raiz).hidden = a !== 'mover';
        const o = placas.find(v => v.id === f.outra?.value);
        $('#b-destino-saida', raiz).innerHTML = a === 'substituir' && o ? `<div class="muted" style="margin-bottom:4px">E a placa ${esc(placa.placa)}, que sai, vai para:</div>
          <label class="opcao"><input type="radio" name="saida" value="solta" checked> <span>Fica sem conjunto</span></label>
          ${o.equipamento_id ? `<label class="opcao"><input type="radio" name="saida" value="troca"> <span>Vai para o conjunto de onde a ${esc(o.placa)} saiu (${esc(rotE(porE[o.equipamento_id] || {}))}) — troca entre conjuntos</span></label>` : ''}` : '';
      };
      $$('[name=acao]', raiz).forEach(x => (x.onchange = sinc)); if (f.outra) f.outra.onchange = sinc; sinc();
    },
    validar: d => d.acao === 'substituir' && !d.outra ? 'Escolha a placa que entra no lugar.' : d.acao === 'mover' && !d.destino ? 'Escolha o equipamento de destino.'
      : !d.motivo ? 'Informe o motivo da troca.' : new Date(d.quando) > new Date(Date.now() + 864e5) ? 'A data não pode ser no futuro.' : null });
  if (!r) return;
  const quando = new Date(r.quando).toISOString(), km = r.km ? Number(r.km) : null;
  const mover = (v, destino, ordem, desc, motivo) => api.rpc('atrelar_placa', { p_veiculo: v, p_equipamento: destino, p_ordem: ordem ?? null, p_descricao: desc || null, p_data: quando, p_motivo: motivo, p_km: km });
  try {
    if (r.acao === 'desatrelar') await mover(placa.id, null, null, null, r.motivo);
    else if (r.acao === 'mover') await mover(placa.id, r.destino, null, r.descricao, r.motivo);
    else {
      const o = placas.find(v => v.id === r.outra);
      const origemOutra = o.equipamento_id, ordemOutra = o.ordem, descOutra = o.descricao_composicao;
      await mover(placa.id, null, null, null, r.motivo);                                                     // sai
      await mover(o.id, eq.id, placa.ordem, placa.descricao_composicao, `${r.motivo} (entra no lugar da ${placa.placa})`); // entra
      if (r.saida === 'troca' && origemOutra) await mover(placa.id, origemOutra, ordemOutra, descOutra, `${r.motivo} (troca com a ${o.placa})`);
    }
    aviso('Troca registrada no histórico.'); navegar();
  } catch (err) { falha(err); }
}

// ---------- Placa (composição): dados, documentos e histórico ----------
rota('/cadastros/placas/ver/:id', async (tela, id) => {
  const v = await api.um('veiculos', `id=eq.${id}&select=*`);
  if (!v) { tela.innerHTML = '<div class="cartao vazio">Placa não encontrada.</div>'; return; }
  const [eq, docs, hists] = await Promise.all([
    v.equipamento_id ? api.um('equipamentos', `id=eq.${v.equipamento_id}&select=*`) : null,
    api.listar('equipamento_documentos', `veiculo_id=eq.${id}&ativo=eq.true&order=tipo,vencimento.desc`),
    api.listar('v_atrelamentos', `veiculo_id=eq.${id}&order=inicio.desc`).catch(() => [])]);
  const anx = {}; await Promise.all(docs.map(async d => (anx[d.id] = await htmlAnexos('documento_equipamento', d.id))));
  const pode = editaFrota();
  tela.innerHTML = `
    <div class="topo"><div><h1>Placa <span class="mono">${esc(v.placa)}</span></h1>
      <p class="sub">${esc(v.descricao_composicao || '')}${eq ? ` · no conjunto <a href="#/cadastros/equipamentos/ver/${eq.id}"><b>${esc(eq.codigo_frota || 'sem código')}</b> ${esc(nomeTipoEq(eq))}</a>` : ' · <span class="tag amarelo">Sem conjunto</span>'}</p></div>
      <div class="acoes">${pode ? `<button class="btn prim" id="novo-doc">+ Documento</button><button class="btn" id="trocar">${eq ? 'Trocar / desatrelar' : 'Atrelar a um equipamento'}</button>` : ''}
        <button class="btn" onclick="history.back()">Voltar</button></div></div>
    <div class="cartao"><div class="form">
      ${[['Código de frota', v.codigo_frota], ['Renavam', v.renavam], ['Chassi', v.chassi], ['Marca', v.marca], ['Ano', [v.ano_fabricacao, v.ano_modelo].filter(Boolean).join('/')],
         ['Registro', v.uf_registro], ['Calendário do CRLV', v.categoria_licenciamento === 'caminhao' ? 'Caminhão / cavalo' : 'Geral'], ['Capacidade', v.capacidade]]
        .map(([k, x]) => `<div><div class="muted">${k}</div><b>${esc(x || '—')}</b></div>`).join('')}
    </div></div>
    <div class="cartao"><h2>Documentos desta placa</h2>${docs.length ? `<ul class="lista-simples">${docs.map(d => `<li style="flex-wrap:wrap"><span><b>${esc(d.nome)}</b> <span class="muted">${esc(d.tipo)}</span> ${tagDoc(d)}</span>
      <span class="nowrap">${d.vencimento ? 'vence ' + dataBR(d.vencimento) : ''}</span><div style="flex-basis:100%">${anx[d.id]}</div></li>`).join('')}</ul>` : '<div class="vazio">Nenhum documento.</div>'}</div>
    <div class="cartao"><h2>Por onde esta placa passou</h2>${tabelaHistorico(hists, 'equipamento')}</div>`;
  $('#novo-doc')?.addEventListener('click', () => modalDocumento([v], v.equipamento_id, v.id));
  $('#trocar')?.addEventListener('click', () => modalTroca(v, eq));
});

// ---------- Calendário do CRLV: confirmação anual ----------
rota('/config/calendario_crlv', async tela => {
  const [st, linhas] = await Promise.all([api.listar('v_calendario_crlv_status', 'order=uf'),
    api.listar('cronograma_licenciamento', 'select=*&ativo=eq.true&order=uf,categoria,final_placa')]);
  const MES = ['', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const admin = tem('administrador');
  tela.innerHTML = `
    <div class="topo"><div><h1>Calendário do CRLV</h1><p class="sub">Vencimento do licenciamento por estado e final de placa. Todo ano, a partir de dezembro, o sistema pede para conferir o calendário do ano seguinte.</p></div>
      ${admin ? '<a class="btn" href="#/cadastros/cronograma_licenciamento">Editar datas / incluir estado</a>' : ''}</div>
    ${st.map(x => `<div class="cartao ${x.precisa_conferir ? 'alerta-obs' : ''}"><div class="topo" style="margin:0 0 8px"><div><h2 style="margin:0">${esc(x.uf)}</h2>
        <div class="muted">Calendário confirmado para <b>${x.ano_confirmado}</b>${x.confirmado_em ? ' em ' + dataBR(x.confirmado_em) : ''}${x.precisa_conferir ? ` · <b>falta conferir o de ${x.ano_exigido}</b>` : ''}</div></div>
        <div class="acoes"><a class="btn peq" target="_blank" rel="noopener" href="https://www.google.com/search?q=${encodeURIComponent(`calendário licenciamento ${x.precisa_conferir ? x.ano_exigido : x.ano_confirmado + 1} Detran ${x.uf} final de placa`)}">Procurar calendário ${x.precisa_conferir ? x.ano_exigido : x.ano_confirmado + 1}</a>
          ${admin ? `<button class="btn peq ${x.precisa_conferir ? 'prim' : ''}" data-conf="${x.uf}" data-ano="${x.precisa_conferir ? x.ano_exigido : x.ano_confirmado + 1}">Confirmar ${x.precisa_conferir ? x.ano_exigido : x.ano_confirmado + 1}</button>` : ''}</div></div>
      ${['caminhao', 'geral'].filter(c => linhas.some(l => l.uf === x.uf && l.categoria === c)).map(c => `<div class="muted" style="margin:6px 0 2px">${c === 'caminhao' ? 'Caminhões / cavalos' : 'Demais (carro, moto, reboque, semirreboque)'}</div>
        <div class="chips">${linhas.filter(l => l.uf === x.uf && l.categoria === c).sort((a, b) => ((a.final_placa || 10) - (b.final_placa || 10))).map(l => `<span class="chip">final ${l.final_placa}: ${l.dia || 'últ.'} ${MES[l.mes]}</span>`).join('')}</div>`).join('')}
    </div>`).join('') || '<div class="cartao vazio">Nenhum calendário cadastrado.</div>'}`;
  $$('[data-conf]', tela).forEach(b => b.addEventListener('click', async () => {
    const ok = await confirmar(`Conferi no site do Detran-${b.dataset.conf} que o calendário de ${b.dataset.ano} tem os mesmos meses por final de placa desta tabela (se mudou, edite as datas antes).`, { botao: `Confirmar ${b.dataset.ano}` });
    if (!ok) return;
    try { await api.rpc('confirmar_calendario_crlv', { p_uf: b.dataset.conf, p_ano: Number(b.dataset.ano) }); aviso('Calendário confirmado.'); navegar(); } catch (err) { falha(err); }
  }));
});
