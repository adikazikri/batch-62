// const express = require("express");
import express from "express";
const app = express();
const port = 3000;

app.set('view engine', 'hbs');
app.set("views", "src/views");

app.use("/assets", express.static("src/assets"))
// req => dari client(frontend) ke server(backend)
// res => dari server(backend) ke client(frontend)
app.get("/contact", (req, res) => {
    const phoneNumber = 84235345734;
    res.render("contact", { phoneNumber });
});

// app.get("/home", (req, res) => {
//     res.render("index")
// });
// app.get ini sama kaya yg dibawah, cara penulisan yg dibawah dibikin dalam bentuk function terpisah

app.get("/home", home);

function home(req, res) {
    res.render("index");
}

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});