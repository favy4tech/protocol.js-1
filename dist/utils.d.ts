import { BigNumber } from 'bignumber.js';
import { BigNumberish, OracleRoute } from './types';
export declare function normalizeBigNumberish(bigNumberish: BigNumberish): BigNumber;
export declare function normalizeAddress(address: string): string;
export declare function hasTheSameSign(x: BigNumber, y: BigNumber): boolean;
export declare function splitAmount(positionAmount: BigNumber, amount: BigNumber): {
    close: BigNumber;
    open: BigNumber;
};
export declare function mostSignificantBit(x: BigNumber): number;
export declare function sqrt(x: BigNumber): BigNumber;
export declare function getOracleRouterKey(path: Array<OracleRoute>): string;
export declare function getUniswapV3OracleKey(path: Array<string>, fees: Array<number>, // 500, 3000, 10000
shortPeriod: number, longPeriod: number): string;
export declare function searchMaxAmount(f: (x: BigNumber) => boolean, guess: BigNumber | null, upperLimit?: BigNumber | null, // x* < upperLimit
maxIteration?: number | null, tolerance?: BigNumber | null): BigNumber;
export declare function decodeTargetLeverage(options: number): number;
export declare function encodeTargetLeverage(targetLeverage: number): number;
