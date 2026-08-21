const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const path = require("path");

const dev = false;
// Chỉ định chính xác thư mục chứa ứng dụng Next.js
const app = next({ 
  dev,
  dir: path.resolve(__dirname)
});

const handle = app.getRequestHandler();

// Passenger truyền socket qua PORT, nếu không có thì mặc định 3000
const port = process.env.PORT || 3000;

app.prepare()
  .then(() => {
    const server = createServer((req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
      } catch (err) {
        console.error("Error handling request:", err);
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    });

    server.listen(port, (err) => {
      if (err) throw err;
      console.log(`> Ready on port/socket ${port}`);
    });
  })
  .catch((err) => {
    // Bắt lỗi nếu app.prepare() thất bại (ví dụ: thiếu folder .next)
    console.error("Error during app preparation:", err);
    process.exit(1);
  });