// API functions copied from D&D Beyond Importer
// Credit to D&D Beyond Importer (https://github.com/MrPrimate/ddb-importer)
// See: `../../../license/ddb-importer.md`

const utils = {
	isArray: (arr) => {
		return Array.isArray(arr);
	},

	removeFromProperties: (properties, value) => {
		const setProperties = properties
			? utils.isArray(properties)
				? new Set(properties)
				: properties
			: new Set();

		setProperties.delete(value);
		return Array.from(setProperties);
	},
};

class DDBEffectHelper {
	static addToProperties = utils.addToProperties;

	static removeFromProperties = utils.removeFromProperties;

	/**
	 * Adds a save advantage effect for the next save on the specified target actor.
	 *
	 * @param {*} targetActor the target actor on which to add the effect.
	 * @param {*} originItem the item that is the origin of the effect.
	 * @param {*} ability the short ability name to use for save, e.g. str
	 */
	static async addSaveAdvantageToTarget (targetActor, originItem, ability, additionLabel = "", icon = null) {
		const effectData = {
			_id: foundry.utils.randomID(),
			changes: [
				{
					key: `flags.midi-qol.advantage.ability.save.${ability}`,
					mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
					value: "1",
					priority: 20,
				},
			],
			origin: originItem.uuid,
			disabled: false,
			transfer: false,
			icon,
			img: icon,
			duration: {turns: 1},
			flags: {
				dae: {
					specialDuration: [`isSave.${ability}`],
				},
			},
		};
		effectData.name = `${originItem.name}${additionLabel}: Save Advantage`;
		await MidiQOL.socket().executeAsGM("createEffects", {actorUuid: targetActor.uuid, effects: [effectData]});
	}

	static async attachSequencerFileToTemplate (templateUuid, sequencerFile, originUuid, scale = 1) {
		if (game.modules.get("sequencer")?.active) {
			if (Sequencer.Database.entryExists(sequencerFile)) {
				logger.debug(`Trying to apply sequencer effect (${sequencerFile}) to ${templateUuid} from ${originUuid}`, sequencerFile);
				const template = await fromUuid(templateUuid);
				new Sequence()
					.effect()
					.file(Sequencer.Database.entryExists(sequencerFile))
					.size({
						width: canvas.grid.size * (template.width / canvas.dimensions.distance),
						height: canvas.grid.size * (template.width / canvas.dimensions.distance),
					})
					.persist(true)
					.origin(originUuid)
					.belowTokens()
					.opacity(0.5)
					.attachTo(template, {followRotation: true})
					.scaleToObject(scale)
					.play();
			}
		}
	}

	static checkCollision (ray, types = ["sight", "move"], mode = "any") {
		for (const type of types) {
			const result = CONFIG.Canvas.polygonBackends[type].testCollision(ray.A, ray.B, {mode, type});
			if (result) return result;
		}
		return false;
	}

	/**
	 * If a custom AA condition animation exists for the specified name, registers the appropriate hook with AA
	 * to be able to replace the default condition animation by the custom one.
	 *
	 * @param {*} condition condition for which to replace its AA animation by a custom one (it must be a value from CONFIG.DND5E.conditionTypes).
	 * @param {*} macroData the midi-qol macro data.
	 * @param {*} originItemName the name of item used for AA customization of the condition.
	 * @param {*} conditionItemUuid the UUID of the item applying the condition.
	 */
	static configureCustomAAForCondition (condition, macroData, originItemName, conditionItemUuid) {
		// Get default condition label
		const statusName = CONFIG.DND5E.conditionTypes[condition];
		if (!statusName) {
			return;
		}
		const customStatusName = `${statusName.label} [${originItemName}]`;
		if (AutomatedAnimations.AutorecManager.getAutorecEntries().aefx.find((a) => (a.label ?? a.name) === customStatusName)) {
			const aaHookId = Hooks.on("AutomatedAnimations-WorkflowStart", (data) => {
				if (
					data.item instanceof CONFIG.ActiveEffect.documentClass
					&& data.item.name === statusName.label
					&& data.item.origin === macroData.sourceItemUuid
				) {
					data.recheckAnimation = true;
					data.item.name = customStatusName;
					Hooks.off("AutomatedAnimations-WorkflowStart", aaHookId);
				}
			});
			// Make sure that the hook is removed when the special spell effect is completed
			Hooks.once(`midi-qol.RollComplete.${conditionItemUuid}`, () => {
				Hooks.off("AutomatedAnimations-WorkflowStart", aaHookId);
			});
		}
	}

	static async checkTargetInRange ({sourceUuid, targetUuid, distance}) {
		if (!game.modules.get("midi-qol")?.active) {
			ui.notifications.error("checkTargetInRange requires midiQoL, not checking");
			logger.error("checkTargetInRange requires midiQoL, not checking");
			return true;
		}
		const sourceToken = await fromUuid(sourceUuid);
		if (!sourceToken) return false;
		const targetsInRange = MidiQOL.findNearby(null, sourceUuid, distance);
		const isInRange = targetsInRange.reduce((result, possible) => {
			const collisionRay = new Ray(sourceToken, possible);
			const collision = DDBEffectHelper.checkCollision(collisionRay, ["sight"]);
			if (possible.uuid === targetUuid && !collision) result = true;
			return result;
		}, false);
		return isInRange;
	}

