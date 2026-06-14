import { useState, useSyncExternalStore } from 'react';
import {
  Alert,
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
import {
  DaySchedule,
  TimetableClass,
  WEEKDAYS,
  findCurrentClass,
  findNextClass,
  formatMinutesToTime,
  getCurrentTimeInMinutes,
  getCurrentWeekdayName,
  getDepartureStatus,
  getTimetableSnapshot,
  setTimetableSnapshot,
  subscribeToTimetable,
} from '@/utils/timetable-utils';

// -----------------------------------------------------------------------------
// TYPES & STARTING DATA (edit defaults here — still no database)
// -----------------------------------------------------------------------------
// `id` helps React tell rows apart when you add many classes with the same name.

/** Placeholder text for classes you add with the button (change anytime below). */
const DEFAULT_ADDED_TIME = 'Time not set';
const DEFAULT_ADDED_ROOM = 'TBD';

const BUILDINGS = [
  'Changhak Hall',
  'Future Hall',
  'Imagination Hall',
  'International Hall',
  'Dasan Hall',
  'Frontier Hall',
  '100th Anniversary Hall',
  'Dareuk Hall',
];

/**
 * Normalize a time input string into 24-hour HH:MM format.
 * Accepts 9, 13, 930, 1330, and normal HH:MM values.
 * Returns null for invalid inputs.
 */
function normalizeTimeInput(value: string): string | null {
  const text = value.trim();
  if (text.length === 0) {
    return null;
  }

  // Allow plain 1-2 digit hour values like 9 or 13.
  if (/^\d{1,2}$/.test(text)) {
    const hour = Number(text);
    if (hour >= 0 && hour <= 23) {
      return `${hour.toString().padStart(2, '0')}:00`;
    }
    return null;
  }

  // Allow compact 3-4 digit values like 930 or 1330.
  if (/^\d{3,4}$/.test(text)) {
    const minutes = Number(text.slice(-2));
    const hour = Number(text.slice(0, text.length - 2));
    if (hour >= 0 && hour <= 23 && minutes >= 0 && minutes <= 59) {
      return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    return null;
  }

  // Allow standard HH:MM values.
  if (/^\d{1,2}:\d{2}$/.test(text)) {
    const [hourText, minuteText] = text.split(':');
    const hour = Number(hourText);
    const minutes = Number(minuteText);
    if (hour >= 0 && hour <= 23 && minutes >= 0 && minutes <= 59) {
      return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }

  return null;
}


// -----------------------------------------------------------------------------
// ONE CLASS ROW
// -----------------------------------------------------------------------------

function ClassRow({
  classItem,
  isLast,
  dividerColor,
  isSelected,
  onToggle,
}: {
  classItem: TimetableClass;
  isLast: boolean;
  dividerColor: string;
  isSelected: boolean;
  onToggle: (classId: string) => void;
}) {
  const timeLabel = classItem.startTime && classItem.endTime
    ? `${classItem.startTime} – ${classItem.endTime}`
    : classItem.time || DEFAULT_ADDED_TIME;

  const locationLabel = classItem.building
    ? `${classItem.building}${classItem.roomNumber ? ` ${classItem.roomNumber}` : ''}`
    : classItem.room || DEFAULT_ADDED_ROOM;

  return (
    <Pressable
      onPress={() => onToggle(classItem.id)}
      style={[
        styles.classRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: dividerColor },
        isSelected && styles.classRowSelected,
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      accessibilityLabel={`${classItem.name} - toggle selection`}>
      <View style={styles.classRowContent}>
        {/* Checkbox indicator */}
        <View
          style={[
            styles.checkbox,
            isSelected && styles.checkboxSelected,
            { borderColor: dividerColor },
          ]}>
          {isSelected && <ThemedText style={styles.checkmark}>✓</ThemedText>}
        </View>

        {/* Class info */}
        <View style={styles.classInfo}>
          <ThemedText type="defaultSemiBold" style={styles.className}>
            {classItem.name}
          </ThemedText>
          <ThemedText style={styles.classMeta}>{timeLabel}</ThemedText>
          <ThemedText style={styles.classMeta}>{locationLabel}</ThemedText>
        </View>
      </View>
    </Pressable>
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
  selectedClassIds,
  onToggleSelection,
}: {
  schedule: DaySchedule;
  cardBackground: string;
  cardBorder: string;
  dividerColor: string;
  selectedClassIds: Set<string>;
  onToggleSelection: (classId: string) => void;
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
            isSelected={selectedClassIds.has(classItem.id)}
            onToggle={onToggleSelection}
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
  // timetable: the shared Mon–Fri list that both screens read from.
  const timetable = useSyncExternalStore(subscribeToTimetable, getTimetableSnapshot);
  // selectedDay: which weekday receives the next class you add.
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  // subjectName: text from the input box (controlled input).
  const [subjectName, setSubjectName] = useState('');
  // startTime/endTime: typed by the user and normalized before saving.
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  // selectedBuilding: choose a building from the picker.
  const [selectedBuilding, setSelectedBuilding] = useState<string>(BUILDINGS[0]);
  // roomNumber: numeric room input only (e.g. 105).
  const [roomNumber, setRoomNumber] = useState('');
  // inputError: short message when the user taps Add with missing/invalid values.
  const [inputError, setInputError] = useState('');
  // selectedClassIds: tracks which classes the user has selected for deletion.
  // Using Set<string> for fast lookups and avoiding duplicate IDs.
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());

  const cardBackground = useThemeColor({ light: '#F1F5F9', dark: '#252B32' }, 'background');
  const cardBorder = useThemeColor({ light: '#E2E8F0', dark: '#334155' }, 'icon');
  const dividerColor = useThemeColor({ light: '#E2E8F0', dark: '#3D4A5C' }, 'icon');
  const accent = useThemeColor({ light: '#0a7ea4', dark: '#5BC0DE' }, 'tint');
  const inputBackground = useThemeColor({ light: '#FFFFFF', dark: '#1C2228' }, 'background');
  const inputTextColor = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor({ light: '#94A3B8', dark: '#64748B' }, 'icon');

  // Determine the current day and current minutes from the system clock.
  // We then look up today's classes in the existing timetable state.
  const currentDayName = getCurrentWeekdayName();
  const currentMinutes = getCurrentTimeInMinutes();
  const currentClass = findCurrentClass(timetable, currentDayName, currentMinutes);
  // Find the next upcoming class (could be later today or on a future weekday).
  const nextClassResult = findNextClass(timetable, currentDayName, currentMinutes);
  const departureStatus = getDepartureStatus(nextClassResult, currentMinutes);

  /** Runs when the user taps "Add class". */
  function handleAddClass() {
    const trimmedName = subjectName.trim();
    const normalizedStartTime = normalizeTimeInput(startTime);
    const normalizedEndTime = normalizeTimeInput(endTime);

    // Safe check: do not add blank or whitespace-only names.
    if (trimmedName.length === 0) {
      setInputError('Please enter a subject name.');
      return;
    }

    // If the user typed any time, both times must be valid.
    if ((startTime.trim().length > 0 || endTime.trim().length > 0) && (!normalizedStartTime || !normalizedEndTime)) {
      setInputError('Please enter valid start and end times in 24-hour format.');
      return;
    }

    // If one time is missing while the other is set, require both.
    if ((startTime.trim().length > 0 && endTime.trim().length === 0) || (startTime.trim().length === 0 && endTime.trim().length > 0)) {
      setInputError('Please enter both start time and end time, or leave both blank.');
      return;
    }

    setInputError('');

    const newClass: TimetableClass = {
      id: `added-${Date.now()}`,
      name: trimmedName,
      startTime: normalizedStartTime ?? undefined,
      endTime: normalizedEndTime ?? undefined,
      building: selectedBuilding,
      roomNumber: roomNumber.trim().length > 0 ? roomNumber.trim() : undefined,
    };

    // Immutable update: build a new array and write it to the shared store.
    const nextTimetable = timetable.map((dayEntry) =>
      dayEntry.day === selectedDay
        ? { ...dayEntry, classes: [...dayEntry.classes, newClass] }
        : dayEntry
    );
    setTimetableSnapshot(nextTimetable);

    // Clear inputs so the form is ready for the next addition.
    setSubjectName('');
    setStartTime('');
    setEndTime('');
    setRoomNumber('');
  }

  /**
   * Toggle the selection state of a class.
   * If the class is already selected, remove it; otherwise, add it.
   */
  function handleToggleSelection(classId: string) {
    setSelectedClassIds((previousSelected) => {
      const newSelected = new Set(previousSelected);
      if (newSelected.has(classId)) {
        newSelected.delete(classId);
      } else {
        newSelected.add(classId);
      }
      return newSelected;
    });
  }

  /**
   * Show a confirmation dialog and delete selected classes if confirmed.
   * Uses immutable state updates to ensure React detects the change.
   */
  function handleDeleteSelected() {
    const count = selectedClassIds.size;
    if (count === 0) {
      return;
    }

    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete the selected classes?',
      [
        {
          text: 'Cancel',
          onPress: () => {
            // User cancelled; do nothing.
          },
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: () => {
            // Delete confirmed: remove all selected classes from timetable.
            const nextTimetable = timetable.map((dayEntry) => ({
              ...dayEntry,
              classes: dayEntry.classes.filter((cls) => !selectedClassIds.has(cls.id)),
            }));
            setTimetableSnapshot(nextTimetable);
            // Clear the selection after deletion.
            setSelectedClassIds(new Set());
          },
          style: 'destructive',
        },
      ]
    );
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

            {/* ----- CURRENT CLASS CARD ----- */}
            <View style={[styles.currentClassCard, { backgroundColor: cardBackground, borderColor: cardBorder }]}> 
              <ThemedText type="subtitle" style={styles.currentClassTitle}>
                Current Class
              </ThemedText>
              {currentClass ? (
                <>
                  <ThemedText style={styles.className}>{currentClass.name}</ThemedText>
                  <ThemedText style={styles.classMeta}>
                    {currentClass.startTime && currentClass.endTime
                      ? `${currentClass.startTime} – ${currentClass.endTime}`
                      : currentClass.time || DEFAULT_ADDED_TIME}
                  </ThemedText>
                  <ThemedText style={styles.classMeta}>
                    {currentClass.building
                      ? `${currentClass.building}${currentClass.roomNumber ? ` ${currentClass.roomNumber}` : ''}`
                      : currentClass.room || DEFAULT_ADDED_ROOM}
                  </ThemedText>
                </>
              ) : (
                <ThemedText style={styles.emptyDay}>No current class</ThemedText>
              )}
            </View>
            
            {/* ----- NEXT CLASS CARD ----- */}
            <View style={[styles.currentClassCard, { backgroundColor: cardBackground, borderColor: cardBorder }]}> 
              <ThemedText type="subtitle" style={styles.currentClassTitle}>
                Next Class
              </ThemedText>
              {nextClassResult ? (
                <>
                  <ThemedText style={styles.className}>{nextClassResult.classItem.name}</ThemedText>
                  <ThemedText style={styles.classMeta}>
                    {nextClassResult.day} • {nextClassResult.classItem.startTime && nextClassResult.classItem.endTime
                      ? `${nextClassResult.classItem.startTime} - ${nextClassResult.classItem.endTime}`
                      : nextClassResult.classItem.time || DEFAULT_ADDED_TIME}
                  </ThemedText>
                  <ThemedText style={styles.classMeta}>
                    {nextClassResult.classItem.building
                      ? `${nextClassResult.classItem.building} ${nextClassResult.classItem.roomNumber ?? ''}`.trim()
                      : nextClassResult.classItem.room || DEFAULT_ADDED_ROOM}
                  </ThemedText>
                </>
              ) : (
                <ThemedText style={styles.emptyDay}>No upcoming classes</ThemedText>
              )}
            </View>

            {/* ----- DEPARTURE STATUS CARD ----- */}
            <View style={[styles.currentClassCard, { backgroundColor: cardBackground, borderColor: cardBorder }]}> 
              <ThemedText type="subtitle" style={styles.currentClassTitle}>
                Departure Status
              </ThemedText>
              {departureStatus.leaveTimeMinutes !== null ? (
                <>
                  <ThemedText style={styles.className}>
                    Leave Time: {formatMinutesToTime(departureStatus.leaveTimeMinutes)}
                  </ThemedText>
                  <ThemedText style={styles.classMeta}>{departureStatus.statusMessage}</ThemedText>
                </>
              ) : (
                <ThemedText style={styles.emptyDay}>No departure status available</ThemedText>
              )}
            </View>

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

              {/* Pick building from a mobile-friendly list */}
              <ThemedText style={styles.formLabel}>Building</ThemedText>
              <View style={styles.buildingRow}>
                {BUILDINGS.map((building) => {
                  const isSelected = building === selectedBuilding;
                  return (
                    <Pressable
                      key={building}
                      onPress={() => setSelectedBuilding(building)}
                      style={[
                        styles.dayChip,
                        { borderColor: cardBorder },
                        isSelected && { backgroundColor: accent, borderColor: accent },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`Select ${building}`}>
                      <ThemedText
                        style={[styles.dayChipText, isSelected && styles.dayChipTextSelected]}
                        lightColor={isSelected ? '#FFFFFF' : undefined}
                        darkColor={isSelected ? '#FFFFFF' : undefined}>
                        {building}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

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
                    onChangeText={(text) => {
                      setStartTime(text);
                      if (inputError) {
                        setInputError('');
                      }
                    }}
                    onBlur={() => {
                      const normalized = normalizeTimeInput(startTime);
                      if (normalized) {
                        setStartTime(normalized);
                      }
                    }}
                    placeholder="e.g. 9, 09:00, 930, 13:30"
                    placeholderTextColor={placeholderColor}
                    keyboardType="numeric"
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
                    onChangeText={(text) => {
                      setEndTime(text);
                      if (inputError) {
                        setInputError('');
                      }
                    }}
                    onBlur={() => {
                      const normalized = normalizeTimeInput(endTime);
                      if (normalized) {
                        setEndTime(normalized);
                      }
                    }}
                    placeholder="e.g. 10, 1030, 18:45"
                    placeholderTextColor={placeholderColor}
                    keyboardType="numeric"
                    accessibilityLabel="End time"
                  />
                </View>
              </View>

              {/* Room number only */}
              <ThemedText style={styles.formLabel}>Room number</ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: inputBackground,
                    borderColor: cardBorder,
                    color: inputTextColor,
                  },
                ]}
                value={roomNumber}
                onChangeText={(text) => {
                  setRoomNumber(text.replace(/[^0-9]/g, ''));
                  if (inputError) {
                    setInputError('');
                  }
                }}
                placeholder="e.g. 105"
                placeholderTextColor={placeholderColor}
                keyboardType="numeric"
                accessibilityLabel="Room number"
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

            {/* Show Delete Selected button only when classes are selected */}
            {selectedClassIds.size > 0 && (
              <Pressable
                onPress={handleDeleteSelected}
                style={({ pressed }) => [
                  styles.deleteButton,
                  { backgroundColor: '#DC2626', opacity: pressed ? 0.85 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${selectedClassIds.size} selected class${selectedClassIds.size !== 1 ? 'es' : ''}`}>
                <ThemedText style={styles.deleteButtonText} lightColor="#FFFFFF" darkColor="#FFFFFF">
                  Delete Selected ({selectedClassIds.size})
                </ThemedText>
              </Pressable>
            )}

            {/* ----- DAY CARDS (read from `timetable` state) ----- */}
            {timetable.map((schedule) => (
              <DayCard
                key={schedule.day}
                schedule={schedule}
                cardBackground={cardBackground}
                cardBorder={cardBorder}
                dividerColor={dividerColor}
                selectedClassIds={selectedClassIds}
                onToggleSelection={handleToggleSelection}
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
  currentClassCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  currentClassTitle: {
    fontSize: 18,
    marginBottom: 4,
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
  buildingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
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
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Highlight the row when a class is selected
  classRowSelected: {
    opacity: 0.8,
  },
  // Container for checkbox and class info
  classRowContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 10,
  },
  // Checkbox styling: a small box that shows selection state
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  // Selected checkbox appearance
  checkboxSelected: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4',
  },
  // Checkmark inside selected checkbox
  checkmark: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Class info section (name, time, location)
  classInfo: {
    flex: 1,
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
  // Delete Selected button styling
  deleteButton: {
    marginTop: 8,
    marginHorizontal: 0,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
