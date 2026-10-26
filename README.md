# My-protfile
# My--protfile

## Contact form setup (one-time, ~2 minutes)

The form in `contact.js` delivers mail through [Web3Forms](https://web3forms.com),
which forwards submissions to **yasseryagoub015@gmail.com** without any backend.

1. Go to https://web3forms.com and create an access key for
   `yasseryagoub015@gmail.com` (confirm the activation email).
2. In `contact.js`, replace the placeholder on line 9:
   `const CONTACT_ACCESS_KEY = "YOUR_WEB3FORMS_ACCESS_KEY";`
3. Reload — submissions now send directly from the page.

Until a real key is pasted in, the form falls back to opening the visitor's
mail app with the message pre-filled, so it is never broken.

Files added for the contact form: `contact.js`, `contact.css`, and the
`#contactPanel` markup in `index.html`. `app.js` and `main.css` are untouched.
