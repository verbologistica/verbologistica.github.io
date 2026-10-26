// Verbo Gestão — SSMA fase 1: painel estratégico (4 quadrantes), liberação de motoristas e viagens padrão,
// Programa Padrinho, desvios com as 10 Regras de Ouro, documentos corporativos e vencimentos, regras e metas.
'use strict';

const REGRAS_OURO = ['Tolerância zero a álcool e drogas', 'Bloqueio de energias perigosas (LOTO)', 'Proibição absoluta de celular na condução', 'Uso obrigatório de EPIs',
  'Respeito aos limites de velocidade', 'Amarração e fixação segura da carga (tritrem)', 'Distanciamento de redes elétricas', 'Operação apenas por pessoal habilitado/autorizado',
  'Segregação homem-máquina em áreas florestais', 'Exercício prático do direito de recusa'];
const GRAV_DSV = { gravissima: ['Gravíssima', 'vermelho', 'Ex.: álcool, falha LOTO, velocidade crítica'], grave: ['Grave', 'laranja', 'Ex.: uso de celular, excesso de velocidade'],
  media: ['Média', 'amarelo', 'Ex.: falta de EPI no pátio, amostragem falha'], leve: ['Leve', '', 'Orientação e registro'] };
const ST_INT = { em_integracao: ['Em integração', 'azul'], aguardando_liberacao: ['Aguardando liberação', 'amarelo'], liberado: ['Liberado em definitivo', 'verde'],
  bloqueado: ['Bloqueado', 'vermelho'], reprovado: ['Reprovado', 'vermelho'], cancelado: ['Cancelado', ''] };
const ST_DSV = { aberto: ['Aberto', 'amarelo'], tratado: ['Tratado', 'verde'], cancelado: ['Cancelado', ''] };
const BONUS_TXT = { integral: ['Bônus integral', 'verde'], reduzido_50: ['Bônus reduzido em 50%', 'amarelo'], suspenso: ['Bônus suspenso', 'vermelho'] };
const CHECK_VIAGEM = ['Checklist pré-viagem do veículo (pneus, freios, luzes, tacógrafo)', 'Amarração e fixação da carga (tritrem)', 'Respeito aos limites de velocidade',
  'Sem uso de celular na condução', 'Uso de EPI no carregamento e descarga', 'Distância segura de redes elétricas', 'Segregação homem-máquina no talhão', 'Registro de jornada e tempo de direção (Lei 13.103)'];
const CHECK_AVAL = ['Seguiu o checklist do veículo', 'Direção segura e dentro da velocidade', 'Uso correto de EPI', 'Amarração da carga correta', 'Comportamento e comunicação'];
const DOC_SSMA_TIPOS = ['APR', 'PGR', 'PCMSO', 'POP', 'LTCAT', 'PAE', 'Licença ambiental', 'Outro'];
const tagX = (m, k) => `<span class="tag ${m[k]?.[1] || ''}">${m[k]?.[0] || esc(k || '')}</span>`;
let _ssmaSup = null;
const ssmaSup = async () => (_ssmaSup ??= await api.rpc('ssma_supervisor').catch(() => false));
const pctTxt = v => v == null ? '—' : String(v).replace('.', ',') + '%';
const diasAteSsma = d => Math.round((new Date(d + 'T12:00') - new Date(hojeISO() + 'T12:00')) / 864e5);

Object.assign(LEI, {
  padrinho: ['Programa Padrinho — prêmio, bônus e penalidades', [
    'O sistema <b>calcula pontos e indica</b> bônus, advertência ou perda de prêmio. <b>Nada é descontado ou pago automaticamente</b>: o DP só aplica depois da confirmação do jurídico.',
    'Desconto no salário só com previsão legal, em acordo/convenção coletiva ou com autorização do empregado (CLT art. 462). Prêmio por desempenho segue a política interna escrita ou o acordo coletivo (CLT art. 457 §2º e §4º).',
    'Advertência e suspensão devem ser proporcionais e imediatas; falta grave segue o art. 482 da CLT. Recusa injustificada em usar EPI ou cumprir normas de segurança é ato faltoso (CLT art. 158).',
    'Exame de álcool/drogas: o toxicológico de motoristas segue o CTB art. 148-A e a CLT art. 168 §6º; testes de etilômetro no trabalho precisam estar previstos em norma interna conhecida pelos empregados.']],
});

// ---------- gauge (velocímetro) ----------
function gaugeSvg(valor, meta = 95, rotulo = 'Conformidade') {
  const v = valor == null ? null : Math.max(0, Math.min(100, Number(valor)));
  const R = 80, C = [100, 96], ang = p => Math.PI * (1 - p / 100), pt = (p, r = R) => [C[0] + r * Math.cos(ang(p)), C[1] - r * Math.sin(ang(p))];
  const arco = (a, b, cor, w = 14) => { const [x1, y1] = pt(a), [x2, y2] = pt(b); return `<path d="M${x1},${y1}A${R},${R} 0 0 1 ${x2},${y2}" fill="none" stroke="${cor}" stroke-width="${w}" stroke-linecap="butt"/>`; };
  const cor = v == null ? '#5d6f68' : v >= meta ? '#3FBF94' : v >= meta - 15 ? '#E0A53A' : '#E05A4F';
  const [mx1, my1] = pt(meta, R - 12), [mx2, my2] = pt(meta, R + 12);
  return `<svg viewBox="0 0 200 120" class="ss-gauge" role="img" aria-label="${esc(rotulo)} ${v == null ? 'sem dados' : v + '%'}">
    ${arco(0, 100, 'rgba(127,140,135,.22)')}${v != null && v > 0 ? arco(0, v, cor) : ''}
    <line x1="${mx1}" y1="${my1}" x2="${mx2}" y2="${my2}" stroke="#F2C866" stroke-width="2.5"/>
    <text x="100" y="88" text-anchor="middle" class="ss-g-v">${v == null ? '—' : String(v).replace('.', ',') + '%'}</text>
    <text x="100" y="108" text-anchor="middle" class="ss-g-r">meta ${meta}%</text></svg>`;
}
// indicador do quadrante: valor × meta, com situação
function indQ(nome, mede, valor, metaTxt, ok) {
  const st = ok == null ? ['sem dados', ''] : ok ? ['na meta', 'verde'] : ['fora da meta', 'vermelho'];
  return `<div class="ss-ind"><div class="ss-ind-t"><b>${esc(nome)}</b><span class="tag ${st[1]}">${st[0]}</span></div><div class="ss-ind-v">${valor}</div>
    <div class="muted">${esc(mede)} · meta ${esc(metaTxt)}</div></div>`;
}

