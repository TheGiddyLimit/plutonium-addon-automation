# Plutonium Addon: Automation

*Plutonium Addon: Automation* is a module to extend Plutonium, for the purpose of marrying the importation of D&D 5e game material with the automation provided by the 'Midi ecosystem'.

- [Disclaimer](#disclaimer)
- [How it works](#how-it-works)
- [Installation](#installation)
   - [Dependencies and incompatibilities](#dependencies-and-incompatibilities)
   - [**Required** set-up](#required-set-up) (⚠️ **read this!**)
   - [Optional integrations](#optional-integrations)
- [Contributing](#contributing)

---

## Disclaimer

*Plutonium Addon: Automation* is **_not_** supported by any of the modules listed below. If you encounter an issue in your game, disable *Plutonium* and *Plutonium Addon: Automation* and try again. If an issue persists, consider raising an [issue](https://github.com/TheGiddyLimit/plutonium-addon-automation/issues) or asking about it in our [Discord server](https://discord.gg/5etools) before bringing it to the attention of other module authors.

> [!WARNING]
> Some places discourage discussion of *Plutonium* and *Plutonium Addon: Automation*. Be aware of any rules before mentioning these modules outside this repo and our [Discord server](https://discord.gg/5etools).

## How it works

*Plutonium Addon: Automation* runs invisibly and (mostly) silently.

While the module is activated in your world, each time Plutonium would import a document, it will check if any automation data is available for that document. If so, it will import the document with the additional automation data included. If not, it will import the document as if *Plutonium Addon: Automation* were not enabled (although sometimes slightly and non-destructively tweaked for better compatibility with the modules below).

> [!TIP]
> **There's no need to import everything prematurely**, 'just in case'. As with Plutonium, all data is included in the module itself, and, if you use any [module integrations](#optional-integrations), you'll be missing out on updates from them.

## Installation

You can install the module using the following manifest URL:

`https://github.com/TheGiddyLimit/plutonium-addon-automation/releases/latest/download/module.json`

### Dependencies and incompatibilities

Besides *Plutonium* itself, *Plutonium Addon: Automation* **requires**:
- [DFred's Convenient Effects](https://foundryvtt.com/packages/dfreds-convenient-effects) (DFCE)
- [Dynamic Active Effects](https://foundryvtt.com/packages/dae) (DAE)
- [Midi QoL](https://foundryvtt.com/packages/midi-qol)
- [Times Up](https://foundryvtt.com/packages/times-up)

Some specific automations require one or more additional modules:
- [Active-Auras](https://foundryvtt.com/packages/ActiveAuras)
- [Active Token Effects](https://foundryvtt.com/packages/ATL)

If you import a document which requires one of these modules, you will be prompted to install/activate it. The automation is highly unlikely to function as intended if you use it before activating the module.

> [!CAUTION]
> *Plutonium Addon: Automation* is designed for the extensive automation provided by the 'Midi ecosystem' and, as such, *isn't* designed for modules such as [Whistler's Item Rolls Extended](https://foundryvtt.com/packages/wire) or [Ready Set Roll for D&D5e](https://foundryvtt.com/packages/ready-set-roll-5e). Using either of these may cause problems.

### Required set-up

You **must** configure some modules in a specific way, or the automations won't work. Configure the following:

- _**DFreds Convenient Effects** > Modify Status Effects_ — select either `Replace` (preferred) or `Add`.
- _**Midi QoL** > Midi QoL config > Workflow > Apply Convenient Effects_ — select `Apply Item effects, if absent apply CE`.

### Optional integrations

*Plutonium Addon: Automation* can make use of data provided by other modules to provide better automations for more documents. An integration is available for:
- [Chris's Premades](https://foundryvtt.com/packages/chris-premades)
- [Midi SRD](https://foundryvtt.com/packages/midi-srd)

This integration is only active if the above module is installed and active, and can be disabled in *Plutonium Addon: Automation*'s settings.

## Contributing

Please see [`CONTRIBUTING.md`](./CONTRIBUTING.md).
