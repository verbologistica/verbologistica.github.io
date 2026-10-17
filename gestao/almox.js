// Verbo Gestão — Almoxarifado (estoque, requisições, inventário, EPI) e Patrimônio (tags, responsáveis, termos, avarias)
'use strict';

const editaAlmox = () => tem('administrador', 'almoxarifado');
const editaPat = () => tem('administrador', 'almoxarifado', 'rh');
const CATEG_ALMOX = ['Peças', 'Pneus', 'Óleos e lubrificantes', 'Filtros', 'EPI', 'Uniforme', 'Ferramentas', 'Escritório', 'Limpeza', 'Copa e cozinha', 'Outro'];
const UNIDADES_ALMOX = ['un', 'par', 'pç', 'jogo', 'kit', 'cx', 'pct', 'l', 'ml', 'kg', 'g', 'm', 'm²', 'rolo', 'galão', 'balde'];
const CATEG_PAT = ['Celular', 'Chip / linha', 'Notebook', 'Tablet', 'Computador', 'Monitor', 'Impressora', 'Rastreador / telemetria', 'Rádio comunicador', 'Câmera', 'Móvel', 'Eletrodoméstico', 'Ferramenta', 'Outro'];
const ESTADOS_PAT = { novo: ['Novo', 'verde'], bom: ['Bom', 'verde'], regular: ['Regular', 'amarelo'], ruim: ['Ruim', 'vermelho'], inservivel: ['Inservível', 'vermelho'] };
const SIT_PAT = { disponivel: ['Disponível', 'azul'], em_uso: ['Em uso', 'verde'], manutencao: ['Em manutenção', 'amarelo'], extraviado: ['Extraviado', 'vermelho'], baixado: ['Baixado', ''] };
const TIPO_MOV_PAT = { cadastro: 'Cadastro', entrega: 'Entrega', devolucao: 'Devolução', transferencia_setor: 'Transferência de setor', envio_manutencao: 'Envio para manutenção', retorno_manutencao: 'Retorno da manutenção', avaria: 'Avaria / prejuízo', extravio: 'Extravio', baixa: 'Baixa' };
const RESP_PAT = { em_analise: ['Em análise', 'amarelo'], desconto_encaminhado_dp: ['Desconto encaminhado ao DP', 'azul'], dispensada: ['Responsabilização dispensada', ''], ressarcido: ['Ressarcido', 'verde'] };
const CULPA = { em_apuracao: 'Em apuração', dolo: 'Dolo (intencional)', culpa: 'Culpa (negligência, imprudência ou imperícia)', sem_culpa: 'Sem culpa do colaborador (desgaste, furto com BO, defeito)' };
const fmtQtd = (v, u = '') => `${Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}${u ? ' ' + u : ''}`;
const tagSit = s => `<span class="tag ${SIT_PAT[s]?.[1] || ''}">${SIT_PAT[s]?.[0] || s}</span>`;
const tagEst = s => `<span class="tag ${ESTADOS_PAT[s]?.[1] || ''}">${ESTADOS_PAT[s]?.[0] || s}</span>`;
const itensAlmox = f => cad('almox_itens', 'select=*&order=descricao', f);

Object.assign(LEI, {
  epi: ['EPI — NR-6 e CLT', [
    'O EPI é fornecido <b>gratuitamente</b>, adequado ao risco, em perfeito estado e com <b>CA (Certificado de Aprovação) válido</b>. É proibido cobrar do colaborador pelo EPI.',
    'A empresa deve <b>exigir o uso</b>, orientar e treinar, substituir imediatamente quando danificado ou extraviado, e <b>registrar a entrega</b> (ficha física ou eletrônica — esta tela).',
    'A recusa injustificada em usar o EPI é <b>ato faltoso</b> (art. 158, parágrafo único, da CLT) e pode gerar medida disciplinar.',
    'Desconto por EPI perdido ou danificado só é possível com <b>dolo</b>, ou com <b>culpa</b> se estiver previsto em contrato (art. 462 §1º). Desgaste natural nunca é descontado.']],
  desconto_dano: ['Responsabilização e desconto por dano', [
    'O desconto no salário por dano causado pelo colaborador só é permitido em caso de <b>dolo</b> (intenção) ou, se houver <b>cláusula assinada</b> (ex.: termo de responsabilidade), em caso de <b>culpa</b> — art. 462 §1º da CLT.',
    'Não se desconta <b>desgaste natural</b>, defeito de fabricação, nem furto ou roubo sem culpa comprovada (exija o boletim de ocorrência).',
    'Faça a <b>apuração</b> antes (relato do colaborador, fotos, orçamento, testemunhas) e registre. O valor deve ser o prejuízo real, comprovado.',
    'O desconto não pode deixar o colaborador sem o mínimo para sobreviver; parcele quando necessário. Na rescisão, a compensação é limitada a um mês de remuneração (art. 477 §5º).',
    'Todo desconto deve ser validado pelo <b>jurídico</b> antes de ir para a folha.']],
  patrimonio: ['Patrimônio em uso pelo colaborador', [
    'Entregue sempre com <b>termo de responsabilidade assinado</b>: é ele que permite apurar responsabilidade em caso de dano (art. 462 §1º).',
    'Na devolução, registre o estado com fotos. No desligamento, a devolução é etapa obrigatória do checklist.',
    'Celular e notebook da empresa: o uso pessoal deve seguir a política interna; o monitoramento precisa ser informado ao colaborador (LGPD).']],
});

