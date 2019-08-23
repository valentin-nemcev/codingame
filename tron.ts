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

function readInts(): number[] {
    return readline()
        .split(' ')
        .map(s => parseInt(s, 10));
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

const opposite: {[dir in Dir]: Dir} = {
    LEFT: 'RIGHT',
    RIGHT: 'LEFT',
    UP: 'DOWN',
    DOWN: 'UP',
};

const dirToString: {[dir in Dir]: string} = {
    LEFT: '<',
    RIGHT: '>',
    UP: '↑',
    DOWN: '↓',
};

type Input = {myIndex: number; startPosList: Pos[]; posList: Pos[]};
function readState(): Input {
    const [playerCount, myIndex] = readInts();
    const posList = [];
    const startPosList = [];
    for (let i = 0; i < playerCount; i++) {
        const [x0, y0, x, y] = readInts();
        console.error(i, [x0, y0, x, y]);
        startPosList.push({x: x0, y: y0});
        posList.push({x, y});
    }

    return {myIndex, startPosList, posList};
}

const gridWidth = 30;
const gridHeight = 20;

interface Pos {
    x: number;
    y: number;
}

function posToString({x, y}: Pos): string {
    return `${x}, ${y}`;
}

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
    private players: Player[] = [];
    private lastPlayerIndex = 0;

    constructor() {
        for (let i = 0; i < gridWidth * gridHeight; i++) {
            this.grid.push(new Cell());
        }
    }

    private isPosOnGrid({x, y}: Pos): boolean {
        return 0 <= x && x < gridWidth && 0 <= y && y < gridHeight;
    }

    private cellAt(pos: Pos): Cell {
        if (!this.isPosOnGrid(pos)) {
            throw new Error(`Can't access cell outside grid: ${pos}`);
        }
        return this.grid[pos.y * gridWidth + pos.x];
    }

    private tryCellAt(pos: Pos): Cell | null {
        if (this.isPosOnGrid(pos)) return this.grid[pos.y * gridWidth + pos.x];
        else return null;
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

    stepPlayer(playerIndex: number, pos: Pos): void {
        if (playerIndex >= this.players.length) {
            this.players[playerIndex] = new Player(pos);
            this.cellAt(pos).markTrail(playerIndex, null);
        } else {
            const player = this.players[playerIndex];
            player.step(pos);
            this.cellAt(pos).markTrail(playerIndex, player.dir);
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
            for (let i = 0; i < posList.length; i++) {
                const playerIndex = (myIndex + i) % posList.length;
                const pos = posList[playerIndex];
                this.stepPlayer(playerIndex, pos);
            }
        }
    }

    iterate(): {dir: Dir; steps: number}[] {
        const result = [];
        for (let i = 0; i < this.players.length; i++) {
            const playerIndex =
                (this.lastPlayerIndex + 1 + i) % this.players.length;
        }

        return result;
    }

    trace(
        prevPos: Pos,
        dir: Dir,
        playerIndex: number,
    ): {dist: number; lastPos: Pos} {
        let dist;
        let pos;
        for (dist = 0; dist < 100; dist++) {
            pos = shift[dir](prevPos);
            const cell = this.tryCellAt(pos);
            if (!cell || !cell.isEmpty()) break;
            prevPos = pos;
            this.cellAt(pos).markTrail(playerIndex, dir);
        }
        return {dist, lastPos: prevPos};
    }

    untrace(pos: Pos, dir: Dir, maxDist: number): void {
        for (let dist = 0; dist < maxDist; dist++) {
            this.cellAt(pos).unmarkTrail();
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
{
    const grid = new Grid();

    shuffle(dirs);

    for (let turn = 0; ; turn++) {
        const input = readState();

        const startHr = process.hrtime();
        const showTime = (): void => {
            const endHr = process.hrtime(startHr);
            log('Turn %d: %dms', turn, endHr[1] / 1000000);
        };

        grid.step(input);
        const myPos = input.posList[input.myIndex];

        // log(myPos, otherPos);

        const {dir} = grid.bestDir(myPos, input.myIndex);

        log(grid.dump());
        console.log(dir);
        showTime();
    }
}
