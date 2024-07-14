import wixWindow from 'wix-window';
import wixData from "wix-data";
import wixUsers from 'wix-users';
import wixLocation from 'wix-location-frontend';

import { round } from "public/utils";
import { checkLogin } from "public/user.utils";
import { getUserFullName, getProductFollowerInfo } from "backend/user.web";
import { DATABASE, LIGHTBOX } from "public/constant";
import { Logger } from 'public/log';

const logger = new Logger("ui:product");
let lastProd;

$w.onReady(async function () {
	$w("#imgSaved").onClick(openLightbox);
	$w("#imgEmpty").onClick(openLightbox);
	
	initService();
	wixLocation.onChange(async ()=>{
		// on product change
		initService()
	});

	// review event
	$w("#dsUserReview").onBeforeSave(async ()=>{
		try {
			const fullName = await getUserFullName();
			await $w("#dsUserReview").setFieldValues({
				name: fullName,
				productId: (await getProd())._id
			});
			return true;
		}
		catch(e) {
			logger.error(e);
			return false;
		}
	});

	$w("#dsUserReview").onAfterSave(()=>{
		$w("#dsUserReviewRead").refresh();
		calcRatingAvg();
	});

	$w("#repeaterReview").onItemReady(($item, itemData)=>{
		$item("#textReviewName").text = `~ ${itemData.name}`;
		$item("#btnReviewHelpful").onClick(async ()=>{
			await checkLogin();
			await wixData.insert(DATABASE.user_review_helpful, {
				review: itemData._id
			});
			$item("#btnReviewHelpful").hide();
		});

		if(itemData._owner === wixUsers.currentUser.id ) {
			$item("#btnReviewHelpful").collapse();
		}
	});

	
});

async function initService() {
	lastProd = undefined;
	await getProd();
	initWishlist();
	filterReview();
	initFollowerService();
}

async function filterReview() {
	const prod = await getProd();
	let filter = wixData.filter();
	filter = filter.eq("productId", prod._id);

	await $w("#dsUserReviewRead").setFilter(filter);
	calcRatingAvg();

}

async function initFollowerService() {
	const prod = await getProd();
	$w(`#imgFollow1`).hide();
	$w(`#imgFollow2`).hide();
	$w(`#imgFollow3`).hide();
	$w(`#imgFollow4`).hide();
	$w(`#imgFollow5`).hide();
	$w("#textUserFollow").hide();
	const followerList = await getProductFollowerInfo(prod._id);

	followerList.forEach(({image}, index)=> {
		//@ts-ignore
		$w(`#imgFollow${index+1}`).src = image;
		//@ts-ignore
		$w(`#imgFollow${index+1}`).show();
	});

	if(followerList.length > 0 ) $w("#textUserFollow").show();
}

async function calcRatingAvg() {

	const prod = await getProd();
	let filter = wixData.filter();
	filter = filter.eq("productId", prod._id);

	const { items: [item]} = await wixData.aggregate(DATABASE.user_review).filter(filter).avg("rating", "rating").count().run();

	if( !item ) {
		$w("#textReviewTtl").collapse();
	}
	else {
		const { count, rating } = item;
		$w("#textReviewTtl").text = `${round(rating)} rating from ${count} reviewers.`;
		$w("#textReviewTtl").expand();
	}
}

async function getProd() {
	if( lastProd ) return lastProd;
	lastProd = await $w("#productPage1").getProduct();
	return lastProd;
}

async function initWishlist() {
	const prod = await getProd();
	const { length } = await wixData.query(DATABASE.user_wishlist_product).eq("product_id", prod._id).find();

	if( length === 0 ) {
		$w("#imgEmpty").show();
		$w("#imgSaved").hide();
	}
	else {
		$w("#imgSaved").show();
		$w("#imgEmpty").hide();
	}

}

async function openLightbox() {
	await checkLogin();
	const prod = await $w("#productPage1").getProduct();

	await wixWindow.openLightbox(LIGHTBOX.wishlist, prod._id)
	initWishlist();
}
