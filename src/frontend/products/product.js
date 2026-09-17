const product = {
    id: 1,
    name: "Classic T-Shirt",
    price: 150,
    description: "A comfortable and stylish classic T-shirt from Kay's Haven.",
    image: "https://via.placeholder.com/600",
    sizes: ["S", "M", "L", "XL"]
};

document.getElementById("product-name").textContent = product.name;
document.getElementById("product-price").textContent = `GH₵${product.price.toFixed(2)}`;
document.getElementById("product-description").textContent = product.description;
document.getElementById("product-image").src = product.image;
document.getElementById("product-image").alt = product.name;

document.getElementById("add-to-cart").addEventListener("click", () => {

    console.log("BUTTON CLICKED");

    const quantity = parseInt(document.getElementById("quantity").value);
    const size = document.getElementById("product-size").value;

    const cartItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        size: size,
        quantity: quantity
    };

    localStorage.setItem("cart", JSON.stringify([cartItem]));
});