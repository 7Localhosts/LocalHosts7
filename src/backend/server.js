const http = require("http");
const { createClient } = require("@supabase/supabase-js");
const { buildPricedItems } = require("./order-utils");
require("dotenv").config();

const PORT = Number(process.env.PORT || 8000);
const DELIVERY_FEE = Number(process.env.DELIVERY_FEE_GHS || 15);
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";
const PAYSTACK_CALLBACK_URL = process.env.PAYSTACK_CALLBACK_URL;

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": FRONTEND_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    "Vary": "Origin",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body is too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try { resolve(JSON.parse(body || "{}")); }
      catch { reject(new Error("Invalid JSON")); }
    });
    req.on("error", reject);
  });
}

async function authenticateStaff(req) {
  if (!supabase || !supabaseAdmin) return null;
  const authorization = req.headers.authorization || "";
  if (!authorization.startsWith("Bearer ")) return null;
  const { data: { user }, error: authError } = await supabase.auth.getUser(authorization.slice(7));
  if (authError || !user) return null;
  const { data: staff, error } = await supabaseAdmin.from("staff")
    .select("id, full_name, login_name, auth_email, active")
    .eq("id", user.id).eq("active", true).single();
  return error || !staff ? null : { user, staff };
}

function publicError(error, fallback) {
  console.error(fallback, error);
  return fallback;
}

