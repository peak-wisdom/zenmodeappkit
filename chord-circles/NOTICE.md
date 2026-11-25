# Chord Circles

Chord Circles is original MIT-licensed project code. The interface, harmony engine, synthesized instrument voices, progression scheduler, and MIDI/WAV writers require no music API, account, third-party samples, or external runtime service. It shares the site's theme and timer utilities and uses the MIT PNG-resolution helper in postcards/export.js.

## Theory and naming

The wheel uses the twelve pitch classes in fifths or fourths order. Major chords occupy the outer ring; their relative minors occupy the inner ring. Major and minor triads do not include every possible diatonic chord: the seven scale-chord buttons also expose diminished and augmented chords. Wheel seventh mode uses the matching diatonic seventh where its underlying triad fits; otherwise it uses major/minor sevenths. Dominant mode uses dominant sevenths outside and minor sevenths inside.

Nine scale forms are provided: major/Ionian, natural minor/Aeolian, harmonic minor, ascending melodic minor, Dorian, Phrygian, Lydian, Mixolydian, and Locrian. Harmonic and melodic minor keep the displayed pitch collection throughout; melodic minor does not switch to natural minor on descending arpeggios. Scale chords are built by stacking thirds. Spelling is retained for keys and selected wheel chords, including enharmonic equivalents and double accidentals where theory requires them. MIDI and audio use equal-tempered pitches, with A4 at 440 Hz.

All wheel buttons remain playable. Highlighting means the chord's pitch classes belong to the selected scale. Roman numerals describe the root's scale degree and chord quality; this is a harmony exploration tool, not automatic functional analysis of a composition. A chord outside the scale with no diatonic root is labeled Chromatic.

## Playback and exports

The piano, guitar, pad, and bell voices are synthesized approximations, rather than recordings of acoustic instruments. Piano/bell/pad voices use oscillators and envelopes; guitar uses a damped plucked-string model. A compressor, bounded master level, finite envelopes, and optional synthesized reverb control the output. Sound begins only after a user action. Pause retains the current chord/beat; Stop resets playback and silences notes. Hiding or leaving the page pauses playback. Reloading always returns paused.

Automatic inversions search nearby voicings to reduce movement between chords. They apply only to progression playback; single-chord auditions use the chosen inversion. Disable automatic inversions to preserve every explicit voicing. An optional root bass stays below the harmony. Swing affects arpeggio subdivision pairs. The metronome is independent of the musical notes.

WAV files contain stereo 44.1-kHz, 16-bit PCM audio, with a short reverb/release tail. Exports are limited to 90 seconds of music, excluding that tail, to bound memory use. They use a snapshot of the current settings and the chosen repeat count. A separate option includes the metronome in WAV.

MIDI exports are standard format-0 files with 480 ticks per quarter note, a tempo event, program selection, and paired note-on/off events. Instrument sounds depend on the MIDI player; reverb, the master audio volume, and the optional click are not encoded. MIDI notes use the same chord arrangement and arpeggio timing as audio. SVG wheel exports use system fonts with a self-contained color style; PNG wheel exports are 2400 × 2400 pixels with 300-DPI metadata.

## Storage and sharing

The working draft, settings, title, and up to 24 named songs are kept in localStorage on this device and origin. There is no cloud sync. Browser cleanup or private-browsing policies can remove them. Use editable .chords.json downloads for backups or transfer. Import validates the format, chord values, size, and supported settings before replacing the current draft.

A progression link includes the current song/settings in the URL fragment. Named library entries and the draft title are excluded. Anyone given the full link can open its contents; normal operation sends no song data to a music service. Deleting a named song can be reversed with Restore deleted during the current visit. Undo/redo covers progression and setting edits.

Serve this repository over HTTP and open chord-circles/tests.html for theory, spelling, transposition, voicing, timing, import, and file-format regression checks.
