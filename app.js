import { API_Client } from "../www/js/ui/api.js";

// App
export class TestApp {

    constructor(player, api_url) {
        this.player = player;
        this.api = new API_Client(api_url);
    }

    getSession() {
        return this.player.session;
    }

    logout() {}

    showError(message, timeout) {}

}