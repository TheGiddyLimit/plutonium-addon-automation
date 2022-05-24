import doBuild from "plutonium-utils/lib/BuildTask.js";
import {SharedConsts} from "../module/shared/SharedConsts.js";

export const buildTask = () => {
	return doBuild({
		dir: SharedConsts.MODULE_DIR,

		additionalFiles: [
			{
				name: "README",
				pathIn: `./MODULE_README.md`,
				pathOut: `README.md`,
			},
		],

		name: SharedConsts.MODULE_NAME,
		title: SharedConsts.MODULE_TITLE,
		description: "Plutonium automations for use with Midi-QOL, DAE, and friends.",
		authors: [
			{
				name: "Giddy",
				url: "https://www.patreon.com/Giddy5e",
				discord: "Giddy#0001",
			},
			{
				name: "Spappz",
				discord: "spap#9812",
			},
		],
		readme: "README.md",
		license: "MIT",
		minimumCoreVersion: "9",
		compatibleCoreVersion: "9",
		url: "https://www.patreon.com/Giddy5e",
		bugs: "https://discord.gg/nGvRCDs",
		dependencies: [
			{
				name: "plutonium",
				type: "module",
				manifest: "https://raw.githubusercontent.com/TheGiddyLimit/plutonium-next/master/module.json",
			},
			{
				name: "midi-qol",
				type: "module",
				manifest: "https://gitlab.com/tposney/midi-qol/raw/master/package/module.json",
			},
			{
				name: "dae",
				type: "module",
				manifest: "https://gitlab.com/tposney/dae/raw/master/package/module.json",
			},
			{
				name: "times-up",
				type: "module",
				manifest: "https://gitlab.com/tposney/times-up/raw/master/package/module.json",
			},
			{
				name: "dfreds-convenient-effects",
				type: "module",
				manifest: "https://github.com/DFreds/dfreds-convenient-effects/releases/latest/download/module.json",
			},
		],
		esmodules: [
			"./js/Main.js",
		],
		flags: {
			// See:
			// https://foundryvtt.wiki/en/development/manifest-plus
			// https://github.com/mouse0270/module-credits
			"manifestPlusVersion": "1.2.0",
			"conflicts": [
				{
					"name": "combat-utility-belt",
					"type": "module",
					"description": `Redundant when used with ${SharedConsts.MODULE_TITLE} module dependencies, and often conflicts with them.`,
				},
				{
					"name": "betterrolls5e",
					"type": "module",
					"description": "May cause issues with features which require rolls; use with caution.",
				},
				{
					"name": "mars-5e",
					"type": "module",
					"description": "May cause issues with features which require rolls; use with caution.",
				},
				{
					"name": "mre-dnd5e",
					"type": "module",
					"description": "May cause issues with features which require rolls; use with caution.",
				},
			],
		},
	});
};
