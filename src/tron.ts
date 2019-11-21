// import v8 from 'v8';

declare const readline: () => string;

function sum(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0);
}

// function shuffle<T extends Array<unknown>>(a: T): T {
//     let j, x, i;
//     for (i = a.length - 1; i > 0; i--) {
//         j = Math.floor(Math.random() * (i + 1));
//         x = a[i];
//         a[i] = a[j];
//         a[j] = x;
//     }
//     return a;
// }

const TRAIL_CHARS: {[key: string]: string} = {
    UNKNOWN: '? ',

    EMPTY: '  ',

    FILL: '⋅ ◆ ⋅ ◇ ⋅ ○ ',
    // FILL: '▤ ▥ ▧ ▨ ▩ ▦ ',

    STARTEND: '0 1 2 ',

    LEFTEND: '◄━◄═◄─',
    RIGHTEND: '► ',
    UPEND: '▲ ',
    DOWNEND: '▼ ',

    STARTLEFT: '0 1 2 ',
    STARTRIGHT: '0━1═2─',
    STARTUP: '0 1 2 ',
    STARTDOWN: '0 1 2 ',

    LEFTLEFT: '━━══──',
    RIGHTRIGHT: '━━══──',

    LEFTUP: '┗━╚═└─',
    DOWNRIGHT: '┗━╚═└─',

    LEFTDOWN: '┏━╔═┌─',
    UPRIGHT: '┏━╔═┌─',

    RIGHTUP: '┛ ╝ ┘ ',
    DOWNLEFT: '┛ ╝ ┘ ',

    RIGHTDOWN: '┓ ╗ ┐ ',
    UPLEFT: '┓ ╗ ┐ ',

    UPUP: '┃ ║ │ ',
    DOWNDOWN: '┃ ║ │ ',
};

type Pos = {
    readonly x: number;
    readonly y: number;
} & {readonly __posTag: unique symbol};

const posCache: ReadonlyArray<Pos> = Array(1 << 12)
    .fill(null)
    .map((_, i) => {
        const x = (i >> 6) - 15;
        const y = (i % (1 << 6)) - 15;
        return {x, y} as Pos;
    });

export const pos = (x: number, y: number): Pos =>
    posCache[((x + 15) << 6) + (y + 15)];

function isPosUnset({x, y}: Pos): boolean {
    return x == -1 && y == -1;
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
    LEFT: ({x, y}) => pos(x - 1, y),
    RIGHT: ({x, y}) => pos(x + 1, y),
    UP: ({x, y}) => pos(x, y - 1),
    DOWN: ({x, y}) => pos(x, y + 1),
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
    LEFT: '←',
    RIGHT: '→',
    UP: '↑',
    DOWN: '↓',
};

// const lines: string[] = [];
function readInts(readline: () => string): number[] {
    const line = readline();
    // lines.push(line);
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
        startPosList.push(pos(x0, y0));
        posList.push(pos(x, y));
    }

    return {myIdx, startPosList, posList};
}

class Player {
    trailLength = 0;
    readonly startPos: Pos;
    pos: Pos;
    dir: Dir | null = null;
    isDead = false;
    constructor(pos: Pos) {
        this.pos = this.startPos = pos;
        this.trailLength = 1;
    }
    private _assertAlive(): void {
        if (this.isDead) throw new Error('Player is dead');
    }
    private _dirUnsetErr(): Error {
        return new Error('Player direction is unset');
    }
    stepToPos(pos: Pos): void {
        this._assertAlive();
        this.dir = deriveDir(this.pos, pos);
        this.pos = pos;
        this.trailLength++;
    }
    step(): void {
        this._assertAlive();
        if (!this.dir) throw this._dirUnsetErr();
        this.pos = shift[this.dir](this.pos);
        this.trailLength++;
    }
    stepBack(): void {
        this._assertAlive();
        if (!this.dir) throw this._dirUnsetErr();
        this.pos = shift[opposite[this.dir]](this.pos);
        this.trailLength--;
    }
    getSideDirs(): Dir[] {
        this._assertAlive();
        if (this.dir == null) return dirs;
        return sides[this.dir];
    }
}

class Cell {
    trailOf = -1;
    dir: null | Dir = null;
    private deadTrails: {dir: Dir | null; trailOf: number}[] = [];

    availableDirs: Dir[] = [];

    distanceTo = -1;
    distance = -1;
    floodfillCounter = 0;

    toString(): string {
        if (this.trailOf == -1) return ' ';
        else if (this.dir == null) return String(this.trailOf);
        else return dirToString[this.dir];
    }

    markTrail(playerIdx: number, players: Player[]): void {
        if (!this.isEmpty(players)) {
            throw new Error("Can't mark already occupied cell");
        }
        if (this.trailOf !== -1) {
            this.deadTrails.push({dir: this.dir, trailOf: this.trailOf});
        }
        this.trailOf = playerIdx;
        this.dir = players[playerIdx].dir;
    }