async function paystackRequest(path, options = {}) {
  if (!PAYSTACK_SECRET_KEY) throw new Error("Paystack is not configured on the server");
  const response = await fetch(`https://api.paystack.co${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const result = await response.json();
  if (!response.ok || !result.status) throw new Error(result.message || "Paystack request failed");
  return result.data;
}

function validEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function createServer() {
  return http.createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": FRONTEND_ORIGIN,
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
        "Vary": "Origin"
      });
      res.end();
      return;
    }

    const pathname = new URL(req.url, "http://localhost").pathname;
    if (pathname === "/api/health" && req.method === "GET") {
      sendJson(res, 200, { success: true, message: "Backend is running" });
      return;
    }

    if (pathname === "/api/checkout/config" && req.method === "GET") {
      sendJson(res, 200, { currency: "GHS", delivery_fee: DELIVERY_FEE });
      return;
    }

    if (!supabaseAdmin || !supabase) {
      sendJson(res, 503, { error: "Supabase is not configured on the server" });
      return;
    }

    if (pathname === "/api/products" && req.method === "GET") {
      try {
        const { data, error } = await supabaseAdmin.from("products").select("*").order("id");
        if (error) throw error;
        sendJson(res, 200, { products: data || [] });
      } catch (error) {
        sendJson(res, 500, { error: publicError(error, "Failed to load products") });
      }
      return;
    }

    if (pathname === "/api/products" && req.method === "POST") {
      if (!await authenticateStaff(req)) {
        sendJson(res, 401, { error: "Unauthorized" });
        return;
      }
      try {
        const body = await readBody(req);
        const name = String(body.name || "").trim();
        const category = String(body.category || "").trim();
        const price = Number(body.price);
        const stock = Number(body.stock ?? 0);
        const sizes = Array.isArray(body.sizes)
          ? body.sizes.map(size => String(size).trim()).filter(Boolean)
          : String(body.sizes || "").split(",").map(size => size.trim()).filter(Boolean);
        if (!name || !category || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) {
          sendJson(res, 400, { error: "Name, category, positive price and valid stock are required" });
          return;
        }
        const { data: product, error } = await supabaseAdmin.from("products").insert({
          name, category, price, stock, sizes,
          image: body.image ? String(body.image).trim() : null,
          description: body.description ? String(body.description).trim() : null
        }).select().single();
        if (error) throw error;
        sendJson(res, 201, { success: true, product });
      } catch (error) {
        sendJson(res, 500, { error: publicError(error, "Failed to create product") });
      }
      return;
    }

    if (pathname.startsWith("/api/products/") && req.method === "PATCH") {
      if (!await authenticateStaff(req)) {
        sendJson(res, 401, { error: "Unauthorized" });
        return;
      }
      try {
        const id = decodeURIComponent(pathname.slice("/api/products/".length));
        const body = await readBody(req);
        const updates = {};
        if (Object.hasOwn(body, "sizes")) {
          updates.sizes = Array.isArray(body.sizes)
            ? body.sizes.map(size => String(size).trim()).filter(Boolean)
            : String(body.sizes || "").split(",").map(size => size.trim()).filter(Boolean);
        }
        if (Object.hasOwn(body, "image")) updates.image = body.image ? String(body.image).trim() : null;
        if (Object.hasOwn(body, "stock")) {
          const stock = Number(body.stock);
          if (!Number.isInteger(stock) || stock < 0) {
            sendJson(res, 400, { error: "Stock must be a non-negative whole number" });
            return;
          }
          updates.stock = stock;
        }
        if (!Object.keys(updates).length) {
          sendJson(res, 400, { error: "Provide sizes, image or stock to update" });
          return;
        }
        const { data: product, error } = await supabaseAdmin.from("products").update(updates).eq("id", id).select().single();
        if (error) throw error;
        sendJson(res, 200, { success: true, product });
      } catch (error) {
        sendJson(res, 500, { error: publicError(error, "Failed to update product") });
      }
      return;
    }

    if (pathname === "/api/staff/login" && req.method === "POST") {
      try {
        const body = await readBody(req);
        const loginName = String(body.login_name || body.loginName || "").trim().toLowerCase();
        const password = String(body.password || "");
        if (!loginName || !password) {
          sendJson(res, 400, { error: "Login name and password are required" });
          return;
        }
        const { data: staff, error } = await supabaseAdmin.from("staff").select("*")
          .eq("login_name", loginName).eq("active", true).single();
        if (error || !staff) {
          sendJson(res, 401, { error: "Invalid login name or password" });
          return;
        }
        const { data, error: loginError } = await supabase.auth.signInWithPassword({ email: staff.auth_email, password });
        if (loginError) {
          sendJson(res, 401, { error: "Invalid login name or password" });
          return;
        }
        sendJson(res, 200, {
          success: true, session: data.session,
          staff: { id: staff.id, full_name: staff.full_name, login_name: staff.login_name, auth_email: staff.auth_email }
        });
      } catch (error) {
        sendJson(res, 500, { error: publicError(error, "Login failed") });
      }
      return;
    }

    if (pathname === "/api/staff/me" && req.method === "GET") {
      const authenticated = await authenticateStaff(req);
      if (!authenticated) sendJson(res, 401, { error: "Unauthorized" });
      else sendJson(res, 200, { staff: authenticated.staff });
      return;
    }

    if (pathname === "/api/staff" && req.method === "POST") {
      if (!await authenticateStaff(req)) {
        sendJson(res, 401, { error: "Unauthorized" });
        return;
      }
      try {
        const body = await readBody(req);
        const fullName = String(body.full_name || "").trim();
        const loginName = String(body.login_name || "").trim().toLowerCase();
        const password = String(body.password || "");
        if (!fullName || !loginName || password.length < 8) {
          sendJson(res, 400, { error: "Full name, login name and a password of at least 8 characters are required" });
          return;
        }
        const authEmail = `${loginName}@kayshaven.local`;
        const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({ email: authEmail, password, email_confirm: true });
        if (createError) throw createError;
        const { data: staff, error } = await supabaseAdmin.from("staff").insert({
          id: created.user.id, full_name: fullName, login_name: loginName, auth_email: authEmail, active: true
        }).select().single();
        if (error) {
          await supabaseAdmin.auth.admin.deleteUser(created.user.id);
          throw error;
        }
        sendJson(res, 201, { success: true, staff });
      } catch (error) {
        sendJson(res, 500, { error: publicError(error, "Failed to create admin") });
      }
      return;
    }

    if (pathname === "/api/staff/password" && req.method === "POST") {
      const authenticated = await authenticateStaff(req);
      if (!authenticated) {
        sendJson(res, 401, { error: "Unauthorized" });
        return;
      }
      try {
        const { new_password: newPassword } = await readBody(req);
        if (typeof newPassword !== "string" || newPassword.length < 8) {
          sendJson(res, 400, { error: "Password must be at least 8 characters" });
          return;
        }
        const { error } = await supabaseAdmin.auth.admin.updateUserById(authenticated.user.id, { password: newPassword });
        if (error) throw error;
        sendJson(res, 200, { success: true });
      } catch (error) {
        sendJson(res, 500, { error: publicError(error, "Failed to change password") });
      }
      return;
    }

    if (pathname === "/api/orders" && req.method === "GET") {
      if (!await authenticateStaff(req)) {
        sendJson(res, 401, { error: "Unauthorized" });
        return;
      }
      try {
        const { data, error } = await supabaseAdmin.from("orders").select(`*, order_items(product_id, product_name, quantity, price, size)`)
          .order("created_at", { ascending: false });
        if (error) throw error;
        sendJson(res, 200, { orders: data || [] });
      } catch (error) {
        sendJson(res, 500, { error: publicError(error, "Failed to load orders") });
      }
      return;
    }

    if (pathname === "/api/payments/initialize" && req.method === "POST") {
      try {
        if (!PAYSTACK_CALLBACK_URL) throw new Error("PAYSTACK_CALLBACK_URL is not configured");
        const body = await readBody(req);
        const name = String(body.customer_name || "").trim();
        const email = String(body.email || "").trim().toLowerCase();
        const address = String(body.shipping_address || "").trim();
        const phone = String(body.phone || "").trim();
        if (!name || !validEmail(email) || !address || !Array.isArray(body.items) || !body.items.length) {
          sendJson(res, 400, { error: "Name, valid email, delivery address and order items are required" });
          return;
        }

        const ids = [...new Set(body.items.map(item => String(item.product_id ?? item.id ?? "").trim()).filter(Boolean))];
        const { data: products, error: productError } = await supabaseAdmin.from("products").select("id,name,price,stock,sizes").in("id", ids);
        if (productError) throw productError;
        const { items, total } = buildPricedItems(body.items, products, DELIVERY_FEE);
        const reference = `KH-${Date.now()}-${require("crypto").randomBytes(5).toString("hex")}`;
        const { data: order, error: orderError } = await supabaseAdmin.from("orders").insert({
          order_number: reference.toUpperCase(), customer_name: name, email, phone, shipping_address: address, total_amount: total,
          status: "Pending", payment_status: "pending", payment_reference: reference, payment_method: "Paystack"
        }).select().single();
        if (orderError) throw orderError;
        const { error: itemsError } = await supabaseAdmin.from("order_items").insert(items.map(item => ({ ...item, order_id: order.id })));
        if (itemsError) {
          await supabaseAdmin.from("orders").delete().eq("id", order.id);
          throw itemsError;
        }
        try {
          const payment = await paystackRequest("/transaction/initialize", {
            method: "POST",
            body: JSON.stringify({
              email, amount: String(Math.round(total * 100)), currency: "GHS", reference,
              callback_url: PAYSTACK_CALLBACK_URL,
              channels: ["card", "mobile_money", "bank", "bank_transfer", "ussd"],
              metadata: { order_id: order.id, customer_name: name, phone }
            })
          });
          sendJson(res, 201, { success: true, order_id: order.id, order_number: order.order_number || reference, authorization_url: payment.authorization_url, reference });
        } catch (error) {
          await supabaseAdmin.from("order_items").delete().eq("order_id", order.id);
          await supabaseAdmin.from("orders").delete().eq("id", order.id);
          throw error;
        }
      } catch (error) {
        const isInputError = /required|available|stock|size|quantity|invalid/i.test(error.message || "");
        sendJson(res, isInputError ? 400 : 500, { error: isInputError ? error.message : publicError(error, "Could not start payment") });
      }
      return;
    }

    if (pathname === "/api/payments/verify" && req.method === "POST") {
      try {
        const body = await readBody(req);
        const reference = String(body.reference || "").trim();
        if (!reference) {
          sendJson(res, 400, { error: "Payment reference is required" });
          return;
        }
        const payment = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`, { method: "GET" });
        const { data: order, error } = await supabaseAdmin.from("orders").select("id,order_number,customer_name,total_amount,payment_status")
          .eq("payment_reference", reference).single();
        if (error || !order) throw new Error("Order was not found for this payment");
        const expectedKobo = Math.round(Number(order.total_amount) * 100);
        if (payment.reference !== reference || payment.status !== "success" || payment.currency !== "GHS" || Number(payment.amount) !== expectedKobo) {
          await supabaseAdmin.from("orders").update({ payment_status: "failed", status: "Payment failed" }).eq("id", order.id).eq("payment_status", "pending");
          sendJson(res, 402, { error: "Payment could not be verified" });
          return;
        }
        if (order.payment_status !== "paid") {
          const { error: finalizeError } = await supabaseAdmin.rpc("finalize_paid_order", { p_reference: reference });
          if (finalizeError) {
            await supabaseAdmin.from("orders").update({ payment_status: "paid", status: "Paid - Stock review" }).eq("id", order.id);
            console.error("Paid order needs stock review", finalizeError);
            sendJson(res, 409, { error: `Payment was received, but this order needs a stock review. Contact Kay's Haven and quote ${reference}.` });
            return;
          }
        }
        sendJson(res, 200, { success: true, order_id: order.id, order_number: order.order_number || order.id, customer_name: order.customer_name, status: "paid" });
      } catch (error) {
        sendJson(res, 400, { error: publicError(error, "Payment verification failed") });
      }
      return;
    }

    if (pathname === "/api/orders" && req.method === "POST") {
      sendJson(res, 410, { error: "Orders must be placed through secure Paystack checkout" });
      return;
    }

    sendJson(res, 404, { error: "Route not found" });
  });
}

if (require.main === module) {
  if (process.env.NODE_ENV === "production") {
    const required = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "PAYSTACK_SECRET_KEY", "PAYSTACK_CALLBACK_URL", "FRONTEND_ORIGIN"];
    const missing = required.filter(name => !process.env[name]);
    if (missing.length || FRONTEND_ORIGIN === "*") {
      throw new Error(`Production configuration is incomplete: ${missing.join(", ") || "FRONTEND_ORIGIN must be set"}`);
    }
  }
  const server = createServer();
  server.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
}

module.exports = { createServer, validEmail, buildPricedItems };
