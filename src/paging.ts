import type { List, ListParams } from "./types.js";

/** An id for a path segment: refused when empty, encoded otherwise. */
export function segment(value: string, what: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`Pass ${what} id.`);
  return encodeURIComponent(value);
}

/** Every item of a list, reading page after page as the caller iterates. */
export async function* pages<T, P extends ListParams>(list: (params: P) => Promise<List<T>>, params: P): AsyncGenerator<T> {
  let cursor = params.cursor;
  for (;;) {
    const page = await list({ ...params, cursor });
    yield* page.data;
    if (!page.hasMore || !page.nextCursor) return;
    cursor = page.nextCursor;
  }
}
