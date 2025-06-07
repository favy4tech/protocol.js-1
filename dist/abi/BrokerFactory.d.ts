import { Signer } from "ethers";
import { Provider } from "@ethersproject/providers";
import type { Broker } from "./Broker";
export declare class BrokerFactory {
    static connect(address: string, signerOrProvider: Signer | Provider): Broker;
}
