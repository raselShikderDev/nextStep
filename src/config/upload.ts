import fs from "node:fs";
import path from "node:path";
import multer from "multer";

const uploadDirectory = path.join(process.cwd(), "uploads", "requests");

if (!fs.existsSync(uploadDirectory)) {
	fs.mkdirSync(uploadDirectory, {
		recursive: true,
	});
}

const storage = multer.diskStorage({
	destination: (_req, _file, cb) => {
		cb(null, uploadDirectory);
	},

	filename: (_req, file, cb) => {
		const uniqueName = `${Date.now()}-${Math.round(
			Math.random() * 1e9,
		)}${path.extname(file.originalname)}`;

		cb(null, uniqueName);
	},
});

const upload = multer({
	storage,
	limits: {
		fileSize: 20 * 1024 * 1024,
	},
});

export default upload;
