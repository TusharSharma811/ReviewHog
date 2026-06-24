import test from "node:test";
import assert from "node:assert/strict";
import { makePullRequestReviewId } from "../src/utils/reviewIds.js";

test("review id includes PR id and head sha", () => {
  assert.equal(
    makePullRequestReviewId("123", "abcde"),
    "123-abcde-summary"
  );
});

test("review ids differ for new commits on the same PR", () => {
  assert.notEqual(
    makePullRequestReviewId("123", "abcde"),
    makePullRequestReviewId("123", "fghij")
  );
});
