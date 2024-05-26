/**
 * BootstrapConstructor is a class that is used to create instances of classes.(this helps with dependency injection & mocking).
 */
export class BootstrapConstructor {

    /**
     * Creates an instance of a class with a constructor.
     * @param typeConstructor The class constructor
     * @param constructorArguments The arguments to pass to the constructor(optional)
     * @returns The instance of the class
     */
    public createInstance<InstanceType>(typeConstructor: new (...constructorArguments: any[]) => InstanceType, constructorArguments?: any[]): InstanceType {
        return new typeConstructor(...(constructorArguments || []));
    }

    /**
     * Creates an instance of a class without a constructor asynchronously.
     * @param typeConstructor The class constructor ASYNC function.
     * @param constructorArguments the arguments to pass to the constructor(optional)
     * @returns The instance of the class
     */
    public async createAsyncInstanceWithoutConstructor<InstanceType>(typeConstructor: (...constructorArguments: any[]) => Promise<InstanceType>, constructorArguments?: any[]): Promise<InstanceType> {
        return await typeConstructor(...(constructorArguments || []));
    }

    /**
     * Creates an instance of a class without a constructor.
     * @param typeConstructor The class constructor function.
     * @param constructorArguments the arguments to pass to the constructor(optional)
     * @returns The instance of the class
     */
    public createInstanceWithoutConstructor<InstanceType>(typeConstructor: (...constructorArguments: any[]) => InstanceType, constructorArguments?: any[]): InstanceType {
        return typeConstructor(...(constructorArguments || []));
    }
}