import resend from "@/config/email.config";

interface ISendEmailOptions {
	to: string;
	subject: string;
	html: string;
}

const sendEmail = async (options: ISendEmailOptions) => {
	const emailSent = await resend.emails.send({
		// from: `NextStep <${envVar.EMAIL_FROM as string}>`,
		from: `onboarding@resend.dev`,
		to: options.to,
		subject: options.subject,
		html: options.html,
	});
	console.log({ emailSent });

	return emailSent;
};

export default sendEmail;
