import {Game, Directions} from "./game.mjs"
import {GameAI, GameAIController} from "./ai.mjs"
import {NetworkController} from "./networkController.mjs"

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

function createLoader() {
    const d = document.createElement("div");
    d.classList.add("loader");
    return d;
}

function validateClient(conn) {
    return new Promise(successCB => {
        let verifyDone = false;
        conn.on('data', (d) => {
            if (verifyDone)
                return;
            const msg = JSON.parse(d);
            if (!msg.protocol || msg.protocol != 'setup' || msg.type != 'handshake') {
                successCB(false);
            } else {
                successCB(true);
            }

            verifyDone = true;
        });
    });
}

async function main() {
    const instructionModal = document.getElementById("instructionModal");
    const instructionsBtn = document.getElementById("instructions");
    instructionsBtn.onclick = () => {
        instructionModal.style.display = "block";
    }
    instructionModal.onclick = () => {
        instructionModal.style.display = "none";
    };

    const connections = new Map();

    async function setupNetworking() {
        const netInfo = document.getElementById("networkInfo");
        netInfo.innerHTML = "";
        let networkingMode = await getNetworkingMode();

        console.log(`Selected mode ${networkingMode}`);
        if (networkingMode == "offline")
            return;
        // TODO consider using a Worker here to offload all networking to another
        // process.

        let loader = createLoader();
        netInfo.innerHTML = "Connecting to network...";
        netInfo.appendChild(loader);

        const peer = new Peer({
            host: "aneeshdurg.ddns.net",
            port: 5001,
            path: "peerserver",
            config: {'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }]}
        });
        let peerId = null;
        await new Promise((resolve, reject) => {
            peer.on('open', function(id) {
                peerId = id;
                resolve();
            });

            peer.on('error', function(err) {
                console.log("peer error", err);
                alert("Failed to establish connection! Try again or choose another option!\n" + err);
                return setupNetworking();
            });
        });

        netInfo.innerHTML = "";

        let hostId = null;
        let expectedClients = 0;

        if (networkingMode == "lobby") {
            let loader = createLoader();
            netInfo.innerHTML = "Connecting to lobby...";
            netInfo.appendChild(loader);
            const wsUrls = ["ws://18.220.3.4:5000/ws"];
            let ws = null
            for (let wsIdx = 0; wsIdx < wsUrls.length; wsIdx++) {
                try {
                    ws = new WebSocket(wsUrls[wsIdx]);
                    break;
                } catch {
                    continue;
                }
            }

            if (!ws) {
                alert("Connecting to the lobby failed!");
                return setupNetworking();
            }

            await new Promise(r => { ws.addEventListener("open", r); });
            netInfo.innerHTML = "";

            ws.send(peerId);

            await new Promise(start => {
                ws.addEventListener("message", async (m) => {
                    const msg = JSON.parse(m.data);
                    if (msg.type == "update") {
                        netInfo.innerHTML += "Lobby has " + msg.clients + " clients.<br>";
                    } else if (msg.type === "startHost") {
                        expectedClients = msg.expectedClients;
                        networkingMode = "peerhost";
                        start();
                    } else if (msg.type === "startClient") {
                        hostId = msg.host;
                        networkingMode = "peerconnect";
                        start();
                    }
                });
            });

            ws.close();

            netInfo.innerHTML = "";
        }

        if (networkingMode.endsWith("connect")) {
            if (!hostId) {
                hostId = prompt("Enter the ID of the peer you want to connect to");

                if (!hostId) {
                    alert("Please input a valid hostID");
                    return setupNetworking();
                }
            }

            loader = createLoader();
            netInfo.innerHTML = "Connecting to host...";
            netInfo.appendChild(loader);
            const host = peer.connect(hostId);
            await new Promise(r => {
                host.on('open', () => {
                    host.send(JSON.stringify({
                        protocol: 'setup',
                        type: 'handshake',
                    }));
                    r();
                });
            });
            netInfo.innerHTML = "";

            connections.set(hostId, host);

            let acceptingConnections = true;
            peer.on('connection', async (conn) => {
                if (!acceptingConnections) {
                    console.log(`Rejecting ${conn.peer}`);
                    return;
                }
                console.log(`Accepting ${conn.peer}`);
                const isValid = await validateClient(conn);
                if (!isValid)
                    conn.close();
                else
                    connections.set(conn.peer, conn);
            });

            loader = createLoader();
            netInfo.innerHTML = "Waiting for host to start game...";
            netInfo.appendChild(loader);
            const startGame = new Promise(start => {
                // Setup protocol client
                let setupDone = false;
                host.on('data', async (d) => {
                    if (setupDone)
                        return;

                    const msg = JSON.parse(d);
                    if (!msg.protocol || msg.protocol != 'setup') {
                        alert("Malformed packet from host! [" + msg.protocol + "]");
                        // idk
                        location.reload();
                    }

                    if (msg.type == 'start') {
                        acceptingConnections = false;
                        start();
                        setupDone = true;
                    } else if (msg.type == 'advertisement') {
                        for (let client of msg.clients) {
                            console.log(`Connecting to ${client} via ad`);
                            const clientConn = peer.connect(client);
                            clientConn.on('error', console.log);
                            await new Promise(r => {
                                clientConn.on('open', () => {
                                    console.log(`open ${client}`);
                                    clientConn.send(JSON.stringify({
                                        protocol: 'setup',
                                        type: 'handshake',
                                    }));
                                    r();
                                });
                                console.log("hi");
                                // TODO on error!
                            });
                            connections.set(client, clientConn);
                            console.log("New conns: ", connections.size);
                        }

                        console.log("Sending ack to host");
                        host.send(JSON.stringify({
                            protocol: 'setup',
                            type: 'ack',
                        }));
                    }
                });
            });
            await startGame;
            netInfo.innerHTML = "";
        } else {
            let startBtn = null;
            if (expectedClients == 0) {
                netInfo.innerHTML = `Host ID: <b>${peerId}</b><br>`;
                netInfo.innerHTML += "Players can join your game by entering the ID above <br><br>";
                startBtn = document.createElement("div");
                startBtn.classList.add("button");
                startBtn.innerText = "Start game";
                netInfo.appendChild(startBtn);
            }

            let unacked = 0;
            let setupDone = false;
            const clientsDisplay = document.getElementById("clients");
            const startGame = new Promise(start => {
                if (expectedClients == 0) {
                    startBtn.onclick = () => {
                        for (let client of connections.values()) {
                            client.send(JSON.stringify({
                                protocol: 'setup',
                                type: 'start',
                            }));
                        }

                        start();
                    };

                    clientsDisplay.style.display = "";
                }

                // Setup protocol host
                peer.on('connection', async (conn) => {
                    if (setupDone)
                        return;

                    console.log(`Host recieved conn! ${conn.peer}`);
                    const isValid = await validateClient(conn);
                    if (!isValid)
                        conn.close();
                    else {
                        // TODO validate that advertisement was successful
                        conn.on('data', (d) => {
                            if (setupDone)
                                return;

                            const msg = JSON.parse(d);
                            if (!msg.protocol || msg.protocol != 'setup')
                                return;

                            if (msg.type == "ack") {
                                unacked--;
                            }
                        });

                        if (connections.size) {
                            conn.send(JSON.stringify({
                                protocol: 'setup',
                                type: 'advertisement',
                                clients: [...connections.keys()],
                            }));
                            console.log("Waiting on acks", conn.peer, "->", ...connections.keys());
                            unacked++;
                        }

                        connections.set(conn.peer, conn);
                        if (connections.size == expectedClients)
                            start();
                        else {
                            console.log("Waiting for clients", connections.size, expectedClients);
                        }

                        if (expectedClients == 0) {
                            clientsDisplay.innerHTML = "<ul>";
                            for (let k of connections.keys())
                                clientsDisplay.innerHTML += `<li>${k}</li>`;
                            clientsDisplay.innerHTML += "</ul>";
                        }
                    }
                });
            });

            await startGame;

            console.log("Host starting game");

            while (unacked) {
                await new Promise(r => setTimeout(r, 100));
                console.log("Waiting on acks", unacked);
            }
            setupDone = true;

            for (let client of connections.values()) {
                client.send(JSON.stringify({
                    protocol: 'setup',
                    type: 'start',
                }));
            }

            if (expectedClients == 0)
                startBtn.remove();
            netInfo.innerHTML = "";
        }
    }

    await setupNetworking();

    document.getElementById("gameContainer").style.display = "";

    const canvas = document.getElementById("display");
    const game = new Game(canvas);

    const enemies = [];

    function resetSelection() {
        for (let enemy of enemies) {
            enemy.ctx.canvas.style.border = "";
            enemy.ctx.canvas.dataset.selected = "false";
        }
    }

    function select(canvas) {
        resetSelection();
        canvas.style.border = "solid 2px #afffff";
        canvas.dataset.selected = "true";
    }

    function createEnemyCtx() {
        const c = document.createElement("canvas");
        c.classList.add("enemy");
        c.dataset.selected = "false";
        c.onclick = () => { select(c); };
        c.width = canvas.width;
        c.height = canvas.height;
        const ctx = c.getContext("2d");
        return ctx;
    }

    const maxAIs = connections.size ? 0 : 20;
    const enemyParent = document.getElementById("enemiesParent");

    for (let i = 0; i < maxAIs; i++) {
        const ctx = createEnemyCtx();
        const offscreenCanvas = document.createElement("canvas");
        const enemyGame = new Game(offscreenCanvas);
        const enemyAI = new GameAI(enemyGame, i, game, enemies, 0.9, 1);
        const controller = new GameAIController(offscreenCanvas, enemyGame, enemyAI);
        enemies.push({ctx: ctx, controller: controller});
        enemyParent.appendChild(ctx.canvas);
    }

    connections.forEach(conn => {
        console.log(`Setting up conn ${conn.peer}`);

        const ctx = createEnemyCtx();
        const offscreenCanvas = document.createElement("canvas");
        const controller = new NetworkController(conn, game);
        console.log(controller);
        enemies.push({ctx: ctx, controller: controller});
        enemyParent.appendChild(ctx.canvas);
    });

    select(enemies[0].ctx.canvas);

    const algoBtn = document.getElementById("algo");
    const algos = ["Random", "Power", "Damage", "Manual"];
    algoBtn.onclick = () => {
        const newAlgoId = (algos.findIndex((x) => x == algoBtn.dataset.algo) + 1) % 4;
        const newAlgo = algos[newAlgoId];
        algoBtn.innerHTML = newAlgo;
        algoBtn.dataset.algo = newAlgo;
    };

    function enemyTargetingAlgorithm() {
        if (algoBtn.dataset.algo == "Random") {
            const id = Math.floor(Math.random() * enemies.length);
            select(enemies[id].ctx.canvas);
            return id;
        } else if (algoBtn.dataset.algo == "Power") {
            const maxPwr = -Infinity;
            const maxId = -1;
            for (let id = 0; id < enemies.length; id++) {
                const pwr = enemies[id].controller.pwr;
                if (pwr > maxPwr) {
                    maxId = id;
                    maxPwr = pwr;
                }
            }

            select(enemies[maxId].ctx.canvas);
            return maxId;
        } else if (algoBtn.dataset.algo == "Damage") {
            const maxDmg = -Infinity;
            const maxId = -1;
            for (let id = 0; id < enemies.length; id++) {
                const dmg = enemies[id].controller.dmg;
                if (dmg > maxDmg) {
                    maxId = id;
                    maxDmg = dmg;
                }
            }

            select(enemies[maxId].ctx.canvas);
            return maxId;
        } else if (algoBtn.dataset.algo == "Manual") {
            return enemies.findIndex((enemy) => enemy.ctx.canvas.dataset.selected == "true");
        }
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
                enemies[enemyTargetingAlgorithm()].controller.damage(dmg);
        }

        if (newMove)
            game.changeDirection(newMove);
    });


    const mspf = 1000 / 30;
    let lastTime = 0;
    let ticks = 0;
    let ticksPerEnemyRender = 10;

    async function updateControllers() {
        const idsToRemove = [];
        for (let id = 0; id < enemies.length; id++) {
            const enemy = enemies[id];
            enemy.controller.ontick();
            if (ticks == 0)
                await enemy.controller.draw(enemy.ctx);
            if (enemy.controller.gameover())
                idsToRemove.push(id);
        }

        idsToRemove.forEach((id, count) => {
            const enemy = enemies.splice(id - count, 1)[0];
            enemy.ctx.clearRect(0, 0, enemy.ctx.canvas.width, enemy.ctx.canvas.height);
            setTimeout(() => { enemy.ctx.canvas.remove() }, 500);
        });
    }

    let sentGameover = false;
    async function run() {
        const currTime = (new Date()).getTime();
        if ((currTime - lastTime) > mspf) {
            if (enemies.length == 0 && !game.gameover)
                game.victory = true;

            game.ontick();

            lastTime = currTime;
            const speed = game.ticksPerMove();
            const length = game.snake.length;

            await updateControllers();

            if (game.gameover && !sentGameover) {
                sentGameover = true;
                connections.forEach(conn => {
                    conn.send(JSON.stringify({protocol: "game", type: "gameover"}));
                });
            } else if (!game.gameover) {
                if (ticks == 0) {
                    // update connections w/ canvas state
                    const data = canvas.toDataURL();
                    connections.forEach(conn => {
                        conn.send(JSON.stringify({
                            protocol: "game",
                            type: "canvasUpdate",
                            data: data,
                        }));
                    });
                }

                connections.forEach(conn => {
                    conn.send(JSON.stringify({
                        protocol: "game",
                        type: "stats",
                        pwr: game.pwr,
                        dmg: game.dmg,
                    }));
                });

                ticks++;
                ticks %= ticksPerEnemyRender;
            }
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
