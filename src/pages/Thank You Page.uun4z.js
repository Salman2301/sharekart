import { LIGHTBOX } from "public/constant";
import { Logger } from "public/log";
import * as Types from "public/types/order";
import wixWindow from "wix-window-frontend";

const logger = new Logger("ui:thankyou");
$w.onReady(async ()=>{
    try {
        /** @type {Types.order} */ // @ts-ignore
        const order = await $w("#thankYouPage1").getOrder();

        const { number, lineItems, totals: { subtotal: total }, currency, } = order;

        // delete sensitive information before saving to db
        delete order.billingInfo;
        delete order.buyerInfo;
        delete order.shippingInfo;


        await wixWindow.openLightbox(LIGHTBOX.post, {
            order: {
                orderId: number,
                lineItems,
                total,
                currency,
                raw: order
            }
        })
    }
    catch(e) {
        logger.error(e);
    }
});

