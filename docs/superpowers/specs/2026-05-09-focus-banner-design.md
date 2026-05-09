# Focus Banner — 浏览器分心提醒系统设计

**Date**: 2026-05-09
**Author**: Boyu Zhang (with Claude)
**Status**: Draft — pending user review

## 背景

自由职业者 Boyu 在使用 AI 工具（Claude Code 等）时，AI 处理任务的等待真空（30 秒到 5 分钟）会触发肌肉记忆，切换到 B 站 / 小红书 / X / YouTube 找填充。已经评估过的"屏蔽式"方案（Cold Turkey、LeechBlock 全站屏蔽）有两个问题：

1. 这些站日常工作仍需访问（搜教程、查资料、看特定账号）
2. 完全屏蔽容易激发"对抗系统"反弹

本设计采用「非阻断 + 自我意识」路径：访问目标站时**不阻止**，但在页面顶部插入一条犀利嘲讽 banner 配合每日访问计数，让用户「被看见」。配合手动 Work Mode 开关，提供进入工作状态的仪式感。

## 目标 / 非目标

### MVP 目标

- 用户在 Tampermonkey 扩展菜单点击「切换 Work Mode」开启 / 关闭工作模式
- Work Mode = ON 且访问 4 个目标站点时：
  - 顶部弹一条 banner，含「今天第 N 次」+ 一条随机犀利文案
  - 5 秒后自动塌缩到右上角小圆点
  - 同 tab 内导航不重弹
- 计数每日 0:00 自然重置，按站独立
- 100 条狠话池
- bonus：菜单命令「查看今日计数」弹通知显示各站今日次数

### 非目标（明确不做）

- 阻止访问
- macOS Focus 联动（手动 toggle 替代）
- must-ship 待办集成
- AI 实时生成文案（留作日后升级）
- 多设备同步
- 工作时段判断（Work Mode 开关已替代）

## 架构

单一 Tampermonkey 用户脚本。无后端，无网络请求，无外部依赖。

### `@match`

```
@match *://*/*
```

全站匹配，目的是让 Tampermonkey 菜单命令「切换 Work Mode」在任意页面都可见。脚本主体逻辑（banner、计数）只在 hostname 命中目标站点时执行。非目标站点上脚本的工作只有「注册菜单命令」，开销可忽略。

### Userscript 头部

```js
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
```

### 目标站点表

```js
const TRACKED_SITES = {
  'bilibili.com':    { key: 'bilibili',    label: 'B 站' },
  'xiaohongshu.com': { key: 'xiaohongshu', label: '小红书' },
  'youtube.com':     { key: 'youtube',     label: 'YouTube' },
  'x.com':           { key: 'x',           label: 'X' },
  'twitter.com':     { key: 'x',           label: 'X' }  // legacy
};
```

匹配规则：`location.hostname === domain || location.hostname.endsWith('.' + domain)`。注意：不能直接用 `hostname.endsWith(domain)`，否则 `notbilibili.com` 会被误判命中。

## 组件

### 1. Toggle 控件

#### 状态存储

`GM_setValue('work-mode', boolean)` — Tampermonkey 自带的跨站存储，不受浏览器 localStorage per-domain 隔离影响。

**默认值**：`false`（OFF）。仪式感优先 — 用户必须主动开启。

#### 切换命令

```js
GM_registerMenuCommand('🔥 切换 Work Mode', () => {
  const next = !GM_getValue('work-mode', false);
  GM_setValue('work-mode', next);
  GM_notification({
    title: 'Focus Banner',
    text: `Work Mode: ${next ? 'ON' : 'OFF'}`,
    timeout: 2000
  });
});
```

#### 计数查看命令（bonus）

```js
GM_registerMenuCommand('📊 查看今日计数', () => {
  const today = todayKey();
  const counter = JSON.parse(GM_getValue('counter', '{}'));
  const data = counter[today] || {};
  const entries = Object.entries(data);
  const summary = entries.length
    ? entries.map(([k, n]) => `${SITES_BY_KEY[k]}: ${n}`).join('\n')
    : '今天还没有访问记录';
  GM_notification({ title: '今日分心计数', text: summary, timeout: 5000 });
});
```

