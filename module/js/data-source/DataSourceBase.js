/** @abstract */
export class DataSourceBase {
	static async pGetExpandedAddonData (
		{
			propJson,
			path,
			fnMatch,
			ent,
			isSilent = false,
		},
	) { throw new Error("Unimplemented!"); }
}
