import assert from "node:assert/strict";
import { test } from "node:test";
import { validateReleaseVersion } from "../scripts/validate-release-version.mjs";

test("accepts numeric marketing versions", () => {
  for (const version of ["1.0.0", "0.0.18", "12.34.56"]) {
    assert.equal(validateReleaseVersion(version), version);
  }
});

test("rejects tags that cannot be used verbatim as marketing versions", () => {
  for (const version of ["", "v1.0.0", "1.0", "1.0.0-beta", "1.0.0+build", "01.0.0", "1.00.0", "1.0.01", "1.0.0\n", "release/1.0.0"]) {
    assert.throws(() => validateReleaseVersion(version));
  }
});
