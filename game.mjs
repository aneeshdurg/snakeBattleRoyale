function posEq(a, b) {
    return a[0] == b[0] && a[1] == b[1];
}

export const Directions = {
    LEFT: 1,
    RIGHT: 2,
    UP: 3,
    DOWN: 4,
}

export class Game {
    tileSize = 32
    width = 20
    height = 20

    addToSnake = 0
    dmgPerAtk = 10

    gameover = false;
    victory = false;

    constructor(canvas) {
        this._ticks = 0;

        this.canvas = canvas;

        this.canvas.width = this.tileSize * this.width;
        this.canvas.height = this.tileSize * this.height;

        this.ctx = this.canvas.getContext("2d");

        this.snake = [];
        this.lastMove = Directions.UP;

        this.applePos = [Math.floor(this.width / 2), Math.floor(this.height / 2)];
        this.collectApple();

        this.pwr = 0;
        this.dmg = 0;
    }

    changeDirection(direction) {
        if (direction != this.lastMove) {
            this.lastMove = direction;
            this._ticks = 0;
        }
    }

    shrink() {
        if (this.pwr >= 10 && this.snake.length > 1) {
            this.pwr -= 10;

            const points = Math.floor(this.snake.length / 2);
            this.dmg = Math.max(this.dmg - points, 0);

            for (let i = 0; i < points; i++)
                this.snake.shift();
            return points;
        }
    }

    damage(dmg) {
        this.dmg += dmg;
        // TODO dmg timer and stuff
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
        this.pwr++;
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

    hasSnakeOnTile(pt) {
        return this.snake.findIndex(x => posEq(x, pt)) != -1;
    }

    move(direction) {
        const currentPos = this.snake[this.snake.length - 1];
        let nextPos = [...currentPos];

        if (direction == Directions.LEFT) {
            nextPos[0] -= 1;
        } else if (direction == Directions.RIGHT) {
            nextPos[0] += 1;
        } else if (direction == Directions.UP) {
            nextPos[1] -= 1;
        } else if (direction == Directions.DOWN) {
            nextPos[1] += 1;
        }

        // TODO render something on death
        if (this.hasSnakeOnTile(nextPos) || this.isOutOfBounds(nextPos)) {
            return -1;
        }

        if (this.applePos && posEq(this.applePos, nextPos)) {
            this.collectApple();
            return 0;
        } else if (this.addToSnake != 0) {
            this.addToSnake--;
            this.snake.push(nextPos);
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
            this.gameover = true
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

    renderbars() {
        this.ctx.fillStyle = "#42e9f540";
        this.ctx.fillRect(10, 10, (this.canvas.width - 20) * Math.min(this.pwr / 10, 1), 32);
        this.ctx.fillStyle = "#f54b4240";
        this.ctx.fillRect(10, 52, (this.canvas.width - 20) * Math.min(this.dmg / this.dmgPerAtk, 1), 32);
    }

    render() {
        this.clear();
        this.renderBackground();
        this.updateSnake();
        this.renderApple();
        this.renderbars();
    }

    ontick() {
        if (this.victory) {
            this.ctx.fillStyle = "green";
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else if (this.gameover) {
            this.ctx.fillStyle = "red";
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else {
            if (this.dmg >= this.dmgPerAtk) {
                this.dmg -= this.dmgPerAtk;
                this.addToSnake += 10;
            }

            this.render();

            this._ticks++;
            this._ticks %= this.ticksPerMove();
        }
    }
}
