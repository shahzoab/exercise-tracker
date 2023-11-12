const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

app.use(cors());
app.use(express.static("public"));
app.get("/", (_req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// Connect to database
let mongoose = require("mongoose");
mongoose.connect(process.env["MONGO_URI"], {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Parse incoming request bodies
app.use(bodyParser.urlencoded({ extended: false }));

// Create User schema
let UserShema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  }
});

// Create Url model
let User = mongoose.model("User", UserShema);

app
  .route("/api/users")
  // API endpoint to get all users
  .get(function (_req, res) {
    User.find()
      .select("-__v")
      .then(data => {
        res.json(data);
      })
      .catch(err => {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
      });
  })
  // API endpoint to create user
  .post(async function (req, res) {
    const username = req.body.username;

    // Check if user is already in db then return it
    const exist = await User.findOne({ username }).select("-__v");
    if (exist) {
      res.json(exist);
      return;
    }
    // else create new user in db and return it
    const newUser = new User({ username });
    newUser
      .save()
      .then(data => {
        res.json({ username: data.username, _id: data._id });
      })
      .catch(err => {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
      });
  });

// Create Exercise schema
let ExerciseShema = new mongoose.Schema({
  duration: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  date: Date,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
});

// Create Exercise model
let Exercise = mongoose.model("Exercise", ExerciseShema);

// API endpoint to create exercise
app.post("/api/users/:_id/exercises", async function (req, res) {
  const id = req.params._id;
  const user = await User.findById(id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const description = req.body.description;
  const duration = req.body.duration;
  const date = req.body.date
    ? new Date(req.body.date).toDateString()
    : new Date().toDateString();

  const newExercise = new Exercise({
    user,
    description,
    duration,
    date
  });
  newExercise
    .save()
    .then(doc => {
      res.json({
        _id: doc.user._id,
        username: doc.user.username,
        description: doc.description,
        duration: doc.duration,
        date: doc.date.toDateString()
      });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    });
});

// API endpoint to get exercises by user
app.get("/api/users/:_id/logs", async function (req, res) {
  const id = req.params._id;
  const user = await User.findById(id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const from = req.query.from ? new Date(req.query.from) : new Date(0);
  const to = req.query.to ? new Date(req.query.to) : new Date();
  const limit = req.query.limit ? Number(req.query.limit) : 0;

  const exercises = await Exercise.find({
    user,
    date: { $gte: from, $lte: to }
  }).limit(limit);

  const formattedExercises = exercises.map(exercise => ({
    description: exercise.description,
    duration: exercise.duration,
    date: exercise.date.toDateString()
  }));

  res.json({
    _id: user._id,
    username: user.username,
    count: exercises.length,
    log: formattedExercises
  });
});

const port = process.env.PORT || 8080;
const listener = app.listen(port, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
