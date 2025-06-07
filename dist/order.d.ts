import { AccountStorage, LiquidityPoolStorage, Order, OrderContext } from './types';
import BigNumber from 'bignumber.js';
export declare function splitOrderPerpetual(orders: Order[]): Map<number, Order[]>;
export declare function splitOrderSide(orders: Order[]): {
    buyOrders: Order[];
    sellOrders: Order[];
};
export declare function splitOrdersByLimitPrice(orders: Order[], limitPrice: BigNumber, isBuy: boolean): {
    preOrders: Order[];
    postOrders: Order[];
};
export declare function openOrderCost(p: LiquidityPoolStorage, perpetualIndex: number, order: Order, leverage: BigNumber): {
    cost: BigNumber;
    fee: BigNumber;
    potentialLoss: BigNumber;
};
export declare function orderSideAvailable(p: LiquidityPoolStorage, perpetualIndex: number, marginBalance: BigNumber, position: BigNumber, walletBalance: BigNumber, orders: Order[]): {
    remainPosition: BigNumber;
    remainMargin: BigNumber;
    remainWalletBalance: BigNumber;
};
export declare function orderPerpetualAvailable(p: LiquidityPoolStorage, perpetualIndex: number, trader: AccountStorage, walletBalance: BigNumber, orders: Order[]): BigNumber;
export declare function orderPerpetualCost(p: LiquidityPoolStorage, perpetualIndex: number, trader: AccountStorage, walletBalance: BigNumber, orders: Order[], oldAvailable: BigNumber, // please pass the returned value of orderAvailable(orders)
newOrder: Order): BigNumber;
export declare function orderAvailable(context: Map<number, OrderContext>, walletBalance: BigNumber, orders: Order[], symbol: number): BigNumber;
export declare function orderCost(context: Map<number, OrderContext>, walletBalance: BigNumber, orders: Order[], oldAvailable: BigNumber, // please pass the returned value of orderAvailable(orders)
newOrder: Order): BigNumber;
