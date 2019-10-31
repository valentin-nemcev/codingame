declare const readline: () => string;

function last<T>(a: T[]): T | undefined {
    return a[a.length - 1];
}

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

    EMPTY: '⋅ ',

    FILL: '⋅ ◆ ⋅ ◇ ⋅ ○ ',
    // FILL: '▤ ▥ ▧ ▨ ▩ ▦ ',

    STARTEND: '0 1 2 ',

    LEFTEND: '◄━◄═◄─',
    RIGHTEND: '► ',
    UPEND: '▲ ',
    DOWNEND: '▼ ',

    STARTLEFT: '0 1 2 ',
    STARTRIGHT: '0━1═2─',
    STARTUP: '0 1 2',
    STARTDOWN: '0 1 2',

    LEFTLEFT: '━━══──',
    RIGHTRIGHT: '━━══──',

    LEFTUP: '┗━╚═└─',
    DOWNRIGHT: '┗━╚═└─',

    LEFTDOWN: '┏━╔═┌─',
    UPRIGHT: '┏━╔═┌─',

    RIGHTUP: '┛ ╝ ┘',
    DOWNLEFT: '┛ ╝ ┘',

    RIGHTDOWN: '┓ ╗ ┐',
    UPLEFT: '┓ ╗ ┐',

    UPUP: '┃ ║ │ ',
    DOWNDOWN: '┃ ║ │ ',
};

interface Pos {
    x: number;
    y: number;
}

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
        startPosList.push({x: x0, y: y0});
        posList.push({x, y});
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
    isFirstTurn(): boolean {
        return this.dir == null;
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
    private floodfillCounter = 0;

    constructor({width = 30, height = 20}: GridParams = {}) {
        this.width = width;
        this.height = height;
        this.size = width * height;
        for (let i = 0; i < this.size; i++) {
            this.grid.push(new Cell());
        }
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
        const queue: Pos[] = [];
        const result = players.map(() => 0);
        players.forEach((p, i) => {
            if (p.isDead) return;
            const cell = this.cellAt(p.pos);
            cell.markDistance(i, 0, this.floodfillCounter);
            queue.push(p.pos);
        });
        for (;;) {
            const pos = queue.shift();
            if (!pos) break;
            const cell = this.cellAt(pos);
            dirs.forEach(dir => {
                const p = shift[dir](pos);
                const c = this.getEmptyCellAt(p, players);
                if (!c || c.floodfillCounter === this.floodfillCounter) return;
                c.markDistance(
                    cell.distanceTo,
                    cell.distance + 1,
                    this.floodfillCounter,
                );
                result[cell.distanceTo]++;
                queue.push(p);
            });
        }

        return result;
    }

    toString(): string {
        let result = '';
        for (let y = 0; y < this.height; y++) {
            let line = '';
            for (let x = 0; x < this.width; x++) line += this.cellAt({x, y});
            result += line + '\n';
        }
        return result;
    }
}

class Game {
    public readonly grid: Grid;
    public readonly iterator: Iterator;
    players: Player[] = [];

    constructor({log, grid}: {log?: Log; grid?: GridParams} = {}) {
        this.grid = new Grid(grid);
        this.iterator = new Iterator(this, log); //eslint-disable-line @typescript-eslint/no-use-before-define
    }

