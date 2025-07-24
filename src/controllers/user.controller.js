import User from "../models/user.model.js";
import bcrypt from "bcrypt";
import ApiError from "../utils/error.js";
import jwt from "jsonwebtoken";
import catchAsyncHandler from "../middlewares/catchAsyncHandler.js";

//API Function removing try catch
export const register = catchAsyncHandler(async (req,res,next)=>{
  const { name, email, password } = req.body; // destructure req.body

    if (!name || !email || !password) {
      return next(new ApiError("All Fields Required", 500));
    }

    let user = await User.findOne({ email });

    if (user) {
      return next(new ApiError("User Already Exists", 500));
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    user = await User.create({ name, email, password: hashedPassword });

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES * 24 * 60 * 60 * 1000,
    });

    return res
      .status(200)
      .cookie("userToken", token, {
        httpOnly: true,
        expires: new Date(
          Date.now() + process.env.COOKIE_EXPIRES * 24 * 60 * 60 * 1000
        ),
        sameSite: "lax",
        secure: false,
      })
      .json({
        success: true,
        user,
        token,
      });
})

export const login = catchAsyncHandler(async (req,res,next)=>{
  const { email, password } = req.body;

    if (!email || !password) {
      return next(new ApiError("All fields required", 500));
    }

    let user = await User.findOne({ email }).select("+password");

    if (!user) {
      return next(new ApiError("User Does not exist, Kindly Register", 500));
    }

    const hashedPassword = user.password;
    let isMatchPassword = await bcrypt.compare(password, hashedPassword);

    if (!isMatchPassword) {
      return next(new ApiError("Incorrect Password", 500));
    }

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES * 24 * 60 * 60 * 1000,
    });

    return res
      .status(200)
      .cookie("userToken", token, {
        httpOnly: true,
        expires: new Date(
          Date.now() + process.env.COOKIE_EXPIRES * 24 * 60 * 60 * 1000
        ),
        sameSite: "lax",
        secure: false,
      })
      .json({
        succes: true,
        user,
        token,
      });
})

export const userDetail = (req, res) => {
  return res.status(200).json({
    success: true,
    message: "User is Logged In",
    user: req.user,
  });
};