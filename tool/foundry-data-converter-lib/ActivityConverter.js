import {ConverterUtil} from "./ConverterUtil.js";

export class ActivityConverter {
	static _ActivityConverterState = class {
		constructor ({name}) {
			this._nameSlug = name.slugify({strict: true});
			this._ixEffectId = 0;
		}

		getNextEffectId () {
			if (!this._ixEffectId) {
				this._ixEffectId++;
				return this._nameSlug;
			}

			return `${this._nameSlug}-${this._ixEffectId++}`;
		}
	};

	static getActivities (json) {
		if (!Object.keys(json.system?.activities || {}).length) return {};

		const name = json.name;
		if (!name) throw new Error(`Item "${json._id}" did not have a name!`);

		const cvState = new this._ActivityConverterState({name});
		const effectIdLookup = {};

		const activities = Object.values(json.system.activities)
			.map(activity => this._getActivity({json, cvState, activity, effectIdLookup}))
			.filter(Boolean);

		if (activities.length === 1) {
			delete activities[0].img;
		}

		delete json.system.activities;

		return {
			activities,
			effectIdLookup,
		};
	}

	static _getActivity ({json, cvState, activity, effectIdLookup}) {
		activity = this._getPreClean({json, activity});

		this._mutEffects({cvState, activity, effectIdLookup});

		this._mutPostClean(activity);

		return activity;
	}

	static _getPreClean ({json, activity}) {
		this._getPreClean_mutNonSpell({json, activity});

		if (activity.duration?.units === "inst") delete activity.duration.units;
		if (activity.range?.units === "self") delete activity.range.units;

		if (!activity.target?.template?.type) delete activity.target.template;

		const out = ConverterUtil.getWithoutFalsy(activity);

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

	static _mutPostClean (act) {
		["_id"].forEach(prop => delete act[prop]);
	}

	static _mutEffects ({json, cvState, activity, effectIdLookup}) {
		if (!activity.effects?.length) return;

		activity.effects
			.forEach(effRef => {
				if (Object.keys(effRef).length > 1) throw new Error(`Unexpected effect reference keys in "${JSON.stringify(effRef)}" for document "${json.name}"!`);
				if (!effRef._id) throw new Error(`Missing "_id" key in effect reference "${JSON.stringify(effRef)}" for document "${json.name}"!`);

				if (effectIdLookup[effRef._id]) {
					effRef.foundryId = effectIdLookup[effRef._id];
					delete effRef._id;
					return;
				}

				effectIdLookup[effRef._id] = effRef.foundryId = cvState.getNextEffectId();
				delete effRef._id;
			});

		return effectIdLookup;
	}
}
