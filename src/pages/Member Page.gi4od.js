import { DATABASE } from "public/constant";
import { Logger } from "public/log";
import wixData from "wix-data";
import wixUsers from "wix-users";

const logger = new Logger("ui:upload-pic");

$w.onReady(() => {
    $w("#btnUpload").onChange(async () => {
        try {
            if (!$w("#btnUpload").value.length) return;
            const [file] = await $w("#btnUpload").uploadFiles();
            const { items } = await wixData.query(DATABASE.user_info).eq("_id", wixUsers.currentUser.id).find();
            if (items.length === 0) {
                await wixData.insert(DATABASE.user_info, {
                    image: file.fileUrl,
                    _id: wixUsers.currentUser.id
                });
            } else {
                const lastItem = items[0];
                lastItem.image = file.fileUrl;
                await wixData.update(DATABASE.user_info, lastItem);
                $w("#imgGPic").src = file.fileUrl;
                $w("#imgGPic").show();
            }
        } catch (e) {
            logger.error(`Upload file error`, e);
        }
    })
});