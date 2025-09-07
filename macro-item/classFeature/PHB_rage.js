async function macro (args) {
	if (!args) return;

	const token = await fromUuid(args[1].tokenUuid);
	const tactor = token.actor;

	const barb = tactor.items.getName("Barbarian");
	const subclass = barb?.subclass;

	if (!subclass?.flags?.dae?.macro?.command) return;

	await Object.getPrototypeOf(async function () {}).constructor("args", subclass.flags.dae.macro.command)(args);
}
