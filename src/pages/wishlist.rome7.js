import wixData from "wix-data";
import wixWindow from "wix-window-frontend";
import { DATABASE } from "public/constant";
import { Logger } from "public/log";

const logger = new Logger("ui:lightbox:wishlist");

let selectedWishlist = {};

const COLOR = {
	DEFAULT: "#F0F0F0",
	SELECTED: "#95B9FF"
}

let productId;
$w.onReady(async function () {
	
	productId = wixWindow.lightbox.getContext();
	if( !productId ) {
		logger.error(`Failed to get the productId`);
		// return;
	}

	let debouncer;
	$w("#input1").onInput(async ()=>{
		if( debouncer ) return;
		handleFilter();
		debouncer = setTimeout(()=>{
			clearInterval(debouncer);
			debouncer = undefined;
		}, 120);
	});


	$w("#input1").onKeyPress(e=>{
		if(e.key === "Enter" ) {
			setTimeout(()=>{
				createWishlist();
			}, 200)
		}
	})

	$w("#btnWishlist").onClick(createWishlist);

	if(productId) {
		const resWishlistProd = await wixData.query(DATABASE.user_wishlist_product).eq("product_id", productId).find();

		selectedWishlist = resWishlistProd.items.reduce((obj, curr)=>{
			obj[curr.wishlist] = true;
			return obj;
		}, {});
	}


	await getWishlist();

	$w("#repeaterWishlist").onItemReady(($item, itemData)=>{

		$item("#textWishlist").text = itemData.title;

		$item("#boxWishlistItem").onClick(()=>{
			productId && setWishlist(productId, itemData._id);
		});
		$item("#btnDelWishlist").onClick(async()=>{
			await wixData.remove(DATABASE.user_wishlist, itemData._id);
			getWishlist();
		});
	});

	logger.verbose("init", { selectedWishlist })
	updateUiSelected();
});


async function handleFilter() {
	const val = $w("#input1").value;

	await getWishlist();

	if( val.length === 0 && $w("#repeaterWishlist").data.length > 0) {
		$w("#btnWishlist").collapse();
		return;
	}

	const items = $w("#repeaterWishlist").data;

	const isDuplicate = !!items.find(item => item.title===val );

	if( items.length > 0 ) {
		if( isDuplicate ) {
			$w("#btnWishlist").collapse();
		}
		else {
			$w("#btnWishlist").label = `Create "${val}"?`;
			$w("#btnWishlist").expand();
		}
	}
	else {
		if( val.length > 0 ) {
			$w("#btnWishlist").label = `Create "${val}"?`;
			$w("#btnWishlist").expand();
		}
		else {
			$w("#btnWishlist").collapse();
		}
	}
}

async function getWishlist() {
	const filter = $w("#input1").value;
	
	let q = wixData.query(DATABASE.user_wishlist);
	if(filter) q = q.contains("title", filter);
	const { items } = await q.find();
	$w("#repeaterWishlist").data = items;

	updateUiSelected();

	if( $w("#input1").value.length === 0 && $w("#repeaterWishlist").data.length === 0) {
		$w("#input1").label = "Enter a wishlist";
		$w("#btnWishlist").expand();
		$w("#btnWishlist").label = "Create";
	}
}

function updateUiSelected() {
	$w("#repeaterWishlist").forEachItem(($item, itemData)=>{
		$item("#boxWishlistItem").style.backgroundColor = COLOR[ selectedWishlist[itemData._id] ? "SELECTED": "DEFAULT"]
	});
}

async function setWishlist(prodId, wishlistId) {
	if(selectedWishlist[wishlistId] ) {
		const res = await wixData.query(DATABASE.user_wishlist_product)
		.eq("wishlist", wishlistId)
		.eq("product_id", prodId).find();
		
		await wixData.remove(DATABASE.user_wishlist_product, res.items[0]._id);
		selectedWishlist[wishlistId] = false;
	}
	else {
		await wixData.insert(DATABASE.user_wishlist_product, {
			wishlist: wishlistId,
			product_id: prodId
		});
		selectedWishlist[wishlistId] = true;
	}

	updateUiSelected()
}

async function createWishlist() {
	const val = $w("#input1").value;
	if(!val) return;
	const inserted = await wixData.insert(DATABASE.user_wishlist,{
		title: val
	});

	if (productId) {
		await wixData.insert(DATABASE.user_wishlist_product,{
			wishlist: inserted._id,
			product_id: productId
		})

		selectedWishlist[inserted._id] = true;
	}

	$w("#input1").value = "";
	$w("#btnWishlist").collapse();
	await getWishlist();
	// updateUiSelected();
}

