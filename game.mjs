function posEq(a, b) {
    return a[0] == b[0] && a[1] == b[1];
}

export class Game {
    static LEFT = 1;
    static RIGHT = 2;
    static UP = 3;
    static DOWN = 4;

    tileSize = 32
    width = 20
    height = 20

    constructor(id) {
        this._ticks = 0;

        this.canvas = document.getElementById(id);

        this.canvas.width = this.tileSize * this.width;
        this.canvas.height = this.tileSize * this.height;
        this.canvas.addEventListener("blur", () => {
            alert("lost focus!");
        });
        this.canvas.focus();

        this.ctx = this.canvas.getContext("2d");

        this.snake = [];
        this.lastMove = Game.UP;
        this.canvas.addEventListener("keydown", (e) => {
            let newMove = null;
            if (e.key == "w" || e.key == "ArrowUp")
                newMove = Game.UP;
            else if (e.key == "a" || e.key == "ArrowLeft")
                newMove = Game.LEFT;
            else if (e.key == "s" || e.key == "ArrowDown")
                newMove = Game.DOWN;
            else if (e.key == "d" || e.key == "ArrowRight")
                newMove = Game.RIGHT;
            if (newMove && newMove != this.lastMove) {
                this.lastMove = newMove;
                this._ticks = 0;
            }
        });

        this.applePos = [Math.floor(this.width / 2), Math.floor(this.height / 2)];
        this.collectApple();

        // TODO add obstacles
        this.obstacles = [];
    }

    ticksPerMove() {
        if (this.snake.length <= 10)
            return 15 - this.snake.length;

        if (this.snake.length > 10 && this.snake.length <= 20)
            return 4;

        if (this.snake.length > 20 && this.snake.length <= 30)
            return 3;

        if (this.snake.length > 30 && this.snake.length <= 40)
            return 2;

        if (this.snake.length > 40)
            return 1;
    }

    collectApple() {
        this.snake.push(this.applePos);
        // TODO generate new apple position
        while (true) {
            this.applePos = [Math.floor(Math.random() * this.width), Math.floor(Math.random() * this.height)];
            if (this.snake.findIndex((x) => posEq(x, this.applePos)) != -1)
                continue;
            break;
        }
    }

    isOutOfBounds(pt) {
        return pt[0] < 0 || pt[0] >= this.width || pt[1] < 0 || pt[1] >= this.height;
    }

    move(direction) {
        const currentPos = this.snake[this.snake.length - 1];
        let nextPos = [...currentPos];

        if (direction == Game.LEFT) {
            nextPos[0] -= 1;
        } else if (direction == Game.RIGHT) {
            nextPos[0] += 1;
        } else if (direction == Game.UP) {
            nextPos[1] -= 1;
        } else if (direction == Game.DOWN) {
            nextPos[1] += 1;
        }

        // TODO render something on death
        if (this.snake.findIndex(x => posEq(x, nextPos)) != -1) {
            return -1;
        } else if (this.isOutOfBounds(nextPos)) {
            return -1;
        }

        if (this.applePos && posEq(this.applePos, nextPos)) {
            this.collectApple();
            return 0;
        }

        return nextPos;
    }

    clear() {
        this.ctx.fillStyle = "#2b2b2b";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    renderBackground() {
        // TODO render background tiles
    }

    updateSnake() {
        let nextPos = 0;
        if (this._ticks == 0)
            nextPos = this.move(this.lastMove);

        if (nextPos == -1) {
            // TODO gameover
            return;
        }

        this.ctx.fillStyle = "#ffffff";
        for (let i = 0; i < this.snake.length; i++) {
            let tileIdx = 0;
            if (nextPos == 0) {
                tileIdx = i;
            } else {
                tileIdx = i + 1;
            }

            let tile = null;
            if (tileIdx >= this.snake.length)
                tile = nextPos;
            else
                tile = this.snake[tileIdx];

            this.snake[i] = tile;

            if (i == this.snake.length - 1)
                this.ctx.fillStyle = "#afffff";

            this.ctx.fillRect(this.tileSize * tile[0], this.tileSize * tile[1], this.tileSize, this.tileSize);
        }
    }

    renderApple() {
        if (!this.applePos)
            return;

        this.ctx.fillStyle = "red";
        this.ctx.fillRect(
            this.tileSize * this.applePos[0], this.tileSize * this.applePos[1], this.tileSize, this.tileSize);
    }

    render() {
        this.clear();
        this.renderBackground();
        this.updateSnake();
        this.renderApple();
    }

    ontick() {
        // get input somehow
        this.render();

        this._ticks++;
        this._ticks %= this.ticksPerMove();
    }
}
