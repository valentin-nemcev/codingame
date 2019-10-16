declare const readline: () => string;

// function last<T>(a: T[]): T | undefined {
//     return a[a.length - 1]
// }

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
    }
    step(): void {
        this._assertAlive();
        if (!this.dir) throw this._dirUnsetErr();
        this.pos = shift[this.dir](this.pos);
    }
    stepBack(): void {
        this._assertAlive();
        if (!this.dir) throw this._dirUnsetErr();
        this.pos = shift[opposite[this.dir]](this.pos);
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

    isEmpty(players: Player[]): boolean {
        return this.trailOf === -1 || players[this.trailOf].isDead;
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

    getEmptyCellAt(pos: Pos, players: Player[]): Cell | null {
        if (!this.isPosOnGrid(pos)) return null;
        const cell = this.grid[pos.y * gridWidth + pos.x];
        if (!cell.isEmpty(players)) return null;

        return cell;
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

class Game {
    public readonly grid: Grid;
    public readonly iterator: Iterator;
    players: Player[] = [];

    constructor(log: Log) {
        this.grid = new Grid();
        this.iterator = new Iterator(this, log); //eslint-disable-line @typescript-eslint/no-use-before-define
    }

    hasEnded(): boolean {
        return this.players.filter(player => !player.isDead).length <= 1;
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
}

type Result = {dir: Dir; depth: number; isDead: boolean[]};
function scoreResults(
    results: Result[],
    playerCount: number,
): {[dir in Dir]: number} {
    let filteredResults = results;
    for (let playerIdx = 0; playerIdx < playerCount; playerIdx++) {
        const next = filteredResults.filter(({isDead}) => !isDead[playerIdx]);
        filteredResults = next.length ? next : filteredResults;
    }

    type ResultWithWeight = {dir: Dir; weight: number};
    const withWeight = filteredResults.map(({dir, depth}) => ({
        dir,
        weight: 1 / (depth + 1),
    }));
    const withWeightByDir: {[dir in Dir]: ResultWithWeight[]} = {
        LEFT: [],
        RIGHT: [],
        UP: [],
        DOWN: [],
    };
    withWeight.forEach(result => withWeightByDir[result.dir].push(result));

    const scoreByDir: {[dir in Dir]: number} = {
        LEFT: 0,
        RIGHT: 0,
        UP: 0,
        DOWN: 0,
    };

    const weightSum = withWeight.reduce((a, b) => a + b.weight, 0);
    dirs.forEach(dir => {
        const results = withWeightByDir[dir];
        if (results.length === 0) return;
        scoreByDir[dir] = results.reduce((a, b) => a + b.weight / weightSum, 0);
    });
    return scoreByDir;
}

function getMax<K extends string>(scores: {[name in K]: number}): K | null {
    let result: keyof typeof scores | null = null;
    let maxScore = -Infinity;
    for (const key in scores) {
        if (scores[key] > maxScore) {
            maxScore = scores[key];
            result = key;
        }
    }
    // console.error('getMax\n', scores);
    return result;
}

class Iterator {
    private log: Log;
    constructor(readonly game: Game, log: Log) {
        this.log = log;
        this.startTurn(250);
    }

    private timeLimit = Number.MAX_SAFE_INTEGER;
    private startTs = Date.now();
    private outOfTime = false;

    private turns = 0;
    private maxDepth = 0;
    private depth = 0;
    public iteration = 0;
    private dir: Dir | null = null;
    private results: Result[] = [];

    startTurn(timeLimit: number): void {
        this.timeLimit = timeLimit;
        this.startTs = Date.now();
        this.outOfTime = false;
        this.depth = 0;
        this.dir = null;
        this.results = [];
        this.maxDepth = 0;
        this.iteration = 0;
        this.turns++;
    }

    getTimeSpent(): number {
        return Date.now() - this.startTs;
    }

    printTurnStats(): void {
        const ms = this.getTimeSpent();
        this.log(
            'Turn %d: %dms, %dkIter/ms',
            this.turns,
            ms,
            Math.round(this.iteration / ms),
        );
    }

    hasTimeLeft(): boolean {
        let ms;
        if (!this.outOfTime && (ms = this.getTimeSpent()) > this.timeLimit) {
            this.outOfTime = true;
            this.log(
                `Out of time at ${this.depth}/${this.maxDepth}, iter# ${this.iteration}: ${ms}ms`,
            );
        }
        return !this.outOfTime;
    }

    iteratePlayer(playerIdx = 0): void {
        this.iteration++;
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
                this.iteratePlayer(playerIdx + 1);
                this.game.stepBack(playerIdx);
            });
        } else {
            if (this.game.tryStepForward(playerIdx)) {
                madeAStep = true;
                this.iteratePlayer(playerIdx + 1);
                this.game.stepBack(playerIdx);
            }

            const nearEnemy =
                this.depth < 10 && this.game.distToClosestPlayer() < 3;
            const checkCorners = nearEnemy || !madeAStep;

            player.getSideDirs().forEach(dir => {
                if (!this.game.tryStepToSide(playerIdx, dir, {checkCorners})) {
                    return;
                }
                madeAStep = true;
                this.iteratePlayer(playerIdx + 1);
                this.game.stepBack(playerIdx);
            });
        }

        if (madeAStep) return;

        player.isDead = true;
        this.iteratePlayer(playerIdx + 1);
        player.isDead = false;
    }

    iterateTurn(): void {
        if (this.game.players[0].isDead) {
            this.addResult();
            return;
        }
        if (this.depth === 0) {
            this.dir = this.game.players[0].dir;
        }
        if (!this.hasTimeLeft() || this.game.hasEnded()) {
            this.addResult();
        } else {
            this.depth++;
            this.iteratePlayer();
            this.depth--;
        }
    }

    addResult(): void {
        if (!this.dir) return;
        if (this.maxDepth < this.depth) this.maxDepth = this.depth;
        this.results.push({
            dir: this.dir,
            depth: this.depth,
            isDead: this.game.players.map(p => p.isDead),
        });
    }
    findBestDir(): Dir | null {
        this.iteratePlayer();

        const dir = getMax(
            scoreResults(this.results, this.game.players.length),
        );
        this.printTurnStats();
        return dir;
    }
}

const log = console.error.bind(console);
type Log = typeof log;

const turnTimeLimit = 95;

function go(
    game: Game,
    readline: () => string,
    writeline: (s: string) => void,
): void {
    for (let turn = 0; ; turn++) {
        const input = readState(readline);
        if (input == null) break;

        game.iterator.startTurn(turnTimeLimit);
        game.stepFromInput(input);

        const dir = game.iterator.findBestDir();

        // log(game.dump());
        writeline(dir || 'AAAAA!');
    }
}

export {Game, scoreResults, go};
if (process.env.NODE_ENV !== 'test') {
    go(new Game(log), readline, console.log.bind(console));
}
