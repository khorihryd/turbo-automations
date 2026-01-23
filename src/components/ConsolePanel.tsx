import { View, Text, StyleSheet, TouchableOpacity,ScrollView } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ConsolePanel() {
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
          <Text style={styles.logText}>
            <Text style={styles.timestamp}>[08:42:11]</Text> INITIALIZING AUTOMATION...
          </Text>
          <Text style={styles.logText}>
            <Text style={styles.timestamp}>[08:42:15]</Text> CONNECTING TO DATABASE...
          </Text>
          <Text style={styles.logTextHighlight}>
            <Text style={styles.timestamp}>[08:42:18]</Text> WAITING FOR DATA INPUT...
          </Text>
        </ScrollView>
      </View>

      {/* Action Section */}
      <View style={styles.actionSection}>
        <Text style={styles.inputLabel}>DATA SOURCE CONFIGURATION</Text>
        <TouchableOpacity style={styles.uploadBox} activeOpacity={0.8}>
          <View style={styles.uploadContent}>
            <MaterialCommunityIcons name="file-excel-outline" size={24} color="#10B981" />
            <View style={styles.uploadTextContainer}>
              <Text style={styles.uploadTitle}>IMPORT EXCEL DATA</Text>
              <Text style={styles.uploadSubtitle}>Supported format: .xlsx, .csv</Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#475569" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A", // Deep Navy background
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981', // Green dot
    marginRight: 6,
  },
  liveText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '800',
  },
  consoleBox: {
    flex: 1,
    backgroundColor: "#000000", // True black for terminal feel
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  logContainer: {
    paddingBottom: 10,
  },
  logText: {
    color: "#94A3B8",
    fontFamily: "monospace", // Sangat penting untuk kesan industrial
    fontSize: 12,
    lineHeight: 20,
    marginBottom: 4,
  },
  logTextHighlight: {
    color: "#F8FAFC",
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 20,
  },
  timestamp: {
    color: "#475569",
    fontWeight: "bold",
  },
  actionSection: {
    marginTop: 25,
  },
  inputLabel: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  uploadBox: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  uploadContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadTextContainer: {
    marginLeft: 15,
  },
  uploadTitle: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
  },
  uploadSubtitle: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2,
  },
});