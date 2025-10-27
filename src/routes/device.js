
// const express = require("express");
// const router = express.Router();
// const mongoose = require("mongoose");
// const Command = require("../models/Command");
// const LightStatus = require("../models/LightStatus");
// const LightDevice = require("../models/LightDevice");
// const { authenticate } = require("../middleware/auth");

// /**
//  * Utility - is valid MAC format XX:XX:...:XX
//  */
// const isValidMac = (mac) => {
//   return typeof mac === "string" && /^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){5}$/.test(mac);
// };

// /**
//  * Normalize node entries from registration payload
//  * Accepts array of strings like ["ND_01","ND_02"] or array of objects [{deviceId: "ND_01"}]
//  */
// const normalizeNodesArray = (nodes) => {
//   if (!Array.isArray(nodes)) return [];
//   const out = [];
//   for (let n of nodes) {
//     if (!n) continue;
//     if (typeof n === "string") n = n.trim();
//     else if (typeof n === "object" && n.deviceId) n = String(n.deviceId).trim();
//     else continue;
//     if (!n) continue;
//     out.push(n.toUpperCase());
//   }
//   return [...new Set(out)]; // unique
// };

// /**
//  * ==============================
//  * Đăng ký thiết bị (ESP gọi)
//  * POST /devices/register
//  * body: { mac: "AA:BB:CC:DD:EE:FF", nodes: ["ND_01","ND_02"] }
//  */
// router.post("/register", async (req, res) => {
//   try {
//     const { mac, nodes: providedNodes } = req.body;
//     console.log(`[REGISTER] Received request: mac=${mac}, nodes=${JSON.stringify(providedNodes)}`); // Thêm log để debug

//     if (!isValidMac(mac)) {
//       console.log(`[REGISTER] Invalid MAC: ${mac}`);
//       return res.status(400).json({ ok: false, message: "Invalid MAC address" });
//     }

//     const deviceId = mac.toUpperCase();

//     // Hardcode nodes if not provided (to match gateway's hardcoded nodes)
//     let nodes = providedNodes;
//     if (!nodes || nodes.length === 0) {
//       nodes = ["ND_01", "ND_02"];
//     }

//     // Create or update gateway record
//     let gateway = await LightDevice.findOne({ deviceId });
//     if (!gateway) {
//       gateway = await LightDevice.create({
//         deviceId,
//         type: "gateway",
//         name: `Gateway-${deviceId}`,
//         gatewayId: null,
//         gps: { lat: null, lon: null },
//         location: "Gateway",
//         user: null,
//         isDeleted: false,
//         isAssigned: false
//       });
//       console.log(`[REGISTER] New gateway created: ${gateway.deviceId}`);
//     } else {
//       console.log(`[REGISTER] Gateway exists: ${gateway.deviceId}`);
//     }

//     // If nodes array provided, create device records for each node if not exist
//     const nodeList = normalizeNodesArray(nodes);
//     if (nodeList.length > 0) {
//       for (const nodeId of nodeList) {
//         try {
//           const existing = await LightDevice.findOne({ deviceId: nodeId });
//           if (!existing) {
//             await LightDevice.create({
//               deviceId: nodeId,
//               type: "node",
//               name: `Device-${nodeId}`,
//               gatewayId: deviceId,
//               gps: { lat: null, lon: null },
//               location: "",
//               user: null,
//               isDeleted: false,
//               isAssigned: false
//             });

//             // initial status
//             await LightStatus.create({
//               deviceId: nodeId,
//               relay: false,
//               brightness: 50
//             });

//             console.log(`[REGISTER] Created node ${nodeId} for gateway ${deviceId}`);
//           } else {
//             // ensure gatewayId set
//             if (!existing.gatewayId) {
//               existing.gatewayId = deviceId;
//               existing.isAssigned = existing.isAssigned || false;
//               await existing.save();
//               console.log(`[REGISTER] Updated node ${nodeId} gatewayId -> ${deviceId}`);
//             } else if (existing.gatewayId !== deviceId) {
//               // If node exists but attached to different gateway, log (do not reassign)
//               console.log(`[REGISTER] Node ${nodeId} exists but gatewayId differs (${existing.gatewayId} != ${deviceId})`);
//             }
//           }
//         } catch (e) {
//           console.error(`[REGISTER] error processing node ${nodeId}:`, e && e.stack ? e.stack : e);
//         }
//       }
//     }

//     res.status(200).json({ ok: true, deviceId, isAssigned: !!gateway.user });
//   } catch (err) {
//     console.error("[REGISTER] error:", err && err.stack ? err.stack : err);
//     res.status(500).json({ ok: false, message: "Server error" });
//   }
// });

// /**
//  * ==============================
//  * Lấy danh sách thiết bị pending (chưa có user)
//  * GET /devices/pending
//  */
// router.get("/pending", authenticate, async (req, res) => {
//   try {
//     const devices = await LightDevice.find({ user: null, isDeleted: { $ne: true }, type: "gateway" });
//     console.log(`[PENDING] Found ${devices.length} pending gateways`);
//     res.json({ ok: true, devices });
//   } catch (err) {
//     console.error("[PENDING] error:", err && err.stack ? err.stack : err);
//     res.status(500).json({ ok: false, message: "Lỗi khi lấy danh sách thiết bị" });
//   }
// });

// /**
//  * Approve device (admin/user) -> mark assigned
//  * POST /devices/approve/:mac
//  */
// router.post("/approve/:mac", authenticate, async (req, res) => {
//   try {
//     const { mac } = req.params;
//     const device = await LightDevice.findOneAndUpdate(
//       { deviceId: mac.toUpperCase(), type: "gateway" },
//       { user: req.user.userId, isAssigned: true },
//       { new: true }
//     );

//     if (!device) {
//       return res.status(404).json({ ok: false, message: "Device not found" });
//     }

