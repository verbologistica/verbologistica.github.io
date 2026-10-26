// Verbo Gestão — Processo da multa de trânsito: financeiro → indicação do condutor → termo de desconto → DP
'use strict';

const ETAPA_MULTA = { documentos: ['Aguardando documentos', 'amarelo'], dp: ['Enviada ao DP', 'verde'], cancelada: ['Cancelada', ''] };
const ANX_IND = 'Indicação do condutor', ANX_TERMO = 'Termo de desconto assinado', ANX_OUTRO = 'Comprovante de responsabilidade';
const podeMulta = () => tem('administrador', 'operacao', 'dp');

Object.assign(LEI, {
  desconto_multa: ['Desconto de multa no salário — CLT art. 462', [
    'O desconto só é permitido quando o condutor <b>agiu com culpa e há previsão em contrato/termo assinado</b>, ou quando agiu com <b>dolo</b> (CLT art. 462, §1º). Multa por falha do veículo, documentação ou ordem da empresa é da empresa.',
    'O termo assinado pelo colaborador define o valor e em qual(is) folha(s) será descontado. Parcelar evita comprometer o salário do mês.',
    'Na rescisão, o saldo ainda não descontado só pode ser abatido até o limite de <b>um mês de remuneração</b> (CLT art. 477, §5º).',
    '<b>Sem indicação do condutor</b>: pelo contrato com a locadora, a multa é cobrada da empresa <b>em dobro</b>, e o desconto passa a ser o dobro. Só é válido se a falta de indicação ocorreu por responsabilidade do colaborador (ex.: não assinou nem devolveu a indicação no prazo) — registre o motivo.',
    'Regra da Verbo: todo desconto ao colaborador precisa da <b>aprovação do jurídico</b> antes de ir para a folha.']],
});

// ---------- valor por extenso (reais) ----------
function extensoReais(v) {
  const u = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const d = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const c = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  const ate999 = n => { if (n === 100) return 'cem'; const p = []; if (n >= 100) { p.push(c[Math.floor(n / 100)]); n %= 100; }
    if (n >= 20) { p.push(d[Math.floor(n / 10)]); n %= 10; } if (n > 0) p.push(u[n]); return p.join(' e '); };
  const inteiro = n => { if (n === 0) return 'zero'; const mil = Math.floor(n / 1000), r = n % 1000, p = [];
    if (mil) p.push(mil === 1 ? 'mil' : ate999(mil) + ' mil'); if (r) p.push(ate999(r)); return p.join(r && (r < 100 || r % 100 === 0) ? ' e ' : ' '); };
  const cent = Math.round(Number(v || 0) * 100), re = Math.floor(cent / 100), ce = cent % 100;
  const a = re ? inteiro(re) + (re === 1 ? ' real' : ' reais') : '', b = ce ? inteiro(ce) + (ce === 1 ? ' centavo' : ' centavos') : '';
  return [a, b].filter(Boolean).join(' e ') || 'zero real';
}
const mesAnoBR = iso => { const [a, m] = String(iso).split('-'); return `${MESES_EXT[Number(m) - 1]}/${a}`; };
const proxMeses = (n = 14) => { const r = [], d = new Date(); d.setDate(1); for (let i = 0; i < n; i++) { r.push(d.toISOString().slice(0, 8) + '01'); d.setMonth(d.getMonth() + 1); } return r; };

