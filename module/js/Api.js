import {SharedConsts} from "../shared/SharedConsts.js";
import {DataManager} from "./DataManager.js";
import {StartupHookMixin} from "./mixins/MixinStartupHooks.js";

/**
 * @mixes {StartupHookMixin}
 */
export class Api extends StartupHookMixin(class {}) {
	static _onHookReady () {
		game.modules.get(SharedConsts.MODULE_ID).api = this;
	}

	static pGetExpandedAddonData (opts) {
		return DataManager.api_pGetExpandedAddonData(opts);
	}
}
