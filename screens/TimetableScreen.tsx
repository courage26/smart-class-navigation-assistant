import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

// -----------------------------------------------------------------------------
// SAMPLE DATA (edit here — no API, no database)
// -----------------------------------------------------------------------------
// Each object is one school day. Add or remove items in `classes` to change
// what appears on that day's card. Copy a day block to add Saturday, etc.

type SampleClass = {
  /** Course name shown in bold */
  name: string;
  /** When the class runs, e.g. "9:00 AM – 10:30 AM" */
  time: string;
  /** Room or building label */
  room: string;
};

type DaySchedule = {
  /** Short label on the card header, e.g. "Monday" */
  day: string;
  /** List of classes for that day (can be empty: we show "No classes") */
  classes: SampleClass[];
};

const SAMPLE_WEEKLY_TIMETABLE: DaySchedule[] = [
  {
    day: 'Monday',
    classes: [
      { name: 'Introduction to Computer Science', time: '9:00 AM – 10:30 AM', room: 'Room 204' },
      { name: 'Calculus I', time: '11:00 AM – 12:15 PM', room: 'Room 118' },
    ],
  },
  {
    day: 'Tuesday',
    classes: [
      { name: 'English Composition', time: '10:00 AM – 11:15 AM', room: 'Room 302' },
      { name: 'Physics Lab', time: '1:00 PM – 3:00 PM', room: 'Lab 5' },
    ],
  },
  {
    day: 'Wednesday',
    classes: [
      { name: 'Introduction to Computer Science', time: '9:00 AM – 10:30 AM', room: 'Room 204' },
      { name: 'World History', time: '2:00 PM – 3:15 PM', room: 'Room 210' },
    ],
  },
  {
    day: 'Thursday',
    classes: [
      { name: 'Calculus I', time: '11:00 AM – 12:15 PM', room: 'Room 118' },
      { name: 'Study Group (optional)', time: '4:00 PM – 5:00 PM', room: 'Library' },
    ],
  },
  {
    day: 'Friday',
    classes: [
      { name: 'English Composition', time: '10:00 AM – 11:15 AM', room: 'Room 302' },
    ],
  },
];

// -----------------------------------------------------------------------------
// ONE CLASS ROW (small presentational piece — keeps the main screen readable)
// -----------------------------------------------------------------------------

function ClassRow({
  classItem,
  isLast,
  dividerColor,
}: {
  classItem: SampleClass;
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
// ONE DAY CARD (Monday, Tuesday, …)
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
      {/* Day name at the top of each card */}
      <ThemedText type="subtitle" style={styles.dayTitle}>
        {schedule.day}
      </ThemedText>

      {hasClasses ? (
        schedule.classes.map((classItem, index) => (
          <ClassRow
            key={`${schedule.day}-${classItem.name}-${index}`}
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
  // Theme-aware colors (match HomeScreen card look)
  const cardBackground = useThemeColor({ light: '#F1F5F9', dark: '#252B32' }, 'background');
  const cardBorder = useThemeColor({ light: '#E2E8F0', dark: '#334155' }, 'icon');
  const dividerColor = useThemeColor({ light: '#E2E8F0', dark: '#3D4A5C' }, 'icon');

  return (
  // Full-screen background that respects light / dark mode
    <ThemedView style={styles.screen}>
      {/* Keeps content below the notch / status bar on phones */}
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Scroll so all five day cards fit on small screens */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Page title */}
          <ThemedText type="title" style={styles.pageTitle} accessibilityRole="header">
            Weekly timetable
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Monday through Friday — sample classes only
          </ThemedText>

          {/* Loop over SAMPLE_WEEKLY_TIMETABLE — one card per weekday */}
          {SAMPLE_WEEKLY_TIMETABLE.map((schedule) => (
            <DayCard
              key={schedule.day}
              schedule={schedule}
              cardBackground={cardBackground}
              cardBorder={cardBorder}
              dividerColor={dividerColor}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

// -----------------------------------------------------------------------------
// STYLES (all layout in one place — edit sizes and spacing here)
// -----------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
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
