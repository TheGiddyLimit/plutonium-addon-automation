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
		if (!Object.keys(json.system?.activities || {}).length) return;

		const name = json.name;
		if (!name) throw new Error(`Item did not have a name!`);

		const cvState = new this._ActivityConverterState({name});
		const effectIdLookup = {};

		const activities = Object.values(json.system.activities)
			.map(activity => this._getActivity({cvState, activity, effectIdLookup}))
			.filter(Boolean);

		delete json.system.activities;

		return {
			activities,
			effectIdLookup,
		};
	}

	static _getActivity ({cvState, activity, effectIdLookup}) {
		activity = this._getPreClean(activity);

		this._mutEffects({cvState, activity, effectIdLookup});

		this._mutPostClean(activity);

		return activity;
	}

	static _getPreClean (act) {
		const out = ConverterUtil.getWithoutFalsy(act);

		["sort"].forEach(prop => delete out[prop]);

		return out;
	}

	static _mutPostClean (act) {
		["_id"].forEach(prop => delete act[prop]);
	}

	static _mutEffects ({cvState, activity, effectIdLookup}) {
		if (!activity.effects?.length) return;

		activity.effects
			.forEach(effRef => {
				if (Object.keys(effRef).length > 1) throw new Error(`Unexpected effect reference keys in "${JSON.stringify(effRef)}"!`);
				if (!effRef._id) throw new Error(`Missing "_id" key in effect reference "${JSON.stringify(effRef)}"!`);

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
