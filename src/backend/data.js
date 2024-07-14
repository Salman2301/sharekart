import wixData from "wix-data";
import { rankPost, updateProductScore } from "backend/ranks";
import { DATABASE } from "public/constant";

import * as UserPost from "../public/types/database/user_post";
import * as UserReview from "../public/types/database/user_review";
import * as UserWishlistProduct from "../public/types/database/user_wishlist_product";

export async function user_post_beforeInsert(item) {
	return updateUserPost(item);
}

export async function user_post_beforeUpdate(item) {
	return updateUserPost(item);
}

export async function user_post_like_afterInsert(item) {
	return postLikeCount(item);
}

export async function user_post_like_afterRemove(item) {
	return postLikeCount(item);
}

export async function user_post_comment_like_afterInsert(item) {
	return commentLikeCount(item);
}

export async function user_post_comment_like_afterRemove(item) {
	return commentLikeCount(item);
}

export async function user_review_helpful_afterInsert(item, context) {
	await reviewCount(item);
}

export async function user_review_helpful_afterRemove(item, context) {
	await reviewCount(item);
}

export async function user_wishlist_product_beforeInsert(item) {
	return {
		...item,
		owner: item._owner,
		wishlistId: item.wishlist
	}
}

export async function user_wishlist_product_beforeUpdate(item) {
	return {
		...item,
		owner: item._owner,
		wishlistId: item.wishlist
	}
}


// ranks
	// on user post change
	// on user review change
	// on wishlist product chhange
/**
 * @param {UserPost.user_post} item 
 */
export async function user_post_afterInsert(item) {
	for await ( const lineitem of item.lineItems ) {
		await updateProductScore(lineitem.productId);
	}
	await rankPost();
}

/**
 * @param {UserReview.user_review} item 
 */
export function user_review_afterInsert(item) {
	updateProductScore(item.productId)
}

/**
 * @param {UserWishlistProduct.user_wishlist_product} item 
 */
export function user_wishlist_product_afterInsert(item) {
	updateProductScore(item.product_id)
}

// user follower
export function user_follow_afterInsert(item) {
	followerCount(item);
}

export function user_follow_afterRemove(item) {
	followerCount(item);
}


// helper func
async function reviewCount(item) {
	const reviewId = item.reivew;
	const count = await wixData.query(DATABASE.user_review_helpful).eq("review", reviewId).count({ suppressAuth: true })	
	
	const userReview = await wixData.get(DATABASE.user_review, reviewId);
	userReview.helpful = count;

	await wixData.update(DATABASE.user_review, userReview, { suppressAuth: true })
}

async function postLikeCount(item) {
	const postId = item.user_post;
	const count = await wixData.query(DATABASE.user_post_like).eq("user_post", postId).count({ suppressAuth: true })	
	
	const toUpdatePost = await wixData.get(DATABASE.user_post, postId);
	toUpdatePost.likeCount = count;

	await wixData.update(DATABASE.user_post, toUpdatePost, { suppressAuth: true })
}

async function commentLikeCount(item) {
	const commentId = item.comment_like;
	const count = await wixData.query(DATABASE.user_post_comment_like).eq("comment_like", commentId).count({ suppressAuth: true })	
	
	const toUpdateComment = await wixData.get(DATABASE.user_post_comment, commentId);
	toUpdateComment.likeCount = count;

	await wixData.update(DATABASE.user_post_comment, toUpdateComment, { suppressAuth: true })
}

async function followerCount(item) {
	const userId = item.followee;
	const count = await wixData.query(DATABASE.user_follow)
		.eq("followee", userId)
		.count({ suppressAuth: true });
	
	let userInfo = await wixData.get(DATABASE.user_info, userId, { suppressAuth: true }).catch(()=>({}));

	userInfo.followerCount = count;
	userInfo._id = userId;
	userInfo._owner = userId;
	await wixData.save(DATABASE.user_info, userInfo, { suppressAuth: true });
}

/**
 * 
 * @param {UserPost.user_post} item 
 * @returns {UserPost.user_post}
 */
function updateUserPost(item) {
	let totalPrice = 0, totalQty = 0, productIds = [];
	item.lineItems.forEach(lineItem=>{
		totalPrice += lineItem.totalPrice;
		totalQty += lineItem.quantity;
		productIds.push(lineItem.productId)
	})
	return {
		...item,
		productIds,
		totalPrice,
		totalQty
	}
}
