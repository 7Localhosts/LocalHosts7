const http = require("http");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const PORT = 8000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "ok",
      message: "Backend is running"
    }));
    return;
  }

  if (req.method === "GET" && req.url === "/api/products") {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("id");

      if (error) throw error;

      res.writeHead(200, {
        "Content-Type": "application/json"
      });

      res.end(JSON.stringify({
        products: data
      }));

    } catch (error) {
      console.error(error);

      res.writeHead(500, {
        "Content-Type": "application/json"
      });

      res.end(JSON.stringify({
        error: "Failed to load products"
      }));
    }

    return;
  }

  if (req.method === "POST" && req.url === "/api/orders") {
    let body = "";

    req.on("data", chunk => {
      body += chunk;
    });

    req.on("end", async () => {
      try {
        const order = JSON.parse(body);

        const {
          customer_name,
          email,
          shipping_address,
          total_amount,
          items
        } = order;

        if (
          !customer_name ||
          !shipping_address ||
          !total_amount ||
          !Array.isArray(items) ||
          !items.length
        ) {
          throw new Error("Missing required order information");
        }

        const { data: createdOrder, error: orderError } =
          await supabase
            .from("orders")
            .insert([{
              customer_name,
              email,
              shipping_address,
              total_amount
            }])
            .select()
            .single();

        if (orderError) throw orderError;

        const orderItems = items.map(item => ({
          order_id: createdOrder.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          price: item.price
        }));

        const { error: itemsError } =
          await supabase
            .from("order_items")
            .insert(orderItems);

        if (itemsError) throw itemsError;

        res.writeHead(201, {
          "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
          success: true,
          orderId: createdOrder.id
        }));

      } catch (error) {
        console.error("Order error:", error);

        res.writeHead(500, {
          "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
          error: error.message || "Failed to create order"
        }));
      }
    });

    return;
  }

  res.writeHead(404, {
    "Content-Type": "application/json"
  });

  res.end(JSON.stringify({
    error: "Not found"
  }));
});

server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});