import {Pos, pos, isPosUnset, posToString} from './pos';
import {Input} from './input';
import {Iterator, Log} from './iterator';
import gameToString from './gameToString';
import {Dir, DIRS, deriveDir, oppositeDir, dirToString} from './dir';

export type CellIdx = number & {readonly __cellIdx: unique symbol};
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

export class Cell {
    trailOf = -1;
    dir: null | Dir = null;
    private deadTrails: {dir: Dir | null; trailOf: number}[] = [];

    availableDirs: Dir[] = [];

    controlledBy = -1;
    distanceTo = -1;
    distance = -1;
    floodfillCounter = 0;

    toString(): string {
        if (this.trailOf == -1) return ' ';
        else if (this.dir == null) return String(this.trailOf);
        else return dirToString(this.dir);
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
        initial = false,
    ): void {
        if (initial) this.controlledBy = playerIdx;
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
            case Dir.LEFT:
                return (c - 1) as CellIdx;
            case Dir.RIGHT:
                return (c + 1) as CellIdx;
            case Dir.UP:
                return (c - this.width) as CellIdx;
            case Dir.DOWN:
                return (c + this.width) as CellIdx;
        }
    }

    shiftCellIdx(dir: Dir, cellIdx: CellIdx): CellIdx | null {
        let x = cellIdx % this.width;
        let y = Math.floor(cellIdx / this.width);
        switch (dir) {
            case Dir.LEFT:
                x--;
                if (x < 0) return null;
                break;
            case Dir.RIGHT:
                x++;
                if (x >= this.width) return null;
                break;
            case Dir.UP:
                y--;
                if (y < 0) return null;
                break;
            case Dir.DOWN:
                y++;
                if (y >= this.height) return null;
                break;
        }
        return (y * this.width + x) as CellIdx;
    }

    cellAt(cellIdx: CellIdx): Cell {
        return this.grid[cellIdx];
    }

    floodfill(players: Player[], initial = false): number[] {
        this.floodfillCounter++;
        let begin = 0;
        let end = 0;
        const queue = this.floodfillQueue;
        const result = players.map(() => 0);
        players.forEach((p, i) => {
            if (p.isDead) return;
            result[i] += p.trailLength * 6;
            const cell = this.cellAt(p.cellIdx);
            cell.markDistance(i, 0, this.floodfillCounter, initial);
            queue[end++] = p.cellIdx;
        });
        for (;;) {
            if (begin >= end) break;
            const cellIdx = queue[begin++];
            const cell = this.cellAt(cellIdx);
            let score = 4;
            for (let i = 0; i < DIRS.length; i++) {
                const dir = DIRS[i];
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
                    initial,
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

export default class Game {
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
    isPlayerInControl(playerIdx: number): boolean {
        return (
            this.grid.cellAt(this.players[playerIdx].cellIdx).controlledBy ===
            playerIdx
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

        if (player.dir == null) {
            throw new Error('Player direction is unset');
        }
        const cellIdx = this.grid.safeShiftCellIdx(
            oppositeDir(player.dir),
            player.cellIdx,
        );

        const prevCell = this.grid.cellAt(cellIdx);
        player.stepBack(cellIdx, prevCell.dir);

        cell.unmarkTrail();
    }

    toString(): string {
        return gameToString(this);
    }
}
