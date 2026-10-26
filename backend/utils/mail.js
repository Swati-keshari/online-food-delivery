import nodemailer from "nodemailer"
//gmail accout ke though email send krege
import dotenv from "dotenv"
dotenv.config()
const transporter = nodemailer.createTransport({
  service: "Gmail",
  port: 465,
  secure: true, // use STARTTLS (upgrade connection to TLS after connecting)
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS,
  },
});
//email send
export const sendOtpMail=async (to,otp) => {
  await transporter.sendMail({
    from:process.env.EMAIL,
    to,
    subject:"Reset your password",
    html: `<p>Your OTP for password reset is <b>${otp}</b>. It expires in 5 minutes.</p>`

  })
}

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)

export const sendDeliveryOtpMail = async (to, otp, customerName) => {
  customerName = customerName && escapeHtml(customerName)
  await transporter.sendMail({
    from: process.env.EMAIL,
    to,
    subject: "Your Vingo delivery OTP",
    html: `<p>Hi ${customerName || "there"},</p>
      <p>Your order is at your door. Share this OTP with the delivery boy to receive it: <b>${otp}</b></p>
      <p>It expires in 5 minutes.</p>`,
  })
}