### 2. 数据层

#### 计数器（GM_setValue）

键：`counter`
值（JSON 字符串化）：

```json
{
  "2026-05-09": {
    "bilibili": 7,
    "xiaohongshu": 2,
    "youtube": 0,
    "x": 4
  },
  "2026-05-08": { ... }
}
```

每日首次访问会自动建立当日键。旧日期保留作历史，未来可视化用。无主动清理（30 天数据 ~几 KB，不必）。

**`todayKey()` 定义**：`new Date().toLocaleDateString('en-CA')` —— 输出本地时区的 `YYYY-MM-DD`（en-CA locale 强制 ISO 格式）。这意味着「今天」按用户本地工作日划分，凌晨过 0:00 计数自然重置。

**已知限制（接受）**：同时打开多个 tab 到同一站点存在 GM_setValue 读改写竞态——理论上 4 tab 同时打开，计数可能只 +1 而非 +4。MVP 阶段接受此精度损失（计数本就是粗略指标，且人类几乎不会瞬时打开多个 tab）。

#### 会话标记（sessionStorage）

键：`focus-banner-shown`
值：`"true"` 或不存在

每 tab 一份，避免同 tab 内导航重复弹 banner。tab 关闭后自动清空，新 tab 重新触发。

### 3. Banner UI

#### DOM

```html
<div id="focus-banner" class="expanded">
  <span class="text"><!-- 文案，{n} 已替换 --></span>
  <button class="close" aria-label="close">×</button>
</div>
```

#### 样式（关键属性）

```css
#focus-banner {
  position: fixed; top: 0; left: 0; right: 0;
  z-index: 999999;
  background: #1a1a1a; color: #fff;
  padding: 12px 24px;
  font: 500 15px/1.4 -apple-system, system-ui, sans-serif;
  transition: all .35s ease;
}

#focus-banner.collapsed {
  top: 12px; left: auto; right: 12px;
  width: 36px; height: 36px;
  padding: 0; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: #c0392b;
}

#focus-banner.collapsed .text { display: none; }
#focus-banner.collapsed::before { content: attr(data-count); }
#focus-banner.collapsed .close { display: none; }
```

#### 行为

- 注入后 5 秒，加 `collapsed` 类
- 点圆点 → 移除 `collapsed`，再 5 秒后回到 collapsed
- 点 `×` → 立即 `collapsed`，无视计时
- `data-count` 属性存当前计数 `n`，collapsed 时显示

### 4. 文案池

100 条字符串，硬编码成数组，分四类。`{n}` 占位符在 A 类中由当日计数替换。完整列表见**附录 A**。

进站时随机均匀抽取一条（无类别偏向）。

## 数据流

```
页面加载（@match *://*/*）
  ↓
注册 GM_registerMenuCommand × 2（切换 Work Mode + 查看计数）
  ↓
hostname 不在 TRACKED_SITES → 退出
  ↓
GM_getValue('work-mode', false) === false → 退出
  ↓
sessionStorage["focus-banner-shown"] === "true" → 退出
  ↓
JSON.parse(GM_getValue('counter', '{}'))
  → data[今日][站点] = (existing || 0) + 1
  → GM_setValue('counter', JSON.stringify(data))
  ↓
n = data[今日][站点]
message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
        .replace('{n}', n)
  ↓
注入 banner DOM，textContent = message，data-count = n
  ↓
setTimeout(5000) → element.classList.add('collapsed')
  ↓
sessionStorage.setItem('focus-banner-shown', 'true')
```

## 错误处理

原则：任何失败都安静吞掉，banner 是辅助系统，挂掉应该完全无感。

| 故障点 | 处理 |
|---|---|
| `GM_getValue` 读失败 | 视为初次状态（OFF） |
| `JSON.parse(counter)` 失败 | 重置该 key 为 `'{}'`，继续 |
| DOM 注入失败（CSP 严格站点） | `console.warn`，退出，不影响计数器 |
| `GM_notification` 不可用 | 降级到 `alert()` |
| `document.body` 还没就绪 | 监听 `DOMContentLoaded` 后再注入 |

