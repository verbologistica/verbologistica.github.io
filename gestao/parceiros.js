// Verbo Gestão — Fornecedores e Clientes (CNPJ/CPF com busca automática, endereço, dados bancários, boleto e prazo)
'use strict';

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const CATEG_FORN = ['Posto de combustível', 'Oficina / mecânica', 'Peças', 'Pneus', 'Borracharia', 'Loja / material', 'Prestador de serviço', 'Transportadora / agregado',
  'Aluguel / imóvel', 'Locação de equipamentos', 'Concessionária (energia, água, internet)', 'Hotel / alimentação', 'EPI / segurança', 'Contabilidade / jurídico', 'Outro'];
const CATEG_CLI = ['Indústria', 'Agronegócio / florestal', 'Comércio', 'Transportadora', 'Pessoa física', 'Outro'];
const TIPOS_PIX = ['CNPJ', 'CPF', 'E-mail', 'Telefone', 'Chave aleatória'];
const PARC = {
  fornecedores: { titulo: 'Fornecedores', um: 'fornecedor', nome: 'razao_social', categorias: CATEG_FORN, boleto: 'Emite boleto',
    edita: () => tem('administrador', 'financeiro', 'comprador') },
  clientes: { titulo: 'Clientes', um: 'cliente', nome: 'nome', categorias: CATEG_CLI, boleto: 'Cobrança por boleto (a empresa emite)',
    edita: () => tem('administrador', 'financeiro', 'operacao') },
};

function cnpjValido(c) {
  c = soDigitos(c);
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const dv = n => { const w = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const r = w.reduce((s, p, i) => s + Number(c[i]) * p, 0) % 11; return r < 2 ? 0 : 11 - r; };
  return dv(12) === Number(c[12]) && dv(13) === Number(c[13]);
}
const fmtCNPJ = c => { c = soDigitos(c); return c.length === 14 ? `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}` : c; };
const fmtDoc = d => { d = soDigitos(d); return d.length === 14 ? fmtCNPJ(d) : d.length === 11 ? fmtCPF(d) : d; };
const fmtCEP = c => { c = soDigitos(c); return c.length === 8 ? `${c.slice(0, 5)}-${c.slice(5)}` : c; };
function mascaraDoc(v) {
  const d = soDigitos(v).slice(0, 14);
  if (d.length <= 11) return d.length > 9 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : d.length > 6 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}` : d.length > 3 ? `${d.slice(0, 3)}.${d.slice(3)}` : d;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}${d.length > 12 ? '-' + d.slice(12) : ''}`;
}

// Consulta pública da Receita (BrasilAPI) e dos Correios (ViaCEP)
async function consultarCNPJ(cnpj) {
  const r = await fetch('https://brasilapi.com.br/api/cnpj/v1/' + soDigitos(cnpj));
  if (r.status === 404) throw new Error('CNPJ não encontrado na Receita.');
  if (!r.ok) throw new Error('A consulta da Receita não respondeu agora. Preencha manualmente ou tente de novo.');
  return r.json();
}
async function consultarCEP(cep) {
  const r = await fetch(`https://viacep.com.br/ws/${soDigitos(cep)}/json/`);
  const j = await r.json();
  if (j.erro) throw new Error('CEP não encontrado.');
  return j;
}
let _bancos = null;
async function listaBancos() {
  if (_bancos) return _bancos;
  try { _bancos = (await fetch('https://brasilapi.com.br/api/banks/v1').then(r => r.json())).filter(b => b.code).sort((a, b) => a.code - b.code); }
  catch { _bancos = []; }
  return _bancos;
}
const nomeBanco = (cod, bancos) => { const b = (bancos || _bancos || []).find(x => String(x.code) === String(cod).replace(/^0+/, '')); return b ? `${String(b.code).padStart(3, '0')} · ${b.name}` : cod; };

