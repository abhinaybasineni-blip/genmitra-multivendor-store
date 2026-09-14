import "dotenv/config";
import express from "express";
import cors from "cors";
import pg from "pg";

const { Pool } = pg;

const app = express();

app.use(cors());
app.use(express.json());
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: "localhost",
        port: 5432,
        user: "postgres",
        password: process.env.DB_PASSWORD,
        database: "genmitra_store",
      }
);
pool.query("SELECT NOW()", (error, result) => {
  if (error) {
    console.error("Database connection failed:", error);
  } else {
    console.log("PostgreSQL connected:", result.rows[0]);
  }
});
app.get("/api/products", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        name,
        price,
        description,
        vendor_id AS "vendorId",
        vendor_name AS "vendorName",
        category,
        emoji
      FROM products
      ORDER BY id ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching products:", error);

    res.status(500).json({
      error: "Failed to fetch products",
    });
  }
});
app.post("/api/products", async (req, res) => {
  try {
    const {
      name,
      price,
      description,
      vendorId,
      vendorName,
      category,
      emoji,
    } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({
        error: "Product name and price are required",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO products
        (
          name,
          price,
          description,
          vendor_id,
          vendor_name,
          category,
          emoji
        )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        name,
        price,
        description,
        vendor_id AS "vendorId",
        vendor_name AS "vendorName",
        category,
        emoji
      `,
      [
        name,
        price,
        description || "",
        vendorId || null,
        vendorName || null,
        category || "Accessories",
        emoji || "🛒",
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding product:", error);

    res.status(500).json({
      error: "Failed to add product",
    });
  }
});

/* =========================
   CREATE ORDER / CHECKOUT
========================= */

app.post("/api/orders", async (req, res) => {
  const client = await pool.connect();

  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: "Cart is empty",
      });
    }

    await client.query("BEGIN");

    let totalAmount = 0;

    const validatedItems: {
      productId: number;
      quantity: number;
      price: number;
    }[] = [];
    for (const item of items) {
      const productId = Number(item.productId);
      const quantity = Number(item.quantity);

      if (
        !Number.isInteger(productId) ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          error: "Invalid product or quantity",
        });
      }

      const productResult = await client.query(
        `
        SELECT id, price
        FROM products
        WHERE id = $1
        `,
        [productId]
      );

      if (productResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          error: `Product ${productId} not found`,
        });
      }

      const price = Number(productResult.rows[0].price);

      totalAmount += price * quantity;

      validatedItems.push({
        productId,
        quantity,
        price,
      });
    }   
     const orderResult = await client.query(
      `
      INSERT INTO orders (total_amount)
      VALUES ($1)
      RETURNING id, total_amount, created_at
      `,
      [totalAmount]
    );

    const order = orderResult.rows[0];
    for (const item of validatedItems) {
      await client.query(
        `
        INSERT INTO order_items
          (
            order_id,
            product_id,
            quantity,
            price
          )
        VALUES
          ($1, $2, $3, $4)
        `,
        [
          order.id,
          item.productId,
          item.quantity,
          item.price,
        ]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Order created successfully",
      order: {
        id: order.id,
        total_amount: Number(order.total_amount),
        created_at: order.created_at,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Checkout error:", error);

    res.status(500).json({
      error: "Failed to create order",
    });
  } finally {
    client.release();
  }
});

app.get("/api/orders", async (_req, res) => {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT
        o.id AS order_id,
        o.total_amount,
        o.created_at,

        oi.product_id,
        p.name AS product_name,
        oi.quantity,
        oi.price,

        p.vendor_id AS "vendorId",
        p.vendor_name AS "vendorName"

      FROM orders o

      INNER JOIN order_items oi
        ON o.id = oi.order_id

      INNER JOIN products p
        ON p.id = oi.product_id

      ORDER BY
        o.created_at DESC,
        oi.id ASC
    `);


    const ordersMap = new Map();

    for (const row of result.rows) {
      if (!ordersMap.has(row.order_id)) {
        ordersMap.set(row.order_id, {
          id: row.order_id,
          total_amount: Number(row.total_amount),
          created_at: row.created_at,
          items: [],
        });
      }

      ordersMap.get(row.order_id).items.push({
        productId: row.product_id,
        productName: row.product_name,
        quantity: Number(row.quantity),
        price: Number(row.price),
        vendorId: row.vendorId,
        vendorName: row.vendorName,
      });
    }

    res.json(Array.from(ordersMap.values()));
  } catch (error) {
    console.error("Error fetching orders:", error);

    res.status(500).json({
      error: "Failed to fetch orders",
    });
  } finally {
    client.release();
  }
});
const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});