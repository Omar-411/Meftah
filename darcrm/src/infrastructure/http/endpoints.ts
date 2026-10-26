/** Single place to change URLs. Mirrors docs/API_CONTRACT.md and the server in /server. */
export const ENDPOINTS = {
  auth: { login: "auth/login", register: "auth/register" },
  /** Public read of the agency profile (header, footer, alert switch). Writing goes to crm.settings. */
  agency: "public/agency",
  /** One route for both audiences: staff tokens get the full agent, everyone else the public fields. */
  agents: "agents",
  public: {
    listings: "public/listings",
    listingsByIds: "public/listings/by-ids",
    featured: "public/listings/featured",
    cities: "public/cities",
  },
  me: {
    profile: "me/profile",
    password: "me/password",
    favorites: "me/favorites",
    savedSearches: "me/saved-searches",
    alerts: "me/alerts",
  },
  crm: {
    listings: "crm/listings",
    leads: "crm/leads",
    appointments: "crm/appointments",
    deals: "crm/deals",
    notifications: "crm/notifications",
    agencySettings: "crm/settings/agency",
    users: "crm/users",
    tasks: "crm/tasks",
    templates: "crm/templates",
  },
} as const;
