# Plutonium Addon Data

A module designed to house a collection of addon data for the Plutonium module, to enable integrations with other modules (notably Dynamic Active Effects, Midi Quality of Life Improvements, etc.).

## Development

### Building/Running Locally

Run these precursory steps once:

1) Install [Node.js](https://nodejs.org/en/)
2) `npm i`

Then:

1) `npm run build`
2) Copy the output from `dist/` to your Foundry modules directory

### Testing

- `npm t`

### Data Layout

The `module/data/` directory should be laid out as follows:

Each 5etools data array "key" (aka "property", "prop"), e.g. `"monster"`, `"spell"`, `"classFeature"` is given its own directory.

Within that directory, a `__core.json` file should contain effects/etc. data for all entities which are natively available on 5etools (i.e., without loading homebrew).

Also within that directory, homebrew sources should each be given their own file, named `<brewSourceJson>.json`.
