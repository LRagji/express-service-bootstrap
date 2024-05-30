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
```

## Built with

1. Authors :heart: for Open Source.

## Contributions

1. New ideas/techniques are welcomed.
2. Raise a Pull Request.

## License

This project is contribution to public domain and completely free for use, view [LICENSE.md](/license.md) file for details.
