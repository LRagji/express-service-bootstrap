import { ApplicationBuilder, ApplicationStartupStatus, ApplicationTypes, Convenience } from "../../dist/src/index.js";
import * as OpenApiDefinition from "./api-def.json" with { type: "json" };

const applicationName = "Test Simple App";
const app = new ApplicationBuilder(applicationName, OpenApiDefinition);
const utilities = new Convenience();

async function AppStartUp(rootRouter, DIContainer, application) {

    //Connect to DB or create DB Pool
    //Apply Migrations
    //Register Routes,Middleware,etc

    rootRouter
        .get("/", (req, res) => {
            res.send("Hello World");
        })
        .get("/error", (req, res) => {
            throw new Error("This is an error to validate final 'ErrorResponseTransformer' error handling of library");
        });

    //Configure your application.
    application.overrideAppPort(8080)                                                                //override the default port 8080
        .overrideHealthPort(8081)                                                                    //override the default health port 8081
        .registerApplicationMiddleware(utilities.helmetMiddleware(), ApplicationTypes.Both)            //register helmet middleware for both application and health
        .registerApplicationMiddleware(utilities.bodyParserURLEncodingMiddleware())                  //register body parser url middleware for application
        .registerApplicationMiddleware(utilities.bodyParserJSONEncodingMiddleware({ limit: '50M' })) //register body parser json middleware for application
        .overrideCatchAllErrorResponseTransformer((req, error) => ({                                 //override the default catch all error response transformer
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