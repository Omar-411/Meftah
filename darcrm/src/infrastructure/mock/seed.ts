import type { PublicUser, SavedSearch } from "@/domain/account/account";
import type { Agent } from "@/domain/agent/agent";
import type { Appointment } from "@/domain/appointment/appointment";
import type { Deal } from "@/domain/deal/deal";
import type { ListingStatus, PropertyType, TransactionType, Visibility } from "@/domain/listing/catalog";
import type { Listing, ListingPhoto } from "@/domain/listing/listing";
import type { Activity, ActivityKind, Lead, LeadSource, LeadStage, SearchCriteria } from "@/domain/lead/lead";
import { slugify, toDateKey } from "@/domain/shared/format";
import type { Task } from "@/domain/task/task";
import {
  AGENT_AVATAR,
  FEATURED_BERGES,
  FEATURED_GAMMARTH,
  FEATURED_LA_MARSA,
  PHOTO_BATHROOM,
  PHOTO_BEDROOM,
  PHOTO_KITCHEN,
  PHOTO_LIVING_ROOM,
  PHOTO_TERRACE,
} from "../mock-assets";
import type { MockStore } from "./store";

const AGENCY_ID = "agency_1";
const ADMIN_ID = "agent_nadia";
const SAMI_ID = "agent_sami";
const LEILA_ID = "agent_leila";
const VISITOR_ID = "user_amine";

const PHOTO_POOL: ReadonlyArray<{ url: string; alt: string; name: string }> = [
  { url: PHOTO_LIVING_ROOM, alt: "Salon lumineux avec baie vitrée", name: "Salon" },
  { url: PHOTO_TERRACE, alt: "Terrasse avec salon d'extérieur", name: "Terrasse" },
  { url: PHOTO_KITCHEN, alt: "Cuisine moderne équipée", name: "Cuisine" },
  { url: PHOTO_BEDROOM, alt: "Chambre parentale avec dressing", name: "Chambre" },
  { url: PHOTO_BATHROOM, alt: "Salle de bain en marbre", name: "Salle de bain" },
  { url: FEATURED_LA_MARSA, alt: "Séjour avec accès terrasse", name: "Séjour" },
  { url: FEATURED_GAMMARTH, alt: "Vue panoramique sur la baie", name: "Vue" },
  { url: FEATURED_BERGES, alt: "Cuisine ouverte sur salle à manger", name: "Cuisine ouverte" },
];

function photosFor(offset: number, count: number): ListingPhoto[] {
  return Array.from({ length: count }, (_, index) => {
    const photo = PHOTO_POOL[(offset + index) % PHOTO_POOL.length]!;
    return { id: `ph_${offset}_${index}`, fileName: `${photo.name}_${index + 1}.jpg`, url: photo.url, alt: photo.alt };
  });
}

const minutes = (now: Date, offsetMin: number) => new Date(now.getTime() + offsetMin * 60_000).toISOString();
const days = (now: Date, offsetDays: number) => minutes(now, offsetDays * 1440);

