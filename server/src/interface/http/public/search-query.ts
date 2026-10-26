import { z } from "zod";
import { DEFAULT_PAGE_SIZE, type SearchQuery } from "../../../domain/listing/filters";
import { propertyType, transaction } from "../schemas";

const positiveInt = z.coerce.number().int().positive().optional().catch(undefined);

const schema = z.object({
  transaction: transaction.optional().catch(undefined),
  cityId: z.string().min(1).optional().catch(undefined),
  propertyType: propertyType.optional().catch(undefined),
  priceMin: positiveInt,
  priceMax: positiveInt,
  minRooms: positiveInt,
  minArea: positiveInt,
  sort: z.enum(["recent", "price-asc", "price-desc", "area-desc"]).catch("recent"),
  page: z.coerce.number().int().positive().catch(1),
  pageSize: z.coerce.number().int().positive().max(48).catch(DEFAULT_PAGE_SIZE),
});

/** The HTTP API uses English field names (the website's French URL params are a front concern). Bad values fall back to defaults. */
export function parsePublicSearch(raw: Record<string, unknown>): SearchQuery {
  const { sort, page, pageSize, ...filters } = schema.parse(raw);
  return { filters, sort, page, pageSize };
}
