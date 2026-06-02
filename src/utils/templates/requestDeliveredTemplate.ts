const requestDeliveredTemplate = ({
	name,
	requestNo,
	message,
}: {
	name: string;
	requestNo: string;
	message?: string;
}) => `
<h2>Request Delivered</h2>

<p>Hello ${name},</p>

<p>Your request has been delivered successfully.</p>

<p><strong>Request No:</strong> ${requestNo}</p>

${
	message
		? `<p><strong>Message:</strong> ${message}</p>`
		: ""
}

<p>Thank you for choosing NextStep.</p>
`;

export default requestDeliveredTemplate;