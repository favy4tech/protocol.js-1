"use strict";
/*
  Simulate the smart contract's computation.
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAMMTradingContext = initAMMTradingContext;
exports.initAMMTradingContextEagerEvaluation = initAMMTradingContextEagerEvaluation;
exports.computeAMMInternalTrade = computeAMMInternalTrade;
exports.computeBestAskBidPriceIfSafe = computeBestAskBidPriceIfSafe;
exports.computeBestAskBidPriceIfUnsafe = computeBestAskBidPriceIfUnsafe;
exports.computeBestAskBidPrice = computeBestAskBidPrice;
exports.computeAMMInternalClose = computeAMMInternalClose;
exports.computeAMMInternalOpen = computeAMMInternalOpen;
exports.computeAMMPoolMargin = computeAMMPoolMargin;
exports.isAMMSafe = isAMMSafe;
exports.computeAMMSafeShortPositionAmount = computeAMMSafeShortPositionAmount;
exports.computeAMMSafeLongPositionAmount = computeAMMSafeLongPositionAmount;
exports.computeAMMSafeCondition1 = computeAMMSafeCondition1;
exports.computeAMMSafeCondition2 = computeAMMSafeCondition2;
exports.computeAMMSafeCondition3 = computeAMMSafeCondition3;
exports.computeBasePrice = computeBasePrice;
exports.computeDeltaMargin = computeDeltaMargin;
exports.computeFundingRate = computeFundingRate;
exports.computeAMMShareToMint = computeAMMShareToMint;
exports.computeAMMCashToReturn = computeAMMCashToReturn;
exports.computeMaxRemovableShare = computeMaxRemovableShare;
const bignumber_js_1 = require("bignumber.js");
const constants_1 = require("./constants");
const types_1 = require("./types");
const utils_1 = require("./utils");
const types_2 = require("./types");
function initAMMTradingContext(p, perpetualIndex) {
    if (perpetualIndex) {
        if (!p.perpetuals.get(perpetualIndex)) {
            throw new types_2.InvalidArgumentError(`perpetual ${perpetualIndex} not found in the pool`);
        }
    }
    let index = constants_1._0;
    let position1 = constants_1._0;
    let halfSpread = constants_1._0;
    let openSlippageFactor = constants_1._0;
    let closeSlippageFactor = constants_1._0;
    let fundingRateFactor = constants_1._0;
    let fundingRateLimit = constants_1._0;
    let maxClosePriceDiscount = constants_1._0;
    let ammMaxLeverage = constants_1._0;
    let otherIndex = [];
    let otherPosition = [];
    let otherOpenSlippageFactor = [];
    let otherAMMMaxLeverage = [];
    // split perpetuals into current perpetual and other perpetuals
    // M_c = ammCash - Σ accumulatedFunding * N
    let cash = p.poolCashBalance;
    p.perpetuals.forEach((perpetual, id) => {
        // only involve normal market
        if (perpetual.state !== types_1.PerpetualState.NORMAL) {
            return;
        }
        if (perpetual.indexPrice.lte(constants_1._0)) {
            throw new types_2.InvalidArgumentError('index price must be positive');
        }
        cash = cash.plus(perpetual.ammCashBalance);
        cash = cash.minus(perpetual.unitAccumulativeFunding.times(perpetual.ammPositionAmount));
        if (id === perpetualIndex) {
            index = perpetual.indexPrice;
            position1 = perpetual.ammPositionAmount;
            halfSpread = perpetual.halfSpread.value;
            openSlippageFactor = perpetual.openSlippageFactor.value;
            closeSlippageFactor = perpetual.closeSlippageFactor.value;
            fundingRateFactor = perpetual.fundingRateFactor.value;
            fundingRateLimit = perpetual.fundingRateLimit.value;
            maxClosePriceDiscount = perpetual.maxClosePriceDiscount.value;
            ammMaxLeverage = perpetual.ammMaxLeverage.value;
        }
        else {
            otherIndex.push(perpetual.indexPrice);
            otherPosition.push(perpetual.ammPositionAmount);
            otherOpenSlippageFactor.push(perpetual.openSlippageFactor.value);
            otherAMMMaxLeverage.push(perpetual.ammMaxLeverage.value);
        }
    });
    let ret = {
        index,
        position1,
        halfSpread,
        openSlippageFactor,
        closeSlippageFactor,
        fundingRateFactor,
        fundingRateLimit,
        maxClosePriceDiscount,
        ammMaxLeverage,
        otherIndex,
        otherPosition,
        otherOpenSlippageFactor,
        otherAMMMaxLeverage,
        cash,
        poolMargin: constants_1._0,
        deltaMargin: constants_1._0,
        deltaPosition: constants_1._0,
        bestAskBidPrice: null,
        valueWithoutCurrent: constants_1._0,
        squareValueWithoutCurrent: constants_1._0,
        positionMarginWithoutCurrent: constants_1._0
    };
    ret = initAMMTradingContextEagerEvaluation(ret);
    return ret;
}
function initAMMTradingContextEagerEvaluation(context) {
    let valueWithoutCurrent = constants_1._0;
    let squareValueWithoutCurrent = constants_1._0;
    let positionMarginWithoutCurrent = constants_1._0;
    for (let j = 0; j < context.otherIndex.length; j++) {
        // Σ_j (P_i N) where j ≠ id
        valueWithoutCurrent = valueWithoutCurrent.plus(context.otherIndex[j].times(context.otherPosition[j]));
        // Σ_j (β P_i^2 N^2) where j ≠ id
        squareValueWithoutCurrent = squareValueWithoutCurrent.plus(context.otherOpenSlippageFactor[j]
            .times(context.otherIndex[j])
            .times(context.otherIndex[j])
            .times(context.otherPosition[j])
            .times(context.otherPosition[j]));
        // Σ_j (P_i_j * | N_j | / λ_j) where j ≠ id
        positionMarginWithoutCurrent = positionMarginWithoutCurrent.plus(context.otherIndex[j].times(context.otherPosition[j].abs()).div(context.otherAMMMaxLeverage[j]));
    }
    // prevent margin balance < 0
    const marginBalanceWithCurrent = context.cash.plus(valueWithoutCurrent).plus(context.index.times(context.position1));
    if (marginBalanceWithCurrent.lt(constants_1._0)) {
        throw new types_2.InsufficientLiquidityError('AMM is emergency');
    }
    return Object.assign(Object.assign({}, context), { valueWithoutCurrent,
        squareValueWithoutCurrent,
        positionMarginWithoutCurrent });
}
// the amount is the AMM's perspective
function computeAMMInternalTrade(p, perpetualIndex, amount) {
    let context = initAMMTradingContext(p, perpetualIndex);
    const { close, open } = (0, utils_1.splitAmount)(context.position1, amount);
    if (close.isZero() && open.isZero()) {
        throw new types_2.BugError('AMM trade: trading amount = 0');
    }
    // trade
    if (!close.isZero()) {
        context = computeAMMInternalClose(context, close);
    }
    if (!open.isZero()) {
        context = computeAMMInternalOpen(context, open);
    }
    // spread. this is equivalent to:
    // * if amount > 0, trader sell. use min(P_avg, P_bestBid)
    // * if amount < 0, trader buy. use max(P_avg, P_bestAsk)
    if (context.bestAskBidPrice === null) {
        throw new types_2.BugError('bestAskBidPrice is null');
    }
    const valueAtBestAskBidPrice = context.bestAskBidPrice.times(amount).negated();
    if (context.deltaMargin.lt(valueAtBestAskBidPrice)) {
        context.deltaMargin = valueAtBestAskBidPrice;
    }
    return context;
}
// get the price if ΔN -> 0. equal to lim_(ΔN -> 0) (computeDeltaMargin / (ΔN))
// call computeAMMPoolMargin before this function. make sure isAMMSafe before this function
// CAUTION: this function only implements P_{best} in the paper, it's not the real trading price if δ takes effect
function computeBestAskBidPriceIfSafe(context, beta, isAMMBuy) {
    if (context.poolMargin.lte(constants_1._0)) {
        throw new types_2.InsufficientLiquidityError(`AMM poolMargin <= 0`);
    }
    // P_i (1 - β / M * P_i * N1)
    let price = context.position1
        .times(context.index)
        .div(context.poolMargin)
        .times(beta);
    price = constants_1._1.minus(price).times(context.index);
    return appendSpread(context, price, isAMMBuy);
}
function computeBestAskBidPriceIfUnsafe(context) {
    return context.index;
}
function appendSpread(context, midPrice, isAMMBuy) {
    if (isAMMBuy) {
        // AMM buys, trader sells
        return midPrice.times(constants_1._1.minus(context.halfSpread)).dp(constants_1.DECIMALS);
    }
    else {
        // AMM sells, trader buys
        return midPrice.times(constants_1._1.plus(context.halfSpread)).dp(constants_1.DECIMALS);
    }
}
// get the price if ΔN -> 0. lim_(ΔN -> 0) (computeDeltaMargin / (ΔN))
// this function implements all possible situations include:
// * limit by α. this is P_{best} in the paper
// * limit by δ when close
// * amm unsafe
function computeBestAskBidPrice(p, perpetualIndex, isAMMBuy) {
    let context = initAMMTradingContext(p, perpetualIndex);
    let isAMMClosing = false;
    let beta = context.openSlippageFactor;
    if ((context.position1.gt(constants_1._0) && !isAMMBuy) || (context.position1.lt(constants_1._0) && isAMMBuy)) {
        isAMMClosing = true;
        beta = context.closeSlippageFactor;
    }
    // unsafe
    if (!isAMMSafe(context, beta)) {
        if (!isAMMClosing) {
            throw new types_2.InsufficientLiquidityError(`AMM can not open position anymore: unsafe before trade`);
        }
        return computeBestAskBidPriceIfUnsafe(context);
    }
    // safe: limit by α
    context = computeAMMPoolMargin(context, beta);
    let price = computeBestAskBidPriceIfSafe(context, beta, isAMMBuy);
    if (isAMMClosing) {
        // limit by δ
        let discount = context.maxClosePriceDiscount;
        if (context.position1.gt(constants_1._0)) {
            discount = discount.negated();
        }
        const discountLimitPrice = constants_1._1.plus(discount).times(context.index);
        if (isAMMBuy) {
            if (price.gt(discountLimitPrice)) {
                return discountLimitPrice;
            }
        }
        else {
            if (price.lt(discountLimitPrice)) {
                return discountLimitPrice;
            }
        }
    }
    return price;
}
// the amount is the AMM's perspective
function computeAMMInternalClose(context, amount) {
    const beta = context.closeSlippageFactor;
    let ret = Object.assign({}, context);
    const position2 = ret.position1.plus(amount);
    let deltaMargin = constants_1._0;
    // trade
    if (isAMMSafe(ret, beta)) {
        ret = computeAMMPoolMargin(ret, beta);
        ret.bestAskBidPrice = computeBestAskBidPriceIfSafe(ret, beta, amount.gt(constants_1._0));
        deltaMargin = computeDeltaMargin(ret, beta, position2);
    }
    else {
        ret.bestAskBidPrice = computeBestAskBidPriceIfUnsafe(ret);
        deltaMargin = ret.bestAskBidPrice.times(amount).negated();
    }
    // max close price discount = -P_i * ΔN * (1 ± discount)
    let discount = context.maxClosePriceDiscount;
    if (amount.lt(constants_1._0)) {
        discount = discount.negated();
    }
    const limitValue = constants_1._1
        .plus(discount)
        .times(context.index)
        .times(amount)
        .negated();
    deltaMargin = bignumber_js_1.BigNumber.maximum(deltaMargin, limitValue);
    if ((0, utils_1.hasTheSameSign)(deltaMargin, amount)) {
        throw new types_2.BugError(`close error. ΔM and amount has the same sign unexpectedly: ${deltaMargin.toFixed()} vs ${amount.toFixed()}`);
    }
    // commit
    ret.deltaMargin = ret.deltaMargin.plus(deltaMargin);
    ret.deltaPosition = ret.deltaPosition.plus(amount);
    ret.cash = ret.cash.plus(deltaMargin);
    ret.position1 = position2;
    return ret;
}
// the amount is the AMM's perspective
function computeAMMInternalOpen(context, amount) {
    const beta = context.openSlippageFactor;
    let ret = Object.assign({}, context);
    const position2 = ret.position1.plus(amount);
    // pre-check
    if (!isAMMSafe(ret, beta)) {
        throw new types_2.InsufficientLiquidityError(`AMM can not open position anymore: unsafe before trade`);
    }
    ret = computeAMMPoolMargin(ret, beta);
    if (ret.poolMargin.lte(constants_1._0)) {
        throw new types_2.InsufficientLiquidityError(`AMM can not open position anymore: pool margin must be positive`);
    }
    if (amount.gt(constants_1._0)) {
        // 0.....position2.....safePosition2
        const safePosition2 = computeAMMSafeLongPositionAmount(ret, beta);
        if (position2.gt(safePosition2)) {
            throw new types_2.InsufficientLiquidityError(`AMM can not open position anymore: position too large after trade ${position2.toFixed()} > ${safePosition2.toFixed()}`);
        }
    }
    else {
        // safePosition2.....position2.....0
        const safePosition2 = computeAMMSafeShortPositionAmount(ret, beta);
        if (position2.lt(safePosition2)) {
            throw new types_2.InsufficientLiquidityError(`AMM can not open position anymore: position too large after trade ${position2.toFixed()} < ${safePosition2.toFixed()}`);
        }
    }
    // trade
    if (ret.bestAskBidPrice === null) {
        ret.bestAskBidPrice = computeBestAskBidPriceIfSafe(ret, beta, amount.gt(constants_1._0));
    }
    const deltaMargin = computeDeltaMargin(ret, beta, position2);
    if ((0, utils_1.hasTheSameSign)(deltaMargin, amount)) {
        throw new types_2.BugError(`open error. ΔM and amount has the same sign unexpectedly: ${deltaMargin.toFixed()} vs ${amount.toFixed()}`);
    }
    // commit
    ret.deltaMargin = ret.deltaMargin.plus(deltaMargin);
    ret.deltaPosition = ret.deltaPosition.plus(amount);
    ret.cash = ret.cash.plus(deltaMargin);
    ret.position1 = position2;
    return ret;
}
// do not call this function if !isAMMSafe && !allowUnsafe
function computeAMMPoolMargin(context, beta, allowUnsafe = false) {
    const marginBalanceWithCurrent = context.cash
        .plus(context.valueWithoutCurrent)
        .plus(context.index.times(context.position1));
    const squareValueWithCurrent = context.squareValueWithoutCurrent.plus(beta
        .times(context.index)
        .times(context.index)
        .times(context.position1)
        .times(context.position1));
    // 1/2 (M_b + √(M_b^2 - 2(Σ β P_i_j^2 N_j^2)))
    let beforeSqrt = marginBalanceWithCurrent.times(marginBalanceWithCurrent).minus(constants_1._2.times(squareValueWithCurrent));
    if (beforeSqrt.lt(constants_1._0)) {
        if (allowUnsafe) {
            beforeSqrt = constants_1._0;
        }
        else {
            throw new types_2.BugError('AMM available margin sqrt < 0');
        }
    }
    const poolMargin = marginBalanceWithCurrent.plus((0, utils_1.sqrt)(beforeSqrt)).div(constants_1._2);
    if (poolMargin.lt(constants_1._0)) {
        throw new types_2.InsufficientLiquidityError('pool margin is negative');
    }
    return Object.assign(Object.assign({}, context), { poolMargin });
}
function isAMMSafe(context, beta) {
    const valueWithCurrent = context.valueWithoutCurrent.plus(context.index.times(context.position1));
    const squareValueWithCurrent = context.squareValueWithoutCurrent.plus(beta
        .times(context.index)
        .times(context.index)
        .times(context.position1)
        .times(context.position1));
    // √(2 Σ(β_j P_i_j^2 N_j^2)) - Σ(P_i_j N_j). always positive
    const beforeSqrt = constants_1._2.times(squareValueWithCurrent);
    const safeCash = (0, utils_1.sqrt)(beforeSqrt).minus(valueWithCurrent);
    return context.cash.gte(safeCash);
}
// call computeAMMPoolMargin before this function. make sure isAMMSafe before this function
function computeAMMSafeShortPositionAmount(context, beta) {
    if (context.poolMargin.lte(constants_1._0)) {
        return constants_1._0;
    }
    let condition3 = computeAMMSafeCondition3(context, beta);
    if (condition3 === false) {
        return constants_1._0;
    }
    condition3 = condition3.negated();
    let condition2 = computeAMMSafeCondition2(context, beta);
    if (condition2 === true) {
        return condition3;
    }
    else {
        condition2 = condition2.negated();
        return bignumber_js_1.BigNumber.max(condition2, condition3);
    }
}
// call computeAMMPoolMargin before this function. make sure isAMMSafe before this function
function computeAMMSafeLongPositionAmount(context, beta) {
    if (context.poolMargin.lte(constants_1._0)) {
        return constants_1._0;
    }
    let condition3 = computeAMMSafeCondition3(context, beta);
    if (condition3 === false) {
        return constants_1._0;
    }
    const condition1 = computeAMMSafeCondition1(context, beta);
    const condition13 = bignumber_js_1.BigNumber.min(condition1, condition3);
    const condition2 = computeAMMSafeCondition2(context, beta);
    if (condition2 === true) {
        return condition13;
    }
    else {
        return bignumber_js_1.BigNumber.min(condition2, condition13);
    }
}
function computeAMMSafeCondition1(context, beta) {
    // M / i / β
    const position2 = context.poolMargin.div(context.index).div(beta);
    return position2.dp(constants_1.DECIMALS);
}
// return true if always safe
function computeAMMSafeCondition2(context, beta) {
    if (context.poolMargin.lte(constants_1._0)) {
        throw new types_2.InsufficientLiquidityError(`AMM poolMargin <= 0`);
    }
    // M - Σ(positionMargin_j - squareValue_j / 2 / M) where j ≠ id
    const x = context.poolMargin
        .minus(context.positionMarginWithoutCurrent)
        .plus(context.squareValueWithoutCurrent.div(context.poolMargin).div(constants_1._2));
    //  M - √(M(M - 2βλ^2 x))
    // ---------------------------
    //          β λ P_i
    let beforeSqrt = x
        .times(context.ammMaxLeverage)
        .times(context.ammMaxLeverage)
        .times(beta)
        .times(constants_1._2);
    beforeSqrt = context.poolMargin.minus(beforeSqrt).times(context.poolMargin);
    if (beforeSqrt.lt(constants_1._0)) {
        // means the curve is always above the x-axis
        return true;
    }
    let position2 = context.poolMargin.minus((0, utils_1.sqrt)(beforeSqrt));
    position2 = bignumber_js_1.BigNumber.max(position2, constants_1._0); // might be negative, clip to zero
    position2 = position2
        .div(beta)
        .div(context.ammMaxLeverage)
        .div(context.index);
    return position2.dp(constants_1.DECIMALS);
}
// return false if always unsafe
function computeAMMSafeCondition3(context, beta) {
    //   1      2M^2 - squareValueWithoutCurrent
    // ----- √(----------------------------------)
    //  P_i                   β
    const beforeSqrt = constants_1._2
        .times(context.poolMargin)
        .times(context.poolMargin)
        .minus(context.squareValueWithoutCurrent)
        .div(beta);
    if (beforeSqrt.lt(constants_1._0)) {
        return false;
    }
    const position2 = (0, utils_1.sqrt)(beforeSqrt).div(context.index);
    return position2.dp(constants_1.DECIMALS);
}
// P_b
function computeBasePrice(context, beta, position) {
    if (context.poolMargin.lte(constants_1._0)) {
        throw new types_2.InsufficientLiquidityError(`AMM poolMargin <= 0`);
    }
    // P_i (1 - β / M * P_i * N)
    let ret = context.index
        .times(position)
        .div(context.poolMargin)
        .times(beta);
    ret = constants_1._1.minus(ret).times(context.index);
    return ret.dp(constants_1.DECIMALS);
}
// ∫ computeBasePrice(p) dp
// cash2 - cash1
function computeDeltaMargin(context, beta, position2) {
    if ((context.position1.gt(constants_1._0) && position2.lt(constants_1._0)) || (context.position1.lt(constants_1._0) && position2.gt(constants_1._0))) {
        throw new types_2.BugError('bug: cross direction is not supported');
    }
    if (context.poolMargin.lte(constants_1._0)) {
        throw new types_2.InsufficientLiquidityError(`AMM poolMargin <= 0`);
    }
    // P_i (N1 - N2) (1 - β / M * P_i * (N2 + N1) / 2)
    let ret = position2
        .plus(context.position1)
        .div(constants_1._2)
        .times(context.index)
        .div(context.poolMargin)
        .times(beta);
    ret = constants_1._1.minus(ret);
    ret = context.position1
        .minus(position2)
        .times(ret)
        .times(context.index);
    return ret.dp(constants_1.DECIMALS);
}
function computeFundingRate(p, perpetualIndex) {
    let context = initAMMTradingContext(p, perpetualIndex);
    if (!isAMMSafe(context, context.openSlippageFactor)) {
        if (context.position1.isZero()) {
            return constants_1._0;
        }
        else if (context.position1.gt(constants_1._0)) {
            return context.fundingRateLimit.negated();
        }
        else {
            return context.fundingRateLimit;
        }
    }
    const perpetual = p.perpetuals.get(perpetualIndex);
    if (!perpetual) {
        throw new types_2.InvalidArgumentError(`perpetual ${perpetualIndex} not found in the pool`);
    }
    context = computeAMMPoolMargin(context, context.openSlippageFactor);
    let fr = constants_1._0;
    if (!perpetual.openInterest.isZero()) {
        if ((perpetual.baseFundingRate.value.gt(constants_1._0) && context.position1.lte(constants_1._0)) ||
            (perpetual.baseFundingRate.value.lt(constants_1._0) && context.position1.gte(constants_1._0))) {
            fr = perpetual.baseFundingRate.value;
        }
    }
    fr = fr.plus(context.fundingRateFactor
        .times(context.index)
        .times(context.position1)
        .div(context.poolMargin)
        .negated());
    fr = bignumber_js_1.BigNumber.minimum(fr, context.fundingRateLimit);
    fr = bignumber_js_1.BigNumber.maximum(fr, context.fundingRateLimit.negated());
    return fr;
}
// add liquidity helper
function computeAMMShareToMint(p, totalShare, cashToAdd) {
    const normalizedCashToAdd = (0, utils_1.normalizeBigNumberish)(cashToAdd);
    const normalizedTotalShare = (0, utils_1.normalizeBigNumberish)(totalShare);
    let context = initAMMTradingContext(p);
    context = computeAMMPoolMargin(context, constants_1._0 /* useless */, true /* allowUnsafe */);
    const poolMargin = context.poolMargin;
    let newContext = Object.assign(Object.assign({}, context), { cash: context.cash.plus(normalizedCashToAdd) });
    newContext = computeAMMPoolMargin(newContext, constants_1._0 /* useless */, true /* allowUnsafe */);
    const newPoolMargin = newContext.poolMargin;
    let shareToMint = constants_1._0;
    if (poolMargin.isZero()) {
        if (!normalizedTotalShare.isZero()) {
            console.warn('WARN: addLiquidity while poolMargin = 0 but totalShare != 0');
        }
        shareToMint = newPoolMargin;
    }
    else {
        shareToMint = newPoolMargin
            .minus(poolMargin)
            .times(normalizedTotalShare)
            .div(poolMargin);
    }
    return {
        shareToMint,
        poolMargin,
        newPoolMargin
    };
}
// remove liquidity helper
function computeAMMCashToReturn(p, totalShare, shareToRemove) {
    const normalizedShareToRemove = (0, utils_1.normalizeBigNumberish)(shareToRemove);
    const normalizedTotalShare = (0, utils_1.normalizeBigNumberish)(totalShare);
    if (normalizedTotalShare.lte(constants_1._0) || normalizedShareToRemove.gt(normalizedTotalShare)) {
        throw new types_2.InvalidArgumentError(`remove liquidity error. totalShare: ${normalizedTotalShare.toFixed()} shareToRemove: ${normalizedShareToRemove.toFixed()}`);
    }
    let context = initAMMTradingContext(p);
    if (!isAMMSafe(context, constants_1._0 /* useless */)) {
        throw new types_2.InsufficientLiquidityError(`AMM can not remove liquidity: unsafe before removing liquidity`);
    }
    context = computeAMMPoolMargin(context, constants_1._0 /* useless */);
    const poolMargin = context.poolMargin;
    if (poolMargin.isZero()) {
        return { cashToReturn: constants_1._0, poolMargin: constants_1._0, newPoolMargin: constants_1._0 };
    }
    const newPoolMargin = normalizedTotalShare
        .minus(normalizedShareToRemove)
        .times(poolMargin)
        .div(normalizedTotalShare);
    const minPoolMargin = (0, utils_1.sqrt)(context.squareValueWithoutCurrent.div(constants_1._2));
    if (newPoolMargin.lt(minPoolMargin)) {
        throw new types_2.InsufficientLiquidityError(`AMM can not remove liquidity: unsafe after removing liquidity`);
    }
    let cashToReturn = constants_1._0;
    if (newPoolMargin.isZero()) {
        // remove all
        cashToReturn = context.cash;
    }
    else if (newPoolMargin.lt(constants_1._0)) {
        throw new types_2.InsufficientLiquidityError(`AMM can not remove liquidity: pool margin must be positive`);
    }
    else {
        // M - Σ P_i N + Σ (β P_i^2 N^2) / 2 / M
        cashToReturn = context.squareValueWithoutCurrent
            .div(newPoolMargin)
            .div(constants_1._2)
            .plus(newPoolMargin)
            .minus(context.valueWithoutCurrent);
        cashToReturn = context.cash.minus(cashToReturn);
    }
    if (cashToReturn.lt(constants_1._0)) {
        throw new types_2.InsufficientLiquidityError(`AMM can not remove liquidity: received margin is negative`);
    }
    // prevent amm offering negative price
    for (let j = 0; j < context.otherIndex.length; j++) {
        // M / P_i / β
        const maxPos = newPoolMargin.div(context.otherOpenSlippageFactor[j]).div(context.otherIndex[j]);
        if (context.otherPosition[j].gt(maxPos)) {
            throw new types_2.InsufficientLiquidityError(`AMM can not remove liquidity: negative price in ${j}`);
        }
    }
    // prevent amm exceeding max leverage
    if (context.cash
        .plus(context.valueWithoutCurrent)
        .minus(cashToReturn)
        .lt(context.positionMarginWithoutCurrent)) {
        throw new types_2.InsufficientLiquidityError(`AMM can not remove liquidity: amm exceeds max leverage after removing liquidity`);
    }
    return {
        cashToReturn,
        poolMargin,
        newPoolMargin
    };
}
function computeMaxRemovableShare(p, totalShare) {
    const normalizedTotalShare = (0, utils_1.normalizeBigNumberish)(totalShare);
    let context = initAMMTradingContext(p);
    if (!isAMMSafe(context, constants_1._0 /* useless */)) {
        return constants_1._0;
    }
    context = computeAMMPoolMargin(context, constants_1._0 /* useless */);
    const poolMargin = context.poolMargin;
    if (poolMargin.lte(constants_1._0)) {
        return constants_1._0;
    }
    // if zero position
    if (context.positionMarginWithoutCurrent.isZero()) {
        return normalizedTotalShare;
    }
    // prevent amm unsafe
    let minPoolMargin = (0, utils_1.sqrt)(context.squareValueWithoutCurrent.div(constants_1._2));
    // prevent amm offering negative price. note: perp.state != PerpetualState.NORMAL are already skipped
    for (let j = 0; j < context.otherIndex.length; j++) {
        // M >= β P_i N
        minPoolMargin = bignumber_js_1.BigNumber.maximum(minPoolMargin, context.otherOpenSlippageFactor[j].times(context.otherIndex[j]).times(context.otherPosition[j]));
    }
    // prevent amm exceeding max leverage
    // newCash + Σ P_i N >= Σ P_i | N | / λ
    const minNewCash = context.positionMarginWithoutCurrent.minus(context.valueWithoutCurrent);
    const contextForLev = computeAMMPoolMargin(Object.assign(Object.assign({}, context), { cash: minNewCash }), constants_1._0 /* useless */, true /* allowUnsafe */);
    minPoolMargin = bignumber_js_1.BigNumber.maximum(minPoolMargin, contextForLev.poolMargin);
    // share
    if (minPoolMargin.gte(poolMargin)) {
        return constants_1._0;
    }
    const shareToRemove = constants_1._1.minus(minPoolMargin.div(poolMargin)).times(normalizedTotalShare);
    return shareToRemove.times(constants_1.REMOVE_LIQUIDITY_MAX_SHARE_RELAX).dp(constants_1.DECIMALS, bignumber_js_1.BigNumber.ROUND_DOWN);
}
//# sourceMappingURL=amm.js.map