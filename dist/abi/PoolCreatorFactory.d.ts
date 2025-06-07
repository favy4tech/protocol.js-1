import { Signer } from "ethers";
import { Provider } from "@ethersproject/providers";
import type { PoolCreator } from "./PoolCreator";
export declare class PoolCreatorFactory {
    static connect(address: string, signerOrProvider: Signer | Provider): PoolCreator;
}
