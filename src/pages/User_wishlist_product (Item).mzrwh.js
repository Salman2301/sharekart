import wixStoresV2 from 'wix-stores.v2';
import wixLocation from "wix-location-frontend";

import { slugify } from 'public/utils';
import { Logger } from 'public/log';

const logger = new Logger("ui:wishlist");
$w.onReady(function () {

	$w("#repeater1").onItemReady(async ($item, itemData)=>{
		const prod = await getProduct(itemData.product_id);
		if(prod) {
			$item("#textProdTitle").text = prod.name;
			$item("#imgProd").src = prod.media.mainMedia.image.url;
		}
		else {
			$item("#boxProd").collapse();
		}

		$item("#btnAddToCart").onClick(()=>{
			wixLocation.to(`/product-page/${slugify(prod.name)}`);
		});
	});
});

const cache = new Map();

/**
 * @returns {Promise<Awaited<ReturnType<wixStoresV2["products"]["getProduct"]>>["product"]>}
 */
async function getProduct(prodId) {
	if ( cache.has(prodId) ) return cache.get(prodId);
	try {
		const prod = await wixStoresV2.products.getProduct(prodId);
		cache.set(prodId, prod.product);
		return prod.product;
	}
	catch {
		logger.error(`Failed to get the product info: ${prodId}`);
		return;
	}
}
