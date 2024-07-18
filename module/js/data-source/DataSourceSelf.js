import {SharedConsts} from "../../shared/SharedConsts.js";
import {OptionalDependenciesManager} from "../OptionalDependenciesManager.js";
import {DataSourceBase} from "./DataSourceBase.js";
import {ModuleSettingConsts} from "../ModuleSettingConsts.js";
import {StartupHookMixin} from "../mixins/MixinStartupHooks.js";

export class DataSourceSelf extends StartupHookMixin(DataSourceBase) {
	static _onHookInitDev () {
		game.settings.register(
			SharedConsts.MODULE_ID,
			ModuleSettingConsts.DEV_IS_DISABLE_SELF_SOURCE,
			{
				name: "PLUTAA.Developer: Disable Non-Integration Data",
				hint: "Disable module-internal data.",
				default: false,
				type: Boolean,
				scope: "client",
				config: true,
				restricted: true,
			},
		);
	}

	/* -------------------------------------------- */

	static #P_INDEX = null;

	static async pGetExpandedAddonData (
		{
			propJson,
			path,
			fnMatch,
			ent,
			propBase,
			base = undefined,
			actorType = undefined,
			isSilent = false,
		},
	) {
		if (game.settings.get(SharedConsts.MODULE_ID, ModuleSettingConsts.DEV_IS_DISABLE_SELF_SOURCE)) return null;

		const index = await (this.#P_INDEX = this.#P_INDEX || DataUtil.loadJSON(`${SharedConsts.MODULE_PATH}/data/_generated/index.json`));

		const ixFile = MiscUtil.get(index, propJson, ...path);
		if (ixFile == null) return null;

		const json = await DataUtil.loadJSON(`${SharedConsts.MODULE_PATH}/data/${index._file[ixFile]}`);

		const out = (json?.[propJson] || [])
			.find(it => fnMatch(it));
		if (!out) return null;

		return this._getFilteredOutput(
			this._getPostProcessed(
				this._getFilteredInput(
					out,
					{isSilent},
				),
			),
			{isSilent},
		);
	}

	static _getFilteredInput (out, {isSilent}) {
		out = this._getFilteredInput_itemMacro({out, isSilent});
		return out;
	}

	static _getFilteredInput_itemMacro ({out, isSilent}) {
		if (this._isRequiresMatch(out.itemMacro?.requires, {isSilent})) return out;

		out = foundry.utils.deepClone(out);
		delete out.itemMacro;
		return out;
	}

	static _getPostProcessed (out) {
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

			const convEffectData = convEffect.convertToActiveEffectData
				// DCE < v4.0.0
				? convEffect.convertToActiveEffectData({
					includeAte: game.modules.get("ATL")?.active,
					includeTokenMagic: game.modules.get("tokenmagic")?.active,
				})
				// DCE >= v4.0.0
				: convEffect.toObject(true);

			delete eff.convenientEffect;

			return foundry.utils.mergeObject(
				convEffectData,
				{
					// region Convert to our alternate field names, which are prioritized. This ensures the CE name/image
					//   will be used over a name/image generated from the parent document.
					name: convEffectData.name ?? convEffectData.label,
					img: convEffectData.icon,
					// endregion
					...eff,

					// Override CE's built-in IDs, as they are not valid (e.g. `"id": "Convenient Effect: Invisible"`),
					//   which causes issues when creating temporary actors (e.g. when using Quick Insert to view a
					//   creature).
					// (N.b.: No longer required as of CE v4.0.0)
					id: foundry.utils.randomID(),
				},
			);
		});

		return out;
	}

	static _getPostProcessed_itemMacro ({out}) {
		if (!out.itemMacro) return out;

		out = foundry.utils.deepClone(out);

		((out.flags ||= {}).dae ||= {}).macro = {
			"_id": null,
			"name": "-",
			"type": "script",
			"author": game.userId,
			"img": "icons/svg/dice-target.svg",
			"scope": "global",
			"command": out.itemMacro.script,
			"folder": null,
			"sort": 0,
			"ownership": {"default": 0},
			"flags": {},
		};

		delete out.itemMacro;

		return out;
	}

	static _getFilteredOutput (out, {isSilent}) {
		out = this._getFilteredOutput_effects({out, isSilent});
		return out;
	}

	static _getFilteredOutput_effects ({out, isSilent}) {
		if (!out.effects?.some(({requires}) => !!requires)) return out;

		out = foundry.utils.deepClone(out);

		out.effects = out.effects
			.filter(eff => this._isRequiresMatch(eff.requires, {isSilent}));

		return out;
	}

	static _isRequiresMatch (requiresObj, {isSilent}) {
		if (!requiresObj) return true;

		return Object.keys(requiresObj)
			.map(moduleId => {
				if (game.modules.get(moduleId)?.active) return true;
				if (!isSilent) OptionalDependenciesManager.doNotifyMissing(moduleId);
				return false;
			})
			// Avoid using `.every` directly, above, so that we run through all possible requirements
			.every(Boolean);
	}
}