    unmarkTrail(): void {
        const prevTrail = this.deadTrails.pop();
        if (prevTrail) {
            this.trailOf = prevTrail.trailOf;
            this.dir = prevTrail.dir;
        } else {
            this.trailOf = -1;
            this.dir = null;
        }
    }

    markDistance(
        playerIdx: number,
        distance: number,
        floodfillCounter: number,
    ): void {
        this.distanceTo = playerIdx;
        this.distance = distance;
        this.floodfillCounter = floodfillCounter;
    }

    isEmpty(players: Player[]): boolean {
        return this.trailOf === -1 || players[this.trailOf].isDead;
    }
}

type GridParams = {width?: number; height?: number};
class Grid {
    public readonly width: number;
    public readonly height: number;
    public readonly size: number;

    public readonly grid: Cell[] = [];

    public floodfillCounter = 0;
    public floodfillQueue: Pos[] = [];

    constructor({width = 30, height = 20}: GridParams = {}) {
        this.width = width;
        this.height = height;
        this.size = width * height;
        for (let i = 0; i < this.size; i++) {
            this.grid.push(new Cell());
        }

        this.floodfillQueue.length = this.size;
    }

    isPosOnGrid({x, y}: Pos): boolean {
        return 0 <= x && x < this.width && 0 <= y && y < this.height;
    }

    cellAt(pos: Pos): Cell {
        if (!this.isPosOnGrid(pos)) {
            throw new Error(
                `Can't access cell outside grid: ${posToString(pos)}`,
            );
        }
        return this.grid[pos.y * this.width + pos.x];
    }

    getEmptyCellAt(pos: Pos, players: Player[]): Cell | null {
        if (!this.isPosOnGrid(pos)) return null;
        const cell = this.grid[pos.y * this.width + pos.x];
        if (!cell.isEmpty(players)) return null;

        return cell;
    }

    floodfill(players: Player[]): number[] {
        this.floodfillCounter++;
        let begin = 0;
        let end = 0;
        const queue = this.floodfillQueue;
        const result = players.map(() => 0);
        players.forEach((p, i) => {
            if (p.isDead) return;
            result[i]++;
            const cell = this.cellAt(p.pos);
            cell.markDistance(i, 0, this.floodfillCounter);
            queue[end++] = p.pos;
        });
        for (;;) {
            if (begin >= end) break;
            const pos = queue[begin++];
            const cell = this.cellAt(pos);
            for (let i = 0; i < dirs.length; i++) {
                const dir = dirs[i];
                const p = shift[dir](pos);
                const c = this.getEmptyCellAt(p, players);
                if (!c || c.floodfillCounter === this.floodfillCounter) {
                    continue;
                }
                c.markDistance(
                    cell.distanceTo,
                    cell.distance + 1,
                    this.floodfillCounter,
                );
                result[cell.distanceTo]++;
                queue[end++] = p;
            }
        }

        return result;
    }

    toString(): string {
        let result = '';
        for (let y = 0; y < this.height; y++) {
            let line = '';
            for (let x = 0; x < this.width; x++) line += this.cellAt(pos(x, y));
            result += line + '\n';
        }
        return result;
    }
}

class Game {
    public readonly grid: Grid;
    public readonly iterator: Iterator;
    players: Player[] = [];
    deadCount = 0;

    constructor({log, grid}: {log?: Log; grid?: GridParams} = {}) {
        this.grid = new Grid(grid);
        this.iterator = new Iterator(this, log); //eslint-disable-line @typescript-eslint/no-use-before-define
    }

    getEmptyCount(): number {
        return this.grid.size - this.getNonEmptyCount();
    }

    getNonEmptyCount(): number {
        return this.players.reduce(
            (count, p) => count + (p.isDead ? 0 : p.trailLength),
            0,
        );
    }

    distToClosestPlayer(): number {
        let closestDist = Number.MAX_SAFE_INTEGER;
        const player = this.players[0];
        this.players.forEach((p, i) => {
            if (i === 0 || p.isDead) return;
            const dist = getDist(p.pos, player.pos);
            if (dist < closestDist) closestDist = dist;
        });
        return closestDist;
    }

    markPlayerDead(playerIdx: number): void {
        this.players[playerIdx].isDead = true;
        this.deadCount++;
    }

    unmarkPlayerDead(playerIdx: number): void {
        this.players[playerIdx].isDead = false;
        this.deadCount--;
    }

    addPlayer(pos: Pos): void {
        this.players.push(new Player(pos));
        this.grid.cellAt(pos).markTrail(this.players.length - 1, this.players);
    }

