# Map Art Studio

The project-owned interface, rendering, and export code are MIT-licensed under the repository root [LICENSE](../LICENSE). Map data and bundled libraries retain their separate terms below. The root MIT license does not relicense map data.

## Map data and services

- Printable art uses OpenMapTiles-schema vector tiles served by [OpenFreeMap](https://openfreemap.org/). The current TileJSON URL is configurable in `providers.json`. The public service needs no API key. Source detail, coverage, and service availability can vary. Tile endpoints include a deployment version; the app reads current metadata when opened.
- Data is derived from [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) under the Open Database License (ODbL). OpenMapTiles attribution is also retained. Every SVG and PNG includes `OpenFreeMap · © OpenMapTiles · Data © OpenStreetMap contributors`; the SVG description supplies additional source and coordinate context. Attribution cannot be disabled in the editor. The map-art download is a rendered produced work, not a download of a tile pack or the source database.
- The separate location picker uses the standard `https://tile.openstreetmap.org/{z}/{x}/{y}.png` service with Leaflet's visible attribution. Those raster tiles are **not** copied into artwork exports or prefetched for export/offline packs. Browser HTTP caching is left enabled. See [the OSM tile policy](https://operations.osmfoundation.org/policies/tiles/).
- Explicit place search uses [Photon's public demo API](https://github.com/komoot/photon), backed by OpenStreetMap data. It runs only after Search is pressed, returns at most six results, uses a minimum 1.2-second client interval, and caches repeated queries in the tab. There is no search-as-you-type request stream, bulk geocoding, or automatic reverse geocoding. Photon is a shared public service with no availability guarantee; deployments with substantial traffic should configure an appropriate provider or their own Photon instance. This app does **not** call the public Nominatim API.
- `providers.json` keeps the search, TileJSON, and picker endpoints separate from app logic. Changes must preserve provider usage requirements and attribution. Printable tile requests use at most three concurrent requests and a maximum 24-tile footprint. The app caps tile bytes and decoded geometry to limit memory use. Tile responses are reused in a small in-tab cache; only the current rendered area's data is kept in the browser draft, not a library of offline tiles.

## Bundled code

All dependencies are self-hosted under `vendor/`; no JavaScript CDN is needed at runtime.

| Dependency | Version | License | Local notice |
| --- | --- | --- | --- |
| Leaflet | 1.9.4 | BSD-2-Clause | `vendor/leaflet-LICENSE` |
| @mapbox/vector-tile | 2.0.4 | BSD-3-Clause | `vendor/vector-tile-LICENSE` |
| @mapbox/point-geometry (bundled with vector-tile) | 1.1.0 | ISC | `vendor/point-geometry-LICENSE` |
| pbf | 4.0.1 | BSD-3-Clause | `vendor/pbf-LICENSE` |

Leaflet's distribution files and images come from the pinned npm package through jsDelivr. The vector-tile and pbf ESM runtime bundles come from esm.sh at the pinned versions. Bundles are committed locally; upstream dependency copyright/license texts are retained alongside them. Only the pbf runtime is bundled, not its schema compiler/CLI dependencies.

## Rendering and print behavior

Art is built from actual vector geometry in Web Mercator. Coverage is limited to 85° south through 85° north. Longitude wraps at the antimeridian. The map-area width is an approximate ground distance at the chosen latitude. Road widths are stylized by class, not physical road-width measurements. Water polygons preserve their holes; vector tile clips prevent buffered geometry bleeding across neighboring tiles. Railroad and ferry lines are omitted. Buildings and fine paths are optional and require an artwork update; available detail changes with zoom and local mapping. At wider crops, tiny building footprints are omitted according to print scale, retaining holes only with their associated outer footprints. Geometry outside the chosen map is culled, and a small 2.5-tile-unit simplification removes subpixel path detail.

The SVG contains scalable vector paths and text, with no external map images or font requests. SVG physical size uses a 30 cm short edge. PNG exports use the selected longest pixel edge (2400, 4800, or 7200), preserving the selected aspect ratio. A PNG `pHYs` chunk sets 11,811 pixels per meter (approximately 300 DPI). This metadata does not create extra detail; print size follows actual pixel dimensions. Large PNGs require substantial browser memory; SVG remains available if rasterization fails. The decorative frame/wall in the page is not exported. Device fonts, printers, paper, and color management can affect the final result.

## Browser storage and privacy

Design settings use localStorage key `still-map-art-v1`. The latest decoded map draft uses an IndexedDB database with the same name. Refresh restores the design and matching draft; saving can fail in private sessions or when storage is full. In that case, artwork generation and downloads remain usable with a visible notice. A last-map restore control lets the user return to their previous generated print after canceling a different crop.

Search text is sent to Photon when Search is pressed. Map-area tile requests go to OpenFreeMap; location-picker tiles go to OpenStreetMap. Their services can see request metadata and the geographic area requested. The app has no account, analytics, location-permission request, application server, or upload feature. Artwork and design preferences are kept on the user's device unless they share the exported files.

## Checks

Serve the repository and open `map-art/tests.html` for 14 offline checks covering projection, dateline wrapping, tile limits, saved-state validation, print aspect ratios, place-result validation, merged building rings/holes, SVG escaping/clipping/attribution, physical print sizing, and PNG CRC-32. Browser QA also exercised live Paris, New York, and Kyoto data, city search, palettes, circular framing, a phone-width layout, refresh persistence, last-map recovery, and actual SVG/PNG downloads.