	/**
	 * Return actor from a UUID
	 *
	 * @param {string} uuid - The UUID of the actor.
	 * @return {object|null} - Returns the actor document or null if not found.
	 */
	static fromActorUuid (uuid) {
		const doc = fromUuidSync(uuid);
		if (doc instanceof CONFIG.Token.documentClass) return doc.actor;
		if (doc instanceof CONFIG.Actor.documentClass) return doc;
		return null;
	}

	/**
	 * Returns the actor object associated with the given actor reference.
	 *
	 * @param {any} actorRef - The actor reference to retrieve the actor from.
	 * @return {Actor|null} The actor object associated with the given actor reference, or null if no actor is found.
	 */
	static getActor (actorRef) {
		if (actorRef instanceof Actor) return actorRef;
		if (actorRef instanceof Token) return actorRef.actor;
		if (actorRef instanceof TokenDocument) return actorRef.actor;
		if (utils.isString(actorRef)) return DDBEffectHelper.fromActorUuid(actorRef);
		return null;
	}

	/**
	 * Retrieves the number of cantrip dice based on the level of the actor.
	 *
	 * @param {Actor} actor - The actor object
	 * @return {number} The number of cantrip dice.
	 */
	static getCantripDice (actor) {
		const level = actor.type === "character"
			? actor.system.details.level
			: actor.system.details.cr;
		return 1 + Math.floor((level + 1) / 6);
	}

	// eslint-disable-next-line no-unused-vars
	static getConcentrationEffect (actor, _name = null) {
		return actor?.effects.find((ef) => foundry.utils.getProperty(ef, "flags.midi-qol.isConcentration"));
	}

	/**
	 * Returns the race or type of the given entity.
	 *
	 * @param {object} entity - The entity for which to retrieve the race or type.
	 * @return {string} The race or type of the entity, in lowercase.
	 */
	static getRaceOrType (entity) {
		const actor = DDBEffectHelper.getActor(entity);
		const systemData = actor?.system;
		if (!systemData) return "";
		if (systemData.details.race) {
			return (systemData.details?.race?.name ?? systemData.details?.race)?.toLocaleLowerCase() ?? "";
		}
		return systemData.details.type?.value.toLocaleLowerCase() ?? "";
	}

	/**
	 * Returns a new duration which reflects the remaining duration of the specified one.
	 *
	 * @param {*} duration the source duration
	 * @returns a new duration which reflects the remaining duration of the specified one.
	 */
	static getRemainingDuration (duration) {
		const newDuration = {};
		if (duration.type === "seconds") {
			newDuration.seconds = duration.remaining;
		} else if (duration.type === "turns") {
			const remainingRounds = Math.floor(duration.remaining);
			const remainingTurns = (duration.remaining - remainingRounds) * 100;
			newDuration.rounds = remainingRounds;
			newDuration.turns = remainingTurns;
		}
		return newDuration;
	}

	static async wait (ms) {
		return new Promise((resolve) => {
			setTimeout(resolve, ms);
		});
	}

	static syntheticItemWorkflowOptions ({
		targets = undefined, showFullCard = false, useSpellSlot = false, castLevel = false, consume = false,
		configureDialog = false, targetConfirmation = undefined,
	} = {}) {
		return [
			{
				showFullCard,
				createWorkflow: true,
				consumeResource: consume,
				consumeRecharge: consume,
				consumeQuantity: consume,
				consumeUsage: consume,
				consumeSpellSlot: useSpellSlot,
				consumeSpellLevel: castLevel,
				slotLevel: castLevel,
			},
			{
				targetUuids: targets,
				configureDialog,
				workflowOptions: {
					autoRollDamage: "always",
					autoFastDamage: true,
					autoRollAttack: true,
					targetConfirmation,
				},
			},
		];
	}
}

class DDBMacros {
	static generateMacroChange ({macroValues = "", macroType = null, macroName = null, keyPostfix = "", priority = 20} = {}) {
		const macroKey = "macro.itemMacro";
		const macroValuePrefix = "";

		return {
			key: `${macroKey}${keyPostfix}`,
			value: `${macroValuePrefix}${macroValues}`,
			mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
			priority: priority,
		};
	}
}

class DialogHelper {
	static async buttonDialog ({title = "", content = "", buttons, options = {height: "auto"}} = {}, direction = "row") {
		return new Promise((resolve) => {
			new Dialog(
				{
					title,
					content,
					buttons: buttons.reduce((o, button) => ({
						...o,
						[button.label]: {label: button.label, callback: () => resolve(button.value)},
					}), {}),
					close: () => resolve(this),
				},
				{
					classes: ["dialog"],
					...options,
				},
			).render(true);
		});
	}
	static async AskUserButtonDialog (user, ...buttonArgs) {
		return DialogHelper.buttonDialog(...buttonArgs);
	}
}

export default {
	effects: DDBEffectHelper,

	macros: DDBMacros,

	dialog: DialogHelper,
};