    hasEnded(): boolean {
        if (this.players.length > 1) {
            const alive = this.players.reduce(
                (c, player) => c + Number(!player.isDead),
                0,
            );
            return alive <= 1;
        } else {
            return this.getEmptyCount() === 0;
        }
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

    addPlayer(pos: Pos): void {
        this.players.push(new Player(pos));
        this.grid.cellAt(pos).markTrail(this.players.length - 1, this.players);
    }

    stepPlayer(playerIdx: number, pos: Pos): void {
        if (isPosUnset(pos)) return;
        const player = this.players[playerIdx];
        player.stepToPos(pos);
        this.grid.cellAt(pos).markTrail(playerIdx, this.players);
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

    tryStepForward(playerIdx: number): boolean {
        const player = this.players[playerIdx];

        player.step();

        const cell = this.grid.getEmptyCellAt(player.pos, this.players);
        if (!cell) {
            player.stepBack();
            return false;
        }
        cell.markTrail(playerIdx, this.players);
        return true;
    }

    tryStepToSide(
        playerIdx: number,
        dir: Dir,
        {checkCorners = false}: {checkCorners?: boolean},
    ): boolean {
        const player = this.players[playerIdx];

        const prevDir = player.dir;
        player.dir = dir;
        player.step();

        const cell = this.grid.getEmptyCellAt(player.pos, this.players);
        if (
            !cell ||
            (checkCorners && !this._checkSideCorners(player.pos, dir))
        ) {
            player.stepBack();
            player.dir = prevDir;
            return false;
        }

        cell.markTrail(playerIdx, this.players);
        return true;
    }

    protected _checkSideCorners(pos: Pos, dir: Dir): boolean {
        for (const d of sides[dir]) {
            const cornerPos = shift[d](pos);
            const emptyCorner = this.grid.getEmptyCellAt(
                cornerPos,
                this.players,
            );
            if (!emptyCorner) return true;
        }
        return false;
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
            if (cell.distanceTo == -1) return TRAIL_CHARS.EMPTY;
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
        const grid = canvas.reduce(
            (s, c, i) =>
                s +
                ((i + 1) % this.grid.width === 0 ? c.slice(0, -1) + '\n' : c),
            '',
        );
        return grid + this.getNonEmptyCount() + '/' + this.grid.size;
    }
}

type Result = {dir: Dir; scores: number[]; empty: number};

const log = console.error.bind(console);
const logNoop = (): void => {};
type Log = typeof log;

class Results {
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
            const score = count / sum;
            if (score > maxScore) {
                maxScore = score;
                result = key as Dir;
            }
        }
        return result;
    }

    add({dir, empty, scores: [myScore, ...otherScores]}: Result): void {
        const s = this.scores[dir];
        s.count++;
        s.sum += (myScore - sum(otherScores)) / empty;
    }
}

type Budget = {
    iteration: number;
    remaining: number;
    total: number;
};

class Iterator {
    public onResult = (): void => {};
    private log: Log;
    constructor(readonly game: Game, log: Log = logNoop) {
        this.log = log;
        this.results = new Results();
        this.startTurn();
    }

    private timeLimit = Number.MAX_SAFE_INTEGER;
    private startTs = 0n;
    private outOfTime = false;

    private turns = -1;
    private resultCount = 0;
    private maxDepth = 0;
    private depth = 0;
    public iteration = 0;
    public iterationBudget = 0;
    private dir: Dir | null = null;
    public readonly results: Results;

    public budgetStack: Budget[] = [];

    private budgetAllocationStats: {[op: string]: number} = {
        L: 0,
        R: 0,
        U: 0,
        D: 0,
        f: 0,
        s1: 0,
        s2: 0,
    };

    private budgetAllocationTable: {[op: string]: number} = {
        L: 1 / 4,
        R: 1 / 3,
        U: 1 / 2,
        D: 1,
        f: 0.9,
        s1: 1 / 2,
        s2: 1,
    };

    getActualBudgetAllocationTable(): {
        op: string;
        count: number;
        fraction: number;
    }[] {
        const e = Object.entries(this.budgetAllocationStats);
        const total = e.reduce((a, b) => a + b[1], 0);
        return e
            .map(([op, count]) => ({
                op,
                count,
                fraction: count / total,
            }))
            .concat([{op: 'total', count: total, fraction: 1}]);
    }
    startTurn({timeLimit = Infinity, iterationBudget = Infinity} = {}): void {
        this.timeLimit = timeLimit;
        this.startTs = process.hrtime.bigint();
        this.outOfTime = false;
        this.depth = 0;
        this.dir = null;
        this.results.reset();
        this.resultCount = 0;
        this.maxDepth = 0;
        this.iteration = 0;
        this.iterationBudget = iterationBudget;
        this.turns++;

        this.budgetStack = [];
    }

    getTimeSpent(): number {
        return Number(process.hrtime.bigint() - this.startTs) / 1_000_000;
    }

    printTurnStats(): void {
        const ms = this.getTimeSpent();
        this.log(
            'Turn %d: %s ms, %d i/ms, %d/%d depth, %d results, %d iterations',
            this.turns,
            ms.toFixed(0),
            Math.round(this.iteration / ms),
            this.depth,
            this.maxDepth,
            this.resultCount,
            this.iteration,
        );
    }

    hasTimeLeft(): boolean {
        let ms;
        if (!this.outOfTime && (ms = this.getTimeSpent()) > this.timeLimit) {
            this.outOfTime = true;
            this.log(
                `Out of time at ${this.depth}/${this.maxDepth}, iter# ${
                    this.iteration
                }: ${ms.toPrecision(3)}ms`,
            );
        }
        return !this.outOfTime;
    }

