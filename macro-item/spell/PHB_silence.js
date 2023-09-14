/**
 * Credit to D&D Beyond Importer (https://github.com/MrPrimate/ddb-importer)
 * See: `../../license/ddb-importer.md`
 */
async function macro (args) {
	if (!game.modules.get("ActiveAuras")?.active) {
		ui.notifications.error("ActiveAuras is not enabled");
		return;
	}

	if (args[0].macroPass === "preActiveEffects" || args[0].tag === "OnUse") {
		return game.modules.get("ActiveAuras").api.AAHelpers.applyTemplate(args);
	}
}
