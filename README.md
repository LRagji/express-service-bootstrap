# express-service-bootstrap

This is a convenience package for starting a express based API server with

1. General API Security - (helmet based)
2. Health checks - K8S Health Probes
3. Process exits listeners - Your API server should shutdown as gracefully as possible when it receives any shutdown signals from OS.
4. Include your API documentation - Swagger UI express.
5. Singleton DI container - possibly the best pattern to follow, yet completely flexible and ignorable.
6. Creator pattern - don't use new keyword, this helps in writing better unit tests and mockable classes and features.

## Getting Started

1. Please find example code usage in [examples folder](https://github.com/LRagji/express-service-bootstrap/tree/main/examples/)

```javascript
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
    .then(() => console.log("Application started successfully."))
    .catch(console.error);


//*******************************
// You can wait for your application to be called by process exit signal
// OR
// If you are done call the Dispose method to stop the application
// await app[Symbol.asyncDispose](); //stop the application and release all resources
//*******************************


main().catch(console.error);
```

## Built with

1. Authors :heart: for Open Source.

## Contributions

1. New ideas/techniques are welcomed.
2. Raise a Pull Request.

## License

This project is contribution to public domain and completely free for use, view [LICENSE.md](/license.md) file for details.
