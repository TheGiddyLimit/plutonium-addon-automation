import {IntegrationBase} from "./IntegrationBase.js";
import {StartupHookMixin} from "../mixins/MixinStartupHooks.js";
import {SharedConsts} from "../../shared/SharedConsts.js";
import {ModuleSettingConsts} from "../ModuleSettingConsts.js";
import {Util} from "../Util.js";

/**
 * Designed for use with `midi-srd` v11.0.0
 * See: https://github.com/thatlonelybugbear/midi-srd
 *
 * @mixes {StartupHookMixin}
 */
export class IntegrationMidiSrd extends StartupHookMixin(IntegrationBase) {
	_moduleId = "midi-srd";

	_onHookInit () {
		this._registerFlagKeys({
			wanted: [
				"dae",
				"dynamiceffects",
				"itemacro",
				"midi-qol",
				"midi-srd",
				"midiProperties",
			],
			unwanted: [
				"_sheetTab",
				"betterCurses",
				"betterRolls5e",
				"core",
				"exportSource",
				"favtab",
				"mess",
				"wire",
			],
		});
	}

	static _PROP_TO_PACK = {
		"item": "midi-srd.Midi SRD Items",
		"spell": "midi-srd.Midi SRD Spells",
		// "midi-srd.Midi SRD Feats" -- unused
	};

	static _PS_CACHE_PACK = {};
	static _PACK_CACHE = {};

	async _pGetExpandedAddonData (
		{
			propJson,
			path,
			fnMatch,
			ent,
			propBase,
			base = undefined,
			actorType = undefined,
			isSilent = false,
		},
	) {
		if (!SourceUtil.isSiteSource(ent.source)) return null;

		const packId = this.constructor._PROP_TO_PACK[propJson];
		if (!packId) return null;

		if (!game.packs.get(packId)) { // Should never occur
			if (game.settings.get(SharedConsts.MODULE_ID, ModuleSettingConsts.DEV_IS_DBG)) console.warn(...Util.LGT, `Could not find pack with ID "${packId}"!`);
			return null;
		}

		await (this.constructor._PS_CACHE_PACK[packId] ||= this.constructor._pDoCachePack({packId}));

		const cacheDoc = this.constructor._getCacheLookupNames({ent})
			.map(lookupName => this.constructor._PACK_CACHE[packId]?.[lookupName])
			.find(Boolean);
		if (!cacheDoc) return null;

		return this._getAddonData({doc: cacheDoc});
	}

	static _getCacheLookupNames ({ent}) {
		return [
			this._getCacheLookupName(ent),
			(typeof ent.srd !== "string") ? null : this._getCacheLookupName({name: ent.srd, source: ent.source}),
		].filter(Boolean);
	}

	static _getCacheLookupName ({name, source}) {
		return [name, source].map(str => str.slugify({strict: true})).join("__");
	}

	static _getCleanDocSource ({source}) {
		if (!source) return Parser.SRC_PHB;
		return source.split(" ")[0]; // As these are from the SRD, we expect simple source names ("PHB pg. 123")
	}

	static async _pDoCachePack ({packId}) {
		this._PACK_CACHE[packId] ||= {};
		(await game.packs.get(packId).getDocuments())
			.forEach(doc => {
				this._PACK_CACHE[packId][this._getCacheLookupName({
					name: doc.name,
					source: this._getCleanDocSource({
						source: doc.system.source == null
							? null
							: typeof doc.system.source === "object"
								? (doc.system.source.book || doc.system.source.custom) // dnd5e >=2.4.x
								: doc.system.source, // dnd5e <=2.3.x
					}),
				})] = doc;
			});
	}

	_getAddonData ({doc}) {
		const json = doc.toJSON();
		return this._getPostProcessed({json});
	}
}
