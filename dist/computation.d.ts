import { BigNumber } from 'bignumber.js';
import { AccountStorage, AccountDetails, LiquidityPoolStorage, BigNumberish, AMMTradingResult, TradeWithPriceResult } from './types';
export declare function computeAccount(p: LiquidityPoolStorage, perpetualIndex: number, s: AccountStorage): AccountDetails;
export declare function computeDecreasePosition(p: LiquidityPoolStorage, perpetualIndex: number, a: AccountStorage, price: BigNumber, amount: BigNumber): AccountStorage;
export declare function computeIncreasePosition(p: LiquidityPoolStorage, perpetualIndex: number, a: AccountStorage, price: BigNumber, amount: BigNumber): AccountStorage;
export declare function computeFee(hasOpened: boolean, price: BigNumberish, amount: BigNumberish, feeRate: BigNumberish, afterTrade: AccountDetails): BigNumber;
export declare function computeTradeWithPrice(p: LiquidityPoolStorage, perpetualIndex: number, a: AccountStorage, price: BigNumberish, amount: BigNumberish, feeRate: BigNumberish, options: number): TradeWithPriceResult;
export declare function adjustMarginLeverage(p: LiquidityPoolStorage, perpetualIndex: number, afterTrade: AccountDetails, price: BigNumberish, close: BigNumberish, open: BigNumberish, totalFee: BigNumberish, leverage: BigNumberish): BigNumber;
export declare function computeAMMTrade(p: LiquidityPoolStorage, perpetualIndex: number, trader: AccountStorage, amount: BigNumberish, // trader's perspective
options: number): AMMTradingResult;
export declare function computeAMMPrice(p: LiquidityPoolStorage, perpetualIndex: number, amount: BigNumberish): {
    deltaAMMAmount: BigNumber;
    deltaAMMMargin: BigNumber;
    tradingPrice: BigNumber;
};
export declare function computeOpenInterest(oldOpenInterest: BigNumber, oldPosition: BigNumber, tradeAmount: BigNumber): BigNumber;
export declare function computeAMMOpenInterest(p: LiquidityPoolStorage, perpetualIndex: number, trader: AccountStorage, amount: BigNumberish): BigNumber;
export declare function computePerpetualOpenInterestLimit(p: LiquidityPoolStorage, perpetualIndex: number): BigNumber;
