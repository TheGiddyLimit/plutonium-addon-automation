
class ConverterUi {
	static init () {
		const iptFile = document.getElementById("ipt-file");
		const iptText = document.getElementById("ipt-text");
		const btnConvert = document.getElementById("btn-convert");
		const btnCopy = document.getElementById("btn-copy");
		const outText = document.getElementById("out-text");

		iptFile.addEventListener("change", () => {
			const reader = new FileReader();
			reader.readAsText(iptFile.files[0]);
			reader.onload = () => {
				// Check whether filetype is legal
				let text;
				if (iptFile.value.match(/\.(json|txt)$/i)) { // .json or .txt
					text = reader.result;
				} else if (iptFile.value.match(/\.db$/i)) { // .db
					text = "[\n\t" + reader.result.replace(/\}\n\{/g, "},\n\t{") + "]"; // Hastily converting to JSON
				} else {
					outText.value = 'Failed to parse input text!\n\n> Invalid filetype';
					console.error('Failed to load invalid filetype: ' + iptFile.value.match(/(?<=\/|\\)[^\/\\]+$/)?.[0]); // This monstrosity just grabs the filename from the path
					return;
				}
				iptText.value = text;
				doConvert();
			};
		});

		const doConvert = () => {
			try {
				outText.value = JSON.stringify(Converter.getConverted(JSON.parse(iptText.value)), null, "\t");
			} catch (e) {
				console.log("Failed to parse input text!");
				outText.value = "Failed to parse input text!\n\n" + e;
				throw e;
			}
		};

		btnConvert.addEventListener("click", () => doConvert());

		btnCopy.addEventListener("click", async () => {			
			await navigator.clipboard.writeText(outText.value);
			btnCopy.innerHTML = 'Copy ✓';
			console.log("Copied!");
			window.setTimeout(btnCopy.resetText, 480);
		});
		
		btnCopy.resetText = () => btnCopy.innerHTML = 'Copy';
	}
}

class Converter {
	static getConverted (json) {
		if (json instanceof Array) return json.map(it => this.getConverted(it));

		const effects = this._getEffects(json);
		const flags = this._getFlags(json);

		return {
			name: json.name,
			source: this._getSource(json),
			effects,
			flags,
		};
	}

	static _getSource (json) {
		const sourceRaw = json.data?.source;
		if (!sourceRaw) return null;
		return sourceRaw.split(/[,;.]/g)[0].trim();
	}

	static _getEffects (json) {
		if (!json.effects?.length) return;

		return json.effects
			.map(eff => {
				// N.b. "selectedKey" is midi-qol UI QoL tracking data, and can be safely skipped
				["_id", "disabled", "icon", "label", "origin", "transfer", "tint", "selectedKey"].forEach(prop => delete eff[prop]);

				if (!eff.changes?.length) delete eff.changes;
				else {
					eff.changes = eff.changes.map(it => ({...it, mode: this._getEffectMode(it.mode)}));
				}

				if (Object.keys(eff.flags || {}).length) {
					const flagsNxt = {};
					Object.entries(eff.flags)
						.forEach(([k, v]) => {
							const flagsNxtSub = {};
							this._copyTruthy(
								flagsNxtSub,
								v,
								{
									additionalFalsyValues: new Set([
										// region dae
										"none",
										// endregion

										// region ActiveAuras
										"None",
										// endregion

										// region dnd5e-helpers
										"Ignore",
										// endregion
									]),
								},
							);

							if (Object.keys(flagsNxtSub).length) flagsNxt[k] = flagsNxtSub;
						});
					eff.flags = flagsNxt;
				}

				if (eff.duration) {
					const durationNxt = {};
					this._copyTruthy(durationNxt, eff.duration);
					if (Object.keys(durationNxt).length) eff.duration = durationNxt;
					else delete eff.duration;
				}

				if (!eff.changes?.length && !Object.keys(eff.flags || {}).length) return null;

				// region Module requirements
				const requires = {};

				(eff.changes || [])
					.forEach(it => {
						const [ptFlags, ptModule] = (it.key || "").split(".").slice(0, 2);
						if (ptFlags !== "flags") return;
						const moduleId = this._getModuleId(ptModule);
						if (!moduleId) return;
						requires[moduleId] = true;
					});

				Object.keys(eff.flags || {})
					.forEach(k => {
						const moduleId = this._getModuleId(k);
						if (!moduleId) return;
						requires[moduleId] = true;
					});

				if (Object.keys(requires).length) eff.requires = requires;
				// endregion

				return eff;
			})
			.filter(Boolean);
	}

	static _getModuleId (flagKey) {
		switch (flagKey) {
			// If the key matches the module's ID
			case "ActiveAuras":
			case "dae":
			case "dnd5e-helpers":
			case "midi-qol":
				return flagKey;

			default: return null;
		}
	}

	static _getEffectMode (modeRaw) {
		switch (modeRaw) {
			case 0: return "CUSTOM";
			case 1: return "MULTIPLY";
			case 2: return "ADD";
			case 3: return "DOWNGRADE";
			case 4: return "UPGRADE";
			case 5: return "OVERRIDE";
			default: return modeRaw;
		}
	}

	static _getFlags (json) {
		if (!Object.keys(json.flags || {}).length) return;

		const out = {};

		Object.entries(json.flags)
			.forEach(([k, flags]) => {
				switch (k) {
					// region Discard these
					case "srd5e":
					case "core":
						break;
						// endregion

					// region Handle these
					case "midi-qol": {
						const outSub = {};
						this._copyTruthy(outSub, flags);
						if (Object.keys(outSub).length) out[k] = outSub;
						break;
					}
					case "midiProperties": {
						const outSub = {};
						this._copyTruthy(outSub, flags);
						if (Object.keys(outSub).length) out[k] = outSub;
						break;
					}
					case "enhanced-terrain-layer": {
						const outSub = {};
						this._copyTruthy(outSub, flags);
						if (Object.keys(outSub).length) out[k] = outSub;
						break;
					}
					// endregion

					default: {
						console.warn(`Unknown flag property "${k}"--copying as-is`);
						out[k] = flags;
					}
				}
			});

		if (Object.keys(out).length) return out;
	}

	static _copyTruthy (out, obj, {additionalFalsyValues = null} = {}) {
		Object.entries(obj)
			.forEach(([k2, v2]) => {
				if (additionalFalsyValues && additionalFalsyValues.has(v2)) return;

				if (!v2) return;
				if (v2 instanceof Array && !v2.length) return;
				if (typeof v2 === "object" && !Object.keys(v2).length) return;

				out[k2] = v2;
			});
	}
}

window.addEventListener("load", () => ConverterUi.init());
