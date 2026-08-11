document.addEventListener('DOMContentLoaded', function () {

  /* ---------- Menu hambúrguer (overlay mobile) ---------- */
  var navToggle = document.getElementById('navToggle');
  var navClose = document.getElementById('navClose');
  var navOverlay = document.getElementById('navOverlay');

  function openNav() {
    navOverlay.classList.remove('hidden');
    navOverlay.classList.add('flex');
    navOverlay.setAttribute('aria-hidden', 'false');
    navToggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('overflow-hidden');
    navClose.focus();
  }

  function closeNav() {
    navOverlay.classList.add('hidden');
    navOverlay.classList.remove('flex');
    navOverlay.setAttribute('aria-hidden', 'true');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('overflow-hidden');
    navToggle.focus();
  }

  navToggle.addEventListener('click', openNav);
  navClose.addEventListener('click', closeNav);
  navOverlay.querySelectorAll('[data-nav-link]').forEach(function (link) {
    link.addEventListener('click', closeNav);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !navOverlay.classList.contains('hidden')) closeNav();
  });

  /* ---------- Header muda de aparência ao rolar a página ---------- */
  var header = document.querySelector('.site-header');
  window.addEventListener('scroll', function () {
    header.classList.toggle('is-scrolled', window.scrollY > 12);
  }, { passive: true });

  /* ---------- Modais de galeria dos produtos (<dialog> nativo) ---------- */
  document.querySelectorAll('[data-open-modal]').forEach(function (trigger) {
    trigger.addEventListener('click', function () {
      var dialog = document.getElementById(trigger.getAttribute('data-open-modal'));
      if (dialog && typeof dialog.showModal === 'function') dialog.showModal();
    });
  });

  document.querySelectorAll('dialog.modal').forEach(function (dialog) {
    dialog.querySelectorAll('[data-close-modal]').forEach(function (btn) {
      btn.addEventListener('click', function () { dialog.close(); });
    });
    // Fecha ao clicar fora da caixa de conteúdo (no backdrop)
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog) dialog.close();
    });
  });

  /* ---------- Botões "Orçamento" dos produtos: leva ao formulário já preenchido ---------- */
  document.querySelectorAll('[data-request-quote]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      var productName = el.getAttribute('data-request-quote');
      var openDialog = el.closest('dialog');
      if (openDialog) openDialog.close();

      var messageField = document.getElementById('message');
      if (messageField) messageField.value = 'Tenho interesse em: ' + productName + '. ';

      var contactSection = document.getElementById('contact');
      if (contactSection) contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

      window.setTimeout(function () {
        if (messageField) messageField.focus();
      }, 450);
    });
  });

  /* ---------- Revelação suave das seções ao rolar ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { observer.observe(el); });
  }

  /* ---------- Formulário de contato ----------
     Página estática, sem back-end: ao enviar, abrimos o e-mail do cliente
     já preenchido para shopofficevca@gmail.com. Para receber os pedidos
     diretamente (sem depender do app de e-mail do visitante), conecte
     este formulário a um serviço como Formspree/EmailJS ou a um back-end
     próprio futuramente. */
  var contactForm = document.getElementById('contactForm');
  var formStatus = document.getElementById('formStatus');

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('name').value.trim();
      var email = document.getElementById('email').value.trim();
      var message = document.getElementById('message').value.trim();

      var subject = encodeURIComponent('Orçamento Shopoffice - ' + name);
      var body = encodeURIComponent('Nome: ' + name + '\nE-mail: ' + email + '\n\nMensagem:\n' + message);

      if (formStatus) {
        formStatus.textContent = 'Abrindo seu aplicativo de e-mail para enviar a solicitação...';
        formStatus.classList.remove('hidden');
      }

      window.location.href = 'mailto:shopofficevca@gmail.com?subject=' + subject + '&body=' + body;
    });
  }

});

