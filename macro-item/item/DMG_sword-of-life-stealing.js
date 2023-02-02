/** From "MidiQOL Sample Items" compendium */
async function macro (args) {
	const version = "10.0.10";
	try {
		if (args[0].diceRoll === 20 && args[0].itemData.system.attunement !== 1 && args[0].otherDamageTotal > (actor.system.attributes.hp.temp ?? 0)) {
			ChatMessage.create({content: `${args[0].item.name} steals ${args[0].otherDamageTotal} HP`});
			await actor.update({"system.attributes.hp.temp": args[0].otherDamageTotal});
		}
	} catch (err) {
		console.error(`${args[0].itemData.name} - Sword of Life Stealing ${version}`, err);
	}
}
