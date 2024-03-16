import {IntegrationBase} from "./IntegrationBase.js";
import {SharedConsts} from "../../shared/SharedConsts.js";
import {StartupHookMixin} from "../mixins/MixinStartupHooks.js";
import {Util} from "../Util.js";

// Cheat and pretend we're not always overriding, as our patches are temporary/highly contextual
const _LIBWRAPPER_TYPE_TEMP = "MIXED";

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
 * Designed for use with `chris-premades` v0.9.17
 * See: https://github.com/chrisk123999/chris-premades
 *
 * @mixes {StartupHookMixin}
 */
export class IntegrationChrisPremades extends StartupHookMixin(IntegrationBase) {
	_moduleId = "chris-premades";

	_onHookInit () {
		libWrapper.register(SharedConsts.MODULE_ID, "Hooks.on", this._lw_Hooks_on.bind(this), _LIBWRAPPER_TYPE_TEMP);
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

	_hook_createHeaderButton = null;
	_lw_Hooks_on (fn, ...args) {
		const [hookId, fnHook] = args;
		if (
			hookId !== "getItemSheetHeaderButtons"
			|| this._hook_createHeaderButton
			|| fnHook.name !== "createHeaderButton"
			|| !fnHook.toString().includes(this._moduleId)
		) return fn(...args);
		this._hook_createHeaderButton = fnHook;
		return fn(...args);
	}

	_stubSemaphores = {};

	async _pWithStubbed (nameStubbed, {returnValue, fnPatch} = {}, fn) {
		let out;
		// Only register/deregister on semaphore 0 to avoid libWrapper errors (a module may only patch a method once)
		try {
			this._stubSemaphores[nameStubbed] = this._stubSemaphores[nameStubbed] || 0;
			if (!this._stubSemaphores[nameStubbed]++) {
				libWrapper.register(
					SharedConsts.MODULE_ID,
					nameStubbed,
					(fnOriginal, ...args) => fnPatch ? fnPatch(fnOriginal, ...args) : returnValue,
					_LIBWRAPPER_TYPE_TEMP,
				);
			}
			out = await fn();
		} finally {
			if (!--this._stubSemaphores[nameStubbed]) {
				libWrapper.unregister(SharedConsts.MODULE_ID, nameStubbed, false);
				delete this._stubSemaphores[nameStubbed];
			}
		}
		return out;
	}

	_propsJsonBlocklist = new Set([
		"monster",
		"trap",
		"object",
		"vehicle",
	]);

	_entsJsonBlocklist = {
		"item": [
			{name: "Shield", source: Parser.SRC_PHB}, // Avoid collision with spell of the same name
		],
	};

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
		if (
			!this._hook_createHeaderButton
			|| !SourceUtil.isSiteSource(ent.source)
			|| this._propsJsonBlocklist.has(propJson)
		) return null;

		const jsonBlocklist = this._entsJsonBlocklist[propJson];
		if (jsonBlocklist?.length && jsonBlocklist.some(it => fnMatch(it))) return null;

		return this._pGetExpandedAddonData_pWithStubs({
			propJson,
			path,
			fnMatch,
			ent,
			propBase,
			base,
			actorType,
			isSilent,
		});
	}

	async _pGetExpandedAddonData_pWithStubs (
		{
			propJson,
			path,
			fnMatch,
			ent,
			propBase,
			base = undefined,
			actorType,
			isSilent = false,
		},
	) {
		return this._pWithStubbed(
			"ui.notifications.info",
			{},
			() => this._pWithStubbed(
				"game.settings.get",
				{
					fnPatch: (fn, ...args) => {
						const [module, key] = args;
						if (!game.user.isGM && module === "chris-premades" && key === "Item Replacer Access") return true;
						return fn(...args);
					},
				},
				() => this._pWithStubbed(
					"chrisPremades.helpers.dialog",
					{
						returnValue: CONFIG.chrisPremades.itemConfiguration[ent.name]
							? "update"
							: true,
					},
					() => this._pWithStubbed(
						"ChatMessage.create",
						{},
						this._pGetExpandedAddonData_pWithStubbed
							.bind(
								this,
								{
									propJson,
									path,
									fnMatch,
									ent,
									propBase,
									base,
									actorType,
									isSilent,
								},
							),
					),
				),
			),
		);
	}

	async _pGetExpandedAddonData_pWithStubbed (
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
		// Create a fake actor to bypass CPR's `doc.actor` check
		const fauxActor = new (class {
			get type () {
				return actorType ?? (propJson.startsWith("monster") ? "npc" : "character");
			}

			_embeddedItems = null;

			get firstEmbeddedItem () { return this._embeddedItems?.[0]; }

			createEmbeddedDocuments (docType, embeds) {
				if (docType !== "Item") return;
				this._embeddedItems = embeds;
			}
		})();

		// Override the Foundry type based on our entity type
		const type = this._pGetExpandedAddonData_getItemType({propJson});

		// Create a stubbed `Item` subclass to bypass CPR's `instanceof Item` check
		const fauxName = _ChrisPremadesNameMappings.getMappedName({propJson, ent});
		const fauxObject = this._pGetExpandedAddonData_getFauxObject({name: fauxName, propBase, base, fauxActor, type});
		if (!fauxObject) return null;

		const jsonEmpty = fauxObject.toObject(true);

		// region Create a fake "sheet" config such that we can run the per-item onclick bind
		const fauxConfig = {object: fauxObject};
		const fauxButtons = [];
		this._hook_createHeaderButton(fauxConfig, fauxButtons);
		await fauxButtons[0].onclick(fauxConfig);
		// endregion

		const jsonFilled = fauxActor.firstEmbeddedItem;
		if (!jsonFilled) return null;

		if (foundry.utils.objectsEqual(jsonEmpty, jsonFilled)) return null;

		const jsonDiff = foundry.utils.diffObject(jsonEmpty, jsonFilled);

		return this._pGetExpandedAddonData_getPostProcessed(jsonDiff);
	}

	_pGetExpandedAddonData_getItemType ({propJson}) {
		if (UrlUtil.PAGE_TO_PROPS[UrlUtil.PG_SPELLS].includes(propJson)) return "spell";
		if (UrlUtil.PAGE_TO_PROPS[UrlUtil.PG_ITEMS].includes(propJson)) return "equipment";
		return "feat";
	}

	_pGetExpandedAddonData_getFauxObject ({name, propBase, base = undefined, fauxActor, type}) {
		try {
			const docData = {
				name,
				type,
			};

			// Apply the base system data--we do this so that CPR's changes are made against a reasonable approximation
			//   of the to-be-created document, rather than an empty document. This avoids cases where e.g. CPR fails
			//   to wipe the `damage` from a spell which relies on a macro for its damage roll (see: Scorching Ray).
			if (base !== undefined && propBase === "system") {
				docData.system = foundry.utils.deepClone(base);
			}

			return new class extends Item {
				get actor () { return fauxActor; }
				set actor (val) { /* No-op */ }

				delete () { /* No-op */ }
			}(docData);
		} catch (e) {
			console.error(...Util.LGT, e);
		}
	}

	_pGetExpandedAddonData_getPostProcessed (fauxItemJson) {
		fauxItemJson = foundry.utils.deepClone(fauxItemJson);
		return this._getPostProcessed({json: fauxItemJson});
	}
}
