import bodyParser from "body-parser";
import { BootstrapConstructor } from "./bootstrap-constructor";
import { ApplicationBuilderMiddleware } from "./application-builder";
import helmet, { HelmetOptions } from "helmet";

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
}