// Texto dos dados para pagamento (usado na conta a pagar)
function dadosPagamento(p) {
  if (!p) return '';
  const contas = Array.isArray(p.dados_bancarios) ? p.dados_bancarios : [];
  const c = contas.find(x => x.principal) || contas[0];
  const linhas = [];
  if (p.boleto) linhas.push('Emite boleto');
  if (c?.pix_chave) linhas.push(`Pix (${c.pix_tipo || 'chave'}): ${c.pix_chave}`);
  if (c?.banco || c?.conta) linhas.push([c.banco && nomeBanco(c.banco), c.agencia && `Ag. ${c.agencia}`, c.conta && `${c.tipo_conta || 'Conta'} ${c.conta}`, c.titular && `Titular: ${c.titular}`].filter(Boolean).join(' · '));
  if (!linhas.length && p.chave_pix) linhas.push('Pix: ' + p.chave_pix);
  return linhas.join('\n');
}

// ---------- Lista ----------
function rotasParceiros(tabela) {
  const P = PARC[tabela];
  rota('/cadastros/' + tabela, async tela => {
    const inativos = estado.params.get('inativos') === '1';
    const busca = (estado.params.get('q') || '').toLowerCase();
    let ls = await api.listar(tabela, `select=*&order=${P.nome}${inativos ? '' : '&ativo=eq.true'}`);
    if (busca) ls = ls.filter(x => [x[P.nome], x.nome_fantasia, x.cidade, (x.categorias || []).join(' ')].join(' ').toLowerCase().includes(busca)
                                   || (soDigitos(busca) && (x.documento || '').includes(soDigitos(busca))));
    tela.innerHTML = `
      <div class="topo"><div><h1>${P.titulo}</h1><p class="sub">${ls.length} cadastro(s)</p></div>
        <div class="acoes"><a class="btn" href="#/cadastros/${tabela}${inativos ? '' : '?inativos=1'}">${inativos ? 'Ocultar inativos' : 'Mostrar inativos'}</a>
        ${P.edita() ? `<a class="btn prim" href="#/cadastros/${tabela}/novo">+ Novo ${P.um}</a>` : ''}</div></div>
      <form class="filtros" id="filtros"><input name="q" value="${esc(estado.params.get('q') || '')}" placeholder="Buscar por nome, CNPJ/CPF, cidade ou categoria" style="min-width:280px"><button class="btn">Buscar</button></form>
      <div class="cartao">${ls.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Razão social / nome</th><th>CNPJ / CPF</th><th>Cidade</th><th>Pagamento</th><th></th></tr></thead><tbody>
        ${ls.map(x => `<tr class="clicavel" onclick="location.hash='#/cadastros/${tabela}/ver/${x.id}'">
          <td data-r="Nome"><b>${esc(x[P.nome])}</b>${x.nome_fantasia ? `<div class="muted">${esc(x.nome_fantasia)}</div>` : ''}${(x.categorias || []).length ? `<div class="muted">${esc(x.categorias.join(', '))}</div>` : ''}</td>
          <td data-r="CNPJ / CPF" class="nowrap">${esc(fmtDoc(x.documento) || '—')}</td>
          <td data-r="Cidade">${esc([x.cidade, x.uf].filter(Boolean).join('/') || '—')}</td>
          <td data-r="Pagamento">${x.boleto ? '<span class="tag azul">Boleto</span> ' : ''}${x.prazo_faturamento_dias != null ? `${x.prazo_faturamento_dias} dias` : ''}${(x.dados_bancarios || []).some(c => c.pix_chave) ? ' <span class="tag">Pix</span>' : ''}</td>
          <td>${x.ativo ? '' : '<span class="tag">Inativo</span>'}${x.situacao_cadastral && x.situacao_cadastral !== 'ATIVA' ? ` <span class="tag vermelho">${esc(x.situacao_cadastral)}</span>` : ''}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="vazio">Nenhum cadastro encontrado.</div>'}</div>`;
    $('#filtros').onsubmit = e => { e.preventDefault(); const q = formDados(e.target).q;
      location.hash = `#/cadastros/${tabela}?${new URLSearchParams({ ...(q ? { q } : {}), ...(inativos ? { inativos: 1 } : {}) })}`; };
  });

  // ---------- Detalhe ----------
  rota(`/cadastros/${tabela}/ver/:id`, async (tela, id) => {
    const x = await api.um(tabela, `id=eq.${id}&select=*`);
    if (!x) { tela.innerHTML = '<div class="cartao vazio">Cadastro não encontrado.</div>'; return; }
    const bancos = await listaBancos();
    const cbs = x.dados_bancarios || [];
    const conta = x.conta_padrao_id ? (await contas()).find(c => c.id === x.conta_padrao_id) : null;
    const end = [x.logradouro, x.numero, x.complemento, x.bairro, [x.cidade, x.uf].filter(Boolean).join('/'), x.cep && 'CEP ' + fmtCEP(x.cep)].filter(Boolean).join(', ');
    tela.innerHTML = `
      <div class="topo"><div><h1>${esc(x[P.nome])}</h1><p class="sub">${esc(x.nome_fantasia || '')}${x.nome_fantasia ? ' · ' : ''}${esc(fmtDoc(x.documento) || 'sem CNPJ/CPF')}${x.ativo ? '' : ' · <span class="tag">Inativo</span>'}</p></div>
        <div class="acoes">${P.edita() ? `<a class="btn prim" href="#/cadastros/${tabela}/editar/${id}">Editar</a>` : ''}<a class="btn" href="#/cadastros/${tabela}">Voltar</a></div></div>
      ${x.situacao_cadastral && x.situacao_cadastral !== 'ATIVA' ? `<div class="cartao alerta-obs"><b>Situação na Receita: ${esc(x.situacao_cadastral)}</b> — confira antes de comprar ou pagar.</div>` : ''}
      <div class="cartao"><h2>Dados cadastrais</h2><div class="form">
        <div><div class="muted">Tipo</div><b>${x.tipo_pessoa === 'PF' ? 'Pessoa física (CPF)' : x.tipo_pessoa === 'PJ' ? 'Empresa (CNPJ)' : '—'}</b></div>
        <div><div class="muted">Inscrição estadual</div><b>${esc(x.inscricao_estadual || '—')}</b></div>
        <div><div class="muted">Contato</div><b>${esc(x.contato || '—')}</b></div>
        <div><div class="muted">Telefone</div><b>${esc([x.telefone, x.telefone2].filter(Boolean).map(fmtTel).join(' · ') || '—')}</b></div>
        <div><div class="muted">E-mail</div><b>${esc(x.email || '—')}</b></div>
        <div><div class="muted">Categorias</div><b>${esc((x.categorias || []).join(', ') || '—')}</b></div>
        <div class="largo"><div class="muted">Endereço</div><b>${esc(end || '—')}</b></div>
        ${x.atividade_principal ? `<div class="largo"><div class="muted">Atividade (Receita)</div>${esc(x.atividade_principal)}${x.consultado_em ? ` <span class="muted">· consultado em ${dataBR(x.consultado_em)}</span>` : ''}</div>` : ''}
      </div></div>
      <div class="cartao"><h2>Pagamento e faturamento</h2><div class="form">
        <div><div class="muted">${esc(P.boleto)}</div><b>${x.boleto ? 'Sim' : 'Não'}</b></div>
        <div><div class="muted">Prazo de faturamento</div><b>${x.prazo_faturamento_dias != null ? x.prazo_faturamento_dias + ' dias' : '—'}</b></div>
        <div><div class="muted">Condição combinada</div><b>${esc(x.condicao_padrao || '—')}</b></div>
        ${tabela === 'fornecedores' ? `<div><div class="muted">Conta padrão do plano</div><b>${esc(conta ? conta.codigo + ' ' + conta.nome : '—')}</b></div>` : ''}
      </div>
      <h2 style="margin-top:16px">Dados bancários</h2>
      ${cbs.length ? `<ul class="lista-simples">${cbs.map(c => `<li style="flex-wrap:wrap"><span>${c.principal ? '<span class="tag verde">Principal</span> ' : ''}<b>${esc(nomeBanco(c.banco, bancos) || '—')}</b>
          ${c.agencia ? ` · Ag. ${esc(c.agencia)}` : ''}${c.conta ? ` · ${esc(c.tipo_conta || 'Conta')} ${esc(c.conta)}` : ''}
          ${c.titular ? `<br><span class="muted">Titular: ${esc(c.titular)}${c.titular_documento ? ' · ' + esc(fmtDoc(c.titular_documento)) : ''}</span>` : ''}</span>
          ${c.pix_chave ? `<span>Pix (${esc(c.pix_tipo || 'chave')}): <b class="mono">${esc(c.pix_chave)}</b></span>` : ''}</li>`).join('')}</ul>` : '<div class="vazio">Nenhuma conta cadastrada.</div>'}
      </div>
      ${x.observacoes ? `<div class="cartao"><h2>Observações</h2><div style="white-space:pre-line">${esc(x.observacoes)}</div></div>` : ''}`;
  });

  rota(`/cadastros/${tabela}/novo`, tela => formParceiro(tela, tabela));
  rota(`/cadastros/${tabela}/editar/:id`, async (tela, id) => formParceiro(tela, tabela, await api.um(tabela, `id=eq.${id}&select=*`)));
}

