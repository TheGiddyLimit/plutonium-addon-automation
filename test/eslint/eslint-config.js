export const CONFIG_IGNORES = {
	// Note: there should be no other properties in this object
	ignores: [
		// Other dirs
		"docs/*",
		"license/*",
		"meta/*",

		// External code
		"shared/foundry-globals.js",

		// Generated
		"dist/*",

		// Libraries
		"node_modules/*",

		// Scratches
		"scratch/*",
	],
};
