(function attachReceiptPdf(root) {
  function printable(value) {
    return String(value ?? "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[’‘]/g, "'")
      .replace(/[–—]/g, "-")
      .replace(/×/g, "x")
      .replace(/[^\x20-\x7e]/g, "?");
  }

  function wrapLine(value, maximum = 86) {
    const words = printable(value).split(/\s+/).filter(Boolean);
    const lines = [];
    let line = "";
    for (const word of words) {
      if (!line) {
        line = word;
      } else if (`${line} ${word}`.length <= maximum) {
        line += ` ${word}`;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

  function money(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) throw new Error("Receipt amount is invalid.");
    return `GHS ${amount.toFixed(2)}`;
  }

  function receiptLines(receipt) {
    if (String(receipt?.payment_status || "").trim().toLowerCase() !== "paid") {
      throw new Error("A receipt can only be created for a confirmed paid order.");
    }
    const lines = [
      "KAY'S HAVEN",
      "Quality products from crib to campus.",
      "PURCHASE RECEIPT",
      "",
      `Order number: ${receipt.order_number || "Unavailable"}`,
      `Purchase date: ${receipt.purchase_date ? new Date(receipt.purchase_date).toLocaleString("en-GB", { timeZone: "Africa/Accra" }) : "Unavailable"}`,
      `Customer: ${receipt.customer_name || "Customer"}`,
      `Payment status: ${receipt.payment_status}`
    ];
    if (receipt.payment_method) lines.push(`Payment method: ${receipt.payment_method}`);
    if (receipt.payment_reference) lines.push(`Payment reference: ${receipt.payment_reference}`);
    lines.push("", "ITEMS");
    const items = Array.isArray(receipt.items) ? receipt.items : [];
    if (!items.length) throw new Error("Receipt items are unavailable.");
    for (const item of items) {
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) throw new Error("Receipt quantity is invalid.");
      const unitPrice = money(item.unit_price);
      const lineTotal = money(item.line_total);
      lines.push(...wrapLine(`${item.product_name || "Product"} | Size: ${item.size || "N/A"} | Quantity: ${quantity}`));
      lines.push(...wrapLine(`Unit price: ${unitPrice} | Line total: ${lineTotal}`));
    }
    lines.push("", `TOTAL PAID: ${money(receipt.total_amount)}`, "", "Thank you for shopping with Kay's Haven.");
    return lines.flatMap(line => wrapLine(line));
  }

  function escapePdfText(value) {
    return printable(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  }

  function createReceiptPdf(receipt) {
    const lines = receiptLines(receipt);
    const pages = [];
    for (let offset = 0; offset < lines.length; offset += 48) pages.push(lines.slice(offset, offset + 48));
    const objects = [];
    const pageReferences = pages.map((_, index) => `${6 + index * 2} 0 R`).join(" ");
    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[2] = `<< /Type /Pages /Kids [${pageReferences}] /Count ${pages.length} >>`;
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
    objects[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic /Encoding /WinAnsiEncoding >>";

    pages.forEach((pageLines, index) => {
      const pageNumber = 6 + index * 2;
      const contentNumber = pageNumber + 1;
      const visibleLines = index === 0 ? pageLines.slice(2) : pageLines;
      const content = [
        ...(index === 0 ? [
          "q 0.478 0.075 0.667 rg 0 772 595 70 re f Q",
          "BT /F2 20 Tf 1 1 1 rg 50 813 Td (KAY'S HAVEN) Tj ET",
          "BT /F3 11 Tf 1 1 1 rg 50 792 Td (Quality products from crib to campus.) Tj ET"
        ] : []),
        "BT",
        "/F1 11 Tf",
        index === 0 ? "50 750 Td" : "50 790 Td",
        "14 TL",
        ...visibleLines.map(line => `(${escapePdfText(line)}) Tj T*`),
        "ET"
      ].join("\n");
      objects[pageNumber] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${contentNumber} 0 R >>`;
      objects[contentNumber] = `<< /Length ${new TextEncoder().encode(content).length} >>\nstream\n${content}\nendstream`;
    });

    let pdf = "%PDF-1.4\n% Kay's Haven receipt\n";
    const offsets = [0];
    for (let index = 1; index < objects.length; index += 1) {
      offsets[index] = new TextEncoder().encode(pdf).length;
      pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
    }
    const xrefOffset = new TextEncoder().encode(pdf).length;
    pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let index = 1; index < objects.length; index += 1) pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
    pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return new Blob([pdf], { type: "application/pdf" });
  }

  const api = Object.freeze({ receiptLines, createReceiptPdf });
  root.KaysHavenReceiptPdf = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window === "undefined" ? globalThis : window);
