// Verbo Gestão — RH: painel, colaboradores, documentos com vencimento, dependentes e admissão
'use strict';

const editaRH = () => tem('administrador', 'rh', 'dp');
const STATUS_COLAB = { candidato: ['Candidato', ''], em_admissao: ['Em admissão', 'amarelo'], ativo: ['Ativo', 'verde'], ferias: ['Férias', 'azul'],
  afastado: ['Afastado', 'amarelo'], aviso_previo: ['Aviso prévio', 'vermelho'], desligado: ['Desligado', ''] };
const TIPOS_CONTRATO = { clt: 'CLT', experiencia: 'Experiência', temporario: 'Temporário', intermitente: 'Intermitente', aprendiz: 'Aprendiz', estagio: 'Estágio', pj: 'PJ', autonomo: 'Autônomo', agregado: 'Agregado' };
const CATEG_DOC_RH = { identificacao: 'Identificação', trabalhista: 'Trabalhista', pessoal: 'Pessoal', habilitacao: 'Habilitação', saude: 'Saúde', curso: 'Cursos e treinamentos', contrato: 'Contratos', outro: 'Outros' };
const tagColab = s => `<span class="tag ${STATUS_COLAB[s]?.[1] || ''}">${STATUS_COLAB[s]?.[0] || s}</span>`;
const idade = d => { if (!d) return null; const n = new Date(d + 'T12:00:00'), h = new Date(); let a = h.getFullYear() - n.getFullYear(); if (h < new Date(h.getFullYear(), n.getMonth(), n.getDate())) a--; return a; };
const setoresL = f => cad('setores', 'select=id,nome,sigla,ativo&order=nome', f);
const cargosL = f => cad('cargos', 'select=id,nome,cbo,setor_id,motorista,cnh_minima,experiencia_dias,proximo_cargo_id,requisitos_promocao,ativo&order=nome', f);
const tiposDocRH = f => cad('rh_tipos_documento', 'select=*&order=ordem,nome', f);
const exigidoPara = (t, motorista) => t.exigido_admissao === 'todos' || (t.exigido_admissao === 'motoristas' && motorista);

