/**
 * @type {function(Class)}
 * @category - Mixins
 * @mixin
 */
export const StartupHookMixin = Base => class extends Base {
	static onHookInit () { /* Implement as required */ }
	static onHookReady () { /* Implement as required */ }
};
