/**
 * SHOPOFFICE — Backend da área do vendedor (Google Apps Script + Sheets)
 * ------------------------------------------------------------------
 * Login de vendedores + geração de orçamento com preços. Fica num
 * projeto Apps Script separado do catálogo público — nada aqui é lido
 * pelo site público, só pela página vendedor.html (que não tem link
 * em lugar nenhum do site).
 *
 * SOBRE "CRIPTOGRAFIA MÍNIMA":
 * - Dado em trânsito (navegador <-> este script): já vai criptografado
 *   por HTTPS automaticamente, é o próprio Google que cuida disso. Não
 *   precisa fazer nada a mais pra isso funcionar.
 * - Senha guardada na planilha: nunca em texto puro. Aqui uso hash
 *   SHA-256 com "sal" (salt) por usuário — é o mínimo razoável dá pra
 *   fazer sem biblioteca externa. NÃO é o nível de bcrypt/Argon2 (que
 *   um sistema bancário usaria), mas já é muito melhor que senha em
 *   texto puro, que é o erro mais comum.
 * - Sessão: ao logar, o vendedor recebe um token aleatório que expira
 *   sozinho em algumas horas. As telas de preço/orçamento só respondem
 *   se receberem um token válido.
 *
 * CONFIGURAÇÃO:
 * 1. Crie uma planilha Google NOVA (separada da de produtos), só pra isso.
 * 2. Extensões > Apps Script, cole este código.
 * 3. Recarregue a planilha — menu "Shopoffice Vendedor" > "Criar estrutura
 *    e primeiro vendedor" (vai pedir usuário/senha inicial num pop-up).
 * 4. Implantar > Nova implantação > App da Web.
 *    - Executar como: Eu
 *    - Quem pode acessar: Qualquer pessoa
 * 5. Copie a URL /exec e cole em API_URL no vendedor.js do site.
 */

var SHEET_VENDEDORES = 'Vendedores';
var SHEET_PRECOS = 'Precos';
var SHEET_ORCAMENTOS = 'Orcamentos';
var DURACAO_SESSAO_SEGUNDOS = 6 * 60 * 60; // 6h — máximo permitido pelo CacheService

/* ============================== ENTRADA ============================== */

function doPost(e) {
  var corpo = {};
  try {
    corpo = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ ok: false, erro: 'Corpo da requisição inválido.' });
  }

  switch (corpo.action) {
    case 'login':
      return acaoLogin(corpo.usuario, corpo.senha);
    case 'produtos':
      return acaoListarProdutosComPreco(corpo.token);
    case 'gerarOrcamento':
      return acaoGerarOrcamento(corpo.token, corpo.cliente, corpo.itens);
    default:
      return jsonResponse({ ok: false, erro: 'Ação desconhecida.' });
  }
}

function doGet(e) {
  return jsonResponse({ ok: false, erro: 'Use POST.' });
}

/* ============================== LOGIN / SESSÃO ============================== */

function acaoLogin(usuario, senha) {
  usuario = String(usuario || '').trim().toLowerCase();
  senha = String(senha || '');
  if (!usuario || !senha) {
    return jsonResponse({ ok: false, erro: 'Informe usuário e senha.' });
  }

  var cache = CacheService.getScriptCache();
  var chaveFalhas = 'falhas_' + usuario;
  var falhas = Number(cache.get(chaveFalhas) || 0);
  if (falhas >= 5) {
    return jsonResponse({ ok: false, erro: 'Muitas tentativas erradas. Aguarde alguns minutos e tente de novo.' });
  }

  var vendedor = buscarVendedor(usuario);
  if (!vendedor || !vendedor.ativo || hashSenha(senha, vendedor.salt) !== vendedor.senha_hash) {
    cache.put(chaveFalhas, String(falhas + 1), 15 * 60); // trava crescente por 15min a cada falha
    return jsonResponse({ ok: false, erro: 'Usuário ou senha incorretos.' });
  }

  cache.remove(chaveFalhas);

  var token = Utilities.getUuid();
  cache.put('sessao_' + token, JSON.stringify({ usuario: usuario, nome: vendedor.nome }), DURACAO_SESSAO_SEGUNDOS);

  return jsonResponse({ ok: true, token: token, nome: vendedor.nome, expiraEm: DURACAO_SESSAO_SEGUNDOS });
}

