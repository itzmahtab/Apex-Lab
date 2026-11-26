# LinkedIn post — APEX/LAB F1 Season Hub

> Copy everything between the lines. Attach `docs/screenshots/home.jpg`, `grid.jpg` and `gp.jpg`
> (LinkedIn carousels work well with 3 images), or a 20-second screen recording of the globe spinning.

---

I built an F1 season hub where the whole championship lives on one planet. 🌍🏎️

APEX/LAB puts every Grand Prix on a 3D globe lit by the real sun, at this exact moment. Night falls over Lusail while it's still morning in Austin, and every circuit tells you its local time.

What's inside:

🌍 A three.js globe with a live day/night line from an actual solar-position calculation, every circuit pinned, and the season route animated across it

🏁 Countdown to the next session, results from every session (FP1 → Race), driver and constructor standings, and a points-by-round chart

🏎️ Every circuit in 3D, rebuilt from real car-position data with real elevation, with a miniature car replaying the pole lap in real time

📡 A live timing dashboard: gaps, intervals, purple sectors, tyres, speed traps and race control, fed by F1's live timing stream

🔬 A telemetry lab to compare any two laps since 2023, metre by metre

🎵 Even an original soundtrack, synthesised in the browser with the Web Audio API, no audio files

A few engineering problems I enjoyed solving:

→ Edge caching that never makes you wait. Pages serve the cached copy instantly and refresh it in the background on Cloudflare Workers, so warm loads went from ~10 s to under 1 s.

→ A free server that never sleeps. The live-timing relay runs on Render's free tier, which sleeps after 15 idle minutes. A Cloudflare Cron Trigger pings it every 10 minutes, at zero cost.

→ A cache bug that only existed in production. Older cache entries had been saved with a schema that silently dropped a field, so every 3D circuit came back empty on the edge and nowhere else. The fix was to version the cache key, not to add more code.

→ 3D with no 3D assets. The globe, the circuits and the race car are all generated from data and code: a 10 KB land bitmask, real x/y/z telemetry, and a car built from extruded shapes.

Design-wise I went all in on abstract brutalism: concrete textures, raw Arial Black type, hard offset shadows and a deliberately broken grid. It's responsive from a 320 px phone up, and it scores zero serious issues on automated accessibility checks.

Stack: Next.js 16 · React 19 · TypeScript · three.js · Tailwind v4 · Cloudflare Workers + KV + Cron · Render · Playwright + axe

🔗 Live: https://apexlab.cou-hackathon.workers.dev
💻 Code: https://github.com/itzmahtab/Apex-Lab

Huge thanks to the open-source F1 community behind OpenF1, Jolpica and f1-livetiming-api. This doesn't exist without them.

Which race are you watching this weekend? 👇

#Formula1 #F1 #WebDevelopment #ThreeJS #NextJS #TypeScript #Cloudflare #DataVisualization #OpenSource #BuildInPublic

---

*Unofficial fan project, not affiliated with Formula 1.*
