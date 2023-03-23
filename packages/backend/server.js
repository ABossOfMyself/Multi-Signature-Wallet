var express = require("express");
var fs = require("fs");
const https = require("https");
var cors = require("cors");
var bodyParser = require("body-parser");
var app = express();


let transactions = {};


app.use(cors());

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));


app.get("/", function (request, response) {

  console.log("/");

  response.status(200).send("👛 Multi Signature Wallet");
});


app.get("/:key", function (request, response) {

  let key = request.params.key;

  console.log("/", key);

  response.status(200).send(transactions[key]);
});


app.post("/", function (request, response) {

  console.log("POST", request.body);

  response.send(request.body);

  const key = request.body.address + "_" + request.body.chainId;

  console.log("key:", key);

  if(!transactions[key]) {

    transactions[key] = {};
  }

  transactions[key][request.body.hash] = request.body;

  console.log("transactions", transactions);
});


if(fs.existsSync("server.key") && fs.existsSync("server.cert")) {

  https.createServer({
    
    key: fs.readFileSync("server.key"), cert: fs.readFileSync("server.cert")}, app).listen(process.env.PORT || 49832, () => {

      console.log("HTTPS Listening: 49832");
  });

} else {

  var server = app.listen(process.env.PORT || 49832, "0.0.0.0", function () {

    console.log("HTTPS Listening on port:", server.address().port);
  });
}
