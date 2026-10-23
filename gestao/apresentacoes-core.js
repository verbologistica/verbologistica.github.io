// Verbo Gestão — núcleo das Apresentações Verbo: ícones, tipos de slide, modelo padrão e gerador .pptx
// Usado no app (editor/apresentação/exportação) e no Node (gera o modelo .pptx). Não depende do DOM.
const VBO_ICONES = {
  seguranca: "<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\"/><path d=\"m9 12 2 2 4-4\"/>",
  pessoas: "<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/><path d=\"M22 21v-2a4 4 0 0 0-3-3.87\"/><path d=\"M16 3.13a4 4 0 0 1 0 7.75\"/>",
  resultados: "<polyline points=\"22 7 13.5 15.5 8.5 10.5 2 17\"/><polyline points=\"16 7 22 7 22 13\"/>",
  sustentabilidade: "<path d=\"M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z\"/><path d=\"M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12\"/>",
  caminhao: "<path d=\"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2\"/><path d=\"M15 18H9\"/><path d=\"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14\"/><circle cx=\"17\" cy=\"18\" r=\"2\"/><circle cx=\"7\" cy=\"18\" r=\"2\"/>",
  alvo: "<circle cx=\"12\" cy=\"12\" r=\"10\"/><circle cx=\"12\" cy=\"12\" r=\"6\"/><circle cx=\"12\" cy=\"12\" r=\"2\"/>",
  check: "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"m9 12 2 2 4-4\"/>",
  relogio: "<circle cx=\"12\" cy=\"12\" r=\"10\"/><polyline points=\"12 6 12 12 16 14\"/>",
  local: "<path d=\"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0\"/><circle cx=\"12\" cy=\"10\" r=\"3\"/>",
  engrenagem: "<path d=\"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
  ideia: "<path d=\"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5\"/><path d=\"M9 18h6\"/><path d=\"M10 22h4\"/>",
  bandeira: "<path d=\"M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z\"/><line x1=\"4\" x2=\"4\" y1=\"22\" y2=\"15\"/>",
  grafico: "<path d=\"M3 3v16a2 2 0 0 0 2 2h16\"/><path d=\"M18 17V9\"/><path d=\"M13 17V5\"/><path d=\"M8 17v-3\"/>",
  parceria: "<path d=\"m11 17 2 2a1 1 0 1 0 3-3\"/><path d=\"m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4\"/><path d=\"m21 3 1 11h-2\"/><path d=\"M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3\"/><path d=\"M3 4h8\"/>",
  manutencao: "<path d=\"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z\"/>",
  combustivel: "<line x1=\"3\" x2=\"15\" y1=\"22\" y2=\"22\"/><line x1=\"4\" x2=\"14\" y1=\"9\" y2=\"9\"/><path d=\"M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18\"/><path d=\"M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5\"/>",
  capacete: "<path d=\"M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5\"/><path d=\"M14 6a6 6 0 0 1 6 6v3\"/><path d=\"M4 15v-3a6 6 0 0 1 6-6\"/><rect x=\"2\" y=\"15\" width=\"20\" height=\"4\" rx=\"1\"/>",
  premio: "<path d=\"m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526\"/><circle cx=\"12\" cy=\"8\" r=\"6\"/>",
  calendario: "<path d=\"M8 2v4\"/><path d=\"M16 2v4\"/><rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\"/><path d=\"M3 10h18\"/>",
  dinheiro: "<rect width=\"20\" height=\"12\" x=\"2\" y=\"6\" rx=\"2\"/><circle cx=\"12\" cy=\"12\" r=\"2\"/><path d=\"M6 12h.01M18 12h.01\"/>",
  pacote: "<path d=\"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z\"/><path d=\"M12 22V12\"/><path d=\"m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7\"/><path d=\"m7.5 4.27 9 5.15\"/>",
  rota: "<circle cx=\"6\" cy=\"19\" r=\"3\"/><path d=\"M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15\"/><circle cx=\"18\" cy=\"5\" r=\"3\"/>",
  alerta: "<path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\"/><path d=\"M12 9v4\"/><path d=\"M12 17h.01\"/>",
  documento: "<path d=\"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z\"/><path d=\"M14 2v4a2 2 0 0 0 2 2h4\"/><path d=\"M10 9H8\"/><path d=\"M16 13H8\"/><path d=\"M16 17H8\"/>",
  escudo: "<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\"/>",
  arvore: "<path d=\"m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z\"/><path d=\"M12 22v-3\"/>",
  fabrica: "<path d=\"M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z\"/><path d=\"M17 18h1\"/><path d=\"M12 18h1\"/><path d=\"M7 18h1\"/>",
  estrela: "<path d=\"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z\"/>",
};

// Identidade Verbo
const VBO = { esc: '0C1D18', esc2: '13302A', esc3: '1B3F35', verde: '02654D', verde2: '19966E', ouro: 'DDA936', branco: 'FFFFFF', claro: 'F3F6F5', claro2: 'E4EBE8',
  texto: '0E1E2B', cinza: '5A6A77', suave: 'A9BDB5', serie: ['02654D', 'DDA936', '3786C3', 'BD5833', 'A067AC', '5D6F68'], fonte: 'Arial' };
// traçado oficial do "V" da Verbo (viewBox 560×336)
const VBO_CHEVRON = { vb: [560, 336], verde: 'M3,36 L2,40 L30,73 L40,87 L46,93 L52,102 L82,138 L130,201 L136,207 L138,211 L175,257 L213,308 L222,318 L226,325 L233,331 L241,334 L252,334 L263,328 L318,255 L324,249 L325,246 L333,237 L336,231 L343,223 L342,219 L332,218 L325,215 L322,215 L309,206 L303,200 L249,130 L203,66 L187,50 L184,49 L178,44 L156,35 L144,34 L139,32 L106,32 L105,33 L75,33 L74,34 L48,34 L47,35 L5,35Z',
  ouro: 'M558,2 L510,2 L509,3 L463,3 L462,4 L452,4 L451,5 L442,5 L433,8 L428,8 L423,11 L418,11 L405,17 L402,17 L391,23 L389,23 L380,29 L378,29 L363,38 L360,41 L358,41 L351,47 L341,53 L302,86 L271,117 L271,121 L327,191 L333,195 L343,199 L357,199 L363,196 L364,193 L384,166 L403,144 L464,82 L511,40 L516,37 L537,19 L557,5Z' };
const vboPontosPath = d => d.replace(/[MZ]/g, '').split(' L').map(p => p.split(',').map(Number));
const vboSvgIcone = (nome, cor = '#FFFFFF', esp = 2) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${cor}" stroke-width="${esp}" stroke-linecap="round" stroke-linejoin="round">${VBO_ICONES[nome] || VBO_ICONES.estrela}</svg>`;

