var userCreds;
var session_id_player;
var world_guid = '449e4e9d-4381-4c8c-b14c-772812a2a02d';



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
    const ws = new WebSocket(socketLink);
    ws.onopen;
    ws.onmessage = response => console.log(response.data);

    console.log(`[ИНФОРМАЦИЯ]: Игрок вошел в игру`);
}



// #################################################### main ############################################################

await playerRegistration();
await sleep(5000);
await playerAutorization();
await sleep(5000);
await joiningWorld();

