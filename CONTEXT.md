# Project context

`bayernatlas-fluid` renders map items through the official BayernAtlas web
component. It does not fetch or persist records.

## Domain terms

- A **map item** is one point, line, polygon or circle supplied by a caller.
- A **map category** groups map items in the optional layer control.
- A **map selection** occurs when a visitor selects a marker or geometry. The
  module displays the item's local HTML content unless an adapter handles the
  selection event.
- The **map configuration** controls presentation such as size, base map,
  labels and layers.

Callers own data loading and HTML sanitization. Adapters can translate records
from another extension into map items and handle map selections.
