"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLiquidityPoolContract = getLiquidityPoolContract;
exports.getOracleContract = getOracleContract;
exports.getBrokerContract = getBrokerContract;
exports.getPoolCreatorContract = getPoolCreatorContract;
exports.getOracleRouterCreatorContract = getOracleRouterCreatorContract;
exports.getSymbolServiceContract = getSymbolServiceContract;
exports.getLpGovernorContract = getLpGovernorContract;
exports.getReaderContract = getReaderContract;
exports.getInverseStateService = getInverseStateService;
exports.getLiquidityPool = getLiquidityPool;
exports.getAccountStorage = getAccountStorage;
exports.getBrokerBalanceOf = getBrokerBalanceOf;
exports.listActivatePerpetualsOfTrader = listActivatePerpetualsOfTrader;
exports.listLiquidityPoolOfOperator = listLiquidityPoolOfOperator;
exports.getPerpetualClearProgress = getPerpetualClearProgress;
exports.getPerpetualClearGasReward = getPerpetualClearGasReward;
exports.previewOracleRouter = previewOracleRouter;
exports.getClaimableMiningReward = getClaimableMiningReward;
const ethers_1 = require("ethers");
const address_1 = require("@ethersproject/address");
const bignumber_js_1 = require("bignumber.js");
const utils_1 = require("./utils");
const constants_1 = require("./constants");
const types_1 = require("./types");
const types_2 = require("./types");
const BrokerFactory_1 = require("./abi/BrokerFactory");
const LiquidityPoolFactory_1 = require("./abi/LiquidityPoolFactory");
const PoolCreatorFactory_1 = require("./abi/PoolCreatorFactory");
const ReaderFactory_1 = require("./abi/ReaderFactory");
const SymbolServiceFactory_1 = require("./abi/SymbolServiceFactory");
const LpGovernorFactory_1 = require("./abi/LpGovernorFactory");
const IOracleFactory_1 = require("./abi/IOracleFactory");
const OracleRouterCreatorFactory_1 = require("./abi/OracleRouterCreatorFactory");
const InverseStateServiceFactory_1 = require("./abi/InverseStateServiceFactory");
function getLiquidityPoolContract(contractAddress, signerOrProvider) {
    (0, address_1.getAddress)(contractAddress);
    return LiquidityPoolFactory_1.LiquidityPoolFactory.connect(contractAddress, signerOrProvider);
}
function getOracleContract(contractAddress, signerOrProvider) {
    (0, address_1.getAddress)(contractAddress);
    return IOracleFactory_1.IOracleFactory.connect(contractAddress, signerOrProvider);
}
function getBrokerContract(contractAddress, signerOrProvider) {
    (0, address_1.getAddress)(contractAddress);
    return BrokerFactory_1.BrokerFactory.connect(contractAddress, signerOrProvider);
}
function getPoolCreatorContract(contractAddress, signerOrProvider) {
    (0, address_1.getAddress)(contractAddress);
    return PoolCreatorFactory_1.PoolCreatorFactory.connect(contractAddress, signerOrProvider);
}
function getOracleRouterCreatorContract(contractAddress, signerOrProvider) {
    (0, address_1.getAddress)(contractAddress);
    return OracleRouterCreatorFactory_1.OracleRouterCreatorFactory.connect(contractAddress, signerOrProvider);
}
function getSymbolServiceContract(contractAddress, signerOrProvider) {
    (0, address_1.getAddress)(contractAddress);
    return SymbolServiceFactory_1.SymbolServiceFactory.connect(contractAddress, signerOrProvider);
}
function getLpGovernorContract(contractAddress, signerOrProvider) {
    (0, address_1.getAddress)(contractAddress);
    return LpGovernorFactory_1.LpGovernorFactory.connect(contractAddress, signerOrProvider);
}
function getReaderContract(signerOrProvider, contractAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!contractAddress) {
            let chainId = 0;
            if (signerOrProvider instanceof ethers_1.ethers.Signer) {
                if (!signerOrProvider.provider) {
                    throw new types_2.InvalidArgumentError('the given Signer does not have a Provider');
                }
                chainId = (yield signerOrProvider.provider.getNetwork()).chainId;
            }
            else {
                chainId = (yield signerOrProvider.getNetwork()).chainId;
            }
            contractAddress = constants_1.CHAIN_ID_TO_READER_ADDRESS[chainId];
            if (!contractAddress) {
                throw new types_2.InvalidArgumentError(`unknown chainId ${chainId}`);
            }
        }
        return ReaderFactory_1.ReaderFactory.connect(contractAddress, signerOrProvider);
    });
}
function getInverseStateService(contractAddress, signerOrProvider) {
    (0, address_1.getAddress)(contractAddress);
    return InverseStateServiceFactory_1.InverseStateServiceFactory.connect(contractAddress, signerOrProvider);
}
function getLiquidityPool(reader, liquidityPoolAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, address_1.getAddress)(liquidityPoolAddress);
        let { isSynced, pool } = yield reader.callStatic.getLiquidityPoolStorage(liquidityPoolAddress);
        // there is an edge case. if the oracle is terminated, the Reader will automatically set the Perpetual into
        // Emergency mode if it was Normal mode (because it calls forceToSyncState), which is only useful for on-chain
        // programs and useless for off-chain programs. instead, in this case, we re-read from Getter to get the
        // real chain state
        const hasTerminatedOracle = !!pool.perpetuals.find(m => m.isTerminated);
        const getter = getLiquidityPoolContract(liquidityPoolAddress, reader.provider);
        let chainStates = [];
        if (hasTerminatedOracle) {
            // query getter
            const chainStateRequests = [];
            chainStateRequests.push(getter.callStatic.getLiquidityPoolInfo());
            for (let i = 0; i < pool.perpetuals.length; i++) {
                chainStateRequests.push(getter.callStatic.getPerpetualInfo(i));
            }
            chainStates = yield Promise.all(chainStateRequests);
            // overwrite pool state
            const chainState = chainStates[0];
            isSynced = false;
            pool = Object.assign(Object.assign({}, pool), { isRunning: chainState.isRunning, isFastCreationEnabled: chainState.isFastCreationEnabled, addresses: chainState.addresses, intNums: chainState.intNums, uintNums: chainState.uintNums });
        }
        // copy the pool state
        const ret = {
            isSynced,
            isRunning: pool.isRunning,
            isFastCreationEnabled: pool.isFastCreationEnabled,
            creator: pool.addresses[0],
            operator: pool.addresses[1],
            transferringOperator: pool.addresses[2],
            governor: pool.addresses[3],
            shareToken: pool.addresses[4],
            collateral: pool.addresses[5],
            vault: pool.addresses[6],
            vaultFeeRate: (0, utils_1.normalizeBigNumberish)(pool.intNums[0]).shiftedBy(-constants_1.DECIMALS),
            poolCashBalance: (0, utils_1.normalizeBigNumberish)(pool.intNums[1]).shiftedBy(-constants_1.DECIMALS),
            isAMMMaintenanceSafe: pool.isAMMMaintenanceSafe,
            insuranceFundCap: (0, utils_1.normalizeBigNumberish)(pool.intNums[2]).shiftedBy(-constants_1.DECIMALS),
            insuranceFund: (0, utils_1.normalizeBigNumberish)(pool.intNums[3]).shiftedBy(-constants_1.DECIMALS),
            donatedInsuranceFund: (0, utils_1.normalizeBigNumberish)(pool.intNums[4]).shiftedBy(-constants_1.DECIMALS),
            collateralDecimals: pool.uintNums[0].toNumber(),
            fundingTime: pool.uintNums[2].toNumber(),
            operatorExpiration: pool.uintNums[3].toNumber(),
            liquidityCap: (0, utils_1.normalizeBigNumberish)(pool.uintNums[4]).shiftedBy(-constants_1.DECIMALS),
            shareTransferDelay: pool.uintNums[5].toNumber(),
            perpetuals: new Map(),
        };
        // copy the perpetual state
        for (let i = 0; i < pool.perpetuals.length; i++) {
            let m = pool.perpetuals[i];
            if (m.state < types_1.PerpetualState.INVALID || m.state > types_1.PerpetualState.CLEARED) {
                throw new Error(`unrecognized perpetual state: ${m.state}`);
            }
            const parsePerpNums = (index) => {
                return (0, utils_1.normalizeBigNumberish)(m.nums[index]).shiftedBy(-constants_1.DECIMALS);
            };
            if (hasTerminatedOracle) {
                // overwrite perp state
                const chainState = chainStates[i + 1];
                m = Object.assign(Object.assign({}, m), { state: chainState.state, oracle: chainState.oracle, nums: chainState.nums });
            }
            ret.perpetuals.set(i, {
                state: m.state,
                oracle: m.oracle,
                totalCollateral: parsePerpNums(0),
                markPrice: parsePerpNums(1),
                indexPrice: parsePerpNums(2),
                fundingRate: parsePerpNums(3),
                unitAccumulativeFunding: parsePerpNums(4),
                initialMarginRate: parsePerpNums(5),
                maintenanceMarginRate: parsePerpNums(6),
                operatorFeeRate: parsePerpNums(7),
                lpFeeRate: parsePerpNums(8),
                referrerRebateRate: parsePerpNums(9),
                liquidationPenaltyRate: parsePerpNums(10),
                keeperGasReward: parsePerpNums(11),
                insuranceFundRate: parsePerpNums(12),
                halfSpread: {
                    value: parsePerpNums(13),
                    minValue: parsePerpNums(14),
                    maxValue: parsePerpNums(15)
                },
                openSlippageFactor: {
                    value: parsePerpNums(16),
                    minValue: parsePerpNums(17),
                    maxValue: parsePerpNums(18)
                },
                closeSlippageFactor: {
                    value: parsePerpNums(19),
                    minValue: parsePerpNums(20),
                    maxValue: parsePerpNums(21)
                },
                fundingRateLimit: {
                    value: parsePerpNums(22),
                    minValue: parsePerpNums(23),
                    maxValue: parsePerpNums(24)
                },
                ammMaxLeverage: {
                    value: parsePerpNums(25),
                    minValue: parsePerpNums(26),
                    maxValue: parsePerpNums(27)
                },
                maxClosePriceDiscount: {
                    value: parsePerpNums(28),
                    minValue: parsePerpNums(29),
                    maxValue: parsePerpNums(30)
                },
                openInterest: parsePerpNums(31),
                maxOpenInterestRate: parsePerpNums(32),
                fundingRateFactor: {
                    value: parsePerpNums(33),
                    minValue: parsePerpNums(34),
                    maxValue: parsePerpNums(35)
                },
                defaultTargetLeverage: {
                    value: parsePerpNums(36),
                    minValue: parsePerpNums(37),
                    maxValue: parsePerpNums(38)
                },
                baseFundingRate: {
                    value: parsePerpNums(39),
                    minValue: parsePerpNums(40),
                    maxValue: parsePerpNums(41)
                },
                symbol: m.symbol.toNumber(),
                underlyingSymbol: m.underlyingAsset,
                isMarketClosed: m.isMarketClosed,
                isTerminated: m.isTerminated,
                ammCashBalance: (0, utils_1.normalizeBigNumberish)(m.ammCashBalance).shiftedBy(-constants_1.DECIMALS),
                ammPositionAmount: (0, utils_1.normalizeBigNumberish)(m.ammPositionAmount).shiftedBy(-constants_1.DECIMALS),
                isInversePerpetual: m.isInversePerpetual,
            });
        } // foreach perpetual
        return ret;
    });
}
function getAccountStorage(reader, liquidityPoolAddress, perpetualIndex, traderAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, address_1.getAddress)(liquidityPoolAddress);
        (0, address_1.getAddress)(traderAddress);
        const { accountStorage } = yield reader.callStatic.getAccountStorage(liquidityPoolAddress, perpetualIndex, traderAddress);
        return {
            cashBalance: (0, utils_1.normalizeBigNumberish)(accountStorage.cash).shiftedBy(-constants_1.DECIMALS),
            positionAmount: (0, utils_1.normalizeBigNumberish)(accountStorage.position).shiftedBy(-constants_1.DECIMALS),
            targetLeverage: (0, utils_1.normalizeBigNumberish)(accountStorage.targetLeverage).shiftedBy(-constants_1.DECIMALS),
            entryValue: null,
            entryFunding: null
        };
    });
}
function getBrokerBalanceOf(broker, trader) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, address_1.getAddress)(trader);
        const balance = yield broker.balanceOf(trader);
        return (0, utils_1.normalizeBigNumberish)(balance).shiftedBy(-constants_1.DECIMALS);
    });
}
function listActivatePerpetualsOfTrader(poolCreator, trader) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, address_1.getAddress)(trader);
        const count = (yield poolCreator.getActiveLiquidityPoolCountOf(trader)).toNumber();
        if (count > 10000) {
            throw new types_2.BugError(`activate pool count is too large: ${count}`);
        }
        let ret = [];
        const step = 100;
        for (let begin = 0; begin < count; begin = ret.length) {
            let end = Math.min(begin + step, count);
            const ids = yield poolCreator.listActiveLiquidityPoolsOf(trader, begin, end);
            if (ids.length === 0) {
                break;
            }
            ids.forEach(j => {
                ret.push({
                    liquidityPoolAddress: j.liquidityPool,
                    perpetualIndex: j.perpetualIndex.toNumber()
                });
            });
        }
        return ret;
    });
}
function listLiquidityPoolOfOperator(poolCreator, operator) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, address_1.getAddress)(operator);
        const count = (yield poolCreator.getOwnedLiquidityPoolsCountOf(operator)).toNumber();
        if (count > 10000) {
            throw new types_2.BugError(`activate pool count is too large: ${count}`);
        }
        let ret = [];
        const step = 100;
        for (let begin = 0; begin < count; begin = ret.length) {
            let end = Math.min(begin + step, count);
            const ids = yield poolCreator.listLiquidityPoolOwnedBy(operator, begin, end);
            if (ids.length === 0) {
                break;
            }
            ret = ret.concat(ids);
        }
        return ret;
    });
}
function getPerpetualClearProgress(liquidityPool, perpetualIndex) {
    return __awaiter(this, void 0, void 0, function* () {
        const progressInfo = yield liquidityPool.callStatic.getClearProgress(perpetualIndex);
        const left = (0, utils_1.normalizeBigNumberish)(progressInfo.left);
        const total = (0, utils_1.normalizeBigNumberish)(progressInfo.total);
        return { left, total };
    });
}
function getPerpetualClearGasReward(liquidityPool, perpetualIndex, collateralDecimals) {
    return __awaiter(this, void 0, void 0, function* () {
        const perpetualInfo = yield liquidityPool.callStatic.getPerpetualInfo(perpetualIndex);
        const keeperGasReward = (0, utils_1.normalizeBigNumberish)(perpetualInfo.nums[11]).shiftedBy(-collateralDecimals);
        return keeperGasReward;
    });
}
function previewOracleRouter(path, signerOrProvider) {
    return __awaiter(this, void 0, void 0, function* () {
        if (path.length === 0) {
            throw new types_2.InvalidArgumentError('empty path');
        }
        const ret = {
            markPrice: constants_1._1,
            markPriceTime: 0,
            indexPrice: constants_1._1,
            indexPriceTime: 0,
            isMarketClosed: false,
            isTerminated: false,
        };
        const query = [];
        for (let i = 0; i < path.length; i++) {
            const iOracle = getOracleContract(path[i].oracle, signerOrProvider);
            query.push(iOracle.callStatic.priceTWAPLong());
            query.push(iOracle.callStatic.priceTWAPShort());
            query.push(iOracle.callStatic.isMarketClosed());
            query.push(iOracle.callStatic.isTerminated());
        }
        const prices = yield Promise.all(query);
        for (let i = 0; i < path.length; i++) {
            {
                const { newPrice, newTimestamp } = prices[i * 4 + 0];
                let p = new bignumber_js_1.BigNumber(newPrice.toString()).shiftedBy(-constants_1.DECIMALS);
                if (path[i].isInverse && !p.isZero()) {
                    p = constants_1._1.div(p);
                }
                ret.markPrice = ret.markPrice.times(p);
                ret.markPriceTime = Math.max(ret.markPriceTime, newTimestamp.toNumber());
            }
            {
                const { newPrice, newTimestamp } = prices[i * 4 + 1];
                let p = new bignumber_js_1.BigNumber(newPrice.toString()).shiftedBy(-constants_1.DECIMALS);
                if (path[i].isInverse && !p.isZero()) {
                    p = constants_1._1.div(p);
                }
                ret.indexPrice = ret.indexPrice.times(p);
                ret.indexPriceTime = Math.max(ret.indexPriceTime, newTimestamp.toNumber());
            }
            if (prices[i * 4 + 2]) {
                ret.isMarketClosed = true;
            }
            if (prices[i * 4 + 3]) {
                ret.isTerminated = true;
            }
        }
        return ret;
    });
}
function getClaimableMiningReward(mining, account) {
    return __awaiter(this, void 0, void 0, function* () {
        const claimableMiningRewardAmount = yield mining.earned(account);
        return (0, utils_1.normalizeBigNumberish)(claimableMiningRewardAmount).shiftedBy(-constants_1.DECIMALS);
    });
}
//# sourceMappingURL=data.js.map