import wixWindow from "wix-window-frontend";
import { sendPublish } from "backend/user.web";
import { Logger } from "public/log";

const logger = new Logger("ui:lightbox:post");

$w.onReady(async function () {
	// Get all the cart info
	// Save it in the database
	//

	const data = await wixWindow.lightbox.getContext();
	if(!data) {
		logger.error(`Failed to get lightbox context!`);
		wixWindow.lightbox.close();
	}

	$w("#dsUserPost").onReady(()=>{
		$w("#dsUserPost").setFieldValues({
			...data.order,
			likeCount: 0
		});

		$w("#dsUserPost").onAfterSave(()=>{
			sendPublish({ newPost: true });
		});
	});
});