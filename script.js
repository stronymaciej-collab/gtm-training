/* =========================================================
   ŚWIETLIK INTERNET — script.js
   Komentarze po polsku - to jest Twój materiał do nauki JS +
   dataLayer. Każda sekcja robi jedną, prostą rzecz.
   ========================================================= */

// dataLayer musi istnieć zanim GTM się załaduje - inicjalizujemy
// go na wszelki wypadek (GTM snippet w <head> i tak to robi,
// ale to standardowa, bezpieczna praktyka).
window.dataLayer = window.dataLayer || [];

// Mała pomocnicza funkcja - żeby nie pisać za każdym razem
// "window.dataLayer.push(...)", tylko po prostu pushEvent(...)
// To jest odpowiednik np. helpera w Pythonie - jedna funkcja,
// używana w wielu miejscach.
function pushEvent(eventName, params) {
  var payload = Object.assign({ event: eventName }, params || {});
  window.dataLayer.push(payload);
  // console.log zostawiony celowo - podglądaj w konsoli przeglądarki
  // co dokładnie wysyłasz, zanim zaczniesz to łapać w GTM
  console.log('[dataLayer.push]', payload);
}


/* =========================================================
   1) CONSENT MODE v2 — baner zgód
   ========================================================= */
(function consentBanner() {
  var banner = document.getElementById('consent-banner');
  if (!banner) return; // nie każda podstrona musi mieć baner, ale u nas ma

  var STORAGE_KEY = 'swietlik_consent';
  var saved = localStorage.getItem(STORAGE_KEY);

  function applyConsent(state) {
    // gtag('consent', 'update', ...) to standardowy sposób sterowania
    // Consent Mode v2. Jeśli nie masz jeszcze gtag na stronie,
    // ta funkcja i tak bezpiecznie nic nie zrobi (sprawdzamy typeof).
    if (typeof gtag === 'function') {
      gtag('consent', 'update', {
        ad_storage: state.marketing ? 'granted' : 'denied',
        analytics_storage: state.analytics ? 'granted' : 'denied',
        ad_user_data: state.marketing ? 'granted' : 'denied',
        ad_personalization: state.marketing ? 'granted' : 'denied'
      });
    }
    pushEvent('consent_update', {
      consent_analytics: state.analytics,
      consent_marketing: state.marketing
    });
  }

  if (saved) {
    // Użytkownik już wybrał wcześniej - nie pokazujemy banera ponownie
    applyConsent(JSON.parse(saved));
  } else {
    banner.classList.add('show');
  }

  function choose(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    applyConsent(state);
    banner.classList.remove('show');
  }

  document.getElementById('consent-accept').addEventListener('click', function () {
    choose({ analytics: true, marketing: true });
  });
  document.getElementById('consent-reject').addEventListener('click', function () {
    choose({ analytics: false, marketing: false });
  });
  var customizeBtn = document.getElementById('consent-customize');
  if (customizeBtn) {
    customizeBtn.addEventListener('click', function () {
      // Uproszczona wersja "dostosuj" - w realnym projekcie byłby tu
      // panel z checkboxami. Tu dla treningu: tylko analytics, bez marketingu.
      choose({ analytics: true, marketing: false });
    });
  }
})();


/* =========================================================
   2) FORMULARZ KONTAKTOWY (kontakt.html)
   ========================================================= */
(function contactForm() {
  var form = document.getElementById('contact-form');
  if (!form) return;

  var msg = document.getElementById('contact-msg');
  var startedTracked = false;

  // "form_start" - event własny (nie ma go domyślnie w GTM),
  // odpalamy go raz, przy pierwszym kliknięciu w dowolne pole formularza.
  form.addEventListener('focusin', function () {
    if (startedTracked) return;
    startedTracked = true;
    pushEvent('form_start', { form_name: 'kontakt' });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault(); // blokujemy prawdziwe wysłanie - to strona treningowa

    var email = form.querySelector('#c-email').value;
    var message = form.querySelector('#c-message').value;

    // Bardzo prosta "walidacja" - żeby mieć też ścieżkę error
    if (!email.includes('@') || message.trim().length < 5) {
      pushEvent('form_submit_error', {
        form_name: 'kontakt',
        error_reason: 'validation_failed'
      });
      msg.textContent = 'Sprawdź poprawność adresu e-mail i treści wiadomości.';
      msg.className = 'form-msg show error';
      return;
    }

    pushEvent('form_submit_success', { form_name: 'kontakt' });
    msg.textContent = 'Dziękujemy! Odezwiemy się w ciągu 24h.';
    msg.className = 'form-msg show success';
    form.reset();
    startedTracked = false;
  });
})();


