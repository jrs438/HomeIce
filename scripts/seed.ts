import "dotenv/config";
import { runSeed } from "../src/db/seed-data";

runSeed()
  .then((result) => {
    console.log("Seed complete:", result);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
