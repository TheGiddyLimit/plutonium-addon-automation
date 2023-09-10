async function macro (args) {
	const token = (await fromUuid(args[1].tokenUuid));

	const base = args[1].efData.flags.dae.itemData;
	const system = mergeObject(
		base.system,
		{
			activation: {
				cost: 1,
				type: "bonus",
			},
			components: {
				concentration: false,
				vocal: true,
			},
			damage: {parts: [["2d6", "healing"]]},
			duration: {units: "inst"},
			level: args[1].efData.flags["midi-qol"].castData.castLevel,
			preparation: {
				mode: "atwill",
				prepared: true,
			},
			range: {
				units: "ft",
				value: 30,
			},
			target: {
				type: "creature",
				value: 1,
			},
		},
		{overwrite: true},
	);

	if (args[0] === "on") {
		await warpgate.mutate(token,
			{
				embedded: {
					Item: {
						"Invoke Vitality": {
							type: "spell",
							img: base.img,
							system: system,
						},
					},
				},
			},
			{},
			{name: "plutonium-addon-automation-aura-of-vitality"},
		);
	} else if (args[0] === "off") {
		await warpgate.revert(token, "plutonium-addon-automation-aura-of-vitality");
	}
}
