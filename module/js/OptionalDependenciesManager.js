import {SharedConsts} from "../shared/SharedConsts.js";
import {ModuleSettingConsts} from "./ModuleSettingConsts.js";
import {StartupHookMixin} from "./mixins/MixinStartupHooks.js";

const {HandlebarsApplicationMixin, ApplicationV2} = foundry.applications.api;

/**
 * @mixes {StartupHookMixin}
 */
export class OptionalDependenciesManager extends StartupHookMixin(class {}) {
	static #P_INDEX = null;

	static async _pLoadIndex () {
		return (this.#P_INDEX = this.#P_INDEX || DataUtil.loadJSON(`${SharedConsts.MODULE_PATH}/data/_generated/optional-dependencies.json`));
	}

	/* -------------------------------------------- */

	static _MenuOptionalDependencyNotifications = class extends HandlebarsApplicationMixin(ApplicationV2) {
		constructor () {
			super({
				tag: "form",
				classes: ["ve-app"],
				window: {
					title: `${SharedConsts.MODULE_TITLE} \u2013 ${game.i18n.localize("PLUTAA.Configure Notifications")}`,
				},
				form: {
					handler: OptionalDependenciesManager._MenuOptionalDependencyNotifications.#onSubmit,
					closeOnSubmit: true,
				},
			});
		}

		static PARTS = {
			content: {
				template: `${SharedConsts.MODULE_PATH}/template/MenuOptionalDependencyNotifications.hbs`,
				root: true,
			},
		};

		async _prepareContext (opts) {
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
				...(await super._prepareContext(opts)),
				modules,
			};
		}

		static async #onSubmit (evt, form, formData) {
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

	static _onHookInit () {
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

	static _onHookReady () {
		veE(document.body)
			.vee.onn("click", async evt => {
				if (!evt.target.matches(`[data-paa-module-ids]`)) return;

				const msgId = evt.target.closest(`[data-message-id]`).getAttribute("data-message-id");

				const moduleIds = evt.target.getAttribute("data-paa-module-ids").split(",");

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
			.sort((a, b) => SortUtil.ascSortLower(a.title, b.title));

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
