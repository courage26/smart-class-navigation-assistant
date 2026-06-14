import { Ionicons } from '@expo/vector-icons';
import { useSyncExternalStore } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  findCurrentClass,
  findNextClass,
  formatMinutesToTime,
  getCurrentTimeInMinutes,
  getCurrentWeekdayName,
  getDepartureStatus,
  getTimetableSnapshot,
  subscribeToTimetable,
} from '@/utils/timetable-utils';

export default function HomeScreen() {
  const cardBackground = useThemeColor({ light: '#F1F5F9', dark: '#252B32' }, 'background');
  const cardBorder = useThemeColor({ light: '#E2E8F0', dark: '#334155' }, 'icon');
  const accent = useThemeColor({ light: '#0a7ea4', dark: '#5BC0DE' }, 'tint');
  const classBadgeWash = useThemeColor(
    { light: 'rgba(10, 126, 164, 0.12)', dark: 'rgba(91, 192, 222, 0.16)' },
    'background'
  );

  const timetable = useSyncExternalStore(subscribeToTimetable, getTimetableSnapshot);
  const currentDayName = getCurrentWeekdayName();
  const currentMinutes = getCurrentTimeInMinutes();
  const currentClass = findCurrentClass(timetable, currentDayName, currentMinutes);
  const nextClassResult = findNextClass(timetable, currentDayName, currentMinutes);
  const departureStatus = getDepartureStatus(nextClassResult, currentMinutes);

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <ThemedText
            type="title"
            style={styles.appTitle}
            accessibilityRole="header"
            accessibilityLabel="Smart Class Navigation Assistant">
            Smart Class Navigation Assistant
          </ThemedText>
          <ThemedText style={styles.tagline}>Your schedule at a glance</ThemedText>

          <View
            style={[styles.card, { backgroundColor: cardBackground, borderColor: cardBorder }]}
            accessibilityRole="none"
            accessibilityLabel={currentClass
              ? `Current class. ${currentClass.name}. ${currentClass.building ? `${currentClass.building}${currentClass.roomNumber ? ` ${currentClass.roomNumber}` : ''}` : currentClass.room || 'TBD'}. ${currentClass.startTime && currentClass.endTime ? `${currentClass.startTime} – ${currentClass.endTime}` : currentClass.time || 'Time not set'}.`
              : 'Current class. No current class.'}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBadge, { backgroundColor: classBadgeWash }]}>
                <Ionicons name="book-outline" size={22} color={accent} accessibilityElementsHidden />
              </View>
              <ThemedText type="subtitle" style={styles.cardTitle}>
                Current class
              </ThemedText>
            </View>
            {currentClass ? (
              <>
                <ThemedText type="defaultSemiBold" style={styles.courseName}>{currentClass.name}</ThemedText>
                <ThemedText style={styles.meta}>
                  {currentClass.building
                    ? `${currentClass.building}${currentClass.roomNumber ? ` ${currentClass.roomNumber}` : ''}`
                    : currentClass.room || 'TBD'}
                </ThemedText>
                <ThemedText style={styles.meta}>
                  {currentClass.startTime && currentClass.endTime
                    ? `${currentClass.startTime} – ${currentClass.endTime}`
                    : currentClass.time || 'Time not set'}
                </ThemedText>
              </>
            ) : (
              <ThemedText style={styles.meta}>No current class</ThemedText>
            )}
          </View>

          <View
            style={[styles.card, styles.alertCard, { backgroundColor: cardBackground, borderColor: cardBorder }]}
            accessibilityRole="none"
            accessibilityLabel={nextClassResult
              ? `Next class. ${nextClassResult.classItem.name}. ${nextClassResult.day}. ${nextClassResult.classItem.startTime && nextClassResult.classItem.endTime ? `${nextClassResult.classItem.startTime} – ${nextClassResult.classItem.endTime}` : nextClassResult.classItem.time || 'Time not set'}.`
              : 'Next class. No upcoming classes.'}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBadge, { backgroundColor: '#F59E0B22' }]}>
                <Ionicons name="notifications-outline" size={22} color="#F59E0B" accessibilityElementsHidden />
              </View>
              <ThemedText type="subtitle" style={styles.cardTitle}>
                Next class
              </ThemedText>
            </View>
            {nextClassResult ? (
              <>
                <ThemedText type="defaultSemiBold" style={styles.courseName}>{nextClassResult.classItem.name}</ThemedText>
                <ThemedText style={styles.meta}>{nextClassResult.day}</ThemedText>
                <ThemedText style={styles.meta}>
                  {nextClassResult.classItem.startTime && nextClassResult.classItem.endTime
                    ? `${nextClassResult.classItem.startTime} – ${nextClassResult.classItem.endTime}`
                    : nextClassResult.classItem.time || 'Time not set'}
                </ThemedText>
              </>
            ) : (
              <ThemedText style={styles.meta}>No upcoming classes</ThemedText>
            )}
          </View>

          <View
            style={[styles.card, styles.alertCard, { backgroundColor: cardBackground, borderColor: cardBorder }]}
            accessibilityRole="none"
            accessibilityLabel={`Departure status. ${departureStatus.statusMessage}${departureStatus.leaveTimeMinutes !== null ? ` Leave time ${formatMinutesToTime(departureStatus.leaveTimeMinutes)}.` : ''}`}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBadge, { backgroundColor: '#F59E0B22' }]}>
                <Ionicons name="notifications-outline" size={22} color="#F59E0B" accessibilityElementsHidden />
              </View>
              <ThemedText type="subtitle" style={styles.cardTitle}>
                Departure status
              </ThemedText>
            </View>
            {departureStatus.leaveTimeMinutes !== null ? (
              <>
                <ThemedText type="defaultSemiBold" style={styles.alertHeadline}>
                  {departureStatus.statusMessage}
                </ThemedText>
                <ThemedText style={styles.meta}>Leave time: {formatMinutesToTime(departureStatus.leaveTimeMinutes)}</ThemedText>
              </>
            ) : (
              <ThemedText style={styles.meta}>No departure status available</ThemedText>
            )}
            <View style={[styles.pill, { borderColor: accent }]}>
              <ThemedText type="defaultSemiBold" style={[styles.pillText, { color: accent }]}>Real timetable status</ThemedText>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 8,
    gap: 16,
  },
  appTitle: {
    fontSize: 26,
    lineHeight: 32,
    marginTop: 8,
  },
  tagline: {
    opacity: 0.75,
    marginTop: -4,
    marginBottom: 8,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 8,
  },
  alertCard: {
    marginTop: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
  },
  courseName: {
    fontSize: 17,
    marginTop: 4,
  },
  meta: {
    fontSize: 15,
    opacity: 0.85,
  },
  alertHeadline: {
    fontSize: 17,
    marginTop: 4,
  },
  pill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 14,
  },
});
