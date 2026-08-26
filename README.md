# Sycamore Coffee Co

Static site for [sycamorecoffeeco.com](https://sycamorecoffeeco.com), built with
Hugo. No theme, no build step beyond Hugo itself, no JavaScript framework.

## Requirements

Hugo **extended** v0.146 or newer — the extended build is required for image
processing, and 0.146 introduced the flat `layouts/` template layout this site
uses. Verify with `hugo version`; the string must contain `extended`.

```sh
brew install hugo     # macOS
hugo server           # http://localhost:1313
hugo --gc --minify    # production build into public/
```

## Updating the menu

The menu page is generated from a CSV export, not hand-written HTML. To publish
a new menu, drop a new CSV into `assets/menus/` and rebuild — nothing else.

Filenames must contain a `YY-MM-DD` date. The newest date wins, so old menus can
stay in the folder as history:

```
assets/menus/Sycamore Menu - 26-08-18.csv
assets/menus/26-08-18.yaml              # optional, same date
```

The CSV columns are positional:

| # | Column | Notes |
|---|--------|-------|
| 0 | Main category | `Coffee`, `Flight`, `Other Drinks`, `Food`, `Kids`, `Promotions` |
| 1 | Sub category | e.g. `Hot Espresso` — this is the heading shown on the board |
| 2 | Item name | |
| 3 | Small price | `N/A` to leave blank |
| 4 | Large price | `N/A` to leave blank |
| 5 | Description | italic line under the item |
| 6 | Note | second italic line |

`layouts/partials/menu-data.html` parses the CSV and hands the page a structured
menu. Which sub categories appear, and in which column, is hardcoded in that
partial — a new sub category will be parsed but will not render until it is
added to one of the ordered lists there (`coffeeLeft`, `coffeeRight`, `flights`,
`other`, `food`, `kids`).

The optional YAML file next to the CSV overrides the flight section title:

```yaml
featuredTitle: Back to School Flights
```

The "Updated <date>" line on the page comes from the CSV filename.

## Images

Photos live in `assets/images/photos/` so Hugo can process them. They must not
be put in `static/` — files there are copied verbatim, which is how the site
previously ended up shipping 6.6 MB of images on the homepage.

Use the `photo.html` partial rather than a bare `<img>`. It crops to the display
ratio, emits a `srcset` from 400w to 1600w, writes matching `width`/`height` so
nothing shifts as images load, and lazy-loads by default:

```go-html-template
{{ partial "photo.html" (dict
  "src"   "photos/interior.jpg"
  "alt"   "The seating area inside Sycamore Coffee Co"
  "ratio" "4/5"
  "n"     2
  "sizes" "(max-width: 900px) 94vw, 46vw") }}
```

Pass `"eager" true` for anything above the fold — that swaps lazy loading for
`fetchpriority="high"`. Exactly one image per page should be eager.

Pass `"caption"` with safe HTML to print a title and link on the polaroid's
bottom strip, as the homepage Featured Favorites tiles do.

`sizes` should describe how wide the image actually renders, so the browser can
pick the smallest sufficient candidate. Getting it wrong wastes bandwidth
silently.

## Content and configuration

Pages are stubs in `content/` that select a template via front matter:

```yaml
---
title: About us
layout: about        # renders layouts/page.about.html
url: /about-us/
description: Used for <meta name="description"> and Open Graph.
---
```

Shared facts live once in `hugo.yaml` under `params` and are read from there by
the header, footer, homepage, contact page and the schema.org block. Hours,
address, phone, email and social URLs should only ever be edited there.

Hours entries carry both display strings and machine times:

```yaml
- label: Monday–Friday          # shown to visitors
  value: 7:30 AM – 4 PM
  days: [Monday, ...]           # feeds schema.org
  opens: "07:30"
  closes: "16:00"               # omit opens/closes to mark a day closed
```

## Third-party services

- **Adobe Fonts (Typekit)** serves both `beverly-drive-right` and `barlow`. Do
  not add a Google Fonts request for Barlow; it duplicates a font already
  loaded and costs a second render-blocking round trip.
- **Elfsight** renders the Instagram feed on the homepage. `assets/js/site.js`
  injects it only once the section approaches the viewport, so it stays off the
  critical path.
- **formsubmit.co** receives every form post. The endpoint is
  `params.formEndpoint`; each form sets its own `_subject`.
