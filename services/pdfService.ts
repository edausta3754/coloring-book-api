import { jsPDF } from 'jspdf';

// Not: Sunucuda çalıştığımız için 'void' yerine 'Buffer' döndürüyoruz.
// Bu sayede oluşan PDF verisini alıp kaydedebilir veya mail atabiliriz.
export const createColoringBookPdf = async (
  coverImage: string,
  pages: string[],
  childName: string,
  theme: string
): Promise<Buffer> => {
  
  // "l" = landscape (yatay), "pt" = points, "a4" boyutunda
  const doc = new jsPDF('l', 'pt', 'a4'); 
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // --- Sayfa 1: Başlık Sayfası ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(40);
  doc.text(`${childName}'s Coloring Adventure`, pageWidth / 2, pageHeight / 2 - 60, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(24);
  doc.text(`A special gift coloring book`, pageWidth / 2, pageHeight / 2 - 10, { align: 'center' });

  doc.setFontSize(20);
  doc.text(`Theme: ${theme}`, pageWidth / 2, pageHeight / 2 + 30, { align: 'center' });

  // Resim ekleme yardımcı fonksiyonu
  const addImageToPage = (imageData: string) => {
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = pageHeight - margin * 2;
    
    // Sunucuda resim özelliklerini alırken try-catch kullanmak güvenlidir
    try {
        const imgProps = doc.getImageProperties(`data:image/jpeg;base64,${imageData}`);
        const imgRatio = imgProps.width / imgProps.height;
        
        let imgWidth = contentWidth;
        let imgHeight = imgWidth / imgRatio;

        if (imgHeight > contentHeight) {
        imgHeight = contentHeight;
        imgWidth = imgHeight * imgRatio;
        }

        const x = (pageWidth - imgWidth) / 2;
        const y = (pageHeight - imgHeight) / 2;
        
        doc.addImage(`data:image/jpeg;base64,${imageData}`, 'JPEG', x, y, imgWidth, imgHeight);
    } catch (e) {
        console.error("Resim eklenirken hata oluştu:", e);
    }
  };
  
  // --- Sayfa 2: Kapak Resmi ---
  doc.addPage();
  addImageToPage(coverImage);
  doc.setFontSize(10);
  doc.text(`Cover Page`, pageWidth / 2, pageHeight - 20, { align: 'center' });

  // --- Diğer Sayfalar: Boyama Sayfaları ---
  pages.forEach((pageData, index) => {
    doc.addPage();
    addImageToPage(pageData);
    doc.setFontSize(10);
    doc.text(`Page ${index + 1}`, pageWidth / 2, pageHeight - 20, { align: 'center' });
  });

  // --- SONUÇ: Dosyayı Kaydetme ---
  // Tarayıcıdaki 'doc.save()' yerine, veriyi Buffer olarak döndürüyoruz.
  const pdfOutput = doc.output('arraybuffer');
  return Buffer.from(pdfOutput);
};