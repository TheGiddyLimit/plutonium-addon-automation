import {SharedConsts} from "../../shared/SharedConsts.js";

/** @abstract */
export class IntegrationBase {
	_moduleId;

	get _settingKeyIsEnabled () { return `isIntegrationEnabled_${this._moduleId}`; }

	_isModuleActive () { return game.modules.get(this._moduleId)?.active; }
	_isEnabled () { return game.settings.get(SharedConsts.MODULE_ID, this._settingKeyIsEnabled); }
	_isActive () { return this._isModuleActive() && this._isEnabled(); }

	onHookInit () {
		// Register the setting regardless of whether or not the module is available, as a hint to the user that the
		//    integration exists.
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

	/** @abstract */
	async pGetExpandedAddonData (
		{
			propJson,
			path,
			fnMatch,
			ent,
			isSilent = false,
		},
	) { throw new Error("Unimplemented!"); }
}