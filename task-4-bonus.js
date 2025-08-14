const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();

app.get("/I/want/title", async (req, res) => {
  const addresses = req.query.address;
  const titles = [];

  const urls = Array.isArray(addresses) ? addresses : [addresses];

  for (let url of urls) {
    try {
      const response = await axios.get(`https://${url}`);
      const $ = cheerio.load(response.data);
      let title = $("title").text();

      title = title.split("|")[0].trim();
      title = title.length > 100 ? title.substring(0, 100) + "..." : title;

      titles.push(`${url} - "${title}"`);
    } catch (error) {
      console.error(`Error fetching the website: ${url}`, error.message);
      if (error.response) {
        titles.push(
          `${url} - "Error: ${error.response.status} - ${error.response
            .statusText}"`
        );
      } else {
        titles.push(
          `${url} - "Failed to retrieve title (Error: ${error.message})"`
        );
      }
    }
  }

  const htmlResponse = `<html>
                          <head></head>
                          <body>
                            <h1>Following are the titles of the given websites:</h1>
                            <ul>${titles
                              .map(title => `<li>${title}</li>`)
                              .join("")}</ul>
                          </body>
                        </html>`;

  res.send(htmlResponse);
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
