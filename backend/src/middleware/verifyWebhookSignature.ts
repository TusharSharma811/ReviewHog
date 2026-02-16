import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export const verifyWebhookSignature = (req: Request, res: Response, next: NextFunction) => {
  const signature = req.headers["x-hub-signature-256"] as string | undefined;

  if (!signature) {
    return res.status(401).json({ message: "Missing webhook signature" });
  }

  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.error("GITHUB_WEBHOOK_SECRET is not configured");
    return res.status(500).json({ message: "Webhook secret not configured" });
  }

  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!rawBody) {
    return res.status(400).json({ message: "Missing raw body for signature verification" });
  }

  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );

  if (!isValid) {
    return res.status(401).json({ message: "Invalid webhook signature" });
  }

  next();
};
