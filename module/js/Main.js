import {SharedConsts} from "../shared/SharedConsts.js";

class Util {
	static LGT = [
		`%cPlutonium Addon: Data`,
		`color: #5494cc; font-weight: bold;`,
		`|`,
	];

	static get plutoniumApi () { return game.modules.get(SharedConsts.MODULE_NAME_PARENT).api; }
}

class DataManager {
	static _P_LOADING_INDEX = null;
	static _INDEX = null;

	static async _pLoadIndex () {
		this._P_LOADING_INDEX = this._P_LOADING_INDEX || (async () => {
			this._INDEX = await Util.plutoniumApi.util.requests.getWithCache(`${SharedConsts.MODULE_PATH}/data/_generated/index.json`);
		})();

		await this._P_LOADING_INDEX;
	}

	static async api_pGetExpandedAddonData (
		{
			propJson,
			path,
			fnMatch,
		},
	) {
		await this._pLoadIndex();

		const ixFile = MiscUtil.get(this._INDEX, propJson, ...path);
		if (ixFile == null) return null;

		const json = await Util.plutoniumApi.util.requests.getWithCache(`${SharedConsts.MODULE_PATH}/data/${this._INDEX._file[ixFile]}`);

		const out = (json?.[propJson] || [])
			.find(it => fnMatch(it));
		if (!out) return null;

		return this._getPostProcessed({out});
	}

	static _getPostProcessed ({out}) {
		out = this._getPostProcessed_effects({out});
		out = this._getPostProcessed_itemMacro({out});
		return out;
	}

	static _getPostProcessed_effects ({out}) {
		if (!out.effects?.some(({convenientEffect}) => !!convenientEffect)) return out;

		out = foundry.utils.deepClone(out);

		out.effects = out.effects.map(eff => {
			if (!eff.convenientEffect) return eff;

			const convEffect = game.dfreds.effectInterface.findEffectByName(eff.convenientEffect);
			if (!convEffect) return eff;

			const convEffectData = convEffect.convertToActiveEffectData();

			delete eff.convenientEffect;

			return foundry.utils.mergeObject(
				convEffectData,
				{
					// region Convert to our alternate field names, which are prioritized. This ensures the CE name/image
					//   will be used over a name/image generated from the parent document.
					name: convEffectData.label,
					img: convEffectData.icon,
					// endregion
					...eff,
				},
			);
		});

		return out;
	}

	static _getPostProcessed_itemMacro ({out}) {
		if (!out.itemMacro) return out;

		out = foundry.utils.deepClone(out);

		out.flags = out.flags || {};
		out.flags.itemacro = {
			"macro": {
				"_id": null,
				"name": "-",
				"type": "script",
				"author": game.userId,
				"img": "icons/svg/dice-target.svg",
				"scope": "global",
				"command": out.itemMacro,
				"folder": null,
				"sort": 0,
				"ownership": {"default": 0},
				"flags": {},
			},
		};

		delete out.itemMacro;

		return out;
	}
}

class Api {
	static init () { game.modules.get(SharedConsts.MODULE_ID).api = this; }

	static pGetExpandedAddonData (opts) { return DataManager.api_pGetExpandedAddonData(opts); }
}

Hooks.on("ready", () => {
	console.log(...Util.LGT, `Firing "ready" hook...`);
	try {
		Api.init();
		console.log(...Util.LGT, `Initialisation complete!`);
	} catch (e) {
		console.error(...Util.LGT, e);
		window.alert(`Failed to initialise ${SharedConsts.MODULE_TITLE}! ${VeCt.STR_SEE_CONSOLE}`);
	}
});
