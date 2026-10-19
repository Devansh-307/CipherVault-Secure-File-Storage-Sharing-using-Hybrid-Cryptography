import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

logger = logging.getLogger("ciphervault.email")

class EmailService:

    @classmethod
    def is_smtp_configured(cls) -> bool:
        """Checks if SMTP credentials are fully provided."""
        return bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)

    @classmethod
    def send_otp_email(cls, to_email: str, otp_code: str, expiry_minutes: int = 10) -> bool:
        """
        Dispatches a clean, mobile-responsive HTML + plain-text verification email with the 6-digit OTP.
        
        Returns:
            bool: True on successful delivery.
            
        Raises:
            RuntimeError: If SMTP is unconfigured and DEBUG is False.
            Exception: If SMTP connection, authentication, or dispatch fails.
        """
        smtp_host = settings.SMTP_HOST
        smtp_port = settings.SMTP_PORT
        smtp_user = settings.SMTP_USER
        smtp_pass = settings.SMTP_PASSWORD
        from_email = settings.MAIL_FROM or settings.SMTP_FROM_EMAIL or smtp_user or "security@ciphervault.io"

        if not cls.is_smtp_configured():
            if settings.DEBUG:
                logger.warning(
                    f"[DEV FALLBACK - DEBUG ONLY] SMTP credentials not configured. OTP for '{to_email}' is [{otp_code}]."
                )
                print(f"\n=================================================================")
                print(f" [DEV FALLBACK - DEBUG ONLY] CIPHERVAULT EMAIL OTP DISPATCH")
                print(f" To:      {to_email}")
                print(f" OTP:     {otp_code}")
                print(f" Valid:   {expiry_minutes} minutes")
                print(f" Notice:  Configure SMTP_USER & SMTP_PASSWORD in .env for real email.")
                print(f"=================================================================\n")
                return True
            else:
                logger.error("SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASSWORD) are missing and DEBUG=False.")
                raise RuntimeError(
                    "SMTP email service is not configured on the server. Please set SMTP credentials in .env."
                )

        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"CipherVault Security: Your Verification Code is {otp_code}"
        msg["From"] = from_email
        msg["To"] = to_email

        plain_text = (
            f"CipherVault - Zero-Knowledge Cryptographic Vault\n\n"
            f"Your 6-digit verification code is: {otp_code}\n\n"
            f"This code will expire in {expiry_minutes} minutes.\n"
            f"If you did not request this verification code, please ignore this email or review your account security.\n\n"
            f"Zero-Knowledge Security Notice: Resetting your master key initializes a new RSA-2048 keypair. "
            f"Previously encrypted files cannot be decrypted without your original master key.\n\n"
            f"Lead Architect: Devansh Rathore\n"
        )

        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CipherVault Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #07090e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #07090e; width: 100%; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; background-color: #0d1322; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 24px 16px 24px; text-align: center; border-bottom: 1px solid #1e293b;">
              <div style="display: inline-block; padding: 10px 18px; background-color: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 12px; margin-bottom: 12px;">
                <span style="font-size: 20px; font-weight: bold; color: #38bdf8; font-style: italic; letter-spacing: -0.5px;">CipherVault</span>
              </div>
              <h1 style="margin: 8px 0 0 0; font-size: 20px; font-weight: 700; color: #f1f5f9; letter-spacing: -0.3px;">Reset Master Key Verification</h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">Zero-Knowledge Cryptographic File Storage & Sharing</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 28px 24px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
                A master key reset request was initiated for your CipherVault account. Use the 6-digit verification code below to authorize this cryptographic identity update:
              </p>
              
              <!-- OTP Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
                <tr>
                  <td align="center" style="background-color: #07090e; border: 1px solid #38bdf8; border-radius: 12px; padding: 22px 16px;">
                    <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: #38bdf8; margin-bottom: 8px;">One-Time Verification Code</div>
                    <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #ffffff; text-shadow: 0 0 12px rgba(56, 189, 248, 0.4);">{otp_code}</div>
                    <div style="margin-top: 8px; font-size: 12px; color: #94a3b8;">Expires in <strong style="color: #38bdf8;">{expiry_minutes} minutes</strong></div>
                  </td>
                </tr>
              </table>

              <!-- Warning Box -->
              <div style="background-color: rgba(245, 158, 11, 0.08); border-left: 3px solid #f59e0b; padding: 12px 14px; border-radius: 6px; margin-top: 20px;">
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #fbbf24;">
                  <strong>Zero-Knowledge Security Notice:</strong> Resetting your master key initializes a new RSA-2048 keypair. Previously encrypted files cannot be decrypted without the original master key.
                </p>
              </div>

              <p style="margin: 20px 0 0 0; font-size: 12px; line-height: 1.5; color: #64748b;">
                If you did not request this code, no action is needed. Your vault remains locked and secure.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 16px 24px; background-color: #090e18; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b;">
                CipherVault &copy; 2026 &bull; Lead Architect & Engineer: Devansh Rathore
              </p>
              <p style="margin: 4px 0 0 0; font-size: 10px; color: #475569;">
                NIST SP 800-38D &amp; PKCS#1 v2.2 Compliant
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        try:
            if settings.SMTP_USE_SSL or smtp_port == 465:
                server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=12)
            else:
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=12)
                if settings.SMTP_USE_TLS:
                    server.starttls()

            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
            server.quit()
            logger.info(f"Successfully delivered OTP verification email to {to_email} via SMTP {smtp_host}:{smtp_port}")
            return True
        except Exception as exc:
            logger.error(f"SMTP dispatch failure to {to_email} via {smtp_host}:{smtp_port}: {exc}", exc_info=True)
            raise exc
