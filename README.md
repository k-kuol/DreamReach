# DreamReach

Find live internships and entry-level roles alongside a curated set of major
scholarship programs search, filter, sort, and save the ones you're
applying to. Built for students weighing both funding and work opportunities
in one place, instead of juggling five tabs.

## Why this isn't a gimmick

Scholarship and internship listings are scattered across dozens of sites with
inconsistent formats and no shared search. DreamReach gives students one
interface to search live internship listings and cross-reference them against
well-known scholarship programs, with a saved list they can come back to.

## Features

- **Live internship & entry-level job search** via the Remotive public API —
  search by keyword, filter by category and region, sort by newest/oldest/A–Z.
- **Curated scholarship directory** — ten major, real scholarship programs
  (Chevening, DAAD, Fulbright, Mastercard Foundation Scholars, etc.), searchable
  by name, field, region, or provider, and filterable by study level
  (Undergraduate / Graduate / PhD).
- **Save/bookmark** any listing (internship or scholarship) to a personal
  "Saved" tab, persisted in `localStorage` — no login required.
- **Export & print your saved list** — download it as a CSV file, or print a
  clean, ink-friendly reference sheet with each listing's official URL.
- **Response caching** — internship search results are cached in
  `sessionStorage` for 5 minutes per query, so repeating or refining a search
  doesn't re-hit the Remotive API unnecessarily.
- **Error handling** for network failures, timeouts, and malformed API
  responses, with a visible retry action rather than a silent failure.
- **Accessible custom dropdowns** — built from scratch (not native `<select>`)
  so filters are fully keyboard-navigable and consistently themed, since
  native option-list styling isn't reliably controllable across browsers.

## Data sources & credit

| Source | What it provides | Auth needed |
|---|---|---|
| [Remotive API](https://remotive.com/api/remote-jobs) | Live remote internship & entry-level job listings | None — free, public, no key |
| `data/scholarships.json` | Hand-curated list of major scholarship programs | N/A (static, maintained by this project) |

**Why a curated file instead of a second live API?** At the time of building
this, there is no reliable free/public API that returns current scholarship
listings — the only options are paid data providers or unofficial, unmaintained
scrapers of scholarship-aggregator sites. Rather than depend on something that
could break the deployed demo, scholarship data is a maintained JSON file with
a link to each program's *official* page, where deadlines are always current.
Full credit and thanks to Remotive for making their listings API free and public.

## Project structure

```
dreamreach/
├── index.html
├── style.css
├── app.js               # app controller: tabs, search, filters, sort, export/print
├── api.js                # Remotive fetch + caching + error handling
├── scholarships.js       # loads/filters scholarships.json
├── storage.js             # localStorage save/bookmark logic
├── ui.js                  # rendering (cards, empty/loading/error states)
├── custom-select.js       # accessible, fully-themed dropdown (replaces <select>)
├── scholarships.json      # curated scholarship dataset
├── .gitignore
└── README.md
```

No build step, no framework, no dependencies — plain HTML/CSS/JS, so it runs
directly from any static file server (including plain `nginx`).

## Running locally

1. Clone this repo.
2. Because the app uses ES module `import`/`export`, it must be served over
   `http://`, not opened as a `file://` path (browsers block module imports
   from the filesystem). From the project root:
   ```bash
   python3 -m http.server 8000
   ```
   or, if you have Node:
   ```bash
   npx serve .
   ```
3. Open `http://localhost:8000` in your browser.

No API key, `.env` file, or account signup is required — Remotive's API is
open, and the scholarship data ships in the repo. **There are no login
credentials for this application** — it has no authentication layer, so there
is nothing to provide beyond the deployed URL itself.

## Deployment (Web01, Web02, Lb01)

This is a static site, so deployment is just: copy the files, serve them with
nginx, and let the load balancer split traffic between the two servers.

1. **Copy the project to both web servers:**
   ```bash
   scp -r dreamreach/ ubuntu@<Web01-IP>:/var/www/dreamreach
   scp -r dreamreach/ ubuntu@<Web02-IP>:/var/www/dreamreach
   ```
2. **On each web server**, point nginx at the folder (adjust the existing
   server block or add a new one):
   ```nginx
   server {
       listen 80;
       server_name _;
       root /var/www/dreamreach;
       index index.html;
       location / { try_files $uri $uri/ =404; }
   }
   ```
   Then reload: `sudo nginx -t && sudo systemctl reload nginx`.
3. **On Lb01**, add both servers to the upstream pool and reload:
   ```nginx
   upstream dreamreach_backend {
       server <Web01-IP>:80;
       server <Web02-IP>:80;
   }
   server {
       listen 80;
       location / { proxy_pass http://dreamreach_backend; }
   }
   ```
   `sudo nginx -t && sudo systemctl reload nginx`.
4. **Verify load balancing:** hit the Lb01 address repeatedly and confirm
   requests are served by both Web01 and Web02 (e.g. add a temporary
   `X-Served-By` header per server, or check each server's access log while
   requesting through the load balancer).

_[Fill in with your actual IPs, any DNS name you configured, and a note on
whichever load-balancing method (round robin / least-conn) you used.]_

## Challenges

- **No live scholarship API exists.** As covered above, this was solved by
  shipping a maintained, hand-curated `scholarships.json` instead of depending
  on an unreliable or paid third-party scraper.
- **Remotive's `candidate_required_location` is free text**, not a clean enum
  (e.g. `"USA"`, `"UK, Europe"`, `"Worldwide"`, `"Anywhere"` all appear). A
  strict region dropdown would have missed most listings, so the region
  filter matches on a curated list of keyword variants per region
  (`REGION_OPTIONS` in `api.js`) rather than an exact match.
- **Native `<select>` dropdowns can't be reliably restyled.** Chrome/Edge
  ignore most CSS applied to the open option list, so filters looked
  inconsistent with the rest of the UI. This was solved by building a small,
  dependency-free custom dropdown (`custom-select.js`) that follows the ARIA
  "listbox" pattern for full keyboard support while staying visually
  consistent everywhere.
- **Debounced search vs. the Remotive request cap.** Typing fires a network
  request per keystroke if unthrottled. Search input is debounced by 400ms,
  and successful responses are cached in `sessionStorage` for 5 minutes per
  search/category combination so repeated or refined searches within a
  session don't re-hit the API unnecessarily.
- **CORS.** Remotive's API sends permissive CORS headers, so no proxy or
  server-side relay was needed for the live job search to work directly from
  the browser.

## Deployment notes & known issues

_[Once deployed, replace this with anything specific you hit while
configuring Web01/Web02/Lb01 — e.g. nginx permissions, firewall rules, or
load-balancing method quirks.]_

## Demo video & live deployment

- **Demo video (≤2 min):** _[paste your YouTube/Vimeo link here — must show
  the app running locally AND being accessed through the Lb01 load balancer
  address]_
- **Deployed URL (via load balancer):** _[paste your Lb01 address/DNS here]_

## Credits

- [Remotive](https://remotive.com/) for a free, public, no-key-required jobs API.
- Scholarship program details sourced from each program's official website
  (linked on every card).
- Fonts: [Fraunces](https://fonts.google.com/specimen/Fraunces) and
  [IBM Plex](https://fonts.google.com/specimen/IBM+Plex+Sans) via Google Fonts.
