/**
 * 晓山青 - 队友位置共享 WebSocket 服务器
 * 
 * 使用方法:
 *   npm install ws
 *   node server-teammate.js
 * 
 * 然后在浏览器中打开 app.html，队友页面会自动连接 ws://localhost:8765
 */

const WebSocket = require('ws');

const PORT = process.env.PORT || 8765;
const wss = new WebSocket.Server({ port: PORT });

// teamId -> Map(ws -> teammateInfo)
// 结构: { id, name, lat, lng, accuracy, battery, timestamp, online }
const teams = new Map();

function broadcast(teamId, message, excludeWs = null) {
    const members = teams.get(teamId);
    if (!members) return;
    const data = JSON.stringify(message);
    for (const [ws] of members) {
        if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
            ws.send(data);
        }
    }
}

function sendTo(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}

wss.on('connection', (ws) => {
    let currentTeam = null;
    let currentMember = null;

    ws.on('message', (raw) => {
        let msg;
        try { msg = JSON.parse(raw.toString()); } catch { return; }

        switch (msg.type) {
            case 'join': {
                // 离开旧队伍
                if (currentTeam && teams.has(currentTeam)) {
                    teams.get(currentTeam).delete(ws);
                    broadcast(currentTeam, {
                        type: 'member_left',
                        id: currentMember?.id,
                        timestamp: Date.now()
                    });
                }

                currentTeam = msg.teamId || 'default';
                currentMember = {
                    id: msg.memberId || `user_${Date.now()}`,
                    name: msg.name || '队友',
                    lat: msg.lat || 0,
                    lng: msg.lng || 0,
                    accuracy: msg.accuracy || 0,
                    battery: msg.battery || 100,
                    timestamp: Date.now(),
                    online: true,
                    ws
                };

                if (!teams.has(currentTeam)) {
                    teams.set(currentTeam, new Map());
                }
                teams.get(currentTeam).set(ws, currentMember);

                // 返回当前队伍所有成员
                const members = [];
                for (const [, m] of teams.get(currentTeam)) {
                    members.push({
                        id: m.id, name: m.name,
                        lat: m.lat, lng: m.lng,
                        accuracy: m.accuracy, battery: m.battery,
                        timestamp: m.timestamp, online: m.online
                    });
                }
                sendTo(ws, { type: 'team_state', members, teamId: currentTeam });

                // 通知其他人
                broadcast(currentTeam, {
                    type: 'member_joined',
                    member: {
                        id: currentMember.id, name: currentMember.name,
                        lat: currentMember.lat, lng: currentMember.lng,
                        accuracy: currentMember.accuracy, battery: currentMember.battery,
                        timestamp: currentMember.timestamp, online: true
                    }
                }, ws);
                break;
            }

            case 'location_update': {
                if (!currentTeam || !currentMember) return;
                currentMember.lat = msg.lat || currentMember.lat;
                currentMember.lng = msg.lng || currentMember.lng;
                currentMember.accuracy = msg.accuracy || currentMember.accuracy;
                currentMember.battery = msg.battery || currentMember.battery;
                currentMember.timestamp = Date.now();

                broadcast(currentTeam, {
                    type: 'member_updated',
                    id: currentMember.id,
                    lat: currentMember.lat,
                    lng: currentMember.lng,
                    accuracy: currentMember.accuracy,
                    battery: currentMember.battery,
                    timestamp: currentMember.timestamp
                }, ws);
                break;
            }

            case 'ping': {
                sendTo(ws, { type: 'pong', timestamp: Date.now() });
                break;
            }
        }
    });

    ws.on('close', () => {
        if (currentTeam && teams.has(currentTeam)) {
            teams.get(currentTeam).delete(ws);
            broadcast(currentTeam, {
                type: 'member_left',
                id: currentMember?.id,
                timestamp: Date.now()
            });
        }
    });

    ws.on('error', (err) => {
        console.error('WebSocket error:', err.message);
    });
});

// 定期广播所有队伍的在线状态
setInterval(() => {
    for (const [teamId, members] of teams) {
        const status = [];
        for (const [, m] of members) {
            status.push({ id: m.id, name: m.name, online: m.online, timestamp: m.timestamp });
        }
        // 移除离线超过 60 秒的成员
        const now = Date.now();
        for (const [ws, m] of members) {
            if (now - m.timestamp > 60000) {
                members.delete(ws);
                broadcast(teamId, { type: 'member_left', id: m.id, timestamp: now });
            }
        }
    }
}, 30000);

console.log(`[晓山青] 队友位置共享服务器已启动 ws://localhost:${PORT}`);
console.log(`[晓山青] 队伍数量: 0，在线成员: 0`);
