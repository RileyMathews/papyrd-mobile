import { pathToFileURL } from "node:url";

export function validateReleaseVersion(version) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version) || version.trim() !== version) {
    throw new Error("Release version must be major.minor.patch, without a v prefix, leading zeros, or prerelease suffix.");
  }
  return version;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  validateReleaseVersion(process.argv[2] || "");
}
