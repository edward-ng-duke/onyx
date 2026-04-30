import type { Locale } from "../../../next-intl.config";

const setMock = jest.fn();
jest.mock("next/headers", () => ({
  cookies: jest.fn(async () => ({ set: setMock })),
}));

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

async function loadAction(): Promise<
  (locale: Locale) => Promise<void>
> {
  jest.resetModules();
  const mod = await import("./setLocaleAction");
  return mod.setLocaleCookieAction;
}

describe("setLocaleCookieAction", () => {
  beforeEach(() => {
    setMock.mockClear();
  });

  afterEach(() => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: ORIGINAL_NODE_ENV,
      configurable: true,
    });
  });

  it("writes NEXT_LOCALE for a supported locale (zh)", async () => {
    const action = await loadAction();
    await action("zh");
    expect(setMock).toHaveBeenCalledTimes(1);
    const [name, value, opts] = setMock.mock.calls[0];
    expect(name).toBe("NEXT_LOCALE");
    expect(value).toBe("zh");
    expect(opts).toMatchObject({
      path: "/",
      sameSite: "lax",
      httpOnly: false,
    });
    expect(opts.maxAge).toBe(60 * 60 * 24 * 365);
  });

  it("writes NEXT_LOCALE for the default locale (en)", async () => {
    const action = await loadAction();
    await action("en");
    expect(setMock).toHaveBeenCalledTimes(1);
    expect(setMock.mock.calls[0][1]).toBe("en");
  });

  it("silently no-ops for an unsupported locale", async () => {
    const action = await loadAction();
    // Force the type cast — this simulates a hostile RPC where the type
    // guarantee has been erased at the wire boundary.
    await action("fr" as Locale);
    expect(setMock).not.toHaveBeenCalled();
  });

  it("sets secure=true when NODE_ENV=production", async () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      configurable: true,
    });
    const action = await loadAction();
    await action("en");
    expect(setMock.mock.calls[0][2].secure).toBe(true);
  });

  it("sets secure=false in non-production environments", async () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "development",
      configurable: true,
    });
    const action = await loadAction();
    await action("en");
    expect(setMock.mock.calls[0][2].secure).toBe(false);
  });
});
