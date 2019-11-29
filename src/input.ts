import {Pos, pos} from './pos';

// const lines: string[] = [];
function readInts(readline: () => string): number[] {
    const line = readline();
    // lines.push(line);
    if (!line) return [];
    return line.split(' ').map(s => parseInt(s, 10));
}

export type Input = {myIdx: number; startPosList: Pos[]; posList: Pos[]};
export function readState(readline: () => string): Input | null {
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

