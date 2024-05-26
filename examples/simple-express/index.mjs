import { ApplicationBuilder } from "../../dist/src/index.js";
import * as OpenApiDefinition from "./api-def.json" with { type: "json" };
import { Router } from "express"
import bodyParser from "body-parser";

async function main() {
    const applicationName = "Test Simple App";
    const testRouter = Router()
        .get("/", (req, res) => {
            res.send("Hello World");
        })
        .get("/error", (req, res) => {
            throw new Error("This is an error to validate final 'ErrorResponseTransformer' error handling of library");
        });

    const app = new ApplicationBuilder(applicationName, OpenApiDefinition)
        .registerApplicationRoutes("/", testRouter)                             //register the router for your application.
        .overrideAppPort(8080)                                                  //override the default port 8080
        .overrideHealthPort(8081)                                               //override the default health port 8081
        .overrideBodyParserJsonConfiguration(bodyParser.json({ limit: '50M' })) //override the default body parser configuration
        .overrideCatchAllErrorResponseTransformer((req, error) => ({            //override the default catch all error response transformer
            path: req.path,
            status: 500,
            body: { message: error.message }
        }));


    await app.start();// start the application

    console.log(`${applicationName} started`);
    //*******************************
    // You can wait for your application to be called by process exit signal
    // OR
    // If you are done call the Dispose method to stop the application
    // await app[Symbol.asyncDispose](); //stop the application and release all resources
    //*******************************
}


main().catch(console.error);