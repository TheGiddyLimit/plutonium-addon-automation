import {SharedConsts} from "../shared/SharedConsts.js";

class Util {
	static LGT = [
		`%cPlutonium Addon: Data`,
		`color: #5494cc; font-weight: bold;`,
		`|`,
	];

	static get plutoniumApi () { return game.modules.get(SharedConsts.MODULE_NAME_PARENT).api; }
}

class DataManager {
	static _P_LOADING_INDEX = null;
	static _INDEX = null;

	static async _pLoadIndex () {
		this._P_LOADING_INDEX = this._P_LOADING_INDEX || (async () => {
			this._INDEX = await Util.plutoniumApi.util.requests.getWithCache(`${SharedConsts.MODULE_PATH}/data/_generated/index.json`);
		})();

		await this._P_LOADING_INDEX;
	}

	static async api_pGetSideJson (prop, ...path) {
		await this._pLoadIndex();

		const ixFile = MiscUtil.get(this._INDEX, prop, ...path);
		if (ixFile == null) return null;

		return Util.plutoniumApi.util.requests.getWithCache(`${SharedConsts.MODULE_PATH}/data/${this._INDEX._file[ixFile]}`);
	}
}

class Api {
	static init () { game.modules.get(SharedConsts.MODULE_NAME).api = this; }

	static pGetSideJson (prop, ...path) { return DataManager.api_pGetSideJson(prop, ...path); }
}

Hooks.on("ready", () => {
	console.log(...Util.LGT, `Firing "ready" hook...`);
	try {
		Api.init();
		console.log(...Util.LGT, `Initialisation complete!`);
	} catch (e) {
		console.error(...Util.LGT, e);
		window.alert(`Failed to initialise ${SharedConsts.MODULE_TITLE}! ${VeCt.STR_SEE_CONSOLE}`);
	}
});
