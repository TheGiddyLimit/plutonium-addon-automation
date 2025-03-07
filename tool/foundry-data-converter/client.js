import {pDoDownloadZip} from "../client/util.js";
import {Converter} from "../foundry-data-converter-lib/Converter.js";
import {getMacroFilename} from "../../shared/util.js";
import "../shared/foundry-globals.js";

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
				getMacroFilename,
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

window.addEventListener("load", () => ConverterUi.pInit());
