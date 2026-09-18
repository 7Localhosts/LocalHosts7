const cart = JSON.parse(localStorage.getItem("cart")) || [];

const cartItemsContainer = document.getElementById("cart-items");
const cartTotal = document.getElementById("cart-total");

function displayCart() {
    cartItemsContainer.innerHTML = "";

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = "<p>Your cart is empty.</p>";
        cartTotal.textContent = "GH₵0.00";
        return;
    }

    let total = 0;

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        const cartItem = document.createElement("div");
        cartItem.classList.add("cart-item");

        cartItem.innerHTML = `
            <h3>${item.name}</h3>
            <p>Size: ${item.size}</p>
            <p>Price: GH₵${item.price.toFixed(2)}</p>

            <div class="quantity-controls">
                <button class="decrease" data-index="${index}">−</button>
                <span>${item.quantity}</span>
                <button class="increase" data-index="${index}">+</button>
            </div>

            <p>Item Total: GH₵${itemTotal.toFixed(2)}</p>

            <button class="remove" data-index="${index}">
                Remove
            </button>
        `;

        cartItemsContainer.appendChild(cartItem);
    });

    cartTotal.textContent = `GH₵${total.toFixed(2)}`;

    addCartButtonListeners();
}

function saveCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
}

function addCartButtonListeners() {

    document.querySelectorAll(".increase").forEach((button) => {
        button.addEventListener("click", () => {
            const index = button.dataset.index;

            cart[index].quantity++;

            saveCart();
            displayCart();
        });
    });

    document.querySelectorAll(".decrease").forEach((button) => {
        button.addEventListener("click", () => {
            const index = button.dataset.index;

            if (cart[index].quantity > 1) {
                cart[index].quantity--;
            }

            saveCart();
            displayCart();
        });
    });

    document.querySelectorAll(".remove").forEach((button) => {
        button.addEventListener("click", () => {
            const index = button.dataset.index;

            cart.splice(index, 1);

            saveCart();
            displayCart();
        });
    });
}

displayCart();