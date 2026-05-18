import {
	Prisma,
} from "../../prisma/generated/prisma/client";

const handlePrismaError = (
	error:
		| Prisma.PrismaClientKnownRequestError
		| Prisma.PrismaClientValidationError,
) => {
	let message =
		"Database operation failed";

	if (
		error instanceof
		Prisma.PrismaClientKnownRequestError
	) {
		switch (error.code) {
			case "P2002":
				message =
					"This information already exists";
				break;

			case "P2025":
				message =
					"Requested data was not found";
				break;

			default:
				message =
					"Database request failed";
		}
	}

	return {
		statusCode: 400,

		message,

		errorSources: [],
	};
};

export default handlePrismaError;