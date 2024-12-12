import { describe, expect, test } from "bun:test";
import * as api from "../src/api.mjs";

describe("memdb api", () => {
  test("should export `QueryResultMode`", () => {
    expect(api.QueryResultMode).not.toBeNull();
  });
  test("should export `GenericQueryObserver`", () => {
    expect(api.GenericQueryObserver).not.toBeNull();
  });
  test("should export `DatabaseClientAdapter`", () => {
    expect(api.DatabaseClientAdapter).not.toBeNull();
  });
  test("should export `createClientAdapter`", () => {
    expect(api.createClientAdapter).not.toBeNull();
  });
});
