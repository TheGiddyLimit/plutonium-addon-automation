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

	static getWithoutFalsy (obj) {
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
				if (obj instanceof Array) {
					if (!obj.length) return undefined;

					const nxt = obj.map(it => this.getWithoutFalsy(it));
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
						if (v == null) return;

						const vOut = this.getWithoutFalsy(v);
						if (vOut === undefined) return;

						nxt[k] = vOut;
					});

				if (!Object.keys(nxt).length) return undefined;
				return nxt;
			}
			default: throw new Error(`Unhandled type "${to}"`);
		}
	}

	static getWithoutFalsy_ (obj) {
		const out = {};

		Object.entries(obj)
			.forEach(([k, v]) => {
				if (v == null) return;

				const to = typeof v;

				switch (to) {
					case "boolean":
					case "number":
					case "string": {
						if (v) out[k] = v;
						return;
					}

					case "object": {
						if (obj instanceof Array) {
							if (!obj.length) return;

							const nxt = obj.map(it => this.getWithoutFalsy(it));
							if (nxt.every(it => it === undefined)) return;

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

							return out[k] = nxt;
						}

						const nxt = this.getWithoutFalsy(v);
						if (nxt === undefined) return;
						return out[k] = nxt;
					}
					default: throw new Error(`Unhandled type "${to}"`);
				}
			});

		if (!Object.keys(out).length) return undefined;
		return out;
	}
}
