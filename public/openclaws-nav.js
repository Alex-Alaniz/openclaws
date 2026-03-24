/**
 * openclaws-nav.js — Shared navigation bar for OpenClaws SaaS + Control UI
 *
 * Framework-agnostic (vanilla JS/CSS). Drop a single <script> tag into any
 * HTML page and call `OpenClawsNav.init(options)`.
 *
 * Usage:
 *   <script src="/openclaws-nav.js"></script>
 *   <script>
 *     OpenClawsNav.init({
 *       instanceName: 'alex',
 *       dashboardUrl: 'https://openclaws.biz/dashboard',
 *       instanceUrl:  'https://alex.openclaws.biz',
 *       activePage:   'dashboard',   // 'dashboard' | 'instance'
 *       logoSrc:      '/openclaw.svg',
 *       user: { name: 'Alex', avatarUrl: null },
 *     });
 *   </script>
 */
(function () {
  'use strict';

  // ── CSS (injected once) ──────────────────────────────────────────────
  const STYLE_ID = 'openclaws-nav-style';
  const NAV_ID = 'openclaws-nav';
  const MENU_ID = 'openclaws-nav-mobile-menu';

  const CSS = `
    #${NAV_ID} {
      --oc-nav-bg: #111111;
      --oc-nav-border: rgba(255,255,255,0.1);
      --oc-nav-text: #e4e4e7;
      --oc-nav-text-muted: #a1a1aa;
      --oc-nav-active-bg: #252525;
      --oc-nav-hover-bg: #252525;
      --oc-nav-accent: #f97316;
      --oc-nav-height: 48px;
      --oc-nav-font: "Inter","SF Pro Text","Segoe UI",-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;

      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: var(--oc-nav-height);
      padding: 0 16px;
      background: var(--oc-nav-bg);
      border-bottom: 1px solid var(--oc-nav-border);
      font-family: var(--oc-nav-font);
      font-size: 13px;
      line-height: 1;
      box-sizing: border-box;
      -webkit-font-smoothing: antialiased;
      backdrop-filter: blur(12px);
    }
    #${NAV_ID} *, #${NAV_ID} *::before, #${NAV_ID} *::after {
      box-sizing: border-box;
    }

    /* Spacer so page content isn't hidden behind fixed nav */
    .openclaws-nav-spacer {
      height: var(--oc-nav-height, 48px);
      display: block;
    }

    /* Left group: logo + instance name */
    .oc-nav-left {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }
    .oc-nav-logo {
      display: flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      color: var(--oc-nav-text);
      flex-shrink: 0;
    }
    .oc-nav-logo img {
      width: 22px;
      height: 22px;
    }
    .oc-nav-brand {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.02em;
      color: var(--oc-nav-text);
      white-space: nowrap;
    }
    .oc-nav-instance {
      font-size: 11px;
      color: var(--oc-nav-text-muted);
      background: rgba(255,255,255,0.06);
      padding: 3px 8px;
      border-radius: 6px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 160px;
    }

    /* Center group: page toggle */
    .oc-nav-center {
      display: flex;
      align-items: center;
      gap: 4px;
      background: rgba(255,255,255,0.04);
      border-radius: 8px;
      padding: 3px;
    }
    .oc-nav-tab {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      color: var(--oc-nav-text-muted);
      text-decoration: none;
      transition: background 120ms ease, color 120ms ease;
      white-space: nowrap;
      cursor: pointer;
      border: none;
      background: transparent;
    }
    .oc-nav-tab:hover {
      background: var(--oc-nav-hover-bg);
      color: var(--oc-nav-text);
    }
    .oc-nav-tab[data-active="true"] {
      background: var(--oc-nav-active-bg);
      color: #fff;
      font-weight: 600;
    }
    .oc-nav-tab svg {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }

    /* Right group: avatar */
    .oc-nav-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .oc-nav-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--oc-nav-accent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      color: #fff;
      overflow: hidden;
      flex-shrink: 0;
      text-transform: uppercase;
    }
    .oc-nav-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }

    /* ── Hamburger button (hidden on desktop) ────────────────────────── */
    .oc-nav-hamburger {
      display: none;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      padding: 0;
      margin: 0;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: var(--oc-nav-text);
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transition: background 120ms ease;
      flex-shrink: 0;
    }
    .oc-nav-hamburger:hover {
      background: var(--oc-nav-hover-bg);
    }
    .oc-nav-hamburger svg {
      width: 20px;
      height: 20px;
    }

    /* ── Mobile menu overlay ─────────────────────────────────────────── */
    #${MENU_ID} {
      position: fixed;
      top: var(--oc-nav-height, 48px);
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 99998;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      opacity: 0;
      visibility: hidden;
      transition: opacity 200ms ease, visibility 200ms ease;
      font-family: var(--oc-nav-font);
      -webkit-font-smoothing: antialiased;
    }
    #${MENU_ID}[data-open="true"] {
      opacity: 1;
      visibility: visible;
    }
    .oc-nav-mobile-panel {
      background: #111111;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      padding: 8px 0;
      transform: translateY(-10px);
      transition: transform 200ms ease;
    }
    #${MENU_ID}[data-open="true"] .oc-nav-mobile-panel {
      transform: translateY(0);
    }

    /* Mobile menu items */
    .oc-nav-mobile-section {
      padding: 8px 16px;
    }
    .oc-nav-mobile-section + .oc-nav-mobile-section {
      border-top: 1px solid rgba(255,255,255,0.06);
    }
    .oc-nav-mobile-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 12px;
      border-radius: 8px;
      text-decoration: none;
      color: #a1a1aa;
      font-size: 14px;
      font-weight: 500;
      transition: background 120ms ease, color 120ms ease;
      line-height: 1.2;
    }
    .oc-nav-mobile-item:hover,
    .oc-nav-mobile-item:active {
      background: #252525;
      color: #e4e4e7;
    }
    .oc-nav-mobile-item[data-active="true"] {
      background: #252525;
      color: #fff;
      font-weight: 600;
    }
    .oc-nav-mobile-item svg {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    /* Mobile user section */
    .oc-nav-mobile-user {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      color: #e4e4e7;
      font-size: 13px;
    }
    .oc-nav-mobile-user .oc-nav-avatar {
      width: 32px;
      height: 32px;
      font-size: 13px;
    }
    .oc-nav-mobile-user-name {
      font-weight: 600;
      font-size: 14px;
    }
    .oc-nav-mobile-user-instance {
      font-size: 11px;
      color: #a1a1aa;
      margin-top: 2px;
    }

    /* ── Mobile breakpoint ───────────────────────────────────────────── */
    @media (max-width: 560px) {
      .oc-nav-brand { display: none; }
      .oc-nav-instance { display: none; }
      .oc-nav-center { display: none; }
      .oc-nav-avatar { display: none; }
      .oc-nav-hamburger { display: flex; }
    }
  `;

  // ── SVG icons ────────────────────────────────────────────────────────
  const ICON_DASHBOARD = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`;
  const ICON_INSTANCE = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`;
  const ICON_HAMBURGER = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>`;
  const ICON_CLOSE = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>`;

  // ── Helpers ──────────────────────────────────────────────────────────
  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
  }

  function avatarInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return parts[0][0] + parts[1][0];
    return parts[0][0];
  }

  // ── Mobile menu state ────────────────────────────────────────────────
  let mobileMenuOpen = false;
  let currentOpts = {};

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
    const menu = document.getElementById(MENU_ID);
    const btn = document.querySelector('.oc-nav-hamburger');
    if (menu) {
      menu.dataset.open = String(mobileMenuOpen);
      menu.setAttribute('aria-hidden', String(!mobileMenuOpen));
    }
    if (btn) {
      btn.innerHTML = mobileMenuOpen ? ICON_CLOSE : ICON_HAMBURGER;
      btn.setAttribute('aria-expanded', String(mobileMenuOpen));
      btn.setAttribute('aria-label', mobileMenuOpen ? 'Close menu' : 'Open menu');
    }
  }

  function closeMobileMenu() {
    if (!mobileMenuOpen) return;
    mobileMenuOpen = false;
    const menu = document.getElementById(MENU_ID);
    const btn = document.querySelector('.oc-nav-hamburger');
    if (menu) {
      menu.dataset.open = 'false';
      menu.setAttribute('aria-hidden', 'true');
    }
    if (btn) {
      btn.innerHTML = ICON_HAMBURGER;
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'Open menu');
    }
  }

  function renderMobileMenu(opts) {
    const {
      instanceName = '',
      dashboardUrl = '/dashboard',
      instanceUrl = '#',
      activePage = 'dashboard',
      user = {},
    } = opts;

    // Remove existing
    const existing = document.getElementById(MENU_ID);
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = MENU_ID;
    overlay.dataset.open = 'false';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Mobile navigation menu');

    // Click on backdrop closes menu
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeMobileMenu();
    });

    const panel = document.createElement('div');
    panel.className = 'oc-nav-mobile-panel';

    // User section
    const userSection = document.createElement('div');
    userSection.className = 'oc-nav-mobile-section';
    const userRow = document.createElement('div');
    userRow.className = 'oc-nav-mobile-user';

    const avatar = document.createElement('div');
    avatar.className = 'oc-nav-avatar';
    if (user.avatarUrl) {
      avatar.innerHTML = `<img src="${user.avatarUrl}" alt="${user.name || 'User'}">`;
    } else {
      avatar.textContent = avatarInitials(user.name);
    }

    const userInfo = document.createElement('div');
    const userName = document.createElement('div');
    userName.className = 'oc-nav-mobile-user-name';
    userName.textContent = user.name || 'User';
    userInfo.appendChild(userName);

    if (instanceName) {
      const instLabel = document.createElement('div');
      instLabel.className = 'oc-nav-mobile-user-instance';
      instLabel.textContent = instanceName;
      userInfo.appendChild(instLabel);
    }

    userRow.appendChild(avatar);
    userRow.appendChild(userInfo);
    userSection.appendChild(userRow);

    // Nav section
    const navSection = document.createElement('div');
    navSection.className = 'oc-nav-mobile-section';

    const dashItem = document.createElement('a');
    dashItem.className = 'oc-nav-mobile-item';
    dashItem.href = dashboardUrl;
    dashItem.dataset.active = String(activePage === 'dashboard');
    dashItem.innerHTML = `${ICON_DASHBOARD}<span>Dashboard</span>`;
    dashItem.addEventListener('click', closeMobileMenu);

    const instItem = document.createElement('a');
    instItem.className = 'oc-nav-mobile-item';
    instItem.href = instanceUrl;
    instItem.dataset.active = String(activePage === 'instance');
    instItem.innerHTML = `${ICON_INSTANCE}<span>Instance</span>`;
    instItem.addEventListener('click', closeMobileMenu);

    navSection.appendChild(dashItem);
    navSection.appendChild(instItem);

    panel.appendChild(userSection);
    panel.appendChild(navSection);
    overlay.appendChild(panel);

    document.body.appendChild(overlay);
  }

  // ── Main render ──────────────────────────────────────────────────────
  function render(opts) {
    const {
      instanceName = '',
      dashboardUrl = '/dashboard',
      instanceUrl = '#',
      activePage = 'dashboard',
      logoSrc = '/openclaw.svg',
      user = {},
    } = opts;

    const nav = document.createElement('nav');
    nav.id = NAV_ID;
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'OpenClaws navigation');

    // Left: logo + brand + instance
    const left = document.createElement('div');
    left.className = 'oc-nav-left';

    const logoLink = document.createElement('a');
    logoLink.className = 'oc-nav-logo';
    logoLink.href = dashboardUrl;
    logoLink.innerHTML = `<img src="${logoSrc}" alt="OpenClaws logo"><span class="oc-nav-brand">OpenClaws</span>`;
    left.appendChild(logoLink);

    if (instanceName) {
      const badge = document.createElement('span');
      badge.className = 'oc-nav-instance';
      badge.textContent = instanceName;
      badge.title = instanceName;
      left.appendChild(badge);
    }

    // Center: Dashboard / Instance toggle
    const center = document.createElement('div');
    center.className = 'oc-nav-center';

    const dashTab = document.createElement('a');
    dashTab.className = 'oc-nav-tab';
    dashTab.href = dashboardUrl;
    dashTab.dataset.active = String(activePage === 'dashboard');
    dashTab.innerHTML = `${ICON_DASHBOARD}<span>Dashboard</span>`;

    const instTab = document.createElement('a');
    instTab.className = 'oc-nav-tab';
    instTab.href = instanceUrl;
    instTab.dataset.active = String(activePage === 'instance');
    instTab.innerHTML = `${ICON_INSTANCE}<span>Instance</span>`;

    center.appendChild(dashTab);
    center.appendChild(instTab);

    // Right: avatar + hamburger
    const right = document.createElement('div');
    right.className = 'oc-nav-right';

    const avatar = document.createElement('div');
    avatar.className = 'oc-nav-avatar';
    if (user.avatarUrl) {
      avatar.innerHTML = `<img src="${user.avatarUrl}" alt="${user.name || 'User'}">`;
    } else {
      avatar.textContent = avatarInitials(user.name);
    }
    avatar.title = user.name || 'User';
    right.appendChild(avatar);

    // Hamburger button (visible only on mobile via CSS)
    const hamburger = document.createElement('button');
    hamburger.className = 'oc-nav-hamburger';
    hamburger.type = 'button';
    hamburger.setAttribute('aria-label', 'Open menu');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-controls', MENU_ID);
    hamburger.innerHTML = ICON_HAMBURGER;
    hamburger.addEventListener('click', toggleMobileMenu);
    right.appendChild(hamburger);

    // Assemble
    nav.appendChild(left);
    nav.appendChild(center);
    nav.appendChild(right);

    return nav;
  }

  // ── Close menu on resize to desktop ──────────────────────────────────
  let resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (window.innerWidth > 560) {
        closeMobileMenu();
      }
    }, 100);
  });

  // ── Close menu on Escape key ─────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mobileMenuOpen) {
      closeMobileMenu();
    }
  });

  // ── Public API ───────────────────────────────────────────────────────
  window.OpenClawsNav = {
    /**
     * Initialise or re-render the shared nav.
     * @param {Object} opts
     * @param {string} [opts.instanceName]  - e.g. "alex"
     * @param {string} [opts.dashboardUrl]  - SaaS dashboard URL
     * @param {string} [opts.instanceUrl]   - Control UI URL
     * @param {string} [opts.activePage]    - 'dashboard' | 'instance'
     * @param {string} [opts.logoSrc]       - path to logo image
     * @param {Object} [opts.user]          - { name, avatarUrl }
     * @param {string} [opts.mountTarget]   - CSS selector to insert before (default: body.firstChild)
     */
    init: function (opts) {
      opts = opts || {};
      currentOpts = opts;
      mobileMenuOpen = false;
      injectStyle();

      // Remove previous nav if re-init
      const existing = document.getElementById(NAV_ID);
      if (existing) existing.remove();
      const existingSpacer = document.querySelector('.openclaws-nav-spacer');
      if (existingSpacer) existingSpacer.remove();
      const existingMenu = document.getElementById(MENU_ID);
      if (existingMenu) existingMenu.remove();

      const nav = render(opts);

      // Insert at top of body
      const target = opts.mountTarget
        ? document.querySelector(opts.mountTarget)
        : document.body;

      if (target) {
        target.insertBefore(nav, target.firstChild);
        // Add spacer right after nav so content doesn't hide behind fixed bar
        const spacer = document.createElement('div');
        spacer.className = 'openclaws-nav-spacer';
        nav.after(spacer);
      }

      // Render mobile menu (hidden by default, toggled via hamburger)
      renderMobileMenu(opts);
    },

    /**
     * Remove the nav bar and its styles.
     */
    destroy: function () {
      closeMobileMenu();
      const nav = document.getElementById(NAV_ID);
      if (nav) nav.remove();
      const spacer = document.querySelector('.openclaws-nav-spacer');
      if (spacer) spacer.remove();
      const menu = document.getElementById(MENU_ID);
      if (menu) menu.remove();
      const style = document.getElementById(STYLE_ID);
      if (style) style.remove();
    },

    /**
     * Update a single option without full re-render (e.g. activePage).
     */
    update: function (opts) {
      const nav = document.getElementById(NAV_ID);
      if (!nav) return this.init(opts);

      // Merge with current opts for mobile menu re-render
      Object.assign(currentOpts, opts);

      // Quick-update active page toggle
      if (opts.activePage) {
        nav.querySelectorAll('.oc-nav-tab').forEach(function (tab) {
          const isDash = tab.querySelector('rect') !== null; // dashboard icon uses rects
          if (opts.activePage === 'dashboard') {
            tab.dataset.active = String(isDash);
          } else {
            tab.dataset.active = String(!isDash);
          }
        });
      }

      // Quick-update instance name
      if (opts.instanceName !== undefined) {
        const badge = nav.querySelector('.oc-nav-instance');
        if (badge) {
          badge.textContent = opts.instanceName;
          badge.title = opts.instanceName;
        }
      }

      // Re-render mobile menu with updated opts
      renderMobileMenu(currentOpts);
    },
  };
})();
