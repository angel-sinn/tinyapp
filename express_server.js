// -------REQUIRE-------

const express = require("express");
const app = express();
const port = 8080;
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const cookieSession = require("cookie-session");
const {
  generateRandomString,
  checkUser,
  getUserByEmail,
  urlsForUser,
} = require("./helpers");

// -------MIDDLEWARE-------

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  cookieSession({
    name: "session",
    keys: ["cookie", "session"],
    maxAge: 24 * 60 * 60 * 1000,
  })
);

// -------URL DATABASE-------

const urlDatabase = {
  b2xVn2: { longURL: "http://www.lighthouselabs.ca", userID: "aJ48lW" },
  "9sm5xK": { longURL: "http://www.google.com", userID: "aJ48lW" },
};

// -------USER DATABASE-------

const users = {
  userRandomID: {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur",
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk",
  },
};

// -------ROUTES-------

app.get("/login", (req, res) => {
  const userLoginID = req.session["user_id"];
  if (!userLoginID) {
    const templateVars = {
      user: users[req.session["user_id"]],
    };
    res.render("login", templateVars);
  } else {
    res.redirect("/urls");
  }
});

app.get("/register", (req, res) => {
  const userLoginID = req.session["user_id"];
  if (!userLoginID) {
    const templateVars = {
      user: users[req.session["user_id"]],
    };
    res.render("register", templateVars);
  } else {
    res.redirect("/urls");
  }
});

app.get("/urls", (req, res) => {
  const userLoginID = req.session["user_id"];
  const templateVars = {
    urls: urlsForUser(urlDatabase, userLoginID),
    user: users[userLoginID],
  };
  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  const userLoginID = req.session["user_id"];
  if (!userLoginID) {
    res.redirect("/login");
  } else {
    const templateVars = {
      user: users[userLoginID],
    };
    res.render("urls_new", templateVars);
  }
});

app.get("/urls/:shortURL", (req, res) => {
  const userLoginID = req.session["user_id"];
  const urlRecord = urlDatabase[req.params.shortURL];
  if (!userLoginID || userLoginID !== urlRecord.userID) {
    res.status(401).send(`You do not have authorization to view this page.`);
    return;
  }
  const templateVars = {
    user: users[userLoginID],
    shortURL: req.params.shortURL,
    longURL: urlDatabase[req.params.shortURL].longURL,
  };
  res.render("urls_show", templateVars);
});

app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL].longURL;
  const completeURL = longURL.trim().startsWith("http")
    ? longURL
    : `http://${longURL}`;
  res.redirect(completeURL);
});

app.get("/", (req, res) => {
  const userLoginID = req.session["user_id"];
  if (!userLoginID) {
    res.redirect("/login");
  } else {
    res.redirect("/urls");
  }
});

// -------LIST OF URLS ADDED-------

app.post("/urls", (req, res) => {
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = {
    shortURL: shortURL,
    longURL: req.body.longURL,
    userID: req.session["user_id"],
  };
  res.redirect(`/urls/${shortURL}`);
});

// -------UPDATE URL-------

app.post("/urls/:shortURL", (req, res) => {
  const userLoginID = req.session["user_id"];
  const urlRecord = urlDatabase[req.params.shortURL];
  if (!userLoginID || userLoginID !== urlRecord.userID) {
    res.status(401).send(`You do not have authorization to edit this page.`);
    return;
  }
  urlRecord.longURL = req.body.newURL;
  res.redirect("/urls");
});

// -------DELETE URL-------

app.post("/urls/:shortURL/delete", (req, res) => {
  const userLoginID = req.session["user_id"];
  const urlRecord = urlDatabase[req.params.shortURL];
  if (!userLoginID || userLoginID !== urlRecord.userID) {
    res.status(401).send(`You do not have authorization to delete this page.`);
    return;
  }
  delete urlDatabase[req.params.shortURL];
  res.redirect("/urls");
});

// -------REGISTRATION HANDLER-------

app.post("/register", (req, res) => {
  if (req.body.email === "" || req.body.password === "") {
    res
      .status(400)
      .send(
        `At least one of the fields were empty. Please enter a valid email address and password.`
      );
  } else if (checkUser(users, req.body.email)) {
    res
      .status(400)
      .send(
        `An account for this email address already exists. Please use a different email address.`
      );
  } else {
    let userID = generateRandomString();
    let hash = bcrypt.hashSync(req.body.password, 10);

    users[userID] = {
      id: userID,
      email: req.body.email,
      password: hash,
    };
    req.session.user_id = userID;
    res.redirect("/urls");
  }
});

// -------USER LOGIN HANDLER-------

app.post("/login", (req, res) => {
  let loginEmail = req.body.email;
  let loginPassword = req.body.password;
  let userID = getUserByEmail(users, loginEmail);

  if (!checkUser(users, loginEmail)) {
    res.status(403).send(`No account associated with this email address.`);
  } else if (!bcrypt.compareSync(loginPassword, users[userID].password)) {
    res
      .status(403)
      .send(`Email Address or password does not match. Please try again.`);
  } else {
    req.session.user_id = userID;
    res.redirect("/urls");
  }
});

// -------USER LOGOUT-------

app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/urls");
});

// -------LISTEN TO PORT-------

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
