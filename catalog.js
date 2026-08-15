/**
 * SHOPOFFICE — Catálogo (CSV no próprio repositório, sem back-end)
 * ------------------------------------------------------------------
 * Busca produtos.csv, monta os cards de produto na home (os marcados
 * como destaque) e deixa a lista completa disponível em
 * window.SHOPOFFICE_PRODUCTS pro carrinho (script.js) usar.
 *
 * Imagens são sempre locais: nas colunas imagem_capa/imagem_galeria,
 * digite só o NOME DO ARQUIVO (com a extensão real: .jpg, .jpeg ou .png)
 * — ex: "mesa-tijuca.jpg". O arquivo precisa estar em imagens/produtos/
 * dentro do repositório (ver guia-imagens-produtos.md). Se a célula
 * ficar em branco, aparece um retângulo "Foto em breve" no lugar.
 */

var CSV_URL = 'produtos.csv';
var PASTA_IMAGENS_PRODUTOS = 'imagens/produtos/';

// Aparece no lugar da foto quando a célula está em branco, ou quando o
// arquivo esperado não existe no repositório — ver função onErrorImg().
var IMAGEM_PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">' +
  '<rect width="400" height="400" fill="#E7EBDA"/>' +
  '<g fill="none" stroke="#33461A" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity="0.6">' +
  '<rect x="90" y="120" width="220" height="160" rx="12"/>' +
  '<circle cx="150" cy="170" r="16"/>' +
  '<path d="M90 250 L170 190 L230 240 L260 210 L310 250"/>' +
  '</g>' +
  '<text x="200" y="320" font-family="sans-serif" font-size="22" fill="#33461A" text-anchor="middle" opacity="0.75">Foto em breve</text>' +
  '</svg>'
);

/** Atributo onerror comum a toda <img> de produto: troca pro placeholder se o arquivo não existir. */
function onErrorImg() {
  return 'this.onerror=null;this.src=\'' + IMAGEM_PLACEHOLDER + '\';this.classList.add(\'img-fallback\');';
}

var ICONE_POR_CATEGORIA = {
  'mesas': 'fa-table',
  'cadeiras': 'fa-chair',
  'armários': 'fa-box-archive',
  'armarios': 'fa-box-archive',
  'bistrôs': 'fa-table',
  'bistros': 'fa-table',
  'banquetas': 'fa-chair',
  'conforto': 'fa-couch',
  'estofados': 'fa-couch'
};
var ICONE_PADRAO = 'fa-cube';

function iconeDaCategoria(categoria) {
  var chave = String(categoria || '').trim().toLowerCase();
  return ICONE_POR_CATEGORIA[chave] || ICONE_PADRAO;
}

/**
 * Resolve o valor de uma célula de imagem (imagem_capa ou um item de
 * imagem_galeria) pro caminho real do arquivo. Aceita .jpg, .jpeg ou .png
 * — a extensão vem de dentro do próprio nome digitado na planilha, então
 * não precisa configurar nada além de escrever o nome certo do arquivo.
 *   "mesa-tijuca.jpg"              -> "imagens/produtos/mesa-tijuca.jpg"
 *   "imagens/produtos/foto-x.png"  -> usado como veio (já é um caminho)
 *   ""                             -> "" (o card usa o placeholder)
 */
function resolverImagem(bruto) {
  bruto = String(bruto || '').trim();
  if (!bruto) return '';
  if (/^https?:\/\//i.test(bruto) || bruto.indexOf('/') !== -1) {
    return bruto; // já veio como link/caminho completo — usa direto
  }
  return PASTA_IMAGENS_PRODUTOS + bruto; // só o nome do arquivo — prefixa a pasta
}

/* ---------- Normalização de uma linha do CSV pro formato usado no site ---------- */
function normalizarProduto(linha) {
  var id = String(linha.id || '').trim();
  var capa = resolverImagem(linha.imagem_capa);
  var galeriaBruta = String(linha.imagem_galeria || '').trim();
  var galeria = galeriaBruta
    ? galeriaBruta.split(',').map(function (s) { return resolverImagem(s.trim()); }).filter(Boolean)
    : [];

  return {
    id: id,
    nome: String(linha.nome || '').trim(),
    categoria: String(linha.categoria || '').trim(),
    descricao: String(linha.descricao || '').trim(),
    especificacoes: String(linha.especificacoes || '').trim(),
    aplicacao: String(linha.aplicacao || '').trim(),
    imagem_capa: capa || IMAGEM_PLACEHOLDER,
    imagem_galeria: galeria,
    destaque: String(linha.destaque || '').toUpperCase() === 'TRUE',
    ativo: String(linha.ativo || '').toUpperCase() !== 'FALSE' // em branco = ativo
  };
}

