# SEO and Discoverability

## Target Intent

Primary demo themes: `ukrainisches Restaurant Kassel`, `ukrainische Küche Kassel`,
`Borschtsch Kassel`, `Wareniki Kassel`, `ukrainisches Catering Kassel`.
Do not claim actual rankings, reviews, opening or service coverage for the fictional demo.

## Route Rules

- German is canonical default content but uses `/de`; locale routes have self-canonical URLs.
- Every translated equivalent links `hreflang` for `de`, `en`, `uk` and optionally `x-default`.
- Token, cart, checkout, admin, preview and internal search/filter URL variants are `noindex`.
- Sitemap includes only published canonical public pages and published event routes.
- Robots blocks admin/internal crawl but is not treated as access control.

## Metadata

- Unique localized title and description based on real page content.
- City + cuisine appears naturally in Home/Menu/Contact title/H1, not keyword stuffing.
- Open Graph image has verified license and dimensions; locale alternates are declared.
- Stable URLs; content title edits do not silently break slugs.
- Images use useful alt text and dimensions; decorative ornaments have empty alt.

## Structured Data

- Use `Restaurant`/`LocalBusiness` only with values that match visible page content.
- Include name, URL, cuisine, address, telephone, price range, menu URL, reservation
  acceptance and opening hours only when configured and visible.
- Use `Menu`/`MenuSection`/`MenuItem` where maintainable; do not add unsupported ratings.
- Event structured data mirrors published event data and real/demo status.
- Validate generated JSON-LD and never serialize arbitrary CMS HTML into it.

## Technical Gate

- Correct status codes, custom 404/500, no redirect loops between locales.
- Server-rendered meaningful content without JavaScript for marketing/menu essentials.
- Core Web Vitals meet `NFR-PERF-1` on representative production preview runs.
- `sitemap.xml`, `robots.txt`, canonicals, hreflang and JSON-LD have automated assertions.
- Search Console/Business Profile connection is out of scope for the fictional demo.

