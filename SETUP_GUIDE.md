# Setup Guide for Portfolio Website

This guide will help you configure Outlook email and WhatsApp notifications.

## 1. Install Dependencies

First, install the required packages:

```bash
source myenv/bin/activate
pip install -r requirements.txt
```

## 2. Outlook Email Configuration

### Option A: Using Regular Password (if 2FA is disabled)
1. Set the environment variable:
```bash
export OUTLOOK_SENDER="gupta04nishit@outlook.com"
export OUTLOOK_PASSWORD="your-outlook-password"
export OUTLOOK_RECIPIENT="gupta04nishit@outlook.com"
```

### Option B: Using App Password (if 2FA is enabled)
1. Go to [Microsoft Account Security](https://account.microsoft.com/security)
2. Enable 2-Step Verification if not already enabled
3. Go to "Advanced security options"
4. Click "Create a new app password"
5. Name it "Portfolio Website"
6. Copy the generated password
7. Set environment variables:
```bash
export OUTLOOK_SENDER="gupta04nishit@outlook.com"
export OUTLOOK_PASSWORD="your-app-password"
export OUTLOOK_RECIPIENT="gupta04nishit@outlook.com"
```

### Using .env File (Recommended)
Create a `.env` file in the project root:
```
OUTLOOK_SENDER=gupta04nishit@outlook.com
OUTLOOK_PASSWORD=your-password-or-app-password
OUTLOOK_RECIPIENT=gupta04nishit@outlook.com
```

## 3. WhatsApp Configuration (Twilio)

### Step 1: Create Twilio Account
1. Go to [Twilio](https://www.twilio.com/try-twilio)
2. Sign up for a free account
3. Verify your phone number

### Step 2: Get Twilio Credentials
1. Go to [Twilio Console](https://console.twilio.com/)
2. Find your **Account SID** and **Auth Token** on the dashboard
3. Copy these values

### Step 3: Set Up WhatsApp Sandbox (Free Testing)
1. In Twilio Console, go to "Messaging" → "Try it out" → "Send a WhatsApp message"
2. Follow instructions to join the sandbox (send a message to the provided number)
3. Note your WhatsApp sender number (format: `whatsapp:+14155238886`)

### Step 4: Set Environment Variables
```bash
export TWILIO_ACCOUNT_SID="your-account-sid"
export TWILIO_AUTH_TOKEN="your-auth-token"
export TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"  # Your Twilio WhatsApp number
export WHATSAPP_TO="whatsapp:+919889612031"  # Your phone number
```

### Using .env File
Add to your `.env` file:
```
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
WHATSAPP_TO=whatsapp:+919889612031
```

## 4. Complete .env File Example

Create a `.env` file in the project root with all variables:

```
# OpenAI/Gemini API Key for Chatbot
API_Key=your-gemini-api-key
# or
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
OPENAI_AGENT_MODEL=gemini-2.5-flash

# Outlook Email Configuration
OUTLOOK_SENDER=gupta04nishit@outlook.com
OUTLOOK_PASSWORD=your-outlook-password
OUTLOOK_RECIPIENT=gupta04nishit@outlook.com

# Twilio WhatsApp Configuration
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
WHATSAPP_TO=whatsapp:+919889612031
```

## 5. How It Works

### Email Functionality
- When users submit the contact form, emails are sent to `gupta04nishit@outlook.com`
- Uses Outlook SMTP (smtp-mail.outlook.com:587)

### WhatsApp Notifications
- When the bot cannot answer a user's question, it will:
  1. Ask the user for their email address
  2. Once email is provided, send a WhatsApp notification to you
  3. The notification includes:
     - The question the bot couldn't answer
     - The user's email address

### Bot Behavior
- The bot detects when it cannot answer by looking for phrases like:
  - "I don't know"
  - "I'm not sure"
  - "I don't have that information"
  - etc.
- When detected, the bot asks for the user's email
- After email is provided, WhatsApp notification is sent

## 6. Testing

### Test Email
1. Fill out the contact form on the website
2. Check your Outlook inbox at `gupta04nishit@outlook.com`

### Test WhatsApp
1. Ask the chatbot a question it cannot answer (e.g., "What's your favorite color?")
2. The bot will ask for your email
3. Provide your email
4. Check your WhatsApp for the notification

## 7. Troubleshooting

### Email Issues
- **Authentication failed**: Make sure you're using the correct password or app password
- **Connection timeout**: Check your internet connection
- **Port blocked**: Ensure port 587 is not blocked by firewall

### WhatsApp Issues
- **Not receiving messages**: 
  - Verify you've joined the Twilio WhatsApp sandbox
  - Check that `WHATSAPP_TO` has the correct format: `whatsapp:+919889612031`
  - Ensure your Twilio account has credits
- **Sandbox limitations**: 
  - Free sandbox only works with pre-approved numbers
  - For production, upgrade to Twilio WhatsApp Business API

## 8. Production Deployment

For production:
1. Upgrade Twilio account to use WhatsApp Business API
2. Get your WhatsApp Business number approved
3. Update `TWILIO_WHATSAPP_FROM` with your business number
4. Consider using environment variables from your hosting platform

## Security Notes

- **Never commit `.env` file to version control**
- Add `.env` to `.gitignore`
- Use strong passwords and app passwords
- Keep Twilio credentials secure
- Regularly rotate passwords

