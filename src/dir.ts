import {Pos, posToString} from './pos';

export const enum Dir {
    LEFT,
    RIGHT,
    UP,
    DOWN,
}
export const DIRS: Dir[] = [Dir.LEFT, Dir.RIGHT, Dir.UP, Dir.DOWN];

export const deriveDir = (prev: Pos, next: Pos): Dir => {
    const xDiff = next.x - prev.x;
    const yDiff = next.y - prev.y;
    if (xDiff === -1 && yDiff === 0) return Dir.LEFT;
    if (xDiff === 1 && yDiff === 0) return Dir.RIGHT;
    if (xDiff === 0 && yDiff === -1) return Dir.UP;
    if (xDiff === 0 && yDiff === 1) return Dir.DOWN;
    throw new Error(
        `No single step from ${posToString(prev)} to ${posToString(next)}`,
    );
};

const OPPOSITES: {readonly [dir in Dir]: Dir} = {
    [Dir.LEFT]: Dir.RIGHT,
    [Dir.RIGHT]: Dir.LEFT,
    [Dir.UP]: Dir.DOWN,
    [Dir.DOWN]: Dir.UP,
};

export const oppositeDir = (dir: Dir): Dir => OPPOSITES[dir];

const SIDES: {readonly [dir in Dir]: [Dir, Dir]} = {
    [Dir.LEFT]: [Dir.UP, Dir.DOWN],
    [Dir.RIGHT]: [Dir.UP, Dir.DOWN],
    [Dir.UP]: [Dir.LEFT, Dir.RIGHT],
    [Dir.DOWN]: [Dir.LEFT, Dir.RIGHT],
};

export const dirSides = (dir: Dir): [Dir, Dir] => SIDES[dir];

const DIR_CHARS: {readonly [dir in Dir]: string} = {
    [Dir.LEFT]: '<',
    [Dir.RIGHT]: '>',
    [Dir.UP]: '↑',
    [Dir.DOWN]: '↓',
};

export const dirToString = (dir: Dir): string => DIR_CHARS[dir];

const DIR_WORDS: {readonly [dir in Dir]: string} = {
    [Dir.LEFT]: 'LEFT',
    [Dir.RIGHT]: 'RIGHT',
    [Dir.UP]: 'UP',
    [Dir.DOWN]: 'DOWN',
};

export const dirToWord = (dir: Dir): string => DIR_WORDS[dir];

