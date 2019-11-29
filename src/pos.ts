export type Pos = {
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

export function isPosUnset({x, y}: Pos): boolean {
    return x == -1 && y == -1;
}

export function posToString({x, y}: Pos): string {
    return `${x}, ${y}`;
}

