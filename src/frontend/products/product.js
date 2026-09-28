const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

const API_URL = "http://localhost:8000/api/products";

async function loadProduct() {
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Failed to load products");
        }

        const data = await response.json();
        const products = data.products;

        const product = products.find(
            item => String(item.id) === String(productId)
        );

        if (!product) {
            document.querySelector(".product-page").innerHTML = `
                <h1>Product not found</h1>
                <p>Sorry, this product could not be found.</p>
                <a href="../index.html">Back to shop</a>
            `;
            return;
        }

        document.getElementById("product-name").textContent =
            product.name;

        document.getElementById("product-price").textContent =
            `GHS ${Number(product.price).toFixed(2)}`;

        document.getElementById("product-description").textContent =
            product.description || "";

        const productImage =
            document.getElementById("product-image");

        if (product.image) {
            productImage.src = product.image;
        }

        productImage.alt = product.name;

        const quantityInput =
            document.getElementById("quantity");

        const decreaseButton =
            document.getElementById("decrease-quantity");

        const increaseButton =
            document.getElementById("increase-quantity");

        decreaseButton.addEventListener("click", () => {
            let quantity = Number(quantityInput.value);

            if (quantity > 1) {
                quantity--;
            }

            quantityInput.value = quantity;
        });

        increaseButton.addEventListener("click", () => {
            let quantity = Number(quantityInput.value);
            quantity++;
            quantityInput.value = quantity;
        });

        quantityInput.addEventListener("change", () => {
            let quantity = Number(quantityInput.value);

            if (!quantity || quantity < 1) {
                quantity = 1;
            }

            quantityInput.value = quantity;
        });

        document
            .getElementById("add-to-cart")
            .addEventListener("click", () => {

                let quantity = Number(quantityInput.value);

                if (!quantity || quantity < 1) {
                    quantity = 1;
                }

                let cart =
                    JSON.parse(
                        localStorage.getItem("kayshaven-cart")
                    ) || [];

                const existingItem =
                    cart.find(
                        item =>
                            String(item.id) === String(product.id)
                    );

                if (existingItem) {
                    existingItem.qty += quantity;
                } else {
                    cart.push({
                        id: product.id,
                        name: product.name,
                        category: product.category,
                        price: Number(product.price),
                        image: product.image,
                        qty: quantity
                    });
                }

                localStorage.setItem(
                    "kayshaven-cart",
                    JSON.stringify(cart)
                );

                window.location.href = "../index.html";
            });

    } catch (error) {
        console.error("Product loading error:", error);

        document.querySelector(".product-page").innerHTML = `
            <h1>Unable to load product</h1>
            <p>Please make sure the backend is running.</p>
            <a href="../index.html">Back to shop</a>
        `;
    }
}

loadProduct();