//     res.json({ ok: true, message: `Approved device ${mac}`, device });
//   } catch (err) {
//     console.error("[APPROVE DEVICE] error:", err && err.stack ? err.stack : err);
//     res.status(500).json({ ok: false, message: "Server error" });
//   }
// });

// /**
//  * ==============================
//  * User gán thiết bị vào tài khoản
//  * POST /devices
//  * body: { name, location, mac, lat, lon }
//  */
// router.post("/", authenticate, async (req, res) => {
//   try {
//     const { name, location, mac, lat, lon } = req.body;

//     if (!name || !mac) {
//       return res.status(400).json({ ok: false, message: "Name and MAC required" });
//     }

//     if (!isValidMac(mac)) {
//       return res.status(400).json({ ok: false, message: "Invalid MAC format" });
//     }

//     const deviceId = mac.toUpperCase();

//     // Tìm device gateway đã được ESP đăng ký
//     const device = await LightDevice.findOne({ deviceId, isDeleted: { $ne: true }, type: "gateway" });
//     if (!device) {
//       return res.status(404).json({ ok: false, message: "Device not found. Please ensure the device has registered (ESP -> /devices/register) first." });
//     }

//     if (device.user) {
//       return res.status(400).json({ ok: false, message: "Device already assigned" });
//     }

//     // Gán các thông tin do web gửi cho gateway
//     device.name = name;
//     device.location = location || device.location || "";
//     device.user = req.user.userId;
//     device.isAssigned = true;

//     // Lưu GPS nếu có
//     if (lat !== undefined && lat !== null && lat !== "") {
//       const latNum = parseFloat(lat);
//       if (Number.isNaN(latNum) || latNum < -90 || latNum > 90) {
//         return res.status(400).json({ ok: false, message: "lat không hợp lệ" });
//       }
//       device.gps = device.gps || {};
//       device.gps.lat = latNum;
//     }
//     if (lon !== undefined && lon !== null && lon !== "") {
//       const lonNum = parseFloat(lon);
//       if (Number.isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
//         return res.status(400).json({ ok: false, message: "lon không hợp lệ" });
//       }
//       device.gps = device.gps || {};
//       device.gps.lon = lonNum;
//     }

//     await device.save();

//     // --- gán luôn các node thuộc gateway về user này (nếu chưa có user) ---
//     const nodeUpdateRes = await LightDevice.updateMany(
//       { gatewayId: deviceId, isDeleted: { $ne: true }, $or: [{ user: null }, { user: { $exists: false } }] },
//       { $set: { user: req.user.userId, isAssigned: true } }
//     );

//     res.json({ ok: true, device, assignedNodes: nodeUpdateRes.nModified ?? nodeUpdateRes.modifiedCount });
//     console.log(`[ADD DEVICE] Assigned device ${device.deviceId} to user ${req.user.userId} (gps: ${JSON.stringify(device.gps)}). Nodes updated: ${JSON.stringify(nodeUpdateRes)}`);
//   } catch (err) {
//     console.error("[ADD DEVICE] error:", err && err.stack ? err.stack : err);
//     res.status(500).json({ ok: false, message: "Lỗi khi thêm thiết bị", error: err.message });
//   }
// });


// /**
//  * ==============================
//  * Lấy danh sách thiết bị của user
//  * GET /devices
//  * Trả gateways + nodes cho các gateway user sở hữu
//  */
// router.get("/", authenticate, async (req, res) => {
//   try {
//     const gateways = await LightDevice.find({ user: req.user.userId, isDeleted: { $ne: true }, type: "gateway" });

//     const gatewayIds = gateways.map(g => g.deviceId);
//     const nodes = gatewayIds.length > 0
//       ? await LightDevice.find({ gatewayId: { $in: gatewayIds }, isDeleted: { $ne: true }, type: "node" })
//       : [];

//     const allDevices = [...gateways, ...nodes];
//     const statuses = await LightStatus.find({ deviceId: { $in: allDevices.map(d => d.deviceId) } });

//     const devicesWithStatus = allDevices.map(d => {
//       const st = statuses.find(s => s.deviceId === d.deviceId) || { relay: false, brightness: 50 };
//       return {
//         _id: d._id,
//         deviceId: d.deviceId,
//         name: d.name,
//         location: d.location || "",
//         relay: st.relay,
//         brightness: st.brightness ?? 50,
//         gps: d.gps
//           ? {
//               lat: d.gps.lat != null ? Number(d.gps.lat) : null,
//               lon: d.gps.lon != null ? Number(d.gps.lon) : null,
//             }
//           : { lat: null, lon: null },
//         gatewayId: d.gatewayId || null,
//       };
//     });

//     const response = { ok: true, devices: devicesWithStatus };
//     res.json(response);
//     console.log(`[GET DEVICES] Sent response: ${JSON.stringify(response)}`);
//   } catch (err) {
//     console.error("[GET DEVICES] error:", err && err.stack ? err.stack : err);
//     res.status(500).json({ ok: false, message: "Lỗi khi lấy danh sách thiết bị" });
//   }
// });


// /**
//  * ==============================
//  * Cập nhật GPS của thiết bị
//  * PUT /devices/:id
//  */
// router.put("/:id", authenticate, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { gps } = req.body;

//     if (!gps || gps.lat === undefined || gps.lon === undefined) {
//       return res.status(400).json({ ok: false, message: "Thiếu tọa độ GPS" });
//     }

//     const latNum = parseFloat(gps.lat);
//     const lonNum = parseFloat(gps.lon);
//     if (isNaN(latNum) || isNaN(lonNum) || latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
//       return res.status(400).json({ ok: false, message: "Tọa độ GPS không hợp lệ" });
//     }

//     const device = await LightDevice.findOneAndUpdate(
//       { _id: id, user: req.user.userId, isDeleted: { $ne: true } },
//       { $set: { gps: { lat: latNum, lon: lonNum } } },
//       { new: true }
//     );

