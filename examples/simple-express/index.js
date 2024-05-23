import { ApplicationBuilder } from "../../dist/src/index.js";

const app = new ApplicationBuilder();

app.start()
    .then(() => {
        console.log("Server started");
    })
    .catch((error) => {
        console.log("Server Error:");
        console.log(error);
    });