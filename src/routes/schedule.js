// routes/schedule.js fix đổi tên
const express = require('express');
const router = express.Router();
const Command = require('../models/Command');
const Schedule = require('../models/schedule');
const { authenticate } = require('../middleware/auth');

// helper: compute ISO datetime for a given date (yyyy-mm-dd) + time "HH:mm"
function combineDateAndTime(dateObj, timeHHmm) {
  const [hh, mm] = (timeHHmm || "00:00").split(':').map(Number);
  const d = new Date(dateObj);
  d.setHours(hh, mm, 0, 0);
  return d;
}

// POST /api/schedule
// payload for single-run:
// { deviceId, brightness, scheduledAt: "2025-04-15T08:00:00.000Z" }
// payload for recurring:
// { deviceId, brightness, time: "08:00", repeat: "weekly", daysOfWeek: [1,3,5], startDate: "2025-04-01", endDate: "2025-12-31" }
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      deviceId,
      brightness,
      scheduledAt, // optional (single-run)
      time,        // required for recurring
      repeat = 'none',
      daysOfWeek,
      dayOfMonth,
      month,
      startDate,
      endDate,
      gatewayId
    } = req.body;

    if (!deviceId || typeof brightness === 'undefined') {
      return res.status(400).json({ ok: false, message: "Missing deviceId or brightness" });
    }

    // Single-run
    if (scheduledAt) {
      const dt = new Date(scheduledAt);
      if (isNaN(dt.getTime()) || dt <= new Date()) {
        return res.status(400).json({ ok: false, message: "scheduledAt must be a valid future datetime" });
      }

      const cmd = new Command({
        deviceId,
        command: "BRIGHTNESS",
        params: { value: Number(brightness) },
        status: "pending",
        scheduledAt: dt
      });
      await cmd.save();
      return res.json({ ok: true, message: "One-shot schedule created", command: cmd });
    }

    // Recurring schedule (repeat != 'none')
    if (!time || !repeat || repeat === 'none') {
      return res.status(400).json({ ok: false, message: "For recurring schedule provide time and repeat != 'none', or provide scheduledAt for one-shot" });
    }

    const scheduleDoc = new Schedule({
      gatewayId: gatewayId || null,
      deviceId,
      brightness: Number(brightness),
      time,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      repeat,
      daysOfWeek: Array.isArray(daysOfWeek) ? daysOfWeek.map(Number) : [],
      dayOfMonth: dayOfMonth ? Number(dayOfMonth) : undefined,
      month: month ? Number(month) : undefined,
      active: true
    });

    await scheduleDoc.save();
    return res.json({ ok: true, message: "Recurring schedule created", schedule: scheduleDoc });
  } catch (err) {
    console.error("[SCHEDULE POST] error:", err && err.stack ? err.stack : err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// GET /api/schedule
// Return unified list for calendar: combine one-shot Commands and Schedules (with nextOccurrence)
router.get('/', authenticate, async (req, res) => {
  try {
    const commands = await Command.find({ scheduledAt: { $ne: null } }).sort({ scheduledAt: 1 }).lean();
    const schedules = await Schedule.find({ active: true }).sort({ createdAt: -1 }).lean();

    // compute nextOccurrence for schedule (very simple: try today or next matching day)
    const computeNextOccurrence = (sch, fromDate = new Date()) => {
      const now = new Date(fromDate);
      // start from either startDate or today
      const start = sch.startDate ? new Date(sch.startDate) : now;
      let candidate = new Date(Math.max(start.getTime(), now.getTime()));
      // For repeat we will search up to 366 days ahead (safe bound)
      for (let i = 0; i < 366; i++) {
        const d = new Date(candidate);
        d.setDate(candidate.getDate() + i);
        // respect endDate if exists
        if (sch.endDate && d > new Date(sch.endDate)) break;

        // check repeat rule
        if (sch.repeat === 'daily') {
          const occ = combineDateAndTime(d, sch.time);
          if (occ > now) return occ;
        } else if (sch.repeat === 'weekly') {
          const dow = d.getDay(); // 0..6
          if ((sch.daysOfWeek || []).includes(dow)) {
            const occ = combineDateAndTime(d, sch.time);
            if (occ > now) return occ;
          }
        } else if (sch.repeat === 'monthly') {
          if (!sch.dayOfMonth) continue;
          if (d.getDate() === sch.dayOfMonth) {
            const occ = combineDateAndTime(d, sch.time);
            if (occ > now) return occ;
          }
        } else if (sch.repeat === 'yearly') {
          if (!sch.dayOfMonth || !sch.month) continue;
          if (d.getDate() === sch.dayOfMonth && (d.getMonth() + 1) === sch.month) {
            const occ = combineDateAndTime(d, sch.time);
            if (occ > now) return occ;
          }
        }
      }
      return null;
    };

    const unified = [];

    // one-shot commands -> map to calendar event
    for (const c of commands) {
      unified.push({
        _id: c._id,
        type: 'oneshot',
        deviceId: c.deviceId,
        scheduledAt: c.scheduledAt,
        params: c.params,
        title: `${c.deviceId} → ${c.params?.value ?? 0}%`,
      });
    }

    // schedules -> compute nextOccurrence
    for (const s of schedules) {
      const next = computeNextOccurrence(s);
      unified.push({
        _id: s._id,
        type: 'recurring',
        deviceId: s.deviceId,
        schedule: s,
        nextOccurrence: next,
        title: `${s.deviceId} → ${s.brightness}% (${s.repeat})`,
      });
    }

    res.json({ ok: true, schedules: unified });
  } catch (err) {
    console.error("[SCHEDULE GET] error:", err && err.stack ? err.stack : err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// DELETE /api/schedule/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const id = req.params.id;
    // try delete from schedules first
    const s = await Schedule.findByIdAndDelete(id);
    if (s) return res.json({ ok: true, message: 'Schedule removed' });

    // otherwise maybe it's a Command (one-shot)
    const c = await Command.findByIdAndDelete(id);
    if (c) return res.json({ ok: true, message: 'One-shot command removed' });

    return res.status(404).json({ ok: false, message: 'Not found' });
  } catch (err) {
    console.error("[SCHEDULE DELETE] error:", err && err.stack ? err.stack : err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

module.exports = router;
