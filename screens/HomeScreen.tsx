import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

/**
 * Demo-only data — replace with your schedule logic later.
 * Kept inline so this screen stays self-contained and needs no network.
 */
const DEMO_CURRENT_CLASS = {
  courseName: 'Introduction to Computer Science',
  room: 'Building A · Room 204',
  timeLabel: '10:00 AM – 11:15 AM',
} as const;

const DEMO_DEPARTURE_ALERT = {
  headline: 'Time to head out',
  body: 'Leave now to arrive about 5 minutes before class starts.',
  minutesUntilSuggestedLeave: 8,
} as const;

export default function HomeScreen() {
  const cardBackground = useThemeColor({ light: '#F1F5F9', dark: '#252B32' }, 'background');
  const cardBorder = useThemeColor({ light: '#E2E8F0', dark: '#334155' }, 'icon');
  const accent = useThemeColor({ light: '#0a7ea4', dark: '#5BC0DE' }, 'tint');
  const classBadgeWash = useThemeColor(
    { light: 'rgba(10, 126, 164, 0.12)', dark: 'rgba(91, 192, 222, 0.16)' },
    'background'
  );

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
            accessibilityLabel={`Current class. ${DEMO_CURRENT_CLASS.courseName}. ${DEMO_CURRENT_CLASS.room}. ${DEMO_CURRENT_CLASS.timeLabel}.`}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBadge, { backgroundColor: classBadgeWash }]}>
                <Ionicons name="book-outline" size={22} color={accent} accessibilityElementsHidden />
              </View>
              <ThemedText type="subtitle" style={styles.cardTitle}>
                Current class
              </ThemedText>
            </View>
            <ThemedText type="defaultSemiBold" style={styles.courseName}>
              {DEMO_CURRENT_CLASS.courseName}
            </ThemedText>
            <ThemedText style={styles.meta}>{DEMO_CURRENT_CLASS.room}</ThemedText>
            <ThemedText style={styles.meta}>{DEMO_CURRENT_CLASS.timeLabel}</ThemedText>
          </View>

          <View
            style={[styles.card, styles.alertCard, { backgroundColor: cardBackground, borderColor: cardBorder }]}
            accessibilityRole="none"
            accessibilityLabel={`Departure alert. ${DEMO_DEPARTURE_ALERT.headline}. ${DEMO_DEPARTURE_ALERT.body} Suggested leave in about ${DEMO_DEPARTURE_ALERT.minutesUntilSuggestedLeave} minutes.`}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBadge, { backgroundColor: '#F59E0B22' }]}>
                <Ionicons name="notifications-outline" size={22} color="#F59E0B" accessibilityElementsHidden />
              </View>
              <ThemedText type="subtitle" style={styles.cardTitle}>
                Departure alert
              </ThemedText>
            </View>
            <ThemedText type="defaultSemiBold" style={styles.alertHeadline}>
              {DEMO_DEPARTURE_ALERT.headline}
            </ThemedText>
            <ThemedText style={styles.meta}>{DEMO_DEPARTURE_ALERT.body}</ThemedText>
            <View style={[styles.pill, { borderColor: accent }]}>
              <ThemedText type="defaultSemiBold" style={[styles.pillText, { color: accent }]}>
                Suggested leave in ~{DEMO_DEPARTURE_ALERT.minutesUntilSuggestedLeave} min
              </ThemedText>
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
