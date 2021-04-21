const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "twitterClone.db");

const app = express();

app.use(express.json());

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

//user registration
app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const userCheckQuery = `SELECT * FROM user WHERE username='${username}';`;
  const isUserExist = await db.get(userCheckQuery);
  if (isUserExist === undefined) {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const addUserQuery = `INSERT INTO user (name,username,password,gender) VALUES(
          '${name}',
          '${username}',
          '${hashedPassword}',
          '${gender}'
      );`;
      await db.run(addUserQuery);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

// login user
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const userCheckQuery = `SELECT * FROM user WHERE username='${username}';`;
  const isUserExist = await db.get(userCheckQuery);
  if (isUserExist === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const checkPassword = await bcrypt.compare(password, isUserExist.password);
    if (checkPassword) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "leela");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//authenticate jwt
const AuthenticateJWT = (request, response, next) => {
  const authHead = request.headers["authorization"];
  let jwtToken;
  if (authHead === undefined) {
    console.log(authHead);
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwtToken = authHead.split(" ")[1];
    if (jwtToken === undefined) {
      response.status(401);
      response.send("Invalid JWT Token");
    } else {
      jwt.verify(jwtToken, "leela", async (error, payload) => {
        if (error) {
          response.status(401);
          response.send("Invalid JWT Token");
        } else {
          request.username = payload.username;
          next();
        }
      });
    }
  }
};

app.get("/user/tweets/feed/", AuthenticateJWT, (request, response) => {
  response.send(request.username);
});

app.get("/user/following/", AuthenticateJWT, async (request, response) => {
  response.send("success");
});
