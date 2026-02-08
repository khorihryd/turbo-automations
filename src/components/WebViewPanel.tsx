import React from 'react';
import { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { WebView } from "react-native-webview";
import { INJECTED_FUNCTIONS } from '../utils/helperFunction';

export default function WebViewPanel({url,webViewRef,pesan,onLoadEnd,success, 
  failed, 
  pending, 
  totalData, 
  processed }) {
  const progressPercent = totalData ? (processed / totalData) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Browser-style Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.dotContainer}>
          <View style={[styles.windowDot, { backgroundColor: '#EF4444' }]} />
          <View style={[styles.windowDot, { backgroundColor: '#F59E0B' }]} />
          <View style={[styles.windowDot, { backgroundColor: '#10B981' }]} />
        </View>
        
        <View style={styles.addressBar}>
          <MaterialCommunityIcons name="lock" size={12} color="#10B981" />
          <Text style={styles.addressText} numberOfLines={1}>{url}</Text>
        </View>

        <TouchableOpacity style={styles.refreshButton}>
          <MaterialCommunityIcons name="refresh" size={18} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Main WebView Area */}
      <View style={styles.webviewWrapper}>
          <WebView 
            ref={webViewRef}
            source={{ uri: url }}
            style={styles.actualWebView}
            injectedJavaScriptBeforeContentLoaded={INJECTED_FUNCTIONS}
            javaScriptEnabled
            domStorageEnabled
            onMessage={pesan}
            onLoadEnd={onLoadEnd} // <--- TAMBAHKAN BARIS INI
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
          />         
        {/* Decorative Grid Overlay (Opsional untuk kesan industrial) */}
        <View style={styles.gridOverlay} pointerEvents="none" />
      </View>

      {/* Footer Status
      <View style={styles.footerStatus}>
        <Text style={styles.footerText}>ENCRYPTION: AES-256</Text>
        <Text style={styles.footerText}>SSL: VERIFIED</Text>
      </View> */}
                  {/* INTEGRASI PROGRESS PANEL (Disederhanakan agar fit) */}
            <View style={styles.integratedProgress}>
              <View style={styles.progressHeader}>
                <Text style={styles.miniLabel}>EXECUTION: {processed}/{totalData}</Text>
                <Text style={styles.progressValue}>{Math.round(progressPercent)}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
              </View>
              
              <View style={styles.miniMetrics}>
                <View style={styles.metricItem}>
                  <MaterialCommunityIcons name="check-circle" size={12} color="#10B981" />
                  <Text style={[styles.metricText, {color: '#10B981'}]}>{success}</Text>
                </View>
                <View style={styles.metricItem}>
                  <MaterialCommunityIcons name="alert-circle" size={12} color="#EF4444" />
                  <Text style={[styles.metricText, {color: '#EF4444'}]}>{failed}</Text>
                </View>
                <View style={styles.metricItem}>
                  <MaterialCommunityIcons name="clock" size={12} color="#94A3B8" />
                  <Text style={styles.metricText}>{pending}</Text>
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
  toolbar: {
    height: 40,
    backgroundColor: "#1E293B",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#334155",
    borderBottomWidth: 0,
  },
  dotContainer: {
    flexDirection: 'row',
    gap: 6,
    marginRight: 15,
  },
  windowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  addressBar: {
    flex: 1,
    backgroundColor: "#0F172A",
    height: 26,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  addressText: {
    color: "#64748B",
    fontSize: 10,
    marginLeft: 6,
    fontFamily: "monospace",
  },
  refreshButton: {
    marginLeft: 10,
  },
  webviewWrapper: {
    flex: 1,
    backgroundColor: "#1E293B", // Sedikit lebih terang dari latar utama
    borderWidth: 1,
    borderColor: "#334155",
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  placeholderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderTitle: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: 15,
  },
  placeholderSubtitle: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    marginTop: 5,
  },
  actualWebView: {
    flex: 1,
    // backgroundColor: 'transparent',
  },
  footerStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingHorizontal: 5,
  },
  footerText: {
    color: "#334155",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  // Efek garis-garis halus untuk kesan monitor teknis
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    opacity: 0.03,
    borderWidth: 1,
    borderColor: '#F8FAFC',
  },
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
  }
});