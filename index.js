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
        // console.log(itemCollection)

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
            console.log(query, singleItem)
            res.send(singleItem);
        });


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