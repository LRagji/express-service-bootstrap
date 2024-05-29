import { ApplicationLifeCycleStatusTypes } from "./enum-application-life-cycle-status";
/**
 *  Probe result
 */
export interface IProbeResult<T extends ApplicationLifeCycleStatusTypes> {
    /**
     * K8S health status of the current probe
     */
    status: T;
    /**
     * Additional data to be reported out with the call
     */
    data: Record<string, unknown>;
}