    stepPlayer(playerIdx: number, pos: Pos): void {
        const player = this.players[playerIdx];
        if (isPosUnset(pos)) {
            if (!player.isDead) this.markPlayerDead(playerIdx);
            return;
        }
        player.stepToPos(pos);
        this.grid.cellAt(pos).markTrail(playerIdx, this.players);
    }

    stepPlayerDir(playerIdx: number, dir: Dir): void {
        const player = this.players[playerIdx];
        player.dir = dir;
        player.step();

        this.grid.cellAt(player.pos).markTrail(playerIdx, this.players);
    }

    stepFromInput(input: Input): void {
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

    checkStep(playerIdx: number, dir: Dir): boolean {
        const player = this.players[playerIdx];
        const pos = player.pos;
        const nextPos = shift[dir](pos);

        return Boolean(this.grid.getEmptyCellAt(nextPos, this.players));
    }

    stepBack(playerIdx: number): void {
        const player = this.players[playerIdx];
        const cell = this.grid.cellAt(player.pos);
        cell.unmarkTrail();
        player.stepBack();
        player.dir = this.grid.cellAt(player.pos).dir;
    }

    toString(): string {
        const canvas = this.grid.grid.map((cell: Cell) => {
            if (
                cell.distanceTo == -1 ||
                cell.floodfillCounter !== this.grid.floodfillCounter
            ) {
                return TRAIL_CHARS.EMPTY;
            }
            const i = cell.distanceTo * 4 + Number(cell.distance % 5 == 0) * 2;
            return TRAIL_CHARS.FILL.slice(i, i + 2);
        });
        const draw = (pos: Pos, c: string): void => {
            canvas[pos.y * this.grid.width + pos.x] = c;
        };
        const getTrail = (
            playerIdx: number,
            tailDir: Dir | null,
            headDir: Dir | null,
        ): string => {
            const trail = (tailDir || 'START') + (headDir || 'END');
            const chars = TRAIL_CHARS[trail] || TRAIL_CHARS.UNKNOWN;
            let i = playerIdx * 2;
            i = i >= chars.length ? 0 : i;
            return chars.slice(i, i + 2);
        };
        this.players.forEach((player, i) => {
            if (player.isDead) return;
            let headPos: Pos | null = null;
            let headDir: Dir | null = null;
            let tailPos = player.pos;
            let tailDir = this.grid.cellAt(tailPos).dir;
            for (;;) {
                if (headDir && headPos) {
                    tailPos = shift[opposite[headDir]](headPos);
                    tailDir = this.grid.cellAt(tailPos).dir;
                }
                draw(tailPos, getTrail(i, tailDir, headDir));
                if (!tailDir) break;
                headPos = tailPos;
                headDir = tailDir;
            }
        });
        const grid =
            canvas.reduce(
                (s, c, i) =>
                    s +
                    (i % this.grid.width === 0 ? '  ' : '') +
                    ((i + 1) % this.grid.width === 0
                        ? c.slice(0, -1) + '\n'
                        : c),
                '┌╴\n', //
            ) +
            '  '.repeat(this.grid.width) +
            ' ╶┘\n';
        return grid + this.getNonEmptyCount() + '/' + this.grid.size;
    }
}

type Result = {dir: Dir; scores: number[]};

const log = console.error.bind(console);
const logNoop = (): void => {};
type Log = typeof log;

class Results {
    public onResult = (score: number): void => void score;
    readonly scores: {[d in Dir]: {sum: number; count: number}} = {
        LEFT: {sum: 0, count: 0},
        RIGHT: {sum: 0, count: 0},
        UP: {sum: 0, count: 0},
        DOWN: {sum: 0, count: 0},
    };

    reset(): void {
        for (const d in this.scores) {
            this.scores[d as Dir].sum = 0;
            this.scores[d as Dir].count = 0;
        }
    }

    getDir(): Dir | null {
        let result: Dir | null = null;
        let maxScore = -Infinity;
        for (const [key, {sum, count}] of Object.entries(this.scores)) {
            const score = sum / count;
            if (score > maxScore) {
                maxScore = score;
                result = key as Dir;
            }
        }
        return result;
    }

    add({dir, scores}: Result): void {
        const total = sum(scores);
        const score = scores[0] / total;
        this.onResult(score);
        const s = this.scores[dir];
        s.count++;
        s.sum += score;
    }

    toString(): string {
        return Object.entries(this.scores)
            .map(
                ([dir, {sum, count}]) =>
                    dirToString[dir as Dir] +
                    ' ' +
                    (count > 0 ? (sum / count).toFixed(4) : '–').padStart(6) +
                    ' ' +
                    String(count).padStart(8),
            )
            .join('\n');
    }
}

class Iterator {
    private log: Log;
    constructor(readonly game: Game, log: Log = logNoop) {
        this.log = log;
        this.results = new Results();
        this.startTurn();
    }

