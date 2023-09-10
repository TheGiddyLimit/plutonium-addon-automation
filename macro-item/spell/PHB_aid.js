async function macro (args) {
	const tactor = (await fromUuid(args[1].tokenUuid)).actor;

	const health = tactor.system.attributes.hp.value;
	const healthChange = eval(args[1].efData.changes[0].value); // eslint-disable-line no-eval

	if (args[0] === "on") {
		tactor.update({"system.attributes.hp.value": health + healthChange});
	} else if (args[0] === "off") {
		tactor.update({"system.attributes.hp.value": Math.max(health - healthChange, 0)});
	}
}