// ===================== Painel estratégico do SSMA =====================
rota('/ssma', async tela => {
  const [d, pend, acs, cats] = await Promise.all([api.rpc('painel_ssma_estrategico'), api.rpc('pendencias_ssma').catch(() => []),
    api.listar('ssma_acoes', 'ativo=eq.true&status=in.(aberta,em_andamento)&select=*,u:usuarios(nome)&order=prazo').catch(() => []),
    api.listar('acidentes', 'ativo=eq.true&status=neq.concluido&select=*,c:colaboradores(nome)&order=data_hora.desc').catch(() => [])]);
  const p = Object.fromEntries(pend.map(x => [x.tipo, Number(x.quantidade)]));
  const pm = d.parametros || {}, c = d.cards, pa = d.padrinho, li = d.liberacao, le = d.legal, ri = d.riscos;
  const ano = hojeISO().slice(0, 4);
  const doAno = await api.listar('acidentes', `ativo=eq.true&data_hora=gte.${ano}-01-01&select=id,gravidade,data_hora`).catch(() => []);
  const ultimo = doAno.filter(a => ['com_afastamento', 'fatal'].includes(a.gravidade)).map(a => a.data_hora).sort().pop();
  const diasSem = ultimo ? Math.floor((Date.now() - new Date(ultimo)) / 864e5) : null;
  const meses = ri.desvios_meses || [];
  const tendQueda = meses.length >= 2 ? (() => { const t = m => m.gravissima + m.grave + m.media + m.leve; const a = meses.slice(-3).reduce((s, m) => s + t(m), 0), b = meses.slice(-6, -3).reduce((s, m) => s + t(m), 0); return b === 0 && a === 0 ? null : a <= b; })() : null;
  tela.innerHTML = `${pnTopo('SSMA', 'Saúde, segurança e meio ambiente · operação florestal e frota', { gerado_em: new Date().toISOString() })}
    <div class="acoes" style="margin:-6px 0 14px"><a class="btn prim" href="#/ssma/desvios/novo">+ Registrar desvio</a><a class="btn" href="#/ssma/integracoes/nova">+ Integração de motorista</a>
      <a class="btn" href="#/ssma/acidentes/novo">Comunicar acidente</a><a class="btn" href="#/ssma/inspecoes/nova">+ Inspeção</a><a class="btn" href="#/ssma/dds/novo">+ DDS</a></div>
    ${pnFaixa([
      { ic: 'doc_prazo', rot: 'Documentos vencidos hoje', valor: pnInt(c.docs_vencidos_hoje), sub: `${c.docs_7} em 7 dias · ${c.docs_15} em 15 · ${c.docs_30} em 30`, link: '#/ssma/documentos?aba=vencimentos', nivel: c.docs_vencidos_hoje ? 'critico' : '' },
      { ic: 'caminhao', rot: 'Motoristas em integração', valor: pnInt(c.em_integracao), sub: `${c.aguardando_liberacao} aguardando liberação · ${c.bloqueados} bloqueado(s)`, link: '#/ssma/integracoes' },
      { ic: 'alerta', rot: 'Desvios nos últimos 30 dias', valor: pnInt(c.desvios_30d), sub: 'comportamentais e operacionais', link: '#/ssma/desvios', nivel: c.desvios_30d ? 'atencao' : '' },
      { ic: 'capacete', rot: 'Dias sem acidente com afastamento', valor: diasSem == null ? '—' : pnInt(diasSem), sub: diasSem == null ? `nenhum em ${ano}` : `${p.cat_pendente || 0} CAT pendente`, link: '#/ssma/acidentes', nivel: p.cat_pendente ? 'critico' : '' }])}
    <div class="vx-grade">
      <div class="cartao pn-card vx-c6 ss-q"><div class="pn-card-cab"><div><h2>Programa Padrinho</h2><div class="muted pn-sub">Período de ${pm.periodo_padrinho_dias || 90} dias · meta de ${pm.meta_aceitacao_pct || 85}% de avaliações positivas</div></div><a class="pn-tb" href="#/ssma/integracoes">Abrir</a></div>
        <div class="ss-inds">${indQ('Taxa de aprovação / adesão', '% de novos motoristas aprovados ao fim do apadrinhamento', pctTxt(pa.taxa_aprovacao), '> 90%', pa.taxa_aprovacao == null ? null : pa.taxa_aprovacao > 90)}
          ${indQ('Evolução do aprendizado', 'avaliações diárias preenchidas × dias úteis', pctTxt(pa.preenchimento), '100%', pa.preenchimento == null ? null : pa.preenchimento >= 100)}</div></div>
      <div class="cartao pn-card vx-c6 ss-q"><div class="pn-card-cab"><div><h2>Liberação de frotas</h2><div class="muted pn-sub">${pm.viagens_padrao || 3} viagens padrão atestadas pelo SSMA antes da liberação definitiva</div></div><a class="pn-tb" href="#/ssma/integracoes">Abrir</a></div>
        <div class="ss-inds">${indQ('Adesão às viagens padrão', '% de motoristas que completaram o ciclo obrigatório', pctTxt(li.adesao_viagens), '100%', li.adesao_viagens == null ? null : li.adesao_viagens >= 100)}
          ${indQ('Tempo médio de integração', 'dias úteis entre o cadastro e a liberação', li.tempo_medio_dias_uteis == null ? '—' : String(li.tempo_medio_dias_uteis).replace('.', ',') + ' dias', `< ${pm.meta_integracao_dias_uteis || 5} dias úteis`, li.tempo_medio_dias_uteis == null ? null : li.tempo_medio_dias_uteis < (pm.meta_integracao_dias_uteis || 5))}</div></div>
      <div class="cartao pn-card vx-c6 ss-q"><div class="pn-card-cab"><div><h2>Gestão contratual / legal</h2><div class="muted pn-sub">CNH, ASO, toxicológico, treinamentos, documentos dos veículos e corporativos</div></div><a class="pn-tb" href="#/ssma/documentos?aba=vencimentos">Abrir</a></div>
        <div class="ss-inds">${indQ('Índice de documentos vencidos', `${le.vencidos_hoje} de ${le.total} documento(s) vencido(s) hoje`, pctTxt(le.pct_vencidos), '0%', le.total ? le.vencidos_hoje === 0 : null)}
          ${indQ('Prazo médio de renovação', 'antecedência da renovação antes do vencimento (12 meses)', le.prazo_medio_renovacao == null ? '—' : le.prazo_medio_renovacao + ' dias', `> ${pm.meta_renovacao_dias || 15} dias`, le.prazo_medio_renovacao == null ? null : le.prazo_medio_renovacao > (pm.meta_renovacao_dias || 15))}</div></div>
      <div class="cartao pn-card vx-c6 ss-q"><div class="pn-card-cab"><div><h2>Segurança e riscos</h2><div class="muted pn-sub">Desvios registrados e inspeções de campo (90 dias)</div></div><a class="pn-tb" href="#/ssma/desvios">Abrir</a></div>
        <div class="ss-inds">${indQ('Índice de desvios', 'infrações registradas · últimos 3 meses × 3 anteriores', pnInt(c.desvios_30d) + ' <small>em 30 dias</small>', 'tendência de queda', tendQueda)}
          <div class="ss-ind ss-ind-g"><div class="ss-ind-t"><b>Conformidade em auditorias</b></div>${gaugeSvg(ri.conformidade, pm.meta_conformidade_pct || 95)}<div class="muted">${ri.inspecoes_90d} inspeção(ões) em 90 dias</div></div></div></div>
      ${pnCartao('Viagens padrão por motorista em integração', 'Progresso individual · cada barra é uma viagem atestada', 'g-viagens', '', { cls: 'vx-c6' })}
      ${pnCartao('Desvios por mês e gravidade', 'Últimos 6 meses', 'g-desvios', pnTabela(['Mês', 'Gravíssima', 'Grave', 'Média', 'Leve'], meses.map(m => [pnMes(m.mes), m.gravissima, m.grave, m.media, m.leve])), { cls: 'vx-c6' })}
      ${pnCartao('Regras de Ouro com mais desvios', 'Últimos 6 meses', 'g-regras', '', { cls: 'vx-c6' })}
      <div class="cartao pn-card vx-c6"><div class="pn-card-cab"><div><h2>Acidentes em aberto e plano de ação</h2><div class="muted pn-sub">${cats.length} acidente(s) · ${acs.length} ação(ões) abertas</div></div></div>
        ${cats.length ? `<ul class="lista-simples">${cats.slice(0, 5).map(a => `<li class="clicavel" onclick="location.hash='#/ssma/acidentes/ver/${a.id}'"><span><b>${esc(a.numero)}</b> ${esc(a.c?.nome || '')}<div class="muted">${dataHoraBR(a.data_hora)}</div></span>${a.cat_necessaria && !a.cat_numero ? `<span class="tag vermelho">CAT até ${dataBR(a.cat_prazo)}</span>` : ''}</li>`).join('')}</ul>` : ''}
        ${acs.length ? `<ul class="lista-simples">${acs.slice(0, 6).map(a => `<li><span>${esc(a.descricao)}<div class="muted">${esc(a.u?.nome || 'sem responsável')}${a.prazo ? ' · prazo ' + dataBR(a.prazo) : ''}</div></span>${a.prazo && a.prazo < hojeISO() ? '<span class="tag vermelho">Atrasada</span>' : ''}</li>`).join('')}</ul><a class="btn peq" href="#/planos?ver=todas">Ver todas as ações</a>` : '<div class="vazio">Nenhuma ação aberta.</div>'}</div>
    </div>`;
  const mot = li.motoristas || [];
  pnDesenhar(tela, [
    ['g-viagens', () => mot.length ? `<div class="ss-vg">${mot.map(m => `<a class="ss-vg-l" href="#/ssma/integracoes/ver/${m.id}" data-tip="${tipHtml(m.nome, [[null, 'Viagens atestadas', `${m.ok} de ${m.exigidas}`], [null, 'Situação', ST_INT[m.status]?.[0] || m.status], [null, 'Aceitação do padrinho', m.aceitacao == null ? '—' : m.aceitacao + '%'], [null, 'Pontos', String(m.pontos)]])}">
        <span class="ss-vg-n">${esc(m.nome)}${m.cnh_ok ? '' : ' <span class="tag vermelho">CNH abaixo do cargo</span>'}</span>
        <span class="ss-vg-b">${Array.from({ length: m.exigidas }, (_, i) => `<i class="${i < m.ok ? 'ok' : i < m.ok + m.pend ? 'pend' : ''}"></i>`).join('')}</span>
        <span class="ss-vg-v">${m.ok}/${m.exigidas}</span></a>`).join('')}</div>` : '<div class="pn-vazio">Nenhum motorista em integração. <a href="#/ssma/integracoes/nova">Iniciar integração</a></div>'],
    ['g-desvios', W => pnLegenda([[PN_COR.critico, 'Gravíssima'], [PN_COR.serio, 'Grave'], [PN_COR.atencao, 'Média'], [PN_COR.outros, 'Leve']])
      + pnColunas(W, { cats: meses.map(m => pnMes(m.mes)), series: [{ nome: 'Gravíssima', cor: PN_COR.critico, vals: meses.map(m => m.gravissima) }, { nome: 'Grave', cor: PN_COR.serio, vals: meses.map(m => m.grave) },
        { nome: 'Média', cor: PN_COR.atencao, vals: meses.map(m => m.media) }, { nome: 'Leve', cor: PN_COR.outros, vals: meses.map(m => m.leve) }], fmt: pnInt, fmtEixo: pnK, alt: 220 })],
    ['g-regras', () => pnBarrasH((ri.regras || []).map(r => ({ nome: r.regra + '. ' + REGRAS_OURO[r.regra - 1], valor: r.qtd, rot: 'Desvios' })), { cor: PN_COR.serio, fmt: pnInt, fmtCurto: pnInt, vazio: 'Nenhum desvio ligado às Regras de Ouro.' })],
  ]);
  $('#pn-atualizar').onclick = () => navegar();
});

