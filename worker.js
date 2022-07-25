import { parentPort } from "worker_threads";
import fetch from 'node-fetch';
import { exit } from "process";
import { TestPlayer } from "./player.js";

// for compatibility
globalThis.FormData = class FormData {}
globalThis.fetch = fetch;

parentPort.on('message', function onMessageFunc(data) {

    const cmd = data[0];
    const args = data[1];

    switch(cmd) {
        case 'init': {
            import('./player.js').then((module) => {
                const client = new TestPlayer(args.world_guid, args.pos_spawn, args.skin);
                client.on('close', () => {
                    exit();
                });
                client.registration(args.username, '12345');
            });
            break;
        }
    }

});