import express, { Express, IRouter, NextFunction, Request, Response } from "express";
import { Server } from "http";
import helmet from 'helmet';
import * as bodyParser from 'body-parser';
import * as swaggerUi from "swagger-ui-express";
import { K8SHealthStatus } from "./enum-k8s-health-status";
import { DisposableSingletonContainer } from "./disposable-singleton-container";

//This is untill express implements Dispose pattern;
declare module 'express' {
    interface Express {
        [Symbol.asyncDispose]?: () => Promise<void>;
    }
}

/**
 * The ApplicationBuilder class is responsible for building an express application.
 * It sets up the application's health status, ports, middlewares, routers, and error handling.
 * 
 * @property {K8SHealthStatus} healthStatus - The health status of the application.
 * @property {string} applicationName - The name of the application.
 * @property {any} swaggerDocument - The swagger document for the application(JSON representation).
 */
export class ApplicationBuilder {
    public healthStatus = K8SHealthStatus.ALL_OK;
    private applicationPort: number = 3000;
    private healthPort: number = 5678;
    private appMiddlewares = new Array<(request: Request, response: Response, next: NextFunction) => Promise<void>>();
    private appRouters = new Map<string, IRouter>();
    private helmetMiddleware: (request: Request, response: Response, next: NextFunction) => void;
    private bodyParserUrlEncodingMiddleware: (request: Request, response: Response, next: NextFunction) => void;
    private bodyParserJsonMiddleware: (request: Request, response: Response, next: NextFunction) => void;
    private catchAllErrorResponseTransformer: (request: Request, error: unknown) => unknown;
    private readonly exitHandler = this.container.disposeAll.bind(this.container);

