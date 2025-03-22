const {model} = require("mongoose");
const User = require("./../db/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

async function registerUser(model) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(model.password, saltRounds);

    let user = new User({
        name: model.name,
        email: model.email,
        password: hashedPassword,
        isAdmin: model.isAdmin,
        dob: model.dob,
        gender: model.gender,
        phone: model.phone,
    });
    await user.save();
    return user.toObject();
}

async function loginUser(email, password) {
    console.log(email, password);
    const user = await User.findOne({ email });
    if (!user) {
        return { error: "User not found" };
    }
    
    console.log(user, password, user.password);
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (isValidPassword) {
        const token = jwt.sign({
            id: user._id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
        }, "secret", {
            expiresIn: "1h"
        });
        return {token, user};
    } else {
        return { error: "Invalid password" };
    }

}

async function getUser() {
    let user = await User.find();
    return user.map((c) => c.toObject());
}

async function getUserById(id) {
    let user = await User.findById(id);
    return User.toObject();
}

async function updateUser(id, model) {
    await User.findOneAndUpdate({ _id: id }, model);
    return;
}

async function deleteUser(id) {
    await User.findByIdAndDelete(id);
    return;
}

module.exports = { registerUser, loginUser };
