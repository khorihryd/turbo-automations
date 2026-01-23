import { View,Text,TouchableOpacity,StyleSheet } from 'react-native'
import React from 'react';
import AntDesign from '@expo/vector-icons/AntDesign';
import Entypo from '@expo/vector-icons/Entypo';
import { useState } from 'react';


const HeaderPanel = ({backto,HeaderTitle}:any) => {

    const [isRun,setIsRun] = useState(false);

    const toggleRun = ()=>{
        setIsRun(!isRun)
    }

  return (
        <View style={styles.headerContainer}>
        {/* Sisi Kiri: Tombol Kembali */}
        <TouchableOpacity 
            style={styles.navButton} 
            onPress={backto}
        >
            <AntDesign name="left" size={22} color="#94A3B8" />
        </TouchableOpacity>
        {/* Tengah: Judul dengan Subtitle (Opsional) */}
        <View style={styles.titleContainer}>
            <Text style={styles.mainTitle}>{HeaderTitle}</Text>
            <View style={styles.statusIndicator}>
                <View style={[styles.dot, { backgroundColor: isRun ? '#10B981' : '#64748B' }]} />
                <Text style={styles.statusText}>{isRun ? 'ACTIVE' : 'IDLE'}</Text>
            </View>
        </View>

        {/* Sisi Kanan: Kontrol Utama */}
        <TouchableOpacity 
            style={[styles.actionButton, isRun ? styles.bgStop : styles.bgRun]} 
            onPress={toggleRun}
        >
            <Entypo 
            name={isRun ? "controller-paus" : "controller-play"} 
            size={20} 
            color="#FFFFFF" 
            />
        </TouchableOpacity>
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
    backgroundColor: "#0F172A", // Deep Navy yang sangat profesional
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B", // Border halus untuk definisi
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
    letterSpacing: 2, // Memberikan kesan elegan
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
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  navButton: {
    width: 40,
    alignItems: "flex-start",
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8, // Rounded square lebih formal dibanding lingkaran penuh
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  bgRun: {
    backgroundColor: "#334155", // Slate grey untuk kondisi diam
  },
  bgStop: {
    backgroundColor: "#EF4444", // Merah yang sedikit lebih soft (Rose/Red 500)
  },
});