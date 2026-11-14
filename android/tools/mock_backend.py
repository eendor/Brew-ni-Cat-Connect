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
import urllib.request
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SUPABASE = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
KEY = os.environ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]
STEP_SECONDS = int(os.environ.get("STEP_SECONDS", "20"))
STEPS = ["pending", "accepted", "preparing", "ready", "completed"]
ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
orders = {}


def iso(ts):
    return datetime.fromtimestamp(ts, timezone.utc).isoformat()


def view(order):
    elapsed = int((time.time() - order["created"]) // STEP_SECONDS)
    reached = min(elapsed, len(STEPS) - 1)
    history = [{"status": s, "changedAt": iso(order["created"] + i * STEP_SECONDS)} for i, s in enumerate(STEPS[: reached + 1])]
    return {**order["view"], "status": STEPS[reached], "statusHistory": history}


class Handler(BaseHTTPRequestHandler):
    def send(self, code, body):
        data = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def body(self):
        return json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")

    def do_GET(self):
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
        req = urllib.request.Request(SUPABASE + self.path, headers={"apikey": KEY, "Authorization": "Bearer " + KEY})
        with urllib.request.urlopen(req, timeout=20) as r:
            data = r.read()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        if self.path == "/rest/v1/rpc/get_online_order":
            b = self.body()
            o = orders.get(b.get("p_reference"))
            return self.send(200, view(o) if o and o["token"] == b.get("p_tracking_token") else None)
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
