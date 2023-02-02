/** From "MidiQOL Sample Items" compendium */
async function macro (args) {
	const version = "10.0.10";
	try {
		for (let damageItem of this.damageList) {
			if (damageItem.newHP <= 25 && args[0].failedSaveUuids.includes(damageItem.tokenUuid)) {
				damageItem.hpDamage += damageItem.newHP;
				damageItem.newHP = 0;
			}
		}
	} catch (err) {
		console.error(`${args[0].itemData.name} - Devil's Glaive ${version}`, err);
	}
}
