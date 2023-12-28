import {getMacroFilename} from "../shared/util.js";
import {pDoDownloadZip} from "../client/util.js";
import {flattenObject} from "../shared/foundry-helpers.js";

class ConverterUi {
	static _iptFile = null;
	static _iptText = null;
	static _cbKeepSystem = null;
	static _cbKeepImg = null;
	static _iptScriptHeader = null;
	static _btnConvert = null;
	static _btnCopy = null;
	static _btnDownloadScripts = null;
	static _outText = null;

	static _converted = null;

	static _onChange_file () {
		const reader = new FileReader();
		reader.readAsText(this._iptFile.files[0]);

		const getPreConvertedTextMeta = () => {
			// Check whether filetype is legal
			if (this._iptFile.value.match(/\.(json|txt)$/i) || !this._iptFile.value.includes(".")) { // .json, .txt, or no filetype
				return {text: reader.result, error: null};
			}

			if (this._iptFile.value.match(/\.db$/i)) { // .db
				return {
					text: JSON.stringify(reader.result.split("\n").filter(it => it.length).map(it => JSON.parse(it)), null, "\t"),
					error: null,
				};
			}

			return {
				text: "Failed to parse input text!\n\n> Invalid filetype",
				error: `Failed to load invalid filetype: .${this._iptFile.value.split(".").slice(-1)[0]}`,
			};
		};

		reader.onload = () => {
			const {text, error} = getPreConvertedTextMeta();

			this._iptText.value = text;
			if (error) {
				console.error(error);
				return;
			}

			this._doConvert();
		};
	}

	static async _pOnClick_btnCopy () {
		await navigator.clipboard.writeText(this._outText.value);
		this._btnCopy.innerHTML = "Copied ✓";
		console.log("Copied!");
		window.setTimeout(() => this._btnCopy.innerHTML = "Copy", 500);
	}

	static async _pOnClick_btnDownloadScripts () {
		await pDoDownloadZip(
			"scripts.zip",
			this._converted
				.filter(it => it.script)
				.map(({script}) => ({name: script.filename, data: script.script})),
		);
	}

	static _doConvert () {
		try {
			this._doConvert_();
		} catch (e) {
			this._outText.value = `Failed to parse input text!\n\n${e}`;
			throw e;
		}
	}

	static _doConvert_ () {
		const json = JSON.parse(this._iptText.value);
		const ipt = json instanceof Array
			? json
				.sort((a, b) => (a.flags?.srd5e?.page || "").localeCompare(b.flags?.srd5e?.page || "")
					|| (a.type || "").localeCompare(b.type || "")
					|| (a.name || "").localeCompare(b.name || "", {sensitivity: "base"}))
			: [json];

		this._converted = ipt.map(it => Converter.getConverted(
			it,
			{
				isKeepSystem: this._cbKeepSystem.checked,
				isKeepImg: this._cbKeepImg.checked,
				scriptHeader: this._iptScriptHeader.value.trim(),
			},
		));
		this._renderConverted();
	}

	static _renderConverted () {
		this._outText.value = JSON.stringify(
			this._converted.map(it => it.data),
			null,
			"\t",
		);

		const withScripts = this._converted.filter(it => it.script);
		this._btnDownloadScripts.innerText = `Download Scripts (${withScripts.length})`;
		this._btnDownloadScripts.disabled = !withScripts.length;
	}

	/* -------------------------------------------- */

	static _pInit_elements () {
		this._iptFile = document.getElementById("ipt-file");
		this._iptText = document.getElementById("ipt-text");
		this._cbKeepSystem = document.getElementById("cb-keep-system");
		this._cbKeepImg = document.getElementById("cb-keep-img");
		this._iptScriptHeader = document.getElementById("ipt-script-header");
		this._btnConvert = document.getElementById("btn-convert");
		this._btnCopy = document.getElementById("btn-copy");
		this._btnDownloadScripts = document.getElementById("btn-download-scripts");
		this._outText = document.getElementById("out-text");

		this._iptFile.addEventListener("change", this._onChange_file.bind(this));
		this._btnConvert.addEventListener("click", this._doConvert.bind(this));
		this._btnCopy.addEventListener("click", this._pOnClick_btnCopy.bind(this));
		this._btnDownloadScripts.addEventListener("click", this._pOnClick_btnDownloadScripts.bind(this));
	}

