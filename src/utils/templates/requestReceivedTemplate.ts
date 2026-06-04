const requestReceivedTemplate = ({
	name,
	requestNo,
	serviceName,
}: {
	name: string;
	requestNo: string;
	serviceName: string;
}) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Request Received</title>
</head>

<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:40px 0;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">

          <tr>
            <td align="center" style="background:#0d69ea;padding:30px;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;">
                NextStep
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 35px;">

              <h2 style="margin:0 0 20px;color:#111827;font-size:24px;">
                Request Submitted Successfully
              </h2>

              <p style="margin:0 0 16px;color:#4b5563;font-size:16px;line-height:1.7;">
                Hello <strong>${name}</strong>,
              </p>

              <p style="margin:0 0 16px;color:#4b5563;font-size:16px;line-height:1.7;">
                We have successfully received your service request.
              </p>

              <table
                width="100%"
                cellpadding="12"
                cellspacing="0"
                style="margin:25px 0;border:1px solid #e5e7eb;border-radius:8px;"
              >
                <tr>
                  <td>
                    <strong>Request No:</strong>
                  </td>
                  <td>
                    ${requestNo}
                  </td>
                </tr>

                <tr>
                  <td>
                    <strong>Service:</strong>
                  </td>
                  <td>
                    ${serviceName}
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;color:#4b5563;font-size:16px;line-height:1.7;">
                Our team will review your request and begin processing it shortly.
              </p>

              <p style="margin:0;color:#4b5563;font-size:16px;line-height:1.7;">
                Please keep your request number for future communication.
              </p>

            </td>
          </tr>

          <tr>
            <td align="center" style="padding:25px;background:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:13px;">
                © 2026 NextStep. All rights reserved.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
`;

export default requestReceivedTemplate;
