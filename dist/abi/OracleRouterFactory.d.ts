import { Signer } from "ethers";
import { Provider } from "@ethersproject/providers";
import type { OracleRouter } from "./OracleRouter";
export declare class OracleRouterFactory {
    static connect(address: string, signerOrProvider: Signer | Provider): OracleRouter;
}
