const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
    console.log("TEFAS'a bağlanılıyor...");
    try {
        const browser = await puppeteer.launch({ 
            executablePath: '/usr/bin/google-chrome', // GitHub'ın kendi içindeki hazır Chrome
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        const page = await browser.newPage();
        
        await page.goto('https://www.tefas.gov.tr/FonVerileri.aspx', { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        const title = await page.title();
        console.log("Başarıyla bağlanıldı! Sayfa Başlığı:", title);

        // Test verisi oluştur
        const testVerisi = [
            { FonKodu: "TEST", Mesaj: "Sistem basariyla kuruldu!", Tarih: new Date().toISOString() }
        ];

        fs.writeFileSync('tefas_verileri.json', JSON.stringify(testVerisi, null, 2));
        console.log("tefas_verileri.json dosyası başarıyla oluşturuldu.");

        await browser.close();
    } catch (error) {
        console.error("TEFAS bağlantı hatası:", error);
        process.exit(1);
    }
})();
