const resetPasswordTemplate = (otp: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Reset OTP</title>
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
                Password Reset OTP
              </h2>

              <p style="margin:0 0 16px;color:#4b5563;font-size:16px;line-height:1.7;">
                We received a request to reset your password.
              </p>

              <p style="margin:0 0 30px;color:#4b5563;font-size:16px;line-height:1.7;">
                Use the following OTP to continue:
              </p>

              <div style="text-align:center;margin:35px 0;">
                <span style="display:inline-block;background:#0d69ea;color:#ffffff;font-size:36px;font-weight:bold;letter-spacing:8px;padding:18px 35px;border-radius:10px;">
                  ${otp}
                </span>
              </div>

              <p style="margin:0 0 12px;color:#ef4444;font-size:15px;">
                This OTP will expire in 10 minutes.
              </p>

              <p style="margin:25px 0 0;color:#6b7280;font-size:14px;line-height:1.7;">
                If you did not request this password reset, you can safely ignore this email.
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

export default resetPasswordTemplate;
