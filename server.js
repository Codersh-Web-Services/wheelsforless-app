import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();
import express from "express";
// console.log(process.env);

const app = express();

import axios from "axios";
console.log(process.env.STORE_API_URL);
axios
  .get(`${process.env.STORE_API_URL}/products?limit=1`, {
    headers: {
      "Content-Type": "application/json",
      SecureURL: process.env.STORE_URL,
      PrivateKey: process.env.PRIVATE_KEY,
      Token: process.env.AUTH_TOKEN,
    },
  })
  .then(function ({ data }) {
    // handle success
    const { ExtraField10: filterfield } = data[0];
    console.log(filterfield);
  })
  .catch(function (error) {
    // handle error
    console.log(error);
  })
  .then(function () {
    // always executed
  });

// express routes
app.get("/", (req, res) => {
  res.send("hello from express");
});

app.listen(3000, () => {
  console.log("listening to 3000");
});
