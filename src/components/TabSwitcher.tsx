import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';

type TabType = "console" | "webview";

interface TabSwitcherProps {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
}

interface TabProps {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.symbol;
  active: boolean;
  onPress: () => void;
}

export default function TabSwitcher({ activeTab, onChange }: TabSwitcherProps) {
  return (
    <View style={styles.outerContainer}>
      <View style={styles.tabContainer}>
        <Tab
          label="CONSOLE"
          icon="console"
          active={activeTab === "console"}
          onPress={() => onChange("console")}
        />
        <Tab
          label="WEBVIEW"
          icon="web"
          active={activeTab === "webview"}
          onPress={() => onChange("webview")}
        />
      </View>
    </View>
  );
}

function Tab({ label, icon, active, onPress }: TabProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.tab, active && styles.activeTab]}
      onPress={onPress}
    >
      <View style={styles.tabContent}>
        <MaterialCommunityIcons 
          name={icon as any} 
          size={16} 
          color={active ? "#F8FAFC" : "#64748B"} 
          style={styles.icon}
        />
        <Text style={[styles.tabText, active && styles.activeText]}>{label}</Text>
      </View>
      {active && <View style={styles.activeIndicator} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#0F172A", // Dasar Navy utama
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#1E293B", // Sedikit lebih terang untuk track
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: "#334155",
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 6,
    position: 'relative',
  },
  activeTab: {
    backgroundColor: "#334155", // Slate untuk highlight tab aktif
    // Memberikan sedikit elevasi visual
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  tabText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  activeText: {
    color: "#F8FAFC",
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -4,
    width: 20,
    height: 2,
    backgroundColor: "#3B82F6", // Garis aksen kecil di bawah untuk kesan modern
    borderRadius: 2,
  }
}); 