import {SharedConsts} from "../shared/SharedConsts.js";

class Util {
	static LGT = [
		`%cPlutonium Addon: Data`,
		`color: #5494cc; font-weight: bold;`,
		`|`,
	];
}

class DataManager {
	static async api_pGetExpandedAddonData (
		{
			propJson,
			path,
			fnMatch,
		},
	) {
		const index = await (this._P_INDEX = this._P_INDEX || DataUtil.loadJSON(`${SharedConsts.MODULE_PATH}/data/_generated/index.json`));

		const ixFile = MiscUtil.get(index, propJson, ...path);
		if (ixFile == null) return null;

		const json = await DataUtil.loadJSON(`${SharedConsts.MODULE_PATH}/data/${index._file[ixFile]}`);

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

class SettingsManager {
	static _SETTING_METAS = [
		{
			moduleId: "dfreds-convenient-effects",
			settingKey: "modifyStatusEffects",
			isGmOnly: true,
			expectedValue: "replace",
			allowedValues: ["replace", "add"],
		},
		{
			moduleId: "midi-qol",
			settingKey: "ConfigSettings",
			propPath: "autoCEEffects",
			isGmOnly: true,
			expectedValue: "cepri",
			displaySettingName: "midi-qol.AutoCEEffects.Name",
		},
		{
			moduleId: "itemacro",
			settingKey: "defaultmacro",
			isGmOnly: true,
			expectedValue: false,
		},
		{
			moduleId: "itemacro",
			settingKey: "charsheet",
			isGmOnly: true,
			expectedValue: false,
		},
		{
			moduleId: "token-action-hud",
			settingKey: "itemMacroReplace",
			expectedValue: "showOriginal",
		},
	];

	static _getSettingsData () {
		return this._SETTING_METAS
			.map((
				{
					moduleId,
					settingKey,
					propPath,
					isGmOnly,
					expectedValue,
					allowedValues,
					displaySettingName,
				},
				ixSetting,
			) => {
				allowedValues = allowedValues === undefined ? [expectedValue] : allowedValues;

				if (isGmOnly && !game.user.isGM) return null;
				if (!game.modules.get(moduleId)?.active) return null;

				const setting = game.settings.settings.get(`${moduleId}.${settingKey}`);
				if (!setting) return null;

				let value = game.settings.get(moduleId, settingKey);
				if (propPath) value = foundry.utils.getProperty(value, propPath);

				return {
					name: `${game.modules.get(moduleId).title} \u2013 <i>${game.i18n.localize(displaySettingName || setting.name)}</i>`,
					isExpected: expectedValue === value,
					isAllowed: allowedValues.includes(value),
					displayExpectedValue: setting.choices
						? game.i18n.localize(setting.choices[expectedValue] || expectedValue)
						: expectedValue,
					ixSetting,
				};
			})
			.filter(Boolean);
	}

	/* -------------------------------------------- */

	static _MenuSettingsPrompt = class extends FormApplication {
		static get defaultOptions () {
			return foundry.utils.mergeObject(super.defaultOptions, {
				template: `${SharedConsts.MODULE_PATH}/template/MenuSettingsPrompt.hbs`,
			});
		}

		get title () {
			return `${SharedConsts.MODULE_TITLE} \u2013 ${game.i18n.localize("PLUTAA.Configure Dependencies")}`;
		}

		#lastData = null;

		async getData (opts) {
			const settings = SettingsManager._getSettingsData();

			const out = {
				...(await super.getData(opts)),
				settings,
				isMassError: settings.some(it => !it.isExpected),
				isMassWarning: settings.some(it => !it.isAllowed),
			};

			this.#lastData = out;

			return out;
		}

		async _pFixSetting ({ix}) {
			const {
				expectedValue,
				propPath,
				moduleId,
				settingKey,
			} = SettingsManager._SETTING_METAS[ix];

			let value = expectedValue;
			if (propPath) {
				const current = foundry.utils.deepClone(game.settings.get(moduleId, settingKey));
				foundry.utils.setProperty(current, propPath, value);
				value = current;
			}

			await game.settings.set(moduleId, settingKey, value);
		}

		activateListeners ($html) {
			super.activateListeners($html);
			$html.find(`[name="btn-fix-all"]`).on("click", this._onClick_pFixAll.bind(this));
			$html.find(`[name="btn-fix"]`).on("click", this._onClick_pFixSetting.bind(this));
		}

		async _onClick_pFixAll () {
			try {
				const cnt = this.#lastData.settings.filter(it => !it.isExpected).length;
				for (let ix = 0; ix < this.#lastData.settings.length; ++ix) {
					const setting = this.#lastData.settings[ix];
					if (setting.isExpected) continue;
					await this._pFixSetting({ix});
					await this.render();
					game.settings.sheet.render();
				}
				ui.notifications.info(`${cnt} setting${cnt === 1 ? "" : "s"} updated!`);
				await this.close({force: true});
			} catch (e) {
				console.log(e);
				ui.notifications.error(`Failed to update setting! ${VeCt.STR_SEE_CONSOLE}`);
			}
		}

		async _onClick_pFixSetting (evt) {
			const ix = Number(evt.currentTarget.getAttribute("data-setting-ix"));

			try {
				await this._pFixSetting({ix});
				ui.notifications.info("Setting updated!");
				await this.render();
				game.settings.sheet.render();
			} catch (e) {
				console.log(e);
				ui.notifications.error(`Failed to update setting! ${VeCt.STR_SEE_CONSOLE}`);
			}
		}

		_updateObject (evt, formData) { /* No-op */ }
	};

	/* -------------------------------------------- */

	static handleInit () {
		game.settings.registerMenu(
			SharedConsts.MODULE_ID,
			"menuConfigureDependencies",
			{
				name: "PLUTAA.Configure Dependencies",
				hint: "Check and configure settings for module dependencies.",
				label: "Configure",
				icon: "fas fa-fw fa-cogs",
				type: this._MenuSettingsPrompt,
				restricted: false,
			},
		);

		game.settings.register(
			SharedConsts.MODULE_ID,
			"isNotifyOnLoad",
			{
				name: "PLUTAA.Show Config on Load",
				hint: "Display the configuration dialogue on load, if incompatible module settings are detected.",
				default: true,
				type: Boolean,
				scope: "client",
				config: true,
				restricted: false,
			},
		);
	}

	/* -------------------------------------------- */

	static handleReady () {
		this._handleReady_doPostCompatibilityNotification();
	}

	static _handleReady_doPostCompatibilityNotification () {
		if (!game.settings.get(SharedConsts.MODULE_ID, "isNotifyOnLoad")) return;

		const settings = SettingsManager._getSettingsData();

		if (settings.every(it => it.isExpected)) return;

		const app = new this._MenuSettingsPrompt();
		app.render(true);
	}
}

class Api {
	static handleReady () { game.modules.get(SharedConsts.MODULE_ID).api = this; }

	static pGetExpandedAddonData (opts) { return DataManager.api_pGetExpandedAddonData(opts); }
}

class Main {
	static _HAS_FAILED = false;

	static handleInit () {
		if (this._HAS_FAILED) return;
		try {
			this._handleInit();
		} catch (e) {
			this._onError(e);
		}
	}

	static _handleInit () {
		SettingsManager.handleInit();
	}

	static handleReady () {
		if (this._HAS_FAILED) return;
		try {
			this._handleReady();
		} catch (e) {
			this._onError(e);
		}
	}

	static _handleReady () {
		Api.handleReady();
		SettingsManager.handleReady();
		console.log(...Util.LGT, `Initialized.`);
	}

	static _onError (e) {
		this._HAS_FAILED = true;
		setTimeout(() => { throw e; });
		if (ui.notifications?.error) ui.notifications.error(`Failed to initialize ${SharedConsts.MODULE_TITLE}! ${VeCt.STR_SEE_CONSOLE}`);
	}
}

Hooks.on("init", Main.handleInit.bind(Main));
Hooks.on("ready", Main.handleReady.bind(Main));
