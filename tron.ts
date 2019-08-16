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

type CellState = null | number;
function printState(s: CellState): string {
    if (s == null) return ' ';
    else return String(s);
}

class State {
    me: Pos[] = [];
    others: Pos[][] = [];

    private grid: CellState[] = [];

    constructor() {
        this.grid.length = fieldWidth * fieldHeight;
        this.grid.fill(null);
    }

    private getCell({x, y}: Pos): CellState {
        return this.grid[y * fieldWidth + x];
    }

    private setCell({x, y}: Pos, s: CellState): void {
        this.grid[y * fieldWidth + x] = s;
    }

    dump(): string {
        let result = '';
        for (let y = 0; y < fieldHeight; y++) {
            let line = '';
            for (let x = 0; x < fieldWidth; x++)
                line += printState(this.getCell({x, y}));
            result += line + '\n';
        }
        return result;
    }

    append({posList}: Input): void {
        // const me = posList[myIndex];
        // this.me.push(me);
        // others.forEach((pos, i) => {
        //     if (!this.others[i]) this.others[i] = [];
        //     this.others[i].push(pos);
        // });
        posList.forEach((pos, player) => this.setCell(pos, player));
    }

    isPosEmpty({x, y}: Pos): boolean {
        return (
            0 <= x &&
            x < fieldWidth &&
            0 <= y &&
            y < fieldHeight &&
            !this.getCell({x, y})
        );
    }

    trace(prevPos: Pos, dir: Dir): {dist: number; lastPos: Pos} {
        let dist;
        let pos;
        for (dist = 0; dist < 100; dist++) {
            pos = shift[dir](prevPos);
            if (!this.isPosEmpty(pos)) break;
            prevPos = pos;
            this.setCell(pos, 1);
        }
        return {dist, lastPos: prevPos};
    }

    untrace(pos: Pos, dir: Dir, maxDist: number): void {
        for (let dist = 0; dist < maxDist; dist++) {
            this.setCell(pos, null);
            pos = shift[dir](pos);
        }
    }
}

function bestDir(
    state: State,
    pos: Pos,
    iterationsLeft = 16,
): {dir: Dir; dist: number} {
    let outputDir = dirs[0];
    let maxDist = 0;
    if (!iterationsLeft) return {dir: outputDir, dist: 0};
    dirs.forEach(dir => {
        const {dist: firstDist, lastPos} = state.trace(pos, dir);
        const restDist =
            firstDist > 0
                ? bestDir(state, lastPos, iterationsLeft - 1).dist
                : 0;
        state.untrace(lastPos, opposite[dir], firstDist);
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
    const state = new State();

    shuffle(dirs);

    for (let turn = 0; ; turn++) {
        const input = readState();

        const startHr = process.hrtime();
        const showTime = (): void => {
            const endHr = process.hrtime(startHr);
            log('Turn %d: %dms', turn, endHr[1] / 1000000);
        };

        state.append(input);
        const myPos = input.posList[input.myIndex];

        // log(myPos, otherPos);

        const {dir} = bestDir(state, myPos);

        log(state.dump());
        console.log(dir);
        showTime();
    }
}
