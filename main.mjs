import {Game} from "./game.mjs"

function main() {
    const game = new Game("display");
    const mspf = 1000 / 60;
    let lastTime = 0;
    function run() {
        const currTime = (new Date()).getTime();
        if ((currTime - lastTime) > mspf) {
            game.ontick();
            lastTime = currTime;
            const speed = game.ticksPerMove();
            const length = game.snake.length;
            document.getElementById("stats").innerHTML = `length: ${length} speed: ${speed}`;
        }
        requestAnimationFrame(run);
    }
    run();
}

document.addEventListener('DOMContentLoaded', (event) => {
   main();
});