/* =========================================================
   3) FORMULARZ ZGŁOSZENIA AWARII (awaria.html)
   ========================================================= */
(function outageForm() {
  var form = document.getElementById('outage-form');
  if (!form) return;

  var msg = document.getElementById('outage-msg');

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var priority = form.querySelector('#o-priority').value;
    var address = form.querySelector('#o-address').value;

    if (!address.trim()) {
      pushEvent('form_submit_error', { form_name: 'zgloszenie_awarii', error_reason: 'missing_address' });
      msg.textContent = 'Podaj adres, żebyśmy mogli zlokalizować awarię.';
      msg.className = 'form-msg show error';
      return;
    }

    // Przykład eventu z dodatkowym parametrem (priority) -
    // dobre ćwiczenie pod custom dimension w GA4.
    pushEvent('form_submit_success', {
      form_name: 'zgloszenie_awarii',
      report_priority: priority
    });
    msg.textContent = 'Zgłoszenie przyjęte. Numer zgłoszenia: SW-' + Math.floor(1000 + Math.random() * 9000);
    msg.className = 'form-msg show success';
    form.reset();
  });
})();


/* =========================================================
   4) WYBÓR PAKIETU (oferta.html) — custom event z parametrami
   ========================================================= */
(function packageButtons() {
  var buttons = document.querySelectorAll('[data-package]');
  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      pushEvent('select_package', {
        package_name: btn.getAttribute('data-package'),
        package_price_pln: Number(btn.getAttribute('data-price'))
      });
      alert('Wybrano pakiet: ' + btn.getAttribute('data-package') + ' (to tylko trening - nic nie zostało zamówione)');
    });
  });
})();


/* =========================================================
   5) SPRAWDŹ DOSTĘPNOŚĆ (index.html) — mini "kalkulator"
   ========================================================= */
(function availabilityCheck() {
  var form = document.getElementById('availability-form');
  if (!form) return;
  var result = document.getElementById('availability-result');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var input = form.querySelector('input').value.trim();
    if (!input) return;

    // Fake logika: parzysta długość kodu = "dostępny", nieparzysta = "wkrótce"
    var available = input.replace(/\s/g, '').length % 2 === 0;

    pushEvent('check_availability', {
      availability_result: available ? 'available' : 'unavailable'
    });

    result.textContent = available
      ? '✓ Światłowód jest już dostępny pod tym adresem!'
      : '⏳ Jeszcze nas tam nie ma, ale dopisz się do listy oczekujących.';
    result.className = 'availability-result show' + (available ? ' ok' : '');
  });
})();


/* =========================================================
   6) FAQ — accordion (proste click + toggle klasy)
   ========================================================= */
(function faqAccordion() {
  var items = document.querySelectorAll('.faq-item');
  items.forEach(function (item) {
    var q = item.querySelector('.faq-q');
    q.addEventListener('click', function () {
      item.classList.toggle('open');
    });
  });
})();


/* =========================================================
   7) LICZNIK PRĘDKOŚCI W HERO — czysto wizualne, bez trackingu
   ========================================================= */
(function speedCounter() {
  var el = document.getElementById('speed-value');
  if (!el) return;
  var target = 940;
  var current = 0;
  var step = Math.ceil(target / 40);
  var timer = setInterval(function () {
    current += step;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    el.textContent = current;
  }, 30);
})();
