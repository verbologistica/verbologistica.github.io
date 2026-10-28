// Verbo Gestão — Fluxo de admissão
// Requisição de vaga (gestor) → validação do RH → aprovação da diretoria → seleção → admissão por etapas e setores
// (em paralelo, com travas legais) → agenda de treinamentos de integração → conclusão.
// Cada etapa grava no lugar definitivo (ficha, documentos, ASO, EPI, treinamentos); a tela da admissão junta tudo.
'use strict';

Object.assign(ST_VAGA, { aguardando_rh: ['Aguardando RH', 'amarelo'], devolvida: ['Devolvida ao gestor', 'laranja'],
  aguardando_diretoria: ['Aguardando diretoria', 'amarelo'], reprovada: ['Reprovada', 'vermelho'], aberta: ['Aprovada · seleção aberta', 'azul'] });
const VG_APROV = ['aguardando_rh', 'devolvida', 'aguardando_diretoria', 'reprovada'];
const VG_EVENTO = { requisitada: 'Requisição aberta pelo gestor', reenviada: 'Requisição corrigida e reenviada', validada_rh: 'Validada pelo RH e enviada à diretoria',
  devolvida: 'Devolvida ao gestor para ajuste', devolvida_diretoria: 'Devolvida pela diretoria ao RH', aprovada: 'Aprovada pela diretoria · seleção aberta',
  reprovada: 'Reprovada', aberta_selecao: 'Vaga aberta', em_selecao: 'Seleção em andamento', preenchida: 'Vaga preenchida', cancelada: 'Vaga cancelada', suspensa: 'Vaga suspensa' };
const AD_SETORES = ['RH', 'DP', 'SSMA', 'Almoxarifado', 'Operação', 'Manutenção', 'Qualidade', 'Cliente'];
const AD_FASES = ['Documentação e registro', 'Segurança e almoxarifado', 'Integração e treinamentos'];
const ST_ETAPA = { pendente: ['Pendente', 'amarelo', '⏳'], feito: ['Concluída', 'verde', '✓'], nao_se_aplica: ['Não se aplica', '', '–'] };
const ST_TREINO = { agendado: ['Agendado', 'azul'], concluido: ['Concluído', 'verde'], nao_compareceu: ['Não compareceu', 'vermelho'], cancelado: ['Cancelado', ''] };
const podeRequisitar = () => tem('aprovador', 'diretoria', 'administrador', 'rh', 'dp');
const dtHora = iso => iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
const hora = iso => iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
const diaLocal = iso => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// envia um arquivo ao Storage e registra pelo RPC indicado
async function adEnviar(arquivos, prefixo, rpc, args) {
  for (const original of arquivos || []) {
    const f = await prepararArquivo(original);
    const caminho = `${prefixo}/${Date.now()}-${nomeArquivo(f.name)}`;
    await api.enviarArquivo(caminho, f);
    await api.rpc(rpc, { ...args, p_caminho: caminho, p_nome: original.name, p_mime: f.type || 'application/octet-stream', p_tam: f.size });
  }
}
const adAnexosHtml = ls => ls?.length ? `<div class="anexos">${ls.map(a => `<span class="anexo" data-arquivo="${esc(a.caminho)}" title="${esc(a.desc || '')}">📎 ${esc(a.nome || 'arquivo')}</span>`).join('')}</div>` : '';

