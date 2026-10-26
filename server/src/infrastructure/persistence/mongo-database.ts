import { MongoClient, type Collection as MongoCollectionType, type Db } from "mongodb";
import { COLLECTIONS, type Collection, type CollectionName, type Database } from "./database";

type StoredDocument = { _id: string } & Record<string, unknown>;

class MongoDocumentCollection<T extends { readonly id: string }> implements Collection<T> {
  constructor(private readonly collection: MongoCollectionType<StoredDocument>) {}

  private static fromStored<T extends { readonly id: string }>({ _id, ...rest }: StoredDocument): T {
    return { id: _id, ...rest } as unknown as T;
  }

  async all() {
    const documents = await this.collection.find({}).toArray();
    return documents.map((document) => MongoDocumentCollection.fromStored<T>(document));
  }

  async get(id: string) {
    const document = await this.collection.findOne({ _id: id });
    return document ? MongoDocumentCollection.fromStored<T>(document) : null;
  }

  async put({ id, ...rest }: T) {
    await this.collection.replaceOne({ _id: id }, { _id: id, ...rest } as StoredDocument, { upsert: true });
  }

  async remove(id: string) {
    await this.collection.deleteOne({ _id: id });
  }
}

/**
 * MongoDB adapter. Documents are stored with `_id = id`.
 * Repositories currently filter in memory, which is fine for a single agency (thousands of documents).
 * When a collection grows, push the filter into the repository query: the repository interfaces do not change.
 */
export class MongoDatabase implements Database {
  private constructor(
    private readonly client: MongoClient,
    private readonly db: Db,
  ) {}

  static async connect(uri: string, databaseName: string): Promise<MongoDatabase> {
    const client = await new MongoClient(uri, { serverSelectionTimeoutMS: 8_000 }).connect();
    const database = new MongoDatabase(client, client.db(databaseName));
    await database.db.collection("credentials").createIndex({ email: 1 }, { unique: true });
    await database.db.collection("listings").createIndex({ slug: 1 }, { unique: true });
    await database.db.collection("listings").createIndex({ ref: 1 }, { unique: true });
    return database;
  }

  collection<T extends { readonly id: string }>(name: CollectionName): Collection<T> {
    return new MongoDocumentCollection<T>(this.db.collection<StoredDocument>(name));
  }

  async nextCounter(name: string, initial: number) {
    const result = await this.db
      .collection<{ _id: string; value: number }>("counters")
      .findOneAndUpdate({ _id: name }, [{ $set: { value: { $add: [{ $ifNull: ["$value", initial] }, 1] } } }], { upsert: true, returnDocument: "after" });
    if (!result) throw new Error(`Compteur introuvable : ${name}`);
    return result.value;
  }

  async ensureCounter(name: string, value: number) {
    await this.db.collection<{ _id: string; value: number }>("counters").updateOne({ _id: name }, { $setOnInsert: { value } }, { upsert: true });
  }

  async reset() {
    for (const name of [...COLLECTIONS, "counters"]) await this.db.collection(name).deleteMany({});
  }

  async close() {
    await this.client.close();
  }
}
