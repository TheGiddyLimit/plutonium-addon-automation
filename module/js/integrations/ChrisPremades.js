import {IntegrationBase} from "./IntegrationBase.js";
import {StartupHookMixin} from "../mixins/MixinStartupHooks.js";
import {Util} from "../Util.js";

class _ChrisPremadesMappings {
	static async pGetSourceType ({propJson, ent, propBase, base}) {
		if (propBase === "system" && base?.sourceItem) return base.sourceItem;
		if (propJson === "classFeature" && ent.className) return `class:${ent.className.slugify({strict: true})}`;
		if (propJson !== "subclassFeature" || !ent.subclassShortName) return null;

		const lookup = await DataUtil.class.pGetSubclassLookup(); // (Has its own caching)
		const name = MiscUtil.get(lookup, ent.classSource, ent.className, ent.subclassSource, ent.subclassShortName, "name");
		return name ? `subclass:${name.slugify({strict: true})}` : null;
	}

	/* -------------------------------------------- */

	static _MAPPED_ATTRIBUTES = {
		"@scale.zealot.warrior-of-the-gods": "@scale.path-of-the-zealot.warrior-of-the-gods",
	};

	static getMutMapAttributes (obj) {
		return MiscUtil.getWalker().walk(obj, {string: str => {
			Object.entries(this._MAPPED_ATTRIBUTES)
				.forEach(([old, nu]) => {
					str = str.replaceAll(old, nu);
				});
			return str;
		}});
	}
}

/**
 * Designed for use with `chris-premades` v2.1.3 (prerelease) and `cat` v0.1.3
 * See: https://github.com/chrisk123999/chris-premades
 *
 * (AKA "Cauldron of Plentiful Resources")
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
				"cat",
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

		const sourceType = await _ChrisPremadesMappings.pGetSourceType({propJson, ent, propBase, base});
		const rules = SourceUtil.isClassicSource(ent.source) ? "2014" : "2024";
		const fauxObject = this._pGetExpandedAddonData_getFauxObject({
			name: ent.name,
			propBase,
			base,
			type: documentType,
			rules,
			sourceType,
		});
		if (!fauxObject) return null;

		const jsonEmpty = fauxObject.toObject(true);

		// Note that CAT v0.1.3 returns `undefined`, so we no longer have an easy check for "was there any update"
		//   This is a (perhaps intended) regression from CPR v1.3.15.
		// Rely on diff instead.
		await cat.utils.automationUtils.updateItem(fauxObject, {skipEvent: true});

		const jsonFilled = fauxObject.toObject(true);
		if (!jsonFilled) return null;

		if (foundry.utils.equals(jsonEmpty, jsonFilled)) return null;

		const jsonDiff = foundry.utils.diffObject(jsonEmpty, jsonFilled);

		// Copy activities over wholesale, as diff is not useful
		if (jsonFilled.system?.activities != null) MiscUtil.set(jsonDiff, "system", "activities", jsonFilled.system.activities);

		return this._pGetExpandedAddonData_getPostProcessed({fauxItemJson: jsonDiff, fauxUuid: fauxObject.uuid});
	}

	/**
	 * CAT matches by:
	 * 	- `type`
	 * 	- `system.identifier`
	 * 	- `system.source.rules`
	 * 	- its own `cat.automation.sourceType` flag (see e.g. `getAutomationByIdentifier`)
	 */
	_pGetExpandedAddonData_getFauxObject ({name, propBase, base = undefined, type, rules, sourceType}) {
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
			MiscUtil.set(docData, "system", "identifier", docData.system?.identifier || name.slugify({strict: true}));
			if (sourceType) MiscUtil.set(docData, "flags", "cat", "automation", "sourceType", sourceType);

			return new class extends Item {
				get actor () { return null; }
				set actor (val) { /* No-op */ }

				delete () { /* No-op */ }

				// Avoid going to the database layer
				async update (data, opts) {
					this.updateSource(data, opts);
					return this;
				}

				// CAT falls back on GM-delegation for updates if permissions are not available; ensure we stay local
				testUserPermission () { return true; }
			}(docData);
		} catch (e) {
			console.error(...Util.LGT, e);
		}
	}

	_pGetExpandedAddonData_getPostProcessed ({fauxItemJson, fauxUuid} = {}) {
		fauxItemJson = foundry.utils.deepClone(fauxItemJson);

		// Split out activities
		// Note that we expect e.g. IDs to be preserved
		// Examples:
		//   - Animal Friendship (XPHB) -- effect should be correctly applied
		if (fauxItemJson.system?.activities != null) {
			fauxItemJson.activities = Object.values(fauxItemJson.system.activities);
		}
		delete fauxItemJson.system?.activities;

		// CAT may set effect origins based on our temporary `Item`.
		//   Wipe these, such that Plutonium's importer can set them instead.
		if (fauxUuid) {
			(fauxItemJson.effects || [])
				.forEach(effect => {
					if (effect.origin === fauxUuid) effect.origin = null;
					if (effect.system?.origin?.item === fauxUuid) delete effect.system.origin.item;
				});
		}

		fauxItemJson = _ChrisPremadesMappings.getMutMapAttributes(fauxItemJson);

		return this._getPostProcessed({json: fauxItemJson});
	}
}
