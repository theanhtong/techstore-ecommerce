export const verifyEmailTemplate = (
  name: string,
  verifyUrl: string,
): string => `
  <h2>Hello ${name},</h2>
  <p>Please click the link below to verify your email address:</p>
  <a href="${verifyUrl}" style="
    background: #4F46E5;
    color: white;
    padding: 12px 24px;
    border-radius: 6px;
    text-decoration: none;
  ">Verify Email</a>
  <p>This link will expire in 24 hours.</p>
  <p>If you did not register, please ignore this email.</p>
`;
