# BayernAtlas Fluid

`bayernatlas_fluid` provides a reusable TYPO3 Fluid component for the official
BayernAtlas web component. Callers supply plain arrays. The extension does not
depend on maps2 and does not persist records.

## Compatibility

| TYPO3 | bayernatlas_fluid |
| --- | --- |
| 13.4 LTS | 0.1 |
| 14.3+ | 0.1 |

The extension supports Composer-based TYPO3 installations.

## Installation

```bash
composer config repositories.bayernatlas-fluid vcs https://github.com/ElementareTeilchen/bayernatlas-fluid
composer require elementareteilchen/bayernatlas-fluid:^0.1
```

The VCS repository belongs in the TYPO3 root project's Composer configuration.
It allows installation directly from the GitHub release without Packagist.

The BayernAtlas web component is in beta. Ask the LDBV to allow every staging
and production hostname before deployment.
See [Deployment checklist](Documentation/Deployment.md) for remaining site-level
checks and the limits of the automated test coverage.

## Fluid usage

The extension registers the global `baf` namespace. No `xmlns` declaration is
required.

```html
<f:variable name="items" value="{
    0: {
        id: 'maximilianeum',
        title: 'Maximilianeum',
        type: 'point',
        coordinates: {0: 11.5949, 1: 48.1364},
        content: '<h3>Maximilianeum</h3><p>Sitz des Bayerischen Landtags.</p>',
        categories: {
            0: {
                id: 'democracy',
                title: 'Demokratiegeschichte',
                sorting: 10
            }
        }
    },
    1: {
        id: 'route',
        title: 'Historischer Rundgang',
        type: 'line',
        coordinates: {
            0: {0: 11.5949, 1: 48.1364},
            1: {0: 11.5775, 1: 48.1422}
        },
        color: '#005ca9',
        categories: {
            0: {
                id: 'democracy',
                title: 'Demokratiegeschichte',
                sorting: 10
            }
        }
    }
}"/>

<baf:map id="historische-orte"
         items="{items}"
         configuration="{
             width: '100%',
             height: '560px',
             zoom: 13,
             center: {0: 11.5755, 1: 48.1372},
             baseLayer: 'GEORESOURCE_WEB',
             showLabels: 1,
             showLayerControl: 1
         }"/>
```

`id` must be unique on the page. The component loads its own CSS and JavaScript.
Stable TYPO3 asset identifiers prevent duplicate files when a page contains
several maps.

See [Map item format](Documentation/MapItems.md) for every supported geometry,
categories, local details and the item-selection event used by adapters.

## Consent ownership

This component has no dependency on maps2 or on a consent-management extension.
Calling `baf:map` registers the BayernAtlas script and renders the map container.
If your site requires permission, the caller must withhold the **whole component
call**, including its asset partial, until permission is granted. Hiding an
already rendered map does not prevent requests to the provider.

For maps2 records, `elementareteilchen/maps2-bayernatlas` performs this check using
the existing maps2 consent options and its shared cookie. The generic component
does not read those settings or that cookie itself.

For other callers, integrate the site's consent policy at a cache-safe boundary.
A cookie-dependent Fluid condition alone is insufficient if its result is cached
and shared with other visitors. This package does not supply a consent store or
a withdrawal control.

## Configuration

| Key | Default | Purpose |
| --- | --- | --- |
| `width` | `100%` | Sets the map container width. Unitless numbers are rendered as pixels. |
| `height` | `560px` | Sets the map container height. Unitless numbers are rendered as pixels. |
| `zoom` | `12` | Sets the initial zoom. |
| `center` | `[11.5, 48.8]` | Supplies the fallback center when the map has no valid item coordinates. |
| `baseLayer` | `GEORESOURCE_WEB` | Selects the initial BayernAtlas base map. |
| `ariaLabel` | `BayernAtlas-Karte` | Labels the map for assistive technology. |
| `showLabels` | `1` | Shows marker, icon and geometry labels. |
| `showLayerControl` | `0` | Shows the base-map and category controls. |

The current BayernAtlas marker API requires a label to make a standard point
marker selectable. With `showLabels: 0`, standard markers are display-only and
do not open item details. Points with a custom icon are rendered as KML and stay
selectable without labels.

## Custom point icons

Points with an `icon` are rendered as image symbols in one KML layer. See
[Map item format](Documentation/MapItems.md#custom-point-icons) for the fields.

BayernAtlas does not load icon images from the visitor's browser. Its server
fetches them through `https://services.atlas.bayern.de/proxy`, so an icon URL
must be publicly reachable over HTTP(S) without authentication.

Before it renders points, the component requests each distinct icon once through
that proxy. If the proxy cannot deliver an icon within five seconds, the affected
points use the standard marker instead. This covers local development hosts,
password-protected staging sites and removed files.

Allow the check in the site's Content Security Policy:

```yaml
- mode: extend
  directive: 'img-src'
  sources:
    - 'https://services.atlas.bayern.de/'
```

Without this source, the browser blocks the check and every point falls back to
the standard marker. The check runs only after the map has loaded. It sends the
icon URLs to the same provider that renders the map.

The renderer calculates the initial center from all item coordinates before it
inserts the BayernAtlas element.

## Development checks

```bash
npm test
TYPO3_SKIP_ASSET_PUBLISH=1 composer install
composer test:php
composer validate --strict
find Classes Tests -name '*.php' -type f -print0 | xargs -0 -n1 php -l
```

The environment flag is only for standalone package tests: there is no complete
TYPO3 site in this checkout. Do not use it when installing into a real site,
where TYPO3 must publish the frontend assets normally.

## License

GPL-2.0-or-later.
