import {ConverterUtil} from "./ConverterUtil.js";
import {NameIdGenerator} from "./NameIdGenerator.js";

class _ActivitiesPreProcessor {
	static getActivities (json) {
		const activities = foundry.utils.duplicate(Object.values(json.system.activities));

		const idToCntUsed = this._getIdToCnt({activities});

		if (!Object.keys(idToCntUsed).length) return activities;

		const nameIdGenerator = new NameIdGenerator({name: json.name});

		this._mutIds({activities, idToCntUsed, nameIdGenerator});

		return activities;
	}

	static _getIdToCnt ({activities}) {
		const idToCntUsed = {};

		activities
			.forEach(activity => {
				activity.effects
					?.forEach(effRef => {
						effRef.riders?.activity
							?.forEach(activityId => {
								idToCntUsed[activityId] = (idToCntUsed[activityId] || 0) + 1;
							});
					});
			});

		return idToCntUsed;
	}

	static _mutIds ({activities, idToCntUsed, nameIdGenerator}) {
		const idToHumanId = Object.fromEntries(
			Object.keys(idToCntUsed)
				.map(id => [id, nameIdGenerator.getNextId()]),
		);

		activities
			.forEach(activity => {
				activity.effects
					?.forEach(effRef => {
						if (!effRef.riders?.activity?.length) return;

						effRef.riders.activity = effRef.riders.activity
							.map(id => ({foundryId: idToHumanId[id]}));
					});

				if (idToHumanId[activity._id]) activity.foundryId = idToHumanId[activity._id];
			});
	}
}

export class ActivityConverter {
	static _ActivityConverterState = class {
		constructor ({name}) {
			this._nameIdGeneratorEffects = new NameIdGenerator({name});
		}

		getNextEffectId () { return this._nameIdGeneratorEffects.getNextId(); }
	};

	static getActivities (
		{
			logger,
			json,
			foundryIdToConsumptionTarget = null,
			foundryIdToSpellInfo = null,
			foundryIdToMonsterInfo = null,
		},
	) {
		if (!Object.keys(json.system?.activities || {}).length) {
			delete json.system?.activities;
			return {};
		}

		const name = json.name;
		if (!name) throw new Error(`Item "${json._id}" did not have a name!`);

		const cvState = new this._ActivityConverterState({name});
		const effectIdLookup = {};

		const activitiesPreProcessedIds = _ActivitiesPreProcessor.getActivities(json);

		const activities = activitiesPreProcessedIds
			.map(activity => this._getActivity({
				logger,
				json,
				foundryIdToConsumptionTarget,
				foundryIdToSpellInfo,
				foundryIdToMonsterInfo,
				cvState,
				activity,
				effectIdLookup,
			}))
			.filter(Boolean);

		if (activities.length === 1) {
			delete activities[0].img;
		}

		delete json.system.activities;

		if (!activities.some(activity => !this._isOnlyNamedConsumption({activity}))) {
			return {};
		}

		return {
			activities,
			effectIdLookup,
		};
	}

	static _getActivity (
		{
			logger,
			json,
			foundryIdToConsumptionTarget,
			foundryIdToSpellInfo,
			foundryIdToMonsterInfo,
			cvState,
			activity,
			effectIdLookup,
		},
	) {
		activity = this._getPreClean({logger, json, activity});

		this._mutEffects({json, cvState, activity, effectIdLookup});

		this._mutConsumption({activity, foundryIdToConsumptionTarget});

		this._mutSpell({activity, foundryIdToSpellInfo});

		this._mutSummonProfiles({activity, foundryIdToMonsterInfo});

		this._mutPostClean(activity);

		return activity;
	}

	static _getPreClean ({logger, json, activity}) {
		this._getPreClean_mutNonSpell({json, activity});
		this._getPreClean_mutSpell({json, activity});
		this._getPreClean_mutSummon({json, activity});

		if (activity.duration?.units === "inst") delete activity.duration.units;
		if (activity.range?.units === "self") delete activity.range.units;

		if (!activity.target?.template?.type) delete activity.target.template;
		delete activity.target?.prompt;

		Object.entries(activity)
			.forEach(([k, v]) => {
				if (typeof v !== "object") return;
				if (!v.override) return;
				logger.warn(
					`"override" found in "${k}" for activity "${json.name}" -> "${activity.name || activity.type}" ("${json._id}" -> "${activity._id}"):\n${JSON.stringify(v, null, "\t")}`,
					"activity.override",
				);
				delete v.override;
			});

		const out = ConverterUtil.getWithoutFalsy(
			activity,
			{
				pathsRetain: [
					"activation.type", // the default is "action"; 'empty string' is a specific "None"
				],
			},
		);

		["sort"].forEach(prop => delete out[prop]);

		return out;
	}

