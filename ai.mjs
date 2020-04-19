import {Directions} from './game.mjs'

// A simple snake AI
export class GameAI {
    constructor(game, id, nonAIGame, otherAIs, intelligence, aggression) {
        this.game = game;
        this.intelligence = intelligence;
        this.aggression = aggression;
        this.id = id;
        this.nonAIGame = nonAIGame;
        this.otherAIs = otherAIs;
    }

    computeShortestPath(current, target, visited, known) {
        // console.log(`CSP ${current} -> ${target}`);
        // console.log("    ", ...visited);
        if (current[0] == target[0] && current[1] == target[1]) {
            return {
                distance: 0,
                direction: Directions.LEFT,
            };
        }

        const id = current[0] + current[1] * this.game.width;

        if (known.has(id))
            return known.get(id);

        visited.add(id);

        let distance = Infinity
        let direction = Directions.LEFT;
        const that = this;
        function helper(currentDirection) {
            let nextPos = [...current];
            if (currentDirection == Directions.LEFT)
                nextPos[0] -= 1;
            else if (currentDirection == Directions.RIGHT)
                nextPos[0] += 1;
            else if (currentDirection == Directions.UP)
                nextPos[1] -= 1;
            else if (currentDirection == Directions.DOWN)
                nextPos[1] += 1;
            const nextId = nextPos[0] + nextPos[1] * that.game.width;

            if (!that.game.isOutOfBounds(nextPos) && !that.game.hasSnakeOnTile(nextPos) && !visited.has(nextId)) {
                const d = that.computeShortestPath(nextPos, target, visited, known);
                if (d.distance < distance) {
                    distance = d.distance;
                    direction = currentDirection;
                }
            }
        }

        helper(Directions.LEFT);
        helper(Directions.RIGHT);
        helper(Directions.UP);
        helper(Directions.DOWN);

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
            const directions = [Directions.LEFT, Directions.RIGHT, Directions.UP, Directions.DOWN];
            let direction = Math.floor(Math.random() * 4);
            for (let i = 0; i < 4; i++) {
                direction += i;
                direction %= 4;
                const currentDirection = directions[direction];
                let nextPos = [...this.game.snake[this.game.snake.length - 1]];
                if (currentDirection == Directions.LEFT)
                    nextPos[0] -= 1;
                else if (currentDirection == Directions.RIGHT)
                    nextPos[0] += 1;
                else if (currentDirection == Directions.UP)
                    nextPos[1] -= 1;
                else if (currentDirection == Directions.DOWN)
                    nextPos[1] += 1;

                if (!this.game.isOutOfBounds(nextPos) && !this.game.hasSnakeOnTile(nextPos))
                    break;
            }
            this.game.changeDirection(directions[direction]);
        }

        if (Math.random() < this.aggression) {
            const dmg = this.game.shrink();
            if (dmg) {
                const enemyID = Math.floor(Math.random() * this.otherAIs.length);
                if (enemyID == this.id) {
                    console.log("damaged nonAI");
                    this.nonAIGame.damage(dmg);
                } else {
                    console.log("damaged AI");
                    this.otherAIs[enemyID].game.damage(dmg);
                }
            }
        }
    }
}