// ===================== Liberação de motoristas =====================
rota('/ssma/integracoes', async tela => {
  const ls = await api.listar('ssma_integracoes', 'ativo=eq.true&select=*,c:colaboradores!ssma_integracoes_colaborador_id_fkey(nome),pd:colaboradores!ssma_integracoes_padrinho_id_fkey(nome)&order=data_inicio.desc');
  const [vs, avs] = await Promise.all([ls.length ? api.listar('ssma_viagens_padrao', `ativo=eq.true&integracao_id=${lista(ls.map(i => i.id))}&select=integracao_id,resultado,atestado_em`) : [],
    ls.length ? api.listar('ssma_avaliacoes_padrinho', `ativo=eq.true&integracao_id=${lista(ls.map(i => i.id))}&select=integracao_id,positiva`) : []]);
  const prog = id => { const v = vs.filter(x => x.integracao_id === id); return { ok: v.filter(x => x.resultado === 'satisfatoria' && x.atestado_em).length, pend: v.filter(x => !x.atestado_em).length }; };
  const acc = id => { const a = avs.filter(x => x.integracao_id === id); return a.length ? Math.round(100 * a.filter(x => x.positiva).length / a.length) : null; };
  tela.innerHTML = `<div class="topo"><div><h1>Liberação de motoristas</h1><p class="sub">Integração, viagens padrão atestadas pelo SSMA, Programa Padrinho e liberação definitiva</p></div>
      <div class="acoes">${editaSSMA() ? '<a class="btn prim" href="#/ssma/integracoes/nova">+ Iniciar integração</a>' : ''}</div></div>
    <div class="cartao">${ls.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nº</th><th>Motorista</th><th>Padrinho</th><th>Início</th><th>Viagens padrão</th><th>Aceitação</th><th class="num">Pontos</th><th>Situação</th></tr></thead><tbody>
      ${ls.map(i => { const g = prog(i.id), a = acc(i.id);
        return `<tr class="clicavel" data-i="${i.id}" onclick="location.hash='#/ssma/integracoes/ver/${i.id}'"${fAttr('sit', ST_INT[i.status]?.[0])}${fAttr('pad', i.pd?.nome)}${fAttr('data', i.data_inicio)}${fAttr('busca', [i.numero, i.c?.nome, i.pd?.nome].join(' '))}>
          <td data-r="Nº" class="nowrap"><b>${esc(i.numero)}</b></td><td data-r="Motorista"><b>${esc(i.c?.nome || '—')}</b></td><td data-r="Padrinho">${esc(i.pd?.nome || '—')}</td>
          <td data-r="Início" class="nowrap">${dataBR(i.data_inicio)}</td><td data-r="Viagens padrão"><span class="ss-vg-b">${Array.from({ length: i.viagens_exigidas }, (_, k) => `<i class="${k < g.ok ? 'ok' : k < g.ok + g.pend ? 'pend' : ''}"></i>`).join('')}</span> ${g.ok}/${i.viagens_exigidas}</td>
          <td data-r="Aceitação">${a == null ? '—' : `<b class="${a >= 85 ? 'txt-verde' : 'txt-verm'}">${a}%</b>`}</td><td data-r="Pontos" class="num">${i.pontos_motorista}</td><td data-r="Situação">${tagX(ST_INT, i.status)}</td></tr>`; }).join('')}
      </tbody></table></div>` : '<div class="vazio">Nenhuma integração. Inicie a integração de cada motorista novo: o SSMA atesta as viagens padrão e o supervisor libera em definitivo.</div>'}</div>`;
  filtroLocal(tela, { itens: 'tbody tr[data-i]', antes: '.cartao:last-of-type', campos: [{ k: 'sit', rotulo: 'Situação' }, { k: 'pad', rotulo: 'Padrinho' }], periodo: true, rotuloPeriodo: 'Início' });
});

rota('/ssma/integracoes/nova', async tela => {
  if (!editaSSMA()) { tela.innerHTML = '<div class="cartao vazio">Só o SSMA inicia integrações.</div>'; return; }
  const cs = await colabsBasico(); const pm = (await api.um('configuracoes', 'chave=eq.ssma_parametros&select=valor').catch(() => null))?.valor || {};
  const mot = cs.filter(c => c.motorista);
  tela.innerHTML = `<div class="topo"><div><h1>Iniciar integração de motorista</h1><p class="sub">Programa Padrinho de ${pm.periodo_padrinho_dias || 90} dias e ${pm.viagens_padrao || 3} viagens padrão obrigatórias</p></div></div>
    <form class="cartao form" id="f-int">
      <label class="campo largo">Motorista novo *<select name="colaborador_id" required>${opcoes(mot.length ? mot : cs, null, c => c.nome + (c.cargo ? ' · ' + c.cargo : ''), null, 'Selecione…')}</select></label>
      <label class="campo largo">Padrinho (motorista experiente)<select name="padrinho_id">${opcoes(cs, null, c => c.nome + (c.cargo ? ' · ' + c.cargo : ''), null, 'Sem padrinho')}</select></label>
      <label class="campo">Data de início<input type="date" name="data_inicio" value="${hojeISO()}" required></label>
      <label class="campo">Viagens padrão exigidas<input type="number" name="viagens_exigidas" min="1" max="10" value="${pm.viagens_padrao || 3}"></label>
      <label class="campo largo">Observação<textarea name="observacao" rows="2"></textarea></label>
      <div class="largo muted">A CNH do motorista é comparada com a categoria mínima do cargo. Documentos vencidos (CNH, ASO, toxicológico, treinamentos) aparecem na ficha da integração.</div>
      <div class="largo acoes"><button class="btn prim">Iniciar integração</button><a class="btn" href="#/ssma/integracoes">Cancelar</a></div></form>`;
  $('#f-int').onsubmit = async e => { e.preventDefault(); const d = formDados(e.target);
    await ocupado(e.submitter, async () => { try { const [x] = await api.inserir('ssma_integracoes', { colaborador_id: d.colaborador_id, padrinho_id: d.padrinho_id || null, data_inicio: d.data_inicio,
      viagens_exigidas: Number(d.viagens_exigidas) || null, observacao: d.observacao || null }); aviso(`Integração ${x.numero} iniciada.`); location.hash = '#/ssma/integracoes/ver/' + x.id; } catch (err) { falha(err); } }); };
});

function checklistHtml(itens, val = []) {
  return `<div class="ss-chk">${itens.map((it, k) => { const v = val.find(x => x.item === it)?.ok; return `<div class="ss-chk-l"><span>${esc(it)}</span>
    <label class="check"><input type="radio" name="ck_${k}" value="sim" ${v === true ? 'checked' : ''}> Conforme</label><label class="check"><input type="radio" name="ck_${k}" value="nao" ${v === false ? 'checked' : ''}> Não conforme</label></div>`; }).join('')}</div>`;
}
const lerChecklist = (itens, d) => itens.map((it, k) => ({ item: it, ok: d['ck_' + k] === 'sim' ? true : d['ck_' + k] === 'nao' ? false : null }));

rota('/ssma/integracoes/ver/:id', async (tela, id) => {
  const i = await api.um('ssma_integracoes', `id=eq.${id}&select=*,c:colaboradores!ssma_integracoes_colaborador_id_fkey(id,nome,cnh_categoria,cnh_validade,cargo_id),pd:colaboradores!ssma_integracoes_padrinho_id_fkey(nome)`);
  if (!i) { tela.innerHTML = '<div class="cartao vazio">Integração não encontrada ou sem acesso.</div>'; return; }
  const [vs, avs, dsv, venc, cargo, sup, eqs, us] = await Promise.all([api.listar('ssma_viagens_padrao', `integracao_id=eq.${id}&ativo=eq.true&order=ordem`),
    api.listar('ssma_avaliacoes_padrinho', `integracao_id=eq.${id}&ativo=eq.true&order=data.desc`), api.listar('ssma_desvios', `integracao_id=eq.${id}&ativo=eq.true&order=data.desc`),
    api.listar('v_ssma_vencimentos', `ref_id=eq.${i.colaborador_id}&order=vencimento`).catch(() => []), i.c?.cargo_id ? api.um('cargos', `id=eq.${i.c.cargo_id}&select=nome,cnh_minima`).catch(() => null) : null,
    ssmaSup(), typeof eqsAtivos === 'function' ? eqsAtivos().catch(() => []) : [], usuarios()]);
  const U = porId(us), ok = vs.filter(v => v.resultado === 'satisfatoria' && v.atestado_em).length, pend = vs.find(v => !v.atestado_em);
  const pos = avs.filter(a => a.positiva).length, acc = avs.length ? Math.round(100 * pos / avs.length) : null;
  const aberta = ['em_integracao', 'aguardando_liberacao'].includes(i.status);
  const cnhOk = !cargo?.cnh_minima || !i.c?.cnh_categoria || i.c.cnh_categoria.includes(cargo.cnh_minima) || i.c.cnh_categoria >= cargo.cnh_minima;
  const vencidos = venc.filter(v => v.vencimento < hojeISO());
  const fimPad = i.fim_apadrinhamento, acabou = fimPad && hojeISO() >= fimPad;
  tela.innerHTML = `<div class="topo"><div><h1>${esc(i.numero)} · ${esc(i.c?.nome || '')}</h1><p class="sub">${tagX(ST_INT, i.status)} ${i.padrinho_id ? tagX(BONUS_TXT, i.bonus_padrinho) : ''} · início ${dataBR(i.data_inicio)}${fimPad ? ' · apadrinhamento até ' + dataBR(fimPad) : ''}</p></div>
      <div class="acoes">${sup && i.status === 'aguardando_liberacao' ? '<button class="btn ok" id="liberar">✔ Liberar em definitivo</button>' : ''}${sup && i.status === 'bloqueado' ? '<button class="btn" id="desbloq">Desbloquear</button>' : ''}
        ${sup && aberta ? '<button class="btn perigo" id="reprovar">Reprovar</button>' : ''}${sup && i.padrinho_id && acabou && !i.bonus_aprovado_em && i.bonus_padrinho !== 'suspenso' ? '<button class="btn" id="bonus">Aprovar bônus do padrinho</button>' : ''}
        <a class="btn" href="#/ssma/desvios/novo?colab=${i.colaborador_id}">+ Desvio</a></div></div>
    ${i.motivo_status ? `<div class="cartao" style="border-left:4px solid var(--vermelho)"><b>Motivo:</b> ${esc(i.motivo_status)}</div>` : ''}
    <div class="grade" style="margin-bottom:14px">
      <div class="cartao kpi"><div class="n">${ok}/${i.viagens_exigidas}</div><div class="r">viagens padrão atestadas</div></div>
      <div class="cartao kpi ${acc != null && acc < 85 ? 'alerta' : ''}"><div class="n">${acc == null ? '—' : acc + '%'}</div><div class="r">avaliações positivas do padrinho (${avs.length})</div></div>
      <div class="cartao kpi ${i.pontos_motorista < 60 ? 'alerta' : ''}"><div class="n">${i.pontos_motorista}</div><div class="r">pontos do motorista</div></div>
      ${i.padrinho_id ? `<div class="cartao kpi ${i.pontos_padrinho < 80 ? 'alerta' : ''}"><div class="n">${i.pontos_padrinho}</div><div class="r">pontos do padrinho (${esc(i.pd?.nome || '')})</div></div>` : ''}
      <div class="cartao kpi ${cnhOk ? '' : 'alerta'}"><div class="n">${esc(i.c?.cnh_categoria || '—')}</div><div class="r">CNH ${cargo?.cnh_minima ? `(mínimo do cargo: ${esc(cargo.cnh_minima)})` : ''}${cnhOk ? '' : ' · <b>abaixo do exigido</b>'}</div></div>
      <div class="cartao kpi ${vencidos.length ? 'alerta' : ''}"><div class="n">${vencidos.length}</div><div class="r">documento(s) vencido(s)</div></div></div>
    <div class="cartao"><div class="topo" style="margin:0 0 8px"><div><h2 style="margin:0">Viagens padrão</h2><p class="muted" style="margin:2px 0 0">Sequenciais: a próxima só pode ser lançada depois de a anterior ser atestada como satisfatória.</p></div>
        ${editaSSMA() && aberta && !pend && ok < i.viagens_exigidas ? '<button class="btn prim peq" id="nova-viagem">+ Lançar viagem padrão</button>' : ''}</div>
      ${vs.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nº</th><th>Data</th><th>Rota / equipamento</th><th>Checklist</th><th>Resultado</th><th></th></tr></thead><tbody>
        ${vs.map(v => { const nc = (v.checklist || []).filter(x => x.ok === false).length; return `<tr><td data-r="Nº"><b>${v.ordem}ª</b></td><td data-r="Data">${dataBR(v.data)}</td><td data-r="Rota">${esc(v.rota || '—')}</td>
          <td data-r="Checklist">${(v.checklist || []).length ? `${(v.checklist || []).filter(x => x.ok).length} conforme(s)${nc ? ` · <b class="txt-verm">${nc} não conforme(s)</b>` : ''}` : '—'}</td>
          <td data-r="Resultado">${v.atestado_em ? `${v.resultado === 'satisfatoria' ? '<span class="tag verde">Satisfatória</span>' : '<span class="tag vermelho">Insatisfatória</span>'}<div class="muted" style="font-size:12px">atestada por ${esc(U[v.atestado_por]?.nome || '')} em ${dataHoraBR(v.atestado_em)}</div>` : '<span class="tag amarelo">Aguardando atestado</span>'}</td>
          <td>${!v.atestado_em && editaSSMA() ? `<button class="btn prim peq" data-atestar="${v.id}">Atestar</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="vazio">Nenhuma viagem padrão lançada.</div>'}</div>
    ${i.padrinho_id ? `<div class="cartao"><div class="topo" style="margin:0 0 8px"><div><h2 style="margin:0">Programa Padrinho · avaliações diárias</h2><p class="muted" style="margin:2px 0 0">Meta: 85% de avaliações positivas no período. Padrinho: <b>${esc(i.pd?.nome || '')}</b></p></div>
        ${editaSSMA() && !['cancelado', 'reprovado'].includes(i.status) && !acabou ? '<button class="btn prim peq" id="nova-aval">+ Avaliação do dia</button>' : ''}</div>
      ${avs.length ? `<div class="ss-dias">${avs.slice().reverse().map(a => `<span class="ss-dia ${a.positiva ? 'ok' : 'neg'}" title="${dataBR(a.data)} · ${a.positiva ? 'positiva' : 'negativa'}${a.comentario ? ' · ' + esc(a.comentario) : ''}"></span>`).join('')}</div>
        <ul class="lista-simples" style="margin-top:8px">${avs.slice(0, 8).map(a => `<li><span><b>${dataBR(a.data)}</b> ${a.positiva ? '<span class="tag verde">Positiva</span>' : '<span class="tag vermelho">Negativa</span>'}${a.comentario ? `<div class="muted">${esc(a.comentario)}</div>` : ''}</span></li>`).join('')}</ul>` : '<div class="vazio">Nenhuma avaliação lançada.</div>'}
      ${i.bonus_aprovado_em ? `<p class="muted">Bônus aprovado por ${esc(U[i.bonus_aprovado_por]?.nome || '')} em ${dataHoraBR(i.bonus_aprovado_em)} — encaminhar ao DP (pagamento só após confirmação do jurídico).</p>` : ''}</div>` : ''}
    <div class="cartao"><h2>Desvios no período</h2>${dsv.length ? `<ul class="lista-simples">${dsv.map(x => `<li class="clicavel" onclick="location.hash='#/ssma/desvios/ver/${x.id}'"><span><b>${esc(x.numero)}</b> ${tagX(GRAV_DSV, x.gravidade)} ${esc(x.descricao)}<div class="muted">${dataBR(x.data)} · motorista −${x.pontos_motorista} · padrinho −${x.pontos_padrinho}</div></span>${tagX(ST_DSV, x.status)}</li>`).join('')}</ul>` : '<div class="vazio">Nenhum desvio.</div>'}</div>
    <div class="cartao"><h2>Documentos do motorista</h2>${venc.length ? `<ul class="lista-simples">${venc.map(v => { const dd = diasAteSsma(v.vencimento); return `<li><span>${esc(v.documento)}</span><span>${dataBR(v.vencimento)} ${dd < 0 ? '<span class="tag vermelho">Vencido</span>' : dd <= 30 ? `<span class="tag amarelo">${dd} dia(s)</span>` : ''}</span></li>`; }).join('')}</ul>` : '<div class="vazio">Nenhum documento com vencimento cadastrado.</div>'}</div>
    ${avisoLei('padrinho')}`;
  const rec = async () => navegar();
  $('#nova-viagem')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>${vs.length + 1}ª viagem padrão</h2><div class="form">
      <label class="campo">Data<input type="date" name="data" value="${hojeISO()}" required></label>
      <label class="campo largo">Rota / origem → destino<input name="rota" placeholder="Ex.: Fazenda X → Fábrica Y"></label>
      <label class="campo largo">Equipamento<select name="equipamento_id">${opcoes(eqs, null, e => typeof rotuloEq === 'function' ? rotuloEq(e) : e.codigo_frota, null, '—')}</select></label>
      <div class="campo largo"><span>Checklist</span>${checklistHtml(CHECK_VIAGEM)}</div>
      <label class="campo largo">Observação<textarea name="observacao" rows="2"></textarea></label>
      <div class="campo largo"><span>Atestado do SSMA</span><label class="check"><input type="radio" name="res" value="" checked> Só registrar (atestar depois)</label>
        <label class="check"><input type="radio" name="res" value="satisfatoria"> Atestar como satisfatória</label><label class="check"><input type="radio" name="res" value="insatisfatoria"> Atestar como insatisfatória</label></div></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Salvar</button></div></form>`, { aoAbrir: f => $('.modal', f).classList.add('modal-largo') });
    if (!r) return;
    try { const [v] = await api.inserir('ssma_viagens_padrao', { integracao_id: id, ordem: 0, data: r.data, rota: r.rota || null, equipamento_id: r.equipamento_id || null, checklist: lerChecklist(CHECK_VIAGEM, r),
      observacao: r.observacao || null, ...(r.res ? { resultado: r.res, atestado_em: new Date().toISOString() } : {}) }); aviso('Viagem registrada.'); rec(); } catch (err) { falha(err); }
  });
  $$('[data-atestar]', tela).forEach(b => (b.onclick = async () => {
    const v = vs.find(x => x.id === b.dataset.atestar);
    const r = await modal(`<form><h2>Atestar ${v.ordem}ª viagem padrão</h2><div class="form"><div class="campo largo"><span>Checklist</span>${checklistHtml(CHECK_VIAGEM, v.checklist || [])}</div>
      <label class="campo largo">Observação<textarea name="observacao" rows="2">${esc(v.observacao || '')}</textarea></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn perigo" value="insatisfatoria">Insatisfatória</button><button class="btn ok" value="satisfatoria">✔ Satisfatória</button></div></form>`, { aoAbrir: f => $('.modal', f).classList.add('modal-largo') });
    if (!r) return;
    try { await api.alterar('ssma_viagens_padrao', `id=eq.${v.id}`, { checklist: lerChecklist(CHECK_VIAGEM, r), observacao: r.observacao || null, resultado: r._acao, atestado_em: new Date().toISOString() });
      aviso(r._acao === 'satisfatoria' ? 'Viagem atestada como satisfatória.' : 'Viagem atestada como insatisfatória: lance uma nova viagem padrão.'); rec(); } catch (err) { falha(err); }
  }));
  $('#nova-aval')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Avaliação do dia · padrinho</h2><div class="form"><label class="campo">Data<input type="date" name="data" value="${hojeISO()}" max="${hojeISO()}" required></label>
      <div class="campo largo"><span>Checklist</span>${checklistHtml(CHECK_AVAL)}</div>
      <label class="campo largo">Comentário do padrinho<textarea name="comentario" rows="2"></textarea></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn perigo" value="neg">Avaliação negativa</button><button class="btn ok" value="pos">Avaliação positiva</button></div></form>`, { aoAbrir: f => $('.modal', f).classList.add('modal-largo') });
    if (!r) return;
    try { await api.inserir('ssma_avaliacoes_padrinho', { integracao_id: id, data: r.data, positiva: r._acao === 'pos', checklist: lerChecklist(CHECK_AVAL, r), comentario: r.comentario || null }); aviso('Avaliação registrada.'); rec(); } catch (err) { falha(/duplicate|unique/i.test(err.message) ? new Error('Já existe avaliação nesta data.') : err); }
  });
  const mudar = async (status, txt, motivo) => { try { await api.alterar('ssma_integracoes', `id=eq.${id}`, { status, ...(motivo ? { motivo_status: motivo } : {}) }); aviso(txt); rec(); } catch (err) { falha(err); } };
  $('#liberar')?.addEventListener('click', async () => { if (await confirmar(`Liberar ${i.c?.nome} em definitivo?`, { botao: 'Liberar' })) mudar('liberado', 'Motorista liberado em definitivo.'); });
  $('#desbloq')?.addEventListener('click', async () => { const m = await confirmar('Desbloquear o motorista (volta para integração)?', { comMotivo: true, botao: 'Desbloquear' }); if (m) mudar('em_integracao', 'Motorista desbloqueado.', 'Desbloqueado: ' + m); });
  $('#reprovar')?.addEventListener('click', async () => { const m = await confirmar('Reprovar a integração?', { comMotivo: true, botao: 'Reprovar' }); if (m) mudar('reprovado', 'Integração reprovada.', m); });
  $('#bonus')?.addEventListener('click', async () => { try { const x = await api.rpc('aprovar_bonus_padrinho', { p_id: id }); aviso(`Bônus aprovado (${BONUS_TXT[x.bonus][0]}, ${x.aceitacao}% de aceitação). Encaminhe ao DP.`); rec(); } catch (err) { falha(err); } });
});

