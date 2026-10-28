// Verbo Gestão — Contrato de experiência (decisão do gestor) e desligamento por setor
// Espelha a admissão: cada setor vê e conclui a sua parte, com prazos legais, travas e linha do tempo.
'use strict';

// ===================== Contrato de experiência =====================
const EXP_DEC = { prorrogar: ['Prorrogar para o 2º período', 'azul'], efetivar: ['Efetivar (prazo indeterminado)', 'verde'], encerrar: ['Encerrar no fim do período', 'vermelho'] };
const expDias = d => Math.round((new Date(d + 'T12:00:00') - new Date(hojeISO() + 'T12:00:00')) / 864e5);

// situação de cada contrato: em que período está, o que falta decidir e até quando
function expSituacao(x) {
  const h = hojeISO(), d1 = x.dec1?.resultado, d2 = x.dec2?.resultado;
  if (d1 === 'efetivar' || d2 === 'efetivar') return { txt: 'Efetivado', cor: 'verde' };
  if (d1 === 'encerrar' || d2 === 'encerrar') return x.desligamento ? { txt: `Encerramento em andamento (${x.desligamento})`, cor: '' } : { txt: 'Encerrar: RH inicia o término', cor: 'vermelho', encerrar: true, fim: d1 === 'encerrar' ? x.fim1 : x.fim2 };
  if (h <= x.fim1) return x.dec1 ? { txt: EXP_DEC[d1]?.[0] || d1, cor: 'azul' } : { decidir: 1, ate: x.fim1, txt: `Decidir até ${dataBR(x.fim1)}`, cor: expDias(x.fim1) <= 5 ? 'vermelho' : 'amarelo' };
  if (h <= x.fim2) return x.dec2 ? { txt: EXP_DEC[d2]?.[0] || d2, cor: 'azul' } : { decidir: 2, ate: x.fim2, txt: `Decidir até ${dataBR(x.fim2)}${x.dec1 ? '' : ' · 1º período prorrogado sem decisão'}`, cor: expDias(x.fim2) <= 5 ? 'vermelho' : 'amarelo' };
  return { txt: 'Prazo indeterminado (passou do 2º período sem encerrar)', cor: 'verde' };
}

