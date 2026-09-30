import { inspect } from "node:util";
import { describe, expect, it } from "vitest";
import { ApiError, ConnectionError, PaymentsLk, type ClientOptions } from "../src/index.js";

// A made up key. SECRET is the part after the prefix, which must never be seen anywhere. The underscores keep it
// from looking like a live credential to secret scanners.
const SECRET = "fixture_secret_never_shown";
const KEY = `sk_test_${SECRET}`;

function client(answer: () => Promise<Response>, options: ClientOptions = {}): PaymentsLk {
  return new PaymentsLk(KEY, { apiBase: "https://api.example.lk", fetch: (async () => answer()) as typeof globalThis.fetch, sleep: async () => undefined, maxRetries: 0, ...options });
}

/** Every string reachable from a value through its own properties: enumerable or not, string or symbol keyed, and its prototypes' too. */
function reachableStrings(root: unknown): string[] {
  const seen = new Set<unknown>();
  const strings: string[] = [];
  const visit = (value: unknown): void => {
    if (typeof value === "string") strings.push(value);
    if ((typeof value !== "object" && typeof value !== "function") || value === null || seen.has(value)) return;
    seen.add(value);
    // The language's own prototypes lead nowhere this library wrote, and their accessors throw off an instance.
    if (value === Object.prototype || value === Function.prototype || value === Error.prototype) return;
    for (const key of Reflect.ownKeys(value)) {
      const property = Object.getOwnPropertyDescriptor(value, key);
      if (property && "value" in property) visit(property.value);
    }
    visit(Object.getPrototypeOf(value));
  };
  visit(root);
  return strings;
}

function expectNoSecret(what: string, text: string): void {
  expect(text.includes(SECRET), `${what} shows the secret key`).toBe(false);
}

describe("the secret key stays out of sight", () => {
  it("is in nothing console.log, util.inspect or JSON.stringify can print of the client", () => {
    const lk = client(async () => new Response("{}"));
    expectNoSecret("util.inspect", inspect(lk));
    expectNoSecret("util.inspect, every depth, hidden properties and getters", inspect(lk, { depth: Infinity, showHidden: true, getters: true, showProxy: true }));
    expectNoSecret("util.inspect of a resource", inspect(lk.checkouts, { depth: Infinity, showHidden: true }));
    expectNoSecret("JSON.stringify", JSON.stringify(lk));
    expectNoSecret("a template string", `${String(lk)} ${Object.prototype.toString.call(lk)}`);
    for (const text of reachableStrings(lk)) expectNoSecret("a property reachable from the client", text);
    // The walk above does reach the transport: it finds the API base.
    expect(reachableStrings(lk)).toContain("https://api.example.lk");
  });

  it("still signs every request with it", async () => {
    let sent: string | null = null;
    const lk = new PaymentsLk(KEY, {
      apiBase: "https://api.example.lk",
      fetch: (async (_url: string | URL | Request, init?: RequestInit) => {
        sent = (init?.headers as Record<string, string>)["authorization"] ?? null;
        return new Response(JSON.stringify({ object: "list", data: [], hasMore: false, nextCursor: null }));
      }) as typeof globalThis.fetch,
    });
    await lk.payments.list();
    expect(sent).toBe(`Bearer ${KEY}`);
  });

  it("is in no error the library throws: refusals, failed connections, a bad answer, a bad key", async () => {
    const thrown: unknown[] = [];
    const attempt = async (run: () => unknown) => {
      try {
        await run();
      } catch (error) {
        thrown.push(error);
        return;
      }
      throw new Error("expected an error");
    };
    await attempt(() => client(async () => new Response(JSON.stringify({ code: "UNAUTHENTICATED", message: "That key is not valid.", traceId: "t-1" }), { status: 401 })).payments.list());
    await attempt(() => client(async () => new Response("<html>bad gateway</html>", { status: 502 })).account.retrieve());
    await attempt(() => client(async () => new Response("not json", { status: 200 })).account.retrieve());
    await attempt(() =>
      client(async () => {
        throw new TypeError("fetch failed", { cause: new Error("connect ECONNREFUSED 127.0.0.1:443") });
      }).checkouts.create({ amountCents: 145_000, description: "Chicken kottu" }),
    );
    await attempt(() => new PaymentsLk(`${KEY} with a space`));
    await attempt(() => new PaymentsLk(KEY, { apiBase: "http://api.example.lk" }));

    expect(thrown).toHaveLength(6);
    expect(thrown[0]).toBeInstanceOf(ApiError);
    expect(thrown[3]).toBeInstanceOf(ConnectionError);
    for (const error of thrown) {
      expectNoSecret("util.inspect of an error", inspect(error, { depth: Infinity, showHidden: true, getters: true }));
      expectNoSecret("JSON.stringify of an error", JSON.stringify(error) ?? "");
      expectNoSecret("an error's message and stack", `${(error as Error).message}\n${(error as Error).stack ?? ""}`);
      for (const text of reachableStrings(error)) expectNoSecret("a property reachable from an error", text);
    }
  });
});
