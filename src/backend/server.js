const http = require("http");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const PORT = 8000;

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

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS"
  });

  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", chunk => {
      body += chunk;
    });

    req.on("end", () => {
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

const server = http.createServer(
  async (req, res) => {

    // CORS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization",
        "Access-Control-Allow-Methods":
          "GET, POST, PATCH, OPTIONS"
      });

      res.end();
      return;
    }

    // -------------------------
    // HEALTH
    // -------------------------

    if (
      req.method === "GET" &&
      req.url === "/api/health"
    ) {
      sendJson(res, 200, {
        success: true,
        message: "Backend is running"
      });

      return;
    }

        // -------------------------
    // GET PRODUCTS
    // -------------------------

    if (
      req.method === "GET" &&
      req.url === "/api/products"
    ) {
      try {
        const {
          data,
          error
        } = await supabaseAdmin
          .from("products")
          .select("*")
          .order("id");

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

        if (
          !name ||
          !category ||
          !Number.isFinite(price)
        ) {
          sendJson(res, 400, {
            error:
              "Name, category and valid price are required"
          });

          return;
        }

        if (
          !Number.isFinite(stock) ||
          stock < 0
        ) {
          sendJson(res, 400, {
            error:
              "Stock must be a valid number"
          });

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
            stock
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
          product_id,
          product_name,
          quantity,
          price
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

if (
  req.method === "POST" &&
  req.url === "/api/orders"
) {
  try {
    const body =
      await readBody(req);

    const {
      customer_name,
      email,
      shipping_address,
      total_amount,
      items
    } = body;

    if (
      !customer_name ||
      !shipping_address ||
      !total_amount ||
      !Array.isArray(items) ||
      !items.length
    ) {
      throw new Error(
        "Missing required order information"
      );
    }

    const {
      data: createdOrder,
      error: orderError
    } = await supabaseAdmin
      .from("orders")
      .insert([{
        customer_name,
        email,
        shipping_address,
        total_amount
      }])
      .select()
      .single();

    if (orderError) {
      throw orderError;
    }

    const orderItems =
      items.map(item => ({
        order_id: createdOrder.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        price: item.price
      }));

    const {
      error: itemsError
    } = await supabaseAdmin
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      throw itemsError;
    }

    sendJson(res, 201, {
      success: true,
      orderId: createdOrder.id,
      order: createdOrder
    });

  } catch (error) {
    console.error(
      "Create order error:",
      error
    );

    sendJson(res, 500, {
      error:
        error.message ||
        "Failed to create order"
    });
  }

  return;
}

    // -------------------------
    // NOT FOUND
    // -------------------------

    sendJson(res, 404, {
      error: "Route not found"
    });
  }
);

// -------------------------
// START SERVER
// -------------------------

server.listen(PORT, () => {
  console.log(
    `Backend running on http://localhost:${PORT}`
  );
});