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
        '<a class="msg-action-btn" href="tel:7730178880"><i class="fa-solid fa-phone"></i>Ligar agora</a>' +
        '<button type="button" class="msg-action-btn" data-chat-email><i class="fa-solid fa-envelope"></i>Enviar e-mail</button>';
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

  // Delegação para os botões "Enviar e-mail" criados dinamicamente dentro das mensagens
  chatMessages.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-chat-email]') : null;
    if (!btn) return;
    var subject = encodeURIComponent('Orçamento Shopoffice - via chat do site');
    var body = encodeURIComponent('Olá! Vim pelo chat do site e gostaria de falar com um consultor.');
    window.location.href = 'mailto:shopofficevca@gmail.com?subject=' + subject + '&body=' + body;
  });
})();
