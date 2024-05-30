import { ApplicationBuilder, ApplicationStartupStatus } from "../../dist/src/index.js";
import * as OpenApiDefinition from "./api-def.json" with { type: "json" };
import bodyParser from "body-parser";

const applicationName = "Test Simple App";
const app = new ApplicationBuilder(applicationName, OpenApiDefinition);

async function AppStartUp(rootRouter, DIContainer) {

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

    return {
        status: ApplicationStartupStatus.UP,            // Indicates startup was successful
        data: { message: "Connected to database" }      // Additional data to be returned(Optional)
    };
}

app.overrideStartupHandler(AppStartUp)
    .overrideAppPort(8080)                                                  //override the default port 8080
    .overrideHealthPort(8081)                                               //override the default health port 8081
    .overrideBodyParserJsonConfiguration(bodyParser.json({ limit: '50M' })) //override the default body parser configuration
    .overrideCatchAllErrorResponseTransformer((req, error) => ({            //override the default catch all error response transformer
        path: req.path,
        status: 500,
        body: { message: error.message }
    }))
    .start()
    .then(() => console.log(`${applicationName} started successfully.`))
    .catch(console.error);


//*******************************
// You can wait for your application to be called by process exit signal
// OR
// If you are done call the Dispose method to stop the application
// await app[Symbol.asyncDispose](); //stop the application and release all resources
//*******************************