"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeBigNumberish = normalizeBigNumberish;
exports.normalizeAddress = normalizeAddress;
exports.hasTheSameSign = hasTheSameSign;
exports.splitAmount = splitAmount;
exports.mostSignificantBit = mostSignificantBit;
exports.sqrt = sqrt;
exports.getOracleRouterKey = getOracleRouterKey;
exports.getUniswapV3OracleKey = getUniswapV3OracleKey;
exports.searchMaxAmount = searchMaxAmount;
exports.decodeTargetLeverage = decodeTargetLeverage;
exports.encodeTargetLeverage = encodeTargetLeverage;
const bignumber_js_1 = require("bignumber.js");
const constants_1 = require("./constants");
const types_1 = require("./types");
const ethers_1 = require("ethers");
function normalizeBigNumberish(bigNumberish) {
    const bigNumber = bigNumberish instanceof bignumber_js_1.BigNumber ? bigNumberish : new bignumber_js_1.BigNumber(bigNumberish.toString());
    if (bigNumber.isNaN()) {
        throw new types_1.InvalidArgumentError(`Passed bigNumberish '${bigNumberish}' of type '${typeof bigNumberish}' is not valid.`);
    }
    return bigNumber;
}
function normalizeAddress(address) {
    return ethers_1.ethers.utils.getAddress(address.toLowerCase());
}
function hasTheSameSign(x, y) {
    if (x.s === null || y.s === null) {
        throw new types_1.InvalidArgumentError(`null x or y`);
    }
    if (x.isZero() || y.isZero()) {
        return true;
    }
    return (x.s ^ y.s) == 0;
}
function splitAmount(positionAmount, amount) {
    if (hasTheSameSign(positionAmount, amount)) {
        return { close: constants_1._0, open: amount };
    }
    else if (positionAmount.abs().gte(amount.abs())) {
        return { close: amount, open: constants_1._0 };
    }
    else {
        return { close: positionAmount.negated(), open: positionAmount.plus(amount) };
    }
}
function mostSignificantBit(x) {
    let t;
    let r = 0;
    if (x.gt('57896044618658097711785492504343953926634992332820282019728792003956564819967')) {
        // 2**255 - 1
        throw new types_1.InvalidArgumentError(`MSB(${x.toFixed()}) is too large`);
    }
    if ((t = x.idiv('340282366920938463463374607431768211456')).gt(constants_1._0)) {
        x = t;
        r += 128;
    }
    if ((t = x.idiv('18446744073709551616')).gt(constants_1._0)) {
        x = t;
        r += 64;
    }
    if ((t = x.idiv('4294967296')).gt(constants_1._0)) {
        x = t;
        r += 32;
    }
    if ((t = x.idiv('65536')).gt(constants_1._0)) {
        x = t;
        r += 16;
    }
    if ((t = x.idiv('256')).gt(constants_1._0)) {
        x = t;
        r += 8;
    }
    if ((t = x.idiv('16')).gt(constants_1._0)) {
        x = t;
        r += 4;
    }
    if ((t = x.idiv('4')).gt(constants_1._0)) {
        x = t;
        r += 2;
    }
    if ((t = x.idiv('2')).gt(constants_1._0)) {
        x = t;
        r += 1;
    }
    return r;
}
function sqrt(x) {
    if (x.lt(constants_1._0)) {
        throw new types_1.InvalidArgumentError('negative sqrt');
    }
    // we use 10**36 before sqrt
    x = x.shiftedBy(constants_1.DECIMALS * 2).dp(0, bignumber_js_1.BigNumber.ROUND_DOWN);
    if (x.lt(constants_1._3)) {
        const z = x.plus(constants_1._1).div(constants_1._2);
        return z.shiftedBy(-constants_1.DECIMALS).dp(constants_1.DECIMALS, bignumber_js_1.BigNumber.ROUND_DOWN);
    }
    // binary estimate
    // inspired by https://en.wikipedia.org/wiki/Methods_of_computing_square_roots#Binary_estimates
    let n = mostSignificantBit(x);
    // make sure initial estimate > sqrt(x)
    // 2^ceil((n + 1) / 2) as initial estimate
    // 2^(n + 1) > x
    // => 2^ceil((n + 1) / 2) > 2^((n + 1) / 2) > sqrt(x)
    n = Math.floor((n + 1) / 2) + 1;
    // modified babylonian method
    // https://github.com/Uniswap/uniswap-v2-core/blob/v1.0.1/contracts/libraries/Math.sol#L11
    let next = constants_1._2.pow(n); // 1 << n
    let y;
    do {
        y = next;
        next = x
            .div(next)
            .plus(next)
            .div(constants_1._2);
        next = next.dp(0, bignumber_js_1.BigNumber.ROUND_DOWN);
    } while (next.lt(y));
    return y.shiftedBy(-constants_1.DECIMALS).dp(constants_1.DECIMALS, bignumber_js_1.BigNumber.ROUND_DOWN);
}
function getOracleRouterKey(path) {
    if (path.length === 0) {
        throw new types_1.InvalidArgumentError('empty path');
    }
    const encodedPath = ethers_1.ethers.utils.defaultAbiCoder.encode(["tuple(address oracle, bool isInverse)[]"], [path]);
    const hash = ethers_1.ethers.utils.keccak256(encodedPath);
    return hash;
}
function getUniswapV3OracleKey(path, fees, // 500, 3000, 10000
shortPeriod, longPeriod) {
    if (path.length < 2) {
        throw new types_1.InvalidArgumentError('bad path');
    }
    if (path.length !== fees.length + 1) {
        throw new types_1.InvalidArgumentError('bad fees');
    }
    const encodedPath = ethers_1.ethers.utils.defaultAbiCoder.encode(["tuple(address[] path, uint24[] fees, uint32 shortPeriod, uint32 longPeriod)"], [{ path, fees, shortPeriod, longPeriod }]);
    const hash = ethers_1.ethers.utils.keccak256(encodedPath);
    return hash;
}
// search x*, assuming f(x) satisfies:
// * f(0 <= x <= x*) = true which means x is a safe amount
// * f(x > x*) = false
// the returned x MUST satisfy f(x) = true
function searchMaxAmount(f, guess, upperLimit = null, // x* < upperLimit
maxIteration = null, tolerance = null) {
    // x* ∈ [left, right)
    let left = constants_1._0;
    let right = new bignumber_js_1.BigNumber('Infinite');
    if (maxIteration === null) {
        maxIteration = 100;
    }
    if (tolerance === null) {
        tolerance = new bignumber_js_1.BigNumber('1e-7');
    }
    // shortcut of "0"
    if (!f(tolerance)) {
        return constants_1._0;
    }
    if (upperLimit === null && guess !== null) {
        // search an upper limit
        if (guess.lte(constants_1._0) || !guess.isFinite()) {
            guess = constants_1._1;
        }
        while (maxIteration > 0) {
            maxIteration -= 1;
            if (f(guess)) {
                left = guess;
                guess = left.times(2);
            }
            else {
                right = guess;
                break;
            }
        }
    }
    else if (upperLimit !== null && guess === null) {
        // a simple bisect
        right = upperLimit;
    }
    else {
        throw new Error('not supported yet');
    }
    // simple bisect
    while (maxIteration > 0) {
        maxIteration -= 1;
        guess = left.plus(right).div(2);
        if (f(guess)) {
            left = guess;
        }
        else {
            right = guess;
        }
        if (right.minus(left).div(right).lt(tolerance)) {
            return left;
        }
    }
    return left;
}
function decodeTargetLeverage(options) {
    return ((options >> 7) & 0xfffff) / 100;
}
function encodeTargetLeverage(targetLeverage) {
    return (targetLeverage * 100) << 7;
}
//# sourceMappingURL=utils.js.map