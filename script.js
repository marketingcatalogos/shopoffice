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
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog) dialog.close();
    });
  });

  /* ---------- Botões "Orçamento" dos produtos ---------- */
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

  /* ---------- Formulário de contato ---------- */
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
