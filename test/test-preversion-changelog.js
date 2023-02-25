import {Kludge} from "plutonium-utils";
import {Um} from "5etools-utils";

function main () {
	const json = Kludge.readJsonSync("./meta/changelog.json");

	if (json.at(-1).ver === Kludge.readJsonSync("package.json").version) {
		Um.error("CHANGELOG", `Latest "changelog.json" version matches "package.json" version! Expected "changelog.json" version to be ahead of "package.json" version.`);
		process.exit(1);
	}

	Um.info("CHANGELOG", `Changelog test passed.`);
}

main();
