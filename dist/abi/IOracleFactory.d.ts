import { Signer } from "ethers";
import { Provider } from "@ethersproject/providers";
import type { IOracle } from "./IOracle";
export declare class IOracleFactory {
    static connect(address: string, signerOrProvider: Signer | Provider): IOracle;
}
