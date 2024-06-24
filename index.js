const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

const corsOptions = {
  origin: ['https://assignment12-bf39b.firebaseapp.com', 'https://assignment12-bf39b.web.app', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  optionSuccessStatus: 200,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mufx5zx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const userCollection = client.db('diagnosticCenterDb').collection('users');
    const testCollection = client.db('diagnosticCenterDb').collection('tests');
    const doctorCollection = client
      .db('diagnosticCenterDb')
      .collection('doctors');
    const reservationCollection = client
      .db('diagnosticCenterDb')
      .collection('reservations');
    const bannerCollection = client
      .db('diagnosticCenterDb')
      .collection('banners');

    // JWT API
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h',
      });
      res.send({ token });
    });

    // Middleware to verify token
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'Forbidden access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'Forbidden access' });
        }
        req.decoded = decoded;
        next();
      });
    };

    // Middleware to verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const user = await userCollection.findOne({ email });
      if (user?.role !== 'admin') {
        return res.status(403).send({ message: 'Forbidden access' });
      }
      next();
    };

    // // User APIs
    // app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
    //   const users = await userCollection.find().toArray();
    //   res.send(users);
    // });

    // Get all users
    app.get('/users', async (req, res) => {
      try {
        const users = await userCollection.find().toArray();
        res.send(users);
      } catch (error) {
        res.status(500).send({ error: 'Failed to fetch users' });
      }
    });

    // Get a single user by ID
    app.get('/users/:id', async (req, res) => {
      const { id } = req.params;
      try {
        const user = await userCollection.findOne({ _id: new ObjectId(id) });
        if (!user) {
          return res.status(404).send({ error: 'User not found' });
        }
        res.send(user);
      } catch (error) {
        res.status(500).send({ error: 'Failed to fetch user' });
      }
    });

    // Get a user by email
    app.get('/users/email/:email', async (req, res) => {
      const { email } = req.params;
      try {
        const user = await userCollection.findOne({ email });
        if (!user) {
          return res.status(404).send({ error: 'User not found' });
        }
        res.send(user);
      } catch (error) {
        res.status(500).send({ error: 'Failed to fetch user' });
      }
    });

    // Create a new user
    app.post('/users', async (req, res) => {
      const user = req.body;
      try {
        const existingUser = await userCollection.findOne({
          email: user.email,
        });
        if (existingUser) {
          return res.send({ message: 'User already exists' });
        }
        const result = await userCollection.insertOne(user);
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: 'Failed to create user' });
      }
    });

    // Update user data
    app.put('/users/:email', async (req, res) => {
      const { email } = req.params;
      const updatedData = req.body;
      try {
        const result = await userCollection.updateOne(
          { email },
          { $set: updatedData }
        );
        if (result.modifiedCount > 0) {
          const updatedUser = await userCollection.findOne({ email });
          res.send(updatedUser);
        } else {
          res
            .status(404)
            .send({ message: 'User not found or no change in data' });
        }
      } catch (error) {
        res.status(500).send({ error: 'Failed to update user' });
      }
    });

    // Update user status
    app.patch('/users/:id/status', async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;
      try {
        await userCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status } }
        );
        res.send({ message: 'User status updated successfully' });
      } catch (error) {
        res.status(500).send({ error: 'Failed to update user status' });
      }
    });

    // Delete a user
    app.delete('/users/:id', async (req, res) => {
      const { id } = req.params;
      try {
        await userCollection.deleteOne({ _id: new ObjectId(id) });
        res.send({ message: 'User deleted successfully' });
      } catch (error) {
        res.status(500).send({ error: 'Failed to delete user' });
      }
    });

    // app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
    //   const id = req.params.id;
    //   const result = await userCollection.deleteOne({ _id: new ObjectId(id) });
    //   res.send(result);
    // });

    // Test APIs
    app.get('/tests', async (req, res) => {
      const tests = await testCollection.find().toArray();
      res.send(tests);
    });

    app.post('/tests', verifyToken, verifyAdmin, async (req, res) => {
      const test = req.body;
      const result = await testCollection.insertOne(test);
      res.send(result);
    });

    app.get('/tests/:id', async (req, res) => {
      const id = req.params.id;
      const test = await testCollection.findOne({ _id: new ObjectId(id) });
      res.send(test);
    });

    app.delete('/tests/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const result = await testCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // Doctors APIs
    app.get('/doctors', async (req, res) => {
      const doctors = await doctorCollection.find().toArray();
      res.send(doctors);
    });

    app.post('/doctors', verifyToken, verifyAdmin, async (req, res) => {
      const doctor = req.body;
      const result = await doctorCollection.insertOne(doctor);
      res.send(result);
    });

    app.get('/doctors/:id', async (req, res) => {
      const id = req.params.id;
      const doctor = await doctorCollection.findOne({ _id: new ObjectId(id) });
      res.send(doctor);
    });

    app.delete('/doctors/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const result = await doctorCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // // Reservation APIs
    // app.post('/reservations', verifyToken, async (req, res) => {
    //   const reservation = req.body;
    //   const result = await reservationCollection.insertOne(reservation);
    //   res.send(result);
    // });

    // app.get('/reservations/:email', verifyToken, async (req, res) => {
    //   const email = req.params.email;
    //   const reservations = await reservationCollection
    //     .find({ email })
    //     .toArray();
    //   res.send(reservations);
    // });

    // app.patch(
    //   '/reservations/:id',
    //   verifyToken,
    //   verifyAdmin,
    //   async (req, res) => {
    //     const id = req.params.id;
    //     const update = { $set: { status: req.body.status } };
    //     const result = await reservationCollection.updateOne(
    //       { _id: new ObjectId(id) },
    //       update
    //     );
    //     res.send(result);
    //   }
    // );

    // app.delete(
    //   '/reservations/:id',
    //   verifyToken,
    //   verifyAdmin,
    //   async (req, res) => {
    //     const id = req.params.id;
    //     const result = await reservationCollection.deleteOne({
    //       _id: new ObjectId(id),
    //     });
    //     res.send(result);
    //   }
    // );

    // Reservation APIs
    app.post('/reservations', async (req, res) => {
      const reservation = req.body;
      const result = await reservationCollection.insertOne(reservation);
      res.send(result);
    });

    app.get('/reservations/:email', async (req, res) => {
      const email = req.params.email;
      const reservations = await reservationCollection
        .find({ email })
        .toArray();
      res.send(reservations);
    });

    app.patch('/reservations/:id', async (req, res) => {
      const id = req.params.id;
      const update = { $set: { status: req.body.status } };
      const result = await reservationCollection.updateOne(
        { _id: new ObjectId(id) },
        update
      );
      res.send(result);
    });

    app.delete('/reservations/:id', async (req, res) => {
      const id = req.params.id;
      const result = await reservationCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // Banner APIs
    app.get('/banners', async (req, res) => {
      const banners = await bannerCollection.find().toArray();
      res.send(banners);
    });

    app.post('/banners', verifyToken, verifyAdmin, async (req, res) => {
      const banner = req.body;
      const result = await bannerCollection.insertOne(banner);
      res.send(result);
    });

    app.delete('/banners/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const result = await bannerCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // Test the connection
    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close(); (Uncomment this if you want to close the connection after every request)
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Diagnostic Center Management System running');
});

app.listen(port, () => console.log(`Server running on port ${port}`));



