import {SharedConsts} from "../shared/SharedConsts.js";
import {ModuleSettingConsts} from "./ModuleSettingConsts.js";
import {StartupHookMixin} from "./mixins/MixinStartupHooks.js";
import {Util} from "./Util.js";

/**
 * @mixes {StartupHookMixin}
 */
export class SettingsManager extends StartupHookMixin(class {}) {
	static _onHookInitDev () {
		game.settings.register(
			SharedConsts.MODULE_ID,
			ModuleSettingConsts.DEV_IS_DBG,
			{
				name: "PLUTAA.Developer: Enable Debugging",
				hint: "Enable additional debug logging.",
				default: false,
				type: Boolean,
				scope: "client",
				config: true,
				restricted: true,
			},
		);
	}

	/* -------------------------------------------- */

	static _MODULE_ID__MIDI_QOL = "midi-qol";
	static _MODULE_ID__TOKEN_ACTION_HUD = "token-action-hud";
	static _MODULE_ID__CHRIS_PREMADES = "chris-premades";

	static _SETTING_METAS = [
		{
			moduleId: this._MODULE_ID__TOKEN_ACTION_HUD,
			settingKey: "itemMacroReplace",
			expectedValue: "showOriginal",
		},

		// region chris-premades
		// Enable configuration, as the integration uses default values
		{moduleId: this._MODULE_ID__CHRIS_PREMADES, isGmOnly: true, settingKey: "permissionsConfigureItem", displaySettingName: "Medkit Configuration Permissions", expectedValue: 1},
		// endregion
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

				const settingId = `${moduleId}.${settingKey}`;
				const setting = game.settings.settings.get(settingId);
				if (!setting) {
					console.debug(...Util.LGT, `Setting "${settingId}" not found!`);
					return null;
				}

				let value = game.settings.get(moduleId, settingKey);
				if (propPath) value = foundry.utils.getProperty(value, propPath);

				return {
					moduleTitle: game.modules.get(moduleId).title,
					name: game.i18n.localize(displaySettingName || setting.name),
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

			const settingGroups = settings
				.reduce(
					(accum, setting) => {
						(accum[setting.moduleTitle] ||= []).push(setting);
						return accum;
					},
					{},
				);

			const out = {
				...(await super.getData(opts)),
				settings,
				settingGroups: Object.entries(settingGroups)
					.sort(([kA], [kB]) => SortUtil.ascSortLower(kA, kB))
					.map(([, v]) => v),
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
				for (const setting of this.#lastData.settings) {
					if (setting.isExpected) continue;
					await this._pFixSetting({ix: setting.ixSetting});
					await this.render();
					if (game.settings.sheet.rendered) game.settings.sheet.render();
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

	static _onHookInit () {
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

	static _onHookReady () {
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
