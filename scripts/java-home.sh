#!/usr/bin/env bash
# JDK'yı bulur ve JAVA_HOME olarak yazdırır.
#
# Neden gerekiyor: Homebrew ile kurulan openjdk, /Library/Java/JavaVirtualMachines
# altına bağlanmadıkça `java_home` tarafından görülmüyor ve `java` PATH'e de
# girmiyor. Sonuç, Gradle'ın hiç açılmaması: "Unable to locate a Java Runtime".
# Kabuğun ortamına bağlı kalmak yerine bilinen konumlara bakıyoruz.
set -euo pipefail

# Dosyanın var olması yetmiyor: macOS'ta /usr/bin/java bir köprü ve çalıştırıldığında
# "Unable to locate a Java Runtime" diyerek hata veriyor. Tek güvenilir kontrol,
# gerçekten çalıştırmak.
gecerli() {
  [ -n "${1:-}" ] && [ -x "$1/bin/java" ] && "$1/bin/java" -version >/dev/null 2>&1
}

# 1) Zaten tanımlıysa ve gerçekten JDK ise
if gecerli "${JAVA_HOME:-}"; then echo "$JAVA_HOME"; exit 0; fi

# 2) PATH'teki java
if command -v java >/dev/null 2>&1; then
  ev="$(cd "$(dirname "$(readlink -f "$(command -v java)" 2>/dev/null || command -v java)")/.." && pwd)"
  if gecerli "$ev"; then echo "$ev"; exit 0; fi
fi

# 3) macOS'un kendi kaydı
if [ -x /usr/libexec/java_home ]; then
  if ev="$(/usr/libexec/java_home -v 21 2>/dev/null)" && gecerli "$ev"; then echo "$ev"; exit 0; fi
  if ev="$(/usr/libexec/java_home 2>/dev/null)" && gecerli "$ev"; then echo "$ev"; exit 0; fi
fi

# 4) Bilinen kurulum konumları — 21 önce, proje Java 21 istiyor
for ev in \
  /opt/homebrew/opt/openjdk@21 /usr/local/opt/openjdk@21 \
  "${HOME}/.sdkman/candidates/java/current" \
  /opt/homebrew/opt/openjdk /usr/local/opt/openjdk
do
  gecerli "$ev" && { echo "$ev"; exit 0; }
done

echo "JDK 21 bulunamadı. Kur: brew install openjdk@21" >&2
exit 1
