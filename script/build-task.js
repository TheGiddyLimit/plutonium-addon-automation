import path from "path";
import doBuild from "plutonium-utils/lib/BuildTask.js";
import {SharedConsts} from "../module/shared/SharedConsts.js";
import {Uf} from "5etools-utils";
import fs from "fs";
import {DIR_ITEM_MACROS} from "./consts.js";

const packageJson = Uf.readJSON(`./package.json`);

export const buildTask = async () => {
	await doBuild({
		dir: SharedConsts.MODULE_DIR,

		additionalFiles: [
			{
				name: "README",
				pathIn: `./README.md`,
				pathOut: `README.md`,
			},
		],

		id: SharedConsts.MODULE_ID,
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
		// Use "latest" as manifest URL, so that when updating the module the user always gets the latest version
		manifest: `https://github.com/TheGiddyLimit/plutonium-addon-automation/releases/latest/download/module.json`,
		// Set "download" to this specific version, so that users manually entering the link will receive the version they expect
		download: `https://github.com/TheGiddyLimit/plutonium-addon-automation/releases/download/${packageJson.version}/plutonium-addon-automation.zip`,
		changelog: "https://raw.githubusercontent.com/TheGiddyLimit/plutonium-addon-automation/master/CHANGELOG.md",
		compatibility: {
			minimum: "10",
			verified: "10.291",
		},
		url: "https://www.patreon.com/Giddy5e",
		bugs: "https://discord.gg/nGvRCDs",
		languages: [
			{
				lang: "en",
				name: "English",
				path: "lang/en.json",
			},
		],

		relationships: {
			requires: [
				// region Disabled, as Plutonium may go by other IDs :^)
				/*
				{
					id: "plutonium",
					type: "module",
					manifest: "https://raw.githubusercontent.com/TheGiddyLimit/plutonium-next/master/module.json",
				},
				*/
				// endregion
				{
					id: "midi-qol",
					type: "module",
					manifest: "https://gitlab.com/tposney/midi-qol/raw/master/package/module.json",
				},
				{
					id: "dae",
					type: "module",
					manifest: "https://gitlab.com/tposney/dae/raw/master/package/module.json",
				},
				{
					id: "times-up",
					type: "module",
					manifest: "https://gitlab.com/tposney/times-up/raw/master/package/module.json",
				},
				{
					id: "dfreds-convenient-effects",
					type: "module",
					manifest: "https://github.com/DFreds/dfreds-convenient-effects/releases/latest/download/module.json",
				},
				{
					id: "itemacro",
					type: "module",
					manifest: "https://github.com/Kekilla0/Item-Macro/releases/latest/download/module.json",
				},
			],
			conflicts: [
				{
					id: "combat-utility-belt",
					type: "module",
					reason: `Redundant when used with ${SharedConsts.MODULE_TITLE} module dependencies, and often conflicts with them.`,
				},
				{
					id: "betterrolls5e",
					type: "module",
					reason: "May cause issues with features which require rolls; use with caution.",
				},
				{
					id: "mars-5e",
					type: "module",
					reason: "May cause issues with features which require rolls; use with caution.",
				},
				{
					id: "mre-dnd5e",
					type: "module",
					reason: "May cause issues with features which require rolls; use with caution.",
				},
			],
		},
		esmodules: [
			"./js/Main.js",
		],
	});

	const itemMacroDirs = new Set(fs.readdirSync(DIR_ITEM_MACROS));
	const noItemMacroDirs = fs.readdirSync("module/data")
		.filter(name => !itemMacroDirs.has(name))
		.map(name => path.join(SharedConsts.MODULE_DIR, "data", name));

	const files = Uf.listJsonFiles(
		path.join(SharedConsts.MODULE_DIR, "data"),
		{
			dirBlocklist: new Set(noItemMacroDirs),
		},
	);
	files
		.forEach(filePath => {
			const json = Uf.readJSON(filePath);
			const parentDir = path.basename(path.dirname(filePath));

			let isMod = false;
			Object.values(json)
				.forEach(arr => {
					if (!(arr instanceof Array)) return;

					arr.forEach(ent => {
						if (ent._TODO) delete ent._TODO;

						if (!ent.itemMacro) return;

						const macroPath = path.join(DIR_ITEM_MACROS, parentDir, ent.itemMacro);

						const lines = fs.readFileSync(macroPath, "utf-8")
							.trim()
							.split("\n");

						const ixStart = lines.findIndex(l => l.startsWith("async function macro"));
						if (!~ixStart) throw new Error(`Expected macro "${macroPath}" to include "async function macro ..."`);

						if (lines.at(-1) !== "}") throw new Error(`Expected macro "${macroPath}" to end with "\\n}"!`);

						ent.itemMacro = lines
							.slice(ixStart + 1, -1)
							.map(it => it.replace(/^\t/, ""))
							.join("\n");

						if (ent.flags?.itemacro) throw new Error(`Entity had both "itemMacro" and "itemacro" flags!`);

						isMod = true;
					});
				});
			if (!isMod) return;

			fs.writeFileSync(filePath, JSON.stringify(json, null, "\t"));
		});
};
