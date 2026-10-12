// Verbo Gestão — Biblioteca de modelos de documentos (todos os setores) e geração de documentos preenchidos
'use strict';

const SETORES_MODELO = ['RH', 'DP', 'SSMA', 'Manutenção', 'Operação', 'CCO', 'Almoxarifado', 'Patrimônio', 'Qualidade', 'Financeiro', 'Compras', 'Administrativo', 'Geral'];
const CATEG_MODELO = ['Termo', 'Encaminhamento', 'Lista', 'Formulário', 'Contrato', 'Declaração', 'Política', 'POP', 'IT', 'Manual', 'Checklist', 'Comunicado', 'Outro'];
const editaModelos = () => tem('administrador', 'rh', 'dp', 'financeiro', 'comprador', 'operacao', 'manutencao', 'almoxarifado');
const MESES_EXT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const dataExtenso = iso => { const [a, m, d] = iso.split('-'); return `${Number(d)} de ${MESES_EXT[Number(m) - 1]} de ${a}`; };

// Carrega bibliotecas externas só quando precisa (Excel, Word)
const _scripts = {};
function carregarScript(url) {
  return (_scripts[url] ||= new Promise((ok, erro) => {
    const s = document.createElement('script'); s.src = url; s.onload = ok;
    s.onerror = () => { delete _scripts[url]; erro(new Error('Não foi possível carregar um componente. Verifique a internet e tente de novo.')); };
    document.head.appendChild(s);
  }));
}

// ---------- Dados disponíveis para preencher os modelos ----------
async function contextoDocumento(colaboradorId) {
  const [emp] = await api.listar('empresa', 'select=*&ativo=eq.true&limit=1').catch(() => [{}]);
  const ctx = { empresa: { ...(emp || {}), nome_fantasia: emp?.nome_fantasia || emp?.razao_social || '' }, usuario: { nome: estado.usuario.nome },
                hoje: dataBR(hojeISO()), hoje_extenso: dataExtenso(hojeISO()) };
  if (colaboradorId) {
    const c = await api.um('colaboradores', `id=eq.${colaboradorId}&select=*,cargo:cargos(nome,cbo,motorista),setor:setores(nome)`);
    if (c) {
      const tipos = await api.listar('rh_tipos_documento', 'select=nome,exigido_admissao,orientacao&ativo=eq.true&order=ordem');
      const exigidos = tipos.filter(t => t.exigido_admissao === 'todos' || (t.exigido_admissao === 'motoristas' && c.cargo?.motorista));
      const opcionais = tipos.filter(t => t.exigido_admissao === 'opcional');
      ctx.colaborador = {
        ...c, cargo: c.cargo?.nome || '', cbo: c.cargo?.cbo || '', setor: c.setor?.nome || '',
        cpf: fmtCPF(c.cpf || ''), data_nascimento: dataBR(c.data_nascimento), data_admissao: dataBR(c.data_admissao), cnh_validade: dataBR(c.cnh_validade),
        telefone: fmtTel(c.telefone || ''), rg: [c.rg, c.rg_orgao, c.rg_uf].filter(Boolean).join(' '),
        endereco: [c.logradouro, c.numero, c.complemento, c.bairro, [c.cidade, c.uf].filter(Boolean).join('/'), c.cep && 'CEP ' + c.cep].filter(Boolean).join(', '),
        emergencia: [c.emergencia_nome, c.emergencia_parentesco, fmtTel(c.emergencia_telefone || '')].filter(Boolean).join(' · '),
        dados_bancarios: [c.banco && 'Banco ' + c.banco, c.agencia && 'Ag. ' + c.agencia, c.conta && 'Conta ' + c.conta, c.pix_chave && 'Pix ' + c.pix_chave].filter(Boolean).join(' · '),
      };
      ctx.lista_documentos_admissionais = `<ol>${exigidos.map(t => `<li>${esc(t.nome)}${t.orientacao ? ` <i>(${esc(t.orientacao)})</i>` : ''}</li>`).join('')}</ol>`
        + (opcionais.length ? `<p><b>Quando se aplicar:</b></p><ul>${opcionais.map(t => `<li>${esc(t.nome)}${t.orientacao ? ` <i>(${esc(t.orientacao)})</i>` : ''}</li>`).join('')}</ul>` : '');
    }
  }
  return ctx;
}
const lacunasDoModelo = html => [...new Set([...String(html || '').matchAll(/\{\{\?([^}]+)\}\}/g)].map(m => m[1].trim()))];
function preencherModelo(html, ctx, respostas = {}) {
  return String(html || '').replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, chave) => {
    if (chave.startsWith('?')) return esc(respostas[chave.slice(1).trim()] || '__________________');
    if (chave === 'lista_documentos_admissionais') return ctx.lista_documentos_admissionais || '<p><i>(escolha um colaborador para listar os documentos do cargo)</i></p>';
    const v = chave.split('.').reduce((o, k) => (o == null ? o : o[k]), ctx);
    return v == null || v === '' ? '__________' : esc(v);
  });
}
const CSS_DOC = `body{font-family:Arial,Helvetica,sans-serif;color:#222;font-size:13px;line-height:1.5;margin:28px}h1,h2,h3{color:#1b3a5c}
  table{border-collapse:collapse}td,th{vertical-align:top}.cab{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #1b3a5c;padding-bottom:8px;margin-bottom:18px}
  .cab img{height:44px}.rod{margin-top:30px;border-top:1px solid #ccc;padding-top:6px;font-size:10px;color:#777}@media print{body{margin:14mm}}`;
