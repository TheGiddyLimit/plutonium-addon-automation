import path from "path";
import doBuild from "plutonium-utils/lib/BuildTask.js";
import {SharedConsts} from "../module/shared/SharedConsts.js";
import {Uf} from "5etools-utils";
import fs from "fs";
import {BUNDLE_MODULE_PATH, DIR_ITEM_MACROS, DIST_SUBDIR_MODULE} from "./consts.js";
import pBuildBundleJs from "./build-bundle.js";

const packageJson = Uf.readJsonSync(`./package.json`);

export const buildTask = async (
	{
		isBundle = false,
	} = {},
) => {
	await doBuild({
		dir: DIST_SUBDIR_MODULE,

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
				discord: "giddy_",
			},
			{
				name: "Spappz",
				discord: "spap",
			},
		],
		readme: "README.md",
		license: "MIT",
		// Use "latest" as manifest URL, so that when updating the module the user always gets the latest version
		manifest: `https://github.com/TheGiddyLimit/plutonium-addon-automation/releases/latest/download/module.json`,
		// Set "download" to this specific version, so that users manually entering the link will receive the version they expect
		download: `https://github.com/TheGiddyLimit/plutonium-addon-automation/releases/download/v${packageJson.version}/plutonium-addon-automation.zip`,
		changelog: "https://raw.githubusercontent.com/TheGiddyLimit/plutonium-addon-automation/master/CHANGELOG.md",
		compatibility: {
			minimum: "10",
			verified: "12.329",
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
					id: "lib-wrapper",
					type: "module",
					manifest: "https://github.com/ruipin/fvtt-lib-wrapper/releases/latest/download/module.json",
				},
				{
					id: "midi-qol",
					type: "module",
					manifest: "https://gitlab.com/tposney/midi-qol/raw/v10/package/module.json",
				},
				{
					id: "dae",
					type: "module",
					manifest: "https://gitlab.com/tposney/dae/raw/v10/package/module.json",
				},
				{
					id: "times-up",
					type: "module",
					manifest: "https://gitlab.com/tposney/times-up/raw/v10/package/module.json",
				},
				{
					id: "dfreds-convenient-effects",
					type: "module",
					manifest: "https://github.com/DFreds/dfreds-convenient-effects/releases/latest/download/module.json",
				},
			],
			// See: https://github.com/foundryvtt/foundryvtt/issues/8649
			recommends: [
				// region Modules required by specific automations
				{
					id: "ActiveAuras",
					type: "module",
					reason: "Enables additional automations",
				},
				{
					id: "ATL",
					type: "module",
					reason: "Enables additional automations",
				},
				// endregion

				// region Optional integrations
				{
					id: "chris-premades",
					type: "module",
					reason: "Provides an additional data source from which to draw automations",
				},
				{
					id: "midi-srd",
					type: "module",
					reason: "Provides an additional data source from which to draw automations",
				},
				// endregion
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
				{
					id: "ready-set-roll-5e",
					type: "module",
					reason: "May cause issues with features which require rolls; use with caution.",
				},
				{
					id: "wire",
					type: "module",
					reason: "May cause issues with features which require rolls; use with caution.",
				},
			],
		},
		esmodules: isBundle
			? [
				BUNDLE_MODULE_PATH,
			]
			: [
				`./js/Main.js`,
			],
		dirsModuleIgnore: isBundle ? ["js"] : [],
	});

	if (isBundle) await pBuildBundleJs();

	const itemMacroDirs = new Set(fs.readdirSync(DIR_ITEM_MACROS));
	const noItemMacroDirs = fs.readdirSync("module/data")
		.filter(name => !itemMacroDirs.has(name))
		.map(name => path.join(DIST_SUBDIR_MODULE, "data", name));

	const files = Uf.listJsonFiles(
		path.join(DIST_SUBDIR_MODULE, "data"),
		{
			dirBlocklist: new Set(noItemMacroDirs),
		},
	);
	files
		.forEach(filePath => {
			const json = Uf.readJsonSync(filePath);
			const parentDir = path.basename(path.dirname(filePath));

			let isMod = false;
			Object.values(json)
				.forEach(arr => {
					if (!(arr instanceof Array)) return;

					arr.forEach(ent => {
						if (ent._TODO) delete ent._TODO;

						if (!ent.itemMacro) return;

						const macroPath = path.join(DIR_ITEM_MACROS, parentDir, ent.itemMacro.file);

						const lines = fs.readFileSync(macroPath, "utf-8")
							.trim()
							.split("\n");

						const ixStart = lines.findIndex(l => l.startsWith("async function macro"));
						if (!~ixStart) throw new Error(`Expected macro "${macroPath}" to include "async function macro ..."`);

						if (lines.at(-1) !== "}") throw new Error(`Expected macro "${macroPath}" to end with "\\n}"!`);

						ent.itemMacro = {
							...ent.itemMacro,
							file: undefined,
							script: lines
								.slice(ixStart + 1, -1)
								.map(it => it.replace(/^\t/, ""))
								.join("\n"),
						};

						if (ent.flags?.itemacro) throw new Error(`Entity had both "itemMacro" and "itemacro" flags!`);
						if (ent.flags?.dae?.macro) throw new Error(`Entity had both "itemMacro" and "dae.macro" flags!`);

						isMod = true;
					});
				});
			if (!isMod) return;

			fs.writeFileSync(filePath, JSON.stringify(json, null, "\t"));
		});
};