## 测试方案

手动验收清单（无单元测试，MVP 阶段不需要）：

| # | 步骤 | 期望 |
|---|---|---|
| 1 | 全新装脚本，访问 B 站 | banner 不弹（默认 OFF） |
| 2 | Tampermonkey 菜单 → 切换 Work Mode | 通知 "Work Mode: ON" |
| 3 | 访问 bilibili.com | banner 弹，文案含 "第 1 次" |
| 4 | 同 tab 点开一个视频 | banner 不再弹 |
| 5 | 新 tab 再开 bilibili.com | banner 弹，文案含 "第 2 次" |
| 6 | 等 5 秒 | banner 塌缩到右上角圆点，显示 [·2] |
| 7 | 点圆点 | banner 重新展开 |
| 8 | 点 × | banner 立即塌缩 |
| 9 | 4 站各开一个新 tab | 每站独立计数 |
| 10 | 菜单 → 查看今日计数 | 通知列出各站今日次数 |
| 11 | 菜单 → 切换 Work Mode | 通知 "Work Mode: OFF" |
| 12 | 访问 B 站 | banner 不弹 |
| 13 | 第二天首次访问任一站 | 该站计数从 1 重新开始 |

## 部署

1. 安装 Tampermonkey 浏览器扩展（Chrome/Firefox/Edge 免费；Safari 用 Userscripts 替代）
2. Tampermonkey dashboard → 「+」 新建脚本
3. 粘贴 `focus-banner.user.js` 全文，保存
4. 第一次开启：点 Tampermonkey 图标 → 「切换 Work Mode」

## 未来升级路径（不在 MVP）

- **B**: 文案池外部化为 `link.zhangboy.xyz/banner-messages.json`，每周通过 Claude Code 调用 LLM 自动生成新池
- **C**: 接入 must-ship，banner 文案动态拼入「今天还剩 X 件」
- **D**: macOS Focus 自动联动（替代手动 toggle，需要本地 HTTP 桥）
- **E**: 历史数据可视化（已有 30 天数据，写个简单 dashboard）
- **F**: 跨设备状态同步（手机也能看 banner）

---

## 附录 A：文案池（100 条）

### A. 嘲讽计数（25 条，含 `{n}`）

```
1.  第 {n} 次了。你的"工作时间"概念真有意思。
2.  今天第 {n} 次。比你今天写的代码行数都多。
3.  {n} 次。再来。继续。这就是你的人生。
4.  数到 {n} 了。下次我懒得数。
5.  第 {n} 次进来。看起来你是真的离不开它。
6.  {n} 次。你的自尊还剩几两？
7.  {n}。这数字以后只会更大。
8.  {n}。今天唯一稳定增长的指标。
9.  又一次。{n}。还想刷新记录吗。
10. 第 {n} 次。你打开它的速度比打开 IDE 还快。
11. {n} 次了，你心里有数吗。
12. {n}。今天的 Top 1 KPI。
13. 第 {n} 次。这频率，发工资也该按这个发了。
14. {n}。你以为我不会数。
15. {n}。要不要给自己颁个"今日最勤奋分心奖"。
16. 第 {n} 次了，连你自己都觉得离谱了吧。
17. {n}。你的注意力是按秒卖给它的。
18. {n}。你跟它的关系比跟你客户都熟。
19. {n}。我已经替你尴尬了。
20. 第 {n} 次。这条记录会一直涨。除非你停。
21. {n}。你觉得这是个值得维护的 streak 吗。
22. 第 {n} 次。已经从"分心"变成"沉迷"了。
23. {n}。这数字看着不像今天能停。
24. {n}。再点一次，是 {n}+1。这就是数学。
25. 第 {n} 次。一个像样的人不会让这数字到这。
```

### B. 拆穿自欺（25 条）

