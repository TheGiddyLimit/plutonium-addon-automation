/**
 * @type {function(Class)}
 * @category - Mixins
 * @mixin
 */
export const StartupHookMixin = Base => class extends Base {
	static onHookInit () {
		this._onHookInit();
		return this;
	}

	static _onHookInit () { /* Implement as required */ }

	/* -------------------------------------------- */

	static onHookInitDev () {
		this._onHookInitDev();
		return this;
	}

	static _onHookInitDev () { /* Implement as required */ }

	/* -------------------------------------------- */

	static onHookReady () {
		this._onHookReady();
		return this;
	}

	static _onHookReady () { /* Implement as required */ }

	/* -------------------------------------------- */

	static onHookReadyDev () {
		this._onHookReadyDev();
		return this;
	}

	static _onHookReadyDev () { /* Implement as required */ }
};