// ===================== Desvios =====================
rota('/ssma/desvios', async tela => {
  const ls = await api.listar('ssma_desvios', 'ativo=eq.true&select=*,c:colaboradores(nome),e:equipamentos(codigo_frota)&order=data.desc,criado_em.desc&limit=500');
  tela.innerHTML = `<div class="topo"><div><h1>Desvios</h1><p class="sub">Desvios comportamentais e operacionais flagrados em campo · 10 Regras de Ouro</p></div><div class="acoes"><a class="btn prim" href="#/ssma/desvios/novo">+ Registrar desvio</a></div></div>
    <div class="cartao">${ls.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nº</th><th>Data</th><th>Colaborador</th><th>Regra de Ouro</th><th>Desvio</th><th>Gravidade</th><th>Situação</th></tr></thead><tbody>
      ${ls.map(x => `<tr class="clicavel" data-d="${x.id}" onclick="location.hash='#/ssma/desvios/ver/${x.id}'"${fAttr('grav', GRAV_DSV[x.gravidade]?.[0])}${fAttr('sit', ST_DSV[x.status]?.[0])}${fAttr('regra', x.regra_ouro ? x.regra_ouro + '. ' + REGRAS_OURO[x.regra_ouro - 1] : 'Sem regra')}${fAttr('colab', x.c?.nome)}${fAttr('data', x.data)}${fAttr('busca', [x.numero, x.c?.nome, x.descricao, x.local].join(' '))}>
        <td data-r="Nº" class="nowrap"><b>${esc(x.numero)}</b></td><td data-r="Data" class="nowrap">${dataBR(x.data)}</td><td data-r="Colaborador">${esc(x.c?.nome || '—')}${x.integracao_id ? ' <span class="tag azul">em integração</span>' : ''}</td>
        <td data-r="Regra de Ouro">${x.regra_ouro ? `<b>${x.regra_ouro}</b>. ${esc(REGRAS_OURO[x.regra_ouro - 1])}` : '—'}</td><td data-r="Desvio">${esc(x.descricao)}</td><td data-r="Gravidade">${tagX(GRAV_DSV, x.gravidade)}</td><td data-r="Situação">${tagX(ST_DSV, x.status)}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="vazio">Nenhum desvio registrado.</div>'}</div>`;
  filtroLocal(tela, { itens: 'tbody tr[data-d]', antes: '.cartao:last-of-type', campos: [{ k: 'grav', rotulo: 'Gravidade' }, { k: 'regra', rotulo: 'Regra de Ouro' }, { k: 'colab', rotulo: 'Colaborador' }, { k: 'sit', rotulo: 'Situação' }], periodo: true });
});

