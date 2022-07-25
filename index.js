import { Vector } from "../webcraft/www/js/helpers.js";
import { Worker } from "worker_threads";

class Test {

    async start(world_guid, test_players_count) {
        this.test_players = [];
        for(let i = 0; i < test_players_count; i++) {
            const worker = new Worker('./worker.js', {type: 'module'});
            worker.on('exit', () => {
                console.log(`Worker closed ${worker.params?.username}!`);
            });
            worker.params = {
                world_guid:     world_guid,
                username:       `Bot${i}`,
                skin:           i % 25,
                pos_spawn:      new Vector(i * 1000, 75, 0)
            };
            worker.postMessage(['init', worker.params])
            this.test_players.push(worker);
        }
    }

}

const test = new Test();
test.start('c92dde0e-e722-4e1b-b221-649708f08f9a', 50);