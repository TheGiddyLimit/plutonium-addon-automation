import {SharedConsts} from "../shared/SharedConsts.js";

class Util {
	static LGT = [
		`%cPlutonium Addon: Data`,
		`color: #5494cc; font-weight: bold;`,
		`|`,
	];
}

class Api {
	static init () { game.modules.get(SharedConsts.MODULE_NAME).api = this; }

	static _P_LOADING_INDEX = null;
	static _INDEX = null;

	static async pGetSideJson (prop, ...path) {
		this._P_LOADING_INDEX = this._P_LOADING_INDEX || (async () => {
			this._INDEX = await game.modules.get(SharedConsts.MODULE_NAME_PARENT)
				.api.util.requests.getWithCache(`${SharedConsts.MODULE_PATH}/data/_generated/index.json`);
		})();

		await this._P_LOADING_INDEX;
		const ixFile = MiscUtil.get(this._INDEX, prop, ...path);
		if (ixFile == null) return null;

		return game.modules.get(SharedConsts.MODULE_NAME_PARENT)
			.api.util.requests.getWithCache(`${SharedConsts.MODULE_PATH}/data/${this._INDEX._file[ixFile]}`);
	}
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
