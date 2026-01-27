/**
 * tslib compatibility shim
 * Provides both default export and named exports to fix module interop issues
 * where dependencies expect `import tslib from "tslib"` but get named exports
 * 
 * This shim is aliased to "tslib" in webpack.config.js to intercept all tslib imports
 */

// Import all tslib helpers as named exports
export {
  __extends,
  __assign,
  __rest,
  __decorate,
  __param,
  __metadata,
  __awaiter,
  __generator,
  __createBinding,
  __exportStar,
  __values,
  __read,
  __spread,
  __spreadArrays,
  __spreadArray,
  __await,
  __asyncGenerator,
  __asyncDelegator,
  __asyncValues,
  __makeTemplateObject,
  __importStar,
  __importDefault,
  __classPrivateFieldGet,
  __classPrivateFieldSet,
  __classPrivateFieldIn,
} from '../../node_modules/tslib/tslib.es6.js';

// Also provide as default export for dependencies expecting default import
import * as tslib from '../../node_modules/tslib/tslib.es6.js';
export default tslib;