	static async _pInit_pState () {
		const savedState = await localforage.getItem("state") || {};

		this._iptText.value = savedState["ipt-text"] || "";
		this._cbKeepSystem.checked = savedState["cb-keep-system"] || false;
		this._cbKeepImg.checked = savedState["cb-keep-img"] || false;
		this._iptScriptHeader.value = savedState["ipt-script-header"] || "";

		this._btnConvert.addEventListener("click", () => {
			localforage.setItem("state", {
				"ipt-text": this._iptText.value,
				"cb-keep-system": this._cbKeepSystem.checked,
				"cb-keep-img": this._cbKeepImg.checked,
				"ipt-script-header": this._iptScriptHeader.value,
			});
		});
	}

	static async pInit () {
		this._pInit_elements();
		await this._pInit_pState();
	}
}

class ConverterUtil {
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
}

class Converter {
	static getConverted (json, {isKeepSystem = false, isKeepImg = false, scriptHeader = null} = {}) {
		const name = json.name;
		const source = this._getSource(json);

		const effects = EffectConverter.getEffects(json);
		const {flags, script} = FlagConverter.getFlags({json, name, source, scriptHeader});

		const out = {
			name,
			source,
			effects,
			flags,
		};
		if (script) out.itemMacro = {file: script.filename};

		if (isKeepSystem && json.system) {
			if (json.system.source) delete json.system.source;
			if (Object.keys(json.system || {}).length) out.system = flattenObject(json.system);
		}

		if (isKeepImg) {
			const img = ImgConverter.getImg(json);
			if (img) out.img = img;
		}

		return {
			data: out,
			script,
		};
	}

	static _getSource (json) {
		const sourceRaw = json.system?.source;
		if (!sourceRaw) return null;
		return sourceRaw
			.split(/[,;.]/g)[0]
			.trim()
			.replace(/ pg.*$/, "");
	}
}

class FlagConverter {
	static getFlags ({json, name, source, scriptHeader = null}) {
		if (!Object.keys(json.flags || {}).length) return {};

		const outFlags = {};
		let outScript = null;

		Object.entries(json.flags)
			.forEach(([k, flags]) => {
				switch (k) {
					// region Discard these
					case "srd5e":
					case "plutonium":
					case "core":
					case "exportSource":
					case "favtab": // https://foundryvtt.com/packages/favtab
					case "magicitems": // https://foundryvtt.com/packages/magicitems
					case "cf": // https://foundryvtt.com/packages/compendium-folders (?)
					case "scene-packer": // https://foundryvtt.com/packages/scene-packer
					case "betterRolls5e": // https://foundryvtt.com/packages/betterrolls5e/
						break;
						// endregion

					// region Handle these
					case "midi-qol": {
						const outSub = {};
						ConverterUtil.copyTruthy(outSub, flags);
						if (Object.keys(outSub).length) outFlags[k] = outSub;
						break;
					}
					case "midiProperties": {
						const outSub = {};
						ConverterUtil.copyTruthy(outSub, flags);
						if (Object.keys(outSub).length) outFlags[k] = outSub;
						break;
					}
					case "enhanced-terrain-layer": {
						const outSub = {};
						ConverterUtil.copyTruthy(outSub, flags);
						if (Object.keys(outSub).length) outFlags[k] = outSub;
						break;
					}
					// endregion

					// region Special handling for item macros
					case "itemacro": {
						const filename = getMacroFilename({name, source});

						const lines = flags.macro.command
							.trim()
							.replace(/\r/g, "")
							.split("\n");

						// world's worst heuristic
						const indentStyle = lines.some(it => it.startsWith("  "))
							? "  "
							: "\t";

						const script = [
							scriptHeader,
							`async function macro (args) {`,
							lines
								.map(l => {
									const lTrim = indentStyle === "  "
										? l.replace(/^(?<spaces> {2}\s+)/g, (...m) => "\t".repeat(Math.floor(m.at(-1).spaces.length / 2)))
										: l;
									return `\t${lTrim}`;
								})
								.join("\n"),
							`}\n`,
						]
							.filter(Boolean)
							.join("\n");

						if (outScript != null) throw new Error(`Multiple scripts found! This should never occur.`);
						outScript = {
							filename,
							script,
						};

						break;
					}
					// endregion

					default: {
						console.warn(`Unknown flag property "${k}"--copying as-is`);
						outFlags[k] = flags;
					}
				}
			});

		const out = {};
		if (Object.keys(outFlags).length) out.flags = outFlags;
		if (outScript != null) out.script = outScript;
		return out;
	}
}

