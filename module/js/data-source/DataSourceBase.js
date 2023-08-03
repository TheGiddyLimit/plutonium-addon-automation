/** @abstract */
export class DataSourceBase {
	static async pGetExpandedAddonData (
		{
			propJson,
			path,
			fnMatch,
			ent,
			propBase,
			base = undefined,
			isSilent = false,
		},
	) { throw new Error("Unimplemented!"); }
}
