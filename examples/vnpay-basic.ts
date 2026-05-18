/**
 * Example: how a developer uses @vn-payment/vnpay in their project.
 *
 * Install:
 *   npm install @vn-payment/vnpay
 *
 * Every adapter shares the same interface — swap VnpayAdapter
 * with MomoAdapter or ZalopayAdapter without changing any other code.
 */

import { VnpayAdapter } from "@vn-payment/vnpay";

const vnpay = new VnpayAdapter({
    tmnCode: process.env.VNPAY_TMN_CODE!,
    secureSecret: process.env.VNPAY_SECURE_SECRET!,
    env: "sandbox",
});

// 1. Create a payment order
const order = await vnpay.createOrder({
    orderId: "ORDER_001",
    amount: 50000,
    description: "Thanh toán đơn hàng #001",
    redirectUrl: "https://yourapp.com/payment/return",
    ipnUrl: "https://yourapp.com/payment/webhook",
});

console.log("Redirect user to:", order.paymentUrl);

// 2. Verify IPN callback (in your webhook handler)
// app.get("/payment/webhook", async (req, res) => {
//   // Note: VNPay usually sends IPN via GET query params
//   const result = await vnpay.verifyWebhook({ rawBody: req.query }); 
//   
//   if (result.status === "success") {
//     await markOrderAsPaid(result.orderId);
//   }
//   
//   // VNPay requires a specific JSON response for webhook
//   res.json({ RspCode: "00", Message: "Confirm Success" });
// });

// 3. Refund
// const refund = await vnpay.refund({
//   orderId: "ORDER_001",
//   transactionId: "TXN_12345",
//   amount: 50000,
//   reason: "Khách hàng đổi ý",
// });
