import wixData from "wix-data";
import { DATABASE } from "./constant";

export class Logger {
    constructor(place) {
        this.place = place;
    }
    verbose(...arg) {
        console.log(...arg);
        this.insertLog(arg, "verbose");
    }
    log(...arg) {
        console.log(...arg);
        this.insertLog(arg, "info");
    }

    warn(...arg) {
        console.warn(...arg);
        this.insertLog(arg, "warn");
    }

    error(...arg) {
        console.error(...arg);
        this.insertLog(arg, "error");
    }

    info(...arg) {
        this.log(arg);
    }

    insertLog(message, type) {
        wixData.insert(DATABASE.log, {
            place: this.place,
            message: message,
            type,
            trace: (new Error()).stack,
            mainMessage: String(message?.[0])
        })
    }
}