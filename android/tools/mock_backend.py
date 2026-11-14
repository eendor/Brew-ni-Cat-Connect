#!/usr/bin/env python3
"""A stand-in backend for trying the app's checkout without the live shop.

Menu and opening-hours reads (GET /rest/v1/...) go to the real Supabase project
with the public key, so the menu is real. Place order (POST /api/orders) and
order tracking (POST /rest/v1/rpc/get_online_order) are answered here: orders
live in memory and move pending -> accepted -> preparing -> ready -> completed,
one step every STEP_SECONDS. Nothing is written to the real database.

    NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... \\
        python3 android/tools/mock_backend.py [port]
    BNC_DEBUG_BACKEND=http://10.0.2.2:8787 ./gradlew installDebug
"""
import json
import os
import secrets
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SUPABASE = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
KEY = os.environ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]
STEP_SECONDS = int(os.environ.get("STEP_SECONDS", "20"))
STEPS = ["pending", "accepted", "preparing", "ready", "completed"]
ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
orders = {}
MOCK_USER_ID = "11111111-1111-4111-8111-111111111111"
mock_profile = {
    "user_id": MOCK_USER_ID,
    "full_name": "Juan Dela Cruz",
    "phone": "+639171234567",
    "created_at": "2026-10-24T06:00:00+00:00",
    "updated_at": "2026-11-14T08:00:00+00:00",
}
mock_favorites = []
mock_points = 125
mock_rewards = [
    {"id": "rw-fries", "name": "Free Regular Cat Claws Fries", "description": "Redeemable for any flavor at the counter.", "points": 80},
    {"id": "rw-drink", "name": "Free 16oz Fruit Soda or Milk Tea", "description": "Pick any classic blend in shop.", "points": 120},
    {"id": "rw-buldak", "name": "Free Buldak Carbo Bowl", "description": "Hot bowl prepared fresh on pickup.", "points": 220},
]
mock_loyalty_tx = [
    {"id": 103, "customer_id": MOCK_USER_ID, "points": 25, "reason": "order-completed", "order_id": "ord-1", "note": "Completed order", "created_at": "2026-11-14T11:30:00+00:00", "online_orders": {"reference": "BNC-PAST23"}},
    {"id": 102, "customer_id": MOCK_USER_ID, "points": -80, "reason": "reward-redeemed", "order_id": None, "note": "Free Regular Cat Claws Fries", "created_at": "2026-11-12T09:15:00+00:00", "online_orders": None},
    {"id": 101, "customer_id": MOCK_USER_ID, "points": 180, "reason": "adjustment", "order_id": None, "note": "Opening balance", "created_at": "2026-11-10T07:00:00+00:00", "online_orders": None},
]
mock_my_review = None
mock_data_requests = [
    {"id": "dr-1", "kind": "export", "message": "Please send a copy of my saved account details.", "status": "open", "created_at": "2026-11-13T04:00:00+00:00"},
]
mock_past_orders = []


def iso(ts):
    return datetime.fromtimestamp(ts, timezone.utc).isoformat()


