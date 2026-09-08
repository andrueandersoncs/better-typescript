# Technical SEO checks

Use these criteria to interpret evidence, not to turn a limited audit into a site-wide checklist. Cite the applicable source in a finding when it determines the recommendation.

## Access, indexing, and duplication

- A `robots.txt` rule manages crawling, not guaranteed exclusion from Google Search. A blocked URL can still appear when discovered elsewhere. For deliberate exclusion, verify a crawlable response carrying `noindex` or that access requires authentication; do not recommend robots.txt as a privacy control.
- Check a representative page’s final status, redirect target, canonical in raw HTML, and, for JavaScript sites, rendered canonical. Redirects and `rel="canonical"` are strong canonical signals; sitemap inclusion is weaker. A unique page need not be condemned for lacking a self-canonical, but consistent canonical signals and internal links to the preferred URL reduce ambiguity.
- A sitemap helps discovery, especially for large, new, or poorly linked sites. It is not proof of indexing. When one exists, sample that its URLs are absolute, reachable, intended for indexing, and aligned with canonical URLs.

Sources: [robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro), [canonicalization](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview).

## Rendering, content, and links

Google’s JavaScript processing has crawl, render, and index stages. Compare raw response with a browser-rendered page when content, links, robots directives, or canonical data depend on JavaScript. A `200` client-side error page can be a soft 404. Important navigation should expose real destination URLs in `<a href>` elements; fragment-only routes and event-only controls are not reliably crawlable.

Assess visible main content for whether it answers the claimed page purpose and remains available after rendering. Titles should be present, concise, descriptive, and distinct, but Google can rewrite title links. Check a page’s prominent visual title rather than enforcing a particular count or heading level.

Sources: [JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [crawlable links](https://developers.google.com/search/docs/crawling-indexing/links-crawlable), [title links](https://developers.google.com/search/docs/appearance/title-link).

## Experience and structured data

Inspect affected pages at a mobile viewport for readable, usable main content, horizontal overflow, intrusive interstitials, and secure delivery. Core Web Vitals and field data can guide investigation; a good score does not assure a position in Search. Report the actual device, route, tool, and date for lab or field measurements.

JSON-LD may be injected after load and is often omitted by reader-mode extraction. Inspect raw source to establish server-rendered markup or a browser-rendered DOM to observe injected markup. Either observation is separate from validity and Google feature eligibility. Markup must describe content visible to users; test an applicable type with the Rich Results Test rather than assuming FAQ eligibility.

Sources: [page experience](https://developers.google.com/search/docs/appearance/page-experience), [structured data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data).

## Locales and crawler policies

Apply this only to actual language or regional variants. Each localized URL set should include itself and its alternates, use fully qualified URLs, and be reciprocal where paired. `hreflang` supports an ISO 639-1 language plus optional ISO 3166-1 Alpha-2 region, and `x-default` can designate a fallback. Canonicals should name the same-language page or the best available substitute. HTML, HTTP header, and sitemap implementations are equivalent; choose one maintainable method rather than duplicating inconsistent sets.

If a crawler-policy request arises, identify the exact user agent and product. `GPTBot` controls OpenAI training crawling, while `OAI-SearchBot` is for OpenAI search; `Google-Extended` controls training and grounding in certain other Google AI products, not Google Search. Do not infer a Google Search block or an AI-search strategy from either policy.

Sources: [localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions), [Google crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/overview-google-crawlers), [OpenAI crawlers](https://platform.openai.com/docs/bots), [Google-Extended](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers).
