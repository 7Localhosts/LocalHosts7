let cart =
    JSON.parse(
        localStorage.getItem("kayshaven-cart")
    ) || [];


const cartItemsContainer =
    document.getElementById("cart-items");

const cartTotal =
    document.getElementById("cart-total");

const summaryTotal =
    document.getElementById("summary-total");


function saveCart() {

    localStorage.setItem(
        "kayshaven-cart",
        JSON.stringify(cart)
    );

}


function displayCart() {

    cartItemsContainer.innerHTML = "";


    if (cart.length === 0) {

        cartItemsContainer.innerHTML = `
            <div class="empty-cart">
                <p>Your cart is empty.</p>
            </div>
        `;

        cartTotal.textContent = "GH₵0.00";
        summaryTotal.textContent = "GH₵0.00";

        return;
    }


    let total = 0;


    cart.forEach((item, index) => {

        const quantity =
            Number(item.quantity) || 1;

        const itemTotal =
            item.price * quantity;

        total += itemTotal;


        const cartItem =
            document.createElement("div");

        cartItem.classList.add("cart-item");


        cartItem.innerHTML = `

            <div class="cart-item-image">

                <img
                    src="${item.image || "https://via.placeholder.com/300"}"
                    alt="${item.name}"
                >

            </div>


            <div class="cart-item-info">

                <h3>
                    ${item.name}
                </h3>

                <p>
                    ${item.category || ""}
                </p>

                <p>
                    Size: ${item.size || "Not selected"}
                </p>

                <p class="cart-item-price">
                    GH₵${item.price.toFixed(2)}
                </p>


                <div class="quantity-controls">

                    <button
                        class="decrease"
                        data-index="${index}"
                    >
                        −
                    </button>

                    <span>
                        ${quantity}
                    </span>

                    <button
                        class="increase"
                        data-index="${index}"
                    >
                        +
                    </button>

                </div>

            </div>


            <div class="cart-item-total">

                <p>
                    GH₵${itemTotal.toFixed(2)}
                </p>

                <button
                    class="remove"
                    data-index="${index}"
                >
                    Remove
                </button>

            </div>

        `;


        cartItemsContainer.appendChild(cartItem);

    });


    cartTotal.textContent =
        `GH₵${total.toFixed(2)}`;

    summaryTotal.textContent =
        `GH₵${total.toFixed(2)}`;


    addCartButtonListeners();

}


function addCartButtonListeners() {


    document
        .querySelectorAll(".increase")
        .forEach(button => {

            button.addEventListener("click", () => {

                const index =
                    Number(button.dataset.index);

                cart[index].quantity =
                    (Number(cart[index].quantity) || 1) + 1;

                saveCart();

                displayCart();

            });

        });


    document
        .querySelectorAll(".decrease")
        .forEach(button => {

            button.addEventListener("click", () => {

                const index =
                    Number(button.dataset.index);

                const currentQuantity =
                    Number(cart[index].quantity) || 1;


                if (currentQuantity > 1) {

                    cart[index].quantity =
                        currentQuantity - 1;

                }


                saveCart();

                displayCart();

            });

        });


    document
        .querySelectorAll(".remove")
        .forEach(button => {

            button.addEventListener("click", () => {

                const index =
                    Number(button.dataset.index);

                cart.splice(index, 1);

                saveCart();

                displayCart();

            });

        });

}


displayCart();