import {SharedConsts} from "../shared/SharedConsts.js";
import {Util} from "./Util.js";
import {OptionalDependenciesManager} from "./OptionalDependenciesManager.js";
import {SettingsManager} from "./SettingsManager.js";
import {Api} from "./Api.js";
import {Integrations} from "./integrations/Integrations.js";

class Main {
	static _HAS_FAILED = false;

	static handleInit () {
		if (this._HAS_FAILED) return;
		try {
			this._handleInit();
		} catch (e) {
			this._onError(e);
		}
	}

	static _handleInit () {
		SettingsManager.handleInit();
		OptionalDependenciesManager.handleInit();
		Integrations.handleInit();
	}

	static handleReady () {
		if (this._HAS_FAILED) return;
		try {
			this._handleReady();
		} catch (e) {
			this._onError(e);
		}
	}

	static _handleReady () {
		Api.handleReady();
		SettingsManager.handleReady();
		OptionalDependenciesManager.handleReady();
		Integrations.handleReady();
		console.log(...Util.LGT, `Initialized.`);
	}

	static _onError (e) {
		this._HAS_FAILED = true;
		setTimeout(() => { throw e; });
		if (ui.notifications?.error) ui.notifications.error(`Failed to initialize ${SharedConsts.MODULE_TITLE}! ${VeCt.STR_SEE_CONSOLE}`);
	}
}

Hooks.on("init", Main.handleInit.bind(Main));
Hooks.on("ready", Main.handleReady.bind(Main));
