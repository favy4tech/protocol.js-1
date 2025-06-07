"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitOrderPerpetual = splitOrderPerpetual;
exports.splitOrderSide = splitOrderSide;
exports.splitOrdersByLimitPrice = splitOrdersByLimitPrice;
exports.openOrderCost = openOrderCost;
exports.orderSideAvailable = orderSideAvailable;
exports.orderPerpetualAvailable = orderPerpetualAvailable;
exports.orderPerpetualCost = orderPerpetualCost;
exports.orderAvailable = orderAvailable;
exports.orderCost = orderCost;
const computation_1 = require("./computation");
const types_1 = require("./types");
const constants_1 = require("./constants");
const utils_1 = require("./utils");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
// NOTE: collateral of orders from different markets MUST be the same as the current market
// split orders into different perpetuals
function splitOrderPerpetual(orders) {
    const ret = new Map();
    orders.forEach(order => {
        let orders = ret.get(order.symbol);
        if (!orders) {
            orders = [];
            ret.set(order.symbol, orders);
        }
        orders.push(order);
    });
    return ret;
}
// NOTE: collateral of orders from different markets MUST be the same as the current market
// split orders into buyOrders and sellOrders
// note: one perpetual only
function splitOrderSide(orders) {
    const buyOrders = [];
    const sellOrders = [];
    orders.forEach(order => {
        if (order.amount.gt(constants_1._0)) {
            buyOrders.push(order);
        }
        else if (order.amount.lt(constants_1._0)) {
            sellOrders.push(order);
        }
    });
    buyOrders.sort((a, b) => b.limitPrice.comparedTo(a.limitPrice)); // desc
    sellOrders.sort((a, b) => a.limitPrice.comparedTo(b.limitPrice)); // asc
    return { buyOrders, sellOrders };
}
// filter orders that will be executed before and after a new order
// NOTE: collateral of orders from different markets MUST be the same as the current market
// NOTE: one perpetual only
function splitOrdersByLimitPrice(orders, limitPrice, isBuy) {
    const preOrders = [];
    const postOrders = [];
    orders.forEach(order => {
        if ((isBuy && order.amount.lte(constants_1._0)) || (!isBuy && order.amount.gte(constants_1._0))) {
            return;
        }
        if ((isBuy && order.limitPrice.gte(limitPrice)) || (!isBuy && order.limitPrice.lte(limitPrice))) {
            preOrders.push(order);
        }
        else {
            postOrders.push(order);
        }
    });
    if (isBuy) {
        preOrders.sort((a, b) => b.limitPrice.comparedTo(a.limitPrice)); // desc
        postOrders.sort((a, b) => b.limitPrice.comparedTo(a.limitPrice)); // desc
    }
    else {
        preOrders.sort((a, b) => a.limitPrice.comparedTo(b.limitPrice)); // asc
        postOrders.sort((a, b) => a.limitPrice.comparedTo(b.limitPrice)); // asc
    }
    return { preOrders, postOrders };
}
function openOrderCost(p, perpetualIndex, order, leverage) {
    const perpetual = p.perpetuals.get(perpetualIndex);
    if (!perpetual) {
        throw new types_1.InvalidArgumentError(`perpetual ${perpetualIndex} not found in the pool`);
    }
    const feeRate = p.vaultFeeRate.plus(perpetual.lpFeeRate).plus(perpetual.operatorFeeRate);
    const mark = perpetual.markPrice;
    const potentialPNL = mark.minus(order.limitPrice).times(order.amount);
    // loss = pnl if pnl < 0 else 0
    const potentialLoss = bignumber_js_1.default.minimum(potentialPNL, constants_1._0);
    // fee = limitPrice * | amount | * feeRate
    const fee = order.limitPrice.times(order.amount.abs()).times(feeRate);
    let margin = constants_1._0;
    if (order.amount.lt(constants_1._0) && order.limitPrice.lt(mark)) {
        // mark * | amount | / lev
        margin = mark.times(order.amount.abs()).div(leverage);
    }
    else {
        // limitPrice * | amount | / lev
        margin = order.limitPrice.times(order.amount.abs()).div(leverage);
    }
    return {
        // margin + fee - loss
        cost: margin.plus(fee).minus(potentialLoss),
        fee,
        potentialLoss,
    };
}
// return available in wallet balance
// NOTE: collateral of orders from different markets MUST be the same as the current market
// NOTE: one perpetual + one side only
function orderSideAvailable(p, perpetualIndex, marginBalance, position, walletBalance, orders) {
    const perpetual = p.perpetuals.get(perpetualIndex);
    if (!perpetual) {
        throw new types_1.InvalidArgumentError(`perpetual ${perpetualIndex} not found in the pool`);
    }
    const feeRate = p.vaultFeeRate.plus(perpetual.lpFeeRate).plus(perpetual.operatorFeeRate);
    const mark = perpetual.markPrice;
    const imRate = perpetual.initialMarginRate;
    let remainPosition = position;
    let remainMargin = marginBalance;
    let remainWalletBalance = walletBalance;
    let remainOrders = [];
    if (orders.length == 0) {
        return { remainPosition, remainMargin, remainWalletBalance };
    }
    // close position
    for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        const { close } = (0, utils_1.splitAmount)(remainPosition, order.amount);
        if (!close.isZero()) {
            const newPosition = remainPosition.plus(close);
            let newPositionMargin = mark.times(newPosition.abs()).times(imRate);
            if (!newPosition.isZero()) {
                newPositionMargin = newPositionMargin.plus(perpetual.keeperGasReward);
            }
            const potentialPNL = mark.minus(order.limitPrice).times(close);
            // loss = pnl if pnl < 0 else 0
            const potentialLoss = bignumber_js_1.default.minimum(potentialPNL, constants_1._0);
            let afterMargin = remainMargin.plus(potentialLoss);
            // fee
            let fee = constants_1._0;
            if (close.eq(order.amount)) {
                // close only
                fee = bignumber_js_1.default.minimum(
                // marginBalance + pnl - mark * | newPosition | * imRate
                bignumber_js_1.default.maximum(afterMargin.minus(newPositionMargin), constants_1._0), order.limitPrice.times(close.abs()).times(feeRate));
            }
            else {
                // close + open
                fee = order.limitPrice.times(close.abs()).times(feeRate);
            }
            afterMargin = afterMargin.minus(fee);
            // order
            if (afterMargin.lt(constants_1._0)) {
                // bankrupt when close. pretend all orders as open orders
                remainPosition = constants_1._0;
                remainMargin = afterMargin; // Account is bankrupt; carry the negative margin forward.
                remainOrders.push(order);
                // // bankrupt
                // if (close.eq(order.amount)) {
                //   // close only. always allows
                //   continue
                // } else {
                //   // close + open
                //   remainPosition = _0
                //   remainMargin = afterMargin // < 0!
                //   remainOrders.push({ ...order, amount: order.amount.minus(close) })
                // }
            }
            else {
                // !bankrupt
                let withdraw = constants_1._0;
                if (afterMargin.gte(newPositionMargin)) {
                    // withdraw only if marginBalance >= IM
                    // withdraw = afterMargin - reserved2 - (remainMargin - reserved1) * (1 - | close / remainPosition |)
                    withdraw = close.div(remainPosition).abs();
                    withdraw = constants_1._1.minus(withdraw).times(remainMargin.minus(perpetual.keeperGasReward));
                    withdraw = afterMargin.minus(withdraw);
                    if (!newPosition.isZero()) {
                        withdraw = withdraw.minus(perpetual.keeperGasReward);
                    }
                    // never deposit when close
                    withdraw = bignumber_js_1.default.maximum(constants_1._0, withdraw);
                }
                remainMargin = afterMargin.minus(withdraw);
                remainWalletBalance = remainWalletBalance.plus(withdraw);
                remainPosition = remainPosition.plus(close);
                const newOrderAmount = order.amount.minus(close);
                if (!newOrderAmount.isZero()) {
                    remainOrders.push(Object.assign(Object.assign({}, order), { amount: newOrderAmount }));
                }
            }
        }
        else {
            remainOrders.push(order);
        }
    }
    // if close = 0 && position = 0 && margin > 0
    if (remainPosition.isZero()) {
        remainWalletBalance = remainWalletBalance.plus(remainMargin);
        remainMargin = constants_1._0;
    }
    // open position
    for (let i = 0; i < remainOrders.length; i++) {
        const order = remainOrders[i];
        let { cost, fee, potentialLoss } = openOrderCost(p, perpetualIndex, order, order.targetLeverage);
        if (remainPosition.isZero()) {
            cost = cost.plus(perpetual.keeperGasReward);
        }
        remainPosition = remainPosition.plus(order.amount);
        remainMargin = remainMargin.plus(potentialLoss).minus(fee);
        // at least IM and keeperGasReward
        const im = perpetual.markPrice.times(remainPosition.abs()).times(perpetual.initialMarginRate).plus(perpetual.keeperGasReward);
        cost = bignumber_js_1.default.maximum(im.minus(remainMargin /* old margin */), cost);
        remainMargin = remainMargin.plus(cost);
        remainWalletBalance = remainWalletBalance.minus(cost);
        if (remainWalletBalance.lt(constants_1._0)) {
            throw new types_1.InsufficientWalletForOrdersError(`Insufficient wallet balance to cover order costs. Wallet balance would be ${remainWalletBalance.toFixed()}. Order processing stopped.`);
        }
    }
    return { remainPosition, remainMargin, remainWalletBalance };
}
// available = remainWalletBalance = walletBalance - orderMargin
// NOTE: collateral of orders from different markets MUST be the same as the current market
// NOTE: one perpetual only
function orderPerpetualAvailable(p, perpetualIndex, trader, walletBalance, orders) {
    const { buyOrders, sellOrders } = splitOrderSide(orders);
    const marginBalance = (0, computation_1.computeAccount)(p, perpetualIndex, trader).accountComputed.marginBalance;
    const buySide = orderSideAvailable(p, perpetualIndex, marginBalance, trader.positionAmount, walletBalance, buyOrders);
    const sellSide = orderSideAvailable(p, perpetualIndex, marginBalance, trader.positionAmount, walletBalance, sellOrders);
    return bignumber_js_1.default.minimum(buySide.remainWalletBalance, sellSide.remainWalletBalance);
}
// NOTE: collateral of orders from different markets MUST be the same as the current market
// NOTE: one perpetual only
function orderPerpetualCost(p, perpetualIndex, trader, walletBalance, orders, oldAvailable, // please pass the returned value of orderAvailable(orders)
newOrder) {
    const newAvailable = orderPerpetualAvailable(p, perpetualIndex, trader, walletBalance, orders.concat([newOrder]));
    // old - new if old > new else 0
    return bignumber_js_1.default.maximum(constants_1._0, oldAvailable.minus(newAvailable));
}
// available = remainWalletBalance = walletBalance - orderMargin
// NOTE: collateral of orders from different markets MUST be the same as the current market
function orderAvailable(context, walletBalance, orders, symbol) {
    const symbol2Orders = splitOrderPerpetual(orders);
    // walletBalance
    let available = walletBalance;
    // minus orderMargin
    symbol2Orders.forEach((otherMarketOrders, otherMarketSymbol) => {
        const otherMarketContext = context.get(otherMarketSymbol);
        if (!otherMarketContext) {
            throw new types_1.InvalidArgumentError(`unknown symbol ${otherMarketSymbol}`);
        }
        available = orderPerpetualAvailable(otherMarketContext.pool, otherMarketContext.perpetualIndex, otherMarketContext.account, available, otherMarketOrders);
    });
    // plus margin if position = 0 and order (of the current market) = 0
    const currentMarketContext = context.get(symbol);
    if (!currentMarketContext) {
        throw new types_1.InvalidArgumentError(`unknown symbol ${symbol}`);
    }
    if (currentMarketContext.account.positionAmount.isZero()) {
        let hasOrder = false;
        orders.forEach(order => {
            if (order.symbol === symbol) {
                hasOrder = true;
            }
        });
        if (!hasOrder) {
            available = available.plus(currentMarketContext.account.cashBalance);
        }
    }
    return available;
}
// how much "available" will be used for newOrder
// NOTE: collateral of orders from different markets MUST be the same as the current market
function orderCost(context, walletBalance, orders, oldAvailable, // please pass the returned value of orderAvailable(orders)
newOrder) {
    const newAvailable = orderAvailable(context, walletBalance, orders.concat([newOrder]), newOrder.symbol);
    // old - new if old > new else 0
    return bignumber_js_1.default.maximum(constants_1._0, oldAvailable.minus(newAvailable));
}
//# sourceMappingURL=order.js.map