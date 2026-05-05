import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isWipLimitExceeded, parseWipLimitWholeNumber } from "./wipLimits.js";

describe("wipLimits", () => {
  it("parses valid whole numbers", () => {
    assert.equal(parseWipLimitWholeNumber("5"), 5);
    assert.equal(parseWipLimitWholeNumber(" 12 "), 12);
  });

  it("returns null for blank input and NaN for invalid values", () => {
    assert.equal(parseWipLimitWholeNumber(""), null);
    assert.equal(parseWipLimitWholeNumber(" "), null);
    assert.equal(Number.isNaN(parseWipLimitWholeNumber("0")), true);
    assert.equal(Number.isNaN(parseWipLimitWholeNumber("1.2")), true);
    assert.equal(Number.isNaN(parseWipLimitWholeNumber("-1")), true);
    assert.equal(Number.isNaN(parseWipLimitWholeNumber("abc")), true);
  });

  it("derives exceeded state correctly", () => {
    assert.equal(isWipLimitExceeded(null, 10), false);
    assert.equal(isWipLimitExceeded(3, 3), false);
    assert.equal(isWipLimitExceeded(3, 4), true);
  });
});
