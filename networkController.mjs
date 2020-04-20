import {Controller} from './controller.mjs'

export class NetworkController extends Controller {
    pwr = 0;
    dmg = 0;

    _gameover = false;
    data = "";

    constructor(conn, playergame) {
        super();

        conn.on('data', (d) => {
            const msg = JSON.parse(d);
            if (!msg.protocol || msg.protocol != 'game') {
                // bad message ignore
                return;
            }

            if (msg.type == "canvasUpdate") {
                this.data = msg.data;
            } else if (msg.type == "gameover")
                this._gameover = true;
            else if (msg.type == "stats") {
                this.pwr = msg.pwr;
                this.dmg = msg.dmg;
            } else if (msg.type == "damage") {
                console.log("Recieved damage!");
                playergame.damage(msg.dmg);
                console.log("Dmg", msg.dmg, playergame.dmg);
            }
        });

        const that = this;
        function closeHandler() {
            that._gameover = true;
        }
        conn.on('close', closeHandler);
        conn.on('error', closeHandler);

        this.conn = conn;
    }

    damage(dmg) {
        console.log("Sending damage");
        this.conn.send(JSON.stringify({
            protocol: 'game',
            type: 'damage',
            dmg: dmg,
        }));
    }

    async draw(ctx) {
        const img = new Image();
        const that = this;
        if (this.data.length) {
            await new Promise(r => {
                img.onload = r;
                img.src = that.data;
            });
            ctx.drawImage(img, 0, 0);
        }
    }

    gameover() {
        return this._gameover;
    }
}
