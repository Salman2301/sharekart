import { CHANNEL } from "public/constant";
import { permissionsRouter } from "wix-realtime-backend";

permissionsRouter.default((channel, subscriber) => {
  return { read: true };
});

permissionsRouter.add(CHANNEL.new_post, (channel, subscriber) => {
    return  { read: true };
});

export function realtime_check_permission(channel, subscriber) {
  return permissionsRouter.check(channel, subscriber);
}
