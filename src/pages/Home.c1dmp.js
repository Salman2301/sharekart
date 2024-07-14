import wixUsers from "wix-users";
import wixData from "wix-data";
import wixWindow from "wix-window";
import wixLocation from "wix-location";
import realtime from "wix-realtime-frontend";

import { formatNum, slugify } from "public/utils";
import { checkLogin } from "public/user.utils";
import { cart } from "wix-stores";
import { Logger } from "public/log";
import { getUserInfo, emitEventAddToCart } from "backend/user.web";
import { CHANNEL, DATABASE, LIGHTBOX } from "public/constant";

import * as UserPostComment from "public/types/database/user_post_comment";
import * as UserPost from "public/types/database/user_post";

/** @type {UserPost.user_post} */
let currentCommentPost;

const logger = new Logger("ui:home");

$w.onReady(async ()=>{
    const res = await wixData.query(DATABASE.global_post_rank)
        .include("user_post")
        .descending("score")
        .find();

    console.log({ res })



    realtime.subscribe(CHANNEL.new_post, item=>{
        $w("#boxNewOrder").show("slide", {duration: 700})
        setTimeout(()=>{
            $w("#boxNewOrder").hide("slide", {duration: 700})
        }, 12_000)
    }).catch((err)=>{
        logger.error(`Failed to init realtime:`, err);
    });

    $w("#btnWishlist").onClick(async ()=>{
        const res = await wixData.query(DATABASE.user_wishlist).eq("_owner", wixUsers.currentUser.id).find();
        if( res.length > 0 ) {
            wixLocation.to(`/wishlist/${wixUsers.currentUser.id}/${res.items[0]._id}`)
        }
        else {
            wixWindow.openLightbox(LIGHTBOX.wishlist)
        }
    });

    $w("#repeaterPost").data = res.items.map(item=>item.user_post);
    $w("#repeaterPost").onItemReady(handleItemReadyPost);
    $w("#repeaterComment").onItemReady(handleItemReadyComment);
    $w("#tableLineItems").onRowSelect(item=>{
        if( !item.rowData._id ) return;
        logger.verbose(`Redirecting to ${`/product-page/${slugify(item.rowData.product)}`}`);
        wixLocation.to(`/product-page/${slugify(item.rowData.product)}`);
    });

    $w("#btnCommentSend").onClick(async ()=>{
        await checkLogin();
        /** @type {Partial<UserPostComment.user_post_comment>} */
        const toInsert = {
            comment: $w("#textBoxComment").value,
            post: currentCommentPost._id,
            likeCount: 0
        }
        await wixData.insert(DATABASE.user_post_comment, toInsert);

        $w("#textBoxComment").value = null;
        refreshCommentUi();
    });
});

/**
 * @param {$w.$w} $item
 * @param {UserPost.user_post} itemData
 */