function sessaoValida(token) {
  if (!token) return null;
  var bruto = CacheService.getScriptCache().get('sessao_' + token);
  if (!bruto) return null;
  try { return JSON.parse(bruto); } catch (e) { return null; }
}

/* ============================== HASH DE SENHA ============================== */

function hashSenha(senha, salt) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, senha + salt);
  return bytes.map(function (b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function gerarSalt() {
  return Utilities.getUuid().replace(/-/g, '');
}

/* ============================== VENDEDORES ============================== */

function buscarVendedor(usuario) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_VENDEDORES);
  if (!sheet) return null;
  var dados = sheet.getDataRange().getValues();
  var cab = dados[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var iUsuario = cab.indexOf('usuario');
  var iHash = cab.indexOf('senha_hash');
  var iSalt = cab.indexOf('salt');
  var iNome = cab.indexOf('nome');
  var iAtivo = cab.indexOf('ativo');

  for (var i = 1; i < dados.length; i++) {
    if (String(dados[i][iUsuario]).trim().toLowerCase() === usuario) {
      return {
        usuario: usuario,
        senha_hash: dados[i][iHash],
        salt: dados[i][iSalt],
        nome: dados[i][iNome],
        ativo: String(dados[i][iAtivo]).toUpperCase() !== 'FALSE'
      };
    }
  }
  return null;
}

/**
 * Cria (ou reativa) um vendedor. Rode manualmente pelo editor de Apps
 * Script quando precisar cadastrar alguém — não é exposta como ação do
 * doPost de propósito, pra não dar pra criar vendedor pela URL pública.
 */
function cadastrarVendedor(usuario, senhaInicial, nomeCompleto) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_VENDEDORES);
  var salt = gerarSalt();
  var hash = hashSenha(senhaInicial, salt);
  sheet.appendRow([usuario.toLowerCase().trim(), hash, salt, nomeCompleto, true]);
  Logger.log('Vendedor "' + usuario + '" cadastrado.');
}

/* ============================== PREÇOS / PRODUTOS ============================== */

function acaoListarProdutosComPreco(token) {
  var sessao = sessaoValida(token);
  if (!sessao) return jsonResponse({ ok: false, erro: 'Sessão inválida ou expirada. Faça login de novo.' });

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PRECOS);
  if (!sheet) return jsonResponse({ ok: true, produtos: [] });

  var dados = sheet.getDataRange().getValues();
  var cab = dados[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var produtos = [];
  for (var i = 1; i < dados.length; i++) {
    var obj = {};
    cab.forEach(function (h, idx) { obj[h] = dados[i][idx]; });
    if (String(obj.produto_id || '').trim()) {
      obj.preco_base = Number(obj.preco_base) || 0;
      produtos.push(obj);
    }
  }
  return jsonResponse({ ok: true, produtos: produtos });
}

/* ============================== GERAÇÃO DE ORÇAMENTO ============================== */

function acaoGerarOrcamento(token, cliente, itens) {
  var sessao = sessaoValida(token);
  if (!sessao) return jsonResponse({ ok: false, erro: 'Sessão inválida ou expirada. Faça login de novo.' });

  if (!itens || !itens.length) {
    return jsonResponse({ ok: false, erro: 'Adicione ao menos um item.' });
  }

  var total = 0;
  itens.forEach(function (item) {
    total += (Number(item.quantidade) || 0) * (Number(item.preco_unitario) || 0);
  });

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ORCAMENTOS);
  if (sheet) {
    sheet.appendRow([
      new Date(),
      sessao.nome || sessao.usuario,
      (cliente && cliente.nome) || '',
      (cliente && cliente.contato) || '',
      JSON.stringify(itens),
      total
    ]);
  }

  return jsonResponse({ ok: true, total: total, vendedor: sessao.nome || sessao.usuario });
}

