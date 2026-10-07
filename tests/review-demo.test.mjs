import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("review catalog provides a credential-free EPUB acquisition matching the published fixture", () => {
  const catalog = JSON.parse(readFileSync(new URL("../docs/review-demo/catalog.json", import.meta.url), "utf8"));
  assert.equal(catalog.metadata.numberOfItems, catalog.publications.length);
  assert.equal(catalog.publications.length, 1);
  const publication = catalog.publications[0];
  const acquisition = publication.links.find(link => link.rel.includes("http://opds-spec.org/acquisition"));
  assert.equal(acquisition.type, "application/epub+zip");
  assert.equal(acquisition.href, "https://raw.githubusercontent.com/RileyMathews/papyrd-mobile/main/docs/review-demo/papyrd-demo.epub");
  assert.ok(publication.metadata.title);
  const ebook = readFileSync(new URL("../docs/review-demo/papyrd-demo.epub", import.meta.url));
  assert.equal(ebook.subarray(0, 2).toString(), "PK");
});
