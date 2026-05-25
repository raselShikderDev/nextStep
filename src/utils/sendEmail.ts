import resend from "@/config/email.config";
import envVar from "@/config/env.config";

interface ISendEmailOptions {
	to: string;
	subject: string;
	html: string;
}

const sendEmail = async (options: ISendEmailOptions) => {
	const emailSent = await resend.emails.send({
		from: `NextStep <${envVar.EMAIL_FROM as string}>`,
		to: options.to,
		subject: options.subject,
		html: options.html,
	});
	console.log({ emailSent });

	return emailSent;
};

export default sendEmail;

// {
//   data: null,
//   error: {
//     statusCode: 403,
//     message: "The gmail.com domain is not verified. Please, add and verify your domain on https://resend.com/domains",
//     name: "validation_error",
//   },
//   headers: {
//     "cf-cache-status": "DYNAMIC",
//     "cf-ray": "a016d3b388bdfc55-DAC",
//     connection: "keep-alive",
//     "content-encoding": "br",
//     "content-type": "application/json",
//     date: "Mon, 25 May 2026 19:08:08 GMT",
//     "ratelimit-limit": "5",
//     "ratelimit-policy": "5;w=1",
//     "ratelimit-remaining": "4",
//     "ratelimit-reset": "1",
//     server: "cloudflare",
//     "transfer-encoding": "chunked",
//     "x-resend-daily-quota": "0",
//     "x-resend-monthly-quota": "0",
//   },
// }
// {
//   otp: "810573",
//   email: "boring.jaguar.ibto@hidingmail.net",
// }
// POST /api/v1/auth/forgot-password 200 4143.130 ms - 50
