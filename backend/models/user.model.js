import mongoose from "mongoose";
const userSchema=new mongoose.Schema({
    fullName:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
    },
    googleUid:{
        type:String,
    },

    password:{
        type:String,
        
    },
    mobile:{
        type:String,
        required:true,
    },
    role:{
        type:String,
        enum:["user","owner","deliveryBoy"],
        required:true,
    },
    resetOtp:{
       type:String,
    },
    isOtpVerified:{
        type:Boolean,
        default:false,

    },
    otpExpires:{
        type:Date,
    },
    otpAttempts:{
        type:Number,
        default:0,
    },
    otpSentAt:{
        type:Date,
    },
    // Saved delivery addresses, picked at checkout.
    addresses:[
        {
            label:{ type:String, trim:true, maxlength:30, default:"Home" },
            text:{ type:String, trim:true, required:true, maxlength:300 },
            latitude:{ type:Number, required:true, min:-90, max:90 },
            longitude:{ type:Number, required:true, min:-180, max:180 },
        },
    ],
    // Live position as [longitude, latitude]; used to find delivery boys near a shop.
    location:{
        type:{type:String,enum:["Point"],default:"Point"},
        coordinates:{type:[Number],default:[0,0]},
    },

},{timestamps:true})

userSchema.index({location:"2dsphere"})
const User = mongoose.model("User", userSchema)
export default User