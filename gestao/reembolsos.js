// Verbo Gestão — Reembolsos e Aprovações
'use strict';

const SELECT_REEMB = 'select=*,conta:plano_contas(codigo,nome),cc:centros_custo(nome),colab:usuarios(nome)';
const nomeColab = r => r.colab?.nome || r.colaborador_nome || '—';
const TIPOS_COMPROVANTE = ['Cupom fiscal (NFC-e / SAT)', 'Nota fiscal (NF-e)', 'Nota fiscal de serviço (NFS-e)', 'Recibo', 'Comprovante de cartão', 'Outro'];
const FORMAS_PAGTO = ['Dinheiro', 'Pix', 'Cartão de débito', 'Cartão de crédito', 'Outro'];
const CUSTEIO = { reembolso: 'Reembolso', adiantamento: 'Adiantamento', fundo_fixo: 'Fundo Fixo' };
const tagCusteio = r => r.forma_custeio && r.forma_custeio !== 'reembolso' ? ` <span class="tag azul">${CUSTEIO[r.forma_custeio]}</span>` : '';
const pessoasSemLogin = f => cad('pessoas_sem_login', 'select=id,nome,usuario_id&order=nome', f);
// Pessoa do reembolso/adiantamento: colaboradores do RH + usuários fora do RH + outras pessoas + externo (mesmo padrão dos planos de ação)
async function pessoasFin() {
  if (estado.cache._pessoasFin) return estado.cache._pessoasFin;
  let l = await api.rpc('pessoas_para_reembolso').catch(() => null);
  if (!l) { const [us, ps] = await Promise.all([usuarios(), pessoasSemLogin()]);
    l = [...us.filter(u => u.ativo).map(u => ({ grupo: '2', nome: u.nome, chave: 'u:' + u.id })), ...ps.map(p => ({ grupo: '3', nome: p.nome, chave: 'p:' + p.id }))]; }
  const vistos = new Set(); l = l.filter(p => !vistos.has(p.chave) && vistos.add(p.chave));
  return (estado.cache._pessoasFin = l);
}
const GRUPOS_PES = { 1: 'RH', 2: 'usuário', 3: 'cadastro interno' };
// Seletor de pessoa (busca por nome, colaboradores do RH, usuários e pessoas externas) — mesmo padrão dos planos de ação
const htmlPessoaFin = (lista, sel, { disabled = false, rotulo = 'Colaborador' } = {}) => {
  const p = lista.find(x => x.chave === sel);
  return `<div class="campo" data-pesfin${disabled ? ' data-fixo' : ''}><span>${esc(rotulo)} *</span><div class="selpes"><input type="hidden" name="quem" value="${esc(p ? sel : '')}"><input type="hidden" name="quem_nome" value="">
    <div class="selpes-chips"></div>${disabled ? '' : '<input type="text" class="selpes-q" placeholder="Buscar colaborador, usuário ou pessoa…" autocomplete="off"><div class="selpes-lista" hidden></div>'}</div></div>`;
};
function ligarPessoaFin(f, lista = estado.cache._pessoasFin || []) {
  const box = f.querySelector('[data-pesfin]'); if (!box || box._ligado) return; box._ligado = true;
  const hid = box.querySelector('[name=quem]'), hidNome = box.querySelector('[name=quem_nome]'), chips = box.querySelector('.selpes-chips'),
        q = box.querySelector('.selpes-q'), ls = box.querySelector('.selpes-lista'), fixo = box.hasAttribute('data-fixo');
  let achados = [];
  const desenhar = () => {
    const v = hid.value, p = lista.find(x => x.chave === v), nome = v === 'x:novo' ? hidNome.value : p?.nome;
    chips.innerHTML = nome ? `<span class="selpes-chip${v === 'x:novo' ? ' ext' : ''}">${esc(nome)} <small>${v === 'x:novo' ? 'externo' : esc(GRUPOS_PES[p?.grupo] || '')}</small>${fixo ? '' : '<button type="button" data-tira title="Trocar">✕</button>'}</span>` : '';
    if (q) q.hidden = !!nome;
  };
  const definir = (v, nome = '') => { hid.value = v; hidNome.value = nome; desenhar(); hid.dispatchEvent(new Event('change', { bubbles: true })); };
  if (!fixo) {
    const fechar = () => { ls.hidden = true; };
    const mostrar = () => {
      const t = q.value.trim();
      achados = lista.filter(p => casaBusca(p.nome + ' ' + (p.info || ''), t)).slice(0, 40);
      ls.innerHTML = achados.map((p, i) => `<div class="selpes-op" data-op="${i}"><b>${esc(p.nome)}</b><span class="muted">${esc([GRUPOS_PES[p.grupo], p.info].filter(Boolean).join(' · '))}</span></div>`).join('')
        + `<div class="selpes-op ext" data-ext>+ Pessoa externa${t ? `: <b>${esc(t)}</b>` : '…'}</div>`;
      ls.hidden = false;
    };
    const externo = async () => {
      let nome = q.value.trim();
      if (!nome) { const r = await modal(`<form><h2>Pessoa externa</h2><div class="form"><label class="campo largo">Nome completo *<input name="nome" required></label></div>
        <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Incluir</button></div></form>`); nome = r?.nome?.trim(); }
      if (!nome) return; q.value = ''; fechar(); definir('x:novo', nome);
    };
    const escolher = i => { const p = achados[i]; if (!p) return; q.value = ''; fechar(); definir(p.chave); };
    q.addEventListener('focus', mostrar); q.addEventListener('input', mostrar);
    q.addEventListener('blur', () => setTimeout(fechar, 150));
    q.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); if (achados.length && q.value.trim()) escolher(0); else if (q.value.trim()) externo(); }
      else if (e.key === 'Escape') { e.stopPropagation(); fechar(); }
    });
    ls.addEventListener('mousedown', e => { e.preventDefault(); const o = e.target.closest('[data-op]'); if (o) escolher(Number(o.dataset.op)); else if (e.target.closest('[data-ext]')) externo(); });
    chips.addEventListener('click', e => { if (e.target.closest('[data-tira]')) { definir(''); q.focus(); } });
  }
  desenhar();
}
// devolve os campos da pessoa para gravar (cria o cadastro interno para colaborador sem login ou externo)
async function resolverPessoaFin(q, nomeExterno, lista) {
  if (q === 'x:novo') { const r = await api.rpc('pessoa_reembolso', { p_colaborador: null, p_nome: nomeExterno }); estado.cache._pessoasFin = null;
    return { colaborador_id: null, pessoa_sem_login_id: r.pessoa_sem_login_id, colaborador_nome: r.nome }; }
  if (q.startsWith('c:')) { const r = await api.rpc('pessoa_reembolso', { p_colaborador: q.slice(2), p_nome: null }); estado.cache._pessoasFin = null;
    return r.colaborador_id ? { colaborador_id: r.colaborador_id, pessoa_sem_login_id: null, colaborador_nome: null } : { colaborador_id: null, pessoa_sem_login_id: r.pessoa_sem_login_id, colaborador_nome: r.nome }; }
  if (q.startsWith('p:')) return { colaborador_id: null, pessoa_sem_login_id: q.slice(2), colaborador_nome: (lista || []).find(p => p.chave === q)?.nome || null };
  return { colaborador_id: q.slice(2), pessoa_sem_login_id: null, colaborador_nome: null };
}
const descrTxt = r => r.descricao || r.fornecedor_nome || '';
const categoriaTxt = r => r.conta ? `${r.conta.nome}${r.categoria_outros ? ' — ' + r.categoria_outros : ''}` : (r.categoria || '—');

