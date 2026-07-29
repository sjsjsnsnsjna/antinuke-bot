# 🛡️ AntiNuke Bot

Discord sunucunuzu otomatik olarak koruyan, Türkçe arayüzlü güvenlik botu.

---

## 🚀 Kurulum (Railway)

### 1. Discord Developer Portal Ayarları

[Discord Developer Portal](https://discord.com/developers/applications) adresine gidin:

1. Botunuzu oluşturun veya mevcut uygulamanızı açın.
2. **Bot** sekmesinden aşağıdaki **Privileged Gateway Intents** bölümünde şunları **AKTİF** edin:
   - ✅ `SERVER MEMBERS INTENT`
   - ✅ `MESSAGE CONTENT INTENT`
3. **OAuth2 > URL Generator** bölümünde şu izinleri seçip botu sunucunuza davet edin:
   - `Administrator` (ya da en az: Manage Roles, Manage Channels, Kick Members, Ban Members, View Audit Log, Manage Webhooks)

> ⚠️ **Önemli:** Botun rolü, kontrol etmesi gereken tüm rollerin **ÜSTÜNDE** olmalıdır. Aksi takdirde karantina ve rol kaldırma işlemleri başarısız olur.

---

### 2. Ortam Değişkenleri (Railway)

Railway dashboard'unda **Variables** sekmesine şu değerleri ekleyin:

| Değişken | Açıklama |
|---|---|
| `DISCORD_TOKEN` | Discord Developer Portal > Bot > Token |
| `CLIENT_ID` | Uygulama ID'si (General Information) |
| `GUILD_ID` | Botun çalışacağı sunucu ID'si |
| `LOG_CHANNEL_ID` | *(Opsiyonel)* Log kanalı ID'si; `/log-kanal-ayarla` ile de ayarlanabilir |

---

### 3. Slash Komutlarını Kaydetme

Botu ilk kez deploy etmeden önce slash komutlarını kaydedin:

```bash
npm run deploy
```

> Bu komutu Railway'in **deploy** veya **start before first deploy** hook'una ekleyebilirsiniz.

---

### 4. Persistent Volume (Kalıcı Depolama)

Bot, whitelist/config/yedek verilerini `./data/bot.db` dosyasına kaydeder.

Railway'de **kalıcı volume** eklemezseniz her yeniden başlatmada bu veriler sıfırlanır!

Railway'de:
1. **Service > Volumes** sekmesine gidin.
2. Mount path: `/app/data`
3. Kaydedin.

---

## ⚙️ Komutlar

Tüm komutlar hem `/komut` (slash) hem `B!komut` (prefix) olarak çalışır.
Detaylı açıklamalar için `/yardim` komutunu kullanın.

| Komut | Açıklama |
|---|---|
| `/whitelist-ekle @...` | Kullanıcı/rolü güvenlik kontrolünden muaf tut |
| `/whitelist-cikar @...` | Muafiyet listesinden çıkar |
| `/whitelist-listele` | Muafiyet listesini göster |
| `/log-kanal-ayarla #kanal` | Log kanalını ayarla |
| `/guvenlik-ayarlar` | Eşikleri görüntüle |
| `/karantina-kaldir @...` | Karantinayı kaldır |
| `/raid-modu-ac` | Baskın modunu aktif et |
| `/raid-modu-kapat` | Baskın modunu kapat |
| `/panik` | Sunucuyu kilitle |
| `/panik-kaldir` | Kilidi kaldır |
| `/guvenlik-durum` | Güvenlik durumu paneli |
| `/yedek-al` | Manuel yedek al |
| `/yedek-geri-yukle` | Yedekten geri yükle |
| `/yardim` | Yardım menüsü |

---

## 🔍 Algılama Kategorileri

- 🗑️ **Kanal silme** — N kanal silinirse saldırgan karantinaya alınır, kanallar yedekten geri yüklenir
- 📢 **Kanal oluşturma spam** — Çok sayıda kanal oluşturulursa engellenir
- 🎭 **Rol silme** — Saldırgan karantina, roller yedekten geri yüklenir
- 👑 **Tehlikeli rol yetkisi** — Beklenmedik bir kullanıcıya admin/ban/kick yetkisi verilirse uyarı
- 🔨 **Mass ban** — Kısa sürede çok sayıda ban yapılırsa engellenir
- 👢 **Mass kick** — Kısa sürede çok sayıda kick yapılırsa engellenir
- 🔗 **Webhook oluşturma** — Yetkisiz webhook oluşturma tespiti
- 🤖 **Yetkisiz bot ekleme** — Whitelist dışı biri bot eklerse uyarı
- ⚙️ **Sunucu ayarları** — Doğrulama seviyesi düşürme, isim değiştirme gibi şüpheli değişiklikler
- 🌊 **Baskın (Raid)** — Çok sayıda üye aynı anda katılırsa otomatik koruma

---

## 📁 Dosya Yapısı

```
index.js              — Giriş noktası
deploy-commands.js    — Slash komut kayıt scripti
config/               — Yapılandırma ve emoji tanımları
commands/             — Tüm slash/prefix komutlar
events/               — Discord gateway event handler'ları
detection/            — Aksiyon sayacı (rolling window)
backup/               — Snapshot + restore logic
database/             — SQLite veritabanı
utils/                — Bileşen oluşturucular, yardımcı fonksiyonlar
jobs/                 — Periyodik görevler (yedek, izin denetimi)
data/                 — Veritabanı dosyası (git'te yok, volume'da kalıcı)
```

---

## ⚡ Önemli Notlar

- Bot rolü her zaman diğer rollerin **üstünde** olmalıdır.
- `data/` klasörü Railway'de kalıcı volume'a bağlanmalıdır.
- Slash komutları değiştirildikten sonra `npm run deploy` çalıştırılmalıdır.
- Bot kendine ait aksiyonları (kanal geri yükleme, karantina rolü oluşturma) hiçbir zaman tehdit olarak saymaz.
