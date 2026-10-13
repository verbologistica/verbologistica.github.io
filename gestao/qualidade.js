// Verbo Gestão — Qualidade: documentos controlados, não conformidades e CAPA, auditorias e indicadores
'use strict';

const editaQual = () => tem('administrador', 'qualidade');
const ST_DOC = { rascunho: ['Rascunho', ''], em_revisao: ['Em revisão', 'amarelo'], aprovado: ['Aprovado', 'verde'], obsoleto: ['Obsoleto', ''] };
const TIPOS_DOC = ['Política', 'Manual', 'Procedimento', 'Instrução de trabalho', 'Formulário', 'Registro', 'Outro'];
const ST_NC = { aberta: ['Aberta', 'amarelo'], em_analise: ['Em análise', 'azul'], plano_acao: ['Plano de ação', 'azul'], verificacao: ['Verificação de eficácia', 'amarelo'], encerrada: ['Encerrada', 'verde'], cancelada: ['Cancelada', ''] };
const CLASS_NC = { nc: 'Não conformidade', reclamacao: 'Reclamação de cliente', observacao: 'Observação', oportunidade_melhoria: 'Oportunidade de melhoria' };
const GRAV_NC = { menor: ['Menor', 'amarelo'], maior: ['Maior', 'vermelho'], critica: ['Crítica', 'vermelho'] };
const ORIG_NC = { processo: 'Processo interno', auditoria: 'Auditoria', reclamacao_cliente: 'Reclamação de cliente', fornecedor: 'Fornecedor', ocorrencia: 'Ocorrência operacional', acidente: 'Acidente / SSMA', inspecao: 'Inspeção' };
const TIPO_ACAO_Q = { corretiva: 'Corretiva', preventiva: 'Preventiva', melhoria: 'Melhoria' };
const TIPO_AUD = { interna: 'Interna', cliente: 'De cliente', certificacao: 'Certificação', fornecedor: 'Em fornecedor' };
const ST_AUD = { planejada: ['Planejada', 'azul'], realizada: ['Realizada', 'amarelo'], encerrada: ['Encerrada', 'verde'], cancelada: ['Cancelada', ''] };

Object.assign(LEI, {
  qualidade_nc: ['Tratamento de não conformidades — ISO 9001 (10.2)', [
    '1) <b>Conter</b>: corrigir o problema e lidar com as consequências. 2) <b>Analisar a causa</b> (5 porquês, Ishikawa). 3) <b>Agir na causa</b> para não repetir. 4) <b>Verificar a eficácia</b> depois de um tempo.',
    'Uma NC só deve ser encerrada quando as ações foram concluídas <b>e</b> se comprovou que funcionaram. Se não funcionaram, abra novas ações.',
    'Registre evidências (fotos, documentos, registros): elas são cobradas em auditorias de cliente e de certificação.']],
  qualidade_doc: ['Documentos controlados — ISO 9001 (7.5)', [
    'Todo documento tem código, versão, quem elaborou e quem aprovou (pessoas diferentes). Versões antigas ficam obsoletas e não devem ser usadas.',
    'Revise periodicamente. Mudou o documento? Gere nova versão: quem tem leitura obrigatória precisa ler de novo.']],
});

// ===================== Painel =====================
rota('/qualidade', async tela => {
  const [pend, ncs, inds, vals, auds] = await Promise.all([api.rpc('pendencias_qual').catch(() => []), api.listar('qual_nc', 'ativo=eq.true&status=not.in.(encerrada,cancelada)&select=*,u:usuarios!qual_nc_responsavel_id_fkey(nome)&order=prazo.nullslast'),
    api.listar('qual_indicadores', 'ativo=eq.true&order=setor,nome'), api.listar('qual_indicador_valores', `competencia=gte.${somaDias(hojeISO(), -400).slice(0, 7)}-01&order=competencia.desc`), api.listar('qual_auditorias', 'ativo=eq.true&status=eq.planejada&order=data_prevista&limit=5')]);
  const p = Object.fromEntries(pend.map(x => [x.tipo, Number(x.quantidade)]));
  const ultimo = id => vals.find(v => v.indicador_id === id);
  const ok = (i, v) => i.meta == null || v == null ? null : i.sentido === 'maior' ? Number(v) >= Number(i.meta) : Number(v) <= Number(i.meta);
  tela.innerHTML = `
    <div class="topo"><div><h1>Qualidade</h1><p class="sub">Documentos, não conformidades, auditorias e indicadores</p></div>
      <div class="acoes"><a class="btn prim" href="#/qualidade/nc/nova">Registrar não conformidade</a>${editaQual() ? '<a class="btn" href="#/qualidade/documentos/novo">+ Documento</a>' : ''}</div></div>
    <div class="grade" style="margin-bottom:14px">
      <a class="cartao kpi ${p.qual_nc_abertas ? 'alerta' : ''}" href="#/qualidade/nc"><div class="n">${ncs.length}</div><div class="r">NC em tratamento</div></a>
      <a class="cartao kpi ${p.qual_acoes_atrasadas ? 'alerta' : ''}" href="#/qualidade/nc"><div class="n">${p.qual_acoes_atrasadas || 0}</div><div class="r">ações atrasadas</div></a>
      <a class="cartao kpi ${p.qual_docs_revisao ? 'alerta' : ''}" href="#/qualidade/documentos"><div class="n">${p.qual_docs_revisao || 0}</div><div class="r">documentos para revisar (30 dias)</div></a>
      <a class="cartao kpi ${p.qual_docs_ler ? 'alerta' : ''}" href="#/qualidade/documentos?ler=1"><div class="n">${p.qual_docs_ler || 0}</div><div class="r">documento(s) para você ler</div></a>
      <a class="cartao kpi" href="#/qualidade/auditorias"><div class="n">${auds.length}</div><div class="r">auditorias planejadas</div></a>
    </div>
    <div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(340px,1fr))">
      <div class="cartao"><h2>Indicadores (último mês)</h2><ul class="lista-simples">${inds.map(i => { const v = ultimo(i.id), s = ok(i, v?.valor);
        return `<li><span>${esc(i.nome)}<div class="muted">${esc(i.setor || '')}${i.meta != null ? ` · meta ${i.sentido === 'maior' ? '≥' : '≤'} ${Number(i.meta).toLocaleString('pt-BR')} ${esc(i.unidade)}` : ''}</div></span>
          <span>${v ? `<span class="tag ${s == null ? '' : s ? 'verde' : 'vermelho'}">${Number(v.valor).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${esc(i.unidade)}</span> <span class="muted">${mesBR(v.competencia.slice(0, 7))}</span>` : '<span class="muted">sem dado</span>'}</span></li>`; }).join('')}</ul>
        <a class="btn peq" href="#/qualidade/indicadores">Ver todos</a></div>
      <div class="cartao"><h2>Não conformidades em tratamento</h2>${ncs.length ? `<ul class="lista-simples">${ncs.slice(0, 12).map(n => `<li class="clicavel" onclick="location.hash='#/qualidade/nc/ver/${n.id}'"><span><b>${esc(n.numero)}</b> ${esc(n.descricao.slice(0, 70))}<div class="muted">${esc(n.u?.nome || 'sem responsável')}${n.prazo ? ' · prazo ' + dataBR(n.prazo) : ''}</div></span>${tagSt(ST_NC, n.status)}</li>`).join('')}</ul>` : '<div class="vazio">Nenhuma NC em aberto. 👍</div>'}</div>
    </div>`;
});

