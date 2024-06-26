import { BootstrapConstructor } from "./bootstrap-constructor";

/**
 * DisposableSingletonContainer is a class that is used to create instances of classes and manage their lifecycle via singleton methods.
 */
export class DisposableSingletonContainer {

    /**
     * Creates an instance of DisposableSingletonContainer.
     * @param singletonContainer The singleton container map(defaults to an empty map)
     * @param disposeSequenceMap The dispose sequence map(defaults to an empty map, to be filled if singletonContainer is not empty)
     * @param disposeSequence The dispose sequence number(defaults to 0, to be incremented appropriately if singletonContainer is not empty)
     * @param bootstrap The bootstrap constructor.
     */
    constructor(
        private readonly singletonContainer = new Map<string, unknown>(),
        private readonly disposeSequenceMap = new Map<number, Set<string>>(),
        private disposeSequence = 0,
        public readonly bootstrap = new BootstrapConstructor()
    ) { }

    /**
     * Creates a new instance of a class with a constructor or returns an existing one based on name.
     * @param {string} name The name of the instance, has to be unique across all instances.
     * @param typeConstructor The class constructor
     * @param constructorArguments The arguments to pass to the constructor(optional)
     * @param {number} disposeSequence The dispose sequence number(optional)
     * @returns The instance of the class
     */
    public createInstance<InstanceType>(name: string, typeConstructor: new (...constructorArguments: any[]) => InstanceType, constructorArguments?: any[], disposeSequence?: number): InstanceType {
        if (!this.singletonContainer.has(name)) {
            const newInstance = this.bootstrap.createInstance<InstanceType>(typeConstructor, constructorArguments);
            this.registerInstance<InstanceType>(name, newInstance, disposeSequence, true);
        }
        return this.singletonContainer.get(name) as InstanceType;
    }

    /**
     * Creates a new instance of a class without a constructor asynchronously or returns an existing one based on name.
     * @param {string} name The name of the instance, has to be unique across all instances.
     * @param typeConstructorFunction The class constructor ASYNC function.
     * @param constructorFunctionArguments The arguments to pass to the constructor(optional)
     * @param {number} disposeSequence The dispose sequence number(optional)
     * @returns The instance of the class
     */
    public async createAsyncInstanceWithoutConstructor<InstanceType>(name: string, typeConstructorFunction: (...constructorArguments: any[]) => Promise<InstanceType>, constructorFunctionArguments?: any[], disposeSequence?: number): Promise<InstanceType> {
        if (!this.singletonContainer.has(name)) {
            const newInstance = await this.bootstrap.createAsyncInstanceWithoutConstructor<InstanceType>(typeConstructorFunction, constructorFunctionArguments);
            this.registerInstance<InstanceType>(name, newInstance, disposeSequence, true);
        }
        return this.singletonContainer.get(name) as InstanceType;
    }

    /**
     * Creates a new instance of a class without a constructor or returns an existing one based on name.
     * @param {string} name The name of the instance, has to be unique across all instances.
     * @param typeConstructorFunction The class constructor
     * @param constructorFunctionArguments The arguments to pass to the constructor(optional)
     * @param {number} disposeSequence The dispose sequence number(optional)
     * @returns The instance of the class
     * @template InstanceType The type of the instance
     * @returns {InstanceType} The instance of the class
     */
    public createInstanceWithoutConstructor<InstanceType>(name: string, typeConstructorFunction: (...constructorArguments: any[]) => InstanceType, constructorFunctionArguments?: any[], disposeSequence?: number): InstanceType {
        if (!this.singletonContainer.has(name)) {
            const newInstance = this.bootstrap.createInstanceWithoutConstructor<InstanceType>(typeConstructorFunction, constructorFunctionArguments);
            this.registerInstance<InstanceType>(name, newInstance, disposeSequence, true);
        }
        return this.singletonContainer.get(name) as InstanceType;
    }

    /**
     * Fetches an existing instance based on name.
     * @param {string} name The name of the instance
     * @returns The instance of the class or undefined if it does not exist
     * @template InstanceType The type of the instance
     * @returns {InstanceType | undefined} The instance of the class or undefined if it does not exist
     */

    public fetchInstance<InstanceType>(name: string): InstanceType | undefined {
        return this.singletonContainer.get(name) as InstanceType;
    }

    /**
     * Registers an existing instance based on name.
     * @param {string} name The name of the instance
     * @param {InstanceType} instance The instance of the class
     * @param {number} disposeSequence The dispose sequence number(optional)
     * @template InstanceType The type of the instance
     * @returns {void} void
     */
    public registerInstance<InstanceType>(name: string, instance: InstanceType, disposeSequence?: number, overrideExistingInstance: boolean = true): boolean {
        //throw new Error('Not implemented');
        if (overrideExistingInstance === false && this.singletonContainer.has(name)) {
            return false
        }

        this.disposeSequence++;
        disposeSequence = disposeSequence || this.disposeSequence;
        const existingMembers = this.disposeSequenceMap.get(disposeSequence) || new Set<string>()
        existingMembers.add(name);
        this.disposeSequenceMap.set(disposeSequence, existingMembers);
        this.singletonContainer.set(name, instance);
        return true;
    }

    /**
     * Disposes an existing instance based on name.
     * @param {string} name The name of the instance
     * @returns {Promise<void>} void
     */
    public async disposeInstance(name: string): Promise<void> {
        if (this.singletonContainer.has(name)) {
            if ((this.singletonContainer.get(name) as any)[Symbol.dispose] != null) {
                (this.singletonContainer.get(name) as any)[Symbol.dispose]();
            }

            if ((this.singletonContainer.get(name) as any)[Symbol.asyncDispose] != null) {
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

    /**
     * Disposes all existing instances based on the dispose sequence.
     * @returns {Promise<void>} void
     */
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