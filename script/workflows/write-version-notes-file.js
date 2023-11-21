import fs from "fs";

const [, , tag] = process.argv;
if (!tag) throw new Error(`No tag specified!`);

const ver = tag.replace(/^v/, "");

const verLog = JSON.parse(fs.readFileSync(`meta/changelog.json`, "utf-8"))
	.find(log => log.ver === ver);

if (!verLog) throw new Error(`No changelog found for version "${ver}"!`);

fs.writeFileSync(`NOTES_FILE.md`, verLog.txt, "utf-8");
