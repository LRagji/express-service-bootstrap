import express, { Express, IRouter, NextFunction, Request, Response, Router } from "express";
import { Server } from "http";
import { ApplicationDefaultStatus, ApplicationLifeCycleStatusTypes, ApplicationShutdownStatus, ApplicationStartupStatus, ApplicationStatus } from "./enum-application-life-cycle-status";
import { DisposableSingletonContainer } from "./disposable-singleton-container";
import { IProbe } from "./i-probe";
import { NullProbe } from "./null-probe";
import { IProbeResult } from "./i-probe-result";
import { SortedMap } from "./sorted-map";

export type ApplicationBuilderMiddleware = (request: Request, response: Response, next: NextFunction) => Promise<void> | void;

export type HostingPath = string | "*";

export enum ApplicationTypes {
    Main,
    Health,
    Both
}

//This is until express implements Dispose pattern;
declare module 'express' {
    interface Express {
        [Symbol.asyncDispose]?: () => Promise<void>;
    }
}

/**
 * The ApplicationBuilder class is responsible for building an express application.
 * It sets up the application's health status, ports, middlewares, routers, and error handling.
 */
export class ApplicationBuilder {

    public static readonly DINAME_ApplicationExpress = "AE";
    public static readonly DINAME_HealthExpress = "HE";

    private applicationStatus: IProbeResult<ApplicationLifeCycleStatusTypes> = { status: ApplicationDefaultStatus.UNKNOWN, data: {} };
    private applicationPort: number = 3000;
    private healthPort: number = 5678;
    private appHandlers = new SortedMap<ApplicationBuilderMiddleware | IRouter | SortedMap<ApplicationBuilderMiddleware>>();
    private healthHandlers = new SortedMap<ApplicationBuilderMiddleware | IRouter | SortedMap<ApplicationBuilderMiddleware>>();
    private catchAllErrorResponseTransformer: (request: Request, error: unknown) => unknown;
    private readonly exitHandler = this[Symbol.asyncDispose].bind(this);

    /**
     * Creates an instance of ApplicationBuilder.
     * 
     * @param {string} applicationName - The name of the application.
     * @param startupHandler - The startup handler that has to be invoked before application starts, used to indicate the application's startup status.
     * @param shutdownHandler - The shutdown handler that has to be invoked before application shutdowns, used to indicate the application's liveliness status.
     * @param {IProbe} livenessProbe - The liveness probe used to indicate the application's liveness status.
     * @param {IProbe} readinessProbe - The readiness probe used to indicate the application's readiness status.
     * @param {NodeJS.Process} currentProcess - The current process.
     * @param {NodeJS.Signals[]} exitSignals - The exit signals.
     * @param {DisposableSingletonContainer} container - The container for disposable singletons.
     */
    constructor(
        public applicationName: string = 'Application',
        public startupHandler: (rootRouter: IRouter, DIContainer: DisposableSingletonContainer, applicationBuilder: ApplicationBuilder) => Promise<IProbeResult<ApplicationStartupStatus>> = async () => ({ status: ApplicationStartupStatus.UP, data: {} }),
        public shutdownHandler: () => Promise<IProbeResult<ApplicationShutdownStatus>> = async () => ({ status: ApplicationShutdownStatus.STOPPED, data: {} }),
        public livenessProbe: IProbe<ApplicationStatus> = new NullProbe<ApplicationStatus>(ApplicationStatus.UP),
        public readinessProbe: IProbe<ApplicationStatus> = new NullProbe(ApplicationStatus.UP),
        private readonly currentProcess: NodeJS.Process = process,
        private readonly exitSignals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'],
        private readonly container: DisposableSingletonContainer = new DisposableSingletonContainer()) {
        this.exitSignals.forEach(signal => {
            this.currentProcess.once(signal, this.exitHandler);
        });

        this.catchAllErrorResponseTransformer = (req: Request, error: unknown) => ({
            apistatus: 500,
            err: [{
                errcode: 500,
                errmsg: `Unhandled exception occurred, please retry your request.`
            }]
        });
    }
    /**
     *  Used to override the startup handler.
     * @param startupHandler Handler to be invoked before application starts, used to indicate the application's startup status.
     * @returns {ApplicationBuilder} ApplicationBuilder instance.
     */
    public overrideStartupHandler(startupHandler: (rootRouter: IRouter, DIContainer: DisposableSingletonContainer, applicationBuilder: ApplicationBuilder) => Promise<IProbeResult<ApplicationStartupStatus>>): ApplicationBuilder {
        this.startupHandler = startupHandler;
        return this;
    }

