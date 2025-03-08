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

        // HTML email template for auto-reply
        const autoReplyHtml = `
         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
             <h2 style="color: #2c3e50; text-align: center;">Thank You for Contacting Us!</h2>
             <p style="font-size: 16px; color: #555;">Hello <strong>${name}</strong>,</p>
             <p style="font-size: 16px; color: #555;">
                 We have received your message and will get back to you as soon as possible. 
                 If your request is urgent, please contact us directly at <a href="mailto:${config.EMAIL_ID}" style="color: #3498db; text-decoration: none;">${config.EMAIL_ID}</a>.
             </p>
             <div style="text-align: center; margin-top: 20px;">
                 <a href="https://www.logicqr.com" style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-size: 16px;">
                     Visit Our Website
                 </a>
             </div>
             <p style="font-size: 14px; color: #777; margin-top: 20px;">Best Regards, <br>logicQR Team</p>
         </div>
     `;

        // Auto-reply email to the sender
        const autoReplyOptions = {
            from: config.EMAIL_ID, // Your email
            to: email, // Send back to the sender
            subject: "Thank You for Contacting Us",
            html: autoReplyHtml, // Use the HTML template
        };

        await transporter.sendMail(autoReplyOptions);


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
