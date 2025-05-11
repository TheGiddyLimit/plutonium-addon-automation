import {EffectConverter} from "./EffectConverter.js";
import {FlagConverter} from "./FlagConverter.js";
import {ImgConverter} from "./ImgConverter.js";
import {ActivityConverter} from "./ActivityConverter.js";
import {SystemConverter} from "./SystemConverter.js";
import {Logger} from "./Logger.js";

export class Converter {
	static getConverted (
		json,
		{
			logger = null,
			source = null,
			isKeepSystem = false,
			isKeepImg = false,
			scriptHeader = null,
			getMacroFilename = null,
			getHtmlEntries = null,
			foundryIdToConsumptionTarget = null,
			foundryIdToSpellInfo = null,
			foundryIdToMonsterInfo = null,
			foundryIdToEmbedEntries = null,
		} = {},
	) {
		logger ||= new Logger();
		const name = json.name;
		source ||= this._getSource(json);

		const {activities, effectIdLookup} = ActivityConverter.getActivities({logger, json, foundryIdToConsumptionTarget, foundryIdToSpellInfo, foundryIdToMonsterInfo});
		const effects = EffectConverter.getEffects({json, effectIdLookup, getHtmlEntries, foundryIdToSpellInfo, foundryIdToMonsterInfo, foundryIdToEmbedEntries});
		const {flags, script} = FlagConverter.getFlags({logger, json, name, source, scriptHeader, getMacroFilename});

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