//     if (!device) {
//       return res.status(404).json({ ok: false, message: "Không tìm thấy thiết bị" });
//     }

//     res.json({ ok: true, device });
//     console.log(`[UPDATE GPS] Updated device ${device.deviceId} with gps: ${JSON.stringify(device.gps)}`);
//   } catch (err) {
//     console.error("[UPDATE GPS] error:", err && err.stack ? err.stack : err);
//     res.status(500).json({ ok: false, message: "Lỗi khi cập nhật thiết bị" });
//   }
// });

// /**
//  * ==============================
//  * Xóa thiết bị
//  * DELETE /devices/:id
//  */
// router.delete("/:id", authenticate, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const device = await LightDevice.findOneAndUpdate(
//       { _id: id, user: req.user.userId, isDeleted: { $ne: true } },
//       { $set: { isDeleted: true } },
//       { new: true }
//     );

//     if (!device) {
//       return res.status(404).json({ ok: false, message: "Không tìm thấy thiết bị" });
//     }

//     res.json({ ok: true, message: `Xóa thiết bị ${device.deviceId} thành công` });
//     console.log(`[DELETE DEVICE] Deleted device ${device.deviceId}`);
//   } catch (err) {
//     console.error("[DELETE DEVICE] error:", err && err.stack ? err.stack : err);
//     res.status(500).json({ ok: false, message: "Lỗi khi xóa thiết bị" });
//   }
// });


// /**
//  * ==============================
//  * Gửi lệnh chung (toggle + brightness)
//  * POST /devices/:id/command
//  * id = DB _id of gateway (frontend) OR gateway MAC (if caller uses MAC)
//  * body: { state, brightness, target } where target is nodeId like "ND_01"
//  */
// router.post("/:id/command", authenticate, async (req, res) => {
//   try {
//     const { id } = req.params; // may be _id or deviceId
//     const { state, brightness, target } = req.body;

//     // find device by _id (if valid ObjectId) else by deviceId (MAC)
//     let device = null;
//     if (/^[0-9a-fA-F]{24}$/.test(id)) {
//       device = await LightDevice.findOne({ _id: id, user: req.user.userId, isDeleted: { $ne: true }, type: "gateway" });
//     }
//     if (!device) {
//       // try by deviceId (MAC)
//       device = await LightDevice.findOne({ deviceId: String(id).toUpperCase(), user: req.user.userId, isDeleted: { $ne: true }, type: "gateway" });
//     }

//     if (!device) {
//       return res.status(404).json({ ok: false, message: "Không tìm thấy thiết bị" });
//     }
//     if (device.type === "gateway" && !target) {
//       return res.status(400).json({ ok: false, message: "Gateway không điều khiển trực tiếp. Vui lòng chỉ định 'target' là node (ví dụ ND_01)." });
//     }

//     // create pending command helper (Command model should have timestamps: true)
//     const createPendingCommand = async (targetDeviceId, commandName, params = {}) => {
//       const cmd = await Command.create({
//         deviceId: targetDeviceId,
//         command: commandName,
//         params,
//         status: "pending"
//       });
//       return cmd;
//     };

//     if (target) {
//       const nodeId = String(target).toUpperCase();

//       // --- mark previous pending same-type commands as replaced to avoid gateway picking old ones ---
//       try {
//         if (typeof brightness === "number") {
//           await Command.updateMany(
//             { deviceId: nodeId, status: "pending", command: "BRIGHTNESS" },
//             { $set: { status: "replaced", replacedAt: new Date() } }
//           );
//         } else if (state !== undefined) {
//           await Command.updateMany(
//             { deviceId: nodeId, status: "pending", command: { $in: ["ON", "OFF"] } },
//             { $set: { status: "replaced", replacedAt: new Date() } }
//           );
//         }
//       } catch (e) {
//         console.warn("[COMMAND] Failed to mark old pending commands (non-fatal):", e && e.stack ? e.stack : e);
//       }

//       if (typeof brightness === "number") {
//         if (brightness < 0 || brightness > 100) {
//           return res.status(400).json({ ok: false, message: "Brightness phải từ 0 đến 100" });
//         }
//         // Store command under nodeId and include sourceGateway so gateway can route if node absent in DB
//         await createPendingCommand(nodeId, "BRIGHTNESS", { value: brightness, sourceGateway: device.deviceId });
//       } else if (state !== undefined) {
//         await createPendingCommand(nodeId, state ? "ON" : "OFF", { sourceGateway: device.deviceId });
//       } else {
//         return res.status(400).json({ ok: false, message: "Missing command payload (target + brightness/state)" });
//       }

//       // optimistic status update for node
//       if (typeof brightness === "number") {
//         await LightStatus.findOneAndUpdate(
//           { deviceId: nodeId },
//           { $set: { brightness, lastUpdated: new Date() } },
//           { upsert: true }
//         );
//       }

//     } else {
//       // Command for gateway itself
//       if (state !== undefined) {
//         await createPendingCommand(device.deviceId, state ? "ON" : "OFF", {});
//         await LightStatus.findOneAndUpdate(
//           { deviceId: device.deviceId },
//           { $set: { relay: state } },
//           { upsert: true }
//         );
//       }
//       if (typeof brightness === "number") {
//         if (brightness < 0 || brightness > 100) {
//           return res.status(400).json({ ok: false, message: "Brightness phải từ 0 đến 100" });
//         }

//         await createPendingCommand(device.deviceId, "BRIGHTNESS", { value: brightness });
//         await LightStatus.findOneAndUpdate(
//           { deviceId: device.deviceId },
//           { $set: { brightness } },
//           { upsert: true }
//         );
//       }
//     }

