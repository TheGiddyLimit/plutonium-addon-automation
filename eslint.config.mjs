import {
	ESLINT_CONFIG_BASE,
	ESLINT_CONFIG_BROWSER,
	ESLINT_CONFIG_FOUNDRY,
	ESLINT_CONFIG_JEST,
	ESLINT_CONFIG_NODE,
	ESLINT_CONFIG_VETOOLS,
} from "5etools-utils/eslint/eslint-config.js";
import {getEslintGlobals} from "5etools-utils/eslint/eslint-globals.js";
import {CONFIG_IGNORES} from "./test/eslint/eslint-config.js";

const FILES_FOUNDRY = [
	"macro-item/**/*.js",
	"module/**/*.js",
	"shared/**/*.js",
	"tool/foundry-data-converter-lib/**/*.js",
];

const FILES_BROWSER = [
	...FILES_FOUNDRY,
	"tool/client/**/*.js",
	"tool/foundry-data-converter/client.js",
];

const FILES_VETOOLS = [
	...FILES_BROWSER,
	"test/**/*.js",
];

const FILES_NODE = [
	"*.js",
	"*.cjs",
	"*.mjs",
	"script/**/*.js",
	"test/**/*.js",
	"tool/**/*.js",
];

const GLOBALS_FOUNDRY_INTEGRATIONS = getEslintGlobals([
	"AutomatedAnimations",
	"chrisPremades",
	"ItemPiles",
	"libWrapper",
	"localforage",
	"logger",
	"MidiQOL",
	"Sequence",
	"Sequencer",
]);

const GLOBALS_TOOL = getEslintGlobals([
	"JSZip",
]);

export default [
	...ESLINT_CONFIG_BASE,
	{
		...ESLINT_CONFIG_BROWSER,
		files: FILES_BROWSER,
	},
	{
		...ESLINT_CONFIG_VETOOLS,
		files: FILES_VETOOLS,
	},
	{
		...ESLINT_CONFIG_FOUNDRY,
		files: FILES_FOUNDRY,
	},
	{
		files: FILES_FOUNDRY,
		languageOptions: {
			globals: GLOBALS_FOUNDRY_INTEGRATIONS,
		},
	},
	{
		files: ["tool/**/*.js"],
		languageOptions: {
			globals: GLOBALS_TOOL,
		},
	},
	{
		...ESLINT_CONFIG_NODE,
		files: FILES_NODE,
	},
	{
		...ESLINT_CONFIG_JEST,
		files: ["test/**/*.js"],
	},
	CONFIG_IGNORES,
];
