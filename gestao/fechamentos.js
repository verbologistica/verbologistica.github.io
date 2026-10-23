// Verbo Gestão — Fechamentos mensais de contratos por setor
//   Setor faz o fechamento → Compras confere (quando passa pelo Compras) → aprovador do setor aprova → conta a pagar no Financeiro.
'use strict';

const ST_FCH = { pendente: ['A fazer', 'amarelo'], devolvido: ['Devolvido p/ correção', 'vermelho'], em_compras: ['Conferência do Compras', 'azul'],
  em_aprovacao: ['Aguardando aprovação', 'azul'], no_financeiro: ['No Financeiro', 'verde'], cancelado: ['Cancelado', ''] };
const TIPO_CTR = { consumo: 'Conta de consumo (água, luz, internet…)', fixo_mensal: 'Valor fixo mensal', diaria: 'Por diária',
  medicao: 'Por medição', variavel: 'Valor variável' };
const DOC_FCH = ['Boleto', 'Fatura', 'Nota fiscal', 'Recibo', 'Medição', 'Outro'];
const tagFch = s => `<span class="tag ${ST_FCH[s]?.[1] || ''}">${ST_FCH[s]?.[0] || s}</span>`;
const compTxt = iso => iso ? mesTxt(iso.slice(0, 7)) : '—';

async function setoresFch() { return api.listar('setores_fechamento', 'order=nome'); }
const lancoSetor = (s) => tem('administrador') || [...(s?.lancadores || []), ...(s?.aprovadores || [])].includes(estado.usuario.id);
const aprovoSetor = (s) => (s?.aprovadores || []).includes(estado.usuario.id);
const confiroFch = () => tem('administrador', 'comprador');
const flagsFch = f => `${f.fora_prazo ? ' <span class="tag vermelho" title="Enviado depois do prazo de fechamento">fora do prazo</span>' : ''}${f.vencido_ao_enviar ? ' <span class="tag vermelho" title="A conta já estava vencida quando o fechamento foi feito">conta já vencida</span>' : ''}`;

// ---------- rateio entre centros de custo ----------
function htmlRateio(rateio, ccs) {
  const linhas = (rateio?.length ? rateio : [{ centro_custo_id: '', pct: 100 }]);
  const linha = r => `<div class="rt-linha" style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
      <select data-rt-cc style="flex:1">${opcoes(ccs.filter(c => c.ativo || c.id === r.centro_custo_id), null, c => (c.codigo ? c.codigo + ' · ' : '') + c.nome, r.centro_custo_id, 'Centro de custo…')}</select>
      <input data-rt-pct inputmode="decimal" style="width:90px" value="${esc(String(r.pct ?? '').replace('.', ','))}" aria-label="Percentual"> %
      <button type="button" class="btn peq" data-rt-del title="Tirar linha">✕</button></div>`;
  return `<div class="largo"><div class="muted" style="margin-bottom:4px">Centro de custo / rateio <span class="muted">(a soma precisa dar 100%)</span></div>
    <div data-rt>${linhas.map(linha).join('')}</div><button type="button" class="btn peq" data-rt-add>+ Ratear com outro centro de custo</button>
    <template data-rt-modelo>${linha({ centro_custo_id: '', pct: '' })}</template></div>`;
}
function ligarRateio(raiz) {
  const box = $('[data-rt]', raiz); if (!box) return;
  $('[data-rt-add]', raiz).onclick = () => { box.insertAdjacentHTML('beforeend', $('[data-rt-modelo]', raiz).innerHTML); };
  box.addEventListener('click', e => { const b = e.target.closest('[data-rt-del]'); if (b && $$('.rt-linha', box).length > 1) b.closest('.rt-linha').remove(); });
}
function lerRateio(raiz) {
  const ls = $$('[data-rt] .rt-linha', raiz).map(l => ({ centro_custo_id: $('[data-rt-cc]', l).value, pct: num($('[data-rt-pct]', l).value) }))
    .filter(r => r.centro_custo_id || r.pct);
  if (!ls.length) return [];
  if (ls.some(r => !r.centro_custo_id || !(r.pct > 0))) throw new Error('Rateio: escolha o centro de custo e o percentual de cada linha.');
  const soma = ls.reduce((a, r) => a + r.pct, 0);
  if (Math.abs(soma - 100) > 0.01) throw new Error(`Rateio: a soma dos percentuais está em ${String(soma).replace('.', ',')}% — precisa dar 100%.`);
  return ls;
}

