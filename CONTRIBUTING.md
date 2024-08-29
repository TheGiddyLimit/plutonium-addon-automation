# Contribution guide

There is a lot of 5e content to automate, so all contribution is welcomed and appreciated. Read the below carefully to get started.

- [Things you can do to help](#things-you-can-do-to-help)
  - [Coordination](#coordination)
- [Setting up](#setting-up)
  - [Building locally](#building-locally)
  - [Testing](#testing)
- [Development guide](#development-guide)
  - [Data layout](#data-layout)
  - [Macros](#macros)
  - [Bulk conversion from Foundry](#bulk-conversion-from-foundry)
- [Automation philosophy](#automation-philosophy)

---

## Things you can do to help

 - Fill out effects in Foundry (see [Automation philosophy](#automation-philosophy)).
 - Convert automated items from Foundry to here (see [Development-guide](#development-guide)).
 - Review and test newly submitted items before an update (see [Setting up](#setting-up)).
 - Learn how the module works and support users with troubleshooting (see [Coordination](#coordination)).
 - Simply use the module and let us know when there's a problem! 😊

### Coordination

We organise on the [5etools Discord server](https://discord.gg/5etools).

Although we will respond to issues and pull requests here, the easiest way to get a quick response or report minor typos/bugs is to message the **#plutonium-general** channel. Come join us if you'd like to help out! (*Especially* join us if you plan to fill out a lot of data at once—helps avoid wasted effort.)

---

## Setting up

Run these precursory steps when you first set up:

1) Install [Node.js](https://nodejs.org/en/).
2) Clone this repo locally.
3) Run `npm i` within your local repo.

### Building locally

To build the module based on the current data files, run `npm run build`. The module will be outputted to `dist/`, from which you can copy to your Foundry `modules` directory (for Unix users, see [`transfer.sh`](./transfer.sh)).

### Testing

Use `npm t` to verify the data files against the schema.

---

## Development guide

There isn't yet a tutorial to explain the data format. However, you can likely work most of it out by looking at examples. Familiarity with [5etools' homebrew](https://github.com/TheGiddyLimit/homebrew) format and Foundry's data structure (including for [dnd5e](https://github.com/foundryvtt/dnd5e/wiki/Roll-Formulas), [DAE](https://gitlab.com/tposney/dae/-/blob/master/Readme.md#supported-fields-for-dnd5e), etc.) is very helpful.

### Data layout

The `module/data/` directory is laid out as follows:
- Each 'entity type' (the array names in 5etools' JSON format—`"monster"`, `"spell"`, `"classFeature"`, etc.) is given its own directory.
- Within that directory, a `__core.json` file contains data for all entities which are natively available on 5etools (i.e. without loading homebrew).
- Within the same directory, each homebrew source has its own file named `<brewSourceJson>.json` (e.g. `WJMAiS.json` for *Wildjammer: More Adventures in Space*). If a homebrew source has multiple datatypes, one file per datatype is required (excluding datatypes without automation).

### Macros

Many facets of automation must be handled with macros. These are attached using [DAE](https://foundryvtt.com/packages/dae)'s "DIME", and appear as an escaped string in data. To add some human-readability, macros are handled separately and merged during the module build.

In the [`macro-item/`](./macro-item) directory is a directory for each datatype. Save your (well-formatted, commented) macro code as a Javascript file in one of these directories, structured as an async function named `macro`, with filename `<sourceJson>_<item-name-lowercase-hyphenated>.js` (e.g. `XGE_toll-the-dead.js`). **Note that the first and last lines of the file**—the ones that turn the macro into an async function—**are stripped on compilation into the module's data**.

You can create a new macro file using the `npm run mt --` command. The directory (`-d`) should match that of the JSON file into which the macro will be built.

```bash
npm run mt -- -d <directory> -s <jsonSource> -n <entity name>
# example: npm run mt -- -d spell -s PHB -n "toll the dead"
# example: npm run mt -- -d feat -s PHB -n "war caster"
```

To reference this human-readable macro in the main data files, use `"itemMacro": "<filename>"` (e.g. `"itemMacro": "XGE_toll-the-dead.js"`).

### Bulk conversion from Foundry

In [`tool/`](./tool) (runnable locally with `npm run local-pages`) is a simple webpage which you can use to automate some of the data-filling work. On the left, enter a Foundry item's JSON, or load a file at the top. The data will be stripped to just *Plutonium Addon: Automation*-compatible data (plus anything not recognised—sort through that yourself).

You can also upload entire `items.db` files, but be aware that the webpage doesn't split the items out by (game-mechanical) datatype, and some modules might be hiding some clutter in that file (e.g. DFCE custom CEs).

---

## Automation philosophy

In the interests of consistency and user experience, we have some guidelines to follow when adding content.

1) **We play D&D 5e.**
   - Always assume the default ruleset.
   - If you can do some fancy (invisible) macro work to support variant rules, go ahead, but never compromise core function.
2) **Maximum efficiency; minimum effort.**
   - If something can be automated reliably, it should.
   - If something can't be automated reliably, it shouldn't.
   - Avoid automating only half of an item's effects without somehow informing the user of this.
   - Avoid automating anything that isn't technically required, even if it feels obvious. For example, don't set the effects of the *hold person* spell to expire on a short rest, even though 1 hour is more than 1 minute. (If the user wants time-based AE-expiry, they can use another module like [about-time](https://gitlab.com/tposney/about-time).)
   - A caveat to the above is when there is a false choice. For example, making the saving throw to end the *hold person* spell is technically optional, but since the target can literally do nothing *except* roll the saving throw (by virtue of paralysis), there is virtually no reason to not do so.
3) **Don't reinvent the wheel.**
	- Use the required modules wherever possible; don't use a macro unless you need to.
	- Only introduce a new module if it's compatible, stable, and actively maintained. Finding replacements when a helper module goes kaput is a lot of effort.
	- Use [DFred's Convenient Effects](https://github.com/DFreds/dfreds-convenient-effects) for all conditions, activated via the `statusEffect CUSTOM <condition>` effect change.
	- Remember [Midi QoL](https://gitlab.com/tposney/midi-qol/-/blob/master/README.md#flagsmidi-qolovertime-overtime-effects) `overTime` effects exist.
4) **KISS: keep it simple, sweetie.**
	- Avoid using macros except when absolutely necessary, and make sure they're readable and maintainable.
	- Certainly avoid referencing anything outside the item that you can't guarantee will be present.
	- Plutonium should only import one item per game-mechanic name. If a single class feature or spell has multiple, independent functions (e.g. the paladin class' Lay on Hands feature), activating that item should prompt the user to choose the function (via a [macro](https://github.com/TheGiddyLimit/plutonium-addon-automation/issues/26)).
