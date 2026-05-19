import resend from "@/config/email.config";
import envVar from "@/config/env.config";

interface ISendEmailOptions {
	to: string;
	subject: string;
	html: string;
}

const sendEmail = async (options: ISendEmailOptions) => {
	await resend.emails.send({
		from: `NextStep <${envVar.EMAIL_FROM as string}>`,
		to: options.to,
		subject: options.subject,
		html: options.html,
	});
};

export default sendEmail;
