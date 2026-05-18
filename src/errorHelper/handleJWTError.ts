import {
	JsonWebTokenError,
	TokenExpiredError,
} from "jsonwebtoken";

const handleJWTError = (
	error:
		| JsonWebTokenError
		| TokenExpiredError,
) => {
	let message = "Unauthorized access";

	if (
		error instanceof TokenExpiredError
	) {
		message =
			"Your session has expired. Please login again";
	}

	if (
		error instanceof JsonWebTokenError
	) {
		message =
			"Invalid access token";
	}

	return {
		statusCode: 401,

		message,

		errorSources: [],
	};
};

export default handleJWTError;