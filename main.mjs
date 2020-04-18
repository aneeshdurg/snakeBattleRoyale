import {Game} from "./game.mjs"

function main() {
    const canvas = document.getElementById("display");
    const game = new Game(canvas);
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
        else if (e.key == " ")
            game.shrink();
        // TODO attack other players after shrink

        if (newMove)
            game.changeDirection(newMove);
    });

    const enemyParent = document.getElementById("enemiesParent");

    const enemies = [];
    for (let i = 0; i < 99; i++) {
        const enemyCanvas = document.createElement("canvas");
        enemyCanvas.classList.add("enemy");
        enemyCanvas.width = canvas.width;
        enemyCanvas.height = canvas.height;
        const enemyCtx = enemyCanvas.getContext("2d");
        enemies.push({
            canvas: enemyCanvas,
            ctx: enemyCtx,
        });
        enemyParent.appendChild(enemyCanvas);
    }


    const mspf = 1000 / 60;
    let lastTime = 0;
    let ticks = 0;
    let ticksPerEnemyRender = 10;
    function run() {
        const currTime = (new Date()).getTime();
        if ((currTime - lastTime) > mspf) {
            game.ontick();
            lastTime = currTime;
            const speed = game.ticksPerMove();
            const length = game.snake.length;
            document.getElementById("stats").innerHTML = `length: ${length} speed: ${speed} pwr: ${game.pwr}`;
            document.getElementById("pwrbar").value = game.pwr;
            if (ticks == 0) {
                for (let enemy of enemies)
                    enemy.ctx.drawImage(canvas, 0, 0);
            }
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
