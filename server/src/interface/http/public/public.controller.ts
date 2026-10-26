import { Body, Controller, Get, Inject, NotFoundException, Param, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { z } from "zod";
import { createInquiry } from "../../../application/public/create-inquiry";
import { searchListings } from "../../../application/public/listings";
import type { Deps } from "../../../application/ports";
import { DEPS } from "../../tokens";
import { inquiryBody } from "../schemas";
import { unwrap, ZodPipe } from "../zod";
import { parsePublicSearch } from "./search-query";

const limitOf = (raw: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 24) : fallback;
};

/** Anonymous read model. Everything returned here goes through the public projection. */
@Controller("public")
export class PublicController {
  constructor(@Inject(DEPS) private readonly deps: Deps) {}

  @Get("agency")
  agency() {
    return this.deps.agency.get();
  }

  @Get("cities")
  cities() {
    return this.deps.publicListings.cityCounts();
  }

  @Get("listings")
  search(@Query() query: Record<string, unknown>) {
    return searchListings(this.deps, parsePublicSearch(query));
  }

  @Get("listings/featured")
  featured(@Query("limit") limit?: string) {
    return this.deps.publicListings.featured(limitOf(limit, 3));
  }

  @Get("listings/by-ids")
  byIds(@Query("ids") ids = "") {
    const list = ids.split(",").map((id) => id.trim()).filter(Boolean).slice(0, 50);
    return this.deps.publicListings.findByIds(list);
  }

  @Get("listings/:slug")
  async detail(@Param("slug") slug: string) {
    const listing = await this.deps.publicListings.findBySlug(slug);
    if (!listing) throw new NotFoundException("Annonce introuvable.");
    return listing;
  }

  @Get("listings/:slug/similar")
  similar(@Param("slug") slug: string, @Query("limit") limit?: string) {
    return this.deps.publicListings.similarTo(slug, limitOf(limit, 3));
  }

  @Post("listings/:slug/inquiries")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async inquire(@Param("slug") slug: string, @Body(new ZodPipe(inquiryBody)) body: z.infer<typeof inquiryBody>) {
    return unwrap(await createInquiry(this.deps, slug, body, new Date()));
  }
}
