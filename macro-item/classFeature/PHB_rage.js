async function macro (args) {
	const token = await fromUuid(args[1].tokenUuid);
	const tactor = token.actor;

	const barb = tactor.items.getName("Barbarian");
	const subclass = barb?.subclass;

	if (!subclass || !subclass?.hasMacro()) { return; }

	subclass.executeMacro(...args);
}
