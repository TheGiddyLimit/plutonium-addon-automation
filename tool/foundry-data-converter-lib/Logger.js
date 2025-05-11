export class Logger {
	constructor (
		{
			suppressedTypes = null,
			isRetain = false,
			isSkipPost = false,
		} = {},
	) {
		this._suppressedTypes = suppressedTypes;
		this._isRetain = isRetain;
		this._isSkipPost = isSkipPost;

		this._retained = [];
	}

	/* -------------------------------------------- */

	_post ({msg, type, fn, tag}) {
		if (this._suppressedTypes?.has(type)) return;
		if (this._isRetain) this._retained.push(`[${tag}] ${msg}`);
		if (!this._isSkipPost) fn(msg);
	}

	log (msg, type) { return this._post({msg, type, fn: console.log, tag: "L"}); }
	warn (msg, type) { return this._post({msg, type, fn: console.warn, tag: "W"}); }
	error (msg, type) { return this._post({msg, type, fn: console.error, tag: "E"}); }

	/* -------------------------------------------- */

	getRetained () { return [...this._retained]; }
	clearRetained () { this._retained = []; }
}
