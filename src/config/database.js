import mongoose from "mongoose";

const connectdb = async () => {
  await mongoose
    .connect(process.env.DB_URI, {
      dbName: "labour_management_system",
    })
    .then((data) => {
      console.log("Host : ", data.connections[0].host, "Name : ", data.connections[0].name, "Port : ", data.connections[0].port);

      console.log("DB Connection Successfull")
    })
    .catch((error) => {
      console.log("error in database connection : ", error);
    });
};

export default connectdb;
