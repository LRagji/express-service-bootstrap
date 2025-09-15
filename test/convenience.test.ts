import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';
import Sinon from 'sinon';
import { BootstrapConstructor, Convenience } from '../src';
import compression, { CompressionOptions, filter } from 'compression';

describe('Convenience', () => {
    describe('compressionMiddleware', () => {
        let convenience: Convenience;
        let customConstructor: BootstrapConstructor;

        beforeEach(() => {
            customConstructor = {
                createInstanceWithoutConstructor: Sinon.stub()
            } as any;
            convenience = new Convenience(customConstructor);
        });

        it('should call createInstanceWithoutConstructor with compression and options', () => {
            const options = { level: 6, filter: (req: any, res: any) => true } as CompressionOptions;
            convenience.compressionMiddleware(options);
            assert((customConstructor.createInstanceWithoutConstructor as Sinon.SinonStub).calledOnce);
            assert.strictEqual(
                (customConstructor.createInstanceWithoutConstructor as Sinon.SinonStub).firstCall.args[0],
                compression
            );
            assert.deepStrictEqual(
                (customConstructor.createInstanceWithoutConstructor as Sinon.SinonStub).firstCall.args[1],
                [options]
            );
        });

        it('should call createInstanceWithoutConstructor with compression and undefined when no options are passed', () => {
            convenience.compressionMiddleware();
            assert((customConstructor.createInstanceWithoutConstructor as Sinon.SinonStub).calledOnce);
            assert.strictEqual(
                (customConstructor.createInstanceWithoutConstructor as Sinon.SinonStub).firstCall.args[0],
                compression
            );
            assert.deepStrictEqual(
                (customConstructor.createInstanceWithoutConstructor as Sinon.SinonStub).firstCall.args[1],
                [undefined]
            );
        });

        it('should return the result of createInstanceWithoutConstructor', () => {
            const expected = {};
            (customConstructor.createInstanceWithoutConstructor as Sinon.SinonStub).returns(expected);
            const result = convenience.compressionMiddleware();
            assert.strictEqual(result, expected);
        });
    });
});