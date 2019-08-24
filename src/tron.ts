declare const readline: () => string;

// function last<T>(a: T[]): T | undefined {
//     return a[a.length - 1]
// }

function shuffle<T extends Array<unknown>>(a: T): T {
    let j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

interface Pos {
    x: number;
    y: number;
}

function posToString({x, y}: Pos): string {
    return `${x}, ${y}`;
}

type Dir = 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';
const dirs: Dir[] = ['LEFT', 'RIGHT', 'UP', 'DOWN'];
const shift: {[dir in Dir]: (p: Pos) => Pos} = {
    LEFT: ({x, y}) => ({x: x - 1, y}),
    RIGHT: ({x, y}) => ({x: x + 1, y}),
    UP: ({x, y}) => ({x, y: y - 1}),
    DOWN: ({x, y}) => ({x, y: y + 1}),
};

const deriveDir = (prev: Pos, next: Pos): Dir => {
    const xDiff = next.x - prev.x;
    const yDiff = next.y - prev.y;
    if (xDiff === -1 && yDiff === 0) return 'LEFT';
    if (xDiff === 1 && yDiff === 0) return 'RIGHT';
    if (xDiff === 0 && yDiff === -1) return 'UP';
    if (xDiff === 0 && yDiff === 1) return 'DOWN';
    throw new Error(
        `No single step from ${posToString(prev)} to ${posToString(next)}`,
    );
};

const opposite: {readonly [dir in Dir]: Dir} = {
    LEFT: 'RIGHT',
    RIGHT: 'LEFT',
    UP: 'DOWN',
    DOWN: 'UP',
};

const sides: {readonly [dir in Dir]: [Dir, Dir]} = {
    LEFT: ['UP', 'DOWN'],
    RIGHT: ['UP', 'DOWN'],
    UP: ['LEFT', 'RIGHT'],
    DOWN: ['LEFT', 'RIGHT'],
};

const dirToString: {readonly [dir in Dir]: string} = {
    LEFT: '<',
    RIGHT: '>',
    UP: '↑',
    DOWN: '↓',
};

// const lines: string[] = [];
function readInts(readline: () => string): number[] {
    const line = readline();
    if (!line) return [];
    return line.split(' ').map(s => parseInt(s, 10));
}

type Input = {myIndex: number; startPosList: Pos[]; posList: Pos[]};
function readState(readline: () => string): Input | null {
    const [playerCount, myIndex] = readInts(readline);
    if (playerCount == null) return null;
    const posList = [];
    const startPosList = [];
    for (let i = 0; i < playerCount; i++) {
        const [x0, y0, x, y] = readInts(readline);
        startPosList.push({x: x0, y: y0});
        posList.push({x, y});
    }

    return {myIndex, startPosList, posList};
}

const gridWidth = 30;
const gridHeight = 20;

class Player {
    pos: Pos;
    dir: Dir | null = null;
    isDead = false;
    constructor(pos: Pos) {
        this.pos = pos;
    }
    step(pos: Pos): void {
        this.dir = deriveDir(this.pos, pos);
        this.pos = pos;
    }
    tryStepNext(): boolean {
        if (!this.dir || this.isDead) return false;
        this.pos = shift[this.dir](this.pos);
        return true;
    }
    stepBack(): void {
        if (!this.dir) return;
        this.pos = shift[opposite[this.dir]](this.pos);
    }
    swapDir(newDir: Dir): Dir | null {
        const prevDir = this.dir;
        this.dir = newDir;
        return prevDir;
    }
    getAvailableDirs(): Dir[] {
        if (this.dir == null) return dirs;
        if (this.isDead) return [];
        return sides[this.dir];
    }
}

function forEachPlayer<T>(
    arr: T[],
    startIndex: number,
    cb: (p: T, i: number) => void,
): void {
    for (let i = 0; i < arr.length; i++) {
        const playerIndex = (startIndex + i) % arr.length;
        cb(arr[playerIndex], playerIndex);
    }
}

class Cell {
    private trailOf = -1;
    private dir: null | Dir = null;

    toString(): string {
        if (this.trailOf == -1) return ' ';
        else if (this.dir == null) return String(this.trailOf);
        else return dirToString[this.dir];
    }

    markTrail(playerIndex: number, dir: Dir | null): void {
        this.trailOf = playerIndex;
        this.dir = dir;
    }

    unmarkTrail(): void {
        this.trailOf = -1;
    }

    isEmpty(): boolean {
        return this.trailOf === -1;
    }
}

class Grid {
    private grid: Cell[] = [];

    constructor() {
        for (let i = 0; i < gridWidth * gridHeight; i++) {
            this.grid.push(new Cell());
        }
    }

    isPosOnGrid({x, y}: Pos): boolean {
        return 0 <= x && x < gridWidth && 0 <= y && y < gridHeight;
    }

    cellAt(pos: Pos): Cell {
        if (!this.isPosOnGrid(pos)) {
            throw new Error(
                `Can't access cell outside grid: ${posToString(pos)}`,
            );
        }
        return this.grid[pos.y * gridWidth + pos.x];
    }

    tryCellAt(pos: Pos): Cell | null {
        if (this.isPosOnGrid(pos)) return this.grid[pos.y * gridWidth + pos.x];
        else return null;
    }

    isCellEmpty(pos: Pos): boolean {
        const cell = this.tryCellAt(pos);
        return cell != null && cell.isEmpty();
    }

    dump(): string {
        let result = '';
        for (let y = 0; y < gridHeight; y++) {
            let line = '';
            for (let x = 0; x < gridWidth; x++) line += this.cellAt({x, y});
            result += line + '\n';
        }
        return result;
    }
}

const maxDepth = gridWidth * gridHeight;

class Game {
    public readonly grid: Grid;
    private players: Player[] = [];
    private lastPlayerIndex = 0;

    constructor() {
        this.grid = new Grid();
    }

    getScore(playerIndex: number, depth: number): number {
        let score = depth / maxDepth;
        if (this.players[playerIndex].isDead) return score + 1;
        this.players.forEach((player, i) => {
            if (i === playerIndex) return;
            if (player.isDead) score += 1 / (this.players.length - 1);
        });
        return -score;
    }

    stepPlayer(playerIndex: number, pos: Pos): void {
        if (playerIndex >= this.players.length) {
            this.players[playerIndex] = new Player(pos);
            this.grid.cellAt(pos).markTrail(playerIndex, null);
        } else {
            const player = this.players[playerIndex];
            player.step(pos);
            this.grid.cellAt(pos).markTrail(playerIndex, player.dir);
        }
        this.lastPlayerIndex = playerIndex;
    }

    step(input: Input): void {
        const {myIndex, posList, startPosList} = input;
        if (this.players.length === 0 && myIndex > 0) {
            for (let playerIndex = 0; playerIndex < myIndex; playerIndex++) {
                const pos = startPosList[playerIndex];
                this.stepPlayer(playerIndex, pos);
            }
            this.step(input);
        } else {
            forEachPlayer(posList, myIndex, (pos, playerIndex) =>
                this.stepPlayer(playerIndex, pos),
            );
        }
    }

    tryStepNext(playerIndex: number): boolean {
        const player = this.players[playerIndex];
        if (!player.tryStepNext()) return false;
        const cell = this.grid.tryCellAt(player.pos);
        if (!cell || !cell.isEmpty()) {
            player.stepBack();
            return false;
        }
        cell.markTrail(playerIndex, player.dir);
        return true;
    }

    stepBack(playerIndex: number): void {
        const player = this.players[playerIndex];
        const cell = this.grid.cellAt(player.pos);
        cell.unmarkTrail();
        player.stepBack();
    }

    iteratePlayer(
        [playerIndex, ...restPlayers]: number[],
        cb: () => void,
    ): void {
        if (playerIndex == null) {
            cb();
            return;
        }
        const player = this.players[playerIndex];
        if (player.isDead) {
            this.iteratePlayer(restPlayers, cb);
            return;
        }

        if (this.tryStepNext(playerIndex)) {
            this.iteratePlayer(restPlayers, cb);
            this.stepBack(playerIndex);
            return;
        }

        let madeATurn = false;
        player.getAvailableDirs().forEach(dir => {
            const prevDir = player.swapDir(dir);
            if (!this.tryStepNext(playerIndex)) {
                player.dir = prevDir;
                return;
            }
            madeATurn = true;
            this.iteratePlayer(restPlayers, cb);
            this.stepBack(playerIndex);
            player.dir = prevDir;
        });
        if (madeATurn) return;

        player.isDead = true;
        this.iteratePlayer(restPlayers, cb);
        player.isDead = false;
    }

    forEachPossibleTurn(cb: () => void): void {
        const players: number[] = [];
        forEachPlayer(
            this.players,
            this.lastPlayerIndex + 1,
            (_, playerIndex) => players.push(playerIndex),
        );
        this.iteratePlayer(players, cb);
    }

    iterate(
        cb: (dir: Dir | null, depth: number) => void,
        depth = 0,
        dir: Dir | null = null,
    ): void {
        const myIndex = (this.lastPlayerIndex + 1) % this.players.length;
        this.forEachPossibleTurn(() => {
            if (this.players[myIndex].isDead) {
                cb(dir, depth);
                return;
            }
            if (depth === 0) {
                dir = this.players[myIndex].dir;
            }
            if (
                depth >= 100 ||
                this.players.filter(player => !player.isDead).length <= 1
            ) {
                cb(dir, depth);
            } else {
                this.iterate(cb, depth + 1, dir);
            }
        });
    }

    findBestDir(): Dir | null {
        const myIndex = (this.lastPlayerIndex + 1) % this.players.length;
        console.log(myIndex);
        const scores: {[dir in Dir]: number[]} = {
            LEFT: [],
            RIGHT: [],
            UP: [],
            DOWN: [],
        };
        this.iterate((dir, depth) => {
            if (dir) scores[dir].push(this.getScore(myIndex, depth));
        });

        let bestDir = null;
        let minScore = Infinity;
        dirs.forEach(dir => {
            console.log(dir, scores[dir]);
            const score =
                scores[dir].reduce((a, b) => a + b, 0) / scores[dir].length;
            if (isNaN(score)) return;
            if (score < minScore) {
                minScore = score;
                bestDir = dir;
            }
        });
        return bestDir;
    }

    ///

    trace(
        prevPos: Pos,
        dir: Dir,
        playerIndex: number,
    ): {dist: number; lastPos: Pos} {
        let dist;
        let pos;
        for (dist = 0; dist < 100; dist++) {
            pos = shift[dir](prevPos);
            const cell = this.grid.tryCellAt(pos);
            if (!cell || !cell.isEmpty()) break;
            prevPos = pos;
            this.grid.cellAt(pos).markTrail(playerIndex, dir);
        }
        return {dist, lastPos: prevPos};
    }

    untrace(pos: Pos, dir: Dir, maxDist: number): void {
        for (let dist = 0; dist < maxDist; dist++) {
            this.grid.cellAt(pos).unmarkTrail();
            pos = shift[dir](pos);
        }
    }

    bestDir(
        pos: Pos,
        playerIndex: number,
        iterationsLeft = 64,
    ): {dir: Dir; dist: number} {
        let outputDir = dirs[0];
        let maxDist = 0;
        if (!iterationsLeft) return {dir: outputDir, dist: 0};
        dirs.forEach(dir => {
            const {dist: firstDist, lastPos} = this.trace(
                pos,
                dir,
                playerIndex,
            );
            const restDist =
                firstDist > 0
                    ? this.bestDir(lastPos, iterationsLeft - 1).dist
                    : 0;
            this.untrace(lastPos, opposite[dir], firstDist);
            const dist = firstDist + restDist;
            if (dist > maxDist) {
                maxDist = dist;
                outputDir = dir;
            }
        });
        return {dir: outputDir, dist: maxDist};
    }
}

const log = console.error.bind(console);
type Log = typeof log;
function go(
    game: Game,
    readline: () => string,
    log: Log,
    writeline: (s: string) => void,
): void {
    for (let turn = 0; ; turn++) {
        const input = readState(readline);
        if (input == null) break;

        const startHr = process.hrtime();
        const showTime = (): void => {
            const endHr = process.hrtime(startHr);
            log('Turn %d: %dms', turn, endHr[1] / 1000000);
        };

        game.step(input);
        const myPos = input.posList[input.myIndex];

        // log(myPos, otherPos);

        const {dir} = game.bestDir(myPos, input.myIndex);

        // log(game.dump());
        writeline(dir);
        showTime();
        // console.error(lines.join('\n'));
    }
}

export {Game, go};
if (process.env.NODE_ENV !== 'test') {
    shuffle(dirs);
    go(new Game(), readline, log, console.log.bind(console));
}
