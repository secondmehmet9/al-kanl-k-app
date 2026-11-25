#!/usr/bin/env python3
"""Web önizleme / ekran görüntüsü için ÖRNEK veri üretir (uygulamaya gömülü değildir).
Çıktı: localStorage 'aliskanlik:v1' anahtarına yazılacak JSON. Kullanım: python3 scripts/demo-seed.py [YYYY-MM-DD]"""
import datetime as dt
import json
import random
import sys
import uuid

today = dt.date.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else dt.date.today()
rnd = random.Random(7)
start = today - dt.timedelta(days=76)
iso = lambda d: d.isoformat()
now = dt.datetime(today.year, today.month, today.day, 9, 0).isoformat() + '.000Z'


def task(i, title, icon, color, cat, **kw):
    t = dict(id=str(uuid.UUID(int=rnd.getrandbits(128), version=4)), title=title, icon=icon, color=color, category=cat,
             kind='boolean', targetValue=1, unit='', recurrenceType='daily', recurrenceDays=[], periodTargetN=1,
             startDate=iso(start), endDate=None, weight=1, privacy='private', reminderTime=None, pauses=[],
             archived=False, sourceTaskId=None, challengeId=None, sortOrder=i, createdAt=now, updatedAt=now)
    t.update(kw)
    return t


tasks = [
    task(1, 'Erken kalk', '⏰', '#F59E0B', 'sabah', reminderTime='06:30'),
    task(2, 'Su iç', '💧', '#3B82F6', 'saglik', kind='count', targetValue=8, unit='bardak'),
    task(3, 'Kitap oku', '📚', '#06B6D4', 'ogrenme', kind='count', targetValue=20, unit='sayfa', reminderTime='21:30'),
    task(4, 'Derin çalışma', '🧠', '#6C5CE7', 'is', kind='count', targetValue=2, unit='saat',
         recurrenceType='weekdays', recurrenceDays=[1, 2, 3, 4, 5]),
    task(5, 'Meditasyon', '🧘', '#14B8A6', 'zihin'),
    task(6, 'Spor yap', '🏋️', '#10B981', 'spor', recurrenceType='weekly_n', periodTargetN=3, weight=2),
    task(7, 'Aileni ara', '📞', '#EC4899', 'sosyal', recurrenceType='weekly_n', periodTargetN=2, weight=2),
    task(8, 'Aylık iş raporu', '📈', '#F59E0B', 'is', recurrenceType='monthly_n', periodTargetN=1, weight=3),
]
logs = []


def log(t, d, value, status):
    logs.append(dict(taskId=t['id'], date=iso(d), value=value, status=status, note='', updatedAt=now))


days = [start + dt.timedelta(days=i) for i in range((today - start).days + 1)]
for d in days:
    prog = (d - start).days / max(1, (today - start).days)  # zamanla iyileşen başarı
    p = 0.55 + 0.35 * prog
    wd = d.isoweekday()
    is_today = d == today
    # Erken kalk
    if is_today or rnd.random() < p:
        log(tasks[0], d, 1, 'done')
    # Su
    v = 5 if is_today else (8 if rnd.random() < p else rnd.choice([3, 4, 5, 6, 7]))
    log(tasks[1], d, v, 'done' if v >= 8 else 'partial')
    # Kitap
    if not is_today:
        r = rnd.random()
        if r < p - 0.1:
            log(tasks[2], d, 20, 'done')
        elif r < p + 0.15:
            log(tasks[2], d, rnd.choice([5, 10, 12, 15]), 'partial')
    # Derin çalışma (hafta içi)
    if wd <= 5:
        if is_today:
            log(tasks[3], d, 1, 'partial')
        elif rnd.random() < p:
            log(tasks[3], d, 2, 'done')
        elif rnd.random() < 0.5:
            log(tasks[3], d, 1, 'partial')
    # Meditasyon
    if (not is_today) and rnd.random() < p - 0.15:
        log(tasks[4], d, 1, 'done')
    elif (not is_today) and rnd.random() < 0.06:
        log(tasks[4], d, 0, 'skipped')
    # Spor: Pzt/Çar/Cum ağırlıklı
    if wd in (1, 3, 5) and (rnd.random() < p + 0.05) and not is_today:
        log(tasks[5], d, 1, 'done')
    # Aile: Salı / Pazar
    if wd in (2, 7) and rnd.random() < p:
        log(tasks[6], d, 1, 'done')
    # Aylık rapor: ayın 27'si civarı (geçmiş aylar)
    if d.day == 27 and d < today:
        log(tasks[7], d, 1, 'done')

print(json.dumps(dict(version=1, tasks=tasks, logs=logs,
                      settings=dict(theme='light', notificationsEnabled=True, displayName='Mehmet', onboarded=True)),
                 ensure_ascii=False))
