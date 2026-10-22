const http = require("http");
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");
const { buildPricedItems, canTransitionOrderStatus } = require("./order-utils");
require("dotenv").config();

const PORT = process.env.PORT || 8000;
const PRODUCT_CATEGORIES = new Set(["Baby", "Toddler", "Kids", "Teens", "Toys", "Accessories", "Back to School", "Clearance"]);

function isStoredProductImageUrl(value) {
  try {
    const project = new URL(process.env.SUPABASE_URL);
    const image = new URL(String(value || ""));
    const bucket = process.env.KAYS_HAVEN_PRODUCT_BUCKET || "kays-haven-products";
    const escapedBucket = bucket.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
    return image.origin === project.origin && new RegExp(`^/storage/v1/object/public/${escapedBucket}/${uuid}\\.(?:jpg|png|webp)$`, "i").test(image.pathname);
  } catch {
    return false;
  }
}

function describeProductImageStorageError(error) {
  const message = String(error?.message || "");
  const code = String(error?.statusCode || error?.code || "");
  if (/bucket\s+(?:was\s+)?not found|no such bucket/i.test(message) || /bucketnotfound/i.test(code) || code === "404") {
    return {
      code: "PRODUCT_IMAGE_BUCKET_MISSING",
      error: "Product image storage bucket is missing. Apply supabase/migrations/202610120001_product_image_storage.sql in the Supabase SQL Editor."
    };
  }
  if (/unauthorized|forbidden|not allowed|permission|row-level security/i.test(`${code} ${message}`) || code === "401" || code === "403") {
    return {
      code: "PRODUCT_IMAGE_STORAGE_ACCESS_DENIED",
      error: "Supabase Storage rejected this upload. Check the backend service-role configuration and Storage permissions."
    };
  }
  return {
    code: "PRODUCT_IMAGE_UPLOAD_FAILED",
    error: "Product image upload failed in Supabase Storage. Check the backend logs for the storage error code."
  };
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// -------------------------
// HELPERS
// -------------------------

function normalizeFrontendOrigin(value) {
  try {
    const origin = new URL(String(value || "").trim());
    if (
      !["http:", "https:"].includes(origin.protocol) ||
      origin.username ||
      origin.password ||
      origin.pathname !== "/" ||
      origin.search ||
      origin.hash
    ) return "";
    return origin.origin;
  } catch {
    return "";
  }
}

function applyCors(req, res, frontendOrigin) {
  res.setHeader("Vary", "Origin");
  const requestOrigin = String(req.headers.origin || "");
  if (!requestOrigin) return true;

  const allowedOrigin = normalizeFrontendOrigin(frontendOrigin);
  if (!allowedOrigin || requestOrigin !== allowedOrigin) return false;

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Max-Age", "600");
  return true;
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json"
  });

  res.end(JSON.stringify(data));
}

function sendReceiptJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "private, no-store"
  });
  res.end(JSON.stringify(data));
}

const RECEIPT_ACCESS_TOKEN_TTL_SECONDS = 24 * 60 * 60;

function getReceiptSigningKey() {
  return String(process.env.RECEIPT_ACCESS_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "");
}

function receiptReferenceHash(reference) {
  return crypto.createHash("sha256").update(String(reference || "")).digest("hex");
}

