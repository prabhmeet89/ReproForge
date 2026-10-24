import path from "path";
import fs from "fs/promises";
import { zipDirectory } from "../utils/zipUtils";

async function main() {
  const candidateDirs = [
    path.resolve(process.cwd(), "samples"),
    path.resolve(process.cwd(), "../samples"),
    path.resolve(__dirname, "../../../samples"),
    path.resolve(__dirname, "../../../../samples"),
  ];

  let samplesDir: string | null = null;
  for (const dir of candidateDirs) {
    try {
      const stat = await fs.stat(dir);
      if (stat.isDirectory()) {
        samplesDir = dir;
        break;
      }
    } catch {
      // ignore
    }
  }

  if (!samplesDir) {
    console.error("Could not find samples directory");
    process.exit(1);
  }

  const sampleName = process.argv[2] || "payment-order-bug";
  const sourceDir = path.join(samplesDir, sampleName);
  const destZip = path.join(samplesDir, `${sampleName}.zip`);

  console.log(`Zipping sample "${sampleName}" from: ${sourceDir}`);
  console.log(`Output archive: ${destZip}`);

  await zipDirectory(sourceDir, destZip);
  console.log(`Successfully created ${destZip}`);
}

main().catch((err) => {
  console.error("Error zipping sample:", err);
  process.exit(1);
});
