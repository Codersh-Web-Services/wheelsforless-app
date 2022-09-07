import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();
import express from "express";
// console.log(process.env);

const app = express();

import axios from "axios";

axios
  .post(
    "https://httpbin.org/post",
    { x: 1 },
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  )
  .then(({ data }) => console.log(data));

// express routes
app.get("/", (req, res) => {
  res.send("hello from express");
});

app.listen(3000, () => {
  console.log("listening to 3000");
});
