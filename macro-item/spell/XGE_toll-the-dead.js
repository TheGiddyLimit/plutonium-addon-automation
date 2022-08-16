async function macro (args) {
	// From "MidiQOL Sample Items" compendium
	if (args[0].macroPass !== "preDamageRoll") return;

	const target = await fromUuid(args[0].targetUuids[0]);
	const needsD12 = target.actor.data.data.attributes.hp.value < target.actor.data.data.attributes.hp.max;
	const theItem = await fromUuid(args[0].uuid);
	let formula = theItem.data.data.damage.parts[0][0];
	if (needsD12) formula = formula.replace("d8", "d12");
	else formula = formula.replace("d12", "d8");
	theItem.data.data.damage.parts[0][0] = formula;
}
