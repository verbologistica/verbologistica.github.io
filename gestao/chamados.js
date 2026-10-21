// Verbo Gestão — Chamados: pedidos de inclusão/alteração no sistema
'use strict';

const ST_CHA = { aberto: ['Aberto', 'amarelo'], em_analise: ['Em análise', 'azul'], aguardando_info: ['Aguardando informação', 'vermelho'],
  em_andamento: ['Em andamento', 'azul'], concluido: ['Concluído', 'verde'], cancelado: ['Cancelado', ''] };
const PRI_CHA = { baixa: ['Baixa', ''], normal: ['Normal', ''], alta: ['Alta', 'amarelo'], urgente: ['Urgente', 'vermelho'] };
const tagCha = (m, k) => `<span class="tag ${m[k]?.[1] || ''}">${m[k]?.[0] || k}</span>`;
let _atende = null;
const atendeChamados = async () => (_atende ??= await api.rpc('atende_chamados').catch(() => false));
const dataHoraCha = iso => iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// anexos do chamado vão no arquivo original (sem reduzir imagem)
async function anexarChamado(id, arquivos, links) {
  for (const f of arquivos || []) {
    const caminho = `chamado/${id}/${Date.now()}-${nomeArquivo(f.name)}`;
    await api.enviarArquivo(caminho, f);
    await api.inserir('anexos', { entidade: 'chamado', entidade_id: id, caminho_arquivo: caminho, nome_original: f.name, tipo_mime: f.type || 'application/octet-stream', tamanho_bytes: f.size, enviado_por: estado.usuario.id });
  }
  if (links) await anexarLinks('chamado', id, links);
}

// bloco do Início para quem atende
function htmlChamadosInicio(lista) {
  if (!lista?.length) return '';
  return `<div class="cartao cha-inicio"><div class="topo" style="margin:0 0 8px"><div><h2 style="margin:0">Chamados abertos</h2>
      <p class="muted" style="margin:2px 0 0">${lista.length} chamado(s) aguardando você${lista.some(c => c.prioridade === 'urgente') ? ' · <b class="txt-verm">há urgente</b>' : ''}</p></div><a class="btn peq" href="#/chamados">Ver todos</a></div>
    <div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nº</th><th>Chamado</th><th>Responsável</th><th>Setor</th><th>Aberto em</th><th>Situação</th></tr></thead><tbody>
    ${lista.map(c => `<tr class="clicavel" onclick="location.hash='#/chamados/ver/${c.id}'"><td data-r="Nº" class="nowrap"><b>${esc(c.numero)}</b></td>
      <td data-r="Chamado">${esc(c.titulo)}${c.anexos ? ` <span class="muted">· 📎 ${c.anexos}</span>` : ''}${c.analisado ? ' <span class="tag azul">analisado</span>' : ''}</td>
      <td data-r="Responsável">${esc(c.solicitante || '—')}</td><td data-r="Setor">${esc(c.setor || '—')}</td>
      <td data-r="Aberto em" class="nowrap">${dataHoraCha(c.criado_em)}</td><td data-r="Situação">${c.prioridade !== 'normal' ? tagCha(PRI_CHA, c.prioridade) + ' ' : ''}${tagCha(ST_CHA, c.status)}</td></tr>`).join('')}
    </tbody></table></div></div>`;
}