// ===================== Requisições de vaga =====================
rota('/rh/recrutamento', () => { location.hash = '#/rh/vagas'; });
rota('/rh/vagas', async tela => {
  const [vs, cgs, ss] = await Promise.all([api.listar('vagas', 'select=*,cands:vaga_candidatos(etapa),solic:usuarios!vagas_solicitante_id_fkey(nome)&order=criado_em.desc').catch(() =>
    api.listar('vagas', 'select=*,cands:vaga_candidatos(etapa)&order=criado_em.desc')), cargosL(), setoresL()]);
  const CG = porId(cgs), SS = porId(ss);
  const minhaVez = v => (v.status === 'aguardando_rh' && editaRH()) || (v.status === 'aguardando_diretoria' && estado._dirVagas) || (v.status === 'devolvida' && v.solicitante_id === estado.usuario.id);
  estado._dirVagas = await api.rpc('eh_diretoria_vagas').catch(() => false);
  const cont = k => vs.filter(v => v.status === k).length;
  tela.innerHTML = `<div class="topo"><div><h1>Vagas e seleção</h1><p class="sub">Requisição do gestor → validação do RH → aprovação da diretoria → seleção → admissão</p></div>
      <div class="acoes"><a class="btn" href="#/rh/talentos">Banco de talentos</a>${podeRequisitar() ? '<a class="btn prim" href="#/rh/vagas/nova">+ Requisitar vaga</a>' : ''}</div></div>
    <div class="grade" style="margin-bottom:14px">
      <div class="cartao kpi ${cont('aguardando_rh') ? 'alerta' : ''}"><div class="n">${cont('aguardando_rh')}</div><div class="r">aguardando o RH</div></div>
      <div class="cartao kpi ${cont('aguardando_diretoria') ? 'alerta' : ''}"><div class="n">${cont('aguardando_diretoria')}</div><div class="r">aguardando a diretoria</div></div>
      <div class="cartao kpi"><div class="n">${cont('devolvida')}</div><div class="r">devolvidas ao gestor</div></div>
      <div class="cartao kpi"><div class="n">${cont('aberta') + cont('em_selecao')}</div><div class="r">em seleção</div></div></div>
    <div class="cartao">${vs.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nº</th><th>Cargo</th><th>Setor</th><th>Vagas</th><th>Requisitante</th><th>Aberta em</th><th>Candidatos</th><th>Situação</th></tr></thead><tbody>
      ${vs.map(v => `<tr class="clicavel" onclick="location.hash='#/rh/vagas/ver/${v.id}'" data-v${fAttr('sit', ST_VAGA[v.status]?.[0])}${fAttr('setor', SS[v.setor_id]?.nome || '—')}${fAttr('data', (v.criado_em || '').slice(0, 10))}${fAttr('busca', [v.numero, CG[v.cargo_id]?.nome, v.cliente].join(' '))}>
        <td data-r="Nº" class="nowrap"><b>${esc(v.numero || '')}</b></td><td data-r="Cargo">${esc(CG[v.cargo_id]?.nome || '—')}${v.cliente ? `<div class="muted">${esc(v.cliente)}</div>` : ''}</td>
        <td data-r="Setor">${esc(SS[v.setor_id]?.nome || '—')}</td><td data-r="Vagas">${v.quantidade}</td><td data-r="Requisitante">${esc(v.solic?.nome || '—')}</td>
        <td data-r="Aberta em" class="nowrap">${dataBR((v.criado_em || '').slice(0, 10))}</td><td data-r="Candidatos">${(v.cands || []).length}</td>
        <td data-r="Situação"><span class="tag ${ST_VAGA[v.status]?.[1] || ''}">${esc(ST_VAGA[v.status]?.[0] || v.status)}</span>${minhaVez(v) ? ' <span class="tag vermelho">sua vez</span>' : ''}</td></tr>`).join('')}
      </tbody></table></div>` : `<div class="vazio">Nenhuma vaga ainda.${podeRequisitar() ? ' Clique em “+ Requisitar vaga”.' : ''}</div>`}</div>
    ${avisoLei('recrutamento')}`;
  filtroLocal(tela, { itens: 'tbody tr[data-v]', antes: '.cartao:last-of-type', campos: [{ k: 'sit', rotulo: 'Situação' }, { k: 'setor', rotulo: 'Setor' }], periodo: true, rotuloPeriodo: 'Aberta em' });
});

async function formRequisicao(tela, v = null) {
  const [cgs, ss, ccs, cols] = await Promise.all([cargosL(), setoresL(), centros(), colabsBasico()]);
  const val = k => esc(v?.[k] ?? '');
  const sel = (n, ops, at, vazio = 'Selecione…') => `<select name="${n}"><option value="">${vazio}</option>${ops.map(([k, t]) => `<option value="${esc(k)}" ${String(k) === String(at ?? '') ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
  tela.innerHTML = `<div class="topo"><div><h1>${v ? `Corrigir requisição ${esc(v.numero || '')}` : 'Requisitar vaga'}</h1><p class="sub">Ao enviar, a requisição já vale como a sua aprovação e segue para o RH validar e depois para a diretoria.</p></div></div>
    ${v?.status === 'devolvida' ? `<div class="cartao alerta-obs"><b>Motivo da devolução:</b> ${esc((await api.listar('vaga_eventos', `vaga_id=eq.${v.id}&evento=eq.devolvida&order=em.desc&limit=1`).catch(() => []))[0]?.parecer || '—')}</div>` : ''}
    <form class="cartao form" id="f-req">
      <label class="campo">Cargo *${sel('cargo_id', cgs.filter(c => c.ativo).map(c => [c.id, c.nome]), v?.cargo_id)}</label>
      <label class="campo">Setor${sel('setor_id', ss.filter(s => s.ativo).map(s => [s.id, s.nome]), v?.setor_id, '—')}</label>
      <label class="campo">Quantidade<input type="number" name="quantidade" min="1" value="${v?.quantidade || 1}"></label>
      <label class="campo">Motivo${sel('motivo', ['Aumento de quadro', 'Substituição', 'Temporária / sazonal', 'Novo contrato com cliente', 'Outro'].map(x => [x, x]), v?.motivo || 'Aumento de quadro', '—')}</label>
      <label class="campo" id="c-subst">Substitui (se for o caso)${sel('substitui_colaborador_id', cols.map(c => [c.id, c.nome + (c.cargo ? ' · ' + c.cargo : '')]), v?.substitui_colaborador_id, '—')}</label>
      <label class="campo">Tipo de contrato${sel('tipo_contrato', Object.entries(TIPOS_CONTRATO), v?.tipo_contrato || 'clt', '—')}</label>
      <label class="campo">Salário proposto (R$)<input name="salario_ofertado" inputmode="decimal" value="${v?.salario_ofertado != null ? Number(v.salario_ofertado).toFixed(2).replace('.', ',') : ''}" placeholder="O RH confere com a faixa do cargo"></label>
      <label class="campo">Centro de custo${sel('centro_custo_id', ccs.filter(c => c.ativo).map(c => [c.id, c.nome]), v?.centro_custo_id, '—')}</label>
      <label class="campo">Local de trabalho<input name="local_trabalho" value="${val('local_trabalho')}" placeholder="Ex.: Fazenda X, base Três Lagoas"></label>
      <label class="campo">Cliente / contrato<input name="cliente" value="${val('cliente')}" placeholder="Se a vaga atende um cliente"></label>
      <label class="campo">Escala / horário<input name="escala" value="${val('escala')}" placeholder="Ex.: 12x36, 2MW, comercial"></label>
      <label class="campo">Início desejado<input type="date" name="data_inicio_desejada" value="${val('data_inicio_desejada')}"></label>
      <label class="campo">Prazo para preencher<input type="date" name="prazo" value="${val('prazo')}"></label>
      <label class="campo largo">Justificativa *<textarea name="justificativa" rows="3" required placeholder="Por que a vaga é necessária agora (aumento de demanda, contrato novo, saída de colaborador…)">${esc(v?.justificativa || '')}</textarea></label>
      <label class="campo largo">Requisitos da função<textarea name="requisitos" rows="3" placeholder="CNH, cursos, experiência, conhecimentos…">${esc(v?.requisitos || '')}</textarea></label>
      <label class="campo largo">Benefícios<textarea name="beneficios" rows="2">${esc(v?.beneficios || '')}</textarea></label>
      ${v ? '<label class="campo largo">Comentário para o RH<input name="comentario" placeholder="O que foi ajustado"></label>' : ''}
      <p class="muted largo">Não inclua requisitos discriminatórios (sexo, idade, estado civil, aparência, gravidez etc. — Lei 9.029/1995).</p>
      <div class="largo acoes"><button class="btn prim">${v ? 'Reenviar ao RH' : 'Enviar requisição'}</button><a class="btn" href="javascript:history.back()">Cancelar</a></div></form>`;
  const f = $('#f-req');
  const sinc = () => ($('#c-subst').hidden = f.motivo.value !== 'Substituição');
  f.motivo.addEventListener('change', sinc); sinc();
  f.cargo_id.addEventListener('change', () => { const c = cgs.find(x => x.id === f.cargo_id.value); if (c?.setor_id && !f.setor_id.value) { f.setor_id.value = c.setor_id; f.setor_id.dispatchEvent(new Event('change')); }
    if (c?.requisitos && !f.requisitos.value) f.requisitos.value = c.requisitos; if (c?.salario_base && !f.salario_ofertado.value) f.salario_ofertado.value = Number(c.salario_base).toFixed(2).replace('.', ','); });
  f.onsubmit = async e => { e.preventDefault(); const d = formDados(f);
    if (!d.cargo_id) return aviso('Escolha o cargo.', true);
    const p = { ...d, salario_ofertado: num(d.salario_ofertado), substitui_colaborador_id: d.motivo === 'Substituição' ? d.substitui_colaborador_id : '' };
    await ocupado(e.submitter, async () => { try {
      if (v) { await api.rpc('reenviar_vaga', { p_vaga: v.id, p }); aviso('Requisição reenviada ao RH.'); location.hash = '#/rh/vagas/ver/' + v.id; }
      else { const id = await api.rpc('requisitar_vaga', { p }); aviso('Requisição enviada ao RH.'); location.hash = '#/rh/vagas/ver/' + id; }
    } catch (err) { falha(err); } }); };
}
rota('/rh/vagas/nova', tela => podeRequisitar() ? formRequisicao(tela) : (tela.innerHTML = '<div class="cartao vazio">Somente gestores, diretoria e RH requisitam vagas.</div>'));
rota('/rh/vagas/corrigir/:id', async (tela, id) => formRequisicao(tela, await api.um('vagas', `id=eq.${id}&select=*`)));

// linha do tempo macro (vaga → admissão)
function adStepper(passos) {
  return `<ol class="ad-fases">${passos.map(([t, sub, st]) => `<li class="ad-fase ${st}"><span class="ad-bola">${st === 'ok' ? '✓' : st === 'x' ? '✕' : ''}</span><b>${esc(t)}</b><small>${esc(sub || '')}</small></li>`).join('')}</ol>`;
}

rota('/rh/vagas/ver/:id', async (tela, id) => {
  const v = await api.um('vagas', `id=eq.${id}&select=*`);
  if (!v) { tela.innerHTML = '<div class="cartao vazio">Vaga não encontrada ou sem acesso.</div>'; return; }
  const [cgs, ss, ccs, us, evs, anx, dir, adms] = await Promise.all([cargosL(), setoresL(), centros(), usuarios(), api.listar('vaga_eventos', `vaga_id=eq.${id}&order=em`).catch(() => []),
    api.listar('anexos', `entidade=eq.vaga&entidade_id=eq.${id}&cancelado_em=is.null&order=enviado_em`).catch(() => []), api.rpc('eh_diretoria_vagas').catch(() => false),
    api.rpc('admissoes_painel', { p_status: 'todas' }).then(l => l.filter(a => a.vaga_id === id)).catch(() => [])]);
  const U = porId(us), cargo = cgs.find(c => c.id === v.cargo_id), setor = ss.find(s => s.id === v.setor_id);
  const ev = k => [...evs].reverse().find(e => e.evento === k);
  const aprov = !VG_APROV.includes(v.status) && v.status !== 'cancelada';
  const passos = [['Requisição', U[v.solicitante_id]?.nome || '', 'ok'],
    ['Validação do RH', v.rh_em ? dataBR(v.rh_em.slice(0, 10)) : v.status === 'aguardando_rh' ? 'aguardando' : v.status === 'devolvida' ? 'devolvida' : '', v.rh_em ? 'ok' : v.status === 'reprovada' && !v.rh_em ? 'x' : v.status === 'aguardando_rh' ? 'atual' : ''],
    ['Diretoria', v.dir_em ? dataBR(v.dir_em.slice(0, 10)) : v.status === 'aguardando_diretoria' ? 'aguardando' : '', v.dir_em ? 'ok' : v.status === 'reprovada' && v.rh_em ? 'x' : v.status === 'aguardando_diretoria' ? 'atual' : ''],
    ['Seleção', aprov ? (v.status === 'preenchida' ? 'preenchida' : 'em andamento') : '', v.status === 'preenchida' ? 'ok' : aprov ? 'atual' : ''],
    ['Admissão', adms.length ? `${adms.filter(a => a.status === 'concluida').length}/${v.quantidade} concluída(s)` : '', adms.length && adms.every(a => a.status === 'concluida') && adms.length >= v.quantidade ? 'ok' : adms.length ? 'atual' : '']];
  const caixaAcao = (() => {
    if (v.status === 'aguardando_rh' && editaRH()) return `<form class="cartao form" id="f-rh"><h2 class="largo" style="margin:0">Validação do RH</h2>
      <p class="muted largo" style="margin:0">Confira salário x faixa do cargo${cargo?.salario_base ? ` (base ${brl(cargo.salario_base)})` : ''}, contrato, requisitos e orçamento. Os ajustes ficam registrados.</p>
      <label class="campo">Salário (R$)<input name="salario_ofertado" inputmode="decimal" value="${v.salario_ofertado != null ? Number(v.salario_ofertado).toFixed(2).replace('.', ',') : ''}"></label>
      <label class="campo">Tipo de contrato<select name="tipo_contrato">${Object.entries(TIPOS_CONTRATO).map(([k, t]) => `<option value="${k}" ${k === v.tipo_contrato ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo">Quantidade<input type="number" min="1" name="quantidade" value="${v.quantidade}"></label><label class="campo">Prazo para preencher<input type="date" name="prazo" value="${v.prazo || ''}"></label>
      <label class="campo">Escala / horário<input name="escala" value="${esc(v.escala || '')}"></label>
      <label class="campo largo">Requisitos<textarea name="requisitos" rows="2">${esc(v.requisitos || '')}</textarea></label>
      <label class="campo largo">Benefícios<textarea name="beneficios" rows="2">${esc(v.beneficios || '')}</textarea></label>
      <label class="campo largo">Parecer do RH<textarea name="parecer" rows="2" placeholder="Obrigatório para devolver ou reprovar"></textarea></label>
      <div class="largo acoes"><button class="btn ok" value="aprovado">Validar e enviar à diretoria</button><button class="btn" value="devolvido">Devolver ao gestor</button><button class="btn perigo" value="reprovado">Reprovar</button></div></form>`;
    if (v.status === 'aguardando_diretoria' && dir) return `<form class="cartao form" id="f-dir"><h2 class="largo" style="margin:0">Aprovação da diretoria</h2>
      <p class="muted largo" style="margin:0">Ao aprovar, a seleção é aberta e o PDF da requisição sai com o seu registro de aprovação e o código de verificação.</p>
      <label class="campo largo">Parecer<textarea name="parecer" rows="2" placeholder="Obrigatório para devolver ou reprovar"></textarea></label>
      <div class="largo acoes"><button class="btn ok" value="aprovado">Aprovar vaga</button><button class="btn" value="devolvido">Devolver ao RH</button><button class="btn perigo" value="reprovado">Reprovar</button></div></form>`;
    if (v.status === 'devolvida' && (v.solicitante_id === estado.usuario.id || editaRH())) return `<div class="cartao alerta-obs"><b>Devolvida para ajuste:</b> ${esc(ev('devolvida')?.parecer || '')}
      <div style="margin-top:8px"><a class="btn prim" href="#/rh/vagas/corrigir/${v.id}">Corrigir e reenviar</a></div></div>`;
    return '';
  })();
  const L = (k, t) => t ? `<div><div class="muted">${k}</div><b>${esc(t)}</b></div>` : '';
  tela.innerHTML = `<div class="topo"><div><h1>${esc(v.numero || 'Vaga')} · ${esc(cargo?.nome || 'Cargo')}</h1>
      <p class="sub"><span class="tag ${ST_VAGA[v.status]?.[1] || ''}">${esc(ST_VAGA[v.status]?.[0] || v.status)}</span> · ${v.quantidade} vaga(s)${setor ? ' · ' + esc(setor.nome) : ''} · requisitada por ${esc(U[v.solicitante_id]?.nome || '—')}</p></div>
      <div class="acoes"><button class="btn" id="pdf-req">⬇ Requisição (PDF)</button>${aprov && editaRH() ? `<a class="btn prim" href="#/rh/recrutamento/vaga/${v.id}">Seleção de candidatos</a>` : ''}<a class="btn" href="#/rh/vagas">Voltar</a></div></div>
    ${adStepper(passos)}
    ${v.status === 'reprovada' ? `<div class="cartao alerta-obs"><b>Reprovada</b> por ${esc(U[v.reprovada_por]?.nome || '—')} em ${dataBR((v.reprovada_em || '').slice(0, 10))}: ${esc(v.motivo_reprovacao || '')}</div>` : ''}
    ${caixaAcao}
    <div class="cartao"><h2>Dados da vaga</h2><div class="form">
      ${L('Motivo', v.motivo)}${L('Contrato', TIPOS_CONTRATO[v.tipo_contrato])}${v.salario_ofertado != null && (editaRH() || dir || v.solicitante_id === estado.usuario.id) ? L('Salário', brl(v.salario_ofertado)) : ''}
      ${L('Centro de custo', ccs.find(c => c.id === v.centro_custo_id)?.nome)}${L('Local de trabalho', v.local_trabalho)}${L('Cliente / contrato', v.cliente)}${L('Escala / horário', v.escala)}
      ${L('Início desejado', dataBR(v.data_inicio_desejada))}${L('Prazo para preencher', dataBR(v.prazo))}
      <div class="largo">${L('Justificativa', v.justificativa)}</div>${v.requisitos ? `<div class="largo">${L('Requisitos', v.requisitos)}</div>` : ''}${v.beneficios ? `<div class="largo">${L('Benefícios', v.beneficios)}</div>` : ''}
      ${v.codigo_verificacao ? `<div class="largo muted">Código de verificação da aprovação: <b class="mono">${esc(v.codigo_verificacao)}</b></div>` : ''}</div></div>
    ${adms.length ? `<div class="cartao"><h2>Admissões desta vaga</h2><ul class="lista-simples">${adms.map(a => `<li><span><b>${esc(a.colaborador)}</b> <span class="muted">${esc(a.numero || '')}</span> <span class="tag ${a.status === 'concluida' ? 'verde' : a.status === 'cancelada' ? '' : 'amarelo'}">${a.status === 'concluida' ? 'Admitido' : a.status === 'cancelada' ? 'Cancelada' : 'Em admissão'}</span></span><a class="btn peq" href="#/rh/admissoes/ver/${a.id}">Abrir</a></li>`).join('')}</ul></div>` : ''}
    <div class="cartao"><h2>Histórico</h2><ol class="ad-hist">${evs.map(e => `<li><b>${esc(VG_EVENTO[e.evento] || e.evento)}</b> <span class="muted">${dtHora(e.em)} · ${esc(U[e.por]?.nome || '')}</span>${e.parecer ? `<div>${esc(e.parecer)}</div>` : ''}</li>`).join('')}</ol></div>
    ${anx.length ? `<div class="cartao"><h2>Documentos anexados</h2><div class="anexos">${anx.map(a => `<span class="anexo" data-arquivo="${esc(a.caminho_arquivo)}">📄 ${esc(a.nome_original || 'arquivo')} <small class="muted">${esc(a.descricao || '')} · ${esc(U[a.enviado_por]?.nome || '')}</small></span>`).join('')}</div></div>` : ''}
    <p class="muted">A aprovação no sistema vale como assinatura eletrônica (Lei 14.063/2020): registra usuário, data, hora e código de verificação. Assinatura gov.br fica só para o contrato de trabalho.</p>`;
  const decidir = (form, rpc, extra) => form?.addEventListener('submit', async e => { e.preventDefault(); const d = formDados(form), dec = e.submitter.value;
    if (dec !== 'aprovado' && !d.parecer) return aviso('Escreva o motivo no parecer.', true);
    if (dec === 'reprovado' && !await confirmar('Reprovar esta requisição de vaga?', { botao: 'Reprovar' })) return;
    await ocupado(e.submitter, async () => { try { await api.rpc(rpc, { p_vaga: v.id, p_decisao: dec, p_parecer: d.parecer || null, ...(extra ? extra(d) : {}) });
      aviso(dec === 'aprovado' ? (rpc === 'rh_decidir_vaga' ? 'Validada e enviada à diretoria.' : 'Vaga aprovada: a seleção está aberta.') : 'Decisão registrada.'); navegar(); } catch (err) { falha(err); } }); });
  decidir($('#f-rh'), 'rh_decidir_vaga', d => ({ p: { salario_ofertado: num(d.salario_ofertado), tipo_contrato: d.tipo_contrato, quantidade: d.quantidade, prazo: d.prazo, escala: d.escala, requisitos: d.requisitos, beneficios: d.beneficios } }));
  decidir($('#f-dir'), 'diretoria_decidir_vaga');
  $('#anx-vaga')?.addEventListener('change', async e => { const fs = [...e.target.files]; if (!fs.length) return;
    try { await adEnviar(fs, `vaga/${v.id}`, 'anexar_vaga', { p_vaga: v.id, p_desc: 'Assinado (gov.br)' }); aviso('Documento anexado.'); navegar(); } catch (err) { falha(err); } });
  $('#pdf-req').onclick = e => ocupado(e.currentTarget, async () => { try { await pdfRequisicaoVaga(v, { cargo, setor, U, ccs, evs }); } catch (err) { falha(err); } });
});

async function pdfRequisicaoVaga(v, { cargo, setor, U, ccs, evs }) {
  const linha = (a, b) => b ? [a, String(b)] : null;
  const dados = [linha('Cargo', cargo?.nome), linha('Setor', setor?.nome), linha('Quantidade', v.quantidade), linha('Motivo', v.motivo), linha('Tipo de contrato', TIPOS_CONTRATO[v.tipo_contrato]),
    linha('Salário', v.salario_ofertado != null ? brl(v.salario_ofertado) : ''), linha('Centro de custo', ccs.find(c => c.id === v.centro_custo_id)?.nome), linha('Local de trabalho', v.local_trabalho),
    linha('Cliente / contrato', v.cliente), linha('Escala / horário', v.escala), linha('Início desejado', dataBR(v.data_inicio_desejada)), linha('Prazo para preencher', dataBR(v.prazo))].filter(Boolean);
  const reg = [['Requisição (gestor)', U[v.solicitante_id]?.nome || '—', dtHora(v.criado_em), 'Solicitado'],
    ['Validação do RH', U[v.rh_por]?.nome || '—', dtHora(v.rh_em) || '—', v.rh_em ? 'Validado' : 'Pendente'],
    ['Diretoria', U[v.dir_por]?.nome || '—', dtHora(v.dir_em) || '—', v.dir_em ? 'Aprovado' : v.status === 'reprovada' ? 'Reprovado' : 'Pendente']];
  const pareceres = evs.filter(e => e.parecer).map(e => `${VG_EVENTO[e.evento] || e.evento} (${U[e.por]?.nome || ''}, ${dtHora(e.em)}): ${e.parecer}`);
  await pdfTimbrado({ setor: 'Recursos Humanos', numero: v.numero || '—', arquivo: `Requisicao de vaga ${v.numero || ''}.pdf`,
    destinatario: [['À Diretoria'], ['Verbo Logística', 'b'], ['Recursos Humanos']],
    assunto: `Requisição de pessoal — ${cargo?.nome || 'vaga'}`,
    corpo: [
      `Solicitamos a abertura de ${v.quantidade} vaga(s) para o cargo de ${cargo?.nome || '—'}${setor ? `, setor ${setor.nome}` : ''}, conforme os dados abaixo.`,
      { tabela: { cab: ['Item', 'Informação'], linhas: dados, colunas: { 0: { cellWidth: 48, fontStyle: 'bold' } } } },
      { negrito: 'Justificativa' }, v.justificativa || '—',
      ...(v.requisitos ? [{ negrito: 'Requisitos da função' }, v.requisitos] : []),
      ...(v.beneficios ? [{ negrito: 'Benefícios' }, v.beneficios] : []),
      { negrito: 'Registro de aprovações (assinatura eletrônica no sistema)' },
      { tabela: { cab: ['Etapa', 'Responsável', 'Data e hora', 'Situação'], linhas: reg, colunas: { 2: { cellWidth: 34 }, 3: { cellWidth: 24 } } } },
      ...(pareceres.length ? [{ lista: pareceres }] : []),
      v.codigo_verificacao ? `Código de verificação: ${v.codigo_verificacao}. As aprovações acima foram registradas no Verbo Gestão com usuário, data e hora (assinatura eletrônica — Lei 14.063/2020).`
        : 'Documento emitido antes da aprovação final da diretoria.',
    ],
    assinatura: [['Recursos Humanos', 'b'], ['Verbo Logística']] });
}

// a seleção (tela antiga) só abre com a vaga aprovada
{ const orig = ROTAS['/rh/recrutamento/vaga/:id'];
  rota('/rh/recrutamento/vaga/:id', async (tela, id) => {
    const v = await api.um('vagas', `id=eq.${id}&select=status`);
    if (v && VG_APROV.includes(v.status)) { location.hash = '#/rh/vagas/ver/' + id; return; }
    await orig(tela, id);
    $('.topo .acoes', tela)?.insertAdjacentHTML('afterbegin', `<a class="btn" href="#/rh/vagas/ver/${id}">Requisição e aprovações</a>`);
  }); }

// bloco nas Aprovações
{ const orig = ROTAS['/aprovacoes'];
  rota('/aprovacoes', async (tela, ...a) => {
    await orig(tela, ...a);
    const [vs, dir, cgs] = await Promise.all([api.listar('vagas', 'status=in.(aguardando_rh,aguardando_diretoria,devolvida)&select=id,numero,status,cargo_id,quantidade,solicitante_id,criado_em').catch(() => []),
      api.rpc('eh_diretoria_vagas').catch(() => false), cargosL()]);
    const minhas = vs.filter(v => (v.status === 'aguardando_rh' && editaRH()) || (v.status === 'aguardando_diretoria' && dir) || (v.status === 'devolvida' && v.solicitante_id === estado.usuario.id));
    if (!minhas.length) return;
    $$('.cartao.vazio', tela).forEach(x => x.remove());
    $('.topo', tela)?.insertAdjacentHTML('afterend', `<div class="cartao"><h2>Requisições de vaga (${minhas.length})</h2><ul class="lista-simples">${minhas.map(v => `<li><span><b>${esc(v.numero || '')}</b> · ${esc(cgs.find(c => c.id === v.cargo_id)?.nome || '')} · ${v.quantidade} vaga(s)
      <span class="tag ${ST_VAGA[v.status][1]}">${ST_VAGA[v.status][0]}</span></span><a class="btn peq prim" href="#/rh/vagas/ver/${v.id}">Analisar</a></li>`).join('')}</ul></div>`);
  }); }

// ===================== Admissões =====================
const adProgresso = ets => { const t = ets.length, f = ets.filter(e => e.status !== 'pendente').length; return { t, f, pct: t ? Math.round(f / t * 100) : 0 }; };
const adAtrasada = e => e.status === 'pendente' && e.prazo && e.prazo < hojeISO();

rota('/rh/admissoes', async tela => {
  const aba = estado.params.get('aba') || 'processos', st = estado.params.get('status') || 'em_andamento';
  const ls = await api.rpc('admissoes_painel', { p_status: st }).catch(err => { falha(err); return []; });
  const meus = (await api.rpc('meus_setores_admissao').catch(() => [])) || [];
  const topo = `<div class="topo"><div><h1>Admissões</h1><p class="sub">Etapas por setor, em paralelo, com linha do tempo e agenda de treinamentos de integração</p></div>
      <div class="acoes">${tem('administrador', 'rh', 'ssma') ? '<button class="btn" id="ad-regras">Regras por cliente</button>' : ''}${editaRH() ? '<a class="btn" href="#/rh/vagas">Vagas e seleção</a>' : ''}</div></div>
    <div class="abas"><a href="#/rh/admissoes?aba=processos&status=${st}" class="${aba === 'processos' ? 'ativa' : ''}">Processos</a><a href="#/rh/admissoes?aba=agenda&status=${st}" class="${aba === 'agenda' ? 'ativa' : ''}">Agenda de treinamentos</a><a href="#/rh/admissoes?aba=indicadores" class="${aba === 'indicadores' ? 'ativa' : ''}">Indicadores</a></div>
    <form class="filtros" id="f-st"><select name="status">${[['em_andamento', 'Em andamento'], ['concluida', 'Concluídas'], ['cancelada', 'Canceladas'], ['todas', 'Todas']].map(([k, t]) => `<option value="${k}" ${k === st ? 'selected' : ''}>${t}</option>`).join('')}</select></form>`;
  if (aba === 'indicadores') {
    await adIndicadores(tela, topo.replace(/<form class="filtros" id="f-st">[\s\S]*<\/form>/, ''));
    $('#ad-regras')?.addEventListener('click', adRegrasCliente);
    return;
  }
  if (aba === 'agenda') {
    const ts = ls.flatMap(a => (a.treinos || []).map(t => ({ ...t, adm: a })).filter(t => t.status !== 'cancelado')).sort((x, y) => x.inicio.localeCompare(y.inicio));
    const dias = [...new Set(ts.map(t => diaLocal(t.inicio)))];
    tela.innerHTML = `${topo}<div class="cartao">${ts.length ? dias.map(d => `<div class="ad-dia" data-dia${fAttr('data', d)}><h3>${new Date(d + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}${d === hojeISO() ? ' <span class="tag azul">hoje</span>' : ''}</h3>
        <ul class="ad-agenda">${ts.filter(t => diaLocal(t.inicio) === d).map(t => `<li data-t${fAttr('setor', t.setor === 'Cliente' ? 'Cliente' : t.setor)}${fAttr('busca', [t.titulo, t.adm.colaborador, t.cliente, t.responsavel, t.local].join(' '))}>
          <span class="ad-hora">${hora(t.inicio)}–${hora(t.fim)}</span>
          <span><b>${esc(t.titulo)}</b> · ${esc(t.adm.colaborador)} <span class="muted">${esc(t.adm.cargo || '')}</span><br><span class="muted">${esc([t.local, t.responsavel && 'resp. ' + t.responsavel, t.setor === 'Cliente' ? 'Cliente ' + (t.cliente || '') : t.setor, 'confirma: ' + t.confirma_setor].filter(Boolean).join(' · '))}</span></span>
          <span><span class="tag ${ST_TREINO[t.status][1]}">${ST_TREINO[t.status][0]}</span>${t.status === 'agendado' && new Date(t.inicio) < new Date() ? ' <span class="tag vermelho">confirmar</span>' : ''} <a class="btn peq" href="#/rh/admissoes/ver/${t.adm.id}">Abrir</a></span></li>`).join('')}</ul></div>`).join('')
      : '<div class="vazio">Nenhum treinamento agendado.</div>'}</div>`;
    filtroLocal(tela, { itens: '[data-t]', antes: '.cartao:last-of-type', campos: [{ k: 'setor', rotulo: 'Setor responsável' }], aoMudar: () => $$('[data-dia]', tela).forEach(d => (d.hidden = !$$('[data-t]', d).some(li => !li.hidden))) });
  } else {
    tela.innerHTML = `${topo}<div class="cartao">${ls.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nº</th><th>Colaborador</th><th>Cargo</th><th>Vaga</th><th>Início previsto</th><th>Progresso</th><th>Com o setor</th></tr></thead><tbody>
      ${ls.map(a => { const p = adProgresso(a.etapas || []), pend = (a.etapas || []).filter(e => e.status === 'pendente'), atr = pend.filter(adAtrasada).length;
        const porSetor = {}; pend.forEach(e => (porSetor[e.setor] = (porSetor[e.setor] || 0) + 1));
        const comigo = pend.some(e => meus.includes(e.setor)) || (a.treinos || []).some(t => t.status === 'agendado' && meus.includes(t.confirma_setor) && new Date(t.inicio) < new Date());
        return `<tr class="clicavel" onclick="location.hash='#/rh/admissoes/ver/${a.id}'" data-a${fAttr('vez', comigo ? 'Comigo (meu setor)' : 'Com outros setores')}${fAttr('atraso', atr ? 'Com etapa atrasada' : 'Em dia')}${fAttr('busca', [a.numero, a.colaborador, a.cargo, a.vaga_numero].join(' '))}>
        <td data-r="Nº" class="nowrap"><b>${esc(a.numero || '')}</b></td><td data-r="Colaborador">${esc(a.colaborador)}${a.motorista ? ' <span class="tag">motorista</span>' : ''}</td><td data-r="Cargo">${esc(a.cargo || '—')}</td>
        <td data-r="Vaga">${esc(a.vaga_numero || '—')}</td><td data-r="Início" class="nowrap">${dataBR(a.data_prevista)}</td>
        <td data-r="Progresso"><div class="ad-barra"><i style="width:${p.pct}%"></i></div><small class="muted">${p.f}/${p.t} etapas${atr ? ` · <b class="txt-verm">${atr} atrasada(s)</b>` : ''}</small></td>
        <td data-r="Com o setor">${a.status !== 'em_andamento' ? `<span class="tag ${a.status === 'concluida' ? 'verde' : ''}">${a.status === 'concluida' ? 'Admitido' : 'Cancelada'}</span>` : Object.entries(porSetor).map(([s, n]) => `<span class="tag ${meus.includes(s) ? 'amarelo' : ''}">${esc(s)} ${n}</span>`).join(' ') || '<span class="tag verde">pronta para concluir</span>'}${comigo ? ' <span class="tag vermelho">sua vez</span>' : ''}</td></tr>`; }).join('')}
      </tbody></table></div>` : '<div class="vazio">Nenhuma admissão nesta situação. As admissões começam ao contratar um candidato aprovado na seleção (ou pela ficha do colaborador).</div>'}</div>`;
    filtroLocal(tela, { itens: 'tbody tr[data-a]', antes: '.cartao:last-of-type', campos: [{ k: 'vez', rotulo: 'De quem é a vez' }, { k: 'atraso', rotulo: 'Prazo' }] });
  }
  $('#f-st [name=status]').onchange = e => { location.hash = `#/rh/admissoes?aba=${aba}&status=${e.target.value}`; };
  $('#ad-regras')?.addEventListener('click', adRegrasCliente);
});

// indicadores: tempo de resposta por etapa e setor (da liberação da etapa até a conclusão)
async function adIndicadores(tela, topo) {
  const ini = estado.params.get('de') || somaDias(hojeISO(), -90), fim = estado.params.get('ate') || hojeISO();
  const I = await api.rpc('admissao_indicadores', { p_ini: ini, p_fim: fim }).catch(err => { falha(err); return null; });
  const n = x => x == null ? '—' : String(x).replace('.', ',');
  const corPrazo = p => p == null ? '' : p >= 90 ? 'verde' : p >= 70 ? 'amarelo' : 'vermelho';
  const tab = (ls, cols) => ls?.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr>${cols.map(c => `<th>${c[0]}</th>`).join('')}</tr></thead><tbody>${ls.map(r => `<tr>${cols.map(c => `<td data-r="${c[0]}">${c[1](r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Sem dados no período.</div>';
  const maxS = Math.max(1, ...(I?.setores || []).map(s => Number(s.media_dias) || 0));
  const V = I?.vagas || {}, A = I?.admissoes || {};
  tela.innerHTML = `${topo}
    <form class="filtros" id="f-per"><label>De <input type="date" name="de" value="${ini}"></label><label>Até <input type="date" name="ate" value="${fim}"></label><button class="btn">Aplicar</button></form>
    ${I ? `<div class="grade" style="margin-bottom:14px">
      <div class="cartao kpi"><div class="n">${n(V.rh_dias)}</div><div class="r">dias · requisição → validação do RH</div></div>
      <div class="cartao kpi"><div class="n">${n(V.dir_dias)}</div><div class="r">dias · RH → aprovação da diretoria</div></div>
      <div class="cartao kpi"><div class="n">${n(V.selecao_dias)}</div><div class="r">dias · aprovação → contratação</div></div>
      <div class="cartao kpi"><div class="n">${n(A.total_dias)}</div><div class="r">dias · admissão do início ao fim (${A.concluidas || 0} concluída(s))</div></div>
      <div class="cartao kpi"><div class="n">${n(A.cliente_dias)}</div><div class="r">dias · cliente para aprovar a documentação</div></div></div>
    <div class="cartao"><h2>Por setor</h2><p class="muted">Tempo médio de resposta: da liberação da etapa (início do processo ou conclusão da etapa anterior) até a conclusão.</p>
      ${(I.setores || []).length ? `<ul class="ad-ind">${I.setores.map(s => `<li><b>${esc(s.setor)}</b><span class="ad-barra"><i style="width:${Math.round((Number(s.media_dias) || 0) / maxS * 100)}%"></i></span>
        <span>${n(s.media_dias)} dia(s)</span><span class="tag ${corPrazo(s.pct_prazo)}">${s.pct_prazo == null ? 'sem prazo' : s.pct_prazo + '% no prazo'}</span>${s.atrasadas ? `<span class="tag vermelho">${s.atrasadas} atrasada(s) agora</span>` : ''}</li>`).join('')}</ul>` : '<div class="vazio">Sem dados no período.</div>'}</div>
    <div class="cartao"><h2>Por etapa da admissão</h2>${tab(I.etapas, [['Etapa', r => esc(r.etapa)], ['Setor', r => esc(r.setor)], ['Concluídas', r => r.concluidas], ['Tempo médio (dias)', r => n(r.media_dias)],
      ['No prazo', r => r.pct_prazo == null ? '—' : `<span class="tag ${corPrazo(r.pct_prazo)}">${r.pct_prazo}%</span>`], ['Pendentes', r => r.pendentes], ['Atrasadas', r => r.atrasadas ? `<b class="txt-verm">${r.atrasadas}</b>` : 0]])}</div>
    ${I.desligamentos ? `<div class="cartao"><h2>Por etapa do desligamento</h2>${tab(I.desligamentos, [['Etapa', r => esc(r.etapa)], ['Setor', r => esc(r.setor)], ['Concluídas', r => r.concluidas],
      ['No prazo', r => r.pct_prazo == null ? '—' : `<span class="tag ${corPrazo(r.pct_prazo)}">${r.pct_prazo}%</span>`], ['Atrasadas', r => r.atrasadas ? `<b class="txt-verm">${r.atrasadas}</b>` : 0]])}</div>` : ''}` : ''}`;
  $('#f-per').onsubmit = e => { e.preventDefault(); const d = formDados(e.target); location.hash = `#/rh/admissoes?aba=indicadores&de=${d.de}&ate=${d.ate}`; };
}

// regras de integração por cliente (prazo de resposta e dias permitidos)
const AD_DIAS = [[1, 'seg'], [2, 'ter'], [3, 'qua'], [4, 'qui'], [5, 'sex'], [6, 'sáb'], [7, 'dom']];
async function adRegrasCliente() {
  const rs = await api.listar('admissao_clientes_regras', 'order=cliente').catch(err => { falha(err); return null; }); if (!rs) return;
  const linha = (g = {}) => `<tr data-reg>
    <td data-r="Cliente"><input name="cliente" value="${esc(g.cliente || '')}" ${g.cliente === '(padrão)' ? 'readonly' : ''} placeholder="Nome do cliente"></td>
    <td data-r="Resposta (dias úteis)"><input type="number" min="0" name="prazo" value="${g.prazo_aprovacao_dias ?? 3}" style="width:70px"></td>
    <td data-r="Dias da integração" class="nowrap">${AD_DIAS.map(([k, t]) => `<label class="check" style="display:inline-flex;margin-right:6px"><input type="checkbox" name="d${k}" ${(g.dias_semana || [2, 4]).includes(k) ? 'checked' : ''}> ${t}</label>`).join('')}</td>
    <td data-r="Antecedência (dias)"><input type="number" min="0" name="ant" value="${g.antecedencia_dias ?? 1}" style="width:70px"></td>
    <td data-r="Horário" class="nowrap"><input type="time" name="h1" value="${(g.hora_inicio || '08:00').slice(0, 5)}"> – <input type="time" name="h2" value="${(g.hora_fim || '12:00').slice(0, 5)}"></td>
    <td data-r="Local"><input name="local" value="${esc(g.local || '')}"></td>
    <td data-r="Documentos exigidos"><input name="docs" value="${esc(g.documentos || '')}" placeholder="ASO, ficha de registro, NR-…"></td></tr>`;
  const r = await modal(`<form><h2>Integração nos clientes</h2><p class="muted">Prazo que cada cliente leva para aprovar a documentação e os dias em que faz a integração. "(padrão)" vale para quem não tem regra própria.</p>
    <div class="tabela-wrap"><table class="responsiva" id="t-reg"><thead><tr><th>Cliente</th><th>Resposta (dias úteis)</th><th>Dias da integração</th><th>Antecedência</th><th>Horário</th><th>Local</th><th>Documentos exigidos</th></tr></thead>
    <tbody>${rs.map(linha).join('')}</tbody></table></div><button type="button" class="btn peq" id="reg-mais">+ Cliente</button>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`,
    { aoAbrir: (raiz, fechar) => { $('.modal', raiz).classList.add('modal-largo'); $('#reg-mais', raiz).onclick = () => $('#t-reg tbody', raiz).insertAdjacentHTML('beforeend', linha());
      $('form', raiz).onsubmit = e => { e.preventDefault(); fechar($$('[data-reg]', raiz).map(tr => { const v = k => $(`[name=${k}]`, tr); return { cliente: v('cliente').value.trim(), prazo_aprovacao_dias: Number(v('prazo').value) || 0,
        dias_semana: AD_DIAS.map(([k]) => k).filter(k => v('d' + k).checked), antecedencia_dias: Number(v('ant').value) || 0, hora_inicio: v('h1').value || '08:00', hora_fim: v('h2').value || '12:00',
        local: v('local').value.trim() || null, documentos: v('docs').value.trim() || null }; }).filter(x => x.cliente)); }; } });
  if (!r?.length) return;
  if (r.some(x => !x.dias_semana.length)) return aviso('Cada cliente precisa de pelo menos um dia de integração.', true);
  try { await api.rest('admissao_clientes_regras?on_conflict=cliente', { metodo: 'POST', corpo: r, prefer: 'resolution=merge-duplicates,return=representation' }); aviso('Regras salvas.'); } catch (err) { falha(err); }
}

const AD_LINK = { ficha: c => [`#/rh/colaboradores/editar/${c}`, 'Abrir ficha'], docs: c => [`#/rh/colaboradores/ver/${c}?aba=docs`, 'Documentos'], aso: () => ['#/ssma/aso', 'ASO no SSMA'],
  tox: () => ['#/ssma/aso', 'Exames no SSMA'], cnh: c => [`#/rh/colaboradores/editar/${c}`, 'CNH na ficha'], contrato: c => [`#/rh/colaboradores/ver/${c}?aba=docs`, 'Anexar contrato'],
  epi: () => ['#/almox/epi', 'Entregar EPI'], acessos: c => [`#/rh/crachas?c=${c}`, 'Gerar crachá'] };
const AD_PERM_LINK = { ficha: () => editaRH(), docs: () => editaRH(), contrato: () => editaRH(), cnh: () => editaRH(), acessos: () => editaRH(), aso: () => tem('administrador', 'ssma'),
  tox: () => tem('administrador', 'ssma', 'rh'), epi: () => tem('administrador', 'almoxarifado', 'rh') };

function adDica(e, D) {
  const c = D.col;
  if (e.codigo === 'ficha') { const f = [['CPF', D.rh ? c.cpf : true], ['nascimento', c.data_nascimento], ['telefone', c.telefone], ['endereço', c.logradouro && c.cidade], ['foto da ficha', c.foto_caminho],
      ['foto do crachá', c.foto_cracha_caminho], ['contato de emergência', c.emergencia_nome && c.emergencia_telefone], ['conta ou Pix', c.tem_banco], ['setor', c.setor_id]].filter(([, ok]) => !ok).map(([t]) => t);
    return f.length ? `Falta: ${f.join(', ')}.` : 'Ficha completa.'; }
  if (e.codigo === 'docs') return D.docs_faltando.length ? `Faltam ${D.docs_faltando.length}: ${D.docs_faltando.join(', ')}.` : 'Todos os documentos obrigatórios recebidos.';
  if (e.codigo === 'aso') return D.aso ? `ASO admissional de ${dataBR(D.aso.data)}: ${D.aso.resultado.replace('_', ' com ')}.` : 'Sem ASO admissional lançado no SSMA.';
  if (e.codigo === 'cnh') return c.cnh_categoria ? `CNH ${c.cnh_categoria}${c.cnh_ear ? ' · EAR' : ' · sem EAR'}${c.cnh_validade ? ' · validade ' + dataBR(c.cnh_validade) : ''}. Anexe a consulta de pontuação.` : 'CNH não informada na ficha.';
  if (e.codigo === 'contrato') return 'Conclui sozinha quando o contrato assinado é anexado em Documentos da ficha. Pode ser assinado à mão ou pelo gov.br (assinatura avançada, gratuita).';
  if (e.codigo === 'esocial') return 'Anexe o recibo do S-2200. Envio obrigatório antes do 1º dia de trabalho.';
  if (e.codigo === 'os_seg') return 'Anexe a ordem de serviço de segurança assinada (riscos da função e EPIs obrigatórios).';
  if (e.codigo === 'epi') return D.epi ? `${D.epi} entrega(s) de EPI registrada(s). Conclui sozinha com a ficha de EPI assinada.` : 'Nenhuma entrega de EPI registrada no almoxarifado.';
  if (e.codigo === 'acessos') return c.cracha_gerado_em ? `Crachá gerado em ${dataBR(c.cracha_gerado_em.slice(0, 10))}.` : 'Crachá ainda não gerado.';
  if (e.codigo === 'treinamentos') return 'Conclui sozinha quando todos os treinamentos da agenda forem confirmados.';
  if (e.codigo === 'cliente') { const a = D.adm, g = D.cli_regra || {};
    if (!a.cliente) return 'Informe o cliente que o colaborador vai atender.';
    if (!a.cli_enviado_em) return `Cliente ${a.cliente}. Envie a documentação exigida${g.documentos ? ` (${g.documentos})` : ''}, anexe o e-mail ou o pacote enviado e registre "Docs enviados".`;
    const atr = a.cli_prazo && a.cli_prazo < hojeISO();
    return `Cliente ${a.cliente} · documentação enviada em ${dataBR(a.cli_enviado_em)} · resposta esperada até ${dataBR(a.cli_prazo)}${atr ? ' — ATRASADO: cobrar o cliente' : ''}.`; }
  return '';
}

rota('/rh/admissoes/ver/:id', async (tela, id) => {
  const D = await api.rpc('admissao_detalhe_v2', { p_adm: id }).catch(() => api.rpc('admissao_detalhe', { p_adm: id })).catch(err => { falha(err); return null; });
  if (!D) { tela.innerHTML = '<div class="cartao vazio">Admissão não encontrada ou sem acesso.</div>'; return; }
  const a = D.adm, c = D.col, ets = D.etapas, trs = D.treinos, meus = D.meus_setores || [], rh = D.rh;
  const andamento = a.status === 'em_andamento';
  const est = k => ets.find(e => e.codigo === k);
  const fasePasso = f => { const es = ets.filter(e => e.fase === f), p = adProgresso(es); return [f, `${p.f}/${p.t}`, p.f === p.t ? 'ok' : es.some(e => e.status !== 'pendente') || f === AD_FASES[0] ? 'atual' : '']; };
  const vg = D.vaga;
  const passos = [...(vg ? [['Requisição e aprovação', vg.dir_em ? 'aprovada ' + dataBR(vg.dir_em.slice(0, 10)) : '', vg.dir_em ? 'ok' : 'atual'], ['Seleção', 'candidato aprovado', 'ok']] : []),
    ...AD_FASES.map(fasePasso), ['Admitido', a.status === 'concluida' ? dataBR((a.concluida_em || '').slice(0, 10)) : '', a.status === 'concluida' ? 'ok' : a.status === 'cancelada' ? 'x' : '']];
  const registro = ['contrato', 'esocial', 'aso'].every(k => est(k)?.status !== 'pendente');
  const pendentes = ets.filter(e => e.status === 'pendente');
  const prontaConcluir = andamento && !pendentes.length;
  const bloqueio = e => (e.depende || []).map(k => est(k)).filter(x => x && x.status === 'pendente');
  const itemEtapa = e => { const [stT, stC, ic] = ST_ETAPA[e.status], bl = bloqueio(e), meu = meus.includes(e.setor) || rh;
    const lk = AD_LINK[e.codigo]?.(c.id), plk = AD_PERM_LINK[e.codigo]?.();
    return `<li class="ad-et ${e.status}${adAtrasada(e) ? ' atrasada' : ''}"><span class="ad-ic">${ic}</span><div class="ad-et-c">
      <div class="ad-et-t"><b>${esc(e.etapa)}</b> <span class="tag">${esc(e.setor)}</span> <span class="tag ${stC}">${stT}</span>${adAtrasada(e) ? ` <span class="tag vermelho">atrasada · prazo ${dataBR(e.prazo)}</span>` : e.status === 'pendente' && e.prazo ? ` <span class="muted">prazo ${dataBR(e.prazo)}</span>` : ''}</div>
      ${e.status === 'pendente' ? `<div class="muted">${esc(adDica(e, D))}${bl.length ? ` <b>Aguardando:</b> ${bl.map(x => esc(x.etapa)).join('; ')}.` : ''}</div>` : `<div class="muted">${e.concluido_em ? dtHora(e.concluido_em) : ''}${e.feito_por_nome ? ' · ' + esc(e.feito_por_nome) : ''}${e.observacao ? ' · ' + esc(e.observacao) : ''}</div>`}
      ${adAnexosHtml(e.anexos)}
      ${e.codigo === 'cliente' && e.status === 'feito' && D.cli_sugestao && !trs.some(t => t.setor === 'Cliente' && t.status !== 'cancelado') && andamento ? `<div class="alerta-obs" style="margin-top:6px">Próxima integração possível no cliente: <b>${dataBR(D.cli_sugestao)}</b>${rh ? ' <button class="btn peq prim" data-cli="agendar">Agendar integração</button>' : ' (o RH agenda)'}</div>` : ''}
      ${andamento ? `<div class="ad-et-a">${lk && plk ? `<a class="btn peq" href="${lk[0]}">${esc(lk[1])}</a>` : ''}
        ${e.codigo === 'cliente' && (meu || rh) && (e.status === 'pendente' || (e.status === 'nao_se_aplica' && rh)) ? `<button class="btn peq" data-cli="definir">${a.cliente ? 'Trocar cliente' : 'Informar cliente'}</button>` : ''}
        ${e.codigo === 'cliente' && e.status === 'pendente' && meu && a.cliente ? `${!a.cli_enviado_em ? '<button class="btn peq prim" data-cli="enviar">Docs enviados ao cliente</button>' : '<button class="btn peq ok" data-cli="aprovar">Cliente aprovou</button><button class="btn peq" data-cli="recusar">Cliente pediu ajuste</button>'}` : ''}
        ${e.status === 'pendente' && meu ? `${e.codigo === 'cliente' ? '' : !e.auto ? `<button class="btn peq ok" data-concl="${e.id}">Concluir${e.exige_anexo ? ' (com anexo)' : ''}</button>` : `<button class="btn peq" data-verif>Verificar agora</button>`}
          <button class="btn peq" data-anx="${e.id}">📎 Anexar</button><button class="btn peq" data-na="${e.id}">Não se aplica</button>` : ''}
        ${e.status !== 'pendente' && rh ? `<button class="btn peq" data-reabrir="${e.id}">Reabrir</button>` : ''}</div>` : ''}</div></li>`; };
  const linhaTreino = t => { const [stT, stC] = ST_TREINO[t.status], conf = meus.includes(t.confirma_setor);
    return `<li class="ad-tr ${t.status}"><span class="ad-hora">${dataBR(diaLocal(t.inicio))}<br>${hora(t.inicio)}–${hora(t.fim)}</span><div>
      <b>${esc(t.titulo)}</b> <span class="tag ${stC}">${stT}</span>${t.status === 'agendado' && new Date(t.inicio) < new Date() ? ' <span class="tag vermelho">aguardando confirmação</span>' : ''}
      <div class="muted">${esc([t.local, t.responsavel && 'Responsável: ' + t.responsavel, t.setor === 'Cliente' ? 'Cliente: ' + (t.cliente || '—') : 'Setor: ' + t.setor, 'Confirma: ' + t.confirma_setor].filter(Boolean).join(' · '))}</div>
      ${t.status !== 'agendado' ? `<div class="muted">${t.concluido_em ? dtHora(t.concluido_em) : ''}${t.concluido_por_nome ? ' · ' + esc(t.concluido_por_nome) : ''}${t.observacao ? ' · ' + esc(t.observacao) : ''}${t.turma_id ? ' · registrado em Treinamentos' : ''}</div>` : ''}
      ${adAnexosHtml(t.anexos)}
      ${andamento && t.status === 'agendado' ? `<div class="ad-et-a">${conf ? `<button class="btn peq ok" data-tconcl="${t.id}">Confirmar conclusão</button><button class="btn peq" data-tanx="${t.id}">📎 Lista de presença / certificado</button><button class="btn peq" data-tfalta="${t.id}">Não compareceu</button>` : ''}
        ${rh ? `<button class="btn peq" data-ted="${t.id}">Remarcar / editar</button><button class="btn peq perigo" data-tcanc="${t.id}">Cancelar</button>` : ''}</div>` : ''}
      ${andamento && t.status === 'nao_compareceu' && rh ? `<div class="ad-et-a"><button class="btn peq" data-ted="${t.id}" data-reag="1">Reagendar</button></div>` : ''}</div></li>`; };

  tela.innerHTML = `<div class="topo"><div><h1>Admissão ${esc(a.numero || '')} · ${esc(c.nome)}</h1>
      <p class="sub">${esc(D.cargo || '')}${D.setor ? ' · ' + esc(D.setor) : ''} · início previsto ${dataBR(a.data_prevista)} · <span class="tag ${a.status === 'concluida' ? 'verde' : a.status === 'cancelada' ? '' : 'amarelo'}">${a.status === 'concluida' ? 'Admitido' : a.status === 'cancelada' ? 'Cancelada' : 'Em andamento'}</span>${a.motorista ? ' <span class="tag">motorista</span>' : ''}</p></div>
      <div class="acoes">${rh ? `<a class="btn" href="#/rh/colaboradores/ver/${c.id}">Ficha</a>` : ''}${vg ? `<a class="btn" href="#/rh/vagas/ver/${vg.id}">Vaga ${esc(vg.numero || '')}</a>` : ''}
        ${rh && andamento ? `<button class="btn ok" id="ad-concluir" ${prontaConcluir ? '' : 'disabled'} title="${prontaConcluir ? '' : 'Faltam etapas'}">Concluir admissão</button><button class="btn perigo" id="ad-cancelar">Cancelar</button>` : ''}
        <a class="btn" href="#/rh/admissoes">Voltar</a></div></div>
    ${adStepper(passos)}
    ${andamento && !registro && trs.some(t => t.status === 'agendado') ? '<div class="cartao alerta-obs">⚖️ <b>Treinamento é tempo de trabalho.</b> Os treinamentos só podem ser confirmados depois do contrato assinado, do eSocial (S-2200) enviado e do ASO apto. Confira se as datas da agenda são posteriores ao registro.</div>' : ''}
    ${a.status === 'concluida' && a.motorista ? '<div class="cartao alerta-obs">🚛 Motorista admitido: a liberação definitiva (padrinho e viagens padrão) segue em <a href="#/ssma/integracoes">SSMA › Liberação de motoristas</a>.</div>' : ''}
    ${AD_FASES.filter(f => f !== 'Integração e treinamentos').map(f => `<div class="cartao"><h2>${esc(f)}</h2><ol class="ad-ets">${ets.filter(e => e.fase === f).map(itemEtapa).join('')}</ol></div>`).join('')}
    <div class="cartao"><div class="topo" style="margin:0 0 8px"><div><h2 style="margin:0">Integração e treinamentos</h2><div class="muted">O RH monta a agenda; cada setor confirma a sua parte com a lista de presença ou o certificado. O treinamento no cliente é confirmado pelo SSMA.</div></div>
        ${rh && andamento ? '<div class="acoes"><button class="btn" id="tr-cargo">Sugerir do cargo</button><button class="btn prim" id="tr-novo">+ Agendar treinamento</button></div>' : ''}</div>
      <ol class="ad-ets">${ets.filter(e => e.fase === 'Integração e treinamentos').map(itemEtapa).join('')}</ol>
      ${trs.length ? `<ul class="ad-trs">${trs.map(linhaTreino).join('')}</ul>` : '<p class="muted">Nenhum treinamento agendado.</p>'}</div>`;

  // ações das etapas
  const pedirArquivos = async (titulo, obrig) => modal(`<form><h2>${esc(titulo)}</h2><div class="form"><label class="campo largo">Arquivo(s)${obrig ? ' *' : ''}<input type="file" name="arquivos" multiple accept="image/*,application/pdf"></label>
      <label class="campo largo">Observação<input name="obs"></label></div><div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`,
    { validar: d => obrig && !d.arquivos.length ? 'Anexe o arquivo.' : null });
  const anexar = (ent, idItem, arquivos, desc) => adEnviar(arquivos, `admissao/${a.id}`, 'anexar_admissao', { p_entidade: ent, p_id: idItem, p_desc: desc });
  $$('[data-verif]', tela).forEach(b => (b.onclick = () => navegar()));
  $$('[data-anx]', tela).forEach(b => (b.onclick = async () => { const e = ets.find(x => x.id === b.dataset.anx); const r = await pedirArquivos('Anexar · ' + e.etapa, true); if (!r) return;
    try { await anexar('admissao_etapa', e.id, r.arquivos, e.etapa); aviso('Anexado (também na ficha do colaborador).'); navegar(); } catch (err) { falha(err); } }));
  $$('[data-concl]', tela).forEach(b => (b.onclick = async () => { const e = ets.find(x => x.id === b.dataset.concl);
    const r = await pedirArquivos('Concluir · ' + e.etapa, e.exige_anexo && !e.anexos.length); if (!r) return;
    try { if (r.arquivos.length) await anexar('admissao_etapa', e.id, r.arquivos, e.etapa); await api.rpc('concluir_etapa_admissao', { p_etapa: e.id, p_status: 'feito', p_obs: r.obs || null }); aviso('Etapa concluída.'); navegar(); } catch (err) { falha(err); } }));
  $$('[data-na]', tela).forEach(b => (b.onclick = async () => { const m = await confirmar('Por que esta etapa não se aplica?', { comMotivo: true, botao: 'Confirmar' }); if (!m) return;
    try { await api.rpc('concluir_etapa_admissao', { p_etapa: b.dataset.na, p_status: 'nao_se_aplica', p_obs: m }); navegar(); } catch (err) { falha(err); } }));
  $$('[data-reabrir]', tela).forEach(b => (b.onclick = async () => { if (!await confirmar('Reabrir esta etapa?', { botao: 'Reabrir' })) return;
    try { await api.rpc('concluir_etapa_admissao', { p_etapa: b.dataset.reabrir, p_status: 'pendente' }); navegar(); } catch (err) { falha(err); } }));
  // liberação no cliente
  const preCliente = (data, g, cliente) => { const h1 = (g?.hora_inicio || '08:00').slice(0, 5), h2 = (g?.hora_fim || '12:00').slice(0, 5);
    return { titulo: `Integração no cliente ${cliente || ''}`.trim(), setor: 'Cliente', cliente, confirma_setor: 'SSMA', local: g?.local || '',
      inicio: new Date(`${data}T${h1}`).toISOString(), fim: new Date(`${data}T${h2 > h1 ? h2 : h1}`).toISOString() }; };
  $$('[data-cli]', tela).forEach(b => (b.onclick = async () => {
    const acao = b.dataset.cli, ec = est('cliente');
    try {
      if (acao === 'definir') { const r = await modal(`<form><h2>Cliente desta admissão</h2><div class="form"><label class="campo largo">Cliente *<input name="cliente" required value="${esc(a.cliente || vg?.cliente || '')}"></label></div>
          <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`); if (!r) return;
        await api.rpc('cliente_admissao', { p_adm: a.id, p_acao: 'definir', p_cliente: r.cliente }); aviso('Cliente informado.'); return navegar(); }
      if (acao === 'enviar') { const r = await modal(`<form><h2>Documentação enviada ao cliente ${esc(a.cliente)}</h2><div class="form">
          <label class="campo">Enviada em *<input type="date" name="data" required value="${hojeISO()}"></label>
          <label class="campo largo">E-mail ou pacote enviado${ec.anexos.length ? '' : ' *'}<input type="file" name="arquivos" multiple accept="image/*,application/pdf"></label>
          <label class="campo largo">Observação<input name="obs" placeholder="Para quem foi enviado, protocolo do portal do cliente…"></label>
          <p class="muted largo">Prazo de resposta do cliente: ${D.cli_regra?.prazo_aprovacao_dias ?? 3} dia(s) útil(eis). Depois disso a etapa volta para a fila do SSMA como atrasada, para cobrar o cliente.</p></div>
          <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Registrar envio</button></div></form>`,
          { validar: d => !ec.anexos.length && !d.arquivos.length ? 'Anexe o e-mail ou a documentação enviada.' : null }); if (!r) return;
        if (r.arquivos.length) await anexar('admissao_etapa', ec.id, r.arquivos, 'Documentação enviada ao cliente ' + a.cliente);
        const x = await api.rpc('cliente_admissao', { p_adm: a.id, p_acao: 'enviar', p_data: r.data, p_obs: r.obs || null }); aviso(`Envio registrado. Resposta esperada até ${dataBR(x.prazo)}.`); return navegar(); }
      if (acao === 'aprovar') { const r = await modal(`<form><h2>Cliente ${esc(a.cliente)} aprovou</h2><div class="form">
          <label class="campo">Aprovado em *<input type="date" name="data" required value="${hojeISO()}"></label>
          <label class="campo largo">Aprovação do cliente (e-mail/print)<input type="file" name="arquivos" multiple accept="image/*,application/pdf"></label>
          <label class="campo largo">Observação<input name="obs"></label></div>
          <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Registrar aprovação</button></div></form>`); if (!r) return;
        if (r.arquivos.length) await anexar('admissao_etapa', ec.id, r.arquivos, 'Aprovação do cliente ' + a.cliente);
        const x = await api.rpc('cliente_admissao', { p_adm: a.id, p_acao: 'aprovar', p_data: r.data, p_obs: r.obs || null });
        aviso(`Aprovação registrada. Próxima integração possível: ${dataBR(x.sugestao)}.`);
        if (rh && x.sugestao) return formTreino(null, false, preCliente(x.sugestao, D.cli_regra, a.cliente));
        return navegar(); }
      if (acao === 'recusar') { const m = await confirmar('O que o cliente recusou ou pediu para ajustar?', { comMotivo: true, botao: 'Registrar' }); if (!m) return;
        await api.rpc('cliente_admissao', { p_adm: a.id, p_acao: 'recusar', p_obs: m }); aviso('Registrado. Ajuste e reenvie a documentação.'); return navegar(); }
      if (acao === 'agendar') return formTreino(null, false, preCliente(D.cli_sugestao, D.cli_regra, a.cliente));
    } catch (err) { falha(err); } }));
  // treinamentos
  const formTreino = async (t = null, reag = false, pre = null) => {
    const [cat, us, tc] = await Promise.all([api.listar('treinamentos', 'ativo=eq.true&order=nome').catch(() => []), usuarios(), api.listar('treinamento_cargos', `cargo_id=eq.${a.cargo_id}&ativo=eq.true&select=treinamento_id`).catch(() => [])]);
    const doCargo = new Set(tc.map(x => x.treinamento_id));
    if (pre) t = { ...pre, _novo: true };
    const ini = t?.inicio ? new Date(t.inicio) : null, fim = t?.fim ? new Date(t.fim) : null;
    const dLoc = d => d ? diaLocal(d.toISOString()) : '', hLoc = d => d ? d.toTimeString().slice(0, 5) : '';
    const r = await modal(`<form><h2>${t ? (reag ? 'Reagendar' : 'Editar') + ' treinamento' : 'Agendar treinamento de integração'}</h2><div class="form">
      <label class="campo largo">Treinamento<select name="treinamento_id"><option value="">Outro (descrever abaixo)</option>
        ${doCargo.size ? `<optgroup label="Exigidos para o cargo">${cat.filter(x => doCargo.has(x.id)).map(x => `<option value="${x.id}" ${x.id === t?.treinamento_id ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}</optgroup>` : ''}
        <optgroup label="Catálogo">${cat.filter(x => !doCargo.has(x.id)).map(x => `<option value="${x.id}" ${x.id === t?.treinamento_id ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}</optgroup></select></label>
      <label class="campo largo">Título na agenda *<input name="titulo" required value="${esc(t?.titulo || '')}" placeholder="Ex.: Integração no cliente — regras de segurança da fazenda"></label>
      <label class="campo">Data *<input type="date" name="data" required value="${reag ? '' : dLoc(ini)}"></label>
      <label class="campo">Início *<input type="time" name="h1" required value="${reag ? '' : hLoc(ini)}"></label><label class="campo">Fim *<input type="time" name="h2" required value="${reag ? '' : hLoc(fim)}"></label>
      <label class="campo largo">Local<input name="local" value="${esc(t?.local || '')}" placeholder="Sala de treinamento, base, fazenda do cliente…"></label>
      <label class="campo">Setor responsável<select name="setor">${AD_SETORES.map(s => `<option ${s === (t?.setor || 'RH') ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
      <label class="campo" id="c-cli">Cliente<input name="cliente" value="${esc(t?.cliente || '')}"></label>
      <label class="campo">Responsável (usuário)<select name="responsavel_id"><option value="">—</option>${us.filter(u => u.ativo).map(u => `<option value="${u.id}" ${u.id === t?.responsavel_id ? 'selected' : ''}>${esc(u.nome)}</option>`).join('')}</select></label>
      <label class="campo">ou nome do instrutor<input name="responsavel_nome" value="${esc(t?.responsavel_nome || '')}" placeholder="Instrutor externo / do cliente"></label>
      <label class="campo">Quem confirma a conclusão<select name="confirma_setor">${AD_SETORES.filter(s => s !== 'Cliente').map(s => `<option ${s === (t?.confirma_setor || 'RH') ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
      <p class="muted largo">Treinamento no cliente é confirmado pelo SSMA. Agende só a partir do 1º dia de registro do colaborador.</p></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`,
      { aoAbrir: f => { const fm = $('form', f); const sinc = () => { $('#c-cli', f).hidden = fm.setor.value !== 'Cliente'; if (fm.setor.value === 'Cliente') fm.confirma_setor.value = 'SSMA'; else if (!t || t._novo) fm.confirma_setor.value = fm.setor.value; };
          fm.setor.onchange = sinc; sinc(); fm.treinamento_id.onchange = () => { const x = cat.find(y => y.id === fm.treinamento_id.value); if (x && !fm.titulo.dataset.mexeu) fm.titulo.value = x.nome; };
          fm.titulo.oninput = () => (fm.titulo.dataset.mexeu = 1); },
        validar: d => d.h2 <= d.h1 ? 'O fim deve ser depois do início.' : null });
    if (!r) return;
    const dados = { admissao_id: a.id, treinamento_id: r.treinamento_id || null, titulo: r.titulo, inicio: new Date(`${r.data}T${r.h1}`).toISOString(), fim: new Date(`${r.data}T${r.h2}`).toISOString(),
      local: r.local || null, setor: r.setor, cliente: r.setor === 'Cliente' ? r.cliente || null : null, responsavel_id: r.responsavel_id || null, responsavel_nome: r.responsavel_nome || null,
      confirma_setor: r.setor === 'Cliente' ? 'SSMA' : r.confirma_setor, ...(reag ? { status: 'agendado', concluido_por: null, concluido_em: null } : {}) };
    try { if (t && !t._novo) await api.alterar('admissao_treinamentos', `id=eq.${t.id}`, dados); else await api.inserir('admissao_treinamentos', dados); aviso('Agenda atualizada.'); navegar(); } catch (err) { falha(err); }
  };
  $('#tr-novo')?.addEventListener('click', () => formTreino());
  $('#tr-cargo')?.addEventListener('click', async () => {
    const tc = await api.listar('treinamento_cargos', `cargo_id=eq.${a.cargo_id}&ativo=eq.true&select=treinamento:treinamentos(id,nome,carga_horaria)`).catch(() => []);
    const novos = tc.map(x => x.treinamento).filter(x => x && !trs.some(t => t.treinamento_id === x.id && t.status !== 'cancelado'));
    if (!novos.length) return aviso('Nenhum treinamento exigido para o cargo que ainda não esteja na agenda.', true);
    const r = await modal(`<form><h2>Treinamentos exigidos para o cargo</h2><div class="form"><div class="largo">${novos.map(x => `<label class="check"><input type="checkbox" name="t_${x.id}" checked> ${esc(x.nome)}${x.carga_horaria ? ` <span class="muted">${x.carga_horaria} h</span>` : ''}</label>`).join('')}</div>
      <label class="campo">A partir de *<input type="date" name="data" required></label><label class="campo">Início do dia *<input type="time" name="h" value="08:00" required></label>
      <p class="muted largo">O sistema coloca um após o outro (carga horária do catálogo, mínimo 1 h, até 8 h por dia). Ajuste depois o local, o responsável e quem confirma.</p></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Agendar</button></div></form>`);
    if (!r) return;
    let cur = new Date(`${r.data}T${r.h}`), usadoDia = 0; const ls = [];
    for (const x of novos.filter(x => r['t_' + x.id])) { let h = Math.min(8, Math.max(1, Number(x.carga_horaria) || 1)); if (usadoDia + h > 8) { cur = new Date(cur); cur.setDate(cur.getDate() + 1); const [hh, mm] = r.h.split(':'); cur.setHours(+hh, +mm, 0, 0); usadoDia = 0; }
      const fim = new Date(cur.getTime() + h * 3600e3); ls.push({ admissao_id: a.id, treinamento_id: x.id, titulo: x.nome, inicio: cur.toISOString(), fim: fim.toISOString(), setor: 'RH', confirma_setor: 'RH' }); cur = fim; usadoDia += h; }
    try { if (ls.length) await api.inserir('admissao_treinamentos', ls); aviso(`${ls.length} treinamento(s) na agenda.`); navegar(); } catch (err) { falha(err); }
  });
  $$('[data-ted]', tela).forEach(b => (b.onclick = () => formTreino(trs.find(t => t.id === b.dataset.ted), !!b.dataset.reag)));
  $$('[data-tcanc]', tela).forEach(b => (b.onclick = async () => { const m = await confirmar('Cancelar este treinamento da agenda?', { comMotivo: true, botao: 'Cancelar treinamento' }); if (!m) return;
    try { await api.alterar('admissao_treinamentos', `id=eq.${b.dataset.tcanc}`, { status: 'cancelado', observacao: 'Cancelado: ' + m }); navegar(); } catch (err) { falha(err); } }));
  $$('[data-tanx]', tela).forEach(b => (b.onclick = async () => { const t = trs.find(x => x.id === b.dataset.tanx); const r = await pedirArquivos('Lista de presença / certificado · ' + t.titulo, true); if (!r) return;
    try { await anexar('admissao_treinamento', t.id, r.arquivos, 'Treinamento: ' + t.titulo); aviso('Anexado.'); navegar(); } catch (err) { falha(err); } }));
  $$('[data-tconcl]', tela).forEach(b => (b.onclick = async () => { const t = trs.find(x => x.id === b.dataset.tconcl);
    const r = await pedirArquivos('Confirmar conclusão · ' + t.titulo, !t.anexos.length); if (!r) return;
    try { if (r.arquivos.length) await anexar('admissao_treinamento', t.id, r.arquivos, 'Treinamento: ' + t.titulo);
      await api.rpc('concluir_treinamento_admissao', { p_id: t.id, p_status: 'concluido', p_obs: r.obs || null }); aviso('Treinamento confirmado e registrado em Treinamentos.'); navegar(); } catch (err) { falha(err); } }));
  $$('[data-tfalta]', tela).forEach(b => (b.onclick = async () => { const m = await confirmar('Registrar que o colaborador não compareceu?', { comMotivo: true, botao: 'Registrar' }); if (!m) return;
    try { await api.rpc('concluir_treinamento_admissao', { p_id: b.dataset.tfalta, p_status: 'nao_compareceu', p_obs: m }); navegar(); } catch (err) { falha(err); } }));
  // conclusão / cancelamento
  $('#ad-concluir')?.addEventListener('click', async e => { if (!await confirmar(`Concluir a admissão de ${c.nome}? O colaborador passa a "Ativo".${a.motorista ? ' Como é motorista, entra na Liberação de motoristas do SSMA.' : ''}`, { botao: 'Concluir admissão' })) return;
    await ocupado(e.currentTarget, async () => { try { await api.rpc('concluir_admissao', { p_admissao: a.id }); aviso('Admissão concluída. Bem-vindo(a)!'); navegar(); } catch (err) { falha(err); } }); });
  $('#ad-cancelar')?.addEventListener('click', async () => { const m = await confirmar('Cancelar esta admissão?', { comMotivo: true, botao: 'Cancelar admissão' }); if (!m) return;
    try { await api.alterar('admissoes', `id=eq.${a.id}`, { status: 'cancelada', motivo_cancelamento: m }); await api.alterar('colaboradores', `id=eq.${c.id}`, { status: 'candidato' }); aviso('Admissão cancelada.'); navegar(); } catch (err) { falha(err); } });
});

// ficha do colaborador › aba Admissão: resumo + atalho para o processo
async function painelAdmissaoNovo(box, c, adm, adms) {
  if (adm) {
    const ets = await api.listar('admissao_etapas', `admissao_id=eq.${adm.id}&select=status,setor,etapa,prazo&order=ordem`).catch(() => []);
    const p = adProgresso(ets), pend = ets.filter(e => e.status === 'pendente');
    box.innerHTML = `<div class="topo" style="margin:0 0 8px"><div><h2 style="margin:0">Admissão ${esc(adm.numero || '')}</h2><div class="muted">Início previsto ${dataBR(adm.data_prevista)} · ${p.f}/${p.t} etapas</div></div>
      <a class="btn prim" href="#/rh/admissoes/ver/${adm.id}">Abrir o processo de admissão</a></div><div class="ad-barra"><i style="width:${p.pct}%"></i></div>
      ${pend.length ? `<p class="muted" style="margin-top:8px">Pendente com: ${[...new Set(pend.map(e => e.setor))].map(esc).join(', ')}</p>` : '<p class="muted">Todas as etapas concluídas: o RH pode concluir a admissão.</p>'}`;
    return;
  }
  const cgs = await cargosL();
  box.innerHTML = `<h2>Admissão</h2>${adms.length ? `<ul class="lista-simples">${adms.map(x => `<li><span>${esc(x.numero || '')} <span class="tag ${x.status === 'concluida' ? 'verde' : ''}">${x.status === 'concluida' ? 'Concluída' : 'Cancelada'}</span></span><a class="btn peq" href="#/rh/admissoes/ver/${x.id}">Abrir</a></li>`).join('')}</ul>` : ''}
    ${editaRH() && ['candidato', 'desligado', 'em_admissao'].includes(c.status) ? `<p class="muted">O caminho recomendado é pela <a href="#/rh/vagas">vaga aprovada</a> (contratar o candidato já inicia a admissão). Para casos fora do fluxo, inicie aqui:</p>
      <form class="form" id="f-adm"><label class="campo">Cargo *<select name="cargo" required><option value="">Selecione…</option>${cgs.filter(x => x.ativo).map(x => `<option value="${x.id}" ${x.id === c.cargo_id ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}</select></label>
      <label class="campo">Início previsto *<input type="date" name="data" required value="${c.data_admissao || ''}"></label><div class="largo"><button class="btn prim">Iniciar admissão</button></div></form>` : `<p class="muted">${c.status === 'ativo' ? 'Colaborador já admitido.' : ''}</p>`}`;
  $('#f-adm')?.addEventListener('submit', async e => { e.preventDefault(); const d = formDados(e.target);
    try { const id = await api.rpc('iniciar_admissao', { p_colaborador: c.id, p_cargo: d.cargo, p_data: d.data }); aviso('Admissão iniciada.'); location.hash = '#/rh/admissoes/ver/' + id; } catch (err) { falha(err); } });
}
