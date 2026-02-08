import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Kita ambil logika Progress dari ProgressPanel sebelumnya
export default function ConsolePanel({ 
  pilihFile, 
  logMsg, 
  fileName, 
  contentFile,
  // Tambahkan props progress di sini
  success, 
  failed, 
  pending, 
  totalData, 
  processed 
}: any) {

  // Hitung persentase progress
  const progressPercent = totalData ? (processed / totalData) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>SYSTEM MONITOR</Text>
        <View style={styles.liveIndicator}>
          <View style={styles.pulseDot} />
          <Text style={styles.liveText}>LIVE LOG</Text>
        </View>
      </View>

      {/* Console Log - Terminal Style */}
      <View style={styles.consoleBox}>
        <ScrollView contentContainerStyle={styles.logContainer}>
          {logMsg.length === 0 ? (
            <Text style={[styles.logText, { color: '#666' }]}>Menunggu perintah...</Text>
          ) : (
            logMsg.map((l, i) => <Text key={i} style={styles.logText}>{l}</Text>)
          )}
        </ScrollView>
      </View>

      {/* Action Section */}
      <View style={styles.actionSection}>
        <Text style={styles.inputLabel}>DATA SOURCE</Text>
        <TouchableOpacity style={styles.uploadBox} activeOpacity={0.8} onPress={pilihFile}>
          <View style={styles.uploadContent}>
            <MaterialCommunityIcons name="file-excel-outline" size={24} color="#10B981" />
            <View style={styles.uploadTextContainer}>
              {logMsg.length === 0 ? (
                <View>
                  <Text style={styles.uploadTitle}>IMPORT EXCEL</Text>
                  <Text style={styles.uploadSubtitle}>.xlsx, .csv</Text>
                </View>
              ) : (
                <View>
                  <Text style={styles.uploadTitle}>{fileName}</Text>
                  <Text style={styles.uploadSubtitle}>{contentFile}</Text>
                </View>
              )}
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#475569" />
        </TouchableOpacity>
      </View>
            {/* INTEGRASI PROGRESS PANEL (Disederhanakan agar fit) */}
      <View style={styleprogress.container}>
        {/* Header & Percentage */}
        <View style={styleprogress.headerRow}>
          <View>
            <Text style={styleprogress.sectionTitle}>EXECUTION PROGRESS</Text>
            <Text style={styleprogress.taskStatus}>PROCESSING UNIT: {processed} / {totalData}</Text>
          </View>
          <Text style={styleprogress.percentageText}>{Math.round(progressPercent)}%</Text>
        </View>

        {/* Modern Progress Bar */}
        <View style={styleprogress.progressTrack}>
          <View style={[styleprogress.progressFill, { width: `${progressPercent}%` }]} />
        </View>

        {/* Metrics Grid */}
        <View style={styleprogress.metricsGrid}>
          <View style={styleprogress.metricCard}>
            <View style={styleprogress.metricHeader}>
              <MaterialCommunityIcons name="check-circle-outline" size={14} color="#10B981" />
              <Text style={styleprogress.metricLabel}>SUCCESS</Text>
            </View>
            <Text style={[styleprogress.metricValue, { color: '#10B981' }]}>{success}</Text>
          </View>

          <View style={styleprogress.metricCard}>
            <View style={styleprogress.metricHeader}>
              <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#EF4444" />
              <Text style={styleprogress.metricLabel}>FAILED</Text>
            </View>
            <Text style={[styleprogress.metricValue, { color: '#EF4444' }]}>{failed}</Text>
          </View>

          <View style={styleprogress.metricCard}>
            <View style={styleprogress.metricHeader}>
              <MaterialCommunityIcons name="clock-outline" size={14} color="#94A3B8" />
              <Text style={styleprogress.metricLabel}>PENDING</Text>
            </View>
            <Text style={styleprogress.metricValue}>{pending}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    padding: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  liveText: {
    color: '#10B981',
    fontSize: 8,
    fontWeight: '800',
  },
  consoleBox: {
    flex: 1, // Mengambil sisa ruang yang tersedia
    backgroundColor: "#000000",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 10,
  },
  logContainer: {
    paddingBottom: 10,
  },
  logText: {
    color: "#94A3B8",
    fontFamily: "monospace",
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 2,
  },
  // Style Baru untuk Progress yang menyatu
  integratedProgress: {
    backgroundColor: "#1E293B",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  miniLabel: {
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "700",
  },
  progressValue: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  progressTrack: {
    height: 4,
    backgroundColor: "#0F172A",
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3B82F6",
  },
  miniMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    color: "#F8FAFC",
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  actionSection: {
    marginTop: 10,
  },
  inputLabel: {
    color: "#64748B",
    fontSize: 9,
    fontWeight: "700",
    marginBottom: 6,
  },
  uploadBox: {
    backgroundColor: "#1E293B",
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: "#334155",
  },
  uploadContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadTextContainer: {
    marginLeft: 10,
  },
  uploadTitle: {
    color: "#F8FAFC",
    fontSize: 11,
    fontWeight: "700",
  },
  uploadSubtitle: {
    color: "#64748B",
    fontSize: 9,
  },
});

const styleprogress = StyleSheet.create({
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
  }
})