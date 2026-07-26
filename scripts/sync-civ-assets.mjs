import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { CIVILIZATIONS, civilizationAssetName } from "../docs/lib/civilizations.js";

const SOURCE_ROOT = "https://raw.githubusercontent.com/SiegeEngineers/aoe2techtree/master/img/Civs";
const outputDirectory = fileURLToPath(new URL("../docs/assets/civs/", import.meta.url));
const pngSignature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);

function isPng(bytes) {
  return pngSignature.every((value, index) => bytes[index] === value);
}

await mkdir(outputDirectory, { recursive: true });

for (const civilization of CIVILIZATIONS) {
  const sourceName = civilizationAssetName(civilization);
  const response = await fetch(`${SOURCE_ROOT}/${encodeURIComponent(sourceName)}`);
  if (!response.ok) {
    throw new Error(`${civilization} arması indirilemedi: HTTP ${response.status}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!isPng(bytes)) throw new Error(`${civilization} dosyası geçerli bir PNG değil.`);
  await writeFile(`${outputDirectory}/${civilizationAssetName(civilization)}`, bytes);
}

console.log(`${CIVILIZATIONS.length} uygarlık arması eşitlendi.`);
