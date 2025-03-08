const config = require('../../../../dbConfig');
const nodemailer = require("nodemailer");
const { z } = require("zod");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: config.EMAIL_ID, 
        pass: config.EMAIL_PASSWORD,
    },
});

const emailSchema = z.object({
    name: z.string().min(2, "Please enter your full name (at least 2 characters)."),
    email: z.string().email("Please enter a valid email address."),
    phone: z.string()
    .length(10, "Invalid phone number. It must be exactly 10 digits long.")
    .regex(/^[6-9]\d{9}$/, "Invalid phone number. Please enter a valid 10-digit mobile number."),
    message: z.string().min(10, "Your message must contain at least 10 characters."),
});

const sendMail = async (req, res) => {
    try {
        // Validate and parse request body
        const { name, email, message } = emailSchema.parse(req.body);

        const mailOptions = {
            from: email,
            to: config.EMAIL_ID, // Change to your recipient email
            subject: `New Message from ${name}`,
            text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: "Email sent successfully" });

    } catch (error) {
        console.error("Email Error:", error);

        // Handle validation errors separately
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }

        res.status(500).json({ error: "Email could not be sent" });
    }
};

module.exports = { sendMail };
