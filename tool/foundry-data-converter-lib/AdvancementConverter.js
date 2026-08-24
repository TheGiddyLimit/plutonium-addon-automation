import {ConverterUtil} from "./ConverterUtil.js";

export class AdvancementConverter {
	static getAdvancement ({json}) {
		const out = Object.values(json.system?.advancement || {})
			.filter(advancement => advancement.type === "ScaleValue")
			.map(advancement => {
				const cpy = ConverterUtil.getWithoutFalsy(advancement);
				delete cpy._id;
				return cpy;
			});

		if (out.length) return out;
		return undefined;
	}
}
