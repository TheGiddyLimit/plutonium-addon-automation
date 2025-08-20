import {IntegrationBase} from "./IntegrationBase.js";
import {StartupHookMixin} from "../mixins/MixinStartupHooks.js";
import {Util} from "../Util.js";

class _ChrisPremadesNameMappings {
	static _MAP_SPECIFIC = {
		"classFeature": {
			"Ki": "Ki Points",
		},
	};

	static _MAP_GENERAL = {
		"optionalfeature": ent => {
			if (ent.featureType?.some(it => it === "MM")) return `Metamagic - ${ent.name}`;
			if (ent.featureType?.some(it => it === "MV:B")) return `Maneuvers: ${ent.name}`;

			return null;
		},
	};

	static getMappedName ({propJson, ent}) {
		if (this._MAP_SPECIFIC[propJson]?.[ent.name]) return this._MAP_SPECIFIC[propJson]?.[ent.name];
		if (this._MAP_GENERAL[propJson]) {
			const mapped = this._MAP_GENERAL[propJson](ent);
			if (mapped) return mapped;
		}
		return ent.name;
	}
}

/**
 * Designed for use with `chris-premades` v1.3.15
 * See: https://github.com/chrisk123999/chris-premades
 *
 * @mixes {StartupHookMixin}
 */
export class IntegrationChrisPremades extends StartupHookMixin(IntegrationBase) {
	_moduleId = "chris-premades";

	_onHookInit () {
		this._registerFlagKeys({
			wanted: [
				"autoanimations",
				"babonus",
				"chris-premades",
				"dae",
				"enhanced-terrain-layer",
				"itemacro",
				"link-item-resource-5e",
				"magicitems",
				"midi-qol",
				"midiProperties",
				"rest-recovery",
				"templatemacro",
			],
			unwanted: [
				"betterRolls5e",
				"cf",
				"core",
				"custom-character-sheet-sections",
				"ddbimporter",
				"exportSource",
				"favtab",
				"infusions",
				"inventory-plus",
				"monsterMunch",
				"obsidian",
				"spell-class-filter-for-5e",
				"tidy5e-sheet",
				"world",
			],
		});
	}

	_propsJsonBlocklist = new Set([
		"monster",
		"trap",
		"object",
		"vehicle",
	]);

	// Lazy init to avoid `Parser` being unavailable
	static __entsJsonBlocklist = null;

	static get _entsJsonBlocklist () {
		return this.__entsJsonBlocklist ||= {
			"item": [
				{name: "Shield", source: Parser.SRC_PHB}, // Avoid collision with spell of the same name
			],
		};
	}

	async _pGetExpandedAddonData (
		{
			propJson,
			path,
			fnMatch,
			ent,
			propBase,
			base = undefined,
			actorType = undefined,
			documentType = undefined,
			isSilent = false,
		},
	) {
		if (
			!SourceUtil.isSiteSource(ent.source)
			|| this._propsJsonBlocklist.has(propJson)
		) return null;

		// Require document type
		if (documentType == null) return;

		const jsonBlocklist = this.constructor._entsJsonBlocklist[propJson];
		if (jsonBlocklist?.length && jsonBlocklist.some(it => fnMatch(it))) return null;

		// Create a stubbed `Item` subclass to pass to CPR's `itemUpdate`
		const fauxName = _ChrisPremadesNameMappings.getMappedName({propJson, ent});
		const rules = SourceUtil.isClassicSource(ent.source) ? "2014" : "2024";
		const fauxObject = this._pGetExpandedAddonData_getFauxObject({name: fauxName, propBase, base, type: documentType, rules});
		if (!fauxObject) return null;

		const jsonEmpty = fauxObject.toObject(true);

		const isUpdate = await chrisPremades.utils.itemUtils.itemUpdate(fauxObject);
		if (!isUpdate) return null;

		const jsonFilled = fauxObject.toObject(true);
		if (!jsonFilled) return null;

		if (foundry.utils.objectsEqual(jsonEmpty, jsonFilled)) return null;

		const jsonDiff = foundry.utils.diffObject(jsonEmpty, jsonFilled);

		return this._pGetExpandedAddonData_getPostProcessed(jsonDiff);
	}

	_pGetExpandedAddonData_getFauxObject ({name, propBase, base = undefined, type, rules}) {
		try {
			const id = foundry.utils.randomID();

			const docData = {
				_id: id,
				id,
				name,
				type,
			};

			// Apply the base system data--we do this so that CPR's changes are made against a reasonable approximation
			//   of the to-be-created document, rather than an empty document. This avoids cases where e.g. CPR fails
			//   to wipe the `damage` from a spell which relies on a macro for its damage roll (see: Scorching Ray).
			if (base !== undefined && propBase === "system") {
				docData.system = foundry.utils.deepClone(base);
			}

			// Ensure rules version is set, as CPR has different automations for 2014/2024 item sets
			MiscUtil.set(docData, "system", "source", "rules", rules);

			return new class extends Item {
				get actor () { return null; }
				set actor (val) { /* No-op */ }

				delete () { /* No-op */ }

				// Avoid going to the database layer
				async update (data, opts) {
					this.updateSource(data, opts);
				}
			}(docData);
		} catch (e) {
			console.error(...Util.LGT, e);
		}
	}

	_pGetExpandedAddonData_getPostProcessed (fauxItemJson) {
		fauxItemJson = foundry.utils.deepClone(fauxItemJson);

		// Split out activities
		// Note that we expect e.g. IDs to be preserved
		// Examples:
		//   - Animal Friendship (XPHB) -- effect should be correctly applied
		if (Object.keys(fauxItemJson.system?.activities)?.length) {
			fauxItemJson.activities = Object.values(fauxItemJson.system?.activities);
		}
		delete fauxItemJson.system?.activities;

		return this._getPostProcessed({json: fauxItemJson});
	}
}
