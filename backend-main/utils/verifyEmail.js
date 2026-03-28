// utils/verifyEmail.js

/**
 * Generates the OTP email-verification HTML email.
 * @param {string} name - User's display name
 * @param {string} otp  - 6-digit OTP code
 * @returns {string} HTML string
 */
const verifyEmailTemplate = (name, otp) => {
    const digits = otp.split('');
    const digitBoxes = digits.map(d =>
        `<td style="padding:0 5px;">
           <div style="width:44px;height:54px;background:#0a1628;border:1.5px solid rgba(0,212,200,0.35);border-radius:10px;
                       display:flex;align-items:center;justify-content:center;
                       font-size:1.6rem;font-weight:800;color:#00d4c8;font-family:'Courier New',monospace;
                       text-align:center;line-height:54px;">
             ${d}
           </div>
         </td>`
    ).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#060a12;font-family:'Outfit',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060a12;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
               style="max-width:520px;width:100%;background:#0d1424;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">

          <!-- Gradient bar -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#00d4c8,#3b82f6,#8b5cf6);font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding:36px 40px 20px;text-align:center;">
              <div style="display:inline-block;background:rgba(0,212,200,0.1);border:1px solid rgba(0,212,200,0.25);
                          border-radius:12px;padding:10px 20px;margin-bottom:24px;">
                <span style="font-size:1rem;font-weight:700;letter-spacing:1px;color:#00d4c8;">SMARTARCH</span>
              </div>
              <div style="width:56px;height:56px;background:rgba(0,212,200,0.1);border:1.5px solid rgba(0,212,200,0.3);
                          border-radius:50%;margin:0 auto 16px;font-size:1.6rem;line-height:56px;text-align:center;">
                🔐
              </div>
              <h1 style="margin:0 0 8px;font-size:1.5rem;font-weight:800;color:#f1f5f9;line-height:1.2;">
                Your verification code, ${name}
              </h1>
              <p style="margin:0;color:#94a3b8;font-size:0.93rem;line-height:1.6;">
                Enter this code to activate your SmartArch account.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding:0 40px;"><div style="border-top:1px solid rgba(255,255,255,0.07);"></div></td></tr>

          <!-- OTP digits -->
          <tr>
            <td style="padding:32px 40px 8px;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>${digitBoxes}</tr>
              </table>
            </td>
          </tr>

          <!-- Expiry note -->
          <tr>
            <td style="padding:20px 40px 28px;text-align:center;">
              <div style="background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.2);
                          border-radius:8px;padding:12px 16px;display:inline-block;">
                <p style="margin:0;color:#fbbf24;font-size:0.8rem;">
                  ⏱ This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
                </p>
              </div>
            </td>
          </tr>

          <!-- Info -->
          <tr>
            <td style="padding:0 40px 28px;text-align:center;">
              <p style="margin:0;color:#64748b;font-size:0.8rem;line-height:1.6;">
                If you did not create a SmartArch account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding:0 40px;"><div style="border-top:1px solid rgba(255,255,255,0.07);"></div></td></tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;">
              <p style="margin:0 0 6px;color:#475569;font-size:0.78rem;">
                Need help? Reply to this email or visit our support page.
              </p>
              <p style="margin:0;color:#334155;font-size:0.75rem;">
                © ${new Date().getFullYear()} SmartArch · AI-Powered Architecture Platform
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

module.exports = verifyEmailTemplate;