    /**
     * Used to override the shutdown handler.
     * @param shutdownHandler Handler to be invoked before application shutdowns, used to cleanup resources.
     * @returns {ApplicationBuilder} ApplicationBuilder instance.
     */
    public overrideShutdownHandler(shutdownHandler: () => Promise<IProbeResult<ApplicationShutdownStatus>>): ApplicationBuilder {
        this.shutdownHandler = shutdownHandler;
        return this;
    }

    /**
     * Used to override the liveness probe.
     * @param livenessProbe Probe used to indicate the application's liveness status.
     * @returns {ApplicationBuilder} ApplicationBuilder instance.
     */
    public overrideLivenessProbe(livenessProbe: IProbe<ApplicationStatus>): ApplicationBuilder {
        this.livenessProbe = livenessProbe;
        return this;
    }

    /**
     * Used to override the readiness probe.
     * @param readinessProbe Probe used to indicate the application's readiness status.
     * @returns {ApplicationBuilder} ApplicationBuilder instance.
     */
    public overrideReadinessProbe(readinessProbe: IProbe<ApplicationStatus>): ApplicationBuilder {
        this.readinessProbe = readinessProbe;
        return this;
    }

    /**
     *  Used to overrides the application port default(3000).
     * @param {number} port new application port.
     * @returns {ApplicationBuilder} ApplicationBuilder instance.
     */
    public overrideAppPort(port: number): ApplicationBuilder {
        this.applicationPort = port;
        return this;
    }

    /**
     *  Used to overrides the health port default(5678).
     * @param {number} port new health port.
     * @returns {ApplicationBuilder} ApplicationBuilder instance.
     */
    public overrideHealthPort(port: number): ApplicationBuilder {
        this.healthPort = port;
        return this;
    }

    /**
     * Used to overrides the catchAllErrorResponseTransformer configuration.
     * @param {(request: Request, error: unknown) => unknown} transformer new catchAllErrorResponseTransformer configured middleware.
     * @returns {ApplicationBuilder} ApplicationBuilder instance.
     */
    public overrideCatchAllErrorResponseTransformer(transformer: (request: Request, error: unknown) => unknown): ApplicationBuilder {
        this.catchAllErrorResponseTransformer = transformer;
        return this;
    }

    /**
    * Used to register a SYNC/ASYNC middleware.
    * @param {ApplicationBuilderMiddleware} handler handler to be registered.
    * @param {HostingPath} hostingPath path where the handler has to be registered, use "*" for global.
    * @param {number} order order in which the handler has to be registered.
    * @param {ApplicationTypes} appliesTo type of application to which the handler has to be registered.
    * @returns {ApplicationBuilder} ApplicationBuilder instance.
    */
    public registerApplicationHandler(handler: ApplicationBuilderMiddleware | IRouter, hostingPath: HostingPath, order: number | undefined = undefined, appliesTo: ApplicationTypes = ApplicationTypes.Main): ApplicationBuilder {
        if (order != undefined && order < 1) throw new Error('Order must be greater than 0');
        switch (appliesTo) {
            case ApplicationTypes.Main:
                this.setRoutes(this.appHandlers, handler, hostingPath, order);
                break;
            case ApplicationTypes.Health:
                this.setRoutes(this.healthHandlers, handler, hostingPath, order);
                break;
            case ApplicationTypes.Both:
                this.setRoutes(this.appHandlers, handler, hostingPath, order);
                this.setRoutes(this.healthHandlers, handler, hostingPath, order);
                break;
            default:
                throw new Error(`Unknown Application Type:${appliesTo}`);
        }
        return this;
    }

