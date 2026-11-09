/**
 * The chat's Get Started button, greeting and menu (the Messenger Profile).
 *
 * They are applied once, by a team member, with Meta's Messenger Profile API
 * and the Page access token (security-and-privacy §21); the website never
 * calls that API. While the Meta app is in Development mode, Meta shows them
 * only to people with a role on the app.
 *
 * No ice breakers: setting them through the API stops the owner from editing
 * the Page's own FAQ questions in Business Suite.
 */

import { siteConfig } from "@/config/site";

import { PAYLOADS } from "./intents";
import { MAIN_BUTTONS } from "./replies";

/** Meta's limits for the greeting and a menu item's title. */
export const MAX_GREETING_LENGTH = 160;
export const MAX_MENU_TITLE_LENGTH = 30;

export function messengerProfile() {
  return {
    get_started: { payload: PAYLOADS.welcome },
    greeting: [
      {
        locale: "default",
        text: `Hi {{user_first_name}}! I'm ${siteConfig.shortName}'s automated assistant. Tap Get Started for our menu, hours and location, or to reach our staff.`,
      },
    ],
    persistent_menu: [
      {
        locale: "default",
        composer_input_disabled: false,
        call_to_actions: MAIN_BUTTONS.map((button) => ({
          type: "postback",
          title: button.title,
          payload: PAYLOADS[button.intent],
        })),
      },
    ],
  };
}
