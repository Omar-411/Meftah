import type { Database } from "../src/infrastructure/persistence/database";
import { MemoryDatabase } from "../src/infrastructure/persistence/memory-database";
import { MongoDatabase } from "../src/infrastructure/persistence/mongo-database";

/** The same behaviour is required from every adapter. The Mongo run is opt-in: MONGODB_TEST_URI=mongodb://localhost:27017 npm test */
const adapters: Array<[string, () => Promise<Database>]> = [["memory", async () => new MemoryDatabase()]];
if (process.env.MONGODB_TEST_URI) {
  adapters.push(["mongo", () => MongoDatabase.connect(process.env.MONGODB_TEST_URI as string, `darcrm_test_${Date.now()}`)]);
}

describe.each(adapters)("Database contract (%s)", (_name, create) => {
  let db: Database;
  beforeAll(async () => {
    db = await create();
  });
  afterAll(async () => {
    await db.close();
  });

  it("stores, reads, overwrites and removes documents by id", async () => {
    const leads = db.collection<{ id: string; name: string }>("leads");
    await leads.put({ id: "a", name: "first" });
    await leads.put({ id: "a", name: "second" });
    expect(await leads.get("a")).toEqual({ id: "a", name: "second" });
    expect(await leads.all()).toHaveLength(1);
    await leads.remove("a");
    expect(await leads.get("a")).toBeNull();
  });

  it("returns copies, so callers cannot mutate stored state", async () => {
    const agents = db.collection<{ id: string; tags: string[] }>("agents");
    await agents.put({ id: "x", tags: ["one"] });
    const read = await agents.get("x");
    read?.tags.push("two");
    expect((await agents.get("x"))?.tags).toEqual(["one"]);
  });

  it("increments counters atomically and never lowers them on ensureCounter", async () => {
    await db.ensureCounter("ref", 1000);
    await db.ensureCounter("ref", 5);
    const values = await Promise.all([db.nextCounter("ref", 1000), db.nextCounter("ref", 1000), db.nextCounter("ref", 1000)]);
    expect([...values].sort()).toEqual([1001, 1002, 1003]);
  });

  it("reset removes every document and counter", async () => {
    await db.collection<{ id: string }>("deals").put({ id: "d1" });
    await db.reset();
    expect(await db.collection("deals").all()).toEqual([]);
    expect(await db.nextCounter("ref", 1000)).toBe(1001);
  });
});
