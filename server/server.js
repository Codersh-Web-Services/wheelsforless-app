import express from "express";
import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();
import { client } from "./db/connection.js";
import axios from "axios";
import axiosThrottle from 'axios-request-throttle'
import https from "https";
axiosThrottle.use(axios, { requestsPerSecond: 1 });

client.connect(async (err) => {
  let collection = client.db("WheelPros_data").collection("auth");
  // perform actions on the collection object
  const TokenFromDB = await collection.find({ _id: 1 }).toArray();

  let { accessToken: token, time: lastFetchedAuth } = TokenFromDB[0];
  // var { token, time: lastFetchedAuth } = TokenFromDB;
  // Fetch the auth token if the last fetched token is more than 59 minutes ago
  if (new Date().getTime() / 1000 - lastFetchedAuth >= 3600) {
    let axiosConfig = {
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
    };

    await axios({
      method: "POST",
      data: {
        userName: process.env.WHEELPROS_USERNAME,
        password: process.env.PASSWORD,
      },
      url: `${process.env.PROD_API_URL}/auth/v1/authorize`,
      axiosConfig,
    })
      .then(async (res) => {
        const { accessToken } = res.data;
        await collection.updateOne(
          { _id: 1 },
          {
            $set: {
              accessToken,
              time: new Date().getTime() / 1000,
            },
          }
        );
        // console.log("RESPONSE RECEIVED: ", res);
      })
      .catch((err) => {
        console.log("AXIOS ERROR: ", err);
      });
  } else {
    console.log("No need for auth fetch");
  }

  // Fetches Wheelpros vehicle years
  collection = client.db("WheelPros_data").collection("wheelsDB");
  let yearsFromDB = await collection.find({ parent: null }).toArray();
  if (yearsFromDB.length != 91) {
    await axios
      .get(`${process.env.PROD_API_URL}/vehicles/v1/years`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      .then(async function ({ data }) {
        // handle success
        let years = data;
        // console.log(years);
        const yearArr = [];
        years.forEach(async (year, index) => {
          await yearArr.push({
            year,
            parent: null,
          });
        });
        await collection.insertMany(yearArr);
      })
      .catch(function (error) {
        // handle error
        console.log(error);
      })
      .then(function () {
        // always executed
      });

    yearsFromDB.forEach(async (year, i) => {

       console.log(`Getting makes:  ${i} of ${yearsFromDB.length}`);
      await axios
        .get(
          `${process.env.PROD_API_URL}/vehicles/v1/years/${year.year}/makes`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        )
        .then(async function ({ data }) {
          // handle success
          let makes = data;

          const makeArr = [];
          makes.forEach((make, index) => {
            makeArr.push({
              make,
              parent: year.year,
              makeData: `${year.year};${make}`,
            });
          });
          await collection.insertMany(makeArr);
        })
        .catch(function (error) {
          // handle error
          console.log(error);
        })
        .then(function () {
          // always executed
        });
    });
   
  } else {
    console.log("no need to update years");
  }
 // Fetches Wheelpros vehicle makes
 const makeDataFromDB = await collection
 .find({ makeData: { $exists: true } })
 .toArray();
//  console.log(makeDataFromDB)

const sleep = (delay) => {
  return new Promise(function(resolve) {
    setTimeout(resolve, delay);
  });
}
// if (false) 
makeDataFromDB.forEach( async (make, i) => {
 console.log(`Working on Makes Array to populate models :  ${i} of ${makeDataFromDB.length}`);
    await axios.get(
      `${process.env.PROD_API_URL}/vehicles/v1/years/${make.parent}/makes/${make.make}/models`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    )
    .then(async function ({ data }) {
      // handle success
      let models = data;
      const modelArr = [];
      models.forEach((model, index) => {
        modelArr.push({
          model,
          parent: make.parent,
          modelData: `${make.parent};${make.make};${model}`,
        });
      

        console.log(`Staging push of models to db : ${index} of  ${models.length}`)
      });
      await collection.insertMany(modelArr);
    })
    .catch(function (error) {
      // handle error
      console.log(error);
    })
    .then(function () {
      // always executed
    })
    
   
});
console.log("Got all the models")

  // await  client.close();

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

  if (false) {
  // Fetches Shift4Shop store products
  collection = client.db("WheelPros_data").collection("wheelforless_backup");
  var offset = 0;

  const fetch3dcart = () => {
    try {
      const agent = new https.Agent({
        rejectUnauthorized: false,
      });

      axios
        .get(
          `${process.env.STORE_API_URL}/products?limit=200&offset=${offset}`,

          {
            httpsAgent: agent,
            headers: {
              "Content-Type": "application/json",
              SecureURL: process.env.STORE_URL,
              PrivateKey: process.env.PRIVATE_KEY,
              Token: process.env.AUTH_TOKEN,
            },
          }
        )
        .then(async function ({ data }) {
          // handle success
          offset += 200;
          console.log(offset);
          // const { ExtraField10: filterfield } = data[0];
          let DataArr = [];
          data.forEach((e) => {
            DataArr.push({ sku: e.SKUInfo.SKU, filter: e.ExtraField10 });
          });
          await collection.insertMany(DataArr);
          await fetch3dcart();
        })
        .catch(function (error) {
          // handle error
          console.log(error);
          return;
        })
        .then(function () {
          // always executed
        });
    } catch (error) {
      console.log(error);
    }
  };
  fetch3dcart();
}
});