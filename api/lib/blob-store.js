import { BlobPreconditionFailedError, get, head, put } from "@vercel/blob";
import { validateState } from "../../docs/lib/model.js";

export const STATE_PATH = "state.json";

export function createBlobStateStore({ getBlob = get, headBlob = head, putBlob = put } = {}) {
  return {
    async read() {
      const [blob, metadata] = await Promise.all([
        getBlob(STATE_PATH, { access: "private", useCache: false }),
        headBlob(STATE_PATH),
      ]);
      if (!blob?.stream) throw new Error("state.json bulunamadı.");
      const state = validateState(JSON.parse(await new Response(blob.stream).text()));
      return { state, etag: metadata.etag };
    },

    async write(state, { ifMatch }) {
      try {
        const next = validateState(state);
        const blob = await putBlob(STATE_PATH, `${JSON.stringify(next, null, 2)}\n`, {
          access: "private",
          allowOverwrite: true,
          contentType: "application/json",
          cacheControlMaxAge: 60,
          ifMatch,
        });
        return { state: next, etag: blob.etag };
      } catch (error) {
        if (error instanceof BlobPreconditionFailedError) {
          error.code = "BLOB_PRECONDITION_FAILED";
        }
        throw error;
      }
    },
  };
}
