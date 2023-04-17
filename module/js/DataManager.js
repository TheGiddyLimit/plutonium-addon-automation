import {DataSourceSelf} from "./data-source/DataSourceSelf.js";
import {DataSourceIntegrations} from "./data-source/DataSourceIntegrations.js";

export class DataManager {
	static async api_pGetExpandedAddonData (
		{
			propJson,
			path,
			fnMatch,
			ent,
			isSilent = false,
		},
	) {
		const dataSources = [
			DataSourceSelf,
			DataSourceIntegrations,
		];

		return dataSources.pSerialAwaitFirst(dataSource => dataSource.pGetExpandedAddonData({
			propJson,
			path,
			fnMatch,
			ent,
			isSilent,
		}));
	}
}
