import {SharedConsts} from "../shared/SharedConsts.js";

class Util {
	static LGT = [
		`%cPlutonium Addon: Data`,
		`color: #5494cc; font-weight: bold;`,
		`|`,
	];
}

class ModuleSettingConsts {
	static MENU_CONFIGURE_DEPENDENCIES = "menuConfigureDependencies";
	static IS_NOTIFY_ON_LOAD = "isNotifyOnLoad";
	static MENU_CONFIGURE_OPTIONAL_DEPENDENCIES = "menuConfigureOptionalDependencies";
	static OPTIONAL_DEPENDENCY_NOTIFICATION_CONFIG = "optionalDependencyNotificationConfig";
}

class DataManager {
	static #P_INDEX = null;

	static async api_pGetExpandedAddonData (
		{
			propJson,
			path,
			fnMatch,
		},
	) {
		const index = await (this.#P_INDEX = this.#P_INDEX || DataUtil.loadJSON(`${SharedConsts.MODULE_PATH}/data/_generated/index.json`));

		const ixFile = MiscUtil.get(index, propJson, ...path);
		if (ixFile == null) return null;

		const json = await DataUtil.loadJSON(`${SharedConsts.MODULE_PATH}/data/${index._file[ixFile]}`);

		const out = (json?.[propJson] || [])
			.find(it => fnMatch(it));
		if (!out) return null;

		return this._getFiltered(this._getPostProcessed(out));
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

			const convEffectData = convEffect.convertToActiveEffectData({
				includeAte: game.modules.get("ATL")?.active,
				includeTokenMagic: game.modules.get("tokenmagic")?.active,
			});

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

	static _getFiltered (out) {
		out = this._getFiltered_effects({out});
		return out;
	}

	static _getFiltered_effects ({out}) {
		if (!out.effects?.some(({requires}) => !!requires)) return out;

		out = foundry.utils.deepClone(out);

		out.effects = out.effects
			.filter(eff => {
				if (!eff.requires) return true;

				return Object.keys(eff.requires)
					.map(moduleId => {
						if (game.modules.get(moduleId)?.active) return true;
						OptionalDependenciesManager.doNotifyMissing(moduleId);
						return false;
					})
					// Avoid using `.every` directly, above, so that we run through all possible requirements for each effect
					.every(Boolean);
			});

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

	static handleInit () {
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

	static handleReady () {
		this._handleReady_doPostCompatibilityNotification();
	}

	static _handleReady_doPostCompatibilityNotification () {
		if (!game.settings.get(SharedConsts.MODULE_ID, ModuleSettingConsts.IS_NOTIFY_ON_LOAD)) return;

		const settings = SettingsManager._getSettingsData();

		if (settings.every(it => it.isExpected)) return;

		const app = new this._MenuSettingsPrompt();
		app.render(true);
	}
}

class OptionalDependenciesManager {
	static #P_INDEX = null;

	static async _pLoadIndex () {
		return (this.#P_INDEX = this.#P_INDEX || DataUtil.loadJSON(`${SharedConsts.MODULE_PATH}/data/_generated/optional-dependencies.json`));
	}

	/* -------------------------------------------- */

	static _MenuOptionalDependencyNotifications = class extends FormApplication {
		static get defaultOptions () {
			return foundry.utils.mergeObject(super.defaultOptions, {
				template: `${SharedConsts.MODULE_PATH}/template/MenuOptionalDependencyNotifications.hbs`,
			});
		}

		get title () {
			return `${SharedConsts.MODULE_TITLE} \u2013 ${game.i18n.localize("PLUTAA.Configure Notifications")}`;
		}

		async getData (opts) {
			const index = await OptionalDependenciesManager._pLoadIndex();

			const notifConfig = game.settings.get(SharedConsts.MODULE_ID, ModuleSettingConsts.OPTIONAL_DEPENDENCY_NOTIFICATION_CONFIG);

			const modules = Object.values(index)
				.sort((a, b) => SortUtil.ascSortLower(a.title, b.title))
				.map(meta => ({
					id: meta.name,
					title: meta.title,
					isChecked: !!notifConfig?.[meta.name],
				}));

			return {
				...(await super.getData(opts)),
				modules,
			};
		}

		_updateObject (evt, formData) {
			game.settings.set(
				SharedConsts.MODULE_ID,
				ModuleSettingConsts.OPTIONAL_DEPENDENCY_NOTIFICATION_CONFIG,
				Object.entries(formData)
					.filter(([, isHidden]) => isHidden)
					.mergeMap(([id, isHidden]) => ({[id]: isHidden})),
			);
		}
	};

	/* -------------------------------------------- */

	static handleInit () {
		game.settings.registerMenu(
			SharedConsts.MODULE_ID,
			ModuleSettingConsts.MENU_CONFIGURE_OPTIONAL_DEPENDENCIES,
			{
				name: "PLUTAA.Configure Notifications",
				hint: "Check and configure settings for notifications which are shown during import.",
				label: "Configure",
				icon: "fas fa-fw fa-cogs",
				type: this._MenuOptionalDependencyNotifications,
				restricted: true,
			},
		);

		game.settings.register(
			SharedConsts.MODULE_ID,
			ModuleSettingConsts.OPTIONAL_DEPENDENCY_NOTIFICATION_CONFIG,
			{
				default: {},
				type: Object,
				scope: "world",
				config: false,
			},
		);
	}

	/* -------------------------------------------- */

	static handleReady () {
		$(document.body)
			.on("click", `[data-paa-module-ids]`, async evt => {
				const msgId = evt.currentTarget.closest(`[data-message-id]`).getAttribute("data-message-id");

				const moduleIds = evt.currentTarget.getAttribute("data-paa-module-ids").split(",");

				const cpySetting = foundry.utils.deepClone(
					game.settings.get(SharedConsts.MODULE_ID, ModuleSettingConsts.OPTIONAL_DEPENDENCY_NOTIFICATION_CONFIG),
				);
				moduleIds.forEach(moduleId => cpySetting[moduleId] = true);
				await game.settings.set(SharedConsts.MODULE_ID, ModuleSettingConsts.OPTIONAL_DEPENDENCY_NOTIFICATION_CONFIG, cpySetting);

				const index = await OptionalDependenciesManager._pLoadIndex();

				ui.notifications.info(`Notifications for the modules ${moduleIds.map(moduleId => index[moduleId].title).joinConjunct(" and ")} are now hidden! You can change this later via the ${SharedConsts.MODULE_TITLE} module settings.`);

				await game.messages.get(msgId)?.delete();
			});
	}

	/* -------------------------------------------- */

	static #NOTIFIED_MISSING = new Set();
	static #NOTIFY_QUEUE = [];

	static doNotifyMissing (moduleId) {
		if (this.#NOTIFIED_MISSING.has(moduleId)) return;
		if (game.settings.get(SharedConsts.MODULE_ID, ModuleSettingConsts.OPTIONAL_DEPENDENCY_NOTIFICATION_CONFIG)?.[moduleId]) return;
		this.#NOTIFIED_MISSING.add(moduleId);

		this.#NOTIFY_QUEUE.push(moduleId);

		this._pDoNotifyAllMissingDebounced();
	}

	static async _pDoNotifyAllMissing () {
		const moduleIds = this.#NOTIFY_QUEUE.splice(0, this.#NOTIFY_QUEUE.length);
		if (!moduleIds.length) return;

		const index = await OptionalDependenciesManager._pLoadIndex();

		const modules = moduleIds
			.map(id => index[id])
			.sort(([a, b]) => SortUtil.ascSortLower(a.title, b.title));

		const ptIntro = `Some automations could not be applied during import, as the following module${modules.length === 1 ? "" : "s"} ${modules.length === 1 ? "is" : "are"} not installed and active`;

		ui.notifications.warn(`${ptIntro}: ${modules.map(it => `"${it.title}"`).join(", ")}`);

		const ptsModulesHtml = modules
			.map(({name, title}) => {
				return `<li>
					<div class="ve-flex-v-center mb-1 w-100">
						<span class="bold mr-1">${title}</span>
						<span class="ve-muted ve-small">(${name})</span>
					</div>

					<div class="ve-small"><a href="https://foundryvtt.com/packages/${name}" rel="noopener noreferrer">https://foundryvtt.com/packages/${name}</a></div>
				</li>`;
			});

		await ChatMessage.create({
			content: `<div>
				<p>${ptIntro}:</p>
				<ul>${ptsModulesHtml.join("")}</ul>
				<p class="secret-gm__block">
					<button type="button" data-paa-module-ids="${moduleIds.join(",")}">Don't Show Again</button>
				</p>
			</div>`,
			user: game.userId,
			type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
			whisper: [game.userId],
		});
	}

	static _pDoNotifyAllMissingDebounced = foundry.utils.debounce(this._pDoNotifyAllMissing.bind(this), 1000);
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
		OptionalDependenciesManager.handleInit();
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
		OptionalDependenciesManager.handleReady();
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
