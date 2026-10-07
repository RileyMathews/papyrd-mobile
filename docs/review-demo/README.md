<!-- Generated via opencode. -->

# Read-only review demo

This public OPDS 2 catalog and original EPUB allow review without setting up a
server. They are static files hosted by GitHub; no credentials, personal library,
account registration, or synchronization are needed.

Catalog endpoint:

```text
https://raw.githubusercontent.com/RileyMathews/papyrd-mobile/main/docs/review-demo/catalog.json
```

In Papyrd, open Settings → OPDS servers, add a server named **Review Demo**, paste
the endpoint, leave username/password blank, and save. Open Browse → Review Demo
and download **A Small Guide to Papyrd**. Open it from Library, read both chapters,
change reader preferences, and reopen it offline. Remove the book and demo server
when finished.

The sample text is original project documentation, generated via opencode and
distributed under the project's MIT license, which is included in the EPUB. No
third-party book rights or territorial copyright assumptions are required.
Regenerate it with `python3 scripts/build-review-demo.py`; CI checks reproducibility.

Before public App Review, verify this flow on an actual iOS candidate. HTTP/file
validation alone does not establish that the native reader works correctly.
