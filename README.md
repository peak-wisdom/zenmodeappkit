# Still / zenmodeappkit

A collection of browser tools for breathing, focus, grounding, countdowns, memory, sound mixing, games, fractal wallpapers, and Vedic birth charts.

[Open the site](https://peak-wisdom.github.io/zenmodeappkit/).

## Licensing

This is a **mixed-license repository**:

- Project-owned independent apps, shared utilities, and root documentation are licensed under [MIT](LICENSE).
- The Vedic birth-chart module in `birth-chart/` and planetary transit viewer in `transits/` are licensed under [AGPL-3.0-only](birth-chart/LICENSE), and use Swiss Ephemeris under its AGPL option.
- Third-party libraries and API data retain their own licenses and attribution requirements.

See [LICENSE_SCOPE.md](LICENSE_SCOPE.md) for the component mapping and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for dependency details. The root MIT license does not replace the birth-chart application's AGPL requirements.

## Planetary transits

[Open the transit viewer](https://peak-wisdom.github.io/zenmodeappkit/transits/). Select start/end dates in UTC, load the start date, and press Play. Explore 1900–2099 with forward/reverse playback, four speeds, looping, a scrubber, individual planet selection, and optional outer planets. The wheel and North/South Indian views share a positions table. Preferences and the displayed instant are saved locally; playback returns paused. Download the displayed positions as CSV.

The chart uses geocentric Lahiri sidereal positions from Swiss Ephemeris / Moshier. Radial tracks are for readability, not physical orbital distances; Indian-chart houses use a chosen reference sign rather than a computed local ascendant. See [transit notices](transits/NOTICE.md). Browser calculation/playback checks: serve the repository over HTTP and open `transits/tests.html`.

All three transit views display planet markers. Select multiple planets to compare details and show their wheel trails; click again to deselect or use Clear selection. Both multiple and empty selections persist across refresh.

## Live Sky

[Open Live Sky](https://peak-wisdom.github.io/zenmodeappkit/live-sky/). A separate astronomical viewer with a rotatable Earth-centered 3D projection, compressed or true distance ratios, live device-clock updates, UTC date exploration and forward/reverse time-lapse, and a local horizon map. Inspect the Sun, Moon, seven other planets, and Pluto, with geocentric coordinates, IAU constellation, distance, light time, phase, and magnitude. Optional local coordinates provide topocentric altitude/azimuth (including lunar parallax), standard-refraction controls, and next rise/set estimates.

Location is optional: enter coordinates, choose a city preset, or explicitly request browser geolocation. Preferences and location stay in localStorage. Refresh restores explored dates paused; live views return to the present. Time-lapse pauses when hidden. Download a 2000 × 1520 PNG view (with SVG fallback) or an exact-instant CSV. No account, server, ephemeris API, or CDN is required at runtime beyond the GitHub Pages host.

Astronomy Engine 2.1.19 is self-hosted under MIT. The space map uses apparent geocentric vectors with light-time and aberration corrections in true ecliptic coordinates of date. Ring guides, compressed distances, enlarged body sizes, and illustrative surfaces are labeled. This is separate from the sidereal astrology transit viewer. Calculation details: [live-sky/NOTICE.md](live-sky/NOTICE.md). Serve the repository over HTTP and open `live-sky/tests.html` to run the numerical/model checks, including 16 independent NASA/JPL Horizons fixtures.
