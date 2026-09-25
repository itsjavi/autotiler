import { expect, test } from "vitest";

import { CORE_VERSION } from "./index.ts";

test("core entry point loads", () => {
  expect(CORE_VERSION).toBe(2);
});
