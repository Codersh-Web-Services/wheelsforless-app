import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();
import { client } from "./db/connection.js";
import axios from "axios";
import axiosThrottle from 'axios-request-throttle'
import https from "https";
axiosThrottle.use(axios, { requestsPerSecond: 2 });

client.connect(async (err) => {
  let collection = client.db("WheelPros_data").collection("auth");
  // perform actions on the collection object
  var TokenFromDB = await collection.find({ _id: 1 }).toArray();
  var { accessToken: token, time: lastFetchedAuth } = TokenFromDB[0] || [{ accessToken: null, time: 0 }];

  // console.log("ourside token var = ", token)
  // Fetch the auth token if the last fetched token is more than 59 minutes ago

  const authFetch = async () => {

    let authCollection = client.db("WheelPros_data").collection("auth");
    TokenFromDB = await authCollection.find({ _id: 1 }).toArray();
    ({ accessToken: token, time: lastFetchedAuth } = TokenFromDB[0] || [{ accessToken: null, time: 0 }])
    // console.log(new Date().getTime() / 1000 - lastFetchedAuth)

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
        authCollection.updateOne(
          { _id: 1 },
          {
            $set: {
              accessToken: accessToken,
              time: new Date().getTime() / 1000,
              Date: new Date(),
            },
          }, {
          upsert: true
        }
        );
        token = await accessToken

        console.log("------------------Auth Updated------------------");

      })
      .catch((err) => {
        console.log("AXIOS ERROR: ", err);
      });
  }
  // await authFetch()
  // console.log("ourside token var = ", token)

  // setInterval(authFetch, 3590000)


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
      .catch(function ({ response }) {
        // handle error
        console.log(response.status);
      })
      .then(async function () {
        // always executed
        yearsFromDB = await collection.find({ parent: null }).toArray();
        console.log(yearsFromDB.length)
      });


  } else {
    console.log("no need to update years");
  }
  console.log("years", yearsFromDB.length)
  // if (false)
  const fetchMakes = async () => {
    yearsFromDB = await collection.find({ parent: null }).toArray();
    for (let [index, year] of yearsFromDB.entries()) {

      console.log(`Getting makes:  ${index} of ${yearsFromDB.length}`);
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
          console.log(`pushing makes ${index} of year/s ${yearsFromDB.length}`)

        })
        .catch(function ({ response }) {
          // handle error


          console.log(response.status);

        })
        .then(function () {
          // always executed
        });
    };
  }
  // await fetchMakes()
  // Fetches Wheelpros vehicle makes
  const fetchModels = async () => {

    var makeDataFromDB = await collection
      .find({ makeData: { $exists: true } })
      .toArray();
    // const makeDataFromDB = await collection
    // .distinct( "modelData" )
    console.log("make data bois", makeDataFromDB.length)

    //  console.log(submodelsData)

    // if (false)
    for (let [i, make] of makeDataFromDB.entries()) {
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
            console.log(`Staging push of models to db : ${index} of  ${models.length}`);
          });
          console.log(`working on models ${i} of makes ${makeDataFromDB.length}`);
          await collection.insertMany(modelArr);

        })
        .catch(function ({ response }) {
          // handle error
          console.log(response.status);


        })
        .then(function () {
          // always executed
        });


    };
    console.log("Got all the models")

  }
  //  fetchModels()
  // if (false)


  const fetchSubmodels = async () => {
    const modelDataFromDB = await collection
      .find({ modelData: { $exists: true } })
      .toArray();
    console.log(modelDataFromDB.length)
    for (var modeldata of modelDataFromDB) {
      // await fetchToken().catch(console.error)

      let dataSearch = modeldata.modelData.split(';')

      await axios
        .get(
          `${process.env.PROD_API_URL}/vehicles/v1/years/${dataSearch[0]}/makes/${encodeURIComponent(dataSearch[1])}/models/${encodeURIComponent(dataSearch[2])}/submodels`,
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

        })
        .catch(async function (error) {
          // handle error
          console.log(error);

        })

    }
  }
  // await fetchSubmodels()

  // await  client.close();

  // Fetches Wheelpros vehicle Skus

  const getSkus = async () => {
    const submodelDataFromDB = await collection
      .find({ submodels: { $exists: true } })
      .toArray();
    console.log(submodelDataFromDB.length)
    let wheelsProSkuCollection = client.db("WheelPros_data").collection("wheelProsSkuCollection");
    for (let submodelData of submodelDataFromDB) {
      let dataSearch = submodelData.modelData.split(';')

      if (submodelData.submodels.length > 0) {

        for (let submodelname of submodelData.submodels) {
          const fetchSkusBasesOnSubmodels = async (offset = 0) => {
            await axios
              .get(
                `${process.env.PROD_API_URL}/products/v1/search/wheel/?vehicleYear=${dataSearch[0]}&vehicleMake=${encodeURIComponent(dataSearch[1])}&vehicleModel=${encodeURIComponent(dataSearch[2])}&vehicleSubModel=${encodeURIComponent(submodelname)}&pageSize=1000&offSet=${offset}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                }
              )
              .then(async function ({ data }) {

                let SkuArr = []
                for (var skuData of data.results) {
                  let { sku } = skuData
                  SkuArr.push({ sku, filterData: `${submodelData.modelData};${submodelname}` })
                }
                if (SkuArr.length > 0) {
                  const result = await wheelsProSkuCollection.insertMany(

                    SkuArr

                  );

                  console.log(result.acknowledged, `for ${submodelData.modelData};${submodelname}`)
                }
                // console.dir(SkuArr, { 'maxArrayLength': null })
                console.log(data.totalCount)
                await wheelsProSkuCollection.insertOne({ totalCount: data.totalCount, FilterQuery: submodelData.modelData })
                // console.log(`${data}`)
                if (offset + 1000 < data.totalCount) {
                  await fetchSkusBasesOnSubmodels(offset + 1000)
                }
                // handle success
                console.log(`${data}`)

              })
              .catch(async function (error) {
                // handle error
                console.log(error);

              })
          }
          await fetchSkusBasesOnSubmodels()
        }
      } else {
        // console.log(`${process.env.PROD_API_URL}/products/v1/search/wheel?vehicleYear=${dataSearch[0]}&vehicleMake=${dataSearch[1]}&vehicleModel=${dataSearch[2]}`)
        // if (false)
        const fetchSkuBasedOnModels = async (offset = 0) => {
          await axios
            .get(
              `${process.env.PROD_API_URL}/products/v1/search/wheel?vehicleYear=${dataSearch[0]}&vehicleMake=${encodeURIComponent(dataSearch[1])}&vehicleModel=${encodeURIComponent(dataSearch[2])}&pageSize=1000&offSet=${offset}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              }
            )
            .then(async function ({ data }) {

              // handle success

              let SkuArr = []
              for (var skuData of data.results) {
                let { sku } = skuData
                SkuArr.push({ sku, filterData: submodelData.modelData })
              }
              if (SkuArr.length > 0) {
                const result = await wheelsProSkuCollection.insertMany(

                  SkuArr

                );
                console.log(result.acknowledged, `for ${submodelData.modelData}`)

              }
              // console.dir(SkuArr, { 'maxArrayLength': null })
              console.log(data.totalCount)
              await wheelsProSkuCollection.insertOne({ totalCount: data.totalCount, FilterQuery: submodelData.modelData })
              // console.log(`${data}`)
              if (offset + 1000 < data.totalCount) {
                await fetchSkuBasedOnModels(offset + 1000)
              }

            })
            .catch(async function (error) {
              // handle error
              console.log(error);

            })
        }
        await fetchSkuBasedOnModels()

      }
    }
  }


  // await fetchMakes()
  // await fetchModels()
  // await fetchSubmodels()
  // await getSkus()
  console.log("Database building is done!")
  clearInterval(authFetch)


  // Updates to the datastore of wheelsforless



  let wheelsforlesscol = client.db("WheelPros_data").collection("wheelforless_backup");
  let wheelsforlessdatastore = await wheelsforlesscol.find({}).toArray()

  // wheelpros store 
  let wheelprocol = client.db("WheelPros_data").collection("wheelProsSkuCollection");
  let wheelprosdatastore = await wheelprocol.find({}).toArray()

  console.log(wheelprosdatastore)

  // for (let { sku: wheelSku, filter: wheelFiler } of wheelsforlessdatastore) {
  //   console.log(wheelSku)
  // }
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
          fetch3dcart();
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
  // fetch3dcart();
  console.log("Shift4Shop is done")
});
