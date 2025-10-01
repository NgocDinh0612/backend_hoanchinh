const express = require('express');
const router = express.Router();
const LightDevice = require('../models/LightDevice');
const LightStatus = require('../models/LightStatus');
const Command = require('../models/Command');
// Gateway gửi dữ liệu nhiều node lên Backend 
router.post('/report', async (req, res) => {
    try {
        const {gw_id, timestamp, node } = req.body;
        if (!gw_id || !Array.isArray(node)) {
            return res.status(400).json({ ok: false, message: 'Invalid payload' });
        }
        for (const node of nodes) {
            const { node__id, sens, lamp} = node;
            if (node__id) continue;
            await LightStatus.findOneAndUpdate(
                { deviceId: node__id },
                { 
                    $set: { 
                        relay: lamp?.state =="ON",
                        brightness: lamp?.dim ?? 0,
                        lux: sen?.lux ?? null,
                        lastUpdated: timestamp ? new Date(timestamp * 1000) : new Date(),
                     } 
                    },
                    { upsert: true }
            );

            // Nếu node chưa có trong LightDevice thì tạo mới 
            let device = await LightDevice.findOne({ deviceId: node__id });
            if (!device) {
                await LightDevice.create({ 
                    deviceId: node__id,
                    name: `Device-${node__id}}`,
                    location: "",
                    user: null,
                    isDeleted: false,
                });
            }
        }
        res.json({ ok: true});
    } catch (err) {
        console.error("[POST /gateway/report] Error:", err.message);
        res.status(500).json({ ok: false, message: 'Server Error' });
    }
});


//Gateway lấy lệnh điều khiển cho các node 
router.get('/commands', async (req, res) => {
    try {
        const gw_id = req.query.gw_id;
        if (!gw_id) {
            return res.status(400).json({ ok: false, message: 'Missing gw_id' });
        }
        // Lấy tất cả các lệnh peding cho các node này( có thể lọc theo gw_id nếu cần)
        const cmds = await Command.find({ status: 'pending' });

        const cmdsArray = cmds.map(cmd => ({
            node__id: cmd.deviceId,
            lamp: {
                state: cmd.command === 'ON' ? 'ON' : 'OFF',
                dim: cmd.command === 'DIM' ? cmd.value : 0
            },
            command_id: cmd._id
        }));
        //  Đánh dấu các lệnh đã gửi 
        await Command.updateMany(
            { _id: { $in: cmds.map(c => c._id) } },
            { $set: { status: 'sent', updatedAt: new Date() } }
        );
        res.json({ 
            gw_id,
            cmds: cmdsArray,
            timestamp: Math.floor(Date.now() / 1000)
        });
    } catch (err) {
        console.error("[GET /gateway/commands] Error:", err.message);
        res.status(500).json({ ok: false, message: 'Server Error' });
    }
});
module.exports = router;