export class SortedMap<T> {

    private maxOrder = 0;
    constructor(
        private readonly map: Map<string, T> = new Map<string, T>(),
        private readonly sortedKeys: Map<string, number> = new Map<string, number>()
    ) { }

    public set(key: string, value: T, order: number | undefined = undefined) {
        if (Number.isNaN(order) || (!Number.isSafeInteger(order))) throw new Error('Order must be a valid 32 bit finite number');

        if (order !== undefined) {
            this.maxOrder = Math.max(this.maxOrder, order);
        }
        else {
            order = ++this.maxOrder;
        }
        this.map.set(key, value);
        this.sortedKeys.set(key, order);
    }

    public sort(): Map<string, T> {
        const sortedKeys = Array.from(this.sortedKeys.entries())
            .sort((a, b) => a[1] - b[1]);
        const sortedMap = new Map<string, T>();
        for (const [key, order] of sortedKeys) {
            const value = this.map.get(key);
            if (value === undefined) continue;
            sortedMap.set(key, value);
        }
        return sortedMap;
    }

    public clear() {
        this.map.clear();
        this.sortedKeys.clear();
        this.maxOrder = 0;
    }

    public [Symbol.dispose]() {
        this.clear();
    }
}