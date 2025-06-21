import {ConverterUtil} from "./ConverterUtil.js";
import {HtmlConverterPostProcessor} from "./HtmlConverterPostProcess.js";

export class EffectConverter {
	static getEffects ({json, effectIdLookup, getHtmlEntries, foundryIdToSpellInfo, foundryIdToMonsterInfo, foundryIdToItemInfo, foundryIdToEmbedEntries}) {
		if (!json.effects?.length) return;

		return json.effects
			.map(eff => this._getEffect({json, eff, effectIdLookup, getHtmlEntries, foundryIdToSpellInfo, foundryIdToMonsterInfo, foundryIdToItemInfo, foundryIdToEmbedEntries}))
			.filter(Boolean);
	}

	static _getEffect ({json, eff, effectIdLookup, getHtmlEntries, foundryIdToSpellInfo, foundryIdToMonsterInfo, foundryIdToItemInfo, foundryIdToEmbedEntries}) {
		eff = this._getPreClean({json, eff});

		this._mutFoundryId({eff, effectIdLookup});

		this._mutChanges(eff);

		this._mutFlags(eff);
		this._mutDuration(eff);

		if (!eff.foundryId && !eff.changes?.length && !Object.keys(eff.flags || {}).length) return null;

		this._mutRequires(eff);

		this._mutDescription({json, eff, getHtmlEntries, foundryIdToSpellInfo, foundryIdToMonsterInfo, foundryIdToItemInfo, foundryIdToEmbedEntries});

		this._mutPostClean(eff);

		return eff;
	}

	static _getPreClean ({json, eff}) {
		// N.b. "selectedKey" is midi-qol UI QoL tracking data, and can be safely skipped
		["icon", "img", "label", "origin", "tint", "selectedKey", "_stats", "sort"].forEach(prop => delete eff[prop]);
		["statuses"].filter(prop => !eff[prop].length).forEach(prop => delete eff[prop]);

		// Delete these only if falsy--we only store `"true"` disabled/transfer values
		["disabled", "transfer"].filter(prop => !eff[prop]).forEach(prop => delete eff[prop]);

		if (eff.name === json.name) delete eff.name;
		if (!eff.description?.trim()) delete eff.description;

		if (Object.keys(eff.system || {}).length) throw new Error(`Could not remove "effect.system" for ${JSON.stringify(eff)} in document "${json.name}"; had values!`);
		delete eff.system;

		this._getPreClean_mutType({json, eff});

		return ConverterUtil.getWithoutFalsy(
			eff,
			{
				pathsRetain: [
					"changes.[].mode", // `0`, i.e. "CUSTOM", should be retained for later conversion
					"changes.[].value", // retain the value, as we will further process changes later
				],
			},
		);
	}

	static _getPreClean_mutType ({json, eff}) {
		const type = eff.type || "base";
		if (["enchantment"].includes(type)) return;

		if (["base"].includes(eff.type || "base")) {
			delete eff.type;
			return;
		}

		throw new Error(`Unhandled effect type "${eff.type}" in document "${json.name}"!`);
	}

	static _mutPostClean (eff) {
		["_id"].forEach(prop => delete eff[prop]);
	}

	static _mutFoundryId ({eff, effectIdLookup}) {
		if (effectIdLookup?.[eff._id]) eff.foundryId = effectIdLookup[eff._id];
	}

	static _mutChanges (eff) {
		if (!eff.changes?.length) return delete eff.changes;

		eff.changes = eff.changes
			.map(change => ({
				...ConverterUtil.getWithoutFalsy(change),
				mode: this._getChangeMode(change.mode),
			}));

		eff.changes
			.forEach(change => {
				if (!change.value) return;
				try {
					change.value = JSON.parse(change.value);
				} catch (ignored) {
					// Ignore
				}
			});
	}

	static _FLAGS_FALSY_VALUES = new Set([
		// region dae
		"none",
		// endregion

		// region ActiveAuras
		"None",
		// endregion

		// region dnd5e-helpers
		"Ignore",
		// endregion
	]);