/* =========================================================================
   WIDGET DE CHAT — assistente com respostas rápidas (client-side, sem back-end)
   Responde dúvidas comuns por palavra-chave usando informações reais do site.
   Para pedidos de orçamento/venda ou perguntas fora do escopo, encaminha
   para atendimento humano real (telefone/e-mail). Não é um chat ao vivo
   conectado a um atendente de verdade — para isso, integrar futuramente
   um serviço como WhatsApp Business, Tawk.to, Crisp etc.
   ========================================================================= */
(function () {
  var chatLauncher = document.getElementById('chatLauncher');
  var chatPanel = document.getElementById('chatPanel');
  var chatClose = document.getElementById('chatClose');
  var chatMessages = document.getElementById('chatMessages');
  var chatQuickReplies = document.getElementById('chatQuickReplies');
  var chatForm = document.getElementById('chatForm');
  var chatInput = document.getElementById('chatInput');
  var chatOpenFromSection = document.getElementById('chatOpenFromSection');
  var chatSendBtn = chatForm ? chatForm.querySelector('button[type="submit"]') : null;

  if (!chatLauncher || !chatPanel || !chatForm) return;

  var hasGreeted = false;

  var FAQ = [
    {
      keys: ['horario', 'horário', 'funciona', 'aberto', 'atende'],
      reply: 'Atendemos de Segunda a Sexta, das 09h às 18h. Fora desse horário, é só deixar sua mensagem por aqui que respondemos assim que possível.'
    },
    {
      keys: ['entrega', 'prazo', 'demora', 'logistica', 'logística', 'quando chega'],
      reply: 'Trabalhamos com entregas programadas e ágeis, alinhadas com você antes do envio pra não impactar sua operação. O prazo exato varia por produto e quantidade — um consultor pode te passar uma data precisa.'
    },
    {
      keys: ['visita', 'tecnica', 'técnica', 'medir', 'medida', 'in loco', 'no local'],
      reply: 'Sim! Fazemos visita técnica pra levantar medidas e planejar o layout do seu espaço antes de fechar o projeto. Posso te conectar com um consultor pra agendar:',
      actions: true
    },
    {
      keys: ['preco', 'preço', 'valor', 'quanto custa', 'orcamento', 'orçamento', 'comprar', 'contratar'],
      reply: 'Nossos valores variam conforme modelo, quantidade e acabamento, por isso os orçamentos são personalizados. Me conta o que você precisa que já encaminho, ou fale direto com um consultor:',
      actions: true
    },
    {
      keys: ['catalogo', 'catálogo', 'produto', 'mesa', 'cadeira', 'armario', 'armário', 'bistro', 'bistrô', 'banqueta', 'estofado', 'sofa', 'sofá'],
      reply: 'Temos linha completa de mesas, cadeiras ergonômicas e fixas, armários, bistrôs, banquetas e estofados sob medida. Dá uma olhada na seção "Nosso Catálogo" ali em cima — e se quiser algo que não está lá, é só perguntar.'
    },
    {
      keys: ['servico', 'serviço', 'montagem', 'projeto', 'consultoria', 'layout'],
      reply: 'Cuidamos do processo completo: consultoria de layout, projeto sob medida, logística e montagem especializada no local. Dá uma olhada na seção "Serviços" pra mais detalhes.'
    },
    {
      keys: ['consultor', 'humano', 'atendente', 'pessoa', 'alguem', 'alguém', 'falar com'],
      reply: 'Claro! Você pode falar direto com a nossa equipe:',
      actions: true
    },
    {
      keys: ['oi', 'ola', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'eae', 'opa'],
      reply: 'Olá! 😊 Posso te ajudar com informações sobre produtos, prazos e orçamentos. Se preferir, um consultor humano também pode te atender — é só pedir.'
    }
  ];

  var QUICK_REPLIES = [
    { label: 'Ver catálogo', text: 'Quero ver o catálogo de produtos' },
    { label: 'Horário de atendimento', text: 'Qual o horário de atendimento?' },
    { label: 'Visita técnica', text: 'Como funciona a visita técnica?' },
    { label: 'Falar com consultor', text: 'Quero falar com um consultor' }
  ];

  function normalize(str) {
    return str.toLowerCase();
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function addMessage(text, sender, withActions) {
    var el = document.createElement('div');
    el.className = 'msg ' + (sender === 'user' ? 'msg-user' : 'msg-bot');
    el.textContent = text;

    if (withActions) {
      var actions = document.createElement('div');
      actions.className = 'msg-actions';
      actions.innerHTML =
        '<button type="button" class="msg-action-btn msg-action-whatsapp" data-chat-whatsapp><i class="fa-brands fa-whatsapp"></i>WhatsApp</button>' +
        '<a class="msg-action-btn" href="tel:7730178880"><i class="fa-solid fa-phone"></i>Ligar agora</a>' +
        '<button type="button" class="msg-action-btn" data-chat-email><i class="fa-solid fa-envelope"></i>E-mail</button>';
      el.appendChild(actions);
    }

    chatMessages.appendChild(el);
    scrollToBottom();
  }

  function showTyping() {
    var el = document.createElement('div');
    el.className = 'typing-indicator';
    el.id = 'typingIndicator';
    el.innerHTML = '<span></span><span></span><span></span>';
    chatMessages.appendChild(el);
    scrollToBottom();
  }

  function hideTyping() {
    var el = document.getElementById('typingIndicator');
    if (el) el.remove();
  }

  function matchFAQ(message) {
    var lower = normalize(message);
    for (var i = 0; i < FAQ.length; i++) {
      for (var j = 0; j < FAQ[i].keys.length; j++) {
        if (lower.indexOf(FAQ[i].keys[j]) !== -1) return FAQ[i];
      }
    }
    return null;
  }

  function setInputEnabled(enabled) {
    chatInput.disabled = !enabled;
    if (chatSendBtn) chatSendBtn.disabled = !enabled;
  }

  function respondTo(message) {
    setInputEnabled(false);
    showTyping();
    window.setTimeout(function () {
      hideTyping();
      var match = matchFAQ(message);
      if (match) {
        addMessage(match.reply, 'bot', !!match.actions);
      } else {
        addMessage('Essa eu preciso confirmar com a equipe. Posso te conectar com um consultor:', 'bot', true);
      }
      setInputEnabled(true);
      chatInput.focus();
    }, 700 + Math.random() * 500);
  }

  function sendUserMessage(text) {
    text = text.trim();
    if (!text) return;
    addMessage(text, 'user');
    respondTo(text);
  }

  function renderQuickReplies() {
    chatQuickReplies.innerHTML = '';
    QUICK_REPLIES.forEach(function (q) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quick-reply-chip';
      btn.textContent = q.label;
      btn.addEventListener('click', function () { sendUserMessage(q.text); });
      chatQuickReplies.appendChild(btn);
    });
  }

  function openChat() {
    if (typeof window.closeCartPanelIfOpen === 'function') window.closeCartPanelIfOpen();
    chatPanel.classList.add('is-open');
    chatLauncher.classList.add('is-open');
    chatPanel.setAttribute('aria-hidden', 'false');
    chatLauncher.setAttribute('aria-expanded', 'true');

    if (!hasGreeted) {
      hasGreeted = true;
      renderQuickReplies();
      window.setTimeout(function () {
        addMessage('Olá! 👋 Sou o assistente virtual da Shopoffice. Posso tirar dúvidas sobre produtos, prazos e orçamentos, ou te conectar com um consultor. Como posso ajudar?', 'bot');
      }, 400);
    }
    window.setTimeout(function () { chatInput.focus(); }, 350);
  }

  function closeChat() {
    chatPanel.classList.remove('is-open');
    chatLauncher.classList.remove('is-open');
    chatPanel.setAttribute('aria-hidden', 'true');
    chatLauncher.setAttribute('aria-expanded', 'false');
    chatLauncher.focus();
  }
  window.closeChatPanelIfOpen = function () {
    if (chatPanel.classList.contains('is-open')) closeChat();
  };

  chatLauncher.addEventListener('click', openChat);
  if (chatOpenFromSection) chatOpenFromSection.addEventListener('click', openChat);
  chatClose.addEventListener('click', closeChat);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && chatPanel.classList.contains('is-open')) closeChat();
  });

  chatForm.addEventListener('submit', function (e) {
    e.preventDefault();
    sendUserMessage(chatInput.value);
    chatInput.value = '';
  });

  // Delegação para os botões de ação criados dinamicamente dentro das mensagens
  chatMessages.addEventListener('click', function (e) {
    var whatsappBtn = e.target.closest ? e.target.closest('[data-chat-whatsapp]') : null;
    if (whatsappBtn) {
      var link = typeof window.getShopofficeQuoteWhatsAppLink === 'function'
        ? window.getShopofficeQuoteWhatsAppLink()
        : 'https://wa.me/5577900000000?text=' + encodeURIComponent('Quero fazer um orçamento.');
      window.open(link, '_blank', 'noopener');
      return;
    }
    var emailBtn = e.target.closest ? e.target.closest('[data-chat-email]') : null;
    if (emailBtn) {
      var subject = encodeURIComponent('Orçamento Shopoffice - via chat do site');
      var body = encodeURIComponent('Olá! Vim pelo chat do site e gostaria de falar com um consultor.');
      window.location.href = 'mailto:shopofficevca@gmail.com?subject=' + subject + '&body=' + body;
    }
  });
})();

