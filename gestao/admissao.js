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
  reprovada: 'Reprovada', validacao_desfeita: 'Validação do RH desfeita (voltou ao RH)', beneficios_ajustados: 'Benefícios e custo ajustados pelo RH', aberta_selecao: 'Vaga aberta', em_selecao: 'Seleção em andamento', preenchida: 'Vaga preenchida', cancelada: 'Vaga cancelada', suspensa: 'Vaga suspensa' };
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
  const minhaVez = v => (v.status === 'aguardando_rh' && tem('administrador', 'rh')) || (v.status === 'aguardando_diretoria' && estado._dirVagas) || (v.status === 'devolvida' && v.solicitante_id === estado.usuario.id);
  estado._dirVagas = await api.rpc('eh_diretoria_vagas').catch(() => false);
  const cont = k => vs.filter(v => v.status === k).length;
  tela.innerHTML = `<div class="topo"><div><h1>Vagas e seleção</h1><p class="sub">Requisição do gestor → validação do RH → aprovação da diretoria → seleção → admissão</p></div>
      <div class="acoes"><a class="btn" href="#/rh/talentos">Banco de talentos</a>${podeRequisitar() ? '<a class="btn prim" href="#/rh/vagas/nova">+ Requisitar vaga</a>' : ''}</div></div>
    <div class="grade" style="margin-bottom:14px">
      <div class="cartao kpi ${cont('aguardando_rh') ? 'alerta' : ''}"><div class="n">${cont('aguardando_rh')}</div><div class="r">aguardando o RH</div></div>
      <div class="cartao kpi ${cont('aguardando_diretoria') ? 'alerta' : ''}"><div class="n">${cont('aguardando_diretoria')}</div><div class="r">aguardando a diretoria</div></div>
      <div class="cartao kpi"><div class="n">${cont('devolvida')}</div><div class="r">devolvidas ao gestor</div></div>
      <div class="cartao kpi"><div class="n">${cont('aberta') + cont('em_selecao')}</div><div class="r">em seleção</div></div></div>
    <div class="cartao" id="vg-lista">${vs.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nº</th><th>Cargo</th><th>Setor</th><th>Vagas</th><th>Requisitante</th><th>Aberta em</th><th>Candidatos</th><th>Situação</th></tr></thead><tbody>
      ${vs.map(v => `<tr class="clicavel" onclick="location.hash='#/rh/vagas/ver/${v.id}'" data-v${fAttr('sit', ST_VAGA[v.status]?.[0])}${fAttr('setor', SS[v.setor_id]?.nome || '—')}${fAttr('data', (v.criado_em || '').slice(0, 10))}${fAttr('busca', [v.numero, CG[v.cargo_id]?.nome, v.cliente].join(' '))}>
        <td data-r="Nº" class="nowrap"><b>${esc(v.numero || '')}</b></td><td data-r="Cargo">${esc(CG[v.cargo_id]?.nome || '—')}${v.cliente ? `<div class="muted">${esc(v.cliente)}</div>` : ''}</td>
        <td data-r="Setor">${esc(SS[v.setor_id]?.nome || '—')}</td><td data-r="Vagas">${v.quantidade}</td><td data-r="Requisitante">${esc(v.solic?.nome || '—')}</td>
        <td data-r="Aberta em" class="nowrap">${dataBR((v.criado_em || '').slice(0, 10))}</td><td data-r="Candidatos">${(v.cands || []).length}</td>
        <td data-r="Situação"><span class="tag ${ST_VAGA[v.status]?.[1] || ''}">${esc(ST_VAGA[v.status]?.[0] || v.status)}</span>${minhaVez(v) ? ' <span class="tag vermelho">sua vez</span>' : ''}</td></tr>`).join('')}
      </tbody></table></div>` : `<div class="vazio">Nenhuma vaga ainda.${podeRequisitar() ? ' Clique em “+ Requisitar vaga”.' : ''}</div>`}</div>
    ${avisoLei('recrutamento')}`;
  filtroLocal(tela, { itens: 'tbody tr[data-v]', antes: '#vg-lista', campos: [{ k: 'sit', rotulo: 'Situação' }, { k: 'setor', rotulo: 'Setor' }], periodo: true, rotuloPeriodo: 'Aberta em' });
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
      <div class="largo"><b>Cursos especializados da CNH exigidos</b>
        <label class="check"><input type="checkbox" name="_ind" ${v?.exige_indivisiveis ? 'checked' : ''}> Transporte de cargas indivisíveis (AET — ex.: tritrem / madeira)</label>
        <label class="check"><input type="checkbox" name="_mopp" ${v?.exige_mopp ? 'checked' : ''}> MOPP (produtos perigosos)</label></div>
      <label class="campo largo">Requisitos da função<textarea name="requisitos" rows="3" placeholder="CNH, cursos, experiência, conhecimentos…">${esc(v?.requisitos || '')}</textarea></label>
      <label class="campo largo">Benefícios<textarea name="beneficios" rows="2">${esc(v?.beneficios || '')}</textarea></label>
      ${v ? '<label class="campo largo">Comentário para o RH<input name="comentario" placeholder="O que foi ajustado"></label>' : ''}
      <p class="muted largo">Não inclua requisitos discriminatórios (sexo, idade, estado civil, aparência, gravidez etc. — Lei 9.029/1995).</p>
      <div class="largo acoes"><button class="btn prim">${v ? 'Reenviar ao RH' : 'Enviar requisição'}</button><a class="btn" href="javascript:history.back()">Cancelar</a></div></form>`;
  const f = $('#f-req');
  const sinc = () => ($('#c-subst').hidden = f.motivo.value !== 'Substituição');
  f.motivo.addEventListener('change', sinc); sinc();
  f.cargo_id.addEventListener('change', () => { const c = cgs.find(x => x.id === f.cargo_id.value); if (c?.setor_id && !f.setor_id.value) { f.setor_id.value = c.setor_id; f.setor_id.dispatchEvent(new Event('change')); }
    if (c?.exige_indivisiveis) f._ind.checked = true; if (c?.exige_mopp) f._mopp.checked = true;
    if (c?.requisitos && !f.requisitos.value) f.requisitos.value = c.requisitos; if (c?.salario_base && !f.salario_ofertado.value) f.salario_ofertado.value = Number(c.salario_base).toFixed(2).replace('.', ','); });
  f.onsubmit = async e => { e.preventDefault(); const d = formDados(f);
    if (!d.cargo_id) return aviso('Escolha o cargo.', true);
    if (!await vgConferirSalario(num(d.salario_ofertado), cgs.find(x => x.id === d.cargo_id))) return;
    const cursos = { p_indivisiveis: !!d._ind, p_mopp: !!d._mopp }; delete d._ind; delete d._mopp;
    const p = { ...d, salario_ofertado: num(d.salario_ofertado), substitui_colaborador_id: d.motivo === 'Substituição' ? d.substitui_colaborador_id : '' };
    await ocupado(e.submitter, async () => { try {
      if (v) { await api.rpc('reenviar_vaga', { p_vaga: v.id, p }); await api.rpc('vaga_cursos_cnh', { p_vaga: v.id, ...cursos }); aviso('Requisição reenviada ao RH.'); location.hash = '#/rh/vagas/ver/' + v.id; }
      else { const id = await api.rpc('requisitar_vaga', { p }); await api.rpc('vaga_cursos_cnh', { p_vaga: id, ...cursos }); aviso('Requisição enviada ao RH.'); location.hash = '#/rh/vagas/ver/' + id; }
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
  const [cgs, ss, ccs, us, evs, anx, dir, adms, ENC] = await Promise.all([cargosL(), setoresL(), centros(), usuarios(), api.listar('vaga_eventos', `vaga_id=eq.${id}&order=em`).catch(() => []),
    api.listar('anexos', `entidade=eq.vaga&entidade_id=eq.${id}&cancelado_em=is.null&order=enviado_em`).catch(() => []), api.rpc('eh_diretoria_vagas').catch(() => false),
    api.rpc('admissoes_painel', { p_status: 'todas' }).then(l => l.filter(a => a.vaga_id === id)).catch(() => []), api.rpc('encargos_estimativa').catch(() => null)]);
  const U = porId(us), cargo = cgs.find(c => c.id === v.cargo_id), setor = ss.find(s => s.id === v.setor_id);
  const ev = k => [...evs].reverse().find(e => e.evento === k);
  const aprov = !VG_APROV.includes(v.status) && v.status !== 'cancelada';
  const passos = [['Requisição', U[v.solicitante_id]?.nome || '', 'ok'],
    ['Validação do RH', v.rh_em ? dataBR(v.rh_em.slice(0, 10)) : v.status === 'aguardando_rh' ? 'aguardando' : v.status === 'devolvida' ? 'devolvida' : '', v.rh_em ? 'ok' : v.status === 'reprovada' && !v.rh_em ? 'x' : v.status === 'aguardando_rh' ? 'atual' : ''],
    ['Diretoria', v.dir_em ? dataBR(v.dir_em.slice(0, 10)) : v.status === 'aguardando_diretoria' ? 'aguardando' : '', v.dir_em ? 'ok' : v.status === 'reprovada' && v.rh_em ? 'x' : v.status === 'aguardando_diretoria' ? 'atual' : ''],
    ['Seleção', aprov ? (v.status === 'preenchida' ? 'preenchida' : 'em andamento') : '', v.status === 'preenchida' ? 'ok' : aprov ? 'atual' : ''],
    ['Admissão', adms.length ? `${adms.filter(a => a.status === 'concluida').length}/${v.quantidade} concluída(s)` : '', adms.length && adms.every(a => a.status === 'concluida') && adms.length >= v.quantidade ? 'ok' : adms.length ? 'atual' : '']];
  let benHtmlOut = '';
  const caixaAcao = (() => {
    if (v.status === 'aguardando_rh' && tem('administrador', 'rh')) return `<form class="cartao form" id="f-rh"><h2 class="largo" style="margin:0">Validação do RH</h2>
      <p class="muted largo" style="margin:0">Confira salário x faixa do cargo${cargo?.salario_base ? ` (base ${brl(cargo.salario_base)})` : ''}, contrato, requisitos e orçamento. Os ajustes ficam registrados.</p>
      <label class="campo">Salário (R$)<input name="salario_ofertado" inputmode="decimal" value="${v.salario_ofertado != null ? Number(v.salario_ofertado).toFixed(2).replace('.', ',') : ''}"></label>
      <label class="campo">Tipo de contrato<select name="tipo_contrato">${Object.entries(TIPOS_CONTRATO).map(([k, t]) => `<option value="${k}" ${k === v.tipo_contrato ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo">Quantidade<input type="number" min="1" name="quantidade" value="${v.quantidade}"></label><label class="campo">Prazo para preencher<input type="date" name="prazo" value="${v.prazo || ''}"></label>
      <label class="campo">Escala / horário<input name="escala" value="${esc(v.escala || '')}"></label>
      <label class="campo largo">Requisitos<textarea name="requisitos" rows="2">${esc(v.requisitos || '')}</textarea></label>
      ${vgFormBenHtml(v)}
      <label class="campo largo">Parecer do RH<textarea name="parecer" rows="2" placeholder="Obrigatório para devolver ou reprovar"></textarea></label>
      <div class="largo acoes"><button class="btn ok" value="aprovado">Validar e enviar à diretoria</button><button class="btn" value="devolvido">Devolver ao gestor</button><button class="btn perigo" value="reprovado">Reprovar</button></div></form>`;
    benHtmlOut = editaRH() && ['aguardando_diretoria', 'aberta', 'em_selecao'].includes(v.status) ? `<form class="cartao form" id="f-ben" hidden><h2 class="largo" style="margin:0">Benefícios e custo estimado (RH)</h2>
      <p class="muted largo" style="margin:0">Ajuste os benefícios, a premiação e o custo do funcionário. Fica registrado no histórico da vaga${v.status === 'aguardando_diretoria' ? ' e a diretoria vê antes de aprovar' : ''}.</p>
      <label class="campo">Salário (R$)<input name="salario_ofertado" inputmode="decimal" value="${v.salario_ofertado != null ? Number(v.salario_ofertado).toFixed(2).replace('.', ',') : ''}" readonly title="O salário muda só na validação do RH"></label>
      ${vgFormBenHtml(v)}
      <div class="largo acoes"><button class="btn prim">Salvar benefícios</button><button type="button" class="btn" id="f-ben-cancelar">Cancelar</button></div></form>` : '';
    if (v.status === 'aguardando_diretoria' && dir) return `<form class="cartao form" id="f-dir"><h2 class="largo" style="margin:0">Aprovação da diretoria</h2>
      <p class="muted largo" style="margin:0">Confira acima o resumo (custo por funcionário e total da vaga). Ao aprovar, a seleção é aberta e o PDF da requisição sai com o seu registro de aprovação e o código de verificação.</p>
      <label class="campo largo">Parecer<textarea name="parecer" rows="2" placeholder="Obrigatório para devolver ou reprovar"></textarea></label>
      <div class="largo acoes"><button class="btn ok" value="aprovado">Aprovar vaga</button><button class="btn" value="devolvido">Devolver ao RH</button><button class="btn perigo" value="reprovado">Reprovar</button></div></form>`;
    if (v.status === 'devolvida' && (v.solicitante_id === estado.usuario.id || editaRH())) return `<div class="cartao alerta-obs"><b>Devolvida para ajuste:</b> ${esc(ev('devolvida')?.parecer || '')}
      <div style="margin-top:8px"><a class="btn prim" href="#/rh/vagas/corrigir/${v.id}">Corrigir e reenviar</a></div></div>`;
    return '';
  })();
  // resumo para decisão: o que a vaga custa (por funcionário e no total) e o que ela oferece
  const veSal = editaRH() || dir || v.solicitante_id === estado.usuario.id;
  const editandoNaValidacao = v.status === 'aguardando_rh' && tem('administrador', 'rh');
  const resumoHtml = veSal && !editandoNaValidacao ? vgHtmlResumo(v, ENC, !!benHtmlOut) : '';
  const L = (k, t) => t ? `<div><div class="muted">${k}</div><b>${esc(t)}</b></div>` : '';
  tela.innerHTML = `<div class="topo"><div><h1>${esc(v.numero || 'Vaga')} · ${esc(cargo?.nome || 'Cargo')}</h1>
      <p class="sub"><span class="tag ${ST_VAGA[v.status]?.[1] || ''}">${esc(ST_VAGA[v.status]?.[0] || v.status)}</span> · ${v.quantidade} vaga(s)${setor ? ' · ' + esc(setor.nome) : ''} · requisitada por ${esc(U[v.solicitante_id]?.nome || '—')}</p></div>
      <div class="acoes"><button class="btn" id="pdf-req">⬇ Requisição (PDF)</button>${aprov && editaRH() ? `<a class="btn prim" href="#/rh/recrutamento/vaga/${v.id}">Seleção de candidatos</a>` : ''}<a class="btn" href="#/rh/vagas">Voltar</a></div></div>
    ${adStepper(passos)}
    ${v.status === 'reprovada' ? `<div class="cartao alerta-obs"><b>Reprovada</b> por ${esc(U[v.reprovada_por]?.nome || '—')} em ${dataBR((v.reprovada_em || '').slice(0, 10))}: ${esc(v.motivo_reprovacao || '')}</div>` : ''}
    ${resumoHtml}${benHtmlOut}
    ${caixaAcao}
    <div class="cartao"><h2>Dados da vaga</h2><div class="form">
      ${L('Motivo', v.motivo)}${L('Contrato', TIPOS_CONTRATO[v.tipo_contrato])}${v.salario_ofertado != null && (editaRH() || dir || v.solicitante_id === estado.usuario.id) ? L('Salário', brl(v.salario_ofertado)) : ''}
      ${L('Centro de custo', ccs.find(c => c.id === v.centro_custo_id)?.nome)}${L('Local de trabalho', v.local_trabalho)}${L('Cliente / contrato', v.cliente)}${L('Escala / horário', v.escala)}
      ${L('Início desejado', dataBR(v.data_inicio_desejada))}${L('Prazo para preencher', dataBR(v.prazo))}
      <div class="largo"><b>Cursos especializados da CNH exigidos:</b> ${[v.exige_indivisiveis && 'Transporte de cargas indivisíveis', v.exige_mopp && 'MOPP (produtos perigosos)'].filter(Boolean).join(' · ') || '<span class="muted">nenhum</span>'}
        ${editaRH() || (v.solicitante_id === estado.usuario.id && ['aguardando_rh', 'devolvida'].includes(v.status)) ? ' <button type="button" class="btn peq" id="vg-cursos">Alterar</button>' : ''}</div>
      <div class="largo">${L('Justificativa', v.justificativa)}</div>${v.requisitos ? `<div class="largo">${L('Requisitos', v.requisitos)}</div>` : ''}${v.beneficios ? `<div class="largo">${L('Observações dos benefícios', v.beneficios)}</div>` : ''}
      ${v.codigo_verificacao ? `<div class="largo muted">Código de verificação da aprovação: <b class="mono">${esc(v.codigo_verificacao)}</b></div>` : ''}</div></div>
    ${adms.length ? `<div class="cartao"><h2>Admissões desta vaga</h2><ul class="lista-simples">${adms.map(a => `<li><span><b>${esc(a.colaborador)}</b> <span class="muted">${esc(a.numero || '')}</span> <span class="tag ${a.status === 'concluida' ? 'verde' : a.status === 'cancelada' ? '' : 'amarelo'}">${a.status === 'concluida' ? 'Admitido' : a.status === 'cancelada' ? 'Cancelada' : 'Em admissão'}</span></span><a class="btn peq" href="#/rh/admissoes/ver/${a.id}">Abrir</a></li>`).join('')}</ul></div>` : ''}
    <div class="cartao"><h2>Histórico</h2><ol class="ad-hist">${evs.map(e => `<li><b>${esc(VG_EVENTO[e.evento] || e.evento)}</b> <span class="muted">${dtHora(e.em)} · ${esc(U[e.por]?.nome || '')}</span>${e.parecer ? `<div>${esc(e.parecer)}</div>` : ''}</li>`).join('')}</ol></div>
    ${anx.length ? `<div class="cartao"><h2>Documentos anexados</h2><div class="anexos">${anx.map(a => `<span class="anexo" data-arquivo="${esc(a.caminho_arquivo)}">📄 ${esc(a.nome_original || 'arquivo')} <small class="muted">${esc(a.descricao || '')} · ${esc(U[a.enviado_por]?.nome || '')}</small></span>`).join('')}</div></div>` : ''}
    <p class="muted">A aprovação no sistema vale como assinatura eletrônica (Lei 14.063/2020): registra usuário, data, hora e código de verificação. Assinatura gov.br fica só para o contrato de trabalho.</p>`;
  $('#vg-cursos', tela)?.addEventListener('click', async () => { const r = await modal(`<form><h2>Cursos especializados da CNH exigidos</h2><div class="form">
      <label class="check largo"><input type="checkbox" name="ind" ${v.exige_indivisiveis ? 'checked' : ''}> Transporte de cargas indivisíveis e outras objeto de AET (ex.: tritrem / madeira)</label>
      <label class="check largo"><input type="checkbox" name="mopp" ${v.exige_mopp ? 'checked' : ''}> MOPP — transporte de produtos perigosos</label>
      <p class="muted largo">Cursos especializados da Res. CONTRAN 789/2020: constam como observação na CNH e exigem atualização periódica. A etapa "CNH conferida" da admissão não conclui sem eles.</p></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`); if (!r) return;
    try { await api.rpc('vaga_cursos_cnh', { p_vaga: v.id, p_indivisiveis: r.ind, p_mopp: r.mopp }); aviso('Exigências atualizadas.'); navegar(); } catch (err) { falha(err); } });
  const decidir = (form, rpc, extra) => form?.addEventListener('submit', async e => { e.preventDefault(); const d = formDados(form), dec = e.submitter.value;
    if (dec !== 'aprovado' && !d.parecer) return aviso('Escreva o motivo no parecer.', true);
    if (dec === 'aprovado' && !await vgConferirSalario(num(d.salario_ofertado), cargo)) return;
    if (dec === 'aprovado' && form.id === 'f-rh' && vgCalc?.itens().some(b => b.tipo === 'Outro' && !b.obs)) return aviso('Escreva o nome do benefício "Outro".', true);
    if (dec === 'reprovado' && !await confirmar('Reprovar esta requisição de vaga?', { botao: 'Reprovar' })) return;
    await ocupado(e.submitter, async () => { try { await api.rpc(rpc, { p_vaga: v.id, p_decisao: dec, p_parecer: d.parecer || null, ...(extra ? extra(d) : {}) });
      aviso(dec === 'aprovado' ? (rpc === 'rh_decidir_vaga' ? 'Validada e enviada à diretoria.' : 'Vaga aprovada: a seleção está aberta.') : 'Decisão registrada.'); navegar(); } catch (err) { falha(err); } }); });
  $('#ver-editar-ben')?.addEventListener('click', () => { const f = $('#f-ben'); f.hidden = !f.hidden; if (!f.hidden) f.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  $('#f-ben-cancelar')?.addEventListener('click', () => navegar());
  const fBen = $('#f-ben');
  if (fBen) { const calc = await vgEditorBeneficios(fBen, v, cargo);
    fBen.onsubmit = async e => { e.preventDefault(); const d = formDados(fBen);
      if (calc.itens().some(b => b.tipo === 'Outro' && !b.obs)) return aviso('Escreva o nome do benefício "Outro".', true);
      await ocupado(e.submitter, async () => { try { await api.rpc('rh_beneficios_vaga', { p_vaga: v.id, p: { beneficios: d.beneficios, beneficios_itens: calc.itens(),
          premiacao: d.prem_tem ? { tem: true, criterio: d.prem_criterio, valor_ref: num(d.prem_valor), periodicidade: d.prem_per } : { tem: false }, custo_estimado: calc.custo(), juridico_descontos: !!d.juridico_descontos } });
        aviso('Benefícios salvos.'); navegar(); } catch (err) { falha(err); } }); }; }
  const fRh = $('#f-rh'); let vgCalc = null;
  if (fRh) vgCalc = await vgEditorBeneficios(fRh, v, cargo);
  decidir(fRh, 'rh_decidir_vaga', d => ({ p: { salario_ofertado: num(d.salario_ofertado), tipo_contrato: d.tipo_contrato, quantidade: d.quantidade, prazo: d.prazo, escala: d.escala, requisitos: d.requisitos, beneficios: d.beneficios,
    beneficios_itens: vgCalc.itens(), premiacao: d.prem_tem ? { tem: true, criterio: d.prem_criterio, valor_ref: num(d.prem_valor), periodicidade: d.prem_per } : { tem: false },
    custo_estimado: vgCalc.custo(), juridico_descontos: !!d.juridico_descontos } }));
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
      ...((v.beneficios_itens || []).length ? [{ negrito: 'Benefícios' }, { tabela: { cab: ['Benefício', 'Empresa (R$/mês)', 'Desconto do colaborador (R$/mês)', 'Obs.'], linhas: v.beneficios_itens.map(b => [b.tipo, brl(vgBenMensal(b)), b.colaborador ? brl(b.colaborador) : '—', [b.base === 'dia' ? `${brl(b.empresa)}/dia × ${b.dias || 22}` : '', b.obs || ''].filter(Boolean).join(' · ')]) } }] : []),
      ...(v.premiacao?.tem ? [{ negrito: 'Premiação por metas (variável)' }, `${v.premiacao.criterio}${v.premiacao.valor_ref ? ` · referência ${brl(v.premiacao.valor_ref)}` : ''} · ${v.premiacao.periodicidade || ''}`] : []),
      ...(v.custo_estimado ? [{ negrito: 'Custo mensal estimado do funcionário' }, { tabela: { cab: ['Item', 'R$/mês'], linhas: v.custo_estimado.linhas.map(l => [l[0], brl(l[1])]).concat([['Total estimado', brl(v.custo_estimado.total)], ['Total anual estimado (×12)', brl(v.custo_estimado.total * 12)]]), colunas: { 1: { cellWidth: 40 } } } }, 'Estimativa sobre o salário bruto com os parâmetros de encargos do sistema (' + (v.custo_estimado.regime || '') + '). Não substitui o cálculo da folha.'] : []),
      ...(v.beneficios ? [{ negrito: 'Observações dos benefícios' }, v.beneficios] : []),
      { negrito: 'Registro de aprovações (assinatura eletrônica no sistema)' },
      { tabela: { cab: ['Etapa', 'Responsável', 'Data e hora', 'Situação'], linhas: reg, colunas: { 2: { cellWidth: 34 }, 3: { cellWidth: 24 } } } },
      ...(pareceres.length ? [{ lista: pareceres }] : []),
      v.codigo_verificacao ? `Código de verificação: ${v.codigo_verificacao}. As aprovações acima foram registradas no Verbo Gestão com usuário, data e hora (assinatura eletrônica — Lei 14.063/2020).`
        : 'Documento emitido antes da aprovação final da diretoria.',
    ],
    assinatura: [['Recursos Humanos', 'b'], ['Verbo Logística']] });
}

// ===================== Seleção de candidatos (entrevistas e avaliações com histórico) =====================
const AV_TIPO = { entrevista_rh: 'Entrevista com o RH', entrevista_gestor: 'Entrevista com o gestor', teste_pratico: 'Teste prático' };
const AV_REC = { aprovar: ['Aprovar', 'verde'], reprovar: ['Reprovar', 'vermelho'], banco_talentos: ['Banco de talentos', 'azul'] };
const AV_CRIT = ['Experiência e conhecimento técnico', 'Comunicação', 'Postura, segurança e cumprimento de normas', 'Disponibilidade (escala, viagens, horários)', 'Alinhamento com a vaga e a empresa'];
const VC_EVENTO = { incluido: 'Incluído na seleção', etapa: 'Mudou de etapa', agendada: 'Entrevista agendada', avaliada: 'Avaliação registrada', cancelada: 'Entrevista cancelada' };

async function formAvaliar(a, nomeCand) {
  const r = await modal(`<form><h2>${esc(AV_TIPO[a.tipo] || 'Avaliação')} · ${esc(nomeCand)}</h2><div class="form">
    <label class="campo">Data e hora da entrevista<input type="datetime-local" name="data" value="${a.agendada_para ? diaLocal(a.agendada_para) + 'T' + hora(a.agendada_para) : ''}"></label>
    <div class="largo"><div class="muted" style="margin-bottom:4px">Notas: 1 = muito abaixo · 3 = atende · 5 = excepcional</div><table class="tabela-notas">${AV_CRIT.map((k, i) => `<tr><td><b>${esc(k)}</b></td>
      <td class="nowrap">${[1, 2, 3, 4, 5].map(n => `<label class="nota"><input type="radio" name="n_${i}" value="${n}" ${(a.criterios || [])[i]?.nota == n ? 'checked' : ''}><span>${n}</span></label>`).join('')}</td></tr>`).join('')}</table></div>
    <div class="largo"><b>Recomendação *</b>${Object.entries(AV_REC).map(([k, [t]]) => `<label class="check"><input type="radio" name="rec" value="${k}" ${a.recomendacao === k ? 'checked' : ''} required> ${t}</label>`).join('')}</div>
    <label class="campo largo">Parecer *<textarea name="parecer" rows="4" required placeholder="Pontos fortes, pontos de atenção e o motivo da recomendação">${esc(a.parecer || '')}</textarea></label>
    ${a.tipo === 'entrevista_gestor' ? '<p class="alerta-obs largo" style="margin:0">Entrevista com o gestor: "Aprovar" leva o candidato para <b>Aprovado</b> (o RH confere e contrata); "Reprovar" ou "Banco de talentos" encerra o candidato nesta vaga.</p>' : ''}
    <p class="muted largo">Registre motivos objetivos e ligados à função. É proibido considerar sexo, idade, estado civil, gravidez, cor, religião ou deficiência (Lei 9.029/1995).</p></div>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Registrar avaliação</button></div></form>`,
    { validar: d => !d.rec ? 'Escolha a recomendação.' : !d.parecer?.trim() ? 'Escreva o parecer.' : null });
  if (!r) return false;
  const crit = AV_CRIT.map((k, i) => ({ criterio: k, nota: r['n_' + i] ? Number(r['n_' + i]) : null })).filter(x => x.nota);
  try { await api.rpc('registrar_avaliacao', { p_id: a.id, p_criterios: crit, p_recomendacao: r.rec, p_parecer: r.parecer, p_data: r.data ? new Date(r.data).toISOString() : null }); aviso('Avaliação registrada.'); return true; }
  catch (err) { falha(err); return false; }
}
function htmlAvaliacao(a) {
  const rec = AV_REC[a.recomendacao];
  return `<div class="av-item ${a.status}"><div><b>${esc(AV_TIPO[a.tipo] || a.tipo)}</b> · ${esc(a.avaliador || '—')} ${a.status === 'agendada' ? '<span class="tag amarelo">agendada</span>' : a.status === 'cancelada' ? '<span class="tag">cancelada</span>' : ''}
      ${rec ? `<span class="tag ${rec[1]}">${rec[0]}</span>` : ''}${a.nota != null ? ` <span class="tag">nota ${String(a.nota).replace('.', ',')}</span>` : ''}</div>
    <div class="muted">${a.agendada_para ? 'Entrevista ' + dtHora(a.agendada_para) : 'Sem data'}${a.local ? ' · ' + esc(a.local) : ''}${a.concluida_em ? ' · registrada ' + dtHora(a.concluida_em) : ''}</div>
    ${(a.criterios || []).length ? `<div class="muted">${a.criterios.map(c => `${esc(c.criterio)}: <b>${c.nota}</b>`).join(' · ')}</div>` : ''}
    ${a.parecer ? `<div style="white-space:pre-line">${esc(a.parecer)}</div>` : ''}</div>`;
}

rota('/rh/recrutamento/vaga/:id', async (tela, id) => {
  const v = await api.um('vagas', `id=eq.${id}&select=*`);
  if (!v) { tela.innerHTML = '<div class="cartao vazio">Vaga não encontrada.</div>'; return; }
  if (VG_APROV.includes(v.status)) { location.hash = '#/rh/vagas/ver/' + id; return; }
  const [vcs, cgs, ss, us, H] = await Promise.all([api.listar('vaga_candidatos', `vaga_id=eq.${id}&select=*,cand:candidatos(*)&order=criado_em`), cargosL(), setoresL(), usuarios(),
    api.rpc('selecao_historico', { p_vaga: id }).catch(() => ({ avaliacoes: [], eventos: [] }))]);
  const cargo = cgs.find(c => c.id === v.cargo_id), U = porId(us), rh = editaRH();
  const avs = H?.avaliacoes || [], evs = H?.eventos || [];
  const ordem = ['triagem', 'entrevista_rh', 'entrevista_gestor', 'teste_pratico', 'aprovado', 'contratado', 'reprovado', 'desistiu'];
  const porEtapa = ordem.map(k => [k, vcs.filter(x => x.etapa === k)]).filter(x => x[1].length);
  const card = x => { const av = avs.filter(a => a.vaga_candidato_id === x.id), ev = evs.filter(e => e.vaga_candidato_id === x.id);
    const minhaAg = av.filter(a => a.status === 'agendada' && (a.avaliador_id === estado.usuario.id || rh));
    const hist = [...av.map(a => ({ t: a.concluida_em || a.agendada_para || a.criado_em, h: htmlAvaliacao(a) })),
      ...ev.filter(e => !['avaliada', 'agendada'].includes(e.evento)).map(e => ({ t: e.em, h: `<div class="av-item muted">${dtHora(e.em)} · ${esc(e.quem || '')} · ${esc(VC_EVENTO[e.evento] || e.evento)}${e.evento === 'etapa' ? ': <b>' + esc(ETAPAS_SEL[e.detalhe] || e.detalhe) + '</b>' : e.detalhe && e.evento !== 'incluido' ? ': ' + esc(e.detalhe) : ''}</div>` }))]
      .sort((p, q) => String(q.t).localeCompare(String(p.t)));
    return `<li class="sel-cand"><div class="sel-cab"><span><b>${esc(x.cand?.nome || '')}</b>
        <span class="muted">${esc([x.cand?.telefone && fmtTel(x.cand.telefone), x.cand?.cidade, x.cand?.cnh_categoria && 'CNH ' + x.cand.cnh_categoria + (x.cand.cnh_ear ? ' EAR' : ''), x.cand?.mopp && 'MOPP', x.cand?.curso_indivisiveis && 'Cargas indivisíveis'].filter(Boolean).join(' · '))}</span>
        ${x.nota != null ? ` <span class="tag">nota ${String(x.nota).replace('.', ',')}</span>` : ''}</span>
      <span class="acoes">${rh && !['contratado'].includes(x.etapa) ? `<select data-etapa="${x.id}" aria-label="Etapa">${Object.entries(ETAPAS_SEL).filter(([e]) => e !== 'contratado').map(([e, t]) => `<option value="${e}" ${e === x.etapa ? 'selected' : ''}>${t}</option>`).join('')}</select>
          <button class="btn peq" data-agendar="${x.id}">Agendar entrevista</button>` : ''}
        ${minhaAg.map(a => `<button class="btn peq prim" data-avaliar="${a.id}">Avaliar (${esc((AV_TIPO[a.tipo] || '').replace('Entrevista com o ', ''))})</button>`).join('')}
        ${rh && !minhaAg.length && !['contratado', 'desistiu'].includes(x.etapa) ? `<button class="btn peq" data-avulsa="${x.id}">Registrar avaliação</button>` : ''}
        ${rh && x.etapa === 'aprovado' ? `<button class="btn peq ok" data-contratar="${x.id}">Contratar</button>` : ''}
        ${x.colaborador_id ? `<a class="btn peq" href="#/rh/colaboradores/ver/${x.colaborador_id}?aba=admissao">Admissão</a>` : ''}</span></div>
      <div class="anx-cand" data-id="${x.candidato_id}"></div>
      ${hist.length ? `<details ${x.etapa !== 'reprovado' && x.etapa !== 'desistiu' ? 'open' : ''}><summary>Histórico (${hist.length})</summary><div class="sel-hist">${hist.map(h => h.h).join('')}</div></details>` : ''}</li>`; };
  tela.innerHTML = `
    <div class="topo"><div><h1>${esc(v.numero || '')} · ${esc(cargo?.nome || 'Vaga')}</h1><p class="sub"><span class="tag ${ST_VAGA[v.status]?.[1] || ''}">${ST_VAGA[v.status]?.[0] || v.status}</span> · ${v.quantidade} vaga(s) · ${esc(v.motivo || '')}${v.salario_ofertado ? ' · ' + brl(v.salario_ofertado) : ''} · gestor: ${esc(U[v.solicitante_id]?.nome || '—')}</p></div>
      <div class="acoes"><a class="btn" href="#/rh/vagas/ver/${v.id}">Requisição e aprovações</a>${rh ? '<button class="btn" id="ed-vaga">Editar</button><button class="btn prim" id="add-cand">+ Candidato</button>' : ''}</div></div>
    <div class="cartao alerta-obs"><b>Quem decide:</b> o RH faz a triagem e a entrevista do RH. A entrevista com o <b>gestor</b> (por padrão quem pediu a vaga, ${esc(U[v.solicitante_id]?.nome || '—')}) é registrada por ele: “Aprovar” leva o candidato a <b>Aprovado</b>. O RH confere documentos e requisitos legais e clica em <b>Contratar</b>, que já abre a admissão.</div>
    ${v.requisitos ? `<div class="cartao"><b>Requisitos:</b> <span style="white-space:pre-line">${esc(v.requisitos)}</span></div>` : ''}
    ${porEtapa.length ? porEtapa.map(([k, l]) => `<div class="cartao"><h2>${ETAPAS_SEL[k]} (${l.length})</h2><ul class="lista-simples sel-lista">${l.map(card).join('')}</ul></div>`).join('') : '<div class="cartao vazio">Nenhum candidato nesta vaga ainda.</div>'}
    ${avisoLei('recrutamento')}`;
  $$('.anx-cand', tela).forEach(async el => { el.innerHTML = await htmlAnexos('candidato', el.dataset.id).catch(() => ''); });
  $('#ed-vaga')?.addEventListener('click', () => formVaga(v, cgs, ss));
  $('#add-cand')?.addEventListener('click', async () => {
    const banco = await api.listar('candidatos', 'ativo=eq.true&situacao=in.(disponivel,em_processo)&order=nome');
    const r = await modal(`<form><h2>Incluir candidato</h2><div class="form">
      <label class="campo largo">Do banco de talentos<select name="cand"><option value="">— cadastrar novo —</option>${banco.filter(b => !vcs.some(x => x.candidato_id === b.id)).map(b => `<option value="${b.id}">${esc(b.nome)}${b.cargo_pretendido ? ' · ' + esc(b.cargo_pretendido) : ''}${b.cnh_categoria ? ' · CNH ' + esc(b.cnh_categoria) : ''}</option>`).join('')}</select></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Continuar</button></div></form>`);
    if (!r) return;
    let cid = r.cand; if (!cid) { cid = await formCandidato(null, cargo?.nome); if (!cid) return; }
    try { await api.inserir('vaga_candidatos', { vaga_id: v.id, candidato_id: cid }); await api.alterar('candidatos', `id=eq.${cid}`, { situacao: 'em_processo' });
      if (v.status === 'aberta') await api.alterar('vagas', `id=eq.${v.id}`, { status: 'em_selecao' }); navegar(); } catch (err) { falha(err); }
  });
  $$('[data-etapa]', tela).forEach(s => s.onchange = async () => {
    const x = vcs.find(y => y.id === s.dataset.etapa);
    if (s.value === 'aprovado' && !avs.some(a => a.vaga_candidato_id === x.id && a.status === 'concluida' && a.recomendacao === 'aprovar')
        && !await confirmar('Nenhuma avaliação registrada recomenda aprovar este candidato. Marcar como Aprovado mesmo assim?', { botao: 'Aprovar' })) { s.value = x.etapa; return; }
    try { await api.alterar('vaga_candidatos', `id=eq.${x.id}`, { etapa: s.value });
      if (['reprovado', 'desistiu'].includes(s.value)) await api.alterar('candidatos', `id=eq.${x.candidato_id}`, { situacao: 'disponivel' }); navegar(); } catch (err) { falha(err); } });
  const agendar = async (x, avulsa = false) => {
    const r = await modal(`<form><h2>${avulsa ? 'Registrar avaliação' : 'Agendar entrevista'} · ${esc(x.cand?.nome || '')}</h2><div class="form">
      <label class="campo">Tipo<select name="tipo">${Object.entries(AV_TIPO).map(([k, t]) => `<option value="${k}" ${k === (x.etapa === 'entrevista_rh' ? 'entrevista_gestor' : 'entrevista_rh') ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo">Quem entrevista / avalia *<select name="av" required><option value="">Selecione…</option>${us.filter(u => u.ativo).map(u => `<option value="${u.id}">${esc(u.nome)}</option>`).join('')}</select></label>
      <label class="campo">Data e hora<input type="datetime-local" name="quando"></label><label class="campo">Local<input name="local" placeholder="Sala, base, videochamada…"></label>
      <p class="muted largo">Na entrevista com o gestor, o sistema sugere quem pediu a vaga. A pessoa recebe o aviso e avalia em <b>RH › Entrevistas</b>.</p></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">${avulsa ? 'Continuar' : 'Agendar'}</button></div></form>`,
      { aoAbrir: raiz => { const f = $('form', raiz); const sug = () => { f.av.value = f.tipo.value === 'entrevista_gestor' ? v.solicitante_id : (avulsa ? estado.usuario.id : f.av.value || estado.usuario.id); f.av.dispatchEvent(new Event('change')); };
          f.tipo.addEventListener('change', sug); sug(); } });
    if (!r) return;
    try { const aid = await api.rpc('agendar_avaliacao', { p_vc: x.id, p_tipo: r.tipo, p_avaliador: r.av, p_quando: r.quando ? new Date(r.quando).toISOString() : null, p_local: r.local || null });
      if (avulsa && r.av === estado.usuario.id) await formAvaliar({ id: aid, tipo: r.tipo, agendada_para: r.quando ? new Date(r.quando).toISOString() : null }, x.cand?.nome || '');
      else aviso('Entrevista agendada. A pessoa foi avisada.');
      navegar(); } catch (err) { falha(err); } };
  $$('[data-agendar]', tela).forEach(b => (b.onclick = () => agendar(vcs.find(y => y.id === b.dataset.agendar))));
  $$('[data-avulsa]', tela).forEach(b => (b.onclick = () => agendar(vcs.find(y => y.id === b.dataset.avulsa), true)));
  $$('[data-avaliar]', tela).forEach(b => (b.onclick = async () => { const a = avs.find(y => y.id === b.dataset.avaliar), x = vcs.find(y => y.id === a.vaga_candidato_id);
    if (await formAvaliar(a, x?.cand?.nome || '')) navegar(); }));
  $$('[data-contratar]', tela).forEach(b => b.onclick = async () => {
    if (!await confirmar('Contratar este candidato? O sistema cria o cadastro do colaborador e já abre a admissão.', { botao: 'Contratar' })) return;
    try { const col = await api.rpc('contratar_candidato', { p_vc: b.dataset.contratar }); aviso('Colaborador criado e admissão iniciada.'); location.hash = `#/rh/colaboradores/ver/${col}?aba=admissao`; } catch (err) { falha(err); } });
});

// entrevistas do gestor / avaliador
rota('/rh/entrevistas', async tela => {
  const ls = await api.rpc('minhas_entrevistas').catch(err => { falha(err); return []; });
  const pend = ls.filter(a => a.status === 'agendada'), feitas = ls.filter(a => a.status === 'concluida');
  const item = a => `<li class="sel-cand"><div class="sel-cab"><span><b>${esc(a.candidato.nome)}</b> · ${esc(a.cargo || '')} <span class="muted">${esc(a.vaga || '')}</span><br>
      <span class="muted">${esc(AV_TIPO[a.tipo] || '')} · ${a.agendada_para ? dtHora(a.agendada_para) : 'data a combinar'}${a.local ? ' · ' + esc(a.local) : ''}</span><br>
      <span class="muted">${esc([a.candidato.telefone && fmtTel(a.candidato.telefone), a.candidato.cidade, a.candidato.cnh && 'CNH ' + a.candidato.cnh + (a.candidato.ear ? ' EAR' : ''), a.candidato.mopp && 'MOPP'].filter(Boolean).join(' · '))}</span></span>
      <span class="acoes">${a.status === 'agendada' ? `<button class="btn prim" data-av="${a.id}">Avaliar</button>` : `<span class="tag ${AV_REC[a.recomendacao]?.[1] || ''}">${AV_REC[a.recomendacao]?.[0] || ''}</span>${a.nota != null ? ` <span class="tag">nota ${String(a.nota).replace('.', ',')}</span>` : ''}`}</span></div>
    ${a.candidato.experiencia ? `<details><summary>Experiência informada</summary><div style="white-space:pre-line">${esc(a.candidato.experiencia)}</div></details>` : ''}
    ${a.parecer && a.status === 'concluida' ? `<div class="muted" style="white-space:pre-line">${esc(a.parecer)}</div>` : ''}</li>`;
  tela.innerHTML = `<div class="topo"><div><h1>Entrevistas</h1><p class="sub">Entrevistas e avaliações de candidatos que o RH agendou com você</p></div></div>
    <div class="cartao"><h2>Para avaliar (${pend.length})</h2>${pend.length ? `<ul class="lista-simples sel-lista">${pend.map(item).join('')}</ul>` : '<div class="vazio">Nenhuma entrevista pendente.</div>'}</div>
    ${feitas.length ? `<div class="cartao"><h2>Já avaliadas (${feitas.length})</h2><ul class="lista-simples sel-lista">${feitas.map(item).join('')}</ul></div>` : ''}`;
  $$('[data-av]', tela).forEach(b => (b.onclick = async () => { const a = ls.find(x => x.id === b.dataset.av); if (await formAvaliar(a, a.candidato.nome)) navegar(); }));
});

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
    const fers = dias.length ? await api.rpc('feriados_periodo', { p_ini: dias[0], p_fim: dias[dias.length - 1] }).catch(() => []) : [];
    const ferDia = d => fers.filter(f => f.data === d).map(f => `<span class="tag amarelo">📅 ${esc(typeof ferRotulo === 'function' ? ferRotulo(f) : f.nome)}</span>`).join(' ');
    tela.innerHTML = `${topo}<div class="cartao">${ts.length ? dias.map(d => `<div class="ad-dia" data-dia${fAttr('data', d)}><h3>${new Date(d + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}${d === hojeISO() ? ' <span class="tag azul">hoje</span>' : ''} ${ferDia(d)}</h3>
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

const AD_EVENTO = { avisado: 'Setor avisado', cobrado: 'Cobrança enviada ao setor', concluida: 'Concluída', nao_se_aplica: 'Marcada como não se aplica', reaberta: 'Reaberta pelo RH', conferida: 'Conferida pelo RH', devolvida: 'Devolvida ao setor' };
// itens exigidos de cada etapa: o que o responsável precisa entregar e o que o RH confere
function adRequisitos(e, D) {
  const c = D.col, k = D.cnh || {}, a = D.adm, hj = hojeISO(), R = (t, ok, obs) => ({ t, ok: !!ok, obs: obs || '' });
  const ordem = { A: 0, B: 1, AB: 1, C: 2, AC: 2, D: 3, AD: 3, E: 4, AE: 4 };
  const curso = (t, tem, val) => R(t, tem && (!val || val >= hj), tem ? (val ? (val < hj ? 'vencido em ' : 'válido até ') + dataBR(val) : 'validade não informada') : 'não consta na ficha');
  switch (e.codigo) {
    case 'ficha': return [R('CPF', D.rh ? c.cpf : true), R('Nascimento', c.data_nascimento), R('Telefone', c.telefone), R('Endereço', c.logradouro && c.cidade), R('Foto da ficha', c.foto_caminho),
      R('Foto do crachá', c.foto_cracha_caminho), R('Contato de emergência', c.emergencia_nome && c.emergencia_telefone), R('Conta ou Pix', c.tem_banco), R('Setor', c.setor_id)];
    case 'docs': return (D.docs_exigidos || []).map(d => R(d.nome, d.ok));
    case 'aso': return [R('ASO admissional lançado no SSMA', D.aso, D.aso && dataBR(D.aso.data)), R(D.aso?.resultado === 'apto_restricao' ? 'Resultado apto (com restrição)' : 'Resultado apto', D.aso && /^apto/.test(D.aso.resultado || ''), D.aso && !/^apto/.test(D.aso.resultado || '') ? D.aso.resultado : '')];
    case 'tox': return [R('Toxicológico negativo lançado no SSMA', e.status === 'feito')];
    case 'cnh': { const L = [R(`Categoria${k.minima ? ' (mínimo ' + k.minima + ')' : ''}`, k.categoria && (!k.minima || (ordem[k.categoria] ?? -1) >= ordem[k.minima]), k.categoria || 'não informada'),
        R('Observação EAR', k.ear), R('CNH válida na admissão', k.validade && k.validade >= (a.data_prevista || hj), k.validade && 'até ' + dataBR(k.validade))];
      if (k.exige_indivisiveis) L.push(curso('Curso de cargas indivisíveis', k.indivisiveis, k.indivisiveis_validade));
      if (k.exige_mopp) L.push(curso('MOPP (produtos perigosos)', k.mopp, k.mopp_validade));
      L.push(R('Consulta de pontuação anexada', e.anexos.length)); return L; }
    case 'contrato': return [R('Contrato de trabalho e de experiência assinados em Documentos da ficha', e.status === 'feito')];
    case 'esocial': return [R('Recibo do S-2200 anexado', e.anexos.length), R('Enviado antes do 1º dia', e.status !== 'feito' || !a.data_prevista || (e.concluido_em || '').slice(0, 10) < a.data_prevista)];
    case 'os_seg': return [R('Ordem de serviço assinada anexada', e.anexos.length)];
    case 'epi': return [R('Entrega de EPI registrada no almoxarifado', D.epi, D.epi ? D.epi + ' item(ns)' : ''), R('Ficha de EPI assinada', e.status === 'feito')];
    case 'acessos': return [R('Crachá gerado', c.cracha_gerado_em, c.cracha_gerado_em && dataBR(c.cracha_gerado_em.slice(0, 10))), R('Acessos e patrimônio entregues', e.status === 'feito')];
    case 'cliente': return a.cliente || e.status === 'pendente' ? [R('Cliente informado', a.cliente, a.cliente), R('Documentação enviada ao cliente', a.cli_enviado_em, a.cli_enviado_em && dataBR(a.cli_enviado_em)), R('Aprovação do cliente', a.cli_aprovado_em, a.cli_aprovado_em && dataBR(a.cli_aprovado_em))] : [];
    case 'treinamentos': { const ts = (D.treinos || []).filter(t => t.status !== 'cancelado'); return [R('Agenda de integração montada', ts.length, ts.length ? ts.length + ' treinamento(s)' : ''), R('Todos confirmados pelos setores', ts.length && ts.every(t => t.status === 'concluido'))]; }
  }
  return [];
}
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
  const aConferir = ets.filter(e => e.precisa_conferencia);
  const prontaConcluir = andamento && !pendentes.length && !aConferir.length;
  const bloqueio = e => (e.depende || []).map(k => est(k)).filter(x => x && x.status === 'pendente');
  const R = D.responsaveis || {};
  const respTxt = s => { const x = R[s]; if (!x) return ''; return x.nomeado ? `<b>${esc(x.nomeado)}</b> (responsável)` : x.perfil?.length ? `sem responsável definido · aviso vai para ${x.perfil.length} pessoa(s) com perfil ${esc(s)}` : `<span class="txt-vermelho">ninguém com perfil ${esc(s)}</span>`; };
  const respCurto = s => { const x = R[s]; if (!x) return '—'; return x.nomeado ? `<b>${esc(x.nomeado)}</b>` : x.perfil?.length ? `<span class="muted" title="${esc(x.perfil.join(', '))}">não definido · ${x.perfil.length} com o perfil</span>` : '<span class="txt-vermelho">ninguém</span>'; };
  const ultAviso = e => [...(e.eventos || [])].reverse().find(v => v.evento === 'avisado' || v.evento === 'cobrado');
  const itemEtapa = e => { const [stT, stC, ic] = ST_ETAPA[e.status], bl = bloqueio(e), meu = meus.includes(e.setor) || rh;
    const lk = AD_LINK[e.codigo]?.(c.id), plk = AD_PERM_LINK[e.codigo]?.();
    const reqs = adRequisitos(e, D), okN = reqs.filter(x => x.ok).length, devolvida = e.status === 'pendente' && e.devolvido_em;
    const como = ['contrato', 'esocial', 'os_seg', 'epi', 'treinamentos', 'cnh', 'cliente'].includes(e.codigo) && e.status === 'pendente' ? adDica(e, D) : '';
    const av = ultAviso(e);
    const situacao = e.status === 'pendente'
      ? (bl.length ? `<span class="tag">aguardando etapa anterior</span> <span class="muted">${bl.map(x => esc(x.etapa)).join('; ')}</span>`
        : `<span class="tag ${devolvida ? 'vermelho' : 'azul'}">${devolvida ? 'devolvida ao setor' : 'com o setor'}</span>${av ? ` <span class="muted">${av.evento === 'cobrado' ? 'cobrado' : 'avisado'} em ${dtHora(av.em)}</span>` : ''}`)
      : `<span class="muted">${e.status === 'nao_se_aplica' ? 'Marcada como não se aplica' : 'Concluída'}${e.feito_por_nome ? ' por <b>' + esc(e.feito_por_nome) + '</b>' : e.status === 'feito' ? ' pelo sistema' : ''}${e.concluido_em ? ' em ' + dtHora(e.concluido_em) : ''}${e.observacao ? ' · ' + esc(e.observacao) : ''}</span>
         ${e.conferido_em ? ` <span class="tag verde">conferida por ${esc(e.conferido_por_nome || 'RH')} · ${dtHora(e.conferido_em)}</span>` : e.precisa_conferencia ? ' <span class="tag amarelo">aguardando conferência do RH</span>' : ''}`;
    return `<li class="ad-et ${e.status}${adAtrasada(e) ? ' atrasada' : ''}${devolvida ? ' devolvida' : ''}"><span class="ad-ic">${ic}</span><div class="ad-et-c">
      <div class="ad-et-t"><b>${esc(e.etapa)}</b> <span class="tag ${stC}">${stT}</span>${adAtrasada(e) ? ` <span class="tag vermelho">atrasada · prazo ${dataBR(e.prazo)}</span>` : e.status === 'pendente' && e.prazo ? ` <span class="muted">prazo ${dataBR(e.prazo)}</span>` : ''}</div>
      <div class="ad-meta"><span><span class="muted">Responsável:</span> <b>${esc(e.setor)}</b>${e.setor !== 'Cliente' ? ' · ' + respTxt(e.setor) : ''}</span><span><span class="muted">Situação:</span> ${situacao}</span></div>
      ${devolvida ? `<div class="alerta-obs erro">Devolvida por ${esc(e.devolvido_por_nome || 'RH')} em ${dtHora(e.devolvido_em)}: <b>${esc(e.devolvido_motivo || '')}</b></div>` : ''}
      ${reqs.length ? `<div class="ad-req"><span class="muted">Itens exigidos (${okN}/${reqs.length}):</span>${reqs.map(x => `<span class="ad-ri ${x.ok ? 'ok' : 'falta'}">${x.ok ? '✓' : '✗'} ${esc(x.t)}${x.obs ? ` <i>${esc(x.obs)}</i>` : ''}</span>`).join('')}</div>` : ''}
      ${como ? `<div class="muted ad-como">${esc(como)}</div>` : ''}
      ${adAnexosHtml(e.anexos)}
      ${e.codigo === 'cliente' && e.status === 'feito' && D.cli_sugestao && !trs.some(t => t.setor === 'Cliente' && t.status !== 'cancelado') && andamento ? `<div class="alerta-obs" style="margin-top:6px">Próxima integração possível no cliente: <b>${dataBR(D.cli_sugestao)}</b>${rh ? ' <button class="btn peq prim" data-cli="agendar">Agendar integração</button>' : ' (o RH agenda)'}</div>` : ''}
      ${andamento ? `<div class="ad-et-a">${lk && plk ? `<a class="btn peq" href="${lk[0]}">${esc(lk[1])}</a>` : ''}
        ${e.codigo === 'cliente' && (meu || rh) && (e.status === 'pendente' || (e.status === 'nao_se_aplica' && rh)) ? `<button class="btn peq" data-cli="definir">${a.cliente ? 'Trocar cliente' : 'Informar cliente'}</button>` : ''}
        ${e.codigo === 'cliente' && e.status === 'pendente' && meu && a.cliente ? `${!a.cli_enviado_em ? '<button class="btn peq prim" data-cli="enviar">Docs enviados ao cliente</button>' : '<button class="btn peq ok" data-cli="aprovar">Cliente aprovou</button><button class="btn peq" data-cli="recusar">Cliente pediu ajuste</button>'}` : ''}
        ${e.status === 'pendente' && meu ? `${e.codigo === 'cliente' ? '' : !e.auto || devolvida ? `<button class="btn peq ok" data-concl="${e.id}">${devolvida ? 'Corrigido: concluir' : 'Concluir'}${e.exige_anexo ? ' (com anexo)' : ''}</button>` : `<button class="btn peq" data-verif>Verificar agora</button>`}
          <button class="btn peq" data-anx="${e.id}">📎 Anexar</button><button class="btn peq" data-na="${e.id}">Não se aplica</button>` : ''}
        ${e.status === 'pendente' && rh && !bl.length && e.setor !== 'Cliente' ? `<button class="btn peq" data-cobrar="${e.id}" title="Envia um aviso ao responsável do setor">Cobrar setor</button>` : ''}
        ${e.precisa_conferencia && rh ? `<button class="btn peq prim" data-conferir="${e.id}">Conferir</button><button class="btn peq" data-devolver="${e.id}">Devolver ao setor</button>` : ''}
        ${e.status !== 'pendente' && rh && !e.precisa_conferencia ? `<button class="btn peq" data-reabrir="${e.id}">Reabrir</button>` : ''}</div>` : ''}
      ${(e.eventos || []).length ? `<details class="ad-ethist"><summary>Histórico da etapa (${e.eventos.length})</summary><ul>${e.eventos.map(v => `<li><span class="muted">${dtHora(v.em)}</span> · ${esc(AD_EVENTO[v.evento] || v.evento)}${v.por ? ' · ' + esc(v.por) : ''}${v.obs ? `<div class="muted">${esc(v.obs)}</div>` : ''}</li>`).join('')}</ul></details>` : ''}</div></li>`; };
  // quadro: quem está com cada parte
  const setoresProc = [...new Set(ets.map(e => e.setor))].filter(s => s !== 'Cliente');
  const quadro = andamento ? `<div class="cartao"><div class="topo" style="margin:0 0 8px"><div><h2 style="margin:0">Responsáveis e situação</h2>
      <div class="muted">Cada setor recebe aviso automático quando a etapa dele fica liberada e vê a pendência em Início e no menu Admissões. As etapas feitas por outros setores passam pela conferência do RH antes de concluir a admissão.</div></div>
      ${tem('administrador', 'rh') ? '<button class="btn peq" id="ad-resp">Definir responsáveis</button>' : ''}</div>
    <div class="tabela-rol"><table class="tabela compacta"><thead><tr><th>Setor</th><th>Responsável</th><th>Com o setor agora</th><th>Atrasadas</th><th>Aguardando conferência</th></tr></thead><tbody>
    ${setoresProc.map(s => { const es = ets.filter(e => e.setor === s), agora = es.filter(e => e.status === 'pendente' && !bloqueio(e).length), atr = es.filter(adAtrasada), conf = es.filter(e => e.precisa_conferencia);
      return `<tr class="${meus.includes(s) && agora.length ? 'destaque' : ''}"><td data-r="Setor"><b>${esc(s)}</b></td><td data-r="Responsável">${respCurto(s)}</td>
        <td data-r="Com o setor">${agora.length ? agora.map(e => esc(e.etapa.split(' (')[0])).join('<br>') : '<span class="muted">—</span>'}</td>
        <td data-r="Atrasadas">${atr.length ? `<span class="tag vermelho">${atr.length}</span>` : '—'}</td><td data-r="Conferência">${conf.length ? `<span class="tag amarelo">${conf.length}</span>` : '—'}</td></tr>`; }).join('')}
    </tbody></table></div></div>` : '';
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
        ${rh && andamento ? `<button class="btn ok" id="ad-concluir" ${prontaConcluir ? '' : 'disabled'} title="${prontaConcluir ? '' : pendentes.length ? 'Faltam etapas' : 'Falta a conferência do RH em ' + aConferir.length + ' etapa(s)'}">Concluir admissão</button><button class="btn perigo" id="ad-cancelar">Cancelar</button>` : ''}
        <a class="btn" href="#/rh/admissoes">Voltar</a></div></div>
    ${adStepper(passos)}
    ${andamento && !registro && trs.some(t => t.status === 'agendado') ? '<div class="cartao alerta-obs">⚖️ <b>Treinamento é tempo de trabalho.</b> Os treinamentos só podem ser confirmados depois do contrato assinado, do eSocial (S-2200) enviado e do ASO apto. Confira se as datas da agenda são posteriores ao registro.</div>' : ''}
    ${a.status === 'concluida' && a.motorista ? '<div class="cartao alerta-obs">🚛 Motorista admitido: a liberação definitiva (padrinho e viagens padrão) segue em <a href="#/ssma/integracoes">SSMA › Liberação de motoristas</a>.</div>' : ''}
    ${quadro}
    ${AD_FASES.filter(f => f !== 'Integração e treinamentos').map(f => `<div class="cartao"><h2>${esc(f)}</h2><ol class="ad-ets">${ets.filter(e => e.fase === f).map(itemEtapa).join('')}</ol></div>`).join('')}
    <div class="cartao"><div class="topo" style="margin:0 0 8px"><div><h2 style="margin:0">Integração e treinamentos</h2><div class="muted">O RH monta a agenda; cada setor confirma a sua parte com a lista de presença ou o certificado. O treinamento no cliente é confirmado pelo SSMA.</div></div>
        ${rh && andamento ? '<div class="acoes"><button class="btn" id="tr-cargo">Sugerir do cargo</button><button class="btn prim" id="tr-novo">+ Agendar treinamento</button></div>' : ''}</div>
      <ol class="ad-ets">${ets.filter(e => e.fase === 'Integração e treinamentos').map(itemEtapa).join('')}</ol>
      ${trs.length ? `<ul class="ad-trs">${trs.map(linhaTreino).join('')}</ul>` : '<p class="muted">Nenhum treinamento agendado.</p>'}</div>
    ${typeof htmlFeriadosProcesso === 'function' ? htmlFeriadosProcesso(D, 'admissao', andamento, rh || meus.includes('SSMA')) : ''}`;

  if (typeof ligarFeriadosProcesso === 'function') ligarFeriadosProcesso(tela, 'admissao', a.id);
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
  $$('[data-cobrar]', tela).forEach(b => (b.onclick = async () => { try { const n = await api.rpc('cobrar_etapa_admissao', { p_etapa: b.dataset.cobrar });
    aviso(n ? `Cobrança enviada a ${n} pessoa(s).` : 'Ninguém recebeu: defina o responsável do setor.', !n); navegar(); } catch (err) { falha(err); } }));
  $$('[data-conferir]', tela).forEach(b => (b.onclick = async () => { const e = ets.find(x => x.id === b.dataset.conferir), reqs = adRequisitos(e, D), falta = reqs.filter(x => !x.ok);
    const r = await modal(`<form><h2>Conferir · ${esc(e.etapa)}</h2><div class="form largo">
      <p class="largo">Executada por <b>${esc(e.feito_por_nome || 'sistema')}</b>${e.concluido_em ? ' em ' + dtHora(e.concluido_em) : ''} (${esc(e.setor)}).${e.observacao ? '<br>Observação: ' + esc(e.observacao) : ''}</p>
      ${reqs.length ? `<div class="largo ad-req">${reqs.map(x => `<span class="ad-ri ${x.ok ? 'ok' : 'falta'}">${x.ok ? '✓' : '✗'} ${esc(x.t)}</span>`).join('')}</div>` : ''}
      ${e.anexos.length ? `<div class="largo">${adAnexosHtml(e.anexos)}</div>` : '<p class="muted largo">Sem anexos.</p>'}
      ${falta.length ? `<p class="alerta-obs largo">Há ${falta.length} item(ns) não atendido(s). Se não houver justificativa, devolva ao setor.</p>` : ''}
      <label class="check largo"><input type="checkbox" name="ok" required> Conferi os itens exigidos e os comprovantes desta etapa</label>
      <label class="campo largo">Observação da conferência<input name="obs"></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Confirmar conferência</button></div></form>`);
    if (!r) return; try { await api.rpc('conferir_etapa_admissao', { p_etapa: e.id, p_acao: 'conferir', p_motivo: r.obs || null }); aviso('Etapa conferida.'); navegar(); } catch (err) { falha(err); } }));
  $$('[data-devolver]', tela).forEach(b => (b.onclick = async () => { const m = await confirmar('O que o setor precisa corrigir? O responsável recebe o aviso com este texto.', { comMotivo: true, botao: 'Devolver ao setor' }); if (!m) return;
    try { await api.rpc('conferir_etapa_admissao', { p_etapa: b.dataset.devolver, p_acao: 'devolver', p_motivo: m }); aviso('Devolvida. O setor foi avisado.'); navegar(); } catch (err) { falha(err); } }));
  $('#ad-resp')?.addEventListener('click', async () => {
    const us = (await usuarios()).filter(u => u.ativo);
    const r = await modal(`<form><h2>Responsáveis por setor nas admissões</h2><div class="form">
      <p class="muted largo">O responsável recebe os avisos e as cobranças das etapas do setor. Sem responsável, o aviso vai para todos com o perfil do setor — hoje há perfis com muitas pessoas, o que dilui a responsabilidade.</p>
      ${setoresProc.map(s => `<label class="campo">${esc(s)}<select name="s_${esc(s)}"><option value="">— todos com o perfil (${R[s]?.perfil?.length || 0}) —</option>${us.map(u => `<option value="${u.id}" ${u.id === R[s]?.nomeado_id ? 'selected' : ''}>${esc(u.nome)}${(R[s]?.perfil || []).includes(u.nome) ? '' : ' (sem o perfil)'}</option>`).join('')}</select></label>`).join('')}</div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`);
    if (!r) return; const p = {}; setoresProc.forEach(s => { if (r['s_' + s]) p[s] = r['s_' + s]; });
    try { await api.rpc('salvar_responsaveis_admissao', { p }); aviso('Responsáveis salvos. Valem para todas as admissões.'); navegar(); } catch (err) { falha(err); } });
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
        const x = await api.rpc('cliente_admissao', { p_adm: a.id, p_acao: 'enviar', p_data: r.data, p_obs: r.obs || null });
        aviso(`Envio registrado. Resposta esperada até ${dataBR(x.prazo)}.${x.feriados?.length ? ` No período: ${x.feriados.join(', ')} — se o cliente não tiver expediente, registre em "Calendário do processo".` : ''}`); return navegar(); }
      if (acao === 'aprovar') { const r = await modal(`<form><h2>Cliente ${esc(a.cliente)} aprovou</h2><div class="form">
          <label class="campo">Aprovado em *<input type="date" name="data" required value="${hojeISO()}"></label>
          <label class="campo largo">Aprovação do cliente (e-mail/print)<input type="file" name="arquivos" multiple accept="image/*,application/pdf"></label>
          <label class="campo largo">Observação<input name="obs"></label></div>
          <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Registrar aprovação</button></div></form>`); if (!r) return;
        if (r.arquivos.length) await anexar('admissao_etapa', ec.id, r.arquivos, 'Aprovação do cliente ' + a.cliente);
        const x = await api.rpc('cliente_admissao', { p_adm: a.id, p_acao: 'aprovar', p_data: r.data, p_obs: r.obs || null });
        aviso(`Aprovação registrada. Próxima integração possível: ${dataBR(x.sugestao)}.${x.feriado ? ` Atenção: é ${x.feriado}. Se o cliente não tiver expediente nesse dia, registre "sem expediente" no Calendário do processo e a data é recalculada.` : ''}`, !!x.feriado);
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
      <p class="alerta-obs largo" id="fer-aviso" hidden></p>
      <p class="muted largo">Treinamento no cliente é confirmado pelo SSMA. Agende só a partir do 1º dia de registro do colaborador.</p></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`,
      { aoAbrir: f => { const fm = $('form', f); const sinc = () => { $('#c-cli', f).hidden = fm.setor.value !== 'Cliente'; if (fm.setor.value === 'Cliente') fm.confirma_setor.value = 'SSMA'; else if (!t || t._novo) fm.confirma_setor.value = fm.setor.value; };
          fm.setor.onchange = sinc; sinc(); fm.treinamento_id.onchange = () => { const x = cat.find(y => y.id === fm.treinamento_id.value); if (x && !fm.titulo.dataset.mexeu) fm.titulo.value = x.nome; };
          fm.titulo.oninput = () => (fm.titulo.dataset.mexeu = 1);
          const fer = async () => { const t = typeof avisoFeriadoData === 'function' ? await avisoFeriadoData(fm.data.value) : ''; const el = $('#fer-aviso', f); if (el) { el.textContent = t; el.hidden = !t; } };
          fm.data.addEventListener('change', fer); fer(); },
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


// ===================== Benefícios e custo estimado da vaga =====================
function vgFormBenHtml(v) {
  return `      <div class="largo"><h3 style="margin:6px 0">Benefícios da vaga</h3>
        <p class="muted" style="margin:0 0 6px">Valor pago pela empresa e desconto do colaborador. A lei limita o desconto (VT até 6% do salário; VR/VA até 20% do custo pelo PAT); a empresa pode descontar menos ou não descontar. Ao concluir a admissão, vão para DP › Benefícios.</p>
        <div id="ben-lista"></div><button type="button" class="btn peq" id="ben-mais">+ Benefício</button></div>
      <label class="check largo" id="c-jur-ben" hidden><input type="checkbox" name="juridico_descontos"> Há desconto do colaborador: confirmo a validação do jurídico (CLT art. 462 — desconto só com previsão em lei, contrato ou acordo; plano de saúde exige autorização escrita, Súmula 342 TST)</label>
      <div class="largo"><label class="check"><input type="checkbox" name="prem_tem" ${v.premiacao?.tem ? 'checked' : ''}> Vaga com premiação por metas (variável)</label></div>
      <div class="largo form" id="c-prem" hidden style="padding:0">
        <label class="campo largo">Metas e critério de pagamento *<textarea name="prem_criterio" rows="2" placeholder="Ex.: até R$ 300/mês se atingir 95% de disponibilidade da frota e zero multas">${esc(v.premiacao?.criterio || '')}</textarea></label>
        <label class="campo">Valor de referência (opcional)<input name="prem_valor" inputmode="decimal" value="${v.premiacao?.valor_ref != null ? Number(v.premiacao.valor_ref).toFixed(2).replace('.', ',') : ''}" placeholder="R$ máximo ou médio"></label>
        <label class="campo">Periodicidade<select name="prem_per">${['Mensal', 'Trimestral', 'Semestral', 'Anual'].map(x => `<option ${x === (v.premiacao?.periodicidade || 'Mensal') ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <p class="muted largo" style="margin:0">Prêmio por desempenho acima do esperado, com regra escrita, não integra o salário (CLT art. 457 §§2º e 4º). Sem regra clara pode virar salário e gerar encargos. PLR é outra coisa (Lei 10.101/2000, até 2 vezes por ano, com acordo).</p></div>
      <label class="campo largo">Observações dos benefícios<textarea name="beneficios" rows="2">${esc(v.beneficios || '')}</textarea></label>
      <div class="largo" id="vg-custo"></div>`;
}
// confere salário muito fora da faixa do cargo (erro de digitação: 34005 em vez de 3405)
async function vgConferirSalario(sal, cargo) {
  if (!sal) return true;
  const base = Number(cargo?.salario_base) || 0;
  const fora = base ? (sal > base * 2.5 || sal < base / 2.5) : sal > 30000;
  return !fora || confirmar(`Salário de ${brl(sal)}${base ? ` está muito fora da base do cargo (${brl(base)})` : ' parece alto'}. Confira se não houve erro de digitação. Continuar com este valor?`, { botao: 'Sim, está certo' });
}
const VG_BENEF = ['Vale-transporte', 'Vale-refeição', 'Vale-alimentação', 'Cesta básica', 'Plano de saúde', 'Plano odontológico', 'Seguro de vida', 'Auxílio combustível', 'Ajuda de custo', 'Diária de viagem', 'Outro'];
const vgBenMensal = b => (Number(b.empresa) || 0) * (b.base === 'dia' ? (Number(b.dias) || 22) : 1);
const ENC_PADRAO = { regime: 'Lucro Presumido / Real', inss_patronal: 20, rat_fap: 3, terceiros: 5.8, fgts: 8, decimo_terceiro: 8.33, ferias_terco: 11.11, incide_sobre_provisoes: true, multa_fgts_provisao: 3.2, dias_mes: 22 };
function vgCalcularCusto(sal, itens, E) {
  E = { ...ENC_PADRAO, ...(E || {}) }; sal = Number(sal) || 0;
  const diretos = (+E.inss_patronal || 0) + (+E.rat_fap || 0) + (+E.terceiros || 0) + (+E.fgts || 0);
  const prov = (+E.decimo_terceiro || 0) + (+E.ferias_terco || 0);
  const r2 = x => Math.round(x * 100) / 100;
  const linhas = [['Salário bruto', sal],
    [`INSS patronal ${E.inss_patronal}% + RAT/FAP ${E.rat_fap}% + terceiros ${E.terceiros}%`, r2(sal * ((+E.inss_patronal || 0) + (+E.rat_fap || 0) + (+E.terceiros || 0)) / 100)],
    [`FGTS ${E.fgts}%`, r2(sal * (+E.fgts || 0) / 100)],
    [`Provisão de 13º (${E.decimo_terceiro}%) e férias + 1/3 (${E.ferias_terco}%)`, r2(sal * prov / 100)]];
  if (E.incide_sobre_provisoes) linhas.push(['Encargos sobre as provisões', r2(sal * prov / 100 * diretos / 100)]);
  if (+E.multa_fgts_provisao) linhas.push([`Provisão da multa de 40% do FGTS (${E.multa_fgts_provisao}%)`, r2(sal * (+E.multa_fgts_provisao) / 100)]);
  const ben = (itens || []).reduce((a, b) => a + vgBenMensal(b), 0);
  if (ben) linhas.push(['Benefícios pagos pela empresa', r2(ben)]);
  const total = r2(linhas.reduce((a, l) => a + l[1], 0));
  return { linhas, total, regime: E.regime, pct_encargos: sal ? r2((total - sal - ben) / sal * 100) : 0 };
}
function vgHtmlCusto(c) {
  if (!c) return '';
  return `<div class="cartao" style="margin:0;background:var(--fundo-2,#f6f8f7)"><b>Custo mensal estimado do funcionário</b> <span class="muted">(${esc(c.regime || '')} · encargos ≈ ${String(c.pct_encargos).replace('.', ',')}% do salário)</span>
    <table class="tabela-notas" style="width:100%;margin-top:6px">${c.linhas.map(l => `<tr><td>${esc(l[0])}</td><td class="nowrap" style="text-align:right">${brl(l[1])}</td></tr>`).join('')}
    <tr><td><b>Total por mês</b></td><td class="nowrap" style="text-align:right"><b>${brl(c.total)}</b></td></tr><tr><td class="muted">Total por ano (×12)</td><td class="nowrap muted" style="text-align:right">${brl(c.total * 12)}</td></tr></table>
    <div class="muted" style="font-size:.85em">Estimativa sobre o salário bruto. Não inclui horas extras, adicionais nem premiação variável.</div></div>`;
}
function vgHtmlResumo(v, E, podeEditar) {
  const bs = v.beneficios_itens || [], q = Number(v.quantidade) || 1;
  const c = v.custo_estimado?.linhas ? v.custo_estimado : (v.salario_ofertado ? vgCalcularCusto(v.salario_ofertado, bs, E) : null);
  const k = (n, r, cls = '') => `<div class="cartao kpi ${cls}" style="margin:0"><div class="n">${n}</div><div class="r">${r}</div></div>`;
  return `<div class="cartao"><div class="topo" style="margin:0 0 10px"><div><h2 style="margin:0">Resumo para decisão</h2>
      <div class="muted">${v.custo_estimado?.linhas ? 'Custo calculado na validação do RH' : 'Custo calculado agora com os parâmetros atuais'} · estimativa, não substitui a folha</div></div>
      ${podeEditar ? '<button class="btn" id="ver-editar-ben">Editar benefícios e custo</button>' : ''}</div>
    <div class="grade" style="margin-bottom:12px">
      ${k(q, 'vaga(s)')}${k(v.salario_ofertado != null ? brl(v.salario_ofertado) : '—', 'salário por funcionário')}
      ${k(c ? brl(c.total) : '—', 'custo mensal por funcionário')}${k(c ? brl(c.total * q) : '—', `custo mensal da vaga (× ${q})`, q > 1 ? 'alerta' : '')}${k(c ? brl(c.total * q * 12) : '—', 'custo anual da vaga')}</div>
    ${bs.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Benefício</th><th>Empresa paga (mês)</th><th>Desconto do colaborador</th><th>Observação</th></tr></thead><tbody>
      ${bs.map(b => `<tr><td data-r="Benefício"><b>${esc(b.tipo === 'Outro' && b.obs ? b.obs : b.tipo)}</b></td><td data-r="Empresa paga" class="nowrap">${brl(vgBenMensal(b))}${b.base === 'dia' ? `<div class="muted">${brl(b.empresa)}/dia × ${b.dias || 22}</div>` : ''}</td>
        <td data-r="Desconto" class="nowrap">${b.colaborador ? brl(b.colaborador) : '<span class="muted">não desconta</span>'}</td><td data-r="Observação">${esc(b.tipo === 'Outro' ? '' : b.obs || '')}</td></tr>`).join('')}</tbody></table></div>`
      : '<p class="muted">Nenhum benefício com valor cadastrado.' + (podeEditar ? ' Use “Editar benefícios e custo”.' : '') + '</p>'}
    ${v.premiacao?.tem ? `<p style="margin:8px 0 0"><b>Premiação por metas (${esc(v.premiacao.periodicidade || '')}):</b> ${esc(v.premiacao.criterio || '')}${v.premiacao.valor_ref ? ` · referência ${brl(v.premiacao.valor_ref)}` : ''}</p>` : ''}
    ${c ? `<details style="margin-top:10px"><summary>Como o custo foi calculado</summary>${vgHtmlCusto(c)}</details>` : ''}</div>`;
}
function vgHtmlBeneficios(v) {
  const bs = v.beneficios_itens || [];
  return `${bs.length ? `<div class="muted">Benefícios</div><ul class="lista-simples">${bs.map(b => `<li><span><b>${esc(b.tipo)}</b>${b.obs ? ' · ' + esc(b.obs) : ''}${b.base === 'dia' ? ` <span class="muted">${brl(b.empresa)}/dia × ${b.dias || 22}</span>` : ''}</span>
      <span>empresa ${brl(vgBenMensal(b))}${b.colaborador ? ` · desconto ${brl(b.colaborador)}` : ''}</span></li>`).join('')}</ul>` : ''}
    ${v.premiacao?.tem ? `<p><b>Premiação por metas (${esc(v.premiacao.periodicidade || '')}):</b> ${esc(v.premiacao.criterio || '')}${v.premiacao.valor_ref ? ` · referência ${brl(v.premiacao.valor_ref)}` : ''}</p>` : ''}
    ${vgHtmlCusto(v.custo_estimado)}`;
}
async function vgEditorBeneficios(f, v, cargo) {
  let E = await api.rpc('encargos_estimativa').catch(() => null) || ENC_PADRAO;
  const lista = $('#ben-lista', f);
  const linha = (b = {}) => `<div class="ben-linha" data-ben>
    <label class="campo">Benefício<select name="_bt" data-sem-outro>${VG_BENEF.map(t => `<option ${t === (b.tipo || 'Vale-transporte') ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <label class="campo">Empresa paga (R$)<input name="_be" inputmode="decimal" value="${b.empresa != null ? String(b.empresa).replace('.', ',') : ''}"></label>
    <label class="campo">Base<select name="_bb"><option value="mensal" ${b.base !== 'dia' ? 'selected' : ''}>por mês</option><option value="dia" ${b.base === 'dia' ? 'selected' : ''}>por dia trabalhado</option></select></label>
    <label class="campo" data-dias ${b.base === 'dia' ? '' : 'hidden'}>Dias/mês<input name="_bd" inputmode="numeric" value="${b.dias || E.dias_mes || 22}"></label>
    <label class="campo">Desconto do colaborador (R$/mês)<input name="_bc" inputmode="decimal" value="${b.colaborador ? String(b.colaborador).replace('.', ',') : ''}" placeholder="0 = não desconta"></label>
    <label class="campo">${b.tipo === 'Outro' ? 'Qual benefício? *' : 'Obs.'}<input name="_bo" value="${esc(b.obs || '')}" placeholder="Operadora, plano, linha…"></label>
    <button type="button" class="btn peq perigo" data-ben-rm title="Remover">✕</button><div class="muted ben-dica" style="flex-basis:100%"></div></div>`;
  const ler = () => $$('[data-ben]', lista).map(el => { const g = n => $(`[name=${n}]`, el).value;
    return { tipo: g('_bt'), empresa: num(g('_be')) || 0, base: g('_bb'), dias: g('_bb') === 'dia' ? Number(g('_bd')) || 22 : null, colaborador: num(g('_bc')) || 0, obs: g('_bo').trim() || null }; });
  const atualizar = () => {
    const sal = num(f.salario_ofertado.value) || 0, its = ler();
    $$('[data-ben]', lista).forEach((el, i) => { const b = its[i]; $('[data-dias]', el).hidden = b.base !== 'dia';
      const d = $('.ben-dica', el);
      if (b.tipo === 'Vale-transporte') d.innerHTML = `Desconto máximo pela lei: <b>${brl(sal * 0.06)}</b> (6% do salário). A empresa pode descontar menos ou não descontar.${b.colaborador > sal * 0.06 + 0.005 ? ' <b class="txt-verm">Acima do limite legal.</b>' : ''}`;
      else if (['Vale-refeição', 'Vale-alimentação'].includes(b.tipo)) d.innerHTML = `PAT: desconto até 20% do custo (máx. ${brl((vgBenMensal(b) + b.colaborador) * 0.2)}).${b.colaborador > (vgBenMensal(b) + b.colaborador) * 0.2 + 0.005 ? ' <b class="txt-verm">Acima do limite.</b>' : ''}`;
      else if (['Plano de saúde', 'Plano odontológico'].includes(b.tipo)) d.textContent = b.colaborador ? 'Desconto de plano só com autorização prévia e escrita do colaborador (Súmula 342 TST).' : '';
      else if (b.tipo === 'Diária de viagem' || b.tipo === 'Ajuda de custo') d.textContent = 'Confira a convenção coletiva: diárias e ajuda de custo não integram o salário quando pagas para despesas de trabalho (CLT art. 457 §2º).';
      else d.textContent = b.tipo === 'Outro' ? 'Escreva o nome do benefício no último campo.' : '';
      const lb = $('[name=_bo]', el).closest('label'); if (lb?.firstChild?.nodeType === 3) lb.firstChild.textContent = b.tipo === 'Outro' ? 'Qual benefício? *' : 'Obs.'; });
    $('#c-jur-ben', f).hidden = !its.some(b => b.colaborador > 0);
    $('#c-prem', f).hidden = !f.prem_tem.checked;
    $('#vg-custo', f).innerHTML = vgHtmlCusto(vgCalcularCusto(sal, its, E)) + (tem('administrador', 'rh', 'dp', 'financeiro', 'diretoria') ? '<button type="button" class="btn peq" id="enc-param" style="margin-top:6px">Parâmetros dos encargos</button>' : '');
    $('#enc-param', f)?.addEventListener('click', async () => {
      const campos = [['regime', 'Regime tributário', 'text'], ['inss_patronal', 'INSS patronal %'], ['rat_fap', 'RAT × FAP %'], ['terceiros', 'Terceiros (Sistema S, salário-educação) %'], ['fgts', 'FGTS %'],
        ['decimo_terceiro', 'Provisão 13º %'], ['ferias_terco', 'Provisão férias + 1/3 %'], ['multa_fgts_provisao', 'Provisão multa FGTS %'], ['dias_mes', 'Dias trabalhados/mês (benefício por dia)']];
      const r = await modal(`<form><h2>Parâmetros dos encargos</h2><p class="muted">Valem para todas as vagas. Simples Nacional (transporte de carga, Anexo III): INSS patronal, RAT e terceiros ficam no DAS — zere esses campos. Confirme com a contabilidade.</p><div class="form">
        ${campos.map(([k, t, ty]) => `<label class="campo">${t}<input name="${k}" ${ty === 'text' ? '' : 'inputmode="decimal"'} value="${esc(String(E[k] ?? '').replace('.', ','))}"></label>`).join('')}
        <label class="check largo"><input type="checkbox" name="incide_sobre_provisoes" ${E.incide_sobre_provisoes ? 'checked' : ''}> INSS/FGTS incidem sobre as provisões de 13º e férias</label></div>
        <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`);
      if (!r) return;
      const n = { regime: r.regime }; campos.slice(1).forEach(([k]) => (n[k] = num(r[k]) ?? 0)); n.incide_sobre_provisoes = !!r.incide_sobre_provisoes;
      try { await api.rpc('salvar_encargos_estimativa', { p: n }); E = n; aviso('Parâmetros salvos.'); atualizar(); } catch (err) { falha(err); }
    });
  };
  const ligar = () => { $$('[data-ben] input, [data-ben] select', lista).forEach(i => (i.oninput = i.onchange = atualizar)); $$('[data-ben-rm]', lista).forEach(b => (b.onclick = () => { b.closest('[data-ben]').remove(); atualizar(); })); };
  const ini = (v.beneficios_itens || []).length ? v.beneficios_itens : [];
  lista.innerHTML = ini.map(linha).join('');
  $('#ben-mais', f).onclick = () => { lista.insertAdjacentHTML('beforeend', linha({ tipo: VG_BENEF.find(t => !ler().some(b => b.tipo === t)) })); ligar(); atualizar(); };
  f.salario_ofertado.addEventListener('input', atualizar); f.prem_tem.addEventListener('change', atualizar);
  ligar(); atualizar();
  return { itens: ler, custo: () => vgCalcularCusto(num(f.salario_ofertado.value) || 0, ler(), E) };
}
