// This is a duplicate of the Home.c1dmp.js file
import wixUsers from "wix-users";
import wixData from "wix-data";
import wixLocation from "wix-location";
import realtime from "wix-realtime-frontend";

import { formatNum, slugify } from "public/utils";
import { cart } from "wix-stores";
import { getUserInfo } from "backend/user.web";
import { CHANNEL, DATABASE } from "public/constant";

import * as UserPostComment from "public/types/database/user_post_comment";
import * as UserPost from "public/types/database/user_post";

/** @type {UserPost.user_post} */
let currentCommentPost;

$w.onReady(async ()=>{
    const res = await wixData.query(DATABASE.user_post).find();
    // $w("#sliderGallery1")
    realtime.subscribe(CHANNEL.new_post, item=>{
        console.log({ item });

        $w("#boxNewOrder").show("slide", {duration: 700})
        setTimeout(()=>{
            $w("#boxNewOrder").hide("slide", {duration: 700})
        }, 12_000)
    }).catch(console.error)
    .then(()=>{
        console.log("subscribe to new post channel")
    });

    let togg = false;
    $w("#button9").onClick(()=>{
        togg = !togg;
        console.log({ togg })
        if(!togg) {
            console.log("show")
            $w("#boxNewOrder").show("slide", {duration: 700})
        }
        else {
            $w("#boxNewOrder").hide("slide", {duration: 700})
        }
    });

    $w("#repeaterPost").data = res.items;
    $w("#repeaterPost").onItemReady(handleItemReadyPost);
    $w("#repeaterComment").onItemReady(handleItemReadyComment);
    $w("#tableLineItems").onRowSelect(item=>{
        wixLocation.to(`/product-page/${slugify(item.rowData.product)}`)
    });

    $w("#btnCommentSend").onClick(async ()=>{
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
 * @param {$w} $item
 * @param {UserPostComment.user_post_comment} itemData
 * @param {number} index
 */
async function handleItemReadyComment($item, itemData, index) {
    let isLiking = false;
    $item("#textCommentLike").text = formatNum(itemData.likeCount);
    $item("#textCommentValue").text = itemData.comment;

    $item("#imgNotLiked").onClick(async ()=>{
        if(isLiking) return;
        isLiking = true;

        const likeCount = +$item("#textCommentLike").text;
        if(!isNaN(likeCount)) $item("#textCommentLike").text = String(likeCount + 1);

        markLike(true);
        await wixData.insert(DATABASE.user_post_comment_like, { comment_like: itemData._id });
        isLiking = false;
    });


    $item("#imgLiked").onClick(async ()=>{
        if(isLiking) return;
        isLiking = true;

        const likeCount = +$item("#textCommentLike").text;
        if(!isNaN(likeCount)) $item("#textCommentLike").text = String(likeCount - 1);

        markLike(false);

        // dislike - remove the data
        const res = await wixData.query(DATABASE.user_post_comment_like)
            .eq("_owner", wixUsers.currentUser.id)
            .eq("comment_like", itemData._id).find();


        if( res.length > 0 ){
            await wixData.remove(DATABASE.user_post_comment_like,res.items[0]._id);
        }
        else {
            console.warn(`Corrupt data found: user_post_comment_like comment_like field ${itemData._id}`);
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
        .eq("comment_like", itemData._id)
        .count()
    ]);

    $item("#textCommentItemFullname").text = displayName;
    $item("#imgCommentItem").src = image;

    markLike(countLiked);

    function markLike(bool) {
        if( bool ) {
            $item("#imgLiked").show();
            $item("#imgNotLiked").hide();
        }
        else {
            $item("#imgNotLiked").show();
            $item("#imgLiked").hide();
        }
    }
}



/**
 * @param {$w} $item
 * @param {UserPost.user_post} itemData
 */
async function handleItemReadyPost($item, itemData) {

    $item("#textPost").text = itemData.post;
    $item("#textOrder").text = `#${itemData.orderId}`;
    $item("#tableLineItems").rows = itemData.lineItems.map(lineItemMap);
    $item("#textTotalAmount").text = `₹${itemData.totalPrice}`;
    $item("#textTotalQty").text = `x${itemData.totalQty}`;

    if(!currentCommentPost) initCommentMessage($item, itemData);

    $item("#imgComment").onClick(()=>{
        initCommentMessage($item, itemData);
    });
    $item("#boxRepeaterComment").onClick(()=>{
        initCommentMessage($item, itemData);
    })

    
    $item("#imgCart").onClick(async ()=>{

        $item("#imgCart").hide();
        await cart.addProducts(itemData.lineItems.map(item=>({
            productId: item.productId,
            quantity: item.quantity,
            options: {
                choices: Object.fromEntries(item.options.map(item=>([item.option, item.selection])))
            }
        })));

        $item("#imgCartDone").show("fade");
        setTimeout(()=>{
            $item("#imgCartDone").hide();
            $item("#imgCart").show();
        }, 2_000)
    });

    const { displayName, image } = await getPublicUserInfo(itemData._owner);
    $item("#textFullName").text = displayName;
    $item("#imgProfile").src = image;

}

/**
 * Init left comment section for the selected post
 * @param {$w} $item Current repoeaterPost item
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
    
    setTimeout(() => {    
    }, 600);
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

    $w("#textNoComments")[resComment.length === 0 ? "expand": "collapse"]();
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
        photo: lineItem.mediaItem.src,
        product: lineItem.name,
        qty: `x${lineItem.quantity}`,
        price: `₹${lineItem.totalPrice}`,
        // link: slug(lineItem.name)
    }
}