// ---------- termo de desconto (2 vias, papel timbrado) ----------
async function gerarTermoMulta(o) {
  const ctx = await contextoDocumento(o.colaborador_id, null, { nome: o.aplicador_nome || estado.usuario.nome, cargo: o.aplicador_cargo || '' });
  const col = ctx.colaborador || { nome: o.m?.nome || '' };
  const plano = o.desconto_plano || [];
  const e = ctx.empresa || {};
  const linha = (k, v) => `<tr><td style="padding:3px 10px 3px 0;color:#6b7378;white-space:nowrap">${k}</td><td style="padding:3px 0"><b>${v || '__________'}</b></td></tr>`;
  const forma = o.desconto_tipo === 'parcelado' && plano.length > 1
    ? `em <b>${plano.length} parcelas</b>, descontadas nas folhas de pagamento abaixo:</p>
       <table style="width:100%;border:1px solid #c9ced2;margin:6px 0 10px"><tr style="background:#eef1f3"><th style="text-align:left;padding:5px 8px">Parcela</th><th style="text-align:left;padding:5px 8px">Folha de pagamento (competência)</th><th style="text-align:right;padding:5px 8px">Valor</th></tr>
       ${plano.map((p, i) => `<tr><td style="padding:4px 8px;border-top:1px solid #e1e4e6">${i + 1}ª</td><td style="padding:4px 8px;border-top:1px solid #e1e4e6">${esc(mesAnoBR(p.competencia))}</td><td style="padding:4px 8px;border-top:1px solid #e1e4e6;text-align:right">${brl(p.valor)}</td></tr>`).join('')}</table><p>`
    : `de uma só vez, na folha de pagamento de <b>${esc(mesAnoBR(plano[0]?.competencia || hojeISO()))}</b>.`;
  const via = n => `
    <div style="${n === 2 ? 'page-break-before:always;' : ''}text-align:right;font-size:9pt;color:#6b7378;margin-bottom:4px"><b>${n}ª via — ${n === 1 ? 'Colaborador' : 'Empresa'}</b></div>
    <h2 style="text-align:center;margin:0 0 4px">TERMO DE CIÊNCIA E AUTORIZAÇÃO DE DESCONTO</h2>
    <p style="text-align:center;margin:0 0 12px;color:#6b7378">Multa de trânsito · ${esc(o.numero)}${o.auto_infracao ? ' · Auto de infração ' + esc(o.auto_infracao) : ''}</p>
    <table style="width:100%;margin-bottom:8px">${linha('Empresa', esc(e.razao_social || e.nome_fantasia || 'Verbo Logística') + (e.cnpj ? ' · CNPJ ' + esc(e.cnpj) : ''))}
      ${linha('Colaborador(a)', esc(col.nome) + (col.cpf ? ' · CPF ' + esc(col.cpf) : ''))}${linha('Função / matrícula', esc([col.cargo, col.matricula && 'matr. ' + col.matricula].filter(Boolean).join(' · ')))}
      ${linha('CNH', esc([o.cnh_numero, o.cnh_categoria && 'cat. ' + o.cnh_categoria, o.cnh_uf].filter(Boolean).join(' · ')))}</table>
    <h3 style="margin:10px 0 4px">Dados da infração</h3>
    <table style="width:100%">${linha('Auto de infração', esc(o.auto_infracao))}${linha('Órgão autuador', esc(o.orgao_autuador))}${linha('Data e hora', dataHoraBR(o.data_hora))}
      ${linha('Local', esc(o.local))}${linha('Enquadramento', esc(o.enquadramento) + (o.pontos ? ` · ${o.pontos} ponto(s)` : ''))}${linha('Veículo', esc([o.placa, o.eq?.codigo_frota && 'frota ' + o.eq.codigo_frota].filter(Boolean).join(' · ')))}
      ${linha('Valor da multa', brl(o.valor_multa))}</table>
    ${o.sem_indicacao ? `<p style="text-align:justify;margin-top:12px">Declaro que eu conduzia o veículo acima no dia e hora da infração e que tive a oportunidade de apresentar a minha versão dos fatos.
      <b>Não houve indicação do condutor</b> ao órgão autuador${o.motivo_sem_indicacao ? ` (motivo: ${esc(o.motivo_sem_indicacao)})` : ''}. Estou ciente de que, pelo contrato de locação do veículo, nesse caso a locadora cobra da empresa
      <b>o valor da multa em dobro</b>: 2 × ${brl(o.valor_multa)} = <b>${brl(Number(o.valor_multa) * 2)}</b>.` : `<p style="text-align:justify;margin-top:12px">Declaro que eu conduzia o veículo acima no dia e hora da infração, que fui indicado(a) como condutor(a) infrator(a) junto ao órgão autuador e que tive a oportunidade de apresentar a minha versão dos fatos.`}
      Reconheço que a infração decorreu de conduta minha, e não de falha do veículo, da documentação ou de ordem da empresa.</p>
    <p style="text-align:justify">Assim, nos termos do <b>art. 462, §1º, da CLT</b> e do meu contrato de trabalho, <b>autorizo</b> a empresa a descontar da minha remuneração o valor de
      <b>${brl(o.desconto_valor)}</b> (${esc(extensoReais(o.desconto_valor))}), ${forma}</p>
    <p style="text-align:justify">Se o meu contrato de trabalho terminar antes da quitação, autorizo o desconto do saldo nas verbas rescisórias, respeitado o limite do art. 477, §5º, da CLT.
      Este termo não impede a apresentação de defesa ou recurso ao órgão autuador: se a multa for cancelada ou reduzida, a diferença já descontada será devolvida.</p>
    <p style="margin-top:14px">${esc((e.cidade || '') ? e.cidade + ', ' : '')}${esc(ctx.hoje_extenso)}.</p>
    <table style="width:100%;margin-top:34px"><tr>
      <td style="width:50%;padding-right:14px;text-align:center"><div style="border-top:1px solid #252e35;padding-top:4px"><b>${esc(col.nome)}</b><br><span style="color:#6b7378">Colaborador(a) / condutor(a)${col.cpf ? ' · CPF ' + esc(col.cpf) : ''}</span></div></td>
      <td style="width:50%;padding-left:14px;text-align:center"><div style="border-top:1px solid #252e35;padding-top:4px"><b>${esc(o.aplicador_nome || '')}</b><br><span style="color:#6b7378">Responsável pela aplicação${o.aplicador_cargo ? ' · ' + esc(o.aplicador_cargo) : ''}</span></div></td></tr>
      <tr><td style="padding:34px 14px 0 0;text-align:center"><div style="border-top:1px solid #252e35;padding-top:4px;color:#6b7378">Testemunha 1 · nome e CPF</div></td>
      <td style="padding:34px 0 0 14px;text-align:center"><div style="border-top:1px solid #252e35;padding-top:4px;color:#6b7378">Testemunha 2 · nome e CPF</div></td></tr></table>`;
  abrirParaImprimir(paginaDocumento('Termo de desconto ' + o.numero, via(1) + via(2), ctx, 'DP-TER-MULTA · ' + o.numero));
}

