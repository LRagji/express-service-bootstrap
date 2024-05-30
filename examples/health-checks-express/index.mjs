import { ApplicationBuilder, ApplicationShutdownStatus, ApplicationStartupStatus, ApplicationStatus } from "../../dist/src/index.js";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const applicationName = "Test Health Checks App";
const app = new ApplicationBuilder(applicationName);

async function AppStartUp(rootRouter, DIContainer) {

    //Connect to DB or create DB Pool
    //Apply Migrations
    //Register Routes,Middleware,etc

    rootRouter.get("/", (req, res) => {                //Register a route
        res.send("Hello World");
    });

    await delay(1000);                                  // Indicate that the startup process takes some time

    console.log("Application started successfully.");
    return {
        status: ApplicationStartupStatus.UP,            // Indicates startup was successful
        data: { message: "Connected to database" }      // Additional data to be returned(Optional)
    };
}

async function AppShutdown() {
    //Clean Up Resources
    //Close DB Connections

    await delay(1000);                                   // Indicate that the shutdown process takes some time

    console.log("Application shutdown called.");
    return {
        status: ApplicationShutdownStatus.STOPPED,       // Indicates shutdown was successful
        data: { message: "Disconnected from database" }  // Additional data to be returned(Optional)
    };
}

async function Health_Live() {
    // This is am i alive check
    // Test for memory, disk, cpu, etc

    await delay(1000);                                    // simulate a check that takes some time

    console.log("Live Probe called.");
    return {
        status: ApplicationStatus.UP,                     // Indicates the application is alive
        data: { message: "I am alive" }                   // Additional data to be returned(Optional)
    };
}

async function Health_Ready() {
    // This is am i ready to server requests check
    // Test for dependencies etc like connectivity to DB and immediate dependencies(not services)

    await delay(1000);                                   // simulate a check that takes some time

    console.log("Ready Probe called.");
    return {
        status: ApplicationStatus.UP,                   // Indicates the application is ready to serve
        data: { message: "I am ready to serve" }        // Additional data to be returned(Optional)
    };
}

app.overrideStartupHandler(AppStartUp)
    .overrideShutdownHandler(AppShutdown)
    .overrideLivenessProbe({ "check": Health_Live })
    .overrideReadinessProbe({ "check": Health_Ready })
    .overrideAppPort(8080)
    .overrideHealthPort(8081)
    .start()
    .then(() => console.log(`${applicationName} started successfully.`))
    .catch(console.error);


//*******************************
// You can wait for your application to be called by process exit signal
// OR
// If you are done call the Dispose method to stop the application
// await app[Symbol.asyncDispose](); //stop the application and release all resources
//*******************************
