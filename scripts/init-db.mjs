import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const projectDir = process.cwd();
const schemaPath = resolve(projectDir, "database", "schema.sql");
const mysqlCandidates = [
  process.env.MYSQL_BIN,
  "C:\\xampp\\mysql\\bin\\mysql.exe",
  "mysql",
].filter(Boolean);
const mysqlBin = mysqlCandidates.find((candidate) =>
  candidate === "mysql" ? true : existsSync(candidate),
);

if (!mysqlBin) {
  console.error("Không tìm thấy mysql.exe. Hãy đặt MYSQL_BIN hoặc kiểm tra XAMPP.");
  process.exit(1);
}

const args = [
  "--default-character-set=utf8mb4",
  "-h",
  process.env.DB_HOST || "127.0.0.1",
  "-P",
  process.env.DB_PORT || "3306",
  "-u",
  process.env.DB_USER || "root",
];

if (process.env.DB_PASSWORD) args.push(`-p${process.env.DB_PASSWORD}`);

const result = spawnSync(mysqlBin, args, {
  cwd: projectDir,
  input: readFileSync(schemaPath, "utf8"),
  encoding: "utf8",
  stdio: ["pipe", "inherit", "inherit"],
});

if (result.error) {
  console.error(`Không thể chạy mysql: ${result.error.message}`);
  process.exit(1);
}

if (result.status !== 0) process.exit(result.status ?? 1);

console.log("Đã khởi tạo database ems_local và seed dữ liệu demo.");
