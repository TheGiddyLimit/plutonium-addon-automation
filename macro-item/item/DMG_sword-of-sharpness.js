/** From "MidiQOL Sample Items" compendium */
async function macro (args) {
	const version = "10.0.10";
	try {
		if (args[0].diceRoll === 20 && args[0].itemData.system.attunement !== 1) {
			const d20 = await (new Roll("1d20")).roll().total;
			if (d20 === 20) {
				ChatMessage.create({content: "Sword of Sharpness severed a limb"});
			}
		}
	} catch (err) {
		console.error(`${args[0].itemData.name} - Sword of Sharpness ${version}`, err);
		return {};
	}
}
