const params = new URLSearchParams(window.location.search);

const productId = Number(params.get("id"));

const product = products.find(item => item.id === productId);

if (!product) {

    document.querySelector(".product-page").innerHTML = `
        <h1>Product not found</h1>
        <p>Sorry, this product could not be found.</p>
        <a href="../index.html">Back to shop</a>
    `;

} else {

    // PRODUCT INFORMATION

    document.getElementById("product-name").textContent =
        product.name;

    document.getElementById("product-price").textContent =
        `GH₵${product.price.toFixed(2)}`;

    document.getElementById("product-description").textContent =
        product.description;


    // PRODUCT IMAGE

    const productImage =
        document.getElementById("product-image");

    productImage.src =
        product.image || "https://via.placeholder.com/600";

    productImage.alt =
        product.name;


    // SIZE

    const sizeSelect =
        document.getElementById("product-size");


    // QUANTITY

    const quantityInput =
        document.getElementById("quantity");

    const decreaseButton =
        document.getElementById("decrease-quantity");

    const increaseButton =
        document.getElementById("increase-quantity");


    // DECREASE QUANTITY

    decreaseButton.addEventListener("click", () => {

        let quantity =
            Number(quantityInput.value);

        if (quantity > 1) {
            quantity--;
        }

        quantityInput.value = quantity;

    });


    // INCREASE QUANTITY

    increaseButton.addEventListener("click", () => {

        let quantity =
            Number(quantityInput.value);

        quantity++;

        quantityInput.value = quantity;

    });


    // MANUAL QUANTITY INPUT

    quantityInput.addEventListener("change", () => {

        let quantity =
            Number(quantityInput.value);

        if (!quantity || quantity < 1) {
            quantity = 1;
        }

        quantityInput.value = quantity;

    });


    // ADD TO CART

    document
        .getElementById("add-to-cart")
        .addEventListener("click", () => {

            let quantity =
                Number(quantityInput.value);

            if (!quantity || quantity < 1) {
                quantity = 1;
            }

            const size =
                sizeSelect.value;


            // GET EXISTING CART

            let cart =
                JSON.parse(
                    localStorage.getItem("kayshaven-cart")
                ) || [];


            // CHECK FOR SAME PRODUCT + SAME SIZE

            const existingItem =
                cart.find(item =>
                    item.id === product.id &&
                    item.size === size
                );


            if (existingItem) {

                existingItem.quantity += quantity;

            } else {

                cart.push({

                    id: product.id,

                    name: product.name,

                    category: product.category,

                    price: product.price,

                    image: product.image,

                    size: size,

                    quantity: quantity

                });

            }


            // SAVE CART

            localStorage.setItem(
                "kayshaven-cart",
                JSON.stringify(cart)
            );


            // GO TO CART

            window.location.href =
                "../cart/cart.html";

        });

}