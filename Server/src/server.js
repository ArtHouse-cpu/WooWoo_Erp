import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.route.js";
import invoiceRoutes from "./routes/invoice.route.js";
import customerRoutes from "./routes/customer.route.js";
import productRoutes from "./routes/product.route.js";
import categoryRoutes from "./routes/category.route.js";
import subCategoryRoutes from "./routes/subCategory.route.js";
import quotationRoutes from "./routes/quotation.route.js";
import returnsalesRoutes from "./routes/returnSales.router.js";
import subscriptionRoutes from "./routes/subscription.route.js";
import membershipRoutes from "./routes/membership.routes.js";
import purchaseRoutes from "./routes/purchase.router.js";
import purchaseOrderRoutes from "./routes/PurchaseOrder.router.js";
import purchaseReturnRoutes from "./routes/purchaseReturn.router.js";
import vendorRoutes from "./routes/vendor.router.js";
import inventoryRoutes from "./routes/Inventory.router.js";
import walletRoutes from "./routes/wallet.router.js";
import couponRoutes from "./routes/coupon.route.js";
import companyRoutes from "./routes/company.route.js";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT|| 3000 
const MONGODB_URI = process.env.MONGODB_URI
// console.log("ye h",MONGODB_URI)

// Middleware
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/invoice", invoiceRoutes);
app.use("/quotation", quotationRoutes);
app.use("/customer", customerRoutes);
app.use("/product", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/subCategories", subCategoryRoutes);
app.use("/returnsales",returnsalesRoutes);
app.use("/subscriptions", subscriptionRoutes);
app.use("/membership", membershipRoutes);
app.use("/purchase", purchaseRoutes);
app.use("/purchaseOrder", purchaseOrderRoutes);
app.use("/purchaseReturn", purchaseReturnRoutes);
app.use("/vendor", vendorRoutes);
app.use("/inventory", inventoryRoutes);
app.use("/wallet", walletRoutes);
app.use("/coupon", couponRoutes);
app.use("/company", companyRoutes);


app.use("/uploads", express.static(path.join(__dirname, "../uploads")));



(async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB connection established!");
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error.message);
    process.exit(1); 
  }
})();

app.get("/", (req, res) => {
  res.send("🚀 Server is live and running...");
});

 

app.listen(PORT, () => {
  console.log(`🌐 Server is running on port ${PORT}`);
});
