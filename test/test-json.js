import * as fs from "fs";
import * as pathlib from "path";

import {Um, JsonTester} from "5etools-utils";

const _SCHEMA_LOOKUP = {
	"changelog.json": "changelog.json",
	"__core.json": "core.json",
};

async function main () {
	const tester = new JsonTester(
		{
			dirSchema: "test/schema",
			fnGetSchemaId: path => _SCHEMA_LOOKUP[pathlib.basename(path)] || "homebrew.json",
		},
	);
	// Use the 5etools `changelog.json` schema
	tester.doLoadSchema("site", "changelog.json");
	await tester.pInit();

	const {errors, errorsFull} = [
		["meta"],
		["module/data", {dirBlocklist: new Set(["module/data/_generated"])}],
	].reduce((accum, [dir, opts]) => {
		const {errors, errorsFull} = tester.getErrors(dir, opts);
		accum.errors = accum.errors.concat(errors);
		accum.errorsFull = accum.errorsFull.concat(errorsFull);
		return accum;
	}, {errors: [], errorsFull: []});

	if (errors.length) {
		if (!process.env.CI) fs.writeFileSync(`test/test-json.error.log`, errorsFull.join("\n\n=====\n\n"));
		console.error(`Schema test failed (${errors.length} failure${errors.length === 1 ? "" : "s"}).`);
		process.exit(1);
	}

	if (!errors.length) Um.info("JSON", `Schema test passed.`);
}

await main();
