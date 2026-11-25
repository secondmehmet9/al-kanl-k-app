import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { alpha, radius, space, useTheme } from '@/theme';

type TxtVariant = 'h1' | 'h2' | 'h3' | 'body' | 'dim' | 'small' | 'label';

export function Txt({
  v = 'body',
  color,
  style,
  children,
  numberOfLines,
  center,
}: {
  v?: TxtVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
  numberOfLines?: number;
  center?: boolean;
}) {
  const p = useTheme();
  const base: Record<TxtVariant, TextStyle> = {
    h1: { fontSize: 30, fontWeight: '800', color: p.text, letterSpacing: -0.5 },
    h2: { fontSize: 20, fontWeight: '700', color: p.text },
    h3: { fontSize: 16, fontWeight: '700', color: p.text },
    body: { fontSize: 15, color: p.text },
    dim: { fontSize: 14, color: p.textDim },
    small: { fontSize: 12, color: p.textDim },
    label: { fontSize: 12, fontWeight: '700', color: p.textFaint, letterSpacing: 0.3 },
  };
  return (
    <Text numberOfLines={numberOfLines} style={[base[v], color ? { color } : null, center ? { textAlign: 'center' } : null, style]}>
      {children}
    </Text>
  );
}

export function Screen({
  children,
  scroll = true,
  padTop = true,
  footer,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  /** Sekme ekranlarında üst güvenli alan boşluğu (başlıksız ekranlar). */
  padTop?: boolean;
  footer?: React.ReactNode;
}) {
  const p = useTheme();
  const insets = useSafeAreaInsets();
  const top = padTop ? insets.top + space.md : space.md;
  const inner: ViewStyle = {
    paddingHorizontal: space.lg,
    paddingTop: top,
    paddingBottom: space.xxl + (footer ? 72 : 0),
    gap: space.md,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  };
  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={inner}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[inner, { flex: 1 }]}>{children}</View>
      )}
      {footer}
    </View>
  );
}

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const p = useTheme();
  const s: ViewStyle = {
    backgroundColor: p.card,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: p.border,
    gap: space.sm,
  };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [s, style, pressed ? { opacity: 0.85 } : null]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[s, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  kind = 'primary',
  disabled,
  loading,
  icon,
  small,
  style,
  testID,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'soft' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const p = useTheme();
  const bg = { primary: p.primary, soft: p.primarySoft, ghost: 'transparent', danger: alpha(p.danger, 0.12) }[kind];
  const fg = { primary: p.onPrimary, soft: p.primary, ghost: p.textDim, danger: p.danger }[kind];
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderRadius: radius.md,
          paddingVertical: small ? 8 : 14,
          paddingHorizontal: small ? 12 : 18,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 6,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
          borderWidth: kind === 'ghost' ? 1 : 0,
          borderColor: p.border,
        },
        style,
      ]}>
      {loading ? <ActivityIndicator color={fg} size="small" /> : null}
      {icon && !loading ? <Text style={{ fontSize: small ? 13 : 16 }}>{icon}</Text> : null}
      <Text style={{ color: fg, fontWeight: '700', fontSize: small ? 13 : 16 }}>{title}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  color,
  icon,
  testID,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
  icon?: string;
  testID?: string;
}) {
  const p = useTheme();
  const c = color ?? p.primary;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radius.pill,
        backgroundColor: selected ? alpha(c, p.dark ? 0.28 : 0.14) : p.cardAlt,
        borderWidth: 1.5,
        borderColor: selected ? c : 'transparent',
        opacity: pressed ? 0.8 : 1,
      })}>
      {icon ? <Text style={{ fontSize: 14 }}>{icon}</Text> : null}
      <Text style={{ color: selected ? (p.dark ? p.text : c) : p.textDim, fontWeight: selected ? '700' : '500', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function Row({ children, style, wrap, gap = space.sm }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; wrap?: boolean; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

export function Field({ label, hint, style, ...rest }: TextInputProps & { label?: string; hint?: string }) {
  const p = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label ? <Txt v="label">{label}</Txt> : null}
      <TextInput
        placeholderTextColor={p.textFaint}
        accessibilityLabel={label}
        {...rest}
        style={[
          {
            backgroundColor: p.cardAlt,
            color: p.text,
            borderRadius: radius.md,
            paddingHorizontal: 14,
            paddingVertical: Platform.OS === 'ios' ? 13 : 10,
            fontSize: 16,
            borderWidth: 1,
            borderColor: p.border,
          },
          style,
        ]}
      />
      {hint ? <Txt v="small">{hint}</Txt> : null}
    </View>
  );
}

export function ProgressBar({ value, color, height = 8 }: { value: number; color?: string; height?: number }) {
  const p = useTheme();
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <View style={{ height, borderRadius: height, backgroundColor: p.track, overflow: 'hidden' }}>
      <View style={{ width: `${pct}%`, height, borderRadius: height, backgroundColor: color ?? p.primary }} />
    </View>
  );
}

export function SectionTitle({ children, right }: { children: string; right?: React.ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: space.sm }}>
      <Txt v="label">{children}</Txt>
      {right}
    </Row>
  );
}

export function EmptyState({ icon, title, body, children }: { icon: string; title: string; body?: string; children?: React.ReactNode }) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: space.xl, gap: space.md }}>
      <Text style={{ fontSize: 44 }}>{icon}</Text>
      <Txt v="h2" center>
        {title}
      </Txt>
      {body ? (
        <Txt v="dim" center>
          {body}
        </Txt>
      ) : null}
      {children}
    </Card>
  );
}

export function Stepper({ value, onChange, min = 1, max = 99, suffix }: { value: number; onChange: (v: number) => void; min?: number; max?: number; suffix?: string }) {
  const p = useTheme();
  const btn = (label: string, delta: number, a11y: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={() => onChange(Math.min(max, Math.max(min, value + delta)))}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: p.cardAlt,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}>
      <Text style={{ color: p.text, fontSize: 20, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
  return (
    <Row>
      {btn('−', -1, t('a11y.decrease'))}
      <Txt v="h3" style={{ minWidth: 64, textAlign: 'center' }}>
        {value}
        {suffix ? ` ${suffix}` : ''}
      </Txt>
      {btn('+', 1, t('a11y.increase'))}
    </Row>
  );
}

/** Platformlar arası onay kutusu (react-native-web'de Alert.alert çalışmaz). */
export function confirmAction(title: string, message: string, onOk: () => void, okLabel?: string) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onOk();
    return;
  }
  Alert.alert(title, message, [
    { text: t('common.cancel'), style: 'cancel' },
    { text: okLabel ?? t('common.ok'), style: 'destructive', onPress: onOk },
  ]);
}

export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    globalThis.alert?.(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