// Tipos de slide: campos que o editor mostra e que o gerador usa
const VBO_TIPOS = {
  capa: { nome: 'Capa', escuro: true, campos: [['rotulo', 'Rótulo (acima do título)'], ['titulo', 'Título'], ['subtitulo', 'Subtítulo'], ['rodape', 'Apresentador · área · data']] },
  agenda: { nome: 'Agenda', escuro: true, campos: [['titulo', 'Título'], ['itens', 'Itens (um por linha)', 'linhas']] },
  secao: { nome: 'Divisor de seção', escuro: true, campos: [['numero', 'Número'], ['titulo', 'Título'], ['texto', 'Texto curto', 'texto']] },
  conteudo: { nome: 'Texto e imagem', campos: [['titulo', 'Título'], ['texto', 'Texto (linhas com "- " viram tópicos)', 'texto'], ['imagem', 'Imagem', 'imagem'], ['legenda', 'Legenda da imagem']] },
  cards: { nome: 'Cards com ícones', campos: [['titulo', 'Título'], ['itens', 'Cards (2 a 4)', 'cards']] },
  numeros: { nome: 'Números em destaque', escuro: true, campos: [['titulo', 'Título'], ['itens', 'Indicadores (2 a 4)', 'numeros'], ['nota', 'Nota de rodapé']] },
  grafico: { nome: 'Gráfico', campos: [['titulo', 'Título'], ['grafico', 'Dados do gráfico', 'grafico'], ['destaque', 'Número em destaque'], ['texto', 'Comentário', 'texto']] },
  mapa: { nome: 'Mapa (com zoom animado)', escuro: true, campos: [['titulo', 'Título'], ['texto', 'Texto', 'texto'], ['pontos', 'Cidades no mapa', 'pontos'], ['zoom', 'Aproximar nas cidades (2º slide com zoom)', 'sim']] },
  etapas: { nome: 'Linha do tempo / etapas', campos: [['titulo', 'Título'], ['itens', 'Etapas (3 a 6)', 'etapas']] },
  tabela: { nome: 'Tabela', campos: [['titulo', 'Título'], ['tabela', 'Tabela', 'tabela'], ['nota', 'Nota de rodapé']] },
  citacao: { nome: 'Mensagem-chave', escuro: true, campos: [['texto', 'Mensagem', 'texto'], ['autor', 'Autor / fonte']] },
  encerramento: { nome: 'Encerramento', escuro: true, campos: [['titulo', 'Título'], ['texto', 'Texto', 'texto'], ['contatos', 'Contatos (um por linha)', 'linhas']] }
};

// Modelo padrão (exemplo de uso de cada tipo)
const VBO_MODELO = { titulo: 'Modelo padrão Verbo', slides: [
  { tipo: 'capa', rotulo: 'APRESENTAÇÃO', titulo: 'Título da apresentação', subtitulo: 'Subtítulo: o objetivo da reunião em uma frase', rodape: 'Nome do apresentador · Área · dd/mm/aaaa',
    notas: 'Capa: troque o título, o subtítulo e o rodapé. Mantenha o título com até duas linhas.' },
  { tipo: 'agenda', titulo: 'Agenda', itens: ['Contexto e objetivo', 'Resultados do período', 'Onde estamos', 'Próximos passos', 'Perguntas'],
    notas: 'Agenda: de 3 a 6 itens. Cada item vira um divisor de seção mais adiante.' },
  { tipo: 'secao', numero: '01', titulo: 'Contexto e objetivo', texto: 'Use um divisor para abrir cada parte da apresentação.',
    notas: 'Divisor de seção: número e título da parte. O "V" da Verbo se move entre os slides (transição Transformar).' },
  { tipo: 'conteudo', titulo: 'Uma mensagem por slide', texto: 'Comece com a ideia principal do slide em uma frase curta. Depois, no máximo quatro tópicos:\n- Fatos e números que sustentam a mensagem\n- O que muda para a operação\n- Quem é responsável\n- Qual é o prazo', imagem: 'foto', legenda: 'Troque a foto: clique com o botão direito › Alterar imagem',
    notas: 'Texto e imagem: texto à esquerda, foto à direita. Para trocar a foto no PowerPoint, clique com o botão direito › Alterar imagem.' },
  { tipo: 'cards', titulo: 'Nossos pilares', itens: [
      { icone: 'seguranca', titulo: 'Segurança', texto: 'Ninguém se machuca. Cada operação começa pela segurança.' },
      { icone: 'pessoas', titulo: 'Pessoas', texto: 'Respeito, desenvolvimento e trabalho em equipe.' },
      { icone: 'resultados', titulo: 'Resultados', texto: 'Compromisso com o que foi combinado com o cliente.' },
      { icone: 'sustentabilidade', titulo: 'Sustentabilidade', texto: 'Cuidado com o ambiente e com o futuro do negócio.' }],
    notas: 'Cards: de 2 a 4 cards, cada um com ícone, título e texto curto.' },
  { tipo: 'numeros', titulo: 'Números do período', itens: [
      { valor: '98%', rotulo: 'Disponibilidade da frota' }, { valor: '1,2 mi', rotulo: 'Km rodados' }, { valor: '0', rotulo: 'Acidentes com afastamento' }, { valor: '35', rotulo: 'Cidades atendidas' }],
    nota: 'Valores ilustrativos: substitua pelos indicadores reais.', notas: 'Números: até 4 indicadores. Os números aparecem um a um.' },
  { tipo: 'grafico', titulo: 'Evolução mensal', grafico: { tipo: 'colunas', categorias: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'], series: [{ nome: 'Realizado', valores: [72, 78, 81, 85, 88, 93] }, { nome: 'Meta', valores: [80, 80, 85, 85, 90, 90] }] },
    destaque: '+29%', texto: 'Diga em uma frase o que o gráfico mostra. Ex.: o realizado superou a meta a partir de abril.',
    notas: 'Gráfico: no PowerPoint, clique no gráfico › Editar dados para trocar os valores. Valores ilustrativos.' },
  { tipo: 'mapa', titulo: 'Onde estamos', texto: 'Cidades com contratos e compras registrados no Verbo Gestão.', zoom: true, pontos: [
      { cidade: 'Três Lagoas', uf: 'MS', lat: -20.78, lng: -51.70 }, { cidade: 'Ribas do Rio Pardo', uf: 'MS', lat: -20.44, lng: -53.76 }, { cidade: 'Campo Grande', uf: 'MS', lat: -20.47, lng: -54.62 },
      { cidade: 'Lençóis Paulista', uf: 'SP', lat: -22.60, lng: -48.80 }, { cidade: 'Bauru', uf: 'SP', lat: -22.32, lng: -49.09 }, { cidade: 'Araçatuba', uf: 'SP', lat: -21.21, lng: -50.43 },
      { cidade: 'Presidente Prudente', uf: 'SP', lat: -22.13, lng: -51.39 }, { cidade: 'Campinas', uf: 'SP', lat: -22.91, lng: -47.06 }, { cidade: 'São Paulo', uf: 'SP', lat: -23.55, lng: -46.63 },
      { cidade: 'Curitiba', uf: 'PR', lat: -25.43, lng: -49.27 }, { cidade: 'Belo Horizonte', uf: 'MG', lat: -19.92, lng: -43.93 }, { cidade: 'Serra', uf: 'ES', lat: -20.13, lng: -40.31 }],
    notas: 'Mapa: no Verbo Gestão você escolhe as cidades e o sistema monta os dois slides (Brasil e zoom). A transição Transformar faz o zoom.' },
  { tipo: 'etapas', titulo: 'Próximos passos', itens: [
      { titulo: 'Diagnóstico', texto: 'Levantar dados e ouvir as áreas', quando: 'Semana 1' }, { titulo: 'Plano', texto: 'Definir ações, donos e prazos', quando: 'Semana 2' },
      { titulo: 'Execução', texto: 'Colocar em prática com a equipe', quando: 'Semanas 3–6' }, { titulo: 'Resultado', texto: 'Medir e corrigir a rota', quando: 'Semana 8' }],
    notas: 'Etapas: de 3 a 6 etapas, com título, descrição e quando.' },
  { tipo: 'tabela', titulo: 'Plano de ação', tabela: { colunas: ['Ação', 'Responsável', 'Prazo', 'Situação'], linhas: [
      ['Revisar a rota da operação', 'Operação', '30/11', 'Em andamento'], ['Treinar a equipe nova', 'SSMA', '15/12', 'Aberta'], ['Renovar o contrato de manutenção', 'Compras', '20/12', 'Aberta'], ['Apresentar o resultado do trimestre', 'Diretoria', '10/01', 'Aberta']] },
    nota: 'Exemplo de tabela: até 8 linhas por slide.', notas: 'Tabela: use para planos de ação e comparativos curtos.' },
  { tipo: 'citacao', texto: 'Segurança, pessoas, resultados e sustentabilidade: é assim que a Verbo trabalha todos os dias.', autor: 'Verbo Logística',
    notas: 'Mensagem-chave: uma frase forte para fechar um bloco ou citar alguém.' },
  { tipo: 'encerramento', titulo: 'Obrigado', texto: 'Dúvidas e próximos passos', contatos: ['Nome do apresentador', 'email@verbologistica.com.br', '(00) 00000-0000'],
    notas: 'Encerramento: agradecimento e contatos.' }
] };

// ====================== Gerador .pptx ======================
// vboGerarPptx(deck, { PptxGenJS, JSZip, assets, geo, guia, saida }) → Blob (navegador) ou Buffer (Node)
// assets: { logoClaro, logoEscuro, fundoCapa, foto, icone(nome, corHex) } — imagens como 'image/png;base64,...'
const VBO_W = 13.333, VBO_H = 7.5;
const vboMerc = (lng, lat) => [lng, -Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) * 180 / Math.PI];
function vboEncaixe(caixa, alvo) { // caixa [x0,y0,x1,y1] projetada → função que leva para polegadas dentro do alvo {x,y,w,h}
  const s = Math.min(alvo.w / (caixa[2] - caixa[0]), alvo.h / (caixa[3] - caixa[1]));
  const ox = alvo.x + (alvo.w - (caixa[2] - caixa[0]) * s) / 2, oy = alvo.y + (alvo.h - (caixa[3] - caixa[1]) * s) / 2;
  return { s, f: ([x, y]) => [ox + (x - caixa[0]) * s, oy + (y - caixa[1]) * s] };
}
function vboCaixaPontos(pontos, folga) {
  const ps = pontos.map(p => vboMerc(Number(p.lng), Number(p.lat)));
  const c = [Math.min(...ps.map(p => p[0])), Math.min(...ps.map(p => p[1])), Math.max(...ps.map(p => p[0])), Math.max(...ps.map(p => p[1]))];
  const fx = Math.max(folga, (c[2] - c[0]) * 0.18), fy = Math.max(folga, (c[3] - c[1]) * 0.18);
  return [c[0] - fx, c[1] - fy, c[2] + fx, c[3] + fy];
}
// slides "planos": o mapa com zoom vira dois slides
function vboPlanos(deck) {
  const out = [];
  for (const s of deck.slides || []) {
    if (s.tipo === 'mapa' && s.zoom && (s.pontos || []).length) { out.push({ ...s, _vista: 'brasil' }); out.push({ ...s, _vista: 'zoom', notas: 'Zoom do mapa (gerado automaticamente a partir do slide anterior).' }); }
    else out.push(s);
  }
  return out;
}

