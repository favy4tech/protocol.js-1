"use strict";
/*
  Simulate the smart contract's computation.
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeAccount = computeAccount;
exports.computeDecreasePosition = computeDecreasePosition;
exports.computeIncreasePosition = computeIncreasePosition;
exports.computeFee = computeFee;
exports.computeTradeWithPrice = computeTradeWithPrice;
exports.adjustMarginLeverage = adjustMarginLeverage;
exports.computeAMMTrade = computeAMMTrade;
exports.computeAMMPrice = computeAMMPrice;
exports.computeOpenInterest = computeOpenInterest;
exports.computeAMMOpenInterest = computeAMMOpenInterest;
exports.computePerpetualOpenInterestLimit = computePerpetualOpenInterestLimit;
const bignumber_js_1 = require("bignumber.js");
const types_1 = require("./types");
const amm_1 = require("./amm");
const constants_1 = require("./constants");
const utils_1 = require("./utils");
function computeAccount(p, perpetualIndex, s) {
    const perpetual = p.perpetuals.get(perpetualIndex);
    if (!perpetual) {
        throw new types_1.InvalidArgumentError(`perpetual ${perpetualIndex} not found in the pool`);
    }
    const positionValue = perpetual.markPrice.times(s.positionAmount.abs());
    const positionMargin = positionValue.times(perpetual.initialMarginRate);
    const maintenanceMargin = positionValue.times(perpetual.maintenanceMarginRate);
    let reservedCash = constants_1._0;
    if (!s.positionAmount.isZero()) {
        reservedCash = perpetual.keeperGasReward;
    }
    const availableCashBalance = s.cashBalance.minus(s.positionAmount.times(perpetual.unitAccumulativeFunding));
    const marginBalance = availableCashBalance.plus(perpetual.markPrice.times(s.positionAmount));
    const availableMargin = marginBalance.minus(positionMargin).minus(reservedCash);
    const withdrawableBalance = bignumber_js_1.BigNumber.maximum(constants_1._0, availableMargin);
    const isIMSafe = availableMargin.gte(constants_1._0);
    const isMMSafe = marginBalance.minus(maintenanceMargin).minus(reservedCash).gte(constants_1._0);
    const isMarginSafe = marginBalance.gte(reservedCash);
    const marginWithoutReserved = marginBalance.minus(reservedCash);
    let leverage = constants_1._0;
    if (positionValue.gt(constants_1._0)) {
        leverage = marginWithoutReserved.gt(constants_1._0)
            ? positionValue.div(marginWithoutReserved)
            : new bignumber_js_1.BigNumber('Infinity');
    }
    let marginRatio = constants_1._0;
    if (maintenanceMargin.gt(constants_1._0)) {
        marginRatio = marginWithoutReserved.gt(constants_1._0)
            ? maintenanceMargin.div(marginWithoutReserved)
            : new bignumber_js_1.BigNumber('Infinity');
    }
    let fundingPNL = null;
    if (s.entryFunding) {
        fundingPNL = s.entryFunding.minus(s.positionAmount.times(perpetual.unitAccumulativeFunding));
    }
    let entryPrice = null;
    let pnl1 = null;
    let pnl2 = null;
    let roe = null;
    if (s.entryValue) {
        entryPrice = s.positionAmount.isZero() ? constants_1._0 : s.entryValue.div(s.positionAmount);
    }
    if (s.entryValue) {
        pnl1 = perpetual.markPrice.times(s.positionAmount).minus(s.entryValue);
    }
    if (pnl1 && fundingPNL) {
        pnl2 = pnl1.plus(fundingPNL);
    }
    if (pnl2 && s.entryValue && s.entryFunding) {
        let entryCash = s.cashBalance.plus(s.entryValue).minus(s.entryFunding);
        roe = entryCash.isZero() ? constants_1._0 : pnl2.div(entryCash);
    }
    // the estimated liquidation price helps traders to know when to close their positions.
    // it has already considered the close position trading fee. this value is different
    // from the keeper's liquidation price who does not pay the trading fee.
    let liquidationPrice = constants_1._0;
    if (!s.positionAmount.isZero()) {
        let tradingFeeRate = p.vaultFeeRate.plus(perpetual.operatorFeeRate).plus(perpetual.lpFeeRate);
        const t = perpetual.maintenanceMarginRate
            .plus(tradingFeeRate)
            .times(s.positionAmount.abs())
            .minus(s.positionAmount);
        liquidationPrice = availableCashBalance.minus(reservedCash).div(t);
        if (liquidationPrice.isNegative()) {
            liquidationPrice = constants_1._0;
        }
    }
    const accountComputed = {
        positionValue,
        positionMargin,
        maintenanceMargin,
        availableCashBalance,
        marginBalance,
        availableMargin,
        withdrawableBalance,
        isMMSafe,
        isIMSafe,
        isMarginSafe,
        leverage,
        marginRatio,
        entryPrice,
        fundingPNL,
        pnl1,
        pnl2,
        roe,
        liquidationPrice
    };
    return { accountStorage: s, accountComputed };
}
function computeDecreasePosition(p, perpetualIndex, a, price, amount) {
    const perpetual = p.perpetuals.get(perpetualIndex);
    if (!perpetual) {
        throw new types_1.InvalidArgumentError(`perpetual ${perpetualIndex} not found in the pool`);
    }
    let cashBalance = a.cashBalance;
    const oldAmount = a.positionAmount;
    let entryValue = a.entryValue;
    let entryFunding = a.entryFunding;
    if (oldAmount.isZero() || amount.isZero() || (0, utils_1.hasTheSameSign)(oldAmount, amount)) {
        throw new types_1.InvalidArgumentError(`bad amount ${amount.toFixed()} to decrease when position is ${oldAmount.toFixed()}.`);
    }
    if (price.lte(constants_1._0)) {
        throw new types_1.InvalidArgumentError(`bad price ${price.toFixed()}`);
    }
    if (oldAmount.abs().lt(amount.abs())) {
        throw new types_1.InvalidArgumentError(`position size |${oldAmount.toFixed()}| is less than amount |${amount.toFixed()}|`);
    }
    cashBalance = cashBalance.minus(price.times(amount));
    cashBalance = cashBalance.plus(perpetual.unitAccumulativeFunding.times(amount));
    const positionAmount = oldAmount.plus(amount);
    entryFunding = entryFunding ? entryFunding.times(positionAmount).div(oldAmount) : null;
    entryValue = entryValue ? entryValue.times(positionAmount).div(oldAmount) : null;
    return { cashBalance, entryValue, positionAmount, entryFunding, targetLeverage: a.targetLeverage };
}
function computeIncreasePosition(p, perpetualIndex, a, price, amount) {
    const perpetual = p.perpetuals.get(perpetualIndex);
    if (!perpetual) {
        throw new types_1.InvalidArgumentError(`perpetual ${perpetualIndex} not found in the pool`);
    }
    let cashBalance = a.cashBalance;
    const oldAmount = a.positionAmount;
    let entryValue = a.entryValue;
    let entryFunding = a.entryFunding;
    if (price.lte(constants_1._0)) {
        throw new types_1.InvalidArgumentError(`bad price ${price.toFixed()}`);
    }
    if (amount.isZero()) {
        throw new types_1.InvalidArgumentError(`bad amount`);
    }
    if (!oldAmount.isZero() && !(0, utils_1.hasTheSameSign)(oldAmount, amount)) {
        throw new types_1.InvalidArgumentError(`bad increase size ${amount.toFixed()} where position is ${oldAmount.toFixed()}`);
    }
    cashBalance = cashBalance.minus(price.times(amount));
    cashBalance = cashBalance.plus(perpetual.unitAccumulativeFunding.times(amount));
    entryValue = entryValue ? entryValue.plus(price.times(amount)) : null;
    entryFunding = entryFunding ? entryFunding.plus(perpetual.unitAccumulativeFunding.times(amount)) : null;
    const positionAmount = oldAmount.plus(amount);
    return { cashBalance, entryValue, positionAmount, entryFunding, targetLeverage: a.targetLeverage };
}
function computeFee(hasOpened, price, amount, feeRate, afterTrade) {
    const normalizedPrice = (0, utils_1.normalizeBigNumberish)(price);
    const normalizedAmount = (0, utils_1.normalizeBigNumberish)(amount);
    const normalizedFeeRate = (0, utils_1.normalizeBigNumberish)(feeRate);
    if (normalizedPrice.lte(constants_1._0) || normalizedAmount.isZero()) {
        throw new types_1.InvalidArgumentError(`bad price ${normalizedPrice.toFixed()} or amount ${normalizedAmount.toFixed()}`);
    }
    let totalFee = normalizedPrice.times(normalizedAmount.abs()).times(normalizedFeeRate);
    if (!hasOpened) {
        const availableMargin = afterTrade.accountComputed.availableMargin;
        if (availableMargin.lte(constants_1._0)) {
            totalFee = constants_1._0;
        }
        else if (totalFee.gt(availableMargin)) {
            // make sure the sum of fees < available margin
            totalFee = availableMargin;
        }
    }
    return totalFee;
}
function computeTradeWithPrice(p, perpetualIndex, a, price, amount, feeRate, options) {
    const normalizedPrice = (0, utils_1.normalizeBigNumberish)(price);
    const normalizedAmount = (0, utils_1.normalizeBigNumberish)(amount);
    const normalizedFeeRate = (0, utils_1.normalizeBigNumberish)(feeRate);
    if (normalizedPrice.lte(constants_1._0) || normalizedAmount.isZero()) {
        throw new types_1.InvalidArgumentError(`bad price ${normalizedPrice.toFixed()} or amount ${normalizedAmount.toFixed()}`);
    }
    // trade
    let newAccount = Object.assign({}, a);
    let { close, open } = (0, utils_1.splitAmount)(newAccount.positionAmount, normalizedAmount);
    if (!close.isZero()) {
        newAccount = computeDecreasePosition(p, perpetualIndex, newAccount, normalizedPrice, close);
    }
    if (!open.isZero()) {
        newAccount = computeIncreasePosition(p, perpetualIndex, newAccount, normalizedPrice, open);
    }
    // fee
    let afterTrade = computeAccount(p, perpetualIndex, newAccount);
    const totalFee = computeFee(!open.isZero(), normalizedPrice, normalizedAmount, normalizedFeeRate, afterTrade);
    // transfer fee
    newAccount.cashBalance = newAccount.cashBalance.minus(totalFee);
    afterTrade = computeAccount(p, perpetualIndex, newAccount);
    // adjust margin
    let adjustCollateral = constants_1._0;
    const oldUseTargetLeverage = (options & types_1.TradeFlag.MASK_USE_TARGET_LEVERAGE) > 0;
    const newTargetLeverage = new bignumber_js_1.BigNumber((0, utils_1.decodeTargetLeverage)(options));
    const newUseTargetLeverage = newTargetLeverage.gt(constants_1._0);
    if (oldUseTargetLeverage && newUseTargetLeverage) {
        throw new types_1.InvalidArgumentError('invalid flags');
    }
    if (oldUseTargetLeverage || newUseTargetLeverage) {
        const perpetual = p.perpetuals.get(perpetualIndex);
        if (!perpetual) {
            throw new types_1.InvalidArgumentError(`perpetual ${perpetualIndex} not found in the pool`);
        }
        let targetLeverage = oldUseTargetLeverage ? a.targetLeverage : newTargetLeverage;
        if (targetLeverage.isZero()) {
            targetLeverage = perpetual.defaultTargetLeverage.value;
        }
        const maxLeverage = constants_1._1.div(perpetual.initialMarginRate);
        targetLeverage = bignumber_js_1.BigNumber.minimum(targetLeverage, maxLeverage);
        adjustCollateral = adjustMarginLeverage(p, perpetualIndex, afterTrade, price, close, open, totalFee, targetLeverage);
        newAccount.cashBalance = newAccount.cashBalance.plus(adjustCollateral);
    }
    // open position requires margin > IM. close position requires !bankrupt
    afterTrade = computeAccount(p, perpetualIndex, newAccount);
    let tradeIsSafe = afterTrade.accountComputed.isMarginSafe;
    if (!open.isZero()) {
        tradeIsSafe = afterTrade.accountComputed.isIMSafe;
    }
    return {
        afterTrade,
        tradeIsSafe,
        totalFee,
        adjustCollateral,
    };
}
// must be called after trade, before transferFee
function adjustMarginLeverage(p, perpetualIndex, afterTrade, price, close, open, totalFee, leverage) {
    const normalizedPrice = (0, utils_1.normalizeBigNumberish)(price);
    const normalizedOpen = (0, utils_1.normalizeBigNumberish)(open);
    const normalizedClose = (0, utils_1.normalizeBigNumberish)(close);
    const normalizedTotalFee = (0, utils_1.normalizeBigNumberish)(totalFee);
    const normalizedLeverage = (0, utils_1.normalizeBigNumberish)(leverage);
    const deltaPosition = normalizedClose.plus(normalizedOpen);
    const deltaCash = deltaPosition.times(normalizedPrice).negated();
    const position2 = afterTrade.accountStorage.positionAmount;
    const perpetual = p.perpetuals.get(perpetualIndex);
    if (!perpetual) {
        throw new types_1.InvalidArgumentError(`perpetual ${perpetualIndex} not found in the pool`);
    }
    if (!normalizedClose.isZero() && normalizedOpen.isZero()) {
        // close only
        // when close, keep the margin ratio
        // -withdraw == (availableCash2 * close - (deltaCash - fee) * position2 + reservedValue) / position1
        // reservedValue = 0 if position2 == 0 else keeperGasReward * (-deltaPos)
        let adjustCollateral = afterTrade.accountComputed.availableCashBalance.times(normalizedClose)
            .minus((deltaCash.minus(normalizedTotalFee)).times(position2));
        if (!position2.isZero()) {
            adjustCollateral = adjustCollateral.minus(perpetual.keeperGasReward.times(normalizedClose));
        }
        adjustCollateral = adjustCollateral.div(position2.minus(normalizedClose));
        // withdraw only when IM is satisfied
        const limit = afterTrade.accountComputed.availableMargin.negated();
        adjustCollateral = bignumber_js_1.BigNumber.maximum(adjustCollateral, limit);
        // never deposit when close positions
        adjustCollateral = bignumber_js_1.BigNumber.minimum(adjustCollateral, constants_1._0);
        return adjustCollateral;
    }
    else {
        // open only or close + open
        // when open, deposit mark * | openPosition | / lev
        if (normalizedLeverage.lte(constants_1._0)) {
            throw new types_1.InvalidArgumentError(`target leverage <= 0`);
        }
        let openPositionMargin = normalizedOpen.abs().times(perpetual.markPrice).div(normalizedLeverage);
        let adjustCollateral = constants_1._0;
        if (position2.minus(deltaPosition).isZero() || !normalizedClose.isZero()) {
            // strategy: let new margin balance = openPositionMargin
            adjustCollateral = openPositionMargin.plus(perpetual.keeperGasReward);
            adjustCollateral = adjustCollateral.minus(afterTrade.accountComputed.marginBalance);
        }
        else {
            // strategy: always append positionMargin of openPosition
            // adjustCollateral = openPositionMargin - pnl + fee
            adjustCollateral = openPositionMargin.minus(perpetual.markPrice.times(normalizedOpen));
            adjustCollateral = adjustCollateral.minus(deltaCash);
            adjustCollateral = adjustCollateral.plus(normalizedTotalFee);
        }
        // at least IM after adjust
        adjustCollateral = bignumber_js_1.BigNumber.maximum(adjustCollateral, afterTrade.accountComputed.availableMargin.negated());
        return adjustCollateral;
    }
}
/*
 * Options is a 32 bit uint value which indicates: (from highest bit)
 *   31               27 26                     7 6              0
 *  +---+---+---+---+---+------------------------+----------------+
 *  | C | M | S | T | R | Target leverage 20bits | Reserved 7bits |
 *  +---+---+---+---+---+------------------------+----------------+
 *    |   |   |   |   |   ` Target leverage  Fixed-point decimal with 2 decimal digits.
 *    |   |   |   |   |                      0 means don't automatically deposit / withdraw.
 *    |   |   |   |   `---  Reserved
 *    |   |   |   `-------  Take profit      Only available in brokerTrade mode.
 *    |   |   `-----------  Stop loss        Only available in brokerTrade mode.
 *    |   `---------------  Market order     Do not check limit price during trading.
 *    `-------------------  Close only       Only close position during trading.
 */
