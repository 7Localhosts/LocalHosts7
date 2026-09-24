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

    document.getElementById("product-name").textContent = product.name;

    document.getElementById("product-price").textContent =
        `GHS ${product.price.toFixed(2)}`;

    document.getElementById("product-description").textContent =
        product.description;

    const productImage = document.getElementById("product-image");

    if (product.image) {
        productImage.src = product.image;
    }

    productImage.alt = product.name;

    const quantityInput = document.getElementById("quantity");
    const decreaseButton = document.getElementById("decrease-quantity");
    const increaseButton = document.getElementById("increase-quantity");

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

    document.getElementById("add-to-cart").addEventListener("click", () => {

        let quantity = Number(quantityInput.value);

        if (!quantity || quantity < 1) {
            quantity = 1;
        }

        let cart =
            JSON.parse(localStorage.getItem("kayshaven-cart")) || [];

        const existingItem =
            cart.find(item => item.id === product.id);

        if (existingItem) {
            existingItem.qty += quantity;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                category: product.category,
                price: product.price,
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
}