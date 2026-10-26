import User from "../models/user.model.js"
import { sendOtpMail } from "../utils/mail.js"
import genToken from "../utils/token.js"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { getFirebaseAdminAuth } from "../utils/firebaseAdmin.js"

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // matches the JWT expiry in utils/token.js
const MAX_OTP_ATTEMPTS = 5
// In production the frontend and API live on different domains (e.g. Vercel + Render),
// so the cookie must be cross-site, which browsers only allow over HTTPS.
const isProduction = process.env.NODE_ENV === "production"
const sessionCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "strict",
    maxAge: SESSION_MAX_AGE_MS,
}
const OTP_TTL_MS = 5 * 60 * 1000
const OTP_RESEND_COOLDOWN_MS = 60 * 1000
// After the OTP is verified, the new password must be set within this time.
const RESET_WINDOW_MS = 10 * 60 * 1000

const normalizeEmail = (email) => (typeof email === "string" ? email.trim().toLowerCase() : "")

// Never send the password hash or reset OTP to the browser.
const toSafeUser = (user) => ({
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    mobile: user.mobile,
    role: user.role,
    addresses: user.addresses ?? [],
})
// three authetication//
export const signUp = async (req, res) => {
    try {
        const { fullName, password, mobile, role } = req.body
        const email = normalizeEmail(req.body.email)
        const user = await User.findOne({ email })
        if(user){
            return res.status(400).json({ message: "User Already exist." })
        }
        
        if (typeof password !== "string" || password.length < 6) {
            return res.status(400).json({ message: "password must be at least 6 characters." })
        }
        if (typeof mobile !== "string" || mobile.length < 10) {
            return res.status(400).json({ message: "mobile no must be at least 10 digits." })
        }
        const hashPassword = await bcrypt.hash(password, 10)
        const newUser = await User.create({
            fullName,
            email,
            password: hashPassword,
            mobile,
            role
        })
        const token = await genToken(newUser._id)
        res.cookie("token", token, sessionCookieOptions)
        return res.status(201).json(toSafeUser(newUser))
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "User Already exist." })
        }
        return res.status(500).json({ message: `sign up error ${error.message}` })
    }
}
export const signIn = async (req, res) => {
    try {
        const { password } = req.body
        const user = await User.findOne({ email: normalizeEmail(req.body.email) })
        if (!user) {
            return res.status(400).json({ message: "User does not exist." })
        }
        
        if (typeof password !== "string") {
            return res.status(400).json({ message: "password is required." })
        }
        if (!user.password) {
            return res.status(400).json({ message: "This account uses Google sign-in. Please use Sign in with Google." })
        }
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.status(400).json({ message: "incorrect password." })
        }

        const token = await genToken(user._id)
        res.cookie("token", token, sessionCookieOptions)
        return res.status(200).json(toSafeUser(user))
    } catch (error) {
        return res.status(500).json({ message: `sign in error ${error.message}` })
    }
}

export const googleAuth= async (req, res) => {
    const { idToken, mode, mobile, role } = req.body

    if (typeof idToken !== "string" || !["signup", "signin"].includes(mode)) {
        return res.status(400).json({ message: "A valid Google credential and authentication mode are required." })
    }

    let firebaseAuth
    try {
        firebaseAuth = getFirebaseAdminAuth()
    } catch {
        return res.status(503).json({ message: "Google sign-in is not configured on the server." })
    }

    let decodedToken
    try {
        decodedToken = await firebaseAuth.verifyIdToken(idToken)
    } catch {
        return res.status(401).json({ message: "The Google credential is invalid or expired. Please try again." })
    }

    if (
        decodedToken.firebase?.sign_in_provider !== "google.com" ||
        decodedToken.email_verified !== true ||
        typeof decodedToken.email !== "string"
    ) {
        return res.status(401).json({ message: "Please use a verified Google account." })
    }

    try {
        const email = normalizeEmail(decodedToken.email)
        let user = await User.findOne({ $or: [{ googleUid: decodedToken.uid }, { email }] })

        if (mode === "signup") {
            if (user) {
                return res.status(409).json({ message: "An account with this Google email already exists. Please sign in instead." })
            }
            if (typeof mobile !== "string" || mobile.trim().length < 10) {
                return res.status(400).json({ message: "Please enter a mobile number with at least 10 characters." })
            }
            if (!["user", "owner", "deliveryBoy"].includes(role)) {
                return res.status(400).json({ message: "Please select a valid account role." })
            }

            user = await User.create({
                fullName: decodedToken.name?.trim() || email.split("@")[0],
                email,
                googleUid: decodedToken.uid,
                mobile: mobile.trim(),
                role,
            })
        } else {
            if (!user) {
                return res.status(404).json({ message: "No account found for this Google email. Please sign up first." })
            }
            if (user.googleUid && user.googleUid !== decodedToken.uid) {
                return res.status(401).json({ message: "This Google account is not linked to the user." })
            }
            if (!user.googleUid) {
                user.googleUid = decodedToken.uid
                await user.save()
            }
        }

        const token = await genToken(user._id)
        if (!token) {
            return res.status(500).json({ message: "Unable to create a session. Please try again." })
        }
        res.cookie("token", token, sessionCookieOptions)
        return res.status(mode === "signup" ? 201 : 200).json({
            message: mode === "signup" ? "Account created successfully." : "Signed in successfully."
        })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "An account with this Google email already exists. Please sign in instead." })
        }
        return res.status(500).json({ message: `Google authentication error ${error.message}` })
    }
}

