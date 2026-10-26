// Verbo Gestão — RH (etapa 2): disciplinar, desligamento, treinamentos, avaliações, recrutamento, férias,
// pesquisa de clima, organograma e programa de promoções e cursos. Avisos da legislação em cada tela.
'use strict';

// ===================== Avisos da legislação =====================
const LEI = {
  gradacao: ['Ordem de aplicação (gradação)', [
    '<b>1º Orientação / feedback registrado</b> → <b>2º Advertência verbal</b> (registrada no sistema) → <b>3º Advertência escrita</b> → <b>4º Suspensão</b> (1 a 30 dias) → <b>5º Dispensa por justa causa</b>.',
    'A CLT não obriga a gradação, mas a Justiça do Trabalho exige <b>proporcionalidade</b>: falta leve não justifica pena grave. Só faltas gravíssimas e comprovadas (ex.: furto, agressão, embriaguez em serviço com risco) admitem pular etapas.',
    '<b>Imediatidade:</b> aplique assim que a empresa souber do fato e concluir a apuração. Demorar pode ser entendido como <b>perdão tácito</b>.',
    '<b>Uma só punição por fato:</b> não é permitido advertir e depois suspender pela mesma falta.',
    '<b>Igualdade:</b> a mesma falta deve ter a mesma medida para todos. Punir só alguns caracteriza perseguição ou discriminação.',
    'Se o colaborador se recusar a assinar, leia o documento na frente de <b>2 testemunhas</b>, que assinam no lugar dele.']],
  suspensao: ['Suspensão', [
    'Máximo de <b>30 dias consecutivos</b>. Acima disso, equivale a dispensa sem justa causa (art. 474 da CLT).',
    'Os dias de suspensão não são pagos e o colaborador perde o <b>DSR</b> da semana. O DP precisa lançar o desconto na folha.',
    'Não existe <b>multa</b> como punição: descontos só são permitidos nos casos do art. 462 da CLT (adiantamento, lei, convenção ou dano — com dolo, ou com culpa se previsto em contrato).']],
  justa_causa: ['Justa causa', [
    'Só nas hipóteses do <b>art. 482 da CLT</b> (e art. 158, parágrafo único: recusa injustificada de usar EPI ou seguir normas de segurança).',
    'Exige <b>prova robusta</b> (documentos, testemunhas, imagens, telemetria). Se a Justiça reverter, a empresa paga todas as verbas da dispensa sem justa causa e pode ser condenada por dano moral.',
    'Recomenda-se <b>validação prévia do jurídico</b> antes de comunicar o colaborador.']],
  desligamento: ['Desligamento', [
    '<b>Verifique estabilidades antes de dispensar:</b> gestante (desde a concepção até 5 meses após o parto), acidente de trabalho/doença ocupacional (12 meses após a alta — Lei 8.213, art. 118), membro da CIPA, dirigente sindical e garantias da convenção coletiva (ex.: pré-aposentadoria). Em caso de dúvida, consulte o jurídico.',
    '<b>Aviso prévio proporcional:</b> 30 dias + 3 por ano completo de trabalho, até 90 dias (Lei 12.506/2011). Quando trabalhado, o colaborador escolhe reduzir 2 horas por dia ou faltar 7 dias corridos (art. 488).',
    '<b>Prazo de pagamento:</b> verbas rescisórias e entrega de documentos em até <b>10 dias</b> do término do contrato (art. 477 §6º). Atraso gera multa de um salário (art. 477 §8º).',
    '<b>Acordo (art. 484-A):</b> metade do aviso indenizado, multa de 20% do FGTS, saque de 80% do FGTS e <b>sem</b> seguro-desemprego.',
    '<b>Exame demissional (NR-7):</b> obrigatório, salvo se o último exame ocupacional tiver sido feito há menos de 135 dias (grau de risco 1 e 2) ou 90 dias (grau 3 e 4). Motorista profissional: <b>toxicológico demissional</b> (Lei 13.103/2015).',
    'No pedido de demissão, se o colaborador não cumprir o aviso, a empresa pode descontar o valor correspondente (art. 487 §2º).']],
  experiencia: ['Contrato de experiência', [
    'Duração máxima de <b>90 dias</b> (art. 445, parágrafo único), podendo ser prorrogado <b>uma única vez</b> dentro desse limite (art. 451). Uma segunda prorrogação torna o contrato por prazo indeterminado.',
    'Avalie <b>antes</b> do fim de cada período. Se o prazo vencer e o colaborador continuar trabalhando, o contrato passa a ser por prazo indeterminado.',
    'Encerrar antes do prazo sem justa causa obriga a pagar metade dos salários que faltariam até o fim (art. 479), salvo cláusula de rescisão antecipada (art. 481).']],
  ferias: ['Férias', [
    '<b>Direito:</b> 30 dias por período aquisitivo de 12 meses, reduzidos por faltas injustificadas: até 5 faltas = 30 dias; 6 a 14 = 24; 15 a 23 = 18; 24 a 32 = 12; acima de 32 perde o direito (art. 130).',
    '<b>Concessão:</b> nos 12 meses seguintes ao período aquisitivo. Depois disso, a empresa paga <b>em dobro</b> (art. 137).',
    '<b>Divisão:</b> até 3 períodos, um com no mínimo 14 dias e os demais com no mínimo 5 dias, com concordância do colaborador (art. 134 §1º).',
    '<b>Início:</b> não pode começar nos 2 dias que antecedem feriado ou o descanso semanal (art. 134 §3º).',
    '<b>Aviso:</b> por escrito, com no mínimo <b>30 dias</b> de antecedência (art. 135). <b>Pagamento</b> (com 1/3) até <b>2 dias antes</b> do início (art. 145).',
    '<b>Abono (venda):</b> até 1/3 das férias, a pedido do colaborador feito até 15 dias antes do fim do período aquisitivo (art. 143).',
    'Familiares que trabalham na empresa podem pedir férias juntos; estudante menor de 18 anos pode coincidir com as férias escolares (art. 136).']],
  recrutamento: ['Recrutamento e seleção', [
    'É proibido exigir teste ou atestado de gravidez ou esterilização e qualquer prática discriminatória por sexo, origem, raça, cor, estado civil, situação familiar, deficiência ou idade (Lei 9.029/1995).',
    'Não exija mais de 6 meses de experiência na mesma atividade (art. 442-A da CLT).',
    '<b>Antecedentes criminais:</b> só quando justificados pela função. Para motorista de carga, o TST considera a exigência legítima.',
    '<b>LGPD:</b> guarde currículos apenas com consentimento, pelo tempo informado ao candidato, e exclua quando ele pedir (Lei 13.709/2018).',
    'Motorista profissional: <b>exame toxicológico admissional</b> obrigatório (Lei 13.103/2015) e CNH com observação EAR.']],
  avaliacao: ['Avaliações', [
    'Registre fatos e comportamentos observados, não opiniões pessoais. A avaliação pode ser usada como prova em processos — seja objetivo.',
    'Os resultados são sigilosos: apenas RH, gestor e o próprio colaborador.',
    'Não use critérios discriminatórios (gravidez, saúde, religião, idade etc.).']],
  promocao: ['Promoções e cursos', [
    '<b>Equiparação salarial (art. 461):</b> quem faz a mesma função, com o mesmo valor e perfeição, no mesmo estabelecimento, deve ter o mesmo salário, se a diferença de tempo na função for de até 2 anos e na empresa de até 4 anos. Um <b>plano de cargos e salários</b> formal afasta a equiparação (art. 461 §2º).',
    'Mudanças no contrato só com concordância do colaborador e sem prejuízo para ele (art. 468). Promoção com aumento deve ser registrada (CTPS digital / eSocial S-2206).',
    'Cursos, bolsas e mensalidades pagos pela empresa <b>não</b> são salário (art. 458 §2º, II).',
    'Para exigir permanência após um curso pago, faça uma <b>cláusula escrita</b> com prazo razoável e reembolso proporcional.']],
  treinamentos: ['Treinamentos obrigatórios', [
    'Treinamentos exigidos por NR são custeados pela empresa e feitos <b>durante a jornada</b> — o tempo conta como trabalho (NR-1, item 1.7).',
    'Guarde certificados e listas de presença assinadas: são a prova em fiscalizações e processos.',
    'Motoristas de produtos perigosos precisam do <b>MOPP</b> válido e anotado na CNH.']],
  clima: ['Pesquisa de clima', [
    'As respostas são <b>anônimas</b>: o sistema registra só que a pessoa respondeu, nunca o quê.',
    'Não tente identificar quem respondeu, e divulgue resultados apenas de grupos com pelo menos 3 respostas.']],
};
function avisoLei(...chaves) {
  return `<details class="aviso-lei" open><summary>⚖️ O que diz a lei — leia antes de decidir</summary>${chaves.map(k => LEI[k]).filter(Boolean).map(([t, itens]) =>
    `<div class="aviso-lei-bloco"><b>${t}</b><ul>${itens.map(i => `<li>${i}</li>`).join('')}</ul></div>`).join('')}
    <p class="muted" style="margin:6px 0 0">Orientação geral para apoiar a decisão. Convenção coletiva pode ter regras próprias. Em caso de dúvida, consulte o jurídico.</p></details>`;
}

// ===================== Auxiliares =====================
const colabsRH = (extra = '') => api.listar('colaboradores', `select=id,nome,matricula,cargo_id,setor_id,status,data_admissao,experiencia_fim1,experiencia_fim2,usuario_id,gestor_colaborador_id,gestor,tipo_contrato&ativo=eq.true${extra}&order=nome`);
const nomeColabOp = (cs, cgs) => c => `${c.nome}${cgs.find(x => x.id === c.cargo_id) ? ' · ' + cgs.find(x => x.id === c.cargo_id).nome : ''}`;
const MEDIDAS = { orientacao: ['Orientação registrada', 1, ''], advertencia_verbal: ['Advertência verbal', 2, 'amarelo'], advertencia_escrita: ['Advertência escrita', 3, 'amarelo'],
  suspensao: ['Suspensão', 4, 'vermelho'], justa_causa: ['Justa causa', 5, 'vermelho'] };
const tagMedida = m => `<span class="tag ${MEDIDAS[m]?.[2] || ''}">${MEDIDAS[m]?.[0] || m}</span>`;
const ART482 = ['a) Ato de improbidade', 'b) Incontinência de conduta ou mau procedimento', 'c) Negociação habitual concorrente ou prejudicial', 'd) Condenação criminal sem suspensão da pena',
  'e) Desídia no desempenho das funções', 'f) Embriaguez habitual ou em serviço', 'g) Violação de segredo da empresa', 'h) Ato de indisciplina ou de insubordinação', 'i) Abandono de emprego',
  'j) Ato lesivo da honra ou ofensa física no serviço contra qualquer pessoa', 'k) Ato lesivo da honra ou ofensa física contra empregador e superiores', 'l) Prática constante de jogos de azar',
  'm) Perda da habilitação ou requisito para a profissão (ex.: CNH) por conduta dolosa', 'Art. 158: recusa de usar EPI ou cumprir norma de segurança', 'Atraso ou falta injustificada',
  'Descumprimento de procedimento (POP/IT)', 'Mau uso de veículo ou equipamento', 'Outro'];
const TIPOS_DESL = { pedido_demissao: 'Pedido de demissão', sem_justa_causa: 'Dispensa sem justa causa', justa_causa: 'Dispensa por justa causa', acordo: 'Acordo (art. 484-A)',
  termino_experiencia: 'Término do contrato de experiência', termino_contrato: 'Término de contrato por prazo determinado', aposentadoria: 'Aposentadoria', falecimento: 'Falecimento', Outro: 'Outro' };
const AVISOS = { trabalhado: 'Trabalhado', indenizado: 'Indenizado', dispensado: 'Dispensado pelo empregador', nao_se_aplica: 'Não se aplica' };
const avisoProporcional = adm => { if (!adm) return 30; const anos = Math.floor((new Date() - new Date(adm + 'T12:00:00')) / (365.25 * 864e5)); return Math.min(90, 30 + 3 * anos); };
const ABAS_RH_EXTRA = {};
const refazerExportacao = () => typeof ferramentasExportacao === 'function' && ferramentasExportacao($('#tela'));
async function modeloPorCodigo(codigo) { return api.um('modelos_documentos', `codigo=eq.${codigo}&vigente=eq.true&ativo=eq.true&select=*`); }

