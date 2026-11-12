/**
 * The shop's menu board pictures (`public/images/menu`), shown in Messenger
 * beside the category they belong to (FR-104).
 *
 * The boards are the owner's own artwork and their prices are older than the
 * live menu (`docs/business-content-register.md`). They are shown only as
 * pictures, always with a note that the chat's prices are today's, and no
 * price is ever read from them: every price in the chat comes from the live
 * menu.
 */

const BOARD_DIRECTORY = "/images/menu";

const BOARDS: ReadonlyArray<
  Readonly<{ match: RegExp; files: readonly string[] }>
> = [
  { match: /buldak|sedaap|noodle/i, files: ["noodles.jpg"] },
  { match: /bites/i, files: ["bites.jpg"] },
  { match: /drinks/i, files: ["drinks.jpg", "soda.jpg"] },
  { match: /combo|package/i, files: ["combo.jpg"] },
];

/** The board pictures' paths for a category, or none (for example Cat Treats). */
export function getMenuBoardPaths(categoryName: string): readonly string[] {
  const board = BOARDS.find((entry) => entry.match.test(categoryName));
  return (board?.files ?? []).map((file) => `${BOARD_DIRECTORY}/${file}`);
}
