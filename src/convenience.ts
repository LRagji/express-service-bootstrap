import bodyParser from "body-parser";
import { BootstrapConstructor } from "./bootstrap-constructor";
import { ApplicationBuilderMiddleware } from "./application-builder";
import helmet, { HelmetOptions } from "helmet";
import { Router, IRouter, NextFunction, Request, Response } from "express";
import * as swaggerUi from "swagger-ui-express";

export type ApplicationRouter = { hostingPath: string, router: IRouter };

/**
 * A convenience class that provides a way to create middleware instances without the need to manually create them.
 */
export class Convenience {

    /**
     * Creates a new instance of the convenience class.
     * @param DIConstructor The dependency injection constructor to use to create instances of middleware.
     */
    constructor(private readonly customConstructor: BootstrapConstructor = new BootstrapConstructor()) { }


    /**
     * Creates a new instance of the body parser middleware for url encoding.
     * @param urlEncodingOptions  The options to use for the url encoding middleware.
     * @returns {ApplicationBuilderMiddleware} A new instance of the body parser middleware for url encoding.
     */
    public bodyParserURLEncodingMiddleware(urlEncodingOptions: bodyParser.OptionsUrlencoded = { extended: true }) {
        return this.customConstructor.createInstanceWithoutConstructor<ApplicationBuilderMiddleware>(bodyParser.urlencoded, [urlEncodingOptions]);
    }

    /**
     * Creates a new instance of the body parser middleware for JSON encoding. 
     * @param jsonOptions  The options to use for the JSON encoding middleware.
     * @returns  {ApplicationBuilderMiddleware} A new instance of the body parser middleware for JSON encoding.
     */
    public bodyParserJSONEncodingMiddleware(jsonOptions: bodyParser.OptionsJson = { limit: '1mb' }) {
        return this.customConstructor.createInstanceWithoutConstructor<ApplicationBuilderMiddleware>(bodyParser.json, [jsonOptions]);
    }

    /**
     * Creates a new instance of the body parser middleware for raw encoding.
     * @param helmetOptions The options to use for the raw encoding middleware.
     * @returns  {ApplicationBuilderMiddleware} A new instance of the helmet middleware.
     */
    public helmetMiddleware(helmetOptions?: Readonly<HelmetOptions>) {
        return this.customConstructor.createInstanceWithoutConstructor(helmet, [helmetOptions]);
    }

    /**
     * Creates a new instance of the swagger API documentation middleware.
     * @param swaggerDocument The swagger document to use for the API documentation, typically a json object.
     * @param hostPath The host path to use for the swagger API documentation.
     * @returns {ApplicationRouter} A new instance of the swagger API documentation middleware.
     */
    public swaggerAPIDocs(swaggerDocument: any, hostPath = '/api-docs'): ApplicationRouter {
        const swaggerRouter = this.customConstructor.createInstanceWithoutConstructor<IRouter>(Router);
        swaggerRouter.use(swaggerUi.serve, swaggerUi.setup(swaggerDocument));
        return { hostingPath: hostPath, router: swaggerRouter };
    }

    /**
     * Injects a specified object into the request under a given property name.
     * @param requestPropertyName - The name of the property to add to the request object.
     * @param object - The object to inject into the request.
     * @returns {ApplicationBuilderMiddleware} A middleware function that injects the object into the request.
     */
    public injectInRequestMiddleware(requestPropertyName: string, object: any): ApplicationBuilderMiddleware {
        const middleware = (req: Request, res: Response, next: NextFunction) => {
            (req as any)[requestPropertyName] = object;
            next();
        }
        return this.customConstructor.createInstanceWithoutConstructor<ApplicationBuilderMiddleware>(() => middleware);
    }
}