export class ConverterUtil {
	static copyTruthy (out, obj, {additionalFalsyValues = null} = {}) {
		Object.entries(obj)
			.forEach(([k, v]) => {
				if (additionalFalsyValues && additionalFalsyValues.has(v)) return;

				if (!v) return;
				if (v instanceof Array && !v.length) return;
				if (typeof v === "object" && !Object.keys(v).length) return;

				out[k] = v;
			});
	}

	/* -------------------------------------------- */

	/**
	 * @param obj
	 * @param {?Array<string>} _pathStack
	 * @param {?Array<string>} pathsRetain
	 */
	static getWithoutFalsy (obj, {_pathStack = null, pathsRetain = null} = {}) {
		if (obj == null) return;

		const to = typeof obj;

		switch (to) {
			case "boolean":
			case "number":
			case "string": {
				if (obj) return obj;
				return undefined;
			}

			case "object": {
				_pathStack ||= [];

				if (obj instanceof Array) {
					if (!obj.length) return undefined;

					_pathStack.push("[]");
					const nxt = obj.map(it => this.getWithoutFalsy(it, {_pathStack, pathsRetain}));
					_pathStack.pop();
					if (nxt.every(it => it === undefined)) return undefined;

					// Retain placeholder values if any array value was populated
					nxt
						.forEach((it, i) => {
							if (it !== undefined) return;

							const itPrev = obj[i];
							const toItem = typeof itPrev;

							switch (toItem) {
								case "boolean": return nxt[i] = false;
								case "number": return nxt[i] = 0;
								case "string": return nxt[i] = "";
								case "object": {
									if (itPrev instanceof Array) return nxt[i] = [];
									else return nxt[i] = {};
								}
								default: throw new Error(`Unhandled type "${toItem}"`);
							}
						});

					return nxt;
				}

				const nxt = {};

				Object.entries(obj)
					.forEach(([k, v]) => {
						_pathStack.push(k);
						const path = _pathStack.join(".");

						if (pathsRetain?.includes(path)) {
							nxt[k] = v;
							_pathStack.pop();
							return;
						}

						if (v == null) {
							_pathStack.pop();
							return;
						}

						const vOut = this.getWithoutFalsy(v, {_pathStack, pathsRetain});
						if (vOut === undefined) {
							_pathStack.pop();
							return;
						}

						nxt[k] = vOut;

						_pathStack.pop();
					});

				if (!Object.keys(nxt).length) return undefined;
				return nxt;
			}
			default: throw new Error(`Unhandled type "${to}"`);
		}
	}
}
