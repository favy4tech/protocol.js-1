import { Signer } from "ethers";
import { Provider } from "@ethersproject/providers";
import type { LpGovernor } from "./LpGovernor";
export declare class LpGovernorFactory {
    static connect(address: string, signerOrProvider: Signer | Provider): LpGovernor;
}