// ---------- lista de fechamentos ----------
rota('/fechamentos', async tela => {
  try { await api.rpc('gerar_fechamentos'); } catch { /* sem acesso: só lista */ }
  const setorP = pLista('setor', 'todos'), etapaP = pLista('etapa', 'todos');
  const desde = somaMeses(hojeISO().slice(0, 7) + '-01', -3);
  const filtroSt = temTodos(etapaP) ? `or=(status.in.(pendente,devolvido,em_compras,em_aprovacao),competencia.gte.${desde})` : `status=in.(${etapaP.join(',')})`;
  const [ls, ss, fs] = await Promise.all([
    api.listar('fechamentos_contrato', `select=*,c:contratos_fechamento!inner(numero,descricao,setor,tipo,passa_compras,fornecedor_id)&${filtroSt}${temTodos(setorP) ? '' : '&c.setor=in.(' + setorP.join(',') + ')'}&order=competencia.desc,criado_em&limit=1000`),
    setoresFch(), fornecedores()]);
  const S = Object.fromEntries(ss.map(s => [s.codigo, s])), F = porId(fs);
  const fNome = id => F[id]?.nome_fantasia || F[id]?.razao_social || '';
  const umSetor = !temTodos(setorP) && setorP.length === 1 ? S[setorP[0]] : null;
  const mesAnt = somaMeses(hojeISO().slice(0, 7) + '-01', -1);
  const atrasados = ls.filter(f => ['pendente', 'devolvido'].includes(f.status) && f.competencia <= mesAnt);
  const podeCtr = ss.some(lancoSetor) || confiroFch() || editaFin();
  const acao = f => {
    const s = S[f.c.setor];
    if (['pendente', 'devolvido'].includes(f.status) && lancoSetor(s)) return `<a class="btn prim peq" href="#/fechamentos/ver/${f.id}">Fazer fechamento</a>`;
    if (f.status === 'em_compras' && confiroFch()) return `<a class="btn prim peq" href="#/fechamentos/ver/${f.id}">Conferir</a>`;
    if (f.status === 'em_aprovacao' && aprovoSetor(s)) return `<a class="btn ok peq" href="#/fechamentos/ver/${f.id}">Aprovar</a>`;
    return `<a class="btn peq" href="#/fechamentos/ver/${f.id}">Abrir</a>`;
  };
  tela.innerHTML = `
    <div class="topo"><div><h1>${umSetor ? 'Fechamentos · ' + esc(umSetor.nome) : 'Fechamentos de contratos'}</h1>
      <p class="sub">Fechamento mensal de cada fornecedor com contrato. O setor fecha, o Compras confere (quando se aplica), o aprovador do setor aprova e a conta vai para o Financeiro.</p></div>
      <div class="acoes">${podeCtr ? `<a class="btn" href="#/fechamentos/contratos${umSetor ? '?setor=' + umSetor.codigo : ''}">Contratos</a><a class="btn prim" href="#/fechamentos/contratos/novo${umSetor ? '?setor=' + umSetor.codigo : ''}">+ Novo contrato</a>` : ''}</div></div>
    <div class="grade" style="margin-bottom:14px">
      <a class="cartao kpi ${atrasados.length ? 'alerta' : ''}" href="#/fechamentos?etapa=pendente,devolvido${umSetor ? '&setor=' + umSetor.codigo : ''}"><div class="n">${atrasados.length}</div><div class="r">fechamento(s) de meses anteriores ainda não feitos</div></a>
      <a class="cartao kpi" href="#/fechamentos?etapa=em_compras${umSetor ? '&setor=' + umSetor.codigo : ''}"><div class="n">${ls.filter(f => f.status === 'em_compras').length}</div><div class="r">no Compras para conferir</div></a>
      <a class="cartao kpi" href="#/fechamentos?etapa=em_aprovacao${umSetor ? '&setor=' + umSetor.codigo : ''}"><div class="n">${ls.filter(f => f.status === 'em_aprovacao').length}</div><div class="r">aguardando aprovação do setor</div></a>
      <div class="cartao kpi"><div class="n">${ls.filter(f => f.fora_prazo || f.vencido_ao_enviar).length}</div><div class="r">fora do prazo ou com conta já vencida</div></div></div>
    ${umSetor ? `<p class="muted" style="margin:-4px 0 10px">Prazo de fechamento: ${umSetor.prazo_dia ? `<b>até o dia ${umSetor.prazo_dia} do mês seguinte</b>` : 'ainda não definido'} · Aprova: ${esc((await usuarios()).filter(u => umSetor.aprovadores.includes(u.id)).map(u => u.nome).join(', ') || '—')}</p>` : ''}
    <div class="cartao">${ls.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nº</th><th>Competência</th>${umSetor ? '' : '<th>Setor</th>'}<th>Fornecedor / contrato</th><th class="num">Valor</th><th>Vencimento</th><th>Etapa</th><th></th></tr></thead><tbody>
      ${ls.map(f => `<tr data-fch="${f.id}"${fAttr('setor', S[f.c.setor]?.nome)}${fAttr('etapa', ST_FCH[f.status]?.[0])}${fAttr('comp', compTxt(f.competencia))}${fAttr('forn', fNome(f.c.fornecedor_id) || f.c.descricao)}${fAttr('busca', [f.numero, f.c.numero, f.c.descricao, fNome(f.c.fornecedor_id), f.documento_numero].join(' '))}>
        <td data-r="Nº" class="nowrap"><b>${esc(f.numero)}</b></td><td data-r="Competência" class="nowrap">${compTxt(f.competencia)}</td>
        ${umSetor ? '' : `<td data-r="Setor">${esc(S[f.c.setor]?.nome || f.c.setor)}</td>`}
        <td data-r="Fornecedor / contrato"><b>${esc(fNome(f.c.fornecedor_id) || f.c.descricao)}</b>${fNome(f.c.fornecedor_id) ? `<div class="muted">${esc(f.c.descricao)}</div>` : ''}</td>
        <td data-r="Valor" class="num">${f.valor != null ? brl(f.valor) : '<span class="muted">—</span>'}</td><td data-r="Vencimento" class="nowrap">${dataBR(f.vencimento) || '—'}</td>
        <td data-r="Etapa">${tagFch(f.status)}${flagsFch(f)}</td><td data-r="">${acao(f)}</td></tr>`).join('')}
      </tbody></table></div>` : `<div class="vazio">Nenhum fechamento. ${podeCtr ? 'Cadastre os contratos do setor em <a href="#/fechamentos/contratos/novo">+ Novo contrato</a>: o fechamento de cada mês aparece aqui sozinho.' : ''}</div>`}</div>`;
  filtroLocal(tela, { itens: 'tbody tr[data-fch]', antes: '.cartao:last-of-type', campos: [...(umSetor ? [] : [{ k: 'setor', rotulo: 'Setor' }]), { k: 'etapa', rotulo: 'Etapa' }, { k: 'comp', rotulo: 'Competência' }, { k: 'forn', rotulo: 'Fornecedor' }] });
});

// ---------- detalhe e ações ----------
rota('/fechamentos/ver/:id', async (tela, id) => {
  const f = await api.um('fechamentos_contrato', `select=*,c:contratos_fechamento(*)&id=eq.${id}`);
  if (!f) { tela.innerHTML = '<div class="cartao vazio">Fechamento não encontrado ou sem acesso.</div>'; return; }
  const [ss, fs, us, ccs, cts, anx] = await Promise.all([setoresFch(), fornecedores(), usuarios(), centros(), contas(), htmlAnexos('fechamento_contrato', id)]);
  const s = ss.find(x => x.codigo === f.c.setor), F = porId(fs), U = porId(us), CC = porId(ccs), CT = porId(cts);
  const forn = F[f.c.fornecedor_id];
  const podeEnviar = ['pendente', 'devolvido'].includes(f.status) && lancoSetor(s);
  const podeConferir = f.status === 'em_compras' && confiroFch();
  const podeAprovar = f.status === 'em_aprovacao' && aprovoSetor(s);
  const podeCancelar = !['no_financeiro', 'cancelado'].includes(f.status) && (lancoSetor(s) || confiroFch());
  const rat = f.rateio?.length ? f.rateio.map(r => `${esc(CC[r.centro_custo_id]?.nome || '—')} ${String(r.pct).replace('.', ',')}%`).join(' · ') : '—';
  const passos = f.c.passa_compras ? ['Setor', 'Compras', 'Aprovação', 'Financeiro'] : ['Setor', 'Aprovação', 'Financeiro'];
  const idx = { pendente: 0, devolvido: 0, em_compras: 1, em_aprovacao: f.c.passa_compras ? 2 : 1, no_financeiro: passos.length - 1, cancelado: -1 }[f.status];
  tela.innerHTML = `
    <div class="topo"><div><h1>${esc(f.numero)} · ${esc(forn ? (forn.nome_fantasia || forn.razao_social) : f.c.descricao)}</h1>
      <p class="sub">${esc(s?.nome || f.c.setor)} · competência ${compTxt(f.competencia)} · ${tagFch(f.status)}${flagsFch(f)}</p></div>
      <div class="acoes">${podeEnviar ? `<button class="btn prim" id="enviar">${f.status === 'devolvido' ? 'Corrigir e reenviar' : 'Fazer fechamento'}</button>` : ''}
        ${podeConferir ? '<button class="btn prim" id="conferir">Conferir</button>' : ''}${podeAprovar ? '<button class="btn ok" id="aprovar">Aprovar e enviar ao Financeiro</button><button class="btn" id="devolver">Devolver</button>' : ''}
        ${f.titulo_id ? `<a class="btn" href="#/financeiro/pagar/ver/${f.titulo_id}">Ver conta a pagar</a>` : ''}${podeCancelar ? '<button class="btn perigo" id="cancelar">Cancelar</button>' : ''}
        <a class="btn" href="#/fechamentos?setor=${f.c.setor}">Voltar</a></div></div>
    ${f.status !== 'cancelado' ? `<div class="cartao"><div style="display:flex;gap:6px;flex-wrap:wrap">${passos.map((p, i) => `<span class="tag ${i < idx ? 'verde' : i === idx ? 'azul' : ''}">${i + 1}. ${p}${i < idx ? ' ✓' : ''}</span>`).join('<span class="muted">→</span>')}</div>
      ${f.status === 'devolvido' && f.devolvido_motivo ? `<p class="txt-verm" style="margin:8px 0 0"><b>Devolvido:</b> ${esc(f.devolvido_motivo)}</p>` : ''}</div>` : ''}
    ${f.fora_prazo || f.vencido_ao_enviar ? `<div class="cartao" style="border-left:4px solid var(--vermelho)">${f.fora_prazo ? '<div>⚠️ Fechamento enviado <b>fora do prazo</b> do setor.</div>' : ''}${f.vencido_ao_enviar ? `<div>⚠️ A conta <b>já estava vencida</b> (${dataBR(f.vencimento)}) quando o fechamento foi feito. O Financeiro é avisado.</div>` : ''}</div>` : ''}
    <div class="cartao"><div class="form">
      <div><div class="muted">Contrato</div><b>${esc(f.c.numero)}</b> · ${esc(f.c.descricao)}<div class="muted">${esc(TIPO_CTR[f.c.tipo] || f.c.tipo)}${f.c.passa_compras ? '' : ' · não passa pelo Compras'}</div></div>
      <div><div class="muted">Fornecedor</div><b>${esc(forn ? rotForn(forn) : '—')}</b></div>
      <div><div class="muted">Valor</div><b>${f.valor != null ? brl(f.valor) : '—'}</b>${f.c.valor_previsto ? `<div class="muted">previsto ${brl(f.c.valor_previsto)}</div>` : ''}${f.quantidade != null ? `<div class="muted">quantidade ${String(f.quantidade).replace('.', ',')}</div>` : ''}</div>
      <div><div class="muted">Vencimento</div><b>${dataBR(f.vencimento) || '—'}</b></div>
      <div><div class="muted">Documento</div><b>${esc([f.documento_tipo, f.documento_numero].filter(Boolean).join(' ') || '—')}</b></div>
      <div><div class="muted">Conta do plano</div><b>${esc(CT[f.conta_id || f.c.conta_id] ? CT[f.conta_id || f.c.conta_id].codigo + ' ' + CT[f.conta_id || f.c.conta_id].nome : '—')}</b></div>
      <div class="largo"><div class="muted">Centro de custo / rateio</div><b>${rat}</b></div>
      ${f.observacao ? `<div class="largo"><div class="muted">Observação</div><div style="white-space:pre-line">${esc(f.observacao)}</div></div>` : ''}
      <div class="largo"><div class="muted">Anexos (boleto, fatura, NF, medição)</div>${anx}${f.status !== 'cancelado' && (lancoSetor(s) || confiroFch()) ? ' <button class="btn peq" id="anexar" style="margin-top:6px">+ Anexar</button>' : ''}</div>
      <div><div class="muted">Enviado</div>${f.enviado_em ? `${esc(U[f.enviado_por]?.nome || '—')} · ${dataHoraBR(f.enviado_em)}` : '—'}</div>
      ${f.c.passa_compras ? `<div><div class="muted">Conferido (Compras)</div>${f.conferido_em ? `${esc(U[f.conferido_por]?.nome || '—')} · ${dataHoraBR(f.conferido_em)}` : '—'}</div>` : ''}
      <div><div class="muted">Aprovado</div>${f.aprovado_em ? `${esc(U[f.aprovado_por]?.nome || '—')} · ${dataHoraBR(f.aprovado_em)}` : `<span class="muted">aprova: ${esc(us.filter(u => s?.aprovadores.includes(u.id)).map(u => u.nome).join(', ') || '—')}</span>`}</div>
    </div></div>
    ${f.historico ? `<div class="cartao"><h2>Histórico</h2><div style="white-space:pre-line" class="muted">${esc(f.historico)}</div></div>` : ''}`;

  const rpc = async (fn, args, msg) => { try { const r = await api.rpc(fn, args); aviso(msg(r)); navegar(); return true; } catch (err) { falha(err); return false; } };
  $('#anexar')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Anexar no fechamento</h2><div class="form">${camposAnexoHtml()}</div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Anexar</button></div></form>`, { validar: d => !d.arquivos?.length && !d.links?.trim() ? 'Escolha um arquivo ou cole um link.' : null });
    if (!r) return;
    try { await salvarAnexosForm('fechamento_contrato', id, r); aviso('Anexado.'); navegar(); } catch (err) { falha(err); }
  });
  $('#enviar')?.addEventListener('click', async () => {
    const venc = f.vencimento || ''; let raizM;
    const r = await modal(`<form><h2>Fechamento ${esc(compTxt(f.competencia))}</h2><p class="muted">${esc(f.c.descricao)}</p><div class="form">
      <label class="campo">Valor (R$) *<input name="valor" inputmode="decimal" required value="${f.valor != null ? Number(f.valor).toFixed(2).replace('.', ',') : ''}" placeholder="0,00"></label>
      ${['diaria', 'medicao', 'consumo'].includes(f.c.tipo) ? `<label class="campo">${f.c.tipo === 'diaria' ? 'Nº de diárias' : f.c.tipo === 'medicao' ? 'Quantidade medida' : 'Consumo'}<input name="quantidade" inputmode="decimal" value="${f.quantidade != null ? String(f.quantidade).replace('.', ',') : ''}"></label>` : ''}
      <label class="campo">Vencimento (boleto/fatura) *<input type="date" name="vencimento" required value="${venc}"></label>
      <label class="campo">Documento<select name="documento_tipo">${DOC_FCH.map(t => `<option ${t === f.documento_tipo ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo">Nº do documento<input name="documento_numero" value="${esc(f.documento_numero || '')}"></label>
      <label class="campo largo">Conta do plano<select name="conta_id">${await opcoesContas(f.conta_id || f.c.conta_id, ['custo', 'despesa', 'financeiro', 'investimento', 'deducao'])}</select></label>
      ${htmlRateio(f.rateio, ccs)}
      <label class="campo largo">Observação<textarea name="observacao" rows="2">${esc(f.observacao || '')}</textarea></label>
      ${camposAnexoHtml()}
      <p class="muted largo" id="aviso-venc"></p></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim">Enviar fechamento</button></div></form>`, {
      aoAbrir: raiz => {
        raizM = raiz; ligarRateio(raiz);
        const v = $('[name=vencimento]', raiz), av = $('#aviso-venc', raiz);
        const chk = () => { av.innerHTML = v.value && v.value < hojeISO() ? '⚠️ <b class="txt-verm">Vencimento já passou:</b> o fechamento vai ao Financeiro com o aviso de conta vencida.' : ''; };
        v.oninput = chk; chk();
      },
      validar: d => { if (!(num(d.valor) > 0)) return 'Informe o valor.'; if (!d.vencimento) return 'Informe o vencimento.';
        try { d._rateio = lerRateio(raizM); } catch (err) { return err.message; } return null; } });
    if (!r) return;
    const rateio = r._rateio;
    try {
      await salvarAnexosForm('fechamento_contrato', id, r);
      await rpc('enviar_fechamento', { p_id: id, p_dados: { valor: num(r.valor), quantidade: num(r.quantidade), vencimento: r.vencimento, documento_tipo: r.documento_tipo,
        documento_numero: r.documento_numero, conta_id: r.conta_id || null, observacao: r.observacao, ...(rateio.length ? { rateio } : {}) } },
        x => x.status === 'em_compras' ? 'Fechamento enviado ao Compras para conferência.' : 'Fechamento enviado para aprovação.');
    } catch (err) { falha(err); }
  });
  $('#conferir')?.addEventListener('click', async () => { let raizC;
    const r = await modal(`<form><h2>Conferir ${esc(f.numero)}</h2><p class="muted">${esc(f.c.descricao)} · ${brl(f.valor)} · vence ${dataBR(f.vencimento)}</p><div class="form">
      <label class="campo">Documento<select name="documento_tipo">${DOC_FCH.map(t => `<option ${t === f.documento_tipo ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo">Nº do documento<input name="documento_numero" value="${esc(f.documento_numero || '')}"></label>
      <label class="campo largo">Conta do plano<select name="conta_id">${await opcoesContas(f.conta_id || f.c.conta_id, ['custo', 'despesa', 'financeiro', 'investimento', 'deducao'])}</select></label>
      ${htmlRateio(f.rateio, ccs)}
      <label class="campo largo">Observação / motivo da devolução<textarea name="motivo" rows="2"></textarea></label></div>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn perigo" value="devolver">Devolver ao setor</button><button class="btn prim" value="ok">Conferido: enviar para aprovação</button></div></form>`,
      { aoAbrir: raiz => { raizC = raiz; ligarRateio(raiz); }, validar: d => { if (d._acao === 'devolver') return !d.motivo ? 'Informe o motivo da devolução.' : null;
        try { d._rateio = lerRateio(raizC); } catch (err) { return err.message; } return null; } });
    if (!r) return;
    if (r._acao === 'devolver') return rpc('conferir_fechamento', { p_id: id, p_dados: {}, p_devolver: true, p_motivo: r.motivo }, () => 'Fechamento devolvido ao setor.');
    const rateio = r._rateio;
    rpc('conferir_fechamento', { p_id: id, p_dados: { documento_tipo: r.documento_tipo, documento_numero: r.documento_numero, conta_id: r.conta_id || null, ...(rateio.length ? { rateio } : {}) }, p_devolver: false, p_motivo: r.motivo || null },
      () => 'Conferido. Enviado para aprovação do setor.');
  });
  $('#aprovar')?.addEventListener('click', async () => {
    if (!(f.conta_id || f.c.conta_id)) aviso('Atenção: fechamento sem conta do plano — o Financeiro vai precisar classificar.', true);
    if (!await confirmar(`Aprovar ${f.numero} (${brl(f.valor)}, vence ${dataBR(f.vencimento)}) e enviar ao Financeiro?`, { botao: 'Aprovar' })) return;
    rpc('aprovar_fechamento', { p_id: id, p_aprovar: true, p_motivo: null }, x => `Aprovado. Conta a pagar ${x.titulo} criada no Financeiro.`);
  });
  $('#devolver')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Devolver ${esc(f.numero)}</h2><label class="campo">Motivo *<textarea name="motivo" required></textarea></label>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn perigo">Devolver</button></div></form>`);
    if (r) rpc('aprovar_fechamento', { p_id: id, p_aprovar: false, p_motivo: r.motivo }, () => 'Fechamento devolvido.');
  });
  $('#cancelar')?.addEventListener('click', async () => {
    const r = await modal(`<form><h2>Cancelar ${esc(f.numero)}?</h2><p class="muted">Use quando não houve cobrança no mês ou o contrato foi encerrado. Fica registrado no histórico.</p>
      <label class="campo">Motivo *<textarea name="motivo" required></textarea></label>
      <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button><button class="btn perigo">Cancelar fechamento</button></div></form>`);
    if (r) rpc('cancelar_fechamento', { p_id: id, p_motivo: r.motivo }, () => 'Fechamento cancelado.');
  });
});

