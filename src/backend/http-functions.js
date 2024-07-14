import wixData from "wix-data";
import { Logger } from "public/log";
import { ok, badRequest, serverError } from "wix-http-functions";
import { DATABASE } from "public/constant";


const HEADERS_JSON = {
  "Content-Type": "application/json",
};

const logger = new Logger("http-functions");

export async function get_followers(req, res) {
  try {
    logger.info("new-request", req);

    const { userId } = req.query;
    if( !userId ) {
      return badRequest(toJson({
        error: "userId is required",
      }));
    }

    const user = await wixData.get(DATABASE.user_info, userId);
    
    if (!user) {
      return badRequest(toJson({
        error: "user not found",
      }));
    }

    return ok(toJson({
      userId,
      followers: user.followerCount,
    }));
  }
  catch (e) {
    logger.error("new-request-error", req, e);
    
    return serverError(toJson({
      error: e.message,
    }));
  }
}

// helper func
function toJson(body) {
  return {
    body: JSON.stringify(body),
    headers: HEADERS_JSON,
  }
}