async function handleItemReadyPost($item, itemData) {
    let isFollowing = false;
    let isLiking = false;

    $item("#textPost").text = itemData.post;
    $item("#textPostLike").text = formatNum(itemData.likeCount);
    $item("#textOrder").text = `#${itemData.orderId}`;
    let rows = itemData.lineItems.map(lineItemMap);
    rows.push({
        _id: null,
        qty: `x${itemData.totalQty}`,
        price:  `₹${itemData.totalPrice}`,
        product: "Total",
        photo: null
    })
    $item("#tableLineItems").rows = rows;

    if( itemData._owner === wixUsers.currentUser.id ) $item("#userPostDel").show();

    if(!currentCommentPost) initCommentMessage($item, itemData);

    $item("#imgComment").onClick(()=>{
        initCommentMessage($item, itemData);
    });
    $item("#boxRepeaterPost").onClick(()=>{
        initCommentMessage($item, itemData);
    });

    $item("#userPostDel").onClick(async()=>{
        await wixData.remove(DATABASE.user_post, itemData._id);
        $item("#boxRepeaterPost").collapse();
    });

    $item("#imgPostNotLike").onClick(async ()=>{
        await checkLogin();

        if(isLiking) return;
        isLiking = true;

        const likeCount = +$item("#textPostLike").text;
        if(!isNaN(likeCount)) $item("#textPostLike").text = String(likeCount + 1);

        markLikePost($item, true);
        await wixData.insert(DATABASE.user_post_like, { user_post: itemData._id });
        isLiking = false;
    });


    $item("#imgPostLike").onClick(async ()=>{
        await checkLogin();

        if( isLiking ) return;
        isLiking = true;

        const likeCount = +$item("#textPostLike").text;
        if(!isNaN(likeCount)) $item("#textPostLike").text = String(likeCount - 1);

        markLikePost($item, false);
      
        // dislike - remove the data
        const res = await wixData.query(DATABASE.user_post_like)
            .eq("_owner", wixUsers.currentUser.id)
            .eq("user_post", itemData._id).find();


        if( res.length > 0 ){
            await wixData.remove(DATABASE.user_post_like,res.items[0]._id);
        }
        else {
            logger.warn(`Corrupt data found: user_post_like post_like field ${itemData._id}`);
        }

        isLiking = false;
    });

    $item("#imgUserFollow").onClick(async ()=>{
        await checkLogin();
        if(isFollowing) return;
        isFollowing = true;

        const res = await wixData.query(DATABASE.user_follow)
            .eq("follower", wixUsers.currentUser.id)
            .eq("followee", itemData._owner)
            .find();
        
        if( res.length > 0 ) {
            await wixData.remove(DATABASE.user_follow, res.items[0]._id);
        }
        else {
            logger.warn(`Corrupt data found: follower ${itemData._owner} - followee ${wixUsers.currentUser.id}`)
        }
        // markFollowPost($item, false);
        const allPostToUpdate = $w("#repeaterPost").data.filter(item=>item._owner === itemData._owner).map(item=>item._id);

        $w("#repeaterPost").forItems([...allPostToUpdate], ($item)=>{
            markFollowPost($item, false);
        });
        isFollowing = false;
    });

    $item("#imgUserNotFollow").onClick(async ()=>{
        await checkLogin();

        if(isFollowing) return;
        isFollowing = true;

        await wixData.insert(DATABASE.user_follow, {
            follower: wixUsers.currentUser.id,
            followee: itemData._owner
        });

        // markFollowPost($item, true);
        const allPostToUpdate = $w("#repeaterPost").data.filter(item=>item._owner === itemData._owner).map(item=>item._id);

        $w("#repeaterPost").forItems([...allPostToUpdate], ($item)=>{
            markFollowPost($item, true);
        });
        isFollowing = false;
    });
    

    $item("#imgCart").onClick(async ()=>{

        $item("#imgCart").hide();
        await cart.addProducts(itemData.lineItems.map(item=>({
            productId: item.productId,
            quantity: item.quantity,
            options: {
                choices: Object.fromEntries(item.options.map(item=>([item.option, item.selection])))
            }
        })));
        emitEventAddToCart(itemData._id);

        $item("#imgCartDone").show("fade");
        setTimeout(()=>{
            $item("#imgCartDone").hide();
            $item("#imgCart").show();
        }, 2_000)
    });

    const [
        { displayName, image },
        countFollow,
        countPostLike
     ] = await Promise.all([
        getPublicUserInfo(itemData._owner),
        wixData.query(DATABASE.user_follow)
            .eq("follower", wixUsers.currentUser.id)
            .eq("followee", itemData._owner)
            .count(),

        wixData.query(DATABASE.user_post_like)
            .eq("_owner", wixUsers.currentUser.id)
            .eq("user_post", itemData._id)
            .count()
     ]);

    if( itemData._owner === wixUsers.currentUser.id ) {
        $item("#imgUserFollow").hide();
        $item("#imgUserNotFollow").hide();
    }
    else {
        markFollowPost($item, !!countFollow);
    }
    
    $item("#textFullName").text = displayName;
    $item("#imgProfile").src = image;

    markLikePost($item, !!countPostLike);    
}

/**
 * @param {$w.$w} $item
 * @param {UserPostComment.user_post_comment} itemData
 * @param {number} index
 */
