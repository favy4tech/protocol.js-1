import { Signer } from "ethers";
import { Provider } from "@ethersproject/providers";
import type { UniswapV3OracleAdaptor } from "./UniswapV3OracleAdaptor";
export declare class UniswapV3OracleAdaptorFactory {
    static connect(address: string, signerOrProvider: Signer | Provider): UniswapV3OracleAdaptor;
}
