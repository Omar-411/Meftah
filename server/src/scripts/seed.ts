import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { loadEnv } from "../config/env";
import { MongoDatabase } from "../infrastructure/persistence/mongo-database";
import { CollectionAuthGateway } from "../infrastructure/persistence/repositories/auth";
import { bootstrapDatabase, ensureAdmin } from "../infrastructure/seed/seed-loader";

/**
 * npm run seed          fills an EMPTY database with the demo data (and your admin from .env)
 * npm run seed:reset    deletes everything first, then seeds (asks for confirmation; add --yes to skip)
 */
async function main() {
  const env = loadEnv();
  const reset = process.argv.includes("--reset");
  const assumeYes = process.argv.includes("--yes");

  const db = await MongoDatabase.connect(env.MONGODB_URI, env.MONGODB_DB);
  try {
    console.log(`Base : ${env.MONGODB_DB}`);
    if (reset) {
      if (!assumeYes) {
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        const answer = await rl.question(`Supprimer TOUTES les données de « ${env.MONGODB_DB} » puis recréer la démo ? (oui/non) `);
        rl.close();
        if (answer.trim().toLowerCase() !== "oui") {
          console.log("Annulé, rien n'a été modifié.");
          return;
        }
      }
      await db.reset();
      console.log("Données supprimées.");
    }

    const auth = new CollectionAuthGateway(db);
    const outcome = await bootstrapDatabase(db, auth, { demoData: true });
    console.log(outcome === "skipped" ? "Base déjà initialisée : rien ajouté (utilisez npm run seed:reset pour repartir de zéro)." : "Données de démonstration créées.");

    if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
      const admin = await ensureAdmin(db, auth, { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD, fullName: env.ADMIN_NAME });
      console.log(admin === "created" ? `Administrateur créé : ${env.ADMIN_EMAIL.toLowerCase()}` : `Administrateur déjà présent : ${env.ADMIN_EMAIL.toLowerCase()}`);
    }
    if (outcome === "demo") console.log("Comptes démo (mot de passe demo1234) : admin@darcrm.tn, sami@darcrm.tn, leila@darcrm.tn, user@darcrm.tn");
  } finally {
    await db.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
