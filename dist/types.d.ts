import { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers';
import { Provider } from '@ethersproject/providers';
export type BigNumberish = BigNumber | ethers.BigNumber | string | number;
export type SignerOrProvider = ethers.Signer | Provider;
/**
 * Indicates that the AMM has insufficient reserves for a desired amount.
 * I.e. if the trade completes, the margin of the AMM will be not enough.
 */
export declare class InsufficientLiquidityError extends Error {
    readonly isInsufficientLiquidityError: true;
    constructor(message: string);
}
/**
 * Indicates that the trader's wallet balance is insufficient to cover the costs of all orders.
 */
export declare class InsufficientWalletForOrdersError extends Error {
    constructor(message: string);
}
/**
 * Indicates that calling convention error or bugs happened.
 */
export declare class BugError extends Error {
    constructor(message: string);
}
/**
 * Indicates that if the trade completes, the open interest will exceed the limit.
 */
export declare class OpenInterestExceededError extends Error {
    readonly isOpenInterestExceededError: true;
    readonly newOpenInterest: BigNumber;
    readonly limit: BigNumber;
    constructor(message: string, newOpenInterest: BigNumber, limit: BigNumber);
}
/**
 * Invalid argument or the query condition is impossible.
 */
export declare class InvalidArgumentError extends Error {
    constructor(message: string);
}
export declare enum PerpetualState {
    INVALID = 0,
    INITIALIZING = 1,
    NORMAL = 2,
    EMERGENCY = 3,
    CLEARED = 4
}
export declare enum TradeFlag {
    MASK_CLOSE_ONLY = 2147483648,
    MASK_MARKET_ORDER = 1073741824,
    MASK_STOP_LOSS_ORDER = 536870912,
    MASK_TAKE_PROFIT_ORDER = 268435456,
    MASK_USE_TARGET_LEVERAGE = 134217728
}
export interface PerpetualID {
    liquidityPoolAddress: string;
    perpetualIndex: number;
}
export interface Option {
    value: BigNumber;
    minValue: BigNumber;
    maxValue: BigNumber;
}
export interface LiquidityPoolStorage {
    isSynced: boolean;
    isRunning: boolean;
    isFastCreationEnabled: boolean;
    insuranceFundCap: BigNumber;
    creator: string;
    operator: string;
    transferringOperator: string;
    governor: string;
    shareToken: string;
    collateral: string;
    vault: string;
    vaultFeeRate: BigNumber;
    collateralDecimals: number;
    poolCashBalance: BigNumber;
    isAMMMaintenanceSafe: boolean;
    fundingTime: number;
    operatorExpiration: number;
    insuranceFund: BigNumber;
    donatedInsuranceFund: BigNumber;
    liquidityCap: BigNumber;
    shareTransferDelay: number;
    perpetuals: Map<number, PerpetualStorage>;
}
export interface PerpetualStorage {
    state: PerpetualState;
    oracle: string;
    totalCollateral: BigNumber;
    markPrice: BigNumber;
    indexPrice: BigNumber;
    fundingRate: BigNumber;
    unitAccumulativeFunding: BigNumber;
    initialMarginRate: BigNumber;
    maintenanceMarginRate: BigNumber;
    operatorFeeRate: BigNumber;
    lpFeeRate: BigNumber;
    referrerRebateRate: BigNumber;
    liquidationPenaltyRate: BigNumber;
    keeperGasReward: BigNumber;
    insuranceFundRate: BigNumber;
    openInterest: BigNumber;
    maxOpenInterestRate: BigNumber;
    halfSpread: Option;
    openSlippageFactor: Option;
    closeSlippageFactor: Option;
    fundingRateFactor: Option;
    fundingRateLimit: Option;
    ammMaxLeverage: Option;
    maxClosePriceDiscount: Option;
    defaultTargetLeverage: Option;
    baseFundingRate: Option;
    symbol: number;
    underlyingSymbol: string;
    isMarketClosed: boolean;
    isTerminated: boolean;
    ammCashBalance: BigNumber;
    ammPositionAmount: BigNumber;
    isInversePerpetual: boolean;
}
export interface AccountStorage {
    cashBalance: BigNumber;
    positionAmount: BigNumber;
    targetLeverage: BigNumber;
    entryValue: BigNumber | null;
    entryFunding: BigNumber | null;
}
export interface AccountComputed {
    positionValue: BigNumber;
    positionMargin: BigNumber;
    maintenanceMargin: BigNumber;
    availableCashBalance: BigNumber;
    marginBalance: BigNumber;
    availableMargin: BigNumber;
    withdrawableBalance: BigNumber;
    isMMSafe: boolean;
    isIMSafe: boolean;
    isMarginSafe: boolean;
    leverage: BigNumber;
    marginRatio: BigNumber;
    entryPrice: BigNumber | null;
    fundingPNL: BigNumber | null;
    pnl1: BigNumber | null;
    pnl2: BigNumber | null;
    roe: BigNumber | null;
    liquidationPrice: BigNumber;
}
export interface AccountDetails {
    accountStorage: AccountStorage;
    accountComputed: AccountComputed;
}
export interface TradeCost {
    account: AccountDetails;
    marginCost: BigNumber;
    fee: BigNumber;
}
export interface AMMTradingContext {
    index: BigNumber;
    position1: BigNumber;
    halfSpread: BigNumber;
    openSlippageFactor: BigNumber;
    closeSlippageFactor: BigNumber;
    fundingRateFactor: BigNumber;
    fundingRateLimit: BigNumber;
    maxClosePriceDiscount: BigNumber;
    ammMaxLeverage: BigNumber;
    otherIndex: BigNumber[];
    otherPosition: BigNumber[];
    otherOpenSlippageFactor: BigNumber[];
    otherAMMMaxLeverage: BigNumber[];
    cash: BigNumber;
    poolMargin: BigNumber;
    deltaMargin: BigNumber;
    deltaPosition: BigNumber;
    bestAskBidPrice: BigNumber | null;
    valueWithoutCurrent: BigNumber;
    squareValueWithoutCurrent: BigNumber;
    positionMarginWithoutCurrent: BigNumber;
}
export interface TradeWithPriceResult {
    afterTrade: AccountDetails;
    tradeIsSafe: boolean;
    totalFee: BigNumber;
    adjustCollateral: BigNumber;
}
export interface AMMTradingResult {
    tradeIsSafe: boolean;
    trader: AccountDetails;
    newPool: LiquidityPoolStorage;
    totalFee: BigNumber;
    tradingPrice: BigNumber;
    adjustCollateral: BigNumber;
}
export interface OracleRoute {
    oracle: string;
    isInverse: boolean;
}
export interface PreviewOracleRouterResult {
    markPrice: BigNumber;
    markPriceTime: number;
    indexPrice: BigNumber;
    indexPriceTime: number;
    isMarketClosed: boolean;
    isTerminated: boolean;
}
export interface Order {
    symbol: number;
    limitPrice: BigNumber;
    amount: BigNumber;
    targetLeverage: BigNumber;
}
export interface OrderContext {
    pool: LiquidityPoolStorage;
    perpetualIndex: number;
    account: AccountStorage;
}
