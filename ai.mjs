import {Game} from './game.mjs'

// A simple snake AI
export class GameAI {
    constructor(game, intelligence) {
        this.game = game;
        this.intelligence = intelligence;
    }

    computeShortestPath(current, target, visited, known) {
        // console.log(`CSP ${current} -> ${target}`);
        // console.log("    ", ...visited);
        if (current[0] == target[0] && current[1] == target[1]) {
            return {
                distance: 0,
                direction: Game.LEFT,
            };
        }

        const id = current[0] + current[1] * this.game.width;

        if (known.has(id))
            return known.get(id);

        visited.add(id);

        let distance = Infinity
        let direction = Game.LEFT;
        const that = this;
        function helper(currentDirection) {
            let nextPos = [...current];
            if (currentDirection == Game.LEFT)
                nextPos[0] -= 1;
            else if (currentDirection == Game.RIGHT)
                nextPos[0] += 1;
            else if (currentDirection == Game.UP)
                nextPos[1] -= 1;
            else if (currentDirection == Game.DOWN)
                nextPos[1] += 1;
            const nextId = nextPos[0] + nextPos[1] * that.game.width;

            if (!that.game.isOutOfBounds(nextPos) && !that.game.hasSnakeOnTile(nextPos) && !visited.has(nextId)) {
                const d = that.computeShortestPath(nextPos, target, visited, known);
                // console.log(`Checking direction ${currentDirection} ${d.distance}`);
                if (d.distance < distance) {
                    distance = d.distance;
                    direction = currentDirection;
                }
            }
        }

        helper(Game.LEFT);
        helper(Game.RIGHT);
        helper(Game.UP);
        helper(Game.DOWN);

        visited.delete(id);

        if (direction > 100)
            throw new Error("!");

        const retval = {
            direction: direction,
            distance: distance + 1
        };
        known.set(id, retval);

        return retval;
    }

    ontick() {
        if (Math.random() < this.intelligence) {
            // compute shortest path to apples
            const root = this.game.snake[this.game.snake.length - 1]
            const target = this.game.applePos;

            const d = this.computeShortestPath(root, target, new Set(), new Map());
            this.game.changeDirection(d.direction);
        } else {
            const directions = [Game.LEFT, Game.RIGHT, Game.UP, Game.DOWN];
            this.game.changeDirection(directions[Math.floor(Math.random() * 4)]);
        }
    }
}