rota('/rh/experiencia', async tela => {
  const P = await api.rpc('experiencia_painel').catch(err => { falha(err); return null; });
  if (!P) { tela.innerHTML = '<div class="cartao vazio">Sem acesso aos contratos de experiência.</div>'; return; }
  const ls = P.itens.map(x => ({ ...x, s: expSituacao(x) }));
  const semGestor = ls.filter(x => !x.gestor_id && x.s.decidir);
  const aDecidir = ls.filter(x => x.s.decidir && (x.sou_gestor || (P.rh && !x.gestor_id)));
  tela.innerHTML = `<div class="topo"><div><h1>Contratos de experiência</h1><p class="sub">45 + 45 dias (ou o prazo do cargo). O gestor decide antes do fim de cada período: prorrogar, efetivar ou encerrar.</p></div></div>
    <div class="grade" style="margin-bottom:14px">
      <div class="cartao kpi ${aDecidir.length ? 'alerta' : ''}"><div class="n">${aDecidir.length}</div><div class="r">decisão(ões) com você</div></div>
      <div class="cartao kpi"><div class="n">${ls.filter(x => x.s.decidir && expDias(x.s.ate) <= 5).length}</div><div class="r">vencem em até 5 dias</div></div>
      <div class="cartao kpi"><div class="n">${ls.filter(x => x.s.encerrar).length}</div><div class="r">encerramento(s) a iniciar pelo RH</div></div></div>
    ${P.rh && semGestor.length ? `<div class="cartao alerta-obs"><b>${semGestor.length} colaborador(es) sem gestor cadastrado</b> — o alerta não chega a ninguém além do RH: ${semGestor.map(x => `<a href="#/rh/colaboradores/editar/${x.id}">${esc(x.nome)}</a>`).join(', ')}. Cadastre o gestor na ficha.</div>` : ''}
    <div class="cartao" id="exp-lista">${ls.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Colaborador</th><th>Admissão</th><th>1º período até</th><th>2º período até</th><th>Gestor</th><th>Situação</th><th></th></tr></thead><tbody>
      ${ls.map(x => `<tr data-x${fAttr('sit', x.s.decidir ? 'A decidir' : x.s.encerrar ? 'A encerrar' : 'Decidido')}${fAttr('vez', x.sou_gestor ? 'Minha equipe' : 'Outros')}${fAttr('busca', [x.nome, x.cargo, x.setor, x.gestor_nome].join(' '))}>
        <td data-r="Colaborador"><b>${esc(x.nome)}</b><div class="muted">${esc([x.cargo, x.setor].filter(Boolean).join(' · '))}</div></td>
        <td data-r="Admissão" class="nowrap">${dataBR(x.data_admissao)}</td>
        <td data-r="1º período" class="nowrap">${dataBR(x.fim1)}${x.dec1 ? `<div class="muted">${esc(EXP_DEC[x.dec1.resultado]?.[0].split(' (')[0] || x.dec1.resultado)} · ${esc(x.dec1.por || '')}</div>` : ''}</td>
        <td data-r="2º período" class="nowrap">${dataBR(x.fim2)}${x.dec2 ? `<div class="muted">${esc(EXP_DEC[x.dec2.resultado]?.[0].split(' (')[0] || x.dec2.resultado)} · ${esc(x.dec2.por || '')}</div>` : ''}</td>
        <td data-r="Gestor">${x.gestor_nome ? esc(x.gestor_nome) : '<span class="tag amarelo">sem gestor</span>'}</td>
        <td data-r="Situação"><span class="tag ${x.s.cor}">${esc(x.s.txt)}</span>${x.s.decidir ? ` <span class="muted">${expDias(x.s.ate)} dia(s)</span>` : ''}</td>
        <td class="nowrap">${x.s.decidir && (x.sou_gestor || P.rh) ? `<button class="btn peq prim" data-dec="${x.id}">Decidir</button>` : ''}
          ${x.s.encerrar && P.rh ? `<a class="btn peq perigo" href="#/rh/colaboradores/ver/${x.id}?aba=desligamento&tipo=termino_experiencia&data=${x.s.fim}">Iniciar término</a>` : ''}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="vazio">Nenhum contrato de experiência em andamento na sua equipe.</div>'}</div>
    ${expLei()}`;
  filtroLocal(tela, { itens: 'tbody tr[data-x]', antes: '#exp-lista', campos: [{ k: 'sit', rotulo: 'Situação' }, { k: 'vez', rotulo: 'Equipe' }] });
  $$('[data-dec]', tela).forEach(b => (b.onclick = () => expDecidir(ls.find(x => x.id === b.dataset.dec), P.criterios)));
});

function expLei() {
  return `<details class="cartao lei"><summary>⚖️ O que diz a lei — leia antes de decidir</summary><ul>
    <li>O contrato de experiência tem no máximo 90 dias e só pode ser prorrogado uma vez (CLT arts. 445 e 451). Passou disso, vira prazo indeterminado.</li>
    <li>Sem decisão no fim do 1º período, o contrato segue para o 2º se tiver cláusula de prorrogação. Se o colaborador trabalhar um dia além do 2º período, vira prazo indeterminado.</li>
    <li>Encerrar <b>no último dia</b> não gera aviso prévio nem multa de 40% do FGTS. Encerrar <b>antes</b> do fim gera indenização de metade dos dias que faltam (art. 479), salvo cláusula assecuratória (art. 481).</li>
    <li>Gestante e acidentado no trabalho têm estabilidade mesmo na experiência (Súmula 244, III e Súmula 378, III do TST). Consulte o jurídico antes de encerrar.</li>
    <li>Registre fatos e o feedback dado. Motivo discriminatório é proibido (Lei 9.029/1995).</li></ul></details>`;
}

async function expDecidir(x, criterios) {
  const s = expSituacao(x), per = s.decidir;
  const ops = per === 1 ? ['prorrogar', 'efetivar', 'encerrar'] : ['efetivar', 'encerrar'];
  const crit = (criterios || []).filter(k => k.aplica_a !== 'lideranca');
  const r = await modal(`<form><h2>Experiência · ${esc(x.nome)}</h2><p class="muted">${per}º período até <b>${dataBR(s.ate)}</b> (${expDias(s.ate)} dia(s)). A decisão fica registrada em Avaliações.</p><div class="form">
    ${crit.length ? `<div class="largo"><div class="muted" style="margin-bottom:4px">Notas: 1 = muito abaixo · 3 = atende · 5 = excepcional</div><table class="tabela-notas">${crit.map((k, i) => `<tr><td><input type="hidden" name="cn_${i}" value="${esc(k.nome)}"><b>${esc(k.nome)}</b><div class="muted">${esc(k.descricao || '')}</div></td>
      <td class="nowrap">${[1, 2, 3, 4, 5].map(n => `<label class="nota"><input type="radio" name="n_${i}" value="${n}"><span>${n}</span></label>`).join('')}</td></tr>`).join('')}</table></div>` : ''}
    <div class="largo"><b>Decisão *</b>${ops.map(o => `<label class="check"><input type="radio" name="decisao" value="${o}" required> ${EXP_DEC[o][0]}</label>`).join('')}</div>
    <label class="campo largo">Pontos fortes<textarea name="fortes" rows="2"></textarea></label>
    <label class="campo largo">Pontos a desenvolver<textarea name="desenv" rows="2"></textarea></label>
    <label class="campo largo">Parecer do gestor <span class="muted">(obrigatório para encerrar)</span><textarea name="parecer" rows="2"></textarea></label>
    <label class="check largo" id="c-jur" hidden><input type="checkbox" name="jur"> Conferi que não há estabilidade (gestante, acidente de trabalho, CIPA) ou o jurídico confirmou o encerramento</label>
    ${per === 2 ? '<p class="muted largo">No 2º período não cabe nova prorrogação (art. 451 da CLT).</p>' : ''}</div>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Registrar decisão</button></div></form>`,
    { aoAbrir: raiz => { const f = $('form', raiz); $$('[name=decisao]', f).forEach(i => (i.onchange = () => ($('#c-jur', raiz).hidden = f.decisao.value !== 'encerrar'))); },
      validar: d => !d.decisao ? 'Escolha a decisão.' : d.decisao === 'encerrar' && !d.parecer ? 'Explique o motivo do encerramento.' : d.decisao === 'encerrar' && !d.jur ? 'Confirme a verificação de estabilidade com o jurídico.' : null });
  if (!r) return;
  const notas = Object.keys(r).filter(k => /^n_\d+$/.test(k) && r[k]).map(k => ({ criterio: r['c' + k], nota: Number(r[k]) }));
  try { await api.rpc('decidir_experiencia', { p_colab: x.id, p_periodo: per, p_decisao: r.decisao, p_notas: notas, p_fortes: r.fortes || null, p_desenv: r.desenv || null,
      p_parecer: [r.parecer, r.decisao === 'encerrar' ? 'Estabilidade verificada / jurídico confirmou.' : ''].filter(Boolean).join(' · ') || null });
    aviso(r.decisao === 'encerrar' ? 'Decisão registrada. O RH foi avisado para iniciar o término no último dia do período.' : 'Decisão registrada.'); navegar(); } catch (err) { falha(err); }
}

// ===================== Desligamento por setor =====================
const DS_FASES = ['Comunicação', 'Devoluções e acessos', 'Exames', 'Rescisão e eSocial'];
const DS_LINK = { patrimonio: () => ['#/patrimonio', 'Patrimônio'], epi: () => ['#/almox/epi', 'EPI no almoxarifado'], aso_dem: () => ['#/ssma/aso', 'ASO no SSMA'], tox: () => ['#/ssma/aso', 'Exames no SSMA'] };
const DS_PERM_LINK = { patrimonio: () => tem('administrador', 'almoxarifado', 'rh'), epi: () => tem('administrador', 'almoxarifado', 'rh'), aso_dem: () => tem('administrador', 'ssma'), tox: () => tem('administrador', 'ssma', 'rh') };

function dsDica(e, D) {
  const c = D.col, d = D.desl;
  if (e.codigo === 'comunicacao') return d.tipo === 'pedido_demissao' ? 'Anexe o pedido de demissão assinado pelo colaborador.' : 'Anexe a comunicação (aviso prévio) assinada. Se o colaborador se recusar, duas testemunhas assinam.';
  if (e.codigo === 'entrevista') return 'Conclui sozinha quando a entrevista é registrada (botão "Entrevista de desligamento").';
  if (e.codigo === 'patrimonio') return D.patrimonios.length ? `Com o colaborador: ${D.patrimonios.map(p => p.tag + ' · ' + p.descricao).join('; ')}. Conclui sozinha quando todos forem devolvidos.` : 'Nenhum patrimônio com o colaborador.';
  if (e.codigo === 'epi') return D.epi ? `${D.epi} item(ns) de EPI/uniforme em posse na ficha. Dê baixa na devolução; descartáveis não voltam — conclua com observação.` : 'Nenhum EPI em posse na ficha.';
  if (e.codigo === 'cracha') return c.cracha_gerado_em ? `Crachá gerado em ${dataBR(c.cracha_gerado_em.slice(0, 10))}. Recolha e inutilize.` : 'Sem crachá gerado pelo sistema.';
  if (e.codigo === 'acessos') return `Rastreador, cartões, e-mail e portarias de clientes. O acesso ao Verbo Gestão${c.tem_usuario ? (c.usuario_ativo ? ' é bloqueado sozinho ao concluir o desligamento' : ' já está bloqueado') : ' não existe'}.`;
  if (e.codigo === 'financeiro') return 'Confira adiantamentos, Fundo Fixo, reembolsos e cartão corporativo. Desconto na rescisão só com base legal e confirmação do jurídico.';
  if (e.codigo === 'aso_dem') return D.aso ? `ASO demissional de ${dataBR(D.aso.data)}: ${String(D.aso.resultado || '').replace('_', ' com ')}.`
    : `Sem ASO demissional lançado. Pode ser dispensado se o último exame tiver menos de 135 dias (risco 1 e 2) ou 90 dias (risco 3 e 4) — NR-7 item 7.5.19.${D.ultimo_aso ? ` Último: ${D.ultimo_aso.tipo} de ${dataBR(D.ultimo_aso.data)}.` : ''}`;
  if (e.codigo === 'tox') return 'Lance o exame no SSMA. Obrigatório no desligamento do motorista profissional.';
  if (e.codigo === 'trct') return 'Anexe o TRCT conferido. Depende do acerto financeiro (descontos).';
  if (e.codigo === 'pagamento') return `Anexe o comprovante. Prazo legal: ${dataBR(d.prazo_pagamento)} (10 dias do término). Atraso gera multa de um salário (art. 477 §8º).`;
  if (e.codigo === 'esocial') return 'Anexe o recibo do S-2299. Prazo: até o 10º dia após o desligamento.';
  if (e.codigo === 'guias') return 'Chave do FGTS e guia do seguro-desemprego (dispensa sem justa causa ou acordo).';
  return '';
}

{ const listaOrig = ROTAS['/rh/desligamentos'];
  rota('/rh/desligamentos', async tela => {
    const st = estado.params.get('status') || 'em_andamento';
    const ls = await api.rpc('desligamentos_painel', { p_status: st }).catch(() => null);
    if (!ls) return listaOrig?.(tela);
    const meus = editaRH() ? ['RH', 'DP', 'SSMA', 'Almoxarifado', 'Financeiro'] : (await api.rpc('meus_setores_desligamento').catch(() => [])) || [];
    tela.innerHTML = `<div class="topo"><div><h1>Desligamentos</h1><p class="sub">Etapas por setor, em paralelo, com os prazos legais. Para iniciar, abra a ficha do colaborador → aba Desligamento.</p></div>
        <div class="acoes"><a class="btn" href="#/rh/experiencia">Contratos de experiência</a></div></div>
      <form class="filtros" id="f-st"><select name="status">${[['em_andamento', 'Em andamento'], ['concluido', 'Concluídos'], ['cancelado', 'Cancelados'], ['todos', 'Todos']].map(([k, t]) => `<option value="${k}" ${k === st ? 'selected' : ''}>${t}</option>`).join('')}</select></form>
      <div class="cartao">${ls.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nº</th><th>Colaborador</th><th>Tipo</th><th>Último dia</th><th>Pagar até</th><th>Progresso</th><th>Com o setor</th></tr></thead><tbody>
        ${ls.map(d => { const p = adProgresso(d.etapas || []), pend = (d.etapas || []).filter(e => e.status === 'pendente'), atr = pend.filter(adAtrasada).length;
          const porSetor = {}; pend.forEach(e => (porSetor[e.setor] = (porSetor[e.setor] || 0) + 1));
          const comigo = pend.some(e => meus.includes(e.setor));
          const urg = d.status === 'em_andamento' && d.prazo_pagamento && d.prazo_pagamento <= somaDias(hojeISO(), 3);
          return `<tr class="clicavel" onclick="location.hash='#/rh/desligamentos/ver/${d.id}'" data-d${fAttr('vez', comigo ? 'Comigo (meu setor)' : 'Com outros setores')}${fAttr('atraso', atr ? 'Com etapa atrasada' : 'Em dia')}${fAttr('busca', [d.numero, d.colaborador, d.cargo].join(' '))}>
          <td data-r="Nº" class="nowrap"><b>${esc(d.numero || '')}</b></td><td data-r="Colaborador">${esc(d.colaborador)}<div class="muted">${esc(d.cargo || '')}</div></td>
          <td data-r="Tipo">${esc(TIPOS_DESL[d.tipo] || d.tipo)}</td><td data-r="Último dia" class="nowrap">${dataBR(d.data_desligamento)}</td>
          <td data-r="Pagar até" class="nowrap">${dataBR(d.prazo_pagamento)}${urg ? ' <span class="tag vermelho">urgente</span>' : ''}</td>
          <td data-r="Progresso"><div class="ad-barra"><i style="width:${p.pct}%"></i></div><small class="muted">${p.f}/${p.t} etapas${atr ? ` · <b class="txt-verm">${atr} atrasada(s)</b>` : ''}</small></td>
          <td data-r="Com o setor">${d.status !== 'em_andamento' ? `<span class="tag ${d.status === 'concluido' ? 'verde' : ''}">${d.status === 'concluido' ? 'Concluído' : 'Cancelado'}</span>` : Object.entries(porSetor).map(([s, n]) => `<span class="tag ${meus.includes(s) ? 'amarelo' : ''}">${esc(s)} ${n}</span>`).join(' ') || '<span class="tag verde">pronto para concluir</span>'}${comigo ? ' <span class="tag vermelho">sua vez</span>' : ''}</td></tr>`; }).join('')}
        </tbody></table></div>` : '<div class="vazio">Nenhum desligamento nesta situação.</div>'}</div>`;
    filtroLocal(tela, { itens: 'tbody tr[data-d]', antes: '.cartao:last-of-type', campos: [{ k: 'vez', rotulo: 'De quem é a vez' }, { k: 'atraso', rotulo: 'Prazo' }] });
    $('#f-st [name=status]').onchange = e => { location.hash = '#/rh/desligamentos?status=' + e.target.value; };
  }); }

