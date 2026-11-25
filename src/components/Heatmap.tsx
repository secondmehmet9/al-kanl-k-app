import React from 'react';
import { View } from 'react-native';

import { parts } from '@/domain/dates';
import { monthName, weekdayShort } from '@/i18n/format';
import { heatColor, useTheme } from '@/theme';

import { Txt } from './ui';

export interface HeatCell {
  date: string;
  /** 0–100, null = veri yok / planlı değil */
  score: number | null;
  future: boolean;
}

/** GitHub tarzı ısı haritası: sütun = hafta (Pzt üstte), 5 kademeli turuncu ölçek = günün skoru. */
export function Heatmap({ cells, today }: { cells: HeatCell[]; today: string }) {
  const p = useTheme();
  const weeks: HeatCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const fill = (cell: HeatCell) => {
    if (cell.future) return 'transparent';
    return heatColor(p, cell.score ?? 0);
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
          // Ay etiketi: ayın ilk haftasında; ilk sütunda yalnızca sonraki etiketle çakışmayacaksa.
          const showMonth = d <= 7;
          const showFirst = wi === 0 && d > 7 && d <= 21;
          return (
            <View key={first.date} style={{ flex: 1, gap: 3 }}>
              <View style={{ height: 13, zIndex: 1 }}>
                {showMonth || showFirst ? (
                  <View style={{ position: 'absolute', left: 0, top: 0, width: 44 }}>
                    <Txt v="small" style={{ fontSize: 10 }}>{monthName(m).slice(0, 3)}</Txt>
                  </View>
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
                    borderColor: cell.date === today ? p.text : p.border,
                  }}
                />
              ))}
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
        <Txt v="small" style={{ fontSize: 10 }}>%0</Txt>
        {p.heat.map((h) => (
          <View key={h} style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: h }} />
        ))}
        <Txt v="small" style={{ fontSize: 10 }}>%100</Txt>
      </View>
    </View>
  );
}
