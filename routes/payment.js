// router.post("/easypaisa", async (req, res) => {
//     try {
//         const { userUid, email, amount } = req.body;

//         if (!userUid || !amount)
//             return res.json(ResponseObj(false, "Missing fields"));

//         const orderId = Date.now().toString();
//         const payload = {
//             storeId: process.env.EASYPAISA_STORE_ID,
//             amount,
//             orderId,
//             returnUrl: "https://zstate.vercel.app/payment-callback"
//         };

//         const response = await axios.post(process.env.EASYPAISA_API_URL, payload);

//         await db.ref("payments/" + orderId).set({
//             userUid,
//             email,
//             amount,
//             status: "PENDING",
//             createdAt: new Date().toISOString()
//         });

//         res.json(ResponseObj(true, "Payment initiated", { paymentId: orderId, easypaisaResponse: response.data }));
//     } catch (err) {
//         console.error(err);
//         res.json(ResponseObj(false, "Payment failed", null, err.message));
//     }
// });
