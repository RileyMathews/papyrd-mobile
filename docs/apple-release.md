<!-- Generated via opencode. -->

# Apple release operations

The first public marketing version is **1.0.0**. Use numeric `major.minor.patch`
release tags without a `v` prefix or prerelease suffix.

## Prepare and upload

Complete the unchecked Apple items in `RELEASE_BLOCKERS.md`, including a working
reviewer library, review contact information, actual iPhone/iPad screenshots,
privacy disclosures, and price/availability. The public draft version and the
uploaded build must use the same marketing version.

To upload an iOS-only candidate without tagging or triggering Android:

```sh
gh workflow run release.yml --ref main -f version=1.0.0 -f ios_lane=internal
```

This builds and uploads to TestFlight only. Wait for processing and test the
candidate before submitting it. Successful upload is **not** public App Review.

## Submit or resume an exact existing build

Find the build number in the original workflow log and verify the processed build
in App Store Connect. Do not select an unrelated latest build.

```sh
gh workflow run release.yml --ref main -f version=1.0.0 -f ios_lane=submit_review -f build_number=1
# Or locally, with SOPS access:
bundle exec fastlane ios submit_review version:1.0.0 build_number:1
```

The submit lane does not require a signing keychain or re-upload the binary. It
preserves console metadata/screenshots and uses `submit_for_review: true`,
`automatic_release: true`, and `phased_release: false`. If a request failed after
Apple accepted it, inspect App Review before retrying: an already submitted
version may need no further action.

Deliver's metadata step remains enabled with an empty temporary metadata
directory: this applies automatic/full-release settings without uploading listing
text or review credentials. `skip_metadata: true` would silently skip those
release-setting updates as well.

## Enable production on release tags

Only after a successful real submission with the CI API key, enable the repository
variable `IOS_PRODUCTION_READY=true`. Then release tags build, wait for processing,
and submit their exact build for automatic full release after Apple approval.
Until then, tags continue uploading iOS builds to TestFlight. Android tags remain
on closed testing until Google's production-access requirements are met.

The per-platform concurrency groups serialize runs. CI refuses blind re-upload
retries; recover using the exact existing build and the submit lane. Upload errors
can be ambiguous, so check App Store Connect before launching a fresh build.
GitHub concurrency is not a durable FIFO queue: do not push several release tags
at once, since pending runs can be superseded.

Verify these states separately: **uploaded → submitted → approved → live**.
The final two require Apple review and checking actual public availability.
