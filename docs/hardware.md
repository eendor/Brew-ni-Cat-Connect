# Hardware Requirements

**Version:** 0.1 Draft\
**Status:** Planned; no special project hardware selected\
**Last updated:** 2026-08-18

## 1. Decision summary

Brew ni Cat Connect does not currently require dedicated IoT devices, kiosks, scanners, or printers. The planned system is a cloud-backed software platform accessed through ordinary customer and shop computing devices. New hardware will be proposed only when a verified requirement and total-cost/security analysis justify it.

## 2. Hardware roles

| Hardware role | Purpose | Minimum planning assumption | Status |
| --- | --- | --- | --- |
| Customer smartphone/tablet/computer | Access responsive website; later run Android app | Supported modern browser and network connection | Planned; no device purchase required |
| Development workstation | Documentation, web/Android development, testing | Git, supported Node.js, browser; Android tools only in Phase 8 | Available environment partially verified |
| Shop POS device | Run the existing POS and later approved Connect integration | Existing capability and interface are unknown | External existing system; analysis deferred |
| Shop network/router | Connect shop-side services to cloud backend | Stable secured internet suitable for business use | TODO: Confirm with Brew ni Cat owner. |
| Android test device/emulator | Validate future native application | Supported API level to be chosen in Android architecture decision | Deferred to Phase 8 |
| Staff order-notification device | Receive online-order workflow signals if required | Device/workflow not yet selected | TODO: Confirm with Brew ni Cat owner. |

## 3. Explicitly unselected hardware

- QR/barcode scanner — no approved requirement.
- Receipt printer — remains part of the existing POS unless the later integration specification says otherwise.
- Customer kiosk — outside current scope.
- IoT sensors or smart appliances — no justified system purpose.
- Dedicated server in the shop — not recommended for the planned managed-cloud approach.

## 4. Reliability and operational questions

The POS integration design must document what happens during internet loss, whether orders may be accepted while staff connectivity is unavailable, how duplicate delivery is prevented, and how status changes reconcile after recovery. No hardware purchase should be used as a substitute for these software and operational controls.

The following require verified business input:

- available shop devices and operating systems;
- Wi-Fi/router security and reliability;
- current POS device, peripherals, and supported integration interfaces;
- staff notification expectations; and
- accessibility needs for customer/staff devices.

For all items: **TODO: Confirm with Brew ni Cat owner.**
