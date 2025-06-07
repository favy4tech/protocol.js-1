import { Signer } from "ethers";
import { Provider } from "@ethersproject/providers";
import type { LiquidityPool } from "./LiquidityPool";
export declare class LiquidityPoolFactory {
    static connect(address: string, signerOrProvider: Signer | Provider): LiquidityPool;
}
