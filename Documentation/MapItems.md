# Map item format

The `baf:map` Fluid component receives an `items` array. Every item has these
common fields:

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| `id` | string or integer | yes | Identifies the item within one map. |
| `title` | string | yes | Supplies the marker or geometry label. |
| `type` | string | yes | One of `point`, `line`, `polygon` or `circle`. |
| `coordinates` | array | yes | Uses WGS84 coordinates in `[longitude, latitude]` order. Lines and polygons contain an array of coordinate pairs. |
| `categories` | array | no | Groups items in the layer control. |
| `color` | string | no | Sets the line, polygon or circle color. |
| `content` | string | no | Supplies trusted HTML for the local information panel. |

A circle also needs a positive `radius` in metres.

## Custom point icons

A point can contain an `icon` array with the image URL, its configured display
size, its original size and an anchor measured from the top left:

```html
icon: {
    url: '/path/to/icon.svg',
    width: 30,
    height: 30,
    originalWidth: 60,
    originalHeight: 60,
    anchorX: 15,
    anchorY: 30
}
```

Relative URLs are resolved against the page URL. BayernAtlas fetches the image
through its server-side proxy, so the URL must be publicly reachable. Points whose
icon the proxy cannot deliver use the standard marker. See
[Custom point icons](../README.md#custom-point-icons) for the check and the
required Content Security Policy source.

`showLabels` controls the icon labels. Icon points remain selectable without
labels.

The BayernAtlas renderer currently differs from maps2's Leaflet renderer in
these cases:

- An anchor coordinate of `0` is treated as unset. The renderer uses the image
  centre for that coordinate, while Leaflet places `[0, 0]` at the top left.
- If the original image dimensions are unavailable, the KML scale falls back
  to `1`. The image then uses its native size instead of the configured width
  and height. SVG files without stored dimensions can trigger this case.
- KML offers one scale value for both axes. When the configured width and
  height imply different scale factors, the renderer uses the smaller factor
  and keeps the image's aspect ratio. Leaflet stretches the image to the exact
  configured dimensions. The anchor is therefore calculated against a
  different rendered box.

## Categories

Each category has an `id`, a `title` and an optional numeric `sorting` value:

```html
categories: {
    0: {
        id: 'democracy',
        title: 'Demokratiegeschichte',
        sorting: 10
    }
}
```

Category IDs may be strings or integers. An item can belong to several
categories. It remains visible while at least one assigned category is active.

## Selection event

The map dispatches a cancelable `bayernatlas:item-select` event after a visitor
selects an item. An adapter can cancel the default local-content behavior and
load its own details:

```js
mapElement.addEventListener('bayernatlas:item-select', async (event) => {
  event.preventDefault();
  event.detail.showLoading();

  const html = await loadDetails(event.detail.item.id);
  event.detail.showInfo(html);
});
```

The event detail provides `item`, `showInfo`, `showLoading`, `showError` and
`hideInfo`.
