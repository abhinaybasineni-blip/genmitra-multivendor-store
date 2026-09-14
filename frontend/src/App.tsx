import { useEffect, useMemo, useState } from "react";
const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

type Product = {
  id: number;
  name: string;
  price: number;
  description: string;
  vendorId: number | null;
  vendorName: string | null;
  category: string;
  emoji: string;
};

type CartItem = Product & {
  quantity: number;
};

type OrderItem = {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  vendorId: number | null;
  vendorName: string | null;
};

type Order = {
  id: number;
  total_amount: number;
  created_at: string;
  items: OrderItem[];
};

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const [selectedVendor, setSelectedVendor] = useState("All");

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const [productError, setProductError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Professional checkout notification
  const [successMessage, setSuccessMessage] = useState("");

  /* =========================
     LOAD PRODUCTS
  ========================= */

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      setProductError("");

      const response = await fetch(
       `${API_URL}/api/products`
      );

      if (!response.ok) {
        throw new Error("Failed to load products");
      }

      const data = await response.json();

      const formattedProducts: Product[] = data.map(
        (product: any) => ({
          id: Number(product.id),
          name: product.name,
          price: Number(product.price),
          description: product.description || "",

          vendorId:
            product.vendorId !== null &&
            product.vendorId !== undefined
              ? Number(product.vendorId)
              : null,

          vendorName:
            product.vendorName || "Unknown Vendor",

          category:
            product.category || "Accessories",

          emoji:
            product.emoji || "🛒",
        })
      );

      setProducts(formattedProducts);
    } catch (error) {
      console.error("Error loading products:", error);

      setProductError(
        "Could not load products from the backend."
      );
    } finally {
      setLoadingProducts(false);
    }
  };

  /* =========================
     LOAD ORDERS
  ========================= */

  const loadOrders = async () => {
    try {
      setLoadingOrders(true);

      const response = await fetch(
        "http://localhost:5000/api/orders"
      );

      if (!response.ok) {
        throw new Error("Failed to load orders");
      }

      const data = await response.json();

      // Convert backend snake_case names into
      // the camelCase names used by React.
      const formattedOrders: Order[] = data.map(
        (order: any) => ({
          id: Number(order.id),
          total_amount: Number(order.total_amount),
          created_at: order.created_at,

          items: (order.items || []).map(
            (item: any) => ({
              productId: Number(
                item.productId ??
                  item.product_id
              ),

              productName:
                item.productName ??
                item.product_name,

              quantity: Number(item.quantity),

              price: Number(item.price),

              vendorId:
                item.vendorId !== undefined
                  ? Number(item.vendorId)
                  : null,

              vendorName:
                item.vendorName ||
                "Unknown Vendor",
            })
          ),
        })
      );

      setOrders(formattedOrders);
    } catch (error) {
      console.error(
        "Error loading orders:",
        error
      );
    } finally {
      setLoadingOrders(false);
    }
  };

  /* =========================
     INITIAL LOAD
  ========================= */

  useEffect(() => {
    loadProducts();
    loadOrders();
  }, []);

  /* =========================
     ADD TO CART
  ========================= */

  const addToCart = (product: Product) => {
    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.id === product.id
      );

      if (existingItem) {
        return currentCart.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...currentCart,
        {
          ...product,
          quantity: 1,
        },
      ];
    });
  };

  /* =========================
     INCREASE QUANTITY
  ========================= */

  const increaseQuantity = (productId: number) => {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === productId
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      )
    );
  };

  /* =========================
     DECREASE QUANTITY
  ========================= */

  const decreaseQuantity = (productId: number) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === productId
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  /* =========================
     REMOVE FROM CART
  ========================= */

  const removeFromCart = (productId: number) => {
    setCart((currentCart) =>
      currentCart.filter(
        (item) => item.id !== productId
      )
    );
  };

  /* =========================
     CART COUNT
  ========================= */

  const cartCount = useMemo(() => {
    return cart.reduce(
      (total, item) => total + item.quantity,
      0
    );
  }, [cart]);

  /* =========================
     CART TOTAL
  ========================= */

  const cartTotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total + item.price * item.quantity,
      0
    );
  }, [cart]);

  /* =========================
     VENDORS
  ========================= */

  const vendors = useMemo(() => {
    const names = products
      .map(
        (product) =>
          product.vendorName || "Unknown Vendor"
      )
      .filter(
        (name, index, array) =>
          array.indexOf(name) === index
      );

    return names;
  }, [products]);

  /* =========================
     FILTER PRODUCTS
  ========================= */

  const filteredProducts = useMemo(() => {
    if (selectedVendor === "All") {
      return products;
    }

    return products.filter(
      (product) =>
        (product.vendorName ||
          "Unknown Vendor") === selectedVendor
    );
  }, [products, selectedVendor]);

  /* =========================
     GROUP CART BY VENDOR
  ========================= */

  const groupedCart = useMemo(() => {
    const groups: Record<string, CartItem[]> = {};

    cart.forEach((item) => {
      const vendor =
        item.vendorName || "Unknown Vendor";

      if (!groups[vendor]) {
        groups[vendor] = [];
      }

      groups[vendor].push(item);
    });

    return groups;
  }, [cart]);

  /* =========================
     CHECKOUT
  ========================= */

  const checkout = async () => {
    if (cart.length === 0) {
      return;
    }

    try {
      setCheckoutLoading(true);

      const response = await fetch(
        "http://localhost:5000/api/orders",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            items: cart.map((item) => ({
              productId: item.id,
              quantity: item.quantity,
            })),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error(
          "Checkout failed:",
          data
        );

        setSuccessMessage(
          data.error ||
            "Checkout failed. Please try again."
        );

        return;
      }

      /*
       * IMPORTANT:
       * Clear the cart immediately after the
       * backend confirms the order.
       */
      setCart([]);

      /*
       * Show professional in-page notification
       * instead of browser alert().
       */
      setSuccessMessage(
        `Order #${data.order.id} was placed successfully!`
      );

      /*
       * Refresh order history.
       */
      await loadOrders();

      /*
       * Automatically move to Order History.
       */
      setTimeout(() => {
        document
          .getElementById("order-history")
          ?.scrollIntoView({
            behavior: "smooth",
          });
      }, 300);

      /*
       * Automatically hide notification after 5 seconds.
       */
      setTimeout(() => {
        setSuccessMessage("");
      }, 5000);
    } catch (error) {
      console.error(
        "Checkout error:",
        error
      );

      setSuccessMessage(
        "Could not connect to the backend."
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  /* =========================
     SCROLL TO CART
  ========================= */

  const goToCart = () => {
    document
      .getElementById("cart-section")
      ?.scrollIntoView({
        behavior: "smooth",
      });
  };

  /* =========================
     FORMAT PRICE
  ========================= */

  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString("en-IN")}`;
  };

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: Arial, Helvetica, sans-serif;
          background: #f5f7fb;
          color: #172033;
        }

        button {
          font-family: inherit;
        }

        .app {
          min-height: 100vh;
        }

        /* =========================
           SUCCESS NOTIFICATION
        ========================= */

        .notification-container {
          position: fixed;
          top: 85px;
          right: 25px;
          z-index: 1000;
          width: 360px;
          max-width: calc(100vw - 30px);
        }

        .success-notification {
          background: white;
          border: 1px solid #d7e8dc;
          border-left: 5px solid #16a34a;
          border-radius: 12px;
          padding: 16px 18px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.14);
          display: flex;
          align-items: flex-start;
          gap: 12px;
          animation: slideIn 0.3s ease;
        }

        .notification-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #dcfce7;
          color: #15803d;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          flex-shrink: 0;
        }

        .notification-content {
          flex: 1;
        }

        .notification-title {
          font-size: 14px;
          font-weight: 800;
          margin-bottom: 4px;
        }

        .notification-message {
          font-size: 12px;
          color: #667085;
          line-height: 1.5;
        }

        .notification-close {
          border: none;
          background: transparent;
          color: #98a2b3;
          font-size: 18px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }

        .notification-close:hover {
          color: #344054;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(30px);
          }

          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        /* =========================
           HEADER
        ========================= */

        .header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: white;
          border-bottom: 1px solid #e1e5ee;
        }

        .header-inner {
          max-width: 1100px;
          margin: 0 auto;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo {
          color: #1769ff;
          font-size: 22px;
          font-weight: 800;
        }

        .subtitle {
          color: #718096;
          font-size: 12px;
          margin-top: 3px;
        }

        .cart-top-button {
          border: none;
          background: #edf4ff;
          color: #1769ff;
          padding: 12px 18px;
          border-radius: 25px;
          font-weight: 700;
          cursor: pointer;
        }

        .cart-top-button:hover {
          background: #dceaff;
        }

        /* =========================
           MAIN
        ========================= */

        .container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 28px 20px 60px;
        }

        /* =========================
           HERO
        ========================= */

        .hero {
          background: linear-gradient(
            110deg,
            #2368f5,
            #9518f5
          );
          color: white;
          padding: 42px;
          border-radius: 18px;
          margin-bottom: 34px;
        }

        .hero-small {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }

        .hero h1 {
          margin: 0 0 10px;
          font-size: 32px;
        }

        .hero p {
          margin: 0;
          font-size: 14px;
          opacity: 0.95;
        }

        /* =========================
           SECTION
        ========================= */

        .section-title {
          margin-bottom: 18px;
        }

        .section-title h2 {
          margin: 0;
          font-size: 20px;
        }

        .section-title p {
          margin: 5px 0 0;
          color: #718096;
          font-size: 13px;
        }

        /* =========================
           VENDOR FILTER
        ========================= */

        .vendor-filter {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 22px;
        }

        .vendor-button {
          border: 1px solid #d7deea;
          background: white;
          color: #344054;
          padding: 10px 17px;
          border-radius: 22px;
          cursor: pointer;
          font-weight: 600;
        }

        .vendor-button.active {
          background: #1769ff;
          border-color: #1769ff;
          color: white;
        }

        /* =========================
           PRODUCTS
        ========================= */

        .products-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }

        .product-card {
          background: white;
          border: 1px solid #d8dfeb;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 3px 10px rgba(20, 30, 50, 0.05);
        }

        .product-image {
          height: 160px;
          background: #eef2f7;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 62px;
        }

        .product-info {
          padding: 18px;
        }

        .category {
          display: inline-block;
          background: #eef5ff;
          color: #1769ff;
          padding: 5px 9px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .product-name {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .vendor {
          font-size: 12px;
          color: #718096;
          margin-bottom: 8px;
        }

        .vendor strong {
          color: #1769ff;
        }

        .description {
          color: #718096;
          font-size: 12px;
          min-height: 32px;
          margin-bottom: 15px;
        }

        .product-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        .price {
          font-size: 17px;
          font-weight: 800;
        }

        .add-button {
          border: none;
          background: #1769ff;
          color: white;
          padding: 10px 14px;
          border-radius: 9px;
          cursor: pointer;
          font-weight: 700;
        }

        .add-button:hover {
          background: #0d58df;
        }

        /* =========================
           ERROR
        ========================= */

        .error-box {
          background: #fff0f0;
          color: #d93025;
          padding: 18px;
          border-radius: 10px;
          margin-bottom: 25px;
        }

        .retry-button {
          margin-top: 10px;
          border: none;
          background: transparent;
          color: #1769ff;
          cursor: pointer;
          font-weight: 700;
        }

        /* =========================
           CART
        ========================= */

        .cart-section {
          margin-top: 50px;
        }

        .cart-layout {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 18px;
        }

        .cart-box {
          background: white;
          border: 1px solid #d8dfeb;
          border-radius: 14px;
          padding: 18px;
        }

        .vendor-cart {
          margin-bottom: 22px;
        }

        .vendor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #e1e5ee;
          padding-bottom: 12px;
          margin-bottom: 10px;
        }

        .vendor-title {
          font-weight: 800;
        }

        .cart-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 0;
          border-bottom: 1px solid #edf0f5;
        }

        .cart-item-info {
          flex: 1;
        }

        .cart-item-name {
          font-weight: 700;
          font-size: 14px;
        }

        .cart-item-price {
          color: #718096;
          font-size: 12px;
          margin-top: 4px;
        }

        .quantity-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .quantity-button {
          width: 30px;
          height: 30px;
          background: white;
          border: 1px solid #aeb8c8;
          border-radius: 6px;
          cursor: pointer;
        }

        .quantity-number {
          min-width: 20px;
          text-align: center;
          font-weight: 700;
        }

        .remove-button {
          border: none;
          background: transparent;
          color: #e53935;
          cursor: pointer;
          font-size: 12px;
        }

        .vendor-subtotal {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          font-weight: 700;
          padding-top: 12px;
        }

        .summary {
          background: white;
          border: 1px solid #d8dfeb;
          border-radius: 14px;
          padding: 20px;
          height: fit-content;
        }

        .summary h3 {
          margin-top: 0;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 9px 0;
          font-size: 13px;
        }

        .summary-total {
          border-top: 1px solid #d8dfeb;
          margin-top: 10px;
          padding-top: 15px;
          font-size: 18px;
          font-weight: 800;
        }

        .checkout-button {
          width: 100%;
          margin-top: 18px;
          border: none;
          background: #1769ff;
          color: white;
          padding: 14px;
          border-radius: 9px;
          font-weight: 800;
          cursor: pointer;
        }

        .checkout-button:disabled {
          background: #aeb8c8;
          cursor: not-allowed;
        }

        .empty-cart {
          min-height: 180px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #718096;
          text-align: center;
        }

        .empty-cart-icon {
          font-size: 42px;
          margin-bottom: 10px;
        }

        .empty-cart strong {
          color: #172033;
        }

        /* =========================
           ORDER HISTORY
        ========================= */

        .orders-section {
          margin-top: 50px;
        }

        .orders-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .refresh-button {
          border: 1px solid #cbd5e1;
          background: white;
          padding: 9px 14px;
          border-radius: 8px;
          cursor: pointer;
        }

        .order-card {
          background: white;
          border: 1px solid #d8dfeb;
          border-radius: 14px;
          padding: 18px;
          margin-bottom: 14px;
        }

        .order-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 12px;
          border-bottom: 1px solid #d8dfeb;
        }

        .order-number {
          font-weight: 800;
        }

        .order-date {
          color: #718096;
          font-size: 11px;
          margin-top: 5px;
        }

        .order-total {
          font-weight: 800;
        }

        .order-items-title {
          font-weight: 700;
          font-size: 12px;
          margin: 14px 0 8px;
        }

        .order-item {
          display: flex;
          justify-content: space-between;
          padding: 7px 0;
          font-size: 12px;
        }

        .order-item-vendor {
          color: #718096;
          font-size: 11px;
        }

        /* =========================
           RESPONSIVE
        ========================= */

        @media (max-width: 900px) {
          .products-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .cart-layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .products-grid {
            grid-template-columns: 1fr;
          }

          .hero {
            padding: 28px;
          }

          .hero h1 {
            font-size: 25px;
          }

          .header-inner {
            padding: 12px;
          }

          .container {
            padding: 20px 12px 50px;
          }

          .notification-container {
            top: 70px;
            right: 15px;
            left: 15px;
            width: auto;
          }

          .cart-item {
            flex-wrap: wrap;
          }
        }
      `}</style>

      <div className="app">

        {/* =========================
            SUCCESS NOTIFICATION
        ========================= */}

        {successMessage && (
          <div className="notification-container">
            <div className="success-notification">

              <div className="notification-icon">
                ✓
              </div>

              <div className="notification-content">

                <div className="notification-title">
                  Order Successful
                </div>

                <div className="notification-message">
                  {successMessage}
                  <br />
                  Your order has been added to Order History.
                </div>

              </div>

              <button
                className="notification-close"
                onClick={() =>
                  setSuccessMessage("")
                }
                aria-label="Close notification"
              >
                ×
              </button>

            </div>
          </div>
        )}

        {/* =========================
            HEADER
        ========================= */}

        <header className="header">

          <div className="header-inner">

            <div>

              <div className="logo">
                GenMitra Store
              </div>

              <div className="subtitle">
                Multi-Vendor Marketplace
              </div>

            </div>

            <button
              className="cart-top-button"
              onClick={goToCart}
            >
              🛒 Cart ({cartCount})
            </button>

          </div>

        </header>

        <main className="container">

          {/* =========================
              HERO
          ========================= */}

          <section className="hero">

            <div className="hero-small">
              GENMITRA TECHNICAL ASSESSMENT
            </div>

            <h1>
              Shop from multiple vendors
            </h1>

            <p>
              Browse products from different vendors
              and manage your multi-vendor cart before
              checkout.
            </p>

          </section>

          {/* =========================
              PRODUCTS
          ========================= */}

          <section>

            <div className="section-title">

              <h2>
                Products
              </h2>

              <p>
                Choose products from different vendors
              </p>

            </div>

            {vendors.length > 0 && (

              <div className="vendor-filter">

                <button
                  className={
                    selectedVendor === "All"
                      ? "vendor-button active"
                      : "vendor-button"
                  }
                  onClick={() =>
                    setSelectedVendor("All")
                  }
                >
                  All
                </button>

                {vendors.map((vendor) => (

                  <button
                    key={vendor}
                    className={
                      selectedVendor === vendor
                        ? "vendor-button active"
                        : "vendor-button"
                    }
                    onClick={() =>
                      setSelectedVendor(vendor)
                    }
                  >
                    {vendor}
                  </button>

                ))}

              </div>

            )}

            {loadingProducts && (

              <div className="cart-box">
                Loading products...
              </div>

            )}

            {productError && (

              <div className="error-box">

                {productError}

                <br />

                <button
                  className="retry-button"
                  onClick={loadProducts}
                >
                  Retry
                </button>

              </div>

            )}

            {!loadingProducts &&
              !productError &&
              filteredProducts.length === 0 && (

                <div className="cart-box">
                  No products found.
                </div>

            )}

            <div className="products-grid">

              {filteredProducts.map((product) => (

                <div
                  className="product-card"
                  key={product.id}
                >

                  <div className="product-image">
                    {product.emoji}
                  </div>

                  <div className="product-info">

                    <div className="category">
                      {product.category}
                    </div>

                    <div className="product-name">
                      {product.name}
                    </div>

                    <div className="vendor">

                      Sold by{" "}

                      <strong>
                        {product.vendorName ||
                          "Unknown Vendor"}
                      </strong>

                    </div>

                    <div className="description">
                      {product.description}
                    </div>

                    <div className="product-bottom">

                      <div className="price">
                        {formatPrice(product.price)}
                      </div>

                      <button
                        className="add-button"
                        onClick={() =>
                          addToCart(product)
                        }
                      >
                        Add to Cart
                      </button>

                    </div>

                  </div>

                </div>

              ))}

            </div>

          </section>

          {/* =========================
              CART
          ========================= */}

          <section
            id="cart-section"
            className="cart-section"
          >

            <div className="section-title">

              <h2>
                Your Cart
              </h2>

              <p>
                Items are grouped by vendor for checkout
              </p>

            </div>

            {cart.length === 0 ? (

              <div className="cart-box empty-cart">

                <div className="empty-cart-icon">
                  🛒
                </div>

                <strong>
                  Your cart is empty
                </strong>

                <div>
                  Add products above to start your order.
                </div>

              </div>

            ) : (

              <div className="cart-layout">

                {/* CART ITEMS */}

                <div className="cart-box">

                  {Object.entries(groupedCart).map(
                    ([vendor, items]) => {

                      const vendorTotal =
                        items.reduce(
                          (total, item) =>
                            total +
                            item.price *
                              item.quantity,
                          0
                        );

                      return (

                        <div
                          className="vendor-cart"
                          key={vendor}
                        >

                          <div className="vendor-header">

                            <div>

                              <div
                                style={{
                                  fontSize: "11px",
                                  color: "#718096",
                                }}
                              >
                                Vendor
                              </div>

                              <div className="vendor-title">
                                {vendor}
                              </div>

                            </div>

                            <div
                              style={{
                                fontSize: "11px",
                                color: "#1769ff",
                              }}
                            >
                              {items.length}{" "}
                              {items.length === 1
                                ? "product"
                                : "products"}
                            </div>

                          </div>

                          {items.map((item) => (

                            <div
                              className="cart-item"
                              key={item.id}
                            >

                              <div className="cart-item-info">

                                <div className="cart-item-name">
                                  {item.name}
                                </div>

                                <div className="cart-item-price">
                                  {formatPrice(
                                    item.price
                                  )}{" "}
                                  each
                                </div>

                              </div>

                              <div className="quantity-controls">

                                <button
                                  className="quantity-button"
                                  onClick={() =>
                                    decreaseQuantity(
                                      item.id
                                    )
                                  }
                                >
                                  −
                                </button>

                                <span className="quantity-number">
                                  {item.quantity}
                                </span>

                                <button
                                  className="quantity-button"
                                  onClick={() =>
                                    increaseQuantity(
                                      item.id
                                    )
                                  }
                                >
                                  +
                                </button>

                              </div>

                              <button
                                className="remove-button"
                                onClick={() =>
                                  removeFromCart(
                                    item.id
                                  )
                                }
                              >
                                Remove
                              </button>

                            </div>

                          ))}

                          <div className="vendor-subtotal">

                            <span>
                              Vendor Subtotal
                            </span>

                            <span>
                              {formatPrice(
                                vendorTotal
                              )}
                            </span>

                          </div>

                        </div>

                      );
                    }
                  )}

                </div>

                {/* ORDER SUMMARY */}

                <div className="summary">

                  <h3>
                    Order Summary
                  </h3>

                  <div className="summary-row">

                    <span>
                      Items
                    </span>

                    <span>
                      {cartCount}
                    </span>

                  </div>

                  <div className="summary-row">

                    <span>
                      Vendors
                    </span>

                    <span>
                      {Object.keys(groupedCart).length}
                    </span>

                  </div>

                  <div className="summary-row summary-total">

                    <span>
                      Total
                    </span>

                    <span>
                      {formatPrice(cartTotal)}
                    </span>

                  </div>

                  <button
                    className="checkout-button"
                    disabled={
                      cart.length === 0 ||
                      checkoutLoading
                    }
                    onClick={checkout}
                  >
                    {checkoutLoading
                      ? "Processing..."
                      : "Proceed to Checkout"}
                  </button>

                </div>

              </div>

            )}

          </section>

          {/* =========================
              ORDER HISTORY
          ========================= */}

          <section
            id="order-history"
            className="orders-section"
          >

            <div className="orders-header">

              <div className="section-title">

                <h2>
                  Order History
                </h2>

                <p>
                  Your previously placed orders
                </p>

              </div>

              <button
                className="refresh-button"
                onClick={loadOrders}
              >
                Refresh
              </button>

            </div>

            {loadingOrders && (

              <div className="cart-box">
                Loading order history...
              </div>

            )}

            {!loadingOrders &&
              orders.length === 0 && (

                <div className="cart-box">
                  No orders have been placed yet.
                </div>

            )}

            {!loadingOrders &&
              orders.map((order) => (

                <div
                  className="order-card"
                  key={order.id}
                >

                  <div className="order-top">

                    <div>

                      <div className="order-number">
                        Order #{order.id}
                      </div>

                      <div className="order-date">
                        {new Date(
                          order.created_at
                        ).toLocaleString("en-IN")}
                      </div>

                    </div>

                    <div className="order-total">
                      {formatPrice(
                        Number(order.total_amount)
                      )}
                    </div>

                  </div>

                  <div className="order-items-title">
                    Items
                  </div>

                  {order.items.map(
                    (item, index) => (

                      <div
                        className="order-item"
                        key={`${order.id}-${item.productId}-${index}`}
                      >

                        <div>

                          <div>
                            {item.productName} ×{" "}
                            {item.quantity}
                          </div>

                          <div className="order-item-vendor">
                            Sold by{" "}
                            {item.vendorName ||
                              "Unknown Vendor"}
                          </div>

                        </div>

                        <div>
                          {formatPrice(
                            item.price *
                              item.quantity
                          )}
                        </div>

                      </div>

                    )
                  )}

                </div>

              ))}

          </section>

        </main>

      </div>
    </>
  );
}

export default App;