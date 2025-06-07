import { Signer } from "ethers";
import { Provider } from "@ethersproject/providers";
import type { TunableOracle } from "./TunableOracle";
export declare class TunableOracleFactory {
    static connect(address: string, signerOrProvider: Signer | Provider): TunableOracle;
}
