import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';

import { useTheme } from '@/theme';

const DOTS = 6;
const NATIVE = Platform.OS !== 'web';

/**
 * Tamamlama mikro-animasyonu: görev "bitti"ye geçtiği anda içerik yaylanarak dolar (yeşil dolum),
 * etrafında yeşil halka + küçük konfeti noktaları (yeşil / altın / turuncu) saçılır.
 * Yalnızca aynı gün içinde yapılmadı → yapıldı geçişinde oynar (gün değiştirince oynamaz).
 */
export function DonePop({ done, scope, children }: { done: boolean; scope: string; children: React.ReactNode }) {
  const p = useTheme();
  const [scale] = useState(() => new Animated.Value(1));
  const [burst] = useState(() => new Animated.Value(0));
  const prev = useRef({ done, scope });

  useEffect(() => {
    const was = prev.current;
    prev.current = { done, scope };
    if (!done || was.done || was.scope !== scope) return;
    scale.setValue(0.6);
    burst.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 180, useNativeDriver: NATIVE }),
      Animated.timing(burst, { toValue: 1, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE }),
    ]).start();
  }, [done, scope, scale, burst]);

  const fade = burst.interpolate({ inputRange: [0, 0.05, 0.7, 1], outputRange: [0, 0.9, 0.5, 0] });
  const colors = [p.success, p.gold, p.primary];

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: 44,
          height: 44,
          borderRadius: 22,
          borderWidth: 2,
          borderColor: p.success,
          opacity: fade,
          transform: [{ scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.7] }) }],
        }}
      />
      {Array.from({ length: DOTS }, (_, i) => {
        const angle = (i / DOTS) * Math.PI * 2 - Math.PI / 2;
        return (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: colors[i % colors.length],
              opacity: fade,
              transform: [
                { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * 34] }) },
                { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * 34] }) },
              ],
            }}
          />
        );
      })}
      <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
    </View>
  );
}
