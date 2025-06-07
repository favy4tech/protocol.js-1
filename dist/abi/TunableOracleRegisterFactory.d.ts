import { Signer } from "ethers";
import { Provider } from "@ethersproject/providers";
import type { TunableOracleRegister } from "./TunableOracleRegister";
export declare class TunableOracleRegisterFactory {
    static connect(address: string, signerOrProvider: Signer | Provider): TunableOracleRegister;
}
