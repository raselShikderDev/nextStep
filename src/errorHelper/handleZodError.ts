import type { ZodError } from "zod";

const handleZodError = (
	error: ZodError,
) => {
	const errors = error.issues.map(
		(issue) => ({
			path: issue.path.join("."),

			message: issue.message,
		}),
	);

	return {
		statusCode: 400,

		message: "Validation failed",

		errorSources: errors,
	};
};

export default handleZodError;