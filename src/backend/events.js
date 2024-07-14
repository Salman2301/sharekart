import { Logger } from "public/log";
import { updateProductScore } from "./ranks";

const logger = new Logger("event:inventory");

export function wixStores_onInventoryVariantUpdated(event) {
    const productId = event.productId;
    logger.info("productId", productId);
    updateProductScore(productId);
}
