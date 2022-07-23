var userCreds;
var session_id_player;
var world_guid = '449e4e9d-4381-4c8c-b14c-772812a2a02d';
const CMD_CONNECT = 34;


function sendWs(name, data) {
    ws.send(JSON.stringify({name, data}));
}

async function playerRegistration(){
    var session_id_player;
    // генерация данных пользователя
    var now = new Date();
    var userCreds = 'player' + now.getTime();
    this.userCreds = userCreds;
    console.log(`[ИНФОРМАЦИЯ]: сгененрированы пользовательские данные для регистрации - логин: [${userCreds}], пароль: [${userCreds}]`);

    // регистрация нового пользователя
    Game.App.Registration({username: this.userCreds, password: this.userCreds});
}

async function playerAutorization(){
    // авторизация пользователя
    var response = Game.App.Login({username: this.userCreds, password: this.userCreds});
    response.then((data) => {
        this.session_id_player = data.session_id;
        console.log(`[ИНФОРМАЦИЯ]: Пользователь авторизован - сессия: [${this.session_id_player}]`);
    });
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function joiningWorld(){
    var socketLink = `ws://127.0.0.1:5700/ws?session_id=${this.session_id_player}&skin=1&world_guid=${this.world_guid}`;
    ws = new WebSocket(socketLink);
    ws.onopen;
    ws.onmessage = response => console.log(response.data);

    console.log(`[ИНФОРМАЦИЯ]: Игрок вошел в игру`);
}

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}


function goForward(actionDuration){
    
    var posX;
    var posY;
    var posZ;

    var position;

    var x;
    var y;
    var z;

    for(var i=0; i<=actionDuration; i++){
        ws.onmessage = response => {

            // TODO if user with id in session
            posX = JSON.parse(response.data)[0]["data"]["pos"]["x"];
            posY = JSON.parse(response.data)[0]["data"]["pos"]["y"];
            posZ = JSON.parse(response.data)[0]["data"]["pos"]["z"];
            console.log(posX, posY, posZ);

            // position = {x: Number(posX) + 1, y: Number(posY), z: Number(posZ)};
            x = Number(posX) + 1;
            y = Number(posY);
            z = Number(posZ);

            ws.send(`{"name":43,"data":{"rotate":{"x":0.4508,"y":0,"z":4.754},"pos":{"x":${x},"y":${y},"z":${z}},"sneak":false,"ping":0}}`);
        };
                    
    }
    // console.log(`[ИНФОРМАЦИЯ]: Игрок [${playerId}] идет вперед [${actionSeconds}] секунд`);
}


function doAction(){
    var actionId = getRandomInt(4);
    var actionDuration = getRandomInt(20);
    switch(actionId){
    case 1: goForward(actionDuration); break;
    }
    switch(actionId){
    case 2: goBack(actionDuration); break;
    }
    switch(actionId){
    case 3: goLeft(actionDuration); break;
    }
    switch(actionId){
    case 4: goRight(actionDuration); break;
    }
}



// #################################################### main ############################################################

var ws;

// TODO registration realizing with socket
await playerRegistration();
await sleep(2500);
// TODO authorization realizing with socket
await playerAutorization();
await sleep(2500);
await joiningWorld();
await sendWs(CMD_CONNECT, {world_guid});






// ws.send(`{"name":43,"data":{"rotate":{"x":0.4508,"y":0,"z":4.754},"pos":{"x":2913.246,"y":87,"z":2776.234},"sneak":false,"ping":0}}`);