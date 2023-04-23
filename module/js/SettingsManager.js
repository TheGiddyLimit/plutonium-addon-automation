import {SharedConsts} from "../shared/SharedConsts.js";
import {ModuleSettingConsts} from "./ModuleSettingConsts.js";
import {StartupHookMixin} from "./mixins/MixinStartupHooks.js";

/**
 * @mixes {StartupHookMixin}
 */
export class SettingsManager extends StartupHookMixin(class {}) {
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
			expectedValue: "itempri",
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

	static onHookInit () {
		game.settings.registerMenu(
			SharedConsts.MODULE_ID,
			ModuleSettingConsts.MENU_CONFIGURE_DEPENDENCIES,
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
			ModuleSettingConsts.IS_NOTIFY_ON_LOAD,
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

	static onHookReady () {
		this._onHookReady_doPostCompatibilityNotification();
	}

	static _onHookReady_doPostCompatibilityNotification () {
		if (!game.settings.get(SharedConsts.MODULE_ID, ModuleSettingConsts.IS_NOTIFY_ON_LOAD)) return;

		const settings = SettingsManager._getSettingsData();

		if (settings.every(it => it.isExpected)) return;

		const app = new this._MenuSettingsPrompt();
		app.render(true);
	}
}