rota('/rh/desligamentos/ver/:id', async (tela, id) => {
  const D = await api.rpc('desligamento_detalhe', { p_id: id }).catch(err => { falha(err); return null; });
  if (!D) { tela.innerHTML = '<div class="cartao vazio">Desligamento não encontrado ou sem acesso.</div>'; return; }
  const d = D.desl, c = D.col, ets = D.etapas, meus = D.meus_setores || [], rh = D.rh, andamento = d.status === 'em_andamento';
  const est = k => ets.find(e => e.codigo === k);
  const pend = ets.filter(e => e.status === 'pendente');
  const pronto = andamento && !pend.length && d.data_desligamento <= hojeISO();
  const passos = [...DS_FASES.map(f => { const es = ets.filter(e => e.fase === f), p = adProgresso(es); return [f, `${p.f}/${p.t}`, p.t && p.f === p.t ? 'ok' : es.some(e => e.status !== 'pendente') || f === DS_FASES[0] ? 'atual' : '']; }),
    ['Desligado', d.status === 'concluido' ? dataBR((d.concluido_em || '').slice(0, 10)) : '', d.status === 'concluido' ? 'ok' : d.status === 'cancelado' ? 'x' : '']];
  const dias = expDias(d.prazo_pagamento);
  const item = e => { const [stT, stC, ic] = ST_ETAPA[e.status], bl = (e.depende || []).map(est).filter(x => x && x.status === 'pendente'), meu = meus.includes(e.setor) || rh;
    const lk = DS_LINK[e.codigo]?.(), plk = DS_PERM_LINK[e.codigo]?.();
    return `<li class="ad-et ${e.status}${adAtrasada(e) ? ' atrasada' : ''}"><span class="ad-ic">${ic}</span><div class="ad-et-c">
      <div class="ad-et-t"><b>${esc(e.etapa)}</b> <span class="tag">${esc(e.setor)}</span> <span class="tag ${stC}">${stT}</span>${adAtrasada(e) ? ` <span class="tag vermelho">atrasada · prazo ${dataBR(e.prazo)}</span>` : e.status === 'pendente' && e.prazo ? ` <span class="muted">prazo ${dataBR(e.prazo)}</span>` : ''}</div>
      ${e.status === 'pendente' ? `<div class="muted">${esc(dsDica(e, D))}${bl.length ? ` <b>Aguardando:</b> ${bl.map(x => esc(x.etapa)).join('; ')}.` : ''}</div>` : `<div class="muted">${e.concluido_em ? dtHora(e.concluido_em) : ''}${e.feito_por_nome ? ' · ' + esc(e.feito_por_nome) : ''}${e.observacao ? ' · ' + esc(e.observacao) : ''}</div>`}
      ${adAnexosHtml(e.anexos)}
      ${andamento ? `<div class="ad-et-a">${lk && plk ? `<a class="btn peq" href="${lk[0]}">${esc(lk[1])}</a>` : ''}
        ${e.status === 'pendente' && meu ? `<button class="btn peq ok" data-concl="${e.id}">Concluir${e.exige_anexo ? ' (com anexo)' : ''}</button><button class="btn peq" data-anx="${e.id}">📎 Anexar</button><button class="btn peq" data-na="${e.id}">Não se aplica</button>` : ''}
        ${e.status !== 'pendente' && rh ? `<button class="btn peq" data-reabrir="${e.id}">Reabrir</button>` : ''}</div>` : ''}</div></li>`; };
  tela.innerHTML = `<div class="topo"><div><h1>Desligamento ${esc(d.numero || '')} · ${esc(c.nome)}</h1>
      <p class="sub">${esc(TIPOS_DESL[d.tipo] || d.tipo)} · aviso ${esc((AVISOS[d.aviso_previo] || d.aviso_previo || '').toLowerCase())} · último dia ${dataBR(d.data_desligamento)} · <span class="tag ${d.status === 'concluido' ? 'verde' : d.status === 'cancelado' ? '' : 'amarelo'}">${d.status === 'concluido' ? 'Concluído' : d.status === 'cancelado' ? 'Cancelado' : 'Em andamento'}</span></p></div>
      <div class="acoes">${rh ? `<a class="btn" href="#/rh/colaboradores/ver/${c.id}">Ficha</a>` : ''}
        ${rh && andamento ? `<button class="btn ok" id="ds-concluir" ${pronto ? '' : 'disabled'} title="${pronto ? '' : pend.length ? 'Faltam etapas' : 'Só a partir do último dia'}">Concluir desligamento</button><button class="btn perigo" id="ds-cancelar">Cancelar</button>` : ''}
        <a class="btn" href="#/rh/desligamentos">Voltar</a></div></div>
    ${adStepper(passos)}
    ${andamento ? `<div class="cartao ${dias <= 3 ? 'alerta-obs' : ''}">💰 Verbas rescisórias, TRCT e eSocial até <b>${dataBR(d.prazo_pagamento)}</b> (${dias >= 0 ? `faltam ${dias} dia(s)` : `<b>atrasado ${-dias} dia(s)</b> — multa do art. 477 §8º`}).</div>` : ''}
    ${rh && andamento ? `<div class="acoes" style="margin-bottom:10px">${d.tipo === 'pedido_demissao' ? '<button class="btn peq" data-enc="RH-DES-002">Pedido de demissão</button>' : ''}${['sem_justa_causa', 'acordo'].includes(d.tipo) ? '<button class="btn peq" data-enc="RH-DES-001">Aviso prévio</button>' : ''}
      <button class="btn peq" data-enc="RH-DES-003">Termo de devolução</button><button class="btn peq" data-enc="RH-FOR-001">Encaminhamento ASO demissional</button><button class="btn peq" id="ds-entrevista">Entrevista de desligamento</button></div>` : ''}
    ${DS_FASES.map(f => `<div class="cartao"><h2>${esc(f)}</h2><ol class="ad-ets">${ets.filter(e => e.fase === f).map(item).join('') || '<li class="muted">—</li>'}</ol></div>`).join('')}
    ${ets.some(e => !e.fase) ? `<div class="cartao"><h2>Outras etapas</h2><ol class="ad-ets">${ets.filter(e => !e.fase).map(item).join('')}</ol></div>` : ''}
    ${avisoLei('desligamento')}`;

  const pedirArquivos = (titulo, obrig, extra = '') => modal(`<form><h2>${esc(titulo)}</h2><div class="form">${extra}<label class="campo largo">Arquivo(s)${obrig ? ' *' : ''}<input type="file" name="arquivos" multiple accept="image/*,application/pdf"></label>
      <label class="campo largo">Observação<input name="obs"></label></div><div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`,
    { aoAbrir: raiz => { const f = $('form', raiz); if (f.desconto) f.desconto.onchange = () => ($('#ds-desc', raiz).hidden = f.desconto.value !== 'sim'); },
      validar: x => obrig && !x.arquivos.length ? 'Anexe o arquivo.' : x.desconto === 'sim' && (!x.desc_txt || !x.jur) ? 'Descreva o desconto e confirme a validação do jurídico.' : null });
  const anexar = (idEt, arquivos, desc) => adEnviar(arquivos, `desligamento/${d.id}`, 'anexar_desligamento', { p_id: idEt, p_desc: desc });
  const descontoHtml = `<label class="campo largo">Haverá desconto na rescisão?<select name="desconto"><option value="nao">Não</option><option value="sim">Sim</option></select></label>
    <div class="largo" id="ds-desc" hidden><div class="alerta-obs">⚖️ <b>CLT art. 462:</b> desconto só de adiantamento, lei, convenção coletiva, ou dano causado com dolo (ou culpa, se previsto em contrato).
      <b>Art. 477 §5º:</b> na rescisão, a compensação é limitada a uma remuneração mensal. Sem base legal, o desconto é devolvido com multa.</div>
      <label class="campo largo">O que será descontado e valor *<input name="desc_txt" placeholder="Ex.: adiantamento ADT-0012 de R$ 300,00"></label>
      <label class="check largo"><input type="checkbox" name="jur"> O jurídico confirmou a base legal deste desconto</label></div>`;
  $$('[data-anx]', tela).forEach(b => (b.onclick = async () => { const e = ets.find(x => x.id === b.dataset.anx); const r = await pedirArquivos('Anexar · ' + e.etapa, true); if (!r) return;
    try { await anexar(e.id, r.arquivos, e.etapa); aviso('Anexado (também na ficha do colaborador).'); navegar(); } catch (err) { falha(err); } }));
  $$('[data-concl]', tela).forEach(b => (b.onclick = async () => { const e = ets.find(x => x.id === b.dataset.concl);
    const r = await pedirArquivos('Concluir · ' + e.etapa, e.exige_anexo && !e.anexos.length, e.codigo === 'financeiro' ? descontoHtml : ''); if (!r) return;
    const obs = [r.obs, r.desconto === 'sim' ? `Desconto na rescisão: ${r.desc_txt} (base legal confirmada pelo jurídico)` : r.desconto === 'nao' ? 'Sem desconto na rescisão' : ''].filter(Boolean).join(' · ');
    try { if (r.arquivos.length) await anexar(e.id, r.arquivos, e.etapa); await api.rpc('concluir_etapa_desligamento', { p_etapa: e.id, p_status: 'feito', p_obs: obs || null }); aviso('Etapa concluída.'); navegar(); } catch (err) { falha(err); } }));
  $$('[data-na]', tela).forEach(b => (b.onclick = async () => { const m = await confirmar('Por que esta etapa não se aplica?', { comMotivo: true, botao: 'Confirmar' }); if (!m) return;
    try { await api.rpc('concluir_etapa_desligamento', { p_etapa: b.dataset.na, p_status: 'nao_se_aplica', p_obs: m }); navegar(); } catch (err) { falha(err); } }));
  $$('[data-reabrir]', tela).forEach(b => (b.onclick = async () => { if (!await confirmar('Reabrir esta etapa?', { botao: 'Reabrir' })) return;
    try { await api.rpc('concluir_etapa_desligamento', { p_etapa: b.dataset.reabrir, p_status: 'pendente' }); navegar(); } catch (err) { falha(err); } }));
  $$('[data-enc]', tela).forEach(b => (b.onclick = async () => { const m = await modeloPorCodigo(b.dataset.enc); if (!m) return aviso('Modelo não encontrado.', true);
    await gerarDocumento(m, c.id, { desligamento: { ...d, data_aviso: dataBR(d.data_aviso), data_desligamento: dataBR(d.data_desligamento), prazo_pagamento: dataBR(d.prazo_pagamento), aviso_previo: (AVISOS[d.aviso_previo] || '').toLowerCase() } }); }));
  $('#ds-entrevista')?.addEventListener('click', async () => {
    const e0 = d.entrevista || {};
    const perg = ['Principal motivo da saída', 'O que a empresa faz bem', 'O que precisa melhorar', 'Relação com a liderança', 'Recomendaria a empresa a um amigo? Por quê?', 'Comentários finais'];
    const r = await modal(`<form><h2>Entrevista de desligamento</h2><p class="muted">Conduza em local reservado. As respostas ajudam a reduzir a rotatividade.</p><div class="form">
      ${perg.map((p, i) => `<label class="campo largo">${p}<textarea name="p${i}" rows="2">${esc(e0[p] || '')}</textarea></label>`).join('')}</div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`);
    if (!r) return;
    try { await api.alterar('desligamentos', `id=eq.${d.id}`, { entrevista: Object.fromEntries(perg.map((p, i) => [p, r['p' + i]])) }); aviso('Entrevista salva.'); navegar(); } catch (err) { falha(err); } });
  $('#ds-concluir')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Concluir desligamento</h2><p>${esc(c.nome)} passa para <b>Desligado</b> e o acesso ao sistema é bloqueado.</p>
      <label class="check"><input type="checkbox" name="recontratar" checked> Elegível para recontratação</label>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Concluir</button></div></form>`);
    if (!r) return;
    try { await api.rpc('concluir_desligamento', { p_id: d.id, p_recontratar: !!r.recontratar }); aviso('Desligamento concluído.'); navegar(); } catch (err) { falha(err); } });
  $('#ds-cancelar')?.addEventListener('click', async () => {
    const motivo = await confirmar('Cancelar este desligamento? O colaborador volta para Ativo.', { comMotivo: true, botao: 'Cancelar desligamento' }); if (!motivo) return;
    try { await api.alterar('desligamentos', `id=eq.${d.id}`, { status: 'cancelado', observacoes: motivo }); await api.alterar('colaboradores', `id=eq.${c.id}`, { status: 'ativo' }); navegar(); } catch (err) { falha(err); } });
});

// ficha › aba Desligamento: com processo em andamento, mostra o resumo e leva ao processo; sem processo, formulário original (com pré-preenchimento vindo da experiência)
{ const abaOrig = ABAS_RH_EXTRA.desligamento;
  ABAS_RH_EXTRA.desligamento = async (box, c) => {
    const ds = await api.listar('desligamentos', `colaborador_id=eq.${c.id}&status=eq.em_andamento&select=id,numero,tipo,data_desligamento,prazo_pagamento`).catch(() => []);
    const d = ds[0];
    if (d) {
      const ets = await api.listar('desligamento_etapas', `desligamento_id=eq.${d.id}&select=status,setor&order=ordem`).catch(() => []);
      const p = adProgresso(ets), pend = ets.filter(e => e.status === 'pendente');
      box.innerHTML = `<div class="topo" style="margin:0 0 8px"><div><h2 style="margin:0">Desligamento ${esc(d.numero || '')} · ${esc(TIPOS_DESL[d.tipo] || d.tipo)}</h2>
          <div class="muted">Último dia ${dataBR(d.data_desligamento)} · pagar até ${dataBR(d.prazo_pagamento)} · ${p.f}/${p.t} etapas</div></div>
        <a class="btn prim" href="#/rh/desligamentos/ver/${d.id}">Abrir o processo de desligamento</a></div><div class="ad-barra"><i style="width:${p.pct}%"></i></div>
        ${pend.length ? `<p class="muted" style="margin-top:8px">Pendente com: ${[...new Set(pend.map(e => e.setor))].map(esc).join(', ')}</p>` : ''}`;
      return;
    }
    await abaOrig(box, c);
    const f = $('#f-desl', box), tipo = estado.params.get('tipo'), data = estado.params.get('data');
    if (f && tipo && f.tipo.querySelector(`option[value="${tipo}"]`)) { f.tipo.value = tipo; f.tipo.dispatchEvent(new Event('change'));
      if (tipo === 'termino_experiencia' && f.aviso.querySelector('option[value="nao_se_aplica"]')) f.aviso.value = 'nao_se_aplica'; }
    if (f && data) f.data.value = data;
    if (f && tipo === 'termino_experiencia') f.insertAdjacentHTML('afterbegin', `<div class="largo alerta-obs">Término do contrato de experiência: o último dia deve ser exatamente o fim do período (${dataBR(data)}). Encerrar antes gera a indenização do art. 479; trabalhar depois torna o contrato por prazo indeterminado.</div>`);
  }; }