// Geometria do mapa em polegadas (mesma conta no .pptx e no navegador): estados, pontos e posição dos rótulos sem sobreposição
function vboGeoMapa(pts, zoom, geo) {
  const ufs = new Set(pts.map(p => p.uf));
  const caixa = zoom && pts.length ? vboCaixaPontos(pts, 1.2) : (() => { const a = vboMerc(-74.2, 5.4), b = vboMerc(-34.6, -33.9); return [a[0], a[1], b[0], b[1]]; })();
  const E = vboEncaixe(caixa, zoom ? { x: 5.0, y: 0.45, w: 7.9, h: 6.6 } : { x: 5.3, y: 0.35, w: 7.4, h: 6.8 });
  const estados = (geo || []).map(est => ({ uf: est.uf, ativo: ufs.has(est.uf), aneis: est.aneis.map(a => a.map(([lng, lat]) => E.f(vboMerc(lng, lat)))) }));
  const dp = zoom ? 0.22 : 0.15, dh = zoom ? 0.62 : 0.4;
  const pontos = pts.map(p => ({ ...p, pos: E.f(vboMerc(Number(p.lng), Number(p.lat))) }));
  const ocup = pontos.map(p => [p.pos[0] - dp / 2, p.pos[1] - dp / 2, p.pos[0] + dp / 2, p.pos[1] + dp / 2]);
  const bate = (r) => ocup.some(o => r[0] < o[2] && r[2] > o[0] && r[1] < o[3] && r[3] > o[1]) || r[0] < 4.85 || r[2] > VBO_W - 0.1 || r[1] < 0.1 || r[3] > VBO_H - 0.45;
  const rotulos = [];
  const ordem = pontos.map((p, i) => i).sort((a, b) => pontos[a].pos[1] - pontos[b].pos[1]);
  const res = new Array(pontos.length);
  for (const i of ordem) { const [x, y] = pontos[i].pos; const w = Math.min(2.2, 0.15 + String(pontos[i].cidade || '').length * 0.095), h = 0.3;
    const cands = [[x + 0.2, y - h / 2, 'left'], [x - 0.2 - w, y - h / 2, 'right'], [x - w / 2, y - 0.2 - h, 'center'], [x - w / 2, y + 0.2, 'center'],
      [x + 0.2, y - h - 0.05, 'left'], [x + 0.2, y + 0.05, 'left'], [x - 0.2 - w, y - h - 0.05, 'right'], [x - 0.2 - w, y + 0.05, 'right']];
    let c = cands.find(([cx, cy]) => !bate([cx, cy, cx + w, cy + h])) || cands[0];
    res[i] = { x: c[0], y: c[1], w, h, align: c[2] }; ocup.push([c[0], c[1], c[0] + w, c[1] + h]); }
  return { estados, pontos, rotulos: res, dp, dh };
}

