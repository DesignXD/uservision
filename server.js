const express = require("express");
const path = require("path");

const app = express();
const port = process.env.PORT || 8080;

app.use(express.static(__dirname));

app.listen(port, () => {
  console.log(`UserVision frontend running on port ${port}`);
});