	/**
	 * Remove spell-specific data from non-spell activities
	 */
	static _getPreClean_mutNonSpell ({json, activity}) {
		if (json.type === "spell") return;

		delete activity?.consumption?.spellSlot;

		if (activity.damage?.parts?.length) {
			activity.damage.parts.forEach(dmgPart => delete dmgPart?.scaling?.number);
		}
	}

	static _getPreClean_mutSpell ({json, activity}) {
		if (json.type !== "spell") return;

		// Delete implicit "consumes spell slot" for spells
		if (activity?.consumption?.spellSlot !== false) delete activity.consumption.spellSlot;

		// Remove default Plutonium-generated name
		if (activity.name === "Cast" && Object.keys(json.system.activities).length === 1) delete activity.name;
	}

	static _getPreClean_mutSummon ({json, activity}) {
		if (activity.type !== "summon") return;

		delete activity?.summon?.prompt;

		activity.profiles
			?.forEach(profile => {
				delete profile._id;
			});
	}

	static _mutPostClean (act) {
		["_id"].forEach(prop => delete act[prop]);
	}

	/* -------------------------------------------- */

	static _mutEffects ({json, cvState, activity, effectIdLookup}) {
		if (!activity.effects?.length) return;

		activity.effects = activity.effects.map(effRef => this._getMutEffect({json, cvState, effRef, effectIdLookup}));

		return effectIdLookup;
	}

	static _ALLOWED_EFF_REF_KEYS = new Set([
		"level",
		"onSave",
	]);

	static _getMutEffect ({json, cvState, effRef, effectIdLookup}) {
		const effRefOut = {};

		this._getMutEffect_id({json, cvState, effRef, effRefOut, effectIdLookup});
		this._getMutEffect_riders({json, cvState, effRef, effRefOut, effectIdLookup});

		const keysUnknown = Object.keys(effRef)
			.filter(k => !this._ALLOWED_EFF_REF_KEYS.has(k));

		if (keysUnknown.length) throw new Error(`Unexpected keys in activity effect "${JSON.stringify(effRef)}" for document "${json.name}"!`);

		return effRefOut;
	}

	static _getMutEffect_id ({json, cvState, effRef, effRefOut, effectIdLookup}) {
		if (!effRef._id) throw new Error(`Missing "_id" key in effect reference "${JSON.stringify(effRef)}" for document "${json.name}"!`);
		if (effectIdLookup[effRef._id]) {
			effRefOut.foundryId = effectIdLookup[effRef._id];
		} else {
			effectIdLookup[effRef._id] = effRefOut.foundryId = cvState.getNextEffectId();
		}
		delete effRef._id;
	}

	static _getMutEffect_riders ({json, cvState, effRef, effRefOut, effectIdLookup}) {
		if (effRef.riders?.activity?.length) {
			// Activity IDs are pre-mapped, therefore just copy
			foundry.utils.setProperty(effRefOut, "riders.activity", effRef.riders.activity);
			delete effRef.riders.activity;
		}

		if (effRef.riders?.effect?.length) {
			const effectIdsMapped = effRef.riders.effect
				.map(id => {
					if (effectIdLookup[id]) return effectIdLookup[id];
					return {foundryId: effectIdLookup[id] = cvState.getNextEffectId()};
				});
			foundry.utils.setProperty(effRefOut, "riders.effect", effectIdsMapped);
			delete effRef.riders.effect;
		}

		if (effRef.riders?.item?.length) {
			throw new Error(`Unhandled "item" riders in "${JSON.stringify(effRef)}" for document "${json.name}"!`);
			// delete effRef.riders.item;
		}

		delete effRef.riders;
	}

	/* -------------------------------------------- */