// ---------- bloco do processo na tela da ocorrência ----------
async function blocoProcessoMulta(o) {
  const anx = await api.listar('anexos', `entidade=eq.ocorrencia_operacional&entidade_id=eq.${o.id}&cancelado_em=is.null&order=enviado_em`).catch(() => []);
  const de = t => anx.filter(a => a.descricao === t);
  const tit = o.titulo_id ? await api.um('titulos', `id=eq.${o.titulo_id}&select=id,numero,status,valor_total,descricao`).catch(() => null) : null;
  const temInd = de(ANX_IND).length > 0 || !!o.sem_indicacao, temTermo = de(ANX_TERMO).length > 0;
  const plano = o.desconto_plano || [];
  const dadosOk = !!(o.colaborador_id && o.auto_infracao && o.orgao_autuador && o.enquadramento && o.local && (o.placa || o.equipamento_id)
    && o.desconto_tipo && Number(o.desconto_valor) > 0 && plano.length && o.aplicador_nome && o.condutor_ouvido && o.juridico_ok);
  const aberto = o.multa_etapa === 'documentos', pode = podeMulta() && aberto;
  const dias = o.prazo_documentos ? diasAte(o.prazo_documentos) : null;
  const passo = (n, ok, t, sub) => `<li class="mt-passo ${ok ? 'ok' : ''}"><span class="mt-n">${ok ? '✓' : n}</span><span><b>${t}</b><small>${sub}</small></span></li>`;
  const lista = arr => arr.length ? arr.map(a => `<span class="mt-anx"><span class="anexo" data-arquivo="${esc(a.caminho_arquivo)}">📄 ${esc(a.nome_original || 'arquivo')} <span class="muted">· ${dataHoraBR(a.enviado_em)}</span></span>${pode ? `<button type="button" class="mt-rem" data-rem-anx="${a.id}" title="Remover este anexo" aria-label="Remover este anexo">✕</button>` : ''}</span>`).join('') : '<span class="muted">Nada anexado</span>';
  const botaoAnx = (desc, rot, prim) => pode ? `<label class="btn peq ${prim ? 'prim' : ''}">${rot}<input type="file" hidden multiple accept="image/*,application/pdf" data-anx="${esc(desc)}"></label>` : '';
  return `<div class="cartao mt-proc">
    <div class="topo" style="margin:0 0 8px;flex-wrap:wrap;gap:8px"><div><h2 style="margin:0">Processo de desconto da multa</h2>
      <p class="sub" style="margin:2px 0 0">${tagSt(ETAPA_MULTA, o.multa_etapa)}${tit ? ` · lançada no financeiro em <a href="#/financeiro/pagar/ver/${tit.id}">${esc(tit.numero)}</a>` : ''}
        ${aberto && dias != null ? ` · <span class="tag ${dias < 0 ? 'vermelho' : dias <= 1 ? 'amarelo' : 'azul'}">${dias < 0 ? `prazo dos documentos vencido há ${-dias} dia(s)` : dias === 0 ? 'prazo dos documentos: hoje' : `documentos até ${dataBR(o.prazo_documentos)} (${dias} dia(s))`}</span>` : ''}</p></div>
      <div class="acoes">${o.colaborador_id && o.desconto_valor && plano.length ? '<button class="btn" id="mt-termo">⬇ Termo de desconto (2 vias)</button>' : ''}
        ${podeMulta() && o.multa_etapa !== 'cancelada' ? '<button class="btn perigo" id="mt-cancelar">Cancelar processo</button>' : ''}</div></div>
    <ol class="mt-passos">${passo(1, temInd, 'Indicação do condutor', o.sem_indicacao ? 'sem indicação · desconto em dobro' : 'anexar preenchida e assinada')}${passo(2, dadosOk, 'Dados e forma de desconto', 'condutor, infração, folha(s)')}
      ${passo(3, temTermo, 'Termo de desconto assinado', 'colaborador e responsável')}${passo(4, o.multa_etapa === 'dp', 'DP', 'desconto na folha')}</ol>
    ${o.multa_etapa === 'cancelada' ? `<div class="cartao alerta-obs" style="margin:10px 0 0">Cancelado em ${dataHoraBR(o.cancelado_em)}: <b>${esc(o.motivo_cancelamento || '')}</b></div>` : ''}
    ${o.multa_etapa === 'dp' ? `<div class="conferencia" style="margin:10px 0 0">Finalizado em ${dataHoraBR(o.finalizado_em)}. O DP desconta ${plano.length > 1 ? `em ${plano.length} parcelas: ` : 'na folha de '}${plano.map(p => `<b>${esc(mesAnoBR(p.competencia))}</b> ${brl(p.valor)}`).join(' · ')}.</div>` : ''}
    <div class="mt-sec"><h3>1 · Indicação do condutor ${o.sem_indicacao ? '' : botaoAnx(ANX_IND, '📎 Anexar indicação assinada', !temInd)}
        ${pode && !o.sem_indicacao && !de(ANX_IND).length ? '<button type="button" class="btn peq" id="mt-sem-ind">Não haverá indicação do condutor</button>' : ''}</h3>
      ${o.sem_indicacao ? `<div class="cartao alerta-obs" style="margin:0 0 8px"><b>Sem indicação do condutor</b> — pelo contrato com a locadora a multa é cobrada em dobro:
          o desconto passa a ser <b>${brl(Number(o.valor_multa || 0) * 2)}</b> (2 × ${brl(o.valor_multa)}).${o.motivo_sem_indicacao ? `<br><span class="muted">Motivo: ${esc(o.motivo_sem_indicacao)}</span>` : ''}
          ${pode ? '<div style="margin-top:6px"><button type="button" class="btn peq" id="mt-com-ind">Desfazer: vai haver indicação</button></div>' : ''}</div>` : `<div class="anexos">${lista(de(ANX_IND))}</div>`}
      ${pode && !temInd ? '<p class="muted" style="margin:6px 0 0">Comece por aqui: anexe o formulário de indicação do condutor preenchido e assinado — ou informe que não haverá indicação (o desconto passa a ser o dobro da multa). Depois os campos abaixo são liberados.</p>' : ''}</div>
    <form id="mt-f" class="mt-sec"><h3>2 · Dados da indicação e forma de desconto</h3>
      <fieldset ${pode && temInd ? '' : 'disabled'} style="border:0;padding:0;margin:0"><div class="form">
        <label class="campo largo">Condutor (colaborador) *<select name="colaborador_id"><option value="">Selecione…</option></select></label>
        <label class="campo">CNH nº<input name="cnh_numero" value="${esc(o.cnh_numero || '')}"></label>
        <label class="campo">Categoria<input name="cnh_categoria" value="${esc(o.cnh_categoria || '')}" maxlength="3"></label>
        <label class="campo">UF da CNH<input name="cnh_uf" value="${esc(o.cnh_uf || '')}" maxlength="2" style="text-transform:uppercase"></label>
        <label class="campo">Validade da CNH<input type="date" name="cnh_validade" value="${o.cnh_validade || ''}"></label>
        <label class="campo">Auto de infração *<input name="auto_infracao" value="${esc(o.auto_infracao || '')}"></label>
        <label class="campo">Órgão autuador *<input name="orgao_autuador" value="${esc(o.orgao_autuador || '')}" placeholder="PRF, Detran-MS, DER…"></label>
        <label class="campo">Data e hora da infração *<input type="datetime-local" name="data_hora" value="${dtLocal(o.data_hora)}"></label>
        <label class="campo">Local *<input name="local" value="${esc(o.local || '')}" placeholder="Rodovia, km, cidade"></label>
        <label class="campo">Enquadramento (CTB) *<input name="enquadramento" value="${esc(o.enquadramento || '')}" placeholder="Ex.: art. 218, I"></label>
        <label class="campo">Pontos<input type="number" name="pontos" value="${o.pontos ?? ''}"></label>
        <label class="campo">Placa *<input name="placa" value="${esc(o.placa || '')}" style="text-transform:uppercase"></label>
        <label class="campo">Valor da multa *<input name="valor_multa" inputmode="decimal" value="${o.valor_multa ?? ''}"></label>
        <label class="campo">Notificação recebida em<input type="date" name="notificacao_recebida_em" value="${o.notificacao_recebida_em || ''}"></label>
        <label class="campo">Indicação enviada ao órgão em<input type="date" name="indicacao_enviada_em" value="${o.indicacao_enviada_em || ''}"></label>
        <label class="campo">Protocolo da indicação<input name="indicacao_protocolo" value="${esc(o.indicacao_protocolo || '')}"></label>
        <label class="campo largo">Versão do condutor (o que ele disse)<textarea name="versao_condutor" rows="2">${esc(o.versao_condutor || '')}</textarea></label>
        <div class="largo mt-desc"><h3 style="margin:4px 0 6px">Forma de desconto</h3>${avisoLei('desconto_multa')}</div>
        <label class="campo">Forma *<select name="desconto_tipo" data-nativo><option value="integral" ${o.desconto_tipo !== 'parcelado' ? 'selected' : ''}>Valor integral (uma folha)</option><option value="parcelado" ${o.desconto_tipo === 'parcelado' ? 'selected' : ''}>Parcelado</option></select></label>
        <label class="campo">Valor a descontar *<input name="desconto_valor" inputmode="decimal" value="${o.sem_indicacao ? Number(o.valor_multa || 0) * 2 : o.desconto_valor ?? o.valor_multa ?? ''}" ${o.sem_indicacao ? 'readonly title="Dobro da multa (sem indicação do condutor)"' : ''}>${o.sem_indicacao ? '<span class="muted">dobro da multa · sem indicação do condutor</span>' : ''}</label>
        <label class="campo" id="mt-np">Nº de parcelas<input type="number" name="parcelas" min="2" max="12" value="${plano.length > 1 ? plano.length : 2}"></label>
        <label class="campo">${'1ª folha (competência) *'}<select name="inicio" data-nativo>${proxMeses().map(m => `<option value="${m}" ${m === (plano[0]?.competencia || proxMeses(2)[1]) ? 'selected' : ''}>${esc(mesAnoBR(m))}</option>`).join('')}</select></label>
        <div class="largo" id="mt-plano"></div>
        <label class="campo">Responsável pela aplicação *<input name="aplicador_nome" value="${esc(o.aplicador_nome || estado.usuario.nome)}"></label>
        <label class="campo">Cargo do responsável<input name="aplicador_cargo" value="${esc(o.aplicador_cargo || '')}"></label>
        <label class="check largo"><input type="checkbox" name="condutor_ouvido" ${o.condutor_ouvido ? 'checked' : ''}> O condutor foi ouvido e a versão dele está registrada *</label>
        <label class="check largo"><input type="checkbox" name="juridico_ok" ${o.juridico_ok ? 'checked' : ''}> O jurídico analisou e aprovou o desconto *</label>
        <label class="campo largo">Quem do jurídico aprovou (nome, data ou nº do parecer) <span class="muted">· opcional</span><input name="juridico_info" value="${esc(o.juridico_info || '')}"></label>
      </div>
      ${pode && temInd ? '<div class="acoes" style="margin-top:10px"><button class="btn prim" value="salvar">Salvar dados</button><button class="btn" value="termo">Salvar e baixar o termo (2 vias)</button></div>' : ''}</fieldset></form>
    <div class="mt-sec"><h3>3 · Termo de desconto assinado ${botaoAnx(ANX_TERMO, '📎 Anexar termo assinado', dadosOk && !temTermo)}</h3><div class="anexos">${lista(de(ANX_TERMO))}</div>
      <h3 style="margin-top:12px">Outros comprovantes (opcional) ${botaoAnx(ANX_OUTRO, '📎 Anexar')}</h3><div class="anexos">${lista(de(ANX_OUTRO))}</div></div>
    ${pode ? `<div class="acoes" style="margin-top:12px;justify-content:flex-end"><button class="btn prim" id="mt-finalizar" ${temInd && dadosOk && temTermo ? '' : 'disabled title="Complete as 3 etapas para finalizar"'}>Finalizar e enviar ao DP</button></div>` : ''}
  </div>`;
}

