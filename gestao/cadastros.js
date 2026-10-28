// Verbo Gestão — Cadastros, Usuários, Auditoria e Meu perfil
'use strict';

// Definição dos cadastros: campos do formulário e colunas da lista
const CADASTROS = {
  fornecedores: { titulo: 'Fornecedores', ordem: 'razao_social', edita: () => tem('administrador', 'financeiro', 'comprador'),
    campos: [['razao_social', 'Razão social / nome', 'texto', true], ['nome_fantasia', 'Nome fantasia'], ['documento', 'CNPJ ou CPF'],
             ['categoria', 'Categoria', 'lista', false, ['Posto de combustível', 'Oficina / peças', 'Pneus', 'Loja / material', 'Prestador de serviço', 'Aluguel / imóvel', 'Concessionária (energia, água, internet)', 'Outro']],
             ['telefone', 'Telefone'], ['email', 'E-mail'], ['chave_pix', 'Chave Pix'], ['banco', 'Banco'], ['agencia', 'Agência'], ['conta', 'Conta'],
             ['condicao_padrao', 'Condição de pagamento'], ['conta_padrao_id', 'Conta padrão do plano', 'conta']],
    colunas: ['razao_social', 'documento', 'categoria', 'telefone'] },
  clientes: { titulo: 'Clientes', ordem: 'nome', edita: editaFin,
    campos: [['nome', 'Nome / razão social', 'texto', true], ['documento', 'CNPJ ou CPF'], ['contato', 'Pessoa de contato'],
             ['email', 'E-mail'], ['telefone', 'Telefone'], ['condicao_padrao', 'Condição de pagamento (ex.: 30 dias)']],
    colunas: ['nome', 'documento', 'contato', 'telefone'] },
  plano_contas: { titulo: 'Plano de contas', ordem: 'codigo', edita: editaFin,
    campos: [['codigo', 'Código (ex.: 3.9)', 'texto', true], ['nome', 'Nome', 'texto', true],
             ['tipo', 'Tipo', 'lista', true, ['receita', 'deducao', 'custo', 'despesa', 'financeiro', 'investimento']],
             ['aceita_lancamento', 'Aceita lançamentos (desmarque para grupos)', 'bool'], ['grupo_dre', 'Linha da DRE']],
    colunas: ['codigo', 'nome', 'tipo', 'grupo_dre'] },
  centros_custo: { titulo: 'Centros de custo', ordem: 'nome', edita: editaFin,
    campos: [['codigo', 'Código', 'texto', true], ['nome', 'Nome', 'texto', true], ['responsavel_id', 'Responsável (aprovador)', 'usuario']],
    colunas: ['codigo', 'nome', 'responsavel_id'] },
  contas_bancarias: { titulo: 'Bancos e caixa', ordem: 'nome', edita: editaFin,
    campos: [['nome', 'Nome', 'texto', true], ['tipo', 'Tipo', 'lista', true, ['corrente', 'poupanca', 'caixa', 'cartao', 'aplicacao', 'fundo_fixo']],
             ['titular', 'Titular (nome de quem recebe)'], ['banco', 'Banco'], ['agencia', 'Agência'], ['conta', 'Conta'], ['chave_pix', 'Chave Pix'],
             ['responsavel_nome', 'Responsável (caixa / Fundo Fixo)'], ['saldo_inicial', 'Saldo inicial (R$)', 'valor'], ['data_saldo_inicial', 'Data do saldo inicial', 'data']],
    colunas: ['nome', 'tipo', 'banco', 'saldo_inicial'] },
  cronograma_licenciamento: { titulo: 'Calendário do CRLV (licenciamento por estado)', ordem: 'uf,categoria,final_placa', edita: () => tem('administrador'),
    campos: [['uf', 'Estado (UF)', 'lista', true, ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']],
             ['categoria', 'Calendário (geral ou caminhao)', 'lista', true, ['geral', 'caminhao']], ['final_placa', 'Final da placa (0 a 9)', 'numero', true],
             ['mes', 'Mês do vencimento (1 a 12)', 'numero', true], ['dia', 'Dia (vazio = último dia do mês)', 'numero'], ['fonte', 'Fonte (portaria / ano)']],
    colunas: ['uf', 'categoria', 'final_placa', 'mes', 'dia', 'fonte'] },
  setores: { titulo: 'Setores', ordem: 'nome', edita: () => tem('administrador', 'rh'),
    campos: [['nome', 'Nome do setor', 'texto', true], ['sigla', 'Sigla'], ['gestor_usuario_id', 'Gestor do setor', 'usuario'], ['centro_custo_id', 'Centro de custo', 'cc']],
    colunas: ['nome', 'sigla', 'gestor_usuario_id', 'centro_custo_id'] },
  cargos: { titulo: 'Cargos e funções', ordem: 'nome', edita: () => tem('administrador', 'rh', 'dp'),
    campos: [['nome', 'Nome do cargo', 'texto', true], ['cbo', 'CBO (ex.: 7825-10)'], ['setor_id', 'Setor', 'setor'],
             ['salario_base', 'Salário base (R$)', 'valor'], ['experiencia_dias', 'Contrato de experiência (dias)', 'numero', true],
             ['motorista', 'É motorista profissional (exige CNH, EAR e exame toxicológico)', 'bool', false, false],
             ['cnh_minima', 'Categoria mínima de CNH', 'lista', false, ['A', 'B', 'C', 'D', 'E']],
             ['exige_indivisiveis', 'Exige curso de transporte de cargas indivisíveis na CNH (ex.: tritrem / madeira)', 'bool', false, false], ['exige_mopp', 'Exige MOPP (produtos perigosos)', 'bool', false, false],
             ['descricao', 'Descrição das atividades', 'textoLongo'], ['requisitos', 'Requisitos (escolaridade, cursos, experiência)', 'textoLongo'],
             ['nivel', 'Nível na carreira (1, 2, 3…)', 'numero'], ['proximo_cargo_id', 'Próximo cargo na carreira (promoção)', 'cargo'], ['requisitos_promocao', 'Requisitos para promoção', 'textoLongo']],
    colunas: ['nome', 'cbo', 'setor_id', 'cnh_minima', 'experiencia_dias'] },
  rh_tipos_documento: { titulo: 'Tipos de documento do colaborador', ordem: 'ordem,nome', edita: () => tem('administrador', 'rh'),
    campos: [['nome', 'Nome do documento', 'texto', true],
             ['categoria', 'Categoria', 'lista', true, ['identificacao', 'trabalhista', 'pessoal', 'habilitacao', 'saude', 'curso', 'contrato', 'outro']],
             ['exigido_admissao', 'Exigido na admissão', 'lista', true, ['todos', 'motoristas', 'opcional', 'nao']],
             ['tem_validade', 'Tem validade (gera alerta de vencimento)', 'bool', false, false], ['validade_meses', 'Validade padrão (meses)', 'numero'],
             ['ordem', 'Ordem na lista', 'numero'], ['orientacao', 'Orientação ao colaborador', 'textoLongo']],
    colunas: ['nome', 'categoria', 'exigido_admissao', 'validade_meses'] },
};

async function valorExibido(campo, v) {
  if (v == null || v === '') return '—';
  if (campo === 'responsavel_id' || campo === 'motorista_padrao_id') return porId(await usuarios())[v]?.nome || '—';
  if (campo === 'centro_custo_id') return porId(await centros())[v]?.nome || '—';
  if (campo === 'gestor_usuario_id') return porId(await usuarios())[v]?.nome || '—';
  if (campo === 'proximo_cargo_id') return (await cargosL()).find(c => c.id === v)?.nome || '—';
  if (campo === 'setor_id') return porId(await setoresCad())[v]?.nome || '—';
  if (campo === 'categoria' && typeof CATEG_DOC_RH !== 'undefined' && CATEG_DOC_RH[v]) return CATEG_DOC_RH[v];
  if (campo === 'exigido_admissao') return ({ todos: 'Todos', motoristas: 'Só motoristas', opcional: 'Opcional', nao: 'Não' })[v] || v;
  if (campo === 'saldo_inicial') return brl(v);
  return v;
}

const setoresCad = async () => (estado.cache.setores ||= await api.listar('setores', 'order=nome'));

async function campoHTML([nome, rotulo, tipo = 'texto', obrig, ops], v) {
  const req = obrig ? 'required' : '';
  if (tipo === 'bool') return `<label class="check largo"><input type="checkbox" name="${nome}" ${v ?? (ops ?? true) ? 'checked' : ''}> ${esc(rotulo)}</label>`;
  let input;
  if (tipo === 'lista') input = `<select name="${nome}" data-valor="${esc(v ?? '')}" ${req}><option value=""></option>${ops.map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  else if (tipo === 'conta') input = `<select name="${nome}">${await opcoesContas(v)}</select>`;
  else if (tipo === 'usuario') input = `<select name="${nome}">${opcoes((await usuarios()).filter(u => u.ativo), null, u => u.nome, v, 'Nenhum')}</select>`;
  else if (tipo === 'cc') input = `<select name="${nome}">${opcoes((await centros()).filter(c => c.ativo), null, c => c.nome, v, 'Nenhum')}</select>`;
  else if (tipo === 'cargo') input = `<select name="${nome}">${opcoes((await cargosL()).filter(c => c.ativo), null, c => c.nome, v, 'Nenhum')}</select>`;
  else if (tipo === 'setor') input = `<select name="${nome}">${opcoes((await setoresCad()).filter(c => c.ativo), null, c => c.nome, v, 'Nenhum')}</select>`;
  else if (tipo === 'textoLongo') return `<label class="campo largo">${esc(rotulo)}${obrig ? ' *' : ''}<textarea name="${nome}" rows="3" ${req}>${esc(v ?? '')}</textarea></label>`;
  else if (tipo === 'data') input = `<input type="date" name="${nome}" value="${esc(v || hojeISO())}" ${req}>`;
  else if (tipo === 'valor') input = `<input name="${nome}" inputmode="decimal" value="${v != null ? String(v).replace('.', ',') : ''}" ${req}>`;
  else if (tipo === 'numero') input = `<input type="number" name="${nome}" value="${esc(v ?? '')}" ${req}>`;
  else input = `<input name="${nome}" value="${esc(v ?? '')}" ${req}>`;
  return `<label class="campo">${esc(rotulo)}${obrig ? ' *' : ''}${input}</label>`;
}

rota('/cadastros/:tabela', async (tela, tabela) => {
  const def = CADASTROS[tabela];
  if (!def) { location.hash = '#/inicio'; return; }
  const inativos = estado.params.get('inativos') === '1';
  const linhas = await api.listar(tabela, `order=${def.ordem}${inativos ? '' : '&ativo=eq.true'}`);
  const rot = Object.fromEntries(def.campos.map(c => [c[0], c[1]]));
  const celulas = await Promise.all(linhas.map(async l => Promise.all(def.colunas.map(c => valorExibido(c, l[c])))));
  tela.innerHTML = `
    <div class="topo"><div><h1>${esc(def.titulo)}</h1><p class="sub">${linhas.length} cadastro(s)</p></div>
      <div class="acoes"><a class="btn" href="#/cadastros/${tabela}${inativos ? '' : '?inativos=1'}">${inativos ? 'Ocultar inativos' : 'Mostrar inativos'}</a>
      ${def.edita() ? '<button class="btn prim" id="novo">+ Novo</button>' : ''}</div></div>
    <div class="cartao">${linhas.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr>${def.colunas.map(c => `<th>${esc(rot[c].replace(/ \(.*/, ''))}</th>`).join('')}<th></th></tr></thead><tbody>
      ${linhas.map((l, i) => `<tr class="${def.edita() ? 'clicavel' : ''}" data-i="${i}">${def.colunas.map((c, j) => `<td data-r="${esc(rot[c])}">${esc(celulas[i][j])}</td>`).join('')}<td>${l.ativo ? '' : '<span class="tag">Inativo</span>'}</td></tr>`).join('')}
    </tbody></table></div>` : '<div class="vazio">Nenhum cadastro ainda.</div>'}</div>`;
  const editar = async (l = null) => {
    const campos = (await Promise.all(def.campos.map(c => campoHTML(c, l?.[c[0]])))).join('');
    const r = await modal(`<form><h2>${l ? 'Editar' : 'Novo'} · ${esc(def.titulo)}</h2><div class="form">${campos}</div>
      <div class="rodape">${l ? `<button class="btn ${l.ativo ? 'perigo' : ''}" value="${l.ativo ? 'desativar' : 'ativar'}">${l.ativo ? 'Desativar' : 'Reativar'}</button>` : ''}
      <button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim" value="salvar">Salvar</button></div></form>`);
    if (!r) return;
    const dados = {};
    for (const [nome, , tipo] of def.campos) {
      let v = r[nome];
      if (tipo === 'valor') v = num(v) ?? 0; else if (tipo === 'numero') v = v === '' ? null : Number(v);
      else if (tipo !== 'bool' && v === '') v = null;
      dados[nome] = v;
    }
    if (r._acao === 'desativar' || r._acao === 'ativar') Object.assign(dados, { ativo: r._acao === 'ativar' });
    try {
      if (l) await api.alterar(tabela, `id=eq.${l.id}`, dados); else await api.inserir(tabela, dados);
      delete estado.cache[tabela]; aviso('Salvo.'); navegar();
    } catch (err) { falha(err.message.includes('duplicate') ? new Error('Já existe um cadastro com esse código/documento.') : err); }
  };
  $('#novo')?.addEventListener('click', () => editar());
  if (def.edita()) $$('tr[data-i]', tela).forEach(tr => (tr.onclick = () => editar(linhas[tr.dataset.i])));
});

// ===================== Usuários e perfis =====================
const PERFIS = [['administrador', 'Administrador', 'Configura tudo'], ['diretoria', 'Diretoria', 'Vê tudo e aprova acima das alçadas'],
                ['financeiro', 'Financeiro', 'Contas, pagamentos e reembolsos'], ['comprador', 'Comprador', 'Cotações, pedidos e fornecedores'],
                ['aprovador', 'Aprovador', 'Aprova o seu centro de custo'], ['solicitante', 'Solicitante', 'Lança reembolsos e pedidos'],
                ['motorista', 'Motorista', 'Abastecimentos e reembolsos de viagem'], ['operacao', 'Operação', 'Equipamentos, documentos da frota e clientes'],
                ['manutencao', 'Manutenção', 'OS, preventivas, pneus, km e custos da frota'], ['almoxarifado', 'Almoxarifado', 'Estoque, requisições, EPI e patrimônio'],
                ['rh', 'RH', 'Colaboradores, admissões, documentos e modelos'], ['dp', 'DP', 'Folha, descontos, benefícios e rescisões'],
                ['ssma', 'SSMA', 'Saúde e segurança: ASO, acidentes/CAT, inspeções, DDS e extintores'], ['qualidade', 'Qualidade', 'Documentos, não conformidades, auditorias e indicadores']];
const SETORES = ['Administrativo', 'Comercial', 'Diretoria', 'Financeiro', 'Frota', 'Operação', 'Qualidade', 'Recursos Humanos'];
const soDigitos = v => String(v || '').replace(/\D/g, '');
function cpfValido(c) {
  c = soDigitos(c);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  const dv = n => { let s = 0; for (let i = 0; i < n; i++) s += Number(c[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  return dv(9) === Number(c[9]) && dv(10) === Number(c[10]);
}
const fmtCPF = c => { c = soDigitos(c); return c.length === 11 ? `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}` : c; };
const fmtTel = t => { t = soDigitos(t); return t.length === 11 ? `(${t.slice(0, 2)}) ${t.slice(2, 7)}-${t.slice(7)}` : t.length === 10 ? `(${t.slice(0, 2)}) ${t.slice(2, 6)}-${t.slice(6)}` : t; };
const nomePerfil = p => PERFIS.find(x => x[0] === p)?.[1] || p;

function mascaras(raiz) {
  $('[name=cpf]', raiz)?.addEventListener('input', e => { const d = soDigitos(e.target.value).slice(0, 11);
    e.target.value = d.length > 9 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : d.length > 6 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}` : d.length > 3 ? `${d.slice(0, 3)}.${d.slice(3)}` : d; });
  $('[name=telefone]', raiz)?.addEventListener('input', e => { const d = soDigitos(e.target.value).slice(0, 11);
    e.target.value = d.length > 10 ? fmtTel(d) : d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d; });
}


// ---------- "+ Cadastrar novo cargo" em qualquer lista de cargos ----------
// ---------- Cargo/função: em TODO campo de cargo ou função dá para cadastrar uma opção nova ----------
const podeNovoCargo = () => tem('administrador', 'rh', 'dp');
async function modalNovoCargo(nomeSugerido = '') {
  const ss = await cad('setores', 'select=id,nome,sigla,ativo&order=nome').catch(() => []);
  const r = await modal(`<form><h2>Novo cargo / função</h2><div class="form">
    <label class="campo largo">Nome do cargo/função *<input name="nome" required value="${esc(nomeSugerido)}" placeholder="Ex.: Auxiliar de logística"></label>
    <label class="campo">CBO<input name="cbo" placeholder="Ex.: 4141-05"></label>
    <label class="campo">Setor<select name="setor"><option value="">—</option>${ss.filter(x => x.ativo).map(x => `<option value="${x.id}">${esc(x.nome)}</option>`).join('')}</select></label>
    <label class="check largo"><input type="checkbox" name="motorista"> É função de motorista (exige CNH)</label></div>
    <p class="muted">Fica disponível em todas as listas de cargo/função do sistema. Requisitos, carreira e treinamentos obrigatórios você completa depois em Cadastros › Cargos e funções.</p>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Cadastrar</button></div></form>`);
  if (!r) return null;
  try {
    const [c] = await api.inserir('cargos', { nome: r.nome.trim(), cbo: r.cbo || null, setor_id: r.setor || null, motorista: !!r.motorista });
    delete estado.cache.cargos; aviso(`Cargo/função "${c.nome}" cadastrado.`); return c;
  } catch (err) { falha(/duplicate|unique/i.test(err.message) ? new Error('Já existe um cargo/função com esse nome.') : err); return null; }
}
// lista suspensa (select) de cargo
function ligarNovoCargo(sel) {
  if (!sel || sel.dataset.novoCargo || !podeNovoCargo()) return;
  sel.dataset.novoCargo = '1';
  if (!sel.querySelector('option[value="__novo"]')) sel.insertAdjacentHTML('beforeend', '<option value="__novo">＋ Cadastrar novo cargo/função…</option>');
  let ant = sel.value === '__novo' ? '' : sel.value;
  sel.addEventListener('change', async () => {
    if (sel.value !== '__novo') { ant = sel.value; return; }
    const c = await modalNovoCargo();
    if (!c) { sel.value = ant; return; }
    // a mesma opção nova aparece nas outras listas de cargo abertas na tela
    $$('select[data-novo-cargo]').forEach(o => { const nv = o.querySelector('option[value="__novo"]'); if (nv && !o.querySelector(`option[value="${c.id}"]`)) nv.insertAdjacentHTML('beforebegin', `<option value="${c.id}">${esc(c.nome)}</option>`); });
    sel.value = c.id; ant = c.id; sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
// campo de texto de função (com sugestões): botão para cadastrar a função nova na lista oficial
function ligarNovaFuncaoTexto(inp) {
  if (!inp || inp.dataset.novoCargo || !podeNovoCargo()) return;
  inp.dataset.novoCargo = '1';
  const b = document.createElement('button'); b.type = 'button'; b.className = 'link'; b.textContent = '＋ Cadastrar nova função na lista';
  b.style.cssText = 'display:block;margin-top:4px;font-size:12px;background:none;border:0;padding:0;color:var(--verde,#0a6);cursor:pointer;text-align:left';
  b.onclick = async () => { const c = await modalNovoCargo(inp.value.trim()); if (!c) return;
    inp.value = c.nome; inp.dispatchEvent(new Event('input', { bubbles: true }));
    const dl = inp.list; if (dl && ![...dl.options].some(o => o.value === c.nome)) dl.insertAdjacentHTML('beforeend', `<option value="${esc(c.nome)}">`); };
  inp.after(b);
  if (!inp.getAttribute('list')) {   // sem lista de sugestões: usa a lista oficial de cargos
    const id = 'dl-cargos-' + Math.random().toString(36).slice(2, 8);
    inp.setAttribute('list', id); inp.insertAdjacentHTML('afterend', `<datalist id="${id}"></datalist>`);
    cargosL().then(cs => { const dl = document.getElementById(id); if (dl) dl.innerHTML = cs.filter(c => c.ativo).map(c => `<option value="${esc(c.nome)}">`).join(''); }).catch(() => {});
  }
}
// lista de marcar (chips) de cargos, ex.: treinamento obrigatório para os cargos
function ligarNovoCargoChips(box) {
  if (!box || box.dataset.novoCargo || !podeNovoCargo()) return;
  box.dataset.novoCargo = '1';
  const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = '＋ Novo cargo/função';
  b.onclick = async () => { const c = await modalNovoCargo(); if (!c) return;
    b.insertAdjacentHTML('beforebegin', `<label class="chip"><input type="checkbox" name="cg_${c.id}" checked> ${esc(c.nome)}</label>`); };
  box.append(b);
}
function prepararCargos() {
  if (!estado.usuario || !podeNovoCargo()) return;
  $$('select[name*="cargo"]:not([data-novo-cargo])').forEach(ligarNovoCargo);
  $$('input[name="cargo"]:not([type=hidden]):not([data-novo-cargo]), input[name="cargo_pretendido"]:not([data-novo-cargo]), input[name="funcao"]:not([data-novo-cargo])').forEach(ligarNovaFuncaoTexto);
  $$('.chips:not([data-novo-cargo])').forEach(c => { if (c.querySelector('input[name^="cg_"]')) ligarNovoCargoChips(c); });
}
let _cargoPend = false;
new MutationObserver(() => { if (_cargoPend) return; _cargoPend = true; setTimeout(() => { _cargoPend = false; try { prepararCargos(); } catch (e) { } }, 30); })
  .observe(document.documentElement, { childList: true, subtree: true });

// ---------- Usuário puxa os dados do cadastro do RH (pelo CPF ou pelo nome completo) ----------
async function puxarDoRH(raiz) {
  const f = $('form', raiz), info = $('#colab-info', raiz);
  const preencher = async filtro => {
    const cs = await api.listar('colaboradores', `select=id,nome,cpf,telefone,email,email_corporativo,pix_chave,centro_custo_id,usuario_id,cargo:cargos(nome),setor:setores(nome)&ativo=eq.true&${filtro}&limit=2`).catch(() => []);
    if (cs.length !== 1) return;
    const c = cs[0], set = (n, v) => { if (v && f[n] && !f[n].value) { f[n].value = v; f[n].dispatchEvent(new Event('input', { bubbles: true })); } };
    set('nome', c.nome); set('cpf', c.cpf); set('telefone', c.telefone); set('email', c.email_corporativo || c.email); set('chave_pix', c.pix_chave);
    set('cargo', c.cargo?.nome); set('setor', c.setor?.nome); if (c.centro_custo_id && f.cc && !f.cc.value) f.cc.value = c.centro_custo_id;
    f.colab_id.value = c.id;
    info.innerHTML = `✔ Dados puxados do cadastro do RH: <b>${esc(c.nome)}</b>${c.usuario_id ? ' <span class="tag amarelo">já ligado a outro usuário</span>' : ' — o usuário fica ligado a este colaborador.'}`;
  };
  f.cpf?.addEventListener('input', () => { const d = soDigitos(f.cpf.value); if (d.length === 11 && cpfValido(d)) preencher('cpf=eq.' + d); });
  f.nome?.addEventListener('change', () => { const n = f.nome.value.trim(); if (n.split(/\s+/).length >= 2) preencher('nome=ilike.' + encodeURIComponent(n)); });
}

function formUsuario(u, atuais, ccs, funcoes) {
  const novo = !u;
  return `<form><h2>${novo ? 'Cadastrar e convidar usuário' : esc(u.nome)}</h2>
    ${novo ? '<p class="muted">Depois de cadastrar, você envia o link de acesso pelo <b>WhatsApp</b> (para o telefone informado) e/ou por e-mail. A pessoa cria a senha e já entra com os perfis marcados. Se ela já está no cadastro do RH, digite o CPF (ou o nome completo): os dados vêm de lá.</p>' : ''}
    <div class="form"><input type="hidden" name="colab_id"><div class="largo muted" id="colab-info"></div>
      <label class="campo largo">Nome completo *<input name="nome" value="${esc(u?.nome || '')}" required autocomplete="off"></label>
      <label class="campo">CPF *<input name="cpf" value="${esc(fmtCPF(u?.cpf))}" inputmode="numeric" placeholder="000.000.000-00" required></label>
      <label class="campo" id="campo-email">E-mail *<input type="email" name="email" ${ehLoginCPF(u?.email) ? '' : 'required'} autocomplete="off" value="${esc(emailReal(u?.email))}">${novo ? '' : '<span class="muted">Se estiver errado, corrija aqui e salve: o login passa a ser o e-mail novo.</span>'}</label>
      <label class="check largo" style="align-items:flex-start"><input type="checkbox" name="login_cpf" ${ehLoginCPF(u?.email) ? 'checked' : ''}>
        <span><b>Não tem e-mail próprio — entra com o CPF</b><br><span class="muted">Para quem usa e-mail compartilhado (ex.: e-mail do setor). A pessoa entra digitando o CPF e a senha; o link para criar a senha vai pelo WhatsApp.</span></span></label>
      <label class="campo">Função *<input name="cargo" value="${esc(u?.cargo || '')}" list="lista-funcoes" required placeholder="Ex.: Motorista, Analista financeiro"></label>
      <label class="campo">Setor *<input name="setor" value="${esc(u?.setor || '')}" list="lista-setores" required></label>
      <label class="campo">Centro de custo<select name="cc">${opcoes(ccs.filter(c => c.ativo), null, c => c.nome, u?.centro_custo_id, 'Não informar')}</select></label>
      <label class="campo">Telefone *<input name="telefone" value="${esc(fmtTel(u?.telefone))}" inputmode="tel" placeholder="(00) 00000-0000" required></label>
      <label class="campo largo">Chave Pix para reembolsos<input name="chave_pix" value="${esc(u?.chave_pix || '')}" placeholder="CPF, e-mail, telefone ou chave aleatória"></label>
      <div class="largo"><div class="muted" style="margin-bottom:6px">Perfis de acesso *</div>
        <div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px">${PERFIS.map(([v, t, d]) => `<label class="check" style="align-items:flex-start"><input type="checkbox" name="p_${v}" ${atuais.includes(v) ? 'checked' : ''} ${v === 'administrador' && u?.id === estado.usuario.id ? 'disabled' : ''}>
          <span><b>${t}</b><br><span class="muted">${d}</span></span></label>`).join('')}</div></div>
      <div class="largo"><div class="muted" style="margin-bottom:6px">Telas que pode acessar</div>
        <label class="check"><input type="checkbox" name="menus_padrao" ${!u?.menus?.length ? 'checked' : ''}> Todas as telas liberadas pelos perfis marcados</label>
        <div id="lista-menus" class="grade" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:4px 12px;margin-top:8px" ${!u?.menus?.length ? 'hidden' : ''}>
          ${MENU.map((i, k) => i[0] === 'grupo' ? `<div class="menu-titulo" style="grid-column:1/-1;font-weight:700;margin-top:6px">${i[2] || ''} ${esc(i[1])}</div>`
            : i[0] === 'sub' ? `<div class="muted" style="grid-column:1/-1;font-size:12px;text-transform:uppercase;letter-spacing:.05em;margin-top:2px">${esc(i[1])}</div>`
            : `<label class="check"><input type="checkbox" name="m_${k}" data-perfis="${(i[2] || []).join(',')}" ${!u?.menus?.length || u.menus.includes(i[1]) ? 'checked' : ''}> ${esc(i[0])}</label>`).join('')}
        </div>
        <p class="muted" style="margin-top:6px">O perfil define o que a pessoa pode fazer; aqui você escolhe quais telas aparecem para ela.</p></div>
    </div>
    <datalist id="lista-setores">${[...new Set([...SETORES, ...funcoes.setores])].sort().map(x => `<option value="${esc(x)}">`).join('')}</datalist>
    <datalist id="lista-funcoes">${funcoes.cargos.map(x => `<option value="${esc(x)}">`).join('')}</datalist>
    <div class="rodape">${!novo && u.id !== estado.usuario.id ? `<button class="btn ${u.ativo ? 'perigo' : ''}" value="${u.ativo ? 'desativar' : 'ativar'}" formnovalidate>${u.ativo ? 'Desativar acesso' : 'Reativar acesso'}</button>
      <button class="btn" value="reenviar" formnovalidate>Reenviar convite por e-mail</button><button class="btn" value="whatsapp" formnovalidate>📲 Enviar acesso pelo WhatsApp</button>` : ''}
      <button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim" value="salvar">${novo ? 'Cadastrar e enviar convite' : 'Salvar'}</button></div></form>`;
}

function ligarMenus(raiz) {
  const atualiza = () => {
    if (!$('[name=menus_padrao]', raiz)) return;   // janela já fechada
    const perfis = PERFIS.map(p => p[0]).filter(p => $(`[name=p_${p}]`, raiz)?.checked);
    $('#lista-menus', raiz).hidden = $('[name=menus_padrao]', raiz).checked;
    $$('[data-perfis]', raiz).forEach(c => { const req = c.dataset.perfis ? c.dataset.perfis.split(',') : null;
      const pode = !req || req.some(p => perfis.includes(p)); c.disabled = !pode; c.closest('label').style.opacity = pode ? 1 : .45; });
  };
  raiz.addEventListener('change', atualiza); atualiza();
}
const menusEscolhidos = r => r.menus_padrao ? null : MENU.filter((i, k) => i[0] !== 'grupo' && i[0] !== 'sub' && r['m_' + k]).map(i => i[1]);
function ligarLoginCPF(raiz) {
  const cb = $('[name=login_cpf]', raiz), em = $('[name=email]', raiz); if (!cb || !em) return;
  const at = () => { $('#campo-email', raiz).style.display = cb.checked ? 'none' : ''; em.required = !cb.checked; const b = $('button[value=reenviar]', raiz); if (b) b.hidden = cb.checked; };
  cb.onchange = at; at();
}
const aoAbrirUsuario = raiz => { mascaras(raiz); ligarMenus(raiz); puxarDoRH(raiz); ligarLoginCPF(raiz); };
// e-mail de login que o formulário vai usar (o próprio ou o login interno pelo CPF)
const loginDoForm = r => r.login_cpf ? emailDoCPF(r.cpf) : String(r.email || '').trim().toLowerCase();

function validarUsuario(r, todos, id) {
  const perfis = PERFIS.map(p => p[0]).filter(p => r['p_' + p]);
  if (!cpfValido(r.cpf)) return 'CPF inválido. Confira os números.';
  if (todos.some(x => x.cpf === soDigitos(r.cpf) && x.id !== id)) return 'Já existe um usuário com este CPF.';
  if (soDigitos(r.telefone).length < 10) return 'Telefone incompleto: informe DDD e número.';
  if (!perfis.length) return 'Marque pelo menos um perfil de acesso.';
  if (!r.login_cpf && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(r.email || '').trim())) return 'Informe o e-mail ou marque "entra com o CPF".';
  if (!r.login_cpf && ehLoginCPF(r.email)) return 'Esse endereço é reservado ao login por CPF. Marque "entra com o CPF".';
  return null;
}

async function salvarPerfis(id, sel, atuais) {
  const tirar = atuais.filter(p => !sel.includes(p)), por = sel.filter(p => !atuais.includes(p));
  if (tirar.length) await api.excluir('usuario_perfis', `usuario_id=eq.${id}&perfil=in.(${tirar.join(',')})`);
  if (por.length) await api.inserir('usuario_perfis', por.map(p => ({ usuario_id: id, perfil: p })));
}

rota('/config/usuarios', async tela => {
  if (!tem('administrador')) { tela.innerHTML = '<div class="cartao vazio">Somente o administrador gerencia usuários.</div>'; return; }
  const [us, ps, ccs] = await Promise.all([api.listar('usuarios', 'select=*&order=nome'), api.listar('usuario_perfis', 'select=*'), centros()]);
  const perfisDe = id => ps.filter(p => p.usuario_id === id).map(p => p.perfil);
  const cgsT = await cad('cargos', 'select=id,nome,cbo,setor_id,motorista,cnh_minima,experiencia_dias,proximo_cargo_id,requisitos_promocao,ativo&order=nome').catch(() => []);
  const sesT = await cad('setores', 'select=id,nome,sigla,ativo&order=nome').catch(() => []);
  const funcoes = { cargos: [...new Set([...cgsT.filter(c => c.ativo).map(c => c.nome), ...us.map(u => u.cargo).filter(Boolean)])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
                    setores: [...us.map(u => u.setor).filter(Boolean), ...sesT.filter(x => x.ativo).map(x => x.nome)] };
  const filtro = estado.params.get('ver') || 'ativos';
  const lista_ = us.filter(u => filtro === 'todos' || (filtro === 'ativos' ? u.ativo : !u.ativo));
  tela.innerHTML = `
    <div class="topo"><div><h1>Usuários e perfis</h1><p class="sub">${us.filter(u => u.ativo).length} usuário(s) ativo(s)</p></div>
      <div class="acoes"><select id="ver" style="width:auto">${[['ativos', 'Ativos'], ['inativos', 'Inativos'], ['todos', 'Todos']].map(([v, t]) => `<option value="${v}" ${v === filtro ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <button class="btn prim" id="convidar">+ Cadastrar usuário</button></div></div>
    <div class="cartao"><div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nome</th><th>Função · Setor</th><th>CPF</th><th>Contato</th><th>Perfis</th><th></th></tr></thead><tbody>
      ${lista_.map(u => `<tr class="clicavel" data-id="${u.id}"><td data-r="Nome"><b>${esc(u.nome)}</b></td>
        <td data-r="Função · Setor">${esc([u.cargo, u.setor].filter(Boolean).join(' · ') || '—')}</td>
        <td data-r="CPF" class="nowrap">${esc(fmtCPF(u.cpf) || '—')}</td>
        <td data-r="Contato">${ehLoginCPF(u.email) ? '<span class="tag">entra com CPF</span>' : esc(u.email)}${u.telefone ? `<br><span class="muted">${esc(fmtTel(u.telefone))}</span>` : ''}</td>
        <td data-r="Perfis">${perfisDe(u.id).map(p => `<span class="tag azul">${esc(nomePerfil(p))}</span>`).join(' ') || '<span class="tag amarelo">Sem perfil</span>'}</td>
        <td>${u.ativo ? '' : '<span class="tag">Inativo</span>'}</td></tr>`).join('') || '<tr><td colspan="6" class="vazio">Nenhum usuário.</td></tr>'}
    </tbody></table></div></div>`;
  $('#ver').onchange = e => (location.hash = '#/config/usuarios?ver=' + e.target.value);

  $('#convidar').onclick = async () => {
    const r = await modal(formUsuario(null, ['solicitante'], ccs, funcoes), { aoAbrir: aoAbrirUsuario,
      validar: d => validarUsuario(d, us, null) || (us.some(x => x.email.toLowerCase() === loginDoForm(d))
        ? (d.login_cpf ? 'Já existe um login com este CPF.' : 'Este e-mail já está cadastrado. Se várias pessoas usam o mesmo e-mail, marque "entra com o CPF" para cada uma.') : null) });
    if (!r) return;
    try {
      const email = loginDoForm(r);
      if (r.login_cpf) await api.acessoUsuario('criar', null, { email, nome: r.nome });   // login por CPF: não manda e-mail
      else try { await api.convidar(email, r.nome); }
      catch (e) { console.warn('convite por e-mail falhou', e); await api.acessoUsuario('criar', null, { email, nome: r.nome }); }
      const novo = await api.um('usuarios', `email=eq.${encodeURIComponent(email)}`);
      if (!novo) throw new Error('O convite foi enviado, mas o cadastro não apareceu. Atualize a página.');
      await api.alterar('usuarios', `id=eq.${novo.id}`, { nome: r.nome, cpf: soDigitos(r.cpf), cargo: r.cargo, setor: r.setor,
        centro_custo_id: r.cc || null, telefone: soDigitos(r.telefone), chave_pix: r.chave_pix || null, ativo: true, menus: menusEscolhidos(r) });
      await salvarPerfis(novo.id, PERFIS.map(p => p[0]).filter(p => r['p_' + p]), []);
      if (r.colab_id) await api.alterar('colaboradores', `id=eq.${r.colab_id}&usuario_id=is.null`, { usuario_id: novo.id }).catch(() => null);
      delete estado.cache.usuarios; aviso('Usuário cadastrado.');
      await enviarAcesso({ ...novo, nome: r.nome, telefone: soDigitos(r.telefone), email }, !r.login_cpf ? true : 'cpf'); navegar();
    } catch (err) { falha(err); }
  };

  $$('tr[data-id]', tela).forEach(tr => (tr.onclick = async () => {
    const u = us.find(x => x.id === tr.dataset.id), atuais = perfisDe(u.id);
    const r = await modal(formUsuario(u, atuais, ccs, funcoes), { aoAbrir: aoAbrirUsuario,
      validar: d => d._acao === 'salvar' ? validarUsuario(d, us, u.id) : null });
    if (!r) return;
    try {
      if (r._acao === 'reenviar' && ehLoginCPF(u.email)) { aviso('Este usuário entra com o CPF: use "Enviar acesso pelo WhatsApp".', true); return; }
      if (r._acao === 'reenviar') { await api.convidar(u.email, u.nome); aviso('Convite reenviado para ' + u.email + '. Se não chegar, use "Enviar acesso pelo WhatsApp".'); return; }
      if (r._acao === 'whatsapp') return enviarAcesso(u, false);
      if (r._acao === 'desativar' || r._acao === 'ativar') {
        await api.alterar('usuarios', `id=eq.${u.id}`, { ativo: r._acao === 'ativar' });
      } else {
        const novoEmail = loginDoForm(r);
        if (novoEmail && novoEmail !== String(u.email || '').toLowerCase()) {
          if (us.some(x => x.id !== u.id && String(x.email).toLowerCase() === novoEmail)) throw new Error(r.login_cpf ? 'Já existe outro login com este CPF.' : 'Já existe outro usuário com esse e-mail.');
          await api.acessoUsuario('alterar_email', u.id, { email: novoEmail });
          aviso(r.login_cpf ? `Agora ${u.nome.split(' ')[0]} entra com o CPF. A senha continua a mesma.` : `E-mail corrigido para ${novoEmail}. Envie o acesso de novo.`);
        }
        await api.alterar('usuarios', `id=eq.${u.id}`, { nome: r.nome, cpf: soDigitos(r.cpf), cargo: r.cargo, setor: r.setor,
          centro_custo_id: r.cc || null, telefone: soDigitos(r.telefone), chave_pix: r.chave_pix || null, menus: menusEscolhidos(r) });
        const sel = PERFIS.map(p => p[0]).filter(p => r['p_' + p] || (p === 'administrador' && u.id === estado.usuario.id && atuais.includes(p)));
        await salvarPerfis(u.id, sel, atuais);
        if (r.colab_id) await api.alterar('colaboradores', `id=eq.${r.colab_id}&usuario_id=is.null`, { usuario_id: u.id }).catch(() => null);
      }
      delete estado.cache.usuarios; aviso('Usuário atualizado.'); navegar();
    } catch (err) { falha(err); }
  }));
});

// ----- Enviar o link de acesso pelo WhatsApp (sem depender do e-mail) -----
const foneWhats = t => { let d = String(t || '').replace(/\D/g, ''); if (d.length === 10 || d.length === 11) d = '55' + d; return d.length >= 12 ? d : ''; };
async function enviarAcesso(u, recemCriado) {
  let link;
  try { const r = await api.acessoUsuario('link', u.id); link = api.linkAcessoDe(r.token); }
  catch (err) { return falha(err); }
  const fone = foneWhats(u.telefone), primeiro = String(u.nome || '').trim().split(/\s+/)[0] || '';
  const msg = `Olá, ${primeiro}! Seu acesso ao sistema *Verbo Gestão* (Verbo Logística) está pronto.\n\n` +
    `Toque no link abaixo para criar a sua senha (vale por 1 hora e só pode ser usado uma vez):\n${link}\n\n` +
    (ehLoginCPF(u.email) ? `Depois, entre sempre por ${APP_URL} digitando o seu *CPF* (só os números) no lugar do e-mail, e a senha que você criou.`
      : `Depois, entre sempre por ${APP_URL} com o e-mail *${u.email}* e a senha que você criou.`);
  const wa = `https://wa.me/${fone}?text=${encodeURIComponent(msg)}`;
  await modal(`<form><h2>${recemCriado ? 'Usuário cadastrado — enviar o acesso' : 'Enviar acesso pelo WhatsApp'}</h2>
    <p>Para <b>${esc(u.nome)}</b> · ${fone ? `WhatsApp <b>${esc(fmtTel(u.telefone))}</b>` : '<span style="color:var(--vermelho)">sem telefone válido no cadastro</span>'} · login <b>${esc(loginDe(u))}</b></p>
    ${fone ? `<p><a class="btn prim" href="${esc(wa)}" target="_blank" rel="noopener">📲 Abrir o WhatsApp com a mensagem pronta</a></p>` : ''}
    <p class="muted">A mensagem já vai escrita: é só tocar em enviar no WhatsApp. O link vale por <b>1 hora</b> e só funciona uma vez — se expirar, gere outro aqui.
      ${recemCriado === true ? 'O convite também foi enviado por e-mail, mas e-mails de fora da empresa podem não chegar.' : recemCriado === 'cpf' ? 'Esta pessoa entra com o <b>CPF</b>: o acesso só vai por aqui (não há e-mail).' : ''}</p>
    <label class="campo">Ou copie a mensagem e envie por outro meio<textarea rows="6" readonly id="ac-msg">${esc(msg)}</textarea></label>
    <div class="rodape"><button type="button" class="btn" id="ac-copiar">Copiar mensagem</button><button type="button" class="btn" data-fechar>Fechar</button></div></form>`,
    { aoAbrir: f => { $('#ac-copiar', f).onclick = async () => { try { await navigator.clipboard.writeText(msg); aviso('Mensagem copiada.'); } catch { $('#ac-msg', f).select(); document.execCommand('copy'); aviso('Mensagem copiada.'); } }; } });
}

// ===================== Auditoria =====================
const NOMES_TABELA = { reembolsos: 'Reembolso', titulos: 'Conta a pagar', titulo_parcelas: 'Parcela', baixas: 'Pagamento', usuarios: 'Usuário',
  usuario_perfis: 'Perfil de usuário', aprovacoes: 'Aprovação', fornecedores: 'Fornecedor', plano_contas: 'Plano de contas', centros_custo: 'Centro de custo',
  contas_bancarias: 'Conta bancária', anexos: 'Anexo', movimentos_bancarios: 'Movimento bancário', configuracoes: 'Configuração', alcadas: 'Alçada' };

rota('/config/auditoria', async tela => {
  const tab = estado.params.get('tabela') || '';
  const linhas = await api.listar('auditoria', `order=id.desc&limit=300${tab ? '&tabela=eq.' + tab : ''}`);
  const nomes = porId(await usuarios());
  const resumo = l => { const d = l.dados_depois || l.dados_antes || {}; return d.numero || d.nome || d.razao_social || d.codigo || d.perfil || d.titulo || ''; };
  const mudou = l => l.acao !== 'UPDATE' ? '' : Object.keys(l.dados_depois || {}).filter(k => !['atualizado_em', 'atualizado_por'].includes(k)
    && JSON.stringify(l.dados_depois[k]) !== JSON.stringify(l.dados_antes?.[k])).join(', ');
  tela.innerHTML = `
    <div class="topo"><div><h1>Auditoria</h1><p class="sub">Últimas 300 alterações${tab ? ' em ' + esc(NOMES_TABELA[tab] || tab) : ''}</p></div>
      <select id="tab" style="width:auto"><option value="">Todas as tabelas</option>${Object.entries(NOMES_TABELA).map(([k, v]) => `<option value="${k}" ${k === tab ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
    <div class="cartao"><div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Quando</th><th>Quem</th><th>O quê</th><th>Ação</th><th>Campos alterados</th></tr></thead><tbody>
      ${linhas.map(l => `<tr><td data-r="Quando" class="nowrap">${dataHoraBR(l.data_hora)}</td><td data-r="Quem">${esc(nomes[l.usuario_id]?.nome || 'Sistema')}</td>
        <td data-r="O quê">${esc(NOMES_TABELA[l.tabela] || l.tabela)} ${esc(resumo(l))}</td><td data-r="Ação">${{ INSERT: 'Criou', UPDATE: 'Alterou', DELETE: 'Removeu' }[l.acao]}</td>
        <td data-r="Campos" class="muted">${esc(mudou(l))}</td></tr>`).join('')}
    </tbody></table></div></div>`;
  $('#tab').onchange = e => (location.hash = '#/config/auditoria' + (e.target.value ? '?tabela=' + e.target.value : ''));
});

// ===================== Meu perfil =====================
rota('/perfil', async tela => {
  const u = estado.usuario;
  const cc = (await centros()).find(c => c.id === u.centro_custo_id);
  tela.innerHTML = `
    <div class="topo"><div><h1>Meu perfil</h1><p class="sub">${esc(loginDe(u))} · ${estado.perfis.map(nomePerfil).join(', ')}</p></div></div>
    <div class="cartao"><div class="form">
      <div><div class="muted">CPF</div><b>${esc(fmtCPF(u.cpf) || '—')}</b></div>
      <div><div class="muted">Função</div><b>${esc(u.cargo || '—')}</b></div>
      <div><div class="muted">Setor</div><b>${esc(u.setor || '—')}</b></div>
      <div><div class="muted">Centro de custo</div><b>${esc(cc?.nome || '—')}</b></div>
      <div class="largo muted">Para corrigir CPF, função, setor ou centro de custo, fale com o administrador.</div></div></div>
    <form class="cartao form" id="f-perfil">
      <label class="campo">Nome completo<input name="nome" value="${esc(u.nome)}" required></label>
      <label class="campo">Telefone<input name="telefone" value="${esc(fmtTel(u.telefone))}" inputmode="tel"></label>
      <label class="campo largo">Chave Pix (para receber reembolsos)<input name="chave_pix" value="${esc(u.chave_pix || '')}"></label>
      <div class="largo"><button class="btn prim">Salvar</button></div></form>
    <form class="cartao form" id="f-senha2"><h2 class="largo" style="margin:0">Trocar senha</h2>
      <label class="campo">Nova senha<input type="password" name="s1" minlength="8" autocomplete="new-password" required></label>
      <label class="campo">Repita<input type="password" name="s2" minlength="8" autocomplete="new-password" required></label>
      <div class="largo"><button class="btn">Trocar senha</button></div></form>`;
  mascaras(tela);
  $('#f-perfil').onsubmit = async e => { e.preventDefault(); const d = formDados(e.target);
    try { const [n] = await api.alterar('usuarios', `id=eq.${u.id}`, { nome: d.nome, telefone: soDigitos(d.telefone) || null, chave_pix: d.chave_pix || null });
          Object.assign(estado.usuario, n); aviso('Perfil salvo.'); navegar(); } catch (err) { falha(err); } };
  $('#f-senha2').onsubmit = async e => { e.preventDefault(); const d = formDados(e.target);
    if (d.s1 !== d.s2) return aviso('As senhas não são iguais.', true);
    try { await api.definirSenha(d.s1); e.target.reset(); aviso('Senha alterada.'); } catch (err) { falha(err); } };
});

// ===================== Início do app =====================
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
iniciar();
