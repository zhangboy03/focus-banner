# Focus Banner

> A sharp shame banner that interrupts you when you visit Bilibili / Xiaohongshu / YouTube / X — a non-blocking distraction tool for freelancers.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Userscript](https://img.shields.io/badge/userscript-Tampermonkey-00485B.svg)](https://www.tampermonkey.net/)
[![中文](https://img.shields.io/badge/README-中文-red.svg)](./README.md)

```
┌─────────────────────────────────────────────────────────────┐
│ Visit #7 today. If this isn't an addiction, what is?     ×  │
└─────────────────────────────────────────────────────────────┘
```

Auto-collapses to a corner red dot after 5 seconds. Your peripheral vision always catches it — non-blocking, but uncomfortable.

## Why I Built This

I'm a freelancer, and my worst distraction isn't my phone — it's the **idle-time gap when AI runs long tasks**. I fire a Claude Code request, wait 30 seconds to 2 minutes, and reflexively switch to Bilibili / Xiaohongshu / YouTube / X. Once I switch over, I don't come back.

Things I tried that didn't work:
- **Hard blockers (HostBlock)**: too rigid. I unblock once for "real research" and the day collapses into "I guess I'm off today."
- **Pomodoro**: too ceremonial. AI waits are 30-second scale; Pomodoros are 25-minute scale. The cadence doesn't match.
- **Willpower**: ha.

So I built this — **a non-blocking shame banner**: you can still browse, but a sharp message yells at you from the top, then collapses into a corner dot. A daily per-site visit counter shames you with your own data.

## Install

Requires the [Tampermonkey](https://www.tampermonkey.net/) browser extension (Chrome / Firefox / Edge / Safari, free).

**One-click install** (recommended):

[👉 Click here to install](https://raw.githubusercontent.com/zhangboy03/focus-banner/main/focus-banner.user.js)

Tampermonkey auto-detects the userscript and shows a confirmation page. Click "Install".

**Manual install**:

1. Open Tampermonkey dashboard → "+" → "New script"
2. Paste the contents of [`focus-banner.user.js`](./focus-banner.user.js)
3. Save with `Cmd+S` / `Ctrl+S`

## Usage

The script is OFF by default. Click the Tampermonkey extension icon to see four commands:

| Command | What it does |
| --- | --- |
| 🔥 切换 Work Mode (Toggle) | Turn the banner on/off |
| 📊 查看今日计数 (View today's counts) | Notification with per-site visit counts |

When Work Mode is ON:

- Visit any tracked site → a sharp banner drops from the top
- After 5 seconds, it auto-collapses to a small dot in the upper-right corner
- Click the dot to expand again. Click × to collapse immediately
- Each tab shows the banner only once (refreshing won't re-trigger it)

When OFF, the banner never appears.

## Customizing

Messages live in the `MESSAGES` array in [`focus-banner.user.js`](./focus-banner.user.js) (100 entries across four flavors: counter mocking, calling out self-deception, direct insults, freelancer identity stings). Replace with your own:

```js
const MESSAGES = [
  'You again? Are you even trying?',
  'This minute of scrolling — is it paying next month\'s rent?',
  // ...
];
```

Add more sites via `TRACKED_DOMAINS`:

```js
const TRACKED_DOMAINS = [
  { domain: 'bilibili.com',    name: 'Bilibili' },
  { domain: 'xiaohongshu.com', name: 'Xiaohongshu' },
  { domain: 'youtube.com',     name: 'YouTube' },
  { domain: 'x.com',           name: 'X' },
  // Your additions:
  { domain: 'reddit.com',      name: 'Reddit' },
];
```

## Design Decisions

A few choices worth calling out:

- **Non-blocking by design**: blockers always get disabled eventually because "I just need to look up one thing." A banner lets you keep browsing but makes you **feel bad** about it — the discomfort is sustainable.
- **Manual toggle, no integrations**: no Pomodoro hooks, no Focus mode, no auto-start. **Pressing the toggle is the ritual** — it's an explicit "I'm choosing to focus now" gesture.
- **One banner per tab session**: marked via `sessionStorage` so it doesn't re-pop on every interaction. Counters use `GM_setValue` (cross-domain) and roll over at local midnight via `YYYY-MM-DD` keys.
- **Sharp tone, not gentle**: tested gentler messages — they bounce off. You're too good at rationalizing past polite reminders. 100 randomized messages avoid habituation.

## Tech Stack

- Single-file Tampermonkey userscript (no build step)
- `GM_*` APIs: `GM_setValue` / `GM_getValue` (cross-domain storage), `GM_registerMenuCommand` (menu hooks), `GM_addStyle` (CSS injection)
- DOM constructed via `document.createElement` — **not** `innerHTML` (YouTube / GitHub / Google enforce Trusted Types CSP)
- Counters keyed by local-timezone `YYYY-MM-DD` so they expire naturally at midnight

## Contributing

PRs and issues welcome — message contributions, new sites, UI tweaks.

## License

[MIT](./LICENSE) © 2026 zhangboy03
