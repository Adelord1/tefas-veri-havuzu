const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    console.log("TEFAS'a bağlanılıyor...");
    let browser;
    let page;
    try {
        // Puppeteer'ı gizli modda ve bot korumalarını atlatacak parametrelerle başlatıyoruz
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--window-size=1920,1080',
                '--disable-blink-features=AutomationControlled' // Bot korumalarını atlatmaya yardımcı olur
            ]
        });
        page = await browser.newPage();
        
        // Gerçek bir kullanıcı tarayıcısı (Chrome) gibi görünmek için User Agent ekliyoruz
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });

        console.log("Fon Karşılaştırma sayfasına gidiliyor...");
        const response = await page.goto('https://www.tefas.gov.tr/FonKarsilastirma.aspx', { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        console.log("Sayfa HTTP Durumu:", response.status());

        // Doğrudan açılır menü yerine, ana tablonun yüklenmesini bekleyelim
        console.log("Tablonun belirmesi bekleniyor...");
        await page.waitForSelector('#table_funds', { timeout: 20000 });
        
        console.log("Tablo bulundu! 'Tümü' seçeneği ayarlanıyor...");
        
        // Eğer dropdown gecikirse tüm sistemi çökertmemek için try-catch içine alıyoruz
        try {
            await page.waitForSelector('select[name="table_funds_length"]', { timeout: 10000 });
            await page.select('select[name="table_funds_length"]', '-1');
            console.log("Tümü seçildi, tablonun genişlemesi için 5 saniye bekleniyor...");
            await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (err) {
            console.log("UYARI: Dropdown menü bulunamadı veya tıklanamadı. Mevcut tablo (sınırlı sayıdaki fon) üzerinden devam edilecek...");
        }

        console.log("Veriler okunuyor...");
        const fonData = await page.evaluate(() => {
            const parseVal = (str) => {
                if (!str || str === '-' || str.trim() === '') return null;
                // Yüzde ve nokta işaretlerini temizle, virgülü noktaya çevir
                let val = str.replace('%', '').replace(/\./g, '').replace(',', '.').trim();
                const num = parseFloat(val);
                return isNaN(num) ? null : num;
            };
            const rows = Array.from(document.querySelectorAll('#table_funds tbody tr'));
            return rows.map(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length < 5) return null; // Boş veya hatalı satırları atla
                
                return {
                    FonKodu: cells[0]?.innerText.trim(),
                    FonAdi: cells[1]?.innerText.trim(),
                    FonTuru: cells[2]?.innerText.trim(),
                    Fiyat: parseVal(cells[3]?.innerText),
                    GetiriGunluk: parseVal(cells[4]?.innerText),
                    Getiri1Ay: parseVal(cells[5]?.innerText),
                    Getiri3Ay: parseVal(cells[6]?.innerText),
                    Getiri6Ay: parseVal(cells[7]?.innerText),
                    GetiriYBB: parseVal(cells[8]?.innerText),
                    Getiri1Yil: parseVal(cells[9]?.innerText),
                    Getiri3Yil: parseVal(cells[10]?.innerText),
                    Getiri5Yil: parseVal(cells[11]?.innerText),
                    Tarih: new Date().toISOString() // Güncellenme tarihi
                };
            }).filter(item => item !== null && item.FonKodu !== '');
        });

        console.log(`Başarılı! Toplam ${fonData.length} adet fon verisi çekildi.`);

        // JSON dosyasına kaydet
        fs.writeFileSync('tefas_verileri.json', JSON.stringify(fonData, null, 2));
        console.log("tefas_verileri.json başarıyla oluşturuldu.");
        
        await browser.close();

    } catch (error) {
        console.error("HATA OLUŞTU:", error.message);
        
        // Hata durumunda TEFAS'ın bize ne döndürdüğünü (örn: Cloudflare engeli) görebilmek için HTML çıktısı alıyoruz
        if (page) {
            try {
                const html = await page.content();
                console.log("\n--- SAYFANIN İLK 1000 KARAKTERLİK HTML ÇIKTISI (HATA TESPİTİ İÇİN) ---");
                console.log(html.substring(0, 1000));
                console.log("-------------------------------------------------------------------\n");
            } catch (e) {
                console.log("HTML çıktısı alınamadı.");
            }
        }
        
        if (browser) await browser.close();
        process.exit(1); 
    }
})();
