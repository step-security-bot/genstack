import { describe, expect, mock, test } from "bun:test";
import * as api from "../src/api.mjs";
import * as bun from "../src/bun.mjs";
import adapterSuite, { type AdapterFactory } from "./adapter.test";

const acquire: AdapterFactory = () => {
  const driver = bun.BunDatabaseDriver.defaults();
  const adapter = api.createClientAdapter(() => driver);
  expect(adapter).not.toBeNull();
  return adapter;
};

describe("tck: in-mem (bun)", async () => {
  await adapterSuite(acquire);
});
