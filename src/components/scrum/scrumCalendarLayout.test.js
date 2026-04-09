import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addDays,
  parseISO,
  startOfDay,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import {
  assignLanesCapped,
  buildVisibleSprintIdsByDayKey,
  compareActiveSprintsByStartDate,
  compareSegmentsForLane,
  hiddenSprintsForDay,
  parseDay,
  shouldShowSprintNameOnSegment,
  sortActiveSprintsForCalendar,
  sprintSegmentForWeek,
  subSegmentsVisibleInWeek,
  visibleSprintIdsForDay,
} from "./scrumCalendarLayout.js";

function weekBounds(day) {
  const d = startOfDay(day);
  return {
    weekStart: startOfWeek(d, { weekStartsOn: 0 }),
    weekEnd: endOfWeek(d, { weekStartsOn: 0 }),
  };
}

describe("scrumCalendarLayout", () => {
  it("compareActiveSprintsByStartDate orders by startDate then id", () => {
    const late = { id: "b", status: "ACTIVE", startDate: "2025-04-10", endDate: "2025-04-20" };
    const early = { id: "a", status: "ACTIVE", startDate: "2025-04-01", endDate: "2025-04-30" };
    assert.equal(compareActiveSprintsByStartDate(late, early) > 0, true);
    assert.equal(compareActiveSprintsByStartDate(early, late) < 0, true);
    const same = { id: "z", status: "ACTIVE", startDate: "2025-04-01", endDate: "2025-04-15" };
    const sameStart = { id: "a", status: "ACTIVE", startDate: "2025-04-01", endDate: "2025-04-15" };
    assert.equal(compareActiveSprintsByStartDate(same, sameStart) > 0, true);
  });

  it("sortActiveSprintsForCalendar keeps ACTIVE only with valid dates", () => {
    const list = [
      { id: 1, status: "COMPLETED", startDate: "2025-04-01", endDate: "2025-04-30" },
      { id: 2, status: "ACTIVE", startDate: "2025-04-05", endDate: "2025-04-10" },
      { id: 3, status: "ACTIVE", startDate: "2025-04-01", endDate: "2025-04-30" },
    ];
    const sorted = sortActiveSprintsForCalendar(list);
    assert.equal(sorted.length, 2);
    assert.equal(sorted[0].id, 3);
    assert.equal(sorted[1].id, 2);
  });

  it("compareSegmentsForLane uses sprint start order then column", () => {
    const sun = startOfDay(parseISO("2025-04-06"));
    const mon = addDays(sun, 1);
    const base = { colStart: 0, colEnd: 6, colSpan: 7, segStart: sun, segEnd: mon };
    const a = {
      ...base,
      sprint: { id: "a", status: "ACTIVE", startDate: "2025-04-10", endDate: "2025-04-30" },
    };
    const b = {
      ...base,
      sprint: { id: "b", status: "ACTIVE", startDate: "2025-04-01", endDate: "2025-04-30" },
    };
    assert.equal(compareSegmentsForLane(a, b) > 0, true);
  });

  it("assignLanesCapped places at most maxLanes overlapping spans and drops the rest", () => {
    const { weekStart, weekEnd } = weekBounds(parseISO("2025-04-10"));
    const mk = (id) => ({
      id,
      name: id,
      status: "ACTIVE",
      startDate: "2025-04-08",
      endDate: "2025-04-14",
    });
    const sprints = [mk("s1"), mk("s2"), mk("s3")];
    const segs = sprints
      .map((sp) => sprintSegmentForWeek(sp, weekStart, weekEnd))
      .filter(Boolean);
    const { placed, dropped } = assignLanesCapped(segs, 2);
    assert.equal(placed.length, 2);
    assert.equal(dropped.length, 1);
    const lanes = placed.map((p) => p.lane);
    assert.equal(Math.max(...lanes), 1);
  });

  it("shouldShowSprintNameOnSegment is true only when segment start equals sprint start", () => {
    const sprint = {
      id: 1,
      status: "ACTIVE",
      startDate: "2025-04-09",
      endDate: "2025-04-20",
    };
    assert.equal(
      shouldShowSprintNameOnSegment(sprint, parseDay("2025-04-09")),
      true,
    );
    assert.equal(
      shouldShowSprintNameOnSegment(
        sprint,
        startOfWeek(parseDay("2025-04-09"), { weekStartsOn: 0 }),
      ),
      false,
    );
  });

  it("visibleSprintIdsForDay keeps top-2 among touching ACTIVE by sort", () => {
    const day = parseISO("2025-04-10");
    const sorted = sortActiveSprintsForCalendar([
      { id: "a", status: "ACTIVE", startDate: "2025-04-01", endDate: "2025-04-30" },
      { id: "b", status: "ACTIVE", startDate: "2025-04-02", endDate: "2025-04-28" },
      { id: "c", status: "ACTIVE", startDate: "2025-04-05", endDate: "2025-04-25" },
    ]);
    const vis = visibleSprintIdsForDay(day, sorted);
    assert.equal(vis.size, 2);
    assert.ok(vis.has("a"));
    assert.ok(vis.has("b"));
    assert.ok(!vis.has("c"));
  });

  it("hiddenSprintsForDay lists only non-top-2 touches", () => {
    const day = parseISO("2025-04-10");
    const sorted = sortActiveSprintsForCalendar([
      { id: "a", status: "ACTIVE", startDate: "2025-04-01", endDate: "2025-04-30" },
      { id: "b", status: "ACTIVE", startDate: "2025-04-02", endDate: "2025-04-28" },
      { id: "c", status: "ACTIVE", startDate: "2025-04-05", endDate: "2025-04-25" },
    ]);
    const hidden = hiddenSprintsForDay(day, sorted);
    assert.equal(hidden.length, 1);
    assert.equal(hidden[0].id, "c");
  });

  it("subSegmentsVisibleInWeek is empty when sprint is never in per-day top-2", () => {
    const { weekStart, weekEnd } = weekBounds(parseISO("2025-04-10"));
    const sprints = sortActiveSprintsForCalendar([
      { id: "a", status: "ACTIVE", startDate: "2025-04-01", endDate: "2025-04-30" },
      { id: "b", status: "ACTIVE", startDate: "2025-04-02", endDate: "2025-04-30" },
      { id: "c", status: "ACTIVE", startDate: "2025-04-03", endDate: "2025-04-30" },
    ]);
    const days = [];
    let d = weekStart;
    while (d <= weekEnd) {
      days.push(d);
      d = addDays(d, 1);
    }
    const map = buildVisibleSprintIdsByDayKey(days, sprints);
    const c = sprints.find((x) => x.id === "c");
    assert.ok(c);
    const subs = subSegmentsVisibleInWeek(c, weekStart, weekEnd, map);
    assert.equal(subs.length, 0);
  });

  it("a day only touched by third-ranked sprint still gets that strip when alone", () => {
    const sun = startOfDay(parseISO("2025-04-06"));
    const days = Array.from({ length: 7 }, (_, i) => addDays(sun, i));
    const sorted = sortActiveSprintsForCalendar([
      { id: "a", status: "ACTIVE", startDate: "2025-04-07", endDate: "2025-04-30" },
      { id: "b", status: "ACTIVE", startDate: "2025-04-07", endDate: "2025-04-30" },
      { id: "c", status: "ACTIVE", startDate: "2025-04-06", endDate: "2025-04-06" },
    ]);
    const map = buildVisibleSprintIdsByDayKey(days, sorted);
    const onlySun = addDays(sun, 0);
    const visSun = visibleSprintIdsForDay(onlySun, sorted);
    assert.ok(visSun.has("c"), "only c touches Sunday");
    assert.equal(visSun.size, 1);
  });
});
