import AsyncStorage from '@react-native-async-storage/async-storage';

// This shared utility holds the timetable math that both screens need.
// It also keeps one live timetable source in memory so HomeScreen and
// TimetableScreen read the same up-to-date classes.

// Root cause: TimetableScreen kept its own local timetable state, while
// HomeScreen read the static starter list. That made the two screens drift.
// This store gives both screens one shared snapshot to subscribe to.

export type TimetableClass = {
  id: string;
  name: string;
  startTime?: string;
  endTime?: string;
  building?: string;
  roomNumber?: string;
  time?: string;
  room?: string;
};

export type DaySchedule = {
  day: string;
  classes: TimetableClass[];
};

export const WALKING_TIME_MINUTES = 10;
export const BUFFER_TIME_MINUTES = 5;

export const INITIAL_WEEKLY_TIMETABLE: DaySchedule[] = [
  {
    day: 'Monday',
    classes: [
      { id: 'mon-1', name: 'Introduction to Computer Science', time: '9:00 AM – 10:30 AM', room: 'Room 204' },
      { id: 'mon-2', name: 'Calculus I', time: '11:00 AM – 12:15 PM', room: 'Room 118' },
    ],
  },
  {
    day: 'Tuesday',
    classes: [
      { id: 'tue-1', name: 'English Composition', time: '10:00 AM – 11:15 AM', room: 'Room 302' },
      { id: 'tue-2', name: 'Physics Lab', time: '1:00 PM – 3:00 PM', room: 'Lab 5' },
    ],
  },
  {
    day: 'Wednesday',
    classes: [
      { id: 'wed-1', name: 'Introduction to C programming', time: '9:00 AM – 10:30 AM', room: 'Room 204' },
      { id: 'wed-2', name: 'World History', time: '2:00 PM – 3:15 PM', room: 'Room 210' },
    ],
  },
  {
    day: 'Thursday',
    classes: [
      { id: 'thu-1', name: 'Calculus I', time: '11:00 AM – 12:15 PM', room: 'Room 118' },
      { id: 'thu-2', name: 'Study Group (optional)', time: '4:00 PM – 5:00 PM', room: 'Library' },
    ],
  },
  {
    day: 'Friday',
    classes: [
      { id: 'fri-1', name: 'English Composition', time: '10:00 AM – 11:15 AM', room: 'Room 302' },
    ],
  },
];

export const WEEKDAYS = INITIAL_WEEKLY_TIMETABLE.map((entry) => entry.day);

const STORAGE_KEY = 'smart-class-navigation.timetable';

function cloneDeep<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(cloneDeep) as unknown as T;
  }

  const clonedObject: Record<string, unknown> = {};
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      clonedObject[key] = cloneDeep((value as Record<string, unknown>)[key]);
    }
  }

  return clonedObject as T;
}

let timetableSnapshot: DaySchedule[] = cloneDeep(INITIAL_WEEKLY_TIMETABLE);
const listeners = new Set<() => void>();

function isValidTimetable(value: unknown): value is DaySchedule[] {
  return Array.isArray(value) && value.every((entry) => {
    return (
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as { day?: unknown }).day === 'string' &&
      Array.isArray((entry as { classes?: unknown }).classes) &&
      ((entry as { classes?: unknown[] }).classes ?? []).every((classItem) => {
        return (
          typeof classItem === 'object' &&
          classItem !== null &&
          typeof (classItem as { id?: unknown }).id === 'string' &&
          typeof (classItem as { name?: unknown }).name === 'string'
        );
      })
    );
  });
}

async function saveTimetableToStorage(nextTimetable: DaySchedule[]): Promise<void> {
  try {
    // Saving keeps the latest timetable on the device even after the app closes.
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextTimetable));
  } catch (error) {
    // If storage fails, the app should still keep working with the in-memory list.
    console.warn('Failed to save timetable:', error);
  }
}

export async function loadTimetableFromStorage(): Promise<void> {
  try {
    // Loading restores the saved schedule automatically when the app starts.
    const savedValue = await AsyncStorage.getItem(STORAGE_KEY);
    if (!savedValue) {
      return;
    }

    const parsedValue = JSON.parse(savedValue) as unknown;
    if (!isValidTimetable(parsedValue)) {
      // If the saved data is missing or corrupted, fall back to the default timetable.
      setTimetableSnapshot(cloneDeep(INITIAL_WEEKLY_TIMETABLE));
      return;
    }

    setTimetableSnapshot(parsedValue);
  } catch (error) {
    // If loading fails, use the safe default timetable instead of crashing.
    console.warn('Failed to load timetable:', error);
    setTimetableSnapshot(cloneDeep(INITIAL_WEEKLY_TIMETABLE));
  }
}

export function getTimetableSnapshot(): DaySchedule[] {
  return timetableSnapshot;
}