	static _mutFlags (eff) {
		if (!Object.keys(eff.flags || {}).length) return delete eff.flags;

		const flagsNxt = {};
		Object.entries(eff.flags)
			.forEach(([namespace, moduleFlags]) => {
				const moduleFlagsNxt = {};
				ConverterUtil.copyTruthy(moduleFlagsNxt, moduleFlags, {additionalFalsyValues: this._FLAGS_FALSY_VALUES});

				// region Handle specific cases
				switch (namespace) {
					case "dae":
						this._mutFlags_dae({eff, moduleFlagsNxt});
						break;
				}
				// endregion

				if (Object.keys(moduleFlagsNxt).length) flagsNxt[namespace] = moduleFlagsNxt;
			});

		if (Object.keys(flagsNxt).length) eff.flags = flagsNxt;
		else delete eff.flags;
	}

	static _mutFlags_dae ({eff, moduleFlagsNxt}) {
		if (moduleFlagsNxt["transfer"] == null) return;

		// Hoist DAE "transfer" flag
		const val = moduleFlagsNxt["transfer"];
		delete moduleFlagsNxt["transfer"];
		if (val) eff.transfer = true;
	}

	static _mutDuration (eff) {
		if (!eff.duration) return;

		const durationNxt = {};
		ConverterUtil.copyTruthy(durationNxt, eff.duration);
		if (Object.keys(durationNxt).length) eff.duration = durationNxt;
		else delete eff.duration;
	}

	static _mutRequires (eff) {
		const requires = {};

		(eff.changes || [])
			.forEach(it => {
				const [ptFlags, ptModule] = (it.key || "").split(".").slice(0, 2);
				if (ptFlags !== "flags") return;
				const moduleId = this._getRequiresModuleId(ptModule);
				if (!moduleId) return;
				requires[moduleId] = true;
			});

		Object.keys(eff.flags || {})
			.forEach(k => {
				const moduleId = this._getRequiresModuleId(k);
				if (!moduleId) return;
				requires[moduleId] = true;
			});

		if (Object.keys(requires).length) eff.requires = requires;
	}

	static _mutDescription_getDescriptionEntries ({json, eff, getHtmlEntries}) {
		const descriptionEntries = getHtmlEntries({doc: json, effect: eff});
		if (!descriptionEntries) return null;

		if (typeof descriptionEntries === "string") return descriptionEntries;
		if (typeof descriptionEntries !== "object") throw new Error(`Expected either "string" or "object" entries, but found "${typeof descriptionEntries}"!`);

		const descriptionEntriesArray = !(descriptionEntries instanceof Array) ? [descriptionEntries] : descriptionEntries;
		if (descriptionEntriesArray.length === 1 && typeof descriptionEntriesArray[0] === "string") return descriptionEntriesArray[0];
		return descriptionEntriesArray;
	}

	static _mutDescription ({json, eff, getHtmlEntries, foundryIdToSpellInfo, foundryIdToMonsterInfo, foundryIdToItemInfo, foundryIdToEmbedEntries}) {
		if (!eff.description?.length) return;

		if (getHtmlEntries == null) throw new Error(`"getHtmlEntries" must be provided for effect description conversion!`);

		const descriptionEntriesRaw = this._mutDescription_getDescriptionEntries({json, eff, getHtmlEntries});
		if (!descriptionEntriesRaw) return delete eff.description;

		const descriptionEntries = HtmlConverterPostProcessor.getPostProcessed(
			descriptionEntriesRaw,
			{
				name: json.name,
				uuid: json._uuid,
				foundryIdToSpellInfo,
				foundryIdToMonsterInfo,
				foundryIdToItemInfo,
				foundryIdToEmbedEntries,
			},
		);

		["description", "descriptionEntries"].forEach(prop => delete eff[prop]);

		if (typeof descriptionEntries === "string") {
			if (!descriptionEntries.includes("{@")) eff.description = descriptionEntries;
			else eff.descriptionEntries = [descriptionEntries];
		} else eff.descriptionEntries = descriptionEntries;
	}

	static _getRequiresModuleId (flagKey) {
		switch (flagKey) {
			// If the key matches the module's ID
			case "ActiveAuras":
			case "dnd5e-helpers":
				return flagKey;

			// region Implicit requires
			case "dae":
			case "midi-qol":
				return null;
				// endregion

			default:
				return null;
		}
	}

	static _getChangeMode (modeRaw) {
		switch (modeRaw) {
			case 0: return "CUSTOM";
			case 1: return "MULTIPLY";
			case 2: return "ADD";
			case 3: return "DOWNGRADE";
			case 4: return "UPGRADE";
			case 5: return "OVERRIDE";
			default: return modeRaw;
		}
	}
}
