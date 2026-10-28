# My-protfile
# My--protfile

## Contact form email setup

Project requests are sent by the server through SMTP to
**yasseryagoub015@gmail.com**. SMTP credentials stay on the server and must not
be added to browser JavaScript.

1. Enable 2-Step Verification on the Gmail account that will send the emails,
   then create an App Password at <https://myaccount.google.com/apppasswords>.
2. Copy `.env.example` to `.env` in the project root and set:

   ```dotenv
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=your-gmail-address@gmail.com
   SMTP_PASS=your-16-character-google-app-password
   SMTP_FROM=your-gmail-address@gmail.com
   ```

   Replace the email placeholders with the Gmail account that generated the
   App Password. In Google Account settings, enable 2-Step Verification, then
   create an App Password at <https://myaccount.google.com/apppasswords>.
   Put that generated 16-character password in `SMTP_PASS` without spaces;
   do not use your normal Gmail password. `SMTP_FROM` should match
   `SMTP_USER`. The recipient is already set to **yasseryagoub015@gmail.com**.
3. Save `.env` and start or restart the server with `npm.cmd run dev` on
   Windows. The server loads `.env` from the project root. A startup warning
   lists missing or placeholder setting names only, never credential values.
4. After the warning is gone, submit a valid request through the Contact form.
   A success message means the SMTP server accepted the message; confirm
   receipt in the recipient inbox and check spam if it is not there.

Until valid SMTP settings are added, the contact form will show an email
configuration error and will not claim that a request was sent.

The contact form is in `index.html`, with its behavior in `contact.js` and its
styles in `contact.css`. Its server-side email endpoint is in `server.js`.

## Project links

Set `SALON_APP_URL` and `MONEY_MANAGEMENT_APP_URL` near the top of
`projects.js` when the applications have real URLs. Leave either value empty
until then; unconfigured project cards are not clickable.

## Run locally

This is an HTML, CSS, and JavaScript website. Node.js runs the local site and
the contact form's email endpoint; the existing site does not use React or
Vite.

1. Open PowerShell in this project folder.
2. Install the website and server dependencies:

   ```powershell
   npm.cmd install
   ```

3. To enable email, copy `.env.example` to `.env` and add your Gmail address
   and Google App Password as described above. This step is
   required for email delivery, but not for viewing the portfolio.

   ```powershell
   Copy-Item .env.example .env
   notepad .env
   ```

4. Start the website:

   ```powershell
   npm.cmd run dev
   ```

5. Open <http://127.0.0.1:5173> in your browser. Press `Ctrl+C` in PowerShell
   when you want to stop the server.
