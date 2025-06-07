import { Signer } from "ethers";
import { Provider } from "@ethersproject/providers";
import type { IERC20Bytes32 } from "./IERC20Bytes32";
export declare class IERC20Bytes32Factory {
    static connect(address: string, signerOrProvider: Signer | Provider): IERC20Bytes32;
}