function createReceiptAccessToken(orderId, reference, signingKey = getReceiptSigningKey(), now = Date.now()) {
  const key = String(signingKey || "");
  const normalizedReference = String(reference || "");
  if (!key || orderId == null || !normalizedReference) throw new Error("Receipt access cannot be created.");
  const payload = Buffer.from(JSON.stringify({
    order_id: String(orderId),
    reference_hash: receiptReferenceHash(normalizedReference),
    expires_at: Math.floor(now / 1000) + RECEIPT_ACCESS_TOKEN_TTL_SECONDS
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", key).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifyReceiptAccessToken(token, orderId, signingKey = getReceiptSigningKey(), now = Date.now()) {
  const key = String(signingKey || "");
  const parts = String(token || "").split(".");
  if (!key || parts.length !== 2 || !parts[0] || !parts[1]) return null;
  try {
    const expected = crypto.createHmac("sha256", key).update(parts[0]).digest();
    const supplied = Buffer.from(parts[1], "base64url");
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    if (payload.order_id !== String(orderId) || !Number.isInteger(payload.expires_at) || payload.expires_at <= Math.floor(now / 1000)) return null;
    if (!/^[0-9a-f]{64}$/.test(String(payload.reference_hash || ""))) return null;
    return payload;
  } catch {
    return null;
  }
}

async function checkSupabaseReadiness(client) {
  try {
    const { error } = await client.from("products").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

function readBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = "";
    let bytesRead = 0;
    let tooLarge = false;

    req.on("data", chunk => {
      bytesRead += chunk.length;
      if (bytesRead > maxBytes) {
        if (!tooLarge) reject(new Error("Request body is too large"));
        tooLarge = true;
        return;
      }
      if (tooLarge) return;
      body += chunk;
    });

    req.on("end", () => {
      if (tooLarge) return;
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });

    req.on("error", reject);
  });
}

// -------------------------
// STAFF AUTHENTICATION
// -------------------------

async function authenticateStaff(req) {
  const authorization =
    req.headers.authorization || "";

  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  const token =
    authorization.slice(7);

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return null;
  }

  const {
    data: staff,
    error: staffError
  } = await supabaseAdmin
    .from("staff")
    .select(
      "id, full_name, login_name, auth_email, active"
    )
    .eq("id", user.id)
    .eq("active", true)
    .single();

  if (staffError || !staff) {
    return null;
  }

  return {
    user,
    staff
  };
}

// -------------------------
// SERVER
// -------------------------

const requestHandler = async (req, res, healthClient = supabase, receiptClient = supabaseAdmin, receiptSigningKey = getReceiptSigningKey(), frontendOrigin = process.env.FRONTEND_ORIGIN) => {

    if (!applyCors(req, res, frontendOrigin)) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Origin is not allowed." }));
      return;
    }

    // CORS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // -------------------------
    // HEALTH
    // -------------------------

    if (
      req.method === "GET" &&
      new URL(req.url, "http://localhost").pathname.replace(/\/+$/, "") === "/api/health"
    ) {
      sendJson(res, 200, {
        success: true,
        message: "Backend is running"
      });

      return;
    }

    if (
      req.method === "GET" &&
      new URL(req.url, "http://localhost").pathname.replace(/\/+$/, "") === "/api/health/database"
    ) {
      const ready = await checkSupabaseReadiness(healthClient);
      sendJson(res, ready ? 200 : 503, {
        success: ready,
        database: ready ? "connected" : "unavailable"
      });
      return;
    }

    if (req.method === "POST" && req.url === "/api/payments/initialize") {
      let createdOrderId;
      let failureStage = "request_body";
      try {
        const body = await readBody(req);
        const customerName = String(body.customer_name || "").trim();
        const email = String(body.email || "").trim();
        const phone = String(body.phone || "").trim();
        const expectedTotal = Number(body.expected_total);
        if (!isValidCheckoutContact(customerName, email, phone)) {
          sendJson(res, 400, { error: "Enter your name and phone number, and check the email format if provided." });
          return;
        }
        if (!Number.isFinite(expectedTotal) || expectedTotal < 0) {
          sendJson(res, 400, { error: "The checkout total is invalid. Refresh your cart and try again." });
          return;
        }
        if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 100) {
          sendJson(res, 400, { error: "Your cart is empty or contains too many items." });
          return;
        }

        const paymentConfiguration = getPaystackConfiguration();
        if (!paymentConfiguration.configured) {
          sendJson(res, 503, { error: paymentConfiguration.error });
          return;
        }

        const productIds = [...new Set(body.items.map(item => item.product_id ?? item.id).filter(id => id !== undefined && id !== null))];
        failureStage = "product_lookup";
        const { data: products, error: productsError } = await supabaseAdmin
          .from("products").select("id, name, price, sizes, is_active").in("id", productIds);
        if (productsError) throw productsError;
        failureStage = "price_validation";
        const priced = buildPricedItems(body.items, products || []);
        if (Math.round(expectedTotal * 100) !== Math.round(priced.total * 100)) {
          sendJson(res, 409, { error: "Product prices changed. Refresh the checkout total before paying." });
          return;
        }
        const reference = `KH-${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
        failureStage = "order_insert";
        const { data: order, error: orderError } = await supabaseAdmin.from("orders").insert([{
          customer_name: customerName,
          email: email || null,
          phone,
          total_amount: priced.total,
          status: "Pending",
          payment_status: "pending",
          payment_method: "Paystack",
          payment_reference: reference
        }]).select("id, order_number").single();
        if (orderError) throw orderError;
        createdOrderId = order.id;

        failureStage = "order_item_insert";
        const { error: itemError } = await supabaseAdmin.from("order_items").insert(priced.items.map(item => ({
          order_id: order.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          price: item.price,
          size: item.size
        })));
        if (itemError) throw itemError;

        const callbackUrl = paymentConfiguration.callbackUrl;
        const paystackEmail = email || createGuestPaystackEmail(callbackUrl);
        failureStage = "paystack_initialize";
        const payment = await paystackRequest("/transaction/initialize", buildPaystackInitializationPayload({
          email: paystackEmail,
          totalAmount: priced.total,
          reference,
          callbackUrl,
          orderId: order.id,
          orderNumber: order.order_number || String(order.id),
          customerName
        }));
        sendJson(res, 200, { authorization_url: payment.authorization_url, reference });
      } catch (error) {
        const status = /required|valid|stock|size|available|invalid price/i.test(error.message) ? 400 : 502;
        if (status >= 500) {
          console.error(JSON.stringify(formatPaymentInitializationFailure(failureStage, error)));
        }
        if (createdOrderId) {
          try {
            const { error: updateError } = await supabaseAdmin.from("orders")
              .update({ payment_status: "failed", status: "Payment setup failed" }).eq("id", createdOrderId);
            if (updateError) {
              console.error(JSON.stringify(formatPaymentInitializationFailure("failure_cleanup", updateError)));
            }
          } catch {
            console.error(JSON.stringify(formatPaymentInitializationFailure("failure_cleanup", null)));
          }
        }
        sendJson(res, status, { error: status === 400 ? error.message : "Payment could not be started. Please try again." });
      }
      return;
    }

    if (req.method === "POST" && req.url === "/api/payments/verify") {
      try {
        const body = await readBody(req);
        const reference = String(body.reference || "").trim();
        if (!reference || reference.length > 120) {
          sendJson(res, 400, { error: "A valid payment reference is required." });
          return;
        }
        const { data: order, error: orderError } = await supabaseAdmin.from("orders")
          .select("id, order_number, customer_name, total_amount, payment_reference, payment_status")
          .eq("payment_reference", reference).single();
        if (orderError || !order) {
          sendJson(res, 404, { error: "Payment reference was not found." });
          return;
        }
        if (order.payment_status !== "paid") {
          const payment = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);
          const expectedAmount = Math.round(Number(order.total_amount) * 100);
          if (payment.reference !== reference || payment.status !== "success" || payment.currency !== "GHS" || Number(payment.amount) !== expectedAmount) {
            sendJson(res, 409, { error: "Payment is not confirmed. No order has been marked paid." });
            return;
          }
          const { error: finalizeError } = await supabaseAdmin.rpc("finalize_paid_order", { p_reference: reference });
          if (finalizeError) throw finalizeError;
        }
        const receiptAccessToken = createReceiptAccessToken(order.id, reference, receiptSigningKey);
        sendJson(res, 200, { success: true, payment_status: "paid", order_id: order.id, order_number: order.order_number, customer_name: order.customer_name, receipt_access_token: receiptAccessToken });
      } catch {
        console.error("Payment verification failed");
        sendJson(res, 502, { error: "Payment could not be verified right now. Please try again." });
      }
      return;
    }

    const receiptUrl = new URL(req.url, "http://localhost");
    const receiptPathMatch = receiptUrl.pathname.match(/^\/api\/receipts\/([^/]+)\/?$/);
    if (req.method === "GET" && receiptPathMatch) {
      try {
        const orderId = decodeURIComponent(receiptPathMatch[1]);
        const authorization = String(req.headers.authorization || "");
        const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
        const claims = verifyReceiptAccessToken(token, orderId, receiptSigningKey);
        if (!claims) {
          sendReceiptJson(res, 401, { error: "Receipt access is invalid or expired." });
          return;
        }

        const { data: order, error } = await receiptClient.from("orders")
          .select("id, order_number, customer_name, created_at, total_amount, payment_status, payment_method, payment_reference, order_items ( product_name, size, quantity, price )")
          .eq("id", orderId).single();
        if (error || !order) {
          sendReceiptJson(res, 404, { error: "Receipt order was not found." });
          return;
        }
        if (String(order.payment_status || "").trim().toLowerCase() !== "paid") {
          sendReceiptJson(res, 409, { error: "A receipt is available only after payment is verified." });
          return;
        }
        const actualReferenceHash = receiptReferenceHash(order.payment_reference);
        if (claims.reference_hash !== actualReferenceHash) {
          sendReceiptJson(res, 401, { error: "Receipt access is invalid or expired." });
          return;
        }

        const items = Array.isArray(order.order_items) ? order.order_items.map(item => ({
          product_name: String(item.product_name || "Product"),
          size: String(item.size || "N/A"),
          quantity: Number(item.quantity),
          unit_price: Number(item.price),
          line_total: Number(item.price) * Number(item.quantity)
        })) : [];
        if (!Number.isFinite(Number(order.total_amount)) || items.some(item => !Number.isFinite(item.quantity) || !Number.isFinite(item.unit_price) || !Number.isFinite(item.line_total))) {
          sendReceiptJson(res, 500, { error: "Receipt details are unavailable." });
          return;
        }
        sendReceiptJson(res, 200, {
          receipt: {
            order_number: String(order.order_number || `KH-${order.id}`),
            purchase_date: order.created_at,
            customer_name: String(order.customer_name || "Customer"),
            items,
            total_amount: Number(order.total_amount),
            payment_status: "Paid",
            payment_method: String(order.payment_method || "Paystack"),
            payment_reference: String(order.payment_reference || "")
          }
        });
      } catch {
        sendReceiptJson(res, 500, { error: "Receipt details are unavailable." });
      }
      return;
    }

        // -------------------------
    // GET PRODUCTS
    // -------------------------

    const productsRequestUrl = new URL(req.url, "http://localhost");
    if (req.method === "GET" && productsRequestUrl.pathname === "/api/products") {
      try {
        const includeInactive = productsRequestUrl.searchParams.get("include_inactive") === "true";
        if (includeInactive && !await authenticateStaff(req)) {
          sendJson(res, 401, { error: "Unauthorized" });
          return;
        }
        let productsQuery = supabaseAdmin
          .from("products")
          .select("*")
          .order("id");
        if (!includeInactive) productsQuery = productsQuery.eq("is_active", true);
        const { data, error } = await productsQuery;

        if (error) {
          throw error;
        }

        sendJson(res, 200, {
          products: data || []
        });

      } catch (error) {
        console.error(
          "Products error:",
          error
        );

        sendJson(res, 500, {
          error: "Failed to load products"
        });
      }

      return;
    }

    if (req.method === "POST" && req.url === "/api/products/images") {
      const authenticated = await authenticateStaff(req);
      if (!authenticated) {
        sendJson(res, 401, { error: "Unauthorized" });
        return;
      }
      try {
        const body = await readBody(req, 7 * 1024 * 1024);
        const dataUrl = String(body.data_url || "");
        const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
        if (!match) {
          sendJson(res, 400, { error: "Choose a JPEG, PNG or WebP product image." });
          return;
        }
        const mimeType = match[1];
        const file = Buffer.from(match[2], "base64");
        if (!file.length || file.length > 5 * 1024 * 1024) {
          sendJson(res, 413, { error: "Product images must be 5 MB or smaller." });
          return;
        }
        const isJpeg = mimeType === "image/jpeg" && file[0] === 0xff && file[1] === 0xd8 && file[2] === 0xff;
        const isPng = mimeType === "image/png" && file.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
        const isWebp = mimeType === "image/webp" && file.toString("ascii", 0, 4) === "RIFF" && file.toString("ascii", 8, 12) === "WEBP";
        if (!isJpeg && !isPng && !isWebp) {
          sendJson(res, 400, { error: "The selected file does not match its image type." });
          return;
        }

        const bucketName = process.env.KAYS_HAVEN_PRODUCT_BUCKET || "kays-haven-products";
        const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[mimeType];
        const objectPath = `${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabaseAdmin.storage.from(bucketName).upload(objectPath, file, {
          contentType: mimeType,
          cacheControl: "31536000",
          upsert: false
        });
        if (uploadError) {
          const failure = describeProductImageStorageError(uploadError);
          console.error("Product image upload failed", {
            statusCode: uploadError.statusCode || null,
            code: uploadError.code || null
          });
          sendJson(res, 503, failure);
          return;
        }
        const { data: publicUrl } = supabaseAdmin.storage.from(bucketName).getPublicUrl(objectPath);
        sendJson(res, 201, { success: true, image_url: publicUrl.publicUrl });
      } catch (error) {
        const status = /too large/i.test(error.message) ? 413 : 400;
        sendJson(res, status, { error: status === 413 ? "Product image request is too large." : "Could not upload this product image." });
      }
      return;
    }

    // -------------------------
    // ADD PRODUCT
    // -------------------------

    if (
      req.method === "POST" &&
      req.url === "/api/products"
    ) {
      const authenticated =
        await authenticateStaff(req);

      if (!authenticated) {
        sendJson(res, 401, {
          error: "Unauthorized"
        });

        return;
      }

      try {
        const body =
          await readBody(req);

        const name =
          String(
            body.name || ""
          ).trim();

        const category =
          String(
            body.category || ""
          ).trim();

        const price =
          Number(body.price);

        const image =
          body.image
            ? String(body.image).trim()
            : null;

        const description =
          body.description
            ? String(body.description).trim()
            : null;

        const stock =
          Number(body.stock ?? 0);
        const sizes = body.sizes === undefined ? [] : body.sizes;

        if (
          !name ||
          !PRODUCT_CATEGORIES.has(category) ||
          !Number.isFinite(price) || price <= 0 ||
          !isStoredProductImageUrl(image)
        ) {
          sendJson(res, 400, {
            error:
              "Name, a valid category, positive price and uploaded product image are required"
          });

          return;
        }

        if (
          !Number.isInteger(stock) ||
          stock < 0
        ) {
          sendJson(res, 400, {
            error:
              "Stock must be a valid number"
          });

          return;
        }
        if (!Array.isArray(sizes) || sizes.some(size => typeof size !== "string")) {
          sendJson(res, 400, { error: "Sizes must be a list of text options." });
          return;
        }

        const {
          data: product,
          error
        } = await supabaseAdmin
          .from("products")
          .insert([{
            name,
            category,
            price,
            image,
            description,
            stock,
            is_active: true,
            sizes: [...new Set(sizes.map(size => size.trim()).filter(Boolean))]
          }])
          .select()
          .single();

        if (error) {
          throw error;
        }

        sendJson(res, 201, {
          success: true,
          product
        });

      } catch (error) {
        console.error(
          "Create product error:",
          error
        );

        sendJson(res, 500, {
          error:
            "Failed to create product"
        });
      }

      return;
    }

    if (req.method === "PATCH" && /^\/api\/products\/[^/]+$/.test(req.url)) {
      const authenticated = await authenticateStaff(req);
      if (!authenticated) {
        sendJson(res, 401, { error: "Unauthorized" });
        return;
      }
      try {
        const id = decodeURIComponent(req.url.slice("/api/products/".length));
        const body = await readBody(req);
        const update = {};
        if (Object.hasOwn(body, "name")) {
          update.name = String(body.name || "").trim();
          if (!update.name) throw new Error("Product name is required");
        }
        if (Object.hasOwn(body, "category")) {
          update.category = String(body.category || "").trim();
          if (!PRODUCT_CATEGORIES.has(update.category)) throw new Error("Choose one of the existing product categories");
        }
        if (Object.hasOwn(body, "description")) update.description = String(body.description || "").trim();
        if (Object.hasOwn(body, "image")) {
          update.image = body.image ? String(body.image).trim() : null;
          if (!isStoredProductImageUrl(update.image)) throw new Error("Upload a valid JPEG, PNG or WebP product image before saving");
        }
        if (Object.hasOwn(body, "sizes")) {
          if (!Array.isArray(body.sizes) || body.sizes.some(size => typeof size !== "string")) throw new Error("Sizes must be a list of text options");
          update.sizes = [...new Set(body.sizes.map(size => size.trim()).filter(Boolean))];
        }
        if (Object.hasOwn(body, "price")) {
          update.price = Number(body.price);
          if (!Number.isFinite(update.price) || update.price <= 0) throw new Error("Price must be greater than zero");
        }
        if (Object.hasOwn(body, "stock")) {
          update.stock = Number(body.stock);
          if (!Number.isInteger(update.stock) || update.stock < 0) throw new Error("Stock must be a non-negative whole number");
        }
        if (Object.hasOwn(body, "is_active")) {
          if (typeof body.is_active !== "boolean") throw new Error("Storefront availability must be enabled or disabled");
          update.is_active = body.is_active;
        }
        if (!Object.keys(update).length) throw new Error("No product changes were supplied");
        const { data: product, error } = await supabaseAdmin.from("products")
          .update(update).eq("id", id).select("*").single();
        if (error) throw error;
        sendJson(res, 200, { success: true, product });
      } catch (error) {
        sendJson(res, 400, { error: error.message || "Could not update product" });
      }
      return;
    }

    if (req.method === "DELETE" && /^\/api\/products\/[^/]+$/.test(req.url)) {
      const authenticated = await authenticateStaff(req);
      if (!authenticated) {
        sendJson(res, 401, { error: "Unauthorized" });
        return;
      }
      try {
        const id = decodeURIComponent(req.url.slice("/api/products/".length));
        const { data: product, error: productError } = await supabaseAdmin.from("products")
          .select("id").eq("id", id).maybeSingle();
        if (productError) throw productError;
        if (!product) {
          sendJson(res, 404, { error: "Product not found." });
          return;
        }
        const { error: deleteError } = await supabaseAdmin.rpc("delete_product_without_orders", { p_product_id: id });
        if (deleteError) {
          if (/referenced by existing orders/i.test(String(deleteError.message || ""))) {
            sendJson(res, 409, { error: "This product appears in order history and cannot be permanently deleted. Hide it from the storefront instead." });
            return;
          }
          if (/product not found/i.test(String(deleteError.message || ""))) {
            sendJson(res, 404, { error: "Product not found." });
            return;
          }
          throw deleteError;
        }
        sendJson(res, 200, { success: true, product_id: id });
      } catch {
        sendJson(res, 500, { error: "Could not safely delete this product." });
      }
      return;
    }

    // -------------------------
    // STAFF LOGIN
    // -------------------------

    if (
      req.method === "POST" &&
      req.url === "/api/staff/login"
    ) {
      try {
        const body =
          await readBody(req);

        const loginName =
          String(
            body.login_name ||
            body.loginName ||
            ""
          )
            .trim()
            .toLowerCase();

        const password =
          String(
            body.password || ""
          );

        if (!loginName || !password) {
          sendJson(res, 400, {
            error:
              "Login name and password are required"
          });

          return;
        }

        const {
          data: staff,
          error: staffError
        } = await supabaseAdmin
          .from("staff")
          .select("*")
          .eq("login_name", loginName)
          .eq("active", true)
          .single();

        if (staffError || !staff) {
          sendJson(res, 401, {
            error:
              "Invalid login name or password"
          });

          return;
        }

        const {
          data: authData,
          error: authError
        } = await supabase.auth.signInWithPassword({
          email: staff.auth_email,
          password
        });

        if (authError) {
          sendJson(res, 401, {
            error:
              "Invalid login name or password"
          });

          return;
        }

        sendJson(res, 200, {
          success: true,
          session: authData.session,
          staff: {
            id: staff.id,
            full_name: staff.full_name,
            login_name: staff.login_name,
            auth_email: staff.auth_email
          }
        });

      } catch (error) {
        console.error(
          "Login error:",
          error
        );

        sendJson(res, 500, {
          error: "Login failed"
        });
      }

      return;
    }

    // -------------------------
    // CURRENT STAFF
    // -------------------------

    if (
      req.method === "GET" &&
      req.url === "/api/staff/me"
    ) {
      const authenticated =
        await authenticateStaff(req);

      if (!authenticated) {
        sendJson(res, 401, {
          error: "Unauthorized"
        });

        return;
      }

      sendJson(res, 200, {
        staff: authenticated.staff
      });

      return;
    }

    // -------------------------
    // ADD STAFF
    // -------------------------

    if (
      req.method === "POST" &&
      req.url === "/api/staff"
    ) {
      const authenticated =
        await authenticateStaff(req);

      if (!authenticated) {
        sendJson(res, 401, {
          error: "Unauthorized"
        });

        return;
      }

      try {
        const body =
          await readBody(req);

        const fullName =
          String(
            body.full_name || ""
          ).trim();

        const loginName =
          String(
            body.login_name || ""
          )
            .trim()
            .toLowerCase();

        const password =
          String(
            body.password || ""
          );

        if (
          !fullName ||
          !loginName ||
          !password
        ) {
          sendJson(res, 400, {
            error:
              "Full name, login name and password are required"
          });

          return;
        }

        if (password.length < 8) {
          sendJson(res, 400, {
            error:
              "Password must be at least 8 characters"
          });

          return;
        }

        const authEmail =
          `${loginName}@kayshaven.local`;

        const {
          data: createdUser,
          error: createError
        } = await supabaseAdmin.auth.admin.createUser({
          email: authEmail,
          password,
          email_confirm: true
        });

        if (createError) {
          throw createError;
        }

        const {
          data: newStaff,
          error: staffInsertError
        } = await supabaseAdmin
          .from("staff")
          .insert([{
            id: createdUser.user.id,
            full_name: fullName,
            login_name: loginName,
            auth_email: authEmail,
            active: true
          }])
          .select()
          .single();

        if (staffInsertError) {
          await supabaseAdmin.auth.admin.deleteUser(
            createdUser.user.id
          );

          throw staffInsertError;
        }

        sendJson(res, 201, {
          success: true,
          staff: newStaff
        });

      } catch (error) {
        console.error(
          "Create staff error:",
          error
        );

        sendJson(res, 500, {
          error:
            "Failed to create admin"
        });
      }

      return;
    }

    // -------------------------
    // CHANGE PASSWORD
    // -------------------------

    if (
      req.method === "POST" &&
      req.url === "/api/staff/password"
    ) {
      const authenticated =
        await authenticateStaff(req);

      if (!authenticated) {
        sendJson(res, 401, {
          error: "Unauthorized"
        });

        return;
      }

      try {
        const body =
          await readBody(req);

        const newPassword =
          String(
            body.new_password || ""
          );

        if (newPassword.length < 8) {
          sendJson(res, 400, {
            error:
              "Password must be at least 8 characters"
          });

          return;
        }

        const {
          error
        } =
          await supabaseAdmin.auth.admin.updateUserById(
            authenticated.user.id,
            {
              password: newPassword
            }
          );

        if (error) {
          throw error;
        }

        sendJson(res, 200, {
          success: true,
          message:
            "Password changed successfully"
        });

      } catch (error) {
        console.error(
          "Password change error:",
          error
        );

        sendJson(res, 500, {
          error:
            "Failed to change password"
        });
      }

      return;
    }

// -------------------------
// GET ORDERS
// -------------------------

if (req.method === "PATCH" && /^\/api\/orders\/[^/]+\/status$/.test(req.url)) {
  const authenticated = await authenticateStaff(req);
  if (!authenticated) {
    sendJson(res, 401, { error: "Unauthorized" });
    return;
  }
  try {
    const id = decodeURIComponent(req.url.slice("/api/orders/".length).replace(/\/status$/, ""));
    const { status } = await readBody(req);
    if (!["Completed", "Canceled"].includes(status)) {
      sendJson(res, 400, { error: "Choose Completed or Canceled." });
      return;
    }

    const { data: existing, error: readError } = await supabaseAdmin.from("orders")
      .select("id, status, payment_status").eq("id", id).single();
    if (readError || !existing) {
      sendJson(res, 404, { error: "Order not found." });
      return;
    }
    if (status === "Completed" && String(existing.payment_status || "").trim().toLowerCase() !== "paid") {
      sendJson(res, 409, { error: "Payment must be verified as paid before completing this order." });
      return;
    }
    if (!canTransitionOrderStatus(existing.status, existing.payment_status, status)) {
      sendJson(res, 400, { error: "Choose Completed or Canceled." });
      return;
    }
    let update = supabaseAdmin.from("orders").update({ status }).eq("id", id);
    update = existing.status == null ? update.is("status", null) : update.eq("status", existing.status);
    update = existing.payment_status == null ? update.is("payment_status", null) : update.eq("payment_status", existing.payment_status);
    const { data: order, error } = await update.select("*").maybeSingle();
    if (error) throw error;
    if (!order) {
      sendJson(res, 409, { error: "This order changed while you were editing it. Refresh the orders list and try again." });
      return;
    }
    sendJson(res, 200, { success: true, order });
  } catch {
    sendJson(res, 500, { error: "Could not update order status." });
  }
  return;
}

if (
  req.method === "GET" &&
  req.url === "/api/orders"
) {
  const authenticated =
    await authenticateStaff(req);

  if (!authenticated) {
    sendJson(res, 401, {
      error: "Unauthorized"
    });

    return;
  }

  try {
    const {
      data,
      error
    } = await supabaseAdmin
      .from("orders")
      .select(`
        *,
        order_items (
          id,
          product_id,
          product_name,
          quantity,
          price,
          size
        )
      `)
      .order("created_at", {
        ascending: false
      });

    if (error) {
      throw error;
    }

    sendJson(res, 200, {
      orders: data || []
    });

  } catch (error) {
    console.error(
      "Orders error:",
      error
    );

    sendJson(res, 500, {
      error:
        "Failed to load orders"
    });
  }

  return;
}

    // -------------------------
// CREATE ORDER
// -------------------------

if (req.method === "POST" && req.url === "/api/orders") {
  sendJson(res, 410, { error: "Use secure checkout to create an order." });
  return;
}

// NOT FOUND
    // -------------------------

    sendJson(res, 404, {
      error: "Route not found"
    });
  };

