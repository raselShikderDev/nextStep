const paymentReceivedTemplate = ({
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
<h2>Payment Received</h2>

<p>Hello ${name},</p>

<p>We have received your payment.</p>

<p><strong>Request No:</strong> ${requestNo}</p>

<p><strong>Amount:</strong> ${amount} ${currency}</p>

<p>Our team will verify it shortly.</p>
`;

export default paymentReceivedTemplate;
