import { ApplicationBuilder, ApplicationStartupStatus, ApplicationTypes, Convenience } from "../../dist/src/index.js";
import * as OpenApiDefinition from "./api-def.json" with { type: "json" };

const applicationName = "Test Simple App";
const app = new ApplicationBuilder(applicationName, OpenApiDefinition);
const utilities = new Convenience();

function shouldCompress(req, res) {
    if (req.headers['x-no-compression']) {
        // don't compress responses with this request header
        return false
    }

    // fallback to standard filter function
    return true
}

async function AppStartUp(rootRouter, DIContainer, application) {

    //Connect to DB or create DB Pool
    //Apply Migrations
    //Register Routes,Middleware,etc
    DIContainer.registerInstance("msg", { message: "Hello from DI" }); //Simulate things stored in DI container

    rootRouter
        .get("/", (req, res) => {
            res.send(req.DIProp.fetchInstance("msg").message);
        })
        .post("/", (req, res) => {
            console.log(req.body);
        })
        .get("/error", (req, res) => {
            throw new Error("This is an error to validate final 'ErrorResponseTransformer' error handling of library");
        });

    //Configure your application.
    const apiDocs = utilities.swaggerAPIDocs(OpenApiDefinition);
    application.overrideAppPort(8080)                                                                                            //override the default port 8080(Default 3000)
        .overrideHealthPort(8081)                                                                                                //override the default health port 8081(Default 5678)
        .registerApplicationHandler(utilities.helmetMiddleware(), "*", 1, ApplicationTypes.Both)                                 //register helmet middleware for both application and health
        .registerApplicationHandler(utilities.bodyParserURLEncodingMiddleware(), "*", 2, ApplicationTypes.Main)                  //register body parser url middleware for application
        .registerApplicationHandler(utilities.bodyParserJSONEncodingMiddleware({ limit: '50M' }), "*", 3, ApplicationTypes.Main) //register body parser json middleware for application
        .registerApplicationHandler(apiDocs.router, apiDocs.hostingPath, 4, ApplicationTypes.Main)                               //register api docs
        .registerApplicationHandler(utilities.injectInRequestMiddleware("DIProp", DIContainer), "*", 5, ApplicationTypes.Main)   //register DI container middleware
        .registerApplicationHandler(utilities.compressionMiddleware({ filter: shouldCompress }), "*", 6, ApplicationTypes.Main)  //register compression middleware
        .registerApplicationHandler(utilities.staticMiddleware("examples\\simple-express\\public"), "/public", 7, ApplicationTypes.Main)                  //register static file serving middleware
        .overrideCatchAllErrorResponseTransformer((req, error) => ({                                                             //override the default catch all error response transformer
            path: req.path,
            status: 500,
            body: { message: error.message }
        }))


    return {
        status: ApplicationStartupStatus.UP,            // Indicates startup was successful
        data: { message: "Connected to database" }      // Additional data to be returned(Optional)
    };
}

app.overrideStartupHandler(AppStartUp)
    .start()
    .then(() => console.log(`${applicationName} started successfully.`))
    .catch(console.error);


//*******************************
// You can wait for your application to be called by process exit signal
// OR
// If you are done call the Dispose method to stop the application
// await app[Symbol.asyncDispose](); //stop the application and release all resources
//*******************************