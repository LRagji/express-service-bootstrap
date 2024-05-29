import { ApplicationLifeCycleStatusTypes } from "./enum-application-life-cycle-status";
import { IProbeResult } from "./i-probe-result";

/**
 * Interface for a probe
 */
export interface IProbe<T extends ApplicationLifeCycleStatusTypes> {
    /**
     * Method which is called on validating the probe
     */
    check(): Promise<IProbeResult<T>>;
}