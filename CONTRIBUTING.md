# Contribution Guide

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

### Item Macros

Item macros are stored as JavaScript files, and built into the data when the module is packaged. The source for these macros can be found in the [macro-item](./macro-item) directory. **Note that the first and last lines of the macro are stripped when the macro is compiled into the module's data.**

A new macro can be created using the following command:

```bash
# ex:
# npm run mt -- -d spell -s PHB -n "Fireball"
npm run mt -- -d <directory> -s <jsonSource> -n <entityName>
```

The directory (`-d`) should match that of the JSON file into which the macro will be built. The macro can then be referenced from within a JSON file by using: `"itemMacro": "<filename>"` (`"itemMacro": "PHB_fireball.js"` in the example given above)