// ---------- lista ----------
rota('/chamados', async tela => {
  const atende = await atendeChamados();
  const sts = pLista('status', atende ? 'abertos' : 'todos');
  const mapa = { abertos: 'status=not.in.(concluido,cancelado)', concluidos: 'status=eq.concluido', todos: 'status=neq.cancelado', cancelados: 'status=eq.cancelado' };
  const filtro = filtroOu(sts.map(s => mapa[s] ?? mapa.todos)) || mapa.todos;
  const ls = await api.listar('chamados', `select=*,sol:usuarios!chamados_solicitante_id_fkey(nome)&${filtro}${atende ? '' : '&solicitante_id=eq.' + estado.usuario.id}&order=criado_em.desc&limit=500`);
  const qa = await api.listar('anexos', `select=entidade_id&entidade=eq.chamado&cancelado_em=is.null${ls.length ? '&entidade_id=' + lista(ls.map(c => c.id)) : '&entidade_id=is.null'}`).catch(() => []);
  const nAnx = {}; qa.forEach(a => { nAnx[a.entidade_id] = (nAnx[a.entidade_id] || 0) + 1; });
  tela.innerHTML = `
    <div class="topo"><div><h1>${atende ? 'Chamados' : 'Meus chamados'}</h1><p class="sub">${atende ? 'Pedidos de inclusão e alteração no sistema enviados pelos usuários' : 'Peça uma inclusão ou alteração no sistema e acompanhe a resposta'}</p></div>
      <a class="btn prim" href="#/chamados/novo">+ Abrir chamado</a></div>
    <form class="filtros" id="filtros"><select name="status">${[['abertos', 'Em aberto'], ['concluidos', 'Concluídos'], ['todos', 'Todos'], ['cancelados', 'Cancelados']].map(([v, t]) => `<option value="${v}" ${sts.length === 1 && sts[0] === v ? 'selected' : ''}>${t}</option>`).join('')}</select><button class="btn">Filtrar</button></form>
    <div class="cartao">${ls.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nº</th><th>Título</th>${atende ? '<th>Responsável</th><th>Setor</th>' : ''}<th>Aberto em</th><th>Prioridade</th><th>Situação</th></tr></thead><tbody>
      ${ls.map(c => `<tr class="clicavel" data-cha="${c.id}" onclick="location.hash='#/chamados/ver/${c.id}'"${fAttr('sol', c.sol?.nome)}${fAttr('setor', c.setor)}${fAttr('sit', ST_CHA[c.status]?.[0])}${fAttr('pri', PRI_CHA[c.prioridade]?.[0])}${fAttr('data', (c.criado_em || '').slice(0, 10))}${fAttr('busca', [c.numero, c.titulo, c.descricao, c.sol?.nome, c.setor].join(' '))}>
        <td data-r="Nº" class="nowrap"><b>${esc(c.numero)}</b></td><td data-r="Título">${esc(c.titulo)}${nAnx[c.id] ? ` <span class="muted">· 📎 ${nAnx[c.id]}</span>` : ''}${atende && c.analise ? ' <span class="tag azul">analisado</span>' : ''}</td>
        ${atende ? `<td data-r="Responsável">${esc(c.sol?.nome || '—')}</td><td data-r="Setor">${esc(c.setor || '—')}</td>` : ''}
        <td data-r="Aberto em" class="nowrap">${dataHoraCha(c.criado_em)}</td><td data-r="Prioridade">${tagCha(PRI_CHA, c.prioridade)}</td><td data-r="Situação">${tagCha(ST_CHA, c.status)}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="vazio">Nenhum chamado.</div>'}</div>`;
  $('#filtros').onsubmit = e => { e.preventDefault(); location.hash = '#/chamados?status=' + formDados(e.target).status; };
  filtroLocal(tela, { itens: 'tbody tr[data-cha]', antes: '.cartao', campos: atende ? [{ k: 'sol', rotulo: 'Responsável' }, { k: 'setor', rotulo: 'Setor' }, { k: 'pri', rotulo: 'Prioridade' }, { k: 'sit', rotulo: 'Situação' }] : [{ k: 'sit', rotulo: 'Situação' }], periodo: true, rotuloPeriodo: 'Abertura' });
});

