import { Signer } from "ethers";
import { Provider } from "@ethersproject/providers";
import type { SymbolService } from "./SymbolService";
export declare class SymbolServiceFactory {
    static connect(address: string, signerOrProvider: Signer | Provider): SymbolService;
}
