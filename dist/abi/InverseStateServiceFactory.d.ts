import { Signer } from "ethers";
import { Provider } from "@ethersproject/providers";
import type { InverseStateService } from "./InverseStateService";
export declare class InverseStateServiceFactory {
    static connect(address: string, signerOrProvider: Signer | Provider): InverseStateService;
}