export function subscribeToTimetable(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function setTimetableSnapshot(nextTimetable: DaySchedule[]): void {
  timetableSnapshot = cloneDeep(nextTimetable);
  listeners.forEach((listener) => listener());

  // Save every change so the latest timetable is still available after restart.
  void saveTimetableToStorage(timetableSnapshot);
}

// Load the saved schedule as soon as the shared utility is used.
void loadTimetableFromStorage();

export function getCurrentWeekdayName(): string {
  const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return WEEKDAY_NAMES[new Date().getDay()];
}

export function getCurrentTimeInMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function timeStringToMinutes(time: string): number | null {
  const match = /^([0-2]?\d):(\d{2})$/.exec(time.trim());
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minutes = Number(match[2]);
  if (hour < 0 || hour > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hour * 60 + minutes;
}

export function parseAmPmTime(value: string): string | null {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(value.trim());
  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();

  if (hour < 1 || hour > 12 || minutes < 0 || minutes > 59) {
    return null;
  }

  if (period === 'AM') {
    if (hour === 12) {
      hour = 0;
    }
  } else if (hour !== 12) {
    hour += 12;
  }

  return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function parseLegacyTimeRange(timeRange: string): { start: string; end: string } | null {
  const match = /^(\d{1,2}:\d{2}\s*(?:AM|PM))\s*–\s*(\d{1,2}:\d{2}\s*(?:AM|PM))$/i.exec(timeRange.trim());
  if (!match) {
    return null;
  }

  const start = parseAmPmTime(match[1]);
  const end = parseAmPmTime(match[2]);

  if (!start || !end) {
    return null;
  }

  return { start, end };
}

export function getClassMinutesRange(classItem: TimetableClass): { start: number; end: number } | null {
  if (classItem.startTime && classItem.endTime) {
    const start = timeStringToMinutes(classItem.startTime);
    const end = timeStringToMinutes(classItem.endTime);
    if (start !== null && end !== null) {
      return { start, end };
    }
  }

  if (classItem.time) {
    const parsed = parseLegacyTimeRange(classItem.time);
    if (parsed) {
      const start = timeStringToMinutes(parsed.start);
      const end = timeStringToMinutes(parsed.end);
      if (start !== null && end !== null) {
        return { start, end };
      }
    }
  }

  return null;
}

export function formatMinutesToTime(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
}

export function findCurrentClass(timetable: DaySchedule[], currentDay: string, currentMinutes: number): TimetableClass | null {
  const todaySchedule = timetable.find((dayEntry) => dayEntry.day === currentDay);
  if (!todaySchedule) {
    return null;
  }

  return (
    todaySchedule.classes.find((classItem) => {
      const range = getClassMinutesRange(classItem);
      if (!range) {
        return false;
      }
      return currentMinutes >= range.start && currentMinutes < range.end;
    }) || null
  );
}

export function findNextClass(
  timetable: DaySchedule[],
  currentDay: string,
  currentMinutes: number
): { classItem: TimetableClass; day: string } | null {
  const startIndex = WEEKDAYS.indexOf(currentDay);
  const isCurrentDayInTimetable = startIndex >= 0;
  const baseIndex = isCurrentDayInTimetable ? startIndex : 0;
  let best: { classItem: TimetableClass; day: string; absMinutes: number } | null = null;

  for (let offset = 0; offset < WEEKDAYS.length; offset++) {
    const dayIndex = (baseIndex + offset) % WEEKDAYS.length;
    const dayName = WEEKDAYS[dayIndex];
    const daySchedule = timetable.find((d) => d.day === dayName);
    if (!daySchedule) continue;

    for (const classItem of daySchedule.classes) {
      const range = getClassMinutesRange(classItem);
      if (!range) continue;

      if (isCurrentDayInTimetable && offset === 0 && range.start <= currentMinutes) {
        continue;
      }

      const abs = offset * 24 * 60 + range.start;
      if (!best || abs < best.absMinutes) {
        best = { classItem, day: dayName, absMinutes: abs };
      }
    }
  }

  return best ? { classItem: best.classItem, day: best.day } : null;
}

export function getDepartureStatus(nextClassResult: { classItem: TimetableClass; day: string } | null, currentMinutes: number): {
  leaveTimeMinutes: number | null;
  statusMessage: string;
} {
  if (!nextClassResult) {
    return { leaveTimeMinutes: null, statusMessage: 'No upcoming classes' };
  }

  const range = getClassMinutesRange(nextClassResult.classItem);
  if (!range) {
    return { leaveTimeMinutes: null, statusMessage: 'No departure time available' };
  }

  const leaveTimeMinutes = range.start - WALKING_TIME_MINUTES - BUFFER_TIME_MINUTES;
  const minutesUntilLeave = leaveTimeMinutes - currentMinutes;

  if (minutesUntilLeave > 1) {
    return { leaveTimeMinutes, statusMessage: `Leave in ${minutesUntilLeave} minutes` };
  }

  if (minutesUntilLeave >= 0) {
    return { leaveTimeMinutes, statusMessage: 'Leave now' };
  }

  return { leaveTimeMinutes, statusMessage: 'Running late' };
}
