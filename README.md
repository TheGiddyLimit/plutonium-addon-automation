# Plutonium Addon: Automation

*Plutonium Addon: Automation* is a module to extend Plutonium, for the purpose of marrying the importation of D&D 5e game material with the automation provided by the 'Midi ecosystem'.

- [How it works](#how-it-works)
   - [Dependencies and incompatibilities](#dependencies-and-incompatibilities)
- [**Required** set-up](#required-set-up) (⚠️ **read this!**)
- [Contributing](#contributing)

---

## How it works

*Plutonium Addon: Automation* runs invisibly and mostly silently.

While the module is activated in your world, each time Plutonium imports something, it'll check to see if any automation data is set for that thing. If there is, it will import the item with that data. If not, it will import using the Plutonium standard, filling out fields as a reasonable guess.

As with Plutonium, **all data is included in the module itself**. There's no need to import everything prematurely, 'just in case'.

Some effects don't use effects directly, but rather call hidden macros. To view/edit these macros, install and activate [Item Macro](https://github.com/Kekilla0/Item-Macro).

### Dependencies and incompatibilities

Besides Plutonium itself, *Plutonium Addon: Automation* **requires**:
- [DAE](https://gitlab.com/tposney/dae)
- [Midi QoL](https://gitlab.com/tposney/midi-qol)
- [times-up](https://gitlab.com/tposney/times-up)
- [DFred's Convenient Effects](https://github.com/DFreds/dfreds-convenient-effects)

Some specific items require other modules. You will only be prompted to install/activate these modules if you import an item that requires it.

As above, *Plutonium Addon: Automation* is designed for the extensive automation provided 'Midi ecosystem' and, as such, *isn't* designed for modules such as [MARS 5e](https://github.com/Moerill/fvtt-mars-5e), [MRE 5e](https://github.com/ElfFriend-DnD/FVTT-Minimal-Rolling-Enhancements-DND5E), and [Better Rolls](https://github.com/RedReign/FoundryVTT-BetterRolls5e/). Using them may cause problems. Also, we don't recommend using this with [Combat Utility Belt](https://github.com/death-save/combat-utility-belt/).

## Required set-up

You **must** configure some modules in a specific way, or the automation won't work. Configure the following:

- _**DFreds Convenient Effects** > Modify Status Effects_ — select either `Replace` (preferred) or `Add`.
- _**Midi QoL** > Midi QoL config > Workflow > Apply Convenient Effects_ — select `Apply Item effects, if absent apply CE`.

If you have [Item Macro](https://github.com/Kekilla0/Item-Macro) active, you also need to configure it as follows:

- _**Item Macro** > Override default macro execution_ — uncheck this.
- _**Item Macro** > Character Sheet Hook_ — uncheck this.
- (If installed) _**[Token Action HUD](https://github.com/Drental/fvtt-tokenactionhud)** > Item-Macro: item macro, original item, or both_ — select `Show the original item`. (Note this is a user setting, so ensure that each user does this or use a module such as [Force Client Settings](https://gitlab.com/kimitsu_desu/force-client-settings) to guarantee it.)

## Contributing

Please see [`CONTRIBUTING.md`](./CONTRIBUTING.md). See also the [tools page](https://thegiddylimit.github.io/plutonium-addon-automation/).
