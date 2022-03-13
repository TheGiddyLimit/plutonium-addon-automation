import Ajv from "ajv";
import * as jsonSourceMap from "json-source-map";
import * as kludge from "../script/kludge.js";

const ajv = new Ajv({
	allowUnionTypes: true,
});

ajv.addKeyword({
	keyword: "version",
	validate: false,
});

const schema = kludge.readJsonSync("./test/schema/data.json");

let isFail = false;
kludge.lsRecursiveSync("./module/data")
	.filter(it => !it.includes("_generated") && it.endsWith(".json"))
	.forEach(path => {
		console.log(`Testing ${path}`);
		const data = kludge.readJsonSync(path);
		const valid = ajv.validate(schema, data);
		if (valid) return;

		// Add line numbers
		const sourceMap = jsonSourceMap.stringify(data, null, "\t");
		ajv.errors.forEach(it => {
			const errorPointer = sourceMap.pointers[it.instancePath];
			it.lineNumberStart = errorPointer.value.line;
			it.lineNumberEnd = errorPointer.valueEnd.line;
		});

		const out = ajv.errors.map(it => JSON.stringify(it, null, 2)).join("\n");
		console.error(out);
		isFail = true;
	});

if (isFail) {
	console.error(`Files failed schema test!`);
	process.exit(1);
}
console.log(`All files passed.`);
