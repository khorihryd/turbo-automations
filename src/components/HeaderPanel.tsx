import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import React from 'react';
import AntDesign from '@expo/vector-icons/AntDesign';
import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';

interface HeaderPanelProps {
  onRun: () => void;
  onStop?: () => void;
  onExport?: () => void;
  isRun: boolean;
  backto: () => void;
  HeaderTitle: string;
  exportDisabled?: boolean;
  hasResults?: boolean;
}

const HeaderPanel: React.FC<HeaderPanelProps> = ({
  onRun,
  onStop,
  onExport,
  isRun,
  backto,
  HeaderTitle,
  exportDisabled = true,
  hasResults = false
}) => {

  const handleRunPress = () => {
    if (isRun && onStop) {
      onStop();
    } else {
      onRun();
    }
  };

  const handleExportPress = () => {
    if (exportDisabled) {
      Alert.alert(
        'Tidak ada data',
        'Tidak ada hasil yang dapat diexport',
        [{ text: 'OK' }]
      );
      return;
    }
    if (onExport) {
      onExport();
    }
  };

  return (
    <View style={styles.headerContainer}>
      {/* Sisi Kiri: Tombol Kembali */}
      <TouchableOpacity 
        style={styles.navButton} 
        onPress={backto}
        disabled={isRun}
      >
        <AntDesign 
          name="left" 
          size={22} 
          color={isRun ? "#475569" : "#94A3B8"} 
        />
      </TouchableOpacity>

      {/* Tengah: Judul dengan Subtitle */}
      <View style={styles.titleContainer}>
        <Text style={styles.mainTitle}>{HeaderTitle}</Text>
        <View style={styles.statusIndicator}>
          <View style={[
            styles.dot, 
            { 
              backgroundColor: isRun ? '#10B981' : 
                              hasResults ? '#3B82F6' : 
                              '#64748B' 
            }
          ]} />
          <Text style={styles.statusText}>
            {isRun ? 'RUNNING' : 
             hasResults ? 'DATA READY' : 
             'IDLE'}
          </Text>
        </View>
      </View>

      {/* Sisi Kanan: Kontrol Utama */}
      <View style={styles.rightActions}>
        {/* Tombol Export */}
        {onExport && (
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              styles.exportButton,
              exportDisabled && styles.buttonDisabled
            ]}
            onPress={handleExportPress}
            disabled={exportDisabled || isRun}
          >
            <FontAwesome5 
              name="file-export" 
              size={16} 
              color={exportDisabled ? "#64748B" : "#FFFFFF"} 
            />
            {hasResults && !exportDisabled && (
              <View style={styles.dataBadge}>
                <Text style={styles.badgeText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Tombol Run/Stop */}
        <TouchableOpacity 
          style={[
            styles.actionButton, 
            isRun ? styles.bgStop : styles.bgRun,
            isRun && styles.pulseAnimation
          ]} 
          onPress={handleRunPress}
        >
          <Entypo 
            name={isRun ? "controller-stop" : "controller-play"} 
            size={20} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default HeaderPanel

const styles = StyleSheet.create({
  headerContainer: {
    height: 64,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0F172A",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mainTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  statusText: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  exportButton: {
    backgroundColor: "#2563EB",
    position: 'relative',
  },
  bgRun: {
    backgroundColor: "#10B981",
  },
  bgStop: {
    backgroundColor: "#EF4444",
  },
  buttonDisabled: {
    backgroundColor: "#334155",
    opacity: 0.5,
  },
  dataBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#10B981",
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: "#0F172A",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "bold",
  },
  // Animation for running state
  pulseAnimation: {
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 4,
  },
});

// Tambahkan animasi untuk tombol running
const pulseKeyframes = `
  @keyframes pulse {
    0% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
    }
    70% {
      transform: scale(1.05);
      box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
    }
    100% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
    }
  }
`;

// Tambahkan style ini jika menggunakan styled-components
// Atau gunakan library animasi seperti react-native-reanimated