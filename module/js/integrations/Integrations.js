import {IntegrationChrisPremades} from "./ChrisPremades.js";
import {StartupHookMixin} from "../mixins/MixinStartupHooks.js";
import {IntegrationMidiSrd} from "./MidiSrd.js";

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
			isSilent = false,
		},
	) {
		return this._INTEGRATIONS.pSerialAwaitFirst(itg => itg.pGetExpandedAddonData({
			propJson,
			path,
			fnMatch,
			ent,
			isSilent,
		}));
	}
}
