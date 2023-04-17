import {DataSourceBase} from "./DataSourceBase.js";
import {Integrations} from "../integrations/Integrations.js";

export class DataSourceIntegrations extends DataSourceBase {
	static async pGetExpandedAddonData (
		{
			propJson,
			path,
			fnMatch,
			ent,
			isSilent = false,
		},
	) {
		return Integrations.pGetExpandedAddonData({
			propJson,
			path,
			fnMatch,
			ent,
			isSilent,
		});
	}
}