// ===================== Documentos =====================
rota('/qualidade/documentos', async tela => {
  const ler = estado.params.get('ler') === '1', q = (estado.params.get('q') || '').toLowerCase();
  const [ds, lidos, ss] = await Promise.all([api.listar('qual_documentos', 'ativo=eq.true&select=*,s:setores(nome)&order=codigo'), api.listar('qual_documento_leituras', `usuario_id=eq.${estado.usuario.id}&ativo=eq.true&select=documento_id,versao`).catch(() => []), setoresL().catch(() => [])]);
  const jaLeu = d => lidos.some(l => l.documento_id === d.id && l.versao === d.versao);
  const paraMim = d => d.status === 'aprovado' && d.leitura_obrigatoria && (d.publico === 'todos' || d.publico.split(',').map(s => s.trim()).some(p => estado.perfis.includes(p)));
  let ls = ds.filter(d => editaQual() || d.status === 'aprovado' || d.elaborado_por === estado.usuario.id);
  if (ler) ls = ls.filter(d => paraMim(d) && !jaLeu(d)); if (q) ls = ls.filter(d => [d.codigo, d.titulo, d.tipo, d.s?.nome].join(' ').toLowerCase().includes(q));
  tela.innerHTML = `<div class="topo"><div><h1>Documentos da qualidade</h1><p class="sub">${ls.length} documento(s)</p></div>${editaQual() ? '<a class="btn prim" href="#/qualidade/documentos/novo">+ Documento</a>' : ''}</div>
    <form class="filtros" id="filtros"><input name="q" value="${esc(estado.params.get('q') || '')}" placeholder="Código, título, setor"><label class="check"><input type="checkbox" name="ler" ${ler ? 'checked' : ''}> Só os que preciso ler</label><button class="btn">Filtrar</button></form>
    <div class="cartao">${ls.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Código</th><th>Título</th><th>Tipo</th><th>Setor</th><th class="num">Versão</th><th>Situação</th><th>Revisão</th><th>Leitura</th></tr></thead><tbody>
      ${ls.map(d => `<tr class="clicavel" onclick="location.hash='#/qualidade/documentos/ver/${d.id}'"><td data-r="Código" class="mono"><b>${esc(d.codigo)}</b></td><td data-r="Título">${esc(d.titulo)}</td><td data-r="Tipo">${esc(d.tipo)}</td><td data-r="Setor">${esc(d.s?.nome || '—')}</td>
        <td data-r="Versão" class="num">${d.versao}</td><td data-r="Situação">${tagSt(ST_DOC, d.status)}</td><td data-r="Revisão">${d.proxima_revisao ? dataBR(d.proxima_revisao) + (d.proxima_revisao <= somaDias(hojeISO(), 30) ? ' <span class="tag amarelo">revisar</span>' : '') : '—'}</td>
        <td data-r="Leitura">${paraMim(d) ? (jaLeu(d) ? '<span class="tag verde">lido</span>' : '<span class="tag vermelho">ler</span>') : '—'}</td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Nenhum documento.</div>'}</div>
    ${avisoLei('qualidade_doc')}`;
  $('#filtros').onsubmit = e => { e.preventDefault(); const d = formDados(e.target); location.hash = '#/qualidade/documentos?' + new URLSearchParams(Object.entries({ q: d.q, ler: d.ler ? '1' : '' }).filter(([, v]) => v)); };
});
async function formDocumentoQual(tela, d = null) {
  if (!editaQual()) { tela.innerHTML = '<div class="cartao vazio">Sem permissão.</div>'; return; }
  const ss = await setoresL().catch(() => []);
  const perfisOpc = PERFIS.map(p => p[0]).filter(p => p !== 'administrador');
  const pub = d?.publico && d.publico !== 'todos' ? d.publico.split(',').map(s => s.trim()) : [];
  tela.innerHTML = `<div class="topo"><div><h1>${d ? 'Editar ' + esc(d.codigo) + ' (versão ' + d.versao + ')' : 'Novo documento'}</h1></div></div>
    <form id="f-doc" class="cartao"><div class="form">
      <label class="campo">Código *<input name="codigo" required value="${esc(d?.codigo || '')}" placeholder="PO-OPE-001"></label>
      <label class="campo largo">Título *<input name="titulo" required value="${esc(d?.titulo || '')}"></label>
      <label class="campo">Tipo<select name="tipo" data-valor="${esc(d?.tipo || '')}">${TIPOS_DOC.map(t => `<option ${t === (d?.tipo || 'Procedimento') ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo">Setor<select name="setor_id"><option value="">Todos</option>${ss.filter(s => s.ativo).map(s => `<option value="${s.id}" ${s.id === d?.setor_id ? 'selected' : ''}>${esc(s.nome)}</option>`).join('')}</select></label>
      <label class="campo">Revisar a cada (meses)<input type="number" name="rev" value="${d?.revisar_a_cada_meses ?? 12}"></label>
      <label class="campo largo">Resumo / objetivo<input name="resumo" value="${esc(d?.resumo || '')}"></label>
      <label class="campo largo">Conteúdo<textarea name="conteudo" rows="12" placeholder="Objetivo, aplicação, responsabilidades, descrição das atividades, registros…">${esc(d?.conteudo || '')}</textarea></label>
      <label class="check largo"><input type="checkbox" name="obrig" ${d?.leitura_obrigatoria ? 'checked' : ''}> Leitura obrigatória (as pessoas confirmam que leram cada versão)</label>
      <div class="largo"><div class="muted">Público da leitura (nenhum marcado = todos)</div>${perfisOpc.map(p => `<label class="check" style="display:inline-flex;margin-right:10px"><input type="checkbox" name="pf_${p}" ${pub.includes(p) ? 'checked' : ''}> ${esc(nomePerfil(p))}</label>`).join('')}</div>
      <label class="campo largo">Arquivo (PDF/Word)<input type="file" name="arquivos" multiple></label></div>
      <div class="acoes"><button class="btn prim">Salvar</button><a class="btn" href="javascript:history.back()">Cancelar</a></div></form>`;
  $('#f-doc').onsubmit = async e => { e.preventDefault(); const r = formDados(e.target); const ps = perfisOpc.filter(p => r['pf_' + p]);
    const dados = { codigo: r.codigo, titulo: r.titulo, tipo: r.tipo, setor_id: r.setor_id || null, revisar_a_cada_meses: Number(r.rev) || 12, resumo: r.resumo || null, conteudo: r.conteudo || null, leitura_obrigatoria: !!r.obrig, publico: ps.length ? ps.join(',') : 'todos' };
    await ocupado(e.submitter, async () => { try { let id = d?.id; if (d) await api.alterar('qual_documentos', `id=eq.${id}`, dados); else [{ id }] = await api.inserir('qual_documentos', dados);
      if (r.arquivos?.length) await anexar('qual_documento', id, r.arquivos); aviso('Documento salvo.'); location.hash = '#/qualidade/documentos/ver/' + id;
    } catch (err) { falha(err.message.includes('duplicate') ? new Error('Já existe documento com esse código.') : err); } }); };
}
rota('/qualidade/documentos/novo', tela => formDocumentoQual(tela));
rota('/qualidade/documentos/editar/:id', async (tela, id) => formDocumentoQual(tela, await api.um('qual_documentos', `id=eq.${id}`)));
rota('/qualidade/documentos/ver/:id', async (tela, id) => {
  const d = await api.um('qual_documentos', `id=eq.${id}&select=*,s:setores(nome),el:usuarios!qual_documentos_elaborado_por_fkey(nome),ap:usuarios!qual_documentos_aprovado_por_fkey(nome)`);
  if (!d) { tela.innerHTML = '<div class="cartao vazio">Documento não encontrado.</div>'; return; }
  const [revs, leit, us] = await Promise.all([api.listar('qual_documento_revisoes', `documento_id=eq.${id}&order=versao.desc`), api.listar('qual_documento_leituras', `documento_id=eq.${id}&ativo=eq.true&select=*,u:usuarios(nome)&order=lido_em.desc`), editaQual() ? usuarios() : []]);
  const li = leit.some(l => l.usuario_id === estado.usuario.id && l.versao === d.versao);
  const ed = editaQual();
  tela.innerHTML = `<div class="topo"><div><h1>${esc(d.codigo)} · ${esc(d.titulo)}</h1><p class="sub">${esc(d.tipo)} · versão ${d.versao} · ${tagSt(ST_DOC, d.status)}${d.s ? ' · ' + esc(d.s.nome) : ''}</p></div>
      <div class="acoes">${d.status === 'aprovado' && d.leitura_obrigatoria && !li ? '<button class="btn prim" id="li">Li e entendi</button>' : ''}
        ${ed && ['rascunho', 'em_revisao'].includes(d.status) ? '<button class="btn prim" id="aprovar">Aprovar</button>' : ''}${ed && ['rascunho', 'em_revisao'].includes(d.status) ? `<a class="btn" href="#/qualidade/documentos/editar/${id}">Editar</a>` : ''}
        ${ed && d.status === 'aprovado' ? '<button class="btn" id="versao">Nova versão</button><button class="btn perigo" id="obsoleto">Tornar obsoleto</button>' : ''}<a class="btn" href="#/qualidade/documentos">Voltar</a></div></div>
    ${d.status === 'obsoleto' ? '<div class="cartao alerta-obs">⛔ Documento <b>obsoleto</b>: não use.</div>' : d.status !== 'aprovado' ? '<div class="cartao alerta-obs">Documento ainda não aprovado: não use como referência oficial.</div>' : ''}
    <div class="cartao"><div class="muted">Elaborado por ${esc(d.el?.nome || '—')} · aprovado por ${esc(d.ap?.nome || '—')}${d.aprovado_em ? ' em ' + dataBR(d.aprovado_em) : ''}${d.proxima_revisao ? ' · próxima revisão ' + dataBR(d.proxima_revisao) : ''}</div>
      ${d.resumo ? `<p><b>${esc(d.resumo)}</b></p>` : ''}<div style="white-space:pre-line;margin-top:8px">${esc(d.conteudo || '')}</div><div id="anx-doc" style="margin-top:10px"></div></div>
    <div class="cartao"><h2>Histórico de revisões</h2>${revs.length ? `<ul class="lista-simples">${revs.map(r => `<li><span><b>Versão ${r.versao}</b> · ${esc(r.alteracao)}</span><span class="muted">${dataBR(r.aprovado_em)}</span></li>`).join('')}</ul>` : '<div class="vazio">Versão inicial.</div>'}</div>
    ${ed && d.leitura_obrigatoria ? `<div class="cartao"><h2>Leituras da versão ${d.versao}</h2>${leit.filter(l => l.versao === d.versao).length ? `<ul class="lista-simples">${leit.filter(l => l.versao === d.versao).map(l => `<li><span>${esc(l.u?.nome || '')}</span><span class="muted">${dataHoraBR(l.lido_em)}</span></li>`).join('')}</ul>` : '<div class="vazio">Ninguém confirmou a leitura ainda.</div>'}</div>` : ''}`;
  $('#anx-doc').innerHTML = await htmlAnexos('qual_documento', id);
  $('#li')?.addEventListener('click', async () => { try { await api.inserir('qual_documento_leituras', { documento_id: id, versao: d.versao }); aviso('Leitura registrada.'); navegar(); } catch (err) { falha(err); } });
  $('#aprovar')?.addEventListener('click', async () => { if (!await confirmar(`Aprovar a versão ${d.versao}? Ela passa a valer para todos.`, { botao: 'Aprovar' })) return;
    try { await api.alterar('qual_documentos', `id=eq.${id}`, { status: 'aprovado' }); aviso('Documento aprovado.'); navegar(); } catch (err) { falha(err); } });
  $('#versao')?.addEventListener('click', async () => { const m = await confirmar('O que muda na nova versão?', { comMotivo: true, botao: 'Criar versão' }); if (!m) return;
    try { await api.rpc('qual_nova_versao', { p_doc: id, p_alteracao: m }); location.hash = '#/qualidade/documentos/editar/' + id; } catch (err) { falha(err); } });
  $('#obsoleto')?.addEventListener('click', async () => { if (!await confirmar('Tornar este documento obsoleto?', { botao: 'Confirmar' })) return;
    try { await api.alterar('qual_documentos', `id=eq.${id}`, { status: 'obsoleto' }); navegar(); } catch (err) { falha(err); } });
});

// ===================== Não conformidades =====================
rota('/qualidade/nc', async tela => {
  const st = estado.params.get('status') || 'abertas';
  const ns = await api.listar('qual_nc', `ativo=eq.true${st === 'abertas' ? '&status=not.in.(encerrada,cancelada)' : st === 'todas' ? '' : '&status=eq.' + st}&select=*,u:usuarios!qual_nc_responsavel_id_fkey(nome),s:setores(nome)&order=detectada_em.desc&limit=300`);
  tela.innerHTML = `<div class="topo"><div><h1>Não conformidades</h1><p class="sub">${ns.length} registro(s)</p></div><a class="btn prim" href="#/qualidade/nc/nova">+ Registrar</a></div>
    <form class="filtros" id="filtros"><select name="status"><option value="abertas">Em tratamento</option>${Object.entries(ST_NC).map(([k, [t]]) => `<option value="${k}" ${k === st ? 'selected' : ''}>${t}</option>`).join('')}<option value="todas" ${st === 'todas' ? 'selected' : ''}>Todas</option></select><button class="btn">Filtrar</button></form>
    <div class="cartao">${ns.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nº</th><th>Data</th><th>Classificação</th><th>Descrição</th><th>Setor</th><th>Responsável</th><th>Prazo</th><th>Situação</th></tr></thead><tbody>
      ${ns.map(n => `<tr class="clicavel" onclick="location.hash='#/qualidade/nc/ver/${n.id}'"><td data-r="Nº" class="mono"><b>${esc(n.numero)}</b></td><td data-r="Data">${dataBR(n.detectada_em)}</td><td data-r="Classificação">${esc(CLASS_NC[n.classificacao])} ${tagSt(GRAV_NC, n.gravidade)}</td>
        <td data-r="Descrição">${esc(n.descricao.slice(0, 90))}</td><td data-r="Setor">${esc(n.s?.nome || '—')}</td><td data-r="Responsável">${esc(n.u?.nome || '—')}</td>
        <td data-r="Prazo">${n.prazo ? dataBR(n.prazo) + (n.prazo < hojeISO() && !['encerrada', 'cancelada'].includes(n.status) ? ' <span class="tag vermelho">vencido</span>' : '') : '—'}</td><td data-r="Situação">${tagSt(ST_NC, n.status)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Nenhum registro.</div>'}</div>
    ${avisoLei('qualidade_nc')}`;
  $('#filtros').onsubmit = e => { e.preventDefault(); location.hash = '#/qualidade/nc?status=' + formDados(e.target).status; };
});
rota('/qualidade/nc/nova', async tela => {
  const aud = estado.params.get('auditoria') || '';
  const [ss, cls, fs, us] = await Promise.all([setoresL().catch(() => []), cad('clientes', 'select=id,nome,ativo&order=nome').catch(() => []), cad('fornecedores', 'select=id,razao_social,ativo&order=razao_social').catch(() => []), usuarios().catch(() => [])]);
  tela.innerHTML = `<div class="topo"><div><h1>Registrar não conformidade</h1><p class="sub">Qualquer pessoa pode registrar. A Qualidade analisa e acompanha.</p></div></div>
    <form id="f-nc" class="cartao"><div class="form">
      <label class="campo">Classificação<select name="classificacao">${Object.entries(CLASS_NC).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></label>
      <label class="campo">Origem<select name="origem" data-valor="">${Object.entries(ORIG_NC).map(([k, t]) => `<option value="${k}" ${k === (aud ? 'auditoria' : 'processo') ? 'selected' : ''}>${t}</option>`).join('')}<option value="Outro">Outro</option></select></label>
      <label class="campo">Gravidade<select name="gravidade">${Object.entries(GRAV_NC).map(([k, [t]]) => `<option value="${k}">${t}</option>`).join('')}</select></label>
      <label class="campo">Data<input type="date" name="data" value="${hojeISO()}"></label>
      <label class="campo">Setor<select name="setor_id"><option value="">—</option>${ss.filter(s => s.ativo).map(s => `<option value="${s.id}">${esc(s.nome)}</option>`).join('')}</select></label>
      <label class="campo">Cliente<select name="cliente_id"><option value="">—</option>${cls.filter(c => c.ativo).map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join('')}</select></label>
      <label class="campo">Fornecedor<select name="fornecedor_id"><option value="">—</option>${fs.filter(f => f.ativo).map(f => `<option value="${f.id}">${esc(f.razao_social)}</option>`).join('')}</select></label>
      <label class="campo">Referência (nº OS, ocorrência, acidente)<input name="origem_ref"></label>
      <label class="campo largo">O que aconteceu? *<textarea name="descricao" rows="3" required></textarea></label>
      <label class="campo largo">Evidência<input name="evidencia" placeholder="Onde se vê o problema: registro, foto, documento"></label>
      <label class="campo largo">Requisito não atendido<input name="requisito" placeholder="Procedimento, contrato do cliente, norma, lei…"></label>
      ${editaQual() ? `<label class="campo">Responsável pelo tratamento<select name="resp">${opcoes(us.filter(u => u.ativo), null, u => u.nome, null, '—')}</select></label><label class="campo">Prazo<input type="date" name="prazo" value="${somaDias(hojeISO(), 30)}"></label>` : ''}
      <label class="campo largo">Ação imediata já tomada (contenção)<input name="contencao"></label>
      <label class="campo largo">Fotos / documentos<input type="file" name="arquivos" multiple></label></div>
      <div class="acoes"><button class="btn prim">Registrar</button><a class="btn" href="javascript:history.back()">Cancelar</a></div></form>`;
  $('#f-nc').onsubmit = async e => { e.preventDefault(); const d = formDados(e.target);
    await ocupado(e.submitter, async () => { try {
      const [n] = await api.inserir('qual_nc', { classificacao: d.classificacao, origem: d.origem, gravidade: d.gravidade, detectada_em: d.data, setor_id: d.setor_id || null, cliente_id: d.cliente_id || null, fornecedor_id: d.fornecedor_id || null,
        origem_ref: d.origem_ref || null, descricao: d.descricao, evidencia: d.evidencia || null, requisito: d.requisito || null, contencao: d.contencao || null, auditoria_id: aud || null, responsavel_id: d.resp || null, prazo: d.prazo || null });
      if (d.arquivos?.length) await anexar('qual_nc', n.id, d.arquivos);
      aviso(`${n.numero} registrada.`); location.hash = editaQual() ? '#/qualidade/nc/ver/' + n.id : '#/inicio';
    } catch (err) { falha(err); } }); };
});
rota('/qualidade/nc/ver/:id', async (tela, id) => {
  const n = await api.um('qual_nc', `id=eq.${id}&select=*,u:usuarios!qual_nc_responsavel_id_fkey(nome),s:setores(nome),cl:clientes(nome),f:fornecedores(razao_social),a:qual_auditorias(id,numero)`);
  if (!n) { tela.innerHTML = '<div class="cartao vazio">Registro não encontrado.</div>'; return; }
  const [acs, us] = await Promise.all([api.listar('qual_acoes', `nc_id=eq.${id}&ativo=eq.true&select=*,u:usuarios(nome)&order=criado_em`), usuarios()]);
  const ed = editaQual() || n.responsavel_id === estado.usuario.id, aberta = !['encerrada', 'cancelada'].includes(n.status);
  const etapa = (k, t, ok) => `<div class="cartao" style="border-left:4px solid ${ok ? '#0b6b4f' : '#d0d5dd'}"><h2 style="margin-top:0">${ok ? '✅' : '⬜'} ${k}. ${t}</h2>`;
  tela.innerHTML = `<div class="topo"><div><h1>${esc(n.numero)} · ${esc(CLASS_NC[n.classificacao])}</h1><p class="sub">${tagSt(ST_NC, n.status)} ${tagSt(GRAV_NC, n.gravidade)} · ${esc(ORIG_NC[n.origem] || n.origem)}${n.a ? ` · <a href="#/qualidade/auditorias/ver/${n.a.id}">${esc(n.a.numero)}</a>` : ''} · ${dataBR(n.detectada_em)}</p></div>
      <div class="acoes">${editaQual() && aberta ? '<button class="btn" id="resp">Responsável e prazo</button><button class="btn perigo" id="cancelar">Cancelar</button>' : ''}<a class="btn" href="#/qualidade/nc">Voltar</a></div></div>
    <div class="cartao"><div class="form"><div class="largo"><div class="muted">Descrição</div><b style="white-space:pre-line">${esc(n.descricao)}</b></div>
      ${[['Evidência', n.evidencia], ['Requisito', n.requisito], ['Setor', n.s?.nome], ['Cliente', n.cl?.nome], ['Fornecedor', n.f?.razao_social], ['Referência', n.origem_ref], ['Responsável', n.u?.nome], ['Prazo', dataBR(n.prazo)], ['Motivo do cancelamento', n.motivo_cancelamento]]
        .filter(([, v]) => v).map(([k, v]) => `<div><div class="muted">${k}</div><b>${esc(v)}</b></div>`).join('')}<div class="largo" id="anx-nc"></div></div></div>
    ${etapa(1, 'Contenção (correção imediata)', !!n.contencao)}<p style="white-space:pre-line">${esc(n.contencao || 'Não registrada.')}</p>${ed && aberta ? '<button class="btn peq" data-campo="contencao">Registrar contenção</button>' : ''}</div>
    ${etapa(2, 'Análise de causa', !!n.causa_raiz)}${n.analise_causa ? `<p style="white-space:pre-line">${esc(n.analise_causa)}</p>` : ''}<p><b>Causa raiz:</b> ${esc(n.causa_raiz || '—')}</p>${ed && aberta ? '<button class="btn peq" id="causa">Analisar causa (5 porquês)</button>' : ''}</div>
    ${etapa(3, 'Ações corretivas / preventivas', acs.length && acs.every(a => ['concluida', 'cancelada'].includes(a.status)))}
      ${acs.length ? `<ul class="lista-simples">${acs.map(a => `<li><span><b>${TIPO_ACAO_Q[a.tipo]}</b> · ${esc(a.descricao)}<div class="muted">${esc(a.u?.nome || '')}${a.prazo ? ' · prazo ' + dataBR(a.prazo) : ''}${a.evidencia ? ' · ✔ ' + esc(a.evidencia) : ''}</div></span>
        <span>${a.prazo && a.prazo < hojeISO() && ['aberta', 'em_andamento'].includes(a.status) ? '<span class="tag vermelho">atrasada</span>' : ''} ${tagSt(ST_ACAO, a.status)} ${(editaQual() || a.responsavel_id === estado.usuario.id) && aberta ? `<button class="btn peq" data-acao="${a.id}">Atualizar</button>` : ''}</span></li>`).join('')}</ul>` : '<p class="muted">Nenhuma ação.</p>'}
      ${ed && aberta ? '<button class="btn peq prim" id="nova-acao">+ Ação</button>' : ''}</div>
    ${etapa(4, 'Verificação de eficácia', n.eficaz === true)}${n.verificacao_obs ? `<p style="white-space:pre-line">${esc(n.verificacao_obs)}</p>` : '<p class="muted">Depois das ações, verifique se o problema não voltou a acontecer.</p>'}
      ${editaQual() && aberta ? '<button class="btn peq" id="eficacia">Verificar eficácia e encerrar</button>' : ''}</div>
    ${avisoLei('qualidade_nc')}`;
  $('#anx-nc').innerHTML = await htmlAnexos('qual_nc', id);
  const salvar = async dados => { try { await api.alterar('qual_nc', `id=eq.${id}`, dados); navegar(); } catch (err) { falha(err); } };
  $$('[data-campo]', tela).forEach(b => b.onclick = async () => { const r = await modal(`<form><h2>Contenção</h2><label class="campo">O que foi feito de imediato<textarea name="t" rows="3" required>${esc(n.contencao || '')}</textarea></label>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`); if (r) salvar({ contencao: r.t, status: n.status === 'aberta' ? 'em_analise' : n.status }); });
  $('#causa')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Análise de causa</h2><p class="muted">Pergunte “por quê?” até chegar na causa que, se eliminada, impede o problema de voltar.</p><div class="form">
      ${[1, 2, 3, 4, 5].map(k => `<label class="campo largo">${k}º Por quê?<input name="p${k}"></label>`).join('')}
      <label class="campo largo">Ou descreva a análise (Ishikawa: método, máquina, mão de obra, material, meio ambiente, medição)<textarea name="analise" rows="3">${esc(n.analise_causa || '')}</textarea></label>
      <label class="campo largo">Causa raiz *<input name="causa" required value="${esc(n.causa_raiz || '')}"></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`);
    if (!r) return; const pq = [1, 2, 3, 4, 5].map(k => r['p' + k]).filter(Boolean).map((t, i) => `${i + 1}. Por quê? ${t}`).join('\n');
    salvar({ analise_causa: [pq, r.analise].filter(Boolean).join('\n') || null, causa_raiz: r.causa, status: ['aberta', 'em_analise'].includes(n.status) ? 'plano_acao' : n.status }); });
  const formAcaoQ = async a => {
    const r = await modal(`<form><h2>${a ? 'Atualizar ação' : 'Nova ação'}</h2><div class="form">
      <label class="campo">Tipo<select name="tipo">${Object.entries(TIPO_ACAO_Q).map(([k, t]) => `<option value="${k}" ${k === a?.tipo ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo largo">O que fazer *<textarea name="descricao" rows="2" required>${esc(a?.descricao || '')}</textarea></label>
      <label class="campo">Responsável<select name="resp">${opcoes(us.filter(u => u.ativo), null, u => u.nome, a?.responsavel_id || n.responsavel_id, '—')}</select></label>
      <label class="campo">Prazo<input type="date" name="prazo" value="${a?.prazo || somaDias(hojeISO(), 30)}"></label>
      ${a ? `<label class="campo">Situação<select name="status">${Object.entries(ST_ACAO).map(([k, [t]]) => `<option value="${k}" ${k === a.status ? 'selected' : ''}>${t}</option>`).join('')}</select></label><label class="campo largo">Evidência<input name="evidencia" value="${esc(a.evidencia || '')}"></label>` : ''}</div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`, { validar: d => d.status === 'concluida' && !d.evidencia ? 'Informe a evidência.' : null });
    if (!r) return;
    try { const dados = { tipo: r.tipo, descricao: r.descricao, responsavel_id: r.resp || null, prazo: r.prazo || null };
      if (a) await api.alterar('qual_acoes', `id=eq.${a.id}`, { ...dados, status: r.status, evidencia: r.evidencia || null }); else await api.inserir('qual_acoes', { ...dados, nc_id: id });
      navegar(); } catch (err) { falha(err); } };
  $('#nova-acao')?.addEventListener('click', () => formAcaoQ());
  $$('[data-acao]', tela).forEach(b => b.onclick = () => formAcaoQ(acs.find(a => a.id === b.dataset.acao)));
  $('#eficacia')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Verificação de eficácia</h2><div class="form">
      <label class="campo largo">O que foi verificado *<textarea name="obs" rows="3" required>${esc(n.verificacao_obs || '')}</textarea></label>
      <label class="campo">Resultado<select name="ef"><option value="1">Eficaz — encerrar a NC</option><option value="0">Não eficaz — manter aberta e abrir novas ações</option></select></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`);
    if (!r) return; salvar(r.ef === '1' ? { verificacao_obs: r.obs, eficaz: true, status: 'encerrada' } : { verificacao_obs: r.obs, eficaz: false, status: 'plano_acao' }); });
  $('#resp')?.addEventListener('click', async () => { const r = await modal(`<form><h2>Responsável e prazo</h2><div class="form"><label class="campo">Responsável<select name="resp">${opcoes(us.filter(u => u.ativo), null, u => u.nome, n.responsavel_id, '—')}</select></label>
    <label class="campo">Prazo<input type="date" name="prazo" value="${n.prazo || ''}"></label><label class="campo">Gravidade<select name="grav">${Object.entries(GRAV_NC).map(([k, [t]]) => `<option value="${k}" ${k === n.gravidade ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`); if (r) salvar({ responsavel_id: r.resp || null, prazo: r.prazo || null, gravidade: r.grav }); });
  $('#cancelar')?.addEventListener('click', async () => { const m = await confirmar('Cancelar este registro?', { comMotivo: true, botao: 'Cancelar registro' }); if (m) salvar({ status: 'cancelada', motivo_cancelamento: m }); });
});

// ===================== Auditorias =====================
rota('/qualidade/auditorias', async tela => {
  const as = await api.listar('qual_auditorias', 'ativo=eq.true&select=*,s:setores(nome),f:fornecedores(razao_social)&order=data_prevista.desc');
  tela.innerHTML = `<div class="topo"><div><h1>Auditorias</h1><p class="sub">${as.length} auditoria(s)</p></div>${editaQual() ? '<button class="btn prim" id="nova">+ Auditoria</button>' : ''}</div>
    <div class="cartao">${as.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nº</th><th>Data</th><th>Tipo</th><th>Norma / escopo</th><th>Auditor</th><th>Situação</th></tr></thead><tbody>
      ${as.map(a => `<tr class="clicavel" onclick="location.hash='#/qualidade/auditorias/ver/${a.id}'"><td data-r="Nº" class="mono"><b>${esc(a.numero)}</b></td><td data-r="Data">${dataBR(a.data_realizada || a.data_prevista)}</td><td data-r="Tipo">${TIPO_AUD[a.tipo]}</td>
        <td data-r="Escopo">${esc([a.norma, a.escopo].filter(Boolean).join(' · '))}${a.s ? `<div class="muted">${esc(a.s.nome)}</div>` : ''}</td><td data-r="Auditor">${esc(a.auditor || '—')}</td><td data-r="Situação">${tagSt(ST_AUD, a.status)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Nenhuma auditoria.</div>'}</div>`;
  $('#nova')?.addEventListener('click', () => formAuditoria());
});
async function formAuditoria(a = null) {
  const [ss, fs] = await Promise.all([setoresL().catch(() => []), cad('fornecedores', 'select=id,razao_social,ativo&order=razao_social')]);
  const r = await modal(`<form><h2>${a ? 'Editar ' + esc(a.numero) : 'Nova auditoria'}</h2><div class="form">
    <label class="campo">Tipo<select name="tipo">${Object.entries(TIPO_AUD).map(([k, t]) => `<option value="${k}" ${k === a?.tipo ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <label class="campo">Norma / referência<input name="norma" list="normas" value="${esc(a?.norma || '')}"><datalist id="normas">${['ISO 9001', 'ISO 14001', 'ISO 45001', 'SASSMAQ', 'Requisitos do cliente', 'Procedimentos internos'].map(n => `<option>${n}</option>`).join('')}</datalist></label>
    <label class="campo largo">Escopo *<input name="escopo" required value="${esc(a?.escopo || '')}" placeholder="Processos/setores auditados"></label>
    <label class="campo">Setor<select name="setor_id"><option value="">—</option>${ss.filter(s => s.ativo).map(s => `<option value="${s.id}" ${s.id === a?.setor_id ? 'selected' : ''}>${esc(s.nome)}</option>`).join('')}</select></label>
    <label class="campo">Fornecedor auditado<select name="fornecedor_id"><option value="">—</option>${fs.filter(f => f.ativo).map(f => `<option value="${f.id}" ${f.id === a?.fornecedor_id ? 'selected' : ''}>${esc(f.razao_social)}</option>`).join('')}</select></label>
    <label class="campo">Data prevista *<input type="date" name="prev" required value="${a?.data_prevista || ''}"></label><label class="campo">Data realizada<input type="date" name="real" value="${a?.data_realizada || ''}"></label>
    <label class="campo">Auditor(es)<input name="auditor" value="${esc(a?.auditor || '')}"></label>
    ${a ? `<label class="campo">Situação<select name="status">${Object.entries(ST_AUD).map(([k, [t]]) => `<option value="${k}" ${k === a.status ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <label class="campo largo">Resumo / conclusão<textarea name="resumo" rows="3">${esc(a.resumo || '')}</textarea></label><label class="campo largo">Pontos fortes<textarea name="fortes" rows="2">${esc(a.pontos_fortes || '')}</textarea></label>` : ''}</div>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`);
  if (!r) return;
  const dados = { tipo: r.tipo, norma: r.norma || null, escopo: r.escopo, setor_id: r.setor_id || null, fornecedor_id: r.fornecedor_id || null, data_prevista: r.prev, data_realizada: r.real || null, auditor: r.auditor || null,
    ...(a ? { status: r.status, resumo: r.resumo || null, pontos_fortes: r.fortes || null } : {}) };
  try { if (a) await api.alterar('qual_auditorias', `id=eq.${a.id}`, dados); else await api.inserir('qual_auditorias', dados); aviso('Auditoria salva.'); navegar(); } catch (err) { falha(err); }
}
rota('/qualidade/auditorias/ver/:id', async (tela, id) => {
  const a = await api.um('qual_auditorias', `id=eq.${id}&select=*,s:setores(nome),f:fornecedores(razao_social)`);
  if (!a) { tela.innerHTML = '<div class="cartao vazio">Auditoria não encontrada.</div>'; return; }
  const ns = await api.listar('qual_nc', `auditoria_id=eq.${id}&ativo=eq.true&order=numero`);
  tela.innerHTML = `<div class="topo"><div><h1>${esc(a.numero)} · Auditoria ${esc(TIPO_AUD[a.tipo].toLowerCase())}</h1><p class="sub">${tagSt(ST_AUD, a.status)} · ${esc([a.norma, a.escopo].filter(Boolean).join(' · '))}</p></div>
      <div class="acoes">${editaQual() ? `<button class="btn" id="editar">Editar</button><a class="btn prim" href="#/qualidade/nc/nova?auditoria=${id}">+ Constatação (NC/observação)</a>` : ''}<a class="btn" href="#/qualidade/auditorias">Voltar</a></div></div>
    <div class="cartao"><div class="form">${[['Prevista', dataBR(a.data_prevista)], ['Realizada', dataBR(a.data_realizada)], ['Auditor', a.auditor], ['Setor', a.s?.nome], ['Fornecedor', a.f?.razao_social]].map(([k, v]) => `<div><div class="muted">${k}</div><b>${v ? esc(v) : '—'}</b></div>`).join('')}
      ${a.resumo ? `<div class="largo"><div class="muted">Conclusão</div><div style="white-space:pre-line">${esc(a.resumo)}</div></div>` : ''}${a.pontos_fortes ? `<div class="largo"><div class="muted">Pontos fortes</div><div style="white-space:pre-line">${esc(a.pontos_fortes)}</div></div>` : ''}<div class="largo" id="anx-aud"></div></div></div>
    <div class="cartao"><h2>Constatações</h2>${ns.length ? `<ul class="lista-simples">${ns.map(n => `<li class="clicavel" onclick="location.hash='#/qualidade/nc/ver/${n.id}'"><span><b>${esc(n.numero)}</b> ${esc(CLASS_NC[n.classificacao])} · ${esc(n.descricao.slice(0, 90))}</span>${tagSt(ST_NC, n.status)}</li>`).join('')}</ul>` : '<div class="vazio">Nenhuma constatação registrada.</div>'}</div>`;
  $('#anx-aud').innerHTML = await htmlAnexos('qual_auditoria', id);
  $('#editar')?.addEventListener('click', () => formAuditoria(a));
});

// ===================== Indicadores =====================
rota('/qualidade/indicadores', async tela => {
  const meses = Array.from({ length: 12 }, (_, k) => { const d = new Date(hojeISO().slice(0, 7) + '-15'); d.setMonth(d.getMonth() - 11 + k); return d.toISOString().slice(0, 7); });
  const [is, vs] = await Promise.all([api.listar('qual_indicadores', 'ativo=eq.true&order=setor,nome'), api.listar('qual_indicador_valores', `competencia=gte.${meses[0]}-01&order=competencia`)]);
  const val = (i, m) => vs.find(v => v.indicador_id === i && v.competencia.startsWith(m));
  const cor = (i, v) => i.meta == null || v == null ? '' : (i.sentido === 'maior' ? Number(v) >= Number(i.meta) : Number(v) <= Number(i.meta)) ? 'verde' : 'vermelho';
  tela.innerHTML = `<div class="topo"><div><h1>Indicadores</h1><p class="sub">Últimos 12 meses · verde = dentro da meta</p></div>
      <div class="acoes">${editaQual() || tem('diretoria') ? `<button class="btn prim" id="calc">Calcular automáticos de ${mesBR(meses[11])}</button><button class="btn" id="calc-ant">… e de ${mesBR(meses[10])}</button>` : ''}${editaQual() ? '<button class="btn" id="novo">+ Indicador</button>' : ''}</div></div>
    <div class="cartao"><div class="tabela-wrap"><table><thead><tr><th>Indicador</th><th>Meta</th>${meses.map(m => `<th class="num">${mesBR(m)}</th>`).join('')}</tr></thead><tbody>
      ${is.map(i => `<tr><td><b>${esc(i.nome)}</b><div class="muted">${esc(i.setor || '')} · ${i.calculo_auto ? 'automático' : 'manual'}</div></td><td class="nowrap">${i.meta != null ? (i.sentido === 'maior' ? '≥ ' : '≤ ') + Number(i.meta).toLocaleString('pt-BR') + ' ' + esc(i.unidade) : '—'}</td>
        ${meses.map(m => { const v = val(i.id, m); return `<td class="num ${editaQual() ? 'clicavel' : ''}" ${editaQual() ? `data-ind="${i.id}" data-mes="${m}"` : ''} title="${esc(v?.comentario || '')}">${v ? `<span class="tag ${cor(i, v.valor)}">${Number(v.valor).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</span>` : '<span class="muted">·</span>'}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>
      <p class="muted">${editaQual() ? 'Clique numa célula para lançar ou corrigir o valor. ' : ''}Os automáticos vêm das viagens, OS, acidentes, jornadas e NCs registradas no sistema.</p></div>`;
  const calc = async m => { try { const n = await api.rpc('qual_calcular_indicadores', { p_mes: m + '-01' }); aviso(`${n} indicador(es) calculado(s).`); navegar(); } catch (err) { falha(err); } };
  $('#calc')?.addEventListener('click', () => calc(meses[11])); $('#calc-ant')?.addEventListener('click', () => calc(meses[10]));
  $$('[data-ind]', tela).forEach(td => td.onclick = async () => { const i = is.find(x => x.id === td.dataset.ind), v = val(i.id, td.dataset.mes);
    const r = await modal(`<form><h2>${esc(i.nome)} · ${mesBR(td.dataset.mes)}</h2><div class="form"><label class="campo">Valor (${esc(i.unidade)})<input name="v" inputmode="decimal" value="${v?.valor ?? ''}"></label><label class="campo largo">Comentário / análise<input name="c" value="${esc(v?.comentario || '')}"></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`);
    if (!r) return;
    try { if (v) await api.alterar('qual_indicador_valores', `id=eq.${v.id}`, { valor: num(r.v), comentario: r.c || null }); else await api.inserir('qual_indicador_valores', { indicador_id: i.id, competencia: td.dataset.mes + '-01', valor: num(r.v), comentario: r.c || null }); navegar(); } catch (err) { falha(err); } });
  $('#novo')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Novo indicador</h2><div class="form"><label class="campo largo">Nome *<input name="nome" required></label><label class="campo">Setor<input name="setor"></label><label class="campo">Unidade<input name="unidade" value="%"></label>
      <label class="campo">Meta<input name="meta" inputmode="decimal"></label><label class="campo">Melhor quando<select name="sentido"><option value="maior">Maior</option><option value="menor">Menor</option></select></label><label class="campo largo">Como calcular<input name="descricao"></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`);
    if (!r) return; try { await api.inserir('qual_indicadores', { nome: r.nome, setor: r.setor || null, unidade: r.unidade || '%', meta: num(r.meta), sentido: r.sentido, descricao: r.descricao || null }); navegar(); } catch (err) { falha(err); } });
});
