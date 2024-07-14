
import { Permissions, webMethod } from "wix-web-module";
import wixUsersBackend from 'wix-users-backend';
import wixData from 'wix-data';
import realtime from "wix-realtime-backend";
import { DATABASE, DEFAULT_PROFILE_IMAGE, CHANNEL } from "../public/constant";
import { Logger } from "../public/log";

const logger = new Logger("backend:user.web");

export const getUserFullName = webMethod(
  Permissions.SiteMember, 
  async (id) => { 
    if(!id) id = wixUsersBackend.currentUser.id;
    const { items: [ user ] } = await wixData.query(DATABASE["Members/PrivateMembersData"]).eq("_id", id).find({ suppressAuth: true });
    const name = [user.firstName, user.lastName].filter(e=>!!e).join(" ");
    if( name ) return name;
    return user.loginEmail.split("@")[0];
  }
);

export const getUserInfo = webMethod(
  Permissions.Anyone, 
  async (id) => { 

    if(!id) id = wixUsersBackend.currentUser.id;


    const [
      { items: [ user ] },
      { items: [ user_info ] },
    ] = await Promise.all([
      wixData.query(DATABASE["Members/PrivateMembersData"]).eq("_id", id).find({ suppressAuth: true }),
      wixData.query(DATABASE["user_info"]).eq("_id", id).find({ suppressAuth: true }),
    ]);

    const fullName = [user.firstName, user.lastName].filter(e=>!!e).join(" ");


    return {
      displayName: user_info?.displayName || fullName ||  user?.loginEmail?.split("@")[0] || "Unkown",
      image: user_info?.image ||  user?.picture || DEFAULT_PROFILE_IMAGE
    }
  }
)


export const sendPublish = webMethod(
  Permissions.Anyone, 
  async (payload) => { 
    await realtime.publish(CHANNEL.new_post, payload, {
      includePublisher: true,
    })
  }
)


export const getProductFollowerInfo = webMethod(
  Permissions.SiteMember, 
  async (productId) => { 
    // QUERY CURRENT USER ID AND GET ALL THE LIST OF FOLLOWER
    // CROSS CHECK ALL THE FOLLOWER WITH THE POST TABLE 
    const resFollower = await wixData.query(DATABASE.user_follow).eq("follower", wixUsersBackend.currentUser.id).find();
    const followingUserIds = resFollower.items.map(item=>item.followee);

    let followerUserIdsBoughtProduct = await Promise.all(followingUserIds.map(async userId =>{
      const count = await  wixData.query(DATABASE.user_post).eq("_owner", userId).hasSome("productIds", productId).count();
      return count === 0 ? undefined: userId;
    }));


    followerUserIdsBoughtProduct = [...new Set(followerUserIdsBoughtProduct.filter(id=>!!id&&id!==wixUsersBackend.currentUser.id))];

    // only firts follower is enough
    if(followerUserIdsBoughtProduct.length > 5)  followerUserIdsBoughtProduct.length = 5;

    const followerInfo = await Promise.all(followerUserIdsBoughtProduct.map(getUserInfo));

    return followerInfo;
  }
)


// Wix doesn't allow to change the default user picture!?
export const updateUserImage = webMethod(
  Permissions.SiteMember, 
  async (image) => { 
    try {
      const { items: [ user ] } = await wixData.query(DATABASE["Members/PrivateMembersData"])
        .eq("_id", wixUsersBackend.currentUser.id)
      .find({ suppressAuth: true })
      .catch(e=>{
        logger.error(e);
        return { items: [] }
      });

      logger.verbose({ user: JSON.parse(JSON.stringify(user)) })
      if( !user ) throw new Error("Failed to fetch the user ")

      user.picture = `https://static.wixstatic.com/media/b4a90d_983f6646d67f451ba662eced741f0a1c~mv2.webp`;

      logger.verbose({ toUpdate: user })
      await wixData.update(DATABASE["Members/PrivateMembersData"], user, { suppressAuth: true });
      logger.verbose("success")
    }
    catch(e) {
      logger.error(e);
    }
  }
)


export const emitEventAddToCart = webMethod(
  Permissions.Anyone, 
  async (postId) => { 
    await wixData.insert(DATABASE.user_post_event, { type: "add_to_cart", postId }, { suppressAuth: true });
  }
);