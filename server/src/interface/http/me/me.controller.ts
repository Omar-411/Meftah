import { Body, Controller, Delete, Get, HttpCode, Inject, NotFoundException, Param, Put, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { z } from "zod";
import { setFavorite, saveSearch, deleteSavedSearch } from "../../../application/account/account";
import { upsertSavedSearch } from "../../../application/account/upsert-saved-search";
import { changeMyPassword, updateMyProfile } from "../../../application/account/profile";
import { requireUser } from "../../../application/guards";
import type { Deps } from "../../../application/ports";
import type { Session } from "../../../domain/auth/session";
import { DEPS } from "../../tokens";
import { passwordBody, profileBody, savedSearchBody } from "../schemas";
import { CurrentSession } from "../session";
import { unwrap, ZodPipe } from "../zod";

/** Everything here is scoped to the token's user: ids in the URL never select another user's data. */
@Controller("me")
export class MeController {
  constructor(@Inject(DEPS) private readonly deps: Deps) {}

  @Get("profile")
  async profile(@CurrentSession() session: Session | null) {
    const user = requireUser(session);
    const profile = await this.deps.users.findById(user.userId);
    if (!profile) throw new NotFoundException("Profil introuvable.");
    return profile;
  }

  /** Any signed-in role: staff update their agent record, visitors their account. */
  @Put("profile")
  async updateProfile(@Body(new ZodPipe(profileBody)) body: z.infer<typeof profileBody>, @CurrentSession() session: Session | null) {
    return unwrap(await updateMyProfile(this.deps, session, body));
  }

  @Post("password")
  @HttpCode(204)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async changePassword(@Body(new ZodPipe(passwordBody)) body: z.infer<typeof passwordBody>, @CurrentSession() session: Session | null) {
    unwrap(await changeMyPassword(this.deps, session, { ...body, confirmPassword: body.newPassword }));
  }

  @Get("favorites")
  favorites(@CurrentSession() session: Session | null) {
    return this.deps.accounts.listFavoriteIds(requireUser(session).userId);
  }

  @Put("favorites/:listingId")
  @HttpCode(204)
  async addFavorite(@Param("listingId") listingId: string, @CurrentSession() session: Session | null) {
    await setFavorite(this.deps, session, listingId, true);
  }

  @Delete("favorites/:listingId")
  @HttpCode(204)
  async removeFavorite(@Param("listingId") listingId: string, @CurrentSession() session: Session | null) {
    await setFavorite(this.deps, session, listingId, false);
  }

  @Get("saved-searches")
  savedSearches(@CurrentSession() session: Session | null) {
    return this.deps.accounts.listSavedSearches(requireUser(session).userId);
  }

  @Post("saved-searches")
  async create(@Body(new ZodPipe(savedSearchBody)) body: z.infer<typeof savedSearchBody>, @CurrentSession() session: Session | null) {
    return unwrap(await saveSearch(this.deps, session, body, new Date()));
  }

  @Put("saved-searches/:id")
  async upsert(@Param("id") id: string, @Body(new ZodPipe(savedSearchBody)) body: z.infer<typeof savedSearchBody>, @CurrentSession() session: Session | null) {
    return unwrap(await upsertSavedSearch(this.deps, session, { ...body, id }, new Date()));
  }

  @Delete("saved-searches/:id")
  @HttpCode(204)
  async remove(@Param("id") id: string, @CurrentSession() session: Session | null) {
    await deleteSavedSearch(this.deps, session, id);
  }

  @Get("alerts")
  alerts(@CurrentSession() session: Session | null) {
    return this.deps.accounts.listAlerts(requireUser(session).userId);
  }
}
