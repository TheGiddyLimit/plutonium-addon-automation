import path from "path";
import {SharedConsts} from "../module/shared/SharedConsts.js";

export const DIST_SUBDIR_MODULE = `./dist/${SharedConsts.MODULE_ID}`;
export const DIR_ITEM_MACROS = "macro-item";
export const BUNDLE_MODULE_PATH = "./js/Bundle.js";
export const BUNDLE_PATH = path.join(DIST_SUBDIR_MODULE, BUNDLE_MODULE_PATH);