rota('/ssma/desvios/novo', async tela => {
  const [cs, eqs, pmr] = await Promise.all([colabsBasico(), typeof eqsAtivos === 'function' ? eqsAtivos().catch(() => []) : [], api.um('configuracoes', 'chave=eq.ssma_parametros&select=valor').catch(() => null)]);
  const ded = pmr?.valor?.deducoes || {}; const colIni = estado.params.get('colab') || '';
  tela.innerHTML = `<div class="topo"><div><h1>Registrar desvio</h1><p class="sub">Cadastro rápido do que foi flagrado em campo</p></div></div>
    <form class="cartao form" id="f-dsv">
      <label class="campo">Data<input type="date" name="data" value="${hojeISO()}" max="${hojeISO()}" required></label>
      <label class="campo">Tipo<select name="tipo"><option value="comportamental">Comportamental</option><option value="operacional">Operacional</option></select></label>
      <label class="campo largo">Colaborador<select name="colaborador_id">${opcoes(cs, null, c => c.nome + (c.cargo ? ' · ' + c.cargo : ''), colIni || null, 'Não identificado')}</select></label>
      <label class="campo largo">Regra de Ouro violada<select name="regra_ouro"><option value="">Nenhuma / outro desvio</option>${REGRAS_OURO.map((r, k) => `<option value="${k + 1}">${k + 1}. ${esc(r)}</option>`).join('')}</select></label>
      <div class="campo largo"><span>Gravidade *</span><div class="ss-grav">${Object.entries(GRAV_DSV).map(([k, [t, cor, ex]]) => `<label class="ss-grav-op ${k}"><input type="radio" name="gravidade" value="${k}" required ${k === 'media' ? 'checked' : ''}><b>${t}</b><small>${esc(ex)}</small><small>Motorista −${ded[k]?.motorista ?? '?'} pts · padrinho −${ded[k]?.padrinho ?? '?'} pts</small></label>`).join('')}</div>
        <div class="muted" id="dsv-efeito" style="margin-top:6px"></div></div>
      <label class="campo largo">O que aconteceu *<textarea name="descricao" rows="3" required></textarea></label>
      <label class="campo">Local<input name="local" placeholder="Talhão, pátio, rodovia…"></label>
      <label class="campo">Equipamento<select name="equipamento_id">${opcoes(eqs, null, e => typeof rotuloEq === 'function' ? rotuloEq(e) : e.codigo_frota, null, '—')}</select></label>
      ${camposAnexoHtml()}
      <div class="largo acoes"><button class="btn prim">Registrar</button><a class="btn" href="#/ssma/desvios">Cancelar</a></div></form>
    ${avisoLei('padrinho')}`;
  const EF = { gravissima: 'Bloqueio imediato do motorista, suspensão do bônus do padrinho e auditoria de campo compulsória (vira ação no plano).', grave: 'Advertência, indicação de perda do prêmio mensal (só após DP + jurídico) e bônus do padrinho reduzido em 50%.',
    media: 'Alerta no perfil e re-treinamento presencial com o padrinho em até 5 dias (vira ação no plano).', leve: 'Registro e orientação.' };
  const f = $('#f-dsv'), ef = () => { $('#dsv-efeito').textContent = 'Efeito: ' + (EF[formDados(f).gravidade] || ''); };
  f.addEventListener('change', ef); ef();
  f.onsubmit = async e => { e.preventDefault(); const d = formDados(f);
    if (['gravissima', 'grave'].includes(d.gravidade) && !await confirmar(`Registrar desvio ${GRAV_DSV[d.gravidade][0].toUpperCase()}? ${EF[d.gravidade]}`, { botao: 'Registrar' })) return;
    await ocupado(e.submitter, async () => { try {
      const [x] = await api.inserir('ssma_desvios', { data: d.data, tipo: d.tipo, colaborador_id: d.colaborador_id || null, regra_ouro: d.regra_ouro ? Number(d.regra_ouro) : null, gravidade: d.gravidade,
        descricao: d.descricao, local: d.local || null, equipamento_id: d.equipamento_id || null });
      await salvarAnexosForm('ssma_desvio', x.id, d); aviso(`Desvio ${x.numero} registrado.`); location.hash = '#/ssma/desvios/ver/' + x.id; } catch (err) { falha(err); } }); };
});

