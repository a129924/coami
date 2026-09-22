import assert from "node:assert/strict";
import test from "node:test";
import { add } from "./add.ts";

test("adds positive operands", () => {
  assert.equal(add(2, 3), 5);
});

test("adds negative and positive operands", () => {
  assert.equal(add(-2, 3), 1);
});

test("returns a negative sum when the operands sum below zero", () => {
  assert.equal(add(-3, 1), -2);
});
