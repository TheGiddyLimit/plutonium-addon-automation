import * as fs from "fs";
import {Uf} from "5etools-utils";

const json = Uf.readJsonSync("./meta/changelog.json");

const out = [
	"# Changelog",
	...json
		.reverse()
		.map(({ver, date, txt}) => {
			return `## ${ver}

> ${date}

${txt}`;
		}),
]
	.join("\n\n");

fs.writeFileSync("./CHANGELOG.md", `${out}\n`, "utf-8");
console.log("Wrote CHANGELOG.md");