//     res.json({ ok: true, message: "Lệnh đã được gửi thành công" });
//     console.log(`[COMMAND] Created command for ${device.deviceId} -> payload=${JSON.stringify(req.body)}`);
//   } catch (err) {
//     console.error("[COMMAND] error:", err && err.stack ? err.stack : err);
//     res.status(500).json({ ok: false, message: "Lỗi khi xử lý lệnh chung" });
//   }
// });


// /**
//  * ==============================
//  * ESP lấy lệnh tiếp theo
//  * GET /devices/:deviceId/next-command
//  * deviceId = gateway MAC (e.g. "98:A3:...") as gateway will call this
//  * Gateway expects: { ok:true, devices: [ { deviceId:"ND_01", brightness:80 }, ... ] }
//  */
// router.get("/:deviceId/next-command", async (req, res) => {
//   try {
//     const { deviceId } = req.params;
//     const device = await LightDevice.findOne({ deviceId, isDeleted: { $ne: true }, type: "gateway" });
//     if (!device) {
//       return res.status(404).json({ ok: false, message: "Device not found" });
//     }

//     // Collect nodes under this gateway (if any)
//     const nodes = await LightDevice.find({ gatewayId: deviceId, isDeleted: { $ne: true }, type: "node" }).select("deviceId");
//     const nodeIds = nodes.map(n => n.deviceId);

//     // Build conditions:
//     const orConditions = [];
//     if (nodeIds.length > 0) {
//       orConditions.push({ deviceId: { $in: nodeIds } }); // commands targeted at known nodes
//     }
//     // Match commands targeted at ND_* where params.sourceGateway equals this gateway (catch commands created even if node absent in DB)
//     orConditions.push({ $and: [{ 'params.sourceGateway': deviceId }, { deviceId: { $regex: '^ND_' } }] });

//     // Try to find node-targeted command first (choose newest pending so gateway gets most recent)
//     let cmd = null;
//     if (orConditions.length > 0) {
//       cmd = await Command.findOneAndUpdate(
//         { status: "pending", $or: orConditions },
//         { $set: { status: "sent" } },
//         // newest first so gateway receives most recent command
//         { sort: { createdAt: -1, _id: -1 }, new: true }
//       ).select("deviceId command params status");
//     }

//     // Fallback: command targeted at gateway itself (also choose newest)
//     if (!cmd) {
//       cmd = await Command.findOneAndUpdate(
//         { deviceId, status: "pending" },
//         { $set: { status: "sent" } },
//         { sort: { createdAt: -1, _id: -1 }, new: true }
//       ).select("deviceId command params status");

//       if (cmd) console.log(`[NEXT COMMAND] matched gateway-targeted command for ${deviceId}`);
//     } else {
//       const matchedViaSourceGateway = cmd.params && cmd.params.sourceGateway === deviceId && /^ND_/.test(cmd.deviceId);
//       console.log(`[NEXT COMMAND] matched node-targeted command for ${deviceId} -> target=${cmd.deviceId} (viaSourceGateway=${matchedViaSourceGateway})`);
//     }

//     // Prepare response in gateway format
//     const devicesResp = [];
//     if (cmd) {
//       if (cmd.command === "BRIGHTNESS" && cmd.params && typeof cmd.params.value !== "undefined") {
//         devicesResp.push({ deviceId: cmd.deviceId, brightness: cmd.params.value });
//       } else if (cmd.command === "ON" || cmd.command === "OFF") {
//         devicesResp.push({ deviceId: cmd.deviceId, state: cmd.command === "ON" });
//       } else {
//         devicesResp.push({ deviceId: cmd.deviceId, command: cmd.command, params: cmd.params || {} });
//       }
//     }

//     res.json({ ok: true, devices: devicesResp });
//     console.log(`[NEXT COMMAND] Response for ${deviceId}: ${JSON.stringify({ devices: devicesResp, cmd })}`);
//   } catch (err) {
//     console.error("[NEXT COMMAND] error:", err && err.stack ? err.stack : err);
//     res.status(500).json({ ok: false, message: "Server error" });
//   }
// });


// /**
//  * ==============================
//  * ESP báo cáo trạng thái
//  * POST /devices/report
//  * supports gateway new format and legacy
//  */
// router.post("/report", async (req, res) => {
//   try {
//     const { gw_id, devices, mac, cmd, commandId, brightness } = req.body;
//     console.log(`[REPORT] Received report: gw_id=${gw_id}, mac=${mac}, devices=${JSON.stringify(devices)}`); // Thêm log để debug

//     // Gateway new format
//     if (gw_id && Array.isArray(devices)) {
//       // Map gw_id "GW_01" to actual gateway (find by type or hardcode if single gateway)
//       let gateway = await LightDevice.findOne({ type: "gateway" }); // Demo: assume single gateway
//       if (!gateway && mac && isValidMac(mac)) {
//         gateway = await LightDevice.findOne({ deviceId: mac.toUpperCase(), type: "gateway" });
//       }
//       const gatewayId = gateway ? gateway.deviceId : null;

//       for (const d of devices) {
//         const nodeId = (d.deviceId || "").toString();
//         if (!nodeId) continue;

//         // Check if node exists, create if not (associate with gateway)
//         let nodeDevice = await LightDevice.findOne({ deviceId: nodeId });
//         if (!nodeDevice) {
//           nodeDevice = await LightDevice.create({
//             deviceId: nodeId,
//             type: "node",
//             name: `Device-${nodeId}`,
//             gatewayId: gatewayId,
//             gps: { lat: null, lon: null },
//             location: "",
//             user: gateway ? gateway.user : null,
//             isDeleted: false,
//             isAssigned: !!gateway && !!gateway.user
//           });

//           console.log(`[REPORT] Created node ${nodeId} associated with gateway ${gatewayId}`);
//         }

//         const br = (d.brightness !== undefined && d.brightness !== null) ? Number(d.brightness) : undefined;
//         const lux = (d.lux !== undefined && d.lux !== null) ? Number(d.lux) : undefined;
//         const current = (d.current !== undefined && d.current !== null) ? Number(d.current) : undefined;

