import { Signer } from "ethers";
import { Provider } from "@ethersproject/providers";
import type { UniswapV3Tool } from "./UniswapV3Tool";
export declare class UniswapV3ToolFactory {
    static connect(address: string, signerOrProvider: Signer | Provider): UniswapV3Tool;
}
