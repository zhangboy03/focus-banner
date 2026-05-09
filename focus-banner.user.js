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
      transition: top .35s cubic-bezier(.4,0,.2,1),
                  right .35s cubic-bezier(.4,0,.2,1),
                  width .35s cubic-bezier(.4,0,.2,1),
                  height .35s cubic-bezier(.4,0,.2,1),
                  border-radius .35s cubic-bezier(.4,0,.2,1),
                  background .35s cubic-bezier(.4,0,.2,1),
                  padding .35s cubic-bezier(.4,0,.2,1);
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
      <button class="close" aria-label="collapse">×</button>
    `;
    banner.querySelector('.text').textContent = message;

    let collapseTimer = null;
    const scheduleCollapse = () => {
      if (collapseTimer) clearTimeout(collapseTimer);
      collapseTimer = setTimeout(() => banner.classList.add('collapsed'), 5000);
    };

    // Click on the collapsed pill re-expands
    banner.addEventListener('click', (e) => {
      if (e.target.classList.contains('close')) return; // × handled separately
      if (banner.classList.contains('collapsed')) {
        banner.classList.remove('collapsed');
        scheduleCollapse();
      }
    });

    // × button collapses immediately
    banner.querySelector('.close').addEventListener('click', (e) => {
      e.stopPropagation();
      if (collapseTimer) clearTimeout(collapseTimer);
      banner.classList.add('collapsed');
    });

    // @run-at document_idle guarantees document.body is ready
    document.body.appendChild(banner);

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

  GM_registerMenuCommand('🔥 切换 Work Mode', toggleWorkMode);
  GM_registerMenuCommand('📊 查看今日计数', showTodayCounts);

  const site = getCurrentSite();
  if (!site) return;

  console.log('[focus-banner]', site.label, '| work-mode:', GM_getValue('work-mode', false));

  if (!GM_getValue('work-mode', false)) return;
  if (sessionStorage.getItem('focus-banner-shown') === 'true') return;

  const n = incrementCounter(site.key);
  const message = pickMessage(n);
  injectBanner(message, n);
  sessionStorage.setItem('focus-banner-shown', 'true');
})();
