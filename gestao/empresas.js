// Verbo Gestão — CNPJs da empresa (dados usados na emissão de documentos) e responsáveis por setor
'use strict';

const SETORES_EMP = ['Administrativo', 'Almoxarifado', 'CCO', 'Comercial', 'Compras', 'Departamento Pessoal', 'Diretoria', 'Financeiro', 'Manutenção',
  'Operação', 'Patrimônio', 'Qualidade', 'Recursos Humanos', 'SSMA'];
// setores usados na biblioteca de modelos → setor do responsável
const SETOR_MODELO_EMP = { RH: 'Recursos Humanos', DP: 'Departamento Pessoal', Geral: 'Administrativo' };

async function empresasL(forcar = false) {
  if (!forcar && estado.cache._empresas) return estado.cache._empresas;
  const [es, rs] = await Promise.all([api.listar('empresa', 'select=*&ativo=eq.true&order=principal.desc,razao_social'),
    api.listar('empresa_responsaveis', 'select=*&ativo=eq.true&order=setor').catch(() => [])]);
  es.forEach(e => (e.responsaveis = rs.filter(r => r.empresa_id === e.id)));
  return (estado.cache._empresas = es);
}
const empresaEndereco = e => e ? [[e.logradouro, e.numero].filter(Boolean).join(', '), e.complemento, e.bairro, [e.cidade, e.uf].filter(Boolean).join('/'), e.cep && 'CEP ' + fmtCEP(e.cep)].filter(Boolean).join(', ') || e.endereco || '' : '';
const rotEmpresa = e => e ? `${e.razao_social}${e.cnpj ? ' · ' + fmtCNPJ(e.cnpj) : ''}${e.cidade ? ' · ' + e.cidade + (e.uf ? '/' + e.uf : '') : ''}` : '—';
const respDoSetor = (e, setor) => (e?.responsaveis || []).find(r => r.setor === (SETOR_MODELO_EMP[setor] || setor)) || null;

// Janela de emissão: escolhe o CNPJ e mostra o responsável do setor (pode ajustar só para este documento)
async function escolherEmissao({ titulo = 'Emitir documento', setor, empresaId = null, extrasHtml = '', aoAbrirExtra, validarExtra } = {}) {
  const es = await empresasL();
  if (!es.length) { aviso('Cadastre o CNPJ da empresa em Cadastros › Dados da empresa.', true); return null; }
  const inicial = es.find(e => e.id === empresaId) || es[0];
  const r = await modal(`<form><h2>${esc(titulo)}</h2><div class="form">
      <label class="campo largo">CNPJ que emite o documento<select name="empresa" required>${es.map(e => `<option value="${e.id}" ${e.id === inicial.id ? 'selected' : ''}>${esc(rotEmpresa(e))}</option>`).join('')}</select></label>
      <div class="largo muted" id="em-end"></div>
      <label class="campo">Responsável (${esc(SETOR_MODELO_EMP[setor] || setor || 'setor')})<input name="r_nome" required></label>
      <label class="campo">Cargo / setor<input name="r_cargo"></label>
      <label class="campo">CPF<input name="r_cpf" inputmode="numeric"></label>
      <label class="campo">E-mail<input name="r_email" type="email"></label>
      ${extrasHtml}</div>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Gerar PDF</button></div></form>`, {
    aoAbrir: raiz => {
      const f = $('form', raiz);
      const sinc = () => {
        const e = es.find(x => x.id === f.empresa.value); $('#em-end', raiz).textContent = empresaEndereco(e);
        const rp = respDoSetor(e, setor);
        f.r_nome.value = rp?.nome || estado.usuario?.nome || ''; f.r_cargo.value = rp?.cargo || (SETOR_MODELO_EMP[setor] || setor || '');
        f.r_cpf.value = rp?.cpf ? fmtCPF(rp.cpf) : ''; f.r_email.value = rp?.email || (rp ? '' : estado.usuario?.email || '');
      };
      f.empresa.addEventListener('change', sinc); sinc();
      aoAbrirExtra?.(raiz);
    },
    validar: d => validarExtra?.(d) || null });
  if (!r) return null;
  const empresa = es.find(e => e.id === r.empresa);
  return { empresa, resp: { nome: r.r_nome.trim(), cargo: r.r_cargo.trim(), cpf: soDigitos(r.r_cpf), email: r.r_email.trim() }, dados: r };
}

