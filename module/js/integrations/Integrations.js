import {IntegrationChrisPremades} from "./ChrisPremades.js";
import {StartupHookMixin} from "../mixins/MixinStartupHooks.js";
import {IntegrationMidiSrd} from "./MidiSrd.js";
import {SharedConsts} from "../../shared/SharedConsts.js";
import {ModuleSettingConsts} from "../ModuleSettingConsts.js";
import {Util} from "../Util.js";

/**
 * @mixes {StartupHookMixin}
 */
export class Integrations extends StartupHookMixin(class {}) {
	static _INTEGRATIONS = [
		new IntegrationChrisPremades(),
		new IntegrationMidiSrd(),
	];

	static _onHookInit () { this._INTEGRATIONS.forEach(itg => itg.onHookInit()); }
	static _onHookReady () { this._INTEGRATIONS.forEach(itg => itg.onHookReady()); }

	static async pGetExpandedAddonData (
		{
			propJson,
			path,
			fnMatch,
			ent,
			propBase,
			base,
			isSilent = false,
		},
	) {
		return this._INTEGRATIONS
			.pSerialAwaitFirst(async itg => {
				const out = await itg.pGetExpandedAddonData({
					propJson,
					path,
					fnMatch,
					ent,
					propBase,
					base,
					isSilent,
				});
				if (out && game.settings.get(SharedConsts.MODULE_ID, ModuleSettingConsts.DEV_IS_DBG)) console.debug(...Util.LGT, `Found automation for ${ent.name} in integration: ${itg.constructor.name}`);
				return out;
			});
	}
}
