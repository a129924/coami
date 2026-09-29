# E010 requirements

## In-Scope

Users operate a virtual left, center, or right top-touch zone in the WASM simulator. A valid tap starts one visible greeting, ignores repeated input while busy, and records simulator-only trace evidence.

## Out-Of-Scope / Non-Goal

K151/Si12T hardware, screen touch, Server, public contracts, production sources, release, and hardware deployment are excluded.

## Acceptance

An accepted browser tap must become a recognizer-derived `touch-panel` `release` event carrying `tap.position` (`-100`, `0`, or `100`), then one matching greeting terminal. Invalid gestures must inject no sample. Hardware claims are prohibited.
