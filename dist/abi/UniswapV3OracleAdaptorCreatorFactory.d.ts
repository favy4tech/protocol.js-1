import { Signer } from "ethers";
import { Provider } from "@ethersproject/providers";
import type { UniswapV3OracleAdaptorCreator } from "./UniswapV3OracleAdaptorCreator";
export declare class UniswapV3OracleAdaptorCreatorFactory {
    static connect(address: string, signerOrProvider: Signer | Provider): UniswapV3OracleAdaptorCreator;
}
