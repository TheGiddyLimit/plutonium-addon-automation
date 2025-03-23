export class NameIdGenerator {
	constructor ({name}) {
		this._nameSlug = name
			.slugify({strict: true})
			.replace(/-+/g, "-")
			.replace(/-([a-zA-Z0-9])/g, (...m) => `${m[1].toUpperCase()}`)
			.replace(/-/, "")
			.slice(0, 16);
		this._ixId = 0;
	}

	getNextId () {
		if (!this._ixId) {
			this._ixId++;
			return this._nameSlug;
		}

		const ptId = `${this._ixId++}`;

		return this._nameSlug.slice(0, 16 - ptId.length) + ptId;
	}
}
