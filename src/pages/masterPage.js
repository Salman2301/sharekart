import wixUsers from 'wix-users';
import wixData from "wix-data";
import { DATABASE, DEFAULT_PROFILE_IMAGE } from "public/constant";

$w.onReady(async function () {
    setProfilePic();

    wixUsers.onLogin(setProfilePic);
});

async function setProfilePic() {
    try {
        if (!wixUsers.currentUser.loggedIn) throw new Error("not logged in");

        const { items: [user_info] } = await wixData.query(DATABASE.user_info).eq("_id", wixUsers.currentUser.id).find();
        const image = user_info.image || DEFAULT_PROFILE_IMAGE;
        $w("#imgGPic").src = image;
        $w("#imgGPic").show();
    } catch (e) {
        $w("#imgGPic").src = DEFAULT_PROFILE_IMAGE;
        $w("#imgGPic").hide();
    }
}