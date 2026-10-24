(function attachReceiptPdf(root) {
  const PAGE_WIDTH = 595;
  const PAGE_HEIGHT = 842;
  const RENDER_SCALE = 2;
  const PURPLE = "#7a13aa";
  const DARK_PURPLE = "#560b79";
  const LAVENDER = "#f4ebfa";
  const MUTED = "#666666";
  const INK = "#27282a";

  function printable(value) {
    return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  }

  function money(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) throw new Error("Receipt amount is invalid.");
    return `GH₵ ${amount.toFixed(2)}`;
  }

  function normalizedItems(receipt) {
    const items = Array.isArray(receipt?.items) ? receipt.items : [];
    if (!items.length) throw new Error("Receipt items are unavailable.");
    return items.map(item => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unit_price);
      const lineTotal = Number(item.line_total);
      if (!Number.isInteger(quantity) || quantity < 1 || !Number.isFinite(unitPrice) || unitPrice < 0 || !Number.isFinite(lineTotal) || Math.abs(lineTotal - unitPrice * quantity) > 0.01) {
        throw new Error("Receipt item details are invalid.");
      }
      return {
        product_name: printable(item.product_name || "Product"),
        image_url: printable(item.image_url || ""),
        size: printable(item.size || "N/A"),
        quantity,
        unit_price: unitPrice,
        line_total: lineTotal
      };
    });
  }

  function validateVerifiedReceipt(receipt) {
    if (receipt?.verified !== true || String(receipt.payment_status || "").trim().toLowerCase() !== "verified paid") {
      throw new Error("A receipt can only be created from a backend-verified paid order.");
    }
    const items = normalizedItems(receipt);
    const subtotal = Number(receipt.subtotal);
    const total = Number(receipt.total_amount);
    const calculatedSubtotal = Math.round((items.reduce((sum, item) => sum + item.line_total, 0) + Number.EPSILON) * 100) / 100;
    if (!Number.isFinite(subtotal) || !Number.isFinite(total) || Math.abs(calculatedSubtotal - subtotal) > 0.01 || Math.abs(subtotal - total) > 0.01) {
      throw new Error("Receipt totals do not match the saved order items.");
    }
    return { items, subtotal, total };
  }

  function receiptLines(receipt) {
    const { items, subtotal, total } = validateVerifiedReceipt(receipt);
    const lines = [
      "KAY'S HAVEN",
      "Quality products from crib to campus.",
      "PURCHASE AND PAYMENT RECEIPT",
      `Order number: ${printable(receipt.order_number || "Unavailable")}`,
      `Purchase date: ${receipt.purchase_date ? new Date(receipt.purchase_date).toLocaleString("en-GB", { timeZone: "Africa/Accra" }) : "Unavailable"}`,
      `Customer: ${printable(receipt.customer_name || "Customer")}`
    ];
    if (receipt.phone) lines.push(`Phone: ${printable(receipt.phone)}`);
    if (receipt.email) lines.push(`Email: ${printable(receipt.email)}`);
    lines.push(`Payment method: ${printable(receipt.payment_method || "Paystack")}`);
    lines.push(`Payment reference: ${printable(receipt.payment_reference || "Unavailable")}`);
    lines.push("Payment status: VERIFIED PAID", "", "ITEMIZED PURCHASE");
    for (const item of items) {
      lines.push(`${item.product_name} | Size: ${item.size} | Quantity: ${item.quantity}`);
      lines.push(`Unit price: ${money(item.unit_price)} | Line total: ${money(item.line_total)}`);
    }
    lines.push("", `Subtotal: ${money(subtotal)}`, `TOTAL PAID: ${money(total)}`, "Thank you for shopping with Kay's Haven.");
    return lines;
  }

  function wrapText(context, value, maxWidth) {
    const words = printable(value).split(/\s+/).filter(Boolean);
    const lines = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && context.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

  function drawWrappedText(context, text, x, y, maxWidth, lineHeight, maxLines = 3) {
    const lines = wrapText(context, text, maxWidth).slice(0, maxLines);
    if (lines.length === maxLines && wrapText(context, text, maxWidth).length > maxLines) {
      const last = lines[maxLines - 1];
      while (last && context.measureText(`${last}…`).width > maxWidth) lines[maxLines - 1] = lines[maxLines - 1].slice(0, -1);
      lines[maxLines - 1] = `${lines[maxLines - 1].trimEnd()}…`;
    }
    lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
    return lines.length;
  }

  function loadImage(environment, source) {
    if (!source || typeof environment.Image !== "function") return Promise.resolve(null);
    return new Promise(resolve => {
      const image = new environment.Image();
      if (/^https?:/i.test(source) && environment.location?.origin && new URL(source, environment.location.href).origin !== environment.location.origin) image.crossOrigin = "anonymous";
      image.onload = () => resolve(image.naturalWidth > 0 ? image : null);
      image.onerror = () => resolve(null);
      image.src = source;
      if (image.complete && image.naturalWidth > 0) resolve(image);
    });
  }

  function drawContained(context, image, x, y, width, height) {
    if (!image) return false;
    const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
    return true;
  }

  function drawImagePlaceholder(context, x, y, width, height, label) {
    context.fillStyle = LAVENDER;
    context.fillRect(x, y, width, height);
    context.fillStyle = PURPLE;
    context.font = '600 12px "Montserrat", sans-serif';
    context.textAlign = "center";
    drawWrappedText(context, label, x + 8, y + height / 2, width - 16, 16, 3);
    context.textAlign = "left";
  }

  function drawLabelValue(context, label, value, x, y, width, valueFont = '600 13px "Montserrat", sans-serif') {
    context.fillStyle = MUTED;
    context.font = '500 11px "Montserrat", sans-serif';
    context.fillText(label.toUpperCase(), x, y);
    context.fillStyle = INK;
    context.font = valueFont;
    drawWrappedText(context, value || "—", x, y + 21, width, 17, 2);
  }

  function drawReceiptPage(environment, receipt, pageItems, pageIndex, pageCount, productImages, logoImage, totals) {
    const canvas = environment.document.createElement("canvas");
    canvas.width = PAGE_WIDTH * RENDER_SCALE;
    canvas.height = PAGE_HEIGHT * RENDER_SCALE;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Receipt PDF could not be drawn in this browser.");
    context.scale(RENDER_SCALE, RENDER_SCALE);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);

    const firstPage = pageIndex === 0;
    if (firstPage) {
      context.fillStyle = PURPLE;
      context.fillRect(0, 0, PAGE_WIDTH, 146);
      if (!drawContained(context, logoImage, 48, 26, 68, 68)) drawImagePlaceholder(context, 48, 26, 68, 68, "KH");
      context.fillStyle = "#ffffff";
      context.textAlign = "left";
      context.font = '700 25px "Montserrat", sans-serif';
      context.fillText("Kay's", 130, 58);
      context.font = 'italic 700 28px "Playfair Display", serif';
      context.fillText("Haven", 207, 59);
      context.font = 'italic 15px "Playfair Display", serif';
      context.fillText("Quality products from crib to campus.", 130, 91);
      context.font = '700 10px "Montserrat", sans-serif';
      context.fillText("PURCHASE AND PAYMENT RECEIPT", 130, 119);

      context.fillStyle = PURPLE;
      context.font = '700 23px "Playfair Display", serif';
      context.fillText("Purchase receipt", 52, 178);
      context.fillStyle = LAVENDER;
      context.fillRect(PAGE_WIDTH - 155, 153, 103, 28);
      context.fillStyle = DARK_PURPLE;
      context.font = '700 9px "Montserrat", sans-serif';
      context.textAlign = "center";
      context.fillText("VERIFIED PAID", PAGE_WIDTH - 103, 172);
      context.textAlign = "left";

      context.fillStyle = "#fbf8fd";
      context.fillRect(52, 198, PAGE_WIDTH - 104, 182);
      context.strokeStyle = "#e6d8ef";
      context.strokeRect(52, 198, PAGE_WIDTH - 104, 182);
      drawLabelValue(context, "Order number", receipt.order_number, 70, 222, 220, '600 12px "Montserrat", sans-serif');
      drawLabelValue(context, "Purchase date", receipt.purchase_date ? new Date(receipt.purchase_date).toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Accra" }) : "Unavailable", 320, 222, 205, '600 12px "Montserrat", sans-serif');
      drawLabelValue(context, "Customer name", receipt.customer_name, 70, 270, 220, '600 12px "Montserrat", sans-serif');
      drawLabelValue(context, "Phone", receipt.phone, 320, 270, 205, '600 12px "Montserrat", sans-serif');
      drawLabelValue(context, "Email", receipt.email || "Not provided", 70, 318, 220, '600 12px "Montserrat", sans-serif');
      drawLabelValue(context, "Payment method", receipt.payment_method || "Paystack", 320, 318, 205, '600 12px "Montserrat", sans-serif');
      drawLabelValue(context, "Transaction reference", receipt.payment_reference || "Unavailable", 70, 355, 455, '600 11px "Montserrat", sans-serif');
    } else {
      context.fillStyle = PURPLE;
      context.fillRect(0, 0, PAGE_WIDTH, 112);
      if (!drawContained(context, logoImage, 45, 22, 66, 66)) drawImagePlaceholder(context, 45, 22, 66, 66, "KH");
      context.fillStyle = "#ffffff";
      context.font = '700 22px "Montserrat", sans-serif';
      context.fillText("Kay's Haven", 127, 55);
      context.font = 'italic 14px "Playfair Display", serif';
      context.fillText("Quality products from crib to campus.", 127, 82);
      context.font = '600 11px "Montserrat", sans-serif';
      context.fillText(`Receipt continued · ${printable(receipt.order_number)}`, 52, 145);
    }

    const itemHeaderY = firstPage ? 404 : 178;
    context.fillStyle = PURPLE;
    context.font = '700 15px "Montserrat", sans-serif';
    context.fillText("ITEMIZED PURCHASE", 52, itemHeaderY);
    context.strokeStyle = "#d9c7e3";
    context.beginPath();
    context.moveTo(52, itemHeaderY + 11);
    context.lineTo(PAGE_WIDTH - 52, itemHeaderY + 11);
    context.stroke();

    const rowTop = itemHeaderY + 24;
    const rowHeight = firstPage ? (pageItems.length === 4 ? 58 : 76) : 112;
    const imageSize = rowHeight === 58 ? 46 : rowHeight === 76 ? 64 : 92;
    const detailsX = 64 + imageSize + 12;
    pageItems.forEach((item, index) => {
      const y = rowTop + index * rowHeight;
      if (index % 2 === 0) {
        context.fillStyle = "#fcfaff";
        context.fillRect(52, y, PAGE_WIDTH - 104, rowHeight - 4);
      }
      const image = productImages.get(item.image_url);
      if (!drawContained(context, image, 64, y + (rowHeight - imageSize) / 2, imageSize, imageSize)) {
        const label = item.image_url ? "Product image unavailable" : "Image not captured";
        drawImagePlaceholder(context, 64, y + (rowHeight - imageSize) / 2, imageSize, imageSize, label);
      }
      context.fillStyle = INK;
      context.font = rowHeight === 58 ? '700 9px "Montserrat", sans-serif' : '700 11px "Montserrat", sans-serif';
      const nameY = y + (rowHeight === 58 ? 14 : 18);
      drawWrappedText(context, item.product_name, detailsX, nameY, PAGE_WIDTH - detailsX - 64, rowHeight === 58 ? 11 : 14, 2);
      context.fillStyle = MUTED;
      context.font = '500 8px "Montserrat", sans-serif';
      context.fillText(`Size: ${item.size}  ·  Quantity: ${item.quantity}`, detailsX, y + (rowHeight === 58 ? 32 : rowHeight === 76 ? 39 : 53));
      context.fillText(`Unit price: ${money(item.unit_price)}`, detailsX, y + (rowHeight === 58 ? 44 : rowHeight === 76 ? 54 : 75));
      context.fillStyle = PURPLE;
      context.font = '700 9px "Montserrat", sans-serif';
      context.fillText(`Line total: ${money(item.line_total)}`, detailsX, y + (rowHeight === 58 ? 54 : rowHeight === 76 ? 68 : 96));
    });

    const isLastPage = pageIndex === pageCount - 1;
    if (isLastPage) {
      const summaryY = rowTop + pageItems.length * rowHeight + 4;
      context.fillStyle = LAVENDER;
      context.fillRect(52, summaryY, PAGE_WIDTH - 104, 61);
      context.fillStyle = INK;
      context.font = '500 10px "Montserrat", sans-serif';
      context.fillText("Subtotal", 70, summaryY + 16);
      context.textAlign = "right";
      context.fillText(money(totals.subtotal), PAGE_WIDTH - 70, summaryY + 16);
      context.fillStyle = PURPLE;
      context.font = '700 13px "Montserrat", sans-serif';
      context.textAlign = "left";
      context.fillText("TOTAL PAID", 70, summaryY + 38);
      context.textAlign = "right";
      context.fillText(money(totals.total), PAGE_WIDTH - 70, summaryY + 38);
      context.textAlign = "left";
      context.fillStyle = DARK_PURPLE;
      context.font = '700 8px "Montserrat", sans-serif';
      context.fillText("VERIFIED PAID · GHANA CEDIS (GH₵)", 70, summaryY + 55);
      context.fillStyle = MUTED;
      context.font = '500 8px "Montserrat", sans-serif';
      const method = `Payment method: ${printable(receipt.payment_method || "Paystack")}`;
      const reference = `Reference: ${printable(receipt.payment_reference || "Unavailable")}`;
      context.fillText(method, 52, summaryY + 78);
      drawWrappedText(context, reference, 52, summaryY + 91, PAGE_WIDTH - 104, 11, 1);
      context.textAlign = "center";
      context.font = 'italic 10px "Playfair Display", serif';
      context.fillText("Thank you for shopping with Kay's Haven.", PAGE_WIDTH / 2, summaryY + 109);
      context.textAlign = "left";
    }

    context.fillStyle = MUTED;
    context.font = '500 9px "Montserrat", sans-serif';
    context.textAlign = "center";
    context.fillText(`Kay's Haven · Quality products from crib to campus. · Page ${pageIndex + 1} of ${pageCount}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 14);
    context.textAlign = "left";
    return canvas;
  }

  function canvasJpeg(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (!blob) return reject(new Error("Receipt PDF image could not be created."));
        blob.arrayBuffer().then(buffer => resolve(new Uint8Array(buffer)), reject);
      }, "image/jpeg", 0.92);
    });
  }

  function encode(value) {
    return new TextEncoder().encode(value);
  }

  function concatBytes(parts) {
    const length = parts.reduce((sum, part) => sum + part.length, 0);
    const result = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) {
      result.set(part, offset);
      offset += part.length;
    }
    return result;
  }

  function createPdfFromPageImages(pages) {
    const objectCount = 2 + pages.length * 3;
    const objects = new Array(objectCount + 1);
    const pageReferences = pages.map((_, index) => `${4 + index * 3} 0 R`).join(" ");
    objects[1] = encode("<< /Type /Catalog /Pages 2 0 R >>");
    objects[2] = encode(`<< /Type /Pages /Kids [${pageReferences}] /Count ${pages.length} >>`);
    pages.forEach((page, index) => {
      const imageObject = 3 + index * 3;
      const pageObject = imageObject + 1;
      const contentObject = imageObject + 2;
      const stream = encode(`q ${PAGE_WIDTH} 0 0 ${PAGE_HEIGHT} 0 0 cm /Im0 Do Q`);
      objects[imageObject] = concatBytes([
        encode(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`),
        page.bytes,
        encode("\nendstream")
      ]);
      objects[pageObject] = encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /XObject << /Im0 ${imageObject} 0 R >> >> /Contents ${contentObject} 0 R >>`);
      objects[contentObject] = concatBytes([encode(`<< /Length ${stream.length} >>\nstream\n`), stream, encode("\nendstream")]);
    });

    const parts = [encode("%PDF-1.4\n% Kay's Haven verified receipt\n")];
    const offsets = new Array(objectCount + 1).fill(0);
    let byteOffset = parts[0].length;
    for (let objectNumber = 1; objectNumber <= objectCount; objectNumber += 1) {
      offsets[objectNumber] = byteOffset;
      const prefix = encode(`${objectNumber} 0 obj\n`);
      const suffix = encode("\nendobj\n");
      parts.push(prefix, objects[objectNumber], suffix);
      byteOffset += prefix.length + objects[objectNumber].length + suffix.length;
    }
    const xrefOffset = byteOffset;
    let xref = `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`;
    for (let objectNumber = 1; objectNumber <= objectCount; objectNumber += 1) xref += `${String(offsets[objectNumber]).padStart(10, "0")} 00000 n \n`;
    xref += `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    parts.push(encode(xref));
    return new Blob(parts, { type: "application/pdf" });
  }

  async function createReceiptPdf(receipt, environment = root) {
    const totals = validateVerifiedReceipt(receipt);
    const doc = environment.document;
    if (!doc?.createElement || typeof environment.Image !== "function") {
      throw new Error("PDF download is unavailable in this browser. Use Print Receipt to save a PDF.");
    }
    try {
      if (doc.fonts?.ready) await doc.fonts.ready;
      if (doc.fonts?.load) await Promise.allSettled([
        doc.fonts.load('700 28px "Montserrat"'),
        doc.fonts.load('italic 700 31px "Playfair Display"')
      ]);
    } catch {
      // System fallback fonts still produce a complete, printable receipt.
    }
    const source = new URL(`../site-assets/${encodeURIComponent("Kay’s Haven Lavender Emblem.png")}`, doc.baseURI).href;
    const [logoImage, ...loadedProducts] = await Promise.all([
      loadImage(environment, source),
      ...totals.items.map(item => loadImage(environment, item.image_url))
    ]);
    const productImages = new Map(totals.items.map((item, index) => [item.image_url, loadedProducts[index]]));
    const pageCapacity = 4;
    const pages = [];
    for (let offset = 0; offset < totals.items.length; offset += pageCapacity) {
      pages.push(totals.items.slice(offset, offset + pageCapacity));
    }
    const pageImages = await Promise.all(pages.map(async (items, index) => {
      const canvas = drawReceiptPage(environment, receipt, items, index, pages.length, productImages, logoImage, totals);
      return { width: canvas.width, height: canvas.height, bytes: await canvasJpeg(canvas) };
    }));
    return createPdfFromPageImages(pageImages);
  }

  const api = Object.freeze({ receiptLines, validateVerifiedReceipt, createReceiptPdf });
  root.KaysHavenReceiptPdf = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window === "undefined" ? globalThis : window);
