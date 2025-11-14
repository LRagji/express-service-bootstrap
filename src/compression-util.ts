import * as zlib from "node:zlib";

export class CompressionUtil {
    public static async compressiblePost(headers: Record<string, string>, body: any, url: URL, payloadLimit: number = 1024): Promise<Response> {
        const payloadString = JSON.stringify(body);
        const payloadSize = Buffer.byteLength(payloadString, "utf8");

        if (payloadSize > payloadLimit) {
            const compressedPayload = zlib.gzipSync(payloadString);
            headers["Content-Encoding"] = "gzip";
            body = compressedPayload;
        } else {
            body = payloadString;
        }

        return await fetch(url, {
            method: "POST",
            headers: headers,
            body: body
        });
    }
}