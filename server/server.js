import express from "express";
import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();
// console.log(process.env);
import { MongoClient, ServerApiVersion } from "mongodb";
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.lf0jk.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
client.connect(async (err) => {
  const collection = client.db("WheelPros_data").collection("wheels");
  // perform actions on the collection object
  const findResult = await collection.find({}).toArray();
  console.log("Found documents =>", findResult);
  client.close();
});

import axios from "axios";
console.log(process.env.STORE_API_URL);

// Fetches Wheelpros vehicle years
// axios
//   .get(`${process.env.PROD_API_URL}/years`, {
//     headers: {
//       Authorization: `Bearer ${process.env.WHEELPROS_TOKEN}`,
//       "Content-Type": "application/json",
//     },
//   })
//   .then(function ({ data }) {
//     // handle success
//     let years = data;
//     console.log(years);
//   })
//   .catch(function (error) {
//     // handle error
//     console.log(error);
//   })
//   .then(function () {
//     // always executed
//   });

// Fetches Wheelpros vehicle makes
// axios
//   .get(`${process.env.PROD_API_URL}/years/${year}/makes`, {
//     headers: {
//       Authorization: `Bearer ${process.env.WHEELPROS_TOKEN}`,
//       "Content-Type": "application/json",
//     },
//   })
//   .then(function ({ data }) {
//     // handle success
//     let years = data;
//     console.log(years);
//   })
//   .catch(function (error) {
//     // handle error
//     console.log(error);
//   })
//   .then(function () {
//     // always executed
//   });

// Fetches Wheelpros vehicle models
// axios
//   .get(`${process.env.PROD_API_URL}/years/${year}/makes/${make}/models`, {
//     headers: {
//       Authorization: `Bearer ${process.env.WHEELPROS_TOKEN}`,
//       "Content-Type": "application/json",
//     },
//   })
//   .then(function ({ data }) {
//     // handle success
//     let years = data;
//     console.log(years);
//   })
//   .catch(function (error) {
//     // handle error
//     console.log(error);
//   })
//   .then(function () {
//     // always executed
//   });

// Fetches Wheelpros vehicle submodels
// axios
//   .get(
//     `${process.env.PROD_API_URL}/years/${year}/makes/${make}/models/${submodel}/`,
//     {
//       headers: {
//         Authorization: `Bearer ${process.env.WHEELPROS_TOKEN}`,
//         "Content-Type": "application/json",
//       },
//     }
//   )
//   .then(function ({ data }) {
//     // handle success
//     let years = data;
//     console.log(years);
//   })
//   .catch(function (error) {
//     // handle error
//     console.log(error);
//   })
//   .then(function () {
//     // always executed
//   });

// Fetches Wheelpros filtered Wheels
// axios
//   .get(
//     `${process.env.PROD_API_URL}https://api.wheelpros.com/products/v1/search/wheel?years=${year}&makes=${make}&=models`,
//     {
//       headers: {
//         Authorization: `Bearer ${process.env.WHEELPROS_TOKEN}`,
//         "Content-Type": "application/json",
//       },
//     }
//   )
//   .then(function ({ data }) {
//     // handle success
//     let years = data;
//     console.log(years);
//   })
//   .catch(function (error) {
//     // handle error
//     console.log(error);
//   })
//   .then(function () {
//     // always executed
//   });

// Fetches Shift4Shop store products
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
    // console.log(filterfield);
  })
  .catch(function (error) {
    // handle error
    console.log(error);
  })
  .then(function () {
    // always executed
  });
