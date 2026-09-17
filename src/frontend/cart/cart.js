console.log("CART JS LOADED");
const cart = JSON.parse(localStorage.getItem("cart")) || [];

console.log(cart);
const cartItemsContainer = document.getElementById("cart-items");

cart.forEach((item) => {
    const cartItem = document.createElement("div");

    cartItem.innerHTML = `
        <h3>${item.name}</h3>
        <p>Size: ${item.size}</p>
        <p>Quantity: ${item.quantity}</p>
        <p>Price: GH₵${(item.price * item.quantity).toFixed(2)}</p>
    `;

    cartItemsContainer.appendChild(cartItem);
});

