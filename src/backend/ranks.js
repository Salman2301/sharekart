import wixData from "wix-data";
import { DATABASE } from "../public/constant";
import { products } from "wix-stores.v2";
import { Logger } from "public/log";
import { differenceInSeconds } from "date-fns";
import { round } from "public/utils";

import * as UserPost from "../public/types/database/user_post";
import * as UserInfo from "../public/types/database/user_info";


const logger = new Logger("backend:rank");

// MAX_SCORE: 1000
const WEIGHT = {
    // user weight, In future, weight should be based on percentile for proper distribution
    USER_FOLLOWER: 5,
    
    POST_LIKE: 30,
    POST_COMMENT_COUNT: 20,
    POST_ADD_TO_CART: 50,
    POST_CREATED: 500,
    
    PER_PRODUCT: 5, // More products is better score 

    // For each product in that post
    PRODUCT_REBOUGHT: 20,
    PRODUCT_RATING_POSTIVE: 15, // rating from 3-5
    PRODUCT_RATING_NEGATIVE: -20, // rating below 3
    PRODICT_REVIEW_COUNT: 0,
    PRODUCT_WISHLIST: 5,
    
    INVENTORY_INSTOCK: 50,
    INVENTORY_LABEL_ON_SALE: 50
  }



export async function rankPost() {
    logger.info(`rank-post -- start -- `);
    // Ranks post based product inventory, product rating, user engagement (add-to-cart)
    const [
        { items: posts },

    ] = await Promise.all([
        // get the latest post info
        wixData.query(DATABASE.user_post).descending("_createdDate").find(),
    ]);

    logger.info(`rank-post -- found: ${posts.length} -- `);

    for await( const post of posts ) {
        await postScore(post._id);
    }
    logger.info(`rank-post -- successfuly completed total: ${posts.length} -- `);

}

export async function postScore(postId) {
    const res = await wixData.query(DATABASE.user_post).eq("_id", postId).find();
    /**@type {UserPost.user_post} */
    const post = res.items[0];

    if(!post) {
        return logger.error(`Failed to get the post id ${postId}`);
    }

    /** @type {[ UserInfo.user_info, any, any]} */
    const [
        user_info,
        { items: [commentAgg={}] },
        { items: [addToCartAgg={}] },
    ]
    = await Promise.all([
        wixData.get(DATABASE.user_info, post._owner, { suppressAuth: true }),
        wixData.aggregate(DATABASE.user_post_comment).filter(wixData.filter().eq("post", "postId")).count().run(),
        wixData.aggregate(DATABASE.user_post_event).filter(wixData.filter().eq("postId", postId).eq("type", "add_to_cart")).count().run(),
    ]);

    const { count: addToCartCount } = addToCartAgg;
    const { count: commentCount } = commentAgg;

    const prodScore = await getProdScoreMap();

    let lineItemScore = [];
    post.lineItems.forEach(item=>{
        lineItemScore.push(prodScore.get(item.productId));
    });

    const followerScore = WEIGHT.USER_FOLLOWER * toNum(user_info.followerCount);
    const addToCartScore = WEIGHT.POST_ADD_TO_CART *  addToCartCount;
    const commentScore = WEIGHT.POST_COMMENT_COUNT *  commentCount;
    const latestScore = getLatestScore(post);
    const productsScore = round(lineItemScore.reduce((a,b)=>a+=b, 0) / lineItemScore.length);
    const perProdScore = WEIGHT.PER_PRODUCT * post.lineItems.length;

    const scoreInfo = {
        followerScore,
        addToCartScore,
        commentScore,
        latestScore,
        productsScore,
        perProdScore
    };

    const score = toSum([
        scoreInfo.followerScore,
        scoreInfo.addToCartScore,
        scoreInfo.commentScore,
        scoreInfo.latestScore,
        scoreInfo.productsScore,
        scoreInfo.perProdScore
    ]);

    await wixData.save(DATABASE.global_post_rank, {
        _id: post._id,
        user_post: post._id,
        score,
        scoreInfo
    });
}

