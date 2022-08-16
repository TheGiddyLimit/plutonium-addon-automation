import * as fs from "fs";
import {Um} from "5etools-utils";
import { Command } from "commander";
import path from "path";
import {DIR_ITEM_MACROS} from "./consts.js";

const MACRO_TEMPLATE = `async function macro (args) {
	// TODO write your macro here!
}
`;

const program = new Command()
	.requiredOption("-d, --dir <dir>", `Macro directory, e.g. "spell"`)
	.requiredOption("-s, --source <source>", `JSON source, e.g. "PHB"`)
	.requiredOption("-n, --name <name>", `Item name, e.g. "Fireball"`)
;

program.parse(process.argv);
const params = program.opts();

function main () {
	if (params.dir.replace(/[^a-zA-Z]+/g, "") !== params.dir) throw new Error(`Directory name "${params.dir}" is probably invalid! Expected only lowercase and uppercase letters!`);

	const dirPath = path.join(DIR_ITEM_MACROS, params.dir);
	fs.mkdirSync(dirPath, {recursive: true});

	const filePath = path.join(
		dirPath,
		// FIXME better sluggification of `name`
		`${params.source}_${params.name.toLowerCase().replace(/ /g, "-")}.js`,
	);

	if (fs.existsSync(filePath)) throw new Error(`File "${filePath}" already exists!`);

	fs.writeFileSync(filePath, MACRO_TEMPLATE, "utf-8");

	Um.info(`MACRO`, `Created macro file "${filePath}"`);
}

main();
