(() => {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.primary-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open navigation');
    }));
  }

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // GA4 custom-event helper. The site remains usable if analytics is blocked.
  const track = (eventName, params = {}) => {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }
  };

  // Track navigation to the contact section from prominent calls to action.
  document.querySelectorAll('a[href="#contact"]').forEach(link => {
    link.addEventListener('click', () => {
      const text = (link.textContent || '').trim().toLowerCase();
      const source = text.includes("let's connect") ? 'hero'
        : text.includes('start a conversation') ? 'leadership'
        : text.includes('discuss') || text.includes('explore the problem') || text.includes('product decisions') ? 'case_study'
        : 'navigation_or_other';
      track('hero_contact_click', { link_text: (link.textContent || '').trim(), link_location: source });
    });
  });

  // Track actual contact actions (not whether a message was ultimately sent).
  document.querySelectorAll('#contact a.contact-link').forEach(link => {
    link.addEventListener('click', () => {
      const href = link.getAttribute('href') || '';
      if (href.startsWith('mailto:')) {
        track('contact_email_click', { link_url: href, link_text: 'Email' });
      } else if (href.includes('linkedin.com')) {
        track('contact_linkedin_click', { link_url: href, link_text: 'LinkedIn' });
      }
    });
  });

  // Track case-study links and distinguish the specific card/link text.
  document.querySelectorAll('#case-studies a.text-link').forEach(link => {
    link.addEventListener('click', () => {
      const card = link.closest('.case-card');
      const heading = card ? card.querySelector('h3') : null;
      track('case_study_click', {
        case_study_title: heading ? heading.textContent.trim() : 'unknown',
        link_text: (link.textContent || '').trim()
      });
    });
  });

  // Record a single section-view event per page load when Contact becomes visible.
  const contactSection = document.getElementById('contact');
  if (contactSection && 'IntersectionObserver' in window) {
    let contactViewed = false;
    const contactObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !contactViewed) {
          contactViewed = true;
          track('contact_section_view', { section_id: 'contact' });
          contactObserver.disconnect();
        }
      });
    }, { threshold: 0.25 });
    contactObserver.observe(contactSection);
  }

  // Existing active navigation state behaviour.
  const sections = [...document.querySelectorAll('main section[id]')];
  const links = [...document.querySelectorAll('.nav-link')];
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          links.forEach(link => link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id));
        }
      });
    }, { rootMargin: '-35% 0px -55% 0px' });
    sections.forEach(section => observer.observe(section));
  }
})();