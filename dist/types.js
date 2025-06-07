"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradeFlag = exports.PerpetualState = exports.InvalidArgumentError = exports.OpenInterestExceededError = exports.BugError = exports.InsufficientWalletForOrdersError = exports.InsufficientLiquidityError = void 0;
/**
 * Indicates that the AMM has insufficient reserves for a desired amount.
 * I.e. if the trade completes, the margin of the AMM will be not enough.
 */
class InsufficientLiquidityError extends Error {
    constructor(message) {
        super();
        this.isInsufficientLiquidityError = true;
        this.name = message;
    }
}
exports.InsufficientLiquidityError = InsufficientLiquidityError;
/**
 * Indicates that the trader's wallet balance is insufficient to cover the costs of all orders.
 */
class InsufficientWalletForOrdersError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InsufficientWalletForOrdersError';
    }
}
exports.InsufficientWalletForOrdersError = InsufficientWalletForOrdersError;
/**
 * Indicates that calling convention error or bugs happened.
 */
class BugError extends Error {
    constructor(message) {
        super();
        this.name = message;
    }
}
exports.BugError = BugError;
/**
 * Indicates that if the trade completes, the open interest will exceed the limit.
 */
class OpenInterestExceededError extends Error {
    constructor(message, newOpenInterest, limit) {
        super();
        this.isOpenInterestExceededError = true;
        this.name = message;
        this.newOpenInterest = newOpenInterest;
        this.limit = limit;
    }
}
exports.OpenInterestExceededError = OpenInterestExceededError;
/**
 * Invalid argument or the query condition is impossible.
 */
class InvalidArgumentError extends Error {
    constructor(message) {
        super();
        this.name = message;
    }
}
exports.InvalidArgumentError = InvalidArgumentError;
var PerpetualState;
(function (PerpetualState) {
    PerpetualState[PerpetualState["INVALID"] = 0] = "INVALID";
    PerpetualState[PerpetualState["INITIALIZING"] = 1] = "INITIALIZING";
    PerpetualState[PerpetualState["NORMAL"] = 2] = "NORMAL";
    PerpetualState[PerpetualState["EMERGENCY"] = 3] = "EMERGENCY";
    PerpetualState[PerpetualState["CLEARED"] = 4] = "CLEARED";
})(PerpetualState || (exports.PerpetualState = PerpetualState = {}));
var TradeFlag;
(function (TradeFlag) {
    TradeFlag[TradeFlag["MASK_CLOSE_ONLY"] = 2147483648] = "MASK_CLOSE_ONLY";
    TradeFlag[TradeFlag["MASK_MARKET_ORDER"] = 1073741824] = "MASK_MARKET_ORDER";
    TradeFlag[TradeFlag["MASK_STOP_LOSS_ORDER"] = 536870912] = "MASK_STOP_LOSS_ORDER";
    TradeFlag[TradeFlag["MASK_TAKE_PROFIT_ORDER"] = 268435456] = "MASK_TAKE_PROFIT_ORDER";
    TradeFlag[TradeFlag["MASK_USE_TARGET_LEVERAGE"] = 134217728] = "MASK_USE_TARGET_LEVERAGE";
})(TradeFlag || (exports.TradeFlag = TradeFlag = {}));
//# sourceMappingURL=types.js.map