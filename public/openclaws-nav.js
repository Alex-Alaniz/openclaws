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

    /* Mobile: hide brand text + instance badge */
    @media (max-width: 560px) {
      .oc-nav-brand { display: none; }
      .oc-nav-instance { display: none; }
      .oc-nav-tab span { display: none; }
      .oc-nav-tab { padding: 5px 10px; }
    }
  `;

  // ── SVG icons ────────────────────────────────────────────────────────
  const ICON_DASHBOARD = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`;
  const ICON_INSTANCE = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`;

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

    // Right: avatar
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

    // Assemble
    nav.appendChild(left);
    nav.appendChild(center);
    nav.appendChild(right);

    return nav;
  }

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
      injectStyle();

      // Remove previous nav if re-init
      const existing = document.getElementById(NAV_ID);
      if (existing) existing.remove();
      const existingSpacer = document.querySelector('.openclaws-nav-spacer');
      if (existingSpacer) existingSpacer.remove();

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
    },

    /**
     * Remove the nav bar and its styles.
     */
    destroy: function () {
      const nav = document.getElementById(NAV_ID);
      if (nav) nav.remove();
      const spacer = document.querySelector('.openclaws-nav-spacer');
      if (spacer) spacer.remove();
      const style = document.getElementById(STYLE_ID);
      if (style) style.remove();
    },

    /**
     * Update a single option without full re-render (e.g. activePage).
     */
    update: function (opts) {
      const nav = document.getElementById(NAV_ID);
      if (!nav) return this.init(opts);

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
    },
  };
})();
