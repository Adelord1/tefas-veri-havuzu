const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    console.log("TEFAS'a bağlanılıyor...");
    try {
        // Puppeteer'ı gizli modda başlatıyoruz
        const browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--window-size=1920,1080'
            ]
        });
        const page = await browser.newPage();
        
        // Gerçek bir tarayıcı (Chrome) gibi görünmek için User Agent ekliyoruz
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log("Fon Karşılaştırma sayfasına gidiliyor...");
        await page.goto('https://www.tefas.gov.tr/FonKarsilastirma.aspx', { waitUntil: 'networkidle2', timeout: 60000 });

        // Tablodaki "Tümü" seçeneğini seçerek tüm fonları listele
        console.log("Tüm fonlar listeleniyor...");
        await page.waitForSelector('select[name="table_funds_length"]', { timeout: 15000 });
        await page.select('select[name="table_funds_length"]', '-1');
        
        // Tablonun tamamen güncellenmesi için 5 saniye bekle
        await new Promise(resolve => setTimeout(resolve, 5000));

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
                if (cells.length < 5) return null; // Boş satırları atla
                
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
        console.error("HATA OLUŞTU:", error);
        process.exit(1); 
    }
})();
