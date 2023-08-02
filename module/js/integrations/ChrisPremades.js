import {IntegrationBase} from "./IntegrationBase.js";
import {SharedConsts} from "../../shared/SharedConsts.js";
import {StartupHookMixin} from "../mixins/MixinStartupHooks.js";

// Cheat and pretend we're not always overriding, as our patches are temporary/highly contextual
const _LIBWRAPPER_TYPE_TEMP = "MIXED";

/**
 * Designed for use with `chris-premades` v0.3.7
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

	async _pWithStubbed (nameStubbed, fn, {returnValue} = {}) {
		let out;
		// Only register/deregister on semaphore 0 to avoid libWrapper errors (a module may only patch a method once)
		try {
			this._stubSemaphores[nameStubbed] = this._stubSemaphores[nameStubbed] || 0;
			if (!this._stubSemaphores[nameStubbed]++) {
				libWrapper.register(SharedConsts.MODULE_ID, nameStubbed, () => returnValue, _LIBWRAPPER_TYPE_TEMP);
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

	async _pGetExpandedAddonData (
		{
			propJson,
			path,
			fnMatch,
			ent,
			isSilent = false,
		},
	) {
		if (
			!this._hook_createHeaderButton
			|| !SourceUtil.isSiteSource(ent.source)
			|| this._propsJsonBlocklist.has(propJson)
		) return null;

		return this._pGetExpandedAddonData_pWithStubs({
			propJson,
			path,
			fnMatch,
			ent,
			isSilent,
		});
	}

	async _pGetExpandedAddonData_pWithStubs (
		{
			propJson,
			path,
			fnMatch,
			ent,
			isSilent = false,
		},
	) {
		return this._pWithStubbed(
			"ui.notifications.info",
			() => this._pWithStubbed(
				"chrisPremades.helpers.dialog",
				() => this._pWithStubbed(
					"ChatMessage.create",
					this._pGetExpandedAddonData_pWithStubbed
						.bind(
							this,
							{
								propJson,
								path,
								fnMatch,
								ent,
								isSilent,
							},
						),
				),
				{
					returnValue: true,
				},
			),
		);
	}

	async _pGetExpandedAddonData_pWithStubbed (
		{
			propJson,
			path,
			fnMatch,
			ent,
			isSilent = false,
		},
	) {
		// Create a fake actor to bypass CPR's `doc.actor` check
		const fauxActor = new (class {
			// TODO(Future) return `"npc"` if this is a creature embedded item (requires Plutonium support/reworks)
			get type () {
				return "character";
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
		const fauxObject = new class extends Item {
			get actor () { return fauxActor; }
			set actor (val) { /* No-op */ }

			delete () { /* No-op */ }
		}({
			name: ent.name,
			type,
		});

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

	_pGetExpandedAddonData_getPostProcessed (fauxItemJson) {
		fauxItemJson = foundry.utils.deepClone(fauxItemJson);
		return this._getPostProcessed({json: fauxItemJson});
	}
}