async function handleItemReadyComment($item, itemData, index) {
    let isLiking = false;
    $item("#textCommentLike").text = !!itemData.likeCount ? formatNum(itemData.likeCount) : "";
    $item("#textCommentValue").text = itemData.comment;

    $item("#imgNotLiked").onClick(async ()=>{
        await checkLogin();

        if(isLiking) return;
        isLiking = true;

        const likeCount = +$item("#textCommentLike").text;
        if(!isNaN(likeCount)) $item("#textCommentLike").text = String(likeCount + 1);

        markLikeComment($item, true);
        await wixData.insert(DATABASE.user_post_comment_like, { comment_like: itemData._id });
        isLiking = false;
    });


    $item("#imgLiked").onClick(async ()=>{
        await checkLogin();

        if(isLiking) return;
        isLiking = true;

        const likeCount = +$item("#textCommentLike").text;
        if(!isNaN(likeCount)) $item("#textCommentLike").text = String(likeCount - 1);

        markLikeComment($item, false);

        // dislike - remove the data
        const res = await wixData.query(DATABASE.user_post_comment_like)
            .eq("_owner", wixUsers.currentUser.id)
            .eq("comment_like", itemData._id).find();


        if( res.length > 0 ){
            await wixData.remove(DATABASE.user_post_comment_like,res.items[0]._id);
        }
        else {
            logger.warn(`Corrupt data found: user_post_comment_like comment_like field ${itemData._id}`);
        }

        isLiking = false;

    });

    if(itemData._owner === wixUsers.currentUser.id ) {
        $item("#imgCommentDel").show();
    }

    $item("#imgCommentDel").onClick(async ()=>{
        await wixData.remove(DATABASE.user_post_comment, itemData._id);
        $item("#boxRepeaterComment").collapse();
    });

    const [
        { displayName, image },
        countLiked
    ] = await Promise.all([
        await getPublicUserInfo(itemData._owner),
        wixData.query(DATABASE.user_post_comment_like)
        .eq("_owner", wixUsers.currentUser.id)
        .eq("comment_like", itemData._id)
        .count()
    ]);

    $item("#textCommentItemFullname").text = displayName;
    $item("#imgCommentItem").src = image;

    markLikeComment($item, !!countLiked);    
}


/**
 * Init left comment section for the selected post
 * @param {$w.$w} $item Current repoeaterPost item
 * @param {UserPost.user_post} userPost post
 */
async function initCommentMessage($item, userPost) {
    // reset the comment ui for the last selected item
    if(currentCommentPost) {
        $w("#repeaterPost").forItems([currentCommentPost._id], ($lastItem)=>{
            $lastItem("#imgComment").show();
            $lastItem("#imgCommentActive").hide();
        });
    }

    $item("#imgComment").hide();
    $item("#imgCommentActive").show();

    currentCommentPost = userPost; 

    const { displayName, image } = await getPublicUserInfo(userPost._owner);
    $w("#textCommentFullname").text = displayName;
    $w("#textCommentOrder").text = `#${userPost.orderId}`;

    refreshCommentUi();
}

async function refreshCommentUi() {
    const resComment = await wixData.query(DATABASE.user_post_comment)
        .eq("post", currentCommentPost._id)
        .find();

    $w("#repeaterComment").data = resComment.items;
    $w("#boxComment").show();

    $w("#textNoComments")[resComment.length === 0 ? "expand": "collapse"]();
}


/**
 * @param {$w.$w} $item
 * @param {boolean} bool
 */
function markFollowPost($item, bool) {
    if( bool ) {
        $item("#imgUserFollow").show();
        $item("#imgUserNotFollow").hide();
    }
    else {
        $item("#imgUserNotFollow").show();
        $item("#imgUserFollow").hide();
    }
}


/**
 * 
 * @param {$w.$w} $item 
 * @param {boolean} bool 
 */
function markLikePost($item, bool) {
    if( bool ) {
        $item("#imgPostLike").show();
        $item("#imgPostNotLike").hide();
    }
    else {
        $item("#imgPostNotLike").show();
        $item("#imgPostLike").hide();
    }
}
/**
 * 
 * @param {$w.$w} $item 
 * @param {boolean} bool 
 */
function markLikeComment($item, bool) {
    if( bool ) {
        $item("#imgLiked").show();
        $item("#imgNotLiked").hide();
    }
    else {
        $item("#imgNotLiked").show();
        $item("#imgLiked").hide();
    }
}

const infoMap = new Map();

/**
 * 
 * @param {string} userId 
 * @returns {Promise<{displayName: string, image: string }>}
 */
async function getPublicUserInfo(userId) {
    if( infoMap.get(userId) ) return infoMap.get(userId);
    
    const info = await getUserInfo(userId);
    infoMap.set(userId, info);
    return info;
}

/**
 * 
 * @param {UserPost.user_post["lineItems"][number]} lineItem 
 */
function lineItemMap(lineItem) {
    return {
        _id: lineItem.productId,
        photo: lineItem.mediaItem.src,
        product: lineItem.name,
        qty: `x${lineItem.quantity}`,
        price: `₹${lineItem.totalPrice}`
    }
}
