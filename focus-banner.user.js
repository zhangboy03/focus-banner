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
})();
