const requestAssignedTemplate = ({
	name,
	requestNo,
}: {
	name: string;
	requestNo: string;
}) => `
<h2>Request Assigned</h2>

<p>Hello ${name},</p>

<p>Your request has been assigned to a specialist.</p>

<p><strong>Request No:</strong> ${requestNo}</p>

<p>Work will begin shortly.</p>
`;

export default requestAssignedTemplate;
