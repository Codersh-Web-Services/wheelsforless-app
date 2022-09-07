import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();

// // console.log(process.env);
import { MongoClient, ServerApiVersion } from "mongodb";
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.lf0jk.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
client.connect(async (err) => {
  const collection = client.db("Cluster0").collection("usermodels");
  // perform actions on the collection object
  const findResult = await collection.find({}).toArray();
  console.log("Found documents =>", findResult);
  client.close();
});
var _db;