    private timeBudget = Number.MAX_SAFE_INTEGER;
    private startTs = 0n;

    public turns = -1;
    public resultCount = 0;
    public maxDepth = 0;
    public depth = 0;
    public iteration = 0;
    private dir: Dir | null = null;
    public readonly results: Results;

    startTurn({timeBudget = Number.MAX_SAFE_INTEGER} = {}): void {
        this.timeBudget = timeBudget;
        this.startTs = process.hrtime.bigint();
        this.depth = 0;
        this.dir = null;
        this.results.reset();
        this.resultCount = 0;
        this.maxDepth = 0;
        this.iteration = 0;
        this.turns++;
    }

    getTimeSpent(): number {
        return Number(process.hrtime.bigint() - this.startTs) / 1_000_000;
    }

    printTurnStats(): void {
        const ms = this.getTimeSpent();
        this.log(
            'Turn %d: %s ms, %d i/ms, %d depth, %d results, %d iterations',
            this.turns,
            ms.toFixed(0),
            Math.round(this.iteration / ms),
            this.maxDepth,
            this.resultCount,
            this.iteration,
        );
        const {rss, heapTotal, heapUsed} = process.memoryUsage();
        const {user, system} = process.cpuUsage();
        const toMb = (b: number): number => b / (1024 * 1024);
        this.log(
            'Memory: rss %s mb, heap %s/%s mb\nCpu: user %d ms, system %d ms',
            toMb(rss).toFixed(1),
            toMb(heapUsed).toFixed(1),
            toMb(heapTotal).toFixed(1),
            Math.round(user / 1000),
            Math.round(system / 1000),
        );
    }

    iterate(playerIdx: number, timeBudgetNs: bigint): void {
        if (timeBudgetNs <= 0n) {
            return this.addResult();
        }
        if (playerIdx >= this.game.players.length) {
            this.depth++;
            this.iterate(0, timeBudgetNs);
            this.depth--;
            return;
        }

        const player = this.game.players[playerIdx];
        if (player.isDead) {
            this.iterate(playerIdx + 1, timeBudgetNs);
            return;
        }

        this.iteration++;

        let availableDirs: Dir[];
        if (player.dir == null) {
            availableDirs = dirs.filter(dir =>
                this.game.checkStep(playerIdx, dir),
            );
        } else {
            availableDirs = [player.dir, ...player.getSideDirs()].filter(dir =>
                this.game.checkStep(playerIdx, dir),
            );
        }

        if (availableDirs.length > 0) {
            for (let i = 0; i < availableDirs.length; i++) {
                const dir = availableDirs[i];
                if (this.depth === 0 && playerIdx === 0) {
                    this.dir = dir;
                }
                const f = availableDirs.length - i;
                this.game.stepPlayerDir(playerIdx, dir);
                let startNs = 0n;
                startNs = process.hrtime.bigint();
                this.iterate(playerIdx + 1, timeBudgetNs / BigInt(f));
                timeBudgetNs -= process.hrtime.bigint() - startNs;
                this.game.stepBack(playerIdx);
            }
        } else {
            this.game.markPlayerDead(playerIdx);
            const players = this.game.players.length;
            const alive = players - this.game.deadCount;
            if (players > 1 && alive === 1) {
                this.addResult();
                this.game.unmarkPlayerDead(playerIdx);
                return;
            } else if (players === 1 && alive === 0) {
                this.game.unmarkPlayerDead(playerIdx);
                this.addResult();
                return;
            } else {
                this.iterate(playerIdx + 1, timeBudgetNs);
            }
            this.game.unmarkPlayerDead(playerIdx);
        }
    }

    addResult(): void {
        if (this.maxDepth < this.depth) this.maxDepth = this.depth;
        if (this.dir) {
            this.resultCount++;
            this.results.add({
                dir: this.dir,
                scores: this.game.grid.floodfill(this.game.players),
            });
        }
    }

    findBestDir(): Dir | null {
        this.iterate(
            0,
            BigInt(this.timeBudget) * 1_000_000n -
                (process.hrtime.bigint() - this.startTs),
        );

        this.printTurnStats();
        return this.results.getDir();
    }
}

const timeBudget = 90;

function go(
    game: Game,
    readline: () => string,
    writeline: (s: string) => void,
): void {
    console.error(process.env);
    console.error(process.version);
    console.error(process.execArgv);
    for (let turn = 0; ; turn++) {
        const input = readState(readline);
        if (input == null) break;

        game.iterator.startTurn({timeBudget});
        game.stepFromInput(input);

        const dir = game.iterator.findBestDir();

        // console.error(game.iterator.results.toString());

        writeline(dir || 'AAAAA!');
    }
}

export {readState, Game, Results, go};
if (require.main === module) {
    go(new Game({log}), readline, console.log.bind(console));
}
