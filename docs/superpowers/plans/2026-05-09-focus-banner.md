# Focus Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Tampermonkey userscript that injects a sharp shame-banner on B 站 / 小红书 / YouTube / X when Work Mode is active, with a toolbar-clickable on/off toggle and a daily per-site visit counter.

**Architecture:** Single-file userscript. `@match *://*/*` so the toggle menu command is reachable from any page; banner / counter logic activates only when hostname matches one of 4 tracked sites AND `work-mode` GM value is true. Uses Tampermonkey GM_* APIs for cross-domain state, sessionStorage for per-tab dedup, vanilla DOM + GM_addStyle for the banner UI. No build step, no dependencies, no backend.

**Tech Stack:** Vanilla JavaScript (ES2017+), Tampermonkey GM_* APIs (GM_setValue / GM_getValue / GM_registerMenuCommand / GM_notification / GM_addStyle), sessionStorage. Browser: Chrome / Firefox / Edge (Tampermonkey free); Safari can use Userscripts (free).

---

## File Structure

```
focus-banner/
├── .gitignore
├── README.md
├── focus-banner.user.js          # the userscript, single file ~250 lines
└── docs/superpowers/
    ├── specs/2026-05-09-focus-banner-design.md   # exists
    └── plans/2026-05-09-focus-banner.md           # this file
```

The userscript is intentionally a single self-contained file:
- Tampermonkey expects single-file scripts
- No build step → fastest iteration during dev
- Easy to share / paste into Tampermonkey

---

### Task 1: Project Scaffolding

**Files:**
- Create: `focus-banner/.gitignore`
- Create: `focus-banner/README.md`
- Create: `focus-banner/focus-banner.user.js`

- [ ] **Step 1: Create .gitignore**

```
.DS_Store
*.log
node_modules/
```

- [ ] **Step 2: Create README.md**

````markdown
# Focus Banner

Sharp distraction-awareness banner for B 站 / 小红书 / YouTube / X.
Tampermonkey userscript. Manual Work Mode toggle via Tampermonkey menu.

## Install

1. Install Tampermonkey extension (Chrome / Firefox / Edge — free).
   Safari users: install Userscripts (free).
2. Open Tampermonkey dashboard → "+" → "New script".
3. Replace the template with the contents of `focus-banner.user.js`.
4. Save (Ctrl+S / Cmd+S).

## Use

- Click the Tampermonkey extension icon → "🔥 切换 Work Mode" to turn on.
- Visit B 站 / 小红书 / YouTube / X — sharp banner appears for 5s, then collapses to a corner dot.
- Click the corner dot to re-expand. Click × to dismiss immediately.
- Click "📊 查看今日计数" in the menu to see today's per-site visit counts.
- Click "🔥 切换 Work Mode" again to turn off (banner sleeps).

## Design

See `docs/superpowers/specs/2026-05-09-focus-banner-design.md`.
````

- [ ] **Step 3: Create focus-banner.user.js skeleton**

```javascript
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

  console.log('[focus-banner] loaded on', location.hostname);
})();
```

- [ ] **Step 4: Verify script installs cleanly**

1. Install Tampermonkey if not yet installed (see README)
2. Tampermonkey dashboard → "+" → "New script" → paste the file contents → save
3. Visit any page (e.g., google.com)
4. Open DevTools console (Cmd+Option+J / F12) → expect: `[focus-banner] loaded on google.com`

If the log doesn't show, check Tampermonkey dashboard for syntax errors at the top of the script editor.

- [ ] **Step 5: Commit**

```bash
git add .gitignore README.md focus-banner.user.js
git commit -m "feat: scaffold focus-banner project"
```

---

### Task 2: Toggle Work Mode Menu Command

**Files:**
- Modify: `focus-banner/focus-banner.user.js`

- [ ] **Step 1: Replace the IIFE body with toggle command**

```javascript
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
```

- [ ] **Step 2: Reload script in Tampermonkey**

In Tampermonkey dashboard, click your script → save (Cmd+S). Then reload any open page so the new version is active.

- [ ] **Step 3: Verify menu command appears and toggles state**

