import { ApplicationLifeCycleStatusTypes } from "./enum-application-life-cycle-status";
import { IProbe } from "./i-probe";
import { IProbeResult } from "./i-probe-result";
/**
 * Null probe default probe checks nothing and returns the default status
 * @param defaultStatus default status to be returned everytime probe is checked
 * @returns IProbe
*/
export class NullProble<T extends ApplicationLifeCycleStatusTypes> implements IProbe<T> {
    /**
     * Constructor for NullProble
     * @param {ApplicationLifeCycleStatus} defaultStatus default status to be returned everytime probe is checked
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