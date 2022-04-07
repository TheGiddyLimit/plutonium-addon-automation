import * as fs from "fs";
import {Um, Uf} from "5etools-utils";
import { Command } from "commander";

const program = new Command()
	.option("--fix", `Fix the files.`)
;

program.parse(process.argv);
const params = program.opts();

const _RUN_TIMESTAMP = Math.floor(Date.now() / 1000);
const _MAX_TIMESTAMP = 9999999999;

function cleanFolder (folder) {
	const ALL_ERRORS = [];

	const files = Uf.listJsonFiles(folder);
	files
		.forEach(filePath => {
			let {raw, json} = Uf.readJSON(filePath, {isIncludeRaw: true});

			if (!filePath.endsWith(".json")) ALL_ERRORS.push(`${filePath} had invalid extension! Should be ".json" (case-sensitive).`);

			if (!filePath.includes("__core.json")) {
				// region clean
				// Ensure _meta is at the top of the file
				const tmp = {$schema: json.$schema, _meta: json._meta};
				delete json.$schema;
				delete json._meta;
				Object.assign(tmp, json);
				json = tmp;

				if (json._meta.dateAdded == null) {
					Um.warn(`TIMESTAMPS`, `\tFile "${filePath}" did not have "dateAdded"! Adding one...`);
					json._meta.dateAdded = _RUN_TIMESTAMP;
				} else if (json._meta.dateAdded > _MAX_TIMESTAMP) {
					Um.warn(`TIMESTAMPS`, `\tFile "${filePath}" had a "dateAdded" in milliseconds! Converting to seconds...`);
					json._meta.dateAdded = Math.round(json._meta.dateAdded / 1000);
				}

				if (json._meta.dateLastModified == null) {
					Um.warn(`TIMESTAMPS`, `\tFile "${filePath}" did not have "dateLastModified"! Adding one...`);
					json._meta.dateLastModified = _RUN_TIMESTAMP;
				} else if (json._meta.dateLastModified > _MAX_TIMESTAMP) {
					Um.warn(`TIMESTAMPS`, `\tFile "${filePath}" had a "dateLastModified" in milliseconds! Converting to seconds...`);
					json._meta.dateLastModified = Math.round(json._meta.dateLastModified / 1000);
				}
				// endregion
			}

			const out = `${JSON.stringify(json, null, "\t")}\n`;

			if (params.fix) return fs.writeFileSync(filePath, out);
			if (out !== raw) ALL_ERRORS.push(`${filePath} should be re-formatted! Run "npm run lint:data" to re-format all files.`);
		});

	if (!ALL_ERRORS.length) return;

	ALL_ERRORS.forEach(e => console.error(e));
	process.exit(1);
}

function main () {
	Uf.runOnDirs(
		(dir) => {
			Um.info(`DATA`, `${params.fix ? "Fixing" : "Testing"} dir "${dir}"...`);
			cleanFolder(dir);
		},
		"module/data",
	);

	Um.info(`DATA`, `${params.fix ? "Fixing" : "Testing"} complete.`);
}

main();
