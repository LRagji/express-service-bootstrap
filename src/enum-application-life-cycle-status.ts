/**
 * Enum for various application life cycle status
 */
export enum ApplicationDefaultStatus {

    UNKNOWN = "UNKNOWN"
}

/**
 * Enum for application startup status
 */
export enum ApplicationStartupStatus {
    STARTING = "STARTING",
    UP = "UP"
}

/**
 * Enum for application shutdown status
 */
export enum ApplicationShtudownStatus {
    STOPPING = "STOPPING",
    STOPPED = "STOPPED"
}


/**
 * Enum for application status
 */
export enum ApplicationStatus {
    DOWN = "DOWN",
    UP = "UP"
}

export type ApplicationLifeCycleStatusTypes = ApplicationDefaultStatus | ApplicationShtudownStatus | ApplicationStartupStatus | ApplicationStatus;