/* ============================== SETUP (menu na planilha) ============================== */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Shopoffice Vendedor')
    .addItem('Criar estrutura e primeiro vendedor', 'criarEstruturaInicial')
    .addItem('Cadastrar novo vendedor', 'cadastrarVendedorPeloMenu')
    .addToUi();
}

function criarEstruturaInicial() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();

  if (!ss.getSheetByName(SHEET_VENDEDORES)) {
    var sv = ss.insertSheet(SHEET_VENDEDORES);
    sv.getRange(1, 1, 1, 5).setValues([['usuario', 'senha_hash', 'salt', 'nome', 'ativo']]);
    sv.getRange(1, 1, 1, 5).setFontWeight('bold');
    sv.setFrozenRows(1);
  }
  if (!ss.getSheetByName(SHEET_PRECOS)) {
    var sp = ss.insertSheet(SHEET_PRECOS);
    sp.getRange(1, 1, 1, 2).setValues([['produto_id', 'preco_base']]);
    sp.getRange(1, 1, 1, 2).setFontWeight('bold');
    sp.setFrozenRows(1);
  }
  if (!ss.getSheetByName(SHEET_ORCAMENTOS)) {
    var so = ss.insertSheet(SHEET_ORCAMENTOS);
    so.getRange(1, 1, 1, 6).setValues([['data_hora', 'vendedor', 'cliente_nome', 'cliente_contato', 'itens_json', 'total']]);
    so.getRange(1, 1, 1, 6).setFontWeight('bold');
    so.setFrozenRows(1);
  }

  var jaTemVendedor = ss.getSheetByName(SHEET_VENDEDORES).getLastRow() > 1;
  if (!jaTemVendedor) {
    var usuario = ui.prompt('Primeiro vendedor', 'Nome de usuário (login):', ui.ButtonSet.OK_CANCEL);
    if (usuario.getSelectedButton() !== ui.Button.OK || !usuario.getResponseText().trim()) return;
    var senha = ui.prompt('Primeiro vendedor', 'Senha inicial:', ui.ButtonSet.OK_CANCEL);
    if (senha.getSelectedButton() !== ui.Button.OK || !senha.getResponseText().trim()) return;
    var nome = ui.prompt('Primeiro vendedor', 'Nome completo:', ui.ButtonSet.OK_CANCEL);

    cadastrarVendedor(usuario.getResponseText(), senha.getResponseText(), nome.getResponseText());
    ui.alert('Vendedor criado. Já dá pra fazer login pela página do vendedor.');
  } else {
    ui.alert('Estrutura já existe — nada foi alterado.');
  }
}

function cadastrarVendedorPeloMenu() {
  var ui = SpreadsheetApp.getUi();
  var usuario = ui.prompt('Novo vendedor', 'Nome de usuário (login):', ui.ButtonSet.OK_CANCEL);
  if (usuario.getSelectedButton() !== ui.Button.OK || !usuario.getResponseText().trim()) return;
  var senha = ui.prompt('Novo vendedor', 'Senha inicial:', ui.ButtonSet.OK_CANCEL);
  if (senha.getSelectedButton() !== ui.Button.OK || !senha.getResponseText().trim()) return;
  var nome = ui.prompt('Novo vendedor', 'Nome completo:', ui.ButtonSet.OK_CANCEL);

  cadastrarVendedor(usuario.getResponseText(), senha.getResponseText(), nome.getResponseText());
  ui.alert('Vendedor "' + usuario.getResponseText() + '" cadastrado.');
}

/* ============================== UTIL ============================== */

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