// ---------- Painel do RH ----------
rota('/rh', async tela => {
  const [cs, docs, adms, ss] = await Promise.all([
    api.listar('colaboradores', 'select=id,nome,status,setor_id,cargo_id,data_nascimento,data_admissao,tipo_contrato,experiencia_fim1,experiencia_fim2,data_desligamento&ativo=eq.true'),
    api.listar('v_docs_colaborador_vencimento', 'faixa=in.(vencido,vence_30)&order=vencimento').catch(() => []),
    api.listar('admissoes', 'select=*,colab:colaboradores(nome)&status=eq.em_andamento&order=data_prevista').catch(() => []),
    setoresL()]);
  const ativos = cs.filter(c => ['ativo', 'ferias', 'afastado', 'aviso_previo'].includes(c.status));
  const mes = hojeISO().slice(5, 7), ano = hojeISO().slice(0, 4);
  const aniv = ativos.filter(c => c.data_nascimento?.slice(5, 7) === mes).sort((a, b) => a.data_nascimento.slice(8) - b.data_nascimento.slice(8));
  const em = d => d && d >= hojeISO() && d <= somaDias(hojeISO(), 15);
  const exp = ativos.filter(c => ['clt', 'experiencia'].includes(c.tipo_contrato) && (em(c.experiencia_fim1) || em(c.experiencia_fim2)));
  const admMes = cs.filter(c => c.data_admissao?.startsWith(ano + '-' + mes)).length, deslMes = cs.filter(c => c.data_desligamento?.startsWith(ano + '-' + mes)).length;
  const porSetor = {}; ativos.forEach(c => (porSetor[c.setor_id || '-'] = (porSetor[c.setor_id || '-'] || 0) + 1));
  const turnover = ativos.length ? ((admMes + deslMes) / 2 / ativos.length * 100).toFixed(1) : '0.0';
  tela.innerHTML = `
    <div class="topo"><div><h1>Recursos Humanos</h1><p class="sub">Quadro de pessoal, admissões, documentos e prazos</p></div>
      <div class="acoes">${editaRH() ? '<a class="btn prim" href="#/rh/colaboradores/novo">+ Colaborador</a>' : ''}<a class="btn" href="#/modelos?setor=RH">Modelos do RH</a></div></div>
    <div class="grade" style="margin-bottom:16px">
      <a class="cartao kpi" href="#/rh/colaboradores"><div class="n">${ativos.length}</div><div class="r">colaboradores ativos</div></a>
      <a class="cartao kpi ${adms.length ? 'alerta' : ''}" href="#/rh/admissoes"><div class="n">${adms.length}</div><div class="r">admissões em andamento</div></a>
      <a class="cartao kpi ${docs.length ? 'alerta' : ''}" href="#/rh/documentos"><div class="n">${docs.length}</div><div class="r">documentos vencidos ou vencendo (30 dias)</div></a>
      <div class="cartao kpi ${exp.length ? 'alerta' : ''}"><div class="n">${exp.length}</div><div class="r">contratos de experiência vencendo (15 dias)</div></div>
      <div class="cartao kpi"><div class="n">${admMes} / ${deslMes}</div><div class="r">admissões / desligamentos no mês · turnover ${turnover.replace('.', ',')}%</div></div>
    </div>
    <div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr))">
      <div class="cartao"><h2>Quadro por setor</h2>${Object.keys(porSetor).length ? `<div class="tabela-wrap"><table><thead><tr><th>Setor</th><th class="num">Pessoas</th></tr></thead><tbody>
        ${Object.entries(porSetor).sort((a, b) => b[1] - a[1]).map(([s, n]) => `<tr class="clicavel" onclick="location.hash='#/rh/colaboradores?setor=${s}'"><td>${esc(ss.find(x => x.id === s)?.nome || 'Sem setor')}</td><td class="num">${n}</td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Nenhum colaborador ativo.</div>'}</div>
      <div class="cartao"><h2>Experiência vencendo</h2>${exp.length ? `<ul class="lista-simples">${exp.map(c => `<li><a href="#/rh/colaboradores/ver/${c.id}">${esc(c.nome)}</a>
        <span class="muted">${em(c.experiencia_fim1) ? '1º período até ' + dataBR(c.experiencia_fim1) : 'termina em ' + dataBR(c.experiencia_fim2)}</span></li>`).join('')}</ul>` : '<div class="vazio">Nenhum nos próximos 15 dias.</div>'}</div>
      <div class="cartao"><h2>Aniversariantes do mês</h2>${aniv.length ? `<ul class="lista-simples">${aniv.map(c => `<li><a href="#/rh/colaboradores/ver/${c.id}">${esc(c.nome)}</a><span class="muted">${c.data_nascimento.slice(8)}/${mes}</span></li>`).join('')}</ul>` : '<div class="vazio">Nenhum aniversariante cadastrado.</div>'}</div>
    </div>
    ${docs.length ? `<div class="cartao"><h2>Documentos para renovar</h2>${tabelaDocsRH(docs)}</div>` : ''}
    <div class="cartao"><h2>Pendências do RH</h2><div class="grade">${[['#/rh/ferias', 'ferias_vencendo', 'períodos de férias vencidos ou vencendo'], ['#/rh/treinamentos?aba=matriz&sit=pendente', 'treinamentos_pendentes', 'treinamentos obrigatórios pendentes ou vencidos'],
      ['#/rh/desligamentos', 'desligamentos_andamento', 'desligamentos em andamento'], ['#/rh/recrutamento', 'vagas_abertas', 'vagas abertas'], ['#/rh/avaliacoes', 'experiencia_vencendo', 'avaliações de experiência a fazer']]
      .map(([h, k, t]) => `<a class="cartao kpi ${estado.pendencias?.[k] && k !== 'vagas_abertas' ? 'alerta' : ''}" href="${h}"><div class="n">${estado.pendencias?.[k] || 0}</div><div class="r">${t}</div></a>`).join('')}</div></div>`;
});
function tabelaDocsRH(ds) {
  return `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Colaborador</th><th>Cargo</th><th>Documento</th><th>Vencimento</th><th>Situação</th></tr></thead><tbody>
    ${ds.map(d => `<tr class="clicavel" onclick="location.hash='#/rh/colaboradores/ver/${d.colaborador_id}?aba=docs'"><td data-r="Colaborador">${esc(d.nome)}</td><td data-r="Cargo">${esc(d.cargo || '—')}</td>
      <td data-r="Documento">${esc(d.tipo)}</td><td data-r="Vencimento" class="nowrap">${dataBR(d.vencimento)}</td><td data-r="Situação">${tagDoc({ tem_validade: true, vencimento: d.vencimento })}</td></tr>`).join('')}</tbody></table></div>`;
}

// ---------- Colaboradores ----------
rota('/rh/colaboradores', async tela => {
  const sts = pLista('status', 'todos'), st = sts[0], setores = pLista('setor').filter(s => s !== '-'), setor = setores[0] || '', q = (estado.params.get('q') || '').toLowerCase();
  const mapaF = { quadro: 'status=in.(em_admissao,ativo,ferias,afastado,aviso_previo)', candidatos: 'status=eq.candidato', desligados: 'status=eq.desligado', todos: 'status=neq.x' };
  const filtro = filtroOu(sts.map(s => mapaF[s] ?? mapaF.todos)) || mapaF.todos;
  const [cs, ss, cgs] = await Promise.all([api.listar('colaboradores', `select=id,matricula,nome,cpf,status,setor_id,cargo_id,telefone,data_admissao,cnh_categoria,cnh_validade,usuario_id&ativo=eq.true&${filtro}${setores.length ? '&setor_id=in.(' + setores.join(',') + ')' : ''}&order=nome`), setoresL(), cargosL()]);
  const ls = cs.filter(c => !q || [c.nome, c.matricula, c.cpf].join(' ').toLowerCase().includes(q.replace(/[.\-]/g, '')) || c.nome.toLowerCase().includes(q));
  tela.innerHTML = `
    <div class="topo"><div><h1>Colaboradores</h1><p class="sub">${ls.length} pessoa(s)</p></div>${editaRH() ? '<a class="btn prim" href="#/rh/colaboradores/novo">+ Colaborador</a>' : ''}</div>
    <form class="filtros" id="filtros"><select name="status">${[['quadro', 'Quadro atual'], ['candidatos', 'Candidatos'], ['desligados', 'Desligados'], ['todos', 'Todos']].map(([v, t]) => `<option value="${v}" ${v === st ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <select name="setor"><option value="">Todos os setores</option>${ss.map(s => `<option value="${s.id}" ${s.id === setor ? 'selected' : ''}>${esc(s.nome)}</option>`).join('')}</select>
      <input name="q" value="${esc(estado.params.get('q') || '')}" placeholder="Nome, matrícula ou CPF"><button class="btn">Filtrar</button></form>
    <div class="cartao">${ls.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Matrícula</th><th>Nome</th><th>Cargo</th><th>Setor</th><th>Admissão</th><th>CNH</th><th>Situação</th></tr></thead><tbody>
      ${ls.map(c => `<tr class="clicavel" onclick="location.hash='#/rh/colaboradores/ver/${c.id}'"><td data-r="Matrícula" class="nowrap">${c.matricula ? esc(c.matricula) : '<span class="muted">sem matrícula</span>'}</td>
        <td data-r="Nome"><b>${esc(c.nome)}</b>${c.usuario_id ? ' <span class="tag azul" title="Tem acesso ao sistema">login</span>' : ''}</td>
        <td data-r="Cargo">${esc(cgs.find(x => x.id === c.cargo_id)?.nome || '—')}</td><td data-r="Setor">${esc(ss.find(x => x.id === c.setor_id)?.nome || '—')}</td>
        <td data-r="Admissão">${dataBR(c.data_admissao) || '—'}</td>
        <td data-r="CNH">${c.cnh_categoria ? esc(c.cnh_categoria) + (c.cnh_validade ? ' · ' + dataBR(c.cnh_validade) + (c.cnh_validade < hojeISO() ? ' <span class="tag vermelho">vencida</span>' : '') : '') : '—'}</td>
        <td data-r="Situação">${tagColab(c.status)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Nenhum colaborador encontrado.</div>'}</div>`;
  $('#filtros').onsubmit = e => { e.preventDefault(); location.hash = '#/rh/colaboradores?' + new URLSearchParams(Object.entries(formDados(e.target)).filter(([, v]) => v)); };
});

// ---------- Formulário ----------
rota('/rh/colaboradores/novo', tela => formColaborador(tela));
rota('/rh/colaboradores/editar/:id', async (tela, id) => formColaborador(tela, await api.um('colaboradores', `id=eq.${id}&select=*`)));

async function formColaborador(tela, c = null) {
  if (!editaRH()) { tela.innerHTML = '<div class="cartao vazio">Sem permissão.</div>'; return; }
  const [ss, cgs, ccs, us, bancos, cols] = await Promise.all([setoresL(), cargosL(), centros(), usuarios(), listaBancos(),
    api.listar('colaboradores', 'select=id,nome&ativo=eq.true&status=in.(ativo,ferias,afastado,aviso_previo,em_admissao)&order=nome')]);
  const v = k => esc(c?.[k] ?? '');
  const sel = (nome, ops, atual, vazio = '') => `<select name="${nome}" data-valor="${esc(atual ?? '')}"><option value="">${vazio}</option>${ops.map(([val, t]) => `<option value="${esc(val)}" ${String(val) === String(atual ?? '') ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
  const campo = (rot, html, largo) => `<label class="campo ${largo ? 'largo' : ''}">${rot}${html}</label>`;
  const inp = (k, extra = '') => `<input name="${k}" value="${v(k)}" ${extra}>`;
  const dt = k => `<input type="date" name="${k}" value="${v(k)}">`;
  tela.innerHTML = `
    <div class="topo"><div><h1>${c ? 'Editar ' + esc(c.nome) : 'Novo colaborador'}</h1><p class="sub">Campos com * são obrigatórios. O restante pode ser completado durante a admissão.</p></div></div>
    <datalist id="lista-bancos">${bancos.map(b => `<option value="${String(b.code).padStart(3, '0')} · ${esc(b.name)}">`).join('')}</datalist>
    <form id="f-col">
      <div class="cartao"><h2>Situação e contrato</h2><div class="form">
        ${campo('Matrícula', inp('matricula', 'placeholder="Informe a matrícula" autocomplete="off" maxlength="20"'))}
        ${campo('Situação *', sel('status', Object.entries(STATUS_COLAB).map(([k, x]) => [k, x[0]]), c?.status || 'candidato'))}
        ${campo('Cargo', sel('cargo_id', cgs.filter(x => x.ativo).map(x => [x.id, x.nome]), c?.cargo_id, 'Selecione…'))}
        ${campo('Setor', sel('setor_id', ss.filter(x => x.ativo).map(x => [x.id, x.nome]), c?.setor_id, 'Selecione…'))}
        ${campo('Centro de custo', sel('centro_custo_id', ccs.filter(x => x.ativo).map(x => [x.id, x.nome]), c?.centro_custo_id, 'Selecione…'))}
        ${campo('Tipo de contrato', sel('tipo_contrato', Object.entries(TIPOS_CONTRATO), c?.tipo_contrato || 'clt'))}
        ${campo('Data de admissão', dt('data_admissao'))}
        ${campo('Jornada', inp('jornada', 'placeholder="Ex.: 44h semanais / 12x36"'))}
        ${campo('Escala', inp('escala', 'placeholder="Ex.: Turno A, 2MW"'))}
        ${campo('Salário (R$)', `<input name="salario" inputmode="decimal" value="${c?.salario != null ? Number(c.salario).toFixed(2).replace('.', ',') : ''}">`)}
        ${campo('Gestor imediato', sel('gestor_colaborador_id', cols.filter(x => x.id !== c?.id).map(x => [x.id, x.nome]), c?.gestor_colaborador_id, 'Nenhum'))}
        ${campo('Acesso ao sistema (usuário)', sel('usuario_id', us.filter(u => u.ativo).map(u => [u.id, u.nome + ' · ' + u.email]), c?.usuario_id, 'Sem acesso'))}
        ${c?.status === 'desligado' || c?.data_desligamento ? campo('Data do desligamento', dt('data_desligamento')) + campo('Motivo do desligamento', inp('motivo_desligamento'), true) : ''}
      </div></div>
      <div class="cartao"><h2>Dados pessoais</h2><div class="form">
        ${campo('Nome completo *', inp('nome', 'required'), true)}
        ${campo('Nome social', inp('nome_social'))}${campo('Apelido (como é chamado)', inp('apelido'))}
        ${campo('CPF', `<input name="cpf" value="${esc(fmtCPF(c?.cpf || ''))}" inputmode="numeric">`)}
        ${campo('Data de nascimento', dt('data_nascimento'))}
        ${campo('RG', inp('rg'))}${campo('Órgão emissor', inp('rg_orgao'))}${campo('UF do RG', sel('rg_uf', UFS.map(u => [u, u]), c?.rg_uf))}${campo('Emissão do RG', dt('rg_emissao'))}
        ${campo('Sexo', sel('sexo', [['F', 'Feminino'], ['M', 'Masculino'], ['Outro', 'Outro']], c?.sexo))}
        ${campo('Estado civil', sel('estado_civil', ['Solteiro(a)', 'Casado(a)', 'União estável', 'Divorciado(a)', 'Viúvo(a)'].map(x => [x, x]), c?.estado_civil))}
        ${campo('Raça/cor (eSocial)', sel('raca_cor', ['Branca', 'Preta', 'Parda', 'Amarela', 'Indígena', 'Não informada'].map(x => [x, x]), c?.raca_cor))}
        ${campo('Escolaridade', sel('escolaridade', ['Fundamental incompleto', 'Fundamental completo', 'Médio incompleto', 'Médio completo', 'Técnico', 'Superior incompleto', 'Superior completo', 'Pós-graduação'].map(x => [x, x]), c?.escolaridade))}
        ${campo('Nacionalidade', inp('nacionalidade'))}${campo('Naturalidade (cidade/UF)', inp('naturalidade'))}
        ${campo('Nome da mãe', inp('nome_mae'), true)}${campo('Nome do pai', inp('nome_pai'), true)}
        <label class="check largo"><input type="checkbox" name="pcd" ${c?.pcd ? 'checked' : ''}> Pessoa com deficiência (PcD)</label>${campo('Tipo de deficiência', inp('pcd_tipo'))}
      </div></div>
      <div class="cartao"><h2>Documentos trabalhistas e CNH</h2><div class="form">
        ${campo('PIS/PASEP/NIS', inp('pis', 'inputmode="numeric"'))}${campo('CTPS (número)', inp('ctps_numero'))}${campo('CTPS (série)', inp('ctps_serie'))}${campo('CTPS (UF)', sel('ctps_uf', UFS.map(u => [u, u]), c?.ctps_uf))}
        ${campo('Título de eleitor', inp('titulo_eleitor'))}${campo('Zona', inp('titulo_zona'))}${campo('Seção', inp('titulo_secao'))}${campo('Reservista', inp('reservista'))}
        ${campo('CNH (número)', inp('cnh_numero', 'inputmode="numeric"'))}
        ${campo('Categoria', sel('cnh_categoria', ['A', 'B', 'AB', 'C', 'AC', 'D', 'AD', 'E', 'AE'].map(x => [x, x]), c?.cnh_categoria))}
        ${campo('Validade da CNH', dt('cnh_validade'))}${campo('1ª habilitação', dt('cnh_primeira'))}${campo('UF da CNH', sel('cnh_uf', UFS.map(u => [u, u]), c?.cnh_uf))}
        <label class="check"><input type="checkbox" name="cnh_ear" ${c?.cnh_ear ? 'checked' : ''}> CNH com EAR (exerce atividade remunerada)</label>
        <div class="largo muted" id="aviso-cnh"></div>
      </div></div>
      <div class="cartao"><h2>Contato e endereço</h2><div class="form">
        ${campo('Celular', `<input name="telefone" value="${esc(fmtTel(c?.telefone || ''))}">`)}${campo('Outro telefone', `<input name="telefone2" value="${esc(fmtTel(c?.telefone2 || ''))}">`)}
        ${campo('E-mail pessoal', inp('email', 'type="email"'))}${campo('E-mail corporativo', inp('email_corporativo', 'type="email"'))}
        ${campo('CEP', `<input name="cep" value="${esc(fmtCEP(c?.cep || ''))}" inputmode="numeric">`)}${campo('Logradouro', inp('logradouro'), true)}
        ${campo('Número', inp('numero'))}${campo('Complemento', inp('complemento'))}${campo('Bairro', inp('bairro'))}${campo('Cidade', inp('cidade'))}
        ${campo('UF', sel('uf', UFS.map(u => [u, u]), c?.uf))}
        ${campo('Contato de emergência', inp('emergencia_nome'))}${campo('Parentesco', inp('emergencia_parentesco'))}${campo('Telefone de emergência', `<input name="emergencia_telefone" value="${esc(fmtTel(c?.emergencia_telefone || ''))}">`)}
      </div></div>
      <div class="cartao"><h2>Dados bancários (salário e reembolsos)</h2><div class="form">
        ${campo('Banco', `<input name="banco" list="lista-bancos" value="${esc(c?.banco ? nomeBanco(c.banco, bancos) : '')}">`, true)}
        ${campo('Agência', inp('agencia'))}${campo('Conta', inp('conta'))}${campo('Tipo', sel('tipo_conta', ['Corrente', 'Poupança', 'Salário', 'Pagamento'].map(x => [x, x]), c?.tipo_conta))}
        ${campo('Tipo de chave Pix', sel('pix_tipo', TIPOS_PIX.map(x => [x, x]), c?.pix_tipo))}${campo('Chave Pix', inp('pix_chave'), true)}
      </div></div>
      <div class="cartao"><h2>Observações</h2><textarea name="observacoes" rows="3" style="width:100%">${v('observacoes')}</textarea></div>
      <div class="acoes"><button class="btn prim">Salvar</button><a class="btn" href="javascript:history.back()">Cancelar</a></div>
    </form>`;
  const f = $('#f-col');
  f.cpf.addEventListener('input', e => { e.target.value = mascaraDoc(e.target.value.slice(0, 14)); });
  ['telefone', 'telefone2', 'emergencia_telefone'].forEach(n => f[n].addEventListener('input', e => { const d = soDigitos(e.target.value).slice(0, 11); e.target.value = d.length > 9 ? fmtTel(d) : d; }));
  f.cep.addEventListener('input', async e => { const d = soDigitos(e.target.value).slice(0, 8); e.target.value = fmtCEP(d);
    if (d.length === 8 && !f.logradouro.value) try { const x = await consultarCEP(d); f.logradouro.value = x.logradouro || ''; f.bairro.value = x.bairro || ''; f.cidade.value = x.localidade || ''; f.uf.value = x.uf || ''; f.numero.focus(); } catch {} });
  ligarNovoCargo(f.cargo_id);
  let _usCPF = null;
  f.cpf?.addEventListener('input', async () => { const d = soDigitos(f.cpf.value); if (d.length !== 11) return;
    _usCPF = _usCPF || await api.listar('usuarios', 'select=id,nome,email,cpf,telefone&ativo=eq.true').catch(() => []);
    const u = _usCPF.find(x => x.cpf === d);
    if (u && f.usuario_id && !f.usuario_id.value) { f.usuario_id.value = u.id; aviso(`Este CPF tem acesso ao sistema (${u.nome}): ligado ao colaborador.`); }
    if (u) { ['telefone', 'email'].forEach(n => { if (f[n] && !f[n].value && u[n]) { f[n].value = u[n]; f[n].dispatchEvent(new Event('input', { bubbles: true })); } }); } });
  f.cargo_id.addEventListener('change', () => { const cg = cgs.find(x => x.id === f.cargo_id.value); if (cg?.setor_id && !f.setor_id.value) f.setor_id.value = cg.setor_id; avisoCNH(); });
  const ordemCNH = { A: 0, B: 1, AB: 1, C: 2, AC: 2, D: 3, AD: 3, E: 4, AE: 4 };
  const avisoCNH = () => {
    const cg = cgs.find(x => x.id === f.cargo_id.value), cat = f.cnh_categoria.value, msgs = [];
    if (cg?.motorista) {
      if (!cat) msgs.push(`O cargo ${cg.nome} exige CNH ${cg.cnh_minima || ''}.`);
      else if (cg.cnh_minima && (ordemCNH[cat] ?? -1) < (ordemCNH[cg.cnh_minima] ?? 0)) msgs.push(`⚠️ Categoria ${cat} é inferior à exigida para ${cg.nome} (${cg.cnh_minima}).`);
      if (!f.cnh_ear.checked) msgs.push('Motorista profissional precisa da observação EAR na CNH.');
    }
    if (f.cnh_validade.value && f.cnh_validade.value < hojeISO()) msgs.push('⚠️ CNH vencida.');
    $('#aviso-cnh').innerHTML = msgs.map(esc).join('<br>');
  };
  ['cnh_categoria', 'cnh_validade', 'cnh_ear'].forEach(n => f[n].addEventListener('change', avisoCNH)); avisoCNH();
  f.onsubmit = async e => {
    e.preventDefault();
    const d = formDados(f);
    if (d.cpf && !cpfValido(d.cpf)) return aviso('CPF inválido: confira os números.', true);
    const dados = {};
    for (const [k, val] of Object.entries(d)) { if (k.startsWith('_')) continue; dados[k] = typeof val === 'boolean' ? val : (val === '' ? null : val); }
    Object.assign(dados, { matricula: String(d.matricula || '').trim() || null, cpf: soDigitos(d.cpf) || null, telefone: soDigitos(d.telefone) || null, telefone2: soDigitos(d.telefone2) || null,
      emergencia_telefone: soDigitos(d.emergencia_telefone) || null, cep: soDigitos(d.cep) || null, salario: num(d.salario),
      banco: (d.banco || '').match(/^\d{1,3}/)?.[0] || d.banco || null });
    await ocupado(e.submitter, async () => {
      try {
        let id = c?.id;
        if (c) await api.alterar('colaboradores', `id=eq.${id}`, dados); else [{ id }] = await api.inserir('colaboradores', dados);
        aviso('Colaborador salvo.'); location.hash = '#/rh/colaboradores/ver/' + id;
      } catch (err) { falha(/matricula/i.test(err.message) ? new Error(`Já existe um colaborador com a matrícula ${dados.matricula}.`) : /duplicate|unique/i.test(err.message) ? new Error('Já existe um colaborador com esse CPF (ou esse usuário já está ligado a outro colaborador).') : err); }
    });
  };
}

// ---------- Ficha do colaborador ----------
rota('/rh/colaboradores/ver/:id', async (tela, id) => {
  const c = await api.um('colaboradores', `id=eq.${id}&select=*`);
  if (!c) { tela.innerHTML = '<div class="cartao vazio">Colaborador não encontrado ou sem acesso.</div>'; return; }
  const aba = estado.params.get('aba') || 'dados';
  const [ss, cgs, tipos, docs, deps, adms, gerados] = await Promise.all([setoresL(), cargosL(), tiposDocRH(),
    api.listar('colaborador_documentos', `colaborador_id=eq.${id}&ativo=eq.true&order=criado_em.desc`),
    api.listar('colaborador_dependentes', `colaborador_id=eq.${id}&ativo=eq.true&order=nome`),
    api.listar('admissoes', `colaborador_id=eq.${id}&order=criado_em.desc`).catch(() => []),
    api.listar('documentos_gerados', `colaborador_id=eq.${id}&select=*,modelo:modelos_documentos(titulo,codigo)&order=gerado_em.desc&limit=50`).catch(() => [])]);
  const cargo = cgs.find(x => x.id === c.cargo_id), setor = ss.find(x => x.id === c.setor_id);
  const pode = editaRH();
  const atuais = docs.filter(d => !d.substituido_em);
  const exigidos = tipos.filter(t => t.ativo && exigidoPara(t, cargo?.motorista));
  const faltam = exigidos.filter(t => !atuais.some(d => d.tipo_id === t.id));
  const venc = atuais.filter(d => d.vencimento && !d.dispensado && diasAte(d.vencimento) <= 30);
  const admAtual = adms.find(a => a.status === 'em_andamento');
  const abas = [['dados', 'Dados'], ['docs', `Documentos${faltam.length ? ` (${faltam.length} faltando)` : ''}`], ['deps', `Dependentes (${deps.length})`], ['admissao', 'Admissão'], ['ferias', 'Férias'], ['treinamentos', 'Treinamentos'], ['avaliacoes', 'Avaliações'], ['disciplinar', 'Disciplinar'], ['patrimonio', 'Patrimônio e EPI'], ['ssma', 'Saúde e segurança'], ['desligamento', 'Desligamento'], ['gerados', 'Documentos gerados']];
  const linha = (k, val) => `<div><div class="muted">${k}</div><b>${val ? esc(val) : '—'}</b></div>`;
  const conteudo = {
    dados: `<div class="cartao"><div class="form">
        ${linha('Matrícula', c.matricula)}${linha('CPF', fmtCPF(c.cpf || ''))}${linha('Nascimento', c.data_nascimento ? `${dataBR(c.data_nascimento)} (${idade(c.data_nascimento)} anos)` : '')}
        ${linha('RG', [c.rg, c.rg_orgao, c.rg_uf].filter(Boolean).join(' '))}${linha('Estado civil', c.estado_civil)}${linha('Escolaridade', c.escolaridade)}
        ${linha('Mãe', c.nome_mae)}${linha('PIS', c.pis)}${linha('CTPS', [c.ctps_numero, c.ctps_serie, c.ctps_uf].filter(Boolean).join(' / '))}
        ${linha('CNH', c.cnh_categoria ? `${c.cnh_numero || ''} · ${c.cnh_categoria}${c.cnh_ear ? ' · EAR' : ''} · validade ${dataBR(c.cnh_validade) || '—'}` : '')}
        ${linha('Telefone', [c.telefone, c.telefone2].filter(Boolean).map(fmtTel).join(' · '))}${linha('E-mail', c.email_corporativo || c.email)}
        <div class="largo">${linha('Endereço', [c.logradouro, c.numero, c.complemento, c.bairro, [c.cidade, c.uf].filter(Boolean).join('/'), c.cep && 'CEP ' + fmtCEP(c.cep)].filter(Boolean).join(', '))}</div>
        ${linha('Emergência', [c.emergencia_nome, c.emergencia_parentesco, fmtTel(c.emergencia_telefone || '')].filter(Boolean).join(' · '))}
        ${linha('Contrato', [TIPOS_CONTRATO[c.tipo_contrato], c.jornada, c.escala].filter(Boolean).join(' · '))}
        ${linha('Admissão', dataBR(c.data_admissao))}${c.experiencia_fim2 && ['clt', 'experiencia'].includes(c.tipo_contrato) ? linha('Experiência', `${dataBR(c.experiencia_fim1)} e ${dataBR(c.experiencia_fim2)}`) : ''}
        ${c.salario != null ? linha('Salário', brl(c.salario)) : ''}${linha('Pix', c.pix_chave)}
        ${c.status === 'desligado' ? linha('Desligamento', `${dataBR(c.data_desligamento)} · ${c.motivo_desligamento || ''}`) : ''}
        ${c.observacoes ? `<div class="largo"><div class="muted">Observações</div><div style="white-space:pre-line">${esc(c.observacoes)}</div></div>` : ''}
      </div></div>`,
    docs: `<div class="cartao"><div class="topo" style="margin:0 0 8px"><h2 style="margin:0">Documentos</h2>${pode ? '<button class="btn prim peq" id="novo-doc-rh">+ Documento</button>' : ''}</div>
        ${faltam.length ? `<div class="alerta-obs" style="margin-bottom:10px"><b>Faltam ${faltam.length} documento(s) obrigatório(s) para o cargo:</b> ${faltam.map(t => esc(t.nome)).join(' · ')}</div>` : '<p class="muted">Todos os documentos obrigatórios do cargo foram entregues.</p>'}
        ${[...Object.entries(CATEG_DOC_RH), ...[...new Set(tipos.map(t => t.categoria))].filter(k => !CATEG_DOC_RH[k]).map(k => [k, k])].map(([cat, nomeCat]) => { const ts = tipos.filter(t => t.categoria === cat && (atuais.some(d => d.tipo_id === t.id) || exigidoPara(t, cargo?.motorista)));
          if (!ts.length) return ''; return `<h3 style="margin:14px 0 6px">${nomeCat}</h3><ul class="lista-simples">${ts.map(t => { const d = atuais.find(x => x.tipo_id === t.id);
            return `<li style="flex-wrap:wrap"><span>${d ? (d.dispensado ? '➖' : '✅') : '⏳'} <b>${esc(t.nome)}</b>${d?.numero ? ` <span class="muted">nº ${esc(d.numero)}</span>` : ''}
              ${d?.vencimento && !d.dispensado ? ' ' + tagDoc({ tem_validade: true, vencimento: d.vencimento }) + ` <span class="muted">vence ${dataBR(d.vencimento)}</span>` : ''}${d?.dispensado ? ' <span class="tag">Não se aplica</span>' : ''}${!d ? ' <span class="tag amarelo">Pendente</span>' : ''}</span>
              <span class="acoes">${d ? `<span class="anx-doc" data-id="${d.id}"></span>` : ''}${pode ? `<button class="btn peq" data-tipo="${t.id}">${d ? 'Atualizar' : 'Receber'}</button>` : ''}</span></li>`; }).join('')}</ul>`; }).join('')}
      </div>`,
    deps: `<div class="cartao"><div class="topo" style="margin:0 0 8px"><h2 style="margin:0">Dependentes</h2>${pode ? '<button class="btn prim peq" id="novo-dep">+ Dependente</button>' : ''}</div>
        ${deps.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nome</th><th>Parentesco</th><th>Nascimento</th><th>CPF</th><th>IR</th><th>Salário-família</th><th>Plano de saúde</th><th></th></tr></thead><tbody>
          ${deps.map(x => `<tr><td data-r="Nome">${esc(x.nome)}</td><td data-r="Parentesco">${esc(x.parentesco)}</td><td data-r="Nascimento">${dataBR(x.data_nascimento)}${x.data_nascimento ? ` (${idade(x.data_nascimento)})` : ''}</td>
            <td data-r="CPF">${esc(fmtCPF(x.cpf || ''))}</td><td data-r="IR">${x.dependente_ir ? 'Sim' : 'Não'}</td><td data-r="Salário-família">${x.salario_familia ? 'Sim' : 'Não'}</td><td data-r="Plano">${x.plano_saude ? 'Sim' : 'Não'}</td>
            <td>${pode ? `<button class="btn peq perigo" data-rem-dep="${x.id}">Remover</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Nenhum dependente.</div>'}</div>`,
    admissao: '<div id="adm-box" class="cartao"><div class="carregando">Carregando…</div></div>',
    ...Object.fromEntries(['ferias', 'treinamentos', 'avaliacoes', 'disciplinar', 'patrimonio', 'ssma', 'desligamento'].map(k => [k, '<div id="aba-extra" class="cartao"><div class="carregando">Carregando…</div></div>'])),
    gerados: `<div class="cartao"><div class="topo" style="margin:0 0 8px"><h2 style="margin:0">Documentos gerados</h2><button class="btn prim peq" id="gerar-doc">+ Gerar documento</button></div>
        ${gerados.length ? `<ul class="lista-simples">${gerados.map(g => `<li><span>${esc(g.modelo?.titulo || '')} <span class="muted">${esc(g.modelo?.codigo || '')}</span></span><span class="muted">${dataHoraBR(g.gerado_em)}</span></li>`).join('')}</ul>` : '<div class="vazio">Nenhum documento gerado ainda.</div>'}</div>`,
  };
  tela.innerHTML = `
    <div class="topo"><div><h1>${esc(c.nome)}</h1><p class="sub">${tagColab(c.status)} · ${esc([cargo?.nome, setor?.nome, c.matricula && 'matrícula ' + c.matricula].filter(Boolean).join(' · '))}</p></div>
      <div class="acoes">${pode ? `<a class="btn" href="#/rh/colaboradores/editar/${id}">Editar</a>` : ''}<button class="btn" id="gerar-topo">Gerar documento</button><a class="btn" href="#/rh/colaboradores">Voltar</a></div></div>
    ${venc.length ? `<div class="cartao alerta-obs">⚠️ ${venc.map(d => `${esc(tipos.find(t => t.id === d.tipo_id)?.nome || '')} ${diasAte(d.vencimento) < 0 ? 'vencido em' : 'vence em'} ${dataBR(d.vencimento)}`).join(' · ')}</div>` : ''}
    <div class="abas">${abas.map(([k, t]) => `<a href="#/rh/colaboradores/ver/${id}?aba=${k}" class="${k === aba ? 'ativa' : ''}">${t}</a>`).join('')}</div>
    ${conteudo[aba] || conteudo.dados}`;
  $$('.anx-doc', tela).forEach(async el => { el.innerHTML = await htmlAnexos('documento_colaborador', el.dataset.id); });
  const gerar = async () => { const ms = await api.listar('modelos_documentos', 'select=*&ativo=eq.true&vigente=eq.true&order=setor,titulo');
    const r = await modal(`<form><h2>Gerar documento para ${esc(c.nome)}</h2><div class="form"><label class="campo largo">Modelo<select name="m" required>
      ${SETORES_MODELO.filter(s => ms.some(m => m.setor === s)).map(s => `<optgroup label="${s}">${ms.filter(m => m.setor === s).map(m => `<option value="${m.id}">${esc(m.titulo)}</option>`).join('')}</optgroup>`).join('')}</select></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Continuar</button></div></form>`);
    if (r) await gerarDocumento(ms.find(m => m.id === r.m), id); };
  $('#gerar-topo').onclick = gerar; $('#gerar-doc')?.addEventListener('click', gerar);

  // receber / atualizar documento
  const receberDoc = async tipoId => {
    const r = await modal(`<form><h2>Documento do colaborador</h2><div class="form">
      <label class="campo largo">Tipo<select name="tipo" required>${tipos.filter(t => t.ativo).map(t => `<option value="${t.id}" ${t.id === tipoId ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}</select></label>
      <label class="campo">Número<input name="numero"></label><label class="campo">Emissão / realização<input type="date" name="emissao"></label>
      <label class="campo" id="c-venc">Vencimento<input type="date" name="vencimento"></label>
      <div class="largo muted" id="d-orient"></div>
      <label class="check largo"><input type="checkbox" name="dispensado"> Não se aplica a este colaborador</label>
      <label class="campo largo">Observação<input name="observacao"></label>
      <label class="campo largo">Arquivo (PDF ou foto)<input type="file" name="arquivos" accept="image/*,application/pdf" multiple></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`, {
      aoAbrir: raiz => { const f = $('form', raiz); const sinc = () => { const t = tipos.find(x => x.id === f.tipo.value);
          $('#c-venc', raiz).hidden = !t?.tem_validade; $('#d-orient', raiz).textContent = [t?.orientacao, t?.tem_validade && t?.validade_meses ? `Sem data de vencimento, o sistema calcula ${t.validade_meses} meses após a emissão.` : ''].filter(Boolean).join(' ');
          if (f.emissao.value && t?.validade_meses && !f.vencimento.value) f.vencimento.value = somaMeses(f.emissao.value, t.validade_meses); };
        f.tipo.onchange = sinc; f.emissao.onchange = sinc; sinc(); },
      validar: d => !d.dispensado && !d.arquivos.length ? 'Anexe o arquivo do documento (ou marque "Não se aplica").' : null });
    if (!r) return;
    try {
      const [doc] = await api.inserir('colaborador_documentos', { colaborador_id: id, tipo_id: r.tipo, numero: r.numero || null, emissao: r.emissao || null,
        vencimento: r.vencimento || null, dispensado: !!r.dispensado, observacao: [r.tipo_outro, r.observacao].filter(Boolean).join(' — ') || null });
      await anexar('documento_colaborador', doc.id, r.arquivos); aviso('Documento registrado.'); navegar();
    } catch (err) { falha(err); }
  };
  $('#novo-doc-rh')?.addEventListener('click', () => receberDoc(''));
  $$('[data-tipo]', tela).forEach(b => b.addEventListener('click', () => receberDoc(b.dataset.tipo)));

  $('#novo-dep')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Novo dependente</h2><div class="form">
      <label class="campo largo">Nome *<input name="nome" required></label>
      <label class="campo">Parentesco *<select name="parentesco" required>${['Filho(a)', 'Enteado(a)', 'Cônjuge', 'Companheiro(a)', 'Pai', 'Mãe', 'Outro'].map(x => `<option>${x}</option>`).join('')}</select></label>
      <label class="campo">Nascimento<input type="date" name="data_nascimento"></label><label class="campo">CPF<input name="cpf"></label>
      <label class="check"><input type="checkbox" name="dependente_ir"> Dependente de IR</label><label class="check"><input type="checkbox" name="salario_familia"> Salário-família</label>
      <label class="check"><input type="checkbox" name="plano_saude"> Plano de saúde</label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`,
      { validar: d => d.cpf && !cpfValido(d.cpf) ? 'CPF do dependente inválido.' : null });
    if (!r) return;
    try { await api.inserir('colaborador_dependentes', { colaborador_id: id, nome: r.nome, parentesco: r.parentesco, data_nascimento: r.data_nascimento || null,
            cpf: soDigitos(r.cpf) || null, dependente_ir: !!r.dependente_ir, salario_familia: !!r.salario_familia, plano_saude: !!r.plano_saude }); aviso('Dependente incluído.'); navegar(); }
    catch (err) { falha(err); }
  });
  $$('[data-rem-dep]', tela).forEach(b => b.addEventListener('click', async () => {
    if (!await confirmar('Remover este dependente?', { botao: 'Remover' })) return;
    try { await api.alterar('colaborador_dependentes', `id=eq.${b.dataset.remDep}`, { ativo: false }); navegar(); } catch (err) { falha(err); }
  }));

  if (aba === 'admissao') await painelAdmissao($('#adm-box'), c, admAtual, adms, cargo, cgs, faltam);
  if (typeof ABAS_RH_EXTRA !== 'undefined' && ABAS_RH_EXTRA[aba]) { await ABAS_RH_EXTRA[aba]($('#aba-extra'), c, { cargo, cgs }); if (typeof ferramentasExportacao === 'function') ferramentasExportacao(tela); }
});

// ---------- Admissão ----------
async function painelAdmissao(box, c, adm, adms, cargo, cgs, faltam) {
  const pode = editaRH();
  if (!adm) {
    box.innerHTML = `<h2>Admissão</h2>${adms.length ? `<ul class="lista-simples">${adms.map(a => `<li><span>${esc(a.numero || '')} ${tag(a.status === 'concluida' ? 'aprovado' : a.status === 'cancelada' ? 'cancelado' : 'pendente')}</span><span class="muted">${a.concluida_em ? 'concluída em ' + dataBR(a.concluida_em) : dataBR(a.data_prevista)}</span></li>`).join('')}</ul>` : ''}
      ${pode && ['candidato', 'desligado', 'em_admissao'].includes(c.status) ? `<form class="form" id="f-adm" style="margin-top:10px">
        <label class="campo">Cargo *<select name="cargo" required><option value="">Selecione…</option>${cgs.filter(x => x.ativo).map(x => `<option value="${x.id}" ${x.id === c.cargo_id ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}</select></label>
        <label class="campo">Início previsto *<input type="date" name="data" required value="${c.data_admissao || ''}"></label>
        <div class="largo"><button class="btn prim">Iniciar admissão</button></div></form>` : `<p class="muted">${c.status === 'ativo' ? 'Colaborador já admitido.' : ''}</p>`}`;
    ligarNovoCargo($('#f-adm [name=cargo]'));
    $('#f-adm')?.addEventListener('submit', async e => { e.preventDefault(); const d = formDados(e.target);
      try { await api.rpc('iniciar_admissao', { p_colaborador: c.id, p_cargo: d.cargo, p_data: d.data }); aviso('Admissão iniciada.'); navegar(); } catch (err) { falha(err); } });
    return;
  }
  const etapas = await api.listar('admissao_etapas', `admissao_id=eq.${adm.id}&order=ordem`);
  const feitas = etapas.filter(x => x.status !== 'pendente').length;
  const pct = Math.round((feitas + (faltam.length ? 0 : 1)) / (etapas.length + 1) * 100);
  box.innerHTML = `<div class="topo" style="margin:0 0 8px"><div><h2 style="margin:0">Admissão ${esc(adm.numero || '')}</h2><div class="muted">Início previsto ${dataBR(adm.data_prevista)} · ${pct}% concluído</div></div>
      ${pode ? '<div class="acoes"><button class="btn ok" id="concluir-adm">Concluir admissão</button><button class="btn perigo" id="cancelar-adm">Cancelar</button></div>' : ''}</div>
    <div class="progresso"><div style="width:${pct}%"></div></div>
    <ul class="lista-simples" style="margin-top:10px">
      <li><span>${faltam.length ? '⏳' : '✅'} <b>Documentos obrigatórios do cargo</b> ${faltam.length ? `<span class="muted">faltam ${faltam.length}</span>` : ''}</span><a class="btn peq" href="#/rh/colaboradores/ver/${c.id}?aba=docs">Ver documentos</a></li>
      ${etapas.map(x => `<li style="flex-wrap:wrap"><span>${x.status === 'feito' ? '✅' : x.status === 'nao_se_aplica' ? '➖' : '⏳'} <b>${esc(x.etapa)}</b> <span class="muted">${esc(x.setor)}${x.data ? ' · ' + dataBR(x.data) : ''}${x.observacao ? ' · ' + esc(x.observacao) : ''}</span></span>
        ${pode ? `<span class="acoes"><select data-etapa="${x.id}" aria-label="Situação da etapa"><option value="pendente" ${x.status === 'pendente' ? 'selected' : ''}>Pendente</option><option value="feito" ${x.status === 'feito' ? 'selected' : ''}>Feito</option><option value="nao_se_aplica" ${x.status === 'nao_se_aplica' ? 'selected' : ''}>Não se aplica</option></select>
          ${/exame admissional|toxicol/i.test(x.etapa) ? `<button class="btn peq" data-enc="${/toxicol/i.test(x.etapa) ? 'RH-FOR-003' : 'RH-FOR-001'}">Gerar encaminhamento</button>` : ''}
          ${/Documentos admissionais/i.test(x.etapa) ? '<button class="btn peq" data-enc="RH-LST-001">Lista de documentos</button>' : ''}</span>` : ''}</li>`).join('')}
    </ul>`;
  $$('[data-etapa]', box).forEach(s => s.addEventListener('change', async () => {
    let obs = null; if (s.value === 'nao_se_aplica') { obs = await confirmar('Por que esta etapa não se aplica?', { comMotivo: true, botao: 'Confirmar' }); if (!obs) { s.value = 'pendente'; return; } }
    try { await api.alterar('admissao_etapas', `id=eq.${s.dataset.etapa}`, { status: s.value, data: s.value === 'pendente' ? null : hojeISO(), feito_por: estado.usuario.id, ...(obs ? { observacao: obs } : {}) }); navegar(); } catch (err) { falha(err); }
  }));
  $$('[data-enc]', box).forEach(b => b.addEventListener('click', async () => {
    const m = await api.um('modelos_documentos', `codigo=eq.${b.dataset.enc}&vigente=eq.true&ativo=eq.true&select=*`);
    if (!m) return aviso('Modelo não encontrado na biblioteca.', true);
    await gerarDocumento(m, c.id);
  }));
  $('#concluir-adm')?.addEventListener('click', async () => {
    if (!await confirmar('Concluir a admissão? O colaborador passa para "Ativo".', { botao: 'Concluir' })) return;
    try { await api.rpc('concluir_admissao', { p_admissao: adm.id }); aviso('Admissão concluída. Bem-vindo(a)!'); navegar(); } catch (err) { falha(err); }
  });
  $('#cancelar-adm')?.addEventListener('click', async () => {
    const motivo = await confirmar('Cancelar esta admissão?', { comMotivo: true, botao: 'Cancelar admissão' }); if (!motivo) return;
    try { await api.alterar('admissoes', `id=eq.${adm.id}`, { status: 'cancelada', motivo_cancelamento: motivo });
          await api.alterar('colaboradores', `id=eq.${c.id}`, { status: 'candidato' }); aviso('Admissão cancelada.'); navegar(); } catch (err) { falha(err); }
  });
}

rota('/rh/admissoes', async tela => {
  const sts = pLista('status', 'todas'), st = sts[0];
  const adms = await api.listar('admissoes', `select=*,colab:colaboradores(id,nome),cargo:cargos(nome),etapas:admissao_etapas(status)&${temTodos(sts) ? 'status=neq.x' : 'status=in.(' + sts.join(',') + ')'}&order=data_prevista`);
  tela.innerHTML = `
    <div class="topo"><div><h1>Admissões</h1><p class="sub">${adms.length} processo(s)</p></div>${editaRH() ? '<a class="btn prim" href="#/rh/colaboradores/novo">+ Novo candidato</a>' : ''}</div>
    <form class="filtros" id="filtros"><select name="status">${[['em_andamento', 'Em andamento'], ['concluida', 'Concluídas'], ['cancelada', 'Canceladas'], ['todas', 'Todas']].map(([v, t]) => `<option value="${v}" ${v === st ? 'selected' : ''}>${t}</option>`).join('')}</select><button class="btn">Filtrar</button></form>
    <div class="cartao">${adms.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nº</th><th>Colaborador</th><th>Cargo</th><th>Início previsto</th><th>Etapas</th></tr></thead><tbody>
      ${adms.map(a => { const et = a.etapas || [], n = et.length, f = et.filter(x => x.status !== 'pendente').length;
        return `<tr class="clicavel" onclick="location.hash='#/rh/colaboradores/ver/${a.colab?.id}?aba=admissao'"><td data-r="Nº">${esc(a.numero || '')}</td><td data-r="Colaborador">${esc(a.colab?.nome || '')}</td>
        <td data-r="Cargo">${esc(a.cargo?.nome || '')}</td><td data-r="Início">${dataBR(a.data_prevista)}${a.status === 'em_andamento' && a.data_prevista < hojeISO() ? ' <span class="tag vermelho">atrasada</span>' : ''}</td>
        <td data-r="Etapas">${f}/${n}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="vazio">Nenhuma admissão.</div>'}</div>`;
  $('#filtros').onsubmit = e => { e.preventDefault(); location.hash = '#/rh/admissoes?status=' + formDados(e.target).status; };
});

rota('/rh/documentos', async tela => {
  const faixas = pLista('faixa', 'todos'), faixa = faixas[0];
  const ds = await api.listar('v_docs_colaborador_vencimento', `${filtroOu(faixas.map(f => ({ vencidos: 'faixa=eq.vencido', proximos: 'faixa=in.(vencido,vence_30,vence_60)' })[f] ?? '')) || 'faixa=neq.x'}&order=vencimento`);
  tela.innerHTML = `
    <div class="topo"><div><h1>Documentos dos colaboradores</h1><p class="sub">CNH, ASO, toxicológico, cursos e demais documentos com validade</p></div></div>
    <form class="filtros" id="filtros"><select name="faixa">${[['proximos', 'Vencidos e próximos 60 dias'], ['vencidos', 'Só vencidos'], ['todos', 'Todos com validade']].map(([v, t]) => `<option value="${v}" ${v === faixa ? 'selected' : ''}>${t}</option>`).join('')}</select><button class="btn">Filtrar</button></form>
    <div class="cartao">${ds.length ? tabelaDocsRH(ds) : '<div class="vazio">Nenhum documento nesta situação. 🎉</div>'}</div>`;
  $('#filtros').onsubmit = e => { e.preventDefault(); location.hash = '#/rh/documentos?faixa=' + formDados(e.target).faixa; };
});