    /**
     * Creates an instance of ApplicationBuilder.
     * 
     * @param {string} applicationName - The name of the application.
     * @param {any} swaggerDocument - The swagger document for the application(JSON representation).
     * @param {NodeJS.Process} currentProcess - The current process.
     * @param {NodeJS.Signals[]} exitSignals - The exit signals.
     * @param {DisposableSingletonContainer} container - The container for disposable singletons.
     */
    constructor(
        public applicationName: string = 'Application',
        public swaggerDocument: any = null,
        private readonly currentProcess: NodeJS.Process = process,
        private readonly exitSignals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'],
        private readonly container: DisposableSingletonContainer = new DisposableSingletonContainer()) {
        this.exitSignals.forEach(signal => {
            this.currentProcess.once(signal, this.exitHandler);
        });

        this.helmetMiddleware = this.container.bootstrap.createInstanceWithoutConstructor(helmet);
        this.bodyParserJsonMiddleware = this.container.bootstrap.createInstanceWithoutConstructor(bodyParser.json, [{ limit: '1mb' }]);
        this.bodyParserUrlEncodingMiddleware = this.container.bootstrap.createInstanceWithoutConstructor(bodyParser.urlencoded, [{ extended: true }]);
        this.catchAllErrorResponseTransformer = (req: Request, error: unknown) => ({
            apistatus: 500,
            err: [{
                errcode: 500,
                errmsg: `Unhandled exception occured, please retry your request.`
            }]
        });
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
     * Used to overrides the helmet configuration.
     * @param {(request: Request, response: Response, next: NextFunction) => void} helmet new helmet configured middleware.
     * @returns {ApplicationBuilder} ApplicationBuilder instance.
     */
    public overrideHelmetConfiguration(helmet: (request: Request, response: Response, next: NextFunction) => void): ApplicationBuilder {
        this.helmetMiddleware = helmet;
        return this;
    }

    /**
     * Used to overrides the bodyParserUrlEncoding configuration.
     * @param {(request: Request, response: Response, next: NextFunction) => void} bodyParserUrlEncoding new bodyParserUrlEncoding configured middleware.
     * @returns {ApplicationBuilder} ApplicationBuilder instance.
     */
    public overrideBodyParserUrlEncodingConfiguration(bodyParserUrlEncoding: (request: Request, response: Response, next: NextFunction) => void): ApplicationBuilder {
        this.bodyParserUrlEncodingMiddleware = bodyParserUrlEncoding;
        return this;
    }

    /**
     * Used to overrides the bodyParserJson configuration.
     * @param {(request: Request, response: Response, next: NextFunction) => void} bodyParserJson new bodyParserJson configured middleware.
     * @returns {ApplicationBuilder} ApplicationBuilder instance.
     */
    public overrideBodyParserJsonConfiguration(bodyParserJson: (request: Request, response: Response, next: NextFunction) => void): ApplicationBuilder {
        this.bodyParserJsonMiddleware = bodyParserJson;
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
     * Used to register a middleware.
     * @param {(request: Request, response: Response, next: NextFunction) => Promise<void>} middleware middleware to be registered.
     * @returns {ApplicationBuilder} ApplicationBuilder instance.
     */
    public registerApplicationMiddleware(middleware: (request: Request, response: Response, next: NextFunction) => Promise<void>): ApplicationBuilder {
        this.appMiddlewares.push(middleware);
        return this;
    }

    /**
     * Used to register a router.
     * @param {string} path path for the router.
     * @param {IRouter} router router to be registered.
     * @returns {ApplicationBuilder} ApplicationBuilder instance.
     */
    public registerApplicationRoutes(path: string, router: IRouter): ApplicationBuilder {
        this.appRouters.set(path, router);
        return this;
    }

    /**
     * Used to change the health status of the application.
     * @param {K8SHealthStatus} status new health status.
     */
    public changeHealthStatus(status: K8SHealthStatus) {
        this.healthStatus = status;
    }

    /**
     * Used to start the application using the configured parameters.
     * @returns {Promise<void>} Promise that resolves when the application is started.
     */
    public async start() {
        await this.container.createInstanceWithoutConstructor<Express>('applicationExpress', this.appExpressListen.bind(this));
        await this.container.createInstanceWithoutConstructor<Express>('healthExpress', this.healthExpressListen.bind(this));
    }

    /**
     * Used to stop the application. This clears all the middlewares and routers.(all config is reset to default)
     * @returns {Promise<void>} Promise that resolves when the application is stopped.
     */
    public async [Symbol.asyncDispose]() {
        this.exitSignals.forEach(signal => {
            this.currentProcess.removeListener(signal, this.exitHandler);
        });
        await this.container.disposeAll();
        this.appMiddlewares = [];
        this.appRouters.clear();
    }

    //------Private Methods------//
    private async appExpressListen() {
        const applicationExpressInstance = await this.container.bootstrap.createAsyncInstanceWithoutConstructor<Express>(async () => Promise.resolve(express()));
        const applicationHttpServer = await new Promise<Server>((a, r) => {
            try {
                applicationExpressInstance.use(this.helmetMiddleware);
                applicationExpressInstance.use(this.bodyParserUrlEncodingMiddleware);
                applicationExpressInstance.use(this.bodyParserJsonMiddleware);
                if (this.swaggerDocument != null) {
                    applicationExpressInstance.use('/api-docs', swaggerUi.serve, swaggerUi.setup(this.swaggerDocument));
                }
                for (const middleware of this.appMiddlewares) {
                    applicationExpressInstance.use(middleware);
                }
                for (const [path, router] of this.appRouters) {
                    applicationExpressInstance.use(path, router);
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
        const healthExpressInstance = await this.container.bootstrap.createAsyncInstanceWithoutConstructor<Express>(async () => Promise.resolve(express()));
        const healthServer = await new Promise<Server>((a, r) => {
            try {
                healthExpressInstance.use(this.helmetMiddleware);
                healthExpressInstance.get(`/health/startup`, async (req, res) => this.checkHealthStatus(res, `${this.applicationName} is down(${this.healthStatus.toString()}).`));
                healthExpressInstance.get(`/health/readiness`, async (req, res) => this.checkHealthStatus(res, `${this.applicationName} is not available(${this.healthStatus.toString()}).`));
                healthExpressInstance.get(`/health/liveliness`, async (req, res) => this.checkHealthStatus(res, `${this.applicationName} is not ready(${this.healthStatus.toString()}).`));
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

    private checkHealthStatus(res: Response, failureMsg: string) {
        if (this.healthStatus === K8SHealthStatus.ALL_OK) {
            res.status(200)
                .send(`Ok`);
        } else {
            res.status(503)
                .send(failureMsg);
        }
    }

    private errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
        if (res.headersSent) {
            return next(err);
        }
        const errorResponse = this.catchAllErrorResponseTransformer(req, err);
        res.status(500)
            .send(errorResponse);
    }
}