async function vboGerarPptx(deck, opts) {
  const { PptxGenJS, JSZip, assets: A, geo } = opts;
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE';
  pres.theme = { headFontFace: VBO.fonte, bodyFontFace: VBO.fonte };
  pres.author = 'Verbo Logística'; pres.company = 'Verbo Logística'; pres.title = deck.titulo || 'Apresentação Verbo';
  const F = VBO.fonte;
  const logoW = 1.15, logoH = logoW * 123 / 418;

  pres.defineSlideMaster({ title: 'VERBO_CLARO', background: { color: VBO.branco },
    objects: [{ image: { x: 0.6, y: 6.93, w: logoW, h: logoH, data: A.logoEscuro } },
      { placeholder: { options: { name: 'title', type: 'title', x: 0.6, y: 0.45, w: 12.13, h: 0.85, fontFace: F, fontSize: 32, bold: true, color: VBO.texto, valign: 'top', align: 'left', margin: 0 }, text: 'Título do slide' } }],
    slideNumber: { x: 12.2, y: 6.93, w: 0.53, h: logoH, fontFace: F, fontSize: 10, color: VBO.cinza, align: 'right' } });
  pres.defineSlideMaster({ title: 'VERBO_CLARO_TEXTO', background: { color: VBO.branco },
    objects: [{ image: { x: 0.6, y: 6.93, w: logoW, h: logoH, data: A.logoEscuro } },
      { placeholder: { options: { name: 'title', type: 'title', x: 0.6, y: 0.45, w: 12.13, h: 0.85, fontFace: F, fontSize: 32, bold: true, color: VBO.texto, valign: 'top', align: 'left', margin: 0 }, text: 'Título do slide' } },
      { placeholder: { options: { name: 'body', type: 'body', x: 0.6, y: 1.6, w: 12.13, h: 5.0, fontFace: F, fontSize: 18, color: VBO.texto, valign: 'top', align: 'left', margin: 0 }, text: 'Texto do slide' } }],
    slideNumber: { x: 12.2, y: 6.93, w: 0.53, h: logoH, fontFace: F, fontSize: 10, color: VBO.cinza, align: 'right' } });
  pres.defineSlideMaster({ title: 'VERBO_ESCURO', background: { color: VBO.esc },
    objects: [{ image: { x: 0.6, y: 6.93, w: logoW, h: logoH, data: A.logoClaro } },
      { placeholder: { options: { name: 'title', type: 'title', x: 0.6, y: 0.45, w: 12.13, h: 0.85, fontFace: F, fontSize: 32, bold: true, color: VBO.branco, valign: 'top', align: 'left', margin: 0 }, text: 'Título do slide' } }],
    slideNumber: { x: 12.2, y: 6.93, w: 0.53, h: logoH, fontFace: F, fontSize: 10, color: VBO.suave, align: 'right' } });
  pres.defineSlideMaster({ title: 'VERBO_CAPA', background: { data: A.fundoCapa },
    objects: [{ image: { x: 0.75, y: 0.6, w: 2.3, h: 2.3 * 123 / 418, data: A.logoClaro } },
      { placeholder: { options: { name: 'title', type: 'title', x: 0.75, y: 2.45, w: 7.6, h: 1.95, fontFace: F, fontSize: 44, bold: true, color: VBO.branco, valign: 'bottom', align: 'left', margin: 0 }, text: 'Título da apresentação' } },
      { placeholder: { options: { name: 'body', type: 'body', x: 0.75, y: 4.55, w: 7.4, h: 0.95, fontFace: F, fontSize: 18, color: VBO.suave, valign: 'top', align: 'left', margin: 0 }, text: 'Subtítulo' } }] });
  pres.defineSlideMaster({ title: 'VERBO_SECAO', background: { color: VBO.esc },
    objects: [{ image: { x: 0.6, y: 6.93, w: logoW, h: logoH, data: A.logoClaro } },
      { placeholder: { options: { name: 'title', type: 'title', x: 0.75, y: 3.15, w: 7.2, h: 1.5, fontFace: F, fontSize: 40, bold: true, color: VBO.branco, valign: 'top', align: 'left', margin: 0 }, text: 'Título da seção' } }] });

  const txt = (sl, texto, o) => sl.addText(texto, { fontFace: F, margin: 0, isTextBox: true, valign: 'top', ...o });
  const forma = (sl, aneis, o) => { // aneis em polegadas absolutas
    const todos = aneis.flat(); const x0 = Math.min(...todos.map(p => p[0])), y0 = Math.min(...todos.map(p => p[1]));
    const x1 = Math.max(...todos.map(p => p[0])), y1 = Math.max(...todos.map(p => p[1]));
    const pts = []; for (const a of aneis) { a.forEach(([x, y], i) => pts.push(i ? { x: x - x0, y: y - y0 } : { x: x - x0, y: y - y0, moveTo: true })); pts.push({ close: true }); }
    sl.addShape(pres.shapes.CUSTOM_GEOMETRY, { x: x0, y: y0, w: Math.max(x1 - x0, 0.01), h: Math.max(y1 - y0, 0.01), points: pts, ...o });
  };
  const chevron = (sl, x, y, w, transp = 0, cv = VBO.verde) => { const s = w / VBO_CHEVRON.vb[0];
    forma(sl, [vboPontosPath(VBO_CHEVRON.verde).map(([a, b]) => [x + a * s, y + b * s])], { fill: { color: cv, transparency: transp }, line: { type: 'none' }, objectName: '!!chevV' });
    forma(sl, [vboPontosPath(VBO_CHEVRON.ouro).map(([a, b]) => [x + a * s, y + b * s])], { fill: { color: VBO.ouro, transparency: transp }, line: { type: 'none' }, objectName: '!!chevG' }); };
  const paragrafos = (texto, base) => String(texto || '').split('\n').filter(l => l.trim()).map((l, i, arr) => {
    const top = /^\s*[-•]\s+/.test(l); const t = l.replace(/^\s*[-•]\s+/, '');
    return { text: t, options: { ...(top ? { bullet: { indent: 20 }, fontSize: base - 2, paraSpaceAfter: 10 } : { fontSize: base, paraSpaceAfter: 16 }), breakLine: i < arr.length - 1 } };
  });

  const planos = vboPlanos(deck); const meta = []; // por slide: animações
  for (const s of planos) {
    const m = { anim: [] }; meta.push(m); let sl;
    const passo = (nomes, atraso, tipo = 'fade', dur = 500) => m.anim.push({ nomes, atraso, tipo, dur });
    if (s.tipo === 'capa') {
      sl = pres.addSlide({ masterName: 'VERBO_CAPA' });
      chevron(sl, 8.4, 2.05, 4.35);
      if (s.rotulo) txt(sl, s.rotulo, { x: 0.75, y: 2.0, w: 7.4, h: 0.35, fontSize: 13, bold: true, color: VBO.ouro, charSpacing: 4, objectName: 'cp-rot' });
      sl.addText(s.titulo || '', { placeholder: 'title' });
      sl.addText(s.subtitulo || '', { placeholder: 'body' });
      if (s.rodape) txt(sl, s.rodape, { x: 0.75, y: 6.5, w: 8, h: 0.4, fontSize: 13, color: VBO.suave, objectName: 'cp-rod' });
      passo(['cp-rot'], 300); passo(['ph:title'], 500); passo(['ph:body'], 800); passo(['cp-rod'], 1100);
    } else if (s.tipo === 'agenda') {
      sl = pres.addSlide({ masterName: 'VERBO_ESCURO' });
      sl.addText(s.titulo || 'Agenda', { placeholder: 'title' });
      chevron(sl, 0.75, 4.75, 2.6);
      const it = (s.itens || []).filter(Boolean).slice(0, 7); const rh = Math.min(0.95, 5.6 / Math.max(it.length, 1)); const y0 = (VBO_H - rh * it.length) / 2;
      it.forEach((t, i) => { const y = y0 + i * rh;
        txt(sl, String(i + 1).padStart(2, '0'), { x: 5.3, y, w: 0.9, h: rh, fontSize: 26, bold: true, color: VBO.ouro, valign: 'middle', objectName: `ag-n${i}` });
        txt(sl, t, { x: 6.3, y, w: 6.4, h: rh, fontSize: 22, color: VBO.branco, valign: 'middle', objectName: `ag-t${i}` });
        if (i < it.length - 1) sl.addShape(pres.shapes.LINE, { x: 5.3, y: y + rh, w: 7.4, h: 0, line: { color: VBO.esc3, width: 1 }, objectName: `ag-l${i}` });
        passo([`ag-n${i}`, `ag-t${i}`, `ag-l${i}`], 250 + i * 180); });
    } else if (s.tipo === 'secao') {
      sl = pres.addSlide({ masterName: 'VERBO_SECAO' });
      chevron(sl, 7.7, 1.75, 6.6);
      if (s.numero) txt(sl, s.numero, { x: 0.7, y: 0.9, w: 5, h: 2.1, fontSize: 130, bold: true, color: VBO.ouro, valign: 'bottom', objectName: 'sc-num' });
      sl.addText(s.titulo || '', { placeholder: 'title' });
      if (s.texto) txt(sl, s.texto, { x: 0.75, y: 4.75, w: 6.6, h: 1.2, fontSize: 18, color: VBO.suave, objectName: 'sc-txt' });
      passo(['sc-num'], 200, 'zoom', 600); passo(['sc-txt'], 700);
    } else if (s.tipo === 'conteudo') {
      sl = pres.addSlide({ masterName: 'VERBO_CLARO' });
      sl.addText(s.titulo || '', { placeholder: 'title' });
      const img = s.imagem === 'foto' ? A.foto : s.imagem && String(s.imagem).startsWith('image/') ? s.imagem : null;
      txt(sl, paragrafos(s.texto, 21), { x: 0.6, y: 1.65, w: img ? 6.1 : 12.13, h: 4.9, color: VBO.texto, objectName: 'ct-txt' });
      if (img) { sl.addImage({ data: img, x: 7.15, y: 1.65, w: 5.58, h: s.legenda ? 4.55 : 4.95, sizing: { type: 'cover', w: 5.58, h: s.legenda ? 4.55 : 4.95 }, objectName: 'ct-img' });
        if (s.legenda) txt(sl, s.legenda, { x: 7.15, y: 6.3, w: 5.58, h: 0.35, fontSize: 11, color: VBO.cinza, objectName: 'ct-leg' }); }
      passo(['ct-img', 'ct-leg'], 300); passo(['ct-txt'], 500);
    } else if (s.tipo === 'cards') {
      sl = pres.addSlide({ masterName: 'VERBO_CLARO' });
      sl.addText(s.titulo || '', { placeholder: 'title' });
      const it = (s.itens || []).slice(0, 4); const n = Math.max(it.length, 1); const g = 0.3; const cw = (12.13 - g * (n - 1)) / n;
      it.forEach((c, i) => { const x = 0.6 + i * (cw + g), y = 1.85;
        sl.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: cw, h: 4.2, rectRadius: 0.12, fill: { color: VBO.claro }, line: { type: 'none' }, objectName: `cd-b${i}` });
        sl.addShape(pres.shapes.OVAL, { x: x + 0.4, y: y + 0.45, w: 0.95, h: 0.95, fill: { color: VBO.verde }, line: { type: 'none' }, objectName: `cd-c${i}` });
        sl.addImage({ data: A.icone(c.icone || 'estrela', VBO.branco), x: x + 0.4 + 0.22, y: y + 0.45 + 0.22, w: 0.51, h: 0.51, objectName: `cd-i${i}` });
        txt(sl, c.titulo || '', { x: x + 0.35, y: y + 1.75, w: cw - 0.6, h: 0.5, fontSize: 18, bold: true, color: VBO.texto, objectName: `cd-t${i}` });
        txt(sl, c.texto || '', { x: x + 0.35, y: y + 2.35, w: cw - 0.6, h: 1.6, fontSize: 16, color: VBO.cinza, objectName: `cd-x${i}` });
        passo([`cd-b${i}`, `cd-c${i}`, `cd-i${i}`, `cd-t${i}`, `cd-x${i}`], 250 + i * 220, 'zoom', 450); });
    } else if (s.tipo === 'numeros') {
      sl = pres.addSlide({ masterName: 'VERBO_ESCURO' });
      sl.addText(s.titulo || '', { placeholder: 'title' });
      const it = (s.itens || []).slice(0, 4); const n = Math.max(it.length, 1); const g = 0.3; const cw = (12.13 - g * (n - 1)) / n;
      it.forEach((c, i) => { const x = 0.6 + i * (cw + g), y = 1.9;
        sl.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: cw, h: 3.9, rectRadius: 0.12, fill: { color: VBO.esc2 }, line: { type: 'none' }, objectName: `nm-b${i}` });
        txt(sl, c.valor || '', { x: x + 0.35, y: y + 0.55, w: cw - 0.7, h: 1.35, fontSize: n > 3 ? 50 : 58, bold: true, color: VBO.ouro, valign: 'bottom', objectName: `nm-v${i}` });
        txt(sl, c.rotulo || '', { x: x + 0.35, y: y + 2.1, w: cw - 0.7, h: 1.4, fontSize: 17, color: VBO.branco, objectName: `nm-r${i}` });
        passo([`nm-b${i}`, `nm-v${i}`, `nm-r${i}`], 250 + i * 250, 'zoom', 450); });
      if (s.nota) txt(sl, s.nota, { x: 0.6, y: 6.15, w: 12.13, h: 0.35, fontSize: 11, color: VBO.suave, objectName: 'nm-nota' });
    } else if (s.tipo === 'grafico') {
      sl = pres.addSlide({ masterName: 'VERBO_CLARO' });
      sl.addText(s.titulo || '', { placeholder: 'title' });
      const gd = s.grafico || {}; const series = (gd.series || []).filter(x => x && (x.valores || []).length);
      const tipo = { colunas: pres.charts.BAR, barras: pres.charts.BAR, linha: pres.charts.LINE, rosca: pres.charts.DOUGHNUT }[gd.tipo] || pres.charts.BAR;
      const lado = !!(s.destaque || s.texto); const cw = lado ? 8.15 : 12.13;
      const dados = series.map(se => ({ name: se.nome || '', labels: gd.categorias || [], values: se.valores.map(Number) }));
      if (dados.length) sl.addChart(tipo, dados, { x: 0.6, y: 1.55, w: cw, h: 5.05, barDir: gd.tipo === 'barras' ? 'bar' : 'col', barGapWidthPct: 55,
        chartColors: VBO.serie.slice(0, gd.tipo === 'rosca' ? 6 : Math.max(dados.length, 1)), showLegend: dados.length > 1 || gd.tipo === 'rosca', legendPos: 'b', legendFontSize: 12, legendFontFace: F, legendColor: VBO.cinza,
        showValue: gd.tipo !== 'linha', dataLabelFontSize: 11, dataLabelFontFace: F, dataLabelColor: VBO.texto, dataLabelPosition: gd.tipo === 'rosca' ? 'bestFit' : 'outEnd',
        catAxisLabelColor: VBO.cinza, valAxisLabelColor: VBO.cinza, catAxisLabelFontSize: 12, valAxisLabelFontSize: 11, catAxisLabelFontFace: F, valAxisLabelFontFace: F,
        valGridLine: { color: VBO.claro2, size: 0.75 }, catGridLine: { style: 'none' }, valAxisHidden: gd.tipo !== 'linha', catAxisLineShow: false, valAxisLineShow: false,
        lineSize: 3, lineDataSymbol: 'circle', lineDataSymbolSize: 8, holeSize: 62, objectName: 'gf-chart' });
      if (lado) { sl.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 9.05, y: 1.55, w: 3.68, h: 5.05, rectRadius: 0.12, fill: { color: VBO.claro }, line: { type: 'none' }, objectName: 'gf-b' });
        if (s.destaque) txt(sl, s.destaque, { x: 9.4, y: 1.95, w: 3.0, h: 1.1, fontSize: 48, bold: true, color: VBO.verde, objectName: 'gf-d' });
        txt(sl, s.texto || '', { x: 9.4, y: s.destaque ? 3.2 : 1.95, w: 3.0, h: s.destaque ? 3.1 : 4.3, fontSize: 16, color: VBO.texto, objectName: 'gf-t' });
        passo(['gf-b', 'gf-d', 'gf-t'], 600); }
    } else if (s.tipo === 'mapa') {
      sl = pres.addSlide({ masterName: 'VERBO_ESCURO' });
      const pts = (s.pontos || []).filter(p => isFinite(Number(p.lat)) && isFinite(Number(p.lng)));
      const zoom = s._vista === 'zoom';
      const ufsPts = new Set(pts.map(p => p.uf));
      const G = vboGeoMapa(pts, zoom, geo);
      for (const est of G.estados) forma(sl, est.aneis, { fill: { color: est.ativo ? '1C4F41' : VBO.esc2 }, line: { color: '2E6152', width: 0.6 }, objectName: '!!uf-' + est.uf });
      G.pontos.forEach((p, i) => { const [x, y] = p.pos;
        sl.addShape(pres.shapes.OVAL, { x: x - G.dh / 2, y: y - G.dh / 2, w: G.dh, h: G.dh, fill: { color: VBO.ouro, transparency: 72 }, line: { type: 'none' }, objectName: '!!ph-' + i });
        sl.addShape(pres.shapes.OVAL, { x: x - G.dp / 2, y: y - G.dp / 2, w: G.dp, h: G.dp, fill: { color: VBO.ouro }, line: { color: VBO.esc, width: 1 }, objectName: '!!pt-' + i }); });
      // painel à esquerda cobre o mapa ampliado e garante a leitura do texto
      sl.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 4.75, h: 6.8, fill: { color: VBO.esc }, line: { type: 'none' }, objectName: '!!mp-painel' });
      sl.addText(s.titulo || '', { placeholder: 'title', w: 4.0 });
      const ord = G.pontos.map((p, i) => ({ p, i })).sort((a, b) => a.p.pos[0] - b.p.pos[0]);
      if (zoom) {
        G.rotulos.forEach((r, i) => txt(sl, pts[i].cidade, { x: r.x, y: r.y, w: r.w, h: r.h, fontSize: 12, bold: true, color: VBO.branco, align: r.align, valign: 'middle', objectName: 'lb-' + i }));
        const porUf = {}; pts.forEach(p => (porUf[p.uf] = porUf[p.uf] || []).push(p.cidade));
        txt(sl, Object.entries(porUf).map(([uf, cs], i, arr) => [{ text: uf + '  ', options: { bold: true, color: VBO.ouro } }, { text: cs.join(', '), options: { color: VBO.branco, breakLine: i < arr.length - 1, paraSpaceAfter: 10 } }]).flat(),
          { x: 0.6, y: 1.6, w: 3.8, h: 4.9, fontSize: 14, objectName: 'mp-lista' });
        ord.forEach(({ i }, k) => passo(['lb-' + i], 300 + k * 90));
        passo(['mp-lista'], 300);
      } else {
        if (s.texto) txt(sl, s.texto, { x: 0.6, y: 1.6, w: 3.9, h: 1.5, fontSize: 16, color: VBO.suave, objectName: 'mp-txt' });
        txt(sl, [{ text: String(pts.length), options: { fontSize: 60, bold: true, color: VBO.ouro, breakLine: true } }, { text: pts.length === 1 ? 'cidade' : 'cidades', options: { fontSize: 16, color: VBO.branco } }], { x: 0.6, y: 3.35, w: 1.9, h: 1.6, objectName: 'mp-n1' });
        txt(sl, [{ text: String(ufsPts.size), options: { fontSize: 60, bold: true, color: VBO.ouro, breakLine: true } }, { text: ufsPts.size === 1 ? 'estado' : 'estados', options: { fontSize: 16, color: VBO.branco } }], { x: 2.6, y: 3.35, w: 1.9, h: 1.6, objectName: 'mp-n2' });
        ord.forEach(({ i }, k) => passo(['!!ph-' + i, '!!pt-' + i], 500 + k * 110, 'zoom', 400));
        passo(['mp-n1'], 300); passo(['mp-n2'], 450);
      }
    } else if (s.tipo === 'etapas') {
      sl = pres.addSlide({ masterName: 'VERBO_CLARO' });
      sl.addText(s.titulo || '', { placeholder: 'title' });
      const it = (s.itens || []).slice(0, 6); const n = Math.max(it.length, 1); const g = 0.3; const cw = (12.13 - g * (n - 1)) / n; const yc = 2.75, d = 0.8;
      if (n > 1) sl.addShape(pres.shapes.LINE, { x: 0.6 + cw / 2, y: yc, w: (cw + g) * (n - 1), h: 0, line: { color: VBO.claro2, width: 3 }, objectName: 'et-linha' });
      it.forEach((e, i) => { const x = 0.6 + i * (cw + g), cx = x + cw / 2; const ult = i === n - 1;
        sl.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 3.55, w: cw, h: 2.75, rectRadius: 0.12, fill: { color: VBO.claro }, line: { type: 'none' }, objectName: `et-b${i}` });
        sl.addShape(pres.shapes.OVAL, { x: cx - d / 2, y: yc - d / 2, w: d, h: d, fill: { color: ult ? VBO.ouro : VBO.verde }, line: { color: VBO.branco, width: 4 }, objectName: `et-c${i}` });
        txt(sl, String(i + 1), { x: cx - d / 2, y: yc - d / 2, w: d, h: d, fontSize: 22, bold: true, color: ult ? VBO.esc : VBO.branco, align: 'center', valign: 'middle', objectName: `et-n${i}` });
        if (e.quando) txt(sl, e.quando, { x, y: 1.8, w: cw, h: 0.4, fontSize: 14, bold: true, color: '8A6A10', align: 'center', objectName: `et-q${i}` });
        txt(sl, e.titulo || '', { x: x + 0.3, y: 3.85, w: cw - 0.6, h: 0.5, fontSize: 19, bold: true, color: VBO.texto, objectName: `et-t${i}` });
        txt(sl, e.texto || '', { x: x + 0.3, y: 4.45, w: cw - 0.6, h: 1.7, fontSize: 16, color: VBO.cinza, objectName: `et-x${i}` });
        passo([`et-c${i}`, `et-n${i}`, `et-q${i}`], 300 + i * 300, 'zoom', 450); passo([`et-b${i}`, `et-t${i}`, `et-x${i}`], 450 + i * 300); });
    } else if (s.tipo === 'tabela') {
      sl = pres.addSlide({ masterName: 'VERBO_CLARO' });
      sl.addText(s.titulo || '', { placeholder: 'title' });
      const tb = s.tabela || {}; const cols = tb.colunas || []; const linhas = (tb.linhas || []).slice(0, 8);
      const borda = { type: 'solid', pt: 0.75, color: VBO.claro2 };
      const rows = [cols.map(c => ({ text: c, options: { bold: true, color: VBO.branco, fill: { color: VBO.verde }, fontSize: 15 } })),
        ...linhas.map((l, i) => cols.map((_, j) => ({ text: String(l[j] ?? ''), options: { color: VBO.texto, fill: { color: i % 2 ? VBO.branco : VBO.claro }, fontSize: 15, bold: j === 0 } })))];
      const colW = cols.map((_, j) => cols.length < 2 ? 12.13 : j === 0 ? 12.13 * 0.36 : 12.13 * 0.64 / (cols.length - 1));
      if (cols.length) sl.addTable(rows, { x: 0.6, y: 1.65, w: 12.13, colW, fontFace: F, rowH: 0.62, valign: 'middle', margin: [0.06, 0.15, 0.06, 0.15], border: [borda, { type: 'none' }, borda, { type: 'none' }], objectName: 'tb' });
      if (s.nota) txt(sl, s.nota, { x: 0.6, y: 6.45, w: 10, h: 0.3, fontSize: 11, color: VBO.cinza, objectName: 'tb-nota' });
    } else if (s.tipo === 'citacao') {
      sl = pres.addSlide({ masterName: 'VERBO_ESCURO' }); sl.background = { color: VBO.verde };
      txt(sl, '“', { x: 0.75, y: 0.35, w: 2, h: 2.2, fontSize: 200, bold: true, color: VBO.ouro, objectName: 'qt-aspas' });
      txt(sl, s.texto || '', { x: 1.6, y: 2.0, w: 10.2, h: 3.3, fontSize: 32, color: VBO.branco, valign: 'middle', objectName: 'qt-txt' });
      if (s.autor) txt(sl, '— ' + s.autor, { x: 1.6, y: 5.45, w: 8, h: 0.45, fontSize: 17, bold: true, color: 'CFE6DD', objectName: 'qt-aut' });
      chevron(sl, 10.75, 5.7, 1.85, 0, VBO.esc);
      passo(['qt-aspas'], 200, 'zoom', 500); passo(['qt-txt'], 450); passo(['qt-aut'], 800);
    } else if (s.tipo === 'encerramento') {
      sl = pres.addSlide({ masterName: 'VERBO_CAPA' });
      chevron(sl, 8.0, 1.85, 4.9);
      sl.addText(s.titulo || 'Obrigado', { placeholder: 'title', fontSize: 54 });
      sl.addText(s.texto || '', { placeholder: 'body' });
      const ct = (s.contatos || []).filter(Boolean);
      if (ct.length) txt(sl, ct.map((c, i) => ({ text: c, options: { breakLine: i < ct.length - 1, paraSpaceAfter: 6 } })), { x: 0.75, y: 5.55, w: 7, h: 1.4, fontSize: 15, color: VBO.branco, objectName: 'en-ct' });
      passo(['ph:title'], 300); passo(['ph:body'], 550); passo(['en-ct'], 800);
    } else continue;
    if (s.notas) sl.addNotes(s.notas);
  }
  if (opts.guia) vboSlideGuia(pres, txt, A);
  let saida = await pres.write({ outputType: opts.saida || 'arraybuffer' });
  return vboPosProcessar(saida, meta, { JSZip, saida: opts.saida || 'arraybuffer', tituloTema: 'Verbo Logística' });
}

