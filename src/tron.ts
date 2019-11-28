declare const readline: () => string;

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

type CellIdx = number & {readonly __cellIdx: unique symbol};

type Dir = 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';
const dirs: Dir[] = ['LEFT', 'RIGHT', 'UP', 'DOWN'];

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

const SIDES: {readonly [dir in Dir]: [Dir, Dir]} = {
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
        startPosList.push(pos(x0, y0));
        posList.push(pos(x, y));
    }

    return {myIdx, startPosList, posList};
}

class Player {
    trailLength = 0;
    readonly startPos: CellIdx;
    cellIdx: CellIdx;
    dir: Dir | null = null;
    isDead = false;
    constructor(cellIdx: CellIdx) {
        this.cellIdx = this.startPos = cellIdx;
        this.trailLength = 1;
    }
    private _assertAlive(): void {
        if (this.isDead) throw new Error('Player is dead');
    }
    step(cellIdx: CellIdx, dir: Dir): void {
        this._assertAlive();
        this.dir = dir;
        this.cellIdx = cellIdx;
        this.trailLength++;
    }
    stepBack(cellIdx: CellIdx, dir: Dir | null): void {
        this._assertAlive();
        this.dir = dir;
        this.cellIdx = cellIdx;
        this.trailLength--;
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
    public floodfillQueue: CellIdx[] = [];

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

    posToCellIdx(pos: Pos): CellIdx {
        if (!this.isPosOnGrid(pos)) {
            throw new Error(
                `Can't access cell outside grid: ${posToString(pos)}`,
            );
        }
        return (pos.y * this.width + pos.x) as CellIdx;
    }

    cellIdxToPos(cellIdx: CellIdx): Pos {
        return pos(cellIdx % this.width, Math.floor(cellIdx / this.width));
    }

    safeShiftCellIdx(dir: Dir, cellIdx: CellIdx): CellIdx {
        const c = cellIdx as number;
        switch (dir) {
            case 'LEFT':
                return (c - 1) as CellIdx;
            case 'RIGHT':
                return (c + 1) as CellIdx;
            case 'UP':
                return (c - this.width) as CellIdx;
            case 'DOWN':
                return (c + this.width) as CellIdx;
        }
    }

    shiftCellIdx(dir: Dir, cellIdx: CellIdx): CellIdx | null {
        let x = cellIdx % this.width;
        let y = Math.floor(cellIdx / this.width);
        switch (dir) {
            case 'LEFT':
                x--;
                if (x < 0) return null;
                break;
            case 'RIGHT':
                x++;
                if (x >= this.width) return null;
                break;
            case 'UP':
                y--;
                if (y < 0) return null;
                break;
            case 'DOWN':
                y++;
                if (y >= this.height) return null;
                break;
        }
        return (y * this.width + x) as CellIdx;
    }

    cellAt(cellIdx: CellIdx): Cell {
        return this.grid[cellIdx];
    }

    floodfill(players: Player[]): number[] {
        this.floodfillCounter++;
        let begin = 0;
        let end = 0;
        const queue = this.floodfillQueue;
        const result = players.map(() => 0);
        players.forEach((p, i) => {
            if (p.isDead) return;
            result[i] += 80;
            const cell = this.cellAt(p.cellIdx);
            cell.markDistance(i, 0, this.floodfillCounter);
            queue[end++] = p.cellIdx;
        });
        for (;;) {
            if (begin >= end) break;
            const cellIdx = queue[begin++];
            const cell = this.cellAt(cellIdx);
            let score = 4;
            for (let i = 0; i < dirs.length; i++) {
                const dir = dirs[i];
                const cIdx = this.shiftCellIdx(dir, cellIdx);
                if (cIdx == null) continue;
                const c = this.cellAt(cIdx);
                if (!c.isEmpty(players)) continue;
                if (c.floodfillCounter === this.floodfillCounter) {
                    if (c.distanceTo !== cell.distanceTo) score--;
                    else score++;
                    continue;
                }
                c.markDistance(
                    cell.distanceTo,
                    cell.distance + 1,
                    this.floodfillCounter,
                );
                queue[end++] = cIdx;
            }
            result[cell.distanceTo] += score;
        }

        return result;
    }

    toString(): string {
        let result = '';
        for (let y = 0; y < this.height; y++) {
            let line = '';
            for (let x = 0; x < this.width; x++) {
                line += this.cellAt(this.posToCellIdx(pos(x, y)));
            }
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

    markPlayerDead(playerIdx: number): void {
        this.players[playerIdx].isDead = true;
        this.deadCount++;
    }

    unmarkPlayerDead(playerIdx: number): void {
        this.players[playerIdx].isDead = false;
        this.deadCount--;
    }

    addPlayer(pos: Pos): void {
        const cellIdx = this.grid.posToCellIdx(pos);
        this.players.push(new Player(cellIdx));
        this.grid
            .cellAt(cellIdx)
            .markTrail(this.players.length - 1, this.players);
    }

    stepPlayer(playerIdx: number, pos: Pos): void {
        const player = this.players[playerIdx];
        if (isPosUnset(pos)) {
            if (!player.isDead) this.markPlayerDead(playerIdx);
            return;
        }

        const cellIdx = this.grid.posToCellIdx(pos);
        const dir = deriveDir(this.grid.cellIdxToPos(player.cellIdx), pos);
        player.step(cellIdx, dir);
        this.grid.cellAt(cellIdx).markTrail(playerIdx, this.players);
    }

    safeStepPlayerDir(playerIdx: number, dir: Dir): void {
        const player = this.players[playerIdx];
        const cellIdx = this.grid.safeShiftCellIdx(dir, player.cellIdx);
        player.step(cellIdx, dir);
        this.grid.cellAt(cellIdx).markTrail(playerIdx, this.players);
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
        const cellIdx = this.grid.shiftCellIdx(dir, player.cellIdx);

        return (
            cellIdx != null && this.grid.cellAt(cellIdx).isEmpty(this.players)
        );
    }

    stepBack(playerIdx: number): void {
        const player = this.players[playerIdx];
        const cell = this.grid.cellAt(player.cellIdx);

        if (!player.dir) {
            throw new Error('Player direction is unset');
        }
        const cellIdx = this.grid.safeShiftCellIdx(
            opposite[player.dir],
            player.cellIdx,
        );

        const prevCell = this.grid.cellAt(cellIdx);
        player.stepBack(cellIdx, prevCell.dir);

        cell.unmarkTrail();
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
        const draw = (cellIdx: CellIdx, c: string): void => {
            canvas[cellIdx] = c;
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
            let headCellIdx: CellIdx | null = null;
            let headDir: Dir | null = null;
            let tailCellIdx = player.cellIdx;
            let tailDir = this.grid.cellAt(tailCellIdx).dir;
            for (;;) {
                if (headDir && headCellIdx != null) {
                    tailCellIdx = this.grid.safeShiftCellIdx(
                        opposite[headDir],
                        headCellIdx,
                    );
                    tailDir = this.grid.cellAt(tailCellIdx).dir;
                }
                draw(tailCellIdx, getTrail(i, tailDir, headDir));
                if (!tailDir) break;
                headCellIdx = tailCellIdx;
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

class Result {
    dirs: Dir[][];
    scores: number[];
    depth: number;
    timeout: boolean;
    constructor(scores: number[], depth: number, timeout: boolean) {
        this.scores = scores;
        this.dirs = scores.map(() => []);
        this.depth = depth;
        this.timeout = timeout;
    }

    setDir(dir: Dir, playerIdx: number): void {
        this.dirs[playerIdx].push(dir);
    }

    getDir(): Dir | null {
        return this.dirs[0][this.dirs[0].length - 1];
    }

    isBetterThan(that: Result | null, playerIdx: number): boolean {
        if (that == null) return true;
        if (playerIdx === 0) return this.scores[0] > that.scores[0];
        else if (this.scores[0] < that.scores[0]) return true;
        else if (this.scores[0] === that.scores[0]) {
            return this.scores[playerIdx] > that.scores[playerIdx];
        } else return false;
    }

    toString(): string {
        return (
            this.scores.map(s => s.toFixed(16)).join(' ') +
            ' ' +
            String(this.depth).padStart(3) +
            (this.timeout ? '+' : '') +
            ' ' +
            this.dirs
                .map(dirs =>
                    dirs
                        .slice()
                        .reverse()
                        .map(d => dirToString[d])
                        .join(''),
                )
                .filter(Boolean)
                .join(' ')
        );
    }
}

const log = console.error.bind(console);
const logNoop = (): void => {};
type Log = typeof log;

class Iterator {
    private log: Log;
    constructor(readonly game: Game, log: Log = logNoop) {
        this.log = log;
        this.startTurn();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public onResult = (result: Result, playerIdx: number): void => {};

    private timeBudget = Number.MAX_SAFE_INTEGER;
    private startTs = 0n;

    public turns = -1;
    public resultCount = 0;
    public depth = 0;
    public maxDepth = 0;
    public iteration = 0;

    startTurn({timeBudget = Number.MAX_SAFE_INTEGER} = {}): void {
        this.timeBudget = timeBudget;
        this.startTs = process.hrtime.bigint();
        this.resultCount = 0;
        this.depth = 0;
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
        const toMb = (b: number): number => b / (1024 * 1024);
        this.log(
            'Memory: rss %s mb, heap %s/%s mb',
            toMb(rss).toFixed(1),
            toMb(heapUsed).toFixed(1),
            toMb(heapTotal).toFixed(1),
        );
    }

    iterate(playerIdx: number, timeBudgetNs: bigint): Result {
        if (timeBudgetNs <= 0n) {
            return this.getResult(playerIdx, true);
        }
        const players = this.game.players;
        const playerCount = this.game.players.length;
        if (playerIdx >= playerCount) {
            playerIdx = 0;
        }

        while (players[playerIdx].isDead) {
            playerIdx = (playerIdx + 1) % playerCount;
        }
        const player = players[playerIdx];

        this.iteration++;

        let availableDirs: Dir[];
        if (player.dir == null) {
            availableDirs = dirs.filter(dir =>
                this.game.checkStep(playerIdx, dir),
            );
        } else {
            availableDirs = [];
            if (this.game.checkStep(playerIdx, player.dir)) {
                availableDirs.push(player.dir);
            }

            const sides = SIDES[player.dir];
            for (let i = 0; i < sides.length; i++) {
                if (this.game.checkStep(playerIdx, sides[i])) {
                    availableDirs.push(sides[i]);
                }
            }
        }

        if (availableDirs.length === 0) {
            this.game.markPlayerDead(playerIdx);
            const alive = playerCount - this.game.deadCount;
            let result: Result;
            if (playerIdx === 0 || (playerCount > 1 && alive === 1)) {
                result = this.getResult(playerIdx);
            } else {
                this.depth++;
                result = this.iterate(playerIdx + 1, timeBudgetNs);
                this.depth--;
            }
            this.game.unmarkPlayerDead(playerIdx);
            return result;
        } else {
            let bestResult: Result | null = null;
            for (let i = 0; i < availableDirs.length; i++) {
                const dir = availableDirs[i];
                const f = availableDirs.length - i;
                this.game.safeStepPlayerDir(playerIdx, dir);
                let startNs = 0n;
                startNs = process.hrtime.bigint();
                this.depth++;
                const result = this.iterate(
                    playerIdx + 1,
                    timeBudgetNs / BigInt(f),
                );
                this.depth--;
                result.setDir(dir, playerIdx);
                if (result.isBetterThan(bestResult, playerIdx)) {
                    bestResult = result;
                }
                if (this.depth === 0) this.log(result.toString());
                timeBudgetNs -= process.hrtime.bigint() - startNs;
                this.game.stepBack(playerIdx);
            }
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return bestResult!;
        }
    }

    getResult(playerIdx: number, timeout = false): Result {
        if (this.maxDepth < this.depth) this.maxDepth = this.depth;
        this.resultCount++;

        const scores = this.game.grid.floodfill(this.game.players);
        let total = 0;
        for (let i = 0; i < scores.length; i++) total += scores[i];
        for (let i = 0; i < scores.length; i++) scores[i] /= total;

        const result = new Result(scores, this.depth, timeout);
        this.onResult(result, playerIdx);
        return result;
    }

    findBestDir(): Dir | null {
        const result = this.iterate(
            0,
            BigInt(this.timeBudget) * 1_000_000n -
                (process.hrtime.bigint() - this.startTs),
        );

        this.printTurnStats();
        return result.getDir();
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

        writeline(dir || 'AAAAA!');
    }
}

export {readState, Game, go};
if (require.main === module) {
    go(new Game({log}), readline, console.log.bind(console));
}