// ===================== Painel =====================
rota('/almox', async tela => {
  const [its, pend] = await Promise.all([itensAlmox(true), api.rpc('pendencias_almox').catch(() => [])]);
  const p = Object.fromEntries(pend.map(x => [x.tipo, Number(x.quantidade)]));
  const valor = its.filter(i => i.ativo).reduce((a, i) => a + Number(i.saldo) * Number(i.custo_medio), 0);
  const porCat = {}; its.filter(i => i.ativo).forEach(i => (porCat[i.categoria] = (porCat[i.categoria] || 0) + Number(i.saldo) * Number(i.custo_medio)));
  const baixos = its.filter(i => i.ativo && Number(i.estoque_minimo) > 0 && Number(i.saldo) <= Number(i.estoque_minimo));
  tela.innerHTML = `
    <div class="topo"><div><h1>Almoxarifado e Patrimônio</h1><p class="sub">Estoque, requisições, EPI e bens da empresa</p></div>
      <div class="acoes">${editaAlmox() ? '<a class="btn prim" href="#/almox/entrada">+ Entrada de material</a>' : ''}<a class="btn" href="#/almox/requisicoes/nova">+ Requisição de material</a></div></div>
    <div class="grade" style="margin-bottom:14px">
      <a class="cartao kpi" href="#/almox/itens"><div class="n">${brl(valor)}</div><div class="r">valor em estoque (custo médio)</div></a>
      <a class="cartao kpi ${p.almox_abaixo_minimo ? 'alerta' : ''}" href="#/almox/itens?abaixo=1"><div class="n">${p.almox_abaixo_minimo || 0}</div><div class="r">itens abaixo do mínimo</div></a>
      <a class="cartao kpi ${p.almox_requisicoes_abertas ? 'alerta' : ''}" href="#/almox/requisicoes"><div class="n">${p.almox_requisicoes_abertas || 0}</div><div class="r">requisições a atender</div></a>
      <a class="cartao kpi ${p.epi_troca ? 'alerta' : ''}" href="#/almox/epi"><div class="n">${p.epi_troca || 0}</div><div class="r">EPIs com troca prevista em 7 dias</div></a>
      <a class="cartao kpi ${p.patrimonio_sem_termo ? 'alerta' : ''}" href="#/patrimonio?sem_termo=1"><div class="n">${p.patrimonio_sem_termo || 0}</div><div class="r">bens em uso sem termo assinado</div></a>
      <a class="cartao kpi ${p.patrimonio_avarias ? 'alerta' : ''}" href="#/patrimonio/avarias"><div class="n">${p.patrimonio_avarias || 0}</div><div class="r">avarias em análise</div></a>
    </div>
    <div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr))">
      <div class="cartao"><h2>Comprar / repor</h2>${baixos.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Item</th><th class="num">Saldo</th><th class="num">Mínimo</th></tr></thead><tbody>
        ${baixos.map(i => `<tr class="clicavel" onclick="location.hash='#/almox/itens/ver/${i.id}'"><td data-r="Item">${esc(i.descricao)}</td><td data-r="Saldo" class="num">${fmtQtd(i.saldo, i.unidade)}</td><td data-r="Mínimo" class="num">${fmtQtd(i.estoque_minimo)}</td></tr>`).join('')}</tbody></table></div>
        ${tem('administrador', 'comprador', 'almoxarifado') ? '<a class="btn peq" href="#/compras/requisicoes/nova">Abrir requisição de compra</a>' : ''}` : '<div class="vazio">Tudo acima do mínimo. 👍</div>'}</div>
      <div class="cartao"><h2>Estoque por categoria</h2><div class="tabela-wrap"><table><thead><tr><th>Categoria</th><th class="num">Valor</th></tr></thead><tbody>
        ${Object.entries(porCat).sort((a, b) => b[1] - a[1]).map(([c, v]) => `<tr><td>${esc(c)}</td><td class="num">${brl(v)}</td></tr>`).join('')}</tbody></table></div></div>
    </div>`;
});

// ===================== Itens =====================
rota('/almox/itens', async tela => {
  const cats_ = pLista('cat'), cat = cats_[0] || '', q = (estado.params.get('q') || '').toLowerCase(), abaixo = estado.params.get('abaixo') === '1';
  let its = (await itensAlmox(true)).filter(i => i.ativo);
  if (cats_.length) its = its.filter(i => cats_.includes(i.categoria));
  if (q) its = its.filter(i => [i.codigo, i.descricao, i.marca, i.referencia, i.localizacao].join(' ').toLowerCase().includes(q));
  if (abaixo) its = its.filter(i => Number(i.estoque_minimo) > 0 && Number(i.saldo) <= Number(i.estoque_minimo));
  const cats = [...new Set([...CATEG_ALMOX.filter(c => c !== 'Outro'), ...(await itensAlmox()).map(i => i.categoria)])];
  tela.innerHTML = `
    <div class="topo"><div><h1>Itens do almoxarifado</h1><p class="sub">${its.length} item(ns) · ${brl(its.reduce((a, i) => a + Number(i.saldo) * Number(i.custo_medio), 0))}</p></div>
      <div class="acoes">${editaAlmox() ? '<button class="btn" id="novo-item">+ Item</button><a class="btn" href="#/almox/inventario">Inventário</a><a class="btn prim" href="#/almox/entrada">+ Entrada</a>' : ''}</div></div>
    <form class="filtros" id="filtros"><select name="cat"><option value="">Todas as categorias</option>${cats.map(c => `<option ${c === cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
      <input name="q" value="${esc(estado.params.get('q') || '')}" placeholder="Código, descrição, marca, local"><label class="check"><input type="checkbox" name="abaixo" ${abaixo ? 'checked' : ''}> Só abaixo do mínimo</label><button class="btn">Filtrar</button></form>
    <div class="cartao">${its.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Código</th><th>Descrição</th><th>Categoria</th><th>Local</th><th class="num">Saldo</th><th class="num">Mínimo</th><th class="num">Custo médio</th><th class="num">Valor</th></tr></thead><tbody>
      ${its.map(i => { const baixo = Number(i.estoque_minimo) > 0 && Number(i.saldo) <= Number(i.estoque_minimo);
        return `<tr class="clicavel" onclick="location.hash='#/almox/itens/ver/${i.id}'"><td data-r="Código" class="mono">${esc(i.codigo)}</td><td data-r="Descrição"><b>${esc(i.descricao)}</b>${i.marca ? ` <span class="muted">${esc(i.marca)}</span>` : ''}${i.categoria === 'EPI' && i.ca_validade && i.ca_validade < hojeISO() ? ' <span class="tag vermelho">CA vencido</span>' : ''}</td>
        <td data-r="Categoria">${esc(i.categoria)}</td><td data-r="Local">${esc(i.localizacao || '—')}</td><td data-r="Saldo" class="num">${baixo ? '<span class="tag vermelho">' : ''}${fmtQtd(i.saldo, i.unidade)}${baixo ? '</span>' : ''}</td>
        <td data-r="Mínimo" class="num">${fmtQtd(i.estoque_minimo)}</td><td data-r="Custo médio" class="num">${brl(i.custo_medio)}</td><td data-r="Valor" class="num">${brl(Number(i.saldo) * Number(i.custo_medio))}</td></tr>`; }).join('')}
    </tbody></table></div>` : '<div class="vazio">Nenhum item.</div>'}</div>`;
  $('#filtros').onsubmit = e => { e.preventDefault(); const d = formDados(e.target); location.hash = '#/almox/itens?' + new URLSearchParams(Object.entries({ cat: d.cat, q: d.q, abaixo: d.abaixo ? '1' : '' }).filter(([, v]) => v)); };
  $('#novo-item')?.addEventListener('click', () => formItemAlmox());
});
async function formItemAlmox(i = null) {
  const r = await modal(`<form><h2>${i ? 'Editar item ' + esc(i.codigo) : 'Novo item'}</h2><div class="form">
    <label class="campo largo">Descrição *<input name="descricao" required value="${esc(i?.descricao || '')}"></label>
    <label class="campo">Categoria *<select name="categoria" data-valor="${esc(i?.categoria || '')}">${CATEG_ALMOX.map(c => `<option ${c === i?.categoria ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
    <label class="campo">Unidade *<select name="unidade" data-valor="${esc(i?.unidade || 'un')}">${[...UNIDADES_ALMOX, 'Outra'].map(u => `<option ${u === (i?.unidade || 'un') ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
    <label class="campo">Código (vazio = automático)<input name="codigo" value="${esc(i?.codigo || '')}"></label>
    <label class="campo">Marca<input name="marca" value="${esc(i?.marca || '')}"></label><label class="campo">Referência / aplicação<input name="referencia" value="${esc(i?.referencia || '')}"></label>
    <label class="campo">Localização<input name="localizacao" value="${esc(i?.localizacao || '')}" placeholder="Ex.: Prateleira B2"></label>
    <label class="campo">Estoque mínimo<input name="estoque_minimo" inputmode="decimal" value="${i?.estoque_minimo ?? 0}"></label><label class="campo">Estoque máximo<input name="estoque_maximo" inputmode="decimal" value="${i?.estoque_maximo ?? ''}"></label>
    <div class="largo form" id="b-epi" style="padding:0"><label class="campo">Nº do CA (EPI)<input name="ca_numero" value="${esc(i?.ca_numero || '')}"></label><label class="campo">Validade do CA<input type="date" name="ca_validade" value="${i?.ca_validade || ''}"></label></div>
    <label class="campo">Vida útil / troca (dias)<input type="number" name="vida_util_dias" value="${i?.vida_util_dias ?? ''}"></label>
    <label class="campo">Conta do plano<select name="conta_id">${await opcoesContas(i?.conta_id)}</select></label>
    <label class="campo largo">Observações<input name="observacoes" value="${esc(i?.observacoes || '')}"></label></div>
    <div class="rodape">${i ? '<button class="btn perigo" value="desativar">Desativar</button>' : ''}<button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim" value="salvar">Salvar</button></div></form>`,
    { aoAbrir: raiz => { const f = $('form', raiz); const s = () => ($('#b-epi', raiz).hidden = f.categoria.value !== 'EPI'); f.categoria.addEventListener('change', s); s(); } });
  if (!r) return;
  try {
    if (r._acao === 'desativar') { if (Number(i.saldo) > 0) return aviso('Zere o saldo (ajuste) antes de desativar.', true); await api.alterar('almox_itens', `id=eq.${i.id}`, { ativo: false }); delete estado.cache.almox_itens; return navegar(); }
    const dados = { descricao: r.descricao, categoria: r.categoria, unidade: r.unidade, codigo: r.codigo || null, marca: r.marca || null, referencia: r.referencia || null, localizacao: r.localizacao || null,
      estoque_minimo: num(r.estoque_minimo) || 0, estoque_maximo: num(r.estoque_maximo), ca_numero: r.ca_numero || null, ca_validade: r.ca_validade || null,
      vida_util_dias: r.vida_util_dias ? Number(r.vida_util_dias) : null, conta_id: r.conta_id || null, observacoes: r.observacoes || null };
    if (i) await api.alterar('almox_itens', `id=eq.${i.id}`, dados); else await api.inserir('almox_itens', dados);
    delete estado.cache.almox_itens; aviso('Item salvo.'); navegar();
  } catch (err) { falha(err.message.includes('duplicate') ? new Error('Já existe item com esse código.') : err); }
}
const TIPO_MOV = { entrada: ['Entrada', 'verde', '+'], devolucao: ['Devolução', 'verde', '+'], ajuste_mais: ['Ajuste (+)', 'azul', '+'], saida: ['Saída', 'vermelho', '−'], ajuste_menos: ['Ajuste (−)', 'amarelo', '−'] };
rota('/almox/itens/ver/:id', async (tela, id) => {
  const [i, ms, eqs] = await Promise.all([api.um('almox_itens', `id=eq.${id}`), api.listar('almox_movimentos', `item_id=eq.${id}&select=*,colab:colaboradores(nome),forn:fornecedores(razao_social)&order=criado_em.desc&limit=300`),
    api.listar('equipamentos', 'select=id,codigo_frota,tipo&order=codigo_frota').catch(() => [])]);
  if (!i) { tela.innerHTML = '<div class="cartao vazio">Item não encontrado.</div>'; return; }
  tela.innerHTML = `
    <div class="topo"><div><h1>${esc(i.descricao)}</h1><p class="sub">${esc(i.codigo)} · ${esc(i.categoria)} · saldo <b>${fmtQtd(i.saldo, i.unidade)}</b> · custo médio ${brl(i.custo_medio)}${i.localizacao ? ' · ' + esc(i.localizacao) : ''}</p></div>
      <div class="acoes">${editaAlmox() ? '<button class="btn prim" data-mov="entrada">Entrada</button><button class="btn" data-mov="saida">Saída</button><button class="btn" data-mov="ajuste">Ajuste</button><button class="btn" id="ed-item">Editar</button>' : ''}<a class="btn" href="#/almox/itens">Voltar</a></div></div>
    ${i.categoria === 'EPI' ? `<div class="cartao ${i.ca_validade && i.ca_validade < hojeISO() ? 'alerta-obs' : ''}">CA ${esc(i.ca_numero || 'não informado')} ${i.ca_validade ? '· validade ' + dataBR(i.ca_validade) : ''}${!i.ca_numero ? ' — <b>informe o CA: EPI sem CA válido não pode ser entregue (NR-6).</b>' : ''}</div>` : ''}
    <div class="cartao"><h2>Movimentação (kardex)</h2>${ms.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Data</th><th>Tipo</th><th class="num">Qtd</th><th class="num">Custo un.</th><th class="num">Saldo após</th><th>Documento</th><th>Destino / origem</th></tr></thead><tbody>
      ${ms.map(m => `<tr><td data-r="Data">${dataBR(m.data)}</td><td data-r="Tipo"><span class="tag ${TIPO_MOV[m.tipo][1]}">${TIPO_MOV[m.tipo][0]}</span></td><td data-r="Qtd" class="num">${TIPO_MOV[m.tipo][2]}${fmtQtd(m.quantidade)}</td>
        <td data-r="Custo un." class="num">${brl(m.custo_unitario || 0)}</td><td data-r="Saldo" class="num">${fmtQtd(m.saldo_apos)}</td><td data-r="Documento">${esc(m.documento || '')}</td>
        <td data-r="Destino">${esc([m.forn?.razao_social, m.colab?.nome, eqs.find(e => e.id === m.equipamento_id)?.codigo_frota, m.observacao].filter(Boolean).join(' · ') || '—')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Sem movimentos.</div>'}</div>`;
  $('#ed-item')?.addEventListener('click', () => formItemAlmox(i));
  $$('[data-mov]', tela).forEach(b => b.onclick = () => movimentoAvulso(i, b.dataset.mov, eqs));
});
async function movimentoAvulso(i, tipo, eqs) {
  const [cs, ccs, fs] = await Promise.all([colabsRH('&status=in.(ativo,ferias,afastado,aviso_previo,em_admissao)').catch(() => []), centros(), cad('fornecedores', 'select=id,razao_social,ativo&order=razao_social')]);
  const r = await modal(`<form><h2>${{ entrada: 'Entrada', saida: 'Saída', ajuste: 'Ajuste de estoque' }[tipo]} · ${esc(i.descricao)}</h2><p class="muted">Saldo atual: ${fmtQtd(i.saldo, i.unidade)}</p><div class="form">
    ${tipo === 'ajuste' ? '<label class="campo">Ajuste<select name="t"><option value="ajuste_mais">Somar ao estoque</option><option value="ajuste_menos">Retirar do estoque</option></select></label>' : ''}
    <label class="campo">Quantidade *<input name="quantidade" inputmode="decimal" required></label><label class="campo">Data<input type="date" name="data" value="${hojeISO()}"></label>
    ${tipo === 'entrada' ? `<label class="campo">Custo unitário (R$) *<input name="custo" inputmode="decimal" required></label>
      <label class="campo">Fornecedor<select name="fornecedor_id"><option value="">—</option>${fs.filter(f => f.ativo).map(f => `<option value="${f.id}">${esc(f.razao_social)}</option>`).join('')}</select></label>` : ''}
    ${tipo === 'saida' ? `<label class="campo">Entregue a<select name="colaborador_id"><option value="">—</option>${cs.map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join('')}</select></label>
      <label class="campo">Aplicado no equipamento<select name="equipamento_id"><option value="">—</option>${eqs.map(e => `<option value="${e.id}">${esc(e.codigo_frota || e.tipo)}</option>`).join('')}</select></label>
      <label class="campo">Centro de custo<select name="centro_custo_id">${opcoes(ccs.filter(c => c.ativo), null, c => c.nome, null, '—')}</select></label>` : ''}
    <label class="campo">Documento (NF, OS…)<input name="documento"></label><label class="campo largo">Observação${tipo === 'ajuste' ? ' / motivo *' : ''}<input name="observacao" ${tipo === 'ajuste' ? 'required' : ''}></label></div>
    ${i.categoria === 'EPI' && tipo === 'saida' ? '<p class="alerta-obs">Para entregar EPI a um colaborador use <a href="#/almox/epi">Entrega de EPI</a>: a entrega fica registrada na ficha NR-6.</p>' : ''}
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Registrar</button></div></form>`,
    { validar: d => !(num(d.quantidade) > 0) ? 'Informe uma quantidade maior que zero.' : null });
  if (!r) return;
  try {
    await api.inserir('almox_movimentos', { item_id: i.id, tipo: tipo === 'ajuste' ? r.t : tipo, quantidade: num(r.quantidade), data: r.data, custo_unitario: tipo === 'entrada' ? num(r.custo) : null,
      fornecedor_id: r.fornecedor_id || null, colaborador_id: r.colaborador_id || null, equipamento_id: r.equipamento_id || null, centro_custo_id: r.centro_custo_id || null,
      documento: r.documento || null, observacao: r.observacao || null });
    delete estado.cache.almox_itens; aviso('Movimento registrado.'); navegar();
  } catch (err) { falha(err); }
}

// ===================== Entrada com vários itens (NF) =====================
rota('/almox/entrada', async tela => {
  if (!editaAlmox()) { tela.innerHTML = '<div class="cartao vazio">Sem permissão.</div>'; return; }
  const [its, fs, peds] = await Promise.all([itensAlmox(true), cad('fornecedores', 'select=id,razao_social,ativo&order=razao_social'),
    api.listar('pedidos', 'select=id,numero,fornecedor_id&status=in.(emitido,faturado,entregue,parcialmente_recebido,recebido)&order=criado_em.desc&limit=100').catch(() => [])]);
  const linha = () => `<tr><td><select name="item" required><option value="">Selecione…</option>${its.filter(i => i.ativo).map(i => `<option value="${i.id}">${esc(i.codigo + ' · ' + i.descricao)} (${esc(i.unidade)})</option>`).join('')}</select></td>
    <td><input name="qtd" inputmode="decimal" required style="width:90px"></td><td><input name="custo" inputmode="decimal" required style="width:110px"></td><td class="num tot">—</td><td><button type="button" class="btn peq" data-rem>✕</button></td></tr>`;
  tela.innerHTML = `
    <div class="topo"><div><h1>Entrada de material</h1><p class="sub">Lance a nota fiscal com todos os itens de uma vez</p></div></div>
    <form id="f-ent" class="cartao"><div class="form">
      <label class="campo">Fornecedor<select name="fornecedor_id"><option value="">—</option>${fs.filter(f => f.ativo).map(f => `<option value="${f.id}">${esc(f.razao_social)}</option>`).join('')}</select></label>
      <label class="campo">Pedido de compra<select name="pedido_id"><option value="">—</option>${peds.map(p => `<option value="${p.id}" data-forn="${p.fornecedor_id || ''}">${esc(p.numero)}</option>`).join('')}</select></label>
      <label class="campo">Nota fiscal<input name="documento" placeholder="Nº da NF"></label><label class="campo">Data<input type="date" name="data" value="${hojeISO()}"></label></div>
      <div class="tabela-wrap itens-req" style="margin-top:10px"><table><thead><tr><th>Item</th><th>Qtd</th><th>Custo unit. (R$)</th><th class="num">Total</th><th></th></tr></thead><tbody id="linhas">${linha()}</tbody>
        <tfoot><tr><td colspan="3"><button type="button" class="btn peq" id="mais">+ Item</button> <button type="button" class="btn peq" id="novo-cad">+ Cadastrar item novo</button></td><td class="num" id="total">—</td><td></td></tr></tfoot></table></div>
      <div class="acoes" style="margin-top:12px"><button class="btn prim">Registrar entrada</button><a class="btn" href="#/almox">Cancelar</a></div></form>`;
  const f = $('#f-ent'), tb = $('#linhas');
  const recalc = () => { let t = 0; $$('tr', tb).forEach(tr => { const v = (num(tr.querySelector('[name=qtd]').value) || 0) * (num(tr.querySelector('[name=custo]').value) || 0); t += v; tr.querySelector('.tot').textContent = v ? brl(v) : '—'; }); $('#total').textContent = brl(t); };
  tb.addEventListener('input', recalc);
  tb.addEventListener('click', e => { if (e.target.closest('[data-rem]') && $$('tr', tb).length > 1) { e.target.closest('tr').remove(); recalc(); } });
  $('#mais').onclick = () => tb.insertAdjacentHTML('beforeend', linha());
  $('#novo-cad').onclick = async () => { await formItemAlmox(); };
  f.pedido_id.onchange = () => { const fo = f.pedido_id.selectedOptions[0]?.dataset.forn; if (fo) f.fornecedor_id.value = fo; };
  const pedUrl = estado.params.get('pedido'); if (pedUrl && peds.some(x => x.id === pedUrl)) { f.pedido_id.value = pedUrl; f.pedido_id.onchange(); }
  f.onsubmit = async e => {
    e.preventDefault(); const d = formDados(f);
    const linhas = $$('tr', tb).map(tr => ({ item: tr.querySelector('[name=item]').value, qtd: num(tr.querySelector('[name=qtd]').value), custo: num(tr.querySelector('[name=custo]').value) })).filter(l => l.item && l.qtd > 0);
    if (!linhas.length) return aviso('Inclua pelo menos um item.', true);
    await ocupado(e.submitter, async () => { try {
      for (const l of linhas) await api.inserir('almox_movimentos', { item_id: l.item, tipo: 'entrada', quantidade: l.qtd, custo_unitario: l.custo, data: d.data, documento: d.documento ? 'NF ' + d.documento : null, fornecedor_id: d.fornecedor_id || null, pedido_id: d.pedido_id || null });
      delete estado.cache.almox_itens; aviso(`${linhas.length} item(ns) lançados no estoque.`); location.hash = '#/almox/itens';
    } catch (err) { falha(err); } });
  };
});

// ===================== Requisições internas =====================
const ST_RMA = { aberta: ['Aberta', 'amarelo'], parcial: ['Atendida em parte', 'azul'], atendida: ['Atendida', 'verde'], cancelada: ['Cancelada', ''] };
rota('/almox/requisicoes', async tela => {
  const st = temTodos(pLista('status', 'todas')) ? 'todas' : 'abertas';
  const rs = await api.listar('almox_requisicoes', `select=*,solic:usuarios(nome),colab:colaboradores(nome),itens:almox_requisicao_itens(quantidade,atendido,item:almox_itens(descricao,unidade))&${st === 'abertas' ? 'status=in.(aberta,parcial)' : 'status=neq.x'}&order=criado_em.desc&limit=200`);
  tela.innerHTML = `
    <div class="topo"><div><h1>Requisições de material</h1><p class="sub">${rs.length} requisição(ões)</p></div><a class="btn prim" href="#/almox/requisicoes/nova">+ Nova requisição</a></div>
    <form class="filtros" id="filtros"><select name="status"><option value="abertas" ${st === 'abertas' ? 'selected' : ''}>A atender</option><option value="todas" ${st === 'todas' ? 'selected' : ''}>Todas</option></select><button class="btn">Filtrar</button></form>
    ${rs.length ? rs.map(r => `<div class="cartao"><div class="topo" style="margin:0 0 6px"><div><b>${esc(r.numero || '')}</b> <span class="tag ${ST_RMA[r.status][1]}">${ST_RMA[r.status][0]}</span>
        <div class="muted">${dataBR(r.criado_em)} · pedido por ${esc(r.solic?.nome || '')}${r.colab ? ' · para ' + esc(r.colab.nome) : ''}${r.finalidade ? ' · ' + esc(r.finalidade) : ''}</div></div>
        ${editaAlmox() && ['aberta', 'parcial'].includes(r.status) ? `<div class="acoes"><button class="btn prim peq" data-atender="${r.id}">Atender</button><button class="btn peq perigo" data-cancelar="${r.id}">Cancelar</button></div>` : ''}</div>
      <ul class="lista-simples">${(r.itens || []).map(x => `<li><span>${esc(x.item?.descricao || '')}</span><span>${fmtQtd(x.atendido)} de ${fmtQtd(x.quantidade, x.item?.unidade)}</span></li>`).join('')}</ul></div>`).join('') : '<div class="cartao vazio">Nenhuma requisição.</div>'}`;
  $('#filtros').onsubmit = e => { e.preventDefault(); location.hash = '#/almox/requisicoes?status=' + formDados(e.target).status; };
  $$('[data-atender]', tela).forEach(b => b.onclick = async () => {
    const itens = await api.listar('almox_requisicao_itens', `requisicao_id=eq.${b.dataset.atender}&ativo=eq.true&select=*,item:almox_itens(descricao,unidade,saldo)`);
    const r = await modal(`<form><h2>Atender requisição</h2><table class="tabela-notas">${itens.map(x => { const falta = Number(x.quantidade) - Number(x.atendido);
      return `<tr><td><b>${esc(x.item.descricao)}</b><div class="muted">pedido ${fmtQtd(x.quantidade, x.item.unidade)} · já entregue ${fmtQtd(x.atendido)} · em estoque ${fmtQtd(x.item.saldo)}</div></td>
        <td><input name="q_${x.id}" inputmode="decimal" value="${Math.max(0, Math.min(falta, Number(x.item.saldo)))}" style="width:90px"></td></tr>`; }).join('')}</table>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Entregar e baixar do estoque</button></div></form>`);
    if (!r) return;
    try { await api.rpc('atender_requisicao_almox', { p_req: b.dataset.atender, p_itens: itens.map(x => ({ id: x.id, quantidade: num(r['q_' + x.id]) || 0 })) });
      delete estado.cache.almox_itens; aviso('Requisição atendida.'); navegar(); } catch (err) { falha(err); }
  });
  $$('[data-cancelar]', tela).forEach(b => b.onclick = async () => { if (!await confirmar('Cancelar a requisição?')) return;
    try { await api.alterar('almox_requisicoes', `id=eq.${b.dataset.cancelar}`, { status: 'cancelada' }); navegar(); } catch (err) { falha(err); } });
});
rota('/almox/requisicoes/nova', async tela => {
  const [its, ccs, eqs, cs] = await Promise.all([itensAlmox(true), centros(), api.listar('equipamentos', 'select=id,codigo_frota,tipo&ativo=eq.true&order=codigo_frota').catch(() => []),
    api.listar('v_colaboradores_basico', 'select=id,nome&order=nome').catch(() => [])]);
  const linha = () => `<tr><td><select name="item" required><option value="">Selecione…</option>${its.filter(i => i.ativo).map(i => `<option value="${i.id}">${esc(i.descricao)} (${esc(i.unidade)}) · estoque ${fmtQtd(i.saldo)}</option>`).join('')}</select></td>
    <td><input name="qtd" inputmode="decimal" required style="width:90px"></td><td><button type="button" class="btn peq" data-rem>✕</button></td></tr>`;
  tela.innerHTML = `<div class="topo"><div><h1>Requisição de material</h1><p class="sub">Peça ao almoxarifado peças, EPI, uniforme e materiais</p></div></div>
    <form id="f-rma" class="cartao"><div class="form">
      <label class="campo">Para quem<select name="colaborador_id"><option value="">Para mim / setor</option>${cs.map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join('')}</select></label>
      <label class="campo">Aplicação (equipamento)<select name="equipamento_id"><option value="">—</option>${eqs.map(e => `<option value="${e.id}">${esc(e.codigo_frota || e.tipo)}</option>`).join('')}</select></label>
      <label class="campo">Centro de custo<select name="centro_custo_id">${opcoes(ccs.filter(c => c.ativo), null, c => c.nome, estado.usuario.centro_custo_id, '—')}</select></label>
      <label class="campo largo">Finalidade<input name="finalidade" placeholder="Ex.: troca de filtro do TT-01"></label></div>
      <div class="tabela-wrap itens-req" style="margin-top:10px"><table><thead><tr><th>Item</th><th>Qtd</th><th></th></tr></thead><tbody id="linhas">${linha()}</tbody>
      <tfoot><tr><td colspan="3"><button type="button" class="btn peq" id="mais">+ Item</button></td></tr></tfoot></table></div>
      <p class="muted">Não encontrou o item? Faça uma <a href="#/compras/requisicoes/nova">requisição de compra</a>.</p>
      <div class="acoes"><button class="btn prim">Enviar ao almoxarifado</button><a class="btn" href="javascript:history.back()">Cancelar</a></div></form>`;
  const tb = $('#linhas'); $('#mais').onclick = () => tb.insertAdjacentHTML('beforeend', linha());
  tb.addEventListener('click', e => { if (e.target.closest('[data-rem]') && $$('tr', tb).length > 1) e.target.closest('tr').remove(); });
  $('#f-rma').onsubmit = async e => { e.preventDefault(); const d = formDados(e.target);
    const linhas = $$('tr', tb).map(tr => ({ item: tr.querySelector('[name=item]').value, qtd: num(tr.querySelector('[name=qtd]').value) })).filter(l => l.item && l.qtd > 0);
    if (!linhas.length) return aviso('Inclua pelo menos um item.', true);
    await ocupado(e.submitter, async () => { try {
      const [r] = await api.inserir('almox_requisicoes', { colaborador_id: d.colaborador_id || null, equipamento_id: d.equipamento_id || null, centro_custo_id: d.centro_custo_id || null, finalidade: d.finalidade || null, solicitante_id: estado.usuario.id });
      await api.inserir('almox_requisicao_itens', linhas.map(l => ({ requisicao_id: r.id, item_id: l.item, quantidade: l.qtd })));
      aviso(`Requisição ${r.numero} enviada.`); location.hash = '#/almox/requisicoes';
    } catch (err) { falha(err); } }); };
});

// ===================== Inventário =====================
rota('/almox/inventario', async tela => {
  if (!editaAlmox()) { tela.innerHTML = '<div class="cartao vazio">Sem permissão.</div>'; return; }
  const cats_ = pLista('cat'), cat = cats_[0] || '';
  let its = (await itensAlmox(true)).filter(i => i.ativo); if (cats_.length) its = its.filter(i => cats_.includes(i.categoria));
  tela.innerHTML = `<div class="topo"><div><h1>Inventário</h1><p class="sub">Conte o estoque físico. Só os itens com diferença geram ajuste.</p></div></div>
    <form class="filtros" id="filtros"><select name="cat"><option value="">Todas as categorias</option>${[...new Set(its.map(i => i.categoria))].map(c => `<option ${c === cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select><button class="btn">Filtrar</button></form>
    <form id="f-inv" class="cartao"><div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Código</th><th>Item</th><th>Local</th><th class="num">No sistema</th><th>Contado</th><th class="num">Diferença</th></tr></thead><tbody>
      ${its.map(i => `<tr><td data-r="Código" class="mono">${esc(i.codigo)}</td><td data-r="Item">${esc(i.descricao)}</td><td data-r="Local">${esc(i.localizacao || '')}</td><td data-r="Sistema" class="num">${fmtQtd(i.saldo, i.unidade)}</td>
        <td data-r="Contado"><input name="c_${i.id}" inputmode="decimal" style="width:90px" data-saldo="${i.saldo}"></td><td data-r="Diferença" class="num dif">—</td></tr>`).join('')}</tbody></table></div>
      <label class="campo" style="margin-top:10px">Observação<input name="obs" placeholder="Ex.: inventário mensal, responsável…"></label>
      <div class="acoes"><button class="btn prim">Aplicar ajustes</button></div></form>`;
  $('#filtros').onsubmit = e => { e.preventDefault(); location.hash = '#/almox/inventario?cat=' + encodeURIComponent(formDados(e.target).cat); };
  $('#f-inv').addEventListener('input', e => { const inp = e.target; if (!inp.dataset.saldo) return; const c = num(inp.value); const td = inp.closest('tr').querySelector('.dif');
    td.innerHTML = c == null ? '—' : (c - Number(inp.dataset.saldo) === 0 ? '<span class="tag verde">ok</span>' : `<span class="tag ${c > inp.dataset.saldo ? 'azul' : 'vermelho'}">${c > inp.dataset.saldo ? '+' : ''}${fmtQtd(c - Number(inp.dataset.saldo))}</span>`); });
  $('#f-inv').onsubmit = async e => { e.preventDefault(); const d = formDados(e.target);
    const cont = Object.keys(d).filter(k => k.startsWith('c_') && d[k] !== '').map(k => ({ id: k.slice(2), contado: num(d[k]) }));
    if (!cont.length) return aviso('Informe ao menos uma contagem.', true);
    if (!await confirmar(`Aplicar as contagens de ${cont.length} item(ns)? As diferenças viram ajustes no kardex.`, { botao: 'Aplicar' })) return;
    try { const n = await api.rpc('aplicar_inventario', { p_contagens: cont, p_obs: d.obs || null }); delete estado.cache.almox_itens; aviso(`${n} ajuste(s) lançado(s).`); location.hash = '#/almox/itens'; } catch (err) { falha(err); } };
});

// ===================== EPI =====================
rota('/almox/epi', async tela => {
  const colabs = pLista('colab'), colab = colabs[0] || '';
  const [its, cs, ents] = await Promise.all([itensAlmox(true), api.listar('v_colaboradores_basico', 'select=id,nome,cargo&order=nome').catch(() => []),
    api.listar('epi_entregas', `ativo=eq.true&devolvido_em=is.null&select=*,colab:colaboradores(id,nome),item:almox_itens(descricao,unidade,ca_validade)&order=troca_prevista${colabs.length ? '&colaborador_id=in.(' + colabs.join(',') + ')' : ''}&limit=500`)]);
  const epis = its.filter(i => i.ativo && ['EPI', 'Uniforme'].includes(i.categoria));
  const trocar = ents.filter(e => e.troca_prevista && e.troca_prevista <= somaDias(hojeISO(), 7));
  tela.innerHTML = `
    <div class="topo"><div><h1>EPI e uniformes</h1><p class="sub">Entrega com ficha individual (NR-6), troca prevista e CA</p></div>${editaAlmox() || tem('rh') ? '<button class="btn prim" id="entregar">+ Entregar EPI / uniforme</button>' : ''}</div>
    ${avisoLei('epi')}
    <form class="filtros" id="filtros"><select name="colab"><option value="">Todos os colaboradores</option>${cs.map(c => `<option value="${c.id}" ${c.id === colab ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select><button class="btn">Filtrar</button>
      ${colab ? '<button type="button" class="btn" id="ficha">Gerar ficha NR-6</button>' : ''}</form>
    ${trocar.length ? `<div class="cartao alerta-obs"><b>Troca prevista vencida ou em até 7 dias:</b> ${trocar.map(e => `${esc(e.colab?.nome || '')} — ${esc(e.item?.descricao || '')} (${dataBR(e.troca_prevista)})`).join(' · ')}</div>` : ''}
    <div class="cartao"><h2>EPIs em posse dos colaboradores</h2>${ents.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Colaborador</th><th>Item</th><th class="num">Qtd</th><th>CA</th><th>Entregue</th><th>Troca prevista</th><th>Motivo</th><th></th></tr></thead><tbody>
      ${ents.map(e => `<tr><td data-r="Colaborador">${esc(e.colab?.nome || '')}</td><td data-r="Item">${esc(e.item?.descricao || '')}</td><td data-r="Qtd" class="num">${fmtQtd(e.quantidade, e.item?.unidade)}</td>
        <td data-r="CA">${esc(e.ca_numero || '—')}</td><td data-r="Entregue">${dataBR(e.data)}</td><td data-r="Troca">${e.troca_prevista ? dataBR(e.troca_prevista) + (e.troca_prevista < hojeISO() ? ' <span class="tag vermelho">vencida</span>' : '') : '—'}</td>
        <td data-r="Motivo">${esc(e.motivo)}</td><td>${editaAlmox() ? `<button class="btn peq" data-dev="${e.id}">Devolvido</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Nenhuma entrega registrada.</div>'}</div>`;
  $('#filtros').onsubmit = e => { e.preventDefault(); location.hash = '#/almox/epi?colab=' + formDados(e.target).colab; };
  $('#ficha')?.addEventListener('click', async () => { const m = await modeloPorCodigo('SSMA-EPI-001'); if (!m) return aviso('Modelo da ficha não encontrado.', true);
    const hist = await api.listar('epi_entregas', `colaborador_id=eq.${colab}&ativo=eq.true&select=*,item:almox_itens(descricao,unidade)&order=data`);
    await gerarDocumento(m, colab, { epi: { tabela_itens: `<table border="1" cellpadding="5" style="border-collapse:collapse;width:100%;font-size:12px"><tr><th>Data</th><th>EPI</th><th>Qtd</th><th>CA</th><th>Motivo</th><th>Devolução</th><th>Assinatura</th></tr>${hist.map(h => `<tr><td>${dataBR(h.data)}</td><td>${esc(h.item?.descricao || '')}</td><td>${fmtQtd(h.quantidade, h.item?.unidade)}</td><td>${esc(h.ca_numero || '')}</td><td>${esc(h.motivo)}</td><td>${dataBR(h.devolvido_em)}</td><td style="width:22%"></td></tr>`).join('')}</table>` } }); });
  $('#entregar')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Entregar EPI / uniforme</h2><div class="form">
      <label class="campo largo">Colaborador *<select name="colab" required><option value="">Selecione…</option>${cs.map(c => `<option value="${c.id}" ${c.id === colab ? 'selected' : ''}>${esc(c.nome)}${c.cargo ? ' · ' + esc(c.cargo) : ''}</option>`).join('')}</select></label>
      <label class="campo largo">Item *<select name="item" required><option value="">Selecione…</option>${epis.map(i => `<option value="${i.id}" ${Number(i.saldo) <= 0 ? 'disabled' : ''}>${esc(i.descricao)} · estoque ${fmtQtd(i.saldo, i.unidade)}${i.categoria === 'EPI' ? ' · CA ' + esc(i.ca_numero || 'não informado') : ''}${i.ca_validade && i.ca_validade < hojeISO() ? ' (CA VENCIDO)' : ''}</option>`).join('')}</select></label>
      <label class="campo">Quantidade<input name="qtd" inputmode="decimal" value="1"></label><label class="campo">Data<input type="date" name="data" value="${hojeISO()}"></label>
      <label class="campo">Motivo<select name="motivo">${['Primeira entrega', 'Admissão', 'Troca por desgaste', 'Dano', 'Perda', 'Outro'].map(m => `<option>${m}</option>`).join('')}</select></label>
      <label class="campo largo">Observação<input name="obs"></label></div>
      <p class="muted">Depois, gere a ficha NR-6 e colha a assinatura do colaborador.</p>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Entregar</button></div></form>`,
      { validar: d => { const i = epis.find(x => x.id === d.item); if (i?.categoria === 'EPI' && !i.ca_numero) return 'Este EPI não tem CA cadastrado. Cadastre o CA no item antes de entregar (NR-6).';
        if (i?.ca_validade && i.ca_validade < hojeISO()) return 'O CA deste EPI está vencido. Não entregue: providencie EPI com CA válido.'; return null; } });
    if (!r) return;
    try { await api.rpc('entregar_epi', { p_colaborador: r.colab, p_item: r.item, p_qtd: num(r.qtd) || 1, p_data: r.data, p_motivo: r.motivo, p_obs: r.obs || null });
      delete estado.cache.almox_itens; aviso('Entrega registrada na ficha do colaborador.'); location.hash = '#/almox/epi?colab=' + r.colab; } catch (err) { falha(err); }
  });
  $$('[data-dev]', tela).forEach(b => b.onclick = async () => { if (!await confirmar('Registrar a devolução deste EPI?')) return;
    try { await api.alterar('epi_entregas', `id=eq.${b.dataset.dev}`, { devolvido_em: hojeISO() }); navegar(); } catch (err) { falha(err); } });
});

// ===================== Patrimônio =====================
rota('/patrimonio', async tela => {
  const cats_ = pLista('cat'), cat = cats_[0] || '', sits = pLista('sit'), sit = sits[0] || '', q = (estado.params.get('q') || '').toLowerCase(), semTermo = estado.params.get('sem_termo') === '1';
  let ps = await api.listar('v_patrimonio_responsaveis', 'order=tag');
  if (cats_.length) ps = ps.filter(p => cats_.includes(p.categoria)); if (sits.length) ps = ps.filter(p => sits.includes(p.situacao));
  if (semTermo) ps = ps.filter(p => p.situacao === 'em_uso' && !p.termo_assinado);
  if (q) ps = ps.filter(p => [p.tag, p.descricao, p.marca, p.modelo, p.numero_serie, p.imei, p.linha, p.responsavel_nome].join(' ').toLowerCase().includes(q));
  const cats = [...new Set([...CATEG_PAT.filter(c => c !== 'Outro'), ...ps.map(p => p.categoria)])];
  tela.innerHTML = `
    <div class="topo"><div><h1>Patrimônio</h1><p class="sub">${ps.length} bem(ns) · ${brl(ps.reduce((a, p) => a + Number(p.valor_aquisicao || 0), 0))} em valor de aquisição</p></div>
      <div class="acoes"><a class="btn" href="#/patrimonio/avarias">Avarias e responsabilização</a>${editaPat() ? '<button class="btn prim" id="novo-pat">+ Cadastrar bem</button>' : ''}</div></div>
    <form class="filtros" id="filtros"><select name="cat"><option value="">Todas as categorias</option>${cats.map(c => `<option ${c === cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
      <select name="sit"><option value="">Todas as situações</option>${Object.entries(SIT_PAT).map(([k, [t]]) => `<option value="${k}" ${k === sit ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <input name="q" value="${esc(estado.params.get('q') || '')}" placeholder="Tag, IMEI, série, linha, responsável"><label class="check"><input type="checkbox" name="sem_termo" ${semTermo ? 'checked' : ''}> Sem termo assinado</label><button class="btn">Filtrar</button></form>
    <div class="cartao">${ps.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Tag</th><th>Bem</th><th>Categoria</th><th>Identificação</th><th>Responsável</th><th>Estado</th><th>Situação</th></tr></thead><tbody>
      ${ps.map(p => `<tr class="clicavel" onclick="location.hash='#/patrimonio/ver/${p.id}'"><td data-r="Tag" class="mono"><b>${esc(p.tag)}</b></td><td data-r="Bem">${esc(p.descricao)}${p.marca || p.modelo ? `<div class="muted">${esc([p.marca, p.modelo].filter(Boolean).join(' '))}</div>` : ''}</td>
        <td data-r="Categoria">${esc(p.categoria)}</td><td data-r="Identificação" class="mono">${esc([p.imei && 'IMEI ' + p.imei, p.numero_serie && 'S/N ' + p.numero_serie, p.linha && fmtTel(p.linha)].filter(Boolean).join(' · ') || '—')}</td>
        <td data-r="Responsável">${p.responsavel_nome ? esc(p.responsavel_nome) + (p.termo_assinado ? '' : ' <span class="tag amarelo">sem termo</span>') : esc(p.setor_nome || p.local || '—')}</td>
        <td data-r="Estado">${tagEst(p.estado)}</td><td data-r="Situação">${tagSit(p.situacao)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Nenhum bem cadastrado.</div>'}</div>
    ${avisoLei('patrimonio')}`;
  $('#filtros').onsubmit = e => { e.preventDefault(); const d = formDados(e.target); location.hash = '#/patrimonio?' + new URLSearchParams(Object.entries({ cat: d.cat, sit: d.sit, q: d.q, sem_termo: d.sem_termo ? '1' : '' }).filter(([, v]) => v)); };
  $('#novo-pat')?.addEventListener('click', () => formPatrimonio());
});
async function formPatrimonio(p = null) {
  const [ss, fs, cont] = await Promise.all([setoresL(), cad('fornecedores', 'select=id,razao_social,ativo&order=razao_social'), api.listar('patrimonios', 'select=id,tag,descricao&ativo=eq.true&categoria=in.(Celular,Tablet,Notebook,Rastreador / telemetria)&order=tag').catch(() => [])]);
  const r = await modal(`<form><h2>${p ? 'Editar ' + esc(p.tag) : 'Cadastrar bem'}</h2><div class="form">
    <label class="campo">Tag de patrimônio<input name="tag" value="${esc(p?.tag || '')}" placeholder="Vazio = automático (PAT-00001)"></label>
    <label class="campo">Categoria *<select name="categoria" data-valor="${esc(p?.categoria || '')}">${CATEG_PAT.map(c => `<option ${c === p?.categoria ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
    <label class="campo largo">Descrição *<input name="descricao" required value="${esc(p?.descricao || '')}" placeholder="Ex.: Celular Samsung Galaxy A15 128GB"></label>
    <label class="campo">Marca<input name="marca" value="${esc(p?.marca || '')}"></label><label class="campo">Modelo<input name="modelo" value="${esc(p?.modelo || '')}"></label>
    <label class="campo">Nº de série<input name="numero_serie" value="${esc(p?.numero_serie || '')}"></label>
    <div class="largo form" id="b-cel" style="padding:0"><label class="campo">IMEI 1<input name="imei" inputmode="numeric" value="${esc(p?.imei || '')}"></label><label class="campo">IMEI 2<input name="imei2" inputmode="numeric" value="${esc(p?.imei2 || '')}"></label></div>
    <div class="largo form" id="b-chip" style="padding:0"><label class="campo">Número da linha<input name="linha" value="${esc(fmtTel(p?.linha || ''))}"></label><label class="campo">Operadora<input name="operadora" value="${esc(p?.operadora || '')}"></label>
      <label class="campo">Plano<input name="plano" value="${esc(p?.plano || '')}"></label>
      <label class="campo">Instalado no aparelho<select name="contido_em_id"><option value="">—</option>${cont.filter(c => c.id !== p?.id).map(c => `<option value="${c.id}" ${c.id === p?.contido_em_id ? 'selected' : ''}>${esc(c.tag + ' · ' + c.descricao)}</option>`).join('')}</select></label></div>
    <label class="campo">Valor de aquisição (R$)<input name="valor_aquisicao" inputmode="decimal" value="${p?.valor_aquisicao ?? ''}"></label><label class="campo">Data de aquisição<input type="date" name="data_aquisicao" value="${p?.data_aquisicao || ''}"></label>
    <label class="campo">Fornecedor<select name="fornecedor_id"><option value="">—</option>${fs.filter(f => f.ativo).map(f => `<option value="${f.id}" ${f.id === p?.fornecedor_id ? 'selected' : ''}>${esc(f.razao_social)}</option>`).join('')}</select></label>
    <label class="campo">Nota fiscal<input name="nota_fiscal" value="${esc(p?.nota_fiscal || '')}"></label><label class="campo">Garantia até<input type="date" name="garantia_ate" value="${p?.garantia_ate || ''}"></label>
    <label class="campo">Setor<select name="setor_id"><option value="">—</option>${ss.filter(s => s.ativo).map(s => `<option value="${s.id}" ${s.id === p?.setor_id ? 'selected' : ''}>${esc(s.nome)}</option>`).join('')}</select></label>
    <label class="campo">Local<input name="local" value="${esc(p?.local || '')}" placeholder="Ex.: Escritório Três Lagoas"></label>
    <label class="campo">Estado<select name="estado">${Object.entries(ESTADOS_PAT).map(([k, [t]]) => `<option value="${k}" ${k === (p?.estado || 'novo') ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <label class="campo largo">Observações<input name="observacoes" value="${esc(p?.observacoes || '')}"></label>
    <label class="campo largo">Fotos / nota fiscal<input type="file" name="arquivos" multiple accept="image/*,application/pdf"></label></div>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`,
    { aoAbrir: raiz => { const f = $('form', raiz); const s = () => { const c = f.categoria.value; $('#b-cel', raiz).hidden = !['Celular', 'Tablet', 'Rastreador / telemetria'].includes(c); $('#b-chip', raiz).hidden = c !== 'Chip / linha'; };
      f.categoria.addEventListener('change', s); s(); } });
  if (!r) return;
  const dados = { tag: r.tag || null, categoria: r.categoria, descricao: r.descricao, marca: r.marca || null, modelo: r.modelo || null, numero_serie: r.numero_serie || null, imei: soDigitos(r.imei) || null, imei2: soDigitos(r.imei2) || null,
    linha: soDigitos(r.linha) || null, operadora: r.operadora || null, plano: r.plano || null, contido_em_id: r.contido_em_id || null, valor_aquisicao: num(r.valor_aquisicao), data_aquisicao: r.data_aquisicao || null,
    fornecedor_id: r.fornecedor_id || null, nota_fiscal: r.nota_fiscal || null, garantia_ate: r.garantia_ate || null, setor_id: r.setor_id || null, local: r.local || null, estado: r.estado, observacoes: r.observacoes || null };
  try {
    let id = p?.id; if (p) await api.alterar('patrimonios', `id=eq.${id}`, dados); else { [{ id }] = await api.inserir('patrimonios', dados); await api.inserir('patrimonio_movimentos', { patrimonio_id: id, tipo: 'cadastro', estado: r.estado }); }
    if (r.arquivos.length) await anexar('patrimonio', id, r.arquivos);
    aviso('Bem salvo.'); location.hash = '#/patrimonio/ver/' + id; if (p) navegar();
  } catch (err) { falha(err.message.includes('duplicate') ? new Error('Já existe um bem com essa tag.') : err); }
}
async function termoPatrimonio(p, colabId, codigo, extra = {}) {
  const m = await modeloPorCodigo(codigo); if (!m) return aviso('Modelo do termo não encontrado.', true);
  const contidos = await api.listar('patrimonios', `contido_em_id=eq.${p.id}&ativo=eq.true`).catch(() => []);
  const linhas = [p, ...contidos].map(x => `<tr><td>${esc(x.tag)}</td><td>${esc(x.descricao)}</td><td>${esc([x.marca, x.modelo].filter(Boolean).join(' '))}</td><td>${esc([x.imei && 'IMEI ' + x.imei, x.numero_serie && 'S/N ' + x.numero_serie, x.linha && 'Linha ' + fmtTel(x.linha)].filter(Boolean).join(' · '))}</td><td>${esc(ESTADOS_PAT[x.estado]?.[0] || x.estado)}</td><td>${x.valor_aquisicao ? brl(x.valor_aquisicao) : ''}</td></tr>`).join('');
  await gerarDocumento(m, colabId, { patrimonio: { ...p, ...extra, tabela_itens: `<table border="1" cellpadding="5" style="border-collapse:collapse;width:100%;font-size:12px"><tr><th>Tag</th><th>Descrição</th><th>Marca/modelo</th><th>Identificação</th><th>Estado</th><th>Valor</th></tr>${linhas}</table>` } });
}
rota('/patrimonio/ver/:id', async (tela, id) => {
  const [p, ms, cs] = await Promise.all([api.um('v_patrimonio_responsaveis', `id=eq.${id}`), api.listar('patrimonio_movimentos', `patrimonio_id=eq.${id}&ativo=eq.true&select=*,colab:colaboradores(nome)&order=data.desc,criado_em.desc`),
    api.listar('v_colaboradores_basico', 'select=id,nome,cargo&order=nome').catch(() => [])]);
  if (!p) { tela.innerHTML = '<div class="cartao vazio">Bem não encontrado ou sem acesso.</div>'; return; }
  const contidos = await api.listar('patrimonios', `contido_em_id=eq.${id}&ativo=eq.true`).catch(() => []);
  const pode = editaPat();
  tela.innerHTML = `
    <div class="topo"><div><h1>${esc(p.tag)} · ${esc(p.descricao)}</h1><p class="sub">${tagSit(p.situacao)} ${tagEst(p.estado)} · ${esc(p.categoria)}${p.responsavel_nome ? ' · com <b>' + esc(p.responsavel_nome) + '</b> desde ' + dataBR(p.desde) : ''}</p></div>
      <div class="acoes">${pode ? `${p.situacao === 'disponivel' ? '<button class="btn prim" id="entregar">Entregar a colaborador</button>' : ''}${p.situacao === 'em_uso' ? '<button class="btn prim" id="devolver">Registrar devolução</button><button class="btn" id="termo">Termo de responsabilidade</button>' : ''}
        ${p.situacao === 'manutencao' ? '<button class="btn" id="retorno">Retorno da manutenção</button>' : ''}${['disponivel', 'em_uso'].includes(p.situacao) ? '<button class="btn" id="manut">Enviar p/ manutenção</button>' : ''}
        <button class="btn" id="editar">Editar</button>${p.situacao !== 'baixado' && p.situacao !== 'em_uso' ? '<button class="btn perigo" id="baixar">Dar baixa</button>' : ''}` : ''}<a class="btn" href="#/patrimonio">Voltar</a></div></div>
    ${p.situacao === 'em_uso' && !p.termo_assinado ? `<div class="cartao alerta-obs">⚠️ Este bem está em uso <b>sem termo de responsabilidade assinado</b>. Gere o termo, colha a assinatura e anexe. ${pode ? `<button class="btn peq" id="anexar-termo">Anexar termo assinado</button>` : ''}</div>` : ''}
    <div class="cartao"><div class="form">
      ${[['Marca / modelo', [p.marca, p.modelo].filter(Boolean).join(' ')], ['Nº de série', p.numero_serie], ['IMEI', [p.imei, p.imei2].filter(Boolean).join(' / ')], ['Linha', p.linha ? fmtTel(p.linha) + (p.operadora ? ' · ' + p.operadora : '') + (p.plano ? ' · ' + p.plano : '') : ''],
        ['Aquisição', [dataBR(p.data_aquisicao), p.valor_aquisicao && brl(p.valor_aquisicao), p.nota_fiscal && 'NF ' + p.nota_fiscal].filter(Boolean).join(' · ')], ['Garantia', p.garantia_ate ? dataBR(p.garantia_ate) + (p.garantia_ate < hojeISO() ? ' (vencida)' : '') : ''],
        ['Setor / local', [p.setor_nome, p.local].filter(Boolean).join(' · ')], ['Observações', p.observacoes]].map(([k, v]) => `<div><div class="muted">${k}</div><b>${v ? esc(v) : '—'}</b></div>`).join('')}
      ${contidos.length ? `<div class="largo"><div class="muted">Itens instalados</div>${contidos.map(c => `<a href="#/patrimonio/ver/${c.id}">${esc(c.tag + ' · ' + c.descricao)}</a>`).join(' · ')}</div>` : ''}
      <div class="largo" id="anx-pat"></div></div></div>
    <div class="cartao"><h2>Histórico</h2><ul class="lista-simples">${ms.map(m => `<li style="flex-wrap:wrap"><span><b>${TIPO_MOV_PAT[m.tipo] || m.tipo}</b> <span class="muted">${dataBR(m.data)}${m.colab ? ' · ' + esc(m.colab.nome) : ''}${m.estado ? ' · estado ' + (ESTADOS_PAT[m.estado]?.[0] || m.estado) : ''}${m.observacao ? ' · ' + esc(m.observacao) : ''}</span>
      ${m.tipo === 'avaria' ? ` <span class="tag ${RESP_PAT[m.responsabilizacao]?.[1] || ''}">${RESP_PAT[m.responsabilizacao]?.[0] || ''}</span>${m.valor_prejuizo ? ' ' + brl(m.valor_prejuizo) : ''}` : ''}${m.tipo === 'entrega' ? (m.termo_assinado ? ' <span class="tag verde">termo assinado</span>' : ' <span class="tag amarelo">sem termo</span>') : ''}</span>
      <span class="anx-mov" data-id="${m.id}"></span></li>`).join('')}</ul></div>
    ${avisoLei('patrimonio')}`;
  $('#anx-pat').innerHTML = await htmlAnexos('patrimonio', id);
  $$('.anx-mov', tela).forEach(async el => { el.innerHTML = await htmlAnexos('patrimonio_movimento', el.dataset.id); });
  $('#editar')?.addEventListener('click', async () => formPatrimonio(await api.um('patrimonios', `id=eq.${id}`)));
  $('#termo')?.addEventListener('click', () => termoPatrimonio(p, p.responsavel_id, 'PAT-TER-001'));
  $('#anexar-termo')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Anexar termo assinado</h2><label class="campo">Arquivo (foto ou PDF)<input type="file" name="arquivos" accept="image/*,application/pdf" required></label>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Enviar</button></div></form>`);
    if (!r) return;
    try { await anexar('patrimonio_movimento', p.ultima_entrega_id, r.arquivos); await api.alterar('patrimonio_movimentos', `id=eq.${p.ultima_entrega_id}`, { termo_assinado: true }); aviso('Termo anexado.'); navegar(); } catch (err) { falha(err); } });
  $('#entregar')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Entregar ${esc(p.tag)}</h2><div class="form">
      <label class="campo largo">Colaborador *<select name="colab" required><option value="">Selecione…</option>${cs.map(c => `<option value="${c.id}">${esc(c.nome)}${c.cargo ? ' · ' + esc(c.cargo) : ''}</option>`).join('')}</select></label>
      <label class="campo">Data<input type="date" name="data" value="${hojeISO()}"></label><label class="campo">Estado na entrega<select name="estado">${Object.entries(ESTADOS_PAT).map(([k, [t]]) => `<option value="${k}" ${k === p.estado ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo largo">Acessórios / observação<input name="obs" placeholder="Ex.: carregador, capa, película"></label></div>
      <p class="muted">Ao confirmar, o sistema gera o termo de responsabilidade para impressão e assinatura.</p>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Entregar e gerar termo</button></div></form>`);
    if (!r) return;
    try { await api.rpc('entregar_patrimonio', { p_id: id, p_colaborador: r.colab, p_data: r.data, p_estado: r.estado, p_obs: r.obs || null });
      await termoPatrimonio({ ...p, estado: r.estado }, r.colab, 'PAT-TER-001'); aviso('Entregue. Anexe o termo assinado depois.'); navegar(); } catch (err) { falha(err); } });
  $('#devolver')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Devolução de ${esc(p.tag)}</h2><p class="muted">Com ${esc(p.responsavel_nome || '')} desde ${dataBR(p.desde)} · estado na entrega: ${ESTADOS_PAT[p.estado]?.[0]}</p><div class="form">
      <label class="campo">Data<input type="date" name="data" value="${hojeISO()}"></label>
      <label class="campo">Estado na devolução<select name="estado">${Object.entries(ESTADOS_PAT).map(([k, [t]]) => `<option value="${k}" ${k === p.estado ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo">Ocorrência<select name="oc"><option value="">Nenhuma — devolvido normalmente</option><option value="avaria">Devolvido com avaria / dano</option><option value="extravio">Não devolvido (extravio, furto, roubo)</option></select></label>
      <div class="largo form" id="b-av" style="padding:0" hidden><label class="campo">Prejuízo estimado (R$)<input name="valor" inputmode="decimal"></label>
        <label class="campo">Avaliação preliminar<select name="culpa">${Object.entries(CULPA).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></label>
        <div class="largo">${avisoLei('desconto_dano')}</div></div>
      <label class="campo largo">Observação<input name="obs" placeholder="O que foi devolvido, acessórios faltantes, relato do colaborador"></label>
      <label class="campo largo">Fotos / boletim de ocorrência<input type="file" name="arquivos" multiple accept="image/*,application/pdf"></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Registrar devolução</button></div></form>`,
      { aoAbrir: raiz => { const f = $('form', raiz); f.oc.onchange = () => ($('#b-av', raiz).hidden = !f.oc.value); } });
    if (!r) return;
    try { await api.rpc('devolver_patrimonio', { p_id: id, p_data: r.data, p_estado: r.estado, p_obs: r.obs || null, p_ocorrencia: r.oc || null, p_valor: num(r.valor), p_culpa: r.oc ? r.culpa : null });
      if (r.arquivos.length) { const [m] = await api.listar('patrimonio_movimentos', `patrimonio_id=eq.${id}&order=criado_em.desc&limit=1`); if (m) await anexar('patrimonio_movimento', m.id, r.arquivos); }
      if (!r.oc) await termoPatrimonio(p, p.responsavel_id, 'PAT-TER-002', { estado_devolucao: ESTADOS_PAT[r.estado]?.[0], observacao: r.obs || '' });
      aviso(r.oc ? 'Devolução registrada. A avaria foi para análise de responsabilização.' : 'Devolução registrada.'); navegar(); } catch (err) { falha(err); } });
  const simples = async (tipo, situacao, titulo) => { const obs = await confirmar(titulo, { comMotivo: true }); if (!obs) return;
    try { await api.inserir('patrimonio_movimentos', { patrimonio_id: id, tipo, observacao: obs }); await api.alterar('patrimonios', `id=eq.${id}`, { situacao, ...(situacao === 'baixado' ? { responsavel_id: null } : {}) }); navegar(); } catch (err) { falha(err); } };
  $('#manut')?.addEventListener('click', () => p.situacao === 'em_uso' ? aviso('Registre a devolução antes (com estado "ruim") — o bem vai automaticamente para manutenção.', true) : simples('envio_manutencao', 'manutencao', 'Enviar para manutenção: onde e qual o problema?'));
  $('#retorno')?.addEventListener('click', () => simples('retorno_manutencao', 'disponivel', 'Retorno da manutenção: o que foi feito?'));
  $('#baixar')?.addEventListener('click', () => simples('baixa', 'baixado', 'Dar baixa no bem (venda, descarte, perda definitiva). Motivo:'));
});
rota('/patrimonio/avarias', async tela => {
  const avs = await api.listar('patrimonio_movimentos', 'tipo=eq.avaria&ativo=eq.true&select=*,colab:colaboradores(id,nome),pat:patrimonios(id,tag,descricao)&order=data.desc');
  tela.innerHTML = `<div class="topo"><div><h1>Avarias e responsabilização</h1><p class="sub">Danos e extravios de bens da empresa em uso pelos colaboradores</p></div><a class="btn" href="#/patrimonio">Voltar</a></div>
    ${avisoLei('desconto_dano')}
    <div class="cartao">${avs.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Data</th><th>Bem</th><th>Colaborador</th><th class="num">Prejuízo</th><th>Avaliação</th><th>Situação</th><th></th></tr></thead><tbody>
      ${avs.map(a => `<tr><td data-r="Data">${dataBR(a.data)}</td><td data-r="Bem"><a href="#/patrimonio/ver/${a.pat?.id}">${esc((a.pat?.tag || '') + ' · ' + (a.pat?.descricao || ''))}</a><div class="muted">${esc(a.observacao || '')}</div></td>
        <td data-r="Colaborador">${esc(a.colab?.nome || '—')}</td><td data-r="Prejuízo" class="num">${a.valor_prejuizo ? brl(a.valor_prejuizo) : '—'}</td><td data-r="Avaliação">${esc(CULPA[a.culpa] || '—')}</td>
        <td data-r="Situação"><span class="tag ${RESP_PAT[a.responsabilizacao]?.[1] || ''}">${RESP_PAT[a.responsabilizacao]?.[0] || '—'}</span></td>
        <td>${editaPat() || tem('rh', 'dp') ? `<button class="btn peq" data-dec="${a.id}">Decidir</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Nenhuma avaria registrada.</div>'}</div>`;
  $$('[data-dec]', tela).forEach(b => b.onclick = async () => { const a = avs.find(x => x.id === b.dataset.dec);
    const r = await modal(`<form><h2>Responsabilização · ${esc(a.pat?.tag || '')}</h2><p>${esc(a.colab?.nome || '')} · prejuízo ${a.valor_prejuizo ? brl(a.valor_prejuizo) : 'não informado'}</p><div class="form">
      <label class="campo">Conclusão da apuração<select name="culpa">${Object.entries(CULPA).map(([k, t]) => `<option value="${k}" ${k === a.culpa ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo">Valor do prejuízo comprovado (R$)<input name="valor" inputmode="decimal" value="${a.valor_prejuizo ?? ''}"></label>
      <label class="campo">Decisão<select name="resp">${Object.entries(RESP_PAT).map(([k, [t]]) => `<option value="${k}" ${k === a.responsabilizacao ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo largo">Fundamentação<textarea name="obs" rows="3">${esc(a.observacao || '')}</textarea></label>
      <div class="largo" id="b-desc" hidden>${avisoLei('desconto_dano')}
        <label class="check"><input type="checkbox" name="termo"> Existe termo de responsabilidade assinado (necessário para descontar por culpa)</label>
        <label class="check"><input type="checkbox" name="juridico"> O jurídico analisou e aprovou o desconto</label></div></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar decisão</button></div></form>`,
      { aoAbrir: raiz => { const f = $('form', raiz); const s = () => { $('#b-desc', raiz).hidden = f.resp.value !== 'desconto_encaminhado_dp'; }; f.resp.onchange = s; s(); },
        validar: d => { if (d.resp !== 'desconto_encaminhado_dp') return null;
          if (d.culpa === 'sem_culpa' || d.culpa === 'em_apuracao') return 'Só é possível descontar com dolo ou culpa apurados (art. 462 §1º).';
          if (d.culpa === 'culpa' && !d.termo) return 'Desconto por culpa exige acordo/termo assinado pelo colaborador (art. 462 §1º).';
          if (!d.juridico) return 'Confirme a aprovação do jurídico antes de encaminhar o desconto ao DP.';
          if (!(num(d.valor) > 0)) return 'Informe o valor do prejuízo comprovado.'; return null; } });
    if (!r) return;
    try { await api.alterar('patrimonio_movimentos', `id=eq.${a.id}`, { culpa: r.culpa, valor_prejuizo: num(r.valor), responsabilizacao: r.resp, observacao: r.obs || null });
      aviso(r.resp === 'desconto_encaminhado_dp' ? 'Encaminhado ao DP para desconto em folha.' : 'Decisão registrada.'); navegar(); } catch (err) { falha(err); } });
});

// ===================== Meus itens (todos os colaboradores) =====================
rota('/meus-itens', async tela => {
  const [ps, eps] = await Promise.all([api.listar('patrimonios', 'situacao=eq.em_uso&ativo=eq.true&order=tag').catch(() => []),
    api.listar('epi_entregas', 'ativo=eq.true&devolvido_em=is.null&select=*,item:almox_itens(descricao,unidade)&order=data.desc').catch(() => [])]);
  const meu = await api.rpc('meu_colaborador').catch(() => null);
  const minhasP = ps.filter(p => p.responsavel_id === meu), meusE = eps.filter(e => e.colaborador_id === meu);
  tela.innerHTML = `<div class="topo"><div><h1>Meus itens</h1><p class="sub">Bens da empresa e EPIs sob sua responsabilidade</p></div><a class="btn prim" href="#/almox/requisicoes/nova">+ Pedir material / EPI</a></div>
    <div class="cartao"><h2>Equipamentos</h2>${minhasP.length ? `<ul class="lista-simples">${minhasP.map(p => `<li><span><b>${esc(p.tag)}</b> ${esc(p.descricao)} <span class="muted">${esc([p.imei && 'IMEI ' + p.imei, p.linha && fmtTel(p.linha)].filter(Boolean).join(' · '))}</span></span><span class="muted">desde ${dataBR(p.desde)}</span></li>`).join('')}</ul>` : '<div class="vazio">Nenhum equipamento com você.</div>'}</div>
    <div class="cartao"><h2>EPIs e uniformes</h2>${meusE.length ? `<ul class="lista-simples">${meusE.map(e => `<li><span>${esc(e.item?.descricao || '')} · ${fmtQtd(e.quantidade, e.item?.unidade)}</span><span class="muted">entregue ${dataBR(e.data)}${e.troca_prevista ? ' · troca ' + dataBR(e.troca_prevista) : ''}</span></li>`).join('')}</ul>` : '<div class="vazio">Nenhum EPI registrado.</div>'}</div>
    <p class="muted">Algum item danificou, sumiu ou não está na lista? Avise o almoxarifado ou o RH imediatamente.</p>`;
});

// Aba na ficha do colaborador (RH): patrimônio e EPI
if (typeof ABAS_RH_EXTRA !== 'undefined') ABAS_RH_EXTRA.patrimonio = async (box, c) => {
  const [ps, eps] = await Promise.all([api.listar('patrimonios', `responsavel_id=eq.${c.id}&ativo=eq.true&order=tag`).catch(() => []),
    api.listar('epi_entregas', `colaborador_id=eq.${c.id}&ativo=eq.true&select=*,item:almox_itens(descricao,unidade)&order=data.desc`).catch(() => [])]);
  box.innerHTML = `<h2>Patrimônio em posse</h2>${ps.length ? `<ul class="lista-simples">${ps.map(p => `<li><span><a href="#/patrimonio/ver/${p.id}"><b>${esc(p.tag)}</b> ${esc(p.descricao)}</a></span><span class="muted">desde ${dataBR(p.desde)}</span></li>`).join('')}</ul>` : '<p class="muted">Nenhum bem com o colaborador.</p>'}
    <h2>EPIs e uniformes</h2>${eps.length ? `<ul class="lista-simples">${eps.map(e => `<li><span>${esc(e.item?.descricao || '')} · ${fmtQtd(e.quantidade, e.item?.unidade)}</span><span class="muted">${dataBR(e.data)}${e.devolvido_em ? ' · devolvido ' + dataBR(e.devolvido_em) : ''}</span></li>`).join('')}</ul>` : '<p class="muted">Nenhum EPI entregue.</p>'}
    <div class="acoes"><a class="btn peq" href="#/almox/epi?colab=${c.id}">Ficha de EPI</a></div>`;
};
