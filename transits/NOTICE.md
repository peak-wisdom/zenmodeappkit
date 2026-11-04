# Planetary transit viewer

Copyright (c) 2026 peak-wisdom and contributors.

This module (interface, styling, calculations, playback, and checks) is licensed under AGPL-3.0-only. See [the full license](../birth-chart/LICENSE), [repository license scope](../LICENSE_SCOPE.md), and [third-party notices](../THIRD_PARTY_NOTICES.md). Its corresponding source is available at https://github.com/peak-wisdom/zenmodeappkit/tree/main/transits together with the shared birth-chart engine and utilities at https://github.com/peak-wisdom/zenmodeappkit/tree/main/birth-chart. Shared MIT files retain their notices; applicable AGPL requirements govern the combined transit application.

The viewer uses the existing pinned @swisseph/browser 1.4.0 runtime and its built-in Moshier ephemeris. It calculates geocentric Lahiri sidereal positions, speed, nakshatra, and pada at the displayed UTC instant. Dates 1900–2099 are supported. Rahu uses selectable mean or true lunar nodes; Ketu is opposite Rahu. Stationary is a visualization threshold of absolute longitude speed below 0.005 degrees per day. This is not a precise station-event finder.

The zodiac wheel is a longitude diagram: Aries begins at the top and longitude increases clockwise. Each body has a fixed radial lane for readability; these are not orbital distances. The optional trail samples the previous 30 days at midnight UTC. North/South Indian charts show whole-sign houses relative to a user-selected reference sign, not a calculated local ascendant. Playback computes fresh ephemeris positions instead of linearly interpolating daily records. The animation pauses when the document is hidden and returns paused after navigation or refresh.


Selections support multiple planets and an empty selection. Clicking a selected planet again deselects it. Selected planets share the details panel, table highlights, and optional wheel trails. Selections persist across refresh; the previous single-planet preference is migrated when present. Hiding outer planets removes only hidden selections. North and South Indian charts show clickable planet markers and names; crowded groups scale within their sign or house.
