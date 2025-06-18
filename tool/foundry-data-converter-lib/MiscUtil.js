import {VeCt} from "./VeCt.js";

/** (Copy from 5etools source) */
export class MiscUtil {
	/**
	 * @abstract
	 */
	static _WalkerBase = class {
		/**
		 * @param [opts]
		 * @param [opts.keyBlocklist]
		 * @param [opts.isAllowDeleteObjects] If returning `undefined` from an object handler should be treated as a delete.
		 * @param [opts.isAllowDeleteArrays] If returning `undefined` from an array handler should be treated as a delete.
		 * @param [opts.isAllowDeleteBooleans] (Unimplemented) // TODO
		 * @param [opts.isAllowDeleteNumbers] (Unimplemented) // TODO
		 * @param [opts.isAllowDeleteStrings] (Unimplemented) // TODO
		 * @param [opts.isDepthFirst] If array/object recursion should occur before array/object primitive handling.
		 * @param [opts.isNoModification] If the walker should not attempt to modify the data.
		 * @param [opts.isBreakOnReturn] If the walker should fast-exist on any handler returning a value.
		 */
		constructor (
			{
				keyBlocklist,
				isAllowDeleteObjects,
				isAllowDeleteArrays,
				isAllowDeleteBooleans,
				isAllowDeleteNumbers,
				isAllowDeleteStrings,
				isDepthFirst,
				isNoModification,
				isBreakOnReturn,
			} = {},
		) {
			this._keyBlocklist = keyBlocklist || new Set();
			this._isAllowDeleteObjects = isAllowDeleteObjects;
			this._isAllowDeleteArrays = isAllowDeleteArrays;
			this._isAllowDeleteBooleans = isAllowDeleteBooleans;
			this._isAllowDeleteNumbers = isAllowDeleteNumbers;
			this._isAllowDeleteStrings = isAllowDeleteStrings;
			this._isDepthFirst = isDepthFirst;
			this._isNoModification = isNoModification;
			this._isBreakOnReturn = isBreakOnReturn;

			if (isBreakOnReturn && !isNoModification) throw new Error(`"isBreakOnReturn" may only be used in "isNoModification" mode!`);
		}
	};

