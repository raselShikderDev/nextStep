const quotationTemplate = ({
	name,
	requestNo,
	amount,
	currency,
}: {
	name: string;
	requestNo: string;
	amount: number | string;
	currency: string;
}) => `
<h2>Quotation Ready</h2>

<p>Hello ${name},</p>

<p>Your quotation is ready.</p>

<p><strong>Request No:</strong> ${requestNo}</p>

<p><strong>Amount:</strong> ${amount} ${currency}</p>

<p>Please complete the payment to proceed.</p>
`;

export default quotationTemplate;
