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
			actorType = undefined,
			isSilent = false,
		},
	) { throw new Error("Unimplemented!"); }
}
