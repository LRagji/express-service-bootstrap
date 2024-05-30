import { ApplicationLifeCycleStatusTypes } from "./enum-application-life-cycle-status";
import { IProbe } from "./i-probe";
import { IProbeResult } from "./i-probe-result";
/**
 * Null probe default probe checks nothing and returns the default status
 * @param defaultStatus default status to be returned every time probe is checked
 * @returns IProbe
*/
export class NullProbe<T extends ApplicationLifeCycleStatusTypes> implements IProbe<T> {
    /**
     * Constructor for NullProbe
     * @param {ApplicationLifeCycleStatus} defaultStatus default status to be returned every time probe is checked
     * @returns IProbe
     * */
    constructor(private readonly defaultStatus: T) { }

    async check(): Promise<IProbeResult<T>> {
        return {
            status: this.defaultStatus,
            data: {}
        };
    }
}