// ---------- novo ----------
rota('/chamados/novo', async tela => {
  tela.innerHTML = `
    <div class="topo"><div><h1>Abrir chamado</h1><p class="sub">Descreva o que precisa ser incluído ou alterado no sistema. Anexe prints, planilhas, documentos ou links que ajudem a entender.</p></div></div>
    <form class="cartao form" id="f-cha">
      <label class="campo largo">Título *<input name="titulo" required maxlength="140" placeholder="Ex.: Incluir campo de placa no lançamento de reembolso"></label>
      <label class="campo">Prioridade<select name="prioridade">${Object.entries(PRI_CHA).map(([k, [t]]) => `<option value="${k}" ${k === 'normal' ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo">Setor<input name="setor" placeholder="Preenchido pelo seu cadastro, se vazio"></label>
      <label class="campo largo">Descrição *<textarea name="descricao" rows="7" required placeholder="O que precisa, onde no sistema, como funciona hoje e como deveria funcionar. Se for erro, conte o passo a passo."></textarea></label>
      <label class="campo largo">Anexos (qualquer formato)<input type="file" name="arquivos" multiple></label>
      <label class="campo largo">Links<input name="links" placeholder="Cole um ou mais links (Drive, SharePoint, site…), separados por espaço"></label>
      <div class="largo acoes"><button class="btn prim">Enviar chamado</button><a class="btn" href="#/chamados">Cancelar</a></div>
    </form>`;
  const f = $('#f-cha');
  f.onsubmit = async e => {
    e.preventDefault(); const d = formDados(f);
    if (!d.titulo.trim() || !d.descricao.trim()) return aviso('Preencha título e descrição.', true);
    await ocupado(e.submitter, async () => {
      try {
        const [c] = await api.inserir('chamados', { titulo: d.titulo.trim(), descricao: d.descricao.trim(), prioridade: d.prioridade, setor: d.setor?.trim() || null });
        await anexarChamado(c.id, d.arquivos, d.links);
        aviso(`Chamado ${c.numero} enviado.`); location.hash = '#/chamados/ver/' + c.id;
      } catch (err) { falha(err); }
    });
  };
});

// ---------- detalhe ----------
rota('/chamados/ver/:id', async (tela, id) => {
  const atende = await atendeChamados();
  const c = await api.um('chamados', `select=*,sol:usuarios!chamados_solicitante_id_fkey(nome,email,cargo)&id=eq.${id}`);
  if (!c) { tela.innerHTML = '<div class="cartao vazio">Chamado não encontrado ou sem acesso.</div>'; return; }
  const [msgs, anx, us] = await Promise.all([api.listar('chamado_mensagens', `chamado_id=eq.${id}&order=criado_em`), htmlAnexos('chamado', id), usuarios()]);
  const nomes = porId(us); const dono = c.solicitante_id === estado.usuario.id;
  const aberto = !['concluido', 'cancelado'].includes(c.status);
  tela.innerHTML = `
    <div class="topo"><div><h1>${esc(c.numero)} · ${esc(c.titulo)}</h1><p class="sub">${tagCha(ST_CHA, c.status)} ${tagCha(PRI_CHA, c.prioridade)} · aberto em ${dataHoraCha(c.criado_em)}${c.concluido_em ? ' · concluído em ' + dataHoraCha(c.concluido_em) : ''}</p></div>
      <div class="acoes">${atende ? '<button class="btn prim" id="tratar">Atualizar situação / responder</button>' : ''}
        ${dono && !atende && ['aberto', 'aguardando_info'].includes(c.status) ? '<button class="btn" id="editar">Editar</button><button class="btn perigo" id="cancelar">Cancelar chamado</button>' : ''}
        <a class="btn" href="#/chamados">Voltar</a></div></div>
    <div class="cartao"><div class="form">
      <div><div class="muted">Responsável</div><b>${esc(c.sol?.nome || '—')}</b>${c.sol?.cargo ? `<div class="muted">${esc(c.sol.cargo)}</div>` : ''}</div>
      <div><div class="muted">Setor</div><b>${esc(c.setor || '—')}</b></div>
      <div><div class="muted">Aberto em</div><b>${dataHoraCha(c.criado_em)}</b></div>
      <div class="largo"><div class="muted">Descrição</div><div style="white-space:pre-line">${esc(c.descricao)}</div></div>
      <div class="largo"><div class="muted">Anexos</div>${anx}${aberto && (dono || atende) ? ' <button class="btn peq" id="anexar" style="margin-top:6px">+ Anexar</button>' : ''}</div>
    </div></div>
    ${c.resposta ? `<div class="cartao" style="border-left:4px solid var(--azul)"><h2>Resposta</h2><div style="white-space:pre-line">${esc(c.resposta)}</div></div>` : ''}
    ${atende ? `<div class="cartao cha-analise"><div class="topo" style="margin:0 0 6px"><h2 style="margin:0">Análise</h2>${c.analisado_em ? `<span class="muted">${dataHoraCha(c.analisado_em)}</span>` : ''}</div>
      ${c.analise ? `<div style="white-space:pre-line">${esc(c.analise)}</div>` : '<div class="muted">Ainda sem análise. O Claude analisa os chamados abertos e registra aqui o resumo, se faz sentido, o que falta saber e as ligações com outros setores.</div>'}</div>` : ''}
    <div class="cartao"><h2>Conversa</h2>
      ${msgs.length ? `<ul class="cha-msgs">${msgs.map(m => `<li class="${m.autor_id === estado.usuario.id ? 'eu' : ''}"><div class="muted">${esc(nomes[m.autor_id]?.nome || '—')} · ${dataHoraCha(m.criado_em)}</div><div style="white-space:pre-line">${esc(m.texto)}</div></li>`).join('')}</ul>` : '<div class="muted" style="margin-bottom:8px">Sem mensagens.</div>'}
      ${aberto ? `<form id="f-msg" class="cha-nova"><textarea name="texto" rows="2" required placeholder="${atende ? 'Pergunte ou informe algo ao responsável' : 'Complemente o pedido ou responda a uma pergunta'}"></textarea><button class="btn prim">Enviar</button></form>` : ''}
    </div>`;
  $('#f-msg')?.addEventListener('submit', async e => {
    e.preventDefault(); const t = e.target.texto.value.trim(); if (!t) return;
    await ocupado(e.submitter, async () => { try { await api.inserir('chamado_mensagens', { chamado_id: id, texto: t }); navegar(); } catch (err) { falha(err); } });
  });
  $('#anexar')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Anexar no chamado</h2><div class="form"><label class="campo largo">Arquivos (qualquer formato)<input type="file" name="arquivos" multiple></label>
      <label class="campo largo">Links<input name="links" placeholder="Separados por espaço"></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Anexar</button></div></form>`, { validar: d => !d.arquivos?.length && !d.links?.trim() ? 'Escolha um arquivo ou cole um link.' : null });
    if (!r) return;
    try { await anexarChamado(id, r.arquivos, r.links); aviso('Anexado.'); navegar(); } catch (err) { falha(err); }
  });
  $('#editar')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Editar chamado</h2><div class="form"><label class="campo largo">Título<input name="titulo" required value="${esc(c.titulo)}"></label>
      <label class="campo">Prioridade<select name="prioridade">${Object.entries(PRI_CHA).map(([k, [t]]) => `<option value="${k}" ${k === c.prioridade ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo largo">Descrição<textarea name="descricao" rows="7" required>${esc(c.descricao)}</textarea></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`);
    if (!r) return;
    try { await api.alterar('chamados', `id=eq.${id}`, { titulo: r.titulo.trim(), descricao: r.descricao.trim(), prioridade: r.prioridade, ...(c.status === 'aguardando_info' ? { status: 'aberto' } : {}) }); aviso('Chamado atualizado.'); navegar(); } catch (err) { falha(err); }
  });
  $('#cancelar')?.addEventListener('click', async () => {
    if (!await confirmar('Cancelar este chamado?', { botao: 'Cancelar chamado' })) return;
    try { await api.alterar('chamados', `id=eq.${id}`, { status: 'cancelado' }); aviso('Chamado cancelado.'); navegar(); } catch (err) { falha(err); }
  });
  $('#tratar')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>${esc(c.numero)} · atualizar</h2><div class="form">
      <label class="campo">Situação<select name="status">${Object.entries(ST_CHA).map(([k, [t]]) => `<option value="${k}" ${k === c.status ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo">Prioridade<select name="prioridade">${Object.entries(PRI_CHA).map(([k, [t]]) => `<option value="${k}" ${k === c.prioridade ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo largo">Resposta ao responsável<textarea name="resposta" rows="4" placeholder="O que foi feito, o que vai ser feito ou o que falta saber">${esc(c.resposta || '')}</textarea></label>
      <label class="campo largo">Análise (interna)<textarea name="analise" rows="6">${esc(c.analise || '')}</textarea></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`);
    if (!r) return;
    try { await api.alterar('chamados', `id=eq.${id}`, { status: r.status, prioridade: r.prioridade, resposta: r.resposta.trim() || null,
            analise: r.analise.trim() || null, ...(r.analise.trim() !== (c.analise || '') ? { analisado_em: new Date().toISOString() } : {}) });
          aviso('Chamado atualizado.'); navegar(); } catch (err) { falha(err); }
  });
});
