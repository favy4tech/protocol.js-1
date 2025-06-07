"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.perpetualTrade = perpetualTrade;
exports.perpetualDeposit = perpetualDeposit;
exports.perpetualWithdraw = perpetualWithdraw;
exports.brokerDeposit = brokerDeposit;
exports.brokerWithdraw = brokerWithdraw;
exports.perpetualClear = perpetualClear;
exports.perpetualSettle = perpetualSettle;
exports.addLiquidity = addLiquidity;
exports.removeLiquidity = removeLiquidity;
exports.donateInsuranceFund = donateInsuranceFund;
exports.takerOverOperator = takerOverOperator;
exports.transferOperator = transferOperator;
exports.claimMiningReward = claimMiningReward;
exports.setTargetLeverage = setTargetLeverage;
const constants_1 = require("./constants");
const utils_1 = require("./utils");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const address_1 = require("@ethersproject/address");
function perpetualTrade(liquidityPool_1, perpetualIndex_1, trader_1, tradeAmount_1, limitPrice_1, deadline_1, referrer_1, flag_1) {
    return __awaiter(this, arguments, void 0, function* (liquidityPool, perpetualIndex, trader, tradeAmount, // +1.23 means buy, -1.23 means sell
    limitPrice, deadline, referrer, flag, overrides = {}) {
        (0, address_1.getAddress)(trader);
        (0, address_1.getAddress)(referrer);
        const largeAmount = (0, utils_1.normalizeBigNumberish)(tradeAmount)
            .shiftedBy(constants_1.DECIMALS)
            .dp(0, bignumber_js_1.default.ROUND_DOWN);
        const largeLimitPrice = (0, utils_1.normalizeBigNumberish)(limitPrice)
            .shiftedBy(constants_1.DECIMALS)
            .dp(0, bignumber_js_1.default.ROUND_DOWN);
        return yield liquidityPool.trade(perpetualIndex, trader, largeAmount.toFixed(), largeLimitPrice.toFixed(), deadline, referrer, flag, overrides);
    });
}
function perpetualDeposit(liquidityPool_1, perpetualIndex_1, trader_1, collateralAmount_1) {
    return __awaiter(this, arguments, void 0, function* (liquidityPool, perpetualIndex, trader, collateralAmount, // should be a decimal number (ie: 1.234)
    overrides = {}) {
        (0, address_1.getAddress)(trader);
        const largeAmount = (0, utils_1.normalizeBigNumberish)(collateralAmount)
            .shiftedBy(constants_1.DECIMALS)
            .dp(0, bignumber_js_1.default.ROUND_DOWN);
        return yield liquidityPool.deposit(perpetualIndex, trader, largeAmount.toFixed(), overrides);
    });
}
function perpetualWithdraw(liquidityPool_1, perpetualIndex_1, trader_1, collateralAmount_1) {
    return __awaiter(this, arguments, void 0, function* (liquidityPool, perpetualIndex, trader, collateralAmount, // should be a decimal number (ie: 1.234)
    overrides = {}) {
        const largeAmount = (0, utils_1.normalizeBigNumberish)(collateralAmount)
            .shiftedBy(constants_1.DECIMALS)
            .dp(0, bignumber_js_1.default.ROUND_DOWN);
        return yield liquidityPool.withdraw(perpetualIndex, trader, largeAmount.toFixed(), overrides);
    });
}
function brokerDeposit(broker_1, tokenAmount_1) {
    return __awaiter(this, arguments, void 0, function* (broker, tokenAmount, // should be a decimal number (ie: 1.234)
    overrides = {}) {
        const largeAmount = (0, utils_1.normalizeBigNumberish)(tokenAmount)
            .shiftedBy(constants_1.DECIMALS)
            .dp(0, bignumber_js_1.default.ROUND_DOWN);
        overrides.value = largeAmount.toFixed();
        return yield broker.deposit(overrides);
    });
}
function brokerWithdraw(broker_1, tokenAmount_1) {
    return __awaiter(this, arguments, void 0, function* (broker, tokenAmount, // should be a decimal number (ie: 1.234)
    overrides = {}) {
        const largeAmount = (0, utils_1.normalizeBigNumberish)(tokenAmount)
            .shiftedBy(constants_1.DECIMALS)
            .dp(0, bignumber_js_1.default.ROUND_DOWN);
        return yield broker.withdraw(largeAmount.toFixed(), overrides);
    });
}
function perpetualClear(liquidityPool_1, perpetualIndex_1) {
    return __awaiter(this, arguments, void 0, function* (liquidityPool, perpetualIndex, overrides = {}) {
        return yield liquidityPool.clear(perpetualIndex, overrides);
    });
}
function perpetualSettle(liquidityPool_1, perpetualIndex_1, trader_1) {
    return __awaiter(this, arguments, void 0, function* (liquidityPool, perpetualIndex, trader, overrides = {}) {
        (0, address_1.getAddress)(trader);
        return yield liquidityPool.settle(perpetualIndex, trader, overrides);
    });
}
function addLiquidity(liquidityPool_1, collateralAmount_1) {
    return __awaiter(this, arguments, void 0, function* (liquidityPool, collateralAmount, // should be a decimal number (ie: 1.234)
    overrides = {}) {
        const largeAmount = (0, utils_1.normalizeBigNumberish)(collateralAmount)
            .shiftedBy(constants_1.DECIMALS)
            .dp(0, bignumber_js_1.default.ROUND_DOWN);
        return yield liquidityPool.addLiquidity(largeAmount.toFixed(), overrides);
    });
}
function removeLiquidity(liquidityPool_1, shareToRemove_1, cashToReturn_1) {
    return __awaiter(this, arguments, void 0, function* (liquidityPool, shareToRemove, // should be a decimal number (ie: 1.234)
    cashToReturn, // should be a decimal number (ie: 1.234)
    overrides = {}) {
        const largeShareToRemove = (0, utils_1.normalizeBigNumberish)(shareToRemove)
            .shiftedBy(constants_1.DECIMALS)
            .dp(0, bignumber_js_1.default.ROUND_DOWN);
        const largeCashToReturn = (0, utils_1.normalizeBigNumberish)(cashToReturn)
            .shiftedBy(constants_1.DECIMALS)
            .dp(0, bignumber_js_1.default.ROUND_DOWN);
        return yield liquidityPool.removeLiquidity(largeShareToRemove.toFixed(), largeCashToReturn.toFixed(), overrides);
    });
}
function donateInsuranceFund(liquidityPool_1, collateralAmount_1) {
    return __awaiter(this, arguments, void 0, function* (liquidityPool, collateralAmount, // should be a decimal number (ie: 1.234)
    overrides = {}) {
        const largeAmount = (0, utils_1.normalizeBigNumberish)(collateralAmount)
            .shiftedBy(constants_1.DECIMALS)
            .dp(0, bignumber_js_1.default.ROUND_DOWN);
        return yield liquidityPool.donateInsuranceFund(largeAmount.toFixed(), overrides);
    });
}
function takerOverOperator(liquidityPool_1) {
    return __awaiter(this, arguments, void 0, function* (liquidityPool, overrides = {}) {
        return yield liquidityPool.claimOperator(overrides);
    });
}
function transferOperator(liquidityPool_1, targetAddress_1) {
    return __awaiter(this, arguments, void 0, function* (liquidityPool, targetAddress, overrides = {}) {
        (0, address_1.getAddress)(targetAddress);
        return yield liquidityPool.transferOperator(targetAddress, overrides);
    });
}
function claimMiningReward(mining_1) {
    return __awaiter(this, arguments, void 0, function* (mining, overrides = {}) {
        return yield mining.getReward(overrides);
    });
}
function setTargetLeverage(liquidityPool_1, perpetualIndex_1, trader_1, targetLeverage_1) {
    return __awaiter(this, arguments, void 0, function* (liquidityPool, perpetualIndex, trader, targetLeverage, overrides = {}) {
        (0, address_1.getAddress)(trader);
        const leverage = (0, utils_1.normalizeBigNumberish)(targetLeverage)
            .shiftedBy(constants_1.DECIMALS)
            .dp(0, bignumber_js_1.default.ROUND_DOWN);
        return yield liquidityPool.setTargetLeverage(perpetualIndex, trader, leverage.toFixed(), overrides);
    });
}
//# sourceMappingURL=transact.js.map