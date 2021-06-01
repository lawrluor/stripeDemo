const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const { resolve } = require('path');
require('dotenv').config({ path: './.env' });

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.use(express.static(process.env.STATIC_DIR));
app.use(
  express.json({
    verify: function (req, res, buf) {
      if (req.originalUrl.startsWith('/webhook')) {
        req.rawBody = buf.toString();
      }
    },
  })
);

app.get('/', (req, res) => {
  // const path = resolve(process.env.STATIC_DIR + '/index.html');
  const path = resolve('../client/html' + '/index.html');
  res.sendFile(path);
});

app.get('/config', async (req, res) => {
  res.send({
    publicKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});


app.post('/create-checkout-session', async (req, res) => {
  const domainURL = process.env.DOMAIN;

  const {locale, totalCost} = req.body;
  // send files to email in webhook
  const pmTypes = (process.env.PAYMENT_METHOD_TYPES || 'card').split(',').map((m) => m.trim());

  const session = await stripe.checkout.sessions.create({
    payment_method_types: pmTypes,
    mode: 'payment',
    locale: locale,
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: totalCost*100,
        product_data: {
          name: "Test",
          description: "good buy"
        }
      },
      quantity: 1,
    }],
    success_url: `${domainURL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${domainURL}/canceled.html`,
  });

  res.send({
    sessionId: session.id,
  });
});

// Handles the checkout completed event
const fulfillOrder = (session) => {
  // TODO: fill me in
  console.log("Fulfilling order", session);
  emailCustomer();
}

const emailCustomer = (session) => {
  // TODO: fill me in
  console.log("Emailing customer", session);
}

// Reference: https://stripe.com/docs/payments/checkout/fulfill-orders
app.post('/webhook', bodyParser.raw({type: 'application/json'}), async (req, res) => {
  let data;
  let eventType;

  // Verify that this came from from our own server using our webhook secret key
  if (process.env.STRIPE_WEBHOOK_SECRET) {
    let event;
    let signature = req.headers['stripe-signature'];

    try {
      // req may already be parsed into rawBody
      // Make a purchase event with three items, the signature, webhook secret, and request body
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`);
      return res.sendStatus(400);
    }
    data = event.data;
    eventType = event.type;
  } else {
    // Webhook signing is recommended, but if the secret is not configured in `config.js`,
    // retrieve the event data directly from the request body.
    // Doesn't need this because we are using webhook secret
    data = req.body.data;
    eventType = req.body.type;
    console.log("Got data payload: " + data);
  }

  if (eventType === 'checkout.session.completed') {
    console.log(`🔔  Payment received!`);
    const session = event.data.object;
    fulfillOrder(session);
  }

  return res.sendStatus(200);
});



// Test an unsigned request (returns 400 error)
// curl -X POST -H "Content-Type: application/json" --data '{ fake: "unsigned request" }' -is http://localhost:4242/webhook

app.listen(4242, () => console.log(`Node server listening on port ${4242}!`));