async function ligarProcessoMulta(raiz, o) {
  const f = $('#mt-f', raiz);
  // condutor: lista de colaboradores, CNH vem do cadastro quando possível
  const cols = await api.listar('v_colaboradores_basico', 'select=id,nome,cargo,motorista,cnh_categoria,cnh_validade&order=nome').catch(() => []);
  f.colaborador_id.innerHTML = '<option value="">Selecione…</option>' + cols.map(c => `<option value="${c.id}" ${c.id === o.colaborador_id ? 'selected' : ''}>${esc(c.nome)}${c.cargo ? ' · ' + esc(c.cargo) : ''}</option>`).join('');
  f.colaborador_id.addEventListener('change', async () => {
    const c = cols.find(x => x.id === f.colaborador_id.value); if (!c) return;
    const full = await api.um('colaboradores', `id=eq.${c.id}&select=cnh_numero,cnh_categoria,cnh_uf,cnh_validade`).catch(() => null);
    const set = (n, v) => { if (v && !f[n].value) f[n].value = v; };
    set('cnh_numero', full?.cnh_numero); set('cnh_categoria', full?.cnh_categoria || c.cnh_categoria); set('cnh_uf', full?.cnh_uf); set('cnh_validade', full?.cnh_validade || c.cnh_validade);
  });
  // plano de desconto (folhas)
  let manual = (o.desconto_plano || []).length ? o.desconto_plano.map(p => ({ ...p })) : null;
  const montar = () => {
    const tot = num(f.desconto_valor.value) || 0, parc = f.desconto_tipo.value === 'parcelado' ? Math.max(2, Math.min(12, Number(f.parcelas.value) || 2)) : 1;
    $('#mt-np', raiz).hidden = parc === 1;
    const meses = proxMeses(24), i0 = Math.max(0, meses.indexOf(f.inicio.value));
    const base = Math.floor(tot / parc * 100) / 100;
    const auto = Array.from({ length: parc }, (_, i) => ({ competencia: meses[i0 + i], valor: i === parc - 1 ? Math.round((tot - base * (parc - 1)) * 100) / 100 : base }));
    const p = manual && manual.length === parc && manual[0].competencia === auto[0].competencia ? manual.map((m, i) => ({ competencia: auto[i].competencia, valor: m.valor })) : auto;
    manual = p;
    const soma = p.reduce((a, x) => a + Number(x.valor || 0), 0);
    $('#mt-plano', raiz).innerHTML = `<table class="mt-tab"><thead><tr><th>Parcela</th><th>Folha de pagamento</th><th class="num">Valor</th></tr></thead><tbody>
      ${p.map((x, i) => `<tr><td>${i + 1}ª</td><td>${esc(mesAnoBR(x.competencia))}</td><td class="num"><input data-pv="${i}" inputmode="decimal" value="${String(x.valor).replace('.', ',')}" style="width:110px;text-align:right" ${f.closest('fieldset')?.disabled ? 'disabled' : ''}></td></tr>`).join('')}
      <tr><td colspan="2"><b>Total</b></td><td class="num"><b class="${Math.abs(soma - tot) > .005 ? 'erro-txt' : ''}">${brl(soma)}</b></td></tr></tbody></table>
      ${Math.abs(soma - tot) > .005 ? `<div class="erro-txt">A soma das parcelas (${brl(soma)}) precisa ser igual ao valor a descontar (${brl(tot)}).</div>` : ''}`;
    $$('[data-pv]', raiz).forEach(inp => inp.addEventListener('change', () => { manual[Number(inp.dataset.pv)].valor = num(inp.value) || 0; montar(); }));
  };
  ['desconto_tipo', 'parcelas', 'inicio'].forEach(n => f[n].addEventListener('change', () => { manual = null; montar(); }));
  f.desconto_valor.addEventListener('change', () => { manual = null; montar(); });
  if (o.sem_indicacao) f.valor_multa.addEventListener('change', () => { f.desconto_valor.value = String(Math.round((num(f.valor_multa.value) || 0) * 200) / 100).replace('.', ','); manual = null; montar(); });
  montar();
  const salvar = async () => {
    const d = formDados(f);
    const dados = { colaborador_id: d.colaborador_id || null, cnh_numero: d.cnh_numero || null, cnh_categoria: (d.cnh_categoria || '').toUpperCase() || null, cnh_uf: (d.cnh_uf || '').toUpperCase() || null,
      cnh_validade: d.cnh_validade || null, auto_infracao: d.auto_infracao || null, orgao_autuador: d.orgao_autuador || null, data_hora: d.data_hora ? new Date(d.data_hora).toISOString() : o.data_hora,
      local: d.local || null, enquadramento: d.enquadramento || null, pontos: d.pontos ? Number(d.pontos) : null, placa: (d.placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '') || null,
      valor_multa: num(d.valor_multa), notificacao_recebida_em: d.notificacao_recebida_em || null, indicacao_enviada_em: d.indicacao_enviada_em || null, indicacao_protocolo: d.indicacao_protocolo || null,
      versao_condutor: d.versao_condutor || null, desconto_tipo: d.desconto_tipo, desconto_valor: num(d.desconto_valor), desconto_plano: manual,
      aplicador_nome: d.aplicador_nome || null, aplicador_cargo: d.aplicador_cargo || null, condutor_ouvido: !!d.condutor_ouvido, juridico_ok: !!d.juridico_ok, juridico_info: d.juridico_info || null };
    if (o.sem_indicacao) dados.desconto_valor = Math.round((dados.valor_multa || 0) * 200) / 100;
    else if (dados.desconto_valor > dados.valor_multa) throw new Error('O valor a descontar não pode ser maior que o valor da multa.');
    const [n] = await api.alterar('ocorrencias_operacionais', `id=eq.${o.id}`, dados);
    return n;
  };
  f.onsubmit = async e => { e.preventDefault(); const ac = e.submitter?.value;
    await ocupado(e.submitter, async () => { try {
      const n = await salvar(); aviso('Dados salvos.');
      if (ac === 'termo') { if (!n.colaborador_id || !n.desconto_valor || !(n.desconto_plano || []).length) return aviso('Escolha o condutor e a forma de desconto para gerar o termo.', true);
        await gerarTermoMulta({ ...o, ...n, eq: o.eq }); }
      navegar();
    } catch (err) { falha(err); } }); };
  $$('[data-anx]', raiz).forEach(inp => inp.addEventListener('change', async () => {
    if (!inp.files.length) return;
    try { await anexar('ocorrencia_operacional', o.id, [...inp.files], inp.dataset.anx); aviso('Anexado.'); navegar(); } catch (err) { falha(err); } }));
  $('#mt-termo', raiz)?.addEventListener('click', () => gerarTermoMulta(o).catch(falha));
  $$('[data-rem-anx]', raiz).forEach(b => b.addEventListener('click', async e => { e.stopPropagation();
    if (!await confirmar('Remover este anexo do processo?', { botao: 'Remover' })) return;
    try { await api.rpc('remover_anexo_multa', { p_anexo: b.dataset.remAnx }); aviso('Anexo removido.'); navegar(); } catch (err) { falha(err); } }));
  $('#mt-sem-ind', raiz)?.addEventListener('click', async () => {
    const dobro = Math.round(Number(o.valor_multa || 0) * 200) / 100;
    const r = await modal(`<form><h2>Não haverá indicação do condutor</h2>
      <p>Pelo contrato com a locadora, sem a indicação a multa é cobrada <b>em dobro</b>. O desconto deste processo passa a ser <b>${brl(dobro)}</b> (2 × ${brl(o.valor_multa)}) e o termo de desconto sai com esse valor.</p>
      <p class="muted">O desconto do valor em dobro só se justifica se a falta de indicação foi por responsabilidade do colaborador. As demais etapas continuam iguais.</p>
      <label class="campo">Motivo de não haver indicação *<textarea name="motivo" rows="3" required placeholder="Ex.: o condutor não assinou a indicação dentro do prazo"></textarea></label>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Confirmar: sem indicação</button></div></form>`,
      { validar: d => !d.motivo ? 'Informe o motivo.' : null });
    if (!r) return;
    try { await api.alterar('ocorrencias_operacionais', `id=eq.${o.id}`, { sem_indicacao: true, motivo_sem_indicacao: r.motivo, desconto_valor: dobro, desconto_plano: null });
      aviso('Registrado: sem indicação do condutor — desconto em dobro.'); navegar(); } catch (err) { falha(err); } });
  $('#mt-com-ind', raiz)?.addEventListener('click', async () => {
    if (!await confirmar('Voltar a exigir o anexo da indicação do condutor? O valor a descontar volta a ser o da multa.', { botao: 'Confirmar' })) return;
    try { await api.alterar('ocorrencias_operacionais', `id=eq.${o.id}`, { sem_indicacao: false, motivo_sem_indicacao: null, desconto_valor: o.valor_multa, desconto_plano: null });
      navegar(); } catch (err) { falha(err); } });
  $('#mt-finalizar', raiz)?.addEventListener('click', async () => {
    if (!await confirmar('Finalizar e enviar ao DP? Depois disso o processo não pode mais ser editado — apenas cancelado com justificativa.', { botao: 'Finalizar' })) return;
    try { await api.rpc('finalizar_multa', { p_id: o.id }); aviso('Processo finalizado e enviado ao DP.'); navegar(); } catch (err) { falha(err); } });
  $('#mt-cancelar', raiz)?.addEventListener('click', async () => {
    const motivo = await confirmar('Cancelar o processo desta multa?', { comMotivo: true, botao: 'Cancelar processo' }); if (!motivo) return;
    try { const r = await api.rpc('cancelar_multa', { p_id: o.id, p_motivo: motivo }); aviso(r || 'Cancelado.'); navegar(); } catch (err) { falha(err); } });
}

