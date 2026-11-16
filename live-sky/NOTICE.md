# Live Sky

The independent Live Sky interface, calculations, graphics, and checks are MIT-licensed under the repository's root [LICENSE](../LICENSE). This app uses no Swiss Ephemeris code and imports no code from `birth-chart/` or `transits/`.

## Astronomy Engine

The self-hosted, unmodified `vendor/astronomy.js` is the ESM build of **Astronomy Engine 2.1.19**, copyright (c) 2019–2023 Don Cross. Its embedded MIT notice is preserved and reproduced in [vendor/LICENSE](vendor/LICENSE). Source and documentation: https://github.com/cosinekitty/astronomy. Distribution: https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/esm/astronomy.js.

The upstream target is approximately one arcminute of angular accuracy. This is a compact analytical ephemeris, not a real-time NASA telemetry feed or a precision navigation instrument. Calculations run in the browser at the displayed instant; live mode follows the device clock. Supported interface dates are 1900–2099.

## Coordinates and display

- The Earth-centered map uses `GeoVector(body, date, true)`, with light-time and aberration corrections supplied by the engine. `Ecliptic` converts these vectors to the true ecliptic/equinox of date. Space-view depth comes from those actual 3D vectors; ecliptic latitude is not discarded. Earth is the viewing origin, not a claim that the planets orbit it.
- True-distance mode maps vector lengths linearly. Compressed mode scales each radius by `log(1 + distance / 0.00001 AU)`; both preserve the vector's 3D direction before the camera rotation. Body sizes are enlarged for interaction. Text labels may use leader lines for readability. Distance rings lie in the ecliptic plane and are not orbital paths. Body surface patterns, lighting, Saturn's ring orientation, and the Earth icon are illustrative. Phase schematics represent the illuminated fraction without a sky-orientation claim. The Sun is self-luminous and has no phase schematic.
- The optional selected-body trail uses apparent ecliptic vectors at 12-hour intervals over the preceding 30 days ending at 00:00 UTC of the displayed date, joined to the current vector. Sampling is clamped at the lower date limit. It is a geocentric track, not a heliocentric orbit.
- Right ascension and declination are apparent **geocentric true equator/equinox-of-date** coordinates, obtained by rotating the EQJ vector to EQD. Constellation names use the engine's IAU boundary lookup with J2000 coordinates; they are not astrological zodiac signs. All displayed distances and light times refer to the Earth geocenter, including when a local observer is set. One AU = 149,597,870.7 km; the speed of light used for the light-time readout is 299,792.458 km/s.
- Local altitude and azimuth use `Equator` with a surface observer, precession/nutation and aberration, then `Horizon`, with optional standard refraction. This includes lunar parallax. The zenith-centered sky chart has north at the top and east at the left, as when looking upward. Below-horizon bodies remain in the selector and table. Decorative points in the space view are not catalog stars; the local view plots no star catalog.
- Rise and set use `SearchRiseSet` with standard refraction, including the Sun/Moon limb treatment supplied by the engine, over the next 48 hours (or the remaining supported range near 2100). This is independent of the altitude refraction checkbox. No event is a normal result at some locations/seasons. Local terrain, atmospheric conditions, obstructions, and actual naked-eye visibility are not modeled. A body's altitude alone does not imply visibility in daylight or without equipment.
- Magnitude, illuminated fraction, and phase angle are analytical estimates from `Illumination`. Phase angle is used by the engine; the UI shows the illuminated fraction. Atmospheric extinction is not applied to the magnitude estimate.

## Local state and exports

Preferences, optional location, and the explored instant are saved in the browser under `still-live-sky-v1`. No location is assumed by default. Geolocation is requested only by an explicit button action; coordinates are not sent to a search/geocoding service. Selecting Clear location removes it from the app's saved state. Live views reopen at the current time. Explored dates reopen paused, and time-lapse pauses when the document is hidden. Browser storage failure leaves the viewer usable and displays a notice.

PNG export rasterizes the standalone map SVG at 2000 × 1520; if PNG encoding is unavailable, the original SVG is offered instead. The map includes the displayed UTC instant and scale explanation. CSV exports the exact displayed instant, coordinate frames/units, all ten bodies, observer coordinates when present, and refraction setting. Downloads remain on the user's device unless they choose to share them.

## Independent validation

`validation-fixtures.js` contains 16 small numerical observer-table fixtures retrieved from the [NASA/JPL Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html) on 2026-11-15. The tables are used only during development/checks; the application never requests Horizons at runtime. No NASA imagery, logos, or endorsement is used.

Reproduction parameters: `EPHEM_TYPE=OBSERVER`, `CENTER=500@399`, `QUANTITIES=2,20,31`, `ANG_FORMAT=DEG`, `EXTRA_PREC=YES`, `CSV_FORMAT=YES`, `APPARENT=AIRLESS`. Body IDs are 10, 301, 199, 299, 499, 599, 699, 799, 899, and 999. Ten fixtures use `2026-11-15 12:00 UTC`; extra epochs are Moon at `2000-01-01 12:00`, Mars at `2050-06-01 00:00`, and Pluto at `2099-01-01 00:00`. Local Sun, Moon, and Saturn fixtures use `CENTER=coord@399`, `COORD_TYPE=GEODETIC`, `SITE_COORD=77.5946,12.9716,0` (east longitude, north latitude, elevation in km) and `QUANTITIES=4,20`, at `2026-11-15 12:00 UTC`.

Serve the repository over HTTP and open [tests.html](tests.html) to run checks. Angular comparisons require differences below one arcminute; geocentric distance comparisons require relative error below 0.05%. The local fixtures compare altitude/azimuth, not topocentric distance, because the app's distance readout is deliberately geocentric. These sampled checks are not a guarantee at every time or observing condition. Other checks cover the supported date boundaries, UTC parsing, local parallax/refraction, polar no-event results, restored-state validation, projection orientation/scale, and SVG/CSV context.
