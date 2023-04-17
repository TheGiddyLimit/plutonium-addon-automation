import {IntegrationChrisPremades} from "./ChrisPremades.js";

export class Integrations {
	static _INTEGRATIONS = [
		new IntegrationChrisPremades(),
	];

	static handleInit () { this._INTEGRATIONS.forEach(itg => itg.handleInit()); }
	static handleReady () { this._INTEGRATIONS.forEach(itg => itg.handleReady()); }

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
