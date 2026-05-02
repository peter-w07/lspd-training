# LSPD Training Website

🌐 **Live:** [lspdtraining.peterwild.pw](https://lspdtraining.peterwild.pw)

I was going through the BadlandsRP LSPD academy and wanted a Quizlet-style experience to drill the laws, SOPs, codes, and procedures. I couldn't find anything that worked the way I wanted, so I built one. This is that.

Built against the BadlandsRP LSPD curriculum as of **May 2, 2026**. Roleplay rules and SOPs change — if you're reading this much later, treat the content as a starting point and verify against the current handbook.

The site has flashcards, multiple-choice quizzes, and a term-to-definition matching game across 14 categories — laws, drugs and illegal items, the full SOP, codes and signals, busy codes, the phonetic alphabet, procedures and theory, ranks and equipment, MDT tools, training info, robberies and tactics, radio comms, in-game keybinds and slang, and cross-department policy. ~560+ items total.

## Infrastructure

It's a static site — no backend, no database, no build step. Four files do the work:

- **`index.html`** — the markup. About 60 lines.
- **`styles.css`** — all the styling. Dark theme, Bebas Neue / Fraunces / JetBrains Mono pulled from Google Fonts, CSS variables for the color tokens.
- **`app.js`** — vanilla JavaScript, no frameworks. Fetches `data.json` on load, then hands rendering between three modes (flashcards, quiz, match) and a "Browse All" search view. Each mode is a function that wipes `#modeContent` and rebuilds it. State lives in a single `state` object — current category, current mode, quiz progress, match game state.
- **`data.json`** — every term and definition. Editing the site means editing this file. Each category has a label, an icon, and an array of items shaped like `{ "term": "...", "def": "...", "tier": "..." }`.

That's it. To add a new charge, a new SOP, a new whole category — open `data.json`, add the entry, push the change. The site picks it up on next load. No rebuild, no deploy hooks, no waiting on a CI pipeline.

### Hosting

Hosted on **Cloudflare Pages**. The custom domain `lspdtraining.peterwild.pw` points there because `peterwild.pw` is already on Cloudflare DNS, so the CNAME wiring is automatic and the SSL cert is issued automatically. Cloudflare's CDN serves the assets globally.

A `_headers` file in the repo configures caching policy: `data.json` is cached for 5 minutes (so content updates propagate fast), CSS/JS for an hour, HTML for a minute. Standard security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) are also set there.

### Why no framework

Because I didn't need one. The data is read-only on the client. There's no auth, no realtime, no server state. Vanilla JS + `fetch()` + DOM manipulation is faster to ship, faster to load, and means I don't have to think about a build pipeline. Total page weight is around 35 KB compressed including the data.

## Editing content

```json
{
  "term": "Bank Robbery",
  "def": "Committing a robbery at any financial institution.",
  "tier": "Felony"
}
```

Adding a new category looks like:

```json
"newcategory": {
  "label": "New Category",
  "icon": "🆕",
  "description": "Optional description.",
  "items": [
    { "term": "...", "def": "...", "tier": "..." }
  ]
}
```

## Local development

`fetch()` blocks `file://`, so don't double-click `index.html`. Run any static server:

```bash
python3 -m http.server 8000
# visit http://localhost:8000
```

## Credits

Content comes from the BadlandsRP LSPD Cadet Handbook, the Operating & Ticketing Procedures forum post, the Recruit/Cadet info post, and the in-game ticketing guide. Not affiliated with BadlandsRP — just a study aid for cadets.
