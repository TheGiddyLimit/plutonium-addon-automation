import Zip from "adm-zip-giddy";
import {SharedConsts} from "../module/shared/SharedConsts.js";
import {Kludge} from "plutonium-utils";
import * as path from "path";
import {buildTask} from "./build-task.js";

function _zip (dirPart, zipRoot) {
	const zip = new Zip();
	const DIR_PART = `${dirPart}/`;
	const allFiles = Kludge.lsRecursiveSync(DIR_PART);
	allFiles.forEach(f => {
		const zipPath = f.substring(DIR_PART.length - 2);

		if (!zipPath.includes(path.sep)) {
			return zip.addLocalFile(f, zipRoot);
		}

		const parts = zipPath.split(path.sep);
		parts.pop();
		const zipDir = parts.join(path.sep);
		zip.addLocalFile(f, path.join(zipRoot, zipDir));
	});

	return zip;
}

async function doPackage () {
	await buildTask();

	const zip = _zip(SharedConsts.MODULE_DIR, SharedConsts.MODULE_ID);

	const outPath = `./dist/${SharedConsts.MODULE_ID}.zip`;
	zip.writeZip(outPath);
	console.log(`Wrote zip to: ${outPath}`);
}

doPackage().catch(err => console.error(err));
