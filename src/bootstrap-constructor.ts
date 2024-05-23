export class BootstrapConstructor {

    public createInstance<InstanceType>(typeConstructor: new (...constructorArguments: any[]) => InstanceType, constructorArguments?: any[]): InstanceType {
        return new typeConstructor(...(constructorArguments || []));
    }

    public async createAsyncInstanceWithoutConstructor<InstanceType>(typeConstructor: (...constructorArguments: any[]) => Promise<InstanceType>, constructorArguments?: any[]): Promise<InstanceType> {
        return await typeConstructor(...(constructorArguments || []));
    }

    public createInstanceWithoutConstructor<InstanceType>(typeConstructor: (...constructorArguments: any[]) => InstanceType, constructorArguments?: any[]): InstanceType {
        return typeConstructor(...(constructorArguments || []));
    }
}