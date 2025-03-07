export class ImgConverter {
	static _IGNORED_IMGS = new Set([
		"icons/svg/mystery-man.svg",
		"icons/svg/item-bag.svg",
		"icons/svg/aura.svg",
	]);

	static getImg (json) {
		if (json.img && !this._IGNORED_IMGS.has(json.img)) return json.img;
		return null;
	}
}
