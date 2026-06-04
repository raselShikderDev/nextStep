const requestCancelledTemplate = ({
	name,
	requestNo,
	reason,
}: {
	name: string;
	requestNo: string;
	reason?: string;
}) => `
<h2>Request Cancelled</h2>

<p>Hello ${name},</p>

<p>Your request has been cancelled.</p>

<p><strong>Request No:</strong> ${requestNo}</p>

${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
`;

export default requestCancelledTemplate;
