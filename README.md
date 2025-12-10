# Text Expander Mini

Hafif, metin genişletme aracı. Yazarken kısaltmaları otomatik olarak tam metinlere dönüştürür.

## Özellikler

- Anlık metin genişletme
- Tüm web sitelerinde çalışır
- Kelime sınırı algılama
- Dinamik içerik desteği (tarih, saat, gün)

## Kurulum

1. [Tampermonkey](https://www.tampermonkey.net/) eklentisini kurun
2. Yeni bir betik oluşturun
3. `mini.js` içeriğini yapıştırın
4. Betiği kaydedin (Ctrl+S)

## Kullanım

Kısaltmaları yazdıktan sonra boşluk tuşuna basın:

### Yaygın Kısaltmalar
- `hi` → Hello!
- `ok` → okey
- `brb` → Be right back
- `omw` → On my way
- `thx` → Thanks!
- `ty` → Thank you!
- `np` → No problem!
- `idk` → I don't know
- `btw` → By the way
- `imo` → In my opinion
- `afaik` → As far as I know

### E-posta Yer Tutucuları
- `:mail` → ornek@email.com
- `:mymail` → benim@email.com

### Eğlenceli Metinler
- `"1` → Owo h
- `"2` → Owo b
- `"3` → Owo
- `"4` → Owo pray

### Dinamik İçerik
- `:tarih` → Türkçe tarih formatı
- `:date` → İngilizce tarih formatı
- `:saat` → Türkçe saat formatı
- `:time` → İngilizce saat formatı
- `:gun` → Gün ismi (Türkçe)

### Semboller
- `:heart` → ❤️
- `:check` → ✓
- `:cross` → ✗

## Özelleştirme

Yeni kısaltmalar eklemek için:
1. Betiği düzenleyin
2. `TRIGGERS` dizisini bulun
3. Yeni girdiler ekleyin:
   ```javascript
   { trigger: 'kısaltma', replace: 'tam metin' }
   ```

## Lisans

MIT Lisansı
