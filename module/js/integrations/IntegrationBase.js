import {SharedConsts} from "../../shared/SharedConsts.js";
import {ModuleSettingConsts} from "../ModuleSettingConsts.js";
import {Util} from "../Util.js";

/** @abstract */
export class IntegrationBase {
	_moduleId;

	get _settingKeyIsEnabled () { return `isIntegrationEnabled_${this._moduleId}`; }

	_isModuleActive () { return game.modules.get(this._moduleId)?.active; }
	_isEnabled () { return game.settings.get(SharedConsts.MODULE_ID, this._settingKeyIsEnabled); }
	_isActive () { return this._isModuleActive() && this._isEnabled(); }

	onHookInit () {
		// Register the setting regardless of whether or not the module is available, as a hint to the user that the
		// integration exists.
		this._onHookInit_registerSettings();

		if (!this._isActive()) return;
		this._onHookInit();
	}

	_onHookInit_registerSettings () {
		const moduleTitle = game.modules.get(this._moduleId)?.title || this._moduleId;

		game.settings.register(
			SharedConsts.MODULE_ID,
			this._settingKeyIsEnabled,
			{
				name: `Enable Integration with ${moduleTitle}`, // Note that `game.i18n.format` does not work during `init`
				hint: `If enabled, and the "${moduleTitle}" module is active, ${SharedConsts.MODULE_TITLE} will make use of data made available by ${moduleTitle}.`,
				default: true,
				type: Boolean,
				scope: "world",
				config: true,
				requiresReload: true,
			},
		);
	}

	onHookReady () {
		if (!this._isActive()) return;
		this._onHookReady();
	}

	_onHookInit () { /* Implement as required */ }
	_onHookReady () { /* Implement as required */ }

	async pGetExpandedAddonData (
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
		if (!this._isActive()) return null;
		return this._pGetExpandedAddonData({
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

	/** @abstract */
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
	) { throw new Error("Unimplemented!"); }

	/* -------------------------------------------- */

	_unwantedFlagKeys = new Set();
	_wantedFlagKeys = new Set();

	_registerFlagKeys ({unwanted = null, wanted = null}) {
		if (unwanted != null) unwanted.forEach(k => this._unwantedFlagKeys.add(k));
		if (wanted != null) wanted.forEach(k => this._wantedFlagKeys.add(k));
	}

	_mutCleanJson ({json}) {
		// Avoid clobbering specific data
		["name", "img"].forEach(prop => delete json[prop]);
		["source", "description"].forEach(prop => delete json?.system?.[prop]);

		// Remove unwanted flags
		this._unwantedFlagKeys.forEach(prop => delete json?.flags?.[prop]);

		if (game.settings.get(SharedConsts.MODULE_ID, ModuleSettingConsts.DEV_IS_DBG)) {
			const unknownFlags = CollectionUtil.setDiff(new Set(Object.keys(json.flags)), this._wantedFlagKeys);
			if (unknownFlags.length) console.debug(...Util.LGT, `JSON contained unknown flags:\n\t${unknownFlags.join("\n\t")}\n${JSON.stringify(json, null, "\t")}`);
		}

		// Cleanup
		if (!Object.keys(json.system || {}).length) delete json.system;
		if (!Object.keys(json.flags || {}).length) delete json.flags;
		if (!json.effects?.length) delete json.effects;
	}

	_getPostProcessed ({json}) {
		this._mutCleanJson({json});
		if (!Object.keys(json).length) return null;
		// Implicitly override SRD effects if an integration has effects, as we assume they bring their own
		if (json.effects?.length) json.ignoreSrdEffects = true;
		return json;
	}
}
