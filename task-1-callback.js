const http = require("http");
const https = require("https");
const { URL } = require("url");

const PORT = 3000;

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === "GET" && urlObj.pathname === "/I/want/title") {
    const addresses = urlObj.searchParams.getAll("address");

    if (addresses.length === 0) {
      res.writeHead(400, { "Content-Type": "text/html" });
      return res.end(
        "<html><body><h1>No addresses provided</h1></body></html>"
      );
    }
    let pendingRequests = addresses.length;
    let items = [];

    addresses.forEach((address, idx) => {
      fetchTitle(address, title => {
        items[idx] = `<li>${escapeHtml(address)} - ${title ||
          "NO RESPONSE"}</li>`;
        if (--pendingRequests === 0) {
          const html = `
                        <html>
                            <body>
                                <h1>Following are the titles of given websites:</h1>
                                <ul>${items.join("")}</ul>
                            </body>
                        </html>`;
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(html);
        }
      });
    });
  } else {
    res.writeHead(404, { "Content-Type": "text/html" });
    res.end("<html><body><h1>404 Not Found</h1></body></html>");
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

function fetchTitle(address, cb) {
  const url = normalizeUrl(address);
  const mod = url.protocol === "https:" ? https : http;
  const options = {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    },
  };
  const req = mod.get(url, options, response => {
    console.log(`Fetching: ${address} - Status: ${response.statusCode}`);

    if (
      response.statusCode >= 300 &&
      response.statusCode < 400 &&
      response.headers.location
    ) {
      const redirectUrl = new URL(response.headers.location, url).toString();
      console.log(`Redirecting to: ${redirectUrl}`);
      return fetchTitle(redirectUrl, cb);
    }

    if (response.statusCode !== 200) {
      return cb(
        `Rate-Limited or Error for ${address} (Status Code: ${response.statusCode})`
      );
    }
    let data = "";
    response.on("data", chunk => (data += chunk));
    response.on("end", () => {
      const title = extractTitle(data);
      cb(title);
    });
    response.on("error", () => {
      cb(null);
    });
  });
  req.setTimeout(15000, () => {
    req.destroy();
    cb(null);
  });
  req.on("error", () => cb(null));
}

function normalizeUrl(address) {
  const protocol =
    address.startsWith("http://") || address.startsWith("https://")
      ? ""
      : "https://";
  return new URL(protocol + address);
}

function extractTitle(html) {
  const match = html.match(/<title>(.*?)<\/title>/i);
  return match ? match[1].trim().split("|")[0].trim() : "NO TITLE FOUND";
}

function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    char =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[char])
  );
}
