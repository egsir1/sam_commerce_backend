const { generateToken } = require("../config/jwtToken");
const User = require("../models/User_module");
const asyncHandler = require("express-async-handler");
const validateMongoDbId = require("../utils/validateMongodbId");
const { generateRefreshToken } = require("../config/refreshToken");
const jwt = require("jsonwebtoken");
const sendEmail = require("./emailController");
const Product = require("../models/Product_module");
const Cart = require("../models/Cart_module");
const Coupon = require("../models/Coupon_module");
const Order = require("../models/Order_module");
const uniqid = require("uniqid");

//Register a new user
const createUser = asyncHandler(async (req, res) => {
  const email = req.body.email;
  const findUser = await User.findOne({ email: email });

  if (!findUser) {
    //Create a new user
    const newUser = await User.create(req.body);
    res.json(newUser);
  } else {
    throw new Error("User Already Exists");
  }
});

//login a user
const loginUserController = asyncHandler(async (req, res) => {
  console.log("loginUser/userController");
  const { email, password } = req.body;
  console.log(req.body);
  console.log(email, password);
  //check if user exists or not

  const findUser = await User.findOne({ email });
  if (findUser && (await findUser.isPasswordMatched(password))) {
    const refreshToken = await generateRefreshToken(findUser?._id);
    // console.log("refresh-token-1", refreshToken);
    const updatedUser = await User.findByIdAndUpdate(
      findUser.id,
      { refreshToken: refreshToken },
      { new: true }
    );
    // console.log("res-cookie-1", res.cookie);
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    });
    // console.log("res-cookie-2", res.cookie);
    // console.log("refresh-token-2", refreshToken);

    res.json({
      _id: findUser._id,
      firstname: findUser.firstname,
      lastname: findUser.lastname,
      email: findUser.email,
      mobile: findUser.mobile,
      token: generateToken(findUser._id),
    });
  } else {
    throw new Error("Invalid Credentials!");
  }
});

//login admin
const loginAdminController = asyncHandler(async (req, res) => {
  console.log("loginUser/userController");
  const { email, password } = req.body;
  console.log(req.body);
  console.log(email, password);
  //check if user exists or not

  const findAdmin = await User.findOne({ email });
  if (findAdmin.role !== "admin") throw new Error("User Not Authorised");
  if (findAdmin && (await findAdmin.isPasswordMatched(password))) {
    const refreshToken = await generateRefreshToken(findAdmin?._id);
    // console.log("refresh-token-1", refreshToken);
    const updatedUser = await User.findByIdAndUpdate(
      findAdmin.id,
      { refreshToken: refreshToken },
      { new: true }
    );
    // console.log("res-cookie-1", res.cookie);
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    });
    // console.log("res-cookie-2", res.cookie);
    // console.log("refresh-token-2", refreshToken);

    res.json({
      _id: findAdmin._id,
      firstname: findAdmin.firstname,
      lastname: findAdmin.lastname,
      email: findAdmin.email,
      mobile: findAdmin.mobile,
      token: generateToken(findAdmin._id),
    });
  } else {
    throw new Error("Invalid Credentials!");
  }
});

//handle refresh token
const handleRefreshToken = asyncHandler(async (req, res) => {
  const cookie = req.cookies;
  console.log("cookies", cookie);
  if (!cookie?.refreshToken) throw new Error("No RefreshToken in Cookies");
  const refreshToken = cookie.refreshToken;
  console.log("refreshToken-3", refreshToken);

  const user = await User.findOne({ refreshToken });
  if (!user) throw new Error("No Refresh token exists in db or not matched");
  // res.json(user);
  jwt.verify(refreshToken, process.env.JWT_SECRET, (err, decoded) => {
    if (err || user.id !== decoded.id) {
      throw new Error("There is something wrong with refresh token");
    }
    const accessToken = generateToken(user?._id);
    res.json({ accessToken });
  });
});

//Get all users logic

const getAllUser = asyncHandler(async (req, res) => {
  try {
    const getUsers = await User.find();
    console.log("getAllUserCtrl:", getUsers);
    res.json(getUsers);
  } catch (error) {
    throw new Error(error);
  }
});

//Get a single user

const getOneUser = asyncHandler(async (req, res) => {
  console.log("user/ctrl/getOneUser");
  console.log("req-params:", req.params);
  const { id } = req.params;
  // validateMongoDbId(id);

  try {
    const getaUser = await User.findByIdAndDelete(id);
    res.json({
      getaUser,
    });
  } catch (error) {
    throw new Error(error);
  }
  console.log(id);
});

//Delete a user