// ---------- contratos ----------
rota('/fechamentos/contratos', async tela => {
  const setorP = pLista('setor', 'todos');
  const [cs, ss, fs, cts] = await Promise.all([
    api.listar('contratos_fechamento', `order=setor,descricao${temTodos(setorP) ? '' : '&setor=in.(' + setorP.join(',') + ')'}`), setoresFch(), fornecedores(), contas()]);
  const S = Object.fromEntries(ss.map(s => [s.codigo, s])), F = porId(fs), CT = porId(cts);
  const umSetor = !temTodos(setorP) && setorP.length === 1 ? S[setorP[0]] : null;
  const podeNovo = ss.some(lancoSetor) || confiroFch() || editaFin();
  tela.innerHTML = `
    <div class="topo"><div><h1>Contratos de fornecedores${umSetor ? ' · ' + esc(umSetor.nome) : ''}</h1><p class="sub">Fornecedores com fechamento mensal. Cada contrato gera o fechamento do mês para o setor responsável.</p></div>
      <div class="acoes"><a class="btn" href="#/fechamentos${umSetor ? '?setor=' + umSetor.codigo : ''}">Fechamentos</a>${podeNovo ? `<a class="btn prim" href="#/fechamentos/contratos/novo${umSetor ? '?setor=' + umSetor.codigo : ''}">+ Novo contrato</a>` : ''}</div></div>
    <div class="cartao">${cs.length ? `<div class="tabela-wrap"><table class="responsiva"><thead><tr><th>Nº</th>${umSetor ? '' : '<th>Setor</th>'}<th>Fornecedor / serviço</th><th>Tipo</th><th class="num">Valor previsto</th><th>Vence</th><th>Fluxo</th><th>Situação</th></tr></thead><tbody>
      ${cs.map(c => `<tr class="clicavel" data-ctr="${c.id}" onclick="location.hash='#/fechamentos/contratos/${c.id}'"${fAttr('setor', S[c.setor]?.nome)}${fAttr('tipo', TIPO_CTR[c.tipo])}${fAttr('sit', c.ativo ? 'Ativo' : 'Encerrado')}${fAttr('busca', [c.numero, c.descricao, F[c.fornecedor_id]?.razao_social, F[c.fornecedor_id]?.nome_fantasia].join(' '))}${c.ativo ? '' : ' style="opacity:.55"'}>
        <td data-r="Nº" class="nowrap"><b>${esc(c.numero)}</b></td>${umSetor ? '' : `<td data-r="Setor">${esc(S[c.setor]?.nome || c.setor)}</td>`}
        <td data-r="Fornecedor / serviço"><b>${esc(F[c.fornecedor_id] ? (F[c.fornecedor_id].nome_fantasia || F[c.fornecedor_id].razao_social) : '—')}</b><div class="muted">${esc(c.descricao)}${CT[c.conta_id] ? ' · ' + esc(CT[c.conta_id].codigo + ' ' + CT[c.conta_id].nome) : ''}</div></td>
        <td data-r="Tipo">${esc(TIPO_CTR[c.tipo] || c.tipo)}</td><td data-r="Valor previsto" class="num">${c.valor_previsto != null ? brl(c.valor_previsto) : '—'}</td>
        <td data-r="Vence">${c.dia_vencimento ? 'dia ' + c.dia_vencimento : '—'}</td><td data-r="Fluxo">${c.passa_compras ? 'Setor → Compras → Aprovação' : 'Setor → Aprovação'}</td>
        <td data-r="Situação">${c.ativo ? '<span class="tag verde">Ativo</span>' : '<span class="tag">Encerrado</span>'}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="vazio">Nenhum contrato cadastrado ainda.</div>'}</div>`;
  filtroLocal(tela, { itens: 'tbody tr[data-ctr]', antes: '.cartao:last-of-type', campos: [...(umSetor ? [] : [{ k: 'setor', rotulo: 'Setor' }]), { k: 'tipo', rotulo: 'Tipo' }, { k: 'sit', rotulo: 'Situação' }] });
});

async function formContrato(tela, c = null) {
  const [ss, fs, ccs] = await Promise.all([setoresFch(), fornecedores(true), centros()]);
  const meus = ss.filter(s => s.ativo && (lancoSetor(s) || confiroFch() || editaFin() || s.codigo === c?.setor));
  if (!meus.length) { tela.innerHTML = '<div class="cartao vazio">Você não é responsável por nenhum setor com fechamento.</div>'; return; }
  const setorIni = c?.setor || estado.params.get('setor') || (meus.length === 1 ? meus[0].codigo : '');
  tela.innerHTML = `
    <div class="topo"><div><h1>${c ? 'Contrato ' + esc(c.numero) : 'Novo contrato'}</h1><p class="sub">Fornecedor com fechamento mensal. Contas de consumo (água, luz, internet) não passam pelo Compras.</p></div></div>
    <form class="cartao" id="f-ctr"><div class="form">
      <label class="campo">Setor responsável *<select name="setor" required>${'<option value="">Selecione…</option>' + meus.map(s => `<option value="${s.codigo}" ${s.codigo === setorIni ? 'selected' : ''}>${esc(s.nome)}</option>`).join('')}</select></label>
      <label class="campo">Tipo *<select name="tipo" required>${Object.entries(TIPO_CTR).map(([k, t]) => `<option value="${k}" ${k === (c?.tipo || 'fixo_mensal') ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo largo">Fornecedor<select name="fornecedor_id">${opcoes(fs.filter(x => x.ativo || x.id === c?.fornecedor_id), null, rotForn, c?.fornecedor_id, 'Selecione…')}</select></label>
      <label class="campo largo">Descrição do serviço *<input name="descricao" required value="${esc(c?.descricao || '')}" placeholder="Ex.: Locação de veículo leve · Plano de saúde · Energia da sede"></label>
      <label class="campo">Valor previsto (R$)<input name="valor_previsto" inputmode="decimal" value="${c?.valor_previsto != null ? Number(c.valor_previsto).toFixed(2).replace('.', ',') : ''}" placeholder="Fixo mensal: entra sozinho no fechamento"></label>
      <label class="campo">Dia do vencimento<input name="dia_vencimento" type="number" min="1" max="31" value="${c?.dia_vencimento ?? ''}"></label>
      <label class="campo largo">Conta do plano<select name="conta_id">${await opcoesContas(c?.conta_id, ['custo', 'despesa', 'financeiro', 'investimento', 'deducao'])}</select></label>
      ${htmlRateio(c?.rateio?.length ? c.rateio : c?.centro_custo_id ? [{ centro_custo_id: c.centro_custo_id, pct: 100 }] : [], ccs)}
      <label class="campo">Início *<input type="date" name="inicio" required value="${c?.inicio || hojeISO().slice(0, 7) + '-01'}"></label>
      <label class="campo">Fim (vazio = sem prazo)<input type="date" name="fim" value="${c?.fim || ''}"></label>
      <label class="campo largo check"><input type="checkbox" name="passa_compras" ${c ? (c.passa_compras ? 'checked' : '') : 'checked'}> Passa pela conferência do Compras antes da aprovação</label>
      ${c ? `<label class="campo largo check"><input type="checkbox" name="ativo" ${c.ativo ? 'checked' : ''}> Contrato ativo (desmarque para encerrar — os fechamentos já feitos continuam)</label>` : ''}
      <label class="campo largo">Observações<textarea name="observacoes" rows="2">${esc(c?.observacoes || '')}</textarea></label>
      ${camposAnexoHtml()}
      ${c ? `<div class="largo"><div class="muted">Anexos do contrato</div>${await htmlAnexos('contrato_fechamento', c.id)}</div>` : ''}
      <div class="largo acoes"><button class="btn prim">Salvar</button><a class="btn" href="#/fechamentos/contratos">Voltar</a></div></div></form>`;
  const f = $('#f-ctr');
  ligarRateio(f);
  const tipo = f.elements.tipo, pc = f.elements.passa_compras;
  tipo.addEventListener('change', () => { pc.checked = tipo.value !== 'consumo'; });
  f.onsubmit = async e => {
    e.preventDefault(); const d = formDados(f);
    let rateio; try { rateio = lerRateio(f); } catch (err) { return aviso(err.message, true); }
    const reg = { setor: d.setor, tipo: d.tipo, fornecedor_id: d.fornecedor_id || null, descricao: d.descricao, valor_previsto: num(d.valor_previsto),
      dia_vencimento: d.dia_vencimento ? Number(d.dia_vencimento) : null, conta_id: d.conta_id || null,
      centro_custo_id: rateio[0]?.centro_custo_id || null, rateio: rateio.length > 1 ? rateio : [], inicio: d.inicio, fim: d.fim || null,
      passa_compras: !!d.passa_compras, observacoes: d.observacoes || null, ...(c ? { ativo: !!d.ativo } : {}) };
    if (!reg.setor || !reg.descricao) return aviso('Preencha setor e descrição.', true);
    await ocupado(e.submitter, async () => {
      try {
        const [x] = c ? await api.alterar('contratos_fechamento', `id=eq.${c.id}`, reg) : await api.inserir('contratos_fechamento', reg);
        await salvarAnexosForm('contrato_fechamento', x.id, d);
        try { await api.rpc('gerar_fechamentos'); } catch { /* ok */ }
        aviso(c ? 'Contrato atualizado.' : `Contrato ${x.numero} cadastrado. O fechamento do mês já aparece para o setor.`);
        location.hash = '#/fechamentos/contratos?setor=' + reg.setor;
      } catch (err) { falha(err); }
    });
  };
}
rota('/fechamentos/contratos/novo', tela => formContrato(tela));
rota('/fechamentos/contratos/:id', async (tela, id) => {
  const c = await api.um('contratos_fechamento', `id=eq.${id}`);
  if (!c) { tela.innerHTML = '<div class="cartao vazio">Contrato não encontrado ou sem acesso.</div>'; return; }
  return formContrato(tela, c);
});
