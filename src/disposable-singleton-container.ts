import { BootstrapConstructor } from "./bootstrap-constructor";

export class DisposableSingletonContainer {

    constructor(
        private readonly singletonContainer = new Map<string, unknown>(),
        private readonly disposeSequenceMap = new Map<number, Set<string>>(),
        private disposeSequence = 0,
        public readonly bootstrap = new BootstrapConstructor()
    ) { }

    public createInstance<InstanceType>(name: string, typeConstructor: new (...constructorArguments: any[]) => InstanceType, constructorArguments?: any[], disposeSequence?: number): InstanceType {
        if (!this.singletonContainer.has(name)) {
            const newInstance = this.bootstrap.createInstance<InstanceType>(typeConstructor);
            this.disposeSequence++;
            disposeSequence = disposeSequence || this.disposeSequence;
            const existingMembers = this.disposeSequenceMap.get(disposeSequence) || new Set<string>()
            existingMembers.add(name);
            this.disposeSequenceMap.set(disposeSequence, existingMembers);
            this.singletonContainer.set(name, newInstance);
        }
        return this.singletonContainer.get(name) as InstanceType;
    }

    public async createInstanceWithoutConstructor<InstanceType>(name: string, typeConstructor: (...constructorArguments: any[]) => Promise<InstanceType>, constructorArguments?: any[], disposeSequence?: number): Promise<InstanceType> {
        if (!this.singletonContainer.has(name)) {
            const newInstance = this.bootstrap.createAsyncInstanceWithoutConstructor<InstanceType>(typeConstructor);
            this.disposeSequence++;
            disposeSequence = disposeSequence || this.disposeSequence;
            const existingMembers = this.disposeSequenceMap.get(disposeSequence) || new Set<string>()
            existingMembers.add(name);
            this.disposeSequenceMap.set(disposeSequence, existingMembers);
            this.singletonContainer.set(name, newInstance);
        }
        return this.singletonContainer.get(name) as InstanceType;
    }

    public async disposeInstance(name: string): Promise<void> {
        if (this.singletonContainer.has(name)) {
            if ((this.singletonContainer.get(name) as any)[Symbol.dispose] !== null) {
                (this.singletonContainer.get(name) as any)[Symbol.dispose]();
            }

            if ((this.singletonContainer.get(name) as any)[Symbol.asyncDispose] !== null) {
                await (this.singletonContainer.get(name) as any)[Symbol.asyncDispose]();
            }
            this.singletonContainer.delete(name);
            this.disposeSequenceMap.forEach((setOfNames, sequence) => {
                if (setOfNames.has(name)) {
                    setOfNames.delete(name);
                    if (setOfNames.size === 0) {
                        this.disposeSequenceMap.delete(sequence);
                    }
                }
            });
        }
    }

    public async disposeAll() {
        //Sort descending order of dispose sequence
        const sortedDisposeSequence = Array.from(this.disposeSequenceMap.keys()).sort((a, b) => b - a);
        for (const sequence of sortedDisposeSequence) {
            for (const instanceName of (this.disposeSequenceMap.get(sequence) || new Set<string>())) {
                await this.disposeInstance(instanceName);
            }
        }
    }
}