import {Game, Directions} from "./game.mjs"
import {GameAI} from "./ai.mjs"

async function getNetworkingMode() {
    let networkingMode = "";
    const networkOptions = document.getElementById("networkOptions");
    const p = new Promise(r => {
        for (let mode of ["offline", "lobby", "peerconnect", "peerhost"]) {
            document.getElementById(mode).onclick = () => {
                networkingMode = mode;
                r();
            };
        }
    });

    networkOptions.style.display = "";
    await p;
    networkOptions.style.display = "none";

    return networkingMode;
}

async function main() {
    const networkingMode = await getNetworkingMode();

    console.log(`Selected mode ${networkingMode}`);
    if (networkingMode.startsWith("peer")) {
        // TODO consider using a Worker here to offload all networking to another
        // process.
        const peer = new Peer();
        let peerId = null;
        console.log("Waiting to connect to peerserver");
        await new Promise((resolve, reject) => {
            peer.on('open', function(id) {
                peerId = id;
                resolve();
            });

            peer.on('error', function(err) {
                alert("Failed to connect to peercloudserver!");
                reject(err);
            });
        });
        console.log("Connected to peerserver");

        if (networkingMode.endsWith("connect")) {
            const hostId = prompt("Enter the ID of the peer you want to connect to");
            // host will send a list of other clients
            const conn = peer.connect(hostId);
            await new Promise(r => {
                conn.on('open', () => {
                    r();
                });
            });
            conn.on('data', (d) => { console.log("Recieved", d); conn.send("ack!"); });
        } else {
            // TODO display ID to allow others to connect
        }
    } else if (networkingMode == "lobby") {
        // TODO
        throw new Error("Unimplemented");
    }

    // TODO add an option menu to either:
    //  a) connect to the peercloud server
    //  b) connect to my server
    //  c) play offline

    const canvas = document.getElementById("display");
    const game = new Game(canvas);

    const enemyParent = document.getElementById("enemiesParent");

    const enemies = [];
    const maxAIs = 20;
    for (let i = 0; i < maxAIs; i++) {
        const enemyCanvas = document.createElement("canvas");
        enemyCanvas.classList.add("enemy");
        const enemyCtx = enemyCanvas.getContext("2d");
        const enemyOffscreenCanvas = document.createElement("canvas");
        const enemyGame = new Game(enemyOffscreenCanvas);
        enemyCanvas.width = enemyOffscreenCanvas.width;
        enemyCanvas.height = enemyOffscreenCanvas.height;
        enemies.push({
            canvas: enemyCanvas,
            ctx: enemyCtx,
            offscreenCanvas: enemyOffscreenCanvas,
            game: enemyGame,
            ai: new GameAI(enemyGame, i, game, enemies, 0.9, 1),
        });
        enemyParent.appendChild(enemyCanvas);
    }

    function enemyTargetingAlgorithm() {
        return Math.floor(Math.random() * enemies.length);
    }

    window.addEventListener("keydown", (e) => {
        let newMove = null;
        if (e.key == "w" || e.key == "ArrowUp")
            newMove = Directions.UP;
        else if (e.key == "a" || e.key == "ArrowLeft")
            newMove = Directions.LEFT;
        else if (e.key == "s" || e.key == "ArrowDown")
            newMove = Directions.DOWN;
        else if (e.key == "d" || e.key == "ArrowRight")
            newMove = Directions.RIGHT;
        else if (e.key == " ") {
            const dmg = game.shrink();
            if (dmg)
                enemies[enemyTargetingAlgorithm()].game.damage(dmg);
        }

        if (newMove)
            game.changeDirection(newMove);
    });


    const mspf = 1000 / 30;
    let lastTime = 0;
    let ticks = 0;
    let ticksPerEnemyRender = 10;
    const directions = [Directions.LEFT, Directions.UP, Directions.RIGHT, Directions.DOWN];
    function run() {
        const currTime = (new Date()).getTime();
        if ((currTime - lastTime) > mspf) {
            if (enemies.length == 0 && !game.gameover)
                game.victory = true;

            game.ontick();
            lastTime = currTime;
            const speed = game.ticksPerMove();
            const length = game.snake.length;

            const idsToRemove = [];
            enemies.forEach((enemy, id) => {
                if (Math.random() <= 0.75) {
                    enemy.ai.ontick();
                    enemy.game.ontick();
                }
                if (ticks == 0)
                    enemy.ctx.drawImage(enemy.offscreenCanvas, 0, 0);
                if (enemy.game.gameover) {
                    idsToRemove.push(id);
                }
            });

            idsToRemove.forEach((id, count) => {
                const enemy = enemies.splice(id - count, 1)[0];
                enemy.ctx.clearRect(0, 0, enemy.canvas.width, enemy.canvas.height);
            });
            ticks++;
            ticks %= ticksPerEnemyRender;
        }
        requestAnimationFrame(run);
    }
    run();
}

document.addEventListener('DOMContentLoaded', async function () {
    console.log("Loading peer.js");
    const p = new Promise(r => {
        const peerJs = document.createElement("script");
        peerJs.type = "text/javascript";
        peerJs.src = "https://unpkg.com/peerjs@1.0.0/dist/peerjs.min.js";
        peerJs.onload = r;
        peerJs.onreadystatechange = r;
        document.head.appendChild(peerJs);
    });
    await p;
    console.log("Loaded peer.js");
    main();
});