	static _CONSUMPTION_RESOURCE_MAPPINGS = {
		// -- Class
		// Cleric
		"phbclcChannelDiv": "Channel Divinity",

		// Monk
		"phbmnkMonksFocus": "Focus Point",

		// Paladin
		"phbpdnChannelDiv": "Channel Divinity",

		// Sorcerer
		"phbscrFontOfMagi": "Sorcery Point",

		// -- Subclass
		// Fighter
		"phbftrCombatSupe": "Superiority Die",
	};

	static _mutConsumption ({activity, foundryIdToConsumptionTarget}) {
		if (!activity.consumption?.targets?.length) return;

		activity.consumption.targets
			.forEach(consTarget => {
				if (consTarget.type !== "itemUses") return;
				if (!consTarget.target) return;

				// Compendium.dnd-players-handbook.classes.Item.phbbrbRage000000
				const foundryUuidParts = consTarget.target.split(".").map(it => it.trim()).filter(Boolean);

				const consumesName = this._CONSUMPTION_RESOURCE_MAPPINGS[foundryUuidParts.at(-1)];
				if (consumesName) {
					consTarget.target = {
						consumes: {
							name: consumesName,
						},
					};
					return;
				}

				const fromLookup = foundryUuidParts.at(-1)
					? foundryIdToConsumptionTarget?.[foundryUuidParts.at(-1)]
					: null;
				if (fromLookup) {
					consTarget.target = fromLookup;
					return;
				}

				// Migrate manually; placeholder values to trigger schema error
				consTarget.target = {
					prop: true,
					uid: true,
				};
			});
	}

	/* -------------------------------------------- */

	static _mutSpell ({activity, foundryIdToSpellInfo}) {
		if (!activity.spell?.uuid) return;

		if (!foundryIdToSpellInfo?.[activity.spell.uuid]) {
			// Migrate manually; placeholder value to trigger schema error
			activity.spell.uuid = true;
			return;
		}

		activity.spell.uuid = `@spell[${foundryIdToSpellInfo[activity.spell.uuid].uid}]`;
	}

	/* -------------------------------------------- */

	static _mutSummonProfiles ({activity, foundryIdToMonsterInfo}) {
		if (!activity.profiles?.length) return;

		activity.profiles
			.forEach(profile => {
				if (profile.count && typeof profile.count === "string" && !isNaN(profile.count)) profile.count = Number(profile.count);
				if (profile.count === 1) delete profile.count;
			});

		activity.profiles = activity.profiles
			.filter(profile => {
				if (!profile.uuid) return true;
				if (foundryIdToMonsterInfo?.[profile.uuid] == null) return true;
				return !foundryIdToMonsterInfo[profile.uuid].isIgnored;
			});

		if (!activity.profiles.length) return delete activity.profiles;

		activity.profiles
			.forEach(profile => {
				if (!profile.uuid) return;

				if (!foundryIdToMonsterInfo?.[profile.uuid]) {
					// Migrate manually; placeholder value to trigger schema error
					profile.uuid = true;
					return;
				}

				profile.uuid = `@creature[${foundryIdToMonsterInfo[profile.uuid].uid}]`;
			});
	}

	/* -------------------------------------------- */

	/**
	 * If every activity is exactly of the form:
	 * ```
	 * {
	 * 	"type": "...",
	 * 	"consumption": {
	 * 		"targets": [
	 * 			{
	 * 				"type": "itemUses",
	 * 				"value": "1",
	 * 				"target": {
	 * 					"consumes": {
	 * 						"name": "..."
	 * 					}
	 * 				}
	 * 			}
	 * 		]
	 * 	}
	 * }
	 * ```
	 * then they can be ignored, as we expect to set the "consumes" info on the matching
	 *   5etools entity.
	 */
	static _isOnlyNamedConsumption ({activity}) {
		const cpy = foundry.utils.duplicate(activity);
		["name", "type"].forEach(prop => delete cpy[prop]);
		if (Object.keys(cpy).some(k => k !== "consumption")) return false;
		if (Object.keys(cpy.consumption).some(k => k !== "targets")) return false;
		if (cpy.consumption.targets.length !== 1) return false;
		const [consumption] = cpy.consumption.targets;
		if (consumption.type !== "itemUses") return false;
		if (isNaN(consumption.value)) return false;
		if (Object.keys(consumption.target).some(k => k !== "consumes")) return false;
		if (!consumption.target?.consumes?.name) return false;
		if (Object.keys(consumption.target.consumes).some(k => k !== "name")) return false;
		return true;
	}
}
