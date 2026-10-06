import assert from "node:assert/strict";
import test from "node:test";
import { groupBy } from "../src/summary.mjs";

test("groupBy keeps the order of first appearance and of the items in each group", () => {
  const items = [{ k: "b", n: 1 }, { k: "a", n: 2 }, { k: "b", n: 3 }];
  const groups = groupBy(items, (item) => item.k);
  assert.deepEqual([...groups.keys()], ["b", "a"]);
  assert.deepEqual(groups.get("b"), [items[0], items[2]]);
  assert.deepEqual(groups.get("a"), [items[1]]);
});

test("groupBy of no items is an empty map", () => {
  assert.equal(groupBy([], (item) => item).size, 0);
});
