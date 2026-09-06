import fs from "node:fs";
import path from "node:path";
import multer from "multer";

const uploadDirectory = path.join(process.cwd(), "private_uploads", "requests");

if (!fs.existsSync(uploadDirectory)) {
	fs.mkdirSync(uploadDirectory, {
		recursive: true,
	});
}

const allowedMimeTypes = [
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
	"application/pdf",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const allowedExtensions = [
	".jpeg",
	".png",
	".gif",
	".webp",
	".pdf",
	".doc",
	".docx",
];

const isAllowedMimeType = (mimeType: string): boolean => {
	return allowedMimeTypes.includes(mimeType);
};

const isAllowedExtension = (ext: string): boolean => {
	return allowedExtensions.includes(ext.toLowerCase());
};

const storage = multer.diskStorage({
	destination: (_req, _file, cb) => {
		cb(null, uploadDirectory);
	},

	filename: (_req, file, cb) => {
		const ext = path.extname(file.originalname).toLowerCase();

		if (!isAllowedExtension(ext)) {
			return cb(new Error("Unsupported file extension"), "");
		}

		if (!isAllowedMimeType(file.mimetype)) {
			return cb(new Error("Unsupported file MIME type"), "");
		}

		const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

		cb(null, uniqueName);
	},
});

const upload = multer({
	storage,
	limits: {
		fileSize: 20 * 1024 * 1024,
	},
	fileFilter: (_req, file, cb) => {
		if (!isAllowedMimeType(file.mimetype)) {
			return cb(new Error("Unsupported file type"));
		}

		cb(null, true);
	},
});

export default upload;
