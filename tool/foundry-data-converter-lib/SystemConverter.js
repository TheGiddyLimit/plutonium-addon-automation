import {ConverterUtil} from "./ConverterUtil.js";

class _SystemConverterUtils {
	static _isRetainedString (obj) {
		if (obj == null) return false;
		if (typeof obj !== "string") return false;
		return /@[-a-zA-Z]+(\.[-a-zA-Z]+)*/.test(obj);
	}

	static getRetainedFoundryProperties (obj, {_depth = 0, _ptrRetainDepth = null} = {}) {
		if (obj == null) return;

		_ptrRetainDepth ||= {_: null};
		if (_depth < (_ptrRetainDepth._ ?? -1)) _ptrRetainDepth._ = null;

		// Retain anything deeper than a retained string, within a sub-tree
		if (_depth > (_ptrRetainDepth._ ?? Number.MAX_SAFE_INTEGER)) return obj;

		const to = typeof obj;

		switch (to) {
			case "boolean":
			case "number":
				return undefined;

			case "string": {
				if (this._isRetainedString(obj)) {
					_ptrRetainDepth._ = _ptrRetainDepth._ == null ? _depth : Math.min(_depth, _ptrRetainDepth._);
					return obj;
				}
				return undefined;
			}

			case "object": {
				if (obj instanceof Array) {
					if (!obj.length) return undefined;

					const nxt = obj.map(it => this.getRetainedFoundryProperties(it, {_depth: _depth + 1, _ptrRetainDepth}));
					if (nxt.every(it => it === undefined)) return undefined;

					// If any value in the array was kept, assume we want the whole array
					return obj;
				}

				const nxt = {};

				Object.entries(obj)
					.forEach(([k, v]) => {
						if (v == null) {
							return;
						}

						const vOut = this.getRetainedFoundryProperties(v, {_depth: _depth + 1, _ptrRetainDepth});
						if (vOut === undefined) {
							return;
						}

						nxt[k] = vOut;
					});

				if (!Object.keys(nxt).length) return undefined;
				return nxt;
			}
			default: throw new Error(`Unhandled type "${to}"`);
		}
	}
}

export class SystemConverter {
	static getSystem ({json, isKeepSystem = false}) {
		if (!Object.keys(json.system || {})) return null;

		if (isKeepSystem) {
			const system = this._getPreClean_isKeepSystem({json, system: json.system});
			if (Object.keys(system).length) return foundry.utils.flattenObject(system);
			return null;
		}

		let system = this._getPreClean({json, system: json.system});
		if (!system) return null;

		system = _SystemConverterUtils.getRetainedFoundryProperties(system);

		if (Object.keys(system || {}).length) return foundry.utils.flattenObject(system);
		return null;
	}

	static _getPreClean_isKeepSystem ({json, system}) {
		["source"].forEach(prop => delete system[prop]);

		return system;
	}

	static _getPreClean ({json, system}) {
		const out = ConverterUtil.getWithoutFalsy(system);
		if (!out) return out;

		["description", "source", "type"].forEach(prop => delete out[prop]);

		return out;
	}
}
