import * as fs from "fs";
import {SharedConsts} from "../module/shared/SharedConsts.js";
import * as kludge from "./kludge.js";

const packageJson = JSON.parse(fs.readFileSync(`./package.json`, "utf-8"));

const MODULE_JSON =
	{
		"name": SharedConsts.MODULE_NAME,
		"title": SharedConsts.MODULE_TITLE,
		"description": "Plutonium data integration for DAE, Midi-QOL, etc.",
		"version": packageJson.version,
		"authors": [
			{
				"name": "Giddy",
				"url": "https://www.patreon.com/Giddy5e",
				"discord": "Giddy#0001",
			},
			{
				"name": "Spappz",
				"discord": "spap#9812",
			},
		],
		"readme": "README.md",
		"license": "MIT",
		"minimumCoreVersion": "0.8.4",
		"compatibleCoreVersion": "9",
		"url": "https://www.patreon.com/Giddy5e",
		"bugs": "https://discord.gg/nGvRCDs",
		"dependencies": [
			{
				"name": "plutonium",
				"type": "module",
				"manifest": "https://raw.githubusercontent.com/TheGiddyLimit/plutonium-next/master/module.json",
			},
			{
				"name": "midi-qol",
				"type": "module",
				"manifest": "https://gitlab.com/tposney/midi-qol/raw/master/package/module.json",
			},
			{
				"name": "dae",
				"type": "module",
				"manifest": "https://gitlab.com/tposney/dae/raw/master/package/module.json",
			},
			{
				"name": "times-up",
				"type": "module",
				"manifest": "https://gitlab.com/tposney/times-up/raw/master/package/module.json",
			},
			{
				"name": "dfreds-convenient-effects",
				"type": "module",
				"manifest": "https://github.com/DFreds/dfreds-convenient-effects/releases/latest/download/module.json",
			},
		],
		"esmodules": [
			"./js/Main.js",
		],
	};

async function doBuild () {
	const timeStart = Date.now();

	console.log("Wiping dist...");
	kludge.removeSync(SharedConsts.MODULE_DIR);

	console.log(`Packaging v${packageJson.version}...`);

	console.log(`Adding module directories...`);
	[
		"data",
		"js",
		"shared",
	].forEach(dir => {
		console.log(`Adding contents of "${dir}" directory...`);
		kludge.copySync(`./module/${dir}`, `${SharedConsts.MODULE_DIR}/${dir}`);
	});

	console.log(`Adding README...`);
	kludge.copySync(`./MODULE_README.md`, `${SharedConsts.MODULE_DIR}/README.md`);

	console.log(`Adding "module.json"...`);
	fs.writeFileSync(`${SharedConsts.MODULE_DIR}/module.json`, JSON.stringify(MODULE_JSON, null, "\t"), "utf-8");

	console.log(`Build completed in ${((Date.now() - timeStart) / 1000).toFixed(2)} secs`);
}

export default doBuild;
