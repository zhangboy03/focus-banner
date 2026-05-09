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

  console.log('[focus-banner] loaded on', location.hostname,
              '| work-mode:', GM_getValue('work-mode', false));
})();
