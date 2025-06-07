import { BigNumberish, AccountStorage, LiquidityPoolStorage, AMMTradingContext, Order, OrderContext } from './types';
import BigNumber from 'bignumber.js';
export declare function computeAMMMaxTradeAmount(p: LiquidityPoolStorage, perpetualIndex: number, trader: AccountStorage, walletBalance: BigNumberish, isTraderBuy: boolean, targetLeverage: number): BigNumber;
export declare function computeAMMTradeAmountByMargin(p: LiquidityPoolStorage, perpetualIndex: number, deltaMargin: BigNumberish): BigNumber;
export declare function computeLimitOrderMaxTradeAmount(context: Map<number, OrderContext>, walletBalance: BigNumberish, orders: Order[], symbol: number, limitPrice: BigNumberish, isTraderBuy: boolean, targetLeverage: BigNumberish): BigNumber;
export declare function computeAMMInverseVWAP(context: AMMTradingContext, price: BigNumber, beta: BigNumber, isAMMBuy: boolean): BigNumber;
export declare function computeAMMAmountWithPrice(p: LiquidityPoolStorage, perpetualIndex: number, isTraderBuy: boolean, limitPrice: BigNumberish): BigNumber;
export declare function computeAMMOpenAmountWithPrice(context: AMMTradingContext, limitPrice: BigNumber, isAMMBuy: boolean): BigNumber;
export declare function computeAMMCloseAndOpenAmountWithPrice(context: AMMTradingContext, limitPrice: BigNumber, isAMMBuy: boolean): BigNumber;
