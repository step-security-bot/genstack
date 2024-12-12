import { describe, expect, test } from "bun:test";
import pkg from "../package.json";
import * as api from "../src/api.mjs";
import * as bun from "../src/bun.mjs";
import * as client from "../src/client.mjs";

describe("driver: bun", () => {
  test("with defaults", () => {
    const driver = bun.BunDatabaseDriver.defaults();
    expect(driver).not.toBeNull();
    expect(driver.options()).not.toBeNull();
  });
  test("with config (defaults)", () => {
    const driver = bun.BunDatabaseDriver.create();
    expect(driver).not.toBeNull();
    expect(driver.options()).not.toBeNull();
  });
  test("with config (overrides)", () => {
    const driver = bun.BunDatabaseDriver.create({ debugLogging: true });
    expect(driver).not.toBeNull();
    expect(driver.options()).not.toBeNull();
    expect(driver.options().debugLogging).toBeTrue();
  });
  test("provides version", () => {
    const driver = bun.BunDatabaseDriver.defaults();
    expect(driver.version()).not.toBeNull();
  });
  test("version matches package", () => {
    const driver = bun.BunDatabaseDriver.defaults();
    expect(driver.version()).toBe(pkg.version);
  });
  describe("exports", () => {
    test("exports `api`", () => {
      expect(bun.api).not.toBeNull();
    });
    test("exports `sql`", () => {
      expect(bun.sql).not.toBeNull();
    });
    test("exports `BunDatabaseDriver`", () => {
      expect(bun.BunDatabaseDriver).not.toBeNull();
    });
  });
  describe("with adapter", () => {
    test("can create adapter with driver", () => {
      const driver = bun.BunDatabaseDriver.defaults();
      const adapter = api.createClientAdapter(() => driver);
      expect(adapter).not.toBeNull();
    });
    test("can connect with backing driver", async () => {
      const driver = bun.BunDatabaseDriver.defaults();
      const adapter = api.createClientAdapter(() => driver);
      expect(adapter).not.toBeNull();
      await adapter.connect("default");
      expect(adapter.connected()).toBeTrue();
    });
    test("adapter throws for invalid queries", async () => {
      const driver = bun.BunDatabaseDriver.defaults();
      const adapter = api.createClientAdapter(() => driver);
      expect(adapter).not.toBeNull();
      await adapter.connect("default");
      expect(adapter.connected()).toBeTrue();
      expect(adapter.exec("not a valid query")).rejects.toThrow();
    });
  });
});
