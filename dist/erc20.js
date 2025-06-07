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
exports.getERC20Contract = getERC20Contract;
exports.getERC20Bytes32Contract = getERC20Bytes32Contract;
exports.erc20Symbol = erc20Symbol;
exports.erc20Name = erc20Name;
exports.erc20SymbolBytes32 = erc20SymbolBytes32;
exports.erc20NameBytes32 = erc20NameBytes32;
exports.erc20Decimals = erc20Decimals;
exports.allowance = allowance;
exports.approveToken = approveToken;
exports.balanceOf = balanceOf;
exports.totalSupply = totalSupply;
const address_1 = require("@ethersproject/address");
const strings_1 = require("@ethersproject/strings");
const IERC20Factory_1 = require("./abi/IERC20Factory");
const IERC20Bytes32Factory_1 = require("./abi/IERC20Bytes32Factory");
const utils_1 = require("./utils");
function getERC20Contract(erc20Address, signerOrProvider) {
    (0, address_1.getAddress)(erc20Address);
    return IERC20Factory_1.IERC20Factory.connect(erc20Address, signerOrProvider);
}
function getERC20Bytes32Contract(erc20Address, signerOrProvider) {
    (0, address_1.getAddress)(erc20Address);
    return IERC20Bytes32Factory_1.IERC20Bytes32Factory.connect(erc20Address, signerOrProvider);
}
function erc20Symbol(erc20Contract) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return yield erc20Contract.symbol();
        }
        catch (err) {
            if (err.code === 'CALL_EXCEPTION') {
                return erc20SymbolBytes32(erc20Contract.address, erc20Contract.provider);
            }
            else {
                throw err;
            }
        }
    });
}
function erc20Name(erc20Contract) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return yield erc20Contract.name();
        }
        catch (err) {
            if (err.code === 'CALL_EXCEPTION') {
                return erc20NameBytes32(erc20Contract.address, erc20Contract.provider);
            }
            else {
                throw err;
            }
        }
    });
}
function erc20SymbolBytes32(erc20Address, provider) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, address_1.getAddress)(erc20Address);
        const erc20Contract = getERC20Bytes32Contract(erc20Address, provider);
        const bytes32 = yield erc20Contract.symbol();
        return (0, strings_1.parseBytes32String)(bytes32);
    });
}
function erc20NameBytes32(erc20Address, provider) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, address_1.getAddress)(erc20Address);
        const erc20Contract = getERC20Bytes32Contract(erc20Address, provider);
        const bytes32 = yield erc20Contract.name();
        return (0, strings_1.parseBytes32String)(bytes32);
    });
}
function erc20Decimals(erc20Contract) {
    return __awaiter(this, void 0, void 0, function* () {
        const decimals = yield erc20Contract.decimals();
        return decimals;
    });
}
function allowance(erc20Contract, accountAddress, perpetualAddress, decimals) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, address_1.getAddress)(accountAddress);
        (0, address_1.getAddress)(perpetualAddress);
        const allowance = yield erc20Contract.allowance(accountAddress, perpetualAddress);
        return (0, utils_1.normalizeBigNumberish)(allowance).shiftedBy(-decimals);
    });
}
function approveToken(erc20Contract_1, spenderAddress_1, allowance_1, decimals_1) {
    return __awaiter(this, arguments, void 0, function* (erc20Contract, spenderAddress, allowance, decimals, overrides = {}) {
        (0, address_1.getAddress)(spenderAddress);
        allowance = allowance.shiftedBy(decimals);
        return erc20Contract.approve(spenderAddress, allowance.toFixed(), overrides);
    });
}
function balanceOf(erc20Contract, accountAddress, decimals) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, address_1.getAddress)(accountAddress);
        const balance = yield erc20Contract.balanceOf(accountAddress);
        return (0, utils_1.normalizeBigNumberish)(balance).shiftedBy(-decimals);
    });
}
function totalSupply(erc20Contract, decimals) {
    return __awaiter(this, void 0, void 0, function* () {
        const totalSupply = yield erc20Contract.totalSupply();
        return (0, utils_1.normalizeBigNumberish)(totalSupply).shiftedBy(-decimals);
    });
}
//# sourceMappingURL=erc20.js.map