    /**
     * Used to start the application using the configured parameters.
     * @returns {Promise<void>} Promise that resolves when the application is started.
     */
    public async start() {
        const startTime = Date.now();
        this.applicationStatus = { status: ApplicationStartupStatus.STARTING, data: { "invokeTime": startTime } };
        try {
            const rootRouter = this.container.bootstrap.createInstanceWithoutConstructor<IRouter>(Router);
            this.applicationStatus = await this.startupHandler(rootRouter, this.container, this);
            if (this.applicationStatus.status === ApplicationStartupStatus.UP) {
                this.registerApplicationHandler(rootRouter, "/", 1, ApplicationTypes.Main);
                await this.container.createAsyncInstanceWithoutConstructor<Express>(ApplicationBuilder.DINAME_HealthExpress, this.healthExpressListen.bind(this));
                await this.container.createAsyncInstanceWithoutConstructor<Express>(ApplicationBuilder.DINAME_ApplicationExpress, this.appExpressListen.bind(this));
            }
            else {
                this.applicationStatus = { status: ApplicationStatus.DOWN, data: { "reason": `Application startup handler returned failure status: ${this.applicationStatus.status}.` } };
            }
        }
        catch (error) {
            this.applicationStatus = { status: ApplicationStatus.DOWN, data: { "reason": "Application startup handler caught error" } };
            throw error;
        }
        finally {
            this.applicationStatus.data["startupTime"] = Date.now() - startTime;
        }
    }

    /**
     * Used to stop the application. This clears all the middlewares and routers.(all config is reset to default)
     * @returns {Promise<void>} Promise that resolves when the application is stopped.
     */
    public async [Symbol.asyncDispose]() {
        const startTime = Date.now();
        this.applicationStatus = { status: ApplicationShutdownStatus.STOPPING, data: { "invokeTime": startTime } };
        const result = await this.shutdownHandler();
        if (result.status === ApplicationShutdownStatus.STOPPED) {
            this.exitSignals.forEach(signal => {
                this.currentProcess.removeListener(signal, this.exitHandler);
            });
            await this.container.disposeAll();
            this.appHandlers.clear();
            this.healthHandlers.clear();
            this.applicationStatus = result;
            this.applicationStatus.data["shutdownTime"] = Date.now() - startTime;
        }
    }

    //------Private Methods------//
    private async appExpressListen() {
        const applicationExpressInstance = this.container.bootstrap.createInstanceWithoutConstructor<Express>(express);
        const applicationHttpServer = await new Promise<Server>((a, r) => {
            try {
                for (const [path, handler] of this.appHandlers.sort()) {
                    if (path === "*") {
                        const globalMiddleWares = Array.from((handler as SortedMap<ApplicationBuilderMiddleware>).sort().values());
                        applicationExpressInstance.use(globalMiddleWares);
                    }
                    else {
                        applicationExpressInstance.use(path, handler as ApplicationBuilderMiddleware | IRouter);
                    }
                }
                applicationExpressInstance.use(this.errorHandler.bind(this));
                const server = applicationExpressInstance.listen(this.applicationPort, () => { a(server) });
            }
            catch (e) {
                r(e);
            }
        });
        applicationExpressInstance[Symbol.asyncDispose] = async () => {
            const customDispose = async () => {
                applicationHttpServer.close(e => e == null ? Promise.resolve() : Promise.reject(e))
            };
            await (applicationHttpServer[Symbol.asyncDispose]?.bind(applicationHttpServer) || customDispose)();
        };
        return applicationExpressInstance;
    }

    private async healthExpressListen() {
        const healthExpressInstance = this.container.bootstrap.createInstanceWithoutConstructor<Express>(express);
        const healthServer = await new Promise<Server>((a, r) => {
            try {
                for (const [path, handler] of this.healthHandlers.sort()) {
                    if (path === "*") {
                        const globalMiddleWares = Array.from((handler as SortedMap<ApplicationBuilderMiddleware>).sort().values());
                        healthExpressInstance.use(globalMiddleWares);
                    }
                    else {
                        healthExpressInstance.use(path, handler as ApplicationBuilderMiddleware | IRouter);
                    }
                }
                healthExpressInstance.get(`/health/startup`, async (req, res) => this.checkHealthStatus("startup", res));
                healthExpressInstance.get(`/health/readiness`, async (req, res) => this.checkHealthStatus("readiness", res));
                healthExpressInstance.get(`/health/liveliness`, async (req, res) => this.checkHealthStatus("liveliness", res));
                healthExpressInstance.use(this.errorHandler);
                const server = healthExpressInstance.listen(this.healthPort, () => { a(server) });
            }
            catch (e) {
                r(e);
            }
        });
        healthExpressInstance[Symbol.asyncDispose] = async () => {
            const customDispose = async () => {
                healthServer.close(e => e == null ? Promise.resolve() : Promise.reject(e))
            };
            await (healthServer[Symbol.asyncDispose]?.bind(healthServer) || customDispose)();
        };
        return healthExpressInstance;
    }

