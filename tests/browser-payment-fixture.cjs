// Isolated browser QA: no production credentials, orders, or payment requests.
process.env.SUPABASE_URL = 'https://isolated-qa.supabase.co';
process.env.SUPABASE_ANON_KEY = 'qa-placeholder';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'qa-placeholder';
const { createServer } = require('../src/backend/server');
const { productImageUrl } = require('../src/frontend/product-images');
const product = { id:4, name:'Seba Med Cleansing Bar', category:'Baby', price:50, image:'images/4-seba-med-cleansing-bar.png', sizes:[] };
const order = { id:'qa-browser', order_number:'QA-RECEIPT-20261024', created_at:'2026-10-24T10:00:00Z', customer_name:'QA Customer', phone:'0000000000', email:'qa@example.test', total_amount:210, payment_status:'paid', payment_method:'Paystack (isolated mock)', payment_reference:'QA-BROWSER-PAID', order_items:[{ product_name:product.name, product_image_url:'http://localhost:5506/'+productImageUrl(product),size:null,quantity:1,price:50 },{ product_name:'Top and Shorts Set',product_image_url:'http://localhost:5506/product-images/13-top-and-shorts-set.png',size:'M',quantity:2,price:80 }] };
const records={from(){return {select(){return this;},eq(){return this;},async single(){return {data:order,error:null};}};}};
const catalogue={from(){return {select(){return this;},is(){return this;},order(){return this;},eq(){return this;},async range(){return {data:[product],error:null};}};}};
const server=createServer({paymentClient:records,receiptClient:records,catalogueClient:catalogue,receiptSigningKey:'isolated-browser-qa-secret',frontendOrigins:'http://localhost:5506',paymentRequest:async()=>{throw new Error('Network payment requests disabled in browser fixture');}});
server.listen(8006,'127.0.0.1',()=>console.log('Isolated receipt fixture: http://localhost:5506/shop.html; callback ?reference=QA-BROWSER-PAID'));
process.env.STATIC_PORT='5506';process.env.API_PORT='8006';require('../deployment/serve-local');
