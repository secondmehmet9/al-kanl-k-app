#!/bin/bash
# Müdür / uygulamaci için GitHub yardımcıları. Token .env.github'dan okunur, ASLA yazdırılmaz.
#   scripts/github.sh push     → kodu GitHub'a gönder (main dalı)
#   scripts/github.sh build    → "iOS imzasız IPA" iş akışını başlat
#   scripts/github.sh status   → son çalışmaların durumu + son .ipa indirme adresi
set -euo pipefail
cd "$(dirname "$0")/.."
ENVF=.env.github
[ -f "$ENVF" ] || { echo "HATA: $ENVF yok. Sahip önce token girmeli (docs/KURULUM.md adım 4)."; exit 1; }
set -a; . "./$ENVF"; set +a
: "${GITHUB_USER:?}" "${GITHUB_REPO:?}" "${GITHUB_TOKEN:?}"
API="https://api.github.com/repos/$GITHUB_USER/$GITHUB_REPO"
WF="ios-unsigned-ipa.yml"
api() { curl -sS -H "Authorization: Bearer $GITHUB_TOKEN" -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28" "$@"; }

case "${1:-}" in
  push)
    git remote remove origin 2>/dev/null || true
    git remote add origin "https://github.com/$GITHUB_USER/$GITHUB_REPO.git"
    # Token URL'ye ya da git ayarına yazılmaz; yalnızca bu komut süresince ortamdan okunur.
    git -c credential.helper= \
        -c credential.helper='!f() { echo "username=x-access-token"; echo "password=$GITHUB_TOKEN"; }; f' \
        push -u origin main
    ;;
  build)
    code=$(api -o /dev/null -w '%{http_code}' -X POST "$API/actions/workflows/$WF/dispatches" -d '{"ref":"main","inputs":{"release":"true"}}')
    [ "$code" = "204" ] && echo "Derleme başlatıldı. Durum: scripts/github.sh status" || { echo "HATA: HTTP $code"; exit 1; }
    ;;
  status)
    api "$API/actions/workflows/$WF/runs?per_page=3" | python3 -c '
import json, sys
for r in json.load(sys.stdin).get("workflow_runs", []):
    print(r["run_number"], r["status"], r.get("conclusion") or "-", r["created_at"], r["html_url"])'
    api "$API/releases?per_page=1" | python3 -c '
import json, sys
rel = json.load(sys.stdin)
if isinstance(rel, list) and rel:
    print("Son sürüm:", rel[0]["html_url"])
    for a in rel[0].get("assets", []):
        print("  .ipa:", a["browser_download_url"])
else:
    print("Henüz yayınlanmış sürüm yok.")'
    ;;
  *) echo "kullanım: scripts/github.sh push|build|status"; exit 2;;
esac
