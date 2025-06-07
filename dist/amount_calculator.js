"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeAMMMaxTradeAmount = computeAMMMaxTradeAmount;
exports.computeAMMTradeAmountByMargin = computeAMMTradeAmountByMargin;
exports.computeLimitOrderMaxTradeAmount = computeLimitOrderMaxTradeAmount;
exports.computeAMMInverseVWAP = computeAMMInverseVWAP;
exports.computeAMMAmountWithPrice = computeAMMAmountWithPrice;
exports.computeAMMOpenAmountWithPrice = computeAMMOpenAmountWithPrice;
exports.computeAMMCloseAndOpenAmountWithPrice = computeAMMCloseAndOpenAmountWithPrice;
/*
  Some peripheral tools to calculate trading amounts

  If you don't need these tools, you can remove this file to reduce the package size.
*/
const computation_1 = require("./computation");
const types_1 = require("./types");
const amm_1 = require("./amm");
const types_2 = require("./types");
const constants_1 = require("./constants");
const utils_1 = require("./utils");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const order_1 = require("./order");
// max amount when a trader uses market-order with targetLeverage, 0 means don't automatically deposit / withdraw
// the returned amount is the trader's perspective
function computeAMMMaxTradeAmount(p, perpetualIndex, trader, walletBalance, isTraderBuy, targetLeverage) {
    const normalizeWalletBalance = (0, utils_1.normalizeBigNumberish)(walletBalance);
    // if AMM is unsafe, return 0
    const ammContext = (0, amm_1.initAMMTradingContext)(p, perpetualIndex);
    if (!(0, amm_1.isAMMSafe)(ammContext, ammContext.openSlippageFactor)) {
        if (isTraderBuy && ammContext.position1.lt(constants_1._0)) {
            return constants_1._0;
        }
        if (!isTraderBuy && ammContext.position1.gt(constants_1._0)) {
            return constants_1._0;
        }
    }
    // guess = (marginBalance + walletBalance) * lev / index - position
    const traderDetails = (0, computation_1.computeAccount)(p, perpetualIndex, trader);
    let guess;
    if (targetLeverage > 0) {
        guess = traderDetails.accountComputed.marginBalance.plus(normalizeWalletBalance);
        guess = guess.times(new bignumber_js_1.default(targetLeverage)).div(ammContext.index);
    }
    else {
        guess = traderDetails.accountComputed.marginBalance.div(ammContext.index);
    }
    if (!isTraderBuy) {
        guess = guess.negated();
    }
    guess = guess.minus(trader.positionAmount);
    // search
    function checkTrading(a) {
        if (a.isZero()) {
            return true;
        }
        if (!isTraderBuy) {
            a = a.negated();
        }
        try {
            const result = (0, computation_1.computeAMMTrade)(p, perpetualIndex, trader, a, (0, utils_1.encodeTargetLeverage)(targetLeverage));
            if (!result.tradeIsSafe || result.adjustCollateral.gt(normalizeWalletBalance)) {
                return false;
            }
            return true;
        }
        catch (e) {
            // typically means a is too large
            return false;
        }
    }
    let maxAmount = (0, utils_1.searchMaxAmount)(checkTrading, guess.abs());
    if (!isTraderBuy) {
        maxAmount = maxAmount.negated();
    }
    return maxAmount;
}
// get amount according to a given (price(amount) * amount) when using market-order with USE_TARGET_LEVERAGE
// the returned amount is the trader's perspective
function computeAMMTradeAmountByMargin(p, perpetualIndex, deltaMargin) {
    const normalizeDeltaMargin = (0, utils_1.normalizeBigNumberish)(deltaMargin);
    // if AMM is unsafe, return 0
    const ammContext = (0, amm_1.initAMMTradingContext)(p, perpetualIndex);
    if (!(0, amm_1.isAMMSafe)(ammContext, ammContext.openSlippageFactor)) {
        if (normalizeDeltaMargin.lt(constants_1._0) && ammContext.position1.lt(constants_1._0)) {
            return constants_1._0;
        }
        if (normalizeDeltaMargin.gt(constants_1._0) && ammContext.position1.gt(constants_1._0)) {
            return constants_1._0;
        }
    }
    // shortcut for 0
    if (normalizeDeltaMargin.isZero()) {
        return constants_1._0;
    }
    // guess = deltaMargin / index
    const guess = normalizeDeltaMargin.div(ammContext.index).negated();
    let isTraderBuy = true;
    if (guess.lt(constants_1._0)) {
        isTraderBuy = false;
    }
    // search
    function checkTrading(a) {
        if (a.isZero()) {
            return true;
        }
        if (!isTraderBuy) {
            a = a.negated();
        }
        try {
            const res = (0, computation_1.computeAMMPrice)(p, perpetualIndex, a);
            return res.deltaAMMMargin.abs().lte(normalizeDeltaMargin.abs());
        }
        catch (e) {
            // typically means a is too large
            return false;
        }
    }
    let maxAmount = (0, utils_1.searchMaxAmount)(checkTrading, guess.abs());
    if (!isTraderBuy) {
        maxAmount = maxAmount.negated();
    }
    return maxAmount;
}
// max amount when a trader uses limit-order with USE_TARGET_LEVERAGE
// the returned amount is the trader's perspective
function computeLimitOrderMaxTradeAmount(context, walletBalance, orders, symbol, limitPrice, isTraderBuy, targetLeverage) {
    const normalizeWalletBalance = (0, utils_1.normalizeBigNumberish)(walletBalance);
    const normalizeLimitPrice = (0, utils_1.normalizeBigNumberish)(limitPrice);
    const normalizeTargetLeverage = (0, utils_1.normalizeBigNumberish)(targetLeverage);
    // get available margin other than current perpetual
    const symbol2Orders = (0, order_1.splitOrderPerpetual)(orders);
    let available = normalizeWalletBalance;
    symbol2Orders.forEach((otherMarketOrders, otherMarketSymbol) => {
        if (otherMarketSymbol === symbol) {
            return;
        }
        const otherMarketContext = context.get(otherMarketSymbol);
        if (!otherMarketContext) {
            throw new types_1.InvalidArgumentError(`unknown symbol ${otherMarketSymbol}`);
        }
        available = (0, order_1.orderPerpetualAvailable)(otherMarketContext.pool, otherMarketContext.perpetualIndex, otherMarketContext.account, available, otherMarketOrders);
    });
    // current perpetual
    const currentMarketContext = context.get(symbol);
    if (!currentMarketContext) {
        throw new types_1.InvalidArgumentError(`unknown symbol ${symbol}`);
    }
    const perpetual = currentMarketContext.pool.perpetuals.get(currentMarketContext.perpetualIndex);
    if (!perpetual) {
        throw new types_1.InvalidArgumentError(`perpetual ${currentMarketContext.perpetualIndex} not found in the pool`);
    }
    const oldOpenInterest = perpetual.openInterest;
    const trader = currentMarketContext.account;
    const currentPerpetualOrders = symbol2Orders.get(symbol) || []; // probably the 1st order
    const openInterestLimit = (0, computation_1.computePerpetualOpenInterestLimit)(currentMarketContext.pool, currentMarketContext.perpetualIndex);
    // guess = available * lev / index - position
    if (normalizeTargetLeverage.isZero()) {
        throw new types_1.InvalidArgumentError('target leverage = 0');
    }
    const traderDetails = (0, computation_1.computeAccount)(currentMarketContext.pool, currentMarketContext.perpetualIndex, trader);
    let guess = available.times(normalizeTargetLeverage).div(perpetual.markPrice);
    if (!isTraderBuy) {
        guess = guess.negated();
    }
    guess = guess.minus(trader.positionAmount);
    // state after executing pre-orders
    const { preOrders, postOrders } = (0, order_1.splitOrdersByLimitPrice)(currentPerpetualOrders, normalizeLimitPrice, isTraderBuy);
    const preState = (0, order_1.orderSideAvailable)(currentMarketContext.pool, currentMarketContext.perpetualIndex, traderDetails.accountComputed.marginBalance, trader.positionAmount, available, preOrders);
    // search
    function checkTrading(a) {
        if (a.isZero()) {
            return true;
        }
        if (!isTraderBuy) {
            a = a.negated();
        }
        const targetLeverage = normalizeTargetLeverage;
        let newOrderState = (0, order_1.orderSideAvailable)(currentMarketContext.pool, currentMarketContext.perpetualIndex, preState.remainMargin, preState.remainPosition, preState.remainWalletBalance, [{ symbol, limitPrice: normalizeLimitPrice, amount: a, targetLeverage }]);
        let postState = (0, order_1.orderSideAvailable)(currentMarketContext.pool, currentMarketContext.perpetualIndex, newOrderState.remainMargin, newOrderState.remainPosition, newOrderState.remainWalletBalance, postOrders);
        if (postState.remainWalletBalance.lt(constants_1._0)) {
            // a is too large
            return false;
        }
        const newOpenInterest = (0, computation_1.computeAMMOpenInterest)(currentMarketContext.pool, currentMarketContext.perpetualIndex, trader, a);
        if (newOpenInterest.gt(oldOpenInterest) && newOpenInterest.gt(openInterestLimit)) {
            // a is too large
            return false;
        }
        return true;
    }
    let maxAmount = (0, utils_1.searchMaxAmount)(checkTrading, guess.abs());
    if (!isTraderBuy) {
        maxAmount = maxAmount.negated();
    }
    return maxAmount;
}
// the inverse function of VWAP of AMM pricing function
// call computeAMMPoolMargin before this function
// the returned amount(= pos2 - pos1) is the AMM's perspective
// make sure ammSafe before this function
function computeAMMInverseVWAP(context, price, beta, isAMMBuy) {
    const previousMa1MinusMa2 = context.deltaMargin.negated();
    const previousAmount = context.deltaPosition;
    /*
    A = P_i^2 β;
    B = -2 P_i M + 2 A N1 + 2 M price;
    C = -2 M (previousMa1MinusMa2 - previousAmount price);
    sols = (-B ± sqrt(B^2 - 4 A C)) / (2 A);
    */
    const a = context.index.times(context.index).times(beta);
    let denominator = a.times(constants_1._2);
    if (denominator.isZero()) {
        throw Error(`bad perpetual parameter beta ${beta.toFixed()} or index ${context.index}.`);
    }
    let b = context.index.times(context.poolMargin).negated();
    b = b.plus(a.times(context.position1));
    b = b.plus(context.poolMargin.times(price));
    b = b.times(constants_1._2);
    const c = previousMa1MinusMa2
        .minus(previousAmount.times(price))
        .times(context.poolMargin)
        .times(constants_1._2)
        .negated();
    const beforeSqrt = a
        .times(c)
        .times(4)
        .negated()
        .plus(b.times(b));
    if (beforeSqrt.lt(constants_1._0)) {
        throw new types_1.InvalidArgumentError(`computeAMMInverseVWAP: impossible price. ` +
            `index = ${context.index.toFixed()}, price = ${price.toFixed()}, ` +
            `M = ${context.poolMargin.toFixed()}, position1 = ${context.position1.toFixed()}, ` +
            `previousMa1MinusMa2 = ${previousMa1MinusMa2.toFixed()}, previousAmount = ${previousAmount.toFixed()}`);
    }
    let numerator = (0, utils_1.sqrt)(beforeSqrt);
    if (!isAMMBuy) {
        numerator = numerator.negated();
    }
    numerator = numerator.minus(b);
    const amount = numerator.div(denominator);
    return amount.dp(constants_1.DECIMALS, bignumber_js_1.default.ROUND_DOWN);
}
// the returned amount is the trader's perspective
function computeAMMAmountWithPrice(p, perpetualIndex, isTraderBuy, limitPrice) {
    const perpetual = p.perpetuals.get(perpetualIndex);
    if (!perpetual) {
        throw new types_1.InvalidArgumentError(`perpetual ${perpetualIndex} not found in the pool`);
    }
    let normalizedLimitPrice = (0, utils_1.normalizeBigNumberish)(limitPrice);
    // get amount
    const isAMMBuy = !isTraderBuy;
    let context = (0, amm_1.initAMMTradingContext)(p, perpetualIndex);
    if (context.position1.lte(constants_1._0) && !isAMMBuy) {
        return computeAMMOpenAmountWithPrice(context, normalizedLimitPrice, isAMMBuy).negated();
    }
    else if (context.position1.lt(constants_1._0) && isAMMBuy) {
        //                         ^^ == 0 is another story
        return computeAMMCloseAndOpenAmountWithPrice(context, normalizedLimitPrice, isAMMBuy).negated();
    }
    else if (context.position1.gte(constants_1._0) && isAMMBuy) {
        return computeAMMOpenAmountWithPrice(context, normalizedLimitPrice, isAMMBuy).negated();
    }
    else if (context.position1.gt(constants_1._0) && !isAMMBuy) {
        //                         ^^ == 0 is another story
        return computeAMMCloseAndOpenAmountWithPrice(context, normalizedLimitPrice, isAMMBuy).negated();
    }
    throw new types_1.InvalidArgumentError('bug: unknown trading direction');
}
// spread and fees are ignored. add them after calling this function
// the returned amount is the AMM's perspective
function computeAMMOpenAmountWithPrice(context, limitPrice, isAMMBuy) {
    if ((isAMMBuy && context.position1.lt(constants_1._0)) /* short buy */ ||
        (!isAMMBuy && context.position1.gt(constants_1._0)) /* long sell */) {
        throw new types_1.InvalidArgumentError(`this is not opening. pos1: ${context.position1} isBuy: ${isAMMBuy}`);
    }
    // case 1: unsafe open
    if (!(0, amm_1.isAMMSafe)(context, context.openSlippageFactor)) {
        return constants_1._0;
    }
    context = (0, amm_1.computeAMMPoolMargin)(context, context.openSlippageFactor);
    // case 2: limit by spread
    if (context.bestAskBidPrice === null) {
        context.bestAskBidPrice = (0, amm_1.computeBestAskBidPriceIfSafe)(context, context.openSlippageFactor, isAMMBuy);
    }
    if (isAMMBuy) {
        if (limitPrice.gt(context.bestAskBidPrice)) {
            return constants_1._0;
        }
    }
    else {
        if (limitPrice.lt(context.bestAskBidPrice)) {
            return constants_1._0;
        }
    }
    // case 3: limit by safePos
    let safePos2;
    if (isAMMBuy) {
        safePos2 = (0, amm_1.computeAMMSafeLongPositionAmount)(context, context.openSlippageFactor);
        if (safePos2.lt(context.position1)) {
            return constants_1._0;
        }
    }
    else {
        safePos2 = (0, amm_1.computeAMMSafeShortPositionAmount)(context, context.openSlippageFactor);
        if (safePos2.gt(context.position1)) {
            return constants_1._0;
        }
    }
    const maxAmount = safePos2.minus(context.position1);
    const safePos2Context = (0, amm_1.computeAMMInternalOpen)(context, maxAmount);
    if (!maxAmount.eq(safePos2Context.deltaPosition.minus(context.deltaPosition))) {
        throw new types_2.BugError('open positions failed');
    }
    const safePos2Price = safePos2Context.deltaMargin.div(safePos2Context.deltaPosition).abs();
    if ((isAMMBuy && safePos2Price.gte(limitPrice)) /* long open. trader sell */ ||
        (!isAMMBuy && safePos2Price.lte(limitPrice)) /* short open. trader buy */) {
        return maxAmount;
    }
    // case 3: inverse function of price function
    const amount = computeAMMInverseVWAP(context, limitPrice, context.openSlippageFactor, isAMMBuy);
    if ((isAMMBuy && amount.gt(constants_1._0)) /* long open success */ || (!isAMMBuy && amount.lt(constants_1._0)) /* short open success */) {
        return amount;
    }
    // invalid open. only close is possible
    return constants_1._0;
}
// spread and fees are ignored. add them after calling this function
// the returned amount is the AMM's perspective
function computeAMMCloseAndOpenAmountWithPrice(context, limitPrice, isAMMBuy) {
    if (!context.deltaMargin.isZero() || !context.deltaPosition.isZero()) {
        throw new types_1.InvalidArgumentError('partial close is not supported');
    }
    if (context.position1.isZero()) {
        throw new types_1.InvalidArgumentError('close from 0 is not supported');
    }
    // case 1: limit by α
    const ammSafe = (0, amm_1.isAMMSafe)(context, context.closeSlippageFactor);
    if (ammSafe) {
        context = (0, amm_1.computeAMMPoolMargin)(context, context.closeSlippageFactor);
        context.bestAskBidPrice = (0, amm_1.computeBestAskBidPriceIfSafe)(context, context.closeSlippageFactor, isAMMBuy);
    }
    else {
        context.bestAskBidPrice = (0, amm_1.computeBestAskBidPriceIfUnsafe)(context);
    }
    if (isAMMBuy) {
        if (limitPrice.gt(context.bestAskBidPrice)) {
            return constants_1._0;
        }
    }
    else {
        if (limitPrice.lt(context.bestAskBidPrice)) {
            return constants_1._0;
        }
    }
    // case 2: limit by δ
    let discount = context.maxClosePriceDiscount;
    if (context.position1.gt(constants_1._0)) {
        discount = discount.negated();
    }
    const discountLimitPrice = constants_1._1.plus(discount).times(context.index);
    if (isAMMBuy) {
        if (limitPrice.gt(discountLimitPrice)) {
            return constants_1._0;
        }
    }
    else {
        if (limitPrice.lt(discountLimitPrice)) {
            return constants_1._0;
        }
    }
    // case 3: if close all (amm position = 0), check the price
    const zeroContext = (0, amm_1.computeAMMInternalClose)(context, context.position1.negated());
    if (zeroContext.deltaPosition.isZero()) {
        throw new types_2.BugError('close to zero failed');
    }
    const zeroPrice = zeroContext.deltaMargin.div(zeroContext.deltaPosition).abs();
    if ((isAMMBuy && zeroPrice.gte(limitPrice)) /* short close */ ||
        (!isAMMBuy && zeroPrice.lte(limitPrice)) /* long close */) {
        // close all
        context = zeroContext;
    }
    else if (!ammSafe) {
        // case 4: unsafe close, but price not matched
        return constants_1._0;
    }
    else {
        // case 5: close by price
        const amount = computeAMMInverseVWAP(context, limitPrice, context.closeSlippageFactor, isAMMBuy);
        if ((isAMMBuy && amount.gt(constants_1._0)) /* short close success */ ||
            (!isAMMBuy && amount.lt(constants_1._0)) /* long close success */) {
            context = (0, amm_1.computeAMMInternalClose)(context, amount);
        }
        else {
            // invalid close. only open is possible
        }
    }
    // case 6: open positions
    if ((isAMMBuy && context.position1.gte(constants_1._0)) /* cross 0 after short close */ ||
        (!isAMMBuy && context.position1.lte(constants_1._0)) /* cross 0 after long close */) {
        const openAmount = computeAMMOpenAmountWithPrice(context, limitPrice, isAMMBuy);
        return context.deltaPosition.plus(openAmount);
    }
    return context.deltaPosition;
}
//# sourceMappingURL=amount_calculator.js.map