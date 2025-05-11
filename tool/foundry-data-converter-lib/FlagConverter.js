import {ConverterUtil} from "./ConverterUtil.js";

export class FlagConverter {
	static _handleUnknownFlags ({logger, outFlags, k, flags}) {
		logger.warn(`Unknown flag property "${k}"--copying as-is`, "flags.unknown");
		outFlags[k] = flags;
	}

	static getFlags ({logger, json, name, source, scriptHeader = null, getMacroFilename = null}) {
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
						return;
						// endregion

					// region Handle these
					case "midi-qol": {
						const outSub = {};
						ConverterUtil.copyTruthy(outSub, flags);
						if (Object.keys(outSub).length) outFlags[k] = outSub;
						return;
					}
					case "midiProperties": {
						const outSub = {};
						ConverterUtil.copyTruthy(outSub, flags);
						if (Object.keys(outSub).length) outFlags[k] = outSub;
						return;
					}
					case "enhanced-terrain-layer": {
						const outSub = {};
						ConverterUtil.copyTruthy(outSub, flags);
						if (Object.keys(outSub).length) outFlags[k] = outSub;
						return;
					}
					case "dnd5e": {
						if (!Object.keys(flags).length) return;
						if (!flags.riders) throw new Error(`Unhandled flag format in "${k}" in document "${json.name}"!`);
						if ((new Set(Object.keys(flags)).symmetricDifference(new Set(["riders"]))).size) throw new Error(`Unhandled flags in "${k}" in document "${json.name}"!`);

						flags.riders.activity ||= [];
						flags.riders.effect ||= [];

						if ((new Set(Object.keys(flags.riders)).symmetricDifference(new Set(["activity", "effect"]))).size) throw new Error(`Unhandled flags in "${k}.riders" in document "${json.name}"!`);
						if (flags.riders.activity?.length) delete flags.riders.activity; // Re-populated by importer
						if (flags.riders.effect?.length) throw new Error(`Unhandled "effect" flags in "${k}.riders" in document "${json.name}"!`);
						return;
					}
					// endregion

					// region Special handling for item macros
					case "itemacro":
					case "dae": {
						if (getMacroFilename == null) throw new Error(`"getMacroFilename" must be provided for macro conversion!`);
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

						if (k === "dae") {
							const cpyFlags = {...flags};
							delete cpyFlags.macro;
							if (!Object.keys(cpyFlags).length) return;

							// We do not expect "dae" flags to have any other properties
							this._handleUnknownFlags({logger, outFlags, k, flags: cpyFlags});
						}

						return;
					}
					// endregion

					default:
						this._handleUnknownFlags({logger, outFlags, k, flags});
				}
			});

		const out = {};
		if (Object.keys(outFlags).length) out.flags = outFlags;
		if (outScript != null) out.script = outScript;
		return out;
	}
}
