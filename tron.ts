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

const opposite: {[dir in Dir]: Dir} = {
    LEFT: 'RIGHT',
    RIGHT: 'LEFT',
    UP: 'DOWN',
    DOWN: 'UP',
};

type Input = {myIndex: number; posList: Pos[]};
function readState(): Input {
    const [playerCount, myIndex] = readInts();
    const posList = [];
    for (let i = 0; i < playerCount; i++) {
        const [, , x, y] = readInts();
        posList.push({x, y});
    }

    return {myIndex, posList};
}

const fieldWidth = 30;
const fieldHeight = 20;

interface Pos {
    x: number;
    y: number;
}

class Cell {
    private trailOf = -1;

    toString(): string {
        if (this.trailOf == -1) return ' ';
        else return String(this.trailOf);
    }

    markTrail(playerIndex: number): this {
        this.trailOf = playerIndex;
        return this;
    }

    unmarkTrail(): this {
        this.trailOf = -1;
        return this;
    }

    isEmpty(): boolean {
        return this.trailOf === -1;
    }
}

class Grid {
    me: Pos[] = [];
    others: Pos[][] = [];

    private grid: Cell[] = [];

    constructor() {
        for (let i = 0; i < fieldWidth * fieldHeight; i++)
            this.grid.push(new Cell());
    }

    private cellAt({x, y}: Pos): Cell {
        return this.grid[y * fieldWidth + x];
    }

    dump(): string {
        let result = '';
        for (let y = 0; y < fieldHeight; y++) {
            let line = '';
            for (let x = 0; x < fieldWidth; x++) line += this.cellAt({x, y});
            result += line + '\n';
        }
        return result;
    }

    append({posList}: Input): void {
        posList.forEach((pos, player) => this.cellAt(pos).markTrail(player));
    }

    isPosEmpty({x, y}: Pos): boolean {
        return (
            0 <= x &&
            x < fieldWidth &&
            0 <= y &&
            y < fieldHeight &&
            this.cellAt({x, y}).isEmpty()
        );
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
            if (!this.isPosEmpty(pos)) break;
            prevPos = pos;
            this.cellAt(pos).markTrail(playerIndex);
        }
        return {dist, lastPos: prevPos};
    }

    untrace(pos: Pos, dir: Dir, maxDist: number): void {
        for (let dist = 0; dist < maxDist; dist++) {
            this.cellAt(pos).unmarkTrail();
            pos = shift[dir](pos);
        }
    }
}

function bestDir(
    grid: Grid,
    pos: Pos,
    playerIndex: number,
    iterationsLeft = 64,
): {dir: Dir; dist: number} {
    let outputDir = dirs[0];
    let maxDist = 0;
    if (!iterationsLeft) return {dir: outputDir, dist: 0};
    dirs.forEach(dir => {
        const {dist: firstDist, lastPos} = grid.trace(pos, dir, playerIndex);
        const restDist =
            firstDist > 0 ? bestDir(grid, lastPos, iterationsLeft - 1).dist : 0;
        grid.untrace(lastPos, opposite[dir], firstDist);
        const dist = firstDist + restDist;
        if (dist > maxDist) {
            maxDist = dist;
            outputDir = dir;
        }
    });
    return {dir: outputDir, dist: maxDist};
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

        grid.append(input);
        const myPos = input.posList[input.myIndex];

        // log(myPos, otherPos);

        const {dir} = bestDir(grid, myPos, input.myIndex);

        log(grid.dump());
        console.log(dir);
        showTime();
    }
}