function at(now: Date, dayOffset: number, hour: number, minute = 0): string {
  const date = new Date(now);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

interface ListingSeed {
  n: number;
  agentId: string;
  transaction: TransactionType;
  propertyType: PropertyType;
  status?: ListingStatus;
  visibility?: Visibility;
  title: string;
  price: number;
  cityId: string;
  district: string;
  address: string;
  builtArea: number;
  terraceArea?: number;
  rooms: number;
  bathrooms?: number;
  floor?: string;
  amenities: string[];
  photoOffset: number;
  photoCount?: number;
  owner: [string, string];
  notes?: string;
  mandate?: "exclusive" | "simple";
  ageDays: number;
}

function buildListing(seed: ListingSeed, now: Date): Listing {
  const ref = `REF-${1000 + seed.n}`;
  const visibility = seed.visibility ?? "published";
  const created = days(now, -seed.ageDays);
  const description =
    seed.propertyType === "land"
      ? `Terrain constructible de ${seed.builtArea} m² à ${seed.district}, titre bleu individuel, viabilisé, bien exposé. Idéal pour un projet résidentiel haut de gamme dans un secteur recherché.`
      : `${seed.title}. Bien de ${seed.builtArea} m² situé à ${seed.district}, dans un environnement calme et recherché. Séjour lumineux, finitions soignées, rangements, et prestations de qualité. Visite possible sur rendez-vous avec votre conseiller.`;

  return {
    id: `lst_${seed.n}`,
    ref,
    slug: `${slugify(seed.title)}-${ref.toLowerCase()}`,
    agencyId: AGENCY_ID,
    agentId: seed.agentId,
    transaction: seed.transaction,
    propertyType: seed.propertyType,
    status: seed.status ?? "available",
    visibility,
    title: seed.title,
    description,
    price: seed.price,
    hidePrice: false,
    condoFees: seed.propertyType === "apartment" ? 150 : 0,
    titleDeed: "Titre foncier individuel",
    cityId: seed.cityId,
    district: seed.district,
    address: seed.address,
    hideExactAddress: true,
    builtArea: seed.builtArea,
    terraceArea: seed.terraceArea ?? 0,
    rooms: seed.rooms,
    bedrooms: seed.propertyType === "land" || seed.propertyType === "office" ? 0 : seed.rooms,
    bathrooms: seed.bathrooms ?? Math.max(1, Math.ceil(seed.rooms / 2)),
    floorDescription: seed.floor ?? "",
    amenityIds: seed.amenities,
    photos: seed.photoCount === 0 ? [] : photosFor(seed.photoOffset, seed.photoCount ?? 5),
    internal: {
      ownerName: seed.owner[0],
      ownerPhone: seed.owner[1],
      notes: seed.notes ?? "",
      commissionRate: 3,
      mandateType: seed.mandate ?? "exclusive",
      mandateNumber: `EX-2026-${seed.n}`,
      mandateExpiry: "15 Jan 2027",
      keysLocation: "Agence La Marsa (casier B" + seed.n + ")",
    },
    createdAt: created,
    updatedAt: created,
    publishedAt: visibility === "published" ? created : null,
  };
}

function criteria(partial: Partial<SearchCriteria> & Pick<SearchCriteria, "transaction">): SearchCriteria {
  return { propertyTypes: [], cityIds: [], ...partial };
}

interface LeadSeed {
  n: number;
  agentId: string;
  fullName: string;
  phone: string;
  source: LeadSource;
  stage: LeadStage;
  listingId?: string;
  message?: string;
  criteria: SearchCriteria;
  ageDays: number;
  lastContactDays?: number;
  lostReason?: string;
}

function buildLead(seed: LeadSeed, now: Date): Lead {
  return {
    id: `lead_${seed.n}`,
    agencyId: AGENCY_ID,
    agentId: seed.agentId,
    fullName: seed.fullName,
    phone: seed.phone,
    email: `${slugify(seed.fullName).replace(/-/g, ".")}@example.tn`,
    source: seed.source,
    stage: seed.stage,
    lostReason: seed.lostReason ?? null,
    listingId: seed.listingId ?? null,
    message: seed.message ?? "",
    criteria: seed.criteria,
    createdAt: days(now, -seed.ageDays),
    updatedAt: days(now, -(seed.lastContactDays ?? seed.ageDays)),
    lastContactAt: seed.lastContactDays === undefined ? null : days(now, -seed.lastContactDays),
  };
}

export function createSeed(now: Date): MockStore {
  const agents: Agent[] = [
    {
      id: ADMIN_ID, agencyId: AGENCY_ID, role: "admin", fullName: "Nadia Ben Salem", firstName: "Nadia",
      jobTitle: "Directrice d'agence", avatarUrl: "", phone: "71 860 100", whatsapp: "+216 71 860 100",
      email: "admin@darcrm.tn", defaultCommissionRate: 3,
    },
    {
      id: SAMI_ID, agencyId: AGENCY_ID, role: "agent", fullName: "Sami Trabelsi", firstName: "Sami",
      jobTitle: "Conseiller immobilier", avatarUrl: AGENT_AVATAR, phone: "98 420 115", whatsapp: "+216 98 420 115",
      email: "sami@darcrm.tn", defaultCommissionRate: 3,
    },
    {
      id: LEILA_ID, agencyId: AGENCY_ID, role: "agent", fullName: "Leila Mansour", firstName: "Leila",
      jobTitle: "Conseillère immobilier", avatarUrl: "", phone: "22 314 890", whatsapp: "+216 22 314 890",
      email: "leila@darcrm.tn", defaultCommissionRate: 2.5,
    },
  ];

  const listingSeeds: ListingSeed[] = [
    { n: 1, agentId: SAMI_ID, transaction: "sale", propertyType: "apartment", title: "S+3 standing avec vaste terrasse et vue mer", price: 530_000, cityId: "la-marsa", district: "La Marsa Corniche", address: "Résidence Les Dunes, Avenue Habib Bourguiba", builtArea: 165, terraceArea: 32, rooms: 3, bathrooms: 2, floor: "3ème étage sur 4 (avec ascenseur)", amenities: ["terrace", "parking", "elevator", "ac", "security", "sea-view", "heating", "dressing", "intercom"], photoOffset: 0, owner: ["M. Farhat Ben Amor", "98 221 004"], notes: "Propriétaire flexible de 3 % sur le prix. Clés au casier B4.", ageDays: 12 },
    { n: 2, agentId: SAMI_ID, transaction: "sale", propertyType: "penthouse", title: "Penthouse vue mer panoramique à Gammarth", price: 820_000, cityId: "gammarth", district: "Gammarth Supérieur", address: "Colline de Gammarth, Avenue de la République", builtArea: 210, terraceArea: 60, rooms: 4, bathrooms: 3, floor: "Dernier étage (ascenseur privatif)", amenities: ["terrace", "parking", "elevator", "ac", "pool", "security", "sea-view"], photoOffset: 1, owner: ["Mme Hela Karray", "22 410 880"], mandate: "simple", ageDays: 20 },
    { n: 3, agentId: SAMI_ID, transaction: "sale", propertyType: "apartment", status: "reserved", title: "S+2 neuf avec terrasse aux Berges du Lac", price: 410_000, cityId: "berges-du-lac", district: "Berges du Lac 2", address: "Résidence Les Jardins du Lac", builtArea: 118, terraceArea: 14, rooms: 2, floor: "2ème étage (ascenseur)", amenities: ["terrace", "parking", "elevator", "ac", "intercom"], photoOffset: 2, owner: ["Société Immobilière du Lac", "71 860 120"], ageDays: 30 },
    { n: 4, agentId: LEILA_ID, transaction: "sale", propertyType: "villa", title: "Villa contemporaine avec piscine à Carthage", price: 1_250_000, cityId: "carthage", district: "Carthage Byrsa", address: "Rue Hannibal", builtArea: 420, terraceArea: 80, rooms: 5, bathrooms: 4, amenities: ["terrace", "parking", "ac", "pool", "garden", "security", "heating", "fireplace"], photoOffset: 3, owner: ["Famille Bouzid", "55 220 330"], ageDays: 8 },
    { n: 5, agentId: LEILA_ID, transaction: "rent", propertyType: "duplex", title: "Duplex meublé avec vue sur la baie à Sidi Bou Saïd", price: 2_500, cityId: "sidi-bou-said", district: "Sidi Bou Saïd Village", address: "Rue Hédi Zarrouk", builtArea: 140, terraceArea: 25, rooms: 3, amenities: ["terrace", "ac", "sea-view", "parking"], photoOffset: 4, owner: ["M. Walid Jaziri", "50 441 220"], ageDays: 5 },
    { n: 6, agentId: SAMI_ID, transaction: "sale", propertyType: "villa", title: "Villa S+4 avec jardin à La Soukra", price: 780_000, cityId: "la-soukra", district: "La Soukra Chotrana", address: "Rue des Orangers", builtArea: 300, terraceArea: 40, rooms: 4, bathrooms: 3, amenities: ["garden", "parking", "ac", "security", "heating"], photoOffset: 5, owner: ["Mme Rim Slimani", "52 118 090"], ageDays: 15 },
    { n: 7, agentId: LEILA_ID, transaction: "rent", propertyType: "apartment", title: "S+2 lumineux à Ennasr II, proche commodités", price: 1_100, cityId: "ennasr", district: "Ennasr II", address: "Avenue de l'Environnement", builtArea: 95, rooms: 2, floor: "4ème étage (ascenseur)", amenities: ["elevator", "parking", "ac", "intercom"], photoOffset: 6, owner: ["M. Slim Ouertani", "98 332 441"], ageDays: 3 },
    { n: 8, agentId: LEILA_ID, transaction: "sale", propertyType: "apartment", visibility: "draft", title: "S+2 vue mer à Hammamet Nord", price: 340_000, cityId: "hammamet", district: "Hammamet Nord", address: "Route touristique", builtArea: 100, terraceArea: 12, rooms: 2, amenities: ["terrace", "pool", "sea-view"], photoOffset: 7, photoCount: 2, owner: ["M. Anis Chebbi", "27 880 190"], notes: "Photos professionnelles prévues jeudi, publier ensuite.", ageDays: 1 },
    { n: 9, agentId: SAMI_ID, transaction: "rent", propertyType: "office", title: "Plateau de bureaux de 80 m² au centre de Sousse", price: 1_800, cityId: "sousse", district: "Sousse Centre", address: "Boulevard Hédi Chaker", builtArea: 80, rooms: 3, bathrooms: 1, amenities: ["elevator", "ac", "parking"], photoOffset: 2, photoCount: 3, owner: ["Société Sahel Invest", "73 220 000"], ageDays: 25 },
    { n: 10, agentId: SAMI_ID, transaction: "sale", propertyType: "apartment", status: "closed", title: "S+2 rénové à La Marsa Plage", price: 395_000, cityId: "la-marsa", district: "La Marsa Plage", address: "Rue Ibn Khaldoun", builtArea: 110, rooms: 2, amenities: ["parking", "ac", "elevator"], photoOffset: 4, owner: ["Mme Sonia Fendri", "98 510 220"], ageDays: 70 },
    { n: 11, agentId: LEILA_ID, transaction: "rent", propertyType: "apartment", title: "S+3 haut standing aux Berges du Lac", price: 2_200, cityId: "berges-du-lac", district: "Berges du Lac 1", address: "Rue du Lac Biwa", builtArea: 150, terraceArea: 20, rooms: 3, amenities: ["terrace", "elevator", "parking", "ac", "security", "dressing"], photoOffset: 0, owner: ["M. Tarek Hamdi", "20 330 450"], ageDays: 9 },
    { n: 12, agentId: SAMI_ID, transaction: "sale", propertyType: "land", title: "Terrain constructible de 600 m² à La Marsa Nassim", price: 600_000, cityId: "la-marsa", district: "La Marsa Nassim", address: "Lotissement Nassim", builtArea: 600, rooms: 0, bathrooms: 0, amenities: ["sea-view"], photoOffset: 6, photoCount: 2, owner: ["M. Ridha Karoui", "55 700 321"], ageDays: 18 },
  ];

  const listings = listingSeeds.map((seed) => buildListing(seed, now));

  const leadSeeds: LeadSeed[] = [
    { n: 1, agentId: SAMI_ID, fullName: "Mohamed Ben Ali", phone: "98 420 115", source: "website", stage: "visit_scheduled", listingId: "lst_1", message: "Je souhaite visiter ce bien cette semaine.", criteria: criteria({ transaction: "sale", propertyTypes: ["apartment"], cityIds: ["la-marsa", "carthage"], budgetMax: 600_000, minRooms: 3 }), ageDays: 6, lastContactDays: 1 },
    { n: 2, agentId: SAMI_ID, fullName: "Inès Chahed", phone: "22 314 890", source: "phone", stage: "negotiating", listingId: "lst_2", message: "", criteria: criteria({ transaction: "sale", propertyTypes: ["penthouse", "apartment"], cityIds: ["gammarth", "la-marsa"], budgetMin: 700_000, budgetMax: 850_000 }), ageDays: 18, lastContactDays: 1 },
    { n: 3, agentId: SAMI_ID, fullName: "Karim Zghal", phone: "50 111 222", source: "portal", stage: "new", message: "Cherche une villa avec jardin, urgent.", criteria: criteria({ transaction: "sale", propertyTypes: ["villa"], cityIds: ["la-soukra", "la-marsa"], budgetMax: 800_000, minRooms: 4 }), ageDays: 0 },
    { n: 4, agentId: SAMI_ID, fullName: "Salma Ben Amor", phone: "50 123 456", source: "whatsapp", stage: "new", message: "Investissement locatif.", criteria: criteria({ transaction: "sale", propertyTypes: ["apartment"], cityIds: ["berges-du-lac"], budgetMax: 450_000, minRooms: 2 }), ageDays: 0 },
    { n: 5, agentId: SAMI_ID, fullName: "Tarak Mansouri", phone: "55 333 444", source: "referral", stage: "contacted", message: "", criteria: criteria({ transaction: "sale", propertyTypes: ["land"], cityIds: ["la-marsa"], budgetMax: 650_000, minArea: 500 }), ageDays: 9, lastContactDays: 5 },
    { n: 6, agentId: SAMI_ID, fullName: "Youssef Belhadj", phone: "29 640 100", source: "website", stage: "contacted", listingId: "lst_3", message: "Budget 450k, attente accord bancaire.", criteria: criteria({ transaction: "sale", propertyTypes: ["apartment"], cityIds: ["berges-du-lac", "ennasr"], budgetMax: 450_000, minRooms: 2 }), ageDays: 14, lastContactDays: 6 },
    { n: 7, agentId: LEILA_ID, fullName: "Leila Gharbi", phone: "93 551 020", source: "website", stage: "negotiating", listingId: "lst_4", message: "Intéressée par la villa de Carthage.", criteria: criteria({ transaction: "sale", propertyTypes: ["villa"], cityIds: ["carthage", "gammarth"], budgetMin: 900_000, budgetMax: 1_300_000, minRooms: 5 }), ageDays: 11, lastContactDays: 2 },
    { n: 8, agentId: LEILA_ID, fullName: "Hatem Dridi", phone: "97 220 330", source: "website", stage: "new", listingId: "lst_7", message: "Disponible dès le 1er du mois ?", criteria: criteria({ transaction: "rent", propertyTypes: ["apartment"], cityIds: ["ennasr"], budgetMax: 1_300, minRooms: 2 }), ageDays: 2 },
    { n: 9, agentId: LEILA_ID, fullName: "Amel Triki", phone: "54 410 770", source: "phone", stage: "visit_scheduled", listingId: "lst_5", message: "", criteria: criteria({ transaction: "rent", propertyTypes: ["duplex", "apartment"], cityIds: ["sidi-bou-said", "carthage"], budgetMax: 2_800, minRooms: 3 }), ageDays: 7, lastContactDays: 1 },
    { n: 10, agentId: LEILA_ID, fullName: "Bilel Sassi", phone: "21 880 140", source: "portal", stage: "lost", message: "", criteria: criteria({ transaction: "sale", cityIds: ["hammamet"], budgetMax: 250_000 }), ageDays: 40, lastContactDays: 20, lostReason: "Budget insuffisant pour la zone." },
    { n: 11, agentId: SAMI_ID, fullName: "Sonia Fendri (acquéreur)", phone: "98 510 221", source: "referral", stage: "closed", listingId: "lst_10", message: "", criteria: criteria({ transaction: "sale", propertyTypes: ["apartment"], cityIds: ["la-marsa"], budgetMax: 400_000 }), ageDays: 60, lastContactDays: 12 },
    { n: 12, agentId: LEILA_ID, fullName: "Walid Hajji", phone: "50 777 888", source: "website", stage: "closed", message: "", criteria: criteria({ transaction: "sale", cityIds: ["gammarth"] }), ageDays: 80, lastContactDays: 40 },
    { n: 13, agentId: SAMI_ID, fullName: "Rania Kefi", phone: "26 900 450", source: "website", stage: "closed", message: "", criteria: criteria({ transaction: "sale", cityIds: ["la-marsa"] }), ageDays: 120, lastContactDays: 75 },
    { n: 14, agentId: LEILA_ID, fullName: "Mehdi Zouari", phone: "25 410 090", source: "phone", stage: "closed", message: "", criteria: criteria({ transaction: "sale", cityIds: ["carthage"] }), ageDays: 150, lastContactDays: 100 },
  ];
  const leads = leadSeeds.map((seed) => buildLead(seed, now));

  const activity = (n: number, leadId: string, kind: ActivityKind, summary: string, dayOffset: number, hour: number, authorId: string, authorName: string): Activity => ({
    id: `act_${n}`, leadId, kind, summary, authorId, authorName, at: at(now, dayOffset, hour),
  });
  const activities: Activity[] = [
    activity(1, "lead_1", "system", "Demande reçue depuis le site (REF-1001).", -6, 9, SAMI_ID, "Système"),
    activity(2, "lead_1", "call", "Premier appel : cherche S+3 avec terrasse, budget autour de 550 000 TND.", -5, 11, SAMI_ID, "Sami Trabelsi"),
    activity(3, "lead_1", "whatsapp", "Envoi du dossier et des photos du bien.", -3, 16, SAMI_ID, "Sami Trabelsi"),
    activity(4, "lead_1", "stage_change", "Contacté → Visite planifiée", -1, 10, SAMI_ID, "Sami Trabelsi"),
    activity(5, "lead_2", "visit", "Première visite du penthouse. Très intéressée, revient avec son architecte.", -9, 15, SAMI_ID, "Sami Trabelsi"),
    activity(6, "lead_2", "call", "Elle prépare une offre à 800 000 TND.", -1, 18, SAMI_ID, "Sami Trabelsi"),
    activity(7, "lead_6", "call", "En attente de l'accord préliminaire de la banque.", -6, 12, SAMI_ID, "Sami Trabelsi"),
    activity(8, "lead_7", "visit", "Visite de la villa, deuxième visite à prévoir avec l'architecte.", -4, 11, LEILA_ID, "Leila Mansour"),
  ];

  const appointments: Appointment[] = [
    { id: "apt_1", agencyId: AGENCY_ID, agentId: SAMI_ID, leadId: "lead_1", listingId: "lst_1", startsAt: at(now, 0, 10, 30), durationMin: 60, status: "scheduled", notes: "Prévoir les plans et le titre de propriété.", reminderMinutesBefore: 60 },
    { id: "apt_2", agencyId: AGENCY_ID, agentId: SAMI_ID, leadId: "lead_2", listingId: "lst_2", startsAt: at(now, 0, 15), durationMin: 90, status: "scheduled", notes: "Contre-visite avec l'architecte.", reminderMinutesBefore: 60 },
    { id: "apt_3", agencyId: AGENCY_ID, agentId: LEILA_ID, leadId: "lead_9", listingId: "lst_5", startsAt: at(now, 1, 11), durationMin: 60, status: "scheduled", notes: "", reminderMinutesBefore: 30 },
    { id: "apt_4", agencyId: AGENCY_ID, agentId: SAMI_ID, leadId: "lead_6", listingId: "lst_3", startsAt: at(now, 2, 16), durationMin: 45, status: "scheduled", notes: "", reminderMinutesBefore: 1440 },
    { id: "apt_5", agencyId: AGENCY_ID, agentId: LEILA_ID, leadId: "lead_7", listingId: "lst_4", startsAt: at(now, -4, 11), durationMin: 90, status: "done", notes: "", reminderMinutesBefore: 60 },
  ];

  const deal = (n: number, agentId: string, leadId: string, listingId: string, amount: number, rate: number, monthsAgo: number): Deal => {
    const closed = new Date(now.getFullYear(), now.getMonth() - monthsAgo, Math.min(now.getDate(), 20), 12);
    return { id: `deal_${n}`, agencyId: AGENCY_ID, agentId, leadId, listingId, amount, commissionRate: rate, closedAt: closed.toISOString() };
  };
  const deals: Deal[] = [
    deal(1, SAMI_ID, "lead_11", "lst_10", 395_000, 3, 0),
    deal(2, LEILA_ID, "lead_12", "lst_4", 960_000, 2.5, 1),
    deal(3, SAMI_ID, "lead_13", "lst_6", 720_000, 3, 2),
    deal(4, LEILA_ID, "lead_14", "lst_4", 540_000, 2.5, 3),
    deal(5, SAMI_ID, "lead_13", "lst_1", 430_000, 3, 4),
    deal(6, LEILA_ID, "lead_12", "lst_5", 610_000, 2.5, 5),
  ];

  const visitor: PublicUser = { id: VISITOR_ID, fullName: "Amine Gharbi", email: "user@darcrm.tn", phone: "+216 55 123 456" };
  const savedSearches: SavedSearch[] = [
    {
      id: "srch_1", userId: VISITOR_ID, name: "Appartement · Vente · La Marsa · jusqu'à 600 000 TND",
      filters: { transaction: "sale", propertyType: "apartment", cityId: "la-marsa", priceMax: 600_000 },
      whatsappAlerts: true, whatsappPhone: "+216 55 123 456", createdAt: days(now, -4),
    },
  ];

  const dayKey = (offset: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    return toDateKey(date);
  };
  const task = (n: number, agentId: string, leadId: string | null, title: string, dueOffset: number, done = false): Task => ({
    id: `task_${n}`, agentId, leadId, title, dueDate: dayKey(dueOffset), doneAt: done ? days(now, dueOffset) : null, createdAt: days(now, dueOffset - 2),
  });
  const tasks: Task[] = [
    task(1, SAMI_ID, "lead_6", "Relancer la banque pour l'accord préliminaire", -2),
    task(2, SAMI_ID, "lead_1", "Envoyer les plans et le titre avant la visite", 0),
    task(3, SAMI_ID, "lead_2", "Préparer le dossier pour l'offre à 800 000 TND", 0),
    task(4, SAMI_ID, "lead_2", "Appeler l'architecte pour la contre-visite", 1),
    task(5, SAMI_ID, null, "Photographier le nouveau mandat de La Marsa", 3),
    task(6, SAMI_ID, "lead_1", "Premier appel de qualification", -4, true),
    task(7, LEILA_ID, "lead_7", "Fixer la deuxième visite de la villa", -1),
    task(8, LEILA_ID, "lead_9", "Confirmer la visite de demain par WhatsApp", 0),
  ];

  return {
    agency: {
      id: AGENCY_ID,
      name: "DarCRM Immobilier",
      tagline: "Votre conseiller immobilier à La Marsa et dans le Grand Tunis",
      phone: "71 860 100",
      whatsapp: "+216 98 420 115",
      email: "contact@darcrm.tn",
      address: "12 Avenue Habib Bourguiba, La Marsa, Tunis",
      heroImageUrl: PHOTO_TERRACE,
      whatsappAlertsEnabled: true,
      visitRemindersEnabled: true,
    },
    agents,
    users: [visitor],
    credentials: [
      { email: "admin@darcrm.tn", password: "demo1234", session: { userId: ADMIN_ID, role: "admin", displayName: "Nadia Ben Salem" } },
      { email: "sami@darcrm.tn", password: "demo1234", session: { userId: SAMI_ID, role: "agent", displayName: "Sami Trabelsi" } },
      { email: "leila@darcrm.tn", password: "demo1234", session: { userId: LEILA_ID, role: "agent", displayName: "Leila Mansour" } },
      { email: "user@darcrm.tn", password: "demo1234", session: { userId: VISITOR_ID, role: "user", displayName: "Amine Gharbi" } },
    ],
    listings,
    leads,
    activities,
    appointments,
    deals,
    tasks,
    templates: [],
    favorites: new Map([[VISITOR_ID, new Set(["lst_1", "lst_4"])]]),
    savedSearches,
    alerts: [],
    notifications: [
      { id: "ntf_1", userId: SAMI_ID, kind: "new_lead", title: "Nouvelle demande : Karim Zghal", body: "Villa avec jardin, La Soukra", href: "/crm/prospects/lead_3", at: minutes(now, -25), read: false },
      { id: "ntf_2", userId: SAMI_ID, kind: "new_lead", title: "Nouvelle demande : Salma Ben Amor", body: "Investissement, Berges du Lac", href: "/crm/prospects/lead_4", at: minutes(now, -60), read: false },
      { id: "ntf_3", userId: LEILA_ID, kind: "new_lead", title: "Nouvelle demande : Hatem Dridi", body: "REF-1007 · S+2 à Ennasr II", href: "/crm/prospects/lead_8", at: days(now, -2), read: false },
    ],
    refCounter: 1012,
  };
}
