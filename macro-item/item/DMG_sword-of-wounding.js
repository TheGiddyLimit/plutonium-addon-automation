/** From "MidiQOL Sample Items" compendium */
async function macro (args) {
	const version = "10.0.10";
	try {
		const lastArg = args[args.length - 1];
		let ttoken = await fromUuid(lastArg.tokenUuid);
		const tactor = ttoken?.actor;
		const item = await fromUuid(lastArg.origin);
		if (args[0] === "on") {
			const sourceActor = item.parent;
			const combatTime = game.combat ? (game.combat.round + game.combat.turn / 100) : 0;
			const lastTime = getProperty(sourceActor.flags, "midi-qol.woundedTime");
			lastArg.canWound = !game.combat || (combatTime !== lastTime);
			if (game.combat && lastArg.canWound) {
				let combatTime = game.combat.round + game.combat.turn / 100;
				let lastTime = getProperty(sourceActor.flags, "midi-qol.woundedTime");
				if (combatTime !== lastTime) {
					setProperty(sourceActor.flags, "midi-qol.woundedTime", combatTime);
				}
			}
			if (!lastArg.canWound) {
				const stacks = getProperty(lastArg.efData, "flags.dae.stacks") || 1;
				const label = `${lastArg.efData.label.replace(/\s+\(\d*\)/, "")} (${stacks - 1})`;
				Hooks.once("midi-qol.RollComplete", () => {
					tactor.updateEmbeddedDocuments("ActiveEffect", [{ _id: lastArg.efData._id, "flags.dae.stacks": stacks - 1, "label": label }]);
				});
			}
		} else if (args[0] === "each") {
			const woundCount = getProperty(lastArg.efData, "flags.dae.stacks");
			if (!woundCount) return;
			const saveType = "con";
			const DC = 15;
			const flavor = `${CONFIG.DND5E.abilities[saveType]} DC${DC} ${item?.name || ""}`;
			let save = (await tactor.rollAbilitySave(saveType, { flavor, fastForward: true })).total;
			if (save >= DC) {
				const effectsToDelete = tactor.effects.filter(ef => ef.origin === lastArg.origin).map(ef => ef.id);
				ChatMessage.create({content: "Save was made"});
				await MidiQOL.socket().executeAsGM("removeEffects", { actorUuid: tactor.uuid, effects: [...effectsToDelete, lastArg.effectId] });
			} else {
				let damageRoll = await new Roll(`${woundCount}d4[necrotic]`).roll({async: true}); // could be argument
				const wf = new MidiQOL.DamageOnlyWorkflow(tactor, ttoken, damageRoll.total, "necrotic", [ttoken], damageRoll, { flavor: `Failed Save for ${item.name}`, itemData: item?.toObject(false), itemCardId: "new", useOther: true });
			}
		} else if (args[0] === "off") {
			// do any clean up
		}
	} catch (err) {
		console.error(`Sword of Wounding ${version}`, err);
	}
}