const deleteUser = asyncHandler(async (req, res) => {
  console.log("req-params:", req.params);
  const { id } = req.params;
  // validateMongoDbId(id);

  try {
    const deleteaUser = await User.findById(id);
    res.json({
      deleteaUser,
    });
  } catch (error) {
    throw new Error(error);
  }
  console.log(id);
});

//Update a user
const updateUser = asyncHandler(async (req, res) => {
  // const { id } = req.params;
  const { _id } = req.user;
  try {
    const updatedUser = await User.findByIdAndUpdate(
      _id,
      {
        firstname: req?.body?.firstname,
        lastname: req?.body?.lastname,
        email: req?.body.email,
        mobile: req?.body?.mobile,
      },
      { new: true }
    );
    res.json(updatedUser);
  } catch (error) {
    throw new Error(error);
  }
});

// block user

const blockUser = asyncHandler(async (req, res) => {
  console.log("blockUser middleware worked");
  const { id } = req.params;
  validateMongoDbId(id);

  try {
    const block = await User.findByIdAndUpdate(
      id,
      { isBlocked: true },
      { new: true }
    );
    res.json({ message: "User Blocked", block });
  } catch (error) {
    throw new Error(error);
  }
});

//unblock user

const unblockUser = asyncHandler(async (req, res) => {
  console.log("unblockUser middleware worked");
  const { id } = req.params;
  validateMongoDbId(id);

  try {
    const block = await User.findByIdAndUpdate(
      id,
      { isBlocked: false },
      { new: true }
    );
    res.json({ message: "User Unblocked" });
  } catch (error) {
    throw new Error(error);
  }
});

//logout function
const logout = asyncHandler(async (req, res) => {
  console.log("logout/userrController");

  const cookie = req.cookies;
  console.log("logout-cookie", cookie);

  if (!cookie?.refreshToken) throw new Error("No Refresh Token in Cookies");
  const refreshToken = cookie.refreshToken;
  const user = await User.findOne({ refreshToken });
  if (!user) {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
    });
    return res.sendStatus(204); // forbidden
  }
  await User.findOneAndUpdate(
    { refreshToken },
    {
      refreshToken: "",
    }
  );
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
  });
  res.sendStatus(204); // forbidden
});

//updatePassword

const updatePassword = asyncHandler(async (req, res) => {
  console.log("updatePassword/userCtrl");
  try {
    console.log("req.user:", req.user);
    console.log("req.body:", req.body);
    const { _id } = req.user;
    const { password } = req.body;
    console.log("password:", password);
    console.log("id:", _id);

    // validateMongoDbId(_id);
    const user = await User.findById(_id);
    console.log("user:", user);
    if (password) {
      user.password = password;
      const updatedPassword = await user.save();
      res.json(updatedPassword);
    } else {
      res.json(user);
    }
  } catch (error) {
    throw new Error(error);
  }
});

//forgotPasswordToken

const forgotPasswordToken = asyncHandler(async (req, res) => {
  console.log("forgotPasswordToken/userController");
  const { email } = req.body;
  console.log("email:", email);

  const user = await User.findOne({ email: email });
  console.log("user:", user);
  if (!user) throw new Error("User not found with this email");
  try {
    const token = await user.createPasswordResestToken();
    await user.save();

    const resetURL = `Hi, Please follow this link to reset Your Password. This link is valid till 10 minutes from now. <a href="http://localhost:5000/api/user/reset-password/${token}">Click Here</a>`;
    const data = {
      to: email,
      subject: "Forgot Password Link",
      text: "Hey User",
      htm: resetURL,
    };
    sendEmail(data);
    res.json(token);
  } catch (error) {
    throw new Error(error);
  }
});

//get wishlist

const getWishlist = asyncHandler(async (req, res) => {
  console.log("getWishlist/userController");

  const { _id } = req.user;
  try {
    const findUser = await User.findById(_id).populate("wishlist");

    res.json(findUser);
  } catch (error) {
    throw new Error(error);
  }
});

//save user Address

const saveAddress = asyncHandler(async (req, res, next) => {
  console.log("saveAddress/ userController");
  const { _id } = req.user;

  try {
    const updatedUser = await User.findByIdAndUpdate(
      _id,
      { address: req?.body?.address },
      { new: true }
    );
    res.json(updatedUser);
  } catch (error) {
    throw new Error(error);
  }
});

//userCart