// ===================== Ocorrências disciplinares =====================
rota('/rh/disciplinar', async tela => {
  const sts = pLista('status', 'todas'), st = sts[0];
  const [os, cs] = await Promise.all([api.listar('ocorrencias_disciplinares', `select=*,colab:colaboradores(id,nome)${temTodos(sts) ? '' : '&status=in.(' + sts.join(',') + ')'}&order=data_aplicacao.desc`), cargosL()]);
  tela.innerHTML = `
    <div class="topo"><div><h1>Ocorrências disciplinares</h1><p class="sub">${os.length} registro(s)</p></div>${editaRH() ? '<a class="btn prim" href="#/rh/disciplinar/nova">+ Registrar ocorrência</a>' : ''}</div>
    ${avisoLei('gradacao')}
    <form class="filtros" id="filtros"><select name="status"><option value="todas">Todas</option><option value="aplicada" ${st === 'aplicada' ? 'selected' : ''}>Aplicadas</option><option value="cancelada" ${st === 'cancelada' ? 'selected' : ''}>Canceladas</option></select><button class="btn">Filtrar</button></form>
    <div class="cartao">${os.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nº</th><th>Colaborador</th><th>Medida</th><th>Fato</th><th>Aplicada</th><th>Motivo</th></tr></thead><tbody>
      ${os.map(o => `<tr class="clicavel" onclick="location.hash='#/rh/colaboradores/ver/${o.colab?.id}?aba=disciplinar'"><td data-r="Nº">${esc(o.numero || '')}</td><td data-r="Colaborador">${esc(o.colab?.nome || '')}</td>
        <td data-r="Medida">${tagMedida(o.medida)}${o.dias_suspensao ? ` ${o.dias_suspensao} dia(s)` : ''}</td><td data-r="Fato">${dataBR(o.data_fato)}</td><td data-r="Aplicada">${dataBR(o.data_aplicacao)}</td><td data-r="Motivo">${esc(o.motivo)}</td></tr>`).join('')}
    </tbody></table></div>` : '<div class="vazio">Nenhuma ocorrência.</div>'}</div>`;
  $('#filtros').onsubmit = e => { e.preventDefault(); location.hash = '#/rh/disciplinar?status=' + formDados(e.target).status; };
});

rota('/rh/disciplinar/nova', async tela => {
  if (!editaRH()) { tela.innerHTML = '<div class="cartao vazio">Sem permissão.</div>'; return; }
  const [cs, cgs] = await Promise.all([colabsRH('&status=in.(ativo,ferias,afastado,aviso_previo,em_admissao)'), cargosL()]);
  const ini = estado.params.get('colab') || '';
  tela.innerHTML = `
    <div class="topo"><div><h1>Registrar ocorrência disciplinar</h1><p class="sub">O sistema mostra o histórico e a próxima medida recomendada</p></div></div>
    ${avisoLei('gradacao', 'suspensao', 'justa_causa')}
    <form id="f-oc" class="cartao"><div class="form">
      <label class="campo largo">Colaborador *<select name="colaborador_id" required><option value="">Selecione…</option>${cs.map(c => `<option value="${c.id}" ${c.id === ini ? 'selected' : ''}>${esc(nomeColabOp(cs, cgs)(c))}</option>`).join('')}</select></label>
      <div class="largo" id="historico"></div>
      <label class="campo">Medida *<select name="medida" required>${Object.entries(MEDIDAS).map(([k, [t]]) => `<option value="${k}">${t}</option>`).join('')}</select></label>
      <label class="campo" id="c-dias" hidden>Dias de suspensão (1 a 30) *<input type="number" name="dias_suspensao" min="1" max="30"></label>
      <label class="campo" id="c-ini-susp" hidden>Início da suspensão<input type="date" name="inicio_suspensao"></label>
      <label class="campo">Data do fato *<input type="date" name="data_fato" required max="${hojeISO()}"></label>
      <label class="campo">Data em que a empresa soube *<input type="date" name="data_ciencia" required max="${hojeISO()}"></label>
      <label class="campo">Data da aplicação *<input type="date" name="data_aplicacao" required value="${hojeISO()}"></label>
      <div class="largo muted" id="aviso-imediato"></div>
      <label class="campo largo">Enquadramento *<select name="motivo" required><option value="">Selecione…</option>${ART482.map(m => `<option>${esc(m)}</option>`).join('')}</select></label>
      <label class="campo largo">Descrição objetiva do fato *<textarea name="descricao" rows="4" required placeholder="O que aconteceu, quando, onde, quem presenciou, quais provas (imagens, telemetria, registros)."></textarea></label>
      <label class="campo largo">Testemunhas (nome e CPF)<input name="testemunhas"></label>
      <label class="check largo"><input type="checkbox" name="recusou_assinar"> O colaborador se recusou a assinar (exige 2 testemunhas)</label>
      <div class="largo" id="b-pulo" hidden><div class="alerta-obs" id="msg-pulo"></div>
        <label class="campo largo">Justificativa para não seguir a gradação *<textarea name="justificativa_gradacao" rows="2"></textarea></label></div>
      <label class="check largo" id="c-jur" hidden><input type="checkbox" name="revisado_juridico"> O jurídico revisou e validou esta medida</label>
      <label class="check largo"><input type="checkbox" name="ciente_orientacao" required> Li a orientação sobre gradação e a legislação acima e confirmo que a medida é proporcional ao fato</label>
    </div><div class="acoes" style="margin-top:12px"><button class="btn prim">Registrar e gerar documento</button><a class="btn" href="javascript:history.back()">Cancelar</a></div></form>`;
  const f = $('#f-oc'); let hist = [];
  const sinc = () => {
    const m = f.medida.value, nivel = MEDIDAS[m][1];
    $('#c-dias').hidden = $('#c-ini-susp').hidden = m !== 'suspensao'; f.dias_suspensao.required = m === 'suspensao';
    $('#c-jur').hidden = m !== 'justa_causa'; f.revisado_juridico.required = m === 'justa_causa';
    const ultimo = Math.max(0, ...hist.map(o => MEDIDAS[o.medida][1]));
    const pulo = nivel > ultimo + 1 && nivel > 2;
    $('#b-pulo').hidden = !pulo; f.justificativa_gradacao.required = pulo;
    if (pulo) $('#msg-pulo').innerHTML = `⚠️ O histórico dos últimos 12 meses chega até <b>${ultimo ? MEDIDAS[Object.keys(MEDIDAS).find(k => MEDIDAS[k][1] === ultimo)][0] : 'nenhuma medida'}</b>. Aplicar <b>${MEDIDAS[m][0]}</b> pula etapas da gradação: só faça isso para falta grave e comprovada.`;
    const fd = f.data_fato.value, ci = f.data_ciencia.value, ap = f.data_aplicacao.value;
    const dias = ci && ap ? Math.round((new Date(ap) - new Date(ci)) / 864e5) : 0;
    $('#aviso-imediato').innerHTML = dias > 15 ? `<span class="erro-txt">⚠️ ${dias} dias entre a ciência e a aplicação. Demora pode ser vista como perdão tácito — registre o motivo (ex.: apuração) na descrição.</span>` : '';
  };
  const carregarHist = async () => {
    const id = f.colaborador_id.value; if (!id) { $('#historico').innerHTML = ''; hist = []; return sinc(); }
    const desde = somaDias(hojeISO(), -365);
    hist = await api.listar('ocorrencias_disciplinares', `colaborador_id=eq.${id}&status=eq.aplicada&data_aplicacao=gte.${desde}&order=data_aplicacao.desc`);
    const ultimo = Math.max(0, ...hist.map(o => MEDIDAS[o.medida][1]));
    const sugerida = Object.keys(MEDIDAS).find(k => MEDIDAS[k][1] === Math.min(4, ultimo + 1));
    $('#historico').innerHTML = `<div class="cartao" style="background:var(--fundo,#f6f8f7);margin:0"><b>Histórico dos últimos 12 meses:</b> ${hist.length ? hist.map(o => `${tagMedida(o.medida)} ${dataBR(o.data_aplicacao)} — ${esc(o.motivo)}`).join('<br>') : 'nenhuma ocorrência.'}
      <br><b>Próxima medida pela gradação:</b> ${MEDIDAS[sugerida][0]}${ultimo >= 4 ? ' (já houve suspensão: nova falta pode justificar suspensão maior ou, se grave, justa causa — consulte o jurídico)' : ''}</div>`;
    f.medida.value = sugerida; sinc();
  };
  f.colaborador_id.onchange = carregarHist; f.medida.onchange = sinc; ['data_fato', 'data_ciencia', 'data_aplicacao'].forEach(n => (f[n].onchange = sinc));
  carregarHist();
  f.onsubmit = async e => {
    e.preventDefault(); const d = formDados(f);
    const dados = { colaborador_id: d.colaborador_id, medida: d.medida, dias_suspensao: d.medida === 'suspensao' ? Number(d.dias_suspensao) : null, inicio_suspensao: d.inicio_suspensao || null,
      data_fato: d.data_fato, data_ciencia: d.data_ciencia, data_aplicacao: d.data_aplicacao, motivo: d.motivo, descricao: d.descricao, testemunhas: d.testemunhas || null,
      recusou_assinar: d.recusou_assinar, justificativa_gradacao: d.justificativa_gradacao || null, ciente_orientacao: d.ciente_orientacao, revisado_juridico: !!d.revisado_juridico };
    await ocupado(e.submitter, async () => {
      try {
        const [o] = await api.inserir('ocorrencias_disciplinares', dados);
        aviso(`Ocorrência ${o.numero} registrada.`);
        if (['advertencia_verbal', 'advertencia_escrita', 'suspensao'].includes(o.medida)) await gerarDocOcorrencia(o, hist);
        location.hash = `#/rh/colaboradores/ver/${o.colaborador_id}?aba=disciplinar`;
      } catch (err) { falha(err); }
    });
  };
});
async function gerarDocOcorrencia(o, hist = []) {
  const m = await modeloPorCodigo(o.medida === 'suspensao' ? 'RH-DIS-002' : 'RH-DIS-001');
  if (!m) return aviso('Modelo de documento não encontrado na biblioteca.', true);
  await gerarDocumento(m, o.colaborador_id, { ocorrencia: { ...o, data_fato: dataBR(o.data_fato), inicio_suspensao: dataBR(o.inicio_suspensao),
    historico: hist.length ? hist.map(h => `${MEDIDAS[h.medida][0]} em ${dataBR(h.data_aplicacao)}`).join('; ') : 'sem medidas anteriores nos últimos 12 meses' } });
}
ABAS_RH_EXTRA.disciplinar = async (box, c) => {
  const os = await api.listar('ocorrencias_disciplinares', `colaborador_id=eq.${c.id}&order=data_aplicacao.desc`);
  box.innerHTML = `<div class="topo" style="margin:0 0 8px"><h2 style="margin:0">Ocorrências disciplinares</h2>${editaRH() ? `<a class="btn prim peq" href="#/rh/disciplinar/nova?colab=${c.id}">+ Registrar</a>` : ''}</div>
    ${os.length ? `<ul class="lista-simples">${os.map(o => `<li style="flex-wrap:wrap"><span>${tagMedida(o.medida)} <b>${esc(o.numero || '')}</b> ${o.dias_suspensao ? o.dias_suspensao + ' dia(s) ' : ''}<span class="muted">fato ${dataBR(o.data_fato)} · aplicada ${dataBR(o.data_aplicacao)} · ${esc(o.motivo)}</span>
      ${o.status === 'cancelada' ? '<span class="tag">Cancelada</span>' : ''}<br><span class="muted">${esc(o.descricao)}</span></span>
      <span class="acoes"><span class="anx-oc" data-id="${o.id}"></span>${editaRH() && o.status === 'aplicada' ? `<button class="btn peq" data-doc="${o.id}">Documento</button><button class="btn peq" data-anexo="${o.id}">Anexar assinado</button><button class="btn peq perigo" data-cancel="${o.id}">Cancelar</button>` : ''}</span></li>`).join('')}</ul>` : '<div class="vazio">Nenhuma ocorrência registrada.</div>'}
    ${avisoLei('gradacao')}`;
  $$('.anx-oc', box).forEach(async el => { el.innerHTML = await htmlAnexos('ocorrencia', el.dataset.id); });
  $$('[data-doc]', box).forEach(b => b.onclick = () => gerarDocOcorrencia(os.find(o => o.id === b.dataset.doc), os.filter(o => o.id !== b.dataset.doc && o.status === 'aplicada')));
  $$('[data-anexo]', box).forEach(b => b.onclick = async () => {
    const r = await modal(`<form><h2>Anexar documento assinado</h2><label class="campo">Arquivo<input type="file" name="arquivos" accept="image/*,application/pdf" required></label>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Enviar</button></div></form>`);
    if (r) try { await anexar('ocorrencia', b.dataset.anexo, r.arquivos); aviso('Anexado.'); navegar(); } catch (err) { falha(err); } });
  $$('[data-cancel]', box).forEach(b => b.onclick = async () => {
    const motivo = await confirmar('Cancelar esta ocorrência? Ela continuará no histórico como cancelada.', { comMotivo: true, botao: 'Cancelar ocorrência' }); if (!motivo) return;
    try { await api.alterar('ocorrencias_disciplinares', `id=eq.${b.dataset.cancel}`, { status: 'cancelada', motivo_cancelamento: motivo }); navegar(); } catch (err) { falha(err); } });
};

// ===================== Desligamento =====================
rota('/rh/desligamentos', async tela => {
  const sts = pLista('status', 'todos'), st = sts[0];
  const ds = await api.listar('desligamentos', `select=*,colab:colaboradores(id,nome),etapas:desligamento_etapas(status)&${temTodos(sts) ? 'status=neq.x' : 'status=in.(' + sts.join(',') + ')'}&order=data_desligamento`);
  tela.innerHTML = `
    <div class="topo"><div><h1>Desligamentos</h1><p class="sub">${ds.length} processo(s)</p></div></div>
    <form class="filtros" id="filtros"><select name="status">${[['em_andamento', 'Em andamento'], ['concluido', 'Concluídos'], ['cancelado', 'Cancelados'], ['todos', 'Todos']].map(([v, t]) => `<option value="${v}" ${v === st ? 'selected' : ''}>${t}</option>`).join('')}</select><button class="btn">Filtrar</button></form>
    <div class="cartao">${ds.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nº</th><th>Colaborador</th><th>Tipo</th><th>Último dia</th><th>Pagar até</th><th>Etapas</th></tr></thead><tbody>
      ${ds.map(d => { const et = d.etapas || []; return `<tr class="clicavel" onclick="location.hash='#/rh/colaboradores/ver/${d.colab?.id}?aba=desligamento'"><td data-r="Nº">${esc(d.numero || '')}</td><td data-r="Colaborador">${esc(d.colab?.nome || '')}</td>
        <td data-r="Tipo">${esc(TIPOS_DESL[d.tipo] || d.tipo)}</td><td data-r="Último dia">${dataBR(d.data_desligamento)}</td>
        <td data-r="Pagar até">${dataBR(d.prazo_pagamento)}${d.status === 'em_andamento' && d.prazo_pagamento && d.prazo_pagamento <= somaDias(hojeISO(), 3) ? ' <span class="tag vermelho">urgente</span>' : ''}</td>
        <td data-r="Etapas">${et.filter(x => x.status !== 'pendente').length}/${et.length}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="vazio">Nenhum desligamento.</div>'}</div>
    <p class="muted">Para iniciar um desligamento, abra a ficha do colaborador → aba Desligamento.</p>`;
  $('#filtros').onsubmit = e => { e.preventDefault(); location.hash = '#/rh/desligamentos?status=' + formDados(e.target).status; };
});
ABAS_RH_EXTRA.desligamento = async (box, c) => {
  const pode = editaRH();
  const ds = await api.listar('desligamentos', `colaborador_id=eq.${c.id}&order=criado_em.desc`);
  const d = ds.find(x => x.status === 'em_andamento');
  if (!d) {
    const ativoCol = !['desligado', 'candidato'].includes(c.status);
    box.innerHTML = `<h2>Desligamento</h2>${ds.map(x => `<p>${esc(x.numero || '')} · ${esc(TIPOS_DESL[x.tipo] || x.tipo)} · ${dataBR(x.data_desligamento)} · ${x.status === 'concluido' ? 'concluído' : 'cancelado'}${x.elegivel_recontratacao === false ? ' · <span class="tag vermelho">não recontratar</span>' : ''}</p>`).join('')}
      ${pode && ativoCol ? `${avisoLei('desligamento')}<form class="form" id="f-desl" style="margin-top:10px">
        <label class="campo">Tipo *<select name="tipo" required>${Object.entries(TIPOS_DESL).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></label>
        <label class="campo">Aviso prévio *<select name="aviso" required>${Object.entries(AVISOS).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></label>
        <label class="campo">Data do aviso / comunicação<input type="date" name="data_aviso" value="${hojeISO()}"></label>
        <label class="campo">Último dia (término) *<input type="date" name="data" required></label>
        <div class="largo muted" id="calc-aviso">Aviso prévio proporcional deste colaborador: <b>${avisoProporcional(c.data_admissao)} dias</b> (admitido em ${dataBR(c.data_admissao) || '—'}).</div>
        <label class="campo largo">Motivo<input name="motivo"></label>
        <label class="check largo"><input type="checkbox" name="estab" required> Verifiquei que o colaborador não tem estabilidade (gestante, acidente, CIPA, sindical, convenção) ou o jurídico autorizou</label>
        <div class="largo"><button class="btn perigo">Iniciar desligamento</button></div></form>` : (ativoCol ? '' : '<p class="muted">Colaborador não está ativo.</p>')}`;
    const f = $('#f-desl', box);
    if (f) {
      const calc = () => { if (f.aviso.value === 'trabalhado' && f.data_aviso.value) f.data.value = somaDias(f.data_aviso.value, avisoProporcional(c.data_admissao) - 1);
        else if (f.data_aviso.value && !f.data.value) f.data.value = f.data_aviso.value; };
      f.aviso.onchange = calc; f.data_aviso.onchange = calc;
      f.tipo.onchange = () => { if (f.tipo.value === 'justa_causa') aviso('Justa causa: confirme provas e validação do jurídico antes de comunicar o colaborador.', true); };
      f.onsubmit = async e => { e.preventDefault(); const x = formDados(f);
        try { await api.rpc('iniciar_desligamento', { p_colaborador: c.id, p_tipo: x.tipo, p_aviso: x.aviso, p_data_aviso: x.data_aviso || null, p_data: x.data, p_motivo: x.motivo || null });
          aviso('Desligamento iniciado. Siga as etapas.'); navegar(); } catch (err) { falha(err); } };
    }
    return;
  }
  const etapas = await api.listar('desligamento_etapas', `desligamento_id=eq.${d.id}&order=ordem`);
  const feitas = etapas.filter(x => x.status !== 'pendente').length, pct = Math.round(feitas / etapas.length * 100);
  const dias = Math.round((new Date(d.prazo_pagamento + 'T12:00:00') - new Date(hojeISO() + 'T12:00:00')) / 864e5);
  box.innerHTML = `<div class="topo" style="margin:0 0 8px"><div><h2 style="margin:0">Desligamento ${esc(d.numero || '')} · ${esc(TIPOS_DESL[d.tipo] || d.tipo)}</h2>
      <div class="muted">Aviso ${esc(AVISOS[d.aviso_previo] || d.aviso_previo)} · último dia ${dataBR(d.data_desligamento)} · ${pct}% concluído</div></div>
      ${pode ? '<div class="acoes"><button class="btn ok" id="concluir-d">Concluir</button><button class="btn perigo" id="cancelar-d">Cancelar</button></div>' : ''}</div>
    <div class="progresso"><div style="width:${pct}%"></div></div>
    <div class="${dias <= 3 ? 'alerta-obs' : 'muted'}" style="margin:8px 0">💰 Verbas rescisórias e documentos até <b>${dataBR(d.prazo_pagamento)}</b> (${dias >= 0 ? `faltam ${dias} dia(s)` : `<b>atrasado ${-dias} dia(s)</b> — multa do art. 477 §8º`}).</div>
    <div class="acoes" style="margin-bottom:8px">${pode ? `${d.tipo === 'pedido_demissao' ? '<button class="btn peq" data-enc="RH-DES-002">Pedido de demissão</button>' : ''}${['sem_justa_causa', 'acordo'].includes(d.tipo) ? '<button class="btn peq" data-enc="RH-DES-001">Aviso prévio</button>' : ''}
      <button class="btn peq" data-enc="RH-DES-003">Termo de devolução</button><button class="btn peq" data-enc="RH-FOR-001">Encaminhamento ASO demissional</button><button class="btn peq" id="entrevista">Entrevista de desligamento</button>` : ''}</div>
    <ul class="lista-simples">${etapas.map(x => `<li style="flex-wrap:wrap"><span>${x.status === 'feito' ? '✅' : x.status === 'nao_se_aplica' ? '➖' : '⏳'} <b>${esc(x.etapa)}</b> <span class="muted">${esc(x.setor)}${x.data ? ' · ' + dataBR(x.data) : ''}${x.observacao ? ' · ' + esc(x.observacao) : ''}</span></span>
      ${pode ? `<select data-etapa="${x.id}" aria-label="Situação">${['pendente', 'feito', 'nao_se_aplica'].map(s => `<option value="${s}" ${x.status === s ? 'selected' : ''}>${{ pendente: 'Pendente', feito: 'Feito', nao_se_aplica: 'Não se aplica' }[s]}</option>`).join('')}</select>` : ''}</li>`).join('')}</ul>
    <div id="posse-desl"></div>
    ${avisoLei('desligamento')}`;
  api.listar('patrimonios', `responsavel_id=eq.${c.id}&ativo=eq.true&order=tag`).then(ps => { if (!ps.length) return;
    $('#posse-desl', box).innerHTML = `<div class="alerta-obs" style="margin:8px 0">📦 <b>Bens com o colaborador (devolver antes do último dia):</b> ${ps.map(p => `<a href="#/patrimonio/ver/${p.id}">${esc(p.tag)} · ${esc(p.descricao)}</a>`).join(' · ')}</div>`; }).catch(() => {});
  $$('[data-etapa]', box).forEach(s => s.onchange = async () => {
    let obs = null; if (s.value === 'nao_se_aplica') { obs = await confirmar('Por que esta etapa não se aplica?', { comMotivo: true }); if (!obs) { s.value = 'pendente'; return; } }
    try { await api.alterar('desligamento_etapas', `id=eq.${s.dataset.etapa}`, { status: s.value, data: s.value === 'pendente' ? null : hojeISO(), feito_por: estado.usuario.id, ...(obs ? { observacao: obs } : {}) }); navegar(); } catch (err) { falha(err); } });
  $$('[data-enc]', box).forEach(b => b.onclick = async () => { const m = await modeloPorCodigo(b.dataset.enc); if (!m) return aviso('Modelo não encontrado.', true);
    await gerarDocumento(m, c.id, { desligamento: { ...d, data_aviso: dataBR(d.data_aviso), data_desligamento: dataBR(d.data_desligamento), prazo_pagamento: dataBR(d.prazo_pagamento), aviso_previo: (AVISOS[d.aviso_previo] || '').toLowerCase() } }); });
  $('#entrevista', box)?.addEventListener('click', async () => {
    const e0 = d.entrevista || {};
    const perg = ['Principal motivo da saída', 'O que a empresa faz bem', 'O que precisa melhorar', 'Relação com a liderança', 'Recomendaria a empresa a um amigo? Por quê?', 'Comentários finais'];
    const r = await modal(`<form><h2>Entrevista de desligamento</h2><p class="muted">Conduza em local reservado. As respostas ajudam a reduzir a rotatividade.</p><div class="form">
      ${perg.map((p, i) => `<label class="campo largo">${p}<textarea name="p${i}" rows="2">${esc(e0[p] || '')}</textarea></label>`).join('')}</div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`);
    if (!r) return;
    try { await api.alterar('desligamentos', `id=eq.${d.id}`, { entrevista: Object.fromEntries(perg.map((p, i) => [p, r['p' + i]])) }); aviso('Entrevista salva.'); } catch (err) { falha(err); } });
  $('#concluir-d', box)?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Concluir desligamento</h2><p>O colaborador passa para <b>Desligado</b> e o acesso ao sistema é bloqueado.</p>
      <label class="check"><input type="checkbox" name="recontratar" checked> Elegível para recontratação</label>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Concluir</button></div></form>`);
    if (!r) return;
    try { await api.rpc('concluir_desligamento', { p_id: d.id, p_recontratar: !!r.recontratar }); aviso('Desligamento concluído.'); navegar(); } catch (err) { falha(err); } });
  $('#cancelar-d', box)?.addEventListener('click', async () => {
    const motivo = await confirmar('Cancelar este desligamento? O colaborador volta para Ativo.', { comMotivo: true, botao: 'Cancelar desligamento' }); if (!motivo) return;
    try { await api.alterar('desligamentos', `id=eq.${d.id}`, { status: 'cancelado', observacoes: motivo }); await api.alterar('colaboradores', `id=eq.${c.id}`, { status: 'ativo' }); navegar(); } catch (err) { falha(err); } });
};

