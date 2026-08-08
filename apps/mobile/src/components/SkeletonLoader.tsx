import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const SkeletonLoader = ({ isLineMode }: { isLineMode: boolean }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  const backgroundColor = isLineMode ? '#3A4252' : '#E5E7EB'; 

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Animated.View style={[styles.box, { backgroundColor, opacity, width: width * 0.43, height: 100 }]} />
        <Animated.View style={[styles.box, { backgroundColor, opacity, width: width * 0.43, height: 100 }]} />
      </View>
      
      {[1, 2, 3, 4, 5].map((item) => (
        <View key={item} style={styles.listItem}>
           <Animated.View style={[styles.circle, { backgroundColor, opacity }]} />
           <View style={styles.listTextContainer}>
             <Animated.View style={[styles.line, { backgroundColor, opacity, width: '80%' }]} />
             <Animated.View style={[styles.line, { backgroundColor, opacity, width: '50%', marginTop: 12 }]} />
           </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  box: {
    borderRadius: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  listTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  line: {
    height: 16,
    borderRadius: 8,
  },
});
