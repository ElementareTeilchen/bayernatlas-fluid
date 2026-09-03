# Deployment checklist

Version 0.1.0 is the initial public release. The underlying BayernAtlas web
component is still in beta. Publishing this package is not approval for a
specific production site.

## Before going live

- Obtain LDBV approval for every staging and production hostname.
- Cover the provider in the site's privacy information. If permission is
  required, withhold the complete Fluid component and its assets until consent.
  Test a fresh visit, grant, saved permission and withdrawal with page caching on.
- Allow the script and cross-origin iframe from `https://atlas.bayern.de` in the
  site's Content Security Policy. Check the browser's actual requests against
  the site's policy rather than allowing third-party hosts broadly.
- Provide only trusted or sanitized HTML in `item.content`.
- Test point, line, polygon and circle selection on the approved domain. Check
  multiple maps, layer switching, keyboard focus, Escape, mobile layout and resize.
- Provide an accessible alternative to important map-only information. The local
  info dialog's keyboard support does not establish accessibility of the iframe.

## Verification scope

PHP tests cover dimensions and actual Fluid component rendering; translation and
asset services are test doubles. JavaScript tests
cover geometry conversion, marker IDs, layer visibility, item selection and the
info dialog. GitHub Actions runs PHP checks against TYPO3 13.4 and 14.3.

The `baFeatureSelect` fixtures are hand-authored examples, not recordings from
the provider's iframe. The mapping from marker `properties.id` and geometry
`properties.itemId` is plausible and covered by local tests. An actual click
recording and end-to-end selection acceptance remain open. Do not treat the
fixture tests as proof of the live provider's event payload.

The local TYPO3 13 smoke test renders multiple maps after permission. Full
frontend acceptance on TYPO3 14 remains a deployment check, separate from its
automated PHP coverage.

## Provider limits

- The provider script is loaded from the unversioned `wc.js` URL. Test staging
  after upstream changes; the Composer version cannot pin that remote runtime.
- The API requires a label for selectable point markers. `showLabels: 0` makes
  point markers display-only. Supply a title when selection is required.
- Clustering is not implemented. There is no Leaflet overlay or synthetic cluster
  marker layer.
- The initial viewport uses the configured zoom and the center of the coordinate
  extent; it does not automatically fit every item into view.

See the [official WebComponent API](https://ldbv-by.github.io/bav4-docs/wc.html)
and [BayernAtlas documentation](https://ldbv-by.github.io/bav4-docs/).
