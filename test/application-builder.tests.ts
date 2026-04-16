import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';
import Sinon from 'sinon';
import { NextFunction, Request, Response } from 'express';
import {
    ApplicationBuilder,
    ApplicationTypes,
    ApplicationStatus,
    ApplicationStartupStatus,
    ApplicationShutdownStatus,
    DisposableSingletonContainer
} from '../src';

describe('ApplicationBuilder', () => {
    let builder: ApplicationBuilder;
    let processStub: NodeJS.Process;

    beforeEach(() => {
        processStub = {
            once: Sinon.stub(),
            removeListener: Sinon.stub()
        } as unknown as NodeJS.Process;

        builder = new ApplicationBuilder(
            'TestApplication',
            async () => ({ status: ApplicationStartupStatus.UP, data: {} }),
            async () => ({ status: ApplicationShutdownStatus.STOPPED, data: {} }),
            { check: async () => ({ status: ApplicationStatus.UP, data: {} }) },
            { check: async () => ({ status: ApplicationStatus.UP, data: {} }) },
            processStub,
            ['SIGINT'],
            new DisposableSingletonContainer()
        );
    });

    it('overrideCatchAllErrorResponseTransformer should customize default error response payload', () => {
        const expectedResponse = { custom: true, code: 500 };
        const transformer = Sinon.stub().returns(expectedResponse);

        builder.overrideCatchAllErrorResponseTransformer(transformer);

        const request = {} as Request;
        const response = {
            headersSent: false,
            status: Sinon.stub().returnsThis(),
            send: Sinon.stub()
        } as unknown as Response;
        const next = Sinon.stub() as unknown as NextFunction;
        const err = new Error('boom');

        (builder as any).defaultErrorHandler(err, request, response, next);

        assert(transformer.calledOnceWithExactly(request, err));
        assert((response.status as Sinon.SinonStub).calledOnceWithExactly(500));
        assert((response.send as Sinon.SinonStub).calledOnceWithExactly(expectedResponse));
        assert.strictEqual((next as unknown as Sinon.SinonStub).called, false);
    });

    it('defaultErrorHandler should call next when headers are already sent', () => {
        const request = {} as Request;
        const response = {
            headersSent: true,
            status: Sinon.stub().returnsThis(),
            send: Sinon.stub()
        } as unknown as Response;
        const next = Sinon.stub() as unknown as NextFunction;
        const err = new Error('already sent');

        (builder as any).defaultErrorHandler(err, request, response, next);

        assert((next as unknown as Sinon.SinonStub).calledOnceWithExactly(err));
        assert.strictEqual((response.status as Sinon.SinonStub).called, false);
        assert.strictEqual((response.send as Sinon.SinonStub).called, false);
    });

    it('overrideCatchAllErrorHandler should replace the default handler', () => {
        const customErrorHandler = Sinon.stub();

        const chainedResult = builder.overrideCatchAllErrorHandler(customErrorHandler);

        assert.strictEqual(chainedResult, builder);
        assert.strictEqual((builder as any).errorHandler, customErrorHandler);
    });

    it('registerApplicationHandler should throw when order is less than 1', () => {
        const handler = Sinon.stub();

        assert.throws(
            () => builder.registerApplicationHandler(handler, '/sample', 0, ApplicationTypes.Main),
            /Order must be greater than 0/
        );
    });

    it('registerApplicationHandler should register handler in both apps when appliesTo is Both', () => {
        const handler = Sinon.stub();

        builder.registerApplicationHandler(handler, '/sample', 2, ApplicationTypes.Both);

        assert.strictEqual((builder as any).appHandlers.get('/sample'), handler);
        assert.strictEqual((builder as any).healthHandlers.get('/sample'), handler);
    });

    it('registerApplicationHandler should throw when application type is unknown', () => {
        const handler = Sinon.stub();

        assert.throws(
            () => builder.registerApplicationHandler(handler, '/sample', 1, 999 as ApplicationTypes),
            /Unknown Application Type/
        );
    });
});