    private async checkHealthStatus(lifecycleStage: string, res: Response): Promise<void> {
        try {
            switch (lifecycleStage) {
                case "startup":
                    if (this.applicationStatus.status === ApplicationStartupStatus.UP) {
                        res.status(200)
                            .json({ "status": this.applicationStatus.status, "checks": [{ "name": lifecycleStage, "state": this.applicationStatus.status, "data": this.applicationStatus.data }] });
                    }
                    else {
                        res.status(503)
                            .json({ "status": this.applicationStatus.status, "checks": [{ "name": lifecycleStage, "state": this.applicationStatus.status, "data": this.applicationStatus.data }] });
                    }
                    break;
                case "readiness":
                    if (this.applicationStatus.status === ApplicationStatus.UP || this.applicationStatus.status === ApplicationStatus.DOWN) {
                        const result = await this.readinessProbe.check();
                        if (result.status === ApplicationStatus.UP) {
                            res.status(200)
                                .json({ "status": result.status, "checks": [{ "name": lifecycleStage, "state": result.status, "data": result.data }] });
                        }
                        else {
                            res.status(503)
                                .json({ "status": result.status, "checks": [{ "name": lifecycleStage, "state": result.status, "data": result.data }] });
                        }
                    }
                    else if (this.applicationStatus.status === ApplicationShutdownStatus.STOPPING || this.applicationStatus.status === ApplicationShutdownStatus.STOPPED) {
                        res.status(503)
                            .json({ "status": this.applicationStatus.status, "checks": [{ "name": lifecycleStage, "state": this.applicationStatus.status, "data": { reason: "Application received exit signal." } }] });
                    }
                    else {
                        throw new Error(`Unknown Application state:${this.applicationStatus.status}`);
                    }
                    break;
                case "liveliness":
                    const result = await this.livenessProbe.check();
                    if (result.status === ApplicationStatus.UP) {
                        res.status(200)
                            .json({ "status": result.status, "checks": [{ "name": lifecycleStage, "state": result.status, "data": result.data }] });
                    }
                    else {
                        res.status(503)
                            .json({ "status": result.status, "checks": [{ "name": lifecycleStage, "state": result.status, "data": result.data }] });
                    }
                    break;
                default:
                    throw new Error(`Unknown life cycle stage:${lifecycleStage}`);
            }
        }
        catch (err) {
            res.status(500)
                .json({ "status": ApplicationDefaultStatus.UNKNOWN, "checks": [{ "name": "global", "state": ApplicationDefaultStatus.UNKNOWN, "data": { "reason": "Unhandled Exception" } }] });
        };
    }

    private errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
        if (res.headersSent) {
            return next(err);
        }
        const errorResponse = this.catchAllErrorResponseTransformer(req, err);
        res.status(500)
            .send(errorResponse);
    }

    private setRoutes(map: SortedMap<ApplicationBuilderMiddleware | IRouter | SortedMap<ApplicationBuilderMiddleware>>, handler: ApplicationBuilderMiddleware | IRouter, hostingPath: HostingPath, order: number | undefined = undefined) {
        if (hostingPath === "*") {
            const existingMap = map.get(hostingPath) as SortedMap<ApplicationBuilderMiddleware> || new SortedMap<ApplicationBuilderMiddleware>();
            existingMap.set(`${hostingPath}-${order}`, handler, order);
            map.set(hostingPath, existingMap, 0);
        }
        else {
            map.set(hostingPath, handler, order);
        }
    }
}