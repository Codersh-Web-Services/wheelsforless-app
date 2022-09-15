import express from "express";
import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();
import { client } from "./db/connection.js";
import axios from "axios";
import axiosThrottle from 'axios-request-throttle'
import https from "https";
axiosThrottle.use(axios, { requestsPerSecond: 0.5 });

client.connect(async (err) => {
  let collection = client.db("WheelPros_data").collection("auth");
  // perform actions on the collection object
  var TokenFromDB = await collection.find({ _id: 1 }).toArray();
  var { accessToken: token, time: lastFetchedAuth } = TokenFromDB[0];


  // Fetch the auth token if the last fetched token is more than 59 minutes ago


  const authFetch = async () => {

    let authCollection = client.db("WheelPros_data").collection("auth");
    TokenFromDB = await authCollection.find({ _id: 1 }).toArray();
    ({ accessToken: token, time: lastFetchedAuth } = TokenFromDB[0])
    console.log(new Date().getTime() / 1000 - lastFetchedAuth)
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
          console.log(await collection.updateOne(
            { _id: 1 },
            {
              $set: {
                accessToken,
                time: new Date().getTime() / 1000,
                Date: new Date(),
              },
            }
          ));

          TokenFromDB = await authCollection.find({ _id: 1 }).toArray();
          ({ accessToken: token, time: lastFetchedAuth } = TokenFromDB[0])

          console.log("------------------Auth Updated------------------");

        })
        .catch((err) => {
          console.log("AXIOS ERROR: ", err);
        });
    } else {
      console.log("------------------Auth Granted------------------");
    }

  }

  // updates the auth token when it expires 
  // authFetch()
  // Fetches Wheelpros vehicle years
  collection = client.db("WheelPros_data").collection("wheelsDB");
  var yearsFromDB = await collection.find({ parent: null }).toArray();

  // if (false)
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
          yearArr.push({
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
      .then(async function () {
        // always executed
        yearsFromDB = await collection.find({ parent: null }).toArray();
        console.log(yearsFromDB.length)
      });


  } else {
    console.log("no need to update years");
  }
  yearsFromDB = await collection.find({ parent: null }).toArray();
  console.log("years", yearsFromDB.length)
  if (false)
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
          authFetch()
        })
        .catch(function (error) {
          // handle error
          console.log(error);

        })
        .then(function () {
          // always executed
        });
    });
  // Fetches Wheelpros vehicle makes
  const makeDataFromDB = await collection
    .find({ makeData: { $exists: true } })
    .toArray();
  // const makeDataFromDB = await collection
  // .distinct( "modelData" )
  console.log("make data bois", makeDataFromDB.length)

  //  console.log(submodelsData)

  // if (false)
  makeDataFromDB.forEach(async (make, i) => {
    // console.log(`Working on Makes Array to populate models :  ${i} of ${makeDataFromDB.length}`);
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

          console.clear();
          console.log(`Staging push of models to db : ${index} of  ${models.length}`)
        });
        await collection.insertMany(modelArr);
        authFetch()

      })
      .catch(function (error) {
        // handle error
        console.log(error);
        // authFetch()

      })
      .then(function () {
        // always executed
      })


  });
  console.log("Got all the models")

  const modelDataFromDB = await collection
    .find({ modelData: { $exists: true } })
    .toArray();
  console.log(modelDataFromDB.length)

  // authFetch()

  // if (false)

  modelDataFromDB.forEach(async (modeldata) => {
    // await fetchToken().catch(console.error)

    let dataSearch = modeldata.modelData.split(';')

    await axios
      .get(
        `https://api.wheelpros.com/vehicles/v1/years/${dataSearch[0]}/makes/${dataSearch[1]}/models/${dataSearch[2]}/submodels`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )
      .then(async function ({ data }) {

        await collection.updateOne(
          { modelData: modeldata.modelData },
          {
            $set: {
              submodels: data
            },
          }
        );
        // handle success
        console.log(`pushing the submodels ${data} to ${modeldata.modelData} `)
        authFetch()



      })
      .catch(async function (error) {
        // handle error
        console.log(error);
        // authFetch()

      })

  })

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