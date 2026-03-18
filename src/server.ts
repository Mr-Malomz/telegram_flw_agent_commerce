import "dotenv/config";
import express from "express";
import cors from "cors";
import { bot } from "./bot";
import productsRouter from "./routes/products";
import ordersRouter from "./routes/orders";
import paymentsRouter from "./routes/payments";
import webhooksRouter from "./routes/webhooks";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/payments", paymentsRouter);
app.use("/webhooks", webhooksRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  bot.start();
  console.log("Telegram bot started (long polling)");
});
