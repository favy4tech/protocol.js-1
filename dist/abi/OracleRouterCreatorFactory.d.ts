import { Signer } from "ethers";
import { Provider } from "@ethersproject/providers";
import type { OracleRouterCreator } from "./OracleRouterCreator";
export declare class OracleRouterCreatorFactory {
    static connect(address: string, signerOrProvider: Signer | Provider): OracleRouterCreator;
}
