import {SharedConsts} from "../shared/SharedConsts.js";
import {DataManager} from "./DataManager.js";

export class Api {
	static handleReady () {
		game.modules.get(SharedConsts.MODULE_ID).api = this;
	}

	static pGetExpandedAddonData (opts) {
		return DataManager.api_pGetExpandedAddonData(opts);
	}
}