	static _WalkerSync = class extends this._WalkerBase {
		_applyHandlers ({handlers, obj, lastKey, stack}) {
			handlers = handlers instanceof Array ? handlers : [handlers];
			const didBreak = handlers.some(h => {
				const out = h(obj, lastKey, stack);
				if (this._isBreakOnReturn && out) return true;
				if (!this._isNoModification) obj = out;
			});
			if (didBreak) return VeCt.SYM_WALKER_BREAK;
			return obj;
		}

		_runHandlers ({handlers, obj, lastKey, stack}) {
			handlers = handlers instanceof Array ? handlers : [handlers];
			handlers.forEach(h => h(obj, lastKey, stack));
		}

		_doObjectRecurse (obj, primitiveHandlers, stack) {
			for (const k of Object.keys(obj)) {
				if (this._keyBlocklist.has(k)) continue;

				const out = this.walk(obj[k], primitiveHandlers, k, stack);
				if (out === VeCt.SYM_WALKER_BREAK) return VeCt.SYM_WALKER_BREAK;
				if (!this._isNoModification) obj[k] = out;
			}
		}

		_getMappedPrimitive (obj, primitiveHandlers, lastKey, stack, prop, propPre, propPost) {
			if (primitiveHandlers[propPre]) this._runHandlers({handlers: primitiveHandlers[propPre], obj, lastKey, stack});
			if (primitiveHandlers[prop]) {
				const out = this._applyHandlers({handlers: primitiveHandlers[prop], obj, lastKey, stack});
				if (out === VeCt.SYM_WALKER_BREAK) return out;
				if (!this._isNoModification) obj = out;
			}
			if (primitiveHandlers[propPost]) this._runHandlers({handlers: primitiveHandlers[propPost], obj, lastKey, stack});
			return obj;
		}

		_getMappedArray (obj, primitiveHandlers, lastKey, stack) {
			if (primitiveHandlers.preArray) this._runHandlers({handlers: primitiveHandlers.preArray, obj, lastKey, stack});
			if (this._isDepthFirst) {
				if (stack) stack.push(obj);
				const out = new Array(obj.length);
				for (let i = 0, len = out.length; i < len; ++i) {
					out[i] = this.walk(obj[i], primitiveHandlers, lastKey, stack);
					if (out[i] === VeCt.SYM_WALKER_BREAK) return out[i];
				}
				if (!this._isNoModification) obj = out;
				if (stack) stack.pop();

				if (primitiveHandlers.array) {
					const out = this._applyHandlers({handlers: primitiveHandlers.array, obj, lastKey, stack});
					if (out === VeCt.SYM_WALKER_BREAK) return out;
					if (!this._isNoModification) obj = out;
				}
				if (obj == null) {
					if (!this._isAllowDeleteArrays) throw new Error(`Array handler(s) returned null!`);
				}
			} else {
				if (primitiveHandlers.array) {
					const out = this._applyHandlers({handlers: primitiveHandlers.array, obj, lastKey, stack});
					if (out === VeCt.SYM_WALKER_BREAK) return out;
					if (!this._isNoModification) obj = out;
				}
				if (obj != null) {
					const out = new Array(obj.length);
					for (let i = 0, len = out.length; i < len; ++i) {
						if (stack) stack.push(obj);
						out[i] = this.walk(obj[i], primitiveHandlers, lastKey, stack);
						if (stack) stack.pop();
						if (out[i] === VeCt.SYM_WALKER_BREAK) return out[i];
					}
					if (!this._isNoModification) obj = out;
				} else {
					if (!this._isAllowDeleteArrays) throw new Error(`Array handler(s) returned null!`);
				}
			}
			if (primitiveHandlers.postArray) this._runHandlers({handlers: primitiveHandlers.postArray, obj, lastKey, stack});
			return obj;
		}

		_getMappedObject (obj, primitiveHandlers, lastKey, stack) {
			if (primitiveHandlers.preObject) this._runHandlers({handlers: primitiveHandlers.preObject, obj, lastKey, stack});
			if (this._isDepthFirst) {
				if (stack) stack.push(obj);
				const flag = this._doObjectRecurse(obj, primitiveHandlers, stack);
				if (stack) stack.pop();
				if (flag === VeCt.SYM_WALKER_BREAK) return flag;

				if (primitiveHandlers.object) {
					const out = this._applyHandlers({handlers: primitiveHandlers.object, obj, lastKey, stack});
					if (out === VeCt.SYM_WALKER_BREAK) return out;
					if (!this._isNoModification) obj = out;
				}
				if (obj == null) {
					if (!this._isAllowDeleteObjects) throw new Error(`Object handler(s) returned null!`);
				}
			} else {
				if (primitiveHandlers.object) {
					const out = this._applyHandlers({handlers: primitiveHandlers.object, obj, lastKey, stack});
					if (out === VeCt.SYM_WALKER_BREAK) return out;
					if (!this._isNoModification) obj = out;
				}
				if (obj == null) {
					if (!this._isAllowDeleteObjects) throw new Error(`Object handler(s) returned null!`);
				} else {
					if (stack) stack.push(obj);
					const flag = this._doObjectRecurse(obj, primitiveHandlers, stack);
					if (stack) stack.pop();
					if (flag === VeCt.SYM_WALKER_BREAK) return flag;
				}
			}
			if (primitiveHandlers.postObject) this._runHandlers({handlers: primitiveHandlers.postObject, obj, lastKey, stack});
			return obj;
		}

		walk (obj, primitiveHandlers, lastKey, stack) {
			if (obj === null) return this._getMappedPrimitive(obj, primitiveHandlers, lastKey, stack, "null", "preNull", "postNull");

			switch (typeof obj) {
				case "undefined": return this._getMappedPrimitive(obj, primitiveHandlers, lastKey, stack, "undefined", "preUndefined", "postUndefined");
				case "boolean": return this._getMappedPrimitive(obj, primitiveHandlers, lastKey, stack, "boolean", "preBoolean", "postBoolean");
				case "number": return this._getMappedPrimitive(obj, primitiveHandlers, lastKey, stack, "number", "preNumber", "postNumber");
				case "string": return this._getMappedPrimitive(obj, primitiveHandlers, lastKey, stack, "string", "preString", "postString");
				case "object": {
					if (obj instanceof Array) return this._getMappedArray(obj, primitiveHandlers, lastKey, stack);
					return this._getMappedObject(obj, primitiveHandlers, lastKey, stack);
				}
				default: throw new Error(`Unhandled type "${typeof obj}"`);
			}
		}
	};

	/**
	 * @param [opts]
	 * @param [opts.keyBlocklist]
	 * @param [opts.isAllowDeleteObjects] If returning `undefined` from an object handler should be treated as a delete.
	 * @param [opts.isAllowDeleteArrays] If returning `undefined` from an array handler should be treated as a delete.
	 * @param [opts.isAllowDeleteBooleans] (Unimplemented) // TODO
	 * @param [opts.isAllowDeleteNumbers] (Unimplemented) // TODO
	 * @param [opts.isAllowDeleteStrings] (Unimplemented) // TODO
	 * @param [opts.isDepthFirst] If array/object recursion should occur before array/object primitive handling.
	 * @param [opts.isNoModification] If the walker should not attempt to modify the data.
	 * @param [opts.isBreakOnReturn] If the walker should fast-exist on any handler returning a value.
	 */
	static getWalker (opts) {
		opts ||= {};
		return new MiscUtil._WalkerSync(opts);
	}

	/* -------------------------------------------- */

	static copyFast (obj) {
		if ((typeof obj !== "object") || obj == null) return obj;

		if (obj instanceof Array) return obj.map(MiscUtil.copyFast);

		const cpy = {};
		for (const k of Object.keys(obj)) cpy[k] = MiscUtil.copyFast(obj[k]);
		return cpy;
	}

	/** Delete a prop from a nested object, then all now-empty objects backwards from that point. */
	static deleteObjectPath (object, ...path) {
		const stack = [object];

		if (object == null) return object;
		for (let i = 0; i < path.length - 1; ++i) {
			object = object[path[i]];
			stack.push(object);
			if (object === undefined) return object;
		}
		const out = delete object[path.at(-1)];

		for (let i = path.length - 1; i > 0; --i) {
			if (!Object.keys(stack[i]).length) delete stack[i - 1][path[i - 1]];
		}

		return out;
	}
}