def view(order):
    elapsed = int((time.time() - order["created"]) // STEP_SECONDS)
    reached = min(elapsed, len(STEPS) - 1)
    history = [{"status": s, "changedAt": iso(order["created"] + i * STEP_SECONDS)} for i, s in enumerate(STEPS[: reached + 1])]
    return {**order["view"], "status": STEPS[reached], "statusHistory": history}


class Handler(BaseHTTPRequestHandler):
    def send(self, code, body, headers=None):
        data = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(data)

    def body(self):
        return json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")

    def ensure_past_orders(self):
        if mock_past_orders:
            return
        req = urllib.request.Request(
            f"{SUPABASE}/rest/v1/items?select=id,name,variants_json&is_available=eq.true&order=name.asc",
            headers={"apikey": KEY, "Authorization": "Bearer " + KEY},
        )
        items = []
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                for row in json.loads(r.read()):
                    slug = "".join(c for c in row["name"].lower() if c.isalpha())
                    if slug in ("takeoutbox", "cattreats", "bottledwater"):
                        continue
                    vjson = row.get("variants_json")
                    variants = json.loads(vjson) if isinstance(vjson, str) else (vjson or [])
                    v = variants[0] if variants else {}
                    vid = v.get("id") or f"{row['id']}-variant-1"
                    vname = v.get("name") or "Regular"
                    try:
                        price = float(v.get("basePrice") or 0)
                    except (TypeError, ValueError):
                        price = 0.0
                    if price <= 0 and isinstance(v.get("priceByFlavor"), dict) and v["priceByFlavor"]:
                        price = float(next(iter(v["priceByFlavor"].values())))
                    if price <= 0:
                        continue
                    items.append({
                        "line_number": len(items) + 1, "item_id": row["id"], "item_name": row["name"],
                        "variant_id": vid, "variant_name": vname, "flavor": None,
                        "unit_price": price, "quantity": 1, "line_total": price,
                    })
                    if len(items) >= 2:
                        break
        except Exception:
            pass
        sub = sum(i["line_total"] for i in items)
        mock_past_orders.append({
            "id": "ord-1", "reference": "BNC-PAST23", "status": "completed", "fulfillment": "pickup",
            "customer_name": mock_profile["full_name"], "payment_preference": "Cash", "notes": "",
            "subtotal": sub, "item_count": len(items), "rejection_reason": None,
            "created_at": "2026-11-14T11:15:00+00:00", "items": items,
        })

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/auth/v1/authorize":
            qs = urllib.parse.parse_qs(parsed.query)
            redirect_to = qs.get("redirect_to", ["com.brewnicat.connect://auth/callback"])[0]
            sep = "&" if "?" in redirect_to else "?"
            target = f"{redirect_to}{sep}code=mock-pkce-code"
            html = (
                "<!doctype html><html><body style='font-family:sans-serif;padding:32px;text-align:center'>"
                "<h2>Brew ni Cat Mock Google Sign-In</h2>"
                "<p>Signed in as Juan Dela Cruz (juan.delacruz@example.com)</p>"
                f"<p><a href='{target}' style='display:inline-block;padding:12px 24px;background:#C16337;color:#fff;"
                "border-radius:999px;text-decoration:none;font-weight:bold'>Continue to App</a></p>"
                f"<script>setTimeout(function(){{window.location.href={json.dumps(target)};}},300);</script>"
                "</body></html>"
            ).encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(html)))
            self.end_headers()
            self.wfile.write(html)
            return
        if parsed.path == "/rest/v1/customer_profiles":
            return self.send(200, [mock_profile])
        if parsed.path == "/rest/v1/favorites":
            return self.send(200, [{"item_id": i, "created_at": iso(time.time())} for i in mock_favorites])
        if parsed.path == "/rest/v1/online_orders":
            self.ensure_past_orders()
            total = len(mock_past_orders)
            cr = f"0-{max(0, total - 1)}/{total}" if total else "*/0"
            return self.send(200, mock_past_orders, {"Content-Range": cr})
        if parsed.path == "/rest/v1/loyalty_transactions":
            qs = urllib.parse.parse_qs(parsed.query)
            if qs.get("select", [""])[0] == "points":
                return self.send(200, [{"points": mock_points}])
            return self.send(200, mock_loyalty_tx)
        if parsed.path == "/rest/v1/data_requests":
            return self.send(200, mock_data_requests)
        if not self.path.startswith("/rest/v1/"):
            return self.send(404, {})
        if os.environ.get("ALWAYS_OPEN") == "1" and self.path.startswith("/rest/v1/site_content"):
            days = {d: {"opens": "00:00", "closes": "23:59"} for d in (
                "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
            )}
            return self.send(200, [
                {"section": "hours", "content": {"days": days, "note": "Mock always-open hours"}, "updated_at": iso(time.time())},
                {"section": "closure", "content": {"closed": False, "note": ""}, "updated_at": iso(time.time())},
            ])
        fwd_headers = {"apikey": KEY, "Authorization": "Bearer " + KEY}
        if self.headers.get("Prefer"):
            fwd_headers["Prefer"] = self.headers["Prefer"]
        req = urllib.request.Request(SUPABASE + self.path, headers=fwd_headers)
        with urllib.request.urlopen(req, timeout=20) as r:
            data = r.read()
            cr = r.headers.get("Content-Range")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        if cr:
            self.send_header("Content-Range", cr)
        self.end_headers()
        self.wfile.write(data)

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/rest/v1/favorites":
            qs = urllib.parse.parse_qs(parsed.query)
            raw = qs.get("item_id", [""])[0]
            item_id = raw.removeprefix("eq.")
            if item_id in mock_favorites:
                mock_favorites.remove(item_id)
            return self.send(200, [])
        self.send(404, {})

    def do_POST(self):
        global mock_points, mock_my_review
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/auth/v1/token":
            return self.send(200, {
                "access_token": "mock-access-token",
                "refresh_token": "mock-refresh-token",
                "expires_in": 3600,
                "user": {
                    "id": MOCK_USER_ID,
                    "email": "juan.delacruz@example.com",
                    "user_metadata": {"full_name": mock_profile["full_name"]},
                },
            })
        if parsed.path == "/auth/v1/logout":
            return self.send(200, {})
        if parsed.path == "/rest/v1/customer_profiles":
            b = self.body()
            mock_profile["full_name"] = b.get("full_name", mock_profile["full_name"])
            mock_profile["phone"] = b.get("phone", mock_profile["phone"])
            mock_profile["updated_at"] = iso(time.time())
            return self.send(200, [mock_profile])
        if parsed.path == "/rest/v1/favorites":
            b = self.body()
            iid = b.get("item_id")
            if iid and iid not in mock_favorites:
                mock_favorites.insert(0, iid)
            return self.send(201, [])
        if parsed.path == "/rest/v1/data_requests":
            b = self.body()
            mock_data_requests.insert(0, {
                "id": f"dr-{len(mock_data_requests) + 1}",
                "kind": b.get("kind", "correction"),
                "message": b.get("message", ""),
                "status": "open",
                "created_at": iso(time.time()),
            })
            return self.send(201, [])
        if parsed.path == "/rest/v1/rpc/loyalty_rewards":
            return self.send(200, mock_rewards)
        if parsed.path == "/rest/v1/rpc/loyalty_settings":
            return self.send(200, {"currencyStep": 50, "pointsPerStep": 1, "weeklyLimit": 2})
        if parsed.path == "/rest/v1/rpc/redeem_reward":
            b = self.body()
            rid = b.get("p_reward_id")
            reward = next((r for r in mock_rewards if r["id"] == rid), None)
            if not reward:
                return self.send(200, {"ok": False, "error": "reward_not_found"})
            if mock_points < reward["points"]:
                return self.send(200, {"ok": False, "error": "insufficient_points", "required": reward["points"], "balance": mock_points})
            mock_points -= reward["points"]
            mock_loyalty_tx.insert(0, {
                "id": 100 + len(mock_loyalty_tx) + 1, "customer_id": MOCK_USER_ID,
                "points": -reward["points"], "reason": "reward-redeemed", "order_id": None,
                "note": reward["name"], "created_at": iso(time.time()), "online_orders": None,
            })
            return self.send(200, {"ok": True, "code": "RWD-K9M2", "rewardName": reward["name"], "pointsSpent": reward["points"], "newBalance": mock_points})
        if parsed.path == "/rest/v1/rpc/my_review":
            return self.send(200, mock_my_review)
        if parsed.path == "/api/reviews":
            b = self.body()
            now_s = iso(time.time())
            mock_my_review = {
                "id": "rv-mock-1", "display_name": mock_profile["full_name"].split()[0] + " D.",
                "rating": int(b.get("rating", 5)), "body": str(b.get("body", "")),
                "hidden": False, "created_at": now_s, "updated_at": now_s,
            }
            return self.send(201, {"ok": True, "review": mock_my_review})
        if self.path == "/rest/v1/rpc/get_online_order":
            b = self.body()
            o = orders.get(b.get("p_reference"))
            auth = self.headers.get("Authorization", "")
            signed_in = auth == "Bearer mock-access-token"
            return self.send(200, view(o) if o and (signed_in or o["token"] == b.get("p_tracking_token")) else None)
        if self.path == "/api/orders":
            b = self.body()
            c = b.get("customer", {})
            if not c.get("name") or not c.get("phone"):
                return self.send(400, {"ok": False, "reason": "invalid-details", "message": "Please check your details."})
            ref = "BNC-" + "".join(secrets.choice(ALPHABET) for _ in range(6))
            lines = b.get("lines", [])
            names = {}
            for l in lines:
                req = urllib.request.Request(f"{SUPABASE}/rest/v1/items?select=name&id=eq.{l['itemId']}", headers={"apikey": KEY, "Authorization": "Bearer " + KEY})
                with urllib.request.urlopen(req, timeout=20) as r:
                    rows = json.loads(r.read())
                names[l["itemId"]] = rows[0]["name"] if rows else l["itemId"]
            # Prices are the server's job; the mock puts the whole subtotal on the first line.
            total = b.get("expectedSubtotal", 0)
            items = [{"itemId": l["itemId"], "itemName": names[l["itemId"]], "variantId": l["variantId"], "variantName": "",
                      "flavor": l.get("flavor"), "unitPrice": 0, "quantity": l["quantity"], "lineTotal": total if i == 0 else 0}
                     for i, l in enumerate(lines)]
            now = time.time()
            orders[ref] = {"token": b["trackingToken"], "created": now, "view": {
                "reference": ref, "fulfillment": "pickup", "customerName": c["name"],
                "paymentPreference": c.get("paymentPreference", "Cash"), "notes": c.get("notes", ""),
                "items": items, "subtotal": b.get("expectedSubtotal", 0), "itemCount": sum(l["quantity"] for l in lines),
                "rejectionReason": None, "createdAt": iso(now), "realtimeTopic": "mock"}}
            return self.send(201, {"ok": True, "reference": ref, "trackingToken": b["trackingToken"], "status": "pending", "createdAt": iso(now)})
        self.send(404, {})


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8787
    print(f"mock backend on :{port}, orders advance every {STEP_SECONDS}s", flush=True)
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
