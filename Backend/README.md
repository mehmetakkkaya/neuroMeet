# NeuroMeet Backend

Bu repo, NeuroMeet uygulamasının backend kısmını içerir.

## Gereksinimler

- Node.js (v14.x veya üzeri)
- MySQL (5.7 veya üzeri)

## Kurulum

1. Gerekli paketleri yükleyin:
```bash
npm install
```

2. MySQL veritabanı oluşturun:
```sql
CREATE DATABASE BURAYA_VERITABANI_ADI_YAZIN;
```

3. `env.example` dosyasını `.env` olarak kopyalayın ve kendi bilgilerinizle doldurun:
```
PORT=5000
DB_HOST=BURAYA_VERITABANI_HOST_YAZIN
DB_PORT=3306
DB_NAME=BURAYA_VERITABANI_ADI_YAZIN
DB_USER=BURAYA_KULLANICI_ADI_YAZIN
DB_PASSWORD=BURAYA_SIFRE_YAZIN
JWT_SECRET=BURAYA_JWT_SECRET_ANAHTARI_YAZIN
NODE_ENV=development
ELASTICSEARCH_NODE=BURAYA_ELASTICSEARCH_URL_YAZIN
```

## Çalıştırma

Geliştirme modunda çalıştırmak için:
```bash
npm run dev
```

Üretim modunda çalıştırmak için:
```bash
npm start
```

## API Dokümantasyonu

API dokümantasyonu Swagger UI ile sağlanmıştır. Uygulamayı çalıştırdıktan sonra aşağıdaki URL'den erişebilirsiniz:

```
http://localhost:5000/api-docs
```

## Veritabanı Yapısı

NeuroMeet, ilişkisel bir MySQL veritabanı kullanır. Ana tablolar:

- `Users`: Kullanıcı bilgileri
- `Meetings`: Toplantı bilgileri
- `Participants`: Toplantı katılımcıları (ara tablo)
- `Documents`: Toplantı dokümanları

## Proje Yapısı

```
src/
  ├── config/     # Konfigürasyon dosyaları
  ├── controllers/ # Controller dosyaları
  ├── middlewares/ # Middleware dosyaları
  ├── models/     # Veritabanı model dosyaları
  ├── routes/     # API routes
  └── utils/      # Yardımcı fonksiyonlar
``` 