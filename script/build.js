import {buildTask} from "./build-task.js";
import {Command} from "commander";

const program = new Command()
	.option("--dev", `If this is a "dev" build`)
;

program.parse(process.argv);
const params = program.opts();

buildTask({isBundle: !params.dev}).then(null);
