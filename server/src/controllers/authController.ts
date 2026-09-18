import { response, type Request, type Response } from "express";
import bcrypt from "bcryptjs";

import User from "../models/User.js";


import { 
  registerSchema,
  verifyOTPSchema,
  loginSchema,
  resendOTPSchema,
 
} from "../schemas/authSchema.js";
import { generateOTP } from "../utils/generateOTP.js";
import { sendOTPEmail } from "../services/emailService.js";
import { generateToken } from "../utils/generateToken.js";
import PendingUser from "../models/PendingUser.js";


export const registerUser = async (
  req: Request,
  res: Response
) => {
  try {
    const result = registerSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    const {
      name,
      email,
      password,
    } = result.data;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = generateOTP();

    const otpExpiresAt = new Date(
      Date.now() + 10 * 60 * 1000
    );

    await PendingUser.findOneAndDelete({ email });

    await PendingUser.create({
      name,
      email,
      password: hashedPassword,
      otp,
      otpExpiresAt,
    });

    await sendOTPEmail(email, otp);

    return res.status(201).json({
      message: "Registration successful. OTP sent to your email.",
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

//verify OTP

export const verifyEmailOTP = async (
  req: Request,
  res: Response
) => {
  try{
    const result = verifyOTPSchema.safeParse(req.body);
    
    if(!result.success){
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    const {email,otp}=result.data;

    const pendingUser=await PendingUser.findOne({email});

    if(!pendingUser){
      return res.status(404).json({
        message: "No pending registration found for this email.",
      });
    }

    if(pendingUser.otp!==otp){
      return res.status(400).json({
        message: "Invalid OTP.",
      });
    }

    if(pendingUser.otpExpiresAt < new Date()){
      await PendingUser.findOneAndDelete({email});
      return res.status(400).json({
        message: "OTP has expired. Please register again.",
      });
    }

    const newUser=await User.create({
      name: pendingUser.name,
      email: pendingUser.email,
      password: pendingUser.password,
      isVerified:true,
    });

    await PendingUser.findOneAndDelete({email});

    const token=generateToken(newUser._id.toString());

    return res.status(200).json({
      message: "Email verified and user registered successfully.",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
      },

    });

  } catch(error){
    console.log("Verify OTP error:",error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const loginUser = async (
  req: Request,
  res: Response
) => {
  try{
    const result = loginSchema.safeParse(req.body);

    if(!result.success){
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    const { email, password }= result.data;

    const user=await User.findOne({email});

    if(!user){
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }
    if (!user.isVerified){
      return res.status(403).json({
        message: "Email not verified. Please verify your email before logging in.",
      });
    }

    const isPasswordCorrect= await bcrypt.compare(password,user.password);

    if(!isPasswordCorrect){
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token=generateToken(user._id.toString());

    return res.status(200).json({
      message: "Login successful",
      token,
      user:{
        id:user._id,
        name:user.name,
        email:user.email,
      },
    });
  } catch(error){
    console.log("Login error:",error);
    return res.status(500).json({
      message: "Server error",
    });
  }
}

export const logoutUser = async (
  
  _req: Request,
  res: Response
) => {
  try{
    return res.status(200).json({
      message: "User logged out successfully.",
    });
  } catch(error){
    console.log("Logout error:",error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};


//resend OTP
export const resendOTP = async (

  req: Request,
  res: Response
) => {
  try{

    const result = resendOTPSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "validation failed",
        errors: result.error.flatten(),
      });
    }

    const { email } =result.data;

    const pendingUser=await PendingUser.findOne({email});

    if(!pendingUser){
      return res.status(404).json({
        message: "No pending registration found for this email.",
      });
    }

    const otp=generateOTP();

    const otpExpiresAt=new Date(Date.now()+10*60*1000);

    pendingUser.otp=otp;
    pendingUser.otpExpiresAt=otpExpiresAt;

    await pendingUser.save();

    await sendOTPEmail(email,otp);
    
    return res.status(200).json({
      message: "New OTP sent to your email.",
      });

    } catch(error){
      console.log ("Resend OTP error:",error);
      return res.status(500).json({
        message: "Server error",
      });
    }
  };
  
