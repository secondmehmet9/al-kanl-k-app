import React from 'react';
import { View } from 'react-native';

import { parts } from '@/domain/dates';
import { monthName, weekdayShort } from '@/i18n/format';
import { alpha, useTheme } from '@/theme';

import { Txt } from './ui';

export interface HeatCell {
  date: string;
  /** 0–100, null = veri yok / planlı değil */
  score: number | null;
  future: boolean;
}

/** GitHub tarzı ısı haritası: sütun = hafta (Pzt üstte), renk yoğunluğu = günün skoru. */
export function Heatmap({ cells, color, today }: { cells: HeatCell[]; color?: string; today: string }) {
  const p = useTheme();
  const c = color ?? p.primary;
  const weeks: HeatCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const fill = (cell: HeatCell) => {
    if (cell.future) return 'transparent';
    if (cell.score === null) return p.track;
    if (cell.score <= 0) return alpha(p.danger, p.dark ? 0.28 : 0.16);
    return alpha(c, 0.25 + 0.75 * Math.min(1, cell.score / 100));
  };

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        <View style={{ width: 26, gap: 3, paddingTop: 16 }}>
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <View key={d} style={{ flex: 1, justifyContent: 'center', minHeight: 14 }}>
              {d % 2 === 1 ? <Txt v="small" style={{ fontSize: 10 }}>{weekdayShort(d)}</Txt> : null}
            </View>
          ))}
        </View>
        {weeks.map((week, wi) => {
          const first = week[0];
          const { m, d } = parts(first.date);
          const showMonth = d <= 7;
          return (
            <View key={first.date} style={{ flex: 1, gap: 3 }}>
              <View style={{ height: 13 }}>
                {showMonth || wi === 0 ? (
                  <Txt v="small" style={{ fontSize: 10, width: 40 }} numberOfLines={1}>
                    {monthName(showMonth ? m : parts(week[6].date).m).slice(0, 3)}
                  </Txt>
                ) : null}
              </View>
              {week.map((cell) => (
                <View
                  key={cell.date}
                  accessibilityLabel={`${cell.date}: ${cell.score === null ? '-' : Math.round(cell.score) + '%'}`}
                  style={{
                    aspectRatio: 1,
                    borderRadius: 4,
                    backgroundColor: fill(cell),
                    borderWidth: cell.date === today ? 1.5 : cell.future ? 1 : 0,
                    borderColor: cell.date === today ? p.text : p.track,
                  }}
                />
              ))}
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
        <Txt v="small" style={{ fontSize: 10 }}>%0</Txt>
        <View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: alpha(p.danger, p.dark ? 0.28 : 0.16) }} />
        {[0.25, 0.5, 0.75, 1].map((a) => (
          <View key={a} style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: alpha(c, 0.25 + 0.75 * a) }} />
        ))}
        <Txt v="small" style={{ fontSize: 10 }}>%100</Txt>
      </View>
    </View>
  );
}
