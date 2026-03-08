import { trackEvent } from "./monitoringStore.js";

const flags = {
  enableCart: true,
  enableProductDetails: true,
  enableMonitoringDashboard: true,
};

let currentReleaseId = 1;
const releaseHistory = [
  {
    releaseId: currentReleaseId,
    createdAt: new Date().toISOString(),
    note: "Initial release",
    flags: { ...flags },
  },
];

function snapshotRelease(note) {
  currentReleaseId += 1;
  const release = {
    releaseId: currentReleaseId,
    createdAt: new Date().toISOString(),
    note: note || `Release ${currentReleaseId}`,
    flags: { ...flags },
  };
  releaseHistory.unshift(release);
  if (releaseHistory.length > 50) {
    releaseHistory.length = 50;
  }
  return release;
}

export function getFeatureFlags() {
  return { ...flags };
}

export function isFeatureEnabled(flagName) {
  return Boolean(flags[flagName]);
}

export function setFeatureFlag(flagName, enabled) {
  if (!(flagName in flags)) {
    return null;
  }
  flags[flagName] = Boolean(enabled);
  trackEvent({
    type: "feature_flag_change",
    severity: "info",
    message: `Flag ${flagName} set to ${flags[flagName]}`,
    metadata: { flagName, enabled: flags[flagName] },
  });
  return { key: flagName, enabled: flags[flagName] };
}

export function createRelease(note) {
  const release = snapshotRelease(note);
  trackEvent({
    type: "deployment",
    severity: "info",
    message: `Created release ${release.releaseId}`,
    metadata: { releaseId: release.releaseId, note: release.note },
  });
  return release;
}

export function getReleaseState() {
  return {
    currentReleaseId,
    history: releaseHistory,
  };
}

export function rollbackRelease(targetReleaseId) {
  const target =
    targetReleaseId == null
      ? releaseHistory[1]
      : releaseHistory.find((item) => item.releaseId === targetReleaseId);

  if (!target) {
    return null;
  }

  Object.keys(flags).forEach((key) => {
    flags[key] = Boolean(target.flags[key]);
  });

  const rollbackReleaseRecord = snapshotRelease(`Rollback to ${target.releaseId}`);
  trackEvent({
    type: "rollback",
    severity: "high",
    message: `Rollback executed to release ${target.releaseId}`,
    metadata: {
      targetReleaseId: target.releaseId,
      newReleaseId: rollbackReleaseRecord.releaseId,
    },
  });

  return {
    rolledBackTo: target.releaseId,
    activeRelease: rollbackReleaseRecord.releaseId,
    flags: { ...flags },
  };
}
