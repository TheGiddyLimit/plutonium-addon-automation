import {MiscUtil} from "./MiscUtil.js";

/**
 * Based on:
 *  - v13 `TextEditor._enrichContentLinks`
 *  - v13 `TextEditor._enrichEmbeds`
 */
export class HtmlConverterPostProcessor {
	static getPostProcessed (
		ipt,
		{
			name = null,
			uuid = null,
			foundryIdToSpellInfo = null,
			foundryIdToMonsterInfo = null,
			foundryIdToItemInfo = null,
			foundryIdToEmbedEntries = null,
		} = {},
	) {
		const iptClean = this._getPostProcessed_getCleanInput({
			nameSelf: name,
			uuidSelf: uuid,
			foundryIdToSpellInfo,
			foundryIdToMonsterInfo,
			foundryIdToItemInfo,
			foundryIdToEmbedEntries,
			ipt,
		});
		return this._getPostProcessed_getOutput({
			nameSelf: name,
			uuidSelf: uuid,
			foundryIdToSpellInfo,
			foundryIdToMonsterInfo,
			foundryIdToItemInfo,
			iptClean,
		});
	}

	/* -------------------------------------------- */

	static _RE_EMBEDS_SPLIT = /\s*(@Embed\[[^\]]+](?:{[^}]+})?)\s*/gi;
	static _RE_EMBEDS = /^@Embed\[(?<config>[^\]]+)](?:{(?<name>[^}]+)})?$/gi;

	static _getMappedEmbedParts (
		{
			nameSelf,
			uuidSelf,
			foundryIdToSpellInfo,
			foundryIdToMonsterInfo,
			foundryIdToItemInfo,
			foundryIdToEmbedEntries,
			strs,
		},
	) {
		return strs
			.map(str => {
				const m = this._RE_EMBEDS.exec(str);
				if (!m) return str;

				const {config, name} = m.groups;
				const uuid = this._getEmbedUuid(config);

				const embedEntries = foundryIdToEmbedEntries?.[uuid];
				if (embedEntries) return MiscUtil.copyFast(embedEntries);

				return this._getUuidReplacement({
					foundryIdToSpellInfo,
					foundryIdToMonsterInfo,
					foundryIdToItemInfo,
					foundryIdToEmbedEntries,
					uuid,
					name,
					nameSelf,
					uuidSelf,
					fullMatch: m[0],
					isTagUnknown: true,
				});
			});
	}

	/** Split `@Embed`s into own strings (i.e., de-inline) */
	static _getPostProcessed_getCleanInput (
		{
			nameSelf,
			uuidSelf,
			foundryIdToSpellInfo,
			foundryIdToMonsterInfo,
			foundryIdToItemInfo,
			foundryIdToEmbedEntries,
			ipt,
		},
	) {
		if (ipt == null) return ipt;

		if (typeof ipt === "string") {
			const spl = ipt.split(this._RE_EMBEDS_SPLIT);
			if (spl.length > 1) {
				return this._getMappedEmbedParts({
					nameSelf,
					uuidSelf,
					foundryIdToSpellInfo,
					foundryIdToMonsterInfo,
					foundryIdToItemInfo,
					foundryIdToEmbedEntries,
					strs: spl,
				});
			}
			return ipt;
		}

		ipt = MiscUtil.copyFast(ipt);

		return MiscUtil.getWalker().walk(ipt, {
			object: obj => {
				Object.entries(obj)
					.forEach(([k, v]) => {
						if (v == null) return;
						if (typeof v !== "string") return;
						const spl = v.split(this._RE_EMBEDS_SPLIT);
						if (spl.length <= 1) return;
						obj[k] = this._getMappedEmbedParts({
							nameSelf,
							uuidSelf,
							foundryIdToSpellInfo,
							foundryIdToMonsterInfo,
							foundryIdToItemInfo,
							foundryIdToEmbedEntries,
							strs: spl,
						});
					});
				return obj;
			},
			array: arr => {
				for (let i = 0; i < arr.length; ++i) {
					const v = arr[i];
					if (v == null) continue;
					if (typeof v !== "string") continue;
					const spl = v.split(this._RE_EMBEDS_SPLIT);
					if (spl.length <= 1) continue;
					arr.splice(
						i,
						1,
						...this._getMappedEmbedParts({
							nameSelf,
							uuidSelf,
							foundryIdToSpellInfo,
							foundryIdToMonsterInfo,
							foundryIdToItemInfo,
							foundryIdToEmbedEntries,
							strs: spl,
						}),
					);
				}
				return arr;
			},
		});
	}

	/* -------------------------------------------- */

	static _DOCUMENT_TYPES_EXTENDED = [
		"Actor",
		"Cards",
		"Item",
		"Scene",
		"JournalEntry",
		"Macro",
		"RollTable",
		"PlaylistSound",
		"Compendium",

		"UUID",
	];

	static _RE_CONTENT_LINKS = new RegExp(`@(?<type>${this._DOCUMENT_TYPES_EXTENDED.join("|")})\\[(?<target>[^#\\]]+)(?:#(?<hash>[^\\]]+))?](?:{(?<name>[^}]+)})?`, "g");

	static _getPostProcessed_getOutput (
		{
			nameSelf,
			uuidSelf,
			foundryIdToSpellInfo,
			foundryIdToMonsterInfo,
			foundryIdToItemInfo,
			iptClean,
		},
	) {
		return MiscUtil.getWalker().walk(iptClean, {
			string: str => {
				return str
					.replace(this._RE_CONTENT_LINKS, (...m) => {
						const {type, target, name} = m.at(-1);
						if (type !== "UUID") throw new Error(`Unhandled content link "${m[0]}"`);

						return this._getUuidReplacement({
							foundryIdToSpellInfo,
							foundryIdToMonsterInfo,
							foundryIdToItemInfo,
							uuid: target,
							name,
							nameSelf,
							uuidSelf,
							fullMatch: m[0],
						});
					})
					.replace(/{@i (?<nested>{@[a-zA-Z]+ [^}]+})}/g, (...m) => {
						return m.at(-1).nested;
					})
				;
			},
		});
	}

	static _getUuidReplacement (
		{
			foundryIdToSpellInfo,
			foundryIdToMonsterInfo,
			foundryIdToItemInfo,
			uuid,
			name,
			nameSelf,
			uuidSelf,
			fullMatch,
			isTagUnknown = false,
		},
	) {
		const entityInfo = foundryIdToSpellInfo?.[uuid]
			|| foundryIdToMonsterInfo?.[uuid]
			|| foundryIdToItemInfo?.[uuid];

		if (!entityInfo) {
			// Short-circuit for self-references
			// Note that this is imperfect -- in e.g. effects which are applied to other
			//   actors, we would ideally want to link back to the applying entity.
			//   As we do not have stable IDs, "name" is the best we can manage.
			if (uuid === uuidSelf) return nameSelf;

			if (isTagUnknown) {
				const out = `{@unknown ${name}}`;
				console.warn(`Generated "@unknown" tag from "${fullMatch}" -> "${out}"`);
				return out;
			}

			if (name) return name;
			throw new Error(`Unhandled content link "${fullMatch}"`);
		}

		return entityInfo.getAsVetoolsTag({name});
	}

	/**
	 * Stripped-down version of v13 `TextEditor._parseEmbedConfig`.
	 */
	static _getEmbedUuid (raw) {
		const config = {values: []};
		for (const part of raw.match(/(?:[^\s"]+|"[^"]*")+/g)) {
			if (!part) continue;
			const [key, value] = part.split("=");
			if (value === undefined) config.values.push(key.replace(/(^"|"$)/g, ""));
			else config[key] = value.replace(/(^"|"$)/g, "");
		}

		if (config.uuid) return config.uuid;
		return config.values[0];
	}
}
