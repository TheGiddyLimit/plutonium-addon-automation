/** From "MidiQOL Sample Items" compendium */
async function macro (args) {
	const lastArgs = args[args.length - 1];
	const token = await fromUuid(lastArgs.tokenUuid);
	if (args[0] === "on") {
		const updates = {};
		updates["flags.midi-qol.gogglesSave"] = {
			"sight.visionMode": token._source.sight.visionMode,
			"sight.range": token._source.sight.range,
			"detectionModes": token._source.detectionModes,
		};
		let newRange = 60;
		if (token.sight.visionMode === "darkvision") newRange += 60;
		updates["sight.visionMode"] = "lightAmplification";
		updates["sight.range"] = newRange;
		const detectionModes = token.detectionModes;
		detectionModes.push({id: "lightAmplification", enabled: true, range: newRange});
		return token.update(updates);
	} else if (args[0] === "off") {
		const updates = token.flags["midi-qol"].gogglesSave;
		updates["flags.midi-qol.-=gogglesSave"] = null;
		return token.update(updates);
	}
}
