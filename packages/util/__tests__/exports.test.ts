import { describe, expect, test } from "bun:test";

import * as bin from "../src/bin.mjs";

describe("util exports", () => {
  test("should export `resolveBin`", () => {
    expect(bin.resolveBin).not.toBeNull();
  });
  test("should export `resolveBinChecked`", () => {
    expect(bin.resolveBinChecked).not.toBeUndefined();
  });
  test("should export `resolveInvokeBin`", () => {
    expect(bin.resolveInvokeBin).not.toBeUndefined();
  });
  test("should export `invokeBinPassthrough`", () => {
    expect(bin.invokeBinPassthrough).not.toBeUndefined();
  });
});
