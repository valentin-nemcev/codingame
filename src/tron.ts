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

function getDist(a: Pos, b: Pos): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
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

type Input = {myIdx: number; startPosList: Pos[]; posList: Pos[]};
function readState(readline: () => string): Input | null {
    const [playerCount, myIdx] = readInts(readline);
    if (playerCount == null) return null;
    const posList = [];
    const startPosList = [];
    for (let i = 0; i < playerCount; i++) {
        const [x0, y0, x, y] = readInts(readline);
        startPosList.push({x: x0, y: y0});
        posList.push({x, y});
    }

    return {myIdx, startPosList, posList};
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

class Cell {
    private trailOf = -1;
    private dir: null | Dir = null;

    toString(): string {
        if (this.trailOf == -1) return ' ';
        else if (this.dir == null) return String(this.trailOf);
        else return dirToString[this.dir];
    }

    markTrail(playerIdx: number, dir: Dir | null): void {
        this.trailOf = playerIdx;
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
    public readonly iterator: Iterator;
    players: Player[] = [];

    constructor() {
        this.grid = new Grid();
        this.iterator = new Iterator(this); //eslint-disable-line @typescript-eslint/no-use-before-define
    }

    getScore(playerIdx: number, depth: number): number {
        let score = depth / maxDepth;
        if (this.players[playerIdx].isDead) return score + 1;
        this.players.forEach((player, i) => {
            if (i === playerIdx) return;
            if (player.isDead) score += 1 / (this.players.length - 1);
        });
        return -score;
    }

    distToClosestPlayerFor(playerIdx: number): number {
        let closestDist = Number.MAX_SAFE_INTEGER;
        const player = this.players[playerIdx];
        this.players.forEach((p, i) => {
            if (i === playerIdx || p.isDead) return;
            const dist = getDist(p.pos, player.pos);
            if (dist < closestDist) closestDist = dist;
        });
        return closestDist;
    }

    addPlayer(pos: Pos): void {
        this.players.push(new Player(pos));
        this.grid.cellAt(pos).markTrail(this.players.length - 1, null);
    }

    stepPlayer(playerIdx: number, pos: Pos): void {
        const player = this.players[playerIdx];
        player.step(pos);
        this.grid.cellAt(pos).markTrail(playerIdx, player.dir);
    }

    step(input: Input): void {
        const {myIdx, posList, startPosList} = input;
        if (this.players.length === 0) {
            startPosList.forEach((_, playerIdx) => {
                const inputIdx = (playerIdx + myIdx) % startPosList.length;
                this.addPlayer(startPosList[inputIdx]);
                if (playerIdx + myIdx >= startPosList.length) {
                    this.stepPlayer(playerIdx, posList[inputIdx]);
                }
            });
        } else {
            posList.forEach((_, playerIdx) => {
                const inputIdx = (playerIdx + myIdx) % posList.length;
                const pos = posList[inputIdx];
                this.stepPlayer(playerIdx, pos);
            });
        }
    }

    tryStepNext(playerIdx: number): boolean {
        const player = this.players[playerIdx];
        if (!player.tryStepNext()) return false;
        const cell = this.grid.tryCellAt(player.pos);
        if (!cell || !cell.isEmpty()) {
            player.stepBack();
            return false;
        }
        cell.markTrail(playerIdx, player.dir);
        return true;
    }

    stepBack(playerIdx: number): void {
        const player = this.players[playerIdx];
        const cell = this.grid.cellAt(player.pos);
        cell.unmarkTrail();
        player.stepBack();
    }
}

class Iterator {
    constructor(readonly game: Game) {
        this.startTurn(250);
    }

    private timeLimit = Number.MAX_SAFE_INTEGER;
    private startTs = Date.now();

    startTurn(timeLimit: number): void {
        this.timeLimit = timeLimit;
        this.startTs = Date.now();
    }
    hasTimeLeft(): boolean {
        const ms = Date.now() - this.startTs;
        // console.log(ms);
        return ms < this.timeLimit;
        // log('Turn %d: %dms', turn, endHr[1] / 1000000);
    }

    iteratePlayer([playerIdx, ...restPlayers]: number[], cb: () => void): void {
        if (playerIdx == null) {
            cb();
            return;
        }
        const player = this.game.players[playerIdx];
        if (player.isDead) {
            this.iteratePlayer(restPlayers, cb);
            return;
        }

        let madeATurn = false;
        if (this.game.tryStepNext(playerIdx)) {
            madeATurn = true;
            this.iteratePlayer(restPlayers, cb);
            this.game.stepBack(playerIdx);
        }

        if (madeATurn && this.game.distToClosestPlayerFor(playerIdx) >= 10) {
            return;
        }

        player.getAvailableDirs().forEach(dir => {
            const prevDir = player.swapDir(dir);
            if (!this.game.tryStepNext(playerIdx)) {
                player.dir = prevDir;
                return;
            }
            madeATurn = true;
            this.iteratePlayer(restPlayers, cb);
            this.game.stepBack(playerIdx);
            player.dir = prevDir;
        });
        if (madeATurn) return;

        player.isDead = true;
        this.iteratePlayer(restPlayers, cb);
        player.isDead = false;
    }

    forEachPossibleTurn(cb: () => void): void {
        const players: number[] = [];
        this.game.players.forEach((_, playerIdx) => players.push(playerIdx));
        this.iteratePlayer(players, cb);
    }

    iterate(
        cb: (dir: Dir | null, depth: number) => void,
        depth = 0,
        dir: Dir | null = null,
    ): void {
        this.forEachPossibleTurn(() => {
            if (this.game.players[0].isDead) {
                cb(dir, depth);
                return;
            }
            if (depth === 0) {
                dir = this.game.players[0].dir;
            }
            if (
                depth >= 4 ||
                !this.hasTimeLeft() ||
                this.game.players.filter(player => !player.isDead).length <= 1
            ) {
                cb(dir, depth);
            } else {
                this.iterate(cb, depth + 1, dir);
            }
        });
    }

    findBestDir(): Dir | null {
        const scores: {[dir in Dir]: number[]} = {
            LEFT: [],
            RIGHT: [],
            UP: [],
            DOWN: [],
        };
        this.iterate((dir, depth) => {
            if (dir) scores[dir].push(this.game.getScore(0, depth));
        });

        let bestDir = null;
        let minScore = Infinity;
        dirs.forEach(dir => {
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
        game.iterator.startTurn(150);
        const input = readState(readline);
        if (input == null) break;

        const startHr = process.hrtime();
        const showTime = (): void => {
            const endHr = process.hrtime(startHr);
            log('Turn %d: %dms', turn, endHr[1] / 1000000);
        };

        game.step(input);

        // log(myPos, otherPos);

        const dir = game.iterator.findBestDir();

        // log(game.dump());
        writeline(dir || 'AAAAA!');
        showTime();
        // console.error(lines.join('\n'));
    }
}

export {Game, go};
if (process.env.NODE_ENV !== 'test') {
    shuffle(dirs);
    go(new Game(), readline, log, console.log.bind(console));
}
