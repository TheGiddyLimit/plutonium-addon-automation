/**
 * Credit to D&D Beyond Importer (https://github.com/MrPrimate/ddb-importer)
 * See: `../../license/ddb-importer.md`
 */
async function macro (args) {
	const lastArg = args[args.length - 1];

	// macro vars
	const damageType = "fire";
	const freeSequence = "jb2a.particles.outward.greenyellow.01.05";
	const patreonPrimary = "jb2a.dagger.melee.fire.green";
	const patreonSecondary = "jb2a.chain_lightning.secondary.green";

	const baseAutoAnimation = {
		label: "WEAPON NAME",
		macro: {
			enable: false,
		},
		meleeSwitch: {
			sound: {
				enable: false,
			},
			options: {
				detect: "automatic",
				range: 2,
				returning: false,
				switchType: "on",
			},
		},
		menu: "melee",
		primary: {
			video: {
				dbSection: "melee",
				menuType: "weapon",
				animation: "shortsword",
				variant: "01",
				color: "white",
				enableCustom: false,
				customPath: "",
			},
			sound: {
				enable: false,
			},
			options: {
				contrast: 0,
				delay: 0,
				elevation: 1000,
				isWait: false,
				opacity: 1,
				playbackRate: 1,
				repeat: 1,
				repeatDelay: 250,
				saturate: 0,
				size: 1,
				tint: true,
				tintColor: "#09ce68",
				zIndex: 1,
			},
		},
		secondary: {
			enable: false,
		},
		source: {
			enable: false,
		},
		target: {
			enable: false,
		},
		isEnabled: true,
		isCustomized: true,
		fromAmmo: false,
		version: 5,
	};

	// sequencer caller for effects on target
	function sequencerEffect (target, origin = null) {
		if (game.modules.get("sequencer")?.active) {
			const secondary = Sequencer.Database.entryExists(patreonSecondary);
			if (secondary) {
				new Sequence()
					.effect()
					.atLocation(origin)
					.stretchTo(target)
					.file(patreonSecondary)
					.repeats(1, 200, 300)
					.randomizeMirrorY()
					.play();
			} else {
				const attackAnimation = Sequencer.Database.entryExists(patreonPrimary)
					? patreonPrimary
					: Sequencer.Database.entryExists(freeSequence)
						? freeSequence
						: undefined;
				if (attackAnimation) {
					new Sequence()
						.effect()
						.file(attackAnimation)
						.atLocation(target)
						.play();
				}
			}
		}
	}

	async function attackNearby (originToken, ignoreIds) {
		const potentialTargets = await MidiQOL.findNearby(null, originToken, 5).filter((tok) => !ignoreIds.includes(tok.actor?.id));
		if (potentialTargets.length === 0) return;
		const sourceItem = await fromUuid(lastArg.efData.flags.origin);
		const caster = sourceItem.parent;
		const casterToken = canvas.tokens.placeables.find((t) => t.actor?.uuid === caster.uuid);
		const targetContent = potentialTargets.map((t) => `<option value="${t.id}">${t.name}</option>`).join("");
		const content = `<div class="form-group"><label>Targets : </label><select name="secondaryTargetId"}>${targetContent}</select></div>`;

		new Dialog({
			title: "Green Flame Blade: Choose a secondary target to attack",
			content,
			buttons: {
				Choose: {
					label: "Choose",
					callback: async (html) => {
						const selectedId = html.find("[name=secondaryTargetId]")[0].value;
						const targetToken = canvas.tokens.get(selectedId);
						const sourceItem = await fromUuid(lastArg.efData.flags.origin);
						const mod = caster.system.abilities[sourceItem.abilityMod].mod;
						const damageRoll = await new CONFIG.Dice.DamageRoll(`${lastArg.efData.flags.cantripDice - 1}d8[${damageType}] + ${mod}`).evaluate({async: true});
						if (game.dice3d) game.dice3d.showForRoll(damageRoll);
						const workflowItemData = duplicate(sourceItem);
						workflowItemData.effects = [];
						setProperty(workflowItemData, "flags.midi-qol", {});
						workflowItemData.system.target = {value: 1, units: "", type: "creature"};
						workflowItemData.system.range = {value: 5, long: null, units: "ft"};
						delete workflowItemData._id;
						workflowItemData.name = "Green Flame Blade: Secondary Damage";

						await new MidiQOL.DamageOnlyWorkflow(
							caster,
							casterToken,
							damageRoll.total,
							damageType,
							[targetToken],
							damageRoll,
							{
								flavor: `(${CONFIG.DND5E.damageTypes[damageType]})`,
								itemCardId: "new",
								itemData: workflowItemData,
								isCritical: false,
							},
						);
						sequencerEffect(targetToken, originToken);
					},
				},
				Cancel: {
					label: "Cancel",
				},
			},
		}).render(true);
	}

	function weaponAttack (caster, sourceItemData, origin, target) {
		const chosenWeapon = DAE.getFlag(caster, "greenFlameBladeChoice");
		const filteredWeapons = caster.items.filter((i) =>
			i.type === "weapon" && i.system.equipped
			&& i.system.activation.type === "action" && i.system.actionType === "mwak",
		);
		const weaponContent = filteredWeapons
			.map((w) => {
				const selected = chosenWeapon && chosenWeapon === w.id ? " selected" : "";
				return `<option value="${w.id}"${selected}>${w.name}</option>`;
			})
			.join("");

		const content = `<div class="form-group"><label>Weapons : </label><select name="weapons"}>${weaponContent}</select></div>`;
		new Dialog({
			title: "Green Flame Blade: Choose a weapon to attack with",
			content,
			buttons: {
				Ok: {
					label: "Ok",
					callback: async (html) => {
						const characterLevel = caster.type === "character" ? caster.system.details.level : caster.system.details.cr;
						const cantripDice = 1 + Math.floor((characterLevel + 1) / 6);
						const itemId = html.find("[name=weapons]")[0].value;
						const weaponItem = caster.getEmbeddedDocument("Item", itemId);
						DAE.setFlag(caster, "greenFlameBladeChoice", itemId);
						const weaponCopy = duplicate(weaponItem);
						delete weaponCopy._id;
						if (cantripDice > 0) {
							weaponCopy.system.damage.parts[0][0] += ` + ${cantripDice - 1}d8[${damageType}]`;
						}
						weaponCopy.name = `${weaponItem.name} [Green Flame Blade]`;
						weaponCopy.effects.push({
							changes: [{key: "macro.itemMacro", mode: 0, value: "", priority: "20"}],
							disabled: false,
							// duration: { turns: 0 },
							duration: {turns: 1},
							icon: sourceItemData.img,
							label: sourceItemData.name,
							name: sourceItemData.name,
							origin,
							transfer: false,
							flags: {targetUuid: target.uuid, casterId: caster.id, origin, cantripDice, damageType, dae: {specialDuration: ["1Action", "1Attack", "turnStartSource"], transfer: false}},
						});
						setProperty(weaponCopy, "flags.itemacro", duplicate(sourceItemData.flags.itemacro));
						setProperty(weaponCopy, "flags.midi-qol.effectActivation", false);
						if (game.modules.get("sequencer")?.active && Sequencer.Database.entryExists(patreonPrimary)) {
							const autoAnimationsAdjustments = duplicate(baseAutoAnimation);
							autoAnimationsAdjustments.primary.video.animation = weaponCopy.system.baseItem ? weaponCopy.system.baseItem : "shortsword";
							const autoanimations = hasProperty(weaponCopy, "flags.autoanimations")
								? mergeObject(getProperty(weaponCopy, "flags.autoanimations"), autoAnimationsAdjustments)
								: autoAnimationsAdjustments;
							setProperty(weaponCopy, "flags.autoanimations", autoanimations);
						}
						// eslint-disable-next-line new-cap
						const attackItem = new CONFIG.Item.documentClass(weaponCopy, {parent: caster});
						attackItem.prepareData();
						attackItem.prepareFinalAttributes();
						const options = {showFullCard: false, createWorkflow: true, configureDialog: true};
						await MidiQOL.completeItemUse(attackItem, {}, options);
					},
				},
				Cancel: {
					label: "Cancel",
				},
			},
		}).render(true);
	}

	if (args[0].tag === "OnUse") {
		if (lastArg.targets.length > 0) {
			// console.warn(lastArg);
			const casterData = await fromUuid(lastArg.actorUuid);
			const caster = casterData.actor ? casterData.actor : casterData;
			// console.warn({
			//	 caster, itemData: lastArg.itemData, uuid: lastArg.uuid, targets: lastArg.targets[0]
			// })
			weaponAttack(caster, lastArg.itemData, lastArg.uuid, lastArg.targets[0]);
		} else {
			ui.notifications.error("Green Flame Blade: No target selected: please select a target and try again.");
		}
	} else if (args[0] === "on") {
		const targetToken = canvas.tokens.get(lastArg.tokenId);
		const casterId = lastArg.efData.flags.casterId;
		console.log(`Checking ${targetToken.name} for nearby tokens for Green-Flame Blade from ${casterId}`);
		await attackNearby(targetToken, [casterId]);
	}
}
