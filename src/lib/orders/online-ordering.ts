/**
 * The switch for online ordering (Place order, FR-021).
 *
 * Place order stays off until the shop can see online orders in the POS
 * (the Online orders screen) and customers have an order page to land on.
 * Until then, pickup orders keep the copied order summary, as rider delivery
 * always does.
 *
 * Set `NEXT_PUBLIC_ONLINE_ORDERING=enabled` to turn it on. Next.js writes the
 * value into the build, so change it in Vercel and redeploy. The browser tests
 * build with it on.
 */
export function isOnlineOrderingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ONLINE_ORDERING === "enabled";
}
