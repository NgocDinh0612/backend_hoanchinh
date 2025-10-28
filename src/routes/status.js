// routes/status.js
const express = require('express');
const router = express.Router();
const LightStatus = require('../models/LightStatus');
const { authenticate } = require('../middleware/auth'); // nếu bạn không dùng auth, remove hoặc comment dòng này

// Helper: uniform downsample by picking every step'th item (keeps first & last approximately)
function downsampleArray(arr, maxPoints) {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  if (arr.length <= maxPoints) return arr;
  const step = Math.ceil(arr.length / maxPoints);
  const out = [];
  for (let i = 0; i < arr.length; i += step) {
    out.push(arr[i]);
  }
  // ensure last point included
  const last = arr[arr.length - 1];
  if (out.length === 0 || out[out.length - 1].ts !== last.ts) out.push(last);
  return out;
}

/**
 * GET /api/status/history
 * Query:
 *   devices=ND_01,ND_02         (required)
 *   periodMinutes=60            (optional, default 60)
 *   maxPoints=500               (optional, max points per device)
 *
 * Response:
 * {
 *   ok: true,
 *   devices: [...],
 *   periodMinutes: N,
 *   data: {
 *     "ND_01": [ { ts: ISOString, current: 0.12, lux: 44, brightness: 50 }, ... ],
 *     "ND_02": [...]
 *   }
 * }
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const { devices: devicesQ, periodMinutes, maxPoints } = req.query;

    if (!devicesQ) {
      return res.status(400).json({ ok: false, message: "Missing query param 'devices' (comma separated)" });
    }
    const devices = String(devicesQ).split(',').map(s => s.trim()).filter(Boolean);
    if (devices.length === 0) return res.status(400).json({ ok: false, message: "No devices provided" });

    const minutes = Math.max(1, parseInt(periodMinutes || '60', 10));
    const maxPts = Math.max(10, parseInt(maxPoints || '500', 10)); // bảo vệ tham số

    const startDate = new Date(Date.now() - minutes * 60 * 1000);

    // Query LightStatus collection for records in range (sorted asc)
    const rows = await LightStatus.find({
      deviceId: { $in: devices },
      createdAt: { $gte: startDate }
    })
      .sort({ createdAt: 1 })
      .lean();

    // Group by deviceId
    const grouped = {};
    devices.forEach(d => grouped[d] = []);

    for (const r of rows) {
      const devId = r.deviceId;
      if (!devId) continue;
      const ts = r.createdAt ? new Date(r.createdAt) : (r.lastUpdated ? new Date(r.lastUpdated) : new Date());
      grouped[devId] = grouped[devId] || [];
      grouped[devId].push({
        ts: ts.toISOString(),
        current: (typeof r.current === 'number' ? r.current : (r.current ? Number(r.current) : null)),
        lux: (typeof r.lux === 'number' ? r.lux : (r.lux ? Number(r.lux) : null)),
        brightness: (typeof r.brightness === 'number' ? r.brightness : null)
      });
    }

    // Downsample per device to at most maxPts points (avoid huge payloads and Nivo issues)
    const out = {};
    for (const d of devices) {
      const arr = grouped[d] || [];
      // remove any points without a numeric 'current' if you only want to chart current,
      // but here we keep points and let frontend filter as needed:
      const safe = arr.map(p => ({
        ts: p.ts,
        current: (p.current !== null && p.current !== undefined) ? Number(p.current) : null,
        lux: (p.lux !== null && p.lux !== undefined) ? Number(p.lux) : null,
        brightness: (p.brightness !== null && p.brightness !== undefined) ? Number(p.brightness) : null
      }));
      out[d] = downsampleArray(safe, maxPts);
    }

    return res.json({
      ok: true,
      devices,
      periodMinutes: minutes,
      data: out
    });
  } catch (err) {
    console.error("[STATUS HISTORY] error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

module.exports = router;