function paginaDocumento(titulo, corpoHtml, ctx, codigo) {
  const logo = location.origin + location.pathname.replace(/[^/]*$/, '') + 'logo.png';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>${CSS_DOC}</style></head><body>
    <div class="cab"><img src="${logo}" alt=""><div style="text-align:right;font-size:11px">${esc(ctx.empresa?.razao_social || '')}${ctx.empresa?.cnpj ? '<br>CNPJ ' + esc(ctx.empresa.cnpj) : ''}</div></div>
    ${corpoHtml}<div class="rod">${esc(codigo || '')} · gerado em ${dataHoraBR(new Date().toISOString())} por ${esc(estado.usuario.nome)} · Verbo Gestão</div></body></html>`;
}
function abrirParaImprimir(html) {
  const w = window.open('', '_blank'); if (!w) return aviso('Libere as janelas pop-up para gerar o PDF.', true);
  w.document.write(html.replace('</body>', '<script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body>')); w.document.close();
}
function baixarArquivo(conteudo, nome, tipo) {
  const url = URL.createObjectURL(conteudo instanceof Blob ? conteudo : new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Gera um documento a partir de um modelo (com colaborador opcional e lacunas)
async function gerarDocumento(modelo, colaboradorId = null) {
  const arquivo = modelo.formato === 'arquivo' ? (await api.listar('anexos', `entidade=eq.modelo&entidade_id=eq.${modelo.id}&cancelado_em=is.null&order=enviado_em.desc&limit=1`))[0] : null;
  const ehWord = arquivo && /\.docx$/i.test(arquivo.nome_original || '');
  if (modelo.formato === 'arquivo' && !ehWord) {   // PDF, planilha etc.: só baixar
    if (!arquivo) return aviso('Este modelo ainda não tem arquivo.', true);
    const w = window.open('', '_blank'); try { w.location = await api.linkArquivo(arquivo.caminho_arquivo); } catch (err) { w?.close(); falha(err); } return;
  }
  // lacunas: do HTML do modelo ou do Word ({{?Pergunta}})
  let lacunas = lacunasDoModelo(modelo.conteudo_html), zip = null;
  if (ehWord) {
    await Promise.all([carregarScript('https://cdn.jsdelivr.net/npm/pizzip@3.1.7/dist/pizzip.min.js'), carregarScript('https://cdn.jsdelivr.net/npm/docxtemplater@3.47.4/build/docxtemplater.js')]);
    const buf = await fetch(await api.linkArquivo(arquivo.caminho_arquivo)).then(r => r.arrayBuffer());
    zip = new PizZip(buf);
    const xml = Object.keys(zip.files).filter(n => /^word\/(document|header\d*|footer\d*)\.xml$/.test(n)).map(n => zip.file(n).asText().replace(/<[^>]+>/g, '')).join(' ');
    lacunas = lacunasDoModelo(xml);
  }
  const cols = await api.listar('v_colaboradores_basico', 'select=id,nome,matricula,cargo&order=nome').catch(() => []);
  const r = await modal(`<form><h2>Gerar: ${esc(modelo.titulo)}</h2><div class="form">
      <label class="campo largo">Colaborador<select name="colab"><option value="">Nenhum (preencher à mão)</option>
        ${cols.map(c => `<option value="${c.id}" ${c.id === colaboradorId ? 'selected' : ''}>${esc(c.nome)}${c.cargo ? ' · ' + esc(c.cargo) : ''}</option>`).join('')}</select></label>
      ${lacunas.map((l, i) => `<label class="campo largo">${esc(l)}<input name="l_${i}"></label>`).join('')}
      ${!lacunas.length ? '<p class="muted largo">Este modelo não tem lacunas: os dados vêm do cadastro.</p>' : ''}</div>
    <div class="rodape"><button type="button" class="btn" data-fechar>Voltar</button>
      ${ehWord ? '<button class="btn prim" value="docx">Gerar Word (.docx)</button>' : '<button class="btn" value="doc">Baixar Word</button><button class="btn prim" value="pdf">Gerar PDF</button>'}</div></form>`);
  if (!r) return;
  try {
    const ctx = await contextoDocumento(r.colab || null);
    const respostas = Object.fromEntries(lacunas.map((l, i) => [l, r['l_' + i]]));
    const nomeArq = `${modelo.codigo ? modelo.codigo + ' ' : ''}${modelo.titulo}${ctx.colaborador ? ' - ' + ctx.colaborador.nome : ''}`.replace(/[\\/:*?"<>|]/g, '');
    if (ehWord) {
      const plano = { ...ctx, colaborador: ctx.colaborador || {}, lista_documentos_admissionais: (ctx.lista_documentos_admissionais || '').replace(/<li>/g, '• ').replace(/<[^>]+>/g, '\n').replace(/\n+/g, '\n').trim() };
      const doc = new window.docxtemplater(zip, { paragraphLoop: true, linebreaks: true, delimiters: { start: '{{', end: '}}' },
        nullGetter: () => '__________', parser: tag => ({ get: s => tag.startsWith('?') ? (respostas[tag.slice(1).trim()] || '__________') : tag.split('.').reduce((o, k) => (o == null ? o : o[k]), s) }) });
      doc.render(plano);
      baixarArquivo(doc.getZip().generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), nomeArq + '.docx');
    } else {
      const html = paginaDocumento(modelo.titulo, preencherModelo(modelo.conteudo_html, ctx, respostas), ctx, modelo.codigo ? `${modelo.codigo} v${modelo.versao}` : '');
      if (r._acao === 'doc') baixarArquivo('﻿' + html, nomeArq + '.doc', 'application/msword'); else abrirParaImprimir(html);
    }
    await api.inserir('documentos_gerados', { modelo_id: modelo.id, modelo_versao: modelo.versao, colaborador_id: r.colab || null, dados: respostas }).catch(() => {});
  } catch (err) { falha(err.properties?.errors ? new Error('O arquivo Word tem uma marcação {{ }} incompleta: ' + err.properties.errors.map(e => e.properties?.explanation).join('; ')) : err); }
}

// ---------- Biblioteca ----------
rota('/modelos', async tela => {
  const setor = estado.params.get('setor') || '', q = (estado.params.get('q') || '').toLowerCase();
  let ms = await api.listar('modelos_documentos', `select=*&ativo=eq.true&vigente=eq.true${setor ? '&setor=eq.' + encodeURIComponent(setor) : ''}&order=setor,categoria,titulo`);
  if (q) ms = ms.filter(m => [m.titulo, m.codigo, m.descricao, m.categoria].join(' ').toLowerCase().includes(q));
  const grupos = {}; ms.forEach(m => (grupos[m.setor] ||= []).push(m));
  tela.innerHTML = `
    <div class="topo"><div><h1>Modelos de documentos${setor ? ' · ' + esc(setor) : ''}</h1><p class="sub">Termos, encaminhamentos, listas, POPs, ITs e manuais prontos para baixar ou gerar já preenchidos</p></div>
      ${editaModelos() ? '<div class="acoes"><button class="btn prim" id="novo-arq">+ Enviar modelo (Word, PDF, Excel)</button><button class="btn" id="novo-html">+ Criar modelo preenchível</button></div>' : ''}</div>
    <form class="filtros" id="filtros"><select name="setor"><option value="">Todos os setores</option>${SETORES_MODELO.map(s => `<option ${s === setor ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <input name="q" value="${esc(estado.params.get('q') || '')}" placeholder="Buscar por título ou código"><button class="btn">Filtrar</button></form>
    ${Object.keys(grupos).length ? Object.entries(grupos).map(([s, lista_]) => `<div class="cartao"><h2>${esc(s)}</h2><ul class="lista-simples">
      ${lista_.map(m => `<li style="flex-wrap:wrap"><span><b>${esc(m.titulo)}</b> <span class="muted">${esc([m.codigo, m.categoria, 'v' + m.versao].filter(Boolean).join(' · '))}</span>
          ${m.formato === 'preenchivel' ? '<span class="tag azul">Preenchível</span>' : '<span class="tag">Arquivo</span>'}${m.descricao ? `<br><span class="muted">${esc(m.descricao)}</span>` : ''}</span>
        <span class="acoes"><button class="btn peq prim" data-gerar="${m.id}">${m.formato === 'preenchivel' ? 'Gerar' : 'Baixar / gerar'}</button>
          ${editaModelos() ? `<button class="btn peq" data-editar="${m.id}">Editar</button>` : ''}</span></li>`).join('')}</ul></div>`).join('')
      : '<div class="cartao vazio">Nenhum modelo cadastrado ainda.</div>'}
    <p class="muted">Dica: em modelos Word, use {{colaborador.nome}}, {{colaborador.cpf}}, {{empresa.razao_social}}, {{hoje_extenso}}… e {{?Pergunta}} para lacunas que o sistema pergunta na hora de gerar.</p>`;
  $('#filtros').onsubmit = e => { e.preventDefault(); const d = formDados(e.target); location.hash = '#/modelos?' + new URLSearchParams(Object.entries(d).filter(([, v]) => v)); };
  $$('[data-gerar]', tela).forEach(b => b.addEventListener('click', () => gerarDocumento(ms.find(m => m.id === b.dataset.gerar))));
  $$('[data-editar]', tela).forEach(b => b.addEventListener('click', () => formModelo(ms.find(m => m.id === b.dataset.editar))));
  $('#novo-arq')?.addEventListener('click', () => formModelo(null, 'arquivo', setor));
  $('#novo-html')?.addEventListener('click', () => formModelo(null, 'preenchivel', setor));
});

const CAMPOS_AJUDA = 'colaborador.nome, colaborador.cpf, colaborador.rg, colaborador.matricula, colaborador.cargo, colaborador.cbo, colaborador.setor, colaborador.data_admissao, colaborador.data_nascimento, colaborador.endereco, colaborador.telefone, colaborador.cnh_numero, colaborador.cnh_categoria, colaborador.cnh_validade, colaborador.pis, colaborador.dados_bancarios, empresa.razao_social, empresa.cnpj, empresa.endereco, empresa.cidade, usuario.nome, hoje, hoje_extenso, lista_documentos_admissionais';
async function formModelo(m = null, formato = null, setorIni = '') {
  formato = m?.formato || formato;
  const anexo = m && formato === 'arquivo' ? await htmlAnexos('modelo', m.id) : '';
  const r = await modal(`<form><h2>${m ? 'Editar modelo' : formato === 'arquivo' ? 'Enviar modelo' : 'Criar modelo preenchível'}</h2><div class="form">
      <label class="campo">Setor *<select name="setor" required>${SETORES_MODELO.map(s => `<option ${s === (m?.setor || setorIni) ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
      <label class="campo">Categoria<select name="categoria">${CATEG_MODELO.map(s => `<option ${s === m?.categoria ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
      <label class="campo">Código<input name="codigo" value="${esc(m?.codigo || '')}" placeholder="Ex.: RH-TER-001"></label>
      <label class="campo largo">Título *<input name="titulo" required value="${esc(m?.titulo || '')}"></label>
      <label class="campo largo">Para que serve<input name="descricao" value="${esc(m?.descricao || '')}"></label>
      <label class="campo">Aprovado por<input name="aprovado_por" value="${esc(m?.aprovado_por || '')}" placeholder="Ex.: Jurídico, Diretoria"></label>
      ${formato === 'arquivo' ? `<label class="campo largo">Arquivo ${m ? '(enviar outro cria uma nova versão)' : '*'}<input type="file" name="arquivos" accept=".doc,.docx,.pdf,.xls,.xlsx,.odt,.ods,.ppt,.pptx,image/*"></label>
          ${m ? `<div class="largo">Arquivo atual: ${anexo}</div>` : ''}<p class="muted largo">Em arquivos Word (.docx), escreva {{colaborador.nome}}, {{?Pergunta}} etc. nas lacunas e o sistema gera o documento preenchido.</p>`
        : `<label class="campo largo">Texto do documento (HTML simples)<textarea name="conteudo_html" rows="14" style="font-family:monospace;font-size:12px">${esc(m?.conteudo_html || '<h2 style="text-align:center">TÍTULO</h2>\n<p>Eu, {{colaborador.nome}}, CPF {{colaborador.cpf}}, …</p>\n<p>{{?Pergunta para preencher na hora}}</p>\n<p style="margin-top:40px">{{empresa.cidade}}, {{hoje_extenso}}.</p>')}</textarea></label>
          <p class="muted largo">Campos disponíveis: ${CAMPOS_AJUDA.split(', ').map(c => `{{${c}}}`).join(' ')} · Lacuna perguntada ao gerar: {{?Pergunta}}</p>`}
    </div><div class="rodape">${m ? '<button class="btn perigo" value="arquivar">Arquivar</button>' : ''}${m && formato === 'preenchivel' ? '<button class="btn" value="previa">Pré-visualizar</button>' : ''}
      <button type="button" class="btn" data-fechar>Voltar</button><button class="btn prim" value="salvar">Salvar</button></div></form>`,
    { validar: d => !m && formato === 'arquivo' && !d.arquivos.length ? 'Escolha o arquivo do modelo.' : null });
  if (!r) return;
  try {
    if (r._acao === 'arquivar') { await api.alterar('modelos_documentos', `id=eq.${m.id}`, { ativo: false }); aviso('Modelo arquivado.'); return navegar(); }
    if (r._acao === 'previa') { const ctx = await contextoDocumento(null); return abrirParaImprimir(paginaDocumento(r.titulo, preencherModelo(r.conteudo_html, ctx), ctx, r.codigo)); }
    const dados = { setor: r.setor, categoria: r.categoria, codigo: r.codigo || null, titulo: r.titulo, descricao: r.descricao || null, aprovado_por: r.aprovado_por || null, formato };
    if (formato === 'preenchivel') dados.conteudo_html = r.conteudo_html;
    let id = m?.id;
    const novaVersao = m && (formato === 'arquivo' ? r.arquivos.length : r.conteudo_html !== m.conteudo_html);
    if (novaVersao) {      // guarda a versão anterior e cria a nova
      await api.alterar('modelos_documentos', `id=eq.${m.id}`, { vigente: false });
      [{ id }] = await api.inserir('modelos_documentos', { ...dados, versao: m.versao + 1, substitui_id: m.id });
    } else if (m) await api.alterar('modelos_documentos', `id=eq.${m.id}`, dados);
    else [{ id }] = await api.inserir('modelos_documentos', dados);
    if (formato === 'arquivo' && r.arquivos.length) await anexar('modelo', id, r.arquivos);
    aviso(novaVersao ? `Nova versão (v${m.versao + 1}) salva; a anterior fica no histórico.` : 'Modelo salvo.'); navegar();
  } catch (err) { falha(err); }
}

// ---------- Exportar qualquer tabela em Excel ou PDF ----------
function tabelaParaLinhas(table) {
  const ths = $$('thead th', table).map(th => th.innerText.trim());
  const usar = ths.map((t, i) => t !== '' || $$('tbody tr', table).some(tr => (tr.children[i]?.innerText || '').trim()));
  const linhas = [ths.filter((_, i) => usar[i])];
  for (const tr of $$('tbody tr, tfoot tr', table)) linhas.push([...tr.children].filter((_, i) => usar[i] ?? true).map(td => td.innerText.replace(/\s*\n\s*/g, ' · ').trim()));
  return linhas;
}
async function exportarExcel(table, titulo) {
  await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
  const linhas = tabelaParaLinhas(table).map(l => l.map(v => { const n = /^-?R\$\s?[\d.]+,\d{2}$/.test(v) ? num(v) : null; return n ?? v; }));
  const ws = XLSX.utils.aoa_to_sheet(linhas);
  ws['!cols'] = linhas[0].map((_, i) => ({ wch: Math.min(60, Math.max(10, ...linhas.map(l => String(l[i] ?? '').length))) }));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Dados');
  XLSX.writeFile(wb, `${titulo.replace(/[\\/:*?"<>|]/g, '')} ${hojeISO()}.xlsx`);
}
async function exportarPDF(table, titulo, subtitulo) {
  const ctx = await contextoDocumento(null);
  const linhas = tabelaParaLinhas(table);
  const corpo = `<h2>${esc(titulo)}</h2>${subtitulo ? `<p style="color:#666">${esc(subtitulo)}</p>` : ''}
    <table style="width:100%;font-size:11px" border="1" cellpadding="5"><thead><tr style="background:#eef2f6">${linhas[0].map(h => `<th style="text-align:left">${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${linhas.slice(1).map(l => `<tr>${l.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table><p style="color:#666;font-size:11px">${linhas.length - 1} linha(s)</p>`;
  abrirParaImprimir(paginaDocumento(titulo, corpo, ctx, '').replace('<style>', '<style>@page{size:landscape}'));
}
// Coloca os botões "Excel" e "PDF" em cima de cada tabela da tela
function ferramentasExportacao(tela) {
  const titulo = $('h1', tela)?.innerText.trim() || 'Relatório';
  const sub = $('.sub', tela)?.innerText.trim() || '';
  $$('.tabela-wrap', tela).forEach(w => {
    if (w.previousElementSibling?.classList.contains('exportar') || w.closest('.modal')) return;
    const t = $('table', w); if (!t || $$('tbody tr', t).length === 0) return;
    const h2 = w.closest('.cartao')?.querySelector('h2')?.innerText.trim();
    const nome = h2 && h2 !== titulo ? `${titulo} - ${h2}` : titulo;
    const barra = document.createElement('div'); barra.className = 'exportar';
    barra.innerHTML = '<button type="button" class="btn peq" data-x="xls">⬇ Excel</button><button type="button" class="btn peq" data-x="pdf">⬇ PDF</button>';
    barra.onclick = async e => { const b = e.target.closest('[data-x]'); if (!b) return;
      try { b.dataset.x === 'xls' ? await exportarExcel(t, nome) : await exportarPDF(t, nome, sub); } catch (err) { falha(err); } };
    w.before(barra);
  });
}