```
26. "就看 5 分钟" —— 这话你骗自己骗了几年了。
27. 你说你"只是来放松一下"。然后呢。
28. 你以为这次会不一样吗。不会。
29. 你给自己的借口越来越短，越来越糊弄。
30. "刷完更有灵感"。上次刷完发生了什么，还记得吗。
31. AI 还在跑你就来这里了。说好的"光标留在原地"呢。
32. "我就看一眼"。"一眼"今天值多少分钟了。
33. 你不是在休息，你在逃避。区别你心里清楚。
34. "我太累了所以我得放松一下" —— 你今天写了几行代码。
35. 你说服不了自己。你只是在闭眼。
36. "刷完我就工作"。这话你今天说了第几次了。
37. 你不是没时间，你只是没把时间花在该花的地方。
38. "脑子需要休息" —— 你脑子最累的不是工作，是愧疚。
39. 你打开它的那一秒，理由是事后编的。
40. 你再点一次，"自我控制"四个字就别提了。
41. "看完这个就关" —— 上一次成功是什么时候。
42. 你以为划走信息流的速度等于工作的速度。它不是。
43. "我只是切换一下脑子"。脑子不会换得这么慢。
44. 你的"放松"已经超过工作时间。这叫主业了。
45. 你不缺方法，你缺勇气面对那个让你来这刷的卡点。
46. "刷完这个就回去"。你信吗。我不信。
47. 你回避的那件事，刷它不会消失。
48. 你不是在等灵感。你在等时间过完。
49. 你用"无聊"骗自己。其实你是在怕。
50. 真要放松也轮不到这 —— 这是麻醉，不是放松。
```

### C. 直球（25 条）

```
51. 垃圾时间。
52. 又来当废物。
53. 继续浪费今天。心安理得。
54. 你正在变成你最瞧不起的那种人。
55. 看着屏幕的这个人，是你想成为的人吗。
56. 你在用一辈子，逃避一小时的卡点。
57. 醒醒。
58. 你以为你还有时间。
59. 你在杀今天。
60. 把这一刻乘以 365，那是你的一年。
61. 这就是你今天的样子。
62. 你的自律值此刻为零。
63. 你下次回头看现在，会想揍自己。
64. 浪费你时间最多的人是你自己。
65. 你正在主动把脑子洗成糊。
66. 你不是没意识到，你只是不在乎。
67. 这不是放松，这是 self-sabotage。
68. 你这是在往烂里走。
69. 关掉。现在。
70. 你能做的最有用的事就是关掉这个 tab。
71. 这是你今天最差的决定之一。
72. 别装作"控制不住" —— 这是你做的选择。
73. 你今天又输给了自己。
74. 没人逼你。是你自己来的。
75. 30 分钟后你不会记得你看了什么。
```

### D. 自由职业身份痛点（25 条）

```
76. 没人替你打卡，也没人替你交活儿。
77. 客户的钱不是靠刷出来的。
78. Builder？还以为自己是个 builder 呢。
79. 你的同行此刻正在写代码。
80. 下个月房租谁付。
81. 5 年后你还是在这个屏幕前面。
82. 你接的活儿，这种状态交付不了。
83. 你今天没产出，等于今天没赚钱。
84. 自由职业是没人管你 —— 这是好事，也是凶器。
85. 你不上班，你只是把工作时间延后了。
86. 别人下班你还在刷，你不是自由，是失控。
87. 没有同事盯着你，所以盯你的得是你自己。
88. 你不是 founder，你只是个没人管的人。
89. 自由 ≠ 自由刷视频。
90. 你给客户的承诺，你自己记得吗。
91. 你的工时是你卖的产品。今天的产品是垃圾。
92. 没人替你 ship。
93. 你以为不签到就是自由，其实是没人帮你兜底。
94. 别人在搭产品，你在搭茧。
95. 你今天的输出能跟客户解释吗。
96. 你为什么辞职出来做自由 —— 为这个吗。
97. 课程里学的"AI workflow"，今天你 workflow 了几行。
98. 一个真 builder，今天会这么过吗。
99. 你的对手是更勤奋的版本的你自己。今天他赢了。
100. 这就是为什么大多数自由职业者活得很惨。
```