// slide oculto com o guia rápido do modelo (só no arquivo-modelo)
function vboSlideGuia(pres, txt, A) {
  const sl = pres.addSlide({ masterName: 'VERBO_CLARO' }); sl.hidden = true;
  sl.addText('Guia rápido do modelo', { placeholder: 'title' });
  const cores = [['Verde Verbo', VBO.verde], ['Ouro Verbo', VBO.ouro], ['Fundo escuro', VBO.esc], ['Cinza claro', VBO.claro], ['Texto', VBO.texto]];
  cores.forEach(([n, c], i) => { const y = 1.7 + i * 0.85;
    sl.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y, w: 0.65, h: 0.65, rectRadius: 0.08, fill: { color: c }, line: { color: VBO.claro2, width: 0.75 } });
    txt(sl, [{ text: n, options: { bold: true, breakLine: true } }, { text: '#' + c, options: { color: VBO.cinza } }], { x: 1.45, y: y + 0.02, w: 2.8, h: 0.62, fontSize: 13, color: VBO.texto }); });
  const regras = ['Fonte: Arial (títulos em negrito). Já vem configurada no tema.', 'Novo slide: Página Inicial › Novo Slide › escolha um layout "VERBO_…".',
    'Transição Transformar (Morph): o "V" da Verbo e o mapa se movem sozinhos entre os slides. Precisa do PowerPoint 2019/365; nos outros vira Esmaecer.',
    'Uma mensagem por slide, no máximo 4 tópicos, nada de texto abaixo de 14 pt.', 'Fotos: clique com o botão direito › Alterar imagem, para manter o tamanho e o recorte.',
    'Para montar no navegador, com mapa automático, PDF e .pptx: Verbo Gestão › Biblioteca › Apresentações.', 'Este slide fica oculto e não aparece na apresentação.'];
  txt(sl, regras.map((r, i) => ({ text: r, options: { bullet: { indent: 18 }, breakLine: i < regras.length - 1, paraSpaceAfter: 10 } })), { x: 4.8, y: 1.7, w: 7.9, h: 4.9, fontSize: 15, color: VBO.texto });
}