/**
 * Calculate the score based on expontential decay
 * based on post created, the sooner the post is the higher the score
 * @param {UserPost.user_post} post 
 * @returns {number}
 */
function getLatestScore(post) {
    const currentTime = new Date();
    const inputDate = new Date(post._createdDate);
    const initialScore = WEIGHT.POST_CREATED;
    const decayRate = 0.4 / (24 * 60 * 60); // Adjusting decay rate for seconds
    const secondsDifference = differenceInSeconds(currentTime, inputDate);
    // console.log({secondsDifference})
    const score = initialScore * Math.exp(-decayRate * secondsDifference);
    return round(score);
}

/**
 * 
 * @returns {Promise<Map<string, number>>}
 */
async function getProdScoreMap() {
    const res = await wixData.query(DATABASE.product_rank).limit(100).find();
    const map = new Map();
    res.items.forEach(item=>{
        map.set(item._id, item.score);
    });
    return map;
}


export async function productScore(productId) {
    // calculate the product score based on rating, inventory, wishlist

	let filterRating = wixData.filter();
	filterRating = filterRating.eq("productId", productId);

    let filterWishlist = wixData.filter();
	filterWishlist = filterWishlist.eq("product_id", productId);
    
	const [
        { items: [reboughtAgg={}] },
        { items: [ratingAgg={}] },
        { items: [wishlistAgg={}] },
        { items: [ product ] }
    ] = await Promise.all([
        wixData.aggregate(DATABASE.user_post).filter(wixData.filter().hasSome("productIds", productId)).count().run(),
        wixData.aggregate(DATABASE.user_review).filter(filterRating).avg("rating", "rating").count().run(),
        wixData.aggregate(DATABASE.user_wishlist_product).filter(filterWishlist).count().run(),
        wixData.query(DATABASE["Stores/Products"]).eq("_id", productId).find({ suppressAuth: true }),
    ]);

    const { count: reboughtCount } = reboughtAgg;
    const { count: ratingCount, rating } = ratingAgg;
    const { count: wishlistCount } = wishlistAgg;
    
    const scoreInfo = {
        rebought: reboughtCount * WEIGHT.PRODUCT_REBOUGHT,
        rating: rating >= 3 
            ? (rating - 2) * ratingCount * WEIGHT.PRODUCT_RATING_POSTIVE 
            : rating * ratingCount * WEIGHT.PRODUCT_RATING_NEGATIVE,
        wishlist: wishlistCount * WEIGHT.PRODUCT_WISHLIST,
        prodInventory: product.inStock ? 1 * WEIGHT.INVENTORY_INSTOCK : 0,
        prodOnSale: product.ribbons.map(e=>e.text).includes("ON SALE")
    }


    const score = toSum([
        scoreInfo.rating,
        scoreInfo.rebought,
        scoreInfo.wishlist,
        scoreInfo.prodInventory,
        scoreInfo.prodOnSale
    ]);

    return {
        score,
        scoreInfo
    };

}

// This function runs when review, wishlist, inventory changes
export async function updateProductScore(productId) {
    const res = await products.queryProducts().eq("_id", productId).limit(1).find();

    const { score, scoreInfo} = await productScore(res.items[0]._id);
    
    await wixData.save(DATABASE.product_rank, {
        score,
        scoreInfo,
        _id: productId
    })
}


// max can update 100 product wix store limit
export async function updateAllProductScore() {
    const res = await products.queryProducts().limit(100).find();

    const toSave =  await Promise.all(res.items.map(async item=>({
        _id: item._id,
        ...(await productScore(item._id)),
    })));

    logger.info({ toSave })
    await wixData.bulkSave(DATABASE.product_rank, toSave)
}

// helper function
function toSum(nums) {
    return nums.reduce((sum, val)=>sum+=toNum(val), 0);
}
function toNum(num) {
    return isNaN(Number(num)) ? 0 : Number(num);
}


/**
 User score
    - Follower count
 Post score
    - Engagement
        - like
        - add to cart
        - comments
 Product score
    - Repeated bought
    - Rating and review
    - Wishlist
    - Post created
 Invetory score
    - Product availabilty
    - Label ( On-Sales )

 */
