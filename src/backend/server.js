const http = require('http');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const port = 8000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Request payload too large'));
      }
    });

    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error('Invalid JSON payload'));
      }
    });

    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/api/health') {
    sendJson(res, 200, { status: 'ok', message: 'Backend is running' });
    return;
  }

  if (req.url === '/api/products' && req.method === 'GET') {
    try {
      const { data, error } = await supabase.from('products').select('*');

      if (error) throw error;
      sendJson(res, 200, { products: data || [] });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return;
  }

  if (req.url === '/api/orders' && req.method === 'POST') {
    try {
      const payload = await readBody(req);
      const { customerName, email, shippingAddress, cart } = payload;

      if (!customerName || !shippingAddress || !Array.isArray(cart) || !cart.length) {
        sendJson(res, 400, { error: 'Missing required order data' });
        return;
      }

      const totalAmount = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            customer_name: customerName,
            email: email || null,
            shipping_address: shippingAddress,
            total_amount: totalAmount,
            status: 'pending',
          },
        ])
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);

      if (itemsError) throw itemsError;

      sendJson(res, 201, {
        message: 'Order created successfully',
        order,
      });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return;
  }

  sendJson(res, 404, { error: 'Route not found' });
});

server.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
