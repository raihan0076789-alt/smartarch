// utils/welcomeEmail.js

/**
 * Generates a welcome HTML email for a newly registered user.
 * @param {string} name - The user's display name
 * @returns {string} HTML string
 */
const welcomeEmailTemplate = (name) => `
<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#060a12;font-family:'Outfit',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060a12;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#0d1424;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">

          <!-- Gradient top bar -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#00d4c8,#3b82f6,#8b5cf6);font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding:36px 40px 20px;text-align:center;">
              <div style="display:inline-block;background:rgba(0,212,200,0.1);border:1px solid rgba(0,212,200,0.25);border-radius:12px;padding:10px 20px;margin-bottom:24px;">
                <span style="font-size:1rem;font-weight:700;letter-spacing:1px;color:#00d4c8;">SMARTARCH</span>
              </div>
              <h1 style="margin:0 0 8px;font-size:1.7rem;font-weight:800;color:#f1f5f9;line-height:1.2;">
                Welcome aboard, ${name}! 🎉
              </h1>
              <p style="margin:0;color:#94a3b8;font-size:0.97rem;">
                Your account has been created successfully.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="border-top:1px solid rgba(255,255,255,0.07);"></div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 40px;">
              <p style="margin:0 0 16px;color:#cbd5e1;font-size:0.97rem;line-height:1.7;">
                Thank you for joining <strong style="color:#f1f5f9;">SmartArch</strong> — the AI-powered platform for designing and visualising house architectures. We're thrilled to have you with us.
              </p>
              <p style="margin:0 0 24px;color:#cbd5e1;font-size:0.97rem;line-height:1.7;">
                Here's what you can do right now:
              </p>

              <!-- Feature list -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                    <span style="color:#00d4c8;font-size:1.1rem;vertical-align:middle;">✦</span>
                    <span style="color:#e2e8f0;font-size:0.93rem;margin-left:10px;vertical-align:middle;">Design floor plans with drag-and-drop rooms, doors &amp; windows</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                    <span style="color:#3b82f6;font-size:1.1rem;vertical-align:middle;">✦</span>
                    <span style="color:#e2e8f0;font-size:0.93rem;margin-left:10px;vertical-align:middle;">Visualise your designs in full 3D with multi-floor support</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                    <span style="color:#8b5cf6;font-size:1.1rem;vertical-align:middle;">✦</span>
                    <span style="color:#e2e8f0;font-size:0.93rem;margin-left:10px;vertical-align:middle;">Chat with the AI assistant to generate and refine layouts</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;">
                    <span style="color:#f59e0b;font-size:1.1rem;vertical-align:middle;">✦</span>
                    <span style="color:#e2e8f0;font-size:0.93rem;margin-left:10px;vertical-align:middle;">Save, export, and manage all your projects from your dashboard</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding:4px 40px 36px;text-align:center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/architect.html"
                 style="display:inline-block;background:linear-gradient(135deg,#00d4c8,#3b82f6);color:#060a12;font-weight:700;font-size:0.97rem;padding:14px 36px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;">
                Start Designing →
              </a>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="border-top:1px solid rgba(255,255,255,0.07);"></div>
            </td>
          </tr>

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
</html>
`;

module.exports = welcomeEmailTemplate;