1. Click Tampermonkey extension icon (puzzle-piece-shaped icon in browser toolbar)
2. In the dropdown that appears, you should see "🔥 切换 Work Mode" listed
3. Click it → expect a system notification: "Work Mode: ON 🔥"
4. Reload the current page → console shows `work-mode: true`
5. Click the menu command again → notification: "Work Mode: OFF 💤"
6. Reload → console shows `work-mode: false`

If the notification doesn't appear, check OS notification permissions (macOS System Settings → Notifications → look for the browser).

- [ ] **Step 4: Commit**

```bash
git add focus-banner.user.js
git commit -m "feat: add Toggle Work Mode menu command"
```

---

### Task 3: Site Detection

**Files:**
- Modify: `focus-banner/focus-banner.user.js`

- [ ] **Step 1: Add TRACKED_SITES and getCurrentSite()**

Insert these definitions inside the IIFE, between `'use strict';` and `function toggleWorkMode`:

```javascript
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
```

- [ ] **Step 2: Update the bottom log to show detected site**

Replace the existing `console.log` line with:

```javascript
const site = getCurrentSite();
console.log('[focus-banner] loaded on', location.hostname,
            '| work-mode:', GM_getValue('work-mode', false),
            '| site:', site ? site.label : '(not tracked)');
```

- [ ] **Step 3: Reload script in Tampermonkey**

- [ ] **Step 4: Verify hostname matching across sites**

Visit each URL and check the console output:

| URL | Expected console output |
|---|---|
| `https://www.bilibili.com/` | `site: B 站` |
| `https://m.bilibili.com/` | `site: B 站` |
| `https://www.xiaohongshu.com/` | `site: 小红书` |
| `https://www.youtube.com/` | `site: YouTube` |
| `https://x.com/` | `site: X` |
| `https://www.google.com/` | `site: (not tracked)` |

False-positive safety: our matching rule is `host === domain || host.endsWith('.' + domain)`, so `notbilibili.com` would NOT match (it would need to be `bilibili.com` exactly or `*.bilibili.com`). No need to test this — just confirm by re-reading the code.

- [ ] **Step 5: Commit**

```bash
git add focus-banner.user.js
git commit -m "feat: add site detection for tracked domains"
```

---

### Task 4: Daily Counter

**Files:**
- Modify: `focus-banner/focus-banner.user.js`

- [ ] **Step 1: Add todayKey() and incrementCounter()**

Add these helper functions in the IIFE, between `getCurrentSite` and `toggleWorkMode`:

```javascript
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
```

- [ ] **Step 2: Wire counter to the bottom of the IIFE**

Replace the bottom of the IIFE (after the existing `console.log` from Task 3) with:

```javascript
if (!site) return;
if (!GM_getValue('work-mode', false)) return;

const n = incrementCounter(site.key);
console.log('[focus-banner] count for', site.key, '=', n);
```

The full bottom should now look like:

```javascript
const site = getCurrentSite();
console.log('[focus-banner] loaded on', location.hostname,
            '| work-mode:', GM_getValue('work-mode', false),
            '| site:', site ? site.label : '(not tracked)');

if (!site) return;
if (!GM_getValue('work-mode', false)) return;

const n = incrementCounter(site.key);
console.log('[focus-banner] count for', site.key, '=', n);
```

- [ ] **Step 3: Reload script and ensure Work Mode is ON**

Tampermonkey menu → "🔥 切换 Work Mode" if currently OFF.

- [ ] **Step 4: Verify counter increments correctly**

1. Visit `https://www.bilibili.com/` → console: `count for bilibili = 1`
2. Reload that page → console: `count for bilibili = 2`
3. New tab → bilibili.com → `count for bilibili = 3`
4. Visit `https://www.youtube.com/` → console: `count for youtube = 1` (counted independently)

- [ ] **Step 5: Inspect storage manually**

In Tampermonkey dashboard → click your script → "Storage" tab → verify a `counter` key exists with structure like:

```json
{"2026-05-09": {"bilibili": 3, "youtube": 1}}
```

- [ ] **Step 6: Verify timezone and Work Mode gating**

Quick sanity check in any browser console (NOT in the userscript, just plain browser console):

```javascript
new Date().toLocaleDateString('en-CA')
// Expected: today's date in YYYY-MM-DD format, local timezone
```

Toggle Work Mode OFF and reload bilibili.com → console should NOT show `count for bilibili`. Counter should not increase. Toggle back ON before continuing.

