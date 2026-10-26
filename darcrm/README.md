# DarCRM — plateforme immobilière (CRM + site public)

Front-end Next.js 16 / React 19 / TypeScript / Tailwind. Le CRM est la source de vérité : le site public reflète instantanément les biens publiés.

## Lancer

```bash
npm install
npm run dev          # http://localhost:3000
# ou : npm run build && npm run start
```

Par défaut (`API_MODE=mock`) tout fonctionne sans backend avec des données de démonstration en mémoire (réinitialisées au redémarrage du serveur).

## Comptes de démonstration (mot de passe `demo1234`)

| Rôle | E-mail | Ce qu'il voit |
|---|---|---|
| Administrateur | admin@darcrm.tn | Tout : vue agence, agents, commissions, paramètres |
| Agent | sami@darcrm.tn | Ses biens et ses prospects uniquement |
| Visiteur | user@darcrm.tn | Favoris, recherches enregistrées, alertes WhatsApp |

La page `/connexion` propose des boutons « un clic » pour chaque rôle.

## Parcours à tester

1. Agent : `/crm/biens/nouveau` → créer et publier un bien → il apparaît sur `/annonces`.
2. Visiteur (non connecté) : ouvrir l'annonce → « Être rappelé » → un prospect apparaît chez l'agent du bien.
3. Visiteur connecté : enregistrer une recherche → à la publication d'un bien correspondant, une alerte WhatsApp apparaît dans `/compte`.
4. Agent : fiche prospect → journal, visite, rapprochement, « Conclure la vente » → le bien quitte le site, la commission est comptée.

## Brancher votre backend

- `API_MODE=http` et `API_BASE_URL=https://…/api` dans `.env.local`.
- Contrat des endpoints : `docs/API_CONTRACT.md`. Plan complet : `docs/FRONTEND_PLAN.md`.
- Points à implémenter : `src/infrastructure/http/adapters.ts` (repères `TODO(backend)`), `endpoints.ts`, upload photos (`src/lib/image.ts`), envoi WhatsApp réel (`HttpAlertGateway`).

## Architecture (Clean / Hexagonale)

```
src/domain/          règles métier pures (annonce, prospect, matching, commissions…)
src/application/     cas d'usage + ports (interfaces) — dépend du domaine seul
src/infrastructure/  adaptateurs mock et HTTP, session, composition (container.ts)
src/app, components/ présentation : pages, server actions, UI
```

Les dépendances pointent vers l'intérieur. Le site public ne reçoit que `PublicListing` (propriétaire, notes, commission, mandat exclus par construction).
