import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

// -----------------------------------------------------------------------------
// TYPES & STARTING DATA (edit defaults here — still no database)
// -----------------------------------------------------------------------------
// `id` helps React tell rows apart when you add many classes with the same name.

type TimetableClass = {
  id: string;
  name: string;
  time: string;
  room: string;
};

type DaySchedule = {
  day: string;
  classes: TimetableClass[];
}

/** Placeholder text for classes you add with the button (change anytime below). */
const DEFAULT_ADDED_TIME = 'Time not set';
const DEFAULT_ADDED_ROOM = 'TBD';

/** Starting week — copied into state once when the screen loads. */
const INITIAL_WEEKLY_TIMETABLE: DaySchedule[] = [
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

const WEEKDAYS = INITIAL_WEEKLY_TIMETABLE.map((entry) => entry.day);

// -----------------------------------------------------------------------------
// ONE CLASS ROW
// -----------------------------------------------------------------------------

function ClassRow({
  classItem,
  isLast,
  dividerColor,
}: {
  classItem: TimetableClass;
  isLast: boolean;
  dividerColor: string;
}) {
  return (
    <View
      style={[styles.classRow, !isLast && { borderBottomWidth: 1, borderBottomColor: dividerColor }]}>
      <ThemedText type="defaultSemiBold" style={styles.className}>
        {classItem.name}
      </ThemedText>
      <ThemedText style={styles.classMeta}>{classItem.time}</ThemedText>
      <ThemedText style={styles.classMeta}>{classItem.room}</ThemedText>
    </View>
  );
}

// -----------------------------------------------------------------------------
// ONE DAY CARD
// -----------------------------------------------------------------------------

function DayCard({
  schedule,
  cardBackground,
  cardBorder,
  dividerColor,
}: {
  schedule: DaySchedule;
  cardBackground: string;
  cardBorder: string;
  dividerColor: string;
}) {
  const hasClasses = schedule.classes.length > 0;

  return (
    <View
      style={[styles.dayCard, { backgroundColor: cardBackground, borderColor: cardBorder }]}
      accessibilityLabel={`${schedule.day} timetable`}>
      <ThemedText type="subtitle" style={styles.dayTitle}>
        {schedule.day}
      </ThemedText>

      {hasClasses ? (
        schedule.classes.map((classItem, index) => (
          <ClassRow
            key={classItem.id}
            classItem={classItem}
            isLast={index === schedule.classes.length - 1}
            dividerColor={dividerColor}
          />
        ))
      ) : (
        <ThemedText style={styles.emptyDay}>No classes scheduled</ThemedText>
      )}
    </View>
  );
}

// -----------------------------------------------------------------------------
// MAIN SCREEN
// -----------------------------------------------------------------------------

export default function TimetableScreen() {
  // --- React state (lives only while the app is open — no database) ---
  // timetable: the full Mon–Fri list; updating it re-renders the cards below.
  const [timetable, setTimetable] = useState<DaySchedule[]>(INITIAL_WEEKLY_TIMETABLE);
  // selectedDay: which weekday receives the next class you add.
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  // subjectName: text from the input box (controlled input).
  const [subjectName, setSubjectName] = useState('');
  // startTime & endTime: user-provided start/end times for the class.
  // These are simple text fields (e.g. "9:00 AM").
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  // room: room/location text input (e.g. "Room 204").
  const [room, setRoom] = useState('');
  // inputError: short message when the user taps Add with an empty subject.
  const [inputError, setInputError] = useState('');

  const cardBackground = useThemeColor({ light: '#F1F5F9', dark: '#252B32' }, 'background');
  const cardBorder = useThemeColor({ light: '#E2E8F0', dark: '#334155' }, 'icon');
  const dividerColor = useThemeColor({ light: '#E2E8F0', dark: '#3D4A5C' }, 'icon');
  const accent = useThemeColor({ light: '#0a7ea4', dark: '#5BC0DE' }, 'tint');
  const inputBackground = useThemeColor({ light: '#FFFFFF', dark: '#1C2228' }, 'background');
  const inputTextColor = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor({ light: '#94A3B8', dark: '#64748B' }, 'icon');

  /** Runs when the user taps "Add class". */
  function handleAddClass() {
    const trimmedName = subjectName.trim();

    // Safe check: do not add blank or whitespace-only names.
    if (trimmedName.length === 0) {
      setInputError('Please enter a subject name.');
      return;
    }

    setInputError('');

    // Build a time string from start/end values. If both are empty, use default.
    const timeString = startTime.trim().length || endTime.trim().length
      ? `${startTime.trim() || DEFAULT_ADDED_TIME} – ${endTime.trim() || ''}`.trim()
      : DEFAULT_ADDED_TIME;

    // Use provided room or fallback to a placeholder.
    const roomString = room.trim().length ? room.trim() : DEFAULT_ADDED_ROOM;

    const newClass: TimetableClass = {
      id: `added-${Date.now()}`,
      name: trimmedName,
      time: timeString,
      room: roomString,
    };

    // Immutable update: build a new array so React detects the change and re-renders.
    setTimetable((previousTimetable) =>
      previousTimetable.map((dayEntry) =>
        dayEntry.day === selectedDay
          ? { ...dayEntry, classes: [...dayEntry.classes, newClass] }
          : dayEntry
      )
    );

    // Clear inputs so the form is ready for the next addition.
    setSubjectName('');
    setStartTime('');
    setEndTime('');
    setRoom('');
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <ThemedText type="title" style={styles.pageTitle} accessibilityRole="header">
              Weekly timetable
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Sample classes below — add your own with the form
            </ThemedText>

            {/* ----- ADD CLASS FORM ----- */}
            <View
              style={[styles.addFormCard, { backgroundColor: cardBackground, borderColor: cardBorder }]}>
              <ThemedText type="subtitle" style={styles.formTitle}>
                Add a class
              </ThemedText>

              {/* Pick which day gets the new class */}
              <ThemedText style={styles.formLabel}>Day</ThemedText>
              <View style={styles.dayRow}>
                {WEEKDAYS.map((day) => {
                  const isSelected = day === selectedDay;
                  return (
                    <Pressable
                      key={day}
                      onPress={() => setSelectedDay(day)}
                      style={[
                        styles.dayChip,
                        { borderColor: cardBorder },
                        isSelected && { backgroundColor: accent, borderColor: accent },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`Select ${day}`}>
                      <ThemedText
                        style={[styles.dayChipText, isSelected && styles.dayChipTextSelected]}
                        lightColor={isSelected ? '#FFFFFF' : undefined}
                        darkColor={isSelected ? '#FFFFFF' : undefined}>
                        {day.slice(0, 3)}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              {/* Subject name from the user */}
              <ThemedText style={styles.formLabel}>Subject name</ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: inputBackground,
                    borderColor: cardBorder,
                    color: inputTextColor,
                  },
                ]}
                value={subjectName}
                onChangeText={(text) => {
                  setSubjectName(text);
                  if (inputError) {
                    setInputError('');
                  }
                }}
                placeholder="e.g. Biology"
                placeholderTextColor={placeholderColor}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleAddClass}
                accessibilityLabel="Subject name"
              />

                {/* Start & End time inputs: side-by-side for easy entry */}
                <View style={styles.smallRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <ThemedText style={styles.formLabel}>Start time</ThemedText>
                    <TextInput
                      style={[
                        styles.textInput,
                        styles.smallInput,
                        {
                          backgroundColor: inputBackground,
                          borderColor: cardBorder,
                          color: inputTextColor,
                        },
                      ]}
                      value={startTime}
                      onChangeText={(text) => setStartTime(text)}
                      placeholder="e.g. 9:00 AM"
                      placeholderTextColor={placeholderColor}
                      accessibilityLabel="Start time"
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.formLabel}>End time</ThemedText>
                    <TextInput
                      style={[
                        styles.textInput,
                        styles.smallInput,
                        {
                          backgroundColor: inputBackground,
                          borderColor: cardBorder,
                          color: inputTextColor,
                        },
                      ]}
                      value={endTime}
                      onChangeText={(text) => setEndTime(text)}
                      placeholder="e.g. 10:30 AM"
                      placeholderTextColor={placeholderColor}
                      accessibilityLabel="End time"
                    />
                  </View>
                </View>

                {/* Room input */}
                <ThemedText style={styles.formLabel}>Room</ThemedText>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: inputBackground,
                      borderColor: cardBorder,
                      color: inputTextColor,
                    },
                  ]}
                  value={room}
                  onChangeText={(text) => setRoom(text)}
                  placeholder="e.g. Room 204"
                  placeholderTextColor={placeholderColor}
                  accessibilityLabel="Room"
                />

                {inputError.length > 0 ? (
                <ThemedText style={styles.errorText} lightColor="#B91C1C" darkColor="#FCA5A5">
                  {inputError}
                </ThemedText>
              ) : null}

              <Pressable
                onPress={handleAddClass}
                style={({ pressed }) => [
                  styles.addButton,
                  { backgroundColor: accent, opacity: pressed ? 0.85 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Add class">
                <ThemedText style={styles.addButtonText} lightColor="#FFFFFF" darkColor="#FFFFFF">
                  Add class
                </ThemedText>
              </Pressable>
            </View>

            {/* ----- DAY CARDS (read from `timetable` state) ----- */}
            {timetable.map((schedule) => (
              <DayCard
                key={schedule.day}
                schedule={schedule}
                cardBackground={cardBackground}
                cardBorder={cardBorder}
                dividerColor={dividerColor}
              />
            ))}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

// -----------------------------------------------------------------------------
// STYLES
// -----------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 14,
  },
  pageTitle: {
    fontSize: 26,
    lineHeight: 32,
    marginTop: 8,
  },
  subtitle: {
    opacity: 0.75,
    marginBottom: 6,
  },
  addFormCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  formTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.9,
    marginTop: 4,
  },
  dayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dayChipTextSelected: {
    fontWeight: '700',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
  },
  // smallRow and smallInput help lay out the start/end time fields neatly.
  smallRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  smallInput: {
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
  },
  errorText: {
    fontSize: 14,
  },
  addButton: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  dayCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  dayTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  classRow: {
    paddingVertical: 10,
    gap: 2,
  },
  className: {
    fontSize: 16,
  },
  classMeta: {
    fontSize: 14,
    opacity: 0.85,
  },
  emptyDay: {
    fontSize: 15,
    opacity: 0.7,
    fontStyle: 'italic',
  },
});