// ===================== Treinamentos e matriz de capacitação =====================
const SIT_TREIN = { pendente: ['Pendente', 'amarelo', '⏳'], vencido: ['Vencido', 'vermelho', '❌'], vence_30: ['Vence em 30 dias', 'amarelo', '⚠️'], em_dia: ['Em dia', 'verde', '✅'] };
rota('/rh/treinamentos', async tela => {
  const aba = estado.params.get('aba') || 'matriz';
  const abas = [['matriz', 'Matriz de capacitação'], ['turmas', 'Turmas realizadas'], ['catalogo', 'Catálogo e obrigatoriedade']];
  tela.innerHTML = `<div class="topo"><div><h1>Treinamentos</h1><p class="sub">Quem precisa de qual treinamento, quem já fez e o que vence</p></div>
      ${editaRH() ? '<div class="acoes"><button class="btn prim" id="nova-turma">+ Registrar turma</button></div>' : ''}</div>
    <div class="abas">${abas.map(([k, t]) => `<a href="#/rh/treinamentos?aba=${k}" class="${k === aba ? 'ativa' : ''}">${t}</a>`).join('')}</div><div id="conteudo-t"></div>`;
  const box = $('#conteudo-t');
  const ts = await api.listar('treinamentos', 'order=nome');
  $('#nova-turma')?.addEventListener('click', () => formTurma(ts));
  if (aba === 'matriz') {
    const mz = await api.listar('v_matriz_treinamentos', 'order=nome,treinamento');
    const filtro = estado.params.get('sit') || '';
    const pessoas = [...new Map(mz.map(x => [x.colaborador_id, x])).values()];
    const tsUsados = [...new Map(mz.map(x => [x.treinamento_id, x.treinamento])).entries()];
    const cont = Object.fromEntries(Object.keys(SIT_TREIN).map(k => [k, mz.filter(x => x.situacao === k).length]));
    box.innerHTML = `<div class="grade" style="margin-bottom:12px">${Object.entries(SIT_TREIN).map(([k, [t, cor]]) => `<a class="cartao kpi ${k !== 'em_dia' && cont[k] ? 'alerta' : ''}" href="#/rh/treinamentos?aba=matriz&sit=${k}"><div class="n">${cont[k]}</div><div class="r">${t}</div></a>`).join('')}</div>
      ${filtro ? `<div class="cartao"><h2>${SIT_TREIN[filtro][0]} <a class="btn peq" href="#/rh/treinamentos?aba=matriz">ver matriz</a></h2><div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Colaborador</th><th>Cargo</th><th>Treinamento</th><th>Realizado</th><th>Vencimento</th></tr></thead><tbody>
        ${mz.filter(x => x.situacao === filtro).map(x => `<tr><td data-r="Colaborador">${esc(x.nome)}</td><td data-r="Cargo">${esc(x.cargo || '')}</td><td data-r="Treinamento">${esc(x.treinamento)}</td><td data-r="Realizado">${dataBR(x.realizado) || '—'}</td><td data-r="Vencimento">${dataBR(x.vencimento) || '—'}</td></tr>`).join('')}</tbody></table></div></div>`
      : `<div class="cartao">${pessoas.length ? `<div class="tabela-wrap"><table class="matriz"><thead><tr><th>Colaborador</th>${tsUsados.map(([, n]) => `<th class="girado"><span>${esc(n)}</span></th>`).join('')}</tr></thead><tbody>
        ${pessoas.map(p => `<tr><td><a href="#/rh/colaboradores/ver/${p.colaborador_id}?aba=treinamentos">${esc(p.nome)}</a><div class="muted">${esc(p.cargo || '')}</div></td>${tsUsados.map(([tid]) => { const x = mz.find(y => y.colaborador_id === p.colaborador_id && y.treinamento_id === tid);
          return `<td class="c-${x ? x.situacao : 'na'}" title="${x ? SIT_TREIN[x.situacao][0] + (x.vencimento ? ' · vence ' + dataBR(x.vencimento) : '') : 'Não exigido'}">${x ? SIT_TREIN[x.situacao][2] : '·'}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>
        <p class="muted">✅ em dia · ⚠️ vence em 30 dias · ❌ vencido · ⏳ pendente · · não exigido para o cargo</p>` : '<div class="vazio">Nenhum colaborador com treinamento obrigatório. Defina a obrigatoriedade por cargo no catálogo.</div>'}</div>`}
      ${avisoLei('treinamentos')}`;
  } else if (aba === 'turmas') {
    const tt = await api.listar('treinamento_turmas', 'select=*,treinamento:treinamentos(nome),participantes:treinamento_participantes(id)&ativo=eq.true&order=data.desc&limit=200');
    box.innerHTML = `<div class="cartao">${tt.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nº</th><th>Data</th><th>Treinamento</th><th>Instrutor</th><th>Participantes</th><th>Custo</th></tr></thead><tbody>
      ${tt.map(t => `<tr class="clicavel" data-turma="${t.id}"><td data-r="Nº">${esc(t.numero || '')}</td><td data-r="Data">${dataBR(t.data)}</td><td data-r="Treinamento">${esc(t.treinamento?.nome || '')}</td>
        <td data-r="Instrutor">${esc([t.instrutor, t.instituicao].filter(Boolean).join(' · '))}</td><td data-r="Participantes">${(t.participantes || []).length}</td><td data-r="Custo">${t.custo != null ? brl(t.custo) : '—'}</td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Nenhuma turma registrada.</div>'}</div>`;
    $$('[data-turma]', box).forEach(tr => tr.onclick = () => verTurma(tt.find(t => t.id === tr.dataset.turma), ts));
  } else {
    const [cgs, tcTodos] = await Promise.all([cargosL(), api.listar('treinamento_cargos', 'select=*')]);
    const tc = tcTodos.filter(x => x.ativo);
    box.innerHTML = `<div class="cartao"><div class="topo" style="margin:0 0 8px"><h2 style="margin:0">Catálogo</h2>${editaRH() ? '<button class="btn prim peq" id="novo-trein">+ Treinamento</button>' : ''}</div>
      <div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Treinamento</th><th>Tipo / norma</th><th>Carga</th><th>Validade</th><th>Obrigatório para</th></tr></thead><tbody>
      ${ts.filter(t => t.ativo).map(t => `<tr class="${editaRH() ? 'clicavel' : ''}" data-trein="${t.id}"><td data-r="Treinamento"><b>${esc(t.nome)}</b></td><td data-r="Tipo">${esc([t.tipo, t.norma].filter(Boolean).join(' · '))}</td>
        <td data-r="Carga">${t.carga_horaria ? t.carga_horaria + ' h' : '—'}</td><td data-r="Validade">${t.validade_meses ? t.validade_meses + ' meses' : 'Sem vencimento'}</td>
        <td data-r="Cargos">${esc(tc.filter(x => x.treinamento_id === t.id).map(x => cgs.find(c => c.id === x.cargo_id)?.nome).filter(Boolean).join(', ') || '—')}</td></tr>`).join('')}</tbody></table></div></div>`;
    const editar = async t => {
      const marcados = tc.filter(x => x.treinamento_id === t?.id).map(x => x.cargo_id);
      const r = await modal(`<form><h2>${t ? 'Editar' : 'Novo'} treinamento</h2><div class="form">
        <label class="campo largo">Nome *<input name="nome" required value="${esc(t?.nome || '')}"></label>
        <label class="campo">Tipo<select name="tipo" data-valor="${esc(t?.tipo || '')}">${['NR', 'Legal', 'Interno', 'Externo', 'Reciclagem', 'Outro'].map(x => `<option ${x === t?.tipo ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <label class="campo">Norma / referência<input name="norma" value="${esc(t?.norma || '')}" placeholder="Ex.: NR-35"></label>
        <label class="campo">Carga horária (h)<input name="carga_horaria" inputmode="decimal" value="${t?.carga_horaria ?? ''}"></label>
        <label class="campo">Validade (meses, vazio = não vence)<input type="number" name="validade_meses" value="${t?.validade_meses ?? ''}"></label>
        <label class="campo largo">Conteúdo programático<textarea name="conteudo" rows="3">${esc(t?.conteudo || '')}</textarea></label>
        <div class="largo"><div class="muted" style="margin-bottom:4px">Obrigatório para os cargos</div><div class="chips">${cgs.filter(c => c.ativo).map(c => `<label class="chip"><input type="checkbox" name="cg_${c.id}" ${marcados.includes(c.id) ? 'checked' : ''}> ${esc(c.nome)}</label>`).join('')}</div></div></div>
        <div class="rodape">${t ? '<button class="btn perigo" value="desativar">Desativar</button>' : ''}<button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim" value="salvar">Salvar</button></div></form>`);
      if (!r) return;
      try {
        if (r._acao === 'desativar') { await api.alterar('treinamentos', `id=eq.${t.id}`, { ativo: false }); return navegar(); }
        const dados = { nome: r.nome, tipo: r.tipo, norma: r.norma || null, carga_horaria: num(r.carga_horaria), validade_meses: r.validade_meses ? Number(r.validade_meses) : null, conteudo: r.conteudo || null };
        let id = t?.id; if (t) await api.alterar('treinamentos', `id=eq.${id}`, dados); else [{ id }] = await api.inserir('treinamentos', dados);
        const todosCg = [...new Set([...cgs.map(c => c.id), ...Object.keys(r).filter(k => k.startsWith('cg_')).map(k => k.slice(3))])].map(id => ({ id }));
        for (const c of todosCg) {
          const quer = !!r['cg_' + c.id], tem_ = tcTodos.find(x => x.treinamento_id === id && x.cargo_id === c.id);
          if (quer && !tem_) await api.inserir('treinamento_cargos', { treinamento_id: id, cargo_id: c.id });
          else if (tem_ && tem_.ativo !== quer) await api.alterar('treinamento_cargos', `id=eq.${tem_.id}`, { ativo: quer });
        }
        aviso('Treinamento salvo.'); navegar();
      } catch (err) { falha(err); }
    };
    $('#novo-trein')?.addEventListener('click', () => editar(null));
    if (editaRH()) $$('[data-trein]', box).forEach(tr => tr.onclick = () => editar(ts.find(t => t.id === tr.dataset.trein)));
  }
  refazerExportacao();
});
async function formTurma(ts, treinamentoIni = '', colabIni = '') {
  const [cs, cgs] = await Promise.all([colabsRH('&status=in.(ativo,ferias,afastado,aviso_previo,em_admissao)'), cargosL()]);
  const r = await modal(`<form><h2>Registrar turma de treinamento</h2><div class="form">
    <label class="campo largo">Treinamento *<select name="treinamento_id" required>${ts.filter(t => t.ativo).map(t => `<option value="${t.id}" ${t.id === treinamentoIni ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}</select></label>
    <label class="campo">Data *<input type="date" name="data" required value="${hojeISO()}"></label><label class="campo">Término<input type="date" name="data_fim"></label>
    <label class="campo">Instrutor<input name="instrutor"></label><label class="campo">Instituição<input name="instituicao"></label>
    <label class="campo">Local<input name="local"></label><label class="campo">Carga horária (h)<input name="carga_horaria" inputmode="decimal"></label>
    <label class="campo">Custo (R$)<input name="custo" inputmode="decimal"></label>
    <div class="largo"><div class="muted" style="margin-bottom:4px">Participantes (presentes e aprovados)</div><input id="busca-part" placeholder="Filtrar por nome" style="margin-bottom:6px;width:100%">
      <div class="chips" id="lista-part" style="max-height:220px;overflow:auto">${cs.map(c => `<label class="chip" data-nome="${esc(c.nome.toLowerCase())}"><input type="checkbox" name="p_${c.id}" ${c.id === colabIni ? 'checked' : ''}> ${esc(nomeColabOp(cs, cgs)(c))}</label>`).join('')}</div></div>
    <label class="campo largo">Certificados / lista de presença assinada<input type="file" name="arquivos" multiple accept="image/*,application/pdf"></label></div>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`,
    { aoAbrir: raiz => { const b = $('#busca-part', raiz); b.oninput = () => $$('#lista-part label', raiz).forEach(l => (l.hidden = !l.dataset.nome.includes(b.value.toLowerCase()))); } });
  if (!r) return;
  const parts = cs.filter(c => r['p_' + c.id]);
  if (!parts.length) return aviso('Marque pelo menos um participante.', true);
  try {
    const [t] = await api.inserir('treinamento_turmas', { treinamento_id: r.treinamento_id, data: r.data, data_fim: r.data_fim || null, instrutor: r.instrutor || null, instituicao: r.instituicao || null,
      local: r.local || null, carga_horaria: num(r.carga_horaria), custo: num(r.custo) });
    await api.inserir('treinamento_participantes', parts.map(c => ({ turma_id: t.id, colaborador_id: c.id })));
    if (r.arquivos.length) await anexar('treinamento_turma', t.id, r.arquivos);
    aviso(`Turma ${t.numero} registrada com ${parts.length} participante(s).`); navegar();
  } catch (err) { falha(err); }
}
async function verTurma(t, ts) {
  const ps = await api.listar('treinamento_participantes', `turma_id=eq.${t.id}&ativo=eq.true&select=*,colab:colaboradores(nome,cpf)`);
  const anexos = await htmlAnexos('treinamento_turma', t.id);
  const r = await modal(`<form><h2>${esc(t.treinamento?.nome || '')} · ${esc(t.numero || '')}</h2>
    <p class="muted">${dataBR(t.data)}${t.data_fim ? ' a ' + dataBR(t.data_fim) : ''} · ${esc([t.instrutor, t.instituicao, t.local].filter(Boolean).join(' · '))}</p>
    <ul class="lista-simples">${ps.map(p => `<li><span>${esc(p.colab?.nome || '')}</span><span class="muted">${p.vencimento ? 'vence ' + dataBR(p.vencimento) : 'sem vencimento'}</span>
      ${editaRH() ? `<label class="check"><input type="checkbox" name="ap_${p.id}" ${p.aprovado && p.presente ? 'checked' : ''}> presente/aprovado</label>` : ''}</li>`).join('')}</ul>
    <div>${anexos}</div>
    <div class="rodape"><button type="button" class="btn" value="lista">Lista de presença</button><button type="button" class="btn" data-fechar>Fechar</button>${editaRH() ? '<button class="btn prim" value="salvar">Salvar</button>' : ''}</div></form>`,
    { aoAbrir: (raiz, fechar) => { $('[value=lista]', raiz).onclick = async () => { fechar(); const m = await modeloPorCodigo('RH-TRE-001'); if (!m) return;
      const tr = ts.find(x => x.id === t.treinamento_id) || {};
      await gerarDocumento(m, null, { turma: { ...t, data: dataBR(t.data), treinamento: tr.nome, conteudo: tr.conteudo || '', carga_horaria: t.carga_horaria || tr.carga_horaria || '',
        tabela_participantes: `<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%"><tr><th>#</th><th>Nome</th><th>CPF</th><th>Assinatura</th></tr>${ps.map((p, i) => `<tr><td>${i + 1}</td><td>${esc(p.colab?.nome || '')}</td><td>${esc(fmtCPF(p.colab?.cpf || ''))}</td><td style="width:40%"></td></tr>`).join('')}</table>` } }); }; } });
  if (!r || r._acao !== 'salvar') return;
  try { for (const p of ps) { const ok = !!r['ap_' + p.id]; if (ok !== (p.aprovado && p.presente)) await api.alterar('treinamento_participantes', `id=eq.${p.id}`, { aprovado: ok, presente: ok }); } aviso('Atualizado.'); navegar(); }
  catch (err) { falha(err); }
}
ABAS_RH_EXTRA.treinamentos = async (box, c) => {
  const [mz, hist, ts] = await Promise.all([api.listar('v_matriz_treinamentos', `colaborador_id=eq.${c.id}&order=treinamento`),
    api.listar('treinamento_participantes', `colaborador_id=eq.${c.id}&ativo=eq.true&select=*,turma:treinamento_turmas(numero,data,treinamento:treinamentos(nome))&order=criado_em.desc`),
    api.listar('treinamentos', 'ativo=eq.true&order=nome')]);
  box.innerHTML = `<div class="topo" style="margin:0 0 8px"><h2 style="margin:0">Treinamentos</h2>${editaRH() ? '<button class="btn prim peq" id="reg-t">+ Registrar treinamento</button>' : ''}</div>
    <h3>Obrigatórios do cargo</h3>${mz.length ? `<ul class="lista-simples">${mz.map(x => `<li><span>${SIT_TREIN[x.situacao][2]} <b>${esc(x.treinamento)}</b></span><span class="muted">${x.realizado ? 'feito ' + dataBR(x.realizado) : ''}${x.vencimento ? ' · vence ' + dataBR(x.vencimento) : ''}</span> <span class="tag ${SIT_TREIN[x.situacao][1]}">${SIT_TREIN[x.situacao][0]}</span></li>`).join('')}</ul>` : '<p class="muted">Nenhum treinamento obrigatório definido para o cargo.</p>'}
    <h3>Histórico</h3>${hist.length ? `<ul class="lista-simples">${hist.map(p => `<li><span>${esc(p.turma?.treinamento?.nome || '')} <span class="muted">${esc(p.turma?.numero || '')}</span></span><span class="muted">${dataBR(p.turma?.data)}${p.aprovado ? '' : ' · não aprovado'}</span></li>`).join('')}</ul>` : '<p class="muted">Nenhum treinamento registrado.</p>'}`;
  $('#reg-t', box)?.addEventListener('click', () => formTurma(ts, '', c.id));
};

// ===================== Avaliações =====================
const TIPOS_AVAL = { experiencia_1: 'Experiência — 1º período', experiencia_2: 'Experiência — 2º período', desempenho: 'Desempenho', feedback: 'Feedback registrado' };
const RESULT_EXP = { efetivar: 'Efetivar (segue por prazo indeterminado)', prorrogar: 'Prorrogar para o 2º período', encerrar: 'Encerrar o contrato ao fim do período' };
rota('/rh/avaliacoes', async tela => {
  const [avs, cs, cgs] = await Promise.all([api.listar('avaliacoes', 'select=*,colab:colaboradores(id,nome),avaliador:usuarios(nome)&status=neq.cancelada&order=data.desc&limit=300'),
    colabsRH('&status=in.(ativo,ferias,afastado,aviso_previo)'), cargosL()]);
  const lim = somaDias(hojeISO(), 20);
  const pendExp = cs.filter(c => ['clt', 'experiencia'].includes(c.tipo_contrato)).flatMap(c => [['experiencia_1', c.experiencia_fim1], ['experiencia_2', c.experiencia_fim2]]
    .filter(([t, d]) => d && d >= hojeISO() && d <= lim && !avs.some(a => a.colaborador_id === c.id && a.tipo === t)).map(([t, d]) => ({ c, t, d })));
  tela.innerHTML = `
    <div class="topo"><div><h1>Avaliações</h1><p class="sub">Experiência, desempenho e feedbacks registrados</p></div>${editaRH() || tem('aprovador') ? '<button class="btn prim" id="nova-av">+ Nova avaliação</button>' : ''}</div>
    ${pendExp.length ? `<div class="cartao alerta-obs"><b>Avaliações de experiência a fazer (próximos 20 dias):</b><ul class="lista-simples">${pendExp.map(x => `<li><span><b>${esc(x.c.nome)}</b> · ${TIPOS_AVAL[x.t]}</span><span>prazo ${dataBR(x.d)} <button class="btn peq prim" data-av="${x.c.id}" data-tipo="${x.t}">Avaliar</button></span></li>`).join('')}</ul></div>` : ''}
    <div class="cartao">${avs.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Data</th><th>Colaborador</th><th>Tipo</th><th>Média</th><th>Resultado</th><th>Avaliador</th></tr></thead><tbody>
      ${avs.map(a => `<tr class="clicavel" data-ver="${a.id}"><td data-r="Data">${dataBR(a.data)}</td><td data-r="Colaborador">${esc(a.colab?.nome || '')}</td><td data-r="Tipo">${TIPOS_AVAL[a.tipo] || a.tipo}</td>
        <td data-r="Média">${a.media != null ? Number(a.media).toFixed(1).replace('.', ',') : '—'}</td><td data-r="Resultado">${esc(RESULT_EXP[a.resultado]?.split(' (')[0] || a.resultado || '—')}</td><td data-r="Avaliador">${esc(a.avaliador?.nome || '')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Nenhuma avaliação registrada.</div>'}</div>
    ${avisoLei('avaliacao', 'experiencia')}`;
  $('#nova-av')?.addEventListener('click', () => formAvaliacao(cs, cgs));
  $$('[data-av]', tela).forEach(b => b.onclick = () => formAvaliacao(cs, cgs, b.dataset.av, b.dataset.tipo));
  $$('[data-ver]', tela).forEach(tr => tr.onclick = () => verAvaliacao(avs.find(a => a.id === tr.dataset.ver)));
});
async function formAvaliacao(cs, cgs, colabIni = '', tipoIni = 'desempenho') {
  const crit = await api.listar('criterios_avaliacao', 'ativo=eq.true&order=ordem');
  const r = await modal(`<form><h2>Nova avaliação</h2><div class="form">
    <label class="campo largo">Colaborador *<select name="colaborador_id" required><option value="">Selecione…</option>${cs.map(c => `<option value="${c.id}" ${c.id === colabIni ? 'selected' : ''}>${esc(nomeColabOp(cs, cgs)(c))}</option>`).join('')}</select></label>
    <label class="campo">Tipo *<select name="tipo">${Object.entries(TIPOS_AVAL).map(([k, t]) => `<option value="${k}" ${k === tipoIni ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <label class="campo">Período avaliado<input name="periodo" placeholder="Ex.: 2º semestre 2026"></label>
    <div class="largo" id="criterios"></div>
    <label class="campo largo" id="c-res">Resultado da experiência<select name="resultado"><option value="">Selecione…</option>${Object.entries(RESULT_EXP).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></label>
    <label class="campo largo">Pontos fortes<textarea name="pontos_fortes" rows="2"></textarea></label>
    <label class="campo largo">Pontos a desenvolver<textarea name="a_desenvolver" rows="2"></textarea></label>
    <label class="campo largo">Plano de ação (o quê, quem, até quando)<textarea name="plano_acao" rows="2"></textarea></label>
    <label class="check largo"><input type="checkbox" name="ciencia_colaborador"> O colaborador recebeu o feedback e tomou ciência</label></div>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`,
    { aoAbrir: raiz => { const f = $('form', raiz);
      const desenhar = () => { const c = cs.find(x => x.id === f.colaborador_id.value), mot = cgs.find(x => x.id === c?.cargo_id)?.motorista;
        const lista = crit.filter(k => k.aplica_a === 'todos' || (k.aplica_a === 'motoristas' && mot) || k.aplica_a === 'lideranca');
        $('#criterios', raiz).innerHTML = `<div class="muted" style="margin-bottom:4px">Notas: 1 = muito abaixo · 2 = abaixo · 3 = atende · 4 = acima · 5 = excepcional</div><table class="tabela-notas">${lista.map((k, i) => `<tr><td><input type="hidden" name="cn_${i}" value="${esc(k.nome)}"><b>${esc(k.nome)}</b>${k.aplica_a === 'lideranca' ? ' <span class="muted">(só lideranças)</span>' : ''}<div class="muted">${esc(k.descricao || '')}</div></td>
          <td class="nowrap">${[1, 2, 3, 4, 5].map(n => `<label class="nota"><input type="radio" name="n_${i}" value="${n}"><span>${n}</span></label>`).join('')}</td></tr>`).join('')}</table>`;
      };
      const tipo = () => { $('#c-res', raiz).hidden = !f.tipo.value.startsWith('experiencia'); };
      f.colaborador_id.onchange = desenhar; f.tipo.onchange = tipo; desenhar(); tipo(); },
      validar: d => !d.colaborador_id ? 'Escolha o colaborador.' : null });
  if (!r) return;
  try {
    await api.inserir('avaliacoes', { colaborador_id: r.colaborador_id, tipo: r.tipo, periodo: r.periodo || null, resultado: r.tipo.startsWith('experiencia') ? r.resultado || null : null,
      notas: Object.keys(r).filter(k => /^n_\d+$/.test(k) && r[k]).map(k => ({ criterio: r['c' + k], nota: Number(r[k]) })),
      pontos_fortes: r.pontos_fortes || null, a_desenvolver: r.a_desenvolver || null, plano_acao: r.plano_acao || null, ciencia_colaborador: r.ciencia_colaborador });
    if (r.resultado === 'encerrar') aviso('Avaliação salva. Para encerrar o contrato, inicie o desligamento (Término do contrato de experiência) antes do fim do período.', true);
    else aviso('Avaliação salva.');
    navegar();
  } catch (err) { falha(err); }
}
async function verAvaliacao(a) {
  await modal(`<div><h2>${TIPOS_AVAL[a.tipo]} · ${esc(a.colab?.nome || '')}</h2><p class="muted">${dataBR(a.data)} · avaliador ${esc(a.avaliador?.nome || '')} · média ${a.media ?? '—'}</p>
    <ul class="lista-simples">${(a.notas || []).map(n => `<li><span>${esc(n.criterio || '')}</span><b>${n.nota}</b></li>`).join('')}</ul>
    ${a.resultado ? `<p><b>Resultado:</b> ${esc(RESULT_EXP[a.resultado] || a.resultado)}</p>` : ''}
    ${[['Pontos fortes', a.pontos_fortes], ['A desenvolver', a.a_desenvolver], ['Plano de ação', a.plano_acao]].filter(x => x[1]).map(([t, v]) => `<p><b>${t}:</b> ${esc(v)}</p>`).join('')}
    <p class="muted">${a.ciencia_colaborador ? 'Colaborador ciente.' : 'Colaborador ainda não deu ciência.'}</p>
    <div class="rodape"><button type="button" class="btn" onclick="window.print()">Imprimir</button><button type="button" class="btn prim" data-fechar>Fechar</button></div></div>`);
}
ABAS_RH_EXTRA.avaliacoes = async (box, c) => {
  const avs = await api.listar('avaliacoes', `colaborador_id=eq.${c.id}&status=neq.cancelada&select=*,avaliador:usuarios(nome)&order=data.desc`);
  box.innerHTML = `<div class="topo" style="margin:0 0 8px"><h2 style="margin:0">Avaliações</h2>${editaRH() || tem('aprovador') ? '<button class="btn prim peq" id="av-nova">+ Avaliar</button>' : ''}</div>
    ${avs.length ? `<ul class="lista-simples">${avs.map(a => `<li class="clicavel" data-ver="${a.id}"><span><b>${TIPOS_AVAL[a.tipo]}</b> <span class="muted">${dataBR(a.data)} · ${esc(a.avaliador?.nome || '')}</span></span><span>média <b>${a.media ?? '—'}</b> ${a.resultado ? esc(RESULT_EXP[a.resultado]?.split(' (')[0] || '') : ''}</span></li>`).join('')}</ul>` : '<div class="vazio">Nenhuma avaliação.</div>'}`;
  $('#av-nova', box)?.addEventListener('click', async () => formAvaliacao([c], await cargosL(), c.id, c.experiencia_fim1 >= hojeISO() ? 'experiencia_1' : c.experiencia_fim2 >= hojeISO() ? 'experiencia_2' : 'desempenho'));
  $$('[data-ver]', box).forEach(li => li.onclick = () => verAvaliacao({ ...avs.find(a => a.id === li.dataset.ver), colab: c }));
};

// ===================== Recrutamento e banco de talentos =====================
const ST_VAGA = { aberta: ['Aberta', 'azul'], em_selecao: ['Em seleção', 'amarelo'], suspensa: ['Suspensa', ''], preenchida: ['Preenchida', 'verde'], cancelada: ['Cancelada', ''] };
const ETAPAS_SEL = { triagem: 'Triagem de currículo', entrevista_rh: 'Entrevista RH', entrevista_gestor: 'Entrevista com gestor', teste_pratico: 'Teste prático (direção / técnico)', aprovado: 'Aprovado', reprovado: 'Reprovado', desistiu: 'Desistiu', contratado: 'Contratado' };
rota('/rh/recrutamento', async tela => {
  const sts = pLista('status', 'todas'), st = temTodos(sts) ? 'todas' : 'abertas';
  const [vs, cgs, ss] = await Promise.all([api.listar('vagas', `select=*,cands:vaga_candidatos(etapa)&${st === 'abertas' ? 'status=in.(aberta,em_selecao,suspensa)' : 'status=neq.x'}&order=criado_em.desc`), cargosL(), setoresL()]);
  tela.innerHTML = `
    <div class="topo"><div><h1>Recrutamento e seleção</h1><p class="sub">${vs.length} vaga(s)</p></div><div class="acoes"><a class="btn" href="#/rh/talentos">Banco de talentos</a>${editaRH() ? '<button class="btn prim" id="nova-vaga">+ Abrir vaga</button>' : ''}</div></div>
    <form class="filtros" id="filtros"><select name="status"><option value="abertas" ${st === 'abertas' ? 'selected' : ''}>Abertas</option><option value="todas" ${st === 'todas' ? 'selected' : ''}>Todas</option></select><button class="btn">Filtrar</button></form>
    <div class="cartao">${vs.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nº</th><th>Cargo</th><th>Setor</th><th>Vagas</th><th>Candidatos</th><th>Prazo</th><th>Situação</th></tr></thead><tbody>
      ${vs.map(v => `<tr class="clicavel" onclick="location.hash='#/rh/recrutamento/vaga/${v.id}'"><td data-r="Nº">${esc(v.numero || '')}</td><td data-r="Cargo">${esc(cgs.find(c => c.id === v.cargo_id)?.nome || '—')}</td>
        <td data-r="Setor">${esc(ss.find(s => s.id === v.setor_id)?.nome || '—')}</td><td data-r="Vagas">${v.quantidade}</td><td data-r="Candidatos">${(v.cands || []).length}</td>
        <td data-r="Prazo">${dataBR(v.prazo) || '—'}</td><td data-r="Situação"><span class="tag ${ST_VAGA[v.status][1]}">${ST_VAGA[v.status][0]}</span></td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Nenhuma vaga.</div>'}</div>
    ${avisoLei('recrutamento')}`;
  $('#filtros').onsubmit = e => { e.preventDefault(); location.hash = '#/rh/recrutamento?status=' + formDados(e.target).status; };
  $('#nova-vaga')?.addEventListener('click', () => formVaga(null, cgs, ss));
});
async function formVaga(v, cgs, ss) {
  const cs = await colabsRH('&status=in.(ativo,aviso_previo,ferias,afastado)');
  const r = await modal(`<form><h2>${v ? 'Editar vaga ' + esc(v.numero || '') : 'Abrir vaga'}</h2><div class="form">
    <label class="campo">Cargo *<select name="cargo_id" required><option value="">Selecione…</option>${cgs.filter(c => c.ativo).map(c => `<option value="${c.id}" ${c.id === v?.cargo_id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></label>
    <label class="campo">Setor<select name="setor_id"><option value="">—</option>${ss.filter(s => s.ativo).map(s => `<option value="${s.id}" ${s.id === v?.setor_id ? 'selected' : ''}>${esc(s.nome)}</option>`).join('')}</select></label>
    <label class="campo">Quantidade<input type="number" name="quantidade" min="1" value="${v?.quantidade || 1}"></label>
    <label class="campo">Motivo<select name="motivo" data-valor="${esc(v?.motivo || '')}">${['Aumento de quadro', 'Substituição', 'Temporária / sazonal', 'Novo contrato com cliente', 'Outro'].map(x => `<option ${x === v?.motivo ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
    <label class="campo">Substitui (se for o caso)<select name="substitui_colaborador_id"><option value="">—</option>${cs.map(c => `<option value="${c.id}" ${c.id === v?.substitui_colaborador_id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></label>
    <label class="campo">Contrato<select name="tipo_contrato">${Object.entries(TIPOS_CONTRATO).map(([k, t]) => `<option value="${k}" ${k === (v?.tipo_contrato || 'clt') ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <label class="campo">Salário ofertado (R$)<input name="salario_ofertado" inputmode="decimal" value="${v?.salario_ofertado ?? ''}"></label>
    <label class="campo">Prazo para preencher<input type="date" name="prazo" value="${v?.prazo || ''}"></label>
    <label class="campo largo">Requisitos<textarea name="requisitos" rows="3" placeholder="CNH, cursos, experiência…">${esc(v?.requisitos || '')}</textarea></label>
    <label class="campo largo">Benefícios<textarea name="beneficios" rows="2">${esc(v?.beneficios || '')}</textarea></label>
    <label class="campo largo">Onde foi divulgada<input name="divulgacao" value="${esc(v?.divulgacao || '')}"></label>
    ${v ? `<label class="campo">Situação<select name="status">${Object.entries(ST_VAGA).map(([k, [t]]) => `<option value="${k}" ${k === v.status ? 'selected' : ''}>${t}</option>`).join('')}</select></label>` : ''}</div>
    <p class="muted">Não inclua requisitos discriminatórios (sexo, idade, estado civil, aparência etc. — Lei 9.029/1995).</p>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`);
  if (!r) return;
  const dados = { cargo_id: r.cargo_id, setor_id: r.setor_id || (cgs.find(c => c.id === r.cargo_id)?.setor_id ?? null), quantidade: Number(r.quantidade) || 1, motivo: r.motivo, substitui_colaborador_id: r.substitui_colaborador_id || null,
    tipo_contrato: r.tipo_contrato, salario_ofertado: num(r.salario_ofertado), prazo: r.prazo || null, requisitos: r.requisitos || null, beneficios: r.beneficios || null, divulgacao: r.divulgacao || null, ...(v ? { status: r.status } : {}) };
  try { if (v) await api.alterar('vagas', `id=eq.${v.id}`, dados); else { const [n] = await api.inserir('vagas', dados); location.hash = '#/rh/recrutamento/vaga/' + n.id; } aviso('Vaga salva.'); navegar(); } catch (err) { falha(err); }
}
rota('/rh/recrutamento/vaga/:id', async (tela, id) => {
  const [v, vcs, cgs, ss] = await Promise.all([api.um('vagas', `id=eq.${id}&select=*`), api.listar('vaga_candidatos', `vaga_id=eq.${id}&select=*,cand:candidatos(*)&order=criado_em`), cargosL(), setoresL()]);
  if (!v) { tela.innerHTML = '<div class="cartao vazio">Vaga não encontrada.</div>'; return; }
  const cargo = cgs.find(c => c.id === v.cargo_id);
  const porEtapa = Object.keys(ETAPAS_SEL).map(k => [k, vcs.filter(x => x.etapa === k)]).filter(x => x[1].length);
  tela.innerHTML = `
    <div class="topo"><div><h1>${esc(v.numero || '')} · ${esc(cargo?.nome || 'Vaga')}</h1><p class="sub"><span class="tag ${ST_VAGA[v.status][1]}">${ST_VAGA[v.status][0]}</span> · ${v.quantidade} vaga(s) · ${esc(v.motivo || '')}${v.salario_ofertado ? ' · ' + brl(v.salario_ofertado) : ''}</p></div>
      <div class="acoes">${editaRH() ? '<button class="btn" id="ed-vaga">Editar</button><button class="btn prim" id="add-cand">+ Candidato</button>' : ''}<a class="btn" href="#/rh/recrutamento">Voltar</a></div></div>
    ${v.requisitos ? `<div class="cartao"><b>Requisitos:</b> <span style="white-space:pre-line">${esc(v.requisitos)}</span></div>` : ''}
    ${porEtapa.length ? porEtapa.map(([k, l]) => `<div class="cartao"><h2>${ETAPAS_SEL[k]} (${l.length})</h2><ul class="lista-simples">${l.map(x => `<li style="flex-wrap:wrap"><span><b>${esc(x.cand?.nome || '')}</b>
      <span class="muted">${esc([x.cand?.telefone && fmtTel(x.cand.telefone), x.cand?.cidade, x.cand?.cnh_categoria && 'CNH ' + x.cand.cnh_categoria + (x.cand.cnh_ear ? ' EAR' : ''), x.cand?.mopp && 'MOPP'].filter(Boolean).join(' · '))}</span>
      ${x.parecer ? `<br><span class="muted">${esc(x.parecer)}</span>` : ''}</span>
      <span class="acoes"><span class="anx-cand" data-id="${x.candidato_id}"></span>${editaRH() && k !== 'contratado' ? `<select data-etapa="${x.id}">${Object.entries(ETAPAS_SEL).filter(([e]) => e !== 'contratado').map(([e, t]) => `<option value="${e}" ${e === k ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <button class="btn peq" data-parecer="${x.id}">Parecer</button>${k === 'aprovado' ? `<button class="btn peq ok" data-contratar="${x.id}">Contratar</button>` : ''}` : ''}
        ${x.colaborador_id ? `<a class="btn peq" href="#/rh/colaboradores/ver/${x.colaborador_id}?aba=admissao">Admissão</a>` : ''}</span></li>`).join('')}</ul></div>`).join('') : '<div class="cartao vazio">Nenhum candidato nesta vaga ainda.</div>'}
    ${avisoLei('recrutamento')}`;
  $$('.anx-cand', tela).forEach(async el => { el.innerHTML = await htmlAnexos('candidato', el.dataset.id); });
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
  $$('[data-etapa]', tela).forEach(s => s.onchange = async () => { try { await api.alterar('vaga_candidatos', `id=eq.${s.dataset.etapa}`, { etapa: s.value });
    if (['reprovado', 'desistiu'].includes(s.value)) { const x = vcs.find(y => y.id === s.dataset.etapa); await api.alterar('candidatos', `id=eq.${x.candidato_id}`, { situacao: 'disponivel' }); } navegar(); } catch (err) { falha(err); } });
  $$('[data-parecer]', tela).forEach(b => b.onclick = async () => { const x = vcs.find(y => y.id === b.dataset.parecer);
    const r = await modal(`<form><h2>Parecer · ${esc(x.cand?.nome || '')}</h2><div class="form"><label class="campo">Data da entrevista<input type="datetime-local" name="data" value="${x.data_entrevista ? x.data_entrevista.slice(0, 16) : ''}"></label>
      <label class="campo">Nota (0 a 10)<input name="nota" inputmode="decimal" value="${x.nota ?? ''}"></label><label class="campo largo">Parecer<textarea name="parecer" rows="4">${esc(x.parecer || '')}</textarea></label></div>
      <p class="muted">Registre motivos objetivos e relacionados à função.</p><div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`);
    if (r) try { await api.alterar('vaga_candidatos', `id=eq.${x.id}`, { data_entrevista: r.data ? new Date(r.data).toISOString() : null, nota: num(r.nota), parecer: r.parecer || null }); navegar(); } catch (err) { falha(err); } });
  $$('[data-contratar]', tela).forEach(b => b.onclick = async () => {
    if (!await confirmar('Contratar este candidato? O sistema cria o cadastro do colaborador para você iniciar a admissão.', { botao: 'Contratar' })) return;
    try { const col = await api.rpc('contratar_candidato', { p_vc: b.dataset.contratar }); aviso('Colaborador criado. Inicie a admissão.'); location.hash = `#/rh/colaboradores/ver/${col}?aba=admissao`; } catch (err) { falha(err); } });
});
async function formCandidato(c = null, cargoPret = '') {
  const r = await modal(`<form><h2>${c ? 'Editar candidato' : 'Novo candidato'}</h2><div class="form">
    <label class="campo largo">Nome *<input name="nome" required value="${esc(c?.nome || '')}"></label>
    <label class="campo">CPF<input name="cpf" value="${esc(fmtCPF(c?.cpf || ''))}"></label><label class="campo">Telefone<input name="telefone" value="${esc(fmtTel(c?.telefone || ''))}"></label>
    <label class="campo">E-mail<input type="email" name="email" value="${esc(c?.email || '')}"></label><label class="campo">Cidade<input name="cidade" value="${esc(c?.cidade || '')}"></label>
    <label class="campo">UF<select name="uf" data-valor="${esc(c?.uf || '')}"><option value=""></option>${UFS.map(u => `<option ${u === c?.uf ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
    <label class="campo">Cargo pretendido<input name="cargo_pretendido" value="${esc(c?.cargo_pretendido || cargoPret || '')}"></label>
    <label class="campo">CNH<select name="cnh_categoria"><option value="">Não possui</option>${['A', 'B', 'AB', 'C', 'AC', 'D', 'AD', 'E', 'AE'].map(x => `<option ${x === c?.cnh_categoria ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
    <label class="check"><input type="checkbox" name="cnh_ear" ${c?.cnh_ear ? 'checked' : ''}> CNH com EAR</label><label class="check"><input type="checkbox" name="mopp" ${c?.mopp ? 'checked' : ''}> Possui MOPP</label>
    <label class="campo">Origem<select name="origem" data-valor="${esc(c?.origem || '')}">${['Indicação', 'Site / redes sociais', 'Agência / SINE', 'Currículo espontâneo', 'Ex-colaborador', 'Outro'].map(x => `<option ${x === c?.origem ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
    <label class="campo">Pretensão salarial (R$)<input name="pretensao_salarial" inputmode="decimal" value="${c?.pretensao_salarial ?? ''}"></label>
    <label class="campo largo">Experiência<textarea name="experiencia" rows="3">${esc(c?.experiencia || '')}</textarea></label>
    <label class="campo largo">Currículo e documentos<input type="file" name="arquivos" multiple accept="image/*,application/pdf,.doc,.docx"></label>
    <label class="check largo"><input type="checkbox" name="consentimento_lgpd" ${c?.consentimento_lgpd ? 'checked' : ''} required> O candidato autorizou guardar os dados no banco de talentos (LGPD) — modelo RH-REC-001</label></div>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`,
    { validar: d => d.cpf && !cpfValido(d.cpf) ? 'CPF inválido.' : null });
  if (!r) return null;
  const dados = { nome: r.nome, cpf: soDigitos(r.cpf) || null, telefone: soDigitos(r.telefone) || null, email: r.email || null, cidade: r.cidade || null, uf: r.uf || null, cargo_pretendido: r.cargo_pretendido || null,
    cnh_categoria: r.cnh_categoria || null, cnh_ear: r.cnh_ear, mopp: r.mopp, origem: r.origem || null, pretensao_salarial: num(r.pretensao_salarial), experiencia: r.experiencia || null,
    consentimento_lgpd: r.consentimento_lgpd, consentimento_em: r.consentimento_lgpd ? (c?.consentimento_em || hojeISO()) : null };
  try {
    let id = c?.id; if (c) await api.alterar('candidatos', `id=eq.${id}`, dados); else [{ id }] = await api.inserir('candidatos', dados);
    if (r.arquivos.length) await anexar('candidato', id, r.arquivos);
    aviso('Candidato salvo.'); return id;
  } catch (err) { falha(err); return null; }
}
rota('/rh/talentos', async tela => {
  const q = (estado.params.get('q') || '').toLowerCase();
  let cs = await api.listar('candidatos', 'ativo=eq.true&order=nome');
  if (q) cs = cs.filter(c => [c.nome, c.cargo_pretendido, c.cidade, c.cnh_categoria].join(' ').toLowerCase().includes(q));
  const ST = { disponivel: ['Disponível', 'verde'], em_processo: ['Em processo', 'azul'], contratado: ['Contratado', ''], nao_recomendado: ['Não recomendado', 'vermelho'], retirado: ['Dados retirados', ''] };
  tela.innerHTML = `
    <div class="topo"><div><h1>Banco de talentos</h1><p class="sub">${cs.length} candidato(s)</p></div><div class="acoes"><a class="btn" href="#/rh/recrutamento">Vagas</a>${editaRH() ? '<button class="btn prim" id="novo-c">+ Candidato</button>' : ''}</div></div>
    <form class="filtros" id="filtros"><input name="q" value="${esc(estado.params.get('q') || '')}" placeholder="Nome, cargo, cidade ou CNH"><button class="btn">Filtrar</button></form>
    <div class="cartao">${cs.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nome</th><th>Cargo pretendido</th><th>Cidade</th><th>CNH</th><th>Cadastro</th><th>Situação</th></tr></thead><tbody>
      ${cs.map(c => `<tr class="clicavel" data-c="${c.id}"><td data-r="Nome"><b>${esc(c.nome)}</b>${c.consentimento_lgpd ? '' : ' <span class="tag vermelho" title="Sem consentimento LGPD">LGPD</span>'}</td><td data-r="Cargo">${esc(c.cargo_pretendido || '—')}</td>
        <td data-r="Cidade">${esc([c.cidade, c.uf].filter(Boolean).join('/') || '—')}</td><td data-r="CNH">${esc(c.cnh_categoria || '—')}${c.cnh_ear ? ' EAR' : ''}${c.mopp ? ' · MOPP' : ''}</td>
        <td data-r="Cadastro">${dataBR(c.criado_em)}</td><td data-r="Situação"><span class="tag ${ST[c.situacao]?.[1] || ''}">${ST[c.situacao]?.[0] || c.situacao}</span></td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Nenhum candidato.</div>'}</div>
    <p class="muted">LGPD: candidatos com mais de 12 meses sem processo devem ter os dados revistos ou excluídos, conforme o prazo informado no consentimento.</p>`;
  $('#filtros').onsubmit = e => { e.preventDefault(); location.hash = '#/rh/talentos?q=' + encodeURIComponent(formDados(e.target).q); };
  $('#novo-c')?.addEventListener('click', async () => { if (await formCandidato()) navegar(); });
  if (editaRH()) $$('[data-c]', tela).forEach(tr => tr.onclick = async () => { const c = cs.find(x => x.id === tr.dataset.c); if (await formCandidato(c)) navegar(); });
});

// ===================== Férias =====================
const SIT_FER = { aquisitivo: ['Em aquisição', ''], a_programar: ['A programar', 'azul'], vencendo: ['Vence em 90 dias', 'amarelo'], vencido: ['Vencido — pagar em dobro', 'vermelho'], programado: ['Programado', 'verde'] };
const ST_PROG = { planejada: ['Planejada', ''], aprovada: ['Aprovada', 'azul'], aviso_emitido: ['Aviso emitido', 'azul'], em_gozo: ['Em gozo', 'verde'], concluida: ['Concluída', ''], cancelada: ['Cancelada', ''] };
rota('/rh/ferias', async tela => {
  const aba = estado.params.get('aba') || 'saldos';
  const [sal, progs] = await Promise.all([api.listar('v_ferias_saldo', 'order=limite_concessivo'),
    api.listar('ferias_programacoes', `select=*,colab:colaboradores(id,nome)&ativo=eq.true&status=neq.cancelada&fim=gte.${somaDias(hojeISO(), -60)}&order=inicio`)]);
  const abertos = sal.filter(s => s.situacao !== 'aquisitivo' && s.situacao !== 'programado');
  tela.innerHTML = `
    <div class="topo"><div><h1>Férias</h1><p class="sub">Períodos aquisitivos, saldos, programação e avisos</p></div>
      ${editaRH() ? '<div class="acoes"><button class="btn" id="gerar-per">Atualizar períodos</button></div>' : ''}</div>
    <div class="grade" style="margin-bottom:12px">${['vencido', 'vencendo', 'a_programar'].map(k => `<div class="cartao kpi ${k !== 'a_programar' && sal.some(s => s.situacao === k) ? 'alerta' : ''}"><div class="n">${sal.filter(s => s.situacao === k).length}</div><div class="r">${SIT_FER[k][0]}</div></div>`).join('')}
      <div class="cartao kpi"><div class="n">${progs.filter(p => p.inicio <= somaDias(hojeISO(), 45) && p.fim >= hojeISO()).length}</div><div class="r">em férias ou saindo em 45 dias</div></div></div>
    <div class="abas">${[['saldos', 'Saldos a programar'], ['programacao', 'Programação'], ['todos', 'Todos os períodos']].map(([k, t]) => `<a href="#/rh/ferias?aba=${k}" class="${k === aba ? 'ativa' : ''}">${t}</a>`).join('')}</div>
    <div class="cartao">${aba === 'programacao' ? (progs.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Colaborador</th><th>Início</th><th>Fim</th><th>Dias</th><th>Abono</th><th>Aviso até</th><th>Pagar até</th><th>Situação</th></tr></thead><tbody>
        ${progs.map(p => { const avisoAte = somaDias(p.inicio, -30); return `<tr class="clicavel" data-prog="${p.id}"><td data-r="Colaborador">${esc(p.colab?.nome || '')}</td><td data-r="Início">${dataBR(p.inicio)}</td><td data-r="Fim">${dataBR(p.fim)}</td><td data-r="Dias">${p.dias}</td><td data-r="Abono">${p.abono_dias || '—'}</td>
          <td data-r="Aviso até">${dataBR(avisoAte)}${['planejada', 'aprovada'].includes(p.status) && avisoAte < hojeISO() ? ' <span class="tag vermelho">atrasado</span>' : ''}</td><td data-r="Pagar até">${dataBR(p.pagamento_ate)}</td>
          <td data-r="Situação"><span class="tag ${ST_PROG[p.status][1]}">${ST_PROG[p.status][0]}</span></td></tr>`; }).join('')}</tbody></table></div>` : '<div class="vazio">Nada programado.</div>')
      : (() => { const ls = aba === 'todos' ? sal : abertos; return ls.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Colaborador</th><th>Período aquisitivo</th><th>Conceder até</th><th>Direito</th><th>Programado</th><th>Saldo</th><th>Situação</th><th></th></tr></thead><tbody>
        ${ls.map(s => `<tr><td data-r="Colaborador"><a href="#/rh/colaboradores/ver/${s.colaborador_id}?aba=ferias">${esc(s.nome)}</a></td><td data-r="Aquisitivo">${dataBR(s.inicio_aquisitivo)} a ${dataBR(s.fim_aquisitivo)}</td>
          <td data-r="Conceder até">${dataBR(s.limite_concessivo)}</td><td data-r="Direito">${s.dias_direito}${s.faltas_injustificadas ? ` <span class="muted">(${s.faltas_injustificadas} faltas)</span>` : ''}</td><td data-r="Programado">${s.dias_programados}</td>
          <td data-r="Saldo"><b>${s.dias_direito - s.dias_programados}</b></td><td data-r="Situação"><span class="tag ${SIT_FER[s.situacao][1]}">${SIT_FER[s.situacao][0]}</span></td>
          <td>${editaRH() && s.situacao !== 'programado' ? `<button class="btn peq prim" data-prog-per="${s.id}">Programar</button> <button class="btn peq" data-faltas="${s.id}">Faltas</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`
        : `<div class="vazio">${sal.length ? 'Nenhum saldo pendente. 🎉' : 'Nenhum período cadastrado. Clique em "Atualizar períodos" (usa a data de admissão dos colaboradores).'}</div>`; })()}</div>
    ${avisoLei('ferias')}`;
  $('#gerar-per')?.addEventListener('click', async () => { try { const n = await api.rpc('gerar_periodos_ferias'); aviso(`${n} período(s) criado(s).`); navegar(); } catch (err) { falha(err); } });
  $$('[data-prog-per]', tela).forEach(b => b.onclick = () => formFerias(sal.find(s => s.id === b.dataset.progPer)));
  $$('[data-faltas]', tela).forEach(b => b.onclick = async () => { const s = sal.find(x => x.id === b.dataset.faltas);
    const r = await modal(`<form><h2>Faltas injustificadas no período</h2><p class="muted">${esc(s.nome)} · ${dataBR(s.inicio_aquisitivo)} a ${dataBR(s.fim_aquisitivo)}</p>
      <label class="campo">Quantidade de faltas<input type="number" name="f" min="0" value="${s.faltas_injustificadas}"></label><p class="muted">Até 5 = 30 dias · 6 a 14 = 24 · 15 a 23 = 18 · 24 a 32 = 12 · mais de 32 = perde (art. 130)</p>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`);
    if (r) try { await api.alterar('ferias_periodos', `id=eq.${s.id}`, { faltas_injustificadas: Number(r.f) || 0 }); navegar(); } catch (err) { falha(err); } });
  $$('[data-prog]', tela).forEach(tr => tr.onclick = () => acoesFerias(progs.find(p => p.id === tr.dataset.prog)));
  refazerExportacao();
});
async function formFerias(s) {
  const saldo = s.dias_direito - s.dias_programados;
  const r = await modal(`<form><h2>Programar férias · ${esc(s.nome)}</h2><p class="muted">Período ${dataBR(s.inicio_aquisitivo)} a ${dataBR(s.fim_aquisitivo)} · conceder até ${dataBR(s.limite_concessivo)} · saldo ${saldo} dia(s)</p><div class="form">
    <label class="campo">Início *<input type="date" name="inicio" required min="${hojeISO()}"></label>
    <label class="campo">Dias de gozo *<input type="number" name="dias" required min="5" max="${saldo}" value="${Math.min(30, saldo)}"></label>
    <label class="campo">Abono (vender dias)<input type="number" name="abono_dias" min="0" max="${Math.floor(s.dias_direito / 3)}" value="0"></label>
    <label class="check"><input type="checkbox" name="adiantar_13"> Adiantar 1ª parcela do 13º</label>
    <div class="largo" id="alertas-f"></div>
    <label class="campo largo">Observação<input name="observacao"></label></div>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Programar</button></div></form>`,
    { aoAbrir: raiz => { const f = $('form', raiz); const chk = () => { const a = [];
      if (f.inicio.value) { const ini = f.inicio.value, fim = somaDias(ini, (Number(f.dias.value) || 0) - 1), dow = new Date(ini + 'T12:00:00').getDay();
        if (somaDias(ini, -30) < hojeISO()) a.push('⚠️ Menos de 30 dias de antecedência: o aviso de férias deveria ser dado até ' + dataBR(somaDias(ini, -30)) + ' (art. 135).');
        if (dow === 5 || dow === 6) a.push('⚠️ Início na sexta ou no sábado: não pode começar nos 2 dias antes do descanso semanal (art. 134 §3º). Confirme a escala do colaborador.');
        if (fim > s.limite_concessivo) a.push(`❌ Termina depois do prazo de concessão (${dataBR(s.limite_concessivo)}): os dias excedentes serão pagos em dobro (art. 137).`);
        a.push(`Retorno em ${dataBR(somaDias(fim, 1))} · pagamento até ${dataBR(somaDias(ini, -2))}.`); }
      if ((Number(f.dias.value) || 0) < 14 && Number(f.dias.value) + Number(f.abono_dias.value) < saldo) a.push('Lembrete: se dividir, um dos períodos precisa ter pelo menos 14 dias (art. 134 §1º).');
      $('#alertas-f', raiz).innerHTML = a.map(x => `<div class="${x.startsWith('❌') || x.startsWith('⚠️') ? 'alerta-obs' : 'muted'}" style="margin:4px 0">${x}</div>`).join(''); };
      ['inicio', 'dias', 'abono_dias'].forEach(n => (f[n].oninput = chk)); chk(); } });
  if (!r) return;
  try { await api.inserir('ferias_programacoes', { periodo_id: s.id, colaborador_id: s.colaborador_id, inicio: r.inicio, dias: Number(r.dias), abono_dias: Number(r.abono_dias) || 0, adiantar_13: r.adiantar_13, observacao: r.observacao || null });
    aviso('Férias programadas.'); navegar(); } catch (err) { falha(err); }
}
async function acoesFerias(p) {
  const prox = { planejada: ['aprovada', 'Aprovar'], aprovada: ['aviso_emitido', 'Emitir aviso de férias'], aviso_emitido: ['em_gozo', 'Marcar em gozo'], em_gozo: ['concluida', 'Concluir'] }[p.status];
  const r = await modal(`<form><h2>Férias · ${esc(p.colab?.nome || '')}</h2><p>${dataBR(p.inicio)} a ${dataBR(p.fim)} · ${p.dias} dia(s)${p.abono_dias ? ` + ${p.abono_dias} de abono` : ''} · <span class="tag ${ST_PROG[p.status][1]}">${ST_PROG[p.status][0]}</span></p>
    <p class="muted">Aviso até ${dataBR(somaDias(p.inicio, -30))} · pagamento até ${dataBR(p.pagamento_ate)}</p>
    <div class="rodape"><button class="btn perigo" value="cancelar">Cancelar férias</button><button class="btn" value="aviso">Gerar aviso</button><button type="button" class="btn" data-fechar>Fechar</button>${prox ? `<button class="btn prim" value="avancar">${prox[1]}</button>` : ''}</div></form>`);
  if (!r) return;
  try {
    if (r._acao === 'cancelar') { if (!await confirmar('Cancelar esta programação?')) return; await api.alterar('ferias_programacoes', `id=eq.${p.id}`, { status: 'cancelada' }); return navegar(); }
    if (r._acao === 'aviso' || prox?.[0] === 'aviso_emitido' && r._acao === 'avancar') {
      const per = await api.um('ferias_periodos', `id=eq.${p.periodo_id}`); const m = await modeloPorCodigo('RH-FER-001');
      if (m) await gerarDocumento(m, p.colaborador_id, { ferias: { ...p, inicio: dataBR(p.inicio), fim: dataBR(p.fim), retorno: dataBR(somaDias(p.fim, 1)), pagamento_ate: dataBR(p.pagamento_ate),
        inicio_aquisitivo: dataBR(per?.inicio_aquisitivo), fim_aquisitivo: dataBR(per?.fim_aquisitivo), abono_dias: String(p.abono_dias || 0), adiantar_13: p.adiantar_13 ? 'sim' : 'não' } });
      if (r._acao === 'aviso') return;
    }
    if (r._acao === 'avancar') { await api.alterar('ferias_programacoes', `id=eq.${p.id}`, { status: prox[0], ...(prox[0] === 'aviso_emitido' ? { data_aviso: hojeISO() } : {}) });
      if (prox[0] === 'em_gozo') await api.alterar('colaboradores', `id=eq.${p.colaborador_id}`, { status: 'ferias' });
      if (prox[0] === 'concluida') await api.alterar('colaboradores', `id=eq.${p.colaborador_id}&status=eq.ferias`, { status: 'ativo' });
      aviso('Atualizado.'); navegar(); }
  } catch (err) { falha(err); }
}
ABAS_RH_EXTRA.ferias = async (box, c) => {
  const [sal, progs] = await Promise.all([api.listar('v_ferias_saldo', `colaborador_id=eq.${c.id}&order=inicio_aquisitivo.desc`),
    api.listar('ferias_programacoes', `colaborador_id=eq.${c.id}&ativo=eq.true&order=inicio.desc&select=*`)]);
  box.innerHTML = `<h2>Férias</h2>${sal.length ? `<ul class="lista-simples">${sal.map(s => `<li style="flex-wrap:wrap"><span><b>${dataBR(s.inicio_aquisitivo)} a ${dataBR(s.fim_aquisitivo)}</b> <span class="muted">conceder até ${dataBR(s.limite_concessivo)} · direito ${s.dias_direito} · programado ${s.dias_programados}</span></span>
    <span><span class="tag ${SIT_FER[s.situacao][1]}">${SIT_FER[s.situacao][0]}</span> ${editaRH() && s.situacao !== 'programado' && s.situacao !== 'aquisitivo' ? `<button class="btn peq prim" data-p="${s.id}">Programar</button>` : ''}</span></li>`).join('')}</ul>`
    : `<p class="muted">Nenhum período. ${editaRH() ? 'Use Férias → Atualizar períodos (é preciso ter data de admissão).' : ''}</p>`}
    ${progs.length ? `<h3>Programações</h3><ul class="lista-simples">${progs.map(p => `<li><span>${dataBR(p.inicio)} a ${dataBR(p.fim)} · ${p.dias} dia(s)${p.abono_dias ? ' + ' + p.abono_dias + ' abono' : ''}</span><span class="tag ${ST_PROG[p.status][1]}">${ST_PROG[p.status][0]}</span></li>`).join('')}</ul>` : ''}`;
  $$('[data-p]', box).forEach(b => b.onclick = () => formFerias(sal.find(s => s.id === b.dataset.p)));
};

// ===================== Pesquisa de clima =====================
const PERGUNTAS_CLIMA = ['Sinto orgulho de trabalhar na empresa', 'Tenho clareza sobre o que se espera do meu trabalho', 'Recebo feedback do meu líder com frequência',
  'Tenho os equipamentos e veículos adequados para trabalhar com segurança', 'A empresa se preocupa com a minha segurança e saúde', 'Sou tratado com respeito pela liderança',
  'Minha remuneração é justa para a função', 'Vejo oportunidades de crescer na empresa', 'A comunicação entre setores funciona bem', 'A jornada e as escalas permitem descanso adequado'];
const criaClima = () => tem('administrador', 'rh');   // só o RH cria, edita e encerra pesquisas
const SIT_CLIMA = { aberta: ['Aberta', 'verde'], agendada: ['Agendada', 'azul'], encerrada: ['Encerrada', ''] };
rota('/clima', async tela => {
  const ps = await api.rpc('clima_situacao').catch(() => []);
  const pend = ps.filter(p => p.situacao === 'aberta' && !p.eu_respondi);
  const prazo = p => { const d = Math.round((new Date(p.fim + 'T23:59:59') - new Date()) / 864e5); return d <= 0 ? 'último dia' : d === 1 ? 'falta 1 dia' : `faltam ${d} dias`; };
  tela.innerHTML = `<div class="topo"><div><h1>Pesquisa de clima</h1><p class="sub">Sua opinião é anônima e ajuda a melhorar a empresa</p></div>${ve_rh_js() ? '<a class="btn" href="#/rh/clima">Gerenciar pesquisas (RH)</a>' : ''}</div>
    ${pend.length ? pend.map(p => `<div class="cartao" style="border-left:4px solid var(--ouro)"><h2>${esc(p.titulo)}</h2><p class="muted">Aberta até ${dataBR(p.fim)} · ${prazo(p)}</p>${p.descricao ? `<p>${esc(p.descricao)}</p>` : ''}<a class="btn prim" href="#/clima/responder/${p.id}">Responder agora</a></div>`).join('')
      : '<div class="cartao vazio">Nenhuma pesquisa aguardando a sua resposta. Obrigado!</div>'}
    <div class="cartao"><h2>Acompanhar pesquisas</h2><p class="muted">Situação e adesão de cada pesquisa. As respostas são anônimas e só o RH vê os resultados consolidados.</p>
      ${ps.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Pesquisa</th><th>Período</th><th>Situação</th><th>Adesão</th><th>Você</th></tr></thead><tbody>
        ${ps.map(p => `<tr><td data-r="Pesquisa"><b>${esc(p.titulo)}</b></td><td data-r="Período">${dataBR(p.inicio)} a ${dataBR(p.fim)}${p.situacao === 'aberta' ? `<div class="muted">${prazo(p)}</div>` : ''}</td>
          <td data-r="Situação">${tagSt(SIT_CLIMA, p.situacao)}</td>
          <td data-r="Adesão"><div class="barra-pct"><div style="width:${Math.min(100, Number(p.adesao) || 0)}%"></div><span>${Number(p.adesao) || 0}% · ${p.respostas} de ${p.publico}</span></div></td>
          <td data-r="Você">${p.eu_respondi ? '<span class="tag verde">Respondida ✓</span>' : p.situacao === 'aberta' ? `<a class="btn peq prim" href="#/clima/responder/${p.id}">Responder</a>` : '<span class="muted">Não respondida</span>'}</td></tr>`).join('')}</tbody></table></div>`
        : '<div class="vazio">Nenhuma pesquisa ainda.</div>'}</div>
    ${avisoLei('clima')}`;
});
const ve_rh_js = () => tem('administrador', 'rh', 'dp', 'diretoria');
rota('/clima/responder/:id', async (tela, id) => {
  const p = await api.um('pesquisas_clima', `id=eq.${id}`);
  if (!p) { tela.innerHTML = '<div class="cartao vazio">Pesquisa não encontrada.</div>'; return; }
  const ss = await setoresL();
  tela.innerHTML = `<div class="topo"><div><h1>${esc(p.titulo)}</h1><p class="sub">🔒 Anônima: o sistema registra só que você respondeu, nunca as suas respostas.</p></div></div>
    <form id="f-clima" class="cartao"><label class="campo">Seu setor (opcional)<select name="setor"><option value="">Prefiro não informar</option>${ss.filter(s => s.ativo).map(s => `<option>${esc(s.nome)}</option>`).join('')}</select></label>
      ${p.perguntas.map((q, i) => `<div class="pergunta-clima"><b>${i + 1}. ${esc(q.texto)}</b><div>${q.tipo === 'texto' ? `<textarea name="q${i}" rows="2" style="width:100%"></textarea>`
        : q.tipo === 'nps' ? `<div class="escala">${Array.from({ length: 11 }, (_, n) => `<label class="nota"><input type="radio" name="q${i}" value="${n}" required><span>${n}</span></label>`).join('')}</div><div class="muted">0 = jamais recomendaria · 10 = recomendaria com certeza</div>`
        : `<div class="escala">${[[1, 'Discordo totalmente'], [2, 'Discordo'], [3, 'Neutro'], [4, 'Concordo'], [5, 'Concordo totalmente']].map(([n, t]) => `<label class="nota" title="${t}"><input type="radio" name="q${i}" value="${n}" required><span>${n}</span></label>`).join('')}</div><div class="muted">1 = discordo totalmente · 5 = concordo totalmente</div>`}</div></div>`).join('')}
      <div class="acoes"><button class="btn prim">Enviar respostas</button></div></form>`;
  $('#f-clima').onsubmit = async e => { e.preventDefault(); const d = formDados(e.target);
    await ocupado(e.submitter, async () => { try { await api.rpc('responder_pesquisa', { p_pesquisa: id, p_respostas: p.perguntas.map((q, i) => q.tipo === 'texto' ? (d['q' + i] || null) : (d['q' + i] ? Number(d['q' + i]) : null)), p_setor: d.setor || null });
      aviso('Obrigado! Respostas enviadas de forma anônima.'); location.hash = '#/inicio'; } catch (err) { falha(err); } }); };
});
rota('/rh/clima', async tela => {
  const ps = await api.listar('pesquisas_clima', 'ativo=eq.true&order=inicio.desc');
  tela.innerHTML = `<div class="topo"><div><h1>Pesquisas de clima</h1><p class="sub">${criaClima() ? 'Crie, acompanhe e analise os resultados' : 'Somente o RH cria e encerra pesquisas'}</p></div>${criaClima() ? '<button class="btn prim" id="nova-p">+ Nova pesquisa</button>' : ''}</div>
    ${ps.length ? ps.map(p => `<div class="cartao"><div class="topo" style="margin:0"><div><h2 style="margin:0">${esc(p.titulo)}</h2><div class="muted">${dataBR(p.inicio)} a ${dataBR(p.fim)} · ${p.status}</div></div>
      <div class="acoes"><a class="btn peq prim" href="#/rh/clima/resultado/${p.id}">Resultados</a>${criaClima() && p.status === 'aberta' ? `<button class="btn peq" data-enc="${p.id}">Encerrar</button>` : ''}</div></div></div>`).join('') : '<div class="cartao vazio">Nenhuma pesquisa criada.</div>'}
    ${avisoLei('clima')}`;
  $('#nova-p')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Nova pesquisa de clima</h2><div class="form">
      <label class="campo largo">Título *<input name="titulo" required value="Pesquisa de clima ${new Date().getFullYear()}"></label>
      <label class="campo">Início<input type="date" name="inicio" value="${hojeISO()}"></label><label class="campo">Fim *<input type="date" name="fim" required value="${somaDias(hojeISO(), 14)}"></label>
      <label class="campo largo">Texto de abertura<input name="descricao" value="Sua opinião é anônima e vai ajudar a construir uma empresa melhor para todos."></label>
      <label class="campo largo">Afirmações (uma por linha, nota de 1 a 5)<textarea name="perguntas" rows="10">${PERGUNTAS_CLIMA.join('\n')}</textarea></label>
      <label class="check largo"><input type="checkbox" name="nps" checked> Incluir eNPS: "De 0 a 10, quanto você recomendaria a empresa como lugar para trabalhar?"</label>
      <label class="check largo"><input type="checkbox" name="aberta" checked> Incluir pergunta aberta: "O que mais precisa melhorar?"</label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Criar e abrir</button></div></form>`);
    if (!r) return;
    const perguntas = r.perguntas.split('\n').map(x => x.trim()).filter(Boolean).map(texto => ({ texto, tipo: 'escala' }));
    if (r.nps) perguntas.push({ texto: 'De 0 a 10, quanto você recomendaria a empresa como lugar para trabalhar?', tipo: 'nps' });
    if (r.aberta) perguntas.push({ texto: 'O que mais precisa melhorar?', tipo: 'texto' });
    try { await api.inserir('pesquisas_clima', { titulo: r.titulo, inicio: r.inicio, fim: r.fim, descricao: r.descricao || null, perguntas }); aviso('Pesquisa aberta. Todos verão um aviso no início.'); navegar(); } catch (err) { falha(err); }
  });
  $$('[data-enc]', tela).forEach(b => b.onclick = async () => { if (await confirmar('Encerrar a pesquisa?')) { await api.alterar('pesquisas_clima', `id=eq.${b.dataset.enc}`, { status: 'encerrada' }); navegar(); } });
});
rota('/rh/clima/resultado/:id', async (tela, id) => {
  const [p, rs] = await Promise.all([api.um('pesquisas_clima', `id=eq.${id}`), api.listar('pesquisa_respostas', `pesquisa_id=eq.${id}`)]);
  const media = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const setores = [...new Set(rs.map(r => r.setor).filter(Boolean))];
  const linhas = p.perguntas.map((q, i) => ({ q, i, vals: rs.map(r => r.respostas[i]).filter(v => v != null && v !== '') }));
  const nps = linhas.find(l => l.q.tipo === 'nps');
  const enps = nps && nps.vals.length ? Math.round((nps.vals.filter(v => v >= 9).length - nps.vals.filter(v => v <= 6).length) / nps.vals.length * 100) : null;
  tela.innerHTML = `<div class="topo"><div><h1>${esc(p.titulo)}</h1><p class="sub">${rs.length} resposta(s) · ${dataBR(p.inicio)} a ${dataBR(p.fim)}</p></div><a class="btn" href="#/rh/clima">Voltar</a></div>
    ${rs.length < 3 ? '<div class="cartao alerta-obs">Menos de 3 respostas: resultados não são exibidos para preservar o anonimato.</div>' : `
    ${enps != null ? `<div class="grade" style="margin-bottom:12px"><div class="cartao kpi"><div class="n">${enps}</div><div class="r">eNPS (−100 a 100)</div></div><div class="cartao kpi"><div class="n">${(media(linhas.filter(l => l.q.tipo === 'escala').flatMap(l => l.vals)) || 0).toFixed(1).replace('.', ',')}</div><div class="r">média geral (1 a 5)</div></div></div>` : ''}
    <div class="cartao"><h2>Resultado por afirmação</h2><div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Afirmação</th><th>Média</th><th>% favorável (4 e 5)</th>${setores.filter(s => rs.filter(r => r.setor === s).length >= 3).map(s => `<th>${esc(s)}</th>`).join('')}</tr></thead><tbody>
      ${linhas.filter(l => l.q.tipo === 'escala').map(l => { const m = media(l.vals); const fav = l.vals.length ? Math.round(l.vals.filter(v => v >= 4).length / l.vals.length * 100) : 0;
        return `<tr><td data-r="Afirmação">${esc(l.q.texto)}</td><td data-r="Média"><b>${m != null ? m.toFixed(1).replace('.', ',') : '—'}</b></td><td data-r="Favorável"><div class="barra-pct"><div style="width:${fav}%"></div><span>${fav}%</span></div></td>
          ${setores.filter(s => rs.filter(r => r.setor === s).length >= 3).map(s => { const v = media(rs.filter(r => r.setor === s).map(r => r.respostas[l.i]).filter(x => x != null)); return `<td data-r="${esc(s)}">${v != null ? v.toFixed(1).replace('.', ',') : '—'}</td>`; }).join('')}</tr>`; }).join('')}</tbody></table></div></div>
    ${linhas.filter(l => l.q.tipo === 'texto').map(l => `<div class="cartao"><h2>${esc(l.q.texto)}</h2><ul class="lista-simples">${l.vals.map(v => `<li>${esc(v)}</li>`).join('') || '<li class="muted">Sem comentários.</li>'}</ul></div>`).join('')}`}`;
});

// ===================== Organograma =====================
// Monta-se sozinho a partir do "gestor imediato" de cada colaborador (que pode ser colaborador, usuário, fornecedor/prestador ou externo).
const ORG_CORES = ['#19966e', '#bb881a', '#3786c3', '#bd5833', '#a067ac', '#2aa1a8', '#c2577f', '#6f8f2f', '#5d7fbf', '#b7742b', '#7d6bc2', '#4f9d6b', '#9a7b4f'];
const orgIniciais = n => String(n || '?').replace(/\s+(d[aeo]s?|e)\s+/gi, ' ').trim().split(/\s+/).filter(Boolean).map((p, i, a) => i === 0 || i === a.length - 1 ? p[0] : '').join('').toUpperCase().slice(0, 2);
function orgMontar(cs, cgs, ss) {
  const nos = new Map(); const corSetor = {}; ss.forEach((s, i) => (corSetor[s.id] = ORG_CORES[i % ORG_CORES.length]));
  for (const c of cs) { const st = ss.find(x => x.id === c.setor_id);
    nos.set('c:' + c.id, { k: 'c:' + c.id, tipo: 'colab', id: c.id, nome: c.nome, cargo: cgs.find(x => x.id === c.cargo_id)?.nome || '', setor: st?.nome || '', setor_id: c.setor_id, cor: corSetor[c.setor_id] || '#5d6f68', status: c.status, admissao: c.data_admissao, c, filhos: [] }); }
  const porUsuario = new Map(cs.filter(c => c.usuario_id).map(c => [c.usuario_id, 'c:' + c.id]));
  const chaveGestor = g => !g ? null : g.colaborador_id ? 'c:' + g.colaborador_id : g.usuario_id ? (porUsuario.get(g.usuario_id) || 'u:' + g.usuario_id) : g.fornecedor_id ? 'f:' + g.fornecedor_id : 'x:' + semAcento(String(g.nome || '').toLowerCase());
  for (const n of nos.values()) {
    const g = n.c.gestor || (n.c.gestor_colaborador_id ? { colaborador_id: n.c.gestor_colaborador_id } : null); const k = chaveGestor(g); if (!k || k === n.k) continue;
    if (!nos.has(k)) { if (k.startsWith('c:')) continue;
      nos.set(k, { k, tipo: k.startsWith('f:') ? 'prestador' : 'externo', nome: g.nome, cargo: k.startsWith('f:') ? 'Prestador de serviço' : k.startsWith('u:') ? 'Usuário do sistema' : (g.info || 'Externo'), setor: '', cor: '#DDA936', filhos: [] }); }
    n.pai = k;
  }
  // evita ciclo (dados antigos): quem cair em ciclo vira raiz
  for (const n of nos.values()) { let p = n.pai, passos = 0; while (p && passos++ < 40) { if (p === n.k) { n.pai = null; break; } p = nos.get(p)?.pai; } }
  for (const n of nos.values()) if (n.pai && nos.has(n.pai)) nos.get(n.pai).filhos.push(n);
  const ord = (a, b) => (b.filhos.length > 0) - (a.filhos.length > 0) || a.nome.localeCompare(b.nome, 'pt-BR');
  for (const n of nos.values()) n.filhos.sort(ord);
  const total = n => n.filhos.reduce((a, f) => a + 1 + total(f), 0);
  for (const n of nos.values()) n.equipe = total(n);
  const raizes = [...nos.values()].filter(n => !n.pai || !nos.has(n.pai)).sort((a, b) => b.equipe - a.equipe || a.nome.localeCompare(b.nome, 'pt-BR'));
  return { nos, raizes, corSetor };
}
function orgCard(n, abertos) {
  const sub = n.filhos.length;
  return `<div class="og-card og-${n.tipo}" data-k="${esc(n.k)}" style="--c:${n.cor}" tabindex="0">
    <div class="og-topo"><span class="og-av">${esc(orgIniciais(n.nome))}</span><div class="og-id"><b>${esc(n.nome)}</b><span>${esc(n.cargo || '—')}</span></div></div>
    <div class="og-pe">${n.tipo === 'colab' ? (n.setor ? `<span class="og-setor">${esc(n.setor)}</span>` : '<span class="og-setor sem">Sem setor</span>') : `<span class="og-setor ext">${n.tipo === 'prestador' ? 'Prestador' : 'Externo'}</span>`}
      ${sub ? `<button type="button" class="og-tg" data-tg="${esc(n.k)}" title="${abertos.has(n.k) ? 'Recolher' : 'Expandir'} equipe">${ico('pessoas')} ${n.equipe}<i>${abertos.has(n.k) ? '−' : '+'}</i></button>` : ''}</div></div>`;
}
function orgArvore(n, abertos, vis) {
  if (vis && !vis.has(n.k)) return '';
  return `<li>${orgCard(n, abertos)}${abertos.has(n.k) ? orgFilhos(n.filhos, abertos, vis, 'Equipe direta') : ''}</li>`;
}
// galhos (quem tem equipe) seguem como árvore; quem não tem equipe vira uma grade compacta abaixo do gestor
function orgFilhos(lista, abertos, vis, rotulo) {
  const fs = lista.filter(f => !vis || vis.has(f.k)); if (!fs.length) return '';
  const temEq = f => f.filhos.some(g => !vis || vis.has(g.k));
  const galhos = fs.filter(temEq), folhas = fs.filter(f => !temEq(f));
  const grade = folhas.length > 3 ? `<li class="og-grupo"><div class="og-grade" style="--cols:${Math.min(4, Math.ceil(Math.sqrt(folhas.length)))}">${rotulo ? `<div class="og-grade-t">${esc(rotulo)} · ${folhas.length}</div>` : ''}${folhas.map(f => orgCard(f, abertos)).join('')}</div></li>` : folhas.map(f => orgArvore(f, abertos, vis)).join('');
  return `<ul>${galhos.map(f => orgArvore(f, abertos, vis)).join('')}${grade}</ul>`;
}
rota('/rh/organograma', async tela => {
  const [cs, cgs, ss] = await Promise.all([colabsRH('&status=in.(ativo,ferias,afastado,aviso_previo,em_admissao)'), cargosL(), setoresL()]);
  const setores = ss.filter(s => s.ativo);
  let M = orgMontar(cs, cgs, setores);
  const abertos = new Set([...M.nos.values()].filter(n => n.filhos.length).map(n => n.k));
  let zoom = 1, filtroSetor = [], busca = '';
  const semGestor = () => cs.filter(c => { const n = M.nos.get('c:' + c.id); return !n.pai; });
  tela.innerHTML = `<div class="topo"><div><h1>Organograma</h1><p class="sub">Monta-se sozinho a partir do gestor imediato de cada pessoa. Clique em alguém para ver detalhes ou trocar o gestor.</p></div>
      <div class="acoes"><button class="btn" data-imp>${ico('documento')} Imprimir / PDF</button></div></div>
    <div class="og-kpis" data-kpis></div>
    <div class="og-wrap"><div class="og-barra">
        <div class="og-busca">${ico('busca')}<input type="search" placeholder="Buscar pessoa ou cargo…" data-busca list="og-nomes"><datalist id="og-nomes">${[...M.nos.values()].map(n => `<option value="${esc(n.nome)}">`).join('')}</datalist></div>
        <div data-fsetor></div>
        <div class="og-zoom"><button type="button" class="btn peq" data-z="-1" title="Diminuir">−</button><span data-zv>100%</span><button type="button" class="btn peq" data-z="1" title="Aumentar">+</button><button type="button" class="btn peq" data-z="0">Ajustar</button></div>
        <div class="og-zoom"><button type="button" class="btn peq" data-tudo="1">Expandir tudo</button><button type="button" class="btn peq" data-tudo="0">Recolher</button></div></div>
      <div class="og-tela" data-tela><div class="og-arvore" data-arv></div></div></div>
    <div class="og-gaveta" data-gaveta hidden></div>`;
  const $arv = $('[data-arv]', tela), $tela = $('[data-tela]', tela), $gav = $('[data-gaveta]', tela);
  // filtro de setor (multi, padrão Todos)
  $('[data-fsetor]', tela).innerHTML = `<form class="filtros og-filtro"><select name="og_setor"><option value="">Todos os setores</option>${setores.map(s => `<option value="${s.id}">${esc(s.nome)}</option>`).join('')}</select></form>`;
  const $ff = $('.og-filtro', tela); multiFiltro($('select', $ff));
  $ff.addEventListener('submit', e => { e.preventDefault(); const v = $('input[name=og_setor]', $ff)?.value || ''; filtroSetor = v ? v.split(',').filter(Boolean) : []; desenhar(); });
  const visiveis = () => {
    if (!filtroSetor.length) return null;
    const vis = new Set();
    for (const n of M.nos.values()) if (n.tipo === 'colab' && filtroSetor.includes(n.setor_id)) { let p = n; while (p) { vis.add(p.k); p = p.pai ? M.nos.get(p.pai) : null; } const desc = x => x.filhos.forEach(f => { vis.add(f.k); desc(f); }); desc(n); }
    return vis;
  };
  const desenhar = () => {
    const vis = visiveis(); const rs = M.raizes.filter(r => !vis || vis.has(r.k));
    const kGestores = [...M.nos.values()].filter(n => n.filhos.length).length, sg = semGestor().length;
    $('[data-kpis]', tela).innerHTML = `<div class="og-kpi"><b>${cs.length}</b><span>pessoas</span></div><div class="og-kpi"><b>${new Set(cs.map(c => c.setor_id).filter(Boolean)).size}</b><span>setores</span></div>
      <div class="og-kpi"><b>${kGestores}</b><span>gestores com equipe</span></div><div class="og-kpi"><b>${[...M.nos.values()].filter(n => n.tipo !== 'colab').length}</b><span>prestadores / externos</span></div>
      <button type="button" class="og-kpi ${sg > 1 ? 'alerta' : ''}" data-semg><b>${sg}</b><span>sem gestor definido ${sg ? '›' : ''}</span></button>`;
    $arv.innerHTML = `<ul class="og-raiz"><li><div class="og-empresa"><img src="logo.png" alt="Verbo Logística"><span>${cs.length} pessoas</span></div>
      ${orgFilhos(rs, abertos, vis, 'Sem gestor definido')}</li></ul>`;
    $arv.style.transform = `scale(${zoom})`; $('[data-zv]', tela).textContent = Math.round(zoom * 100) + '%';
    $('[data-semg]', tela).onclick = listaSemGestor;
    if (busca) destacar(busca, false);
  };
  const ajustar = () => { $arv.style.transform = 'scale(1)'; const w = $arv.scrollWidth, cw = $tela.clientWidth - 40; zoom = Math.max(0.35, Math.min(1, cw / w)); desenhar(); $tela.scrollLeft = ($arv.scrollWidth * zoom - $tela.clientWidth) / 2; };
  const destacar = (t, rolar = true) => {
    $$('.og-card.achado', $arv).forEach(e => e.classList.remove('achado')); if (!t) return;
    const alvo = [...M.nos.values()].filter(n => casaBusca(n.nome + ' ' + n.cargo + ' ' + n.setor, t));
    if (!alvo.length) return;
    let abriu = false; alvo.forEach(n => { let p = n.pai; while (p) { if (!abertos.has(p)) { abertos.add(p); abriu = true; } p = M.nos.get(p)?.pai; } });
    if (abriu) { desenhar(); }
    alvo.forEach(n => $(`.og-card[data-k="${CSS.escape(n.k)}"]`, $arv)?.classList.add('achado'));
    if (rolar) $(`.og-card[data-k="${CSS.escape(alvo[0].k)}"]`, $arv)?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  };
  // gaveta de detalhes
  const abrirGaveta = k => {
    const n = M.nos.get(k); if (!n) return; const pai = n.pai ? M.nos.get(n.pai) : null;
    $gav.innerHTML = `<div class="og-gv-cab" style="--c:${n.cor}"><span class="og-av">${esc(orgIniciais(n.nome))}</span><div><b>${esc(n.nome)}</b><span>${esc(n.cargo || '')}</span></div><button type="button" class="btn peq" data-fg title="Fechar">✕</button></div>
      <div class="og-gv-corpo">
        ${n.tipo === 'colab' ? `<div class="og-gv-l"><span>Setor</span><b>${esc(n.setor || '—')}</b></div><div class="og-gv-l"><span>Situação</span><b>${esc((typeof STATUS_COLAB !== 'undefined' && STATUS_COLAB[n.status]?.[0]) || n.status || '—')}</b></div>
          ${n.admissao ? `<div class="og-gv-l"><span>Admissão</span><b>${dataBR(n.admissao)}</b></div>` : ''}` : `<div class="og-gv-l"><span>Tipo</span><b>${n.tipo === 'prestador' ? 'Fornecedor / prestador de serviço' : 'Pessoa externa'}</b></div>`}
        <div class="og-gv-l"><span>Gestor imediato</span><b>${pai ? `<a href="#" data-ir="${esc(pai.k)}">${esc(pai.nome)}</a>` : '—'}</b></div>
        ${n.tipo === 'colab' && editaRH() ? `<div class="og-gv-sel"><span class="muted">Trocar o gestor imediato</span>${htmlSelPessoas('og_gestor', n.c.gestor ? [n.c.gestor] : [], 'Buscar colaborador, usuário ou fornecedor…', 1)}<button type="button" class="btn peq prim" data-salvag>Salvar gestor</button></div>` : ''}
        <div class="og-gv-l"><span>Equipe direta (${n.filhos.length})${n.equipe > n.filhos.length ? ` · ${n.equipe} no total` : ''}</span>${n.filhos.length ? `<ul>${n.filhos.map(f => `<li><a href="#" data-ir="${esc(f.k)}">${esc(f.nome)}</a> <span class="muted">${esc(f.cargo)}</span></li>`).join('')}</ul>` : '<b>—</b>'}</div>
        ${n.tipo === 'colab' ? `<a class="btn" href="#/rh/colaboradores/ver/${n.id}">Abrir ficha completa</a>` : ''}</div>`;
    $gav.hidden = false;
    $('[data-fg]', $gav).onclick = () => { $gav.hidden = true; };
    $$('[data-ir]', $gav).forEach(a => (a.onclick = e => { e.preventDefault(); const kk = a.dataset.ir; let p = M.nos.get(kk)?.pai; while (p) { abertos.add(p); p = M.nos.get(p)?.pai; } desenhar(); $(`.og-card[data-k="${CSS.escape(kk)}"]`, $arv)?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); abrirGaveta(kk); }));
    if ($('[data-salvag]', $gav)) {
      pessoasOrg().then(ps => ligarSelPessoas($gav, ps.filter(p => p.colaborador_id !== n.id && !(n.c.usuario_id && p.usuario_id === n.c.usuario_id))));
      $('[data-salvag]', $gav).onclick = async () => {
        const g = lerPessoas($('input[name=og_gestor]', $gav).value)[0] || null;
        try { const [r] = await api.alterar('colaboradores', `id=eq.${n.id}`, { gestor: g });
          const c = cs.find(x => x.id === n.id); Object.assign(c, { gestor: r?.gestor ?? g, gestor_colaborador_id: r?.gestor_colaborador_id ?? null });
          M = orgMontar(cs, cgs, setores); if (r?.gestor_colaborador_id) abertos.add('c:' + r.gestor_colaborador_id); else if (g) M.nos.forEach(x => x.filhos.length && abertos.add(x.k));
          aviso(g ? 'Gestor atualizado: o organograma já foi reorganizado.' : 'Gestor removido.'); desenhar(); abrirGaveta(n.k);
        } catch (err) { falha(err); } };
    }
  };
  async function listaSemGestor() {
    const l = semGestor();
    if (!l.length) return aviso('Todas as pessoas têm gestor definido.');
    const r = await modal(`<form><h2>Sem gestor definido (${l.length})</h2><p class="muted">Quem não tem gestor fica no topo, logo abaixo da empresa. Escolha o gestor de cada um; deixe em branco quem é da direção.</p>
      <div class="og-sg">${l.map(c => `<div class="og-sg-l"><div><b>${esc(c.nome)}</b><span class="muted">${esc(M.nos.get('c:' + c.id).cargo)}${M.nos.get('c:' + c.id).setor ? ' · ' + esc(M.nos.get('c:' + c.id).setor) : ''}</span></div>${htmlSelPessoas('g_' + c.id, [], 'Gestor imediato…', 1)}</div>`).join('')}</div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button>${editaRH() ? '<button class="btn prim">Salvar</button>' : ''}</div></form>`,
      { aoAbrir: f => { $('.modal', f).classList.add('modal-largo'); pessoasOrg().then(ps => $$('[data-selpes]', f).forEach(b => { const id = b.dataset.selpes.slice(2); const c = cs.find(x => x.id === id); ligarSelPessoas(b.parentElement, ps.filter(p => p.colaborador_id !== id && !(c?.usuario_id && p.usuario_id === c.usuario_id))); })); } });
    if (!r) return; let ok = 0; const erros = [];
    for (const c of l) { const g = lerPessoas(r['g_' + c.id])[0]; if (!g) continue;
      try { const [x] = await api.alterar('colaboradores', `id=eq.${c.id}`, { gestor: g }); Object.assign(c, { gestor: x?.gestor ?? g, gestor_colaborador_id: x?.gestor_colaborador_id ?? null }); ok++; } catch (err) { erros.push(c.nome + ': ' + (err.message || err)); } }
    M = orgMontar(cs, cgs, setores); M.nos.forEach(x => x.filhos.length && abertos.add(x.k)); desenhar();
    if (erros.length) aviso(erros.join(' · '), true); else if (ok) aviso(`${ok} gestor(es) definido(s). Organograma atualizado.`);
  }
  // eventos
  $arv.addEventListener('click', e => { const t = e.target.closest('[data-tg]'); if (t) { e.stopPropagation(); const k = t.dataset.tg; abertos.has(k) ? abertos.delete(k) : abertos.add(k); desenhar(); return; }
    const c = e.target.closest('.og-card'); if (c && !arrastou) abrirGaveta(c.dataset.k); });
  $arv.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('.og-card')) abrirGaveta(e.target.dataset.k); });
  $$('[data-z]', tela).forEach(b => (b.onclick = () => { const z = Number(b.dataset.z); if (!z) return ajustar(); zoom = Math.max(0.3, Math.min(1.6, zoom + z * 0.1)); desenhar(); }));
  $$('[data-tudo]', tela).forEach(b => (b.onclick = () => { abertos.clear(); if (b.dataset.tudo === '1') M.nos.forEach(n => n.filhos.length && abertos.add(n.k)); else M.raizes.forEach(n => n.filhos.length && abertos.add(n.k)); desenhar(); }));
  let tB; $('[data-busca]', tela).addEventListener('input', e => { clearTimeout(tB); tB = setTimeout(() => { busca = e.target.value.trim(); destacar(busca); }, 250); });
  // arrastar para navegar
  let arrastou = false, ini = null;
  $tela.addEventListener('mousedown', e => { if (e.button || e.target.closest('button,input,a')) return; ini = { x: e.clientX, y: e.clientY, l: $tela.scrollLeft, t: $tela.scrollTop }; arrastou = false; $tela.classList.add('arrastando'); });
  addEventListener('mousemove', e => { if (!ini || !$tela.isConnected) return; const dx = e.clientX - ini.x, dy = e.clientY - ini.y; if (Math.abs(dx) + Math.abs(dy) > 4) arrastou = true; $tela.scrollLeft = ini.l - dx; $tela.scrollTop = ini.t - dy; });
  addEventListener('mouseup', () => { if (ini) { ini = null; $tela.classList.remove('arrastando'); setTimeout(() => (arrastou = false), 0); } });
  $('[data-imp]', tela).onclick = () => { abertos.clear(); M.nos.forEach(n => n.filhos.length && abertos.add(n.k)); zoom = 1; desenhar();
    document.head.insertAdjacentHTML('beforeend', '<style id="og-print">@page { size: A4 landscape; margin: 10mm; }</style>');
    const w = $arv.scrollWidth; const k = Math.min(1, 1050 / w); $arv.style.transform = `scale(${k})`;
    addEventListener('afterprint', () => { document.getElementById('og-print')?.remove(); desenhar(); }, { once: true }); setTimeout(() => window.print(), 100); };
  desenhar(); requestAnimationFrame(ajustar);
});

// ===================== Promoções e cursos (programa de desenvolvimento) =====================
const ST_DES = { ideia: ['Ideia', ''], em_analise: ['Em análise', 'amarelo'], aprovado: ['Aprovado', 'azul'], em_andamento: ['Em andamento', 'azul'], concluido: ['Concluído', 'verde'], cancelado: ['Cancelado', ''] };
rota('/rh/desenvolvimento', async tela => {
  const [its, cs, cgs] = await Promise.all([api.listar('desenvolvimento_itens', 'ativo=eq.true&select=*,colab:colaboradores(id,nome)&order=status,previsao'), colabsRH('&status=in.(ativo,ferias,afastado)'), cargosL()]);
  const trilhas = cgs.filter(c => c.ativo && c.proximo_cargo_id);
  tela.innerHTML = `
    <div class="topo"><div><h1>Promoções e cursos</h1><p class="sub">Programa de desenvolvimento em estruturação — o RH já acompanha ideias, candidatos a promoção e cursos</p></div>${editaRH() ? '<button class="btn prim" id="novo-d">+ Incluir no radar</button>' : ''}</div>
    <div class="cartao alerta-obs">🚧 <b>Programa futuro.</b> Use esta tela para registrar quem tem potencial, cursos desejados e custos estimados. Quando o programa for lançado, as regras (critérios, orçamento, aprovação) serão configuradas aqui.</div>
    <div class="grade" style="margin-bottom:12px">${Object.entries(ST_DES).filter(([k]) => k !== 'cancelado').map(([k, [t]]) => `<div class="cartao kpi"><div class="n">${its.filter(i => i.status === k).length}</div><div class="r">${t}</div></div>`).join('')}
      <div class="cartao kpi"><div class="n">${brl(its.filter(i => !['cancelado', 'concluido'].includes(i.status)).reduce((a, i) => a + Number(i.custo_estimado || 0), 0))}</div><div class="r">custo estimado em aberto</div></div></div>
    <div class="cartao"><h2>Radar</h2>${its.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Tipo</th><th>Título</th><th>Colaborador</th><th>Para o cargo</th><th>Previsão</th><th>Custo</th><th>Prioridade</th><th>Situação</th></tr></thead><tbody>
      ${its.map(i => `<tr class="${editaRH() ? 'clicavel' : ''}" data-i="${i.id}"><td data-r="Tipo">${esc(i.tipo)}</td><td data-r="Título"><b>${esc(i.titulo)}</b></td><td data-r="Colaborador">${esc(i.colab?.nome || '—')}</td>
        <td data-r="Cargo">${esc(cgs.find(c => c.id === i.cargo_pretendido_id)?.nome || '—')}</td><td data-r="Previsão">${dataBR(i.previsao) || '—'}</td><td data-r="Custo">${i.custo_estimado != null ? brl(i.custo_estimado) : '—'}</td>
        <td data-r="Prioridade">${{ baixa: 'Baixa', media: 'Média', alta: 'Alta' }[i.prioridade]}</td><td data-r="Situação"><span class="tag ${ST_DES[i.status][1]}">${ST_DES[i.status][0]}</span></td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Nada no radar ainda.</div>'}</div>
    <div class="cartao"><h2>Plano de carreira (trilhas por cargo)</h2>${trilhas.length ? `<ul class="lista-simples">${trilhas.map(c => `<li><span><b>${esc(c.nome)}</b> → ${esc(cgs.find(x => x.id === c.proximo_cargo_id)?.nome || '')}</span><span class="muted">${esc(c.requisitos_promocao || '')}</span></li>`).join('')}</ul>`
      : '<p class="muted">Nenhuma trilha definida. Em Cargos e funções, informe o "próximo cargo" e os requisitos para promoção.</p>'}</div>
    ${avisoLei('promocao')}`;
  const editar = async i => {
    const r = await modal(`<form><h2>${i ? 'Editar' : 'Incluir no radar'}</h2><div class="form">
      <label class="campo">Tipo<select name="tipo" data-valor="${esc(i?.tipo || '')}">${['Promoção', 'Curso', 'Bolsa de estudo', 'Certificação', 'Mentoria', 'Outro'].map(x => `<option ${x === i?.tipo ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <label class="campo largo">Título *<input name="titulo" required value="${esc(i?.titulo || '')}" placeholder="Ex.: Curso de MOPP para 3 motoristas"></label>
      <label class="campo">Colaborador<select name="colaborador_id"><option value="">— vários / ainda não definido —</option>${cs.map(c => `<option value="${c.id}" ${c.id === i?.colaborador_id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></label>
      <label class="campo">Cargo pretendido<select name="cargo_pretendido_id"><option value="">—</option>${cgs.filter(c => c.ativo).map(c => `<option value="${c.id}" ${c.id === i?.cargo_pretendido_id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></label>
      <label class="campo">Previsão<input type="date" name="previsao" value="${i?.previsao || ''}"></label><label class="campo">Custo estimado (R$)<input name="custo_estimado" inputmode="decimal" value="${i?.custo_estimado ?? ''}"></label>
      <label class="campo">Prioridade<select name="prioridade">${[['baixa', 'Baixa'], ['media', 'Média'], ['alta', 'Alta']].map(([k, t]) => `<option value="${k}" ${k === (i?.prioridade || 'media') ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo">Situação<select name="status">${Object.entries(ST_DES).map(([k, [t]]) => `<option value="${k}" ${k === (i?.status || 'ideia') ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo largo">Descrição / justificativa<textarea name="descricao" rows="3">${esc(i?.descricao || '')}</textarea></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`);
    if (!r) return;
    const dados = { tipo: r.tipo, titulo: r.titulo, colaborador_id: r.colaborador_id || null, cargo_pretendido_id: r.cargo_pretendido_id || null, previsao: r.previsao || null,
      custo_estimado: num(r.custo_estimado), prioridade: r.prioridade, status: r.status, descricao: r.descricao || null };
    try { if (i) await api.alterar('desenvolvimento_itens', `id=eq.${i.id}`, dados); else await api.inserir('desenvolvimento_itens', dados); navegar(); } catch (err) { falha(err); }
  };
  $('#novo-d')?.addEventListener('click', () => editar(null));
  if (editaRH()) $$('[data-i]', tela).forEach(tr => tr.onclick = () => editar(its.find(i => i.id === tr.dataset.i)));
});
