import express from "express";
import session from "express-session";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();
const app = express();
console.log(process.env.SECRET_SESSION)
app.use(
  session({
    secret: process.env.SECRET_SESSION,
    resave: false,
    saveUninitialized: false,
  })
);


app.get('/showuser' , (req , res)=>{
  if(req.session.username){
    res.send(`${req.session.username} and ${req.session.email}`);
  }else{
    res.send("No User"); 
  }
})

app.get("/login", (req, res) => {
  const state = crypto.randomUUID();
  //URLSearchParams is a built-in Web + Node API for working with URL query strings 
  const params = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    redirect_uri: process.env.REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "offline",
    prompt: "consent",
  });
  req.session.state = state;
  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth?" + params.toString();
  res.redirect(authUrl);
});

app.get('/protected' , (req,res)=>{
  if(req.session.isauth){
    res.send("You are Good Boy")
  }else{
    res.send("Authenticate First")
  }
})

// what googel will send
///oauth/google/callback?code=AUTHORIZATION_CODE&state=STATE_YOU_SENT

app.get("/oauth/google/callback", async (req, res) => {
  //checking the state
  if (req.query.state !== req.session.state) {
  return res.status(403).send("Invalid state");
  }
  console.log("State is good")

  const body = new URLSearchParams({
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  code: req.query.code,
  redirect_uri: process.env.REDIRECT_URI,
  grant_type: "authorization_code",
  });


  const tokenResponse = await fetch("https://oauth2.googleapis.com/token",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  }
);
const tokens = await tokenResponse.json();
console.log(tokens);
// this tokens have {
//   "access_token": "...",
//   "refresh_token": "...",
//   "id_token": "..."
// }

// verfing the id token
const idTokenRes = await fetch(
  `https://oauth2.googleapis.com/tokeninfo?id_token=${tokens.id_token}`
);

const user = await idTokenRes.json();
console.log(user);
if(user){
  req.session.isauth = true;
  req.session.username = user.name;
  req.session.email = user.email;
}
res.redirect('/showuser');
});



app.get("/", (req, res) => {
  res.send("Session value set");
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.send("Logged out");
  });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
