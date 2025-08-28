const PizZip = require('pizzip');

// Test function để kiểm tra pizzip
async function testPizZip() {
  try {
    console.log('Testing PizZip...');

    // Tạo một DOCX file test đơn giản
    const testContent = `
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p>
            <w:r>
              <w:t>Page 1 content</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:r>
              <w:br w:type="page"/>
            </w:r>
          </w:p>
          <w:p>
            <w:r>
              <w:t>Page 2 content</w:t>
            </w:r>
          </w:p>
        </w:body>
      </w:document>
    `;

    // Tạo ZIP structure của DOCX
    const zip = new PizZip();
    zip.file('word/document.xml', testContent);

    console.log('ZIP created successfully');
    console.log('Files in ZIP:', Object.keys(zip.files));

    // Thử đọc lại
    const zip2 = new PizZip(zip.generate({ type: 'nodebuffer' }));
    console.log('ZIP read successfully');
    console.log('Files in read ZIP:', Object.keys(zip2.files));

    const documentXml = zip2.file('word/document.xml').asText();
    console.log('Document XML content:', documentXml);

    // Kiểm tra page break
    if (documentXml.includes('w:br w:type="page"')) {
      console.log('✅ Page break detected in XML!');
    } else {
      console.log('❌ No page break found in XML');
    }

  } catch (error) {
    console.error('Error testing PizZip:', error);
  }
}

testPizZip();
