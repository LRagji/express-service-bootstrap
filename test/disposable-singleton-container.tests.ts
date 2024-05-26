import assert from 'node:assert';
import { DisposableSingletonContainer } from '../src/disposable-singleton-container';
import { BootstrapConstructor } from '../src/bootstrap-constructor';
import { afterEach, beforeEach, describe, it } from 'node:test';
import Sinon from 'sinon';

class MyClass {
    constructorCountter = 0;
    constructor(initialValue: number = 0) {
        this.constructorCountter = initialValue;
        this.constructorCountter++;
    }
    [Symbol.dispose]() { };
    [Symbol.asyncDispose]() { };
}

describe('DisposableSingletonContainer', () => {
    let container: DisposableSingletonContainer;

    beforeEach(() => {
        container = new DisposableSingletonContainer();
    });

    afterEach(() => {
        container.disposeAll();
    });

    it('should create a new instance of a class with a constructor', () => {

        const instance = container.createInstance<MyClass>('myInstance', MyClass);

        assert(instance instanceof MyClass);
        assert.strictEqual(instance.constructorCountter, 1);
    });

    it('should create a new instance of a class with a passed parameters', () => {

        const instance = container.createInstance<MyClass>('myInstance', MyClass, [15]);

        assert(instance instanceof MyClass);
        assert.strictEqual(instance.constructorCountter, 16);
    });

    it('should return an existing instance of a class with a constructor', () => {

        const instance1 = container.createInstance<MyClass>('myInstance', MyClass);
        const instance2 = container.createInstance<MyClass>('myInstance', MyClass);

        assert.strictEqual(instance1, instance2);
        assert.strictEqual(instance1.constructorCountter, 1);
    });

    it('should create a new instance of a class without a constructor asynchronously', async () => {

        const instance = await container.createInstanceWithoutConstructor<MyClass>('myInstance', async () => new MyClass());

        assert(instance instanceof MyClass);
        assert.strictEqual(instance.constructorCountter, 1);
    });

    it('should create a new instance of a class without a constructor asynchronously with a passed parameters', async () => {

        const instance = await container.createInstanceWithoutConstructor<MyClass>('myInstance', async (x: number) => new MyClass(x), [100]);

        assert(instance instanceof MyClass);
        assert.strictEqual(instance.constructorCountter, 101);
    });

    it('should return an existing instance of a class without a constructor asynchronously', async () => {

        const instance1 = await container.createInstanceWithoutConstructor<MyClass>('myInstance', async () => new MyClass());
        const instance2 = await container.createInstanceWithoutConstructor<MyClass>('myInstance', async () => new MyClass());

        assert.strictEqual(instance1, instance2);
        assert.strictEqual(instance1.constructorCountter, 1);
    });

    it('should dispose an existing instance by calling sync and async dispose methods', async () => {

        const instance = container.createInstance<MyClass>('myInstance', MyClass);
        const disposeSpy = Sinon.spy(instance, Symbol.dispose);
        const asyncDisposeSpy = Sinon.spy(instance, Symbol.asyncDispose);

        await container.disposeInstance('myInstance');

        assert(disposeSpy.calledOnce);
        assert(asyncDisposeSpy.calledOnce);
        assert(container.createInstance('myInstance', MyClass) !== instance);
    });

    it('should dispose all existing instances with provided sequence in descending order', async () => {

        const instance1 = container.createInstance<MyClass>('instance1', MyClass, undefined, 0);
        const instance2 = container.createInstance<MyClass>('instance2', MyClass, undefined, 1);
        const disposeSpy1 = Sinon.spy(instance1, Symbol.dispose);
        const asyncDisposeSpy1 = Sinon.spy(instance1, Symbol.asyncDispose);
        const disposeSpy2 = Sinon.spy(instance2, Symbol.dispose);
        const asyncDisposeSpy2 = Sinon.spy(instance2, Symbol.asyncDispose);

        await container.disposeAll();

        assert(disposeSpy1.calledOnce);
        assert(asyncDisposeSpy1.calledOnce);
        assert(disposeSpy2.calledOnce);
        assert(asyncDisposeSpy2.calledOnce);

        disposeSpy1.calledBefore(asyncDisposeSpy1);
        asyncDisposeSpy1.calledBefore(disposeSpy2);
        disposeSpy2.calledBefore(asyncDisposeSpy2);

        assert(container.createInstance('instance1', MyClass) !== instance1);
        assert(container.createInstance('instance2', MyClass) !== instance2);
    });
});