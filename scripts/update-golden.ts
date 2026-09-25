// Regenerates golden images from the current generator. Run it only for intentional changes and review the diff.
//   pnpm golden:update                      # rewrite every tests/fixtures/expected/<input>.<layout>.png
//   pnpm golden:update demo-16.gamemaker-47 # also create new cases
import { readdirSync } from "node:fs";

import { generate, getLayout, getTemplate, isLayoutId } from "../src/core/index.ts";
import { fixturesDir, parseInputName, readFixture, writeFixture } from "../tests/helpers.ts";

const existing = readdirSync(`${fixturesDir}expected`)
  .filter((f) => f.endsWith(".png") && !f.endsWith(".actual.png") && !f.endsWith(".diff.png"))
  .map((f) => f.replace(/\.png$/, ""));

for (const key of new Set([...existing, ...process.argv.slice(2)])) {
  const [input, layoutId] = key.split(".");
  if (!isLayoutId(layoutId)) throw new Error(`unknown layout in ${key}`);
  const { templateId, tileSize } = parseInputName(`${input}.png`);
  const tileset = generate(readFixture(`inputs/${input}.png`), {
    template: getTemplate(templateId),
    tileSize,
    layout: getLayout(layoutId),
  });
  writeFixture(`expected/${key}.png`, tileset.image);
  console.log(`wrote expected/${key}.png`);
}
