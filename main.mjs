import {Game} from "./game.mjs"
import {GameAI} from "./ai.mjs"

function main() {
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
            newMove = Game.UP;
        else if (e.key == "a" || e.key == "ArrowLeft")
            newMove = Game.LEFT;
        else if (e.key == "s" || e.key == "ArrowDown")
            newMove = Game.DOWN;
        else if (e.key == "d" || e.key == "ArrowRight")
            newMove = Game.RIGHT;
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
    const directions = [Game.LEFT, Game.UP, Game.RIGHT, Game.DOWN];
    function run() {
        const currTime = (new Date()).getTime();
        if ((currTime - lastTime) > mspf) {
            if (enemies.length == 0 && !game.gameover)
                game.victory = true;

            game.ontick();
            lastTime = currTime;
            const speed = game.ticksPerMove();
            const length = game.snake.length;

            document.getElementById("pwrbar").value = game.pwr;
            document.getElementById("dmgbar").value = game.dmg;

            const idsToRemove = [];
            enemies.forEach((enemy, id) => {
                if (Math.random() <= 0.75) {
                    enemy.ai.ontick();
                    enemy.game.ontick();
                }
                if (ticks == 0) {
                    enemy.ctx.drawImage(enemy.offscreenCanvas, 0, 0);
                    enemy.ctx.fillStyle = "#42e9f540";
                    enemy.ctx.fillRect(10, 10, enemy.canvas.width * Math.min(enemy.game.pwr / 10, 1), 32);
                    enemy.ctx.fillStyle = "#f54b4240";
                    enemy.ctx.fillRect(10, 52, enemy.canvas.width * Math.min(enemy.game.dmg / 20, 1), 32);
                }
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

document.addEventListener('DOMContentLoaded', (event) => {
   main();
});