//         const update = { lastUpdated: new Date() };
//         if (br !== undefined) update.brightness = br;
//         if (lux !== undefined) update.lux = lux;
//         if (current !== undefined) update.current = current;

//         await LightStatus.findOneAndUpdate(
//           { deviceId: nodeId },
//           { $set: update },
//           { upsert: true }
//         );
//       }

//       res.json({ ok: true });
//       console.log(`[REPORT] Processed gateway report gw_id=${gw_id} devices=${devices.length}`);
//       return;
//     }

//     // Legacy format (mac + cmd)
//     if (mac) {
//       const deviceId = mac.toUpperCase();

//       await LightStatus.findOneAndUpdate(
//         { deviceId },
//         { $set: { relay: cmd === 1, brightness: brightness ?? 50, lastUpdated: new Date() } },
//         { upsert: true }
//       );

//       if (commandId) {
//         await Command.findOneAndUpdate({ _id: commandId }, { $set: { status: "done" } });
//       }

//       res.json({ ok: true });
//       console.log(`[REPORT-LEGACY] Processed report for ${deviceId}, cmd=${cmd}, brightness=${brightness}`);
//       return;
//     }

//     res.status(400).json({ ok: false, message: "Invalid report format" });
//   } catch (err) {
//     console.error("[REPORT] error:", err && err.stack ? err.stack : err);
//     res.status(500).json({ ok: false, message: "Lỗi khi xử lý báo cáo" });
//   }
// });

// module.exports = router;




const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Command = require("../models/Command");
const LightStatus = require("../models/LightStatus");
const LightDevice = require("../models/LightDevice");
const { authenticate } = require("../middleware/auth");

/**
 * Utility - is valid MAC format XX:XX:...:XX
 */
const isValidMac = (mac) => {
  return typeof mac === "string" && /^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){5}$/.test(mac);
};

/**
 * Normalize node entries from registration payload
 * Accepts array of strings like ["ND_01","ND_02"] or array of objects [{deviceId: "ND_01"}]
 */
const normalizeNodesArray = (nodes) => {
  if (!Array.isArray(nodes)) return [];
  const out = [];
  for (let n of nodes) {
    if (!n) continue;
    if (typeof n === "string") n = n.trim();
    else if (typeof n === "object" && n.deviceId) n = String(n.deviceId).trim();
    else continue;
    if (!n) continue;
    out.push(n.toUpperCase());
  }
  return [...new Set(out)]; // unique
};

/**
 * ==============================
 * Đăng ký thiết bị (ESP gọi)
 * POST /devices/register
 * body: { mac: "AA:BB:CC:DD:EE:FF", nodes: ["ND_01","ND_02"] }
 */
