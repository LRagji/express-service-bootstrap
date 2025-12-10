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

        it('encodeBodyStream should produce a readable stream with correct contents and size', async () => {
            const payload = 'hello world';

            const { stream, size } = convenience.encodeBodyStream(payload);

            // Verify size
            const encoded = new TextEncoder().encode(payload);
            assert.strictEqual(size, encoded.length);

            // Verify stream contents
            const reader = (stream as any).getReader();
            const readResult = await reader.read();
            const decoded = new TextDecoder().decode(readResult.value);
            assert.strictEqual(decoded, payload);

            // Verify stream is done and closed
            const after = await reader.read();
            assert.strictEqual(after.done, true);
        });

        it('encodeBodyStream should produce a readable stream with correct contents and size for non ASCII chars', async () => {
            const payload = 'hello 😊 𠝹 world';

            const { stream, size } = convenience.encodeBodyStream(payload);

            // Verify size
            const encoded = new TextEncoder().encode(payload);
            assert.strictEqual(size, encoded.length);

            // Verify stream contents
            const reader = (stream as any).getReader();
            const readResult = await reader.read();
            const decoded = new TextDecoder().decode(readResult.value);
            assert.strictEqual(decoded, payload);

            // Verify stream is done and closed
            const after = await reader.read();
            assert.strictEqual(after.done, true);
        });

        it('compressibleRequestGZIP should compress body and set Content-Encoding when shouldCompress is true', async () => {
            const url = new URL('http://example.com/test');
            const headers: Record<string, string> = { "Accept": "application/json" };
            const bodyStream = { pipeThrough: Sinon.fake.returns('COMPRESSED_STREAM') } as any;

            class FakeCompressionStream {
                constructor(public algo: string) { }
            }
            const fetchStub = Sinon.fake.resolves({ status: 200 } as any);
            const context = { CompressionStream: FakeCompressionStream, fetch: fetchStub } as any;

            const response = await convenience.compressibleRequestGZIP('POST', url, headers, bodyStream, true, context);

            assert(fetchStub.calledOnce);
            const calledUrl = fetchStub.firstCall.args[0];
            const calledOptions = fetchStub.firstCall.args[1];
            assert.strictEqual(calledUrl, url);
            assert.strictEqual(headers['content-encoding'], 'gzip');
            assert.strictEqual(calledOptions.method, 'POST');
            assert.strictEqual(calledOptions.headers, headers);
            assert.strictEqual(calledOptions.body, 'COMPRESSED_STREAM');
            assert((bodyStream.pipeThrough as Sinon.SinonSpy).calledOnce);
            const passedCompressionInstance = (bodyStream.pipeThrough as Sinon.SinonSpy).firstCall.args[0];
            assert(passedCompressionInstance instanceof FakeCompressionStream);
            assert.strictEqual(response.status, 200);
        });

        it('compressibleRequestGZIP should not compress body and should not set Content-Encoding when shouldCompress is false', async () => {
            const url = new URL('http://example.com/no-compress');
            const headers: Record<string, string> = {};
            const bodyStream = { pipeThrough: Sinon.fake() } as any;
            const fetchStub = Sinon.fake.resolves({ status: 201 } as any);
            const context = { CompressionStream: class { }, fetch: fetchStub } as any;

            const response = await convenience.compressibleRequestGZIP('PUT', url, headers, bodyStream, false, context);

            assert(fetchStub.calledOnce);
            const calledUrl = fetchStub.firstCall.args[0];
            const calledOptions = fetchStub.firstCall.args[1];
            assert.strictEqual(calledUrl, url);
            assert.strictEqual(calledOptions.method, 'PUT');
            assert.strictEqual(calledOptions.body, bodyStream);
            assert.strictEqual(headers['content-encoding'], undefined);
            assert((bodyStream.pipeThrough as Sinon.SinonSpy).notCalled);
            assert.strictEqual(response.status, 201);
        });

        it('Component Test: for compressibleRequestGZIP with encodeBodyStream with an actual ECHO API when compression is enabled.', async () => {

            const payload = 'The quick brown fox jumps over the lazy dog. こんにちは世界🌏';
            const { stream: bodyStream, size } = convenience.encodeBodyStream(payload);

            const url = new URL('https://postman-echo.com/post');
            const headers: Record<string, string> = {
                "Content-Type": "text/plain",
                "Accept": "application/json",
                "Accept-Encoding": "gzip"
            };

            const response = await convenience.compressibleRequestGZIP('POST', url, headers, bodyStream, true);

            assert.strictEqual(response.status, 200);
            const responseBody = await response.json();
            const echoedData: string = responseBody.data;
            assert.strictEqual(echoedData, payload);
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