const express = require('express')
const app = express()
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion,ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rf9a5.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'UnAuthorized access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' })
    }
    req.decoded = decoded;
    next();
  });
}

async function run(){
    try{
        await client.connect();
        const itemCollection = client.db("Manufacture").collection("items");
        const purchaseCollection = client.db("Manufacture").collection("purchases");
        const userCollection = client.db("Manufacture").collection("users");
        const reviewCollection = client.db("Manufacture").collection("review");

        const verifyAdmin = async (req, res,next) =>{
          const initiator = req.decoded.email;
          const initiatorAccount = await userCollection.findOne({email:initiator});
          if(initiatorAccount.role === 'admin'){
            next()
          }
          else{
            res.status(403).send({message:'forbidden Acces'});
          } 
        }
        
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
          const token =jwt.sign({email:email}, process.env.ACCESS_TOKEN_SECRET)
          res.send({result, token});
        });

        // Admin User
        app.put('/user/admin/:email',verifyJWT,verifyAdmin, async(req, res) => {
          const email = req.params.email;
            const filter = {email: email};
            const updateDoc ={
              $set:{role:'admin'},
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);         
        });

        // get user
        app.get('/user', verifyJWT, async (req, res) => {
          const users = await userCollection.find().toArray();
          res.send(users);
        });


        // Admin
        app.get('/admin/:email', async(req, res) =>{
          const email = req.params.email;
          const user = await userCollection.findOne({email: email});
          const isAdmin = user.role === 'admin';
          res.send({admin: isAdmin})
        })

        // get items
        app.get('/manufacture', async(req, res) =>{
            const query = {};
            const cursor = itemCollection.find(query);
            const items = await cursor.toArray();
            res.send(items);
        })
        // get items
        app.get('/products',verifyJWT,verifyAdmin, async(req, res) =>{
            const query = {};
            const cursor = itemCollection.find(query);
            const items = await cursor.toArray();
            res.send(items);
        })
        // post items
        app.post('/items', verifyJWT, async(req, res) =>{
          const product = req.body;
          const query = { price: product.price, name: product.name, email: product.userEmail, minimum_quantity: product.minimum_quantity, phone: product.phone, address: product.address }
          const exists = await itemCollection.findOne(query);
          if (exists) {
            return res.send({ success: false, product: exists })
          }
          const result = await itemCollection.insertOne(product);
          // console.log('sending email');
          return res.send({ success: true, result });
        })

        // Product Deleted
        app.delete('/products/:email', verifyJWT,verifyAdmin, async(req, res) =>{
          const email = req.params.email;
          const query = {email: email};
          const result = await itemCollection.deleteOne(query);
          res.send(result);
        })

        // get SingleItem
        app.get('/manufacture/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const singleItem = await itemCollection.findOne(query);
            res.send(singleItem);
        });

        // Item Update
        app.put('/manufacture/:id', async(req,res) =>{
          const id = req.params.id;
          const updatedItem = req.body;
          const filter = {_id: ObjectId(id)};
          const options = {upsert: true};
          const updatedInfo = {
              $set: {
                  quantity: updatedItem.quantity,
              }
          };
          const updatedResult = await itemCollection.updateOne(filter, updatedInfo, options);
          res.send(updatedResult);
      });


      // purchased
      app.post('/purchase', async (req, res) => {
        const purchase = req.body;
        const query = { purchase: purchase.purchase, quantity: purchase.quantity, email: purchase.userEmail, name: purchase.userName, phone: purchase.phone_number, address: purchase.present_address }
        const exists = await purchaseCollection.findOne(query);
        if (exists) {
          return res.send({ success: false, purchase: exists })
        }
        const result = await purchaseCollection.insertOne(purchase);
        console.log('sending email');
        return res.send({ success: true, result });
      });

      // Show Purchase Product
      app.get('/purchase', async (req, res) => {
        const query = {};
        console.log(query)
        const purchases = await purchaseCollection.find(query).toArray();
        res.send(purchases);
      });

      app.get('/purchase/:id', verifyJWT,  async(req, res) =>{
        const id =req.params.id;
        const query = {_id: ObjectId(id)};
        const purchases = await purchaseCollection.findOne(query);
        res.send(purchases);
      })

      // Show All Purchase Product
      app.get('/order',verifyJWT, verifyAdmin, async (req, res) => {
        const query = {}
        const purchases = await purchaseCollection.find(query).toArray();
        res.send(purchases);
      });


      // Delete Purchase Product
      app.delete('/purchase/:email', async (req, res) => {
          const email = req.params.email;
          console.log(email)
          const query = {userEmail: email};
          const result = await purchaseCollection.deleteOne(query);
          res.send(result);
      });

      // post reviews
      app.post('/reviews', verifyJWT, async(req, res) =>{
        const review = req.body;
        const query = { name: review.name,description: review.description, rating: review.rating }
        const exists = await reviewCollection.findOne(query);
        if (exists) {
          return res.send({ success: false, product: exists })
        }
        const result = await reviewCollection.insertOne(review);
        return res.send({ success: true, result });
      })

      // Show Review
      app.get('/reviews', verifyJWT, async (req, res) => {
        const query = {};
        const purchases = await reviewCollection.find(query).toArray();
        res.send(purchases);
      });


      // stripe Payment
      app.post('/create-payment-intent',verifyJWT, async(req,res)=>{
        const order =req.body;
        const price = order.price;
        const amount = price*100;
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: 'usd',
          payment_method_types:['card']
        });
        console.log(paymentIntent)
        res.send({clientSecret: paymentIntent.client_secret})
      })


    }
    finally{

    }

}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})