function tabelaReembolsos(linhas, { comColab = false, selecionar = false } = {}) {
  if (!linhas.length) return '<div class="vazio">Nenhum reembolso encontrado.</div>';
  const total = linhas.reduce((s, r) => s + Number(r.valor), 0);
  return `<div class="tabela-wrap"><table class="responsiva"><thead><tr>
    ${selecionar ? '<th><input type="checkbox" id="sel-todos" aria-label="Selecionar todos"></th>' : ''}
    <th>Nº</th><th>Data</th>${comColab ? '<th>Colaborador</th>' : ''}<th>Categoria</th><th>Descrição</th><th class="num">Valor</th><th>Situação</th></tr></thead><tbody>
    ${linhas.map(r => `<tr class="clicavel" data-id="${r.id}"${fAttr('colab', nomeColab(r))}${fAttr('cat', r.conta?.nome || r.categoria)}${fAttr('custeio', CUSTEIO[r.forma_custeio || 'reembolso'])}${fAttr('sit', _txt(tag(r.status)))}${fAttr('cc', r.cc?.nome)}${fAttr('data', r.data_despesa)}${fAttr('valor', r.valor)}${fAttr('busca', [r.numero, nomeColab(r), r.fornecedor_nome, r.descricao, r.categoria, r.placa, r.observacoes].filter(Boolean).join(' '))}>
      ${selecionar ? `<td data-r="Selecionar">${r.status === 'cancelado' || custeioMutavel(r) || (r.status === 'aprovado' && (r.forma_custeio || 'reembolso') === 'reembolso') ? `<input type="checkbox" class="sel" value="${r.id}" data-colab="${esc(r.colaborador_id || r.colaborador_nome)}" data-lote="${r.status === 'aprovado' && (r.forma_custeio || 'reembolso') === 'reembolso' ? 1 : ''}">` : ''}</td>` : ''}
      <td data-r="Nº" class="nowrap">${esc(r.numero)}</td><td data-r="Data">${dataBR(r.data_despesa)}</td>
      ${comColab ? `<td data-r="Colaborador">${esc(nomeColab(r))}</td>` : ''}
      <td data-r="Categoria">${esc(categoriaTxt(r))}</td><td data-r="Descrição">${r.observacoes?.includes('VERIFICAR') ? '<span title="Verificar: veja as observações">⚠️</span> ' : ''}${esc(descrTxt(r))}</td>
      <td data-r="Valor" class="num">${brl(r.valor)}</td><td data-r="Situação">${tag(r.status)}${tagCusteio(r)}</td></tr>`).join('')}
    </tbody><tfoot><tr>${selecionar ? '<td></td>' : ''}<td colspan="${comColab ? 5 : 4}">${linhas.length} lançamento(s)</td><td class="num">${brl(total)}</td><td></td></tr></tfoot></table></div>`;
}

function ligarLinhas(tela) {
  $$('tr[data-id]', tela).forEach(tr => tr.addEventListener('click', e => {
    if (e.target.closest('input')) return;
    location.hash = '#/reembolsos/ver/' + tr.dataset.id;
  }));
}

// ---------- Meus reembolsos ----------
rota('/reembolsos', async tela => {
  const linhas = await api.listar('reembolsos', `${SELECT_REEMB}&colaborador_id=eq.${estado.usuario.id}&status=neq.cancelado&order=data_despesa.desc,numero.desc&limit=300`);
  const aberto = linhas.filter(r => !['pago', 'reprovado'].includes(r.status)).reduce((s, r) => s + Number(r.valor), 0);
  tela.innerHTML = `
    <div class="topo"><div><h1>Meus reembolsos</h1><p class="sub">${brl(aberto)} a receber</p></div>
      <a class="btn prim" href="#/reembolsos/novo">+ Lançar reembolso</a></div>
    <div class="cartao">${tabelaReembolsos(linhas)}</div>`;
  ligarLinhas(tela);
  filtroLocal(tela, { itens: 'tbody tr[data-id]', antes: '.cartao', campos: [{ k: 'cat', rotulo: 'Categoria' }, { k: 'custeio', rotulo: 'Forma de custeio' }, { k: 'sit', rotulo: 'Situação' }], periodo: true, rotuloPeriodo: 'Data da despesa' });
});