/* =========================================================================
   CARRINHO DE ORÇAMENTO — seleção de múltiplos itens com quantidade
   Não existe preço público (orçamento é personalizado por modelo/acabamento),
   então o carrinho soma ITENS e UNIDADES, não um valor em R$. Se no futuro
   houver uma tabela de preços, dá pra estender buildQuoteMessage() e o
   resumo do carrinho pra calcular e mostrar o total em reais.
   ========================================================================= */
(function () {
  // TODO: substituir pelo número real de WhatsApp da Shopoffice.
  // Formato: 55 + DDD + número, só dígitos (ex: 55779XXXXXXXX). O número
  // atual é um placeholder e NÃO funciona até ser trocado.
  var WHATSAPP_NUMBER = '5577900000000';

  var cartLauncher = document.getElementById('cartLauncher');
  var cartPanel = document.getElementById('cartPanel');
  var cartClose = document.getElementById('cartClose');
  var cartItemsEl = document.getElementById('cartItems');
  var cartBadge = document.getElementById('cartBadge');
  var cartSummary = document.getElementById('cartSummary');
  var cartWhatsappBtn = document.getElementById('cartWhatsappBtn');
  var cartEmailBtn = document.getElementById('cartEmailBtn');
  var whatsappContactLink = document.getElementById('whatsappContactLink');

  if (!cartLauncher || !cartPanel) return;

  var cart = {}; // { productId: { title, qty, image, category } }

  /* ---------- Saudação dinâmica por horário ---------- */
  function getGreeting() {
    var hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  /* ---------- Monta a lista de produtos a partir do próprio HTML (fonte única) ---------- */
  var PRODUCTS = {};
  document.querySelectorAll('.qty-stepper[data-product-id]').forEach(function (stepper) {
    var id = stepper.getAttribute('data-product-id');
    var title = stepper.getAttribute('data-product-title');
    var card = stepper.closest('article');
    var img = card ? card.querySelector('img') : null;
    var badge = card ? card.querySelector('span.rounded-full') : null;
    PRODUCTS[id] = {
      title: title,
      image: img ? img.getAttribute('src') : '',
      category: badge ? badge.textContent.trim() : ''
    };
  });

  /* ---------- Mensagem de orçamento (saudação + itens do carrinho) ---------- */
  function getCartItemsList() {
    return Object.keys(cart).map(function (id) { return cart[id]; }).filter(function (item) { return item.qty > 0; });
  }

  function getCartTotalUnits() {
    return getCartItemsList().reduce(function (sum, item) { return sum + item.qty; }, 0);
  }

  function buildQuoteMessage() {
    var lines = [getGreeting() + ', quero fazer um orçamento.'];
    var items = getCartItemsList();
    if (items.length > 0) {
      lines.push('');
      lines.push('Itens:');
      items.forEach(function (item) {
        lines.push('- ' + item.title + ' (x' + item.qty + ')');
      });
    }
    return lines.join('\n');
  }

  function buildWhatsAppLink() {
    return 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(buildQuoteMessage());
  }

  /* ---------- Sincroniza a UI (badge, contadores nos cards, painel do carrinho) ---------- */
  function syncQtyDisplays() {
    document.querySelectorAll('.qty-stepper[data-product-id]').forEach(function (stepper) {
      var id = stepper.getAttribute('data-product-id');
      var display = stepper.querySelector('[data-qty-value]');
      if (display) display.textContent = String((cart[id] && cart[id].qty) || 0);
    });
  }

  function renderBadge() {
    var totalUnits = getCartTotalUnits();
    if (totalUnits > 0) {
      cartBadge.textContent = String(totalUnits);
      cartBadge.hidden = false;
    } else {
      cartBadge.hidden = true;
    }
  }

  function renderCartPanel() {
    var items = getCartItemsList();
    cartItemsEl.innerHTML = '';

    if (items.length === 0) {
      cartItemsEl.innerHTML = '<p class="cart-empty">Seu orçamento está vazio. Use o + nos produtos do catálogo pra adicionar itens aqui.</p>';
    } else {
      items.forEach(function (item) {
        var row = document.createElement('div');
        row.className = 'cart-item';
        row.innerHTML =
          '<div class="cart-item-thumb"><img src="' + item.image + '" alt="" loading="lazy"></div>' +
          '<div class="cart-item-info">' +
            '<p class="cart-item-title">' + item.title + '</p>' +
            '<p class="cart-item-category">' + item.category + '</p>' +
          '</div>' +
          '<div class="cart-item-controls">' +
            '<button type="button" class="qty-btn" data-cart-decrease="' + item.id + '" aria-label="Diminuir quantidade de ' + item.title + '">\u2212</button>' +
            '<span class="qty-value">' + item.qty + '</span>' +
            '<button type="button" class="qty-btn" data-cart-increase="' + item.id + '" aria-label="Aumentar quantidade de ' + item.title + '">+</button>' +
            '<button type="button" class="cart-item-remove" data-cart-remove="' + item.id + '" aria-label="Remover ' + item.title + '"><i class="fa-solid fa-trash"></i></button>' +
          '</div>';
        cartItemsEl.appendChild(row);
      });
    }

    var totalUnits = getCartTotalUnits();
    if (items.length === 0) {
      cartSummary.textContent = 'Nenhum item selecionado';
    } else {
      cartSummary.textContent = items.length + (items.length === 1 ? ' item selecionado' : ' itens selecionados') + ' \u2022 ' + totalUnits + (totalUnits === 1 ? ' unidade' : ' unidades') + ' no total';
    }

    var hasItems = items.length > 0;
    cartWhatsappBtn.href = buildWhatsAppLink();
    cartWhatsappBtn.classList.toggle('is-disabled', !hasItems);
    cartEmailBtn.disabled = !hasItems;
  }

  function updateAll() {
    syncQtyDisplays();
    renderBadge();
    renderCartPanel();
  }

  /* ---------- Ações do carrinho ---------- */
  function setQuantity(id, qty) {
    if (!PRODUCTS[id]) return;
    qty = Math.max(0, Math.min(99, qty));
    if (qty === 0) {
      delete cart[id];
    } else {
      cart[id] = { id: id, title: PRODUCTS[id].title, image: PRODUCTS[id].image, category: PRODUCTS[id].category, qty: qty };
    }
    updateAll();
  }

  function changeQuantity(id, delta) {
    var current = (cart[id] && cart[id].qty) || 0;
    setQuantity(id, current + delta);
  }

  /* ---------- Abrir / fechar painel do carrinho ---------- */
  function openCart() {
    if (typeof window.closeChatPanelIfOpen === 'function') window.closeChatPanelIfOpen();
    cartPanel.classList.add('is-open');
    cartLauncher.classList.add('is-open');
    cartPanel.setAttribute('aria-hidden', 'false');
    cartLauncher.setAttribute('aria-expanded', 'true');
  }

  function closeCart() {
    cartPanel.classList.remove('is-open');
    cartLauncher.classList.remove('is-open');
    cartPanel.setAttribute('aria-hidden', 'true');
    cartLauncher.setAttribute('aria-expanded', 'false');
  }
  window.closeCartPanelIfOpen = function () {
    if (cartPanel.classList.contains('is-open')) closeCart();
  };

  cartLauncher.addEventListener('click', function () {
    if (cartPanel.classList.contains('is-open')) closeCart(); else openCart();
  });
  cartClose.addEventListener('click', closeCart);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && cartPanel.classList.contains('is-open')) closeCart();
  });

  /* ---------- Steppers nos cards de produto ---------- */
  document.querySelectorAll('.qty-stepper[data-product-id]').forEach(function (stepper) {
    var id = stepper.getAttribute('data-product-id');
    stepper.querySelectorAll('[data-qty-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        changeQuantity(id, btn.getAttribute('data-qty-action') === 'increase' ? 1 : -1);
      });
    });
  });

  /* ---------- Botão "Adicionar ao Orçamento" dentro dos modais de produto ---------- */
  document.querySelectorAll('[data-cart-add]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-cart-add');
      changeQuantity(id, 1);
      var dialog = btn.closest('dialog');
      if (dialog) dialog.close();
      openCart();
    });
  });

  /* ---------- Controles dentro do próprio painel do carrinho (delegação, itens são recriados a cada render) ---------- */
  cartItemsEl.addEventListener('click', function (e) {
    var incBtn = e.target.closest('[data-cart-increase]');
    var decBtn = e.target.closest('[data-cart-decrease]');
    var rmBtn = e.target.closest('[data-cart-remove]');
    if (incBtn) changeQuantity(incBtn.getAttribute('data-cart-increase'), 1);
    if (decBtn) changeQuantity(decBtn.getAttribute('data-cart-decrease'), -1);
    if (rmBtn) setQuantity(rmBtn.getAttribute('data-cart-remove'), 0);
  });

  /* ---------- Pedir orçamento por e-mail (reaproveita o formulário de contato) ---------- */
  cartEmailBtn.addEventListener('click', function () {
    if (getCartItemsList().length === 0) return;
    closeCart();
    var messageField = document.getElementById('message');
    if (messageField) messageField.value = buildQuoteMessage();
    var contactSection = document.getElementById('contact');
    if (contactSection) contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(function () { if (messageField) messageField.focus(); }, 450);
  });

  /* ---------- Link de WhatsApp fixo na lista de contato (sem itens de carrinho) ---------- */
  if (whatsappContactLink) {
    whatsappContactLink.addEventListener('click', function (e) {
      e.preventDefault();
      window.open(buildWhatsAppLink(), '_blank', 'noopener');
    });
  }

  // Exposto pro widget de chat reaproveitar a mesma mensagem/link (saudação + itens do carrinho)
  window.getShopofficeQuoteWhatsAppLink = buildWhatsAppLink;

  updateAll();
})();
