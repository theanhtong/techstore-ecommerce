export const phoneOtpTemplate = (phone: string, code: string) => `
  <div style="font-family: sans-serif; padding: 24px; max-width: 480px; margin: auto; border: 1px solid #eaeaea; border-radius: 12px; background-color: #ffffff;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 style="color: #0f172a; margin: 0; font-size: 20px; font-weight: 800; text-transform: uppercase; tracking-wider;">Phone Verification</h2>
      <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">TechStore Tech Shop</p>
    </div>
    
    <div style="color: #334155; font-size: 14px; line-height: 1.5;">
      <p>Hello,</p>
      <p>You have requested to add or update a shipping address for the phone number <strong>${phone}</strong>.</p>
      <p>Here is your verification OTP code:</p>
      
      <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 16px; border-radius: 8px; text-align: center; font-size: 28px; font-weight: 900; letter-spacing: 6px; margin: 24px 0; color: #0f172a;">
        ${code}
      </div>
      
      <p style="color: #64748b; font-size: 12px; text-align: center; margin: 24px 0 0 0;">
        * The OTP is valid for <strong>5 minutes</strong>. Please do not share this code with anyone to secure your order information.
      </p>
    </div>
  </div>
`;