// ---------- Novo / editar ----------
async function formReembolso(tela, r = null) {
  const [ccs, vs, listaPes] = await Promise.all([centros(), veiculos(), editaFin() ? pessoasFin() : []]);
  const adtParam = estado.params.get('adt');
  const adtFixo = adtParam ? await api.um('adiantamentos', `id=eq.${adtParam}`) : null;
  const custeioIni = r?.forma_custeio || (adtFixo ? 'adiantamento' : estado.params.get('custeio')) || 'reembolso';
  const quemIni = adtFixo ? (adtFixo.colaborador_id ? 'u:' + adtFixo.colaborador_id : 'p:' + adtFixo.pessoa_sem_login_id)
    : ['fundo_fixo', 'adt_fundo'].includes(estado.params.get('custeio')) ? '' : 'u:' + estado.usuario.id;
  const adtsAbertos = await api.listar('adiantamentos', 'select=id,numero,valor,motivo,colaborador_id,pessoa_sem_login_id&status=in.(pago,prestando_contas)&order=numero').catch(() => []);
  const ccPadrao = r?.centro_custo_id || estado.usuario.centro_custo_id || ccs.find(c => c.codigo === 'GERAL')?.id;
  const contaOutros = (await contas()).filter(c => /^outr/i.test(c.nome)).map(c => c.id);
  tela.innerHTML = `
    <div class="topo"><div><h1>${r ? 'Corrigir lançamento ' + esc(r.numero) : custeioIni === 'reembolso' ? 'Lançar reembolso' : custeioIni === 'fundo_fixo' ? 'Lançar despesa do Fundo Fixo' : 'Lançar despesa da prestação de contas'}</h1>
      <p class="sub">Anexe a foto ou o PDF do comprovante.</p></div></div>
    <form class="cartao form" id="f-reemb">
      ${editaFin() && !r ? htmlPessoaFin(listaPes, quemIni, { disabled: !!adtFixo }) : ''}
      <label class="campo">Como foi pago?<select name="forma_custeio" ${adtFixo ? 'disabled' : ''}>
          <option value="reembolso" ${custeioIni === 'reembolso' ? 'selected' : ''}>Do próprio bolso (quero ser reembolsado)</option>
          <option value="adiantamento" ${custeioIni === 'adiantamento' ? 'selected' : ''}>Com adiantamento recebido (prestação de contas)</option>
          ${editaFin() || custeioIni === 'fundo_fixo' ? `<option value="fundo_fixo" ${custeioIni === 'fundo_fixo' ? 'selected' : ''}>Despesa paga com dinheiro do Fundo Fixo</option>` : ''}
          ${editaFin() && !r ? `<option value="adt_fundo" ${custeioIni === 'adt_fundo' ? 'selected' : ''}>Adiantamento entregue pelo Fundo Fixo (a pessoa vai prestar contas)</option>` : ''}</select></label>
      <div class="largo aviso-lei" id="dica-adt" hidden>Use <b>só</b> quando o dinheiro foi entregue <b>antes</b> da compra e a pessoa ainda vai prestar contas. Vai para <b>Adiantamentos</b> (código ADT) e fica cobrando a prestação de contas.
        <b>Se a compra já foi feita e você tem a nota ou o comprovante, escolha “Despesa paga com dinheiro do Fundo Fixo”.</b></div>
      <label class="campo" id="campo-adt" hidden>Adiantamento<select name="adiantamento_id" ${adtFixo ? 'disabled' : ''}></select></label>
      <label class="campo">Data da despesa<input type="date" name="data_despesa" required max="${hojeISO()}" value="${r?.data_despesa || hojeISO()}"></label>
      <label class="campo">Valor (R$)<input name="valor" inputmode="decimal" required placeholder="0,00" value="${r ? String(r.valor).replace('.', ',') : ''}"></label>
      <label class="campo" data-so-despesa>Categoria<select name="conta_id" required>${await opcoesContas(r?.conta_id)}</select></label>
      <label class="campo" id="campo-outros" ${r?.categoria_outros ? '' : 'hidden'}>Qual despesa?<input name="categoria_outros" value="${esc(r?.categoria_outros || '')}" placeholder="Descreva a categoria"></label>
      <label class="campo">Centro de custo<select name="centro_custo_id">${opcoes(ccs.filter(c => c.ativo), null, c => c.nome, ccPadrao, null)}</select></label>
      <label class="campo" data-so-despesa>Veículo (se houver)<select name="veiculo_id">${opcoes(vs.filter(v => v.ativo), null, v => v.placa + (v.modelo ? ' · ' + v.modelo : ''), r?.veiculo_id, 'Nenhum')}</select></label>
      <details class="largo comprovante" ${r?.fornecedor_nome || r?.chave_acesso ? 'open' : ''}><summary>Dados do comprovante (opcional)</summary><div class="form">
        <label class="campo">Estabelecimento<input name="fornecedor_nome" value="${esc(r?.fornecedor_nome || '')}" placeholder="Nome do posto, restaurante…"></label>
        <label class="campo">CNPJ / CPF<input name="fornecedor_documento" value="${esc(r?.fornecedor_documento || '')}" inputmode="numeric"></label>
        <label class="campo">Tipo de comprovante<select name="tipo_comprovante" data-valor="${esc(r?.tipo_comprovante || '')}"><option value="">—</option>${TIPOS_COMPROVANTE.map(t => `<option ${r?.tipo_comprovante === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label class="campo">Nº da nota / cupom<input name="numero_documento" value="${esc(r?.numero_documento || '')}"></label>
        <label class="campo">Forma de pagamento<select name="forma_pagamento" data-valor="${esc(r?.forma_pagamento || '')}"><option value="">—</option>${FORMAS_PAGTO.map(t => `<option ${r?.forma_pagamento === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label class="campo">Cidade / UF<span class="lado"><input name="cidade" value="${esc(r?.cidade || '')}"><input name="uf" maxlength="2" value="${esc(r?.uf || '')}" style="max-width:64px" aria-label="UF"></span></label>
        <label class="campo largo">Chave de acesso (44 dígitos)<input name="chave_acesso" inputmode="numeric" value="${esc(r?.chave_acesso || '')}"></label>
      </div></details>
      <label class="campo largo">Descrição<textarea name="descricao" required placeholder="Ex.: almoço na viagem a Campinas">${esc(r?.descricao || '')}</textarea></label>
      <label class="campo largo">Comprovantes (foto ou PDF)<input type="file" name="arquivos" accept="image/*,application/pdf" multiple ${r ? '' : 'required'}></label>
      ${r ? `<div class="largo">Anexos atuais: ${await htmlAnexos('reembolso', r.id)}</div>` : ''}
      <div class="largo acoes"><button class="btn prim">${r ? 'Reenviar para aprovação' : 'Enviar para aprovação'}</button><a class="btn" href="#/reembolsos">Cancelar</a></div>
    </form>`;
  const f = $('#f-reemb');
  ligarPessoaFin(f, listaPes);
  const mostrarOutros = () => { $('#campo-outros').hidden = !contaOutros.includes(f.conta_id.value); };
  f.conta_id.onchange = mostrarOutros; mostrarOutros();
  const quem = () => adtFixo ? quemIni : (f.quem ? f.quem.value : (r ? (r.colaborador_id ? 'u:' + r.colaborador_id : 'p:' + r.pessoa_sem_login_id) : 'u:' + estado.usuario.id));
  const atualizaAdt = () => {
    const ehAdt = f.forma_custeio.value === 'adiantamento'; $('#campo-adt').hidden = !ehAdt;
    const adtF = f.forma_custeio.value === 'adt_fundo'; $('#dica-adt').hidden = !adtF;
    $$('[data-so-despesa]', f).forEach(el => { el.hidden = adtF; }); f.conta_id.required = !adtF;
    tela.querySelector('.topo h1').textContent = r ? 'Corrigir lançamento ' + r.numero : { reembolso: 'Lançar reembolso', fundo_fixo: 'Lançar despesa do Fundo Fixo', adiantamento: 'Lançar despesa da prestação de contas', adt_fundo: 'Lançar adiantamento entregue pelo Fundo Fixo' }[f.forma_custeio.value] || 'Lançar despesa';
    const q = quem(); const meus = adtsAbertos.filter(a => (a.colaborador_id && 'u:' + a.colaborador_id === q) || (a.pessoa_sem_login_id && 'p:' + a.pessoa_sem_login_id === q));
    const sel = adtFixo?.id || r?.adiantamento_id;
    f.adiantamento_id.innerHTML = meus.length ? meus.map(a => `<option value="${a.id}" ${a.id === sel ? 'selected' : ''}>${esc(a.numero)} · ${brl(a.valor)} · ${esc(a.motivo)}</option>`).join('')
      : '<option value="">Nenhum adiantamento em aberto para esta pessoa</option>';
  };
  f.forma_custeio.onchange = atualizaAdt; if (f.quem) f.quem.onchange = atualizaAdt; atualizaAdt();
  f.onsubmit = async e => {
    e.preventDefault();
    const d = formDados(f);
    const valor = num(d.valor);
    if (!valor || valor <= 0) return aviso('Informe um valor válido.', true);
    if (d.forma_custeio === 'adt_fundo') {
      const q = quem(); if (!q) return aviso('Escolha a pessoa que recebeu o adiantamento.', true);
      if (!d.arquivos?.length && (d.forma_pagamento || 'Dinheiro') !== 'Dinheiro') return aviso('Anexe o comprovante da entrega. Só dinheiro dispensa comprovante.', true);
      if (!await confirmar('Adiantamento = dinheiro entregue ANTES da compra; a pessoa vai prestar contas depois. Se a compra já aconteceu (tem nota/comprovante), cancele e escolha "Despesa paga com dinheiro do Fundo Fixo". É mesmo um adiantamento?', { botao: 'Sim, é adiantamento' })) return;
      return ocupado(e.submitter, async () => {
        try {
          const pes = await resolverPessoaFin(q, d.quem_nome, listaPes);
          // trava de duplicidade: mesmo valor, mesma pessoa e mesma data já lançados
          const dup = await api.listar('adiantamentos', `select=numero&status=neq.cancelado&valor=eq.${valor}&data_entrega=eq.${d.data_despesa}&${pes.colaborador_id ? 'colaborador_id=eq.' + pes.colaborador_id : 'pessoa_sem_login_id=eq.' + pes.pessoa_sem_login_id}`).catch(() => []);
          if (dup.length && !await confirmar(`Já existe ${dup.map(x => x.numero).join(', ')} com o mesmo valor (${brl(valor)}), pessoa e data. Lançar outro mesmo assim?`, { botao: 'Lançar outro' })) return;
          const fundo = await api.um('contas_bancarias', 'tipo=eq.fundo_fixo&ativo=eq.true&select=id');
          const forma = ['Pix', 'Transferência'].includes(d.forma_pagamento) ? d.forma_pagamento : 'Dinheiro';
          const id = await api.rpc('registrar_adiantamento_entregue', { p_colaborador: pes.colaborador_id, p_pessoa: pes.colaborador_id ? null : pes.pessoa_sem_login_id,
            p_valor: valor, p_motivo: d.descricao, p_data_entrega: d.data_despesa, p_conta: fundo.id, p_forma: forma, p_lancar_saida: true, p_prazo: null, p_cc: d.centro_custo_id || null, p_obs: null });
          try { await anexar('adiantamento', id, d.arquivos); }
          catch (err) { aviso('Adiantamento registrado, mas o comprovante não subiu (' + (err.message || err) + '). NÃO lance de novo: anexe o comprovante nesta tela.', true); location.hash = '#/adiantamentos/ver/' + id; return; }
          aviso('Adiantamento registrado e lançado no Fundo Fixo.'); location.hash = '#/adiantamentos/ver/' + id;
        } catch (err) { falha(err); }
      });
    }
    if (contaOutros.includes(d.conta_id) && !d.categoria_outros) return aviso('Descreva a categoria "Outros".', true);
    if (d.forma_custeio === 'fundo_fixo' && /fundo fixo/i.test(f.conta_id.selectedOptions[0]?.textContent || '') && !await confirmar('A categoria "Fundo fixo de colaboradores" é dinheiro entregue a alguém. Se a pessoa vai prestar contas, use "Adiantamento entregue pelo Fundo Fixo". Lançar mesmo assim como despesa?')) return;
    const custeio = adtFixo ? 'adiantamento' : d.forma_custeio;
    const adtId = adtFixo ? adtFixo.id : (custeio === 'adiantamento' ? f.adiantamento_id.value : null);
    if (custeio === 'adiantamento' && !adtId) return aviso('Não há adiantamento em aberto para esta pessoa. Escolha outra forma de pagamento.', true);
    const q = quem();
    if (!r && editaFin() && !q) return aviso('Escolha o colaborador.', true);
    const dados = { forma_custeio: custeio, adiantamento_id: adtId, data_despesa: d.data_despesa, valor, conta_id: d.conta_id, categoria_outros: contaOutros.includes(d.conta_id) ? d.categoria_outros : null,
                    centro_custo_id: d.centro_custo_id || null, veiculo_id: d.veiculo_id || null, descricao: d.descricao, status: 'aguardando_aprovacao' };
    for (const k of ['fornecedor_nome', 'fornecedor_documento', 'tipo_comprovante', 'numero_documento', 'forma_pagamento', 'cidade']) dados[k] = (d[k] || '').trim() || null;
    dados.uf = (d.uf || '').trim().toUpperCase() || null;
    dados.chave_acesso = (d.chave_acesso || '').replace(/\D/g, '') || null;
    await ocupado(e.submitter, async () => {
      try {
        let id;
        if (r) { await api.alterar('reembolsos', `id=eq.${r.id}`, dados); id = r.id; }
        else {
          const quemDados = await resolverPessoaFin(q, d.quem_nome, listaPes);
          const quemF = quemDados.colaborador_id ? 'colaborador_id=eq.' + quemDados.colaborador_id : quemDados.pessoa_sem_login_id ? 'pessoa_sem_login_id=eq.' + quemDados.pessoa_sem_login_id : 'criado_por=eq.' + estado.usuario.id;
          const dup = await api.listar('reembolsos', `select=numero&status=not.in.(cancelado,reprovado)&valor=eq.${valor}&data_despesa=eq.${d.data_despesa}&${quemF}`).catch(() => []);
          if (dup.length && !await confirmar(`Já existe ${dup.map(x => x.numero).join(', ')} com o mesmo valor (${brl(valor)}), pessoa e data. Lançar outro mesmo assim?`, { botao: 'Lançar outro' })) return;
          const [novo] = await api.inserir('reembolsos', { ...dados, ...quemDados }); id = novo.id; }
        try { await anexar('reembolso', id, d.arquivos); }
        catch (err) { aviso('Lançamento salvo, mas o arquivo não subiu (' + (err.message || err) + '). NÃO lance de novo: anexe o arquivo nesta tela.', true); location.hash = '#/reembolsos/ver/' + id; return; }
        aviso(r ? 'Reembolso reenviado.' : 'Reembolso enviado para aprovação.');
        location.hash = adtId ? '#/adiantamentos/ver/' + adtId : '#/reembolsos/ver/' + id;
      } catch (err) { falha(err); }
    });
  };
}
rota('/reembolsos/novo', tela => formReembolso(tela));
rota('/reembolsos/editar/:id', async (tela, id) => formReembolso(tela, await api.um('reembolsos', `id=eq.${id}`)));

// ---------- Detalhe ----------
rota('/reembolsos/ver/:id', async (tela, id) => {
  const r = await api.um('reembolsos', `${SELECT_REEMB}&id=eq.${id}`);
  if (!r) { tela.innerHTML = '<div class="cartao vazio">Reembolso não encontrado ou sem acesso.</div>'; return; }
  const [aprov, hist] = await Promise.all([
    api.listar('aprovacoes', `entidade=eq.reembolso&entidade_id=eq.${id}&order=solicitado_em`).catch(() => []),
    htmlAnexos('reembolso', id)]);
  const nomes = porId(await usuarios());
  const dono = r.colaborador_id === estado.usuario.id;
  tela.innerHTML = `
    <div class="topo"><div><h1>${{ fundo_fixo: 'Despesa do Fundo Fixo', adiantamento: 'Despesa da prestação de contas' }[r.forma_custeio] || 'Reembolso'} ${esc(r.numero)}</h1><p class="sub">${tag(r.status)} · lançado em ${dataHoraBR(r.criado_em)}${r.origem === 'legado_claude' ? ' · <span class="tag">Sistema anterior</span>' : ''}${r.acerto_adiantamento_id ? ` · <a href="#/adiantamentos/ver/${r.acerto_adiantamento_id}">saldo do acerto de adiantamento</a>` : ''}</p></div>
      <div class="acoes">
        ${dono && ['devolvido', 'aguardando_aprovacao'].includes(r.status) ? `<a class="btn" href="#/reembolsos/editar/${r.id}">Corrigir</a>` : ''}
        ${editaFin() && custeioMutavel(r) ? '<button class="btn" id="custeio">Alterar forma de custeio</button>' : ''}
        ${editaFin() && r.status === 'cancelado' ? '<button class="btn" id="reativar">Reativar lançamento</button>' : ''}
        ${editaFin() && r.titulo_id && ['pago', 'em_pagamento'].includes(r.status) ? `<a class="btn" href="#/financeiro/pagar/ver/${r.titulo_id}" title="Para estornar ou cancelar o pagamento">Ver pagamento</a>` : ''}
        ${(dono && ['devolvido', 'aguardando_aprovacao', 'rascunho'].includes(r.status)) || (editaFin() && !['pago', 'em_pagamento', 'cancelado'].includes(r.status)) ? '<button class="btn perigo" id="cancelar">Cancelar lançamento</button>' : ''}
        <button class="btn" onclick="history.back()">Voltar</button></div></div>
    <div class="cartao"><div class="form">
      <div><div class="muted">Colaborador</div><b>${esc(nomeColab(r))}</b></div>
      <div><div class="muted">Data da despesa</div><b>${dataBR(r.data_despesa)}</b></div>
      <div><div class="muted">Valor</div><b>${brl(r.valor)}</b></div>
      <div><div class="muted">Categoria</div><b>${esc(categoriaTxt(r))}</b></div>
      <div><div class="muted">Centro de custo</div><b>${esc(r.cc?.nome || '—')}</b></div>
      <div><div class="muted">Como foi pago</div><b>${esc(CUSTEIO[r.forma_custeio] || 'Reembolso')}</b>${r.adiantamento_id ? ` · <a href="#/adiantamentos/ver/${r.adiantamento_id}">ver adiantamento</a>` : ''}${r.forma_custeio === 'fundo_fixo' ? '<div class="muted">Ao aprovar, sai do saldo do Fundo Fixo</div>' : ''}</div>
      ${[['Estabelecimento', r.fornecedor_nome], ['CNPJ / CPF', r.fornecedor_documento], ['Comprovante', [r.tipo_comprovante, r.numero_documento && 'nº ' + r.numero_documento].filter(Boolean).join(' · ')],
         ['Forma de pagamento', r.forma_pagamento], ['Cidade', [r.cidade, r.uf].filter(Boolean).join(' / ')], ['Placa', r.placa], ['Rota', r.rota]]
        .filter(([, v]) => v).map(([k, v]) => `<div><div class="muted">${k}</div>${esc(v)}</div>`).join('')}
      ${r.chave_acesso ? `<div class="largo"><div class="muted">Chave de acesso</div><span class="mono">${esc(r.chave_acesso)}</span></div>` : ''}
      <div class="largo"><div class="muted">Descrição</div>${esc(r.descricao || '—')}</div>
      ${blocoObservacao(r.observacoes, editaFin())}
      <div class="largo"><div class="muted">Comprovantes</div>${hist}</div>
      ${['aguardando_aprovacao', 'devolvido'].includes(r.status) ? `<label class="campo largo">Incluir mais comprovantes<input type="file" id="mais" accept="image/*,application/pdf" multiple></label>` : ''}
    </div></div>
    <div class="cartao"><h2>Histórico</h2><ul class="lista-simples">
      <li><span>Lançado</span><span class="muted">${dataHoraBR(r.criado_em)}</span></li>
      ${aprov.map(a => `<li><span>${a.decisao === 'pendente' ? 'Aguardando ' + esc(aguardandoTxt(a, nomes)) : `${tag(a.decisao)} por ${esc(nomes[a.aprovador_id]?.nome || '—')}${a.comentario ? ' — “' + esc(a.comentario) + '”' : ''}`}</span>
        <span class="muted">${dataHoraBR(a.decidido_em || a.solicitado_em)}</span></li>`).join('')}
    </ul></div>`;
  ligarObservacao('reembolsos', id, r.observacoes);
  $('#mais')?.addEventListener('change', async e => {
    try { await anexar('reembolso', id, [...e.target.files]); aviso('Comprovante incluído.'); navegar(); } catch (err) { falha(err); }
  });
  $('#reativar')?.addEventListener('click', async () => {
    try { if (await modalReativar([r])) navegar(); } catch (err) { falha(err); }
  });
  $('#custeio')?.addEventListener('click', async () => {
    try { const ok = await modalCusteio([r]); if (ok) navegar(); } catch (err) { falha(err); }
  });
  $('#cancelar')?.addEventListener('click', async () => {
    const motivo = await confirmar('Cancelar este reembolso?', { comMotivo: true, botao: 'Cancelar lançamento' });
    if (!motivo) return;
    try { await api.alterar('reembolsos', `id=eq.${id}`, { status: 'cancelado', cancelado_em: new Date().toISOString(), cancelado_por: estado.usuario.id, motivo_cancelamento: motivo });
          aviso('Reembolso cancelado.'); history.back(); } catch (err) { falha(err); }
  });
});

// ---------- Gestão (Financeiro) ----------
rota('/financeiro/reembolsos', async tela => {
  const sts = pLista('status', 'todos'), st = sts.length === 1 ? sts[0] : 'varios';
  const mapaF = { abertos: 'status=in.(aguardando_aprovacao,aprovado,em_pagamento,devolvido)', aprovado: 'status=eq.aprovado&forma_custeio=eq.reembolso',
                     pago: 'status=eq.pago', todos: 'status=neq.cancelado', cancelados: 'status=eq.cancelado' };
  const filtroSt = filtroOu(sts.map(s => mapaF[s] ?? mapaF.todos)) || mapaF.todos;
  const ini = estado.params.get('de') || '', fim = estado.params.get('ate') || '';
  const linhas = await api.listar('reembolsos', `${SELECT_REEMB}&${filtroSt}${ini ? '&data_despesa=gte.' + ini : ''}${fim ? '&data_despesa=lte.' + fim : ''}&order=data_despesa.desc,numero.desc&limit=1000`);
  tela.innerHTML = `
    <div class="topo"><div><h1>Despesas e reembolsos</h1><p class="sub">RMB reembolso · DFF despesa do Fundo Fixo · PCA prestação de contas de adiantamento</p></div>
      <div class="acoes">${editaFin() ? (st === 'cancelados' ? '<button class="btn" id="reativar-sel" disabled>Reativar selecionados</button>' : '<button class="btn" id="mudar-custeio" disabled>Alterar forma de custeio</button><button class="btn ok" id="lote" disabled>Gerar pagamento dos selecionados</button>') : ''}
      <a class="btn prim" href="#/reembolsos/novo">+ Lançar</a></div></div>
    <form class="filtros" id="filtros">
      <select name="status">${[['abertos', 'Em andamento'], ['aprovado', 'Aprovados a pagar'], ['pago', 'Pagos'], ['todos', 'Todos'], ['cancelados', 'Cancelados']].map(([v, t]) => `<option value="${v}" ${v === st ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <input type="date" name="de" value="${ini}" aria-label="De"><input type="date" name="ate" value="${fim}" aria-label="Até">
      <button class="btn">Filtrar</button>
    </form>
    <div class="cartao">${tabelaReembolsos(linhas, { comColab: true, selecionar: editaFin() })}</div>`;
  $('#filtros').onsubmit = e => { e.preventDefault(); const d = formDados(e.target);
    location.hash = '#/financeiro/reembolsos?' + new URLSearchParams(Object.entries(d).filter(([, v]) => v)).toString(); };
  ligarLinhas(tela);
  const FILTROS_REEMB = [{ k: 'colab', rotulo: 'Colaborador' }, { k: 'cat', rotulo: 'Categoria' }, { k: 'custeio', rotulo: 'Forma de custeio' }, { k: 'sit', rotulo: 'Situação' }, { k: 'cc', rotulo: 'Centro de custo' }];
  const atualizar = () => {
    const todos = $$('.sel:checked', tela);
    const rs = $('#reativar-sel');
    if (rs) { rs.disabled = !todos.length; rs.textContent = todos.length ? `Reativar selecionados (${todos.length})` : 'Reativar selecionados'; }
    const mc = $('#mudar-custeio');
    if (mc) { mc.disabled = !todos.length; mc.textContent = todos.length ? `Alterar forma de custeio (${todos.length})` : 'Alterar forma de custeio'; }
    const sel = todos.filter(c => c.dataset.lote);
    const pessoas = new Set(sel.map(s => s.dataset.colab));
    const b = $('#lote'); if (!b) return;
    b.disabled = !sel.length || pessoas.size > 1;
    const total = sel.reduce((s, c) => s + Number(linhas.find(l => l.id === c.value).valor), 0);
    b.textContent = pessoas.size > 1 ? 'Selecione um colaborador por vez' : sel.length ? `Gerar pagamento (${sel.length} · ${brl(total)})` : 'Gerar pagamento dos selecionados';
  };
  $$('.sel', tela).forEach(c => (c.onchange = atualizar));
  $('#sel-todos')?.addEventListener('change', e => { $$('.sel', tela).filter(c => !c.closest('tr').hidden).forEach(c => (c.checked = e.target.checked)); atualizar(); });
  filtroLocal(tela, { itens: 'tbody tr[data-id]', antes: '.cartao', campos: FILTROS_REEMB, periodo: true, rotuloPeriodo: 'Data da despesa', aoMudar: () => atualizar() });

  $('#reativar-sel')?.addEventListener('click', async () => {
    const ids = new Set($$('.sel:checked', tela).map(c => c.value));
    try { if (await modalReativar(linhas.filter(l => ids.has(l.id)))) navegar(); } catch (err) { falha(err); }
  });
  $('#mudar-custeio')?.addEventListener('click', async () => {
    const ids = new Set($$('.sel:checked', tela).map(c => c.value));
    try { const ok = await modalCusteio(linhas.filter(l => ids.has(l.id))); if (ok) navegar(); } catch (err) { falha(err); }
  });
  $('#lote')?.addEventListener('click', async () => {
    const ids = $$('.sel:checked', tela).filter(c => c.dataset.lote).map(c => c.value);
    const r = await modal(`<form><h2>Gerar pagamento</h2><p>${ids.length} reembolso(s) viram uma conta a pagar para o colaborador.</p>
      <label class="campo">Data prevista do pagamento<input type="date" name="venc" value="${hojeISO()}" required></label>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Gerar</button></div></form>`);
    if (!r) return;
    try { await api.rpc('gerar_lote_reembolso', { p_reembolsos: ids, p_vencimento: r.venc });
          aviso('Pagamento gerado em Contas a pagar.'); location.hash = '#/financeiro/pagar'; } catch (err) { falha(err); }
  });
});

// ---------- Reativar lançamentos cancelados ----------
async function modalReativar(regs) {
  const total = regs.reduce((x, r) => x + Number(r.valor), 0);
  const r = await modal(`<form><h2>Reativar ${regs.length} lançamento(s) · ${brl(total)}</h2>
    <ul class="lista-simples">${regs.map(x => `<li style="flex-wrap:wrap"><span>${esc(x.numero)} · ${dataBR(x.data_despesa)} · ${esc(nomeColab(x))} · ${esc(descrTxt(x))}</span><b>${brl(x.valor)}</b>
      ${x.motivo_cancelamento ? `<div class="muted" style="flex-basis:100%">Cancelado: ${esc(x.motivo_cancelamento)}</div>` : ''}</li>`).join('')}</ul>
    <div class="aviso-lei"><b>Atenção</b><ul>
      <li><b>Voltar para aprovação</b>: o lançamento volta para a fila de Aprovações, como se não tivesse sido cancelado.</li>
      <li><b>Reembolso já aprovado</b>: entra pronto para gerar o pagamento ao colaborador.</li>
      <li><b>Despesa paga pelo Fundo Fixo</b>: entra aprovada e sai do saldo do Fundo Fixo na data da despesa.</li>
      <li>Se a despesa virou uma conta a pagar (o motivo do cancelamento cita um TIT-), estorne essa conta antes — o sistema bloqueia para não contar duas vezes.</li></ul></div>
    <div class="form">
      <label class="campo largo">Como reativar<select name="custeio"><option value="pendente">Voltar para aprovação (como estava antes de cancelar)</option><option value="reembolso">Reembolso já aprovado, a pagar ao colaborador</option><option value="fundo_fixo">Despesa paga pelo Fundo Fixo (sai do saldo do fundo)</option></select></label>
      <label class="campo largo">Motivo<textarea name="motivo" required placeholder="Ex.: compra paga com o dinheiro do Fundo Fixo"></textarea></label></div>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Reativar</button></div></form>`);
  if (!r) return false;
  const res = await api.rpc('reativar_reembolso', { p_ids: regs.map(x => x.id), p_custeio: r.custeio, p_motivo: r.motivo });
  aviso(`${res.reativados} lançamento(s) reativado(s) · ${brl(res.valor)}${r.custeio === 'fundo_fixo' ? ' saíram do Fundo Fixo' : r.custeio === 'pendente' ? ' de volta em Aprovações' : ' a pagar'}.`);
  return true;
}

// ===================== Aprovações =====================
rota('/aprovacoes', async tela => {
  const pend = await api.listar('aprovacoes', 'decisao=eq.pendente&order=solicitado_em');
  const ids = pend.filter(a => a.entidade === 'reembolso').map(a => a.entidade_id);
  const docs = ids.length ? porId(await api.listar('reembolsos', `${SELECT_REEMB}&id=${lista(ids)}`)) : {};
  const idsA = pend.filter(a => a.entidade === 'adiantamento').map(a => a.entidade_id);
  const adts = idsA.length ? porId(await api.listar('adiantamentos', `select=*,colab:usuarios(nome)&id=${lista(idsA)}`)) : {};
  const meusA = pend.filter(a => a.entidade === 'adiantamento' && adts[a.entidade_id]?.status === 'aguardando_aprovacao' && adts[a.entidade_id].colaborador_id !== estado.usuario.id
                          && souAprovadorDe(a));
  const meus = pend.filter(a => a.entidade === 'reembolso' && docs[a.entidade_id]?.status === 'aguardando_aprovacao' && docs[a.entidade_id].colaborador_id !== estado.usuario.id
                         && souAprovadorDe(a));
  const comp = await cartoesCotacao(pend);
  const auto = estado.usuario.autoaprovacao ? await api.rpc('minhas_autoaprovacoes').catch(() => []) : [];
  const ENT_AUTO = { reembolso: 'Reembolso', cotacao: 'Compra (cotação)', requisicao: 'Requisição', adiantamento: 'Adiantamento', pagamento: 'Pagamento' };
  const blocoAuto = auto.length ? `<div class="cartao auto-aprov"><h2>Meus lançamentos pendentes (${auto.length})</h2>
      <ul class="lista-simples">${auto.map(a => `<li data-auto="${a.id}" style="flex-wrap:wrap;gap:8px"><span><b>${esc(/^DFF/.test(a.numero || '') ? 'Despesa do Fundo Fixo' : /^PCA/.test(a.numero || '') ? 'Prestação de contas' : ENT_AUTO[a.entidade] || a.entidade)} ${esc(a.numero || '')}</b>${a.valor != null ? ' · ' + brl(a.valor) : ''}<br><span class="muted">${esc((a.descricao || '').slice(0, 140))}</span></span>
        <span class="acoes"><a class="btn peq" href="${a.link}">Abrir</a><button class="btn ok peq" data-auto-d="aprovado">Autoaprovar</button><button class="btn peq" data-auto-d="devolvido">Devolver</button><button class="btn perigo peq" data-auto-d="reprovado">Reprovar</button></span></li>`).join('')}</ul></div>` : '';
  const outros = pend.length - meus.length - meusA.length - comp.n;
  tela.innerHTML = `
    <div class="topo"><div><h1>Aprovações</h1><p class="sub">${meus.length + meusA.length + comp.n} item(ns) esperando a sua decisão</p></div>
      ${meus.length ? '<button class="btn ok" id="aprovar-sel" disabled>Aprovar selecionados</button>' : ''}</div>
    ${meus.length + meusA.length + comp.n > 1 ? '<label class="check" id="sel-vis-wrap" style="margin-bottom:10px"><input type="checkbox" id="sel-vis"> Selecionar todos os itens exibidos</label>' : ''}
    ${meus.length ? meus.map(a => { const r = docs[a.entidade_id]; return `
      <div class="cartao" data-ap="${a.id}"${fAttr('tipo', { reembolso: 'Reembolso', fundo_fixo: 'Despesa do Fundo Fixo', adiantamento: 'Prestação de contas' }[r.forma_custeio || 'reembolso'])}${fAttr('colab', nomeColab(r))}${fAttr('cat', r.conta?.nome || r.categoria)}${fAttr('cc', r.cc?.nome)}${fAttr('data', r.data_despesa)}${fAttr('valor', r.valor)}${fAttr('busca', [r.numero, nomeColab(r), r.fornecedor_nome, r.descricao, r.categoria, r.observacoes].filter(Boolean).join(' '))}>
        <div class="topo" style="margin-bottom:8px"><label class="check"><input type="checkbox" class="sel-ap" value="${a.id}">
          <span><b>${{ fundo_fixo: 'Despesa paga pelo Fundo Fixo', adiantamento: 'Prestação de contas' }[r.forma_custeio] || 'Reembolso'} ${esc(r.numero)}</b> · ${r.forma_custeio === 'fundo_fixo' ? 'lançada por ' : r.forma_custeio === 'adiantamento' ? 'de ' : 'para '}${esc(nomeColab(r))}${r.forma_custeio === 'fundo_fixo' ? ' <span class="tag azul">Fundo Fixo</span>' : r.forma_custeio === 'adiantamento' ? ' <span class="tag azul">Adiantamento</span>' : ''}</span></label><b style="font-size:18px">${brl(r.valor)}</b></div>
        <div class="muted">${dataBR(r.data_despesa)} · ${esc(categoriaTxt(r))} · ${esc(r.cc?.nome || '')}</div>
        <p style="margin:8px 0">${esc([r.fornecedor_nome, r.descricao].filter(Boolean).join(' — '))}</p>
        ${r.observacoes ? `<p class="alerta-obs" style="white-space:pre-line">${esc(r.observacoes)}</p>` : ''}
        <div class="anexos-de" data-id="${r.id}"><span class="muted">Carregando comprovantes…</span></div>
        <div class="acoes" style="margin-top:12px"><button class="btn ok peq" data-d="aprovado">Aprovar</button>
          <button class="btn peq" data-d="devolvido">Devolver p/ correção</button><button class="btn perigo peq" data-d="reprovado">Reprovar</button></div>
      </div>`; }).join('') : ''}
    ${blocoAuto}
    ${comp.html}
    ${meusA.map(a => { const x = adts[a.entidade_id]; return `
      <div class="cartao" data-ap="${a.id}"${fAttr('tipo', 'Adiantamento')}${fAttr('colab', x.colab?.nome || x.colaborador_nome)}${fAttr('data', x.data_saida || (x.criado_em || '').slice(0, 10))}${fAttr('valor', x.valor)}${fAttr('busca', [x.numero, x.colab?.nome, x.colaborador_nome, x.motivo].filter(Boolean).join(' '))}>
        <div class="topo" style="margin-bottom:8px"><span><b>Adiantamento ${esc(x.numero)}</b> · ${esc(x.colab?.nome || x.colaborador_nome || '—')}</span><b style="font-size:18px">${brl(x.valor)}</b></div>
        <div class="muted">${x.data_saida ? 'Saída ' + dataBR(x.data_saida) : ''}${x.data_retorno ? ' · retorno ' + dataBR(x.data_retorno) : ''}</div>
        <p style="margin:8px 0">${esc(x.motivo)}</p>
        <div class="acoes" style="margin-top:12px"><button class="btn ok peq" data-d="aprovado">Aprovar</button>
          <button class="btn peq" data-d="devolvido">Devolver p/ correção</button><button class="btn perigo peq" data-d="reprovado">Reprovar</button>
          <a class="btn peq" href="#/adiantamentos/ver/${x.id}">Abrir</a></div>
      </div>`; }).join('')}
    ${!meus.length && !meusA.length && !comp.n && !auto.length ? '<div class="cartao vazio">Nada para aprovar agora. 🎉</div>' : ''}
    ${outros > 0 && veTudo() ? `<p class="muted">${outros} item(ns) aguardam outros aprovadores (ou são lançamentos seus, que sobem para outra pessoa).</p>` : ''}`;
  $$('.anexos-de', tela).forEach(async el => { el.innerHTML = await htmlAnexos('reembolso', el.dataset.id); });
  $$('.cartao[data-ap]', tela).forEach(el => { if (!el.dataset.fTipo) el.dataset.fTipo = 'Compra'; });
  const decidir = async (apId, decisao, comentario = null) => api.rpc('decidir_aprovacao', { p_aprovacao: apId, p_decisao: decisao, p_comentario: comentario });
  $$('[data-d]', tela).forEach(b => b.addEventListener('click', async () => {
    const apId = b.closest('[data-ap]').dataset.ap, d = b.dataset.d;
    let coment = null;
    if (d !== 'aprovado') { coment = await confirmar(d === 'devolvido' ? 'Devolver para correção' : 'Reprovar', { comMotivo: true, botao: d === 'devolvido' ? 'Devolver' : 'Reprovar' }); if (!coment) return; }
    await ocupado(b, async () => { try { await decidir(apId, d, coment); aviso('Decisão registrada.'); navegar(); } catch (err) { falha(err); } });
  }));
  $$('[data-auto-d]', tela).forEach(b => b.addEventListener('click', async () => {
    const apId = b.closest('[data-auto]').dataset.auto, d = b.dataset.autoD;
    const motivo = await confirmar(d === 'aprovado' ? 'Autoaprovar o seu próprio lançamento' : d === 'devolvido' ? 'Devolver para correção' : 'Reprovar', { comMotivo: true, botao: d === 'aprovado' ? 'Autoaprovar' : d === 'devolvido' ? 'Devolver' : 'Reprovar' });
    if (!motivo) return;
    await ocupado(b, async () => { try { await decidir(apId, d, motivo); aviso('Decisão registrada (autoaprovação).'); navegar(); } catch (err) { falha(err); } });
  }));
  const bSel = $('#aprovar-sel');
  const contar = () => { if (!bSel) return; const m = $$('.sel-ap:checked', tela); const n = m.length;
    const v = m.reduce((x, c) => x + Number(c.closest('[data-ap]').dataset.fValor || 0), 0);
    bSel.disabled = !n; bSel.textContent = n ? `Aprovar selecionados (${n} · ${brl(v)})` : 'Aprovar selecionados'; };
  $$('.sel-ap', tela).forEach(c => (c.onchange = contar));
  $('#sel-vis')?.addEventListener('change', e => { $$('.sel-ap', tela).filter(c => !c.closest('[data-ap]').hidden).forEach(c => (c.checked = e.target.checked)); contar(); });
  filtroLocal(tela, { itens: '.cartao[data-ap]', antes: $('#sel-vis-wrap', tela) || $('.cartao[data-ap]', tela),
    campos: [{ k: 'tipo', rotulo: 'Tipo' }, { k: 'colab', rotulo: 'Colaborador' }, { k: 'cat', rotulo: 'Categoria' }, { k: 'cc', rotulo: 'Centro de custo' }],
    periodo: true, rotuloPeriodo: 'Data', aoMudar: () => { const sv = $('#sel-vis'); if (sv) sv.checked = false; contar(); } });
  bSel?.addEventListener('click', async () => {
    await ocupado(bSel, async () => {
      try { for (const c of $$('.sel-ap:checked', tela).filter(c => !c.closest('[data-ap]').hidden)) await decidir(c.value, 'aprovado'); aviso('Itens aprovados.'); navegar(); } catch (err) { falha(err); }
    });
  });
});