class EffectConverter {
	static getEffects (json) {
		if (!json.effects?.length) return;

		return json.effects
			.map(eff => this._getEffect(eff))
			.filter(Boolean);
	}

	static _getEffect (eff) {
		this._mutPreClean(eff);

		this._mutChanges(eff);

		this._mutFlags(eff);
		this._mutDuration(eff);

		if (!eff.changes?.length && !Object.keys(eff.flags || {}).length) return null;

		this._mutRequires(eff);

		return eff;
	}

	static _mutPreClean (eff) {
		// N.b. "selectedKey" is midi-qol UI QoL tracking data, and can be safely skipped
		["_id", "icon", "label", "origin", "tint", "selectedKey"].forEach(prop => delete eff[prop]);
		["statuses"].filter(prop => !eff[prop].length).forEach(prop => delete eff[prop]);

		// Delete these only if falsy--we only store `"true"` disabled/transfer values
		["disabled", "transfer"].filter(prop => !eff[prop]).forEach(prop => delete eff[prop]);
	}

	static _mutChanges (eff) {
		if (!eff.changes?.length) return delete eff.changes;

		eff.changes = eff.changes.map(it => ({...it, mode: this._getChangeMode(it.mode)}));
	}

	static _FLAGS_FALSY_VALUES = new Set([
		// region dae
		"none",
		// endregion

		// region ActiveAuras
		"None",
		// endregion

		// region dnd5e-helpers
		"Ignore",
		// endregion
	]);

	static _mutFlags (eff) {
		if (!Object.keys(eff.flags || {}).length) return delete eff.flags;

		const flagsNxt = {};
		Object.entries(eff.flags)
			.forEach(([namespace, moduleFlags]) => {
				const moduleFlagsNxt = {};
				ConverterUtil.copyTruthy(moduleFlagsNxt, moduleFlags, {additionalFalsyValues: this._FLAGS_FALSY_VALUES});

				// region Handle specific cases
				switch (namespace) {
					case "dae": this._mutFlags_dae({eff, moduleFlagsNxt}); break;
				}
				// endregion

				if (Object.keys(moduleFlagsNxt).length) flagsNxt[namespace] = moduleFlagsNxt;
			});

		if (Object.keys(flagsNxt).length) eff.flags = flagsNxt;
		else delete eff.flags;
	}

	static _mutFlags_dae ({eff, moduleFlagsNxt}) {
		if (moduleFlagsNxt["transfer"] == null) return;

		// Hoist DAE "transfer" flag
		const val = moduleFlagsNxt["transfer"];
		delete moduleFlagsNxt["transfer"];
		if (val) eff.transfer = true;
	}

	static _mutDuration (eff) {
		if (!eff.duration) return;

		const durationNxt = {};
		ConverterUtil.copyTruthy(durationNxt, eff.duration);
		if (Object.keys(durationNxt).length) eff.duration = durationNxt;
		else delete eff.duration;
	}

	static _mutRequires (eff) {
		const requires = {};

		(eff.changes || [])
			.forEach(it => {
				const [ptFlags, ptModule] = (it.key || "").split(".").slice(0, 2);
				if (ptFlags !== "flags") return;
				const moduleId = this._getRequiresModuleId(ptModule);
				if (!moduleId) return;
				requires[moduleId] = true;
			});

		Object.keys(eff.flags || {})
			.forEach(k => {
				const moduleId = this._getRequiresModuleId(k);
				if (!moduleId) return;
				requires[moduleId] = true;
			});

		if (Object.keys(requires).length) eff.requires = requires;
	}

	static _getRequiresModuleId (flagKey) {
		switch (flagKey) {
			// If the key matches the module's ID
			case "ActiveAuras":
			case "dnd5e-helpers":
				return flagKey;

			// region Implicit requires
			case "dae":
			case "midi-qol":
				return null;
				// endregion

			default: return null;
		}
	}

	static _getChangeMode (modeRaw) {
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
}

class ImgConverter {
	static _IGNORED_IMGS = new Set([
		"icons/svg/mystery-man.svg",
		"icons/svg/item-bag.svg",
		"icons/svg/aura.svg",
	]);

	static getImg (json) {
		if (json.img && !this._IGNORED_IMGS.has(json.img)) return json.img;
		return null;
	}
}

window.addEventListener("load", () => ConverterUi.pInit());
