export function forgotPasswordTemplate(
  firstName: string,
  link: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
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
    <h1>Password Reset</h1>
    <p>Hello ${firstName},</p>
    <p>We received a request to reset your password. If you did not make this request, please ignore this email.</p>
    <p>To reset your password, click the following link:</p>
    <p><a href="${link}" target="_blank">Reset Password</a></p>
<p>If you're having trouble clicking the link, you can copy and paste the following URL into your browser's address bar:</p>
<p>${link}</p>
<p>This link will expire in 1 hour.</p>
<p>Thank you,</p>
<p>Noemdek</p>

  </div>
</body>
</html>`;
}
