# Focus Banner

> 逛 B 站 / 小红书 / YouTube / X 时弹一句犀利文案打断分心 — 自由职业者的反摸鱼浏览器插件

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Userscript](https://img.shields.io/badge/userscript-Tampermonkey-00485B.svg)](https://www.tampermonkey.net/)
[![English](https://img.shields.io/badge/README-English-blue.svg)](./README.en.md)

```
┌─────────────────────────────────────────────────────────────┐
│ 第 7 次了。这都不算上瘾算什么？                          ×  │
└─────────────────────────────────────────────────────────────┘
```

5 秒后自动收起到右下角小红点，眼角余光始终能瞄到 — 不阻断浏览，但让你不舒服。

## 为什么做这个

我是自由职业者，最严重的分心场景不是手机，而是**用 AI 跑长任务时的等待时段**：发出去一个 Claude Code 任务、等 30 秒到 2 分钟出结果，下意识切到 B 站 / 小红书 / YouTube / X，一旦切过去就回不来了。

试过的方案都不行：
- **硬屏蔽（HostBlock）**：太刚，临时查资料就要解禁，最后变成"算了今天放假吧"。
- **番茄钟**：仪式感太重，AI 等待是 30 秒级的，番茄钟是 25 分钟级的，节奏对不上。
- **自律**：呵呵。

所以做了这个 — **非阻断的羞辱式 banner**：你照样能逛，但顶上有一句话直接骂你；5 秒后收成角落小红点，余光始终能看见。每天每个站点的访问次数也帮你记着，让你自己看数据脸红。

## 安装

需要先装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展（Chrome / Firefox / Edge / Safari 都支持，免费）。

**一键安装**（推荐）：

[👉 点这里安装](https://raw.githubusercontent.com/zhangboy03/focus-banner/main/focus-banner.user.js)

Tampermonkey 会自动识别脚本并弹出确认页面，点 "Install" 即可。

**手动安装**：

1. 打开 Tampermonkey dashboard → 点 "+" 新建脚本
2. 复制 [`focus-banner.user.js`](./focus-banner.user.js) 全部内容粘贴进去
3. `Cmd+S` / `Ctrl+S` 保存

## 使用

默认是关闭状态（OFF）。点击浏览器右上角 Tampermonkey 图标会看到 4 个命令：

| 命令 | 作用 |
| --- | --- |
| 🔥 切换 Work Mode | 开/关 banner（仪式感开关） |
| 📊 查看今日计数 | 弹通知显示今天每个站点的访问次数 |

打开 Work Mode 后：

- 访问 B 站 / 小红书 / YouTube / X 任意页面，顶部立刻弹出一条犀利 banner
- 5 秒后自动收成右上角的小红点（不打断你正在做的事）
- 点小红点重新展开，再点 × 立刻收起
- 每个 tab 只弹一次，刷新页面也不会重弹

关掉 Work Mode 后，banner 立即停止出现。

## 自定义

文案在 [`focus-banner.user.js`](./focus-banner.user.js) 里的 `MESSAGES` 数组（100 条，分四类：计数嘲讽 / 自欺打脸 / 直接侮辱 / 自由职业者刺痛）。改成你自己的语气：

```js
const MESSAGES = [
  '你又来了，还有救吗？',
  '这一刻摸的鱼，下个月房租付吗？',
  // ...
];
```

加站点：改 `TRACKED_DOMAINS` 数组：

```js
const TRACKED_DOMAINS = [
  { domain: 'bilibili.com',    name: 'B 站' },
  { domain: 'xiaohongshu.com', name: '小红书' },
  { domain: 'youtube.com',     name: 'YouTube' },
  { domain: 'x.com',           name: 'X' },
  // 加你想监控的：
  { domain: 'zhihu.com',       name: '知乎' },
];
```

## 设计取舍

几个有意思的决定：

- **不阻断**：阻断式工具最后都会被自己关掉，因为"我现在就需要查一下"。Banner 让你照常浏览，但通过羞辱 + 计数让你**自己感到不舒服**，这个不舒服是可持续的。
- **手动开关**：不联动番茄钟、不接 Focus 模式、不自动启动。**开 Work Mode 这个动作本身是仪式感**，主动按下表示"接下来我要专注"。
- **每个 tab 只弹一次**：用 `sessionStorage` 标记，避免同 tab 内反复触发干扰。计数器走 `GM_setValue`（跨域），按本地日期切日，午夜自动清零。
- **文案够狠**：测试过偏温和的版本，没有效果 — 你太容易绕过自己的廉价道德。100 条文案随机轮换避免麻木。

## 技术栈

- 单文件 Tampermonkey userscript（无构建步骤）
- `GM_*` API：`GM_setValue` / `GM_getValue`（跨域存储）、`GM_registerMenuCommand`（菜单命令）、`GM_addStyle`（样式注入）
- DOM 通过 `document.createElement` 构造（**不能**用 `innerHTML` — YouTube / GitHub 等启用了 Trusted Types CSP 会拦截）
- 跨 tab 计数器用本地时区 `YYYY-MM-DD` 作为 key，午夜自然过期

## 贡献

欢迎 PR / Issue。文案建议、新站点支持、UI 改进都可以。

## License

[MIT](./LICENSE) © 2026 zhangboy03
