const express = require('express')
const app = express()
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion,ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rf9a5.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri)
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        await client.connect();
        const itemCollection = client.db("Manufacture").collection("items");
        const userCollection = client.db("Manufacture").collection("users");
        // console.log(itemCollection)

        // all Users
        app.get('/user', async(req,res)=>{
          const users = await userCollection.find().toArray();
          res.send(users);
        })

        // user Save
        app.put('/user/:email', async(req, res) => {
          const email = req.params.email;
          const user = req.body;
          const filter = {email: email};
          const options = {upsert: true};
          const updateDoc ={
            $set:user,
          };
          const result = await userCollection.updateOne(filter, updateDoc, options);
          const token =jwt.sign({email:email}, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
          res.send({result, token});
        })

        // get items
        app.get('/manufacture', async(req, res) =>{
            const query = {};
            const cursor = itemCollection.find(query);
            const items = await cursor.toArray();
            console.log(items)
            res.send(items);
        })

        // get SingleItem
        app.get('/manufacture/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(id);
            const query = { _id: ObjectId(id) };
            const singleItem = await itemCollection.findOne(query);
            // console.log(query, singleItem)
            res.send(singleItem);
        });

        // Item Update
        app.put('/manufacture/:id', async(req,res) =>{
          const id = req.params.id;
          const updatedItem = req.body;
          // console.log(updatedItem)
          const filter = {_id: ObjectId(id)};
          const options = {upsert: true};
          const updatedInfo = {
              $set: {
                  quantity: updatedItem.quantity,
              }
          };
          const updatedResult = await itemCollection.updateOne(filter, updatedInfo, options);
          res.send(updatedResult);
      })


    }
    finally{

    }

}

run().catch(console.dir());

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})