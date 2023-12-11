export function passwordResetTemplate(firstName: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Confirmation</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      padding: 20px;
      background-color: #ffffff;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    }
    h1 {
      color: #333333;
    }
    p {
      color: #555555;
    }
    a {
      color: #007BFF;
      text-decoration: none;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Password Reset Confirmation</h1>
    <p>Hello ${firstName},</p>
    <p>Your password has been successfully reset. If you made this change, you can ignore this email. If you did not reset your password, please contact us immediately.</p>
    <p>If you have any questions or need further assistance, feel free to reply to this email or contact our support team.</p>
    <p>Thank you for using our services.</p>
    <p>Best regards,</p>
    <p>Noemdek</p>
  </div>
</body>
</html>`;
}
