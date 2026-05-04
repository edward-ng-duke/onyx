import { parseSSE } from "./sse-parser";

function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const it = chunks.values();
  return new ReadableStream({
    pull(controller) {
      const { value, done } = it.next();
      if (done) controller.close();
      else controller.enqueue(enc.encode(value));
    },
  });
}

describe("parseSSE", () => {
  it("yields meta then chunk then done", async () => {
    const stream = streamFromChunks([
      'event: meta\ndata: {"request_id":"r1"}\n\n',
      'event: chunk\ndata: {"text":"hi"}\n\n',
      'event: done\ndata: {"answer":"hi","sources":[]}\n\n',
    ]);
    const events: { event: string; data: any }[] = [];
    for await (const e of parseSSE(stream)) events.push(e);
    expect(events.map((e) => e.event)).toEqual(["meta", "chunk", "done"]);
    expect(events[2].data.answer).toBe("hi");
  });

  it("ignores keepalive comments", async () => {
    const stream = streamFromChunks([
      ": keepalive\n\n",
      'event: chunk\ndata: {"text":"x"}\n\n',
    ]);
    const events: any[] = [];
    for await (const e of parseSSE(stream)) events.push(e);
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe("chunk");
  });

  it("handles a frame split across chunks", async () => {
    const stream = streamFromChunks([
      "event: chunk\nda",
      'ta: {"text":"split"}\n\n',
    ]);
    const events: any[] = [];
    for await (const e of parseSSE(stream)) events.push(e);
    expect(events[0].data.text).toBe("split");
  });
});
