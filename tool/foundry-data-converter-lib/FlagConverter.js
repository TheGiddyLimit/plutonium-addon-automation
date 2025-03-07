import {ConverterUtil} from "./ConverterUtil.js";

export class FlagConverter {
	static _handleUnknownFlags ({outFlags, k, flags}) {
		console.warn(`Unknown flag property "${k}"--copying as-is`);
		outFlags[k] = flags;
	}

	static getFlags ({json, name, source, scriptHeader = null, getMacroFilename = null}) {
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
						break;
						// endregion

					// region Handle these
					case "midi-qol": {
						const outSub = {};
						ConverterUtil.copyTruthy(outSub, flags);
						if (Object.keys(outSub).length) outFlags[k] = outSub;
						break;
					}
					case "midiProperties": {
						const outSub = {};
						ConverterUtil.copyTruthy(outSub, flags);
						if (Object.keys(outSub).length) outFlags[k] = outSub;
						break;
					}
					case "enhanced-terrain-layer": {
						const outSub = {};
						ConverterUtil.copyTruthy(outSub, flags);
						if (Object.keys(outSub).length) outFlags[k] = outSub;
						break;
					}
					case "dnd5e": {
						if (!flags.riders) throw new Error(`Unhandled flag format in "${k}"!`);
						if ((new Set(Object.keys(flags)).symmetricDifference(new Set(["riders"]))).size) throw new Error(`Unhandled flags in "${k}"!`);
						if ((new Set(Object.keys(flags.riders)).symmetricDifference(new Set(["activity", "effect"]))).size) throw new Error(`Unhandled flags in "${k}.riders"!`);
						if (flags.riders.activity?.length) throw new Error(`Unhandled "activity" flags in "${k}.riders"!`);
						if (flags.riders.effect?.length) throw new Error(`Unhandled "effect" flags in "${k}.riders"!`);
						break;
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
							if (!Object.keys(cpyFlags).length) break;

							// We do not expect "dae" flags to have any other properties
							this._handleUnknownFlags({outFlags, k, flags: cpyFlags});
						}

						break;
					}
					// endregion

					default:
						this._handleUnknownFlags({outFlags, k, flags});
				}
			});

		const out = {};
		if (Object.keys(outFlags).length) out.flags = outFlags;
		if (outScript != null) out.script = outScript;
		return out;
	}
}