// transições (Transformar/Morph com Esmaecer de reserva), animações de entrada e cores do tema
const VBO_TRANSICAO = '<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><mc:Choice xmlns:p159="http://schemas.microsoft.com/office/powerpoint/2015/09/main" Requires="p159"><p:transition xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" spd="slow" p14:dur="1100"><p159:morph option="byObject"/></p:transition></mc:Choice><mc:Fallback><p:transition spd="slow"><p:fade/></p:transition></mc:Fallback></mc:AlternateContent>';
function vboTiming(passos, formas) {
  let n = 4; const c = () => ++n; const bld = new Set(); const efs = [];
  for (const p of passos) for (const nome of p.nomes) {
    const f = formas[nome]; if (!f) continue; const sp = f.id; const id0 = c();
    let fl = `<p:set><p:cBhvr><p:cTn id="${c()}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn><p:tgtEl><p:spTgt spid="${sp}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>`;
    if (p.tipo === 'zoom') fl += ['ppt_w', 'ppt_h'].map(a => `<p:anim calcmode="lin" valueType="num"><p:cBhvr><p:cTn id="${c()}" dur="${p.dur}" fill="hold"/><p:tgtEl><p:spTgt spid="${sp}"/></p:tgtEl><p:attrNameLst><p:attrName>${a}</p:attrName></p:attrNameLst></p:cBhvr><p:tavLst><p:tav tm="0"><p:val><p:fltVal val="0"/></p:val></p:tav><p:tav tm="100000"><p:val><p:strVal val="#${a}"/></p:val></p:tav></p:tavLst></p:anim>`).join('');
    fl += `<p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="${c()}" dur="${p.dur}"/><p:tgtEl><p:spTgt spid="${sp}"/></p:tgtEl></p:cBhvr></p:animEffect>`;
    efs.push(`<p:par><p:cTn id="${id0}" presetID="${p.tipo === 'zoom' ? 53 : 10}" presetClass="entr" presetSubtype="${p.tipo === 'zoom' ? 16 : 0}" fill="hold"${f.sp ? ' grpId="0"' : ''} nodeType="withEffect"><p:stCondLst><p:cond delay="${Math.round(p.atraso)}"/></p:stCondLst><p:childTnLst>${fl}</p:childTnLst></p:cTn></p:par>`);
    if (f.sp) bld.add(sp);
  }
  if (!efs.length) return '';
  return '<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>'
    + '<p:par><p:cTn id="3" fill="hold"><p:stCondLst><p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst><p:childTnLst><p:par><p:cTn id="4" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>'
    + efs.join('') + '</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn>'
    + '<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq></p:childTnLst></p:cTn></p:par></p:tnLst>'
    + (bld.size ? '<p:bldLst>' + [...bld].map(id => `<p:bldP spid="${id}" grpId="0" animBg="1"/>`).join('') + '</p:bldLst>' : '') + '</p:timing>';
}
function vboFormasSlide(xml) { // nome → { id, sp }
  const r = {};
  for (const m of xml.matchAll(/<p:(sp|pic|graphicFrame|cxnSp)>([\s\S]*?)<\/p:\1>/g)) {
    const c = m[2].match(/<p:cNvPr id="(\d+)" name="([^"]*)"/); if (!c) continue;
    const ent = { id: c[1], sp: m[1] === 'sp' }; r[c[2]] = ent;
    const ph = m[2].match(/<p:ph type="(\w+)"/); if (ph && !r['ph:' + ph[1]]) r['ph:' + ph[1]] = ent;
  }
  return r;
}
async function vboPosProcessar(dados, meta, { JSZip, saida }) {
  const zip = await JSZip.loadAsync(dados);
  const esquema = `<a:clrScheme name="Verbo Logística"><a:dk1><a:srgbClr val="${VBO.esc}"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="${VBO.verde}"/></a:dk2><a:lt2><a:srgbClr val="${VBO.claro}"/></a:lt2>`
    + VBO.serie.map((c, i) => `<a:accent${i + 1}><a:srgbClr val="${c}"/></a:accent${i + 1}>`).join('') + `<a:hlink><a:srgbClr val="${VBO.verde}"/></a:hlink><a:folHlink><a:srgbClr val="5D6F68"/></a:folHlink></a:clrScheme>`;
  for (const f of Object.keys(zip.files).filter(f => /^ppt\/theme\/theme\d+\.xml$/.test(f))) {
    const x = await zip.file(f).async('string'); zip.file(f, x.replace(/<a:clrScheme[\s\S]*?<\/a:clrScheme>/, esquema));
  }
  for (let i = 1; zip.file(`ppt/slides/slide${i}.xml`); i++) {
    const f = `ppt/slides/slide${i}.xml`; let x = await zip.file(f).async('string');
    const extra = VBO_TRANSICAO + vboTiming((meta[i - 1] || { anim: [] }).anim, vboFormasSlide(x));
    x = x.includes('<p:extLst>') && x.lastIndexOf('<p:extLst>') > x.lastIndexOf('</p:clrMapOvr>') ? x.replace(/<p:extLst>(?![\s\S]*<p:extLst>)/, extra + '<p:extLst>') : x.replace(/<\/p:sld>\s*$/, extra + '</p:sld>');
    zip.file(f, x);
  }
  return zip.generateAsync({ type: saida === 'nodebuffer' ? 'nodebuffer' : 'blob', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
}
if (typeof module !== 'undefined') module.exports = { VBO, VBO_ICONES, VBO_TIPOS, VBO_MODELO, VBO_CHEVRON, vboSvgIcone, vboPontosPath, vboMerc, vboEncaixe, vboCaixaPontos, vboPlanos, vboGeoMapa, vboGerarPptx };
