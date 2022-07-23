function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

function goForward(){
    let actionSeconds = 3000;
    Game.player.walk('forward', actionSeconds);
    console.log(`[ИНФОРМАЦИЯ]: Игрок [${playerId}] идет вперед [${actionSeconds}] секунд`);
}

function goBack(){
    let actionSeconds = 3000;
    Game.player.walk('back', actionSeconds);
    console.log(`[ИНФОРМАЦИЯ]: Игрок [${playerId}] идет назад [${actionSeconds}] секунд`);
}

function goLeft(){
    let actionSeconds = 3000;
    Game.player.walk('left', actionSeconds);
    console.log(`[ИНФОРМАЦИЯ]: Игрок [${playerId}] идет влево [${actionSeconds}] секунд`);
}

function goRight(){
    let actionSeconds = 3000;
    Game.player.walk('right', actionSeconds);
    console.log(`[ИНФОРМАЦИЯ]: Игрок [${playerId}] идет вправо [${actionSeconds}] секунд`);
}

function doAction(){
    var actionId = getRandomInt(4);
    switch(actionId){
    case 1: goForward(); break;
    }
    switch(actionId){
    case 2: goBack(); break;
    }
    switch(actionId){
    case 3: goLeft(); break;
    }
    switch(actionId){
    case 4: goRight(); break;
    }
}

function newPlayer(){
    // генерация данных пользователя
    var now = new Date();
    var userCreds = 'player' + now.getTime();
    console.log(`[ИНФОРМАЦИЯ]: сгененрированы пользовательские данные для регистрации - логин: [${userCreds}], пароль: [${userCreds}]`);


    // регистрация нового пользователя
    Game.App.Registration({username: userCreds, password: userCreds});

    setTimeout(() => {  console.log('Ожидание сервера'); }, 5000);

    // авторизация пользователя
    Game.App.Login({username: userCreds, password: userCreds});

    // Обновление страницы, надо сделать после авторизации
    window.location.reload();

    // переходим по реферальной ссылке, чтобы отобразился мир у игрока тоже
    window.location.href = referalUrl;
    window.location.reload();
}




//#############################################################################################################
//################################################### main ####################################################
//#############################################################################################################

let playerId = Game.player.session['user_id'];
// let referalUrl = 'http://127.0.0.1:5700#world_532ad1d2-27a4-409b-849e-c930c5248c44';
// setInterval(function(){
//     doAction();
// }, 5000);

newPlayer();

var socketLink = 'ws://127.0.0.1:5700/ws?session_id=86e22629-a8bc-43f1-9e4b-72f59bfb36b3&skin=1&world_guid=449e4e9d-4381-4c8c-b14c-772812a2a02d';
const ws = new WebSocket(socketLink);
ws.onopen;
ws.onmessage = response => console.log(response.data);

