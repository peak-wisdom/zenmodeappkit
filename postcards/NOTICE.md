# Postcard Studio

Postcard Studio is an independent, MIT-licensed application. Its illustrations, seeded background generator, layouts, and PDF writer are original project code. It has no external runtime libraries, image-generation service, stock-image dependency, account, or API key.

## Backgrounds and editing

Nineteen occasions select appropriate illustration families and suggested wording. Reusable design codes determine composition, decoration, and colors; New background and More backgrounds produce further variations without a quota. This is a procedural illustration generator, not a photorealistic AI image service. Related occasions can share motifs, such as nursery illustrations for baby showers and new babies.

Users can upload a JPG, PNG, WebP, GIF, or AVIF up to 16 MB and 40 megapixels, or import a direct HTTPS image URL. Linked images require the image host to allow cross-origin access. Requests omit credentials and referrer information; no proxy is used. Animated images become one still frame. Images are decoded locally, normalized to a raster with a maximum 2400-pixel long edge, and embedded in the card. Crop, zoom, and rotation are non-destructive within that normalized image. Low-resolution crops display a print-quality notice.

Typography uses locally available system fonts. Font substitutions, unsupported characters, printer settings, and image resolution can affect the result. Text wrapping uses canvas font measurements in the editor. If a side has too much text, its image export and the two-sided PDF are disabled until the text fits.

## Storage and privacy

The current draft, both sides, settings, and embedded image are saved on this device and origin. Lightweight text/settings updates use localStorage; the complete draft uses IndexedDB with a localStorage fallback. Metadata can recover the latest words if an image write is interrupted. A missing image or failed save is reported. Storage is not an account, cloud backup, or cross-device sync and may be removed by browser cleanup or private-browsing policies.

Downloaded `.postcard.json` files contain editable text, both sides, settings, and the active embedded image. They can be reopened in Postcard Studio. Images retained while an illustration is selected are excluded from this backup. Exported front images contain the visible front text; back images and two-sided PDFs include the personal note, recipient/address, and sender fields. Nothing is sent to a messaging or printing service. A linked-image request contacts the supplied image host once; saved drafts use the embedded copy.

Use images you own or have permission to reproduce. The application license does not grant rights to user-supplied pictures, fonts, names, trademarks, or other third-party content.

## Exports and printing

PNG exports use 300 DPI metadata and the selected physical size: 6 × 4, 5 × 7, 6 × 6, or 7 × 5 inches. SVG exports use matching millimetre dimensions, scalable illustration/text, and embedded custom images. The two-page PDF contains front and back at the exact selected size, using 300-DPI JPEG artwork. It is a flattened print file; use the editable card backup to resume editing.

Print at actual size. The files have no bleed, crop marks, or postage. Check the chosen printer's two-sided page-flip setting with a plain-paper test. For commercial printing, confirm the printer's size, bleed, color, and resolution requirements. SVG fonts are not embedded. No universal postal-size compliance is implied, especially for square or portrait cards.

Serve the repository over HTTP and open `postcards/tests.html` for model, layout, import validation, image placement, storage recovery, and export-format regression checks.
