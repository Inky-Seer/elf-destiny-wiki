(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────────────
  var WORKER_URL = 'https://wiki-auth-69.galacticliaison.workers.dev/'; // e.g. https://elf-destiny-suggest.yourname.workers.dev

  // ── DOM refs ──────────────────────────────────────────────────────────────
  var tooltip, modal, modalForm, modalSuccess, modalError, submitBtn;

  // ── Helpers ───────────────────────────────────────────────────────────────
  function pageTitle() {
    return document.title.replace(/\s*[-–]\s*Elf Destiny Wiki\s*$/i, '').trim();
  }

  // ── Tooltip ───────────────────────────────────────────────────────────────
  function buildTooltip() {
    tooltip = document.createElement('div');
    tooltip.id = 'sw-tooltip';
    tooltip.innerHTML = '<button type="button">✏️ Suggest an edit</button>';
    tooltip.style.display = 'none';
    document.body.appendChild(tooltip);

    tooltip.querySelector('button').addEventListener('click', function (e) {
      e.stopPropagation();
      hideTooltip();
      openModal();
    });
  }

  function showTooltip(rect) {
    tooltip.style.display = '';
    var left = rect.left + rect.width / 2;
    var top  = rect.top - tooltip.offsetHeight - 10;
    if (top < 8) top = rect.bottom + 10;
    left = Math.max(8, Math.min(left, window.innerWidth - tooltip.offsetWidth - 8));
    tooltip.style.left = left + 'px';
    tooltip.style.top  = top  + 'px';
  }

  function hideTooltip() {
    if (tooltip) tooltip.style.display = 'none';
  }

  // ── Modal ─────────────────────────────────────────────────────────────────
  function buildModal() {
    modal = document.createElement('div');
    modal.id = 'sw-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'sw-modal-title');
    modal.innerHTML =
      '<div id="sw-modal-dialog">' +
        '<h2 id="sw-modal-title">Suggest an edit</h2>' +
        '<form id="sw-modal-form" novalidate>' +
          '<p class="sw-page-url"></p>' +
          '<label>Selected text</label>' +
          '<blockquote class="sw-selection"></blockquote>' +
          '<label for="sw-suggestion">Your suggestion <span aria-hidden="true">*</span></label>' +
          '<textarea id="sw-suggestion" rows="4" required placeholder="Describe what should change…"></textarea>' +
          '<p class="sw-error" role="alert"></p>' +
          '<div class="sw-actions">' +
            '<button type="submit" id="sw-submit">Submit</button>' +
            '<button type="button" id="sw-cancel">Cancel</button>' +
          '</div>' +
        '</form>' +
        '<div id="sw-modal-success">' +
          '<p>✓ Thanks! Your suggestion has been filed.</p>' +
          '<a id="sw-issue-link" href="#" target="_blank" rel="noopener">View issue on GitHub →</a>' +
          '<div class="sw-actions">' +
            '<button type="button" id="sw-close-success">Close</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    modal.style.display = 'none';
    document.body.appendChild(modal);

    modalForm    = modal.querySelector('#sw-modal-form');
    modalSuccess = modal.querySelector('#sw-modal-success');
    modalError   = modal.querySelector('.sw-error');
    submitBtn    = modal.querySelector('#sw-submit');

    modalSuccess.style.display = 'none';
    modalError.style.display   = 'none';

    modalForm.addEventListener('submit', onSubmit);
    modal.querySelector('#sw-cancel').addEventListener('click', closeModal);
    modal.querySelector('#sw-close-success').addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.style.display !== 'none') closeModal();
    });
  }

  function openModal() {
    var sel = window.getSelection();
    var selectedText = sel ? sel.toString().trim() : '';

    modal.querySelector('.sw-page-url').textContent = window.location.href;
    modal.querySelector('.sw-selection').textContent = selectedText;
    modal.querySelector('#sw-suggestion').value = '';
    modalError.style.display   = 'none';
    modalForm.style.display    = '';
    modalSuccess.style.display = 'none';
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Submit';
    modal.style.display   = '';
    setTimeout(function () { modal.querySelector('#sw-suggestion').focus(); }, 50);
  }

  function closeModal() {
    modal.style.display = 'none';
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  function onSubmit(e) {
    e.preventDefault();
    var suggestion   = modal.querySelector('#sw-suggestion').value.trim();
    var selectedText = modal.querySelector('.sw-selection').textContent.trim();
    if (!suggestion) return;

    submitBtn.disabled    = true;
    submitBtn.textContent = 'Submitting…';
    modalError.style.display = 'none';

    fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageUrl:      window.location.href,
        pageTitle:    pageTitle(),
        selectedText: selectedText,
        suggestion:   suggestion,
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.ok) throw new Error(data.error || 'Unknown error');
        modal.querySelector('#sw-issue-link').href = data.issueUrl;
        modalForm.style.display    = 'none';
        modalSuccess.style.display = '';
      })
      .catch(function () {
        modalError.textContent   = 'Something went wrong — please try again or open an issue directly on GitHub.';
        modalError.style.display = '';
        submitBtn.disabled    = false;
        submitBtn.textContent = 'Submit';
      });
  }

  // ── Selection detection ───────────────────────────────────────────────────
  document.addEventListener('mouseup', function () {
    setTimeout(function () {
      var sel  = window.getSelection();
      var text = sel ? sel.toString().trim() : '';
      if (text.length > 5 && sel.rangeCount > 0) {
        showTooltip(sel.getRangeAt(0).getBoundingClientRect());
      } else {
        hideTooltip();
      }
    }, 50);
  });

  document.addEventListener('mousedown', function (e) {
    if (tooltip && !tooltip.contains(e.target)) hideTooltip();
  });

  window.addEventListener('scroll', hideTooltip, { passive: true });

  // ── Init ──────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { buildTooltip(); buildModal(); });
  } else {
    buildTooltip();
    buildModal();
  }

}());