// -------------------------
// START SERVER
// -------------------------

if (require.main === module) {
  createServer().listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

async function paystackRequest(endpoint, payload) {
  if (!process.env.PAYSTACK_SECRET_KEY) throw new Error("Payment service is not configured");
  const response = await fetch(`https://api.paystack.co${endpoint}`, {
    method: payload ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json"
    },
    body: payload ? JSON.stringify(payload) : undefined,
    signal: AbortSignal.timeout(15000)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error("Paystack request was rejected");
    error.code = `PAYSTACK_HTTP_${response.status}`;
    throw error;
  }
  if (!result || typeof result !== "object" || result.status !== true || !result.data) {
    const error = new Error("Paystack returned an unsuccessful or invalid response");
    error.code = "PAYSTACK_REJECTED";
    throw error;
  }
  return result.data;
}

function createServer({ healthClient = supabase, receiptClient = supabaseAdmin, receiptSigningKey = getReceiptSigningKey(), frontendOrigin = process.env.FRONTEND_ORIGIN } = {}) {
  return http.createServer((req, res) => requestHandler(req, res, healthClient, receiptClient, receiptSigningKey, frontendOrigin));
}

function validEmail(value) {
  const email = String(value || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidOptionalEmail(value) {
  const email = String(value || "").trim();
  return !email || validEmail(email);
}

function isValidCheckoutContact(customerName, email, phone) {
  return Boolean(String(customerName || "").trim() && String(phone || "").trim() && isValidOptionalEmail(email));
}

function createGuestPaystackEmail(callbackUrl) {
  const callback = new URL(callbackUrl);
  if (callback.protocol !== "https:" || !callback.hostname) {
    throw new Error("A secure payment callback domain is required");
  }
  return `checkout-${crypto.randomBytes(16).toString("hex")}@${callback.hostname.toLowerCase()}`;
}

function buildPaystackInitializationPayload({ email, totalAmount, reference, callbackUrl, orderId, orderNumber, customerName }) {
  return {
    email,
    // Paystack expects GHS amounts as a string in pesewas (the currency subunit).
    amount: String(Math.round(Number(totalAmount) * 100)),
    currency: "GHS",
    reference,
    callback_url: callbackUrl,
    // The Transactions API defines metadata as a stringified JSON object.
    metadata: JSON.stringify({
      order_id: orderId,
      order_number: orderNumber,
      customer_name: customerName
    })
  };
}

const PAYMENT_FAILURE_MESSAGES = Object.freeze({
  request_body: "Checkout request processing failed.",
  product_lookup: "Supabase product lookup failed.",
  price_validation: "Server-side checkout pricing failed.",
  order_insert: "Supabase order insertion failed.",
  order_item_insert: "Supabase order-item insertion failed.",
  paystack_initialize: "Paystack transaction initialization failed.",
  failure_cleanup: "Failed checkout could not be marked for review."
});

function safePaymentErrorCode(error) {
  const candidate = String(error?.code || "");
  if (/^(?:[0-9A-Z]{5}|PGRST\d{3}|PAYSTACK_HTTP_[45]\d{2}|PAYSTACK_REJECTED|PAYSTACK_INVALID_RESPONSE|ECONNRESET|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ABORT_ERR|UND_ERR_CONNECT_TIMEOUT)$/.test(candidate)) {
    return candidate;
  }
  const status = Number(error?.status || error?.statusCode);
  if (Number.isInteger(status) && status >= 400 && status <= 599) return `HTTP_${status}`;
  if (error?.name === "TimeoutError" || error?.name === "AbortError") return "REQUEST_TIMEOUT";
  if (error?.name === "TypeError") return "NETWORK_ERROR";
  return "UNCLASSIFIED";
}

function formatPaymentInitializationFailure(stage, error) {
  const safeStage = Object.prototype.hasOwnProperty.call(PAYMENT_FAILURE_MESSAGES, stage) ? stage : "request_body";
  return {
    event: "payment_initialization_failed",
    stage: safeStage,
    code: safePaymentErrorCode(error),
    message: PAYMENT_FAILURE_MESSAGES[safeStage]
  };
}

function getPaystackConfiguration(
  secretKey = process.env.PAYSTACK_SECRET_KEY,
  callbackUrl = process.env.PAYSTACK_CALLBACK_URL,
  frontendOrigin = process.env.FRONTEND_ORIGIN
) {
  const unavailable = { configured: false, error: "Online payments are temporarily unavailable. Please try again later." };
  // Keep this deployment explicitly in Paystack Test Mode. Never accept a live key here.
  if (!/^sk_test_[A-Za-z0-9_-]+$/.test(String(secretKey || "").trim())) return unavailable;
  try {
    let callback;
    if (String(callbackUrl || "").trim()) {
      callback = new URL(String(callbackUrl).trim());
    } else {
      // A missing callback can safely be derived from the configured HTTPS storefront origin.
      const origin = new URL(String(frontendOrigin || "").trim());
      if (origin.protocol !== "https:" || !origin.hostname || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) return unavailable;
      callback = new URL("/checkout/checkout.html", origin.origin);
    }
    if (callback.protocol !== "https:" || !callback.hostname || callback.username || callback.password) return unavailable;
    return { configured: true, callbackUrl: callback.toString() };
  } catch {
    return unavailable;
  }
}

module.exports = { createServer, checkSupabaseReadiness, validEmail, isValidOptionalEmail, isValidCheckoutContact, createGuestPaystackEmail, getPaystackConfiguration, buildPaystackInitializationPayload, formatPaymentInitializationFailure, safePaymentErrorCode, buildPricedItems, canTransitionOrderStatus, isStoredProductImageUrl, describeProductImageStorageError, createReceiptAccessToken, verifyReceiptAccessToken };
