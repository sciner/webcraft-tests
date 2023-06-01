import { WebSocket } from 'ws';
import { Vector } from "../webcraft/www/js/helpers.js";
import { ServerClient } from "../webcraft/www/js/server_client.js";
import {GAME_MODE, GameMode} from "../webcraft/www/js/game_mode.js";
import { ClientPlayerControlManager, PlayerControlManager } from "../webcraft/www/js/control/player_control_manager.js";
import { TestApp } from "./app.js";
import { MOUSE } from "../webcraft/www/js/constant.js";
import { decompressNearby } from "../webcraft/www/js/packet_compressor.js";

//
const API_URL                   = 'http://localhost:5700';
const WEBSOCKET_SERVER_URL      = 'ws://127.0.0.1:5700/ws';
const DEFAULT_VIEW_DISTANCE     = 4;
const CHUNK_SIZE_X              = 16;
const MAX_DIST_FROM_SPAWN       = ((DEFAULT_VIEW_DISTANCE * 2) + 3) * CHUNK_SIZE_X;
const LOG_ALIVE_SECONDS         = 60

// Player
export class TestPlayer {

    static loggedUnknownPackets = []

    options = {
        is_spectator_bot: true
    }
    game_mode = {
        isSpectator: () => true
    }
    world = {
        server: {
            Send: (packet) => {
                this.ws.send(JSON.stringify(packet))
            }
        }
    }
    controls = {
        enabled: true
    }
    nextLogAlive = performance.now() + LOG_ALIVE_SECONDS * 1000
    game_mode = new GameMode(this, GAME_MODE.SPECTATOR)
    rotate = new Vector(0, 0, 0)    // инпут игрока - вращение

    constructor(world_guid, pos_spawn, skin, username) {
        this.app = new TestApp(this, API_URL);
        this.skin = skin;
        this.pos_spawn = new Vector(pos_spawn);
        this.username = username
        this.sharedProps = {
            pos: new Vector(pos_spawn)
        }
        this.world_guid = world_guid;
        if(!this.world_guid) {
            throw 'error_game_not_started';
        }
        this._on = new Map();
        this.controlManager = new ClientPlayerControlManager(this)
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
                try {
                    this.onWebsocketPacket(packet);
                } catch(e) {
                    console.error(`Error onWebsocketPacket ${ServerClient.getCommandTitle(packet.name)} ${e}`)
                    this.close()
                    return
                }
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
        if (performance.now() > this.nextLogAlive) {
            this.nextLogAlive += LOG_ALIVE_SECONDS * 1000
            console.log(`${this.username} still receives packets`)
        }
        switch(packet.name) {
            case ServerClient.CMD_WORLD_INFO: {
                this.sendWebsocketPacket(ServerClient.CMD_CONNECT, {
                    world_guid: this.world_guid,
                    is_spectator_bot: true
                });
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
                const vec = new Vector(packet.data.pos)
                this.controlManager.setPos(vec)
                this.controlManager.startNewPhysicsSession(vec)
                break;
            }
            case ServerClient.CMD_CHUNK_LOADED: {
                break;
            }
            case ServerClient.CMD_CONNECTED: {
                this.onJoin(packet);
                break;
            }
            case ServerClient.CMD_PLAYER_CONTROL_ACCEPTED:
                this.controlManager.onServerAccepted(packet.data)
                break
            case ServerClient.CMD_CHAT_SEND_MESSAGE:
            case ServerClient.CMD_BUILDING_SCHEMA_ADD:
            case ServerClient.CMD_HELLO:
            case ServerClient.CMD_NOTHING:
            case ServerClient.CMD_BLOCK_SET:
            case ServerClient.CMD_FLUID_DELTA:
            case ServerClient.CMD_FLUID_UPDATE:
            case ServerClient.CMD_MOB_ADD:
            case ServerClient.CMD_MOB_UPDATE:
            case ServerClient.CMD_MOB_DELETE:
            case ServerClient.CMD_PLAYER_STATE:
            case ServerClient.CMD_PLAYER_JOIN:
            case ServerClient.CMD_PLAYER_LEAVE: {
                // do nothing
                break;
            }
            default:
                if (!TestPlayer.loggedUnknownPackets[packet.name]) {
                    TestPlayer.loggedUnknownPackets[packet.name] = true
                    console.log(`Unknown packet ${ServerClient.getCommandTitle(packet.name)}`)
                }
        }
    }

    onJoin(packet) {
        this.inventory = packet.data.inventory;
        this.session = packet.data.session;
        this.state = packet.data.state;
        // player control
        this.controlManager = new ClientPlayerControlManager(this);
        // ticker interval timer
        this.intv = setInterval(() => {
            try {
                const delta = (performance.now() - (this.tick_time || performance.now())) / 1000;
                this.tick(delta);
                this.tick_time = performance.now();
            } catch (e) {
                console.error(e)
                clearInterval(this.intv)
            }
        }, 50);

    }

    // Tick player by timer every 50ms
    tick(delta) {
        const {controlManager, state, rotate} = this;
        const pc = controlManager.spectator
        // move straight
        if(Math.random() < .1) {
            const spawn_distance = this.pos_spawn.distance(state.pos);
            if(spawn_distance > MAX_DIST_FROM_SPAWN) {
                rotate.z = this.angleTo(this.pos_spawn);
            } else {
                rotate.z += (delta * 1000) * (Math.random() - Math.random());
            }
            PlayerControlManager.fixRotation(rotate)
        }
        this.controls.forward = true
        controlManager.update()
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