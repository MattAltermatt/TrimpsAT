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
  // This fork's OWN release version — independent of Trimps' in-game stringVersion
  // (which stays upstream's and drives save compatibility, so we never bump it here).
  // Bump on each TrimpsAT release and add a CHANGELOG.md entry. Surfaced in the
  // disclosure popover + first-load dialog via versionLine().
  var TRIMPS_AT_VERSION = 'v0.1.0';

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
    var at = atVersion(), tr = trimpsVersion(), parts = ['TrimpsAT ' + TRIMPS_AT_VERSION];
    if (at) parts.push('AutoTrimps ' + at);
    if (tr) parts.push('Trimps ' + tr);
    return parts.join(' · ');
  }

  // -- automation load detection (issue #2) -----------------------------------
  // The AutoTrimps bundle is an external <script> (index.html) with no error
  // handling; if it 404s / is renamed / errors, the page silently degrades to
  // plain manual Trimps. Poll globalThis.ATversion — this catches BOTH a bundle
  // that never loads AND one that loads but never publishes its version (an
  // onerror handler would miss the latter, and would need an index.html edit). In
  // the normal case ATversion is already set by the time init() runs, so cb fires
  // immediately with no wait; the grace window is only ever spent on real failure.
  var AT_WAIT_MS = 8000;   // AT does deferred init a few seconds post-load; clear it.
  var AT_POLL_MS = 200;
  function whenAutomationResolved(cb) {
    if (atVersion()) { cb(true); return; }
    var waited = 0;
    var t = setInterval(function () {
      if (atVersion()) { clearInterval(t); cb(true); }
      else if ((waited += AT_POLL_MS) >= AT_WAIT_MS) { clearInterval(t); cb(false); }
    }, AT_POLL_MS);
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
        // If the Import dialog DOM was torn down while the OS file picker was
        // open (e.g. a once-per-portal milestone popup rewrote #tipText), the
        // textarea is gone and load(true) would throw dereferencing it. Bail
        // cleanly rather than let the import silently die on an uncaught error.
        if (!box) return;
        box.value = String(reader.result || '');
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

  // Keep the browser tab showing live progress, e.g. "Z452 · 1.24e30 He · TrimpsAT".
  // The game never writes document.title itself; only AutoTrimps' setTitle() (the
  // external bundle) rewrites it, on each zone change. We recompose OUR string on a
  // light 1s interval so the currency stays fresh between zone-ups, and a
  // MutationObserver re-asserts the LAST string we composed whenever anything else
  // overwrites the title. The observer compares against the stored lastTitle (it
  // never recomputes) and writes only when different, so our own writes can't loop it.
  var lastTitle = '';
  function composeTitle() {
    try {
      var g = game.global;
      var isRadon = g.universe === 2;                 // same currency switch the game uses
      var owned = isRadon ? game.resources.radon.owned : game.resources.helium.owned;
      var big = isFinite(owned) ? prettify(owned) : '∞';  // prettify() returns an HTML span for Infinity
      return 'Z' + g.world + ' · ' + big + ' ' + (isRadon ? 'Rn' : 'He') + ' · TrimpsAT';
    } catch (e) {
      return 'TrimpsAT';                              // game/resources not ready yet (early boot)
    }
  }
  function refreshTitle() {
    var desired = composeTitle();
    lastTitle = desired;
    if (document.title !== desired) document.title = desired;
  }
  function setupDynamicTitle() {
    var titleEl = document.querySelector('title');
    if (!titleEl) { titleEl = document.head.appendChild(document.createElement('title')); }
    refreshTitle();
    try {
      // Re-assert our composed string when AutoTrimps' setTitle (or anything) writes.
      // After we set document.title = lastTitle the observer fires again, sees
      // title === lastTitle, and stops — no infinite loop.
      new MutationObserver(function () {
        if (lastTitle && document.title !== lastTitle) document.title = lastTitle;
      }).observe(titleEl, { childList: true, characterData: true, subtree: true });
    } catch (e) {}
    setInterval(refreshTitle, 1000);
  }

  // -- sources popover (opened from the repurposed version button) ------------
  function buildSourcesPopover() {
    var panel = document.createElement('div');
    panel.id = 'atplay-attrib';
    panel.style.display = 'none';
    panel.innerHTML =
      // Hidden unless automation failed to load (issue #2) — setPopoverState().
      '<div class="atplay-fail" style="display:none">' +
        '<b>Automation failed to load.</b> The AutoTrimps script couldn\'t be ' +
        'fetched, so this is running as plain <b>manual</b> Trimps — nothing is ' +
        'being automated. A hard refresh may fix it; the bundle can be briefly offline.' +
      '</div>' +
      '<h4>Unofficial AutoTrimps build</h4>' +
      '<p>A rehosted, automated copy of <b>Trimps</b> — not the official game and ' +
      'not affiliated with its author.</p>' +
      '<p class="atplay-ver"></p>' +   // filled by setPopoverState() once versions resolve
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
  // Reflect the automation load state into the popover: show the red failure block
  // only on 'failed', and (re)fill the version line now that AT may have resolved.
  function setPopoverState(panel, state) {
    if (!panel) return;
    var fail = panel.querySelector('.atplay-fail');
    var ver = panel.querySelector('.atplay-ver');
    if (fail) fail.style.display = (state === 'failed') ? 'block' : 'none';
    if (ver) ver.textContent = versionLine();
  }

  // Repurpose the game's bottom-right "V x | What's New" button (index.html:1029)
  // into our disclosure: show the versions, and open the sources popover on click
  // instead of the fork's changelog. Done here (not in index.html) to keep the
  // upstream diff minimal.
  function repurposeVersionButton(panel) {
    var span = document.getElementById('versionNumber');
    var btn = span ? span.closest('td') : null;
    if (!btn) return null;
    btn.onclick = function () {
      panel.style.display = (panel.style.display === 'none') ? 'block' : 'none';
    };
    btn.classList.add('atplay-verbtn');
    return btn;   // caller renders the label via renderVersionLabel() once state is known
  }
  // Render the version-button label for a given automation state. NEVER emits an
  // empty AutoTrimps version (the old "⚠ AutoTrimps  · Trimps …" bug, issue #2),
  // and ALWAYS keeps a #versionNumber span in the DOM — AutoTrimps' setTitle()
  // reads getElementById('versionNumber').innerHTML on every zone change (utils.ts),
  // so destroying it would make newZone() throw and disable AT.
  function renderVersionLabel(btn, state, tr) {
    if (!btn) return;
    var verSpan = ' · Trimps <span id="versionNumber">' + tr + '</span> · ';
    btn.classList.remove('atplay-verbtn--failed', 'atplay-verbtn--loading');
    if (state === 'ok') {
      btn.title = 'Unofficial AutoTrimps build — attribution & sources';
      btn.innerHTML = '⚠ AutoTrimps ' + atVersion() + verSpan + 'sources';
    } else if (state === 'loading') {
      btn.classList.add('atplay-verbtn--loading');
      btn.title = 'Checking whether the AutoTrimps automation loaded…';
      btn.innerHTML = 'AutoTrimps: loading…' + verSpan + 'sources';
    } else { // 'failed'
      btn.classList.add('atplay-verbtn--failed');
      btn.title = 'AutoTrimps automation FAILED to load — running as plain manual Trimps. Click for details.';
      btn.innerHTML = '⚠ Automation offline' + verSpan + 'why?';
    }
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

  // -- issue #4: hide the dead PlayFab "Online Saving" setting ----------------
  // On this rehost origin the game's online/platform save back-ends CANNOT work:
  // no PlayFab title this fork owns (the bundled SDK hardcoded the OFFICIAL title
  // 9186), no Kongregate shell, no Steam/greenworks runtime. The PlayFab SDK
  // <script> is removed from index.html and the vendored Playfab/ dir is deleted.
  // The PlayFab entry points that touch the SDK already fail closed when it's
  // absent: saveToPlayFab/loadFromPlayFab self-guard on `typeof PlayFab`, and
  // enablePlayFab is guarded in main.js (so load()'s top-level call can't pop the
  // login tooltip — a play-shell override loads too late for that). Kongregate/
  // Steam settings rows are already hidden in-browser by their own lockUnless
  // (nw !== undefined). All that's left is the PlayFab row itself, which DOES draw
  // in-browser (config.js:1004 lockUnless returns true when `nw` is undefined).
  // Override lockUnless to false so the dead "Online Saving" row never renders,
  // and force it off. Runs in init(), after `game` exists.
  function gatePlayFabSetting() {
    try {
      var opt = game.options.menu.usePlayFab;
      if (opt) {
        opt.enabled = 0;
        opt.lockUnless = function () { return false; };
      }
    } catch (e) {}
  }

  // -- boot -------------------------------------------------------------------
  function init() {
    setupDynamicTitle();                 // #3: live "Z.. · .. He · TrimpsAT" tab title
    suppressNativePopups();
    gatePlayFabSetting();                // #4: hide dead PlayFab "Online Saving" row
    var tr = trimpsVersion();            // game version, carried in the label's #versionNumber span
    var panel = buildSourcesPopover();
    var btn = repurposeVersionButton(panel);
    var state = atVersion() ? 'ok' : 'loading';   // 'loading' only lingers while a failure is polled
    renderVersionLabel(btn, state, tr);
    setPopoverState(panel, state);
    if (!hasExistingSave()) buildCombinedDialog(versionLine());
    // #2: resolve automation load state — flips the label to 'ok' or 'failed' (+ notice).
    whenAutomationResolved(function (ok) {
      renderVersionLabel(btn, ok ? 'ok' : 'failed', tr);
      setPopoverState(panel, ok ? 'ok' : 'failed');
    });
  }

  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }
})();
