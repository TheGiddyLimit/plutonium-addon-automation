/**
 * Credit to D&D Beyond Importer (https://github.com/MrPrimate/ddb-importer)
 * See: `../../license/ddb-importer.md`
 */
async function macro (args) {
	// Based on a macro provided by the delightful @Elwin#1410

	// Default name of the item
	const defaultItemName = "Hail of Thorns";
	// Set to false to remove debug logging
	const debug = false;

	const dependencies = ["dae", "itemacro", "times-up", "midi-qol"];
	if (!game.modules.get("plutonium-addon-automation")?.api.DdbImporter.effects.requirementsSatisfied(defaultItemName, dependencies)) {
		return;
	}

	if (debug) {
		console.error(defaultItemName, args);
	}

	if (args[0].tag === "OnUse" && args[0].macroPass === "postActiveEffects") {
		const macroData = args[0];

		if (macroData.hitTargets.length < 1) {
			// No target hit
			return;
		}
		const rangedWeaponAttack = game.modules.get("plutonium-addon-automation")?.api.DdbImporter.effects.isRangedWeaponAttack(macroData);
		if (!rangedWeaponAttack) {
			// Not a ranged weapon attack
			return;
		}
		const sourceItem = fromUuidSync(macroData.sourceItemUuid);
		const itemName = sourceItem?.name ?? defaultItemName;

		const originEffect = macroData.actor.effects.find(
			(ef) => ef.getFlag("midi-qol", "castData.itemUuid") === macroData.sourceItemUuid,
		);
		if (!originEffect) {
			console.error(`${defaultItemName}: spell active effect was not found.`);
			return;
		}
		const level = getProperty(originEffect, "flags.midi-qol.castData.castLevel") ?? 1;
		const nbDice = Math.min(level, 6);

		// Temporary spell data for the burst effect
		const areaSpellData = {
			type: "spell",
			name: `${itemName}: Burst`,
			img: sourceItem?.img,
			system: {
				level: level,
				target: {type: "sphere"},
				chatFlavor: `[${nbDice}d10 - piercing] Target of the attack and each creature within 5 feet of it`,
				damage: {parts: [[`${nbDice}d10[piercing]`, "piercing"]], versatile: ""},
				actionType: "save",
				save: {ability: "dex"},
				preparation: {mode: "atwill"},
				duration: {units: "inst"},
			},
		};
		setProperty(
			areaSpellData,
			"flags.midi-qol.onUseMacroName",
			`[preItemRoll]ItemMacro.${macroData.sourceItemUuid},[preambleComplete]ItemMacro.${macroData.sourceItemUuid},[preActiveEffects]ItemMacro.${macroData.sourceItemUuid}`,
		);

		// eslint-disable-next-line new-cap
		const areaSpell = new CONFIG.Item.documentClass(areaSpellData, {
			parent: macroData.actor,
			temporary: true,
		});

		const options = {
			createWorkflow: true,
			targetUuids: macroData.hitTargetUuids,
			configureDialog: false,
		};
		await MidiQOL.completeItemUse(areaSpell, {}, options);

		// Remove concentration and the effect causing it since the effect has been used
		const effect = MidiQOL.getConcentrationEffect(macroData.actor);
		if (effect) {
			await effect.delete();
		}
	} else if (args[0].tag === "OnUse" && args[0].macroPass === "preItemRoll") {
		const macroData = args[0];

		// Disable template creation, created and placed automatically in dnd5e.useItem hook.
		macroData.workflow.config.createMeasuredTemplate = false;
		Hooks.once("dnd5e.useItem", async function (item, config, options, templates) {
			if (item.name !== macroData.item.name) {
				return;
			}
			const effectRange = 5;
			const targetToken = macroData.targets[0].object;
			const circleRadius = (targetToken.document.width / 2) * 5 + effectRange;
			const templateData = {
				t: "circle",
				user: game.user.id,
				x: targetToken.center.x,
				y: targetToken.center.y,
				direction: 0,
				distance: circleRadius,
				borderColor: game.user.color,
			};
			// Note: set flag for walled templates if module enabled
			if (game.modules.get("walledtemplates")?.active) {
				setProperty(templateData, "flags.walledtemplates", {wallsBlock: "walled", wallRestriction: "move"});
			}
			// Note: this flag is set to allow AA to trigger if a template config exists for 'Hail of Thorns'
			setProperty(templateData, "flags.dnd5e.origin", macroData.sourceItemUuid);

			const [measuredTemplateDoc] = await canvas.scene.createEmbeddedDocuments("MeasuredTemplate", [templateData]);
			if (!measuredTemplateDoc) {
				console.error(`${defaultItemName} | Error could not create template`, templateData);
			}
		});
		return true;
	} else if (args[0].tag === "OnUse" && args[0].macroPass === "preambleComplete") {
		const macroData = args[0];
		// Add template to concentration data to be auto deleted
		const concentrationData = macroData.actor.getFlag("midi-qol", "concentration-data");
		if (concentrationData) {
			const templatesToDelete = concentrationData.templates ? duplicate(concentrationData.templates) : [];
			templatesToDelete.push(macroData.workflow.templateUuid);
			await macroData.actor.setFlag("midi-qol", "concentration-data.templates", templatesToDelete);
		}

		// Select targets
		const effectRange = 5;
		const targetToken = macroData.targets[0].object;
		const aoeTargets = game.modules.get("plutonium-addon-automation")?.api.DdbImporter.effects.selectTargetsWithinX(targetToken, effectRange, true);
		if (debug) {
			console.log(`${defaultItemName} | Burst targets`, aoeTargets);
		}
	} else if (args[0].tag === "OnUse" && args[0].macroPass === "preActiveEffects") {
		const macroData = args[0];
		// Note: update workflow to prevent adding effect to delete template, already handled by concentration-data
		macroData.workflow.templateUuid = undefined;
	}
}