- [ ] **Step 7: Commit**

```bash
git add focus-banner.user.js
git commit -m "feat: add per-site daily counter"
```

---

### Task 5: Banner DOM and Base CSS

**Files:**
- Modify: `focus-banner/focus-banner.user.js`

- [ ] **Step 1: Add styles via GM_addStyle**

Insert at the very top of the IIFE body (immediately after `'use strict';`, before `TRACKED_SITES`):

```javascript
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
```

- [ ] **Step 2: Add injectBanner() (basic version, no interactions yet)**

Add this function in the IIFE, between `incrementCounter` and `toggleWorkMode`:

```javascript
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

  if (document.body) {
    document.body.appendChild(banner);
  } else {
    document.addEventListener('DOMContentLoaded', () => document.body.appendChild(banner));
  }
  return banner;
}
```

- [ ] **Step 3: Hook injectBanner with a placeholder message**

Replace the bottom of the IIFE — change the trailing block to:

```javascript
if (!site) return;
if (!GM_getValue('work-mode', false)) return;

const n = incrementCounter(site.key);
const placeholder = `[TEST] 第 ${n} 次。这条消息是占位用的。`;
injectBanner(placeholder, n);
```

- [ ] **Step 4: Reload script and verify banner appears**

1. Make sure Work Mode is ON
2. Visit `https://www.bilibili.com/`
3. Expect: a dark banner across the top of the page reading `[TEST] 第 X 次。这条消息是占位用的。` with a `×` button on the right
4. Banner should overlay site content (z-index 999999 puts it on top)

If the banner is hidden behind site UI, inspect with DevTools — some sites might have higher z-index. Bump our z-index higher if needed (try `2147483647`).

- [ ] **Step 5: Commit**

```bash
git add focus-banner.user.js
git commit -m "feat: add banner DOM injection with base styles"
```

---

### Task 6: Banner Collapse / Expand Interactions

**Files:**
- Modify: `focus-banner/focus-banner.user.js`

- [ ] **Step 1: Replace injectBanner() with the interactive version**

Replace the entire `injectBanner` function with this full version:

```javascript
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
```

- [ ] **Step 2: Reload script**

- [ ] **Step 3: Verify the full collapse/expand cycle**

1. New tab → bilibili.com → banner appears in expanded state
2. Wait 5 seconds → banner smoothly transitions to a small red dot at top-right showing `·N` (where N is your count)
3. Click the red dot → banner re-expands
4. Wait another 5 seconds → re-collapses
5. Reload page → banner appears (count increments)
6. Click the `×` button → banner immediately collapses to dot (does not wait 5 seconds)
7. Click the dot → re-expands

