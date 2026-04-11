import { useState, useEffect, useMemo } from 'react';
import { sprintApi } from '../services/sprintApi';

export function compareNullableDesc(left, right) {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  if (left > right) return -1;
  if (left < right) return 1;
  return 0;
}

/** Tie-breaker: latest startDate, then latest createdAt, then highest id (null-safe). */
export function compareActiveSprintPreference(a, b) {
  const byStart = compareNullableDesc(a?.startDate, b?.startDate);
  if (byStart !== 0) return byStart;
  const byCreatedAt = compareNullableDesc(a?.createdAt, b?.createdAt);
  if (byCreatedAt !== 0) return byCreatedAt;
  return compareNullableDesc(Number(a?.id) || 0, Number(b?.id) || 0);
}

/** Chronological order for velocity-style charts (oldest start first). */
export function compareSprintStartAsc(a, b) {
  const ta = a?.startDate ? new Date(`${a.startDate}T12:00:00`).getTime() : 0;
  const tb = b?.startDate ? new Date(`${b.startDate}T12:00:00`).getTime() : 0;
  if (ta !== tb) return ta - tb;
  return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
}

function isReportableSprint(s) {
  return s?.status === 'ACTIVE' || s?.status === 'COMPLETED';
}

/**
 * Loads ACTIVE and COMPLETED sprints for Scrum Summary / Metrics.
 * Default selection: best ACTIVE (tie-break: startDate, createdAt, id); if none, best COMPLETED.
 */
export function useActiveSprintSelection(projectId) {
  const [reportSprints, setReportSprints] = useState([]);
  const [selectedSprintId, setSelectedSprintId] = useState(null);
  const [loadingSprints, setLoadingSprints] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingSprints(true);
      try {
        const list = await sprintApi.listByProject(projectId);
        if (!mounted) return;
        const rows = (Array.isArray(list) ? list : []).filter(isReportableSprint);
        setReportSprints(rows);
      } finally {
        if (mounted) setLoadingSprints(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [projectId]);

  const activeSprints = useMemo(
    () => reportSprints.filter((s) => s.status === 'ACTIVE'),
    [reportSprints],
  );

  const completedSprints = useMemo(
    () => reportSprints.filter((s) => s.status === 'COMPLETED'),
    [reportSprints],
  );

  useEffect(() => {
    const selectableIds = new Set(reportSprints.map((s) => String(s.id)));
    if (selectedSprintId != null && selectableIds.has(String(selectedSprintId))) return;
    if (!reportSprints.length) {
      setSelectedSprintId(null);
      return;
    }
    const pool = activeSprints.length ? activeSprints : completedSprints;
    const fallbackDefault = [...pool].sort(compareActiveSprintPreference)[0];
    setSelectedSprintId(fallbackDefault?.id ?? null);
  }, [reportSprints, activeSprints, completedSprints, selectedSprintId]);

  const selectedSprint = useMemo(
    () => reportSprints.find((s) => String(s.id) === String(selectedSprintId)) ?? null,
    [reportSprints, selectedSprintId],
  );

  const sprintOptions = useMemo(() => {
    const actives = [...activeSprints].sort(compareActiveSprintPreference);
    const completed = [...completedSprints].sort(compareActiveSprintPreference);
    return [...actives, ...completed].map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status,
    }));
  }, [activeSprints, completedSprints]);

  const velocitySprints = useMemo(
    () => [...reportSprints].sort(compareSprintStartAsc),
    [reportSprints],
  );

  return {
    reportSprints,
    activeSprints,
    selectedSprintId,
    setSelectedSprintId,
    loadingSprints,
    selectedSprint,
    sprintOptions,
    velocitySprints,
  };
}
