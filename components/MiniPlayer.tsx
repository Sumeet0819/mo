import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { MotiView } from 'moti';
import { usePathname, useRouter } from 'expo-router';

export const MiniPlayer: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { id: 'home', icon: 'home-outline', route: '/' },
    { id: 'tracks', icon: 'list-outline', route: '/tracks' },
    { id: 'sync', icon: 'sync-outline', route: '' },
    { id: 'bookmark', icon: 'bookmark-outline', route: '' },
    { id: 'settings', icon: 'settings-outline', route: '' },
  ];

  // Since we removed play/pause earlier, there are 4 tabs originally. Wait, my previous code had 4 tabs: home, list, bookmark, settings.
  // Let's stick to those 4.
  const activeTabs = [
    { id: 'home', icon: 'home-outline', route: '/' },
    { id: 'tracks', icon: 'list-outline', route: '/tracks' },
    { id: 'bookmark', icon: 'bookmark-outline', route: '' },
    { id: 'settings', icon: 'settings-outline', route: '' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        
        {activeTabs.map((tab) => {
          const isActive = pathname === tab.route;
          return (
            <TouchableOpacity 
              key={tab.id}
              style={styles.iconButton}
              onPress={() => {
                if (tab.route) {
                  router.push(tab.route as any);
                }
              }}
              activeOpacity={0.7}
            >
              <MotiView
                animate={{
                  backgroundColor: isActive ? theme.accent : 'transparent',
                  scale: isActive ? 1.12 : 1,
                }}
                transition={{
                  type: 'spring',
                  damping: 14,
                  stiffness: 200,
                }}
                style={styles.animatedBg}
              >
                <Ionicons 
                  name={tab.icon as any} 
                  size={24} 
                  color={isActive ? theme.textDark : theme.textPrimary} 
                />
              </MotiView>
            </TouchableOpacity>
          );
        })}

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: '#1E1E21', // Dark grey pill
    borderRadius: 40,
    width: '100%',
    padding: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  iconButton: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animatedBg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
