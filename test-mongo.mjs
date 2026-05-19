import mongoose from "mongoose";

const uri=process.env.MONGODB_URI || "mongodb+srv://shlomi:pass123@cluster0.abcd123.mongodb.net/zimmerpro?retryWrites=true&w=majority";

try{
  await mongoose.connect(uri,{serverSelectionTimeoutMS:8000});
  console.log("CONNECTED");
  await mongoose.disconnect();
  process.exit(0);
}catch(e){
  console.log("FAILED:",e.message);
  process.exit(1);
}
JS