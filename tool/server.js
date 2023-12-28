import express from "express";
import path from "path";
import {fileURLToPath} from "url";

const app = express();
const port = 5001;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.static(path.join(__dirname, "..", "tool")));
app.use("/shared/", express.static(path.join(__dirname, "..", "shared")));

app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "..", "tool", "index.html"));
});

app.listen(port, () => {
	console.log(`Server listening on http://localhost:${port}`);
});