// ---------- Cadastro ----------
rota('/cadastros/empresa', async tela => {
  const es = await empresasL(true), pode = tem('administrador');
  tela.innerHTML = `<div class="topo"><div><h1>Dados da empresa</h1><p class="sub">CNPJs usados na emissão de documentos e responsáveis de cada setor</p></div>
      ${pode ? '<div class="acoes"><a class="btn prim" href="#/cadastros/empresa/nova">+ Novo CNPJ</a></div>' : ''}</div>
    ${es.map(e => `<div class="cartao"><div class="topo" style="margin:0"><div><h2 style="margin:0">${esc(e.razao_social)}${e.principal ? ' <span class="tag azul">Principal</span>' : ''}</h2>
        <p class="sub">${esc([e.cnpj && 'CNPJ ' + fmtCNPJ(e.cnpj), e.nome_fantasia].filter(Boolean).join(' · '))}<br>${esc(empresaEndereco(e))}<br>${esc([e.telefone && fmtTel(e.telefone), e.email, e.site].filter(Boolean).join(' · '))}</p></div>
        ${pode ? `<a class="btn" href="#/cadastros/empresa/editar/${e.id}">Editar</a>` : ''}</div>
      ${e.responsaveis.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Setor</th><th>Responsável</th><th>Cargo</th><th>CPF</th><th>E-mail</th></tr></thead><tbody>
        ${e.responsaveis.map(r => `<tr><td data-r="Setor">${esc(r.setor)}</td><td data-r="Responsável"><b>${esc(r.nome)}</b></td><td data-r="Cargo">${esc(r.cargo || '—')}</td><td data-r="CPF">${r.cpf ? fmtCPF(r.cpf) : '—'}</td><td data-r="E-mail">${esc(r.email || '—')}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="vazio">Nenhum responsável de setor cadastrado.</div>'}</div>`).join('') || '<div class="cartao vazio">Nenhum CNPJ cadastrado.</div>'}`;
});
rota('/cadastros/empresa/nova', tela => formEmpresa(tela));
rota('/cadastros/empresa/editar/:id', async (tela, id) => formEmpresa(tela, (await empresasL(true)).find(e => e.id === id)));

async function formEmpresa(tela, e = null) {
  if (!tem('administrador')) { tela.innerHTML = '<div class="cartao vazio">Somente o administrador altera os dados da empresa.</div>'; return; }
  const cols = await api.listar('colaboradores', 'select=id,nome,cpf,email,email_corporativo,cargo:cargos(nome),setor:setores(nome)&ativo=eq.true&order=nome').catch(() => []);
  const linhaResp = (r = {}) => `<tr class="resp" data-id="${r.id || ''}">
      <td data-r="Setor"><select name="r_setor"><option value="">Selecione…</option>${SETORES_EMP.map(s => `<option ${s === r.setor ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
      <td data-r="Nome completo"><input name="r_nome" list="lst-colab" value="${esc(r.nome || '')}" autocomplete="off"></td>
      <td data-r="CPF"><input name="r_cpf" inputmode="numeric" value="${r.cpf ? fmtCPF(r.cpf) : ''}" style="width:130px"></td>
      <td data-r="E-mail"><input name="r_email" type="email" value="${esc(r.email || '')}"></td>
      <td data-r="Cargo"><input name="r_cargo" value="${esc(r.cargo || '')}"></td>
      <td><button type="button" class="btn peq rem" title="Remover">✕</button></td></tr>`;
  tela.innerHTML = `<div class="topo"><div><h1>${e ? 'Editar CNPJ' : 'Novo CNPJ'}</h1><p class="sub">Digite o CNPJ: os dados da Receita são preenchidos automaticamente</p></div></div>
    <form id="f-emp"><div class="cartao"><div class="form">
      <label class="campo">CNPJ<input name="cnpj" inputmode="numeric" required value="${e?.cnpj ? fmtCNPJ(e.cnpj) : ''}"></label>
      <div class="campo" id="cnpj-st" style="align-self:end"></div>
      <label class="campo largo">Razão social<input name="razao_social" required value="${esc(e?.razao_social || '')}"></label>
      <label class="campo">Nome fantasia<input name="nome_fantasia" value="${esc(e?.nome_fantasia || '')}"></label>
      <label class="campo">Inscrição estadual<input name="inscricao_estadual" value="${esc(e?.inscricao_estadual || '')}"></label>
      <label class="campo">CEP<input name="cep" inputmode="numeric" value="${e?.cep ? fmtCEP(e.cep) : ''}"></label>
      <label class="campo largo">Logradouro<input name="logradouro" value="${esc(e?.logradouro || '')}"></label>
      <label class="campo">Número<input name="numero" value="${esc(e?.numero || '')}"></label>
      <label class="campo">Complemento<input name="complemento" value="${esc(e?.complemento || '')}"></label>
      <label class="campo">Bairro<input name="bairro" value="${esc(e?.bairro || '')}"></label>
      <label class="campo">Cidade<input name="cidade" value="${esc(e?.cidade || '')}"></label>
      <label class="campo">UF<select name="uf"><option value="">—</option>${UFS.map(u => `<option ${u === e?.uf ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
      <label class="campo">Telefone<input name="telefone" value="${e?.telefone ? fmtTel(e.telefone) : ''}"></label>
      <label class="campo">E-mail<input name="email" type="email" value="${esc(e?.email || '')}"></label>
      <label class="campo">Site<input name="site" value="${esc(e?.site || '')}"></label>
      <label class="check largo"><input type="checkbox" name="principal" ${e?.principal ? 'checked' : ''}> CNPJ principal (vem selecionado nos documentos)</label></div></div>
    <div class="cartao"><h2>Responsáveis por setor</h2><p class="muted">Digite o nome completo ou o CPF: se a pessoa estiver no cadastro de funcionários, os dados são preenchidos.</p>
      <datalist id="lst-colab">${cols.map(c => `<option value="${esc(c.nome)}">${esc([c.cargo?.nome, c.setor?.nome].filter(Boolean).join(' · '))}</option>`).join('')}</datalist>
      <div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Setor</th><th>Nome completo</th><th>CPF</th><th>E-mail</th><th>Cargo</th><th></th></tr></thead>
      <tbody id="resps">${(e?.responsaveis?.length ? e.responsaveis : [{}]).map(linhaResp).join('')}</tbody></table></div>
      <button type="button" class="btn peq" id="mais-resp">+ Responsável</button></div>
    <div class="acoes" style="margin-top:12px">${e && !e.principal ? '<button type="button" class="btn perigo" id="desativar">Desativar CNPJ</button>' : ''}
      <a class="btn" href="#/cadastros/empresa">Voltar</a><button class="btn prim">Salvar</button></div></form>`;
  const f = $('#f-emp'), corpo = $('#resps'), removidos = [];
  const set = (n, v) => { if (v && f[n]) f[n].value = v; };
  f.cnpj.addEventListener('input', async () => {
    f.cnpj.value = mascaraDoc(f.cnpj.value); const d = soDigitos(f.cnpj.value), st = $('#cnpj-st');
    if (d.length !== 14) { st.textContent = ''; return; }
    if (!cnpjValido(d)) { st.innerHTML = '<span class="tag vermelho">CNPJ inválido</span>'; return; }
    st.innerHTML = '<span class="muted">Consultando a Receita…</span>';
    try {
      const r = await consultarCNPJ(d);
      set('razao_social', r.razao_social); set('nome_fantasia', r.nome_fantasia); set('cep', r.cep && fmtCEP(r.cep));
      set('logradouro', [r.descricao_tipo_de_logradouro, r.logradouro].filter(Boolean).join(' ')); set('numero', r.numero); set('complemento', r.complemento);
      set('bairro', r.bairro); set('cidade', r.municipio); set('uf', r.uf); set('telefone', r.ddd_telefone_1 && fmtTel(r.ddd_telefone_1)); set('email', r.email && r.email.toLowerCase());
      st.innerHTML = `<span class="tag verde">${esc(r.descricao_situacao_cadastral || 'Encontrado')}</span>`;
    } catch (err) { st.innerHTML = `<span class="tag amarelo">${esc(err.message)}</span>`; }
  });
  const preencher = (tr, c) => { if (!c) return; const q = n => $(`[name=r_${n}]`, tr);
    q('nome').value = c.nome; if (c.cpf) q('cpf').value = fmtCPF(c.cpf); if (!q('email').value) q('email').value = c.email_corporativo || c.email || '';
    if (!q('cargo').value) q('cargo').value = c.cargo?.nome || ''; tr.dataset.colab = c.id; };
  const ligar = () => $$('tr.resp', corpo).forEach(tr => {
    $('.rem', tr).onclick = () => { if (tr.dataset.id) removidos.push(tr.dataset.id); tr.remove(); };
    $('[name=r_nome]', tr).onchange = ev => preencher(tr, cols.find(c => semAcento(c.nome).toLowerCase() === semAcento(ev.target.value.trim()).toLowerCase()));
    $('[name=r_cpf]', tr).oninput = ev => { const d = soDigitos(ev.target.value).slice(0, 11); ev.target.value = d.length === 11 ? fmtCPF(d) : d;
      if (d.length === 11) preencher(tr, cols.find(c => soDigitos(c.cpf) === d)); };
  });
  ligar();
  $('#mais-resp').onclick = () => { corpo.insertAdjacentHTML('beforeend', linhaResp()); ligar(); if (typeof combosEm === 'function') combosEm(corpo); };
  $('#desativar')?.addEventListener('click', async () => {
    if (!(await confirmar('Desativar este CNPJ? Ele deixa de aparecer na emissão de documentos.'))) return;
    try { await api.alterar('empresa', `id=eq.${e.id}`, { ativo: false }); delete estado.cache._empresas; location.hash = '#/cadastros/empresa'; } catch (err) { falha(err); }
  });
  f.onsubmit = async ev => {
    ev.preventDefault();
    const d = formDados(f), cnpj = soDigitos(d.cnpj);
    if (cnpj.length !== 14 || !cnpjValido(cnpj)) return aviso('Informe um CNPJ válido.', true);
    const resps = $$('tr.resp', corpo).map(tr => ({ id: tr.dataset.id || null, colaborador_id: tr.dataset.colab || null,
      setor: $('[name=r_setor]', tr).value, nome: $('[name=r_nome]', tr).value.trim(), cpf: soDigitos($('[name=r_cpf]', tr).value) || null,
      email: $('[name=r_email]', tr).value.trim() || null, cargo: $('[name=r_cargo]', tr).value.trim() || null })).filter(r => r.nome || r.setor);
    const falta = resps.find(r => !r.setor || !r.nome);
    if (falta) return aviso('Cada responsável precisa de setor e nome completo.', true);
    const dados = { cnpj, razao_social: d.razao_social.trim(), nome_fantasia: d.nome_fantasia || null, inscricao_estadual: d.inscricao_estadual || null,
      cep: soDigitos(d.cep) || null, logradouro: d.logradouro || null, numero: d.numero || null, complemento: d.complemento || null, bairro: d.bairro || null,
      cidade: d.cidade || null, uf: d.uf || null, telefone: soDigitos(d.telefone) || null, email: d.email || null, site: d.site || null, principal: !!d.principal };
    dados.endereco = empresaEndereco(dados) || null;
    try {
      if (dados.principal) await api.alterar('empresa', `principal=eq.true${e ? '&id=neq.' + e.id : ''}`, { principal: false });
      const id = e ? (await api.alterar('empresa', `id=eq.${e.id}`, dados), e.id) : (await api.inserir('empresa', dados))[0].id;
      for (const x of removidos) await api.alterar('empresa_responsaveis', `id=eq.${x}`, { ativo: false });
      for (const r of resps) { const { id: rid, ...v } = r; if (rid) await api.alterar('empresa_responsaveis', `id=eq.${rid}`, v); else await api.inserir('empresa_responsaveis', { ...v, empresa_id: id }); }
      delete estado.cache._empresas; delete estado.cache.empresa; aviso('Dados da empresa salvos.'); location.hash = '#/cadastros/empresa';
    } catch (err) { falha(err); }
  };
}
