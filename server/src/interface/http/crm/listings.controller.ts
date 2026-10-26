import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Put, Query } from "@nestjs/common";
import type { z } from "zod";
import { deleteListing, listCrmListings, saveListing, setListingState } from "../../../application/crm/listings";
import { getListingRecord } from "../../../application/crm/records";
import type { Deps } from "../../../application/ports";
import type { Session } from "../../../domain/auth/session";
import type { Listing } from "../../../domain/listing/listing";
import { DEPS } from "../../tokens";
import { listingBody } from "../schemas";
import { CurrentSession } from "../session";
import { unwrap, ZodPipe } from "../zod";

type ListingBody = z.infer<typeof listingBody>;

@Controller("crm/listings")
export class CrmListingsController {
  constructor(@Inject(DEPS) private readonly deps: Deps) {}

  /** The server owns id, ref, slug, agency and timestamps; whatever the client sends for them is replaced. */
  private async toDraft(body: ListingBody, id: string): Promise<Listing> {
    const agency = await this.deps.agency.get();
    return { ...body, id, ref: "", slug: "", agencyId: agency.id, createdAt: "", updatedAt: "", publishedAt: null };
  }

  @Get()
  list(
    @CurrentSession() session: Session | null,
    @Query("q") q?: string,
    @Query("ref") ref?: string,
    @Query("status") status?: Listing["status"],
    @Query("visibility") visibility?: Listing["visibility"],
    @Query("transaction") transactionType?: Listing["transaction"],
    @Query("agentId") agentId?: string,
  ) {
    return listCrmListings(this.deps, session, { q, ref, status, visibility, transaction: transactionType, agentId });
  }

  @Get(":id")
  one(@Param("id") id: string, @CurrentSession() session: Session | null) {
    return getListingRecord(this.deps, session, id);
  }

  @Post()
  async create(@Body(new ZodPipe(listingBody)) body: ListingBody, @CurrentSession() session: Session | null) {
    return unwrap(await saveListing(this.deps, session, await this.toDraft(body, ""), new Date()));
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body(new ZodPipe(listingBody)) body: ListingBody, @CurrentSession() session: Session | null) {
    await getListingRecord(this.deps, session, id);
    return unwrap(await saveListing(this.deps, session, await this.toDraft(body, id), new Date()));
  }

  @Post(":id/publish")
  @HttpCode(200)
  async publish(@Param("id") id: string, @CurrentSession() session: Session | null) {
    return unwrap(await setListingState(this.deps, session, id, { visibility: "published" }, new Date()));
  }

  @Post(":id/unpublish")
  @HttpCode(200)
  async unpublish(@Param("id") id: string, @CurrentSession() session: Session | null) {
    return unwrap(await setListingState(this.deps, session, id, { visibility: "draft" }, new Date()));
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id") id: string, @CurrentSession() session: Session | null) {
    await deleteListing(this.deps, session, id);
  }
}
