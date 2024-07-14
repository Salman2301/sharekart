import wixData from "wix-data";
import { Logger } from "public/log";
import { DATABASE } from "public/constant";

const logger = new Logger("backend:logger");

export async function logDelete() {

    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    
    logger.verbose(`Delete files before ${date.toDateString()}`);

    const res = await wixData.query(DATABASE.log)
        .lt("_createdDate", date.toISOString())
        .limit(999)
        .find({ suppressAuth: true });
    
    const ids = res.items.map(e=>e._id);
    logger.verbose(`Found total logs file :${res.length}`);

    await wixData.bulkRemove(DATABASE.log, ids, { suppressAuth: true });

    if( res.hasNext() ) logDelete();
}
