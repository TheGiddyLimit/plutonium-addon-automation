import {rollup} from "rollup";
import {BUNDLE_PATH} from "./consts.js";

export default async function main () {
	console.log(`Bundling JS to "${BUNDLE_PATH}"...`);

	const bundle = await rollup({
		input: "module/js/Main.js",
	});

	await bundle.write({
		file: BUNDLE_PATH,
		format: "es",
	});

	await bundle.close();
}
