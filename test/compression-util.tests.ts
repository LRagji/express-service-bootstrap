import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import sinon from "sinon";
import { CompressionUtil } from "../src/compression-util";

describe("CompressionUtil", () => {
    const PAYLOAD_LIMIT = 1024;
    let fetchStub: sinon.SinonStub;

    beforeEach(() => {
        fetchStub = sinon.stub(globalThis, "fetch");
    });

    afterEach(() => {
        fetchStub.restore();
    });

    describe("compressiblePost", () => {
        it("should make a POST request with compressed body for large payloads", async () => {
            const largeData = "x".repeat(1100);
            const largePayload = { data: largeData };
            const headers = { "Content-Type": "application/json" };
            const url = new URL("https://api.example.com/test");
            const mockResponse = {
                ok: true,
                json: sinon.stub().resolves({ success: true }),
                status: 200,
            };
            fetchStub.resolves(mockResponse);
            const result = await CompressionUtil.compressiblePost(
                headers,
                largePayload,
                url
            );
            assert.strictEqual(fetchStub.calledOnce, true);
            const [calledUrl, options] = fetchStub.firstCall.args;
            assert.strictEqual(calledUrl, url);
            assert.strictEqual(options.method, "POST");
            assert.strictEqual(options.headers["Content-Encoding"], "gzip");
            assert.strictEqual(options.headers["Content-Type"], "application/json");
            assert.strictEqual(result, mockResponse);
        });

        it("should send compressed payload as Buffer for large payloads", async () => {
            const largeData = "x".repeat(PAYLOAD_LIMIT + 100);
            const largePayload = { data: largeData };
            const headers = { "Content-Type": "application/json" };
            const url = new URL("https://api.example.com/test");
            const mockResponse = { ok: true, status: 200 };
            fetchStub.resolves(mockResponse);
            await CompressionUtil.compressiblePost(headers, largePayload, url);
            const [, options] = fetchStub.firstCall.args;
            assert.strictEqual(options.headers["Content-Encoding"], "gzip");
            assert.ok(Buffer.isBuffer(options.body));
        });

        it("should make a POST request without compression for small payloads", async () => {
            const smallPayload = { test: "data" };
            const headers = { "Content-Type": "application/json" };
            const url = new URL("https://api.example.com/test");
            const mockResponse = {
                ok: true,
                json: sinon.stub().resolves({ success: true }),
                status: 200,
            };
            fetchStub.resolves(mockResponse);
            const result = await CompressionUtil.compressiblePost(
                headers,
                smallPayload,
                url
            );
            assert.strictEqual(fetchStub.calledOnce, true);
            const [calledUrl, options] = fetchStub.firstCall.args;
            assert.strictEqual(calledUrl, url);
            assert.strictEqual(options.method, "POST");
            assert.strictEqual(options.headers["Content-Encoding"], undefined);
            assert.strictEqual(options.headers["Content-Type"], "application/json");
            assert.strictEqual(typeof options.body, "string");
            assert.strictEqual(result, mockResponse);
        });

        it("should work without logger parameter", async () => {
            const largeData = "x".repeat(1100);
            const largePayload = { data: largeData };
            const headers = { "Content-Type": "application/json" };
            const url = new URL("https://api.example.com/test");
            const mockResponse = { ok: true, status: 200 };
            fetchStub.resolves(mockResponse);
            const result = await CompressionUtil.compressiblePost(
                headers,
                largePayload,
                url
            );
            assert.strictEqual(fetchStub.calledOnce, true);
            const [, options] = fetchStub.firstCall.args;
            assert.strictEqual(options.headers["Content-Encoding"], "gzip");
            assert.strictEqual(result, mockResponse);
        });

        it("should handle serialization errors gracefully", async () => {
            const circularPayload: any = {};
            circularPayload.self = circularPayload;
            const headers = { "Content-Type": "application/json" };
            const url = new URL("https://api.example.com/test");
            await assert.rejects(
                async () =>
                    await CompressionUtil.compressiblePost(headers, circularPayload, url),
                TypeError
            );
            assert.strictEqual(fetchStub.called, false);
        });

        it("should throw error when compression fails on large payload", async () => {
            const largeData = "x".repeat(PAYLOAD_LIMIT + 100);
            const largePayload = { data: largeData };
            const headers = { "Content-Type": "application/json" };
            const url = new URL("https://api.example.com/test");
            const zlib = require("node:zlib");
            const gzipSyncStub = sinon.stub(zlib, "gzipSync").throws(new Error("Compression failed"));
            try {
                await assert.rejects(
                    async () =>
                        await CompressionUtil.compressiblePost(
                            headers,
                            largePayload,
                            url,
                            PAYLOAD_LIMIT
                        ),
                    Error
                );
                assert.strictEqual(fetchStub.called, false);
            } finally {
                gzipSyncStub.restore();
            }
        });

        it("should not modify original headers object", async () => {
            const originalHeaders: any = { "Content-Type": "application/json" };
            const payload = { test: "data" };
            const url = new URL("https://api.example.com/test");
            const mockResponse = { ok: true, status: 200 };
            fetchStub.resolves(mockResponse);
            await CompressionUtil.compressiblePost(originalHeaders, payload, url);
            assert.strictEqual(originalHeaders["Content-Encoding"], undefined);
        });

        it("should handle null logger gracefully during compression", async () => {
            const largeData = "x".repeat(PAYLOAD_LIMIT + 100);
            const largePayload = { data: largeData };
            const headers = { "Content-Type": "application/json" };
            const url = new URL("https://api.example.com/test");
            const mockResponse = { ok: true, status: 200 };
            fetchStub.resolves(mockResponse);
            await CompressionUtil.compressiblePost(
                headers,
                largePayload,
                url,
                PAYLOAD_LIMIT
            );
            const [, options] = fetchStub.firstCall.args;
            assert.strictEqual(options.headers["Content-Encoding"], "gzip");
        });

        it("should preserve all headers when making request", async () => {
            const payload = { test: "data" };
            const headers = {
                "Content-Type": "application/json",
                Authorization: "Bearer token",
                "X-Custom-Header": "value",
            };
            const url = new URL("https://api.example.com/test");
            const mockResponse = { ok: true, status: 200 };
            fetchStub.resolves(mockResponse);
            await CompressionUtil.compressiblePost(headers, payload, url);
            const [, options] = fetchStub.firstCall.args;
            assert.strictEqual(options.headers["Content-Type"], "application/json");
            assert.strictEqual(options.headers["Authorization"], "Bearer token");
            assert.strictEqual(options.headers["X-Custom-Header"], "value");
        });

        it("should preserve all headers when compressing", async () => {
            const largeData = "x".repeat(PAYLOAD_LIMIT + 100);
            const largePayload = { data: largeData };
            const headers = {
                "Content-Type": "application/json",
                Authorization: "Bearer token",
                "X-Custom-Header": "value",
            };
            const url = new URL("https://api.example.com/test");
            const mockResponse = { ok: true, status: 200 };
            fetchStub.resolves(mockResponse);
            await CompressionUtil.compressiblePost(headers, largePayload, url);
            const [, options] = fetchStub.firstCall.args;
            assert.strictEqual(options.headers["Content-Type"], "application/json");
            assert.strictEqual(options.headers["Authorization"], "Bearer token");
            assert.strictEqual(options.headers["X-Custom-Header"], "value");
            assert.strictEqual(options.headers["Content-Encoding"], "gzip");
        });

        it("should handle fetch errors gracefully", async () => {
            const payload = { test: "data" };
            const headers = { "Content-Type": "application/json" };
            const url = new URL("https://api.example.com/test");
            const fetchError = new Error("Network error");
            fetchStub.rejects(fetchError);
            await assert.rejects(
                async () =>
                    await CompressionUtil.compressiblePost(headers, payload, url),
                fetchError
            );
        });

        it("should return the exact Response object from fetch", async () => {
            const payload = { test: "data" };
            const headers = { "Content-Type": "application/json" };
            const url = new URL("https://api.example.com/test");
            const mockResponse = {
                ok: false,
                status: 500,
                statusText: "Internal Server Error",
                json: sinon.stub().resolves({ error: "Server error" }),
            };
            fetchStub.resolves(mockResponse);
            const result = await CompressionUtil.compressiblePost(
                headers,
                payload,
                url
            );
            assert.strictEqual(result, mockResponse);
            assert.strictEqual(result.ok, false);
            assert.strictEqual(result.status, 500);
        });

        it("should use default payload limit of 1024 bytes when not specified", async () => {
            const exactLimitData = "x".repeat(1013);
            const exactLimitPayload = { data: exactLimitData };
            const headers = { "Content-Type": "application/json" };
            const url = new URL("https://api.example.com/test");
            const mockResponse = { ok: true, status: 200 };
            fetchStub.resolves(mockResponse);
            await CompressionUtil.compressiblePost(headers, exactLimitPayload, url);
            const [, options] = fetchStub.firstCall.args;
            assert.strictEqual(options.headers["Content-Encoding"], undefined);
        });

        it("should compress when payload exceeds default 1024 bytes", async () => {
            const overLimitData = "x".repeat(1030);
            const overLimitPayload = { data: overLimitData };
            const headers = { "Content-Type": "application/json" };
            const url = new URL("https://api.example.com/test");
            const mockResponse = { ok: true, status: 200 };
            fetchStub.resolves(mockResponse);
            await CompressionUtil.compressiblePost(headers, overLimitPayload, url);
            const [, options] = fetchStub.firstCall.args;
            assert.strictEqual(options.headers["Content-Encoding"], "gzip");
        });

        it("should use custom payload limit when specified", async () => {
            const customLimit = 2048;
            const dataUnderCustomLimit = "x".repeat(2000);
            const payloadUnderCustomLimit = { data: dataUnderCustomLimit };
            const headers = { "Content-Type": "application/json" };
            const url = new URL("https://api.example.com/test");
            const mockResponse = { ok: true, status: 200 };
            fetchStub.resolves(mockResponse);
            await CompressionUtil.compressiblePost(
                headers,
                payloadUnderCustomLimit,
                url,
                customLimit
            );
            const [, options] = fetchStub.firstCall.args;
            assert.strictEqual(options.headers["Content-Encoding"], undefined);
        });

        it("should compress when payload exceeds custom limit", async () => {
            const customLimit = 512;
            const dataOverCustomLimit = "x".repeat(600);
            const payloadOverCustomLimit = { data: dataOverCustomLimit };
            const headers = { "Content-Type": "application/json" };
            const url = new URL("https://api.example.com/test");
            const mockResponse = { ok: true, status: 200 };
            fetchStub.resolves(mockResponse);
            await CompressionUtil.compressiblePost(
                headers,
                payloadOverCustomLimit,
                url,
                customLimit
            );
            const [, options] = fetchStub.firstCall.args;
            assert.strictEqual(options.headers["Content-Encoding"], "gzip");
        });

        it("should handle payload exactly at limit boundary", async () => {
            const exactLimitData = "x".repeat(PAYLOAD_LIMIT - 12);
            const exactLimitPayload = { data: exactLimitData };
            const headers = { "Content-Type": "application/json" };
            const url = new URL("https://api.example.com/test");
            const mockResponse = { ok: true, status: 200 };
            fetchStub.resolves(mockResponse);
            await CompressionUtil.compressiblePost(headers, exactLimitPayload, url);
            const [, options] = fetchStub.firstCall.args;
            assert.strictEqual(options.headers["Content-Encoding"], undefined);
        });

        it("should compress payload just over limit", async () => {
            const overLimitData = "x".repeat(PAYLOAD_LIMIT + 1);
            const overLimitPayload = { data: overLimitData };
            const headers = { "Content-Type": "application/json" };
            const url = new URL("https://api.example.com/test");
            const mockResponse = { ok: true, status: 200 };
            fetchStub.resolves(mockResponse);
            await CompressionUtil.compressiblePost(headers, overLimitPayload, url);
            const [, options] = fetchStub.firstCall.args;
            assert.strictEqual(options.headers["Content-Encoding"], "gzip");
        });

        it("should respect different payload limits", async () => {
            const customLimit = 512;
            const mediumData = "x".repeat(600);
            const mediumPayload = { data: mediumData };
            const headers = { "Content-Type": "application/json" };
            const url = new URL("https://api.example.com/test");
            const mockResponse = { ok: true, status: 200 };
            fetchStub.resolves(mockResponse);
            await CompressionUtil.compressiblePost(
                headers,
                mediumPayload,
                url,
                customLimit
            );
            let [, options] = fetchStub.firstCall.args;
            assert.strictEqual(options.headers["Content-Encoding"], "gzip", "1");
            fetchStub.reset();
            fetchStub.resolves(mockResponse);
            const higherLimit = 2048;
            await CompressionUtil.compressiblePost(
                headers,
                mediumPayload,
                url,
                higherLimit
            );
            [, options] = fetchStub.firstCall.args;
            assert.strictEqual(options.headers["Content-Encoding"], "gzip", "2");
        });

        it("should handle zero payload limit", async () => {
            const payload = { test: "data" };
            const headers = { "Content-Type": "application/json" };
            const url = new URL("https://api.example.com/test");
            const mockResponse = { ok: true, status: 200 };
            fetchStub.resolves(mockResponse);
            await CompressionUtil.compressiblePost(headers, payload, url, 0);
            const [, options] = fetchStub.firstCall.args;
            assert.strictEqual(options.headers["Content-Encoding"], "gzip");
        });

        it("should handle very large payload limits", async () => {
            const largeLimit = 10 * 1024 * 1024; // 10MB
            const smallPayload = { test: "data" };
            const headers = { "Content-Type": "application/json" };
            const url = new URL("https://api.example.com/test");
            const mockResponse = { ok: true, status: 200 };
            fetchStub.resolves(mockResponse);
            await CompressionUtil.compressiblePost(
                headers,
                smallPayload,
                url,
                largeLimit
            );
            const [, options] = fetchStub.firstCall.args;
            assert.strictEqual(options.headers["Content-Encoding"], undefined);
        });
    });
});