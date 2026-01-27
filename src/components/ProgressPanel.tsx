import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ProgressPanel({success,failed,pending,totalData, processed}:any) {

    // const totalData = 100;
    // const processed = 1;

// Hitung persentase secara dinamis
  const progressPercent = (processed / totalData) * 100;

  return (
    <View style={styles.container}>
      {/* Header & Percentage */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.sectionTitle}>EXECUTION PROGRESS</Text>
          <Text style={styles.taskStatus}>PROCESSING UNIT: {processed} / {totalData}</Text>
        </View>
        <Text style={styles.percentageText}>{Math.round(progressPercent)}%</Text>
      </View>

      {/* Modern Progress Bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>

      {/* Metrics Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <MaterialCommunityIcons name="check-circle-outline" size={14} color="#10B981" />
            <Text style={styles.metricLabel}>SUCCESS</Text>
          </View>
          <Text style={[styles.metricValue, { color: '#10B981' }]}>{success}</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#EF4444" />
            <Text style={styles.metricLabel}>FAILED</Text>
          </View>
          <Text style={[styles.metricValue, { color: '#EF4444' }]}>{failed}</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <MaterialCommunityIcons name="clock-outline" size={14} color="#94A3B8" />
            <Text style={styles.metricLabel}>PENDING</Text>
          </View>
          <Text style={styles.metricValue}>{pending}</Text>
        </View>
      </View>

      {/* Footer Info */}
      <View style={styles.footerInfo}>
        <MaterialCommunityIcons name="shield-sync" size={12} color="#475569" />
        <Text style={styles.footerText}>SYSTEM STABILITY: OPTIMIZED</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1E293B", // Sedikit lebih terang dari background utama agar kontras
    borderRadius: 12,
    padding: 20,
    marginTop: 15,
    borderWidth: 1,
    borderColor: "#334155",
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 15,
  },
  sectionTitle: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  taskStatus: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  percentageText: {
    color: "#F8FAFC",
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  progressTrack: {
    height: 8,
    backgroundColor: "#0F172A",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 25,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3B82F6", // Blue accent untuk progres
    shadowColor: "#3B82F6",
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  metricsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#0F172A",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  metricLabel: {
    color: "#64748B",
    fontSize: 9,
    fontWeight: "700",
    marginLeft: 5,
    letterSpacing: 0.5,
  },
  metricValue: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  footerInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },
  footerText: {
    color: "#475569",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    marginLeft: 6,
  },
});