// repros/streaming-protocol.ts
// Executed reproduction for streaming-protocol defects D1 (double storage) and
// D2 (processIncremental-with-parseIncremental never persists to store).
import { StreamingProtocol } from 'C:/0-BlackBoxProject-0/vivim-final/src/engines/streaming-protocol.ts'

type Block = { type: string; text: string }

class FakeStore {
  calls: { conversationId: string; messageId: string; blocks: unknown[] }[] = []
  async storeBlocks(conversationId: string, messageId: string, blocks: unknown[]) {
    this.calls.push({ conversationId, messageId, blocks })
  }
  totalBlocksStored() {
    return this.calls.reduce((n, c) => n + c.blocks.length, 0)
  }
}

function block(text: string): Block {
  return { type: 'text', text }
}

// Parser that supports BOTH parse() and parseIncremental()
class DualParser {
  parse(raw: string): Block[] {
    return [block(raw)]
  }
  async *parseIncremental(chunks: AsyncIterable<string>): AsyncIterable<Block[]> {
    for await (const c of chunks) {
      yield [block(c)]
    }
  }
}

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.log(`FAIL: ${msg}`)
    process.exit(1)
  }
  console.log(`PASS  ${msg}`)
}

async function main() {
  const conv = 'conv_1'
  const msg = 'msg_1'

  // ── FIX: each block stored exactly once ──────────────────────────────
  {
    const store = new FakeStore()
    const sp = new StreamingProtocol(new DualParser(), store)
    await sp.startConversation(conv)
    await sp.captureChunk(conv, msg, 'A')
    await sp.captureChunk(conv, msg, 'B')
    await sp.finishConversation(conv, msg)

    // 2 real blocks -> stored once each (captureChunk); finish must NOT re-store.
    const total = store.totalBlocksStored()
    assert(
      total === 2,
      `FIX: 2 real blocks persisted ${total} times (was 4 = duplicated)`,
    )
    assert(
      store.calls.length === 2 &&
        store.calls[0].blocks.length === 1 &&
        store.calls[1].blocks.length === 1,
      'FIX: store called once per chunk (finish no longer re-stores)',
    )
  }

  // ── FIX: processIncremental (parseIncremental path) persists blocks ───
  {
    const store = new FakeStore()
    const sp = new StreamingProtocol(new DualParser(), store)
    await sp.startConversation(conv)
    await sp.processIncremental(
      conv,
      msg,
      (async function* () {
        yield 'X'
        yield 'Y'
      })(),
    )
    // With parseIncremental present, blocks are emitted AND persisted.
    assert(
      store.totalBlocksStored() === 2,
      `FIX: processIncremental(parser.parseIncremental) stored ${store.totalBlocksStored()} blocks (was 0)`,
    )
    // And the shared buffer is left empty, but blocks are already persisted.
    const fin = await sp.finishConversation(conv, msg)
    assert(
      fin.length === 0,
      'FIX: finishConversation after parseIncremental sees empty buffer (0 blocks)',
    )
    assert(
      store.totalBlocksStored() === 2,
      'FIX: blocks persisted exactly once across incremental capture + finish',
    )
  }

  console.log('\nALL PASS (streaming-protocol fix verified)')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
