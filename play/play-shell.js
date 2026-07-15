/* ============================================================================
   AutoTrimps play-shell
   ----------------------------------------------------------------------------
   Layers the "hosted play page" experience onto the forked Trimps game WITHOUT
   modifying game code. Three responsibilities:

     1. ONE combined first-load dialog (shown only when this origin has no save)
        that replaces BOTH the game's native "Welcome" popup and AutoTrimps' own
        "Script Update Notice" changelog. It explains what the site is, offers a
        save import, and shows the versions. No more three overlapping boxes.

     2. Save import reuses the game's OWN native dialog — tooltip('Import', …)
        builds a #importBox textarea whose confirm button runs
        `cancelTooltip(); load(true);` (updates.js) — so we inherit the exact,
        tested import path instead of reinventing it.

     3. The persistent disclosure lives on the game's bottom-right version button
        (repurposed from "What's New"): it shows the versions and opens a sources
        popover (GPLv3 attribution + a link to the real trimps.github.io). The old
        bottom-left badge was removed because it overlapped the Export button.

   Saves are localStorage-keyed per ORIGIN, so a player's progress on
   trimps.github.io does not carry here — hence the import prompt.

   Loaded via a plain <script> after main.js in index.html, so all game globals
   (load, tooltip, cancelTooltip, game, ATversion) exist by the time this runs.
   ============================================================================ */
