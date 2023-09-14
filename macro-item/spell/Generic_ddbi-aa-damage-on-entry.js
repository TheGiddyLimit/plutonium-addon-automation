/**
 * Credit to D&D Beyond Importer (https://github.com/MrPrimate/ddb-importer)
 * See: `../../license/ddb-importer.md`
 */
async function macro (args) {
	if (!game.modules.get("ActiveAuras")?.active) {
		ui.notifications.error("ActiveAuras is not enabled");
		return;
	} else if (!game.modules.get("plutonium-addon-automation")?.active) {
		ui.notifications.error("plutonium-addon-automation is not enabled");
		return;
	}

	const lastArg = args[args.length - 1];

	async function rollItemDamage (targetToken, itemUuid, itemLevel) {
		const item = await fromUuid(itemUuid);
		const caster = item.parent;
		const ddbEffectFlags = item.flags["plutonium-addon-automation"].effect;
		const isCantrip = ddbEffectFlags.isCantrip;
		const damageDice = ddbEffectFlags.dice;
		const damageType = ddbEffectFlags.damageType;
		const saveAbility = ddbEffectFlags.save;
		const casterToken = canvas.tokens.placeables.find((t) => t.actor?.uuid === caster.uuid);
		const scalingDiceArray = item.system.scaling.formula.split("d");
		const scalingDiceNumber = itemLevel - item.system.level;
		const upscaledDamage = isCantrip
			? `${game.modules.get("plutonium-addon-automation").api.DdbImporter.effects.getCantripDice(caster)}d${scalingDiceArray[1]}[${damageType}]`
			: scalingDiceNumber > 0 ? `${scalingDiceNumber}d${scalingDiceArray[1]}[${damageType}] + ${damageDice}` : damageDice;

		const workflowItemData = duplicate(item);
		workflowItemData.system.target = {value: 1, units: "", type: "creature"};
		workflowItemData.system.save.ability = saveAbility;
		workflowItemData.system.components.concentration = false;
		workflowItemData.system.level = itemLevel;
		workflowItemData.system.duration = {value: null, units: "inst"};
		workflowItemData.system.target = {value: null, width: null, units: "", type: "creature"};

		setProperty(workflowItemData, "flags.itemacro", {});
		setProperty(workflowItemData, "flags.midi-qol", {});
		setProperty(workflowItemData, "flags.dae", {});
		setProperty(workflowItemData, "effects", []);
		delete workflowItemData._id;

		const saveOnEntry = ddbEffectFlags.saveOnEntry;
		// console.warn("saveOnEntry", {ddbEffectFlags, saveOnEntry});
		if (saveOnEntry) {
			// eslint-disable-next-line new-cap
			const entryItem = new CONFIG.Item.documentClass(workflowItemData, {parent: caster});
			// console.warn("Saving item on entry", {entryItem, targetToken});
			const options = {
				showFullCard: false,
				createWorkflow: true,
				targetUuids: [targetToken.document.uuid],
				configureDialog: false,
				versatile: false,
				consumeResource: false,
				consumeSlot: false,
			};
			await MidiQOL.completeItemUse(entryItem, {}, options);
		} else {
			const damageRoll = await new CONFIG.Dice.DamageRoll(upscaledDamage).evaluate({async: true});
			if (game.dice3d) game.dice3d.showForRoll(damageRoll);

			workflowItemData.name = `${workflowItemData.name}: Turn Entry Damage`;

			await new MidiQOL.DamageOnlyWorkflow(
				caster,
				casterToken,
				damageRoll.total,
				damageType,
				[targetToken],
				damageRoll,
				{
					flavor: `(${CONFIG.DND5E.damageTypes[damageType]})`,
					itemCardId: "new",
					itemData: workflowItemData,
					isCritical: false,
				},
			);
		}
	}

	if (args[0].tag === "OnUse" && args[0].macroPass === "preActiveEffects") {
		const safeName = lastArg.itemData.name.replace(/\s|'|\.|’/g, "_");
		const dataTracker = {
			randomId: randomID(),
			targetUuids: lastArg.targetUuids,
			startRound: game.combat.round,
			startTurn: game.combat.turn,
			spellLevel: lastArg.spellLevel,
		};

		const item = await fromUuid(lastArg.itemUuid);
		await DAE.unsetFlag(item, `${safeName}Tracker`);
		await DAE.setFlag(item, `${safeName}Tracker`, dataTracker);

		const ddbEffectFlags = lastArg.item.flags["plutonium-addon-automation"]?.effect;

		if (ddbEffectFlags) {
			const sequencerFile = ddbEffectFlags.sequencerFile;
			if (sequencerFile) {
				const scale = ddbEffectFlags.sequencerScale ?? 1;
				await game.modules.get("plutonium-addon-automation").api.DdbImporter.effects.attachSequencerFileToTemplate(lastArg.templateUuid, sequencerFile, lastArg.itemUuid, scale);
			}
			if (ddbEffectFlags.isCantrip) {
				const cantripDice = game.modules.get("plutonium-addon-automation").api.DdbImporter.effects.getCantripDice(lastArg.actor);
				args[0].spellLevel = cantripDice;
				ddbEffectFlags.cantripDice = cantripDice;
				let newEffects = args[0].item.effects.map((effect) => {
					effect.changes = effect.changes.map((change) => {
						change.value = change.value.replace("@cantripDice", cantripDice);
						return change;
					});
					return effect;
				});
				args[0].item.effects = duplicate(newEffects);
				args[0].itemData.effects = duplicate(newEffects);
			}
			const template = await fromUuid(lastArg.templateUuid);
			await template.update({"flags.effect": ddbEffectFlags});
		}

		return game.modules.get("ActiveAuras").api.AAHelpers.applyTemplate(args);
	} else if (args[0] === "on") {
		const safeName = (lastArg.efData.name ?? lastArg.efData.label).replace(/\s|'|\.|’/g, "_");
		const item = await fromUuid(lastArg.efData.origin);
		const targetItemTracker = DAE.getFlag(item.parent, `${safeName}Tracker`);
		const originalTarget = targetItemTracker.targetUuids.includes(lastArg.tokenUuid);
		const target = canvas.tokens.get(lastArg.tokenId);
		const targetTokenTrackerFlag = DAE.getFlag(target, `${safeName}Tracker`);
		const targetedThisCombat = targetTokenTrackerFlag && targetItemTracker.randomId === targetTokenTrackerFlag.randomId;
		const targetTokenTracker = targetedThisCombat
			? targetTokenTrackerFlag
			: {
				randomId: targetItemTracker.randomId,
				round: game.combat.round,
				turn: game.combat.turn,
				hasLeft: false,
			};

		const castTurn = targetItemTracker.startRound === game.combat.round && targetItemTracker.startTurn === game.combat.turn;
		const isLaterTurn = game.combat.round > targetTokenTracker.round || game.combat.turn > targetTokenTracker.turn;

		// if:
		// not cast turn, and not part of the original target
		// AND one of the following
		// not original template and have not yet had this effect applied this combat OR
		// has been targeted this combat, left and re-entered effect, and is a later turn
		if (castTurn && originalTarget) {
			console.debug(`Token ${target.name} is part of the original target for ${item.name}`);
		} else if (!targetedThisCombat || (targetedThisCombat && targetTokenTracker.hasLeft && isLaterTurn)) {
			console.debug(`Token ${target.name} is targeted for immediate damage with ${item.name}, using the following factors`, {originalTarget, castTurn, targetedThisCombat, targetTokenTracker, isLaterTurn});
			targetTokenTracker.hasLeft = false;
			await rollItemDamage(target, lastArg.efData.origin, targetItemTracker.spellLevel);
		}
		await DAE.setFlag(target, `${safeName}Tracker`, targetTokenTracker);
	} else if (args[0] === "off") {
		const safeName = (lastArg.efData.name ?? lastArg.efData.label).replace(/\s|'|\.|’/g, "_");
		const target = canvas.tokens.get(lastArg.tokenId);
		const targetTokenTracker = DAE.getFlag(target, `${safeName}Tracker`);

		if (targetTokenTracker) {
			targetTokenTracker.hasLeft = true;
			targetTokenTracker.turn = game.combat.turn;
			targetTokenTracker.round = game.combat.round;
			await DAE.setFlag(target, `${safeName}Tracker`, targetTokenTracker);
		}
	}
}