const userCart = asyncHandler(async (req, res) => {
  console.log("userCart/UserController");

  const { cart } = req.body;
  const { _id } = req.user;
  try {
    let products = [];
    const user = await User.findById(_id);
    console.log("user::", user);

    //check if user already have product in cart

    const alreadyExistCart = await Cart.findOne({ orderby: user._id });
    if (alreadyExistCart) {
      alreadyExistCart.remove();
    }

    for (let i = 0; i < cart.length; i++) {
      let object = {};

      object.product = cart[i]._id;
      object.count = cart[i].count;
      object.color = cart[i].color;
      let getPrice = await Product.findById(cart[i]._id).select("price").exec();
      console.log("getPrice::", getPrice);
      object.price = getPrice.price;
      products.push(object);
    }

    let cartTotal = 0;
    for (let i = 0; i < products.length; i++) {
      cartTotal = cartTotal + products[i].price * products[i].count;
    }

    let newCart = await new Cart({
      products,
      cartTotal,
      orderby: user?._id,
    }).save();
    res.json(newCart);
  } catch (error) {
    throw new Error(error);
  }
});

//getUserCart

const getUserCart = asyncHandler(async (req, res) => {
  const { _id } = req.user;

  try {
    const cart = await Cart.findOne({ orderby: _id }).populate(
      "products.product"
    );

    res.json(cart);
  } catch (error) {
    throw new Error(error);
  }
});

//empty cart
const emptyCart = asyncHandler(async (req, res) => {
  console.log("emptyCart/userController");
  const { _id } = req.user;

  try {
    const user = await User.findOne({ _id });
    const cart = await Cart.findOneAndRemove({ orderby: user._id });
    res.json(cart);
  } catch (error) {
    throw new Error(error);
  }
});

//Apply Coupon

const applyCoupon = asyncHandler(async (req, res) => {
  const { coupon } = req.body;
  const { _id } = req.user;

  const validCoupon = await Coupon.findOne({ name: coupon });
  if (validCoupon === null) {
    throw new Error("Invalid Coupon");
  }

  const user = await User.findOne({ _id });
  let { products, cartTotal } = await Cart.findOne({
    orderby: user._id,
  }).populate("products.product");
  let totalAfterDiscount = (
    cartTotal -
    (cartTotal * validCoupon.discount) / 100
  ).toFixed(2);

  await Cart.findOneAndUpdate(
    { orderby: user._id },
    { totalAfterDiscount },
    { new: true }
  );
  res.json(totalAfterDiscount);
});

//////////////
const createOrder = asyncHandler(async (req, res) => {
  console.log("createOrder/userController");
  const { COD, couponApplied } = req.body;
  const { _id } = req.user;

  try {
    if (!COD) throw new Error("creating cash order failed");

    const user = await User.findById(_id);
    let userCart = await Cart.findOne({ orderby: user._id });
    let finalAmount = 0;
    if (couponApplied && userCart.totalAfterDiscount) {
      finalAmount = userCart.totalAfterDiscount;
    } else {
      finalAmount = userCart.cartTotal * 100;
    }

    let newOrder = await new Order({
      products: userCart.products,
      paymentIntent: {
        id: uniqid(),
        method: "COD",
        amount: finalAmount,
        status: "Cash on Delivery",
        created: Date.now(),
        currency: "usd",
      },
      orderby: user._id,
      orderStatus: "Cash on Delivery",
    }).save();

    let update = userCart.products.map((item) => {
      return {
        updateOne: {
          filter: { _id: item.product._id },
          update: { $inc: { quantity: -item.count, sold: +item.count } },
        },
      };
    });
    const updated = await Product.bulkWrite(update, {});
    res.json({ message: "success" });
  } catch (error) {
    throw new Error(error);
  }
});

// get orders

const getOrders = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  try {
    const userorders = await Order.findOne({ orderby: _id })
      .populate("products.product")
      .exec();

    res.json(userorders);
  } catch (error) {
    throw new Error(error);
  }
});

// update order status

const updateOrderStatus = asyncHandler(async (req, res) => {
  console.log("updateOrderStatus/userController");
  const { status } = req.body;
  const { id } = req.params;
  try {
    const updatedStatus = await Order.findByIdAndUpdate(
      id,
      {
        orderStatus: status,
        paymentIntent: {
          status: status,
        },
      },
      {
        new: true,
      }
    );
    res.json(updatedStatus);
  } catch (error) {
    throw new Error(error);
  }
});
module.exports = {
  createUser,
  loginUserController,
  getAllUser,
  deleteUser,
  getOneUser,
  updateUser,
  blockUser,
  unblockUser,
  handleRefreshToken,
  logout,
  updatePassword,
  forgotPasswordToken,
  loginAdminController,
  getWishlist,
  saveAddress,
  userCart,
  getUserCart,
  emptyCart,
  applyCoupon,
  createOrder,
  getOrders,
  updateOrderStatus,
};
