# Claude Code Deploy & Verify Instruction Ver12

## Overview

This document provides step-by-step instructions for deploying and verifying the Nippou (Daily Report) web application using Google Apps Script (GAS) and Slack Incoming Webhook.

---

## Important Notes

### Slack Incoming Webhook

- **Fixed to Incoming Webhook** - This app uses Slack Incoming Webhook exclusively
- **SLACK_WEBHOOK_URL** - The webhook URL is stored in GAS Script Properties
- **No channel selection UI** - The target channel is determined by the webhook configuration in Slack
- **NEVER share the Webhook URL** - Keep it confidential to prevent unauthorized posting

---

## Deployment Steps

### Step 1: Create a New GAS Project

1. Open [Google Apps Script](https://script.google.com/)
2. Click "New Project"
3. Rename the project to "Nippou" or similar

### Step 2: Paste the Code

1. Delete any default code in the editor
2. Copy all content from `main.gs` in this repository
3. Paste into the GAS editor
4. Click the save icon (or Ctrl+S)

### Step 3: Configure Script Properties

1. Click "Project Settings" (gear icon) in the left sidebar
2. Scroll down to "Script Properties"
3. Click "Add script property"
4. Add the following property:
   - **Property:** `SLACK_WEBHOOK_URL`
   - **Value:** Your Slack Incoming Webhook URL (e.g., `https://hooks.slack.com/services/XXXXX/YYYYY/ZZZZZ`)
5. Click "Save script properties"

### Step 4: Deploy as Web App

1. Click "Deploy" > "New deployment"
2. Click the gear icon next to "Select type" and choose "Web app"
3. Configure:
   - **Description:** `Nippou v1.0` (or appropriate version)
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
4. Click "Deploy"
5. Copy the Web app URL for access

### Step 5: Authorize the App

1. On first deployment, click "Authorize access"
2. Choose your Google account
3. Click "Advanced" > "Go to Nippou (unsafe)"
4. Click "Allow"

---

## Verification Steps

### Test 1: Access the Web App

1. Open the deployed Web app URL in your browser
2. Verify the report form is displayed correctly

### Test 2: Retrieve Template

1. Click the "Get Template" or similar button
2. Verify the daily report template appears in the text area

### Test 3: Edit Report

1. Modify the template content
2. Fill in sample data for testing

### Test 4: Copy to Clipboard

1. Click the "Copy" button
2. Open a text editor and paste (Ctrl+V)
3. Verify the content was copied correctly

### Test 5: Post to Slack

1. Click the "Post to Slack" button
2. Check the configured Slack channel
3. Verify the report appears in the channel

---

## Verification Report Template

Please use the following format to report the verification results:

```
=== Nippou Deployment Verification Report ===

Date: YYYY-MM-DD
Tester: [Your Name]

## Results

1. Web App Access: [OK / NG]
2. Template Retrieval: [OK / NG]
3. Report Editing: [OK / NG]
4. Copy to Clipboard: [OK / NG]
5. Slack Posting: [OK / NG]

## Overall Status: [OK / NG]

## Error Details (if any):
[Paste exact error message here - do not modify]

## Notes:
[Any additional observations]
```

---

## Troubleshooting

### Common Issues

1. **Slack posting fails**
   - Verify SLACK_WEBHOOK_URL is correctly set in Script Properties
   - Check if the webhook URL is still valid in Slack settings
   - Ensure no extra spaces or characters in the URL

2. **Authorization error**
   - Re-deploy the web app
   - Clear browser cache and cookies
   - Try in incognito/private window

3. **Template not loading**
   - Check browser console for errors (F12 > Console)
   - Verify the GAS code was pasted completely

---

## Security Reminders

- **NEVER** share the Webhook URL publicly
- **NEVER** commit the Webhook URL to version control
- **NEVER** include the Webhook URL in client-side code
- The Webhook URL should only exist in GAS Script Properties

---

## Version History

- Ver12: Initial comprehensive deploy and verify instruction

---

End of Document
