# express-service-bootstrap

<svg xmlns="http://www.w3.org/2000/svg" width="120.9" height="20" viewBox="0 0 1209 200" role="img" aria-label="license: Apache-2.0">
  <title>license: Apache-2.0</title>
  <linearGradient id="ddPBS" x2="0" y2="100%">
    <stop offset="0" stop-opacity=".1" stop-color="#EEE"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <mask id="PmVnz"><rect width="1209" height="200" rx="30" fill="#FFF"/></mask>
  <g mask="url(#PmVnz)">
    <rect width="476" height="200" fill="#555"/>
    <rect width="733" height="200" fill="#3C1" x="476"/>
    <rect width="1209" height="200" fill="url(#ddPBS)"/>
  </g>
  <g aria-hidden="true" fill="#fff" text-anchor="start" font-family="Verdana,DejaVu Sans,sans-serif" font-size="110">
    <text x="60" y="148" textLength="376" fill="#000" opacity="0.25">license</text>
    <text x="50" y="138" textLength="376">license</text>
    <text x="531" y="148" textLength="633" fill="#000" opacity="0.25">Apache-2.0</text>
    <text x="521" y="138" textLength="633">Apache-2.0</text>
  </g>
  
</svg>

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
    const apiDocs = utilities.swaggerAPIDocs(OpenApiDefinition);
    application.overrideAppPort(8080)                                                                                            //override the default port 8080(Default 3000)
        .overrideHealthPort(8081)                                                                                                //override the default health port 8081(Default 5678)
        .registerApplicationHandler(utilities.helmetMiddleware(), "*", 0, ApplicationTypes.Both)                                 //register helmet middleware for both application and health
        .registerApplicationHandler(utilities.bodyParserURLEncodingMiddleware(), "*", 1, ApplicationTypes.Main)                  //register body parser url middleware for application
        .registerApplicationHandler(utilities.bodyParserJSONEncodingMiddleware({ limit: '50M' }), "*", 2, ApplicationTypes.Main) //register body parser json middleware for application
        .registerApplicationHandler(apiDocs.router, apiDocs.hostingPath, 3, ApplicationTypes.Main)                               //register api docs
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
```

## Built with

1. Authors :heart: for Open Source.

## Contributions

1. New ideas/techniques are welcomed.
2. Raise a Pull Request.

## License

This project is contribution to public domain and completely free for use, view [LICENSE.md](/license.md) file for details.
