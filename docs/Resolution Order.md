# Resolution Order

During Plutonium's import process, as a Foundry document is being constructed, additional data is pulled from the following sources in the order listed below:

- The Automation Addon (this module)
- Prerelease data (i.e., loaded Unearthed Arcana)
- Homebrew data
- "Internal" data; hand-maintained JSON found in 5etools' source. These files are either prefixed `foundry-` (e.g. `foundry-items.json`), or are named `foundry.json` and located in the directory they apply to (e.g. `spells/foundry.json`)
- "Generated" data, which Plutonium itself automatically creates during the import process. For example, for an `item` defined in 5etools data with a `"bonusSavingThrow": "+2"`, Plutonium may generate a `"Saving Throw Bonus"` active effect.

Sources earlier in the list have precedence. For example, if the Automation Addon defines a list of active effects for an item, a homebrew-defined list of active effects for that item would be ignored.

Note that this is handled on a _per-property_ basis: if both the Automation Addon and homebrew defined a list of active effects for an item, but only homebrew defined an `img` for that item, the list of active effects would be taken from the Automation Addon while the `img` would be taken from homebrew.

## `_merge`

This behaviour can be controlled using the `"_merge"` object. With `"_merge"`, a higher-precedence source can allow a lower-precedence source to _merge_ its data into the higher-precedence output, producing a unified result.

For example, if both the Automation Addon and homebrew defined a list of active effects for an item, and the Automation Addon data included a `"_merge"` of `{"effects": true}`, then the list of active effects from both sources would be concatenated together to produce the final output.

When merging the outputs of multiple sources, the merge process for a property continues until a source does not specify a `"_merge"` for that property (sources which do not produce any output for that property are ignored).