router.post("/register", async (req, res) => {
  try {
    const { mac, nodes: providedNodes } = req.body;
    console.log(`[REGISTER] Received request: mac=${mac}, nodes=${JSON.stringify(providedNodes)}`); // Thêm log để debug

    if (!isValidMac(mac)) {
      console.log(`[REGISTER] Invalid MAC: ${mac}`);
      return res.status(400).json({ ok: false, message: "Invalid MAC address" });
    }

    const deviceId = mac.toUpperCase();

    // Hardcode nodes if not provided (to match gateway's hardcoded nodes)
    let nodes = providedNodes;
    if (!nodes || nodes.length === 0) {
      nodes = ["ND_01", "ND_02"];
    }

    // Create or update gateway record
    let gateway = await LightDevice.findOne({ deviceId });
    if (!gateway) {
      gateway = await LightDevice.create({
        deviceId,
        type: "gateway",
        name: `Gateway-${deviceId}`,
        gatewayId: null,
        gps: { lat: null, lon: null },
        location: "Gateway",
        user: null,
        isDeleted: false,
        isAssigned: false
      });
      console.log(`[REGISTER] New gateway created: ${gateway.deviceId}`);
    } else {
      console.log(`[REGISTER] Gateway exists: ${gateway.deviceId}`);
    }

    // If nodes array provided, create device records for each node if not exist
    const nodeList = normalizeNodesArray(nodes);
    if (nodeList.length > 0) {
      for (const nodeId of nodeList) {
        try {
          const existing = await LightDevice.findOne({ deviceId: nodeId });
          if (!existing) {
            await LightDevice.create({
              deviceId: nodeId,
              type: "node",
              name: `Device-${nodeId}`,
              gatewayId: deviceId,
              gps: { lat: null, lon: null },
              location: "",
              user: null,
              isDeleted: false,
              isAssigned: false
            });

            // initial status
            await LightStatus.create({
              deviceId: nodeId,
              relay: false,
              brightness: 50
            });

            console.log(`[REGISTER] Created node ${nodeId} for gateway ${deviceId}`);
          } else {
            // ensure gatewayId set
            if (!existing.gatewayId) {
              existing.gatewayId = deviceId;
              existing.isAssigned = existing.isAssigned || false;
              await existing.save();
              console.log(`[REGISTER] Updated node ${nodeId} gatewayId -> ${deviceId}`);
            } else if (existing.gatewayId !== deviceId) {
              // If node exists but attached to different gateway, log (do not reassign)
              console.log(`[REGISTER] Node ${nodeId} exists but gatewayId differs (${existing.gatewayId} != ${deviceId})`);
            }
          }
        } catch (e) {
          console.error(`[REGISTER] error processing node ${nodeId}:`, e && e.stack ? e.stack : e);
        }
      }
    }

    res.status(200).json({ ok: true, deviceId, isAssigned: !!gateway.user });
  } catch (err) {
    console.error("[REGISTER] error:", err && err.stack ? err.stack : err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

/**
 * ==============================
 * Lấy danh sách thiết bị pending (chưa có user)
 * GET /devices/pending
 */
router.get("/pending", authenticate, async (req, res) => {
  try {
    const devices = await LightDevice.find({ user: null, isDeleted: { $ne: true }, type: "gateway" });
    console.log(`[PENDING] Found ${devices.length} pending gateways`);
    res.json({ ok: true, devices });
  } catch (err) {
    console.error("[PENDING] error:", err && err.stack ? err.stack : err);
    res.status(500).json({ ok: false, message: "Lỗi khi lấy danh sách thiết bị" });
  }
});

/**
 * Approve device (admin/user) -> mark assigned
 * POST /devices/approve/:mac
 */
router.post("/approve/:mac", authenticate, async (req, res) => {
  try {
    const { mac } = req.params;
    const device = await LightDevice.findOneAndUpdate(
      { deviceId: mac.toUpperCase(), type: "gateway" },
      { user: req.user.userId, isAssigned: true },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({ ok: false, message: "Device not found" });
    }

    res.json({ ok: true, message: `Approved device ${mac}`, device });
  } catch (err) {
    console.error("[APPROVE DEVICE] error:", err && err.stack ? err.stack : err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

/**
 * ==============================
 * User gán thiết bị vào tài khoản
 * POST /devices
 * body: { name, location, mac, lat, lon }
 */
router.post("/", authenticate, async (req, res) => {
  try {
    const { name, location, mac, lat, lon } = req.body;

    if (!name || !mac) {
      return res.status(400).json({ ok: false, message: "Name and MAC required" });
    }

    if (!isValidMac(mac)) {
      return res.status(400).json({ ok: false, message: "Invalid MAC format" });
    }

    const deviceId = mac.toUpperCase();

    // Tìm device gateway đã được ESP đăng ký
    const device = await LightDevice.findOne({ deviceId, isDeleted: { $ne: true }, type: "gateway" });
    if (!device) {
      return res.status(404).json({ ok: false, message: "Device not found. Please ensure the device has registered (ESP -> /devices/register) first." });
    }

    if (device.user) {
      return res.status(400).json({ ok: false, message: "Device already assigned" });
    }

    // Gán các thông tin do web gửi cho gateway
    device.name = name;
    device.location = location || device.location || "";
    device.user = req.user.userId;
    device.isAssigned = true;

    // Lưu GPS nếu có
    if (lat !== undefined && lat !== null && lat !== "") {
      const latNum = parseFloat(lat);
      if (Number.isNaN(latNum) || latNum < -90 || latNum > 90) {
        return res.status(400).json({ ok: false, message: "lat không hợp lệ" });
      }
      device.gps = device.gps || {};
      device.gps.lat = latNum;
    }
    if (lon !== undefined && lon !== null && lon !== "") {
      const lonNum = parseFloat(lon);
      if (Number.isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
        return res.status(400).json({ ok: false, message: "lon không hợp lệ" });
      }
      device.gps = device.gps || {};
      device.gps.lon = lonNum;
    }

    await device.save();

    // --- gán luôn các node thuộc gateway về user này (nếu chưa có user) ---
    const nodeUpdateRes = await LightDevice.updateMany(
      { gatewayId: deviceId, isDeleted: { $ne: true }, $or: [{ user: null }, { user: { $exists: false } }] },
      { $set: { user: req.user.userId, isAssigned: true } }
    );

    res.json({ ok: true, device, assignedNodes: nodeUpdateRes.nModified ?? nodeUpdateRes.modifiedCount });
    console.log(`[ADD DEVICE] Assigned device ${device.deviceId} to user ${req.user.userId} (gps: ${JSON.stringify(device.gps)}). Nodes updated: ${JSON.stringify(nodeUpdateRes)}`);
  } catch (err) {
    console.error("[ADD DEVICE] error:", err && err.stack ? err.stack : err);
    res.status(500).json({ ok: false, message: "Lỗi khi thêm thiết bị", error: err.message });
  }
});


/**
 * ==============================
 * Lấy danh sách thiết bị của user
 * GET /devices
 * Trả gateways + nodes cho các gateway user sở hữu
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const gateways = await LightDevice.find({ user: req.user.userId, isDeleted: { $ne: true }, type: "gateway" });

    const gatewayIds = gateways.map(g => g.deviceId);
    const nodes = gatewayIds.length > 0
      ? await LightDevice.find({ gatewayId: { $in: gatewayIds }, isDeleted: { $ne: true }, type: "node" })
      : [];

    const allDevices = [...gateways, ...nodes];
    const statuses = await LightStatus.find({ deviceId: { $in: allDevices.map(d => d.deviceId) } });

    const devicesWithStatus = allDevices.map(d => {
      const st = statuses.find(s => s.deviceId === d.deviceId) || { relay: false, brightness: 50 };
      return {
        _id: d._id,
        deviceId: d.deviceId,
        name: d.name,
        location: d.location || "",
        relay: st.relay,
        brightness: st.brightness ?? 50,
        gps: d.gps
          ? {
              lat: d.gps.lat != null ? Number(d.gps.lat) : null,
              lon: d.gps.lon != null ? Number(d.gps.lon) : null,
            }
          : { lat: null, lon: null },
        gatewayId: d.gatewayId || null,
      };
    });

    const response = { ok: true, devices: devicesWithStatus };
    res.json(response);
    console.log(`[GET DEVICES] Sent response: ${JSON.stringify(response)}`);
  } catch (err) {
    console.error("[GET DEVICES] error:", err && err.stack ? err.stack : err);
    res.status(500).json({ ok: false, message: "Lỗi khi lấy danh sách thiết bị" });
  }
});


/**
 * ==============================
 * Cập nhật GPS của thiết bị
 * PUT /devices/:id
 */
router.put("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { gps } = req.body;

    if (!gps || gps.lat === undefined || gps.lon === undefined) {
      return res.status(400).json({ ok: false, message: "Thiếu tọa độ GPS" });
    }

    const latNum = parseFloat(gps.lat);
    const lonNum = parseFloat(gps.lon);
    if (isNaN(latNum) || isNaN(lonNum) || latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
      return res.status(400).json({ ok: false, message: "Tọa độ GPS không hợp lệ" });
    }

    const device = await LightDevice.findOneAndUpdate(
      { _id: id, user: req.user.userId, isDeleted: { $ne: true } },
      { $set: { gps: { lat: latNum, lon: lonNum } } },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({ ok: false, message: "Không tìm thấy thiết bị" });
    }

    res.json({ ok: true, device });
    console.log(`[UPDATE GPS] Updated device ${device.deviceId} with gps: ${JSON.stringify(device.gps)}`);
  } catch (err) {
    console.error("[UPDATE GPS] error:", err && err.stack ? err.stack : err);
    res.status(500).json({ ok: false, message: "Lỗi khi cập nhật thiết bị" });
  }
});

/**
 * ==============================
 * Xóa thiết bị
 * DELETE /devices/:id
 */
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const device = await LightDevice.findOneAndUpdate(
      { _id: id, user: req.user.userId, isDeleted: { $ne: true } },
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({ ok: false, message: "Không tìm thấy thiết bị" });
    }

    res.json({ ok: true, message: `Xóa thiết bị ${device.deviceId} thành công` });
    console.log(`[DELETE DEVICE] Deleted device ${device.deviceId}`);
  } catch (err) {
    console.error("[DELETE DEVICE] error:", err && err.stack ? err.stack : err);
    res.status(500).json({ ok: false, message: "Lỗi khi xóa thiết bị" });
  }
});


/**
 * ==============================
 * Gửi lệnh chung (toggle + brightness)
 * POST /devices/:id/command
 * id = DB _id of gateway (frontend) OR gateway MAC (if caller uses MAC)
 * body: { state, brightness, target } where target is nodeId like "ND_01"
 */
router.post("/:id/command", authenticate, async (req, res) => {
  try {
    const { id } = req.params; // may be _id or deviceId
    const { state, brightness, target } = req.body;

    // find device by _id (if valid ObjectId) else by deviceId (MAC)
    let device = null;
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      device = await LightDevice.findOne({ _id: id, user: req.user.userId, isDeleted: { $ne: true }, type: "gateway" });
    }
    if (!device) {
      // try by deviceId (MAC)
      device = await LightDevice.findOne({ deviceId: String(id).toUpperCase(), user: req.user.userId, isDeleted: { $ne: true }, type: "gateway" });
    }

    if (!device) {
      return res.status(404).json({ ok: false, message: "Không tìm thấy thiết bị" });
    }
    if (device.type === "gateway" && !target) {
      return res.status(400).json({ ok: false, message: "Gateway không điều khiển trực tiếp. Vui lòng chỉ định 'target' là node (ví dụ ND_01)." });
    }

    // create pending command helper (Command model should have timestamps: true)
    const createPendingCommand = async (targetDeviceId, commandName, params = {}) => {
      const cmd = await Command.create({
        deviceId: targetDeviceId,
        command: commandName,
        params,
        status: "pending"
      });
      return cmd;
    };

    if (target) {
      const nodeId = String(target).toUpperCase();

      // --- mark previous pending same-type commands as replaced to avoid gateway picking old ones ---
      try {
        if (typeof brightness === "number") {
          await Command.updateMany(
            { deviceId: nodeId, status: "pending", command: "BRIGHTNESS" },
            { $set: { status: "replaced", replacedAt: new Date() } }
          );
        } else if (state !== undefined) {
          await Command.updateMany(
            { deviceId: nodeId, status: "pending", command: { $in: ["ON", "OFF"] } },
            { $set: { status: "replaced", replacedAt: new Date() } }
          );
        }
      } catch (e) {
        console.warn("[COMMAND] Failed to mark old pending commands (non-fatal):", e && e.stack ? e.stack : e);
      }

      if (typeof brightness === "number") {
        if (brightness < 0 || brightness > 100) {
          return res.status(400).json({ ok: false, message: "Brightness phải từ 0 đến 100" });
        }
        // Store command under nodeId and include sourceGateway so gateway can route if node absent in DB
        await createPendingCommand(nodeId, "BRIGHTNESS", { value: brightness, sourceGateway: device.deviceId });
      } else if (state !== undefined) {
        await createPendingCommand(nodeId, state ? "ON" : "OFF", { sourceGateway: device.deviceId });
      } else {
        return res.status(400).json({ ok: false, message: "Missing command payload (target + brightness/state)" });
      }

      // optimistic status update for node
      if (typeof brightness === "number") {
        await LightStatus.findOneAndUpdate(
          { deviceId: nodeId },
          { $set: { brightness, lastUpdated: new Date() } },
          { upsert: true }
        );
      }

    } else {
      // Command for gateway itself
      if (state !== undefined) {
        await createPendingCommand(device.deviceId, state ? "ON" : "OFF", {});
        await LightStatus.findOneAndUpdate(
          { deviceId: device.deviceId },
          { $set: { relay: state } },
          { upsert: true }
        );
      }
      if (typeof brightness === "number") {
        if (brightness < 0 || brightness > 100) {
          return res.status(400).json({ ok: false, message: "Brightness phải từ 0 đến 100" });
        }

        await createPendingCommand(device.deviceId, "BRIGHTNESS", { value: brightness });
        await LightStatus.findOneAndUpdate(
          { deviceId: device.deviceId },
          { $set: { brightness } },
          { upsert: true }
        );
      }
    }

    res.json({ ok: true, message: "Lệnh đã được gửi thành công" });
    console.log(`[COMMAND] Created command for ${device.deviceId} -> payload=${JSON.stringify(req.body)}`);
  } catch (err) {
    console.error("[COMMAND] error:", err && err.stack ? err.stack : err);
    res.status(500).json({ ok: false, message: "Lỗi khi xử lý lệnh chung" });
  }
});


/**
 * ==============================
 * ESP lấy lệnh tiếp theo
 * GET /devices/:deviceId/next-command
 * deviceId = gateway MAC (e.g. "98:A3:...") as gateway will call this
 * Gateway expects: { ok:true, devices: [ { deviceId:"ND_01", brightness:80 }, ... ] }
 */
router.get("/:deviceId/next-command", async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await LightDevice.findOne({ deviceId, isDeleted: { $ne: true }, type: "gateway" });
    if (!device) {
      return res.status(404).json({ ok: false, message: "Device not found" });
    }

    // Collect nodes under this gateway (if any)
    const nodes = await LightDevice.find({ gatewayId: deviceId, isDeleted: { $ne: true }, type: "node" }).select("deviceId");
    const nodeIds = nodes.map(n => n.deviceId);

    // Build conditions:
    const orConditions = [];
    if (nodeIds.length > 0) {
      orConditions.push({ deviceId: { $in: nodeIds } }); // commands targeted at known nodes
    }
    // Match commands targeted at ND_* where params.sourceGateway equals this gateway (catch commands created even if node absent in DB)
    orConditions.push({ $and: [{ 'params.sourceGateway': deviceId }, { deviceId: { $regex: '^ND_' } }] });

    // Try to find node-targeted command first (choose newest pending so gateway gets most recent)
    let cmd = null;
    if (orConditions.length > 0) {
      cmd = await Command.findOneAndUpdate(
        { status: "pending", $or: orConditions },
        { $set: { status: "sent" } },
        // newest first so gateway receives most recent command
        { sort: { createdAt: -1, _id: -1 }, new: true }
      ).select("deviceId command params status");
    }

    // Fallback: command targeted at gateway itself (also choose newest)
    if (!cmd) {
      cmd = await Command.findOneAndUpdate(
        { deviceId, status: "pending" },
        { $set: { status: "sent" } },
        { sort: { createdAt: -1, _id: -1 }, new: true }
      ).select("deviceId command params status");

      if (cmd) console.log(`[NEXT COMMAND] matched gateway-targeted command for ${deviceId}`);
    } else {
      const matchedViaSourceGateway = cmd.params && cmd.params.sourceGateway === deviceId && /^ND_/.test(cmd.deviceId);
      console.log(`[NEXT COMMAND] matched node-targeted command for ${deviceId} -> target=${cmd.deviceId} (viaSourceGateway=${matchedViaSourceGateway})`);
    }

    // Prepare response in gateway format
    const devicesResp = [];
    if (cmd) {
      if (cmd.command === "BRIGHTNESS" && cmd.params && typeof cmd.params.value !== "undefined") {
        devicesResp.push({ deviceId: cmd.deviceId, brightness: cmd.params.value });
      } else if (cmd.command === "ON" || cmd.command === "OFF") {
        devicesResp.push({ deviceId: cmd.deviceId, state: cmd.command === "ON" });
      } else {
        devicesResp.push({ deviceId: cmd.deviceId, command: cmd.command, params: cmd.params || {} });
      }
    }

    res.json({ ok: true, devices: devicesResp });
    console.log(`[NEXT COMMAND] Response for ${deviceId}: ${JSON.stringify({ devices: devicesResp, cmd })}`);
  } catch (err) {
    console.error("[NEXT COMMAND] error:", err && err.stack ? err.stack : err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});


/**
 * ==============================
 * ESP báo cáo trạng thái
 * POST /devices/report
 * supports gateway new format and legacy
 */
router.post("/report", async (req, res) => {
  try {
    const { gw_id, devices, mac, cmd, commandId, brightness } = req.body;
    console.log(`[REPORT] Received report: gw_id=${gw_id}, mac=${mac}, devices=${JSON.stringify(devices)}`);
    if (gw_id && Array.isArray(devices)) {

      // Tìm gateway trong DB
      const gateway = await LightDevice.findOne({ deviceId: gw_id }) ||
                       await LightDevice.findOne({ type: "gateway" });

      const gatewayId = gateway?.deviceId ?? null;

      for (const d of devices) {
        const nodeId = String(d.deviceId);

        // Nếu node chưa tồn tại → tạo luôn
        let nodeDevice = await LightDevice.findOne({ deviceId: nodeId });
        if (!nodeDevice) {
          nodeDevice = await LightDevice.create({
            deviceId: nodeId,
            type: "node",
            name: `Device-${nodeId}`,
            gatewayId: gatewayId,
            gps: { lat: null, lon: null },
            location: "",
            user: gateway?.user ?? null,
            isDeleted: false,
            isAssigned: !!gateway?.user
          });

          console.log(`[REPORT] Created node ${nodeId}`);
        }
        await LightStatus.create({
          deviceId: nodeId,
          brightness: d.brightness ?? null,
          lux: d.lux ?? null,
          current: d.current ?? null,
          isOnline: true,
          lastSeen: new Date(),
          lastUpdated: new Date()
        });
      }

      res.json({ ok: true });
      console.log(`[REPORT] Stored history records for ${devices.length} nodes`);
      return;
    }
    if (mac) {
      await LightStatus.create({
        deviceId: mac.toUpperCase(),
        relay: cmd === 1,
        brightness: brightness ?? 50,
        lastSeen: new Date(),
        lastUpdated: new Date()
      });

      if (commandId) {
        await Command.findOneAndUpdate({ _id: commandId }, { $set: { status: "done" } });
      }

      res.json({ ok: true });
      console.log(`[REPORT-LEGACY] Inserted history for ${mac}`);
      return;
    }

    res.status(400).json({ ok: false, message: "Invalid report format" });

  } catch (err) {
    console.error("[REPORT] error:", err);
    res.status(500).json({ ok: false, message: "Lỗi khi xử lý báo cáo" });
  }
});

module.exports = router;
