import assert from 'node:assert';
import { BootstrapConstructor } from '../src/bootstrap-constructor';
import { beforeEach, describe, it } from 'node:test';

class MyClass {
    constructor(public readonly name: string) { }
}

describe('BootstrapConstructor', () => {
    let bootstrapConstructor: BootstrapConstructor;

    beforeEach(() => {
        bootstrapConstructor = new BootstrapConstructor();
    });

    it('should create an instance of a class with a constructor', () => {
        const instance = bootstrapConstructor.createInstance(MyClass, ['John']);
        assert(instance instanceof MyClass);
        assert.strictEqual(instance.name, 'John');
    });

    it('should create an instance of a class with constructor function', () => {

        const constructorFunction = (name: string) => {
            return new MyClass(name);
        };

        const instance = bootstrapConstructor.createInstanceWithoutConstructor(constructorFunction, ['John']);

        assert(instance instanceof MyClass);
        assert.strictEqual(instance.name, 'John');
    });

    it('should create an instance of a class with async constructor function', async () => {

        const asyncConstructorFunction = async (name: string) => {
            return new MyClass(name);
        };

        const instance = await bootstrapConstructor.createAsyncInstanceWithoutConstructor(asyncConstructorFunction, ['John']);
        assert(instance instanceof MyClass);
        assert.strictEqual(instance.name, 'John');
    });
});