// ---------- Formulário ----------
async function formParceiro(tela, tabela, x = null) {
  const P = PARC[tabela];
  if (!P.edita()) { tela.innerHTML = '<div class="cartao vazio">Sem permissão para editar.</div>'; return; }
  const bancos = await listaBancos();
  const linhaConta = (c = {}, i = 0) => `<div class="cartao conta-banc" style="margin:8px 0;padding:12px"><div class="form">
      <label class="campo largo">Banco<input name="b_banco" list="lista-bancos" value="${esc(c.banco ? nomeBanco(c.banco, bancos) : '')}" placeholder="Digite o código ou o nome do banco"></label>
      <label class="campo">Agência<input name="b_agencia" value="${esc(c.agencia || '')}"></label>
      <label class="campo">Conta (com dígito)<input name="b_conta" value="${esc(c.conta || '')}"></label>
      <label class="campo">Tipo de conta<select name="b_tipo">${['Corrente', 'Poupança', 'Pagamento'].map(t => `<option ${t === c.tipo_conta ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo">Titular<input name="b_titular" value="${esc(c.titular || '')}" placeholder="Se for diferente do cadastro"></label>
      <label class="campo">CPF/CNPJ do titular<input name="b_titdoc" value="${esc(fmtDoc(c.titular_documento || ''))}"></label>
      <label class="campo">Tipo de chave Pix<select name="b_pixtipo"><option value=""></option>${TIPOS_PIX.map(t => `<option ${t === c.pix_tipo ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo largo">Chave Pix<input name="b_pix" value="${esc(c.pix_chave || '')}"></label>
      <label class="opcao"><input type="radio" name="b_principal" value="${i}" ${c.principal ? 'checked' : ''}> <span>Conta principal</span></label>
      <div style="text-align:right"><button type="button" class="btn peq perigo rem-conta">Remover conta</button></div></div></div>`;
  const contasIni = (x?.dados_bancarios || []).length ? x.dados_bancarios : [{ principal: true }];
  const cats = x?.categorias || [];
  tela.innerHTML = `
    <div class="topo"><div><h1>${x ? 'Editar ' + P.um : 'Novo ' + P.um}</h1><p class="sub">Digite o CNPJ: os dados da Receita são preenchidos sozinhos e você pode alterar o que quiser. Para pessoa física, use o CPF (dados de CPF não são públicos, preencha à mão).</p></div></div>
    <datalist id="lista-bancos">${bancos.map(b => `<option value="${String(b.code).padStart(3, '0')} · ${esc(b.name)}">`).join('')}</datalist>
    <form id="f-parc">
      <div class="cartao"><h2>Identificação</h2><div class="form">
        <label class="campo">CNPJ ou CPF<input name="documento" value="${esc(fmtDoc(x?.documento || ''))}" inputmode="numeric" placeholder="00.000.000/0000-00 ou 000.000.000-00"></label>
        <div class="campo" style="justify-content:flex-end"><button type="button" class="btn" id="buscar-doc">Buscar na Receita</button></div>
        <div class="largo muted" id="doc-msg"></div>
        <label class="campo largo"><span><span id="rot-nome">${x?.tipo_pessoa === 'PF' ? 'Nome completo' : 'Razão social'}</span> *</span><input name="nome" required value="${esc(x?.[P.nome] || '')}"></label>
        <label class="campo largo">Nome fantasia<input name="nome_fantasia" value="${esc(x?.nome_fantasia || '')}"></label>
        <label class="campo">Inscrição estadual<input name="inscricao_estadual" value="${esc(x?.inscricao_estadual || '')}" placeholder="ou ISENTO"></label>
        <label class="campo">Situação na Receita<input name="situacao_cadastral" value="${esc(x?.situacao_cadastral || '')}" readonly></label>
        <div class="largo"><div class="muted" style="margin-bottom:4px">Categorias</div><div class="chips">${P.categorias.map(c => { const extra = c === 'Outro' ? cats.filter(x => !P.categorias.includes(x)) : [];
          return `<label class="chip"><input type="checkbox" name="cat_${esc(c)}" ${cats.includes(c) || extra.length ? 'checked' : ''} ${extra.length ? `data-valor="${esc(extra.join(', '))}"` : ''}> ${esc(c)}</label>`; }).join('')}</div></div>
      </div></div>
      <div class="cartao"><h2>Contato e endereço</h2><div class="form">
        <label class="campo">Pessoa de contato<input name="contato" value="${esc(x?.contato || '')}"></label>
        <label class="campo">E-mail<input name="email" type="email" value="${esc(x?.email || '')}"></label>
        <label class="campo">Telefone<input name="telefone" value="${esc(fmtTel(x?.telefone || ''))}"></label>
        <label class="campo">Telefone 2 / WhatsApp<input name="telefone2" value="${esc(fmtTel(x?.telefone2 || ''))}"></label>
        <label class="campo">CEP<input name="cep" value="${esc(fmtCEP(x?.cep || ''))}" inputmode="numeric"></label>
        <label class="campo largo">Logradouro<input name="logradouro" value="${esc(x?.logradouro || '')}"></label>
        <label class="campo">Número<input name="numero" value="${esc(x?.numero || '')}"></label>
        <label class="campo">Complemento<input name="complemento" value="${esc(x?.complemento || '')}"></label>
        <label class="campo">Bairro<input name="bairro" value="${esc(x?.bairro || '')}"></label>
        <label class="campo">Cidade<input name="cidade" value="${esc(x?.cidade || '')}"></label>
        <label class="campo">UF<select name="uf"><option value=""></option>${UFS.map(u => `<option ${u === x?.uf ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
      </div></div>
      <div class="cartao"><h2>Pagamento e faturamento</h2><div class="form">
        <label class="check largo"><input type="checkbox" name="boleto" ${x?.boleto ? 'checked' : ''}> ${esc(P.boleto)}</label>
        <label class="campo">Prazo de faturamento (dias)<input name="prazo" type="number" min="0" max="365" value="${x?.prazo_faturamento_dias ?? ''}" placeholder="Ex.: 28"></label>
        <label class="campo">Condição combinada<input name="condicao_padrao" value="${esc(x?.condicao_padrao || '')}" placeholder="Ex.: quinzenal, fechamento dia 15"></label>
        ${tabela === 'fornecedores' ? `<label class="campo largo">Conta padrão do plano de contas<select name="conta_padrao_id">${await opcoesContas(x?.conta_padrao_id)}</select></label>` : ''}
      </div>
      <h2 style="margin-top:16px">Dados bancários</h2><div id="contas">${contasIni.map(linhaConta).join('')}</div>
      <button type="button" class="btn peq" id="mais-conta">+ Adicionar conta</button></div>
      <div class="cartao"><h2>Observações</h2><textarea name="observacoes" rows="3" style="width:100%">${esc(x?.observacoes || '')}</textarea></div>
      <div class="acoes"><button class="btn prim" value="salvar">Salvar</button>
        ${x ? `<button class="btn ${x.ativo ? 'perigo' : ''}" value="${x.ativo ? 'desativar' : 'ativar'}">${x.ativo ? 'Desativar' : 'Reativar'}</button>` : ''}
        <a class="btn" href="javascript:history.back()">Cancelar</a></div>
    </form>`;
  const f = $('#f-parc');
  let receita = null;
  const msg = (t, erro) => { $('#doc-msg').className = 'largo ' + (erro ? 'erro-txt' : 'muted'); $('#doc-msg').textContent = t; };
  const ligarContas = () => $$('.rem-conta', f).forEach(b => (b.onclick = () => { b.closest('.conta-banc').remove(); renumerar(); }));
  const renumerar = () => $$('[name=b_principal]', f).forEach((r, i) => (r.value = i));
  $('#mais-conta').onclick = () => { $('#contas').insertAdjacentHTML('beforeend', linhaConta({}, $$('.conta-banc', f).length)); ligarContas(); };
  ligarContas();
  f.documento.addEventListener('input', e => { e.target.value = mascaraDoc(e.target.value); const d = soDigitos(e.target.value);
    $('#rot-nome').textContent = d.length === 11 ? 'Nome completo' : 'Razão social';
    if (d.length === 14 && cnpjValido(d) && !x) buscar(); });
  ['telefone', 'telefone2'].forEach(n => f[n].addEventListener('input', e => { const d = soDigitos(e.target.value).slice(0, 11); e.target.value = d.length > 9 ? fmtTel(d) : d; }));
  f.cep.addEventListener('input', async e => { const d = soDigitos(e.target.value).slice(0, 8); e.target.value = fmtCEP(d);
    if (d.length === 8 && !f.logradouro.value) try { const c = await consultarCEP(d); f.logradouro.value = c.logradouro || ''; f.bairro.value = c.bairro || ''; f.cidade.value = c.localidade || ''; f.uf.value = c.uf || ''; f.numero.focus(); } catch {} });
  const buscar = async () => {
    const d = soDigitos(f.documento.value);
    if (d.length === 11) { msg(cpfValido(d) ? 'CPF válido. Os dados de pessoa física não são públicos: preencha os campos abaixo.' : 'CPF inválido: confira os números.', !cpfValido(d)); return; }
    if (d.length !== 14 || !cnpjValido(d)) { msg('CNPJ inválido: confira os números.', true); return; }
    msg('Consultando a Receita…');
    try {
      receita = await consultarCNPJ(d);
      const r = receita, set = (n, v) => { if (v && f[n]) f[n].value = v; };
      set('nome', r.razao_social); set('nome_fantasia', r.nome_fantasia);
      set('email', (r.email || '').toLowerCase()); set('telefone', fmtTel(r.ddd_telefone_1)); set('telefone2', fmtTel(r.ddd_telefone_2));
      set('cep', fmtCEP(r.cep)); set('logradouro', [r.descricao_tipo_de_logradouro, r.logradouro].filter(Boolean).join(' ')); set('numero', r.numero);
      set('complemento', r.complemento); set('bairro', r.bairro); set('cidade', r.municipio); set('uf', r.uf);
      f.situacao_cadastral.value = r.descricao_situacao_cadastral || '';
      msg(`Dados da Receita preenchidos (${r.descricao_situacao_cadastral || 'situação não informada'}${r.cnae_fiscal_descricao ? ' · ' + r.cnae_fiscal_descricao : ''}). Confira e altere se precisar.`,
          r.descricao_situacao_cadastral && r.descricao_situacao_cadastral !== 'ATIVA');
    } catch (err) { msg(err.message, true); }
  };
  $('#buscar-doc').onclick = buscar;

  f.onsubmit = async e => {
    e.preventDefault();
    const d = formDados(f), acao = e.submitter?.value || 'salvar';
    const doc = soDigitos(d.documento);
    if (doc && !(doc.length === 11 ? cpfValido(doc) : doc.length === 14 ? cnpjValido(doc) : false)) return aviso('CNPJ/CPF inválido: confira os números.', true);
    const principal = Number($('[name=b_principal]:checked', f)?.value ?? 0);
    const contasBanc = $$('.conta-banc', f).map((el, i) => {
      const v = n => $(`[name=${n}]`, el).value.trim();
      const banco = v('b_banco').match(/^\d{1,3}/)?.[0] || v('b_banco');
      return { banco: banco || null, agencia: v('b_agencia') || null, conta: v('b_conta') || null, tipo_conta: v('b_tipo'), titular: v('b_titular') || null,
               titular_documento: soDigitos(v('b_titdoc')) || null, pix_tipo: v('b_pixtipo') || null, pix_chave: v('b_pix') || null, principal: i === principal };
    }).filter(c => c.banco || c.conta || c.pix_chave);
    if (contasBanc.length && !contasBanc.some(c => c.principal)) contasBanc[0].principal = true;
    const dados = {
      [P.nome]: d.nome, nome_fantasia: d.nome_fantasia || null, documento: doc || null, inscricao_estadual: d.inscricao_estadual || null,
      contato: d.contato || null, email: d.email || null, telefone: soDigitos(d.telefone) || null, telefone2: soDigitos(d.telefone2) || null,
      cep: soDigitos(d.cep) || null, logradouro: d.logradouro || null, numero: d.numero || null, complemento: d.complemento || null, bairro: d.bairro || null,
      cidade: d.cidade || null, uf: d.uf || null, situacao_cadastral: d.situacao_cadastral || null,
      categorias: P.categorias.filter(c => d['cat_' + c]).map(c => c === 'Outro' && d.cat_Outro_outro ? d.cat_Outro_outro : c), boleto: !!d.boleto, prazo_faturamento_dias: d.prazo === '' ? null : Number(d.prazo),
      condicao_padrao: d.condicao_padrao || null, dados_bancarios: contasBanc, observacoes: d.observacoes || null,
    };
    if (receita) Object.assign(dados, { atividade_principal: receita.cnae_fiscal_descricao || null, dados_receita: receita, consultado_em: new Date().toISOString() });
    if (tabela === 'fornecedores') {
      const pc = contasBanc.find(c => c.principal) || {};
      Object.assign(dados, { conta_padrao_id: d.conta_padrao_id || null, chave_pix: pc.pix_chave || null, banco: pc.banco || null, agencia: pc.agencia || null, conta: pc.conta || null,
                             categoria: dados.categorias[0] || null });
    }
    if (acao === 'desativar' || acao === 'ativar') dados.ativo = acao === 'ativar';
    await ocupado(e.submitter, async () => {
      try {
        let id = x?.id;
        if (x) await api.alterar(tabela, `id=eq.${id}`, dados); else [{ id }] = await api.inserir(tabela, dados);
        delete estado.cache[tabela]; aviso('Cadastro salvo.'); location.hash = `#/cadastros/${tabela}/ver/${id}`;
      } catch (err) { falha(/duplicate|unique/i.test(err.message) ? new Error('Já existe um cadastro com esse CNPJ/CPF.') : err); }
    });
  };
}

rotasParceiros('fornecedores');
rotasParceiros('clientes');