rota('/ssma/desvios/ver/:id', async (tela, id) => {
  const x = await api.um('ssma_desvios', `id=eq.${id}&select=*,c:colaboradores(nome),e:equipamentos(codigo_frota),i:ssma_integracoes(numero,id)`);
  if (!x) { tela.innerHTML = '<div class="cartao vazio">Desvio não encontrado ou sem acesso.</div>'; return; }
  const [anx, us] = await Promise.all([htmlAnexos('ssma_desvio', id), usuarios()]); const U = porId(us);
  tela.innerHTML = `<div class="topo"><div><h1>${esc(x.numero)} · ${tagX(GRAV_DSV, x.gravidade)}</h1><p class="sub">${dataBR(x.data)} · ${x.tipo === 'operacional' ? 'Operacional' : 'Comportamental'} · registrado por ${esc(U[x.criado_por]?.nome || '—')}</p></div>
      <div class="acoes">${editaSSMA() && x.status === 'aberto' ? '<button class="btn ok" id="tratar">Registrar tratativa</button><button class="btn perigo" id="cancelar">Cancelar</button>' : ''}<a class="btn" href="#/ssma/desvios">Voltar</a></div></div>
    <div class="cartao"><div class="form">
      <div><div class="muted">Colaborador</div><b>${esc(x.c?.nome || 'Não identificado')}</b>${x.i ? `<div><a href="#/ssma/integracoes/ver/${x.i.id}">Integração ${esc(x.i.numero)}</a></div>` : ''}</div>
      <div><div class="muted">Regra de Ouro</div><b>${x.regra_ouro ? x.regra_ouro + '. ' + esc(REGRAS_OURO[x.regra_ouro - 1]) : '—'}</b></div>
      <div><div class="muted">Pontos</div><b>Motorista −${x.pontos_motorista}</b>${x.pontos_padrinho ? ` · <b>padrinho −${x.pontos_padrinho}</b>` : ''}</div>
      <div><div class="muted">Local / equipamento</div><b>${esc([x.local, x.e?.codigo_frota].filter(Boolean).join(' · ') || '—')}</b></div>
      <div class="largo"><div class="muted">O que aconteceu</div><div style="white-space:pre-line">${esc(x.descricao)}</div></div>
      <div class="largo"><div class="muted">Ação sistêmica</div><b>${esc(x.acao_sistemica || '—')}</b>${x.retreinamento_ate ? ` · re-treinamento até ${dataBR(x.retreinamento_ate)}` : ''}</div>
      ${x.indicacao_dp ? `<div class="largo"><div class="alerta-obs"><b>Indicação ao DP (não automática):</b> ${esc(x.indicacao_dp)}</div></div>` : ''}
      ${x.tratativa ? `<div class="largo"><div class="muted">Tratativa</div><div style="white-space:pre-line">${esc(x.tratativa)}</div></div>` : ''}
      <div class="largo"><div class="muted">Evidências</div>${anx}</div></div></div>${avisoLei('padrinho')}`;
  $('#tratar')?.addEventListener('click', async () => { const r = await modal(`<form><h2>Tratativa do desvio</h2><label class="campo">O que foi feito *<textarea name="t" rows="4" required></textarea></label>${camposAnexoHtml()}
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn ok">Salvar e encerrar</button></div></form>`);
    if (!r) return; try { await salvarAnexosForm('ssma_desvio', id, r); await api.alterar('ssma_desvios', `id=eq.${id}`, { status: 'tratado', tratativa: r.t }); aviso('Desvio tratado.'); navegar(); } catch (err) { falha(err); } });
  $('#cancelar')?.addEventListener('click', async () => { const m = await confirmar('Cancelar o desvio (registro errado)? A pontuação já descontada não volta sozinha.', { comMotivo: true, botao: 'Cancelar desvio' });
    if (m) try { await api.alterar('ssma_desvios', `id=eq.${id}`, { status: 'cancelado', tratativa: 'Cancelado: ' + m }); aviso('Desvio cancelado.'); navegar(); } catch (err) { falha(err); } });
});

