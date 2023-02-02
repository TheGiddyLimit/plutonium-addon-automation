/** From "MidiQOL Sample Items" compendium */
async function macro (args) {
	const lastArgs = args[args.length - 1];
	const token = await fromUuid(lastArgs.tokenUuid);

	if (args[0] === "on") {
		const updates = {};
		updates["flags.midi-qol.bullseyeSave"] = {
			"light.angle": token._source.light.angle,
			"light.bright": token._source.light.bright,
			"light.dim": token._source.light.dim,
			"light.animation": token._source.light.animation,
			"light.alpha": token._source.light.alpha,
			"light.contrast": token._source.light.contrast,
			"light.color": token._source.light.color,
		};
		updates["light.angle"] = 60;
		updates["light.bright"] = 60;
		updates["light.dim"] = 120;
		updates["light.alpha"] = 0.1;
		updates["light.contrast"] = 0.5;
		updates["light.color"] = "#f8c377";
		return token.update(updates);
	} else if (args[0] === "off") {
		const updates = token.flags["midi-qol"].bullseyeSave;
		updates["flags.midi-qol.-=bullseyeSave"] = null;
		console.error("Updates ", updates);
		return token.update(updates);
	}
}
