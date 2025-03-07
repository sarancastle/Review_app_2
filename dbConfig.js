require('dotenv').config();

// Store environment variables in an object
const config = {
    EMAIL_ID: process.env.EMAIL_ID,
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET
  };

module.exports = config;