    allocateBudget(): void {
        if (this.depth > 1) return;
        this.budgetStack.push({
            remaining: this.iterationBudget,
            total: this.iterationBudget,
            iteration: this.iteration,
        });
        const budget = this.budgetStack[this.budgetStack.length - 2];
        if (!budget) return;
    }

    deallocateBudget(): void {
        if (this.depth > 1) return;
        const budget = this.budgetStack.pop();
        if (!budget) return;
    }

    beforeSpend(op: string): void {
        if (this.depth > 1) return;
        const budget = last(this.budgetStack);
        if (!budget) return;

        const fraction = this.budgetAllocationTable[op];
        const spent = this.iteration - budget.iteration;
        budget.remaining -= spent;
        budget.iteration = this.iteration;
        this.iterationBudget = Math.round(budget.remaining * fraction);
    }

    afterSpend(op: string): void {
        if (this.depth > 1) return;
        const budget = last(this.budgetStack);
        if (!budget) return;

        const spent = this.iteration - budget.iteration;
        this.budgetAllocationStats[op]++;
        budget.remaining -= spent;
        budget.iteration = this.iteration;
    }

    iteratePlayer(playerIdx: number): void {
        if (playerIdx >= this.game.players.length) {
            this.iterateTurn();
            return;
        }

        const player = this.game.players[playerIdx];
        if (player.isDead) {
            this.iteratePlayer(playerIdx + 1);
            return;
        }

        let madeAStep = false;

        this.allocateBudget();
        this.iteration++;
        this.iterationBudget--;

        if (player.isFirstTurn()) {
            dirs.forEach(dir => {
                if (
                    !this.game.tryStepToSide(playerIdx, dir, {
                        checkCorners: false,
                    })
                ) {
                    return;
                }
                madeAStep = true;
                this.beforeSpend(dir[0]);
                this.iteratePlayer(playerIdx + 1);
                this.afterSpend(dir[0]);
                this.game.stepBack(playerIdx);
            });
        } else {
            if (this.game.tryStepForward(playerIdx)) {
                madeAStep = true;
                this.beforeSpend('f');
                this.iteratePlayer(playerIdx + 1);
                this.afterSpend('f');
                this.game.stepBack(playerIdx);
            }

            const nearEnemy =
                this.depth < 10 && this.game.distToClosestPlayer() < 3;
            const checkCorners = !nearEnemy && madeAStep;

            player.getSideDirs().forEach((dir, i) => {
                if (!this.game.tryStepToSide(playerIdx, dir, {checkCorners})) {
                    return;
                }
                madeAStep = true;
                this.beforeSpend('s' + (i + 1));
                this.iteratePlayer(playerIdx + 1);
                this.afterSpend('s' + (i + 1));
                this.game.stepBack(playerIdx);
            });
        }
        this.deallocateBudget();

        if (madeAStep) {
            return;
        }

        player.isDead = true;
        this.iteratePlayer(playerIdx + 1);
        player.isDead = false;
    }

    iterateTurn(): void {
        if (this.depth === 0) {
            this.dir = this.game.players[0].dir;
        }
        if (
            this.game.players[0].isDead ||
            this.iterationBudget < 0 ||
            !this.hasTimeLeft() ||
            this.game.hasEnded()
        ) {
            return this.addResult();
        }

        this.depth++;
        this.iteratePlayer(0);
        this.depth--;
    }

    addResult(): void {
        if (!this.dir) throw new Error('Early addResult');
        if (this.maxDepth < this.depth) this.maxDepth = this.depth;
        this.resultCount++;
        this.results.add({
            dir: this.dir,
            scores: this.game.grid.floodfill(this.game.players),
            empty: this.game.getEmptyCount(),
        });
        this.onResult();
    }

    findBestDir(): Dir | null {
        this.iteratePlayer(0);

        this.printTurnStats();
        return this.results.getDir();
    }
}

const timeLimit = 95;
const iterationBudget = 10_000;

function go(
    game: Game,
    readline: () => string,
    writeline: (s: string) => void,
): void {
    for (let turn = 0; ; turn++) {
        const input = readState(readline);
        if (input == null) break;

        game.iterator.startTurn({timeLimit, iterationBudget});
        game.stepFromInput(input);

        const dir = game.iterator.findBestDir();

        writeline(dir || 'AAAAA!');
    }
}

export {readState, Game, Results, go};
if (require.main === module) {
    go(new Game({log}), readline, console.log.bind(console));
}
