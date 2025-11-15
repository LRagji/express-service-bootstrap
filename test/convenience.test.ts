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
                typeof (customConstructor.createInstanceWithoutConstructor as Sinon.SinonStub).firstCall.args[0],
                "function"
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
                typeof (customConstructor.createInstanceWithoutConstructor as Sinon.SinonStub).firstCall.args[0],
                "function"
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

        it('should call createInstanceWithoutConstructor with bodyParser.urlencoded and default options', () => {
            convenience.bodyParserURLEncodingMiddleware();
            const stubbedConstructor = customConstructor.createInstanceWithoutConstructor as Sinon.SinonStub;
            assert(stubbedConstructor.calledOnce);
            assert.strictEqual(stubbedConstructor.firstCall.args[0] !== null, true);
            assert.deepStrictEqual(stubbedConstructor.firstCall.args[1], [{ extended: true }]);
        });
        // New tests for other methods should be reviewed as well
        it('should call createInstanceWithoutConstructor with bodyParser.urlencoded and custom options', () => {
            const options = { extended: false };
            convenience.bodyParserURLEncodingMiddleware(options);
            assert((customConstructor.createInstanceWithoutConstructor as Sinon.SinonStub).calledOnce);
            assert.deepStrictEqual(
                (customConstructor.createInstanceWithoutConstructor as Sinon.SinonStub).firstCall.args[1],
                [options]
            );
        });

        it('should call createInstanceWithoutConstructor with bodyParser.json and default options', () => {
            convenience.bodyParserJSONEncodingMiddleware();
            assert((customConstructor.createInstanceWithoutConstructor as Sinon.SinonStub).calledOnce);
            assert.strictEqual(
                (customConstructor.createInstanceWithoutConstructor as Sinon.SinonStub).firstCall.args[0],
                require('body-parser').json
            );
            assert.deepStrictEqual(
                (customConstructor.createInstanceWithoutConstructor as Sinon.SinonStub).firstCall.args[1],
                [{ limit: '1mb' }]
            );
        });

        it('should call createInstanceWithoutConstructor with bodyParser.json and custom options', () => {
            const options = { limit: '10mb' };
            convenience.bodyParserJSONEncodingMiddleware(options);
            assert((customConstructor.createInstanceWithoutConstructor as Sinon.SinonStub).calledOnce);
            assert.deepStrictEqual(
                (customConstructor.createInstanceWithoutConstructor as Sinon.SinonStub).firstCall.args[1],
                [options]
            );
        });

        it('should call createInstanceWithoutConstructor with helmet and options', () => {
            const options = { contentSecurityPolicy: false };
            convenience.helmetMiddleware(options);
            assert((customConstructor.createInstanceWithoutConstructor as Sinon.SinonStub).calledOnce);
            assert.strictEqual(
                (customConstructor.createInstanceWithoutConstructor as Sinon.SinonStub).firstCall.args[0],
                require('helmet')
            );
            assert.deepStrictEqual(
                (customConstructor.createInstanceWithoutConstructor as Sinon.SinonStub).firstCall.args[1],
                [options]
            );
        });

        it('should call createInstanceWithoutConstructor with helmet and undefined when no options are passed', () => {
            convenience.helmetMiddleware();
            assert((customConstructor.createInstanceWithoutConstructor as Sinon.SinonStub).calledOnce);
            assert.deepStrictEqual(
                (customConstructor.createInstanceWithoutConstructor as Sinon.SinonStub).firstCall.args[1],
                [undefined]
            );
        });

        it('should call createInstanceWithoutConstructor with express.static and staticPath', () => {
            const staticPath = '/public';
            convenience.staticMiddleware(staticPath);
            assert((customConstructor.createInstanceWithoutConstructor as Sinon.SinonStub).calledOnce);
            assert.strictEqual(
                (customConstructor.createInstanceWithoutConstructor as Sinon.SinonStub).firstCall.args[0],
                require('express').static
            );
            assert.deepStrictEqual(
                (customConstructor.createInstanceWithoutConstructor as Sinon.SinonStub).firstCall.args[1],
                [staticPath]
            );
        });

        it('should call createInstanceWithoutConstructor with a middleware function for injectInRequestMiddleware', () => {
            const stub = customConstructor.createInstanceWithoutConstructor as Sinon.SinonStub;
            convenience.injectInRequestMiddleware('foo', 123);
            assert(stub.calledOnce);
            assert.strictEqual(typeof stub.firstCall.args[0], 'function');
        });

        it('injectInRequestMiddleware should inject object into request and call next', () => {
            let middlewareFn: any;
            (customConstructor.createInstanceWithoutConstructor as Sinon.SinonStub).callsFake((fn: any) => {
                middlewareFn = fn();
                return middlewareFn;
            });
            const result = convenience.injectInRequestMiddleware('bar', 'baz');
            const req: any = {};
            const res: any = {};
            let nextCalled = false;
            const next = () => { nextCalled = true; };
            result(req, res, next);
            assert.strictEqual(req.bar, 'baz');
            assert(nextCalled);
        });

        it('swaggerAPIDocs should call createInstanceWithoutConstructor with Router and set up swagger', () => {
            const fakeRouter = { use: Sinon.stub() };
            (customConstructor.createInstanceWithoutConstructor as Sinon.SinonStub).returns(fakeRouter);
            const swaggerDoc = { openapi: '3.0.0' };
            const result = convenience.swaggerAPIDocs(swaggerDoc, '/docs');
            assert((customConstructor.createInstanceWithoutConstructor as Sinon.SinonStub).calledOnce);
            assert(fakeRouter.use.calledOnce);
            assert.strictEqual(result.hostingPath, '/docs');
            assert.strictEqual(result.router, fakeRouter);
        });

        it('swaggerAPIDocs should use default hostPath if not provided', () => {
            const fakeRouter = { use: Sinon.stub() };
            (customConstructor.createInstanceWithoutConstructor as Sinon.SinonStub).returns(fakeRouter);
            const swaggerDoc = { openapi: '3.0.0' };
            const result = convenience.swaggerAPIDocs(swaggerDoc);
            assert.strictEqual(result.hostingPath, '/api-docs');
        });
    });
});