(function () {
  'use strict';

  var OFFICIAL_GAME = 'https://trimps.github.io/';
  var TRIMPS_UPSTREAM = 'https://github.com/Trimps/Trimps.github.io';
  var TRIMPS_FORK = 'https://github.com/MattAltermatt/TrimpsAT';
  var AUTOTRIMPS_SRC = 'https://github.com/MattAltermatt/AutoTrimps';

  // -- versions ---------------------------------------------------------------
  function atVersion() {
    // ATversion is a global published by the AutoTrimps bundle at runtime.
    var v = globalThis.ATversion;
    return v ? String(v) : '';
  }
  function trimpsVersion() {
    var el = document.getElementById('versionNumber');
    if (el && el.textContent.trim()) return el.textContent.trim();
    try { return game.global.stringVersion || ''; } catch (e) { return ''; }
  }
  // "AutoTrimps v6.0.0.104 · Trimps 5.10.1" (drops whichever half is unavailable).
  function versionLine() {
    var at = atVersion(), tr = trimpsVersion(), parts = [];
    if (at) parts.push('AutoTrimps ' + at);
    if (tr) parts.push('Trimps ' + tr);
    return parts.join(' · ');
  }

  // -- suppress the two native first-load popups ------------------------------
  function suppressNativePopups() {
    // The game's "Welcome" popup was already opened synchronously by load() at
    // startup (no save). Dismiss it — our combined dialog replaces it. This also
    // clears game.global.lockTooltip, which Welcome sets and which gates every
    // other tooltip in the game (updates.js:43).
    if (typeof cancelTooltip === 'function') cancelTooltip();

    // AutoTrimps calls the game's global tooltip() ~4s later to show its changelog
    // ("Script Update Notice"). Wrap tooltip to swallow just that one call; every
    // other tooltip (hovers, the native Import dialog, etc.) passes straight through.
    // AT references tooltip as a free global, so wrapping window.tooltip intercepts it.
    if (typeof window.tooltip === 'function' && !window.tooltip.__atplayWrapped) {
      var orig = window.tooltip;
      window.tooltip = function (what) {
        var title = arguments[5];
        if (what === 'confirm' && typeof title === 'string' &&
            title.indexOf('Script Update Notice') !== -1) {
          return; // swallow AutoTrimps' changelog history on the play page
        }
        var r = orig.apply(this, arguments);
        // Whenever the native Import dialog opens (from our modal OR the game's own
        // bottom-bar Import button), add a "Load from file" button to it.
        if (what === 'Import') { try { injectLoadFileButton(); } catch (e) {} }
        return r;
      };
      window.tooltip.__atplayWrapped = true;
    }
  }

  // Add a "Load from file" button to the game's native Import dialog (built by
  // tooltip('Import') in updates.js), alongside its Import/Cancel buttons, so a
  // player can load a save file instead of pasting the exported string.
  function injectLoadFileButton() {
    var confirmBtn = document.getElementById('confirmTooltipBtn');
    if (!confirmBtn || document.getElementById('atplay-loadfile')) return;

    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.trimps,text/plain';
    input.style.display = 'none';

    var btn = document.createElement('div');
    btn.id = 'atplay-loadfile';
    btn.className = confirmBtn.className;   // match the native button styling
    btn.setAttribute('role', 'button');
    btn.textContent = 'Load from file';

    btn.addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () {
      var f = input.files && input.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        var box = document.getElementById('importBox');
        if (box) box.value = String(reader.result || '');
        // Same path the native Import button uses: cancelTooltip() then load(true),
        // which reads #importBox.
        if (typeof cancelTooltip === 'function') cancelTooltip();
        if (typeof load === 'function') load(true);
      };
      reader.readAsText(f);
    });

    confirmBtn.parentNode.insertBefore(btn, confirmBtn.nextSibling);
    confirmBtn.parentNode.appendChild(input);
  }

  // Force the browser tab to read "TrimpsAT". AutoTrimps' setTitle() rewrites
  // document.title on each zone change (utils.ts, gated on aWholeNewWorld which is
  // only true on a zone change) — a MutationObserver on <title> re-asserts ours.
  // No per-tick churn because setTitle only fires on zone-ups.
  var STATIC_TITLE = 'TrimpsAT';
  function setStaticTitle() {
    var titleEl = document.querySelector('title');
    if (!titleEl) { titleEl = document.head.appendChild(document.createElement('title')); }
    var force = function () { if (document.title !== STATIC_TITLE) document.title = STATIC_TITLE; };
    force();
    try {
      new MutationObserver(force).observe(titleEl, { childList: true, characterData: true, subtree: true });
    } catch (e) {}
  }

  // -- sources popover (opened from the repurposed version button) ------------
  function buildSourcesPopover(vline) {
    var panel = document.createElement('div');
    panel.id = 'atplay-attrib';
    panel.style.display = 'none';
    panel.innerHTML =
      '<h4>Unofficial AutoTrimps build</h4>' +
      '<p>A rehosted, automated copy of <b>Trimps</b> — not the official game and ' +
      'not affiliated with its author.</p>' +
      (vline ? '<p class="atplay-ver">' + vline + '</p>' : '') +
      '<p><b>Trimps</b> © 2025 Zach Hood, GPLv3.<br>' +
      '→ <a href="' + OFFICIAL_GAME + '" target="_blank" rel="noopener">Official game</a> · ' +
      '<a href="' + TRIMPS_UPSTREAM + '" target="_blank" rel="noopener">upstream source</a> · ' +
      '<a href="' + TRIMPS_FORK + '" target="_blank" rel="noopener">this fork</a></p>' +
      '<p><b>AutoTrimps</b> automation, GPLv3.<br>' +
      '→ <a href="' + AUTOTRIMPS_SRC + '" target="_blank" rel="noopener">AutoTrimps source</a></p>' +
      '<span class="atplay-close">Close</span>';
    panel.querySelector('.atplay-close').addEventListener('click', function () {
      panel.style.display = 'none';
    });
    document.body.appendChild(panel);
    return panel;
  }

  // Repurpose the game's bottom-right "V x | What's New" button (index.html:1029)
  // into our disclosure: show the versions, and open the sources popover on click
  // instead of the fork's changelog. Done here (not in index.html) to keep the
  // upstream diff minimal.
  function repurposeVersionButton(panel) {
    var span = document.getElementById('versionNumber');
    var btn = span ? span.closest('td') : null;
    if (!btn) return;
    var tr = span.textContent.trim();   // game version, e.g. "5.10.1"
    var at = atVersion();
    btn.onclick = function () {
      panel.style.display = (panel.style.display === 'none') ? 'block' : 'none';
    };
    btn.title = 'Unofficial AutoTrimps build — attribution & sources';
    btn.classList.add('atplay-verbtn');
    // IMPORTANT: keep a #versionNumber element in the DOM. AutoTrimps' setTitle()
    // reads getElementById('versionNumber').innerHTML on every zone change
    // (utils.ts); destroying the span makes newZone() throw and disables AT. We
    // rebuild the label around a preserved span carrying the game version.
    btn.innerHTML = '⚠ AutoTrimps ' + (at || '') +
      ' · Trimps <span id="versionNumber">' + tr + '</span> · sources';
  }

  // -- combined first-load dialog ---------------------------------------------
  function hasExistingSave() {
    try {
      return localStorage.getItem('trimpSave1') != null;
    } catch (e) {
      // localStorage blocked — the game itself warns about this; don't nag on top.
      return true;
    }
  }

  function closeModal() {
    var backdrop = document.getElementById('atplay-modal-backdrop');
    if (backdrop) backdrop.remove();
    if (typeof cancelTooltip === 'function') cancelTooltip();
  }

  function openNativeImport() {
    closeModal();
    if (typeof tooltip === 'function') tooltip('Import', null, 'update');
  }

  function buildCombinedDialog(vline) {
    var backdrop = document.createElement('div');
    backdrop.id = 'atplay-modal-backdrop';

    var modal = document.createElement('div');
    modal.id = 'atplay-modal';
    modal.innerHTML =
      '<h2>Trimps + AutoTrimps</h2>' +
      '<p>This is a Trimps clone with ' +
        '<a href="' + AUTOTRIMPS_SRC + '" target="_blank" rel="noopener">AutoTrimps</a> ' +
        'automation already built in — it plays the game for you. An unofficial rehost, ' +
        'not affiliated with the ' +
        '<a href="' + OFFICIAL_GAME + '" target="_blank" rel="noopener">official game</a>.</p>' +
      '<p>Your save lives only in this browser and is <b>separate from the official game</b>. ' +
        'Back it up any time with <b>Export</b>.</p>' +
      '<div class="atplay-note">New here? Import your save from the official game to continue ' +
        'where you left off — or just start fresh.</div>' +
      '<div class="atplay-btns">' +
        '<button class="atplay-primary" id="atplay-import">Import Trimps save</button>' +
        '<button class="atplay-secondary" id="atplay-fresh">Start fresh</button>' +
      '</div>' +
      (vline ? '<div class="atplay-ver">' + vline + '</div>' : '');

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    document.getElementById('atplay-import').addEventListener('click', openNativeImport);
    document.getElementById('atplay-fresh').addEventListener('click', closeModal);
  }

  // -- boot -------------------------------------------------------------------
  function init() {
    var vline = versionLine();          // read versions BEFORE repurposing the button
    setStaticTitle();
    suppressNativePopups();
    var panel = buildSourcesPopover(vline);
    repurposeVersionButton(panel);
    if (!hasExistingSave()) buildCombinedDialog(vline);
  }

  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }
})();
