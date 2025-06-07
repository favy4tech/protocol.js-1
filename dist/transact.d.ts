import { ethers } from 'ethers';
import { BigNumberish, TradeFlag } from './types';
import type { LiquidityPool } from './abi/LiquidityPool';
import type { Broker } from './abi/Broker';
import { Overrides, PayableOverrides } from '@ethersproject/contracts';
import { LpGovernor } from './abi/LpGovernor';
export declare function perpetualTrade(liquidityPool: LiquidityPool, perpetualIndex: number, trader: string, tradeAmount: BigNumberish, // +1.23 means buy, -1.23 means sell
limitPrice: BigNumberish, deadline: number, referrer: string, flag: TradeFlag, overrides?: Overrides): Promise<ethers.providers.TransactionResponse>;
export declare function perpetualDeposit(liquidityPool: LiquidityPool, perpetualIndex: number, trader: string, collateralAmount: BigNumberish, // should be a decimal number (ie: 1.234)
overrides?: PayableOverrides): Promise<ethers.providers.TransactionResponse>;
export declare function perpetualWithdraw(liquidityPool: LiquidityPool, perpetualIndex: number, trader: string, collateralAmount: BigNumberish, // should be a decimal number (ie: 1.234)
overrides?: Overrides): Promise<ethers.providers.TransactionResponse>;
export declare function brokerDeposit(broker: Broker, tokenAmount: BigNumberish, // should be a decimal number (ie: 1.234)
overrides?: PayableOverrides): Promise<ethers.providers.TransactionResponse>;
export declare function brokerWithdraw(broker: Broker, tokenAmount: BigNumberish, // should be a decimal number (ie: 1.234)
overrides?: Overrides): Promise<ethers.providers.TransactionResponse>;
export declare function perpetualClear(liquidityPool: LiquidityPool, perpetualIndex: number, overrides?: Overrides): Promise<ethers.providers.TransactionResponse>;
export declare function perpetualSettle(liquidityPool: LiquidityPool, perpetualIndex: number, trader: string, overrides?: Overrides): Promise<ethers.providers.TransactionResponse>;
export declare function addLiquidity(liquidityPool: LiquidityPool, collateralAmount: BigNumberish, // should be a decimal number (ie: 1.234)
overrides?: Overrides): Promise<ethers.providers.TransactionResponse>;
export declare function removeLiquidity(liquidityPool: LiquidityPool, shareToRemove: BigNumberish, // should be a decimal number (ie: 1.234)
cashToReturn: BigNumberish, // should be a decimal number (ie: 1.234)
overrides?: Overrides): Promise<ethers.providers.TransactionResponse>;
export declare function donateInsuranceFund(liquidityPool: LiquidityPool, collateralAmount: BigNumberish, // should be a decimal number (ie: 1.234)
overrides?: Overrides): Promise<ethers.providers.TransactionResponse>;
export declare function takerOverOperator(liquidityPool: LiquidityPool, overrides?: Overrides): Promise<ethers.providers.TransactionResponse>;
export declare function transferOperator(liquidityPool: LiquidityPool, targetAddress: string, overrides?: Overrides): Promise<ethers.providers.TransactionResponse>;
export declare function claimMiningReward(mining: LpGovernor, overrides?: Overrides): Promise<ethers.providers.TransactionResponse>;
export declare function setTargetLeverage(liquidityPool: LiquidityPool, perpetualIndex: number, trader: string, targetLeverage: BigNumberish, overrides?: Overrides): Promise<ethers.providers.TransactionResponse>;
