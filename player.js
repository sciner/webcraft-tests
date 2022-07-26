import { WebSocket } from 'ws';
import { Vector } from "../webcraft/www/js/helpers.js";
import { ServerClient } from "../webcraft/www/js/server_client.js";
import { SpectatorPlayerControl } from "../webcraft/www/js/spectator-physics.js";
import { TestApp } from "./app.js";
import { MOUSE } from "../webcraft/www/js/constant.js";
import { CHUNK_SIZE_X } from "../webcraft/www/js/chunk_const.js";
import { compressPlayerStateC, decompressNearby } from "../webcraft/www/js/packet_compressor.js";

//
const API_URL                   = 'http://localhost:5700';
const WEBSOCKET_SERVER_URL      = 'ws://127.0.0.1:5700/ws';
const DEFAULT_VIEW_DISTANCE     = 4;
const MAX_DIST_FROM_SPAWN       = ((DEFAULT_VIEW_DISTANCE * 2) + 3) * CHUNK_SIZE_X;

// Player
export class TestPlayer {

    constructor(world_guid, pos_spawn, skin) {
        this.app = new TestApp(this, API_URL);
        this.skin = skin;
        this.pos_spawn = new Vector(pos_spawn);
        this.world_guid = world_guid;
        if(!this.world_guid) {
            throw 'error_game_not_started';
        }
        this._on = new Map();
    }

    on(event_name, callback) {
        this._on.set(event_name, callback);
    }

    apiCall(method, params, callback, callback_error) {
        this.app.api.call(this.app, method, params, callback, (err) => {
            console.error('api error: ', err);
            if(callback_error) {
                callback_error(err);
            }
        });
    }

    // регистрация нового пользователя
    registration(username, password) {
        this.apiCall('/api/User/Registration', {username, password}, (result) => {
            this.login(username, password);
        }, (err) => {
            this.login(username, password);
        });
    }

    // авторизация пользователя
    login(username, password) {
        this.apiCall('/api/User/Login', {username, password}, (result) => {
            this.session = result;
            this.connectToWebsocket();
        });
    }

    //
    connectToWebsocket() {
        const connection_string = WEBSOCKET_SERVER_URL + `?session_id=${this.session.session_id}&skin=${this.skin}&world_guid=${this.world_guid}`;
        this.ws = new WebSocket(connection_string);
        this.ws.on('message', (data, isBinary) => {
            const packets = JSON.parse(data);
            for(let packet of packets) {
                this.onWebsocketPacket(packet);
            }
        });
        //
        this.ws.on('close', () => {
            const onclose = this._on.get('close');
            if(onclose) {
                onclose();
            }
        });
    }

    // react to websocket packets
    onWebsocketPacket(packet) {
        //if([ServerClient.CMD_PLAYER_STATE].indexOf(packet.name) < 0) {
        //    console.log('ws>', packet);
        //}
        switch(packet.name) {
            case ServerClient.CMD_WORLD_INFO: {
                this.sendWebsocketPacket(ServerClient.CMD_CONNECT, {world_guid: this.world_guid});
                break;
            }
            case ServerClient.CMD_ENTITY_INDICATORS: {
                break;
            }
            case ServerClient.CMD_NEARBY_CHUNKS: {
                const nearby = decompressNearby(packet.data);
                for(let added of nearby.added) {
                    if(added.has_modifiers) {
                        this.sendWebsocketPacket(ServerClient.CMD_CHUNK_LOAD, {pos: added.addr});
                    }
                }
                break;
            }
            case ServerClient.CMD_TELEPORT: {
                const vec = new Vector(packet.data.pos);
                const pc = this.pc;
                try {
                    pc.player.entity.position.copyFrom(vec);
                    pc.player_state.pos.copyFrom(vec);
                    pc.player_state.onGround = false;
                    this.state.pos = vec.clone();
                } catch(e) {
                    debugger;
                }
                break;
            }
            case ServerClient.CMD_CHUNK_LOADED: {
                break;
            }
            case ServerClient.CMD_CONNECTED: {
                this.onJoin(packet);
                break;
            }
            case ServerClient.CMD_CHAT_SEND_MESSAGE: 
            case ServerClient.CMD_PLAYER_JOIN: {
                // do nothing
                break;
            }
        }
    }

    onJoin(packet) {
        this.inventory = packet.data.inventory;
        this.session = packet.data.session;
        this.state = packet.data.state;
        // hard reset spawn position
        this.state.pos = this.pos_spawn.clone(); // new Vector(this.state.pos);
        this.state.rotate = new Vector(this.state.rotate);
        // player control
        this.pc = new SpectatorPlayerControl(null, this.state.pos);
        // ticker interval timer
        this.intv = setInterval(() => {
            const delta = (performance.now() - (this.tick_time || performance.now())) / 1000;
            this.tick(delta);
            this.tick_time = performance.now();
        }, 50);

    }

    // Tick player by timer every 50ms
    tick(delta) {
        const {pc, state} = this;
        // move straight
        if(Math.random() < .1) {
            const spawn_distance = this.pos_spawn.distance(state.pos);
            if(spawn_distance > MAX_DIST_FROM_SPAWN) {
                state.rotate.z = this.angleTo(this.pos_spawn);
            } else {
                state.rotate.z += (delta * 1000) * (Math.random() - Math.random());
            }
        }
        pc.player_state.yaw = state.rotate.z;
        pc.controls.forward = true;
        pc.tick(delta);
        // set block
        /*
        if(Math.random() < .05) {
            const block_pos = state.pos.floored();
            block_pos.y = 0;
            this.sendPickatAction({
                createBlock: true,
                button_id: MOUSE.BUTTON_RIGHT,
                pos: {
                    x: block_pos.x,
                    y: block_pos.y,
                    z: block_pos.z,
                    n: Vector.ZERO,
                    point: Vector.ZERO
                }
            });
        }
        */
        // Send player actual position to server
        state.pos.copyFrom(pc.player.entity.position);
        this.sendWebsocketPacket(ServerClient.CMD_PLAYER_STATE, compressPlayerStateC({
            rotate:     state.rotate,
            pos:        state.pos,
            sneak:      pc.controls.sneak,
            ping:       0
        }));
    }

    angleTo(target) {
        const pos = this.state.pos;
        const angle = Math.atan2(target.x - pos.x, target.z - pos.z);
        return (angle > 0) ? angle : angle + 2 * Math.PI;
    }

    // Send pickat action (like set block)
    sendPickatAction(params, extra_data) {
        const data = {
            id: +new Date(),
            pos: {x: 0, y: 0, z: 0, n: Vector.ZERO, point: Vector.ZERO},
            createBlock: false,
            destroyBlock: false,
            cloneBlock: false,
            changeExtraData: false,
            start_time: performance.now(),
            shift_key: false,
            button_id: MOUSE.BUTTON_RIGHT,
            number: 1,
            extra_data: extra_data || null,
            ...params
        };
        this.sendWebsocketPacket(ServerClient.CMD_PICKAT_ACTION, data);
    }

    // Send command packet to server
    sendWebsocketPacket(name, data) {
        this.ws.send(JSON.stringify({name, data}));
    }

    // Close all connections and timers
    async close(code) {
        this.ws.close(code);
        if(this.intv) {
            clearInterval(this.intv);
        }
        console.log('test client closed');
    }

}