// ---------- DP: descontos de multas ----------
rota('/dp/multas', async tela => {
  const ver = estado.params.get('ver') || 'dp';
  const os = await api.listar('ocorrencias_operacionais', `ativo=eq.true&multa_etapa=${ver === 'todas' ? 'not.is.null' : 'eq.' + ver}&select=*,m:colaboradores(nome),eq:equipamentos(codigo_frota)&order=finalizado_em.desc.nullslast,criado_em.desc`).catch(() => []);
  const ls = os.length ? await api.listar('dp_lancamentos', `origem=eq.operacao&origem_id=in.(${os.map(o => o.id).join(',')})&ativo=eq.true&select=origem_id,status,valor,parcela,parcelas,c:dp_competencias(competencia)`).catch(() => []) : [];
  const stP = (o, p) => { const l = ls.find(x => x.origem_id === o.id && x.c?.competencia === p.competencia);
    return l ? `<span class="tag ${l.status === 'aprovado' ? 'verde' : l.status === 'cancelado' ? '' : 'azul'}">${l.status === 'aprovado' ? 'na folha' : l.status === 'cancelado' ? 'cancelado' : 'importado'}</span>` : '<span class="tag amarelo">a importar</span>'; };
  tela.innerHTML = `<div class="topo"><div><h1>Descontos de multas</h1><p class="sub">Processos finalizados na Operação, com termo assinado: valor e folha(s) de cada desconto</p></div>
      <a class="btn" href="#/dp/folha?c=${hojeISO().slice(0, 7)}">Folha do mês</a></div>
    <form class="filtros filtro-local" id="f-v"><select name="ver" data-unico>${Object.entries({ dp: 'Enviadas ao DP', documentos: 'Ainda na Operação (documentos)', cancelada: 'Canceladas', todas: 'Todas' }).map(([k, t]) => `<option value="${k}" ${k === ver ? 'selected' : ''}>${t}</option>`).join('')}</select></form>
    <div class="cartao">${os.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Processo</th><th>Colaborador</th><th>Infração</th><th class="num">Desconto</th><th>Folha(s)</th><th>Situação</th></tr></thead><tbody>
      ${os.map(o => `<tr class="clicavel" onclick="location.hash='#/operacao/ocorrencias/ver/${o.id}'"><td data-r="Processo" class="mono"><b>${esc(o.numero)}</b><div class="muted">${o.finalizado_em ? 'enviado ' + dataBR(o.finalizado_em) : ''}</div></td>
        <td data-r="Colaborador">${esc(o.m?.nome || '—')}</td><td data-r="Infração">${esc([o.auto_infracao, o.placa].filter(Boolean).join(' · ') || '—')}<div class="muted">${dataBR(o.data_hora)} · ${brl(o.valor_multa)}</div></td>
        <td data-r="Desconto" class="num"><b>${o.desconto_valor ? brl(o.desconto_valor) : '—'}</b><div class="muted">${o.desconto_tipo === 'parcelado' ? (o.desconto_plano || []).length + 'x' : o.desconto_tipo ? 'integral' : ''}${o.sem_indicacao ? ' · em dobro (sem indicação)' : ''}</div></td>
        <td data-r="Folha(s)">${(o.desconto_plano || []).map(p => `<div>${esc(mesAnoBR(p.competencia))} · ${brl(p.valor)} ${o.multa_etapa === 'dp' ? stP(o, p) : ''}</div>`).join('') || '—'}</td>
        <td data-r="Situação">${tagSt(ETAPA_MULTA, o.multa_etapa)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="vazio">Nenhum processo.</div>'}</div>
    <p class="muted">Ao abrir a folha da competência e clicar em <b>Importar pendências</b>, a parcela de cada mês entra sozinha (rubrica D007 · Multa de trânsito), já marcada com termo assinado e aprovação do jurídico.</p>
    ${avisoLei('desconto_multa')}`;
  $('#f-v').ver.onchange = e => (location.hash = '#/dp/multas?ver=' + e.target.value);
});
