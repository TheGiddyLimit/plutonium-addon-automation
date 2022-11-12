async function macro (args) {
	const token = await fromUuid(args[1].tokenUuid);
	const tactor = token.actor;

	const divine_fury = tactor.items.getName("Divine Fury");
	const fanatical_focus = tactor.items.getName("Fanatical Focus");

	if (args[0] === "on") {
		if (divine_fury) { await MidiQOL.completeItemUse(divine_fury); }
		if (fanatical_focus) { await MidiQOL.completeItemUse(fanatical_focus); }
	} else if (args[0] === "each") {
		if (divine_fury) { await MidiQOL.completeItemUse(divine_fury); }
	}
}
