import {EffectConverter} from "./EffectConverter.js";
import {FlagConverter} from "./FlagConverter.js";
import {ImgConverter} from "./ImgConverter.js";
import {ActivityConverter} from "./ActivityConverter.js";
import {SystemConverter} from "./SystemConverter.js";

export class Converter {
	static getConverted (
		json,
		{
			source = null,
			isKeepSystem = false,
			isKeepImg = false,
			scriptHeader = null,
			getMacroFilename = null,
			getHtmlEntries = null,
			foundryIdToConsumptionTarget = null,
			foundryIdToSpellUid = null,
			foundryIdToMonsterUid = null,
		} = {},
	) {
		const name = json.name;
		source ||= this._getSource(json);

		const {activities, effectIdLookup} = ActivityConverter.getActivities({json, foundryIdToConsumptionTarget, foundryIdToSpellUid, foundryIdToMonsterUid});
		const effects = EffectConverter.getEffects({json, effectIdLookup, getHtmlEntries});
		const {flags, script} = FlagConverter.getFlags({json, name, source, scriptHeader, getMacroFilename});

		const out = {
			name,
			source,
			activities,
			effects,
			flags,
		};
		if (script) out.itemMacro = {file: script.filename};

		const system = SystemConverter.getSystem({json, isKeepSystem});
		if (system) out.system = system;

		if (isKeepImg) {
			const img = ImgConverter.getImg(json);
			if (img) out.img = img;
		}

		out.migrationVersion = 3;

		return {
			data: out,
			script,
		};
	}

	static _getSource (json) {
		const sourceRaw = json.system?.source?.book;
		if (!sourceRaw) return null;
		return sourceRaw
			.split(/[,;.]/g)[0]
			.trim()
			.replace(/ pg.*$/, "");
	}
}
