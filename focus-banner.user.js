// ==UserScript==
// @name         Focus Banner
// @namespace    https://link.zhangboy.xyz/
// @version      0.1.0
// @description  Sharp distraction-awareness banner for B 站 / 小红书 / YouTube / X
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// @grant        GM_addStyle
// @run-at       document_idle
// ==/UserScript==

(function () {
  'use strict';

  GM_addStyle(`
    #focus-banner {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 999999;
      background: #1a1a1a;
      color: #fff;
      padding: 12px 24px;
      font: 500 15px/1.4 -apple-system, system-ui, "Helvetica Neue", sans-serif;
      box-shadow: 0 2px 12px rgba(0,0,0,0.4);
      transition: all .35s cubic-bezier(.4,0,.2,1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    #focus-banner .text { flex: 1; }
    #focus-banner .close {
      background: transparent;
      color: #fff;
      border: 0;
      font-size: 20px;
      line-height: 1;
      cursor: pointer;
      padding: 4px 8px;
      opacity: 0.7;
    }
    #focus-banner .close:hover { opacity: 1; }
    #focus-banner.collapsed {
      top: 12px; left: auto; right: 12px;
      width: 36px; height: 36px;
      padding: 0;
      border-radius: 50%;
      background: #c0392b;
      cursor: pointer;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(192,57,43,0.4);
    }
    #focus-banner.collapsed .text,
    #focus-banner.collapsed .close { display: none; }
    #focus-banner.collapsed::before {
      content: "·" attr(data-count);
      font-size: 12px;
      font-weight: 700;
    }
  `);

  const TRACKED_SITES = [
    { domain: 'bilibili.com',    key: 'bilibili',    label: 'B 站' },
    { domain: 'xiaohongshu.com', key: 'xiaohongshu', label: '小红书' },
    { domain: 'youtube.com',     key: 'youtube',     label: 'YouTube' },
    { domain: 'x.com',           key: 'x',           label: 'X' },
    { domain: 'twitter.com',     key: 'x',           label: 'X' }, // legacy redirect
  ];

  function getCurrentSite() {
    const host = location.hostname;
    for (const site of TRACKED_SITES) {
      if (host === site.domain || host.endsWith('.' + site.domain)) {
        return site;
      }
    }
    return null;
  }

  function todayKey() {
    return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local timezone
  }

  function incrementCounter(siteKey) {
    let counter;
    try {
      counter = JSON.parse(GM_getValue('counter', '{}'));
    } catch (e) {
      counter = {};
    }
    const today = todayKey();
    counter[today] = counter[today] || {};
    counter[today][siteKey] = (counter[today][siteKey] || 0) + 1;
    GM_setValue('counter', JSON.stringify(counter));
    return counter[today][siteKey];
  }

  function injectBanner(message, count) {
    const existing = document.getElementById('focus-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'focus-banner';
    banner.dataset.count = count;
    banner.innerHTML = `
      <span class="text"></span>
      <button class="close" aria-label="dismiss">×</button>
    `;
    banner.querySelector('.text').textContent = message;

    let collapseTimer = null;
    const scheduleCollapse = () => {
      if (collapseTimer) clearTimeout(collapseTimer);
      collapseTimer = setTimeout(() => banner.classList.add('collapsed'), 5000);
    };

    // Click on the collapsed pill re-expands
    banner.addEventListener('click', (e) => {
      if (e.target.classList.contains('close')) return; // close handled separately
      if (banner.classList.contains('collapsed')) {
        banner.classList.remove('collapsed');
        scheduleCollapse();
      }
    });

    // Close button collapses immediately
    banner.querySelector('.close').addEventListener('click', (e) => {
      e.stopPropagation();
      if (collapseTimer) clearTimeout(collapseTimer);
      banner.classList.add('collapsed');
    });

    if (document.body) {
      document.body.appendChild(banner);
    } else {
      document.addEventListener('DOMContentLoaded', () => document.body.appendChild(banner));
    }

    scheduleCollapse();
    return banner;
  }

  function toggleWorkMode() {
    const next = !GM_getValue('work-mode', false);
    GM_setValue('work-mode', next);
    GM_notification({
      title: 'Focus Banner',
      text: `Work Mode: ${next ? 'ON 🔥' : 'OFF 💤'}`,
      timeout: 2000
    });
  }

  GM_registerMenuCommand('🔥 切换 Work Mode', toggleWorkMode);

  const site = getCurrentSite();
  console.log('[focus-banner] loaded on', location.hostname,
              '| work-mode:', GM_getValue('work-mode', false),
              '| site:', site ? site.label : '(not tracked)');

  if (!site) return;
  if (!GM_getValue('work-mode', false)) return;
  if (sessionStorage.getItem('focus-banner-shown') === 'true') return;

  const n = incrementCounter(site.key);
  const placeholder = `[TEST] 第 ${n} 次。这条消息是占位用的。`;
  injectBanner(placeholder, n);
  sessionStorage.setItem('focus-banner-shown', 'true');
})();