If the transition is janky, check DevTools for CSS conflicts (some sites' global `*` selectors can interfere). Our `transition: all .35s cubic-bezier(.4,0,.2,1)` should give a smooth slide.

- [ ] **Step 4: Commit**

```bash
git add focus-banner.user.js
git commit -m "feat: add banner collapse/expand and close interactions"
```

---

### Task 7: Per-Tab Dedup with sessionStorage

**Files:**
- Modify: `focus-banner/focus-banner.user.js`

- [ ] **Step 1: Add sessionStorage check and set**

Replace the bottom of the IIFE — change:

```javascript
if (!site) return;
if (!GM_getValue('work-mode', false)) return;

const n = incrementCounter(site.key);
const placeholder = `[TEST] 第 ${n} 次。这条消息是占位用的。`;
injectBanner(placeholder, n);
```

with:

```javascript
if (!site) return;
if (!GM_getValue('work-mode', false)) return;
if (sessionStorage.getItem('focus-banner-shown') === 'true') return;

const n = incrementCounter(site.key);
const placeholder = `[TEST] 第 ${n} 次。这条消息是占位用的。`;
injectBanner(placeholder, n);
sessionStorage.setItem('focus-banner-shown', 'true');
```

- [ ] **Step 2: Reload script**

- [ ] **Step 3: Verify same-tab dedup**

1. Open a new tab → bilibili.com → banner appears (let's say count = X)
2. In the same tab, click any video link → page navigates within bilibili.com → banner does NOT appear, AND counter does not increment
3. Open another new tab → bilibili.com → banner appears (count = X+1)
4. Close the original tab and open another new one → banner appears (count = X+2)

The dedup also prevents over-counting (counter only increments when banner shows).

- [ ] **Step 4: Commit**

```bash
git add focus-banner.user.js
git commit -m "feat: dedup banner within a tab session"
```

---

### Task 8: Real Message Pool with Random Selection

**Files:**
- Modify: `focus-banner/focus-banner.user.js`

- [ ] **Step 1: Add the 100-message MESSAGES array**

Insert this big array near the top of the IIFE, right after `GM_addStyle(...)` but before `TRACKED_SITES`:

```javascript
const MESSAGES = [
  // A. 嘲讽计数 (uses {n})
  '第 {n} 次了。你的"工作时间"概念真有意思。',
  '今天第 {n} 次。比你今天写的代码行数都多。',
  '{n} 次。再来。继续。这就是你的人生。',
  '数到 {n} 了。下次我懒得数。',
  '第 {n} 次进来。看起来你是真的离不开它。',
  '{n} 次。你的自尊还剩几两？',
  '{n}。这数字以后只会更大。',
  '{n}。今天唯一稳定增长的指标。',
  '又一次。{n}。还想刷新记录吗。',
  '第 {n} 次。你打开它的速度比打开 IDE 还快。',
  '{n} 次了，你心里有数吗。',
  '{n}。今天的 Top 1 KPI。',
  '第 {n} 次。这频率，发工资也该按这个发了。',
  '{n}。你以为我不会数。',
  '{n}。要不要给自己颁个"今日最勤奋分心奖"。',
  '第 {n} 次了，连你自己都觉得离谱了吧。',
  '{n}。你的注意力是按秒卖给它的。',
  '{n}。你跟它的关系比跟你客户都熟。',
  '{n}。我已经替你尴尬了。',
  '第 {n} 次。这条记录会一直涨。除非你停。',
  '{n}。你觉得这是个值得维护的 streak 吗。',
  '第 {n} 次。已经从"分心"变成"沉迷"了。',
  '{n}。这数字看着不像今天能停。',
  '{n}。再点一次，是 {n}+1。这就是数学。',
  '第 {n} 次。一个像样的人不会让这数字到这。',

  // B. 拆穿自欺
  '"就看 5 分钟" —— 这话你骗自己骗了几年了。',
  '你说你"只是来放松一下"。然后呢。',
  '你以为这次会不一样吗。不会。',
  '你给自己的借口越来越短，越来越糊弄。',
  '"刷完更有灵感"。上次刷完发生了什么，还记得吗。',
  'AI 还在跑你就来这里了。说好的"光标留在原地"呢。',
  '"我就看一眼"。"一眼"今天值多少分钟了。',
  '你不是在休息，你在逃避。区别你心里清楚。',
  '"我太累了所以我得放松一下" —— 你今天写了几行代码。',
  '你说服不了自己。你只是在闭眼。',
  '"刷完我就工作"。这话你今天说了第几次了。',
  '你不是没时间，你只是没把时间花在该花的地方。',
  '"脑子需要休息" —— 你脑子最累的不是工作，是愧疚。',
  '你打开它的那一秒，理由是事后编的。',
  '你再点一次，"自我控制"四个字就别提了。',
  '"看完这个就关" —— 上一次成功是什么时候。',
  '你以为划走信息流的速度等于工作的速度。它不是。',
  '"我只是切换一下脑子"。脑子不会换得这么慢。',
  '你的"放松"已经超过工作时间。这叫主业了。',
  '你不缺方法，你缺勇气面对那个让你来这刷的卡点。',
  '"刷完这个就回去"。你信吗。我不信。',
  '你回避的那件事，刷它不会消失。',
  '你不是在等灵感。你在等时间过完。',
  '你用"无聊"骗自己。其实你是在怕。',
  '真要放松也轮不到这 —— 这是麻醉，不是放松。',

  // C. 直球
  '垃圾时间。',
  '又来当废物。',
  '继续浪费今天。心安理得。',
  '你正在变成你最瞧不起的那种人。',
  '看着屏幕的这个人，是你想成为的人吗。',
  '你在用一辈子，逃避一小时的卡点。',
  '醒醒。',
  '你以为你还有时间。',
  '你在杀今天。',
  '把这一刻乘以 365，那是你的一年。',
  '这就是你今天的样子。',
  '你的自律值此刻为零。',
  '你下次回头看现在，会想揍自己。',
  '浪费你时间最多的人是你自己。',
  '你正在主动把脑子洗成糊。',
  '你不是没意识到，你只是不在乎。',
  '这不是放松，这是 self-sabotage。',
  '你这是在往烂里走。',
  '关掉。现在。',
  '你能做的最有用的事就是关掉这个 tab。',
  '这是你今天最差的决定之一。',
  '别装作"控制不住" —— 这是你做的选择。',
  '你今天又输给了自己。',
  '没人逼你。是你自己来的。',
  '30 分钟后你不会记得你看了什么。',

  // D. 自由职业身份痛点
  '没人替你打卡，也没人替你交活儿。',
  '客户的钱不是靠刷出来的。',
  'Builder？还以为自己是个 builder 呢。',
  '你的同行此刻正在写代码。',
  '下个月房租谁付。',
  '5 年后你还是在这个屏幕前面。',
  '你接的活儿，这种状态交付不了。',
  '你今天没产出，等于今天没赚钱。',
  '自由职业是没人管你 —— 这是好事，也是凶器。',
  '你不上班，你只是把工作时间延后了。',
  '别人下班你还在刷，你不是自由，是失控。',
  '没有同事盯着你，所以盯你的得是你自己。',
  '你不是 founder，你只是个没人管的人。',
  '自由 ≠ 自由刷视频。',
  '你给客户的承诺，你自己记得吗。',
  '你的工时是你卖的产品。今天的产品是垃圾。',
  '没人替你 ship。',
  '你以为不签到就是自由，其实是没人帮你兜底。',
  '别人在搭产品，你在搭茧。',
  '你今天的输出能跟客户解释吗。',
  '你为什么辞职出来做自由 —— 为这个吗。',
  '课程里学的"AI workflow"，今天你 workflow 了几行。',
  '一个真 builder，今天会这么过吗。',
  '你的对手是更勤奋的版本的你自己。今天他赢了。',
  '这就是为什么大多数自由职业者活得很惨。',
];

function pickMessage(n) {
  const raw = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
  return raw.replace(/\{n\}/g, n);
}
```

- [ ] **Step 2: Replace placeholder with real pick**

Replace the bottom of the IIFE — change:

```javascript
const n = incrementCounter(site.key);
const placeholder = `[TEST] 第 ${n} 次。这条消息是占位用的。`;
injectBanner(placeholder, n);
sessionStorage.setItem('focus-banner-shown', 'true');
```

with:

```javascript
const n = incrementCounter(site.key);
const message = pickMessage(n);
injectBanner(message, n);
sessionStorage.setItem('focus-banner-shown', 'true');
```

- [ ] **Step 3: Reload script and verify message variety**

1. Open 8-10 new tabs to bilibili.com one at a time
2. Confirm: messages vary across visits; you see a mix of all 4 categories (counter mocks, self-deception calls, direct insults, freelancer stings)
3. Look for an A-category message (contains a number) — verify `{n}` is correctly replaced (e.g., "第 7 次了。" not "第 {n} 次了。")
4. Look for a non-A message — verify it does NOT contain `{n}` (no broken placeholder leaking)

- [ ] **Step 4: Commit**

```bash
git add focus-banner.user.js
git commit -m "feat: add 100-message pool with random selection"
```

---

### Task 9: Bonus — View Today's Counter Menu Command

**Files:**
- Modify: `focus-banner/focus-banner.user.js`

- [ ] **Step 1: Add showTodayCounts()**

Add this function in the IIFE, immediately below `toggleWorkMode`:

```javascript
function showTodayCounts() {
  let counter;
  try {
    counter = JSON.parse(GM_getValue('counter', '{}'));
  } catch (e) {
    counter = {};
  }
  const today = todayKey();
  const data = counter[today] || {};

  const labelByKey = {};
  TRACKED_SITES.forEach(s => { labelByKey[s.key] = s.label; });

  const entries = Object.entries(data);
  const text = entries.length
    ? entries.map(([k, n]) => `${labelByKey[k] || k}: ${n}`).join('\n')
    : '今天还没有访问记录';

  GM_notification({
    title: `今日分心计数 (${today})`,
    text,
    timeout: 5000
  });
}
```

- [ ] **Step 2: Register the new menu command**

Find this existing line:

```javascript
GM_registerMenuCommand('🔥 切换 Work Mode', toggleWorkMode);
```

Add right after it:

```javascript
GM_registerMenuCommand('📊 查看今日计数', showTodayCounts);
```

- [ ] **Step 3: Reload script and verify**

1. With Work Mode ON, visit bilibili.com twice (in 2 separate new tabs) and youtube.com once (1 new tab)
2. Click Tampermonkey extension icon → "📊 查看今日计数"
3. Notification appears with text:
   ```
   B 站: 2
   YouTube: 1
   ```
4. To test the empty-state branch: in Tampermonkey dashboard → script → Storage → edit the `counter` JSON to remove today's date entirely. Click the menu command → notification: "今天还没有访问记录"

- [ ] **Step 4: Commit**

```bash
git add focus-banner.user.js
git commit -m "feat: add 'view today counts' menu command"
```

---

### Task 10: Final Spec Checklist + Polish

**Files:**
- Modify (only if fixes needed): `focus-banner/focus-banner.user.js`

- [ ] **Step 1: Run all 13 items from the spec testing section**

Open `docs/superpowers/specs/2026-05-09-focus-banner-design.md`, scroll to "测试方案", and walk through every row. The condensed list:

| # | 步骤 | 期望 |
|---|---|---|
| 1 | 全新装脚本（或先 toggle 到 OFF），访问 B 站 | banner 不弹 |
| 2 | Tampermonkey 菜单 → 切换 Work Mode | 通知 "Work Mode: ON 🔥" |
| 3 | 访问 bilibili.com（新 tab） | banner 弹，含计数；A 类含 "第 1 次"，非 A 类直球文案 |
| 4 | 同 tab 点开一个视频 | banner 不再弹 |
| 5 | 新 tab 再开 bilibili.com | banner 弹，count = 2 |
| 6 | 等 5 秒 | banner 塌缩到右上角圆点显示 `·2` |
| 7 | 点圆点 | banner 重新展开 |
| 8 | 点 × | banner 立即塌缩 |
| 9 | 4 站各开一个新 tab | 每站独立计数 |
| 10 | 菜单 → 查看今日计数 | 通知列出各站今日次数 |
| 11 | 菜单 → 切换 Work Mode | 通知 "Work Mode: OFF 💤" |
| 12 | 访问 B 站（新 tab） | banner 不弹 |
| 13 | 第二天首次访问任一站 | 该站计数从 1 重新开始 |

For #13 without waiting until tomorrow: in Tampermonkey dashboard → script → Storage → edit the `counter` JSON to delete today's date entry, save. Visit B 站 → count restarts at 1.

- [ ] **Step 2: For each failed item, fix in script and re-run**

Diagnose with DevTools console + Tampermonkey storage inspector. Common failure modes and fixes:

- **Banner doesn't appear on a specific site**: that site's CSP may block inline `<style>` — confirm `GM_addStyle` is in `@grant` (Task 1)
- **Banner z-index too low**: bump to `2147483647`
- **Notification doesn't show**: check OS notification permissions for the browser
- **Counter not resetting next day**: check `todayKey()` output in console; should be local date in `YYYY-MM-DD`

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add focus-banner.user.js
git commit -m "fix: polish from 13-item spec checklist"
```

If no fixes were needed, skip the commit.

- [ ] **Step 4: (Optional) Strip debug logs for daily use**

The `console.log('[focus-banner] loaded on...')` at the bottom of the IIFE is harmless but noisy. If you want a quieter console, remove it. Personal preference — leaving it in is also fine for a personal userscript and aids future debugging.

---

## Done.

The userscript is now:
- A single ~250-line file (`focus-banner.user.js`)
- Self-contained, no build step, no dependencies
- Distributable via copy-paste into Tampermonkey

**To rotate the message pool in the future**: edit the `MESSAGES` array directly.

**To add another tracked site**: add an entry to `TRACKED_SITES` (with a unique `key`).

**To upgrade to AI-generated messages**: see the spec's "未来升级路径" section (path B).
