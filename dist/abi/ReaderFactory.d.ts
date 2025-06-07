import { Signer } from "ethers";
import { Provider } from "@ethersproject/providers";
import type { Reader } from "./Reader";
export declare class ReaderFactory {
    static connect(address: string, signerOrProvider: Signer | Provider): Reader;
}
