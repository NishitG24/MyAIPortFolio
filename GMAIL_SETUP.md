# Gmail App Password Setup Guide

To enable email sending from your portfolio website, you need to set up a Gmail App Password.

## Step-by-Step Instructions

### 1. Enable 2-Step Verification
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Under "Signing in to Google", find "2-Step Verification"
3. If not enabled, click it and follow the setup process
4. **Note**: You MUST have 2-Step Verification enabled to use App Passwords

### 2. Generate App Password
1. Go back to [Google Account Security](https://myaccount.google.com/security)
2. Under "Signing in to Google", find "App passwords"
3. Click "App passwords"
4. Select "Mail" as the app
5. Select "Other (Custom name)" as the device
6. Enter a name like "Portfolio Website"
7. Click "Generate"
8. **Copy the 16-character password** (it will look like: `abcd efgh ijkl mnop`)

### 3. Set Environment Variable

#### Option A: In Terminal (Temporary - for current session)
```bash
export GMAIL_APP_PASSWORD='your-16-character-app-password'
# Remove spaces from the password if any
```

#### Option B: In .env file (Recommended - permanent)
1. Create or edit `.env` file in the project root
2. Add this line:
```
GMAIL_APP_PASSWORD=your-16-character-app-password
GMAIL_SENDER=nishitgupta241@gmail.com
GMAIL_RECIPIENT=nishitgupta241@gmail.com
```
3. Make sure there are **no spaces** in the password

### 4. Restart the Server
After setting the environment variable, restart your FastAPI server:
```bash
# Stop the current server (Ctrl+C)
# Then restart:
source myenv/bin/activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

## Important Notes

- **Do NOT use your regular Gmail password** - it won't work
- The App Password is 16 characters (remove spaces if Google shows them)
- App Passwords are more secure than regular passwords
- You can revoke App Passwords anytime from your Google Account settings
- The App Password is different from your regular Gmail password

## Troubleshooting

### Error: "Username and Password not accepted"
- Make sure you're using the App Password, not your regular password
- Verify 2-Step Verification is enabled
- Check that there are no extra spaces in the password
- Try generating a new App Password

### Error: "Email service not configured"
- Make sure `GMAIL_APP_PASSWORD` is set in your environment
- Check your `.env` file if using one
- Restart the server after setting the variable

## Security Best Practices

- Never commit your `.env` file to version control
- Add `.env` to `.gitignore`
- Regenerate App Passwords periodically
- Use different App Passwords for different applications

