import wixUsers from "wix-users";

export async function checkLogin() {
    if( wixUsers.currentUser.loggedIn ) return;
    await wixUsers.promptLogin();
}
