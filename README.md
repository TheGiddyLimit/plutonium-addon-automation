# Plutonium Addon: Automation

*Plutonium Addon: Automation* is a module to extend Plutonium, for the purpose of marrying the importation of D&D 5e game material with the automation provided by the 'Midi ecosystem'.

- [How it works](#how-it-works)
   - [Dependencies and incompatibilities](#dependencies-and-incompatibilities)
- [**Required** set-up](#required-set-up) (⚠️ **read this!**)
- [Contributing](#contributing)

---

## How it works

*Plutonium Addon: Automation* runs invisibly and mostly silently.

While the module is activated in your world, each time Plutonium would import a document, it will check if any automation data is available for that document. If so, it will import the document with the additional automation data included. If not, it will import the document as Plutonium standard (although sometimes slightly tweaked to better enable the module dependencies outlined below).

As with Plutonium, **all data is included in the module itself**. There's no need to import everything prematurely, 'just in case'.

Some effects don't use effects directly, but rather call item macros. If you, as the GM, wish to allow players to view/edit these macros on items they own, configure Item Macro to allow the _Player access_ option.

### Dependencies and incompatibilities

Besides Plutonium itself, *Plutonium Addon: Automation* **requires**:
- [DAE](https://foundryvtt.com/packages/dae)
- [Midi QoL](https://foundryvtt.com/packages/midi-qol)
- [times-up](https://foundryvtt.com/packages/times-up)
- [DFred's Convenient Effects](https://foundryvtt.com/packages/dfreds-convenient-effects)
- [Item Macro](https://foundryvtt.com/packages/itemacro)

Some specific automations require additional modules. You will be prompted to install/activate an additional module if you import a document which requires one or more of these:
- [Active-Auras](https://foundryvtt.com/packages/ActiveAuras)
- [Active Token Effects](https://foundryvtt.com/packages/ATL)
- [Warp Gate](https://foundryvtt.com/packages/warpgate)

As above, *Plutonium Addon: Automation* is designed for the extensive automation provided 'Midi ecosystem' and, as such, *isn't* designed for modules such as [MARS 5e](https://foundryvtt.com/packages/mars-5e), [MRE 5e](https://foundryvtt.com/packages/mre-dnd5e), and [Better Rolls](https://foundryvtt.com/packages/betterrolls5e). Using them may cause problems. Also, we don't recommend using this with [Combat Utility Belt](https://foundryvtt.com/packages/combat-utility-belt).

## Required set-up

You can install the module using the following manifest url:

`https://github.com/TheGiddyLimit/plutonium-addon-automation/releases/latest/download/module.json`

You **must** configure some modules in a specific way, or the automation won't work. Configure the following:

- _**DFreds Convenient Effects** > Modify Status Effects_ — select either `Replace` (preferred) or `Add`.
- _**Midi QoL** > Midi QoL config > Workflow > Apply Convenient Effects_ — select `Apply Item effects, if absent apply CE`.
- _**Item Macro** > Override default macro execution_ — uncheck this.
- _**Item Macro** > Character Sheet Hook_ — uncheck this.
- (If installed) _**[Token Action HUD](https://foundryvtt.com/packages/token-action-hud)** > Item-Macro: item macro, original item, or both_ — select `Show the original item`. (Note this is a user setting, so ensure that each user does this or use a module such as [Force Client Settings](https://foundryvtt.com/packages/force-client-settings) to guarantee it.)

## Contributing

Please see [`CONTRIBUTING.md`](./CONTRIBUTING.md). See also the [tools page](https://thegiddylimit.github.io/plutonium-addon-automation/).
