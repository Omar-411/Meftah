import type { AccountRepository } from "../../../application/ports";
import type { AlertDispatch, SavedSearch } from "../../../domain/account/account";
import type { Collection, Database } from "../database";

interface Favorite {
  readonly id: string;
  readonly userId: string;
  readonly listingId: string;
}

export class CollectionAccountRepository implements AccountRepository {
  private readonly favorites: Collection<Favorite>;
  private readonly searches: Collection<SavedSearch>;
  private readonly alerts: Collection<AlertDispatch>;
  constructor(db: Database) {
    this.favorites = db.collection<Favorite>("favorites");
    this.searches = db.collection<SavedSearch>("savedSearches");
    this.alerts = db.collection<AlertDispatch>("alerts");
  }

  async listFavoriteIds(userId: string) {
    return (await this.favorites.all()).filter((favorite) => favorite.userId === userId).map((favorite) => favorite.listingId);
  }
  async addFavorite(userId: string, listingId: string) {
    await this.favorites.put({ id: `${userId}:${listingId}`, userId, listingId });
  }
  async removeFavorite(userId: string, listingId: string) {
    await this.favorites.remove(`${userId}:${listingId}`);
  }

  async listSavedSearches(userId: string) {
    return (await this.searches.all()).filter((search) => search.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  listAllSavedSearches() {
    return this.searches.all();
  }
  async saveSearch(search: SavedSearch) {
    await this.searches.put(search);
  }
  async deleteSearch(userId: string, searchId: string) {
    const found = await this.searches.get(searchId);
    if (found?.userId === userId) await this.searches.remove(searchId);
  }

  async listAlerts(userId: string) {
    return (await this.alerts.all()).filter((alert) => alert.userId === userId).sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  }
  async recordAlert(alert: AlertDispatch) {
    await this.alerts.put(alert);
  }
}
