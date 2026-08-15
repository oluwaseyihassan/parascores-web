import type { InjectionKey, Ref } from "vue";
import { parseDate, type DateValue } from "@internationalized/date";
import type { Fixture } from "~/types";

export function useMatchSchedule(options: {
  fixture: Ref<Fixture | null>;
  matchDuration: Ref<number>;
  updatingTime: Ref<boolean>;
  tournament: () => any;
  onFixtureUpdated: (fixture: Fixture) => void;
}) {
  const { fixture, matchDuration, updatingTime, tournament, onFixtureUpdated } =
    options;

  const fixtureStore = useFixtureStore();
  const venueStore = useVenueStore();
  const { handleError } = useErrors();

  const matchTime = ref<string>(""); // Used for fallback/comparison
  const matchDateVal = shallowRef<DateValue | null>(null);
  const matchTimeVal = ref<string>("12:00");
  const matchVenue = ref<string>("");

  const formatDateDisplay = (date: DateValue | null) => {
    if (!date) return "Select date";
    return new Date(date.year, date.month - 1, date.day).toLocaleDateString(
      "en-US",
      {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      },
    );
  };

  const parseDateString = (
    dateStr: string | null | undefined,
  ): DateValue | undefined => {
    if (!dateStr) return undefined;
    try {
      const datePart = dateStr.split("T")[0];
      if (!datePart) return undefined;
      return parseDate(datePart);
    } catch (e) {
      console.warn("Failed to parse date:", dateStr);
      return undefined;
    }
  };

  const tournamentMinDate = computed(() => {
    if (!tournament()) return undefined;
    return parseDateString(tournament()?.start_date);
  });

  const tournamentMaxDate = computed(() => {
    if (!tournament()) return undefined;
    return parseDateString(tournament()?.end_date);
  });

  const venueOptions = computed(() => {
    return venueStore.venues.map((v) => ({ label: v.name, value: v.name }));
  });

  const isUpdateDisabled = computed(() => {
    if (!matchDateVal.value || !matchTimeVal.value) return true;
    if (!fixture.value) return true;

    const selectedYear = matchDateVal.value.year;
    const selectedMonth = matchDateVal.value.month - 1;
    const selectedDay = matchDateVal.value.day;
    const [h, m] = matchTimeVal.value.split(":").map(Number);

    const newDate = new Date(selectedYear, selectedMonth, selectedDay, h, m);

    const timeChanged = fixture.value.startTime
      ? new Date(fixture.value.startTime).toISOString() !==
        newDate.toISOString()
      : true;

    const venueChanged = (fixture.value.venue || "") !== matchVenue.value;

    const durationChanged =
      (fixture.value.matchDuration ?? 90) !== matchDuration.value;

    return !timeChanged && !venueChanged && !durationChanged;
  });

  watch(matchDateVal, (newVal, oldVal) => {
    const t = tournament();
    if (newVal && t?.start_date && t?.end_date) {
      const tStart = parseDateString(t.start_date);
      const tEnd = parseDateString(t.end_date);
      if (tStart && tEnd) {
        if (newVal.compare(tStart) < 0 || newVal.compare(tEnd) > 0) {
          useToast().add({
            title: "Date out of range",
            description: `The fixture date must be between the tournament start date (${formatDateDisplay(tStart)}) and end date (${formatDateDisplay(tEnd)}). Please adjust the tournament's start or end date to select this date.`,
            color: "error",
          });
          // Revert to old value
          setTimeout(() => {
            matchDateVal.value = oldVal;
          }, 0);
        }
      }
    }
  });

  const updateMatchTime = async () => {
    if (!fixture.value || !matchDateVal.value || !matchTimeVal.value) return;

    const selectedYear = matchDateVal.value.year;
    const selectedMonth = matchDateVal.value.month - 1;
    const selectedDay = matchDateVal.value.day;
    const [h, m] = matchTimeVal.value.split(":").map(Number);

    const newDate = new Date(selectedYear, selectedMonth, selectedDay, h, m);

    const t = tournament();
    if (t?.start_date && t?.end_date) {
      const startDate = new Date(t.start_date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(t.end_date);
      endDate.setHours(23, 59, 59, 999);
      if (newDate < startDate || newDate > endDate) {
        useToast().add({
          title: "Date out of range",
          description: `The fixture date must be between the tournament start date (${formatDateDisplay(parseDateString(t.start_date) || null)}) and end date (${formatDateDisplay(parseDateString(t.end_date) || null)}). Please adjust the tournament's start or end date to select this date.`,
          color: "error",
        });
        return;
      }
    }

    updatingTime.value = true;
    try {
      const newIso = newDate.toISOString();
      const newVenue = matchVenue.value || null;

      await fixtureStore.updateFixture(fixture.value.id, {
        startTime: newIso,
        venue: newVenue,
        matchDuration: matchDuration.value,
      });

      fixture.value = {
        ...fixture.value,
        startTime: newIso,
        venue: newVenue,
        matchDuration: matchDuration.value,
      };
      matchTime.value = newIso;

      onFixtureUpdated(fixture.value);

      useToast().add({
        title: "Schedule Updated",
        description: "The match schedule and duration have been updated.",
        icon: "i-heroicons-calendar",
        color: "success",
      });
    } catch (error: any) {
      handleError(error, { title: "Failed to update time" });
    } finally {
      updatingTime.value = false;
    }
  };

  const syncFromFixture = (source: Fixture | null) => {
    matchVenue.value = source?.venue || "";
    if (source?.startTime) {
      // Format correctly for native comparison
      const date = new Date(source.startTime);
      const tzOffset = date.getTimezoneOffset() * 60000;
      const localISOTime = new Date(date.getTime() - tzOffset)
        .toISOString()
        .slice(0, 16);
      matchTime.value = localISOTime;

      const isoParts = date.toISOString().split("T");
      if (isoParts[0]) {
        matchDateVal.value = parseDate(isoParts[0]);
      }

      const hours = String(date.getHours()).padStart(2, "0");
      const mins = String(date.getMinutes()).padStart(2, "0");
      matchTimeVal.value = `${hours}:${mins}`;
    } else {
      matchTime.value = "";
      matchDateVal.value = null;
      matchTimeVal.value = "";
    }
  };

  const resetSchedule = () => {
    matchVenue.value = "";
  };

  return {
    matchTime,
    matchDateVal,
    matchTimeVal,
    matchVenue,
    matchDuration,
    updatingTime,
    formatDateDisplay,
    parseDateString,
    tournamentMinDate,
    tournamentMaxDate,
    venueOptions,
    isUpdateDisabled,
    updateMatchTime,
    syncFromFixture,
    resetSchedule,
  };
}

export type MatchScheduleApi = ReturnType<typeof useMatchSchedule>;

export const MatchScheduleKey: InjectionKey<MatchScheduleApi> =
  Symbol("match-schedule");
