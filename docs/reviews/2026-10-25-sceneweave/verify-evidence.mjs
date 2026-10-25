import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { argv, stdout } from "node:process";
import path from "node:path";

const base = path.dirname(fileURLToPath(import.meta.url));
const evidence = path.join(base, "evidence");
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const readJson = async (name) => JSON.parse(await readFile(path.join(evidence, name), "utf8"));
const evidenceNames = await readdir(evidence);
for (const name of evidenceNames.filter((value) => value.endsWith(".json"))) await readJson(name);

const recorded = await readJson("evidence-manifest.json");
for (const file of recorded.files) {
  const bytes = await readFile(path.join(evidence, file.name));
  assert.equal(bytes.length, file.bytes, file.name);
  assert.equal(digest(bytes), file.sha256, file.name);
}
for (const file of await readJson("selected-evidence.json")) {
  const bytes = await readFile(path.join(evidence, file.name));
  assert.equal(bytes.length, file.bytes);
  assert.equal(digest(bytes), file.sha256);
}
const downloads = await readJson("download-artifacts.json");
assert.equal(downloads.jsonCount, 16);
assert.equal(downloads.zipCount, 2);
assert.equal(downloads.files.length, 18);
for (const file of downloads.files.filter((value) => value.retainedInRepository)) {
  const bytes = await readFile(path.join(evidence, file.name));
  assert.equal(digest(bytes), file.sha256, file.name);
  const doc = JSON.parse(bytes);
  assert.equal(doc.revision, file.document.revision);
  assert.equal(doc.assets.length, file.document.assets);
  assert.equal(doc.entities.length, file.document.entities);
}
const roundtrip = await readJson("artifact-roundtrip.json");
assert.ok(roundtrip.r1.undoAssetListEqualInitial);
assert.ok(roundtrip.r1.undoHasNoImportedEntity);
assert.ok(roundtrip.r1.editedAfterUndoEqualsReopened);
assert.ok(roundtrip.input.embeddedDocumentEqualsRecovered);
const undone = await readJson("r1-undone-saved.json");
assert.ok(!undone.assets.some((asset) => roundtrip.r1.newAssetHashes.includes(asset.sha256)));
assert.ok(!undone.entities.some((entity) => roundtrip.r1.newEntityIds.includes(entity.id)));
const semantics = await readJson("semantic-summary.json");
assert.ok(semantics.undoRestores && semantics.redoRestores);
assert.equal(semantics.renameCanvasROI.changedPixelsOver10, 0);
const reviewed = await readJson("persistence-reviewed-files.json");
assert.equal(digest(JSON.stringify(reviewed.files)), reviewed.combinedSourceSha256);
assert.equal(reviewed.files.length, 18);
const source = await readJson("qa-source-manifest.json");
assert.equal(source.files.length, 596);
// QA identity preserves the existing PowerShell-generated manifest order.
assert.equal(
  digest(source.files.map((file) => `${file.path}:${file.sha256}`).join("\n")),
  source.recordedQaCombinedSha256,
);
for (const check of await readJson("qa-source-checks.json")) {
  assert.equal(check.files, 596);
  assert.equal(check.matches, 596);
  assert.deepEqual(check.mismatches, []);
}
const visible = await readJson("qa-run-results-summary.json");
assert.equal(visible.runnerExit, 1);
assert.equal(visible.results.filter((result) => result.status === "PASS").length, 4);
assert.equal(visible.results.filter((result) => result.status === "FAIL").length, 1);
assert.equal(visible.events.length, 6);
assert.equal(visible.eventAttribution.originalStacksSaved, false);
const quiet = await readJson("headless-smoke.json");
assert.equal(quiet.status, "PASS");
assert.equal(quiet.downloads, 0);
assert.deepEqual(quiet.events, []);
assert.ok(quiet.authorDocument.documentJsonEqual && quiet.authorDocument.storageVersionUnchanged);

let checkedCurrent = 0;
if (argv.includes("--current-source")) {
  const repository = path.resolve(base, "../../..");
  for (const file of source.files) {
    assert.equal(digest(await readFile(path.join(repository, file.path))), file.sha256, file.path);
    checkedCurrent++;
  }
}
stdout.write(
  JSON.stringify({
    status: "PASS",
    archivedFiles: recorded.files.length,
    evidenceJson: evidenceNames.filter((name) => name.endsWith(".json")).length,
    actualDownloadsRetained: downloads.files.filter((file) => file.retainedInRepository).length,
    currentSourceFilesChecked: checkedCurrent,
  }) + "\n",
);
