import * as fs from "fs";
import {Kludge} from "plutonium-utils";

async function main () {
	const packageList = Kludge.readJsonSync("./script/data/foundry-modules.json");

	const packageLookup = {};
	packageList.packages.forEach(pack => packageLookup[pack.name] = pack);

	const out = {};

	const handleRequiresObj = (requiresObj) => {
		if (!requiresObj) return;
		Object.keys(requiresObj)
			.forEach(moduleId => {
				if (!packageLookup[moduleId]) throw new Error(`Module with ID "${moduleId}" was not a known Foundry package!`);
				out[moduleId] = packageLookup[moduleId];
			});
	};

	Kludge.lsRecursiveSync("./module/data")
		.filter(it => !it.includes("_generated") && it.endsWith(".json"))
		.forEach(filePath => {
			const json = Kludge.readJsonSync(filePath);
			Object.values(json)
				.forEach((arr) => {
					if (!(arr instanceof Array)) return;

					arr.forEach(ent => {
						(ent?.effects || []).forEach(eff => handleRequiresObj(eff.requires));
						handleRequiresObj(ent.itemMacro?.requires);
					});
				});
		});

	fs.writeFileSync("./module/data/_generated/optional-dependencies.json", JSON.stringify(out), "utf-8");
	console.log("Regenerated optional dependency lookup.");
}

main()
	.catch(e => { throw e; });
