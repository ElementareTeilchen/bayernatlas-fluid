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
