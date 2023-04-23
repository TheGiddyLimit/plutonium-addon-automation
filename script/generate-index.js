import * as fs from "fs";
import {Uf} from "5etools-utils";

const out = {};
let ixFile = 0;
const outFileInverse = {};

const _PROP_PRECEDENCE = [
	"classSource",
	"className",
	"subclassSource",
	"subclassShortName",
	"level",

	"raceSource",
	"raceName",

	"backgroundSource",
	"backgroundName",

	"psionicSource",
	"psionicName",

	"source",
	"name",
];

Uf.lsRecursiveSync("./module/data")
	.filter(it => !it.includes("_generated") && it.endsWith(".json"))
	.forEach(filePath => {
		const json = Uf.readJsonSync(filePath);
		Object.entries(json)
			.forEach(([prop, arr]) => {
				if (!(arr instanceof Array)) return;

				arr.forEach(ent => {
					let tgt = out[prop] = out[prop] || {};

					const propPathParts = _PROP_PRECEDENCE.map(propSub => ent[propSub]).filter(Boolean);
					propPathParts.forEach((pt, i) => {
						if (i === propPathParts.length - 1) {
							const filePathExt = filePath.replace(/\\/g, "/").replace(/^module\/data\//, "");

							tgt[pt] = (outFileInverse[filePathExt] = outFileInverse[filePathExt] ?? ixFile++);
							return;
						}

						tgt = (tgt[pt] = tgt[pt] || {});
					});
				});
			});
	});

out._file = {};
Object.entries(outFileInverse).forEach(([filePath, ix]) => out._file[ix] = filePath);

fs.writeFileSync("./module/data/_generated/index.json", JSON.stringify(out), "utf-8");
console.log("Regenerated index.");
