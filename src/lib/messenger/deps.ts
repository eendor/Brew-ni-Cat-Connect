/**
 * The live services behind the Messenger assistant: the saved site content
 * and the menu the website shows, the order lookup the order page uses, and
 * Meta's Send API with the Page access token.
 */

import { fetchPublicMenu } from "@/lib/menu/fetch-public-menu";
import { fetchOrder } from "@/lib/orders/fetch-order";
import { isOnlineOrderingEnabled } from "@/lib/orders/online-ordering";
import { loadSiteContent } from "@/lib/site-content/load";
import type { MenuCatalog } from "@/types/menu";

import type { MessengerDeps } from "./events";
import { createGraphClient } from "./send";

/** A slow database must not hold up the replies after it. */
const READ_TIMEOUT_MS = 5000;

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Timed out.")), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

/**
 * The menu as the website's Menu page loads it (FR-060): the same query,
 * mapping and shop-only filter, read fresh. null when it can't be read, so a
 * reply never shows a guessed price.
 */
export async function readWebsiteMenu(): Promise<MenuCatalog | null> {
  try {
    return await fetchPublicMenu(AbortSignal.timeout(READ_TIMEOUT_MS));
  } catch {
    return null;
  }
}

export function createMessengerDeps(
  origin: string,
  pageToken: string,
): MessengerDeps {
  const graph = createGraphClient(pageToken);
  return {
    origin,
    now: () => Date.now(),
    onlineOrdering: isOnlineOrderingEnabled,
    readContent: async () => (await loadSiteContent()).content,
    readMenu: readWebsiteMenu,
    lookupOrder: (reference, token) =>
      withTimeout(fetchOrder(reference, token), READ_TIMEOUT_MS),
    send: graph.send,
  };
}
