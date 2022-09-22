import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();
import { MongoClient, ServerApiVersion } from "mongodb";
// const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.lf0jk.mongodb.net/?retryWrites=true&w=majority`;
const uri = 'mongodb://127.0.0.1:27017'

export const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  connectTimeoutMS: 30000, keepAlive: true
});
