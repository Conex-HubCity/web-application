(() => {
  'use strict';
  const header = document.getElementById('siteHeader');
  const progress = document.getElementById('scrollProgress');
  const menuButton = document.getElementById('menuToggle');
  const mobileNav = document.getElementById('mobileNav');
  const langToggle = document.getElementById('langToggle');
  const stepsList = document.getElementById('stepsList');
  const stepsPanel = document.getElementById('stepsPanel');
  const tabButtons = Array.from(document.querySelectorAll('.method-tab'));
  const toast = document.getElementById('toast');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let language = 'fr';
  let currentPath = 'entrepreneur';
  let toastTimeout;

  const steps = {
    entrepreneur: {
      fr: [
        ['Créez votre espace', 'Ouvrez gratuitement votre compte. Votre profil reste privé tant qu’il n’est pas validé.'],
        ['Faites valider le Niveau Rouge', 'Soumettez votre certificat WoeAcademy Niveau Rouge, obtenu après le Niveau Noir.'],
        ['Partagez votre projet', 'Déposez votre pitch deck. CNX l’étudie avant toute publication aux mentors.'],
        ['Rencontrez un mentor', 'Après validation par CNX, une rencontre est organisée. Le mentorat démarre uniquement avec l’accord de chacun.'],
        ['Progressez ensemble', 'Fixez des objectifs et réalisez des bilans mensuels pour suivre la relation.']
      ],
      en: [
        ['Create your space', 'Open your free account. Your profile stays private until verification is completed.'],
        ['Verify your Red Level', 'Submit your WoeAcademy Red Level certificate, earned after Black Level.'],
        ['Present your project', 'Submit your pitch deck. CNX reviews it before any publication to mentors.'],
        ['Meet a mentor', 'CNX organises an introduction after approval. Mentorship starts only when both people agree.'],
        ['Grow together', 'Set clear goals and share monthly progress reports to support your relationship.']
      ]
    },
    mentor: {
      fr: [
        ['Présentez votre expérience', 'Créez votre profil en précisant votre parcours, vos expertises et votre disponibilité.'],
        ['Faites vérifier votre profil', 'CNX contrôle votre identité et vos références professionnelles, puis active votre adhésion après règlement.'],
        ['Découvrez les projets validés', 'Explorez le catalogue selon vos domaines d’intérêt. Les documents sensibles restent protégés.'],
        ['Demandez une rencontre', 'CNX examine la compatibilité et organise un premier échange avec le porteur du projet.'],
        ['Transmettez, à votre rythme', 'Après consentement mutuel, accompagnez le projet et partagez des bilans mensuels.']
      ],
      en: [
        ['Share your experience', 'Create your professional profile and tell us about your background, expertise and availability.'],
        ['Verify your profile', 'CNX checks your identity and professional credentials, then activates membership after payment.'],
        ['Discover verified projects', 'Explore the catalogue using your areas of interest. Sensitive documents stay protected.'],
        ['Request an introduction', 'CNX reviews compatibility and organises an initial conversation with the founder.'],
        ['Mentor at your own pace', 'With mutual consent, support the project and share monthly progress reports.']
      ]
    }
  };

  function renderSteps() {
    stepsList.replaceChildren();
    steps[currentPath][language].forEach(([title, description], index) => {
      const item = document.createElement('li');
      item.style.animationDelay = `${index * 50}ms`;
      const number = document.createElement('span');
      number.className = 'step-no';
      number.textContent = String(index + 1).padStart(2, '0');
      const text = document.createElement('div');
      const heading = document.createElement('h3');
      heading.textContent = title;
      const paragraph = document.createElement('p');
      paragraph.textContent = description;
      text.append(heading, paragraph);
      item.append(number, text);
      stepsList.append(item);
    });
  }

  function selectPath(path, returnFocus = false) {
    if (!steps[path]) return;
    currentPath = path;
    tabButtons.forEach(button => {
      const isSelected = button.dataset.tab === path;
      button.classList.toggle('active', isSelected);
      button.setAttribute('aria-selected', String(isSelected));
      button.tabIndex = isSelected ? 0 : -1;
      if (isSelected) {
        stepsPanel.setAttribute('aria-labelledby', button.id);
        if (returnFocus) button.focus();
      }
    });
    renderSteps();
  }

  tabButtons.forEach((button, index) => {
    button.addEventListener('click', () => selectPath(button.dataset.tab));
    button.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft' || event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        let newIndex = index;
        if (event.key === 'Home') newIndex = 0;
        if (event.key === 'End') newIndex = tabButtons.length - 1;
        if (event.key === 'ArrowRight') newIndex = (index + 1) % tabButtons.length;
        if (event.key === 'ArrowLeft') newIndex = (index - 1 + tabButtons.length) % tabButtons.length;
        selectPath(tabButtons[newIndex].dataset.tab, true);
      }
    });
  });
  document.querySelectorAll('[data-path]').forEach(link => {
    link.addEventListener('click', () => selectPath(link.dataset.path));
  });

  function setLanguage(lang) {
    language = lang === 'en' ? 'en' : 'fr';
    document.documentElement.lang = language;
    document.querySelectorAll('[data-fr][data-en]').forEach(element => {
      element.textContent = element.getAttribute('data-' + language);
    });
    langToggle.textContent = language === 'fr' ? 'FR  /  EN' : 'EN  /  FR';
    langToggle.setAttribute('aria-label', language === 'fr' ? 'Switch website to English' : 'Passer le site en français');
    document.title = language === 'fr' ? 'CNX / CONEX — Le lien nous élève' : 'CNX / CONEX — Connections lift us higher';
    menuButton.setAttribute('aria-label', language === 'fr' ? (mobileNav.hidden ? 'Ouvrir le menu' : 'Fermer le menu') : (mobileNav.hidden ? 'Open menu' : 'Close menu'));
    renderSteps();
    try { localStorage.setItem('cnx-language', language); } catch (_e) { /* private browsing */ }
  }
  langToggle.addEventListener('click', () => setLanguage(language === 'fr' ? 'en' : 'fr'));

  function setMenu(open) {
    mobileNav.hidden = !open;
    header.classList.toggle('menu-open', open);
    document.body.classList.toggle('menu-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    const use = menuButton.querySelector('use');
    if (use) use.setAttribute('href', open ? '#icon-x' : '#icon-menu');
    menuButton.setAttribute('aria-label', language === 'fr' ? (open ? 'Fermer le menu' : 'Ouvrir le menu') : (open ? 'Close menu' : 'Open menu'));
  }
  menuButton.addEventListener('click', () => setMenu(mobileNav.hidden));
  mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !mobileNav.hidden) {
      setMenu(false);
      menuButton.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!mobileNav.hidden && !header.contains(event.target)) setMenu(false);
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 990 && !mobileNav.hidden) setMenu(false);
  }, { passive: true });

  let scrollQueued = false;
  function updateScroll() {
    header.classList.toggle('scrolled', window.scrollY > 42);
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (scrollable > 0 ? Math.min(100, window.scrollY / scrollable * 100) : 0) + '%';
    scrollQueued = false;
  }
  window.addEventListener('scroll', () => {
    if (!scrollQueued) {
      scrollQueued = true;
      window.requestAnimationFrame(updateScroll);
    }
  }, { passive: true });
  updateScroll();

  if ('IntersectionObserver' in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: .07, rootMargin: '0px 0px -30px 0px' });
    document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));
  } else {
    document.querySelectorAll('.reveal').forEach(element => element.classList.add('is-visible'));
  }

  document.querySelectorAll('.faq-items details').forEach(details => {
    details.addEventListener('toggle', () => {
      if (details.open) {
        document.querySelectorAll('.faq-items details').forEach(other => {
          if (other !== details && other.open) other.open = false;
        });
      }
    });
  });

  function notify(message) {
    clearTimeout(toastTimeout);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 3900);
  }
  const shareButton = document.getElementById('shareButton');
  shareButton.addEventListener('click', async () => {
    if (location.protocol === 'file:') {
      notify(language === 'fr' ? 'Pour partager un lien, publiez d’abord cette page en ligne.' : 'Publish this page online before sharing a link.');
      return;
    }
    const data = {
      title: 'CNX / CONEX',
      text: language === 'fr' ? 'Découvrez CNX, un réseau panafricain de confiance, de transmission et de mentorat.' : 'Discover CNX, a Pan-African network for trust and mentorship.',
      url: location.href.split('#')[0]
    };
    if (navigator.share) {
      try { await navigator.share(data); } catch (error) {
        if (error.name !== 'AbortError') notify(language === 'fr' ? 'Impossible de partager depuis ce navigateur.' : 'Sharing is unavailable in this browser.');
      }
    } else if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(data.url);
        notify(language === 'fr' ? 'Lien du projet copié !' : 'Project link copied!');
      } catch (_error) {
        notify(language === 'fr' ? 'La copie automatique est indisponible.' : 'Automatic copying is unavailable.');
      }
    } else {
      notify(language === 'fr' ? 'Copiez le lien depuis la barre d’adresse.' : 'Copy the link from your browser’s address bar.');
    }
  });

  document.getElementById('year').textContent = new Date().getFullYear();
  let saved = 'fr';
  try { saved = localStorage.getItem('cnx-language') || 'fr'; } catch (_e) { /* not available */ }
  setLanguage(saved);
  selectPath('entrepreneur');

  // Conference prototype: accessible interactive tabs. This is simulated UI, not a backend.
  const previewTabs = [...document.querySelectorAll('.platform-tab')];
  function selectPreviewTab(tab, focus = false) {
    previewTabs.forEach(t => {
      const active = t === tab;
      t.setAttribute('aria-selected', String(active));
      t.tabIndex = active ? 0 : -1;
      const panel = document.getElementById('screen-' + t.dataset.screen);
      panel.hidden = !active;
    });
    if (focus) tab.focus();
  }
  previewTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectPreviewTab(tab));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? previewTabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + previewTabs.length) % previewTabs.length;
      selectPreviewTab(previewTabs[next], true);
    });
  });
  const filters = [...document.querySelectorAll('.platform-section .filter-btn')];
  filters.forEach(button => button.addEventListener('click', () => {
    filters.forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    document.querySelectorAll('.platform-section .mentor-project').forEach(project => {
      project.hidden = button.dataset.filter !== 'all' && project.dataset.sector !== button.dataset.filter;
    });
  }));
  // Public landing page: prepare a bilingual text to copy. Nothing is uploaded or sent.
  const dialog = document.getElementById('contactDialog');
  const contactForm = document.getElementById('contactForm');
  const prepared = document.getElementById('preparedMessage');
  const preparedText = document.getElementById('preparedText');
  const copyStatus = document.getElementById('copyStatus');
  function showContact() {
    if (!mobileNav.hidden) setMenu(false);
    contactForm.hidden = false;
    prepared.hidden = true;
    contactForm.reset();
    copyStatus.textContent = '';
    if (typeof dialog.showModal === 'function') {
      dialog.showModal(); document.body.classList.add('modal-open');
    }
  }
  document.querySelectorAll('[data-contact]').forEach(el => el.addEventListener('click', showContact));
  function closeContact() { if (dialog.open) dialog.close(); document.body.classList.remove('modal-open'); }
  document.getElementById('closeDialog').addEventListener('click', closeContact);
  dialog.addEventListener('close', () => document.body.classList.remove('modal-open'));
  dialog.addEventListener('click', event => { if (event.target === dialog) closeContact(); });
  contactForm.addEventListener('submit', event => {
    event.preventDefault();
    const vals = new FormData(contactForm);
    const fr = language === 'fr';
    preparedText.value = [
      fr ? 'Demande de présentation CNX' : 'CNX presentation request',
      '',
      (fr ? 'Nom : ' : 'Name: ') + String(vals.get('name') || '').trim(),
      (fr ? 'Email : ' : 'Email: ') + String(vals.get('email') || '').trim(),
      (fr ? 'Profil : ' : 'Role: ') + String(vals.get('role') || ''),
      '', fr ? 'Message :' : 'Message:', String(vals.get('message') || '').trim()
    ].join('\n');
    contactForm.hidden = true;
    prepared.hidden = false;
    copyStatus.textContent = '';
  });
  document.getElementById('copyPrepared').addEventListener('click', async () => {
    let success = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(preparedText.value);
        success = true;
      }
    } catch (_error) { /* clipboard may be denied */ }
    if (!success) {
      preparedText.focus(); preparedText.select();
      try { success = document.execCommand('copy'); } catch (_error) { /* copy manually */ }
    }
    copyStatus.textContent = success ? (language === 'fr' ? 'Message copié !' : 'Message copied!') : (language === 'fr' ? 'Sélectionnez et copiez le texte.' : 'Select and copy the text.');
  });
  // Include dynamic placeholders in the existing bilingual toggle without a second language state.
  const originalSetLanguage = setLanguage;
  setLanguage = function(lang) {
    originalSetLanguage(lang);
    document.querySelectorAll('[data-placeholder-fr][data-placeholder-en]').forEach(el => {
      el.placeholder = el.getAttribute('data-placeholder-' + language);
    });
    dialog.setAttribute('aria-label', language === 'fr' ? 'Préparer une demande de présentation' : 'Prepare a presentation request');
    document.getElementById('closeDialog').setAttribute('aria-label', language === 'fr' ? 'Fermer' : 'Close');
  };
  setLanguage(language);

})();


// CNX V4 — brève ouverture de marque, non bloquante au-delà de 1,4 s.
(() => {
  const opening = document.getElementById('cnxLoading');
  if (!opening) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finish = () => {
    opening.classList.add('is-hidden');
    window.setTimeout(() => opening.remove(), 550);
  };
  if (reduced) finish();
  else window.setTimeout(finish, 1350);
})();
