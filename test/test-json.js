import * as fs from "fs";

import {Um, JsonTester} from "5etools-utils";

function main () {
	const {errors, errorsFull} = new JsonTester(
		{
			dirSchema: "test/schema",
			fnGetSchemaId: path => path.includes("__core.json") ? "core.json" : "homebrew.json",
		},
	).getErrors("module/data", {dirBlocklist: new Set(["module/data/_generated"])});

	if (errors.length) {
		if (!process.env.CI) fs.writeFileSync(`test/test-json.error.log`, errorsFull.join("\n\n=====\n\n"));
		console.error(`Schema test failed (${errors.length} failure${errors.length === 1 ? "" : "s"}).`);
		process.exit(1);
	}

	if (!errors.length) Um.info("JSON", `Schema test passed.`);
}

main();
