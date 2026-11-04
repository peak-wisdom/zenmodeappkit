# Third-party notices

Read [LICENSE_SCOPE.md](LICENSE_SCOPE.md) for the project's MIT/AGPL component boundaries.

## Swiss Ephemeris and @swisseph/browser

- Used by: `birth-chart/engine.js` and the `transits/` application through that shared engine.
- Browser package: `@swisseph/browser` version **1.4.0**, loaded from the pinned jsDelivr npm distribution, including its JavaScript and WebAssembly assets.
- Package source and notices: https://github.com/swisseph-js/swisseph/tree/main/packages/browser
- Swiss Ephemeris source: https://github.com/aloistr/swisseph
- Swiss Ephemeris copyright: Astrodienst AG, Switzerland. Preserve upstream copyright notices in any copied or redistributed dependency assets.
- Licensing: upstream offers AGPL-3.0 or a separate Swiss Ephemeris Professional License. This project uses the AGPL option; it does not claim to hold a professional license.
- AGPL license text: [birth-chart/LICENSE](birth-chart/LICENSE).
- Project chart source: https://github.com/peak-wisdom/zenmodeappkit/tree/main/birth-chart
- Project-specific conventions and dependency information: [birth-chart/NOTICE.md](birth-chart/NOTICE.md).
- Transit viewer source and conventions: https://github.com/peak-wisdom/zenmodeappkit/tree/main/transits and [transits/NOTICE.md](transits/NOTICE.md).

The dependency is fetched at runtime rather than vendored. Loading it from a CDN does not remove its license requirements. A root MIT license does not relicense Swiss Ephemeris or the combined birth-chart application.

## Open-Meteo geocoding and GeoNames

- Used by: optional birthplace search in `birth-chart/app.js`.
- API and attribution: https://open-meteo.com/en/docs/geocoding-api
- Location data: GeoNames, https://www.geonames.org/
- API data license: Creative Commons Attribution 4.0 International (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/
- Terms for accessing the hosted service: https://open-meteo.com/en/terms

Birthplace search results are displayed with Open-Meteo / GeoNames attribution. The app selects and formats returned place names, coordinates, and timezones; those third-party data are not relicensed under MIT. If redistributing API-derived data, retain the attribution and license link and indicate changes. The data license and hosted-service access terms are separate.

## Other tools

The sound mixer synthesizes its sound using browser audio APIs; the wallpaper generator renders fractals in the browser. No downloaded sound recordings or wallpaper image packs are bundled in these apps. Browser-provided fonts and emoji are rendered by the user's platform and are not distributed as font files by this repository.
