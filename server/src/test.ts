import "dotenv/config";
import { verifyClaim } from "./ai/index.js";

async function main() {
  const testClaim =
    "Drinking lemon water every morning completely detoxes your body.";

  console.log("\n==============================");
  console.log("HEALTHCLAIM AI TEST");
  console.log("==============================\n");

  console.log("Input:");
  console.log(testClaim);

  console.log("\nAnalyzing...\n");

  try {
    const result = await verifyClaim(testClaim);

    console.log("RESULT");
    console.log("------------------------------");

    console.log("Claim:");
    console.log(result.claim);

    console.log("\nVerdict:");
    console.log(result.verdict);

    console.log("\nConfidence:");
    console.log(result.confidence);

    console.log("\nExplanation:");
    console.log(result.explanation);

    console.log("\nSources:");

    for (const source of result.sources) {
      console.log(`- ${source.source}`);
      console.log(`  ${source.title}`);
      console.log(`  ${source.url}`);
    }
  } catch (error) {
    console.error("\nERROR:");
    console.error(error);
    process.exitCode = 1;
  }
}

main();