function computeAMMTrade(p, perpetualIndex, trader, amount, // trader's perspective
options) {
    const normalizedAmount = (0, utils_1.normalizeBigNumberish)(amount);
    if (normalizedAmount.isZero()) {
        throw new types_1.InvalidArgumentError(`bad amount ${normalizedAmount.toFixed()}`);
    }
    const perpetual = p.perpetuals.get(perpetualIndex);
    if (!perpetual) {
        throw new types_1.InvalidArgumentError(`perpetual ${perpetualIndex} not found in the pool`);
    }
    let oldOpenInterest = perpetual.openInterest;
    // AMM
    const { deltaAMMAmount, tradingPrice } = computeAMMPrice(p, perpetualIndex, normalizedAmount);
    if (!deltaAMMAmount.negated().eq(normalizedAmount)) {
        throw new types_1.BugError(`trading amount mismatched ${deltaAMMAmount.negated().toFixed()} != ${normalizedAmount.toFixed()}`);
    }
    // trader
    const traderResult = computeTradeWithPrice(p, perpetualIndex, trader, tradingPrice, deltaAMMAmount.negated(), perpetual.lpFeeRate.plus(p.vaultFeeRate).plus(perpetual.operatorFeeRate), options);
    // fee
    const totalFeeRate = perpetual.lpFeeRate.plus(p.vaultFeeRate).plus(perpetual.operatorFeeRate);
    const lpFee = totalFeeRate.isZero() ? constants_1._0 : traderResult.totalFee.times(perpetual.lpFeeRate).div(totalFeeRate);
    // new AMM
    const newPoolCashBalance = p.poolCashBalance
        .minus(deltaAMMAmount.times(tradingPrice))
        .plus(perpetual.unitAccumulativeFunding.times(deltaAMMAmount))
        .plus(lpFee);
    const newOpenInterest = computeAMMOpenInterest(p, perpetualIndex, trader, normalizedAmount);
    const newPool = Object.assign(Object.assign({}, p), { poolCashBalance: newPoolCashBalance, perpetuals: new Map(p.perpetuals) });
    newPool.perpetuals.set(perpetualIndex, Object.assign(Object.assign({}, perpetual), { ammPositionAmount: perpetual.ammPositionAmount.plus(deltaAMMAmount), openInterest: newOpenInterest }));
    // check open interest limit
    if (newOpenInterest.gt(oldOpenInterest)) {
        const limit = computePerpetualOpenInterestLimit(newPool, perpetualIndex);
        if (newOpenInterest.gt(limit)) {
            throw new types_1.OpenInterestExceededError(`open interest exceeds limit: ${newOpenInterest.toFixed()} > ${limit.toFixed()}`, newOpenInterest, limit);
        }
    }
    return {
        tradeIsSafe: traderResult.tradeIsSafe,
        trader: traderResult.afterTrade,
        newPool,
        totalFee: traderResult.totalFee,
        tradingPrice,
        adjustCollateral: traderResult.adjustCollateral,
    };
}
// don't forget to transfer lpFees into amm after calling this function
function computeAMMPrice(p, perpetualIndex, amount // trader's perspective
) {
    const normalizedAmount = (0, utils_1.normalizeBigNumberish)(amount);
    if (normalizedAmount.isZero()) {
        throw new types_1.InvalidArgumentError(`bad amount ${normalizedAmount.toFixed()}`);
    }
    const ammTrading = (0, amm_1.computeAMMInternalTrade)(p, perpetualIndex, normalizedAmount.negated());
    const deltaAMMMargin = ammTrading.deltaMargin;
    const deltaAMMAmount = ammTrading.deltaPosition;
    const tradingPrice = deltaAMMMargin.div(deltaAMMAmount).abs();
    return { deltaAMMAmount, deltaAMMMargin, tradingPrice };
}
// > 0 if more collateral required
function computeOpenInterest(oldOpenInterest, oldPosition, tradeAmount) {
    let newOpenInterest = oldOpenInterest;
    let newPosition = oldPosition.plus(tradeAmount);
    if (oldPosition.gt(constants_1._0)) {
        newOpenInterest = newOpenInterest.minus(oldPosition);
    }
    if (newPosition.gt(constants_1._0)) {
        newOpenInterest = newOpenInterest.plus(newPosition);
    }
    return newOpenInterest;
}
function computeAMMOpenInterest(p, perpetualIndex, trader, amount) {
    const normalizedAmount = (0, utils_1.normalizeBigNumberish)(amount);
    if (normalizedAmount.isZero()) {
        throw new types_1.InvalidArgumentError(`bad amount ${normalizedAmount.toFixed()}`);
    }
    const perpetual = p.perpetuals.get(perpetualIndex);
    if (!perpetual) {
        throw new types_1.InvalidArgumentError(`perpetual ${perpetualIndex} not found in the pool`);
    }
    let newOpenInterest = perpetual.openInterest;
    newOpenInterest = computeOpenInterest(newOpenInterest, trader.positionAmount, normalizedAmount);
    newOpenInterest = computeOpenInterest(newOpenInterest, perpetual.ammPositionAmount, normalizedAmount.negated());
    return newOpenInterest;
}
function computePerpetualOpenInterestLimit(p, perpetualIndex) {
    const perpetual = p.perpetuals.get(perpetualIndex);
    if (!perpetual) {
        throw new types_1.InvalidArgumentError(`perpetual ${perpetualIndex} not found in the pool`);
    }
    let context = (0, amm_1.initAMMTradingContext)(p, perpetualIndex);
    context = (0, amm_1.computeAMMPoolMargin)(context, context.openSlippageFactor, true /* allowUnsafe */);
    const limit = context.poolMargin.times(perpetual.maxOpenInterestRate).div(perpetual.indexPrice);
    return limit;
}
//# sourceMappingURL=computation.js.map