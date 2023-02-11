import * as fs from "fs";
import {Kludge} from "plutonium-utils";

async function main () {
	const packageList = Kludge.readJsonSync("./script/data/foundry-modules.json");

	const packageLookup = {};
	packageList.packages.forEach(pack => packageLookup[pack.name] = pack);

	const out = {};

	Kludge.lsRecursiveSync("./module/data")
		.filter(it => !it.includes("_generated") && it.endsWith(".json"))
		.forEach(filePath => {
			const json = Kludge.readJsonSync(filePath);
			Object.entries(json)
				.forEach(([prop, arr]) => {
					if (!(arr instanceof Array)) return;

					arr.forEach(ent => {
						(ent?.effects || []).forEach(eff => {
							if (!eff.requires) return;
							Object.keys(eff.requires)
								.forEach(moduleId => {
									if (!packageLookup[moduleId]) throw new Error(`Module with ID "${moduleId}" was not a known Foundry package!`);
									out[moduleId] = packageLookup[moduleId];
								});
						});
					});
				});
		});

	fs.writeFileSync("./module/data/_generated/optional-dependencies.json", JSON.stringify(out), "utf-8");
	console.log("Regenerated optional dependency lookup.");
}

main()
	.catch(e => { throw e; });