export const signOut = async (req, res) => {
    try {
       res.clearCookie("token", { ...sessionCookieOptions, maxAge: undefined })
       return res.status(200).json({ message: "logOut successfully." })
    } catch (error) {
        return res.status(500).json({ message: `sign out error ${error.message}` })
    
        
    }
}
//otp send krne ke liye controllers//
export const sendOtp=async (req,res) => {
    try {
        const email = normalizeEmail(req.body.email)
        const user=await User.findOne({email})
        if (!user) {
            return res.status(400).json({ message: "User does not exist." })
        }
        // Without a cooldown, resending resets the attempt counter and the OTP could be guessed.
        if (user.otpSentAt && Date.now() - user.otpSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
            return res.status(429).json({ message: "Please wait a minute before requesting another OTP." })
        }
        const otp=crypto.randomInt(1000, 10000).toString()
        user.resetOtp=otp
        user.otpExpires=Date.now()+OTP_TTL_MS
        user.otpSentAt=new Date()
        user.otpAttempts=0
        user.isOtpVerified=false
        await user.save()
        await sendOtpMail(email,otp)
        return res.status(200).json({ message: "otp send successfully." })
        
    
    } catch (error) {
        return res.status(500).json({ message: `send otp  error ${error.message}` })
    }}
//VERIFY OTP//
export const verifyOtp = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email)
        const otp = String(req.body.otp ?? "")
        // A 4-digit OTP is easy to guess: each try is counted atomically before checking,
        // so many requests sent at once still get only MAX_OTP_ATTEMPTS guesses in total.
        const user = await User.findOneAndUpdate(
            {
                email,
                resetOtp: { $exists: true, $ne: null },
                otpExpires: { $gt: new Date() },
                otpAttempts: { $lt: MAX_OTP_ATTEMPTS },
            },
            { $inc: { otpAttempts: 1 } },
            { new: true },
        )
        if (!user) {
            return res.status(400).json({ message: "Invalid or expired OTP. Please request a new OTP." })
        }
        if (user.resetOtp !== otp) {
            if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
                await User.updateOne({ _id: user._id }, { $unset: { resetOtp: 1, otpExpires: 1 } })
                return res.status(400).json({ message: "Too many wrong attempts. Please request a new OTP." })
            }
            return res.status(400).json({ message: "Invalid or expired OTP." })
        }

        await User.updateOne(
            { _id: user._id },
            {
                $set: { isOtpVerified: true, otpExpires: new Date(Date.now() + RESET_WINDOW_MS), otpAttempts: 0 },
                $unset: { resetOtp: 1 },
            },
        )
        return res.status(200).json({ message: "OTP verified successfully." })
    } catch (error) {
        return res.status(500).json({ message: `verify otp error ${error.message}` })
    }
}

//password reset controller//
export const resetPassword = async (req, res) => {
    try {
        const { newPassword } = req.body
        const user = await User.findOne({ email: normalizeEmail(req.body.email) })
        if (!user || !user.isOtpVerified || !user.otpExpires || user.otpExpires.getTime() <= Date.now()) {
            return res.status(400).json({ message: "otp verification required" })
        }
        if (typeof newPassword !== "string" || newPassword.length < 6) {
            return res.status(400).json({ message: "password must be at least 6 characters." })
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10)
        user.password = hashedPassword
        user.isOtpVerified = false
        user.otpExpires = undefined
        await user.save()
        return res.status(200).json({ message: "password reset successfully." })
    } catch (error) {
        return res.status(500).json({ message: `reset password error ${error.message}` })
    }
}