// ===================== Documentos corporativos e vencimentos =====================
rota('/ssma/documentos', async tela => {
  const aba = estado.params.get('aba') || 'vencimentos';
  const ABAS = [['vencimentos', 'Painel preditivo de vencimentos'], ['corporativos', 'Documentos corporativos (APR, PGR, PCMSO, POP)']];
  const topo = `<div class="topo"><div><h1>Documentos e vencimentos</h1><p class="sub">Alertas com 30, 15 e 7 dias de antecedência</p></div>${editaSSMA() ? '<div class="acoes"><button class="btn prim" id="novo-doc">+ Documento corporativo</button></div>' : ''}</div>
    <div class="abas">${ABAS.map(([k, t]) => `<a href="#/ssma/documentos?aba=${k}" class="${k === aba ? 'ativa' : ''}">${t}</a>`).join('')}</div>`;
  const faixa = d => { const n = diasAteSsma(d); return n < 0 ? ['Vencido', 'vermelho', 'vencido'] : n <= 7 ? ['7 dias', 'vermelho', '7'] : n <= 15 ? ['15 dias', 'laranja', '15'] : n <= 30 ? ['30 dias', 'amarelo', '30'] : ['Em dia', 'verde', 'ok']; };
  if (aba === 'vencimentos') {
    const ls = await api.listar('v_ssma_vencimentos', 'order=vencimento').catch(() => []);
    const ORIG = { colaborador: 'Colaboradores', veiculo: 'Veículos', corporativo: 'Corporativos' };
    const cont = k => ls.filter(v => faixa(v.vencimento)[2] === k).length;
    tela.innerHTML = `${topo}<div class="grade" style="margin-bottom:14px">${[['vencido', 'vencido(s)'], ['7', 'vencem em até 7 dias'], ['15', 'em 8 a 15 dias'], ['30', 'em 16 a 30 dias']].map(([k, t]) => `<div class="cartao kpi ${k !== '30' && cont(k) ? 'alerta' : ''}"><div class="n">${cont(k)}</div><div class="r">${t}</div></div>`).join('')}</div>
      <div class="cartao">${ls.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Vencimento</th><th>Prazo</th><th>De quem</th><th>Documento</th><th>Grupo</th><th></th></tr></thead><tbody>
        ${ls.map(v => { const [t, c] = faixa(v.vencimento), n = diasAteSsma(v.vencimento); return `<tr data-v="1"${fAttr('grupo', ORIG[v.origem])}${fAttr('faixa', t)}${fAttr('data', v.vencimento)}${fAttr('busca', [v.referencia, v.documento].join(' '))}>
          <td data-r="Vencimento" class="nowrap"><b>${dataBR(v.vencimento)}</b></td><td data-r="Prazo"><span class="tag ${c}">${t}</span> <span class="muted">${n < 0 ? `há ${-n} dia(s)` : `em ${n} dia(s)`}</span></td>
          <td data-r="De quem">${esc(v.referencia)}</td><td data-r="Documento">${esc(v.documento)}</td><td data-r="Grupo">${esc(ORIG[v.origem] || v.origem)}</td><td><a class="btn peq" href="${esc(v.link)}">Abrir</a></td></tr>`; }).join('')}</tbody></table></div>` : '<div class="vazio">Nenhum documento com vencimento.</div>'}</div>`;
    filtroLocal(tela, { itens: 'tbody tr[data-v]', antes: '.cartao:last-of-type', campos: [{ k: 'faixa', rotulo: 'Prazo' }, { k: 'grupo', rotulo: 'Grupo' }], periodo: true, rotuloPeriodo: 'Vencimento' });
  } else {
    const ls = await api.listar('ssma_documentos', 'ativo=eq.true&substituido_em=is.null&order=tipo,titulo').catch(() => []);
    tela.innerHTML = `${topo}<div class="cartao">${ls.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Tipo</th><th>Documento</th><th>Local / atividade</th><th>Responsável</th><th>Emissão</th><th>Vencimento</th><th></th></tr></thead><tbody>
      ${ls.map(x => { const [t, c] = x.vencimento ? faixa(x.vencimento) : ['Sem validade', '']; return `<tr data-x="${x.id}"${fAttr('tipo', x.tipo)}${fAttr('busca', [x.titulo, x.codigo, x.local_atividade, x.responsavel].join(' '))}><td data-r="Tipo"><b>${esc(x.tipo)}</b></td>
        <td data-r="Documento">${esc(x.titulo)}${x.codigo ? ` <span class="muted">${esc(x.codigo)}${x.versao ? ' rev. ' + esc(x.versao) : ''}</span>` : ''}</td><td data-r="Local">${esc(x.local_atividade || '—')}</td><td data-r="Responsável">${esc(x.responsavel || '—')}</td>
        <td data-r="Emissão">${dataBR(x.emissao) || '—'}</td><td data-r="Vencimento">${x.vencimento ? dataBR(x.vencimento) + ` <span class="tag ${c}">${t}</span>` : '—'}</td>
        <td class="nowrap"><button class="btn peq" data-ver="${x.id}">Abrir</button></td></tr>`; }).join('')}</tbody></table></div>` : '<div class="vazio">Nenhum documento corporativo cadastrado. Cadastre APRs, PGR, PCMSO e POPs com o arquivo e o vencimento.</div>'}</div>`;
    filtroLocal(tela, { itens: 'tbody tr[data-x]', antes: '.cartao:last-of-type', campos: [{ k: 'tipo', rotulo: 'Tipo' }] });
    $$('[data-ver]', tela).forEach(b => (b.onclick = () => formDocSsma(ls.find(x => x.id === b.dataset.ver))));
  }
  $('#novo-doc')?.addEventListener('click', () => formDocSsma());
});
async function formDocSsma(x = null) {
  const anx = x ? await htmlAnexos('ssma_documento', x.id) : '';
  const r = await modal(`<form><h2>${x ? esc(x.tipo + ' · ' + x.titulo) : 'Documento corporativo'}</h2><div class="form">
    <label class="campo">Tipo<select name="tipo">${DOC_SSMA_TIPOS.map(t => `<option ${t === x?.tipo ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <label class="campo">Código<input name="codigo" value="${esc(x?.codigo || '')}"></label><label class="campo">Revisão / versão<input name="versao" value="${esc(x?.versao || '')}"></label>
    <label class="campo largo">Título *<input name="titulo" required value="${esc(x?.titulo || '')}" placeholder="Ex.: APR — Carregamento de tritrem no talhão"></label>
    <label class="campo">Local / atividade<input name="local_atividade" value="${esc(x?.local_atividade || '')}"></label><label class="campo">Responsável<input name="responsavel" value="${esc(x?.responsavel || '')}"></label>
    <label class="campo">Emissão<input type="date" name="emissao" value="${x?.emissao || ''}"></label><label class="campo">Vencimento<input type="date" name="vencimento" value="${x?.vencimento || ''}"></label>
    <label class="campo largo">Observação<textarea name="observacao" rows="2">${esc(x?.observacao || '')}</textarea></label>
    ${x ? `<div class="largo"><div class="muted">Arquivos</div>${anx}</div>` : ''}${editaSSMA() ? camposAnexoHtml() : ''}
    ${x && editaSSMA() ? '<label class="check largo"><input type="checkbox" name="nova_revisao"> Salvar como <b>nova revisão</b> (a atual fica no histórico como substituída)</label>' : ''}</div>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button>${editaSSMA() ? '<button class="btn prim">Salvar</button>' : ''}</div></form>`, { aoAbrir: f => $('.modal', f).classList.add('modal-largo') });
  if (!r) return;
  const dados = { tipo: r.tipo, titulo: r.titulo, codigo: r.codigo || null, versao: r.versao || null, local_atividade: r.local_atividade || null, responsavel: r.responsavel || null,
    emissao: r.emissao || null, vencimento: r.vencimento || null, observacao: r.observacao || null };
  try {
    let alvo = x?.id;
    if (x && r.nova_revisao) { await api.alterar('ssma_documentos', `id=eq.${x.id}`, { substituido_em: new Date().toISOString() }); [{ id: alvo }] = await api.inserir('ssma_documentos', dados); }
    else if (x) await api.alterar('ssma_documentos', `id=eq.${x.id}`, dados);
    else [{ id: alvo }] = await api.inserir('ssma_documentos', dados);
    await salvarAnexosForm('ssma_documento', alvo, r); aviso('Documento salvo.'); navegar();
  } catch (err) { falha(err); }
}

// ===================== Regras e metas (parâmetros) =====================
rota('/ssma/parametros', async tela => {
  const [cfg, sup, us, sups] = await Promise.all([api.um('configuracoes', 'chave=eq.ssma_parametros&select=valor'), ssmaSup(), usuarios(), api.um('configuracoes', 'chave=eq.ssma_supervisores&select=valor').catch(() => null)]);
  const p = cfg?.valor || {}, d = p.deducoes || {}, U = porId(us);
  const dis = sup ? '' : 'disabled';
  tela.innerHTML = `<div class="topo"><div><h1>Regras e metas do SSMA</h1><p class="sub">${sup ? 'Você é supervisor de SSMA: pode alterar regras, pesos e metas.' : 'Somente visualização — quem altera é o supervisor de SSMA.'}</p></div></div>
    <form class="cartao form" id="f-par">
      <label class="campo">Período do apadrinhamento (dias)<input type="number" name="periodo_padrinho_dias" value="${p.periodo_padrinho_dias ?? 90}" ${dis}></label>
      <label class="campo">Meta de avaliações positivas (%)<input type="number" name="meta_aceitacao_pct" value="${p.meta_aceitacao_pct ?? 85}" ${dis}></label>
      <label class="campo">Viagens padrão obrigatórias<input type="number" name="viagens_padrao" value="${p.viagens_padrao ?? 3}" ${dis}></label>
      <label class="campo">Meta de tempo de integração (dias úteis)<input type="number" name="meta_integracao_dias_uteis" value="${p.meta_integracao_dias_uteis ?? 5}" ${dis}></label>
      <label class="campo">Prazo do re-treinamento (dias)<input type="number" name="retreinamento_dias" value="${p.retreinamento_dias ?? 5}" ${dis}></label>
      <label class="campo">Meta de conformidade nas inspeções (%)<input type="number" name="meta_conformidade_pct" value="${p.meta_conformidade_pct ?? 95}" ${dis}></label>
      <label class="campo">Meta de antecedência na renovação (dias)<input type="number" name="meta_renovacao_dias" value="${p.meta_renovacao_dias ?? 15}" ${dis}></label>
      <div class="largo"><h3>Pontuação por gravidade</h3><div class="tabela-wrap"><table><thead><tr><th>Gravidade</th><th class="num">Dedução do motorista</th><th class="num">Impacto no padrinho</th></tr></thead><tbody>
        ${Object.entries(GRAV_DSV).map(([k, [t]]) => `<tr><td>${t}</td><td class="num"><input type="number" name="m_${k}" value="${d[k]?.motorista ?? 0}" style="max-width:100px" ${dis}></td><td class="num"><input type="number" name="p_${k}" value="${d[k]?.padrinho ?? 0}" style="max-width:100px" ${dis}></td></tr>`).join('')}</tbody></table></div></div>
      <div class="largo"><h3>10 Regras de Ouro</h3><ol class="ss-regras">${REGRAS_OURO.map(r => `<li>${esc(r)}</li>`).join('')}</ol></div>
      <div class="largo muted">Supervisores de SSMA: ${esc((sups?.valor || []).map(i => U[i]?.nome || i).join(', ') || '—')} (e administradores).</div>
      ${sup ? '<div class="largo acoes"><button class="btn prim">Salvar regras</button></div>' : ''}</form>${avisoLei('padrinho')}`;
  $('#f-par').onsubmit = async e => { e.preventDefault(); const f = formDados(e.target); const n = k => Number(f[k]);
    const novo = { ...p, periodo_padrinho_dias: n('periodo_padrinho_dias'), meta_aceitacao_pct: n('meta_aceitacao_pct'), viagens_padrao: n('viagens_padrao'), meta_integracao_dias_uteis: n('meta_integracao_dias_uteis'),
      retreinamento_dias: n('retreinamento_dias'), meta_conformidade_pct: n('meta_conformidade_pct'), meta_renovacao_dias: n('meta_renovacao_dias'),
      deducoes: Object.fromEntries(Object.keys(GRAV_DSV).map(k => [k, { motorista: n('m_' + k), padrinho: n('p_' + k) }])) };
    await ocupado(e.submitter, async () => { try { await api.rpc('salvar_ssma_parametros', { p: novo }); aviso('Regras salvas.'); navegar(); } catch (err) { falha(err); } }); };
});
