# Changelog

## 0.7.5

> 2024-01-03

- Fixed "Chris's Premades" integration failing to apply for players
- Fixed "Chris's Premades" failing to locate "Ki Points" automation

## 0.7.4

> 2023-12-30

- Switched various spells (~20 total) to prefer data provided by "Chris's Premades," as these automations are of higher quality _[or in some cases, actually work!]_
- Updated "Chris's Premades" integration to better handle latest module version

## 0.7.3

> 2023-11-26

- Added "actor type" pass-through, enabling future Plutonium fixes around "Chris's Premades" integration

## 0.7.2

> 2023-11-23

- Fixed "ADD" active effects missing leading operator
- Fixed rare missing-flag crash when using the "Chris's Premades" integration

## 0.7.1

> 2023-11-21

- Added compatibility with dnd5e 2.4.x

## 0.7.0

> 2023-09-19

- Ported and integrated various spell macros from D&D Beyond Importer (<https://github.com/MrPrimate/ddb-importer>), increasing spell automation to approximate parity (assuming the use of "Chris's Premades" and "Midi SRD" modules)
- Fixed Rage automation failing to exclude SRD effect

## 0.6.3

> 2023-08-04

- Improved source accuracy of data returned by the "Chris's Premades" integration

## 0.6.2

> 2023-08-02

- Fixed module integrations attempting to run when the associated module is inactive

## 0.6.1

> 2023-08-02

- Fixed Midi SRD integration failing to find SRD-renamed documents
 - Fixed crash when processing integration data which does not include active effects

## 0.6.0

> 2023-08-01

- Added optional integration with the "Midi SRD" module

## 0.5.1

> 2023-06-14

- Bumped compatible version
- Added dependency disclaimer

## 0.5.0

> 2023-04-17

- Added optional integration with the "Chris's Premades" module, allowing Plutonium to use CPR's data to enhance imported content

## 0.4.1

> 2023-02-25

- Fix crash when building Convenient Effects data with DFreds Convenient Effects v4.y.z

## 0.4.0

> 2023-02-25

- Added notifications for missing optional modules during import
- Item macros may now declare required modules
- Switched to `@attributes.prof` over `@prof`, as the former is always available and the latter is derived
- Fixed level scaling for XGE's Toll the Dead
- Fixed crash when creating temporary documents containing Convenient Effects (e.g. via Quick Insert-ing an actor)
- Improved documentation
- (Switched to JSON source for changelog; Markdown changelog now generated from JSON)

## 0.3.7

> 2023-02-05

- Fixed download URL

## 0.3.6

> 2023-02-05

- Updated module dependency URLs
- Fixed Midi QOL "Apply Convenient Effects" auto-config value

## 0.3.5

> 2023-02-04

- Fixed Midi QOL dependency auto-configuration clobbering other Midi QOL settings
- Fixed Aura of Vitality cast level (thanks @ Szefo09 and @ nickelpro)
- Fixed Convenient Effects failing to include their Active Token Effects/Token Magic FX effects
- Added support for "Torch" and "Dimension Door"
