import type { Guide } from './types'

const UPDATED = '2026-10-26'

export const GUIDES: Guide[] = [
  // 1
  {
    slug: 'ssc-photo-signature-size',
    title: 'How to Resize Photo and Signature for SSC CGL / CHSL 2026 Forms',
    description: 'Resize your photo and signature for SSC CGL / CHSL 2026 forms to the right KB and size, free, on your phone or PC. Nothing is uploaded.',
    toolId: 'ssc-photo-resizer',
    cta: 'Resize your SSC photo now',
    updated: UPDATED,
    minutes: 4,
    keywords: ['ssc photo resize', 'ssc cgl photo size', 'ssc chsl signature size', 'ssc photo 20 to 50 kb', 'ssc signature 10 to 20 kb', 'ssc form photo upload', 'resize photo for ssc 2026'],
    intro: [
      "The SSC application form checks your photo and signature very strictly. If the file is too big, too small or the wrong shape, the upload fails and you lose time close to the last date.",
      "This guide shows how to get both files right in a few minutes using the SSC Photo & Signature Resizer. It works in your browser on a phone or computer, and your photo stays on your device. Nothing is uploaded to us.",
    ],
    steps: [
      { title: 'Take a clear photo and a clear signature', text: "Use a recent colour photo with a plain white or light background, face clearly visible, no cap or dark glasses. For the signature, sign with a black or blue pen on plain white paper and take a straight, well-lit photo of it." },
      { title: 'Pick SSC Photo in the tool', text: "Open the tool and choose 'SSC (CGL, CHSL, MTS, GD) — Photo' in the Exam and document type list. The width, height and KB limits fill in by themselves." },
      { title: 'Upload and position the photo', text: "Drop or choose your photo. Use the Zoom, Move left / right and Move up / down sliders so your face is centred and the top of your head is not cut off. The preview shows exactly what will be saved." },
      { title: 'Check the size and download', text: "The File size turns green and you see 'Ready to upload' when the JPG is inside the required KB range. Press Download JPG." },
      { title: 'Repeat for the signature', text: "Switch to 'SSC — Signature', upload the photo of your signature, and crop it so the signature fills most of the box. The 'Clean background' option is turned on for signatures: it makes the paper white and the ink darker. Download the JPG." },
      { title: 'Upload on the SSC website', text: "Upload both files in the form and check the preview the portal shows before you submit." },
    ],
    sections: [
      {
        heading: 'Typical SSC photo and signature requirements',
        paragraphs: [
          "These are the typical requirements from recent SSC notifications, and they are the presets the tool uses. Rules can change between years and posts, so always check the latest official notification for your exam. If a number is different, type the new value into the Width, Height, Min size or Max size boxes.",
        ],
        table: {
          head: ['File', 'Size on paper', 'Pixels in the tool (200 DPI)', 'File size'],
          rows: [
            ['Photo', '3.5 cm × 4.5 cm', '276 × 354 px', '20–50 KB, JPG'],
            ['Signature', '4 cm × 2 cm', '315 × 157 px', '10–20 KB, JPG'],
          ],
        },
      },
      {
        heading: 'Common mistakes that get the upload rejected',
        bullets: [
          "Photo below the minimum KB. Many people only think about the maximum. The tool raises the quality, and if needed pads the file, so it reaches the minimum without changing how the picture looks.",
          "Signature too faint or on lined paper. Use plain white paper and a dark pen.",
          "Photo saved as PNG or HEIC. SSC asks for JPG; the tool always saves JPG.",
          "Head cut off or too much empty space. Use the zoom and move sliders until the face fills the frame naturally.",
          "Old photo or selfie with a busy background. Use a recent photo against a plain wall.",
        ],
      },
      {
        heading: 'Tips for a good result',
        bullets: [
          "Take the photo in daylight facing a window. Avoid shadows on the wall behind you.",
          "Keep the phone at eye level, about an arm's length away, and do not use beauty filters.",
          "Save both downloaded files with simple names like photo.jpg and sign.jpg so you pick the right one in the form.",
        ],
      },
    ],
    faq: [
      ['Are these the official SSC sizes?', "They are typical requirements from recent notifications. This site is not connected with SSC. Limits can change, so always check the latest official notification and adjust the size fields if needed."],
      ['Why does the portal reject my photo even though it is under 50 KB?', "Check the minimum size (often 20 KB), the format (JPG) and the dimensions. A very small file can be rejected just like a big one. The tool only enables the download when the file is inside the range you set."],
      ['Can I do this on my phone?', "Yes. The tool runs in your phone's browser. Choose the photo from your gallery or camera and download the JPG to your phone."],
      ['Is my photo uploaded to your server?', "No. The resizing happens inside your browser and the photo never leaves your device."],
      ['Can I use the same files for other exams?', "Only if the requirements match. The tool also has presets for IBPS/SBI/RBI, UPSC and NTA exams, and a Custom size option."],
    ],
    related: ['compress-image-to-20kb-50kb', 'passport-size-photo-at-home', 'heic-to-jpg-iphone-photos'],
  },

  // 2
  {
    slug: 'compress-image-to-20kb-50kb',
    title: 'How to Compress a Photo to 20 KB, 50 KB or 100 KB for Online Forms',
    description: 'Compress a photo to 20 KB, 50 KB or 100 KB for online forms in seconds. Free, works on phone and PC, and your photo is never uploaded.',
    toolId: 'compress-image-to-50kb',
    cta: 'Compress your photo now',
    updated: UPDATED,
    minutes: 4,
    keywords: ['compress image to 50kb', 'compress photo to 20kb', 'reduce image size to 100kb', 'photo size reducer in kb', 'image under 50kb for form', 'compress jpg to 20kb', 'reduce photo kb online'],
    intro: [
      "Government forms, college admissions and job portals often say 'photo must be under 50 KB' or 'below 100 KB'. A phone photo is usually 2 to 5 MB, so it needs to shrink a lot.",
      "The Compress Image to KB tool finds the highest quality that still fits under your limit. It runs in your browser, so your photos stay on your device.",
    ],
    steps: [
      { title: 'Open the tool and choose your photo', text: "Drop the image or click to choose it. JPG, PNG, WebP and GIF are accepted. iPhone HEIC photos need to be converted to JPG first." },
      { title: 'Pick the target size', text: "Tap one of the buttons: Under 20 KB, Under 50 KB, Under 100 KB, Under 200 KB, Under 500 KB or Under 1 MB. You can also type any number into Maximum size (KB)." },
      { title: 'Keep JPG and the resize option on', text: "Leave Format as 'JPG (works everywhere)' for forms. Keep 'Reduce dimensions if needed to reach the size' ticked, so very small targets like 20 KB can be reached." },
      { title: 'Check and download', text: "The tool shows the original size, the compressed size, the new dimensions and the quality used. If it says 'Under 50 KB' (or your target), press Download." },
      { title: 'Doing many photos? Use bulk', text: "Switch to 'Many files (bulk)' at the top, set the target once, add all the photos and press Compress all. Download them one by one or together as a ZIP." },
    ],
    sections: [
      {
        heading: 'Which size should you choose?',
        bullets: [
          "Read the form's instructions first and pick a target a little below the limit. For a 50 KB limit, 45 to 49 KB is fine.",
          "If the form also gives a minimum (for example 20–50 KB), make sure your file is above it. For exam forms with both a minimum and fixed dimensions, the Exam Photo & Signature Resizer is a better choice.",
          "If the form asks for exact dimensions in pixels or cm, resize to those first, then compress.",
        ],
      },
      {
        heading: 'Typical exam form limits (for reference)',
        paragraphs: ["These are typical requirements from recent notifications used by the exam presets on this site. Always check the latest official notification for your exam."],
        table: {
          head: ['Exam', 'Photo', 'Signature'],
          rows: [
            ['SSC (CGL, CHSL, MTS, GD)', '20–50 KB, 3.5 × 4.5 cm', '10–20 KB, 4 × 2 cm'],
            ['IBPS / SBI / RBI', '20–50 KB, 200 × 230 px', '10–20 KB, 140 × 60 px'],
            ['UPSC', '20–300 KB, 550 × 550 px', '20–300 KB, 550 × 350 px'],
            ['NTA (NEET, JEE Main, CUET)', '10–200 KB, 3.5 × 4.5 cm', '4–30 KB, 4 × 2 cm'],
          ],
        },
      },
      {
        heading: 'Common mistakes',
        bullets: [
          "Taking a screenshot of the photo to make it smaller. This lowers quality and can change the shape. Compress the original instead.",
          "Choosing WebP for a form. Many portals only accept JPG or JPEG.",
          "Compressing a photo that is very dark or blurry. Compression cannot fix that, so retake the photo.",
        ],
      },
    ],
    faq: [
      ['Why does the portal reject my photo even though it is under 50 KB?', "The portal may also check the minimum size, the format (JPG) or the exact width and height. Read all the rules in the instructions, not just the maximum KB."],
      ['Will compressing to 20 KB make my photo blurry?', "A little, because 20 KB is very small. The tool picks the highest quality that fits, and passport-style photos usually still look clear at that size."],
      ['My photo is already under 50 KB. Do I need this?', "No. If the file already meets the limit, upload it as it is. The tool will tell you when your original is already under the target."],
      ['Is my photo uploaded anywhere?', "No. Compression happens in your browser and nothing leaves your device."],
      ['Can I compress many photos at once?', "Yes. Use the 'Many files (bulk)' switch, choose the target size once and press Compress all. You can download everything as a ZIP."],
    ],
    related: ['ssc-photo-signature-size', 'heic-to-jpg-iphone-photos', 'reduce-pdf-size'],
  },

  // 3
  {
    slug: 'passport-size-photo-at-home',
    title: 'How to Make a Passport Size Photo at Home and Print It on 4×6 Paper',
    description: 'Make a passport size photo at home with your phone, then print a sheet of copies on 4×6 or A4 paper. Free, and your photo never leaves your device.',
    toolId: 'passport-photo',
    cta: 'Make your passport photo now',
    updated: UPDATED,
    minutes: 4,
    keywords: ['passport size photo at home', 'passport photo maker', 'print passport photo on 4x6', '35x45 mm photo', 'passport size photo sheet', 'how to make passport size photo on phone', '2x2 inch photo'],
    intro: [
      "You need passport size photos for forms, ID cards, admissions and visa applications. Instead of going to a studio each time, you can take the photo at home and print a sheet of copies at any photo shop or on your own printer.",
      "The Passport Size Photo Maker crops your photo to the right size and lays out several copies on one sheet. Your photo is processed on your device and is never uploaded.",
    ],
    steps: [
      { title: 'Take the photo', text: "Stand in front of a plain white or light-coloured wall. Face the camera directly with a neutral expression, eyes open, and even light on your face. Ask someone to take it from about 1 to 1.5 metres away at eye level." },
      { title: 'Choose the photo size', text: "In Photo size, pick the size your form needs, for example 35 × 45 mm or 2 × 2 in (51 × 51 mm)." },
      { title: 'Upload and line up your head', text: "Choose your photo. Use Zoom and the move sliders so the top of your head touches the blue line and your chin sits between the two green lines. Use Brightness if the photo is a little dark. The guide lines are not saved in the final photo." },
      { title: 'Choose the print sheet', text: "In Print sheet, pick 4 × 6 in photo paper, 5 × 7 in photo paper or A4 paper. Leave 'Thin cutting lines around each photo' ticked to make cutting easier." },
      { title: 'Download', text: "Press 'Download print sheet' (the button shows how many photos fit, for example 6 photos of 35 × 45 mm on a 4 × 6 sheet), or 'Download single photo' if you need one file for an online form." },
      { title: 'Print at actual size', text: "Print the sheet at 100% or 'actual size', not 'fit to page'. A photo shop can print a 4 × 6 file directly as a normal photo print." },
    ],
    sections: [
      {
        heading: 'Photo sizes available in the tool',
        paragraphs: ["These are the sizes the tool offers. Requirements differ by country, office and application, so check the official requirements for your application before printing."],
        table: {
          head: ['Size', 'Commonly used for'],
          rows: [
            ['35 × 45 mm', 'India visa and many forms, UK, Europe, Australia'],
            ['2 × 2 in (51 × 51 mm)', 'India passport, USA'],
            ['50 × 70 mm', 'Canada'],
            ['33 × 48 mm', 'China'],
            ['35 × 35 mm', 'Some forms'],
            ['25 × 35 mm', 'Stamp size'],
          ],
        },
      },
      {
        heading: 'Common mistakes',
        bullets: [
          "Busy or coloured background. The tool does not replace the background, so take the photo against a plain light wall.",
          "Printing with 'fit to page'. The photos come out the wrong size. Always choose 100% or actual size.",
          "Shadows behind the head or on one side of the face. Face a window or use two light sources.",
          "Head too small or too large in the frame. Use the blue and green guide lines.",
          "Glasses with glare, caps or heavy filters. Many applications do not accept these.",
        ],
      },
      {
        heading: 'Tips',
        bullets: [
          "The saved file is 300 DPI, which prints sharply.",
          "Printing one 4 × 6 photo at a shop usually costs much less than a studio passport photo set.",
          "Keep the single photo file too. Many online forms ask for a digital copy.",
        ],
      },
    ],
    faq: [
      ['What is the passport size photo size in India?', "It depends on the application. The tool offers 35 × 45 mm (used for India visa and many forms) and 2 × 2 in (51 × 51 mm). Check the official instructions for your application before printing."],
      ['Can the tool change my background to white?', "No. It sizes, crops and lays out the photo but does not change the background. Take the photo against a plain white or light wall."],
      ['How many photos fit on a 4×6 sheet?', "It depends on the photo size. The download button shows the exact count; for 35 × 45 mm it is 6 photos on 4 × 6 paper and 30 on A4."],
      ['Can I print it at home?', "Yes. Use glossy photo paper if you can, and print at 100% or actual size. A photo shop print of the 4 × 6 file usually looks better than a home inkjet."],
      ['Is my photo uploaded?', "No. Everything is done in your browser and the photo stays on your device."],
    ],
    related: ['ssc-photo-signature-size', 'compress-image-to-20kb-50kb', 'heic-to-jpg-iphone-photos'],
  },

  // 4
  {
    slug: 'gst-invoice-format-free',
    title: 'GST Invoice Format: How to Make a GST Bill Free (CGST, SGST, IGST)',
    description: 'Make a GST invoice free: what a GST bill must show, when to charge CGST + SGST or IGST, and how to download it as a PDF. Nothing is uploaded.',
    toolId: 'invoice-generator',
    cta: 'Make your GST invoice now',
    updated: UPDATED,
    minutes: 4,
    keywords: ['gst invoice format', 'gst bill format', 'free gst invoice generator', 'cgst sgst igst invoice', 'tax invoice format india', 'make gst bill online', 'gst invoice pdf'],
    intro: [
      "If you run a small shop, a service business or freelance work and are registered under GST, your customers will ask for a proper tax invoice. You do not need paid billing software to make one.",
      "This guide explains what a GST invoice usually shows, when CGST + SGST or IGST applies, and how to make one as a PDF with the free Invoice & Bill Generator. Your invoice is made on your device; nothing is uploaded.",
    ],
    steps: [
      { title: 'Choose the document type and number', text: "In Document, keep 'Tax Invoice' (other options include Bill of Supply, Proforma Invoice, Quotation, Estimate, Receipt and Cash Memo). Set the invoice number, date and due date. Keep Tax as 'GST (CGST + SGST / IGST)'." },
      { title: 'Fill in your business details', text: "Under 'From (your business)', enter your business name, address, GSTIN, phone and email. When you type a valid GSTIN, the state is filled in from its first two digits." },
      { title: 'Fill in the customer details', text: "Under 'Bill to', enter the customer's name and address. Add their GSTIN for a business customer (B2B), or leave it empty for a consumer (B2C). Set their state. Add a 'Ship to' address only if it is different." },
      { title: 'Add items', text: "For each item, enter the description, HSN/SAC code, quantity, unit, rate and GST %. Use Add item for more rows. Turn on the Discount column if you give discounts." },
      { title: 'Check the tax split and totals', text: "The tool shows whether CGST + SGST or IGST applies, the subtotal, tax and total, and the amount in words. Tick 'Round off the total' if you want a rounded amount." },
      { title: 'Add payment details and download', text: "Open 'Payment details, logo, signature and notes' to add bank details, a UPI ID (this adds a scan-to-pay QR with the amount filled in), your logo, signature or stamp, notes and terms. Check the preview and press Download PDF." },
    ],
    sections: [
      {
        heading: 'CGST + SGST or IGST: which one?',
        paragraphs: [
          "The basic rule is about where the supply happens compared with where you are registered.",
          "If you and the place of supply are in the same state (an intra-state sale), the GST is split equally into CGST (central) and SGST (state). For example, 18% GST becomes 9% CGST + 9% SGST.",
          "If the place of supply is in a different state (an inter-state sale), you charge IGST at the full rate instead.",
          "The tool decides this from the two states: same state, or customer state left empty, means CGST + SGST; different states means IGST. The customer's state is printed as the place of supply. Special cases exist (for example exports and some services), so confirm with your accountant if you are unsure.",
        ],
      },
      {
        heading: 'What a GST invoice usually shows',
        bullets: [
          "Supplier's name, address and GSTIN.",
          "Invoice number (unique, in a series) and invoice date.",
          "Buyer's name and address, and the buyer's GSTIN if they are registered.",
          "Description of goods or services with HSN code (goods) or SAC code (services).",
          "Quantity, unit and rate, and any discount.",
          "Taxable value, the GST rate, and the tax amount split into CGST and SGST, or IGST.",
          "Place of supply (state), total amount, and a signature or stamp of the supplier.",
        ],
      },
      {
        heading: 'GST rates',
        paragraphs: [
          "The GST rate depends on the item or service and its HSN/SAC code, and rates can change. The tool lets you pick a rate for each item, but it cannot tell you which rate applies. Check with your accountant or the official GST portal.",
        ],
      },
      {
        heading: 'Tips',
        bullets: [
          "Tick 'Remember my business, bank details, logo and next invoice number on this device' to save time. It is stored only in this browser.",
          "Use 'New invoice' after downloading. It moves to the next number and clears the customer and items.",
          "Unregistered or composition sellers usually issue a Bill of Supply rather than a Tax Invoice. Ask your accountant which one applies to you.",
        ],
      },
    ],
    faq: [
      ['Is an invoice made with this tool valid for GST?', "The tool helps you lay out the details a GST invoice normally contains. Whether an invoice is correct depends on the details you enter and the rules that apply to your business. We cannot give a legal guarantee, so check with your accountant if needed. This site is not connected with the GST department."],
      ['When should I charge IGST instead of CGST and SGST?', "Charge IGST when the place of supply is in a different state from your own. For a sale within your state, split the tax into CGST and SGST."],
      ['What GST rate should I use?', "It depends on what you sell and its HSN/SAC code. Check the GST portal or ask your accountant."],
      ['Are my invoices stored online?', "No. The invoice is made on your device. If you tick Remember, your business details are saved only in this browser."],
      ['Can I make a quotation or estimate too?', "Yes. Change Document to Quotation, Estimate, Proforma Invoice, Receipt or Cash Memo."],
    ],
    related: ['upi-qr-code-for-shop', 'sign-pdf-online-free', 'merge-pdf-free'],
  },

  // 5
  {
    slug: 'merge-pdf-free',
    title: 'How to Merge PDF Files into One for Free (Phone or PC)',
    description: 'Merge PDF files into one for free, in the order you want. Works on phone and PC, no sign-up, and your files are never uploaded.',
    toolId: 'pdf-merge',
    cta: 'Merge your PDFs now',
    updated: UPDATED,
    minutes: 3,
    keywords: ['merge pdf', 'combine pdf files into one', 'join pdf free', 'merge pdf on phone', 'merge pdf without uploading', 'combine documents into one pdf'],
    intro: [
      "Many forms ask for 'all documents in a single PDF', such as marksheets, ID proof and certificates. Office work often needs the same: a report plus its annexures in one file.",
      "The Merge PDF tool joins your files in the order you choose. It works in your browser, so private documents like ID cards and bank papers stay on your device.",
    ],
    steps: [
      { title: 'Add your PDF files', text: "Drop two or more PDFs into the box, or click to choose them. You can add more files later. Each file shows its page count and size." },
      { title: 'Put them in order', text: "Use the up and down arrow buttons to move files. The number on the left is the order they will appear in. Use the cross button to remove a file." },
      { title: 'Merge', text: "Press 'Merge N PDFs'. The button also shows the total page count, which helps you check nothing is missing." },
      { title: 'Download and check', text: "The merged file downloads automatically with '-merged' added to the first file's name. Open it and scroll through once before you submit it." },
    ],
    sections: [
      {
        heading: 'Common problems and fixes',
        bullets: [
          "'One of the files is password-protected'. Remove the password first with the Unlock PDF tool (you need to know the password), then merge.",
          "A file shows 'unreadable'. It may be damaged or not a real PDF. Open it on your device to check, or save it again as PDF.",
          "Have photos or scans as JPG? Convert them to PDF first with the JPG to PDF tool, then merge.",
          "The merged file is too big for the portal. Use the Compress PDF tool on the merged file.",
        ],
      },
      {
        heading: 'Tips for forms',
        bullets: [
          "Follow the order the form asks for, for example application, ID proof, then certificates.",
          "Rename the final file to something clear, like Name_Documents.pdf.",
          "Keep your original files. Merging does not change them.",
        ],
      },
      {
        heading: 'When merging is useful',
        bullets: [
          "Admission and scholarship forms that ask for all certificates in one file.",
          "Job applications where the resume, cover letter and certificates must go together.",
          "Office reports with annexures, or monthly bills and receipts sent to accounts in one attachment.",
          "Loan or KYC paperwork, where the bank asks for ID proof, address proof and statements together.",
        ],
        paragraphs: [
          "Because the files are joined on your own phone or computer, you can safely merge documents with personal details like Aadhaar, PAN or salary slips. They are not sent to any server.",
        ],
      },
    ],
    faq: [
      ['Is there a limit on the number of files?', "There is no fixed limit. Very large files depend on your device's memory, so on an older phone merge in smaller groups."],
      ['Are my PDFs uploaded?', "No. The files are joined in your browser and never leave your device."],
      ['Can I merge on my mobile phone?', "Yes. Open the tool in your phone's browser and choose the PDFs from your files or downloads."],
      ['Can I remove or reorder pages inside a PDF?', "This tool keeps all pages of each file. To remove, reorder or rotate pages, use the Organize PDF Pages tool first."],
    ],
    related: ['reduce-pdf-size', 'remove-password-from-pdf', 'sign-pdf-online-free'],
  },

  // 6
  {
    slug: 'reduce-pdf-size',
    title: 'How to Reduce PDF Size for Email and Online Form Upload',
    description: 'Reduce PDF size to meet email and portal upload limits. Free, works on phone and PC, and your PDF is compressed on your device.',
    toolId: 'pdf-compress',
    cta: 'Compress your PDF now',
    updated: UPDATED,
    minutes: 3,
    keywords: ['reduce pdf size', 'compress pdf', 'pdf size reducer', 'reduce pdf size for upload', 'compress pdf to 1mb', 'make pdf smaller for email', 'compress scanned pdf'],
    intro: [
      "Scanned documents and phone scans are often much larger than they need to be. Portals may allow only 1 MB or 2 MB per file, and email attachments also have limits.",
      "The Compress PDF tool shrinks image-heavy and scanned PDFs by re-drawing each page at a lower resolution. It runs on your device, so your documents are not uploaded.",
    ],
    steps: [
      { title: 'Choose your PDF', text: "Drop the PDF into the box or click to choose it." },
      { title: 'Pick a compression level', text: "Choose 'Smallest file (72 DPI)', 'Balanced (108 DPI)' or 'Better quality (144 DPI)'. Balanced is a good start for most scans." },
      { title: 'Compress', text: "Press Compress. A progress bar shows the pages being processed." },
      { title: 'Compare and download', text: "The tool shows the original size, the new size and the change in percent. If it is smaller, press Download. If the limit is still not met, try 'Smallest file'." },
      { title: 'Many PDFs? Use bulk', text: "Switch to 'Many files (bulk)', choose the level once, add all the files and press Compress all. You can download them as a ZIP." },
    ],
    sections: [
      {
        heading: 'Important: what changes in the compressed PDF',
        paragraphs: [
          "Each page is turned into a JPEG image. This makes scanned PDFs much smaller, but the text can no longer be selected, copied or searched. For a PDF made from Word or a website (with real text), the result can even be larger. The tool tells you when this happens, and you should then keep the original.",
          "Always keep your original file.",
        ],
      },
      {
        heading: 'Which level to choose',
        table: {
          head: ['Level', 'Best for'],
          rows: [
            ['Smallest file (72 DPI)', 'Strict limits like 1 MB; fine for reading on screen'],
            ['Balanced (108 DPI)', 'Most scanned forms and certificates'],
            ['Better quality (144 DPI)', 'Small print, or documents that may be printed'],
          ],
        },
      },
      {
        heading: 'Other ways to make the file smaller',
        bullets: [
          "Remove pages the portal does not need before compressing.",
          "Scan in black and white or greyscale if colour is not required.",
          "If the PDF is password-protected, remove the password first with Unlock PDF (you need to know it).",
          "If the PDF was made from photos, compressing the photos before turning them into a PDF also works well.",
        ],
      },
      {
        heading: 'Common upload limits to keep in mind',
        paragraphs: [
          "Limits differ from site to site, so always read the instructions on the portal. Many job, exam and admission portals allow a few hundred KB to 2 MB per document. Email services commonly allow attachments of around 20 to 25 MB, but a smaller file is easier for the receiver to open on a phone.",
          "A good habit is to aim a little below the limit. For a 1 MB limit, a 900 KB file is safer than one of exactly 1 MB.",
        ],
      },
      {
        heading: 'Common mistakes',
        bullets: [
          "Compressing the same file again and again. Each round makes it blurrier. Go back to the original and choose a stronger level instead.",
          "Not checking the result. Zoom in on small print, signatures and stamps before you upload.",
          "Compressing a PDF that must stay searchable, like a contract you will copy text from. Keep that one as it is.",
        ],
      },
    ],
    faq: [
      ['Why is my compressed PDF bigger than the original?', "Your PDF probably has real text rather than scanned images, so it is already efficient. Keep the original, or remove pages you do not need."],
      ['Can I compress a PDF to under 1 MB?', "Often yes for scans. Try Smallest file. A long document with many pages may still be over 1 MB; then split it or remove pages."],
      ['Will the text still be readable?', "Yes, it will look the same on screen at normal zoom, but you will not be able to select or search the text."],
      ['Is my PDF uploaded?', "No. Compression happens in your browser and the file never leaves your device."],
    ],
    related: ['merge-pdf-free', 'compress-image-to-20kb-50kb', 'pdf-to-word-free'],
  },

  // 7
  {
    slug: 'remove-password-from-pdf',
    title: 'How to Remove Password from PDF (Bank and Credit Card Statements)',
    description: 'Remove the password from a PDF you can already open, like a bank or credit card statement. Free, and the file and password stay on your device.',
    toolId: 'unlock-pdf',
    cta: 'Unlock your PDF now',
    updated: UPDATED,
    minutes: 3,
    keywords: ['remove password from pdf', 'unlock pdf', 'bank statement pdf password remove', 'credit card statement pdf password', 'pdf password remover', 'remove pdf password without software'],
    intro: [
      "Banks, credit card companies, insurers and payslip systems often send PDFs locked with a password. Typing it every time is tiring, and some portals or apps will not accept a locked file.",
      "The Unlock PDF tool saves a copy without the password. You must already know the password: the tool removes a password you enter, it does not guess or crack passwords. The file and the password stay on your device.",
    ],
    steps: [
      { title: 'Choose the locked PDF', text: "Drop the password-protected PDF into the box, or click to choose it." },
      { title: 'Enter the password', text: "Type the password you normally use to open the file. Use the eye button to check what you typed. If the PDF opens without a password but blocks printing, copying or editing, leave the field empty." },
      { title: 'Unlock and download', text: "Press 'Unlock and download'. The new copy has '-unlocked' in its name and opens without a password and without restrictions." },
      { title: 'Many statements? Use bulk', text: "Switch to 'Many files (bulk)'. Enter the password once; it is tried on every file. Files with a different password are marked so you can change the password and run again. Download all as a ZIP." },
    ],
    sections: [
      {
        heading: 'Finding the password of a bank or card statement',
        bullets: [
          "The email that brought the statement usually explains the password format. Check it first.",
          "It is often a mix of details like part of your name and your date of birth, but every bank has its own format.",
          "Passwords are case-sensitive. If the tool says the password is not correct, check capital letters.",
          "If you still cannot find it, contact your bank or card company. This tool cannot recover forgotten passwords.",
        ],
      },
      {
        heading: 'Use it responsibly',
        bullets: [
          "Only unlock files you own or are allowed to open.",
          "An unlocked statement can be opened by anyone who gets the file. Store it safely and do not forward it carelessly.",
          "If you need to share it securely later, you can add a new password with the Protect PDF with Password tool.",
        ],
      },
      {
        heading: 'Why remove the password at all?',
        bullets: [
          "Loan, visa and tax portals often refuse password-protected PDFs.",
          "Merging statements into one file, or compressing them, needs unlocked files.",
          "Your accountant or CA can open the file without asking you for the password each time.",
          "Some PDFs open freely but block printing or copying. Unlocking removes those limits too.",
        ],
        paragraphs: [
          "Because the unlocking happens on your own device, your statement and password are never sent to an online server, which is important for financial documents.",
        ],
      },
    ],
    faq: [
      ['Can it unlock a PDF if I forgot the password?', "No. It only removes a password you already know. It does not guess, crack or bypass passwords."],
      ['Is my password or statement sent anywhere?', "No. The PDF is unlocked in your browser and neither the file nor the password leaves your device."],
      ['Why does it say the password is wrong?', "Check capital letters, spaces and the date format the bank uses. Read the statement email again for the exact format."],
      ['The PDF opens without a password but I cannot print it. Can this help?', "Yes. Leave the password empty and press Unlock and download. The copy will allow printing and copying."],
      ['Is this connected with my bank?', "No. This site is not affiliated with any bank or card company."],
    ],
    related: ['merge-pdf-free', 'reduce-pdf-size', 'pdf-to-word-free'],
  },

  // 8
  {
    slug: 'pdf-to-word-free',
    title: 'How to Convert PDF to Word for Free and Edit It',
    description: 'Convert PDF to Word (.docx) for free and edit it in Word or Google Docs. No sign-up, and your PDF is converted on your device.',
    toolId: 'pdf-to-word',
    cta: 'Convert PDF to Word now',
    updated: UPDATED,
    minutes: 3,
    keywords: ['pdf to word', 'convert pdf to word free', 'pdf to docx', 'edit pdf in word', 'pdf to editable word', 'pdf to word without uploading'],
    intro: [
      "You received a PDF but need to change a few lines, reuse the text in a letter, or fill in a document. The easiest way is to turn it into a Word file.",
      "The PDF to Word tool makes a .docx file you can open in Microsoft Word, Google Docs or WPS Office. It works in your browser and your file is not uploaded.",
    ],
    steps: [
      { title: 'Choose your PDF', text: "Drop the PDF into the box or click to choose it." },
      { title: 'Pick the conversion type', text: "In Conversion, choose 'Editable text (layout is simplified)' if you want to change the text, or 'Exact look (pages as pictures, not editable)' if you only need the document to look the same inside Word." },
      { title: 'Convert', text: "Press 'Convert to Word'. The button shows which page is being converted." },
      { title: 'Open and edit', text: "The .docx file downloads with the same name as your PDF. Open it in Word or Google Docs and check the formatting." },
      { title: 'Several PDFs? Use bulk', text: "Switch to 'Many files (bulk)', choose the mode, add the PDFs and press Convert all." },
    ],
    sections: [
      {
        heading: 'What to expect from each mode',
        table: {
          head: ['Mode', 'You get', 'Limits'],
          rows: [
            ['Editable text', 'Text, paragraphs and headings you can edit', 'Columns, tables and images are not rebuilt'],
            ['Exact look', 'Each page as a picture, looks identical', 'Text cannot be edited'],
          ],
        },
      },
      {
        heading: 'Scanned PDFs',
        paragraphs: [
          "A scanned PDF is just pictures of pages, so there is no text inside to convert. If the tool finds very little text, it tells you. Use Exact look mode, or use the Image to Text (OCR) tool to read the text from the page images.",
        ],
      },
      {
        heading: 'Common problems',
        bullets: [
          "Password-protected PDF: unlock it first with the Unlock PDF tool, using the password you know.",
          "Tables come out as plain lines of text: this is expected in Editable text mode. Rebuild the table in Word, or copy the numbers into a spreadsheet.",
          "Fonts look different: the Word file uses a standard font. Change it in Word if needed.",
        ],
      },
      {
        heading: 'How to tell if your PDF has real text',
        paragraphs: [
          "Open the PDF and try to select a word with your mouse or by long-pressing on your phone. If you can highlight single words, the PDF has real text and Editable text mode will work well. If the whole page gets selected like a picture, or nothing can be selected, it is a scan.",
        ],
      },
      {
        heading: 'Tips after converting',
        bullets: [
          "Turn on 'Show formatting marks' in Word to see tabs and line breaks, which makes cleanup faster.",
          "Use Word's styles for headings so the document is easy to update later.",
          "If you only need to add a signature, a date or a few words, it is often quicker to write them straight on the PDF with the Sign & Fill PDF tool, without converting at all.",
          "Save the edited document as PDF again from Word before you send it, so the layout does not change on the receiver's device.",
        ],
      },
    ],
    faq: [
      ['Will the Word file look exactly like the PDF?', "In Editable text mode the text is kept but the layout is simplified. In Exact look mode it looks the same but cannot be edited."],
      ['Can I convert a scanned PDF to editable Word?', "Not directly. Use the Image to Text (OCR) tool to get the text, then paste it into Word."],
      ['Is my PDF uploaded?', "No. The conversion happens in your browser and the file stays on your device."],
      ['Does it work with Hindi PDFs?', "If the PDF contains real text, the text is copied as it is. Some PDFs store Hindi text in a way that does not copy well; in that case, try the OCR tool with Hindi selected."],
    ],
    related: ['extract-text-from-image-hindi-english', 'remove-password-from-pdf', 'reduce-pdf-size'],
  },

  // 9
  {
    slug: 'cgpa-to-percentage',
    title: 'CGPA to Percentage: Formula for CBSE, AICTE, VTU and Mumbai University',
    description: 'Convert CGPA to percentage using the common CBSE, AICTE, VTU and Mumbai University formulas, with examples. Your university rule is final.',
    toolId: 'cgpa-calculator',
    cta: 'Convert your CGPA now',
    updated: UPDATED,
    minutes: 3,
    keywords: ['cgpa to percentage', 'cgpa to percentage formula', 'cbse cgpa to percentage', 'aicte cgpa to percentage', 'vtu cgpa to percentage', 'mumbai university cgpa to percentage', 'sgpa to cgpa'],
    intro: [
      "Job forms, higher-study applications and scholarship portals often ask for your marks as a percentage, but your grade card shows CGPA. Each board or university has its own way to convert.",
      "This guide lists the commonly published formulas and shows how to use the CGPA to Percentage Calculator. Remember: your university's own rule, printed on the grade card or in its ordinance, is always final.",
    ],
    steps: [
      { title: 'Choose CGPA ⇄ percentage', text: "Open the calculator. The 'CGPA ⇄ percentage' tab is for converting in either direction." },
      { title: 'Pick your board or university rule', text: "In 'Board or university rule', choose CBSE (Class 10), AICTE (engineering, 10-point), VTU, Mumbai University, or 'Simple × 10'. The formula used is shown below the list." },
      { title: 'Enter your CGPA', text: "Type your CGPA (out of 10). The percentage appears next to it. You can also type a percentage to get the CGPA." },
      { title: 'Compare with other rules', text: "The tool also shows your CGPA under three other rules and a rough 4.0-scale value, so you can see how much the formula matters." },
      { title: 'Need CGPA from semester SGPAs?', text: "Switch to 'SGPA → CGPA'. Enter each semester's SGPA and credits, use Add semester for more. You get the credit-weighted CGPA, the simple average and the approximate percentage." },
    ],
    sections: [
      {
        heading: 'Common CGPA to percentage formulas',
        paragraphs: ["These are the formulas the calculator uses. Universities can change their rules or publish their own conversion tables, so always confirm with your grade card or university."],
        table: {
          head: ['Rule', 'Formula', 'Example'],
          rows: [
            ['CBSE (Class 10)', 'Percentage = CGPA × 9.5', '8.6 CGPA = 81.7%'],
            ['AICTE (engineering, 10-point)', 'Percentage = (CGPA − 0.75) × 10', '8.2 CGPA = 74.5%'],
            ['VTU', 'Percentage = (CGPA − 0.75) × 10', '8.2 CGPA = 74.5%'],
            ['Mumbai University (7-point+ CGPA)', 'Percentage = 7.1 × CGPA + 11', '8.0 CGPA = 67.8%'],
            ['Simple × 10 (Anna University and many others)', 'Percentage = CGPA × 10', '8.2 CGPA = 82%'],
          ],
        },
      },
      {
        heading: 'How CGPA is calculated from SGPA',
        paragraphs: [
          "Most universities use a credit-weighted average: CGPA = sum of (SGPA × credits) ÷ total credits. A semester with more credits counts more.",
          "Some universities use a simple average of SGPAs. If yours does, enter the same credits for every semester and the two results will match.",
        ],
      },
      {
        heading: 'Common mistakes',
        bullets: [
          "Using the CBSE 9.5 rule for a college degree. It is meant for CBSE Class 10 grades.",
          "Converting each semester to percentage and averaging. Convert the final CGPA instead, unless your university says otherwise.",
          "Writing a converted percentage on a form that asks for CGPA. Give exactly what the form asks for.",
        ],
      },
    ],
    faq: [
      ['Which formula is correct for my university?', "The one your university publishes, usually on the back of the grade card or in its ordinance. The formulas here are the commonly published ones, and your university's rule is final."],
      ['Why is CBSE CGPA multiplied by 9.5?', "CBSE published the 9.5 factor for its Class 10 grading system. Use it only for CBSE Class 10 results."],
      ['How do I convert CGPA to a 4.0 GPA for studying abroad?', "The calculator shows a rough 4.0-scale value, but foreign universities usually ask for an official evaluation (for example WES), so use that for applications."],
      ['How do I calculate CGPA from SGPA?', "Use the SGPA → CGPA tab. Enter each semester's SGPA and credits; the tool gives the credit-weighted CGPA and the simple average."],
      ['Is this calculator official?', "No. It is not connected with CBSE, AICTE, VTU, Mumbai University or any other body. It only applies the commonly published formulas."],
    ],
    related: ['ssc-photo-signature-size', 'compress-image-to-20kb-50kb', 'pdf-to-word-free'],
  },

  // 10
  {
    slug: 'emi-calculation-formula',
    title: 'EMI Calculation Formula: How to Calculate Home, Car and Personal Loan EMI',
    description: 'Learn the EMI calculation formula with a worked example, and calculate your home, car or personal loan EMI, total interest and yearly schedule.',
    toolId: 'emi',
    cta: 'Calculate your EMI now',
    updated: UPDATED,
    minutes: 4,
    keywords: ['emi calculation formula', 'emi calculator', 'home loan emi calculator', 'car loan emi', 'personal loan emi calculation', 'how to calculate emi', 'loan interest calculator'],
    intro: [
      "EMI (Equated Monthly Instalment) is the fixed amount you pay every month to repay a loan. Part of each EMI pays the interest and the rest reduces the loan amount.",
      "Before you take a home, car or personal loan, it helps to know your EMI and how much interest you will pay in total. This guide shows the formula, a worked example, and how to use the free EMI Calculator.",
    ],
    steps: [
      { title: 'Enter the loan amount', text: "Type the amount you will borrow in Loan amount, for example 1000000 for ₹10 lakh." },
      { title: 'Enter the interest rate', text: "Type the yearly interest rate in 'Interest rate (% per year)', for example 8.5." },
      { title: 'Enter the tenure', text: "Type the loan period in years in 'Tenure (years)'. Half years like 2.5 are allowed." },
      { title: 'Read the results', text: "You see the Monthly EMI, Total interest and Total payment, plus a bar showing how much of what you pay is principal and how much is interest." },
      { title: 'Check the yearly schedule', text: "The table shows the principal paid, interest paid and balance left for each year. Press 'Show all' to see every year." },
    ],
    sections: [
      {
        heading: 'The EMI formula',
        paragraphs: [
          "EMI = P × r × (1 + r)^n ÷ ((1 + r)^n − 1)",
          "P is the loan amount. r is the monthly interest rate, which is the yearly rate ÷ 12 ÷ 100. n is the number of monthly instalments, which is years × 12.",
        ],
      },
      {
        heading: 'Worked example: ₹10 lakh at 8.5% for 10 years',
        bullets: [
          "P = 10,00,000",
          "r = 8.5 ÷ 12 ÷ 100 = 0.0070833",
          "n = 10 × 12 = 120",
          "(1 + r)^n = 1.0070833^120 ≈ 2.3326",
          "EMI = 10,00,000 × 0.0070833 × 2.3326 ÷ (2.3326 − 1) ≈ ₹12,399 per month",
          "Total payment = 12,398.57 × 120 ≈ ₹14,87,828, so total interest ≈ ₹4,87,828",
        ],
      },
      {
        heading: 'More examples',
        table: {
          head: ['Loan', 'Rate', 'Tenure', 'EMI (approx.)', 'Total interest (approx.)'],
          rows: [
            ['₹25,00,000 (home)', '8.5%', '20 years', '₹21,696', '₹27,06,939'],
            ['₹8,00,000 (car)', '9%', '5 years', '₹16,607', '₹1,96,401'],
            ['₹5,00,000 (personal)', '10%', '5 years', '₹10,624', '₹1,37,411'],
          ],
        },
        paragraphs: ["These examples are only for illustration. Your bank's rate depends on the lender, your credit profile and the loan type."],
      },
      {
        heading: 'Tips before you take a loan',
        bullets: [
          "A longer tenure lowers the EMI but increases the total interest a lot. Compare both numbers.",
          "Ask about processing fees, insurance and prepayment charges. They are not part of the EMI formula.",
          "Floating-rate loans can change when rates change, which changes your EMI or tenure.",
          "Early EMIs are mostly interest. Prepaying in the first few years saves the most interest.",
        ],
      },
    ],
    faq: [
      ['Why is my bank EMI slightly different?', "Banks may round differently, count interest from the disbursement date, or add fees and insurance. Use the calculator as a close estimate and confirm with your lender."],
      ['Does a lower EMI mean a cheaper loan?', "Not always. A lower EMI from a longer tenure usually means more total interest. Compare the total payment."],
      ['How is the interest rate converted to a monthly rate?', "Divide the yearly rate by 12 and by 100. For 8.5% a year, r = 8.5 ÷ 12 ÷ 100 = 0.0070833."],
      ['Is this financial advice?', "No. The calculator only does the maths. For choosing a loan, talk to your bank or a qualified advisor."],
    ],
    related: ['gst-invoice-format-free', 'upi-qr-code-for-shop', 'cgpa-to-percentage'],
  },

  // 11
  {
    slug: 'heic-to-jpg-iphone-photos',
    title: 'How to Convert iPhone HEIC Photos to JPG (Free, No Upload)',
    description: 'Convert iPhone HEIC photos to JPG or PNG for free, many at once. Open them on Windows and upload them to any form. Photos stay on your device.',
    toolId: 'heic-to-jpg',
    cta: 'Convert HEIC to JPG now',
    updated: UPDATED,
    minutes: 3,
    keywords: ['heic to jpg', 'convert iphone photo to jpg', 'heic to jpg converter free', 'open heic on windows', 'heic to png', 'iphone photo not uploading'],
    intro: [
      "iPhones save photos in HEIC format by default. HEIC files are small and good quality, but Windows, many websites and government portals cannot open or accept them. That is why an iPhone photo may fail to upload on a form.",
      "The HEIC to JPG Converter turns HEIC photos into normal JPG or PNG files in your browser. Your photos are not uploaded anywhere.",
    ],
    steps: [
      { title: 'Get the HEIC photos onto your device', text: "On a computer, copy them from your iPhone, email, WhatsApp document or cloud storage. On the iPhone itself, choose them from Files or Photos in the browser." },
      { title: 'Add the photos', text: "Drop the HEIC photos into the box or click to choose them. You can add many at once, and add more later." },
      { title: 'Pick the format and quality', text: "In 'Convert to', choose JPG (best for forms and sharing) or PNG. For JPG, the Quality slider starts at 90%, which is a good balance." },
      { title: 'Convert', text: "Press Convert. A progress bar shows each photo as it is converted." },
      { title: 'Download', text: "Download each photo with its Download button, or press 'Download all (ZIP)' when you have converted more than one." },
    ],
    sections: [
      {
        heading: 'Good to know',
        bullets: [
          "Location and camera details stored in the photo are not copied to the JPG. That is good for privacy.",
          "A Live Photo or burst can contain more than one image. Each one is saved as a separate file.",
          "Converting a very large batch on an older phone can take a while. Do it in smaller groups if it feels slow.",
          "Need a smaller file for a form? After converting, use Compress Image to 50 KB.",
        ],
      },
      {
        heading: 'JPG or PNG: which should you pick?',
        table: {
          head: ['Format', 'Choose it when', 'File size'],
          rows: [
            ['JPG', 'Uploading to forms, sending on WhatsApp or email, printing', 'Small'],
            ['PNG', 'You will edit the photo further and want no extra quality loss', 'Much larger'],
          ],
        },
        paragraphs: ["For almost everyone, JPG at 90% quality is the right choice."],
      },
      {
        heading: 'Common problems',
        bullets: [
          "'Couldn't convert' for a file: it may not really be a HEIC photo. Files that are already JPG do not need converting.",
          "The photo looks rotated: open it in your gallery and rotate it, or use the Crop, Rotate & Resize Image tool.",
          "Photos sent over WhatsApp as normal images are usually already JPG. HEIC files mostly come from AirDrop, iCloud, email or WhatsApp 'document' sends.",
        ],
      },
      {
        heading: 'Stop your iPhone saving HEIC (optional)',
        paragraphs: [
          "On the iPhone, go to Settings, then Camera, then Formats, and choose 'Most Compatible'. New photos will be saved as JPG. Photos you already took stay in HEIC, so convert them with the tool.",
        ],
      },
    ],
    faq: [
      ['Why can I not open HEIC photos on my Windows laptop?', "HEIC is Apple's photo format. Windows and many apps need extra software to open it. Converting to JPG makes the photo work everywhere."],
      ['Will the quality drop?', "At the default 90% quality, the JPG looks the same to the eye. Choose PNG if you need no compression loss, but PNG files are much bigger."],
      ['Are my photos uploaded?', "No. The conversion happens in your browser and your photos stay on your device."],
      ['Why does a form say my iPhone photo is invalid?', "The form likely accepts only JPG or JPEG. Convert the photo to JPG, and then resize or compress it to the size the form asks for."],
    ],
    related: ['compress-image-to-20kb-50kb', 'ssc-photo-signature-size', 'passport-size-photo-at-home'],
  },

  // 12
  {
    slug: 'compress-video-for-whatsapp',
    title: 'How to Compress a Video for WhatsApp (Under 16 MB)',
    description: 'Compress a video for WhatsApp to fit under 16 MB, or make it smaller for email. Free, works in your browser, and the video is never uploaded.',
    toolId: 'compress-video',
    cta: 'Compress your video now',
    updated: UPDATED,
    minutes: 3,
    keywords: ['compress video for whatsapp', 'reduce video size for whatsapp', 'video compressor 16mb', 'make video smaller', 'compress mp4', 'whatsapp video size limit'],
    intro: [
      "Phone videos are large: a one-minute clip can be over 100 MB. WhatsApp, email and many upload forms have size limits, so a big video may not send or may get heavily reduced.",
      "The Compress Video tool makes your video smaller by quality or to a target size such as 16 MB. It uses your device's own video encoder, so the video is never uploaded.",
    ],
    steps: [
      { title: 'Choose your video', text: "Drop the video into the box or click to choose it. MP4, MOV, WebM and MKV are supported. The tool shows the resolution, length and file size." },
      { title: 'Choose To a file size', text: "Select 'To a file size' and tap 'WhatsApp (16 MB)'. Other quick options are Email (25 MB), Discord (10 MB) and 50 MB, or type your own Target size (MB)." },
      { title: 'Pick a resolution', text: "For large videos the tool starts at 720p, which looks good on phones and saves a lot of space. Choose 480p or 360p for long videos, or Keep original." },
      { title: 'Compress', text: "Press 'Compress video'. A percentage shows the progress, and you can Cancel. Long videos take longer, especially on older phones." },
      { title: 'Preview and download', text: "Play the result in the preview, check the new size and how much you saved, then press Download." },
    ],
    sections: [
      {
        heading: 'WhatsApp video size limits',
        paragraphs: [
          "The commonly cited limit for sending a video normally on WhatsApp is about 16 MB. Apps change their limits over time, so if a video still does not send, compress it a little more.",
          "For larger files, you can usually send the video as a document instead. It is sent without WhatsApp's own compression, but the document limit can also change, so do not rely on an exact number.",
        ],
      },
      {
        heading: 'Getting the best quality at a small size',
        bullets: [
          "Shorter is better. A 16 MB target for a 30-second clip looks much better than for a 5-minute clip.",
          "Lower the resolution for long videos. 480p at a sensible bitrate looks better than 1080p squeezed too hard.",
          "Tick 'Remove audio' if the sound is not needed. It saves a little extra space.",
          "Prefer 'By quality' (Smallest file, Balanced or High quality) when there is no strict limit.",
          "Several videos? Switch to 'Many files (bulk)'. They are compressed one after another and can be downloaded as a ZIP.",
        ],
      },
      {
        heading: 'Common problems',
        bullets: [
          "'This video couldn't be read': very old formats like AVI, WMV and 3GP are not supported.",
          "The result is not smaller: the video is already well compressed. Try a lower resolution.",
          "No sound in the result: some browsers cannot re-encode certain audio tracks. The tool tells you when this happens. Try a recent Chrome or Edge.",
        ],
      },
    ],
    faq: [
      ['What is the WhatsApp video size limit?', "The commonly cited limit for a normal video message is about 16 MB, but apps change their limits over time. For bigger files you can try sending the video as a document."],
      ['Will compressing reduce quality?', "Yes, a little. Choosing a lower resolution together with the target size usually gives a cleaner result than forcing a big video into a small size."],
      ['Is my video uploaded?', "No. It is compressed on your device using your browser's built-in video encoder."],
      ['Why is it slow?', "Video compression is heavy work. Long or 4K videos can take several minutes on a phone. Keep the screen on and the tab open."],
      ['Can I make a video fit an email attachment?', "Yes. Choose To a file size and tap Email (25 MB), or type the limit of your email service."],
    ],
    related: ['compress-image-to-20kb-50kb', 'heic-to-jpg-iphone-photos', 'reduce-pdf-size'],
  },

  // 13
  {
    slug: 'extract-text-from-image-hindi-english',
    title: 'How to Extract Text from an Image in Hindi and English (Free OCR)',
    description: 'Extract text from an image or screenshot in Hindi, English and other Indian languages with free OCR. Copy or download the text. Images stay on your device.',
    toolId: 'image-to-text',
    cta: 'Extract text from your image',
    updated: UPDATED,
    minutes: 3,
    keywords: ['extract text from image', 'image to text hindi', 'hindi ocr online free', 'photo to text converter', 'copy text from screenshot', 'jpg to text', 'image to text english'],
    intro: [
      "Typing out text from a photo of a notice, a screenshot or a scanned page takes time and causes mistakes. OCR (optical character recognition) reads the text for you so you can copy and edit it.",
      "The Image to Text tool reads English, Hindi and several other Indian languages. The text is read in your browser and your image is never uploaded.",
    ],
    steps: [
      { title: 'Add the image', text: "Drop an image into the box, click to choose it, or paste a screenshot with Ctrl+V. JPG, PNG and other common image formats work." },
      { title: 'Pick the language', text: "In 'Language in the image', choose English, Hindi or 'English + Hindi' for mixed text. Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi and Urdu are also available." },
      { title: 'Extract the text', text: "Press 'Extract text'. The first time you use a language, its data is downloaded (a few MB) and then kept by your browser for next time." },
      { title: 'Check, copy or download', text: "The text appears in an editable box. Fix any wrong characters, then copy it or press 'Download .txt'." },
      { title: 'Many images? Use bulk', text: "Switch to 'Many files (bulk)', pick the language, add the images and press 'Extract text from all'. You can download each .txt file or all the text as one .txt." },
    ],
    sections: [
      {
        heading: 'Tips for better accuracy',
        bullets: [
          "Use a sharp, well-lit photo taken straight from above, not at an angle.",
          "Crop the image to just the text before extracting.",
          "Pick the right language. Hindi text read with English selected will come out as nonsense.",
          "Use 'English + Hindi' only when the image really has both. A single language is usually more accurate.",
          "Printed text works much better than handwriting.",
        ],
      },
      {
        heading: 'Common uses',
        bullets: [
          "Copying text from a notice, circular or newspaper cutting.",
          "Getting text from a screenshot of a chat or web page.",
          "Reading text from a scanned PDF: first save the pages as JPG with the PDF to JPG tool, then extract the text here.",
          "Turning a printed question paper or old typed letter into text you can edit and reprint.",
        ],
      },
      {
        heading: 'Common Hindi OCR mistakes to check',
        paragraphs: [
          "Devanagari has matras, half letters and joined letters, so OCR makes a few typical mistakes. Read the result once and look especially for these:",
        ],
        bullets: [
          "Matras (like ि, ी, ु, ू) missing or swapped, especially in small or blurry text.",
          "Half letters and joined letters (like क्ष, त्र, ज्ञ) read as separate letters.",
          "The top line (shirorekha) cut off when the photo is cropped too tightly. Leave a little space around the text.",
          "Numbers in Devanagari (१, २, ३) and English (1, 2, 3) mixed up. Check dates and amounts carefully.",
        ],
      },
      {
        heading: 'Where to paste the text',
        bullets: [
          "Word or Google Docs, to edit and format it.",
          "A WhatsApp message or email, to share it quickly.",
          "Google Translate or another translator, if you need it in another language.",
        ],
      },
    ],
    faq: [
      ['Can it read Hindi handwriting?', "It is made for printed text. Very neat handwriting may partly work, but expect many errors."],
      ['Why are some words wrong?', "OCR guesses each character. Blur, shadows, small fonts and the wrong language cause mistakes. Always read through the result."],
      ['Is my image uploaded?', "No. Text recognition runs in your browser. Only the language data is downloaded the first time; your image stays on your device."],
      ['Can I convert a scanned PDF to text?', "Yes, in two steps: save the PDF pages as images with PDF to JPG, then extract the text from them here using bulk mode."],
      ['Does it work offline?', "After a language's data has been downloaded once, it is cached by your browser. You need an internet connection the first time."],
    ],
    related: ['pdf-to-word-free', 'heic-to-jpg-iphone-photos', 'compress-image-to-20kb-50kb'],
  },

  // 14
  {
    slug: 'upi-qr-code-for-shop',
    title: 'How to Make a UPI QR Code for Your Shop (Free, Any UPI App)',
    description: 'Make a UPI QR code for your shop with your UPI ID, print it, and receive payments from any UPI app straight to your bank account. Free.',
    toolId: 'qr-upi',
    cta: 'Make your UPI QR code now',
    updated: UPDATED,
    minutes: 3,
    keywords: ['upi qr code generator', 'make upi qr code for shop', 'upi payment qr', 'qr code for gpay phonepe paytm', 'upi id qr code', 'print upi qr code'],
    intro: [
      "A printed UPI QR code lets customers pay you by scanning with any UPI app. Shops, tuition teachers, tiffin services and small sellers use it to collect payments without handling cash.",
      "The UPI Payment QR Code tool makes a QR from your own UPI ID. Money paid through it goes straight to the bank account linked to that UPI ID. The QR is made in your browser and nothing is sent to us.",
    ],
    steps: [
      { title: 'Find your UPI ID (VPA)', text: "Open your UPI app and look in the profile section. A UPI ID looks like name@bankhandle. Copy it exactly." },
      { title: 'Fill in the details', text: "Enter your UPI ID in 'UPI ID (VPA)' and your shop or personal name in 'Payee name'. Leave the Amount blank for a shop QR so customers can type any amount. Add a Note if you like." },
      { title: 'Adjust the look', text: "Choose the Size, Error correction and colours. Keep dark colours on a light background so every phone can scan it." },
      { title: 'Download', text: "Press Download PNG for printing or sharing, or Download SVG for very sharp large prints." },
      { title: 'Test before you print', text: "Scan the QR with a UPI app on another phone. Check that your name and UPI ID appear correctly, then make a small payment, like ₹1, and confirm it reaches your account." },
    ],
    sections: [
      {
        heading: 'How it works',
        paragraphs: [
          "The QR only stores a payment link with your UPI ID, payee name, currency, and optionally an amount and note. When a customer scans it, their UPI app opens with your details filled in, and the money goes directly from their bank to the account linked to your UPI ID. This site never handles the money.",
          "This tool is not connected with NPCI, any bank or any payment app.",
        ],
      },
      {
        heading: 'Fixed amount or open amount?',
        bullets: [
          "Open amount (leave blank): best for a shop counter, so customers enter the bill amount.",
          "Fixed amount: useful for a fixed fee, like a monthly tuition fee or an event ticket. The amount is filled in for the payer.",
          "For invoices, the Invoice & Bill Generator can add a UPI QR with the invoice amount filled in.",
        ],
      },
      {
        heading: 'Safety tips',
        bullets: [
          "Check the UPI ID carefully. A single wrong letter sends money to someone else or fails.",
          "Laminate the printed QR and check it now and then; replace it if someone sticks another code over it.",
          "Customers only scan to pay. You never need to scan a QR or enter your PIN to receive money.",
          "Some UPI apps may show a limit or warning for payments to personal UPI IDs used for business. Check with your bank or app if you collect many payments.",
        ],
      },
    ],
    faq: [
      ['Will this QR work with GPay, PhonePe, Paytm and BHIM?', "It uses the standard UPI payment link, which UPI apps support. Always test with a small payment before you put it up."],
      ['Where does the money go?', "Straight to the bank account linked to the UPI ID you entered. This site never receives or handles the money."],
      ['Is it safe to share my UPI ID?', "Your UPI ID is meant for receiving money, and the QR only contains that ID, your name and optional amount and note. Never share your UPI PIN."],
      ['Do I need a business account?', "Not to make the QR. For higher volumes, banks and apps offer merchant accounts with extra features; ask your bank if you need one."],
      ['Is my information stored anywhere?', "No. The QR is made in your browser and nothing is sent to our server."],
    ],
    related: ['gst-invoice-format-free', 'emi-calculation-formula', 'sign-pdf-online-free'],
  },

  // 15
  {
    slug: 'sign-pdf-online-free',
    title: 'How to Sign a PDF Online for Free (Draw or Upload Your Signature)',
    description: 'Sign a PDF online for free: draw or upload your signature, add text or a date, and download the signed PDF. Your file never leaves your device.',
    toolId: 'sign-pdf',
    cta: 'Sign your PDF now',
    updated: UPDATED,
    minutes: 3,
    keywords: ['sign pdf online free', 'add signature to pdf', 'e sign pdf', 'how to sign a pdf on phone', 'fill and sign pdf', 'put signature on pdf without printing'],
    intro: [
      "Offer letters, rent agreements, school forms and office documents often arrive as PDFs that need your signature. Printing, signing and scanning takes time and makes a blurry copy.",
      "The Sign & Fill PDF tool lets you place your signature, your name, a date or a tick mark anywhere on the PDF. The PDF is signed on your device and is never uploaded.",
    ],
    steps: [
      { title: 'Choose the PDF', text: "Drop the PDF into the box or click to choose it. The first page opens in the preview." },
      { title: 'Create your signature', text: "Pick Draw signature to sign with your finger or mouse, then press 'Use this signature'. Or pick Upload signature and add a photo of your signature on white paper; the paper is made transparent. Choose Black, Blue or Red ink." },
      { title: 'Add text or a date', text: "Pick 'Text or date' to type your name or a form answer and press Add text. Use 'Add today's date' or 'Add X mark' for quick entries." },
      { title: 'Place everything', text: "Drag each item to the right spot on the page. Select an item to change its Size, or Delete it. Use the arrows to move to other pages." },
      { title: 'Download', text: "Press 'Download signed PDF'. Open the file to check every page before you send it." },
    ],
    sections: [
      {
        heading: 'Is this a legal digital signature?',
        paragraphs: [
          "The tool places an image of your signature on the page, just like signing a printout and scanning it. It is not a certificate-based digital signature (DSC), which some government filings and tenders require. If a document specifically asks for a DSC or Aadhaar-based eSign, use a service that provides that.",
          "For many everyday documents, such as offer letters, internal forms and declarations, a signature image is commonly accepted. If in doubt, ask the person who sent the document.",
        ],
      },
      {
        heading: 'Tips for a clean signature',
        bullets: [
          "For an uploaded signature, sign with a dark pen on plain white paper and take a sharp photo in good light.",
          "Draw slowly. A signature drawn on a phone screen often looks better with a stylus or when the phone is turned sideways.",
          "Use blue ink if the receiver needs to tell the signature apart from printed text.",
          "Make the signature about the size of the signature line; do not let it cover printed text.",
        ],
      },
      {
        heading: 'Common problems',
        bullets: [
          "The PDF will not open: it may be password-protected. Remove the password with Unlock PDF (you need to know it), then sign.",
          "You need to sign several documents together: merge them with Merge PDF first, then sign once and place the signature on each page that needs it.",
        ],
      },
    ],
    faq: [
      ['Can I sign a PDF on my phone?', "Yes. Open the tool in your phone's browser, draw your signature with your finger, and drag it into place."],
      ['Is my document uploaded?', "No. The PDF is signed in your browser and never leaves your device."],
      ['Is this valid as a digital signature?', "It adds an image of your signature, like signing a printout. It is not a certificate-based digital signature (DSC)."],
      ['Can I fill in a PDF form with this?', "Yes. Use 'Text or date' to type answers and place them on the form fields, and 'Add X mark' for tick boxes."],
      ['Can I sign on more than one page?', "Yes. Move to another page with the arrows and add your signature again."],
    ],
    related: ['merge-pdf-free', 'remove-password-from-pdf', 'gst-invoice-format-free'],
  },
]