/* ---------- Template de um card + modal (mesma estrutura visual de antes) ---------- */
function htmlDoProduto(p) {
  var modalId = 'modal-' + p.id;
  var icone = iconeDaCategoria(p.categoria);

  var galeriaHtml = (p.imagem_galeria.length ? p.imagem_galeria : [p.imagem_capa])
    .map(function (src) {
      return '<div class="aspect-square overflow-hidden rounded-2xl bg-[var(--badge-bg)]">' +
        '<img src="' + src + '" alt="' + p.nome + '" class="h-full w-full object-contain" loading="lazy" onerror="' + onErrorImg() + '">' +
        '</div>';
    }).join('');

  var especificacoesHtml = p.especificacoes
    ? '<p class="mt-4 text-sm leading-6 text-[var(--text-muted)]"><strong class="text-[var(--text-color)]">Especificações:</strong> ' + p.especificacoes + '</p>'
    : '';
  var aplicacaoHtml = p.aplicacao
    ? '<p class="mt-2 text-sm leading-6 text-[var(--text-muted)]"><strong class="text-[var(--text-color)]">Aplicação:</strong> ' + p.aplicacao + '</p>'
    : '';

  return (
    '<article class="reveal is-visible glass-panel flex flex-col rounded-[2rem] p-6" data-categoria="' + p.categoria + '">' +
      '<div class="mb-6 aspect-[4/3] w-full cursor-pointer overflow-hidden rounded-t-[2.5rem] rounded-b-xl bg-[var(--badge-bg)]" data-open-modal="' + modalId + '">' +
        '<img src="' + p.imagem_capa + '" alt="' + p.nome + '" class="h-full w-full object-contain transition-transform duration-500 hover:scale-105" loading="lazy" onerror="' + onErrorImg() + '">' +
      '</div>' +
      '<div class="flex items-start justify-between gap-4">' +
        '<span class="rounded-full bg-[var(--badge-bg)] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--badge-text)]">' + p.categoria + '</span>' +
        '<i class="fa-solid ' + icone + ' text-xl text-[var(--accent-color)]"></i>' +
      '</div>' +
      '<h3 class="font-heading mt-6 text-xl font-bold tracking-tight">' + p.nome + '</h3>' +
      '<p class="mt-3 flex-1 text-sm leading-7 text-[var(--text-muted)]">' + p.descricao + '</p>' +
      '<div class="mt-7 flex flex-wrap items-center justify-between gap-3">' +
        '<button type="button" data-open-modal="' + modalId + '" class="inline-flex items-center rounded-full bg-[var(--button-color)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)]">' +
          '<i class="fa-solid fa-images mr-2"></i>Ver Fotos' +
        '</button>' +
        '<div class="qty-stepper" data-product-id="' + p.id + '" data-product-title="' + p.nome + '">' +
          '<button type="button" class="qty-btn" data-qty-action="decrease" aria-label="Diminuir quantidade de ' + p.nome + '">\u2212</button>' +
          '<span class="qty-value" data-qty-value>0</span>' +
          '<button type="button" class="qty-btn" data-qty-action="increase" aria-label="Aumentar quantidade de ' + p.nome + '">+</button>' +
        '</div>' +
      '</div>' +
    '</article>' +
    '<dialog id="' + modalId + '" class="modal">' +
      '<div class="glass-panel relative max-h-[85vh] w-[92vw] max-w-3xl overflow-y-auto rounded-[2rem] bg-[var(--background-color)] p-6 sm:p-10">' +
        '<button type="button" data-close-modal class="glass-panel absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full" aria-label="Fechar">' +
          '<i class="fa-solid fa-xmark"></i>' +
        '</button>' +
        '<div class="flex items-center gap-4 pr-10">' +
          '<i class="fa-solid ' + icone + ' text-2xl text-[var(--accent-color)]"></i>' +
          '<h3 class="font-heading text-2xl font-bold sm:text-3xl">' + p.nome + '</h3>' +
        '</div>' +
        '<p class="mt-4 max-w-2xl text-[var(--text-muted)]">' + p.descricao + '</p>' +
        especificacoesHtml + aplicacaoHtml +
        '<div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">' + galeriaHtml + '</div>' +
        '<div class="mt-10 flex justify-end">' +
          '<button type="button" data-cart-add="' + p.id + '" class="inline-flex items-center justify-center rounded-full bg-[var(--button-color)] px-7 py-3.5 font-semibold text-white transition-colors hover:bg-[var(--primary-hover)]">' +
            '<i class="fa-solid fa-cart-plus mr-2"></i>Adicionar ao Orçamento' +
          '</button>' +
        '</div>' +
      '</div>' +
    '</dialog>'
  );
}

/* ---------- Renderiza uma lista de produtos dentro de um container ---------- */
function renderizarGrade(containerEl, produtos) {
  if (produtos.length === 0) {
    containerEl.innerHTML = '<p class="col-span-full text-center text-sm text-[var(--text-muted)]">Nenhum produto encontrado.</p>';
    return;
  }
  containerEl.innerHTML = produtos.map(htmlDoProduto).join('');
}

/* ---------- Carregamento inicial ---------- */
document.addEventListener('DOMContentLoaded', function () {
  var grid = document.getElementById('productsGrid');
  if (!grid) return;

  if (typeof Papa === 'undefined') {
    grid.innerHTML = '<p class="col-span-full text-center text-sm text-[var(--text-muted)]">Não foi possível carregar o catálogo (biblioteca CSV ausente).</p>';
    return;
  }

  Papa.parse(CSV_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function (resultado) {
      var todos = resultado.data
        .map(normalizarProduto)
        .filter(function (p) { return p.id && p.ativo; });

      window.SHOPOFFICE_PRODUCTS = todos;

      var destaques = todos.filter(function (p) { return p.destaque; });
      renderizarGrade(grid, destaques.length ? destaques : todos.slice(0, 9));

      window.dispatchEvent(new CustomEvent('shopoffice:produtos-prontos', { detail: { produtos: todos } }));
    },
    error: function (erro) {
      console.error('Erro ao carregar produtos.csv:', erro);
      grid.innerHTML = '<p class="col-span-full text-center text-sm text-[var(--text-muted)]">Não foi possível carregar o catálogo agora. Tente recarregar a página.</p>';
    }
  });
});
