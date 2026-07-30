# DreamReach

Find live internships and entry-level roles alongside a curated set of major
scholarship programs search, filter, sort, and save the ones you're
applying to. Built for students weighing both funding and work opportunities
in one place, instead of juggling five tabs.

## Demo video & live deployment

- **Demo video (≤2 min):** _[paste your YouTube/Vimeo link here, must show
  the app running locally AND being accessed through the Lb01 load balancer
  address]_
- **Deployed URL (via load balancer):** `https://www.kuol.tech`
  
## Why this isn't a gimmick

Scholarship and internship listings are scattered across dozens of sites with
inconsistent formats and no shared search. DreamReach gives students one
interface to search live internship listings and cross-reference them against
well-known scholarship programs, with a saved list they can come back to.

## Features

- **Live internship & entry-level job search** via the Remotive public API:
  search by keyword, filter by category and region, sort by newest/oldest/A–Z.
- **Curated scholarship directory**: ten major, real scholarship programs
  (Chevening, DAAD, Fulbright, Mastercard Foundation Scholars, etc.), searchable
  by name, field, region, or provider, and filterable by study level
  (Undergraduate / Graduate / PhD).
- **Save/bookmark** any listing (internship or scholarship) to a personal
  "Saved" tab, persisted in `localStorage` (no login required).
- **Export & print your saved list**: download it as a CSV file, or print a
  clean, ink-friendly reference sheet with each listing's official URL.
- **Response caching**: internship search results are cached in
  `sessionStorage` for 5 minutes per query, so repeating or refining a search
  doesn't re-hit the Remotive API unnecessarily.
- **Error handling** for network failures, timeouts, and malformed API
  responses, with a visible retry action rather than a silent failure.
- **Accessible custom dropdowns**: built from scratch (not native `<select>`)
  so filters are fully keyboard-navigable and consistently themed, since
  native option-list styling isn't reliably controllable across browsers.

## Data sources & credit

| Source | What it provides | Auth needed |
|---|---|---|
| [Remotive API](https://remotive.com/api/remote-jobs) | Live remote internship & entry-level job listings | None (free, public, no key) |
| `data/scholarships.json` | Hand-curated list of major scholarship programs | N/A (static, maintained by this project) |

**No API keys or credentials are required to run or use this application.**
Remotive's API is free and open with no authentication, the scholarship
dataset ships as a static file in the repo, and the app has no login system
(saved/bookmarked items live in the browser's `localStorage`, scoped per
visitor, with nothing server-side to authenticate against).

**Why a curated file instead of a second live API?** At the time of building
this, there is no reliable free/public API that returns current scholarship
listings: the only options are paid data providers or unofficial, unmaintained
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

No build step, no framework, no dependencies. Plain HTML/CSS/JS, so it runs
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

No API key, `.env` file, or account signup is required. Remotive's API is
open, and the scholarship data ships in the repo. **There are no login
credentials for this application**: it has no authentication layer, so there
is nothing to provide beyond the deployed URL itself.

## Deployment (Web01, Web02, Lb01)

This is a static site, so deployment is: copy the files onto both web
servers, serve them with nginx, and let HAProxy on the load balancer
terminate SSL and round-robin traffic between the two.

**Servers used:**

| Server | Role | IP |
|---|---|---|
| `7166-web-01` | nginx, static file server | `54.89.22.40` |
| `7166-web-02` | nginx, static file server | `100.59.13.93` |
| `7166-lb-01` | HAProxy, SSL termination + load balancing | `32.192.245.171` |

### 1. Deploy the app to both web servers

On each web server:

```bash
sudo mkdir -p /var/www/dreamreach
sudo chown $USER:$USER /var/www/dreamreach
git clone https://github.com/<your-username>/dreamreach.git /var/www/dreamreach
# (or copy the files over directly if not pulling from GitHub on the box)
```

### 2. Configure nginx on each web server

Identical config on both `web-01` and `web-02`, at
`/etc/nginx/sites-available/dreamreach`:

```nginx
server {
    listen 80;
    server_name www.kuol.tech kuol.tech;

    root /var/www/dreamreach;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    add_header X-Served-By $hostname always;
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/dreamreach /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

The `X-Served-By` header isn't required for the app to function. It's a
lightweight way to prove, from the outside, which backend server actually
handled a given request, which is useful for verifying the load balancer
is really distributing traffic (see Testing below).

### 3. Configure HAProxy on the load balancer

`/etc/haproxy/haproxy.cfg` on `lb-01`:

```
frontend http_front
        bind *:80
        bind *:443 ssl crt /etc/haproxy/certs/www.kuol.tech.pem
        redirect scheme https code 301 if !{ ssl_fc }
        default_backend http_back

backend http_back
        balance roundrobin
        server 7166-web-01 54.89.22.40:80 check
        server 7166-web-02 100.59.13.93:80 check
```

This does two things: any plain HTTP request is redirected to HTTPS
(`redirect scheme https code 301 if !{ ssl_fc }`), and HTTPS traffic is
load-balanced round-robin across both web servers with active health
checks (`check`).

Validate and reload:

```bash
sudo haproxy -c -f /etc/haproxy/haproxy.cfg
sudo systemctl reload haproxy
```

### 4. Verify load balancing

From `lb-01` itself (bypasses any external network/security-group
considerations and tests the HAProxy → nginx path directly):

```bash
for i in {1..10}; do curl -sIk https://localhost/ | grep -i x-served-by; done
```

Confirmed output alternates cleanly between both servers:

```
x-served-by: 7166-web-01
x-served-by: 7166-web-02
x-served-by: 7166-web-01
x-served-by: 7166-web-02
...
```

This proves HAProxy is correctly splitting traffic round-robin across
`web-01` and `web-02`, with both returning valid `200 OK` responses and
matching content.

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
- **Inconsistent server provisioning.** The two web servers ended up with
  slightly different configurations before deployment: one served the app
  from a home directory with a catch-all `server_name`, the other from
  `/var/www`. Both were aligned to an identical nginx vhost
  (`/var/www/dreamreach`, explicit `server_name`, matching diagnostic
  header) to guarantee consistent behavior regardless of which server a
  request lands on.
- **Security group inconsistency across sandbox instances.** After
  deployment, one web server was reachable from the public internet on port
  80 while the other two (the second web server and the load balancer) were
  not, despite identical, verified-correct nginx/HAProxy configuration on
  every box (`curl localhost` succeeded, `ss -tlnp` confirmed nginx was
  bound to `0.0.0.0:80`, not just loopback). This was isolated to missing
  inbound firewall rules at the cloud provider level on those two
  instances rather than anything application- or OS-side, and required
  requesting the rule be opened by whoever provisions the sandbox
  infrastructure.

## Credits

- [Remotive](https://remotive.com/) for a free, public, no-key-required jobs API.
- Scholarship program details sourced from each program's official website
  (linked on every card).
- Fonts: [Fraunces](https://fonts.google.com/specimen/Fraunces) and
  [IBM Plex](https://fonts.google.com/specimen/IBM+Plex+Sans) via Google Fonts.
