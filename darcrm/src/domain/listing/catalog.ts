export type TransactionType = "sale" | "rent";
export type PropertyType = "apartment" | "villa" | "duplex" | "penthouse" | "land" | "office";
export type ListingStatus = "available" | "reserved" | "closed";
export type Visibility = "draft" | "published";
export type MandateType = "exclusive" | "simple";

export const TRANSACTION_LABELS: Record<TransactionType, string> = {
  sale: "Vente",
  rent: "Location",
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: "Appartement",
  villa: "Villa / Maison",
  duplex: "Duplex",
  penthouse: "Penthouse",
  land: "Terrain",
  office: "Bureaux / Commercial",
};

export const MANDATE_LABELS: Record<MandateType, string> = {
  exclusive: "Mandat exclusif",
  simple: "Mandat simple",
};

/** "available" etc. are what the agent edits; closed = sold or rented depending on the transaction. */
export function statusLabel(status: ListingStatus, transaction: TransactionType): string {
  if (status === "available") return "Disponible";
  if (status === "reserved") return "Réservé";
  return transaction === "sale" ? "Vendu" : "Loué";
}

export const ROOMS_OPTIONS = [1, 2, 3, 4, 5] as const;

export const roomsLabel = (rooms: number) => `S+${rooms}`;

export interface Amenity {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
}

export const AMENITIES: readonly Amenity[] = [
  { id: "terrace", label: "Terrasse", icon: "deck" },
  { id: "parking", label: "Parking", icon: "garage" },
  { id: "elevator", label: "Ascenseur", icon: "elevator" },
  { id: "ac", label: "Climatisation", icon: "mode_fan" },
  { id: "pool", label: "Piscine", icon: "pool" },
  { id: "security", label: "Gardiennage 24/7", icon: "shield" },
  { id: "garden", label: "Jardin privatif", icon: "yard" },
  { id: "sea-view", label: "Vue mer", icon: "waves" },
  { id: "heating", label: "Chauffage central", icon: "heat_pump" },
  { id: "dressing", label: "Dressing", icon: "checkroom" },
  { id: "intercom", label: "Visiophone", icon: "videocam" },
  { id: "fireplace", label: "Cheminée", icon: "fireplace" },
];

export function findAmenity(id: string): Amenity | undefined {
  return AMENITIES.find((amenity) => amenity.id === id);
}
